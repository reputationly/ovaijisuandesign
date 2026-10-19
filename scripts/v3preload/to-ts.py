#!/usr/bin/env python3
"""把 `.probe/m3/preload-src/` 里切出来的产物模块转成可入库的 TypeScript。

    python3.14 scripts/v3preload/to-ts.py <模块文件名> [--dry-run]

做的是**机械**变换，不做类型推导 —— 类型由 tsc 报错后再人工补，这样既快又不会
把「看起来像类型推导、其实是猜」的东西写进去：

- 去掉产物路径注释（换成调用方给的文档头）；
- 顶层 `var X = ...` → `const X = ...`；
- 按 manifest 推断的导出集合给声明加 `export`；
- `void 0` → `undefined`、`\\uXXXX` 转成真字符（上游源码里本来就是中文，产物里被转义了）；
- IIFE 参数上的数字后缀（`AssetRole2`）**保留** —— 那是 rollup 为避让作用域冲突加的，
  改掉它要动作用域，风险大于收益。

**不做的**：不生成文档注释、不推断类型。那些是判断，不是变换。
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SRC = Path(".probe/m3/preload-src")
MANIFEST = SRC / "manifest.json"
DECL2 = re.compile(r"(?m)^(export\s+)?(var|const|let)\s+([A-Za-z_$][\w$]*)")


def unescape_unicode(text: str) -> str:
    """把字符串里的 `\\uXXXX` 转义还原成字符。

    产物里中文提示词全是转义形式（`\\u8BF7\\u7F16\\u8F91`），上游源码里是汉字。
    只处理 BMP，代理对不管 —— 这些模块里没有超出 BMP 的字符。
    """
    def repl(m: re.Match[str]) -> str:
        try:
            return chr(int(m.group(1), 16))
        except ValueError:
            return m.group(0)

    return re.sub(r"\\u([0-9a-fA-F]{4})", repl, text)


def convert(entry: dict, header: str) -> str:
    body = (SRC / entry["src"].replace("/", "__")).read_text(encoding="utf-8")
    body = re.sub(r"(?m)^// .*\n", "", body, count=1)          # 产物路径注释
    body = re.sub(r"\bvoid 0\b", "undefined", body)
    body = unescape_unicode(body)

    exports = set(entry.get("exports") or [])
    for name in sorted(exports, key=len, reverse=True):
        body = re.sub(
            rf"(?m)^(?!export )((?:var|const|let|function|class)\s+{re.escape(name)}\b)",
            r"export \1",
            body,
        )
    # 顶层 var → const（这些模块里没有被重新赋值的顶层 var）。
    # 放在加 export **之后**，顺带覆盖 `export var` 这种形态。
    body = DECL2.sub(lambda m: f"{'export ' if m.group(1) else ''}{'const' if m.group(2) == 'var' else m.group(2)} {m.group(3)}", body)
    return header.rstrip() + "\n" + body.lstrip("\n")


def locate(name: str) -> dict:
    for entry in json.loads(MANIFEST.read_text(encoding="utf-8")):
        if entry["src"].replace("/", "__") == name or entry["src"].endswith(name):
            return entry
    raise SystemExit(f"manifest 里找不到 {name}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("module")
    ap.add_argument("--header", default="", help="写在文件最前面的文档注释")
    ap.add_argument("--out", help="输出路径（缺省写到仓库里的源码路径）")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    entry = locate(args.module)
    out = convert(entry, args.header or f"/** 由 v3 preload 产物还原：{entry['bundlePath']} */")
    target = Path(args.out) if args.out else Path(entry["src"])
    if args.dry_run:
        sys.stdout.write(out)
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(out, encoding="utf-8")
    print(f"写出 {target}（{len(out.splitlines())} 行，导出 {len(entry.get('exports') or [])} 个）")


if __name__ == "__main__":
    main()
