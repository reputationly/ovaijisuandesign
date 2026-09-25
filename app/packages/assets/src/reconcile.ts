import { randomUUID } from "node:crypto";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import { MEDIA_EXTENSIONS } from "@ov/protocol";

import type { AssetRow, AssetStore } from "./asset-store.js";
import { quickHash } from "./fingerprint.js";

/** 一次最多走这么多个文件。再多说明工作区指到了一个巨大的目录（比如整个家目录），不该往库里灌。 */
export const RECONCILE_WALK_BUDGET = 50_000;
/** 超过一半的记录同时找不到，多半是移动硬盘没插、网络盘断了，不是用户真删了：整轮放弃，一条都不标。 */
export const RECONCILE_MISSING_RATIO = 0.5;
/** 记录太少时比例没有意义（2 条里丢 1 条就是一半）。 */
const MISSING_RATIO_MIN_ROWS = 10;
/** 锁超过这么久当作上一个进程崩了留下的。 */
const LOCK_STALE_MS = 10 * 60_000;

export interface ReconcileChange {
  id: string;
  change: "created" | "updated" | "renamed" | "status-changed";
  path: string;
  old_path?: string;
  status?: "active" | "missing";
}

export type ReconcileResult =
  | { status: "skipped-locked" }
  | { status: "skipped-scale"; walked: number; budget: number }
  | { status: "aborted"; reason: "missing-ratio-exceeded"; missing_initial: number; total: number }
  | {
      status: "completed";
      walked: number;
      unchanged: number;
      dirty: number;
      orphan_initial: number;
      missing_initial: number;
      rebound: number;
      enrolled: number;
      evicted: number;
      marked_missing: number;
      candidates_set: number;
      dirty_changed: number;
      dirty_touched: number;
      duration_ms: number;
    };

interface Walked {
  rel: string;
  abs: string;
  size: number;
  mtimeMs: number;
  dev: number;
  ino: number;
}

/**
 * 把资产库和盘上的文件对一遍：用户在访达里改名、挪动、删掉、新拷进来的文件，库里跟着变。
 *
 * **id 要尽量保住**：画布节点按 id 引用素材，挪个目录就换 id 等于画布上的节点全断了。所以找不到的记录先
 * 去新出现的文件里认亲 —— 同一个 inode（同盘改名 / 挪动）或唯一一个 (size, 快速指纹) 相同的文件，就把
 * 记录搬过去；有好几个长得一样的文件时不猜，把第一个记成候选，让用户在界面上确认。
 */
export async function reconcileWorkspace(store: AssetStore, now: () => number = Date.now): Promise<{ result: ReconcileResult; changes: ReconcileChange[] }> {
  const started = now();
  const lockId = randomUUID();
  if (!acquireLock(store, lockId, started)) return { result: { status: "skipped-locked" }, changes: [] };
  try {
    const walked: Walked[] = [];
    const overBudget = await walk(store.root, "", walked);
    if (overBudget) return { result: { status: "skipped-scale", walked: walked.length, budget: RECONCILE_WALK_BUDGET }, changes: [] };

    const rows = store.list();
    const byPath = new Map(rows.map((r) => [r.path, r]));
    const seen = new Set<string>();
    const changes: ReconcileChange[] = [];
    let unchanged = 0;
    let dirtyChanged = 0;
    let dirtyTouched = 0;
    const orphans: Walked[] = [];
    const dirty: Walked[] = [];

    for (const f of walked) {
      const row = byPath.get(f.rel);
      if (!row) {
        orphans.push(f);
        continue;
      }
      seen.add(row.id);
      if (row.status === "active" && row.size === f.size && row.mtime_ms === Math.trunc(f.mtimeMs)) unchanged++;
      else dirty.push(f);
    }
    const missing = rows.filter((r) => !seen.has(r.id));
    const activeRows = rows.filter((r) => r.status === "active").length;
    const newlyMissing = missing.filter((r) => r.status === "active").length;
    if (activeRows >= MISSING_RATIO_MIN_ROWS && newlyMissing > activeRows * RECONCILE_MISSING_RATIO) {
      return { result: { status: "aborted", reason: "missing-ratio-exceeded", missing_initial: newlyMissing, total: activeRows }, changes: [] };
    }

    for (const f of dirty) {
      const before = byPath.get(f.rel)!;
      const after = await store.enroll(f.rel);
      if (before.status === "missing") changes.push({ id: after.id, change: "status-changed", path: after.path, status: "active" });
      else changes.push({ id: after.id, change: "updated", path: after.path });
      if (after.quick_hash !== before.quick_hash) dirtyChanged++;
      else dirtyTouched++;
    }

    // 认亲：先按 inode，再按 (size, 指纹)。指纹按需算，没有丢失记录时一个都不用算。
    const hashes = new Map<string, string>();
    const hashOf = async (f: Walked) => {
      let h = hashes.get(f.rel);
      if (h === undefined) {
        h = await quickHash(f.abs).catch(() => "");
        hashes.set(f.rel, h);
      }
      return h;
    };
    const claimed = new Set<string>();
    const pendingCandidates: { row: AssetRow; orphan: Walked }[] = [];
    let rebound = 0;
    for (const row of missing) {
      const free = orphans.filter((o) => !claimed.has(o.rel));
      let match = free.find((o) => row.inode != null && o.ino === row.inode && o.dev === row.dev_id && o.size === row.size);
      if (!match && row.quick_hash) {
        const same: Walked[] = [];
        for (const o of free) if (o.size === row.size && (await hashOf(o)) === row.quick_hash) same.push(o);
        if (same.length === 1) match = same[0];
        else if (same.length > 1) pendingCandidates.push({ row, orphan: same[0]! });
      }
      if (!match) continue;
      claimed.add(match.rel);
      const moved = await store.rebind(row.id, match.rel);
      changes.push({ id: row.id, change: "renamed", path: moved.path, old_path: row.path });
      rebound++;
    }

    let enrolled = 0;
    const enrolledByPath = new Map<string, AssetRow>();
    for (const o of orphans) {
      if (claimed.has(o.rel)) continue;
      const row = await store.enroll(o.rel).catch(() => undefined);
      if (!row) continue;
      enrolledByPath.set(o.rel, row);
      changes.push({ id: row.id, change: "created", path: row.path });
      enrolled++;
    }

    let markedMissing = 0;
    let candidatesSet = 0;
    const reboundIds = new Set(changes.filter((c) => c.change === "renamed").map((c) => c.id));
    for (const row of missing) {
      if (reboundIds.has(row.id)) continue;
      const cand = pendingCandidates.find((p) => p.row.id === row.id);
      const candRow = cand ? enrolledByPath.get(cand.orphan.rel) : undefined;
      if (candRow && store.setCandidate(row.id, candRow.id, candRow.path)) candidatesSet++;
      if (row.status === "active") {
        store.markMissing(row.id);
        changes.push({ id: row.id, change: "status-changed", path: row.path, status: "missing" });
        markedMissing++;
      }
    }

    return {
      result: {
        status: "completed",
        walked: walked.length,
        unchanged,
        dirty: dirty.length,
        orphan_initial: orphans.length,
        missing_initial: missing.length,
        rebound,
        enrolled,
        evicted: 0,
        marked_missing: markedMissing,
        candidates_set: candidatesSet,
        dirty_changed: dirtyChanged,
        dirty_touched: dirtyTouched,
        duration_ms: now() - started,
      },
      changes,
    };
  } finally {
    store.db.prepare("DELETE FROM reconcile_lock WHERE gateway_id = ?").run(lockId);
  }
}

function acquireLock(store: AssetStore, id: string, at: number): boolean {
  return store.db.transaction(() => {
    store.db.prepare("DELETE FROM reconcile_lock WHERE started_at < ?").run(at - LOCK_STALE_MS);
    if (store.db.prepare("SELECT 1 FROM reconcile_lock LIMIT 1").get()) return false;
    store.db.prepare("INSERT INTO reconcile_lock (gateway_id, started_at) VALUES (?, ?)").run(id, at);
    return true;
  })();
}

/** 只收认得的扩展名；点开头的目录和文件（.hilo、.git、.DS_Store）和 node_modules 跳过。超预算返回 true。 */
async function walk(root: string, rel: string, out: Walked[]): Promise<boolean> {
  const entries = await readdir(path.join(root, rel), { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    const childRel = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (await walk(root, childRel, out)) return true;
      continue;
    }
    if (!e.isFile() || !MEDIA_EXTENSIONS[path.extname(e.name).toLowerCase()]) continue;
    const abs = path.join(root, childRel);
    const st = await stat(abs).catch(() => undefined);
    if (!st) continue;
    out.push({ rel: childRel, abs, size: st.size, mtimeMs: st.mtimeMs, dev: Number(st.dev), ino: Number(st.ino) });
    if (out.length > RECONCILE_WALK_BUDGET) return true;
  }
  return false;
}
