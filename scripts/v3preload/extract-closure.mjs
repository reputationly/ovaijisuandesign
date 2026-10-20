/**
 * 按清单把声明整段取回成模块（第 267 轮）。
 *
 * 关键：偏移是 **UTF-16 码元**（JS 语义）。Python 的字符索引会因 284 个 emoji 漂移，
 * 所以这里在 Node 里做切片。
 *
 * 用法：node scripts/v3preload/extract-closure.mjs <manifest.json> <out.js> [--only=a,b]
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [manifestPath, outPath] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg ? new Set(onlyArg.slice(7).split(",").filter(Boolean)) : undefined;
if (!manifestPath || !outPath) {
  console.error("用法: extract-closure.mjs <manifest.json> <out.js> [--only=a,b]");
  process.exit(2);
}

const REPO = process.cwd();
const A = path.join(REPO, ".probe/reference/4.0.0/asar/out/renderer/assets");
const sources = {
  main: readFileSync(path.join(A, "index-BBp4hclA.js"), "utf8"),
  uwc: readFileSync(path.join(A, "use-window-chrome-DbNyfMCt.js"), "utf8"),
};
const rowsOf = {
  main: JSON.parse(readFileSync(path.join(REPO, ".probe/refdiff/toplevel-4.0.0.json"), "utf8")).rows,
  uwc: JSON.parse(readFileSync(path.join(REPO, ".probe/refdiff/toplevel-uwc-4.0.0.json"), "utf8")).rows,
};
const index = new Map();
for (const chunk of ["main", "uwc"]) {
  for (const r of rowsOf[chunk]) for (const n of r.names ?? []) if (!index.has(n)) index.set(n, { r, chunk });
}

const man = JSON.parse(readFileSync(manifestPath, "utf8"));
const picked = [];
const missing = [];
for (const item of man.items) {
  const name = item.names[0];
  if (only && !only.has(name)) continue;
  const hit = index.get(name) ?? index.get(name.replace(/\$\d+$/, ""));
  if (!hit) { missing.push(name); continue; }
  const src = sources[hit.chunk];
  let body = src.slice(hit.r.start, hit.r.end).trimEnd();
  body = body.replace(/^(export\s+)?(async\s+)?(function|const|let|class)\s/, "export $2$3 ");
  picked.push({ name, body });
}

const seen = new Set();
const kept = [];
for (const p of picked) {
  if (seen.has(p.name)) continue;   // 同名只保留第一份（顶层声明，不会跨作用域冲突）
  seen.add(p.name);
  kept.push(p.body);
}

writeFileSync(outPath, kept.join("\n\n") + "\n", "utf8");
console.log(`取回 ${kept.length}/${man.items.length}，缺 ${missing.length}` + (missing.length ? `: ${missing.slice(0, 8).join(", ")}` : ""));
