// 冲突分类：只看「4.0.3 相对 4.0.0 新引入了哪些标识符」，再判断我们树里有没有。
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const SRC = "app/renderer/src";
const ID = /[A-Za-z_$][\w$]*/g;
const KEYWORDS = new Set(("break case catch class const continue debugger default delete do else export extends false finally for function if import in instanceof new null return super switch this throw true try typeof var void while with yield let await async of static get set from as").split(" "));

function ids(code) {
  const s = new Set();
  for (const m of code.matchAll(ID)) {
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
const out = { applicable: [], needsNew: [], unknown: [] };
for (const c of report.conflicts) {
  const n = c.name;
  const a = grab("4.0.0", n), b = grab("4.0.3", n);
  if (!a || !b) { out.unknown.push({ file: c.file, name: n }); continue; }
  const added = [...ids(b)].filter((x) => !ids(a).has(x));
  const missing = added.filter((x) => !tree.has(x));
  (missing.length ? out.needsNew : out.applicable).push({ file: c.file, name: n, missing });
}
writeFileSync("/tmp/conflict-classes.json", JSON.stringify(out, null, 1));
console.log(`可直接应用 ${out.applicable.length} · 需要新符号 ${out.needsNew.length} · 定位不到 ${out.unknown.length}`);
console.log("\n可直接应用的前 15 条：");
for (const x of out.applicable.slice(0, 15)) console.log(`  ${x.file}  ::  ${x.name}`);
