// params-chip.jsx
import { AspectRatioIcon, parseRatio } from "./resolution-tabs.jsx";
import {
  CompositedSvg,
  jsxRuntimeExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Settings2 } from "../media-editing/package.jsx";
import { Tooltip$1 } from "./missing-asset-card.jsx";

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
      <path
        d="M5 1.00012H7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

const DURATION_REGEX =
  /^\d+(?:[.-]\d+)*\s*(?:s|sec|secs|seconds?|m|min|mins|minutes?|秒|分钟)$/i;

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
