/**
 * 启动时恢复上次的标签。
 *
 * 上次开着的工作区全部回来，但都是冷标签；只起一个（上次在看的那个），其余等用户
 * 点到再起——一口气起五套 gateway + opencode 会让启动卡很久。
 *
 * 熔断：`workspaceRestoreHealth[path]` 记"恢复了它但没有正常退出"的连续次数。恢复前
 * 先 +1（写在前面，崩溃了也算数），正常退出时清零。连续 2 次没正常退出，说明很可能就是
 * 它把应用拖垮的——问用户要不要恢复，默认跳过，免得每次一启动就再崩一次。
 */
import type { SessionRestorePayload } from "./ipc/types.js";
import type { GlobalStore } from "./storage/global-store.js";

export type { SessionRestorePayload } from "./ipc/types.js";

export interface VisiblePreviewTabsLike {
  initialized?: boolean;
  tabs?: Array<{ workspaceId: string; folderPath?: string }>;
}

export const RESTORE_UNHEALTHY_THRESHOLD = 2;

function uniquePaths(paths: unknown): string[] {
  if (!Array.isArray(paths)) return [];
  const out: string[] = [];
  for (const p of paths) if (typeof p === "string" && p && !out.includes(p)) out.push(p);
  return out;
}

export class RestoreHealth {
  constructor(private readonly store: GlobalStore) {}

  read(): Record<string, number> {
    const raw = this.store.get("workspaceRestoreHealth");
    const out: Record<string, number> = {};
    if (raw && typeof raw === "object") {
      for (const [k, v] of Object.entries(raw)) if (typeof v === "number" && Number.isFinite(v) && v > 0) out[k] = Math.floor(v);
    }
    return out;
  }

  unhealthy(paths: string[]): string[] {
    const map = this.read();
    return paths.filter((p) => (map[p] ?? 0) >= RESTORE_UNHEALTHY_THRESHOLD);
  }

  noteRestored(paths: string[]): void {
    if (paths.length === 0) return;
    const map = this.read();
    for (const p of paths) map[p] = (map[p] ?? 0) + 1;
    this.store.replace("workspaceRestoreHealth", map);
  }

  clear(p: string): void {
    const map = this.read();
    if (!(p in map)) return;
    delete map[p];
    this.store.replace("workspaceRestoreHealth", map);
  }

  /** 正常退出时调。 */
  reset(): void {
    if (Object.keys(this.read()).length > 0) this.store.replace("workspaceRestoreHealth", {});
  }
}

/**
 * 选要预先起的那一个：上次在看的优先；可见标签记录有效时只在可见标签里选；
 * 否则退回第一个恢复的。
 */
export function selectPrewarm(snapshot: VisiblePreviewTabsLike | undefined, restored: string[], lastActive: string | undefined): string | undefined {
  if (restored.length === 0) return undefined;
  const set = new Set(restored);
  const preferred = lastActive && set.has(lastActive) ? lastActive : undefined;
  if (!snapshot?.initialized) return preferred ?? restored[0];
  const visible: string[] = [];
  for (const t of snapshot.tabs ?? []) {
    const id = set.has(t.workspaceId) ? t.workspaceId : t.folderPath && set.has(t.folderPath) ? t.folderPath : undefined;
    if (id && !visible.includes(id)) visible.push(id);
  }
  if (preferred && visible.includes(preferred)) return preferred;
  return visible[0];
}

export interface RestoreDeps {
  store: GlobalStore;
  health: RestoreHealth;
  restoreTabs(paths: string[], prewarmId?: string): Promise<unknown>;
  /** 熔断时问用户。对话框出错时按"恢复"处理（不能因为弹窗失败就丢标签）。 */
  askRestoreUnhealthy(paths: string[]): Promise<"restore" | "skip">;
  /** 发给渲染层（`menu:new-workspace`）。 */
  send(payload: SessionRestorePayload): void;
  log?(line: string): void;
}

export interface RestoreOutcome {
  restored: string[];
  skipped: string[];
  prewarm?: string;
  payload?: SessionRestorePayload;
}

export async function runStartupRestore(deps: RestoreDeps): Promise<RestoreOutcome> {
  const saved = uniquePaths(deps.store.get("openWorkspacePaths"));
  if (saved.length === 0) return { restored: [], skipped: [] };
  const lastActiveRaw = deps.store.get("lastActiveWorkspacePath");
  const lastActive = typeof lastActiveRaw === "string" && lastActiveRaw ? lastActiveRaw : undefined;

  let restored = saved;
  let skipped: string[] = [];
  const unhealthy = deps.health.unhealthy(saved);
  if (unhealthy.length > 0) {
    deps.log?.(`恢复熔断：${unhealthy.length} 个工作区连续没有正常退出：${unhealthy.join(", ")}`);
    let answer: "restore" | "skip" = "restore";
    try {
      answer = await deps.askRestoreUnhealthy(unhealthy);
    } catch (err) {
      deps.log?.(`熔断对话框失败，照常恢复：${String(err)}`);
    }
    if (answer === "skip") {
      for (const p of unhealthy) deps.health.clear(p);
      skipped = unhealthy;
      restored = saved.filter((p) => !unhealthy.includes(p));
      deps.store.replace("openWorkspacePaths", restored);
    }
  }
  if (restored.length === 0) return { restored, skipped };

  // 先记账再恢复：恢复过程中崩了，这一次也要算进连续次数
  deps.health.noteRestored(lastActive && restored.includes(lastActive) ? [lastActive] : restored);

  const prewarm = selectPrewarm(deps.store.get("visiblePreviewTabs") as VisiblePreviewTabsLike | undefined, restored, lastActive);
  void deps.restoreTabs(restored, prewarm).catch((err) => deps.log?.(`恢复标签失败：${String(err)}`));
  const payload: SessionRestorePayload = {
    source: "session-restore",
    restoredWorkspaceIds: restored,
    ...(lastActive && restored.includes(lastActive) ? { preferredWorkspaceId: lastActive } : {}),
  };
  deps.send(payload);
  return { restored, skipped, prewarm, payload };
}
