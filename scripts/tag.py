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

前三段是**基线**，写在 `app/desktop/package.json` 的 `hiloOfficialVersion`，
只在跟进官方新版本时手改。第四段是本仓自己的迭代号，每发一版 +1，
由这个脚本算。

## 四段只是「人读」的那一半

`tag.py` 算出来的四段会出现在 tag、桶里的存储目录、包文件名上 ——
全是给人看的。而 `app/desktop/package.json` 的 `version` 那一栏是**另一回事**：
它必须是编码后的三段 semver（`3.0.21.3` → `30.21.3`），因为
`electron-updater` 拿更新清单里的 `version:` 和 `app.getVersion()` 比 semver，
四段会被直接拒掉（真跑过：`does not have a valid semver version: "3.0.21.2"`）。

编码规则、单调性证明、以及「越界就静默停更」的后果，都在
**`scripts/versioning.py`** —— 整个仓库只有那一个文件知道怎么编码。
`tag.py` 只管人读的四段，不参与编码。

**版本号必须是纯数字分段。** 官方 UI 用严格三段正则解析它
（`out/official-ui/assets/index-*.js` 的 `parseSemver`），我们自己也拒
非数字段：带后缀的版本号（`3.0.12-ovaijisuan-20260909`）会让客户端
**静默地永远收不到更新** —— 不报错、不提示，只是永远认为自己是最新的。
"""

import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

# 基线的读法只有一处，在 release.py 里。这里 import 而不是各写一份 ——
# 以前两处各读各的，改了一处忘了另一处，症状是 tag 和清单对不上而两边都绿。
from release import baseline  # noqa: E402
from versioning import encode  # noqa: E402


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
    # 算完先问一遍编码能不能做。**在这里炸掉，好过在 CI 出完 800MB 的包之后
    # 炸在 release-desktop.py 里** —— 那时候三个平台的钱已经花了。
    encoded = encode(ver)

    same_base = sorted(t for t in tags if t.startswith(f"v{base}"))
    print(f"官方基线    {base}   (app/desktop/package.json 的 hiloOfficialVersion)")
    print(f"本基线已发  {' '.join(same_base) or '（还没有）'}")
    print(f"即将发布    {tag}")
    # 印出来是为了**肉眼对得上**：人读四段在 tag 和存储路径上，编码三段在包文件名
    # 和更新清单上。两者不同是设计，不是笔误。
    print(f"清单/包名   {encoded}   (三段 semver；客户端靠它比大小)")
    print(f"            set-desktop-version.py 会把 {encoded} 写进 package.json 的 version")

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
