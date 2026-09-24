#!/usr/bin/env python3
"""从官方 gateway 产物提取 protocol 常量，生成 app/packages/protocol/src/api-paths.generated.ts。

    python3 scripts/extract-protocol.py [--app /Applications/MiniMax\\ Design.app]

官方 `@hilo/protocol` 的 `API_PATHS` 是 gateway、renderer、mcp-tools 三方共用的
路径表。我们的三方也共用一份 —— 从官方产物里提取，而不是手抄：应用升级后
重跑，`git diff` 就是路径表的变化。

只提取平铺的字符串成员（`key: "/api/..."`）。函数形式的成员（带参数拼路径的）
跳过并列在文件末尾的注释里，需要时在 protocol 里手写同名函数。

只记接口事实（键名 + 路径字符串），不含任何实现代码。
"""

import argparse
import re
import sys
from pathlib import Path

DEFAULT_APP = Path("/Applications/MiniMax Design.app")
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "app/packages/protocol/src/api-paths.generated.ts"

TABLES = ["API_PATHS", "CANVAS_REFERENCE_API"]


def extract(src: str, name: str) -> tuple[list[tuple[str, str]], list[str]]:
    m = re.search(rf"^var {name} = \{{\n(.*?)^\}};", src, re.M | re.S)
    if not m:
        return [], []
    flat, skipped = [], []
    for line in m.group(1).splitlines():
        t = line.strip()
        if not t or t.startswith("//"):
            continue
        if kv := re.match(r'^(\w+): "([^"]*)",?$', t):
            flat.append((kv.group(1), kv.group(2)))
        elif key := re.match(r"^(\w+):", t):
            skipped.append(key.group(1))
    return flat, skipped


def app_version(app: Path) -> str:
    m = re.search(
        r"<key>CFBundleShortVersionString</key>\s*<string>([^<]+)</string>",
        (app / "Contents/Info.plist").read_text(encoding="utf-8", errors="replace"),
    )
    return m.group(1) if m else "unknown"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--app", type=Path, default=DEFAULT_APP)
    args = ap.parse_args()
    src = (args.app / "Contents/Resources/gateway/dist/main.js").read_text(encoding="utf-8", errors="replace")

    out = [
        f"// 由 scripts/extract-protocol.py 生成（基线 {app_version(args.app)}）。**不要手改**，重跑脚本更新。",
        "",
    ]
    total = 0
    for name in TABLES:
        flat, skipped = extract(src, name)
        if not flat:
            print(f"没找到 {name}", file=sys.stderr)
            continue
        total += len(flat)
        out.append(f"export const {name} = {{")
        out += [f'  {k}: "{v}",' for k, v in flat]
        out.append("} as const;")
        if skipped:
            out.append(f"// {name} 里带参数的成员（未提取，需要时手写）：{', '.join(skipped)}")
        out.append("")
    OUT.write_text("\n".join(out), encoding="utf-8")
    print(f"{total} 条路径 → {OUT.relative_to(ROOT)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
