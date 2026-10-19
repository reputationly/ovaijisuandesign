/**
 * 设施层闭包（第 173 轮：按 closure-manifest 逐项取回，按 bundle 偏移排序）。
 *
 * 边界：scripts/v3preload/closure-manifest.json（入库，只减不增）。
 * 顺序 = bundle 求值顺序 → 不会产生 TDZ。
 * 切片按 AST 的 start/end 逐项拼接，不取「最小到最大」连续块，
 * 否则会把中间已还原项的函数体带进来（第 173 轮踩过一次）。
 */
import { GatewayNotReadyError } from "./../assets/record-gateway-trace-id.jsx";
import { parseCompositionReceipt, parseProjectQueryErrorBody, parseTaskServerMessage, projectGenerationKindOfResource, projectGenerationOperation } from "./../canvas-v3/canvas-v3-model.js";
import { CHAT_SESSION_RESOURCE_LIMIT, MAX_IDENTITIES$1, REQUEST_LIMIT, SidebarOrderError, createCanvasImageImporter, isBounded, isChatSessionCommand, isChatSessionResource, isParent, isRecord$d, isSidebarOrderGroups, isSidebarOrderMove, isSidebarOrderState, only$1, parseEditorFocus, sidebarOrderParentKey } from "./../canvas-v3/frame-services.js";
import { API_PATHS, WorkspaceCanvasPersistenceChangedError, createCanvasImageReader, guardAccountSubmission, modelCapabilityId, parseModelCapabilityId, resourceQueryKeys, toolCapability, workspaceEvents } from "./../canvas-v3/main-exports.js";
import { ProjectCompositionHttpError, ProjectTaskError, compositionQueryKeys, taskQueryKeys } from "./../canvas-v3/ui-components.js";
import { StructureValidationError, assertStructureId, immutableSnapshot } from "./../chat/display-order.jsx";
import { getElectronPlatform } from "./../infra/use-canvas-node-assets-store.js";
import { entriesByWorkspace } from "./../settings/entries-by-workspace.jsx";
import { bindStructurePersistence, createCanvasDuplication, createCanvasInsertion, createElectronHost, createHostWorkbench, createNativeWorkbenchPreferences, createResourceAudioWaveformReader, createTaskDecisionStore, createTaskIntentPersistence, createTreeHostBindings } from "./workspace-facilities.js";
import { isReadOnlyStructureRequest } from "./workspace-structure-runtime.js";

// 第 174 轮：6 个找不到归属的，就地补（fractional-indexing 两个来自 npm）
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

class WorkspaceCanvasPersistenceUnavailableError extends Error {
  constructor(message = "Canvas persistence is unavailable") {
    super(message);
    this.name = "WorkspaceCanvasPersistenceUnavailableError";
  }
}
const classify = (v) => (v == null ? "unknown" : typeof v);
const identifier = (v) => String(v ?? "");
const publishPersistenceStatus = (entry) => {
  if (!entry?.reportStatus) return;
  entry.reportVersion = (entry.reportVersion ?? 0) + 1;
  void entry.reportStatus(entry.status)?.catch?.(() => {});
};

import reactExports from "react";
import jsxRuntimeExports from "react/jsx-runtime";
import { useTranslation } from "react-i18next";

class WorkbenchCapabilityUnavailableError extends Error {
  constructor(capability) {
    super(`Workbench capability "${capability}" has not been bound`);
    this.capability = capability;
    this.name = "WorkbenchCapabilityUnavailableError";
  }
  capability;
  code = "WORKBENCH_CAPABILITY_UNAVAILABLE";
}

function isSidebarOrderParents(value) {
  return Array.isArray(value) && value.length <= MAX_IDENTITIES$1 && value.every(
    (parent) => isRecord$d(parent) && isParent(parent) && only$1(parent, ["kind", "parentId"])
  ) && isBounded(value, REQUEST_LIMIT);
}

class ContextResolutionError extends Error {
  constructor(index2, reason2) {
    super(`Context resource ${index2}: ${reason2}`);
    this.index = index2;
    this.reason = reason2;
    this.name = "ContextResolutionError";
  }
  index;
  reason;
  code = "WORKBENCH_CONTEXT_UNAVAILABLE";
}

async function resolvePinnedResources(resources, selectors2) {
  const selected2 = structuredClone([...selectors2]);
  const results = await resources.getResources(selected2);
  if (results.length !== selected2.length)
    throw new ContextResolutionError(-1, "result count mismatch");
  return results.map((result, index2) => {
    if (!result.ok) throw new ContextResolutionError(index2, result.error.code);
    const { resource: resource2, version: version2 } = result.detail;
    if (!version2) throw new ContextResolutionError(index2, "resource has no committed version");
    if (resource2.resourceId !== selected2[index2].resourceId || selected2[index2].versionId && selected2[index2].versionId !== version2.versionId)
      throw new ContextResolutionError(index2, "selected reference mismatch");
    return { resourceId: resource2.resourceId, versionId: version2.versionId };
  });
}

function exactFields(value, fields2) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid stored Task placement");
  if (Object.keys(value).some((key2) => !fields2.includes(key2)))
    throw new Error("Unexpected stored Task placement field");
  return value;
}

function role(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 256)
    throw new Error("Invalid stored Task placement role");
  return value;
}

function parsePlacementTarget(raw2) {
  const target = exactFields(raw2, ["compositionId", "placements"]);
  const placements = target.placements;
  if (!Array.isArray(placements) || !placements.length || placements.length > 50)
    throw new Error("Invalid stored Task placements");
  const parsed = placements.map((item) => {
    const placement2 = exactFields(item, ["key", "role", "memberId", "replaceResourceId"]);
    const key2 = identifier(placement2.key);
    if (placement2.memberId === void 0) {
      exactFields(placement2, ["key", "role"]);
      return { key: key2, role: role(placement2.role) };
    }
    exactFields(placement2, ["key", "memberId", "replaceResourceId"]);
    return {
      key: key2,
      memberId: identifier(placement2.memberId),
      ...placement2.replaceResourceId === void 0 ? {} : { replaceResourceId: identifier(placement2.replaceResourceId) }
    };
  });
  if (new Set(parsed.map((item) => item.key)).size !== parsed.length)
    throw new Error("Duplicate stored Task placement key");
  return { compositionId: identifier(target.compositionId), placements: parsed };
}

function decisionPayload(input) {
  switch (input.action) {
    case "confirm_cost":
      return JSON.stringify([input.quoteId]);
    case "finish_as_candidate":
    case "finish_without_placement":
      return JSON.stringify([input.key]);
    case "adopt_version":
      return JSON.stringify([input.key, input.expectedCurrentVersionId]);
    case "update_placement": {
      const { composition: composition2 } = input;
      return JSON.stringify([
        composition2.compositionId ?? composition2.name,
        composition2.placements.map((item) => [
          item.key,
          item.role ?? null,
          item.memberId ?? null,
          item.replaceResourceId ?? null
        ])
      ]);
    }
    default:
      return "";
  }
}

function createTaskSubscription(client, options2) {
  if (!options2.scopeKey.trim()) throw new Error("Task subscription requires a scope");
  const scopeKey = options2.scopeKey;
  const ids2 = options2.taskIds === void 0 ? void 0 : [...new Set(options2.taskIds)];
  if (ids2 && (ids2.length > 100 || ids2.some((id2) => !id2.trim() || id2.length > 512)))
    throw new Error("Task subscription accepts at most 100 nonempty task IDs");
  const revisions = /* @__PURE__ */ new Map();
  let connection;
  let disposed = false;
  function report(error) {
    try {
      options2.onError(error);
    } catch {
    }
  }
  function accept(task2) {
    if (disposed || ids2 && !ids2.includes(task2.id) || task2.revision <= (revisions.get(task2.id) ?? 0))
      return;
    revisions.set(task2.id, task2.revision);
    try {
      options2.onTask(task2);
    } catch (error) {
      report(error);
    }
  }
  async function refresh2() {
    const current2 = connection;
    if (!current2?.ready || disposed) return;
    const active2 = () => !disposed && connection === current2 && !current2.controller.signal.aborted;
    try {
      const requestOptions = { signal: current2.controller.signal };
      if (ids2) {
        await Promise.all(
          ids2.map(async (id2) => {
            try {
              const result = await client.get(id2, requestOptions);
              if (active2()) accept(result.task);
            } catch (error) {
              if (active2()) report(error);
            }
          })
        );
      } else {
        let cursor;
        const cursors = /* @__PURE__ */ new Set();
        do {
          const page2 = await client.list(
            { limit: 50, ...cursor ? { cursor } : {} },
            requestOptions
          );
          if (!active2()) return;
          for (const task2 of page2.items) accept(task2);
          if (page2.nextCursor && cursors.has(page2.nextCursor))
            throw new Error("Repeated Task cursor");
          cursor = page2.nextCursor ?? void 0;
          if (cursor) cursors.add(cursor);
        } while (cursor && active2());
      }
    } catch (error) {
      if (active2()) report(error);
    }
  }
  function disconnect() {
    const previous2 = connection;
    connection = void 0;
    if (!previous2) return;
    previous2.controller.abort();
    try {
      previous2.send({ type: "task_unsubscribe", subscriptionId: previous2.id });
    } catch (error) {
      if (!disposed) report(error);
    }
  }
  return {
    /** Call for every new live connection. Old snapshots and events can no longer publish. */
    connect(incomingScope, send2) {
      if (disposed) throw new Error("Task subscription is disposed");
      if (incomingScope !== scopeKey) throw new Error("Task subscription scope mismatch");
      disconnect();
      const subscriptionId = `task-${crypto.randomUUID()}`;
      connection = { id: subscriptionId, send: send2, controller: new AbortController(), ready: false };
      try {
        send2({ type: "task_subscribe", subscriptionId, ...ids2 ? { taskIds: [...ids2] } : {} });
      } catch (error) {
        disconnect();
        throw error;
      }
      return subscriptionId;
    },
    /** Feed only messages from the same scoped host; unrelated socket messages are ignored. */
    receive(incomingScope, value) {
      const current2 = connection;
      if (disposed || !current2 || incomingScope !== scopeKey || !value || typeof value !== "object" || !("subscriptionId" in value) || value.subscriptionId !== current2.id)
        return;
      try {
        const event = parseTaskServerMessage(value);
        switch (event.type) {
          case "task_changed":
            accept(event.task);
            break;
          case "task_subscription_ready":
            if (!current2.ready) {
              current2.ready = true;
              void refresh2();
            }
            break;
          case "task_subscription_closed":
            connection = void 0;
            current2.controller.abort();
            report(new ProjectTaskError(0, "SUBSCRIPTION_CLOSED", "Task subscription closed"));
            break;
          case "task_subscription_error":
            connection = void 0;
            current2.controller.abort();
            report(
              new ProjectTaskError(
                0,
                event.error.code,
                event.error.message,
                event.error.retryable,
                false,
                void 0,
                event.error
              )
            );
            break;
        }
      } catch (error) {
        report(error);
      }
    },
    refresh: refresh2,
    disconnect,
    dispose() {
      disposed = true;
      disconnect();
      revisions.clear();
    }
  };
}

function createTaskModule(client, scopeKey, assertActive, onTask) {
  let disposed = false;
  const subscriptions = /* @__PURE__ */ new Set();
  const active2 = () => {
    assertActive();
    if (disposed) throw new Error("Task module is disposed");
  };
  const requireAdapter = () => {
    active2();
    if (!client) throw new WorkbenchCapabilityUnavailableError("execution");
    return client;
  };
  function notify2(task2) {
    try {
      onTask(task2);
    } catch {
    }
  }
  async function run2(execute, tasks) {
    try {
      const result = await execute(requireAdapter());
      active2();
      for (const task2 of tasks(result)) notify2(task2);
      return result;
    } catch (error) {
      active2();
      if (error instanceof ProjectTaskError && error.task) notify2(error.task);
      throw error;
    }
  }
  return {
    available: !!client,
    status: Object.freeze({ id: "execution", state: client ? "available" : "adapter-required" }),
    requireAdapter,
    submit: (input, options2) => run2(
      (c3) => c3.submit(input, options2),
      (r2) => [r2.task]
    ),
    get: (id2, options2) => run2(
      (c3) => c3.get(id2, options2),
      () => []
    ),
    lookup: (operation2, requestId, options2) => run2(
      (c3) => c3.lookup(operation2, requestId, options2),
      () => []
    ),
    list: (query, options2) => run2(
      (c3) => c3.list(query, options2),
      () => []
    ),
    queue: (options2) => run2(
      (c3) => c3.queue(options2),
      () => []
    ),
    resolve: (id2, input, options2) => run2(
      (c3) => c3.resolve(id2, input, options2),
      (r2) => [r2.task]
    ),
    subscribe(options2) {
      const subscription = createTaskSubscription(requireAdapter(), {
        ...options2,
        scopeKey,
        onTask(task2) {
          active2();
          notify2(task2);
          options2.onTask(task2);
        }
      });
      const dispose = subscription.dispose;
      subscription.dispose = () => {
        dispose();
        subscriptions.delete(subscription);
      };
      subscriptions.add(subscription);
      return subscription;
    },
    dispose() {
      disposed = true;
      for (const subscription of subscriptions) subscription.dispose();
      subscriptions.clear();
    }
  };
}

async function synchronizeWorkspacePersistenceReportsOnce() {
  const workspaces2 = new Map(entriesByWorkspace);
  const snapshots2 = [...workspaces2].flatMap(
    ([workspaceId, entries2]) => [...entries2].map(([key2, entry]) => ({ workspaceId, entries: entries2, key: key2, entry }))
  );
  await Promise.all(
    snapshots2.map(async ({ entry }) => {
      if (!entry.controller) return;
      try {
        await entry.controller.flushAndWaitLatest();
        entry.status = entry.controller.getStatus();
      } catch {
        if (entry.status === "clean") entry.status = "failed";
      }
      publishPersistenceStatus(entry);
    })
  );
  const reports = snapshots2.map((source) => ({ ...source, version: source.entry.reportVersion }));
  await Promise.all(
    reports.map(async ({ entry }) => {
      if (!entry.reportPromise) throw new WorkspaceCanvasPersistenceUnavailableError();
      await entry.reportPromise;
    })
  );
  for (const { workspaceId, entries: entries2, key: key2, entry, version: version2 } of reports) {
    if (entriesByWorkspace.get(workspaceId) !== entries2 || entries2.get(key2) !== entry || version2 !== entry.reportVersion)
      throw new WorkspaceCanvasPersistenceChangedError();
  }
  if (workspaces2.size !== entriesByWorkspace.size || snapshots2.length !== [...entriesByWorkspace.values()].reduce((count2, entries2) => count2 + entries2.size, 0))
    throw new WorkspaceCanvasPersistenceChangedError();
}

async function synchronizeWorkspacePersistenceReports() {
  try {
    await synchronizeWorkspacePersistenceReportsOnce();
  } catch (error) {
    if (!(error instanceof WorkspaceCanvasPersistenceChangedError)) throw error;
    await synchronizeWorkspacePersistenceReportsOnce();
  }
}

function notifyStructureObserver(notify2, onError) {
  function report(error) {
    try {
      const reporting = onError?.(error);
      if (reporting) void reporting.catch(() => {
      });
    } catch {
    }
  }
  try {
    const notification = notify2();
    if (notification) void notification.catch(report);
  } catch (error) {
    report(error);
  }
}

function fingerprint$1(value) {
  return JSON.stringify(value, (_key, item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    return Object.fromEntries(Object.entries(item).sort(([a2], [b3]) => a2.localeCompare(b3)));
  });
}

const receiptCheckedRejectionCodes = /* @__PURE__ */ new Set([
  "PROJECT_COMMAND_ID_REUSED",
  "PROJECT_INVALID_LIFECYCLE",
  "PROJECT_COMPOSITION_NOT_FOUND",
  "PROJECT_COMPOSITION_ALREADY_EXISTS",
  "PROJECT_COMPOSITION_TYPE_NOT_FOUND",
  "PROJECT_COMPOSITION_TYPE_ALREADY_EXISTS",
  "PROJECT_COMPOSITION_MEMBER_NOT_FOUND",
  "PROJECT_COMPOSITION_MEMBER_ALREADY_EXISTS",
  "COMPOSITION_NAME_CONFLICT",
  "COMPOSITION_POSITION_CONFLICT",
  "COMPOSITION_PLACEMENT_INVALID",
  "COMPOSITION_POSITION_EXHAUSTED"
]);

const rejectedCodes = /* @__PURE__ */ new Set([
  ...receiptCheckedRejectionCodes,
  "PROJECT_INVALID_COMMAND",
  "PROJECT_INVALID_REQUEST",
  "PROJECT_INVALID_PATH",
  "PROJECT_WORKSPACE_SCOPE_MISMATCH",
  "PROJECT_RESOURCE_NOT_FOUND"
]);

function isKnownRejection(error, recoveringUnknown) {
  if (!(error instanceof ProjectCompositionHttpError)) return false;
  if (recoveringUnknown) {
    return [400, 404, 409, 422].includes(error.status) && receiptCheckedRejectionCodes.has(error.code);
  }
  if (error.status === 401 || error.status === 403) return true;
  return [400, 404, 409, 422].includes(error.status) && rejectedCodes.has(error.code);
}

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

class ProjectQueryError extends Error {
  constructor(status, code2, message2, retryable = false, traceId, details) {
    super(message2);
    this.status = status;
    this.code = code2;
    this.traceId = traceId;
    this.details = details;
    this.name = code2 === "ABORTED" ? "AbortError" : "ProjectQueryError";
    this.kind = classify(status, code2);
    this.retryable = retryable && (this.kind === "transient" || this.kind === "unavailable");
  }
  status;
  code;
  traceId;
  details;
  kind;
  retryable;
  static async fromResponse(response) {
    try {
      const { error } = parseProjectQueryErrorBody(await response.json());
      return new ProjectQueryError(
        response.status,
        error.code,
        error.message,
        error.retryable,
        error.traceId,
        error.details
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      return new ProjectQueryError(
        response.status,
        "PROJECT_QUERY_HTTP_ERROR",
        `Project Query request failed (${response.status})`,
        response.status === 408 || response.status === 429 || response.status >= 500
      );
    }
  }
}

function aborted() {
  return new ProjectQueryError(0, "ABORTED", "Project Query request aborted");
}

function createProjectQueryModule(service2, assertActive) {
  async function query(operation2, input, options2) {
    assertActive();
    if (!service2) throw new WorkbenchCapabilityUnavailableError("query");
    const result = await service2.query(operation2, input, options2);
    assertActive();
    return result;
  }
  return { available: service2 !== void 0, query };
}

function createResourceCommands(service2, assertActive, onCommitted) {
  return {
    async execute(envelope) {
      assertActive();
      const snapshot2 = structuredClone(envelope);
      const receipt = await service2.execute(snapshot2);
      onReceipt(receipt.committed, snapshot2.command.resourceId, snapshot2.commandId);
      return receipt;
    }
  };
  function onReceipt(committed, resourceId2, commandId) {
    if (committed) onCommitted(resourceId2, commandId);
  }
}

class ResourceGenerationHistoryUnavailableError extends Error {
  constructor() {
    super("Generation history is unavailable for this version");
    this.name = "ResourceGenerationHistoryUnavailableError";
  }
}

function createIntentRunner() {
  const intents = /* @__PURE__ */ new Map();
  return (key2, submit) => {
    const intent = intents.get(key2) ?? { id: crypto.randomUUID(), pending: void 0 };
    intents.set(key2, intent);
    if (intent.pending) return intent.pending;
    intent.pending = Promise.resolve().then(() => submit(intent.id)).then((result) => {
      intents.delete(key2);
      return result;
    }).finally(() => {
      intent.pending = void 0;
    });
    return intent.pending;
  };
}

function versionOutput(source) {
  return {
    resources: [
      {
        key: "primary",
        mode: "new_version",
        resourceId: source.resourceId,
        baseVersionId: source.versionId,
        disposition: "candidate"
      }
    ]
  };
}

function hasBlankPromptHistory(capabilityId) {
  return capabilityId === "generate_image:redraw" || capabilityId === "generate_image:super_resolution";
}

function createResourceDetailModule({
  execution,
  resources,
  importCanvasImage
}) {
  const runTask = createIntentRunner();
  const runImport = createIntentRunner();
  const submit = (input) => {
    const request = structuredClone(input);
    return runTask(
      JSON.stringify(request),
      async (requestId) => (await execution.submit({ ...request, requestId })).task
    );
  };
  return {
    async history(target, taskId, options2) {
      const source = { ...target };
      const [output2] = await resources.getResources([source], options2);
      if (!output2?.ok || output2.detail.resource.resourceId !== source.resourceId || output2.detail.version?.versionId !== source.versionId)
        throw new Error("RESOURCE_TASK_OUTPUT_MISMATCH");
      if (output2.detail.version.source === "import" || hasBlankPromptHistory(output2.detail.metadata?.generationInput?.capabilityId))
        return void 0;
      const matches2 = (task2) => task2.outputs.some(
        (output22) => output22.resourceId === source.resourceId && output22.versionId === source.versionId
      );
      const matchedTask = taskId ? void 0 : (await execution.list({ versionId: source.versionId, limit: 20 }, options2)).items.find(
        matches2
      );
      if (hasBlankPromptHistory(matchedTask?.capabilityId)) return void 0;
      const id2 = taskId ?? matchedTask?.id;
      if (!id2) {
        if (output2.detail.version.source === "generate")
          throw new ResourceGenerationHistoryUnavailableError();
        return void 0;
      }
      const detail2 = await execution.get(id2, options2);
      if (detail2.task.id !== id2 || !matches2(detail2.task))
        throw new Error("RESOURCE_TASK_OUTPUT_MISMATCH");
      if (hasBlankPromptHistory(detail2.task.capabilityId)) return void 0;
      const slots = detail2.input.references ?? [];
      const selectors2 = slots.filter((slot) => slot !== null).map(({ versionId }) => {
        const dependency = output2.detail.dependencies.find(
          (item) => item.versionId === versionId
        );
        if (!dependency) throw new Error("RESOURCE_TASK_REFERENCE_MISSING");
        return { resourceId: dependency.resourceId, versionId };
      });
      const inputs = selectors2.length ? await resources.getResources(selectors2, options2) : [];
      const references = selectors2.map((selector2, index2) => {
        const input = inputs[index2];
        if (!input?.ok || input.detail.resource.resourceId !== selector2.resourceId || input.detail.version?.versionId !== selector2.versionId)
          throw new Error("RESOURCE_TASK_REFERENCE_MISSING");
        return { ...selector2, name: input.detail.resource.name, kind: input.detail.resource.kind };
      });
      const capabilityId = detail2.task.capabilityId;
      return {
        taskId: id2,
        capabilityId,
        ...toolCapability(capabilityId) ? {} : { modelId: parseModelCapabilityId(capabilityId).modelId },
        prompt: detail2.input.prompt ?? "",
        params: Object.fromEntries(
          Object.entries(detail2.input.params ?? {}).flatMap(
            ([key2, value]) => ["string", "number", "boolean"].includes(typeof value) ? [[key2, String(value)]] : []
          )
        ),
        references,
        ...slots[0] === null && references.length === 1 ? { lastFrameOnly: true } : {}
      };
    },
    generate(input) {
      const kind2 = projectGenerationKindOfResource(input.kind);
      if (!kind2) throw new Error("RESOURCE_GENERATION_KIND_UNSUPPORTED");
      return submit({
        capabilityId: modelCapabilityId(projectGenerationOperation(kind2), input.modelId),
        prompt: input.prompt,
        params: input.params,
        references: (input.references ?? []).map((versionId) => versionId ? { versionId } : null),
        output: versionOutput({ resourceId: input.resourceId, versionId: input.baseVersionId })
      });
    },
    enhance(source, params) {
      return submit({
        capabilityId: "generate_image:super_resolution",
        params,
        references: [{ versionId: source.versionId }],
        output: versionOutput(source)
      });
    },
    redraw(source, input) {
      return submit({
        capabilityId: "generate_image:redraw",
        prompt: input.prompt,
        params: {
          resolution: input.resolution,
          ...input.aspectRatio === void 0 ? {} : { aspectRatio: input.aspectRatio }
        },
        references: [
          { versionId: source.versionId },
          ...input.references.map(({ versionId }) => ({ versionId }))
        ],
        output: versionOutput(source)
      });
    },
    async crop(source, file) {
      const target = { resourceId: source.resourceId, baseVersionId: source.versionId };
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const hash2 = Array.from(new Uint8Array(digest), (n2) => n2.toString(16).padStart(2, "0")).join(
        ""
      );
      return runImport(JSON.stringify(["crop", target, hash2]), async (importId) => {
        if (!importCanvasImage) throw new Error("Image import unavailable");
        await importCanvasImage({ importId, name: "crop.png", file, target });
      });
    }
  };
}

const queues = /* @__PURE__ */ new WeakMap();

const MAX_RANK_LENGTH = 64;

function migrateLegacyMemberRanks(state2, groups) {
  const legacy = state2.parents[sidebarOrderParentKey({ kind: "member", parentId: "__unsorted__" })];
  if (!legacy) return state2;
  const parents = new Map(
    groups.filter(
      (group) => group.kind === "member" && group.parentId !== "__unsorted__" && !state2.parents[sidebarOrderParentKey(group)]
    ).map((group) => [group.parentId, sidebarOrderParentKey(group)])
  );
  if (parents.size === 0) return state2;
  const migrated = {};
  for (const [id2, rank] of Object.entries(legacy)) {
    let identity2;
    try {
      identity2 = JSON.parse(id2);
    } catch {
      continue;
    }
    if (!Array.isArray(identity2) || identity2.length !== 2 || typeof identity2[0] !== "string" || typeof identity2[1] !== "string")
      continue;
    const parentKey = parents.get(identity2[0]);
    if (parentKey) {
      migrated[parentKey] ??= {};
      migrated[parentKey][identity2[1]] = rank;
    }
  }
  return Object.keys(migrated).length > 0 ? { parents: { ...state2.parents, ...migrated } } : state2;
}

function compareRank$1(a2, b3) {
  return a2 < b3 ? -1 : a2 > b3 ? 1 : 0;
}

function reconcileParent(saved, nodeIds) {
  const ranks = saved ?? {};
  const added = nodeIds.filter((id2) => !Object.hasOwn(ranks, id2));
  const first2 = Object.values(ranks).sort(compareRank$1)[0] ?? null;
  const keys2 = generateNKeysBetween(null, first2, added.length);
  return Object.fromEntries([
    ...Object.entries(ranks),
    ...added.map((id2, index2) => [id2, keys2[index2]])
  ]);
}

function boundedRanks(ranks) {
  if (Object.values(ranks).every((rank) => rank.length <= MAX_RANK_LENGTH)) return ranks;
  const ids2 = Object.keys(ranks).sort((a2, b3) => compareRank$1(ranks[a2], ranks[b3]));
  const keys2 = generateNKeysBetween(null, null, ids2.length);
  return Object.fromEntries(ids2.map((id2, index2) => [id2, keys2[index2]]));
}

function sameRanks(a2, b3) {
  return !!a2 && Object.keys(a2).length === Object.keys(b3).length && Object.entries(b3).every(([id2, rank]) => a2[id2] === rank);
}

function readState(value) {
  if (value === void 0) return { parents: {} };
  if (!isSidebarOrderState(value)) throw new Error("Invalid sidebar order storage");
  for (const ranks of Object.values(value.parents)) {
    const keys2 = Object.values(ranks);
    if (new Set(keys2).size !== keys2.length) throw new Error("Duplicate sidebar order ranks");
    for (const rank of keys2) generateKeyBetween(rank, null);
  }
  return value;
}

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

let ready;

const SUBJECT_LIMIT = 256;

function isHostGenerationSubject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const subject = value;
  const valid2 = (item) => typeof item === "string" && !!item.trim() && item.length <= SUBJECT_LIMIT && !Array.from(item).some((c3) => c3.charCodeAt(0) < 32 || c3.charCodeAt(0) === 127);
  return valid2(subject.subjectId) && valid2(subject.generationFence) && Object.keys(subject).every((key2) => ["subjectId", "generationFence"].includes(key2));
}

const PRE_DISPATCH_REJECTIONS = /* @__PURE__ */ new Set([
  "CHAT_SESSION_SEND_BLOCKED",
  "CHAT_SESSION_CHANGED",
  "CHAT_SESSION_PRIVATE",
  "CHAT_SESSION_SWITCHING",
  "CHAT_SESSION_RESOURCES_UNAVAILABLE"
]);

function createChatSessionState(host, persistence) {
  let state2 = Object.freeze({
    loading: true,
    sending: false,
    pendingSend: false,
    draftPending: false,
    draft: "",
    draftResources: []
  });
  const listeners2 = /* @__PURE__ */ new Set();
  const drafts = /* @__PURE__ */ new Map();
  let disposed = false;
  let editorFocus;
  let pending2;
  let draftQueue = Promise.resolve();
  let operation2;
  let refreshVersion = 0;
  const publish2 = (next2 = {}) => {
    if (disposed) return;
    const dirty = [...drafts.values()].filter((draft) => draft.dirty);
    state2 = Object.freeze({ ...state2, ...next2, draftPending: dirty.length > 0 });
    guard.update(
      state2.error && pending2 || dirty.some((draft) => draft.error) ? "failed" : pending2 || dirty.length || state2.sending ? "saving" : "clean"
    );
    for (const listener of listeners2) listener();
  };
  const guard = persistence.createEntry({ recover: () => replay() });
  function assertLive() {
    if (disposed) throw new Error("CHAT_SESSION_RETIRED");
  }
  const accept = (snapshot2) => {
    if (disposed || state2.snapshot && snapshot2.revision < state2.snapshot.revision) return;
    const draft = drafts.get(snapshot2.sessionId);
    publish2({
      snapshot: snapshot2,
      loading: false,
      draft: draft?.dirty ? draft.text : snapshot2.draft,
      draftResources: draft?.dirty ? draft.resources ?? [] : snapshot2.draftResources ?? [],
      ...pending2 ? {} : { error: draft?.dirty ? draft.error : void 0 }
    });
  };
  let stop = () => {
  };
  try {
    stop = host.subscribe(accept);
  } catch (error) {
    publish2({ loading: false, error });
  }
  async function refresh2() {
    const version2 = ++refreshVersion;
    try {
      const snapshot2 = await host.snapshot();
      if (!disposed && version2 === refreshVersion) {
        accept(snapshot2);
        if (!pending2 && !state2.draftPending) publish2({ error: void 0 });
      }
    } catch (error) {
      if (!disposed && version2 === refreshVersion) publish2({ loading: false, error });
    }
  }
  void refresh2();
  function writeDraft(draft) {
    const write = draftQueue.then(async () => {
      assertLive();
      await host.execute({
        kind: "draft",
        sessionId: draft.sessionId,
        text: draft.text,
        ...draft.resources ? {
          resources: draft.resources.map(({ resourceId: resourceId2, versionId }) => ({
            resourceId: resourceId2,
            versionId
          }))
        } : {}
      });
      assertLive();
      if (drafts.get(draft.sessionId) === draft) {
        draft.dirty = false;
        draft.error = void 0;
      }
      const current2 = drafts.get(state2.snapshot?.sessionId ?? null);
      publish2({ error: current2?.dirty ? current2.error : void 0 });
    }).catch((error) => {
      draft.error = error;
      if (drafts.get(draft.sessionId) === draft)
        publish2(state2.snapshot?.sessionId === draft.sessionId ? { error } : {});
      throw error;
    });
    draftQueue = write.catch(() => {
    });
    return write;
  }
  function replay() {
    if (disposed) return Promise.reject(new Error("CHAT_SESSION_RETIRED"));
    if (operation2) return operation2;
    if (!pending2) {
      const draft = drafts.get(state2.snapshot?.sessionId ?? null);
      if (!draft?.dirty) return refresh2();
      publish2({ error: void 0 });
      return writeDraft(draft);
    }
    const command2 = pending2;
    const recoveringUnknown = state2.pendingSend;
    let dispatched = false;
    publish2({ sending: true, error: void 0 });
    operation2 = Promise.resolve().then(async () => {
      await draftQueue;
      assertLive();
      const draft = drafts.get(command2.sessionId);
      if (draft?.dirty) throw draft.error ?? new Error("CHAT_DRAFT_UNCONFIRMED");
      dispatched = true;
      publish2({ pendingSend: true });
      await host.execute(command2);
      assertLive();
      pending2 = void 0;
      const currentSession = state2.snapshot?.sessionId === command2.sessionId;
      const submittedResources = command2.resources ?? [];
      const sameResources = state2.draftResources.length === submittedResources.length && state2.draftResources.every(
        (resource2, index2) => resource2.resourceId === submittedResources[index2]?.resourceId && resource2.versionId === submittedResources[index2]?.versionId
      );
      publish2({
        pendingSend: false,
        ...currentSession && state2.draft === command2.text ? { draft: "" } : {},
        ...currentSession && sameResources ? { draftResources: [] } : {},
        error: void 0
      });
      await refresh2();
    }).catch((error) => {
      if (!recoveringUnknown && (!dispatched || error instanceof Error && PRE_DISPATCH_REJECTIONS.has(error.message)))
        pending2 = void 0;
      publish2({ error, pendingSend: Boolean(pending2) });
      throw error;
    }).finally(() => {
      operation2 = void 0;
      publish2({ sending: false });
    });
    return operation2;
  }
  function setDraft(text2, resources) {
    assertLive();
    if (pending2) return;
    const sessionId = state2.snapshot?.sessionId ?? null;
    const projected = state2.snapshot?.projectionVersion === 2;
    const retained = Object.freeze(resources.map((resource2) => Object.freeze({ ...resource2 })));
    const draft = {
      sessionId,
      text: text2,
      dirty: true,
      ...projected ? { resources: retained } : {}
    };
    drafts.set(sessionId, draft);
    publish2({ draft: text2, draftResources: projected ? retained : [], error: void 0 });
    void writeDraft(draft).catch(() => {
    });
  }
  return {
    getSnapshot: () => state2,
    subscribe(listener) {
      listeners2.add(listener);
      return () => {
        listeners2.delete(listener);
      };
    },
    refresh: refresh2,
    replay,
    async openLink(url2) {
      assertLive();
      const command2 = { kind: "open-link", sessionId: state2.snapshot?.sessionId ?? null, url: url2 };
      if (state2.snapshot?.projectionVersion !== 2 || !isChatSessionCommand(command2))
        throw new Error("CHAT_LINK_UNAVAILABLE");
      await host.execute(command2);
      assertLive();
    },
    async annotationCommand(command2) {
      assertLive();
      const editing = state2.snapshot?.editing;
      if (!editing || state2.snapshot?.projectionVersion !== 2)
        throw new Error("CHAT_SESSION_EDITING_UNAVAILABLE");
      const request = {
        kind: "text-edit",
        event: { type: "command", ...editing.editor, command: command2 }
      };
      if (!isChatSessionCommand(request)) throw new Error("CHAT_SESSION_EDITING_REJECTED");
      await host.execute(request);
      assertLive();
    },
    setDraft(text2) {
      setDraft(text2, state2.draftResources);
    },
    setDraftResources(resources) {
      assertLive();
      if (state2.snapshot?.projectionVersion !== 2)
        throw new Error("CHAT_RESOURCE_DRAFT_UNAVAILABLE");
      if (resources.length > CHAT_SESSION_RESOURCE_LIMIT || resources.some((resource2) => !isChatSessionResource(resource2)) || new Set(
        resources.map(({ resourceId: resourceId2, versionId }) => JSON.stringify([resourceId2, versionId]))
      ).size !== resources.length)
        throw new Error("CHAT_RESOURCE_DRAFT_INVALID");
      setDraft(state2.draft, resources);
    },
    registerEditorFocus(read) {
      editorFocus = read;
      return () => {
        if (editorFocus === read) editorFocus = void 0;
      };
    },
    send(textOverride) {
      assertLive();
      if (pending2) return replay();
      const text2 = textOverride ?? state2.draft;
      const hasReferences = state2.snapshot?.projectionVersion === 2 && state2.draftResources.length > 0;
      if (!text2.trim() && !hasReferences || !state2.snapshot?.connected || state2.snapshot.busy)
        return Promise.reject(new Error("CHAT_SEND_UNAVAILABLE"));
      pending2 = {
        kind: "send",
        ...editorFocus ? { editorFocus: parseEditorFocus(structuredClone(editorFocus())) } : {},
        sessionId: state2.snapshot.sessionId,
        text: text2,
        requestId: crypto.randomUUID(),
        ...state2.snapshot.projectionVersion === 2 ? {
          resources: state2.draftResources.map(({ resourceId: resourceId2, versionId }) => ({
            resourceId: resourceId2,
            versionId
          }))
        } : {}
      };
      return replay();
    },
    async select(sessionId) {
      assertLive();
      if (pending2) throw new Error("CHAT_SEND_UNCONFIRMED");
      await draftQueue;
      assertLive();
      await host.execute(sessionId === null ? { kind: "new" } : { kind: "select", sessionId });
      await refresh2();
    },
    async stop() {
      assertLive();
      const sessionId = state2.snapshot?.sessionId;
      if (sessionId) await host.execute({ kind: "stop", sessionId });
      await refresh2();
    },
    dispose() {
      disposed = true;
      stop();
      listeners2.clear();
      if (!pending2 && ![...drafts.values()].some((draft) => draft.dirty)) guard.dispose();
    }
  };
}

const MAX_TRACKED_TASKS = 2048;

function createTaskInvalidationBridge(scopeKey, invalidate2) {
  const revisions = /* @__PURE__ */ new Map();
  let disposed = false;
  return {
    accept({ scopeKey: incomingScope, task: task2 }) {
      if (disposed || incomingScope !== scopeKey) return false;
      if (!task2.id.trim() || !Number.isSafeInteger(task2.revision) || task2.revision < 0) {
        throw new Error("Task invalidation requires a valid task identity and revision");
      }
      if (task2.revision <= (revisions.get(task2.id) ?? -1)) return false;
      const resourceIds = [...new Set(task2.outputs.map((output2) => output2.resourceId))];
      const compositionIds = [
        ...new Set(task2.placements.map((placement2) => placement2.compositionId))
      ];
      if ([...resourceIds, ...compositionIds].some((id2) => typeof id2 !== "string" || !id2.trim())) {
        throw new Error("Task invalidation requires valid output and placement identities");
      }
      revisions.delete(task2.id);
      revisions.set(task2.id, task2.revision);
      if (revisions.size > MAX_TRACKED_TASKS) {
        const oldest = revisions.keys().next().value;
        if (oldest !== void 0) revisions.delete(oldest);
      }
      invalidate2(resourceIds, compositionIds);
      return true;
    },
    dispose() {
      disposed = true;
      revisions.clear();
    }
  };
}

const initialInvalidationRevision = Object.freeze({
  resources: 0,
  compositions: 0,
  tasks: 0
});

function createWorkbenchEvents() {
  const target = new EventTarget();
  const cleanups = /* @__PURE__ */ new Set();
  const revisions = /* @__PURE__ */ new Map();
  let disposed = false;
  const source = {
    getInvalidationRevision(scopeKey) {
      return revisions.get(scopeKey) ?? initialInvalidationRevision;
    },
    subscribe(listener) {
      if (disposed) throw new Error("Workbench events are disposed");
      const handler = (event) => listener(event.detail);
      target.addEventListener("change", handler);
      const cleanup = () => {
        target.removeEventListener("change", handler);
        cleanups.delete(cleanup);
      };
      cleanups.add(cleanup);
      return cleanup;
    }
  };
  return {
    source,
    emit(event) {
      if (disposed) return;
      const previous2 = revisions.get(event.scopeKey) ?? initialInvalidationRevision;
      switch (event.type) {
        case "tasks-invalidated":
          revisions.set(
            event.scopeKey,
            Object.freeze({ ...previous2, tasks: (previous2.tasks ?? 0) + 1 })
          );
          break;
        case "resource-committed":
        case "resources-invalidated":
          revisions.set(
            event.scopeKey,
            Object.freeze({ ...previous2, resources: previous2.resources + 1 })
          );
          break;
        case "composition-committed":
        case "compositions-invalidated":
          revisions.set(
            event.scopeKey,
            Object.freeze({ ...previous2, compositions: previous2.compositions + 1 })
          );
          break;
      }
      target.dispatchEvent(new CustomEvent("change", { detail: event }));
    },
    dispose() {
      disposed = true;
      for (const cleanup of [...cleanups]) cleanup();
      revisions.clear();
    }
  };
}

const workspaces = /* @__PURE__ */ new Map();

function storage() {
  const bridge = getElectronPlatform()?.storage;
  if (!bridge) throw new Error("Workspace storage unavailable");
  return bridge;
}

function createWorkspaceStructureRuntime(identity2, queryClient2, initialRequest, hostBinding, reportPersistence) {
  let disposed = false;
  let ready2 = true;
  let readOnly2 = false;
  let connectionEpoch = 0;
  let currentRequest = initialRequest;
  let canvasImages = [];
  const canvasListeners = /* @__PURE__ */ new Set();
  const readinessListeners = /* @__PURE__ */ new Set();
  const requestAllowed = (path2, init2) => ready2 || readOnly2 && isReadOnlyStructureRequest(path2, init2);
  const request = async (path2, init2) => {
    if (disposed) throw new Error("Workspace Structure scope is no longer active");
    if (!requestAllowed(path2, init2)) {
      if (readOnly2) return new Response(null, { status: 403 });
      throw new GatewayNotReadyError();
    }
    const epoch = connectionEpoch;
    const response = await currentRequest(path2, init2);
    if (disposed) throw new Error("Workspace Structure scope changed during the request");
    if (epoch !== connectionEpoch || !requestAllowed(path2, init2))
      throw new Error("Workspace connection changed during the request");
    return response;
  };
  const scopeKey = JSON.stringify([
    "workspace-structure",
    identity2.workspaceId,
    identity2.instanceId,
    identity2.userId,
    identity2.accountKey
  ]);
  const treeBindings = hostBinding ? createTreeHostBindings({
    workspaceId: identity2.workspaceId,
    request,
    identity: hostBinding,
    assertLive() {
      if (disposed || !ready2) throw new Error("Workspace host unavailable");
    },
    locateCompositionInCanvas: (compositionId) => workspaceEvents.fireLocateCanvasComposition(identity2.workspaceId, compositionId),
    locateMemberInCanvas: ({ compositionId, memberId, resourceId: resourceId2 }) => workspaceEvents.fireLocateCanvasComposition(identity2.workspaceId, compositionId, {
      memberId,
      resourceId: resourceId2
    })
  }) : {};
  const duplication = createCanvasDuplication();
  const insertion = createCanvasInsertion();
  const workbench = createHostWorkbench(
    createElectronHost({
      scopeKey,
      readiness: {
        getSnapshot: () => !disposed && ready2,
        subscribe(listener) {
          readinessListeners.add(listener);
          return () => {
            readinessListeners.delete(listener);
          };
        }
      },
      ...treeBindings,
      preferences: createNativeWorkbenchPreferences(),
      resource: { request, ...treeBindings.resource },
      billing: {
        readPricing: (options2) => request(API_PATHS.billingPricing, { method: "GET", signal: options2?.signal }),
        guardSubmission: async (kind2) => !disposed && ready2 && guardAccountSubmission(kind2).allowed
      },
      canvas: {
        ...treeBindings.canvas,
        ...duplication.canvas,
        ...insertion.canvas,
        getImagesSnapshot: () => canvasImages,
        subscribeImages(listener) {
          canvasListeners.add(listener);
          return () => {
            canvasListeners.delete(listener);
          };
        },
        request
      },
      composition: { request, ...treeBindings.composition },
      canvasDuplication: duplication.canvasDuplication,
      canvasInsertion: insertion.canvasInsertion,
      query: { request },
      task: { request },
      media: {
        readImage: createCanvasImageReader(request),
        readAudioWaveform: createResourceAudioWaveformReader(request),
        importImage: createCanvasImageImporter(request)
      }
    })
  );
  const taskIntents = createTaskDecisionStore(
    createTaskIntentPersistence({
      workspaceId: identity2.workspaceId,
      userId: identity2.userId,
      accountKey: identity2.recoveryAccountKey
    })
  );
  const releasePersistence = reportPersistence ? bindStructurePersistence(
    workbench.persistence,
    identity2.workspaceId,
    identity2.instanceId,
    reportPersistence
  ) : void 0;
  return {
    identity: identity2,
    workbench,
    taskIntents,
    canvasImages: {
      getSnapshot: () => canvasImages,
      subscribe(listener) {
        canvasListeners.add(listener);
        return () => {
          canvasListeners.delete(listener);
        };
      },
      set(images) {
        if (disposed || images.length === canvasImages.length && images.every(
          (image2, index2) => image2.compositionId === canvasImages[index2].compositionId && image2.resourceId === canvasImages[index2].resourceId
        ))
          return;
        canvasImages = images;
        for (const listener of canvasListeners) listener();
      }
    },
    updateConnection(nextRequest, nextReady, nextReadOnly = false) {
      if (disposed) return;
      const recovered = nextReady && (!ready2 || currentRequest !== nextRequest) || nextReadOnly && (!readOnly2 || currentRequest !== nextRequest);
      if (currentRequest !== nextRequest || ready2 !== nextReady || readOnly2 !== nextReadOnly)
        connectionEpoch += 1;
      currentRequest = nextRequest;
      ready2 = nextReady;
      readOnly2 = nextReadOnly;
      for (const listener of readinessListeners) listener();
      if (recovered) {
        workbench.invalidateResources();
        workbench.invalidateCompositions();
        void queryClient2.invalidateQueries({ queryKey: taskQueryKeys.all(scopeKey) });
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const listener of readinessListeners) listener();
      readinessListeners.clear();
      releasePersistence?.();
      taskIntents.dispose();
      duplication.dispose();
      insertion.dispose();
      canvasImages = [];
      canvasListeners.clear();
      workbench.dispose();
      queryClient2.removeQueries({ queryKey: compositionQueryKeys.all(scopeKey) });
      queryClient2.removeQueries({ queryKey: resourceQueryKeys.all(scopeKey) });
      queryClient2.removeQueries({ queryKey: taskQueryKeys.all(scopeKey) });
    }
  };
}

export {
  ContextResolutionError,
  MAX_RANK_LENGTH,
  MAX_TRACKED_TASKS,
  PRE_DISPATCH_REJECTIONS,
  ProjectQueryError,
  ResourceGenerationHistoryUnavailableError,
  SUBJECT_LIMIT,
  WorkbenchCapabilityUnavailableError,
  WorkspaceCanvasPersistenceUnavailableError,
  aborted,
  boundedRanks,
  classify,
  compareRank$1,
  createChatSessionState,
  createIntentRunner,
  createProjectQueryModule,
  createResourceCommands,
  createResourceDetailModule,
  createSidebarOrderController,
  createStructureCommandContext,
  createStructureModule,
  createTaskInvalidationBridge,
  createTaskModule,
  createTaskSubscription,
  createWorkbenchEvents,
  createWorkspaceStructureRuntime,
  decisionPayload,
  exactFields,
  fingerprint$1,
  hasBlankPromptHistory,
  identifier,
  initialInvalidationRevision,
  isHostGenerationSubject,
  isKnownRejection,
  isSidebarOrderParents,
  migrateLegacyMemberRanks,
  notifyStructureObserver,
  parsePlacementTarget,
  publishPersistenceStatus,
  queues,
  readState,
  ready,
  receiptCheckedRejectionCodes,
  reconcileParent,
  rejectedCodes,
  resolvePinnedResources,
  role,
  sameRanks,
  storage,
  synchronizeWorkspacePersistenceReports,
  synchronizeWorkspacePersistenceReportsOnce,
  versionOutput,
  workspaces,
};
