// canvas-tag-picker-panel.jsx
import { Check, Minus, Plus, reactExports, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import {
  Icon,
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  isCanvasColorTag,
  isCanvasKeywordTag,
  isTagNameTaken,
  validateCanvasTagName,
} from "../infra/parse-connector-selection.js";
import { getCanvasTagPresentationColor } from "../assets/inline-input.jsx";
import { useCanvasTagNameInputLimit } from "./use-canvas-tag-name-input-limit.js";
import { TooltipContent } from "../infra/dialog-content.jsx";
import { Input3 as Input } from "../infra/select-content.jsx";
import { useCanvasTags } from "./use-canvas-tags.js";
import { aggregateTagState } from "./conflict-resolution-dialog.jsx";
import { useCanvasTagName } from "../assets/use-canvas-model-registry-hydration.js";

const TAG_RENAME_DOUBLE_CLICK_WINDOW_MS = 280;

function TagRow({
  tag,
  label,
  state,
  disabled,
  onToggle,
  allowRename,
  resolvedNames,
  onRename,
  onEditingChange,
  onBlurSave,
}) {
  const { t: translate } = useTranslation();
  const tagNameInputLimit = useCanvasTagNameInputLimit();
  const [editing, setEditing] = reactExports.useState(false);
  const [draft, setDraft] = reactExports.useState(label);
  const [saving, setSaving] = reactExports.useState(false);
  const savingRef = reactExports.useRef(false);
  const renameInputRef = reactExports.useRef(null);
  const selectionIntentTimerRef = reactExports.useRef(null);
  reactExports.useEffect(() => setDraft(label), [label]);
  reactExports.useEffect(
    () => () => {
      if (selectionIntentTimerRef.current)
        clearTimeout(selectionIntentTimerRef.current);
    },
    [],
  );
  reactExports.useEffect(() => {
    if (!editing) return;
    const input = renameInputRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [editing]);
  const finishRename = () => {
    setEditing(false);
    onEditingChange?.(false);
  };
  const cancelRename = () => {
    setDraft(label);
    finishRename();
  };
  const commitRename = async () => {
    if (savingRef.current) return;
    const trimmedName = draft.trim();
    const validation = validateCanvasTagName(trimmedName);
    const duplicate = isTagNameTaken(trimmedName, resolvedNames, tag.id);
    if (validation || duplicate) {
      dedupedToast.error(
        translate(
          duplicate
            ? "canvasTags.nameTaken"
            : validation === "required"
              ? "canvasTags.nameRequired"
              : "canvasTags.nameTooLong",
        ),
      );
      cancelRename();
      return;
    }
    if (trimmedName === label) {
      finishRename();
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await onRename(trimmedName);
      finishRename();
    } catch {
      setDraft(label);
      finishRename();
      dedupedToast.error(translate("canvasTags.saveFailed"));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const isColorTag = isCanvasColorTag(tag);
  const marker = isColorTag ? (
    <span
      className="size-[13px] shrink-0 rounded-full ring-1 ring-border"
      style={{
        backgroundColor: getCanvasTagPresentationColor(tag.color),
      }}
      aria-hidden={true}
    />
  ) : (
    <span
      className="size-[13px] shrink-0 rounded-full border-[1px] border-solid border-[rgba(0,0,0,0.4)] dark:border-[rgba(255,255,255,0.6)]"
      aria-hidden={true}
    />
  );
  const handleSelectionIntent = () => {
    if (!allowRename) {
      onToggle();
      return;
    }
    if (selectionIntentTimerRef.current) return;
    selectionIntentTimerRef.current = setTimeout(() => {
      selectionIntentTimerRef.current = null;
      onToggle();
    }, TAG_RENAME_DOUBLE_CLICK_WINDOW_MS);
  };
  if (editing) {
    return (
      <div className="flex h-8 w-full items-center gap-2.5 rounded-md py-1.5 pr-2 pl-[9px] text-[13px]">
        {marker}
        <input
          ref={renameInputRef}
          value={draft}
          disabled={saving}
          aria-label={label}
          className="h-5 min-w-0 flex-1 border-0 bg-transparent p-0 text-inherit outline-none disabled:opacity-50"
          onChange={(event) =>
            setDraft(tagNameInputLimit.acceptChange(event.target.value))
          }
          onCompositionStart={tagNameInputLimit.startComposition}
          onCompositionEnd={(event) =>
            setDraft(
              tagNameInputLimit.finishComposition(event.currentTarget.value),
            )
          }
          onBlur={() => {
            onBlurSave?.();
            void commitRename();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void commitRename();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              cancelRename();
            }
          }}
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={state === "mixed" ? "mixed" : state === "all"}
      disabled={disabled}
      data-action-ui-id="canvas.node-tag-option"
      data-tag-id={tag.id}
      className="flex min-h-8 w-full cursor-pointer items-center gap-2.5 rounded-md py-1.5 pr-2 pl-[9px] text-[13px] outline-hidden select-none hover:bg-popup-item-hover focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
      onClick={handleSelectionIntent}
      onDoubleClick={(event) => {
        if (!allowRename || disabled) return;
        if (selectionIntentTimerRef.current) {
          clearTimeout(selectionIntentTimerRef.current);
          selectionIntentTimerRef.current = null;
        }
        event.preventDefault();
        event.stopPropagation();
        setDraft(label);
        setEditing(true);
        onEditingChange?.(true);
      }}
    >
      {marker}
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      <span
        data-slot="menu-selection-indicator"
        className="flex size-4 shrink-0 items-center justify-center text-muted-foreground"
        aria-hidden={true}
      >
        {state === "all" ? (
          <Icon icon={Check} size="md" strokeWidth={2} />
        ) : state === "mixed" ? (
          <Icon icon={Minus} size="md" strokeWidth={2} />
        ) : null}
      </span>
    </button>
  );
}

export function CanvasTagPickerPanel({
  assets,
  allowRename = false,
  embedded = false,
  selectionMode = "toggle",
  onRenameEditingChange,
  onRenameBlurSave,
}) {
  const { t: translate } = useTranslation();
  const tagNameInputLimit = useCanvasTagNameInputLimit();
  const tagName = useCanvasTagName();
  const {
    registry,
    toggleTagForAssets,
    assignTagToAssets,
    createTag,
    updateTag,
  } = useCanvasTags();
  const [creating, setCreating] = reactExports.useState(false);
  const [newName, setNewName] = reactExports.useState("");
  const [creatingSaving, setCreatingSaving] = reactExports.useState(false);
  const [pendingTagIds, setPendingTagIds] = reactExports.useState(
    () => new Set(),
  );
  const creatingSavingRef = reactExports.useRef(false);
  const pendingTagIdsRef = reactExports.useRef(new Set());
  const resolvedNames = reactExports.useMemo(
    () => new Map(registry.tags.map((tag) => [tag.id, tagName(tag)])),
    [registry.tags, tagName],
  );
  const duplicateTag = reactExports.useMemo(() => {
    const trimmedName = newName.trim();
    if (!trimmedName) return void 0;
    return registry.tags.find((tag) => tagName(tag).trim() === trimmedName);
  }, [newName, registry.tags, tagName]);
  const pendingCreateName = creatingSaving ? newName.trim() : "";
  const pendingKeywordCommitted = Boolean(
    pendingCreateName &&
    registry.tags.some(
      (tag) =>
        isCanvasKeywordTag(tag) && tagName(tag).trim() === pendingCreateName,
    ),
  );
  const nameValidation = validateCanvasTagName(newName);
  const changeSelection = reactExports.useCallback(
    async (tag, state) => {
      if (pendingTagIdsRef.current.has(tag.id)) return;
      if (
        selectionMode === "single" &&
        tag.kind === "color" &&
        state === "all"
      )
        return;
      pendingTagIdsRef.current.add(tag.id);
      setPendingTagIds((current) => new Set(current).add(tag.id));
      try {
        if (selectionMode === "single" && tag.kind === "color") {
          await assignTagToAssets(tag.id, assets);
        } else {
          await toggleTagForAssets(tag.id, assets);
        }
      } catch {
        dedupedToast.error(translate("canvasTags.saveFailed"));
      } finally {
        pendingTagIdsRef.current.delete(tag.id);
        setPendingTagIds((current) => {
          const next = new Set(current);
          next.delete(tag.id);
          return next;
        });
      }
    },
    [assets, assignTagToAssets, selectionMode, translate, toggleTagForAssets],
  );
  const resetCreate = () => {
    setNewName("");
    setCreating(false);
    onRenameEditingChange?.(false);
  };
  const handleCreate = async () => {
    if (creatingSavingRef.current) return;
    const trimmedName = newName.trim();
    if (!trimmedName) {
      resetCreate();
      return;
    }
    if (nameValidation) {
      dedupedToast.error(
        translate(
          nameValidation === "required"
            ? "canvasTags.nameRequired"
            : "canvasTags.nameTooLong",
        ),
      );
      resetCreate();
      return;
    }
    creatingSavingRef.current = true;
    setCreatingSaving(true);
    try {
      if (duplicateTag) {
        await assignTagToAssets(duplicateTag.id, assets);
      } else {
        await createTag(trimmedName, assets);
      }
      resetCreate();
    } catch {
      dedupedToast.error(translate("canvasTags.saveFailed"));
      resetCreate();
    } finally {
      creatingSavingRef.current = false;
      setCreatingSaving(false);
    }
  };
  const surfaceClass = embedded
    ? "text-popover-foreground"
    : "elevated-surface-border rounded-lg bg-popover p-1.5 text-popover-foreground shadow-lg";
  const colorTags = registry.tags.filter(isCanvasColorTag);
  const keywordTags = registry.tags.filter(isCanvasKeywordTag);
  return (
    <div
      data-action-ui-id="canvas.node-tag-picker"
      className={`w-[212px] ${surfaceClass}`}
    >
      <div className="max-h-[min(32rem,var(--available-height,32rem))] overflow-y-auto">
        {colorTags.length > 0 ? (
          <div>
            <div className="mb-0.5 px-2 py-1">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="cursor-help text-[13px] font-normal text-muted-foreground outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      {translate("canvasTags.colorLabels")}
                    </button>
                  }
                />
                <TooltipContent className="max-w-64" side="top" align="start">
                  {translate("canvasTags.canvasLabelInfo")}
                </TooltipContent>
              </Tooltip>
            </div>
            {colorTags.map((tag) => {
              const state = aggregateTagState(tag.id, assets);
              return (
                <TagRow
                  key={tag.id}
                  tag={tag}
                  label={tagName(tag)}
                  state={state}
                  disabled={pendingTagIds.has(tag.id)}
                  allowRename={allowRename}
                  resolvedNames={resolvedNames}
                  onToggle={() => changeSelection(tag, state)}
                  onRename={async (updatedTagName) => {
                    await updateTag(tag.id, {
                      name: updatedTagName,
                    });
                  }}
                  onEditingChange={onRenameEditingChange}
                  onBlurSave={onRenameBlurSave}
                />
              );
            })}
          </div>
        ) : null}
        <div
          className="mx-2 my-2 border-t border-border/60"
          aria-hidden={true}
        />
        <div>
          <div className="mb-0.5 flex h-8 items-center justify-between px-2">
            <div className="flex items-center">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="cursor-help text-[13px] font-normal text-muted-foreground outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      {translate("canvasTags.keywords")}
                    </button>
                  }
                />
                <TooltipContent className="max-w-64" side="top" align="start">
                  {translate("canvasTags.keywordInfo")}
                </TooltipContent>
              </Tooltip>
            </div>
            <button
              type="button"
              disabled={creating}
              aria-label={translate("canvasTags.newKeyword")}
              data-action-ui-id="canvas.node-tag-create"
              className="-mr-1 flex h-[22px] shrink-0 cursor-default items-center gap-0.5 rounded-full border border-border px-[7px] text-[11px] text-foreground/70 outline-hidden hover:border-foreground/80 hover:bg-popup-item-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
              onClick={() => {
                setNewName("");
                setCreating(true);
                onRenameEditingChange?.(true);
              }}
            >
              <Icon
                icon={Plus}
                size="xs"
                strokeWidth={1.5}
                aria-hidden={true}
              />
              <span>{translate("canvasTags.add")}</span>
            </button>
          </div>
          {keywordTags.map((tag) => {
            const state = aggregateTagState(tag.id, assets);
            return (
              <TagRow
                key={tag.id}
                tag={tag}
                label={tagName(tag)}
                state={state}
                disabled={pendingTagIds.has(tag.id)}
                allowRename={allowRename}
                resolvedNames={resolvedNames}
                onToggle={() => changeSelection(tag, state)}
                onRename={async (updatedTagName) => {
                  await updateTag(tag.id, {
                    name: updatedTagName,
                  });
                }}
                onEditingChange={onRenameEditingChange}
                onBlurSave={onRenameBlurSave}
              />
            );
          })}
          {creating && !pendingKeywordCommitted ? (
            <div className="flex h-8 w-full items-center gap-2.5 py-0.5 pr-2 pl-[9px]">
              <span
                className="size-[13px] shrink-0 rounded-full border-[1px] border-solid border-[rgba(0,0,0,0.4)] dark:border-[rgba(255,255,255,0.6)]"
                aria-hidden={true}
              />
              <Input
                autoFocus={true}
                value={newName}
                disabled={creatingSaving}
                placeholder={translate("canvasTags.keywordPlaceholder")}
                aria-label={translate("canvasTags.keywordPlaceholder")}
                data-action-ui-id="canvas.node-tag-create-input"
                className="h-7 flex-1 rounded-[8px] border-[0.75px] px-2 text-[13px] focus-visible:ring-0"
                onChange={(event) =>
                  setNewName(tagNameInputLimit.acceptChange(event.target.value))
                }
                onCompositionStart={tagNameInputLimit.startComposition}
                onCompositionEnd={(event) =>
                  setNewName(
                    tagNameInputLimit.finishComposition(
                      event.currentTarget.value,
                    ),
                  )
                }
                onBlur={() => {
                  onRenameBlurSave?.();
                  void handleCreate();
                }}
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
          ) : null}
        </div>
      </div>
    </div>
  );
}
