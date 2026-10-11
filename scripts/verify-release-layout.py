#!/usr/bin/env python3
"""`release-desktop.py` 的离线自检。**不联网、不碰凭据、不上传。**

    python3 scripts/verify-release-layout.py

## 为什么需要它

`release-desktop.py` 只在发版流水线里跑，而发版一轮就是三个平台各几百 MB。
2026-10-07 那次线上事故就是在这儿漏的：三个平台各写一份**同名**的
`latest-mac.yml`，publish job 把产物堆进同一个目录时互相覆盖，x64 那份赢了。
于是 `darwin-arm64` 发布了指向 x64 包名的清单 —— **arm64 Mac 点更新 404，
而发布日志全绿**（上传成功、回读校验通过、指针也翻了）。

之前只验了「200 且 version 对」，没比对清单里的**包名和 sha512**，
所以 3.0.21.1 和 3.0.21.2 连着两版都没看见。

## 这里验什么

用**和那次事故一模一样**的夹具（把 x64 的清单放进 arm64 的目录），
断言 `release-desktop.py` 会在**上传任何东西之前**失败，并给出能指到病根的
错误信息；再验正确布局能走通，且三个 target 拿到的 sha512 两两不同。
"""

import base64
import hashlib
import importlib.util
import os
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

# 造一个假的「R2 已配齐」环境：`release-desktop.py` 的 `configured()` 要求这四个
# 变量齐了才肯摆盘，而自检要跑的就是摆盘那段。
os.environ.setdefault("R2_ACCOUNT_ID", "selfcheck")
os.environ.setdefault("R2_BUCKET", "selfcheck")
os.environ.setdefault("R2_PUBLIC_BASE", "https://cdn.selfcheck")
os.environ.setdefault("R2_ACCESS_KEY_ID", "selfcheck")
os.environ.setdefault("R2_SECRET_ACCESS_KEY", "selfcheck")

spec = importlib.util.spec_from_file_location("rd", ROOT / "scripts/release-desktop.py")
rd = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rd)

HUMAN = "3.0.21.3"
ENCODED = "30.21.3"
TARGETS = ("darwin-arm64", "darwin-x64", "win32-x64")
# 每个 target 的包名/载荷。载荷不同 → sha512 必然不同，这正是要断言的东西。
#
# **Windows 的包名里带空格**（`蒜狸小助手 Setup 30.21.3.exe`），和 mac 的
# `<产品名>-<版本>[-arch].dmg` 不一样。别为了好写而简化成没空格 —— 上一版
# 就是这么漏的：断言里用了 `(\S+)` 取包名，Windows 那一行匹配不上，误报成
# 「没有 url/path 字段」，白跑了一轮发布。真实的线上文件名就是带空格的。
# mac 每个 target 同时有 dmg（手动安装）和 zip（electron-updater 只安装这个）。
# 载荷不同 → sha512 必然不同。
LAYOUT = {
    "darwin-arm64": {
        "dmg": (f"蒜狸小助手-{ENCODED}-arm64.dmg", b"arm64-dmg"),
        "zip": (f"蒜狸小助手-{ENCODED}-arm64-mac.zip", b"arm64-zip"),
    },
    "darwin-x64": {
        "dmg": (f"蒜狸小助手-{ENCODED}.dmg", b"x64-dmg"),
        "zip": (f"蒜狸小助手-{ENCODED}-mac.zip", b"x64-zip"),
    },
    "win32-x64": {
        "exe": (f"蒜狸小助手 Setup {ENCODED}.exe", b"win-payload"),
    },
}

FAILED: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    if ok:
        print(f"  ✓ {name}")
    else:
        FAILED.append(name)
        print(f"  ✗ {name}{chr(10) + '      ' + detail if detail else ''}")


def manifest_for(entries: list[tuple[str, bytes]], primary: str) -> str:
    """照 electron-builder 的格式造一份 `latest-*.yml`。

    `url` / `path` 用**真实包名**而不是占位符 —— 占位符会先被「清单指向的包
    不在这个目录」拦下来，就测不到 sha512 那条断言了。

    mac 的 `path` 指向 zip。electron-builder 在 dmg+zip 同时打开时就是这样写的，
    MacUpdater 也只从 files 里找 `.zip`。
    """
    lines = [f"version: {ENCODED}", "files:"]
    primary_b64 = ""
    for pkg_name, payload in entries:
        digest = base64.b64encode(hashlib.sha512(payload).digest()).decode()
        lines.append(f"  - url: {pkg_name}\n    sha512: {digest}\n    size: {len(payload)}")
        if pkg_name == primary:
            primary_b64 = digest
    lines.append(f"path: {primary}")
    lines.append(f"sha512: {primary_b64}")
    lines.append("releaseDate: '2026-10-07T00:00:00.000Z'")
    return "\n".join(lines) + "\n"


def packages_of(target: str) -> list[tuple[str, bytes]]:
    return [(name, payload) for name, payload in LAYOUT[target].values()]


def build(cross_mix: bool, work: Path, *, dmg_only_mac: bool = False) -> Path:
    """造 `dist-electron/<target>/` 三个目录。

    `cross_mix=True` 把 x64 的清单复制进 arm64 的目录 —— **精确复现那次事故**。
    `dmg_only_mac=True` 复现 2026-10-08 的线上清单：文件在，但 yml 只写 dmg。
    """
    out = work / "dist-electron"
    for target, kinds in LAYOUT.items():
        d = out / target
        d.mkdir(parents=True)
        entries = packages_of(target)
        for name, payload in entries:
            (d / name).write_bytes(payload)
            (d / (name + ".blockmap")).write_text("bm")
        listed = entries
        primary = entries[0][0]
        if target.startswith("darwin"):
            zip_name = kinds["zip"][0]
            primary = zip_name
            if dmg_only_mac:
                listed = [kinds["dmg"]]
                primary = kinds["dmg"][0]
        manifest_name = "latest-mac.yml" if target.startswith("darwin") else "latest.yml"
        (d / manifest_name).write_text(manifest_for(listed, primary), encoding="utf8")
    if cross_mix:
        shutil.copy2(
            out / "darwin-x64" / "latest-mac.yml", out / "darwin-arm64" / "latest-mac.yml"
        )
    return out


def run(cross_mix: bool, *, dmg_only_mac: bool = False):
    work = Path(tempfile.mkdtemp(prefix="ov-layout-"))
    out = build(cross_mix, work, dmg_only_mac=dmg_only_mac)
    rd.ELECTRON_OUT = out
    rd.DIST = work / "dist-desktop"
    argv = ["release-desktop.py", "--version", HUMAN, "--layout-only"]
    for t in TARGETS:
        argv += ["--target", t]
    old_argv = sys.argv
    sys.argv = argv
    try:
        rc = rd.main()
        return rc, rd.DIST / HUMAN, ""
    except SystemExit as e:
        return e.code, rd.DIST / HUMAN, ""
    finally:
        sys.argv = old_argv


# ---------------------------------------------------------------- 正确布局

print("\n正确布局：三个 target 各有各的清单和包")
rc, dist, _ = run(cross_mix=False)
check(f"退出码 0（实际 {rc}）", rc == 0)

digests: dict[str, str] = {}
for t in TARGETS:
    f = "latest-mac.yml" if t.startswith("darwin") else "latest.yml"
    p = dist / t / f
    if not p.is_file():
        check(f"{t} 产出了清单", False, f"没有 {p}")
        continue
    text = p.read_text(encoding="utf8")
    for want_name, _payload in packages_of(t):
        check(f"{t} 清单里指向自己的包（{want_name}）", want_name in text)
    check(f"{t} 清单 version 是编码值 {ENCODED}", f"version: {ENCODED}" in text)
    check(f"{t} 清单里地址已重写成绝对地址", "https://cdn.selfcheck/" in text)
    import re

    b64 = re.search(r"^\s*sha512:\s*(\S+)", text, re.M).group(1)
    digests[t] = base64.b64decode(b64).hex()

if len(digests) == len(TARGETS):
    check(
        "三个 target 的 sha512 两两不同（arm64/x64 不会互相冒名）",
        len(set(digests.values())) == len(TARGETS),
        f"实际只有 {len(set(digests.values()))} 个不同的 hash",
    )

# ---------------------------------------------------------------- 那个事故

print("\n事故复现：arm64 目录里被塞了 x64 的清单（2026-10-07 线上真实发生过）")
rc, _, _ = run(cross_mix=True)
check(f"退出码非 0（实际 {rc}）", rc != 0)

# 错误信息要能指到病根。只需要知道它**拒绝**了；完整文案由 fail() 打在
# stderr 上，这里不重复断言措辞（措辞会变，契约不会）。
import io  # noqa: E402
import contextlib  # noqa: E402

buf = io.StringIO()
try:
    with contextlib.redirect_stderr(buf):
        run(cross_mix=True)
except SystemExit:
    pass
msg = buf.getvalue()
check(
    "错误信息点出了「按 target 分目录」这个病根",
    "分目录" in msg or "target" in msg,
    msg[:200],
)

# ---------------------------------------------------------------- 只有 dmg 的 mac 清单

print("\nmac 清单只有 dmg：更新器装不了，发布必须拒绝")
rc, _, _ = run(cross_mix=False, dmg_only_mac=True)
check(f"退出码非 0（实际 {rc}）", rc != 0)
buf = io.StringIO()
try:
    with contextlib.redirect_stderr(buf):
        run(cross_mix=False, dmg_only_mac=True)
except SystemExit:
    pass
msg = buf.getvalue()
check(
    "错误信息点出 mac 更新要 zip",
    "zip" in msg.lower() or "ZIP" in msg,
    msg[:300],
)

# ---------------------------------------------------------------- 结果

print()
if FAILED:
    print(f"✗ {len(FAILED)} 条没过：")
    for n in FAILED:
        print(f"    - {n}")
    raise SystemExit(1)
print("✓ 发布布局自检全过")
