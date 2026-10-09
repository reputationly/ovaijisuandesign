// error-fallback-ui.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import {
  AlertTriangle,
  CompositedSvg,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { Button$1 } from "./dialog-content.jsx";
import { ShortcutHint } from "../workspace/shortcut-hint.jsx";
import { FeedbackButton } from "../settings/use-direct-feedback.jsx";

const ERROR_BOUNDARY_FEEDBACK_REASON = "user_feedback:error_boundary";

function buildSupportPayload(input) {
  return [
    `uid: ${input.userId ?? "unknown"}`,
    `code: ${input.failureId}`,
    `time: ${input.timestamp}`,
  ].join("\n");
}

function formatSupportTime(timestamp2) {
  const date2 = new Date(timestamp2);
  if (Number.isNaN(date2.getTime())) return timestamp2;
  return date2.toLocaleString();
}

function SupportInfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-background/60 px-2.5 py-1.5">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <code className="min-w-0 truncate font-mono text-[11px] text-foreground">
        {value}
      </code>
    </div>
  );
}

export function ErrorFallbackUI({
  message: message2,
  stack,
  failureId,
  failureTimestamp,
  showDetails,
  onToggleDetails,
  onRetry,
  showFeedbackAction = true,
  containerClassName = "h-screen w-screen",
}) {
  const { t: t2 } = useTranslation();
  const [copied, setCopied] = reactExports.useState(false);
  const [diagnosticsContext, setDiagnosticsContext] =
    reactExports.useState(null);
  const [fallbackTimestamp] = reactExports.useState(() =>
    new Date().toISOString(),
  );
  const supportTimestamp =
    failureTimestamp ?? diagnosticsContext?.timestamp ?? fallbackTimestamp;
  const supportPayload = failureId
    ? buildSupportPayload({
        failureId,
        timestamp: supportTimestamp,
        userId: diagnosticsContext?.userId ?? null,
      })
    : void 0;
  const feedbackErrorContext = supportPayload
    ? `${supportPayload}${
        message2
          ? `
${message2}`
          : ""
      }`
    : message2;
  reactExports.useEffect(() => {
    let cancelled = false;
    window.hilo?.diagnostics
      ?.getDiagnosticsContext?.()
      ?.then((context) => {
        if (!cancelled) setDiagnosticsContext(context);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const handleCopySupportInfo = () => {
    if (!supportPayload) return;
    const writeText = navigator.clipboard?.writeText;
    if (!writeText) return;
    void writeText
      .call(
        navigator.clipboard,
        message2
          ? `${supportPayload}
message: ${message2}`
          : supportPayload,
      )
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2e3);
      })
      .catch(() => {});
  };
  return (
    <div
      className={`flex ${containerClassName} select-none flex-col items-center justify-center bg-background`}
    >
      <div className="flex w-full max-w-md flex-col items-center px-6">
        <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive ring-1 ring-destructive/20">
          <AlertTriangle className="size-5" />
        </div>
        <h1 className="mb-2 text-[15px] font-medium text-destructive">
          {t2("errorBoundary.title", {
            defaultValue: "Something went wrong",
          })}
        </h1>
        <p className="mb-6 text-center text-[13px] leading-relaxed text-muted-foreground">
          {t2("errorBoundary.descriptionLine1", {
            defaultValue: "The application encountered an unexpected error.",
          })}
          <br />
          {t2("errorBoundary.descriptionLine2", {
            defaultValue:
              "You can try again. If the issue persists, please report it.",
          })}
        </p>
        {failureId && (
          <div className="mb-6 w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-[12px]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="font-medium text-foreground">
                {t2("errorBoundary.diagnosticsTitle", {
                  defaultValue: "Diagnostics info",
                })}
              </span>
              <Button$1
                type="button"
                variant="ghost"
                size="xs"
                onClick={handleCopySupportInfo}
                className="gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                data-action-ui-id="error-boundary.copy-diagnostics"
              >
                {copied
                  ? t2("errorBoundary.copied", {
                      defaultValue: "Copied",
                    })
                  : t2("errorBoundary.copyDiagnostics", {
                      defaultValue: "Copy info",
                    })}
              </Button$1>
            </div>
            <div className="grid gap-1.5">
              <SupportInfoRow
                label={t2("errorBoundary.diagnosticsUid", {
                  defaultValue: "UID",
                })}
                value={
                  diagnosticsContext?.userId ??
                  t2("errorBoundary.diagnosticsUnknownUid", {
                    defaultValue: "Unknown",
                  })
                }
              />
              <SupportInfoRow
                label={t2("errorBoundary.diagnosticsCode", {
                  defaultValue: "Code",
                })}
                value={failureId}
              />
              <SupportInfoRow
                label={t2("errorBoundary.diagnosticsTime", {
                  defaultValue: "Time",
                })}
                value={formatSupportTime(supportTimestamp)}
              />
            </div>
          </div>
        )}
        <div className="mb-6 flex gap-2.5">
          {showFeedbackAction ? (
            <FeedbackButton
              errorContext={feedbackErrorContext}
              context={
                failureId
                  ? {
                      error_code: failureId,
                      failure_id: failureId,
                      error_source: "error_boundary",
                      user_id: diagnosticsContext?.userId ?? void 0,
                      timestamp: supportTimestamp,
                    }
                  : void 0
              }
              reason={ERROR_BOUNDARY_FEEDBACK_REASON}
              label={t2("errorBoundary.reportIssue", {
                defaultValue: "Report Issue",
              })}
            />
          ) : null}
          <Button$1
            type="button"
            onClick={onRetry}
            className="h-auto rounded-lg px-4 py-2 text-[13px]"
            data-action-ui-id="error-boundary.retry"
          >
            {t2("errorBoundary.tryAgain", {
              defaultValue: "Try Again",
            })}
          </Button$1>
        </div>
        {message2 && (
          <div className="flex w-full flex-col items-center">
            <Button$1
              type="button"
              variant="ghost"
              size="xs"
              onClick={onToggleDetails}
              className="gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
              data-action-ui-id="error-boundary.toggle-details"
            >
              <CompositedSvg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="currentColor"
                aria-hidden="true"
                className={`transition-transform ${showDetails ? "rotate-90" : ""}`}
              >
                <path
                  d="M3 1.5L7 5L3 8.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </CompositedSvg>
              {t2("errorBoundary.errorDetails", {
                defaultValue: "Error details",
              })}
            </Button$1>
            {showDetails && (
              <pre className="mt-3 max-h-48 w-full overflow-auto rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
                {message2}
                {stack &&
                  `

${stack}`}
              </pre>
            )}
          </div>
        )}
        <p className="mt-10 text-[11px] text-muted-foreground">
          {t2("errorBoundary.press", {
            defaultValue: "Press",
          })}{" "}
          <ShortcutHint
            accelerator="CommandOrControl+R"
            className="inline-flex h-auto min-w-0 items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground"
          />{" "}
          {t2("errorBoundary.toRetry", {
            defaultValue: "to try again",
          })}
        </p>
      </div>
    </div>
  );
}
