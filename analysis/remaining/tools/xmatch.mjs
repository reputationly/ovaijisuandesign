// 跨模块声明配对：从种子对出发，F 形状相同就按占位符位置把自由引用一一配对，沿引用图传播（helper 也配对后再比较）。
// 形状不同时按 token diff 的相同段配对引用，继续传播，并记录差异。最后对指定文件里未覆盖的声明按 F/FN 形状哈希补种子。
import path from "node:path";
import { diffArrays } from "diff";
import { mask, refOrder } from "./xcanon.mjs";

const TOK = /\$F\d+|\$D|[A-Za-z_$][\w$]*|\d[\w.]*|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|\/(?:[^/\\\n]|\\.)+\/[a-z]*|\S/g;
const toks = (s) => s.match(TOK) || [];
const m$ = (x) => (/^\$F\d+$/.test(x) ? "$F" : x);

export function shortKey(k, roots = []) {
  if (!k.startsWith("/")) return k;
  let f = k.slice(0, k.lastIndexOf("#"));
  for (const r of roots) if (f.startsWith(r)) { f = path.relative(r, f); break; }
  return f + k.slice(k.lastIndexOf("#"));
}
export function display(shape, keyName) { return shape.F.replace(/\$F(\d+)/g, (_, i) => "«" + keyName(shape.refs[+i]) + "»"); }

function pairRefs(a, b, field) {
  const ra = refOrder(a[field]), rb = refOrder(b[field]);
  return ra.map((x, i) => [a.refs[x], b.refs[rb[i]]]);
}
function alignRefs(a, b) {
  const ta = toks(a.F), tb = toks(b.F);
  const parts = diffArrays(ta.map(m$), tb.map(m$));
  const out = []; let ia = 0, ib = 0; let changed = 0;
  for (const p of parts) {
    if (!p.added && !p.removed) {
      for (let k = 0; k < p.count; k++) { const x = ta[ia + k], y = tb[ib + k]; if (/^\$F\d+$/.test(x)) out.push([a.refs[+x.slice(2)], b.refs[+y.slice(2)]]); }
      ia += p.count; ib += p.count;
    } else if (p.added) { ib += p.count; changed += p.count; } else { ia += p.count; changed += p.count; }
  }
  return { pairs: out, changedTokens: changed, totalTokens: Math.max(ta.length, tb.length) };
}

export function match(sg, ng, seeds, { fallbackFiles = [], roots = [] } = {}) {
  const s2n = new Map(), n2s = new Map(), recs = [], conflicts = [];
  const q = seeds.map(([s, n]) => [s, n, "seed"]);
  const run = () => {
    while (q.length) {
      const [s, n, via] = q.shift();
      if (s2n.has(s) || n2s.has(n)) {
        if (s2n.get(s) !== n) conflicts.push({ s, n, via, srcAlreadyPairedWith: s2n.get(s) || null, npmAlreadyPairedWith: n2s.get(n) || null });
        continue;
      }
      s2n.set(s, n); n2s.set(n, s);
      const sI = sg.isInternal(s), nI = ng.isInternal(n);
      const rec = { s, n, via };
      if (!sI && !nI) rec.verdict = s === n ? "ext-same" : "ext-diff";
      else if (sI && !nI) rec.verdict = "src-inline/npm-ext";
      else if (!sI && nI) rec.verdict = "src-ext/npm-inline";
      else {
        const a = sg.shape(s), b = ng.shape(n);
        rec.bytes = a.bytes;
        if (a.err || b.err) { rec.verdict = "err"; rec.err = a.err || b.err; }
        else {
          let pairs;
          if (mask(a.F) === mask(b.F)) { rec.verdict = "exact"; pairs = pairRefs(a, b, "F"); }
          else if (mask(a.FN) === mask(b.FN)) { rec.verdict = "norm"; pairs = pairRefs(a, b, "FN"); }
          else { const al = alignRefs(a, b); rec.verdict = "diff"; pairs = al.pairs; rec.changedTokens = al.changedTokens; rec.totalTokens = al.totalTokens; }
          for (const [x, y] of pairs) q.push([x, y, s]);
        }
      }
      recs.push(rec);
    }
  };
  run();
  // 补种子：指定文件里还没配上的声明，按 F（再 FN）形状在 npm 图的全部声明里找唯一候选
  const npmIndex = (field) => {
    const idx = new Map();
    for (const m of ng.mods.values()) for (const d of m.decls.values()) {
      const k = m.file + "#" + d.name; const sh = ng.shape(k); if (sh.err) continue;
      const h = mask(sh[field]); if (!idx.has(h)) idx.set(h, []); idx.get(h).push(k);
    }
    return idx;
  };
  const fallback = [];
  for (let round = 0; round < 10; round++) {
    let added = 0;
    for (const field of ["F", "FN"]) {
      const idx = npmIndex(field);
      for (const f of fallbackFiles) for (const d of sg.mod(f).decls.values()) {
        const k = f + "#" + d.name; if (s2n.has(k)) continue;
        const sh = sg.shape(k); if (sh.err) continue;
        const c = (idx.get(mask(sh[field])) || []).filter((x) => !n2s.has(x));
        if (c.length === 1) { q.push([k, c[0], "fallback-" + field]); fallback.push({ s: k, n: c[0], field }); added++; }
      }
      run();
    }
    if (!added) break;
  }
  return { s2n, n2s, recs, conflicts, fallback };
}
