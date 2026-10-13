// 任务 2：chat/streamdown.jsx 及其导入文件 对 streamdown 各版本做跨模块配对
import fs from "node:fs"; import path from "node:path";
import { Graph } from "./xcanon.mjs"; import { match, shortKey, display } from "./xmatch.mjs";
const SRC = process.env.SRC || "/home/ubuntu/wt-desource/app/renderer/src";
const PKGS = process.env.PKGS || "/home/ubuntu/ana/pkgs";
const OUT = process.argv[2] || "/home/ubuntu/wt-analysis/analysis/remaining/streamdown";
fs.mkdirSync(OUT, { recursive: true });
const roots = [SRC + "/", PKGS + "/"];
const kn = (k) => shortKey(k, roots);
const SD = path.join(SRC, "chat/streamdown.jsx");
// streamdown.jsx 直接导入的本地文件 + s2.js + 改名后的 highlighted-body 组件
const sg0 = new Graph(); const m0 = sg0.mod(SD);
const { resolveFile } = await import("./xcanon.mjs");
const local = new Set([SD]);
for (const im of m0.imports.values()) if (im.from.startsWith(".")) { const f = resolveFile(SD, im.from); if (f && !f.endsWith("/vendor.js")) local.add(f); }
for (const f of ["chat/highlighted-code-block-body.js", "chat/nn.jsx", "vendor-inline/minified/s2.js"]) local.add(path.join(SRC, f));
const fallbackFiles = [...local];
const vers = fs.readdirSync(PKGS).filter((d) => /^streamdown@[12]\./.test(d)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const summary = [];
for (const pv of vers) {
  const dist = path.join(PKGS, pv, "package/dist");
  const idx = path.join(dist, "index.js"); if (!fs.existsSync(idx)) continue;
  const sg = new Graph(), ng = new Graph();
  for (const f of fs.readdirSync(dist)) if (/\.m?js$/.test(f)) ng.mod(path.join(dist, f));
  const seeds = [[sg.resolveExport(SD, "Streamdown"), ng.resolveExport(idx, "Streamdown")]];
  const r = match(sg, ng, seeds, { fallbackFiles });
  const cnt = {}; for (const x of r.recs) cnt[x.verdict] = (cnt[x.verdict] || 0) + 1;
  const perFile = {};
  for (const f of fallbackFiles) {
    const ks = [...sg.mod(f).decls.keys()].map((d) => f + "#" + d);
    const v = {}; for (const k of ks) { const rec = r.recs.find((x) => x.s === k); const vv = rec ? rec.verdict : "unpaired"; v[vv] = (v[vv] || 0) + 1; }
    perFile[kn(f + "#").slice(0, -1)] = v;
  }
  summary.push({ pv, counts: cnt, conflicts: r.conflicts.length, perFile });
  const detail = r.recs.map((x) => {
    const o = { src: kn(x.s), npm: kn(x.n), verdict: x.verdict, via: x.via === "seed" || String(x.via).startsWith("fallback") ? x.via : kn(x.via) };
    if (x.bytes) o.bytes = x.bytes;
    if (sg.isInternal(x.s)) { const { d } = sg.declOf(x.s); if (d) o.srcLine = d.line; }
    if (ng.isInternal(x.n)) { const { d } = ng.declOf(x.n); if (d) o.npmLine = d.line; }
    if (x.verdict === "diff") { o.changedTokens = x.changedTokens; o.totalTokens = x.totalTokens; o.srcF = display(sg.shape(x.s), kn); o.npmF = display(ng.shape(x.n), kn); }
    return o;
  });
  const unpaired = [];
  for (const f of fallbackFiles) for (const d of sg.mod(f).decls.values()) { const k = f + "#" + d.name; if (!r.s2n.has(k)) unpaired.push({ src: kn(k), line: d.line, bytes: d.end - d.start }); }
  const npmUnpaired = [];
  for (const m of ng.mods.values()) for (const d of m.decls.values()) { const k = m.file + "#" + d.name; if (!r.n2s.has(k)) npmUnpaired.push({ npm: kn(k), line: d.line, bytes: d.end - d.start }); }
  fs.writeFileSync(path.join(OUT, `streamdown-${pv.split("@")[1]}.json`), JSON.stringify({ pkg: pv, counts: cnt, perFile, conflicts: r.conflicts.map((c) => ({ s: kn(c.s), n: kn(c.n), via: kn(c.via), srcAlreadyPairedWith: c.srcAlreadyPairedWith && kn(c.srcAlreadyPairedWith), npmAlreadyPairedWith: c.npmAlreadyPairedWith && kn(c.npmAlreadyPairedWith) })), fallback: r.fallback.map((f) => ({ s: kn(f.s), n: kn(f.n), field: f.field })), pairs: detail, srcUnpaired: unpaired, npmUnpaired }, null, 1));
}
fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 1));
for (const x of summary) console.log(x.pv, JSON.stringify(x.counts), "conf", x.conflicts, "sd.jsx", JSON.stringify(x.perFile["chat/streamdown.jsx"]));
