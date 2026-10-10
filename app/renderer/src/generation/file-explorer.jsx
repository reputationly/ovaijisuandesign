// file-explorer.jsx
import { LayoutGrid, LayoutList, reactExports, useCurrentWorkspace, usePlatform, useQueryClient, useStorage, useTranslation, useVirtualizer } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  AlertDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  DialogDescription,
  DialogTitle,
} from "../infra/badge-variants.jsx";
import { AssetGridItemImpl } from "../assets/asset-grid-item-impl.jsx";
import { arePropsEqual } from "../assets/inline-input.jsx";
import { TreeItem } from "../assets/tree-item.jsx";
import {
  categorizeByExtension,
  computeDateBounds,
  matchesDateFilter,
} from "../workspace/compute-date-bounds.js";
import {
  compareByTimeOrName,
  DEFAULTS,
  joinFilePath,
  matchesTagFilter,
  normalizeAssetPanelPreferences,
  toRelativeFromRoot,
  useFileExplorerCanvasIntegration,
} from "../assets/use-file-explorer-canvas-integration.js";
import { findEntryByPath } from "../workspace/set-home-widget-dev-preview-mode.js";
import {
  shouldClosePanel,
  useFileExplorerRename,
  useFileExplorerRootDrop,
  useFileExplorerScrollContainer,
  useFileExplorerSelection,
} from "../assets/use-file-explorer-root-drop.js";
import { PromoteToAssetForm } from "../assets/promote-to-asset-form.jsx";
import { TypeFilterPopover } from "./type-filter-popover.jsx";
import { DateFilterPopover } from "./date-filter-popover.jsx";
import { TagFilterPopover } from "./tag-filter-popover.jsx";
import { getNodeIdsForAsset } from "../infra/use-canvas-node-assets-store.js";
import { useStableCallback } from "../assets/use-cloud-review-nodes.js";
import {
  ContextMenu,
  workspaceEvents,
} from "../workspace/topbar-state-context.jsx";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { FolderOpen } from "../media-editing/package.jsx";
import {
  useGatewayFetch,
  useGatewayScopeKey,
} from "./use-model-catalog-scope-key.js";
import { useWorkspaceProject } from "../workspace/normalize-project-entries.js";
import { PageStateBoundary } from "../assets/page-state-boundary.jsx";
import { RetryIcon } from "../workspace/use-prompt-icon.jsx";
import { ContextMenuTrigger } from "../workspace/context-menu-content.jsx";
import { SegmentedSwitch } from "../canvas/popover-title.jsx";
import { PRESET_COLOR_NAME_KEYS } from "../infra/parse-connector-selection.js";
import { useAssets } from "../settings/use-assets.js";
import { useMediaActions } from "../settings/use-media-actions.js";
import { AssetPanelOverlayHost } from "../assets/asset-panel-overlay-host.jsx";
import { SaveToProjectAssetsDialog } from "../workspace/save-to-project-assets-dialog.jsx";
import { FileExplorerSearchBar } from "../assets/file-explorer-search-bar.jsx";
import { useAssetMenuShortcuts } from "../assets/use-asset-menu-shortcuts.js";
import {
  ConflictResolutionDialog,
  useTagRegistry,
} from "../canvas/conflict-resolution-dialog.jsx";
import { useFileExplorerClipboard } from "../assets/use-file-explorer-clipboard.js";
import { useFileExplorerCreate } from "../assets/use-file-explorer-create.js";
import { useFileExplorerDelete } from "../assets/use-file-explorer-delete.jsx";
import {
  useFileExplorerDrag,
  useFileExplorerGridDelegates,
} from "../assets/use-file-explorer-grid-delegates.js";
import { useFileExplorerImport } from "../assets/use-file-explorer-import.js";
import { useFileExplorerKeyboard } from "../assets/use-file-explorer-keyboard.js";
import { useFileExplorerMissingRecovery } from "../assets/use-file-explorer-missing-recovery.js";
import { useFileExplorerShortcuts } from "../assets/use-file-explorer-shortcuts.js";
import {
  AssetEmptyAreaMenuContent,
  useFlattenTree,
} from "../assets/asset-empty-area-menu-content.jsx";
import { useFileExplorerWorkspaceDirs } from "../assets/build-asset-tree.js";
function useFileExplorerOverlayBridge({
  rootPath,
  assetByAbsPath,
  currentWorkspace,
  filteredTree,
  handleAddToCanvas,
}) {
  const overlayHostRef = reactExports.useRef(null);
  const rowAnchorsRef = reactExports.useRef(new Map());
  const registerRowAnchor = useStableCallback((path2, el) => {
    if (el) {
      rowAnchorsRef.current.set(path2, el);
    } else {
      rowAnchorsRef.current.delete(path2);
    }
  });
  const getRowAnchor = useStableCallback((path2) =>
    rowAnchorsRef.current.get(path2),
  );
  const handleHoverIntent = useStableCallback((target) => {
    overlayHostRef.current?.notifyHoverIntent(target);
  });
  const handleHoverEnd = useStableCallback(() => {
    overlayHostRef.current?.notifyHoverEnd();
  });
  const handleLocateOnCanvas = useStableCallback((target) => {
    const asset = assetByAbsPath.get(target.path);
    const showMissing = () => {
      const anchor = rowAnchorsRef.current.get(target.path);
      if (!anchor) {
        return;
      }
      overlayHostRef.current?.showLocateMissing(anchor, target.path);
    };
    if (!asset?.id) {
      showMissing();
      return;
    }
    const nodeIds = getNodeIdsForAsset(asset.id, currentWorkspace);
    if (nodeIds.length === 0) {
      showMissing();
      return;
    }
    overlayHostRef.current?.hideLocateMissing();
    workspaceEvents.fireCanvasFocus(currentWorkspace, nodeIds);
  });
  const handleHoverLocateOnCanvas = useStableCallback((absolutePath) => {
    handleLocateOnCanvas({
      path: absolutePath,
      name: absolutePath.split(/[/\\]/).pop() ?? absolutePath,
      isDirectory: false,
    });
  });
  const handleLocateMissingConfirmInsert = useStableCallback((absolutePath) => {
    const entry = findEntryByPath(filteredTree, absolutePath);
    handleAddToCanvas({
      path: absolutePath,
      name: entry?.name ?? absolutePath.split(/[/\\]/).pop() ?? absolutePath,
      isDirectory: entry?.isDirectory ?? false,
    });
  });
  reactExports.useEffect(() => {
    overlayHostRef.current?.hideLocateMissing();
  }, [rootPath]);
  return {
    overlayHostRef,
    registerRowAnchor,
    getRowAnchor,
    handleHoverIntent,
    handleHoverEnd,
    handleHoverLocateOnCanvas,
    handleLocateOnCanvas,
    handleLocateMissingConfirmInsert,
  };
}
function useConflictResolver() {
  const [batch2, setBatch] = reactExports.useState(null);
  const pendingRef = reactExports.useRef(null);
  const finishBatch = reactExports.useCallback((value) => {
    const resolver2 = pendingRef.current;
    pendingRef.current = null;
    setBatch(null);
    resolver2?.(value);
  }, []);
  const resolve = reactExports.useCallback(
    async (conflicts) => {
      if (conflicts.length === 0)
        return {
          outcome: "completed",
          decisions: [],
        };
      if (pendingRef.current) {
        finishBatch({
          outcome: "preempted",
        });
      }
      return new Promise((resolvePromise) => {
        pendingRef.current = resolvePromise;
        setBatch({
          conflicts,
          cursor: 0,
          decisions: [],
        });
      });
    },
    [finishBatch],
  );
  const handleDecision = reactExports.useCallback(
    (decision, applyToAll) => {
      setBatch((prev) => {
        if (!prev) return prev;
        if (applyToAll) {
          const filled = [
            ...prev.decisions,
            ...new Array(prev.conflicts.length - prev.cursor).fill(decision),
          ];
          queueMicrotask(() =>
            finishBatch({
              outcome: "completed",
              decisions: filled,
            }),
          );
          return prev;
        }
        const nextDecisions = [...prev.decisions, decision];
        const nextCursor = prev.cursor + 1;
        if (nextCursor >= prev.conflicts.length) {
          queueMicrotask(() =>
            finishBatch({
              outcome: "completed",
              decisions: nextDecisions,
            }),
          );
          return prev;
        }
        return {
          ...prev,
          cursor: nextCursor,
          decisions: nextDecisions,
        };
      });
    },
    [finishBatch],
  );
  const handleDismiss = reactExports.useCallback(
    () =>
      finishBatch({
        outcome: "dismissed",
      }),
    [finishBatch],
  );
  const dialogProps = reactExports.useMemo(() => {
    const conflict = batch2 ? (batch2.conflicts[batch2.cursor] ?? null) : null;
    const remainingCount = batch2
      ? Math.max(0, batch2.conflicts.length - batch2.cursor - 1)
      : 0;
    return {
      open: !!batch2,
      conflict,
      remainingCount,
      onDecision: handleDecision,
      onDismiss: handleDismiss,
    };
  }, [batch2, handleDecision, handleDismiss]);
  return {
    dialogProps,
    resolve,
  };
}
function matchesTypeFilters(fileName, types2) {
  if (types2.length === 0) return true;
  return types2.includes(categorizeByExtension(fileName));
}
function retainKnownTagFilters(tagFilters, knownTagIds) {
  const known = new Set(knownTagIds);
  const retained = tagFilters.filter((id2) => known.has(id2));
  return retained.length === tagFilters.length ? tagFilters : retained;
}
function buildTreeFileComparator(sortOrder, getAsset2) {
  return (a2, b3) =>
    compareByTimeOrName(
      getAsset2(a2.path)?.time,
      getAsset2(b3.path)?.time,
      a2.name,
      b3.name,
      sortOrder,
    );
}
function filterAndSortAssets(assets, options) {
  const q2 = options.query.trim().toLowerCase();
  const dateBounds = computeDateBounds(options.dateFilter);
  const filtered = assets.filter((a2) => {
    const fileName = a2.path.split("/").pop() ?? "";
    const nameMatch = q2 ? fileName.toLowerCase().includes(q2) : true;
    const tagNameMatch =
      q2 && options.tagSearchIds
        ? (a2.tagIds ?? []).some((id2) => options.tagSearchIds?.has(id2))
        : false;
    if (!nameMatch && !tagNameMatch) return false;
    if (!matchesTypeFilters(fileName, options.typeFilters)) return false;
    if (!matchesTagFilter(a2.tagIds, options.tagFilters)) return false;
    return matchesDateFilter(a2.time, dateBounds);
  });
  return [...filtered].sort((a2, b3) =>
    compareByTimeOrName(a2.time, b3.time, a2.path, b3.path, options.sortOrder),
  );
}
function filterTreeByPredicate(tree, options) {
  const q2 = options.query.trim().toLowerCase();
  const dateBounds = computeDateBounds(options.dateFilter);
  const noActiveFilter =
    q2 === "" &&
    options.typeFilters.length === 0 &&
    dateBounds === null &&
    (options.tagFilters?.length ?? 0) === 0;
  function matchesFile(entry) {
    const asset = options.getAsset(entry.path);
    const nameMatch = q2 ? entry.name.toLowerCase().includes(q2) : true;
    const tagNameMatch =
      q2 && options.tagSearchIds
        ? (asset?.tagIds ?? []).some((id2) => options.tagSearchIds?.has(id2))
        : false;
    if (!nameMatch && !tagNameMatch) return false;
    if (!matchesTypeFilters(entry.name, options.typeFilters)) return false;
    if (!matchesTagFilter(asset?.tagIds, options.tagFilters)) return false;
    return matchesDateFilter(asset?.time, dateBounds);
  }
  function walk(entries2) {
    const result = [];
    for (const entry of entries2) {
      if (entry.isDirectory) {
        const dirNameMatch = q2 ? entry.name.toLowerCase().includes(q2) : false;
        const wasOriginallyEmpty =
          !entry.children || entry.children.length === 0;
        const filteredChildren = entry.children ? walk(entry.children) : [];
        if (
          dirNameMatch ||
          filteredChildren.length > 0 ||
          (wasOriginallyEmpty && noActiveFilter)
        ) {
          result.push({
            ...entry,
            children: filteredChildren,
          });
        }
      } else if (matchesFile(entry)) {
        result.push(entry);
      }
    }
    return result;
  }
  return walk(tree);
}
function useAssetPanelPreferences() {
  const [stored, setAssetPanel] = useStorage("workspace.assetPanel");
  const value = reactExports.useMemo(
    () => normalizeAssetPanelPreferences(stored),
    [stored],
  );
  const { typeFilters, dateFilter, sortOrder } = value;
  const setTypeFilters = reactExports.useCallback(
    (next2) => {
      setAssetPanel({
        typeFilters: next2,
      });
    },
    [setAssetPanel],
  );
  const setDateFilter = reactExports.useCallback(
    (next2) => {
      setAssetPanel({
        dateFilter: next2,
      });
    },
    [setAssetPanel],
  );
  const setSortOrder = reactExports.useCallback(
    (next2) => {
      setAssetPanel({
        sortOrder: next2,
      });
    },
    [setAssetPanel],
  );
  const resetAll = reactExports.useCallback(() => {
    setAssetPanel(DEFAULTS);
  }, [setAssetPanel]);
  const isAnyActive = reactExports.useMemo(() => {
    if (typeFilters.length > 0) return true;
    if (sortOrder !== "desc") return true;
    if (dateFilter.kind === "custom") {
      return Boolean(dateFilter.from) || Boolean(dateFilter.to);
    }
    return dateFilter.kind !== "all";
  }, [typeFilters, dateFilter, sortOrder]);
  return {
    typeFilters,
    dateFilter,
    sortOrder,
    setTypeFilters,
    setDateFilter,
    setSortOrder,
    resetAll,
    isAnyActive,
  };
}
function expandSelectionForDelete(anchor, selectedPaths, filteredTree) {
  if (selectedPaths.size > 1 && selectedPaths.has(anchor.path)) {
    const entries2 = [];
    for (const selectedPath of selectedPaths) {
      const entry = findEntryByPath(filteredTree, selectedPath);
      if (entry) entries2.push(entry);
    }
    return entries2.length > 0 ? entries2 : [anchor];
  }
  return [anchor];
}
function useFileExplorerPanelClose({ isActive: isActive2, onClose }) {
  const handlePanelKeyDownCapture = reactExports.useCallback(
    (event) => {
      if (!isActive2 || !shouldClosePanel(event.nativeEvent)) return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    },
    [isActive2, onClose],
  );
  reactExports.useEffect(() => {
    if (!isActive2) return;
    const handleWindowKeyDown = (event) => {
      if (!shouldClosePanel(event)) return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [isActive2, onClose]);
  return {
    handlePanelKeyDownCapture,
  };
}
function DeleteConfirmDialog({ entries: entries2, onCancel, onConfirm }) {
  const { t: t2 } = useTranslation();
  const head2 = entries2[0];
  return (
    <AlertDialog
      open={entries2.length > 0}
      onOpenChange={(open) => !open && onCancel()}
    >
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {entries2.length > 1
              ? t2("fileExplorer.deleteMultiple", {
                  count: entries2.length,
                })
              : head2?.isDirectory
                ? t2("fileExplorer.deleteFolder")
                : t2("fileExplorer.deleteFile")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {entries2.length > 1
              ? t2("fileExplorer.deleteMultipleConfirm", {
                  count: entries2.length,
                })
              : head2?.isDirectory
                ? t2("fileExplorer.deleteFolderConfirm", {
                    name: head2.name,
                  })
                : t2("fileExplorer.deleteFileConfirm", {
                    name: head2?.name,
                  })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t2("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {t2("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
function DropOverlay() {
  const { t: t2 } = useTranslation();
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 border-2 border-dashed border-primary rounded-lg pointer-events-none">
      <p className="text-sm text-primary font-medium">
        {t2("fileExplorer.dropToImport")}
      </p>
    </div>
  );
}
const AssetGridItem = reactExports.memo(AssetGridItemImpl, arePropsEqual);
const GRID_ITEM_PADDING = 8;
const GRID_ITEM_GAP = 4;
const GRID_NAME_AREA = 24;
const GRID_ROW_GAP = 4;
const GRID_ROW_FALLBACK_HEIGHT = 120;
const FileExplorerGridView = reactExports.memo(function FileExplorerGridView2({
  sortedFilteredAssets,
  containerWidth,
  selectedPaths,
  viewMode,
  renamingPath,
  resolveAssetPath,
  scrollEl,
  handlers: handlers2,
}) {
  const columnsPerRow = 2;
  const gridRowEstimateHeight = reactExports.useMemo(() => {
    if (containerWidth === 0) return GRID_ROW_FALLBACK_HEIGHT;
    const cellWidth = containerWidth / columnsPerRow;
    const thumbHeight = cellWidth - GRID_ITEM_PADDING;
    return (
      thumbHeight +
      GRID_ITEM_GAP +
      GRID_NAME_AREA +
      GRID_ITEM_PADDING +
      GRID_ROW_GAP
    );
  }, [containerWidth]);
  const assetGridRows = reactExports.useMemo(() => {
    const rows = [];
    for (let i2 = 0; i2 < sortedFilteredAssets.length; i2 += columnsPerRow) {
      rows.push(sortedFilteredAssets.slice(i2, i2 + columnsPerRow));
    }
    return rows;
  }, [sortedFilteredAssets]);
  const gridVirtualizer = useVirtualizer({
    count: assetGridRows.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => gridRowEstimateHeight,
    measureElement: (el) => el.getBoundingClientRect().height,
    overscan: 5,
  });
  return (
    <div
      style={{
        height: gridVirtualizer.getTotalSize(),
        width: "100%",
        position: "relative",
      }}
    >
      {gridVirtualizer.getVirtualItems().map((virtualRow) => {
        const row = assetGridRows[virtualRow.index];
        return (
          <div
            key={virtualRow.index}
            ref={gridVirtualizer.measureElement}
            data-index={virtualRow.index}
            className="grid gap-1 px-1 absolute top-0 left-0 w-full"
            style={{
              transform: `translateY(${virtualRow.start}px)`,
              // minmax(0, 1fr) 必需:默认 1fr 实际是 minmax(auto, 1fr),
              // cell 内长文件名 / 长 stem 会按 max-content 撑大 track,
              // 表现为同一行内 cell 宽度不一致.
              gridTemplateColumns: `repeat(${columnsPerRow}, minmax(0, 1fr))`,
            }}
          >
            {row.map((asset) => {
              const absPath = resolveAssetPath(asset.path);
              return (
                <AssetGridItem
                  key={asset.path}
                  asset={asset}
                  absolutePath={absPath}
                  isSelected={selectedPaths.has(absPath)}
                  viewMode={viewMode}
                  buildDragPayload={handlers2.buildDragPayload}
                  onSelect={handlers2.onSelect}
                  onDoubleClick={handlers2.onDoubleClick}
                  onDelete={handlers2.onDelete}
                  onCopyPath={handlers2.onCopyPath}
                  onCopyFile={handlers2.onCopyFile}
                  onDuplicate={handlers2.onDuplicate}
                  onShowInFolder={handlers2.onShowInFolder}
                  onStartRename={handlers2.onStartRename}
                  onRename={handlers2.onRename}
                  onRenameCancel={handlers2.onRenameCancel}
                  renamingPath={renamingPath}
                  onMergeCandidate={handlers2.onMergeCandidate}
                  onRemoveMissing={handlers2.onRemoveMissing}
                  onLocateMissing={handlers2.onLocateMissing}
                  onSwitchViewMode={handlers2.onSwitchViewMode}
                  onAddToCanvas={handlers2.onAddToCanvas}
                  onAddToChat={handlers2.onAddToChat}
                  onPromoteToAsset={handlers2.onPromoteToAsset}
                  onSaveToProjectAssets={handlers2.onSaveToProjectAssets}
                  onLocateOnCanvas={handlers2.onLocateOnCanvas}
                  onAnchorMount={handlers2.onAnchorMount}
                  onOpenDefault={handlers2.onOpenDefault}
                  onOpenWith={handlers2.onOpenWith}
                  onPickAppAndOpen={handlers2.onPickAppAndOpen}
                  onHoverIntent={handlers2.onHoverIntent}
                  onHoverEnd={handlers2.onHoverEnd}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
});
const TREE_ROW_HEIGHT = 32;
const FileExplorerTreeView = reactExports.memo(function FileExplorerTreeView2({
  flatRows,
  expanded,
  selectedPaths,
  rootPath,
  viewMode,
  assetByAbsPath,
  renamingPath,
  scrollEl,
  creatingEntry,
  handlers: handlers2,
}) {
  const treeVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => TREE_ROW_HEIGHT,
    overscan: 10,
  });
  reactExports.useEffect(() => {
    if (!creatingEntry) return;
    const creatingPath = `${creatingEntry.parentPath}/__creating__`;
    const index2 = flatRows.findIndex((r2) => r2.entry.path === creatingPath);
    if (index2 >= 0) {
      treeVirtualizer.scrollToIndex(index2, {
        align: "auto",
      });
    }
  }, [creatingEntry, flatRows, treeVirtualizer]);
  return (
    <div
      style={{
        height: treeVirtualizer.getTotalSize(),
        width: "100%",
        position: "relative",
      }}
    >
      {treeVirtualizer.getVirtualItems().map((virtualRow) => {
        const row = flatRows[virtualRow.index];
        const isCreatingRow = row.entry.path.endsWith("/__creating__");
        return (
          <div
            key={row.entry.path}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <TreeItem
              entry={row.entry}
              depth={row.depth}
              isExpanded={expanded.has(row.entry.path)}
              isSelected={selectedPaths.has(row.entry.path)}
              isCreating={isCreatingRow}
              rootPath={rootPath}
              viewMode={viewMode}
              asset={assetByAbsPath.get(row.entry.path)}
              buildDragPayload={handlers2.buildDragPayload}
              onToggle={handlers2.onToggle}
              onFileSelect={handlers2.onFileSelect}
              onFileDoubleClick={handlers2.onFileDoubleClick}
              onRename={handlers2.onRename}
              onDelete={handlers2.onDelete}
              onCopyPath={handlers2.onCopyPath}
              onCopyFile={handlers2.onCopyFile}
              onDuplicate={handlers2.onDuplicate}
              onMove={handlers2.onMove}
              onStartRename={handlers2.onStartRename}
              onCreateConfirm={handlers2.onCreateConfirm}
              onCreateCancel={handlers2.onCreateCancel}
              onStartCreateInside={handlers2.onStartCreateInside}
              renamingPath={renamingPath}
              onRenameCancel={handlers2.onRenameCancel}
              onShowInFolder={handlers2.onShowInFolder}
              onMergeCandidate={handlers2.onMergeCandidate}
              onRemoveMissing={handlers2.onRemoveMissing}
              onLocateMissing={handlers2.onLocateMissing}
              onSwitchViewMode={handlers2.onSwitchViewMode}
              onAddToCanvas={handlers2.onAddToCanvas}
              onAddToChat={handlers2.onAddToChat}
              onPromoteToAsset={handlers2.onPromoteToAsset}
              onSaveToProjectAssets={handlers2.onSaveToProjectAssets}
              onLocateOnCanvas={handlers2.onLocateOnCanvas}
              onAnchorMount={handlers2.onAnchorMount}
              onOpenDefault={handlers2.onOpenDefault}
              onOpenWith={handlers2.onOpenWith}
              onPickAppAndOpen={handlers2.onPickAppAndOpen}
              onHoverIntent={handlers2.onHoverIntent}
              onHoverEnd={handlers2.onHoverEnd}
            />
          </div>
        );
      })}
    </div>
  );
});
function PromoteToAssetDialog({ files, workspaceRoot, onClose }) {
  const { t: t2 } = useTranslation();
  const [isSubmitting, setIsSubmitting] = reactExports.useState(false);
  const filesLen = files?.length ?? 0;
  const open = files !== null && filesLen > 0;
  return (
    <Dialog
      open={open}
      onOpenChange={(o2) => {
        if (!o2 && !isSubmitting) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-xl"
        data-action-ui-id="asset-panel.promote-to-asset-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t2("assetCenter.promote.title")}</DialogTitle>
          <DialogDescription className="text-xs">
            {t2("assetCenter.promote.descriptionMulti", {
              count: filesLen,
            })}
          </DialogDescription>
        </DialogHeader>
        {open && files && (
          <PromoteToAssetForm
            files={files}
            workspaceRoot={workspaceRoot}
            onCancel={onClose}
            onSuccess={onClose}
            onSubmittingChange={setIsSubmitting}
            variant="dialog"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
function ToolbarFilters({
  typeFilters,
  dateFilter,
  sortOrder,
  tagFilters,
  onTypeFiltersChange,
  onDateFilterChange,
  onSortOrderChange,
  onTagFiltersChange,
}) {
  return (
    <div className="flex h-full w-full items-stretch">
      <div className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto scrollbar-none">
        <TypeFilterPopover
          typeFilters={typeFilters}
          onChange={onTypeFiltersChange}
        />
        <TagFilterPopover
          tagFilters={tagFilters}
          onChange={onTagFiltersChange}
        />
        <DateFilterPopover
          dateFilter={dateFilter}
          sortOrder={sortOrder}
          onDateChange={onDateFilterChange}
          onSortChange={onSortOrderChange}
        />
      </div>
    </div>
  );
}
function resolveTreePaths(entries2, rootPath) {
  return entries2.map((entry) => ({
    ...entry,
    path: joinFilePath(rootPath, entry.path),
    children: entry.children
      ? resolveTreePaths(entry.children, rootPath)
      : void 0,
  }));
}
export function FileExplorer({
  onFileOpen,
  onRootPathChange,
  initialRootPath,
  isActive: isActive2,
  onClose,
  mode: _mode,
}) {
  const { t: t2 } = useTranslation();
  const gatewayFetch2 = useGatewayFetch();
  const gatewayScopeKey = useGatewayScopeKey();
  const platform2 = usePlatform();
  const currentWorkspace = useCurrentWorkspace();
  const [rootPath, setRootPath] = reactExports.useState(
    initialRootPath ?? null,
  );
  const [expanded, setExpanded] = reactExports.useState(new Set());
  const [selectedPaths, setSelectedPaths] = reactExports.useState(new Set());
  const [lastSelectedPath, setLastSelectedPath] = reactExports.useState(null);
  const [viewMode, setViewMode] = reactExports.useState("tree");
  const [searchQuery, setSearchQuery2] = reactExports.useState("");
  const deferredSearchQuery = reactExports.useDeferredValue(searchQuery);
  const conflictResolver = useConflictResolver();
  const treeRef = reactExports.useRef([]);
  const sectionRef = reactExports.useRef(null);
  const { handlePanelKeyDownCapture } = useFileExplorerPanelClose({
    isActive: isActive2,
    onClose,
  });
  const searchInputRef = reactExports.useRef(null);
  const selectionAnchorRef = reactExports.useRef(null);
  const {
    typeFilters,
    dateFilter,
    sortOrder,
    setTypeFilters,
    setDateFilter,
    setSortOrder,
  } = useAssetPanelPreferences();
  const [tagFilters, setTagFilters] = reactExports.useState([]);
  const tagRegistry = useTagRegistry();
  reactExports.useEffect(() => {
    const knownTagIds = tagRegistry.tags.map((tag) => tag.id);
    setTagFilters((current2) => retainKnownTagFilters(current2, knownTagIds));
  }, [tagRegistry.tags]);
  const tagSearchIds = reactExports.useMemo(() => {
    const q2 = deferredSearchQuery.trim().toLowerCase();
    if (!q2) return void 0;
    const ids2 = new Set();
    for (const tag of tagRegistry.tags) {
      const name2 =
        tag.name ||
        t2(tag.legacyNameKey ?? PRESET_COLOR_NAME_KEYS[tag.id] ?? "") ||
        tag.id;
      if (name2.toLowerCase().includes(q2)) ids2.add(tag.id);
    }
    return ids2;
  }, [tagRegistry, deferredSearchQuery, t2]);
  const {
    assets,
    refresh,
    rename,
    remove: remove2,
    move,
    mergeCandidate,
    removeMissing,
    manualLocate,
    duplicate,
  } = useAssets();
  const queryClient2 = useQueryClient();
  const { assetTree, invalidateDirs } = useFileExplorerWorkspaceDirs({
    rootPath,
    assets,
    gatewayFetch: gatewayFetch2,
    queryClient: queryClient2,
  });
  const {
    openWithDefault,
    openWith,
    pickAppAndOpen,
    copyPath: handleCopyPath,
    copyFile: handleCopyFile,
  } = useMediaActions();
  const tree = reactExports.useMemo(
    () => (rootPath ? resolveTreePaths(assetTree, rootPath) : assetTree),
    [assetTree, rootPath],
  );
  treeRef.current = tree;
  const toRelativePath = reactExports.useCallback(
    (absPath) => toRelativeFromRoot(rootPath ?? "", absPath),
    [rootPath],
  );
  reactExports.useEffect(() => {
    if (!rootPath && initialRootPath) {
      setRootPath(initialRootPath);
    }
  }, [initialRootPath, rootPath]);
  reactExports.useEffect(() => {
    onRootPathChange?.(rootPath);
  }, [rootPath, onRootPathChange]);
  const assetMap = reactExports.useMemo(() => {
    const map3 = new Map();
    for (const a2 of assets) {
      map3.set(a2.path, a2);
    }
    return map3;
  }, [assets]);
  const assetByAbsPath = reactExports.useMemo(() => {
    const map3 = new Map();
    if (!rootPath) return map3;
    for (const a2 of assets) {
      map3.set(joinFilePath(rootPath, a2.path), a2);
    }
    return map3;
  }, [assets, rootPath]);
  const filteredTree = reactExports.useMemo(
    () =>
      filterTreeByPredicate(tree, {
        query: deferredSearchQuery,
        typeFilters,
        dateFilter,
        getAsset: (path2) => assetByAbsPath.get(path2),
        tagFilters,
        tagSearchIds,
      }),
    [
      tree,
      deferredSearchQuery,
      typeFilters,
      dateFilter,
      assetByAbsPath,
      tagFilters,
      tagSearchIds,
    ],
  );
  const treeFileComparator = reactExports.useMemo(
    () =>
      buildTreeFileComparator(sortOrder, (path2) => assetByAbsPath.get(path2)),
    [sortOrder, assetByAbsPath],
  );
  const {
    creatingEntry,
    startCreate,
    handleCreateConfirm,
    handleCreateCancel,
  } = useFileExplorerCreate({
    setViewMode,
    expanded,
    setExpanded,
    rootPath,
    gatewayFetch: gatewayFetch2,
    conflictResolver,
    platformFs: platform2.fs,
    refresh,
    invalidateDirs,
    setSelectedPaths,
    setLastSelectedPath,
  });
  const flatRows = useFlattenTree(
    filteredTree,
    expanded,
    creatingEntry,
    treeFileComparator,
  );
  const sortedFilteredAssets = reactExports.useMemo(
    () =>
      filterAndSortAssets(assets, {
        query: deferredSearchQuery,
        typeFilters,
        dateFilter,
        sortOrder,
        tagFilters,
        tagSearchIds,
      }),
    [
      assets,
      deferredSearchQuery,
      typeFilters,
      dateFilter,
      sortOrder,
      tagFilters,
      tagSearchIds,
    ],
  );
  const { scrollEl, scrollCallbackRef, containerWidth } =
    useFileExplorerScrollContainer();
  const columnsPerRow = Math.max(2, Math.floor(containerWidth / 100));
  const resetScrollToTop = reactExports.useCallback(
    (_mode2 = viewMode) => {
      scrollEl?.scrollTo({
        top: 0,
        behavior: "auto",
      });
    },
    [viewMode, scrollEl],
  );
  const handleTypeFiltersChange = useStableCallback((next2) => {
    setTypeFilters(next2);
    resetScrollToTop();
  });
  const handleDateFilterChange = useStableCallback((next2) => {
    setDateFilter(next2);
    resetScrollToTop();
  });
  const handleSortOrderChange = useStableCallback((next2) => {
    setSortOrder(next2);
    resetScrollToTop();
  });
  const openFolder = reactExports.useCallback(async () => {
    const paths = await platform2.fs.showOpenDialog?.({
      directory: true,
    });
    if (!paths || paths.length === 0) return;
    const dir = paths[0];
    setRootPath(dir);
    setExpanded(new Set());
    setSelectedPaths(new Set());
    setLastSelectedPath(null);
  }, [platform2]);
  const refreshRoot = useStableCallback(async () => {
    await refresh();
    invalidateDirs();
  });
  const toggleFolder = reactExports.useCallback((path2) => {
    setExpanded((prev) => {
      const next2 = new Set(prev);
      if (next2.has(path2)) next2.delete(path2);
      else next2.add(path2);
      return next2;
    });
  }, []);
  const { updateSelection: updateSelection2, handleFileSelect } =
    useFileExplorerSelection({
      lastSelectedPath,
      flatRows,
      setSelectedPaths,
      setLastSelectedPath,
      selectionAnchorRef,
    });
  const { buildDragPayload, handleMove } = useFileExplorerDrag({
    selectedPaths,
    toRelativePath,
    treeRef,
    assetMap,
    move,
    invalidateDirs,
  });
  const handleFileDoubleClick = useStableCallback((path2) => {
    const findName2 = (entries2) => {
      for (const e2 of entries2) {
        if (e2.path === path2) return e2.name;
        if (e2.children) {
          const found2 = findName2(e2.children);
          if (found2) return found2;
        }
      }
      return null;
    };
    const name2 = findName2(treeRef.current);
    if (name2) {
      onFileOpen?.(path2, name2);
    }
  });
  const { renamingPath, startRename, handleRename, handleRenameCancel } =
    useFileExplorerRename({
      rename,
      toRelativePath,
      invalidateDirs,
    });
  const { deletingEntries, requestDelete, cancelDelete, handleDeleteConfirm } =
    useFileExplorerDelete({
      remove: remove2,
      toRelativePath,
      invalidateDirs,
      lastSelectedPath,
      setLastSelectedPath,
      selectionAnchorRef,
      selectedPaths,
      setSelectedPaths,
      // Asset-undo wiring (ADR-009): hook needs both to render the
      // 10s countdown toast on successful single-file delete.
      gatewayFetch: gatewayFetch2,
      queryClient: queryClient2,
      gatewayScopeKey,
    });
  const requestDeleteFromAnchor = useStableCallback((anchor) => {
    requestDelete(
      expandSelectionForDelete(anchor, selectedPaths, filteredTree),
    );
  });
  const {
    externalDragOver,
    handleImportFilesFromMenu,
    handleExternalDragEnter,
    handleExternalDragOver,
    handleExternalDragLeave,
    handleExternalDrop,
  } = useFileExplorerImport({
    gatewayFetch: gatewayFetch2,
    platform: platform2,
    rootPath,
    conflictResolver,
    refresh,
    setSelectedPaths,
    setLastSelectedPath,
  });
  const handleShowInFolder = useStableCallback(async (path2) => {
    if (!platform2.shell.showItemInFolder) {
      dedupedToast.error(t2("fileExplorer.platformNotSupported"));
      return;
    }
    try {
      await platform2.shell.showItemInFolder(path2);
    } catch (err) {
      dedupedToast.error(
        t2("fileExplorer.locateFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
  });
  const {
    handleRootDragEnter,
    handleRootDragOver,
    handleRootDragLeave,
    handleRootDrop,
  } = useFileExplorerRootDrop({
    rootPath,
    handleMove,
    handleExternalDragEnter,
    handleExternalDragOver,
    handleExternalDragLeave,
    handleExternalDrop,
  });
  const {
    resolveAssetPath,
    handleGridSelect,
    handleGridDoubleClick,
    handleGridDelete,
    handleGridCopyPath,
    handleGridCopyFile,
    handleGridShowInFolder,
  } = useFileExplorerGridDelegates({
    rootPath,
    sortedFilteredAssets,
    filteredTree,
    updateSelection: updateSelection2,
    onFileOpen,
    requestDeleteFromAnchor,
    handleCopyPath,
    handleCopyFile,
    handleShowInFolder,
  });
  const {
    handleMergeCandidate,
    handleRemoveMissing,
    handleLocateMissing,
    handleTreeMergeCandidate,
    handleTreeRemoveMissing,
    handleTreeLocateMissing,
  } = useFileExplorerMissingRecovery({
    mergeCandidate,
    removeMissing,
    manualLocate,
    platform: platform2,
    toRelativePath,
    assetMap,
  });
  const {
    handleAddToCanvas,
    handleAddToChat,
    handleDuplicateForGrid,
    handleDuplicateForTree,
  } = useFileExplorerCanvasIntegration({
    selectedPaths,
    toRelativePath,
    filteredTree,
    assetMap,
    duplicate,
  });
  const [promoteFiles, setPromoteFiles] = reactExports.useState(null);
  const workspaceProject = useWorkspaceProject(currentWorkspace ?? void 0);
  const isTeamProject = workspaceProject?.kind === "team";
  const [saveToProjectFiles, setSaveToProjectFiles] =
    reactExports.useState(null);
  const collectPromoteFiles = reactExports.useCallback(
    (target) => {
      if (target.isDirectory || target.isMissing) return [];
      const inSelection =
        selectedPaths.has(target.path) && selectedPaths.size > 1;
      const targetPaths = inSelection
        ? Array.from(selectedPaths)
        : [target.path];
      const resolved = [];
      for (const p3 of targetPaths) {
        const entry = findEntryByPath(filteredTree, p3);
        if (!entry || entry.isDirectory || entry.status === "missing") continue;
        const asset = assetByAbsPath.get(p3);
        const vaultPrompt =
          asset?.prompt && asset.prompt.trim().length > 0
            ? asset.prompt
            : void 0;
        resolved.push({
          workspaceRelPath: toRelativePath(p3),
          absolutePath: p3,
          displayName: entry.name,
          ...(vaultPrompt
            ? {
                vaultPrompt,
              }
            : {}),
        });
      }
      return resolved;
    },
    [toRelativePath, selectedPaths, filteredTree, assetByAbsPath],
  );
  const handleAddToLibrary = reactExports.useMemo(
    () =>
      isTeamProject
        ? void 0
        : (target) => {
            const resolved = collectPromoteFiles(target);
            if (resolved.length > 0) setPromoteFiles(resolved);
          },
    [isTeamProject, collectPromoteFiles],
  );
  const handleSaveToProjectAssets = reactExports.useMemo(
    () =>
      workspaceProject
        ? (target) => {
            const resolved = collectPromoteFiles(target);
            if (resolved.length > 0)
              setSaveToProjectFiles({
                files: resolved,
              });
          }
        : void 0,
    [workspaceProject, collectPromoteFiles],
  );
  const handlePromoteClose = reactExports.useCallback(
    () => setPromoteFiles(null),
    [],
  );
  const {
    clipboardHasContent,
    handleNativePaste,
    handlePasteFromMenu,
    probeClipboard,
  } = useFileExplorerClipboard({
    gatewayFetch: gatewayFetch2,
    platform: platform2,
    rootPath,
    refresh,
    setSelectedPaths,
    setLastSelectedPath,
    sectionRef,
  });
  const handleNewFolderFromMenu = useStableCallback(() => {
    if (!rootPath) return;
    startCreate(rootPath, true);
  });
  const handleStartCreateInside = useStableCallback((parentAbsPath) => {
    if (!rootPath) return;
    startCreate(parentAbsPath, true);
  });
  const {
    overlayHostRef,
    registerRowAnchor,
    getRowAnchor,
    handleHoverIntent,
    handleHoverEnd,
    handleHoverLocateOnCanvas,
    handleLocateOnCanvas,
    handleLocateMissingConfirmInsert,
  } = useFileExplorerOverlayBridge({
    rootPath,
    assetByAbsPath,
    currentWorkspace,
    filteredTree,
    handleAddToCanvas,
  });
  const primaryPath =
    lastSelectedPath && selectedPaths.has(lastSelectedPath)
      ? lastSelectedPath
      : null;
  const primaryRowHandlers = reactExports.useMemo(() => {
    if (!primaryPath) return {};
    const entry = findEntryByPath(filteredTree, primaryPath);
    if (!entry) return {};
    const target = {
      path: entry.path,
      name: entry.name,
      isDirectory: entry.isDirectory,
      isMissing: entry.status === "missing",
    };
    const isMissing = entry.status === "missing";
    const isDirectory = entry.isDirectory;
    return {
      onAddToCanvas: () => handleAddToCanvas(target),
      // openWithDefault matches the menu's "Open" item — both files and
      // missing/directory rows hide the entry / disable the shortcut.
      onOpenDefault:
        isDirectory || isMissing ? void 0 : () => openWithDefault(entry.path),
      onShowInFolder: () => handleShowInFolder(entry.path),
      onRename: () => startRename(entry.path),
      onDelete: () => requestDeleteFromAnchor(entry),
    };
  }, [
    primaryPath,
    filteredTree,
    openWithDefault,
    startRename,
    requestDeleteFromAnchor,
    handleAddToCanvas,
    handleShowInFolder,
  ]);
  const visiblePaths = reactExports.useMemo(() => {
    if (viewMode === "tree") {
      return flatRows
        .filter((r2) => !r2.entry.path.endsWith("/__creating__"))
        .map((r2) => r2.entry.path);
    }
    return sortedFilteredAssets.map((a2) =>
      rootPath ? joinFilePath(rootPath, a2.path) : a2.path,
    );
  }, [viewMode, flatRows, sortedFilteredAssets, rootPath]);
  const { panelLevelHandlers } = useFileExplorerShortcuts({
    setSelectedPaths,
    setLastSelectedPath,
    setViewMode,
    selectionAnchorRef,
    searchInputRef,
    selectedPaths,
    visiblePaths,
    primaryPath,
    primaryRowHandlers,
    resetScrollToTop,
    toRelativePath,
    handleCopyFile,
    duplicate,
    gatewayFetch: gatewayFetch2,
    queryClient: queryClient2,
    gatewayScopeKey,
  });
  const dispatchShortcut = useAssetMenuShortcuts(panelLevelHandlers);
  useFileExplorerKeyboard({
    sectionRef,
    primaryPath,
    visiblePaths,
    viewMode,
    columnsPerRow,
    flatRows,
    getRowAnchor,
    dispatchShortcut,
    selectionAnchorRef,
    setSelectedPaths,
    setLastSelectedPath,
  });
  const handleSectionPointerDown = reactExports.useCallback((e2) => {
    const target = e2.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }
    sectionRef.current?.focus({
      preventScroll: true,
    });
  }, []);
  const handleSwitchViewMode = useStableCallback(() => {
    const next2 = viewMode === "tree" ? "grid" : "tree";
    setViewMode(next2);
    resetScrollToTop(next2);
  });
  const handleShowRootInFolder = reactExports.useCallback(async () => {
    if (!rootPath || !platform2.shell.showItemInFolder) {
      dedupedToast.error(t2("fileExplorer.platformNotSupported"));
      return;
    }
    try {
      await platform2.shell.showItemInFolder(rootPath);
    } catch (err) {
      dedupedToast.error(
        t2("fileExplorer.locateFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
  }, [rootPath, platform2, t2]);
  const treeViewHandlers = reactExports.useMemo(
    () => ({
      buildDragPayload,
      onToggle: toggleFolder,
      onFileSelect: handleFileSelect,
      onFileDoubleClick: handleFileDoubleClick,
      onRename: handleRename,
      onDelete: requestDeleteFromAnchor,
      onCopyPath: handleCopyPath,
      onCopyFile: handleCopyFile,
      onDuplicate: handleDuplicateForTree,
      onMove: handleMove,
      onStartRename: startRename,
      onCreateConfirm: handleCreateConfirm,
      onCreateCancel: handleCreateCancel,
      onStartCreateInside: handleStartCreateInside,
      onRenameCancel: handleRenameCancel,
      onShowInFolder: handleShowInFolder,
      onMergeCandidate: handleTreeMergeCandidate,
      onRemoveMissing: handleTreeRemoveMissing,
      onLocateMissing: handleTreeLocateMissing,
      onSwitchViewMode: handleSwitchViewMode,
      onAddToCanvas: handleAddToCanvas,
      onAddToChat: handleAddToChat,
      onPromoteToAsset: handleAddToLibrary,
      onSaveToProjectAssets: handleSaveToProjectAssets,
      onLocateOnCanvas: handleLocateOnCanvas,
      onAnchorMount: registerRowAnchor,
      onOpenDefault: openWithDefault,
      onOpenWith: openWith,
      onPickAppAndOpen: pickAppAndOpen,
      onHoverIntent: handleHoverIntent,
      onHoverEnd: handleHoverEnd,
    }),
    [
      buildDragPayload,
      toggleFolder,
      handleFileSelect,
      handleFileDoubleClick,
      handleRename,
      requestDeleteFromAnchor,
      handleCopyPath,
      handleCopyFile,
      handleDuplicateForTree,
      handleMove,
      startRename,
      handleCreateConfirm,
      handleCreateCancel,
      handleStartCreateInside,
      handleRenameCancel,
      handleShowInFolder,
      handleTreeMergeCandidate,
      handleTreeRemoveMissing,
      handleTreeLocateMissing,
      handleSwitchViewMode,
      handleAddToCanvas,
      handleAddToChat,
      handleAddToLibrary,
      handleSaveToProjectAssets,
      handleLocateOnCanvas,
      registerRowAnchor,
      openWithDefault,
      openWith,
      pickAppAndOpen,
      handleHoverIntent,
      handleHoverEnd,
    ],
  );
  const gridViewHandlers = reactExports.useMemo(
    () => ({
      buildDragPayload,
      onSelect: handleGridSelect,
      onDoubleClick: handleGridDoubleClick,
      onDelete: handleGridDelete,
      onCopyPath: handleGridCopyPath,
      onCopyFile: handleGridCopyFile,
      onDuplicate: handleDuplicateForGrid,
      onShowInFolder: handleGridShowInFolder,
      onStartRename: startRename,
      onRename: handleRename,
      onRenameCancel: handleRenameCancel,
      onMergeCandidate: handleMergeCandidate,
      onRemoveMissing: handleRemoveMissing,
      onLocateMissing: handleLocateMissing,
      onSwitchViewMode: handleSwitchViewMode,
      onAddToCanvas: handleAddToCanvas,
      onAddToChat: handleAddToChat,
      onPromoteToAsset: handleAddToLibrary,
      onSaveToProjectAssets: handleSaveToProjectAssets,
      onLocateOnCanvas: handleLocateOnCanvas,
      onAnchorMount: registerRowAnchor,
      onOpenDefault: openWithDefault,
      onOpenWith: openWith,
      onPickAppAndOpen: pickAppAndOpen,
      onHoverIntent: handleHoverIntent,
      onHoverEnd: handleHoverEnd,
    }),
    [
      buildDragPayload,
      handleGridSelect,
      handleGridDoubleClick,
      handleGridDelete,
      handleGridCopyPath,
      handleGridCopyFile,
      handleDuplicateForGrid,
      handleGridShowInFolder,
      startRename,
      handleRename,
      handleRenameCancel,
      handleMergeCandidate,
      handleRemoveMissing,
      handleLocateMissing,
      handleSwitchViewMode,
      handleAddToCanvas,
      handleAddToChat,
      handleAddToLibrary,
      handleSaveToProjectAssets,
      handleLocateOnCanvas,
      registerRowAnchor,
      openWithDefault,
      openWith,
      pickAppAndOpen,
      handleHoverIntent,
      handleHoverEnd,
    ],
  );
  if (!rootPath) {
    return (
      <PageStateBoundary
        empty={true}
        density="panel"
        className="h-full"
        emptyOptions={{
          title: t2("fileExplorer.noOpenFolder"),
          description: t2("fileExplorer.selectFolderHint"),
          actions: [
            {
              key: "open-folder",
              label: t2("fileExplorer.openFolder"),
              variant: "outline",
              icon: <FolderOpen size={14} strokeWidth={1.5} />,
              onClick: openFolder,
            },
          ],
        }}
      />
    );
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drop zone for external file import
    <section
      ref={sectionRef}
      tabIndex={-1}
      className="flex flex-col h-full overflow-hidden relative outline-none"
      onDragEnter={handleRootDragEnter}
      onDragOver={handleRootDragOver}
      onDragLeave={handleRootDragLeave}
      onDrop={handleRootDrop}
      onPaste={handleNativePaste}
      onPointerDown={handleSectionPointerDown}
      onKeyDownCapture={handlePanelKeyDownCapture}
    >
      {externalDragOver && <DropOverlay />}
      <div className="flex shrink-0 items-center gap-1 px-2 pt-2 pb-2">
        <FileExplorerSearchBar
          value={searchQuery}
          onChange={setSearchQuery2}
          inputRef={searchInputRef}
          className="min-w-0 flex-1 !p-0"
        />
        <TooltipProvider>
          <div className="flex shrink-0 items-center gap-0.5">
            <SegmentedSwitch
              value={viewMode}
              onValueChange={setViewMode}
              dataActionUiId="file-view-mode-toggle"
              thumbDataSlot="file-view-mode-thumb"
              size="sm"
              iconSize={13}
              options={[
                {
                  value: "tree",
                  label: t2("fileExplorer.treeView"),
                  ariaLabel: t2("fileExplorer.treeView"),
                  icon: LayoutList,
                  tooltip: t2("fileExplorer.treeView"),
                  dataActionUiId: "asset-panel.view-tree",
                },
                {
                  value: "grid",
                  label: t2("fileExplorer.gridView"),
                  ariaLabel: t2("fileExplorer.gridView"),
                  icon: LayoutGrid,
                  tooltip: t2("fileExplorer.gridView"),
                  dataActionUiId: "asset-panel.view-grid",
                },
              ]}
            />
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label={t2("fileExplorer.refreshList")}
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50"
                    onClick={() => void refreshRoot()}
                    data-action-ui-id="asset-panel.refresh"
                  />
                }
              >
                <RetryIcon size={14} />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {t2("fileExplorer.refresh")}
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
      <div className="shrink-0 px-2 pb-1">
        <div className="h-7">
          <ToolbarFilters
            typeFilters={typeFilters}
            dateFilter={dateFilter}
            sortOrder={sortOrder}
            tagFilters={tagFilters}
            onTypeFiltersChange={handleTypeFiltersChange}
            onDateFilterChange={handleDateFilterChange}
            onSortOrderChange={handleSortOrderChange}
            onTagFiltersChange={setTagFilters}
          />
        </div>
      </div>
      <ContextMenu
        onOpenChange={(open) => {
          if (!open) return;
          probeClipboard();
        }}
      >
        <ContextMenuTrigger
          render={
            <div
              ref={scrollCallbackRef}
              className="flex-1 overflow-y-auto scrollbar-none pt-1 pb-12"
            />
          }
        >
          {filteredTree.length === 0 ? (
            <PageStateBoundary
              empty={true}
              density="panel"
              className="h-full"
              emptyOptions={{
                title:
                  searchQuery.trim().length > 0
                    ? t2("fileExplorer.noMatchingFiles")
                    : t2(
                        "fileExplorer.assetsHint",
                        "Generated assets land here",
                      ),
                description:
                  searchQuery.trim().length > 0
                    ? void 0
                    : t2(
                        "fileExplorer.localStorageHint",
                        "Files are stored locally.",
                      ),
              }}
            />
          ) : viewMode === "tree" ? (
            <FileExplorerTreeView
              flatRows={flatRows}
              expanded={expanded}
              selectedPaths={selectedPaths}
              rootPath={rootPath}
              viewMode={viewMode}
              assetByAbsPath={assetByAbsPath}
              renamingPath={renamingPath}
              scrollEl={scrollEl}
              creatingEntry={creatingEntry}
              handlers={treeViewHandlers}
            />
          ) : (
            <FileExplorerGridView
              sortedFilteredAssets={sortedFilteredAssets}
              containerWidth={containerWidth}
              selectedPaths={selectedPaths}
              viewMode={viewMode}
              renamingPath={renamingPath}
              resolveAssetPath={resolveAssetPath}
              scrollEl={scrollEl}
              handlers={gridViewHandlers}
            />
          )}
        </ContextMenuTrigger>
        <AssetEmptyAreaMenuContent
          viewMode={viewMode}
          onSwitchViewMode={handleSwitchViewMode}
          onRefresh={refresh}
          onShowRootInFolder={handleShowRootInFolder}
          rootInFolderDisabled={!rootPath}
          onNewFolder={handleNewFolderFromMenu}
          onImportFiles={handleImportFilesFromMenu}
          onPaste={handlePasteFromMenu}
          clipboardHasContent={clipboardHasContent}
        />
      </ContextMenu>
      <ConflictResolutionDialog {...conflictResolver.dialogProps} />
      <AssetPanelOverlayHost
        ref={overlayHostRef}
        onLocateOnCanvas={handleHoverLocateOnCanvas}
        onLocateMissingConfirmInsert={handleLocateMissingConfirmInsert}
      />
      <DeleteConfirmDialog
        entries={deletingEntries}
        onCancel={cancelDelete}
        onConfirm={handleDeleteConfirm}
      />
      <PromoteToAssetDialog
        files={promoteFiles}
        workspaceRoot={rootPath ?? null}
        onClose={handlePromoteClose}
      />
      <SaveToProjectAssetsDialog
        state={saveToProjectFiles}
        onOpenChange={(open) => {
          if (!open) setSaveToProjectFiles(null);
        }}
      />
    </section>
  );
}
