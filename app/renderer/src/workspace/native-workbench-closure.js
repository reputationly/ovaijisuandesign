/** 原生工作台宿主闭包（第 268 轮）。种子：getNativeWorkbenchOwner / INativeWorkbenchService。偏移是 UTF-16 码元。 */

import reactExports from "react";
import { PERF_CANVAS_V3_SESSION_ACQUIRE, recordPerfSpan } from "../infra/perf-spans.js";
import { ensureNativeWorkbenchServiceRegistered } from "./native-workbench-service-registration.js";
import jsxRuntimeExports from "react/jsx-runtime";
import { PROJECT_QUERY_HTTP_ROUTES, PROJECT_TASK_HTTP_ROUTES, ProjectResourceKind, ProjectResourceLifecycle, ProjectResourceVersionStatus } from "./../canvas-v3/canvas-v3-constants.js";
import { useWorkspaceChatStoreOptional } from "./../canvas-v3/canvas-v3-hooks.js";
import { PROJECT_COMPOSITION_HTTP_ROUTES, PROJECT_RESOURCE_HTTP_ROUTES, canvasV3ContentItems, createCanvasV3Client, createProjectResourceClient } from "./../canvas-v3/canvas-v3-model.js";
import { createFrameChatComposer } from "./../canvas-v3/desktop-host-services.js";
import { CHAT_EDIT_TARGET_LIMIT, HOST_PREFERENCE_VALUE_LIMIT, MAX_IDENTITIES$1, PAGE_STORAGE_PROTOCOL_VERSION, PROJECT_RESOURCE_FRAME_REQUEST_LIMIT, PROJECT_RESOURCE_FRAME_RESPONSE_LIMIT, REQUEST_LIMIT, SidebarOrderError, createFramePersistenceHost, isBounded, isChatSessionTextEditEvent, isHostNativeMediaSaveRequest, isHostNativeSaveFiles, isHostPreferenceKey, isParent, isRecord$d, isSidebarOrderGroups, isSidebarOrderMove, isSidebarOrderState, only$1, serveFrameCanvas, serveFrameCanvasHost, serveFrameChat, serveFrameChatSession, serveFrameDocuments, serveFrameEditorEvents, serveFrameGeneration, serveFrameMedia, serveFramePageStorage, serveFrameResourceActions, serveFrameResourceImageReveal, serveFrameSidebarOrder, serveFrameTaskEvents, sidebarOrderParentKey } from "./../canvas-v3/frame-services.js";
import { WorkspaceCanvasPersistenceChangedError, createClipStudioExportActivity, createProjectCompositionClient, createProjectTaskClient, getRuntimeConfig, guardAccountSubmission, instantiationService, registerWorkspaceCanvasPersistence, reportWorkspaceCanvasPersistence, toolCapability, useCurrentWorkspace, workspaceEvents } from "./../canvas-v3/main-exports.js";
import { refreshMediaMuted, setMediaMuted } from "./../canvas-v3/media-mute.js";
import { createPageStorage } from "./../canvas-v3/page-storage.js";
import { identities } from "./../canvas-v3/workbench-identity-ids.js";
import { useChatReadiness } from "./../chat/chat-compliance-notice.jsx";
import { useAstraSendGate } from "./../generation/use-astra-send-gate.js";
import { useLoginGuard } from "./../infra/schedule.js";
import { getElectronPlatform } from "./../infra/use-canvas-node-assets-store.js";
import { entriesByWorkspace } from "./../settings/entries-by-workspace.jsx";
import { IHiloApp, createDecorator } from "./../settings/parse-custom-mcp-arguments.js";
import { assetCenterLog } from "./../vendor-inline/vscode-base/graph.jsx";
import { chatSessionSendIdentity, createChatSessionAdapter, useWorkspaceChatOptionalSelector } from "./chat-session-adapter.js";
import { IResourceImageMainService, IResourceMediaMainService } from "./home-service.jsx";
import { IRendererPersistenceMainService, disposables } from "./main-services.js";
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

export function isMediaEditCapabilityId(value) {
  return typeof value === "string" && toolCapability(value)?.execution.mode === "sync";
}

export function getWorkspaceCanvasPersistenceStatus(workspaceId) {
  const entries2 = entriesByWorkspace.get(workspaceId);
  if (!entries2 || entries2.size === 0) return "clean";
  const statuses = Array.from(entries2.values(), (entry) => entry.status);
  if (statuses.includes("failed")) return "failed";
  if (statuses.includes("saving")) return "saving";
  if (statuses.includes("dirty")) return "dirty";
  return "clean";
}

export function discardWorkspacePersistenceSource(workspaceId, instanceId, sourceId) {
  const entries2 = entriesByWorkspace.get(workspaceId);
  entries2?.delete(lifetimeKey(instanceId, sourceId));
  if (entries2?.size === 0) entriesByWorkspace.delete(workspaceId);
}

export function ensurePersistenceOwner() {
  ready ??= (async () => {
    const { instantiationService: instantiationService2, disposables: disposables2 } = await import("./main-services.js");
    const service2 = instantiationService2.invokeFunction(
      (accessor) => accessor.get(IRendererPersistenceMainService)
    );
    const ownerId = "desktop-workbench";
    const sessionId = crypto.randomUUID();
    const subscription = service2.onSynchronize(
      ({ ownerId: requested, sessionId: requestedSession, requestId }) => {
        if (requested !== ownerId || requestedSession !== sessionId) return;
        void synchronizeWorkspacePersistenceReports().then(
          () => service2.acknowledge(ownerId, sessionId, requestId, true),
          () => service2.acknowledge(ownerId, sessionId, requestId, false)
        ).catch(() => void 0);
      }
    );
    try {
      await service2.register(ownerId, sessionId);
    } catch (error) {
      subscription.dispose();
      throw error;
    }
    disposables2.add(subscription);
    disposables2.add({
      dispose: () => {
        void service2.unregister(ownerId, sessionId).catch(() => void 0);
      }
    });
  })().catch((error) => {
    ready = void 0;
    throw error;
  });
  return ready;
}

export const GENERATION_FRAME_MESSAGE_TYPES = Object.freeze([
  "account-guard",
  "billing-pricing",
  "billing-pricing-cancel"
]);

export const PROJECT_RESOURCE_FRAME_VERSION = 1;

export const PROJECT_RESOURCE_FRAME_BOOTSTRAP = "hilo:project-resource:bootstrap";

export const TASK_TOKEN = /^[a-z][a-z0-9_]{0,63}$/;

export const MAX_CAPABILITY_OPERATIONS = 16;

export const isTaskIdentity = (value) => {
  if (typeof value !== "string" || !value || value.length > 512) return false;
  return ![".", "..", "lookup", "queue"].includes(value) && !/[\s/\\?#%]/u.test(value) && !Array.from(value).some((c3) => c3.charCodeAt(0) < 32 || c3.charCodeAt(0) === 127);
};

export const isTaskRequestId = (value) => typeof value === "string" && !!value.trim() && value.length <= 512 && !value.includes("\0");

export const isBoundedJson = (value) => typeof value === "string" && value.length <= PROJECT_RESOURCE_FRAME_REQUEST_LIMIT && new TextEncoder().encode(value).byteLength <= PROJECT_RESOURCE_FRAME_REQUEST_LIMIT;

export function jsonObject$1(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : void 0;
  } catch {
    return void 0;
  }
}

export function isTaskSubmitBody(value) {
  if (!isBoundedJson(value)) return false;
  const body2 = jsonObject$1(value);
  return !!body2 && isTaskRequestId(body2.requestId) && typeof body2.capabilityId === "string" && !!body2.capabilityId && !isMediaEditCapabilityId(body2.capabilityId);
}

export function isTaskResolveBody(value) {
  if (!isBoundedJson(value)) return false;
  const body2 = jsonObject$1(value);
  return !!body2 && isTaskRequestId(body2.requestId) && Number.isSafeInteger(body2.expectedRevision) && typeof body2.action === "string";
}

export function isProjectTaskFrameExecuteRequest(value, capabilities = {}) {
  if (!value || typeof value !== "object" || capabilities.taskExecution !== true) return false;
  const message2 = value;
  if (message2.type !== "task-execute" || typeof message2.id !== "string" || !message2.id || message2.id.length > 128)
    return false;
  const only2 = (...keys2) => Object.keys(message2).every((key2) => ["type", "id", "operation", ...keys2].includes(key2));
  switch (message2.operation) {
    case "submit":
      return isTaskSubmitBody(message2.body) && only2("body");
    case "resolve":
      return isTaskIdentity(message2.taskId) && isTaskResolveBody(message2.body) && only2("taskId", "body");
    case "lookup":
      return typeof message2.taskOperation === "string" && TASK_TOKEN.test(message2.taskOperation) && isTaskRequestId(message2.requestId) && only2("taskOperation", "requestId");
    case "capabilities":
      return (message2.source === void 0 || typeof message2.source === "string" && TASK_TOKEN.test(message2.source)) && (message2.operations === void 0 || Array.isArray(message2.operations) && message2.operations.length <= MAX_CAPABILITY_OPERATIONS && message2.operations.every(
        (item) => typeof item === "string" && TASK_TOKEN.test(item)
      )) && only2("source", "operations");
    default:
      return false;
  }
}

export function projectTaskFrameExecuteHttp(message2) {
  switch (message2.operation) {
    case "submit":
      return [PROJECT_TASK_HTTP_ROUTES.execute, { method: "POST", body: message2.body }];
    case "resolve":
      return [
        PROJECT_TASK_HTTP_ROUTES.resolve(message2.taskId),
        { method: "POST", body: message2.body }
      ];
    case "lookup": {
      const query = new URLSearchParams({
        operation: message2.taskOperation,
        requestId: message2.requestId
      });
      return [`${PROJECT_TASK_HTTP_ROUTES.lookup}?${query}`, { method: "GET" }];
    }
    case "capabilities": {
      const query = new URLSearchParams();
      if (message2.source) query.set("source", message2.source);
      for (const operation2 of message2.operations ?? []) query.append("operation", operation2);
      const search2 = query.toString();
      const suffix = search2 ? `?${search2}` : "";
      return [`${PROJECT_TASK_HTTP_ROUTES.capabilities}${suffix}`, { method: "GET" }];
    }
  }
}

export const TASK_LIST_KEYS = /* @__PURE__ */ new Set([
  "limit",
  "cursor",
  "status",
  "operation",
  "source",
  "sessionId",
  "userMessageId",
  "toolUseId",
  "resourceId",
  "versionId",
  "compositionId",
  "compositionIds",
  "createdFrom",
  "createdTo"
]);

export function isProjectTaskFrameReadRequest(value, capabilities = {}) {
  if (!value || typeof value !== "object" || capabilities.taskRead !== true) return false;
  const message2 = value;
  if (message2.type !== "task-read" || typeof message2.id !== "string" || !message2.id || message2.id.length > 128 || typeof message2.path !== "string" || message2.path.length > 4096 || Object.keys(message2).some((key2) => !["type", "id", "path"].includes(key2)))
    return false;
  const path2 = message2.path;
  if (path2.includes("#") || path2.includes("\\")) return false;
  if (path2 === PROJECT_TASK_HTTP_ROUTES.tasks) return true;
  if (path2.startsWith(`${PROJECT_TASK_HTTP_ROUTES.tasks}?`)) {
    const query = new URLSearchParams(path2.slice(PROJECT_TASK_HTTP_ROUTES.tasks.length + 1));
    return [...query.keys()].every((key2) => TASK_LIST_KEYS.has(key2));
  }
  const prefix = `${PROJECT_TASK_HTTP_ROUTES.tasks}/`;
  if (!path2.startsWith(prefix)) return false;
  const id2 = path2.slice(prefix.length);
  try {
    const decoded = decodeURIComponent(id2);
    return !!decoded && !Array.from(decoded).some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    ) && decoded.length <= 512 && ![".", "..", "lookup", "queue"].includes(decoded) && !/[\s/\\?#%]/u.test(decoded) && encodeURIComponent(decoded) === id2;
  } catch {
    return false;
  }
}

export function isProjectResourceFrameRequest(value, capabilities = {}) {
  if (!value || typeof value !== "object") return false;
  const message2 = value;
  return message2.type === "request" && typeof message2.id === "string" && message2.id.length > 0 && message2.id.length <= 128 && typeof message2.path === "string" && (Object.values(PROJECT_RESOURCE_HTTP_ROUTES).includes(message2.path) || capabilities.composition === true && Object.values(PROJECT_COMPOSITION_HTTP_ROUTES).includes(message2.path) || capabilities.query === true && Object.values(PROJECT_QUERY_HTTP_ROUTES).includes(message2.path)) && typeof message2.body === "string" && message2.body.length <= PROJECT_RESOURCE_FRAME_REQUEST_LIMIT && Object.keys(message2).every((key2) => ["type", "id", "path", "body"].includes(key2));
}

export const CANVAS_HOST_MESSAGE_TYPES = Object.freeze([
  "canvas-host-request",
  "canvas-host-cancel"
]);

export const DOCUMENT_FRAME_MESSAGE_TYPES = Object.freeze([
  "document-request",
  "resource-tags-request",
  "document-cancel"
]);

export const MAX_IN_FLIGHT = 32;

export function serveResourceFrame(port, request, observer2 = {}, capabilities = {}, tasks, revealResourceImage, chat, textCompletion, pageStorage, options2 = {}) {
  const disposeResourceActions = serveFrameResourceActions(port, {
    ...capabilities.resourceActions ? options2.resourceActions : {},
    copyCompositionToClipboard: capabilities.compositionClipboard ? options2.resourceActions?.copyCompositionToClipboard : void 0
  });
  const disposeMedia = serveFrameMedia(
    port,
    capabilities.media === true ? options2.grantMedia : void 0
  );
  const disposeTasks = serveFrameTaskEvents(port, tasks);
  const disposeEditors = serveFrameEditorEvents(
    port,
    capabilities.director ? options2.editorEvents : void 0
  );
  const disposeChatSession = serveFrameChatSession(
    port,
    capabilities.chatSession === true,
    options2.chatSession,
    (code2) => notify(() => observer2.onFailure?.(code2))
  );
  const disposeGeneration = serveFrameGeneration(
    port,
    capabilities,
    { request, guardSubmission: options2.guardSubmission },
    (code2) => notify(() => observer2.onFailure?.(code2))
  );
  const disposeDocuments = serveFrameDocuments(
    port,
    capabilities,
    request,
    (code2) => notify(() => observer2.onFailure?.(code2))
  );
  const disposeCanvasHost = serveFrameCanvasHost(
    port,
    capabilities,
    { request, nativeFiles: options2.nativeFiles, preferences: options2.preferences },
    (code2) => notify(() => observer2.onFailure?.(code2))
  );
  const disposeChat = serveFrameChat(
    port,
    capabilities,
    { composer: chat },
    (code2) => notify(() => observer2.onFailure?.(code2))
  );
  const disposeCanvas = serveFrameCanvas(
    port,
    request,
    capabilities,
    (code2) => notify(() => observer2.onFailure?.(code2))
  );
  const disposeResourceReveal = serveFrameResourceImageReveal(
    port,
    capabilities.resourceImageReveal === true,
    revealResourceImage,
    (code2) => notify(() => observer2.onFailure?.(code2))
  );
  const disposePageStorage = serveFramePageStorage(
    port,
    capabilities.pageStorage === true,
    pageStorage,
    (code2) => notify(() => observer2.onFailure?.(code2))
  );
  const disposeSidebarOrder = serveFrameSidebarOrder(
    port,
    capabilities.sidebarOrder === true,
    options2.sidebarOrder,
    (code2) => notify(() => observer2.onFailure?.(code2))
  );
  const allowed = Object.freeze({
    taskRead: capabilities.taskRead === true,
    taskExecution: capabilities.taskExecution === true,
    composition: capabilities.composition === true,
    query: capabilities.query === true
  });
  let disposed = false;
  let ready2 = false;
  const active2 = /* @__PURE__ */ new Map();
  function markReady() {
    if (ready2 || disposed) return;
    ready2 = true;
    notify(observer2.onReady);
  }
  function reply(message2) {
    if (disposed) return;
    if (message2.type === "failure") notify(() => observer2.onFailure?.(message2.code));
    port.postMessage(message2);
  }
  async function handleMessage(event) {
    const data2 = event.data;
    if (!data2 || typeof data2 !== "object" || disposed) return;
    if ("type" in data2 && typeof data2.type === "string" && [
      "persistence-state",
      "persistence-flushed",
      "director-request",
      "resource-host-action",
      "canvas-request",
      "canvas-image-request",
      "canvas-image-import",
      "canvas-media-probe",
      "canvas-cancel",
      "resource-image-reveal",
      "resource-image-reveal-cancel",
      "chat-session-request",
      "chat-session-cancel",
      "chat-session-unsubscribe",
      "chat-draft",
      "chat-send",
      "chat-cancel",
      "text-completion",
      "text-completion-cancel",
      "page-storage-request",
      "sidebar-order-request",
      "media-grant",
      "media-cancel",
      "media-accept",
      ...GENERATION_FRAME_MESSAGE_TYPES,
      ...DOCUMENT_FRAME_MESSAGE_TYPES,
      ...CANVAS_HOST_MESSAGE_TYPES
    ].includes(data2.type))
      return;
    if ("type" in data2 && data2.type === "ready" && Object.keys(data2).length === 1) {
      markReady();
      return;
    }
    if ("type" in data2 && data2.type === "dispose") {
      dispose(true);
      return;
    }
    if ("type" in data2 && data2.type === "cancel" && "id" in data2 && typeof data2.id === "string") {
      active2.get(data2.id)?.abort();
      return;
    }
    if (!isProjectResourceFrameRequest(data2, allowed) && !isProjectTaskFrameReadRequest(data2, allowed) && !isProjectTaskFrameExecuteRequest(data2, allowed)) {
      if ("id" in data2 && typeof data2.id === "string" && data2.id.length <= 128)
        reply(failure(data2.id, "PROJECT_FRAME_REQUEST_REJECTED"));
      return;
    }
    markReady();
    if (active2.has(data2.id) || active2.size >= MAX_IN_FLIGHT) {
      reply(failure(data2.id, "PROJECT_FRAME_BUSY"));
      return;
    }
    const controller = new AbortController();
    active2.set(data2.id, controller);
    try {
      const [path2, init2] = data2.type === "task-execute" ? projectTaskFrameExecuteHttp(data2) : data2.type === "task-read" ? [data2.path, { method: "GET" }] : [data2.path, { method: "POST", body: data2.body }];
      const response = await request(path2, {
        method: init2.method,
        ...init2.body === void 0 ? {} : { headers: { "Content-Type": "application/json" }, body: init2.body },
        signal: controller.signal
      });
      const body2 = await response.text();
      if (body2.length > PROJECT_RESOURCE_FRAME_RESPONSE_LIMIT) {
        reply(failure(data2.id, "PROJECT_FRAME_RESPONSE_TOO_LARGE"));
        return;
      }
      reply({ type: "response", id: data2.id, status: response.status, body: body2 });
    } catch (error) {
      if (error && typeof error === "object" && "status" in error && typeof error.status === "number" && Number.isInteger(error.status) && error.status >= 400 && error.status <= 599) {
        const code2 = "code" in error && typeof error.code === "string" ? error.code : "PROJECT_HTTP_ERROR";
        const body2 = isProjectResourceFrameRequest(data2, { composition: true }) ? { code: code2, message: "Resource request failed" } : {
          error: {
            code: code2,
            message: "Project Query request failed",
            // Mirrors ProjectQueryController; validation and stale cursors are not retryable.
            retryable: error.status === 503 || error.status === 429
          }
        };
        reply({
          type: "response",
          id: data2.id,
          status: error.status,
          body: JSON.stringify(body2)
        });
      } else reply(failure(data2.id, "PROJECT_FRAME_REQUEST_FAILED"));
    } finally {
      active2.delete(data2.id);
    }
  }
  const listener = (event) => {
    void handleMessage(event);
  };
  function dispose(peerClosed = false) {
    if (disposed) return;
    disposed = true;
    disposeTasks();
    disposeEditors();
    disposeChat();
    disposeChatSession();
    disposeCanvas();
    disposeResourceReveal();
    disposePageStorage();
    disposeSidebarOrder();
    disposeResourceActions();
    disposeMedia();
    disposeGeneration();
    disposeDocuments();
    disposeCanvasHost();
    for (const controller of active2.values()) controller.abort();
    active2.clear();
    port.postMessage({ type: "closed" });
    port.removeEventListener("message", listener);
    port.close();
    if (peerClosed) notify(observer2.onPeerClose);
  }
  port.addEventListener("message", listener);
  port.start();
  return () => dispose();
}

export function createSidebarOrderBinding(workspaceId, assertLive) {
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

export function createTreeHostBindings(scope) {
  const mediaAction = async (operation2, resourceId2, versionId, options2) => {
    scope.assertLive();
    const identity2 = { ...scope.identity() };
    const { instantiationService: instantiationService2 } = await import("./main-services.js");
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
        const { instantiationService: instantiationService2 } = await import("./main-services.js");
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

export function createNativeWorkbenchFiles(options2) {
  const live = () => {
    options2.assertLive();
    const actions = options2.actions();
    if (!actions) throw new Error("NATIVE_FILES_DETACHED");
    return actions;
  };
  return Object.freeze({
    ...options2.exportActivity,
    async saveFiles(files, saveOptions) {
      if (!isHostNativeSaveFiles(files)) throw new Error("NATIVE_FILES_INVALID");
      live();
      const urls = [];
      try {
        const local = [];
        for (const { file, fileName, folderName } of files) {
          const copy2 = new Blob([await file.arrayBuffer()], { type: file.type });
          const url2 = URL.createObjectURL(copy2);
          urls.push(url2);
          local.push({ filePath: url2, fileName, ...folderName ? { folderName } : {} });
        }
        const result = await live().saveFiles(local, {
          ...saveOptions?.dialogTitle ? { dialogTitle: saveOptions.dialogTitle } : {},
          ...saveOptions?.rootFolderName ? { rootFolderName: saveOptions.rootFolderName } : {}
        });
        return {
          status: result.status,
          totalCount: result.totalCount,
          savedCount: result.savedCount,
          failedCount: result.failedCount
        };
      } finally {
        for (const url2 of urls) URL.revokeObjectURL(url2);
      }
    },
    async saveMedia(request) {
      if (!isHostNativeMediaSaveRequest(request)) throw new Error("NATIVE_FILES_INVALID");
      options2.assertLive();
      const result = await options2.saveMedia({
        ...options2.reference(request.resourceId, request.versionId),
        mediaKind: request.mediaKind,
        ...request.filename ? { filename: request.filename } : {}
      });
      return result.status === "saved" ? { status: "saved" } : { status: "cancelled" };
    },
    async revealImage({ resourceId: resourceId2, versionId }) {
      options2.assertLive();
      await options2.revealImage(options2.reference(resourceId2, versionId));
    },
    async writeImageData(png) {
      const actions = live();
      if (!actions.writeImageData) throw new Error("NATIVE_CLIPBOARD_UNAVAILABLE");
      await actions.writeImageData(png);
    }
  });
}

export function createNativeWorkbenchPreferences(storage2 = () => typeof window === "undefined" ? void 0 : window.localStorage) {
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

export function useChatSessionAdapter(identity2, options2 = {}) {
  const store = useWorkspaceChatStoreOptional();
  const workspacePath = useCurrentWorkspace();
  const selectedModelId = useWorkspaceChatOptionalSelector((chat) => chat.selectedModelId);
  const readiness = useChatReadiness();
  const { guard: loginGuard } = useLoginGuard();
  const astra = useAstraSendGate(selectedModelId);
  const { request, events: events2, scopeKey, openLink, textEdit } = options2;
  const current2 = reactExports.useRef({
    identity: identity2,
    store,
    readiness,
    loginGuard,
    sendGuard: astra.sendGuard,
    mounted: true
  });
  current2.current = {
    identity: identity2,
    store,
    readiness,
    loginGuard,
    sendGuard: astra.sendGuard,
    mounted: true
  };
  reactExports.useLayoutEffect(() => {
    current2.current.mounted = true;
    return () => {
      current2.current.mounted = false;
    };
  }, []);
  const adapter = reactExports.useMemo(
    () => store ? createChatSessionAdapter({
      store,
      workspacePath,
      resources: request ? createProjectResourceClient(request) : void 0,
      tasks: request ? createProjectTaskClient(request) : void 0,
      events: events2,
      scopeKey,
      openLink,
      textEdit,
      isLive: () => current2.current.mounted && current2.current.identity === identity2 && current2.current.store === store,
      isReady: () => current2.current.readiness === "ready",
      canSend: () => current2.current.loginGuard() && guardAccountSubmission("chat").allowed && current2.current.sendGuard()
    }) : void 0,
    [store, identity2, workspacePath, request, events2, scopeKey, openLink, textEdit]
  );
  reactExports.useLayoutEffect(() => {
    adapter?.refresh();
  }, [adapter, readiness]);
  return adapter;
}

export const MAX_OWNERS = 64;

export class NativeWorkbenchPool {
  constructor(create2, retireIdentity) {
    this.create = create2;
    this.retireIdentity = retireIdentity;
  }
  create;
  retireIdentity;
  owners = /* @__PURE__ */ new Map();
  queue = Promise.resolve();
  values() {
    return [...this.owners.values()];
  }
  acquire(workspaceId, binding, identity2, options2) {
    const run2 = this.queue.catch(() => void 0).then(async () => {
      if (!options2.current()) throw new Error("Workbench attachment retired");
      const victims = this.values().filter(
        (record2) => record2.identity.subjectId !== identity2.subjectId || record2.workspaceId === workspaceId && (record2.identity.documentId !== identity2.documentId || options2.replace)
      );
      if (!options2.discard) {
        const clean2 = await Promise.all(victims.map(({ owner: owner2 }) => owner2.confirmClean()));
        if (clean2.some((value) => !value)) throw new NativeWorkbenchDiscardRequiredError();
      }
      for (const record2 of victims) {
        if (!options2.current()) throw new Error("Workbench attachment retired");
        if (options2.discard) await record2.owner.discardAndDispose();
        else record2.owner.dispose();
        this.owners.delete(record2.identity.documentId);
        if (record2.identity.documentId !== identity2.documentId)
          this.retireIdentity(record2.identity.documentId);
        if (record2.identity.subjectId !== identity2.subjectId && !this.values().some((item) => item.identity.subjectId === record2.identity.subjectId))
          this.retireIdentity(record2.identity.subjectId);
      }
      if (!options2.current()) throw new Error("Workbench attachment retired");
      const existing2 = this.owners.get(identity2.documentId);
      if (existing2) return existing2.owner;
      if (this.owners.size >= MAX_OWNERS) throw new Error("Native workbench capacity reached");
      const owner = this.create(
        workspaceId,
        binding,
        identity2.documentId,
        identity2.storage,
        identity2.generation
      );
      this.owners.set(identity2.documentId, { workspaceId, identity: identity2, owner });
      return owner;
    });
    this.queue = run2;
    return run2;
  }
  /**
   * Release pages of workspaces no longer listed. An unfinished page is retained only while the
   * renderer ledger still protects its workspace; an explicit discard clears that ledger first.
   */
  closeMissing(alive, isProtected) {
    for (const record2 of this.values())
      if (!alive.has(record2.workspaceId) && (record2.owner.getPersistenceState() === "clean" || !isProtected(record2.workspaceId)))
        this.release(record2);
  }
  /** Renderer document teardown: Main retires every native view with its parent anyway. */
  disposeAll() {
    for (const record2 of this.values()) this.release(record2);
  }
  release(record2) {
    record2.owner.dispose();
    this.owners.delete(record2.identity.documentId);
    this.retireIdentity(record2.identity.documentId);
    if (!this.values().some((item) => item.identity.subjectId === record2.identity.subjectId))
      this.retireIdentity(record2.identity.subjectId);
  }
}

export function bindFramePersistence(port, workspaceId, instanceId, report, discard, onState) {
  const sourceId = `workbench:${crypto.randomUUID()}`;
  let active2 = true;
  let status = "failed";
  let queue = Promise.resolve();
  function update2(next2) {
    if (!active2) return;
    status = next2;
    onState?.(next2);
    reportWorkspaceCanvasPersistence(workspaceId, instanceId, next2, sourceId);
  }
  const host = createFramePersistenceHost(port, (snapshot2) => update2(snapshot2.state));
  const unregister = registerWorkspaceCanvasPersistence(
    workspaceId,
    instanceId,
    {
      getStatus: () => status,
      async flushAndWaitLatest() {
        try {
          const snapshot2 = await host.flush();
          if (snapshot2.state !== "clean") throw new Error("Workbench has unfinished changes");
          await queue;
        } catch (error) {
          if (host.getSnapshot().state === "clean") update2("failed");
          throw error;
        }
      }
    },
    (state2) => {
      queue = queue.catch(() => void 0).then(() => report({ workspaceId, instanceId, sourceId, state: state2 }));
      return queue;
    },
    sourceId
  );
  const release = () => {
    active2 = false;
    host.dispose();
    unregister();
  };
  return Object.assign(release, {
    async confirmClean() {
      if (!active2) return false;
      const snapshot2 = await host.flush();
      await queue;
      const current2 = host.getSnapshot();
      return active2 && current2.revision === snapshot2.revision && current2.state === "clean";
    },
    async discard() {
      if (!discard) throw new Error("Explicit discard unavailable");
      release();
      await queue.catch(() => void 0);
      await discard({ workspaceId, instanceId, sourceId });
      discardWorkspacePersistenceSource(workspaceId, instanceId, sourceId);
    }
  });
}

export function createNativeMediaGranter({
  api,
  ownerId,
  scopeKey,
  current: current2,
  request
}) {
  return async (resourceId2, versionId, { signal }) => {
    signal.throwIfAborted();
    if (!current2()) throw new Error("MEDIA_SCOPE_RETIRED");
    const requestId = crypto.randomUUID();
    let cancellation;
    const cancel = () => cancellation ??= api.cancelMediaGrant(ownerId, scopeKey, requestId);
    const abort = () => {
      void cancel().catch(() => void 0);
    };
    signal.addEventListener("abort", abort, { once: true });
    try {
      const grant = await api.grantMedia(
        ownerId,
        scopeKey,
        request(resourceId2, versionId),
        requestId
      );
      signal.throwIfAborted();
      if (!current2()) throw new Error("MEDIA_SCOPE_RETIRED");
      return { grant, cancel };
    } catch (error) {
      await cancel().catch(() => void 0);
      throw error;
    } finally {
      signal.removeEventListener("abort", abort);
    }
  };
}

export function createScopedFrameRequest(scopeKey, current2) {
  return async (path2, init2) => {
    const authority = current2();
    if (authority.scopeKey !== scopeKey) throw new Error("V3 host scope expired");
    const response = await authority.request(path2, init2);
    if (current2().scopeKey !== scopeKey) throw new Error("V3 host scope expired");
    return response;
  };
}

export const CAPABILITIES = Object.freeze({
  media: true,
  composition: true,
  query: true,
  taskRead: true,
  taskExecution: true,
  canvas: true,
  canvasImages: true,
  canvasImageImport: true,
  resourceImageReveal: true,
  resourceActions: true,
  compositionClipboard: true,
  sidebarOrder: true,
  canvasMediaProbe: true,
  canvasReads: true,
  director: true,
  chatComposer: true,
  persistence: true,
  accountGuard: true,
  billingPricing: true,
  // Fixed document/tag routes, forwarded through the same scoped request (no new channel).
  documents: true,
  resourceTags: true,
  // Offline Canvas tools (canvas-host.ts): fixed routes on the same scoped request, and
  // Desktop's own native file actions and device preferences.
  canvasPosters: true,
  audioWaveforms: true,
  canvasMediaImport: true,
  canvasTextGeneration: true,
  toolReads: true,
  luts: true,
  nativeFiles: true,
  preferences: true
});

export function nativeWorkbenchBootstrap(scopeKey, events2, pageStorage = false, generationSubject, chatSession = false, region, editorEvents = false) {
  return {
    type: PROJECT_RESOURCE_FRAME_BOOTSTRAP,
    version: PROJECT_RESOURCE_FRAME_VERSION,
    scopeKey,
    ...region ? { region } : {},
    capabilities: { composition: true },
    queryCapability: true,
    mediaCapability: true,
    taskReadCapability: true,
    taskExecutionCapability: true,
    canvasCapability: true,
    canvasImagesCapability: true,
    canvasImageImportCapability: true,
    resourceImageRevealCapability: true,
    resourceActionsCapability: true,
    compositionClipboardCapability: true,
    sidebarOrderCapability: true,
    canvasMediaProbeCapability: true,
    canvasReadsCapability: true,
    directorCapability: true,
    chatComposerCapability: true,
    persistenceCapability: true,
    accountGuardCapability: true,
    billingPricingCapability: true,
    documentsCapability: true,
    resourceTagsCapability: true,
    canvasPostersCapability: true,
    audioWaveformsCapability: true,
    canvasMediaImportCapability: true,
    canvasTextGenerationCapability: true,
    toolReadsCapability: true,
    lutsCapability: true,
    nativeFilesCapability: true,
    preferencesCapability: true,
    ...events2 ? { taskEventsCapability: true } : {},
    ...editorEvents ? { editorEventsCapability: true } : {},
    ...chatSession ? { chatSessionCapability: true } : {},
    // Granted only with a host-derived durable identity; pages without it keep generation off.
    ...pageStorage ? { pageStorageCapability: true, pageStorageVersion: PAGE_STORAGE_PROTOCOL_VERSION } : {},
    // Host-derived and fixed for this document; a subject change retires the owner instead.
    ...generationSubject ? {
      generationSubject: {
        subjectId: generationSubject.subjectId,
        generationFence: generationSubject.generationFence
      }
    } : {}
  };
}

export async function connectNativeWorkbenchHost({
  bridge,
  workspaceId,
  ownerId,
  binding,
  scopeKey,
  current: current2,
  events: events2,
  editorEvents,
  onReady,
  onClosed,
  isCurrentDocument,
  onPersistence,
  pageStorage,
  chatSession,
  fileActions
}) {
  const target = new EventTarget();
  const endpoint = await bridge.connect(
    (data2) => target.dispatchEvent(new MessageEvent("message", { data: data2 }))
  );
  if (isCurrentDocument ? !isCurrentDocument() : current2().scopeKey !== scopeKey) {
    endpoint.close();
    throw new Error("Native workbench scope retired");
  }
  const port = Object.assign(target, {
    postMessage: endpoint.postMessage,
    start: endpoint.start,
    close: endpoint.close
  });
  let active2 = true;
  const getBinding = () => typeof binding === "function" ? binding() : binding;
  const app = instantiationService.invokeFunction((a2) => a2.get(IHiloApp));
  const identity2 = () => {
    const bound2 = getBinding();
    return { claim: bound2.claim, instanceId: bound2.instanceId, generation: bound2.generation };
  };
  const nativeFiles = createNativeWorkbenchFiles({
    exportActivity: createClipStudioExportActivity({
      workspaceDir: workspaceId,
      ownerPid: getRuntimeConfig().rendererPid,
      gatewayFetch: createScopedFrameRequest(scopeKey, current2),
      assertLive() {
        if (!active2 || current2().scopeKey !== scopeKey)
          throw new Error("NATIVE_FILES_SCOPE_RETIRED");
      }
    }),
    assertLive() {
      if (!active2 || current2().scopeKey !== scopeKey) throw new Error("NATIVE_FILES_SCOPE_RETIRED");
    },
    reference: (resourceId2, versionId) => ({
      workspaceId,
      resourceId: resourceId2,
      versionId,
      identity: identity2()
    }),
    actions: () => fileActions?.(),
    saveMedia: (request) => instantiationService.invokeFunction((a2) => a2.get(IResourceMediaMainService)).saveAs(request),
    revealImage: (request) => instantiationService.invokeFunction((a2) => a2.get(IResourceImageMainService)).revealImage(request)
  });
  const release = bindFramePersistence(
    port,
    workspaceId,
    getBinding().instanceId,
    (report) => app.reportWorkspacePersistence(report),
    (report) => app.discardWorkspacePersistenceSource(report),
    onPersistence
  );
  const treeBindings = createTreeHostBindings({
    workspaceId,
    request: createScopedFrameRequest(scopeKey, current2),
    identity: () => {
      const bound2 = getBinding();
      return { claim: bound2.claim, instanceId: bound2.instanceId, generation: bound2.generation };
    },
    assertLive() {
      if (!active2 || current2().scopeKey !== scopeKey || isCurrentDocument && !isCurrentDocument())
        throw new Error("TREE_HOST_RETIRED");
    }
  });
  const stop = serveResourceFrame(
    port,
    createScopedFrameRequest(scopeKey, current2),
    {
      onReady: () => {
        if (active2) onReady();
      },
      onPeerClose: () => {
        if (active2) onClosed();
      },
      onFailure: (code2) => assetCenterLog.warn("v3_native_request_failed", { code: code2 })
    },
    {
      ...CAPABILITIES,
      ...pageStorage ? { pageStorage: true } : {},
      ...chatSession ? { chatSession: true } : {}
    },
    events2 ? { scopeKey, source: events2 } : void 0,
    async (resourceId2, versionId) => {
      if (!active2 || current2().scopeKey !== scopeKey)
        throw new Error("RESOURCE_IMAGE_REVEAL_SCOPE_RETIRED");
      const bound2 = getBinding();
      await instantiationService.invokeFunction((a2) => a2.get(IResourceImageMainService)).revealImage({
        workspaceId,
        resourceId: resourceId2,
        versionId,
        identity: {
          claim: bound2.claim,
          instanceId: bound2.instanceId,
          generation: bound2.generation
        }
      });
    },
    treeBindings.chat,
    void 0,
    pageStorage,
    {
      chatSession,
      ...editorEvents ? { editorEvents: { scopeKey, source: editorEvents } } : {},
      sidebarOrder: treeBindings.sidebarOrder,
      resourceActions: {
        revealResource: treeBindings.resource.reveal,
        copyResourceToClipboard: treeBindings.resource.copyToClipboard,
        copyCompositionToClipboard: treeBindings.composition?.copyToClipboard,
        draftComposition: treeBindings.chat?.draftComposition
      },
      grantMedia: createNativeMediaGranter({
        api: instantiationService.invokeFunction((a2) => a2.get(INativeWorkbenchService)),
        ownerId,
        scopeKey,
        current: () => active2 && current2().scopeKey === scopeKey,
        request: (resourceId2, versionId) => {
          const bound2 = getBinding();
          return {
            workspaceId,
            resourceId: resourceId2,
            versionId,
            identity: {
              claim: bound2.claim,
              instanceId: bound2.instanceId,
              generation: bound2.generation
            }
          };
        }
      }),
      nativeFiles,
      preferences: createNativeWorkbenchPreferences(),
      // Desktop shows its own blocked notice; a retired page is always refused.
      guardSubmission: async (kind2) => active2 && current2().scopeKey === scopeKey && guardAccountSubmission(kind2).allowed
    }
  );
  const dispose = () => {
    if (!active2) return;
    active2 = false;
    release();
    stop();
  };
  return Object.assign(dispose, {
    confirmClean: release.confirmClean,
    async discard() {
      dispose();
      await release.discard();
    }
  });
}

export const SEND_CONTEXT_LIMIT = 128;

export const sameEditor = (a2, b3) => a2.nodeId === b3.nodeId && a2.editSessionId === b3.editSessionId;

export function createTextEditBridge(binding) {
  const owner = /* @__PURE__ */ Symbol("text-edit-owner");
  const events2 = binding.events ?? workspaceEvents;
  const abort = new AbortController();
  const listeners2 = /* @__PURE__ */ new Set();
  let closed = false;
  let state2 = null;
  let queue = Promise.resolve();
  let commandRevision = 0;
  let emitting = false;
  const captures = /* @__PURE__ */ new Map();
  const assertLive = () => {
    if (closed || abort.signal.aborted || !binding.isLive())
      throw new Error("CHAT_SESSION_EDITING_STALE");
  };
  const publish2 = () => {
    for (const listener of listeners2) listener();
  };
  const current2 = (editor2) => {
    assertLive();
    if (!state2 || owners.get(binding.scopeKey) !== owner || !sameEditor(state2.editor, editor2))
      throw new Error("CHAT_SESSION_EDITING_STALE");
    return state2;
  };
  const updateCommandState = (command2) => {
    if (!state2) return;
    if (command2.type === "clear" || command2.type === "delete") {
      const annotations2 = command2.type === "clear" ? [] : state2.annotations.filter(({ id: id2 }) => id2 !== command2.id);
      const activeAnnotationId = annotations2.some(({ id: id2 }) => id2 === state2?.activeAnnotationId) ? state2.activeAnnotationId : null;
      state2 = { ...state2, annotations: annotations2, activeAnnotationId };
      events2.fireAnnotationsChanged(binding.workspaceId, state2.editor, [...annotations2]);
      events2.fireAnnotationActivated(binding.workspaceId, state2.editor, activeAnnotationId);
    } else if (command2.type === "clearSelection") {
      state2 = { ...state2, selection: { anchor: null } };
      events2.fireTextEditSelection(binding.workspaceId, state2.editor, state2.selection);
    }
  };
  const issue = (command2) => {
    if (!state2) return;
    updateCommandState(command2);
    state2 = {
      ...state2,
      command: { revision: ++commandRevision, command: structuredClone(command2) }
    };
    publish2();
    emitting = true;
    try {
      events2.fireAnnotationCommand(binding.workspaceId, state2.editor, command2);
    } finally {
      emitting = false;
    }
  };
  const commands = events2.onAnnotationCommand((event) => {
    if (closed || !binding.isLive() || emitting || event.workspaceId !== binding.workspaceId || !state2 || owners.get(binding.scopeKey) !== owner || !sameEditor(state2.editor, event))
      return;
    updateCommandState(event.command);
    state2 = {
      ...state2,
      command: { revision: ++commandRevision, command: structuredClone(event.command) }
    };
    publish2();
  });
  async function validate2(editor2, document2) {
    assertLive();
    const generation = binding.getGeneration?.();
    const assertGeneration = () => {
      assertLive();
      if (binding.getGeneration?.() !== generation) throw new Error("CHAT_SESSION_EDITING_STALE");
    };
    const request = (path2, init2) => new Promise((resolve, reject2) => {
      const cancel = () => reject2(new Error("CHAT_SESSION_EDITING_STALE"));
      if (abort.signal.aborted) {
        cancel();
        return;
      }
      abort.signal.addEventListener("abort", cancel, { once: true });
      binding.request(path2, { ...init2, signal: abort.signal }).then(resolve, reject2).finally(() => abort.signal.removeEventListener("abort", cancel));
    });
    const canvas = createCanvasV3Client(request);
    const graph = await canvas.load();
    assertGeneration();
    const node2 = graph.nodes[editor2.nodeId];
    if (node2?.kind !== "composition") throw new Error("CHAT_SESSION_EDITING_REJECTED");
    const [content2, resources] = await Promise.all([
      canvas.readContent([node2.compositionId], abort.signal),
      createProjectResourceClient(request).getResources(
        [{ resourceId: document2.resourceId, versionId: document2.versionId }],
        { signal: abort.signal }
      )
    ]);
    assertGeneration();
    const projection = content2.items.find((item) => item.compositionId === node2.compositionId);
    const resource2 = resources[0];
    if (projection?.state !== "ready" || !canvasV3ContentItems(projection).some(
      (item) => item.resourceId === document2.resourceId && item.versionId === document2.versionId && item.kind === "text" && item.state === "ready"
    ) || !resource2?.ok || resource2.detail.resource.resourceId !== document2.resourceId || resource2.detail.resource.kind !== ProjectResourceKind.TEXT_DOCUMENT || resource2.detail.resource.lifecycle !== ProjectResourceLifecycle.ACTIVE || resource2.detail.version?.versionId !== document2.versionId || resource2.detail.version.status !== ProjectResourceVersionStatus.READY)
      throw new Error("CHAT_SESSION_EDITING_REJECTED");
    return {
      resourceId: document2.resourceId,
      versionId: document2.versionId,
      name: resource2.detail.resource.name.slice(0, 1024)
    };
  }
  async function apply2(event) {
    assertLive();
    const editor2 = { nodeId: event.nodeId, editSessionId: event.editSessionId };
    if (event.type === "open") {
      if (owners.has(binding.scopeKey) && owners.get(binding.scopeKey) !== owner)
        throw new Error("CHAT_SESSION_EDITING_BUSY");
      owners.set(binding.scopeKey, owner);
      try {
        const document2 = await validate2(editor2, event.document);
        if (state2 && sameEditor(state2.editor, editor2)) {
          if (state2.document.resourceId !== document2.resourceId)
            throw new Error("CHAT_SESSION_EDITING_REJECTED");
          state2 = { ...state2, document: document2 };
          events2.fireTextEditDocumentChanged(binding.workspaceId, editor2, document2);
          publish2();
          return;
        }
        if (state2 && !sameEditor(state2.editor, editor2))
          events2.fireTextEditActive(binding.workspaceId, state2.editor, false, state2.document);
        state2 = {
          editor: editor2,
          document: document2,
          annotations: [],
          activeAnnotationId: null,
          selection: { anchor: null }
        };
        events2.fireTextEditActive(binding.workspaceId, editor2, true, document2);
        events2.fireAnnotationsChanged(binding.workspaceId, editor2, []);
        events2.fireAnnotationActivated(binding.workspaceId, editor2, null);
        publish2();
      } catch (error) {
        if (!state2 && owners.get(binding.scopeKey) === owner) owners.delete(binding.scopeKey);
        throw error;
      }
      return;
    }
    const previous2 = current2(editor2);
    switch (event.type) {
      case "document": {
        if (event.document.resourceId !== previous2.document.resourceId)
          throw new Error("CHAT_SESSION_EDITING_REJECTED");
        const document2 = await validate2(editor2, event.document);
        state2 = { ...current2(editor2), document: document2 };
        events2.fireTextEditDocumentChanged(binding.workspaceId, editor2, document2);
        break;
      }
      case "annotations":
        state2 = { ...previous2, annotations: event.annotations, submission: void 0 };
        events2.fireAnnotationsChanged(binding.workspaceId, editor2, [...event.annotations]);
        break;
      case "activate":
        if (event.id !== null && !previous2.annotations.some(({ id: id2 }) => id2 === event.id))
          throw new Error("CHAT_SESSION_EDITING_REJECTED");
        state2 = { ...previous2, activeAnnotationId: event.id };
        events2.fireAnnotationActivated(binding.workspaceId, editor2, event.id);
        break;
      case "selection":
        state2 = { ...previous2, selection: event.selection };
        events2.fireTextEditSelection(binding.workspaceId, editor2, event.selection);
        break;
      case "command":
        if ("id" in event.command && !previous2.annotations.some(
          ({ id: id2 }) => id2 === ("id" in event.command ? event.command.id : void 0)
        ))
          throw new Error("CHAT_SESSION_EDITING_REJECTED");
        issue(event.command);
        return;
      case "close":
        events2.fireTextEditActive(binding.workspaceId, editor2, false, previous2.document);
        state2 = null;
        if (owners.get(binding.scopeKey) === owner) owners.delete(binding.scopeKey);
        break;
    }
    publish2();
  }
  return {
    getSnapshot() {
      return !closed && binding.isLive() && owners.get(binding.scopeKey) === owner && state2 ? structuredClone(state2) : null;
    },
    subscribe(listener) {
      assertLive();
      listeners2.add(listener);
      return () => {
        listeners2.delete(listener);
      };
    },
    execute(event) {
      if (!isChatSessionTextEditEvent(event))
        return Promise.reject(new Error("CHAT_SESSION_EDITING_REJECTED"));
      const frozen2 = structuredClone(event);
      const generation = binding.getGeneration?.();
      const result = queue.catch(() => {
      }).then(() => {
        if (binding.getGeneration?.() !== generation)
          throw new Error("CHAT_SESSION_EDITING_STALE");
        return apply2(frozen2);
      });
      queue = result;
      return result;
    },
    captureSendContext(requestId, text2) {
      assertLive();
      const saved = captures.get(requestId);
      if (saved) {
        if (saved.input !== text2) throw new Error("CHAT_SESSION_REQUEST_CONFLICT");
        return structuredClone(saved.context);
      }
      const editing = state2 && owners.get(binding.scopeKey) === owner ? structuredClone(state2) : null;
      const context = { text: text2 };
      if (editing) {
        const document2 = {
          nodeId: editing.editor.nodeId,
          resourceId: editing.document.resourceId,
          versionId: editing.document.versionId
        };
        const common = { requestId, editSessionId: editing.editor.editSessionId, document: document2 };
        if (editing.annotations.some((annotation) => annotation.targets.length === 0))
          throw new Error("CHAT_SESSION_EDITING_REANCHOR_REQUIRED");
        if (editing.annotations.length) {
          context.documentEditRequest = {
            ...common,
            annotations: [...editing.annotations],
            ...text2.trim() ? { instruction: text2.trim() } : {}
          };
        } else {
          if (editing.selection.oversizedLength)
            throw new Error("CHAT_SESSION_EDITING_SELECTION_TOO_LARGE");
          const anchors2 = (editing.selection.anchors ?? (editing.selection.anchor ? [editing.selection.anchor] : [])).filter((anchor2) => anchor2.exact.trim());
          if (anchors2.length && text2.trim()) {
            const annotations2 = [];
            for (let index2 = 0; index2 < anchors2.length; index2 += CHAT_EDIT_TARGET_LIMIT) {
              const targets = anchors2.slice(index2, index2 + CHAT_EDIT_TARGET_LIMIT);
              annotations2.push({
                id: `selection-${requestId.slice(0, 200)}-${annotations2.length + 1}`,
                seq: annotations2.length + 1,
                quote: targets.map((anchor2) => anchor2.exact).join("\n").slice(0, 1024),
                comment: text2.trim(),
                targets
              });
            }
            context.documentEditRequest = { ...common, annotations: annotations2 };
          } else
            context.textEditContext = { editSessionId: editing.editor.editSessionId, document: document2 };
        }
      }
      captures.set(requestId, { input: text2, context, editing, accepted: false });
      if (captures.size > SEND_CONTEXT_LIMIT) captures.delete(captures.keys().next().value ?? "");
      return structuredClone(context);
    },
    acceptSend(requestId) {
      assertLive();
      const saved = captures.get(requestId);
      if (!saved || saved.accepted) return;
      saved.accepted = true;
      if (!saved.editing || !state2 || owners.get(binding.scopeKey) !== owner || !sameEditor(state2.editor, saved.editing.editor))
        return;
      if ((saved.editing.selection.anchor || saved.editing.selection.anchors?.length) && JSON.stringify(state2.selection) === JSON.stringify(saved.editing.selection))
        issue({ type: "clearSelection" });
      const consumed = state2.annotations.filter(
        (draft) => saved.editing?.annotations.some(
          (sent) => sent.id === draft.id && JSON.stringify(sent) === JSON.stringify(draft)
        )
      );
      if (consumed.length && consumed.length === state2.annotations.length) {
        issue({ type: "clear" });
      } else {
        for (const { id: id2 } of consumed) issue({ type: "delete", id: id2 });
      }
      state2 = {
        ...state2,
        submission: state2.annotations.length ? void 0 : {
          requestId,
          status: "accepted",
          annotations: saved.context.documentEditRequest?.annotations ?? []
        }
      };
      publish2();
    },
    dispose() {
      if (closed) return;
      closed = true;
      abort.abort();
      if (state2)
        events2.fireTextEditActive(binding.workspaceId, state2.editor, false, state2.document);
      if (owners.get(binding.scopeKey) === owner) owners.delete(binding.scopeKey);
      state2 = null;
      commands.dispose();
      captures.clear();
      listeners2.clear();
    }
  };
}

export const CHAT_ACCEPTED_REQUEST_LIMIT = 128;

export class NativeWorkbenchOwner {
  constructor(options2) {
    this.options = options2;
    this.textEdit = createTextEditBridge({
      scopeKey: options2.scopeKey,
      workspaceId: options2.workspaceId,
      isLive: () => Boolean(this.attachment) && !this.disposed && this.phase !== "failed",
      getGeneration: () => this.attachment,
      request: async (path2, init2) => {
        const attachment = this.attachment;
        if (!attachment || this.disposed || this.phase === "failed")
          throw new Error("CHAT_SESSION_SCOPE_RETIRED");
        const response = await attachment.request(path2, init2);
        if (this.attachment !== attachment || this.disposed)
          throw new Error("CHAT_SESSION_SCOPE_RETIRED");
        return response;
      }
    });
  }
  options;
  id = crypto.randomUUID();
  phase = "loading";
  listeners = /* @__PURE__ */ new Set();
  eventListeners = /* @__PURE__ */ new Set();
  attachment;
  stopEvents;
  stopEditorEvents;
  editorListeners = /* @__PURE__ */ new Set();
  editorSource = {
    subscribe: (listener) => {
      this.editorListeners.add(listener);
      if (this.attachment?.editorEvents) listener();
      return () => {
        this.editorListeners.delete(listener);
      };
    }
  };
  stopChat;
  chatRevision = 0;
  chatRevisionOffset = 0;
  chatListeners = /* @__PURE__ */ new Set();
  chatRequests = /* @__PURE__ */ new Map();
  stopPorts;
  stopStatus;
  stopConnection;
  pageStorage;
  persistenceState = "clean";
  getPersistenceState = () => this.persistenceState;
  started = false;
  /** Whether a document ever received this owner's port; without one it never wrote anything. */
  portReceived = false;
  disposed = false;
  timer;
  bounds = { x: 0, y: 0, width: 0, height: 0 };
  visible = false;
  source = {
    subscribe: (listener) => {
      this.eventListeners.add(listener);
      listener({ type: "resync", scopeKey: this.options.scopeKey });
      return () => {
        this.eventListeners.delete(listener);
      };
    }
  };
  requireChatAttachment() {
    const attachment = this.attachment;
    if (!attachment?.chatSession || this.disposed || this.phase === "failed")
      throw new Error("CHAT_SESSION_SCOPE_RETIRED");
    return { attachment, chat: attachment.chatSession };
  }
  /** The port survives route attachments; only the current workspace may serve its chat. */
  chatSession = {
    snapshot: async () => {
      const { attachment, chat } = this.requireChatAttachment();
      const offset2 = this.chatRevisionOffset;
      const snapshot2 = await chat.snapshot();
      if (this.attachment !== attachment || this.disposed)
        throw new Error("CHAT_SESSION_SCOPE_RETIRED");
      const revision2 = offset2 + snapshot2.revision;
      this.chatRevision = Math.max(this.chatRevision, revision2);
      return { ...snapshot2, revision: revision2 };
    },
    subscribe: (listener) => {
      this.requireChatAttachment();
      this.chatListeners.add(listener);
      return () => {
        this.chatListeners.delete(listener);
      };
    },
    execute: async (command2) => {
      const { attachment, chat } = this.requireChatAttachment();
      if (command2.kind === "send") {
        const existing2 = this.chatRequests.get(command2.requestId);
        if (existing2) {
          if (existing2.identity !== chatSessionSendIdentity(command2))
            throw new Error("CHAT_SESSION_REQUEST_CONFLICT");
          await existing2.accepted;
          return;
        }
        const accepted2 = chat.execute(command2);
        const request = { identity: chatSessionSendIdentity(command2), accepted: accepted2 };
        this.chatRequests.set(command2.requestId, request);
        try {
          await accepted2;
        } catch (error) {
          if (this.chatRequests.get(command2.requestId) === request)
            this.chatRequests.delete(command2.requestId);
          throw error;
        }
        if (this.chatRequests.size > CHAT_ACCEPTED_REQUEST_LIMIT)
          this.chatRequests.delete(this.chatRequests.keys().next().value ?? "");
      } else {
        await chat.execute(command2);
      }
      if (this.attachment !== attachment || this.disposed)
        throw new Error("CHAT_SESSION_SCOPE_RETIRED");
    }
  };
  textEdit;
  getSnapshot = () => this.phase;
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  setPhase(phase2) {
    if (this.disposed || this.phase === phase2) return;
    this.phase = phase2;
    for (const listener of this.listeners) listener();
  }
  fail = () => {
    this.stopConnection?.();
    clearTimeout(this.timer);
    this.setPhase("failed");
  };
  current = () => ({
    scopeKey: this.attachment && !this.disposed && this.phase !== "failed" ? this.options.scopeKey : void 0,
    request: this.request
  });
  request = async (path2, init2) => {
    const attachment = this.attachment;
    if (!attachment || this.disposed || this.phase === "failed")
      throw new Error("Native workbench authority unavailable");
    const response = await attachment.request(path2, init2);
    if (this.disposed || this.attachment !== attachment)
      throw Object.assign(new Error("Native workbench attachment retired"), {
        code: CANVAS_FRAME_DETACHED
      });
    return response;
  };
  attach(attachment) {
    if (this.disposed) throw new Error("Native workbench disposed");
    this.attachment = attachment;
    this.stopEvents?.();
    this.stopEditorEvents?.();
    this.stopChat?.();
    const chatRevisionOffset = this.chatRevision + 1;
    this.chatRevisionOffset = chatRevisionOffset;
    const publishChat = (snapshot2) => {
      if (this.attachment !== attachment || this.disposed || this.phase === "failed") return;
      const revision2 = chatRevisionOffset + snapshot2.revision;
      if (revision2 <= this.chatRevision) return;
      this.chatRevision = revision2;
      const current2 = { ...snapshot2, revision: revision2 };
      for (const listener of this.chatListeners) listener(current2);
    };
    this.stopChat = attachment.chatSession?.subscribe(publishChat);
    void attachment.chatSession?.snapshot().then(publishChat, () => {
    });
    this.stopEditorEvents = attachment.editorEvents?.subscribe((capabilityId) => {
      if (this.attachment !== attachment || this.disposed) return;
      for (const listener of this.editorListeners) listener(capabilityId);
    });
    if (attachment.editorEvents) for (const listener of this.editorListeners) listener();
    this.stopEvents = attachment.events?.subscribe((event) => {
      if (this.attachment !== attachment || event.scopeKey !== this.options.scopeKey) return;
      for (const listener of this.eventListeners) listener(event);
    });
    for (const listener of this.eventListeners)
      listener({ type: "resync", scopeKey: this.options.scopeKey });
    if (!this.started) {
      this.started = true;
      void this.start();
    }
    return () => {
      if (this.attachment !== attachment) return;
      this.attachment = void 0;
      this.stopEvents?.();
      this.stopEditorEvents?.();
      this.stopEvents = void 0;
      this.stopChat?.();
      this.stopChat = void 0;
      this.layout(this.bounds, false);
    };
  }
  layout(bounds, visible2) {
    this.bounds = bounds;
    this.visible = visible2;
    void this.options.api.layout(this.id, bounds, visible2 && Boolean(this.attachment)).catch(this.fail);
  }
  async start() {
    const { api, bridge, workspaceId, scopeKey, binding, storage: storage2 } = this.options;
    const pageStorage = storage2 && storage2.workspaceId === workspaceId ? createPageStorage(storage2, () => !this.disposed && this.phase !== "failed") : void 0;
    this.pageStorage = pageStorage;
    this.stopStatus = api.onDidChange((event) => {
      if (event.ownerId === this.id && event.state === "failed") this.fail();
    });
    this.stopPorts = bridge.subscribe(this.id, (_document, port) => {
      this.portReceived = true;
      this.stopConnection?.();
      void connectNativeWorkbenchHost({
        bridge: port,
        workspaceId,
        ownerId: this.id,
        binding: () => this.attachment?.binding ?? binding,
        scopeKey,
        onPersistence: (state2) => {
          this.persistenceState = state2;
        },
        current: this.current,
        events: this.source,
        editorEvents: this.editorSource,
        isCurrentDocument: () => !this.disposed && this.phase !== "failed",
        pageStorage,
        chatSession: this.attachment?.chatSession ? this.chatSession : void 0,
        fileActions: () => this.disposed || this.phase === "failed" ? void 0 : this.attachment?.fileActions,
        onReady: () => {
          clearTimeout(this.timer);
          if (this.phase !== "failed") this.setPhase("ready");
        },
        onClosed: this.fail
      }).then((stop) => {
        if (this.disposed || this.phase === "failed") stop();
        else this.stopConnection = stop;
      }, this.fail);
    });
    try {
      await this.options.prepare();
      if (this.disposed) return;
      this.persistenceState = "failed";
      this.timer = setTimeout(this.fail, 1e4);
      await api.mount(
        this.id,
        nativeWorkbenchBootstrap(
          scopeKey,
          this.source,
          Boolean(pageStorage),
          this.options.generationSubject,
          Boolean(this.attachment?.chatSession),
          getRuntimeConfig().region,
          true
        ),
        ...this.attachment?.page ? [this.attachment.page] : []
      );
      if (this.disposed) {
        await api.release(this.id);
        return;
      }
      this.layout(this.bounds, this.visible);
    } catch {
      this.fail();
    }
  }
  async confirmClean() {
    if (!this.started || !this.portReceived) return true;
    return await this.stopConnection?.confirmClean?.().catch(() => false) ?? false;
  }
  async discardAndDispose() {
    this.fail();
    await this.stopConnection?.discard?.();
    this.dispose();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.attachment = void 0;
    clearTimeout(this.timer);
    this.stopEvents?.();
    this.stopEditorEvents?.();
    this.stopChat?.();
    this.chatListeners.clear();
    this.chatRequests.clear();
    this.textEdit.dispose();
    this.stopPorts?.();
    this.stopStatus?.dispose();
    this.stopConnection?.();
    this.pageStorage?.dispose();
    this.listeners.clear();
    this.eventListeners.clear();
    this.editorListeners.clear();
    void this.options.api.release(this.id).catch(() => {
    });
  }
}

export function retireWorkbenchIdentity(id2) {
  for (const [key2, value] of identities) if (value === id2) identities.delete(key2);
}

export const pool = new NativeWorkbenchPool((workspaceId, binding, scopeKey, storage2, generation) => {
  const bridge = window.__HILO_V3_NATIVE_HOST__;
  if (!bridge) throw new Error("Native workbench preload unavailable");
  return new NativeWorkbenchOwner({
    api: instantiationService.invokeFunction((a2) => a2.get(INativeWorkbenchService)),
    bridge,
    prepare: ensurePersistenceOwner,
    workspaceId,
    binding,
    scopeKey,
    storage: storage2,
    ...generation ? { generationSubject: generation } : {}
  });
}, retireWorkbenchIdentity);

export let listening = false;

export function listen() {
  if (listening) return;
  const app = instantiationService.invokeFunction((a2) => a2.get(IHiloApp));
  const subscription = app.onWorkspaceEntriesChanged((entries2) => {
    pool.closeMissing(
      new Set(entries2.map((entry) => entry.workspaceId)),
      (workspaceId) => getWorkspaceCanvasPersistenceStatus(workspaceId) !== "clean"
    );
  });
  listening = true;
  window.addEventListener("beforeunload", (event) => {
    if (pool.values().some((record2) => getWorkspaceCanvasPersistenceStatus(record2.workspaceId) !== "clean")) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  window.addEventListener(
    "unload",
    () => {
      subscription.dispose();
      pool.disposeAll();
    },
    { once: true }
  );
}

export async function getNativeWorkbenchOwner(workspaceId, binding, identity2, options2) {
  // 第 278 轮：首次真正 acquire 时才把 INativeWorkbenchService 注册进 DI。
  // 放在模块顶层会拖累 home-skill-inspiration 屏（确定性 2654 像素差异）。
  ensureNativeWorkbenchServiceRegistered(INativeWorkbenchService);
  listen();
  const startedAt = typeof performance === "undefined" ? 0 : performance.now();
  try {
    const owner = await pool.acquire(workspaceId, binding, identity2, options2);
    recordPerfSpan(PERF_CANVAS_V3_SESSION_ACQUIRE, startedAt, { workspaceId, ok: true });
    return owner;
  } catch (error) {
    recordPerfSpan(PERF_CANVAS_V3_SESSION_ACQUIRE, startedAt, { workspaceId, ok: false });
    throw error;
  }
}

export const INativeWorkbenchService = createDecorator("nativeWorkbenchService");

export class NativeWorkbenchDiscardRequiredError extends Error {
  constructor() {
    super("The previous document has unfinished changes");
  }
}

export const __vitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve();
  if (deps && deps.length > 0) {
    let allSettled = function(promises$2) {
      return Promise.all(promises$2.map((p) => Promise.resolve(p).then((value$1) => ({
        status: "fulfilled",
        value: value$1
      }), (reason) => ({
        status: "rejected",
        reason
      }))));
    };
    const links = document.getElementsByTagName("link");
    const cspNonceMeta = document.querySelector("meta[property=csp-nonce]");
    const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
    promise = allSettled(deps.map((dep) => {
      dep = assetsURL(dep, importerUrl);
      if (dep in seen) return;
      seen[dep] = true;
      const isCss = dep.endsWith(".css");
      const cssSelector = isCss ? '[rel="stylesheet"]' : "";
      if (!!importerUrl) for (let i$1 = links.length - 1; i$1 >= 0; i$1--) {
        const link$1 = links[i$1];
        if (link$1.href === dep && (!isCss || link$1.rel === "stylesheet")) return;
      }
      else if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) return;
      const link = document.createElement("link");
      link.rel = isCss ? "stylesheet" : scriptRel;
      if (!isCss) link.as = "script";
      link.crossOrigin = "";
      link.href = dep;
      if (cspNonce) link.setAttribute("nonce", cspNonce);
      document.head.appendChild(link);
      if (isCss) return new Promise((res, rej) => {
        link.addEventListener("load", res);
        link.addEventListener("error", () => rej(/* @__PURE__ */ new Error(`Unable to preload CSS for ${dep}`)));
      });
    }));
  }
  function handlePreloadError(err$2) {
    const e$1 = new Event("vite:preloadError", { cancelable: true });
    e$1.payload = err$2;
    window.dispatchEvent(e$1);
    if (!e$1.defaultPrevented) throw err$2;
  }
  return promise.then((res) => {
    for (const item of res || []) {
      if (item.status !== "rejected") continue;
      handlePreloadError(item.reason);
    }
    return baseModule().catch(handlePreloadError);
  });
};


export function createSidebarOrderController(persistence, assertLive = () => {
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

export function failure(id2, code2) {
  return { type: "failure", id: id2, code: code2, message: "Scoped Resource connection unavailable" };
}

export function lifetimeKey(instanceId, sourceId) {
  return sourceId ? JSON.stringify([instanceId || LEGACY_PERSISTENCE_LIFETIME, sourceId]) : instanceId || LEGACY_PERSISTENCE_LIFETIME;
}

export function notify(callback) {
  try {
    void Promise.resolve(callback?.()).catch(() => void 0);
  } catch {
  }
}

export const owners = /* @__PURE__ */ new Map();

export async function readCompositionResources(compositions, resources, compositionId, options2) {
  const composition2 = await compositions.get(compositionId, options2);
  if (composition2.compositionId !== compositionId || composition2.lifecycle !== "active")
    throw new Error("Composition unavailable");
  const ids2 = [
    ...new Set(
      composition2.members.flatMap((member2) => member2.resource === null ? [] : [member2.resource])
    )
  ];
  const details = [];
  for (let offset2 = 0; offset2 < ids2.length; offset2 += 50) {
    const batch2 = ids2.slice(offset2, offset2 + 50);
    const results = await resources.getResources(
      batch2.map((resourceId2) => ({ resourceId: resourceId2 })),
      options2
    );
    if (results.length !== batch2.length) throw new Error("Incomplete composition resources");
    for (const [index2, result] of results.entries()) {
      if (!result.ok || result.detail.resource.resourceId !== batch2[index2] || result.detail.resource.lifecycle !== "active" || result.detail.version?.status !== "ready")
        throw new Error("Composition resource unavailable");
      details.push({ resource: result.detail.resource, version: result.detail.version });
    }
  }
  if (!details.length) throw new Error("Composition has no readable files");
  return { composition: composition2, details };
}

export let ready;

export function storage() {
  const bridge = getElectronPlatform()?.storage;
  if (!bridge) throw new Error("Workspace storage unavailable");
  return bridge;
}

export async function synchronizeWorkspacePersistenceReports() {
  try {
    await synchronizeWorkspacePersistenceReportsOnce();
  } catch (error) {
    if (!(error instanceof WorkspaceCanvasPersistenceChangedError)) throw error;
    await synchronizeWorkspacePersistenceReportsOnce();
  }
}

export const workspaces = /* @__PURE__ */ new Map();

export const LEGACY_PERSISTENCE_LIFETIME = "legacy";

export const assetsURL = function(dep, importerUrl) {
  return new URL(dep, importerUrl).href;
};

export function boundedRanks(ranks) {
  if (Object.values(ranks).every((rank) => rank.length <= MAX_RANK_LENGTH)) return ranks;
  const ids2 = Object.keys(ranks).sort((a2, b3) => compareRank$1(ranks[a2], ranks[b3]));
  const keys2 = generateNKeysBetween(null, null, ids2.length);
  return Object.fromEntries(ids2.map((id2, index2) => [id2, keys2[index2]]));
}

export function compareRank$1(a2, b3) {
  return a2 < b3 ? -1 : a2 > b3 ? 1 : 0;
}

export function isSidebarOrderParents(value) {
  return Array.isArray(value) && value.length <= MAX_IDENTITIES$1 && value.every(
    (parent) => isRecord$d(parent) && isParent(parent) && only$1(parent, ["kind", "parentId"])
  ) && isBounded(value, REQUEST_LIMIT);
}

export function migrateLegacyMemberRanks(state2, groups) {
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

export const queues = /* @__PURE__ */ new WeakMap();

export function readState(value) {
  if (value === void 0) return { parents: {} };
  if (!isSidebarOrderState(value)) throw new Error("Invalid sidebar order storage");
  for (const ranks of Object.values(value.parents)) {
    const keys2 = Object.values(ranks);
    if (new Set(keys2).size !== keys2.length) throw new Error("Duplicate sidebar order ranks");
    for (const rank of keys2) generateKeyBetween(rank, null);
  }
  return value;
}

export function reconcileParent(saved, nodeIds) {
  const ranks = saved ?? {};
  const added = nodeIds.filter((id2) => !Object.hasOwn(ranks, id2));
  const first2 = Object.values(ranks).sort(compareRank$1)[0] ?? null;
  const keys2 = generateNKeysBetween(null, first2, added.length);
  return Object.fromEntries([
    ...Object.entries(ranks),
    ...added.map((id2, index2) => [id2, keys2[index2]])
  ]);
}

export function sameRanks(a2, b3) {
  return !!a2 && Object.keys(a2).length === Object.keys(b3).length && Object.entries(b3).every(([id2, rank]) => a2[id2] === rank);
}

export const scriptRel = /* @__PURE__ */ (function detectScriptRel() {
  const relList = typeof document !== "undefined" && document.createElement("link").relList;
  return relList && relList.supports && relList.supports("modulepreload") ? "modulepreload" : "preload";
})();

export const seen = {};

export async function synchronizeWorkspacePersistenceReportsOnce() {
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

export const MAX_RANK_LENGTH = 64;

export class WorkspaceCanvasPersistenceUnavailableError extends Error {
  constructor() {
    super("Canvas persistence controller is unavailable");
    this.name = "WorkspaceCanvasPersistenceUnavailableError";
  }
}

export function publishPersistenceStatus(entry) {
  if (!entry.reportStatus) return;
  entry.reportVersion += 1;
  const promise = entry.reportStatus(entry.status);
  void promise.catch(() => {
  });
  entry.reportPromise = promise;
}

export const CANVAS_FRAME_DETACHED = "CANVAS_FRAME_DETACHED";
