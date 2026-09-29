// 锚点：逐字比对确定是第三方的，带官方强特征确定是官方的。之后的规则不许改锚点。
//   lib 锚点：语句去掉空白 / 注释 / $N 后缀后，在声明过同名名字的库文件里原样出现
//   app 锚点：data-action-ui-id、t2("…") 翻译调用、Tailwind 类名串
import { parse } from "@babel/parser";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const LIBS = new URL("./libs/node_modules/", import.meta.url).pathname;
const cls = JSON.parse(readFileSync(new URL("./classified.json", import.meta.url), "utf8"));
const src = readFileSync(process.argv[2], "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
const body = ast.program.body;

// 比"形状"：去掉注释和空白，变量名（不跟在 . 后面的标识符）一律换成 _，关键字、字符串、属性名保留。
// 打包会改写导入进来的名字（React.useState → reactExports.useState，_jsx → jsxRuntimeExports.jsx），
// 这样比对不受影响。
const KEYWORDS = new Set("break case catch class const continue debugger default delete do else export extends false finally for function if import in instanceof let new null return super switch this throw true try typeof var void while with yield async await of static get set undefined".split(" "));
const norm = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1")
    // 展开 `...x` / `...x` 里的 x 也要抹掉：正则的 `(\.?)` 前缀在 `...x` 上匹配不到分隔符，
    // 于是 `...state2` 原样留着，而同一模板的 `...state` 会被抹成 `..._`——两个版本的同一段
    // 代码因此对不上（下一条规则 `_(\._)+` 也救不了，因为压根没变成 `_`）。
    .replace(/\.\.\.\s*([A-Za-z_$][\w$]*)/g, (m, id) => (KEYWORDS.has(id) ? m : "..." + "_"))
    .replace(/(\.?)([A-Za-z_$][\w$]*)/g, (m, dot, id) => (dot || KEYWORDS.has(id) ? m : "_"))
    .replace(/_\.jsxs?\(/g, "_(")
    .replace(/_(\._)+/g, "_")
    .replace(/\s+/g, "")
    .replace(/,([}\])])/g, "$1");

// 名字 -> 声明它的库文件
const index = new Map();
const DECL = /(?:^|[\s;{}(,])(?:function\*?|class)\s+([A-Za-z_$][\w$]*)|(?:^|[\s;{}])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*[=;,]|(?:^|[\s;{}])(?:enum)\s+([A-Za-z_$][\w$]*)/g;
const allFiles = [];
function walk(dir) {
  for (const n of readdirSync(dir)) {
    if (n === "test" || n === "tests" || n === "__tests__" || n === ".bin") continue;
    const p = path.join(dir, n);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(m?js|cjs)$/.test(n) && !/\.d\./.test(n) && st.size < 8_000_000) {
      allFiles.push(p);
      for (const m of readFileSync(p, "utf8").matchAll(DECL)) {
        const name = m[1] ?? m[2] ?? m[3];
        if (!index.has(name)) index.set(name, new Set());
        index.get(name).add(p);
      }
    }
  }
}
walk(LIBS);
const normCache = new Map();
const normOf = (f) => normCache.get(f) ?? (normCache.set(f, norm(readFileSync(f, "utf8"))), normCache.get(f));
const pkgOf = (file) => {
  const rel = path.relative(LIBS, file).split(path.sep);
  return rel[0].startsWith("@") ? `${rel[0]}/${rel[1]}` : rel[0];
};

const TAILWIND = /\b(flex|items-center|justify-|gap-\d|px-\d|py-\d|rounded(-\w+)?|text-(xs|sm|base|lg|muted|foreground)|bg-(muted|card|background|foreground)|border-border)\b/g;
const isAppMarked = (text) => text.includes("data-action-ui-id") || /\bt2\(["'`]/.test(text) || (text.match(TAILWIND) ?? []).length >= 3;
const base = (n) => n.replace(/\$\d+$/, "");

let libAnchors = 0;
let appAnchors = 0;
for (let i = 0; i < body.length; i++) {
  const s = cls[i];
  delete s.anchor;
  const text = src.slice(body[i].start, body[i].end);
  if (isAppMarked(text)) {
    s.anchor = "app";
    appAnchors++;
    continue;
  }
  const n = norm(text);
  if (n.length < 60) continue; // 太短，逐字命中不说明问题
  // 长语句只比对前 400 个字符：足够唯一，也避开 rollup 在尾部做的少量改写
  const probe = n.slice(0, 400);
  const files = new Set(s.names.flatMap((nm) => [...(index.get(base(nm)) ?? [])]));
  for (const f of files) {
    if (normOf(f).includes(probe)) {
      s.anchor = "lib";
      s.pkgs = [pkgOf(f)];
      libAnchors++;
      break;
    }
  }
}
for (const s of cls) if (s.anchor) s.kind = s.anchor;
writeFileSync(new URL("./classified.json", import.meta.url), JSON.stringify(cls));
const lines = (k) => cls.filter((s) => s.anchor === k).reduce((a, s) => a + s.lines, 0);
console.log({ libAnchors, libAnchorLines: lines("lib"), appAnchors, appAnchorLines: lines("app"), undecided: cls.filter((s) => !s.anchor).length });
