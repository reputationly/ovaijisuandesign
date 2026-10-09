// instantiate-plugin-on-canvas.js
import { Emitter } from "../vendor-inline/vscode-base/vs-buffer.js";
import { dedupedToast } from "../vendor.js";
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
    let raw2;
    try {
      raw2 = localStorage.getItem(STORAGE_KEY);
    } catch {
      return this.snapshot;
    }
    if (raw2 === this.snapshotRaw) return this.snapshot;
    this.snapshotRaw = raw2;
    try {
      if (!raw2) {
        this.snapshot = [];
        return this.snapshot;
      }
      const parsed = JSON.parse(raw2);
      this.snapshot = Array.isArray(parsed)
        ? parsed.filter((x2) => typeof x2 === "string")
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
  record(id2) {
    if (!id2) return;
    const next2 = [id2, ...this.get().filter((x2) => x2 !== id2)].slice(
      0,
      MAX_STORED,
    );
    const serialized = JSON.stringify(next2);
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
      this.snapshotRaw = serialized;
      this.snapshot = next2;
    } catch {}
    this._onChange.fire();
  }
}
const pluginRecents = new PluginRecentsStore();
export async function instantiatePluginOnCanvas(
  { pluginId, position: position2, sourceNodeIds, initialData },
  { currentWorkspace, gatewayFetch: gatewayFetch2, t: t2 },
) {
  if (!currentWorkspace) {
    dedupedToast.error(
      t2("skills.plugin.addFailed", {
        error: "no workspace",
      }),
    );
    return null;
  }
  try {
    const resp = await gatewayFetch2(
      `/api/plugins/${encodeURIComponent(pluginId)}/instantiate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace,
          ...(position2
            ? {
                position: position2,
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
      const body2 = await resp.text();
      throw new Error(`instantiate ${resp.status}: ${body2}`);
    }
    const json2 = await resp.json();
    const nodeId = typeof json2.nodeId === "string" ? json2.nodeId : null;
    if (nodeId) pluginRecents.record(pluginId);
    return nodeId;
  } catch (err) {
    const message2 = err instanceof Error ? err.message : String(err);
    console.error("[canvas] Plugin instantiate failed:", err);
    dedupedToast.error(
      t2("skills.plugin.addFailed", {
        error: message2,
      }),
    );
    return null;
  }
}
