// selection-toolbar-inner.jsx
import { jsxRuntimeExports, useTranslation, useAssetMetadataApi, reactExports, dedupedToast, CompositedSvg, CanvasNodeType, useAssetMetadataStore, useStore$3, Position, NodeToolbar$1, z$4 } from "../vendor.js";
import { useHtmlFullscreenApi } from "../infra/create-html-iframe-pool-store.jsx";
import { TooltipProvider$1 } from "../infra/create-recently-added-store.jsx";
import { isGenerationErrorStatus, isAssetBackedNode, CanvasMode } from "./group-nodes-in-canvas.js";
import { Xt$1, Dt$1, DIRECTION_MAP, DEFAULT_NODE_SPACING, DEFAULT_LAYER_SPACING } from "./layout-engine.js";
import { sizeOf, DEFAULT_NODE_SIZE } from "./node-tag-rings-canvas.jsx";
import { useGeneratingStateApi, useCanvasActions, useCanvasIsBoxSelecting, useCanvasIsDragging, Download } from "../media-editing/parse-item.jsx";
import { isNodeGenerating } from "./remap-clipboard.js";
import { parseNodeId } from "./resolve-derived-collision.js";
import { CLIP_STUDIO_PLUGIN_ID } from "../media-editing/canvas-image.jsx";
import {
  resolveCanvasPlatform,
  resolveCanvasShortcut$1,
  ToolbarSurface,
} from "../media-editing/use-lightbox-media-actions.jsx";
import {
  GroupIcon,
  UngroupIcon,
  PromoteToAssetIcon,
  AddToClipNodeIcon,
  AddToChatIcon,
  getAssetMetaByNodeIdFromStore,
} from "./generating-media-area.jsx";
import { isSubtitleFileName, isGroupColorKey } from "./prune-persisted-node-data.js";
import { Tooltip$1 } from "../generation/create-tracker.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  GroupColorPicker,
  collectSelectionToolbarChatAttachments,
  selectionToolbarAttachmentsEqual,
} from "./multi-select-plus-handle-inner.jsx";
import { SelectionTidyControl } from "./zoom-menu.jsx";
const NO_TIDY_CHANGE = {
  changed: false,
  checkpoint: null,
};
function SelectionToolbarInner({
  selectedIds,
  onAddToChat,
  groupAddToChatTargets,
  onInstantiatePlugin,
  onGroup,
  onUngroup,
  executableChildCount,
  onExecuteGroup,
  onCancelExecuteGroup,
  executingGroupIds,
  onPromoteToAsset,
  onDownloadAllFiles,
  onTidySubset,
  onTidyGroup,
  onTidyGroupChildren,
  onTidyBlocked,
}) {
  const { t: t2 } = useTranslation();
  const fullscreenApi = useHtmlFullscreenApi();
  const isDragging = useCanvasIsDragging();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const assets = useAssetMetadataStore((state2) => state2.assets);
  const { mergeNodeData } = useCanvasActions();
  const attachments = useStore$3(
    (s2) => collectSelectionToolbarChatAttachments(s2.nodeLookup, selectedIds, assets),
    selectionToolbarAttachmentsEqual,
  );
  const handleAddToChat = reactExports.useCallback(() => {
    if (!onAddToChat) return;
    for (const attachment of attachments) {
      onAddToChat(attachment.path, attachment.filename, attachment.nodeId);
    }
  }, [attachments, onAddToChat]);
  const handleGroupAddToChat = reactExports.useCallback(() => {
    if (!onAddToChat || !groupAddToChatTargets) return;
    for (const attachment of groupAddToChatTargets) {
      onAddToChat(attachment.filePath, attachment.filename, attachment.nodeId);
    }
  }, [groupAddToChatTargets, onAddToChat]);
  const clipSourceNodeIds = reactExports.useMemo(() => {
    const out = [];
    for (const nodeId of selectedIds) {
      const { assetId } = parseNodeId(nodeId);
      const path2 = assets.get(assetId)?.path;
      if (!path2) continue;
      const lower2 = path2.toLowerCase();
      if (
        isSubtitleFileName(lower2) ||
        /\.(mp4|mov|m4v|webm|mkv|avi)$/.test(lower2) ||
        /\.(mp3|wav|ogg|m4a|aac|flac)$/.test(lower2)
      ) {
        out.push(nodeId);
      }
    }
    return out;
  }, [assets, selectedIds]);
  const handleAddToClipNode = reactExports.useCallback(async () => {
    if (!onInstantiatePlugin || clipSourceNodeIds.length === 0) return;
    const nodeId = await onInstantiatePlugin({
      pluginId: CLIP_STUDIO_PLUGIN_ID,
      sourceNodeIds: clipSourceNodeIds,
    });
    if (nodeId) fullscreenApi.getState().enter(nodeId);
  }, [clipSourceNodeIds, fullscreenApi, onInstantiatePlugin]);
  const groupAnalysis = useStore$3(
    (s2) => {
      const lookup = s2.nodeLookup;
      if (selectedIds.length === 0) {
        return {
          canGroup: false,
          ungroupTarget: null,
        };
      }
      if (selectedIds.length === 1) {
        const node2 = lookup.get(selectedIds[0]);
        if (node2?.type === CanvasNodeType.Group) {
          return {
            canGroup: false,
            ungroupTarget: selectedIds[0],
          };
        }
        return {
          canGroup: false,
          ungroupTarget: null,
        };
      }
      let groupCount = 0;
      let outsiderCount = 0;
      for (const id2 of selectedIds) {
        const node2 = lookup.get(id2);
        if (!node2) continue;
        if (node2.type === CanvasNodeType.Group) {
          groupCount++;
          continue;
        }
        if (node2.parentId) continue;
        outsiderCount++;
      }
      const canGroup2 =
        groupCount === 0 ? outsiderCount >= 2 : outsiderCount >= 1 || groupCount >= 2;
      return {
        canGroup: canGroup2,
        ungroupTarget: null,
      };
    },
    (a2, b3) => a2.canGroup === b3.canGroup && a2.ungroupTarget === b3.ungroupTarget,
  );
  const childSubsetAnalysis = useStore$3(
    (s2) => {
      const lookup = s2.nodeLookup;
      if (selectedIds.length < 2)
        return {
          sameGroupId: null,
          mixed: false,
        };
      let commonParent;
      let sawGroupNode = false;
      for (const id2 of selectedIds) {
        const node2 = lookup.get(id2);
        if (!node2) continue;
        if (node2.type === CanvasNodeType.Group) {
          sawGroupNode = true;
          break;
        }
        const parent = node2.parentId ?? null;
        if (commonParent === void 0) commonParent = parent;
        else if (commonParent !== parent)
          return {
            sameGroupId: null,
            mixed: true,
          };
      }
      if (sawGroupNode) {
        return {
          sameGroupId: null,
          mixed: false,
        };
      }
      if (commonParent)
        return {
          sameGroupId: commonParent,
          mixed: false,
        };
      return {
        sameGroupId: null,
        mixed: false,
      };
    },
    (a2, b3) => a2.sameGroupId === b3.sameGroupId && a2.mixed === b3.mixed,
  );
  const groupBackgroundColor = useStore$3((s2) => {
    const target = groupAnalysis.ungroupTarget;
    if (!target) return void 0;
    const node2 = s2.nodeLookup.get(target);
    if (!node2 || node2.type !== CanvasNodeType.Group) return void 0;
    const raw2 = node2.data?.backgroundColor;
    return isGroupColorKey(raw2) ? raw2 : void 0;
  });
  const canGroup = !!onGroup && groupAnalysis.canGroup;
  const canUngroup = !!onUngroup && groupAnalysis.ungroupTarget != null;
  const handleGroup = reactExports.useCallback(() => {
    if (!onGroup) return;
    onGroup(selectedIds);
  }, [selectedIds, onGroup]);
  const handleUngroup = reactExports.useCallback(() => {
    if (!onUngroup || !groupAnalysis.ungroupTarget) return;
    onUngroup(groupAnalysis.ungroupTarget);
  }, [groupAnalysis.ungroupTarget, onUngroup]);
  const isExecutingThisGroup =
    groupAnalysis.ungroupTarget != null && !!executingGroupIds?.has(groupAnalysis.ungroupTarget);
  const handleExecuteGroup = reactExports.useCallback(() => {
    if (!groupAnalysis.ungroupTarget) return;
    if (isExecutingThisGroup) {
      onCancelExecuteGroup?.(groupAnalysis.ungroupTarget);
      return;
    }
    onExecuteGroup?.(groupAnalysis.ungroupTarget);
  }, [groupAnalysis.ungroupTarget, isExecutingThisGroup, onCancelExecuteGroup, onExecuteGroup]);
  const isSingleGroup = groupAnalysis.ungroupTarget != null;
  const handleTidy = reactExports.useCallback(
    (layout, includeDeps) => {
      if (isSingleGroup && groupAnalysis.ungroupTarget) {
        return onTidyGroup?.(groupAnalysis.ungroupTarget, layout, includeDeps) ?? NO_TIDY_CHANGE;
      }
      if (childSubsetAnalysis.mixed) {
        onTidyBlocked?.();
        return NO_TIDY_CHANGE;
      }
      if (childSubsetAnalysis.sameGroupId) {
        return (
          onTidyGroupChildren?.(childSubsetAnalysis.sameGroupId, selectedIds, layout) ??
          NO_TIDY_CHANGE
        );
      }
      return onTidySubset?.(layout, includeDeps) ?? NO_TIDY_CHANGE;
    },
    [
      isSingleGroup,
      groupAnalysis.ungroupTarget,
      childSubsetAnalysis.mixed,
      childSubsetAnalysis.sameGroupId,
      selectedIds,
      onTidyGroup,
      onTidyGroupChildren,
      onTidyBlocked,
      onTidySubset,
    ],
  );
  const showTidy = !!(onTidySubset || onTidyGroup);
  const showExecuteGroup =
    canUngroup &&
    (isExecutingThisGroup || (executableChildCount ?? 0) > 0) &&
    (!!onExecuteGroup || !!onCancelExecuteGroup);
  const handleBackgroundChange = reactExports.useCallback(
    (next2) => {
      const groupId2 = groupAnalysis.ungroupTarget;
      if (!groupId2) return;
      mergeNodeData(groupId2, {
        backgroundColor: next2,
      });
    },
    [groupAnalysis.ungroupTarget, mergeNodeData],
  );
  const handlePromoteToAsset = reactExports.useCallback(
    (e2) => {
      onPromoteToAsset?.(selectedIds, {
        x: e2.clientX,
        y: e2.clientY,
      });
    },
    [selectedIds, onPromoteToAsset],
  );
  const hasTableSelected = useStore$3((s2) => {
    const nodeLookup = s2.nodeLookup;
    return selectedIds.some((nodeId) => nodeLookup.get(nodeId)?.type === CanvasNodeType.Table);
  });
  const handleDownloadAllFiles = reactExports.useCallback(() => {
    onDownloadAllFiles?.(selectedIds);
  }, [onDownloadAllFiles, selectedIds]);
  const showAddToChat = selectedIds.length >= 2 && attachments.length > 0;
  const showGroupAddToChat = isSingleGroup && (groupAddToChatTargets?.length ?? 0) > 0;
  const showAddToClipNode =
    !!onInstantiatePlugin && selectedIds.length >= 2 && clipSourceNodeIds.length > 0;
  const showAnyAddToChat = showAddToChat || showGroupAddToChat;
  const handleAnyAddToChat = showGroupAddToChat ? handleGroupAddToChat : handleAddToChat;
  const showPromoteToAsset =
    !!onPromoteToAsset &&
    !hasTableSelected &&
    (selectedIds.length >= 2 || groupAnalysis.ungroupTarget != null);
  const showDownloadAllFiles = !!onDownloadAllFiles && groupAnalysis.ungroupTarget != null;
  const showTidyEntry = showTidy && (selectedIds.length >= 2 || isSingleGroup);
  const anythingVisible =
    showTidyEntry ||
    showAnyAddToChat ||
    showAddToClipNode ||
    showPromoteToAsset ||
    showDownloadAllFiles ||
    canGroup ||
    canUngroup;
  if (!anythingVisible) return null;
  const visible = !isDragging && !isBoxSelecting;
  const toolbarOffset = groupAnalysis.ungroupTarget != null ? 34 : 12;
  return (
    <NodeToolbar$1
      nodeId={selectedIds}
      isVisible={visible}
      position={Position.Top}
      offset={toolbarOffset}
      align="center"
    >
      <TooltipProvider$1 delay={150} closeDelay={0}>
        <ToolbarSurface className="animate-[toolbar-fade-in_0.15s_ease-out]">
          {showTidyEntry && (
            <SelectionTidyControl
              onTidy={handleTidy}
              showIncludeDeps={
                isSingleGroup || (!childSubsetAnalysis.sameGroupId && !childSubsetAnalysis.mixed)
              }
            />
          )}
          {canGroup && (
            <button
              type="button"
              title={t2("canvas.group")}
              onClick={handleGroup}
              className="canvas-toolbar-action"
              data-action-ui-id="canvas.group-button"
            >
              <GroupIcon size={20} />
              <span className="canvas-toolbar-label whitespace-nowrap">{t2("canvas.group")}</span>
            </button>
          )}
          {canUngroup && (
            <>
              <GroupColorPicker
                value={groupBackgroundColor}
                onChange={handleBackgroundChange}
                title={t2("canvas.groupBackground")}
              />
              <div aria-hidden="true" className="canvas-toolbar-separator" />
              {showExecuteGroup && (
                <>
                  <button
                    type="button"
                    title={
                      isExecutingThisGroup
                        ? t2("canvas.execGroup.cancel", "取消")
                        : t2("canvas.execGroup.button", "整组执行")
                    }
                    onClick={handleExecuteGroup}
                    className="canvas-toolbar-action"
                    data-action-ui-id={
                      isExecutingThisGroup
                        ? "canvas.cancel-group-execution-button"
                        : "canvas.execute-group-button"
                    }
                    data-variant={isExecutingThisGroup ? "primary" : void 0}
                  >
                    {isExecutingThisGroup ? (
                      <CompositedSvg
                        width={14}
                        height={14}
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <rect x="3" y="3" width="10" height="10" rx="1" />
                      </CompositedSvg>
                    ) : (
                      <CompositedSvg
                        width={16}
                        height={16}
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M4 3l9 5-9 5V3z" />
                      </CompositedSvg>
                    )}
                    <span className="canvas-toolbar-label whitespace-nowrap">
                      {isExecutingThisGroup
                        ? t2("canvas.execGroup.cancel", "取消")
                        : t2("canvas.execGroup.button", "整组执行")}
                    </span>
                  </button>
                  <div aria-hidden="true" className="canvas-toolbar-separator" />
                </>
              )}
              <button
                type="button"
                title={t2("canvas.ungroup")}
                onClick={handleUngroup}
                className="canvas-toolbar-action"
                data-action-ui-id="canvas.ungroup-toolbar-button"
              >
                <UngroupIcon size={20} />
                <span className="canvas-toolbar-label whitespace-nowrap">
                  {t2("canvas.ungroup")}
                </span>
              </button>
            </>
          )}
          {showPromoteToAsset && (
            <button
              type="button"
              title={t2("canvas.promoteToAsset")}
              onClick={handlePromoteToAsset}
              className="canvas-toolbar-action"
              data-action-ui-id="canvas.node-promote-to-asset"
            >
              <PromoteToAssetIcon />
              <span>{t2("canvas.promoteToAsset")}</span>
            </button>
          )}
          {showAddToClipNode && (
            <Tooltip$1
              content={t2("canvas.addToClipNode", {
                defaultValue: "添加到剪辑节点",
              })}
              side="top"
            >
              <button
                type="button"
                aria-label={t2("canvas.addToClipNode", {
                  defaultValue: "添加到剪辑节点",
                })}
                onClick={handleAddToClipNode}
                className="canvas-toolbar-action"
                data-action-ui-id="canvas.add-to-clip-node-button"
              >
                <AddToClipNodeIcon size={20} />
              </button>
            </Tooltip$1>
          )}
          {showAnyAddToChat && (
            <Tooltip$1 content={t2("canvas.addToChat")} side="top">
              <button
                type="button"
                aria-label={t2("canvas.addToChat")}
                onClick={handleAnyAddToChat}
                className="canvas-toolbar-action"
                data-action-ui-id="canvas.add-to-chat-button"
              >
                <AddToChatIcon />
              </button>
            </Tooltip$1>
          )}
          {showDownloadAllFiles && (
            <Tooltip$1 content={t2("canvas.downloadAllFiles")} side="top">
              <button
                type="button"
                aria-label={t2("canvas.downloadAllFiles")}
                onClick={handleDownloadAllFiles}
                className="canvas-toolbar-action"
                data-action-ui-id="canvas.group-download-all-files"
              >
                <Download size={20} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </Tooltip$1>
          )}
        </ToolbarSurface>
      </TooltipProvider$1>
    </NodeToolbar$1>
  );
}
export const SelectionToolbar = reactExports.memo(SelectionToolbarInner);
const PROMPT_PREVIEW_MAX = 200;
function shortenPrompt(prompt) {
  if (!prompt) return void 0;
  const trimmed = prompt.trim();
  if (!trimmed) return void 0;
  return trimmed.length > PROMPT_PREVIEW_MAX ? `${trimmed.slice(0, PROMPT_PREVIEW_MAX)}…` : trimmed;
}
function readStr(data2, key2) {
  if (!data2) return void 0;
  const v2 = data2[key2];
  return typeof v2 === "string" && v2.length > 0 ? v2 : void 0;
}
function buildDebugInfo(node2, ctx = {}) {
  const data2 = node2.data ?? {};
  let status = "unknown";
  const placeholderStatus = readStr(data2, "status");
  if (
    placeholderStatus === "pending" ||
    placeholderStatus === "generating" ||
    placeholderStatus === "loading"
  ) {
    status = "generating";
  } else if (isGenerationErrorStatus(placeholderStatus)) {
    status = "error";
  } else if (ctx.meta) {
    status = "success";
  } else if (ctx.generating) {
    status = "generating";
  }
  const cloudTraceId =
    readStr(data2, "cloudTraceId") ?? ctx.meta?.cloudTraceId ?? ctx.generating?.traceId;
  const cloudTaskId =
    readStr(data2, "cloudTaskId") ?? ctx.meta?.cloudTaskId ?? ctx.generating?.cloudTaskId;
  const providerTaskId = readStr(data2, "providerTaskId") ?? ctx.meta?.providerTaskId;
  return {
    timestamp: new Date().toISOString(),
    nodeId: node2.id,
    nodeType: node2.type,
    ...(isAssetBackedNode(node2.type)
      ? {
          assetId: parseNodeId(node2.id).assetId,
        }
      : {}),
    status,
    ...(cloudTraceId
      ? {
          cloudTraceId,
        }
      : {}),
    ...(cloudTaskId
      ? {
          cloudTaskId,
        }
      : {}),
    ...(providerTaskId
      ? {
          providerTaskId,
        }
      : {}),
    ...(status === "error" && readStr(data2, "errorMessage")
      ? {
          errorMessage: readStr(data2, "errorMessage"),
        }
      : {}),
    ...(ctx.meta?.model
      ? {
          model: ctx.meta.model,
        }
      : readStr(data2, "model")
        ? {
            model: readStr(data2, "model"),
          }
        : {}),
    ...(ctx.meta?.backend
      ? {
          backend: ctx.meta.backend,
        }
      : {}),
    ...(ctx.meta?.source_tool
      ? {
          sourceTool: ctx.meta.source_tool,
        }
      : {}),
    ...(ctx.meta?.params
      ? {
          params: ctx.meta.params,
        }
      : {}),
    ...(shortenPrompt(ctx.meta?.prompt ?? readStr(data2, "prompt"))
      ? {
          promptPreview: shortenPrompt(ctx.meta?.prompt ?? readStr(data2, "prompt")),
        }
      : {}),
  };
}
function shortTraceId(traceId) {
  if (!traceId) return void 0;
  return traceId.length > 8 ? `${traceId.slice(0, 8)}…` : traceId;
}
function collectPayloads(instance2, assetStore, generatingStore, nodeIds) {
  const graph = instance2.getGraph();
  const lookup = new Map(graph.nodes.map((n2) => [n2.id, n2]));
  const generating = generatingStore.getState().byNode;
  const payloads = [];
  for (const id2 of nodeIds) {
    const node2 = lookup.get(id2);
    if (!node2) continue;
    payloads.push(
      buildDebugInfo(node2, {
        meta: getAssetMetaByNodeIdFromStore(assetStore, id2),
        generating: generating.get(id2),
      }),
    );
  }
  return payloads;
}
export function useCopyDebugInfo(instance2) {
  const { t: t2 } = useTranslation();
  const assetStore = useAssetMetadataApi();
  const generatingStore = useGeneratingStateApi();
  const copyDebugShortcut = resolveCanvasShortcut$1("copyDebug").join(
    resolveCanvasPlatform() === "mac" ? "" : "+",
  );
  return reactExports.useCallback(
    (args) => {
      const targetIds = args?.nodeIds ?? instance2.selection.getSelected();
      if (targetIds.length === 0) {
        dedupedToast.info(
          t2("canvas.debug.noSelection", "Select a node first, then press {{shortcut}}", {
            shortcut: copyDebugShortcut,
          }),
        );
        return;
      }
      const payloads = collectPayloads(instance2, assetStore, generatingStore, targetIds);
      if (payloads.length === 0) return;
      const serialised = JSON.stringify(payloads.length === 1 ? payloads[0] : payloads, null, 2);
      const firstTrace = payloads.find((p3) => p3.cloudTraceId)?.cloudTraceId;
      const tracePreview = shortTraceId(firstTrace);
      const writeClipboard = async () => {
        if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
          dedupedToast.error(t2("canvas.debug.clipboardUnavailable", "Clipboard not available"));
          return;
        }
        try {
          await navigator.clipboard.writeText(serialised);
          if (tracePreview) {
            dedupedToast.success(
              t2("canvas.debug.copied", "Debug info copied (Trace ID: {{trace}})", {
                trace: tracePreview,
              }),
            );
          } else {
            dedupedToast.success(
              t2("canvas.debug.copiedNoTrace", "Debug info copied (no Trace ID — legacy asset)"),
            );
          }
        } catch (err) {
          dedupedToast.error(
            t2("canvas.debug.copyFailed", "Copy failed: {{message}}", {
              message: err instanceof Error ? err.message : String(err),
            }),
          );
        }
      };
      void writeClipboard();
    },
    [instance2, assetStore, generatingStore, t2, copyDebugShortcut],
  );
}
export function isNodeGenerationActive(node2, hasLiveGenerationState) {
  return hasLiveGenerationState || isNodeGenerating(node2);
}
function P$4(e2, n2) {
  let t2 = Date.now();
  try {
    return n2();
  } finally {
    console.log(e2 + " time: " + (Date.now() - t2) + "ms");
  }
}
function M$4(e2, n2) {
  return n2();
}
function he$1(e2, n2 = {}) {
  let t2 = n2.debugTiming ? P$4 : M$4;
  return t2("layout", () => {
    let r2 = t2("  buildLayoutGraph", () => Xt$1(e2));
    return (
      t2("  runLayout", () => Dt$1(r2, t2, n2)),
      t2("  updateInputGraph", () => At$1(e2, r2)),
      r2
    );
  });
}
function At$1(e2, n2) {
  (e2.nodes().forEach((t2) => {
    let r2 = e2.node(t2),
      o2 = n2.node(t2);
    r2 &&
      ((r2.x = o2.x),
      (r2.y = o2.y),
      (r2.order = o2.order),
      (r2.rank = o2.rank),
      n2.children(t2).length && ((r2.width = o2.width), (r2.height = o2.height)));
  }),
    e2.edges().forEach((t2) => {
      let r2 = e2.edge(t2),
        o2 = n2.edge(t2);
      ((r2.points = o2.points), Object.hasOwn(o2, "x") && ((r2.x = o2.x), (r2.y = o2.y)));
    }),
    (e2.graph().width = n2.graph().width),
    (e2.graph().height = n2.graph().height));
}
export function dagreLayoutWorkflow(nodes, edges, options) {
  const nodeIdSet = new Set(nodes.map((n2) => n2.id));
  const direction = DIRECTION_MAP[options?.direction ?? "LR"] ?? "LR";
  const nodeSpacing = options?.spacing?.y ?? DEFAULT_NODE_SPACING;
  const layerSpacing = options?.spacing?.x ?? DEFAULT_LAYER_SPACING;
  const mode2 = options?.mode ?? CanvasMode.Workflow;
  const g2 = new z$4.Graph({
    directed: true,
  });
  g2.setGraph({
    rankdir: direction,
    // dagre's nodesep is the within-rank (same-layer) gap → maps to ELK's
    // elk.spacing.nodeNode. ranksep is the between-rank gap → maps to
    // elk.layered.spacing.nodeNodeBetweenLayers.
    nodesep: nodeSpacing,
    ranksep: layerSpacing,
    // network-simplex is dagre's tightest, highest-quality ranker (matches
    // the intent of ELK's NETWORK_SIMPLEX layering) and is still ~30x faster
    // than elkjs at this scale.
    ranker: "network-simplex",
  });
  g2.setDefaultEdgeLabel(() => ({}));
  const sizeById = new Map();
  for (const n2 of nodes) {
    sizeById.set(n2.id, sizeOf(n2, mode2));
  }
  for (let i2 = nodes.length - 1; i2 >= 0; i2--) {
    const n2 = nodes[i2];
    const sz = sizeById.get(n2.id) ?? DEFAULT_NODE_SIZE;
    g2.setNode(n2.id, {
      width: sz.width,
      height: sz.height,
    });
  }
  for (let i2 = edges.length - 1; i2 >= 0; i2--) {
    const e2 = edges[i2];
    if (nodeIdSet.has(e2.source) && nodeIdSet.has(e2.target)) {
      g2.setEdge(e2.source, e2.target);
    }
  }
  he$1(g2);
  const positions = new Map();
  for (const id2 of g2.nodes()) {
    const node2 = g2.node(id2);
    if (!node2) continue;
    const sz = sizeById.get(id2) ?? DEFAULT_NODE_SIZE;
    positions.set(id2, {
      x: node2.x - sz.width / 2,
      y: node2.y - sz.height / 2,
    });
  }
  return positions;
}
