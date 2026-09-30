#!/usr/bin/env python3
"""
拉起托管安装的 ComfyUI 后端（统一下发版，见 install-backend.py）。
支持通过 --install-dir 指向用户选择的托管后端安装目录。

## 只认托管安装

后端由 backend-bundle.json 统一下发（我们自己维护/修改的 fork），不接受用户
自装目录 —— 前端功能可能依赖下发后端的改动，连上一个野生 ComfyUI 反而出错。
出于同样原因监听专用端口（默认 18188，由前端传入），避免撞上用户本机
8188 的官方 ComfyUI。

## 为什么 detached

`hub.python.run` 是一次性 RPC：收集 stdout、到时杀进程。后端必须活满整个
会话，所以 start_new_session 拆出独立会话，父进程轮询就绪后立即返回。

## 数据布局

安装目录中的版本目录只放代码 + venv（升级即整目录替换）；models /
custom_nodes / input / output / user 全部经 --base-directory 指到同一安装目录下的
userdata/，升级不丢。启动状态与日志仍写入插件数据目录，供 Gateway 和前端读取。

## 本地 ComfyUI 模型复用

启动时自动探测本机已装 ComfyUI（Desktop / 便携版 / 手动 clone）的 models
目录，生成 local-models.yaml 并经 --extra-model-paths-config 挂载为额外
模型搜索路径（只读复用，is_default 仍是 userdata/models）。刻意不挂载
custom_nodes —— 野生自定义节点可能与托管 fork 不兼容，且会执行任意代码。

## 输出（stdout 最后一行 JSON）

  {"ok": true,  "state": "already-running" | "started" | "started-by-peer", "port": N}
  {"ok": false, "state": "not-installed" | "port-conflict" | "spawn-failed"
                        | "start-timeout" | "no-data-dir", "error": "..."}
"""

from __future__ import annotations

import json
import os
import shlex
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

# 冷启要跑数据库迁移 + 加载全部节点，实测约 60s，留足余量。
READY_TIMEOUT_SEC = 180
READY_POLL_INTERVAL_SEC = 2
PROBE_TIMEOUT_SEC = 2
RESTART_STOP_TIMEOUT_SEC = 20
DEFAULT_PORT = 18188
START_LOCK_NAME = ".start.lock"
START_STATE_NAME = "backend-start-state.json"
BACKEND_STATE_NAME = "backend-state.json"
START_STATE_SCHEMA_VERSION = 1
# 用户在客户端设置页自定义的启动参数（写入 <data_dir>/user-launch-args.json，
# 内容为字符串数组）。它是对 bundle 内置 launchArgs 的追加，重装后端不会覆盖。
USER_LAUNCH_ARGS_NAME = "user-launch-args.json"
MODEL_PATHS_NAME = "model-paths.json"
MODEL_PATHS_SCHEMA_VERSION = 1
# 托管实例独占的关键参数，禁止用户覆盖：端口探活、跨源、数据目录、数据库、
# 本地模型挂载都依赖这些固定值，放开会把托管后端配坏。
MANAGED_LAUNCH_FLAGS = frozenset({
    "--port", "--base-directory", "--database-url",
    "--enable-cors-header", "--extra-model-paths-config",
})

active_root: str | None = None


def emit(payload: dict) -> None:
    if active_root:
        ok = bool(payload.get("ok"))
        backend_pid = None
        # 并发调用者在持有者启动完成后不得把真实后端 PID 写回 null。
        if payload.get("state") in {"started-by-peer", "already-running"}:
            start_state = read_start_state(active_root)
            backend_pid = start_state.get("backendPid")
            if not isinstance(backend_pid, int):
                try:
                    with open(os.path.join(active_root, BACKEND_STATE_NAME), encoding="utf-8") as f:
                        backend_pid = json.load(f).get("pid")
                except (OSError, ValueError, AttributeError):
                    backend_pid = None
        write_start_state(
            active_root,
            phase="ready" if ok else "error",
            message="ComfyUI 后端已就绪" if ok else "ComfyUI 后端启动失败",
            resultState=payload.get("state"),
            port=payload.get("port"),
            version=payload.get("version"),
            log=payload.get("log"),
            error=None if ok else payload.get("error", "未知错误"),
            backendPid=backend_pid,
        )
    print(json.dumps(payload, ensure_ascii=False))
    sys.exit(0 if payload.get("ok") else 1)


def probe_comfy(port: int) -> bool:
    """端口上是否有 ComfyUI 在应答。"""
    url = f"http://127.0.0.1:{port}/system_stats"
    try:
        with urllib.request.urlopen(url, timeout=PROBE_TIMEOUT_SEC) as resp:
            return resp.status == 200
    except (urllib.error.URLError, OSError, ValueError):
        return False


def port_occupied(port: int) -> bool:
    """端口被任意进程占用（不管是不是 ComfyUI）。"""
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=1):
            return True
    except OSError:
        return False


def read_backend_json(port: int, endpoint: str) -> dict:
    url = f"http://127.0.0.1:{port}{endpoint}"
    with urllib.request.urlopen(url, timeout=PROBE_TIMEOUT_SEC) as response:
        value = json.loads(response.read().decode("utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{endpoint} 未返回对象")
    return value


def backend_queue_is_idle(port: int) -> bool:
    queue = read_backend_json(port, "/queue")
    running = queue.get("queue_running")
    pending = queue.get("queue_pending")
    return isinstance(running, list) and isinstance(pending, list) \
        and not running and not pending


def process_command_line(pid: int) -> str:
    try:
        if sys.platform == "win32":
            completed = subprocess.run(
                [
                    "powershell.exe", "-NoProfile", "-NonInteractive", "-Command",
                    f"(Get-CimInstance Win32_Process -Filter 'ProcessId={pid}').CommandLine",
                ],
                capture_output=True, text=True, timeout=5,
            )
        else:
            completed = subprocess.run(
                ["ps", "-o", "command=", "-p", str(pid)],
                capture_output=True, text=True, timeout=5,
            )
    except (OSError, subprocess.TimeoutExpired):
        return ""
    return completed.stdout.strip() if completed.returncode == 0 else ""


def managed_pid_matches(pid: int, expected_base: str, port: int) -> bool:
    command = process_command_line(pid)
    if not command:
        return False
    try:
        tokens = [token.strip('"') for token in shlex.split(
            command,
            posix=sys.platform != "win32",
        )]
        port_index = tokens.index("--port")
        base_index = tokens.index("--base-directory")
        actual_port = tokens[port_index + 1]
        actual_base = os.path.abspath(tokens[base_index + 1])
    except (ValueError, IndexError):
        return False
    scripts = [token.replace("\\", "/") for token in tokens]
    return (
        any(script.endswith("/ComfyUI/main.py") for script in scripts)
        and actual_port == str(port)
        and actual_base == expected_base
    )


def stop_managed_backend(root: str, install_root: str, port: int) -> None:
    """仅在用户显式请求、后端空闲且归属可证明时优雅停止托管后端。"""
    try:
        stats = read_backend_json(port, "/system_stats")
        argv = ((stats.get("system") or {}).get("argv") or [])
        base_index = argv.index("--base-directory")
        actual_base = os.path.abspath(str(argv[base_index + 1]))
    except (OSError, ValueError, IndexError, KeyError, urllib.error.URLError) as exc:
        emit({"ok": False, "state": "restart-ownership-unknown",
              "error": f"无法确认当前后端归属，未执行重启：{exc}"})
    expected_base = os.path.abspath(os.path.join(install_root, "userdata"))
    if actual_base != expected_base:
        emit({"ok": False, "state": "restart-ownership-mismatch",
              "error": f"当前后端不属于此托管目录，未执行重启：{actual_base}"})

    try:
        if not backend_queue_is_idle(port):
            emit({"ok": False, "state": "backend-busy",
                  "error": "ComfyUI 仍有运行中或排队中的任务，请等待任务完成后重试"})
    except (OSError, ValueError, urllib.error.URLError) as exc:
        emit({"ok": False, "state": "restart-readiness-failed",
              "error": f"无法确认 ComfyUI 是否空闲，未执行重启：{exc}"})

    try:
        with open(os.path.join(root, BACKEND_STATE_NAME), encoding="utf-8") as f:
            backend_state = json.load(f)
        pid = int(backend_state.get("pid", 0))
    except (OSError, ValueError, TypeError):
        pid = 0
    if not pid_alive(pid):
        emit({"ok": False, "state": "restart-pid-missing",
              "error": "找不到受托管的 ComfyUI 后端进程，未执行重启"})
    if not managed_pid_matches(pid, expected_base, port):
        emit({"ok": False, "state": "restart-pid-mismatch",
              "error": "后端进程身份校验失败，未执行重启"})

    # 缩短 readiness 检查与 SIGTERM 之间的窗口；字段缺失或此刻新任务
    # 入队都按 busy 处理。真正的 drain 仍由用户显式重试完成。
    try:
        if not backend_queue_is_idle(port):
            emit({"ok": False, "state": "backend-busy",
                  "error": "ComfyUI 刚收到新的任务，请等待任务完成后重试"})
    except (OSError, ValueError, urllib.error.URLError) as exc:
        emit({"ok": False, "state": "restart-readiness-failed",
              "error": f"无法复验 ComfyUI 是否空闲，未执行重启：{exc}"})

    try:
        if sys.platform == "win32":
            completed = subprocess.run(
                ["taskkill", "/PID", str(pid), "/T"],
                capture_output=True, text=True, timeout=RESTART_STOP_TIMEOUT_SEC,
            )
            if completed.returncode != 0:
                raise OSError(completed.stderr.strip() or completed.stdout.strip())
        else:
            os.killpg(os.getpgid(pid), signal.SIGTERM)
    except (OSError, subprocess.TimeoutExpired) as exc:
        emit({"ok": False, "state": "restart-stop-failed",
              "error": f"无法停止旧 ComfyUI 后端：{exc}"})

    deadline = time.time() + RESTART_STOP_TIMEOUT_SEC
    while time.time() < deadline:
        if not pid_alive(pid) and not port_occupied(port):
            return
        time.sleep(0.25)
    emit({"ok": False, "state": "restart-stop-timeout",
          "error": "旧 ComfyUI 后端未在限定时间内退出；为保护任务未强制结束，请重试"})


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


def data_dir() -> str:
    d = os.environ.get("HUB_PLUGIN_DATA_DIR", "").strip()
    if not d:
        emit({"ok": False, "state": "no-data-dir",
              "error": "HUB_PLUGIN_DATA_DIR 缺失：请更新客户端"})
    return d


def parse_args(argv: list[str]) -> tuple[int, str, bool, bool]:
    port = DEFAULT_PORT
    install_dir = ""
    restart = False
    sync_model_paths = False
    i = 0
    if argv and not argv[0].startswith("--"):
        port = int(argv[0])
        i = 1
    while i < len(argv):
        if argv[i] == "--install-dir" and i + 1 < len(argv):
            install_dir = argv[i + 1]
            i += 1
        elif argv[i] == "--restart":
            restart = True
        elif argv[i] == "--sync-model-paths":
            sync_model_paths = True
        i += 1
    return port, install_dir, restart, sync_model_paths


def resolve_install_dir(control_root: str, value: str = "") -> str:
    raw = str(value or "").strip()
    if not raw:
        return os.path.abspath(control_root)
    expanded = os.path.expandvars(os.path.expanduser(raw))
    if not os.path.isabs(expanded):
        raise ValueError("安装路径必须是绝对路径")
    return os.path.abspath(expanded)


def read_user_launch_args(root: str) -> list[str]:
    """读取用户自定义启动参数，剔除与托管实例冲突的关键参数。

    文件缺失、非法 JSON 或格式不对都静默降级为空列表——用户配置错误不应
    阻断后端启动。被 MANAGED_LAUNCH_FLAGS 命中的 flag（含其紧随的取值）
    直接丢弃，其余原样透传。
    """
    try:
        with open(os.path.join(root, USER_LAUNCH_ARGS_NAME), encoding="utf-8") as f:
            raw = json.load(f)
    except (OSError, ValueError):
        return []
    if not isinstance(raw, list) or not all(isinstance(a, str) for a in raw):
        return []
    result: list[str] = []
    drop_next_value = False
    for arg in raw:
        if drop_next_value:
            drop_next_value = False
            # 被拦截 flag 后面若跟的是取值（非 -- 开头），一并丢弃
            if not arg.startswith("--"):
                continue
        flag = arg.split("=", 1)[0]
        if flag in MANAGED_LAUNCH_FLAGS:
            # `--flag=value` 自带取值，无需再吞下一个 token
            drop_next_value = "=" not in arg
            continue
        result.append(arg)
    return result


def venv_directory(root: str, directory: str) -> str:
    """返回后端 venv 路径；Windows 使用用户目录下的短路径。"""
    if sys.platform == "win32":
        home = os.environ.get("USERPROFILE") or os.path.expanduser("~")
        return os.path.join(home, ".hub-c", directory)
    return os.path.join(root, "backend", directory, ".venv")


def venv_python(venv_dir: str) -> str:
    return os.path.join(venv_dir, "Scripts", "python.exe") if sys.platform == "win32" \
        else os.path.join(venv_dir, "bin", "python")


# 各模型类别在本地 ComfyUI 安装内的相对目录（与 extra_model_paths.yaml.example
# 一致；\n 分隔多个候选目录）。刻意排除 custom_nodes / datasets。
LOCAL_MODEL_SUBDIRS = {
    "checkpoints": "models/checkpoints/",
    "configs": "models/configs/",
    "loras": "models/loras/",
    "vae": "models/vae/",
    "text_encoders": "models/text_encoders/\nmodels/clip/",
    "diffusion_models": "models/unet/\nmodels/diffusion_models/",
    "clip_vision": "models/clip_vision/",
    "style_models": "models/style_models/",
    "embeddings": "models/embeddings/",
    "diffusers": "models/diffusers/",
    "vae_approx": "models/vae_approx/",
    "controlnet": "models/controlnet/\nmodels/t2i_adapter/",
    "gligen": "models/gligen/",
    "upscale_models": "models/upscale_models/",
    "hypernetworks": "models/hypernetworks/",
    "photomaker": "models/photomaker/",
    "model_patches": "models/model_patches/",
    "audio_encoders": "models/audio_encoders/",
}

# 判定“这里真有模型”的指示目录（models/ 下、非空才算数，空脚手架不挂载）。
LOCAL_MODEL_INDICATORS = (
    "checkpoints", "loras", "vae", "unet", "diffusion_models",
    "text_encoders", "clip", "controlnet", "upscale_models", "embeddings",
)


def desktop_config_base() -> str:
    """ComfyUI Desktop 在 config.json 里记录的 basePath（最可靠的探测源）。"""
    if sys.platform == "win32":
        conf_dir = os.environ.get("APPDATA", "")
    elif sys.platform == "darwin":
        conf_dir = os.path.expanduser("~/Library/Application Support")
    else:
        conf_dir = os.environ.get("XDG_CONFIG_HOME", os.path.expanduser("~/.config"))
    try:
        with open(os.path.join(conf_dir, "ComfyUI", "config.json"), encoding="utf-8") as f:
            base = json.load(f).get("basePath", "")
        return base if isinstance(base, str) else ""
    except (OSError, ValueError):
        return ""


def dir_has_entries(path: str) -> bool:
    try:
        with os.scandir(path) as it:
            return any(not e.name.startswith(".") for e in it)
    except OSError:
        return False


def looks_like_comfy_models(base: str) -> bool:
    """base/models 存在且至少一个指示子目录里真有东西。"""
    models = os.path.join(base, "models")
    if not os.path.isdir(models):
        return False
    return any(dir_has_entries(os.path.join(models, sub)) for sub in LOCAL_MODEL_INDICATORS)


def detect_local_comfy_bases(userdata: str) -> list[str]:
    """探测常见本地 ComfyUI 安装位置，返回去重后的绝对路径列表。"""
    home = os.path.expanduser("~")
    candidates = [desktop_config_base()]
    for parent in (os.path.join(home, "Documents"), home,
                   os.path.join(home, "Desktop"), os.path.join(home, "Downloads")):
        candidates.append(os.path.join(parent, "ComfyUI"))
        candidates.append(os.path.join(parent, "ComfyUI_windows_portable", "ComfyUI"))
    if sys.platform == "win32":
        for drive in ("C", "D", "E", "F"):
            candidates.append(os.path.join(f"{drive}:\\", "ComfyUI_windows_portable", "ComfyUI"))
            candidates.append(os.path.join(f"{drive}:\\", "ComfyUI"))

    userdata_real = os.path.realpath(userdata)
    found: list[str] = []
    seen: set[str] = set()
    for cand in candidates:
        if not cand:
            continue
        real = os.path.realpath(os.path.expanduser(cand))
        if real in seen or real == userdata_real:
            continue
        seen.add(real)
        if looks_like_comfy_models(real):
            found.append(real)
    return found


def register_managed_paths(control_root: str, install_root: str) -> list[str]:
    path_file = os.path.join(control_root, MODEL_PATHS_NAME)
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
    payload = {
        "schemaVersion": MODEL_PATHS_SCHEMA_VERSION,
        "activeDirectory": os.path.abspath(active),
        "directories": directories,
        "managedDataDirectory": managed_data,
    }
    temporary = f"{path_file}.{os.getpid()}.tmp"
    try:
        with open(temporary, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False)
        os.replace(temporary, path_file)
    except OSError:
        try:
            os.unlink(temporary)
        except OSError:
            pass
    return [directory for directory in directories if directory != managed_models]


def direct_model_subdirs(value: str) -> str:
    return "\n".join(
        line[len("models/"):] if line.startswith("models/") else line
        for line in value.splitlines()
    )


def write_local_models_yaml(
    root: str,
    bases: list[str],
    model_roots: list[str] | None = None,
) -> str:
    """把探测结果写成 extra_model_paths 格式的 yaml；无结果时清掉旧文件。

    路径用 json.dumps 编码 —— 合法的 YAML 双引号标量，Windows 反斜杠、
    空格、\n 多行值全都安全。"""
    path = os.path.join(root, "local-models.yaml")
    if not bases and not model_roots:
        try:
            os.unlink(path)
        except OSError:
            pass
        return ""
    lines = ["# 自动生成：本机已装 ComfyUI 的模型目录（每次启动重新探测，勿手改）"]
    for i, base in enumerate(bases):
        lines.append(f"hub_local_comfyui_{i}:")
        lines.append(f"    base_path: {json.dumps(base)}")
        for key, sub in LOCAL_MODEL_SUBDIRS.items():
            lines.append(f"    {key}: {json.dumps(sub)}")
    for i, models_root in enumerate(model_roots or []):
        lines.append(f"hub_registered_models_{i}:")
        lines.append(f"    base_path: {json.dumps(models_root)}")
        for key, sub in LOCAL_MODEL_SUBDIRS.items():
            lines.append(f"    {key}: {json.dumps(direct_model_subdirs(sub))}")
    tmp = f"{path}.{os.getpid()}.tmp"
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
        os.replace(tmp, path)
    except OSError:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        return ""
    return path


def start_lock_path(root: str) -> str:
    return os.path.join(root, START_LOCK_NAME)


def start_state_path(root: str) -> str:
    return os.path.join(root, START_STATE_NAME)


def read_start_state(root: str) -> dict:
    try:
        with open(start_state_path(root), encoding="utf-8") as f:
            value = json.load(f)
        return value if isinstance(value, dict) else {}
    except (OSError, ValueError):
        return {}


def write_start_state(root: str, phase: str, message: str,
                      reset: bool = False, **fields: object) -> None:
    now = time.time()
    state = {} if reset else read_start_state(root)
    state.update({
        "schemaVersion": START_STATE_SCHEMA_VERSION,
        "phase": phase,
        "message": message,
        "updatedAt": now,
        "heartbeatAt": now,
        **{key: value for key, value in fields.items() if value is not None},
    })
    state.setdefault("startedAt", now)
    state.setdefault("launcherPid", os.getpid())
    state.setdefault("backendPid", None)
    if phase != "error":
        state["error"] = None

    temp_path = f"{start_state_path(root)}.{os.getpid()}.tmp"
    try:
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False)
            f.flush()
            os.fsync(f.fileno())
        os.replace(temp_path, start_state_path(root))
    except OSError:
        try:
            os.unlink(temp_path)
        except OSError:
            pass


def try_acquire_start_lock(root: str) -> bool:
    """原子获取跨 Gateway / iframe 的后端启动锁。

    锁中记录启动脚本 PID。持有者仍存活时只能等待；持有者异常退出留下的
    陈尸锁由下一位调用者清理后接管。
    """
    lock = start_lock_path(root)
    for _ in range(2):
        try:
            fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            try:
                os.write(fd, str(os.getpid()).encode())
            finally:
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
                os.unlink(lock)
            except OSError:
                return False
    return False


def release_start_lock(root: str) -> None:
    """只释放当前进程持有的锁，避免误删后来者已经接管的锁。"""
    lock = start_lock_path(root)
    try:
        with open(lock, encoding="utf-8") as f:
            holder = int(f.read().strip() or "0")
        if holder == os.getpid():
            os.unlink(lock)
    except (OSError, ValueError):
        pass


def wait_for_start_turn(root: str, port: int) -> float:
    """等待并发启动者完成，或在其退出后原子接管启动权。"""
    deadline = time.time() + READY_TIMEOUT_SEC
    while time.time() < deadline:
        if try_acquire_start_lock(root):
            write_start_state(
                root,
                phase="checking",
                message="正在检查本机 ComfyUI 后端",
                reset=True,
                port=port,
                lockHolderPid=os.getpid(),
            )
            return deadline
        if probe_comfy(port):
            emit({"ok": True, "state": "started-by-peer", "port": port})
        time.sleep(READY_POLL_INTERVAL_SEC)
    emit({"ok": False, "state": "start-timeout", "port": port,
          "error": f"等待另一个 ComfyUI 启动任务超过 {READY_TIMEOUT_SEC}s"})


def main() -> None:
    global active_root
    port, install_dir_arg, restart, sync_model_paths = parse_args(sys.argv[1:])
    control_root = data_dir()
    active_root = control_root
    os.makedirs(control_root, exist_ok=True)
    try:
        install_root = resolve_install_dir(control_root, install_dir_arg)
    except ValueError as exc:
        emit({"ok": False, "state": "invalid-install-dir", "error": str(exc)})
    registered_model_roots = register_managed_paths(control_root, install_root)
    if sync_model_paths:
        print(json.dumps({
            "ok": True,
            "state": "model-paths-synced",
            "installDir": install_root,
        }, ensure_ascii=False))
        return
    deadline = wait_for_start_turn(control_root, port)
    try:
        # 探测、端口判断和 spawn 必须都在同一把跨进程锁内，否则两个
        # workspace Gateway 仍可能同时看到“未启动”并各自拉起一个后端。
        if probe_comfy(port):
            if restart:
                write_start_state(
                    control_root,
                    phase="checking",
                    message="正在确认后端空闲并准备重启",
                    port=port,
                )
                stop_managed_backend(control_root, install_root, port)
            else:
                emit({"ok": True, "state": "already-running", "port": port})
        if port_occupied(port):
            # 有进程占着端口但不应答 /system_stats —— 不是我们的后端。
            emit({"ok": False, "state": "port-conflict", "port": port,
                  "error": f"端口 {port} 被其他程序占用，请释放后重试"})

        write_start_state(
            control_root,
            phase="validating",
            message="正在检查后端安装完整性",
            port=port,
        )
        try:
            with open(os.path.join(install_root, "backend", "current.json"), encoding="utf-8") as f:
                current = json.load(f)
            version = str(current["version"])
            directory = str(current.get("directory") or version)
            target = str(current.get("target") or "legacy")
            build_id = str(current.get("buildId") or "legacy")
            launch_args = current.get("launchArgs") or []
            if not isinstance(launch_args, list) or not all(isinstance(arg, str) for arg in launch_args):
                raise ValueError("launchArgs 格式错误")
        except (OSError, ValueError, KeyError):
            emit({"ok": False, "state": "not-installed", "error": "后端尚未安装"})

        ver_dir = os.path.join(install_root, "backend", directory)
        comfy_dir = os.path.join(ver_dir, "ComfyUI")
        venv_dir = venv_directory(install_root, directory)
        py = venv_python(venv_dir)
        if not os.path.isfile(os.path.join(ver_dir, ".ready")) or not os.path.isfile(py):
            emit({"ok": False, "state": "not-installed",
                  "error": f"后端 {version} 安装不完整，请重新安装"})

        write_start_state(
            control_root,
            phase="preparing",
            message="正在准备模型、输入和输出目录",
            port=port,
            version=version,
        )
        userdata = os.path.join(install_root, "userdata")
        # ComfyUI 预启动脚本会直接 os.listdir(custom_nodes)，目录不存在即崩；
        # 其余子目录一并预建，用户误删后下次启动自愈。
        for sub in ("custom_nodes", "models", "input", "output", "temp", "user"):
            os.makedirs(os.path.join(userdata, sub), exist_ok=True)
        database_path = os.path.join(userdata, "user", "comfyui.db")
        log_path = os.path.join(control_root, f"backend-{version}.log")
        log_file = open(log_path, "ab")  # noqa: SIM115 — 交给子进程持有

        env = os.environ.copy()
        env["VIRTUAL_ENV"] = venv_dir
        env["PATH"] = os.path.dirname(py) + os.pathsep + env.get("PATH", "")

        # iframe 位于按 workspace 动态分配的 Gateway origin，浏览器会直接
        # 访问本机 18188，因此托管后端必须放行跨源请求。后端只监听
        # 127.0.0.1，不向局域网暴露。
        argv = [
            py, os.path.join(comfy_dir, "main.py"),
            "--port", str(port),
            "--base-directory", userdata,
            "--database-url", f"sqlite:///{database_path}",
            "--enable-cors-header", "*",
        ] + launch_args + read_user_launch_args(control_root)

        # 复用本机已装 ComfyUI 的模型，并挂载 Hub 记录过的全部模型下载目录。
        local_bases = detect_local_comfy_bases(userdata)
        local_yaml = write_local_models_yaml(
            control_root,
            local_bases,
            registered_model_roots,
        )
        if local_yaml:
            argv += ["--extra-model-paths-config", local_yaml]

        write_start_state(
            control_root,
            phase="spawning",
            message="正在创建 ComfyUI 后端进程",
            port=port,
            version=version,
            target=target,
            buildId=build_id,
            log=log_path,
            localModelBases=local_bases or None,
            registeredModelRoots=registered_model_roots or None,
        )
        try:
            proc = subprocess.Popen(
                argv, cwd=comfy_dir, env=env,
                stdout=log_file, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                # 关键：独立会话，本次 RPC 返回后后端继续活着。
                start_new_session=True,
            )
        except OSError as exc:
            emit({"ok": False, "state": "spawn-failed", "error": str(exc), "log": log_path})
        finally:
            log_file.close()

        write_start_state(
            control_root,
            phase="loading",
            message="后端进程已启动，正在加载节点和模型索引",
            port=port,
            version=version,
            target=target,
            buildId=build_id,
            backendPid=proc.pid,
            log=log_path,
        )

        # 记录我们拉起的进程，便于诊断/后续做"停止后端"。
        try:
            with open(os.path.join(control_root, "backend-state.json"), "w", encoding="utf-8") as f:
                json.dump({"pid": proc.pid, "port": port, "version": version, "target": target,
                           "buildId": build_id, "installDir": install_root,
                           "backendDirectory": directory,
                           "log": log_path, "startedAt": time.time()}, f, ensure_ascii=False)
        except OSError:
            pass

        while time.time() < deadline:
            if probe_comfy(port):
                emit({"ok": True, "state": "started", "port": port,
                      "version": version, "target": target, "buildId": build_id,
                      "log": log_path})
            if proc.poll() is not None:
                emit({"ok": False, "state": "spawn-failed", "port": port, "log": log_path,
                      "error": f"后端进程启动即退出（exit {proc.returncode}），详见日志"})
            write_start_state(
                control_root,
                phase="loading",
                message="后端进程运行中，正在加载节点和模型索引",
                port=port,
                version=version,
                target=target,
                buildId=build_id,
                backendPid=proc.pid,
                log=log_path,
            )
            time.sleep(READY_POLL_INTERVAL_SEC)

        emit({"ok": False, "state": "start-timeout", "port": port, "log": log_path,
              "error": f"后端 {READY_TIMEOUT_SEC}s 内未就绪，详见日志"})
    finally:
        release_start_lock(control_root)


if __name__ == "__main__":
    main()
