// credit-reminder-settings.jsx
import { ArrowLeft, reactExports, useTranslation } from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  MAX_CREDIT_REMINDER_THRESHOLD,
  MIN_CREDIT_REMINDER_THRESHOLD,
} from "../generation/to-workspace-browser-url.js";
import { Button$1 } from "../infra/dialog-content.jsx";
import { Input3 } from "../infra/select-content.jsx";
import { Switch } from "../generation/select-content.jsx";

function parseThreshold(value) {
  if (!/^\d+$/.test(value.trim())) return void 0;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : void 0;
}

export function CreditReminderSettings({ config: config2, onBack, onSave }) {
  const { t: t2 } = useTranslation();
  const [enabled, setEnabled] = reactExports.useState(config2.enabled);
  const [thresholdInput, setThresholdInput] = reactExports.useState(
    String(config2.threshold),
  );
  const [saving, setSaving] = reactExports.useState(false);
  const [saveError, setSaveError] = reactExports.useState(false);
  const threshold = parseThreshold(thresholdInput);
  const thresholdInRange =
    threshold !== void 0 &&
    threshold >= MIN_CREDIT_REMINDER_THRESHOLD &&
    threshold <= MAX_CREDIT_REMINDER_THRESHOLD;
  const thresholdInvalid = enabled && !thresholdInRange;
  const handleSave = async () => {
    if (thresholdInvalid) return;
    setSaving(true);
    setSaveError(false);
    try {
      await onSave({
        enabled,
        threshold: thresholdInRange ? threshold : config2.threshold,
      });
      onBack();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      className="flex flex-col gap-3"
      data-action-ui-id="chat-credit-reminder-settings"
    >
      <div className="flex items-center gap-1">
        <Button$1
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={t2("common.back", "Back")}
          onClick={onBack}
          data-action-ui-id="chat-credit-reminder-settings.back"
        >
          <Icon icon={ArrowLeft} size="sm" />
        </Button$1>
        <h3
          id="chat-credit-reminder-settings-title"
          className="font-heading text-sm font-medium text-foreground"
        >
          {t2("chat.creditReminder.settingsTitle", "Credit usage reminder")}
        </h3>
      </div>
      <p className="text-xs/relaxed text-muted-foreground">
        {t2(
          "chat.creditReminder.settingsDescription",
          "Remind me before one generation reaches the selected credit amount.",
        )}
      </p>
      <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary/60 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[13px] text-foreground">
            {t2("chat.creditReminder.enabledLabel", "Credit usage reminder")}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {enabled
              ? t2("chat.creditReminder.enabled", "On")
              : t2("chat.creditReminder.disabled", "Off")}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => setEnabled(checked === true)}
          aria-label={t2(
            "chat.creditReminder.enabledLabel",
            "Credit usage reminder",
          )}
          data-action-ui-id="chat-credit-reminder-settings.toggle"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="chat-credit-reminder-threshold"
          className="text-xs text-foreground/70"
        >
          {t2("chat.creditReminder.thresholdLabel", "Reminder amount")}
        </label>
        <Input3
          id="chat-credit-reminder-threshold"
          type="number"
          min={MIN_CREDIT_REMINDER_THRESHOLD}
          max={MAX_CREDIT_REMINDER_THRESHOLD}
          step={100}
          value={thresholdInput}
          disabled={!enabled}
          aria-invalid={thresholdInvalid}
          aria-describedby="chat-credit-reminder-threshold-hint"
          onChange={(event) => setThresholdInput(event.target.value)}
          data-action-ui-id="chat-credit-reminder-settings.threshold"
        />
        <p
          id="chat-credit-reminder-threshold-hint"
          className={
            thresholdInvalid
              ? "text-[11px] text-destructive"
              : "text-[11px] text-muted-foreground"
          }
        >
          {thresholdInvalid
            ? t2("chat.creditReminder.thresholdError", {
                min: MIN_CREDIT_REMINDER_THRESHOLD.toLocaleString(),
                max: MAX_CREDIT_REMINDER_THRESHOLD.toLocaleString(),
                defaultValue: "Enter an amount from {{min}} to {{max}}.",
              })
            : t2(
                "chat.creditReminder.accountScope",
                "Applies to all projects in this account.",
              )}
        </p>
        {saveError && (
          <p className="text-[11px] text-destructive" role="alert">
            {t2(
              "chat.creditReminder.saveError",
              "Could not save. Your changes are still here.",
            )}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button$1
          type="button"
          variant="outline"
          size="sm"
          onClick={onBack}
          data-action-ui-id="chat-credit-reminder-settings.cancel"
        >
          {t2("common.cancel", "Cancel")}
        </Button$1>
        <Button$1
          type="button"
          size="sm"
          loading={saving}
          disabled={thresholdInvalid}
          onClick={() => void handleSave()}
          data-action-ui-id="chat-credit-reminder-settings.save"
        >
          {t2("common.save", "Save")}
        </Button$1>
      </div>
    </div>
  );
}
