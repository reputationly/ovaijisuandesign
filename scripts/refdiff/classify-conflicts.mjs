// 冲突分类：只看「4.0.3 相对 4.0.0 新引入了哪些标识符」，再判断我们树里有没有。
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const SRC = "app/renderer/src";
const ID = /[A-Za-z_$][\w$]*/g;
const KEYWORDS = new Set(("break case catch class const continue debugger default delete do else export extends false finally for function if import in instanceof new null return super switch this throw true try typeof var void while with yield let await async of static get set from as").split(" "));

/**
 * 抹掉模块路径字符串。`"./use-window-chrome-CUz-LN6G.js"` 里的 CUz / LN6G
 * 会被标识符正则抓成"新符号"，实际是 chunk 内容哈希的片段（第 72 轮修）。
 */
function stripModulePaths(code) {
  return code
    .replace(/["'][^"']*\.(?:js|mjs|cjs|css|json|woff2?|png|svg)["']/g, '""')
    .replace(/["']\.\/[^"']*["']/g, '""');
}

/**
 * 参照 bundle 里的**顶层声明名集合**（第 77 轮）。
 *
 * 为什么用「行首第 0 列」而不是 AST：这份 bundle 是未压缩的，
 * 顶层声明一律顶格写、组件内部的 const/let 都有缩进。
 * 实测：顶层 19,958 个名字；suggestionMarkId / promptSuggestion / setProbeFailed
 * 这些组件内局部变量都不在集合里，而 MediaReveal / CollapsiblePresence 在。
 * 比 grab() 可靠得多（grab 只证明「这个名字在文件里出现过」）。
 */
const topNamesCache = {};
function topNames(ver) {
  if (!topNamesCache[ver]) {
    const dir = `\.probe/reference/${ver}/asar/out/renderer/assets`;
    const set = new Set();
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".js")) continue;
      for (const line of readFileSync(path.join(dir, f), "utf8").split("\n")) {
        const m = /^(?:function|const|var|class|let)\s+([A-Za-z_$][\w$]*)/.exec(line);
        if (m) set.add(m[1]);
      }
    }
    topNamesCache[ver] = set;
  }
  return topNamesCache[ver];
}

function ids(code) {
  const s = new Set();
  for (const m of stripModulePaths(code).matchAll(ID)) {
    const w = m[0];
    if (!KEYWORDS.has(w) && w.length > 1) s.add(w);
  }
  return s;
}

// 我们树里出现过的所有标识符
const tree = new Set();
(function walk(d) {
  for (const name of readdirSync(d)) {
    const abs = path.join(d, name);
    const st = statSync(abs);
    if (st.isDirectory()) { if (name !== "node_modules") walk(abs); continue; }
    if (!/\.(js|jsx|ts|tsx)$/.test(name)) continue;
    for (const w of readFileSync(abs, "utf8").matchAll(ID)) tree.add(w[0]);
  }
})(SRC);

const cache = {};
function allsrc(ver) {
  if (!cache[ver]) {
    cache[ver] = readdirSync(`.probe/reference/${ver}/asar/out/renderer/assets`)
      .filter((f) => f.endsWith(".js"))
      .map((f) => readFileSync(`.probe/reference/${ver}/asar/out/renderer/assets/${f}`, "utf8"));
  }
  return cache[ver];
}
function grab(ver, n) {
  for (const s of allsrc(ver)) {
    for (const pat of [`function ${n}(`, `const ${n} =`, `class ${n} `]) {
      const i = s.indexOf(pat);
      if (i > 0) {
        const j = s.indexOf("\nfunction ", i + 10);
        return s.slice(i, j > 0 ? j : i + 2500);
      }
    }
  }
  return "";
}

const report = JSON.parse(readFileSync(".probe/refdiff/merge-report.json", "utf8"));
/** 在我们源码的某个文件里按名字取出语句（与 bundle 侧同样的抓取方式）。 */
function grabOurs(file, n) {
  let s;
  try { s = readFileSync(path.join(SRC, file), "utf8"); } catch { return ""; }
  for (const pat of [`function ${n}(`, `const ${n} =`, `class ${n} `]) {
    const i = s.indexOf(pat);
    if (i > 0) {
      const j = s.indexOf("\nfunction ", i + 10);
      return s.slice(i, j > 0 ? j : i + 2500);
    }
  }
  return "";
}

const out = { applied: [], sameUpstream: [], applicable: [], needsNew: [], unknown: [] };
for (const c of report.conflicts) {
  const n = c.name;
  const a = grab("4.0.0", n), b = grab("4.0.3", n);
  if (!a || !b) { out.unknown.push({ file: c.file, name: n }); continue; }
  // 第 33 轮：4.0.0 与 4.0.3 逐字相同 -> 上游没改这一条，冲突是「同名配对」噪声，直接跳过。
  // 实测 isRecord$d/$e/$f、parseHomeSurvey、attachHandoffTargets 都是这一类。
  if (a === b) { out.sameUpstream.push({ file: c.file, name: n }); continue; }
  const added = [...ids(b)].filter((x) => !ids(a).has(x));
  const missing = added.filter((x) => {
    if (tree.has(x)) return false;
    // 第 76 轮：必须能在参照里找到**模块级声明**才算"缺的符号"。
    // 4.0.3 那段代码新引入的局部变量（useState / 参数，如 setProbeFailed、promptSuggestion）
    // 在模块级找不到定义，它们不是我们要新建的东西 —— 这一类占了上一轮 35 条里的大多数。
    if (!topNames("4.0.3").has(x)) return false;
    // rollup 避让改名：stopWatching2 / rowKey2 / initialText2 之类，
    // 若去掉尾随数字的基名在树里，就不是新符号（第 72 轮加）。
    const base = x.replace(/\d+$/, "");
    return base === x || !tree.has(base);
  });
  if (missing.length) { out.needsNew.push({ file: c.file, name: n, missing }); continue; }
  // 第 32 轮：先判「是不是已经应用了」——把我们源码里的同名语句取出来，
  // 与 4.0.3 版本做归一化比较，相同就不用再列进待办（上一轮就因此白核对了 1/3 的时间）。
  const ours = grabOurs(c.file, n);
  const norm = (x) => x.replace(/\$(?:\d+|\w+)\b/g, "").replace(/\b([A-Za-z_$][\w$]*?)(\d+)\b/g, "$1").replace(/\s+/g, "");
  if (ours && norm(ours) === norm(b)) { out.applied.push({ file: c.file, name: n }); continue; }
  out.applicable.push({ file: c.file, name: n, missing });
}
writeFileSync("/tmp/conflict-classes.json", JSON.stringify(out, null, 1));
console.log(`已应用 ${out.applied.length} · 上游未改(噪声) ${out.sameUpstream.length} · 可直接应用 ${out.applicable.length} · 需要新符号 ${out.needsNew.length} · 定位不到 ${out.unknown.length}`);
console.log("\n可直接应用的前 15 条：");
for (const x of out.applicable.slice(0, 15)) console.log(`  ${x.file}  ::  ${x.name}`);
