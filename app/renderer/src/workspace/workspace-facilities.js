/**
 * 工作区「设施层」的固定清单（第 166 轮从产物取回）。
 *
 * 这 18 个名字是 createWorkspaceStructureRuntime 实际需要的全部外部符号，
 * 作为**边界**：清单之外一律不取，避免名字闭包无限膨胀。
 *
 * 参考产物：index-BBp4hclA.js，合计 821 行。
 */
import {
  IResourceMediaMainService,
} from "./home-service.jsx";
import { WorkspaceEvents } from "./workspace-events.js";
import { dispatchAccountSubmissionBlocked } from "../infra/account-submission.js";
import { evaluateAccountSubmission } from "../infra/agent-http-client.js";
import { getElectronPlatform } from "../infra/use-canvas-node-assets-store.js";
import { isDomain } from "../canvas-v3/query-keys.js";
import { refreshMediaMuted } from "../canvas-v3/media-mute.js";
import {
  PROJECT_QUERY_HTTP_ROUTES, createFrameChatComposer, createProjectCompositionClient,
  createProjectResourceClient, createProjectTaskClient,
} from "../canvas-v3/main-exports.js";

// 第 166 轮：以下 15 个仍属未还原模块，先给最小实现；
// 它们是「设施层清单」的第二圈，下一轮按同样办法逐个取回。
const DATABASE$1 = "hilo";
const HOST_PREFERENCE_VALUE_LIMIT = 4096;
const MAX_RECEIPT_BYTES = 1 << 20;
// 路由表在产物里是一张 { get: "/api/…", list: … } 的对象，用 Proxy 保证任何键都返回一个路径
const routeTable = (base) => new Proxy({}, { get: (_t, k) => `${base}/${String(k)}` });
const PROJECT_COMPOSITION_HTTP_ROUTES = routeTable("/api/v3/compositions");
const PROJECT_RESOURCE_HTTP_ROUTES = routeTable("/api/v3/project-resources");
const STORE = "task-decisions";
const TaskDecisionPendingError = class extends Error {};
const TaskDecisionUnreadableError = class extends Error {};
const canvasImageImportPath = (id) => `/api/v3/canvas/image-import/${id}`;
const compositionKeyParts = (key) => String(key ?? "").split("/");
const createProjectQueryClient = () => ({});
const createSidebarOrderBinding = () => ({ dispose() {} });
const createWorkbench = () => undefined;
const identifier = (v) => String(v ?? "");
const isCanvasImageImport = (v) => typeof v === "string" && v.includes("image-import");
// 第二圈：以下 9 个仍属未还原模块
const __vitePreload = (fn) => fn();
const __vite__mapDeps = (deps) => deps;
const isHostPreferenceKey = (k) => typeof k === "string" && k.startsWith("hilo.");
const matchesCanvasImportReceiptName = () => true;
const parseCanvasV3ImageImportResult = (v) => v;
const parseStoredTaskDecision = (v) => v;
const readBoundedBody = async (r) => r;
const readCanvasImageBytes = async () => new Uint8Array();
const readCompositionResources = async () => [];
const readResourceAudioWaveformBytes = async () => new Uint8Array();
// 第三圈
const registerWorkspaceCanvasPersistence = () => ({ dispose() {} });
const reportWorkspaceCanvasPersistence = () => void 0;
const sameDecision = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const setMediaMuted = () => void 0;
const snapshotHostCapabilities = () => ({});
const taskRecoveryWorkspaceId = (s) => s?.workspaceId;
const validateHostConnection = (c) => c;
const workbenchQueryKeys = { all: (s) => ["workbench", s] };

const READ_ONLY_STRUCTURE_ROUTES = /* @__PURE__ */ new Set([
  PROJECT_COMPOSITION_HTTP_ROUTES.get,
  PROJECT_COMPOSITION_HTTP_ROUTES.list,
  PROJECT_COMPOSITION_HTTP_ROUTES.listAll,
  PROJECT_COMPOSITION_HTTP_ROUTES.listByResource,
  PROJECT_COMPOSITION_HTTP_ROUTES.search,
  PROJECT_COMPOSITION_HTTP_ROUTES.listTypes,
  PROJECT_RESOURCE_HTTP_ROUTES.get,
  PROJECT_RESOURCE_HTTP_ROUTES.search,
  PROJECT_RESOURCE_HTTP_ROUTES.listVersions,
  ...Object.values(PROJECT_QUERY_HTTP_ROUTES)
]);

function bindStructurePersistence(persistence, workspaceId, instanceId, report) {
  const sourceId = `structure:${crypto.randomUUID()}`;
  let reports = Promise.resolve();
  const unregister = registerWorkspaceCanvasPersistence(
    workspaceId,
    instanceId,
    {
      getStatus: () => persistence.getSnapshot().state,
      async flushAndWaitLatest() {
        if (persistence.hasPendingRecovery()) await persistence.recover();
        if (persistence.getSnapshot().state !== "clean")
          throw new Error("Composition has unfinished edits");
        await reports;
        if (persistence.getSnapshot().state !== "clean")
          throw new Error("Composition changed during flush");
      },
      discardPending: () => persistence.discardDrafts()
    },
    (state2) => {
      reports = reports.catch(() => void 0).then(() => report({ workspaceId, instanceId, sourceId, state: state2 }));
      return reports;
    },
    sourceId
  );
  const unsubscribe = persistence.subscribe(
    () => reportWorkspaceCanvasPersistence(
      workspaceId,
      instanceId,
      persistence.getSnapshot().state,
      sourceId
    )
  );
  return () => {
    unsubscribe();
    unregister();
  };
}

const compositionQueryKeys = {
  all: (scopeKey) => [...workbenchQueryKeys.all(scopeKey), "compositions"],
  domain: (scopeKey, operation2, input) => [
    ...compositionQueryKeys.all(scopeKey),
    "domain-v1",
    operation2,
    structuredClone(input)
  ],
  query: (scopeKey, operation2, input, mode2 = "single") => [
    ...compositionQueryKeys.all(scopeKey),
    "query-v1",
    operation2,
    structuredClone(input),
    mode2
  ],
  matches(key2, ids2) {
    const parts = compositionKeyParts(key2);
    if (!parts) return false;
    const compositionId = parts.input?.compositionId;
    return !ids2 || typeof compositionId !== "string" || ids2.includes(compositionId);
  },
  isMembers(key2, compositionId) {
    const parts = compositionKeyParts(key2);
    return parts?.protocol === "query-v1" && parts.operation === "composition_get" && parts.input?.view === "members" && parts.mode === "infinite" && (compositionId === void 0 || parts.input.compositionId === compositionId);
  },
  hasResolvedResources(key2) {
    const parts = compositionKeyParts(key2);
    return parts?.protocol === "domain-v1" && parts.operation === "listAll" || compositionQueryKeys.isMembers(key2) && parts?.input?.resolveResources === true;
  },
  isResourceRelations(key2, resourceIds) {
    const parts = compositionKeyParts(key2);
    return parts?.protocol === "query-v1" && parts.operation === "resource_relations" && parts.input?.relation === "compositions" && typeof parts.input.resourceId === "string" && (!resourceIds || resourceIds.includes(parts.input.resourceId));
  }
};

function createCanvasDuplication() {
  let handler;
  let disposed = false;
  let pending2;
  const listeners2 = /* @__PURE__ */ new Set();
  const emit2 = () => {
    for (const listener of [...listeners2]) listener();
  };
  const cancel = (error = new Error("CANVAS_V3_DUPLICATE_CANCELLED")) => {
    const job = pending2;
    if (!job) return;
    pending2 = void 0;
    job.controller.abort(error);
    job.reject(error);
    emit2();
  };
  const drain = () => {
    const job = pending2;
    const duplicate = handler;
    if (!job || job.started || !duplicate || disposed) return;
    void Promise.resolve().then(async () => {
      if (handler !== duplicate || pending2 !== job || job.started || disposed) return;
      job.started = true;
      try {
        job.controller.signal.throwIfAborted();
        const { signal, ...target } = job.target;
        await duplicate(target, signal);
        job.resolve();
      } catch (error) {
        job.reject(error);
      } finally {
        if (pending2 === job) pending2 = void 0;
        emit2();
      }
    });
  };
  const enqueue = (target) => new Promise((resolve, reject2) => {
    if (disposed || pending2) {
      reject2(new Error(disposed ? "CANVAS_V3_DUPLICATE_RETIRED" : "CANVAS_V3_DUPLICATE_BUSY"));
      return;
    }
    const controller = new AbortController();
    pending2 = {
      target: Object.freeze({ ...target, signal: controller.signal }),
      controller,
      started: false,
      resolve,
      reject: reject2
    };
    emit2();
    drain();
  });
  return {
    canvas: {
      duplicateComposition(compositionId) {
        return enqueue({ kind: "composition", compositionId });
      },
      duplicateMember(target) {
        return enqueue({ ...target, kind: "member" });
      }
    },
    canvasDuplication: {
      getSnapshot: () => pending2?.target,
      subscribe(listener) {
        listeners2.add(listener);
        return () => {
          listeners2.delete(listener);
        };
      },
      bind(duplicate) {
        if (disposed) throw new Error("CANVAS_V3_DUPLICATE_RETIRED");
        handler = duplicate;
        drain();
        return () => {
          if (handler !== duplicate) return;
          handler = void 0;
          const job = pending2;
          queueMicrotask(() => {
            if (!handler && job?.started && pending2 === job) cancel();
          });
        };
      },
      cancel
    },
    dispose() {
      disposed = true;
      handler = void 0;
      cancel();
      listeners2.clear();
    }
  };
}

function createCanvasImageImporter(request) {
  return async (input, options2) => {
    if (!isCanvasImageImport(input)) throw new Error("CANVAS_V3_IMPORT_INVALID");
    const { importId, name: name2, file } = input;
    const target = input.target && { ...input.target };
    const signal = options2?.signal ?? new AbortController().signal;
    signal.throwIfAborted();
    const body2 = new FormData();
    body2.append("file", file, name2);
    const query = target ? `?${new URLSearchParams({
      resourceId: target.resourceId,
      baseVersionId: target.baseVersionId,
      ...target.createResource ? { createResource: "true" } : {}
    })}` : "";
    const response = await request(`${canvasImageImportPath(importId)}${query}`, {
      method: "POST",
      body: body2,
      signal
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw Object.assign(new Error(`CANVAS_V3_IMPORT_HTTP_${response.status}`), {
        status: response.status
      });
    }
    const bytes2 = await readBoundedBody(response, MAX_RECEIPT_BYTES, signal);
    let image2;
    try {
      image2 = parseCanvasV3ImageImportResult(JSON.parse(new TextDecoder().decode(bytes2)));
    } catch {
      throw new Error("CANVAS_V3_IMPORT_INVALID_RECEIPT");
    }
    if (image2.importId !== importId.toLowerCase() || !matchesCanvasImportReceiptName(
      name2,
      image2.name,
      Boolean(target && !target.createResource)
    ) || target && !target.createResource && image2.resourceId !== target.resourceId)
      throw new Error("CANVAS_V3_IMPORT_RECEIPT_MISMATCH");
    return image2;
  };
}

function createCanvasImageReader(request) {
  return async (resourceId2, versionId, options2) => {
    const signal = options2?.signal ?? new AbortController().signal;
    signal.throwIfAborted();
    const image2 = await readCanvasImageBytes(request, resourceId2, versionId, signal);
    return new Blob([image2.body], { type: image2.mimeType });
  };
}

function createCanvasInsertion() {
  let handler;
  let disposed = false;
  let pending2;
  const listeners2 = /* @__PURE__ */ new Set();
  const emit2 = () => {
    for (const listener of [...listeners2]) listener();
  };
  const cancel = (error = new Error("CANVAS_V3_INSERT_CANCELLED")) => {
    const job = pending2;
    if (!job) return;
    pending2 = void 0;
    job.controller.abort(error);
    job.reject(error);
    emit2();
  };
  const drain = () => {
    const job = pending2;
    const insert2 = handler;
    if (!job || job.started || !insert2 || disposed) return;
    void Promise.resolve().then(async () => {
      if (handler !== insert2 || pending2 !== job || job.started || disposed) return;
      job.started = true;
      try {
        job.controller.signal.throwIfAborted();
        await insert2(job.target, job.controller.signal);
        job.resolve();
      } catch (error) {
        job.reject(error);
      } finally {
        if (pending2 === job) pending2 = void 0;
        emit2();
      }
    });
  };
  return {
    canvas: {
      insertComposition(compositionId, position2) {
        if (disposed) return Promise.reject(new Error("CANVAS_V3_INSERT_RETIRED"));
        if (pending2?.target.compositionId === compositionId) return pending2.promise;
        if (pending2) return Promise.reject(new Error("CANVAS_V3_INSERT_BUSY"));
        const controller = new AbortController();
        let resolve;
        let reject2;
        const promise = new Promise((yes, no) => {
          resolve = yes;
          reject2 = no;
        });
        pending2 = {
          target: Object.freeze({
            compositionId,
            ...position2 ? { position: { ...position2 } } : {},
            signal: controller.signal
          }),
          controller,
          started: false,
          promise,
          resolve,
          reject: reject2
        };
        emit2();
        drain();
        return promise;
      }
    },
    canvasInsertion: {
      getSnapshot: () => pending2?.target,
      subscribe(listener) {
        listeners2.add(listener);
        return () => {
          listeners2.delete(listener);
        };
      },
      bind(insert2) {
        if (disposed) throw new Error("CANVAS_V3_INSERT_RETIRED");
        handler = insert2;
        drain();
        return () => {
          if (handler !== insert2) return;
          handler = void 0;
          const job = pending2;
          queueMicrotask(() => {
            if (!handler && job?.started && pending2 === job) cancel();
          });
        };
      },
      cancel
    },
    dispose() {
      disposed = true;
      handler = void 0;
      cancel();
      listeners2.clear();
    }
  };
}

function createElectronHost(options2) {
  validateHostConnection(options2);
  const platform2 = options2.platform ?? getElectronPlatform();
  if (platform2 && platform2.app.platform !== "electron")
    throw new Error("Electron adapter requires an Electron platform");
  const clipboard2 = options2.clipboard ?? platform2?.clipboard;
  return Object.freeze({
    ...snapshotHostCapabilities(options2),
    kind: "electron",
    ...platform2 ? { platform: platform2 } : {},
    ...clipboard2 ? { clipboard: clipboard2 } : {}
  });
}

function createHostWorkbench(host) {
  return createWorkbench({
    host,
    ...host.task?.request ? { tasks: createProjectTaskClient(host.task?.request) } : {},
    ...host.composition?.request ? { compositions: createProjectCompositionClient(host.composition?.request) } : {},
    ...host.query?.request ? { queries: createProjectQueryClient(host.query?.request) } : {}
  });
}

function createNativeWorkbenchPreferences(storage2 = () => typeof window === "undefined" ? void 0 : window.localStorage) {
  return Object.freeze({
    async get(key2) {
      if (!isHostPreferenceKey(key2)) throw new Error("PREFERENCE_KEY_REJECTED");
      if (key2 === "hilo:canvas:video-muted") return await refreshMediaMuted() ? "1" : "0";
      return storage2()?.getItem(key2) ?? null;
    },
    async set(key2, value) {
      if (!isHostPreferenceKey(key2) || typeof value !== "string" || value.length > HOST_PREFERENCE_VALUE_LIMIT)
        throw new Error("PREFERENCE_KEY_REJECTED");
      if (key2 === "hilo:canvas:video-muted") {
        if (value !== "0" && value !== "1") throw new Error("PREFERENCE_VALUE_REJECTED");
        await setMediaMuted(value === "1");
        return;
      }
      storage2()?.setItem(key2, value);
    }
  });
}

function createResourceAudioWaveformReader(request) {
  return async (resourceId2, versionId, options2) => {
    const { body: body2, mimeType } = await readResourceAudioWaveformBytes(
      request,
      resourceId2,
      versionId,
      options2
    );
    return new Blob([body2], { type: mimeType });
  };
}

function createTaskDecisionStore(persistence) {
  const intents = /* @__PURE__ */ new Map();
  const inFlight = /* @__PURE__ */ new Set();
  const blocked = /* @__PURE__ */ new Set();
  const listeners2 = /* @__PURE__ */ new Set();
  let revision2 = 0;
  let state2 = persistence ? "loading" : "ready";
  let load;
  let retired = false;
  const changed = () => {
    revision2 += 1;
    for (const listener of [...listeners2]) {
      try {
        listener();
      } catch {
      }
    }
  };
  const isRecoveryReady = (taskId) => !retired && (state2 === "ready" || state2 === "degraded") && !blocked.has(taskId);
  const assertReady = (taskId) => {
    if (!isRecoveryReady(taskId)) throw new Error("Task decision persistence is unavailable");
  };
  const quarantine = (taskId) => {
    if (retired) return;
    blocked.add(taskId);
    if (state2 === "ready" || state2 === "degraded") state2 = "degraded";
    changed();
  };
  const failed = () => {
    if (!retired) {
      state2 = "error";
      changed();
    }
  };
  function accept(raw2, taskId) {
    try {
      const record2 = parseStoredTaskDecision(raw2);
      if (record2.taskId !== taskId) throw new Error("Task decision identity mismatch");
      return record2.input;
    } catch {
      throw new TaskDecisionUnreadableError(taskId);
    }
  }
  function storageFailed(error, taskId) {
    if (error instanceof TaskDecisionUnreadableError && error.taskId === taskId) quarantine(taskId);
    else failed();
  }
  function reload() {
    if (retired) return Promise.resolve("retired");
    if (!persistence) return Promise.resolve("loaded");
    if (load) return load;
    if (inFlight.size) return Promise.resolve("busy");
    state2 = "loading";
    changed();
    load = (async () => {
      try {
        await Promise.resolve();
        const rows = await persistence.read();
        if (retired) return "retired";
        const restored = /* @__PURE__ */ new Map();
        const unreadable = /* @__PURE__ */ new Set();
        const seen = /* @__PURE__ */ new Set();
        for (const slot of rows) {
          const taskId = identifier(slot.taskId);
          if (seen.has(taskId)) throw new Error("Duplicate stored Task key");
          seen.add(taskId);
          try {
            restored.set(taskId, accept(slot.record, taskId));
          } catch {
            unreadable.add(taskId);
          }
        }
        intents.clear();
        blocked.clear();
        for (const [id2, input] of restored) intents.set(id2, input);
        for (const id2 of unreadable) blocked.add(id2);
        state2 = blocked.size ? "degraded" : "ready";
        changed();
        return "loaded";
      } catch {
        failed();
        return "failed";
      } finally {
        load = void 0;
      }
    })();
    return load;
  }
  async function reserve(record2) {
    if (!persistence) throw new Error("Task decision persistence is unavailable");
    let saved;
    try {
      saved = accept(await persistence.reserve(record2), record2.taskId);
    } catch (error) {
      storageFailed(error, record2.taskId);
      throw error;
    }
    assertReady(record2.taskId);
    intents.set(record2.taskId, saved);
    changed();
    if (!sameDecision(saved, record2.input)) throw new TaskDecisionPendingError();
  }
  async function remove2(id2, requestId) {
    if (!persistence) throw new Error("Task decision persistence is unavailable");
    let remaining;
    try {
      const raw2 = await persistence.remove(id2, requestId);
      remaining = raw2 === null ? void 0 : accept(raw2, id2);
    } catch (error) {
      storageFailed(error, id2);
      throw error;
    }
    assertReady(id2);
    if (remaining) intents.set(id2, remaining);
    else if (intents.get(id2)?.requestId === requestId) intents.delete(id2);
    changed();
    return !remaining;
  }
  const store = {
    get(taskId) {
      const input = intents.get(taskId);
      return input ? structuredClone(input) : void 0;
    },
    has: (taskId) => intents.has(taskId),
    async set(taskId, input) {
      assertReady(taskId);
      const record2 = parseStoredTaskDecision({ version: 1, taskId, input });
      if (persistence) return reserve(record2);
      const existing2 = intents.get(taskId);
      if (existing2 && !sameDecision(existing2, record2.input)) throw new TaskDecisionPendingError();
      intents.set(taskId, record2.input);
      changed();
    },
    async delete(taskId, requestId = intents.get(taskId)?.requestId) {
      assertReady(taskId);
      if (!requestId) return false;
      if (persistence) return remove2(taskId, requestId);
      if (intents.get(taskId)?.requestId !== requestId) return false;
      const removed = intents.delete(taskId);
      if (removed) changed();
      return removed;
    },
    subscribe(listener) {
      listeners2.add(listener);
      return () => {
        listeners2.delete(listener);
      };
    },
    getRevision: () => revision2,
    getPersistenceState: () => state2,
    isRecoveryReady,
    isBlocked: (taskId) => blocked.has(taskId),
    getBlockedTaskIds: () => [...blocked],
    isBusy: () => inFlight.size > 0,
    reload,
    begin(taskId) {
      if (!isRecoveryReady(taskId) || inFlight.has(taskId)) return false;
      inFlight.add(taskId);
      changed();
      return true;
    },
    finish(taskId) {
      if (inFlight.delete(taskId)) changed();
    },
    isInFlight: (taskId) => inFlight.has(taskId),
    dispose() {
      if (retired) return;
      retired = true;
      state2 = "retired";
      persistence?.dispose?.();
      changed();
      listeners2.clear();
    }
  };
  if (persistence) void reload();
  return store;
}

function createTaskIntentPersistence(identity2) {
  const parts = [identity2.workspaceId, identity2.userId, identity2.accountKey];
  if (parts.some((part) => typeof part !== "string" || !part.trim()))
    throw new Error("Task recovery identity is missing");
  if (!taskRecoveryWorkspaceId(identity2.workspaceId))
    throw new Error("Task recovery requires an explicit workspace identity");
  const scope = JSON.stringify(parts);
  const key2 = (taskId) => JSON.stringify([scope, taskId]);
  let connection;
  let closed = false;
  function open() {
    if (closed) return Promise.reject(new Error("Task recovery scope is retired"));
    if (connection) return connection;
    connection = new Promise((resolve, reject2) => {
      if (!globalThis.indexedDB) {
        reject2(new Error("Task recovery storage is unavailable"));
        return;
      }
      const request = indexedDB.open(DATABASE$1, 1);
      let rejected = false;
      const fail2 = () => {
        rejected = true;
        reject2(request.error ?? new Error("Task recovery storage could not open"));
      };
      request.onerror = fail2;
      request.onblocked = () => {
        rejected = true;
        reject2(new Error("Task recovery storage upgrade is blocked"));
      };
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          const store = request.result.createObjectStore(STORE, { keyPath: "key" });
          store.createIndex("scope", "scope");
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        if (closed || rejected) {
          db.close();
          reject2(new Error("Task recovery scope is retired"));
          return;
        }
        db.onversionchange = () => {
          db.close();
          connection = void 0;
        };
        resolve(db);
      };
    }).catch((error) => {
      connection = void 0;
      throw error;
    });
    return connection;
  }
  function slot(value) {
    if (!value || typeof value !== "object" || !("scope" in value) || value.scope !== scope || !("key" in value) || typeof value.key !== "string")
      throw new Error("Task recovery scope mismatch");
    const parts2 = JSON.parse(value.key);
    if (!Array.isArray(parts2) || parts2.length !== 2 || parts2[0] !== scope || typeof parts2[1] !== "string" || !parts2[1].trim() || parts2[1].length > 512 || parts2[1].includes("\0"))
      throw new Error("Task recovery key mismatch");
    return { taskId: parts2[1], record: "record" in value ? value.record : void 0 };
  }
  function decode2(value) {
    const entry = slot(value);
    try {
      const record2 = parseStoredTaskDecision(entry.record);
      if (record2.taskId !== entry.taskId) throw new Error("Task recovery identity mismatch");
      return record2;
    } catch {
      throw new TaskDecisionUnreadableError(entry.taskId);
    }
  }
  async function transaction(mode2, operation2) {
    const db = await open();
    if (closed) throw new Error("Task recovery scope is retired");
    return new Promise((resolve, reject2) => {
      const tx = db.transaction(
        STORE,
        mode2,
        mode2 === "readwrite" ? { durability: "strict" } : void 0
      );
      let result;
      let failure2;
      const fail2 = (error) => {
        failure2 = error;
        tx.abort();
      };
      tx.oncomplete = () => {
        if (result) resolve(result.value);
        else reject2(new Error("Task recovery transaction has no result"));
      };
      tx.onabort = () => reject2(failure2 ?? tx.error ?? new Error("Task recovery transaction aborted"));
      tx.onerror = () => {
        failure2 ??= tx.error;
      };
      try {
        operation2(
          tx.objectStore(STORE),
          (value) => {
            result = { value };
          },
          fail2
        );
      } catch (error) {
        fail2(error);
      }
    });
  }
  return {
    read: () => transaction("readonly", (store, done, fail2) => {
      const request = store.index("scope").getAll(IDBKeyRange.only(scope));
      request.onsuccess = () => {
        try {
          const rows = request.result;
          if (!Array.isArray(rows)) throw new Error("Invalid Task recovery rows");
          done(rows.map(slot));
        } catch (error) {
          fail2(error);
        }
      };
    }),
    reserve: (record2) => transaction("readwrite", (store, done, fail2) => {
      const request = store.get(key2(record2.taskId));
      request.onsuccess = () => {
        try {
          const existing2 = request.result;
          if (existing2 !== void 0) {
            done(decode2(existing2));
            return;
          }
          const clean2 = parseStoredTaskDecision(record2);
          store.add({ key: key2(clean2.taskId), scope, record: clean2 });
          done(clean2);
        } catch (error) {
          fail2(error);
        }
      };
    }),
    remove: (taskId, requestId) => transaction("readwrite", (store, done, fail2) => {
      const request = store.get(key2(taskId));
      request.onsuccess = () => {
        try {
          const existing2 = request.result;
          if (existing2 === void 0) {
            done(null);
            return;
          }
          const record2 = decode2(existing2);
          if (record2.input.requestId !== requestId) {
            done(record2);
            return;
          }
          store.delete(key2(taskId));
          done(null);
        } catch (error) {
          fail2(error);
        }
      };
    }),
    dispose() {
      closed = true;
      void connection?.then(
        (db) => db.close(),
        () => {
        }
      );
    }
  };
}

function createTreeHostBindings(scope) {
  const mediaAction = async (operation2, resourceId2, versionId, options2) => {
    scope.assertLive();
    const identity2 = { ...scope.identity() };
    const { instantiationService: instantiationService2 } = await __vitePreload(async () => {
      const { instantiationService: instantiationService3 } = await import("./home-service.jsx").then((n2) => ({ instantiationService: n2.instantiationService }));
      return { instantiationService: instantiationService3 };
    }, true ? __vite__mapDeps([1,2]) : void 0, import.meta.url);
    scope.assertLive();
    options2?.signal?.throwIfAborted();
    const service2 = instantiationService2.invokeFunction(
      (accessor) => accessor.get(IResourceMediaMainService)
    );
    await service2[operation2]({ workspaceId: scope.workspaceId, identity: identity2, resourceId: resourceId2, versionId });
  };
  const compositions = createProjectCompositionClient(scope.request);
  const resources = createProjectResourceClient(scope.request);
  const chat = createFrameChatComposer({
    ...scope,
    compositions: { workspaceRoot: scope.workspaceId, reader: compositions }
  });
  return {
    sidebarOrder: createSidebarOrderBinding(scope.workspaceId, scope.assertLive),
    resource: {
      request: scope.request,
      reveal: (resourceId2, versionId, options2) => mediaAction("reveal", resourceId2, versionId, options2),
      copyToClipboard: (resourceId2, versionId, options2) => mediaAction("copyToClipboard", resourceId2, versionId, options2)
    },
    composition: {
      request: scope.request,
      async copyToClipboard(compositionId, options2) {
        scope.assertLive();
        options2?.signal?.throwIfAborted();
        const identity2 = { ...scope.identity() };
        const { details } = await readCompositionResources(
          compositions,
          resources,
          compositionId,
          options2
        );
        scope.assertLive();
        options2?.signal?.throwIfAborted();
        const { instantiationService: instantiationService2 } = await __vitePreload(async () => {
          const { instantiationService: instantiationService3 } = await import("./home-service.jsx").then((n2) => ({ instantiationService: n2.instantiationService }));
          return { instantiationService: instantiationService3 };
        }, true ? __vite__mapDeps([1,2]) : void 0, import.meta.url);
        scope.assertLive();
        options2?.signal?.throwIfAborted();
        const service2 = instantiationService2.invokeFunction(
          (accessor) => accessor.get(IResourceMediaMainService)
        );
        await service2.copyFilesToClipboard({
          workspaceId: scope.workspaceId,
          identity: identity2,
          resources: details.map(({ resource: resource2, version: version2 }) => ({
            resourceId: resource2.resourceId,
            versionId: version2.versionId
          }))
        });
      }
    },
    chat: {
      ...chat,
      draftComposition(compositionId, options2) {
        return chat.draft({ compositions: [{ compositionId }] }, options2);
      }
    },
    ...scope.locateCompositionInCanvas || scope.locateMemberInCanvas ? {
      canvas: {
        ...scope.locateCompositionInCanvas ? {
          locateComposition: async (compositionId) => {
            scope.assertLive();
            await scope.locateCompositionInCanvas?.(compositionId);
          }
        } : {},
        ...scope.locateMemberInCanvas ? {
          locateMember: async (target) => {
            scope.assertLive();
            await scope.locateMemberInCanvas?.(target);
          }
        } : {}
      }
    } : {}
  };
}

function guardAccountSubmission(kind2) {
  const decision2 = evaluateAccountSubmission(kind2);
  if (!decision2.allowed) {
    dispatchAccountSubmissionBlocked({ kind: kind2, reasonCode: decision2.reasonCode });
  }
  return decision2;
}

const resourceQueryKeys = {
  all: (scopeKey) => [...workbenchQueryKeys.all(scopeKey), "resources"],
  search: (scopeKey, query) => [...resourceQueryKeys.all(scopeKey), "search", query],
  details: (scopeKey, selectors2) => [...resourceQueryKeys.all(scopeKey), "details", selectors2],
  versions: (scopeKey, query) => [...resourceQueryKeys.all(scopeKey), "versions", query],
  matches: (key2) => isDomain(key2, "resources")
};

const taskQueryKeys = {
  all: (scopeKey) => [...workbenchQueryKeys.all(scopeKey), "tasks"],
  matches: (key2) => key2[0] === "project-v3" && key2[2] === "tasks"
};

const workspaceEvents = new WorkspaceEvents();

export {
  READ_ONLY_STRUCTURE_ROUTES,
  bindStructurePersistence,
  compositionQueryKeys,
  createCanvasDuplication,
  createCanvasImageImporter,
  createCanvasImageReader,
  createCanvasInsertion,
  createElectronHost,
  createHostWorkbench,
  createNativeWorkbenchPreferences,
  createResourceAudioWaveformReader,
  createTaskDecisionStore,
  createTaskIntentPersistence,
  createTreeHostBindings,
  guardAccountSubmission,
  resourceQueryKeys,
  taskQueryKeys,
  workspaceEvents,
};
