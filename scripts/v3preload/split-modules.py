#!/usr/bin/env python3
"""把 v3 preload 产物按原始模块注释切开，并还原模块之间的 import/export 关系。

    python3.14 scripts/v3preload/split-modules.py            # 干跑，只报告
    python3.14 scripts/v3preload/split-modules.py --write    # 写出到 .probe/m3/preload-src/

为什么能这么做：`out/preload/v3-workbench.cjs` 没有压缩，而且每个模块前留了一行原始路径注释
（`// ../packages/protocol/dist/capabilities/tools/image.js`）。按注释切出来的就是上游的原始文件划分。

模块之间的关系不用猜：rollup 保证**顶层名字全局唯一**（撞名会被加 `$N`/数字后缀），
所以「A 里声明的名字在 B 里被引用」就等于「B 从 A import 它」。反过来推导出关系即可。
"""
from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path

BUNDLE = ".probe/reference/4.0.0/asar/out/preload/v3-workbench.cjs"
OUT_DIR = ".probe/m3/preload-src"
MAP_PATH = ".probe/m3/preload-modules.json"

# 顶层声明。`var X;` 和 `var X = ...` 都要收（TS 的 enum 输出是前者）
TOP_DECL = re.compile(r"(?m)^(?:var|const|let|function|class)\s+([A-Za-z_$][\w$]*)")
IDENT = re.compile(r"\b([A-Za-z_$][\w$]*)\b")

# 产物里天然存在的全局与关键字，不算跨模块引用
BUILTINS = set(
    """var const let function class return if else for while do switch case break continue new delete typeof
    instanceof in of void this super extends static get set async await yield try catch finally throw
    true false null undefined import export default from as NaN Infinity
    Object Array String Number Boolean Symbol BigInt Math JSON Date RegExp Error TypeError RangeError
    Map Set WeakMap WeakSet Promise Proxy Reflect BigInt ArrayBuffer Uint8Array Int8Array Uint16Array
    Int16Array Uint32Array Int32Array Float32Array Float64Array DataView TextEncoder TextDecoder
    encodeURIComponent decodeURIComponent encodeURI decodeURI parseInt parseFloat isNaN isFinite
    structuredClone queueMicrotask setTimeout clearTimeout setInterval clearInterval console globalThis
    window document navigator location URL URLSearchParams AbortController AbortSignal Event
    CustomEvent ErrorEvent setTimeout Symbol require module exports process Buffer""".split()
)


def split(raw: str) -> list[dict]:
    """按模块注释切分产物。"""
    marks = [(m.start(), m.group(1)) for m in re.finditer(r"(?m)^//\s*(\S.*?)\s*$", raw)]
    out = []
    for i, (off, src) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else len(raw)
        out.append({"index": i, "path": src, "code": raw[off:end]})
    return out


def declared(code: str) -> list[str]:
    return TOP_DECL.findall(code)


STR_OR_COMMENT = re.compile(
    r'"(?:\\.|[^"\\])*"'
    r"|'(?:\\.|[^'\\])*'"
    r"|`(?:\\.|[^`\\])*`"
    r"|/(?:\\.|\[(?:\\.|[^\]\\])*\]|[^/\\\n])+/[a-z]*"
    r"|//[^\n]*"
    r"|/\*.*?\*/",
    re.S,
)


def mask(code: str) -> str:
    """把字符串和注释换成等长空格。

    不做这一步的话，`"AGENT"`、`obj.AGENT`、翻译文案里的英文单词都会被当成标识符引用 ——
    第一次跑出来 1925 个「找不到声明的名字」，绝大多数是这种噪声。
    """
    return STR_OR_COMMENT.sub(lambda m: " " * len(m.group(0)), code)


def refs_of(code: str, wanted: set[str]) -> set[str]:
    """在掩码后的代码里找 `wanted` 中「作为独立标识符出现」的名字。

    要排掉三种「看着像引用、其实不是」的写法：
      1. `x.NAME` —— 属性访问（但 `...X` 展开的最后两个点也长这样，不能一刀切）；
      2. `{ NAME: ... }` —— 对象字面量的**键**；
      3. `case "NAME"` / 字符串里的名字（已在 mask 阶段处理）。
    第 2 条是补上的：`shape({ aspectRatio: optional(text) })` 里的 `aspectRatio` 是字段名，
    被当成引用后给 `task-mappers` 凭空造出一条 `import { aspectRatio }` —— 导出集合和
    import 都会多出一条假的。
    """
    masked = mask(code)
    found: set[str] = set()
    for m in IDENT.finditer(masked):
        n = m.group(1)
        if n not in wanted:
            continue
        # 属性访问；`...X`（展开）的最后两个点也长这样，早先一刀切把它整个漏掉了
        if m.start() > 0 and masked[m.start() - 1] == "." and masked[max(0, m.start() - 3) : m.start()] != "...":
            continue
        # 对象字面量的键：`NAME:` 且前面是 `{` 或 `,`（且不是 `?:` 三元里的冒号）
        if CODE_KEY(masked, m.end(), m.start()):
            continue
        found.add(n)
    return found


KEY_TAIL = re.compile(r"\s*:\s*(?!:)")
KEY_HEAD = re.compile(r"[,{]\s*$")


def CODE_KEY(masked: str, end: int, start: int) -> bool:
    """判断这个标识符是不是对象字面量的键（`{ NAME: v }` / `, NAME: v`）。"""
    if not KEY_TAIL.match(masked, end):
        return False
    return bool(KEY_HEAD.search(masked[:start]))


def source_path(rel: str) -> str:
    """把注释里的产物路径换回源码路径。

    注释是相对 `app/desktop/` 的：`../packages/protocol/dist/x.js` → `app/packages/protocol/src/x.ts`；
    `src/preload/v3-workbench/index.ts` → `app/desktop/src/preload/v3-workbench/index.ts`。
    """
    if rel.startswith("../packages/"):
        inner = rel[len("../packages/") :]
        pkg = inner.split("/", 1)[0]
        rest = inner[len(pkg) + 1 :]
        if rest.startswith("dist/"):
            rest = rest[len("dist/") :]
        return f"app/packages/{pkg}/src/{Path(rest).with_suffix('.ts').as_posix()}"
    if rel.startswith("../"):
        return rel[3:]
    return f"app/desktop/{Path(rel).with_suffix('.ts').as_posix()}"


def rel_import(from_path: str, to_path: str) -> str:
    """两个源码文件之间的相对 import 路径（仓库用 `.js` 后缀指向编译产物）。"""
    a = os.path.dirname(from_path)
    b = to_path
    rel = os.path.relpath(b, a).replace(os.sep, "/")
    if not rel.startswith("."):
        rel = "./" + rel
    return re.sub(r"\.tsx?$", ".js", rel)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="写出到输出目录")
    args = ap.parse_args()

    raw = Path(BUNDLE).read_text(encoding="utf-8")
    mods = split(raw)

    all_declared: set[str] = set()
    for m in mods:
        m["decl"] = declared(m["code"])
        m["src"] = source_path(m["path"])
        m["masked"] = mask(m["code"])
        all_declared.update(m["decl"])

    owner: dict[str, int] = {}
    for m in mods:
        for n in m["decl"]:
            owner.setdefault(n, m["index"])

    # 反过来判：拿**已声明的名字**去别的模块里找独立出现。声明的名字少而干净，
    # 比「收集所有引用再反查」可靠得多。
    exports: dict[int, set[str]] = {m["index"]: set() for m in mods}
    imports: dict[int, dict[str, set[str]]] = {m["index"]: {} for m in mods}
    for m in mods:
        for src_mod in mods:
            if src_mod["index"] == m["index"]:
                continue
            used = refs_of(m["masked"], set(src_mod["decl"]))
            if not used:
                continue
            exports[src_mod["index"]].update(used)
            imports[m["index"]].setdefault(src_mod["src"], set()).update(used)

    unowned = sorted(all_declared - set(owner))
    print(f"模块 {len(mods)} 个；有跨模块导出的 {sum(1 for v in exports.values() if v)} 个")
    print(f"有跨模块 import 的 {sum(1 for v in imports.values() if v)} 个")
    print(f"引用但全局都没有声明的名字（多半是宿主提供的全局）: {len(unowned)}")
    if unowned:
        print("   " + ", ".join(unowned[:18]))

    if args.write:
        out = Path(OUT_DIR)
        out.mkdir(parents=True, exist_ok=True)
        manifest = []
        for m in mods:
            body = m["code"]
            exp = exports[m["index"]]
            if exp:
                # 给需要外露的声明加 export（enum 的输出是 `var X;`，也要带上）
                for name in sorted(exp, key=len, reverse=True):
                    body = re.sub(
                        rf"(?m)^(?!export )((?:var|const|let|function|class)\s+{re.escape(name)}\b)",
                        r"export \1",
                        body,
                    )
            imp = imports[m["index"]]
            if imp:
                lines = [f'import {{ {", ".join(sorted(names))} }} from "{rel_import(m["src"], src)}";' for src, names in sorted(imp.items())]
                body = "\n".join(lines) + "\n\n" + body
            manifest.append({"src": m["src"], "bundlePath": m["path"], "chars": len(body), "exports": sorted(exp)})
            target = out / m["src"].replace("/", "__")
            target.write_text(body, encoding="utf-8")
        (out / "manifest.json").write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"已写出 {len(manifest)} 个模块到 {OUT_DIR}")

    Path(MAP_PATH).parent.mkdir(parents=True, exist_ok=True)


if __name__ == "__main__":
    main()
