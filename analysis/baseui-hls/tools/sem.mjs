// node sem.mjs pkg@ver[,pkg@ver...] out.txt : 对 perstmt 中 diff 的声明，逐 token 列出 N 形状的全部差异块
import { readFileSync, writeFileSync } from "node:fs";
import * as diffPkg from "diff";
import { indexOf } from "./index.mjs";
const R = "/home/ubuntu/baseui-hls-analysis/";
const [keys, out] = process.argv.slice(2);
const closure = JSON.parse(readFileSync(R + "closure-baseui.json"));
const per = JSON.parse(readFileSync(R + "perstmt-baseui.json"));
const tok = (a) => a.match(/[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|"(?:[^"\\]|\\.)*"|\S/g) || [];
const lines = [];
const done = new Set();
for (const key of keys.split(",")) {
  const at = key.lastIndexOf("@"); const pkg = key.slice(0, at), v = key.slice(at + 1);
  const r = indexOf(pkg, v);
  const byName = new Map(); for (const d of r.decls) for (const n of d.names) { if (!byName.has(n)) byName.set(n, []); byName.get(n).push(d); }
  for (const [i, c] of per[key]) {
    if (c !== "diff" || done.has(i)) continue;
    const s = closure[i];
    const cs = s.names.flatMap((n) => byName.get(n) || []);
    let best = null, bc = -1;
    for (const d of cs) { let common = 0; const ch = diffPkg.diffArrays(tok(d.N), tok(s.N)); for (const x of ch) if (!x.added && !x.removed) common += x.count; if (common > bc) { bc = common; best = { d, ch }; } }
    done.add(i);
    lines.push(`### ${s.file}:${s.line} ${s.names.join(",")}  <- ${key} ${best.d.file}:${best.d.line}`);
    const ch = best.ch;
    for (let k = 0; k < ch.length; k++) {
      const x = ch[k];
      if (!x.added && !x.removed) continue;
      const prev = ch[k - 1] && !ch[k - 1].added && !ch[k - 1].removed ? ch[k - 1].value.slice(-12).join("") : "";
      let del = "", add = "";
      while (k < ch.length && (ch[k].added || ch[k].removed)) { if (ch[k].removed) del += ch[k].value.join(" "); else add += ch[k].value.join(" "); k++; }
      const next = ch[k] ? ch[k].value.slice(0, 10).join("") : "";
      lines.push(`  …${prev}  [dist: ${del.slice(0, 400)}]  [vendor: ${add.slice(0, 400)}]  ${next}…`);
      k--;
    }
  }
}
writeFileSync(out, lines.join("\n") + "\n");
console.log(lines.length);
