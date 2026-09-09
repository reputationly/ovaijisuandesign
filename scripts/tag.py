#!/usr/bin/env python3
"""算出下一个版本号并打 tag。

    python3 scripts/tag.py            # 看一眼算出来是几，不动仓库
    python3 scripts/tag.py --push     # 打 tag 并推送，触发 Release

## 版本号规则

四段 `MAJOR.MINOR.PATCH.BUILD`：

    3.0.12   .3
    └──┬──┘   └┬┘
   官方 MiniMax   本仓的迭代号
   Design 的版本

前三段是**基线**，写在 `Cargo.toml` 里，只在跟进官方新版本时手改。
第四段是本仓自己的迭代号，每发一版 +1，由这个脚本算。

为什么基线不能直接写四段：`3.0.12.1` 不是合法 semver，cargo 会拒绝解析
整个 workspace。所以基线在 Cargo.toml，完整版本号在 tag 里，编译时通过
`OVAIJISUAN_VERSION` 注进二进制。

**版本号必须是纯数字分段。** `update.rs` 的 `is_newer()` 逐段解析比较，
非数字段一律按 0 —— 用 `3.0.12-ovaijisuan-20260909` 那种风格的话，客户端会
**静默地永远收不到更新**：不报错、不提示，只是永远认为自己是最新的。
"""

import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def baseline() -> str:
    for line in (ROOT / "Cargo.toml").read_text(encoding="utf8").splitlines():
        if line.startswith("version = "):
            return line.split('"')[1]
    raise SystemExit("Cargo.toml 里找不到 version")


def git(*args: str) -> str:
    return subprocess.run(
        ["git", *args], cwd=ROOT, check=True, capture_output=True, text=True
    ).stdout.strip()


def next_version(base: str, tags: list[str]) -> str:
    """基线下已有的最大迭代号 +1。

    只看**本基线**的 tag —— 基线从 3.0.11 跟到 3.0.12 时迭代号要从 1 重新起，
    拿全局最大值的话会跳号（3.0.11.7 → 3.0.12.8），看着像丢了七个版本。
    """
    pat = re.compile(r"^v" + re.escape(base) + r"\.(\d+)$")
    used = [int(m.group(1)) for t in tags if (m := pat.match(t))]
    return f"{base}.{max(used, default=0) + 1}"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--push", action="store_true", help="打 tag 并推送（会触发发版）")
    args = ap.parse_args()

    base = baseline()
    tags = git("tag", "--list").splitlines()
    ver = next_version(base, tags)
    tag = f"v{ver}"

    same_base = sorted(t for t in tags if t.startswith(f"v{base}"))
    print(f"官方基线    {base}   (Cargo.toml)")
    print(f"本基线已发  {' '.join(same_base) or '（还没有）'}")
    print(f"即将发布    {tag}")

    if not args.push:
        print("\n（没加 --push，什么也没做）")
        return 0

    # 工作区脏着打 tag 的话，tag 指向的提交里没有你刚改的东西，
    # 而包是按 tag 构建的 —— 发出去的和你手上的不是一回事。
    if git("status", "--porcelain"):
        print("\n工作区有未提交的改动，先提交再发版", file=sys.stderr)
        return 1
    if git("rev-parse", "HEAD") != git("rev-parse", "@{u}"):
        print("\n本地和远端不一致，先 push", file=sys.stderr)
        return 1

    git("tag", "-a", tag, "-m", tag)
    git("push", "origin", tag)
    print(f"\n{tag} 已推送，CI 开始构建")
    return 0


if __name__ == "__main__":
    sys.exit(main())
