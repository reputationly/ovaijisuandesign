#!/usr/bin/env python3
"""
下载并安装与当前 ComfyUI 插件精确绑定的后端 bundle。

生产安装只读取插件内 `backend-bundle.json` 的不可变 bundle 元数据，不查询全局
`latest.json`。因此旧客户端保留旧前端和旧后端，新客户端才会收到与新前端验证过的
后端。仅显式设置 `HUB_COMFYUI_CANDIDATE_LATEST_URL` 时允许读取远端候选清单。

## 双模式

  入口模式（hub.python.run 调用，秒级返回）：
    argv: [--info | --start] [--region domestic|overseas] [--url <override>]
          [--install-dir <absolute-path>]
    --info   只探测：平台是否支持、目标版本、包大小、当前安装状态。
    --start  需要时 detached 拉起 worker 后立刻返回。
  worker 模式（--worker，独立会话孤儿进程）：
    真正干活，进度持续写入 $HUB_PLUGIN_DATA_DIR/install-state.json，
    前端经 GET /api/plugins/comfyui/data/install-state.json 轮询。

## 目录布局

  安装目录（默认等于 $HUB_PLUGIN_DATA_DIR，可由 --install-dir 修改）：
    downloads/<file>.part     断点续传中的包
    backend/<bundle-id>/      解压后的 ComfyUI/ + .ready
    backend/current.json      {"version": ...} 指针（跨平台，不用符号链接）
    userdata/                 --base-directory 指向这里，models 等升级后保留
    Windows: %USERPROFILE%/.hub-c/<bundle-id>/ 为独立 venv（避免 PyTorch 深层路径超限）

  插件数据目录（始终为 $HUB_PLUGIN_DATA_DIR，确保前端可读取）：
    install-state.json        进度状态（前端轮询）
    install.log               worker 详细日志
    .install.lock             并发锁（pid，配合 state 心跳判活）

## 为什么 detached + 状态文件

hub.python.run 有 10 分钟硬顶，GB 级下载 + pip 装依赖必然超时。所以照抄
start-backend.py 的模式：RPC 只负责 spawn，生命周期与进度都落在文件上。

## 离线安装

bundle 内含 wheels/，pip install --no-index --find-links 本地安装，装完
删除 wheels 省磁盘。venv 由插件 venv 的解释器 `-m venv` 创建 —— venv 模块
会回溯到 base（Hub 内嵌 Python 3.12），不依赖系统 Python。
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tarfile
import threading
import time
import urllib.error
import urllib.request

STATE_STALE_SEC = 60          # state 心跳超过此值视为 worker 已死
HEARTBEAT_SEC = 5             # worker 心跳线程刷新间隔
DOWNLOAD_CHUNK = 1024 * 256
DOWNLOAD_RETRIES = 3
PIP_TIMEOUT_SEC = 45 * 60     # 离线安装本应几分钟，超时兜底防僵死
BLACKWELL_COMPUTE_CAPABILITY = (12, 0)
MIN_CUDA13_DRIVER_VERSION = (580, 0)
NVIDIA_DRIVER_REQUIRED_STATE = "nvidia-driver-required"
MODEL_PATHS_FILE = "model-paths.json"
MODEL_PATHS_SCHEMA_VERSION = 1
MANAGED_BACKEND_PORT = 18188

TERMINAL_PHASES = {"done", "error"}


# ---------- 路径 ----------

def data_dir() -> str:
    d = os.environ.get("HUB_PLUGIN_DATA_DIR", "").strip()
    if not d:
        # gateway 未升级（runScript 未导出该 env）时的明确报错，避免静默装错地方。
        print(json.dumps({
            "ok": False, "state": "no-data-dir",
            "error": "HUB_PLUGIN_DATA_DIR 缺失：请更新客户端（gateway 需导出该环境变量）",
        }, ensure_ascii=False))
        sys.exit(1)
    return d


def resolve_install_dir(control_root: str, value: str = "") -> str:
    """解析用户安装目录；空值保持旧版的插件数据目录布局。"""
    raw = str(value or "").strip()
    if not raw:
        return os.path.abspath(control_root)
    expanded = os.path.expandvars(os.path.expanduser(raw))
    if not os.path.isabs(expanded):
        raise ValueError("安装路径必须是绝对路径")
    return os.path.abspath(expanded)


def bundle_manifest() -> dict:
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend-bundle.json")
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def platform_key() -> str:
    import platform as _pf
    machine = _pf.machine().lower()
    if sys.platform == "darwin":
        return "darwin-arm64" if machine in ("arm64", "aarch64") else "darwin-x64"
    if sys.platform == "win32":
        return "win32-arm64" if machine in ("arm64", "aarch64") else "win32-x64"
    return f"linux-{'arm64' if machine in ('arm64', 'aarch64') else 'x64'}"


def windows_gpu_vendors() -> set[str]:
    """只在 Windows 读取 PnP 厂商 ID；失败时宁可不给用户错误的 GPU 包。"""
    if sys.platform != "win32":
        return set()
    command = [
        "powershell", "-NoProfile", "-NonInteractive", "-Command",
        "Get-CimInstance Win32_VideoController | "
        "ForEach-Object { $_.PNPDeviceID; $_.Name }",
    ]
    try:
        # Gateway enables CPython UTF-8 mode, while Windows PowerShell can emit
        # the active ANSI/OEM code page (for example CP936). Vendor IDs/names
        # are ASCII, so replacing undecodable localized bytes preserves the
        # detection signal without crashing the installer.
        out = subprocess.run(command, capture_output=True, text=True,
                             encoding="utf-8", errors="replace", timeout=10,
                             creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    except (OSError, subprocess.TimeoutExpired):
        return set()
    text = out.stdout.lower()
    found = set()
    if "ven_10de" in text or "nvidia" in text:
        found.add("nvidia")
    if "ven_1002" in text or "amd" in text or "radeon" in text:
        found.add("amd")
    if "ven_8086" in text or "intel" in text:
        found.add("intel")
    return found


def windows_nvidia_runtime_info() -> tuple[list[tuple[int, int]], tuple[int, ...] | None]:
    """通过 nvidia-smi 同时读取 compute capability 和驱动版本。"""
    if sys.platform != "win32":
        return [], None
    command = [
        "nvidia-smi",
        "--query-gpu=compute_cap,driver_version",
        "--format=csv,noheader,nounits",
    ]
    try:
        out = subprocess.run(command, capture_output=True, text=True,
                             encoding="utf-8", errors="replace", timeout=10,
                             creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    except (OSError, subprocess.TimeoutExpired):
        return [], None
    if out.returncode != 0:
        return [], None

    capabilities = []
    driver_version = None
    for line in out.stdout.splitlines():
        fields = [field.strip() for field in line.split(",", 1)]
        if len(fields) != 2:
            continue
        try:
            major, minor = fields[0].split(".", 1)
            capabilities.append((int(major), int(minor)))
        except (TypeError, ValueError):
            continue
        if driver_version is None:
            try:
                driver_version = tuple(int(part) for part in fields[1].split("."))
            except (TypeError, ValueError):
                pass
    return capabilities, driver_version


def nvidia_target(
    capabilities: list[tuple[int, int]],
    driver_version: tuple[int, ...] | None,
) -> tuple[str, str]:
    """RTX 50 系 Blackwell（sm_120）使用 CUDA 13，其余 NVIDIA 保持 CUDA 12。"""
    if not capabilities or driver_version is None:
        return "", (
            "检测到显卡，但未检测到可用的显卡驱动。"
            "请先安装或升级驱动，重启电脑后再试。"
        )
    if any(capability >= BLACKWELL_COMPUTE_CAPABILITY for capability in capabilities):
        if driver_version < MIN_CUDA13_DRIVER_VERSION:
            version = ".".join(str(part) for part in driver_version)
            return "", (
                f"检测到 RTX 50 系显卡，但当前驱动版本为 {version}；"
                "CUDA 13 要求 R580 或更高版本，请升级显卡驱动后重试。"
            )
        return "win32-x64-nvidia-cuda13", ""
    return "win32-x64-nvidia-cuda12", ""


def device_target() -> tuple[str, str, str]:
    """返回发布目标、用户可读的失败原因和可恢复设备状态。"""
    plat = platform_key()
    if plat != "win32-x64":
        return plat, "", ""
    vendors = windows_gpu_vendors()
    if "nvidia" in vendors:
        capabilities, driver_version = windows_nvidia_runtime_info()
        target, error = nvidia_target(capabilities, driver_version)
        state = NVIDIA_DRIVER_REQUIRED_STATE if not target else ""
        return target, error, state
    if "amd" in vendors:
        return "win32-x64-amd-directml", "", ""
    if "intel" in vendors:
        return "win32-x64-intel-xpu", "", ""
    return "", "未检测到受支持的独立显卡；支持 NVIDIA、AMD 或支持 XPU 的 Intel 显卡。", ""


def validate_xpu_runtime(python: str) -> None:
    try:
        run_logged([python, "-c", (
            "import torch; "
            "assert torch.xpu.is_available(), 'Intel XPU is unavailable'; "
            "x = torch.ones((2, 2), device='xpu'); "
            "assert (x @ x).cpu().tolist() == [[2.0, 2.0], [2.0, 2.0]]; "
            "torch.xpu.synchronize(); "
            "print(torch.__version__, torch.xpu.get_device_name(0))"
        )], timeout=120)
    except Exception as exc:
        raise RuntimeError(
            "Intel XPU 验证失败，请安装最新 Intel 显卡驱动并确认显卡支持 PyTorch XPU。"
        ) from exc


def state_path(root: str) -> str:
    return os.path.join(root, "install-state.json")


def current_json_path(root: str) -> str:
    return os.path.join(root, "backend", "current.json")


def bundle_directory(version: str, build_id: str, target: str = "") -> str:
    """短且稳定的版本目录，为 Windows 上 PyTorch 的深层文件名预留空间。"""
    identity = f"{version}\0{build_id}\0{target}".encode("utf-8")
    suffix = base64.urlsafe_b64encode(hashlib.sha256(identity).digest()[:4]).decode().rstrip("=")
    return f"b{suffix}"


def venv_directory(root: str, directory: str) -> str:
    """返回后端 venv 路径；Windows 使用用户目录下的短路径。"""
    if sys.platform == "win32":
        home = os.environ.get("USERPROFILE") or os.path.expanduser("~")
        return os.path.join(home, ".hub-c", directory)
    return os.path.join(root, "backend", directory, ".venv")


def bundle_requirements(ver_dir: str, target: str) -> list[str]:
    """返回本次安装要装的全部 requirements 文件。

    AMD DirectML 必须保留其 PyTorch/Transformers 兼容约束。
    ComfyUI-Manager（manager_requirements.txt）随包下发时一并安装，
    与 launchArgs 里的 --enable-manager 配套；旧包没有该文件则跳过。
    """
    comfy_dir = os.path.join(ver_dir, "ComfyUI")
    directml = os.path.join(comfy_dir, "requirements-directml.txt")
    if target == "win32-x64-intel-xpu":
        reqs = [os.path.join(comfy_dir, "requirements-xpu.txt")]
    elif target == "win32-x64-amd-directml" and os.path.isfile(directml):
        reqs = [directml]
    else:
        reqs = [os.path.join(comfy_dir, "requirements.txt")]
    manager = os.path.join(comfy_dir, "manager_requirements.txt")
    if os.path.isfile(manager):
        reqs.append(manager)
    return reqs


def installed_bundle(root: str) -> dict:
    """已就绪安装的 bundle 指针；兼容只有 version 字段的旧安装。"""
    try:
        with open(current_json_path(root), encoding="utf-8") as f:
            current = json.load(f)
        ver = str(current.get("directory") or current.get("version") or "")
        if ver and os.path.isfile(os.path.join(root, "backend", ver, ".ready")):
            return {**current, "directory": ver, "version": str(current.get("version") or ver)}
    except (OSError, ValueError):
        pass
    return {}


def fetch_json(url: str) -> dict:
    # latest/candidate 清单是可变对象；唯一查询参数避免 CDN 在刚发布后继续
    # 返回上一版缓存。bundle URL 本身不可变，不经过这个函数。
    separator = "&" if "?" in url else "?"
    fetch_url = f"{url}{separator}manifest_check={time.time_ns()}"
    with urllib.request.urlopen(fetch_url, timeout=15) as response:
        value = json.loads(response.read().decode("utf-8"))
    if not isinstance(value, dict):
        raise ValueError("latest.json 不是对象")
    return value


def resolve_bundle(manifest: dict, target: str, region: str) -> tuple[dict, str]:
    """读取随当前插件发布的精确 bundle；生产路径绝不访问可变 latest.json。"""
    target_info = ((manifest.get("targets") or {}).get(target) or {})
    if target_info.get("status") == "candidate":
        url = (target_info.get("candidateUrls") or {}).get(region, "")
        return resolve_candidate_bundle(url, target) if url else ({}, f"候选包未提供 {region} 区域下载地址")
    if target_info.get("status") != "published":
        return {}, str(target_info.get("message") or "该设备的后端包尚未随当前插件发布")
    entry = (target_info.get("bundle") or {}).copy()
    required = ("target", "version", "buildId", "file", "sha256", "sizeBytes", "urls")
    if entry.get("target") != target or any(not entry.get(field) for field in required):
        return {}, "当前插件内置的后端清单格式无效"
    if not (entry.get("urls") or {}).get(region):
        return {}, f"当前插件未提供 {region} 区域的后端下载地址"
    return entry, ""


def resolve_candidate_bundle(latest_url: str, target: str) -> tuple[dict, str]:
    """读取环境变量或本地显式登记的候选包。"""
    try:
        entry = fetch_json(latest_url)
    except (OSError, ValueError, urllib.error.URLError) as exc:
        return {}, f"无法读取候选后端清单：{exc}"
    required = ("target", "version", "buildId", "file", "sha256", "sizeBytes", "urls")
    if entry.get("target") != target or any(not entry.get(field) for field in required):
        return {}, "候选后端清单格式无效"
    return entry, ""


def read_state(root: str) -> dict:
    try:
        with open(state_path(root), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def write_json_atomic(path: str, payload: dict) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    os.replace(tmp, path)  # 原子替换，前端永远读不到半截 JSON


def register_managed_paths(control_root: str, install_root: str) -> None:
    path_file = os.path.join(control_root, MODEL_PATHS_FILE)
    try:
        with open(path_file, encoding="utf-8") as f:
            current = json.load(f)
        if not isinstance(current, dict):
            current = {}
    except (OSError, ValueError):
        current = {}
    managed_data = os.path.abspath(os.path.join(install_root, "userdata"))
    managed_models = os.path.join(managed_data, "models")
    directories = current.get("directories") if isinstance(current.get("directories"), list) else []
    directories = [
        os.path.abspath(value)
        for value in directories
        if isinstance(value, str) and os.path.isabs(value)
    ]
    default_models = os.path.join(os.path.abspath(control_root), "userdata", "models")
    for models_root in (default_models, managed_models):
        if models_root not in directories:
            directories.append(models_root)
    active = current.get("activeDirectory")
    if not isinstance(active, str) or not os.path.isabs(active):
        active = managed_models
    write_json_atomic(path_file, {
        "schemaVersion": MODEL_PATHS_SCHEMA_VERSION,
        "activeDirectory": os.path.abspath(active),
        "directories": directories,
        "managedDataDirectory": managed_data,
    })


def pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    if sys.platform == "win32":
        # Windows 的 os.kill(pid, 0) 不是 POSIX 存活探测，可能终止进程
        # 或对失效 PID 抛 SystemError。只获取同步权限并零等待查询。
        import ctypes
        from ctypes import wintypes

        if pid > 0xFFFFFFFF:
            return False
        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
        kernel32.OpenProcess.restype = wintypes.HANDLE
        kernel32.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
        kernel32.WaitForSingleObject.restype = wintypes.DWORD
        kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
        kernel32.CloseHandle.restype = wintypes.BOOL
        handle = kernel32.OpenProcess(0x00100000, False, pid)  # SYNCHRONIZE
        if not handle:
            # ERROR_INVALID_PARAMETER 表示 PID 不存在；权限不足等未知状态
            # 保守视为存活，避免覆盖仍在使用的目录或启动重复 worker。
            return ctypes.get_last_error() != 87
        try:
            return kernel32.WaitForSingleObject(handle, 0) != 0  # WAIT_OBJECT_0 = exited
        finally:
            kernel32.CloseHandle(handle)
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except OSError:
        return False


def probe_managed_backend() -> bool:
    try:
        with urllib.request.urlopen(
            f"http://127.0.0.1:{MANAGED_BACKEND_PORT}/system_stats",
            timeout=1,
        ) as response:
            return response.status == 200
    except (OSError, ValueError, urllib.error.URLError):
        return False


def running_backend_directory(root: str) -> tuple[bool, str]:
    """返回托管后端是否仍存活及其代码目录；state 未知但端口存活时 fail closed。"""
    try:
        with open(os.path.join(root, "backend-state.json"), encoding="utf-8") as f:
            state = json.load(f)
        pid = int(state.get("pid", 0))
        directory = str(state.get("backendDirectory") or "")
    except (OSError, ValueError, TypeError):
        return probe_managed_backend(), ""
    alive = pid_alive(pid)
    if not alive and probe_managed_backend():
        return True, ""
    return alive, directory


def worker_active(root: str) -> bool:
    """已有存活 worker 在装：phase 非终态 + 心跳新鲜 + pid 活着。"""
    st = read_state(root)
    if not st or st.get("phase") in TERMINAL_PHASES:
        return False
    fresh = time.time() - float(st.get("updatedAt", 0)) < STATE_STALE_SEC
    return fresh and pid_alive(int(st.get("pid", 0)))


def emit(payload: dict) -> None:
    print(json.dumps(payload, ensure_ascii=False))
    sys.exit(0 if payload.get("ok") else 1)


# ---------- 入口模式 ----------

def parse_args(argv: list[str]) -> dict:
    out = {"mode": "--info", "region": "domestic", "url": "", "install_dir": ""}
    i = 0
    while i < len(argv):
        a = argv[i]
        if a in ("--info", "--start", "--worker"):
            out["mode"] = a
        elif a == "--region" and i + 1 < len(argv):
            out["region"] = argv[i + 1]
            i += 1
        elif a == "--url" and i + 1 < len(argv):
            out["url"] = argv[i + 1]
            i += 1
        elif a == "--install-dir" and i + 1 < len(argv):
            out["install_dir"] = argv[i + 1]
            i += 1
        i += 1
    return out


def entry(args: dict) -> None:
    control_root = data_dir()
    os.makedirs(control_root, exist_ok=True)
    try:
        install_root = resolve_install_dir(control_root, args.get("install_dir", ""))
    except ValueError as exc:
        emit({"ok": False, "state": "invalid-install-dir", "error": str(exc)})
    manifest = bundle_manifest()
    target, device_error, device_state = device_target()
    if not target:
        emit({"ok": True, "platform": platform_key(), "supported": False,
              "unsupportedReason": device_error, "deviceState": device_state,
              "installing": False})
    candidate_latest = os.environ.get("HUB_COMFYUI_CANDIDATE_LATEST_URL", "").strip()
    if not candidate_latest:
        target_info = (manifest.get("targets") or {}).get(target) or {}
        if target_info.get("status") == "candidate":
            candidate_latest = (target_info.get("candidateUrls") or {}).get(args["region"], "")
    bundle, bundle_error = (
        resolve_candidate_bundle(candidate_latest, target)
        if candidate_latest else resolve_bundle(manifest, target, args["region"])
    )
    installed = installed_bundle(install_root)
    installing = worker_active(control_root)
    if installing:
        # 多个 iframe 同时打开时，正在运行的 worker 才是安装路径真相源；
        # 禁止后来者把另一条路径持久化后导致安装完成却无法启动。
        install_root = str(read_state(control_root).get("installDir") or control_root)
    version = str(bundle.get("version", ""))
    build_id = str(bundle.get("buildId", ""))
    already_installed = bool(installed) and installed.get("version") == version \
        and installed.get("target", target) == target and installed.get("buildId", "legacy") == build_id

    info = {
        "ok": True,
        "platform": target,
        # 到这里说明设备 target 已识别且受支持。后端清单读取失败是网络/TLS
        # 可用性问题，不应被前端误报成“当前设备暂不支持”。
        "supported": True,
        "unsupportedReason": "",
        "bundleAvailable": bool(bundle),
        "bundleError": bundle_error,
        "targetVersion": version,
        "buildId": build_id,
        "installedVersion": installed.get("version"),
        "installedTarget": installed.get("target"),
        "installedBuildId": installed.get("buildId"),
        "alreadyInstalled": already_installed,
        "sizeBytes": int(bundle.get("sizeBytes", 0)) if bundle else 0,
        "candidate": bool(candidate_latest),
        "installing": installing,
        "installDir": install_root,
    }

    if args["mode"] == "--info":
        emit(info)

    # --start
    if not bundle:
        emit({"ok": False, "state": "bundle-not-published", "platform": target,
              "error": bundle_error})
    if already_installed:
        register_managed_paths(control_root, install_root)
        emit({**info, "state": "already-installed"})
    if installing:
        emit({**info, "state": "in-progress"})

    url = args["url"] or (bundle.get("urls") or {}).get(args["region"], "")
    if not url or "FILL" in url or "FILL" in str(bundle.get("sha256", "")):
        emit({"ok": False, "state": "bundle-not-published",
              "error": "backend-bundle.json 未回填 CDN 地址/sha256（bundle 尚未发布）"})

    register_managed_paths(control_root, install_root)
    log_file = open(os.path.join(control_root, "install.log"), "ab")  # noqa: SIM115 — 交给 worker 持有
    try:
        proc = subprocess.Popen(
            [sys.executable, os.path.abspath(__file__), "--worker",
             "--region", args["region"], "--url", url,
             "--install-dir", install_root],
            stdout=log_file, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
            env=os.environ.copy(),
            # 关键：独立会话，RPC 返回后 worker 继续活着装完。
            start_new_session=True,
        )
    except OSError as exc:
        emit({"ok": False, "state": "spawn-failed", "error": str(exc)})
    finally:
        log_file.close()

    # 先占 state，前端下一次轮询立刻能看到 preparing 而不是 404/旧终态。
    write_json_atomic(state_path(control_root), {
        "phase": "preparing", "pct": 0, "message": "准备安装…",
        "version": version, "target": target, "buildId": build_id,
        "installDir": install_root,
        "pid": proc.pid, "updatedAt": time.time(),
    })
    emit({**info, "state": "spawned", "installing": True})


# ---------- worker 模式 ----------

class Reporter:
    """install-state.json 的唯一写入方；后台线程保证长阻塞阶段心跳不断。"""

    def __init__(self, root: str, version: str):
        self.path = state_path(root)
        self.base = {"version": version, "pid": os.getpid()}
        self.cur: dict = {}
        self.lock = threading.Lock()
        t = threading.Thread(target=self._beat, daemon=True)
        t.start()

    def set(self, phase: str, message: str, pct: float | None = None, **extra) -> None:
        with self.lock:
            self.cur = {**self.base, "phase": phase, "message": message, **extra}
            if pct is not None:
                self.cur["pct"] = round(pct, 1)
            self._flush()
        print(f"[{time.strftime('%H:%M:%S')}] {phase}: {message}", flush=True)

    def _flush(self) -> None:
        self.cur["updatedAt"] = time.time()
        try:
            write_json_atomic(self.path, self.cur)
        except OSError:
            pass

    def _beat(self) -> None:
        while True:
            time.sleep(HEARTBEAT_SEC)
            with self.lock:
                if self.cur.get("phase") in TERMINAL_PHASES:
                    return
                self._flush()


def acquire_lock(root: str) -> bool:
    """pid 锁：O_EXCL 创建；仅当持有者进程已死才清掉重试（一次）。
    活着的持有者即使 state 心跳短暂变陈旧也不可抢占 —— Reporter 心跳会自愈。"""
    lock = os.path.join(root, ".install.lock")
    for _ in range(2):
        try:
            fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, str(os.getpid()).encode())
            os.close(fd)
            return True
        except FileExistsError:
            try:
                with open(lock, encoding="utf-8") as f:
                    holder = int(f.read().strip() or "0")
            except (OSError, ValueError):
                holder = 0
            if holder != os.getpid() and pid_alive(holder):
                return False
            try:
                os.unlink(lock)  # 陈尸锁，清掉重试
            except OSError:
                return False
    return False


def release_lock(root: str) -> None:
    try:
        os.unlink(os.path.join(root, ".install.lock"))
    except OSError:
        pass


def fmt_gb(n: float) -> str:
    return f"{n / (1024 ** 3):.2f} GB"


def download(url: str, dest_part: str, expect_bytes: int, rep: Reporter) -> None:
    """断点续传下载到 .part。CDN 支持 Range；不支持时整包重下。"""
    last_err: Exception | None = None
    for attempt in range(1, DOWNLOAD_RETRIES + 1):
        try:
            offset = os.path.getsize(dest_part) if os.path.isfile(dest_part) else 0
            if expect_bytes and offset >= expect_bytes:
                return
            req = urllib.request.Request(url)
            if offset > 0:
                req.add_header("Range", f"bytes={offset}-")
            with urllib.request.urlopen(req, timeout=60) as resp:
                if offset > 0 and resp.status != 206:
                    offset = 0  # 服务端不认 Range → 从头来
                total = expect_bytes or offset + int(resp.headers.get("Content-Length") or 0)
                mode = "ab" if offset > 0 else "wb"
                got = offset
                last_flush = 0.0
                with open(dest_part, mode) as f:
                    while True:
                        chunk = resp.read(DOWNLOAD_CHUNK)
                        if not chunk:
                            break
                        f.write(chunk)
                        got += len(chunk)
                        now = time.time()
                        if now - last_flush > 1:
                            last_flush = now
                            pct = got / total * 100 if total else 0
                            rep.set("download",
                                    f"下载后端包 {fmt_gb(got)} / {fmt_gb(total)}",
                                    pct=pct, downloadedBytes=got, totalBytes=total)
            if not expect_bytes or os.path.getsize(dest_part) >= expect_bytes:
                return
            last_err = RuntimeError("下载中断（字节数不足）")
        except (urllib.error.URLError, OSError) as exc:
            last_err = exc
        rep.set("download", f"下载中断，重试 {attempt}/{DOWNLOAD_RETRIES}…")
        time.sleep(min(2 ** attempt, 10))
    raise RuntimeError(f"下载失败：{last_err}")


def sha256_of(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def venv_python(venv_dir: str) -> str:
    return os.path.join(venv_dir, "Scripts", "python.exe") if sys.platform == "win32" \
        else os.path.join(venv_dir, "bin", "python")


def run_logged(argv: list[str], timeout: int, cwd: str | None = None) -> None:
    """子进程输出直通本进程 stdout（已重定向到 install.log）。"""
    proc = subprocess.Popen(argv, cwd=cwd, stdout=None, stderr=subprocess.STDOUT,
                            stdin=subprocess.DEVNULL)
    try:
        code = proc.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        proc.kill()
        raise RuntimeError(f"命令超时：{' '.join(argv[:3])}…")
    if code != 0:
        raise RuntimeError(f"命令失败（exit {code}）：{' '.join(argv[:4])}… 详见 install.log")


def worker(args: dict) -> None:
    control_root = data_dir()
    os.makedirs(control_root, exist_ok=True)
    rep = Reporter(control_root, "unknown")
    try:
        install_root = resolve_install_dir(control_root, args.get("install_dir", ""))
        os.makedirs(install_root, exist_ok=True)
    except (OSError, ValueError) as exc:
        rep.set("error", "安装失败", error=f"无法使用安装路径：{exc}")
        return
    manifest = bundle_manifest()
    target, device_error, _device_state = device_target()
    if not target:
        rep.set("error", "安装失败", error=device_error)
        return
    # 与入口模式保持同一份清单来源：候选包环境变量随 env 传给 worker，
    # 否则入口按候选清单判定版本、worker 却装官方 latest，产物错位。
    candidate_latest = os.environ.get("HUB_COMFYUI_CANDIDATE_LATEST_URL", "").strip()
    plat_info, bundle_error = (
        resolve_candidate_bundle(candidate_latest, target)
        if candidate_latest else resolve_bundle(manifest, target, args["region"])
    )
    if not plat_info:
        rep.set("error", "安装失败", error=bundle_error)
        return
    version = str(plat_info["version"])
    build_id = str(plat_info.get("buildId", "legacy"))
    directory = bundle_directory(version, build_id, target)
    rep.base.update({
        "version": version,
        "target": target,
        "buildId": build_id,
        "installDir": install_root,
    })

    if not acquire_lock(control_root):
        print("另一个安装进程正在运行，退出", flush=True)
        return
    try:
        rep.set("preparing", "检查磁盘空间…", pct=0)

        size = int(plat_info.get("sizeBytes", 0))
        installed_est = int(plat_info.get("installedBytes", 0)) or size * 3
        free = shutil.disk_usage(install_root).free
        need = size + installed_est
        if need and free < need:
            raise RuntimeError(f"磁盘空间不足：需要约 {fmt_gb(need)}，剩余 {fmt_gb(free)}")

        # 1) 下载（可断点续传）
        dl_dir = os.path.join(install_root, "downloads")
        os.makedirs(dl_dir, exist_ok=True)
        part = os.path.join(dl_dir, plat_info["file"] + ".part")
        tarball = os.path.join(dl_dir, plat_info["file"])
        if not os.path.isfile(tarball):
            url = args["url"] or plat_info["urls"].get(args["region"], "")
            if url.startswith("file://"):
                url_path = urllib.request.url2pathname(url[len("file://"):])
                rep.set("download", "复制本地包…", pct=0)
                shutil.copyfile(url_path, part)
            else:
                download(url, part, size, rep)
            os.replace(part, tarball)

        # 2) 校验
        rep.set("verify", "校验完整性…")
        got = sha256_of(tarball)
        if got != plat_info["sha256"]:
            os.unlink(tarball)  # 脏包删掉，下次从头下
            raise RuntimeError(f"sha256 不匹配（got {got[:12]}…），已删除损坏的包，请重试")

        # 3) 解压到 backend/<version>（先落 .tmp 再原子换名）。后台更新时
        # 当前后端仍从旧目录运行，绝不能覆盖它或其 venv。
        ver_dir = os.path.join(install_root, "backend", directory)
        tmp_dir = ver_dir + ".tmp"
        backend_alive, running_directory = running_backend_directory(control_root)
        if backend_alive and not running_directory:
            running_directory = str(installed_bundle(install_root).get("directory") or "")
        if backend_alive and (not running_directory or running_directory == directory):
            raise RuntimeError("当前后端仍在使用目标安装目录，请先完成安全重启后再重试更新")
        for d in (ver_dir, tmp_dir):
            if os.path.isdir(d):
                shutil.rmtree(d)
        rep.set("extract", "解压后端包…")
        os.makedirs(tmp_dir)
        with tarfile.open(tarball, "r:gz") as tf:
            if hasattr(tarfile, "data_filter"):
                tf.extractall(tmp_dir, filter="data")
            else:
                tf.extractall(tmp_dir)  # noqa: S202 — 自家 CDN 包且已过 sha256
        # 包内顶层目录 comfyui-backend/{ComfyUI,wheels,bundle.json} → 展平
        inner = os.path.join(tmp_dir, "comfyui-backend")
        src_root = inner if os.path.isdir(inner) else tmp_dir
        if not os.path.isdir(os.path.join(src_root, "ComfyUI")):
            raise RuntimeError("包结构异常：缺少 ComfyUI/ 目录")
        os.replace(src_root, ver_dir)
        if os.path.isdir(tmp_dir):
            shutil.rmtree(tmp_dir, ignore_errors=True)

        # 4) venv（基于 Hub 内嵌 Python —— venv 模块回溯 base 解释器）
        rep.set("venv", "创建 Python 环境…")
        venv_dir = venv_directory(install_root, directory)
        shutil.rmtree(venv_dir, ignore_errors=True)
        run_logged([sys.executable, "-m", "venv", venv_dir], timeout=120)

        # 5) 离线装依赖
        rep.set("deps", "安装依赖（离线，约需几分钟）…")
        wheels = os.path.join(ver_dir, "wheels")
        pip_cmd = [venv_python(venv_dir), "-m", "pip", "install", "--no-index",
                   "--find-links", wheels]
        for reqs in bundle_requirements(ver_dir, target):
            pip_cmd += ["-r", reqs]
        run_logged(
            pip_cmd,
            timeout=PIP_TIMEOUT_SEC, cwd=ver_dir,
        )

        if target == "win32-x64-intel-xpu":
            rep.set("deps", "验证 Intel XPU 运行环境…")
            validate_xpu_runtime(venv_python(venv_dir))

        # 6) 收尾：就绪标记、指针、userdata、清理
        rep.set("finalize", "收尾…")
        os.makedirs(os.path.join(install_root, "userdata"), exist_ok=True)
        register_managed_paths(control_root, install_root)
        with open(os.path.join(ver_dir, ".ready"), "w", encoding="utf-8") as f:
            f.write(str(time.time()))
        write_json_atomic(current_json_path(install_root), {
            "version": version,
            "target": target,
            "buildId": build_id,
            "directory": directory,
            "launchArgs": plat_info.get("launchArgs", []),
        })
        shutil.rmtree(wheels, ignore_errors=True)          # wheels 装完即弃，省一半磁盘
        try:
            os.unlink(tarball)
        except OSError:
            pass
        backend_root = os.path.join(install_root, "backend")
        # 安装阶段可能持续数分钟；GC 前必须重新采样，不能复用解压前的
        # 运行态快照。state 未知但端口存活时整轮 GC fail closed。
        backend_alive, running_directory = running_backend_directory(control_root)
        for name in os.listdir(backend_root):              # 旧版本 GC
            p = os.path.join(backend_root, name)
            if not os.path.isdir(p) or name == directory:
                continue
            # 运行中目录和 venv 必须保留到受控重启完成；旧 state 无目录时
            # 为避免误删，整轮 GC fail closed。
            if backend_alive and (not running_directory or name == running_directory):
                continue
            shutil.rmtree(p, ignore_errors=True)
            shutil.rmtree(venv_directory(install_root, name), ignore_errors=True)

        rep.set("done", "安装完成", pct=100)
    except Exception as exc:  # noqa: BLE001 — 终态必须落盘给前端
        rep.set("error", "安装失败", error=str(exc))
        sys.exit(1)
    finally:
        release_lock(control_root)


def main() -> None:
    args = parse_args(sys.argv[1:])
    if args["mode"] == "--worker":
        worker(args)
    else:
        entry(args)


if __name__ == "__main__":
    main()
