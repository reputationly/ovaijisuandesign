// 给每条顶层语句归类：lib（名字在第三方包里出现过）/ app / unknown，并按连续段汇总。
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const LIBS = new URL("./libs/node_modules/", import.meta.url).pathname;
const top = JSON.parse(readFileSync(new URL("./toplevel.json", import.meta.url), "utf8"));

// 1. 名字索引：name -> Set(package)
const index = new Map();
const DECL = /(?:^|[\s;{}(,])(?:function\*?|class)\s+([A-Za-z_$][\w$]*)|(?:^|[\s;{}])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*[=;,]|(?:^|[\s;{}])(?:enum)\s+([A-Za-z_$][\w$]*)/g;
function pkgOf(file) {
  const rel = path.relative(LIBS, file).split(path.sep);
  return rel[0].startsWith("@") ? `${rel[0]}/${rel[1]}` : rel[0];
}
function walk(dir) {
  for (const n of readdirSync(dir)) {
    if (n === "test" || n === "tests" || n === "__tests__" || n === ".bin") continue;
    const p = path.join(dir, n);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(m?js|cjs)$/.test(n) && !/\.(min|d)\./.test(n) && st.size < 5_000_000) {
      const src = readFileSync(p, "utf8");
      const pkg = pkgOf(p);
      for (const m of src.matchAll(DECL)) {
        const name = m[1] ?? m[2] ?? m[3];
        if (!index.has(name)) index.set(name, new Set());
        index.get(name).add(pkg);
      }
    }
  }
}
walk(LIBS);
console.log("indexed names", index.size);

// 2. 归类
const base = (n) => n.replace(/\$\d+$/, "");
// Rollup 的 CommonJS 包装。requireX 只认 `function requireX() { if (hasRequiredX)` 这种写法：
// 官方也有 requireServerName 这类普通函数，按名字前缀会误删。
const CJS = /^(hasRequired[A-Z]|getDefaultExportFrom|commonjsGlobal|__vite|_mergeNamespaces|scriptRel|assetsURL|seen$)/;
const CJS_REQUIRE = /^function require[A-Z][\w$]*\(\) \{ if \(hasRequired/;
for (const s of top) {
  const ns = s.names.map(base);
  if (ns.length === 0) {
    s.kind = "unknown";
    continue;
  }
  if (ns.some((n) => CJS.test(n)) || CJS_REQUIRE.test(s.head) || /\{ exports: \{\} \}/.test(s.head)) {
    s.kind = "lib";
    s.pkgs = ["(cjs-wrapper)"];
    continue;
  }
  const hits = ns.map((n) => index.get(n));
  if (hits.every(Boolean)) {
    s.kind = "lib";
    s.pkgs = [...new Set(hits.flatMap((h) => [...h]))].slice(0, 4);
  } else s.kind = "app";
}

// 3. unknown 跟随前一条（连续段内通常同源）
for (let i = 0; i < top.length; i++) if (top[i].kind === "unknown") top[i].kind = i > 0 ? top[i - 1].kind : "lib";

// 4. 连续段
const runs = [];
for (const s of top) {
  const last = runs.at(-1);
  if (last && last.kind === s.kind) {
    last.end = s.end;
    last.count++;
    last.lines += s.lines;
  } else runs.push({ kind: s.kind, start: s.start, end: s.end, count: 1, lines: s.lines, first: s.names[0] ?? s.head.slice(0, 40) });
}
writeFileSync(new URL("./classified.json", import.meta.url), JSON.stringify(top));
writeFileSync(new URL("./runs.json", import.meta.url), JSON.stringify(runs));
const sum = (k) => top.filter((s) => s.kind === k).reduce((a, s) => a + s.lines, 0);
console.log("lines lib", sum("lib"), "app", sum("app"), "runs", runs.length);
