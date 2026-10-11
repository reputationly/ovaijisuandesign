#!/usr/bin/env python3
"""算出下一个版本号并打 tag。

    python3 scripts/tag.py            # 看一眼算出来是几，不动仓库
    python3 scripts/tag.py --push     # 打 tag 并推送，触发 Release

## 版本号规则

发出去的号是三段 `30.21.N`。tag、存储目录、包名、清单和应用自报的版本用同一个。
`hiloOfficialVersion`（`3.0.21`）只记下参照应用的版本，不出现在 tag 上。
旧 tag `v3.0.21.N` 和 `v30.21.N` 算同一条线上的同一个迭代号。

四段 `3.0.21.N` 不是合法 semver，electron-updater 会直接拒绝。所以新 tag 不再用它。
"""

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

# 基线的读法只有一处，在 release.py 里。这里 import 而不是各写一份 ——
# 以前两处各读各的，改了一处忘了另一处，症状是 tag 和清单对不上而两边都绿。
from release import baseline  # noqa: E402
from versioning import encode, release_semver  # noqa: E402


def git(*args: str) -> str:
    return subprocess.run(
        ["git", *args], cwd=ROOT, check=True, capture_output=True, text=True
    ).stdout.strip()


def next_version(base: str, tags: list[str]) -> str:
    """当前发布线上已有的最大迭代号 +1。返回 `30.21.N`。

    旧 tag `v3.0.21.7` 和现 tag `v30.21.7` 算同一个迭代号。基线从 3.0.21 跟到
    3.0.22 时前缀变成 `30.22`，迭代号重新从 1 起。
    """
    prefix = encode(base).rsplit(".", 1)[0]
    used: list[int] = []
    for tag in tags:
        name = tag[1:] if tag.startswith("v") else tag
        try:
            semver = release_semver(name)
        except ValueError:
            continue
        head, _, build = semver.rpartition(".")
        if head == prefix and build.isdigit():
            used.append(int(build))
    return f"{prefix}.{max(used, default=0) + 1}"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--push", action="store_true", help="打 tag 并推送（会触发发版）")
    args = ap.parse_args()

    base = baseline()
    tags = git("tag", "--list").splitlines()
    ver = next_version(base, tags)
    tag = f"v{ver}"
    # 发布号本身就是三段 semver。这里再过一遍，编码规则坏了就在打 tag 前停。
    encoded = encode(base)

    same = sorted(t for t in tags if t.startswith(f"v{ver.rsplit('.', 1)[0]}.") or t.startswith(f"v{base}."))
    print(f"参照基线    {base}   (app/desktop/package.json 的 hiloOfficialVersion，编码 {encoded})")
    print(f"这条线已发  {' '.join(same) or '（还没有）'}")
    print(f"即将发布    {tag}")
    print(f"            tag、存储目录、包名、清单 version、app.getVersion() 都是 {ver}")

    if not args.push:
        print("\n（没加 --push，什么也没做）")
        return 0

    # 工作区脏着打 tag 的话，tag 指向的提交里没有你刚改的东西，
    # 而包是按 tag 构建的 —— 发出去的和你手上的不是一回事。
    #
    # **只查 tracked 改动。** 未跟踪的文件不在 tag 指向的那次提交里，也不会
    # 被 `stage-desktop-resources.mjs` 搬进包（它只搬白名单里的那几个目录），
    # 所以它们不构成「发出去的和我手上的不是一回事」。
    #
    # 之前用裸的 `git status --porcelain`，把未跟踪文件也算成脏 —— 结果是
    # `.claude/`、`.opencode-v2/` 这类每台机器各自一份的工具目录**把发版挡住**，
    # 而真正该拦的（改了已跟踪的文件）反而被淹没在噪音里。
    dirty = [ln for ln in git("status", "--porcelain", "--untracked-files=no").splitlines() if ln]
    if dirty:
        print("\n已跟踪的文件有未提交的改动，先提交再发版：", file=sys.stderr)
        for ln in dirty[:20]:
            print(f"  {ln}", file=sys.stderr)
        return 1
    untracked = git("status", "--porcelain").splitlines()
    if untracked:
        # 不拦，但要说一声 —— 万一里面有个该进包的东西被漏看了。
        print(f"（{len(untracked)} 个未跟踪项，不影响发版：{', '.join(l[3:] for l in untracked[:5])}"
              + ("…" if len(untracked) > 5 else "") + "）")
    if git("rev-parse", "HEAD") != git("rev-parse", "@{u}"):
        print("\n本地和远端不一致，先 push", file=sys.stderr)
        return 1

    git("tag", "-a", tag, "-m", tag)
    git("push", "origin", tag)
    print(f"\n{tag} 已推送，CI 开始构建")
    return 0


if __name__ == "__main__":
    sys.exit(main())
