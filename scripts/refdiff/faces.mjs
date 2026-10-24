/**
 * 升级报告里「主体 bundle 之外」的几张面：v3 运行时、preload / 主进程、gateway、MCP、agent 配置。
 *
 * 为什么单独一个脚本：这些面各有各的入口（目录、dist/main.js、真跑 tools/list），
 * 以前每次升级都靠人记着跑，漏一面就得出「没变」的假结论。放进 upgrade.mjs 后一条命令出全部。
 *
 *   node scripts/refdiff/faces.mjs --from 4.0.3 --to 4.0.4 [--out .probe/upgrade/<tag>]
 *
 * 只读：不写产品代码、不改参照快照。gateway / MCP 的中间产物写在 --out 目录。
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO, resolvePair } from "./lib/refs.mjs";
import { extractIpcSurface, extractIpcSurfaceFromTree, extractSignalsFromTree, toSortedObject } from "./signals.mjs";

const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, "")] = process.argv[i + 1];
const { from, to, fromDir, toDir } = resolvePair(args);
const OUT = path.resolve(REPO, args.out ?? path.join(".probe/upgrade", `${from}-to-${to}`));
mkdirSync(OUT, { recursive: true });

const sha256 = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const rel = (p) => path.relative(REPO, p);
const read = (p) => readFileSync(p, "utf8");
const walk = (root, exts = null) => {
  const out = [];
  const visit = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const abs = path.join(dir, name);
      const st = statSync(abs);
      if (st.isDirectory()) visit(abs);
      else if (!exts || exts.some((e) => name.endsWith(e))) out.push(abs);
    }
  };
  visit(root);
  return out;
};
const diff = (a, b) => ({ added: [...b].filter((x) => !a.has(x)).sort(), removed: [...a].filter((x) => !b.has(x)).sort() });
const setOf = (arr) => new Set(arr);

// ── 1. v3 运行时：按内容相似度配对改名后的 chunk，区分「只改了哈希引用」和「真改了」
function v3Face() {
  const root = (v) => path.join(v, "asar/out/renderer/v3");
  const list = (dir) => Object.fromEntries(walk(dir).map((p) => [path.relative(dir, p), p]));
  const a = list(root(fromDir));
  const b = list(root(toDir));
  const ha = Object.fromEntries(Object.entries(a).map(([k, p]) => [k, sha256(p)]));
  const hb = Object.fromEntries(Object.entries(b).map(([k, p]) => [k, sha256(p)]));
  const same = Object.keys(a).filter((k) => k in b && ha[k] === hb[k]);
  const removed = Object.keys(a).filter((k) => !(k in b)).sort();
  const added = Object.keys(b).filter((k) => !(k in a)).sort();
  const changedText = Object.keys(a).filter((k) => k in b && ha[k] !== hb[k]);

  const strSet = (p) => setOf([...read(p).matchAll(/"((?:[^"\\]|\\.){4,200})"/g)].map((m) => m[1]));
  const normImport = (s) => s.replace(/-[A-Za-z0-9_-]{8,9}\.(js|css|wasm|svg|png|json)/g, "-HASH.$1");
  const semStr = (p) => setOf([...strSet(p)].map(normImport));
  const toks = (p) => setOf([...read(p).matchAll(/[A-Za-z_$][\w$]{3,}/g)].map((m) => m[0]));
  const tokCache = new Map();
  const tokensOf = (p) => {
    if (!tokCache.has(p)) tokCache.set(p, toks(p));
    return tokCache.get(p);
  };
  const jac = (x, y) => {
    let inter = 0;
    for (const v of x) if (y.has(v)) inter += 1;
    return inter / Math.max(1, x.size + y.size - inter);
  };

  // 全量配对（改名后路径不可靠，靠内容相似度；17×17 的量级）
  const scored = [];
  for (const r of removed) for (const n of added) scored.push({ score: jac(tokensOf(a[r]), tokensOf(b[n])), r, n });
  scored.sort((x, y) => y.score - x.score);
  const usedR = new Set(), usedN = new Set(), pairs = [];
  for (const { score, r, n } of scored) {
    if (usedR.has(r) || usedN.has(n)) continue;
    usedR.add(r); usedN.add(n);
    const sa = semStr(a[r]), sb = semStr(b[n]);
    const semantic = [...new Set([...sa].filter((x) => !sb.has(x)).concat([...sb].filter((x) => !sa.has(x))))];
    const fromBytes = statSync(a[r]).size, toBytes = statSync(b[n]).size;
    // 只有导入文件的哈希和压缩器重新编号时，字符串与字节数都不变；两者任一变化都算内容变了。
    // （ChatPage / 小 chunk 属于前者：normalized 文本不同，但语义字符串与长度一致。）
    const kind = semantic.length || fromBytes !== toBytes ? "content" : "hash-only";
    pairs.push({
      from: r, to: n, score: Number(score.toFixed(3)),
      fromBytes, toBytes, kind,
      stringDelta: { added: [...sb].filter((x) => !sa.has(x)).length, removed: [...sa].filter((x) => !sb.has(x)).length },
      semanticSamples: semantic.slice(0, 6),
    });
  }

  const uidPattern = /(?:["']data-action-ui-id["']\s*:\s*"|data-action-ui-id\s*=\s*"|dataActionUiId["']?\s*[:=]\s*["'])([^"']+)/g;
  const uids = (v) => {
    const s = new Set();
    for (const p of walk(root(v), [".js", ".html", ".css", ".json"])) {
      for (const m of read(p).matchAll(uidPattern)) s.add(m[1]);
    }
    return s;
  };
  const ua = uids(fromDir), ub = uids(toDir);

  return {
    files: { before: Object.keys(a).length, after: Object.keys(b).length, same: same.length },
    renamedChunks: pairs.sort((x, y) => y.score - x.score),
    added, removed,
    inPlaceChanged: changedText,
    uiIds: { before: ua.size, after: ub.size, ...diff(ua, ub) },
  };
}

// ── 2. preload / 主进程：IPC 通道、contextBridge 暴露成员、信号
function preloadFace() {
  const entries = (v) => walk(path.join(v, "asar/out/preload"), [".cjs", ".mjs"]);
  const perFile = (v) => Object.fromEntries(entries(v).map((p) => {
    const text = read(p);
    const surface = extractIpcSurface(text);
    return [path.basename(p), {
      bytes: statSync(p).size,
      sha256: sha256(p),
      channels: [...surface.channels].sort(),
      exposed: [...surface.exposed].sort(),
      unresolved: [...surface.unresolved].sort(),
    }];
  }));
  const fa = perFile(fromDir), fb = perFile(toDir);
  const files = {};
  for (const name of [...new Set([...Object.keys(fa), ...Object.keys(fb)])].sort()) {
    const x = fa[name], y = fb[name];
    files[name] = x && y
      ? {
        changed: x.sha256 !== y.sha256, bytes: [x.bytes, y.bytes],
        channels: diff(setOf(x.channels), setOf(y.channels)),
        exposed: diff(setOf(x.exposed), setOf(y.exposed)),
        unresolved: diff(setOf(x.unresolved), setOf(y.unresolved)),
      }
      : { only: x ? "before" : "after" };
  }

  const main = (v) => {
    const dir = path.join(v, "asar/out/main");
    const p = path.join(dir, "index.js");
    const surface = extractIpcSurfaceFromTree(dir);
    // 主进程的 ProxyChannel 用 registerChannel("name", ...) 注册，不在 ipcMain.* 调用形状里
    for (const file of walk(dir, [".js"])) {
      for (const m of read(file).matchAll(/registerChannel\(\s*"([^"]+)"/g)) surface.channels.add(m[1]);
    }
    return {
      bytes: statSync(p).size,
      sha256: sha256(p),
      channels: [...surface.channels].sort(),
      exposed: [...surface.exposed].sort(),
      unresolved: [...surface.unresolved].sort(),
      signals: toSortedObject(extractSignalsFromTree(dir).signals),
    };
  };
  const ma = main(fromDir), mb = main(toDir);
  return {
    preload: files,
    main: {
      changed: ma.sha256 !== mb.sha256, bytes: [ma.bytes, mb.bytes],
      channels: diff(setOf(ma.channels), setOf(mb.channels)),
      exposed: diff(setOf(ma.exposed), setOf(mb.exposed)),
      unresolved: diff(setOf(ma.unresolved), setOf(mb.unresolved)),
      signals: {
        uiId: diff(setOf(ma.signals.uiId), setOf(mb.signals.uiId)),
        apiPath: diff(setOf(ma.signals.apiPath), setOf(mb.signals.apiPath)),
        event: diff(setOf(ma.signals.event), setOf(mb.signals.event)),
      },
    },
  };
}

// ── 3. gateway：从冻结的 dist/main.js 静态抽路由，按控制器（模块）比
function gatewayFace() {
  const normPath = (p) => p.replace(/\{\*[^}]+\}|\*[A-Za-z_]\w*/g, "*").replace(/\{[^}]+\}|:[A-Za-z_]\w*/g, ":p");
  const run = (v, dir) => {
    const json = path.join(OUT, `gateway-${v}.json`);
    const md = path.join(OUT, `gateway-${v}.md`);
    execFileSync("python3", [
      path.join(REPO, "scripts/extract-gateway-routes.py"),
      "--gateway", path.join(dir, "sidecar/gateway/dist/main.js"),
      "--version", v, "--json", json, "--out", md,
    ], { cwd: REPO, stdio: ["ignore", "ignore", "pipe"], maxBuffer: 64 * 1024 * 1024 });
    return JSON.parse(readFileSync(json, "utf8"));
  };
  const a = run(from, fromDir), b = run(to, toDir);
  const key = (r) => `${r.method} ${normPath(r.path)}`;
  const mapA = new Map(a.routes.map((r) => [key(r), r]));
  const mapB = new Map(b.routes.map((r) => [key(r), r]));
  const added = [...mapB].filter(([k]) => !mapA.has(k)).map(([, r]) => r);
  const removed = [...mapA].filter(([k]) => !mapB.has(k)).map(([, r]) => r);
  const byController = (rows) => {
    const m = {};
    for (const r of rows) (m[r.controller] ??= []).push(`${r.method} ${r.path}`);
    return m;
  };
  // 新功能在 gateway 里有没有落点：只做字面量计数，不做语义推断
  const probes = ["audioTrim", "videoTrim", "frameCapture", "code-project", "site-preview", "music", "MUSIC_MAX_SECONDS", "song"];
  const occurrences = (dir) => {
    const text = read(path.join(dir, "sidecar/gateway/dist/main.js"));
    return Object.fromEntries(probes.map((p) => [p, text.split(p).length - 1]));
  };
  return {
    before: { routes: a.routes.length, controllers: new Set(a.routes.map((r) => r.controller)).size, unresolved: a.unresolved.length },
    after: { routes: b.routes.length, controllers: new Set(b.routes.map((r) => r.controller)).size, unresolved: b.unresolved.length },
    added: { count: added.length, byController: byController(added) },
    removed: { count: removed.length, byController: byController(removed) },
    featureOccurrences: { before: occurrences(fromDir), after: occurrences(toDir) },
  };
}

// ── 4. MCP：真跑参照的 tools/list，比工具名和 schema
function mcpFace() {
  // 两个版本都真跑 tools/list：只拿仓库里现成的 4.0.3 快照会让 `--from` 失去意义。
  const probe = (v, dir) => {
    const out = path.join(OUT, `ref-tools-${v}.json`);
    try {
      execFileSync(process.execPath, [path.join(REPO, "scripts/mcp-compare/probe.mjs")], {
        cwd: REPO,
        env: {
          ...process.env, ELECTRON_RUN_AS_NODE: undefined,
          OVMCP_ENTRY: path.join(dir, "sidecar/mcp-tools-v3/dist/main.js"),
          OVMCP_OUT: out, OVMCP_SOURCE: `reference mcp-tools-v3 ${v}`, OVMCP_SKIP_COMPARE: "1",
        },
        stdio: ["ignore", "ignore", "pipe"], timeout: 60_000,
      });
      return existsSync(out) ? { ok: true, snap: JSON.parse(readFileSync(out, "utf8")), out } : { ok: false, err: "没有生成快照" };
    } catch (e) {
      return { ok: false, err: String(e.stderr ?? e.message).slice(0, 500) };
    }
  };
  const fromRun = probe(from, fromDir);
  const toRun = probe(to, toDir);
  if (!toRun.ok) return { ok: false, error: toRun.err };
  const fromSnap = fromRun.ok ? fromRun.snap : JSON.parse(readFileSync(path.join(REPO, "scripts/mcp-compare/reference-tools.json"), "utf8"));
  const toSnap = toRun.snap;
  const toolsA = new Map((fromSnap?.tools ?? []).map((t) => [t.name, t]));
  const toolsB = new Map(toSnap.tools.map((t) => [t.name, t]));

  const deepDiff = (a, b, p, acc, limit = 12) => {
    if (acc.length >= limit) return;
    if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
      if (JSON.stringify(a) !== JSON.stringify(b)) acc.push(p);
      return;
    }
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of [...keys].sort()) deepDiff(a[k], b[k], `${p}/${k}`, acc, limit);
  };
  const schemaChanged = [];
  for (const [name, t] of toolsB) {
    const old = toolsA.get(name);
    if (!old) continue;
    const acc = [];
    deepDiff(old.inputSchema, t.inputSchema, "", acc);
    if (acc.length) schemaChanged.push({ name, changedPaths: acc });
  }
  return {
    ok: true,
    from: { source: fromSnap?.source ?? null, count: fromSnap?.count ?? null },
    to: { source: toSnap.source, count: toSnap.count },
    added: [...toolsB.keys()].filter((n) => !toolsA.has(n)).sort(),
    removed: [...toolsA.keys()].filter((n) => !toolsB.has(n)).sort(),
    schemaChanged,
  };
}

// ── 5. agent 配置 / 技能文本：逐文件哈希
function agentFace() {
  const root = (v) => path.join(v, "sidecar/agent-profiles");
  const map = (dir) => Object.fromEntries(walk(dir).map((p) => [path.relative(dir, p), sha256(p)]));
  const a = map(root(fromDir)), b = map(root(toDir));
  return {
    added: Object.keys(b).filter((k) => !(k in a)).sort(),
    removed: Object.keys(a).filter((k) => !(k in b)).sort(),
    changed: Object.keys(a).filter((k) => k in b && a[k] !== b[k]).sort(),
  };
}

const faces = { tag: `${from}-to-${to}`, generatedAt: new Date().toISOString(), v3: v3Face(), preload: preloadFace(), gateway: gatewayFace(), mcp: mcpFace(), agents: agentFace() };
writeFileSync(path.join(OUT, "faces.json"), `${JSON.stringify(faces, null, 2)}\n`);

const md = [
  `# 升级面：${from} → ${to}`,
  "",
  `生成时间：${faces.generatedAt}`,
  "",
  "## v3 运行时",
  `- 文件：${faces.v3.files.before} → ${faces.v3.files.after}，未变 ${faces.v3.files.same}`,
  `- 界面 id：${faces.v3.uiIds.before} → ${faces.v3.uiIds.after}，新增 ${faces.v3.uiIds.added.length}，消失 ${faces.v3.uiIds.removed.length}`,
  `- 改名 chunk：${faces.v3.renamedChunks.length} 对（${faces.v3.renamedChunks.filter((p) => p.kind === "content").length} 对内容有变，${faces.v3.renamedChunks.filter((p) => p.kind === "hash-only").length} 对只有哈希引用）`,
  "",
  "| 旧 | 新 | 字节 | 变化 |",
  "|---|---|---|---|",
  ...faces.v3.renamedChunks.map((p) => `| ${p.from} | ${p.to} | ${p.fromBytes}→${p.toBytes} | ${p.kind === "content" ? `内容 +${p.stringDelta.added}/-${p.stringDelta.removed} 字符串` : "仅哈希引用"} |`),
  "",
  "## preload / 主进程",
  ...Object.entries(faces.preload.preload).flatMap(([name, f]) => f.only
    ? [`- ${name}：只在一侧存在（${f.only === "before" ? "旧" : "新"}）`]
    : [`- ${name}：${f.changed ? "有变化" : "未变"}；通道 +${f.channels.added.length}/-${f.channels.removed.length}，暴露成员 +${f.exposed.added.length}/-${f.exposed.removed.length}`]),
  `- 主进程：${faces.preload.main.changed ? "有变化" : "未变"}；通道 +${faces.preload.main.channels.added.length}/-${faces.preload.main.channels.removed.length}`,
  "",
  "## gateway",
  `- 路由：${faces.gateway.before.routes} → ${faces.gateway.after.routes}（控制器 ${faces.gateway.before.controllers} → ${faces.gateway.after.controllers}）`,
  `- 新增 ${faces.gateway.added.count}，消失 ${faces.gateway.removed.count}`,
  ...Object.entries(faces.gateway.added.byController).map(([c, rows]) => `  - + ${c}: ${rows.join(", ")}`),
  ...Object.entries(faces.gateway.removed.byController).map(([c, rows]) => `  - - ${c}: ${rows.join(", ")}`),
  "",
  "## MCP",
  faces.mcp.ok
    ? `- 工具：${faces.mcp.from.count} → ${faces.mcp.to.count}；新增 ${faces.mcp.added.length}，消失 ${faces.mcp.removed.length}，schema 变化 ${faces.mcp.schemaChanged.length}`
    : `- **失败**：${faces.mcp.error}`,
  "",
  "## agent 配置",
  `- 新增 ${faces.agents.added.length}，消失 ${faces.agents.removed.length}，改动 ${faces.agents.changed.length}`,
  ...[...faces.agents.added.map((x) => `  - + ${x}`), ...faces.agents.changed.map((x) => `  - ~ ${x}`)],
  "",
].join("\n");
writeFileSync(path.join(OUT, "faces.md"), md);

const summary = {
  v3Renamed: faces.v3.renamedChunks.length,
  v3ContentChanged: faces.v3.renamedChunks.filter((p) => p.kind === "content").length,
  v3UiIds: faces.v3.uiIds,
  preloadChanged: Object.entries(faces.preload.preload).filter(([, f]) => f.changed).map(([n]) => n),
  gatewayRoutes: [faces.gateway.before.routes, faces.gateway.after.routes],
  gatewayAdded: faces.gateway.added.count,
  mcp: faces.mcp.ok ? { from: faces.mcp.from.count, to: faces.mcp.to.count, added: faces.mcp.added.length, removed: faces.mcp.removed.length, schemaChanged: faces.mcp.schemaChanged.length } : { ok: false },
  agents: { added: faces.agents.added.length, changed: faces.agents.changed.length },
};
console.log(JSON.stringify(summary, null, 1));
