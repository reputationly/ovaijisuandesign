// step-indicator.jsx
import {
  Check,
  jsxRuntimeExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  Icon,
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { cn$2 as cn, TooltipContent } from "../infra/dialog-content.jsx";
function getStepLabelKey({ platform, state, step }) {
  if (state === "done") {
    if (step === "scan")
      return `settings.imBridge.addFlow.stepDone.scan.${platform}`;
    if (step === "auth")
      return `settings.imBridge.addFlow.stepDone.auth.${platform}`;
  }
  return step === "scan"
    ? `settings.imBridge.addFlow.step.scan.${platform}`
    : `settings.imBridge.addFlow.step.${step}`;
}
function StepHintContent({ platform, step }) {
  const { t } = useTranslation();
  const hintKey =
    step === "scan"
      ? `settings.imBridge.addFlow.stepHint.scan.${platform}`
      : `settings.imBridge.addFlow.stepHint.${step}.${platform}`;
  return <>{t(hintKey)}</>;
}
function StepIndicator({
  platform,
  step,
  transitioningToStep,
  transitionLabel,
}) {
  const { t } = useTranslation();
  const stepKeys =
    platform === "feishu" ? ["scan", "auth", "done"] : ["scan", "done"];
  const activeIndex = Math.max(stepKeys.indexOf(step), 0);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center justify-center gap-3">
        {stepKeys.map((key, index) => {
          const state =
            index < activeIndex
              ? "done"
              : index === activeIndex
                ? "active"
                : "pending";
          const shouldPulse = state === "active" && key === "auth";
          const shouldFlowLine = transitioningToStep === stepKeys[index + 1];
          return (
            <div key={key} className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className={cn(
                        "group/step relative isolate inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-1 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
                        state === "active" && "font-medium text-foreground",
                        state === "done" &&
                          "text-foreground/70 hover:text-foreground",
                        state === "pending" &&
                          "text-muted-foreground hover:text-foreground",
                      )}
                    />
                  }
                >
                  <span
                    className={cn(
                      "relative isolate flex h-4 min-w-12 items-center justify-center rounded-full px-2 text-[10px] font-medium leading-none transition-colors",
                      state === "active" &&
                        "bg-foreground text-background group-hover/step:bg-foreground/90",
                      state === "done" &&
                        "min-w-8 bg-secondary text-foreground/70 group-hover/step:bg-secondary/80 group-hover/step:text-foreground",
                      state === "pending" &&
                        "bg-secondary text-muted-foreground group-hover/step:bg-secondary/80",
                    )}
                  >
                    {shouldPulse && (
                      <span
                        aria-hidden="true"
                        className="absolute -inset-px -z-10 rounded-full border border-foreground/10 bg-foreground/[0.02] motion-safe:animate-[im-status-radar_3600ms_ease-out_infinite]"
                      />
                    )}
                    {state === "done" ? (
                      <Icon icon={Check} size="xs" strokeWidth={2} />
                    ) : (
                      t(`settings.imBridge.addFlow.stepOrdinal.${index + 1}`)
                    )}
                  </span>
                  <span className="leading-none">
                    {t(
                      getStepLabelKey({
                        platform,
                        state,
                        step: key,
                      }),
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-[260px] text-center leading-relaxed"
                >
                  <StepHintContent platform={platform} step={key} />
                </TooltipContent>
              </Tooltip>
              {index < stepKeys.length - 1 && (
                <span
                  className={cn(
                    "h-px w-16 bg-border",
                    shouldFlowLine &&
                      "bg-[linear-gradient(90deg,var(--border)_0%,var(--border)_35%,color-mix(in_srgb,var(--foreground)_42%,var(--border))_50%,var(--border)_65%,var(--border)_100%)] bg-[length:200%_100%] motion-safe:animate-[im-step-line-flow_1400ms_linear_infinite]",
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>
      {transitionLabel && (
        <p
          className="text-center text-[11px] leading-relaxed text-muted-foreground"
          data-action-ui-id={`im-bridge.${platform}.step-transition`}
        >
          {transitionLabel}
        </p>
      )}
    </div>
  );
}
export function AddFlowFrame({
  platform: platform2,
  step,
  children: children2,
  layout = "dialog",
  onBack,
  onDialogHeaderChange,
  transitioningToStep,
  transitionLabel,
}) {
  const { t } = useTranslation();
  const title = t(`settings.imBridge.addFlow.title.${platform2}`);
  const onBackRef = reactExports.useRef(onBack);
  reactExports.useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);
  reactExports.useEffect(() => {
    if (!onDialogHeaderChange) return;
    onDialogHeaderChange({
      title,
      onBack: () => onBackRef.current(),
    });
    return () => onDialogHeaderChange(null);
  }, [onDialogHeaderChange, title]);
  return (
    <div
      className={cn(
        "flex min-h-full flex-1 flex-col duration-150 animate-in fade-in-0 slide-in-from-right-4",
        layout === "settings" ? "gap-0 pt-5" : "gap-6",
      )}
      data-action-ui-id={`im-bridge.${platform2}.flow`}
    >
      <StepIndicator
        platform={platform2}
        step={step}
        transitioningToStep={transitioningToStep}
        transitionLabel={transitionLabel}
      />
      {children2}
    </div>
  );
}
