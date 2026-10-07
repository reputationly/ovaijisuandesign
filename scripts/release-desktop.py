#!/usr/bin/env python3
"""新栈（Electron + NestJS）产物的发布。

和 `scripts/release.py` 共用同一套发布源机制（`SOURCES` / `configured()` /
`credz()`），**所以 OBS 的事不需要在这里再写一遍**：那边配齐了 `OBS_*` 就发 OBS，
没配就只发 R2 —— 语义和旧栈一模一样。

    python3 scripts/release-desktop.py --layout-only     # 只把产物摆进 dist/ 并重写指针
    python3 scripts/release-desktop.py --publish          # 摆好 + 上传 + 回读校验

## 产物形状和旧栈完全不同

旧栈发的是 `tar.gz`（一个 Rust 二进制 + 静态产物打一个包），指针是自定义的
`latest.json`。新栈是 electron-builder 的标准三件套：

    mac-arm64/  蒜狸小助手-30.21.2-arm64.dmg  +  .dmg.blockmap  +  latest-mac.yml
    mac-x64/    蒜狸小助手-30.21.2.dmg         +  .dmg.blockmap  +  latest-mac.yml
    win-x64/    蒜狸小助手-30.21.2-Setup.exe  +  .exe.blockmap  +  latest.yml

指针沿用 electron-updater 的 `latest-*.yml` 格式 —— 消费方（`electron-updater`、
或任何按这个格式读的工具）不用改就能认。

**`--version` 收的是人读四段（`3.0.21.2`），而文件名和清单里的版本是编码值
（`30.21.2`）。** 这不是笔误 —— 四段不是合法 semver，而清单的 `version:` 必须能被
`electron-updater` 和官方 UI 当 semver 解析。编码规则和它的单调性证明在
`scripts/versioning.py`，这里只负责断言 electron-builder 出的清单已经是编码值。

**包名不带 sha，按版本存死。** 和旧栈不同，这里保留 electron-builder 的原始命名：
`latest-*.yml` 里引用的就是它，**改名就得连 yml 一起改**，而 yml 是我们改地址的 ——
多一处可以出错的地方。真要防「覆盖发布」，靠的是「版本号只增」而不是文件名。

**打包阶段 electron-builder 自己写的 `latest-*.yml` 必须丢掉**（里面是占位域名），
由本脚本按每个源自己的公开域名重新生成地址。概念和旧栈丢掉 `latest.json` 完全一样
（`release.yml` 里那段注释）。
"""

import argparse
import base64
import hashlib
import json
import os
import re
import shutil
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

# 复用旧栈那套发布源 / 凭据 / 前置检查 / 回读校验。一个源配齐就发一个，
# 全都没配齐就硬失败 —— 见 release.py 的 configured()。
from release import (  # noqa: E402
    PRODUCT,
    SOURCES,
    configured,
    creds,
    endpoint,
    http_get,
    preflight,
    s3_upload,
    verify,
)
from versioning import encode_or_die  # noqa: E402

DIST = ROOT / "dist-desktop"

# 公网回读的重试轮数。CDN 对刚上传的对象不是立刻可见的（先命中旧的 miss 缓存）。
PUBLIC_READ_ATTEMPTS = 5
ELECTRON_OUT = ROOT / "app/desktop/dist-electron"

# electron-builder 的输出目录名 → 我们对外的 target 名。
# **和旧栈的 target 命名保持一致**（darwin-arm64 / darwin-x64 / win32-x64）：
# 用户的升级检查、监控、脚本都认这一套，换名字等于让所有下游失效。
# electron-builder 只出一种架构时目录就叫 `mac` 而不是 `mac-x64`，两种都要认。
#
# ## 这张表现在只用于「兼容单平台布局」，不再是定位手段
#
# 三个平台各自跑 electron-builder、各自写出**同名**的更新清单
# （mac 两份都叫 `latest-mac.yml`）。以前三个 runner 的产物被堆进同一个
# `dist-electron/` 顶层，于是三份同名清单互相覆盖，而 `sorted()` 决定了最后
# 赢的是 `darwin-x64` 那份 —— 后果是 `darwin-arm64` 发布了指向 x64 包名的
# 清单，而那个包从没进过 `darwin-arm64/`，**arm64 Mac 点更新直接 404**。
#
# 现在 publish job 按 target 分目录摆（`dist-electron/<target>/`），本脚本也
# 只从 `<target>/` 里取。这张表留给「传进来的是单平台目录」的老调用方式。
DIR_TO_TARGET = {
    "mac-arm64": "darwin-arm64",
    "mac-x64": "darwin-x64",
    "mac": "darwin-x64",
    "win-x64": "win32-x64",
    "win-unpacked": "win32-x64",
    "win": "win32-x64",
}

# 每个 target 需要哪几个文件。少一个都不能发 —— 指针指向缺件就是 404。
NEEDS = {
    "darwin-arm64": ("latest-mac.yml", ".dmg"),
    "darwin-x64": ("latest-mac.yml", ".dmg"),
    "win32-x64": ("latest.yml", ".exe"),
}


def fail(msg: str) -> "None":
    print(f"\n✗ {msg}", file=sys.stderr)
    raise SystemExit(1)


def display_path(p: Path) -> str:
    """能写成仓库相对路径就写相对路径，写不了就用绝对路径。

    别直接 `p.relative_to(ROOT)` —— 那个假设了 DIST 一定在仓库内，
    一旦不是（比如自检用临时目录）就抛 `ValueError`，而报错出现在
    「已经摆完盘、正要打日志」的地方，看着像前面全白干了。
    """
    try:
        return str(p.relative_to(ROOT))
    except ValueError:
        return str(p)


def electron_out(target: str) -> Path:
    """这个 target 的产物在 `dist-electron/` 下的哪一层。

    **主形态是 `dist-electron/<target>/`** —— 三个平台各有自己的目录，清单和
    包都在一起（publish job 已经摆好了）。见 `DIR_TO_TARGET` 上面那段：
    共用一层会被同名的清单互相覆盖。

    找不到时退回单平台布局（`dist-electron/` 顶层，或 electron-builder 自己的
    目录名），这样本地 `--layout-only` 对着一次 mac 出包也能跑。
    """
    own = ELECTRON_OUT / target
    if own.is_dir():
        return own
    for name, mapped in DIR_TO_TARGET.items():
        if mapped == target and (ELECTRON_OUT / name).is_dir():
            return ELECTRON_OUT / name
    return ELECTRON_OUT


def pick_files(target: str) -> list[Path]:
    """挑出这个 target 该发布的文件。

    ## 为什么由调用方说 target，而不是从目录/文件名猜

    electron-builder 的实际布局里，架构子目录（如 `mac` / `win-unpacked`）只有
    解包后的 `.app` / `win-unpacked`（几百 MB 的中间产物）。而且 mac x64 的
    文件名**没有架构后缀**（`蒜狸小助手-3.0.21.dmg`），x64 只有「不是 arm64」
    这一条线索可推 —— 猜不得。CI 矩阵本来就知道自己在出哪个 target，让它说，别猜。

    同一版里出现两个同后缀包是硬错误：指针只能指一个，指错了就是用户下到别的版本。
    """
    out = electron_out(target)
    if target.startswith("darwin"):
        hits = [p for p in out.glob("*.dmg")]
        manifest = out / "latest-mac.yml"
    else:
        hits = [p for p in out.glob("*.exe")]
        manifest = out / "latest.yml"
    if not hits:
        fail(f"{target}: {out} 下没有匹配的产物（dmg/exe）。")
    if len(hits) > 1:
        fail(f"{target}: 有 {len(hits)} 个候选：{[p.name for p in hits]}。指针该指哪个说不清。")
    if not manifest.is_file():
        fail(
            f"{target}: 缺 {manifest.name}。electron-builder 只有配了 publish 段才会生成更新清单。\n"
            f"    （在 {out} 找的 —— 三个平台各有一份同名清单，堆在一层会互相覆盖。）"
        )
    pkg = hits[0]
    files = [pkg, manifest]
    bm = pkg.with_suffix(pkg.suffix + ".blockmap")
    if not bm.is_file():
        fail(f"{target}: 缺 {bm.name}（增量下载要用它）。")
    files.append(bm)
    return files


def stage(target: str, files: list[Path], ver: str) -> Path:
    """把该 target 的发布文件复制到 `dist-desktop/<ver>/<target>/`。"""
    dst = DIST / ver / target
    if dst.exists():
        shutil.rmtree(dst)
    dst.mkdir(parents=True)
    for p in files:
        shutil.copy2(p, dst / p.name)
    return dst


def rewrite_manifest(target: str, stage_dir: Path, base: str, namespace: str) -> None:
    """把 `latest-*.yml` 里的占位/相对地址换成这个源自己的公开地址。

    **不能共用一个 base** —— 两个源共用的话，「双源互为备份」就成摆设，
    那台挂了两条 latestUrls 一起挂。

    ## 要改两处，而且两处都得改

    electron-updater 格式里有**两个**引用包地址的字段：

        files:
          - url:  蒜狸小助手-30.21.2-arm64.dmg     ← 列表项，前面有 "- "，正则要能匹配到
            sha512: …
        path: 蒜狸小助手-30.21.2-arm64.dmg          ← 顶层

    漏掉 `files[].url` 的话，下载走 files 而校验走 path，行为取决于消费方读哪个 ——
    这正是最坏的一类：有的客户端能升，有的一直转圈。
    """
    name = "latest-mac.yml" if target.startswith("darwin") else "latest.yml"
    f = stage_dir / name
    # 包在 CDN 上的完整地址，和 top_manifest() 里 latestUrls 用的是同一条规则。
    ver = ver_of(stage_dir)
    prefix = f"{base.rstrip('/')}/{key_prefix(namespace)}/{ver}/{target}/"

    def fix(m: "re.Match[str]") -> str:
        val = m.group(2)
        if val.startswith(("http://", "https://")):
            return m.group(0)  # 已经是绝对地址，不动
        return f"{m.group(1)}{prefix}{val}"

    # `url:` / `path:` 两处，行首可能有 "- " 列表标记，值可能带引号。
    text = re.sub(r"^(\s*(?:-\s+)?(?:url|path):\s*)(.+?)\s*$", fix, f.read_text(encoding="utf8"), flags=re.M)

    # **版本号：断言，不改写。**
    #
    # electron-builder 的 `version:` 取自 `app/desktop/package.json`，而那儿的值
    # 由 `scripts/set-desktop-version.py` 在出包前写成**编码后的三段**
    # （3.0.21.2 → 30.21.2）。这里只负责确认它对 —— 见下面 fail 的注释。
    encoded = encode_or_die(ver, where=f"{target} 的 {name}")
    found = re.search(r"^version:\s*(.+?)\s*$", text, flags=re.M)
    if not found:
        fail(f"{target}: {name} 里没有 version: 字段，消费方无从判断有没有新版。")
    got = found.group(1).strip().strip("'\"")
    if got != encoded:
        # **这里必须失败，不能像以前那样把清单补写成我们想要的值。**
        #
        # 补写的后果是：清单说 30.21.2，而**应用自报的是 package.json 里那个值**
        # （它被编进 asar 了，改清单改不动它）。两边对不上 → 用户装完 30.21.2
        # 之后应用仍然报旧版本 → 下次点「检查更新」又被告知有新版，无限循环。
        # 而发布日志一路绿：上传成功、回读校验通过、指针也翻了。
        #
        # 补写曾经是必要的，因为那时 package.json 放的是**三段基线**（3.0.21）而
        # 存储用四段。现在 package.json 自己就是编码值，正确的做法是让
        # electron-builder 从一开始就写对，然后在这里盯着它。
        fail(
            f"{target}: {name} 的 version 是 {got!r}，但这一版应该是 {encoded!r}"
            f"（{ver} 的编码值）。\n"
            f"    electron-builder 抄的是 app/desktop/package.json 的 version —— "
            f"出包流程里在 electron-builder **之前**加一步：\n"
            f"        python3 scripts/set-desktop-version.py {ver}\n"
            f"    后果不是「版本号不好看」，是装完之后客户端仍然认为有新版，"
            f"每次点检查更新都被弹一次。"
        )

    # **占位域名不许发出去。** 重写逻辑改坏了的话，症状是「指针指向一个谁也下不动的
    # 地址」—— 发布全绿、校验全过，只有用户升级时才发现。所以传之前先确认它真被换掉了。
    leftovers = [ln for ln in text.splitlines() if "REPLACE-ME" in ln or "github.com" in ln]
    if leftovers:
        fail(f"{target}: {name} 里还有没被重写的地址：\n    " + "\n    ".join(leftovers))
    if prefix.rstrip("/") not in text:
        fail(f"{target}: {name} 里找不到重写后的地址（期望包含 {prefix}）—— 发布的指针会指向别处。")

    # **清单里指的包，必须真的是这个 target 自己目录里那个包。**
    #
    # 2026-10-07 手工读线上文件抓到的：三个平台的 `latest-mac.yml` 同名，
    # 被堆进同一个目录时互相覆盖，x64 那份赢了。于是 darwin-arm64 发布的
    # 清单里写的是 **x64 的包名和 sha512** —— 而那个包从没进过 `darwin-arm64/`，
    # **arm64 Mac 点更新 404**。发布日志全绿，因为「上传成功、回读校验通过、
    # 指针也翻了」这几步验的都不是「清单里指的文件真的在这儿」。
    #
    # 两条都要对：
    #   - 文件名 —— 少了就是 404
    #   - sha512 —— 少了更阴险，包能下下来，但 electron-updater 要等下载完
    #     才校验失败
    local = {p.name: p for p in stage_dir.iterdir() if p.suffix in (".dmg", ".exe")}
    if not local:
        fail(f"{target}: {stage_dir} 下没有 dmg/exe，别的都无从谈起。")

    # **Windows 的包名里有空格**（`蒜狸小助手 Setup 30.21.3.exe`），所以取值
    # 必须用 `(.+?)` 而不是 `(\S+)` —— 后者一行都匹配不上，会误报成
    # 「没有 url/path 字段」。踩过一次，白跑了一轮发布。
    refs = re.findall(r"^\s*(?:-\s+)?(?:url|path):\s*(.+?)\s*$", text, flags=re.M)
    names = {r.strip("'\"").rsplit("/", 1)[-1] for r in refs}
    if not names:
        fail(f"{target}: {name} 里没有 url/path 字段，消费方无从知道该下哪个包。")
    stray = names - set(local)
    if stray:
        fail(
            f"{target}: {name} 指向的包 {sorted(stray)} 不在这个 target 的目录里"
            f"（这里只有 {sorted(local)}）。\n"
            f"    几乎总是同一个原因：三个平台各写一份**同名**的 latest-mac.yml，\n"
            f"    摆产物时堆进了同一层于是互相覆盖。publish job 必须按 target 分目录。\n"
            f"    症状是用户点更新 404，而发布日志一路绿。"
        )

    declared = set()
    for b64 in re.findall(r"^\s*sha512:\s*(\S+)\s*$", text, flags=re.M):
        try:
            declared.add(base64.b64decode(b64).hex())
        except (ValueError, TypeError):
            pass
    for fname, fpath in sorted(local.items()):
        digest = hashlib.sha512(fpath.read_bytes()).hexdigest()
        if digest not in declared:
            fail(
                f"{target}: {name} 里 {fname} 的 sha512 和文件本身对不上"
                f"（清单里的是 {sorted(declared)[0][:16] if declared else '（没有）'}…，"
                f"实际是 {digest[:16]}…）。\n"
                f"    清单和包来自不同的平台 —— 和上面那个覆盖是同一个病根。"
            )

    f.write_text(text, encoding="utf8")

    # 落一份 JSON 边表：给不认 electron-updater 格式的东西（人、脚本、以后自己写的
    # 检查器）一个能读的入口。老实说现在没有消费者，但它是唯一不带前置假设的那份数据。
    #
    # `version` 是人读四段（和存储目录同名），`semverVersion` 是清单里那个编码值 ——
    # 两者**必然不同**，写在一起是为了看的人一眼知道该拿哪个去比。
    (stage_dir / "release.json").write_text(
        json.dumps(
            {
                "target": target,
                "version": ver,
                "semverVersion": encoded,
                "base": base,
                "files": sorted(p.name for p in stage_dir.iterdir() if p.is_file()),
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf8",
    )


def ver_of(stage_dir: Path) -> str:
    return stage_dir.parent.name


# dry-run/ 与产品命名空间的拼接。和 release.py 的 key_prefix() 同一套规则：
# 空前缀不能拼成 `/dry-run/`（S3 key 以斜杠开头会多一层空目录，URL 里的 `//`
# 又会被某些 CDN 规范化掉，于是"传上去了但公网 404"）。
def key_prefix(namespace: str) -> str:
    """`ovaijisuandesign` 或 `ovaijisuandesign/dry-run`。**不带尾斜杠** ——
    拼接时统一由调用方加 `/`，两处都加就会出现 `//`，而 URL 里的 `//` 会被某些
    CDN 规范化掉，于是「传上去了但公网 404」。"""
    ns = PRODUCT.strip("/")
    tail = namespace.strip("/")
    return f"{ns}/{tail}" if (ns and tail) else (ns or tail)


def top_manifest(ver: str, sources: list[str], targets: list[str], namespace: str) -> Path:
    """顶层 manifest.json：每个 target 指向各源自己的**稳定**清单地址。

    和旧栈的形状一致（`schemaVersion` / `targets.<target>.latestUrls.<source>`），
    所以现有的监控脚本和用户的自检脚本不用改。

    **地址里不带版本号。** 带了就把读者锁死在某一版：装的是 3.0.21.1 时读到的
    latestUrls 指向 `3.0.21.1/…`，于是 3.0.21.2 发布后它永远看不见 —— 而这正是
    自动更新失效最常见的一种形态，且没有任何报错。旧栈的 `<target>/latest.json`
    是同一个约定（所以它的更新一直能工作）。
    """
    doc = {"schemaVersion": 1, "targets": {}}
    for t in targets:
        entry: dict = {"status": "published", "latestUrls": {}}
        for s in sources:
            base = os.environ[SOURCES[s]["base"]].rstrip("/")
            name = "latest-mac.yml" if t.startswith("darwin") else "latest.yml"
            entry["latestUrls"][s] = f"{base}/{key_prefix(namespace)}/{t}/{name}"
        doc["targets"][t] = entry
    out = DIST / "manifest.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
    return out


def remove_key(source: str, bucket: str, key: str) -> None:
    """删一个 key，**删不掉不算失败**。

    `aws s3 rm` 对不存在的 key 会往 stderr 打一行、退出码非 0；而清理本来就是
    「有就删、没有就跳过」。直接用 `run()`（check=True）的话，**第一次跑清理就会
    因为「桶根本来就没有清单」而整次发布失败** —— 而那恰恰是最常见的情况。
    """
    import subprocess

    subprocess.run(
        ["aws", "s3", "rm", f"s3://{bucket}/{key}", "--endpoint-url", endpoint(source)],
        env={**os.environ, **creds(source)},
        capture_output=True,
    )


def upload(source: str, ver: str, target: str, stage_dir: Path, namespace: str) -> None:
    """传一个 target 的全部文件，然后**逐个回读校验**。

    用旧栈的 `s3_upload()` / `verify()`，不为新栈另写一份上传 —— 那段代码已经踩过
    R2 不支持 CRC32 尾部校验（会 501，而报错看不出是校验问题）这类坑。
    `verify()` 自己会拼 `PREFIX`，所以传进去的 key **不带产品命名空间**。

    ## 更新清单要传两份：版本化的留档 + 不带版本号的稳定指针

    electron-updater 找的是 `<base>/<target>/latest-mac.yml`（mac）或 `latest.yml`
    （win）—— **不带版本号**。所以只在版本化目录里放一份的话，更新器永远 404：
    装的是 3.0.21.1 就只找 `…/3.0.21.1/<target>/`，新版本发到 `3.0.21.2/` 它看不见。
    （旧栈的 `<target>/latest.json` 就是这个稳定指针，也正因为如此更新才能一直工作。）

    所以：清单传两份，其余文件只传版本化那一份。
    """
    manifest = "latest-mac.yml" if target.startswith("darwin") else "latest.yml"
    for p in sorted(stage_dir.iterdir()):
        if not p.is_file():
            continue
        key = f"{key_prefix(namespace)}/{ver}/{target}/{p.name}"
        digest = hashlib.sha256(p.read_bytes()).hexdigest()
        s3_upload(source, p, key)
        verify(source, key, digest)
        print(f"    ✓ {key}")
        if p.name == manifest:
            # 稳定指针：**不带版本号**。更新器只认这个路径（provider=generic 的约定）。
            stable = f"{key_prefix(namespace)}/{target}/{p.name}"
            s3_upload(source, p, stable)
            verify(source, stable, digest)
            print(f"    ✓ {stable}   ← 更新器读的是这份（不带版本号）")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", required=True, help="版本号，和 electron-builder 用的是同一个")
    ap.add_argument("--target", dest="targets", action="append", required=True,
                    choices=["darwin-arm64", "darwin-x64", "win32-x64"],
                    help="要发布的 target，可重复。CI 矩阵知道自己在出哪个，别让它猜。")
    ap.add_argument("--prefix", default="",
                    help="发布前缀。dry-run 传 'dry-run/'，别让空跑写进生产命名空间。")
    ap.add_argument("--layout-only", action="store_true", help="只摆产物 + 重写指针，不上传")
    ap.add_argument("--publish", action="store_true", help="摆好 + 上传 + 回读校验")
    args = ap.parse_args()
    ver = args.version

    found: dict[str, Path] = {}
    for t in args.targets:
        found[t] = stage(t, pick_files(t), ver)
    print(f"✓ 摆好 {len(found)} 个 target：{', '.join(found)}")

    sources = configured()
    for s in sources:
        base = os.environ[SOURCES[s]["base"]]
        for target in found:
            rewrite_manifest(target, DIST / ver / target, base, args.prefix)
    print(f"✓ 指针按源重写：{', '.join(sources)}" + ("" if len(sources) > 1 else "  （OBS 没配 OBS_* 凭据，所以只有这一个源）"))
    top = top_manifest(ver, sources, list(found), args.prefix)
    print(f"✓ 顶层清单 {display_path(top)}")

    if not args.publish:
        print("\n（--layout-only：没有上传。--publish 才上传。）")
        return 0

    for s in sources:
        preflight(s)
    for s in sources:
        for target in found:
            print(f"  {s} / {target}")
            upload(s, ver, target, DIST / ver / target, args.prefix)
        print(f"✓ {s}：上传并逐个回读校验通过")

    # **最后才翻顶层指针。** 包全传完并逐个校验过之后才轮到它 —— 顺序反了会出现
    # 「指针已经指向新版本、包却还没传完」，用户点下载 404，而这次发布看起来是绿的。
    #
    # （漏掉这一步的后果更隐蔽：包全在 R2 上、发布日志也全绿，但顶层 manifest 没人改，
    #  **消费者还在拿旧版本** —— 2026-10-07 的 v3.0.21.1 就是这么"发布成功但没生效"的。）
    #
    # ## key 必须自己带上命名空间，不能指望 s3_upload 拼
    #
    # `s3_upload()` 内部会拼一个模块级的 `PREFIX`，而那个值**只在 release.py 的 main()
    # 里赋值**。本脚本 import 它时 main() 从没跑过，`PREFIX` 还是 `""` —— 于是
    # `s3_upload(…, "manifest.json")` 落到 **桶根**，把清单写到了产品的命名空间外面。
    # 桶可能是和别的项目共用的（release.py 里 PRODUCT 那段注释就是讲这个），写错地方
    # 既让自己的指针没翻，又可能踩到别人。而 `verify()` 校验的是同一个错 key，
    # 于是**回读校验还绿着** —— 比不校验更坏。
    top_key = f"{key_prefix(args.prefix)}/manifest.json"
    # **命名空间真的为空才拒**（`RELEASE_PRODUCT=` 时）。
    #
    # 上一版写的是 `count("/") < 1`，而 `key_prefix("")` 返回 `ovaijisuandesign` ——
    # 它**就是**产品命名空间、一个斜杠都没有。于是正常发布被判成「命名空间为空」而拒掉，
    # 三个平台的包全传完并校验过之后才在最后一步挂。判断依据只能是「是不是空串」。
    #
    # 这个守卫本身是有用的：桶可能和别的项目共用（release.py 里 PRODUCT 那段注释就在讲，
    # 共用桶而不分命名空间，对方的清理会把我们的版本删光），往桶根写「我们的清单」
    # 不只是自己指针没翻 —— 那是别人的地盘。
    if not key_prefix(args.prefix):
        fail(f"产品命名空间为空，拒绝对桶根写清单（key={top_key!r}）")
    for s in sources:
        digest = hashlib.sha256(top.read_bytes()).hexdigest()
        s3_upload(s, top, top_key)
        verify(s, top_key, digest)
        print(f"✓ {s}：顶层指针已翻到 {ver}（{top_key}）")

    # **桶根不该有清单。** 有命名空间（RELEASE_PRODUCT 非空）时，桶根的 manifest.json
    # 按定义就是错的 —— 谁都不会去读它，但留着会让人以为发布没生效（2026-10-07 线上就
    # 这么躺了一个，是那次守卫没挡住留下的）。顺手清掉，不留给下一个人去猜。
    if key_prefix(args.prefix):
        for s in sources:
            bucket = os.environ[SOURCES[s]["bucket"]]
            remove_key(s, bucket, "manifest.json")
            # **旧栈留下的稳定指针**（`<target>/latest.json`）。新栈的稳定指针是
            # `<target>/latest-mac.yml` / `latest.yml`，旧的那三个还在指着 3.0.14.5 ——
            # 留着就是个「这里有个当前版本」的假指针，读到的人会拿到旧包。
            for legacy in ("darwin-arm64", "darwin-x64", "win32-x64"):
                remove_key(s, bucket, f"{key_prefix(args.prefix)}/{legacy}/latest.json")
        print(f"✓ 桶根已清；旧栈的 latest.json 遗留指针已清（正式清单在 <product>/<target>/latest-*.yml）")

    # 从公开域名再读一次指针。**光验 S3 API 不够** —— 域名的缓存规则、权限、内容类型
    # 问题都只在这一步才暴露。
    #
    # **必须重试。** 刚传上去的对象在 CDN 上不是立刻可见的：第一次请求很可能命中
    # 之前缓存下来的 miss，回一个错误页而不是 yml。踩过一次 —— 明明每个文件都
    # 「上传并逐个回读校验通过」，最后一步却报「里没有 url 字段」，而几分钟后
    # 同一个地址读出来完全正常。判失败之前多等几轮。
    for s in sources:
        base = os.environ[SOURCES[s]["base"]].rstrip("/")
        url = f"{base}/{key_prefix(args.prefix)}/{ver}/darwin-arm64/latest-mac.yml"
        body, last = "", ""
        for attempt in range(1, PUBLIC_READ_ATTEMPTS + 1):
            if attempt > 1:
                delay = 5 * attempt
                print(f"    公网还读不到（{last}），{delay}s 后重试 {attempt}/{PUBLIC_READ_ATTEMPTS}")
                time.sleep(delay)
            try:
                # `http_get()` 返回的是 **HTTPResponse 对象**，不是字符串 ——
                # 忘了 `.read().decode()` 的话，下面的 `"url:" in body` 是在拿字符串
                # 比一个对象，恒为 False，于是这一步**永远失败**。踩过一次：
                # 每个文件都「上传并逐个回读校验通过」，最后一步却报「没有 url 字段」。
                # 旧栈自己的用法见 release.py 的 `.read().decode("utf8").strip()`。
                body = http_get(url).read().decode("utf8", "replace")
            except Exception as e:  # 连不上 / 4xx / 5xx 都算「还没好」
                last = f"{type(e).__name__}: {e}"
                continue
            if "url:" in body:
                break
            last = f"响应里没有 url: {body.strip()[:80]!r}"
        if "url:" not in body:
            fail(f"{s} 公网回读 {url} 失败：{last}\n  （对象在 S3 上是校验过的；这里读不到通常是 CDN 还没生效，再等一会儿重试本 job。）")
        print(f"✓ {s} 公网回读 {url}")
    print(f"\n✓ 已发布 {ver} 到 {', '.join(sources)}（前缀 {key_prefix(args.prefix) or '（无）'}）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
