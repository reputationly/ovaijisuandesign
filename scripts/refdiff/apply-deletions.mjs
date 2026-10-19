// 处理「上游删掉的语句」：先确认是真删了，再从我们的源码里移除。
//
//   node scripts/refdiff/apply-deletions.mjs          # dry-run
//   node scripts/refdiff/apply-deletions.mjs --apply
//
// 单据不能只看「新版没有同名语句」就删 —— 还原时名字可能被改过、语句可能搬到别的文件、
// 也可能被改写成新形状（那种会在新增桶里）。所以分三档：
//   1. 新版存在**归一化形状完全相同**的语句（只是换了名字）→ 不删，记为 renamed
//   2. 新版存在**开头若干个原子相同**的语句 → 大概率是同一条被改写过 → 不删，记为 moved/shifted
//   3. 都找不到 → 真删除，从源码里移除
// 归一化用 token-merge 的原子序列（标识符一律抹平），所以改名不影响判定。
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import { atomsOf, lcsPairs } from "./token-merge.mjs";
import { restoreStatementText } from "./restore-statement.mjs";
import { listSourceFiles } from "./source-index.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../decompile/package.json"));
void require;

const SRC_ROOT = "app/renderer/src";
const NEW_BUNDLE = ".probe/reference/4.0.0/asar/out/renderer/assets/index-BBp4hclA.js";
const PREFIX_LEN = 6;

function parseArgs(argv) {
  const a = { apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--apply") a.apply = true;
    else if (argv[i].startsWith("--")) a[argv[i].slice(2)] = argv[i + 1];
  }
  return a;
}

function statementsInFile(file) {
  const text = readFileSync(path.join(SRC_ROOT, file), "utf8");
  const ast = parse(text, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true });
  const out = [];
  for (const node of ast.program.body) {
    const names = [...(node.declarations ?? []).map((d) => d.id?.name), node.id?.name].filter(Boolean);
    out.push({ names, text: text.slice(node.start, node.end), start: node.start, end: node.end });
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  const newRows = JSON.parse(readFileSync(".probe/refdiff/toplevel-4.0.0.json", "utf8")).rows;
  const newSrc = readFileSync(NEW_BUNDLE, "utf8");

  // 新版语句的归一化形状索引：整体哈希 + 前缀
  const exact = new Map();
  const byPrefix = new Map();
  for (const r of newRows) {
    const out = await restoreStatementText(newSrc.slice(r.start, r.end));
    const atoms = atomsOf(out.code).map((x) => x.norm);
    const h = atoms.join(" ");
    if (!exact.has(h)) exact.set(h, []);
    exact.get(h).push({ name: (r.names ?? [])[0] ?? "(匿名)", atoms });
    const p = atoms.slice(0, PREFIX_LEN).join(" ");
    if (!byPrefix.has(p)) byPrefix.set(p, []);
    byPrefix.get(p).push({ name: (r.names ?? [])[0] ?? "(匿名)", atoms });
  }

  const report = JSON.parse(readFileSync(".probe/refdiff/apply-delta-report.json", "utf8"));
  const candidates = [];
  for (const f of report.files) for (const e of f.edits) if (e.kind === "deleted-upstream") candidates.push({ file: f.file, name: e.name });

  const stats = { total: candidates.length, renamed: 0, shifted: 0, deleted: 0, deferredDangling: 0, missing: 0, fileCount: 0 };

  // 预先读一遍全树，用来判断「除了定义它的文件，还有谁在引用这个名字」
  const allFiles = listSourceFiles(SRC_ROOT);
  const fileText = new Map(allFiles.map((rel) => [rel, readFileSync(path.join(SRC_ROOT, rel), "utf8")]));
  /**
   * 还有谁在用这个名字。
   * **同一个文件里也要查** —— 常数往往是「在本文件定义、也在本文件用」，
   * 只看别的文件会漏掉这种，删掉之后就是同文件内的悬空引用。定义本身算一次出现，
   * 所以同文件里出现次数 > 1 就说明还有别处在用。
   */
  const otherFilesReferencing = (definitionFile, name) => {
    const re = new RegExp(`\\b${name.replace(/[$]/g, "\\$")}\\b`, "g");
    const out = [];
    for (const [rel, text] of fileText) {
      const n = (text.match(re) ?? []).length;
      if (rel === definitionFile) {
        if (n > 1) out.push(`${rel}（本文件内还有 ${n - 1} 处引用）`);
      } else if (n > 0) out.push(rel);
    }
    return out;
  };
  const details = [];
  const byFile = new Map();
  for (const c of candidates) {
    const stmts = statementsInFile(c.file);
    const mine = stmts.find((s) => s.names.includes(c.name));
    if (!mine) {
      stats.missing += 1;
      continue;
    }
    const atoms = atomsOf(mine.text).map((x) => x.norm);
    const key = atoms.join(" ");
    if (exact.has(key)) {
      stats.renamed += 1;
      details.push({ ...c, verdict: "renamed", elsewhere: exact.get(key)[0].name });
      continue;
    }
    const prefixHits = byPrefix.get(atoms.slice(0, PREFIX_LEN).join(" "));
    if (prefixHits?.length) {
      // 前缀相同还要确认整体够像，避免只因为开头几个 token 相同就误判
      let best = null;
      let bestScore = 0;
      for (const h of prefixHits.slice(0, 20)) {
        const score = lcsPairs(atoms, h.atoms).length / Math.max(atoms.length, h.atoms.length);
        if (score > bestScore) {
          bestScore = score;
          best = h;
        }
      }
      if (bestScore >= 0.5) {
        stats.shifted += 1;
        details.push({ ...c, verdict: "shifted", elsewhere: best.name, similarity: Number(bestScore.toFixed(2)) });
        continue;
      }
    }
    // 删之前先看还有没有别的地方在用它。上游会把定义和用法一起删，但用法所在的文件
    // 常常还在冲突桶里没合完 —— 这时候删定义会让树处在「悬空引用」的中间状态：
    // 构建能过（rollup 把未知标识符当外部全局），运行时才炸。所以这类先不删。
    const stillReferenced = otherFilesReferencing(c.file, c.name);
    if (stillReferenced.length) {
      stats.deferredDangling += 1;
      details.push({ ...c, verdict: "deferred-dangling", referencedBy: stillReferenced });
      continue;
    }
    stats.deleted += 1;
    details.push({ ...c, verdict: "deleted" });
    byFile.set(c.file, [...(byFile.get(c.file) ?? []), mine]);
  }

  const proposalDir = path.join(root, ".probe/refdiff/deleted");
  mkdirSync(proposalDir, { recursive: true });
  for (const [file, list] of byFile) {
    const full = readFileSync(path.join(root, SRC_ROOT, file), "utf8");
    let next = full;
    for (const s of [...list].sort((a, b) => b.start - a.start)) {
      // 连同后面紧挨着的换行一起去掉，别留空行
      let end = s.end;
      while (end < next.length && (next[end] === "\n" || next[end] === " ")) end += 1;
      next = next.slice(0, s.start) + next.slice(end);
    }
    try {
      parse(next, { sourceType: "module", plugins: ["jsx", "typescript"] });
    } catch (err) {
      details.push({ file, verdict: "syntax-error-after-delete", note: err.message });
      continue;
    }
    stats.fileCount += 1;
    writeFileSync(path.join(proposalDir, file.replace(/\//g, "__")), next);
    if (args.apply) writeFileSync(path.join(root, SRC_ROOT, file), next);
  }

  writeFileSync(path.join(root, ".probe/refdiff/deletion-report.json"), `${JSON.stringify({ mode: args.apply ? "apply" : "dry-run", stats, details }, null, 2)}\n`);
  console.log(`模式：${args.apply ? "写回源码" : "dry-run"}`);
  console.log(`候选 ${stats.total} 条：`);
  console.log(`  只是改了名（不删）      : ${stats.renamed}`);
  console.log(`  被改写成新形状（不删）  : ${stats.shifted}`);
  console.log(`  真删除（移除）          : ${stats.deleted}，跨 ${stats.fileCount} 个文件`);
  console.log(`  暂缓（别处还在引用）    : ${stats.deferredDangling}`);
  console.log(`  在源码里找不到          : ${stats.missing}`);
  console.log(`报告 → .probe/refdiff/deletion-report.json`);
}

await main().catch((e) => {
  console.error(e);
  process.exit(1);
});
void existsSync;
void readdirSync;
void statSync;
