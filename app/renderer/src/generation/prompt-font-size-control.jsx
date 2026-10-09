// prompt-font-size-control.jsx
import {
  Check,
  Copy,
  dedupedToast,
  jsxRuntimeExports,
  PopoverPopup,
  PopoverPortal,
  PopoverPositioner,
  PopoverRoot,
  PopoverTrigger$1 as PopoverTrigger,
  PROMPT_FONT_SIZE_DEFAULT,
  PROMPT_FONT_SIZE_MAX,
  PROMPT_FONT_SIZE_MIN,
  reactExports,
  RotateCcw,
  usePromptFontSizeStore,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Type } from "../media-editing/package.jsx";
import { Tooltip } from "./missing-asset-card.jsx";
import { Slider } from "./slider.jsx";
import { TooltipProvider } from "../infra/create-recently-added-store.js";
const PROMPT_FONT_SIZE_STEP = 1;
function PromptLengthHint({ currentLength, maxLength, className }) {
  const { t: t2 } = useTranslation();
  if (!maxLength || maxLength <= 0) return null;
  const overLimit = currentLength > maxLength;
  const approaching =
    !overLimit && currentLength >= Math.floor(maxLength * 0.9);
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
const COPY_FEEDBACK_DURATION_MS = 1500;
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
      }, COPY_FEEDBACK_DURATION_MS);
    },
    [getPromptText, t2],
  );
  return (
    <Tooltip content={feedbackLabel} side="top" closeOnClick={false}>
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
    </Tooltip>
  );
}
function PromptFontSizeControl() {
  const { t: t2 } = useTranslation();
  const fontSize = usePromptFontSizeStore((state2) => state2.fontSize);
  const setFontSize = usePromptFontSizeStore((state2) => state2.setFontSize);
  const resetFontSize = usePromptFontSizeStore(
    (state2) => state2.resetFontSize,
  );
  const label = t2("canvas.prompt.fontSize", {
    defaultValue: "Adjust prompt font size",
  });
  const resetLabel = t2("canvas.prompt.fontSizeReset", {
    defaultValue: "Reset prompt font size",
  });
  return (
    <PopoverRoot>
      <Tooltip content={label} side="top">
        <PopoverTrigger
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
          <Type size={14} strokeWidth={1.8} aria-hidden="true" />
        </PopoverTrigger>
      </Tooltip>
      <PopoverPortal>
        <PopoverPositioner
          align="end"
          side="top"
          sideOffset={6}
          className="isolate z-[10020]"
        >
          <PopoverPopup
            data-slot="prompt-font-size-popover"
            data-action-ui-id="popover.prompt-font-size"
            aria-label={label}
            className="nowheel nopan nodrag flex h-8 w-[198px] origin-(--transform-origin) items-center gap-1.5 rounded-lg border-[0.85px] border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] py-0 pr-1.5 pl-2 text-[var(--canvas-controls-text)] shadow-[var(--canvas-shadow-dropdown)] outline-none dp-motion-quick-zoom"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Slider
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
            <Tooltip content={resetLabel} side="top">
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
            </Tooltip>
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
          <TooltipProvider delay={100} closeDelay={0}>
            <div className="flex shrink-0 items-center gap-0.5">
              <PromptCopyControl
                getPromptText={getPromptText}
                disabled={copyDisabled}
              />
              <PromptFontSizeControl />
            </div>
          </TooltipProvider>
        ) : null}
        {showLengthHint ? (
          <>
            <span
              aria-hidden="true"
              className="ml-0.5 mr-[5px] h-3 w-px bg-foreground/15"
            />
            <PromptLengthHint
              currentLength={currentLength}
              maxLength={maxLength}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
