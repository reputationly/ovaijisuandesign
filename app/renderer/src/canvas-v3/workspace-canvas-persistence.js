/**
 * 工作区画布持久化状态登记 —— 从产物主包整段取回（第 83 轮）。
 *
 * 一个按 `[workspaceId, instanceId, sourceId]` 记账的注册表：
 * `register…` 登记控制器、`report…` 汇报当前状态（clean 且已无控制器就顺手清掉），
 * 状态变化通过 `reportStatus` 回调发布，并把 promise 记在 entry 上供恢复判断使用。
 */

// 没有 sourceId 时用的「旧版」生命周期标记
const LEGACY_PERSISTENCE_LIFETIME = "legacy";
const entriesByWorkspace = /* @__PURE__ */ new Map();
function lifetimeKey(instanceId, sourceId) {
  return sourceId ? JSON.stringify([instanceId || LEGACY_PERSISTENCE_LIFETIME, sourceId]) : instanceId || LEGACY_PERSISTENCE_LIFETIME;
}
function getOrCreateWorkspaceEntries(workspaceId) {
  const existing2 = entriesByWorkspace.get(workspaceId);
  if (existing2) return existing2;
  const created = /* @__PURE__ */ new Map();
  entriesByWorkspace.set(workspaceId, created);
  return created;
}
class WorkspaceCanvasPersistenceUnavailableError extends Error {
  constructor() {
    super("Canvas persistence controller is unavailable");
    this.name = "WorkspaceCanvasPersistenceUnavailableError";
  }
}
class WorkspaceCanvasPersistenceChangedError extends Error {
  constructor() {
    super("Canvas changed while waiting for the durability barrier");
    this.name = "WorkspaceCanvasPersistenceChangedError";
  }
}
function publishPersistenceStatus(entry) {
  if (!entry.reportStatus) return;
  entry.reportVersion += 1;
  const promise = entry.reportStatus(entry.status);
  void promise.catch(() => {
  });
  entry.reportPromise = promise;
}
function registerWorkspaceCanvasPersistence(workspaceId, instanceId, controller, reportStatus, sourceId) {
  const workspaceEntries = getOrCreateWorkspaceEntries(workspaceId);
  const key2 = lifetimeKey(instanceId, sourceId);
  const previous2 = workspaceEntries.get(key2);
  const entry = {
    controller,
    instanceId,
    reportPromise: previous2?.reportPromise,
    reportStatus,
    reportVersion: previous2?.reportVersion ?? 0,
    // Never let a remount's initial clean state erase an unresolved failure
    // from the same runtime lifetime. Only a durable flush may clear it.
    status: previous2?.status === "clean" || !previous2 ? controller.getStatus() : previous2.status
  };
  workspaceEntries.set(key2, entry);
  publishPersistenceStatus(entry);
  return () => {
    const current2 = workspaceEntries.get(key2);
    if (current2?.controller !== controller) return;
    current2.controller = void 0;
    current2.reportStatus = void 0;
    if (current2.status === "clean") workspaceEntries.delete(key2);
    if (workspaceEntries.size === 0) entriesByWorkspace.delete(workspaceId);
  };
}
function reportWorkspaceCanvasPersistence(workspaceId, instanceId, status, sourceId) {
  const workspaceEntries = getOrCreateWorkspaceEntries(workspaceId);
  const key2 = lifetimeKey(instanceId, sourceId);
  const entry = workspaceEntries.get(key2);
  if (entry) {
    entry.status = status;
    publishPersistenceStatus(entry);
  } else {
    workspaceEntries.set(key2, { instanceId, reportVersion: 0, status });
  }
  if (status === "clean" && !workspaceEntries.get(key2)?.controller) {
    workspaceEntries.delete(key2);
  }
  if (workspaceEntries.size === 0) entriesByWorkspace.delete(workspaceId);
}

export { registerWorkspaceCanvasPersistence, reportWorkspaceCanvasPersistence };
