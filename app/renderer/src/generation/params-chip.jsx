// params-chip.jsx
import { AspectRatioIcon, parseRatio } from "./resolution-tabs.jsx";
import {
  CompositedSvg,
  jsxRuntimeExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Settings2 as Settings } from "../media-editing/package.jsx";
import { Tooltip } from "./missing-asset-card.jsx";
function ClockIcon({ size = 12, className }) {
  return (
    <CompositedSvg
      width={size}
      height={size}
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
  const tokens = summary
    .split(/\s*[·•|]\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  return tokens.map((token) => {
    if (parseRatio(token))
      return {
        kind: "ratio",
        text: token,
      };
    if (DURATION_REGEX.test(token))
      return {
        kind: "duration",
        text: token,
      };
    return {
      kind: "text",
      text: token,
    };
  });
}
export function ParamsChip({
  anchorRef,
  summary,
  open: _open,
  onToggle,
  disabled,
  iconOnly = false,
  showSummaryIcons = true,
}) {
  const { t: translate } = useTranslation();
  const segments = splitSummary(summary);
  const hasSegments = segments.length > 0;
  const tooltipContent = summary || translate("canvas.param.chip.placeholder");
  return (
    <Tooltip content={tooltipContent} side="top">
      <button
        ref={anchorRef}
        type="button"
        onClick={(clickEvent) => {
          clickEvent.stopPropagation();
          onToggle();
        }}
        disabled={disabled}
        className="h-8 shrink-0 px-2 text-[13px] font-normal tracking-normal leading-[20px] opacity-70 text-foreground hover:enabled:opacity-100 disabled:cursor-default disabled:opacity-40 min-w-0 max-w-[320px] flex items-center gap-1 canvas-prompt-control"
        aria-label={tooltipContent}
        data-action-ui-id="popover.params-chip"
      >
        {iconOnly ? (
          <Settings size={16} strokeWidth={1.7} aria-hidden="true" />
        ) : !showSummaryIcons ? (
          <span className="min-w-0 flex-1 truncate text-left">
            {summary || translate("canvas.param.chip.placeholder")}
          </span>
        ) : hasSegments ? (
          <span className="min-w-0 flex-1 truncate text-left">
            <span className="inline-flex items-center gap-1">
              {segments.map((segment, index) =>
                // Index is part of the key only to disambiguate the rare case
                // of duplicate raw tokens; segments are short-lived render-only
                // data with no per-item state, so position-based identity is fine.
                // biome-ignore lint/suspicious/noArrayIndexKey: render-only, no state
                jsxRuntimeExports.jsxs(
                  reactExports.Fragment,
                  {
                    children: [
                      index > 0 && <span className="opacity-60">·</span>,
                      segment.kind === "ratio" ? (
                        <span className="inline-flex items-center gap-0.5">
                          <span
                            aria-hidden={true}
                            className="inline-flex size-3 shrink-0 items-center justify-center [&>svg]:size-full"
                          >
                            <AspectRatioIcon ratio={segment.text} />
                          </span>
                          <span>{segment.text}</span>
                        </span>
                      ) : segment.kind === "duration" ? (
                        <span className="inline-flex items-center gap-0.5">
                          <ClockIcon className="shrink-0" />
                          <span>{segment.text}</span>
                        </span>
                      ) : (
                        <span>{segment.text}</span>
                      ),
                    ],
                  },
                  `${segment.kind}-${index}-${segment.text}`,
                ),
              )}
            </span>
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-left">
            {summary || translate("canvas.param.chip.placeholder")}
          </span>
        )}
      </button>
    </Tooltip>
  );
}
