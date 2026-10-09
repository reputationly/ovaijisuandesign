// feedback-dialog.jsx
import { useTranslation, reactExports, dedupedToast, X$7, usePlatform, Lightbulb, ChevronRight$1, Keyboard, Check, Loader2 } from "../vendor.js";
import { submitFeedback, IPC_CHANNELS, FeedbackContext, recordAction } from "../m15/agent-ws-client.jsx";
import { buildErrorBoundaryDiagnostic, recordErrorBoundaryBreadcrumb, autoUploadErrorBoundaryLogs, loggedErrorBoundaryDiagnostics } from "../m15/attach-native-toast-surface.js";
import { openExternalUrl, getTutorialUrlByLocale, DropdownMenu, Tooltip, TooltipTrigger } from "../m15/graph.jsx";
import { useRouterState } from "../m15/linked-list.js";
import { ImagePlusOutlineIcon, CircleHelp, MessageSquarePlus } from "../m15/parse-item.jsx";
import { FEEDBACK_CONSTRAINTS } from "../m15/push-inline.js";
import { getActiveChatSnapshot, ShortcutsPanel } from "../m08/part-store.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Textarea,
  DialogFooter,
  Button$1,
  DropdownMenuTrigger,
  TooltipContent,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { FeedbackIcon } from "../m08/browser-inspiration-urls.jsx";
import { reportRumError } from "../m07/en.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
function makePreview(file) {
  return {
    id: `${file.name}:${file.lastModified}:${file.size}:${Math.random().toString(36).slice(2, 8)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  };
}
const FEATURE_REQUEST_MODULES = [
  "canvas",
  "asset_center",
  "plugin",
  "agent_chat",
  "home",
  "general",
  "other",
];
function FeedbackDialog({ open, options, onClose }) {
  const { t: t2 } = useTranslation();
  const [description, setDescription] = reactExports.useState("");
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [attachments, setAttachments] = reactExports.useState([]);
  const [selectedModule, setSelectedModule] = reactExports.useState(null);
  const textareaRef = reactExports.useRef(null);
  const fileInputRef = reactExports.useRef(null);
  const isFeatureRequest = options?.category === "feature_request";
  const routerState = useRouterState({
    select: (s2) => s2.location.pathname,
  });
  reactExports.useEffect(() => {
    let focusTimer;
    if (open) {
      setDescription(options?.defaultDescription ?? "");
      setAttachments([]);
      setSelectedModule(null);
      focusTimer = window.setTimeout(() => textareaRef.current?.focus(), 50);
    } else {
      setDescription("");
      setSubmitting(false);
      setSelectedModule(null);
      setAttachments((prev) => {
        for (const a2 of prev) URL.revokeObjectURL(a2.previewUrl);
        return [];
      });
    }
    return () => {
      if (focusTimer !== void 0) {
        window.clearTimeout(focusTimer);
      }
    };
  }, [open, options]);
  reactExports.useEffect(() => {
    return () => {
      setAttachments((prev) => {
        for (const a2 of prev) URL.revokeObjectURL(a2.previewUrl);
        return prev;
      });
    };
  }, []);
  const handleOpenChange = reactExports.useCallback(
    (next2) => {
      if (!next2 && !submitting) onClose();
    },
    [onClose, submitting],
  );
  const handlePickFiles = reactExports.useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  const handleFileInputChange = reactExports.useCallback(
    (e2) => {
      const picked = Array.from(e2.target.files ?? []);
      e2.target.value = "";
      if (picked.length === 0) return;
      setAttachments((prev) => {
        const remainingSlots = FEEDBACK_CONSTRAINTS.ATTACHMENT_MAX_COUNT - prev.length;
        if (remainingSlots <= 0) {
          dedupedToast.error(
            t2("feedback.toast.tooManyAttachments", {
              max: FEEDBACK_CONSTRAINTS.ATTACHMENT_MAX_COUNT,
            }),
          );
          return prev;
        }
        const accepted = [];
        let oversize = 0;
        for (const file of picked.slice(0, remainingSlots)) {
          if (file.size > FEEDBACK_CONSTRAINTS.ATTACHMENT_MAX_BYTES) {
            oversize += 1;
            continue;
          }
          accepted.push(makePreview(file));
        }
        if (oversize > 0) {
          dedupedToast.error(
            t2("feedback.toast.attachmentTooLarge", {
              max: Math.round(FEEDBACK_CONSTRAINTS.ATTACHMENT_MAX_BYTES / (1024 * 1024)),
            }),
          );
        }
        return [...prev, ...accepted];
      });
    },
    [t2],
  );
  const handleRemoveAttachment = reactExports.useCallback((id2) => {
    setAttachments((prev) => {
      const target = prev.find((a2) => a2.id === id2);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a2) => a2.id !== id2);
    });
  }, []);
  const handleSubmit = reactExports.useCallback(async () => {
    if (!options) return;
    const trimmed = description.trim();
    if (trimmed.length < FEEDBACK_CONSTRAINTS.DESCRIPTION_MIN_LENGTH) return;
    if (isFeatureRequest && !selectedModule) return;
    setSubmitting(true);
    try {
      const chat = isFeatureRequest ? null : getActiveChatSnapshot();
      const runtimeSessionId = chat?.focusedSessionId
        ? chat.controller.getRuntimeSessionId(chat.focusedSessionId)
        : void 0;
      const res = await submitFeedback({
        source: options.source,
        category: options.category,
        module: isFeatureRequest ? (selectedModule ?? void 0) : void 0,
        description: trimmed,
        contextType: isFeatureRequest ? void 0 : options.contextType,
        context: isFeatureRequest ? void 0 : options.context,
        logUploadReason: options.logUploadReason,
        currentRoute: routerState,
        files: attachments.map((a2) => a2.file),
        runtimeSessionId,
        workspaceDir: chat?.workspaceDir,
      });
      dedupedToast.success(
        t2("feedback.toast.successWithId", {
          id: res.ticket_id,
        }),
      );
      onClose();
    } catch (err) {
      const message2 = err instanceof Error ? err.message : String(err);
      dedupedToast.error(
        t2("feedback.toast.failed", {
          error: message2,
        }),
      );
      setSubmitting(false);
    }
  }, [
    attachments,
    description,
    isFeatureRequest,
    onClose,
    options,
    routerState,
    selectedModule,
    t2,
  ]);
  const trimmedLength = description.trim().length;
  const canSubmit = reactExports.useMemo(
    () =>
      !submitting &&
      trimmedLength >= FEEDBACK_CONSTRAINTS.DESCRIPTION_MIN_LENGTH &&
      trimmedLength <= FEEDBACK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH &&
      (!isFeatureRequest || selectedModule !== null),
    [submitting, trimmedLength, isFeatureRequest, selectedModule],
  );
  const attachmentSlotsLeft = FEEDBACK_CONSTRAINTS.ATTACHMENT_MAX_COUNT - attachments.length;
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="z-[10000] w-[520px] max-w-[92vw] bg-[var(--canvas-controls-bg)] p-0 sm:max-w-[520px]"
        overlayClassName="z-[10000]"
        data-action-ui-id="feedback.dialog"
      >
        <div className="px-6 pt-6 pb-2">
          <DialogHeader className="text-left space-y-1.5">
            <DialogTitle>
              {isFeatureRequest ? t2("feedback.featureRequest.title") : t2("feedback.dialog.title")}
            </DialogTitle>
            {!isFeatureRequest && (
              <DialogDescription>{t2("feedback.dialog.subtitle")}</DialogDescription>
            )}
          </DialogHeader>
        </div>
        {isFeatureRequest && (
          <div className="px-6 pb-3">
            <div className="mb-2 text-xs font-medium text-foreground/70">
              {t2("feedback.featureRequest.moduleLabel")}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FEATURE_REQUEST_MODULES.map((m3) => {
                const active2 = selectedModule === m3;
                return (
                  <button
                    key={m3}
                    type="button"
                    onClick={() => setSelectedModule(m3)}
                    aria-pressed={active2}
                    data-action-ui-id={`feedback.dialog.module.${m3}`}
                    className={
                      active2
                        ? "cursor-pointer rounded-sm bg-foreground px-2.5 py-1 text-xs text-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        : "cursor-pointer rounded-sm border border-border px-2.5 py-1 text-xs text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    }
                  >
                    {t2(`feedback.featureRequest.module.${m3}`)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="px-6 pb-3">
          <Textarea
            ref={textareaRef}
            value={description}
            onChange={(e2) => setDescription(e2.target.value)}
            placeholder={
              isFeatureRequest
                ? t2("feedback.featureRequest.descriptionPlaceholder")
                : t2("feedback.dialog.descriptionPlaceholder")
            }
            rows={5}
            maxLength={FEEDBACK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH}
            className="min-h-[110px] resize-none bg-[var(--canvas-controls-bg)] dark:bg-[var(--canvas-controls-bg)] text-sm"
            data-action-ui-id="feedback.dialog.description"
          />
        </div>
        <div className="px-6 pb-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={true}
            className="hidden"
            onChange={handleFileInputChange}
            data-action-ui-id="feedback.dialog.fileInput"
          />
          <div className="flex flex-wrap items-center gap-2">
            {attachments.map((a2) => (
              <div
                key={a2.id}
                className="relative size-14 overflow-hidden rounded-[2px] border border-border bg-muted"
              >
                <img
                  src={a2.previewUrl}
                  alt={a2.file.name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(a2.id)}
                  className="absolute right-0 top-0 flex size-4 items-center justify-center bg-foreground/80 text-background transition-colors hover:bg-foreground"
                  aria-label={t2("feedback.dialog.removeAttachment")}
                  data-action-ui-id="feedback.dialog.removeAttachment"
                >
                  <X$7 className="size-3" />
                </button>
              </div>
            ))}
            {attachmentSlotsLeft > 0 && (
              <button
                type="button"
                onClick={handlePickFiles}
                className="flex h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-[2px] border border-dashed border-border bg-transparent px-4 py-1 text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                data-action-ui-id="feedback.dialog.addAttachment"
                title={t2("feedback.dialog.addAttachmentTooltip", {
                  max: FEEDBACK_CONSTRAINTS.ATTACHMENT_MAX_COUNT,
                })}
              >
                <ImagePlusOutlineIcon className="size-5" />
                <span className="text-[10px] leading-tight">
                  {isFeatureRequest
                    ? t2("feedback.featureRequest.addAttachment")
                    : t2("feedback.dialog.addAttachment")}
                </span>
              </button>
            )}
          </div>
        </div>
        {!isFeatureRequest && (
          <div className="mx-6 mb-5">
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t2("feedback.dialog.contextHeading")}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {t2("feedback.dialog.contextSummary")}
            </p>
          </div>
        )}
        <DialogFooter className="border-t border-border px-6 py-3 sm:items-center sm:justify-between">
          <span className="text-[11px] text-muted-foreground">
            {isFeatureRequest ? "" : t2("feedback.dialog.privacyNote")}
          </span>
          <div className="flex items-center gap-2">
            <Button$1
              variant="ghost"
              size="default"
              onClick={onClose}
              disabled={submitting}
              data-action-ui-id="feedback.dialog.cancel"
            >
              {t2("common.cancel")}
            </Button$1>
            <Button$1
              size="default"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              loading={submitting}
              data-action-ui-id="feedback.dialog.submit"
            >
              {t2("feedback.dialog.submit")}
            </Button$1>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function FeedbackProvider({ children: children2 }) {
  const [current2, setCurrent] = reactExports.useState(null);
  const openFeedback = reactExports.useCallback((options) => {
    setCurrent(options);
  }, []);
  const closeFeedback = reactExports.useCallback(() => {
    setCurrent(null);
  }, []);
  reactExports.useEffect(() => {
    const off = window.hilo?.ipcRenderer?.on(IPC_CHANNELS.MENU_OPEN_FEEDBACK, () => {
      setCurrent({
        source: "menu",
      });
    });
    return () => {
      off?.();
    };
  }, []);
  const value = reactExports.useMemo(
    () => ({
      isOpen: current2 !== null,
      current: current2,
      openFeedback,
      closeFeedback,
    }),
    [current2, openFeedback, closeFeedback],
  );
  return (
    <FeedbackContext.Provider value={value}>
      {children2}
      <FeedbackDialog open={current2 !== null} options={current2} onClose={closeFeedback} />
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
export function CanvasHelpButton({
  menuOpen: controlledMenuOpen,
  onMenuOpenChange,
  variant = "floating",
}) {
  const { t: t2, i18n } = useTranslation();
  const platform2 = usePlatform();
  const { openFeedback } = useFeedback();
  const [shortcutsOpen, setShortcutsOpen] = reactExports.useState(false);
  const [uncontrolledMenuOpen, setUncontrolledMenuOpen] = reactExports.useState(false);
  const menuOpen = controlledMenuOpen ?? uncontrolledMenuOpen;
  const handleMenuOpenChange = (open) => {
    if (controlledMenuOpen === void 0) setUncontrolledMenuOpen(open);
    onMenuOpenChange?.(open);
  };
  const handleTutorial = () => {
    void openExternalUrl(platform2, getTutorialUrlByLocale(i18n.language), {
      source: "canvas.help.tutorial",
    });
  };
  const handleFeedback = () => {
    openFeedback({
      source: "canvas_help",
    });
  };
  const handleFeatureRequest = () => {
    openFeedback({
      source: "canvas_help",
      category: "feature_request",
    });
  };
  const helpLabel = t2("canvas.help.tooltip", {
    defaultValue: "帮助指南",
  });
  const helpTrigger = (
    <DropdownMenuTrigger
      className={
        variant === "toolbar"
          ? `pointer-events-auto inline-flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring ${menuOpen ? "bg-[var(--canvas-controls-active)] text-[var(--canvas-controls-text)]" : "text-[var(--canvas-controls-text-muted)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"}`
          : "pointer-events-auto inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-background opacity-70 transition-colors [border-width:var(--divider-width)] hover:border-foreground/80 hover:bg-muted/60 hover:opacity-100 focus:outline-none"
      }
      data-canvas-control-kind={variant === "toolbar" ? "panel" : void 0}
      aria-expanded={variant === "toolbar" ? menuOpen : void 0}
      aria-label={helpLabel}
      data-action-ui-id="canvas.help.trigger"
    >
      <CircleHelp size={variant === "toolbar" ? 18 : 16} strokeWidth={1.5} aria-hidden="true" />
    </DropdownMenuTrigger>
  );
  return (
    <div>
      <DropdownMenu open={menuOpen} onOpenChange={handleMenuOpenChange}>
        <Tooltip>
          <TooltipTrigger render={helpTrigger} />
          <TooltipContent side={variant === "toolbar" ? "top" : "left"}>{helpLabel}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          align={variant === "toolbar" ? "start" : "end"}
          side="top"
          sideOffset={variant === "toolbar" ? 8 : 4}
          className="min-w-[180px] p-1.5"
          style={{
            backgroundColor: "var(--canvas-controls-bg)",
            color: "var(--canvas-controls-text)",
            border: "var(--divider-width) solid var(--canvas-controls-border)",
            boxShadow: "var(--canvas-shadow-menu)",
          }}
        >
          <DropdownMenuItem
            onClick={handleTutorial}
            data-action-ui-id="canvas.help.tutorial"
            className="justify-between gap-2.5 py-2 pr-2 text-[13px] font-normal rounded-md hover:bg-foreground/[0.03] focus:bg-foreground/[0.03]"
          >
            <span className="flex items-center gap-2">
              <Lightbulb size={16} strokeWidth={1.5} />
              {t2("canvas.help.tutorial")}
            </span>
            <ChevronRight$1 size={14} strokeWidth={1.5} className="text-muted-foreground" />
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleFeedback}
            data-action-ui-id="canvas.help.feedback"
            className="justify-between gap-2.5 py-2 pr-2 text-[13px] font-normal rounded-md hover:bg-foreground/[0.03] focus:bg-foreground/[0.03]"
          >
            <span className="flex items-center gap-2">
              <FeedbackIcon size={16} />
              {t2("canvas.help.feedback")}
            </span>
            <ChevronRight$1 size={14} strokeWidth={1.5} className="text-muted-foreground" />
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleFeatureRequest}
            data-action-ui-id="canvas.help.featureRequest"
            className="justify-between gap-2.5 py-2 pr-2 text-[13px] font-normal rounded-md hover:bg-foreground/[0.03] focus:bg-foreground/[0.03]"
          >
            <span className="flex items-center gap-2">
              <MessageSquarePlus size={16} strokeWidth={1.5} />
              {t2("canvas.help.featureRequest")}
            </span>
            <ChevronRight$1 size={14} strokeWidth={1.5} className="text-muted-foreground" />
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShortcutsOpen(true)}
            data-action-ui-id="canvas.help.shortcuts"
            className="justify-between gap-2.5 py-2 pr-2 text-[13px] font-normal rounded-md hover:bg-foreground/[0.03] focus:bg-foreground/[0.03]"
          >
            <span className="flex items-center gap-2">
              <Keyboard size={16} strokeWidth={1.5} />
              {t2("canvas.help.shortcuts")}
            </span>
            <ChevronRight$1 size={14} strokeWidth={1.5} className="text-muted-foreground" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ShortcutsPanel open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
const DEFAULT_SUBMISSION_KEY = "default";
export function useDirectFeedback() {
  const { t: t2 } = useTranslation();
  const statusByKeyRef = reactExports.useRef(new Map());
  const [statusByKey, setStatusByKey] = reactExports.useState({});
  const routerState = useRouterState({
    select: (s2) => s2.location.pathname,
  });
  const setSubmissionStatus = reactExports.useCallback((key2, status) => {
    if (status === "idle") {
      statusByKeyRef.current.delete(key2);
    } else {
      statusByKeyRef.current.set(key2, status);
    }
    setStatusByKey((current2) => {
      if (status === "idle") {
        if (!(key2 in current2)) return current2;
        const next2 = {
          ...current2,
        };
        delete next2[key2];
        return next2;
      }
      if (current2[key2] === status) return current2;
      return {
        ...current2,
        [key2]: status,
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
      if (currentStatus === "submitting" || currentStatus === "submitted") return;
      setSubmissionStatus(submissionKey, "submitting");
      recordAction("feedback:direct_submit", {
        source: options.source,
      });
      try {
        const res = await submitFeedback({
          source: options.source,
          description: options.defaultDescription?.trim() || "Auto-reported error",
          contextType: options.contextType,
          context: options.context,
          logUploadReason: options.logUploadReason,
          currentRoute: routerState,
          traceId: options.traceId,
        });
        setSubmissionStatus(submissionKey, "submitted");
        dedupedToast.success(
          t2("feedback.toast.successWithId", {
            id: res.ticket_id,
          }),
        );
      } catch (err) {
        setSubmissionStatus(submissionKey, "idle");
        const message2 = err instanceof Error ? err.message : String(err);
        dedupedToast.error(
          t2("feedback.toast.failed", {
            error: message2,
          }),
        );
      }
    },
    [routerState, setSubmissionStatus, t2],
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
  const { t: t2 } = useTranslation();
  const { openFeedback } = useFeedback();
  const { submitting, submitted, submitDirect } = useDirectFeedback();
  const resolvedContextType = contextType ?? (errorContext ? "chat_error" : void 0);
  const handleClick2 = () => {
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
    primary: "rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90",
    outline: "rounded-lg border border-border bg-muted px-4 py-2 text-foreground hover:bg-accent",
    link: "text-xs text-destructive underline underline-offset-2 hover:no-underline px-0 py-0",
  };
  const displayLabel =
    directSubmit && submitted
      ? t2("feedback.reported", {
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
    if (submitted) return <Check size={14} strokeWidth={1.5} className="text-green-500" />;
    if (submitting) return <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />;
    return <FeedbackIcon size={14} />;
  };
  return (
    <button
      type="button"
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={handleClick2}
      disabled={isDisabled}
      data-action-ui-id="feedback-button"
    >
      {renderIcon()}
      {displayLabel}
    </button>
  );
}
export const ERROR_BOUNDARY_FEEDBACK_REASON = "user_feedback:error_boundary";
export function buildSupportPayload(input) {
  return [
    `uid: ${input.userId ?? "unknown"}`,
    `code: ${input.failureId}`,
    `time: ${input.timestamp}`,
  ].join("\n");
}
export function formatSupportTime(timestamp2) {
  const date2 = new Date(timestamp2);
  if (Number.isNaN(date2.getTime())) return timestamp2;
  return date2.toLocaleString();
}
export function SupportInfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-background/60 px-2.5 py-1.5">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <code className="min-w-0 truncate font-mono text-[11px] text-foreground">{value}</code>
    </div>
  );
}
function reportErrorBoundaryRum(error, diagnostic) {
  try {
    reportRumError(error, {
      source: "error_boundary",
      failure_id: diagnostic.failureId,
      visibility_state: diagnostic.visibilityState,
      online: diagnostic.online,
      has_component_stack: Boolean(diagnostic.componentStack),
    });
  } catch {}
}
export function logErrorBoundary(error, componentStack) {
  const diagnostic = buildErrorBoundaryDiagnostic(error, componentStack);
  const loggedDiagnostic = {
    failureId: diagnostic.failureId,
    timestamp: diagnostic.timestamp,
  };
  const logMessage = `[ErrorBoundary] ${diagnostic.message}
  failure=${diagnostic.failureId} visibility=${diagnostic.visibilityState} online=${diagnostic.online}
${diagnostic.componentStack ?? "(unavailable)"}`;
  console.error(logMessage);
  try {
    window.hilo?.logger?.error(logMessage);
  } catch {}
  try {
    localStorage.setItem("hilo:last-error-boundary", JSON.stringify(diagnostic));
  } catch {}
  recordErrorBoundaryBreadcrumb(diagnostic);
  reportErrorBoundaryRum(error, diagnostic);
  autoUploadErrorBoundaryLogs(diagnostic);
  loggedErrorBoundaryDiagnostics.set(error, loggedDiagnostic);
  return loggedDiagnostic;
}
