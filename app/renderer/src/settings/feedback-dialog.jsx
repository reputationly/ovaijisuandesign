// feedback-dialog.jsx
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { X$7 as X } from "../media-editing/lucide-icon-wraps.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { useRouterState } from "../vendor-inline/vscode-base/linked-list.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { submitFeedback } from "../infra/submit-feedback.js";
import { ImagePlusOutlineIcon } from "../media-editing/package.jsx";
import { FEEDBACK_CONSTRAINTS } from "../generation/normalize-skill-detail-metadata.js";
import { getActiveChatSnapshot } from "../chat/attach-handoff-targets-to-sub-messages.js";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import {
  DialogDescription,
  DialogTitle,
  Textarea,
} from "../infra/badge-variants.jsx";
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
export function FeedbackDialog({ open, options, onClose }) {
  const { t } = useTranslation();
  const [description, setDescription] = reactExports.useState("");
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [attachments, setAttachments] = reactExports.useState([]);
  const [selectedModule, setSelectedModule] = reactExports.useState(null);
  const textareaRef = reactExports.useRef(null);
  const fileInputRef = reactExports.useRef(null);
  const isFeatureRequest = options?.category === "feature_request";
  const routerState = useRouterState({
    select: (routerState) => routerState.location.pathname,
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
        for (const attachment of prev) URL.revokeObjectURL(attachment.previewUrl);
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
        for (const attachment of prev) URL.revokeObjectURL(attachment.previewUrl);
        return prev;
      });
    };
  }, []);
  const handleOpenChange = reactExports.useCallback(
    (next) => {
      if (!next && !submitting) onClose();
    },
    [onClose, submitting],
  );
  const handlePickFiles = reactExports.useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  const handleFileInputChange = reactExports.useCallback(
    (changeEvent) => {
      const picked = Array.from(changeEvent.target.files ?? []);
      changeEvent.target.value = "";
      if (picked.length === 0) return;
      setAttachments((prev) => {
        const remainingSlots =
          FEEDBACK_CONSTRAINTS.ATTACHMENT_MAX_COUNT - prev.length;
        if (remainingSlots <= 0) {
          dedupedToast.error(
            t("feedback.toast.tooManyAttachments", {
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
            t("feedback.toast.attachmentTooLarge", {
              max: Math.round(
                FEEDBACK_CONSTRAINTS.ATTACHMENT_MAX_BYTES / (1024 * 1024),
              ),
            }),
          );
        }
        return [...prev, ...accepted];
      });
    },
    [t],
  );
  const handleRemoveAttachment = reactExports.useCallback((id) => {
    setAttachments((prev) => {
      const target = prev.find((attachment) => attachment.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((attachment) => attachment.id !== id);
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
        files: attachments.map((attachment) => attachment.file),
        runtimeSessionId,
        workspaceDir: chat?.workspaceDir,
      });
      dedupedToast.success(
        t("feedback.toast.successWithId", {
          id: res.ticket_id,
        }),
      );
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      dedupedToast.error(
        t("feedback.toast.failed", {
          error: message,
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
    t,
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
  const attachmentSlotsLeft =
    FEEDBACK_CONSTRAINTS.ATTACHMENT_MAX_COUNT - attachments.length;
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
              {isFeatureRequest
                ? t("feedback.featureRequest.title")
                : t("feedback.dialog.title")}
            </DialogTitle>
            {!isFeatureRequest && (
              <DialogDescription>
                {t("feedback.dialog.subtitle")}
              </DialogDescription>
            )}
          </DialogHeader>
        </div>
        {isFeatureRequest && (
          <div className="px-6 pb-3">
            <div className="mb-2 text-xs font-medium text-foreground/70">
              {t("feedback.featureRequest.moduleLabel")}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FEATURE_REQUEST_MODULES.map((featureModule) => {
                const active = selectedModule === featureModule;
                return (
                  <button
                    key={featureModule}
                    type="button"
                    onClick={() => setSelectedModule(featureModule)}
                    aria-pressed={active}
                    data-action-ui-id={`feedback.dialog.module.${featureModule}`}
                    className={
                      active
                        ? "cursor-pointer rounded-sm bg-foreground px-2.5 py-1 text-xs text-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        : "cursor-pointer rounded-sm border border-border px-2.5 py-1 text-xs text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    }
                  >
                    {t(`feedback.featureRequest.module.${featureModule}`)}
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
            onChange={(changeEvent) => setDescription(changeEvent.target.value)}
            placeholder={
              isFeatureRequest
                ? t("feedback.featureRequest.descriptionPlaceholder")
                : t("feedback.dialog.descriptionPlaceholder")
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
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="relative size-14 overflow-hidden rounded-[2px] border border-border bg-muted"
              >
                <img
                  src={attachment.previewUrl}
                  alt={attachment.file.name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(attachment.id)}
                  className="absolute right-0 top-0 flex size-4 items-center justify-center bg-foreground/80 text-background transition-colors hover:bg-foreground"
                  aria-label={t("feedback.dialog.removeAttachment")}
                  data-action-ui-id="feedback.dialog.removeAttachment"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            {attachmentSlotsLeft > 0 && (
              <button
                type="button"
                onClick={handlePickFiles}
                className="flex h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-[2px] border border-dashed border-border bg-transparent px-4 py-1 text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                data-action-ui-id="feedback.dialog.addAttachment"
                title={t("feedback.dialog.addAttachmentTooltip", {
                  max: FEEDBACK_CONSTRAINTS.ATTACHMENT_MAX_COUNT,
                })}
              >
                <ImagePlusOutlineIcon className="size-5" />
                <span className="text-[10px] leading-tight">
                  {isFeatureRequest
                    ? t("feedback.featureRequest.addAttachment")
                    : t("feedback.dialog.addAttachment")}
                </span>
              </button>
            )}
          </div>
        </div>
        {!isFeatureRequest && (
          <div className="mx-6 mb-5">
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("feedback.dialog.contextHeading")}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {t("feedback.dialog.contextSummary")}
            </p>
          </div>
        )}
        <DialogFooter className="border-t border-border px-6 py-3 sm:items-center sm:justify-between">
          <span className="text-[11px] text-muted-foreground">
            {isFeatureRequest ? "" : t("feedback.dialog.privacyNote")}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="default"
              onClick={onClose}
              disabled={submitting}
              data-action-ui-id="feedback.dialog.cancel"
            >
              {t("common.cancel")}
            </Button>
            <Button
              size="default"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              loading={submitting}
              data-action-ui-id="feedback.dialog.submit"
            >
              {t("feedback.dialog.submit")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
