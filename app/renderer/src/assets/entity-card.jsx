// entity-card.jsx
import {
  FolderInput,
  Library,
  reactExports,
  useTranslation,
} from "../vendor.js";
import {
  assetCenterLog,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { gatewayUrl } from "../infra/gateway-http-error.jsx";
import { withThumbnail } from "../workspace/tool-label-definitions.js";
import { Download } from "../media-editing/package.jsx";
import {
  useExportEntityUrl,
  writeEntityDragData,
} from "../infra/use-online.jsx";
import { Badge, Textarea } from "../infra/badge-variants.jsx";
import { Checkbox } from "../infra/checkbox.jsx";
import { TooltipContent } from "../infra/dialog-content.jsx";
import { useUpdateEntity } from "./use-materialize-entity.js";

export function EntityCard({
  entity,
  onClick,
  onMaterialize,
  draggable = false,
  selected: selected2 = false,
  onToggleSelect,
}) {
  const { t: t2 } = useTranslation();
  const updateMutation = useUpdateEntity();
  const exportUrl = useExportEntityUrl();
  const previewUrl = entity.coverUrl ?? entity.thumbnailUrl;
  const thumbnailSrc = previewUrl
    ? withThumbnail(gatewayUrl(previewUrl), 320)
    : void 0;
  reactExports.useEffect(() => {
    assetCenterLog.info("cover.card_preview_selected", {
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
  const [isEditing, setIsEditing] = reactExports.useState(false);
  const [draftDescription, setDraftDescription] = reactExports.useState(
    entity.description,
  );
  reactExports.useEffect(() => {
    if (!isEditing) {
      setDraftDescription(entity.description);
    }
  }, [entity.description, isEditing]);
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
  const enterEdit = reactExports.useCallback((e2) => {
    e2.stopPropagation();
    setIsEditing(true);
  }, []);
  const commitEdit = reactExports.useCallback(async () => {
    const next2 = draftDescription.trim();
    if (next2 === entity.description.trim()) {
      setIsEditing(false);
      return;
    }
    try {
      await updateMutation.mutateAsync({
        entityId: entity.id,
        input: {
          description: next2,
        },
      });
    } catch {
      setDraftDescription(entity.description);
    } finally {
      setIsEditing(false);
    }
  }, [draftDescription, entity.description, entity.id, updateMutation]);
  const cancelEdit = reactExports.useCallback(() => {
    setDraftDescription(entity.description);
    setIsEditing(false);
  }, [entity.description]);
  const handleExport = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      const url2 = exportUrl(entity.id);
      if (!url2) return;
      const a2 = document.createElement("a");
      a2.href = url2;
      a2.rel = "noopener";
      document.body.appendChild(a2);
      a2.click();
      a2.remove();
    },
    [entity.id, exportUrl],
  );
  return (
    // Root is a <div role="button"> NOT a real <button>. The card embeds an
    // inline-edit <Textarea> in the description row; a <textarea> nested
    // inside a <button> is invalid HTML, and browsers reparent it on
    // normalization — which breaks React synthetic-event stopPropagation
    // (the "press space twice → opens dialog" bug: native <button> space
    // activation fires on a keyup path the textarea's keydown handler can't
    // intercept). A div with explicit role+keydown sidesteps the whole
    // invalid-nesting problem; the inner textarea is now valid content and
    // its stopPropagation works reliably.
    // biome-ignore lint/a11y/useSemanticElements: <button> can't legally contain the inline-edit <textarea>; div+role is the correct container here.
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e2) => {
        if (e2.target !== e2.currentTarget) return;
        if (e2.key === "Enter" || e2.key === " ") {
          e2.preventDefault();
          onClick();
        }
      }}
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : void 0}
      data-action-ui-id="asset-center-entity-card"
      data-entity-id={entity.id}
      className={`group flex flex-col bg-card text-left border rounded-lg transition-colors overflow-hidden focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:outline-none ${selected2 ? "border-foreground" : "border-border hover:border-foreground/40"} ${draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
    >
      <div className="relative aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={entity.name}
            className="w-full h-full object-contain"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <Library size={32} className="text-muted-foreground/40" />
        )}
        {onToggleSelect && (
          // biome-ignore lint/a11y/noStaticElementInteractions: event boundary only; the child Checkbox owns all interaction semantics.
          <span
            className={`absolute top-1 left-1 transition-opacity ${selected2 ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"}`}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Checkbox
              shape="circle"
              appearance="card"
              checked={selected2}
              aria-label={`${t2("projectAssets.selectRow")}: ${entity.name}`}
              data-action-ui-id="asset-center-entity-card.select"
              onCheckedChange={() => onToggleSelect()}
            />
          </span>
        )}
        <Badge
          variant="secondary"
          className="absolute top-2 right-2 text-[10px] h-5 px-1.5 rounded-[4px] bg-background/70 backdrop-blur-sm"
        >
          {t2(`assetCenter.types.${entity.type}`)}
        </Badge>
      </div>
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium truncate">{entity.name}</p>
        </div>
        {isEditing ? (
          <Textarea
            value={draftDescription}
            onChange={(e2) => setDraftDescription(e2.target.value)}
            onBlur={() => {
              void commitEdit();
            }}
            onKeyDown={(e2) => {
              e2.stopPropagation();
              if (e2.key === "Escape") {
                e2.preventDefault();
                cancelEdit();
              }
            }}
            onClick={(e2) => e2.stopPropagation()}
            onMouseDown={(e2) => e2.stopPropagation()}
            rows={3}
            autoFocus={true}
            disabled={updateMutation.isPending}
            placeholder={t2("assetCenter.card.noDescriptionHint")}
            data-action-ui-id="asset-center-entity-card-description-edit"
            className="min-h-0 max-h-[4.5rem] resize-none text-xs"
          />
        ) : (
          // Use a <span role="button"> rather than nested <button> (which is
          // invalid HTML inside the outer card button). stopPropagation on
          // both click and mousedown so this hotspot does not open the
          // detail dialog nor trigger HTML5 drag.
          // biome-ignore lint/a11y/useSemanticElements: <button> would nest inside the outer card <button>, which is invalid HTML.
          <span
            role="button"
            tabIndex={0}
            onClick={enterEdit}
            onMouseDown={(e2) => e2.stopPropagation()}
            onKeyDown={(e2) => {
              if (e2.key === "Enter" || e2.key === " ") {
                e2.preventDefault();
                e2.stopPropagation();
                setIsEditing(true);
              }
            }}
            data-action-ui-id="asset-center-entity-card-description"
            className="flex items-center cursor-text transition-colors hover:text-foreground"
          >
            <span className="w-0.5 h-3 shrink-0 bg-muted-foreground/20 mr-2" />
            <span
              className={`text-xs truncate ${entity.description ? "text-muted-foreground" : "text-muted-foreground/40"}`}
            >
              {entity.description || t2("assetCenter.card.noDescriptionHint")}
            </span>
          </span>
        )}
        <div className="flex items-center justify-between gap-2">
          {entity.useCount > 0 ? (
            <span
              className="text-[10px] text-muted-foreground"
              title={t2("assetCenter.useCountTooltip")}
            >
              {t2("assetCenter.useCount", {
                count: entity.useCount,
              })}
            </span>
          ) : (
            <span />
          )}
          <TooltipProvider delay={200}>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger
                  onClick={handleExport}
                  onMouseDown={(e2) => e2.stopPropagation()}
                  aria-label={t2("assetCenter.card.exportTooltip")}
                  data-action-ui-id="asset-center-entity-card-export"
                  className="inline-flex items-center justify-center h-7 w-7 border border-border rounded-sm bg-background text-foreground hover:bg-muted transition-colors"
                >
                  <Download size={14} />
                </TooltipTrigger>
                <TooltipContent>
                  {t2("assetCenter.card.exportTooltip")}
                </TooltipContent>
              </Tooltip>
              {onMaterialize && (
                <Tooltip>
                  <TooltipTrigger
                    onClick={(e2) => {
                      e2.stopPropagation();
                      onMaterialize();
                    }}
                    onMouseDown={(e2) => e2.stopPropagation()}
                    aria-label={t2("assetCenter.card.materializeTooltip")}
                    data-action-ui-id="asset-center-entity-card-materialize"
                    className="inline-flex items-center justify-center h-7 w-7 border border-border rounded-sm bg-background text-foreground hover:bg-muted transition-colors"
                  >
                    <FolderInput size={14} />
                  </TooltipTrigger>
                  <TooltipContent>
                    {t2("assetCenter.card.materializeTooltip")}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
