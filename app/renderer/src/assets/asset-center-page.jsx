// asset-center-page.jsx
import { useTranslation, reactExports, useSearch, useNavigate, dedupedToast, Loader2, ShieldAlert, CheckCircle2, X$7, Plus, ChevronDown, ChevronUp, FolderInput, usePlatform, useStorage, Library, Check } from "../vendor.js";
import { gatewayUrl } from "../infra/agent-ws-client.jsx";
import { withThumbnail } from "../workspace/deferred-thumbnail-image-generation.jsx";
import { DropdownMenu, assetCenterLog, TooltipProvider, Tooltip, TooltipTrigger, MoreVerticalIcon } from "../vendor-inline/vscode-base/graph.jsx";
import { getFileManagerLabelKey } from "../settings/interest-selection-provider.jsx";
import { Download, Sparkles, Trash2, FolderOpen } from "../media-editing/parse-item.jsx";
import { sortRecentWorkspaces } from "../workspace/workspace-events.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { AddEntityDialog } from "./attachment-upload-zone.jsx";
import { EntityDeleteConfirm, EntityEditDialog } from "./entity-edit-dialog.jsx";
import { ImportEntityConflictError } from "./import-entity.js";
import {
  classifyAssetError,
  trackAssetCenterAction,
  trackAssetCreate,
  useExportEntityUrl,
  useImportEntity,
  writeEntityDragData,
} from "../infra/use-online.jsx";
import { PageStateBoundary, formatAssetCenterError } from "./page-state-boundary.jsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button$1,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Textarea,
  TooltipContent,
} from "../infra/use-browser-overlay-dialog-props.jsx";
import {
  useDeleteEntity,
  useMaterializeEntity,
  useUpdateEntity,
} from "./use-materialize-entity.js";
import {
  AssetCenterToolbar,
  useApproveSuggestion,
  useExportEntitiesBatchUrl,
  usePendingSuggestions,
  useRejectSuggestion,
} from "./asset-center-toolbar.jsx";
import {
  assetCenterSearchWithoutAction,
  buildAssetCenterWorkspaceReturn,
  useAssetCenterPage,
} from "./use-asset-center-page.js";
function EntityEmptyState({ onCreate, filteredTitle, density = "page" } = {}) {
  const { t: t2 } = useTranslation();
  return (
    <PageStateBoundary
      empty={true}
      density={density}
      className="h-full"
      emptyOptions={{
        title: filteredTitle ?? t2("assetCenter.entityEmpty.title"),
        description: filteredTitle ? void 0 : t2("assetCenter.entityEmpty.body"),
        actions: onCreate
          ? [
              {
                key: "create",
                icon: <Plus size={14} strokeWidth={2} />,
                label: t2("assetSidebarPanel.createCta"),
                variant: "default",
                onClick: onCreate,
              },
            ]
          : void 0,
      }}
    />
  );
}
function EntityCard({
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
  const thumbnailSrc = previewUrl ? withThumbnail(gatewayUrl(previewUrl), 320) : void 0;
  reactExports.useEffect(() => {
    assetCenterLog.info("cover.card_preview_selected", {
      entityId: entity.id,
      source: entity.coverUrl ? "coverUrl" : entity.thumbnailUrl ? "thumbnailUrl" : "none",
      coverUrl: entity.coverUrl ?? null,
      thumbnailUrl: entity.thumbnailUrl ?? null,
      thumbnailSrc: thumbnailSrc ?? null,
    });
  }, [entity.id, entity.coverUrl, entity.thumbnailUrl, thumbnailSrc]);
  const [isEditing, setIsEditing] = reactExports.useState(false);
  const [draftDescription, setDraftDescription] = reactExports.useState(entity.description);
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
                <TooltipContent>{t2("assetCenter.card.exportTooltip")}</TooltipContent>
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
                  <TooltipContent>{t2("assetCenter.card.materializeTooltip")}</TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
function EntityGrid({
  entities,
  onCardClick,
  onMaterialize,
  onDelete,
  selectedIds,
  onToggleSelect,
}) {
  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      }}
      data-action-ui-id="asset-center-grid"
    >
      {entities.map((ent) => (
        <EntityCard
          key={ent.id}
          entity={ent}
          onClick={() => onCardClick(ent.id)}
          onMaterialize={
            onMaterialize
              ? () =>
                  onMaterialize({
                    id: ent.id,
                    name: ent.name,
                  })
              : void 0
          }
          onDelete={onDelete ? () => onDelete(ent) : void 0}
          selected={selectedIds?.has(ent.id) ?? false}
          onToggleSelect={onToggleSelect ? () => onToggleSelect(ent.id) : void 0}
        />
      ))}
    </div>
  );
}
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
function EntityListRow({
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
  const thumbnailSrc = previewUrl ? withThumbnail(gatewayUrl(previewUrl), 32) : void 0;
  reactExports.useEffect(() => {
    assetCenterLog.info("cover.list_preview_selected", {
      entityId: entity.id,
      source: entity.coverUrl ? "coverUrl" : entity.thumbnailUrl ? "thumbnailUrl" : "none",
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
          <Badge variant="secondary" className="shrink-0 text-[10px] h-5 px-1.5 rounded-[4px]">
            {t2(`assetCenter.types.${entity.type}`)}
          </Badge>
        </div>
        {entity.description && (
          <p className="text-[11px] text-muted-foreground truncate">{entity.description}</p>
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
                  <TooltipContent side="top">{t2("assetCenter.detail.export")}</TooltipContent>
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
function EntityList({
  entities,
  onCardClick,
  onMaterialize,
  onDelete,
  draggable = false,
  selectedIds,
  onToggleSelect,
}) {
  const exportUrl = useExportEntityUrl();
  const triggerExport = reactExports.useCallback(
    (entity) => {
      const url2 = exportUrl(entity.id);
      if (!url2) return;
      const a2 = document.createElement("a");
      a2.href = url2;
      a2.rel = "noopener";
      document.body.appendChild(a2);
      a2.click();
      a2.remove();
      trackAssetCenterAction({
        action: "entity_export",
        surface: "asset_center_page",
        entity_id: entity.id,
        entity_type: entity.type,
        success: true,
      });
    },
    [exportUrl],
  );
  return (
    <div
      className="flex flex-col border border-border rounded-lg bg-card overflow-hidden"
      data-action-ui-id="asset-center-list"
    >
      {entities.map((ent, idx) => (
        <EntityListRow
          key={ent.id}
          entity={ent}
          onClick={() => onCardClick(ent.id)}
          onMaterialize={
            onMaterialize
              ? () =>
                  onMaterialize({
                    id: ent.id,
                    name: ent.name,
                  })
              : void 0
          }
          onExport={() => triggerExport(ent)}
          onDelete={onDelete ? () => onDelete(ent) : void 0}
          draggable={draggable}
          isLast={idx === entities.length - 1}
          selected={selectedIds?.has(ent.id) ?? false}
          onToggleSelect={onToggleSelect ? () => onToggleSelect(ent.id) : void 0}
        />
      ))}
    </div>
  );
}
function ImportConflictDialog({ open, existingEntity, importingName, onChoose, onCancel }) {
  const { t: t2 } = useTranslation();
  const [pendingMode, setPendingMode] = reactExports.useState(null);
  const handleChoose = async (mode2) => {
    setPendingMode(mode2);
    try {
      await onChoose(mode2);
    } finally {
      setPendingMode(null);
    }
  };
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next2) => {
        if (!next2 && pendingMode === null) onCancel();
      }}
    >
      <AlertDialogContent
        className="sm:max-w-md"
        data-action-ui-id="asset-center-import-conflict-dialog"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-destructive" />
            {t2("assetCenter.import.conflictTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs space-y-2 text-left">
            <span className="block">
              {t2("assetCenter.import.conflictDescription", {
                name: existingEntity?.name ?? "",
                type: existingEntity ? t2(`assetCenter.types.${existingEntity.type}`) : "",
              })}
            </span>
            {existingEntity && importingName && importingName !== existingEntity.name && (
              <span className="block text-muted-foreground/80">
                {t2("assetCenter.import.conflictRenameHint", {
                  oldName: existingEntity.name,
                  newName: importingName,
                })}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-between sm:gap-2">
          <AlertDialogCancel
            disabled={pendingMode !== null}
            data-action-ui-id="asset-center-import-conflict-cancel"
          >
            {t2("common.cancel")}
          </AlertDialogCancel>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogAction
              variant="outline"
              onClick={() => void handleChoose("copy")}
              disabled={pendingMode !== null}
              data-action-ui-id="asset-center-import-conflict-copy"
            >
              {pendingMode === "copy" && <Loader2 size={14} className="animate-spin mr-1.5" />}
              {t2("assetCenter.import.actionCopy")}
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => void handleChoose("overwrite")}
              disabled={pendingMode !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-action-ui-id="asset-center-import-conflict-overwrite"
            >
              {pendingMode === "overwrite" && <Loader2 size={14} className="animate-spin mr-1.5" />}
              {t2("assetCenter.import.actionOverwrite")}
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
const MATERIALIZED_SUBPATH = ".hilo/materialized-entities";
function joinMaterializedDir(workspacePath) {
  const usesBackslash = workspacePath.includes("\\") && !workspacePath.includes("/");
  const trimmed = workspacePath.replace(/[/\\]+$/, "");
  const subpath = usesBackslash ? MATERIALIZED_SUBPATH.replace(/\//g, "\\") : MATERIALIZED_SUBPATH;
  return `${trimmed}${usesBackslash ? "\\" : "/"}${subpath}`;
}
function MaterializeWorkspaceDialog({ entity, onClose }) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const [recent] = useStorage("global.recentWorkspaces");
  const materializeMutation = useMaterializeEntity();
  const workspaces = reactExports.useMemo(() => sortRecentWorkspaces(recent), [recent]);
  const [selectedPaths, setSelectedPaths] = reactExports.useState(new Set());
  const [success, setSuccess] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const effectiveSelected = reactExports.useMemo(() => {
    if (selectedPaths.size > 0) return selectedPaths;
    const first2 = workspaces[0]?.path;
    return first2 ? new Set([first2]) : new Set();
  }, [selectedPaths, workspaces]);
  const canSubmit = !!entity && effectiveSelected.size > 0 && !materializeMutation.isPending;
  const togglePath = reactExports.useCallback((path2) => {
    setSelectedPaths((prev) => {
      const next2 = new Set(prev);
      if (next2.has(path2)) {
        next2.delete(path2);
      } else {
        next2.add(path2);
      }
      return next2;
    });
  }, []);
  const handleClose = () => {
    setSelectedPaths(new Set());
    setSuccess(null);
    setError(null);
    onClose();
  };
  const revealLabel = t2(getFileManagerLabelKey(platform2.app.os));
  const revealTarget = reactExports.useCallback(
    async (target) => {
      try {
        if (platform2.shell.showItemInFolder) {
          await platform2.shell.showItemInFolder(target.revealPath);
          return;
        }
        if (platform2.shell.openPath) {
          await platform2.shell.openPath(target.revealPath);
          return;
        }
        dedupedToast.error(t2("fileExplorer.platformNotSupported"));
      } catch {
        dedupedToast.error(t2("fileExplorer.openFailed"));
      }
    },
    [platform2.shell, t2],
  );
  const handleSubmit = async () => {
    if (!entity || effectiveSelected.size === 0) return;
    setError(null);
    setSuccess(null);
    const succeeded = [];
    const targets = Array.from(effectiveSelected);
    try {
      for (const targetPath of targets) {
        await materializeMutation.mutateAsync({
          entityId: entity.id,
          input: {
            workspacePath: targetPath,
          },
          _track: {
            trigger: "context_menu",
          },
        });
        const picked = workspaces.find((w3) => w3.path === targetPath);
        const label = picked?.displayName?.trim() || picked?.path.split("/").pop() || targetPath;
        succeeded.push({
          label,
          revealPath: joinMaterializedDir(targetPath),
        });
      }
      dedupedToast.success(
        t2("assetCenter.materialize.success", {
          workspace:
            succeeded.length === 1
              ? succeeded[0].label
              : t2("assetCenter.materialize.workspaceCount", {
                  count: succeeded.length,
                }),
        }),
        {
          description: t2("assetCenter.materialize.successPathHint"),
          action:
            succeeded.length === 1
              ? {
                  label: t2(getFileManagerLabelKey(platform2.app.os)),
                  onClick: () => void revealTarget(succeeded[0]),
                }
              : void 0,
        },
      );
      handleClose();
    } catch (err) {
      const msg = formatAssetCenterError(err, t2);
      if (succeeded.length > 0) {
        setSuccess({
          targets: succeeded,
        });
        setError(
          t2("assetCenter.materialize.partialError", {
            count: succeeded.length,
            message: msg,
          }),
        );
      } else {
        setError(msg);
      }
    }
  };
  return (
    <Dialog
      open={entity !== null}
      onOpenChange={(o2) => {
        if (!o2) handleClose();
      }}
    >
      <DialogContent
        className="min-w-0 sm:max-w-lg"
        data-action-ui-id="asset-center-materialize-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t2("assetCenter.materialize.title")}</DialogTitle>
          <DialogDescription className="text-xs">
            {entity
              ? t2("assetCenter.materialize.description", {
                  name: entity.name,
                })
              : t2("assetCenter.materialize.descriptionFallback")}
          </DialogDescription>
        </DialogHeader>
        <div className="min-w-0 space-y-3">
          {workspaces.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              {t2("assetCenter.materialize.noWorkspaces")}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {t2("assetCenter.materialize.workspaceLabel")}
                </span>
                <span className="text-[10px] text-muted-foreground/70">
                  {t2("assetCenter.materialize.selectedCount", {
                    count: effectiveSelected.size,
                  })}
                </span>
              </div>
              <ul
                className="w-full min-w-0 max-h-64 overflow-x-hidden overflow-y-auto rounded-lg border border-border"
                data-action-ui-id="asset-center-materialize-workspace-list"
              >
                {workspaces.map((w3) => {
                  const display = w3.displayName?.trim() || w3.path.split("/").pop() || w3.path;
                  const checked = effectiveSelected.has(w3.path);
                  const inputId = `materialize-ws-${w3.path}`;
                  return (
                    <li
                      key={w3.path}
                      className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                    >
                      <label
                        htmlFor={inputId}
                        className="hilo-checkbox-label flex min-w-0 items-center px-3 py-2 cursor-pointer text-xs"
                        data-action-ui-id="asset-center-materialize-workspace-row"
                      >
                        <Checkbox
                          id={inputId}
                          checked={checked}
                          onCheckedChange={() => togglePath(w3.path)}
                          data-action-ui-id="asset-center-materialize-workspace-checkbox"
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate font-medium">{display}</span>
                          <span
                            className="text-[10px] text-muted-foreground truncate"
                            title={w3.path}
                          >
                            {w3.path}
                          </span>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {success && (
            <div
              className="flex items-start gap-2 rounded-lg border border-foreground/20 bg-muted/20 px-3 py-2"
              data-action-ui-id="asset-center-materialize-success"
            >
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-foreground" />
              <div className="text-xs space-y-1.5 min-w-0 flex-1">
                <p className="font-medium">
                  {t2("assetCenter.materialize.success", {
                    workspace:
                      success.targets.length === 1
                        ? success.targets[0].label
                        : t2("assetCenter.materialize.workspaceCount", {
                            count: success.targets.length,
                          }),
                  })}
                </p>
                <p className="text-[10px] text-muted-foreground/80">
                  {t2("assetCenter.materialize.successPathHint")}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {success.targets.map((target) => (
                    <Button$1
                      key={target.revealPath}
                      variant="outline"
                      size="sm"
                      className="h-6 gap-1 px-2 text-[10px]"
                      onClick={() => void revealTarget(target)}
                      data-action-ui-id="asset-center-materialize-reveal"
                    >
                      <FolderOpen size={11} />
                      {success.targets.length === 1 ? revealLabel : target.label}
                    </Button$1>
                  ))}
                </div>
              </div>
            </div>
          )}
          {error && (
            <div
              className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2"
              data-action-ui-id="asset-center-materialize-error"
            >
              <ShieldAlert size={14} className="mt-0.5 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button$1
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={handleClose}
            disabled={materializeMutation.isPending}
            data-action-ui-id="asset-center-materialize-close"
          >
            {success ? t2("common.close") : t2("common.cancel")}
          </Button$1>
          <Button$1
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || workspaces.length === 0}
            data-action-ui-id="asset-center-materialize-submit"
          >
            {materializeMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {success
              ? t2("assetCenter.materialize.submitAgain")
              : t2("assetCenter.materialize.submit")}
          </Button$1>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function SuggestionCard({ suggestion }) {
  const { t: t2 } = useTranslation();
  const approve = useApproveSuggestion();
  const reject = useRejectSuggestion();
  const [error, setError] = reactExports.useState(null);
  const handleApprove = async () => {
    setError(null);
    try {
      await approve.mutateAsync({
        suggestionId: suggestion.id,
      });
      trackAssetCreate({
        source: "asset_center_page",
        method: "agent_suggestion",
        entity_type: suggestion.suggested.type,
        success: true,
        attachment_count: suggestion.suggested.attachmentRefs?.length ?? 0,
        has_description: !!suggestion.suggested.description,
      });
    } catch (err) {
      setError(formatAssetCenterError(err, t2));
      trackAssetCreate({
        source: "asset_center_page",
        method: "agent_suggestion",
        entity_type: suggestion.suggested.type,
        success: false,
        attachment_count: suggestion.suggested.attachmentRefs?.length ?? 0,
        has_description: !!suggestion.suggested.description,
        error_type: classifyAssetError(err),
      });
    }
  };
  const handleReject = async () => {
    setError(null);
    try {
      await reject.mutateAsync({
        suggestionId: suggestion.id,
      });
    } catch (err) {
      setError(formatAssetCenterError(err, t2));
    }
  };
  const isBusy = approve.isPending || reject.isPending;
  const attachmentCount = suggestion.suggested.attachmentRefs?.length ?? 0;
  return (
    <article
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-xs"
      data-action-ui-id="asset-center-suggestion-card"
      data-suggestion-id={suggestion.id}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{suggestion.suggested.name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
              {t2(`assetCenter.types.${suggestion.suggested.type}`)}
            </Badge>
            {attachmentCount > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {t2("assetCenter.suggestions.attachmentCount", {
                  count: attachmentCount,
                })}
              </span>
            )}
          </div>
        </div>
      </div>
      {suggestion.suggested.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {suggestion.suggested.description}
        </p>
      )}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      <div className="flex items-center gap-1.5 mt-1">
        <Button$1
          size="sm"
          className="h-7 gap-1.5 text-xs flex-1"
          onClick={() => void handleApprove()}
          disabled={isBusy}
          data-action-ui-id="asset-center-suggestion-approve"
        >
          {approve.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {t2("assetCenter.suggestions.approve")}
        </Button$1>
        <Button$1
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground"
          onClick={() => void handleReject()}
          disabled={isBusy}
          data-action-ui-id="asset-center-suggestion-reject"
        >
          {reject.isPending ? <Loader2 size={12} className="animate-spin" /> : <X$7 size={12} />}
          {t2("assetCenter.suggestions.reject")}
        </Button$1>
      </div>
    </article>
  );
}
function SuggestionPanel() {
  const { t: t2 } = useTranslation();
  const [collapsed, setCollapsed] = reactExports.useState(false);
  const suggestions = usePendingSuggestions(20);
  const list2 = suggestions.data ?? [];
  if (suggestions.isError) {
    return (
      <section
        className="border-b border-border bg-destructive/5 px-16 py-2 text-xs text-destructive"
        data-action-ui-id="asset-center-suggestion-error"
      >
        {t2("assetCenter.suggestions.loadError", {
          message: suggestions.error.message,
        })}
      </section>
    );
  }
  if (list2.length === 0) return null;
  return (
    <section
      className="border-b border-border bg-[var(--home-content-surface)] px-16 py-3"
      data-action-ui-id="asset-center-suggestion-panel"
      data-suggestion-count={list2.length}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-foreground/60" />
          <h2 className="text-xs font-medium">
            {t2("assetCenter.suggestions.title", {
              count: list2.length,
            })}
          </h2>
        </div>
        <Button$1
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground"
          onClick={() => setCollapsed((c3) => !c3)}
          data-action-ui-id="asset-center-suggestion-panel-toggle"
        >
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          {collapsed
            ? t2("assetCenter.suggestions.expand")
            : t2("assetCenter.suggestions.collapse")}
        </Button$1>
      </div>
      {!collapsed && (
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}
        >
          {list2.map((sug) => (
            <SuggestionCard key={sug.id} suggestion={sug} />
          ))}
        </div>
      )}
    </section>
  );
}
export function AssetCenterPage({ surface = "route", initialAction } = {}) {
  const { t: t2 } = useTranslation();
  const page = useAssetCenterPage();
  const importMutation = useImportEntity();
  const [editId, setEditId] = reactExports.useState(null);
  const [deleteTarget, setDeleteTarget] = reactExports.useState(null);
  const [addOpen, setAddOpen] = reactExports.useState(false);
  const search2 = useSearch({
    from: "/_home/asset-center/",
    shouldThrow: false,
  });
  const returnWorkspaceId = surface === "route" ? search2?.returnWorkspaceId : void 0;
  const navigate = useNavigate();
  const routeAction = surface === "route" ? search2?.action : void 0;
  reactExports.useEffect(() => {
    if (surface !== "route") return;
    if (routeAction === "create") {
      setAddOpen(true);
      navigate({
        to: "/asset-center",
        search: assetCenterSearchWithoutAction(returnWorkspaceId),
        replace: true,
      });
    }
  }, [surface, routeAction, returnWorkspaceId, navigate]);
  reactExports.useEffect(() => {
    if (surface !== "sheet") return;
    if (initialAction === "create") setAddOpen(true);
  }, [surface, initialAction]);
  const handleBackToWorkspace = reactExports.useCallback(() => {
    if (!returnWorkspaceId) return;
    navigate(buildAssetCenterWorkspaceReturn(returnWorkspaceId));
  }, [navigate, returnWorkspaceId]);
  const [materializeTarget, setMaterializeTarget] = reactExports.useState(null);
  const [selectedEntityIds, setSelectedEntityIds] = reactExports.useState(() => new Set());
  const toggleSelectEntity = reactExports.useCallback((entityId) => {
    setSelectedEntityIds((prev) => {
      const next2 = new Set(prev);
      if (next2.has(entityId)) {
        next2.delete(entityId);
      } else {
        next2.add(entityId);
      }
      return next2;
    });
  }, []);
  const clearSelection = reactExports.useCallback(() => setSelectedEntityIds(new Set()), []);
  const deleteMutation = useDeleteEntity();
  const [batchDeleteError, setBatchDeleteError] = reactExports.useState(null);
  const [batchDeleting, setBatchDeleting] = reactExports.useState(false);
  const runBatchDelete = reactExports.useCallback(async () => {
    if (selectedEntityIds.size === 0) return;
    setBatchDeleteError(null);
    setBatchDeleting(true);
    const remaining = new Set(selectedEntityIds);
    try {
      for (const id2 of selectedEntityIds) {
        await deleteMutation.mutateAsync({
          entityId: id2,
        });
        remaining.delete(id2);
      }
      clearSelection();
    } catch (err) {
      setSelectedEntityIds(remaining);
      setBatchDeleteError(formatAssetCenterError(err, t2));
    } finally {
      setBatchDeleting(false);
    }
  }, [selectedEntityIds, deleteMutation, clearSelection, t2]);
  const buildBatchExportUrl = useExportEntitiesBatchUrl();
  const runBatchExport = reactExports.useCallback(() => {
    if (selectedEntityIds.size === 0) return;
    const url2 = buildBatchExportUrl([...selectedEntityIds]);
    if (!url2) return;
    const a2 = document.createElement("a");
    a2.href = url2;
    a2.rel = "noopener";
    document.body.appendChild(a2);
    a2.click();
    a2.remove();
  }, [selectedEntityIds, buildBatchExportUrl]);
  const [importSuccess, setImportSuccess] = reactExports.useState(null);
  const [importError, setImportError] = reactExports.useState(null);
  const [conflictState, setConflictState] = reactExports.useState(null);
  const openEdit = reactExports.useCallback((eid) => {
    setEditId(eid);
  }, []);
  const closeEdit = reactExports.useCallback(() => setEditId(null), []);
  const openDelete = reactExports.useCallback((entity) => {
    setDeleteTarget(entity);
    setEditId(null);
  }, []);
  const closeDelete = reactExports.useCallback(() => setDeleteTarget(null), []);
  const openAdd = reactExports.useCallback(() => setAddOpen(true), []);
  const closeAdd = reactExports.useCallback(() => setAddOpen(false), []);
  const openMaterialize = reactExports.useCallback((entity) => {
    setMaterializeTarget(entity);
    setEditId(null);
  }, []);
  const closeMaterialize = reactExports.useCallback(() => setMaterializeTarget(null), []);
  const runImport = reactExports.useCallback(
    async (file, mode2) => {
      setImportSuccess(null);
      setImportError(null);
      try {
        const result = await importMutation.mutateAsync({
          file,
          mode: mode2,
        });
        setImportSuccess({
          name: result.entity.name,
          warnings: result.warnings,
        });
        dedupedToast.success(
          t2("assetCenter.import.toastSuccess", {
            name: result.entity.name,
          }),
        );
        setConflictState(null);
        trackAssetCreate({
          source: "asset_center_page",
          method: "import",
          entity_type: result.entity.type,
          success: true,
          has_description: !!result.entity.description,
          import_mode: mode2,
        });
      } catch (err) {
        if (err instanceof ImportEntityConflictError) {
          setConflictState({
            file,
            existingEntity: err.conflict.existingEntity,
            importingName: err.conflict.importedManifest.name,
          });
          return;
        }
        setImportError(formatAssetCenterError(err, t2));
        trackAssetCreate({
          source: "asset_center_page",
          method: "import",
          success: false,
          has_description: false,
          import_mode: mode2,
          error_type: classifyAssetError(err),
        });
      }
    },
    [importMutation, t2],
  );
  const handleImportFile = reactExports.useCallback(
    (file) => void runImport(file, "create-new"),
    [runImport],
  );
  const [batchImportProgress, setBatchImportProgress] = reactExports.useState(null);
  const [batchImportSummary, setBatchImportSummary] = reactExports.useState(null);
  const handleImportFiles = reactExports.useCallback(
    async (files) => {
      if (files.length === 1) {
        const single = files[0];
        if (single) handleImportFile(single);
        return;
      }
      setImportSuccess(null);
      setImportError(null);
      setBatchImportSummary(null);
      const succeeded = [];
      const failed = [];
      for (let i2 = 0; i2 < files.length; i2++) {
        const file = files[i2];
        if (!file) continue;
        setBatchImportProgress({
          current: i2 + 1,
          total: files.length,
        });
        try {
          const result = await importMutation.mutateAsync({
            file,
            mode: "create-new",
          });
          succeeded.push(result.entity.name);
          trackAssetCreate({
            source: "asset_center_page",
            method: "import",
            entity_type: result.entity.type,
            success: true,
            has_description: !!result.entity.description,
            import_mode: "create-new",
          });
        } catch (err) {
          if (err instanceof ImportEntityConflictError) {
            failed.push({
              name: file.name,
              message: t2("assetCenter.import.conflictBatchSkipped", {
                existingName: err.conflict.existingEntity.name,
              }),
            });
          } else {
            failed.push({
              name: file.name,
              message: formatAssetCenterError(err, t2),
            });
          }
          trackAssetCreate({
            source: "asset_center_page",
            method: "import",
            success: false,
            has_description: false,
            import_mode: "create-new",
            error_type:
              err instanceof ImportEntityConflictError ? "conflict" : classifyAssetError(err),
          });
        }
      }
      setBatchImportProgress(null);
      setBatchImportSummary({
        succeeded,
        failed,
      });
    },
    [importMutation, handleImportFile, t2],
  );
  const handleConflictChoice = reactExports.useCallback(
    async (mode2) => {
      if (!conflictState) return;
      await runImport(conflictState.file, mode2);
    },
    [conflictState, runImport],
  );
  const closeConflictDialog = reactExports.useCallback(() => setConflictState(null), []);
  return (
    <div className="flex flex-col h-full min-h-0 bg-[var(--home-content-surface)]">
      <AssetCenterToolbar
        onBack={returnWorkspaceId ? handleBackToWorkspace : void 0}
        search={page.search}
        onSearchChange={page.setSearch}
        typeFilter={page.typeFilter}
        onTypeFilterChange={page.setTypeFilter}
        sort={page.sort}
        onSortChange={page.setSort}
        viewMode={page.viewMode}
        onViewModeChange={page.setViewMode}
        onAddClick={openAdd}
        onImportFile={handleImportFiles}
        isImporting={importMutation.isPending}
      />
      <SuggestionPanel />
      {selectedEntityIds.size > 0 && (
        <div
          className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-soft bg-[var(--home-content-surface)] px-8 md:px-12 py-2"
          data-action-ui-id="asset-center-batch-action-bar"
        >
          <span className="text-xs">
            {t2("assetCenter.batch.selected", {
              count: selectedEntityIds.size,
            })}
          </span>
          <span className="flex-1" />
          <Button$1
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={clearSelection}
            disabled={batchDeleting}
            data-action-ui-id="asset-center-batch-clear"
          >
            {t2("assetCenter.batch.clear")}
          </Button$1>
          <Button$1
            variant="secondary"
            size="sm"
            className="h-7 gap-1.5"
            onClick={runBatchExport}
            disabled={batchDeleting}
            data-action-ui-id="asset-center-batch-export"
          >
            <Download size={12} />
            {t2("assetCenter.batch.export", {
              count: selectedEntityIds.size,
            })}
          </Button$1>
          <Button$1
            variant="destructive"
            size="sm"
            className="h-7 gap-1.5"
            onClick={() => void runBatchDelete()}
            disabled={batchDeleting}
            data-action-ui-id="asset-center-batch-delete"
          >
            {batchDeleting && <Loader2 size={12} className="animate-spin" />}
            {t2("assetCenter.batch.delete", {
              count: selectedEntityIds.size,
            })}
          </Button$1>
        </div>
      )}
      {batchDeleteError && (
        <div
          className="mx-8 mt-2 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 md:mx-12"
          data-action-ui-id="asset-center-batch-delete-error"
        >
          <ShieldAlert size={14} className="mt-0.5 shrink-0 text-destructive" />
          <p className="text-xs text-destructive">{batchDeleteError}</p>
        </div>
      )}
      {batchImportProgress && (
        <div
          className="mx-10 mt-2 flex items-center gap-2 rounded-lg border border-foreground/20 bg-muted/30 px-3 py-2"
          data-action-ui-id="asset-center-batch-import-progress"
        >
          <Loader2 size={14} className="shrink-0 animate-spin" />
          <p className="text-xs">
            {t2("assetCenter.batch.importing", {
              current: batchImportProgress.current,
              total: batchImportProgress.total,
            })}
          </p>
        </div>
      )}
      {batchImportSummary && (
        <div
          className="mx-10 mt-2 flex items-start gap-2 rounded-lg border border-foreground/20 bg-muted/30 px-3 py-2"
          data-action-ui-id="asset-center-batch-import-summary"
        >
          {batchImportSummary.failed.length === 0 ? (
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-foreground" />
          ) : (
            <ShieldAlert size={14} className="mt-0.5 shrink-0 text-destructive" />
          )}
          <div className="text-xs min-w-0 flex-1 space-y-1">
            <p>
              {t2("assetCenter.batch.imported", {
                count: batchImportSummary.succeeded.length,
              })}
            </p>
            {batchImportSummary.failed.length > 0 && (
              <ul className="text-[11px] text-destructive/90 space-y-0.5 pl-4 list-disc">
                {batchImportSummary.failed.map((f2) => (
                  <li key={f2.name} className="break-words">
                    <span className="font-medium">{f2.name}</span>
                    {": "}
                    {f2.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button$1
            variant="ghost"
            size="icon-xs"
            className="shrink-0 -mt-0.5 -mr-1 text-muted-foreground hover:text-foreground"
            onClick={() => setBatchImportSummary(null)}
            aria-label={t2("common.close")}
            data-action-ui-id="asset-center-batch-import-summary-close"
          >
            <X$7 size={12} />
          </Button$1>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto px-8 md:px-12 pt-3 pb-6 space-y-3 [scrollbar-gutter:stable]">
        {importSuccess && (
          <div
            className="flex items-start gap-2 rounded-lg border border-foreground/20 bg-muted/30 px-3 py-2"
            data-action-ui-id="asset-center-import-success"
          >
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-foreground" />
            <div className="text-xs min-w-0 flex-1 space-y-1">
              <p>
                {importSuccess.warnings.length > 0
                  ? t2("assetCenter.import.successWithWarnings", {
                      name: importSuccess.name,
                      count: importSuccess.warnings.length,
                    })
                  : t2("assetCenter.import.success", {
                      name: importSuccess.name,
                    })}
              </p>
              {importSuccess.warnings.length > 0 && (
                <ul
                  className="text-[11px] text-muted-foreground/90 space-y-0.5 pl-4 list-disc"
                  data-action-ui-id="asset-center-import-warning-list"
                >
                  {importSuccess.warnings.map((w3) => (
                    <li
                      key={`${w3.code}:${Object.values(w3.params ?? {}).join(",")}`}
                      className="whitespace-pre-wrap break-words"
                    >
                      {t2(`assetCenter.warnings.${w3.code}`, {
                        ...w3.params,
                      })}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button$1
              variant="ghost"
              size="icon-xs"
              className="shrink-0 -mt-0.5 -mr-1 text-muted-foreground hover:text-foreground"
              onClick={() => setImportSuccess(null)}
              aria-label={t2("common.close")}
              data-action-ui-id="asset-center-import-success-close"
            >
              <X$7 size={12} />
            </Button$1>
          </div>
        )}
        {importError && (
          <div
            className="flex items-center gap-2 border border-destructive/50 bg-destructive/10 px-3 py-2 rounded-lg"
            data-action-ui-id="asset-center-import-error"
          >
            <ShieldAlert size={14} className="shrink-0 text-destructive" />
            <p className="text-xs text-destructive flex-1 min-w-0">
              {t2("assetCenter.import.error", {
                message: importError,
              })}
            </p>
            <Button$1
              variant="ghost"
              size="icon-xs"
              className="shrink-0 -mr-1 text-destructive/70 hover:text-destructive"
              onClick={() => setImportError(null)}
              aria-label={t2("common.close")}
              data-action-ui-id="asset-center-import-error-close"
            >
              <X$7 size={12} />
            </Button$1>
          </div>
        )}
        {page.loadError ? (
          <div
            className="flex items-start gap-2 border border-destructive/50 bg-destructive/10 px-3 py-3 rounded-lg"
            data-action-ui-id="asset-center-load-error"
          >
            <ShieldAlert size={16} className="mt-0.5 shrink-0 text-destructive" />
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-medium text-destructive">
                {t2("assetCenter.loadError.title")}
              </p>
              <p className="text-xs text-destructive/80">{page.loadError.message}</p>
            </div>
          </div>
        ) : page.isLoading ? (
          <div className="text-xs text-muted-foreground py-12 text-center">
            {t2("assetCenter.loading")}
          </div>
        ) : page.entities.length === 0 ? (
          <EntityEmptyState
            density={surface === "sheet" ? "panel" : "page"}
            filteredTitle={
              page.isEmpty
                ? void 0
                : page.search.trim()
                  ? t2("assetCenter.searchEmpty")
                  : t2(`assetSidebarPanel.emptyByType.${page.typeFilter}`)
            }
          />
        ) : page.viewMode === "list" ? (
          <EntityList
            entities={page.entities}
            onCardClick={openEdit}
            selectedIds={selectedEntityIds}
            onToggleSelect={toggleSelectEntity}
            onMaterialize={openMaterialize}
            onDelete={openDelete}
          />
        ) : (
          <EntityGrid
            entities={page.entities}
            onCardClick={openEdit}
            selectedIds={selectedEntityIds}
            onToggleSelect={toggleSelectEntity}
            onMaterialize={openMaterialize}
            onDelete={openDelete}
          />
        )}
      </div>
      <EntityEditDialog
        entityId={editId}
        onClose={closeEdit}
        onDelete={openDelete}
        onMaterialize={openMaterialize}
      />
      <EntityDeleteConfirm entity={deleteTarget} onClose={closeDelete} />
      <AddEntityDialog open={addOpen} onClose={closeAdd} />
      <MaterializeWorkspaceDialog entity={materializeTarget} onClose={closeMaterialize} />
      <ImportConflictDialog
        open={conflictState !== null}
        existingEntity={conflictState?.existingEntity ?? null}
        importingName={conflictState?.importingName ?? ""}
        onChoose={handleConflictChoice}
        onCancel={closeConflictDialog}
      />
    </div>
  );
}
