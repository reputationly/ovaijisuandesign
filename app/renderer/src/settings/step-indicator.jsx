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
import { cn$2, TooltipContent } from "../infra/dialog-content.jsx";

function getStepLabelKey({ platform: platform2, state: state2, step }) {
  if (state2 === "done") {
    if (step === "scan")
      return `settings.imBridge.addFlow.stepDone.scan.${platform2}`;
    if (step === "auth")
      return `settings.imBridge.addFlow.stepDone.auth.${platform2}`;
  }
  return step === "scan"
    ? `settings.imBridge.addFlow.step.scan.${platform2}`
    : `settings.imBridge.addFlow.step.${step}`;
}

function StepHintContent({ platform: platform2, step }) {
  const { t: t2 } = useTranslation();
  const hintKey =
    step === "scan"
      ? `settings.imBridge.addFlow.stepHint.scan.${platform2}`
      : `settings.imBridge.addFlow.stepHint.${step}.${platform2}`;
  return <>{t2(hintKey)}</>;
}

function StepIndicator({
  platform: platform2,
  step,
  transitioningToStep,
  transitionLabel,
}) {
  const { t: t2 } = useTranslation();
  const stepKeys =
    platform2 === "feishu" ? ["scan", "auth", "done"] : ["scan", "done"];
  const activeIndex = Math.max(stepKeys.indexOf(step), 0);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center justify-center gap-3">
        {stepKeys.map((key2, index2) => {
          const state2 =
            index2 < activeIndex
              ? "done"
              : index2 === activeIndex
                ? "active"
                : "pending";
          const shouldPulse = state2 === "active" && key2 === "auth";
          const shouldFlowLine = transitioningToStep === stepKeys[index2 + 1];
          return (
            <div key={key2} className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className={cn$2(
                        "group/step relative isolate inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-1 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
                        state2 === "active" && "font-medium text-foreground",
                        state2 === "done" &&
                          "text-foreground/70 hover:text-foreground",
                        state2 === "pending" &&
                          "text-muted-foreground hover:text-foreground",
                      )}
                    />
                  }
                >
                  <span
                    className={cn$2(
                      "relative isolate flex h-4 min-w-12 items-center justify-center rounded-full px-2 text-[10px] font-medium leading-none transition-colors",
                      state2 === "active" &&
                        "bg-foreground text-background group-hover/step:bg-foreground/90",
                      state2 === "done" &&
                        "min-w-8 bg-secondary text-foreground/70 group-hover/step:bg-secondary/80 group-hover/step:text-foreground",
                      state2 === "pending" &&
                        "bg-secondary text-muted-foreground group-hover/step:bg-secondary/80",
                    )}
                  >
                    {shouldPulse && (
                      <span
                        aria-hidden="true"
                        className="absolute -inset-px -z-10 rounded-full border border-foreground/10 bg-foreground/[0.02] motion-safe:animate-[im-status-radar_3600ms_ease-out_infinite]"
                      />
                    )}
                    {state2 === "done" ? (
                      <Icon icon={Check} size="xs" strokeWidth={2} />
                    ) : (
                      t2(`settings.imBridge.addFlow.stepOrdinal.${index2 + 1}`)
                    )}
                  </span>
                  <span className="leading-none">
                    {t2(
                      getStepLabelKey({
                        platform: platform2,
                        state: state2,
                        step: key2,
                      }),
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-[260px] text-center leading-relaxed"
                >
                  <StepHintContent platform={platform2} step={key2} />
                </TooltipContent>
              </Tooltip>
              {index2 < stepKeys.length - 1 && (
                <span
                  className={cn$2(
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
          data-action-ui-id={`im-bridge.${platform2}.step-transition`}
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
  const { t: t2 } = useTranslation();
  const title = t2(`settings.imBridge.addFlow.title.${platform2}`);
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
      className={cn$2(
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
