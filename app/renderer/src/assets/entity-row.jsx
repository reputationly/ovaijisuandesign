// entity-row.jsx
import { classifyFileType, File$3 as File, FolderInput$2 as FolderInput, jsxRuntimeExports, Music$2 as Music, Plus, reactExports, useTranslation, Video$2 as Video } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  Download,
  ImageOutlineIcon,
  Trash2,
} from "../media-editing/package.jsx";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import { withThumbnail } from "../workspace/tool-label-definitions.js";
import { useGatewayUrl } from "../generation/use-model-catalog-scope-key.js";
import {
  DropdownMenu,
  MoreVerticalIcon,
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import {
  ContextMenu,
  workspaceEvents,
} from "../workspace/topbar-state-context.jsx";
import {
  cn$2 as cn,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import { PencilIcon } from "../workspace/home-service.jsx";
import { StrokeIcon } from "../workspace/use-prompt-icon.jsx";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../workspace/context-menu-content.jsx";
import { AddToChatIcon } from "../canvas/fullscreen-icon.jsx";
import { writeEntityDragData } from "../infra/use-online.jsx";
import { useMaterializeEntity } from "./use-materialize-entity.js";
import { trackAssetUse } from "./use-materialized-entities.jsx";
const THUMB_PX = 32;
const COMPACT_MENU_ITEM_CLASS =
  "gap-2 px-2.5 py-1.5 text-[11px] [&_svg:not([class*=size-])]:size-3.5";
function EntityTypeIcon({ type: type2 }) {
  if (type2 === "character")
    return <ImageOutlineIcon size={16} strokeWidth={1.67} />;
  if (type2 === "scene") return <Video size={16} />;
  if (type2 === "style_pack") return <Music size={16} />;
  return <File size={16} />;
}
function EntityThumb({ entity }) {
  const gatewayUrl2 = useGatewayUrl();
  const [errored, setErrored] = reactExports.useState(false);
  const wrapperCls =
    "flex-shrink-0 flex items-center justify-center bg-muted overflow-hidden text-muted-foreground rounded-[4px]";
  const wrapperStyle2 = {
    width: THUMB_PX,
    height: THUMB_PX,
  };
  const previewUrl = entity.coverUrl ?? entity.thumbnailUrl;
  const resolvedUrl = previewUrl
    ? withThumbnail(gatewayUrl2(previewUrl), THUMB_PX)
    : void 0;
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
  const resolvedUrl = previewUrl
    ? withThumbnail(gatewayUrl2(previewUrl), 240)
    : void 0;
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
export const EntityRow = reactExports.memo(function EntityRow2({
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
            <StrokeIcon icon={FolderInput} size={14} className="mr-1.5" />
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
        <span className="text-[13px] font-medium truncate text-foreground/70">
          {entity.name}
        </span>
        {entity.description && (
          <span className="text-[11px] text-muted-foreground truncate">
            {entity.description}
          </span>
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
              className={cn(
                "group relative flex flex-col select-none cursor-grab active:cursor-grabbing rounded-md p-1 transition-colors",
                isHighlighted
                  ? "bg-foreground/[0.12]"
                  : "hover:bg-foreground/5",
              )}
            />
          ) : (
            <li
              {...commonLiProps}
              className={cn(
                "list-row-hit-area group relative mx-2 flex h-12 w-[calc(100%-1rem)] items-center gap-2 rounded-md py-2 pl-2 pr-14 transition-colors select-none cursor-grab active:cursor-grabbing",
                isHighlighted
                  ? "bg-foreground/[0.12]"
                  : "hover:bg-foreground/5",
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
        <ContextMenuItem
          className={COMPACT_MENU_ITEM_CLASS}
          onClick={() => void addToCanvas()}
        >
          <StrokeIcon icon={Plus} size={14} className="mr-1.5" />
          {t2("fileExplorer.addToCanvas")}
        </ContextMenuItem>
        <ContextMenuItem
          className={COMPACT_MENU_ITEM_CLASS}
          onClick={() => void addToChat()}
        >
          <StrokeIcon
            icon={AddToChatIcon}
            size={14}
            viewBoxSize={20}
            className="mr-1.5"
          />
          {t2("fileExplorer.addToChat")}
        </ContextMenuItem>
        {canMaterialize && !isMaterialized && (
          <ContextMenuItem
            className={COMPACT_MENU_ITEM_CLASS}
            onClick={handleMaterialize}
            disabled={materializeMutation.isPending}
          >
            <StrokeIcon icon={FolderInput} size={14} className="mr-1.5" />
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
