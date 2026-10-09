// entity-list-row.jsx
import {
  FolderInput,
  Library,
  reactExports,
  useTranslation,
} from "../vendor.js";
import {
  assetCenterLog,
  DropdownMenu,
  MoreVerticalIcon,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { gatewayUrl } from "../infra/gateway-http-error.jsx";
import { withThumbnail } from "../workspace/tool-label-definitions.js";
import { Download, Trash2 } from "../media-editing/package.jsx";
import {
  trackAssetCenterAction,
  writeEntityDragData,
} from "../infra/use-online.jsx";
import { Badge } from "../infra/badge-variants.jsx";
import { Checkbox } from "../infra/checkbox.jsx";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  TooltipContent,
} from "../infra/dialog-content.jsx";

function formatRelativeTime(ts2, locale) {
  const diff = Date.now() - ts2;
  if (Number.isNaN(diff) || diff < 0) {
    return new Date(ts2).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });
  }
  const rtf = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
  });
  const minutes = Math.floor(diff / 6e4);
  if (minutes < 1) return rtf.format(0, "minute");
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 7) return rtf.format(-days, "day");
  return new Date(ts2).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
}

export function EntityListRow({
  entity,
  onClick,
  onMaterialize,
  onExport,
  onDelete,
  draggable,
  isLast,
  selected: selected2,
  onToggleSelect,
}) {
  const { t: t2, i18n } = useTranslation();
  const previewUrl = entity.coverUrl ?? entity.thumbnailUrl;
  const thumbnailSrc = previewUrl
    ? withThumbnail(gatewayUrl(previewUrl), 32)
    : void 0;
  reactExports.useEffect(() => {
    assetCenterLog.info("cover.list_preview_selected", {
      entityId: entity.id,
      source: entity.coverUrl
        ? "coverUrl"
        : entity.thumbnailUrl
          ? "thumbnailUrl"
          : "none",
      coverUrl: entity.coverUrl ?? null,
      thumbnailUrl: entity.thumbnailUrl ?? null,
      thumbnailSrc: thumbnailSrc ?? null,
    });
  }, [entity.id, entity.coverUrl, entity.thumbnailUrl, thumbnailSrc]);
  const handleDragStart = reactExports.useCallback(
    (e2) => {
      writeEntityDragData(e2, {
        entityId: entity.id,
        name: entity.name,
        type: entity.type,
        ...(previewUrl !== void 0
          ? {
              thumbnailUrl: previewUrl,
            }
          : {}),
      });
    },
    [entity.id, entity.name, entity.type, previewUrl],
  );
  const relative = formatRelativeTime(entity.updatedAt, i18n.language);
  return (
    // The row contains independent selection/actions; keep them out of a native button.
    // biome-ignore lint/a11y/useSemanticElements: independent controls require a non-button container.
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : void 0}
      data-action-ui-id="asset-center-entity-list-row"
      data-entity-id={entity.id}
      className={`group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors focus-visible:outline-none ${selected2 ? "bg-muted/50" : "hover:bg-muted/30 focus-visible:bg-muted/30"} ${isLast ? "" : "border-b border-border"} ${draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
    >
      {onToggleSelect && (
        // biome-ignore lint/a11y/noStaticElementInteractions: event boundary only; the child Checkbox owns all interaction semantics.
        <span
          className={`shrink-0 transition-opacity ${selected2 ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"}`}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={selected2}
            aria-label={`${t2("projectAssets.selectRow")}: ${entity.name}`}
            data-action-ui-id="asset-center-entity-list-row.select"
            onCheckedChange={() => onToggleSelect()}
          />
        </span>
      )}
      <div className="shrink-0 size-8 bg-muted rounded-[4px] flex items-center justify-center overflow-hidden">
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={entity.name}
            className="size-full object-contain"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <Library size={14} className="text-muted-foreground/40" />
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-xs font-medium truncate">{entity.name}</p>
          <Badge
            variant="secondary"
            className="shrink-0 text-[10px] h-5 px-1.5 rounded-[4px]"
          >
            {t2(`assetCenter.types.${entity.type}`)}
          </Badge>
        </div>
        {entity.description && (
          <p className="text-[11px] text-muted-foreground truncate">
            {entity.description}
          </p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span title={new Date(entity.updatedAt).toLocaleString()}>
          {t2("assetCenter.entityList.updatedAt", {
            when: relative,
          })}
        </span>
        {entity.useCount > 0 && (
          <span title={t2("assetCenter.useCountTooltip")}>
            {t2("assetCenter.useCount", {
              count: entity.useCount,
            })}
          </span>
        )}
        {(onExport || onMaterialize || onDelete) && (
          <TooltipProvider delay={300}>
            <div
              className="flex items-center gap-0.5"
              onClick={(e2) => e2.stopPropagation()}
              onMouseDown={(e2) => e2.stopPropagation()}
              onKeyDown={(e2) => e2.stopPropagation()}
              role="toolbar"
              aria-label={t2("assetCenter.entityList.rowActions", {
                defaultValue: "Row actions",
              })}
            >
              {onExport && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={(e2) => {
                          e2.stopPropagation();
                          onExport();
                        }}
                        data-action-ui-id="asset-center-entity-list-row-export"
                        className="inline-flex items-center justify-center size-7 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      />
                    }
                  >
                    <Download size={14} />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {t2("assetCenter.detail.export")}
                  </TooltipContent>
                </Tooltip>
              )}
              {onMaterialize && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={(e2) => {
                          e2.stopPropagation();
                          onMaterialize();
                        }}
                        data-action-ui-id="asset-center-entity-list-row-materialize-btn"
                        className="inline-flex items-center justify-center size-7 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      />
                    }
                  >
                    <FolderInput size={14} />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {t2("assetCenter.card.materializeTooltip")}
                  </TooltipContent>
                </Tooltip>
              )}
              {onDelete && (
                <DropdownMenu
                  onOpenChange={(open) => {
                    if (open) {
                      trackAssetCenterAction({
                        action: "more_menu_open",
                        surface: "asset_center_page",
                        entity_id: entity.id,
                        entity_type: entity.type,
                      });
                    }
                  }}
                >
                  <DropdownMenuTrigger
                    onClick={(e2) => e2.stopPropagation()}
                    onMouseDown={(e2) => e2.stopPropagation()}
                    data-action-ui-id="asset-center-entity-list-row-more"
                    className="inline-flex items-center justify-center size-7 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <MoreVerticalIcon size={14} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="bottom" sideOffset={2}>
                    <DropdownMenuItem
                      onClick={(e2) => {
                        e2.stopPropagation();
                        onDelete();
                      }}
                      data-action-ui-id="asset-center-entity-list-row-delete"
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 size={14} className="mr-1.5" />
                      {t2("assetCenter.card.deleteAction")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
