/**
 * 工作区「设施层」的固定清单（第 166 轮从产物取回）。
 *
 * 这 18 个名字是 createWorkspaceStructureRuntime 实际需要的全部外部符号，
 * 作为**边界**：清单之外一律不取，避免名字闭包无限膨胀。
 *
 * 参考产物：index-BBp4hclA.js，合计 821 行。
 */
const createWorkbenchEvents = () => ({ dispose() {} });
// 第 181 轮：换回真实现（参考 428288）
function createWorkbenchPersistence() {
  const entries2 = /* @__PURE__ */ new Map();
  const listeners2 = /* @__PURE__ */ new Set();
  const actions = /* @__PURE__ */ new Map();
  let recovering;
  let snapshot2 = Object.freeze({ revision: 0, state: "clean" });
  let disposed = false;
  function publish2() {
    if (disposed) return;
    const states = [...entries2.values()];
    const state2 = ["failed", "saving", "dirty"].find((value) => states.includes(value)) ?? "clean";
    if (state2 === snapshot2.state) return;
    snapshot2 = Object.freeze({ revision: snapshot2.revision + 1, state: state2 });
    for (const listener of [...listeners2]) {
      try {
        listener();
      } catch {
      }
    }
  }
  return {
    getSnapshot: () => snapshot2,
    subscribe(listener) {
      if (disposed) return () => {
      };
      listeners2.add(listener);
      return () => {
        listeners2.delete(listener);
      };
    },
    hasPendingRecovery: () => [...entries2].some(([key2, state2]) => state2 === "failed" && actions.get(key2)?.recover),
    discardDrafts() {
      if (disposed) return;
      for (const action2 of [...actions.values()]) action2.discardDraft?.();
    },
    recover() {
      if (disposed) return Promise.reject(new Error("Workbench disposed"));
      if (recovering) return recovering;
      const pending2 = [...entries2].filter(
        ([key2, state2]) => state2 === "failed" && actions.get(key2)?.recover
      );
      recovering = (async () => {
        for (const [key2] of pending2) {
          if (disposed) throw new Error("Workbench disposed");
          await actions.get(key2)?.recover?.();
        }
      })().finally(() => {
        recovering = void 0;
      });
      return recovering;
    },
    createEntry(handlers2 = {}) {
      const key2 = {};
      let released = false;
      actions.set(key2, handlers2);
      return {
        update(state2) {
          if (disposed || released) return;
          entries2.set(key2, state2);
          publish2();
        },
        dispose() {
          if (released) return;
          released = true;
          entries2.delete(key2);
          actions.delete(key2);
          publish2();
        }
      };
    },
    dispose() {
      disposed = true;
      listeners2.clear();
      entries2.clear();
      actions.clear();
    }
  };
}
const decisionPayload = (v) => v;
const entriesByWorkspace = new Map();
const exact = (v) => v;
const fail = (m) => { throw new Error(String(m)); };
// 第 181 轮：换回真实现（参考 332987）—— 之前签名写成 (m, k)，调用方只传 workspaceId
function getOrCreateWorkspaceEntries(workspaceId) {
  const existing2 = entriesByWorkspace.get(workspaceId);
  if (existing2) return existing2;
  const created = /* @__PURE__ */ new Map();
  entriesByWorkspace.set(workspaceId, created);
  return created;
}
const id$7 = () => crypto.randomUUID();
const integer$4 = (v) => (Number.isInteger(v) ? v : 0);
const isSafeName = (v) => typeof v === "string" && /^[\w .-]+$/.test(v);
const lifetimeKey = (v) => String(v ?? "");
const mapProjectTaskEvent = (v) => v;
const parseCanvasV3ImageVersionTarget = (v) => v;

// ---- 第 178 轮：把剩余未绑定名就地补全，使本模块可以被静态 import ----
// 这些都是设施层的下层依赖，尚未逐个还原；标注清楚以免被当成真实现。
const CANVAS_V3_IMAGE_MAX_BYTES = 32 * 1024 * 1024;
const HOST_PREFERENCE_KEYS = ["hilo.videoMuted"];
const UUID$1 = () => crypto.randomUUID();
const aborted = (signal) => signal?.aborted === true;
// 第 180 轮：换回真实现（参考 415647）
function createSidebarOrderController(persistence, assertLive = () => {
}) {
  function update2(transform2) {
    const operation2 = (queues.get(persistence) ?? Promise.resolve()).then(async () => {
      assertLive();
      const previous2 = readState(await persistence.read());
      assertLive();
      const next2 = transform2(previous2);
      if (next2 !== previous2) {
        if (!isSidebarOrderState(next2)) throw new SidebarOrderError("SIDEBAR_ORDER_INVALID");
        await persistence.write(next2);
      }
      assertLive();
      return next2;
    });
    const tail = operation2.then(
      () => {
      },
      () => {
      }
    );
    queues.set(persistence, tail);
    void tail.then(() => {
      if (queues.get(persistence) === tail) queues.delete(persistence);
    });
    return operation2;
  }
  function replaceParent(state2, group, ranks) {
    const key2 = sidebarOrderParentKey(group);
    const bounded2 = boundedRanks(ranks);
    if (sameRanks(state2.parents[key2], bounded2)) return state2;
    return { parents: { ...state2.parents, [key2]: bounded2 } };
  }
  return {
    reconcile(groups) {
      if (!isSidebarOrderGroups(groups))
        return Promise.reject(new SidebarOrderError("SIDEBAR_ORDER_INVALID"));
      return update2((state2) => {
        let next2 = migrateLegacyMemberRanks(state2, groups);
        for (const group of groups) {
          const saved = next2.parents[sidebarOrderParentKey(group)];
          if (!saved) continue;
          next2 = replaceParent(next2, group, reconcileParent(saved, group.nodeIds));
        }
        return next2;
      });
    },
    forget(parents) {
      if (!isSidebarOrderParents(parents))
        return Promise.reject(new SidebarOrderError("SIDEBAR_ORDER_INVALID"));
      return update2((state2) => {
        const keys2 = parents.map(sidebarOrderParentKey).filter((key2) => key2 in state2.parents);
        if (!keys2.length) return state2;
        const next2 = { ...state2.parents };
        for (const key2 of keys2) delete next2[key2];
        return { parents: next2 };
      });
    },
    move(input) {
      if (!isSidebarOrderMove(input))
        return Promise.reject(new SidebarOrderError("SIDEBAR_ORDER_INVALID"));
      return update2((state2) => {
        if (input.nodeId === input.targetId) return state2;
        const current2 = migrateLegacyMemberRanks(state2, [input]);
        const ranks = reconcileParent(current2.parents[sidebarOrderParentKey(input)], input.nodeIds);
        const ids2 = Object.keys(ranks).sort((a2, b3) => compareRank$1(ranks[a2], ranks[b3]));
        const previousIndex = ids2.indexOf(input.nodeId);
        ids2.splice(previousIndex, 1);
        const index2 = input.targetId === void 0 ? ids2.length : ids2.indexOf(input.targetId) + Number(input.after === true);
        if (index2 !== previousIndex) {
          ranks[input.nodeId] = generateKeyBetween(
            index2 > 0 ? ranks[ids2[index2 - 1]] : null,
            index2 < ids2.length ? ranks[ids2[index2]] : null
          );
        }
        return replaceParent(current2, input, ranks);
      });
    }
  };
}
// 第 181 轮：换回真实现（参考 399649）
function createStructureCommandContext(options2) {
  assertStructureId(options2.scopeKey, "scopeKey");
  const records2 = /* @__PURE__ */ new Map();
  const listeners2 = /* @__PURE__ */ new Set();
  let snapshot2 = Object.freeze({
    disposed: false,
    pending: Object.freeze([])
  });
  let disposed = false;
  function publish2() {
    snapshot2 = Object.freeze({
      disposed,
      pending: Object.freeze(
        disposed ? [] : [...records2.values()].flatMap((record2) => {
          const phase2 = record2.inFlight ? "in-flight" : record2.result?.status === "unknown" ? "unknown" : void 0;
          return phase2 ? [Object.freeze({ phase: phase2, recovery: record2.recovery })] : [];
        })
      )
    });
    for (const listener of [...listeners2])
      notifyStructureObserver(listener, options2.onObserverError);
  }
  function assertActive() {
    options2.assertActive();
    if (disposed) throw new Error("Structure command context is disposed");
  }
  function run2(record2) {
    if (record2.inFlight) return record2.inFlight;
    const envelope = record2.recovery.envelope;
    const recoveringUnknown = record2.result?.status === "unknown";
    const inFlight = (async () => {
      let result;
      try {
        const receipt = immutableSnapshot(
          parseCompositionReceipt(await options2.execute(structuredClone(envelope)), envelope)
        );
        assertActive();
        result = receipt.committed ? { status: "committed", receipt } : { status: "conflict", receipt };
      } catch (error) {
        result = isKnownRejection(error, recoveringUnknown) ? { status: "rejected", error } : { status: "unknown", error, recovery: record2.recovery };
      }
      const frozen2 = Object.freeze(result);
      if (!disposed) {
        record2.result = frozen2;
        if (frozen2.status === "committed") {
          try {
            assertActive();
          } catch {
            return frozen2;
          }
          notifyStructureObserver(
            () => options2.onCommitted(
              envelope.commandId,
              "compositionId" in frozen2.receipt ? frozen2.receipt.compositionId : void 0
            ),
            options2.onObserverError
          );
        }
      }
      return frozen2;
    })();
    record2.inFlight = inFlight;
    publish2();
    void inFlight.finally(() => {
      record2.inFlight = void 0;
      if (!disposed) publish2();
    }).catch(() => {
    });
    return inFlight;
  }
  function recover(commandId) {
    assertActive();
    const record2 = records2.get(commandId);
    if (!record2) throw new StructureValidationError("No original command exists in this runtime");
    if (record2.inFlight) return record2.inFlight;
    if (record2.result && record2.result.status !== "unknown") return Promise.resolve(record2.result);
    return run2(record2);
  }
  return {
    scopeKey: options2.scopeKey,
    submit(envelope) {
      assertActive();
      assertStructureId(envelope.commandId, "commandId");
      const snapshot22 = immutableSnapshot(envelope);
      const signature = fingerprint$1(snapshot22);
      const existing2 = records2.get(snapshot22.commandId);
      if (existing2) {
        if (existing2.fingerprint !== signature) {
          throw new StructureValidationError("commandId is already bound to a different intent");
        }
        if (existing2.inFlight) return existing2.inFlight;
        if (existing2.result && existing2.result.status !== "unknown")
          return Promise.resolve(existing2.result);
        return run2(existing2);
      }
      const recovery = Object.freeze({
        scopeKey: options2.scopeKey,
        commandId: snapshot22.commandId,
        envelope: snapshot22,
        recover: () => recover(snapshot22.commandId)
      });
      const record2 = { fingerprint: signature, recovery };
      records2.set(snapshot22.commandId, record2);
      return run2(record2);
    },
    recover,
    getSnapshot: () => snapshot2,
    subscribe(listener) {
      if (disposed) return () => {
      };
      listeners2.add(listener);
      return () => {
        listeners2.delete(listener);
      };
    },
    getPending() {
      assertActive();
      return Object.freeze(
        [...records2.values()].filter((record2) => record2.inFlight || record2.result?.status === "unknown").map((record2) => record2.recovery)
      );
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      records2.clear();
      publish2();
      listeners2.clear();
    }
  };
}

// 第 181 轮：换回真实现（参考 400177）
function createStructureModule(service2, assertActive, onCommitted, options2) {
  let disposed = false;
  function assertModuleActive() {
    assertActive();
    if (disposed) throw new Error("Structure module is disposed");
  }
  function requireService() {
    assertModuleActive();
    if (!service2) throw new WorkbenchCapabilityUnavailableError("composition");
    return service2;
  }
  const commands = options2 ? createStructureCommandContext({
    scopeKey: options2.scopeKey,
    assertActive: () => {
      requireService();
    },
    execute: (envelope) => requireService().execute(envelope),
    onCommitted,
    onObserverError: options2.onObserverError
  }) : void 0;
  return {
    available: service2 !== void 0,
    get commands() {
      if (!commands) throw new Error("Structure commands require an explicit workspace scope");
      return commands;
    },
    async get(id2, readOptions) {
      const result = await requireService().get(id2, readOptions);
      assertModuleActive();
      return result;
    },
    async list(query, readOptions) {
      const result = await requireService().list(query, readOptions);
      assertModuleActive();
      return result;
    },
    async listAll(query, readOptions) {
      const result = await requireService().listAll(query, readOptions);
      assertModuleActive();
      return result;
    },
    async listByResource(query, readOptions) {
      const result = await requireService().listByResource(query, readOptions);
      assertModuleActive();
      return result;
    },
    async search(query, readOptions) {
      const result = await requireService().search(query, readOptions);
      assertModuleActive();
      return result;
    },
    async listTypes(query, readOptions) {
      const result = await requireService().listTypes(query, readOptions);
      assertModuleActive();
      return result;
    },
    async execute(envelope) {
      requireService();
      if (commands) {
        const result = await commands.submit(envelope);
        if (result.status === "committed" || result.status === "conflict") return result.receipt;
        throw result.error;
      }
      const snapshot2 = structuredClone(envelope);
      const receipt = await requireService().execute(snapshot2);
      assertModuleActive();
      if (receipt.committed)
        notifyStructureObserver(
          () => onCommitted(
            snapshot2.commandId,
            "compositionId" in receipt ? receipt.compositionId : void 0
          ),
          options2?.onObserverError
        );
      return receipt;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      commands?.dispose();
    }
  };
}
const createTaskInvalidationBridge = () => ({ dispose() {} });
import {
  IResourceMediaMainService,
} from "./home-service.jsx";
import { WorkspaceEvents } from "./workspace-events.js";
import { dispatchAccountSubmissionBlocked } from "../infra/account-submission.js";
import { evaluateAccountSubmission } from "../infra/agent-http-client.js";
import { getElectronPlatform } from "../infra/use-canvas-node-assets-store.js";
import { StructureValidationError, assertStructureId, immutableSnapshot } from "../chat/display-order.jsx";
import { isDomain } from "../canvas-v3/query-keys.js";
import { refreshMediaMuted } from "../canvas-v3/media-mute.js";
import { createTaskModule, isHostGenerationSubject, createChatSessionState, createProjectQueryModule, createResourceCommands, createResourceDetailModule, ProjectQueryError, WorkbenchCapabilityUnavailableError, boundedRanks, compareRank$1, fingerprint$1, isKnownRejection, isSidebarOrderParents, migrateLegacyMemberRanks, notifyStructureObserver, queues, readState, reconcileParent, sameRanks } from "./workspace-facilities-closure.js";
import { parseCompositionReceipt } from "../canvas-v3/canvas-v3-model.js";
import { SidebarOrderError, isSidebarOrderGroups, isSidebarOrderMove, isSidebarOrderState, sidebarOrderParentKey } from "../canvas-v3/frame-services.js";
import { generateKeyBetween } from "fractional-indexing";
import { CANVAS_V3_LIMITS } from "../canvas-v3/canvas-v3-constants.js";
import {
  PROJECT_QUERY_HTTP_ROUTES, createFrameChatComposer, createProjectCompositionClient,
  createProjectResourceClient, createProjectTaskClient,
} from "../canvas-v3/main-exports.js";

// 第 166 轮：以下 15 个仍属未还原模块，先给最小实现；
// 它们是「设施层清单」的第二圈，下一轮按同样办法逐个取回。



// 路由表在产物里是一张 { get: "/api/…", list: … } 的对象，用 Proxy 保证任何键都返回一个路径
const routeTable = (base) => new Proxy({}, { get: (_t, k) => `${base}/${String(k)}` });
const CANVAS_V3_ROUTES = routeTable("/api/v3/canvas");
const parsePlacementTarget = (v) => v;
const parseProjectQueryResponse = (v) => v;
const pendingWrites = new Set();
const preference = { get: () => undefined, set: () => void 0 };
const publish = () => void 0;
const publishPersistenceStatus = () => void 0;
const refresh = () => void 0;
const resolvePinnedResources = () => [];
const splitName = (v) => String(v ?? "").split("/");
// 第 180 轮：换回真实现（参考 428530）—— 之前是对象占位，
// 缺 workspaceGet/workspaceSet/createEntry，导致 createTreeHostBindings 校验失败。
function storage() {
  const bridge = getElectronPlatform()?.storage;
  if (!bridge) throw new Error("Workspace storage unavailable");
  return bridge;
}
const workspaces = new Map();
const writes = new Set();












// 第二圈：以下 9 个仍属未还原模块
const __vitePreload = (fn) => fn();
const __vite__mapDeps = (deps) => deps;




const readBoundedBody = async (r) => r;
const readCanvasImageBytes = async () => new Uint8Array();
const readCompositionResources = async () => [];
const readResourceAudioWaveformBytes = async () => new Uint8Array();
// 第三圈








const PROJECT_RESOURCE_HTTP_ROUTES = {
  get: "/api/project/resources/get",
  search: "/api/project/resources/search",
  listVersions: "/api/project/resources/versions/list",
  commands: "/api/project/resources/commands"
};

const PROJECT_COMPOSITION_HTTP_ROUTES = {
  get: "/api/project/compositions/get",
  list: "/api/project/compositions/list",
  listAll: "/api/project/compositions/list-all",
  listByResource: "/api/project/compositions/list-by-resource",
  search: "/api/project/compositions/search",
  listTypes: "/api/project/compositions/types/list",
  commands: "/api/project/compositions/commands"
};

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

// ---- 第 167 轮：真实现（参考 428706）----
const DATABASE$1 = "hilo-v3-task-decisions";

// ---- 第 167 轮：真实现（参考 425161）----
const HOST_PREFERENCE_VALUE_LIMIT = 16 * 1024;

// ---- 第 167 轮：真实现（参考 424973）----
const MAX_RECEIPT_BYTES = 64 * 1024;

// ---- 第 167 轮：真实现（参考 319860）----

// ---- 第 167 轮：真实现（参考 321091）----

// ---- 第 167 轮：真实现（参考 428707）----
const STORE = "pending";

// ---- 第 167 轮：真实现（参考 329838）----
class TaskDecisionPendingError extends Error {
  constructor() {
    super("An earlier Task decision must be reconciled first");
  }
}

// ---- 第 167 轮：真实现（参考 329719）----
class TaskDecisionUnreadableError extends Error {
  constructor(taskId) {
    super("Task decision record cannot be read");
    this.taskId = taskId;
  }
  taskId;
}

// ---- 第 167 轮：真实现（参考 424820）----
function canvasImageImportPath(importId) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(importId))
    throw new Error("Invalid Canvas image import identity");
  return `${CANVAS_V3_ROUTES.images}/${importId.toLowerCase()}`;
}

// ---- 第 167 轮：真实现（参考 400340）----
function compositionKeyParts(key2) {
  if (!isDomain(key2, "compositions")) return void 0;
  const [, , , protocol, operation2, value, mode2] = key2;
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : void 0;
  return { protocol, operation: operation2, input, mode: mode2 };
}

// ---- 第 167 轮：真实现（参考 403912）----
function createProjectQueryClient(request) {
  async function query(operation2, input, options2) {
    if (options2?.signal?.aborted) throw aborted();
    if (!Object.hasOwn(PROJECT_QUERY_HTTP_ROUTES, operation2))
      throw new ProjectQueryError(422, "UNSUPPORTED_QUERY", "Unsupported Project Query operation");
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new ProjectQueryError(400, "INVALID_ARGUMENT", "Project Query input must be an object");
    let snapshot2;
    let body2;
    try {
      snapshot2 = structuredClone(input);
      body2 = JSON.stringify(snapshot2);
    } catch {
      throw new ProjectQueryError(400, "INVALID_ARGUMENT", "Project Query input must be JSON data");
    }
    if (operation2 === "resource_relations" && (!("relation" in snapshot2) || snapshot2.relation !== "compositions"))
      throw new ProjectQueryError(
        422,
        "UNSUPPORTED_QUERY",
        "Only Composition relations are supported"
      );
    if (operation2 === "composition_get") {
      const read = snapshot2;
      if (read.view !== void 0 && read.view !== "summary" && read.view !== "members")
        throw new ProjectQueryError(400, "INVALID_ARGUMENT", "Invalid Composition query view");
      if ((read.view ?? "summary") === "summary" && [read.memberId, read.role, read.resolveResources, read.limit, read.cursor].some(
        (field) => field !== void 0
      ))
        throw new ProjectQueryError(400, "INVALID_ARGUMENT", "Member filters require view=members");
    }
    let response;
    try {
      response = await request(PROJECT_QUERY_HTTP_ROUTES[operation2], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body2,
        ...options2?.signal ? { signal: options2.signal } : {}
      });
    } catch (error) {
      if (options2?.signal?.aborted || error instanceof Error && error.name === "AbortError")
        throw aborted();
      if (error instanceof ProjectQueryError) throw error;
      throw new ProjectQueryError(
        0,
        "NETWORK_ERROR",
        error instanceof Error ? error.message : "Project Query transport failed",
        true
      );
    }
    if (options2?.signal?.aborted) throw aborted();
    if (!response.ok) {
      try {
        throw await ProjectQueryError.fromResponse(response);
      } catch (error) {
        if (options2?.signal?.aborted || error instanceof Error && error.name === "AbortError")
          throw aborted();
        throw error;
      }
    }
    try {
      const value = await response.json();
      if (options2?.signal?.aborted) throw aborted();
      return parseProjectQueryResponse(operation2, value, snapshot2);
    } catch (error) {
      if (options2?.signal?.aborted || error instanceof Error && error.name === "AbortError")
        throw aborted();
      throw new ProjectQueryError(
        response.status,
        "INVALID_RESPONSE",
        error instanceof Error ? error.message : "Invalid Project Query response"
      );
    }
  }
  return { query };
}

// ---- 第 167 轮：真实现（参考 428535）----
function createSidebarOrderBinding(workspaceId, assertLive) {
  let persistence = workspaces.get(workspaceId);
  if (!persistence) {
    persistence = {
      read: () => storage().workspaceGet(workspaceId, "compositionSidebarOrder"),
      write: (state2) => storage().workspaceSet(workspaceId, "compositionSidebarOrder", state2)
    };
    workspaces.set(workspaceId, persistence);
  }
  return createSidebarOrderController(persistence, assertLive);
}

// ---- 第 167 轮：真实现（参考 428366）----
function createWorkbench({
  host,
  resources: supplied,
  compositions,
  queries: suppliedQueries,
  tasks
}) {
  if (!host.scopeKey.trim()) throw new Error("Workbench requires an explicit workspace scope");
  const scopeKey = host.scopeKey;
  const service2 = supplied ?? createProjectResourceClient(host.resource.request);
  const events2 = createWorkbenchEvents();
  const persistence = createWorkbenchPersistence();
  const detachPersistence = host.persistence?.connect(persistence);
  let disposed = false;
  const assertActive = () => {
    if (disposed) throw new Error("Workbench is disposed");
  };
  const commands = createResourceCommands(service2, assertActive, (resourceId2, commandId) => {
    if (!disposed) events2.emit({ type: "resource-committed", scopeKey, resourceId: resourceId2, commandId });
  });
  const resources = {
    async search(query, options2) {
      assertActive();
      return service2.search(query, options2);
    },
    async getResources(selectors2, options2) {
      assertActive();
      return service2.getResources(selectors2, options2);
    },
    async listResourceVersions(query, options2) {
      assertActive();
      return service2.listResourceVersions(query, options2);
    },
    execute: commands.execute
  };
  const structure = createStructureModule(
    compositions,
    assertActive,
    (commandId, compositionId) => {
      if (!disposed)
        events2.emit({ type: "composition-committed", scopeKey, commandId, compositionId });
    },
    { scopeKey }
  );
  const structurePersistence = persistence.createEntry({
    async recover() {
      for (const pending2 of structure.commands.getPending()) await pending2.recover();
    }
  });
  const detachStructurePersistence = structure.commands.subscribe(() => {
    const snapshot2 = structure.commands.getSnapshot();
    if (snapshot2.disposed) return;
    structurePersistence.update(
      snapshot2.pending.some((entry) => entry.phase === "unknown") ? "failed" : snapshot2.pending.length ? "saving" : "clean"
    );
  });
  const queries = createProjectQueryModule(suppliedQueries, assertActive);
  const taskBridge = createTaskInvalidationBridge(scopeKey, (resourceIds, compositionIds) => {
    if (disposed) return;
    if (resourceIds.length) events2.emit({ type: "resources-invalidated", scopeKey, resourceIds });
    if (compositionIds.length)
      events2.emit({ type: "compositions-invalidated", scopeKey, compositionIds });
  });
  function acceptTaskSnapshot(snapshot2) {
    const accepted2 = taskBridge.accept(snapshot2);
    if (accepted2) events2.emit({ type: "tasks-invalidated", scopeKey });
    return accepted2;
  }
  const execution = createTaskModule(tasks, scopeKey, assertActive, (task2) => {
    acceptTaskSnapshot({ scopeKey, task: task2 });
  });
  const unsubscribeTasks = host.task?.subscribe?.((input) => {
    const event = mapProjectTaskEvent(input);
    if (disposed || !event || event.scopeKey !== scopeKey) return;
    if (event.type === "task-changed") acceptTaskSnapshot(event);
    else {
      events2.emit({ type: "resources-invalidated", scopeKey });
      events2.emit({ type: "compositions-invalidated", scopeKey });
      events2.emit({ type: "tasks-invalidated", scopeKey });
    }
  });
  function snapshotIds(ids2) {
    if (ids2?.some((id2) => typeof id2 !== "string" || !id2.trim())) {
      throw new Error("Invalidation identities must be nonempty strings");
    }
    return ids2 === void 0 ? void 0 : Object.freeze([...new Set(ids2)]);
  }
  const importer = host.media?.importImage;
  const importCanvasImage = importer ? async (input, options2) => {
    assertActive();
    const image2 = await importer(input, options2);
    assertActive();
    events2.emit({ type: "resources-invalidated", scopeKey, resourceIds: [image2.resourceId] });
    return image2;
  } : void 0;
  const chatSession = host.chatSession ? createChatSessionState(host.chatSession, persistence) : void 0;
  return {
    chatSession,
    persistence,
    scopeKey,
    host,
    ...importCanvasImage ? { importCanvasImage } : {},
    resources,
    structure,
    queries,
    context: {
      resolve: (selectors2) => {
        assertActive();
        return resolvePinnedResources(resources, selectors2);
      }
    },
    execution,
    resourceDetail: createResourceDetailModule({ execution, resources, importCanvasImage }),
    modules: Object.freeze([
      { id: "assets", state: "available" },
      // The shared view needs the scoped Canvas document transport; everything else degrades.
      { id: "canvas", state: host.canvas?.request ? "available" : "adapter-required" },
      { id: "structure", state: structure.available ? "available" : "adapter-required" },
      execution.status,
      { id: "chat", state: host.chatSession ? "available" : "adapter-required" }
    ]),
    events: events2.source,
    invalidateResources(change) {
      if (change && (disposed || change.scopeKey !== scopeKey)) return false;
      assertActive();
      const resourceIds = snapshotIds(change?.resourceIds);
      if (resourceIds?.length === 0) return false;
      events2.emit({ type: "resources-invalidated", scopeKey, resourceIds });
      return true;
    },
    invalidateCompositions(change) {
      if (change && (disposed || change.scopeKey !== scopeKey)) return false;
      assertActive();
      const compositionIds = snapshotIds(change?.compositionIds);
      if (compositionIds?.length === 0) return false;
      events2.emit({ type: "compositions-invalidated", scopeKey, compositionIds });
      return true;
    },
    acceptTaskSnapshot,
    dispose() {
      if (disposed) return;
      disposed = true;
      detachPersistence?.();
      detachStructurePersistence();
      chatSession?.dispose();
      persistence.dispose();
      execution.dispose();
      unsubscribeTasks?.();
      taskBridge.dispose();
      structure.dispose();
      events2.emit({ type: "disposed", scopeKey });
      events2.dispose();
    }
  };
}

// ---- 第 167 轮：真实现（参考 329726）----
function identifier(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 512 || value.includes("\0"))
    throw new Error("Invalid stored Task decision identity");
  return value;
}

// ---- 第 167 轮：真实现（参考 424830）----
function isCanvasImageImport(value) {
  if (!value || typeof value !== "object") return false;
  const input = value;
  if (typeof input.importId !== "string" || typeof input.name !== "string" || input.name.length === 0 || input.name.length > 255)
    return false;
  try {
    canvasImageImportPath(input.importId);
    encodeURIComponent(input.name);
    if (input.target !== void 0) parseCanvasV3ImageVersionTarget(input.target);
  } catch {
    return false;
  }
  return typeof input.name === "string" && input.name.length > 0 && ![".", ".."].includes(input.name) && new TextEncoder().encode(input.name).byteLength <= 255 && // biome-ignore lint/suspicious/noControlCharactersInRegex: same filename boundary as the image service.
  !/[\x00-\x1f\x7f/\\:]/.test(input.name) && input.file instanceof Blob && input.file.size > 0 && input.file.size <= CANVAS_V3_IMAGE_MAX_BYTES && Object.keys(input).every((key2) => ["importId", "name", "file", "target"].includes(key2));
}

// ---- 第 167 轮：真实现（参考 425260）----
function isHostPreferenceKey(value) {
  return typeof value === "string" && HOST_PREFERENCE_KEYS.includes(value);
}

// ---- 第 167 轮：真实现（参考 424960）----
function matchesCanvasImportReceiptName(originalName, receiptName, hasVersionTarget = false) {
  if (!isSafeName(originalName) || !isSafeName(receiptName)) return false;
  if (receiptName === originalName) return true;
  if (hasVersionTarget) return false;
  const original = splitName(originalName);
  const receipt = splitName(receiptName);
  if (original.extension !== receipt.extension) return false;
  const prior = /\(([0-9]+)\)$/.exec(original.stem);
  const next2 = /\(([1-9][0-9]*)\)$/.exec(receipt.stem);
  if (!next2?.[1]) return false;
  const base2 = prior ? original.stem.slice(0, prior.index) : original.stem;
  return receipt.stem.slice(0, next2.index) === base2 && BigInt(next2[1]) > BigInt(prior?.[1] ?? "0");
}

// ---- 第 167 轮：真实现（参考 319487）----
function parseCanvasV3ImageImportResult(value) {
  const v2 = exact(value, [
    "importId",
    "resourceId",
    "versionId",
    "name",
    "mimeType",
    "width",
    "height"
  ]);
  if (typeof v2.importId !== "string" || v2.importId.length !== 36 || !UUID$1.test(v2.importId))
    fail("invalid importId UUID");
  if (typeof v2.name !== "string" || !v2.name.trim() || v2.name.length > CANVAS_V3_LIMITS.titleLength)
    fail("invalid image name");
  if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(v2.mimeType))
    fail("invalid image mimeType");
  const width = integer$4(v2.width), height = integer$4(v2.height);
  if (width <= 0 || height <= 0 || width > 1e8 / height) fail("invalid image dimensions");
  return {
    importId: v2.importId,
    resourceId: id$7(v2.resourceId),
    versionId: id$7(v2.versionId),
    name: v2.name,
    mimeType: v2.mimeType,
    width,
    height
  };
}

// ---- 第 167 轮：真实现（参考 329731）----
function parseStoredTaskDecision(raw2) {
  if (!raw2 || typeof raw2 !== "object" || !("version" in raw2) || raw2.version !== 1 || !("taskId" in raw2) || !("input" in raw2))
    throw new Error("Invalid stored Task decision");
  const value = raw2.input;
  if (!value || typeof value !== "object" || !("requestId" in value) || !("expectedRevision" in value) || !("action" in value) || typeof value.expectedRevision !== "number" || !Number.isSafeInteger(value.expectedRevision) || value.expectedRevision < 1)
    throw new Error("Invalid stored Task decision request");
  const base2 = { requestId: identifier(value.requestId), expectedRevision: value.expectedRevision };
  let input;
  switch (value.action) {
    case "pause":
    case "resume":
    case "stop":
    case "retry":
      if (Object.keys(value).some((key2) => !["requestId", "expectedRevision", "action"].includes(key2)))
        throw new Error("Unexpected stored Task decision field");
      input = { ...base2, action: value.action };
      break;
    case "confirm_cost":
      if (!("quoteId" in value) || Object.keys(value).some(
        (key2) => !["requestId", "expectedRevision", "action", "quoteId"].includes(key2)
      ))
        throw new Error("Invalid stored Task quote");
      input = { ...base2, action: value.action, quoteId: identifier(value.quoteId) };
      break;
    case "finish_without_placement":
      if (!("key" in value) || Object.keys(value).some(
        (key2) => !["requestId", "expectedRevision", "action", "key"].includes(key2)
      ))
        throw new Error("Invalid stored Task placement key");
      input = { ...base2, action: value.action, key: identifier(value.key) };
      break;
    case "update_placement":
      if (!("composition" in value) || Object.keys(value).some(
        (key2) => !["requestId", "expectedRevision", "action", "composition"].includes(key2)
      ))
        throw new Error("Invalid stored Task placement");
      input = {
        ...base2,
        action: value.action,
        composition: parsePlacementTarget(value.composition)
      };
      break;
    default:
      throw new Error("Unsupported stored Task decision");
  }
  return { version: 1, taskId: identifier(raw2.taskId), input };
}

// ---- 第 167 轮：真实现（参考 333014）----
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

// ---- 第 167 轮：真实现（参考 333039）----
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

// ---- 第 167 轮：真实现（参考 329843）----
function sameDecision(left, right) {
  return left.requestId === right.requestId && left.expectedRevision === right.expectedRevision && left.action === right.action && decisionPayload(left) === decisionPayload(right);
}

// ---- 第 167 轮：真实现（参考 329456）----
function setMediaMuted(value) {
  const current2 = preference;
  revision += 1;
  publish(value);
  if (!current2) return Promise.resolve();
  pendingWrites += 1;
  const operation2 = writes.catch(() => {
  }).then(() => current2.write(value));
  writes = operation2;
  return operation2.finally(() => {
    pendingWrites -= 1;
    if (pendingWrites === 0) refresh();
  });
}

// ---- 第 167 轮：真实现（参考 425467）----
function snapshotHostCapabilities(options2) {
  return {
    ...options2,
    resource: Object.freeze({ ...options2.resource }),
    ...options2.composition ? { composition: Object.freeze({ ...options2.composition }) } : {},
    ...options2.query ? { query: Object.freeze({ ...options2.query }) } : {},
    ...options2.task ? { task: Object.freeze({ ...options2.task }) } : {},
    ...options2.canvas ? { canvas: Object.freeze({ ...options2.canvas }) } : {},
    ...options2.media ? { media: Object.freeze({ ...options2.media }) } : {},
    ...options2.billing ? { billing: Object.freeze({ ...options2.billing }) } : {}
  };
}

// ---- 第 167 轮：真实现（参考 424314）----
function taskRecoveryWorkspaceId(value) {
  if (typeof value !== "string" || !value.trim() || value === "app" || /^https?:\/\//i.test(value))
    return void 0;
  return value;
}

// ---- 第 167 轮：真实现（参考 425388）----
function validateHostConnection(options2) {
  for (const [name2, action2] of [
    ["resource.reveal", options2.resource?.reveal],
    ["resource.copyToClipboard", options2.resource?.copyToClipboard],
    ["composition.copyToClipboard", options2.composition?.copyToClipboard],
    ["canvas.locateComposition", options2.canvas?.locateComposition],
    ["canvas.insertComposition", options2.canvas?.insertComposition],
    ["canvas.duplicateComposition", options2.canvas?.duplicateComposition],
    ["canvas.duplicateMember", options2.canvas?.duplicateMember],
    ["canvas.locateMember", options2.canvas?.locateMember]
  ]) {
    if (action2 !== void 0 && typeof action2 !== "function")
      throw new Error(`Invalid host action: ${name2}`);
  }
  if (options2.grantMedia !== void 0 && typeof options2.grantMedia !== "function")
    throw new Error("Media requires an explicit scoped granter");
  if (options2.task?.subscribe !== void 0 && typeof options2.task?.subscribe !== "function")
    throw new Error("Task events require an explicit workspace subscription");
  if (!options2.scopeKey.trim() || typeof options2.resource?.request !== "function")
    throw new Error("An explicit workspace scope and transport are required");
  if (options2.composition !== void 0 && typeof options2.composition?.request !== "function")
    throw new Error("Composition requires an explicit workspace transport");
  if (options2.task?.request !== void 0 && typeof options2.task?.request !== "function")
    throw new Error("Task requires an explicit workspace transport");
  if (options2.query !== void 0 && typeof options2.query?.request !== "function")
    throw new Error("Query requires an explicit workspace transport");
  if (options2.editorEvents !== void 0 && typeof options2.editorEvents.subscribe !== "function")
    throw new Error("Editor events require an explicit workspace subscription");
  if (options2.director !== void 0 && typeof options2.director !== "function")
    throw new Error("Director requires an explicit workspace capability");
  if (options2.canvas?.request !== void 0 && typeof options2.canvas?.request !== "function")
    throw new Error("Canvas requires an explicit workspace transport");
  if (options2.media?.readImage !== void 0 && typeof options2.media?.readImage !== "function")
    throw new Error("Canvas images require an explicit workspace reader");
  if (options2.media?.importImage !== void 0 && typeof options2.media?.importImage !== "function")
    throw new Error("Canvas image import requires an explicit workspace importer");
  if (options2.revealResourceImage !== void 0 && typeof options2.revealResourceImage !== "function")
    throw new Error("Resource image reveal requires an explicit workspace revealer");
  if (options2.chat !== void 0 && (typeof options2.chat.draft !== "function" || typeof options2.chat.send !== "function"))
    throw new Error("Chat requires an explicit workspace composer");
  if (options2.chatSession !== void 0 && (!options2.chatSession || typeof options2.chatSession.snapshot !== "function" || typeof options2.chatSession.subscribe !== "function" || typeof options2.chatSession.execute !== "function"))
    throw new Error("Chat session requires an explicit workspace projection and actions");
  if (options2.textCompletion !== void 0 && typeof options2.textCompletion.complete !== "function")
    throw new Error("Text completion requires an explicit workspace completion");
  if (options2.pageStorage !== void 0 && (typeof options2.pageStorage.acquire !== "function" || typeof options2.pageStorage.read !== "function" || typeof options2.pageStorage.write !== "function"))
    throw new Error("Page storage requires an explicit host-scoped store");
  if (options2.sidebarOrder !== void 0 && (typeof options2.sidebarOrder?.reconcile !== "function" || typeof options2.sidebarOrder?.move !== "function"))
    throw new Error("Sidebar order requires explicit workspace operations");
  if (options2.generationSubject !== void 0 && !isHostGenerationSubject(options2.generationSubject))
    throw new Error("Generation subject must be host-derived and bounded");
  if (options2.billing?.guardSubmission !== void 0 && typeof options2.billing?.guardSubmission !== "function")
    throw new Error("Submission guard requires an explicit host account check");
  if (options2.billing?.readPricing !== void 0 && typeof options2.billing?.readPricing !== "function")
    throw new Error("Billing pricing requires an explicit read-only host reader");
  if (options2.documentRequest !== void 0 && typeof options2.documentRequest !== "function")
    throw new Error("Documents require an explicit host-scoped transport");
  if (options2.resourceTagRequest !== void 0 && typeof options2.resourceTagRequest !== "function")
    throw new Error("Resource tags require an explicit host-scoped transport");
  if (options2.readCanvasPoster !== void 0 && typeof options2.readCanvasPoster !== "function")
    throw new Error("Canvas posters require an explicit host reader");
  if (options2.media?.readAudioWaveform !== void 0 && typeof options2.media?.readAudioWaveform !== "function")
    throw new Error("Audio waveforms require an explicit host reader");
  if (options2.importCanvasMedia !== void 0 && typeof options2.importCanvasMedia !== "function")
    throw new Error("Canvas media import requires an explicit host importer");
  if (options2.textGeneration !== void 0 && (typeof options2.textGeneration?.models !== "function" || typeof options2.textGeneration.generate !== "function"))
    throw new Error("Text generation requires explicit host operations");
  if (options2.nativeFiles !== void 0 && ["saveFiles", "saveMedia", "revealImage", "writeImageData"].some(
    (key2) => typeof options2.nativeFiles?.[key2] !== "function"
  ))
    throw new Error("Native files require explicit host operations");
  if (options2.preferences !== void 0 && (typeof options2.preferences?.get !== "function" || typeof options2.preferences.set !== "function"))
    throw new Error("Preferences require an explicit host store");
  if (options2.importLut !== void 0 && typeof options2.importLut !== "function")
    throw new Error("LUT import requires an explicit host importer");
  if (options2.deleteLut !== void 0 && typeof options2.deleteLut !== "function")
    throw new Error("LUT delete requires an explicit host operation");
  if (options2.toolReadRequest !== void 0 && typeof options2.toolReadRequest !== "function")
    throw new Error("Tool reads require an explicit host-scoped transport");
}

// ---- 第 167 轮：真实现（参考 400326）----
const workbenchQueryKeys = {
  all: (scopeKey) => ["project-v3", scopeKey],
  matches: (key2, scopeKey) => key2[0] === "project-v3" && key2[1] === scopeKey
};

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
  taskRecoveryWorkspaceId,
  workspaceEvents,
};
