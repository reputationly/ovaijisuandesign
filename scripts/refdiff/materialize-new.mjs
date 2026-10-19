// 给「4.0.0 新增的语句」找家：先找出我们源码里**引用了但没有定义**的标识符，
// 再拿 4.0.0 里声明同名符号的新语句去补。
//
//   node scripts/refdiff/materialize-new.mjs          # dry-run
//   node scripts/refdiff/materialize-new.mjs --apply
//
// 为什么用「引用了但没定义」当线索，而不是按 bundle 里的位置分段建文件：
// 实测新增的应用语句在 bundle 里碎成 668 段（段中位只有 1-2 条），按段建文件会造出几百个
// 只有一两行的模块。而「谁引用了它」是精确的：某个文件里出现了 `useTidySort` 却没有定义、
// 也没有 import，那 `useTidySort` 的 4.0.0 实现就该落在那里（或它 import 的模块里）。
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { atomsOf } from "./token-merge.mjs";
import { restoreStatementText } from "./restore-statement.mjs";
import {
  buildExportIndex,
  buildImportIndex,
  buildNodeModulesIndex,
  collectPackageIdentifiers,
  declaredNames,
  existingImports,
  freeIdentifiers,
  insertImports,
  listSourceFiles,
  parseModule,
  relativeImport,
} from "./source-index.mjs";

const SRC_ROOT = "app/renderer/src";
const NEW_BUNDLE = ".probe/reference/4.0.0/asar/out/renderer/assets/index-BBp4hclA.js";
const base = (n) => n.replace(/\$\d+$/, "");

function parseArgs(argv) {
  const a = { apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--apply") a.apply = true;
    else if (argv[i].startsWith("--")) a[argv[i].slice(2)] = argv[i + 1];
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  const files = listSourceFiles(path.join(root, SRC_ROOT));
  const read = (rel) => readFileSync(path.join(root, SRC_ROOT, rel), "utf8");

  // 1. 每个文件「引用了但没定义」的标识符
  const missingByFile = new Map();
  const missingGlobal = new Map(); // 名字 → 引用它的文件集合
  for (const rel of files) {
    let text;
    let free;
    try {
      text = read(rel);
      free = freeIdentifiers(text);
    } catch {
      continue;
    }
    const local = new Set(free);
    if (!local.size) continue;
    missingByFile.set(rel, local);
    for (const n of local) missingGlobal.set(n, new Set([...(missingGlobal.get(n) ?? []), rel]));
  }

  // 2. 4.0.0 里有哪些新语句声明了这些名字
  const newRows = JSON.parse(readFileSync(".probe/refdiff/toplevel-4.0.0.json", "utf8")).rows;
  const newSrc = readFileSync(NEW_BUNDLE, "utf8");
  const declIndex = new Map(); // 名字（去后缀）→ [{row, name}]
  for (const r of newRows) {
    for (const n of r.names ?? []) {
      const k = base(n);
      if (!declIndex.has(k)) declIndex.set(k, []);
      declIndex.get(k).push({ row: r, name: n });
    }
  }

  const wanted = [...missingGlobal.keys()].filter((n) => declIndex.has(n));
  const orphan = [...missingGlobal.keys()].filter((n) => !declIndex.has(n));
  console.log(`源码里有引用的未定义标识符 ${missingGlobal.size} 个`);
  console.log(`  其中 4.0.0 有同名新声明: ${wanted.length}`);
  console.log(`  4.0.0 也没有（第三方全局或我们的遗漏）: ${orphan.length}`);
  if (orphan.length) console.log(`    例如：${orphan.slice(0, 15).join(", ")}`);

  // 3. 给每条新语句挑一个家：引用它的文件里选引用最多的那个
  const placements = new Map(); // 目标文件 → [{row, name, refCount}]
  const unresolvedName = [];
  for (const name of wanted) {
    const refs = [...missingGlobal.get(name)];
    if (!refs.length) continue;
    // 挑「引用这个文件之外的东西最少」的那个，通常是它真正的宿主
    const host = refs.sort((a, b) => {
      const ra = missingByFile.get(a)?.size ?? 0;
      const rb = missingByFile.get(b)?.size ?? 0;
      return ra - rb || a.localeCompare(b);
    })[0];
    const decls = declIndex.get(name);
    const picked = decls[0];
    if (!placements.has(host)) placements.set(host, []);
    placements.get(host).push({ row: picked.row, name: picked.name, aliases: name, refs: refs.length });
    if (refs.length > 1) unresolvedName.push(`${name}（被 ${refs.length} 个文件引用，先放在 ${host}）`);
  }

  // 4. 先定下「名字 → 目标文件」的全局表，供生成 import 时使用
  const nameTohome = new Map();
  for (const [host, list] of placements) for (const p of list) nameTohome.set(p.aliases, host);
  const exportIndex = buildExportIndex(files, read);
  const importIndex = buildImportIndex(files, read);
  const nodeModulesIndex = buildNodeModulesIndex(path.join(root, "app/renderer/node_modules"));
  const packageIdentifiers = collectPackageIdentifiers(path.join(root, "app/renderer/node_modules"));

  // 5. 逐文件生成语句、接 import、追加到文件末尾
  const stats = { files: 0, statements: 0, skippedStatements: 0, vendorStatements: 0, imports: 0, unresolvedRefs: new Set(), moduleRefs: new Set() };
  const vendorSkipped = [];
  const proposalDir = path.join(root, ".probe/refdiff/materialized");
  mkdirSync(proposalDir, { recursive: true });
  const report = [];
  for (const [host, list] of [...placements].sort((a, b) => b[1].length - a[1].length)) {
    // 同一个语句可能因为多个名字被安排两次，去重
    const seen = new Set();
    const unique = list.filter((p) => {
      const key = p.row.sha;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const chunks = [];
    for (const p of unique) {
      const restored = await restoreStatementText(newSrc.slice(p.row.start, p.row.end));
      chunks.push({ ...p, code: restored.code });
    }
    let text = read(host);
    const imports = existingImports(text);
    // 被别的文件引用的声明必须带 export。
    // bundle 里这些是模块内的私有声明，而我们要把它们放在 A 文件里、供 B 文件 import，
    // 少写一个 export 就是一个 "X is not exported by ..." 的构建错误。
    const hostReachable = (name) => {
      const refs = missingGlobal.get(name);
      return !!refs && [...refs].some((r) => r !== host);
    };
    const needed = new Map();
    const body = [];
    const skipped = [];
    for (const c of chunks) {
      let code = c.code;
      const chunkUnresolved = new Set();
      // 引用到别的「新语句」时，改接到目标文件
      for (const [alias, target] of nameTohome) {
        if (target === host) continue;
        const re = new RegExp(`\\b${alias.replace(/[$]/g, "\\$")}\\b`, "g");
        if (!re.test(code)) continue;
        const relPath = relativeImport(host, target);
        needed.set(relPath, [...(needed.get(relPath) ?? []), { imported: alias, local: alias }]);
        imports.set(alias, { from: relPath, imported: alias });
        stats.moduleRefs.add(alias);
      }
      // 其余自由标识符：文件里已有的直接用；树里别处导出的补 import；找不到的如实报。
      // 拼接后的文本可能本身就有重复声明（同一段被安排进来两次、或文件里已经有同名），
      // babel 的作用域跟踪会直接抛错，所以退化到只分析这一段代码。
      let pending;
      try {
        pending = freeIdentifiers(`${text}\n${body.join("\n")}\n${code}`);
      } catch {
        try {
          pending = freeIdentifiers(code);
        } catch {
          skipped.push({ name: c.aliases, unresolved: ["(无法解析该语句的作用域)"] });
          continue;
        }
      }
      for (const raw of pending) {
        if (imports.has(raw)) continue;
        const b = base(raw);
        if (nameTohome.has(raw) || nameTohome.has(b)) {
          const target = nameTohome.get(raw) ?? nameTohome.get(b);
          if (target !== host) {
            const relPath = relativeImport(host, target);
            needed.set(relPath, [...(needed.get(relPath) ?? []), { imported: b, local: raw }]);
            imports.set(raw, { from: relPath, imported: raw });
          }
          continue;
        }
        // 我们树里别处已经 import 过的第三方符号（或同名符号）：抄那条 import。
        const known = importIndex.get(raw) ?? importIndex.get(b);
        if (known && !known.ambiguous && !known.from.startsWith(".")) {
          needed.set(known.from, [...(needed.get(known.from) ?? []), { imported: known.imported, local: raw }]);
          imports.set(raw, { from: known.from, imported: known.imported });
          continue;
        }
        // 第三方包里的符号：包已经在依赖里，直接按包名 import。
        // `$N` 后缀是 rollup 的冲突改名，查包时要去掉。
        // 只守「按包名解析」这条分支（不能 continue，否则会跳过我们源码树里的导出，
        // 而 `cn` 正是我们自己导出的）。
        const pkg = base(raw).length >= 3 ? (nodeModulesIndex.get(raw) ?? nodeModulesIndex.get(b)) : null;
        if (pkg) {
          const sym = nodeModulesIndex.has(raw) ? raw : b;
          // 用别名 import，不去改生成代码里的标识符。
          // 早先是 `code.split(raw).join(sym)` 直接换名字 —— 那是无作用域感知的文本替换，
          // 换完可能和同作用域里已有的名字撞车，babel 直接抛 Duplicate declaration。
          needed.set(pkg.package, [...(needed.get(pkg.package) ?? []), { imported: sym, local: raw }]);
          imports.set(raw, { from: pkg.package, imported: sym });
          continue;
        }
        const hit = (exportIndex.get(raw) ?? exportIndex.get(b) ?? []).filter((h) => h.file !== host);
        if (hit.length) {
          const exported = hit[0].exported ?? raw;
          const relPath = relativeImport(host, hit[0].file);
          needed.set(relPath, [...(needed.get(relPath) ?? []), { imported: exported, local: raw }]);
          imports.set(raw, { from: relPath, imported: exported });
          continue;
        }
        chunkUnresolved.add(raw);
      }
      // 只落地「引用全都能接上」的语句。接不上的多半是引用了第三方符号
      //（prosemirror 的 TableMap、zod 的 object$1 一类），我们这边是从 npm 包导入的，
      // 名字对不上；这种情况硬塞进来会让 rollup 把它当外部全局，构建能过、运行时才炸。
      if (chunkUnresolved.size) {
        // 引用的名字能在 node_modules 里找到（哪怕是包的内部名字），说明这条语句本身就是
        // 那份第三方代码被内联进来的 —— 不是应用代码，不该落到我们的源码树里。
        // 只查导出的名字看不出这一点：`isCellSelection`、`checkTextSelection` 都是包内部的私有函数。
        const inPackages = [...chunkUnresolved].filter((n) => packageIdentifiers.has(base(n)));
        if (inPackages.length >= Math.ceil(chunkUnresolved.size / 2)) {
          stats.vendorStatements += 1;
          vendorSkipped.push({ name: c.aliases, via: inPackages.slice(0, 4) });
          continue;
        }
        skipped.push({ name: c.aliases, unresolved: [...chunkUnresolved].slice(0, 6) });
        for (const n of chunkUnresolved) stats.unresolvedRefs.add(n);
        continue;
      }
      const declared = (c.row.names ?? []).map(base);
      // 文件里已经声明过同名就不必再补（会变成重复声明）。
      // 用 some 不用 every：一条语句常同时声明好几个名字，只要有一个撞上就不能整条塞进去。
      // 名字按「去掉 $N 后缀」比 —— bundle 的 `ERROR_CODES$2` 和文件里的 `ERROR_CODES$2`
      // 本来就是一个东西，带后缀比才会漏判。
      const already = new Set(declaredNames(text).map(base));
      const clash = declared.filter((n) => already.has(base(n)));
      if (clash.length) {
        skipped.push({ name: c.aliases, unresolved: [`(宿主文件里已有同名声明：${clash.slice(0, 3).join(", ")})`] });
        continue;
      }
      if (declared.some((n) => hostReachable(n)) && /^(?:async\s+)?(?:function|class|const|let|var)\b/.test(code)) {
        code = `export ${code}`;
      }
      body.push(code);
    }
    if (!body.length) {
      report.push({ file: host, statements: 0, skipped: skipped.length });
      continue;
    }
    let next = `${text.trimEnd()}\n\n${body.join("\n\n")}\n`;
    if (needed.size) next = insertImports(next, needed);
    try {
      parseModule(next);
    } catch (err) {
      report.push({ file: host, statements: unique.length, error: err.message });
      continue;
    }
    stats.files += 1;
    stats.statements += body.length;
    stats.skippedStatements += skipped.length;
    stats.imports += needed.size;
    report.push({ file: host, statements: body.length, skipped: skipped.length, names: unique.map((u) => u.aliases).slice(0, 6), skippedNames: skipped.map((s) => s.name).slice(0, 5), skippedRefs: skipped.flatMap((s) => s.unresolved).slice(0, 6) });
    writeFileSync(path.join(proposalDir, host.replace(/\//g, "__")), next);
    if (args.apply) writeFileSync(path.join(root, SRC_ROOT, host), next);
  }

  writeFileSync(
    path.join(root, ".probe/refdiff/materialize-report.json"),
    `${JSON.stringify({ mode: args.apply ? "apply" : "dry-run", stats: { ...stats, unresolvedRefs: [...stats.unresolvedRefs].sort() }, files: report, crossFileNames: unresolvedName, vendorSkipped }, null, 2)}\n`,
  );
  console.log(`\n模式：${args.apply ? "写回源码" : "dry-run"}`);
  console.log(`落地语句 ${stats.statements} 条，跨 ${stats.files} 个文件`);
  console.log(`判为第三方内联代码、不落地 ${stats.vendorStatements} 条`);
  console.log(`因引用接不上而跳过 ${stats.skippedStatements} 条`);
  console.log(`接回 import 的模块 ${stats.imports} 个；跨新模块引用 ${stats.moduleRefs.size} 个`);
  console.log(`仍然找不到出处的标识符 ${stats.unresolvedRefs.size} 个`);
  if (stats.unresolvedRefs.size) console.log(`  ${[...stats.unresolvedRefs].slice(0, 20).join(", ")}`);
  console.log(`报告 → .probe/refdiff/materialize-report.json`);
}

await main().catch((e) => {
  console.error(e);
  process.exit(1);
});
void atomsOf;
void declaredNames;
