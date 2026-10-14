// mention-chip-node-view.jsx
import jsxRuntimeExports from "react/jsx-runtime";
import { NodeSelection } from "prosemirror-state";
import { NodeViewWrapper } from "@tiptap/react";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { classifyFileType } from "../infra/file-type.js";
import { Music, Video, X$7 as CloseIcon } from "../media-editing/lucide-icon-wraps.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ReferenceSwitchPopover } from "./reference-switch-popover.jsx";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import {
  FileWarning,
  ImageOutlineIcon,
  useCanvasBridge,
} from "../media-editing/package.jsx";
import { splitMentionFilename } from "../infra/dialog-content.jsx";
import { useAssetsRefValidate } from "../assets/use-assets-ref-validate.js";
import { MediaHoverPreview } from "../media-editing/media-hover-preview.jsx";
import { TextHoverPreview } from "../media-editing/text-hover-preview.jsx";
import { TextReadDialog } from "../media-editing/use-preview-text.jsx";
import { VideoPlayIndicator } from "./attachment-bar.jsx";
const THUMB_PX = 18;
export function MentionChipNodeView({
  node,
  selected,
  editor,
  extension,
  deleteNode,
  updateAttributes,
}) {
  const { t: translate } = useTranslation();
  const { kind, filename, path } = node.attrs;
  const [hovered, setHovered] = reactExports.useState(false);
  const [reading, setReading] = reactExports.useState(false);
  const [chipEl, setChipEl] = reactExports.useState(null);
  const { directReferences } = useCanvasBridge();
  const {
    reference,
    resolution: currentResolution,
    status,
    unavailable,
    invalid,
  } = useAssetsRefValidate({
    path,
    anchor: chipEl,
  });
  const isSubject = reference?.target === "entity";
  const subjectTypeLabel = isSubject
    ? translate(
        `assetCenter.types.${reference.entityType ?? "other"}`,
        reference.entityType ?? translate("canvas.reference.subject", "Subject"),
      )
    : "";
  const statusLabel =
    !reference || status === "available" || invalid
      ? ""
      : status === "unavailable"
        ? translate("canvas.reference.checkFailed", "Unavailable")
        : translate("canvas.reference.checking", "Checking");
  const displayName = currentResolution?.name ?? filename;
  reactExports.useEffect(() => {
    if (
      currentResolution?.status === "available" &&
      currentResolution.name &&
      currentResolution.name !== filename
    ) {
      updateAttributes({
        filename: currentResolution.name,
      });
    }
  }, [currentResolution, filename, updateAttributes]);
  const [switchConfig, setSwitchConfig] = reactExports.useState(null);
  const previewCloseTimerRef = reactExports.useRef(null);
  const resolveFileUrl = extension.options.resolveFileUrl;
  const getFileRefSwitchConfig = extension.options.getFileRefSwitchConfig;
  const canSwitchReference = !isSubject && !!getFileRefSwitchConfig?.();
  const previewUrl =
    path && !unavailable && !isSubject ? (resolveFileUrl?.(path) ?? "") : "";
  const assetMetadataStore = extension.options.assetMetadataStore;
  let intrinsicWidth;
  let intrinsicHeight;
  if (path && assetMetadataStore) {
    for (const meta of assetMetadataStore.getState().assets.values()) {
      if (meta.path !== path) continue;
      intrinsicWidth = meta.width;
      intrinsicHeight = meta.height;
      break;
    }
  }
  const hasCustomPreview = Boolean(
    (reference && (isSubject || invalid) && directReferences?.renderPreview) ||
    (!isSubject && !unavailable && path && (kind === "text" || previewUrl)),
  );
  const fallbackStatusLabel = invalid
    ? status === "deleted"
      ? translate("canvas.reference.deleted", "Deleted")
      : translate("canvas.reference.missing", "File missing")
    : statusLabel;
  const [failedPreviewUrl, setFailedPreviewUrl] = reactExports.useState(null);
  const showImageThumb =
    kind === "image" && !!previewUrl && failedPreviewUrl !== previewUrl;
  const showVideoThumb =
    kind === "video" && !!previewUrl && failedPreviewUrl !== previewUrl;
  const { stem: displayStem, ext: displayExt } = isSubject
    ? {
        stem: displayName,
        ext: "",
      }
    : splitMentionFilename(displayName);
  const clearPreviewCloseTimer = reactExports.useCallback(() => {
    if (previewCloseTimerRef.current) {
      clearTimeout(previewCloseTimerRef.current);
      previewCloseTimerRef.current = null;
    }
  }, []);
  const showPreview = reactExports.useCallback(() => {
    clearPreviewCloseTimer();
    setHovered(true);
  }, [clearPreviewCloseTimer]);
  const schedulePreviewClose = reactExports.useCallback(() => {
    clearPreviewCloseTimer();
    previewCloseTimerRef.current = setTimeout(() => setHovered(false), 120);
  }, [clearPreviewCloseTimer]);
  reactExports.useEffect(
    () => clearPreviewCloseTimer,
    [clearPreviewCloseTimer],
  );
  const openSwitchPanel = reactExports.useCallback(() => {
    const config = getFileRefSwitchConfig?.();
    if (!config) return;
    clearPreviewCloseTimer();
    setHovered(false);
    setSwitchConfig(config);
  }, [clearPreviewCloseTimer, getFileRefSwitchConfig]);
  const clearChipSelection = reactExports.useCallback(() => {
    const { selection } = editor.state;
    if (
      !(selection instanceof NodeSelection) ||
      selection.node.type.name !== "canvasFileRef"
    ) {
      return;
    }
    editor.commands.setTextSelection(selection.to);
  }, [editor]);
  const closeSwitchPanel = reactExports.useCallback(() => {
    setSwitchConfig(null);
    clearChipSelection();
  }, [clearChipSelection]);
  reactExports.useEffect(() => {
    if (!selected) setSwitchConfig(null);
  }, [selected]);
  const chip = (
    // biome-ignore lint/a11y/noStaticElementInteractions: Tiptap inline atom owns focus/keyboard navigation
    // biome-ignore lint/a11y/useKeyWithClickEvents: Tiptap inline atom owns focus/keyboard navigation
    <span
      ref={setChipEl}
      contentEditable={false}
      title={
        hasCustomPreview
          ? void 0
          : [displayName || path, fallbackStatusLabel]
              .filter(Boolean)
              .join(" · ")
      }
      className={[
        "group/reference relative inline-flex items-center gap-1 py-0.5 pr-1.5 pl-0.5 text-xs leading-tight select-none rounded-[8px]",
        canSwitchReference ? "cursor-pointer" : "cursor-default",
        "border",
        invalid ? "text-muted-foreground opacity-50" : "text-foreground",
        selected
          ? "bg-transparent border-black/70 dark:border-white/50"
          : "bg-[var(--chat-inline-code-bg,var(--canvas-controls-hover))] border-transparent",
        "max-w-[180px] overflow-hidden whitespace-nowrap",
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseEnter={isSubject ? void 0 : showPreview}
      onMouseLeave={schedulePreviewClose}
      onClick={(event) => {
        if (isSubject) return;
        event.preventDefault();
        event.stopPropagation();
        openSwitchPanel();
      }}
    >
      {isSubject ? (
        <span
          className={`shrink-0 rounded-sm px-1 py-0.5 text-xs ${invalid ? "bg-muted text-muted-foreground" : "bg-foreground text-background"}`}
        >
          {subjectTypeLabel}
        </span>
      ) : (
        <span
          className="relative shrink-0 flex items-center justify-center overflow-hidden rounded-[4px] border-[0.5px] border-border bg-muted/60"
          style={{
            width: THUMB_PX,
            height: THUMB_PX,
          }}
        >
          {unavailable ? (
            <FileWarning size={12} />
          ) : showImageThumb ? (
            <img
              src={previewUrl}
              onError={() => setFailedPreviewUrl(previewUrl)}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              className="w-full h-full object-cover pointer-events-none transition-transform duration-150 group-hover/reference:scale-[1.04] motion-reduce:transform-none"
            />
          ) : showVideoThumb ? (
            <>
              <video
                src={previewUrl}
                onError={() => setFailedPreviewUrl(previewUrl)}
                muted={true}
                playsInline={true}
                preload="metadata"
                className="w-full h-full object-cover pointer-events-none transition-transform duration-150 group-hover/reference:scale-[1.04] motion-reduce:transform-none"
              >
                <track kind="captions" />
              </video>
              <VideoPlayIndicator size={8} />
            </>
          ) : kind === "audio" ? (
            <Music size={12} />
          ) : kind === "video" ? (
            <Video size={12} />
          ) : kind === "image" &&
            classifyFileType({
              filename: displayName,
            }).category !== "photoshop" ? (
            <ImageOutlineIcon size={12} />
          ) : (
            <FileTypeIcon
              {...classifyFileType({
                filename: displayName,
              })}
              size={14}
              decorative={true}
            />
          )}
        </span>
      )}
      <span className="flex min-w-0 items-baseline">
        <span className="truncate min-w-0">{displayStem}</span>
        {displayExt && (
          <span className="shrink-0 text-muted-foreground">{displayExt}</span>
        )}
      </span>
      {!invalid && statusLabel && (
        <span className="shrink-0 text-muted-foreground">
          {"· "}
          {statusLabel}
        </span>
      )}
      <button
        type="button"
        contentEditable={false}
        aria-label={translate("mention.popover.removeReference", "Remove")}
        data-action-ui-id="popover.prompt-reference-remove"
        className="pointer-events-none absolute right-0.5 top-1/2 flex size-3.5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-foreground text-background opacity-0 transition-opacity focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover/reference:pointer-events-auto group-hover/reference:opacity-100"
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setHovered(false);
          deleteNode();
        }}
      >
        <CloseIcon size={9} strokeWidth={2.2} />
      </button>
    </span>
  );
  return (
    <NodeViewWrapper
      as="span"
      className="canvas-prompt-reference-chip-wrapper mx-0.5 inline-flex"
    >
      {reference && (isSubject || invalid) && directReferences?.renderPreview
        ? directReferences.renderPreview({
            reference,
            trigger: chip,
            status: status ?? "checking",
          })
        : chip}
      {reading && path && (
        <TextReadDialog
          open={reading}
          onOpenChange={setReading}
          path={path}
          name={displayName || path}
        />
      )}
      {hovered &&
        !reading &&
        !isSubject &&
        !unavailable &&
        chipEl &&
        kind === "text" &&
        path && (
          <TextHoverPreview
            onReadFull={() => {
              setHovered(false);
              setReading(true);
            }}
            path={path}
            name={displayName || path}
            anchorElement={chipEl}
            anchorRect={chipEl.getBoundingClientRect()}
            onPreviewMouseEnter={showPreview}
            onPreviewMouseLeave={schedulePreviewClose}
          />
        )}
      {hovered && chipEl && previewUrl && kind !== "text" && (
        <MediaHoverPreview
          showFileName={true}
          kind={kind}
          url={previewUrl}
          name={displayName || path}
          width={intrinsicWidth}
          height={intrinsicHeight}
          anchorElement={chipEl}
          anchorRect={chipEl.getBoundingClientRect()}
          onPreviewMouseEnter={showPreview}
          onPreviewMouseLeave={schedulePreviewClose}
        />
      )}
      {!isSubject && switchConfig && chipEl && (
        <ReferenceSwitchPopover
          anchorRect={chipEl.getBoundingClientRect()}
          getAnchorRect={() => chipEl.getBoundingClientRect()}
          currentPath={path}
          config={switchConfig}
          resolveFileUrl={resolveFileUrl}
          onSelect={(meta, assetId, sourceNodeId) => {
            if (meta.path === path) {
              closeSwitchPanel();
              return;
            }
            const nextKind =
              meta.type === "video" ||
              meta.type === "audio" ||
              meta.type === "text"
                ? meta.type
                : "image";
            switchConfig.onSelectAsset(meta, assetId, sourceNodeId);
            updateAttributes({
              path: meta.path,
              filename: meta.name,
              kind: nextKind,
            });
            closeSwitchPanel();
          }}
          onClose={closeSwitchPanel}
        />
      )}
    </NodeViewWrapper>
  );
}
