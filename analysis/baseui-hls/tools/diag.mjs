// node diag.mjs fam pkg ver [n] : 打印 diff 声明的首个差异处上下文
import { readFileSync } from "node:fs";
import path from "node:path";
import { indexOf } from "./index.mjs";
const ROOT = path.resolve(import.meta.dirname, "..");
const [fam, pkg, v, n = "40", only = "diff"] = process.argv.slice(2);
const closure = JSON.parse(readFileSync(path.join(ROOT, `closure-${fam}.json`)));
const per = JSON.parse(readFileSync(path.join(ROOT, `perstmt-${fam}.json`)))[`${pkg}@${v}`];
const r = indexOf(pkg, v);
const byName = new Map();
for (const d of r.decls) for (const nm of d.names) { if (!byName.has(nm)) byName.set(nm, []); byName.get(nm).push(d); }
let k = 0;
for (const [i, c] of per) {
  if (c !== only) continue;
  if (k++ >= +n) break;
  const s = closure[i];
  const cands = s.names.flatMap((nm) => byName.get(nm) || []);
  let best = cands[0], bp = -1;
  for (const d of cands) { let p = 0; while (p < d.A.length && d.A[p] === s.A[p]) p++; if (p > bp) { bp = p; best = d; } }
  console.log(`--- ${s.file}:${s.line} ${s.names.join(",")} vs ${best?.file}:${best?.line}  lenV=${s.A.length} lenD=${best?.A.length}`);
  if (best) { const p = Math.max(0, bp - 80); console.log("  V: " + s.A.slice(p, bp + 120)); console.log("  D: " + best.A.slice(p, bp + 120)); }
  else console.log("  V: " + s.A.slice(0, 200));
}
