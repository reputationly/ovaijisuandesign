// credit-threshold-reminder-card.jsx
import { resolveModelNameForCurrentRegion } from "../generation/replace-configured-model-names-for-current-region.js";
import { CircleAlert, reactExports, useTranslation } from "../vendor.js";
import {
  Icon,
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  CollapsedSettledRow,
  CollapseSettledButton,
  useCreditCountdown,
  useSettledCollapse,
} from "./streaming-label.jsx";
import { Button, TooltipContent } from "../infra/dialog-content.jsx";
import { Checkbox } from "../infra/checkbox.jsx";
function formatCredits(value) {
  return value?.toLocaleString();
}
function registryHintForMediaType(mediaType) {
  if (mediaType === "image" || mediaType === "video" || mediaType === "audio")
    return mediaType;
  if (
    mediaType === "music" ||
    mediaType === "speech" ||
    mediaType === "tts" ||
    mediaType === "voice"
  ) {
    return "audio";
  }
  return void 0;
}
function batchItemLabel(item) {
  return item.model
    ? resolveModelNameForCurrentRegion(
        item.model,
        registryHintForMediaType(item.mediaType),
      )
    : item.mediaType;
}
export function CreditThresholdReminderCard({
  estimate,
  onCancel,
  onContinue,
  expiresAt,
  awaitSettlement = false,
  resolved: externallyResolved = false,
  decision,
  settlementStatus,
}) {
  const { t: t2 } = useTranslation();
  const [state2, setState] = reactExports.useState("pending");
  const [actionFailed, setActionFailed] = reactExports.useState(false);
  const [selectedItemIds, setSelectedItemIds] = reactExports.useState(() =>
    estimate.selectedItemIds
      ? [...estimate.selectedItemIds]
      : estimate.batchItems &&
          estimate.maxSelectableCredits !== void 0 &&
          estimate.estimatedCredits !== void 0 &&
          estimate.estimatedCredits <= estimate.maxSelectableCredits
        ? estimate.batchItems.map((item) => item.itemId)
        : [],
  );
  reactExports.useEffect(() => {
    if (externallyResolved && estimate.selectedItemIds) {
      setSelectedItemIds([...estimate.selectedItemIds]);
    }
  }, [estimate.selectedItemIds, externallyResolved]);
  const estimatedCredits = formatCredits(estimate.estimatedCredits);
  const thresholdCredits = formatCredits(estimate.thresholdCredits);
  const currentCredits = formatCredits(estimate.currentCredits);
  const remainingCredits = formatCredits(estimate.remainingCredits);
  const busy = state2 === "cancelling" || state2 === "continuing";
  const resolved =
    externallyResolved || state2 === "cancelled" || state2 === "continued";
  const countdown = useCreditCountdown(expiresAt, !resolved);
  const settlementExpired = settlementStatus === "expired";
  const settlementFailed =
    settlementStatus === "insufficient" || settlementStatus === "unavailable";
  const settledSummary = settlementExpired
    ? t2(
        "chat.creditReminder.expired",
        "Confirmation timed out; this generation was cancelled.",
      )
    : settlementFailed
      ? t2(
          "chat.creditReminder.actionError",
          "Could not update this generation. Try again.",
        )
      : decision === "continue" || state2 === "continued"
        ? t2(
            "chat.creditReminder.continued",
            "Confirmed. Generation is continuing.",
          )
        : t2("chat.creditReminder.cancelled", "Generation cancelled.");
  const { collapsed, expand, collapse } = useSettledCollapse(resolved);
  const selectedCredits = reactExports.useMemo(
    () =>
      (estimate.batchItems ?? [])
        .filter((item) => selectedItemIds.includes(item.itemId))
        .reduce((sum2, item) => sum2 + item.estimatedCredits, 0),
    [estimate.batchItems, selectedItemIds],
  );
  const isBatch = (estimate.batchItems?.length ?? 0) > 0;
  const showSelection = (estimate.batchItems?.length ?? 0) > 1;
  const selectionRequired =
    isBatch &&
    estimate.maxSelectableCredits !== void 0 &&
    (estimate.estimatedCredits ?? 0) > estimate.maxSelectableCredits;
  const selectionValid =
    !isBatch ||
    (selectedItemIds.length > 0 &&
      selectedCredits <=
        (estimate.maxSelectableCredits ?? Number.MAX_SAFE_INTEGER));
  const handleAction = async (nextState, resolvedState, action, selected2) => {
    if (busy || resolved) return;
    setActionFailed(false);
    setState(nextState);
    try {
      const accepted = await action(selected2);
      if (accepted === false)
        throw new Error("credit threshold reply was not sent");
      if (!awaitSettlement) setState(resolvedState);
    } catch {
      setActionFailed(true);
      setState("pending");
    }
  };
  if (collapsed) {
    return (
      <CollapsedSettledRow
        icon={CircleAlert}
        title={t2("chat.creditReminder.cardTitle", "Credit usage reminder")}
        summary={settledSummary}
        onExpand={expand}
        actionUiId="chat.credit-threshold-card.expand"
      />
    );
  }
  return (
    <section
      className="w-full rounded-lg border border-border bg-card p-4"
      aria-label={t2("chat.creditReminder.cardTitle", "Credit usage reminder")}
      data-action-ui-id="chat.credit-threshold-card"
    >
      <div className="flex items-center gap-2">
        <Icon
          icon={CircleAlert}
          size="lg"
          strokeWidth={1.5}
          className="text-foreground/70"
        />
        <h3 className="font-heading text-sm font-medium text-foreground">
          {t2("chat.creditReminder.cardTitle", "Credit usage reminder")}
        </h3>
        {countdown && (
          <span
            className="ml-auto rounded-md bg-secondary/60 px-2 py-0.5 font-mono text-xs text-foreground/80"
            aria-live="off"
          >
            {countdown}
          </span>
        )}
        {resolved && <CollapseSettledButton onCollapse={collapse} />}
      </div>
      {showSelection ? (
        <p className="mt-3 text-[14px] leading-[22px] text-muted-foreground">
          {t2("chat.creditReminder.batchDescription", {
            estimated: estimatedCredits ?? "-",
            defaultValue:
              "This generation is estimated to use {{estimated}} credits. Confirm what you want to generate (you can change the reminder threshold under “Agent Mode” in the input box).",
          })}
        </p>
      ) : estimatedCredits && thresholdCredits ? (
        <p className="mt-3 text-[14px] leading-[22px] text-muted-foreground">
          {t2("chat.creditReminder.cardDescription", {
            estimated: estimatedCredits,
            threshold: thresholdCredits,
            defaultValue:
              "This generation is estimated to use {{estimated}} credits, reaching your {{threshold}}-credit reminder.",
          })}
        </p>
      ) : (
        <p className="mt-3 text-[14px] leading-[22px] text-muted-foreground">
          {t2(
            "chat.creditReminder.cardDescriptionFallback",
            "This generation has reached your credit usage reminder.",
          )}
        </p>
      )}
      {showSelection && (
        <div className="mt-3 rounded-md border border-border/70 bg-secondary/40 p-2.5">
          <p className="text-xs font-medium text-foreground">
            {t2("chat.creditReminder.batchTitle", "Choose what to generate")}
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            {estimate.batchItems?.map((item) => {
              const checked = selectedItemIds.includes(item.itemId);
              const itemFitsSelection =
                checked ||
                selectedCredits + item.estimatedCredits <=
                  (estimate.maxSelectableCredits ?? Number.MAX_SAFE_INTEGER);
              const rowText = item.prompt
                ? `${batchItemLabel(item)} · ${item.prompt}`
                : batchItemLabel(item);
              return (
                <label
                  key={item.itemId}
                  htmlFor={`credit-threshold-item-${item.itemId}`}
                  className="hilo-checkbox-label flex cursor-pointer items-center text-xs text-foreground"
                >
                  <Checkbox
                    id={`credit-threshold-item-${item.itemId}`}
                    checked={checked}
                    disabled={busy || resolved || !itemFitsSelection}
                    aria-label={batchItemLabel(item)}
                    onCheckedChange={() =>
                      setSelectedItemIds((current2) =>
                        checked
                          ? current2.filter((id2) => id2 !== item.itemId)
                          : [...current2, item.itemId],
                      )
                    }
                    data-action-ui-id={`chat.credit-threshold.item.${item.itemId}`}
                  />
                  {item.prompt ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={<span className="min-w-0 flex-1 truncate" />}
                      >
                        {rowText}
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-sm break-words"
                      >
                        {item.prompt}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="min-w-0 flex-1 truncate">{rowText}</span>
                  )}
                  <span className="text-muted-foreground">
                    {item.estimatedCredits.toLocaleString()}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t2("chat.creditReminder.batchSelectionSummary", {
              selected: selectedCredits.toLocaleString(),
              limit: estimate.maxSelectableCredits?.toLocaleString() ?? "-",
              defaultValue:
                "Selected {{selected}} credits of {{limit}} available.",
            })}
          </p>
        </div>
      )}
      {(currentCredits || remainingCredits) && (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-md bg-secondary/60 px-3 py-2.5 text-xs">
          {currentCredits && (
            <div>
              <dt className="text-muted-foreground">
                {t2("chat.creditReminder.currentCredits", "Current credits")}
              </dt>
              <dd className="mt-0.5 text-foreground">{currentCredits}</dd>
            </div>
          )}
          {remainingCredits && (
            <div>
              <dt className="text-muted-foreground">
                {t2(
                  "chat.creditReminder.remainingCredits",
                  "Estimated remaining",
                )}
              </dt>
              <dd className="mt-0.5 text-foreground">{remainingCredits}</dd>
            </div>
          )}
        </dl>
      )}
      {actionFailed && (
        <p className="mt-3 text-xs text-destructive" role="alert">
          {t2(
            "chat.creditReminder.actionError",
            "Could not update this generation. Try again.",
          )}
        </p>
      )}
      {resolved ? (
        <p className="mt-4 text-xs text-muted-foreground" aria-live="polite">
          {settledSummary}
        </p>
      ) : (
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={state2 === "cancelling"}
            disabled={busy}
            onClick={() =>
              void handleAction("cancelling", "cancelled", onCancel)
            }
            data-action-ui-id="chat.credit-threshold.cancel"
          >
            {t2("chat.creditReminder.cancelGeneration", "Cancel generation")}
          </Button>
          <Button
            type="button"
            size="sm"
            loading={state2 === "continuing"}
            disabled={
              busy ||
              !selectionValid ||
              (selectionRequired && selectedItemIds.length === 0)
            }
            onClick={() =>
              void handleAction(
                "continuing",
                "continued",
                onContinue,
                selectedItemIds,
              )
            }
            data-action-ui-id="chat.credit-threshold.continue"
          >
            {t2(
              "chat.creditReminder.continueGeneration",
              "Continue generation",
            )}
          </Button>
        </div>
      )}
    </section>
  );
}
