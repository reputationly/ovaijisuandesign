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

    mac-arm64/  蒜狸小助手-<ver>-arm64.dmg  +  .dmg.blockmap  +  latest-mac.yml
    mac-x64/    蒜狸小助手-<ver>.dmg         +  .dmg.blockmap  +  latest-mac.yml
    win-x64/    蒜狸小助手-<ver>-Setup.exe  +  .exe.blockmap  +  latest.yml

指针沿用 electron-updater 的 `latest-*.yml` 格式 —— 消费方（`electron-updater`、
或任何按这个格式读的工具）不用改就能认。

**包名不带 sha，按版本存死。** 和旧栈不同，这里保留 electron-builder 的原始命名：
`latest-*.yml` 里引用的就是它，**改名就得连 yml 一起改**，而 yml 是我们重写的 ——
多一处可以出错的地方。真要防「覆盖发布」，靠的是「版本号只增」而不是文件名。

**打包阶段 electron-builder 自己写的 `latest-*.yml` 必须丢掉**（里面是占位域名），
由本脚本按每个源自己的公开域名重新生成。概念和旧栈丢掉 `latest.json` 完全一样
（`release.yml` 里那段注释）。
"""

import argparse
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
    http_get,
    preflight,
    s3_upload,
    verify,
)

DIST = ROOT / "dist-desktop"

# 公网回读的重试轮数。CDN 对刚上传的对象不是立刻可见的（先命中旧的 miss 缓存）。
PUBLIC_READ_ATTEMPTS = 5
ELECTRON_OUT = ROOT / "app/desktop/dist-electron"

# electron-builder 的输出目录名 → 我们对外的 target 名。
# **和旧栈的 target 命名保持一致**（darwin-arm64 / darwin-x64 / win32-x64）：
# 用户的升级检查、监控、脚本都认这一套，换名字等于让所有下游失效。
# electron-builder 只出一种架构时目录就叫 `mac` 而不是 `mac-x64`，两种都要认。
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


def pick_files(target: str) -> list[Path]:
    """挑出这个 target 该发布的文件（从 electron-builder 的输出**顶层**）。

    ## 为什么由调用方说 target，而不是从目录/文件名猜

    electron-builder 的实际布局是：可发布产物在输出**顶层**，架构子目录里只有解包后的
    `.app` / `win-unpacked`（几百 MB 的中间产物）。而且 mac x64 的文件名**没有架构后缀**
    （`蒜狸小助手-3.0.16.dmg`），x64 只有「不是 arm64」这一条线索可推 —— 猜不得。
    CI 矩阵本来就知道自己在出哪个 target，让它说，别猜。

    同一版里出现两个同后缀包是硬错误：指针只能指一个，指错了就是用户下到别的版本。
    """
    if target.startswith("darwin"):
        hits = [p for p in ELECTRON_OUT.glob("*.dmg")]
        if target.endswith("arm64"):
            hits = [p for p in hits if p.stem.endswith("-arm64")]
        else:
            hits = [p for p in hits if not p.stem.endswith("-arm64")]
        manifest = ELECTRON_OUT / "latest-mac.yml"
    else:
        hits = [p for p in ELECTRON_OUT.glob("*.exe")]
        manifest = ELECTRON_OUT / "latest.yml"
    if not hits:
        fail(f"{target}: {ELECTRON_OUT} 下没有匹配的产物（dmg/exe）。")
    if len(hits) > 1:
        fail(f"{target}: 有 {len(hits)} 个候选：{[p.name for p in hits]}。指针该指哪个说不清。")
    if not manifest.is_file():
        fail(f"{target}: 缺 {manifest.name}。electron-builder 只有配了 publish 段才会生成更新清单。")
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
          - url:  蒜狸小助手-3.0.16-arm64.dmg     ← 列表项，前面有 "- "，正则要能匹配到
            sha512: …
        path: 蒜狸小助手-3.0.16-arm64.dmg          ← 顶层

    漏掉 `files[].url` 的话，下载走 files 而校验走 path，行为取决于消费方读哪个 ——
    这正是最坏的一类：有的客户端能升，有的一直转圈。
    """
    name = "latest-mac.yml" if target.startswith("darwin") else "latest.yml"
    f = stage_dir / name
    # 包在 CDN 上的完整地址，和 top_manifest() 里 latestUrls 用的是同一条规则。
    prefix = f"{base.rstrip('/')}/{key_prefix(namespace)}/{ver_of(stage_dir)}/{target}/"

    def fix(m: "re.Match[str]") -> str:
        val = m.group(2)
        if val.startswith(("http://", "https://")):
            return m.group(0)  # 已经是绝对地址，不动
        return f"{m.group(1)}{prefix}{val}"

    # `url:` / `path:` 两处，行首可能有 "- " 列表标记，值可能带引号。
    text = re.sub(r"^(\s*(?:-\s+)?(?:url|path):\s*)(.+?)\s*$", fix, f.read_text(encoding="utf8"), flags=re.M)

    # **版本号也钉成真实发布版本。** electron-builder 的 `version:` 取自
    # app/desktop/package.json，那儿放的是**三段基线**（3.0.21）——
    # 因为四段不是合法 semver，cargo 的 workspace 装不下（见 release.py::baseline 的注释）。
    # 而存储路径是四段（3.0.21.1），两者对不上：消费方拿 yml 里的 `version` 和
    # 自己运行的版本比，基线相同的话会判定「已经是最新」而**永远不提示更新**。
    ver = ver_of(stage_dir)
    text = re.sub(r"^version:\s*.+$", f"version: {ver}", text, count=1, flags=re.M)

    # **占位域名不许发出去。** 重写逻辑改坏了的话，症状是「指针指向一个谁也下不动的
    # 地址」—— 发布全绿、校验全过，只有用户升级时才发现。所以传之前先确认它真被换掉了。
    leftovers = [ln for ln in text.splitlines() if "REPLACE-ME" in ln or "github.com" in ln]
    if leftovers:
        fail(f"{target}: {name} 里还有没被重写的地址：\n    " + "\n    ".join(leftovers))
    if prefix.rstrip("/") not in text:
        fail(f"{target}: {name} 里找不到重写后的地址（期望包含 {prefix}）—— 发布的指针会指向别处。")
    if f"version: {ver}" not in text:
        fail(f"{target}: {name} 的 version 不是 {ver} —— 消费方会比对错版本。")

    f.write_text(text, encoding="utf8")

    # 落一份 JSON 边表：给不认 electron-updater 格式的东西（人、脚本、以后自己写的
    # 检查器）一个能读的入口。老实说现在没有消费者，但它是唯一不带前置假设的那份数据。
    (stage_dir / "release.json").write_text(
        json.dumps(
            {
                "target": target,
                "version": ver_of(stage_dir),
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
    """顶层 manifest.json：每个 target 指向各源自己的 latest 清单地址。

    和旧栈的形状一致（`schemaVersion` / `targets.<target>.latestUrls.<source>`），
    所以现有的监控脚本和用户的自检脚本不用改。
    """
    doc = {"schemaVersion": 1, "targets": {}}
    for t in targets:
        entry: dict = {"status": "published", "latestUrls": {}}
        for s in sources:
            base = os.environ[SOURCES[s]["base"]].rstrip("/")
            name = "latest-mac.yml" if t.startswith("darwin") else "latest.yml"
            entry["latestUrls"][s] = f"{base}/{key_prefix(namespace)}/{ver}/{t}/{name}"
        doc["targets"][t] = entry
    out = DIST / "manifest.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
    return out


def upload(source: str, ver: str, target: str, stage_dir: Path, namespace: str) -> None:
    """传一个 target 的全部文件，然后**逐个回读校验**。

    用旧栈的 `s3_upload()` / `verify()`，不为新栈另写一份上传 —— 那段代码已经踩过
    R2 不支持 CRC32 尾部校验（会 501，而报错看不出是校验问题）这类坑。
    `verify()` 自己会拼 `PREFIX`，所以传进去的 key **不带产品命名空间**。
    """
    for p in sorted(stage_dir.iterdir()):
        if not p.is_file():
            continue
        key = f"{key_prefix(namespace)}/{ver}/{target}/{p.name}"
        digest = hashlib.sha256(p.read_bytes()).hexdigest()
        s3_upload(source, p, key)
        verify(source, key, digest)
        print(f"    ✓ {key}")


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
    print(f"✓ 顶层清单 {top.relative_to(ROOT)}")

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
