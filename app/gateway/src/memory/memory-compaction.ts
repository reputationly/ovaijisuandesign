import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rm, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  dedupHashFor,
  isMemoryType,
  listMemoryFiles,
  MAX_MEMORY_BODY_BYTES,
  MAX_MEMORY_DESCRIPTION_LENGTH,
  MEMORY_INDEX_FILENAME,
  MEMORY_NAME_RE,
  MEMORY_TYPES,
  MemoryError,
  type MemoryDirs,
  type MemoryFileEntry,
  type MemoryScope,
  type MemoryType,
  rebuildMemoryIndex,
  resolveScopeDir,
  SNAPSHOTS_DIRNAME,
  withMemoryLock,
  writeMemoryFileUnlocked,
} from "./memory-store.js";

/**
 * 记忆压缩：去重、过期、按上限裁剪，以及用户挑选若干条后让模型合并改写。
 *
 * 任何删改之前都先把整个目录拍一份快照到 `.snapshots/<id>/`，界面上可以一键撤回；
 * 快照按条数和天数淘汰。压缩只作用于用户级记忆（项目级记忆跟着工作区走，由用户自己管）。
 */

export const MEMORY_COMPACTION_SCHEDULES = ["manual", "weekly", "monthly"] as const;
export type MemoryCompactionSchedule = (typeof MEMORY_COMPACTION_SCHEDULES)[number];

export interface MemoryCompactionConfig {
  enabled: boolean;
  schedule: MemoryCompactionSchedule;
  thresholdCount: number;
  thresholdBytes: number;
  snapshotRetention: number;
  snapshotTtlDays: number;
  llmMergeEnabled: boolean;
  expireFeedbackDays: number;
}

export const MEMORY_COMPACTION_DEFAULTS: MemoryCompactionConfig = {
  enabled: true,
  schedule: "weekly",
  thresholdCount: 100,
  thresholdBytes: 512 * 1024,
  snapshotRetention: 10,
  snapshotTtlDays: 60,
  llmMergeEnabled: false,
  expireFeedbackDays: 90,
};

export function isMemoryCompactionSchedule(value: unknown): value is MemoryCompactionSchedule {
  return typeof value === "string" && (MEMORY_COMPACTION_SCHEDULES as readonly string[]).includes(value);
}

const SNAPSHOT_META_FILENAME = "meta.json";
const DAY_MS = 86_400_000;

export interface SnapshotMeta {
  id: string;
  scope: MemoryScope;
  createdAt: string;
  entryCount: number;
  bytes: number;
  reason: "compaction" | "manual";
  summary?: string;
}

export interface CompactionUpsert {
  name: string;
  description: string;
  type: MemoryType;
  compactedFrom: string[];
  body?: string;
}

export interface CompactionOperation {
  type: "dedup" | "expire" | "trim" | "merge";
  reason: string;
  deletes: string[];
  upserts?: CompactionUpsert[];
}

export interface CompactionPlan {
  scope: MemoryScope;
  dir: string;
  current: { count: number; bytes: number };
  projected: { count: number; bytes: number };
  operations: CompactionOperation[];
  triggers: ("count_exceeded" | "bytes_exceeded" | "manual")[];
}

export interface CompactionSummary {
  scope: MemoryScope;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  snapshotId: string | null;
  deleted: number;
  merged: number;
  freedBytes: number;
  operations: CompactionOperation[];
}

// ── 快照 ──

/** 快照 id 带时间戳，字典序就是时间序；后缀随机，同一毫秒拍两份也不撞。 */
function generateSnapshotId(): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return `${ts}-${createHash("sha256").update(randomUUID()).digest("hex").slice(0, 8)}`;
}

function snapshotsRoot(scope: MemoryScope, dirs: MemoryDirs): string {
  return path.join(resolveScopeDir(scope, dirs), SNAPSHOTS_DIRNAME);
}

function assertSafeSnapshotId(id: string): void {
  if (typeof id !== "string" || !id || id.includes("/") || id.includes("\\") || id.includes("..") || id.includes("\0")) {
    throw new MemoryError(`invalid snapshot id: ${id}`);
  }
}

export async function createSnapshot(dirs: MemoryDirs, scope: MemoryScope, reason: SnapshotMeta["reason"], summary?: string): Promise<SnapshotMeta> {
  const scopeDir = resolveScopeDir(scope, dirs);
  const id = generateSnapshotId();
  const targetDir = path.join(snapshotsRoot(scope, dirs), id);
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(scopeDir).catch((err: NodeJS.ErrnoException) => {
    if (err.code === "ENOENT") return [] as string[];
    throw err;
  });
  let entryCount = 0;
  let bytes = 0;
  for (const file of entries) {
    if (file === SNAPSHOTS_DIRNAME || !file.endsWith(".md")) continue;
    const dst = path.join(targetDir, file);
    try {
      await copyFile(path.join(scopeDir, file), dst);
      if (file !== MEMORY_INDEX_FILENAME) {
        entryCount += 1;
        bytes += (await stat(dst)).size;
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw err;
    }
  }
  const meta: SnapshotMeta = { id, scope, createdAt: new Date().toISOString(), entryCount, bytes, reason, ...(summary ? { summary } : {}) };
  await writeFile(path.join(targetDir, SNAPSHOT_META_FILENAME), JSON.stringify(meta, null, 2), "utf8");
  return meta;
}

/** 新的在前。meta 坏了或和目录名对不上的快照不列出来（不能恢复一份来历不明的东西）。 */
export async function listSnapshots(dirs: MemoryDirs, scope: MemoryScope): Promise<SnapshotMeta[]> {
  const dir = snapshotsRoot(scope, dirs);
  const ids = await readdir(dir).catch(() => [] as string[]);
  const out: SnapshotMeta[] = [];
  for (const id of ids) {
    try {
      const meta = JSON.parse(await readFile(path.join(dir, id, SNAPSHOT_META_FILENAME), "utf8")) as SnapshotMeta;
      if (typeof meta.id !== "string" || meta.id !== id) continue;
      out.push(meta);
    } catch {
      // 跳过坏快照
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 恢复前先给当前状态拍一份"安全快照"：点错了恢复本身也能撤回。 */
export async function restoreSnapshot(dirs: MemoryDirs, scope: MemoryScope, snapshotId: string): Promise<{ restored: number; safetySnapshotId: string }> {
  assertSafeSnapshotId(snapshotId);
  const scopeDir = resolveScopeDir(scope, dirs);
  const sourceDir = path.join(snapshotsRoot(scope, dirs), snapshotId);
  const st = await stat(sourceDir).catch((err: NodeJS.ErrnoException) => {
    if (err.code === "ENOENT") throw new MemoryError(`snapshot not found: ${snapshotId}`);
    throw err;
  });
  if (!st.isDirectory()) throw new MemoryError(`snapshot ${snapshotId} is not a directory`);
  return withMemoryLock(scopeDir, async () => {
    const safety = await createSnapshot(dirs, scope, "manual");
    for (const file of await readdir(scopeDir).catch(() => [] as string[])) {
      // MEMORY.md 是锁目标，不删它：删了会让持锁期间别的进程锁到一个新文件上。
      if (file === SNAPSHOTS_DIRNAME || !file.endsWith(".md") || file === MEMORY_INDEX_FILENAME) continue;
      await rm(path.join(scopeDir, file), { force: true });
    }
    let restored = 0;
    for (const file of await readdir(sourceDir)) {
      if (!file.endsWith(".md") || file === MEMORY_INDEX_FILENAME) continue;
      await copyFile(path.join(sourceDir, file), path.join(scopeDir, file));
      restored += 1;
    }
    await rebuildMemoryIndex(scopeDir);
    return { restored, safetySnapshotId: safety.id };
  });
}

export async function pruneSnapshots(dirs: MemoryDirs, scope: MemoryScope, maxRetention: number, ttlDays: number): Promise<{ pruned: number }> {
  const snaps = await listSnapshots(dirs, scope);
  const cutoff = Date.now() - Math.max(0, ttlDays) * DAY_MS;
  const dir = snapshotsRoot(scope, dirs);
  let pruned = 0;
  for (let i = 0; i < snaps.length; i += 1) {
    const s = snaps[i]!;
    const createdMs = Date.parse(s.createdAt);
    if (i >= Math.max(0, maxRetention) || (Number.isFinite(createdMs) && createdMs < cutoff)) {
      await rm(path.join(dir, s.id), { recursive: true, force: true })
        .then(() => (pruned += 1))
        .catch(() => undefined);
    }
  }
  return { pruned };
}

// ── 压缩计划 ──

/** 条目大小的估算：正文字节 + 固定的 frontmatter 开销。 */
function approxEntryBytes(e: MemoryFileEntry): number {
  return Buffer.byteLength(e.body, "utf8") + 256;
}

/** 正文里 `[[name]]` 引用到的记忆：被引用的反馈不因过期删除。 */
function buildReferenceSet(entries: MemoryFileEntry[]): Set<string> {
  const refs = new Set<string>();
  for (const e of entries) for (const m of e.body.matchAll(/\[\[([a-z0-9][a-z0-9-]{0,63})\]\]/g)) refs.add(m[1]!);
  return refs;
}

interface PlanState {
  all: MemoryFileEntry[];
  deletes: Set<string>;
}

/** 同类型同描述的重复条目只留最新的一条。资产锚点不参与。 */
function dedupByHash(state: PlanState): CompactionOperation | null {
  const byHash = new Map<string, MemoryFileEntry[]>();
  for (const e of state.all) {
    if (state.deletes.has(e.frontmatter.name) || e.frontmatter.type === "asset-pin") continue;
    const hash = dedupHashFor(e.frontmatter.type, e.frontmatter.description);
    const bucket = byHash.get(hash);
    if (bucket) bucket.push(e);
    else byHash.set(hash, [e]);
  }
  const deletes: string[] = [];
  for (const bucket of byHash.values()) {
    if (bucket.length < 2) continue;
    bucket.sort((a, b) => b.mtimeMs - a.mtimeMs);
    for (const loser of bucket.slice(1)) {
      deletes.push(loser.frontmatter.name);
      state.deletes.add(loser.frontmatter.name);
    }
  }
  if (deletes.length === 0) return null;
  return {
    type: "dedup",
    reason: `collapsed ${deletes.length} duplicate ${deletes.length === 1 ? "entry" : "entries"} sharing the same type+description signature`,
    deletes,
  };
}

/** 自动提取的反馈过了期限、又没被别的记忆引用，就删掉。手写的没有 extracted_at，不会过期。 */
function expireOldFeedback(state: PlanState, config: MemoryCompactionConfig, now: number): CompactionOperation | null {
  const cutoff = now - Math.max(0, config.expireFeedbackDays) * DAY_MS;
  const survivors = state.all.filter((e) => !state.deletes.has(e.frontmatter.name));
  const refs = buildReferenceSet(survivors);
  const deletes: string[] = [];
  for (const e of survivors) {
    if (e.frontmatter.type !== "feedback" || !e.frontmatter.extracted_at) continue;
    const ms = Date.parse(e.frontmatter.extracted_at);
    if (!Number.isFinite(ms) || ms >= cutoff || refs.has(e.frontmatter.name)) continue;
    deletes.push(e.frontmatter.name);
    state.deletes.add(e.frontmatter.name);
  }
  if (deletes.length === 0) return null;
  return {
    type: "expire",
    reason: `removed ${deletes.length} unreferenced feedback ${deletes.length === 1 ? "entry" : "entries"} older than ${config.expireFeedbackDays} days`,
    deletes,
  };
}

/** 还超上限就从最老的开始删到上限以内。资产锚点不算数也不删。 */
function trimByType(state: PlanState, config: MemoryCompactionConfig): CompactionOperation | null {
  const survivors = state.all.filter((e) => !state.deletes.has(e.frontmatter.name) && e.frontmatter.type !== "asset-pin");
  if (survivors.length <= config.thresholdCount) return null;
  survivors.sort((a, b) => a.mtimeMs - b.mtimeMs);
  const deletes = survivors.slice(0, survivors.length - config.thresholdCount).map((e) => e.frontmatter.name);
  for (const n of deletes) state.deletes.add(n);
  if (deletes.length === 0) return null;
  return {
    type: "trim",
    reason: `dropped ${deletes.length} oldest non-anchor ${deletes.length === 1 ? "entry" : "entries"} to fit under ${config.thresholdCount}-entry cap`,
    deletes,
  };
}

/** 只读、不加锁、不拍快照：预览每次渲染都可以调。`force` 是界面的"立即整理"，没到阈值也给出计划。 */
export async function computeCompactionPlan(dirs: MemoryDirs, scope: MemoryScope, config: MemoryCompactionConfig, force = false): Promise<CompactionPlan> {
  const dir = resolveScopeDir(scope, dirs);
  const all = await listMemoryFiles(dir);
  const currentCount = all.length;
  const currentBytes = all.reduce((acc, e) => acc + approxEntryBytes(e), 0);
  const triggers: CompactionPlan["triggers"] = [];
  if (currentCount >= config.thresholdCount) triggers.push("count_exceeded");
  if (currentBytes >= config.thresholdBytes) triggers.push("bytes_exceeded");
  if (force) triggers.push("manual");
  if (triggers.length === 0) {
    return { scope, dir, current: { count: currentCount, bytes: currentBytes }, projected: { count: currentCount, bytes: currentBytes }, operations: [], triggers: [] };
  }
  const state: PlanState = { all, deletes: new Set() };
  const operations = [dedupByHash(state), expireOldFeedback(state, config, Date.now()), trimByType(state, config)].filter((op): op is CompactionOperation => op !== null);
  let projectedBytes = currentBytes;
  for (const e of all) if (state.deletes.has(e.frontmatter.name)) projectedBytes -= approxEntryBytes(e);
  return {
    scope,
    dir,
    current: { count: currentCount, bytes: currentBytes },
    projected: { count: currentCount - state.deletes.size, bytes: Math.max(0, projectedBytes) },
    operations,
    triggers,
  };
}

/**
 * 执行压缩：持锁重算一遍计划（预览之后可能又写进了新记忆），去掉用户勾选保留的，拍快照，删除，重建索引，淘汰旧快照。
 * 什么都不用删时不拍快照。
 */
export async function executeCompaction(
  dirs: MemoryDirs,
  scope: MemoryScope,
  config: MemoryCompactionConfig,
  opts: { keepNames?: string[]; force?: boolean } = {},
): Promise<CompactionSummary> {
  const startedAt = new Date().toISOString();
  const startTs = Date.now();
  const dir = resolveScopeDir(scope, dirs);
  await mkdir(dir, { recursive: true });
  return withMemoryLock(dir, async () => {
    const fresh = await computeCompactionPlan(dirs, scope, config, opts.force);
    const keep = new Set(opts.keepNames ?? []);
    const operations = fresh.operations.map((op) => ({ ...op, deletes: op.deletes.filter((n) => !keep.has(n)) }));
    const totalDeletes = operations.reduce((acc, op) => acc + op.deletes.length, 0);
    if (totalDeletes === 0) {
      return { scope, startedAt, finishedAt: new Date().toISOString(), durationMs: Date.now() - startTs, snapshotId: null, deleted: 0, merged: 0, freedBytes: 0, operations };
    }
    let snapshotId: string;
    try {
      snapshotId = (await createSnapshot(dirs, scope, "compaction")).id;
    } catch (err) {
      throw new MemoryError(`failed to create pre-compaction snapshot: ${(err as Error).message}`);
    }
    const byName = new Map((await listMemoryFiles(dir)).map((r) => [r.frontmatter.name, r]));
    let deleted = 0;
    let freedBytes = 0;
    for (const op of operations) {
      for (const name of op.deletes) {
        const rec = byName.get(name);
        if (!rec) continue;
        try {
          await unlink(rec.path);
          deleted += 1;
          freedBytes += approxEntryBytes(rec);
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
        }
      }
    }
    await rebuildMemoryIndex(dir);
    await pruneSnapshots(dirs, scope, config.snapshotRetention, config.snapshotTtlDays).catch(() => undefined);
    return { scope, startedAt, finishedAt: new Date().toISOString(), durationMs: Date.now() - startTs, snapshotId, deleted, merged: 0, freedBytes, operations };
  });
}

// ── 模型合并改写 ──

export interface RewriteEntry {
  name: string;
  description: string;
  type: MemoryType;
  body: string;
  compactedFrom: string[];
}

/**
 * 把模型给的合并结果校验成一个 merge 计划。每条被选中的原记忆都必须出现在某条结果的 compactedFrom 里：
 * 模型悄悄漏掉一条，等于替用户删了它。
 */
export function buildRewritePlan(input: {
  scope: MemoryScope;
  dir: string;
  selectedNames: string[];
  survivingNames: string[];
  llmEntries: RewriteEntry[];
  current: { count: number; bytes: number };
}): CompactionPlan {
  if (input.selectedNames.length === 0) throw new MemoryError("selectedNames must be non-empty");
  const selected = new Set<string>();
  for (const n of input.selectedNames) {
    if (!MEMORY_NAME_RE.test(n)) throw new MemoryError(`selectedNames contains invalid name: ${n}`);
    if (selected.has(n)) throw new MemoryError(`selectedNames contains duplicate: ${n}`);
    selected.add(n);
  }
  if (input.llmEntries.length === 0) throw new MemoryError("llmEntries must be non-empty (LLM produced zero consolidated entries)");
  const surviving = new Set(input.survivingNames);
  const proposed = new Set<string>();
  const covered = new Set<string>();
  for (const e of input.llmEntries) {
    if (!MEMORY_NAME_RE.test(e.name)) throw new MemoryError(`llm entry name must match /^[a-z0-9][a-z0-9-]{0,63}$/: ${e.name}`);
    if (proposed.has(e.name)) throw new MemoryError(`llm entries contain duplicate name: ${e.name}`);
    if (surviving.has(e.name)) throw new MemoryError(`llm entry name collides with surviving (non-selected) memory: ${e.name}`);
    if (!isMemoryType(e.type)) throw new MemoryError(`llm entry type invalid (must be one of ${MEMORY_TYPES.join("|")}): ${e.type}`);
    if (e.type === "asset-pin" || e.type === "media-style") throw new MemoryError(`llm entry type '${e.type}' is not allowed in a user-scope rewrite (got name=${e.name})`);
    if (!e.description) throw new MemoryError(`llm entry description must not be empty: ${e.name}`);
    if (e.description.length > MAX_MEMORY_DESCRIPTION_LENGTH) {
      throw new MemoryError(`llm entry description exceeds ${MAX_MEMORY_DESCRIPTION_LENGTH} chars (got ${e.description.length}): ${e.name}`);
    }
    if (/[\r\n]/.test(e.description)) throw new MemoryError(`llm entry description must be single-line: ${e.name}`);
    const bodyBytes = Buffer.byteLength(e.body, "utf8");
    if (bodyBytes > MAX_MEMORY_BODY_BYTES) throw new MemoryError(`llm entry body exceeds ${MAX_MEMORY_BODY_BYTES} bytes (got ${bodyBytes}): ${e.name}`);
    if (e.compactedFrom.length === 0) throw new MemoryError(`llm entry compactedFrom must be non-empty (so the audit trail survives): ${e.name}`);
    for (const src of e.compactedFrom) {
      if (!selected.has(src)) throw new MemoryError(`llm entry ${e.name} references unselected source: ${src}`);
      covered.add(src);
    }
    proposed.add(e.name);
  }
  const dropped = [...selected].filter((n) => !covered.has(n));
  if (dropped.length > 0) {
    throw new MemoryError(`llm output dropped ${dropped.length} selected ${dropped.length === 1 ? "memory" : "memories"} silently: ${dropped.join(", ")}`);
  }
  const deletes = [...selected];
  const upserts = input.llmEntries.map((e) => ({ name: e.name, description: e.description, type: e.type, compactedFrom: [...e.compactedFrom], body: e.body }));
  return {
    scope: input.scope,
    dir: input.dir,
    current: input.current,
    // 字节数要等正文真写下去才准，界面主要看条数。
    projected: { count: input.current.count - deletes.length + upserts.length, bytes: input.current.bytes },
    operations: [
      {
        type: "merge",
        reason: `LLM consolidated ${deletes.length} ${deletes.length === 1 ? "memory" : "memories"} into ${upserts.length} ${upserts.length === 1 ? "entry" : "entries"}`,
        deletes,
        upserts,
      },
    ],
    triggers: ["manual"],
  };
}

/** 按预览过的计划执行合并：拍快照 → 删原条目 → 写合并后的条目 → 重建索引。 */
export async function applyRewrite(dirs: MemoryDirs, plan: CompactionPlan, config: MemoryCompactionConfig): Promise<CompactionSummary> {
  if (plan.scope !== "user") throw new MemoryError(`applyRewrite only supports scope='user' (got '${plan.scope}')`);
  const op = plan.operations[0];
  if (plan.operations.length !== 1 || op?.type !== "merge") throw new MemoryError("applyRewrite expects exactly one 'merge' operation in the plan (constructed by buildRewritePlan)");
  const upserts = op.upserts ?? [];
  if (upserts.length === 0) throw new MemoryError("applyRewrite: merge op must have at least one upsert");
  for (const u of upserts) if (u.body == null) throw new MemoryError(`applyRewrite: upsert ${u.name} is missing body (use buildRewritePlan)`);
  const startedAt = new Date().toISOString();
  const startTs = Date.now();
  const dir = resolveScopeDir("user", dirs);
  return withMemoryLock(dir, async () => {
    let snapshotId: string;
    try {
      snapshotId = (await createSnapshot(dirs, "user", "compaction")).id;
    } catch (err) {
      throw new MemoryError(`failed to create pre-rewrite snapshot: ${(err as Error).message}`);
    }
    const byName = new Map((await listMemoryFiles(dir)).map((r) => [r.frontmatter.name, r]));
    let deleted = 0;
    let freedBytes = 0;
    for (const name of op.deletes) {
      const rec = byName.get(name);
      if (!rec) continue;
      try {
        await unlink(rec.path);
        deleted += 1;
        freedBytes += approxEntryBytes(rec);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      }
    }
    let merged = 0;
    for (const u of upserts) {
      await writeMemoryFileUnlocked(dirs, { scope: "user", name: u.name, type: u.type, description: u.description, body: u.body ?? "" });
      merged += 1;
    }
    await rebuildMemoryIndex(dir);
    await pruneSnapshots(dirs, "user", config.snapshotRetention, config.snapshotTtlDays).catch(() => undefined);
    return { scope: "user", startedAt, finishedAt: new Date().toISOString(), durationMs: Date.now() - startTs, snapshotId, deleted, merged, freedBytes, operations: [op] };
  });
}
