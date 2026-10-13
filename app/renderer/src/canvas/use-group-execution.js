// use-group-execution.js
import { CanvasNodeType, reactExports, useTranslation } from "../vendor.js";
import { dedupedToast, useAssetMetadataApi } from "../infra/agent-http-client.js";
import {
  resolveReferenceAudios,
  resolveReferenceTexts,
} from "../generation/resolve-reference-texts.js";
import { loadReferenceTextContent } from "../assets/parse-prompt-to-tiptap.js";
import {
  resolveReferenceImages,
  resolveReferenceVideos,
} from "../media-editing/base-backend.jsx";
import { getAssetMetaByNodeIdFromStore } from "./fullscreen-icon.jsx";
import {
  composePromptWithReferenceText,
  groupByLevel,
  isReexecutableGenerationNode,
} from "./is-reexecutable-generation-node.js";
import { restoreCanvasReferencePaths } from "../text-editor/restore-canvas-reference-paths.js";
import { buildAdjacency, topoSortLevels } from "./layout-category-lanes.js";
import {
  useCanvasBridge,
  useGeneratingStateApi,
} from "../media-editing/package.jsx";

function getString(data, key) {
  if (!data || typeof data !== "object") return "";
  const fieldValue = data[key];
  return typeof fieldValue === "string" ? fieldValue : "";
}

function getStringRecord(data, recordKey) {
  if (!data || typeof data !== "object") return {};
  const fieldValue = data[recordKey];
  if (!fieldValue || typeof fieldValue !== "object") return {};
  const out = {};
  for (const [key, val] of Object.entries(fieldValue)) {
    if (typeof val === "string") out[key] = val;
  }
  return out;
}

function getStringArray(data, key) {
  if (!data || typeof data !== "object") return void 0;
  const fieldValue = data[key];
  if (!Array.isArray(fieldValue)) return void 0;
  return fieldValue.filter((item) => typeof item === "string" && item.length > 0);
}

async function dispatchToBridge(
  node,
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
  switch (node.type) {
    case CanvasNodeType.Image: {
      if (refVideos.length > 0 || refAudios.length > 0) {
        if (!bridge.submitImg2Video)
          return {
            success: false,
            error: "no-bridge",
          };
        return bridge.submitImg2Video(
          node.id,
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
        node.id,
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
        node.id,
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
        node.id,
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
        node.id,
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
        error: `unsupported-type:${node.type}`,
      };
  }
}

async function runNode(
  node,
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
  const prompt = getString(node.data, "prompt");
  const modelId = getString(node.data, "model_id");
  const params = getStringRecord(node.data, "params");
  const replaceNodeId = node.id;
  const meta = getAssetMetaByNodeIdFromStore(assetStore, node.id);
  const {
    image: refImages,
    video: refVideos,
    audio: refAudios,
    text: refTexts,
  } = restoreCanvasReferencePaths(prompt, {
    image: resolveReferenceImages(
      incomingSourceIds,
      meta?.referenceImageIds,
      assetStore,
    ),
    video: resolveReferenceVideos(
      incomingSourceIds,
      meta?.referenceVideoIds,
      assetStore,
    ),
    audio: resolveReferenceAudios(
      incomingSourceIds,
      meta?.referenceAudioIds,
      assetStore,
    ),
    text: resolveReferenceTexts(
      incomingSourceIds,
      getStringArray(node.data, "referenceTextIds") ?? meta?.referenceTextIds,
      assetStore,
      getNodeById,
    ),
  });
  let effectivePrompt = prompt;
  if (
    (node.type === CanvasNodeType.Image ||
      node.type === CanvasNodeType.Video) &&
    refTexts.length > 0
  ) {
    try {
      const loaded = await loadReferenceTextContent(
        refTexts,
        bridge.loadTextContent,
      );
      effectivePrompt = composePromptWithReferenceText(loaded, prompt);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  const showsSpinner =
    node.type === CanvasNodeType.Image ||
    node.type === CanvasNodeType.Video ||
    node.type === CanvasNodeType.Audio;
  if (showsSpinner) {
    const prevUrl = getAssetMetaByNodeIdFromStore(assetStore, node.id)?.url;
    generatingStore.getState().mark(node.id, {
      prompt,
      model: modelId,
      modelId,
      prevUrl,
      params,
      generationStartedAt: new Date().toISOString(),
    });
  }
  const result = await dispatchToBridge(
    node,
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
    const current = generatingStore.getState().byNode.get(node.id);
    if (!current?.error) {
      generatingStore.getState().clear(node.id);
    }
  }
  return result;
}

export function useGroupExecution(instance) {
  const { t: translate } = useTranslation();
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
  const [executingGroupIds, setExecutingGroupIds] = reactExports.useState(
    new Set(),
  );
  const executeGroup = reactExports.useCallback(
    async (groupId) => {
      if (executingGroupIdsRef.current.has(groupId)) {
        if (typeof console !== "undefined") {
          console.warn("[group-exec] re-entry blocked", {
            groupId,
          });
        }
        return;
      }
      const myToken = (tokensByGroupRef.current.get(groupId) ?? 0) + 1;
      tokensByGroupRef.current.set(groupId, myToken);
      cancelledGroupsRef.current.delete(groupId);
      const nextStart = new Set(executingGroupIdsRef.current);
      nextStart.add(groupId);
      executingGroupIdsRef.current = nextStart;
      setExecutingGroupIds(nextStart);
      const isCancelled = () => cancelledGroupsRef.current.has(groupId);
      try {
        const graph = instance.getGraph();
        const childNodes = graph.nodes.filter((node) => node.parentId === groupId);
        if (childNodes.length === 0) {
          dedupedToast.info(translate("canvas.execGroup.empty", "组内没有节点"));
          return;
        }
        const childIds = new Set(childNodes.map((node) => node.id));
        const groupEdges = graph.edges.filter(
          (edge) => childIds.has(edge.source) && childIds.has(edge.target),
        );
        const incomingByTarget = new Map();
        for (const edge of graph.edges) {
          if (!childIds.has(edge.target)) continue;
          const arr = incomingByTarget.get(edge.target);
          if (arr) arr.push(edge.source);
          else incomingByTarget.set(edge.target, [edge.source]);
        }
        const { children, parents } = buildAdjacency(
          childIds,
          groupEdges,
        );
        const levelMap = topoSortLevels(childIds, children, parents);
        const layers = groupByLevel(levelMap);
        const nodeMap = new Map(childNodes.map((node) => [node.id, node]));
        const allNodesById = new Map(graph.nodes.map((node) => [node.id, node]));
        const getNodeById = (sourceId) => {
          const sourceNode = allNodesById.get(sourceId);
          return sourceNode
            ? {
                type: sourceNode.type,
                assetId: sourceNode.assetId,
                data: sourceNode.data ?? {},
              }
            : null;
        };
        const executable = new Set(
          childNodes
            .filter((node) => isReexecutableGenerationNode(node))
            .map((node) => node.id),
        );
        if (executable.size === 0) {
          dedupedToast.info(
            translate("canvas.execGroup.noExecutable", "组内没有可执行节点"),
          );
          return;
        }
        const totalLayers = layers.filter((layer) =>
          layer.some((id) => executable.has(id)),
        ).length;
        let layerIdx = 0;
        for (const layer of layers) {
          if (isCancelled()) break;
          const toRun = layer
            .filter((id) => executable.has(id))
            .map((id) => nodeMap.get(id))
            .filter((node) => !!node);
          if (toRun.length === 0) continue;
          layerIdx++;
          if (totalLayers > 1) {
            dedupedToast.info(
              translate("canvas.execGroup.layer", {
                current: layerIdx,
                total: totalLayers,
                defaultValue: `执行第 ${layerIdx}/${totalLayers} 层`,
              }),
            );
          }
          const results = await Promise.all(
            toRun.map((node) =>
              runNode(
                node,
                bridgeRef.current,
                isCancelled,
                assetStoreRef.current,
                generatingStoreRef.current,
                incomingByTarget.get(node.id) ?? [],
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
                translate(
                  "canvas.execGroup.incomplete",
                  "部分任务仍在恢复，已暂停后续执行",
                ),
              );
            } else {
              dedupedToast.error(translate("canvas.execGroup.failed", "整组执行失败"));
            }
            return;
          }
        }
        if (!isCancelled()) {
          dedupedToast.success(translate("canvas.execGroup.complete", "整组执行完成"));
        }
      } finally {
        if (tokensByGroupRef.current.get(groupId) === myToken) {
          const nextEnd = new Set(executingGroupIdsRef.current);
          nextEnd.delete(groupId);
          executingGroupIdsRef.current = nextEnd;
          setExecutingGroupIds(nextEnd);
          cancelledGroupsRef.current.delete(groupId);
        }
      }
    },
    [instance, translate],
  );
  const cancelExecution = reactExports.useCallback((groupId) => {
    if (!executingGroupIdsRef.current.has(groupId)) return;
    cancelledGroupsRef.current.add(groupId);
    tokensByGroupRef.current.set(
      groupId,
      (tokensByGroupRef.current.get(groupId) ?? 0) + 1,
    );
    const next = new Set(executingGroupIdsRef.current);
    next.delete(groupId);
    executingGroupIdsRef.current = next;
    setExecutingGroupIds(next);
  }, []);
  return {
    executeGroup,
    cancelExecution,
    executingGroupIds,
  };
}
