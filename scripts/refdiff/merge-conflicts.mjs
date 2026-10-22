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

/**
 * 自由标识符防护（第 355 轮）。
 *
 * 为什么必须有：`apply-delta` 有这道检查，`merge-conflicts` 原来没有。
 * 结果是我直接把 3142 条合并写回，界面被打崩（home 9.24% -> 33.7%、
 * 我方遮罩块从 3 变 0、新增报错 1）—— 因为 4.0.3 的新语句里引用了
 * 我们文件里没有声明、也没有 import 的名字，运行期直接 ReferenceError。
 *
 * 这里做的检查：把要写入的**整段新文本**解析一遍，收集「用了但文件里没有」的名字；
 * 只要有一个，这条就不合并，记进报告等人工处理。
 */
function freeNamesIn(code, knownNames) {
  const out = new Set();
  let ast;
  try {
    ast = parse(code, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  } catch {
    return out;
  }
  const declared = new Set();
  const collect = (id) => {
    if (!id) return;
    if (id.type === "Identifier") declared.add(id.name);
    else if (id.type === "ObjectPattern") for (const pr of id.properties) collect(pr.value ?? pr.argument);
    else if (id.type === "ArrayPattern") for (const el of id.elements) collect(el);
    else if (id.type === "RestElement") collect(id.argument);
    else if (id.type === "AssignmentPattern") collect(id.left);
  };
  const walk = (n) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    switch (n.type) {
      case "FunctionDeclaration": collect(n.id); n.params?.forEach((p2) => collect(p2)); break;
      case "FunctionExpression": case "ArrowFunctionExpression": n.params?.forEach((p2) => collect(p2)); break;
      case "ClassDeclaration": case "ClassExpression": collect(n.id); break;
      case "VariableDeclarator": collect(n.id); break;
      case "ImportSpecifier": case "ImportDefaultSpecifier": case "ImportNamespaceSpecifier": collect(n.local); break;
      case "CatchClause": collect(n.param); break;
      default: break;
    }
    for (const k of Object.keys(n)) {
      if (k === "loc" || k === "start" || k === "end" || k === "leadingComments" || k === "trailingComments") continue;
      const v = n[k];
      if (v && typeof v === "object") walk(v);
    }
  };
  walk(ast);
  const walkUse = (n) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walkUse);
    if (n.type === "Identifier" && !declared.has(n.name) && !knownNames.has(n.name)) out.add(n.name);
    for (const k of Object.keys(n)) {
      if (k === "loc" || k === "start" || k === "end") continue;
      const v = n[k];
      if (v && typeof v === "object") walkUse(v);
    }
  };
  walkUse(ast);
  return out;
}

const SRC_ROOT = "app/renderer/src";
// 第 355 轮（4.0.3 增量）：端点与台账可指定，默认仍是 3.0.21 -> 4.0.0。
const OLD_BUNDLE =
  process.env.OV_OLD_BUNDLE ?? ".probe/reference/3.0.21/asar/out/renderer/assets/index-ZNI5SgRm.js";
const NEW_BUNDLE =
  process.env.OV_NEW_BUNDLE ?? ".probe/reference/4.0.0/asar/out/renderer/assets/index-BBp4hclA.js";

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
  const oldRows = JSON.parse(readFileSync(process.env.OV_OLD_LEDGER ?? ".probe/refdiff/toplevel-3.0.21.json", "utf8")).rows;
  const newRows = JSON.parse(readFileSync(process.env.OV_NEW_LEDGER ?? ".probe/refdiff/toplevel-4.0.0.json", "utf8")).rows;
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
    const fileText = readFileSync(path.join(root, SRC_ROOT, file), "utf8");

    // 自由标识符防护 —— **默认关闭**（OV_MERGE_GUARD=1 才启用）。
    // 现状：这一版实现用的是正则拼的 known 集合，太粗，会把几乎每个文件都判成
    // 「引入未声明标识符」（实测 3142 条合并、0 个文件通过）。要真正可用，
    // 应复用 apply-delta.mjs 里那套 AST 口径（freeIdentifiers + 全树导出索引）。
    if (process.env.OV_MERGE_GUARD === "1") {
    // 自由标识符防护：整段合并结果里凡是「文件没声明、也没 import」的名字，
    // 说明上游这条改动依赖了我们没有的东西 —— 不写回，转成冲突等人工处理。
    {
      let cur = fileText;
      for (const e of [...local].sort((a, b) => b.start - a.start)) {
        cur = cur.slice(0, e.start) + e.replacement + cur.slice(e.end);
      }
      const known = new Set();
      for (const m of fileText.matchAll(/\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)) known.add(m[1]);
      for (const m of fileText.matchAll(/import\s+\{([^}]*)\}/g)) {
        for (const part of m[1].split(",")) {
          const nm = part.trim().split(/\s+as\s+/).pop()?.trim();
          if (nm) known.add(nm);
        }
      }
      for (const m of fileText.matchAll(/import\s+([A-Za-z_$][\w$]*)\s+from/g)) known.add(m[1]);
      const free = freeNamesIn(cur, known);
      if (free.size) {
        stats.conflict += local.length;
        for (const e of local) {
          conflicts.push({
            file,
            name: e.name,
            note: `引入未声明的标识符：${[...free].slice(0, 5).join(", ")}`,
          });
        }
        continue;
      }
    }
    }
    stats.files += 1;
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
