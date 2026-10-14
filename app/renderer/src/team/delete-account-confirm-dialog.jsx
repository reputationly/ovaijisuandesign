// delete-account-confirm-dialog.jsx
import reactExports from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "../media-editing/lucide-icon-wraps.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useAuth } from "../assets/credit-query-keys.jsx";
import {
  backendUserMessage,
  deleteAccount,
  isVerifyCodeError,
  RESEND_COOLDOWN_SEC,
  sendCancelCode,
  SUBMIT_LOCK_AFTER_SEND_MS,
  WARNING_KEYS,
} from "./map-hub-cancel-check.js";
import { AlertDialog, Button } from "../infra/dialog-content.jsx";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../infra/badge-variants.jsx";
import { Checkbox } from "../infra/checkbox.jsx";
import { Label } from "./use-wallet-query.jsx";
import { Input3 } from "../infra/select-content.jsx";
export function DeleteAccountConfirmDialog({ open, onOpenChange, onDeleted }) {
  const { t } = useTranslation();
  const { clearLocalAuth } = useAuth();
  const dataErasedId = reactExports.useId();
  const selfInitiatedId = reactExports.useId();
  const [dataErasedChecked, setDataErasedChecked] =
    reactExports.useState(false);
  const [selfInitiatedChecked, setSelfInitiatedChecked] =
    reactExports.useState(false);
  const [verifyCode, setVerifyCode] = reactExports.useState("");
  const [countdown, setCountdown] = reactExports.useState(0);
  const [actionError, setActionError] = reactExports.useState(null);
  const [submitLocked, setSubmitLocked] = reactExports.useState(false);
  const timerRef = reactExports.useRef(null);
  const submitLockTimerRef = reactExports.useRef(null);
  const canSubmit =
    dataErasedChecked &&
    selfInitiatedChecked &&
    verifyCode.trim().length > 0 &&
    !submitLocked;
  reactExports.useEffect(() => {
    if (open) {
      setDataErasedChecked(false);
      setSelfInitiatedChecked(false);
      setVerifyCode("");
      setActionError(null);
      setSubmitLocked(false);
    }
  }, [open]);
  reactExports.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (submitLockTimerRef.current) clearTimeout(submitLockTimerRef.current);
    };
  }, []);
  const startCountdown = () => {
    setCountdown(RESEND_COOLDOWN_SEC);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1e3);
  };
  const sendCodeMutation = useMutation({
    mutationFn: () => sendCancelCode(),
    retry: false,
    onSuccess: () => {
      dedupedToast.success(t("account.delete.codeSent"));
      startCountdown();
      setSubmitLocked(true);
      if (submitLockTimerRef.current) clearTimeout(submitLockTimerRef.current);
      submitLockTimerRef.current = setTimeout(
        () => setSubmitLocked(false),
        SUBMIT_LOCK_AFTER_SEND_MS,
      );
    },
    onError: () => {
      dedupedToast.error(t("account.delete.codeSendFailed"));
    },
  });
  const mutation = useMutation({
    mutationFn: () => deleteAccount(verifyCode.trim()),
    retry: false,
    onSuccess: () => {
      dedupedToast.success(t("account.delete.successToast"));
      onDeleted();
      clearLocalAuth();
    },
    onError: (error) => {
      const message = backendUserMessage(error);
      if (message) {
        setActionError(message);
        return;
      }
      setActionError(
        isVerifyCodeError(error)
          ? t("account.delete.verifyCodeError")
          : t("account.delete.failed"),
      );
    },
  });
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => !mutation.isPending && onOpenChange(nextOpen)}
    >
      <AlertDialogContent
        layer="nested"
        className="max-h-[85vh] grid-rows-[auto_1fr_auto]"
        data-action-ui-id="account-delete-confirm-dialog"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("account.delete.confirmTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("account.delete.confirmIntro")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="scrollbar-fade min-h-0 space-y-6 overflow-y-auto pr-1.5 [scrollbar-gutter:stable]">
          <ol className="list-decimal space-y-1 rounded-lg bg-secondary py-2.5 pr-3 pl-7 text-xs/relaxed text-foreground/70">
            {WARNING_KEYS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ol>
          <div className="space-y-2.5">
            <div className="hilo-checkbox-label flex items-start">
              <Checkbox
                id={dataErasedId}
                checked={dataErasedChecked}
                onCheckedChange={(checked) =>
                  setDataErasedChecked(checked === true)
                }
                disabled={mutation.isPending}
                data-action-ui-id="account-delete-confirm.ack-data-erased"
              />
              <Label
                htmlFor={dataErasedId}
                className="cursor-pointer pt-1.5 text-sm font-normal pointer-coarse:pt-3"
              >
                {t("account.delete.ackDataErased")}
              </Label>
            </div>
            <div className="hilo-checkbox-label flex items-start">
              <Checkbox
                id={selfInitiatedId}
                checked={selfInitiatedChecked}
                onCheckedChange={(checked) =>
                  setSelfInitiatedChecked(checked === true)
                }
                disabled={mutation.isPending}
                data-action-ui-id="account-delete-confirm.ack-self-initiated"
              />
              <Label
                htmlFor={selfInitiatedId}
                className="cursor-pointer pt-1.5 text-sm font-normal pointer-coarse:pt-3"
              >
                {t("account.delete.ackSelfInitiated")}
              </Label>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-normal">
              {t("account.delete.verifyCodeLabel")}
            </Label>
            <div className="flex gap-2">
              <Input3
                value={verifyCode}
                onChange={(changeEvent) => setVerifyCode(changeEvent.target.value)}
                placeholder={t("account.delete.verifyCodePlaceholder")}
                disabled={mutation.isPending}
                inputMode="numeric"
                autoComplete="one-time-code"
                data-action-ui-id="account-delete-confirm.verify-code"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={
                  countdown > 0 ||
                  sendCodeMutation.isPending ||
                  mutation.isPending
                }
                onClick={() => sendCodeMutation.mutate()}
                data-action-ui-id="account-delete-confirm.send-code"
              >
                {countdown > 0
                  ? t("account.delete.resendCodeIn", {
                      seconds: countdown,
                    })
                  : t("account.delete.sendCode")}
              </Button>
            </div>
          </div>
          {actionError ? (
            <div
              role="alert"
              className="rounded-lg border border-border bg-muted p-3 text-xs text-foreground"
              data-action-ui-id="account-delete-confirm.error"
            >
              <p className="flex gap-2">
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0"
                  strokeWidth={1.5}
                  aria-hidden={true}
                />
                <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                  {actionError}
                </span>
              </p>
            </div>
          ) : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            loading={mutation.isPending}
            disabled={!canSubmit || mutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              if (!canSubmit || mutation.isPending) return;
              mutation.mutate();
            }}
            data-action-ui-id="account-delete-confirm.submit"
          >
            {t("account.delete.submitButton")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
