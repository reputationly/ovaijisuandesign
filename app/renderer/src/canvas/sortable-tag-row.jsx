// sortable-tag-row.jsx
import { CSS$1 as CSS, reactExports, useSortable, useTranslation, X$7 as X } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import {
  Icon,
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { useCanvasTagNameInputLimit } from "./use-canvas-tag-name-input-limit.js";
import { Download } from "../media-editing/package.jsx";
import {
  isCanvasColorTag,
  isCanvasKeywordTag,
  isTagNameTaken,
  validateCanvasTagName,
} from "../infra/parse-connector-selection.js";
import {
  Button,
  cn$2 as cn,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import { getCanvasTagPresentationColor } from "../assets/inline-input.jsx";
import { Input3 } from "../infra/select-content.jsx";
export function SortableTagRow({
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
  const { onPointerDown: onPointerDown2, ...keyboardListeners } =
    listeners2 ?? {};
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
        transform: CSS.Transform.toString(transform2),
        transition: transition2,
        opacity: isDragging ? 0.92 : 1,
      }}
      className={cn(
        "group/row w-full rounded-md px-1 py-0.5 transition-[background-color,box-shadow,opacity]",
        isDragging &&
          "relative z-10 bg-popup-item-hover shadow-sm ring-1 ring-border",
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
            className={cn(
              "-m-2.5 flex size-9 items-center justify-center rounded-md",
              !keywordTag &&
                "cursor-grab touch-none select-none active:cursor-grabbing",
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
                      className={cn(
                        "group/keyword-delete flex size-4 shrink-0 items-center justify-center rounded-full border-[1px] border-solid border-[rgba(0,0,0,0.3)] outline-hidden transition-[background-color,border-color,opacity] focus-visible:ring-2 focus-visible:ring-ring/50 dark:border-[rgba(255,255,255,0.4)]",
                        !editing &&
                          "group-hover/delete-zone:border-foreground group-hover/delete-zone:bg-foreground group-hover/delete-zone:opacity-100 focus-visible:border-foreground focus-visible:bg-foreground focus-visible:opacity-100",
                      )}
                      onClick={() => onDelete(tag)}
                    >
                      <Icon
                        icon={X}
                        size="xs"
                        strokeWidth={3}
                        className={cn(
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
              className={cn(
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
              onChange={(event) =>
                setDraft(tagNameInputLimit.acceptChange(event.target.value))
              }
              onCompositionStart={tagNameInputLimit.startComposition}
              onCompositionEnd={(event) =>
                setDraft(
                  tagNameInputLimit.finishComposition(
                    event.currentTarget.value,
                  ),
                )
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
              <Button
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
                <Icon
                  icon={Download}
                  size="md"
                  className="scale-[1.15]"
                  aria-hidden={true}
                />
              </Button>
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
        <p className="pb-1 pl-[26px] text-xs text-destructive">
          {t2("canvasTags.nameTaken")}
        </p>
      ) : null}
    </div>
  );
}
