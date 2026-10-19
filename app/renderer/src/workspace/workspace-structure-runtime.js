/**
 * 工作区「结构运行时」（第 165 轮从产物取回）。
 *
 * 它产出 `runtime`，进而决定 `workspace` 句柄是否可用；
 * 没有它，`useWorkspaceStructureEvents` 的守卫永远 return，
 * `task_subscribe(structure-0)` 永远发不出去。
 *
 * 参考产物：index-BBp4hclA.js 428926–429084。
 *
 * 注意：本文件当前**未接线**。它依赖的 18 个设施符号已取回到
 * workspace-facilities.js，但那批符号自身还缺 41 个未还原的依赖，
 * 用占位会让「链路是否接通」无法证伪（第 166 轮的教训）。
 * 待设施层真还原后再接。
 *
 * 依赖来自 workspace-facilities-closure.js（第 173 轮按闭包清单取回）。
 */

import { GatewayNotReadyError } from "../infra/gateway-http-error.jsx";
import { API_PATHS } from "../infra/workspace-gateway.js";
import { createTreeHostBindings, createElectronHost, createHostWorkbench, createTaskDecisionStore, createTaskIntentPersistence, createCanvasDuplication, createCanvasInsertion, createCanvasImageReader, createCanvasImageImporter, createResourceAudioWaveformReader, createNativeWorkbenchPreferences, guardAccountSubmission, taskQueryKeys, resourceQueryKeys, compositionQueryKeys, bindStructurePersistence, READ_ONLY_STRUCTURE_ROUTES, workspaceEvents } from "./workspace-facilities.js";

function isReadOnlyStructureRequest(path2, init2) {
  return (init2?.method ?? "GET").toUpperCase() === "POST" && READ_ONLY_STRUCTURE_ROUTES.has(path2);
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

export { createWorkspaceStructureRuntime, isReadOnlyStructureRequest };
