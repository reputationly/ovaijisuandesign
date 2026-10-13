// local-assets-sidebar-panel.jsx
import { API_PATHS, ChevronDown, ChevronRight$1 as ChevronRight, FolderInput, FolderPlus, jsxRuntimeExports, reactExports, usePlatform, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  AssetRowThumb,
  NewLocalFolderDialog,
  RenameLocalNodeDialog,
  useAnchorProjectAssets,
  useExternalFileDrop,
} from "./rename-local-node-dialog.jsx";
import { PlatformFileManagerLabel } from "../settings/request-prompt-prefill.jsx";
import {
  FolderOpen,
  ImageOutlineIcon,
  Trash2,
  Upload,
} from "../media-editing/package.jsx";
import {
  ContextMenu,
  workspaceEvents,
} from "../workspace/topbar-state-context.jsx";
import { PencilIcon } from "../workspace/home-service.jsx";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../workspace/context-menu-content.jsx";
import { AddToChatIcon } from "../canvas/fullscreen-icon.jsx";
import { Button, cn$2 as cn } from "../infra/dialog-content.jsx";
import {
  FolderTileGlyph,
  useProjectAssetsService,
} from "../infra/new-folder-dialog.jsx";
import { Icon, projectLog } from "../vendor-inline/vscode-base/graph.jsx";
import { resolveTypeBucket, ROOT_KEY } from "./list-all-cloud-folders.js";
import { ProjectAssetThumbnail } from "../infra/project-asset-thumbnail-generation.jsx";
import { PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS } from "./wrap-as-asset-center-error.js";
import { withThumbnail } from "../workspace/tool-label-definitions.js";
import {
  filterMoveOptions,
  localFolderOptions,
} from "./use-cloud-review-nodes.js";
import { useGatewayUrl } from "../generation/use-model-catalog-scope-key.js";
import { importPickedFiles } from "../canvas/uploading-assets.jsx";
import { DeleteLocalNodeDialog } from "../canvas/delete-local-node-dialog.jsx";
import {
  buildResourceDragItem,
  RESOURCE_DRAG_MIME,
} from "../text-editor/build-asr-gateway-request.js";
import { useMoveDnd } from "../infra/use-move-dnd.js";
import { MoveNodeDialog } from "../infra/move-node-dialog.jsx";
import { useProjectActions } from "../settings/use-project-actions.js";
import { PageStateBoundary } from "./page-state-boundary.jsx";
import { AssetsDropzoneEmpty } from "./assets-dropzone-empty.jsx";
const GRID_THUMBNAIL_DISPLAY_WIDTH = 128;
const LIST_THUMBNAIL_DISPLAY_WIDTH = 20;
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
  const visit = (parentRel, depth) => {
    const childFolders = folders
      .filter((rel) => relParent(rel) === parentRel)
      .sort((leftFolderPath, rightFolderPath) => leftFolderPath.localeCompare(rightFolderPath));
    for (const rel of childFolders) {
      rows.push({
        kind: "folder",
        rel,
        name: rel.split("/").pop() ?? rel,
        depth,
      });
      if (expanded.has(rel)) visit(rel, depth + 1);
    }
    const childFiles = records
      .filter((record) => relParent(record.relPath) === parentRel)
      .sort(
        (leftRecord, rightRecord) =>
          (rightRecord.updatedAt ?? rightRecord.createdAt) - (leftRecord.updatedAt ?? leftRecord.createdAt),
      );
    for (const record of childFiles) {
      rows.push({
        kind: "file",
        rel: record.relPath,
        name: record.name,
        depth,
        record,
      });
    }
  };
  visit("", 0);
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
  const { t: translate } = useTranslation();
  const record = row.record;
  const typeBucket = resolveTypeBucket({
    kind: row.kind,
    name: row.name,
    mime: record?.mime,
  });
  const Chevron = expanded ? ChevronDown : ChevronRight;
  const cardClassName = cn(
    "group relative flex min-w-0 flex-col rounded-lg p-1 text-left outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-1 focus-visible:ring-ring/50",
    row.kind === "file" && "cursor-grab active:cursor-grabbing",
    dropActive && "bg-foreground/[0.12]",
  );
  const content = (
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
            icon={Chevron}
            size="xs"
            strokeWidth={1.5}
            className="shrink-0 text-muted-foreground"
          />
        ) : null}
        <span
          className="min-w-0 flex-1 truncate text-[12px] text-foreground/70"
          title={row.name}
        >
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
              {content}
            </button>
          ) : (
            <div
              {...dndProps}
              className={cardClassName}
              data-action-ui-id="project-assets-sidebar.file-grid-card"
            >
              {content}
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
              {translate("localAssets.rename")}
            </ContextMenuItem>
            <ContextMenuItem onClick={onMove}>
              <Icon icon={FolderInput} size="sm" strokeWidth={1.5} />
              {translate("localAssets.moveTo")}
            </ContextMenuItem>
          </>
        ) : record ? (
          <>
            <ContextMenuItem onClick={() => onAddToCanvas(record)}>
              <Icon icon={ImageOutlineIcon} size="sm" strokeWidth={1.5} />
              {translate("localAssets.addToCanvas")}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => void onAddToAgent(record)}>
              <AddToChatIcon size={14} />
              {translate("localAssets.addToAgent")}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => void onRevealFile(record)}>
              <Icon icon={FolderOpen} size="sm" strokeWidth={1.5} />
              <PlatformFileManagerLabel />
            </ContextMenuItem>
            <ContextMenuItem
              onClick={onRename}
              data-action-ui-id="project-assets-sidebar.file-rename"
            >
              <PencilIcon size={14} strokeWidth={1.5} />
              {translate("localAssets.rename")}
            </ContextMenuItem>
            <ContextMenuItem onClick={onMove}>
              <Icon icon={FolderInput} size="sm" strokeWidth={1.5} />
              {translate("localAssets.moveTo")}
            </ContextMenuItem>
          </>
        ) : null}
        <ContextMenuItem variant="destructive" onClick={onDelete}>
          <Icon icon={Trash2} size="sm" strokeWidth={1.5} />
          {translate("localAssets.delete")}
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
  const { t: translate } = useTranslation();
  const Chevron = expanded ? ChevronDown : ChevronRight;
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <button
            type="button"
            onClick={() => onToggle(row.rel)}
            {...dndProps}
            className={cn(
              "list-row-hit-area flex h-7 w-full items-center gap-0.5 rounded-md px-2 text-left transition-colors hover:bg-foreground/5",
              dropActive && "bg-primary/10",
            )}
            style={{
              paddingLeft: `${8 + row.depth * 14}px`,
            }}
            data-action-ui-id="project-assets-sidebar.folder-row"
          >
            <Chevron
              size={13}
              strokeWidth={1.5}
              className="shrink-0 text-muted-foreground/70"
            />
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
          {translate("localAssets.rename")}
        </ContextMenuItem>
        <ContextMenuItem onClick={onMove}>
          <FolderInput size={14} strokeWidth={1.5} />
          {translate("localAssets.moveTo")}
        </ContextMenuItem>
        <ContextMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 size={14} strokeWidth={1.5} />
          {translate("localAssets.delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
function FileRow({
  record,
  depth,
  thumbSrc,
  onAddToCanvas,
  onAddToAgent,
  onReveal,
  onRename,
  onMove,
  onDelete,
  dndProps,
}) {
  const { t: translate } = useTranslation();
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <div
            {...dndProps}
            className="list-row-hit-area flex h-8 w-full cursor-grab items-center gap-2 rounded-md px-2 transition-colors hover:bg-foreground/5 active:cursor-grabbing"
            style={{
              paddingLeft: `${8 + depth * 14 + 18}px`,
            }}
            data-action-ui-id="project-assets-sidebar.file-row"
          >
            <AssetRowThumb
              thumbSrc={thumbSrc}
              filename={record.name}
              mime={record.mime}
            />
            <span className="min-w-0 flex-1 truncate text-[13px] text-foreground/70">
              {record.name}
            </span>
          </div>
        }
      />
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onAddToCanvas(record)}>
          <ImageOutlineIcon size={14} strokeWidth={1.5} />
          {translate("localAssets.addToCanvas")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => void onAddToAgent(record)}>
          <AddToChatIcon size={14} strokeWidth={1.5} />
          {translate("localAssets.addToAgent")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => void onReveal(record)}>
          <FolderOpen size={14} strokeWidth={1.5} />
          <PlatformFileManagerLabel />
        </ContextMenuItem>
        <ContextMenuItem
          onClick={onRename}
          data-action-ui-id="project-assets-sidebar.file-rename"
        >
          <PencilIcon size={14} strokeWidth={1.5} />
          {translate("localAssets.rename")}
        </ContextMenuItem>
        <ContextMenuItem onClick={onMove}>
          <FolderInput size={14} strokeWidth={1.5} />
          {translate("localAssets.moveTo")}
        </ContextMenuItem>
        <ContextMenuItem
          variant="destructive"
          onClick={() => onDelete(record)}
        >
          <Trash2 size={14} strokeWidth={1.5} />
          {translate("localAssets.delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
export function LocalAssetsSidebarPanel({
  project,
  onToolbarStateChange,
  searchQuery,
}) {
  const { t: translate } = useTranslation();
  const platform = usePlatform();
  const service = useProjectAssetsService();
  const { ensureProjectFolderName } = useProjectActions();
  const gatewayUrl = useGatewayUrl();
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
    const timeoutId = setTimeout(
      () => setDebouncedSearch((searchQuery ?? "").trim().toLowerCase()),
      200,
    );
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);
  const [viewMode, setViewMode] = reactExports.useState("tree");
  reactExports.useEffect(() => {
    let disposed = false;
    void ensureProjectFolderName(project.id).then((resolvedFolderName) => {
      if (!disposed) setFolderName(resolvedFolderName);
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
    setLoading(true);
    try {
      const [nextRecords, nextFolders] = await Promise.all([
        service.listAssets(folderName),
        service.listLocalFolders(folderName),
      ]);
      setRecords(nextRecords);
      setFolders(nextFolders);
    } catch (err) {
      dedupedToast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
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
  const flattened = reactExports.useMemo(
    () => flattenAssetTree(records, folders, effectiveExpanded),
    [records, folders, effectiveExpanded],
  );
  const rows = reactExports.useMemo(() => {
    if (!debouncedSearch) return flattened;
    const matched = new Set();
    for (const row of flattened) {
      if (row.name.toLowerCase().includes(debouncedSearch)) {
        matched.add(
          row.kind === "folder"
            ? `folder:${row.rel}`
            : `file:${row.record?.id ?? ""}`,
        );
        const parts = row.rel.split("/").filter(Boolean);
        for (let pathSegmentIndex = 1; pathSegmentIndex < parts.length; pathSegmentIndex++) {
          matched.add(`folder:${parts.slice(0, pathSegmentIndex).join("/")}`);
        }
      }
    }
    return flattened.filter((row) =>
      matched.has(
        row.kind === "folder"
          ? `folder:${row.rel}`
          : `file:${row.record?.id ?? ""}`,
      ),
    );
  }, [flattened, debouncedSearch]);
  const toggleFolder = reactExports.useCallback((rel) => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(rel)) next.delete(rel);
      else next.add(rel);
      return next;
    });
  }, []);
  const absoluteFor = reactExports.useCallback(
    (record) => (assetsDir ? `${assetsDir}/${record.relPath}` : void 0),
    [assetsDir],
  );
  const thumbSrcFor = reactExports.useCallback(
    (record, displayWidth) => {
      const absolute = absoluteFor(record);
      if (!absolute) return void 0;
      const typeBucket = resolveTypeBucket({
        kind: "file",
        name: record.name,
        mime: record.mime,
      });
      if (
        typeBucket !== "image" &&
        typeBucket !== "video" &&
        typeBucket !== "audio"
      ) {
        return void 0;
      }
      return withThumbnail(
        gatewayUrl(API_PATHS.serveLocal(absolute)),
        displayWidth,
      );
    },
    [absoluteFor, gatewayUrl],
  );
  const dragItemFor = reactExports.useCallback(
    (record) => {
      const absolute = absoluteFor(record);
      if (!absolute || !folderName) return void 0;
      return {
        ...buildResourceDragItem(
          absolute,
          record.relPath,
          record.name,
          false,
          void 0,
          {
            assetId: record.id,
            projectFolderName: folderName,
          },
        ),
        external: true,
      };
    },
    [absoluteFor, folderName],
  );
  const anchorForWorkspace = reactExports.useCallback(
    async (record) => {
      const absolute = absoluteFor(record);
      if (!absolute || !folderName) return void 0;
      try {
        const [anchored] = await anchorProjectAssets([
          {
            path: absolute,
            assetId: record.id,
            projectFolderName: folderName,
          },
        ]);
        if (!anchored) throw new Error("anchor returned no rows");
        return anchored;
      } catch (err) {
        projectLog.error("project-asset-anchor-failed", {
          assetId: record.id,
          name: record.name,
          message: err instanceof Error ? err.message : String(err),
        });
        dedupedToast.error(
          translate("localAssets.importFailed", {
            name: record.name,
          }),
        );
        return void 0;
      }
    },
    [absoluteFor, anchorProjectAssets, folderName, translate],
  );
  const handleAddToCanvas = reactExports.useCallback(
    (record) => {
      const item = dragItemFor(record);
      if (!item) return;
      workspaceEvents.fireAddToCanvas([item]);
    },
    [dragItemFor],
  );
  const handleAddToAgent = reactExports.useCallback(
    async (record) => {
      const anchored = await anchorForWorkspace(record);
      if (anchored) workspaceEvents.fireAddToChat(anchored.path, record.name);
    },
    [anchorForWorkspace],
  );
  const handleReveal = reactExports.useCallback(
    async (record) => {
      if (!folderName) return;
      const absolute = await service.getAssetAbsolutePath(
        folderName,
        record.id,
      );
      if (!absolute || !platform.shell.showItemInFolder) {
        dedupedToast.error(
          translate("localAssets.openFailed", {
            name: record.name,
          }),
        );
        void refresh();
        return;
      }
      await platform.shell.showItemInFolder(absolute);
    },
    [folderName, platform.shell, refresh, service, translate],
  );
  const handleRevealFolder = reactExports.useCallback(
    async (row) => {
      const absolute = assetsDir ? `${assetsDir}/${row.rel}` : void 0;
      if (!absolute || !platform.shell.showItemInFolder) {
        dedupedToast.error(
          translate("localAssets.openFailed", {
            name: row.name,
          }),
        );
        void refresh();
        return;
      }
      await platform.shell.showItemInFolder(absolute);
    },
    [assetsDir, platform.shell, refresh, translate],
  );
  const handleDelete = reactExports.useCallback(
    async (row) => {
      if (!folderName) return;
      if (row.kind === "folder") {
        await service.deleteLocalFolder(folderName, row.rel.split("/"));
      } else if (row.record) {
        await service.deleteLocalAsset(folderName, row.record.id);
      }
      void refresh();
    },
    [folderName, refresh, service],
  );
  const handleRename = reactExports.useCallback(
    async (_node, newName) => {
      if (!folderName || !renameTarget) return;
      if (renameTarget.kind === "folder") {
        await service.renameLocalFolder(
          folderName,
          renameTarget.rel.split("/"),
          newName,
        );
      } else if (renameTarget.record) {
        await service.renameLocalAsset(
          folderName,
          renameTarget.record.id,
          newName,
        );
      }
      void refresh();
    },
    [folderName, refresh, renameTarget, service],
  );
  const handleCreateFolder = reactExports.useCallback(
    async (newFolderName) => {
      if (!folderName) return;
      await service.createLocalFolder(folderName, [newFolderName]);
      void refresh();
    },
    [folderName, refresh, service],
  );
  const handleUploadPicked = reactExports.useCallback(
    async (files) => {
      if (!folderName || files.length === 0) return;
      if (
        await importPickedFiles({
          service,
          folderName,
          folderSegments: [],
          files,
          t: translate,
        })
      ) {
        void refresh();
      }
    },
    [folderName, refresh, service, translate],
  );
  const handleMove = reactExports.useCallback(
    async (row, target) => {
      if (!folderName) return;
      try {
        if (row.kind === "folder") {
          await service.moveLocalFolder(
            folderName,
            row.rel.split("/"),
            target.segments,
          );
        } else if (row.record) {
          await service.moveLocalAsset(
            folderName,
            row.record.id,
            target.segments,
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        dedupedToast.error(
          message.includes("duplicate_name")
            ? translate("localAssets.moveDuplicate")
            : message.includes("depth_exceeded")
              ? translate("localAssets.folderDepthLimit", {
                  count: PROJECT_ASSET_MAX_VISIBLE_FOLDER_LEVELS,
                })
              : message,
        );
      }
      void refresh();
    },
    [folderName, refresh, service, translate],
  );
  const canDropRow = reactExports.useCallback((row, target) => {
    if (target.key === relParent(row.rel)) return false;
    if (
      row.kind === "folder" &&
      (target.key === row.rel || target.key.startsWith(`${row.rel}/`))
    ) {
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
            if (item)
              event.dataTransfer.setData(
                RESOURCE_DRAG_MIME,
                JSON.stringify([item]),
              );
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
        moveDialogTarget?.kind === "folder"
          ? moveDialogTarget.rel.split("/")
          : void 0,
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
    <div
      className="flex h-full min-h-0 flex-col"
      data-action-ui-id="project-assets-sidebar.panel"
    >
      <section
        {...externalDropProps}
        aria-label={translate("projectAssets.title")}
        data-action-ui-id="project-assets-sidebar.drop-area"
        className={cn(
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
                title: translate("fileExplorer.noMatchingFiles"),
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
                key={
                  row.kind === "folder"
                    ? `folder:${row.rel}`
                    : `file:${row.record?.id ?? ""}`
                }
                row={row}
                expanded={row.kind === "folder" && expanded.has(row.rel)}
                thumbSrc={
                  row.record
                    ? thumbSrcFor(row.record, GRID_THUMBNAIL_DISPLAY_WIDTH)
                    : void 0
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
                onDelete={(record) =>
                  setDeleteTarget({
                    kind: "file",
                    rel: row.rel,
                    name: record.name,
                    depth: row.depth,
                    record,
                  })
                }
                {...rowDnd(row)}
              />
            ) : null,
          )
        )}
      </section>
      <div className="flex shrink-0 items-center gap-1 border-t border-border p-2">
        <Button
          type="button"
          size="sm"
          disabled={!folderName}
          onClick={() => setNewFolderOpen(true)}
          className="h-8 flex-1 justify-center gap-1 rounded-md text-[12px] font-medium"
          data-action-ui-id="project-assets-sidebar.new-folder"
        >
          <FolderPlus size={14} strokeWidth={1.5} />
          {translate("localAssets.newFolder")}
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
          {translate("localAssets.upload")}
        </Button>
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
          if (deleteTarget) await handleDelete(deleteTarget);
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
