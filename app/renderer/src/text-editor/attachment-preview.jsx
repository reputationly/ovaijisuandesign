// attachment-preview.jsx
import {
  AlertCircle,
  AtSign,
  Loader2,
  reactExports,
  useTranslation,
  X$7,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Puzzle } from "../media-editing/package.jsx";
import { AnnotationIcon$1 } from "../canvas/fullscreen-icon.jsx";
import { isAnnotatableImage } from "./read-preview-text-response.jsx";
import { cn$2 } from "../infra/dialog-content.jsx";
import { getAttachmentSlotActions } from "../i18n/canvas-node-tools.jsx";
import { FileChip } from "../generation/file-chip.jsx";
import { isFileAttachment } from "../assets/classify-upload-error.js";

export function AttachmentPreview({
  active: active2 = true,
  loadTextContent,
  attachments,
  onRemove: onRemove2,
  onReplace,
  onAnnotate,
  onRequestReplace,
  onLocate,
  replacingIds,
  disabled: disabled2 = false,
  replacementAccept,
  onSelect,
  failedAttachments: failedOverride,
  hiddenSources,
  readOnlySources,
}) {
  const { t: t2 } = useTranslation();
  const replacementInputRef = reactExports.useRef(null);
  const replacementTargetRef = reactExports.useRef(null);
  const chipRefs = reactExports.useRef(new Map());
  const [choosingId, setChoosingId] = reactExports.useState(null);
  const [focusedId, setFocusedId] = reactExports.useState(null);
  const requestReplacement = reactExports.useCallback(
    async (attachment) => {
      const slot = chipRefs.current.get(attachment.id);
      const anchor = slot?.querySelector("button") ?? slot;
      if (!anchor || disabled2 || choosingId) return;
      const openLocal = () => {
        replacementTargetRef.current = {
          id: attachment.id,
          replace: onReplace,
        };
        replacementInputRef.current?.click();
      };
      setChoosingId(attachment.id);
      try {
        if (onRequestReplace)
          await onRequestReplace(attachment, anchor, openLocal);
        else openLocal();
      } finally {
        setChoosingId(null);
      }
    },
    [disabled2, choosingId, onReplace, onRequestReplace],
  );
  const handleReplacementChange = reactExports.useCallback((event) => {
    const target = replacementTargetRef.current;
    const file = event.currentTarget.files?.[0];
    replacementTargetRef.current = null;
    event.currentTarget.value = "";
    if (target && file) void target.replace?.(target.id, file);
  }, []);
  reactExports.useEffect(() => {
    const input = replacementInputRef.current;
    const handleCancel = () => {
      replacementTargetRef.current = null;
    };
    input?.addEventListener("cancel", handleCancel);
    return () => input?.removeEventListener("cancel", handleCancel);
  }, []);
  const failedAttachments =
    failedOverride ?? attachments.filter((att) => att.status === "error");
  const visibleAttachments =
    hiddenSources && hiddenSources.length > 0
      ? attachments.filter(
          (att) => !att.source || !hiddenSources.includes(att.source),
        )
      : attachments;
  const isReadOnly = (attachment) =>
    Boolean(attachment.source && readOnlySources?.includes(attachment.source));
  const removableFailedAttachments = failedAttachments.filter(
    (attachment) => !isReadOnly(attachment),
  );
  if (visibleAttachments.length === 0 && failedAttachments.length === 0)
    return null;
  const uploadFailedShort = t2("chat.uploadFailedShort");
  const failedSummary =
    failedAttachments.length === 1
      ? t2("chat.uploadFailedFile", {
          name: failedAttachments[0]?.filename ?? "",
        })
      : t2("chat.uploadFailedCount", {
          count: failedAttachments.length,
        });
  const failedReason =
    failedAttachments.length === 1 && failedAttachments[0]?.error
      ? failedAttachments[0].error
      : t2("chat.uploadFailedHint");
  return (
    <div
      data-message-input-attachment-preview="true"
      className="flex flex-col gap-1 pt-0 pb-0"
    >
      {visibleAttachments.length > 0 && (
        <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full pb-1">
          {visibleAttachments.map((att) => {
            const isPluginNode2 = att.kind === "plugin-node";
            const isImage2 = att.fileType === "image" && att.previewUrl;
            const isFileCard =
              !isPluginNode2 &&
              !isImage2 &&
              att.fileType !== "video" &&
              att.fileType !== "audio";
            const isMedia =
              (att.fileType === "video" || att.fileType === "audio") &&
              att.previewUrl;
            const readOnly2 = isReadOnly(att);
            const locked = disabled2 || replacingIds?.has(att.id) === true;
            const errorText = att.error
              ? t2("chat.uploadFailedWithReason", {
                  error: att.error,
                })
              : uploadFailedShort;
            const locate = onLocate?.(att);
            const actions = getAttachmentSlotActions({
              kind: att.fileType,
              ready: att.status === "done",
              readOnly: readOnly2,
              busy: locked,
              canReference: Boolean(
                onSelect && isFileAttachment(att) && att.relativePath,
              ),
              canReplace: Boolean(onReplace && isFileAttachment(att)),
              canLocate: Boolean(locate),
              hasPreview: Boolean(att.previewUrl),
            });
            const selectable = actions.reference;
            const replaceable = actions.replace;
            const annotatable = Boolean(
              !readOnly2 && !locked && onAnnotate && isAnnotatableImage(att),
            );
            const hoverAction = replaceable
              ? {
                  label: t2("canvas.attachment.replace", {
                    defaultValue: "Replace",
                  }),
                  onClick: () => requestReplacement(att),
                  actionUiId: "popover.attachment-replace",
                }
              : void 0;
            return (
              <div
                key={att.id}
                data-attachment-id={att.id}
                ref={(element2) => {
                  if (element2) chipRefs.current.set(att.id, element2);
                  else chipRefs.current.delete(att.id);
                }}
                className={cn$2(
                  "group relative h-16 min-w-0 max-w-[min(280px,100%)] shrink-0",
                  (selectable || annotatable || !readOnly2) &&
                    "[&:hover_[data-slot-duration]]:invisible [&:hover_[data-slot-duration]]:delay-0 [&:focus-within_[data-slot-duration]]:invisible [&:focus-within_[data-slot-duration]]:delay-0",
                )}
              >
                {isPluginNode2 ? (
                  <div
                    data-testid="plugin-node-chip"
                    className={cn$2(
                      "flex items-center gap-2.5 w-[200px] h-16 px-2.5 rounded-md bg-muted-foreground/10 border-0",
                    )}
                    title={att.filename}
                  >
                    <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-sm bg-background/60">
                      <Puzzle
                        size={20}
                        className="text-foreground opacity-50"
                      />
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-foreground truncate">
                        {att.filename}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {t2("chat.pluginNodeChipMeta", {
                          defaultValue: "画布插件",
                        })}
                      </span>
                    </div>
                  </div>
                ) : selectable ? (
                  <button
                    type="button"
                    className="block h-full max-w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onFocus={() => setFocusedId(att.id)}
                    onBlur={() => setFocusedId(null)}
                    onMouseDown={(event) => {
                      if (event.currentTarget.contains(event.target)) {
                        event.preventDefault();
                      }
                    }}
                    onClick={(event) => {
                      if (event.currentTarget.contains(event.target))
                        onSelect?.(att);
                    }}
                  >
                    <FileChip
                      filename={att.filename}
                      active={active2}
                      textPath={att.relativePath ?? void 0}
                      loadTextContent={loadTextContent}
                      imageUrl={isImage2 ? att.previewUrl : void 0}
                      mediaUrl={isMedia ? att.previewUrl : void 0}
                      videoThumbnailPath={att.relativePath ?? void 0}
                      fileSize={att.fileSize}
                      fileType={att.fileType}
                      showMediaHoverFileName={false}
                      hoverAction={hoverAction}
                      previewFromHover={actions.preview}
                      previewFocused={focusedId === att.id}
                      onHoverLocate={actions.locate ? locate : void 0}
                      suppressHoverPreview={Boolean(choosingId) || locked}
                      className={cn$2(
                        "h-16",
                        isFileCard && "pr-7",
                        att.fileType === "video"
                          ? "border-[var(--border-solid)]! hover:border-foreground/25!"
                          : "hover:border-foreground/25",
                      )}
                    />
                  </button>
                ) : (
                  <FileChip
                    filename={att.filename}
                    active={active2}
                    textPath={att.relativePath ?? void 0}
                    loadTextContent={loadTextContent}
                    imageUrl={isImage2 ? att.previewUrl : void 0}
                    mediaUrl={isMedia ? att.previewUrl : void 0}
                    videoThumbnailPath={att.relativePath ?? void 0}
                    fileSize={att.fileSize}
                    fileType={att.fileType}
                    showMediaHoverFileName={false}
                    hoverAction={hoverAction}
                    previewFromHover={actions.preview}
                    previewFocused={focusedId === att.id}
                    onHoverLocate={actions.locate ? locate : void 0}
                    suppressHoverPreview={Boolean(choosingId) || locked}
                    className={cn$2(
                      "h-16",
                      isFileCard && "pr-7",
                      att.status === "error"
                        ? "border-destructive!"
                        : att.fileType === "video"
                          ? "border-[var(--border-solid)]! hover:border-foreground/25!"
                          : "hover:border-foreground/25",
                    )}
                  />
                )}
                {att.status === "error" && (
                  <div
                    className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-sm bg-destructive text-destructive-foreground shadow-sm"
                    title={errorText}
                  >
                    <AlertCircle size={13} />
                  </div>
                )}
                {(att.status === "uploading" || replacingIds?.has(att.id)) && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <Loader2
                      size={16}
                      strokeWidth={1.5}
                      className="animate-spin text-muted-foreground"
                    />
                  </div>
                )}
                {selectable && (
                  <button
                    type="button"
                    className={cn$2(
                      "absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground",
                      isImage2 || att.fileType === "video"
                        ? "text-[var(--canvas-media-control-fg)]"
                        : "text-foreground",
                    )}
                    aria-label={t2("canvas.reference.addReference")}
                    data-action-ui-id="chat.attachment-reference"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onSelect?.(att)}
                  >
                    <AtSign
                      size={14}
                      strokeWidth={1.6}
                      style={
                        isImage2 || att.fileType === "video"
                          ? {
                              filter:
                                "drop-shadow(var(--canvas-media-icon-shadow))",
                            }
                          : void 0
                      }
                    />
                  </button>
                )}
                {annotatable ? (
                  <button
                    type="button"
                    className="absolute bottom-1 left-1 flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--attachment-annotation-background)] text-[var(--attachment-annotation-foreground)] opacity-0 shadow-sm transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                    aria-label={t2("chat.imageAnnotation.annotate")}
                    title={t2("chat.imageAnnotation.annotate")}
                    data-action-ui-id="chat-image-annotation-open"
                    onClick={() => onAnnotate?.(att)}
                  >
                    <AnnotationIcon$1 size={14} aria-hidden={true} />
                  </button>
                ) : null}
                {!readOnly2 ? (
                  <button
                    type="button"
                    className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 hover:bg-black/80"
                    aria-label={t2("common.remove")}
                    disabled={disabled2}
                    onClick={() => onRemove2(att.id)}
                  >
                    <X$7 size={10} />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      <input
        ref={replacementInputRef}
        type="file"
        accept={replacementAccept}
        className="hidden"
        data-testid="attachment-replacement-input"
        onChange={handleReplacementChange}
      />
      {failedAttachments.length > 0 && (
        <div
          role="alert"
          data-action-ui-id="attachment-upload-error-alert"
          className="flex max-w-full items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-2 py-1.5 text-xs text-destructive"
        >
          <AlertCircle
            size={14}
            strokeWidth={1.5}
            className="mt-0.5 shrink-0"
          />
          <div className="min-w-0">
            <div className="font-medium leading-5">{failedSummary}</div>
            <div className="truncate leading-5 text-destructive/80">
              {failedReason}
            </div>
          </div>
          {removableFailedAttachments.length > 0 ? (
            <button
              type="button"
              data-action-ui-id="attachment-remove-failed-btn"
              className="ml-auto shrink-0 rounded-md border border-destructive/30 px-2 py-1 text-[11px] leading-none hover:bg-destructive/10"
              onClick={() => {
                for (const att of removableFailedAttachments) onRemove2(att.id);
              }}
            >
              {t2("chat.uploadRemoveFailed")}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
