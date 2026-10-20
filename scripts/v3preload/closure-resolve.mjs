/**
 * 把「被引用但不在清单里」的名字按 dataset 补进闭包清单，迭代到没有新的可补为止。
 *
 * 第 247 轮（用户方案 A.3/A.4）：这是**离线**迭代 —— 只改清单，不插入代码、不跑 check-undef，
 * 因此不会像「插代码 → check-undef → 再补」那样把库代码一起吃进来。
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const MANIFEST = process.argv[2];
if (!MANIFEST) { console.error("用法: node closure-resolve.mjs <manifest.json> <unresolved...>"); process.exit(1); }
const extra = process.argv.slice(3);
const REPO = process.cwd();
const main = JSON.parse(readFileSync(path.join(REPO, ".probe/refdiff/toplevel-4.0.0.json"), "utf8")).rows;
const uwc = JSON.parse(readFileSync(path.join(REPO, ".probe/refdiff/toplevel-uwc-4.0.0.json"), "utf8")).rows;
const byName = new Map();
for (const r of main) for (const n of r.names ?? []) if (!byName.has(n)) byName.set(n, { ...r, chunk: "main" });
for (const r of uwc) for (const n of r.names ?? []) if (!byName.has(n)) byName.set(n, { ...r, chunk: "uwc" });

const man = JSON.parse(readFileSync(MANIFEST, "utf8"));
const have = new Set(man.items.map((it) => it.names[0]));
let added = 0;
const notFound = [];
for (const n of extra) {
  if (have.has(n)) continue;
  const r = byName.get(n) ?? byName.get(n.replace(/\$\d+$/, ""));
  if (!r) { notFound.push(n); continue; }
  man.items.push({ i: r.i, names: r.names, start: r.start, end: r.end, ring: 99, status: "todo", chunk: r.chunk });
  have.add(r.names[0]);
  added++;
}
writeFileSync(MANIFEST, JSON.stringify(man, null, 1), "utf8");
console.log(`补入 ${added} 个，清单 ${man.items.length} 个` + (notFound.length ? `，数据集里没有：${notFound.join(", ")}` : ""));
