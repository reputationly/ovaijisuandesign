#!/usr/bin/env python3
"""把下载下来的出包产物按 target 摆进 `app/desktop/dist-electron/`。

    python3 scripts/place-release-artifacts.py <artifacts根目录>
    python3 scripts/place-release-artifacts.py --self-test   # 离线夹具自检

## 两套命名都认

- Release 自建包的产物：`electron-<target>`（target = darwin-arm64 / darwin-x64 / win32-x64）
- CI `package` job 的产物（Release 复用它省一轮打包）：
  `desktop-mac-arm64` / `desktop-mac-x64` / `desktop-win-x64`

目录名之外的内容一样：顶层是 `latest-*.yml` + 安装包 + blockmap（解包目录和
`builder-debug.yml` 在上传时已被排除，这里再跳一次双保险）。

**目录名不认识就报错**，不静默跳过 —— publish 靠 `release-desktop.py` 兜底三平台齐全，
但「名字打错导致目录被跳过」会让错误信息离病根很远。
"""

import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "app/desktop/dist-electron"

# 产物目录名 → 对外 target 名。和 ci.yml 的 `desktop-<label>`、release.yml 的
# `electron-<name>` 两份矩阵一一对应。
NAME_MAP = {
    "electron-darwin-arm64": "darwin-arm64",
    "electron-darwin-x64": "darwin-x64",
    "electron-win32-x64": "win32-x64",
    "desktop-mac-arm64": "darwin-arm64",
    "desktop-mac-x64": "darwin-x64",
    "desktop-win-x64": "win32-x64",
}

# 解包目录 —— 上传时已被 `!` 排除，这里是双保险（它们不是发布物，几百 MB）。
SKIP_DIRS = {"mac", "mac-arm64", "mac-x64", "win-unpacked", "linux-unpacked"}
SKIP_FILES = {"builder-debug.yml"}


def place(artifacts: Path, out: Path) -> list[tuple[str, str]]:
    """把 artifacts 下每个认识的目录摆进 out/<target>/。返回 (源名, target) 列表。"""
    placed: list[tuple[str, str]] = []
    for d in sorted(artifacts.iterdir()):
        if not d.is_dir():
            continue
        if d.name in SKIP_DIRS:
            continue
        if d.name not in NAME_MAP:
            raise SystemExit(f"不认识的产物目录名：{d.name}（认识：{sorted(NAME_MAP)}）")
        target = NAME_MAP[d.name]
        dst = out / target
        dst.mkdir(parents=True, exist_ok=True)
        for item in d.iterdir():
            if item.name in SKIP_FILES or item.name in SKIP_DIRS:
                continue
            to = dst / item.name
            if item.is_dir():
                shutil.copytree(item, to, dirs_exist_ok=True)
            else:
                shutil.copy2(item, to)
        placed.append((d.name, target))
        print(f"  {d.name} → {dst}")
    return placed


def self_test() -> int:
    """离线夹具：两套命名各摆一遍 + 不认识的名字必须报错。"""
    fails = 0

    def check(name: str, ok: bool, detail: str = "") -> None:
        nonlocal fails
        if ok:
            print(f"  ✓ {name}")
        else:
            fails += 1
            print(f"  ✗ {name} {detail}")

    work = Path(tempfile.mkdtemp(prefix="ov-place-"))

    # CI 命名（desktop-*）+ 解包目录 + builder-debug.yml 都得跳
    art = work / "art1"
    for name, target in NAME_MAP.items():
        d = art / name
        d.mkdir(parents=True)
        (d / "latest-mac.yml" if "darwin" in target else d / "latest.yml").write_text(
            f"version: 30.21.9\n", encoding="utf8"
        )
        (d / "pkg.bin").write_bytes(name.encode())
        (d / "builder-debug.yml").write_text("debug", encoding="utf8")
        (d / "mac").mkdir()  # 解包目录混进来也必须跳过
    out = work / "out1"
    placed = place(art, out)
    check("六个目录都映射对", sorted(t for _, t in placed) == sorted(NAME_MAP.values()), str(placed))
    check(
        "两套命名落到同一组 target",
        all((out / t / ("latest-mac.yml" if "darwin" in t else "latest.yml")).exists() for t in set(NAME_MAP.values())),
    )
    check("builder-debug.yml 被跳过", not any(out.rglob("builder-debug.yml")))
    check("解包目录被跳过", not any(out.rglob("mac")))
    check("包文件在", (out / "darwin-arm64" / "pkg.bin").read_bytes() == b"electron-darwin-arm64")

    # 不认识的名字必须报错（不能静默丢一个平台）
    bad = work / "art2"
    (bad / "desktop-linux-arm64").mkdir(parents=True)
    try:
        place(bad, work / "out2")
        check("不认识的目录名报错", False, "静默放过了 desktop-linux-arm64")
    except SystemExit:
        check("不认识的目录名报错", True)

    shutil.rmtree(work, ignore_errors=True)
    print("自检通过" if fails == 0 else f"{fails} 条未过")
    return 1 if fails else 0


def main() -> int:
    argv = sys.argv[1:]
    if "--self-test" in argv:
        return self_test()
    if len(argv) != 1:
        print(__doc__)
        return 2
    artifacts = Path(argv[0])
    if not artifacts.is_dir():
        print(f"产物根目录不存在：{artifacts}")
        return 2
    OUT.mkdir(parents=True, exist_ok=True)
    placed = place(artifacts, OUT)
    if not placed:
        print("artifacts 下没有任何可摆的目录")
        return 2
    for yml in sorted(OUT.glob("*/latest*.yml")):
        print(f"  清单：{yml.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
