// selection-toolbar-inner.jsx
import { CanvasNodeType, CompositedSvg, jsxRuntimeExports, LayoutTemplate, NodeToolbar$1 as NodeToolbar, Position, reactDomExports, reactExports, useStore$3 as useStore, useTranslation } from "../vendor.js";
import { useAssetMetadataStore } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "../media-editing/use-warn-missing-asset-meta.jsx";
import {
  DropdownMenuContent,
  ToolbarSurface,
} from "../media-editing/audio-lightbox.jsx";
import { TidyLayoutMenuItems } from "./tidy-layout-menu-items.jsx";
import { isAssetBackedNode } from "./compute-group-bounds-from-children.js";
import { parseNodeId } from "./find-free-position-from-anchor.js";
import {
  GROUP_COLOR_KEYS,
  isGroupColorKey,
  isSubtitleFileName,
} from "./is-reexecutable-generation-node.js";
import { GROUP_COLOR_PRESETS } from "../media-editing/group-color-presets.jsx";
import { useHtmlFullscreenApi } from "../infra/use-plugin-metadata-store.js";
import { TooltipProvider } from "../infra/create-recently-added-store.js";
import { useCanvasActions } from "../media-editing/use-canvas-actions.js";
import {
  Download,
  useCanvasIsBoxSelecting,
  useCanvasIsDragging,
} from "../media-editing/package.jsx";
import { CLIP_STUDIO_PLUGIN_ID } from "../media-editing/resolve-panorama-generation-presentation.js";
import { GroupIcon, UngroupIcon } from "./file-missing-icon.jsx";
import { PromoteToAssetIcon } from "./generating-media-area.jsx";
import { AddToChatIcon, AddToClipNodeIcon } from "./fullscreen-icon.jsx";
import { Tooltip } from "../generation/missing-asset-card.jsx";
function SelectionTidyControlInner({ onTidy, showIncludeDeps }) {
  const { t: t2 } = useTranslation();
  const label = t2("canvas.tidy");
  const [menuOpen, setMenuOpen] = reactExports.useState(false);
  const handleTidy = reactExports.useCallback(
    (layout, includeDeps) => {
      setMenuOpen(false);
      return onTidy(layout, includeDeps);
    },
    [onTidy],
  );
  return (
    <div className="relative">
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          type="button"
          title={label}
          aria-label={label}
          data-action-ui-id="canvas.selection-tidy"
          className="canvas-toolbar-action"
        >
          <LayoutTemplate size={20} strokeWidth={1.5} aria-hidden="true" />
          <span className="canvas-toolbar-label whitespace-nowrap">
            {label}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          data-action-ui-id="canvas.selection-tidy-menu"
          side="bottom"
          sideOffset={8}
          align="start"
          className="min-w-[200px]"
          variant="toolbar"
        >
          <TidyLayoutMenuItems
            onTidy={handleTidy}
            showIncludeDeps={showIncludeDeps}
            uiIdPrefix="canvas.selection-tidy"
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
const SelectionTidyControl = reactExports.memo(SelectionTidyControlInner);
const SWATCH_SIZE = 20;
const TRIGGER_SIZE = 18;
function ResetSwatch({ size: size2 = SWATCH_SIZE }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "block",
        width: size2,
        height: size2,
        borderRadius: "999px",
        background: "var(--canvas-group-swatch-reset-bg)",
        border: "1px solid var(--canvas-group-swatch-border)",
      }}
    />
  );
}
function SwatchButton({
  selected: selected2,
  onClick,
  label,
  dataActionUiId,
  selectionColor,
  children: children2,
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={selected2}
      onClick={onClick}
      className="relative inline-flex items-center justify-center rounded-full transition-transform hover:scale-110"
      style={{
        width: SWATCH_SIZE,
        height: SWATCH_SIZE,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        outline: selected2 ? `1.5px solid ${selectionColor}` : "none",
        outlineOffset: selected2 ? "1.5px" : void 0,
      }}
      data-action-ui-id={dataActionUiId}
    >
      {children2}
    </button>
  );
}
function GroupColorPicker({ value, onChange, title }) {
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const triggerRef = reactExports.useRef(null);
  const panelRef = reactExports.useRef(null);
  const [anchor, setAnchor] = reactExports.useState(null);
  const recomputeAnchor = reactExports.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setAnchor({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
  }, []);
  reactExports.useLayoutEffect(() => {
    if (!open) {
      setAnchor(null);
      return;
    }
    recomputeAnchor();
    const onWin = () => recomputeAnchor();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [open, recomputeAnchor]);
  reactExports.useEffect(() => {
    if (!open) return;
    const onPointerDown2 = (e2) => {
      const tgt = e2.target;
      if (!tgt) return;
      if (triggerRef.current?.contains(tgt)) return;
      if (panelRef.current?.contains(tgt)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown2, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown2, true);
  }, [open]);
  reactExports.useEffect(() => {
    if (!open) return;
    const onKey = (e2) => {
      if (e2.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const currentSwatch = value ? GROUP_COLOR_PRESETS[value]?.swatch : void 0;
  const triggerLabel = title ?? t2("canvas.groupBackground");
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title={triggerLabel}
        aria-label={triggerLabel}
        onClick={() => setOpen((prev) => !prev)}
        className="canvas-toolbar-action"
        data-action-ui-id="canvas.group-background-button"
        data-active={open || void 0}
      >
        {currentSwatch ? (
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: TRIGGER_SIZE,
              height: TRIGGER_SIZE,
              borderRadius: "999px",
              background: currentSwatch,
              border: `1px solid ${currentSwatch}`,
            }}
          />
        ) : (
          <ResetSwatch size={TRIGGER_SIZE} />
        )}
        <span className="canvas-toolbar-label whitespace-nowrap">
          {triggerLabel}
        </span>
      </button>
      {open &&
        anchor &&
        reactDomExports.createPortal(
          <div
            ref={panelRef}
            role="menu"
            aria-label={t2("canvas.groupBackground")}
            onContextMenu={(e2) => e2.preventDefault()}
            className="canvas-toolbar-menu flex h-9 items-center gap-[6px] px-2"
            style={{
              position: "fixed",
              top: anchor.top,
              left: anchor.left,
              transform: "translateX(-50%)",
              zIndex: 1e3,
            }}
          >
            <SwatchButton
              selected={value === void 0}
              onClick={() => {
                onChange(void 0);
                setOpen(false);
              }}
              label={t2("canvas.groupColor.reset")}
              dataActionUiId="canvas.group-background-reset"
              selectionColor="var(--canvas-controls-text)"
            >
              <ResetSwatch size={SWATCH_SIZE} />
            </SwatchButton>
            {GROUP_COLOR_KEYS.map((key2) => {
              const preset2 = GROUP_COLOR_PRESETS[key2];
              return (
                <SwatchButton
                  key={key2}
                  selected={value === key2}
                  onClick={() => {
                    onChange(key2);
                    setOpen(false);
                  }}
                  label={t2(`canvas.groupColor.${key2}`, {
                    defaultValue: key2,
                  })}
                  dataActionUiId={`canvas.group-background-${key2}`}
                  selectionColor={preset2.swatch}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: "block",
                      width: SWATCH_SIZE,
                      height: SWATCH_SIZE,
                      borderRadius: "999px",
                      background: preset2.swatch,
                      border: `1px solid ${preset2.swatch}`,
                    }}
                  />
                </SwatchButton>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
function getFilename(path2) {
  return path2.split("/").pop() ?? path2;
}
function readStringField(source, key2) {
  const value = source?.[key2];
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function selectionToolbarAttachmentsEqual(a2, b3) {
  if (a2 === b3) return true;
  if (a2.length !== b3.length) return false;
  for (let i2 = 0; i2 < a2.length; i2++) {
    if (
      a2[i2].path !== b3[i2].path ||
      a2[i2].nodeId !== b3[i2].nodeId ||
      a2[i2].filename !== b3[i2].filename
    ) {
      return false;
    }
  }
  return true;
}
function collectSelectionToolbarChatAttachments(allNodes, selectedIds, assets) {
  const nodeById = Array.isArray(allNodes)
    ? new Map(allNodes.map((node2) => [node2.id, node2]))
    : allNodes;
  let childrenByParent = null;
  const childrenOf2 = (parentId) => {
    if (!childrenByParent) {
      childrenByParent = new Map();
      for (const node2 of nodeById.values()) {
        if (!node2.parentId) continue;
        const siblings2 = childrenByParent.get(node2.parentId);
        if (siblings2) siblings2.push(node2);
        else childrenByParent.set(node2.parentId, [node2]);
      }
    }
    return childrenByParent.get(parentId) ?? [];
  };
  const seenPaths = new Set();
  const visited = new Set();
  const result = [];
  const pushPath2 = (nodeId, path2) => {
    if (seenPaths.has(path2)) return;
    seenPaths.add(path2);
    result.push({
      path: path2,
      filename: getFilename(path2),
      nodeId,
    });
  };
  const walk = (nodeId) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node2 = nodeById.get(nodeId);
    if (!node2) return;
    if (node2.type === CanvasNodeType.Group) {
      for (const child of childrenOf2(nodeId)) {
        walk(child.id);
      }
      return;
    }
    if (node2.type === CanvasNodeType.Table) {
      const tablePath = node2.data?.tablePath;
      if (typeof tablePath === "string" && tablePath.length > 0) {
        pushPath2(nodeId, tablePath);
      }
      return;
    }
    const nodeType = node2.type;
    if (typeof nodeType !== "string" || !isAssetBackedNode(nodeType)) return;
    const dataAssetId = readStringField(node2.data, "assetId");
    const dataPath = readStringField(node2.data, "path");
    const { assetId: parsedAssetId } = parseNodeId(nodeId);
    const meta2 =
      assets.get(nodeId) ??
      (node2.assetId ? assets.get(node2.assetId) : void 0) ??
      (dataAssetId ? assets.get(dataAssetId) : void 0) ??
      assets.get(parsedAssetId);
    const path2 = meta2?.path ?? dataPath;
    if (!path2) return;
    pushPath2(nodeId, path2);
  };
  for (const selectedId of selectedIds) {
    walk(selectedId);
  }
  return result;
}
const NO_TIDY_CHANGE = {
  changed: false,
  checkpoint: null,
};
export function SelectionToolbarInner({
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
  const attachments = useStore(
    (s2) =>
      collectSelectionToolbarChatAttachments(
        s2.nodeLookup,
        selectedIds,
        assets,
      ),
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
  const groupAnalysis = useStore(
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
        groupCount === 0
          ? outsiderCount >= 2
          : outsiderCount >= 1 || groupCount >= 2;
      return {
        canGroup: canGroup2,
        ungroupTarget: null,
      };
    },
    (a2, b3) =>
      a2.canGroup === b3.canGroup && a2.ungroupTarget === b3.ungroupTarget,
  );
  const childSubsetAnalysis = useStore(
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
  const groupBackgroundColor = useStore((s2) => {
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
    groupAnalysis.ungroupTarget != null &&
    !!executingGroupIds?.has(groupAnalysis.ungroupTarget);
  const handleExecuteGroup = reactExports.useCallback(() => {
    if (!groupAnalysis.ungroupTarget) return;
    if (isExecutingThisGroup) {
      onCancelExecuteGroup?.(groupAnalysis.ungroupTarget);
      return;
    }
    onExecuteGroup?.(groupAnalysis.ungroupTarget);
  }, [
    groupAnalysis.ungroupTarget,
    isExecutingThisGroup,
    onCancelExecuteGroup,
    onExecuteGroup,
  ]);
  const isSingleGroup = groupAnalysis.ungroupTarget != null;
  const handleTidy = reactExports.useCallback(
    (layout, includeDeps) => {
      if (isSingleGroup && groupAnalysis.ungroupTarget) {
        return (
          onTidyGroup?.(groupAnalysis.ungroupTarget, layout, includeDeps) ??
          NO_TIDY_CHANGE
        );
      }
      if (childSubsetAnalysis.mixed) {
        onTidyBlocked?.();
        return NO_TIDY_CHANGE;
      }
      if (childSubsetAnalysis.sameGroupId) {
        return (
          onTidyGroupChildren?.(
            childSubsetAnalysis.sameGroupId,
            selectedIds,
            layout,
          ) ?? NO_TIDY_CHANGE
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
  const hasTableSelected = useStore((s2) => {
    const nodeLookup = s2.nodeLookup;
    return selectedIds.some(
      (nodeId) => nodeLookup.get(nodeId)?.type === CanvasNodeType.Table,
    );
  });
  const handleDownloadAllFiles = reactExports.useCallback(() => {
    onDownloadAllFiles?.(selectedIds);
  }, [onDownloadAllFiles, selectedIds]);
  const showAddToChat = selectedIds.length >= 2 && attachments.length > 0;
  const showGroupAddToChat =
    isSingleGroup && (groupAddToChatTargets?.length ?? 0) > 0;
  const showAddToClipNode =
    !!onInstantiatePlugin &&
    selectedIds.length >= 2 &&
    clipSourceNodeIds.length > 0;
  const showAnyAddToChat = showAddToChat || showGroupAddToChat;
  const handleAnyAddToChat = showGroupAddToChat
    ? handleGroupAddToChat
    : handleAddToChat;
  const showPromoteToAsset =
    !!onPromoteToAsset &&
    !hasTableSelected &&
    (selectedIds.length >= 2 || groupAnalysis.ungroupTarget != null);
  const showDownloadAllFiles =
    !!onDownloadAllFiles && groupAnalysis.ungroupTarget != null;
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
    <NodeToolbar
      nodeId={selectedIds}
      isVisible={visible}
      position={Position.Top}
      offset={toolbarOffset}
      align="center"
    >
      <TooltipProvider delay={150} closeDelay={0}>
        <ToolbarSurface className="animate-[toolbar-fade-in_0.15s_ease-out]">
          {showTidyEntry && (
            <SelectionTidyControl
              onTidy={handleTidy}
              showIncludeDeps={
                isSingleGroup ||
                (!childSubsetAnalysis.sameGroupId && !childSubsetAnalysis.mixed)
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
              <span className="canvas-toolbar-label whitespace-nowrap">
                {t2("canvas.group")}
              </span>
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
                  <div
                    aria-hidden="true"
                    className="canvas-toolbar-separator"
                  />
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
            <Tooltip
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
            </Tooltip>
          )}
          {showAnyAddToChat && (
            <Tooltip content={t2("canvas.addToChat")} side="top">
              <button
                type="button"
                aria-label={t2("canvas.addToChat")}
                onClick={handleAnyAddToChat}
                className="canvas-toolbar-action"
                data-action-ui-id="canvas.add-to-chat-button"
              >
                <AddToChatIcon />
              </button>
            </Tooltip>
          )}
          {showDownloadAllFiles && (
            <Tooltip content={t2("canvas.downloadAllFiles")} side="top">
              <button
                type="button"
                aria-label={t2("canvas.downloadAllFiles")}
                onClick={handleDownloadAllFiles}
                className="canvas-toolbar-action"
                data-action-ui-id="canvas.group-download-all-files"
              >
                <Download size={20} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </Tooltip>
          )}
        </ToolbarSurface>
      </TooltipProvider>
    </NodeToolbar>
  );
}
