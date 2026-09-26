// 内容核对：名字判为第三方的语句，抽出其中的字符串和属性名（打包不会改它们），
// 到声明过同名名字的库文件里找；命中率不够的改判为官方。
//   node 02b-verify.mjs <bundle.js>
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const traverse = _traverse.default;
const LIBS = new URL("./libs/node_modules/", import.meta.url).pathname;
const cls = JSON.parse(readFileSync(new URL("./classified.json", import.meta.url), "utf8"));
const src = readFileSync(process.argv[2], "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
const body = ast.program.body;

// name -> [file]
const index = new Map();
const DECL = /(?:^|[\s;{}(,])(?:function\*?|class)\s+([A-Za-z_$][\w$]*)|(?:^|[\s;{}])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*[=;,]|(?:^|[\s;{}])(?:enum)\s+([A-Za-z_$][\w$]*)/g;
function walk(dir) {
  for (const n of readdirSync(dir)) {
    if (n === "test" || n === "tests" || n === "__tests__" || n === ".bin") continue;
    const p = path.join(dir, n);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(m?js|cjs)$/.test(n) && !/\.(min|d)\./.test(n) && st.size < 5_000_000) {
      const text = readFileSync(p, "utf8");
      for (const m of text.matchAll(DECL)) {
        const name = m[1] ?? m[2] ?? m[3];
        if (!index.has(name)) index.set(name, new Set());
        index.get(name).add(p);
      }
    }
  }
}
walk(LIBS);
const texts = new Map();
const textOf = (f) => texts.get(f) ?? (texts.set(f, readFileSync(f, "utf8")), texts.get(f));
const pkgOf = (file) => {
  const rel = path.relative(LIBS, file).split(path.sep);
  return rel[0].startsWith("@") ? `${rel[0]}/${rel[1]}` : rel[0];
};

function tokensOf(node) {
  const set = new Set();
  const file = { type: "File", program: { type: "Program", body: [node], sourceType: "module", directives: [] } };
  traverse(file, {
    noScope: true,
    StringLiteral(p) {
      if (p.node.value.length >= 3 && p.node.value.length <= 80) set.add(p.node.value);
    },
    MemberExpression(p) {
      if (!p.node.computed && p.node.property.type === "Identifier" && p.node.property.name.length >= 3) set.add(p.node.property.name);
    },
    ObjectProperty(p) {
      if (!p.node.computed && p.node.key.type === "Identifier" && p.node.key.name.length >= 3) set.add(p.node.key.name);
    },
  });
  return [...set];
}

// 词的"文档频率"：在主 bundle 里出现于太多语句的词（className、children…）没有区分度，不参与核对。
const tokenCache = body.map((n, i) => (cls[i].kind === "lib" ? tokensOf(n) : null));
const df = new Map();
for (let i = 0; i < body.length; i++) for (const tk of tokenCache[i] ?? tokensOf(body[i])) df.set(tk, (df.get(tk) ?? 0) + 1);
const DF_MAX = 30;

// 官方代码的强特征：一票否决，任何规则都不能把它改判成第三方。
const TAILWIND = /\b(flex|items-center|justify-|gap-\d|px-\d|py-\d|rounded(-\w+)?|text-(xs|sm|base|lg|muted|foreground)|bg-(muted|card|background|foreground)|border-border)\b/g;
const APP_MARKER = (text) => text.includes("data-action-ui-id") || /\bt2\(["'`]/.test(text) || (text.match(TAILWIND) ?? []).length >= 3;
for (let i = 0; i < body.length; i++) {
  const text = src.slice(body[i].start, body[i].end);
  if (APP_MARKER(text)) {
    cls[i].marker = true;
    cls[i].kind = "app";
  } else delete cls[i].marker;
}

const base = (n) => n.replace(/\$\d+$/, "");
let demoted = 0;
let checked = 0;
for (let i = 0; i < cls.length; i++) {
  const s = cls[i];
  if (s.kind !== "lib" || (s.pkgs ?? [])[0] === "(cjs-wrapper)" || s.names.length === 0) continue;
  const toks = (tokenCache[i] ?? tokensOf(body[i])).filter((tk) => (df.get(tk) ?? 0) <= DF_MAX);
  if (toks.length < 3) {
    s.short = true; // 太短，没法核对；最后按相邻语句决定
    continue;
  }
  checked++;
  const files = new Set(s.names.flatMap((n) => [...(index.get(base(n)) ?? [])]));
  let best = 0;
  let bestFile = null;
  for (const f of files) {
    const text = textOf(f);
    const hit = toks.filter((tk) => text.includes(tk)).length / toks.length;
    if (hit > best) (best = hit), (bestFile = f);
  }
  if (best < 0.8) {
    s.kind = "app";
    s.demoted = Math.round(best * 100);
    demoted++;
  } else s.pkgs = [pkgOf(bestFile)];
}
// 太短没法核对的：前后最近的可核对语句都是第三方才算第三方，否则算官方（宁可多留官方代码）。
const verifiedLib = (i) => cls[i].kind === "lib" && !cls[i].short;
for (let i = 0; i < cls.length; i++) {
  if (!cls[i].short || cls[i].kind !== "lib") continue;
  let a = i - 1;
  while (a >= 0 && cls[a].short) a--;
  let b = i + 1;
  while (b < cls.length && cls[b].short) b++;
  if (!(a >= 0 && verifiedLib(a) && b < cls.length && verifiedLib(b))) {
    cls[i].kind = "app";
    demoted++;
  }
}
writeFileSync(new URL("./classified.json", import.meta.url), JSON.stringify(cls));
const sum = (k) => cls.filter((s) => s.kind === k).reduce((a, s) => a + s.lines, 0);
console.log({ checked, demoted, libLines: sum("lib"), appLines: sum("app") });
