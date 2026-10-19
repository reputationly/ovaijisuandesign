// 把渲染层入口 bundle 按「顶层语句」拆开、跨版本比对。
//
//   node scripts/refdiff/toplevel.mjs extract <bundle.js> <out.json>
//   node scripts/refdiff/toplevel.mjs diff <旧.json> <新.json> [--json <out.json>]
//
// 为什么按顶层语句：这个 bundle 不是压缩产物（名字、字符串、注释都在），但每次构建都会
// 重新编号、合并、拆模块，整文件 diff 全是噪声。顶层语句是源码里最接近「一个模块/一个函数」
// 的粒度，把它归一化后比对，能直接读出一张「新增了什么函数、改了哪些」的清单。
//
// 归一化口径沿用 scripts/decompile/02c-anchor.mjs 的 norm()：去掉注释和空白，
// 标识符一律抹成 `_`，关键字、字符串、属性名保留。这样打包改写的导入名不影响比对。
import { parse } from "@babel/parser";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { extractSignals } from "./signals.mjs";

const KEYWORDS = new Set(
  "break case catch class const continue debugger default delete do else export extends false finally for function if import in instanceof let new null return super switch this throw true try typeof var void while with yield async await of static get set undefined".split(" "),
);

export const normalizeStatement = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1")
    .replace(/\.\.\.\s*([A-Za-z_$][\w$]*)/g, (m, id) => (KEYWORDS.has(id) ? m : "..." + "_"))
    .replace(/(\.?)([A-Za-z_$][\w$]*)/g, (m, dot, id) => (dot || KEYWORDS.has(id) ? m : "_"))
    .replace(/_\.jsxs?\(/g, "_(")
    .replace(/_(\._)+/g, "_")
    .replace(/\s+/g, "")
    .replace(/,([}\])])/g, "$1");

// 每条语句带上「锚点」：能把它挂回我们源码的具体文件上去的字面量。
// 只留少量（每类封顶），因为一条语句里塞几百个字面量时，匹配反而会被噪声淹没。
const ANCHOR_CAP = { uiId: 12, i18nKey: 12, apiPath: 6, event: 6, route: 4, literals: 10 };

function anchorsOf(text) {
  const sig = extractSignals(text);
  const out = {};
  for (const kind of ["uiId", "i18nKey", "apiPath", "event", "route"]) {
    const values = [...sig[kind]];
    if (values.length) out[kind] = values.slice(0, ANCHOR_CAP[kind]).sort();
  }
  // 兜底字面量：给那些没有 UI id / 翻译键 / 接口路径的语句（工具函数、常量表）用。
  // 太短的（常是类名、单位）和带换行的都排除。
  const literals = new Set();
  for (const m of text.matchAll(/"([^"\\\n]{12,90})"/g)) {
    if (!/[\u4e00-\u9fa5]/.test(m[1]) && /^[\s\w.:/@-]+$/.test(m[1])) literals.add(m[1]);
  }
  if (literals.size) out.literals = [...literals].sort().slice(0, ANCHOR_CAP.literals);
  return out;
}

function extract(bundlePath, outPath) {
  const src = readFileSync(bundlePath, "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  const rows = ast.program.body.map((node, i) => {
    const text = src.slice(node.start, node.end);
    const normalized = normalizeStatement(text);
    const names = [];
    for (const d of node.declarations ?? []) if (d.id?.name) names.push(d.id.name);
    if (node.id?.name) names.push(node.id.name);
    return {
      i,
      type: node.type,
      names,
      size: normalized.length,
      sha: createHash("sha1").update(normalized).digest("hex"),
      anchors: anchorsOf(text),
      head: text.slice(0, 140).replace(/\s+/g, " "),
      // 字节区间：后面要按区间把语句整段取出来重新生成源码
      start: node.start,
      end: node.end,
    };
  });
  writeFileSync(outPath, `${JSON.stringify({ file: bundlePath, count: rows.length, parseErrors: ast.errors?.length ?? 0, rows })}\n`);
  console.log(`${bundlePath}: ${rows.length} 条顶层语句，解析错误 ${ast.errors?.length ?? 0} → ${outPath}`);
}

function diff(oldPath, newPath, outPath) {
  const a = JSON.parse(readFileSync(oldPath, "utf8"));
  const b = JSON.parse(readFileSync(newPath, "utf8"));
  const count = (rows) => {
    const m = new Map();
    for (const r of rows) m.set(r.sha, (m.get(r.sha) ?? 0) + 1);
    return m;
  };
  const A = count(a.rows);
  const B = count(b.rows);
  const same = [...A].reduce((n, [sha, c]) => n + Math.min(c, B.get(sha) ?? 0), 0);
  const onlyOld = [...A].reduce((n, [sha, c]) => n + Math.max(0, c - (B.get(sha) ?? 0)), 0);
  const onlyNew = [...B].reduce((n, [sha, c]) => n + Math.max(0, c - (A.get(sha) ?? 0)), 0);
  const nameCount = (rows, other, up) => {
    const acc = new Map();
    for (const r of rows) {
      const excess = up ? (B.get(r.sha) ?? 0) - (A.get(r.sha) ?? 0) : (A.get(r.sha) ?? 0) - (B.get(r.sha) ?? 0);
      if (excess <= 0) continue;
      for (const n of r.names.length ? r.names : ["(匿名)"]) acc.set(n, (acc.get(n) ?? 0) + 1);
    }
    void other;
    return acc;
  };
  const report = {
    old: { file: a.file, count: a.count },
    new: { file: b.file, count: b.count },
    same,
    onlyOld,
    onlyNew,
    sameRatioOfOld: a.count ? Number((same / a.count).toFixed(4)) : null,
    newNames: [...nameCount(b.rows, a, true)].sort((x, y) => y[1] - x[1]),
    goneNames: [...nameCount(a.rows, b, false)].sort((x, y) => y[1] - x[1]),
  };
  if (outPath) writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`顶层语句 ${a.count} → ${b.count}；归一化后一致 ${same}（占旧 ${(100 * report.sameRatioOfOld).toFixed(1)}%），只在旧 ${onlyOld}，只在新 ${onlyNew}`);
  console.log("\n只在新版的声明名（前 40）：");
  for (const [n, c] of report.newNames.slice(0, 40)) console.log(`  ${n}${c > 1 ? ` ×${c}` : ""}`);
  console.log("\n只在旧版的声明名（前 20）：");
  for (const [n, c] of report.goneNames.slice(0, 20)) console.log(`  ${n}${c > 1 ? ` ×${c}` : ""}`);
  return report;
}

// 作为库被 import 时不要跑 CLI（verify-restore.mjs 会 import 这个文件的 normalizeStatement）。
if (import.meta.url === `file://${process.argv[1]}`) {
  const [mode, ...rest] = process.argv.slice(2);
  if (mode === "extract" && rest.length >= 2) extract(rest[0], rest[1]);
  else if (mode === "diff" && rest.length >= 2) diff(rest[0], rest[1], rest.includes("--json") ? rest[rest.indexOf("--json") + 1] : null);
  else {
    console.error("用法：\n  node scripts/refdiff/toplevel.mjs extract <bundle.js> <out.json>\n  node scripts/refdiff/toplevel.mjs diff <旧.json> <新.json> [--json <out.json>]");
    process.exit(2);
  }
}
