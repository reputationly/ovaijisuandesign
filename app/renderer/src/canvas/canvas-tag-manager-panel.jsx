// canvas-tag-manager-panel.jsx
import {
  arrayMove,
  closestCenter,
  dedupedToast,
  DndContext,
  KeyboardSensor,
  Loader2,
  Plus,
  PointerSensor,
  reactExports,
  SortableContext,
  sortableKeyboardCoordinates,
  useSensor,
  useSensors,
  useTranslation,
  verticalListSortingStrategy,
} from "../vendor.js";
import {
  Icon,
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useCanvasTagNameInputLimit } from "./use-canvas-tag-name-input-limit.js";
import { SortableTagRow } from "./sortable-tag-row.jsx";
import { Download } from "../media-editing/package.jsx";
import {
  isCanvasColorTag,
  isCanvasKeywordTag,
  isTagNameTaken,
  validateCanvasTagName,
} from "../infra/parse-connector-selection.js";
import { Button, TooltipContent } from "../infra/dialog-content.jsx";
import { Input3 } from "../infra/select-content.jsx";
import { useCanvasTags } from "./use-canvas-tags.js";
import { useCanvasTagName } from "../assets/use-canvas-model-registry-hydration.js";
export function CanvasTagManagerPanel({
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
  const {
    registry: registry2,
    createTag,
    updateTag,
    reorderTags,
    deleteTag,
  } = useCanvasTags();
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
    localTags.some(
      (tag) =>
        isCanvasKeywordTag(tag) && resolveName2(tag).trim() === pendingName,
    ),
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
      activeTag.kind === "color"
        ? [...reordered, ...keywordTags]
        : [...colorTags, ...reordered];
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
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
                    <TooltipContent
                      className="max-w-64"
                      side="top"
                      align="start"
                    >
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
                      <Icon
                        icon={Plus}
                        size="xs"
                        strokeWidth={1.5}
                        aria-hidden={true}
                      />
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
                          !downloadEnabled ||
                          Boolean(downloadingTagId || downloadingAll)
                        }
                        downloading={tag.id === downloadingTagId}
                        onDownload={
                          onDownloadTag ? () => void onDownloadTag(tag) : void 0
                        }
                      />
                    ))}
                    {group.key === "keyword" &&
                    creating &&
                    !pendingKeywordCommitted ? (
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
                              setNewName(
                                tagNameInputLimit.acceptChange(
                                  event.target.value,
                                ),
                              )
                            }
                            onCompositionStart={
                              tagNameInputLimit.startComposition
                            }
                            onCompositionEnd={(event) =>
                              setNewName(
                                tagNameInputLimit.finishComposition(
                                  event.currentTarget.value,
                                ),
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
          <Button
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
          </Button>
        </div>
      ) : null}
    </div>
  );
}
