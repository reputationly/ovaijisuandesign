// 任务 3 索引：对一批 JS 文件取顶层函数/类声明（含 var x = function/箭头/class），
// 计算 α 归一化 + 自由引用全部打码后的形状哈希。用法：
//   node t3-index.mjs npm <out.jsonl>   扫描已安装包（pnpm store + ~/ana/sddeps + ~/ana/pkgs 里的 streamdown/remend）
//   node t3-index.mjs src <out.jsonl>   扫描 app/renderer/src（排除 vendor.js、vendor-inline/vscode-base/）
import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import crypto from "node:crypto";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import * as t from "@babel/types";

const SRC = "/home/ubuntu/wt-desource/app/renderer/src";
const MAXB = 1_500_000;
const sha = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 16);

function walk(dir, out, skipNm = true) {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) { if (skipNm && e.name === "node_modules") continue; if (/^(test|tests|__tests__|__mocks__|types|typings|docs?|examples?|benchmark)$/i.test(e.name)) continue; walk(p, out, skipNm); }
    else if (/\.(m?js|cjs|jsx)$/.test(e.name) && !/\.d\.[mc]?ts$/.test(e.name)) { try { if (fs.statSync(p).size <= MAXB) out.push(p); } catch {} }
  }
}
function pkgDirs() {
  const dirs = new Map(); // name@ver -> dir
  const add = (d) => { try { const pj = JSON.parse(fs.readFileSync(path.join(d, "package.json"), "utf8")); if (!pj.name || !pj.version) return; const id = pj.name + "@" + pj.version; if (!dirs.has(id)) dirs.set(id, d); } catch {} };
  const scanNm = (nm) => { let ents; try { ents = fs.readdirSync(nm, { withFileTypes: true }); } catch { return; }
    for (const e of ents) { if (e.name.startsWith(".")) continue; const p = path.join(nm, e.name);
      if (e.isSymbolicLink() || !e.isDirectory()) continue;
      if (e.name.startsWith("@")) { for (const s of fs.readdirSync(p, { withFileTypes: true })) if (s.isDirectory() && !s.isSymbolicLink()) { add(path.join(p, s.name)); scanNm(path.join(p, s.name, "node_modules")); } }
      else { add(p); scanNm(path.join(p, "node_modules")); } } };
  const store = "/home/ubuntu/wt-desource/node_modules/.pnpm";
  for (const e of fs.readdirSync(store)) scanNm(path.join(store, e, "node_modules"));
  scanNm("/home/ubuntu/ana/sddeps/node_modules");
  add("/home/ubuntu/ana/pkgs/streamdown@2.5.0/package"); add("/home/ubuntu/ana/pkgs/remend@1.3.0/package");
  // EXTRA_PKGS=dir1:dir2 ：每个目录下 <x>/package 是一个 npm pack 解压的包
  for (const root of (process.env.EXTRA_PKGS || "").split(":").filter(Boolean)) for (const e of fs.readdirSync(root)) { const d = path.join(root, e, "package"); if (fs.existsSync(d)) add(d); }
  return dirs;
}

if (isMainThread) {
  const [mode, out] = process.argv.slice(2);
  const jobs = []; // {file, pkg, rel}
  if (mode === "npm") {
    const dirs = pkgDirs();
    for (const [id, d] of dirs) { const fl = []; walk(d, fl); for (const f of fl) jobs.push({ file: f, pkg: id, rel: path.relative(d, f) }); }
    console.error("packages", dirs.size, "files", jobs.length);
  } else {
    const fl = []; walk(SRC, fl, true);
    const only = process.env.SRC_ONLY ? new Set(process.env.SRC_ONLY.split(",")) : null;
    for (const f of fl) { const rel = path.relative(SRC, f); if (only ? !only.has(rel) : (rel === "vendor.js" || rel.startsWith("vendor-inline/vscode-base/"))) continue; jobs.push({ file: f, pkg: "src", rel }); }
    console.error("src files", jobs.length);
  }
  jobs.sort((a, b) => fs.statSync(b.file).size - fs.statSync(a.file).size);
  const ws = fs.createWriteStream(out); let next = 0, done = 0, recs = 0; const N = Math.max(1, os.cpus().length);
  const t0 = Date.now();
  await Promise.all(Array.from({ length: N }, () => new Promise((res) => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { all: !!process.env.ALL_DECLS }, resourceLimits: { maxOldGenerationSizeMb: 3000 } });
    const feed = () => { if (next >= jobs.length) { w.terminate(); res(); return; } w.postMessage(jobs[next++]); };
    w.on("message", (m) => { for (const r of m) { ws.write(JSON.stringify(r) + "\n"); recs++; } if (++done % 1000 === 0) console.error(done, "/", jobs.length, recs, ((Date.now() - t0) / 1000).toFixed(0) + "s"); feed(); });
    w.on("error", (e) => { console.error("worker error", e.message); done++; const nw = null; res(); });
    feed();
  })));
  ws.end(); console.error("done files", done, "decls", recs, ((Date.now() - t0) / 1000).toFixed(0) + "s");
} else {
  const { Graph, mask } = await import("./xcanon.mjs");
  const isFnLike = (d) => d.kind === "function" || d.kind === "class" || (d.kind === "var" && d.node.init && (t.isFunctionExpression(d.node.init) || t.isArrowFunctionExpression(d.node.init) || t.isClassExpression(d.node.init))) || (d.kind === "default-expr" && (t.isFunctionDeclaration(d.node) || t.isClassDeclaration(d.node) || t.isFunctionExpression(d.node) || t.isArrowFunctionExpression(d.node) || t.isClassExpression(d.node)));
  parentPort.on("message", (job) => {
    const out = [];
    try {
      const g = new Graph(); const m = g.mod(job.file);
      let idx = 0;
      for (const d of m.decls.values()) {
        const ord = idx++;
        if (!workerData.all && !isFnLike(d)) continue;
        let s; try { s = g.shape(job.file + "#" + d.name); } catch (e) { continue; }
        if (!s || s.err || !s.F) continue;
        const F = mask(s.F);
        const coarse = F.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/`(?:[^`\\]|\\.)*`/g, "``").replace(/\b\d+(\.\d+)?\b/g, "0");
        out.push({ p: job.pkg, f: job.rel, n: d.name, o: ord, l: d.line, b: d.end - d.start, k: F.length, h: sha(F), c: sha(coarse), fn: isFnLike(d) ? 1 : 0 });
      }
    } catch (e) { out.push({ p: job.pkg, f: job.rel, err: String(e.message).slice(0, 200) }); }
    parentPort.postMessage(out);
  });
}
