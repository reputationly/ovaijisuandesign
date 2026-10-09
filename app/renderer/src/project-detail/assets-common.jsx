// 资产列表的通用界面：表头、空态、错误态、骨架屏、行勾选与批量操作栏。
import {
  h as useTranslation,
  fM as Button,
  au as cn,
  am as Trash2,
  S as Search,
  X,
  hA as SegmentedSwitch,
  dj as List,
  aB as LayoutGrid,
  aT as AlertTriangle,
  hB as Skeleton,
  d4 as Inbox,
  hC as Checkbox,
  gu as Tooltip,
  gv as TooltipTrigger,
  gw as TooltipContent,
  cf as Download,
  dl as Loader2,
} from "../main.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
export function AssetsHeader({
  breadcrumb,
  rightMeta,
  state,
  viewMode,
  setViewMode,
  actionIdPrefix,
}) {
  const { t } = useTranslation();
  return (
    <div className="flex shrink-0 items-center justify-between gap-3">
      <div className="-ml-1.5 flex min-w-0 items-center">{breadcrumb}</div>
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="relative flex w-40 items-center">
          <Search
            size={13}
            strokeWidth={1.5}
            aria-hidden="true"
            className="pointer-events-none absolute left-2 text-muted-foreground"
          />
          <input
            type="text"
            value={state.search}
            onChange={(event) => state.setSearch(event.target.value)}
            placeholder={t("projectAssets.searchPlaceholder")}
            aria-label={t("projectAssets.searchPlaceholder")}
            data-action-ui-id={`${actionIdPrefix}.search`}
            className="h-7 w-full rounded-md border border-border bg-transparent pl-7 pr-6 text-[12px] outline-none placeholder:text-muted-foreground hover:bg-muted/40 focus:border-ring/50 focus:bg-background focus:ring-1 focus:ring-ring/30"
          />
          {state.search ? (
            <button
              type="button"
              aria-label={t("projectAssets.searchClear")}
              onClick={() => state.setSearch("")}
              className="absolute right-1.5 flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
            >
              <X size={11} strokeWidth={1.5} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <SegmentedSwitch
          value={viewMode}
          onValueChange={setViewMode}
          ariaLabel={t("projectAssets.viewSwitch")}
          dataActionUiId={`${actionIdPrefix}.view-switch`}
          className="[&>span]:!h-6 [&>span]:!rounded-[5px] p-0.5 [&_button]:!size-6"
          options={[
            {
              value: "list",
              label: t("projectAssets.viewList"),
              icon: List,
              ariaLabel: t("projectAssets.viewList"),
              tooltip: t("projectAssets.viewList"),
              dataActionUiId: `${actionIdPrefix}.view-list`,
            },
            {
              value: "grid",
              label: t("projectAssets.viewGrid"),
              icon: LayoutGrid,
              ariaLabel: t("projectAssets.viewGrid"),
              tooltip: t("projectAssets.viewGrid"),
              dataActionUiId: `${actionIdPrefix}.view-grid`,
            },
          ]}
        />
        {rightMeta}
      </div>
    </div>
  );
}
export function AssetsEmptyState({ variant = "default", title, description, cta, className }) {
  const { t } = useTranslation();
  const Icon = variant === "search" ? Search : Inbox;
  const resolvedTitle =
    title ??
    (variant === "search"
      ? t("projectAssets.emptyStateSearchTitle")
      : t("projectAssets.emptyStateTitle"));
  const resolvedDescription =
    description ??
    (variant === "search"
      ? t("projectAssets.emptyStateSearchDesc")
      : t("projectAssets.emptyStateDesc"));
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/70 px-4 py-14 text-center",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-body-14 font-medium text-foreground">{resolvedTitle}</p>
        <p className="max-w-sm text-caption-11 text-muted-foreground">{resolvedDescription}</p>
      </div>
      {cta}
    </div>
  );
}
export function AssetsErrorState({ title, message, onRetry, className }) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/70 px-4 py-14 text-center",
        className,
      )}
      role="alert"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <AlertTriangle size={20} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-body-14 font-medium text-foreground">
          {title ?? t("projectAssets.errorTitle")}
        </p>
        <p className="max-w-md text-caption-11 text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      ) : null}
    </div>
  );
}
export function AssetsListSkeleton({ rows = 6 }) {
  return (
    <div className="flex flex-col" aria-hidden="true">
      {Array.from({
        length: rows,
      }).map((_, index) => (
        <div key={index} className="flex h-13 items-center gap-3 border-b border-border/40 px-3">
          <span className="w-4 shrink-0" />
          <Skeleton className="size-8 rounded-md" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 w-1/3 rounded-md" />
            <Skeleton className="h-2.5 w-1/5 rounded-md" />
          </div>
          <Skeleton className="hidden h-3 w-16 rounded-md sm:block" />
          <Skeleton className="hidden h-3 w-32 rounded-md md:block" />
          <Skeleton className="h-3 w-14 rounded-md" />
        </div>
      ))}
    </div>
  );
}
export function AssetsRowCheckbox({ selected, onToggle, ariaLabel, actionUiId }) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: event boundary prevents the hidden input click from activating the host row.
    <span
      className="contents"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Checkbox
        checked={selected}
        aria-label={ariaLabel}
        data-action-ui-id={actionUiId}
        onCheckedChange={() =>
          onToggle({
            shiftKey: false,
          })
        }
        onClick={(event) => {
          event.stopPropagation();
          if (!event.shiftKey) return;
          event.preventDefault();
          event.preventBaseUIHandler();
          onToggle({
            shiftKey: true,
          });
        }}
        className={cn(
          "cursor-pointer transition-opacity",
          selected ? "opacity-100" : "opacity-0 group-hover/row:opacity-100 focus:opacity-100",
        )}
      />
    </span>
  );
}
export function AssetsSelectionBar({
  count,
  onClear,
  allSelected = false,
  someSelected = false,
  onToggleAll,
  onDownload,
  downloadLabel,
  downloadDisabled,
  onDelete,
  busy = false,
  extraActions,
  actionIdPrefix,
  className,
}) {
  const { t } = useTranslation();
  if (count === 0) return null;
  return (
    <div
      role="toolbar"
      aria-label={t("projectAssets.selectionBar")}
      data-action-ui-id={`${actionIdPrefix}.selection-bar`}
      className={cn(
        "relative sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-[var(--home-content-surface)] px-1 py-2",
        className,
      )}
    >
      {onToggleAll ? (
        <span className="absolute -left-6 top-1/2 flex -translate-y-1/2 items-center justify-center">
          <Tooltip>
            <TooltipTrigger
              render={
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onCheckedChange={onToggleAll}
                  aria-label={t("projectAssets.selectAllFiles")}
                  data-action-ui-id={`${actionIdPrefix}.selection-select-all`}
                />
              }
            />
            <TooltipContent side="bottom">{t("projectAssets.selectAllFiles")}</TooltipContent>
          </Tooltip>
        </span>
      ) : null}
      <span className={cn("text-xs", onToggleAll && "ml-2")}>
        {t("projectAssets.selectedCount", {
          count,
        })}
      </span>
      <span className="flex-1" />
      <Button
        variant="secondary"
        size="sm"
        className="h-7"
        onClick={onClear}
        disabled={busy}
        data-action-ui-id={`${actionIdPrefix}.selection-clear`}
      >
        {t("projectAssets.clearSelection")}
      </Button>
      {onDownload ? (
        <Button
          variant="secondary"
          size="sm"
          className="h-7 gap-1.5"
          onClick={onDownload}
          disabled={busy || downloadDisabled}
          data-action-ui-id={`${actionIdPrefix}.selection-download`}
        >
          <Download size={12} strokeWidth={1.5} data-icon="inline-start" />
          {downloadLabel ?? t("projectAssets.batchDownload")}
        </Button>
      ) : null}
      {extraActions}
      {onDelete ? (
        <Button
          variant="destructive"
          size="sm"
          className="h-7 gap-1.5"
          onClick={onDelete}
          disabled={busy}
          data-action-ui-id={`${actionIdPrefix}.selection-delete`}
        >
          {busy ? (
            <Loader2 size={12} className="animate-spin" data-icon="inline-start" />
          ) : (
            <Trash2 size={12} strokeWidth={1.5} data-icon="inline-start" />
          )}
          {t("projectAssets.batchDelete")}
        </Button>
      ) : null}
    </div>
  );
}
