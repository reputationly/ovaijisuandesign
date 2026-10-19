// 收尾「引用了但没定义」的标识符。
//
//   node scripts/refdiff/fix-dangling-refs.mjs [--apply] [--limit N]
//
// 三类分别处理：
//   1. 包已经导出的（`createTable` 在 prosemirror-tables 里）→ 给引用它的文件补一行 import；
//   2. 包内部的名字（`keys`、`object$1`）→ 那是第三方代码被内联进来的痕迹，不补，如实报；
//   3. 真正缺的应用符号 → 在**引用它的文件所在目录**下建一个小模块，按名字命名，
//      模块导出这个符号，引用方补 import。
//
// 第 3 条为什么放在引用方的目录、而不是按 bundle 位置建：新增语句在 bundle 里碎成几百段，
// 按位置建会造出大量一两行的模块；而「谁要用它」是确定的，放一起也符合仓库现有的组织方式
//（一个概念一个文件，同目录内互相 import）。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
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
  renameIdentifier,
} from "./source-index.mjs";

const SRC_ROOT = "app/renderer/src";
const NEW_BUNDLE = ".probe/reference/4.0.0/asar/out/renderer/assets/index-BBp4hclA.js";
const base = (n) => n.replace(/\$\d+$/, "");
const kebab = (n) => base(n).replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[^A-Za-z0-9]+/g, "-").toLowerCase();

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

  const nmIndex = buildNodeModulesIndex(path.join(root, "app/renderer/node_modules"));
  const nmIds = collectPackageIdentifiers(path.join(root, "app/renderer/node_modules"));
  const exportIndex = buildExportIndex(files, read);
  // Vite 把懒加载模块切成 `./名字-构建哈希.js`；bundle 里留的是带哈希的名字，
  // 直接照抄会让 rollup 报 `Could not resolve`。按模块基名换回真实路径。
  const moduleByBase = new Map();
  for (const rel of files) {
    const b = path.basename(rel).replace(/\.[^.]+$/, "");
    if (!moduleByBase.has(b)) moduleByBase.set(b, rel);
  }
  const CHUNK_IMPORT = /(["'`])\.\/([A-Za-z0-9_][A-Za-z0-9_.-]*?)-([A-Za-z0-9_-]{8})\.(js|css)\1/g;
  const rewriteChunkImports = (code, fromRel) => {
    const missing = [];
    const out = code.replace(CHUNK_IMPORT, (m, q, base) => {
      const target = moduleByBase.get(base);
      if (!target) {
        missing.push(base);
        return m;
      }
      return `${q}${relativeImport(fromRel, target)}${q}`;
    });
    return { code: out, missing };
  };
  const importIndex = buildImportIndex(files, read);

  // 1. 每个文件里「引用了但没定义」的名字
  const dangling = new Map(); // 文件 → Set(名字)
  const refCount = new Map(); // 名字 → Set(文件)
  for (const rel of files) {
    let free;
    try {
      free = freeIdentifiers(read(rel));
    } catch {
      continue;
    }
    const set = new Set(free.filter((n) => n.length > 0));
    if (!set.size) continue;
    dangling.set(rel, set);
    for (const n of set) refCount.set(n, new Set([...(refCount.get(n) ?? []), rel]));
  }

  // 2. 分类
  const pkgExported = new Map(); // 名字 → 包
  const pkgInternal = new Set();
  const appMissing = new Set();
  const tooShort = new Set();
  for (const n of refCount.keys()) {
    const b = base(n);
    // 分类这一步同样要挡短名：`k$5` 的基名是 `k`，长度 1，
    // 和某个包的导出名撞上的概率极高（撞上就是构建直接报 not exported）。
    // 这类名字宁可留在「未定义」清单里，也不去猜一个包。
    if (b.length < 3) {
      tooShort.add(n);
      continue;
    }
    // 短名字（`k`、`zh`、`t`）一律不按包名解析：它们是 rollup 的局部变量名，
    // 和某个包的导出名撞上的概率极高。撞上的后果不是「多一条无用 import」，
    // 而是构建直接报 not exported（`k` 被判成了 streamdown 的导出）。
    if (nmIndex.has(n)) pkgExported.set(n, nmIndex.get(n).package);
    else if (nmIndex.has(b)) pkgExported.set(n, nmIndex.get(b).package);
    else if (nmIds.has(n) || nmIds.has(b)) pkgInternal.add(n);
    else appMissing.add(n);
  }

  const stats = {
    danglingNames: refCount.size,
    pkgExported: pkgExported.size,
    pkgInternal: pkgInternal.size,
    tooShort: 0,
    appMissing: appMissing.size,
    importsFixed: 0,
    modulesCreated: 0,
    statementsPlaced: 0,
    filesTouched: 0,
    stillMissing: 0,
    abandonedModules: 0,
    plannedBeforeMerge: 0,
    absorbed: 0,
  };

  const edits = new Map(); // 文件 → { imports: Map(模块 → [{imported,local}]) }
  const bumpImport = (file, from, spec) => {
    if (!edits.has(file)) edits.set(file, { imports: new Map() });
    const e = edits.get(file);
    if (!e.imports.has(from)) e.imports.set(from, []);
    e.imports.get(from).push(spec);
  };

  // 3. ① 包已导出的：补 import（用别名，避免和文件里已有名字撞车）
  for (const [name, pkg] of pkgExported) {
    const b = base(name);
    const sym = nmIndex.has(name) ? name : b;
    for (const file of refCount.get(name)) {
      const local = existingImports(read(file));
      if (local.has(name)) continue;
      bumpImport(file, pkg, { imported: sym, local: name });
      stats.importsFixed += 1;
    }
  }

  // 4. ③ 真正缺的应用符号：从 4.0.0 里找声明它的语句，在引用方目录下建小模块
  const newRows = JSON.parse(readFileSync(".probe/refdiff/toplevel-4.0.0.json", "utf8")).rows;
  const newSrc = readFileSync(NEW_BUNDLE, "utf8");
  const declOf = new Map(); // 名字 → 语句下标
  newRows.forEach((r, i) => {
    for (const n of r.names ?? []) {
      const k = base(n);
      if (!declOf.has(k)) declOf.set(k, i);
      if (!declOf.has(n)) declOf.set(n, i);
    }
  });

  // 按「引用方所在目录 + 名字」分组，一个符号一个小模块。
  //
  // 要迭代：新模块之间会互相引用（`hasCompositionContext` 用到 `readCompositionContext`，
  // 而后者只被新语句引用、不在源码的未定义清单里）。只规划一轮，模块体里就永远有缺口。
  const modulePlan = new Map(); // 模块路径 → { statementIndexes:Set, exports:Set, owners:Set }
  const homeOf = new Map(); // 名字 → 模块路径
  const planFor = (rawName, ownerHint) => {
    // 统一用**去掉 $N 后缀**的名字当导出名和索引键。
    // bundle 里叫 `FILE_EXTENSION_PATTERN$1`、我们源码里写 `FILE_EXTENSION_PATTERN`，
    // 两边不一致会让导出和 import 对不上（rollup 报 not exported）。
    const name = base(rawName);
    const row = declOf.get(rawName) ?? declOf.get(name);
    if (row === undefined) return false;
    const refs = [...(refCount.get(name) ?? [])].sort(
      (a, b) => (dangling.get(a)?.size ?? 0) - (dangling.get(b)?.size ?? 0) || a.localeCompare(b),
    );
    const owner = refs[0] ?? ownerHint;
    if (!owner) return false;
    // 扩展名要按内容定：还原出来的语句里如果有 JSX，就必须叫 .jsx，
    // Vite/esbuild 不会在 .js 里解析 JSX（踩过：`node-type-image-icon.js` 报 Expression expected）。
    // bundle 里 JSX 一定长成 `jsxRuntimeExports.jsx(...)`，用它判断最省事，不用先生成。
    const raw = newSrc.slice(row.start, row.end);
    const ext = /jsxRuntimeExports\.jsxs?\(/.test(raw) ? ".jsx" : ".js";
    const modPath = path.posix.join(path.posix.dirname(owner), `${kebab(name)}${ext}`);
    if (!modulePlan.has(modPath)) modulePlan.set(modPath, { statementIndexes: new Set(), exports: new Set(), owners: new Set() });
    const plan = modulePlan.get(modPath);
    plan.statementIndexes.add(row);
    plan.exports.add(name);
    plan.owners.add(owner);
    homeOf.set(name, modPath);
    // 带后缀的写法也指向同一个模块，免得引用方用 `X$1` 时又去找一个新模块
    if (rawName !== name) homeOf.set(rawName, modPath);
    return true;
  };
  for (const name of appMissing) planFor(name);
  // 展开要有边界：只把「声明它的那条语句本身像应用代码」的符号拉进来。
  // 第一版没加这个闸门，顺着依赖闭包一路展开到 965 个模块 —— 把第三方代码全卷进来了。
  // 上限只是防跑飞，不是设计目标：设成 80 时正好卡在边界上，
  // 有 7 个模块因为依赖的模块没被规划出来而带缺口（`SettingsWorkspaceScope`、
  // `useCompositionPreview` 一类全在等这个名额）。
  const MAX_MODULES = Number(args["max-modules"] ?? 4000);
  // 闸门改成「不是第三方」而不是「有界面锚点」。
  // 应用模块的内部辅助函数（`autoAlignSnapshot`、`readAutoAlignPreference`、`FilledNodeTypeIcon`）
  // 本来就没有锚点，按锚点筛会把它们连同整条依赖链一起挡掉，模块永远拼不完整。
  const classified = JSON.parse(readFileSync(".probe/decompile/classified-3.0.21.json", "utf8"));
  const vendorNames = new Set();
  for (const r of classified) if (r.kind === "lib") for (const n of r.names ?? []) vendorNames.add(base(n));
  const looksLikeApp = (row) => {
    const names = (row.names ?? []).map(base);
    if (!names.length) return false; // 匿名语句拿不准，不拉进来
    return !names.every((n) => vendorNames.has(n));
  };
  // 展开到不动点，不能只跑固定三轮：依赖链常常更深
  //（`defaultEnhanceImageResolution` → `RESOLUTION_LONG_EDGE` → …），
  // 轮数不够就会留下「明明 4.0.0 有声明、却没被规划」的缺口。
  for (let round = 0; round < 12 && modulePlan.size < MAX_MODULES; round += 1) {
    let added = 0;
    for (const [modPath, plan] of modulePlan) {
      if (modulePlan.size >= MAX_MODULES) break;
      for (const idx of plan.statementIndexes) {
        const row = newRows[idx];
        let code;
        try {
          code = (await restoreStatementText(newSrc.slice(row.start, row.end))).code;
        } catch {
          continue;
        }
        let refs = [];
        try {
          refs = freeIdentifiers(code);
        } catch {
          refs = [];
        }
        for (const raw of refs) {
          if (homeOf.has(raw) || homeOf.has(base(raw))) continue;
          if (nmIndex.has(raw) || nmIndex.has(base(raw))) continue;
          if (nmIds.has(raw) || nmIds.has(base(raw))) continue;
          if (declaredNames(code).includes(raw)) continue;
          const declIdx = declOf.get(raw) ?? declOf.get(base(raw));
          if (declIdx === undefined) continue;
          // 这里**不能**再用 looksLikeApp 挡。
          // 它按「名字是否在 3.0.21 的第三方清单里」判断，而 `MAX_SCALE`、`TOKEN`、`muted`
          // 这类通用名字在旧版第三方代码里也出现过 —— 于是应用模块真正需要的常量被拒之门外，
          // 模块永远拼不齐、连着 31 个模块在第 0 轮就被裁掉。
          // 跑飞的风险已经由前面的包检查（nmIndex / nmIds）挡掉了：包的符号根本走不到这里。
          if (looksLikeApp(newRows[declIdx])) void 0;
          if (planFor(raw, path.posix.join(path.posix.dirname(modPath), "_"))) added += 1;
        }
      }
    }
    if (!added) break;
  }
  // 上面用 `dir/_` 占位补进来的，把 owner 修正回真实引用方目录
  for (const [, plan] of modulePlan) plan.owners = new Set([...plan.owners].filter((o) => !path.posix.basename(o) === "_" && !o.endsWith("/_")));

  /**
   * 生成一个模块的正文，并把模块内的自由标识符接回 import。
   * `homeOf` 用最终确定的映射（只有活下来的模块在里面），否则会 import 到不存在的文件。
   */
  const chunkUnresolvedStatements = new Set();
  const buildModuleBody = async (modPath, plan, homeOfFinal) => {
    const chunks = [];
    for (const idx of [...plan.statementIndexes].sort((a, b) => a - b)) {
      const row = newRows[idx];
      let code = (await restoreStatementText(newSrc.slice(row.start, row.end))).code;
      const chunkRewrite = rewriteChunkImports(code, modPath);
      if (chunkRewrite.missing.length) {
        // 换不回去就先不落地这条语句，否则构建直接失败
        chunkUnresolvedStatements.add(chunkRewrite.missing[0]);
        continue;
      }
      code = chunkRewrite.code;
      // 把声明名改成**我们源码在用的那个名字**：bundle 里叫 `DRAG_THRESHOLD$1`，
      // 引用方写的是 `DRAG_THRESHOLD`，不改名的话导出对不上 import（rollup 会报 not exported）。
      for (const bundleName of row.names ?? []) {
        const wanted = [...plan.exports].find((n) => base(n) === base(bundleName));
        if (wanted && wanted !== bundleName) code = renameIdentifier(code, bundleName, wanted);
      }
      const declared = (row.names ?? []).map(base);
      const needsExport = declared.some((n) => homeOfFinal.has(n) || homeOfFinal.has(base(n)) || plan.exports.has(n));
      if (needsExport && /^(?:async\s+)?(?:function|class|const|let|var)\b/.test(code)) code = `export ${code}`;
      chunks.push(code);
    }
    let body = `${chunks.join("\n\n")}\n`;
    // 整段再统一改名一次：模块里可能有第二条语句仍然写着 bundle 的 `X$1`。
    // 只按「语句自己的声明名」改会漏掉这种跨语句的引用，生成的文件就会自引用一个
    // 自己没导出的名字（`FILE_EXTENSION_PATTERN$1` 就是这么留下的）。
    for (const idx of plan.statementIndexes) {
      for (const bundleName of newRows[idx].names ?? []) {
        const canonical = base(bundleName);
        if (canonical === bundleName) continue;
        // 不要加「只有声明过才改」的判断：模块里常常是**引用**写着 `X$1`、声明已经改成了 `X`，
        // 加了这个判断反而漏改，文件就会自引用一个自己没导出的名字。
        body = renameIdentifier(body, bundleName, canonical);
      }
    }
    const imports = new Set();
    const needed = new Map();
    const declaredHere = new Set(declaredNames(body).map(base));
    const unresolved = new Set();
    let refs = [];
    try {
      refs = freeIdentifiers(body);
    } catch {
      refs = [];
    }
    for (const raw of refs) {
      const b = base(raw);
      if (declaredHere.has(b) || imports.has(raw)) continue;
      if (homeOfFinal.has(raw) || homeOfFinal.has(b)) {
        const target = homeOfFinal.get(raw) ?? homeOfFinal.get(b);
        if (target !== modPath) {
          const rel = relativeImport(modPath, target);
          needed.set(rel, [...(needed.get(rel) ?? []), { imported: b, local: raw }]);
        }
        imports.add(raw);
        continue;
      }
        // 太短的名字不要按包名解析：`k`、`zh` 这类是 rollup 的局部变量名，
        // 极易和某个包的导出名撞上（踩过：`k` 被判成 streamdown 的导出，构建直接报 not exported）。
      // 只有「按包名解析」这一条分支要守短名：`k`、`zh`、`cn$5` 是 rollup 的局部变量名，
      // 极易和某个包的导出名撞上（踩过：`k` 被判成 streamdown 的导出，构建直接报 not exported）。
      // **不能在这里 continue** —— 那会连后面「我们源码树里的导出」一起跳过，
      // 而 `cn` 确实是我们从 `infra/dialog-content.jsx` 导出的。
      const pkg = base(raw).length >= 3 ? (nmIndex.get(raw) ?? nmIndex.get(b)) : null;
      if (pkg) {
        const sym = nmIndex.has(raw) ? raw : b;
        needed.set(pkg.package, [...(needed.get(pkg.package) ?? []), { imported: sym, local: raw }]);
        imports.add(raw);
        continue;
      }
      const known = importIndex.get(raw) ?? importIndex.get(b);
      if (known && !known.ambiguous && !known.from.startsWith(".")) {
        needed.set(known.from, [...(needed.get(known.from) ?? []), { imported: known.imported, local: raw }]);
        imports.add(raw);
        continue;
      }
      const hit = (exportIndex.get(raw) ?? exportIndex.get(b) ?? []).filter((h) => h.file !== modPath);
      if (hit.length) {
        const rel = relativeImport(modPath, hit[0].file);
        needed.set(rel, [...(needed.get(rel) ?? []), { imported: hit[0].exported ?? raw, local: raw }]);
        imports.add(raw);
        continue;
      }
      unresolved.add(raw);
    }
    if (needed.size) body = insertImports(body, needed);
    for (const name of chunkUnresolvedStatements) unresolved.add(`chunk:${name}`);
    chunkUnresolvedStatements.clear();
    return { body, unresolved: [...unresolved] };
  };

  // 合并：**同目录 + 在 bundle 里邻近**的模块并成一个文件。
  // 一个符号一个文件会造出两百多个几行的模块；而 bundle 里挨着的语句本来就是一个上游模块，
  // 合并后既是合理的文件粒度，也保住了「按引用方目录就近放置」的性质。
  {
    const plannedCount = modulePlan.size;
    const byDir = new Map();
    for (const [modPath, plan] of modulePlan) {
      const dir = path.posix.dirname(modPath);
      if (!byDir.has(dir)) byDir.set(dir, []);
      for (const idx of plan.statementIndexes) byDir.get(dir).push({ idx, modPath });
    }
    const merged = new Map();
    const MERGE_GAP = 32;
    for (const [dir, items] of byDir) {
      items.sort((a, b) => a.idx - b.idx);
      const clusters = [];
      let cur = [];
      let prev = -Infinity;
      for (const it of items) {
        if (it.idx - prev > MERGE_GAP && cur.length) {
          clusters.push(cur);
          cur = [];
        }
        cur.push(it);
        prev = it.idx;
      }
      if (cur.length) clusters.push(cur);
      for (const cluster of clusters) {
        const memberMods = [...new Set(cluster.map((x) => x.modPath))];
        const primary = path.posix.basename(memberMods[0]).replace(/\.jsx?$/, "");
        const ext = memberMods.some((m) => m.endsWith(".jsx")) ? ".jsx" : ".js";
        const newPath = path.posix.join(dir, `${primary}${ext}`);
        const target = merged.get(newPath) ?? { statementIndexes: new Set(), exports: new Set(), owners: new Set() };
        for (const m of memberMods) {
          const p = modulePlan.get(m);
          if (!p) continue;
          for (const idx of p.statementIndexes) target.statementIndexes.add(idx);
          for (const e of p.exports) target.exports.add(e);
          for (const o of p.owners) target.owners.add(o);
          for (const [name, mod] of [...homeOf]) if (mod === m) homeOf.set(name, newPath);
        }
        merged.set(newPath, target);
      }
    }
    modulePlan.clear();
    for (const [k, v] of merged) modulePlan.set(k, v);
    stats.mergeGap = MERGE_GAP;
    stats.plannedBeforeMerge = plannedCount;
  }

  // 吸收：模块缺什么名字，就把「声明这个名字的那条语句」并进自己。
  //
  // 为什么不靠「给每个符号建一个模块、再互相 import」：那样会形成连锁 ——
  // 被依赖的模块一旦有缺口就死，死了之后依赖它的也跟着死，实测 44 个模块在第 0 轮
  // 就被这一条链全部裁掉。让模块自己把依赖吃进来，链条就断了。
  // 一个符号只归**第一个需要它的模块**所有（claimed），避免同一份声明被复制到多个文件里
  // 造成重复声明。
  {
    const claimed = new Map(); // 符号名 → 归哪个模块
    for (const [modPath, plan] of modulePlan) {
      for (const e of plan.exports) claimed.set(base(e), modPath);
    }
    let grew = true;
    let guard = 0;
    while (grew && guard < 6) {
      grew = false;
      guard += 1;
      for (const [modPath, plan] of modulePlan) {
        const built = await buildModuleBody(modPath, plan, new Map());
        for (const raw of built.unresolved) {
          const b = base(raw);
          if (claimed.has(b)) continue;
          const declIdx = declOf.get(raw) ?? declOf.get(b);
          if (declIdx === undefined) continue;
          if (nmIndex.has(b) || nmIds.has(b)) continue;
          claimed.set(b, modPath);
          plan.statementIndexes.add(declIdx);
          plan.exports.add(b);
          grew = true;
        }
      }
    }
    stats.absorbed = claimed.size;
  }

  // 统一的不动点：一个模块要「活下来」得同时满足两条 ——
  //   1. 它自己的自由标识符全都能接上（包括指向别的模块）；
  //   2. 它依赖的模块也活下来。
  //
  // 早先这两件事是分开做的（先按「所有模块都可用」生成一遍拿缺口，再只按「依赖的模块死了」
  // 裁剪），于是「因有缺口被跳过」的模块仍然留在 alive 里、文件却没写出去，
  // 别处照样 import 它 —— 构建报 `Could not resolve "./mention-remove-button.jsx"`。
  // 缺口和死亡必须放在同一个不动点里算。
  const alive = new Set(modulePlan.keys());
  const pruneReasons = new Map();
  let builtBodies = new Map();
  for (let round = 0; round < 8; round += 1) {
    const allowed = new Map([...homeOf].filter(([, mod]) => alive.has(mod)));
    const dead = new Set();
    builtBodies = new Map();
    for (const modPath of alive) {
      const built = await buildModuleBody(modPath, modulePlan.get(modPath), allowed);
      builtBodies.set(modPath, built);
      if (built.unresolved.length) dead.add(modPath);
    }
    if (!dead.size) break;
    for (const d of dead) {
      // 记住「为什么死」：不动点里上一轮死掉的模块会让下一轮别的模块也死，
      // 只看最终报告全是没有缺口的样子，看不出根因。
      pruneReasons.set(d, { unresolved: builtBodies.get(d)?.unresolved ?? [], round });
      alive.delete(d);
    }
  }
  for (const [name, mod] of [...homeOf]) if (!alive.has(mod)) homeOf.delete(name);
  stats.abandonedModules = modulePlan.size - alive.size;
  stats.stillMissing = [...builtBodies].filter(([m, b]) => alive.has(m) && b.unresolved.length).length;

  const createDirs = new Set();
  for (const [modPath, plan] of modulePlan) {
    if (!alive.has(modPath)) continue;
    const built = builtBodies.get(modPath) ?? (await buildModuleBody(modPath, plan, homeOf));
    plan.body = built.body;
    plan.unresolved = built.unresolved;
    if (built.unresolved.length) continue;
    // 引用方补 import
    for (const [name, mod] of homeOf) {
      if (mod !== modPath) continue;
      // 只处理规范名。`homeOf` 里还存着带 `$N` 后缀的别名，遍历到它会再补一条
      // `import { X$1 }`（而模块导出的是 `X`），rollup 直接报 not exported。
      if (base(name) !== name) continue;
      // 按**去后缀**的名字找引用方：模块导出的是 `AttachmentKindIcon`，
      // 而文件里写的可能是 `AttachmentKindIcon$1`。只按原样查 refCount 会漏掉这些文件，
      // import 补不上，于是留下悬空引用（构建还不报）。
      const files = new Set([
        ...(refCount.get(name) ?? []),
        ...[...dangling].filter(([, names]) => [...names].some((x) => base(x) === name)).map(([rel]) => rel),
      ]);
      for (const file of files) {
        const local = [...(dangling.get(file) ?? [])].find((x) => base(x) === name) ?? name;
        bumpImport(file, relativeImport(file, modPath), { imported: name, local });
      }
    }
    createDirs.add(path.posix.dirname(modPath));
    stats.modulesCreated += 1;
    stats.statementsPlaced += plan.statementIndexes.size;
    stats.filesTouched += plan.owners.size;
  }

  if (args.apply) {
    for (const dir of createDirs) mkdirSync(path.join(root, SRC_ROOT, dir), { recursive: true });
    for (const [modPath, plan] of modulePlan) {
      if (!plan.body || plan.unresolved.length) continue;
      writeFileSync(path.join(root, SRC_ROOT, modPath), plan.body);
    }
    let touched = 0;
    for (const [file, e] of edits) {
      const full = read(file);
      let next = insertImports(full, e.imports);
      try {
        parseModule(next);
      } catch (err) {
        console.log(`  跳过 ${file}：补 import 后语法错误（${err.message}）`);
        continue;
      }
      writeFileSync(path.join(root, SRC_ROOT, file), next);
      touched += 1;
    }
    console.log(`写回 ${touched} 个文件的 import；新建 ${stats.modulesCreated} 个模块`);
  } else {
    for (const [modPath, plan] of [...modulePlan].slice(0, 12)) {
      console.log(`  拟建 ${modPath}  导出 ${[...plan.exports].join(", ")}  语句 ${plan.statementIndexes.size} 条${plan.unresolved?.length ? `  ← 仍缺 ${plan.unresolved.slice(0, 3).join(",")}` : ""}`);
    }
  }

  writeFileSync(
    path.join(root, ".probe/refdiff/dangling-report.json"),
    `${JSON.stringify({ mode: args.apply ? "apply" : "dry-run", stats, pkgInternal: [...pkgInternal].sort(), appMissing: [...appMissing].sort(), modules: [...modulePlan].map(([m, p]) => ({
      module: m,
      // 区分「活下来但没写出去」和「被裁剪掉」—— 早先把两者都序列化成 `unresolved: []`，
      // 看报告会以为模块没问题，实际根本没生成文件。
      status: alive.has(m) ? "created" : "pruned",
      exports: [...p.exports],
      statements: p.statementIndexes.size,
      unresolved: p.unresolved ?? builtBodies.get(m)?.unresolved ?? pruneReasons.get(m)?.unresolved ?? [],
      pruneRound: pruneReasons.get(m)?.round ?? null,
    })) }, null, 2)}\n`,
  );
  console.log(`\n未定义引用 ${stats.danglingNames} 个：包已导出 ${stats.pkgExported} / 包内部 ${stats.pkgInternal} / 缺的应用符号 ${stats.appMissing}`);
  console.log(`拟建新模块 ${stats.modulesCreated} 个，落语句 ${stats.statementsPlaced} 条；依赖裁剪掉 ${stats.abandonedModules} 个，仍有缺口 ${stats.stillMissing} 个`);
  console.log(`报告 → .probe/refdiff/dangling-report.json`);
}

await main().catch((e) => {
  console.error(e);
  process.exit(1);
});
void existsSync;
void atomsOf;
void parse;
