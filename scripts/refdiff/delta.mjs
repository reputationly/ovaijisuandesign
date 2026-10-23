// 比较两份「冻结好的参照」，产出 4.0.0 的差异图和还原作业单。
//
//   node scripts/refdiff/delta.mjs --old .probe/reference/3.0.21 --new .probe/reference/4.0.0
//
// 输入是 freeze.mjs 产出的 MANIFEST.json（纯内容清单，不含时间戳），所以结果可按字节复现。
// 输出：一份机器可读的 delta JSON（默认 .probe/refdiff/）和一份人读的差异报告（默认 docs/）。
//
// 为什么按「内容哈希 + chunk 基名」配对，而不是按文件名：Vite 产物文件名带构建哈希，
// 同一份源码在两次构建里文件名不同、无关文件反而可能同名。chunk 基名（哈希前那段）来自
// 源码模块名，是跨版本最稳的同一性线索。
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { resolvePair } from "./lib/refs.mjs";
import { diffSets, extractIpcSurfaceFromTree, extractSignalsFromTree, intersect } from "./signals.mjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    args[token.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
  }
  return args;
}

const mb = (n) => `${(n / 1048576).toFixed(2)} MB`;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");

function readManifest(refDir) {
  const file = path.join(refDir, "MANIFEST.json");
  if (!existsSync(file)) throw new Error(`缺少冻结结果：${file}（先跑 refdiff/freeze.mjs）`);
  return JSON.parse(readFileSync(file, "utf8"));
}

/** 按内容→多条路径建索引，便于识别「内容相同只是改名」。 */
function byContent(entries) {
  const map = new Map();
  for (const [p, meta] of Object.entries(entries)) {
    if (meta.kind !== "file") continue;
    if (!map.has(meta.sha256)) map.set(meta.sha256, []);
    map.get(meta.sha256).push(p);
  }
  return map;
}

/** 对比两张 `路径 → {sha256,size}` 表。asar 里的条目没有 kind 字段，一律按文件算。 */
function surfaceDiff(oldEntries, newEntries) {
  const isFile = (meta) => meta.kind === undefined || meta.kind === "file";
  const oldPaths = new Set(Object.keys(oldEntries).filter((p) => isFile(oldEntries[p])));
  const newPaths = new Set(Object.keys(newEntries).filter((p) => isFile(newEntries[p])));
  const added = [...newPaths].filter((p) => !oldPaths.has(p)).sort();
  const removed = [...oldPaths].filter((p) => !newPaths.has(p)).sort();
  const changed = [...newPaths].filter((p) => oldPaths.has(p) && oldEntries[p].sha256 !== newEntries[p].sha256).sort();
  const unchanged = [...newPaths].filter((p) => oldPaths.has(p) && oldEntries[p].sha256 === newEntries[p].sha256).sort();
  const oldContent = byContent(oldEntries);
  return {
    counts: { old: oldPaths.size, new: newPaths.size, added: added.length, removed: removed.length, changed: changed.length, unchanged: unchanged.length },
    bytes: {
      old: [...oldPaths].reduce((n, p) => n + oldEntries[p].size, 0),
      new: [...newPaths].reduce((n, p) => n + newEntries[p].size, 0),
    },
    added: added.map((p) => ({ path: p, size: newEntries[p].size, contentKnownFromOld: oldContent.has(newEntries[p].sha256) })),
    removed: removed.map((p) => ({ path: p, size: oldEntries[p].size })),
    changed: changed.map((p) => ({ path: p, oldSize: oldEntries[p].size, newSize: newEntries[p].size })),
    unchanged,
  };
}

/** Vite 产物文件名 → 基名（去掉末尾的构建哈希）。 */
function chunkBase(name) {
  const m = /^(.*)-([A-Za-z0-9_-]{8})(\.[a-z0-9]+)$/.exec(name);
  return m ? `${m[1]}${m[3]}` : name;
}

/** 渲染层 chunk 配对：先按内容，再按基名，剩下的如实报出来。 */
function pairChunks(oldDir, newDir) {
  const list = (dir, prefix) =>
    readdirSync(dir)
      .filter((n) => n.endsWith(".js") || n.endsWith(".css"))
      .map((n) => {
        const abs = path.join(dir, n);
        return { name: n, base: chunkBase(n), size: statSync(abs).size, path: path.relative(prefix, abs) };
      });
  const a = list(oldDir, oldDir);
  const b = list(newDir, newDir);
  const sameSize = (x, y) => x.size === y.size;

  const pairs = [];
  const usedB = new Set();
  const usedA = new Set();

  // 1) 基名相同，且大小相同 → 视为未改（名字带哈希，哈希一致时名字也一致）
  for (const x of a) {
    const y = b.find((c) => !usedB.has(c.name) && c.name === x.name);
    if (y) {
      pairs.push({ status: "same-name", old: x, new: y });
      usedA.add(x.name);
      usedB.add(y.name);
    }
  }
  // 2) 基名相同 → 改了。`index-*.js` 这种基名是通用的（一堆入口都用 index），
  //    所以同基名的候选往往不止一个：挑体积最接近的那个，并把比值记下来，
  //    差得远（>3 倍）的标成弱配对，免得把 20KB 的 index 和小 20MB 的主体配到一起。
  for (const x of a) {
    if (usedA.has(x.name)) continue;
    const pool = b.filter((c) => !usedB.has(c.name) && c.base === x.base);
    if (!pool.length) continue;
    const score = (c) => Math.abs(Math.log2((c.size || 1) / (x.size || 1)));
    const y = pool.reduce((best, c) => (score(c) < score(best) ? c : best), pool[0]);
    const sizeRatio = Number(((y.size || 1) / (x.size || 1)).toFixed(3));
    pairs.push({ status: score(y) > 1.6 ? "changed-uncertain" : "changed", old: x, new: y, sizeRatio, alternatives: pool.length - 1 });
    usedA.add(x.name);
    usedB.add(y.name);
  }
  // 3) 大小完全相同且没有别的候选 → 弱配对，标出来让人复核
  for (const x of a) {
    if (usedA.has(x.name)) continue;
    const pool = b.filter((c) => !usedB.has(c.name) && sameSize(c, x));
    if (pool.length === 1) {
      pairs.push({ status: "same-size-different-name", old: x, new: pool[0] });
      usedA.add(x.name);
      usedB.add(pool[0].name);
    }
  }
  // 4) 精确内容相同的旧 chunk 已被同内容的新 chunk 覆盖的情况
  for (const x of a) {
    if (usedA.has(x.name)) continue;
    const y = b.find((c) => !usedB.has(c.name) && c.name === x.name);
    if (y) {
      pairs.push({ status: "same-name-late", old: x, new: y });
      usedA.add(x.name);
      usedB.add(y.name);
    }
  }

  return {
    pairs: pairs.sort((p, q) => q.new.size - p.new.size),
    onlyOld: a.filter((x) => !usedA.has(x.name)).sort((p, q) => q.size - p.size),
    onlyNew: b.filter((x) => !usedB.has(x.name)).sort((p, q) => q.size - p.size),
    totals: { old: a.length, new: b.length, paired: pairs.length },
  };
}

/** 三方目录比对：基准（旧参照）/ 我们的仓库 / 新参照。 */
function threeWay(baseDir, oursDir, theirsDir) {
  const listFiles = (dir) => {
    const out = new Map();
    if (!existsSync(dir)) return out;
    const walk = (d, rel) => {
      for (const n of readdirSync(d).sort()) {
        const abs = path.join(d, n);
        const r = rel ? `${rel}/${n}` : n;
        const st = statSync(abs);
        if (st.isDirectory()) walk(abs, r);
        else out.set(r, readFileSync(abs));
      }
    };
    walk(dir, "");
    return out;
  };
  const base = listFiles(baseDir);
  const ours = listFiles(oursDir);
  const theirs = listFiles(theirsDir);
  const all = new Set([...base.keys(), ...ours.keys(), ...theirs.keys()]);
  const rows = [];
  for (const rel of [...all].sort()) {
    const b = base.get(rel);
    const o = ours.get(rel);
    const t = theirs.get(rel);
    const same = (x, y) => (x === undefined && y === undefined) || (x !== undefined && y !== undefined && x.equals(y));
    const oursChanged = !same(b, o);
    const theirsChanged = !same(b, t);
    let status;
    // 判定顺序很要紧：基准里就有的（`b` 有值）才是「改 / 删」，
    // 基准里没有的（`b` 为空）是「新增」。早先把顺序写反，会把我们自加的文件标成「上游删了」。
    if (b === undefined) {
      if (t === undefined) status = "ours-added";
      else if (o === undefined) status = "upstream-added";
      else status = same(o, t) ? "new-both-same" : "new-both-differ";
    } else if (o === undefined && t === undefined) status = "removed-both";
    else if (o === undefined) status = "we-removed";
    else if (t === undefined) status = "upstream-removed";
    else if (!oursChanged && !theirsChanged) status = "identical";
    else if (oursChanged && !theirsChanged) status = "ours-only";
    else if (!oursChanged && theirsChanged) status = "upstream-only";
    else status = same(o, t) ? "both-same-change" : "conflict";
    rows.push({ path: rel, status });
  }
  const summary = {};
  for (const r of rows) summary[r.status] = (summary[r.status] ?? 0) + 1;
  return { rows, summary };
}

/** 解析 docs/gateway-api.md：每条路由带控制器和「我们实现了没」。 */
function parseGatewayLedger(docPath) {
  const text = readFileSync(docPath, "utf8");
  const version = /MiniMax Design \*\*([^*]+)\*\*/.exec(text)?.[1] ?? "unknown";
  const totals = /共 (\d+) 条，(\d+) 个控制器。\*\*我们同名同方法实现了 (\d+) 条\*\*/.exec(text);
  const byController = {};
  let cls = null;
  for (const line of text.split("\n")) {
    const head = /^## (\w+)（(\d+)\/(\d+)）$/.exec(line);
    if (head) {
      cls = head[1];
      byController[cls] = { done: Number(head[2]), total: Number(head[3]), missing: [] };
      continue;
    }
    const route = /^([✓ ]) (GET|POST|PUT|PATCH|DELETE|ALL)\s+(\S+)$/.exec(line);
    if (route && cls) {
      if (route[1] !== "✓") byController[cls].missing.push(`${route[2]} ${route[3]}`);
    }
  }
  return {
    version,
    total: totals ? Number(totals[1]) : null,
    controllers: totals ? Number(totals[2]) : null,
    done: totals ? Number(totals[3]) : null,
    byController,
  };
}

function extractToolInventory(bundlePath, outJson) {
  if (!existsSync(bundlePath)) return null;
  try {
    execFileSync("/opt/homebrew/bin/python3.14", [path.join(root, "scripts/extract-mcp-tools.py"), "--bundle", bundlePath, "--json", outJson, "--out", `${outJson}.md`], { stdio: "pipe" });
    return JSON.parse(readFileSync(outJson, "utf8"));
  } catch (err) {
    return { error: String(err.stderr ?? err).slice(0, 500) };
  }
}

function toolDiff(oldTools, newTools) {
  if (!Array.isArray(oldTools) || !Array.isArray(newTools)) return null;
  const a = new Map(oldTools.map((t) => [t.name, t.input]));
  const b = new Map(newTools.map((t) => [t.name, t.input]));
  const added = [...b.keys()].filter((k) => !a.has(k)).sort();
  const removed = [...a.keys()].filter((k) => !b.has(k)).sort();
  const inputChanged = [...b.keys()]
    .filter((k) => a.has(k) && JSON.stringify(a.get(k).slice().sort()) !== JSON.stringify(b.get(k).slice().sort()))
    .sort()
    .map((k) => ({ name: k, oldInput: a.get(k), newInput: b.get(k) }));
  return { counts: { old: a.size, new: b.size }, added: added.map((k) => ({ name: k, input: b.get(k) })), removed, inputChanged };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  // 第 2040 轮：默认版本不再写死，交给 refs.mjs（--from/--to > OV_REF_* > 最新两版）
  const pair = resolvePair({ from: args.from ?? args.old, to: args.to ?? args.new });
  const oldDir = pair.fromDir;
  const newDir = pair.toDir;
  const oursRenderer = path.resolve(args["ours-renderer"] ?? "app/renderer/src");
  const gatewayDoc = path.resolve(args["gateway-doc"] ?? "docs/gateway-api.md");
  const tag = args.tag ?? `${path.basename(oldDir)}-to-${path.basename(newDir)}`;
  const jsonOut = path.resolve(args.json ?? `.probe/refdiff/delta-${tag}.json`);
  const mdOut = path.resolve(args.md ?? `docs/${path.basename(newDir)}-delta-map.md`);

  const oldM = readManifest(oldDir);
  const newM = readManifest(newDir);
  const meta = { old: { version: oldM.version, build: oldM.build, dir: path.relative(root, oldDir) }, new: { version: newM.version, build: newM.build, dir: path.relative(root, newDir) }, generatedBy: "scripts/refdiff/delta.mjs" };

  const asar = surfaceDiff(oldM.asar, newM.asar);
  const sidecar = surfaceDiff(oldM.sidecar, newM.sidecar);

  const rendererOld = path.join(oldDir, "asar/out/renderer/assets");
  const rendererNew = path.join(newDir, "asar/out/renderer/assets");
  const chunks = existsSync(rendererOld) && existsSync(rendererNew) ? pairChunks(rendererOld, rendererNew) : null;

  const signals = (() => {
    if (!existsSync(rendererNew)) return null;
    const newSig = extractSignalsFromTree(path.join(newDir, "asar/out/renderer")).signals;
    const oldSig = existsSync(rendererOld) ? extractSignalsFromTree(path.join(oldDir, "asar/out/renderer")).signals : null;
    const ours = existsSync(oursRenderer) ? extractSignalsFromTree(oursRenderer).signals : null;
    const delta = oldSig ? diffSets(oldSig, newSig) : null;
    const coverage = ours
      ? Object.fromEntries(
          Object.keys(newSig).map((k) => [
            k,
            {
              total: newSig[k].size,
              covered: intersect(newSig[k], ours[k] ?? new Set()).length,
              missing: [...newSig[k]].filter((x) => !(ours[k] ?? new Set()).has(x)).sort(),
            },
          ]),
        )
      : null;
    // v3 是整块新增的第二个界面，单独列一遍，作为「还原 v3」的作业面清单
    const v3Dir = path.join(newDir, "asar/out/renderer/v3");
    const v3 = existsSync(v3Dir) ? Object.fromEntries(Object.entries(extractSignalsFromTree(v3Dir).signals).map(([k, v]) => [k, [...v].sort()])) : null;
    // 真正要干的活：新版有、旧版没有、我们也没有 —— 这些是 4.0.0 新长出来的功能面。
    // 旧版就有而我们没有的，多半是有意去掉的（登录、营销弹窗、内置浏览器…），只计数不列全。
    const newWork = delta
      ? Object.fromEntries(
          Object.keys(newSig).map((k) => {
            const addedSet = new Set(delta[k].added);
            const has = (x) => (ours?.[k] ?? new Set()).has(x);
            return [
              k,
              {
                newUpstreamMissing: [...newSig[k]].filter((x) => addedSet.has(x) && !has(x)).sort(),
                droppedByUs: [...newSig[k]].filter((x) => !addedSet.has(x) && !has(x)).sort(),
              },
            ];
          }),
        )
      : null;
    return { delta, coverage, v3, newWork };
  })();

  const profiles = threeWay(
    path.join(oldDir, "sidecar/agent-profiles/v2"),
    path.resolve("assets/agent-profiles/v2"),
    path.join(newDir, "sidecar/agent-profiles/v2"),
  );

  const mcpOld = extractToolInventory(path.join(oldDir, "sidecar/mcp-tools/dist/main.js"), path.join(path.dirname(jsonOut), `mcp-tools-${path.basename(oldDir)}.json`));
  const mcpNew = extractToolInventory(path.join(newDir, "sidecar/mcp-tools/dist/main.js"), path.join(path.dirname(jsonOut), `mcp-tools-${path.basename(newDir)}.json`));
  const mcpV3 = extractToolInventory(path.join(newDir, "sidecar/mcp-tools-v3/dist/main.js"), path.join(path.dirname(jsonOut), `mcp-tools-v3-${path.basename(newDir)}.json`));

  const gateway = existsSync(gatewayDoc) ? parseGatewayLedger(gatewayDoc) : null;

  // 主进程 / preload 的通道面：这两层是重写的，通道名对齐是硬要求，单独数一遍。
  const ipc = (() => {
    const union = (paths) => {
      const acc = { channels: new Set(), unresolved: new Set(), exposed: new Set() };
      for (const p of paths) {
        const abs = path.resolve(p);
        if (!existsSync(abs)) continue;
        const r = extractIpcSurfaceFromTree(abs);
        for (const k of ["channels", "unresolved", "exposed"]) for (const x of r[k]) acc[k].add(x);
      }
      return acc;
    };
    const oldSig = existsSync(path.join(oldDir, "asar/out/main")) ? union([path.join(oldDir, "asar/out/main"), path.join(oldDir, "asar/out/preload")]) : null;
    const newSig = union([path.join(newDir, "asar/out/main"), path.join(newDir, "asar/out/preload"), path.join(newDir, "asar/out/renderer/v3")]);
    const oursSig = existsSync(path.resolve(args["ours-desktop"] ?? "app/desktop/src")) ? union([path.resolve(args["ours-desktop"] ?? "app/desktop/src")]) : null;
    const oursSet = oursSig?.channels ?? new Set();
    if (!oldSig) {
      return { newChannels: [...newSig.channels].sort(), oursChannels: oursSig ? [...oursSet].sort() : null, exposedOld: [...oldSig.exposed].sort() };
    }
    const added = [...newSig.channels].filter((x) => !oldSig.channels.has(x)).sort();
    const removed = [...oldSig.channels].filter((x) => !newSig.channels.has(x)).sort();
    return {
      delta: { before: oldSig.channels.size, after: newSig.channels.size },
      added,
      removed,
      newUpstreamMissing: added.filter((x) => !oursSet.has(x)),
      oursCanDrop: removed.filter((x) => oursSet.has(x)),
      oursCount: oursSig ? oursSet.size : null,
      oursExtra: oursSig ? [...oursSet].filter((x) => !newSig.channels.has(x) && !oldSig.channels.has(x)).sort() : null,
      unresolvedOld: [...oldSig.unresolved].sort(),
      unresolvedNew: [...newSig.unresolved].sort(),
      exposed: { old: [...oldSig.exposed].sort(), new: [...newSig.exposed].sort() },
    };
  })();

  // 可以直接沿用的渲染层产物：文件名和内容都没变的（`samePath`），
  // 以及内容没变但文件名换了哈希的（`sameContent`）。这两类加起来是「不用碰」的部分。
  const frozen = (() => {
    const oldAssets = Object.fromEntries(Object.entries(oldM.asar).filter(([p]) => p.startsWith("out/renderer/")));
    const newAssets = Object.entries(newM.asar).filter(([p]) => p.startsWith("out/renderer/"));
    const oldHashes = new Set(Object.values(oldAssets).map((x) => x.sha256));
    const samePath = [];
    const sameContent = [];
    for (const [p, meta] of newAssets) {
      if (oldAssets[p]?.sha256 === meta.sha256) samePath.push(p);
      else if (oldHashes.has(meta.sha256)) sameContent.push(p);
    }
    return { samePath: samePath.sort(), sameContent: sameContent.sort() };
  })();

  mkdirSync(path.dirname(jsonOut), { recursive: true });
  writeFileSync(
    path.join(path.dirname(jsonOut), "renderer-frozen.txt"),
    [
      "# 渲染层里 3.0.21 -> 4.0.0 一个字节都没变的文件",
      "# 路径和内容都相同：源码不用碰",
      ...frozen.samePath,
      "",
      "# 内容相同、只是文件名换了哈希：源码同样不用碰",
      ...frozen.sameContent,
      "",
    ].join("\n"),
  );
  const report = {
    meta,
    asar,
    sidecar,
    frozen,
    chunks: chunks && { totals: chunks.totals, changed: chunks.pairs.filter((p) => p.status !== "same-name").map((p) => ({ status: p.status, old: p.old.name, new: p.new.name, oldSize: p.old.size, newSize: p.new.size, sizeRatio: p.sizeRatio ?? null, alternatives: p.alternatives ?? 0 })), onlyOld: chunks.onlyOld, onlyNew: chunks.onlyNew, sameName: chunks.pairs.filter((p) => p.status === "same-name").length },
    signals,
    ipc,
    profiles,
    mcpToolsV2: toolDiff(mcpOld, mcpNew),
    mcpToolsV3: toolDiff(mcpOld, mcpV3),
    mcpToolsV3Names: Array.isArray(mcpV3) ? mcpV3.map((x) => x.name).sort() : null,
    gateway,
  };
  writeFileSync(jsonOut, `${JSON.stringify(report, null, 2)}\n`);

  writeFileSync(mdOut, renderMarkdown(report));
  console.log(`差异图 → ${path.relative(root, mdOut)}`);
  console.log(`机器可读 → ${path.relative(root, jsonOut)}`);
  return 0;
}

function renderMarkdown(r) {
  const L = [];
  const p = (...xs) => L.push(...xs);
  p(`# 参照应用 ${r.meta.old.version} → ${r.meta.new.version} 差异图`, "");
  p(`由 \`scripts/refdiff/delta.mjs\` 从两份冻结参照（\`${r.meta.old.dir}\` / \`${r.meta.new.dir}\`）算出。`, "");
  p(`冻结方式是 \`scripts/refdiff/freeze.mjs\`：把 asar 里的代码原样解出来、旁挂资源拷一份、给整包每个文件记 SHA-256。`, "");
  p(`这里只有**数出来的事实**，不含推断。数字和代码冲突时以代码为准。`, "");
  p("---", "");

  p("## 0. 一页纸", "");
  p("| 表面 | 旧 | 新 | 未变 | 改了 | 新增 | 消失 |", "|---|---|---|---|---|---|---|");
  const row = (name, s) => `| ${name} | ${s.counts.old} 个 / ${mb(s.bytes.old)} | ${s.counts.new} 个 / ${mb(s.bytes.new)} | ${s.counts.unchanged} | ${s.counts.changed} | ${s.counts.added} | ${s.counts.removed} |`;
  p(row("asar 全部条目", r.asar));
  if (r.chunks) p(`| 渲染层 chunk | ${r.chunks.totals.old} | ${r.chunks.totals.new} | ${r.chunks.sameName} | ${r.chunks.changed.length} | ${r.chunks.onlyNew.length} | ${r.chunks.onlyOld.length} |`);
  p("");

  p("### 分表面的条目数", "");
  p("| 表面 | 新增 | 消失 |", "|---|---|---|");
  const prefixes = ["out/main/", "out/preload/", "out/renderer/assets/", "out/renderer/v3/", "node_modules/"];
  for (const pre of prefixes) {
    const a = r.asar.added.filter((x) => x.path.startsWith(pre)).length;
    const d = r.asar.removed.filter((x) => x.path.startsWith(pre)).length;
    p(`| \`${pre}\` | ${a} | ${d} |`);
  }
  p("");

  p(`## 0b. 可以直接沿用的部分`, "");
  p(`渲染层里 **${r.frozen.samePath.length} 个文件路径和内容都没变**（源码不用碰），另有 ${r.frozen.sameContent.length} 个内容没变、只是文件名换了哈希。`, "");
  p("清单落在 `.probe/refdiff/renderer-frozen.txt`，后续动界面时拿它做「不该变」的对照。", "");
  p("");

  p("## 1. asar 里新增 / 消失的条目", "");
  p("同路径且哈希相同的不列。渲染层的同名 chunk 见第 2 节。", "");
  const interesting = r.asar.added.filter((x) => /^out\/(main|preload|renderer)\//.test(x.path));
  p(`### 新增（${interesting.length} 个，只列 out/ 下前 40 个）`, "");
  for (const x of interesting.slice(0, 40)) p(`- \`${x.path}\` — ${kb(x.size)}${x.contentKnownFromOld ? "（内容在旧版里出现过，是同名换位）" : ""}`);
  if (interesting.length > 40) p(`- …另有 ${interesting.length - 40} 个`);
  p("");
  const gone = r.asar.removed.filter((x) => /^out\/(main|preload|renderer)\//.test(x.path));
  p(`### 消失（${gone.length} 个，只列前 40 个）`, "");
  for (const x of gone.slice(0, 40)) p(`- \`${x.path}\` — ${kb(x.size)}`);
  if (gone.length > 40) p(`- …另有 ${gone.length - 40} 个`);
  p("");

  if (r.chunks) {
    p("## 2. 渲染层 chunk 配对", "");
    p(`旧 ${r.chunks.totals.old} 个 chunk，新 ${r.chunks.totals.new} 个；按基名或内容配对到 ${r.chunks.totals.paired} 个。`, "");
    p("`same-name`（文件名连哈希都一样）意味着**这份 chunk 一个字节都没动**，可以直接沿用。", "");
    p("`changed-uncertain` 是基名同为通用名（`index`）时体积又差 3 倍以上的配对，只能当线索，别当结论。", "");
    p(`### 改了（${r.chunks.changed.length}）`, "");
    p("| 旧 | 新 | 旧大小 | 新大小 | 体积比 | 判据 |", "|---|---|---|---|---|---|");
    for (const c of r.chunks.changed) p(`| \`${c.old}\` | \`${c.new}\` | ${kb(c.oldSize)} | ${kb(c.newSize)} | ${c.sizeRatio ?? "—"} | ${c.status}${c.alternatives ? `（另有 ${c.alternatives} 个同基名候选）` : ""} |`);
    p("");
    p(`### 只在旧版（${r.chunks.onlyOld.length}）`, "");
    for (const c of r.chunks.onlyOld.slice(0, 30)) p(`- \`${c.name}\` — ${kb(c.size)}`);
    p("");
    p(`### 只在新版（${r.chunks.onlyNew.length}）`, "");
    for (const c of r.chunks.onlyNew.slice(0, 40)) p(`- \`${c.name}\` — ${kb(c.size)}`);
    p("");
  }

  if (r.signals?.delta) {
    p("## 3. 功能面信号差异", "");
    p("从渲染层产物里按字面量抽出来的可数信号。抽不到不等于不存在。", "");
    p("| 信号 | 旧 | 新 | 新增 | 消失 |", "|---|---|---|---|---|");
    for (const [kind, d] of Object.entries(r.signals.delta)) p(`| ${kind} | ${d.before} | ${d.after} | ${d.added.length} | ${d.removed.length} |`);
    p("");
    for (const [kind, d] of Object.entries(r.signals.delta)) {
      if (!d.added.length && !d.removed.length) continue;
      p(`### ${kind}`, "");
      if (d.added.length) {
        p(`新增 ${d.added.length} 个：`, "");
        for (const x of d.added.slice(0, 120)) p(`- \`${x}\``);
        if (d.added.length > 120) p(`- …另有 ${d.added.length - 120} 个`);
      }
      if (d.removed.length) {
        p("", `消失 ${d.removed.length} 个：`, "");
        for (const x of d.removed.slice(0, 60)) p(`- \`${x}\``);
        if (d.removed.length > 60) p(`- …另有 ${d.removed.length - 60} 个`);
      }
      p("");
    }
  }

  if (r.signals?.coverage) {
    p("## 4. 我们源码对 " + r.meta.new.version + " 信号面的覆盖度", "");
    p(`拿 \`app/renderer/src\` 里的同一批字面量和新版渲染层求交集。**没覆盖**不等于要补 —— 也可能是我们有意去掉的（登录、营销弹窗、内置浏览器等）。`, "");
    p("| 信号 | 新版总量 | 我们已有 | 未覆盖 |", "|---|---|---|---|");
    for (const [kind, c] of Object.entries(r.signals.coverage)) p(`| ${kind} | ${c.total} | ${c.covered} | ${c.missing.length} |`);
    p("");
    for (const [kind, c] of Object.entries(r.signals.coverage)) {
      if (!c.missing.length) continue;
      p(`### ${kind} 未覆盖（${c.missing.length}）`, "");
      for (const x of c.missing.slice(0, 150)) p(`- \`${x}\``);
      if (c.missing.length > 150) p(`- …另有 ${c.missing.length - 150} 个`);
      p("");
    }
  }

  if (r.signals?.v3) {
    if (r.signals?.newWork) {
    p("## 4b. 优先做的：4.0.0 新长出来、我们还没有的功能面", "");
    p("判据是三个条件同时成立：新版产物里有这个信号、旧版没有、我们的 `app/renderer/src` 里也没有。", "");
    p("旧版就有的信号我们却没有，多半是有意去掉的，只在最后一列计数。", "");
    p("| 信号 | 4.0.0 新增且我们没有 | 旧版有但我们没有（多为有意去掉） |", "|---|---|---|");
    for (const [kind, c] of Object.entries(r.signals.newWork)) p(`| ${kind} | ${c.newUpstreamMissing.length} | ${c.droppedByUs.length} |`);
    p("");
    for (const [kind, c] of Object.entries(r.signals.newWork)) {
      if (!c.newUpstreamMissing.length) continue;
      p(`### ${kind}（${c.newUpstreamMissing.length}）`, "");
      for (const x of c.newUpstreamMissing.slice(0, 200)) p(`- \`${x}\``);
      if (c.newUpstreamMissing.length > 200) p(`- …另有 ${c.newUpstreamMissing.length - 200} 个`);
      p("");
    }
  }

  p("## 5. 新增的 v3 界面（整块新应用）", "");
    p(`旧版没有这一层。\`out/renderer/v3\` 自带入口 HTML、自己的一套 chunk 和样式，是一个独立的界面应用，`);
    p(`和主界面共用语言高亮那几个文件的内容（哈希相同）但各自打包。`, "");
    p("| 信号 | 数量 |", "|---|---|");
    for (const [kind, list] of Object.entries(r.signals.v3)) p(`| ${kind} | ${list.length} |`);
    p("");
    for (const [kind, list] of Object.entries(r.signals.v3)) {
      if (!list.length) continue;
      p(`### v3 的 ${kind}（${list.length}）`, "");
      for (const x of list.slice(0, 200)) p(`- \`${x}\``);
      if (list.length > 200) p(`- …另有 ${list.length - 200} 个`);
      p("");
    }
  }

  p("## 6. 主进程 / preload 的 IPC 通道面", "");
  if (r.ipc?.delta) {
    p(`参照的 \`out/main\` + \`out/preload\`（新版还含 v3 渲染层）里能数出 ${r.ipc.delta.before} → ${r.ipc.delta.after} 个通道名；新增 ${r.ipc.added.length}，消失 ${r.ipc.removed.length}。`, "");
    p(`我们的 \`app/desktop/src\` 里能数出 ${r.ipc.oursCount} 个。`, "");
    p("口径：`ipcMain` / `ipcRenderer` / `webContents` 这些对象上的调用第一个实参，按**整棵树**的常量表解回字符串；");
    p(`再加上名字里带 CHANNEL/IPC/PORT 的常量表和数组的全部值。解不出来的实参不猜，只有 ${r.ipc.unresolvedNew.length} 个。`, "");
    if (r.ipc.exposed) {
      const added = r.ipc.exposed.new.filter((x) => !r.ipc.exposed.old.includes(x));
      const gone = r.ipc.exposed.old.filter((x) => !r.ipc.exposed.new.includes(x));
      p(`暴露给渲染层的全局名：旧 ${r.ipc.exposed.old.length} 个 → 新 ${r.ipc.exposed.new.length} 个。`, "");
      if (added.length) p(`新增：${added.map((x) => `\`${x}\``).join("、")}`, "");
      if (gone.length) p(`消失：${gone.map((x) => `\`${x}\``).join("、")}`, "");
    }
    if (r.ipc.newUpstreamMissing.length) {
      p(`### 新增且我们没有（${r.ipc.newUpstreamMissing.length}）`, "");
      for (const x of r.ipc.newUpstreamMissing) p(`- \`${x}\``);
      p("");
    }
    if (r.ipc.oursCanDrop.length) {
      p(`### 参照已经不用的旧通道，我们还留着（${r.ipc.oursCanDrop.length}）`, "");
      for (const x of r.ipc.oursCanDrop) p(`- \`${x}\``);
      p("");
    }
    if (r.ipc.oursExtra?.length) {
      p(`### 我们自己的通道（参照两边都没有，${r.ipc.oursExtra.length}）`, "");
      p("这些是本仓库自己的改造留下的（网关门、Electron 内置事件名等），不是缺口。", "");
      for (const x of r.ipc.oursExtra) p(`- \`${x}\``);
      p("");
    }
  } else {
    p("旧参照里没有 out/main，跳过。", "");
  }

  p("## 7. agent-profiles/v2 三方差异", "");
  p("基准 = 旧参照，左 = 我们的 `assets/agent-profiles/v2`，右 = 新参照。", "");
  p("| 状态 | 数量 | 含义 |", "|---|---|---|");
  const meaning = {
    identical: "三方一致",
    "ours-only": "只有我们改过 —— 升级时保留",
    "upstream-only": "只有上游改了 —— 直接取新参照",
    conflict: "两边都改了且不一致 —— 要逐个人工合并",
    "both-same-change": "两边改成了一样",
    "we-removed": "我们删了",
    "upstream-removed": "上游删了（我们没删）",
    "removed-both": "两边都删了",
    "ours-added": "只有我们加了 —— 是我们自己的东西，保留",
    "upstream-added": "只有上游加了",
    "new-both-same": "两边都新增且一致",
    "new-both-differ": "两边都新增但内容不同",
  };
  for (const [status, n] of Object.entries(r.profiles.summary).sort((a, b) => b[1] - a[1])) p(`| ${status} | ${n} | ${meaning[status] ?? ""} |`);
  p("");
  for (const status of ["conflict", "new-both-differ", "upstream-only", "upstream-removed", "upstream-added"]) {
    const rows = r.profiles.rows.filter((x) => x.status === status);
    if (!rows.length) continue;
    p(`### ${status}（${rows.length}）`, "");
    for (const x of rows) p(`- \`${x.path}\``);
    p("");
  }

  if (r.mcpToolsV2) {
    p("## 8. MCP 工具面", "");
    p(`v2：旧 ${r.mcpToolsV2.counts.old} 个 → 新 ${r.mcpToolsV2.counts.new} 个，新增 ${r.mcpToolsV2.added.length}，消失 ${r.mcpToolsV2.removed.length}，入参变动 ${r.mcpToolsV2.inputChanged.length}。`, "");
    if (r.mcpToolsV2.added.length) {
      p("新增工具：", "");
      for (const t of r.mcpToolsV2.added) p(`- \`${t.name}\`（入参：${t.input.map((k) => `\`${k}\``).join(", ") || "—"}）`);
      p("");
    }
    if (r.mcpToolsV2.removed.length) p(`消失工具：${r.mcpToolsV2.removed.map((n) => `\`${n}\``).join(", ")}`, "");
    if (r.mcpToolsV2.inputChanged.length) {
      p("入参变动：", "");
      for (const t of r.mcpToolsV2.inputChanged) p(`- \`${t.name}\`：+${t.newInput.filter((k) => !t.oldInput.includes(k)).join(",") || "—"} / -${t.oldInput.filter((k) => !t.newInput.includes(k)).join(",") || "—"}`);
      p("");
    }
  }
  if (r.mcpToolsV3 && r.mcpToolsV3.counts) {
    p(`### ${r.meta.new.version} 新增的 mcp-tools-v3`, "");
    p("这是**另一个 MCP server**，不是 v2 的改版：它在注册前检查 `HILO_PROJECT_ARCHITECTURE=resource_v3`，");
    p("工具集围绕 v3 的资源架构，和 v2 的 57 个工具是并集关系，不要合并注册。", "");
    p(`静态能读出名字的工具 ${r.mcpToolsV3Names?.length ?? r.mcpToolsV3.counts.new} 个（另有若干处用变量名注册，脚本读不出来，如实少算）：`, "");
    for (const n of r.mcpToolsV3Names ?? []) p(`- \`${n}\``);
    p("");
  }

  if (r.gateway) {
    p("## 9. gateway 路由台账", "");
    p(`来自 \`docs/gateway-api.md\`（按 ${r.gateway.version} 重生成）：共 ${r.gateway.total} 条、${r.gateway.controllers} 个控制器，我们同名同方法实现 ${r.gateway.done} 条，差 ${r.gateway.total - r.gateway.done} 条。`, "");
    const rows = Object.entries(r.gateway.byController)
      .filter(([, v]) => v.done < v.total)
      .sort((a, b) => b[1].total - b[1].done - (a[1].total - a[1].done));
    p(`### 还没齐的控制器（${rows.length} 个）`, "");
    p("| 控制器 | 已实现 / 总数 | 缺 |", "|---|---|---|");
    for (const [name, v] of rows) p(`| ${name} | ${v.done}/${v.total} | ${v.total - v.done} |`);
    p("");
  }

  p("## 10. 怎么用这张图", "");
  p("1. 第 2 节里 `same-name` 的 chunk 一个字节都没动，对应的源码不用碰；`changed` 的按代码分割点回源码。");
  p("2. 第 3 节新增的信号是**新功能的入口**：一条 `data-action-ui-id` 对应一个界面元素，一条 `/api` 对应一个后端调用。");
  p("3. 第 4 节的未覆盖清单要和产品改造对一遍：属于品牌/去登录/去 ComfyUI 的不补，其余按信号去新版产物里定位实现。");
  p("4. `out/renderer/v3` 是整块新增，不在上面的配对里，单独按新应用还原。");
  p("5. 冻结参照和差异图都在 `.probe/` 下（不进版本库）。参照应用会被自动升级，动手前先确认 `MANIFEST.json` 里的哈希还没变。");
  p("");
  return `${L.join("\n")}\n`;
}

main();
