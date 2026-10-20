/**
 * 按参照 chunk 统计还原覆盖率（第 216 轮）。
 *
 * 口径换成「参照里的每个 chunk 文件，我们树里有多少比例的声明已经存在」，
 * 而不是「bundle 里有多少声明没匹配上」——后者会把同一模块的不同组织方式算成缺口。
 *
 * 匹配用**函数体哈希**（不靠名字），并对 `$n` 后缀做归一化后再算一次，
 * 以覆盖「我们改了局部变量名」的情况。
 *
 * 用法：node scripts/v3preload/chunk-coverage.mjs [--top N]
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const ASSETS = ".probe/reference/4.0.0/asar/out/renderer/assets";
const ROOT = "app/renderer/src";
const NPM_SIGNS = /(React\.|createElement|__SECRET_INTERNALS|prosemirror|@tiptap|floating-ui|react-dom|scheduler|zustand|immer|dagre|xyflow|tippy|rehype|remark|unified\(|micromark)/;
const DECL = /^(?:export\s+)?(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/;

const norm = (s) =>
  createHash("sha256")
    .update(s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ").replace(/\s+/g, ""))
    .digest("hex").slice(0, 16);
// 归一化：去掉 $n 后缀后再算一次，覆盖「我们改了名字」的情况
const loose = (s) =>
  createHash("sha256")
    .update(s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ")
      .replace(/\$[0-9A-Za-z_]+/g, "")
      .replace(/\b([A-Za-z_$][\w$]*)\d+\b/g, "$1")
      .replace(/\s+/g, ""))
    .digest("hex").slice(0, 16);

function decls(lines) {
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    const m = DECL.exec(lines[i]);
    if (m) starts.push({ i, name: m[1] });
  }
  const out = [];
  for (let k = 0; k < starts.length; k++) {
    const a = starts[k].i;
    const b = k + 1 < starts.length ? starts[k + 1].i - 1 : lines.length - 1;
    const body = lines.slice(a, b + 1).join("\n");
    if (body.replace(/\s+/g, "").length < 200) continue;
    const npmish = NPM_SIGNS.test(body);
    out.push({ name: starts[k].name, strict: norm(body), loose: loose(body), npmish });
  }
  return out;
}

// 树内索引
const treeStrict = new Set(), treeLoose = new Set(), treeNames = new Set();
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = path.join(d, e);
    const st = statSync(p);
    if (st.isDirectory()) { if (e !== "node_modules") walk(p); }
    else if (/\.(js|jsx)$/.test(e) && !/\.test\./.test(p)) {
      const ls = readFileSync(p, "utf8").split("\n");
      for (const dd of decls(ls)) {
        treeStrict.add(dd.strict); treeLoose.add(dd.loose);
      }
      // 名字级匹配：我们把参照的 chunk 拆成了多文件、改了局部变量名，
      // 哈希会失配，但顶层名字通常保留。
      for (const l of ls) {
        const m = DECL.exec(l);
        if (m) treeNames.add(m[1]);
      }
    }
  }
})(ROOT);

const chunks = readdirSync(ASSETS).filter((f) => f.endsWith(".js") && !/__vite-browser-external/.test(f));
const rows = [];
for (const f of chunks) {
  const lines = readFileSync(path.join(ASSETS, f), "utf8").split("\n");
  const ds = decls(lines);
  if (!ds.length) continue;
  let strict = 0, looseHit = 0, byNameHit = 0, appTotal = 0, appHit = 0;
  for (const d of ds) {
    const byName = treeNames.has(d.name);
    const hit = treeStrict.has(d.strict) || treeLoose.has(d.loose) || byName;
    if (treeStrict.has(d.strict)) strict++; else if (treeLoose.has(d.loose)) looseHit++;
    else if (byName) byNameHit++;
    if (!d.npmish) { appTotal++; if (hit) appHit++; }
  }
  rows.push({ chunk: f, total: ds.length, strict, loose: looseHit, byName: byNameHit,
    appTotal, appHit, pct: (strict + looseHit) / ds.length,
    appPct: appTotal ? appHit / appTotal : 0 });
}
rows.sort((a, b) => b.total - a.total);
const top = process.argv.includes("--top") ? Number(process.argv[process.argv.indexOf("--top") + 1]) : rows.length;
console.log(`参照 chunk ${rows.length} 个（≥200 字符声明）\n`);
console.log("chunk".padEnd(38) + "声明  应用  命中   应用覆盖");
for (const r of rows.slice(0, top)) {
  console.log(`${r.chunk.padEnd(38)}${String(r.total).padStart(5)}${String(r.appTotal).padStart(6)}${String(r.appHit).padStart(6)}   ${(r.appPct * 100).toFixed(1)}%`);
}
const tot = rows.reduce((s, r) => s + r.total, 0);
const hit = rows.reduce((s, r) => s + r.strict + r.loose, 0);
// `index-*.js` 是 vendor 共享块（react / tiptap / base-ui 等打进主入口的那部分），
// 我们通过 npm import，不该按行还原。具名 chunk 才是应用自己的懒加载模块。
const named = rows.filter((r) => !/^index-/.test(r.chunk));
const nTot = named.reduce((s, r) => s + r.appTotal, 0);
const nHit = named.reduce((s, r) => s + r.appHit, 0);
console.log(`\n具名应用 chunk：${named.length} 个，${nTot} 个声明，命中 ${nHit}（${(nHit / nTot * 100).toFixed(1)}%）`);
const zero = named.filter((r) => r.appTotal >= 20 && r.appPct === 0).map((r) => r.chunk);
console.log(`完全未还原的具名 chunk（≥20 声明）：${zero.length} 个`);
for (const z of zero.slice(0, 12)) {
  const row = named.find((r) => r.chunk === z);
  console.log(`   ${z.padEnd(40)} ${row.appTotal} 个声明`);
}
const appTot = rows.reduce((s, r) => s + r.appTotal, 0);
const appHit = rows.reduce((s, r) => s + r.appHit, 0);
console.log(`\n全量：${tot} 个声明，命中 ${hit}（${(hit / tot * 100).toFixed(1)}%）`);
console.log(`仅应用代码：${appTot} 个，命中 ${appHit}（${(appHit / appTot * 100).toFixed(1)}%）`);
