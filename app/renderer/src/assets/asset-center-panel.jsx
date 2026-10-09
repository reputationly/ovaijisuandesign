// asset-center-panel.jsx
import { jsxRuntimeExports, useTranslation, reactExports, dedupedToast, API_PATHS, ChevronRight$1, useCurrentWorkspace, X$7, Search, classifyFileType, Plus, FolderInput$2 } from "../vendor.js";
import { useEntities } from "./check-cloud-asset-upload.js";
import { FileTypeIcon } from "../infra/create-recently-added-store.jsx";
import { withThumbnail } from "../workspace/deferred-thumbnail-image-generation.jsx";
import { TooltipProvider, Tooltip, TooltipTrigger, DropdownMenu, MoreVerticalIcon } from "../vendor-inline/vscode-base/graph.jsx";
import { Download, Trash2 } from "../media-editing/parse-item.jsx";
import { useStableCallback } from "./use-entity-hover-preview.js";
import { workspaceEvents, ContextMenu } from "../workspace/use-hub-logo-hover-animation.jsx";
import { useGatewayUrl } from "../generation/use-resizable-width.js";
import {
  cn$2,
  TooltipContent,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../infra/use-browser-overlay-dialog-props.jsx";
import {
  PageStateBoundary,
  formatAssetCenterError,
} from "./page-state-boundary.jsx";
import { RetryIcon, PencilIcon, StrokeIcon } from "../workspace/browser-inspiration-urls.jsx";
import { MediaLightbox } from "./image-lightbox.jsx";
import {
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "../workspace/new-workspace-dialog.jsx";
import { AddToChatIcon } from "../canvas/generating-media-area.jsx";
import { writeEntityDragData, useExportEntityUrl } from "../infra/use-online.jsx";
import { useMaterializeEntity } from "./use-materialize-entity.js";
import { trackAssetUse, useMaterializedEntities } from "./asset-mention-list.jsx";
import {
  EntityEditDialog,
  EntityDeleteConfirm,
} from "./entity-edit-dialog.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  AudioLightbox,
  COMPACT_MENU_ITEM_CLASS,
  EntityHoverPreviewHost,
  EntityTypeIcon,
  ProjectSidebarCategoryChips,
  THUMB_PX$1,
  TYPE_CHIPS,
  TextLightbox,
} from "./team-assets-sidebar-panel.jsx";
function EntityThumb({ entity }) {
  const gatewayUrl2 = useGatewayUrl();
  const [errored, setErrored] = reactExports.useState(false);
  const wrapperCls =
    "flex-shrink-0 flex items-center justify-center bg-muted overflow-hidden text-muted-foreground rounded-[4px]";
  const wrapperStyle2 = {
    width: THUMB_PX$1,
    height: THUMB_PX$1,
  };
  const previewUrl = entity.coverUrl ?? entity.thumbnailUrl;
  const resolvedUrl = previewUrl ? withThumbnail(gatewayUrl2(previewUrl), THUMB_PX$1) : void 0;
  const fallbackKind = entity.primaryAttachmentKind;
  if (!resolvedUrl || errored) {
    return (
      <span className={wrapperCls} style={wrapperStyle2}>
        {fallbackKind ? (
          <FileTypeIcon
            {...(fallbackKind === "document"
              ? {
                  category: "document",
                  recognition: "known",
                  typeLabel: "FILE",
                }
              : classifyFileType({
                  mediaKind: fallbackKind,
                }))}
            size={24}
            decorative={true}
          />
        ) : (
          <EntityTypeIcon type={entity.type} />
        )}
      </span>
    );
  }
  return (
    <span className={wrapperCls} style={wrapperStyle2}>
      <img
        src={resolvedUrl}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="w-full h-full object-contain"
        onError={() => setErrored(true)}
      />
    </span>
  );
}
function EntityGridCover({ entity }) {
  const gatewayUrl2 = useGatewayUrl();
  const [errored, setErrored] = reactExports.useState(false);
  const previewUrl = entity.coverUrl ?? entity.thumbnailUrl;
  const resolvedUrl = previewUrl ? withThumbnail(gatewayUrl2(previewUrl), 240) : void 0;
  const fallbackKind = entity.primaryAttachmentKind;
  if (!resolvedUrl || errored) {
    return (
      <span className="flex h-full w-full items-center justify-center text-muted-foreground">
        {fallbackKind ? (
          <FileTypeIcon
            {...(fallbackKind === "document"
              ? {
                  category: "document",
                  recognition: "known",
                  typeLabel: "FILE",
                }
              : classifyFileType({
                  mediaKind: fallbackKind,
                }))}
            size={48}
            decorative={true}
          />
        ) : (
          <EntityTypeIcon type={entity.type} />
        )}
      </span>
    );
  }
  return (
    <img
      src={resolvedUrl}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      className="h-full w-full object-cover"
      onError={() => setErrored(true)}
    />
  );
}
const EntityRow = reactExports.memo(function EntityRow2({
  entity,
  workspacePath,
  isMaterialized,
  isHighlighted,
  onHoverIntent,
  onHoverEnd,
  onEdit,
  onDelete,
  onExport,
  layout = "row",
}) {
  const { t: t2 } = useTranslation();
  const materializeMutation = useMaterializeEntity();
  const canMaterialize = workspacePath.length > 0;
  const handleMaterialize = (e2) => {
    e2.stopPropagation();
    e2.preventDefault();
    if (!canMaterialize || materializeMutation.isPending) return;
    void materializeMutation
      .mutateAsync({
        entityId: entity.id,
        input: {
          workspacePath,
        },
        _track: {
          entity_type: entity.type,
          trigger: "context_menu",
        },
      })
      .then(() => {
        dedupedToast.success(
          t2("assetSidebarPanel.materializeSuccess", {
            name: entity.name,
          }),
        );
      })
      .catch((err) => {
        const message2 = err instanceof Error ? err.message : String(err);
        dedupedToast.error(
          t2("assetSidebarPanel.materializeError", {
            message: message2,
          }),
        );
      });
  };
  const ensureMaterialized = async () => {
    if (isMaterialized) return true;
    if (!canMaterialize) return false;
    try {
      await materializeMutation.mutateAsync({
        entityId: entity.id,
        input: {
          workspacePath,
        },
        _track: {
          entity_type: entity.type,
          trigger: "auto_before_use",
        },
      });
      return true;
    } catch {
      return false;
    }
  };
  const addToCanvas = async () => {
    if (await ensureMaterialized()) {
      workspaceEvents.fireAddEntityToCanvas(entity.id);
      trackAssetUse({
        entity_id: entity.id,
        entity_type: entity.type,
        target: "canvas",
        via: "context_menu",
        source_panel: "canvas_sidebar",
        was_materialized: isMaterialized,
      });
    }
  };
  const addToChat = async () => {
    if (await ensureMaterialized()) {
      workspaceEvents.fireAddEntityToChat(entity.id, entity.name, entity.type);
      trackAssetUse({
        entity_id: entity.id,
        entity_type: entity.type,
        target: "chat",
        via: "context_menu",
        source_panel: "canvas_sidebar",
        was_materialized: isMaterialized,
      });
    }
  };
  const commonLiProps = {
    onPointerEnter: (e2) => onHoverIntent(entity.id, e2.currentTarget),
    onPointerLeave: onHoverEnd,
    draggable: true,
    onDragStart: (e2) =>
      writeEntityDragData(e2, {
        entityId: entity.id,
        name: entity.name,
        type: entity.type,
        ...(entity.coverUrl || entity.thumbnailUrl
          ? {
              thumbnailUrl: entity.coverUrl ?? entity.thumbnailUrl,
            }
          : {}),
      }),
    "data-action-ui-id": "canvas-sidebar-asset-center.entity",
    "data-entity-id": entity.id,
  };
  const actionButtons = (
    <>
      <Tooltip>
        <TooltipTrigger
          onClick={(e2) => {
            e2.stopPropagation();
            e2.preventDefault();
            void addToCanvas();
          }}
          className="inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          data-action-ui-id="canvas-sidebar-asset-center.addToCanvas"
        >
          <StrokeIcon icon={Plus} size={14} />
        </TooltipTrigger>
        <TooltipContent>{t2("fileExplorer.addToCanvas")}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          onClick={(e2) => {
            e2.stopPropagation();
            e2.preventDefault();
            void addToChat();
          }}
          className="inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          data-action-ui-id="canvas-sidebar-asset-center.addToChat"
        >
          <StrokeIcon icon={AddToChatIcon} size={14} viewBoxSize={20} />
        </TooltipTrigger>
        <TooltipContent>{t2("fileExplorer.addToChat")}</TooltipContent>
      </Tooltip>
    </>
  );
  const moreMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e2) => {
          e2.stopPropagation();
          e2.preventDefault();
        }}
        onMouseDown={(e2) => e2.stopPropagation()}
        className="inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        data-action-ui-id="canvas-sidebar-asset-center.more"
        aria-label={t2("common.more", "More")}
      >
        <MoreVerticalIcon size={14} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" sideOffset={2}>
        <DropdownMenuItem
          onClick={(e2) => {
            e2.stopPropagation();
            onEdit(entity.id);
          }}
          data-action-ui-id="canvas-sidebar-asset-center.more.edit"
        >
          <StrokeIcon icon={PencilIcon} size={14} className="mr-1.5" />
          {t2("workspace.materializedEntities.entity.edit", "Edit")}
        </DropdownMenuItem>
        {canMaterialize && !isMaterialized && (
          <DropdownMenuItem
            onClick={(e2) => {
              e2.stopPropagation();
              handleMaterialize(e2);
            }}
            disabled={materializeMutation.isPending}
            data-action-ui-id="canvas-sidebar-asset-center.more.materialize"
          >
            <StrokeIcon icon={FolderInput$2} size={14} className="mr-1.5" />
            {t2("assetSidebarPanel.materialize")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={(e2) => {
            e2.stopPropagation();
            onExport(entity);
          }}
          data-action-ui-id="canvas-sidebar-asset-center.more.export"
        >
          <StrokeIcon icon={Download} size={14} className="mr-1.5" />
          {t2("assetCenter.card.exportTooltip")}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={(e2) => {
            e2.stopPropagation();
            onDelete(entity);
          }}
          data-action-ui-id="canvas-sidebar-asset-center.more.delete"
        >
          <StrokeIcon icon={Trash2} size={14} className="mr-1.5" />
          {t2("assetCenter.card.deleteAction")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const rowContent = (
    <>
      <EntityThumb entity={entity} />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[13px] font-medium truncate text-foreground/70">{entity.name}</span>
        {entity.description && (
          <span className="text-[11px] text-muted-foreground truncate">{entity.description}</span>
        )}
      </div>
      <span className="absolute right-1 top-1 bottom-1 flex items-center gap-1 rounded-md px-1 opacity-0 transition-opacity group-hover:opacity-100">
        {actionButtons}
        {moreMenu}
      </span>
    </>
  );
  const gridContent = (
    <>
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
        <EntityGridCover entity={entity} />
        <span className="absolute right-1 top-1 flex items-center gap-1 rounded-md bg-background/70 backdrop-blur px-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {actionButtons}
        </span>
      </div>
      <div className="mt-1 flex items-start gap-1">
        <span
          className="line-clamp-2 flex-1 min-w-0 text-[12px] font-medium leading-4 text-foreground/80"
          title={entity.name}
        >
          {entity.name}
        </span>
        <span className="-my-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
          {moreMenu}
        </span>
      </div>
    </>
  );
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          layout === "grid" ? (
            <li
              {...commonLiProps}
              className={cn$2(
                "group relative flex flex-col select-none cursor-grab active:cursor-grabbing rounded-md p-1 transition-colors",
                isHighlighted ? "bg-foreground/[0.12]" : "hover:bg-foreground/5",
              )}
            />
          ) : (
            <li
              {...commonLiProps}
              className={cn$2(
                "list-row-hit-area group relative mx-2 flex h-12 w-[calc(100%-1rem)] items-center gap-2 rounded-md py-2 pl-2 pr-14 transition-colors select-none cursor-grab active:cursor-grabbing",
                isHighlighted ? "bg-foreground/[0.12]" : "hover:bg-foreground/5",
              )}
            />
          )
        }
      >
        {layout === "grid" ? gridContent : rowContent}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          className={COMPACT_MENU_ITEM_CLASS}
          onClick={() => onEdit(entity.id)}
          data-action-ui-id="canvas-sidebar-asset-center.edit"
        >
          <StrokeIcon icon={PencilIcon} size={14} className="mr-1.5" />
          {t2("workspace.materializedEntities.entity.edit", "Edit")}
        </ContextMenuItem>
        <ContextMenuItem className={COMPACT_MENU_ITEM_CLASS} onClick={() => void addToCanvas()}>
          <StrokeIcon icon={Plus} size={14} className="mr-1.5" />
          {t2("fileExplorer.addToCanvas")}
        </ContextMenuItem>
        <ContextMenuItem className={COMPACT_MENU_ITEM_CLASS} onClick={() => void addToChat()}>
          <StrokeIcon icon={AddToChatIcon} size={14} viewBoxSize={20} className="mr-1.5" />
          {t2("fileExplorer.addToChat")}
        </ContextMenuItem>
        {canMaterialize && !isMaterialized && (
          <ContextMenuItem
            className={COMPACT_MENU_ITEM_CLASS}
            onClick={handleMaterialize}
            disabled={materializeMutation.isPending}
          >
            <StrokeIcon icon={FolderInput$2} size={14} className="mr-1.5" />
            {t2("assetSidebarPanel.materialize")}
          </ContextMenuItem>
        )}
        <ContextMenuItem
          className={COMPACT_MENU_ITEM_CLASS}
          onClick={() => onExport(entity)}
          data-action-ui-id="canvas-sidebar-asset-center.export"
        >
          <StrokeIcon icon={Download} size={14} className="mr-1.5" />
          {t2("assetCenter.card.exportTooltip")}
        </ContextMenuItem>
        <ContextMenuItem
          className={COMPACT_MENU_ITEM_CLASS}
          variant="destructive"
          onClick={() => onDelete(entity)}
          data-action-ui-id="canvas-sidebar-asset-center.delete"
        >
          <StrokeIcon icon={Trash2} size={14} className="mr-1.5" />
          {t2("assetCenter.card.deleteAction")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});
const SearchInput = reactExports.memo(function SearchInput2({ onDebouncedChange }) {
  const { t: t2 } = useTranslation();
  const inputRef = reactExports.useRef(null);
  const debounceRef = reactExports.useRef(null);
  const [hasValue, setHasValue] = reactExports.useState(false);
  const scheduleDebounce = useStableCallback((raw2) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onDebouncedChange(raw2.trim()), 200);
  });
  const handleInput = (e2) => {
    const next2 = e2.currentTarget.value;
    scheduleDebounce(next2);
    const nextHas = next2.trim().length > 0;
    setHasValue((prev) => (prev === nextHas ? prev : nextHas));
  };
  const handleClear = () => {
    if (inputRef.current) inputRef.current.value = "";
    scheduleDebounce("");
    setHasValue(false);
    inputRef.current?.focus();
  };
  reactExports.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);
  return (
    <div className="group flex shrink-0 px-2 pb-3">
      <div
        className="flex h-9 w-full items-center gap-1.5 rounded-md border border-transparent bg-muted px-2.5 text-muted-foreground transition-colors focus-within:border-border-strong focus-within:bg-card focus-within:text-foreground"
        data-action-ui-id="canvas-sidebar-asset-center.search-row"
      >
        <StrokeIcon icon={Search} size={16} />
        <input
          ref={inputRef}
          type="text"
          data-action-ui-id="canvas-sidebar-asset-center.search"
          className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
          placeholder={t2("assetSidebarPanel.searchPlaceholder")}
          defaultValue=""
          onInput={handleInput}
        />
        <button
          type="button"
          aria-label={t2("assetSidebarPanel.clearSearch", {
            defaultValue: "Clear search",
          })}
          onClick={handleClear}
          tabIndex={hasValue ? 0 : -1}
          className={cn$2(
            "inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-foreground/[0.05] hover:text-foreground",
            hasValue ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          data-action-ui-id="canvas-sidebar-asset-center.search-clear"
        >
          <StrokeIcon icon={X$7} size={12} />
        </button>
      </div>
    </div>
  );
});
export function AssetCenterPanel({
  viewMode = "tree",
  onRegisterRefresh,
  externalSearchQuery,
  sortKey = "updated_at",
} = {}) {
  const { t: t2 } = useTranslation();
  const workspacePath = useCurrentWorkspace();
  const gatewayUrl2 = useGatewayUrl();
  const [editingEntityId, setEditingEntityId] = reactExports.useState(null);
  const [deleteTarget, setDeleteTarget] = reactExports.useState(null);
  const buildExportUrl = useExportEntityUrl();
  const openEdit = useStableCallback((entityId) => setEditingEntityId(entityId));
  const closeEdit = reactExports.useCallback(() => setEditingEntityId(null), []);
  const handleDelete2 = useStableCallback((entity) => setDeleteTarget(entity));
  const closeDelete = reactExports.useCallback(() => setDeleteTarget(null), []);
  const handleExport = useStableCallback((entity) => {
    const url2 = buildExportUrl(entity.id);
    if (!url2) return;
    const a2 = document.createElement("a");
    a2.href = url2;
    a2.rel = "noopener";
    document.body.appendChild(a2);
    a2.click();
    a2.remove();
  });
  const [internalDebouncedSearch, setInternalDebouncedSearch] = reactExports.useState("");
  const externalControlled = externalSearchQuery !== void 0;
  reactExports.useEffect(() => {
    if (!externalControlled) return;
    const id2 = setTimeout(() => {
      setInternalDebouncedSearch(externalSearchQuery.trim());
    }, 200);
    return () => clearTimeout(id2);
  }, [externalControlled, externalSearchQuery]);
  const debouncedSearch = internalDebouncedSearch;
  const setDebouncedSearch = setInternalDebouncedSearch;
  const [typeFilter, setTypeFilter] = reactExports.useState("all");
  const [lightbox, setLightbox] = reactExports.useState(null);
  const [highlightedEntityId, setHighlightedEntityId] = reactExports.useState(null);
  const [pinnedOpen, setPinnedOpen] = reactExports.useState(true);
  const [allOpen, setAllOpen] = reactExports.useState(true);
  const highlightTimerRef = reactExports.useRef(null);
  const applyHighlight = useStableCallback((entityId) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedEntityId(entityId);
    highlightTimerRef.current = setTimeout(() => setHighlightedEntityId(null), 3e4);
  });
  const clearHighlight = useStableCallback(() => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    setHighlightedEntityId(null);
  });
  const hostRef = reactExports.useRef(null);
  const handleRowHoverIntent = useStableCallback((entityId, anchor) => {
    clearHighlight();
    hostRef.current?.notifyHoverIntent(entityId, anchor);
  });
  const handleRowHoverEnd = useStableCallback(() => {
    hostRef.current?.notifyHoverEnd();
  });
  const handlePreviewAttachment = useStableCallback((entityId, att) => {
    const path2 =
      att.kind === "video"
        ? API_PATHS.assetCenterAttachmentPlayback(att.id)
        : API_PATHS.assetCenterAttachmentBlob(att.id);
    const src = gatewayUrl2(path2);
    if (!src) return;
    if (att.kind === "document") return;
    setLightbox({
      kind: att.kind,
      src,
      alt: att.originalFilename,
      entityId,
    });
  });
  const handleLightboxClose = useStableCallback(() => {
    if (lightbox) applyHighlight(lightbox.entityId);
    setLightbox(null);
  });
  const materializeMutation = useMaterializeEntity();
  const ensureEntityAnchored = useStableCallback(async (entityId) => {
    if (!workspacePath) return null;
    try {
      return await materializeMutation.mutateAsync({
        entityId,
        input: {
          workspacePath,
        },
        _track: {
          trigger: "auto_before_use",
        },
      });
    } catch {
      return null;
    }
  });
  const handleHoverAddToCanvas = useStableCallback((att) => {
    workspaceEvents.fireAddEntityToCanvas(att.entityId, {
      attachmentIds: [att.id],
    });
    trackAssetUse({
      entity_id: att.entityId,
      entity_type: "custom",
      target: "canvas",
      via: "hover_button",
      source_panel: "canvas_sidebar",
      was_materialized: false,
    });
  });
  const handleHoverAddToChat = useStableCallback(async (att) => {
    try {
      const anchored = await ensureEntityAnchored(att.entityId);
      if (!anchored) {
        dedupedToast.error(
          t2("assetSidebarPanel.addToChatError", {
            message: t2("assetSidebarPanel.addToChatErrorNoWorkspace", "当前没有可用的工作区"),
          }),
        );
        return;
      }
      const match2 = anchored.agentPayload.attachments.find((a2) => a2.id === att.id);
      if (!match2) {
        dedupedToast.error(
          t2("assetSidebarPanel.addToChatError", {
            message: t2("assetSidebarPanel.addToChatErrorAttachmentNotFound", "未找到该附件"),
          }),
        );
        return;
      }
      workspaceEvents.fireAddToChat(match2.path, match2.filename);
      trackAssetUse({
        entity_id: att.entityId,
        entity_type: "custom",
        target: "chat",
        via: "hover_button",
        source_panel: "canvas_sidebar",
        was_materialized: false,
      });
    } catch (err) {
      const message2 = err instanceof Error ? err.message : String(err);
      dedupedToast.error(
        t2("assetSidebarPanel.addToChatError", {
          message: message2,
        }),
      );
    }
  });
  reactExports.useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);
  const listOpts = reactExports.useMemo(() => {
    const opts = {
      sort: sortKey,
    };
    if (typeFilter !== "all") opts.type = typeFilter;
    if (debouncedSearch) opts.q = debouncedSearch;
    return opts;
  }, [typeFilter, debouncedSearch, sortKey]);
  const entitiesQuery = useEntities(listOpts);
  const entities = entitiesQuery.data ?? [];
  const materializedQuery = useMaterializedEntities();
  const refresh = useStableCallback(() => {
    void entitiesQuery.refetch();
    void materializedQuery.refetch();
  });
  reactExports.useEffect(() => {
    onRegisterRefresh?.(refresh);
  }, [onRegisterRefresh, refresh]);
  const materializedIds = reactExports.useMemo(() => {
    const list2 = materializedQuery.data ?? [];
    return new Set(list2.map((e2) => e2.entityId));
  }, [materializedQuery.data]);
  const materializedOrder = reactExports.useMemo(() => {
    return (materializedQuery.data ?? []).map((e2) => e2.entityId);
  }, [materializedQuery.data]);
  const sortedEntities = reactExports.useMemo(() => {
    if (materializedIds.size === 0) return entities;
    const pinned = [];
    const rest = [];
    for (const e2 of entities) {
      if (materializedIds.has(e2.id)) pinned.push(e2);
      else rest.push(e2);
    }
    return [...pinned, ...rest];
  }, [entities, materializedIds]);
  const typeChipOptions = reactExports.useMemo(
    () =>
      TYPE_CHIPS.map((chip) => ({
        value: chip,
        label: t2(`assetCenter.types.${chip}`),
        actionId: `canvas-sidebar-asset-center.chip-${chip}`,
      })),
    [t2],
  );
  const entityById = reactExports.useMemo(() => {
    const map3 = new Map();
    for (const e2 of entities) map3.set(e2.id, e2);
    return map3;
  }, [entities]);
  const loadError = entitiesQuery.error ?? null;
  const isLoading = entitiesQuery.isPending;
  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      data-action-ui-id="canvas-sidebar-asset-center"
    >
      {externalControlled ? null : <SearchInput onDebouncedChange={setDebouncedSearch} />}
      {!(entities.length === 0 && typeFilter === "all" && debouncedSearch === "") && (
        <ProjectSidebarCategoryChips
          options={typeChipOptions}
          value={typeFilter}
          onChange={setTypeFilter}
          rowActionId="canvas-sidebar-asset-center.chip-row"
        />
      )}
      <TooltipProvider delay={200}>
        <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-none pt-1 pb-2">
          {loadError ? (
            <PageStateBoundary
              error={true}
              density="panel"
              className="h-full"
              errorOptions={{
                description: formatAssetCenterError(loadError, t2),
                retry: {
                  icon: <RetryIcon size={14} />,
                  onClick: refresh,
                },
              }}
            />
          ) : isLoading ? (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center select-none">
              {t2("common.loading")}
            </div>
          ) : entities.length === 0 ? (
            <PageStateBoundary
              empty={true}
              density="panel"
              className="h-full"
              emptyOptions={{
                title:
                  typeFilter === "all" && debouncedSearch === ""
                    ? t2("assetCenter.entityEmpty.title")
                    : t2(`assetSidebarPanel.emptyByType.${typeFilter}`),
                description:
                  typeFilter === "all" && debouncedSearch === ""
                    ? t2("assetSidebarPanel.emptyBody")
                    : void 0,
              }}
            />
          ) : (
            <ul className="flex flex-col">
              {materializedIds.size > 0 && (
                <>
                  <li
                    className="px-3 pt-1 pb-1 text-[11px] font-medium text-muted-foreground select-none flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => setPinnedOpen(!pinnedOpen)}
                    onKeyDown={(e2) => {
                      if (e2.key === "Enter" || e2.key === " ") setPinnedOpen(!pinnedOpen);
                    }}
                  >
                    <StrokeIcon
                      icon={ChevronRight$1}
                      size={12}
                      className={`transition-transform ${pinnedOpen ? "rotate-90" : ""}`}
                    />
                    {t2("assetSidebarPanel.materializedSection", "已添加至此项目的资产")}
                  </li>
                  {pinnedOpen && (
                    <li
                      className={
                        viewMode === "grid" ? "grid grid-cols-2 gap-2 px-2 pb-2" : "contents"
                      }
                    >
                      <ul className="contents">
                        {materializedOrder
                          .filter((eid) => entityById.has(eid))
                          .map((eid) => {
                            const entity = entityById.get(eid);
                            return (
                              <EntityRow
                                key={entity.id}
                                entity={entity}
                                workspacePath={workspacePath}
                                isMaterialized={true}
                                isHighlighted={highlightedEntityId === entity.id}
                                onHoverIntent={handleRowHoverIntent}
                                onHoverEnd={handleRowHoverEnd}
                                onEdit={openEdit}
                                onDelete={handleDelete2}
                                onExport={handleExport}
                                layout={viewMode === "grid" ? "grid" : "row"}
                              />
                            );
                          })}
                      </ul>
                    </li>
                  )}
                </>
              )}
              {sortedEntities.some((e2) => !materializedIds.has(e2.id)) && (
                <>
                  <li
                    className="px-3 pt-1 pb-1 text-[11px] font-medium text-muted-foreground select-none flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => setAllOpen(!allOpen)}
                    onKeyDown={(e2) => {
                      if (e2.key === "Enter" || e2.key === " ") setAllOpen(!allOpen);
                    }}
                  >
                    <StrokeIcon
                      icon={ChevronRight$1}
                      size={12}
                      className={`transition-transform ${allOpen ? "rotate-90" : ""}`}
                    />
                    {t2("assetSidebarPanel.allSection", "全部资产")}
                  </li>
                  {allOpen && (
                    <li
                      className={
                        viewMode === "grid" ? "grid grid-cols-2 gap-2 px-2 pb-2" : "contents"
                      }
                    >
                      <ul className="contents">
                        {sortedEntities
                          .filter((e2) => !materializedIds.has(e2.id))
                          .map((entity) => (
                            <EntityRow
                              key={entity.id}
                              entity={entity}
                              workspacePath={workspacePath}
                              isMaterialized={false}
                              isHighlighted={highlightedEntityId === entity.id}
                              onHoverIntent={handleRowHoverIntent}
                              onHoverEnd={handleRowHoverEnd}
                              onEdit={openEdit}
                              onDelete={handleDelete2}
                              onExport={handleExport}
                              layout={viewMode === "grid" ? "grid" : "row"}
                            />
                          ))}
                      </ul>
                    </li>
                  )}
                </>
              )}
            </ul>
          )}
        </div>
      </TooltipProvider>
      <EntityHoverPreviewHost
        ref={hostRef}
        onPreviewAttachment={handlePreviewAttachment}
        onAddToCanvas={handleHoverAddToCanvas}
        onAddToChat={handleHoverAddToChat}
      />
      {lightbox && lightbox.kind === "audio" && (
        <AudioLightbox src={lightbox.src} alt={lightbox.alt} onClose={handleLightboxClose} />
      )}
      {lightbox && lightbox.kind === "text" && (
        <TextLightbox src={lightbox.src} alt={lightbox.alt} onClose={handleLightboxClose} />
      )}
      {lightbox && (lightbox.kind === "image" || lightbox.kind === "video") && (
        <MediaLightbox
          kind={lightbox.kind}
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={handleLightboxClose}
        />
      )}
      <EntityEditDialog entityId={editingEntityId} onClose={closeEdit} />
      <EntityDeleteConfirm entity={deleteTarget} onClose={closeDelete} surface="canvas_sidebar" />
    </div>
  );
}
