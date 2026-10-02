#!/usr/bin/env python3
"""下载首页「创作灵感」的图片素材到 assets/home-showcase/media/（gitignored）。

数据源是 assets/home-showcase/quick-start-config-v2.json（官方云端 quick_start_config v2 的原文，
提取自官方应用缓存，见 assets/home-showcase/README.md）。只下**图片**：type=="image" 的附件 +
outputs[].cover；video / audio 附件和输出视频（318 个 URL，~6.9GB）运行时由渲染层直接走
CDN（和官方在线行为一致），不本地化。

文件名 = `<sha1(url) 前 16 位>-<原始文件名>`，必须和网关侧
app/gateway/src/cloud-config/home-quick-start-cloud.ts 的 showcaseAssetKey() 完全一致；
一致性由生成的 media-manifest.json 与 TS 派生结果的对账测试（home-quick-start-cloud.test.ts）保证。
重跑会自动清掉 media/ 里不在 manifest 里的残留文件；
提示词/描述文本里的 URL（比如 B 站链接）不碰。

用法：
    python3 scripts/fetch-home-showcase-images.py           # 增量下载（已有的跳过）
    python3 scripts/fetch-home-showcase-images.py --check   # 只校验完整性，缺了报非零
    python3 scripts/fetch-home-showcase-images.py --jobs 12
"""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CONFIG = REPO / "assets/home-showcase/quick-start-config-v2.json"
MEDIA_DIR = REPO / "assets/home-showcase/media"
MANIFEST = REPO / "assets/home-showcase/media-manifest.json"

UNSAFE = re.compile(r"[^A-Za-z0-9._-]")


def _values(field) -> list[str]:
    """字段值可能是字符串或 {domestic, overseas}，统一展平成 URL 列表。"""
    if isinstance(field, str):
        return [field]
    if isinstance(field, dict):
        return [v for v in field.values() if isinstance(v, str)]
    return []


def collect_media_urls(config: dict) -> tuple[set[str], set[str]]:
    """按字段路径精确收集（绝不动 prompt / description 里的文本 URL，比如示例提示词里的 B 站链接）。

    与 TS 侧 home-quick-start-cloud.ts 的 collectShowcaseAssets() 走同一套路径约定：
    - 图片（要本地化）：sections[].items[].attachments[] 里 type=="image" 的 url、
      sections[].items[].outputs[].cover
    - 媒体（保持 CDN）：type!="image" 的附件（video / audio）、sections[].items[].outputs[].video
    """
    images: set[str] = set()
    media: set[str] = set()
    for section in config.get("sections", []):
        for item in section.get("items", []):
            for att in item.get("attachments", []):
                values = set(_values(att.get("url")))
                if att.get("type") == "image":
                    images |= values
                else:
                    media |= values
            for out in item.get("outputs", []):
                images |= set(_values(out.get("cover")))
                media |= set(_values(out.get("video")))
    return images, media


def asset_key(url: str) -> str:
    """和 TS 侧 showcaseAssetKey() 保持逐字一致。"""
    name = UNSAFE.sub("_", url.rsplit("/", 1)[-1]) or "unnamed"
    return f"{hashlib.sha1(url.encode()).hexdigest()[:16]}-{name}"


def build_manifest() -> dict[str, dict]:
    images, _videos = collect_media_urls(json.loads(CONFIG.read_text()))
    return {asset_key(u): {"url": u, "bytes": None} for u in sorted(images)}


def fetch_one(key: str, url: str, jobs_force: bool) -> tuple[str, int | None, str | None]:
    dest = MEDIA_DIR / key
    if dest.exists() and dest.stat().st_size > 0 and not jobs_force:
        return key, dest.stat().st_size, None
    tmp = dest.with_suffix(dest.suffix + ".part")
    r = subprocess.run(
        ["curl", "-sSL", "--fail", "--retry", "3", "--max-time", "600", "-o", str(tmp), url],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        tmp.unlink(missing_ok=True)
        return key, None, (r.stderr.strip() or f"curl exit {r.returncode}")
    tmp.rename(dest)
    return key, dest.stat().st_size, None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="只校验，不下载")
    ap.add_argument("--force", action="store_true", help="忽略已存在文件重新下载")
    ap.add_argument("--jobs", type=int, default=8)
    args = ap.parse_args()

    manifest = build_manifest()
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)

    if args.check:
        missing = [k for k, v in manifest.items() if not (MEDIA_DIR / k).exists()]
        bad = []
        for k, v in manifest.items():
            n = (MEDIA_DIR / k).stat().st_size if (MEDIA_DIR / k).exists() else 0
            if v["bytes"] and n != v["bytes"]:
                bad.append((k, n, v["bytes"]))
        print(f"manifest {len(manifest)} 项；缺 {len(missing)}，字节数不符 {len(bad)}")
        for k in missing[:10]:
            print("  缺:", k)
        for k, n, want in bad[:10]:
            print(f"  不符: {k} 本地 {n} ≠ 记录 {want}")
        return 1 if missing or bad else 0

    print(f"图片 URL 共 {len(manifest)} 个，{args.jobs} 并发 → {MEDIA_DIR}")
    done = fail = 0
    total = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as ex:
        futs = {ex.submit(fetch_one, k, v["url"], args.force): k for k, v in manifest.items()}
        for fut in concurrent.futures.as_completed(futs):
            key, size, err = fut.result()
            if err:
                fail += 1
                print(f"  失败 {key}: {err}", file=sys.stderr)
            else:
                done += 1
                total += size or 0
            if (done + fail) % 50 == 0:
                print(f"  … {done + fail}/{len(manifest)}（累计 {total / 1e6:.0f} MB）")

    # 记录字节大小，--check 用它对账；media/ 里不在 manifest 的残留文件（规则改过/URL 下线）清掉。
    for k in manifest:
        p = MEDIA_DIR / k
        manifest[k]["bytes"] = p.stat().st_size if p.exists() else None
    kept = set(manifest)
    for p in MEDIA_DIR.iterdir():
        if p.is_file() and p.name not in kept:
            p.unlink()
            print(f"  清理不在 manifest 里的残留：{p.name}")
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=1, sort_keys=True) + "\n")

    print(f"完成 {done}，失败 {fail}，新增/校验合计 {total / 1e6:.0f} MB → manifest {MANIFEST}")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
