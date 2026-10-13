// instantiate-plugin-on-canvas.js
import { Emitter } from "../vendor-inline/vscode-base/vs-buffer.js";
import { dedupedToast } from "../infra/agent-http-client.js";
const STORAGE_KEY = "canvasSidebar.recentPlugins";
const MAX_STORED = 50;
class PluginRecentsStore {
  _onChange = new Emitter();
  snapshotRaw;
  snapshot = [];
  onChange = this._onChange.event;
  /**
   * Read the recents list (most-recent first). Tolerates corrupt storage.
   * Returns the same array reference while the stored value is unchanged so
   * callers can safely use this method as a `useSyncExternalStore` snapshot.
   */
  get() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      return this.snapshot;
    }
    if (raw === this.snapshotRaw) return this.snapshot;
    this.snapshotRaw = raw;
    try {
      if (!raw) {
        this.snapshot = [];
        return this.snapshot;
      }
      const parsed = JSON.parse(raw);
      this.snapshot = Array.isArray(parsed)
        ? parsed.filter((x) => typeof x === "string")
        : [];
    } catch {
      this.snapshot = [];
    }
    return this.snapshot;
  }
  /**
   * Promote `id` to the front of the recents list (dedup + unshift + cap).
   * No-op on empty id. Fires `onChange` so subscribers refresh.
   */
  record(id) {
    if (!id) return;
    const next = [id, ...this.get().filter((x) => x !== id)].slice(
      0,
      MAX_STORED,
    );
    const serialized = JSON.stringify(next);
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
      this.snapshotRaw = serialized;
      this.snapshot = next;
    } catch {}
    this._onChange.fire();
  }
}
const pluginRecents = new PluginRecentsStore();
export async function instantiatePluginOnCanvas(
  { pluginId, position, sourceNodeIds, initialData },
  { currentWorkspace, gatewayFetch, t },
) {
  if (!currentWorkspace) {
    dedupedToast.error(
      t("skills.plugin.addFailed", {
        error: "no workspace",
      }),
    );
    return null;
  }
  try {
    const resp = await gatewayFetch(
      `/api/plugins/${encodeURIComponent(pluginId)}/instantiate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace,
          ...(position
            ? {
                position,
              }
            : {}),
          ...(sourceNodeIds && sourceNodeIds.length > 0
            ? {
                sourceNodeIds,
              }
            : {}),
          ...(initialData
            ? {
                initialData,
              }
            : {}),
        }),
      },
    );
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`instantiate ${resp.status}: ${body}`);
    }
    const json = await resp.json();
    const nodeId = typeof json.nodeId === "string" ? json.nodeId : null;
    if (nodeId) pluginRecents.record(pluginId);
    return nodeId;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[canvas] Plugin instantiate failed:", err);
    dedupedToast.error(
      t("skills.plugin.addFailed", {
        error: message,
      }),
    );
    return null;
  }
}
