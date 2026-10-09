// use-group-execution.js
import { useTranslation, useAssetMetadataApi, useReactFlow, reactExports, dedupedToast, CanvasNodeType, useStoreApi } from "../vendor.js";
import { CANVAS_MIN_ZOOM, CANVAS_MAX_ZOOM } from "../infra/create-html-iframe-pool-store.jsx";
import { buildAdjacency, topoSortLevels } from "./layout-engine.js";
import { useGeneratingStateApi, useCanvasBridge } from "../media-editing/parse-item.jsx";
import { resolveNodeAssetId } from "./remove-nodes-and-promote-group-mains.js";
import { resolveReferenceTexts, resolveReferenceAudios } from "../generation/resolve-reference-texts.js";
import { loadReferenceTextContent } from "../assets/use-assets-ref-validate.js";
import { resolveReferenceImages, resolveReferenceVideos } from "../media-editing/base-backend.jsx";
import { getAssetMetaByNodeIdFromStore } from "./generating-media-area.jsx";
import {
  groupByLevel,
  isReexecutableGenerationNode,
  composePromptWithReferenceText,
} from "./prune-persisted-node-data.js";
import { restoreCanvasReferencePaths } from "../text-editor/table-document-to-llm-content.js";
import { syncStableZoomAfter } from "../media-editing/decode-worker-pool.jsx";
import {
  CENTER_ON_NODES_DURATION_MS,
  CENTER_ON_NODES_MAX_FRAME_ZOOM,
  FIT_PADDING_RATIO,
  FRAME_PADDING_RATIO,
  easeOutQuart,
  interpolateFocusView,
} from "./use-canvas-context-menus.js";
function computeCenterOnBoundsViewport(bounds, canvasSize, currentZoom, minZoom, options = {}) {
  const padding = options.frame ? FRAME_PADDING_RATIO : FIT_PADDING_RATIO;
  const usableWidth = canvasSize.width * (1 - padding * 2);
  const usableHeight = canvasSize.height * (1 - padding * 2);
  const fitZoom =
    bounds.width > 0 && bounds.height > 0
      ? Math.min(usableWidth / bounds.width, usableHeight / bounds.height)
      : currentZoom;
  const maxZoom = options.frame
    ? Math.min(options.maxZoom ?? CENTER_ON_NODES_MAX_FRAME_ZOOM, CENTER_ON_NODES_MAX_FRAME_ZOOM)
    : currentZoom;
  const zoom2 = Math.max(minZoom, Math.min(maxZoom, fitZoom));
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  return {
    x: canvasSize.width / 2 - centerX * zoom2,
    y: canvasSize.height / 2 - centerY * zoom2,
    zoom: zoom2,
  };
}
function getNodesBounds(nodeIds, nodeLookup) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const id2 of nodeIds) {
    const node2 = nodeLookup.get(id2);
    const width = node2?.measured?.width;
    const height = node2?.measured?.height;
    if (!node2 || !width || !height) continue;
    const position2 = node2.internals.positionAbsolute;
    minX = Math.min(minX, position2.x);
    minY = Math.min(minY, position2.y);
    maxX = Math.max(maxX, position2.x + width);
    maxY = Math.max(maxY, position2.y + height);
  }
  if (!Number.isFinite(minX)) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
export function useCanvasViewportFocus(instance2) {
  const { fitView, getViewport, setViewport } = useReactFlow();
  const storeApi = useStoreApi();
  const syncStableZoomAfterViewportChange = reactExports.useCallback(
    (result) => syncStableZoomAfter(result, () => getViewport().zoom),
    [getViewport],
  );
  const handleFitView = reactExports.useCallback(() => {
    syncStableZoomAfterViewportChange(
      fitView({
        padding: 0.2,
        duration: 300,
      }),
    );
  }, [fitView, syncStableZoomAfterViewportChange]);
  const centerViewportOnNodes = reactExports.useCallback(
    (nodeIds, frame2 = false) => {
      const { nodeLookup, width, height } = storeApi.getState();
      const bounds = getNodesBounds(nodeIds, nodeLookup);
      if (!bounds || width <= 0 || height <= 0) return;
      const target = computeCenterOnBoundsViewport(
        bounds,
        {
          width,
          height,
        },
        getViewport().zoom,
        CANVAS_MIN_ZOOM,
        {
          frame: frame2,
          maxZoom: CANVAS_MAX_ZOOM,
        },
      );
      syncStableZoomAfterViewportChange(
        setViewport(target, {
          duration: CENTER_ON_NODES_DURATION_MS,
          ease: easeOutQuart,
          interpolate: interpolateFocusView,
        }),
      );
    },
    [getViewport, setViewport, storeApi, syncStableZoomAfterViewportChange],
  );
  const handleFocusSelection = reactExports.useCallback(() => {
    centerViewportOnNodes(instance2.selection.getSelected(), true);
  }, [centerViewportOnNodes, instance2]);
  const handleMinimapNodeSelect = reactExports.useCallback(
    (nodeId, additive) => {
      if (additive) {
        instance2.selection.toggle(nodeId);
        return;
      }
      instance2.selection.set([nodeId]);
      centerViewportOnNodes([nodeId]);
    },
    [centerViewportOnNodes, instance2],
  );
  return {
    handleFitView,
    handleFocusSelection,
    handleMinimapNodeSelect,
  };
}
function getString(data2, key2) {
  if (!data2 || typeof data2 !== "object") return "";
  const v2 = data2[key2];
  return typeof v2 === "string" ? v2 : "";
}
function getStringRecord(data2, key2) {
  if (!data2 || typeof data2 !== "object") return {};
  const v2 = data2[key2];
  if (!v2 || typeof v2 !== "object") return {};
  const out = {};
  for (const [k2, val] of Object.entries(v2)) {
    if (typeof val === "string") out[k2] = val;
  }
  return out;
}
function getStringArray(data2, key2) {
  if (!data2 || typeof data2 !== "object") return void 0;
  const v2 = data2[key2];
  if (!Array.isArray(v2)) return void 0;
  return v2.filter((item) => typeof item === "string" && item.length > 0);
}
export function useGroupExecution(instance2) {
  const { t: t2 } = useTranslation();
  const bridge = useCanvasBridge();
  const bridgeRef = reactExports.useRef(bridge);
  bridgeRef.current = bridge;
  const assetStoreRef = reactExports.useRef(useAssetMetadataApi());
  assetStoreRef.current = useAssetMetadataApi();
  const generatingStoreRef = reactExports.useRef(useGeneratingStateApi());
  generatingStoreRef.current = useGeneratingStateApi();
  const cancelledGroupsRef = reactExports.useRef(new Set());
  const tokensByGroupRef = reactExports.useRef(new Map());
  const executingGroupIdsRef = reactExports.useRef(new Set());
  const [executingGroupIds, setExecutingGroupIds] = reactExports.useState(new Set());
  const executeGroup = reactExports.useCallback(
    async (groupId2) => {
      if (executingGroupIdsRef.current.has(groupId2)) {
        if (typeof console !== "undefined") {
          console.warn("[group-exec] re-entry blocked", {
            groupId: groupId2,
          });
        }
        return;
      }
      const myToken = (tokensByGroupRef.current.get(groupId2) ?? 0) + 1;
      tokensByGroupRef.current.set(groupId2, myToken);
      cancelledGroupsRef.current.delete(groupId2);
      const nextStart = new Set(executingGroupIdsRef.current);
      nextStart.add(groupId2);
      executingGroupIdsRef.current = nextStart;
      setExecutingGroupIds(nextStart);
      const isCancelled = () => cancelledGroupsRef.current.has(groupId2);
      try {
        const graph = instance2.getGraph();
        const childNodes = graph.nodes.filter((n2) => n2.parentId === groupId2);
        if (childNodes.length === 0) {
          dedupedToast.info(t2("canvas.execGroup.empty", "组内没有节点"));
          return;
        }
        const childIds = new Set(childNodes.map((n2) => n2.id));
        const groupEdges = graph.edges.filter(
          (e2) => childIds.has(e2.source) && childIds.has(e2.target),
        );
        const incomingByTarget = new Map();
        for (const edge of graph.edges) {
          if (!childIds.has(edge.target)) continue;
          const arr = incomingByTarget.get(edge.target);
          if (arr) arr.push(edge.source);
          else incomingByTarget.set(edge.target, [edge.source]);
        }
        const { children: children2, parents } = buildAdjacency(childIds, groupEdges);
        const levelMap = topoSortLevels(childIds, children2, parents);
        const layers = groupByLevel(levelMap);
        const nodeMap = new Map(childNodes.map((n2) => [n2.id, n2]));
        const allNodesById = new Map(graph.nodes.map((n2) => [n2.id, n2]));
        const getNodeById = (sourceId) => {
          const n2 = allNodesById.get(sourceId);
          return n2
            ? {
                type: n2.type,
                assetId: n2.assetId,
                data: n2.data ?? {},
              }
            : null;
        };
        const executable = new Set(
          childNodes.filter((n2) => isReexecutableGenerationNode(n2)).map((n2) => n2.id),
        );
        if (executable.size === 0) {
          dedupedToast.info(t2("canvas.execGroup.noExecutable", "组内没有可执行节点"));
          return;
        }
        const totalLayers = layers.filter((layer2) =>
          layer2.some((id2) => executable.has(id2)),
        ).length;
        let layerIdx = 0;
        for (const layer2 of layers) {
          if (isCancelled()) break;
          const toRun = layer2
            .filter((id2) => executable.has(id2))
            .map((id2) => nodeMap.get(id2))
            .filter((n2) => !!n2);
          if (toRun.length === 0) continue;
          layerIdx++;
          if (totalLayers > 1) {
            dedupedToast.info(
              t2("canvas.execGroup.layer", {
                current: layerIdx,
                total: totalLayers,
                defaultValue: `执行第 ${layerIdx}/${totalLayers} 层`,
              }),
            );
          }
          const results = await Promise.all(
            toRun.map((node2) =>
              runNode(
                node2,
                bridgeRef.current,
                isCancelled,
                assetStoreRef.current,
                generatingStoreRef.current,
                incomingByTarget.get(node2.id) ?? [],
                getNodeById,
              ),
            ),
          );
          if (isCancelled()) break;
          const failures = results.filter((result) => !result.success);
          if (failures.length > 0) {
            const onlyRecoverable = failures.every(
              (failure) => failure.errorStatus === "recoverable_error",
            );
            if (onlyRecoverable) {
              dedupedToast.warning(
                t2("canvas.execGroup.incomplete", "部分任务仍在恢复，已暂停后续执行"),
              );
            } else {
              dedupedToast.error(t2("canvas.execGroup.failed", "整组执行失败"));
            }
            return;
          }
        }
        if (!isCancelled()) {
          dedupedToast.success(t2("canvas.execGroup.complete", "整组执行完成"));
        }
      } finally {
        if (tokensByGroupRef.current.get(groupId2) === myToken) {
          const nextEnd = new Set(executingGroupIdsRef.current);
          nextEnd.delete(groupId2);
          executingGroupIdsRef.current = nextEnd;
          setExecutingGroupIds(nextEnd);
          cancelledGroupsRef.current.delete(groupId2);
        }
      }
    },
    [instance2, t2],
  );
  const cancelExecution = reactExports.useCallback((groupId2) => {
    if (!executingGroupIdsRef.current.has(groupId2)) return;
    cancelledGroupsRef.current.add(groupId2);
    tokensByGroupRef.current.set(groupId2, (tokensByGroupRef.current.get(groupId2) ?? 0) + 1);
    const next2 = new Set(executingGroupIdsRef.current);
    next2.delete(groupId2);
    executingGroupIdsRef.current = next2;
    setExecutingGroupIds(next2);
  }, []);
  return {
    executeGroup,
    cancelExecution,
    executingGroupIds,
  };
}
async function runNode(
  node2,
  bridge,
  isCancelled,
  assetStore,
  generatingStore,
  incomingSourceIds,
  getNodeById,
) {
  if (isCancelled())
    return {
      success: false,
      error: "cancelled",
    };
  const prompt = getString(node2.data, "prompt");
  const modelId = getString(node2.data, "model_id");
  const params = getStringRecord(node2.data, "params");
  const replaceNodeId = node2.id;
  const meta2 = getAssetMetaByNodeIdFromStore(assetStore, node2.id);
  const {
    image: refImages,
    video: refVideos,
    audio: refAudios,
    text: refTexts,
  } = restoreCanvasReferencePaths(prompt, {
    image: resolveReferenceImages(incomingSourceIds, meta2?.referenceImageIds, assetStore),
    video: resolveReferenceVideos(incomingSourceIds, meta2?.referenceVideoIds, assetStore),
    audio: resolveReferenceAudios(incomingSourceIds, meta2?.referenceAudioIds, assetStore),
    text: resolveReferenceTexts(
      incomingSourceIds,
      getStringArray(node2.data, "referenceTextIds") ?? meta2?.referenceTextIds,
      assetStore,
      getNodeById,
    ),
  });
  let effectivePrompt = prompt;
  if (
    (node2.type === CanvasNodeType.Image || node2.type === CanvasNodeType.Video) &&
    refTexts.length > 0
  ) {
    try {
      const loaded = await loadReferenceTextContent(refTexts, bridge.loadTextContent);
      effectivePrompt = composePromptWithReferenceText(loaded, prompt);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  const showsSpinner =
    node2.type === CanvasNodeType.Image ||
    node2.type === CanvasNodeType.Video ||
    node2.type === CanvasNodeType.Audio;
  if (showsSpinner) {
    const prevUrl = getAssetMetaByNodeIdFromStore(assetStore, node2.id)?.url;
    generatingStore.getState().mark(node2.id, {
      prompt,
      model: modelId,
      modelId,
      prevUrl,
      params,
      generationStartedAt: new Date().toISOString(),
    });
  }
  const result = await dispatchToBridge(
    node2,
    effectivePrompt,
    modelId,
    params,
    replaceNodeId,
    refImages,
    refVideos,
    refAudios,
    refTexts,
    bridge,
  );
  if (showsSpinner && !result.success) {
    const current2 = generatingStore.getState().byNode.get(node2.id);
    if (!current2?.error) {
      generatingStore.getState().clear(node2.id);
    }
  }
  return result;
}
async function dispatchToBridge(
  node2,
  prompt,
  modelId,
  params,
  replaceNodeId,
  refImages,
  refVideos,
  refAudios,
  refTexts,
  bridge,
) {
  switch (node2.type) {
    case CanvasNodeType.Image: {
      if (refVideos.length > 0 || refAudios.length > 0) {
        if (!bridge.submitImg2Video)
          return {
            success: false,
            error: "no-bridge",
          };
        return bridge.submitImg2Video(
          node2.id,
          prompt,
          modelId,
          params,
          refImages,
          refVideos,
          refAudios,
          replaceNodeId,
          void 0,
          void 0,
          void 0,
          void 0,
          refTexts,
        );
      }
      if (!bridge.submitImg2Image)
        return {
          success: false,
          error: "no-bridge",
        };
      return bridge.submitImg2Image(
        node2.id,
        prompt,
        modelId,
        params,
        refImages,
        replaceNodeId,
        void 0,
        void 0,
        void 0,
        void 0,
        refTexts,
      );
    }
    case CanvasNodeType.Video: {
      if (!bridge.submitImg2Video)
        return {
          success: false,
          error: "no-bridge",
        };
      return bridge.submitImg2Video(
        node2.id,
        prompt,
        modelId,
        params,
        refImages,
        refVideos,
        refAudios,
        replaceNodeId,
        void 0,
        void 0,
        void 0,
        void 0,
        refTexts,
      );
    }
    case CanvasNodeType.Audio: {
      if (!bridge.submitTxt2Audio)
        return {
          success: false,
          error: "no-bridge",
        };
      return bridge.submitTxt2Audio(
        node2.id,
        prompt,
        modelId,
        params,
        replaceNodeId,
        void 0,
        void 0,
        void 0,
        void 0,
        refTexts,
      );
    }
    case CanvasNodeType.Text: {
      if (!bridge.submitTxt2Text)
        return {
          success: false,
          error: "no-bridge",
        };
      return bridge.submitTxt2Text(
        node2.id,
        prompt,
        modelId,
        params,
        refImages,
        refTexts,
        refVideos,
        refAudios,
      );
    }
    default:
      return {
        success: false,
        error: `unsupported-type:${node2.type}`,
      };
  }
}
export function useHistoryState(instance2) {
  const [canUndo, setCanUndo] = reactExports.useState(() => instance2.canUndo());
  const [canRedo, setCanRedo] = reactExports.useState(() => instance2.canRedo());
  reactExports.useEffect(() => {
    const sync = () => {
      setCanUndo(instance2.canUndo());
      setCanRedo(instance2.canRedo());
    };
    sync();
    return instance2.history.onHistoryChange(sync);
  }, [instance2]);
  return {
    canUndo,
    canRedo,
  };
}
export function readSourcePath(sourceNode, clipboard2, assetMetadataStore) {
  const assetId = resolveNodeAssetId(sourceNode);
  const clipboardPath = assetId ? clipboard2?.assetPaths?.[assetId] : void 0;
  if (typeof clipboardPath === "string" && clipboardPath.length > 0) return clipboardPath;
  const data2 = sourceNode.data;
  const dataPath = data2?.path;
  if (typeof dataPath === "string" && dataPath.length > 0) return dataPath;
  return assetId ? assetMetadataStore.getState().get(assetId)?.path : void 0;
}
export function isCrossWorkspacePaste(sourceWorkspace, currentWorkspace) {
  if (sourceWorkspace == null && currentWorkspace == null) return false;
  return sourceWorkspace !== currentWorkspace;
}
export function inferKind(nodeType) {
  if (nodeType === CanvasNodeType.Image) return "image";
  if (nodeType === CanvasNodeType.Video) return "video";
  if (nodeType === CanvasNodeType.Audio) return "audio";
  if (nodeType === CanvasNodeType.Text) return "text";
  return void 0;
}
export function promoteToPrimary(node2, duplicated, assetMetadataStore) {
  const { cloneOf: sourceNodeId, ...metaWithoutClone } = node2.meta ?? {};
  const { cloneOf: _dataCloneOf, assetId: _dataAssetId, ...dataWithoutClone } = node2.data ?? {};
  const pluginId = dataWithoutClone.pluginId;
  const pluginStorageCloneOf =
    typeof pluginId === "string" && pluginId.length > 0 && typeof sourceNodeId === "string"
      ? sourceNodeId
      : void 0;
  const nextMeta = {
    ...metaWithoutClone,
    ...(pluginStorageCloneOf
      ? {
          pluginStorageCloneOf,
        }
      : {}),
  };
  assetMetadataStore.getState().merge(node2.id, duplicated);
  return {
    ...node2,
    assetId: duplicated.assetId,
    data: {
      ...dataWithoutClone,
      assetId: duplicated.assetId,
      name: duplicated.name,
      path: duplicated.path,
    },
    meta: Object.keys(nextMeta).length > 0 ? nextMeta : void 0,
  };
}
