// attachment-preview.jsx
import {
  jsxRuntimeExports,
  reactExports,
  useTranslation,
  X$7,
  Loader2,
  usePlatform,
  Puzzle,
  AlertCircle,
  AtSign,
  getCreationGuideUrlsByLocale,
  ArrowUpRight,
  formatConnectorMention,
  createConnectorInventory,
  connectorReferenceFromServer,
  PluginKey,
  Decoration$1,
  DecorationSet,
  Extension,
  Plugin,
} from "../vendor.js";
import { openUrlInBuiltinBrowser } from "../m11/use-workspace-canvas-persistence.jsx";
import { AnnotationIcon$1 } from "../m01/generating-media-area.jsx";
import { homeService } from "../m08/browser-inspiration-urls.jsx";
import { isAnnotatableImage } from "../m11/image-annotation-dialog.jsx";
import { cn$2 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { getAttachmentSlotActions } from "../m07/en.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { FileChip } from "./file-chip.jsx";
import { isFileAttachment } from "./use-upload.js";
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
        if (onRequestReplace) await onRequestReplace(attachment, anchor, openLocal);
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
  const failedAttachments = failedOverride ?? attachments.filter((att) => att.status === "error");
  const visibleAttachments =
    hiddenSources && hiddenSources.length > 0
      ? attachments.filter((att) => !att.source || !hiddenSources.includes(att.source))
      : attachments;
  const isReadOnly = (attachment) =>
    Boolean(attachment.source && readOnlySources?.includes(attachment.source));
  const removableFailedAttachments = failedAttachments.filter(
    (attachment) => !isReadOnly(attachment),
  );
  if (visibleAttachments.length === 0 && failedAttachments.length === 0) return null;
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
    <div data-message-input-attachment-preview="true" className="flex flex-col gap-1 pt-0 pb-0">
      {visibleAttachments.length > 0 && (
        <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full pb-1">
          {visibleAttachments.map((att) => {
            const isPluginNode2 = att.kind === "plugin-node";
            const isImage2 = att.fileType === "image" && att.previewUrl;
            const isFileCard =
              !isPluginNode2 && !isImage2 && att.fileType !== "video" && att.fileType !== "audio";
            const isMedia =
              (att.fileType === "video" || att.fileType === "audio") && att.previewUrl;
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
              canReference: Boolean(onSelect && isFileAttachment(att) && att.relativePath),
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
                      <Puzzle size={20} className="text-foreground opacity-50" />
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
                      if (event.currentTarget.contains(event.target)) onSelect?.(att);
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
                              filter: "drop-shadow(var(--canvas-media-icon-shadow))",
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
          <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="font-medium leading-5">{failedSummary}</div>
            <div className="truncate leading-5 text-destructive/80">{failedReason}</div>
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
export function CreationGuidePlaceholder({ guides, source, triggerMention, triggerSlash }) {
  const { t: t2, i18n } = useTranslation();
  const platform2 = usePlatform();
  const guideUrls = getCreationGuideUrlsByLocale(i18n.language);
  const handleGuideClick = (event, guide) => {
    event.preventDefault();
    event.stopPropagation();
    void openUrlInBuiltinBrowser(platform2, guideUrls[guide], {
      source: `${source}.${guide}-guide`,
    });
  };
  const handleGuideMouseDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const handleActionMouseDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const triggerClass2 =
    "pointer-events-auto inline-flex size-[1.5em] shrink-0 cursor-pointer items-center justify-center rounded-sm border-[0.5px] border-border bg-muted/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
  const guideLinkClass2 =
    "pointer-events-auto inline-flex cursor-pointer items-center whitespace-nowrap text-muted-foreground/70 underline decoration-current/60 underline-offset-2 transition-colors hover:text-foreground";
  return (
    <div className="min-w-0 max-w-full whitespace-normal break-words text-[length:var(--message-input-editor-font-size)] leading-[var(--text-body-14--line-height)]">
      <span>{t2("creationGuide.placeholderLead")}</span>
      {triggerMention ? (
        <>
          <button
            type="button"
            className={triggerClass2}
            onMouseDown={handleActionMouseDown}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              triggerMention();
            }}
            data-action-ui-id={`${source.replace(".", "-")}-composer-mention`}
          >
            @
          </button>{" "}
          <span>{t2("creationGuide.placeholderAtHint")}</span>
        </>
      ) : null}
      {triggerSlash ? (
        <>
          <span aria-hidden="true">{" · "}</span>
          <button
            type="button"
            className={triggerClass2}
            onMouseDown={handleActionMouseDown}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              triggerSlash();
            }}
            data-action-ui-id={`${source.replace(".", "-")}-composer-slash`}
          >
            /
          </button>{" "}
          <span>{t2("creationGuide.placeholderSlashHint")}</span>
        </>
      ) : null}
      {guides.length > 0 && (triggerMention || triggerSlash) ? (
        <span aria-hidden="true">{" · "}</span>
      ) : null}
      <span className="pointer-events-auto inline-flex items-center gap-1.5 align-baseline">
        {guides.map((guide, index2) => (
          <span key={guide} className="inline-flex items-center gap-1.5">
            {index2 > 0 ? <span aria-hidden="true">·</span> : null}
            <button
              type="button"
              className={`${guideLinkClass2} shrink-0 gap-0.5`}
              onMouseDown={handleGuideMouseDown}
              onClick={(event) => handleGuideClick(event, guide)}
              data-action-ui-id={`${source.replace(".", "-")}-composer-guide-${guide}`}
            >
              <span className="inline-flex items-center gap-0.5">
                {guide === "design" ? t2("creationGuide.designGuide") : t2("creationGuide.h3Guide")}
                <ArrowUpRight size={11} strokeWidth={1.8} aria-hidden="true" />
              </span>
            </button>
          </span>
        ))}
      </span>
    </div>
  );
}
export function WorkspaceCreationGuidePlaceholder({ triggerMention, triggerSlash }) {
  return (
    <CreationGuidePlaceholder
      guides={[]}
      source="workspace.chat"
      triggerMention={triggerMention}
      triggerSlash={triggerSlash}
    />
  );
}
export function connectorMentionToken(serverName, displayName2) {
  return formatConnectorMention(serverName, displayName2);
}
function isUsableConnector(server) {
  return server.enabled && (server.runtimeState === "connected" || server.runtimeState === "saved");
}
const connectorInventory = createConnectorInventory(() => homeService.customMcp.list());
export function useConnectorInventory() {
  const snapshot2 = reactExports.useSyncExternalStore(
    connectorInventory.subscribe,
    connectorInventory.getSnapshot,
  );
  reactExports.useEffect(() => {
    void connectorInventory.refresh().catch(() => void 0);
  }, []);
  return {
    ...snapshot2,
    refresh: connectorInventory.refresh,
    update: connectorInventory.update,
  };
}
export function useConnectorReferences() {
  const inventory = useConnectorInventory();
  const connectors = reactExports.useMemo(
    () =>
      inventory.servers
        .filter(isUsableConnector)
        .map(connectorReferenceFromServer)
        .sort((left, right) => left.displayName.localeCompare(right.displayName)),
    [inventory.servers],
  );
  const refresh = reactExports.useCallback(async () => {
    await inventory.refresh().catch(() => void 0);
  }, [inventory.refresh]);
  return {
    connectors,
    loading: !inventory.loaded && inventory.loading,
    refresh,
  };
}
const HEX_COLOR_PATTERN =
  /#(?:[\dA-Fa-f]{8}|[\dA-Fa-f]{6}|[\dA-Fa-f]{4}|[\dA-Fa-f]{3})(?![\dA-Fa-f])/g;
const URL_PATTERN = /https?:\/\/[^\s<>()]+/gi;
const FENCED_CODE_PATTERN = /```[\s\S]*?```/g;
const INLINE_CODE_PATTERN = /(`+)(?!`)[\s\S]*?\1/g;
const INLINE_MARKDOWN_LINK_PATTERN = /!?\[[^\]\n]*\]\((?:\\.|[^)\n])*\)/g;
const REFERENCE_MARKDOWN_LINK_PATTERN = /!?\[[^\]\n]*\]\[[^\]\n]*\]/g;
const IDENTIFIER_CHAR_PATTERN = /[\dA-Za-z_]/;
function collectExcludedRanges(text2) {
  const ranges = [];
  for (const pattern of [
    URL_PATTERN,
    FENCED_CODE_PATTERN,
    INLINE_CODE_PATTERN,
    INLINE_MARKDOWN_LINK_PATTERN,
    REFERENCE_MARKDOWN_LINK_PATTERN,
  ]) {
    pattern.lastIndex = 0;
    for (let match2 = pattern.exec(text2); match2; match2 = pattern.exec(text2)) {
      ranges.push({
        start: match2.index,
        end: match2.index + match2[0].length,
      });
    }
  }
  return ranges;
}
function overlapsExcludedRange(start2, end2, ranges) {
  return ranges.some((range2) => start2 < range2.end && end2 > range2.start);
}
function colorHasAlpha(value) {
  return value.length === 5 || value.length === 9;
}
export function findInlineVisualTokens(text2, { allowEnd = true } = {}) {
  const excludedRanges = collectExcludedRanges(text2);
  const tokens2 = [];
  HEX_COLOR_PATTERN.lastIndex = 0;
  for (let match2 = HEX_COLOR_PATTERN.exec(text2); match2; match2 = HEX_COLOR_PATTERN.exec(text2)) {
    const raw2 = match2[0];
    const start2 = match2.index;
    const end2 = start2 + raw2.length;
    const previous2 = text2[start2 - 1];
    const next2 = text2[end2];
    if (previous2 && IDENTIFIER_CHAR_PATTERN.test(previous2)) continue;
    if (next2 && IDENTIFIER_CHAR_PATTERN.test(next2)) continue;
    if (!allowEnd && end2 === text2.length) continue;
    if (overlapsExcludedRange(start2, end2, excludedRanges)) continue;
    tokens2.push({
      type: "color",
      start: start2,
      end: end2,
      raw: raw2,
      value: raw2.toUpperCase(),
      hasAlpha: colorHasAlpha(raw2),
    });
  }
  return tokens2;
}
const colorVisualPluginKey = new PluginKey("chatColorVisual");
function createColorSwatch(value, hasAlpha) {
  const swatch = document.createElement("span");
  swatch.className = "inline-color-swatch inline-color-swatch-widget";
  swatch.contentEditable = "false";
  swatch.setAttribute("aria-hidden", "true");
  swatch.dataset.colorValue = value;
  if (hasAlpha) swatch.dataset.hasAlpha = "true";
  const fill = document.createElement("span");
  fill.className = "inline-color-swatch-fill";
  fill.style.backgroundColor = value;
  swatch.append(fill);
  return swatch;
}
function buildColorDecorations(doc2) {
  const decorations2 = [];
  doc2.descendants((node2, position2) => {
    if (!node2.isText || !node2.text) return;
    for (const token2 of findInlineVisualTokens(node2.text)) {
      const from2 = position2 + token2.start;
      const to = position2 + token2.end;
      decorations2.push(
        Decoration$1.inline(from2, to, {
          class: "inline-color-value-label",
          "data-inline-visual": "color",
          "data-color-value": token2.value,
        }),
      );
      decorations2.push(
        Decoration$1.widget(to, () => createColorSwatch(token2.value, token2.hasAlpha), {
          key: `color-${position2}-${token2.start}-${token2.value}`,
          side: 1,
        }),
      );
    }
  });
  return DecorationSet.create(doc2, decorations2);
}
export const ColorVisualDecoration = Extension.create({
  name: "chatColorVisual",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: colorVisualPluginKey,
        state: {
          init: (_config, state2) => buildColorDecorations(state2.doc),
          apply(tr2, previous2) {
            return tr2.docChanged ? buildColorDecorations(tr2.doc) : previous2;
          },
        },
        props: {
          decorations(state2) {
            return colorVisualPluginKey.getState(state2) ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
export const ghostTextPluginKey = new PluginKey("chatGhostText");
function createGhostWidget(text2) {
  const wrapper = document.createElement("span");
  wrapper.className = "ghost-text-wrapper";
  wrapper.contentEditable = "false";
  wrapper.setAttribute("data-action-ui-id", "ghost-text-overlay");
  wrapper.setAttribute("aria-hidden", "true");
  const ghost = document.createElement("span");
  ghost.className = "ghost-text";
  ghost.textContent = text2;
  wrapper.appendChild(ghost);
  const badge = document.createElement("span");
  badge.className = "ghost-tab-badge";
  badge.textContent = "Tab";
  wrapper.appendChild(badge);
  return wrapper;
}
export const GhostTextDecoration = Extension.create({
  name: "chatGhostText",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: ghostTextPluginKey,
        state: {
          init() {
            return null;
          },
          apply(tr2, prev) {
            const meta2 = tr2.getMeta(ghostTextPluginKey);
            if (meta2 !== void 0) return meta2;
            return prev;
          },
        },
        props: {
          decorations(state2) {
            const text2 = ghostTextPluginKey.getState(state2);
            if (!text2) return DecorationSet.empty;
            const pos = Math.max(1, state2.doc.content.size - 1);
            const widget = Decoration$1.widget(pos, () => createGhostWidget(text2), {
              side: 1,
            });
            return DecorationSet.create(state2.doc, [widget]);
          },
        },
      }),
    ];
  },
});
export function mentionRefLeafText(leafNode) {
  if (leafNode.type.name === "hardBreak") return "\n";
  if (leafNode.type.name !== "mentionRef") return "";
  const attrs = leafNode.attrs;
  if (attrs.isFolder && attrs.folderResolvedPath) {
    return attrs.folderResolvedPath;
  }
  if (attrs.kind === "asset") {
    return attrs.name ? `@${attrs.name}` : "";
  }
  const marker = attrs.markerStyle ?? "at";
  if (attrs.kind === "connector") {
    return marker === "bracket"
      ? `[${attrs.name}]`
      : formatConnectorMention(attrs.path, attrs.name);
  }
  const value =
    attrs.kind === "model"
      ? `model:${attrs.mentionName || attrs.modelName || attrs.name}`
      : attrs.kind === "workflow"
        ? `workflow:${attrs.path}`
        : attrs.path;
  if (!value) return "";
  return marker === "bracket" ? `[${attrs.name}]` : `@${value}`;
}
function getWireContentText(content2) {
  let text2 = "";
  let previous2;
  for (const node2 of content2) {
    const value =
      node2.type === "text"
        ? (node2.text ?? "")
        : node2.content
          ? getWireContentText(node2.content)
          : mentionRefLeafText({
              type: {
                name: node2.type ?? "",
              },
              attrs: node2.attrs ?? {},
            });
    if (previous2 && (previous2.type === "paragraph" || node2.type === "paragraph")) {
      text2 += "\n";
    } else if (
      text2 &&
      value &&
      (previous2?.type === "mentionRef" || node2.type === "mentionRef") &&
      !/\s$/.test(text2) &&
      !/^\s/.test(value)
    ) {
      text2 += " ";
    }
    text2 += value;
    previous2 = node2;
  }
  return text2;
}
export function getDocText(doc2) {
  return doc2.textBetween(0, doc2.content.size, "\n", mentionRefLeafText);
}
export function getDocTriggerText(doc2) {
  return doc2.textBetween(0, doc2.content.size, "\n", (node2) =>
    node2.type.name === "mentionRef"
      ? " ".repeat(mentionRefLeafText(node2).length)
      : mentionRefLeafText(node2),
  );
}
export function getWireFragmentText(fragment2) {
  return getWireContentText(fragment2.toJSON() ?? []);
}
export function getDocWireText(doc2) {
  return getWireFragmentText(doc2.content);
}
export function languageDetectionLeafText(leafNode) {
  if (leafNode.type.name === "hardBreak") return "\n";
  if (leafNode.type.name === "mentionRef") return " ";
  return "";
}
