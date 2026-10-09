// integration-status-pill.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2, TooltipContent } from "../infra/dialog-content.jsx";
import { InfoIcon$1, jsxRuntimeExports } from "../vendor.js";
import {
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";

const integrationStatusPillToneClass = {
  muted: "bg-secondary text-muted-foreground",
  neutral: "bg-secondary text-foreground/70",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

const integrationStatusMarkerOuterClass = {
  muted: "bg-muted-foreground/15",
  success: "bg-success/15",
  warning: "bg-warning/15",
  destructive: "bg-destructive/15",
};

const integrationStatusMarkerInnerClass = {
  muted: "bg-muted-foreground/60",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

function IntegrationStatusMarker({
  tone,
  active: active2 = false,
  icon,
  label,
}) {
  if (icon) {
    return (
      <span
        role="status"
        className="flex size-2.5 shrink-0 items-center justify-center"
        title={label}
        aria-label={label}
      >
        {icon}
      </span>
    );
  }
  if (!active2) {
    return (
      <span
        role="status"
        className={cn$2(
          "size-1.5 shrink-0 rounded-full",
          integrationStatusMarkerInnerClass[tone],
        )}
        title={label}
        aria-label={label}
      />
    );
  }
  return (
    <span
      role="status"
      className={cn$2(
        "relative isolate flex size-2.5 shrink-0 items-center justify-center rounded-full",
        integrationStatusMarkerOuterClass[tone],
      )}
      title={label}
      aria-label={label}
    >
      <span
        aria-hidden="true"
        className="absolute -inset-px -z-10 rounded-full border border-warning/10 bg-warning/[0.02] motion-safe:animate-[im-status-radar_3600ms_ease-out_infinite]"
      />
      <span
        className={cn$2(
          "size-1 rounded-full",
          integrationStatusMarkerInnerClass[tone],
        )}
      />
    </span>
  );
}

export function IntegrationStatusPill({
  label,
  tone,
  markerTone,
  markerActive,
  markerIcon,
  markerLabel,
  tooltipActionId,
  tooltipContent,
  className,
}) {
  const content2 = (
    <>
      <IntegrationStatusMarker
        tone={markerTone}
        active={markerActive}
        icon={markerIcon}
        label={markerLabel}
      />
      <span className="truncate">{label}</span>
      {tooltipContent && (
        <InfoIcon$1 className="ml-0.5 size-3 shrink-0" strokeWidth={2} />
      )}
    </>
  );
  const pillClassName = cn$2(
    "inline-flex h-[22px] min-w-0 items-center gap-1.5 rounded-full px-2 text-xs font-normal leading-none",
    integrationStatusPillToneClass[tone],
    markerIcon && "gap-1",
    className,
  );
  if (!tooltipContent) {
    return <span className={pillClassName}>{content2}</span>;
  }
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={cn$2(
              pillClassName,
              "cursor-pointer transition-colors hover:bg-warning/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
            )}
            data-action-ui-id={tooltipActionId}
          />
        }
      >
        {content2}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[320px] flex-col items-start gap-1.5 text-left"
      >
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}
