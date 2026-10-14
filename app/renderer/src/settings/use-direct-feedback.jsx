// use-direct-feedback.jsx
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2 } from "../media-editing/lucide-icon-wraps.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import {
  FeedbackContext,
  IPC_CHANNELS,
  recordAction,
} from "../infra/gateway-http-error.jsx";
import { useRouterState } from "../vendor-inline/vscode-base/linked-list.js";
import { submitFeedback } from "../infra/submit-feedback.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { FeedbackIcon } from "../workspace/home-service.jsx";
import { FeedbackDialog } from "./feedback-dialog.jsx";

export function FeedbackProvider({ children }) {
  const [current, setCurrent] = reactExports.useState(null);
  const openFeedback = reactExports.useCallback((options) => {
    setCurrent(options);
  }, []);
  const closeFeedback = reactExports.useCallback(() => {
    setCurrent(null);
  }, []);
  reactExports.useEffect(() => {
    const off = window.hilo?.ipcRenderer?.on(
      IPC_CHANNELS.MENU_OPEN_FEEDBACK,
      () => {
        setCurrent({
          source: "menu",
        });
      },
    );
    return () => {
      off?.();
    };
  }, []);
  const value = reactExports.useMemo(
    () => ({
      isOpen: current !== null,
      current,
      openFeedback,
      closeFeedback,
    }),
    [current, openFeedback, closeFeedback],
  );
  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <FeedbackDialog
        open={current !== null}
        options={current}
        onClose={closeFeedback}
      />
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = reactExports.useContext(FeedbackContext);
  if (ctx) return ctx;
  return {
    isOpen: false,
    current: null,
    openFeedback: () => {},
    closeFeedback: () => {},
  };
}

const DEFAULT_SUBMISSION_KEY = "default";

export function useDirectFeedback() {
  const { t } = useTranslation();
  const statusByKeyRef = reactExports.useRef(new Map());
  const [statusByKey, setStatusByKey] = reactExports.useState({});
  const routerState = useRouterState({
    select: (routerState) => routerState.location.pathname,
  });
  const setSubmissionStatus = reactExports.useCallback((key, status) => {
    if (status === "idle") {
      statusByKeyRef.current.delete(key);
    } else {
      statusByKeyRef.current.set(key, status);
    }
    setStatusByKey((current) => {
      if (status === "idle") {
        if (!(key in current)) return current;
        const next = {
          ...current,
        };
        delete next[key];
        return next;
      }
      if (current[key] === status) return current;
      return {
        ...current,
        [key]: status,
      };
    });
  }, []);
  const getSubmissionStatus = reactExports.useCallback(
    (submissionKey) => statusByKey[submissionKey] ?? "idle",
    [statusByKey],
  );
  const submitDirect = reactExports.useCallback(
    async (options, submissionKey = DEFAULT_SUBMISSION_KEY) => {
      const currentStatus = statusByKeyRef.current.get(submissionKey);
      if (currentStatus === "submitting" || currentStatus === "submitted")
        return;
      setSubmissionStatus(submissionKey, "submitting");
      recordAction("feedback:direct_submit", {
        source: options.source,
      });
      try {
        const res = await submitFeedback({
          source: options.source,
          description:
            options.defaultDescription?.trim() || "Auto-reported error",
          contextType: options.contextType,
          context: options.context,
          logUploadReason: options.logUploadReason,
          currentRoute: routerState,
          traceId: options.traceId,
        });
        setSubmissionStatus(submissionKey, "submitted");
        dedupedToast.success(
          t("feedback.toast.successWithId", {
            id: res.ticket_id,
          }),
        );
      } catch (err) {
        setSubmissionStatus(submissionKey, "idle");
        const message = err instanceof Error ? err.message : String(err);
        dedupedToast.error(
          t("feedback.toast.failed", {
            error: message,
          }),
        );
      }
    },
    [routerState, setSubmissionStatus, t],
  );
  const defaultStatus = getSubmissionStatus(DEFAULT_SUBMISSION_KEY);
  return {
    submitting: defaultStatus === "submitting",
    submitted: defaultStatus === "submitted",
    submitDirect,
    getSubmissionStatus,
  };
}

export function FeedbackButton({
  errorContext,
  reason = "user_feedback",
  label,
  variant = "outline",
  className = "",
  directSubmit = false,
  contextType,
  context,
}) {
  const { t } = useTranslation();
  const { openFeedback } = useFeedback();
  const { submitting, submitted, submitDirect } = useDirectFeedback();
  const resolvedContextType =
    contextType ?? (errorContext ? "chat_error" : void 0);
  const handleClick = () => {
    const options = {
      source: "context",
      contextType: resolvedContextType,
      context,
      defaultDescription: errorContext ?? "",
      logUploadReason: reason,
    };
    if (directSubmit) {
      void submitDirect(options);
    } else {
      openFeedback(options);
    }
  };
  const isDisabled = directSubmit && (submitting || submitted);
  const baseClasses =
    "inline-flex items-center gap-1 text-[13px] transition-colors disabled:opacity-50 cursor-pointer";
  const variantClasses = {
    primary:
      "rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90",
    outline:
      "rounded-lg border border-border bg-muted px-4 py-2 text-foreground hover:bg-accent",
    link: "text-xs text-destructive underline underline-offset-2 hover:no-underline px-0 py-0",
  };
  const displayLabel =
    directSubmit && submitted
      ? t("feedback.reported", {
          defaultValue: "Reported",
        })
      : (label ?? "Report Issue");
  const renderIcon = () => {
    if (!directSubmit || variant === "link") {
      if (directSubmit && submitted)
        return <Check size={12} strokeWidth={1.5} className="text-green-500" />;
      if (directSubmit && submitting)
        return <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />;
      return null;
    }
    if (submitted)
      return <Check size={14} strokeWidth={1.5} className="text-green-500" />;
    if (submitting)
      return <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />;
    return <FeedbackIcon size={14} />;
  };
  return (
    <button
      type="button"
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={handleClick}
      disabled={isDisabled}
      data-action-ui-id="feedback-button"
    >
      {renderIcon()}
      {displayLabel}
    </button>
  );
}
