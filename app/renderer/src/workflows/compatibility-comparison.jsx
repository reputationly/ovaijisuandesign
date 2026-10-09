// 兼容性对照表：需求与本机配置逐项对比。
import {
  h as useTranslation,
  e as Icon,
  bB as CheckCircle2,
  bW as CircleX,
  cL as Gauge,
  bT as CircleMinus,
  bR as CircleHelp,
} from "../main.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  buildCompatibilityRequirements,
  buildMachineValues,
  evaluateWorkflowCompatibility,
} from "./compatibility.js";
export function WorkflowCompatibilityComparison({ recommendation, snapshot, loading }) {
  const { t } = useTranslation();
  const requirements = buildCompatibilityRequirements(recommendation, t);
  const machineValues = buildMachineValues(snapshot, loading, t);
  const evaluatedSnapshot = loading ? null : snapshot;
  const { result, statuses } = evaluateWorkflowCompatibility(recommendation, evaluatedSnapshot);
  const ResultIcon =
    result === "likely" ? CheckCircle2 : result === "insufficient" ? CircleX : Gauge;
  const resultTone =
    result === "insufficient"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : result === "likely"
        ? "border-success/30 bg-success/10 text-success"
        : "border-border bg-muted text-foreground";
  return (
    <section className="space-y-4" data-action-ui-id="workflows-compatibility-comparison">
      <div
        data-compatibility-result={result}
        className={`flex items-start gap-3 rounded-lg border p-4 ${resultTone}`}
      >
        <Icon icon={ResultIcon} size="lg" className="mt-0.5 shrink-0" aria-hidden={true} />
        <div>
          <p className="text-sm font-medium">
            {t(`workflows.detail.compatibility.result.${result}.title`)}
          </p>
          <p className="mt-1 text-xs leading-5 text-current/70">
            {t(`workflows.detail.compatibility.result.${result}.description`)}
          </p>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)] border-b border-border bg-muted/50 text-[11px] font-medium text-muted-foreground">
          <div className="px-4 py-3">{t("workflows.detail.compatibility.item")}</div>
          <div className="border-l border-border px-4 py-3">
            {t("workflows.detail.compatibility.local")}
          </div>
          <div className="border-l border-border px-4 py-3">
            {t("workflows.detail.compatibility.recommended")}
          </div>
        </div>
        {requirements.map((requirement) => {
          const status = statuses[requirement.key];
          const StatusIcon =
            status === "meets"
              ? CheckCircle2
              : status === "insufficient" || status === "unsupported"
                ? CircleX
                : status === "notApplicable"
                  ? CircleMinus
                  : CircleHelp;
          const statusClass =
            status === "insufficient" || status === "unsupported"
              ? "text-destructive"
              : status === "meets"
                ? "text-success"
                : "text-muted-foreground";
          return (
            <div
              key={requirement.key}
              className="grid grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)] border-b border-border last:border-b-0"
            >
              <div className="px-4 py-3 text-xs font-medium text-foreground">
                {requirement.label}
              </div>
              <div className="border-l border-border px-4 py-3">
                <div
                  data-compatibility-status={status}
                  className={`flex items-start gap-2 ${statusClass}`}
                >
                  <Icon
                    icon={StatusIcon}
                    size="sm"
                    className="mt-0.5 shrink-0"
                    aria-hidden={true}
                  />
                  <div className="min-w-0">
                    <p className="break-words text-xs leading-4 text-foreground">
                      {machineValues[requirement.key]}
                    </p>
                    <p className="mt-1 text-[11px] text-current">
                      {t(`workflows.detail.compatibility.status.${status}`)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="border-l border-border px-4 py-3 text-xs leading-4 text-foreground">
                {requirement.value}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] leading-5 text-muted-foreground">
        {t("workflows.detail.compatibility.detectionNote")}
      </p>
    </section>
  );
}
