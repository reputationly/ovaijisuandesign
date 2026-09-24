#!/usr/bin/env python3
"""对照重写的自查：我们的代码里有多少长行和参考包逐字相同。

参考包只在本机读（应用安装目录里的 bundle），不进仓库。输出每个文件的重合行数，
超过阈值的文件列出具体行。接口事实（路由、字段名、错误码、模型 id）本来就该一样，
所以不追求 0；要看的是**逻辑代码**成段一致。

用法：
  python3 scripts/check-verbatim.py [路径 …] [--threshold 0.08] [--show 10]
默认扫 app/gateway/src、app/mcp-tools/src、app/packages/*/src、app/desktop/src。
"""
from __future__ import annotations

import argparse
import glob
import os
import re
import sys

APP = "/Applications/MiniMax Design.app/Contents/Resources"
BUNDLES = [
    f"{APP}/gateway/dist/main.js",
    f"{APP}/mcp-tools/dist/main.js",
    "/tmp/asar16/out/renderer/assets/index-C4qF1HE0.js",
    "/tmp/asar16/out/main/chunks/index-C0Ixo6UY.js",
]
DEFAULT_ROOTS = ["app/gateway/src", "app/mcp-tools/src", "app/packages/*/src", "app/desktop/src"]
MIN_LEN = 60


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="*")
    ap.add_argument("--threshold", type=float, default=0.08, help="单文件重合比例超过它就列出明细")
    ap.add_argument("--show", type=int, default=10)
    args = ap.parse_args()

    ref = " ".join(norm(open(b, encoding="utf-8", errors="ignore").read()) for b in BUNDLES if os.path.exists(b))
    if not ref:
        print("找不到参考包，跳过", file=sys.stderr)
        return 0

    files: list[str] = []
    for root in args.paths or DEFAULT_ROOTS:
        if os.path.isfile(root):
            files.append(root)
            continue
        for d in glob.glob(root):
            files += [f for f in glob.glob(f"{d}/**/*.ts", recursive=True) + glob.glob(f"{d}/**/*.tsx", recursive=True)]
    files = sorted(f for f in set(files) if ".test." not in f and "generated" not in f and "/node_modules/" not in f)

    total = hit = 0
    flagged: list[tuple[float, str, int, int, list[str]]] = []
    for f in files:
        lines = [l.strip() for l in open(f, encoding="utf-8", errors="ignore")]
        cand = [l for l in lines if len(l) >= MIN_LEN and not l.startswith(("//", "*", "/*", "import ", "export {"))]
        same = [l for l in cand if norm(l) in ref]
        total += len(cand)
        hit += len(same)
        if cand and len(same) / len(cand) > args.threshold and len(same) >= 3:
            flagged.append((len(same) / len(cand), f, len(same), len(cand), same))

    print(f"{len(files)} 个文件、{total} 行长代码，逐字相同 {hit} 行（{hit / max(total, 1):.1%}）")
    for ratio, f, n, c, same in sorted(flagged, reverse=True):
        print(f"\n{ratio:5.1%}  {n}/{c}  {f}")
        for l in same[: args.show]:
            print(f"    {l[:140]}")
    return 1 if flagged else 0


if __name__ == "__main__":
    sys.exit(main())
