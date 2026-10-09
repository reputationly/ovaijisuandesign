// production-plan-timeline.jsx
import {
  Check,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  Crosshair,
  Loader2,
  reactExports,
  useCurrentWorkspace,
  useTranslation,
} from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  canFocusStageOutputs,
  focusStageOutputs,
  getCurrentProductionStage,
} from "./skill-reload-dock.jsx";
import { Circle, Clock3 } from "../media-editing/package.jsx";
import { Button$1 } from "../infra/dialog-content.jsx";

function getStageActionLabel(stage) {
  return stage.name;
}

function getPendingStageActionLabel(stage) {
  return stage.name;
}

function getProductionPlanProgress(model) {
  const visibleStages = [...model.stages, ...model.pending_stages].sort(
    (left, right) => left.order - right.order,
  );
  const total = visibleStages.length;
  if (total === 0) return "0/0";
  const currentStage =
    getCurrentProductionStage(model) ??
    model.pending_stages[0] ??
    model.stages.at(-1);
  const currentIndex = visibleStages.findIndex(
    (stage) => stage.id === currentStage?.id,
  );
  return `${currentIndex >= 0 ? currentIndex + 1 : 1}/${total}`;
}

function statusLabel(status, t2) {
  if (status === "waiting_user")
    return t2("productionPlan.status.review", "待确认");
  if (status === "doing") return t2("productionPlan.status.doing", "进行中");
  if (status === "blocked") return t2("productionPlan.status.blocked", "受阻");
  if (status === "pending") return t2("productionPlan.status.todo", "待规划");
  return t2("productionPlan.status.done", "已完成");
}

function PendingStageRow({ stage, current: current2, displayOrder }) {
  const { t: t2 } = useTranslation();
  return (
    <div
      className={`relative flex min-h-7 items-center gap-1.5 rounded-md px-1.5 ${current2 ? "bg-foreground/[0.06]" : ""}`}
      data-current={current2 ? "true" : void 0}
    >
      <span
        className={`z-1 flex size-4.5 shrink-0 items-center justify-center rounded-full border text-[10px] ${current2 ? "border-foreground bg-foreground text-background" : "border-foreground/15 bg-card text-muted-foreground"}`}
      >
        {displayOrder}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p
            className={`truncate text-[13px] ${current2 ? "font-medium" : "text-foreground/50"}`}
          >
            {getPendingStageActionLabel(stage)}
          </p>
          {current2 && (
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {statusLabel("pending", t2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StageRow({ stage, current: current2, onLocate }) {
  const { t: t2 } = useTranslation();
  const canLocate = canFocusStageOutputs(stage);
  const statusIcon2 =
    stage.status === "done"
      ? Check
      : stage.status === "doing"
        ? Loader2
        : stage.status === "waiting_user"
          ? Clock3
          : CircleAlert;
  return (
    <div
      className={`relative flex min-h-7 items-center gap-1.5 rounded-md px-1.5 ${current2 ? "bg-foreground/[0.06]" : "hover:bg-foreground/[0.03]"}`}
      data-current={current2 ? "true" : void 0}
    >
      <span
        className={`z-1 flex size-4.5 shrink-0 items-center justify-center rounded-full border text-[10px] ${current2 ? "border-foreground bg-foreground text-background" : stage.status === "done" ? "border-foreground/25 bg-card text-muted-foreground" : "border-foreground/15 bg-card text-muted-foreground"}`}
      >
        <Icon
          icon={statusIcon2}
          size="xs"
          strokeWidth={1.5}
          className={stage.status === "doing" ? "animate-spin" : void 0}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p
            className={`truncate text-[13px] ${current2 ? "font-medium" : "text-foreground/70"}`}
          >
            {getStageActionLabel(stage)}
          </p>
          {current2 && (
            <span className="shrink-0 text-[11px] font-normal text-muted-foreground">
              {statusLabel(stage.status, t2)}
            </span>
          )}
        </div>
        {stage.blocked_reason && (
          <p className="truncate text-[11px] text-destructive/70">
            {stage.blocked_reason}
          </p>
        )}
      </div>
      {canLocate && (
        <Button$1
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onLocate(stage)}
          aria-label={t2("productionPlan.actions.viewOutput", "查看产物")}
          title={t2("productionPlan.actions.viewOutput", "查看产物")}
          data-action-ui-id={`production-plan.locate-stage-${stage.id}`}
        >
          <Icon icon={Crosshair} size="sm" strokeWidth={1.5} />
        </Button$1>
      )}
    </div>
  );
}

export function ProductionPlanTimeline({
  model,
  loading,
  error,
  onRetry,
  expanded: controlledExpanded,
  onExpandedChange,
}) {
  const { t: t2 } = useTranslation();
  const workspaceId2 = useCurrentWorkspace();
  const [uncontrolledExpanded, setUncontrolledExpanded] =
    reactExports.useState(false);
  const expanded = controlledExpanded ?? uncontrolledExpanded;
  const activeStage = getCurrentProductionStage(model);
  const currentPendingStage = activeStage ? void 0 : model?.pending_stages[0];
  const currentStage =
    activeStage ?? (currentPendingStage ? void 0 : model?.stages.at(-1));
  const currentActionLabel = currentStage
    ? getStageActionLabel(currentStage)
    : currentPendingStage
      ? getPendingStageActionLabel(currentPendingStage)
      : void 0;
  const currentStatus =
    currentStage?.status ?? (currentPendingStage ? "pending" : void 0);
  const timelineRows = reactExports.useMemo(
    () =>
      [
        ...(model?.stages ?? []).map((stage) => ({
          kind: "authored",
          stage,
        })),
        ...(model?.pending_stages ?? []).map((stage) => ({
          kind: "pending",
          stage,
        })),
      ].sort((left, right) => left.stage.order - right.stage.order),
    [model],
  );
  const displayOrderById = reactExports.useMemo(
    () =>
      new Map(timelineRows.map((row, index2) => [row.stage.id, index2 + 1])),
    [timelineRows],
  );
  if (!model && !loading && !error) return null;
  const handleLocate = (stage) => {
    if (!workspaceId2) return;
    focusStageOutputs(workspaceId2, stage);
  };
  const handleToggle = () => {
    const nextExpanded = !expanded;
    if (controlledExpanded === void 0) setUncontrolledExpanded(nextExpanded);
    onExpandedChange?.(nextExpanded);
  };
  return (
    <section
      className="shrink-0 border-b border-border bg-card"
      aria-label={t2("productionPlan.title", "制作计划")}
    >
      <button
        type="button"
        className="flex h-9 w-full items-center gap-1.5 px-3 text-left hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
        onClick={handleToggle}
        aria-expanded={expanded}
        data-action-ui-id="production-plan.toggle"
      >
        <Icon
          icon={ClipboardList}
          size="sm"
          strokeWidth={1.5}
          className="shrink-0"
        />
        <span className="shrink-0 text-[13px] font-medium text-foreground">
          {t2("productionPlan.title", "制作计划")}
        </span>
        {loading ? (
          <Icon
            icon={Loader2}
            size="xs"
            strokeWidth={1.5}
            className="animate-spin text-muted-foreground"
          />
        ) : model ? (
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {getProductionPlanProgress(model)}
          </span>
        ) : (
          <Icon
            icon={Circle}
            size="xs"
            strokeWidth={1.25}
            className="text-destructive"
          />
        )}
        <span className="min-w-0 flex-1 truncate text-xs text-foreground/70">
          {currentActionLabel ??
            t2("productionPlan.loadFailed", "暂时无法读取")}
        </span>
        {currentStatus && (
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {statusLabel(currentStatus, t2)}
          </span>
        )}
        <Icon
          icon={ChevronDown}
          size="sm"
          strokeWidth={1.5}
          className={`shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div
          className="px-1.5 pb-1.5"
          data-action-ui-id="production-plan.timeline"
        >
          <div
            className="max-h-40 overflow-y-auto"
            data-action-ui-id="production-plan.timeline-window"
          >
            {error ? (
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                  {t2("productionPlan.loadFailed", "暂时无法读取")}
                </p>
                {onRetry && (
                  <Button$1
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onRetry}
                    data-action-ui-id="production-plan.retry"
                  >
                    {t2("productionPlan.retry", "重试")}
                  </Button$1>
                )}
              </div>
            ) : (
              <div className="relative">
                <span
                  className="absolute bottom-3.5 left-[14px] top-3.5 w-px bg-foreground/10"
                  aria-hidden="true"
                />
                {timelineRows.map((row) =>
                  row.kind === "authored" ? (
                    <StageRow
                      key={row.stage.id}
                      stage={row.stage}
                      current={row.stage.id === currentStage?.id}
                      onLocate={handleLocate}
                    />
                  ) : (
                    <PendingStageRow
                      key={row.stage.id}
                      stage={row.stage}
                      current={row.stage.id === currentPendingStage?.id}
                      displayOrder={
                        displayOrderById.get(row.stage.id) ?? row.stage.order
                      }
                    />
                  ),
                )}
              </div>
            )}
          </div>
          <Button$1
            type="button"
            variant="ghost"
            size="sm"
            className="mt-0.5 h-7 w-full gap-1 text-[11px] font-normal text-muted-foreground"
            onClick={handleToggle}
            aria-label={t2(
              "productionPlan.actions.collapsePlanAria",
              "收起制作计划",
            )}
            data-action-ui-id="production-plan.collapse-bottom"
          >
            {t2("productionPlan.actions.collapsePlan", "收起")}
            <Icon
              icon={ChevronDown}
              size="xs"
              strokeWidth={1.5}
              className="rotate-180"
            />
          </Button$1>
        </div>
      )}
    </section>
  );
}
