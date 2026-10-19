// 三方合并（diff3）在 token 级做：把「上游的改动」搬到「我们的语句」上，
// 保留我们这边没被碰过的命名和排版。
//
//   node scripts/refdiff/merge-conflicts.mjs            # dry-run，出提案和报告
//   node scripts/refdiff/merge-conflicts.mjs --apply    # 写回源码
//
// 为什么要有这一步：apply-delta 只敢动「上游改了、我们一字未改」的语句，其余 258 条报了冲突。
// 但逐条看下来，绝大多数所谓「我们改了」其实是 rollup 为避让冲突加的尾数字
// （`platform2` / `t2` / `state2`，我们的源码在还原时把这些后缀去掉了），
// 结构上根本没动。所以判定必须建立在**归一化后的 token 序列**上：
// 标识符一律抹成占位符，这样纯改名不算改动，只有真正的结构差异才算。
//
// 合并规则（教科书的 diff3）：
//   旧↔我们、旧↔上游 各自求最长公共子序列，取「两边都稳定」的位置当同步点；
//   同步点之间是变动区，按三方的归一化片段比：
//     我们 == 旧  → 取上游片段（只有上游改了）
//     上游 == 旧  → 取我们的片段（只有我们改了）
//     我们 == 上游 → 取任一方（改成了同一件事）
//     三者互不相同 → 真冲突，报出来，不改
//   同步点本身用**我们的原文**，这样我们的可读命名能保留下来。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import { restoreStatementText } from "./restore-statement.mjs";
import { assemble, atomsOf, lcsPairs, mergeStreams } from "./token-merge.mjs";

const SRC_ROOT = "app/renderer/src";
const OLD_BUNDLE = ".probe/reference/3.0.21/asar/out/renderer/assets/index-ZNI5SgRm.js";
const NEW_BUNDLE = ".probe/reference/4.0.0/asar/out/renderer/assets/index-BBp4hclA.js";

function parseArgs(argv) {
  const a = { apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--apply") a.apply = true;
    else if (argv[i] === "--limit") a.limit = Number(argv[++i]);
  }
  return a;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  const report = JSON.parse(readFileSync(".probe/refdiff/apply-delta-report.json", "utf8"));
  const oldRows = JSON.parse(readFileSync(".probe/refdiff/toplevel-3.0.21.json", "utf8")).rows;
  const newRows = JSON.parse(readFileSync(".probe/refdiff/toplevel-4.0.0.json", "utf8")).rows;
  const oldSrc = readFileSync(OLD_BUNDLE, "utf8");
  const newSrc = readFileSync(NEW_BUNDLE, "utf8");

  const pick = (rows, name) => rows.filter((r) => (r.names ?? []).includes(name));

  /**
   * 同名撞车时按形状挑最像的那一条。
   * apply-delta 里有这一步，早先这里漏了：直接取 [0] 会拿到同名的另一条语句，
   * 于是「我们的语句」和「旧版语句」根本不是一个东西，合并结果全是假冲突。
   */
  const pickBest = async (rows, src, name, oursCode) => {
    const cands = pick(rows, name);
    if (cands.length <= 1) return cands[0] ?? null;
    const oursAtoms = atomsOf(oursCode).map((x) => x.norm);
    let best = null;
    let bestScore = -1;
    for (const c of cands) {
      const out = await regen(src, c);
      const score = lcsPairs(oursAtoms, atomsOf(out.code).map((x) => x.norm)).length;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    return best;
  };
  const cache = new Map();
  const regen = async (src, row) => {
    if (cache.has(row)) return cache.get(row);
    const out = await restoreStatementText(src.slice(row.start, row.end));
    cache.set(row, out);
    return out;
  };

  const statCache = new Map();
  const findInFile = (file, name) => {
    const key = `${file}\u0000${name}`;
    if (statCache.has(key)) return statCache.get(key);
    const text = readFileSync(path.join(root, SRC_ROOT, file), "utf8");
    const ast = parse(text, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true });
    let found = null;
    for (const node of ast.program.body) {
      const names = [...(node.declarations ?? []).map((d) => d.id?.name), node.id?.name].filter(Boolean);
      if (names.includes(name)) {
        found = { text: text.slice(node.start, node.end), start: node.start, end: node.end, fileText: text };
        break;
      }
    }
    statCache.set(key, found);
    return found;
  };

  const proposalDir = path.join(root, ".probe/refdiff/merged");
  mkdirSync(proposalDir, { recursive: true });
  const stats = { files: 0, merged: 0, conflict: 0, unfound: 0 };
  const conflicts = [];
  const byFile = new Map();
  for (const f of report.files) {
    for (const e of f.edits) {
      if (e.kind !== "conflict") continue;
      byFile.set(f.file, [...(byFile.get(f.file) ?? []), e.name]);
    }
  }
  let processed = 0;
  for (const [file, names] of byFile) {
    if (args.limit && processed >= args.limit) break;
    const local = [];
    for (const name of names) {
      processed += 1;
      const mine = findInFile(file, name);
      if (!mine) {
        stats.unfound += 1;
        continue;
      }
      const oldHit = await pickBest(oldRows, oldSrc, name, mine.text);
      const newHit = await pickBest(newRows, newSrc, name, mine.text);
      if (!oldHit || !newHit) {
        stats.unfound += 1;
        continue;
      }
      const [oldCode, newCode] = [await regen(oldSrc, oldHit), await regen(newSrc, newHit)];
      const { segments, conflict } = mergeStreams(oldCode.code, mine.text, newCode.code);
      if (conflict || !segments) {
        stats.conflict += 1;
        conflicts.push({ file, name, ...conflict });
        continue;
      }
      const assembled = assemble(segments, mine.text, newCode.code);
      try {
        parse(assembled, { sourceType: "module", plugins: ["jsx", "typescript"] });
      } catch (err) {
        stats.conflict += 1;
        conflicts.push({ file, name, note: `合并结果语法错误：${err.message}` });
        continue;
      }
      stats.merged += 1;
      local.push({ name, start: mine.start, end: mine.end, replacement: assembled });
    }
    if (!local.length) continue;
    stats.files += 1;
    const fileText = readFileSync(path.join(root, SRC_ROOT, file), "utf8");
    let next = fileText;
    for (const e of [...local].sort((a, b) => b.start - a.start)) next = next.slice(0, e.start) + e.replacement + next.slice(e.end);
    writeFileSync(path.join(proposalDir, file.replace(/\//g, "__")), next);
    if (args.apply) writeFileSync(path.join(root, SRC_ROOT, file), next);
  }

  writeFileSync(path.join(root, ".probe/refdiff/merge-report.json"), `${JSON.stringify({ mode: args.apply ? "apply" : "dry-run", stats, conflicts }, null, 2)}\n`);
  console.log(`模式：${args.apply ? "写回源码" : "dry-run"}`);
  console.log(`合并成功: ${stats.merged} 条（跨 ${stats.files} 个文件）`);
  console.log(`仍然冲突: ${stats.conflict} 条`);
  console.log(`配不上  : ${stats.unfound} 条`);
  if (conflicts.length) {
    console.log("\n前 10 条真冲突：");
    for (const c of conflicts.slice(0, 10)) console.log(`  ${c.name} @ ${c.file}`);
  }
}
