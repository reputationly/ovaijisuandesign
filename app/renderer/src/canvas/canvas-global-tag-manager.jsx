// canvas-global-tag-manager.jsx
import { reactExports, useTranslation, dedupedToast, useSortable, CSS$1, X$7, useSensors, useSensor, PointerSensor, KeyboardSensor, sortableKeyboardCoordinates, arrayMove, DndContext, closestCenter, Plus, SortableContext, verticalListSortingStrategy, Loader2, Video, Music2, API_PATHS, CircleX, ChevronLeft, ChevronRight$1, Ellipsis } from "../vendor.js";
import { PopoverTrigger, Popover } from "../assets/apply-asset-change.jsx";
import { withThumbnail } from "../workspace/deferred-thumbnail-image-generation.jsx";
import { Tooltip, TooltipTrigger, Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { Download, ImageOutlineIcon, FileText } from "../media-editing/parse-item.jsx";
import { useCanvasAssetNodeIds } from "../infra/track-events.js";
import { useGatewayUrl } from "../generation/use-resizable-width.js";
import { AssetPreviewPopup } from "../assets/scrollable-asset-view.jsx";
import {
  truncateCanvasTagName,
  countCanvasTagNameUnits,
  CANVAS_TAG_NAME_MAX_LENGTH,
  isCanvasKeywordTag,
  validateCanvasTagName,
  isTagNameTaken,
  isCanvasColorTag,
} from "../infra/normalize-tag-registry.js";
import {
  cn$2,
  TooltipContent,
  Button$1,
} from "../infra/use-browser-overlay-dialog-props.jsx";
import {
  getCanvasTagPresentationColor,
  getCanvasTagSelectedForegroundColor,
} from "../assets/asset-panel-overlay-host.jsx";
import { Input3 } from "../infra/select-content.jsx";
import { useCanvasTags } from "./use-canvas-tags.jsx";
import { CanvasToolbarExtensionButton } from "./zoom-menu.jsx";
import { CanvasLabelIcon } from "./use-inline-rename.jsx";
import { PopoverContent } from "../team/use-credit-details.jsx";
import { CANVAS_TOOL_DOCK_SAFE_BOTTOM_PX } from "./node-alignment-guides.jsx";
import {
  PreviewCard$1,
  PreviewCardTrigger,
  PreviewCardContent,
} from "../text-editor/use-canvas-image-annotation-host.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { summarizeCanvasTagDownloads, useCanvasTagName } from "../assets/use-asset-picker-host.jsx";
const TAG_NAME_LIMIT_TOAST_ID = "canvas-tag-name-limit";
export function useCanvasTagNameInputLimit() {
  const { t: t2 } = useTranslation();
  const composingRef = reactExports.useRef(false);
  const announcedRef = reactExports.useRef(false);
  const enforceLimit = reactExports.useCallback(
    (value) => {
      const limited = truncateCanvasTagName(value);
      if (limited !== value && !announcedRef.current) {
        dedupedToast.info(t2("canvasTags.nameLimitReached"), {
          id: TAG_NAME_LIMIT_TOAST_ID,
          duration: 2e3,
        });
        announcedRef.current = true;
      }
      if (countCanvasTagNameUnits(limited) < CANVAS_TAG_NAME_MAX_LENGTH) {
        announcedRef.current = false;
      }
      return limited;
    },
    [t2],
  );
  return {
    acceptChange(value) {
      return composingRef.current ? value : enforceLimit(value);
    },
    startComposition() {
      composingRef.current = true;
    },
    finishComposition(value) {
      composingRef.current = false;
      return enforceLimit(value);
    },
  };
}
function SortableTagRow({
  tag,
  label,
  resolvedNames,
  onUpdate,
  onDelete,
  assetCount = 0,
  downloadDisabled,
  downloading,
  onDownload,
}) {
  const { t: t2 } = useTranslation();
  const tagNameInputLimit = useCanvasTagNameInputLimit();
  const [draft, setDraft] = reactExports.useState(label);
  const [editing, setEditing] = reactExports.useState(false);
  const [saving, setSaving] = reactExports.useState(false);
  const keywordTag = isCanvasKeywordTag(tag);
  const {
    attributes,
    listeners: listeners2,
    setNodeRef,
    transform: transform2,
    transition: transition2,
    isDragging,
  } = useSortable({
    id: tag.id,
    disabled: keywordTag,
  });
  const { onPointerDown: onPointerDown2, ...keyboardListeners } = listeners2 ?? {};
  const handleDragPointerDown = onPointerDown2;
  reactExports.useEffect(() => setDraft(label), [label]);
  const validation = validateCanvasTagName(draft);
  const duplicate = isTagNameTaken(draft, resolvedNames, tag.id);
  const inputInvalid = validation === "required" || duplicate;
  const saveName = async () => {
    const name2 = draft.trim();
    if (validation || duplicate || name2 === label) {
      if (!validation && !duplicate) setDraft(label);
      return;
    }
    setSaving(true);
    try {
      await onUpdate(tag.id, {
        name: name2,
      });
    } catch {
      setDraft(label);
      dedupedToast.error(t2("canvasTags.saveFailed"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS$1.Transform.toString(transform2),
        transition: transition2,
        opacity: isDragging ? 0.92 : 1,
      }}
      className={cn$2(
        "group/row w-full rounded-md px-1 py-0.5 transition-[background-color,box-shadow,opacity]",
        isDragging && "relative z-10 bg-popup-item-hover shadow-sm ring-1 ring-border",
      )}
      data-action-ui-id="canvas.tag-manager-row"
      data-tag-id={tag.id}
      data-dragging={isDragging || void 0}
    >
      <div className="grid min-h-8 w-full grid-cols-[minmax(0,1fr)_24px] items-center gap-x-1">
        <div
          className="group/delete-zone grid min-w-0 grid-cols-[16px_minmax(0,1fr)_24px] items-center gap-x-1.5"
          data-action-ui-id="canvas.tag-manager-delete-zone"
        >
          <div
            className={cn$2(
              "-m-2.5 flex size-9 items-center justify-center rounded-md",
              !keywordTag && "cursor-grab touch-none select-none active:cursor-grabbing",
            )}
            data-action-ui-id="canvas.tag-manager-drag-region"
            data-drag-enabled={!keywordTag || void 0}
            onPointerDown={keywordTag ? void 0 : handleDragPointerDown}
          >
            {isCanvasColorTag(tag) ? (
              <span
                aria-hidden={true}
                data-action-ui-id="canvas.tag-manager-color-indicator"
                className="size-4 shrink-0 rounded-full ring-1 ring-border"
                style={{
                  backgroundColor: getCanvasTagPresentationColor(tag.color),
                }}
              />
            ) : (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label={t2("canvasTags.delete")}
                      data-action-ui-id="canvas.tag-manager-keyword-indicator"
                      className={cn$2(
                        "group/keyword-delete flex size-4 shrink-0 items-center justify-center rounded-full border-[1px] border-solid border-[rgba(0,0,0,0.3)] outline-hidden transition-[background-color,border-color,opacity] focus-visible:ring-2 focus-visible:ring-ring/50 dark:border-[rgba(255,255,255,0.4)]",
                        !editing &&
                          "group-hover/delete-zone:border-foreground group-hover/delete-zone:bg-foreground group-hover/delete-zone:opacity-100 focus-visible:border-foreground focus-visible:bg-foreground focus-visible:opacity-100",
                      )}
                      onClick={() => onDelete(tag)}
                    >
                      <Icon
                        icon={X$7}
                        size="xs"
                        strokeWidth={3}
                        className={cn$2(
                          "text-background opacity-0 transition-opacity",
                          !editing &&
                            "group-hover/delete-zone:opacity-100 group-focus-visible/keyword-delete:opacity-100",
                        )}
                        aria-hidden={true}
                      />
                    </button>
                  }
                />
                <TooltipContent className="max-w-64" side="top" align="start">
                  {t2("canvasTags.deleteKeywordInfo")}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="group/name relative min-w-0">
            <Input3
              value={draft}
              disabled={saving}
              className={cn$2(
                "h-8 min-w-0 w-full rounded-md border-transparent bg-transparent! py-0 pr-1.5 pl-2 text-[13px] font-normal shadow-none focus-visible:border-border! focus-visible:bg-transparent! dark:bg-transparent! dark:focus-visible:bg-transparent!",
                !editing
                  ? "text-transparent caret-transparent group-hover/name:border-black/[0.12]! dark:group-hover/name:border-white/[0.12]!"
                  : "border-border!",
              )}
              style={{
                borderWidth: editing ? "1px" : "var(--divider-width)",
                fontSize: "13px",
                fontWeight: 400,
              }}
              aria-invalid={inputInvalid}
              onChange={(event) => setDraft(tagNameInputLimit.acceptChange(event.target.value))}
              onCompositionStart={tagNameInputLimit.startComposition}
              onCompositionEnd={(event) =>
                setDraft(tagNameInputLimit.finishComposition(event.currentTarget.value))
              }
              onFocus={() => setEditing(true)}
              onBlur={() => {
                setEditing(false);
                void saveName();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  setDraft(label);
                  event.currentTarget.blur();
                }
              }}
            />
            {!editing ? (
              <span
                aria-hidden={true}
                className="pointer-events-none absolute inset-0 flex min-w-0 items-center overflow-hidden pr-1.5 pl-2 text-[13px] font-normal text-foreground"
                data-action-ui-id="canvas.tag-manager-edit-preview"
                style={{
                  fontSize: "13px",
                  fontWeight: 400,
                }}
              >
                <span
                  className="min-w-0 truncate"
                  data-action-ui-id="canvas.tag-manager-edit-label"
                >
                  {draft}
                </span>
              </span>
            ) : null}
          </div>
          <span
            className="w-6 shrink-0 text-center text-[10.5px] font-light tabular-nums text-muted-foreground"
            data-action-ui-id="canvas.tag-manager-asset-count"
          >
            {assetCount}
          </span>
        </div>
        <div
          className="grid w-6 shrink-0 grid-cols-1 items-center"
          data-action-ui-id="canvas.tag-manager-trailing"
        >
          <div
            className="grid w-6 shrink-0 grid-cols-1 items-center opacity-100"
            data-action-ui-id="canvas.tag-manager-actions"
          >
            {onDownload ? (
              <Button$1
                variant="ghost"
                size="icon-xs"
                aria-label={t2("canvasTags.downloadTag", {
                  name: label,
                  count: assetCount,
                })}
                loading={downloading}
                disabled={downloadDisabled || assetCount === 0}
                className="relative rounded-full border-transparent bg-transparent after:pointer-events-none after:absolute after:-inset-0.5 after:rounded-full after:border after:border-transparent after:transition-colors after:content-[''] hover:bg-transparent hover:after:border-black/[0.20] focus-visible:after:border-black/[0.20] dark:hover:after:border-white/[0.18] dark:focus-visible:after:border-white/[0.18]"
                data-action-ui-id="canvas.tag-manager-download"
                onClick={onDownload}
              >
                <Icon icon={Download} size="md" className="scale-[1.15]" aria-hidden={true} />
              </Button$1>
            ) : (
              <span className="size-6" aria-hidden={true} />
            )}
          </div>
        </div>
        {!keywordTag ? (
          <button
            type="button"
            aria-label={t2("canvasTags.dragToSort")}
            data-action-ui-id="canvas.tag-manager-drag"
            className="sr-only"
            {...attributes}
            {...keyboardListeners}
          />
        ) : null}
      </div>
      {duplicate ? (
        <p className="pb-1 pl-[26px] text-xs text-destructive">{t2("canvasTags.nameTaken")}</p>
      ) : null}
    </div>
  );
}
function CanvasTagManagerPanel({
  assetCountsByTag,
  taggedAssetCount = 0,
  downloadEnabled,
  downloadingTagId,
  downloadingAll,
  onDownloadTag,
  onDownloadAllTagged,
}) {
  const { t: t2 } = useTranslation();
  const tagNameInputLimit = useCanvasTagNameInputLimit();
  const resolveName2 = useCanvasTagName();
  const { registry: registry2, createTag, updateTag, reorderTags, deleteTag } = useCanvasTags();
  const [localTags, setLocalTags] = reactExports.useState(registry2.tags);
  const [creating, setCreating] = reactExports.useState(false);
  const [newName, setNewName] = reactExports.useState("");
  const submittedCreateNameRef = reactExports.useRef("");
  const [creatingSaving, setCreatingSaving] = reactExports.useState(false);
  const creatingSavingRef = reactExports.useRef(false);
  const deletingTagIdsRef = reactExports.useRef(new Set());
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  reactExports.useEffect(() => setLocalTags(registry2.tags), [registry2.tags]);
  const resolvedNames = reactExports.useMemo(
    () => new Map(registry2.tags.map((tag) => [tag.id, resolveName2(tag)])),
    [registry2.tags, resolveName2],
  );
  const pendingName = submittedCreateNameRef.current.trim();
  const pendingKeywordCommitted = Boolean(
    pendingName &&
    localTags.some((tag) => isCanvasKeywordTag(tag) && resolveName2(tag).trim() === pendingName),
  );
  const resetCreate = () => {
    setNewName("");
    setCreating(false);
  };
  const handleCreate = async () => {
    if (creatingSavingRef.current) return;
    const name2 = newName.trim();
    if (!name2) {
      resetCreate();
      return;
    }
    const validation = validateCanvasTagName(name2);
    const duplicate = isTagNameTaken(name2, resolvedNames);
    if (validation || duplicate) {
      dedupedToast.error(
        t2(
          duplicate
            ? "canvasTags.nameTaken"
            : validation === "required"
              ? "canvasTags.nameRequired"
              : "canvasTags.nameTooLong",
        ),
      );
      resetCreate();
      return;
    }
    creatingSavingRef.current = true;
    submittedCreateNameRef.current = name2;
    setCreatingSaving(true);
    try {
      await createTag(name2);
      resetCreate();
    } catch {
      submittedCreateNameRef.current = "";
      dedupedToast.error(t2("canvasTags.saveFailed"));
    } finally {
      creatingSavingRef.current = false;
      setCreatingSaving(false);
    }
  };
  const handleUpdate = reactExports.useCallback(
    async (tagId, patch2) => {
      await updateTag(tagId, patch2);
    },
    [updateTag],
  );
  const handleDragEnd = async ({ active: active2, over }) => {
    if (!over || active2.id === over.id) return;
    const activeTag = localTags.find((tag) => tag.id === active2.id);
    const overTag = localTags.find((tag) => tag.id === over.id);
    if (!activeTag || !overTag || activeTag.kind !== overTag.kind) return;
    const colorTags = localTags.filter(isCanvasColorTag);
    const keywordTags = localTags.filter(isCanvasKeywordTag);
    const group = activeTag.kind === "color" ? colorTags : keywordTags;
    const oldIndex = group.findIndex((tag) => tag.id === active2.id);
    const newIndex = group.findIndex((tag) => tag.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(group, oldIndex, newIndex);
    const next2 =
      activeTag.kind === "color" ? [...reordered, ...keywordTags] : [...colorTags, ...reordered];
    setLocalTags(next2);
    try {
      await reorderTags(next2.map((tag) => tag.id));
    } catch {
      setLocalTags(registry2.tags);
      dedupedToast.error(t2("canvasTags.sortFailed"));
    }
  };
  const handleDelete2 = async (tag) => {
    if (deletingTagIdsRef.current.has(tag.id)) return;
    deletingTagIdsRef.current.add(tag.id);
    try {
      await deleteTag(tag.id);
    } catch {
      dedupedToast.error(t2("canvasTags.deleteFailed"));
    } finally {
      deletingTagIdsRef.current.delete(tag.id);
    }
  };
  return (
    <div
      className="flex max-h-[min(36rem,calc(var(--available-height,36rem)-0.75rem))] w-[248px] flex-col text-popover-foreground"
      data-action-ui-id="canvas.tag-manager"
      data-density="compact"
    >
      <div
        className="min-h-0 flex-1 overflow-y-auto px-2 pt-1.5 pb-2"
        data-action-ui-id="canvas.tag-manager-scroll"
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {[
            {
              key: "color",
              label: t2("canvasTags.colorLabels"),
              tags: localTags.filter(isCanvasColorTag),
            },
            {
              key: "keyword",
              label: t2("canvasTags.keywords"),
              tags: localTags.filter(isCanvasKeywordTag),
            },
          ].map((group) =>
            group.key === "keyword" || group.tags.length > 0 ? (
              <section
                key={group.key}
                className="w-full not-first:mt-2 not-first:border-t not-first:border-border not-first:pt-2"
              >
                <div className="mb-0.5 flex h-7 items-center justify-between px-1">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          className="cursor-help text-[13px] font-normal text-muted-foreground outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          {group.label}
                        </button>
                      }
                    />
                    <TooltipContent className="max-w-64" side="top" align="start">
                      {t2(
                        group.key === "color"
                          ? "canvasTags.canvasLabelInfo"
                          : "canvasTags.keywordInfo",
                      )}
                    </TooltipContent>
                  </Tooltip>
                  {group.key === "keyword" ? (
                    <button
                      type="button"
                      disabled={creating}
                      aria-label={t2("canvasTags.newKeyword")}
                      data-action-ui-id="canvas.tag-manager-new"
                      className="-mr-1 flex h-6 shrink-0 items-center gap-0.5 rounded-full border border-border px-[7px] text-[11px] text-foreground/70 outline-hidden hover:border-foreground/80 hover:bg-popup-item-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                      onClick={() => {
                        submittedCreateNameRef.current = "";
                        setNewName("");
                        setCreating(true);
                      }}
                    >
                      <Icon icon={Plus} size="xs" strokeWidth={1.5} aria-hidden={true} />
                      <span>{t2("canvasTags.add")}</span>
                    </button>
                  ) : null}
                </div>
                <SortableContext
                  items={group.tags.map((tag) => tag.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex w-full flex-col gap-0.5">
                    {group.tags.map((tag) => (
                      <SortableTagRow
                        key={tag.id}
                        tag={tag}
                        label={resolveName2(tag)}
                        resolvedNames={resolvedNames}
                        onUpdate={handleUpdate}
                        onDelete={(target) => void handleDelete2(target)}
                        assetCount={assetCountsByTag?.get(tag.id) ?? 0}
                        downloadDisabled={
                          !downloadEnabled || Boolean(downloadingTagId || downloadingAll)
                        }
                        downloading={tag.id === downloadingTagId}
                        onDownload={onDownloadTag ? () => void onDownloadTag(tag) : void 0}
                      />
                    ))}
                    {group.key === "keyword" && creating && !pendingKeywordCommitted ? (
                      <div
                        className="w-full rounded-md px-1 py-0.5"
                        data-action-ui-id="canvas.tag-manager-create-row"
                      >
                        <div className="grid min-h-8 w-full grid-cols-[16px_minmax(0,1fr)_24px_24px] items-center gap-x-1.5">
                          <span
                            className="size-4 shrink-0 rounded-full border-[1px] border-solid border-[rgba(0,0,0,0.3)] dark:border-[rgba(255,255,255,0.4)]"
                            aria-hidden={true}
                          />
                          <Input3
                            autoFocus={true}
                            value={newName}
                            disabled={creatingSaving}
                            placeholder={t2("canvasTags.keywordPlaceholder")}
                            aria-label={t2("canvasTags.keywordPlaceholder")}
                            data-action-ui-id="canvas.tag-manager-create-input"
                            className="col-span-3 h-8 min-w-0 w-full rounded-md px-1.5 py-0 text-[13px] font-normal"
                            onChange={(event) =>
                              setNewName(tagNameInputLimit.acceptChange(event.target.value))
                            }
                            onCompositionStart={tagNameInputLimit.startComposition}
                            onCompositionEnd={(event) =>
                              setNewName(
                                tagNameInputLimit.finishComposition(event.currentTarget.value),
                              )
                            }
                            onBlur={() => void handleCreate()}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void handleCreate();
                              }
                              if (event.key === "Escape") {
                                event.preventDefault();
                                event.stopPropagation();
                                resetCreate();
                              }
                            }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </SortableContext>
              </section>
            ) : null,
          )}
        </DndContext>
      </div>
      {onDownloadAllTagged ? (
        <div className="relative shrink-0 px-2 py-1.5 before:absolute before:top-0 before:right-2 before:left-2 before:border-t before:border-border before:content-['']">
          <Button$1
            variant="ghost"
            size="sm"
            aria-label={t2("canvasTags.downloadAllTagged")}
            disabled={
              !downloadEnabled ||
              taggedAssetCount === 0 ||
              Boolean(downloadingTagId) ||
              downloadingAll
            }
            className="group/download-all grid h-9 w-full grid-cols-[minmax(0,1fr)_24px] items-center gap-0 rounded-md border-transparent bg-transparent px-1 text-foreground/70 hover:bg-transparent hover:text-black focus-visible:bg-transparent focus-visible:text-black dark:hover:bg-transparent dark:hover:text-white dark:focus-visible:bg-transparent dark:focus-visible:text-white"
            data-action-ui-id="canvas.tag-manager-download-all"
            onClick={() => void onDownloadAllTagged()}
          >
            <span className="min-w-0 truncate text-left text-[13px] font-normal">
              {t2("canvasTags.downloadAllTagged")}
            </span>
            <span
              className="flex size-7 items-center justify-center justify-self-center rounded-full border border-foreground/10 bg-transparent text-popover-foreground transition-colors group-hover/download-all:border-black/50 group-hover/download-all:text-black group-focus-visible/download-all:border-black/50 group-focus-visible/download-all:text-black dark:group-hover/download-all:border-white/50 dark:group-hover/download-all:text-white dark:group-focus-visible/download-all:border-white/50 dark:group-focus-visible/download-all:text-white"
              data-action-ui-id="canvas.tag-manager-download-all-icon"
            >
              <Icon
                icon={downloadingAll ? Loader2 : Download}
                size="md"
                strokeWidth={1.725}
                className={downloadingAll ? "animate-spin" : void 0}
                aria-hidden={true}
              />
            </span>
          </Button$1>
        </div>
      ) : null}
    </div>
  );
}
function getAssetLabel(asset) {
  return asset.name?.trim() || asset.path.split(/[\\/]/).pop() || asset.id;
}
function AssetTypeThumbnail({ item }) {
  const [failed, setFailed] = reactExports.useState(false);
  if (item.thumbnailUrl && !failed) {
    return (
      <img
        src={item.thumbnailUrl}
        alt=""
        className="size-7 shrink-0 rounded-md object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  const fallbackIcon =
    item.asset.type === "video"
      ? Video
      : item.asset.type === "audio"
        ? Music2
        : item.asset.type === "image"
          ? ImageOutlineIcon
          : FileText;
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
      <Icon icon={fallbackIcon} size="sm" aria-hidden={true} />
    </span>
  );
}
export function CanvasGlobalTagManager({
  workspaceId: workspaceId2,
  workspaceAssets,
  activeTagId,
  onActiveTagChange,
  focusedNodeIndex,
  matchedNodeCount,
  onFocusPrevious,
  onFocusNext,
  onLocateNode,
  onClearFilter,
  downloadEnabled,
  downloadingTagId,
  downloadingAll,
  onDownloadTag,
  onDownloadAllTagged,
}) {
  const { t: t2 } = useTranslation();
  const tagNameInputLimit = useCanvasTagNameInputLimit();
  const resolveName2 = useCanvasTagName();
  const { registry: registry2, toggleTagForAssets, updateTag } = useCanvasTags();
  const gatewayUrl2 = useGatewayUrl();
  const canvasNodeIdsByAsset = useCanvasAssetNodeIds(workspaceId2);
  const [open, setOpen] = reactExports.useState(false);
  const [paletteOpen, setPaletteOpen] = reactExports.useState(false);
  const [previewedTagId, setPreviewedTagId] = reactExports.useState();
  const [clearingTagId, setClearingTagId] = reactExports.useState();
  const [renamingTagId, setRenamingTagId] = reactExports.useState();
  const [renameDraft, setRenameDraft] = reactExports.useState("");
  const [renameSaving, setRenameSaving] = reactExports.useState(false);
  const renameSavingRef = reactExports.useRef(false);
  const renameInputRef = reactExports.useRef(null);
  const managerTriggerRef = reactExports.useRef(null);
  const paletteCloseTimerRef = reactExports.useRef(void 0);
  const managerId = reactExports.useId();
  const label = t2("canvasTags.manage");
  const canvasItemsByTag = reactExports.useMemo(() => {
    const itemsByTag = new Map();
    for (const asset of workspaceAssets) {
      const nodeIds = canvasNodeIdsByAsset.get(asset.id) ?? [];
      if (nodeIds.length === 0) continue;
      const label2 = getAssetLabel(asset);
      const mediaPath =
        asset.type === "image"
          ? API_PATHS.serveFile(asset.path)
          : asset.type === "video" || asset.type === "audio"
            ? API_PATHS.thumbnail(asset.path)
            : void 0;
      const thumbnailUrl = mediaPath ? withThumbnail(gatewayUrl2(mediaPath), 28) : void 0;
      for (const tagId of asset.tagIds ?? []) {
        const taggedItems = itemsByTag.get(tagId) ?? [];
        nodeIds.forEach((nodeId, index2) => {
          taggedItems.push({
            asset,
            label: nodeIds.length > 1 ? `${label2} · ${index2 + 1}` : label2,
            nodeId,
            previewResource: {
              nodeId,
              assetId: asset.id,
              type: asset.type,
              name: label2,
              url: gatewayUrl2(API_PATHS.serveFile(asset.path)) ?? "",
              path: asset.path,
              width: asset.width,
              height: asset.height,
              durationSec: asset.duration,
              fileSize: asset.fileSize,
              metadata: asset.metadata,
            },
            thumbnailUrl,
          });
        });
        itemsByTag.set(tagId, taggedItems);
      }
    }
    return itemsByTag;
  }, [canvasNodeIdsByAsset, gatewayUrl2, workspaceAssets]);
  const countsByTag = reactExports.useMemo(
    () =>
      new Map(Array.from(canvasItemsByTag, ([tagId, taggedItems]) => [tagId, taggedItems.length])),
    [canvasItemsByTag],
  );
  const { assetCountsByTag, taggedAssetCount } = reactExports.useMemo(
    () =>
      summarizeCanvasTagDownloads(
        workspaceAssets,
        new Set(canvasNodeIdsByAsset.keys()),
        registry2.tags,
      ),
    [canvasNodeIdsByAsset, registry2.tags, workspaceAssets],
  );
  const tagsWithCanvasAssets = registry2.tags
    .filter(isCanvasColorTag)
    .filter((tag) => (countsByTag.get(tag.id) ?? 0) > 0);
  const activeTag = tagsWithCanvasAssets.find((tag) => tag.id === activeTagId);
  const visibleTags = tagsWithCanvasAssets;
  reactExports.useEffect(() => {
    if (activeTagId && !activeTag) onActiveTagChange(void 0);
  }, [activeTag, activeTagId, onActiveTagChange]);
  const resolvedNames = reactExports.useMemo(
    () => new Map(registry2.tags.map((tag) => [tag.id, resolveName2(tag)])),
    [registry2.tags, resolveName2],
  );
  reactExports.useEffect(() => {
    if (!renamingTagId) return;
    const input = renameInputRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [renamingTagId]);
  reactExports.useEffect(() => {
    if (!open) return;
    setPaletteOpen(false);
    setPreviewedTagId(void 0);
  }, [open]);
  reactExports.useEffect(
    () => () => {
      if (paletteCloseTimerRef.current) clearTimeout(paletteCloseTimerRef.current);
    },
    [],
  );
  const hasLabelDefinitions = registry2.tags.some(isCanvasColorTag);
  const hasTaggedCanvasAssets = visibleTags.length > 0;
  const emptyStateLabel = hasLabelDefinitions
    ? t2("canvasTags.noTaggedAssets")
    : t2("canvasTags.noLabelsCreate");
  const openPalette = () => {
    if (!hasTaggedCanvasAssets || open) return;
    if (paletteCloseTimerRef.current) clearTimeout(paletteCloseTimerRef.current);
    setPaletteOpen(true);
  };
  const schedulePaletteClose = () => {
    if (paletteCloseTimerRef.current) clearTimeout(paletteCloseTimerRef.current);
    paletteCloseTimerRef.current = setTimeout(() => setPaletteOpen(false), 120);
  };
  const managerTrigger = (
    <CanvasToolbarExtensionButton
      ref={managerTriggerRef}
      label={label}
      onClick={() => void 0}
      tooltipContent={hasTaggedCanvasAssets ? null : emptyStateLabel}
      dataActionUiId="canvas.toolbar-tags"
      kind="panel"
      active={open}
      controlsId={managerId}
      hasPopup="dialog"
      className="canvas-global-tag-manager__manager"
      data-label-state={hasTaggedCanvasAssets ? "populated" : "empty"}
      onMouseEnter={openPalette}
      onMouseLeave={schedulePaletteClose}
      onFocus={openPalette}
      onBlur={schedulePaletteClose}
    >
      <Icon
        icon={CanvasLabelIcon}
        tone="control"
        size="lg"
        strokeWidth={1.25}
        className={
          hasTaggedCanvasAssets ? "scale-110" : "scale-110 opacity-55 [stroke-dasharray:4_2]"
        }
        aria-hidden={true}
      />
    </CanvasToolbarExtensionButton>
  );
  const popoverTrigger = <PopoverTrigger render={managerTrigger} />;
  const handleClearTag = async (tag) => {
    if (clearingTagId) return;
    const taggedAssetIds = new Set(
      (canvasItemsByTag.get(tag.id) ?? []).map((item) => item.asset.id),
    );
    const taggedAssets = workspaceAssets.filter((asset) => taggedAssetIds.has(asset.id));
    if (taggedAssets.length === 0) return;
    setClearingTagId(tag.id);
    try {
      await toggleTagForAssets(tag.id, taggedAssets);
      if (activeTagId === tag.id) onActiveTagChange(void 0);
    } catch {
      dedupedToast.error(t2("canvasTags.clearTagFailed"));
    } finally {
      setClearingTagId(void 0);
    }
  };
  const finishRename = () => {
    setRenamingTagId(void 0);
    setRenameSaving(false);
  };
  const cancelRename = (currentName) => {
    setRenameDraft(currentName);
    finishRename();
  };
  const commitRename = async (tag, currentName) => {
    if (renameSavingRef.current) return;
    const name2 = renameDraft.trim();
    const validation = validateCanvasTagName(name2);
    const duplicate = isTagNameTaken(name2, resolvedNames, tag.id);
    if (validation || duplicate) {
      dedupedToast.error(
        t2(
          duplicate
            ? "canvasTags.nameTaken"
            : validation === "required"
              ? "canvasTags.nameRequired"
              : "canvasTags.nameTooLong",
        ),
      );
      cancelRename(currentName);
      return;
    }
    if (name2 === currentName) {
      finishRename();
      return;
    }
    renameSavingRef.current = true;
    setRenameSaving(true);
    try {
      await updateTag(tag.id, {
        name: name2,
      });
      finishRename();
    } catch {
      setRenameDraft(currentName);
      finishRename();
      dedupedToast.error(t2("canvasTags.saveFailed"));
    } finally {
      renameSavingRef.current = false;
    }
  };
  return (
    <div
      className="canvas-global-tag-manager flex h-full items-center"
      data-action-ui-id="canvas.tag-filter-toolbar"
      data-expanded={open || paletteOpen || previewedTagId ? "true" : "false"}
    >
      <Popover open={open} onOpenChange={setOpen}>
        {popoverTrigger}
        <PopoverContent
          anchor={managerTriggerRef.current}
          id={managerId}
          role="dialog"
          aria-label={label}
          side="top"
          align="center"
          sideOffset={8}
          collisionAvoidance={{
            side: "none",
            align: "shift",
            fallbackAxisSide: "none",
          }}
          collisionPadding={{
            top: 8,
            right: 8,
            bottom: CANVAS_TOOL_DOCK_SAFE_BOTTOM_PX,
            left: 8,
          }}
          className="w-auto gap-0 p-1.5"
          data-action-ui-id="canvas.global-tag-manager"
        >
          <CanvasTagManagerPanel
            assetCountsByTag={assetCountsByTag}
            taggedAssetCount={taggedAssetCount}
            downloadEnabled={downloadEnabled}
            downloadingAll={downloadingAll}
            downloadingTagId={downloadingTagId}
            onDownloadAllTagged={onDownloadAllTagged}
            onDownloadTag={onDownloadTag}
          />
        </PopoverContent>
      </Popover>
      {hasTaggedCanvasAssets && (
        <Popover open={!open && paletteOpen} modal={false}>
          <PopoverContent
            motion="legacy"
            anchor={managerTriggerRef.current}
            initialFocus={false}
            finalFocus={false}
            side="top"
            sideOffset={8}
            align="center"
            collisionAvoidance={{
              side: "none",
              align: "shift",
              fallbackAxisSide: "none",
            }}
            collisionPadding={12}
            className="w-auto gap-0 p-1.5"
            role="group"
            aria-label={t2("canvasTags.colorLabels")}
            onMouseEnter={openPalette}
            onMouseLeave={schedulePaletteClose}
            onFocusCapture={openPalette}
            onBlurCapture={schedulePaletteClose}
          >
            <div
              className="canvas-global-tag-manager__palette flex h-7 items-center pl-0.5"
              data-action-ui-id="canvas.tag-dock-palette"
            >
              {visibleTags.map((tag) => {
                const name2 = resolveName2(tag);
                const items = canvasItemsByTag.get(tag.id) ?? [];
                const count2 = items.length;
                const countLabel = t2("canvasTags.canvasAssetCount", {
                  count: count2,
                });
                const active2 = tag.id === activeTagId;
                const downloading = downloadingTagId === tag.id;
                const clearing = clearingTagId === tag.id;
                return (
                  <PreviewCard$1
                    key={tag.id}
                    open={!open && previewedTagId === tag.id}
                    onOpenChange={(nextOpen) => {
                      if (open) return;
                      setPreviewedTagId((currentTagId) => {
                        if (nextOpen) return tag.id;
                        return currentTagId === tag.id ? void 0 : currentTagId;
                      });
                    }}
                  >
                    <PreviewCardTrigger
                      delay={20}
                      closeDelay={180}
                      render={
                        <CanvasToolbarExtensionButton
                          label={`${name2}: ${countLabel}`}
                          tooltipContent={null}
                          onClick={() => onActiveTagChange(active2 ? void 0 : tag.id)}
                          dataActionUiId="canvas.toolbar-tag-filter"
                          data-tag-id={tag.id}
                          kind="toggle"
                          active={active2}
                          className="canvas-global-tag-manager__tag aria-pressed:!h-[calc(100%-4px)] aria-pressed:!rounded-full focus-visible:ring-0!"
                          style={{
                            "--canvas-tag-color": getCanvasTagPresentationColor(tag.color),
                            "--canvas-tag-selected-foreground": getCanvasTagSelectedForegroundColor(
                              tag.color,
                            ),
                          }}
                        >
                          <span
                            data-canvas-tag-swatch=""
                            className="size-3 scale-[1.2] shrink-0 rounded-full ring-[1.5px] ring-[var(--canvas-controls-bg)]"
                            style={{
                              backgroundColor: getCanvasTagPresentationColor(tag.color),
                            }}
                            aria-hidden="true"
                          />
                          {active2 && <span className="tabular-nums">{count2}</span>}
                        </CanvasToolbarExtensionButton>
                      }
                    />
                    <PreviewCardContent
                      side="top"
                      sideOffset={8}
                      align="center"
                      collisionPadding={12}
                      className="w-60 p-2"
                    >
                      <div data-action-ui-id="canvas.tag-hover-panel" data-tag-id={tag.id}>
                        <div className="flex h-8 items-center gap-2 px-1">
                          <span
                            className="size-3 shrink-0 rounded-full ring-1 ring-border"
                            style={{
                              backgroundColor: getCanvasTagPresentationColor(tag.color),
                            }}
                            aria-hidden="true"
                          />
                          {renamingTagId === tag.id ? (
                            <input
                              ref={renameInputRef}
                              value={renameDraft}
                              disabled={renameSaving}
                              aria-label={name2}
                              data-action-ui-id="canvas.tag-hover-rename-input"
                              className="h-5 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-medium text-inherit outline-none disabled:opacity-50"
                              onChange={(event) =>
                                setRenameDraft(tagNameInputLimit.acceptChange(event.target.value))
                              }
                              onCompositionStart={tagNameInputLimit.startComposition}
                              onCompositionEnd={(event) =>
                                setRenameDraft(
                                  tagNameInputLimit.finishComposition(event.currentTarget.value),
                                )
                              }
                              onBlur={() => void commitRename(tag, name2)}
                              onDoubleClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  void commitRename(tag, name2);
                                }
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  cancelRename(name2);
                                }
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              className="min-w-0 flex-1 cursor-text truncate rounded-sm border-0 bg-transparent p-0 text-left text-sm font-medium outline-none select-none focus-visible:ring-1 focus-visible:ring-ring/50"
                              data-action-ui-id="canvas.tag-hover-name"
                              onClick={(event) => {
                                if (event.detail !== 0) return;
                                setRenameDraft(name2);
                                setRenamingTagId(tag.id);
                              }}
                              onDoubleClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setRenameDraft(name2);
                                setRenamingTagId(tag.id);
                              }}
                            >
                              {name2}
                            </button>
                          )}
                        </div>
                        <div
                          className="mt-1 max-h-[16.25rem] overflow-y-auto"
                          data-action-ui-id="canvas.tag-hover-assets-scroll"
                        >
                          {items.map((item) => (
                            <PreviewCard$1 key={item.nodeId}>
                              <PreviewCardTrigger
                                delay={120}
                                closeDelay={120}
                                render={
                                  <button
                                    type="button"
                                    data-action-ui-id="canvas.tag-hover-locate"
                                    data-node-id={item.nodeId}
                                    className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm transition-colors hover:bg-popup-item-hover focus-visible:bg-popup-item-hover focus-visible:outline-none"
                                    onClick={() => onLocateNode(item.nodeId)}
                                    aria-label={t2("canvasTags.locateAsset", {
                                      name: item.label,
                                    })}
                                  >
                                    <AssetTypeThumbnail item={item} />
                                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                                  </button>
                                }
                              />
                              <AssetPreviewPopup resource={item.previewResource} side="left" />
                            </PreviewCard$1>
                          ))}
                        </div>
                        <div className="mt-1 border-t border-border pt-1">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md px-1.5 py-2 text-left text-sm transition-colors hover:bg-popup-item-hover focus-visible:bg-popup-item-hover focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
                            disabled={!downloadEnabled || !onDownloadTag || downloading}
                            onClick={() => void onDownloadTag?.(tag)}
                          >
                            <span
                              className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-foreground/75"
                              data-action-ui-id="canvas.tag-hover-download-icon"
                            >
                              <Icon
                                icon={downloading ? Loader2 : Download}
                                size="sm"
                                strokeWidth={2}
                                className={downloading ? "animate-spin" : void 0}
                                aria-hidden={true}
                              />
                            </span>
                            <span>{t2("canvasTags.downloadCurrentTag")}</span>
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md px-1.5 py-2 text-left text-sm transition-colors hover:bg-popup-item-hover focus-visible:bg-popup-item-hover focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
                            disabled={Boolean(clearingTagId)}
                            onClick={() => void handleClearTag(tag)}
                          >
                            <span
                              className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-foreground/75"
                              data-action-ui-id="canvas.tag-hover-clear-icon"
                            >
                              <Icon
                                icon={clearing ? Loader2 : CircleX}
                                size="sm"
                                strokeWidth={2}
                                className={clearing ? "animate-spin" : void 0}
                                aria-hidden={true}
                              />
                            </span>
                            <span>{t2("canvasTags.clearCurrentTag")}</span>
                          </button>
                        </div>
                      </div>
                    </PreviewCardContent>
                  </PreviewCard$1>
                );
              })}
              {activeTag && matchedNodeCount > 1 && (
                <div
                  className="flex h-full items-center"
                  data-action-ui-id="canvas.tag-filter-status"
                  data-focused-node-index={focusedNodeIndex ?? "overview"}
                >
                  <CanvasToolbarExtensionButton
                    label={t2("canvasTags.previousMatch")}
                    title={t2("canvasTags.previousMatch")}
                    onClick={onFocusPrevious}
                    dataActionUiId="canvas.tag-filter-previous"
                    className="!min-w-6 !px-1"
                  >
                    <Icon icon={ChevronLeft} size="xs" aria-hidden={true} />
                  </CanvasToolbarExtensionButton>
                  <CanvasToolbarExtensionButton
                    label={t2("canvasTags.nextMatch")}
                    title={t2("canvasTags.nextMatch")}
                    onClick={onFocusNext}
                    dataActionUiId="canvas.tag-filter-next"
                    className="!min-w-6 !px-1"
                  >
                    <Icon icon={ChevronRight$1} size="xs" aria-hidden={true} />
                  </CanvasToolbarExtensionButton>
                </div>
              )}
              {activeTag ? (
                <CanvasToolbarExtensionButton
                  label={t2("canvasTags.clearFilter")}
                  title={t2("canvasTags.clearFilter")}
                  onClick={onClearFilter}
                  dataActionUiId="canvas.tag-filter-clear"
                  className="canvas-global-tag-manager__palette-action"
                >
                  <Icon icon={X$7} size="md" aria-hidden={true} />
                </CanvasToolbarExtensionButton>
              ) : (
                <CanvasToolbarExtensionButton
                  label={label}
                  title={label}
                  onClick={() => setOpen(true)}
                  dataActionUiId="canvas.tag-palette-manage"
                  kind="panel"
                  active={open}
                  controlsId={managerId}
                  hasPopup="dialog"
                  className="canvas-global-tag-manager__palette-action"
                >
                  <Icon icon={Ellipsis} size="md" aria-hidden={true} />
                </CanvasToolbarExtensionButton>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
