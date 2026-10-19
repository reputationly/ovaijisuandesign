// 逐条看一个冲突：我们改了什么、上游改了什么，两处改动是不是落在同一段。
//
//   node scripts/refdiff/inspect-conflict.mjs <源文件> <声明名>
//   node scripts/refdiff/inspect-conflict.mjs --top 10        # 看冲突最多的几个文件的前几条
//
// 判断「能不能自动合」的依据是两处改动的位置关系：
//   落在同一段 → 真冲突，必须人工
//   互不重叠   → 理论上可以三方合并（token 级 diff3），后续由 merge-conflicts.mjs 处理
import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import { restoreStatementText } from "./restore-statement.mjs";
import { atomsOf, lcsPairs } from "./token-merge.mjs";

const OLD_BUNDLE = ".probe/reference/3.0.21/asar/out/renderer/assets/index-ZNI5SgRm.js";
const NEW_BUNDLE = ".probe/reference/4.0.0/asar/out/renderer/assets/index-BBp4hclA.js";
const SRC_ROOT = "app/renderer/src";

/** 两个改动区间是否重叠（按各自序列上的下标）。 */
export function overlaps(a1, a2, b1, b2) {
  return a1 < b2 && b1 < a2;
}

async function loadStatement(rowsPath, bundlePath, name) {
  const rows = JSON.parse(readFileSync(rowsPath, "utf8")).rows;
  const src = readFileSync(bundlePath, "utf8");
  const hit = rows.filter((r) => (r.names ?? []).includes(name));
  if (!hit.length) return null;
  const out = [];
  for (const r of hit) out.push(await restoreStatementText(src.slice(r.start, r.end)));
  return out;
}

function ourStatement(file, name) {
  const text = readFileSync(path.join(SRC_ROOT, file), "utf8");
  const ast = parse(text, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true });
  for (const node of ast.program.body) {
    const names = [...(node.declarations ?? []).map((d) => d.id?.name), node.id?.name].filter(Boolean);
    if (names.includes(name)) return text.slice(node.start, node.end);
  }
  return null;
}

/** 用 token 下标区间描述「相对基准改了哪些段」。 */
export function changeRegions(oldTokens, otherTokens) {
  const pairs = lcsPairs(oldTokens.map((a) => a.norm), otherTokens.map((a) => a.norm));
  const regions = [];
  let prevOld = -1;
  let prevOther = -1;
  for (const [oi, ti] of pairs) {
    if (oi > prevOld + 1 || ti > prevOther + 1) regions.push({ oldFrom: prevOld + 1, oldTo: oi, otherFrom: prevOther + 1, otherTo: ti });
    prevOld = oi;
    prevOther = ti;
  }
  if (prevOld + 1 < oldTokens.length || prevOther + 1 < otherTokens.length)
    regions.push({ oldFrom: prevOld + 1, oldTo: oldTokens.length, otherFrom: prevOther + 1, otherTo: otherTokens.length });
  return regions;
}

async function show(file, name) {
  const ours = ourStatement(file, name);
  if (!ours) {
    console.log(`  ${file} 里找不到 ${name}`);
    return;
  }
  const oldHits = await loadStatement(".probe/refdiff/toplevel-3.0.21.json", OLD_BUNDLE, name);
  const newHits = await loadStatement(".probe/refdiff/toplevel-4.0.0.json", NEW_BUNDLE, name);
  const oldCode = oldHits?.[0]?.code;
  const newCode = newHits?.[0]?.code;
  if (!oldCode || !newCode) {
    console.log(`  ${name}: 旧版 ${oldHits?.length ?? 0} 条 / 新版 ${newHits?.length ?? 0} 条（配不上，跳过）`);
    return;
  }
  const o = atomsOf(oldCode);
  const a = atomsOf(ours);
  const b = atomsOf(newCode);
  const ourRegions = changeRegions(o, a);
  const newRegions = changeRegions(o, b);
  const clash = [];
  for (const x of ourRegions) for (const y of newRegions) if (overlaps(x.oldFrom, x.oldTo, y.oldFrom, y.oldTo)) clash.push([x, y]);
  console.log(`\n### ${name}  @ ${file}`);
  console.log(`  token: 旧 ${o.length} / 我们 ${a.length} / 新 ${b.length}`);
  console.log(`  我们相对旧版改了 ${ourRegions.length} 段，上游改了 ${newRegions.length} 段，重叠 ${clash.length} 段`);
  const fmt = (r) => `[旧 ${r.oldFrom}-${r.oldTo}] ${o.slice(r.oldFrom, r.oldTo).map((x) => x.norm).join(" ").slice(0, 90) || "(新增)"}`;
  for (const r of ourRegions.slice(0, 4)) console.log(`    我们: ${fmt(r)}`);
  for (const r of newRegions.slice(0, 4)) console.log(`    上游: ${fmt(r)}`);
  if (!clash.length) {
    console.log("    → 改动互不重叠，可以自动三方合并");
  } else {
    console.log("    → 有重叠，需要人工");
  }
}

// 作为库被 import 时不要跑 CLI（merge-conflicts.mjs 会 import 这里的 lcsPairs）。
if (import.meta.url !== `file://${process.argv[1]}`) {
  // 库模式，什么都不做
} else if (process.argv.slice(2)[0] === "--top") {
  const args = process.argv.slice(2);
  const report = JSON.parse(readFileSync(".probe/refdiff/apply-delta-report.json", "utf8"));
  const counts = new Map();
  for (const f of report.files) for (const e of f.edits) if (e.kind === "conflict") counts.set(f.file, [...(counts.get(f.file) ?? []), e.name]);
  const top = [...counts].sort((x, y) => y[1].length - x[1].length).slice(0, Number(args[1] ?? 3));
  for (const [file, names] of top) for (const name of names.slice(0, 4)) await show(file, name);
} else if (process.argv.slice(2).length >= 2) {
  const args = process.argv.slice(2);
  await show(args[0], args[1]);
} else {
  console.error("用法：node scripts/refdiff/inspect-conflict.mjs <源文件> <声明名> | --top N");
  process.exit(2);
}
