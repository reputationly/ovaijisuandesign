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
      .sort(
        (a2, b3) =>
          (b3.updatedAt ?? b3.createdAt) - (a2.updatedAt ?? a2.createdAt),
      );
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
  const Chevron2 = expanded ? ChevronDown : ChevronRight;
  const cardClassName = cn(
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
  const Chevron2 = expanded ? ChevronDown : ChevronRight;
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
            <Chevron2
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
            <AssetRowThumb
              thumbSrc={thumbSrc}
              filename={record2.name}
              mime={record2.mime}
            />
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
        <ContextMenuItem
          onClick={onRename}
          data-action-ui-id="project-assets-sidebar.file-rename"
        >
          <PencilIcon size={14} strokeWidth={1.5} />
          {t2("localAssets.rename")}
        </ContextMenuItem>
        <ContextMenuItem onClick={onMove}>
          <FolderInput size={14} strokeWidth={1.5} />
          {t2("localAssets.moveTo")}
        </ContextMenuItem>
        <ContextMenuItem
          variant="destructive"
          onClick={() => onDelete(record2)}
        >
          <Trash2 size={14} strokeWidth={1.5} />
          {t2("localAssets.delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
export function LocalAssetsSidebarPanel({
  project: project2,
  onToolbarStateChange,
  searchQuery,
}) {
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
    const id2 = setTimeout(
      () => setDebouncedSearch((searchQuery ?? "").trim().toLowerCase()),
      200,
    );
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
        matched.add(
          row.kind === "folder"
            ? `folder:${row.rel}`
            : `file:${row.record?.id ?? ""}`,
        );
        const parts = row.rel.split("/").filter(Boolean);
        for (let i2 = 1; i2 < parts.length; i2++) {
          matched.add(`folder:${parts.slice(0, i2).join("/")}`);
        }
      }
    }
    return flattened2.filter((row) =>
      matched.has(
        row.kind === "folder"
          ? `folder:${row.rel}`
          : `file:${row.record?.id ?? ""}`,
      ),
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
      if (
        typeBucket !== "image" &&
        typeBucket !== "video" &&
        typeBucket !== "audio"
      ) {
        return void 0;
      }
      return withThumbnail(
        gatewayUrl2(API_PATHS.serveLocal(absolute)),
        displayWidth,
      );
    },
    [absoluteFor, gatewayUrl2],
  );
  const dragItemFor = reactExports.useCallback(
    (record2) => {
      const absolute = absoluteFor(record2);
      if (!absolute || !folderName) return void 0;
      return {
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
      const absolute = await service2.getAssetAbsolutePath(
        folderName,
        record2.id,
      );
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
        await service2.renameLocalFolder(
          folderName,
          renameTarget.rel.split("/"),
          newName,
        );
      } else if (renameTarget.record) {
        await service2.renameLocalAsset(
          folderName,
          renameTarget.record.id,
          newName,
        );
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
          await service2.moveLocalFolder(
            folderName,
            row.rel.split("/"),
            target.segments,
          );
        } else if (row.record) {
          await service2.moveLocalAsset(
            folderName,
            row.record.id,
            target.segments,
          );
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
        aria-label={t2("projectAssets.title")}
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
        <Button
          type="button"
          size="sm"
          disabled={!folderName}
          onClick={() => setNewFolderOpen(true)}
          className="h-8 flex-1 justify-center gap-1 rounded-md text-[12px] font-medium"
          data-action-ui-id="project-assets-sidebar.new-folder"
        >
          <FolderPlus size={14} strokeWidth={1.5} />
          {t2("localAssets.newFolder")}
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
          {t2("localAssets.upload")}
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
