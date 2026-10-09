// 云端资产的空间用量面板。
import {
  h as useTranslation,
  au as cn,
  gu as Tooltip,
  gv as TooltipTrigger,
  gw as TooltipContent,
  hD as formatBytes,
} from "../../main.jsx";
import { __jsx } from "../../shared/jsx-runtime.js";
export function CloudUsagePanel({
  usedBytes,
  totalBytes,
  className,
  loading = false,
  error,
  onRetry,
}) {
  const { t } = useTranslation();
  const ratio = totalBytes > 0 ? Math.min(1, usedBytes / totalBytes) : 0;
  const size = 40;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);
  const ringColor =
    ratio >= 0.9 ? "stroke-destructive" : ratio >= 0.7 ? "stroke-warning" : "stroke-brand-accent";
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className={cn(
              "flex h-[64px] min-w-0 flex-1 cursor-default items-center gap-3.5 rounded-lg border border-border/70 bg-card px-4 transition-colors hover:border-border-strong hover:bg-foreground/[0.025]",
              className,
            )}
            data-action-ui-id="cloud-assets.usage-panel"
          />
        }
      >
        <span className="relative flex size-10 shrink-0 items-center justify-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="-rotate-90"
            aria-hidden="true"
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              className="stroke-foreground/[0.08]"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={loading ? circumference : dashOffset}
              className={cn("transition-[stroke-dashoffset] duration-500 ease-out", ringColor)}
            />
          </svg>
        </span>
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="truncate text-[11px] leading-none tracking-wide text-muted-foreground uppercase">
            {t("cloudAssets.usagePanelTitle", {
              defaultValue: "云端用量",
            })}
          </span>
          {loading ? (
            <span
              aria-hidden="true"
              className="h-[14px] w-24 animate-pulse rounded bg-foreground/[0.08]"
            />
          ) : error ? (
            <button
              type="button"
              onClick={onRetry}
              title={error}
              className="text-[14px] font-medium leading-none text-muted-foreground hover:text-foreground"
              data-action-ui-id="cloud-assets.usage-retry"
            >
              {"-- · "}
              {t("common.retry")}
            </button>
          ) : (
            <span className="truncate text-[14px] font-medium leading-none text-foreground tabular-nums">
              {formatBytes(usedBytes)}
              <span className="ml-1 text-muted-foreground">
                {"/ "}
                {formatBytes(totalBytes)}
              </span>
            </span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-center">
        {t("cloudAssets.usagePanelTooltip", {
          defaultValue: "共创项目的资产存在云端，支持团队人员共享查看",
        })}
      </TooltipContent>
    </Tooltip>
  );
}
