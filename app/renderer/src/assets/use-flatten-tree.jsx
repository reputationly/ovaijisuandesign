// use-flatten-tree.jsx
import { jsxRuntimeExports, useTranslation, reactExports, API_PATHS, FolderPlus, ChevronDown, ChevronRight$1, FolderInput, PreviewCardRoot, PreviewCardPortal, PreviewCardPositioner, PreviewCardPopup, classifyFileType, Plus, ChevronLeft, LayoutList, LayoutGrid, useQuery, Crosshair, ExternalLink, Copy, AlertTriangle, E$4, Volume2, Network } from "../vendor.js";
import { FileTypeIcon } from "../infra/create-recently-added-store.jsx";
import { withThumbnail } from "../workspace/deferred-thumbnail-image-generation.jsx";
import { imageRows, videoRows, fileRows, browserAssetSourceWebsite, pickNumber, formatDuration$3, formatFileSizeCompact, modifiedAt } from "../workspace/global-sidebar-provider.jsx";
import { PlatformFileManagerLabel } from "../settings/interest-selection-provider.jsx";
import { Trash2, Sparkles, Files, FileInput, ClipboardPaste, Sprout, Package, VolumeX } from "../media-editing/parse-item.jsx";
import { useGatewayFetch, useGatewayUrl, useGatewayScopeKey } from "../generation/use-resizable-width.js";
import { cn$2 } from "../infra/use-browser-overlay-dialog-props.jsx";
import {
  RetryIcon,
  PencilIcon,
  LocalFolderIcon,
  StrokeIcon,
} from "../workspace/browser-inspiration-urls.jsx";
import {
  ActionContextMenuContent,
  ActionContextMenuItem,
  ContextMenuShortcut,
  ActionContextMenuSeparator,
} from "../workspace/new-workspace-dialog.jsx";
import { AddToChatIcon } from "../canvas/generating-media-area.jsx";
import { ShortcutHint } from "../workspace/shortcut-categories.jsx";
import { ROLE_DISPLAY_NAMES } from "../infra/normalize-tag-registry.js";
import { useWorkspaceWSConnection } from "../settings/compact-rewrite-flow.jsx";
import { useAssetLineage, useAssetDescendants, useAssetInputs } from "../settings/im-bridge-manager.jsx";
import { Spinner } from "../team/use-team-transactions-feed-query.jsx";
import { Skeleton } from "../team/infinite-scroll-container.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { sortEntries } from "./use-asset-menu-shortcuts.js";
import { useAssetTree } from "./use-file-explorer-shortcuts.js";
export function useFileExplorerWorkspaceDirs({
  rootPath,
  assets,
  gatewayFetch: gatewayFetch2,
  queryClient: queryClient2,
}) {
  const { subscribe: subscribeToWS } = useWorkspaceWSConnection();
  const { data: dirsData } = useQuery({
    queryKey: ["workspace-dirs", rootPath],
    queryFn: async () => {
      const res = await gatewayFetch2(API_PATHS.listDirs);
      if (!res.ok) {
        throw new Error(`listDirs failed: ${res.status} ${res.statusText}`);
      }
      return await res.json();
    },
    enabled: !!rootPath,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const dirs = reactExports.useMemo(() => dirsData?.dirs ?? [], [dirsData]);
  const assetTree = useAssetTree(assets, dirs);
  const invalidateDirs = reactExports.useCallback(() => {
    if (!rootPath) return;
    queryClient2.invalidateQueries({
      queryKey: ["workspace-dirs", rootPath],
    });
  }, [queryClient2, rootPath]);
  reactExports.useEffect(() => {
    if (!rootPath) return;
    return subscribeToWS((msg) => {
      if (msg.type !== "dirs_changed") return;
      queryClient2.invalidateQueries({
        queryKey: ["workspace-dirs", rootPath],
      });
    });
  }, [subscribeToWS, queryClient2, rootPath]);
  return {
    assetTree,
    invalidateDirs,
  };
}
function sortTreeRecursively(tree, fileComparator) {
  const sortedTop = sortEntries(tree, fileComparator);
  return sortedTop.map((entry) =>
    entry.children
      ? {
          ...entry,
          children: sortTreeRecursively(entry.children, fileComparator),
        }
      : entry,
  );
}
export function useFlattenTree(tree, expanded, creatingEntry, fileComparator) {
  const sortedTree = reactExports.useMemo(
    () => sortTreeRecursively(tree, fileComparator),
    [tree, fileComparator],
  );
  return reactExports.useMemo(() => {
    const rows = [];
    const walk = (entries2, depth2) => {
      for (const entry of entries2) {
        rows.push({
          entry,
          depth: depth2,
        });
        if (entry.isDirectory && expanded.has(entry.path)) {
          if (creatingEntry && creatingEntry.parentPath === entry.path) {
            rows.push({
              entry: {
                name: "",
                path: `${entry.path}/__creating__`,
                isDirectory: creatingEntry.isDirectory,
                loaded: false,
              },
              depth: depth2 + 1,
            });
          }
          if (entry.children) {
            walk(entry.children, depth2 + 1);
          }
        }
      }
    };
    walk(sortedTree, 0);
    if (
      creatingEntry &&
      !rows.some((r2) => r2.entry.path === `${creatingEntry.parentPath}/__creating__`)
    ) {
      const isRootLevel = !sortedTree.some(
        (e2) => e2.isDirectory && e2.path === creatingEntry.parentPath,
      );
      if (isRootLevel) {
        rows.unshift({
          entry: {
            name: "",
            path: `${creatingEntry.parentPath}/__creating__`,
            isDirectory: creatingEntry.isDirectory,
            loaded: false,
          },
          depth: 0,
        });
      }
    }
    return rows;
  }, [sortedTree, expanded, creatingEntry]);
}
export function AssetContextMenuContent(props) {
  const {
    target,
    viewMode,
    onSwitchViewMode,
    onAddToCanvas,
    onAddToChat,
    onAddToLibrary,
    onSaveToProjectAssets,
    onLocateOnCanvas,
    onOpenDefault,
    onOpenWith,
    onPickAppAndOpen,
    onShowInFolder,
    onCopyPath,
    onCopyFile,
    onDuplicate,
    onRename,
    onDelete,
    onNewFolderInside,
    openWithSubOpen,
    onOpenWithSubOpenChange,
  } = props;
  const { t: t2 } = useTranslation();
  const isFile = !target.isDirectory && !target.isMissing;
  const oppositeViewLabel =
    viewMode === "tree" ? t2("fileExplorer.gridView") : t2("fileExplorer.treeView");
  return (
    <ActionContextMenuContent>
      {!target.isDirectory && (
        <>
          <ActionContextMenuItem
            onClick={onAddToCanvas}
            data-action-ui-id="asset-panel.menu-add-to-canvas"
          >
            <StrokeIcon icon={Plus} size={14} />
            {t2("fileExplorer.addToCanvas")}
            <ContextMenuShortcut>
              <ShortcutHint accelerator="CommandOrControl+Shift+A" variant="plain" />
            </ContextMenuShortcut>
          </ActionContextMenuItem>
          <ActionContextMenuItem
            onClick={onAddToChat}
            data-action-ui-id="asset-panel.menu-add-to-chat"
          >
            <StrokeIcon icon={AddToChatIcon} size={14} viewBoxSize={20} />
            {t2("fileExplorer.addToChat")}
          </ActionContextMenuItem>
          {onAddToLibrary && (
            <ActionContextMenuItem
              onClick={onAddToLibrary}
              data-action-ui-id="asset-panel.menu-add-to-library"
            >
              <StrokeIcon icon={Sparkles} size={14} />
              {t2("fileExplorer.addToLibrary")}
            </ActionContextMenuItem>
          )}
          {onSaveToProjectAssets && (
            <ActionContextMenuItem
              onClick={onSaveToProjectAssets}
              data-action-ui-id="asset-panel.menu-save-to-project-assets"
            >
              <StrokeIcon icon={FolderInput} size={14} />
              {t2("fileExplorer.saveToProjectAssets")}
            </ActionContextMenuItem>
          )}
        </>
      )}
      {!target.isDirectory && !target.isMissing && (
        <ActionContextMenuItem
          onClick={onLocateOnCanvas}
          data-action-ui-id="asset-panel.menu-locate-on-canvas"
        >
          <StrokeIcon icon={Crosshair} size={14} />
          {t2("fileExplorer.locateOnCanvas", {
            defaultValue: "在画布中定位",
          })}
        </ActionContextMenuItem>
      )}
      {!target.isDirectory && <ActionContextMenuSeparator />}
      {isFile && (
        <>
          <ActionContextMenuItem
            onClick={onOpenDefault}
            data-action-ui-id="asset-panel.menu-open-default"
          >
            <StrokeIcon icon={ExternalLink} size={14} />
            {t2("fileExplorer.open")}
            <ContextMenuShortcut>
              <ShortcutHint accelerator="CommandOrControl+O" variant="plain" />
            </ContextMenuShortcut>
          </ActionContextMenuItem>
          <ActionContextMenuItem
            onClick={onShowInFolder}
            data-action-ui-id="asset-panel.menu-show-in-folder"
          >
            <LocalFolderIcon />
            <PlatformFileManagerLabel />
            <ContextMenuShortcut>
              <ShortcutHint accelerator="CommandOrControl+Shift+R" variant="plain" />
            </ContextMenuShortcut>
          </ActionContextMenuItem>
          <ActionContextMenuItem
            onClick={onCopyPath}
            data-action-ui-id="asset-panel.menu-copy-path"
          >
            <StrokeIcon icon={Copy} size={14} />
            {t2("fileExplorer.copyPath")}
          </ActionContextMenuItem>
          <ActionContextMenuItem
            onClick={onCopyFile}
            data-action-ui-id="asset-panel.menu-copy-file"
          >
            <StrokeIcon icon={Files} size={14} />
            {t2("fileExplorer.copyFile")}
            <ContextMenuShortcut>
              <ShortcutHint accelerator="CommandOrControl+C" variant="plain" />
            </ContextMenuShortcut>
          </ActionContextMenuItem>
          <ActionContextMenuItem
            onClick={onDuplicate}
            data-action-ui-id="asset-panel.menu-duplicate"
          >
            <StrokeIcon icon={Files} size={14} />
            {t2("fileExplorer.duplicate")}
            <ContextMenuShortcut>
              <ShortcutHint accelerator="CommandOrControl+D" variant="plain" />
            </ContextMenuShortcut>
          </ActionContextMenuItem>
        </>
      )}
      {!isFile && (
        <>
          {onNewFolderInside && (
            <ActionContextMenuItem
              onClick={onNewFolderInside}
              data-action-ui-id="asset-panel.menu-new-folder-inside"
            >
              <StrokeIcon icon={FolderPlus} size={14} />
              {t2("fileExplorer.newFolder")}
            </ActionContextMenuItem>
          )}
          <ActionContextMenuItem
            onClick={onShowInFolder}
            data-action-ui-id="asset-panel.menu-show-in-folder"
          >
            <LocalFolderIcon />
            <PlatformFileManagerLabel />
            <ContextMenuShortcut>
              <ShortcutHint accelerator="CommandOrControl+Shift+R" variant="plain" />
            </ContextMenuShortcut>
          </ActionContextMenuItem>
          <ActionContextMenuItem
            onClick={onCopyPath}
            data-action-ui-id="asset-panel.menu-copy-path"
          >
            <StrokeIcon icon={Copy} size={14} />
            {t2("fileExplorer.copyPath")}
          </ActionContextMenuItem>
        </>
      )}
      <ActionContextMenuSeparator />
      <ActionContextMenuItem
        onClick={onSwitchViewMode}
        data-action-ui-id="asset-panel.menu-switch-view"
      >
        {viewMode === "tree" ? (
          <StrokeIcon icon={LayoutGrid} size={14} />
        ) : (
          <StrokeIcon icon={LayoutList} size={14} />
        )}
        {t2("fileExplorer.switchViewTo", {
          view: oppositeViewLabel,
        })}
      </ActionContextMenuItem>
      <ActionContextMenuSeparator />
      {onRename && (
        <ActionContextMenuItem onClick={onRename} data-action-ui-id="asset-panel.menu-rename">
          <StrokeIcon icon={PencilIcon} size={14} />
          {t2("fileExplorer.rename")}
          <ContextMenuShortcut>
            <ShortcutHint accelerator="Enter" variant="plain" />
          </ContextMenuShortcut>
        </ActionContextMenuItem>
      )}
      <ActionContextMenuItem
        variant="destructive"
        onClick={onDelete}
        data-action-ui-id="asset-panel.menu-delete"
      >
        <StrokeIcon icon={Trash2} size={14} />
        {t2("common.delete")}
        <ContextMenuShortcut>
          <ShortcutHint accelerator="Backspace" variant="plain" />
        </ContextMenuShortcut>
      </ActionContextMenuItem>
    </ActionContextMenuContent>
  );
}
export function AssetEmptyAreaMenuContent(props) {
  const {
    viewMode,
    onSwitchViewMode,
    onRefresh,
    onShowRootInFolder,
    rootInFolderDisabled,
    onNewFolder,
    onImportFiles,
    onPaste,
    clipboardHasContent,
  } = props;
  const { t: t2 } = useTranslation();
  const oppositeViewLabel =
    viewMode === "tree" ? t2("fileExplorer.gridView") : t2("fileExplorer.treeView");
  return (
    <ActionContextMenuContent>
      <ActionContextMenuItem onClick={onNewFolder} data-action-ui-id="asset-panel.menu-new-folder">
        <StrokeIcon icon={FolderPlus} size={14} />
        {t2("fileExplorer.newFolder", {
          defaultValue: "新建文件夹",
        })}
      </ActionContextMenuItem>
      <ActionContextMenuItem
        onClick={onImportFiles}
        data-action-ui-id="asset-panel.menu-import-files"
      >
        <StrokeIcon icon={FileInput} size={14} />
        {t2("fileExplorer.importFiles", {
          defaultValue: "导入文件…",
        })}
      </ActionContextMenuItem>
      <ActionContextMenuItem
        onClick={onPaste}
        disabled={!clipboardHasContent}
        data-action-ui-id="asset-panel.menu-paste"
      >
        <StrokeIcon icon={ClipboardPaste} size={14} />
        {t2("fileExplorer.paste", {
          defaultValue: "粘贴",
        })}
        <ContextMenuShortcut>
          <ShortcutHint accelerator="CommandOrControl+V" variant="plain" />
        </ContextMenuShortcut>
      </ActionContextMenuItem>
      <ActionContextMenuSeparator />
      <ActionContextMenuItem
        onClick={onSwitchViewMode}
        data-action-ui-id="asset-panel.menu-switch-view"
      >
        {viewMode === "tree" ? (
          <StrokeIcon icon={LayoutGrid} size={14} />
        ) : (
          <StrokeIcon icon={LayoutList} size={14} />
        )}
        {t2("fileExplorer.switchViewTo", {
          view: oppositeViewLabel,
        })}
      </ActionContextMenuItem>
      <ActionContextMenuSeparator />
      <ActionContextMenuItem onClick={onRefresh} data-action-ui-id="asset-panel.menu-refresh">
        <RetryIcon size={16} />
        {t2("fileExplorer.refreshList")}
      </ActionContextMenuItem>
      <ActionContextMenuItem
        onClick={onShowRootInFolder}
        disabled={rootInFolderDisabled}
        data-action-ui-id="asset-panel.menu-show-root-in-folder"
      >
        <LocalFolderIcon />
        <PlatformFileManagerLabel />
      </ActionContextMenuItem>
    </ActionContextMenuContent>
  );
}
const LINEAGE_DEPTH = 5;
function LineageTree({ assetId, depth: depth2 = LINEAGE_DEPTH, onSelectAsset, className }) {
  const { t: t2 } = useTranslation();
  const lineage = useAssetLineage(assetId, {
    depth: depth2,
  });
  const descendants = useAssetDescendants(assetId, {
    depth: depth2,
  });
  const inputs = useAssetInputs(assetId);
  if (!assetId) {
    return (
      <div
        className={cn$2("flex items-center justify-center text-xs text-hl-text-03 py-6", className)}
      >
        {t2("lineage.noSelection")}
      </div>
    );
  }
  return (
    <div className={cn$2("flex flex-col gap-4 text-xs", className)}>
      <Section
        title={t2("lineage.upstreamTitle")}
        loading={lineage.isLoading}
        error={lineage.error}
      >
        <UpstreamView data={lineage.data} maxDepth={depth2} onSelectAsset={onSelectAsset} />
      </Section>
      <Section
        title={t2("lineage.downstreamTitle")}
        loading={descendants.isLoading}
        error={descendants.error}
      >
        <DescendantsView
          nodes={descendants.data?.nodes ?? []}
          maxDepth={depth2}
          onSelectAsset={onSelectAsset}
        />
      </Section>
      <Section title={t2("lineage.inputsTitle")} loading={inputs.isLoading} error={inputs.error}>
        <InputsView nodes={inputs.data?.inputs ?? []} onSelectAsset={onSelectAsset} />
      </Section>
    </div>
  );
}
function Section({ title, loading, error, children: children2 }) {
  const { t: t2 } = useTranslation();
  const [collapsed, setCollapsed] = reactExports.useState(false);
  const Arrow = collapsed ? ChevronRight$1 : ChevronDown;
  return (
    <section className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setCollapsed((v2) => !v2)}
        className="flex items-center gap-1 text-hl-text-02 hover:text-hl-text-01 transition-colors text-xs font-medium"
      >
        <Arrow size={12} strokeWidth={1.5} className="shrink-0" />
        <span>{title}</span>
        {loading && <Spinner className="size-3 ml-1" />}
      </button>
      {!collapsed && (
        <div className="pl-3.5">
          {error ? (
            <div className="text-hl-error text-xs py-1">
              {t2("lineage.loadError", {
                message: error.message,
              })}
            </div>
          ) : (
            children2
          )}
        </div>
      )}
    </section>
  );
}
function UpstreamView({ data: data2, maxDepth, onSelectAsset }) {
  const { t: t2 } = useTranslation();
  const groupedByDepth = reactExports.useMemo(() => {
    if (!data2) return [];
    const buckets2 = new Map();
    for (const node2 of data2.nodes) {
      const arr = buckets2.get(node2.depth) ?? [];
      arr.push(node2);
      buckets2.set(node2.depth, arr);
    }
    return [...buckets2.entries()].sort(([a2], [b3]) => a2 - b3);
  }, [data2]);
  if (!data2) return null;
  if (data2.nodes.length === 0) {
    return <StandaloneHint />;
  }
  const reachedCap = data2.nodes.some((n2) => n2.depth >= maxDepth);
  return (
    <div className="flex flex-col gap-1">
      {groupedByDepth.map(([nodeDepth, nodes]) => (
        <UpstreamLevel
          key={nodeDepth}
          depth={nodeDepth}
          nodes={nodes}
          onSelectAsset={onSelectAsset}
        />
      ))}
      {reachedCap && (
        <div className="text-hl-text-03 text-xs italic pl-1">
          {t2("lineage.depthTruncated", {
            depth: maxDepth,
          })}
        </div>
      )}
    </div>
  );
}
function UpstreamLevel({ depth: depth2, nodes, onSelectAsset }) {
  const { t: t2 } = useTranslation();
  const [collapsed, setCollapsed] = reactExports.useState(false);
  const Arrow = collapsed ? ChevronRight$1 : ChevronDown;
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setCollapsed((v2) => !v2)}
        className="flex items-center gap-1 text-hl-text-03 hover:text-hl-text-02 transition-colors text-xs"
      >
        <Arrow size={11} className="shrink-0" />
        <span>
          {t2("lineage.depthLabel", {
            depth: depth2,
            count: nodes.length,
          })}
        </span>
      </button>
      {!collapsed && (
        <ul className="flex flex-col pl-3.5">
          {nodes.map((node2) => (
            <li key={node2.id}>
              <UpstreamRow node={node2} onSelectAsset={onSelectAsset} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
function UpstreamRow({ node: node2, onSelectAsset }) {
  const { t: t2 } = useTranslation();
  if (node2.parent_id !== null) {
    return (
      <AssetRow
        assetId={node2.parent_id}
        path={node2.parent_path}
        name={node2.parent_name}
        status={node2.parent_status}
        role={node2.role}
        onSelectAsset={onSelectAsset}
      />
    );
  }
  if (node2.parent_attachment_id) {
    return <AttachmentRow node={node2} role={node2.role} />;
  }
  const fallbackPath =
    typeof node2.metadata?.parent_path === "string" ? node2.metadata.parent_path : null;
  return (
    <div className="flex items-center gap-1.5 text-hl-text-03 italic py-0.5">
      <AlertTriangle size={11} className="shrink-0" />
      <span className="truncate">
        {fallbackPath
          ? t2("lineage.brokenParentWithPath", {
              path: fallbackPath,
            })
          : t2("lineage.brokenParent")}
      </span>
      {node2.role && <RoleChip role={node2.role} />}
    </div>
  );
}
function DescendantsView({ nodes, maxDepth, onSelectAsset }) {
  const { t: t2 } = useTranslation();
  if (nodes.length === 0) {
    return <StandaloneHint variant="downstream" />;
  }
  const reachedCap = nodes.some((n2) => n2.depth >= maxDepth);
  return (
    <div className="flex flex-col gap-0.5">
      <ul className="flex flex-col">
        {nodes.map((node2) => (
          <li key={node2.id}>
            <AssetRow
              assetId={node2.child_id}
              path={node2.child_path}
              name={node2.child_name}
              status={node2.child_status}
              role={node2.role}
              depthHint={node2.depth}
              onSelectAsset={onSelectAsset}
            />
          </li>
        ))}
      </ul>
      {reachedCap && (
        <div className="text-hl-text-03 text-xs italic pl-1">
          {t2("lineage.depthTruncated", {
            depth: maxDepth,
          })}
        </div>
      )}
    </div>
  );
}
function InputsView({ nodes, onSelectAsset }) {
  const { t: t2 } = useTranslation();
  if (nodes.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-hl-text-03 italic py-1">
        <Sprout size={11} className="shrink-0" />
        <span>{t2("lineage.noInputs")}</span>
      </div>
    );
  }
  return (
    <ul className="flex flex-col">
      {nodes.map((node2) => (
        <li key={node2.id}>
          <InputRow node={node2} onSelectAsset={onSelectAsset} />
        </li>
      ))}
    </ul>
  );
}
function InputRow({ node: node2, onSelectAsset }) {
  const { t: t2 } = useTranslation();
  if (node2.parent_id !== null) {
    return (
      <AssetRow
        assetId={node2.parent_id}
        path={node2.parent_path}
        name={node2.parent_name}
        status={node2.parent_status}
        role={node2.role}
        onSelectAsset={onSelectAsset}
      />
    );
  }
  if (node2.parent_attachment_id) {
    return <AttachmentRow node={node2} role={node2.role} />;
  }
  return (
    <div className="flex items-center gap-1.5 text-hl-text-03 italic py-0.5">
      <AlertTriangle size={11} className="shrink-0" />
      <span className="truncate">{t2("lineage.brokenParent")}</span>
      <RoleChip role={node2.role} />
    </div>
  );
}
function AssetRow({ assetId, path: path2, name: name2, status, role, depthHint, onSelectAsset }) {
  const isMissing = status === "missing";
  const display = name2 ?? path2 ?? assetId;
  return (
    <button
      type="button"
      onClick={() => onSelectAsset?.(assetId)}
      disabled={!onSelectAsset}
      className={cn$2(
        "flex items-center gap-1.5 w-full px-1 py-0.5 text-left rounded-sm transition-colors",
        onSelectAsset
          ? "cursor-pointer hover:bg-hl-alpha-08 text-hl-text-01"
          : "cursor-default text-hl-text-02",
        isMissing && "opacity-50",
      )}
      title={path2 ?? void 0}
    >
      <span className="truncate flex-1">{display}</span>
      {depthHint !== void 0 && depthHint > 1 && (
        <span className="shrink-0 text-hl-text-03 text-[10px]">+{depthHint - 1}</span>
      )}
      <RoleChip role={role} />
    </button>
  );
}
function RoleChip({ role }) {
  const { t: t2 } = useTranslation();
  const fallback = ROLE_DISPLAY_NAMES[role] ?? role;
  const display = t2(`assetRole.${role.toLowerCase()}`, fallback);
  return (
    <span className="shrink-0 px-1 py-0 text-[10px] text-hl-text-03 bg-hl-alpha-04 rounded">
      {display}
    </span>
  );
}
function EntityTypeChip({ type: type2 }) {
  const { t: t2 } = useTranslation();
  const display = t2(`assetCenter.types.${type2}`);
  return (
    <span className="shrink-0 px-1 py-0 text-[10px] text-hl-text-03 bg-hl-alpha-04 rounded">
      {display}
    </span>
  );
}
function AttachmentRow({ node: node2, role }) {
  const { t: t2 } = useTranslation();
  if (node2.parent_attachment_entity_name && node2.parent_attachment_filename) {
    return (
      <div
        className="flex items-center gap-1.5 w-full px-1 py-0.5 text-hl-text-01"
        title={node2.parent_attachment_entity_id ?? void 0}
        data-action-ui-id="lineage.attachment-row-live"
      >
        <Package size={11} className="shrink-0 text-hl-text-03" />
        <span className="truncate flex-1">
          {t2("lineage.attachmentEntityLabel", {
            entityName: node2.parent_attachment_entity_name,
            filename: node2.parent_attachment_filename,
          })}
        </span>
        {node2.parent_attachment_entity_type && (
          <EntityTypeChip type={node2.parent_attachment_entity_type} />
        )}
        <RoleChip role={role} />
      </div>
    );
  }
  return (
    <div
      className="flex items-center gap-1.5 text-hl-text-03 italic py-0.5"
      data-action-ui-id="lineage.attachment-row-broken"
    >
      <AlertTriangle size={11} className="shrink-0" />
      <span className="truncate">{t2("lineage.brokenAttachment")}</span>
      <RoleChip role={role} />
    </div>
  );
}
function StandaloneHint({ variant = "upstream" }) {
  const { t: t2 } = useTranslation();
  const text2 =
    variant === "upstream" ? t2("lineage.standaloneUpstream") : t2("lineage.standaloneDownstream");
  return (
    <div className="flex items-start gap-1.5 text-hl-text-03 italic py-1">
      <Sprout size={11} className="shrink-0 mt-0.5" />
      <span className="leading-snug">{text2}</span>
    </div>
  );
}
const STALE_TIME_MS$2 = 5 * 60 * 1e3;
function useAssetMetadata(asset, { enabled }) {
  const gatewayFetch2 = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  return useQuery({
    // `?? null` keeps the queryKey stable & non-warning when asset.id is
    // missing — TanStack Query complains about `undefined` slots in keys.
    queryKey: ["asset-metadata", scopeKey, asset.id ?? null],
    enabled: Boolean(asset.id),
    staleTime: STALE_TIME_MS$2,
    queryFn: async () => {
      const resp = await gatewayFetch2(API_PATHS.assetMetadata(asset.id));
      return await resp.json();
    },
  });
}
const DEFAULT_CHARS = 200;
const STALE_TIME_MS$1 = 5 * 60 * 1e3;
function useAssetTextPreview(asset, { enabled, chars: chars2 = DEFAULT_CHARS }) {
  const gatewayFetch2 = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  return useQuery({
    queryKey: ["asset-text-preview", scopeKey, asset.path, chars2],
    enabled: asset.type === "text",
    staleTime: STALE_TIME_MS$1,
    queryFn: async () => {
      const resp = await gatewayFetch2(API_PATHS.assetTextPreview(asset.path, chars2));
      return await resp.json();
    },
  });
}
function MetadataTable({ asset, className }) {
  const { t: t2 } = useTranslation();
  const rows = buildRows$1(asset, t2).filter((r2) => r2.value);
  if (rows.length === 0) return null;
  return (
    <dl
      data-slot="metadata-table"
      className={cn$2("grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs", className)}
    >
      {rows.map((row) => (
        <RowItem key={row.labelKey} t={t2} row={row} />
      ))}
    </dl>
  );
}
function RowItem({ t: t2, row }) {
  return (
    <>
      <dt className="text-foreground/30 opacity-70">
        {t2(`assetPreview.meta.${row.labelKey}`, {
          defaultValue: row.labelFallback,
        })}
      </dt>
      <dd className="text-foreground/70 truncate" title={row.value}>
        {row.value}
      </dd>
    </>
  );
}
function buildRows$1(asset, t2) {
  let rows;
  switch (asset.type) {
    case "image":
      rows = imageRows(asset);
      break;
    case "video":
      rows = videoRows(asset);
      break;
    case "audio":
      rows = audioRows(asset, t2);
      break;
    default:
      rows = fileRows(asset);
  }
  return [
    ...rows,
    {
      labelKey: "sourceWebsite",
      labelFallback: "Source website",
      value: browserAssetSourceWebsite(asset.metadata),
    },
  ];
}
function audioRows(asset, t2) {
  const sampleRate = pickNumber(asset.metadata, "sampleRate");
  const channels = pickNumber(asset.metadata, "channels");
  const bitRate = pickNumber(asset.metadata, "bitRate");
  const channelLabel =
    channels === 1
      ? t2("assetPreview.meta.mono", {
          defaultValue: "Mono",
        })
      : channels === 2
        ? t2("assetPreview.meta.stereo", {
            defaultValue: "Stereo",
          })
        : channels != null
          ? t2("assetPreview.meta.channelCount", {
              defaultValue: "{{count}} ch",
              count: channels,
            })
          : "";
  return [
    {
      labelKey: "duration",
      labelFallback: "Duration",
      value: formatDuration$3(asset.duration),
    },
    {
      labelKey: "sampleRate",
      labelFallback: "Sample rate",
      value: sampleRate != null ? `${sampleRate} Hz` : "",
    },
    {
      labelKey: "channels",
      labelFallback: "Channels",
      value: channelLabel,
    },
    {
      labelKey: "bitrate",
      labelFallback: "Bitrate",
      value: bitRate != null ? `${Math.round(bitRate / 1e3)} kbps` : "",
    },
    {
      labelKey: "size",
      labelFallback: "Size",
      value: formatFileSizeCompact(asset.fileSize),
    },
    {
      labelKey: "modifiedAt",
      labelFallback: "Modified",
      value: modifiedAt(asset),
    },
  ];
}
const WAVE_HEIGHT = 96;
const UNMUTED_VOLUME = 0.3;
const WAVE_COLOR = "#9ca3af";
const PROGRESS_COLOR = "#8b5cf6";
const CURSOR_COLOR = "#8b5cf6";
const PEAKS_ENDPOINT_THRESHOLD_BYTES = 10 * 1024 * 1024;
const PEAKS_BUCKETS = 200;
function AudioPreview({ asset }) {
  const { t: t2 } = useTranslation();
  const gatewayUrl2 = useGatewayUrl();
  const gatewayFetch2 = useGatewayFetch();
  const containerRef = reactExports.useRef(null);
  const wavesurferRef = reactExports.useRef(null);
  const [muted, setMuted] = reactExports.useState(true);
  const url2 = reactExports.useMemo(
    () => gatewayUrl2(API_PATHS.serveFile(asset.path)),
    [asset.path, gatewayUrl2],
  );
  reactExports.useEffect(() => {
    const container = containerRef.current;
    if (!container || !url2) return;
    const useServerPeaks = (asset.fileSize ?? 0) > PEAKS_ENDPOINT_THRESHOLD_BYTES;
    let cancelled = false;
    let ws2 = null;
    let cleanupReady = null;
    const fetchAbort = new AbortController();
    const start2 = (peaksData) => {
      if (cancelled || !container) return;
      ws2 = E$4.create({
        container,
        url: url2,
        ...(peaksData
          ? // Wavesurfer skips decodeAudioData entirely when both peaks
            // and duration are supplied at construction time. The `url`
            // is still required so the underlying <audio> can fetch the
            // bytes for actual playback (no PCM round-trip).
            {
              peaks: peaksData.peaks,
              duration: peaksData.duration,
            }
          : {}),
        waveColor: WAVE_COLOR,
        progressColor: PROGRESS_COLOR,
        cursorColor: CURSOR_COLOR,
        cursorWidth: 1,
        height: WAVE_HEIGHT,
        barWidth: 2,
        barGap: 1,
        barRadius: 1,
        normalize: true,
        // Click + drag-to-scrub.
        interact: true,
        // IMPORTANT: do NOT autoplay here. WaveSurferOptions has no `muted`
        // or `volume` init prop, so by the time we can call setMuted() in
        // the `ready` handler, autoplay would already be playing audibly
        // for a few hundred ms. Instead we mute first, then start play().
        autoplay: false,
      });
      wavesurferRef.current = ws2;
      const offReady = ws2.on("ready", () => {
        ws2?.setMuted(true);
        ws2?.setVolume(0);
        ws2?.play().catch(() => {});
      });
      cleanupReady = offReady;
    };
    if (useServerPeaks) {
      gatewayFetch2(API_PATHS.assetPeaks(asset.path, PEAKS_BUCKETS), {
        signal: fetchAbort.signal,
      })
        .then(async (resp) => {
          if (!resp.ok) throw new Error(`peaks endpoint returned ${resp.status}`);
          const data2 = await resp.json();
          if (
            !data2 ||
            !Array.isArray(data2.peaks) ||
            typeof data2.duration !== "number" ||
            !Number.isFinite(data2.duration)
          ) {
            throw new Error("peaks endpoint returned malformed payload");
          }
          start2(data2);
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          console.warn("[audio-preview] peaks endpoint failed, falling back to self-decode:", err);
          start2(null);
        });
    } else {
      start2(null);
    }
    return () => {
      cancelled = true;
      fetchAbort.abort();
      try {
        cleanupReady?.();
        ws2?.pause();
        ws2?.destroy();
      } catch {}
      wavesurferRef.current = null;
    };
  }, [url2, asset.path, gatewayFetch2]);
  reactExports.useEffect(() => {
    const ws2 = wavesurferRef.current;
    if (!ws2) return;
    ws2.setMuted(muted);
    ws2.setVolume(muted ? 0 : UNMUTED_VOLUME);
  }, [muted]);
  const toggleMute = reactExports.useCallback(() => setMuted((m3) => !m3), []);
  if (!url2) {
    return (
      <div
        data-slot="audio-preview-fallback"
        className="flex w-full h-24 items-center justify-center bg-muted text-muted-foreground text-xs"
      >
        {t2("assetPreview.audioUnavailable", {
          defaultValue: "Preview unavailable",
        })}
      </div>
    );
  }
  return (
    // Wrapper is `relative` so the mute toggle can absolute-position itself
    // in the corner without a separate row underneath the waveform — keeps
    // the hover card compact (matches the video-preview layout idiom).
    <div data-slot="audio-preview" className="relative w-full">
      <div
        ref={containerRef}
        data-slot="audio-preview-waveform"
        className="w-full bg-muted/30 cursor-pointer select-none"
        style={{
          height: WAVE_HEIGHT,
        }}
      />
      <button
        type="button"
        data-slot="audio-preview-mute-toggle"
        onClick={toggleMute}
        title={
          muted
            ? t2("assetPreview.unmute", {
                defaultValue: "Unmute",
              })
            : t2("assetPreview.mute", {
                defaultValue: "Mute",
              })
        }
        className={cn$2(
          // `z-10` is required because wavesurfer's internal <canvas> +
          // wrapper divs sit above the default stacking context, which
          // would otherwise hide / block clicks on this absolute-
          // positioned button.
          "absolute top-2 right-2 z-10 inline-flex items-center justify-center size-7 rounded-full",
          "bg-foreground/60 text-background hover:bg-foreground/80 transition-colors",
        )}
      >
        {muted ? <VolumeX size={14} strokeWidth={1.5} /> : <Volume2 size={14} strokeWidth={1.5} />}
      </button>
    </div>
  );
}
const PREVIEW_MAX_WIDTH$1 = 480;
function ImagePreview({ asset }) {
  const { t: t2 } = useTranslation();
  const gatewayUrl2 = useGatewayUrl();
  const [loaded, setLoaded] = reactExports.useState(false);
  const [errored, setErrored] = reactExports.useState(false);
  const src = reactExports.useMemo(() => {
    return withThumbnail(gatewayUrl2(API_PATHS.serveFile(asset.path)), PREVIEW_MAX_WIDTH$1);
  }, [asset.path, gatewayUrl2]);
  const onLoad = reactExports.useCallback(() => setLoaded(true), []);
  const onError = reactExports.useCallback(() => {
    setErrored(true);
    setLoaded(true);
  }, []);
  if (!src || errored) {
    return (
      <div
        data-slot="image-preview-fallback"
        className="flex w-full h-44 items-center justify-center bg-muted text-muted-foreground"
      >
        <FileTypeIcon
          {...classifyFileType({
            filename: asset.name || asset.path,
            mediaKind: "image",
          })}
          size={64}
          decorative={true}
        />
        <span className="sr-only">
          {t2("assetPreview.imageUnavailable", {
            defaultValue: "Preview unavailable",
          })}
        </span>
      </div>
    );
  }
  return (
    <div data-slot="image-preview" className="relative flex items-center justify-center">
      {!loaded && <Skeleton className="w-full h-44" />}
      <img
        src={src}
        alt={asset.name ?? asset.path}
        className="max-w-full max-h-80 object-contain"
        onLoad={onLoad}
        onError={onError}
        style={
          loaded
            ? void 0
            : {
                display: "none",
              }
        }
      />
    </div>
  );
}
function TextPreview({ asset: _asset, previewText, loading, error }) {
  const { t: t2 } = useTranslation();
  if (loading) {
    return (
      <div data-slot="text-preview" className="flex flex-col gap-1">
        <Skeleton className="w-full h-3" />
        <Skeleton className="w-5/6 h-3" />
        <Skeleton className="w-4/5 h-3" />
        <Skeleton className="w-5/6 h-3" />
      </div>
    );
  }
  if (error) {
    return (
      <span
        data-slot="text-preview-error"
        className="block text-xs text-foreground/30"
        title={error}
      >
        {t2("assetPreview.unsupportedText", {
          defaultValue: "Preview not supported",
        })}
      </span>
    );
  }
  if (!previewText) {
    return (
      <span data-slot="text-preview-empty" className="block text-xs text-foreground/30">
        {t2("assetPreview.emptyText", {
          defaultValue: "(empty file)",
        })}
      </span>
    );
  }
  return (
    <pre
      data-slot="text-preview"
      className={cn$2(
        "whitespace-pre-wrap break-words text-xs text-foreground/50 line-clamp-10 font-mono",
      )}
    >
      {previewText}
    </pre>
  );
}
let currentInlineVideo = null;
function claimInlineVideoSlot(video) {
  if (currentInlineVideo === video) return;
  if (currentInlineVideo) {
    try {
      currentInlineVideo.pause();
    } catch {}
  }
  currentInlineVideo = video;
}
const PREVIEW_LOOP_LIMIT_S = 5;
function VideoPreview({ asset }) {
  const { t: t2 } = useTranslation();
  const gatewayUrl2 = useGatewayUrl();
  const videoRef = reactExports.useRef(null);
  const progressRef = reactExports.useRef(null);
  const [muted, setMuted] = reactExports.useState(true);
  const src = reactExports.useMemo(
    () => gatewayUrl2(API_PATHS.assetVideoStream(asset.path, 480)),
    [asset.path, gatewayUrl2],
  );
  reactExports.useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    video.src = src;
    video.muted = true;
    video.play().catch(() => {});
    return () => {
      try {
        video.pause();
        video.removeAttribute("src");
        video.load();
      } catch {}
    };
  }, [src]);
  const onTimeUpdate = reactExports.useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime >= PREVIEW_LOOP_LIMIT_S) {
      video.currentTime = 0;
    }
    const duration = Math.max(video.duration || 0, PREVIEW_LOOP_LIMIT_S);
    const ratio =
      duration > 0 ? Math.min(video.currentTime / Math.min(duration, PREVIEW_LOOP_LIMIT_S), 1) : 0;
    const bar = progressRef.current;
    if (bar) bar.style.width = `${(ratio * 100).toFixed(1)}%`;
  }, []);
  const onLoadedMetadata = reactExports.useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {});
  }, []);
  const toggleMute = reactExports.useCallback(() => {
    setMuted((prev) => {
      const next2 = !prev;
      const video = videoRef.current;
      if (video) video.muted = next2;
      return next2;
    });
  }, []);
  if (!src) {
    return (
      <div
        data-slot="video-preview-fallback"
        className="flex w-full h-44 items-center justify-center bg-muted text-muted-foreground text-xs"
      >
        {t2("assetPreview.videoUnavailable", {
          defaultValue: "Preview unavailable",
        })}
      </div>
    );
  }
  return (
    // No fixed aspect ratio — the video element is constrained to the
    // popup's available content width (after padding) and a 320 px height
    // cap, so chromium picks whichever axis hits first and proportionally
    // scales the other. Landscape clips end up ~content-width × auto;
    // portrait clips ~auto × 320, both flush inside the card with no
    // horizontal overflow.
    <div data-slot="video-preview" className="relative flex items-center justify-center">
      <video
        ref={videoRef}
        muted={muted}
        loop={true}
        playsInline={true}
        onPlay={(e2) => claimInlineVideoSlot(e2.currentTarget)}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        className="max-w-full max-h-80 block bg-black"
      />
      <button
        type="button"
        data-slot="video-preview-mute-toggle"
        onClick={toggleMute}
        title={
          muted
            ? t2("assetPreview.unmute", {
                defaultValue: "Unmute",
              })
            : t2("assetPreview.mute", {
                defaultValue: "Mute",
              })
        }
        className={cn$2(
          "absolute top-2 right-2 inline-flex items-center justify-center size-7 rounded-full",
          "bg-foreground/60 text-background hover:bg-foreground/80 transition-colors",
        )}
      >
        {muted ? <VolumeX size={14} strokeWidth={1.5} /> : <Volume2 size={14} strokeWidth={1.5} />}
      </button>
      <div
        data-slot="video-preview-progress"
        className="absolute bottom-0 left-0 right-0 h-1 bg-foreground/20 pointer-events-none"
      >
        <div
          ref={progressRef}
          className="h-full bg-primary transition-[width] duration-100"
          style={{
            width: "0%",
          }}
        />
      </div>
    </div>
  );
}
export function AssetHoverPopup(props) {
  if (!props.target) return null;
  return <AssetHoverPopupInner {...props} target={props.target} />;
}
function AssetHoverPopupInner({ target, onMouseEnter, onMouseLeave, onLocateOnCanvas }) {
  const { asset, anchor } = target;
  const { t: t2 } = useTranslation();
  const [positioned, setPositioned] = reactExports.useState(false);
  reactExports.useLayoutEffect(() => {
    const id2 = requestAnimationFrame(() => setPositioned(true));
    return () => cancelAnimationFrame(id2);
  }, []);
  const [lineageOpen, setLineageOpen] = reactExports.useState(false);
  const lineageCloseTimer = reactExports.useRef(null);
  const cancelLineageClose = reactExports.useCallback(() => {
    if (lineageCloseTimer.current) {
      clearTimeout(lineageCloseTimer.current);
      lineageCloseTimer.current = null;
    }
  }, []);
  const openLineage = reactExports.useCallback(() => {
    cancelLineageClose();
    setLineageOpen(true);
  }, [cancelLineageClose]);
  const scheduleLineageClose = reactExports.useCallback(() => {
    cancelLineageClose();
    lineageCloseTimer.current = setTimeout(() => {
      setLineageOpen(false);
      lineageCloseTimer.current = null;
    }, 150);
  }, [cancelLineageClose]);
  reactExports.useEffect(() => {
    return () => {
      if (lineageCloseTimer.current) {
        clearTimeout(lineageCloseTimer.current);
        lineageCloseTimer.current = null;
      }
    };
  }, []);
  reactExports.useEffect(() => {
    setLineageOpen(false);
  }, [asset.id, asset.path]);
  const textPreview = useAssetTextPreview(asset, {
    enabled: true,
  });
  const metadata = useAssetMetadata(asset, {
    enabled: true,
  });
  const mergedAsset = reactExports.useMemo(() => {
    const fetched = metadata.data?.ok ? metadata.data.metadata : void 0;
    return {
      ...asset,
      metadata: {
        ...(fetched ?? {}),
      },
    };
  }, [asset, metadata.data]);
  const handleLocate = reactExports.useCallback(() => {
    if (!onLocateOnCanvas || !asset.id) return;
    onLocateOnCanvas();
  }, [onLocateOnCanvas, asset.id]);
  const previewBody = reactExports.useMemo(() => {
    switch (asset.type) {
      case "image":
        return <ImagePreview asset={asset} />;
      case "video":
        return <VideoPreview asset={asset} />;
      case "audio":
        return <AudioPreview asset={asset} />;
      case "text": {
        const data2 = textPreview.data;
        const previewText = data2?.ok ? data2.text : null;
        const errorReason = data2 && !data2.ok ? data2.reason : null;
        const errorMessage2 = textPreview.error ? String(textPreview.error) : errorReason;
        return (
          <TextPreview
            asset={asset}
            previewText={previewText}
            loading={textPreview.isLoading || textPreview.isFetching}
            error={errorMessage2}
          />
        );
      }
      default:
        return null;
    }
  }, [asset, textPreview.data, textPreview.error, textPreview.isLoading, textPreview.isFetching]);
  const locateDisabled = !onLocateOnCanvas || !asset.id;
  const lineageAvailable = !!asset.id;
  return (
    <PreviewCardRoot open={true}>
      <PreviewCardPortal>
        <PreviewCardPositioner
          anchor={anchor}
          side="left"
          sideOffset={8}
          align="start"
          alignOffset={0}
          className={cn$2(
            "isolate z-50",
            // Smooth slide when the panel's overlay host swaps to a new
            // target row without unmounting (target prop changes but
            // state.kind stays 'hover'). Without this, base-ui repositions
            // via inline transform and the popup snaps — visible as a
            // flicker. Gated on `positioned` so the initial mount's
            // (0,0) → first-anchor jump stays instant; see useLayoutEffect
            // above. Relies on base-ui Positioner using transform for
            // placement (true as of @base-ui/react@1.3.0); revisit if it
            // ever moves to top/left.
            positioned &&
              "transition-transform duration-200 ease-out motion-reduce:transition-none",
          )}
        >
          <PreviewCardPopup
            data-slot="preview-card-content"
            onPointerEnter={onMouseEnter}
            onPointerLeave={onMouseLeave}
            className={cn$2(
              "elevated-surface-border z-50 w-[260px] origin-(--transform-origin) rounded-lg bg-popover text-popover-foreground shadow-lg outline-none",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
          >
            <div className="relative flex flex-col gap-3 p-3">
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-medium text-foreground/70 truncate"
                  title={asset.name ?? asset.path}
                >
                  {asset.name ?? asset.path.split(/[/\\]/).pop() ?? asset.path}
                </span>
                <button
                  type="button"
                  data-slot="asset-hover-card-locate"
                  onClick={handleLocate}
                  disabled={locateDisabled}
                  title={t2("assetPreview.locateOnCanvas")}
                  className={cn$2(
                    "inline-flex items-center justify-center size-6 rounded",
                    "text-foreground/50 hover:text-foreground/70 hover:bg-muted transition-colors",
                    "disabled:opacity-40 disabled:pointer-events-none",
                  )}
                >
                  <Crosshair size={14} strokeWidth={1.5} />
                </button>
              </div>
              {previewBody && <div data-slot="asset-hover-card-preview">{previewBody}</div>}
              <MetadataTable asset={mergedAsset} />
              {lineageAvailable && (
                <button
                  type="button"
                  data-slot="asset-hover-card-lineage-toggle"
                  onMouseEnter={openLineage}
                  onMouseLeave={scheduleLineageClose}
                  onFocus={openLineage}
                  onBlur={scheduleLineageClose}
                  className={cn$2(
                    "flex w-full items-center justify-between gap-1 py-1.5 text-xs cursor-default",
                    "text-foreground/50 opacity-40 hover:opacity-100 focus-visible:opacity-100 transition-opacity",
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Network size={12} strokeWidth={1.5} />
                    {t2("assetPreview.viewLineage")}
                  </span>
                  <ChevronLeft size={12} strokeWidth={1.5} />
                </button>
              )}
              {lineageOpen && (
                // biome-ignore lint/a11y/noStaticElementInteractions: hover-driven dependency reveal
                <div
                  data-slot="asset-hover-card-lineage"
                  onMouseEnter={openLineage}
                  onMouseLeave={scheduleLineageClose}
                  className={cn$2(
                    "absolute top-0 right-full mr-1 w-[260px] max-h-full overflow-auto",
                    "elevated-surface-border rounded-lg bg-popover text-popover-foreground shadow-lg",
                    "p-3 flex flex-col gap-2",
                  )}
                >
                  <span className="text-xs font-medium text-foreground/70">
                    {t2("assetPreview.lineageTitle")}
                  </span>
                  <LineageTree assetId={asset.id} />
                </div>
              )}
            </div>
          </PreviewCardPopup>
        </PreviewCardPositioner>
      </PreviewCardPortal>
    </PreviewCardRoot>
  );
}
