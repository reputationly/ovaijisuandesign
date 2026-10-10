// team-assets-sidebar-panel.jsx
import { ChevronDown, ChevronRight$1 as ChevronRight, FolderInput, FolderPlus, getVisibleCloudUploads, jsxRuntimeExports, LoaderCircle, reactExports, usePlatform, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Button, cn$2 as cn } from "../infra/dialog-content.jsx";
import {
  AssetRowThumb,
  useAnchorProjectAssets,
  useExternalFileDrop,
} from "./rename-local-node-dialog.jsx";
import { PlatformFileManagerLabel } from "../settings/request-prompt-prefill.jsx";
import {
  Download,
  FolderOpen,
  ImageOutlineIcon,
  Trash2,
  Upload,
} from "../media-editing/package.jsx";
import {
  filterMoveOptions,
  isCloudFileDownloadEnabled,
  normalizeCloudParentId,
  resolveSyncState,
  useCloudMoveOptions,
  useCloudReviewNodes,
  useDownloadingNodeIds,
  useProjectMemberNames,
} from "./use-cloud-review-nodes.js";
import {
  ContextMenu,
  workspaceEvents,
} from "../workspace/topbar-state-context.jsx";
import {
  NodeUpdatedMeta,
  RenameNodeDialog,
  SyncBadge,
  UploadingAssets,
} from "../canvas/uploading-assets.jsx";
import { PencilIcon } from "../workspace/home-service.jsx";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../workspace/context-menu-content.jsx";
import { AddToChatIcon } from "../canvas/fullscreen-icon.jsx";
import {
  FolderTileGlyph,
  NewFolderDialog,
  rejectionToastText,
  toastFolderDownloadSummary,
  useProjectAssetsService,
  useTransfers,
} from "../infra/new-folder-dialog.jsx";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import {
  deleteCloudNode,
  listCloudFolderChildren,
  moveCloudNode,
  onDidChangeCloudAssets,
  resolveTypeBucket,
  ROOT_KEY,
} from "./list-all-cloud-folders.js";
import { ProjectAssetThumbnail } from "../infra/project-asset-thumbnail-generation.jsx";
import {
  CLOUD_ASSET_ACCEPT,
  cloudAssetMimeType,
} from "./wrap-as-asset-center-error.js";
import { cloudErrorDisplayMessage } from "../workspace/asset-lineage-query-key.js";
import { useCloudSearch } from "./use-cloud-search.js";
import { gateCloudAssetUploads } from "./gate-cloud-asset-uploads.js";
import { TransfersButton } from "../canvas/transfers-button.jsx";
import {
  buildResourceDragItem,
  RESOURCE_DRAG_MIME,
} from "../text-editor/build-asr-gateway-request.js";
import { useMoveDnd } from "../infra/use-move-dnd.js";
import { DeleteNodeDialog } from "../infra/delete-node-dialog.jsx";
import { MoveNodeDialog } from "../infra/move-node-dialog.jsx";
import { useProjectActions } from "../settings/use-project-actions.js";
import { PageStateBoundary } from "./page-state-boundary.jsx";
import { RetryIcon } from "../workspace/use-prompt-icon.jsx";
import { MediaLightbox } from "./text-preview.jsx";
function flattenCloudTree(childrenByFolder, expanded) {
  const rows = [];
  const visit2 = (folderId, depth2, segments, parentIds) => {
    const children2 = childrenByFolder.get(folderId) ?? [];
    for (const node2 of children2.filter((child) => child.kind === "folder")) {
      rows.push({
        node: node2,
        depth: depth2,
        segments,
        parentIds,
      });
      if (expanded.has(node2.id)) {
        visit2(
          node2.id,
          depth2 + 1,
          [...segments, node2.name],
          [...parentIds, node2.id],
        );
      }
    }
    for (const node2 of children2.filter((child) => child.kind === "file")) {
      rows.push({
        node: node2,
        depth: depth2,
        segments,
        parentIds,
      });
    }
  };
  visit2("", 0, [], []);
  return rows;
}
function waitForTransferDone(service2, transferId) {
  return new Promise((resolve, reject) => {
    const settle2 = (status, error) => {
      if (status === "done") {
        subscription.dispose();
        resolve();
      } else if (status === "failed" || status === "canceled") {
        subscription.dispose();
        reject(new Error(error ?? status));
      }
    };
    const subscription = service2.onDidChangeTransfer((item) => {
      if (item.id === transferId) settle2(item.status, item.error);
    });
    void service2.listTransfers().then((items) => {
      const item = items.find((entry) => entry.id === transferId);
      if (item) settle2(item.status, item.error);
    });
  });
}
function mediaKind(node2) {
  if (node2.mimeType.startsWith("image/")) return "image";
  if (node2.mimeType.startsWith("video/")) return "video";
  const ext = node2.name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  return void 0;
}
function cloudThumbSrc(node2) {
  return node2.review === "pass" && node2.cdnUrl && mediaKind(node2) === "image"
    ? node2.cdnUrl
    : void 0;
}
function ReviewBadge({ node: node2 }) {
  const { t: t2 } = useTranslation();
  if (node2.kind === "folder" || node2.review === "pass") return null;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-1.5 py-px text-[10px] font-medium",
        node2.review === "reviewing"
          ? "bg-muted text-muted-foreground"
          : "bg-destructive/10 text-destructive",
      )}
    >
      {node2.review === "reviewing"
        ? t2("cloudAssets.reviewing")
        : t2("cloudAssets.blocked")}
    </span>
  );
}
function CloudAssetGridCard({
  row,
  expanded,
  loading,
  downloaded,
  syncState,
  onToggle,
  onClick,
  onAddToCanvas,
  onAddToAgent,
  onDownload,
  onDownloadFolder,
  onReveal,
  onRename,
  onMove,
  onDelete,
  dndProps,
  dropActive,
}) {
  const { t: t2 } = useTranslation();
  const node2 = row.node;
  const isFolder = node2.kind === "folder";
  const typeBucket = resolveTypeBucket({
    kind: node2.kind,
    name: node2.name,
    mime: node2.mimeType,
  });
  const Chevron2 = expanded ? ChevronDown : ChevronRight;
  const canFetch2 = node2.review === "pass" && !!node2.cdnUrl;
  const canDownload = isCloudFileDownloadEnabled(node2, syncState);
  const canUse = downloaded || canFetch2;
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <button
            type="button"
            aria-expanded={isFolder ? expanded : void 0}
            onClick={() => (isFolder ? onToggle(node2) : onClick(node2))}
            {...dndProps}
            className={cn(
              "group relative flex min-w-0 flex-col rounded-lg p-1 text-left outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-1 focus-visible:ring-ring/50",
              !isFolder && "cursor-grab active:cursor-grabbing",
              node2.review === "block" && "opacity-60",
              dropActive && "bg-foreground/[0.12]",
            )}
            data-action-ui-id={
              isFolder
                ? "project-assets-sidebar.cloud-folder-grid-card"
                : "project-assets-sidebar.cloud-file-grid-card"
            }
          >
            <ProjectAssetThumbnail
              name={node2.name}
              kind={node2.kind}
              typeBucket={typeBucket}
              thumbnailSrc={isFolder ? void 0 : cloudThumbSrc(node2)}
              variant="grid"
              muted={node2.review === "reviewing"}
              className="aspect-square rounded-sm border-0"
            />
            {!isFolder ? (
              <span className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] items-center gap-1">
                <ReviewBadge node={node2} />
                <SyncBadge state={syncState} className="text-[10px]" />
              </span>
            ) : null}
            <span className="flex min-w-0 items-center gap-1 px-1 py-1">
              {isFolder ? (
                <Icon
                  icon={Chevron2}
                  size="xs"
                  strokeWidth={1.5}
                  className="shrink-0 text-muted-foreground"
                />
              ) : null}
              <span
                className="min-w-0 flex-1 truncate text-[12px] text-foreground/70"
                title={node2.name}
              >
                {node2.name}
              </span>
              {isFolder && loading ? (
                <LoaderCircle
                  size={12}
                  strokeWidth={1.5}
                  className="shrink-0 animate-spin text-muted-foreground"
                />
              ) : null}
            </span>
          </button>
        }
      />
      <ContextMenuContent>
        {isFolder ? (
          <>
            <ContextMenuItem onClick={() => onDownloadFolder(row)}>
              <Icon icon={Download} size="sm" strokeWidth={1.5} />
              {t2("cloudAssets.download")}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onRename(row)}>
              <PencilIcon size={14} strokeWidth={1.5} />
              {t2("cloudAssets.rename")}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onMove(row)}>
              <Icon icon={FolderInput} size="sm" strokeWidth={1.5} />
              {t2("cloudAssets.moveTo")}
            </ContextMenuItem>
          </>
        ) : (
          <>
            <ContextMenuItem
              disabled={!canUse}
              onClick={() => void onAddToCanvas(row)}
            >
              <Icon icon={ImageOutlineIcon} size="sm" strokeWidth={1.5} />
              {t2("localAssets.addToCanvas")}
            </ContextMenuItem>
            <ContextMenuItem
              disabled={!canUse}
              onClick={() => void onAddToAgent(row)}
            >
              <AddToChatIcon size={14} />
              {t2("localAssets.addToAgent")}
            </ContextMenuItem>
            <ContextMenuItem
              disabled={!canDownload}
              onClick={() => void onDownload(row)}
            >
              <Icon icon={Download} size="sm" strokeWidth={1.5} />
              {t2("cloudAssets.download")}
            </ContextMenuItem>
            <ContextMenuItem
              disabled={!downloaded}
              onClick={() => void onReveal(node2)}
            >
              <Icon icon={FolderOpen} size="sm" strokeWidth={1.5} />
              <PlatformFileManagerLabel />
            </ContextMenuItem>
            <ContextMenuItem
              disabled={node2.review === "block"}
              onClick={() => onRename(row)}
            >
              <PencilIcon size={14} strokeWidth={1.5} />
              {t2("cloudAssets.rename")}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onMove(row)}>
              <Icon icon={FolderInput} size="sm" strokeWidth={1.5} />
              {t2("cloudAssets.moveTo")}
            </ContextMenuItem>
          </>
        )}
        <ContextMenuItem variant="destructive" onClick={() => onDelete(row)}>
          <Icon icon={Trash2} size="sm" strokeWidth={1.5} />
          {t2("cloudAssets.delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
function CloudFolderRow({
  row,
  expanded,
  loading,
  memberNames,
  onToggle,
  onDownload,
  onRename,
  onMove,
  onDelete,
  dndProps,
  dropActive,
}) {
  const { t: t2 } = useTranslation();
  const Chevron2 = expanded ? ChevronDown : ChevronRight;
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <button
            type="button"
            onClick={() => onToggle(row.node)}
            {...dndProps}
            className={cn(
              "list-row-hit-area group flex h-7 w-full items-center gap-1.5 rounded-md px-2 text-left transition-colors hover:bg-foreground/5",
              dropActive && "bg-primary/10",
            )}
            style={{
              paddingLeft: `${8 + row.depth * 14}px`,
            }}
            data-action-ui-id="project-assets-sidebar.cloud-folder-row"
          >
            <Chevron2
              size={13}
              strokeWidth={1.5}
              className="shrink-0 text-muted-foreground/70"
            />
            <span className="inline-flex size-5 shrink-0 items-center justify-center">
              <FolderTileGlyph className="!h-8 !w-8 origin-center scale-[0.625]" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
              {row.node.name}
            </span>
            <NodeUpdatedMeta
              node={row.node}
              memberNames={memberNames}
              className="hidden max-w-36 text-[11px] group-hover:block"
            />
            {loading ? (
              <LoaderCircle
                size={12}
                strokeWidth={1.5}
                className="shrink-0 animate-spin text-muted-foreground"
              />
            ) : null}
          </button>
        }
      />
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onDownload(row)}>
          <Download size={14} strokeWidth={1.5} />
          {t2("cloudAssets.download")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onRename(row)}>
          <PencilIcon size={14} strokeWidth={1.5} />
          {t2("cloudAssets.rename")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onMove(row)}>
          <FolderInput size={14} strokeWidth={1.5} />
          {t2("cloudAssets.moveTo")}
        </ContextMenuItem>
        <ContextMenuItem variant="destructive" onClick={() => onDelete(row)}>
          <Trash2 size={14} strokeWidth={1.5} />
          {t2("cloudAssets.delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
function CloudFileRow({
  row,
  downloaded,
  syncState,
  memberNames,
  onClick,
  onAddToCanvas,
  onAddToAgent,
  onDownload,
  onReveal,
  onRename,
  onMove,
  onDelete,
  dndProps,
}) {
  const { t: t2 } = useTranslation();
  const canFetch2 = row.node.review === "pass" && !!row.node.cdnUrl;
  const canDownload = isCloudFileDownloadEnabled(row.node, syncState);
  const canUse = downloaded || canFetch2;
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          // biome-ignore lint/a11y/noStaticElementInteractions: drag source for the project asset tree
          <div
            {...dndProps}
            onClick={() => onClick(row.node)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onClick(row.node);
            }}
            className={cn(
              "list-row-hit-area group flex h-8 w-full cursor-grab items-center gap-2 rounded-md px-2 transition-colors hover:bg-foreground/5 active:cursor-grabbing",
              row.node.review === "block" && "opacity-60",
            )}
            style={{
              paddingLeft: `${8 + row.depth * 14 + 18}px`,
            }}
            data-action-ui-id="project-assets-sidebar.cloud-file-row"
          >
            <AssetRowThumb
              thumbSrc={cloudThumbSrc(row.node)}
              filename={row.node.name}
              mime={row.node.mimeType}
            />
            <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
              {row.node.name}
            </span>
            <SyncBadge state={syncState} className="text-[10px]" />
            <ReviewBadge node={row.node} />
            <NodeUpdatedMeta
              node={row.node}
              memberNames={memberNames}
              className="hidden max-w-36 text-[11px] group-hover:block"
            />
          </div>
        }
      />
      <ContextMenuContent>
        <ContextMenuItem
          disabled={!canUse}
          onClick={() => void onAddToCanvas(row)}
        >
          <ImageOutlineIcon size={14} strokeWidth={1.5} />
          {t2("localAssets.addToCanvas")}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!canUse}
          onClick={() => void onAddToAgent(row)}
        >
          <AddToChatIcon size={14} strokeWidth={1.5} />
          {t2("localAssets.addToAgent")}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!canDownload}
          onClick={() => void onDownload(row)}
        >
          <Download size={14} strokeWidth={1.5} />
          {t2("cloudAssets.download")}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!downloaded}
          onClick={() => void onReveal(row.node)}
        >
          <FolderOpen size={14} strokeWidth={1.5} />
          <PlatformFileManagerLabel />
        </ContextMenuItem>
        <ContextMenuItem
          disabled={row.node.review === "block"}
          onClick={() => onRename(row)}
        >
          <PencilIcon size={14} strokeWidth={1.5} />
          {t2("cloudAssets.rename")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onMove(row)}>
          <FolderInput size={14} strokeWidth={1.5} />
          {t2("cloudAssets.moveTo")}
        </ContextMenuItem>
        <ContextMenuItem variant="destructive" onClick={() => onDelete(row)}>
          <Trash2 size={14} strokeWidth={1.5} />
          {t2("cloudAssets.delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
export function TeamAssetsSidebarPanel({
  project: project2,
  cloudProjectId,
  onToolbarStateChange,
  searchQuery,
}) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const service2 = useProjectAssetsService();
  const { ensureProjectFolderName } = useProjectActions();
  const review = useCloudReviewNodes(cloudProjectId);
  const transfers = useTransfers();
  const projectTransfers = reactExports.useMemo(
    () =>
      transfers.transfers.filter(
        (item) => item.cloudProjectId === cloudProjectId,
      ),
    [cloudProjectId, transfers.transfers],
  );
  const memberNames = useProjectMemberNames(cloudProjectId);
  const downloadingIds = useDownloadingNodeIds(
    projectTransfers,
    cloudProjectId,
  );
  const downloadStartingIdsRef = reactExports.useRef(new Set());
  const anchorProjectAssets = useAnchorProjectAssets();
  const [folderName, setFolderName] = reactExports.useState(void 0);
  const [assetsDir, setAssetsDir] = reactExports.useState(void 0);
  const [localRecords, setLocalRecords] = reactExports.useState(new Map());
  reactExports.useEffect(() => {
    let disposed = false;
    void ensureProjectFolderName(project2.id).then((name2) => {
      if (!disposed) setFolderName(name2);
    });
    return () => {
      disposed = true;
    };
  }, [ensureProjectFolderName, project2.id]);
  reactExports.useEffect(() => {
    if (!folderName) return;
    let disposed = false;
    void service2.getAssetsDir(folderName).then((dir) => {
      if (!disposed) setAssetsDir(dir);
    });
    return () => {
      disposed = true;
    };
  }, [folderName, service2]);
  const refreshLocalRecords = reactExports.useCallback(async () => {
    if (!folderName) return;
    try {
      const records = await service2.listAssets(folderName);
      setLocalRecords(new Map(records.map((record2) => [record2.id, record2])));
    } catch {}
  }, [folderName, service2]);
  reactExports.useEffect(() => {
    void refreshLocalRecords();
  }, [refreshLocalRecords]);
  reactExports.useEffect(() => {
    if (!folderName) return;
    const subscription = service2.onDidChangeAssets((event) => {
      if (event.projectFolderName === folderName) void refreshLocalRecords();
    });
    return () => subscription.dispose();
  }, [folderName, refreshLocalRecords, service2]);
  const syncMap = reactExports.useMemo(() => {
    const next2 = new Map();
    for (const [id2, record2] of localRecords) {
      if (record2.remoteUpdatedAt !== void 0)
        next2.set(id2, record2.remoteUpdatedAt);
    }
    return next2;
  }, [localRecords]);
  const [childrenByFolder, setChildrenByFolder] = reactExports.useState(
    new Map(),
  );
  const [loadingFolders, setLoadingFolders] = reactExports.useState(new Set());
  const [expanded, setExpanded] = reactExports.useState(new Set());
  const epochRef = reactExports.useRef(0);
  const loadFolder = reactExports.useCallback(
    async (folderId, silent = false) => {
      const epoch = epochRef.current;
      setLoadingFolders((previous2) => new Set(previous2).add(folderId));
      try {
        const all2 = [];
        let cursor = "";
        do {
          const page = await listCloudFolderChildren(
            cloudProjectId,
            folderId,
            cursor || void 0,
          );
          all2.push(...page.nodes);
          cursor = page.hasMore ? page.nextCursor : "";
        } while (cursor);
        if (epoch !== epochRef.current) return;
        setChildrenByFolder((previous2) =>
          new Map(previous2).set(folderId, all2),
        );
      } catch (err) {
        if (!silent && epoch === epochRef.current) {
          dedupedToast.error(
            cloudErrorDisplayMessage(err) ?? t2("cloudAssets.failServer"),
          );
        }
      } finally {
        setLoadingFolders((previous2) => {
          const next2 = new Set(previous2);
          next2.delete(folderId);
          return next2;
        });
      }
    },
    [cloudProjectId, t2],
  );
  reactExports.useEffect(() => {
    epochRef.current += 1;
    setChildrenByFolder(new Map());
    setExpanded(new Set());
    void loadFolder("");
  }, [loadFolder]);
  const refresh = reactExports.useCallback(
    (silent = false) => {
      void loadFolder("", silent);
      for (const folderId of expanded) void loadFolder(folderId, true);
      void refreshLocalRecords();
      review.refresh();
    },
    [expanded, loadFolder, refreshLocalRecords, review.refresh],
  );
  reactExports.useEffect(() => {
    const subscription = onDidChangeCloudAssets((event) => {
      if (event.projectId === cloudProjectId) refresh(true);
    });
    return () => subscription.dispose();
  }, [cloudProjectId, refresh]);
  const toggleFolder = reactExports.useCallback(
    (node2) => {
      const willExpand = !expanded.has(node2.id);
      setExpanded((previous2) => {
        const next2 = new Set(previous2);
        if (next2.has(node2.id)) next2.delete(node2.id);
        else next2.add(node2.id);
        return next2;
      });
      if (willExpand && !childrenByFolder.has(node2.id))
        void loadFolder(node2.id);
    },
    [childrenByFolder, expanded, loadFolder],
  );
  const rows = reactExports.useMemo(
    () => flattenCloudTree(childrenByFolder, expanded),
    [childrenByFolder, expanded],
  );
  const rootLoading = loadingFolders.has("");
  const trimmedSearch = (searchQuery ?? "").trim();
  const visibleUploads = reactExports.useMemo(
    () => getVisibleCloudUploads(projectTransfers, trimmedSearch),
    [projectTransfers, trimmedSearch],
  );
  const hasVisibleUploads = visibleUploads.length > 0;
  const search2 = useCloudSearch(
    trimmedSearch ? cloudProjectId : void 0,
    trimmedSearch,
  );
  const isSearching = trimmedSearch.length > 0;
  const searchRows = reactExports.useMemo(() => {
    if (!isSearching) return [];
    return search2.nodes.map((node2) => {
      const crumbs =
        search2.folderPathsById.get(normalizeCloudParentId(node2.parentId)) ??
        [];
      return {
        node: node2,
        depth: 0,
        segments: crumbs.map((crumb) => crumb.name),
        parentIds: crumbs.map((crumb) => crumb.id),
      };
    });
  }, [isSearching, search2.nodes, search2.folderPathsById]);
  const [viewMode, setViewMode] = reactExports.useState("tree");
  const handleMove = reactExports.useCallback(
    async (row, target) => {
      try {
        await moveCloudNode(row.node.id, target.folderId);
      } catch (err) {
        dedupedToast.error(
          cloudErrorDisplayMessage(err) ?? t2("cloudAssets.failServer"),
        );
        return;
      }
      if (folderName) {
        try {
          if (row.node.kind === "folder") {
            await service2.moveLocalFolder(
              folderName,
              [...row.segments, row.node.name],
              target.segments,
              {
                onConflict: "uniquify",
                missingOk: true,
              },
            );
          } else {
            await service2.moveLocalAsset(
              folderName,
              row.node.id,
              target.segments,
              {
                onConflict: "uniquify",
                missingOk: true,
              },
            );
          }
        } catch {
          dedupedToast.warning(
            t2("cloudAssets.moveLocalFailed", {
              name: row.node.name,
            }),
          );
        }
      }
      if (target.folderId && !expanded.has(target.folderId)) {
        setChildrenByFolder((previous2) => {
          if (!previous2.has(target.folderId)) return previous2;
          const next2 = new Map(previous2);
          next2.delete(target.folderId);
          return next2;
        });
      }
      refresh(true);
    },
    [expanded, folderName, refresh, service2, t2],
  );
  const canDropRow = reactExports.useCallback((row, target) => {
    if (row.node.kind === "folder" && target.idPath.includes(row.node.id))
      return false;
    const parentId =
      row.parentIds.length === 0 ? "" : row.parentIds[row.parentIds.length - 1];
    return (
      normalizeCloudParentId(target.folderId) !==
      normalizeCloudParentId(parentId)
    );
  }, []);
  const moveDnd = useMoveDnd({
    keyOf: (target) => target.key,
    canDrop: canDropRow,
    onDrop: (row, target) => void handleMove(row, target),
  });
  const rowDnd = reactExports.useCallback(
    (row) => ({
      dndProps: {
        draggable: true,
        onDragStart: (event) => {
          moveDnd.startDrag(event, row);
          if (row.node.kind !== "file") return;
          const record2 = localRecords.get(row.node.id);
          if (!record2 || !assetsDir || !folderName) return;
          const item = {
            ...buildResourceDragItem(
              `${assetsDir}/${record2.relPath}`,
              record2.relPath,
              record2.name,
              false,
              void 0,
              {
                assetId: record2.id,
                projectFolderName: folderName,
              },
            ),
            external: true,
          };
          event.dataTransfer.setData(
            RESOURCE_DRAG_MIME,
            JSON.stringify([item]),
          );
        },
        onDragEnd: moveDnd.endDrag,
        ...(row.node.kind === "folder"
          ? moveDnd.targetProps({
              key: row.node.id,
              folderId: row.node.id,
              segments: [...row.segments, row.node.name],
              idPath: [...row.parentIds, row.node.id],
            })
          : moveDnd.blockerProps()),
      },
      dropActive: row.node.kind === "folder" && moveDnd.overKey === row.node.id,
    }),
    [assetsDir, folderName, localRecords, moveDnd],
  );
  const rootDropTarget = {
    key: "",
    folderId: "",
    segments: [],
    idPath: [],
  };
  const rootDropProps = moveDnd.targetProps(rootDropTarget);
  const settledKey = reactExports.useMemo(() => {
    let uploadsDone = 0;
    let downloadsDone = 0;
    for (const item of projectTransfers) {
      if (
        item.kind === "upload" &&
        (item.status === "done" || item.status === "reviewing")
      ) {
        uploadsDone += 1;
      } else if (item.kind === "download" && item.status === "done") {
        downloadsDone += 1;
      }
    }
    return `${uploadsDone}:${downloadsDone}`;
  }, [projectTransfers]);
  const settledKeyRef = reactExports.useRef(settledKey);
  reactExports.useEffect(() => {
    if (settledKey !== settledKeyRef.current) refresh(true);
    settledKeyRef.current = settledKey;
  }, [settledKey, refresh]);
  const ensureLocalCopy = reactExports.useCallback(
    async (row) => {
      if (!folderName) return null;
      const find2 = async () => {
        const records = await service2.listAssets(folderName);
        const record2 = records.find((entry) => entry.id === row.node.id);
        if (!record2) return null;
        const absolute = await service2.getAssetAbsolutePath(
          folderName,
          row.node.id,
        );
        return absolute
          ? {
              absolute,
              record: record2,
            }
          : null;
      };
      const existing = await find2();
      if (existing) return existing;
      if (row.node.review !== "pass" || !row.node.cdnUrl) return null;
      const transfer = await service2.startDownload({
        projectFolderName: folderName,
        cloudProjectId,
        nodeId: row.node.id,
        name: row.node.name,
        cdnUrl: row.node.cdnUrl,
        folderSegments: row.segments,
        size: row.node.size || void 0,
        mime: row.node.mimeType || void 0,
        remoteUpdatedAt: row.node.updatedAt || void 0,
        remoteCreatedAt: row.node.createdAt || void 0,
      });
      await waitForTransferDone(service2, transfer.id);
      void refreshLocalRecords();
      return find2();
    },
    [cloudProjectId, folderName, refreshLocalRecords, service2],
  );
  const withLocalCopy = reactExports.useCallback(
    async (row, action) => {
      const needsDownload = !localRecords.has(row.node.id);
      const toastId = needsDownload
        ? dedupedToast.loading(t2("cloudAssets.statusDownloading"))
        : void 0;
      try {
        const copy2 = await ensureLocalCopy(row);
        if (!copy2) {
          dedupedToast.error(
            t2("localAssets.importFailed", {
              name: row.node.name,
            }),
          );
          return;
        }
        await action(copy2);
      } catch (err) {
        dedupedToast.error(err instanceof Error ? err.message : String(err));
      } finally {
        if (toastId !== void 0) dedupedToast.dismiss(toastId);
      }
    },
    [ensureLocalCopy, localRecords, t2],
  );
  const anchorLocalCopy = reactExports.useCallback(
    async ({ absolute, record: record2 }) => {
      if (!folderName) return void 0;
      try {
        const [anchored] = await anchorProjectAssets([
          {
            path: absolute,
            assetId: record2.id,
            projectFolderName: folderName,
          },
        ]);
        if (!anchored) throw new Error("anchor returned no rows");
        return anchored;
      } catch {
        dedupedToast.error(
          t2("localAssets.importFailed", {
            name: record2.name,
          }),
        );
        return void 0;
      }
    },
    [anchorProjectAssets, folderName, t2],
  );
  const handleAddToCanvas = reactExports.useCallback(
    (row) =>
      withLocalCopy(row, async (copy2) => {
        if (!folderName) return;
        const { absolute, record: record2 } = copy2;
        workspaceEvents.fireAddToCanvas([
          {
            ...buildResourceDragItem(
              absolute,
              record2.relPath,
              record2.name,
              false,
              void 0,
              {
                assetId: record2.id,
                projectFolderName: folderName,
              },
            ),
            external: true,
          },
        ]);
      }),
    [folderName, withLocalCopy],
  );
  const handleAddToAgent = reactExports.useCallback(
    (row) =>
      withLocalCopy(row, async (copy2) => {
        const anchored = await anchorLocalCopy(copy2);
        if (anchored)
          workspaceEvents.fireAddToChat(anchored.path, copy2.record.name);
      }),
    [anchorLocalCopy, withLocalCopy],
  );
  const handleReveal = reactExports.useCallback(
    async (node2) => {
      if (!folderName) return;
      const absolute = await service2.getAssetAbsolutePath(
        folderName,
        node2.id,
      );
      if (!absolute || !platform2.shell.showItemInFolder) {
        dedupedToast.error(
          t2("localAssets.openFailed", {
            name: node2.name,
          }),
        );
        void refreshLocalRecords();
        return;
      }
      await platform2.shell.showItemInFolder(absolute);
    },
    [folderName, platform2.shell, refreshLocalRecords, service2, t2],
  );
  const [newFolderOpen, setNewFolderOpen] = reactExports.useState(false);
  const [renameTarget, setRenameTarget] = reactExports.useState(null);
  const renameTargetRef = reactExports.useRef(null);
  const openRename = reactExports.useCallback((row) => {
    renameTargetRef.current = row;
    setRenameTarget(row);
  }, []);
  const [deleteTarget, setDeleteTarget] = reactExports.useState(null);
  const [moveDialogTarget, setMoveDialogTarget] = reactExports.useState(null);
  const cloudMove = useCloudMoveOptions(
    cloudProjectId,
    moveDialogTarget !== null,
  );
  const moveOptions = reactExports.useMemo(
    () =>
      filterMoveOptions(
        cloudMove.options,
        moveDialogTarget?.node.kind === "folder"
          ? [...moveDialogTarget.segments, moveDialogTarget.node.name]
          : void 0,
      ),
    [cloudMove.options, moveDialogTarget],
  );
  const moveNoopKey = (() => {
    if (!moveDialogTarget) return ROOT_KEY;
    const parentId =
      moveDialogTarget.parentIds[moveDialogTarget.parentIds.length - 1] ?? "";
    return parentId === "" ? ROOT_KEY : parentId;
  })();
  const [preview, setPreview] = reactExports.useState(null);
  const fileInputRef = reactExports.useRef(null);
  const handleDownload = reactExports.useCallback(
    async (row) => {
      if (row.node.kind !== "file" || !row.node.cdnUrl || !folderName) return;
      if (
        downloadingIds.has(row.node.id) ||
        downloadStartingIdsRef.current.has(row.node.id)
      ) {
        return;
      }
      downloadStartingIdsRef.current.add(row.node.id);
      try {
        await service2.startDownload({
          projectFolderName: folderName,
          cloudProjectId,
          nodeId: row.node.id,
          name: row.node.name,
          cdnUrl: row.node.cdnUrl,
          folderSegments: row.segments,
          size: row.node.size || void 0,
          mime: row.node.mimeType || void 0,
          remoteUpdatedAt: row.node.updatedAt || void 0,
          remoteCreatedAt: row.node.createdAt || void 0,
        });
      } catch (err) {
        dedupedToast.error(err instanceof Error ? err.message : String(err));
      } finally {
        downloadStartingIdsRef.current.delete(row.node.id);
      }
    },
    [cloudProjectId, downloadingIds, folderName, service2],
  );
  const handleDownloadFolder = reactExports.useCallback(
    async (row) => {
      if (!folderName) return;
      try {
        const summary = await service2.startFolderDownload({
          projectFolderName: folderName,
          cloudProjectId,
          folderNodeId: row.node.id,
          folderName: row.node.name,
          folderSegments: [...row.segments, row.node.name],
        });
        toastFolderDownloadSummary(t2, summary);
      } catch (err) {
        dedupedToast.error(
          cloudErrorDisplayMessage(err) ??
            t2("cloudAssets.folderDownloadFailed", {
              message: t2("cloudAssets.failServer"),
            }),
        );
      }
    },
    [cloudProjectId, folderName, service2, t2],
  );
  const handleUploadPicked = reactExports.useCallback(
    async (files) => {
      if (files.length === 0 || !folderName) return;
      const { accepted, rejected } = await gateCloudAssetUploads(
        files,
        (file) => window.hilo?.webUtils?.getPathForFile(file),
      );
      for (const rejection of rejected) {
        dedupedToast.error(rejectionToastText(t2, rejection));
      }
      for (const entry of accepted) {
        try {
          await service2.startUpload({
            projectFolderName: folderName,
            cloudProjectId,
            parentId: "",
            filePath: entry.path,
            name: entry.file.name,
            // Browser MIME when known; extension fallback otherwise (md /
            // htable etc. — cloud review needs a real MIME type).
            mime: entry.file.type || cloudAssetMimeType(entry.file.name),
            // Own-upload mirror: sidebar uploads land at the cloud root, so
            // the `.assets/` copy does too — no re-download needed later.
            mirrorFolderSegments: [],
          });
        } catch (err) {
          dedupedToast.error(
            t2("cloudAssets.uploadStartFailed", {
              name: entry.file.name,
              message: err instanceof Error ? err.message : String(err),
            }),
          );
        }
      }
    },
    [cloudProjectId, folderName, service2, t2],
  );
  const handleDelete2 = reactExports.useCallback(
    async (node2) => {
      await deleteCloudNode(node2.id);
      if (folderName) {
        try {
          if (node2.kind === "folder") {
            await service2.deleteLocalFolder(folderName, [
              ...(deleteTarget?.segments ?? []),
              node2.name,
            ]);
          } else {
            await service2.deleteLocalAsset(folderName, node2.id);
          }
        } catch {
          dedupedToast.warning(
            t2("cloudAssets.deleteLocalFailed", {
              name: node2.name,
            }),
          );
        }
      }
      refresh(true);
    },
    [deleteTarget, folderName, refresh, service2, t2],
  );
  const handleRenamed = reactExports.useCallback(
    async (row, newName) => {
      if (folderName) {
        try {
          if (row.node.kind === "folder") {
            await service2.renameLocalFolder(
              folderName,
              [...row.segments, row.node.name],
              newName,
              {
                onConflict: "uniquify",
                missingOk: true,
              },
            );
          } else {
            const snapshot2 = syncMap.get(row.node.id);
            const wasSynced =
              snapshot2 !== void 0 && snapshot2 >= row.node.updatedAt;
            await service2.renameLocalAsset(folderName, row.node.id, newName, {
              onConflict: "uniquify",
              missingOk: true,
              ...(wasSynced && row.node.updatedAt
                ? {
                    remoteUpdatedAt: row.node.updatedAt,
                  }
                : {}),
            });
          }
        } catch {
          dedupedToast.warning(
            t2("cloudAssets.renameLocalFailed", {
              name: row.node.name,
            }),
          );
        }
        void refreshLocalRecords();
      }
      refresh(true);
    },
    [folderName, refresh, refreshLocalRecords, service2, syncMap, t2],
  );
  const handleFileClick = reactExports.useCallback((node2) => {
    if (node2.review !== "pass" || !node2.cdnUrl) return;
    const media = mediaKind(node2);
    if (media)
      setPreview({
        kind: media,
        node: node2,
      });
  }, []);
  const handleDeleteBlocked = reactExports.useCallback(
    async (node2) => {
      try {
        await deleteCloudNode(node2.id);
      } catch (err) {
        dedupedToast.error(
          cloudErrorDisplayMessage(err) ?? t2("cloudAssets.failServer"),
        );
        return;
      }
      review.refresh();
      refresh(true);
    },
    [refresh, review.refresh, t2],
  );
  reactExports.useEffect(() => {
    if (!onToolbarStateChange) return;
    onToolbarStateChange({
      viewMode,
      onViewModeChange: setViewMode,
      onRefresh: () => {
        refresh(true);
        if (isSearching) search2.refresh();
      },
      trailingSlot: (
        <TransfersButton
          reviewNodes={review.nodes}
          reviewLoading={review.loading}
          transfers={projectTransfers}
          onOpen={review.refresh}
          onCancelTransfer={transfers.cancelTransfer}
          onDeleteBlocked={(node2) => void handleDeleteBlocked(node2)}
          onRemoveTransfer={transfers.removeTransfer}
        />
      ),
    });
    return () => onToolbarStateChange(void 0);
  }, [
    onToolbarStateChange,
    viewMode,
    refresh,
    isSearching,
    search2.refresh,
    review.nodes,
    review.loading,
    review.refresh,
    projectTransfers,
    transfers.cancelTransfer,
    transfers.removeTransfer,
    handleDeleteBlocked,
  ]);
  const renderAssetRows = (visibleRows, searchResult) =>
    viewMode === "grid" ? (
      <div
        className="grid grid-cols-2 gap-1 px-2 pb-2"
        data-action-ui-id="project-assets-sidebar.grid"
      >
        <UploadingAssets
          transfers={visibleUploads}
          viewMode="grid"
          compact={true}
        />
        {visibleRows.map((row) => (
          <CloudAssetGridCard
            key={`${row.node.kind}:${row.node.id}`}
            row={row}
            expanded={!searchResult && expanded.has(row.node.id)}
            loading={!searchResult && loadingFolders.has(row.node.id)}
            downloaded={localRecords.has(row.node.id)}
            syncState={resolveSyncState(row.node, syncMap, downloadingIds)}
            onToggle={searchResult ? () => {} : toggleFolder}
            onClick={handleFileClick}
            onAddToCanvas={handleAddToCanvas}
            onAddToAgent={handleAddToAgent}
            onDownload={handleDownload}
            onDownloadFolder={(target) => void handleDownloadFolder(target)}
            onReveal={handleReveal}
            onRename={openRename}
            onMove={setMoveDialogTarget}
            onDelete={setDeleteTarget}
            {...rowDnd(row)}
          />
        ))}
      </div>
    ) : (
      <>
        <UploadingAssets
          transfers={visibleUploads}
          viewMode="list"
          compact={true}
        />
        {visibleRows.map((row) =>
          row.node.kind === "folder" ? (
            <CloudFolderRow
              key={`folder:${row.node.id}`}
              row={row}
              expanded={!searchResult && expanded.has(row.node.id)}
              loading={!searchResult && loadingFolders.has(row.node.id)}
              memberNames={memberNames}
              onToggle={searchResult ? () => {} : toggleFolder}
              onDownload={(target) => void handleDownloadFolder(target)}
              onRename={openRename}
              onMove={setMoveDialogTarget}
              onDelete={setDeleteTarget}
              {...rowDnd(row)}
            />
          ) : (
            <CloudFileRow
              key={`file:${row.node.id}`}
              row={row}
              downloaded={localRecords.has(row.node.id)}
              syncState={resolveSyncState(row.node, syncMap, downloadingIds)}
              memberNames={memberNames}
              onClick={handleFileClick}
              onAddToCanvas={handleAddToCanvas}
              onAddToAgent={handleAddToAgent}
              onDownload={handleDownload}
              onReveal={handleReveal}
              onRename={openRename}
              onMove={setMoveDialogTarget}
              onDelete={setDeleteTarget}
              {...rowDnd(row)}
            />
          ),
        )}
      </>
    );
  const externalDropProps = useExternalFileDrop(rootDropProps, {
    enabled: !!folderName,
    onFiles: handleUploadPicked,
  });
  return (
    <div
      className="flex h-full min-h-0 flex-col"
      data-action-ui-id="project-assets-sidebar.panel"
    >
      <section
        {...externalDropProps}
        aria-label={t2("projectAssets.title")}
        data-action-ui-id="project-assets-sidebar.drop-area"
        className={cn(
          "min-h-0 flex-1 overflow-y-auto py-1",
          moveDnd.overKey === "" && "bg-primary/5",
        )}
      >
        {isSearching ? (
          <>
            {search2.error ? (
              <PageStateBoundary
                error={true}
                density="panel"
                className="h-full"
                errorOptions={{
                  title: search2.membershipError
                    ? t2("cloudAssets.notTeamMemberTitle")
                    : void 0,
                  description: search2.membershipError
                    ? t2("cloudAssets.notTeamMemberDescription")
                    : (search2.userMessage ?? t2("cloudAssets.failServer")),
                  retry: {
                    icon: <RetryIcon size={14} />,
                    onClick: search2.refresh,
                  },
                }}
              />
            ) : searchRows.length === 0 &&
              !hasVisibleUploads &&
              !search2.loading ? (
              <PageStateBoundary
                empty={true}
                density="panel"
                className="h-full"
                emptyOptions={{
                  title: t2("fileExplorer.noMatchingFiles"),
                }}
              />
            ) : (
              renderAssetRows(searchRows, true)
            )}
            {search2.loading ? (
              <p className="flex items-center justify-center gap-1 px-4 py-3 text-xs text-muted-foreground">
                <LoaderCircle
                  size={12}
                  strokeWidth={1.5}
                  className="animate-spin"
                />
              </p>
            ) : search2.hasMore ? (
              <button
                type="button"
                onClick={() => search2.loadMore()}
                className="mx-2 my-1 flex h-7 w-[calc(100%-1rem)] items-center justify-center rounded-md text-xs text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                data-action-ui-id="project-assets-sidebar.search-load-more"
              >
                {t2("cloudAssets.loadMore")}
              </button>
            ) : null}
          </>
        ) : rows.length === 0 && !hasVisibleUploads && !rootLoading ? (
          <PageStateBoundary
            empty={true}
            density="panel"
            className="h-full"
            emptyOptions={{
              title: t2("cloudAssets.emptyTitle"),
              description: t2("cloudAssets.emptyDescription"),
            }}
          />
        ) : (
          renderAssetRows(rows, false)
        )}
      </section>
      <div className="flex shrink-0 items-center gap-1 border-t border-border p-2">
        <Button
          type="button"
          size="sm"
          onClick={() => setNewFolderOpen(true)}
          className="h-8 flex-1 justify-center gap-1 rounded-md text-[12px] font-medium"
          data-action-ui-id="project-assets-sidebar.new-folder"
        >
          <FolderPlus size={14} strokeWidth={1.5} />
          {t2("cloudAssets.newFolder")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!folderName}
          onClick={() => fileInputRef.current?.click()}
          className="h-8 flex-1 justify-center gap-1 rounded-md bg-foreground/[0.08] text-[12px] font-medium hover:bg-foreground/[0.12] dark:bg-foreground/[0.14] dark:hover:bg-foreground/[0.18]"
          data-action-ui-id="project-assets-sidebar.upload"
        >
          <Upload size={14} strokeWidth={1.5} />
          {t2("cloudAssets.upload")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple={true}
          accept={CLOUD_ASSET_ACCEPT}
          className="hidden"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            void handleUploadPicked(files);
          }}
        />
      </div>
      <NewFolderDialog
        open={newFolderOpen}
        projectId={cloudProjectId}
        parentId=""
        onOpenChange={setNewFolderOpen}
        onCreated={() => refresh(true)}
      />
      <RenameNodeDialog
        node={renameTarget?.node ?? null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        onRenamed={(_node, newName) => {
          const row = renameTargetRef.current;
          if (row) void handleRenamed(row, newName);
        }}
      />
      <DeleteNodeDialog
        node={deleteTarget?.node ?? null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleDelete2}
      />
      <MoveNodeDialog
        open={moveDialogTarget !== null}
        name={moveDialogTarget?.node.name ?? ""}
        options={moveOptions}
        loading={cloudMove.loading}
        noopKey={moveNoopKey}
        onOpenChange={(open) => {
          if (!open) setMoveDialogTarget(null);
        }}
        onConfirm={async (destination) => {
          if (!moveDialogTarget) return;
          await handleMove(moveDialogTarget, {
            key: destination.key,
            folderId: destination.key === ROOT_KEY ? "" : destination.key,
            segments: destination.segments,
            idPath: [],
          });
        }}
      />
      {preview ? (
        <MediaLightbox
          kind={preview.kind}
          src={preview.node.cdnUrl}
          alt={preview.node.name}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </div>
  );
}
