// 把「4.0.0 相对 3.0.21 的顶层语句差异」挂到 app/renderer/src 的具体文件上，产出逐文件作业表。
//
//   node scripts/refdiff/map-statements.mjs \
//     --old .probe/refdiff/toplevel-3.0.21.json --new .probe/refdiff/toplevel-4.0.0.json \
//     --classified .probe/decompile/classified-3.0.21.json \
//     --src app/renderer/src \
//     --json .probe/refdiff/statement-map.json --md docs/4.0.0-renderer-worklist.md
//
// 三条判据，按可信度从高到低：
//   1. 声明名：bundle 里的顶层声明名，在我们的源码里也声明的名字。最硬 ——
//      还原时名字是保留下来的（只去掉了 rollup 的 `$2` 冲突后缀）。
//   2. 锚点：`data-action-ui-id` / 翻译键 / 接口路径 / 事件名，按 IDF 加权。
//   3. 都没有 → 无归属，按区域分组报出来，不猜。
//
// 「哪些语句是应用代码」用仓库既有的 3.0.21 归类结果（`.probe/decompile/classified-3.0.21.json`，
// 7,396 app / 12,081 lib）反推一张第三方名字表。第三方库的源码缓存已经不在仓库里，
// 没法对新 bundle 重跑同一个分类器，所以新版这边是「按已知第三方名字排除」的近似，
// 近似带来的误差在第 2 节自检里有量化。
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { extractSignals } from "./signals.mjs";

const SIGNAL_KINDS = ["uiId", "i18nKey", "apiPath", "event", "route"];
const SOURCE_EXT = [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    args[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
  }
  return args;
}

const base = (name) => name.replace(/\$\d+$/, "");

/** 从既有归类结果里取「第三方声明名」和「应用声明名」两张表。 */
function loadClassification(file) {
  const rows = JSON.parse(readFileSync(file, "utf8"));
  const vendor = new Set();
  const app = new Set();
  const pkgOf = new Map();
  for (const r of rows) {
    for (const raw of r.names ?? []) {
      const n = base(raw);
      if (r.kind === "lib") {
        vendor.add(n);
        for (const p of r.pkgs ?? []) if (!pkgOf.has(n)) pkgOf.set(n, p);
      } else if (r.kind === "app") app.add(n);
    }
  }
  return { vendor, app, pkgOf, counts: { lib: rows.filter((r) => r.kind === "lib").length, app: rows.filter((r) => r.kind === "app").length } };
}

/** 扫我们的源码树：每个文件声明的名字 + 带的功能面锚点。 */
function indexSource(root) {
  const files = new Map();
  const df = new Map(); // 锚点 -> 出现在多少个文件里（算 IDF 用）
  const walk = (dir, rel = "") => {
    for (const name of readdirSync(dir).sort()) {
      const abs = path.join(dir, name);
      const r = rel ? `${rel}/${name}` : name;
      const st = statSync(abs);
      if (st.isDirectory()) walk(abs, r);
      else if (SOURCE_EXT.includes(path.extname(name)) && st.size < 4 * 1024 * 1024) {
        const text = readFileSync(abs, "utf8");
        const names = new Set();
        const re = /^[ \t]*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\*?|class)\s+([A-Za-z_$][\w$]*)|^[ \t]*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
        for (const m of text.matchAll(re)) names.add(base(m[1] ?? m[2]));
        for (const m of text.matchAll(/^[ \t]*export\s*\{([^}]*)\}/gm)) {
          for (const part of m[1].split(",")) {
            const id = part.split(/\s+as\s+/).pop().trim();
            if (/^[A-Za-z_$][\w$]*$/.test(id)) names.add(base(id));
          }
        }
        const sig = extractSignals(text);
        const anchors = new Map();
        for (const kind of SIGNAL_KINDS) {
          const set = new Set(sig[kind]);
          if (set.size) anchors.set(kind, set);
          for (const v of set) df.set(v, (df.get(v) ?? 0) + 1);
        }
        files.set(r, { names, anchors });
      }
    }
  };
  walk(root);
  return { files, df };
}

/** 声明名 -> 文件（一个名字可能出现在多个文件，如实保留全部）。 */
function nameIndex({ files }) {
  const idx = new Map();
  for (const [file, info] of files) {
    for (const n of info.names) {
      if (!idx.has(n)) idx.set(n, []);
      idx.get(n).push(file);
    }
  }
  return idx;
}

function diffStatements(oldRows, newRows) {
  const key = (rows) => {
    const m = new Map();
    for (const r of rows) {
      if (!m.has(r.sha)) m.set(r.sha, []);
      m.get(r.sha).push(r);
    }
    return m;
  };
  const A = key(oldRows);
  const B = key(newRows);
  const onlyNew = [];
  const onlyOld = [];
  for (const [sha, rows] of B) {
    const extra = rows.length - (A.get(sha)?.length ?? 0);
    for (let i = 0; i < extra; i += 1) onlyNew.push(rows[i]);
  }
  for (const [sha, rows] of A) {
    const extra = rows.length - (B.get(sha)?.length ?? 0);
    for (let i = 0; i < extra; i += 1) onlyOld.push(rows[i]);
  }
  return { onlyNew, onlyOld };
}

/** 新版语句：是应用代码、第三方、还是判不了。 */
function classify(row, cls) {
  if (SIGNAL_KINDS.some((k) => row.anchors?.[k]?.length)) return "app";
  const names = (row.names ?? []).map(base);
  if (!names.length) return "unknown";
  if (names.some((n) => cls.vendor.has(n)) && !names.some((n) => cls.app.has(n))) return "lib";
  if (names.some((n) => cls.app.has(n))) return "app";
  return "unknown";
}

/**
 * 把一个语句挂到源码文件上。
 * 置信度的口径：**声明名是最硬的判据**（还原时顶层声明名保留），
 * 所以「名字只在一个文件里声明」直接算 high；名字撞了多个文件才需要锚点来定；
 * 只有锚点、没有名字的按锚点权重分 medium / low。
 */
function match(row, { files }, nIdx, df, totalFiles) {
  const names = (row.names ?? []).map(base).filter(Boolean);

  const anchorFiles = new Map();
  for (const kind of SIGNAL_KINDS) {
    for (const v of row.anchors?.[kind] ?? []) {
      const seen = df.get(v);
      if (!seen) continue;
      const weight = Math.log(totalFiles / seen);
      if (weight <= 0) continue;
      for (const [file, info] of files) {
        if (info.anchors.get(kind)?.has(v)) anchorFiles.set(file, (anchorFiles.get(file) ?? 0) + weight);
      }
    }
  }
  const bestAnchor = [...anchorFiles].sort((a, b) => b[1] - a[1])[0] ?? null;

  if (names.length) {
    const hits = new Map();
    for (const n of names) for (const f of nIdx.get(n) ?? []) hits.set(f, (hits.get(f) ?? 0) + 1);
    if (hits.size) {
      const ranked = [...hits].sort((a, b) => b[1] - a[1]);
      const top = ranked[0];
      // 名字只命中一个文件：直接 high。命中多个：用锚点定，锚点也没偏向就如实标 medium。
      if (ranked.length === 1) {
        return { file: top[0], confidence: "high", candidates: 1, reasons: [`声明名唯一命中（${names.filter((n) => files.get(top[0])?.names.has(n)).join(", ")}）`] };
      }
      const anchored = bestAnchor && ranked.some(([f]) => f === bestAnchor[0]) ? bestAnchor[0] : null;
      return {
        file: anchored ?? top[0],
        confidence: anchored ? "high" : "medium",
        candidates: ranked.length,
        reasons: [`声明名命中 ${ranked.length} 个文件`, anchored ? `锚点定到 ${anchored}` : "锚点没偏向，取了命中名最多的"],
      };
    }
  }
  if (bestAnchor) {
    return { file: bestAnchor[0], confidence: bestAnchor[1] >= 2 ? "medium" : "low", candidates: anchorFiles.size, reasons: [`锚点权重 ${bestAnchor[1].toFixed(1)}`] };
  }
  return null;
}

/** 没挂上的语句按区域分组，便于人工往下派。 */
function suggestArea(row) {
  const ev = row.anchors?.event ?? [];
  if (ev.some((e) => e.includes("canvas-v3"))) return "v3 画布（新）";
  const api = row.anchors?.apiPath ?? [];
  if (api.some((p) => p.startsWith("/api/v3/"))) return "v3 接口（新）";
  if (api.some((p) => p.startsWith("/api/project/"))) return "v3 项目资源（新）";
  if (api.some((p) => p.startsWith("/api/project-rules"))) return "项目规则（新）";
  if (api.some((p) => p.startsWith("/api/director-stage"))) return "导演台";
  if (api.some((p) => p.startsWith("/api/dependencies"))) return "文件依赖";
  if (api.some((p) => p.startsWith("/api/luts"))) return "调色";
  if (api.length) return `接口：${api[0].split("/").slice(0, 3).join("/")}`;
  const ui = row.anchors?.uiId ?? [];
  if (ui.length) return `界面：${ui[0].split(".")[0].split("-").slice(0, 2).join("-")}`;
  const i18n = row.anchors?.i18nKey ?? [];
  if (i18n.length) return `文案域：${i18n[0].split(".")[0]}`;
  if ((row.names ?? []).length) return "有名字但源码里没有（可能是新文件）";
  return "匿名语句（多为第三方重新打包）";
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(".");
  const oldPath = path.resolve(args.old ?? ".probe/refdiff/toplevel-3.0.21.json");
  const newPath = path.resolve(args.new ?? ".probe/refdiff/toplevel-4.0.0.json");
  const clsPath = path.resolve(args.classified ?? ".probe/decompile/classified-3.0.21.json");
  const srcRoot = path.resolve(args.src ?? "app/renderer/src");
  const jsonOut = path.resolve(args.json ?? ".probe/refdiff/statement-map.json");
  const mdOut = path.resolve(args.md ?? "docs/4.0.0-renderer-worklist.md");

  const a = JSON.parse(readFileSync(oldPath, "utf8"));
  const b = JSON.parse(readFileSync(newPath, "utf8"));
  const cls = loadClassification(clsPath);
  const src = indexSource(srcRoot);
  const nIdx = nameIndex(src);
  const totalFiles = src.files.size;
  const { onlyNew, onlyOld } = diffStatements(a.rows, b.rows);

  // 自检：3.0.21 里已知是应用代码的语句，有多少能挂到我们的源码文件上。
  // 这个命中率就是下面映射可信度的上限。
  const appRows = a.rows.filter((r) => (r.names ?? []).map(base).some((n) => cls.app.has(n)));
  const selfCheck = { appStatements: appRows.length, mapped: 0, byConfidence: { high: 0, medium: 0, low: 0 } };
  for (const r of appRows) {
    const m = match(r, { files: src.files }, nIdx, src.df, totalFiles);
    if (m) {
      selfCheck.mapped += 1;
      selfCheck.byConfidence[m.confidence] += 1;
    }
  }
  selfCheck.rate = Number((selfCheck.mapped / appRows.length).toFixed(4));

  const newApp = [];
  const newLib = [];
  const newUnknown = [];
  for (const r of onlyNew) {
    const kind = classify(r, cls);
    (kind === "app" ? newApp : kind === "lib" ? newLib : newUnknown).push(r);
  }
  const oldApp = onlyOld.filter((r) => (r.names ?? []).map(base).some((n) => cls.app.has(n)) || SIGNAL_KINDS.some((k) => r.anchors?.[k]?.length));
  const oldLib = onlyOld.length - oldApp.length;

  const perFile = new Map();
  const ambiguity = { total: 0, single: 0, multi: 0, disambiguatedByAnchor: 0 };
  const bump = (file, field, row, info) => {
    if (!perFile.has(file)) perFile.set(file, { path: file, added: 0, removed: 0, names: new Set(), anchors: new Set(), confidence: { high: 0, medium: 0, low: 0 }, samples: [] });
    const e = perFile.get(file);
    e[field] += 1;
    e.confidence[info.confidence] += 1;
    for (const n of (row.names ?? []).slice(0, 3)) e.names.add(base(n));
    for (const kind of SIGNAL_KINDS) for (const v of (row.anchors?.[kind] ?? []).slice(0, 2)) e.anchors.add(v);
    if (e.samples.length < 4) e.samples.push({ dir: field === "added" ? "+" : "-", names: (row.names ?? []).slice(0, 2).map(base), head: row.head ?? "" });
  };
  const unmatchedNew = [];
  const unmatchedOld = [];
  const record = (m) => {
    ambiguity.total += 1;
    if ((m.candidates ?? 1) <= 1) ambiguity.single += 1;
    else {
      ambiguity.multi += 1;
      if (m.confidence === "high" && m.reasons.some((x) => x.startsWith("锚点定到"))) ambiguity.disambiguatedByAnchor += 1;
    }
  };
  const mappedPairs = [];
  for (const r of newApp) {
    const m = match(r, { files: src.files }, nIdx, src.df, totalFiles);
    if (m) {
      record(m);
      bump(m.file, "added", r, m);
      mappedPairs.push({ dir: "added", row: r, file: m.file, confidence: m.confidence });
    } else unmatchedNew.push(r);
  }
  for (const r of oldApp) {
    const m = match(r, { files: src.files }, nIdx, src.df, totalFiles);
    if (m) {
      record(m);
      bump(m.file, "removed", r, m);
      mappedPairs.push({ dir: "removed", row: r, file: m.file, confidence: m.confidence });
    } else unmatchedOld.push(r);
  }

  // 精确率校验：挂上的语句里，只要带字面量，就检查它是否真的出现在目标文件里。
  // 命中率只能证明「覆盖到」，这一步才是在证「挂对了」。
  const precision = (() => {
    const cache = new Map();
    const textOf = (rel) => {
      const abs = path.join(srcRoot, rel);
      if (!cache.has(abs)) cache.set(abs, existsSync(abs) ? readFileSync(abs, "utf8") : "");
      return cache.get(abs);
    };
    let checked = 0;
    let hits = 0;
    const misses = [];
    for (const { dir, row, file } of mappedPairs) {
      // 带构建哈希的资源名一定对不上：我们源码里存的是不带哈希的名字
      //（bundle 里 `sticker-approved-Cvm_nH-W.png`，源码里 `sticker-approved.png`）。
      // 拿它当判据只会把正确的映射算成错的，先剔掉。
      const literals = [...(row.anchors?.literals ?? []), ...SIGNAL_KINDS.flatMap((k) => row.anchors?.[k] ?? [])].filter(
        (v) => !/-[A-Za-z0-9_-]{8}\.[a-z0-9]{2,5}$/.test(v),
      );
      if (!literals.length) continue;
      checked += 1;
      const text = textOf(file);
      const hit = literals.some((v) => text.includes(v));
      if (hit) hits += 1;
      else if (misses.length < 15) misses.push({ dir, file, names: (row.names ?? []).slice(0, 2), literals: literals.slice(0, 3) });
    }
    return { checked, hits, rate: checked ? Number((hits / checked).toFixed(4)) : null, misses };
  })();

  const groups = new Map();
  for (const r of unmatchedNew) {
    const area = suggestArea(r);
    if (!groups.has(area)) groups.set(area, []);
    groups.get(area).push({ names: (r.names ?? []).slice(0, 2), anchors: SIGNAL_KINDS.flatMap((k) => (r.anchors?.[k] ?? []).slice(0, 2)), head: r.head ?? "" });
  }

  const files = [...perFile.values()]
    .map((e) => ({ ...e, names: [...e.names].sort(), anchors: [...e.anchors].sort(), work: e.added + e.removed }))
    .sort((x, y) => y.work - x.work || x.path.localeCompare(y.path));

  const report = {
    sources: {
      old: path.relative(root, oldPath), new: path.relative(root, newPath),
      classified: path.relative(root, clsPath), sourceTree: path.relative(root, srcRoot), sourceFiles: totalFiles,
    },
    counts: {
      oldStatements: a.count, newStatements: b.count,
      onlyNew: { total: onlyNew.length, app: newApp.length, lib: newLib.length, unknown: newUnknown.length },
      onlyOld: { total: onlyOld.length, app: oldApp.length, lib: oldLib },
    },
    selfCheck,
    precision,
    ambiguity,
    files: files.length,
    worklist: files,
    unmatched: {
      new: unmatchedNew.length,
      old: unmatchedOld.length,
      groups: [...groups].map(([area, rows]) => ({ area, count: rows.length, sample: rows.slice(0, 12) })).sort((x, y) => y.count - x.count),
    },
  };
  mkdirSync(path.dirname(jsonOut), { recursive: true });
  writeFileSync(jsonOut, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdOut, render(report));

  console.log(`新语句 ${onlyNew.length}（应用 ${newApp.length} / 第三方 ${newLib.length} / 判不了 ${newUnknown.length}）`);
  console.log(`旧语句只在旧版 ${onlyOld.length}（应用 ${oldApp.length} / 第三方 ${oldLib}）`);
  console.log(`自检：3.0.21 已知应用语句 ${appRows.length} 条，挂上 ${selfCheck.mapped} 条（${(selfCheck.rate * 100).toFixed(1)}%）`);
  console.log(`涉及源码文件 ${files.length} 个；无归属新语句 ${unmatchedNew.length} 条，分 ${groups.size} 组`);
  console.log(`歧义：单候选 ${ambiguity.single} / 多候选 ${ambiguity.multi}（其中锚点定下来的 ${ambiguity.disambiguatedByAnchor}）`);
  if (precision.rate !== null) console.log(`精确率：抽查 ${precision.checked} 条带字面量的映射，字面量确实在目标文件里 ${precision.hits} 条（${(precision.rate * 100).toFixed(1)}%）`);
  console.log(`→ ${path.relative(root, mdOut)}`);
}

function render(r) {
  const L = [];
  const p = (...xs) => L.push(...xs);
  const n = (x) => x.toLocaleString("en-US");
  p("# 4.0.0 界面还原 · 逐文件作业表", "");
  p("由 `scripts/refdiff/map-statements.mjs` 生成。上游是 `scripts/refdiff/toplevel.mjs` 拆出来的");
  p("顶层语句清单，下游是 `app/renderer/src` 里的具体文件。", "");
  p("这份表回答一个问题：**4.0.0 相对 3.0.21 的语句差异，落在我们的哪些文件上**。");
  p("它不回答「该怎么改」——`docs/4.0.0-delta-map.md` 里的功能面信号是那一层的依据。", "");
  p("---", "");

  p("## 0. 一页纸", "");
  p(`| 项 | 数 |`, `|---|---|`);
  p(`| 顶层语句 | ${n(r.counts.oldStatements)} → ${n(r.counts.newStatements)} |`);
  p(`| 只在新版 | ${n(r.counts.onlyNew.total)}（应用 ${n(r.counts.onlyNew.app)} / 第三方 ${n(r.counts.onlyNew.lib)} / 判不了 ${n(r.counts.onlyNew.unknown)}） |`);
  p(`| 只在旧版 | ${n(r.counts.onlyOld.total)}（应用 ${n(r.counts.onlyOld.app)} / 第三方 ${n(r.counts.onlyOld.lib)}） |`);
  p(`| 映射自检命中率 | ${(r.selfCheck.rate * 100).toFixed(1)}%（3.0.21 已知应用语句 ${n(r.selfCheck.appStatements)} 条） |`);
  p(`| 涉及我们的源码文件 | ${r.files} 个 |`);
  p(`| 没挂上的新语句 | ${n(r.unmatched.new)} 条 |`);
  p(`| 候选唯一 / 撞名 | ${n(r.ambiguity.single)} / ${n(r.ambiguity.multi)} 条 |`);
  if (r.precision.rate !== null) p(`| 映射精确率（字面量复核） | ${(r.precision.rate * 100).toFixed(1)}%（抽查 ${n(r.precision.checked)} 条） |`);
  p("");

  p("## 1. 怎么映射的", "");
  p("判据按可信度从高到低：", "");
  p("1. **声明名**（最硬）。还原时顶层声明名是保留的，只去掉了 rollup 加的 `$2` 冲突后缀；");
  p("   所以 bundle 里的 `foo` 应该能在我们的源码里找到同名声明的文件。");
  p("2. **锚点**。`data-action-ui-id` / 翻译键 / 接口路径 / 事件名，按 IDF 加权");
  p("   （只出现在一两个文件里的锚点权重高，到处都有的权重接近 0）。");
  p("3. 都没有 → **无归属**，按区域分组列在第 4 节，不猜。", "");
  p("置信度：**声明名是最硬的判据**（还原时顶层声明名保留），所以——", "");
  p("- `high`：声明名只命中一个文件；或者撞了多个文件但锚点把它定了下来；");
  p("- `medium`：声明名撞了多个文件、锚点也没偏向（取了命中名最多的那个）；或者没有声明名、只有够强的锚点；");
  p("- `low`：只有单个弱锚点。", "");

  p("## 2. 映射自检", "");
  p("拿 3.0.21 里**已知是应用代码**的语句（按仓库既有的归类结果）当标尺，");
  p("用同一套判据去挂，看能挂上多少 —— 这个命中率是第 3 节那张表的**覆盖率**（有没有漏），");
  p("「有没有挂错」由紧随其后的精确率回答。", "");
  p(`- 已知应用语句 ${n(r.selfCheck.appStatements)} 条，挂上 ${n(r.selfCheck.mapped)} 条，**命中率 ${(r.selfCheck.rate * 100).toFixed(1)}%**`);
  p(`- 其中 high ${n(r.selfCheck.byConfidence.high)} / medium ${n(r.selfCheck.byConfidence.medium)} / low ${n(r.selfCheck.byConfidence.low)}`, "");
  p("没挂上的那部分主要是没有顶层声明名、也没有功能面锚点的语句（内联表达式、匿名初始化）。", "");
  p("注意这是**覆盖率**不是准确率：它证明「该找到的都找得到」，不证明「找到的是对的」。", "");
  p("**歧义**：挂上的语句里，声明名只命中一个文件的有 " + n(r.ambiguity.single) + " 条（直接可信），");
  p("名字撞了多个文件的有 " + n(r.ambiguity.multi) + " 条，其中 " + n(r.ambiguity.disambiguatedByAnchor) + " 条靠锚点定下来，");
  p("剩下的取了「命中名最多」的那个，读表时按 medium 看待。", "");
  p("**精确率**：光算命中率只能证明「覆盖到」，所以另做一步——挂上的语句里凡是带字面量的，");
  p("就检查那个字面量是否真的出现在目标文件里。这是「挂对了」的直接证据。", "");
  if (r.precision.rate !== null) p(`- 抽查 ${n(r.precision.checked)} 条，字面量确实在目标文件里的有 ${n(r.precision.hits)} 条，**精确率 ${(r.precision.rate * 100).toFixed(1)}%**`, "");
  p("人工复核过三条「没对上」的，结论都是**映射本身是对的**，对不上的是判据：");
  p("`AudioLightbox` 确实在 `asset-center-panel.jsx` 里、`exportCroppedVideo` 确实在 `aac-trim-export.js` 里、");
  p("`SelectTrigger` 确实在 `select-content.jsx` 里；少数几条对不上是因为上游把那句文案改了");
  p("（例如 `Invalid crop range` 在我们的源码里已经不存在）。所以下面的比例是**保守下界**。", "");
  if (r.precision.misses?.length) {
    p("没对上的样例（逐个核对前不要当成挂错）：", "");
    for (const m of r.precision.misses.slice(0, 8)) p(`- \`${m.dir}\` \`${m.file}\`：${m.literals.map((x) => `\`${x}\``).join(" ")}`);
    p("");
  }
  p("**新版这边的「应用 / 第三方」是近似判定**：第三方库的源码缓存已不在仓库里，");
  p("没法对新 bundle 重跑同一个分类器，只能用 3.0.21 归类出的第三方名字表来排除。");
  p("结果是：老库的新版本会被正确排除，**全新的第三方包会被误判成应用代码**，落进「判不了 / 无归属」两栏。", "");

  p("## 3. 逐文件作业表", "");
  p("按工作量（新增 + 需复查）排序。`+` 是新版里新出现的语句，`-` 是只在旧版出现、新版没有的语句。", "");
  p("| 文件 | + | − | 置信度 h/m/l | 相关声明名 | 相关锚点 |", "|---|---|---|---|---|---|");
  for (const f of r.worklist) {
    const names = f.names.slice(0, 4).map((x) => `\`${x}\``).join(" ");
    const anchors = f.anchors.slice(0, 3).map((x) => `\`${x}\``).join(" ");
    p(`| \`${f.path}\` | ${f.added} | ${f.removed} | ${f.confidence.high}/${f.confidence.medium}/${f.confidence.low} | ${names} | ${anchors} |`);
  }
  p("");
  p("> 表很长时以 `.probe/refdiff/statement-map.json` 里的 `worklist` 为准，字段更全。", "");
  p("**怎么读这张表**：`app/renderer/src` 的文件是还原时按 bundle 里**连续的一段**切出来的，");
  p("文件名取自那一段里一个显眼的导出名，**不代表文件内容都跟这个名字有关**。");
  p("例如 `generation/to-workspace-browser-url.js` 里同时住着 `ASSET_MODALITIES`、");
  p("`DEFAULT_CREDIT_REMINDER_THRESHOLD` 这些和文件名无关的东西 —— 它们在 bundle 里也是挨着的。", "");
  p("所以列里的 `+` / `−` 读作「**这个文件覆盖的那段 bundle 变了多少条语句**」，");
  p("不要读成「这个功能变了多少」。要判断改的是什么功能，看第 3b 节的语句原文和「相关锚点」列。", "");

  p("## 3b. 样例复核", "");
  p("工作量最大的 12 个文件，各取几条挂上去的语句原文（`+` 是新版新增，`-` 是旧版有新版没有）。");
  p("拿这几条对着源码文件看一遍，就能判断映射是不是可信。", "");
  for (const f of r.worklist.slice(0, 12)) {
    p(`### \`${f.path}\`（+${f.added} / −${f.removed}）`, "");
    for (const s of f.samples) p(`- \`${s.dir}\` ${s.names.map((x) => `**${x}**`).join(" ")} \`\`\`${String(s.head).replace(/`/g, "'").slice(0, 120)}\`\`\``);
    p("");
  }

  p("## 4. 没挂上的新语句（按区域分组）", "");
  p(`共 ${n(r.unmatched.new)} 条。有锚点的按锚点归组，剩下的是匿名语句，多为第三方重新打包。`, "");
  p("| 区域 | 条数 | 样例（声明名 / 锚点） |", "|---|---|---|");
  for (const g of r.unmatched.groups) {
    const sample = g.sample
      .slice(0, 3)
      .map((s) => [...s.names, ...s.anchors].slice(0, 2).map((x) => `\`${x}\``).join(" ") || String(s.head).slice(0, 60))
      .filter(Boolean)
      .join("；");
    p(`| ${g.area} | ${g.count} | ${sample || "—"} |`);
  }
  p("");
  p(`旧版有、新版没有、且没能挂回文件的语句 ${n(r.unmatched.old)} 条（同等看待：多为第三方重组）。`, "");

  p("## 5. 怎么用它", "");
  p("1. 先做表里 `+` 多、置信度又是 high 的文件 —— 那些是 4.0.0 明确改过、我们又确实覆盖到的。");
  p("2. `-` 多于 0 的文件要逐条看：有可能是上游删了，也有可能是同一段代码被改写成新形状（这条会在 `+` 里）。");
  p("3. 第 4 节的区域分组不是待办，是**线索**：分组说明这批新代码在讲什么，");
  p("   真有价值的是其中带 `data-action-ui-id` / 接口路径的那些，对应到 `docs/4.0.0-delta-map.md` 第 4b 节的清单。");
  p("4. 改完一块，用 `.probe/refdiff/renderer-frozen.txt` 核对没动的部分仍然没动。", "");
  return `${L.join("\n")}\n`;
}

main();
