#!/usr/bin/env python3
"""四段版本号 ↔ 三段 semver 的编码层。**整个仓库只有这一个文件知道怎么编码。**

## 为什么要编码

人读的四段 `3.0.21.2`（前三段跟官方 MiniMax Design，第四段是本仓迭代号）
**不是合法 semver**，而它必须能被当 semver 比对。真跑过一次 electron-updater：

    [info] Checking for update
    [err] Error: …the latest version (from update server) does not have a
          valid semver version: "3.0.21.2"
       at MacUpdater.isUpdateAvailable (AppUpdater.js:342)

清单读到了、路径也对（稳定指针的修复是有效的），**唯独版本号被拒**。
两段 `3021.2` 也不行 —— semver 就是要三段。

界面**自己**也用严格三段正则解析这两个版本（`app/renderer/src/infra/from-vendor.js`
里的 `parseSemver`：`/^(\\d+)\\.(\\d+)\\.(\\d+)…/`）。四段会解析成 `null`，
于是 `compareSemver()` 恒返回 0 ——「更新详情」里算不出落后了几个版本，
error 阶段的横幅判断也直接走不通。

所以每个版本号有两个形态，**必须同时存在且严格对应**：

|      | 形态      | 谁在用                                                          |
| ---- | --------- | --------------------------------------------------------------- |
| 发布 | `30.21.2`  | git tag、桶里的存储目录、dmg / exe 文件名、`package.json` 的 `version`、`latest-*.yml` 的 `version:`、`app.getVersion()` |
| 旧 tag | `3.0.21.2` | 只在读旧 tag 时编码成上面那一栏，不再拿来发新版 |

编码规则：**前两段拼成一个数字，第四段缺省 0。**

    3.0.21    → 30.21.0
    3.0.21.1  → 30.21.1
    3.0.21.2  → 30.21.2
    3.1.0     → 31.0.0
    3.10.0    → 310.0.0        # 39 < 310，次版本进位也排得对

**两边必须同时改，只改一边是最难查的那种坏。** 清单写编码值、应用自报人读值
→ `30.21.2 > 3.0.21` 恒成立 → 用户每次点「检查更新」都被告知有新版，装完还是。
`release-desktop.py`（断言 electron-builder 出包时的版本）和 CI 各有一道关卡
专门盯这个，见 `manifest_version()` 和 release.yml 的 prepare job。

## 唯一的适用边界：主版本号必须是一位数

`concat(A, B) = A * 10^len(B) + B`。A 固定时它对 B 严格递增；不同位数落在互不
重叠的区间（`[10,99]` / `[100,999]` / `[1000,9999]`）。所以**只要 A 是一位数，
编码严格单调且无碰撞**，次版本 / 修订号 / 迭代号可以任意大。

A 变成两位数就塌了：`9.99.x` → `999.x`，而 `10.0.x` → `100.x` —— **新的反而更小**，
于是 `10.0.0` 永远收不到更新。症状和当初四段一模一样：不报错、不提示，只是永远
认为自己是最新的。所以 `encode()` **硬拒**主版本号 0 和 ≥ 10，宁可让发布失败，
也不要静默停更。`0` 也一并拒掉：它会和 `1.x` 在「前两段拼接」上撞车
（`0.10.x` 和 `1.0.x` 都编码成 `10.x.y`）。

真到官方跳到 10.x 那天，要换的是**一套新的编码**，不是放宽这个检查。

    python3 scripts/verify-versioning.py    # 离线自检：单调性 / 无碰撞 / 边界拒绝
"""

import re
import sys

# 人读版本的形状：三段或四段纯数字。第四段缺省 0。
HUMAN_RE = re.compile(r"^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$")

# **界面的那个正则**（`app/renderer/src/infra/from-vendor.js` 的 `parseSemver`，
# 一字不改地抄过来）。这里不用 npm 的 semver 判，是因为真正解析这两个版本号的
# 就是这份代码 —— 判据必须和消费方一致，否则「我们说合法、它说不合法」的结果
# 还是收不到更新。
STRICT_SEMVER_RE = re.compile(r"^\d+\.\d+\.\d+(?:-[\w.]+)?$")

# 主版本号的可用区间。见本文件开头关于单调性的推导。
MAJOR_MIN = 1
MAJOR_MAX = 9


def parse_human(version: str) -> tuple[int, int, int, int]:
    """人读版本号 → `(major, minor, patch, build)`。第四段缺省 0。

    `3.0.21` 和 `3.0.21.0` 解析结果相同 —— 官方基线本来就是三段，
    而完整版本号永远是四段，两种写法要能当同一个版本处理。
    """
    match = HUMAN_RE.match((version or "").strip())
    if not match:
        raise ValueError(f"版本号必须是三段或四段纯数字：{version!r}")
    return tuple(int(g) if g else 0 for g in match.groups())  # type: ignore[return-value]


def encode(version: str) -> str:
    """人读版本号 → 机器 semver。`3.0.21.2` → `30.21.2`。

    越界直接 `ValueError`：调用方要么用 `encode_or_die()`（发布路径，
    要看得见的失败），要么自己处理（纯函数用途，比如自检脚本）。
    """
    major, minor, patch, build = parse_human(version)
    if not MAJOR_MIN <= major <= MAJOR_MAX:
        raise ValueError(
            f"主版本号 {major} 不在 {MAJOR_MIN}–{MAJOR_MAX} 区间："
            f"编码的正确性完全依赖「主版本号是一位数」。"
            f"9.99.x 会编码成 999.x，而 10.0.x 会编码成 100.x —— "
            f"**新版本排在旧版本后面**，客户端会静默地永远收不到更新"
            f"（不报错、不提示，只是永远认为自己是最新的）。"
            f"官方真跳到 10.x 时要换一套编码，不是放宽这个检查。"
        )
    # **按数值拼，不按字符串拼。** 字符串拼接在主版本号为 0 时会产出带前导零的
    # `010.0.0`：npm 的 semver 判它非法，而官方 UI 那个宽松正则照单全收 ——
    # 两边判据不一致，正是最坏的一种局面（我们以为发出去了，客户端读不了）。
    head = major * 10 ** len(str(minor)) + minor
    return f"{head}.{patch}.{build}"


def decode(version: str) -> str:
    """机器 semver → 人读四段。`30.21.2` → `3.0.21.2`。

    **只在需要给人看的时候用**（日志、自检）。反过来靠它没有意义 ——
    存储路径、tag 用的一直是人读版本。

    之所以拆得回来（拼接是无损的），正是因为 `encode()` 要求主版本号一位数：
    拼起来的那一串里第一位永远是主版本号。
    """
    parts = (version or "").strip().split(".")
    if len(parts) != 3 or not all(p.isdigit() for p in parts):
        raise ValueError(f"编码版本号必须是三段纯数字：{version!r}")
    head, patch, build = parts
    return f"{head[0]}.{head[1:]}.{patch}.{build}"


def is_strict_semver(version: str) -> bool:
    """这个版本号能被官方 UI 的 `parseSemver` 解析吗。"""
    return bool(STRICT_SEMVER_RE.match((version or "").strip()))


def release_semver(version: str) -> str:
    """发布用的三段版本。`30.21.8` 原样返回；旧的 `3.0.21.8` 编码成 `30.21.8`。

    第一段大于 9 的三段号已经是发布版本，不能再编码：`30.21.8` 再编一次会因为
    主版本号越界被拒绝。第一段是一位数的（`3.0.21` / `3.0.21.8`）仍走 `encode()`。
    """
    text = (version or "").strip()
    if re.fullmatch(r"\d+\.\d+\.\d+", text) and int(text.split(".", 1)[0]) > MAJOR_MAX:
        if not is_strict_semver(text):
            raise ValueError(f"发布版本号不是三段 semver：{text!r}")
        return text
    return encode(text)


def release_semver_or_die(version: str, where: str = "") -> str:
    """`release_semver()`，失败时停掉发布。"""
    try:
        got = release_semver(version)
    except ValueError as err:
        prefix = f"{where}：" if where else ""
        print(f"✗ {prefix}{err}", file=sys.stderr)
        raise SystemExit(1)
    if not is_strict_semver(got):
        print(
            f"✗ {where or '版本号'}：{version} 得到 {got!r}，"
            f"但不满足三段 semver，客户端会判为非法",
            file=sys.stderr,
        )
        raise SystemExit(1)
    return got


def encode_or_die(version: str, where: str = "") -> str:
    """`encode()`，但失败时 `SystemExit` —— 发布路径上失败要看得见、要停住。

    末尾那道 `is_strict_semver()` 断言看着多余（编码器是唯一的生产者），
    但它防的是**编码器本身被改坏**：那种情况下这里拦住，总好过发出去一版
    所有客户端都判为非法、于是永远收不到更新的包。
    """
    try:
        encoded = encode(version)
    except ValueError as err:
        prefix = f"{where}：" if where else ""
        print(f"✗ {prefix}{err}", file=sys.stderr)
        raise SystemExit(1)
    if not is_strict_semver(encoded):
        print(
            f"✗ {where or '版本号'}：{version} 编码成 {encoded!r}，"
            f"但不满足官方 UI 的三段 semver 规则 —— 发出去客户端会判为非法",
            file=sys.stderr,
        )
        raise SystemExit(1)
    return encoded
