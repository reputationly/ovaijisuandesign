#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将 clip-studio 项目安装到剪映/CapCut 草稿目录，并可选唤起剪映。

由插件通过 hub.python.run 调用。payload 走 stdin（argv 有长度上限，
draft_content.json 轻松超过它），格式：

{
  "draft_content":  {...},   # 完整的 draft_content 对象
  "draft_meta_info": {...},  # 完整的 draft_meta_info 对象
  "media_files": [           # 需要拷进草稿目录的素材
    { "srcPath": "jianying-export/foo.mp4", "destFileName": "foo.mp4" }
  ],
  "flavor": "jianying" | "capcut",
  "open": true               # 完成后是否唤起剪映
}

落盘流程严格对齐 Hub 主仓旧实现（jianying-draft-writer.ts, cfb748f^）：
  1) 素材拷到 <draftDir>/Resources/（剪映是沙盒应用，素材必须在草稿目录内）
  2) 改写 draft_content.materials.{videos,audios}[].path 为拷贝后的绝对路径
  3) 同步改写 draft_meta.draft_materials[*].value[*].file_Path / extra_info
  4) 主文件写 draft_info.json（剪映只读它；draft_content.json 只是兼容别名）
  5) 写 5 个辅助 config（缺了剪映报"草稿损坏"）
  6) 创建 6 个空 scaffold 目录
  7) 注册到 <draft-root>/root_meta_info.json 的 all_draft_store[]
     （不注册剪映草稿列表里看不到）

stdout 输出单行 JSON 结果：{ "success": bool, "draftPath"?: str, "error"?: str }
"""

import json
import os
import platform
import shutil
import subprocess
import sys
import time
import uuid
import zipfile
import tempfile
from pathlib import Path

PLUGIN_ID = "clip-studio"

SCAFFOLD_SUBDIRS = [
    "adjust_mask",
    "matting",
    "qr_upload",
    "smart_crop",
    "subdraft",
    "common_attachment",
]

# 随 zip 包分发的一键安装脚本（在目标机器上运行）
INSTALL_SCRIPT = r'''#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""剪映草稿安装器 —— 在装了剪映的机器上运行：python3 install.py"""
import json, os, platform, shutil, subprocess, sys, time, uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent

def draft_root():
    home = Path.home()
    if platform.system() == "Darwin":
        return home / "Movies" / "JianyingPro" / "User Data" / "Projects" / "com.lveditor.draft"
    if platform.system() == "Windows":
        return Path(os.environ["LOCALAPPDATA"]) / "JianyingPro" / "User Data" / "Projects" / "com.lveditor.draft"
    raise SystemExit("不支持的操作系统")

def main():
    root = draft_root()
    if not root.exists():
        raise SystemExit(f"未找到剪映草稿目录（{root}），请先安装并打开过一次剪映")
    src = next((d for d in HERE.iterdir() if d.is_dir() and (d / "draft_info.json").exists()), None)
    if src is None:
        raise SystemExit("zip 内未找到草稿目录")
    name, dest, n = src.name, root / src.name, 2
    while dest.exists():
        dest = root / f"{name}-{n}"; n += 1
    shutil.copytree(src, dest)
    # 相对路径 → 绝对路径
    for fname in ("draft_info.json", "draft_content.json"):
        f = dest / fname
        if not f.exists(): continue
        c = json.loads(f.read_text(encoding="utf-8"))
        for group in ("videos", "audios"):
            for item in (c.get("materials") or {}).get(group) or []:
                p = item.get("path")
                if isinstance(p, str) and not os.path.isabs(p):
                    item["path"] = str(dest / p)
        f.write_text(json.dumps(c, ensure_ascii=False), encoding="utf-8")
    mf = dest / "draft_meta_info.json"
    meta = json.loads(mf.read_text(encoding="utf-8"))
    meta["draft_fold_path"] = str(dest); meta["draft_root_path"] = str(root)
    for g in meta.get("draft_materials") or []:
        for v in g.get("value") or []:
            fp = v.get("file_Path")
            if isinstance(fp, str) and not os.path.isabs(fp):
                v["file_Path"] = str(dest / fp.lstrip("./"))
                if isinstance(v.get("extra_info"), str): v["extra_info"] = v["file_Path"]
    mf.write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
    # 先关剪映再注册（退出时它会用内存覆盖 root_meta）
    if platform.system() == "Darwin" and subprocess.run(["pgrep", "-if", "JianyingPro|VideoFusion"], capture_output=True).returncode == 0:
        for app in ("VideoFusion-macOS", "剪映专业版", "JianyingPro"):
            if subprocess.run(["osascript", "-e", f'tell application "{app}" to quit'], capture_output=True).returncode == 0:
                for _ in range(20):
                    time.sleep(0.5)
                    if subprocess.run(["pgrep", "-if", "JianyingPro|VideoFusion"], capture_output=True).returncode != 0: break
                break
    c = json.loads((dest / "draft_info.json").read_text(encoding="utf-8"))
    rm = root / "root_meta_info.json"
    try: rootmeta = json.loads(rm.read_text(encoding="utf-8"))
    except Exception: rootmeta = {"all_draft_store": [], "draft_ids": 0, "root_path": str(root)}
    store = rootmeta.setdefault("all_draft_store", [])
    size = sum(f.stat().st_size for f in (dest / "Resources").iterdir() if f.is_file()) if (dest / "Resources").exists() else 0
    now = int(time.time() * 1_000_000)
    store.append({"draft_fold_path": str(dest), "draft_id": str(c.get("id") or uuid.uuid4()).upper(),
        "draft_json_file": str(dest / "draft_info.json"), "draft_name": dest.name,
        "draft_root_path": str(root), "draft_timeline_materials_size": size,
        "tm_draft_create": now, "tm_draft_modified": now, "tm_draft_removed": 0,
        "tm_duration": c.get("duration") or 0, "draft_is_invisible": False,
        "streaming_edit_draft_ready": True, "draft_type": "", "draft_cover": "", "draft_new_version": ""})
    rootmeta["draft_ids"] = len(store) + 1
    rm.write_text(json.dumps(rootmeta, ensure_ascii=False), encoding="utf-8")
    if platform.system() == "Darwin":
        for app in ("剪映专业版", "JianyingPro"):
            if subprocess.run(["open", "-a", app], capture_output=True).returncode == 0: break
    print(f"安装完成：{dest}")

if __name__ == "__main__":
    main()
'''


def build_zip_fallback(draft_content: dict, draft_meta: dict, media_files: list,
                       plugin_data_root: Path) -> dict:
    """未安装剪映时：把草稿目录打成 zip（含一键安装脚本）供插件插入画布。

    zip 内 materials path 用相对路径（Resources/xx），目标机器上的落点无法
    预知，由 install.py 安装时改写为绝对路径并注册 root_meta。
    """
    draft_name = str(draft_meta.get("draft_name") or "Clip Studio Export")
    safe_name = "".join(c if c not in '/\\:*?"<>|' else "_" for c in draft_name).strip() or "draft"

    # 相对路径写法（install.py 安装时改绝对）
    for group in ("videos", "audios"):
        for item in (draft_content.get("materials") or {}).get(group) or []:
            p = item.get("path")
            if isinstance(p, str) and p:
                item["path"] = f"Resources/{os.path.basename(p)}"
    for g in draft_meta.get("draft_materials") or []:
        for v in g.get("value") or []:
            fp = v.get("file_Path")
            if isinstance(fp, str) and fp:
                v["file_Path"] = f"Resources/{os.path.basename(fp)}"
                if isinstance(v.get("extra_info"), str):
                    v["extra_info"] = v["file_Path"]

    out_dir = plugin_data_root / "jianying-export"
    out_dir.mkdir(parents=True, exist_ok=True)
    zip_name = f"{safe_name}.jianying-draft.zip"
    zip_path = out_dir / zip_name

    missing = []
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        prefix = f"{safe_name}/"
        zf.writestr(prefix + "draft_info.json", json.dumps(draft_content, ensure_ascii=False))
        zf.writestr(prefix + "draft_content.json", json.dumps(draft_content, ensure_ascii=False))
        zf.writestr(prefix + "draft_meta_info.json", json.dumps(draft_meta, ensure_ascii=False))
        # 草稿还依赖 5 个辅助配置；缺少时剪映会提示“草稿损坏”。复用正常
        # 安装路径的生成逻辑，在临时目录生成后一起收入压缩包。
        with tempfile.TemporaryDirectory() as temp_dir:
            config_dir = Path(temp_dir) / safe_name
            config_dir.mkdir()
            write_scaffold_configs(config_dir, draft_content)
            for config_file in config_dir.iterdir():
                if config_file.is_file():
                    zf.write(config_file, prefix + config_file.name)
        for sub in SCAFFOLD_SUBDIRS:
            zf.writestr(prefix + sub + "/", "")
        for item in media_files:
            src = (plugin_data_root / item["srcPath"]).resolve()
            if not str(src).startswith(str(plugin_data_root.resolve())) or not src.exists():
                missing.append(item["srcPath"])
                continue
            zf.write(src, prefix + "Resources/" + item["destFileName"])
        zf.writestr("install.py", INSTALL_SCRIPT)
        zf.writestr("安装说明.txt", "\n".join([
            "本包是剪映（JianyingPro）草稿。安装方法：",
            "",
            "方法一（推荐，需要 Python 3）：",
            "  1. 解压本 zip",
            "  2. 在解压目录运行：python3 install.py",
            "  3. 脚本会自动拷贝草稿、修复素材路径、注册并打开剪映",
            "",
            "方法二（手动）：",
            f"  1. 把「{safe_name}」整个文件夹拷到剪映草稿目录：",
            "     macOS: ~/Movies/JianyingPro/User Data/Projects/com.lveditor.draft/",
            "     Windows: %LOCALAPPDATA%\\JianyingPro\\User Data\\Projects\\com.lveditor.draft\\",
            "  2. 重启剪映。若提示媒体丢失，在剪映里重新链接 Resources/ 目录下的素材",
        ]))

    return {
        "success": True,
        "mode": "zip",
        "zipRelPath": f"jianying-export/{zip_name}",
        "zipName": zip_name,
        "mediaMissing": missing,
    }


def get_draft_root(flavor: str) -> Path:
    """剪映/CapCut 的草稿根目录（macOS / Windows）。"""
    system = platform.system()
    home = Path.home()
    app_dir = "JianyingPro" if flavor == "jianying" else "CapCut"

    if system == "Darwin":
        return home / "Movies" / app_dir / "User Data" / "Projects" / "com.lveditor.draft"
    if system == "Windows":
        appdata = os.environ.get("LOCALAPPDATA")
        if not appdata:
            raise RuntimeError("无法找到 %LOCALAPPDATA%")
        return Path(appdata) / app_dir / "User Data" / "Projects" / "com.lveditor.draft"
    raise RuntimeError(f"不支持的操作系统: {system}")


def get_plugin_data_root(media_files=None) -> Path:
    """返回当前 Hub 实例为该插件分配的数据目录。

    新版 gateway 会通过 HUB_PLUGIN_DATA_DIR 直接注入准确路径。旧版没有该
    环境变量，只能兼容扫描 ~/.hub*/；不能硬编码 suffix，因为灰度、测试和
    staging 渠道会使用 .hub-test、.hub-staging 等目录。
    """
    injected = os.environ.get("HUB_PLUGIN_DATA_DIR", "").strip()
    if injected:
        # gateway 给的是权威路径。项目没有可写 blob 时，前端不会调用
        # writeToPluginDir，因此该目录可能尚不存在；这里应创建而不是误报。
        candidate = Path(injected).expanduser()
        candidate.mkdir(parents=True, exist_ok=True)
        return candidate

    # 兼容尚未注入 HUB_PLUGIN_DATA_DIR 的旧版生产客户端。即使插件目录
    # 还没创建，所属 Hub 的 plugin-data 父目录通常已经存在。
    candidates = [
        parent / PLUGIN_ID
        for parent in Path.home().glob(".hub*/plugin-data")
        if parent.is_dir()
    ]
    if media_files:
        # 多个 Hub 渠道并存时，选择真正包含本次前端刚写入素材的目录。
        matching = [
            root for root in candidates
            if all((root / str(item.get("srcPath", ""))).is_file() for item in media_files)
        ]
        if matching:
            candidates = matching
    if candidates:
        candidate = max(
            candidates,
            key=lambda path: (path if path.exists() else path.parent).stat().st_mtime,
        )
        candidate.mkdir(parents=True, exist_ok=True)
        return candidate
    raise RuntimeError("找不到 Hub 插件数据根目录，请更新 Hub 客户端后重试")


def create_draft_directory(draft_root: Path, draft_name: str) -> Path:
    """在草稿根目录下创建以草稿名命名的目录（重名加序号）。"""
    base = "".join(c if c not in '/\\:*?"<>|' else "_" for c in draft_name).strip() or str(uuid.uuid4())
    draft_dir = draft_root / base
    n = 2
    while draft_dir.exists():
        draft_dir = draft_root / f"{base}-{n}"
        n += 1
    draft_dir.mkdir(parents=True)
    for subdir in SCAFFOLD_SUBDIRS:
        (draft_dir / subdir).mkdir(exist_ok=True)
    return draft_dir


def atomic_write_json(path: Path, obj) -> None:
    """先写临时文件再 rename，避免剪映读到撕裂状态。"""
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")
    tmp.replace(path)


def copy_resources(draft_dir: Path, media_files: list, plugin_data_root: Path):
    """素材拷到 Resources/，返回 destFileName → 绝对路径映射和缺失列表。"""
    resources_dir = draft_dir / "Resources"
    resources_dir.mkdir(exist_ok=True)

    abs_by_dest: dict[str, str] = {}
    missing: list[str] = []
    data_root = plugin_data_root.resolve()

    for item in media_files:
        src = (plugin_data_root / item["srcPath"]).resolve()
        # 防路径穿越：字符串 startswith 会把 /root-evil 误判成 /root 的子目录。
        try:
            src.relative_to(data_root)
        except ValueError:
            missing.append(item["srcPath"])
            continue
        if not src.is_file():
            missing.append(item["srcPath"])
            continue

        # 前端已经清洗文件名，Python 侧再次拒绝绝对路径和目录穿越。
        dest_name = str(item["destFileName"])
        if Path(dest_name).name != dest_name or Path(dest_name).is_absolute():
            missing.append(item["srcPath"])
            continue

        # 重名追加 _2/_3
        stem, dot, ext = dest_name.rpartition(".")
        if not dot:
            stem, ext = dest_name, ""
        dest = resources_dir / dest_name
        n = 2
        while dest.exists():
            dest = resources_dir / (f"{stem}_{n}.{ext}" if ext else f"{stem}_{n}")
            n += 1

        shutil.copy2(src, dest)
        abs_by_dest[dest_name] = str(dest)

    return abs_by_dest, missing


def cleanup_staged_media(media_files: list, plugin_data_root: Path) -> None:
    """删除本次导出的暂存素材，避免 plugin-data 随每次导出无限增长。"""
    data_root = plugin_data_root.resolve()
    parents = set()
    for item in media_files:
        path = (plugin_data_root / str(item.get("srcPath", ""))).resolve()
        try:
            path.relative_to(data_root)
        except ValueError:
            continue
        try:
            path.unlink(missing_ok=True)
            parents.add(path.parent)
        except OSError:
            pass
    for parent in sorted(parents, key=lambda path: len(path.parts), reverse=True):
        try:
            parent.rmdir()
        except OSError:
            pass


def rewrite_material_paths(draft_content: dict, draft_meta: dict, abs_by_dest: dict, resources_dir: Path):
    """materials path 从裸文件名升级为 Resources/ 下的绝对路径。

    剪映是沙盒应用且按绝对路径找素材；留相对路径会显示"媒体丢失"。
    """
    materials = draft_content.get("materials") or {}
    for group in ("videos", "audios"):
        for item in materials.get(group) or []:
            old = item.get("path")
            if not isinstance(old, str) or not old:
                continue
            item["path"] = abs_by_dest.get(old) or str(resources_dir / old)

    for group in draft_meta.get("draft_materials") or []:
        for v in group.get("value") or []:
            fp = v.get("file_Path")
            if not isinstance(fp, str) or not fp:
                continue
            base = os.path.basename(fp)
            abs_path = abs_by_dest.get(base) or str(resources_dir / base)
            v["file_Path"] = abs_path
            if isinstance(v.get("extra_info"), str):
                v["extra_info"] = abs_path


def write_scaffold_configs(draft_dir: Path, draft_content: dict):
    """写 5 个辅助 config。缺了剪映会报"草稿损坏"或拒读。"""
    canvas = draft_content.get("canvas_config") or {}
    height_px = canvas.get("height") or 1080
    video_resolution = 2160 if height_px >= 2160 else 1080
    timeline_id = draft_content.get("id") or "timeline-default"
    duration_micros = draft_content.get("duration") or 0
    now_sec = int(time.time())

    atomic_write_json(draft_dir / "draft_agency_config.json", {
        "is_auto_agency_enabled": False,
        "is_auto_agency_popup": False,
        "is_single_agency_mode": False,
        "marterials": None,
        "use_converter": False,
        "video_resolution": video_resolution,
    })
    atomic_write_json(draft_dir / "draft_biz_config.json", {
        "timeline_settings": {timeline_id: {"adsorb_enabled": True}},
    })
    (draft_dir / "draft_settings").write_text("\n".join([
        "[General]",
        "ai_cover_agent_prompt_text=",
        "cloud_last_modify_platform=mac",
        "cover_editor_last_seek_time=0",
        f"draft_create_time={now_sec}",
        f"draft_last_edit_time={now_sec}",
        "real_edit_keys=1",
        f"real_edit_seconds={round(duration_micros / 1_000_000)}",
        "",
    ]), encoding="utf-8")
    atomic_write_json(draft_dir / "performance_opt_info.json", {
        "manual_cancle_precombine_segs": None,
        "need_auto_precombine_segs": None,
    })
    atomic_write_json(draft_dir / "timeline_layout.json", {
        "activeTimeline": timeline_id,
        "dockItems": [{
            "dockIndex": 0,
            "ratio": 1,
            "timelineIds": [timeline_id],
            "timelineNames": ["时间线01"],
        }],
        "layoutOrientation": 1,
    })


def register_to_root_meta(draft_dir: Path, draft_content: dict):
    """注册到 root_meta_info.json —— 不注册剪映草稿列表里看不到。"""
    draft_root = draft_dir.parent
    root_meta_path = draft_root / "root_meta_info.json"
    draft_name = draft_dir.name
    draft_id = str(draft_content.get("id") or uuid.uuid4()).upper()
    duration_micros = draft_content.get("duration") or 0
    now_micros = int(time.time() * 1_000_000)

    # 算 Resources/ 总大小（剪映用来显示"素材占用"）
    materials_size = 0
    resources_dir = draft_dir / "Resources"
    if resources_dir.exists():
        for f in resources_dir.iterdir():
            if f.is_file():
                try:
                    materials_size += f.stat().st_size
                except OSError:
                    pass

    try:
        root = json.loads(root_meta_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        root = {"all_draft_store": [], "draft_ids": 0, "root_path": str(draft_root)}
    if not isinstance(root.get("all_draft_store"), list):
        root["all_draft_store"] = []

    entry = {
        "cloud_draft_cover": False,
        "cloud_draft_sync": False,
        "draft_cloud_last_action_download": False,
        "draft_cloud_purchase_info": "",
        "draft_cloud_template_id": "",
        "draft_cloud_tutorial_info": "",
        "draft_cloud_videocut_purchase_info": "",
        "draft_cover": "",
        "draft_fold_path": str(draft_dir),
        "draft_id": draft_id,
        "draft_is_ai_shorts": False,
        "draft_is_cloud_temp_draft": False,
        "draft_is_invisible": False,
        "draft_is_web_article_video": False,
        "draft_json_file": str(draft_dir / "draft_info.json"),
        "draft_name": draft_name,
        "draft_new_version": "",
        "draft_root_path": str(draft_root),
        "draft_timeline_materials_size": materials_size,
        "draft_type": "",
        "draft_web_article_video_enter_from": "",
        "streaming_edit_draft_ready": True,
        "tm_draft_cloud_completed": "",
        "tm_draft_cloud_entry_id": -1,
        "tm_draft_cloud_modified": 0,
        "tm_draft_cloud_parent_entry_id": -1,
        "tm_draft_cloud_space_id": -1,
        "tm_draft_cloud_user_id": -1,
        "tm_draft_create": now_micros,
        "tm_draft_modified": now_micros,
        "tm_draft_removed": 0,
        "tm_duration": duration_micros,
    }

    store = root["all_draft_store"]
    idx = next((i for i, d in enumerate(store)
                if d.get("draft_fold_path") == str(draft_dir)), -1)
    if idx >= 0:
        entry["tm_draft_create"] = store[idx].get("tm_draft_create") or now_micros
        entry["draft_id"] = store[idx].get("draft_id") or draft_id
        store[idx] = entry
    else:
        store.append(entry)
    root["draft_ids"] = len(store) + 1
    if not root.get("root_path"):
        root["root_path"] = str(draft_root)

    atomic_write_json(root_meta_path, root)


def is_app_installed(flavor: str) -> bool:
    """检测剪映/CapCut 客户端是否真实安装，而不是仅检查残留的草稿目录。"""
    system = platform.system()
    if system == "Darwin":
        app_names = (
            ["剪映专业版", "JianyingPro", "VideoFusion-macOS"]
            if flavor == "jianying" else ["CapCut"]
        )
        # `open -Ra` 只解析应用，不会启动它。草稿目录在卸载后可能残留，
        # 因此不能再用 draft_root.exists() 代替客户端安装检测。
        return any(
            subprocess.run(
                ["open", "-Ra", name], capture_output=True, timeout=5
            ).returncode == 0
            for name in app_names
        )

    if system == "Windows":
        exe = "JianyingPro.exe" if flavor == "jianying" else "CapCut.exe"
        # 优先查 App Paths 注册表；再覆盖常见的用户级/系统级安装目录。
        for hive in ("HKCU", "HKLM"):
            key = rf"{hive}\Software\Microsoft\Windows\CurrentVersion\App Paths\{exe}"
            try:
                if subprocess.run(
                    ["reg", "query", key], capture_output=True, timeout=5
                ).returncode == 0:
                    return True
            except (OSError, subprocess.SubprocessError):
                pass
        roots = [
            os.environ.get("LOCALAPPDATA"),
            os.environ.get("PROGRAMFILES"),
            os.environ.get("PROGRAMFILES(X86)"),
        ]
        app_dir = "JianyingPro" if flavor == "jianying" else "CapCut"
        candidates = [
            Path(root) / app_dir / exe
            for root in roots if root
        ] + [
            Path(root) / app_dir / "Apps" / exe
            for root in roots if root
        ]
        return any(path.is_file() for path in candidates)

    return False


def is_app_running(flavor: str) -> bool:
    """只检测客户端是否运行，绝不退出或终止用户的剪映进程。"""
    system = platform.system()
    try:
        if system == "Darwin":
            pattern = "JianyingPro|VideoFusion" if flavor == "jianying" else "CapCut"
            return subprocess.run(
                ["pgrep", "-if", pattern], capture_output=True, timeout=5
            ).returncode == 0
        if system == "Windows":
            exe = "JianyingPro.exe" if flavor == "jianying" else "CapCut.exe"
            probe = subprocess.run(
                ["tasklist", "/FI", f"IMAGENAME eq {exe}"], capture_output=True, timeout=5
            )
            return exe.encode().lower() in probe.stdout.lower()
    except Exception as e:  # noqa: BLE001
        print(f"检测客户端运行状态失败: {e}", file=sys.stderr)
    return False


def open_app(flavor: str):
    """唤起剪映/CapCut。失败不阻塞导出结果。"""
    system = platform.system()
    try:
        if system == "Darwin":
            candidates = ["剪映专业版", "JianyingPro", "VideoFusion-macOS"] if flavor == "jianying" else ["CapCut"]
            for name in candidates:
                r = subprocess.run(["open", "-a", name], capture_output=True)
                if r.returncode == 0:
                    return
        elif system == "Windows":
            name = "JianyingPro.exe" if flavor == "jianying" else "CapCut.exe"
            subprocess.run(["start", "", name], shell=True, check=False)
    except Exception as e:  # noqa: BLE001
        print(f"打开应用失败: {e}", file=sys.stderr)


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        flavor = payload.get("flavor", "jianying")
        if flavor not in ("jianying", "capcut"):
            raise ValueError(f"未知的 flavor: {flavor}")

        app_label = "剪映" if flavor == "jianying" else "CapCut"
        installed = is_app_installed(flavor)

        # 未安装客户端不是导出失败：前端仍会准备素材，随后生成一个可下载、
        # 可在安装剪映后通过 install.py 导入的完整草稿包。
        if payload.get("action") == "probe":
            print(json.dumps({
                "success": True,
                "installed": installed,
                "running": installed and is_app_running(flavor),
            }, ensure_ascii=False))
            return 0

        draft_content = payload["draft_content"]
        draft_meta = payload["draft_meta_info"]
        media_files = payload.get("media_files", [])
        should_open = bool(payload.get("open", False))
        plugin_data_root = get_plugin_data_root(media_files)

        # 本次 session 的素材无论成功、提前返回还是抛异常都必须清理，避免
        # plugin-data 在“尚未打开过客户端”等失败路径下持续堆积。
        try:
            if not installed:
                result = build_zip_fallback(
                    draft_content, draft_meta, media_files, plugin_data_root
                )
                print(json.dumps(result, ensure_ascii=False))
                return 0

            draft_root = get_draft_root(flavor)
            if not draft_root.exists():
                print(json.dumps({
                    "success": False,
                    "error": f"已检测到{app_label}，但尚未创建草稿目录。请先打开一次{app_label}后重试",
                    "code": "DRAFT_ROOT_NOT_FOUND",
                }, ensure_ascii=False))
                return 1

            # 不关闭或中断用户进程。即使客户端正在运行也继续写入并注册，
            # 完成后由前端提示用户重启客户端以刷新草稿列表。
            app_was_running = is_app_running(flavor)

            draft_name = draft_meta.get("draft_name") or "Clip Studio Export"
            draft_dir = create_draft_directory(draft_root, str(draft_name))

            # 1) 素材 → Resources/
            abs_by_dest, missing = copy_resources(draft_dir, media_files, plugin_data_root)
            if missing:
                shutil.rmtree(draft_dir, ignore_errors=True)
                names = ", ".join(str(item) for item in missing[:3])
                extra = f" 等 {len(missing)} 个" if len(missing) > 3 else ""
                raise RuntimeError(f"有素材未能写入剪映草稿：{names}{extra}，请重新导入素材后重试")

            # 2)+3) materials path → 绝对路径
            resources_dir = draft_dir / "Resources"
            rewrite_material_paths(draft_content, draft_meta, abs_by_dest, resources_dir)

            # 补齐 meta 中的目录字段（剪映打开时校验）
            draft_meta["draft_fold_path"] = str(draft_dir)
            draft_meta["draft_root_path"] = str(draft_root)
            draft_meta["draft_timeline_materials_size_"] = sum(
                Path(p).stat().st_size for p in abs_by_dest.values() if Path(p).exists()
            )

            # 4) 主文件 draft_info.json（剪映只读它）；draft_content.json 作兼容别名
            #    注意：不写 editor_version —— 剪映部分版本对顶层未声明字段做严格校验，
            #    会直接报“草稿已损坏”
            atomic_write_json(draft_dir / "draft_info.json", draft_content)
            atomic_write_json(draft_dir / "draft_content.json", draft_content)
            atomic_write_json(draft_dir / "draft_meta_info.json", draft_meta)

            # 5) 辅助 config
            write_scaffold_configs(draft_dir, draft_content)

            # 7) 注册到 root_meta_info.json
            register_to_root_meta(draft_dir, draft_content)

            if should_open and not app_was_running:
                open_app(flavor)

            print(json.dumps({
                "success": True,
                "draftPath": str(draft_dir),
                "mediaCopied": len(media_files) - len(missing),
                "mediaMissing": missing,
                "appWasRunning": app_was_running,
                "needsManualRestart": app_was_running,
            }, ensure_ascii=False))
            return 0
        finally:
            cleanup_staged_media(media_files, plugin_data_root)

    except Exception as e:  # noqa: BLE001
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    sys.exit(main())
