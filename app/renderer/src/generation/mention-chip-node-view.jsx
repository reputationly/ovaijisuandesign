// mention-chip-node-view.jsx
import {
  classifyFileType,
  jsxRuntimeExports,
  Music,
  NodeSelection,
  NodeViewWrapper,
  reactExports,
  useTranslation,
  Video,
  X$7 as X,
} from "../vendor.js";
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
  node: node2,
  selected: selected2,
  editor,
  extension: extension2,
  deleteNode: deleteNode2,
  updateAttributes: updateAttributes2,
}) {
  const { t: t2 } = useTranslation();
  const { kind, filename, path: path2 } = node2.attrs;
  const [hovered, setHovered] = reactExports.useState(false);
  const [reading, setReading] = reactExports.useState(false);
  const [chipEl, setChipEl] = reactExports.useState(null);
  const { directReferences } = useCanvasBridge();
  const {
    reference,
    resolution: currentResolution,
    status,
    unavailable,
    invalid: invalid2,
  } = useAssetsRefValidate({
    path: path2,
    anchor: chipEl,
  });
  const isSubject = reference?.target === "entity";
  const subjectTypeLabel = isSubject
    ? t2(
        `assetCenter.types.${reference.entityType ?? "other"}`,
        reference.entityType ?? t2("canvas.reference.subject", "Subject"),
      )
    : "";
  const statusLabel2 =
    !reference || status === "available" || invalid2
      ? ""
      : status === "unavailable"
        ? t2("canvas.reference.checkFailed", "Unavailable")
        : t2("canvas.reference.checking", "Checking");
  const displayName2 = currentResolution?.name ?? filename;
  reactExports.useEffect(() => {
    if (
      currentResolution?.status === "available" &&
      currentResolution.name &&
      currentResolution.name !== filename
    ) {
      updateAttributes2({
        filename: currentResolution.name,
      });
    }
  }, [currentResolution, filename, updateAttributes2]);
  const [switchConfig, setSwitchConfig] = reactExports.useState(null);
  const previewCloseTimerRef = reactExports.useRef(null);
  const resolveFileUrl = extension2.options.resolveFileUrl;
  const getFileRefSwitchConfig = extension2.options.getFileRefSwitchConfig;
  const canSwitchReference = !isSubject && !!getFileRefSwitchConfig?.();
  const previewUrl =
    path2 && !unavailable && !isSubject ? (resolveFileUrl?.(path2) ?? "") : "";
  const assetMetadataStore = extension2.options.assetMetadataStore;
  let intrinsicWidth;
  let intrinsicHeight;
  if (path2 && assetMetadataStore) {
    for (const meta2 of assetMetadataStore.getState().assets.values()) {
      if (meta2.path !== path2) continue;
      intrinsicWidth = meta2.width;
      intrinsicHeight = meta2.height;
      break;
    }
  }
  const hasCustomPreview = Boolean(
    (reference && (isSubject || invalid2) && directReferences?.renderPreview) ||
    (!isSubject && !unavailable && path2 && (kind === "text" || previewUrl)),
  );
  const fallbackStatusLabel = invalid2
    ? status === "deleted"
      ? t2("canvas.reference.deleted", "Deleted")
      : t2("canvas.reference.missing", "File missing")
    : statusLabel2;
  const [failedPreviewUrl, setFailedPreviewUrl] = reactExports.useState(null);
  const showImageThumb =
    kind === "image" && !!previewUrl && failedPreviewUrl !== previewUrl;
  const showVideoThumb =
    kind === "video" && !!previewUrl && failedPreviewUrl !== previewUrl;
  const { stem: displayStem, ext: displayExt } = isSubject
    ? {
        stem: displayName2,
        ext: "",
      }
    : splitMentionFilename(displayName2);
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
    const config2 = getFileRefSwitchConfig?.();
    if (!config2) return;
    clearPreviewCloseTimer();
    setHovered(false);
    setSwitchConfig(config2);
  }, [clearPreviewCloseTimer, getFileRefSwitchConfig]);
  const clearChipSelection = reactExports.useCallback(() => {
    const { selection: selection2 } = editor.state;
    if (
      !(selection2 instanceof NodeSelection) ||
      selection2.node.type.name !== "canvasFileRef"
    ) {
      return;
    }
    editor.commands.setTextSelection(selection2.to);
  }, [editor]);
  const closeSwitchPanel = reactExports.useCallback(() => {
    setSwitchConfig(null);
    clearChipSelection();
  }, [clearChipSelection]);
  reactExports.useEffect(() => {
    if (!selected2) setSwitchConfig(null);
  }, [selected2]);
  const chip = (
    // biome-ignore lint/a11y/noStaticElementInteractions: Tiptap inline atom owns focus/keyboard navigation
    // biome-ignore lint/a11y/useKeyWithClickEvents: Tiptap inline atom owns focus/keyboard navigation
    <span
      ref={setChipEl}
      contentEditable={false}
      title={
        hasCustomPreview
          ? void 0
          : [displayName2 || path2, fallbackStatusLabel]
              .filter(Boolean)
              .join(" · ")
      }
      className={[
        "group/reference relative inline-flex items-center gap-1 py-0.5 pr-1.5 pl-0.5 text-xs leading-tight select-none rounded-[8px]",
        canSwitchReference ? "cursor-pointer" : "cursor-default",
        "border",
        invalid2 ? "text-muted-foreground opacity-50" : "text-foreground",
        selected2
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
          className={`shrink-0 rounded-sm px-1 py-0.5 text-xs ${invalid2 ? "bg-muted text-muted-foreground" : "bg-foreground text-background"}`}
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
              filename: displayName2,
            }).category !== "photoshop" ? (
            <ImageOutlineIcon size={12} />
          ) : (
            <FileTypeIcon
              {...classifyFileType({
                filename: displayName2,
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
      {!invalid2 && statusLabel2 && (
        <span className="shrink-0 text-muted-foreground">
          {"· "}
          {statusLabel2}
        </span>
      )}
      <button
        type="button"
        contentEditable={false}
        aria-label={t2("mention.popover.removeReference", "Remove")}
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
          deleteNode2();
        }}
      >
        <X size={9} strokeWidth={2.2} />
      </button>
    </span>
  );
  return (
    <NodeViewWrapper
      as="span"
      className="canvas-prompt-reference-chip-wrapper mx-0.5 inline-flex"
    >
      {reference && (isSubject || invalid2) && directReferences?.renderPreview
        ? directReferences.renderPreview({
            reference,
            trigger: chip,
            status: status ?? "checking",
          })
        : chip}
      {reading && path2 && (
        <TextReadDialog
          open={reading}
          onOpenChange={setReading}
          path={path2}
          name={displayName2 || path2}
        />
      )}
      {hovered &&
        !reading &&
        !isSubject &&
        !unavailable &&
        chipEl &&
        kind === "text" &&
        path2 && (
          <TextHoverPreview
            onReadFull={() => {
              setHovered(false);
              setReading(true);
            }}
            path={path2}
            name={displayName2 || path2}
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
          name={displayName2 || path2}
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
          currentPath={path2}
          config={switchConfig}
          resolveFileUrl={resolveFileUrl}
          onSelect={(meta2, assetId, sourceNodeId) => {
            if (meta2.path === path2) {
              closeSwitchPanel();
              return;
            }
            const nextKind =
              meta2.type === "video" ||
              meta2.type === "audio" ||
              meta2.type === "text"
                ? meta2.type
                : "image";
            switchConfig.onSelectAsset(meta2, assetId, sourceNodeId);
            updateAttributes2({
              path: meta2.path,
              filename: meta2.name,
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
