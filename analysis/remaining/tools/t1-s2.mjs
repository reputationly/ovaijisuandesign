// 任务 1：s2.js 对 remend / streamdown 各版本做跨模块配对
import fs from "node:fs"; import path from "node:path";
import { Graph } from "./xcanon.mjs"; import { match, shortKey, display } from "./xmatch.mjs";
const SRC = process.env.SRC || "/home/ubuntu/wt-desource/app/renderer/src";
const PKGS = process.env.PKGS || "/home/ubuntu/ana/pkgs";
const OUT = process.argv[2] || "/home/ubuntu/wt-analysis/analysis/remaining/s2";
fs.mkdirSync(OUT, { recursive: true });
const S2 = path.join(SRC, "vendor-inline/minified/s2.js");
const vers = (p) => fs.readdirSync(PKGS).filter((d) => d.startsWith(p + "@")).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const summary = [];
const roots = [SRC + "/", PKGS + "/"];
for (const job of [
  { pkg: "remend", seed: "$e$1", npmFile: "dist/index.js", npmExport: "default" },
  { pkg: "streamdown", seed: "be", npmFile: "dist/index.js", npmExport: "createAnimatePlugin" },
]) {
  for (const pv of vers(job.pkg)) {
    const nf = path.join(PKGS, pv, "package", job.npmFile);
    if (!fs.existsSync(nf)) continue;
    const sg = new Graph(), ng = new Graph();
    const s = sg.resolveExport(S2, job.seed), n = ng.resolveExport(nf, job.npmExport);
    if (n.startsWith("noexport") || n.startsWith("missing")) { summary.push({ pv, job: job.pkg, err: n }); continue; }
    const r = match(sg, ng, [[s, n]], { fallbackFiles: [S2] });
    const cnt = {};
    for (const x of r.recs) cnt[x.verdict] = (cnt[x.verdict] || 0) + 1;
    const s2decls = [...sg.mod(S2).decls.keys()].map((d) => S2 + "#" + d);
    const s2unpaired = s2decls.filter((k) => !r.s2n.has(k)).map((k) => shortKey(k, roots));
    summary.push({ pv, job: job.pkg, counts: cnt, conflicts: r.conflicts.length, s2unpaired: s2unpaired.length });
    const kn = (k) => shortKey(k, roots);
    const detail = r.recs.map((x) => {
      const o = { src: kn(x.s), npm: kn(x.n), verdict: x.verdict, via: x.via === "seed" || x.via.startsWith("fallback") ? x.via : kn(x.via) };
      if (x.bytes) o.bytes = x.bytes;
      if (sg.isInternal(x.s)) { const { d } = sg.declOf(x.s); if (d) o.srcLine = d.line; }
      if (ng.isInternal(x.n)) { const { d } = ng.declOf(x.n); if (d) o.npmLine = d.line; }
      if (x.verdict === "diff") { o.changedTokens = x.changedTokens; o.totalTokens = x.totalTokens; o.srcF = display(sg.shape(x.s), kn); o.npmF = display(ng.shape(x.n), kn); }
      return o;
    });
    fs.writeFileSync(path.join(OUT, `${job.pkg}-${pv.split("@")[1]}.json`), JSON.stringify({ pkg: pv, seed: [kn(s), kn(n)], counts: cnt, conflicts: r.conflicts.map((c) => ({ ...c, s: kn(c.s), n: kn(c.n), via: kn(c.via), srcAlreadyPairedWith: c.srcAlreadyPairedWith && kn(c.srcAlreadyPairedWith), npmAlreadyPairedWith: c.npmAlreadyPairedWith && kn(c.npmAlreadyPairedWith) })), s2unpaired, fallback: r.fallback.map((f) => ({ s: kn(f.s), n: kn(f.n), field: f.field })), pairs: detail }, null, 1));
  }
}
fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 1));
for (const x of summary) console.log(x.job, x.pv, JSON.stringify(x.counts || x.err), "conflicts", x.conflicts, "s2unpaired", x.s2unpaired);
