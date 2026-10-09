// storyboard-grid-editor.jsx
import {
  reactExports,
  useTranslation,
  TooltipProvider$1,
  useCanvasBridge,
  dedupedToast,
  useNodeId,
  X$7,
  useCanvasActions,
  BACKEND_VIBE_STORYBOARD,
  Plus,
  useEmitDerivedFromBlob,
  useCropViewportZoom,
  getNodeFlowRect,
} from "../vendor.js";
import { StoryboardGridIcon } from "../m01/generating-media-area.jsx";
import {
  createToolInteractionSession,
  beginToolInteractionSession,
  setToolInteractionSessionProgress,
  abandonToolInteractionSession,
  completeToolInteractionSession,
} from "../m03/image-tool-meta.jsx";
import { Tooltip$1 } from "../m01/create-tracker.jsx";
import { PopoverShell } from "../m02/use-direct-reference-picker.jsx";
import { SubmitButton, ExpandToggleButton, GeneratingButton } from "../m01/param-tabs.jsx";
import { ParamSectionLabel, AspectRatioGrid } from "../m01/slider.jsx";
import { Button$2, getAdjacentNodePosition } from "../m01/use-media-node-actions.jsx";
import { PromptTextarea, ParamsChip, ParamsPopup } from "../m01/params-popup.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  DEFAULT_ROTATE_STATE,
  INPLACE_EDIT_TOOLBAR_RESERVE_PX,
  ROTATE_ANGLE_MAX,
  ROTATE_ANGLE_MIN,
  ROTATE_STEP_DEG,
  clamp$5,
  isIdentityRotate,
  normalizeAngle,
  renderRotatedBlob,
  rotatedAabb,
} from "./editor2.jsx";
import { readableGenerationError } from "./multi-angle-editor.jsx";
import {
  MAX_STORYBOARD_PROMPT_LENGTH,
  MAX_STORYBOARD_REFERENCES,
  STORYBOARD_RATIOS,
  isStoryboardGridValid,
  messages,
  nearestValidStoryboardGrid,
  resolveStoryboardGridSelection,
} from "./relight-editor.jsx";
function sourceReference(imageUrl, imagePath) {
  if (!imageUrl) return void 0;
  const sourcePath =
    imagePath ??
    (/^https?:\/\/(?!localhost(?::|\/)|127\.0\.0\.1(?::|\/)|\[::1\](?::|\/))/i.test(imageUrl)
      ? imageUrl
      : void 0);
  return sourcePath
    ? {
        url: imageUrl,
        path: sourcePath,
        locked: true,
      }
    : void 0;
}
function restoredReferences(paths, resolveFileUrl) {
  const seen2 = new Set();
  return paths
    .filter((path2) => path2.length > 0 && !seen2.has(path2) && seen2.add(path2))
    .slice(0, MAX_STORYBOARD_REFERENCES)
    .map((path2, index2) => ({
      path: path2,
      url: resolveFileUrl?.(path2) ?? path2,
      locked: index2 === 0,
    }));
}
function StoryboardGridEditor({
  nodeId,
  replaceNodeId,
  imageUrl,
  imagePath,
  defaultPrompt,
  defaultParams,
  defaultReferencePaths,
  resolveFileUrl,
  isGenerating = false,
  onClose,
}) {
  const { i18n } = useTranslation();
  const t2 = reactExports.useMemo(
    () => (i18n.resolvedLanguage?.startsWith("zh") ? messages.zh : messages.en),
    [i18n.resolvedLanguage],
  );
  const { pickAsset, pricingConfig, submitImg2Image } = useCanvasBridge();
  const { flushPersist } = useCanvasActions();
  const restoredSelection = reactExports.useMemo(
    () => resolveStoryboardGridSelection(defaultParams),
    [defaultParams],
  );
  const [rows, setRows] = reactExports.useState(restoredSelection.rows);
  const [cols, setCols] = reactExports.useState(restoredSelection.cols);
  const [ratio, setRatio] = reactExports.useState(restoredSelection.ratio);
  const [prompt, setPrompt] = reactExports.useState(defaultPrompt ?? "");
  const [references, setReferences] = reactExports.useState(() => {
    if (defaultReferencePaths !== void 0) {
      return restoredReferences(defaultReferencePaths, resolveFileUrl);
    }
    const source = sourceReference(imageUrl, imagePath);
    return source ? [source] : [];
  });
  const [isSubmitting, setIsSubmitting] = reactExports.useState(false);
  const [expanded, setExpanded] = reactExports.useState(false);
  const [ratioOpen, setRatioOpen] = reactExports.useState(false);
  const [gridOpen, setGridOpen] = reactExports.useState(false);
  const [hoveredGrid, setHoveredGrid] = reactExports.useState(null);
  const ratioAnchorRef = reactExports.useRef(null);
  const gridAnchorRef = reactExports.useRef(null);
  const submitLockRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (defaultReferencePaths !== void 0) {
      setReferences(restoredReferences(defaultReferencePaths, resolveFileUrl));
      return;
    }
    setReferences((previous2) => {
      const extras = previous2.filter((reference) => !reference.locked);
      const source = sourceReference(imageUrl, imagePath);
      return source ? [source, ...extras].slice(0, MAX_STORYBOARD_REFERENCES) : extras;
    });
  }, [defaultReferencePaths, imagePath, imageUrl, resolveFileUrl]);
  const selectRatio = reactExports.useCallback(
    (nextRatio) => {
      setRatio(nextRatio);
      const nextGrid = nearestValidStoryboardGrid(nextRatio, rows, cols);
      setRows(nextGrid.rows);
      setCols(nextGrid.cols);
      setRatioOpen(false);
    },
    [cols, rows],
  );
  const selectGrid = reactExports.useCallback(
    (nextRows, nextCols) => {
      if (isSubmitting || !isStoryboardGridValid(ratio, nextRows, nextCols)) return;
      setRows(nextRows);
      setCols(nextCols);
      setHoveredGrid(null);
      setGridOpen(false);
    },
    [isSubmitting, ratio],
  );
  const handlePickReferences = reactExports.useCallback(async () => {
    const remaining = MAX_STORYBOARD_REFERENCES - references.length;
    if (!pickAsset || remaining <= 0) return;
    try {
      const resources = await pickAsset({
        type: "image",
        multiple: true,
        maxCount: remaining,
        tabs: ["canvas", "upload"],
        uploadMode: "attach",
      });
      if (!resources?.length) return;
      const added = [];
      for (const resource of resources) {
        if (!resource.url || !resource.path) {
          dedupedToast.error(t2.missingAsset);
          continue;
        }
        if (
          references.some((reference) => reference.path === resource.path) ||
          added.some((reference) => reference.path === resource.path)
        )
          continue;
        added.push({
          url: resource.url,
          path: resource.path,
        });
      }
      if (added.length > 0) {
        setReferences((previous2) => [...previous2, ...added].slice(0, MAX_STORYBOARD_REFERENCES));
      }
    } catch (error) {
      dedupedToast.error(`${t2.pickerError}: ${readableGenerationError(error)}`);
    }
  }, [pickAsset, references, t2]);
  const canSubmit =
    !isSubmitting &&
    !isGenerating &&
    !!submitImg2Image &&
    prompt.trim().length > 0 &&
    prompt.length <= MAX_STORYBOARD_PROMPT_LENGTH &&
    references.some((reference) => reference.locked) &&
    isStoryboardGridValid(ratio, rows, cols);
  const handleSubmit = reactExports.useCallback(async () => {
    if (!canSubmit || !submitImg2Image || submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      if (replaceNodeId) await flushPersist();
      const submission = submitImg2Image(
        nodeId,
        prompt.trim(),
        "n-storyboard",
        {
          grid_setting: JSON.stringify({
            rows,
            cols,
            cell_ratio: ratio,
          }),
          cell_ratio: ratio,
        },
        references.map((reference) => reference.path),
        replaceNodeId,
        1,
        void 0,
        false,
        BACKEND_VIBE_STORYBOARD,
      );
      onClose();
      const result = await submission;
      if (!result.success && result.error) throw new Error(result.error);
    } catch (error) {
      dedupedToast.error(`${t2.generateError}: ${readableGenerationError(error)}`);
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    canSubmit,
    cols,
    flushPersist,
    nodeId,
    onClose,
    prompt,
    ratio,
    references,
    replaceNodeId,
    rows,
    submitImg2Image,
    t2,
  ]);
  const previewGrid = hoveredGrid ?? {
    rows,
    cols,
  };
  return (
    <PopoverShell onClose={onClose} expanded={expanded} extraHeight={expanded ? 40 : 64}>
      <div className="contents" data-action-ui-id="canvas.storyboard-grid.popover">
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1">
            {references.map((reference, index2) => (
              <div
                key={reference.path}
                className="group/reference relative size-12 shrink-0 overflow-hidden rounded-[8px] border-[1.5px] border-transparent"
              >
                <img
                  src={reference.url}
                  alt=""
                  className="size-full object-cover"
                  draggable={false}
                />
                {!reference.locked && !isSubmitting && (
                  <Button$2
                    type="button"
                    variant="default"
                    size="icon-xs"
                    aria-label={t2.removeReference}
                    onClick={() =>
                      setReferences((previous2) =>
                        previous2.filter((_2, itemIndex) => itemIndex !== index2),
                      )
                    }
                    className="absolute right-0.5 top-0.5 size-4 rounded-full bg-foreground p-0 text-background opacity-0 transition-opacity hover:bg-foreground/80 focus-visible:opacity-100 group-hover/reference:opacity-100"
                  >
                    <X$7 size={10} strokeWidth={2} />
                  </Button$2>
                )}
              </div>
            ))}
            {references.length < MAX_STORYBOARD_REFERENCES && (
              <Button$2
                type="button"
                variant="outline"
                size="icon-lg"
                disabled={!pickAsset || isSubmitting}
                onClick={() => void handlePickReferences()}
                className="size-12 rounded-[8px] border-[1.5px] border-dashed border-foreground/10 bg-transparent text-foreground/50 hover:border-foreground/30 hover:bg-transparent hover:text-foreground"
                aria-label={t2.addReference}
                data-action-ui-id="canvas.storyboard-grid.add-reference"
              >
                <Plus size={18} strokeWidth={1.5} />
              </Button$2>
            )}
          </div>
          <ExpandToggleButton
            expanded={expanded}
            onToggle={() => setExpanded((current2) => !current2)}
          />
        </div>
        <div className="min-h-0 flex-1 pt-3">
          <PromptTextarea
            value={prompt}
            onChange={setPrompt}
            placeholder={t2.promptPlaceholder}
            onClose={onClose}
            blockKeyHandlers={isSubmitting}
            maxLength={MAX_STORYBOARD_PROMPT_LENGTH}
          />
        </div>
        <div className="relative flex items-center justify-between gap-3 pt-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--canvas-controls-text)]">
              <StoryboardGridIcon size={18} strokeWidth={1.75} />
              {t2.title}
            </div>
            <span aria-hidden="true" className="h-3 w-px bg-foreground/15" />
            <ParamsChip
              anchorRef={ratioAnchorRef}
              summary={`${t2.cellRatio} · ${ratio}`}
              open={ratioOpen}
              onToggle={() => {
                setGridOpen(false);
                setRatioOpen((current2) => !current2);
              }}
              disabled={isSubmitting}
              showSummaryIcons={false}
            />
            <span aria-hidden="true" className="h-3 w-px bg-foreground/15" />
            <ParamsChip
              anchorRef={gridAnchorRef}
              summary={`${cols} × ${rows}`}
              open={gridOpen}
              onToggle={() => {
                setRatioOpen(false);
                setGridOpen((current2) => !current2);
              }}
              disabled={isSubmitting}
              showSummaryIcons={false}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {isGenerating ? (
              <GeneratingButton label={t2.generating} />
            ) : (
              <SubmitButton
                submitting={isSubmitting}
                canSubmit={canSubmit}
                onClick={() => void handleSubmit()}
                title={t2.generate}
                creditCost={pricingConfig?.storyboard?.creditCost}
              />
            )}
          </div>
        </div>
        {ratioOpen && (
          <ParamsPopup anchorRef={ratioAnchorRef} onClose={() => setRatioOpen(false)} widthPx={320}>
            <div data-action-ui-id="canvas.storyboard-grid.ratio-popup">
              <ParamSectionLabel>{t2.cellRatio}</ParamSectionLabel>
              <AspectRatioGrid
                options={STORYBOARD_RATIOS}
                value={ratio}
                onChange={(value) => selectRatio(value)}
                disabled={isSubmitting}
              />
            </div>
          </ParamsPopup>
        )}
        {gridOpen && (
          <ParamsPopup
            anchorRef={gridAnchorRef}
            onClose={() => setGridOpen(false)}
            widthPx={280}
            scale={0.75}
          >
            <div data-action-ui-id="canvas.storyboard-grid.layout-popup">
              <div className="mb-3 flex items-center justify-between text-base">
                <span className="font-medium text-muted-foreground">{t2.customGrid}</span>
                <span className="text-foreground">
                  {cols}
                  {" × "}
                  {rows}
                </span>
              </div>
              <TooltipProvider$1 delay={180} closeDelay={0}>
                <fieldset
                  aria-label={t2.gridLayout}
                  className="grid grid-cols-5 gap-2"
                  onPointerLeave={() => setHoveredGrid(null)}
                >
                  {Array.from(
                    {
                      length: 25,
                    },
                    (_2, index2) => {
                      const optionRows = Math.floor(index2 / 5) + 1;
                      const optionCols = (index2 % 5) + 1;
                      const valid2 = isStoryboardGridValid(ratio, optionRows, optionCols);
                      const filled =
                        optionRows <= previewGrid.rows && optionCols <= previewGrid.cols;
                      const optionLabel = `${optionCols} × ${optionRows}`;
                      return (
                        <Tooltip$1
                          key={`${optionRows}-${optionCols}`}
                          content={valid2 ? optionLabel : t2.invalidLayout}
                          side="top"
                          sideOffset={8}
                        >
                          <Button$2
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={
                              valid2 ? optionLabel : `${optionLabel}: ${t2.invalidLayout}`
                            }
                            aria-disabled={!valid2 || isSubmitting}
                            onPointerEnter={() => {
                              setHoveredGrid(
                                valid2 && !isSubmitting
                                  ? {
                                      rows: optionRows,
                                      cols: optionCols,
                                    }
                                  : null,
                              );
                            }}
                            onFocus={() => {
                              setHoveredGrid(
                                valid2 && !isSubmitting
                                  ? {
                                      rows: optionRows,
                                      cols: optionCols,
                                    }
                                  : null,
                              );
                            }}
                            onBlur={() => setHoveredGrid(null)}
                            onClick={() => selectGrid(optionRows, optionCols)}
                            className={`aspect-square h-auto w-full rounded-[10px] p-0 transition-[background-color,border-color,opacity] focus-visible:ring-2 focus-visible:ring-brand-accent/35 ${filled ? "border-brand-accent/80 bg-brand-accent/80 hover:bg-brand-accent/90 dark:hover:bg-brand-accent/90" : "border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-hover)] hover:bg-[var(--canvas-controls-active)] dark:hover:bg-[var(--canvas-controls-active)]"} ${valid2 && !isSubmitting ? "cursor-pointer" : filled ? "cursor-not-allowed" : "cursor-not-allowed opacity-45"}`}
                            data-action-ui-id={`canvas.storyboard-grid.layout-${optionCols}x${optionRows}`}
                          />
                        </Tooltip$1>
                      );
                    },
                  )}
                </fieldset>
              </TooltipProvider$1>
            </div>
          </ParamsPopup>
        )}
      </div>
    </PopoverShell>
  );
}
export function StoryboardGridPopover({
  onClose,
  replaceNodeId,
  imageUrl,
  imagePath,
  defaultPrompt,
  defaultParams,
  defaultReferencePaths,
  resolveFileUrl,
  isGenerating,
}) {
  const nodeId = useNodeId() ?? "";
  return (
    <StoryboardGridEditor
      nodeId={nodeId}
      replaceNodeId={replaceNodeId}
      imageUrl={imageUrl}
      imagePath={imagePath}
      defaultPrompt={defaultPrompt}
      defaultParams={defaultParams}
      defaultReferencePaths={defaultReferencePaths}
      resolveFileUrl={resolveFileUrl}
      isGenerating={isGenerating}
      onClose={onClose}
    />
  );
}
export function useDirectImageActions({
  id: id2,
  meta: meta2,
  submitSuperResolution,
  submitRemoveBg,
}) {
  const handleSuperResolution = reactExports.useCallback(() => {
    if (!submitSuperResolution || !meta2?.path) return;
    void submitSuperResolution(id2, meta2.path);
  }, [id2, meta2?.path, submitSuperResolution]);
  const handleRemoveBg = reactExports.useCallback(() => {
    if (!submitRemoveBg || !meta2?.path) return;
    void submitRemoveBg(id2, meta2.path);
  }, [id2, meta2?.path, submitRemoveBg]);
  return {
    handleSuperResolution,
    handleRemoveBg,
  };
}
export function useImageColorAdjust({
  id: id2,
  meta: meta2,
  nodeWidth,
  reactFlow,
  cropImage,
  lut,
}) {
  const [open, setOpen] = reactExports.useState(false);
  const emitDerived = useEmitDerivedFromBlob({
    id: id2,
    meta: meta2,
    nodeWidth,
    reactFlow,
    cropImage,
  });
  const openDialog = reactExports.useCallback(() => {
    if (!meta2?.url) return;
    setOpen(true);
  }, [meta2?.url]);
  const onConfirm = reactExports.useCallback(
    async (blob) => {
      await emitDerived(blob, {
        suffix: "color",
        ext: "png",
      });
    },
    [emitDerived],
  );
  return {
    open,
    openDialog,
    dialogProps: {
      open,
      onOpenChange: setOpen,
      onConfirm,
      lut,
    },
  };
}
export function useImageInplaceEdit({
  id: id2,
  meta: meta2,
  selected: selected2,
  nodeWidth,
  nodeHeight,
  reactFlow,
  cropImage,
  onApply,
  onAbandon,
}) {
  const [editingTarget, setEditingTarget] = reactExports.useState(null);
  const editing = editingTarget !== null;
  const emitDerived = useEmitDerivedFromBlob({
    id: id2,
    meta: meta2,
    nodeWidth,
    reactFlow,
    cropImage,
  });
  const interactionSessionRef = reactExports.useRef(createToolInteractionSession());
  useCropViewportZoom(editingTarget, 0, 0, INPLACE_EDIT_TOOLBAR_RESERVE_PX);
  const enter2 = reactExports.useCallback(() => {
    if (!meta2?.url) return;
    const rect = getNodeFlowRect(reactFlow, id2, nodeWidth, nodeHeight);
    if (!rect) return;
    beginToolInteractionSession(interactionSessionRef.current);
    setEditingTarget({
      nodeFlowX: rect.x,
      nodeFlowY: rect.y,
      nodeWidth: rect.width,
      nodeHeight: rect.height,
    });
  }, [meta2?.url, id2, reactFlow, nodeWidth, nodeHeight]);
  const setHadProgress = reactExports.useCallback((hadProgress) => {
    setToolInteractionSessionProgress(interactionSessionRef.current, hadProgress);
  }, []);
  const cancel = reactExports.useCallback(
    (hadProgress) => {
      const abandonedWithProgress = abandonToolInteractionSession(
        interactionSessionRef.current,
        hadProgress,
      );
      if (abandonedWithProgress == null) return;
      onAbandon?.(abandonedWithProgress);
      setEditingTarget(null);
    },
    [onAbandon],
  );
  reactExports.useEffect(() => {
    if (editing && !selected2) cancel();
  }, [editing, selected2, cancel]);
  const confirm = reactExports.useCallback(
    async (blob) => {
      await emitDerived(blob, {
        suffix: "edited",
        ext: "png",
      });
      completeToolInteractionSession(interactionSessionRef.current);
      onApply?.(blob);
      setEditingTarget(null);
    },
    [emitDerived, onApply],
  );
  return {
    editing,
    enter: enter2,
    cancel,
    confirm,
    setHadProgress,
  };
}
export function useImageLightbox({ items, initialIndex = 0 }) {
  const [open, setOpen] = reactExports.useState(false);
  const [index2, setIndex] = reactExports.useState(() => clampIndex(initialIndex, items.length));
  const close2 = reactExports.useCallback(() => setOpen(false), []);
  const openLightbox = reactExports.useCallback(
    (nextIndex) => {
      if (items.length === 0) return;
      const desired =
        typeof nextIndex === "number" && Number.isFinite(nextIndex) ? nextIndex : initialIndex;
      setIndex(clampIndex(desired, items.length));
      setOpen(true);
    },
    [items.length, initialIndex],
  );
  reactExports.useEffect(() => {
    if (!open) setIndex(clampIndex(initialIndex, items.length));
  }, [initialIndex, open, items.length]);
  reactExports.useEffect(() => {
    if (items.length === 0) {
      if (open) setOpen(false);
      return;
    }
    setIndex((cur) => clampIndex(cur, items.length));
  }, [items.length, open]);
  return {
    open,
    openLightbox,
    lightboxProps:
      open && items.length > 0
        ? {
            items,
            index: index2,
            onIndexChange: setIndex,
            onClose: close2,
          }
        : null,
  };
}
function clampIndex(value, length2) {
  if (length2 <= 0) return 0;
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.floor(value), 0), length2 - 1);
}
export function useImageRotateEdit({
  nodeId,
  selected: selected2,
  meta: meta2,
  nodeWidth,
  sourceBodyHeight,
  cropImage,
  reactFlow,
  onSaved,
  onAbandon,
}) {
  const [editing, setEditing] = reactExports.useState(false);
  const [state2, setState] = reactExports.useState(DEFAULT_ROTATE_STATE);
  const [saving, setSaving] = reactExports.useState(false);
  const interactionSessionRef = reactExports.useRef(createToolInteractionSession());
  const hasChanges = !isIdentityRotate(state2);
  const enter2 = reactExports.useCallback(() => {
    if (!meta2?.url || !meta2.width || !meta2.height) return;
    beginToolInteractionSession(interactionSessionRef.current);
    setState(DEFAULT_ROTATE_STATE);
    setEditing(true);
  }, [meta2?.url, meta2?.width, meta2?.height]);
  const reset2 = reactExports.useCallback(() => {
    setEditing(false);
    setState(DEFAULT_ROTATE_STATE);
    setSaving(false);
  }, []);
  const cancel = reactExports.useCallback(() => {
    const abandonedWithProgress = abandonToolInteractionSession(interactionSessionRef.current);
    if (abandonedWithProgress == null) return;
    onAbandon?.(abandonedWithProgress);
    reset2();
  }, [onAbandon, reset2]);
  const { displayWidth, displayHeight } = reactExports.useMemo(() => {
    if (!editing || !hasChanges) {
      return {
        displayWidth: nodeWidth,
        displayHeight: sourceBodyHeight,
      };
    }
    const aabb = rotatedAabb(nodeWidth, sourceBodyHeight, state2.angle);
    return {
      displayWidth: aabb.width,
      displayHeight: aabb.height,
    };
  }, [editing, hasChanges, state2.angle, nodeWidth, sourceBodyHeight]);
  const save = reactExports.useCallback(async () => {
    if (saving) return;
    if (!cropImage || !meta2?.url || !meta2.width || !meta2.height) return;
    if (!hasChanges) {
      cancel();
      return;
    }
    setSaving(true);
    try {
      const blob = await renderRotatedBlob(meta2.url, state2, meta2.width, meta2.height);
      const baseName = meta2.name?.replace(/\.[^.]+$/, "") ?? "image";
      const position2 = getAdjacentNodePosition(reactFlow, nodeId, displayWidth);
      const uuid = crypto.randomUUID().slice(0, 4);
      const newNodeId = await cropImage(nodeId, blob, `${baseName}-rotate-${uuid}.png`, position2);
      completeToolInteractionSession(interactionSessionRef.current);
      onSaved?.(newNodeId);
      reset2();
    } catch {
      setSaving(false);
    }
  }, [
    saving,
    cropImage,
    meta2,
    state2,
    hasChanges,
    reactFlow,
    nodeId,
    displayWidth,
    cancel,
    onSaved,
    reset2,
  ]);
  reactExports.useEffect(() => {
    setToolInteractionSessionProgress(interactionSessionRef.current, hasChanges);
  }, [hasChanges]);
  const setAngle = reactExports.useCallback((next2) => {
    setState((prev) => ({
      ...prev,
      angle: clamp$5(next2, ROTATE_ANGLE_MIN, ROTATE_ANGLE_MAX),
    }));
  }, []);
  const step90 = reactExports.useCallback(() => {
    setState((prev) => ({
      ...prev,
      angle: normalizeAngle(prev.angle + ROTATE_STEP_DEG),
    }));
  }, []);
  const toggleFlipH = reactExports.useCallback(() => {
    setState((prev) => ({
      ...prev,
      flipH: !prev.flipH,
    }));
  }, []);
  const toggleFlipV = reactExports.useCallback(() => {
    setState((prev) => ({
      ...prev,
      flipV: !prev.flipV,
    }));
  }, []);
  reactExports.useEffect(() => {
    if (!editing) return;
    if (saving) return;
    if (!selected2) cancel();
  }, [editing, saving, selected2, cancel]);
  const imageTransform = reactExports.useMemo(() => {
    if (!editing || !hasChanges) return void 0;
    return `rotate(${state2.angle}deg) scale(${state2.flipH ? -1 : 1}, ${state2.flipV ? -1 : 1})`;
  }, [editing, hasChanges, state2]);
  return {
    editing,
    state: state2,
    saving,
    hasChanges,
    imageTransform,
    displayWidth,
    displayHeight,
    enter: enter2,
    cancel,
    save,
    setAngle,
    step90,
    toggleFlipH,
    toggleFlipV,
  };
}
