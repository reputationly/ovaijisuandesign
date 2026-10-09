// team-assets-sidebar-panel.jsx
import { jsxRuntimeExports, useTranslation, reactExports, dedupedToast, API_PATHS, usePlatform, getVisibleCloudUploads, LoaderCircle, FolderPlus, ChevronDown, ChevronRight$1, FolderInput, useCurrentWorkspace, useStorage, X$7, Search, Toggle$1, PreviewCardRoot, PreviewCardPortal, PreviewCardPositioner, PreviewCardPopup, Video$2, Music$2, File$3, reactDomExports, Loader2 } from "../vendor.js";
import { cloudAssetMimeType, CLOUD_ASSET_ACCEPT, PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS } from "../m15/check-cloud-asset-upload.js";
import { withThumbnail } from "../m15/deferred-thumbnail-image-generation.jsx";
import { Icon, projectLog, TooltipProvider, Tooltip, TooltipTrigger } from "../m15/graph.jsx";
import { PlatformFileManagerLabel, getFileManagerLabelKey } from "../m15/interest-selection-provider.jsx";
import { Upload, Download, ImageOutlineIcon, FolderOpen, Trash2, Minimize2, Maximize2 } from "../m15/parse-item.jsx";
import { checkTextSafety, cloudErrorDisplayMessage } from "../m15/record-recent-workspace-opened.jsx";
import { listCloudFolderChildren, onDidChangeCloudAssets, useCloudSearch, moveCloudNode, ROOT_KEY, deleteCloudNode, resolveTypeBucket } from "../m15/use-cloud-search.js";
import { useCloudReviewNodes, useProjectMemberNames, useDownloadingNodeIds, normalizeCloudParentId, useCloudMoveOptions, filterMoveOptions, gateCloudAssetUploads, resolveSyncState, isCloudFileDownloadEnabled, localFolderOptions, useEntityHoverPreview, useStableCallback } from "../m15/use-entity-hover-preview.js";
import { workspaceEvents, ContextMenu } from "../m15/use-hub-logo-hover-animation.jsx";
import { useGatewayFetch, useGatewayUrl, workspaceDisplayName, folderNameFromPath } from "../m15/use-resizable-width.js";
import { useWorkspaceProject } from "../m15/workspace-events.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button$1,
  cn$2,
  TooltipContent,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { Input3 } from "../asset-center/shared/select-content.jsx";
import {
  splitFilename,
  buildRenamedFilename,
  AssetRenameInput,
  FileTypeThumbnail,
  TransfersButton,
  UploadingAssets,
  RenameNodeDialog,
  SyncBadge,
  NodeUpdatedMeta,
  importPickedFiles,
  DeleteLocalNodeDialog,
} from "../m10/delete-local-node-dialog.jsx";
import { RESOURCE_DRAG_MIME, buildResourceDragItem } from "../m01/myers-line-hunks.js";
import {
  useProjectAssetsService,
  useTransfers,
  useMoveDnd,
  toastFolderDownloadSummary,
  rejectionToastText,
  NewFolderDialog,
  DeleteNodeDialog,
  MoveNodeDialog,
  ProjectAssetThumbnail,
  FolderTileGlyph,
} from "../m10/use-move-dnd.jsx";
import { useProjectActions } from "../m10/custom-provider-form.jsx";
import { PageStateBoundary } from "../asset-center/shared/page-state-boundary.jsx";
import {
  RetryIcon,
  PencilIcon,
  LocalFolderIcon,
  StrokeIcon,
} from "../m08/browser-inspiration-urls.jsx";
import { MediaLightbox } from "../asset-center/shared/image-lightbox.jsx";
import {
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "../m10/new-workspace-dialog.jsx";
import { AddToChatIcon } from "../m01/generating-media-area.jsx";
import {
  AssetsDropzoneEmpty,
  EntityHoverCardBody,
} from "../m10/asset-center-relocation-coach-mark.jsx";
import { SegmentedSwitch } from "../m09/use-credit-details.jsx";
import { toggleVariants } from "../asset-center/shared/misc-02.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
export function NewLocalFolderDialog({ open, onOpenChange, onCreate }) {
  const { t: t2 } = useTranslation();
  const [name2, setName] = reactExports.useState("");
  const [pending2, setPending] = reactExports.useState(false);
  const trimmed = name2.trim();
  reactExports.useEffect(() => {
    if (open) return;
    setName("");
    setPending(false);
  }, [open]);
  const handleConfirm = reactExports.useCallback(async () => {
    if (!trimmed || pending2) return;
    setPending(true);
    try {
      const safety = await checkTextSafety(trimmed);
      if (!safety.pass) {
        dedupedToast.error(t2("rename.safetyBlocked"));
        return;
      }
      await onCreate(trimmed);
      onOpenChange(false);
    } catch (err) {
      dedupedToast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }, [onCreate, onOpenChange, pending2, t2, trimmed]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" data-action-ui-id="local-assets.new-folder-dialog">
        <DialogHeader>
          <DialogTitle className="text-body-14 leading-5 font-medium">
            {t2("localAssets.newFolderTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t2("localAssets.newFolderTitle")}
          </DialogDescription>
        </DialogHeader>
        <Input3
          autoFocus={true}
          value={name2}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            void handleConfirm();
          }}
          aria-label={t2("localAssets.newFolderPlaceholder")}
          placeholder={t2("localAssets.newFolderPlaceholder")}
          autoComplete="off"
        />
        <DialogFooter>
          <Button$1 variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t2("common.cancel")}
          </Button$1>
          <Button$1 size="sm" disabled={!trimmed || pending2} onClick={() => void handleConfirm()}>
            {t2("common.confirm")}
          </Button$1>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function RenameLocalNodeDialog({ node: node2, onOpenChange, onRename }) {
  const { t: t2 } = useTranslation();
  const [name2, setName] = reactExports.useState("");
  const [pending2, setPending] = reactExports.useState(false);
  const { tail: extension2 } = splitFilename(node2?.name ?? "", node2?.kind);
  const fullName = buildRenamedFilename(node2?.name ?? "", name2, node2?.kind);
  reactExports.useEffect(() => {
    setName(splitFilename(node2?.name ?? "", node2?.kind).head);
    setPending(false);
  }, [node2]);
  const handleConfirm = reactExports.useCallback(async () => {
    if (!node2 || !fullName || pending2 || fullName === node2.name) return;
    setPending(true);
    try {
      await onRename(node2, fullName);
      onOpenChange(false);
    } catch (err) {
      const message2 = err instanceof Error ? err.message : String(err);
      dedupedToast.error(
        message2.includes("duplicate_name") ? t2("localAssets.renameDuplicate") : message2,
      );
    } finally {
      setPending(false);
    }
  }, [fullName, node2, onOpenChange, onRename, pending2, t2]);
  return (
    <Dialog open={node2 !== null} onOpenChange={onOpenChange}>
      <DialogContent size="sm" data-action-ui-id="local-assets.rename-dialog">
        <DialogHeader>
          <DialogTitle className="text-body-14 leading-5 font-medium">
            {t2("localAssets.renameTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">{t2("localAssets.renameTitle")}</DialogDescription>
        </DialogHeader>
        <AssetRenameInput
          extension={extension2}
          data-action-ui-id="local-assets.rename-input"
          autoFocus={true}
          value={name2}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
            event.preventDefault();
            void handleConfirm();
          }}
          aria-label={t2("localAssets.renamePlaceholder")}
          placeholder={t2("localAssets.renamePlaceholder")}
          autoComplete="off"
        />
        <DialogFooter>
          <Button$1 variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t2("common.cancel")}
          </Button$1>
          <Button$1
            size="sm"
            disabled={!fullName || pending2 || fullName === node2?.name}
            onClick={() => void handleConfirm()}
          >
            {t2("common.confirm")}
          </Button$1>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function useAnchorProjectAssets() {
  const scopedFetch = useGatewayFetch();
  return reactExports.useCallback(
    async (items) => {
      if (items.length === 0) return [];
      const res = await scopedFetch(API_PATHS.anchorProjectAsset, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items,
        }),
      });
      if (!res.ok) throw new Error(`Anchor failed: ${res.status}`);
      const data2 = await res.json();
      return (data2.anchored ?? []).filter((row) => Boolean(row?.path && row?.filename));
    },
    [scopedFetch],
  );
}
function useExternalFileDrop(rootDropProps, { enabled, onFiles }) {
  return reactExports.useMemo(() => {
    const isExternalFileDrag = (event) =>
      enabled &&
      event.dataTransfer.types.includes("Files") &&
      !event.dataTransfer.types.includes(RESOURCE_DRAG_MIME);
    return {
      ...rootDropProps,
      onDragOver: (event) => {
        if (!isExternalFileDrag(event)) {
          rootDropProps.onDragOver(event);
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "copy";
      },
      onDrop: (event) => {
        if (!isExternalFileDrag(event)) {
          rootDropProps.onDrop(event);
          return;
        }
        event.stopPropagation();
        if (event.defaultPrevented) return;
        event.preventDefault();
        void onFiles([...event.dataTransfer.files]);
      },
    };
  }, [enabled, onFiles, rootDropProps]);
}
function AssetRowThumb({ thumbSrc, filename, mime }) {
  const [failed, setFailed] = reactExports.useState(false);
  if (failed || !thumbSrc) {
    return <FileTypeThumbnail filename={filename} mime={mime} />;
  }
  return (
    <img
      src={thumbSrc}
      alt=""
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      className="size-5 shrink-0 rounded-sm border border-border object-cover"
    />
  );
}
function TeamAssetsSidebarPanel({
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
    () => transfers.transfers.filter((item) => item.cloudProjectId === cloudProjectId),
    [cloudProjectId, transfers.transfers],
  );
  const memberNames = useProjectMemberNames(cloudProjectId);
  const downloadingIds = useDownloadingNodeIds(projectTransfers, cloudProjectId);
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
      if (record2.remoteUpdatedAt !== void 0) next2.set(id2, record2.remoteUpdatedAt);
    }
    return next2;
  }, [localRecords]);
  const [childrenByFolder, setChildrenByFolder] = reactExports.useState(new Map());
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
          const page = await listCloudFolderChildren(cloudProjectId, folderId, cursor || void 0);
          all2.push(...page.nodes);
          cursor = page.hasMore ? page.nextCursor : "";
        } while (cursor);
        if (epoch !== epochRef.current) return;
        setChildrenByFolder((previous2) => new Map(previous2).set(folderId, all2));
      } catch (err) {
        if (!silent && epoch === epochRef.current) {
          dedupedToast.error(cloudErrorDisplayMessage(err) ?? t2("cloudAssets.failServer"));
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
      if (willExpand && !childrenByFolder.has(node2.id)) void loadFolder(node2.id);
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
  const search2 = useCloudSearch(trimmedSearch ? cloudProjectId : void 0, trimmedSearch);
  const isSearching = trimmedSearch.length > 0;
  const searchRows = reactExports.useMemo(() => {
    if (!isSearching) return [];
    return search2.nodes.map((node2) => {
      const crumbs = search2.folderPathsById.get(normalizeCloudParentId(node2.parentId)) ?? [];
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
        dedupedToast.error(cloudErrorDisplayMessage(err) ?? t2("cloudAssets.failServer"));
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
            await service2.moveLocalAsset(folderName, row.node.id, target.segments, {
              onConflict: "uniquify",
              missingOk: true,
            });
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
    if (row.node.kind === "folder" && target.idPath.includes(row.node.id)) return false;
    const parentId = row.parentIds.length === 0 ? "" : row.parentIds[row.parentIds.length - 1];
    return normalizeCloudParentId(target.folderId) !== normalizeCloudParentId(parentId);
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
          event.dataTransfer.setData(RESOURCE_DRAG_MIME, JSON.stringify([item]));
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
      if (item.kind === "upload" && (item.status === "done" || item.status === "reviewing")) {
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
        const absolute = await service2.getAssetAbsolutePath(folderName, row.node.id);
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
            ...buildResourceDragItem(absolute, record2.relPath, record2.name, false, void 0, {
              assetId: record2.id,
              projectFolderName: folderName,
            }),
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
        if (anchored) workspaceEvents.fireAddToChat(anchored.path, copy2.record.name);
      }),
    [anchorLocalCopy, withLocalCopy],
  );
  const handleReveal = reactExports.useCallback(
    async (node2) => {
      if (!folderName) return;
      const absolute = await service2.getAssetAbsolutePath(folderName, node2.id);
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
  const cloudMove = useCloudMoveOptions(cloudProjectId, moveDialogTarget !== null);
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
    const parentId = moveDialogTarget.parentIds[moveDialogTarget.parentIds.length - 1] ?? "";
    return parentId === "" ? ROOT_KEY : parentId;
  })();
  const [preview, setPreview] = reactExports.useState(null);
  const fileInputRef = reactExports.useRef(null);
  const handleDownload = reactExports.useCallback(
    async (row) => {
      if (row.node.kind !== "file" || !row.node.cdnUrl || !folderName) return;
      if (downloadingIds.has(row.node.id) || downloadStartingIdsRef.current.has(row.node.id)) {
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
      const { accepted, rejected } = await gateCloudAssetUploads(files, (file) =>
        window.hilo?.webUtils?.getPathForFile(file),
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
            const wasSynced = snapshot2 !== void 0 && snapshot2 >= row.node.updatedAt;
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
        dedupedToast.error(cloudErrorDisplayMessage(err) ?? t2("cloudAssets.failServer"));
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
        <UploadingAssets transfers={visibleUploads} viewMode="grid" compact={true} />
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
        <UploadingAssets transfers={visibleUploads} viewMode="list" compact={true} />
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
    <div className="flex h-full min-h-0 flex-col" data-action-ui-id="project-assets-sidebar.panel">
      <section
        {...externalDropProps}
        aria-label={t2("projectAssets.title")}
        data-action-ui-id="project-assets-sidebar.drop-area"
        className={cn$2(
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
                  title: search2.membershipError ? t2("cloudAssets.notTeamMemberTitle") : void 0,
                  description: search2.membershipError
                    ? t2("cloudAssets.notTeamMemberDescription")
                    : (search2.userMessage ?? t2("cloudAssets.failServer")),
                  retry: {
                    icon: <RetryIcon size={14} />,
                    onClick: search2.refresh,
                  },
                }}
              />
            ) : searchRows.length === 0 && !hasVisibleUploads && !search2.loading ? (
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
                <LoaderCircle size={12} strokeWidth={1.5} className="animate-spin" />
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
        <Button$1
          type="button"
          size="sm"
          onClick={() => setNewFolderOpen(true)}
          className="h-8 flex-1 justify-center gap-1 rounded-md text-[12px] font-medium"
          data-action-ui-id="project-assets-sidebar.new-folder"
        >
          <FolderPlus size={14} strokeWidth={1.5} />
          {t2("cloudAssets.newFolder")}
        </Button$1>
        <Button$1
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
        </Button$1>
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
        visit2(node2.id, depth2 + 1, [...segments, node2.name], [...parentIds, node2.id]);
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
      className={cn$2(
        "shrink-0 rounded-full px-1.5 py-px text-[10px] font-medium",
        node2.review === "reviewing"
          ? "bg-muted text-muted-foreground"
          : "bg-destructive/10 text-destructive",
      )}
    >
      {node2.review === "reviewing" ? t2("cloudAssets.reviewing") : t2("cloudAssets.blocked")}
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
  const Chevron2 = expanded ? ChevronDown : ChevronRight$1;
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
            className={cn$2(
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
            <ContextMenuItem disabled={!canUse} onClick={() => void onAddToCanvas(row)}>
              <Icon icon={ImageOutlineIcon} size="sm" strokeWidth={1.5} />
              {t2("localAssets.addToCanvas")}
            </ContextMenuItem>
            <ContextMenuItem disabled={!canUse} onClick={() => void onAddToAgent(row)}>
              <AddToChatIcon size={14} />
              {t2("localAssets.addToAgent")}
            </ContextMenuItem>
            <ContextMenuItem disabled={!canDownload} onClick={() => void onDownload(row)}>
              <Icon icon={Download} size="sm" strokeWidth={1.5} />
              {t2("cloudAssets.download")}
            </ContextMenuItem>
            <ContextMenuItem disabled={!downloaded} onClick={() => void onReveal(node2)}>
              <Icon icon={FolderOpen} size="sm" strokeWidth={1.5} />
              <PlatformFileManagerLabel />
            </ContextMenuItem>
            <ContextMenuItem disabled={node2.review === "block"} onClick={() => onRename(row)}>
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
  const Chevron2 = expanded ? ChevronDown : ChevronRight$1;
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <button
            type="button"
            onClick={() => onToggle(row.node)}
            {...dndProps}
            className={cn$2(
              "list-row-hit-area group flex h-7 w-full items-center gap-1.5 rounded-md px-2 text-left transition-colors hover:bg-foreground/5",
              dropActive && "bg-primary/10",
            )}
            style={{
              paddingLeft: `${8 + row.depth * 14}px`,
            }}
            data-action-ui-id="project-assets-sidebar.cloud-folder-row"
          >
            <Chevron2 size={13} strokeWidth={1.5} className="shrink-0 text-muted-foreground/70" />
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
            className={cn$2(
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
        <ContextMenuItem disabled={!canUse} onClick={() => void onAddToCanvas(row)}>
          <ImageOutlineIcon size={14} strokeWidth={1.5} />
          {t2("localAssets.addToCanvas")}
        </ContextMenuItem>
        <ContextMenuItem disabled={!canUse} onClick={() => void onAddToAgent(row)}>
          <AddToChatIcon size={14} strokeWidth={1.5} />
          {t2("localAssets.addToAgent")}
        </ContextMenuItem>
        <ContextMenuItem disabled={!canDownload} onClick={() => void onDownload(row)}>
          <Download size={14} strokeWidth={1.5} />
          {t2("cloudAssets.download")}
        </ContextMenuItem>
        <ContextMenuItem disabled={!downloaded} onClick={() => void onReveal(row.node)}>
          <FolderOpen size={14} strokeWidth={1.5} />
          <PlatformFileManagerLabel />
        </ContextMenuItem>
        <ContextMenuItem disabled={row.node.review === "block"} onClick={() => onRename(row)}>
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
const GRID_THUMBNAIL_DISPLAY_WIDTH = 128;
const LIST_THUMBNAIL_DISPLAY_WIDTH = 20;
export function ProjectAssetsSidebarPanel({ onToolbarStateChange, searchQuery } = {}) {
  const workspacePath = useCurrentWorkspace();
  const project2 = useWorkspaceProject(workspacePath || void 0);
  if (!project2) return null;
  if (project2.kind === "team" && project2.remoteId) {
    return (
      <TeamAssetsSidebarPanel
        project={project2}
        cloudProjectId={project2.remoteId}
        onToolbarStateChange={onToolbarStateChange}
        searchQuery={searchQuery}
      />
    );
  }
  return (
    <LocalAssetsSidebarPanel
      project={project2}
      onToolbarStateChange={onToolbarStateChange}
      searchQuery={searchQuery}
    />
  );
}
function LocalAssetsSidebarPanel({ project: project2, onToolbarStateChange, searchQuery }) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const service2 = useProjectAssetsService();
  const { ensureProjectFolderName } = useProjectActions();
  const gatewayUrl2 = useGatewayUrl();
  const anchorProjectAssets = useAnchorProjectAssets();
  const [folderName, setFolderName] = reactExports.useState(void 0);
  const [assetsDir, setAssetsDir] = reactExports.useState(void 0);
  const [records, setRecords] = reactExports.useState([]);
  const [folders, setFolders] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [expanded, setExpanded] = reactExports.useState(new Set());
  const [newFolderOpen, setNewFolderOpen] = reactExports.useState(false);
  const [renameTarget, setRenameTarget] = reactExports.useState(null);
  const [deleteTarget, setDeleteTarget] = reactExports.useState(null);
  const [moveDialogTarget, setMoveDialogTarget] = reactExports.useState(null);
  const fileInputRef = reactExports.useRef(null);
  const [debouncedSearch, setDebouncedSearch] = reactExports.useState("");
  reactExports.useEffect(() => {
    const id2 = setTimeout(() => setDebouncedSearch((searchQuery ?? "").trim().toLowerCase()), 200);
    return () => clearTimeout(id2);
  }, [searchQuery]);
  const [viewMode, setViewMode] = reactExports.useState("tree");
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
  const refresh = reactExports.useCallback(async () => {
    if (!folderName) return;
    setLoading(true);
    try {
      const [nextRecords, nextFolders] = await Promise.all([
        service2.listAssets(folderName),
        service2.listLocalFolders(folderName),
      ]);
      setRecords(nextRecords);
      setFolders(nextFolders);
    } catch (err) {
      dedupedToast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [folderName, service2]);
  reactExports.useEffect(() => {
    void refresh();
  }, [refresh]);
  reactExports.useEffect(() => {
    if (!folderName) return;
    const subscription = service2.onDidChangeAssets((event) => {
      if (event.projectFolderName === folderName) void refresh();
    });
    return () => subscription.dispose();
  }, [folderName, refresh, service2]);
  reactExports.useEffect(() => {
    if (!onToolbarStateChange) return;
    onToolbarStateChange({
      viewMode,
      onViewModeChange: setViewMode,
      onRefresh: () => {
        void refresh();
      },
    });
    return () => onToolbarStateChange(void 0);
  }, [onToolbarStateChange, viewMode, refresh]);
  const effectiveExpanded = reactExports.useMemo(() => {
    if (!debouncedSearch) return expanded;
    return new Set([...folders]);
  }, [debouncedSearch, expanded, folders]);
  const flattened2 = reactExports.useMemo(
    () => flattenAssetTree(records, folders, effectiveExpanded),
    [records, folders, effectiveExpanded],
  );
  const rows = reactExports.useMemo(() => {
    if (!debouncedSearch) return flattened2;
    const matched = new Set();
    for (const row of flattened2) {
      if (row.name.toLowerCase().includes(debouncedSearch)) {
        matched.add(row.kind === "folder" ? `folder:${row.rel}` : `file:${row.record?.id ?? ""}`);
        const parts = row.rel.split("/").filter(Boolean);
        for (let i2 = 1; i2 < parts.length; i2++) {
          matched.add(`folder:${parts.slice(0, i2).join("/")}`);
        }
      }
    }
    return flattened2.filter((row) =>
      matched.has(row.kind === "folder" ? `folder:${row.rel}` : `file:${row.record?.id ?? ""}`),
    );
  }, [flattened2, debouncedSearch]);
  const toggleFolder = reactExports.useCallback((rel) => {
    setExpanded((previous2) => {
      const next2 = new Set(previous2);
      if (next2.has(rel)) next2.delete(rel);
      else next2.add(rel);
      return next2;
    });
  }, []);
  const absoluteFor = reactExports.useCallback(
    (record2) => (assetsDir ? `${assetsDir}/${record2.relPath}` : void 0),
    [assetsDir],
  );
  const thumbSrcFor = reactExports.useCallback(
    (record2, displayWidth) => {
      const absolute = absoluteFor(record2);
      if (!absolute) return void 0;
      const typeBucket = resolveTypeBucket({
        kind: "file",
        name: record2.name,
        mime: record2.mime,
      });
      if (typeBucket !== "image" && typeBucket !== "video" && typeBucket !== "audio") {
        return void 0;
      }
      return withThumbnail(gatewayUrl2(API_PATHS.serveLocal(absolute)), displayWidth);
    },
    [absoluteFor, gatewayUrl2],
  );
  const dragItemFor = reactExports.useCallback(
    (record2) => {
      const absolute = absoluteFor(record2);
      if (!absolute || !folderName) return void 0;
      return {
        ...buildResourceDragItem(absolute, record2.relPath, record2.name, false, void 0, {
          assetId: record2.id,
          projectFolderName: folderName,
        }),
        external: true,
      };
    },
    [absoluteFor, folderName],
  );
  const anchorForWorkspace = reactExports.useCallback(
    async (record2) => {
      const absolute = absoluteFor(record2);
      if (!absolute || !folderName) return void 0;
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
      } catch (err) {
        projectLog.error("project-asset-anchor-failed", {
          assetId: record2.id,
          name: record2.name,
          message: err instanceof Error ? err.message : String(err),
        });
        dedupedToast.error(
          t2("localAssets.importFailed", {
            name: record2.name,
          }),
        );
        return void 0;
      }
    },
    [absoluteFor, anchorProjectAssets, folderName, t2],
  );
  const handleAddToCanvas = reactExports.useCallback(
    (record2) => {
      const item = dragItemFor(record2);
      if (!item) return;
      workspaceEvents.fireAddToCanvas([item]);
    },
    [dragItemFor],
  );
  const handleAddToAgent = reactExports.useCallback(
    async (record2) => {
      const anchored = await anchorForWorkspace(record2);
      if (anchored) workspaceEvents.fireAddToChat(anchored.path, record2.name);
    },
    [anchorForWorkspace],
  );
  const handleReveal = reactExports.useCallback(
    async (record2) => {
      if (!folderName) return;
      const absolute = await service2.getAssetAbsolutePath(folderName, record2.id);
      if (!absolute || !platform2.shell.showItemInFolder) {
        dedupedToast.error(
          t2("localAssets.openFailed", {
            name: record2.name,
          }),
        );
        void refresh();
        return;
      }
      await platform2.shell.showItemInFolder(absolute);
    },
    [folderName, platform2.shell, refresh, service2, t2],
  );
  const handleRevealFolder = reactExports.useCallback(
    async (row) => {
      const absolute = assetsDir ? `${assetsDir}/${row.rel}` : void 0;
      if (!absolute || !platform2.shell.showItemInFolder) {
        dedupedToast.error(
          t2("localAssets.openFailed", {
            name: row.name,
          }),
        );
        void refresh();
        return;
      }
      await platform2.shell.showItemInFolder(absolute);
    },
    [assetsDir, platform2.shell, refresh, t2],
  );
  const handleDelete2 = reactExports.useCallback(
    async (row) => {
      if (!folderName) return;
      if (row.kind === "folder") {
        await service2.deleteLocalFolder(folderName, row.rel.split("/"));
      } else if (row.record) {
        await service2.deleteLocalAsset(folderName, row.record.id);
      }
      void refresh();
    },
    [folderName, refresh, service2],
  );
  const handleRename = reactExports.useCallback(
    async (_node, newName) => {
      if (!folderName || !renameTarget) return;
      if (renameTarget.kind === "folder") {
        await service2.renameLocalFolder(folderName, renameTarget.rel.split("/"), newName);
      } else if (renameTarget.record) {
        await service2.renameLocalAsset(folderName, renameTarget.record.id, newName);
      }
      void refresh();
    },
    [folderName, refresh, renameTarget, service2],
  );
  const handleCreateFolder = reactExports.useCallback(
    async (name2) => {
      if (!folderName) return;
      await service2.createLocalFolder(folderName, [name2]);
      void refresh();
    },
    [folderName, refresh, service2],
  );
  const handleUploadPicked = reactExports.useCallback(
    async (files) => {
      if (!folderName || files.length === 0) return;
      if (
        await importPickedFiles({
          service: service2,
          folderName,
          folderSegments: [],
          files,
          t: t2,
        })
      ) {
        void refresh();
      }
    },
    [folderName, refresh, service2, t2],
  );
  const handleMove = reactExports.useCallback(
    async (row, target) => {
      if (!folderName) return;
      try {
        if (row.kind === "folder") {
          await service2.moveLocalFolder(folderName, row.rel.split("/"), target.segments);
        } else if (row.record) {
          await service2.moveLocalAsset(folderName, row.record.id, target.segments);
        }
      } catch (err) {
        const message2 = err instanceof Error ? err.message : String(err);
        dedupedToast.error(
          message2.includes("duplicate_name")
            ? t2("localAssets.moveDuplicate")
            : message2.includes("depth_exceeded")
              ? t2("localAssets.folderDepthLimit", {
                  count: PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS,
                })
              : message2,
        );
      }
      void refresh();
    },
    [folderName, refresh, service2, t2],
  );
  const canDropRow = reactExports.useCallback((row, target) => {
    if (target.key === relParent(row.rel)) return false;
    if (row.kind === "folder" && (target.key === row.rel || target.key.startsWith(`${row.rel}/`))) {
      return false;
    }
    return true;
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
          if (row.record) {
            const item = dragItemFor(row.record);
            if (item) event.dataTransfer.setData(RESOURCE_DRAG_MIME, JSON.stringify([item]));
          }
        },
        onDragEnd: moveDnd.endDrag,
        ...(row.kind === "folder"
          ? moveDnd.targetProps({
              key: row.rel,
              segments: row.rel.split("/"),
            })
          : moveDnd.blockerProps()),
      },
      dropActive: row.kind === "folder" && moveDnd.overKey === row.rel,
    }),
    [dragItemFor, moveDnd],
  );
  const rootDropTarget = {
    key: "",
    segments: [],
  };
  const rootDropProps = moveDnd.targetProps(rootDropTarget);
  const moveOptions = reactExports.useMemo(
    () =>
      filterMoveOptions(
        localFolderOptions(folders),
        moveDialogTarget?.kind === "folder" ? moveDialogTarget.rel.split("/") : void 0,
      ),
    [folders, moveDialogTarget],
  );
  const moveNoopKey = (() => {
    if (!moveDialogTarget) return ROOT_KEY;
    const parentRel = relParent(moveDialogTarget.rel);
    return parentRel === "" ? ROOT_KEY : parentRel;
  })();
  const externalDropProps = useExternalFileDrop(rootDropProps, {
    enabled: !!folderName,
    onFiles: handleUploadPicked,
  });
  return (
    <div className="flex h-full min-h-0 flex-col" data-action-ui-id="project-assets-sidebar.panel">
      <section
        {...externalDropProps}
        aria-label={t2("projectAssets.title")}
        data-action-ui-id="project-assets-sidebar.drop-area"
        className={cn$2(
          "min-h-0 flex-1 overflow-y-auto pb-1",
          moveDnd.overKey === "" && "bg-primary/5",
        )}
      >
        {rows.length === 0 && !loading ? (
          (searchQuery ?? "").trim().length > 0 ? (
            <PageStateBoundary
              empty={true}
              density="panel"
              className="h-full"
              emptyOptions={{
                title: t2("fileExplorer.noMatchingFiles"),
              }}
            />
          ) : (
            <div className="flex h-full min-h-0 flex-col p-2">
              <AssetsDropzoneEmpty
                disabled={!folderName}
                onOpenPicker={() => fileInputRef.current?.click()}
                onPickFiles={(files) => void handleUploadPicked(files)}
              />
            </div>
          )
        ) : viewMode === "grid" ? (
          <div
            className="grid grid-cols-2 gap-1 px-2 pb-2"
            data-action-ui-id="project-assets-sidebar.grid"
          >
            {rows.map((row) => (
              <LocalAssetGridCard
                key={row.kind === "folder" ? `folder:${row.rel}` : `file:${row.record?.id ?? ""}`}
                row={row}
                expanded={row.kind === "folder" && expanded.has(row.rel)}
                thumbSrc={
                  row.record ? thumbSrcFor(row.record, GRID_THUMBNAIL_DISPLAY_WIDTH) : void 0
                }
                onToggle={toggleFolder}
                onAddToCanvas={handleAddToCanvas}
                onAddToAgent={handleAddToAgent}
                onRevealFolder={handleRevealFolder}
                onRevealFile={handleReveal}
                onRename={() => setRenameTarget(row)}
                onMove={() => setMoveDialogTarget(row)}
                onDelete={() => setDeleteTarget(row)}
                {...rowDnd(row)}
              />
            ))}
          </div>
        ) : (
          rows.map((row) =>
            row.kind === "folder" ? (
              <FolderRow
                key={`folder:${row.rel}`}
                row={row}
                expanded={expanded.has(row.rel)}
                onToggle={toggleFolder}
                onReveal={handleRevealFolder}
                onRename={() => setRenameTarget(row)}
                onMove={() => setMoveDialogTarget(row)}
                onDelete={() => setDeleteTarget(row)}
                {...rowDnd(row)}
              />
            ) : row.record ? (
              <FileRow
                key={`file:${row.record.id}`}
                record={row.record}
                depth={row.depth}
                thumbSrc={thumbSrcFor(row.record, LIST_THUMBNAIL_DISPLAY_WIDTH)}
                onAddToCanvas={handleAddToCanvas}
                onAddToAgent={handleAddToAgent}
                onReveal={handleReveal}
                onRename={() => setRenameTarget(row)}
                onMove={() => setMoveDialogTarget(row)}
                onDelete={(record2) =>
                  setDeleteTarget({
                    kind: "file",
                    rel: row.rel,
                    name: record2.name,
                    depth: row.depth,
                    record: record2,
                  })
                }
                {...rowDnd(row)}
              />
            ) : null,
          )
        )}
      </section>
      <div className="flex shrink-0 items-center gap-1 border-t border-border p-2">
        <Button$1
          type="button"
          size="sm"
          disabled={!folderName}
          onClick={() => setNewFolderOpen(true)}
          className="h-8 flex-1 justify-center gap-1 rounded-md text-[12px] font-medium"
          data-action-ui-id="project-assets-sidebar.new-folder"
        >
          <FolderPlus size={14} strokeWidth={1.5} />
          {t2("localAssets.newFolder")}
        </Button$1>
        <Button$1
          type="button"
          variant="outline"
          size="sm"
          disabled={!folderName}
          onClick={() => fileInputRef.current?.click()}
          className="h-8 flex-1 justify-center gap-1 rounded-md bg-foreground/[0.08] text-[12px] font-medium hover:bg-foreground/[0.12] dark:bg-foreground/[0.14] dark:hover:bg-foreground/[0.18]"
          data-action-ui-id="project-assets-sidebar.upload"
        >
          <Upload size={14} strokeWidth={1.5} />
          {t2("localAssets.upload")}
        </Button$1>
        <input
          ref={fileInputRef}
          type="file"
          multiple={true}
          className="hidden"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            void handleUploadPicked(files);
          }}
        />
      </div>
      <NewLocalFolderDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        onCreate={handleCreateFolder}
      />
      <RenameLocalNodeDialog
        node={renameTarget ? assetTreeRowToLocalNode(renameTarget) : null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        onRename={handleRename}
      />
      <DeleteLocalNodeDialog
        node={deleteTarget ? assetTreeRowToLocalNode(deleteTarget) : null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (deleteTarget) await handleDelete2(deleteTarget);
        }}
      />
      <MoveNodeDialog
        open={moveDialogTarget !== null}
        name={moveDialogTarget?.name ?? ""}
        options={moveOptions}
        noopKey={moveNoopKey}
        onOpenChange={(open) => {
          if (!open) setMoveDialogTarget(null);
        }}
        onConfirm={async (destination) => {
          if (!moveDialogTarget) return;
          await handleMove(moveDialogTarget, {
            key: destination.key === ROOT_KEY ? "" : destination.key,
            segments: destination.segments,
          });
        }}
      />
    </div>
  );
}
function assetTreeRowToLocalNode(row) {
  return {
    kind: row.kind,
    name: row.name,
    record: row.record,
  };
}
function relParent(relPath) {
  const idx = relPath.lastIndexOf("/");
  return idx === -1 ? "" : relPath.slice(0, idx);
}
function flattenAssetTree(records, folders, expanded) {
  const rows = [];
  const visit2 = (parentRel, depth2) => {
    const childFolders = folders
      .filter((rel) => relParent(rel) === parentRel)
      .sort((a2, b3) => a2.localeCompare(b3));
    for (const rel of childFolders) {
      rows.push({
        kind: "folder",
        rel,
        name: rel.split("/").pop() ?? rel,
        depth: depth2,
      });
      if (expanded.has(rel)) visit2(rel, depth2 + 1);
    }
    const childFiles = records
      .filter((record2) => relParent(record2.relPath) === parentRel)
      .sort((a2, b3) => (b3.updatedAt ?? b3.createdAt) - (a2.updatedAt ?? a2.createdAt));
    for (const record2 of childFiles) {
      rows.push({
        kind: "file",
        rel: record2.relPath,
        name: record2.name,
        depth: depth2,
        record: record2,
      });
    }
  };
  visit2("", 0);
  return rows;
}
function LocalAssetGridCard({
  row,
  expanded,
  thumbSrc,
  onToggle,
  onAddToCanvas,
  onAddToAgent,
  onRevealFolder,
  onRevealFile,
  onRename,
  onMove,
  onDelete,
  dndProps,
  dropActive,
}) {
  const { t: t2 } = useTranslation();
  const record2 = row.record;
  const typeBucket = resolveTypeBucket({
    kind: row.kind,
    name: row.name,
    mime: record2?.mime,
  });
  const Chevron2 = expanded ? ChevronDown : ChevronRight$1;
  const cardClassName = cn$2(
    "group relative flex min-w-0 flex-col rounded-lg p-1 text-left outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-1 focus-visible:ring-ring/50",
    row.kind === "file" && "cursor-grab active:cursor-grabbing",
    dropActive && "bg-foreground/[0.12]",
  );
  const content2 = (
    <>
      <ProjectAssetThumbnail
        name={row.name}
        kind={row.kind}
        typeBucket={typeBucket}
        thumbnailSrc={thumbSrc}
        variant="grid"
        className="aspect-square rounded-sm border-0"
      />
      <span className="flex min-w-0 items-center gap-1 px-1 py-1">
        {row.kind === "folder" ? (
          <Icon
            icon={Chevron2}
            size="xs"
            strokeWidth={1.5}
            className="shrink-0 text-muted-foreground"
          />
        ) : null}
        <span className="min-w-0 flex-1 truncate text-[12px] text-foreground/70" title={row.name}>
          {row.name}
        </span>
      </span>
    </>
  );
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          row.kind === "folder" ? (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => onToggle(row.rel)}
              {...dndProps}
              className={cardClassName}
              data-action-ui-id="project-assets-sidebar.folder-grid-card"
            >
              {content2}
            </button>
          ) : (
            <div
              {...dndProps}
              className={cardClassName}
              data-action-ui-id="project-assets-sidebar.file-grid-card"
            >
              {content2}
            </div>
          )
        }
      />
      <ContextMenuContent>
        {row.kind === "folder" ? (
          <>
            <ContextMenuItem onClick={() => void onRevealFolder(row)}>
              <Icon icon={FolderOpen} size="sm" strokeWidth={1.5} />
              <PlatformFileManagerLabel />
            </ContextMenuItem>
            <ContextMenuItem onClick={onRename}>
              <PencilIcon size={14} strokeWidth={1.5} />
              {t2("localAssets.rename")}
            </ContextMenuItem>
            <ContextMenuItem onClick={onMove}>
              <Icon icon={FolderInput} size="sm" strokeWidth={1.5} />
              {t2("localAssets.moveTo")}
            </ContextMenuItem>
          </>
        ) : record2 ? (
          <>
            <ContextMenuItem onClick={() => onAddToCanvas(record2)}>
              <Icon icon={ImageOutlineIcon} size="sm" strokeWidth={1.5} />
              {t2("localAssets.addToCanvas")}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => void onAddToAgent(record2)}>
              <AddToChatIcon size={14} />
              {t2("localAssets.addToAgent")}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => void onRevealFile(record2)}>
              <Icon icon={FolderOpen} size="sm" strokeWidth={1.5} />
              <PlatformFileManagerLabel />
            </ContextMenuItem>
            <ContextMenuItem
              onClick={onRename}
              data-action-ui-id="project-assets-sidebar.file-rename"
            >
              <PencilIcon size={14} strokeWidth={1.5} />
              {t2("localAssets.rename")}
            </ContextMenuItem>
            <ContextMenuItem onClick={onMove}>
              <Icon icon={FolderInput} size="sm" strokeWidth={1.5} />
              {t2("localAssets.moveTo")}
            </ContextMenuItem>
          </>
        ) : null}
        <ContextMenuItem variant="destructive" onClick={onDelete}>
          <Icon icon={Trash2} size="sm" strokeWidth={1.5} />
          {t2("localAssets.delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
function FolderRow({
  row,
  expanded,
  onToggle,
  onReveal,
  onRename,
  onMove,
  onDelete,
  dndProps,
  dropActive,
}) {
  const { t: t2 } = useTranslation();
  const Chevron2 = expanded ? ChevronDown : ChevronRight$1;
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <button
            type="button"
            onClick={() => onToggle(row.rel)}
            {...dndProps}
            className={cn$2(
              "list-row-hit-area flex h-7 w-full items-center gap-0.5 rounded-md px-2 text-left transition-colors hover:bg-foreground/5",
              dropActive && "bg-primary/10",
            )}
            style={{
              paddingLeft: `${8 + row.depth * 14}px`,
            }}
            data-action-ui-id="project-assets-sidebar.folder-row"
          >
            <Chevron2 size={13} strokeWidth={1.5} className="shrink-0 text-muted-foreground/70" />
            <span className="inline-flex size-5 shrink-0 items-center justify-center">
              <FolderTileGlyph className="!h-8 !w-8 origin-center scale-[0.625]" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-foreground/70">
              {row.name}
            </span>
          </button>
        }
      />
      <ContextMenuContent>
        <ContextMenuItem onClick={() => void onReveal(row)}>
          <FolderOpen size={14} strokeWidth={1.5} />
          <PlatformFileManagerLabel />
        </ContextMenuItem>
        <ContextMenuItem onClick={onRename}>
          <PencilIcon size={14} strokeWidth={1.5} />
          {t2("localAssets.rename")}
        </ContextMenuItem>
        <ContextMenuItem onClick={onMove}>
          <FolderInput size={14} strokeWidth={1.5} />
          {t2("localAssets.moveTo")}
        </ContextMenuItem>
        <ContextMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 size={14} strokeWidth={1.5} />
          {t2("localAssets.delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
function FileRow({
  record: record2,
  depth: depth2,
  thumbSrc,
  onAddToCanvas,
  onAddToAgent,
  onReveal,
  onRename,
  onMove,
  onDelete,
  dndProps,
}) {
  const { t: t2 } = useTranslation();
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <div
            {...dndProps}
            className="list-row-hit-area flex h-8 w-full cursor-grab items-center gap-2 rounded-md px-2 transition-colors hover:bg-foreground/5 active:cursor-grabbing"
            style={{
              paddingLeft: `${8 + depth2 * 14 + 18}px`,
            }}
            data-action-ui-id="project-assets-sidebar.file-row"
          >
            <AssetRowThumb thumbSrc={thumbSrc} filename={record2.name} mime={record2.mime} />
            <span className="min-w-0 flex-1 truncate text-[13px] text-foreground/70">
              {record2.name}
            </span>
          </div>
        }
      />
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onAddToCanvas(record2)}>
          <ImageOutlineIcon size={14} strokeWidth={1.5} />
          {t2("localAssets.addToCanvas")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => void onAddToAgent(record2)}>
          <AddToChatIcon size={14} strokeWidth={1.5} />
          {t2("localAssets.addToAgent")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => void onReveal(record2)}>
          <FolderOpen size={14} strokeWidth={1.5} />
          <PlatformFileManagerLabel />
        </ContextMenuItem>
        <ContextMenuItem onClick={onRename} data-action-ui-id="project-assets-sidebar.file-rename">
          <PencilIcon size={14} strokeWidth={1.5} />
          {t2("localAssets.rename")}
        </ContextMenuItem>
        <ContextMenuItem onClick={onMove}>
          <FolderInput size={14} strokeWidth={1.5} />
          {t2("localAssets.moveTo")}
        </ContextMenuItem>
        <ContextMenuItem variant="destructive" onClick={() => onDelete(record2)}>
          <Trash2 size={14} strokeWidth={1.5} />
          {t2("localAssets.delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
function useProjectAssetsDir() {
  const platform2 = usePlatform();
  const workspacePath = useCurrentWorkspace();
  const project2 = useWorkspaceProject(workspacePath || void 0);
  const { ensureProjectFolderName } = useProjectActions();
  const service2 = useProjectAssetsService();
  const [dir, setDir] = reactExports.useState(void 0);
  const projectId = project2?.id;
  reactExports.useEffect(() => {
    if (!projectId) {
      setDir(void 0);
      return;
    }
    let disposed = false;
    void (async () => {
      const folderName = await ensureProjectFolderName(projectId);
      if (!folderName || disposed) return;
      const resolved = await service2.getAssetsDir(folderName);
      if (disposed) return;
      try {
        await platform2.fs.mkdir(resolved);
      } catch {}
      if (!disposed) setDir(resolved);
    })().catch(() => {
      if (!disposed) setDir(void 0);
    });
    return () => {
      disposed = true;
    };
  }, [ensureProjectFolderName, platform2.fs, projectId, service2]);
  return dir;
}
const BUTTON_CLASS =
  "inline-flex items-center justify-center overflow-hidden rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-50";
function CanvasAssetsFinderMenu({ projectFolderPath, outputFolderPath, compact = false }) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const primaryPath = outputFolderPath || projectFolderPath;
  const openDirectory = reactExports.useCallback(
    async (path2) => {
      if (!path2) return;
      try {
        if (platform2.shell.openPath) {
          await platform2.shell.openPath(path2);
          return;
        }
        if (platform2.shell.showItemInFolder) {
          await platform2.shell.showItemInFolder(path2);
          return;
        }
        dedupedToast.error(t2("fileExplorer.platformNotSupported"));
      } catch {
        dedupedToast.error(t2("fileExplorer.openFailed"));
      }
    },
    [platform2.shell, t2],
  );
  const openLabel = t2(getFileManagerLabelKey(platform2.app.os));
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className={cn$2(BUTTON_CLASS, compact ? "size-6" : "size-7")}
              aria-label={openLabel}
              disabled={!primaryPath}
              onClick={() => void openDirectory(primaryPath)}
              data-action-ui-id="canvas-assets.open-output-folder"
              data-slot="canvas-assets-finder-button"
            />
          }
        >
          <LocalFolderIcon
            os={platform2.app.os}
            className={cn$2("shrink-0", compact ? "size-4" : "size-5")}
            aria-hidden="true"
          />
        </TooltipTrigger>
        <TooltipContent side="bottom">{openLabel}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
const PRESENTATION_BUTTON_CLASS =
  "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50";
function CanvasSidebarPresentationButton({ mode: mode2, onToggleDock }) {
  const { t: t2 } = useTranslation();
  const label =
    mode2 === "docked"
      ? t2("fileExplorer.compactFileExplorer", "Show compact file list")
      : t2("fileExplorer.expandFileExplorer", "Expand file list");
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={PRESENTATION_BUTTON_CLASS}
            aria-label={label}
            data-action-ui-id="canvas-sidebar.toggle-dock"
            onClick={onToggleDock}
          />
        }
      >
        <Icon icon={mode2 === "docked" ? Minimize2 : Maximize2} size="sm" aria-hidden={true} />
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
const HEADER_ACTION_BUTTON_CLASS =
  "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50";
export function CanvasSidebarHeader({
  activeTab,
  onActiveTabChange,
  onClose,
  mode: mode2,
  onToggleDock,
}) {
  const { t: t2 } = useTranslation();
  const closeLabel = t2("common.close", "关闭");
  const workspacePath = useCurrentWorkspace();
  const [recentWorkspaces] = useStorage("global.recentWorkspaces");
  const displayName2 = reactExports.useMemo(() => {
    const recent = recentWorkspaces.find((w3) => w3.path === workspacePath);
    return recent ? workspaceDisplayName(recent) : folderNameFromPath(workspacePath);
  }, [recentWorkspaces, workspacePath]);
  const project2 = useWorkspaceProject(workspacePath);
  const projectName = project2?.name;
  const projectAssetsDir = useProjectAssetsDir();
  const options = reactExports.useMemo(() => {
    return [
      {
        value: "canvas",
        label: t2("canvasAssets.canvasTab", "Canvas"),
        ariaLabel: t2("canvasAssets.canvasTab", "Canvas"),
        dataActionUiId: "canvas-sidebar.tab-canvas",
      },
      {
        value: "assets",
        label: t2("canvasAssets.assetsTab", "Assets"),
        ariaLabel: t2("canvasAssets.assetsTab", "Assets"),
        dataActionUiId: "canvas-sidebar.tab-assets",
      },
    ];
  }, [t2]);
  return (
    <div
      className="flex shrink-0 flex-col"
      data-slot="canvas-sidebar-header"
      data-action-ui-id="canvas-sidebar.header"
    >
      <div className="flex shrink-0 items-start gap-1 px-2 pt-3 pb-3">
        <div
          className="flex min-w-0 flex-1 flex-col gap-1.5 px-1 pt-1"
          data-slot="canvas-sidebar-header-title"
        >
          <span
            className="min-w-0 truncate text-sm font-medium leading-none text-foreground"
            title={displayName2}
          >
            {displayName2}
          </span>
          {projectName && (
            <span
              className="min-w-0 truncate text-xs leading-none text-muted-foreground"
              title={projectName}
            >
              {projectName}
            </span>
          )}
        </div>
        <TooltipProvider>
          <div className="flex shrink-0 items-center gap-0.5">
            <CanvasAssetsFinderMenu
              projectFolderPath={workspacePath}
              outputFolderPath={activeTab === "assets" ? projectAssetsDir : void 0}
              compact={true}
            />
            <CanvasSidebarPresentationButton mode={mode2} onToggleDock={onToggleDock} />
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className={HEADER_ACTION_BUTTON_CLASS}
                    aria-label={closeLabel}
                    data-action-ui-id="canvas-sidebar.close"
                    onClick={onClose}
                  />
                }
              >
                <Icon icon={X$7} size="sm" aria-hidden={true} />
              </TooltipTrigger>
              <TooltipContent side="bottom">{closeLabel}</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
      <div className="flex h-10 shrink-0 items-center px-2 pb-1">
        <SegmentedSwitch
          value={activeTab}
          options={options}
          onValueChange={onActiveTabChange}
          ariaLabel={t2("canvasAssets.tabSwitcherAria", "Project content")}
          dataActionUiId="canvas-sidebar.tab-switcher"
          thumbDataSlot="canvas-sidebar-tab-thumb"
          variant="label"
          stretch={true}
          className="min-w-0 flex-1"
          itemClassName="px-2"
        />
      </div>
    </div>
  );
}
export function FileExplorerSearchBar({
  value,
  onChange,
  inputRef,
  placeholder,
  clearLabel,
  rowActionId = "asset-panel.search-row",
  inputActionId = "asset-panel.search-input",
  clearActionId = "asset-panel.search-clear",
  className,
  collapsible = false,
  expandedFillsRow = false,
  useStrokeSpec = false,
}) {
  const { t: t2 } = useTranslation();
  const resolvedPlaceholder =
    placeholder ??
    t2("fileExplorer.searchPlaceholder", {
      defaultValue: "搜索文件",
    });
  const resolvedClearLabel =
    clearLabel ??
    t2("fileExplorer.clearSearch", {
      defaultValue: "Clear search",
    });
  const openLabel = t2("fileExplorer.openSearch", {
    defaultValue: "搜索",
  });
  const [open, setOpen] = reactExports.useState(!collapsible || value.length > 0);
  const fallbackRef = reactExports.useRef(null);
  const effectiveInputRef = inputRef ?? fallbackRef;
  reactExports.useEffect(() => {
    if (value.length > 0 && !open) setOpen(true);
  }, [value, open]);
  reactExports.useEffect(() => {
    if (open && collapsible) effectiveInputRef.current?.focus();
  }, [open, collapsible, effectiveInputRef]);
  if (collapsible && !open) {
    return (
      <div className={cn$2("flex shrink-0", className)}>
        <button
          type="button"
          aria-label={openLabel}
          title={openLabel}
          onClick={() => setOpen(true)}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50"
          data-action-ui-id={rowActionId}
        >
          {useStrokeSpec ? (
            <StrokeIcon icon={Search} size={14} />
          ) : (
            <Search size={14} strokeWidth={1.5} />
          )}
        </button>
      </div>
    );
  }
  return (
    <div
      className={cn$2(
        "group flex shrink-0 px-2 pb-2",
        !expandedFillsRow && className,
        expandedFillsRow && "absolute inset-0 z-20 !px-2 !pt-2 !pb-2 items-center bg-background",
      )}
    >
      <div
        className="flex h-7 w-full items-center gap-1.5 rounded-md border border-transparent bg-foreground/[0.025] px-2 text-muted-foreground transition-colors focus-within:border-border-strong focus-within:bg-card focus-within:text-foreground dark:bg-foreground/[0.05]"
        data-action-ui-id={rowActionId}
      >
        {useStrokeSpec ? (
          <StrokeIcon icon={Search} size={14} />
        ) : (
          <Search size={14} strokeWidth={1.5} className="shrink-0" />
        )}
        <input
          ref={effectiveInputRef}
          type="text"
          className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/60"
          placeholder={resolvedPlaceholder}
          value={value}
          onChange={(e2) => onChange(e2.target.value)}
          onBlur={() => {
            if (collapsible && value.length === 0) setOpen(false);
          }}
          data-action-ui-id={inputActionId}
        />
        <button
          type="button"
          aria-label={resolvedClearLabel}
          onClick={() => onChange("")}
          tabIndex={value ? 0 : -1}
          className={cn$2(
            "inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-foreground/[0.05] hover:text-foreground",
            value ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          data-action-ui-id={clearActionId}
        >
          {useStrokeSpec ? (
            <StrokeIcon icon={X$7} size={12} />
          ) : (
            <X$7 size={12} strokeWidth={1.5} />
          )}
        </button>
      </div>
    </div>
  );
}
export function Toggle({ className, variant = "default", size: size2 = "default", ...props }) {
  return (
    <Toggle$1
      data-slot="toggle"
      className={cn$2(
        toggleVariants({
          variant,
          size: size2,
          className,
        }),
      )}
      {...props}
    />
  );
}
export const EntityHoverPreviewHost = reactExports.memo(
  reactExports.forwardRef(function EntityHoverPreviewHost2(
    { onPreviewAttachment, onAddToCanvas, onAddToChat },
    ref,
  ) {
    const host = useEntityHoverPreview();
    reactExports.useImperativeHandle(
      ref,
      () => ({
        notifyHoverIntent: (entityId, anchor) => {
          const target = {
            entityId,
            anchor,
          };
          host.notifyHoverIntent(target);
        },
        notifyHoverEnd: () => host.notifyHoverEnd(),
      }),
      [host],
    );
    const handleBodyPreview = useStableCallback((att) => {
      const s2 = host.stateRef.current;
      if (s2.kind !== "hover") return;
      const { entityId } = s2.target;
      host.dismiss();
      onPreviewAttachment(entityId, att);
    });
    const handleAddToCanvas = useStableCallback((att) => {
      const s2 = host.stateRef.current;
      if (s2.kind !== "hover") return;
      onAddToCanvas(att);
    });
    const handleAddToChat = useStableCallback((att) => {
      const s2 = host.stateRef.current;
      if (s2.kind !== "hover") return;
      onAddToChat(att);
    });
    if (host.state.kind !== "hover") return null;
    return (
      <EntityHoverPreviewPopup
        anchor={host.state.target.anchor}
        entityId={host.state.target.entityId}
        onPreview={handleBodyPreview}
        onAddToCanvas={handleAddToCanvas}
        onAddToChat={handleAddToChat}
        onPopupPointerEnter={host.onPopupPointerEnter}
        onPopupPointerLeave={host.onPopupPointerLeave}
      />
    );
  }),
);
function EntityHoverPreviewPopup({
  anchor,
  entityId,
  onPreview,
  onAddToCanvas,
  onAddToChat,
  onPopupPointerEnter,
  onPopupPointerLeave,
}) {
  const [positioned, setPositioned] = reactExports.useState(false);
  reactExports.useLayoutEffect(() => {
    const id2 = requestAnimationFrame(() => setPositioned(true));
    return () => cancelAnimationFrame(id2);
  }, []);
  return (
    <PreviewCardRoot open={true}>
      <PreviewCardPortal>
        <PreviewCardPositioner
          anchor={anchor}
          side="right"
          sideOffset={8}
          align="start"
          alignOffset={0}
          className={cn$2(
            "isolate z-50",
            positioned &&
              "transition-transform duration-200 ease-out motion-reduce:transition-none",
          )}
        >
          <PreviewCardPopup
            data-slot="preview-card-content"
            onPointerEnter={onPopupPointerEnter}
            onPointerLeave={onPopupPointerLeave}
            className={cn$2(
              "elevated-surface-border z-50 w-[260px] origin-(--transform-origin) rounded-lg bg-popover text-popover-foreground shadow-lg outline-none",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
          >
            <EntityHoverCardBody
              entityId={entityId}
              onPreview={onPreview}
              onAddToCanvas={onAddToCanvas}
              onAddToChat={onAddToChat}
            />
          </PreviewCardPopup>
        </PreviewCardPositioner>
      </PreviewCardPortal>
    </PreviewCardRoot>
  );
}
export function ProjectSidebarCategoryChips({ options, value, onChange, rowActionId, className }) {
  return (
    <div className={cn$2("shrink-0 px-2 pb-1", className)}>
      <div
        className="scrollbar-none flex h-8 flex-nowrap items-center gap-1 overflow-x-auto"
        data-action-ui-id={rowActionId}
      >
        {options.map((option2) => {
          const active2 = option2.value === value;
          return (
            <button
              key={option2.value}
              type="button"
              onClick={() => onChange(option2.value)}
              data-action-ui-id={option2.actionId}
              aria-pressed={active2}
              className={cn$2(
                "group inline-flex h-[26px] max-w-[112px] shrink-0 items-center justify-center rounded-full border px-[9px] text-xs font-normal shadow-none transition-colors duration-150 select-none focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:outline-none",
                active2
                  ? "border-foreground bg-transparent text-foreground"
                  : "border-border bg-transparent text-foreground/70 hover:border-foreground hover:bg-transparent",
              )}
            >
              <span className="truncate">{option2.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
export const THUMB_PX$1 = 32;
export const COMPACT_MENU_ITEM_CLASS =
  "gap-2 px-2.5 py-1.5 text-[11px] [&_svg:not([class*=size-])]:size-3.5";
export const TYPE_CHIPS = ["all", "character", "scene", "style_pack", "custom"];
export function EntityTypeIcon({ type: type2 }) {
  if (type2 === "character") return <ImageOutlineIcon size={16} strokeWidth={1.67} />;
  if (type2 === "scene") return <Video$2 size={16} />;
  if (type2 === "style_pack") return <Music$2 size={16} />;
  return <File$3 size={16} />;
}
function useLightboxEscape(onClose) {
  reactExports.useEffect(() => {
    const handler = (e2) => {
      if (e2.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
}
function LightboxCloseButton({ onClose }) {
  const { t: t2 } = useTranslation();
  return (
    <button
      type="button"
      aria-label={t2("common.close")}
      className="absolute right-8 top-8 flex size-9 cursor-pointer items-center justify-center bg-white/10 text-white/80 transition-colors hover:text-white"
      onClick={(e2) => {
        e2.stopPropagation();
        onClose();
      }}
    >
      <StrokeIcon icon={X$7} size={16} />
    </button>
  );
}
export function AudioLightbox({ src, alt, onClose }) {
  useLightboxEscape(onClose);
  return reactDomExports.createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape key provides keyboard close path.
    <div
      role="dialog"
      aria-label={alt}
      className="fixed inset-0 z-9999 flex flex-col items-center justify-center gap-4 bg-black/85 p-10 backdrop-blur-sm"
      onClick={(e2) => {
        if (e2.target === e2.currentTarget) onClose();
      }}
    >
      <LightboxCloseButton onClose={onClose} />
      <span className="text-sm text-white/80 truncate max-w-[60vw]">{alt}</span>
      <audio
        src={src}
        controls={true}
        autoPlay={true}
        style={{
          width: "min(480px, 80vw)",
        }}
      />
    </div>,
    document.body,
  );
}
export function TextLightbox({ src, alt, onClose }) {
  const [content2, setContent2] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const controller = new AbortController();
    fetch(src, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.text();
      })
      .then((text2) => setContent2(text2))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => controller.abort();
  }, [src]);
  useLightboxEscape(onClose);
  return reactDomExports.createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape key provides keyboard close path.
    <div
      role="dialog"
      aria-label={alt}
      className="fixed inset-0 z-9999 flex flex-col items-center justify-center gap-4 bg-black/85 p-10 backdrop-blur-sm"
      onClick={(e2) => {
        if (e2.target === e2.currentTarget) onClose();
      }}
    >
      <LightboxCloseButton onClose={onClose} />
      <span className="text-sm text-white/80 truncate max-w-[60vw]">{alt}</span>
      <div className="max-h-[70vh] w-full max-w-2xl overflow-auto rounded-lg border border-white/10 bg-white/5 p-4">
        {content2 === null && !error && (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={16} className="animate-spin text-white opacity-50" />
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        {content2 !== null && (
          <pre className="text-xs text-white/80 whitespace-pre-wrap break-words font-mono leading-relaxed">
            {content2}
          </pre>
        )}
      </div>
    </div>,
    document.body,
  );
}
