// 云端资产面板：目录浏览、上传、移动、下载、搜索与批量操作。
import {
  h as useTranslation,
  r as reactExports,
  a3 as dedupedToast,
  hx as cloudErrorDisplayMessage,
  j as jsxRuntimeExports,
  fM as Button,
  au as cn,
  as as Dialog,
  at as DialogContent,
  gj as DialogHeader,
  g8 as DialogTitle,
  o as usePlatform,
  hE as useCloudFolder,
  hF as useProjectAssetsService,
  E as useProjectActions,
  hG as useTransfers,
  hH as useCloudReviewNodes,
  hI as useProjectMemberNames,
  v as useStorage,
  hJ as getCloudStorageUsage,
  hK as useDownloadingNodeIds,
  hL as gatewayUrl,
  m as API_PATHS,
  hM as withThumbnailWidth,
  hN as onDidChangeCloudAssets,
  hO as getVisibleCloudUploads,
  hP as useCloudSearch,
  hQ as getProjectAssetWritePolicy,
  hR as PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS,
  hS as gateCloudAssetUploads,
  hT as rejectionToastText,
  hU as cloudAssetMimeType,
  hV as toastFolderDownloadSummary,
  hW as deleteCloudNode,
  hX as moveCloudNode,
  hY as normalizeCloudParentId,
  hZ as useMoveDnd,
  h_ as useCloudMoveOptions,
  h$ as filterMoveOptions,
  i0 as ROOT_KEY,
  i1 as debugDumpCloudProjectAssets,
  aL as FolderPlus,
  f0 as Upload,
  i2 as CLOUD_ASSET_ACCEPT,
  br as Bug,
  gk as RetryIcon,
  i3 as TransfersButton,
  i4 as AssetsDropzoneEmpty,
  i5 as UploadingAssets,
  i6 as NewFolderDialog,
  i7 as RenameNodeDialog,
  i8 as DeleteNodeDialog,
  i9 as MoveNodeDialog,
  g9 as DialogDescription,
  ia as MediaLightbox,
} from "../../main.jsx";
import { __jsx } from "../../shared/jsx-runtime.js";
import {
  AssetsEmptyState,
  AssetsErrorState,
  AssetsHeader,
  AssetsListSkeleton,
  AssetsSelectionBar,
} from "../assets-common.jsx";
import {
  fileKeysForSelection,
  selectionTargetsForAction,
  useAssetsListState,
} from "../assets-state.js";
import {
  Breadcrumb$1,
  NodeCard$1,
  NodeRow$1,
  isCloudNodeDownloadable,
  mediaKind$1,
} from "./cloud-node.jsx";
import { CloudUsagePanel } from "./cloud-usage-panel.jsx";
import { DebugDumpView } from "./debug-dump-view.jsx";
import {
  UPLOAD_REFRESH_DEBOUNCE_MS,
  compactCloudMoveTargets,
  isCloudAssetsDebugEnabled,
} from "./helpers.js";
export function CloudAssetsPanel({ project }) {
  const { t } = useTranslation();
  const debugEnabled = isCloudAssetsDebugEnabled();
  const platform = usePlatform();
  const cloudProjectId = project.remoteId ?? "";
  const folder = useCloudFolder(cloudProjectId || void 0);
  const service = useProjectAssetsService();
  const { ensureProjectFolderName } = useProjectActions();
  const transfers = useTransfers();
  const projectTransfers = reactExports.useMemo(
    () => transfers.transfers.filter((item) => item.cloudProjectId === cloudProjectId),
    [cloudProjectId, transfers.transfers],
  );
  const review = useCloudReviewNodes(cloudProjectId || void 0);
  const memberNames = useProjectMemberNames(cloudProjectId || void 0);
  const [config, setConfig] = useStorage("global.config");
  const viewMode = config.cloudAssetsViewMode === "grid" ? "grid" : "list";
  const setViewMode = reactExports.useCallback(
    (mode) => {
      setConfig((previous) => ({
        ...previous,
        cloudAssetsViewMode: mode,
      }));
    },
    [setConfig],
  );
  const [usage, setUsage] = reactExports.useState(null);
  const [usageLoading, setUsageLoading] = reactExports.useState(false);
  const [usageError, setUsageError] = reactExports.useState(null);
  const [newFolderOpen, setNewFolderOpen] = reactExports.useState(false);
  const [renameTarget, setRenameTarget] = reactExports.useState(null);
  const [deleteTarget, setDeleteTarget] = reactExports.useState(null);
  const [batchDeleteTargets, setBatchDeleteTargets] = reactExports.useState([]);
  const [moveDialogTargets, setMoveDialogTargets] = reactExports.useState([]);
  const [preview, setPreview] = reactExports.useState(null);
  const [debugDump, setDebugDump] = reactExports.useState(null);
  const [debugLoading, setDebugLoading] = reactExports.useState(false);
  const fileInputRef = reactExports.useRef(null);
  const refreshUsage = reactExports.useCallback(() => {
    if (!cloudProjectId) return;
    setUsageLoading(true);
    setUsageError(null);
    getCloudStorageUsage(cloudProjectId)
      .then(setUsage)
      .catch((err) => {
        setUsage(null);
        setUsageError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setUsageLoading(false));
  }, [cloudProjectId]);
  reactExports.useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);
  const [folderName, setFolderName] = reactExports.useState(void 0);
  const [assetsDir, setAssetsDir] = reactExports.useState(void 0);
  reactExports.useEffect(() => {
    let disposed = false;
    void ensureProjectFolderName(project.id).then((name) => {
      if (!disposed) setFolderName(name);
    });
    return () => {
      disposed = true;
    };
  }, [ensureProjectFolderName, project.id]);
  reactExports.useEffect(() => {
    if (!folderName) return;
    let disposed = false;
    void service.getAssetsDir(folderName).then((dir) => {
      if (!disposed) setAssetsDir(dir);
    });
    return () => {
      disposed = true;
    };
  }, [folderName, service]);
  const [syncMap, setSyncMap] = reactExports.useState(new Map());
  const [mirrorPathMap, setMirrorPathMap] = reactExports.useState(new Map());
  const refreshSyncMap = reactExports.useCallback(async () => {
    if (!folderName) return;
    try {
      const states = await service.listAssetSyncStates(folderName);
      const next = new Map();
      const nextMirrorPaths = new Map();
      for (const state of states) {
        if (!state.mirrorExists) continue;
        nextMirrorPaths.set(state.id, state.relPath);
        if (state.remoteUpdatedAt !== void 0) next.set(state.id, state.remoteUpdatedAt);
      }
      setSyncMap(next);
      setMirrorPathMap(nextMirrorPaths);
    } catch {}
  }, [folderName, service]);
  reactExports.useEffect(() => {
    void refreshSyncMap();
  }, [refreshSyncMap]);
  reactExports.useEffect(() => {
    if (!folderName) return;
    const subscription = service.onDidChangeAssets((event) => {
      if (event.projectFolderName === folderName) void refreshSyncMap();
    });
    return () => subscription.dispose();
  }, [folderName, refreshSyncMap, service]);
  const downloadingIds = useDownloadingNodeIds(transfers.transfers, cloudProjectId);
  const downloadStartingIdsRef = reactExports.useRef(new Set());
  const downloadDoneCount = reactExports.useMemo(
    () =>
      transfers.transfers.filter(
        (item) =>
          item.cloudProjectId === cloudProjectId &&
          item.kind === "download" &&
          item.status === "done",
      ).length,
    [transfers.transfers, cloudProjectId],
  );
  const downloadDoneCountRef = reactExports.useRef(downloadDoneCount);
  reactExports.useEffect(() => {
    if (downloadDoneCount > downloadDoneCountRef.current) void refreshSyncMap();
    downloadDoneCountRef.current = downloadDoneCount;
  }, [downloadDoneCount, refreshSyncMap]);
  const thumbnailSrcFor = reactExports.useCallback(
    (node, width) => {
      if (!assetsDir || node.kind !== "file" || node.review !== "pass") return void 0;
      const relPath = mirrorPathMap.get(node.id);
      if (!relPath) return void 0;
      const url = gatewayUrl(API_PATHS.serveLocal(`${assetsDir}/${relPath}`));
      return withThumbnailWidth(url, width);
    },
    [assetsDir, mirrorPathMap],
  );
  const { refresh: refreshFolder } = folder;
  const { refresh: refreshReview } = review;
  reactExports.useEffect(() => {
    const subscription = onDidChangeCloudAssets((event) => {
      if (event.projectId !== cloudProjectId) return;
      refreshFolder();
      refreshUsage();
      refreshReview();
    });
    return () => subscription.dispose();
  }, [cloudProjectId, refreshFolder, refreshReview, refreshUsage]);
  const uploadStatusKey = reactExports.useMemo(() => {
    let reviewing = 0;
    let done = 0;
    let failed = 0;
    for (const item of transfers.transfers) {
      if (item.cloudProjectId !== cloudProjectId || item.kind !== "upload") continue;
      if (item.status === "reviewing") reviewing += 1;
      else if (item.status === "done") done += 1;
      else if (item.status === "failed") failed += 1;
    }
    return `${reviewing}:${done}:${failed}`;
  }, [transfers.transfers, cloudProjectId]);
  const uploadStatusKeyRef = reactExports.useRef(uploadStatusKey);
  const uploadRefreshTimerRef = reactExports.useRef(void 0);
  const uploadRefreshProjectIdRef = reactExports.useRef(cloudProjectId);
  const uploadRefreshActionsRef = reactExports.useRef({
    refreshFolder,
    refreshUsage,
    refreshReview,
    refreshSyncMap,
  });
  reactExports.useEffect(() => {
    uploadRefreshActionsRef.current = {
      refreshFolder,
      refreshUsage,
      refreshReview,
      refreshSyncMap,
    };
  }, [refreshFolder, refreshUsage, refreshReview, refreshSyncMap]);
  const cancelUploadRefresh = reactExports.useCallback(() => {
    if (uploadRefreshTimerRef.current === void 0) return;
    window.clearTimeout(uploadRefreshTimerRef.current);
    uploadRefreshTimerRef.current = void 0;
  }, []);
  reactExports.useEffect(() => {
    if (cloudProjectId !== uploadRefreshProjectIdRef.current) {
      cancelUploadRefresh();
      uploadRefreshProjectIdRef.current = cloudProjectId;
      uploadStatusKeyRef.current = uploadStatusKey;
      return;
    }
    if (uploadStatusKey !== uploadStatusKeyRef.current) {
      cancelUploadRefresh();
      uploadRefreshTimerRef.current = window.setTimeout(() => {
        uploadRefreshTimerRef.current = void 0;
        const actions = uploadRefreshActionsRef.current;
        actions.refreshFolder();
        actions.refreshUsage();
        actions.refreshReview();
        void actions.refreshSyncMap();
      }, UPLOAD_REFRESH_DEBOUNCE_MS);
    }
    uploadStatusKeyRef.current = uploadStatusKey;
  }, [cancelUploadRefresh, cloudProjectId, uploadStatusKey]);
  reactExports.useEffect(() => cancelUploadRefresh, [cancelUploadRefresh]);
  const orderedNodes = reactExports.useMemo(() => {
    const folders = folder.nodes.filter((node) => node.kind === "folder");
    const files = folder.nodes.filter((node) => node.kind === "file");
    return [...folders, ...files];
  }, [folder.nodes]);
  const listState = useAssetsListState();
  reactExports.useEffect(() => {
    if (viewMode === "grid") listState.clearSelection();
  }, [listState.clearSelection, viewMode]);
  const searchQuery = listState.search.trim();
  const visibleUploads = reactExports.useMemo(
    () => getVisibleCloudUploads(projectTransfers, searchQuery),
    [projectTransfers, searchQuery],
  );
  const hasVisibleUploads = visibleUploads.length > 0;
  const search = useCloudSearch(cloudProjectId || void 0, searchQuery);
  const isSearching = searchQuery.length > 0;
  const visibleNodes = isSearching ? search.nodes : orderedNodes;
  const activeLoading = isSearching ? search.loading : folder.loading;
  const activeError = isSearching ? search.error : folder.error;
  const activeMembershipError = isSearching ? search.membershipError : folder.membershipError;
  const activeHasMore = isSearching ? search.hasMore : folder.hasMore;
  const loadMore = isSearching ? search.loadMore : folder.loadMore;
  const parentPathFor = reactExports.useCallback(
    (node) => (isSearching ? (search.folderPathsById.get(node.parentId) ?? []) : folder.stack),
    [folder.stack, isSearching, search.folderPathsById],
  );
  const parentSegmentsFor = reactExports.useCallback(
    (node) => parentPathFor(node).map((crumb) => crumb.name),
    [parentPathFor],
  );
  const isRootEmpty =
    folder.stack.length === 0 && orderedNodes.length === 0 && folder.hasLoaded && !folder.error;
  const writePolicy = getProjectAssetWritePolicy(folder.folderSegments.length);
  const folderDepthMessage = !writePolicy.canCreateFolder
    ? writePolicy.canCreateFile
      ? t("projectAssets.folderDepthReached", {
          count: PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS,
        })
      : t("projectAssets.depthExceeded")
    : void 0;
  const fileDepthMessage = !writePolicy.canCreateFile ? t("projectAssets.depthExceeded") : void 0;
  const handleUploadPicked = reactExports.useCallback(
    async (files) => {
      if (files.length === 0) return;
      const folderName2 = await ensureProjectFolderName(project.id);
      if (!folderName2) return;
      const { accepted, rejected } = await gateCloudAssetUploads(files, (file) =>
        window.hilo?.webUtils?.getPathForFile(file),
      );
      for (const rejection of rejected) {
        dedupedToast.error(rejectionToastText(t, rejection));
      }
      for (const entry of accepted) {
        try {
          await service.startUpload({
            projectFolderName: folderName2,
            cloudProjectId,
            parentId: folder.currentFolderId,
            filePath: entry.path,
            name: entry.file.name,
            // Browser MIME when known; extension fallback otherwise (md /
            // htable etc. — cloud review needs a real MIME type).
            mime: entry.file.type || cloudAssetMimeType(entry.file.name),
            // Own-upload mirror: land a `.assets/` copy alongside the cloud
            // upload so the uploader never needs to re-download it.
            mirrorFolderSegments: folder.folderSegments,
          });
        } catch (err) {
          dedupedToast.error(
            t("cloudAssets.uploadStartFailed", {
              name: entry.file.name,
              message: err instanceof Error ? err.message : String(err),
            }),
          );
        }
      }
    },
    [
      cloudProjectId,
      ensureProjectFolderName,
      folder.currentFolderId,
      folder.folderSegments,
      project.id,
      service,
      t,
    ],
  );
  const handleDownload = reactExports.useCallback(
    async (node) => {
      if (node.kind !== "file" || node.review !== "pass" || !node.cdnUrl) return;
      if (downloadingIds.has(node.id) || downloadStartingIdsRef.current.has(node.id)) return;
      downloadStartingIdsRef.current.add(node.id);
      try {
        const folderName2 = await ensureProjectFolderName(project.id);
        if (!folderName2) return;
        await service.startDownload({
          projectFolderName: folderName2,
          cloudProjectId,
          nodeId: node.id,
          name: node.name,
          cdnUrl: node.cdnUrl,
          folderSegments: parentSegmentsFor(node),
          size: node.size || void 0,
          mime: node.mimeType || void 0,
          // Snapshot for the sync badge: "cloud state as of this download".
          remoteUpdatedAt: node.updatedAt || void 0,
          // Cloud creation time — provenance snapshot for the local index.
          remoteCreatedAt: node.createdAt || void 0,
        });
      } catch (err) {
        dedupedToast.error(err instanceof Error ? err.message : String(err));
      } finally {
        downloadStartingIdsRef.current.delete(node.id);
      }
    },
    [
      cloudProjectId,
      downloadingIds,
      ensureProjectFolderName,
      parentSegmentsFor,
      project.id,
      service,
    ],
  );
  const handleDownloadFolder = reactExports.useCallback(
    async (node) => {
      const folderName2 = await ensureProjectFolderName(project.id);
      if (!folderName2) return;
      try {
        const summary = await service.startFolderDownload({
          projectFolderName: folderName2,
          cloudProjectId,
          folderNodeId: node.id,
          folderName: node.name,
          folderSegments: [...parentSegmentsFor(node), node.name],
        });
        toastFolderDownloadSummary(t, summary);
      } catch (err) {
        dedupedToast.error(
          cloudErrorDisplayMessage(err) ??
            t("cloudAssets.folderDownloadFailed", {
              message: t("cloudAssets.failServer"),
            }),
        );
      }
    },
    [cloudProjectId, ensureProjectFolderName, parentSegmentsFor, project.id, service, t],
  );
  const handleDeleteBlocked = reactExports.useCallback(
    async (node) => {
      try {
        await deleteCloudNode(node.id);
      } catch (err) {
        dedupedToast.error(cloudErrorDisplayMessage(err) ?? t("cloudAssets.failServer"));
        return;
      }
      refreshReview();
      refreshFolder();
      refreshUsage();
    },
    [refreshFolder, refreshReview, refreshUsage, t],
  );
  const handleDelete = reactExports.useCallback(
    async (node) => {
      await deleteCloudNode(node.id);
      const folderName2 = await ensureProjectFolderName(project.id);
      if (folderName2) {
        try {
          if (node.kind === "folder") {
            await service.deleteLocalFolder(folderName2, [...parentSegmentsFor(node), node.name]);
          } else {
            await service.deleteLocalAsset(folderName2, node.id);
          }
        } catch {
          dedupedToast.warning(
            t("cloudAssets.deleteLocalFailed", {
              name: node.name,
            }),
          );
        }
      }
    },
    [ensureProjectFolderName, parentSegmentsFor, project.id, service, t],
  );
  const rowKeys = reactExports.useMemo(() => visibleNodes.map((node) => node.id), [visibleNodes]);
  const fileRowKeys = reactExports.useMemo(
    () => fileKeysForSelection(visibleNodes, (node) => node.id),
    [visibleNodes],
  );
  const [batchBusy, setBatchBusy] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (listState.selection.size === 0) return;
    const visible = new Set(rowKeys);
    for (const key of listState.selection) {
      if (!visible.has(key)) {
        listState.clearSelection();
        return;
      }
    }
  }, [rowKeys, listState]);
  const handleBatchDownload = reactExports.useCallback(async () => {
    const selected = visibleNodes.filter((node) => listState.selection.has(node.id));
    const nodes = selected.filter((node) => isCloudNodeDownloadable(node, downloadingIds));
    const skipped = selected.length - nodes.length;
    if (skipped > 0) {
      dedupedToast.info(
        t("projectAssets.batchDownloadSkipped", {
          count: skipped,
        }),
      );
    }
    if (nodes.length === 0) return;
    setBatchBusy(true);
    try {
      for (const node of nodes) {
        if (node.kind === "folder") {
          await handleDownloadFolder(node);
        } else {
          await handleDownload(node);
        }
      }
    } finally {
      setBatchBusy(false);
      listState.clearSelection();
    }
  }, [visibleNodes, listState, downloadingIds, handleDownload, handleDownloadFolder, t]);
  const selectedNodes = reactExports.useMemo(
    () => visibleNodes.filter((node) => listState.selection.has(node.id)),
    [listState.selection, visibleNodes],
  );
  const actionTargetsFor = reactExports.useCallback(
    (node) => selectionTargetsForAction(node, visibleNodes, listState.selection, (item) => item.id),
    [listState.selection, visibleNodes],
  );
  const hasDownloadableSelection = selectedNodes.some((node) =>
    isCloudNodeDownloadable(node, downloadingIds),
  );
  const openBatchDelete = reactExports.useCallback(() => {
    if (selectedNodes.length > 0) setBatchDeleteTargets(selectedNodes);
  }, [selectedNodes]);
  const handleContextMenu = reactExports.useCallback(
    (node) => {
      if (!listState.selection.has(node.id)) listState.selectOnly(node.id);
    },
    [listState],
  );
  const allSelected =
    fileRowKeys.length > 0 && fileRowKeys.every((key) => listState.selection.has(key));
  const someSelected = fileRowKeys.some((key) => listState.selection.has(key));
  const handleNodeClick = reactExports.useCallback(
    (node) => {
      if (node.kind === "folder") {
        if (isSearching) {
          const path = search.folderPathsById.get(node.id);
          if (!path) return;
          folder.goToFolderPath(path);
          listState.setSearch("");
        } else {
          folder.enterFolder(node);
        }
        return;
      }
      if (node.review !== "pass" || !node.cdnUrl) return;
      const media = mediaKind$1(node);
      if (media)
        setPreview({
          kind: media,
          node,
        });
    },
    [folder, isSearching, listState, search.folderPathsById],
  );
  const handleMoveNode = reactExports.useCallback(
    async (node, target) => {
      try {
        await moveCloudNode(node.id, target.folderId);
      } catch (err) {
        dedupedToast.error(cloudErrorDisplayMessage(err) ?? t("cloudAssets.failServer"));
        return;
      }
      if (folderName) {
        try {
          if (node.kind === "folder") {
            await service.moveLocalFolder(
              folderName,
              [...parentSegmentsFor(node), node.name],
              target.segments,
              {
                onConflict: "uniquify",
                missingOk: true,
              },
            );
          } else {
            await service.moveLocalAsset(folderName, node.id, target.segments, {
              onConflict: "uniquify",
              missingOk: true,
            });
          }
        } catch {
          dedupedToast.warning(
            t("cloudAssets.moveLocalFailed", {
              name: node.name,
            }),
          );
        }
      }
    },
    [folderName, parentSegmentsFor, service, t],
  );
  const handleMoveTargets = reactExports.useCallback(
    async (targets, target) => {
      for (const node of compactCloudMoveTargets(targets, parentSegmentsFor)) {
        await handleMoveNode(node, target);
      }
      listState.clearSelection();
      refreshFolder();
      if (isSearching) search.refresh();
      void refreshSyncMap();
    },
    [
      handleMoveNode,
      isSearching,
      listState,
      parentSegmentsFor,
      refreshFolder,
      refreshSyncMap,
      search.refresh,
    ],
  );
  const handleRenamed = reactExports.useCallback(
    async (node, newName) => {
      if (folderName) {
        try {
          if (node.kind === "folder") {
            await service.renameLocalFolder(
              folderName,
              [...parentSegmentsFor(node), node.name],
              newName,
              {
                onConflict: "uniquify",
                missingOk: true,
              },
            );
          } else {
            const snapshot = syncMap.get(node.id);
            const wasSynced = snapshot !== void 0 && snapshot >= node.updatedAt;
            await service.renameLocalAsset(folderName, node.id, newName, {
              onConflict: "uniquify",
              missingOk: true,
              ...(wasSynced && node.updatedAt
                ? {
                    remoteUpdatedAt: node.updatedAt,
                  }
                : {}),
            });
          }
        } catch {
          dedupedToast.warning(
            t("cloudAssets.renameLocalFailed", {
              name: node.name,
            }),
          );
        }
      }
      refreshFolder();
      if (isSearching) search.refresh();
      void refreshSyncMap();
    },
    [
      folderName,
      isSearching,
      parentSegmentsFor,
      refreshFolder,
      refreshSyncMap,
      search.refresh,
      service,
      syncMap,
      t,
    ],
  );
  const canDropNode = reactExports.useCallback((node, target) => {
    if (node.kind === "folder" && target.folderId === node.id) return false;
    return normalizeCloudParentId(target.folderId) !== normalizeCloudParentId(node.parentId);
  }, []);
  const canDropTargets = reactExports.useCallback(
    (targets, target) => targets.length > 0 && targets.every((node) => canDropNode(node, target)),
    [canDropNode],
  );
  const moveDnd = useMoveDnd({
    keyOf: (target) => target.key,
    canDrop: canDropTargets,
    onDrop: (targets, target) => void handleMoveTargets(targets, target),
  });
  const nodeDnd = reactExports.useCallback(
    (node) => ({
      dndProps: {
        draggable: true,
        onDragStart: (event) => {
          const targets = actionTargetsFor(node);
          if (!listState.selection.has(node.id)) listState.selectOnly(node.id);
          moveDnd.startDrag(
            event,
            targets,
            targets.length > 1
              ? t("projectAssets.selectedCount", {
                  count: targets.length,
                })
              : void 0,
          );
        },
        onDragEnd: moveDnd.endDrag,
        ...(node.kind === "folder"
          ? moveDnd.targetProps({
              key: node.id,
              folderId: node.id,
              segments: [...parentSegmentsFor(node), node.name],
            })
          : moveDnd.blockerProps()),
      },
      dropActive: node.kind === "folder" && moveDnd.overKey === node.id,
    }),
    [actionTargetsFor, listState, moveDnd, parentSegmentsFor, t],
  );
  const crumbTarget = reactExports.useCallback(
    (index) => {
      const id = index < 0 ? "" : (folder.stack[index]?.id ?? "");
      return {
        key: `crumb:${id}`,
        folderId: id,
        segments: folder.folderSegments.slice(0, index + 1),
      };
    },
    [folder.folderSegments, folder.stack],
  );
  const cloudMove = useCloudMoveOptions(cloudProjectId, moveDialogTargets.length > 0);
  const moveOptions = reactExports.useMemo(
    () =>
      moveDialogTargets
        .filter((node) => node.kind === "folder")
        .reduce(
          (options, node) => filterMoveOptions(options, [...parentSegmentsFor(node), node.name]),
          cloudMove.options,
        ),
    [cloudMove.options, moveDialogTargets, parentSegmentsFor],
  );
  const moveNoopKey = reactExports.useMemo(() => {
    const parents = new Set(
      moveDialogTargets.map((node) => normalizeCloudParentId(node.parentId) || ROOT_KEY),
    );
    return parents.size === 1 ? [...parents][0] : void 0;
  }, [moveDialogTargets]);
  const handleReveal = reactExports.useCallback(
    async (node) => {
      if (!folderName) return;
      const absolute = await service.getAssetAbsolutePath(folderName, node.id);
      if (!absolute || !platform.shell.showItemInFolder) {
        dedupedToast.error(
          t("localAssets.openFailed", {
            name: node.name,
          }),
        );
        void refreshSyncMap();
        return;
      }
      await platform.shell.showItemInFolder(absolute);
    },
    [folderName, platform.shell, refreshSyncMap, service, t],
  );
  const handleRevealTargets = reactExports.useCallback(
    async (targets) => {
      if (targets.length === 0) return;
      if (targets.length === 1 && targets[0]) {
        await handleReveal(targets[0]);
        return;
      }
      if (!assetsDir || !platform.shell.openPath) {
        dedupedToast.error(
          t("localAssets.openFailed", {
            name: project.name,
          }),
        );
        return;
      }
      const parentPaths = targets.map((node) => parentSegmentsFor(node).join("/"));
      const sharedParent = parentPaths.every((path) => path === parentPaths[0])
        ? (parentPaths[0] ?? folder.folderSegments.join("/"))
        : folder.folderSegments.join("/");
      await platform.shell.openPath(sharedParent ? `${assetsDir}/${sharedParent}` : assetsDir);
    },
    [
      assetsDir,
      folder.folderSegments,
      handleReveal,
      parentSegmentsFor,
      platform.shell,
      project.name,
      t,
    ],
  );
  const handleDebugDump = reactExports.useCallback(async () => {
    if (!debugEnabled || debugLoading) return;
    setDebugLoading(true);
    try {
      const dump = await debugDumpCloudProjectAssets(cloudProjectId);
      console.log("[cloud-assets] raw dump", dump);
      setDebugDump(dump);
    } catch (err) {
      dedupedToast.error(
        cloudErrorDisplayMessage(err) ??
          t("cloudAssets.debugDumpFailed", {
            message: t("cloudAssets.failServer"),
          }),
      );
    } finally {
      setDebugLoading(false);
    }
  }, [cloudProjectId, debugEnabled, debugLoading, t]);
  if (!cloudProjectId) {
    return (
      <p className="pt-10 text-center text-[13px] text-muted-foreground">
        {t("cloudAssets.noCloudBinding")}
      </p>
    );
  }
  return (
    <div
      className="no-drag flex min-h-0 flex-1 flex-col gap-3"
      data-action-ui-id="cloud-assets.panel"
    >
      <div className="flex shrink-0 items-stretch gap-3">
        <button
          type="button"
          onClick={() => setNewFolderOpen(true)}
          disabled={!writePolicy.canCreateFolder}
          title={folderDepthMessage}
          data-action-ui-id="cloud-assets.new-folder"
          className="group flex h-[64px] min-w-0 flex-1 items-center gap-3.5 rounded-lg border border-border/70 bg-card px-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-150 hover:border-border hover:bg-foreground/[0.03] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] focus-visible:border-ring/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-foreground/[0.03] text-foreground/80 transition-colors group-hover:bg-foreground/[0.05] dark:bg-foreground/[0.06] dark:group-hover:bg-foreground/[0.1] group-hover:text-foreground">
            <FolderPlus size={18} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col gap-1.5">
            <span className="truncate text-[13px] leading-none text-foreground">
              {t("cloudAssets.newFolder")}
            </span>
            <span className="truncate text-[11px] leading-none text-muted-foreground">
              {folderDepthMessage ?? t("projectAssets.createFolderHint")}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!writePolicy.canCreateFile}
          title={fileDepthMessage}
          data-action-ui-id="cloud-assets.upload"
          className="group flex h-[64px] min-w-0 flex-1 items-center gap-3.5 rounded-lg border border-border/70 bg-card px-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-150 hover:border-border hover:bg-foreground/[0.03] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] focus-visible:border-ring/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-foreground/[0.03] text-foreground/80 transition-colors group-hover:bg-foreground/[0.05] dark:bg-foreground/[0.06] dark:group-hover:bg-foreground/[0.1] group-hover:text-foreground">
            <Upload size={18} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col gap-1.5">
            <span className="truncate text-[13px] leading-none text-foreground">
              {t("cloudAssets.upload")}
            </span>
            <span className="truncate text-[11px] leading-none text-muted-foreground">
              {fileDepthMessage ?? t("projectAssets.batchUploadHint")}
            </span>
          </span>
        </button>
        <CloudUsagePanel
          usedBytes={usage?.usedBytes ?? 0}
          totalBytes={usage?.totalBytes ?? 0}
          loading={usageLoading}
          error={usageError}
          onRetry={refreshUsage}
        />
      </div>
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
      <div className="mt-3">
        <AssetsHeader
          state={listState}
          viewMode={viewMode}
          setViewMode={setViewMode}
          actionIdPrefix="cloud-assets"
          breadcrumb={
            // Always show the "全部文件" root crumb, even at an empty root, so
            // users always see where uploads will land.
            <Breadcrumb$1
              stack={folder.stack}
              onCrumb={folder.goToCrumb}
              crumbDnd={(index) => moveDnd.targetProps(crumbTarget(index))}
              crumbDropActive={(index) => moveDnd.overKey === crumbTarget(index).key}
            />
          }
          rightMeta={
            <>
              {debugEnabled ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("cloudAssets.debugDump")}
                  title={t("cloudAssets.debugDump")}
                  disabled={debugLoading}
                  onClick={() => void handleDebugDump()}
                  data-action-ui-id="cloud-assets.debug-dump"
                >
                  <Bug
                    size={15}
                    strokeWidth={1.5}
                    className={cn(debugLoading && "animate-pulse")}
                  />
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("cloudAssets.refresh")}
                onClick={() => {
                  if (isSearching) search.refresh();
                  else refreshFolder();
                  refreshUsage();
                  refreshReview();
                  void refreshSyncMap();
                }}
                data-action-ui-id="cloud-assets.refresh"
              >
                <RetryIcon
                  size={15}
                  strokeWidth={1.5}
                  className={cn(activeLoading && "animate-spin")}
                />
              </Button>
              <TransfersButton
                reviewNodes={review.nodes}
                reviewLoading={review.loading}
                transfers={projectTransfers}
                onOpen={refreshReview}
                onCancelTransfer={transfers.cancelTransfer}
                onDeleteBlocked={(node) => void handleDeleteBlocked(node)}
                onRemoveTransfer={transfers.removeTransfer}
              />
            </>
          }
        />
      </div>
      {activeError ? (
        <AssetsErrorState
          title={activeMembershipError ? t("cloudAssets.notTeamMemberTitle") : void 0}
          message={
            activeMembershipError
              ? t("cloudAssets.notTeamMemberDescription")
              : isSearching
                ? (search.userMessage ?? t("cloudAssets.failServer"))
                : activeError
          }
          onRetry={isSearching ? search.refresh : refreshFolder}
        />
      ) : visibleNodes.length === 0 &&
        !hasVisibleUploads &&
        activeLoading &&
        (isSearching || !folder.hasLoaded) ? (
        <AssetsListSkeleton />
      ) : isRootEmpty && !hasVisibleUploads && !isSearching ? (
        <AssetsDropzoneEmpty
          onOpenPicker={() => fileInputRef.current?.click()}
          onPickFiles={(files) => void handleUploadPicked(files)}
          disabled={!writePolicy.canCreateFile}
        />
      ) : visibleNodes.length === 0 && !hasVisibleUploads && !isSearching ? (
        <AssetsEmptyState
          variant="default"
          title={t("localAssets.emptyFolderTitle", "当前文件夹暂无资产")}
          cta={
            <Button
              size="sm"
              disabled={!writePolicy.canCreateFile}
              title={fileDepthMessage}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} strokeWidth={1.5} data-icon="inline-start" />
              {t("cloudAssets.upload")}
            </Button>
          }
        />
      ) : visibleNodes.length === 0 && !hasVisibleUploads ? (
        <AssetsEmptyState variant="search" />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          <UploadingAssets transfers={visibleUploads} viewMode={viewMode} />
          {visibleNodes.map((node) => (
            <NodeCard$1
              key={node.id}
              node={node}
              thumbSrc={thumbnailSrcFor(node, 480)}
              syncMap={syncMap}
              downloadingIds={downloadingIds}
              memberNames={memberNames}
              onOpen={handleNodeClick}
              onDownload={handleDownload}
              onDownloadFolder={(target) => void handleDownloadFolder(target)}
              onReveal={(target) => void handleReveal(target)}
              onRename={setRenameTarget}
              onMove={(target) => setMoveDialogTargets([target])}
              onDelete={setDeleteTarget}
              {...nodeDnd(node)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          <AssetsSelectionBar
            count={listState.selection.size}
            onClear={listState.clearSelection}
            allSelected={allSelected}
            someSelected={someSelected}
            onToggleAll={() =>
              listState.toggleAll(fileRowKeys, {
                preserveOtherSelection: true,
              })
            }
            onDownload={() => void handleBatchDownload()}
            downloadLabel={t("cloudAssets.download")}
            downloadDisabled={!hasDownloadableSelection}
            onDelete={openBatchDelete}
            busy={batchBusy}
            actionIdPrefix="cloud-assets"
          />
          <div className="flex h-9 w-full shrink-0 items-center gap-3 border-y border-border px-3 text-[12px] font-medium tracking-wide text-muted-foreground uppercase">
            <span className="min-w-0 flex-1 truncate">{t("projectAssets.columns.name")}</span>
            <span className="hidden w-28 shrink-0 truncate md:block">
              {t("projectAssets.columns.owner")}
            </span>
            <span className="-translate-x-4 hidden w-32 shrink-0 truncate md:block">
              {t("projectAssets.columns.updated")}
            </span>
            <span className="-translate-x-4 w-20 shrink-0 truncate pr-3">
              {t("projectAssets.columns.size")}
            </span>
          </div>
          <UploadingAssets transfers={visibleUploads} viewMode={viewMode} />
          {visibleNodes.map((node, index) => (
            <NodeRow$1
              key={node.id}
              node={node}
              thumbSrc={thumbnailSrcFor(node, 48)}
              isLast={index === visibleNodes.length - 1}
              syncMap={syncMap}
              downloadingIds={downloadingIds}
              memberNames={memberNames}
              selected={listState.selection.has(node.id)}
              onToggleSelect={(event) => {
                if (event.shiftKey) {
                  listState.toggleRange(rowKeys, node.id);
                } else {
                  listState.toggle(node.id);
                }
              }}
              onOpen={handleNodeClick}
              onDownload={handleDownload}
              onDownloadFolder={(target) => void handleDownloadFolder(target)}
              onReveal={(target) => void handleReveal(target)}
              onRename={setRenameTarget}
              onMove={(target) => setMoveDialogTargets([target])}
              onDelete={setDeleteTarget}
              actionTargets={actionTargetsFor(node)}
              onContextMenu={handleContextMenu}
              onRevealTargets={(targets) => void handleRevealTargets(targets)}
              onMoveTargets={(targets) => setMoveDialogTargets([...targets])}
              onDeleteTargets={(targets) => setBatchDeleteTargets([...targets])}
              {...nodeDnd(node)}
            />
          ))}
        </div>
      )}
      {activeHasMore ? (
        <div className="flex justify-center pb-2">
          <Button variant="ghost" size="sm" disabled={activeLoading} onClick={loadMore}>
            {t("cloudAssets.loadMore")}
          </Button>
        </div>
      ) : null}
      <NewFolderDialog
        open={newFolderOpen}
        projectId={cloudProjectId}
        parentId={folder.currentFolderId}
        onOpenChange={setNewFolderOpen}
        onCreated={refreshFolder}
      />
      <RenameNodeDialog
        node={renameTarget}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        onRenamed={(node, newName) => void handleRenamed(node, newName)}
      />
      <DeleteNodeDialog
        node={deleteTarget}
        batchNodes={batchDeleteTargets}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setBatchDeleteTargets([]);
          }
        }}
        onConfirm={handleDelete}
        onCompleted={() => {
          listState.clearSelection();
          refreshFolder();
          if (isSearching) search.refresh();
          refreshUsage();
        }}
      />
      <MoveNodeDialog
        open={moveDialogTargets.length > 0}
        name={moveDialogTargets[0]?.name ?? ""}
        itemCount={moveDialogTargets.length}
        options={moveOptions}
        loading={cloudMove.loading}
        noopKey={moveNoopKey}
        onOpenChange={(open) => {
          if (!open) setMoveDialogTargets([]);
        }}
        onConfirm={async (destination) => {
          if (moveDialogTargets.length === 0) return;
          await handleMoveTargets(moveDialogTargets, {
            key: destination.key,
            folderId: destination.key === ROOT_KEY ? "" : destination.key,
            segments: destination.segments,
          });
        }}
      />
      {debugEnabled ? (
        <Dialog open={debugDump !== null} onOpenChange={(open) => !open && setDebugDump(null)}>
          <DialogContent size="xl" data-action-ui-id="cloud-assets.debug-dump-dialog">
            <DialogHeader>
              <DialogTitle className="text-body-14 leading-5 font-medium">
                {t("cloudAssets.debugDumpTitle")}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t("cloudAssets.debugDumpTitle")}
              </DialogDescription>
            </DialogHeader>
            {debugDump ? <DebugDumpView dump={debugDump} /> : null}
          </DialogContent>
        </Dialog>
      ) : null}
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
