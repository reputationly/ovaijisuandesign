// params-popup.jsx
import { jsxRuntimeExports, reactExports, CompositedSvg, useTranslation, Check, reactDomExports, dedupedToast, Copy, usePromptFontSizeStore, PopoverRoot, PopoverTrigger$1, PopoverPortal, PopoverPositioner, PopoverPopup, PROMPT_FONT_SIZE_MIN, PROMPT_FONT_SIZE_MAX, PROMPT_FONT_SIZE_DEFAULT, RotateCcw } from "../vendor.js";
import { TooltipProvider$1 } from "../infra/create-recently-added-store.jsx";
import { Settings2, Type$1 } from "../media-editing/parse-item.jsx";
import { cn$5 } from "../infra/use-browser-overlay-dialog-props.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { PROMPT_FONT_SIZE_STEP } from "./calc-video-cost-breakdown.jsx";
import { Tooltip$1 } from "./create-tracker.jsx";
import { nextStablePortalPanelHeight, usePortalAnchorPlacement } from "./model-chip.jsx";
import { AspectRatioIcon, Slider$1, parseRatio } from "./slider.jsx";
import { countPromptCharacters } from "../assets/use-assets-ref-validate.js";
function ClockIcon({ size: size2 = 12, className }) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={true}
    >
      <path d="M5 1.00012H7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M6 7.00012L7.5 5.50012"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 11C8.20914 11 10 9.20914 10 7C10 4.79086 8.20914 3 6 3C3.79086 3 2 4.79086 2 7C2 9.20914 3.79086 11 6 11Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
const DURATION_REGEX = /^\d+(?:[.-]\d+)*\s*(?:s|sec|secs|seconds?|m|min|mins|minutes?|秒|分钟)$/i;
function splitSummary(summary) {
  if (!summary) return [];
  const tokens2 = summary
    .split(/\s*[·•|]\s*/)
    .map((s2) => s2.trim())
    .filter(Boolean);
  return tokens2.map((tok) => {
    if (parseRatio(tok))
      return {
        kind: "ratio",
        text: tok,
      };
    if (DURATION_REGEX.test(tok))
      return {
        kind: "duration",
        text: tok,
      };
    return {
      kind: "text",
      text: tok,
    };
  });
}
export function ParamsChip({
  anchorRef,
  summary,
  open: _open,
  onToggle,
  disabled: disabled2,
  iconOnly = false,
  showSummaryIcons = true,
}) {
  const { t: t2 } = useTranslation();
  const segments = splitSummary(summary);
  const hasSegments = segments.length > 0;
  const tooltipContent = summary || t2("canvas.param.chip.placeholder");
  return (
    <Tooltip$1 content={tooltipContent} side="top">
      <button
        ref={anchorRef}
        type="button"
        onClick={(e2) => {
          e2.stopPropagation();
          onToggle();
        }}
        disabled={disabled2}
        className="h-8 shrink-0 px-2 text-[13px] font-normal tracking-normal leading-[20px] opacity-70 text-foreground hover:enabled:opacity-100 disabled:cursor-default disabled:opacity-40 min-w-0 max-w-[320px] flex items-center gap-1 canvas-prompt-control"
        aria-label={tooltipContent}
        data-action-ui-id="popover.params-chip"
      >
        {iconOnly ? (
          <Settings2 size={16} strokeWidth={1.7} aria-hidden="true" />
        ) : !showSummaryIcons ? (
          <span className="min-w-0 flex-1 truncate text-left">
            {summary || t2("canvas.param.chip.placeholder")}
          </span>
        ) : hasSegments ? (
          <span className="min-w-0 flex-1 truncate text-left">
            <span className="inline-flex items-center gap-1">
              {segments.map((seg, i2) =>
                // Index is part of the key only to disambiguate the rare case
                // of duplicate raw tokens; segments are short-lived render-only
                // data with no per-item state, so position-based identity is fine.
                // biome-ignore lint/suspicious/noArrayIndexKey: render-only, no state
                jsxRuntimeExports.jsxs(
                  reactExports.Fragment,
                  {
                    children: [
                      i2 > 0 && <span className="opacity-60">·</span>,
                      seg.kind === "ratio" ? (
                        <span className="inline-flex items-center gap-0.5">
                          <span
                            aria-hidden={true}
                            className="inline-flex size-3 shrink-0 items-center justify-center [&>svg]:size-full"
                          >
                            <AspectRatioIcon ratio={seg.text} />
                          </span>
                          <span>{seg.text}</span>
                        </span>
                      ) : seg.kind === "duration" ? (
                        <span className="inline-flex items-center gap-0.5">
                          <ClockIcon className="shrink-0" />
                          <span>{seg.text}</span>
                        </span>
                      ) : (
                        <span>{seg.text}</span>
                      ),
                    ],
                  },
                  `${seg.kind}-${i2}-${seg.text}`,
                ),
              )}
            </span>
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-left">
            {summary || t2("canvas.param.chip.placeholder")}
          </span>
        )}
      </button>
    </Tooltip$1>
  );
}
const POPUP_MIN_HEIGHT = 200;
const POPUP_MAX_HEIGHT = 480;
export function ParamsPopup({
  onClose,
  children: children2,
  widthPx = 380,
  scale: scale2 = 1,
  anchorRef,
}) {
  const popupRef = reactExports.useRef(null);
  const [stableHeight, setStableHeight] = reactExports.useState(0);
  const panelScale = scale2 > 0 ? scale2 : 1;
  const onCloseRef = reactExports.useRef(onClose);
  reactExports.useEffect(() => {
    onCloseRef.current = onClose;
  });
  reactExports.useEffect(() => {
    const handleMouseDown2 = (e2) => {
      const target = e2.target;
      if (!target) return;
      if (popupRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onCloseRef.current();
    };
    const handleKeyDown2 = (e2) => {
      if (e2.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("mousedown", handleMouseDown2, true);
    document.addEventListener("keydown", handleKeyDown2);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown2, true);
      document.removeEventListener("keydown", handleKeyDown2);
    };
  }, [anchorRef]);
  const placement = usePortalAnchorPlacement(anchorRef, {
    open: true,
    minHeight: POPUP_MIN_HEIGHT * panelScale,
    maxHeight: POPUP_MAX_HEIGHT * panelScale,
    gap: 8,
  });
  reactExports.useLayoutEffect(() => {
    const measuredHeight = (popupRef.current?.getBoundingClientRect().height ?? 0) / panelScale;
    if (measuredHeight <= 0) return;
    setStableHeight((previousHeight) =>
      nextStablePortalPanelHeight(previousHeight, measuredHeight, POPUP_MAX_HEIGHT),
    );
  });
  if (!placement) return null;
  const panel = (
    // biome-ignore lint/a11y/noStaticElementInteractions: popup container, click only stops propagation
    // biome-ignore lint/a11y/useKeyWithClickEvents: same reason
    <div
      ref={popupRef}
      data-side={placement.side}
      className={`canvas-portal-popover-in nowheel overflow-y-auto scrollbar-none rounded-[16px] border shadow-lg p-2.5 ${panelScale === 1 ? "fixed z-[10001]" : ""}`}
      style={{
        background: "var(--canvas-controls-bg)",
        borderColor: "var(--canvas-controls-border)",
        width: widthPx,
        left: panelScale === 1 ? placement.left : void 0,
        top: panelScale === 1 ? placement.top : void 0,
        bottom: panelScale === 1 ? placement.bottom : void 0,
        maxHeight: placement.maxHeight / panelScale,
        minHeight:
          stableHeight > 0 ? Math.min(stableHeight, placement.maxHeight / panelScale) : void 0,
      }}
      onClick={(e2) => e2.stopPropagation()}
    >
      <div className="flex flex-col gap-4">{children2}</div>
    </div>
  );
  return reactDomExports.createPortal(
    panelScale === 1 ? (
      panel
    ) : (
      <div
        className="fixed z-[10001]"
        style={{
          left: placement.left,
          top: placement.top,
          bottom: placement.bottom,
          width: widthPx,
          transform: `scale(${panelScale})`,
          transformOrigin: placement.openUp ? "bottom left" : "top left",
        }}
      >
        {panel}
      </div>
    ),
    document.body,
  );
}
function PromptLengthHint({ currentLength, maxLength, className }) {
  const { t: t2 } = useTranslation();
  if (!maxLength || maxLength <= 0) return null;
  const overLimit = currentLength > maxLength;
  const approaching = !overLimit && currentLength >= Math.floor(maxLength * 0.9);
  const colorClass = overLimit
    ? "text-destructive"
    : approaching
      ? "text-foreground"
      : "text-muted-foreground";
  return (
    <div
      className={`pointer-events-none select-none text-[11px] tabular-nums ${colorClass} ${className ?? ""}`.trim()}
      data-action-ui-id="popover.prompt-length-hint"
      data-over-limit={overLimit ? "true" : "false"}
    >
      <span>
        {currentLength}
        {" / "}
        {maxLength}
      </span>
      {overLimit ? (
        <span className="ml-1">
          {"· "}
          {t2("canvas.promptLengthExceeded", "Exceeded")}
        </span>
      ) : null}
    </div>
  );
}
const COPY_FEEDBACK_DURATION_MS$1 = 1500;
async function copyPromptText(
  text2,
  clipboard2 = typeof navigator === "undefined" ? void 0 : navigator.clipboard,
) {
  if (text2.length === 0 || !clipboard2?.writeText) return false;
  try {
    await clipboard2.writeText(text2);
    return true;
  } catch {
    return false;
  }
}
function PromptCopyControl({ getPromptText, disabled: disabled2 = false }) {
  const { t: t2 } = useTranslation();
  const [copied, setCopied] = reactExports.useState(false);
  const feedbackTimerRef = reactExports.useRef(null);
  const copyLabel = t2("canvas.prompt.copy", {
    defaultValue: "Copy prompt",
  });
  const copiedLabel = t2("common.copiedShort", {
    defaultValue: "Copied",
  });
  const feedbackLabel = copied ? copiedLabel : copyLabel;
  reactExports.useEffect(
    () => () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    },
    [],
  );
  const handleCopy = reactExports.useCallback(
    async (event) => {
      event.stopPropagation();
      const success = await copyPromptText(getPromptText());
      if (!success) {
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
        setCopied(false);
        dedupedToast.error(
          t2("common.copyFailed", {
            defaultValue: "Failed to copy",
          }),
        );
        return;
      }
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      setCopied(true);
      feedbackTimerRef.current = setTimeout(() => {
        feedbackTimerRef.current = null;
        setCopied(false);
      }, COPY_FEEDBACK_DURATION_MS$1);
    },
    [getPromptText, t2],
  );
  return (
    <Tooltip$1 content={feedbackLabel} side="top" closeOnClick={false}>
      <button
        type="button"
        aria-label={feedbackLabel}
        disabled={disabled2}
        data-action-ui-id="popover.prompt-copy"
        className="nowheel nopan nodrag flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-[var(--canvas-controls-text-muted)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--canvas-node-border-selected)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
        onClick={(event) => void handleCopy(event)}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {copied ? (
          <Check size={14} strokeWidth={1.8} aria-hidden="true" />
        ) : (
          <Copy size={14} strokeWidth={1.8} aria-hidden="true" />
        )}
      </button>
    </Tooltip$1>
  );
}
function PromptFontSizeControl() {
  const { t: t2 } = useTranslation();
  const fontSize = usePromptFontSizeStore((state2) => state2.fontSize);
  const setFontSize = usePromptFontSizeStore((state2) => state2.setFontSize);
  const resetFontSize = usePromptFontSizeStore((state2) => state2.resetFontSize);
  const label = t2("canvas.prompt.fontSize", {
    defaultValue: "Adjust prompt font size",
  });
  const resetLabel = t2("canvas.prompt.fontSizeReset", {
    defaultValue: "Reset prompt font size",
  });
  return (
    <PopoverRoot>
      <Tooltip$1 content={label} side="top">
        <PopoverTrigger$1
          render={
            <button
              type="button"
              aria-label={label}
              data-action-ui-id="popover.prompt-font-size-trigger"
              className="nowheel nopan nodrag flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-[var(--canvas-controls-text-muted)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] data-popup-open:bg-[var(--canvas-controls-hover)] data-popup-open:text-[var(--canvas-controls-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--canvas-node-border-selected)]"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            />
          }
        >
          <Type$1 size={14} strokeWidth={1.8} aria-hidden="true" />
        </PopoverTrigger$1>
      </Tooltip$1>
      <PopoverPortal>
        <PopoverPositioner align="end" side="top" sideOffset={6} className="isolate z-[10020]">
          <PopoverPopup
            data-slot="prompt-font-size-popover"
            data-action-ui-id="popover.prompt-font-size"
            aria-label={label}
            className="nowheel nopan nodrag flex h-8 w-[198px] origin-(--transform-origin) items-center gap-1.5 rounded-lg border-[0.85px] border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] py-0 pr-1.5 pl-2 text-[var(--canvas-controls-text)] shadow-[var(--canvas-shadow-dropdown)] outline-none dp-motion-quick-zoom"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Slider$1
              size="compact"
              aria-label={label}
              value={fontSize}
              min={PROMPT_FONT_SIZE_MIN}
              max={PROMPT_FONT_SIZE_MAX}
              step={PROMPT_FONT_SIZE_STEP}
              onValueChange={(value) => {
                const next2 = Array.isArray(value) ? value[0] : value;
                if (typeof next2 === "number") setFontSize(next2);
              }}
              className="w-28 shrink-0"
              thumbProps={{
                "data-action-ui-id": "popover.prompt-font-size-thumb",
              }}
            />
            <output
              aria-live="polite"
              className="min-w-8 shrink-0 text-right text-[13px] tabular-nums text-[var(--canvas-controls-text)]"
            >
              {fontSize}px
            </output>
            <Tooltip$1 content={resetLabel} side="top">
              <button
                type="button"
                aria-label={resetLabel}
                data-action-ui-id="popover.prompt-font-size-reset"
                disabled={fontSize === PROMPT_FONT_SIZE_DEFAULT}
                className="nowheel nopan nodrag flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-[var(--canvas-controls-text-muted)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--canvas-node-border-selected)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
                onClick={(event) => {
                  event.stopPropagation();
                  resetFontSize();
                }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </Tooltip$1>
          </PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </PopoverRoot>
  );
}
export function PromptInputMetaRow({
  getPromptText,
  copyDisabled,
  currentLength,
  maxLength,
  leadingAction,
  showUtilityControls = true,
}) {
  const showLengthHint = !!maxLength && maxLength > 0;
  return (
    <div className="mt-2 flex h-6 shrink-0 items-center justify-end gap-1">
      {leadingAction ? (
        <>
          <div className="flex min-w-0 items-center">{leadingAction}</div>
          <span aria-hidden="true" className="h-3 w-px bg-foreground/15" />
        </>
      ) : null}
      <div className="flex shrink-0 items-center gap-0">
        {showUtilityControls ? (
          <TooltipProvider$1 delay={100} closeDelay={0}>
            <div className="flex shrink-0 items-center gap-0.5">
              <PromptCopyControl getPromptText={getPromptText} disabled={copyDisabled} />
              <PromptFontSizeControl />
            </div>
          </TooltipProvider$1>
        ) : null}
        {showLengthHint ? (
          <>
            <span aria-hidden="true" className="ml-0.5 mr-[5px] h-3 w-px bg-foreground/15" />
            <PromptLengthHint currentLength={currentLength} maxLength={maxLength} />
          </>
        ) : null}
      </div>
    </div>
  );
}
export function PromptTextarea({
  value,
  onChange,
  placeholder,
  disabled: disabled2,
  readOnly: readOnly2,
  onClose,
  blockKeyHandlers,
  textareaRef,
  maxLength,
  currentLength,
  showUtilityControls,
}) {
  const fontSize = usePromptFontSizeStore((state2) => state2.fontSize);
  const handleKeyDown2 = (e2) => {
    e2.stopPropagation();
    if (e2.key === "Escape" && !blockKeyHandlers) onClose();
  };
  return (
    <div
      className="canvas-prompt-font-size-editor flex w-full h-full min-h-0 flex-col"
      style={{
        "--canvas-prompt-font-size": fontSize,
      }}
    >
      <textarea
        ref={textareaRef}
        className={`canvas-prompt-font-size-textarea nowheel nopan w-full min-h-0 flex-1 resize-none border-none bg-transparent text-[var(--canvas-controls-text)] outline-none placeholder:text-muted-foreground/50 ${readOnly2 ? "hover:cursor-not-allowed" : ""}`}
        value={value}
        onChange={(e2) => onChange(e2.target.value)}
        onKeyDown={handleKeyDown2}
        onClick={(e2) => e2.stopPropagation()}
        disabled={disabled2}
        readOnly={readOnly2}
        placeholder={placeholder}
        data-action-ui-id="popover.prompt-input"
      />
      <PromptInputMetaRow
        getPromptText={() => value}
        copyDisabled={value.length === 0}
        currentLength={currentLength ?? countPromptCharacters(value)}
        maxLength={readOnly2 ? void 0 : maxLength}
        showUtilityControls={showUtilityControls}
      />
    </div>
  );
}
const GRID_CLASS_BY_COUNT = {
  2: "grid-cols-2",
  3: "grid-cols-3",
};
export function SegmentedSwitch$1({
  value,
  options,
  onValueChange,
  ariaLabel,
  dataActionUiId,
  thumbDataSlot = "segmented-switch-thumb",
  variant = "icon",
  size: size2 = "md",
  gap = "none",
  stretch = false,
  className,
  itemClassName,
  thumbClassName,
  iconSize = 16,
  iconStrokeWidth = 1.5,
  renderTooltip,
}) {
  const selectedIndex = Math.max(
    0,
    options.findIndex((option2) => option2.value === value),
  );
  const optionCount = Math.max(1, options.length);
  const itemGapRem = gap === "xs" ? 0.125 : 0;
  const totalGapRem = (optionCount - 1) * itemGapRem;
  const selectedGapOffsetRem = selectedIndex * itemGapRem;
  const gridStyle =
    options.length in GRID_CLASS_BY_COUNT
      ? void 0
      : {
          gridTemplateColumns: `repeat(${optionCount}, minmax(0, 1fr))`,
        };
  const thumbStyle = {
    width:
      gap === "xs"
        ? `calc((100% - 4px - ${totalGapRem}rem) / ${optionCount})`
        : `calc((100% - 4px) / ${optionCount})`,
    transform:
      selectedGapOffsetRem > 0
        ? `translateX(calc(${selectedIndex * 100}% + ${selectedGapOffsetRem}rem))`
        : `translateX(${selectedIndex * 100}%)`,
  };
  const content2 = (
    <fieldset
      aria-label={ariaLabel}
      data-action-ui-id={dataActionUiId}
      className={cn$5(
        "relative m-0 grid min-w-0 rounded-[8px] border-0 bg-foreground/[0.025] p-0.5 dark:bg-foreground/[0.05]",
        gap === "xs" && "gap-0.5",
        stretch ? "w-full" : "w-max",
        GRID_CLASS_BY_COUNT[options.length],
        className,
      )}
      style={gridStyle}
    >
      <span
        aria-hidden={true}
        data-slot={thumbDataSlot}
        className={cn$5(
          "pointer-events-none absolute top-0.5 left-0.5 rounded-[6px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] transition-transform duration-200 ease-out dark:bg-white/[0.08] dark:shadow-none",
          size2 === "sm" ? "h-6" : "h-7",
          thumbClassName,
        )}
        style={thumbStyle}
      />
      {options.map((option2) => {
        const selected2 = option2.value === value;
        const Icon2 = option2.icon;
        const labelText = typeof option2.label === "string" ? option2.label : void 0;
        const button = (
          <button
            key={option2.value}
            type="button"
            aria-pressed={selected2}
            aria-label={option2.ariaLabel ?? labelText}
            disabled={option2.disabled}
            data-action-ui-id={option2.dataActionUiId}
            className={cn$5(
              "relative z-10 inline-flex items-center justify-center rounded-[6px] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              variant === "icon"
                ? size2 === "sm"
                  ? "size-6"
                  : "size-7"
                : cn$5(
                    "min-w-0 gap-1 whitespace-nowrap",
                    size2 === "sm" ? "h-6 px-2 text-[11px]" : "h-7 px-2.5 text-[13px]",
                  ),
              selected2
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground font-normal",
              itemClassName,
            )}
            onClick={() => {
              if (!option2.disabled && option2.value !== value) {
                onValueChange(option2.value);
              }
            }}
          >
            {Icon2 && <Icon2 className="shrink-0" size={iconSize} strokeWidth={iconStrokeWidth} />}
            {(variant === "label" || !Icon2) && (
              <span className="min-w-0 truncate">{option2.label}</span>
            )}
          </button>
        );
        if (!option2.tooltip || !renderTooltip) return button;
        return renderTooltip(button, option2.tooltip);
      })}
    </fieldset>
  );
  return content2;
}
export const TIMELINE_CONFIG = {
  /** 刻度尺高度 */
  RULER_HEIGHT: 28,
  /** 视频轨道高度 */
  VIDEO_TRACK_HEIGHT: 80,
  /** 片段圆角 */
  CLIP_BORDER_RADIUS: 6,
  /** 片段内边距 */
  CLIP_PADDING: 4,
  /** 默认缩放（像素/秒） */
  DEFAULT_SCALE: 100,
  /** 最小缩放 */
  MIN_SCALE: 0.5,
  /** 最大缩放 */
  MAX_SCALE: 500,
  /** 缩放步进因子 */
  ZOOM_FACTOR: 1.15,
  /** 裁剪选框手柄宽度 */
  CROP_HANDLE_WIDTH: 8,
  /** 裁剪手柄向外扩展的像素数，使播放指针在起止位置时位于手柄内部 */
  CROP_HANDLE_OUTSET: 8,
  /** 波形 bar 宽度（像素） */
  WAVEFORM_BAR_WIDTH: 2,
  /** 波形 bar 间距（像素） */
  WAVEFORM_BAR_GAP: 1,
  /** 刻度尺与缩略图轨道左右内边距 */
  TRACK_PADDING_H: 6,
  /** 时间轴最小总时长（秒），保证时间轴始终有足够的可见长度 */
  MIN_TOTAL_DURATION: 60,
};
export const LIGHT_THEME_COLORS = {
  BACKGROUND: "#ffffff",
  RULER_LINE: "#12141F73",
  RULER_TEXT: "#12141F73",
  PLAYHEAD: "#15171F",
  PLAYHEAD_FILL: "#F5F7FF",
  PLAYHEAD_STROKE: "#000000",
  VIDEO_CLIP: "#ffffff10",
  SELECTED_BORDER: "#ffffff",
  HOVER_BORDER: "#aaaaaa",
  CLIP_TEXT: "#ffffff",
  CROP_MASK: "rgba(255, 255, 255, 0.8)",
  SEGMENT_MASK: "rgba(255, 255, 255, 0.65)",
  CROP_BORDER: "#000000",
  CROP_HANDLE: "#000000",
  CROP_HANDLE_INNER: "#F5F6FF",
  AUDIO_WAVEFORM: "#7657FF",
  THUMBNAIL_PLACEHOLDER: "rgba(0, 0, 0, 0.10)",
  THUMBNAIL_SEPARATOR: "rgba(255, 255, 255, 0.06)",
};
export const DARK_THEME_COLORS = {
  BACKGROUND: "#121316",
  RULER_LINE: "rgba(224, 229, 255, 0.35)",
  RULER_TEXT: "rgba(235, 238, 255, 0.65)",
  PLAYHEAD: "#F5F6FF",
  PLAYHEAD_FILL: "#F5F6FF",
  PLAYHEAD_STROKE: "#15171F",
  VIDEO_CLIP: "rgba(255, 255, 255, 0.06)",
  SELECTED_BORDER: "#F5F6FF",
  HOVER_BORDER: "rgba(235, 238, 255, 0.65)",
  CLIP_TEXT: "#F5F6FF",
  CROP_MASK: "rgba(18, 19, 22, 0.8)",
  SEGMENT_MASK: "rgba(18, 19, 22, 0.65)",
  CROP_BORDER: "#F5F6FF",
  CROP_HANDLE: "#F5F6FF",
  CROP_HANDLE_INNER: "#15171F",
  AUDIO_WAVEFORM: "#7657FF",
  THUMBNAIL_PLACEHOLDER: "rgba(255, 255, 255, 0.06)",
  THUMBNAIL_SEPARATOR: "rgba(197, 184, 255, 0.08)",
};
export const DEFAULT_CROP_CONFIG = {
  /** 最小裁切时长（秒） */
  minDuration: 2,
  /** 最大裁切时长（秒） */
  maxDuration: 15.4,
};
export const TIME_INTERVALS = [
  {
    minScale: 400,
    interval: 0.5,
    subDivisions: 5,
  },
  // 每格0.1s  gap@400: 200px
  {
    minScale: 200,
    interval: 1,
    subDivisions: 5,
  },
  // 每格0.2s  gap@200: 200px
  {
    minScale: 100,
    interval: 1,
    subDivisions: 5,
  },
  // 每格0.2s  gap@100: 100px
  {
    minScale: 50,
    interval: 2,
    subDivisions: 4,
  },
  // 每格0.5s  gap@50:  100px
  {
    minScale: 25,
    interval: 5,
    subDivisions: 5,
  },
  // 每格1s    gap@25:  125px
  {
    minScale: 10,
    interval: 10,
    subDivisions: 5,
  },
  // 每格2s    gap@10:  100px
  {
    minScale: 4,
    interval: 30,
    subDivisions: 6,
  },
  // 每格5s    gap@4:   120px
  {
    minScale: 1.5,
    interval: 60,
    subDivisions: 6,
  },
  // 每格10s   gap@1.5: 90px
  {
    minScale: 0,
    interval: 120,
    subDivisions: 4,
  },
  // 每格30s   gap@0.5: 60px
];
