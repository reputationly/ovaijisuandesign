// 本地资产面板：目录浏览、搜索、移动、导入与批量操作。
import {
  h as useTranslation,
  r as reactExports,
  a3 as dedupedToast,
  fM as Button,
  au as cn,
  o as usePlatform,
  hF as useProjectAssetsService,
  E as useProjectActions,
  v as useStorage,
  hL as gatewayUrl,
  m as API_PATHS,
  hM as withThumbnailWidth,
  hQ as getProjectAssetWritePolicy,
  hR as PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS,
  hZ as useMoveDnd,
  h$ as filterMoveOptions,
  i0 as ROOT_KEY,
  aL as FolderPlus,
  f0 as Upload,
  gk as RetryIcon,
  i4 as AssetsDropzoneEmpty,
  i9 as MoveNodeDialog,
  ia as MediaLightbox,
  io as importPickedFiles,
  ip as localFolderOptions,
  iq as NewLocalFolderDialog,
  ir as RenameLocalNodeDialog,
  is as DeleteLocalNodeDialog,
} from "../../main.jsx";
import { u as useWindowedList } from "../../ProjectMemberSummary-tUEX4nJc.js";
import { __jsx } from "../../shared/jsx-runtime.js";
import {
  AssetsEmptyState,
  AssetsHeader,
  AssetsListSkeleton,
  AssetsSelectionBar,
} from "../assets-common.jsx";
import {
  fileKeysForSelection,
  selectionTargetsForAction,
  useAssetsListState,
} from "../assets-state.js";
import { Breadcrumb, NodeCard, NodeRow, mediaKind } from "./local-node.jsx";
import {
  compactLocalMoveTargets,
  deriveLocalNodes,
  deriveLocalSearchNodes,
  localNodeParentRel,
  localNodeRelPath,
  nodeKey,
} from "./local-nodes.js";
const LOCAL_ASSETS_PAGE_SIZE = 100;
export function LocalAssetsPanel({ project }) {
  const { t } = useTranslation();
  const platform = usePlatform();
  const service = useProjectAssetsService();
  const { ensureProjectFolderName } = useProjectActions();
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
  const [folderName, setFolderName] = reactExports.useState(void 0);
  const [assetsDir, setAssetsDir] = reactExports.useState(void 0);
  const [records, setRecords] = reactExports.useState([]);
  const [folders, setFolders] = reactExports.useState([]);
  const [segments, setSegments] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [newFolderOpen, setNewFolderOpen] = reactExports.useState(false);
  const [renameTarget, setRenameTarget] = reactExports.useState(null);
  const [deleteTarget, setDeleteTarget] = reactExports.useState(null);
  const [batchDeleteTargets, setBatchDeleteTargets] = reactExports.useState([]);
  const [moveDialogTargets, setMoveDialogTargets] = reactExports.useState([]);
  const [preview, setPreview] = reactExports.useState(null);
  const fileInputRef = reactExports.useRef(null);
  const epochRef = reactExports.useRef(0);
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
  const refresh = reactExports.useCallback(async () => {
    if (!folderName) return;
    const epoch = ++epochRef.current;
    setLoading(true);
    try {
      const [nextRecords, nextFolders] = await Promise.all([
        service.listAssets(folderName),
        service.listLocalFolders(folderName),
      ]);
      if (epoch !== epochRef.current) return;
      setRecords(nextRecords);
      setFolders(nextFolders);
      setSegments((previous) => {
        const existing = new Set(nextFolders);
        let keep = previous.length;
        while (keep > 0 && !existing.has(previous.slice(0, keep).join("/"))) keep -= 1;
        return keep === previous.length ? previous : previous.slice(0, keep);
      });
    } catch (err) {
      if (epoch === epochRef.current) {
        dedupedToast.error(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (epoch === epochRef.current) setLoading(false);
    }
  }, [folderName, service]);
  reactExports.useEffect(() => {
    void refresh();
  }, [refresh]);
  reactExports.useEffect(() => {
    if (!folderName) return;
    const subscription = service.onDidChangeAssets((event) => {
      if (event.projectFolderName === folderName) void refresh();
    });
    return () => subscription.dispose();
  }, [folderName, refresh, service]);
  const currentRel = segments.join("/");
  const nodes = reactExports.useMemo(
    () => deriveLocalNodes(records, folders, currentRel),
    [records, folders, currentRel],
  );
  const listState = useAssetsListState();
  reactExports.useEffect(() => {
    if (viewMode === "grid") listState.clearSelection();
  }, [listState.clearSelection, viewMode]);
  const searchQuery = listState.search.trim();
  const [searchRecords, setSearchRecords] = reactExports.useState([]);
  const [searchFolders, setSearchFolders] = reactExports.useState([]);
  const [searchLoading, setSearchLoading] = reactExports.useState(false);
  const searchEpochRef = reactExports.useRef(0);
  reactExports.useEffect(() => {
    const epoch = ++searchEpochRef.current;
    if (!folderName || !searchQuery) {
      setSearchRecords([]);
      setSearchFolders([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      void service
        .searchLocalAssets(folderName, searchQuery, currentRel)
        .then((matchingRecords) => {
          if (epoch !== searchEpochRef.current) return;
          setSearchRecords(matchingRecords);
          setSearchFolders(
            folders.filter((relPath) => {
              const slash = relPath.lastIndexOf("/");
              const parent = slash === -1 ? "" : relPath.slice(0, slash);
              const name = slash === -1 ? relPath : relPath.slice(slash + 1);
              return (
                parent === currentRel && name.toLowerCase().includes(searchQuery.toLowerCase())
              );
            }),
          );
        })
        .catch((err) => {
          if (epoch !== searchEpochRef.current) return;
          setSearchRecords([]);
          setSearchFolders([]);
          dedupedToast.error(err instanceof Error ? err.message : String(err));
        })
        .finally(() => {
          if (epoch === searchEpochRef.current) setSearchLoading(false);
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [currentRel, folderName, folders, searchQuery, service]);
  const listedNodes = reactExports.useMemo(
    () =>
      searchQuery
        ? deriveLocalSearchNodes(records, searchRecords, searchFolders, currentRel)
        : nodes,
    [currentRel, nodes, records, searchFolders, searchQuery, searchRecords],
  );
  const {
    visibleItems: visibleNodes,
    hasMore,
    sentinelRef,
  } = useWindowedList(
    listedNodes,
    LOCAL_ASSETS_PAGE_SIZE,
    `${folderName ?? ""}\0${currentRel}\0${searchQuery}`,
  );
  const rowKeys = reactExports.useMemo(
    () => listedNodes.map((node) => nodeKey(node)),
    [listedNodes],
  );
  const fileRowKeys = reactExports.useMemo(
    () => fileKeysForSelection(listedNodes, nodeKey),
    [listedNodes],
  );
  const selectedNodes = reactExports.useMemo(
    () => listedNodes.filter((node) => listState.selection.has(nodeKey(node))),
    [listState.selection, listedNodes],
  );
  const actionTargetsFor = reactExports.useCallback(
    (node) => selectionTargetsForAction(node, listedNodes, listState.selection, nodeKey),
    [listState.selection, listedNodes],
  );
  const fileUrlFor = reactExports.useCallback(
    (node, width) => {
      if (!assetsDir || !node.record) return void 0;
      const url = gatewayUrl(API_PATHS.serveLocal(`${assetsDir}/${node.record.relPath}`));
      return width === void 0 ? url : withThumbnailWidth(url, width);
    },
    [assetsDir],
  );
  const handleImportPicked = reactExports.useCallback(
    async (files) => {
      if (!folderName || files.length === 0) return;
      if (
        await importPickedFiles({
          service,
          folderName,
          folderSegments: segments,
          files,
          t,
        })
      ) {
        void refresh();
      }
    },
    [folderName, refresh, segments, service, t],
  );
  const handleCreateFolder = reactExports.useCallback(
    async (name) => {
      if (!folderName) return;
      await service.createLocalFolder(folderName, [...segments, name]);
      void refresh();
    },
    [folderName, refresh, segments, service],
  );
  const handleDelete = reactExports.useCallback(
    async (node) => {
      if (!folderName) return;
      if (node.kind === "folder") {
        await service.deleteLocalFolder(folderName, [...segments, node.name]);
      } else if (node.record) {
        await service.deleteLocalAsset(folderName, node.record.id);
      }
    },
    [folderName, segments, service],
  );
  const handleOpenFile = reactExports.useCallback(
    async (node) => {
      if (!folderName || !node.record) return;
      const absolute = await service.getAssetAbsolutePath(folderName, node.record.id);
      if (!absolute || !platform.shell.openPath) {
        dedupedToast.error(
          t("localAssets.openFailed", {
            name: node.name,
          }),
        );
        void refresh();
        return;
      }
      await platform.shell.openPath(absolute);
    },
    [folderName, platform.shell, refresh, service, t],
  );
  const handleReveal = reactExports.useCallback(
    async (node) => {
      if (!folderName) return;
      const absolute =
        node.kind === "folder"
          ? assetsDir && `${assetsDir}/${[...segments, node.name].join("/")}`
          : node.record && (await service.getAssetAbsolutePath(folderName, node.record.id));
      if (!absolute || !platform.shell.showItemInFolder) {
        dedupedToast.error(
          t("localAssets.openFailed", {
            name: node.name,
          }),
        );
        void refresh();
        return;
      }
      await platform.shell.showItemInFolder(absolute);
    },
    [assetsDir, folderName, platform.shell, refresh, segments, service, t],
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
      const parentRels = targets.map((node) => localNodeParentRel(node, currentRel));
      const sharedParent = parentRels.every((rel) => rel === parentRels[0])
        ? (parentRels[0] ?? currentRel)
        : currentRel;
      await platform.shell.openPath(sharedParent ? `${assetsDir}/${sharedParent}` : assetsDir);
    },
    [assetsDir, currentRel, handleReveal, platform.shell, project.name, t],
  );
  const handleNodeClick = reactExports.useCallback(
    (node) => {
      if (node.kind === "folder") {
        setSegments((previous) => [...previous, node.name]);
        return;
      }
      const media = mediaKind(node);
      if (media && fileUrlFor(node)) {
        setPreview({
          kind: media,
          node,
        });
        return;
      }
      void handleOpenFile(node);
    },
    [fileUrlFor, handleOpenFile],
  );
  const handleRename = reactExports.useCallback(
    async (node, newName) => {
      if (!folderName) return;
      if (node.kind === "folder") {
        await service.renameLocalFolder(folderName, [...segments, node.name], newName);
      } else if (node.record) {
        await service.renameLocalAsset(folderName, node.record.id, newName);
      }
      void refresh();
    },
    [folderName, refresh, segments, service],
  );
  const handleMoveTargets = reactExports.useCallback(
    async (targets, target) => {
      if (!folderName) return;
      for (const node of compactLocalMoveTargets(targets, currentRel)) {
        try {
          if (node.kind === "folder") {
            await service.moveLocalFolder(
              folderName,
              localNodeRelPath(node, currentRel).split("/"),
              target.segments,
            );
          } else if (node.record) {
            await service.moveLocalAsset(folderName, node.record.id, target.segments);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          dedupedToast.error(
            message.includes("duplicate_name")
              ? t("localAssets.moveDuplicate")
              : message.includes("depth_exceeded")
                ? t("localAssets.folderDepthLimit", {
                    count: PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS,
                  })
                : message,
          );
        }
      }
      listState.clearSelection();
      void refresh();
    },
    [currentRel, folderName, listState, refresh, service, t],
  );
  const canDropNode = reactExports.useCallback(
    (node, target) => {
      if (target.key === currentRel) return false;
      if (node.kind === "folder") {
        const draggedRel = localNodeRelPath(node, currentRel);
        if (target.key === draggedRel || target.key.startsWith(`${draggedRel}/`)) return false;
      }
      return true;
    },
    [currentRel],
  );
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
    (node) => {
      const folderKey = currentRel === "" ? node.name : `${currentRel}/${node.name}`;
      return {
        dndProps: {
          draggable: true,
          onDragStart: (event) => {
            const targets = actionTargetsFor(node);
            if (!listState.selection.has(nodeKey(node))) listState.selectOnly(nodeKey(node));
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
                key: folderKey,
                segments: [...segments, node.name],
              })
            : moveDnd.blockerProps()),
        },
        dropActive: node.kind === "folder" && moveDnd.overKey === folderKey,
      };
    },
    [actionTargetsFor, currentRel, listState, moveDnd, segments, t],
  );
  const crumbTarget = reactExports.useCallback(
    (index) => {
      const crumbSegments = segments.slice(0, index + 1);
      return {
        key: crumbSegments.join("/"),
        segments: crumbSegments,
      };
    },
    [segments],
  );
  const moveOptions = reactExports.useMemo(
    () =>
      moveDialogTargets
        .filter((node) => node.kind === "folder")
        .reduce(
          (options, node) =>
            filterMoveOptions(options, localNodeRelPath(node, currentRel).split("/")),
          localFolderOptions(folders),
        ),
    [currentRel, folders, moveDialogTargets],
  );
  const moveNoopKey = reactExports.useMemo(() => {
    const parents = new Set(
      moveDialogTargets.map((node) => localNodeParentRel(node, currentRel) || ROOT_KEY),
    );
    return parents.size === 1 ? [...parents][0] : void 0;
  }, [currentRel, moveDialogTargets]);
  const writePolicy = getProjectAssetWritePolicy(segments.length);
  const folderDepthMessage = !writePolicy.canCreateFolder
    ? writePolicy.canCreateFile
      ? t("projectAssets.folderDepthReached", {
          count: PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS,
        })
      : t("projectAssets.depthExceeded")
    : void 0;
  const fileDepthMessage = !writePolicy.canCreateFile ? t("projectAssets.depthExceeded") : void 0;
  const isRootEmpty = segments.length === 0 && nodes.length === 0 && !loading;
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
  const openBatchDelete = reactExports.useCallback(() => {
    if (selectedNodes.length > 0) setBatchDeleteTargets(selectedNodes);
  }, [selectedNodes]);
  const handleContextMenu = reactExports.useCallback(
    (node) => {
      const key = nodeKey(node);
      if (!listState.selection.has(key)) listState.selectOnly(key);
    },
    [listState],
  );
  const allSelected =
    fileRowKeys.length > 0 && fileRowKeys.every((key) => listState.selection.has(key));
  const someSelected = fileRowKeys.some((key) => listState.selection.has(key));
  return (
    <div
      className="no-drag flex min-h-0 flex-1 flex-col gap-3"
      data-action-ui-id="local-assets.panel"
    >
      <div className="flex shrink-0 items-stretch gap-3">
        <button
          type="button"
          disabled={!folderName || !writePolicy.canCreateFolder}
          title={folderDepthMessage}
          onClick={() => setNewFolderOpen(true)}
          data-action-ui-id="local-assets.new-folder"
          className="group flex h-[64px] min-w-0 flex-1 items-center gap-3.5 rounded-lg border border-border/70 bg-card px-4 text-left transition-colors duration-150 hover:border-border hover:bg-foreground/[0.02] dark:hover:bg-foreground/[0.06] focus-visible:border-ring/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-foreground/[0.03] text-foreground/80 transition-colors group-hover:bg-foreground/[0.05] dark:bg-foreground/[0.06] dark:group-hover:bg-foreground/[0.1] group-hover:text-foreground">
            <FolderPlus size={18} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col gap-1.5">
            <span className="truncate text-[13px] leading-none text-foreground">
              {t("localAssets.newFolder")}
            </span>
            <span className="truncate text-[11px] leading-none text-muted-foreground">
              {folderDepthMessage ?? t("projectAssets.createFolderHint")}
            </span>
          </span>
        </button>
        <button
          type="button"
          disabled={!folderName || !writePolicy.canCreateFile}
          title={fileDepthMessage}
          onClick={() => fileInputRef.current?.click()}
          data-action-ui-id="local-assets.upload"
          className="group flex h-[64px] min-w-0 flex-1 items-center gap-3.5 rounded-lg border border-border/70 bg-card px-4 text-left transition-colors duration-150 hover:border-border hover:bg-foreground/[0.02] dark:hover:bg-foreground/[0.06] focus-visible:border-ring/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-foreground/[0.03] text-foreground/80 transition-colors group-hover:bg-foreground/[0.05] dark:bg-foreground/[0.06] dark:group-hover:bg-foreground/[0.1] group-hover:text-foreground">
            <Upload size={18} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col gap-1.5">
            <span className="truncate text-[13px] leading-none text-foreground">
              {t("localAssets.upload")}
            </span>
            <span className="truncate text-[11px] leading-none text-muted-foreground">
              {fileDepthMessage ?? t("projectAssets.batchUploadHint")}
            </span>
          </span>
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple={true}
        className="hidden"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          void handleImportPicked(files);
        }}
      />
      <div className="mt-3">
        <AssetsHeader
          state={listState}
          viewMode={viewMode}
          setViewMode={setViewMode}
          actionIdPrefix="local-assets"
          breadcrumb={
            // Always show the "全部文件" root crumb, even at an empty root, so
            // users always see where uploads will land.
            <Breadcrumb
              segments={segments}
              onCrumb={(index) => {
                if (index < 0) {
                  setSegments([]);
                  return;
                }
                setSegments((previous) => previous.slice(0, index + 1));
              }}
              crumbDnd={(index) => moveDnd.targetProps(crumbTarget(index))}
              crumbDropActive={(index) => moveDnd.overKey === crumbTarget(index).key}
            />
          }
          rightMeta={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("localAssets.refresh")}
              onClick={() => void refresh()}
              data-action-ui-id="local-assets.refresh"
            >
              <RetryIcon size={15} className={cn(loading && "animate-spin")} />
            </Button>
          }
        />
      </div>
      {loading && nodes.length === 0 ? (
        <AssetsListSkeleton />
      ) : searchQuery && searchLoading && listedNodes.length === 0 ? (
        <AssetsListSkeleton />
      ) : isRootEmpty && !searchQuery ? (
        <AssetsDropzoneEmpty
          disabled={!folderName || !writePolicy.canCreateFile}
          onOpenPicker={() => fileInputRef.current?.click()}
          onPickFiles={(files) => void handleImportPicked(files)}
        />
      ) : nodes.length === 0 && !searchQuery ? (
        <AssetsEmptyState
          variant="default"
          title={t("localAssets.emptyFolderTitle", "当前文件夹暂无资产")}
          cta={
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={!folderName || !writePolicy.canCreateFile}
            >
              <Upload size={14} strokeWidth={1.5} data-icon="inline-start" />
              {t("localAssets.upload")}
            </Button>
          }
        />
      ) : visibleNodes.length === 0 ? (
        <AssetsEmptyState variant="search" />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {visibleNodes.map((node) => (
            <NodeCard
              key={nodeKey(node)}
              node={node}
              thumbSrc={fileUrlFor(node, 480)}
              onOpen={handleNodeClick}
              onOpenFile={handleOpenFile}
              onReveal={handleReveal}
              onRename={setRenameTarget}
              onMove={(target) => setMoveDialogTargets([target])}
              onDelete={setDeleteTarget}
              {...nodeDnd(node)}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-w-0 flex-col">
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
            onDelete={openBatchDelete}
            actionIdPrefix="local-assets"
          />
          <div className="flex h-9 items-center gap-2 border-y border-border/70 px-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span className="min-w-0 flex-1">{t("localAssets.columnName", "名称")}</span>
            <span className="w-24 shrink-0 text-right">{t("localAssets.columnSize", "大小")}</span>
            <span className="w-28 shrink-0 text-right">
              {t("localAssets.columnModified", "更新时间")}
            </span>
            <span className="w-12 shrink-0" aria-hidden="true" />
          </div>
          {visibleNodes.map((node) => {
            const key = nodeKey(node);
            return (
              <NodeRow
                key={key}
                node={node}
                thumbSrc={fileUrlFor(node, 48)}
                selected={listState.selection.has(key)}
                onToggleSelect={(event) => {
                  if (event.shiftKey) {
                    listState.toggleRange(rowKeys, key);
                  } else {
                    listState.toggle(key);
                  }
                }}
                onOpen={handleNodeClick}
                onOpenFile={handleOpenFile}
                onReveal={handleReveal}
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
            );
          })}
        </div>
      )}
      {hasMore ? (
        <div
          ref={sentinelRef}
          aria-hidden="true"
          className="h-px"
          data-action-ui-id="local-assets.load-more-sentinel"
        />
      ) : null}
      <NewLocalFolderDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        onCreate={handleCreateFolder}
      />
      <RenameLocalNodeDialog
        node={renameTarget}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        onRename={handleRename}
      />
      <DeleteLocalNodeDialog
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
          void refresh();
        }}
      />
      <MoveNodeDialog
        open={moveDialogTargets.length > 0}
        name={moveDialogTargets[0]?.name ?? ""}
        itemCount={moveDialogTargets.length}
        options={moveOptions}
        noopKey={moveNoopKey}
        onOpenChange={(open) => {
          if (!open) setMoveDialogTargets([]);
        }}
        onConfirm={async (destination) => {
          if (moveDialogTargets.length === 0) return;
          await handleMoveTargets(moveDialogTargets, {
            key: destination.key === ROOT_KEY ? "" : destination.key,
            segments: destination.segments,
          });
        }}
      />
      {preview ? (
        <MediaLightbox
          kind={preview.kind}
          src={fileUrlFor(preview.node) ?? ""}
          alt={preview.node.name}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </div>
  );
}
