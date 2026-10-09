// storyboard-grid-editor.jsx
import {
  BACKEND_VIBE_STORYBOARD,
  dedupedToast,
  Plus,
  reactExports,
  useTranslation,
  X$7 as X,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { TooltipProvider } from "../infra/create-recently-added-store.js";
import { useCanvasBridge } from "./package.jsx";
import { useCanvasActions } from "./use-canvas-actions.js";
import { StoryboardGridIcon } from "../canvas/fullscreen-icon.jsx";
import { Tooltip } from "../generation/missing-asset-card.jsx";
import { PopoverShell } from "../generation/attachment-bar.jsx";
import { SubmitButton } from "../generation/submit-button.jsx";
import {
  ExpandToggleButton,
  GeneratingButton,
} from "../generation/expand-arrow-icon.jsx";
import { ParamSectionLabel } from "../generation/resolution-tabs.jsx";
import { AspectRatioGrid } from "../generation/aspect-ratio-grid.jsx";
import { Button } from "../canvas/node-shell-inner.jsx";
import { PromptTextarea } from "../generation/time-intervals.jsx";
import { ParamsChip } from "../generation/params-chip.jsx";
import { ParamsPopup } from "../generation/params-popup.jsx";
import { readableGenerationError } from "./segmented-control.jsx";
import {
  nearestValidStoryboardGrid,
  resolveStoryboardGridSelection,
  STORYBOARD_RATIOS,
} from "./round-dots-inner.jsx";
import { isStoryboardGridValid } from "./grid-validity-map.js";
const MAX_STORYBOARD_REFERENCES = 4;
const MAX_STORYBOARD_PROMPT_LENGTH = 5e3;
const messages = {
  en: {
    title: "Storyboard",
    gridLayout: "Grid layout",
    customGrid: "Custom Grid",
    cellRatio: "Cell Ratio",
    references: "References",
    referenceHint:
      "The current image is used as the first reference. Add up to 3 more.",
    addReference: "Add reference",
    removeReference: "Remove reference",
    story: "Your story",
    promptPlaceholder: "Describe the story to break into storyboard panels…",
    reset: "Reset",
    generate: "Generate",
    generating: "Generating…",
    pickerError: "Failed to select a reference image",
    missingAsset: "The selected image is unavailable",
    generateError: "Failed to generate storyboard",
    invalidLayout: "This layout is unavailable at the selected ratio",
  },
  zh: {
    title: "故事版",
    gridLayout: "分镜布局",
    customGrid: "自定义表格",
    cellRatio: "单格比例",
    references: "参考图",
    referenceHint: "当前图片会作为第一张参考图，最多还能添加 3 张。",
    addReference: "添加参考图",
    removeReference: "移除参考图",
    story: "你的故事",
    promptPlaceholder: "描述要拆解成分镜的故事…",
    reset: "重置",
    generate: "生成",
    generating: "生成中…",
    pickerError: "选择参考图失败",
    missingAsset: "所选图片不可用",
    generateError: "多宫格生成失败",
    invalidLayout: "此比例下无法使用此布局",
  },
};
function sourceReference(imageUrl, imagePath) {
  if (!imageUrl) return void 0;
  const sourcePath =
    imagePath ??
    (/^https?:\/\/(?!localhost(?::|\/)|127\.0\.0\.1(?::|\/)|\[::1\](?::|\/))/i.test(
      imageUrl,
    )
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
    .filter(
      (path2) => path2.length > 0 && !seen2.has(path2) && seen2.add(path2),
    )
    .slice(0, MAX_STORYBOARD_REFERENCES)
    .map((path2, index2) => ({
      path: path2,
      url: resolveFileUrl?.(path2) ?? path2,
      locked: index2 === 0,
    }));
}
export function StoryboardGridEditor({
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
      return source
        ? [source, ...extras].slice(0, MAX_STORYBOARD_REFERENCES)
        : extras;
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
      if (isSubmitting || !isStoryboardGridValid(ratio, nextRows, nextCols))
        return;
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
        setReferences((previous2) =>
          [...previous2, ...added].slice(0, MAX_STORYBOARD_REFERENCES),
        );
      }
    } catch (error) {
      dedupedToast.error(
        `${t2.pickerError}: ${readableGenerationError(error)}`,
      );
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
      dedupedToast.error(
        `${t2.generateError}: ${readableGenerationError(error)}`,
      );
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
    <PopoverShell
      onClose={onClose}
      expanded={expanded}
      extraHeight={expanded ? 40 : 64}
    >
      <div
        className="contents"
        data-action-ui-id="canvas.storyboard-grid.popover"
      >
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
                  <Button
                    type="button"
                    variant="default"
                    size="icon-xs"
                    aria-label={t2.removeReference}
                    onClick={() =>
                      setReferences((previous2) =>
                        previous2.filter(
                          (_2, itemIndex) => itemIndex !== index2,
                        ),
                      )
                    }
                    className="absolute right-0.5 top-0.5 size-4 rounded-full bg-foreground p-0 text-background opacity-0 transition-opacity hover:bg-foreground/80 focus-visible:opacity-100 group-hover/reference:opacity-100"
                  >
                    <X size={10} strokeWidth={2} />
                  </Button>
                )}
              </div>
            ))}
            {references.length < MAX_STORYBOARD_REFERENCES && (
              <Button
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
              </Button>
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
          <ParamsPopup
            anchorRef={ratioAnchorRef}
            onClose={() => setRatioOpen(false)}
            widthPx={320}
          >
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
                <span className="font-medium text-muted-foreground">
                  {t2.customGrid}
                </span>
                <span className="text-foreground">
                  {cols}
                  {" × "}
                  {rows}
                </span>
              </div>
              <TooltipProvider delay={180} closeDelay={0}>
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
                      const valid2 = isStoryboardGridValid(
                        ratio,
                        optionRows,
                        optionCols,
                      );
                      const filled =
                        optionRows <= previewGrid.rows &&
                        optionCols <= previewGrid.cols;
                      const optionLabel = `${optionCols} × ${optionRows}`;
                      return (
                        <Tooltip
                          key={`${optionRows}-${optionCols}`}
                          content={valid2 ? optionLabel : t2.invalidLayout}
                          side="top"
                          sideOffset={8}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={
                              valid2
                                ? optionLabel
                                : `${optionLabel}: ${t2.invalidLayout}`
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
                        </Tooltip>
                      );
                    },
                  )}
                </fieldset>
              </TooltipProvider>
            </div>
          </ParamsPopup>
        )}
      </div>
    </PopoverShell>
  );
}
