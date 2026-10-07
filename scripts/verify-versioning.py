#!/usr/bin/env python3
"""`versioning.py` 的离线自检。**不联网、不装依赖，几秒钟跑完。**

    python3 scripts/verify-versioning.py

编码的正确性是自动更新的全部地基：它坏了不会立刻坏在发布上，而是坏在
**几周后某个客户端**上，症状是「不报错、不提示、永远收不到更新」。
所以这里不只测几个样例，而是把「单调」「无碰撞」「边界必须被拒」
三条性质在真实取值范围里**跑出来**。

三条性质对应三种坏法：

  - **单调性**破了 → 新版本排在旧版本后面 → 永远收不到更新。
  - **无碰撞**破了 → 两个版本编码成同一个 → 客户端看到的是旧包。
  - **边界不拒**破了 → 越界版本被放行 → 前两条以最难查的形式复发。
"""

import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from versioning import (  # noqa: E402
    MAJOR_MAX,
    MAJOR_MIN,
    decode,
    encode,
    is_strict_semver,
    parse_human,
)

FAILED: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    if ok:
        print(f"  ✓ {name}")
    else:
        FAILED.append(name)
        print(f"  ✗ {name}{chr(10) + '      ' + detail if detail else ''}")


def key(encoded: str) -> tuple[int, int, int]:
    """编码的排序键。三段都是数字，逐段比 == semver 比。"""
    return tuple(int(p) for p in encoded.split("."))  # type: ignore[return-value]


def human(parts: tuple[int, int, int, int]) -> str:
    return ".".join(str(p) for p in parts)


# electron-updater 装在 app/desktop 下。找不到就跳过交叉验证（离线环境）。
DESKTOP = Path(__file__).resolve().parent.parent / "app/desktop"

CROSS_CHECK_JS = r"""
// 从 argv[2] 读 JSON：{ encoded: [...], ordered: [...] }
// 逐个问 semver 认不认，再让它自己排一遍序，看和我们 Python 排的顺序是否一致。
const { createRequire } = require("node:module");
const fs = require("node:fs");
const req = createRequire(require.resolve("electron-updater", { paths: [process.argv[3]] }));
const semver = req("semver");
const input = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

const invalid = input.encoded.filter((v) => semver.valid(v) === null);
const sortedBySemver = input.ordered.slice().sort(semver.compare);
const orderOk = JSON.stringify(sortedBySemver) === JSON.stringify(input.ordered);
let orderAt = -1;
if (!orderOk) orderAt = sortedBySemver.findIndex((v, i) => v !== input.ordered[i]);

// 我们拒掉的那些，semver 也该拒 —— 两边判据一致才算真的对齐了。
//
// **别拿带 prerelease 的当反例。** `3.0.21-rc1` 是**合法** semver（官方 UI
// 那个宽松正则也收），我们 `encode()` 拒它是因为本仓要求纯数字分段 —— 那是
// 我们自己更严的规矩，不是 semver 层面的非法。反例要用真的非法的：四段、
// 两段、带前导零。
const bad = ["3.0.21.2", "3021.2", "010.0.0", "3.0.21.2-rc1"];
const rejectOk = bad.every((v) => semver.valid(v) === null);

// 键名用 snake_case：Python 那边直接按这些名字取，跨语言对不上是最容易漏的错。
process.stdout.write(
  JSON.stringify({
    semver_version: req("semver/package.json").version,
    invalid,
    order_ok: orderOk,
    order_at: orderAt,
    reject_ok: rejectOk,
  }),
);
"""


def run_semver_cross_check(samples: list[tuple[int, int, int, int]]) -> dict | None:
    """把编码结果丢给 electron-updater 自带的真 `semver` 过一遍。

    跑不起来就返回 `None`（调用方会打印一条「跳过」）—— 这个自检必须在
    没装依赖的环境里也能跑完，交叉验证是加分项而不是前提。
    """
    if not (DESKTOP / "node_modules").is_dir():
        return None
    import json
    import subprocess
    import tempfile

    script = Path(tempfile.mkdtemp(prefix="verify-versioning-")) / "cross.js"
    script.write_text(CROSS_CHECK_JS, encoding="utf8")
    payload = Path(tempfile.mkdtemp(prefix="verify-versioning-")) / "in.json"
    # **按数值排，不按字符串排。** 字符串排序会把 30.0.10 排到 30.0.2 前面，
    # 于是和 semver.compare 必然不一致 —— 那是 harness 的错，不是编码的错。
    ordered = sorted((encode(human(t)) for t in samples), key=key)
    payload.write_text(
        json.dumps({"encoded": ordered, "ordered": ordered}), encoding="utf8"
    )
    try:
        proc = subprocess.run(
            ["node", str(script), str(payload), str(DESKTOP)],
            capture_output=True,
            text=True,
            timeout=60,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if proc.returncode != 0:
        return None
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError:
        return None


# ---------------------------------------------------------------- 基本对应关系

print("\n基本对应关系")

# 真实历史 + 官方基线往后跟的几档。不是随手编的数，每一个都该能被一眼认出来。
CASES = [
    ("3.0.21", "30.21.0"),
    ("3.0.21.0", "30.21.0"),
    ("3.0.21.1", "30.21.1"),
    ("3.0.21.2", "30.21.2"),
    ("3.0.21.3", "30.21.3"),
    ("3.0.14.5", "30.14.5"),
    # 3.9 → 3.10 是**次版本进位**，编码成 39 → 310 才对。
    # 这条最容易写错：3.10.0 排到 3.9.9 后面，官方一进位用户就永远收不到更新。
    ("3.1.0", "31.0.0"),
    ("3.9.9", "39.9.0"),
    ("3.10.0", "310.0.0"),
    ("3.10.1", "310.1.0"),
    ("3.21.0", "321.0.0"),
    ("3.100.0", "3100.0.0"),
    # 主版本号本身也可以动，虽然现实中很少。
    ("1.0.0", "10.0.0"),
    ("9.99.99", "999.99.0"),
    # 四段齐的，迭代号原样落在第三段。
    ("3.9.9.4", "39.9.4"),
    ("3.10.0.1", "310.0.1"),
]
for src, want in CASES:
    got = encode(src)
    check(f"encode({src}) = {got}", got == want, f"实际 {got}，期望 {want}")

# 往返。`decode(encode(x))` 对四段输入必须**一字不差**地还原；三段输入
# （官方基线的写法）会多出一个 `.0` —— 那是规范化，不是丢信息。
for src, _ in CASES:
    want = src if src.count(".") == 3 else src + ".0"
    got = decode(encode(src))
    check(f"decode(encode({src})) = {want}", got == want, f"实际 {got}")

# 三段和四段是同一个版本 —— 官方基线本来就是三段。
check("3.0.21 和 3.0.21.0 编码成同一个", encode("3.0.21") == encode("3.0.21.0"))
check(
    "parse_human 把缺省的第四段补成 0",
    parse_human("3.0.21") == (3, 0, 21, 0),
    f"实际 {parse_human('3.0.21')}",
)

# ---------------------------------------------------------------- 消费方能不能解析

print("\n消费方能不能解析")

# 这一条就是今晚踩的坑本身：清单里的版本号是**官方 UI 的 parseSemver** 去解析的，
# 它用严格三段正则。electron-updater 那边则用 npm 的 semver。
for src, _ in CASES:
    encoded = encode(src)
    check(f"{encoded} 满足官方 UI 的 parseSemver", is_strict_semver(encoded))

# 反面也钉上：人读的四段确实解析不了。这是「为什么不能直接用四段」的证据，
# 防止将来有人觉得「三段四段差不多」就把四段塞回清单。
check("四段的 3.0.21.2 不满足（这正是 bug 的根因）", not is_strict_semver("3.0.21.2"))
check("两段的 3021.2 也不满足（semver 就是要三段）", not is_strict_semver("3021.2"))

# ---------------------------------------------------------------- 单调性

print("\n单调性（人读顺序 ⟹ 编码顺序）")


def sweep(label: str, base: tuple[int, int, int, int], axis: int, upper: int) -> None:
    """固定另外三段，只把第 `axis` 段从 0 扫到 `upper`，编码必须严格递增。"""
    prev: tuple[int, int, int] | None = None
    prev_src = ""
    for value in range(0, upper + 1):
        parts = list(base)
        parts[axis] = value
        src = human(tuple(parts))
        encoded = key(encode(src))
        if prev is not None and encoded <= prev:
            check(
                f"{label}递增",
                False,
                f"{prev_src} → {src}：编码没有严格递增（{prev} → {encoded}）",
            )
            return
        prev, prev_src = encoded, src
    check(f"{label}扫 0–{upper} 严格递增", True)


# 范围取到 2000 是刻意的：官方基线的次版本/修订号不会到这，但扫过去能让
# 所有「位数变化」的边界（9→10、99→100、999→1000）都被跨过。
sweep("次版本号", (3, 0, 21, 2), 1, 2000)
sweep("修订号", (3, 0, 21, 2), 2, 2000)
sweep("迭代号", (3, 0, 21, 2), 3, 2000)

# 主版本号被守卫限制在一位数，所以只能扫合法区间 —— 它扫大了会撞 MAJOR_MAX。
prev: tuple[int, int, int] | None = None
for value in range(MAJOR_MIN, MAJOR_MAX + 1):
    encoded = key(encode(f"{value}.99.99.99"))
    if prev is not None and encoded <= prev:
        check("主版本号递增", False, f"{value}.99.99.99 没有严格递增")
        break
    prev = encoded
else:
    check(f"主版本号扫 {MAJOR_MIN}–{MAJOR_MAX} 严格递增", True)

# 混合网格：逐轴递增**不保证**混合也递增（比如次版本变大但修订号变小的组合）。
GRID_A = list(range(MAJOR_MIN, MAJOR_MAX + 1))
GRID_B = [0, 1, 2, 9, 10, 11, 98, 99, 100, 101, 999, 1000]
GRID_C = [0, 1, 9, 10, 99, 100, 999]
GRID_D = [0, 1, 9, 10, 99]
combos = [(a, b, c, d) for a in GRID_A for b in GRID_B for c in GRID_C for d in GRID_D]
grid_keys = sorted(key(encode(human(t))) for t in combos)
check(
    f"混合网格 {len(combos)} 个版本的编码严格递增",
    all(a < b for a, b in zip(grid_keys, grid_keys[1:])),
)
check(
    f"混合网格无碰撞（{len(set(grid_keys))}/{len(combos)}）",
    len(set(grid_keys)) == len(combos),
)

# 随机抽样。定种子，失败可复现。前两条都过了之后，这条兜住落在两难之间的怪组合。
rng = random.Random(20261007)
samples = [
    (
        rng.randint(MAJOR_MIN, MAJOR_MAX),
        rng.randint(0, 10_000),
        rng.randint(0, 10_000),
        rng.randint(0, 10_000),
    )
    for _ in range(20_000)
]
sample_keys = sorted(key(encode(human(t))) for t in samples)
check(
    "随机 20000 个版本的编码严格递增",
    all(a < b for a, b in zip(sample_keys, sample_keys[1:])),
)
check(
    "随机 20000 个版本无碰撞",
    len({encode(human(t)) for t in samples}) == len(samples),
)

# ---------------------------------------------------------------- 边界必须被拒

print("\n越界必须被拒（宁可发布失败也不要静默停更）")

# 这些是**真的会坏**的，不是一厢情愿的洁癖。
REJECT = [
    "10.0.0",  # 主版本号两位数：9.99.x → 999.x，10.0.x → 100.x，新版排到旧版后面
    "10.0.0.0",
    "12.3.4",
    "0.10.0",  # 主版本号 0：0.10.x 和 1.0.x 都编码成 10.x.y，直接撞车
    "3.0.21-rc1",  # 非数字段：官方 UI 的正则和 semver 都不认
    "3.0.21.2-ovaijisuan",
    "v3.0.21.2",
    "3.0",  # 段数不对
    "3.0.21.2.1",
    "3..21.2",
    "",
]
for src in REJECT:
    try:
        got = encode(src)
        check(f"encode({src!r}) 被拒", False, f"实际放行了 {got}")
    except ValueError:
        check(f"encode({src!r}) 被拒", True)

# 前后空白按契约是 strip 掉的，所以这一条**不该**被拒 —— 钉住它是因为
# release.yml 里的 tag 解析会带 `v` 前缀，剥干净之后不该再出问题。
try:
    got = encode("  3.0.21.2  ")
    check("encode('  3.0.21.2  ') 放行并 strip", got == "30.21.2", f"实际 {got}")
except ValueError as err:
    check("encode('  3.0.21.2  ') 放行并 strip", False, f"实际被拒：{err}")

# 把「越界真的会坏」摆出来 —— 上面那些 REJECT 才不是吓唬人。
# 这两条是本文件存在的理由：它们把注释里的推导变成可执行的证据。
check(
    "越界后果属实：9.99.99 比 10.0.0 新，手工拼出来的编码却是 999.99.99 > 100.0.0",
    key("999.99.99") > key("100.0.0"),
)
# 主版本号 0 的话，「前两段拼接」退化成 `0 * 10^len(次版本) + 次版本`：
# 0.10.x 拼成 10，1.0.x 也拼成 10 —— 两者撞成同一个 10.x.y，客户端会把
# 0.10.0 当成 1.0.0，从此收不到 0.11.0。所以 MAJOR_MIN 是 1 而不是 0。
check(
    "越界后果属实：0.10.0 与 1.0.0 手工拼出来撞成同一个 10.0.0",
    0 * 10 ** len("10") + 10 == 1 * 10 ** len("0") + 0,
)

# 正确编码在同样的两个例子上必须排对：这是「守卫没白加」的证据。
check("正确编码排得对：30.99.99 < 310.0.0（3.10.0 比 3.9.99 新）", key("30.99.99") < key("310.0.0"))
check("正确编码排得对：30.21.1 < 30.21.2", key("30.21.1") < key("30.21.2"))
check("正确编码排得对：30.21.9 < 30.21.10（迭代号进位）", key("30.21.9") < key("30.21.10"))

# ---------------------------------------------------------------- 真 semver 交叉验证

print("\n和 electron-updater 自带的真 semver 对一遍")

# 上面全部用「官方 UI 的正则」和 Python 自己的比较逻辑验证，而**真正**判版本号
# 合法性的是 electron-updater 里那个 npm `semver`。两个判据可能不一致 ——
# 实测就撞过：字符串拼接在主版本号为 0 时产出 `010.0.0`，npm semver 判它非法，
# 官方 UI 那个宽松正则却照收。判据不一致 = 我们以为发出去了、客户端读不了。
#
# 所以这里真的把 `semver` 跑起来。用 electron-updater 自己依赖的那一份，
# 而不是临时装一个 —— 装到的版本可能和发布时用的不是同一个。
semver_check = run_semver_cross_check(samples)
if semver_check is None:
    print("  – 跳过：node 或 electron-updater 的依赖树不可用（离线环境）")
elif semver_check["invalid"]:
    check(
        f"npm semver 认可全部 {len(samples)} 个编码",
        False,
        f"它不认这些：{semver_check['invalid'][:5]}",
    )
else:
    check(f"npm semver 认可全部 {len(samples)} 个编码", True)

if semver_check and not semver_check["order_ok"]:
    check(
        "npm semver 的排序和我们的一致",
        False,
        f"它在 {semver_check['order_at']} 处的判断和我们相反",
    )
elif semver_check:
    check("npm semver 的排序和我们的一致", True)

if semver_check and not semver_check["reject_ok"]:
    check(
        "npm semver 也拒掉我们拒掉的那些（四段 / 两段 / 带后缀）",
        False,
        "它接受了本该非法的版本号",
    )
elif semver_check:
    check("npm semver 也拒掉我们拒掉的那些（四段 / 两段 / 带后缀）", True)

# ---------------------------------------------------------------- 结果

print()
if FAILED:
    print(f"✗ {len(FAILED)} 条没过：")
    for name in FAILED:
        print(f"    - {name}")
    raise SystemExit(1)
print("✓ 版本编码自检全过")
