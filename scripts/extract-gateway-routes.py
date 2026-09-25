#!/usr/bin/env python3
"""静态提取官方 gateway 的 HTTP 路由（NestJS 装饰器）。

    python3 scripts/extract-gateway-routes.py [--app /Applications/MiniMax\\ Design.app]

为什么不再用 HILO_GATEWAY_VERBOSE_BOOT=1 让它自己打印：
跑起来的官方 gateway 会带着登录态同步 skill 市场、按远端版本覆写
~/.hub/skills/ —— 为了拿一张路由表去动用户机器上的状态，不值。

装饰器在 esbuild 产物里的形状（未混淆）：

    _ts_decorate9([ (0, import_common10.Get)("path"), ... ],
                  Cls.prototype, "method", null);
    Cls = _ts_decorate9([ (0, import_common10.Controller)("prefix"), ... ], Cls);

路径参数有时是常量（`Post(OPERATIONS_UNDO_PATH)`、`Post(API_PATHS.foo)`），
按 `var NAME = "..."` 和常量表 `var NAME = { key: "..." }` 解析。

只输出接口事实（方法 + 路径 + 控制器名），不含任何实现代码。
"""

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

DEFAULT_APP = Path("/Applications/MiniMax Design.app")
METHODS = ("Get", "Post", "Put", "Patch", "Delete", "All", "Sse")

# 方法装饰器块：_ts_decorateN([ ... ], Cls.prototype, "name", ...)
METHOD_BLOCK = re.compile(
    r"_ts_decorate\d*\(\[(?P<decos>(?:(?!_ts_decorate\d*\(\[).)*?)\],\s*"
    r"(?P<cls>[A-Za-z_$][\w$]*)\.prototype,\s*\"(?P<m>[^\"]+)\"",
    re.S,
)
# 类装饰器块：Cls = _ts_decorateN([ ... ], Cls)
CLASS_BLOCK = re.compile(
    r"(?P<cls>[A-Za-z_$][\w$]*)\s*=\s*_ts_decorate\d*\(\[(?P<decos>(?:(?!_ts_decorate\d*\(\[).)*?)\],\s*(?P=cls)\)",
    re.S,
)
DECO_HEAD = re.compile(r"\(0,\s*[\w$]+\.(?P<kind>Controller|" + "|".join(METHODS) + r")\)\(")
# 顶层常量：`var NAME = "…";` 或 `var NAME = OTHER.key.slice(1);`
CONST = re.compile(r"^var ([A-Z][A-Z0-9_]+) = (\"[^\"]*\"|[A-Z][A-Z0-9_]*(?:\.\w+)+(?:\.slice\(1\))?);", re.M)
# 常量表：`var NAME = {` … `};`，只取 `key: "…"` 这种平铺字符串成员
CONST_TABLE = re.compile(r"^var ([A-Z][A-Z0-9_]+) = \{\n(.*?)^\};", re.M | re.S)
TABLE_ENTRY = re.compile(r"^\s*(\w+): \"([^\"]*)\",?$", re.M)


def decorators(block: str):
    """(kind, arg) —— arg 按括号配对截取，常量表达式里会有 `.replace(/^\\//, "")`。"""
    for m in DECO_HEAD.finditer(block):
        yield m["kind"], balanced(block, m.end())


def load_consts(src: str) -> dict[str, str]:
    consts: dict[str, str] = {}
    for name, body in CONST_TABLE.findall(src):
        for key, val in TABLE_ENTRY.findall(body):
            consts[f"{name}.{key}"] = val
    for name, expr in CONST.findall(src):
        if expr.startswith('"'):
            consts[name] = expr[1:-1]
        elif (ref := expr.removesuffix(".slice(1)")) in consts:
            consts[name] = consts[ref]
    return consts


def resolve(arg: str, consts: dict[str, str]) -> list[str] | None:
    """装饰器参数 → 路径列表。解析不了返回 None（如实报出来，而不是猜）。"""
    # 前导斜杠无所谓（join 会统一），去掉这两种写法再解析
    arg = re.sub(r"\.replace\(/\^\\//,\s*\"\"\)$|\.slice\(1\)$", "", arg.strip())
    if not arg:
        return [""]
    if m := re.fullmatch(r"\"([^\"]*)\"|'([^']*)'", arg):
        return [m.group(1) if m.group(1) is not None else m.group(2)]
    if arg in consts:
        return [consts[arg]]
    if arg.startswith("[") and arg.endswith("]"):
        out = []
        for part in arg[1:-1].split(","):
            r = resolve(part, consts)
            if r is None:
                return None
            out += r
        return out
    return None


# 我们的 axum 路由：`.route("/path", get(a).post(b))`。参数按括号配对截取 ——
# 路由之间夹着注释行，靠"下一个 .route( 在哪"去断句会把后一条吞掉。
OUR_ROUTE_HEAD = re.compile(r"\.route\(\s*\"(?P<path>[^\"]+)\",")
OUR_METHOD = re.compile(r"\b(get|post|put|patch|delete)\(")


def balanced(text: str, start: int) -> str:
    """从 `start`（已在一个左括号之内）截到与之配对的右括号为止。"""
    i, depth = start, 1
    while i < len(text) and depth:
        depth += {"(": 1, ")": -1}.get(text[i], 0)
        i += 1
    return text[start:i - 1]


def norm(path: str) -> str:
    """两边的参数写法不同（`:id` / `{id}` / `{*path}`），比对前统一成 `:p` / `*`。"""
    path = re.sub(r"\{\*[^}]+\}|\*[A-Za-z_]\w*", "*", path)
    path = re.sub(r"\{[^}]+\}|:[A-Za-z_]\w*", ":p", path)
    return path


# 我们的 NestJS 路由：`@Controller("prefix")` 下的 `@Get("path")` / `@Post()` …
TS_CONTROLLER = re.compile(r'@Controller\(\s*(?:"([^"]*)")?\s*\)')
TS_METHOD = re.compile(r'@(Get|Post|Put|Patch|Delete|All)\(\s*(?:"([^"]*)")?\s*\)')


def load_ours_ts(src: Path) -> set[tuple[str, str]]:
    ours: set[tuple[str, str]] = set()
    for f in sorted(src.rglob("*.ts")):
        if f.name.endswith(".test.ts"):
            continue
        text = f.read_text(encoding="utf-8")
        events = sorted(
            [(m.start(), "c", m.group(1) or "", "") for m in TS_CONTROLLER.finditer(text)]
            + [(m.start(), "m", m.group(2) or "", m.group(1)) for m in TS_METHOD.finditer(text)]
        )
        prefix = None
        for _, kind, arg, method in events:
            if kind == "c":
                prefix = arg
            elif prefix is not None:
                ours.add((method.upper(), norm(join(prefix, arg))))
    return ours


def load_ours(src: Path) -> set[tuple[str, str]]:
    ours: set[tuple[str, str]] = set()
    if src.is_dir() and any(src.rglob("*.module.ts")):
        return load_ours_ts(src)
    for f in sorted(src.rglob("*.rs")) if src.is_dir() else [src]:
        text = f.read_text(encoding="utf-8")
        for m in OUR_ROUTE_HEAD.finditer(text):
            for method in OUR_METHOD.findall(balanced(text, m.end())):
                ours.add((method.upper(), norm(m["path"])))
    return ours


def app_version(app: Path) -> str:
    m = re.search(
        r"<key>CFBundleShortVersionString</key>\s*<string>([^<]+)</string>",
        (app / "Contents/Info.plist").read_text(encoding="utf-8", errors="replace"),
    )
    return m.group(1) if m else "unknown"


def join(prefix: str, path: str) -> str:
    p = "/".join(s.strip("/") for s in (prefix, path) if s.strip("/"))
    return "/" + p


def routes_from_app(app: Path) -> tuple[set[tuple[str, str, str]], list[str]]:
    src = (app / "Contents/Resources/gateway/dist/main.js").read_text(encoding="utf-8")
    consts = load_consts(src)

    prefixes: dict[str, list[str]] = {}
    for m in CLASS_BLOCK.finditer(src):
        for kind, arg in decorators(m["decos"]):
            if kind == "Controller":
                prefixes[m["cls"]] = resolve(arg, consts) or [f"<{arg}>"]

    routes: set[tuple[str, str, str]] = set()
    unresolved: list[str] = []
    for m in METHOD_BLOCK.finditer(src):
        cls = m["cls"]
        for kind, arg in decorators(m["decos"]):
            if kind == "Controller":
                continue
            paths = resolve(arg, consts)
            if paths is None:
                unresolved.append(f"{cls}.{m['m']}: {kind}({arg})")
                continue
            if cls not in prefixes:
                unresolved.append(f"{cls}.{m['m']}: 类上没有 Controller 装饰器")
                continue
            for pre in prefixes[cls]:
                for p in paths:
                    routes.add((kind.upper(), join(pre, p), cls))

    return routes, unresolved


DOC_VERSION = re.compile(r"MiniMax Design \*\*([^*]+)\*\*")
DOC_CLASS = re.compile(r"^## (\w+)（\d+/\d+）$")
DOC_ROUTE = re.compile(r"^[✓ ] (GET|POST|PUT|PATCH|DELETE|ALL)\s+(\S+)$")


def routes_from_doc(doc: Path) -> tuple[set[tuple[str, str, str]], str]:
    text = doc.read_text(encoding="utf-8")
    m = DOC_VERSION.search(text)
    routes: set[tuple[str, str, str]] = set()
    cls = None
    for line in text.splitlines():
        if (c := DOC_CLASS.match(line)):
            cls = c.group(1)
        elif cls and (r := DOC_ROUTE.match(line)):
            routes.add((r.group(1), r.group(2), cls))
    return routes, m.group(1) if m else "unknown"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--app", type=Path, default=DEFAULT_APP)
    ap.add_argument("--out", type=Path, help="写 markdown；不给就打到 stdout")
    ap.add_argument("--ours", type=Path, default=Path(__file__).resolve().parent.parent / "app/gateway/src",
                    help="我们的 gateway 源码（NestJS 的 app/gateway/src，或旧的 Rust crates/gateway/src），用来标出哪些路由已经同名实现")
    ap.add_argument("--from-doc", type=Path,
                    help="不读应用，改从已有的 gateway-api.md 取路由清单，只重标 ✓（没装应用的环境用）")
    args = ap.parse_args()

    if args.from_doc:
        routes, version = routes_from_doc(args.from_doc)
        unresolved: list[str] = []
    else:
        routes, unresolved = routes_from_app(args.app)
        version = app_version(args.app)

    ours = load_ours(args.ours) if args.ours.exists() else set()
    done = {(m, p) for m, p, _ in routes if (m, norm(p)) in ours}

    by_cls: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for method, path, cls in routes:
        by_cls[cls].append((method, path))

    lines = [
        "# gateway HTTP 接口面",
        "",
        f"官方本地 gateway（MiniMax Design **{version}**）注册的全部路由。",
        "",
        "这是**要对齐的接口规格**：只要我们的 gateway 提供同样的路由和形状，",
        "官方的 mcp-tools 和渲染进程都能直接接上，反过来我们的前端也能接官方",
        "gateway —— 每一块都能单独和官方那块对跑。",
        "",
        "> 只记接口事实。响应形状去 `gateway/dist/main.js` 里核对，它没有混淆。",
        "> 由 `scripts/extract-gateway-routes.py` 从 NestJS 装饰器静态提取，应用升级后重跑。",
        "",
        f"共 {len(routes)} 条，{len(by_cls)} 个控制器。**我们同名同方法实现了 {len(done)} 条**",
        "（行首 `✓`；按 `app/gateway/src` 的 NestJS 装饰器比对，路径参数名不计）。",
        "",
    ]
    for cls in sorted(by_cls, key=lambda c: min(p for _, p in by_cls[c])):
        rows = sorted(by_cls[cls], key=lambda r: (r[1], r[0]))
        hit = sum((m, p) in done for m, p in rows)
        lines += [f"## {cls}（{hit}/{len(rows)}）", "", "```"]
        lines += [f"{'✓' if (m, p) in done else ' '} {m:<7}{p}" for m, p in rows]
        lines += ["```", ""]
    if unresolved:
        lines += ["## 未解析", "", *[f"- `{u}`" for u in unresolved], ""]

    text = "\n".join(lines)
    if args.out:
        args.out.write_text(text, encoding="utf-8")
        print(f"{len(routes)} 条路由（我们 {len(done)} 条）→ {args.out}", file=sys.stderr)
    else:
        print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
