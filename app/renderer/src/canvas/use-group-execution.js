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
    image: resolveReferenceImages(
      incomingSourceIds,
      meta2?.referenceImageIds,
      assetStore,
    ),
    video: resolveReferenceVideos(
      incomingSourceIds,
      meta2?.referenceVideoIds,
      assetStore,
    ),
    audio: resolveReferenceAudios(
      incomingSourceIds,
      meta2?.referenceAudioIds,
      assetStore,
    ),
    text: resolveReferenceTexts(
      incomingSourceIds,
      getStringArray(node2.data, "referenceTextIds") ?? meta2?.referenceTextIds,
      assetStore,
      getNodeById,
    ),
  });
  let effectivePrompt = prompt;
  if (
    (node2.type === CanvasNodeType.Image ||
      node2.type === CanvasNodeType.Video) &&
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
  const [executingGroupIds, setExecutingGroupIds] = reactExports.useState(
    new Set(),
  );
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
        const { children: children2, parents } = buildAdjacency(
          childIds,
          groupEdges,
        );
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
          childNodes
            .filter((n2) => isReexecutableGenerationNode(n2))
            .map((n2) => n2.id),
        );
        if (executable.size === 0) {
          dedupedToast.info(
            t2("canvas.execGroup.noExecutable", "组内没有可执行节点"),
          );
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
                t2(
                  "canvas.execGroup.incomplete",
                  "部分任务仍在恢复，已暂停后续执行",
                ),
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
    tokensByGroupRef.current.set(
      groupId2,
      (tokensByGroupRef.current.get(groupId2) ?? 0) + 1,
    );
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
