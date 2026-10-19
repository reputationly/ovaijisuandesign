// 把 apply-deletions 删掉的语句放回去。
//
//   node scripts/refdiff/restore-deleted.mjs [--apply]
//
// 为什么要能回退：删掉一条定义等于让**引用它的地方变成悬空引用**。上游确实会把定义和用法
// 一起删，但用法所在的文件往往还在冲突桶里没合完 —— 这时候先删定义，树就处在中间状态，
// 构建能过（rollup 把未知标识符当外部全局），运行时才炸。所以删除要等引用方也更新完再落地。
//
// 位置按「在旧 bundle 里的先后」还原：找出文件里旧位置排在它后面的第一条语句，插到它前面。
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import { restoreStatementText } from "./restore-statement.mjs";
import { parseModule } from "./source-index.mjs";

const SRC_ROOT = "app/renderer/src";
const OLD_BUNDLE = ".probe/reference/3.0.21/asar/out/renderer/assets/index-ZNI5SgRm.js";
const base = (n) => n.replace(/\$\d+$/, "");
const apply = process.argv.includes("--apply");

const report = JSON.parse(readFileSync(".probe/refdiff/deletion-report.json", "utf8"));
const targets = report.details.filter((d) => d.verdict === "deleted");
const oldRows = JSON.parse(readFileSync(".probe/refdiff/toplevel-3.0.21.json", "utf8")).rows;
const oldSrc = readFileSync(OLD_BUNDLE, "utf8");

/** 名字 → 它在旧 bundle 里的语句下标。 */
const oldIndexByName = new Map();
oldRows.forEach((r, i) => {
  for (const n of r.names ?? []) if (!oldIndexByName.has(n)) oldIndexByName.set(n, i);
});

const byFile = new Map();
for (const d of targets) byFile.set(d.file, [...(byFile.get(d.file) ?? []), d]);

let restored = 0;
for (const [file, list] of byFile) {
  const full = readFileSync(path.join(SRC_ROOT, file), "utf8");
  const ast = parseModule(full);
  const top = ast.program.body.map((n) => {
    const names = [...(n.declarations ?? []).map((x) => x.id?.name), n.id?.name].filter(Boolean);
    const oldIdx = Math.min(...names.map((nm) => oldIndexByName.get(nm) ?? Number.MAX_SAFE_INTEGER));
    return { start: n.start, names, oldIdx };
  });
  let next = full;
  for (const d of list) {
    const row = oldRows.find((r) => (r.names ?? []).includes(d.name));
    if (!row) {
      console.log(`  跳过 ${d.name}：旧 bundle 里找不到`);
      continue;
    }
    const code = (await restoreStatementText(oldSrc.slice(row.start, row.end))).code;
    const myOld = oldIndexByName.get(d.name) ?? Number.MAX_SAFE_INTEGER;
    // 插到旧位置排在它后面的第一条语句之前
    const after = top.filter((s) => s.oldIdx > myOld).sort((a, b) => a.oldIdx - b.oldIdx)[0];
    const at = after ? after.start : next.length;
    next = `${next.slice(0, at)}${code}\n${next.slice(at)}`;
    restored += 1;
  }
  try {
    parse(next, { sourceType: "module", plugins: ["jsx", "typescript"] });
  } catch (err) {
    console.log(`  ${file}: 还原后语法错误，跳过（${err.message}）`);
    continue;
  }
  if (apply) writeFileSync(path.join(SRC_ROOT, file), next);
  console.log(`  ${file}: 放回 ${list.length} 条`);
}
console.log(`${apply ? "已写回" : "dry-run"}：共放回 ${restored} 条`);
void base;
