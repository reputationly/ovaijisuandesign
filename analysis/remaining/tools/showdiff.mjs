// 打印 diff 记录中 src/npm 规范形状的差异片段（按词元 LCS）
import fs from "node:fs";
const [file, filt] = process.argv.slice(2);
const j = JSON.parse(fs.readFileSync(file, "utf8"));
const s2n = new Map(j.pairs.map((p) => [p.src, p.npm]));
const tok = (s) => s.replace(/«([^»]*)»/g, (_, k) => "«" + (s2n.get(k) || k).replace(/^.*#/, "") + "»").match(/«[^»]*»|\w+|\s+|./gs).filter((t) => !/^\s+$/.test(t));
for (const p of j.pairs) {
  if (p.verdict !== "diff" || (filt && !p.src.includes(filt))) continue;
  const a = tok(p.srcF), b = tok(p.npmF);
  const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let k = m - 1; k >= 0; k--) L[i][k] = a[i] === b[k] ? L[i + 1][k + 1] + 1 : Math.max(L[i + 1][k], L[i][k + 1]);
  const hunks = []; let i = 0, k = 0, cur = null;
  const flush = () => { if (cur) { hunks.push(cur); cur = null; } };
  while (i < n || k < m) {
    if (i < n && k < m && a[i] === b[k]) { flush(); i++; k++; continue; }
    cur ||= { at: i, ctx: a.slice(Math.max(0, i - 8), i).join(" "), s: [], n: [] };
    if (k < m && (i >= n || L[i][k + 1] >= L[i + 1][k])) cur.n.push(b[k++]); else cur.s.push(a[i++]);
  }
  flush();
  console.log(`\n### ${p.src} <-> ${p.npm} (${p.changedTokens}/${p.totalTokens})`);
  for (const h of hunks) console.log(`  …${h.ctx}\n    src: ${h.s.join(" ").slice(0, 400)}\n    npm: ${h.n.join(" ").slice(0, 400)}`);
}
