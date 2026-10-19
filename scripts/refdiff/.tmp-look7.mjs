import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import { restoreStatementText } from "./restore-statement.mjs";
import { atomsOf, changeRegions, lcsPairs } from "./token-merge.mjs";
const oldRows = JSON.parse(readFileSync(".probe/refdiff/toplevel-3.0.21.json", "utf8")).rows;
const oldSrc = readFileSync(".probe/reference/3.0.21/asar/out/renderer/assets/index-ZNI5SgRm.js", "utf8");
const report = JSON.parse(readFileSync(".probe/refdiff/apply-delta-report.json", "utf8"));
const oursIn = (file, name) => {
  const text = readFileSync(path.join("app/renderer/src", file), "utf8");
  const ast = parse(text, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true });
  for (const n of ast.program.body) {
    const names = [...(n.declarations ?? []).map((d) => d.id?.name), n.id?.name].filter(Boolean);
    if (names.includes(name)) return text.slice(n.start, n.end);
  }
  return null;
};
const cands = [];
for (const f of report.files) for (const e of f.edits) if (e.kind === "conflict") cands.push({ file: f.file, name: e.name });
let shown = 0;
for (const c of cands) {
  if (shown >= 8) break;
  const mine = oursIn(c.file, c.name);
  if (!mine) continue;
  const hits = oldRows.filter((r) => (r.names ?? []).includes(c.name));
  if (!hits.length) continue;
  const ma = atomsOf(mine);
  let best = null, bestScore = -1;
  for (const h of hits) {
    const code = (await restoreStatementText(oldSrc.slice(h.start, h.end))).code;
    const oa = atomsOf(code);
    const s = lcsPairs(oa.map(x=>x.norm), ma.map(x=>x.norm)).length / Math.max(oa.length, ma.length, 1);
    if (s > bestScore) { bestScore = s; best = { oa, code }; }
  }
  const on = best.oa.map(x=>x.norm), mn = ma.map(x=>x.norm);
  const regions = changeRegions(on, new Map(lcsPairs(on, mn)), mn.length);
  const changed = regions.reduce((s, r) => s + (r.oldTo - r.oldFrom) + (r.otherTo - r.otherFrom), 0);
  if (changed === 0 || changed > 2) continue;
  shown += 1;
  console.log(`\n### ${c.name} @ ${c.file}  (改动 ${changed} 个原子)`);
  for (const r of regions.slice(0, 2)) {
    const ctx = (atoms, from, to) => {
      const before = atoms.slice(Math.max(0, from - 3), from).map((x) => x.norm).join(" ");
      const mid = atoms.slice(from, to).map((x) => x.norm).join(" ");
      const after = atoms.slice(to, to + 3).map((x) => x.norm).join(" ");
      return `${before}  ⟨⟨${mid}⟩⟩  ${after}`;
    };
    void ctx;
    const slice = (atoms, code, from, to) => {
      const a = atoms[Math.max(0, from - 4)];
      const b = atoms[Math.min(atoms.length - 1, to + 3)];
      return code.slice(a ? a.start : 0, b ? b.end : undefined).replace(/\s+/g, " ").slice(0, 150);
    };
    console.log(`   旧: ${slice(best.oa, best.code, r.oldFrom, r.oldTo)}`);
    console.log(`   我: ${slice(ma, mine, r.otherFrom, r.otherTo)}`);
  }
}
