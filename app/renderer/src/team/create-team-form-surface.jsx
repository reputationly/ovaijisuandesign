// create-team-form-surface.jsx
import { jsxRuntimeExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Label } from "./use-wallet-query.jsx";
import { Button$1, DialogFooter } from "../infra/dialog-content.jsx";
import { Input3 } from "../infra/select-content.jsx";

const MAX_TEAM_NAME_LENGTH = 64;

export function CreateTeamFormSurface({
  inputId,
  inputActionId,
  cancelActionId,
  submitActionId,
  teamName,
  placeholder,
  disabled: disabled2,
  submitting,
  submitDisabled,
  actionsDisabled = false,
  statusText,
  statusTone = "neutral",
  autoFocus = false,
  submitLabel,
  onTeamNameChange,
  onCancel,
}) {
  const { t: t2 } = useTranslation();
  return (
    <>
      <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
        <div className="space-y-1.5">
          <Label htmlFor={inputId}>
            {t2("team.create.nameLabel", {
              defaultValue: "团队名称",
            })}
          </Label>
          <Input3
            id={inputId}
            value={teamName}
            onChange={(event) => onTeamNameChange(event.target.value)}
            placeholder={placeholder}
            disabled={disabled2}
            maxLength={MAX_TEAM_NAME_LENGTH}
            autoFocus={autoFocus}
            data-action-ui-id={inputActionId}
          />
        </div>
        {statusText ? (
          <p
            role={statusTone === "destructive" ? "alert" : "status"}
            aria-live={statusTone === "destructive" ? "assertive" : "polite"}
            className={
              statusTone === "destructive"
                ? "break-words rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                : "break-words rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
            }
          >
            {statusText}
          </p>
        ) : null}
      </div>
      <DialogFooter className="sticky bottom-0 border-t border-border bg-popover px-4 py-3 sm:px-6 sm:py-4">
        <Button$1
          type="button"
          variant="outline"
          className="h-auto min-h-8 min-w-0 whitespace-normal text-center leading-relaxed"
          disabled={actionsDisabled}
          onClick={onCancel}
          data-action-ui-id={cancelActionId}
        >
          {t2("common.cancel", {
            defaultValue: "取消",
          })}
        </Button$1>
        <Button$1
          type="submit"
          className="h-auto min-h-8 min-w-0 whitespace-normal text-center leading-relaxed"
          loading={submitting}
          disabled={actionsDisabled || submitDisabled}
          data-action-ui-id={submitActionId}
        >
          {submitLabel ??
            t2("team.create.submit", {
              defaultValue: "创建并切换",
            })}
        </Button$1>
      </DialogFooter>
    </>
  );
}
