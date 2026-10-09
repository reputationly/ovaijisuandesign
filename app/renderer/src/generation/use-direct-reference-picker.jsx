// use-direct-reference-picker.jsx
import { PlaybackPlayIcon$1, useTranslation, reactExports, Plus, useNodeId, useStore$3, NodeToolbar$1, Position, StarterKit, dedupedToast } from "../vendor.js";
import { useCanvasBridge, useCanvasIsDragging, useCanvasIsMultiSelect, useCanvasIsBoxSelecting } from "../media-editing/parse-item.jsx";
import { SegmentedSwitch$1 } from "./params-popup.jsx";
import { NODE_POPOVER_SAFE_GAP } from "../media-editing/use-lightbox-media-actions.jsx";
import { basename$c } from "./resolve-reference-texts.js";
import { ExpandToggleButton } from "./param-tabs.jsx";
import {
  encodeCanvasReference,
  existingCanvasReferencePath,
} from "../text-editor/table-document-to-llm-content.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { AudioClipPanel } from "../media-editing/media-clip-panel-inner.jsx";
import {
  FirstLastFrameImageSlots,
  THUMB_SIZE,
  ThumbChip,
  VideoClipPanel,
  calculateAudioDurationExcesses,
  calculateVideoDurationExcesses,
} from "../media-editing/thumb-chip.jsx";
export function AttachmentBar({
  items,
  disabled: disabled2,
  readOnly: readOnly2,
  videoDurationLimitSec,
  audioDurationLimitSec,
  onClipVideo,
  onClipAudio,
  onReplace,
  onEdit,
  showAddButton,
  onRemove: onRemove2,
  onAdd: onAdd2,
  onItemClick,
  getLocateAction,
}) {
  if (items.length === 0 && !showAddButton) return null;
  const videoDurationExcesses = calculateVideoDurationExcesses(items, videoDurationLimitSec);
  const audioDurationExcesses = calculateAudioDurationExcesses(items, audioDurationLimitSec);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {items.map((item) => (
        <ThumbChip
          key={item.path}
          item={item}
          disabled={disabled2}
          readOnly={readOnly2}
          videoDurationExcessSec={videoDurationExcesses.get(item.path)}
          audioDurationExcessSec={audioDurationExcesses.get(item.path)}
          onClipVideo={onClipVideo}
          onClipAudio={onClipAudio}
          onReplace={onReplace}
          onEdit={onEdit}
          onRemove={onRemove2}
          onClick={onItemClick}
          onLocate={getLocateAction?.(item)}
        />
      ))}
      {showAddButton && !disabled2 && (
        <button
          type="button"
          className="shrink-0 flex items-center justify-center border-[1.5px] border-dashed border-foreground/10 rounded-[8px] text-foreground/50 hover:text-foreground hover:border-foreground/30 transition-colors duration-150"
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
          }}
          onClick={(e2) => {
            e2.stopPropagation();
            onAdd2();
          }}
        >
          <Plus size={16} />
        </button>
      )}
    </div>
  );
}
export function VideoPopoverReferenceSection({
  isTextToVideo,
  isFirstLastFrame,
  imagePaths,
  resolveFileUrl,
  onUpdatePaths,
  attachments,
  expanded,
  onToggle,
  videoClipItem,
  audioClipItem,
  onCloseVideoClip,
  onCloseAudioClip,
  onExportVideoClip,
  onExportAudioClip,
}) {
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div className="flex items-start justify-between gap-3 shrink-0">
        {isTextToVideo ? null : isFirstLastFrame ? (
          <FirstLastFrameImageSlots
            imagePaths={imagePaths}
            resolveFileUrl={resolveFileUrl}
            onUpdatePaths={onUpdatePaths}
            disabled={attachments.disabled}
            onReference={(path2) =>
              attachments.onItemClick({
                path: path2,
                kind: "image",
                name: basename$c(path2),
                thumbUrl: "",
              })
            }
            getLocateAction={(path2) =>
              attachments.getLocateAction?.({
                path: path2,
                kind: "image",
                name: path2,
                thumbUrl: "",
              })
            }
          />
        ) : (
          <AttachmentBar {...attachments} />
        )}
        <ExpandToggleButton expanded={expanded} onToggle={onToggle} />
      </div>
      {videoClipItem && (
        <VideoClipPanel
          videoUrl={videoClipItem.thumbUrl}
          videoName={videoClipItem.name}
          onClose={onCloseVideoClip}
          onExport={onExportVideoClip}
        />
      )}
      {audioClipItem && (
        <AudioClipPanel
          audioUrl={audioClipItem.thumbUrl}
          audioName={audioClipItem.name}
          onClose={onCloseAudioClip}
          onExport={onExportAudioClip}
        />
      )}
    </div>
  );
}
export function TextPopoverReferenceSection({
  mode: mode2,
  audioMode,
  controlsDisabled,
  onAudioModeChange,
  expanded,
  onToggle,
  references,
  audioAttachments,
}) {
  const { t: t2 } = useTranslation();
  if (mode2 !== "audio" && !references) return null;
  return (
    <div className="flex shrink-0 flex-col gap-2">
      {mode2 === "audio" ? (
        <div className="relative flex items-center gap-2">
          <div role="presentation" onClick={(event) => event.stopPropagation()}>
            <SegmentedSwitch$1
              variant="label"
              value={audioMode}
              itemClassName="px-[22px] font-normal"
              thumbClassName="ring-[0.5px] ring-inset ring-foreground/10 shadow-none"
              options={["tts", "music"].map((value) => ({
                value,
                label:
                  value === "tts"
                    ? t2("canvas.txt.audioMode.tts")
                    : t2("canvas.txt.audioMode.music"),
                dataActionUiId: `popover.audio-tab-${value}`,
                disabled: controlsDisabled,
              }))}
              onValueChange={(next2) => {
                if (next2 === "tts" || next2 === "music") onAudioModeChange(next2);
              }}
            />
          </div>
          <div className="absolute top-0 right-0">
            <ExpandToggleButton expanded={expanded} onToggle={onToggle} />
          </div>
        </div>
      ) : null}
      {references ? (
        <div>
          <AttachmentBar {...references} />
        </div>
      ) : null}
      {mode2 === "audio" && audioAttachments ? (
        <div className="shrink-0">
          <AttachmentBar {...audioAttachments} />
        </div>
      ) : null}
    </div>
  );
}
const HEIGHT_COMPACT = 208;
const HEIGHT_EXPANDED = 500;
function nextDeselectGate(armed, selected2) {
  return selected2
    ? {
        armed: true,
        close: false,
      }
    : {
        armed,
        close: armed,
      };
}
function blockPopoverContextMenu(event) {
  event.preventDefault();
  event.stopPropagation();
}
export function PopoverShell({
  onClose,
  children: children2,
  expanded = false,
  promptLayout = false,
  extraHeight = 0,
  gapOffset = 0,
}) {
  const onCloseRef = reactExports.useRef(onClose);
  onCloseRef.current = onClose;
  const nodeId = useNodeId();
  const selectedSelector = reactExports.useCallback(
    (s2) =>
      // No nodeId = popover not anchored to a node → keep mounted.
      nodeId ? !!s2.nodeLookup.get(nodeId)?.selected : true,
    [nodeId],
  );
  const selected2 = useStore$3(selectedSelector);
  const isDragging = useCanvasIsDragging();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const gateArmedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    const gate = nextDeselectGate(gateArmedRef.current, selected2);
    gateArmedRef.current = gate.armed;
    if (gate.close) onCloseRef.current();
  }, [selected2]);
  const hidden = isDragging || isMultiSelect || isBoxSelecting;
  return (
    <NodeToolbar$1
      isVisible={true}
      position={Position.Bottom}
      offset={NODE_POPOVER_SAFE_GAP + gapOffset}
      align="center"
      style={{
        zIndex: 1100,
      }}
    >
      <div
        className={`w-[620px] border-0 rounded-[16px] animate-[i2v-popover-in_0.15s_ease-out] flex flex-col overflow-hidden p-2 transition-[height] duration-[250ms] ease-out${promptLayout ? " gap-2" : ""}`}
        data-action-ui-id="popover.shell"
        onDoubleClick={(e2) => e2.stopPropagation()}
        onContextMenu={blockPopoverContextMenu}
        style={{
          background: "var(--canvas-controls-bg)",
          boxShadow: "var(--canvas-prompt-panel-shadow)",
          height: (expanded ? HEIGHT_EXPANDED : HEIGHT_COMPACT) + extraHeight,
          display: hidden ? "none" : void 0,
        }}
      >
        {children2}
      </div>
    </NodeToolbar$1>
  );
}
export var src_default = StarterKit;
export function VideoPlayIndicator$1({ size: size2 = 14 }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <PlaybackPlayIcon$1
        size={size2}
        style={{
          color: "var(--canvas-media-play-icon)",
          filter: "drop-shadow(0 1px 2px rgb(0 0 0 / 0.65))",
        }}
      />
    </span>
  );
}
function finitePositive$2(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : void 0;
}
export function getImageConstraintReason(dimensions2, constraints2) {
  if (!dimensions2 || !constraints2) return void 0;
  const width = finitePositive$2(dimensions2.width);
  const height = finitePositive$2(dimensions2.height);
  if (width === void 0 || height === void 0) return void 0;
  if (constraints2.imageMinWidth !== void 0 && width < constraints2.imageMinWidth) {
    return "image-size";
  }
  if (constraints2.imageMinHeight !== void 0 && height < constraints2.imageMinHeight) {
    return "image-size";
  }
  const ratio = width / height;
  if (constraints2.imageMinAspectRatio !== void 0 && ratio < constraints2.imageMinAspectRatio) {
    return "image-aspect";
  }
  if (constraints2.imageMaxAspectRatio !== void 0 && ratio > constraints2.imageMaxAspectRatio) {
    return "image-aspect";
  }
  return void 0;
}
export function mapKind(type2) {
  if (type2 === "image" || type2 === "video" || type2 === "audio" || type2 === "text") return type2;
  return void 0;
}
export var ReferenceDisabledReason = ((ReferenceDisabledReason2) => {
  ReferenceDisabledReason2["Empty"] = "empty";
  ReferenceDisabledReason2["Unsupported"] = "unsupported";
  ReferenceDisabledReason2["Full"] = "full";
  ReferenceDisabledReason2["ImageSize"] = "image-size";
  ReferenceDisabledReason2["ImageAspect"] = "image-aspect";
  ReferenceDisabledReason2["AudioRange"] = "audio-range";
  ReferenceDisabledReason2["AudioBudget"] = "audio-budget";
  ReferenceDisabledReason2["VideoRange"] = "video-range";
  ReferenceDisabledReason2["VideoBudget"] = "video-budget";
  return ReferenceDisabledReason2;
})(ReferenceDisabledReason || {});
export function passesBudgetGate(kind, isReference, remainingByKind) {
  if (isReference) return true;
  if (kind === "text" && remainingByKind?.text === void 0) return true;
  if (!remainingByKind) return true;
  return (remainingByKind[kind] ?? 0) > 0;
}
export function reasonForDisabled(kind, meta2, constraints2) {
  if (!constraints2) return void 0;
  if (kind === "text") {
    const remaining = constraints2.remainingByKind.text;
    return remaining !== void 0 && remaining <= 0 ? "full" : void 0;
  }
  if (constraints2.remainingByKind[kind] <= 0) return "full";
  if (kind === "image") {
    const reason = getImageConstraintReason(meta2, constraints2);
    if (reason)
      return {
        "image-size": "image-size",
        "image-aspect": "image-aspect",
        /* ImageAspect */
      }[reason];
  }
  if (kind === "audio") {
    const d2 = typeof meta2.durationSec === "number" ? meta2.durationSec : 0;
    if (d2 > 0 && (d2 < constraints2.audioPerClipMinSec || d2 > constraints2.audioPerClipMaxSec)) {
      return "audio-range";
    }
    if (d2 > 0 && d2 > constraints2.remainingAudioTotalSec) return "audio-budget";
  }
  if (kind === "video") {
    const d2 = typeof meta2.durationSec === "number" ? meta2.durationSec : 0;
    if (
      d2 > 0 &&
      ((constraints2.videoPerClipMinSec !== void 0 && d2 < constraints2.videoPerClipMinSec) ||
        (constraints2.videoPerClipMaxSec !== void 0 && d2 > constraints2.videoPerClipMaxSec))
    ) {
      return "video-range";
    }
    if (d2 > 0 && d2 > constraints2.remainingVideoTotalSec) return "video-budget";
  }
  return void 0;
}
function reasonForDisabledBatch(items, constraints2) {
  if (!constraints2) return void 0;
  const remaining = {
    ...constraints2,
    remainingByKind: {
      ...constraints2.remainingByKind,
    },
  };
  for (const { kind, meta: meta2 } of items) {
    const reason = reasonForDisabled(kind, meta2, remaining);
    if (reason) return reason;
    const slots = remaining.remainingByKind[kind];
    if (slots !== void 0) remaining.remainingByKind[kind] = slots - 1;
    if (kind === "video" || kind === "audio") {
      if (remaining.remainingVideoAudio !== void 0) {
        remaining.remainingVideoAudio--;
        remaining.remainingByKind.video = Math.min(
          remaining.remainingByKind.video,
          remaining.remainingVideoAudio,
        );
        remaining.remainingByKind.audio = Math.min(
          remaining.remainingByKind.audio,
          remaining.remainingVideoAudio,
        );
      }
      const duration = Math.max(0, meta2.durationSec ?? 0);
      if (kind === "video") remaining.remainingVideoTotalSec -= duration;
      else remaining.remainingAudioTotalSec -= duration;
    }
  }
  return void 0;
}
const SEARCH_DELAY_MS = 150;
const THUMB_PX$6 = 28;
export function useDirectReferencePicker({
  query,
  kindFilter,
  existingPaths,
  constraints: constraints2,
  onSelect,
  onConstraintViolation,
}) {
  const { t: t2 } = useTranslation();
  const { directReferences, resolveThumbUrl } = useCanvasBridge();
  const allowedKinds = reactExports.useMemo(() => new Set(kindFilter), [kindFilter]);
  const [directCandidates, setDirectCandidates] = reactExports.useState([]);
  const [directError, setDirectError] = reactExports.useState(false);
  const [directLoading, setDirectLoading] = reactExports.useState(false);
  const aliveRef = reactExports.useRef(true);
  const selectingRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);
  reactExports.useEffect(() => {
    if (!directReferences) return;
    let cancelled = false;
    setDirectLoading(true);
    setDirectError(false);
    const timer2 = setTimeout(() => {
      directReferences
        .searchCandidates(query)
        .then((rows) => {
          if (!cancelled) setDirectCandidates(rows);
        })
        .catch(() => {
          if (!cancelled) {
            setDirectCandidates([]);
            setDirectError(true);
          }
        })
        .finally(() => {
          if (!cancelled) setDirectLoading(false);
        });
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer2);
    };
  }, [directReferences, query]);
  const directItems = reactExports.useMemo(
    () =>
      directCandidates.map((candidate) => {
        const supportedReferences = candidate.references.filter(
          (ref) => ref.kind !== "other" && allowedKinds.has(ref.kind),
        );
        const firstSupportedReference = supportedReferences[0];
        const kind =
          firstSupportedReference && firstSupportedReference.kind !== "other"
            ? firstSupportedReference.kind
            : "text";
        const path2 = firstSupportedReference
          ? encodeCanvasReference(firstSupportedReference)
          : candidate.id;
        const directReferences2 =
          candidate.source === "subject"
            ? [
                {
                  source: "subject",
                  target: "entity",
                  id: candidate.id,
                  scope: candidate.id,
                  name: candidate.name,
                  entityType: candidate.entityType,
                  attachmentKinds: supportedReferences.map((reference) => reference.kind),
                  kind,
                },
              ]
            : supportedReferences;
        const subjectAlreadySelected =
          candidate.source === "subject" &&
          directReferences2.some((reference) =>
            existingCanvasReferencePath(reference, existingPaths),
          );
        const newReferences = supportedReferences.flatMap((reference) => {
          if (
            subjectAlreadySelected ||
            reference.kind === "other" ||
            existingCanvasReferencePath(reference, existingPaths)
          )
            return [];
          return [
            {
              kind: reference.kind,
              meta: {
                name: reference.name,
                path: encodeCanvasReference(reference),
                type: reference.kind,
                url: "",
              },
            },
          ];
        });
        const disabledReason = firstSupportedReference
          ? reasonForDisabledBatch(newReferences, constraints2)
          : candidate.references.length
            ? ReferenceDisabledReason.Unsupported
            : ReferenceDisabledReason.Empty;
        return {
          assetId: candidate.id,
          meta: {
            path: path2,
            name: candidate.name,
            type: kind,
            url: "",
          },
          kind,
          thumbUrl:
            firstSupportedReference && kind === "image"
              ? (resolveThumbUrl?.(path2, THUMB_PX$6, "image") ?? "")
              : "",
          alreadyAdded: false,
          disabledReason,
          directReferences: directReferences2,
        };
      }),
    [directCandidates, allowedKinds, existingPaths, constraints2, resolveThumbUrl],
  );
  const selectItem = reactExports.useCallback(
    async (item) => {
      if (item.disabledReason || selectingRef.current) return true;
      if (item.directReferences && directReferences) {
        selectingRef.current = true;
        try {
          const resolved = await directReferences.checkAvailability(item.directReferences, {
            include_metadata: true,
          });
          if (!aliveRef.current) return true;
          if (
            resolved.length !== item.directReferences.length ||
            resolved.some((row) => row.status === "unavailable")
          ) {
            throw new Error("Reference check failed");
          }
          if (resolved.some((row) => row.status !== "available")) {
            dedupedToast.error(
              t2("canvas.reference.unavailable", "Reference unavailable. Please select again."),
            );
            return true;
          }
          const selections = resolved.map((row) => {
            const reference = row.reference;
            const attachments = row.metadata?.attachments.filter((attachment) =>
              allowedKinds.has(attachment.kind),
            );
            return {
              reference:
                reference.target === "entity" && attachments
                  ? {
                      ...reference,
                      attachmentKinds: attachments.map((attachment) => attachment.kind),
                    }
                  : reference,
              row,
              attachments,
            };
          });
          const newMedia = selections.flatMap(({ reference, row, attachments }) => {
            if (existingCanvasReferencePath(reference, existingPaths)) return [];
            return (
              reference.target === "entity" && attachments
                ? attachments.map((attachment) => ({
                    kind: attachment.kind,
                    metadata: attachment.metadata,
                  }))
                : [
                    {
                      kind: reference.kind,
                      metadata: row.metadata?.media,
                    },
                  ]
            ).flatMap(({ kind, metadata }) => {
              if (!allowedKinds.has(kind)) return [];
              return [
                {
                  kind,
                  meta: {
                    path: encodeCanvasReference(reference),
                    name: reference.name,
                    type: kind,
                    url: "",
                    durationSec: metadata?.duration_sec,
                    width: metadata?.width,
                    height: metadata?.height,
                    fileSize: metadata?.file_size,
                  },
                },
              ];
            });
          });
          const invalid2 = selections.some(
            ({ reference }) => reference.target === "entity" && !reference.attachmentKinds?.length,
          )
            ? ReferenceDisabledReason.Empty
            : reasonForDisabledBatch(newMedia, constraints2);
          if (invalid2) {
            onConstraintViolation(invalid2);
            return true;
          }
          for (const { reference, row } of selections) {
            if (reference.kind === "other") continue;
            onSelect(
              {
                path:
                  existingCanvasReferencePath(reference, existingPaths) ??
                  encodeCanvasReference(reference),
                name: reference.subjectName
                  ? `${reference.subjectName} · ${reference.name}`
                  : reference.name,
                type: reference.kind,
                url: "",
                durationSec: row.metadata?.media?.duration_sec,
                width: row.metadata?.media?.width,
                height: row.metadata?.media?.height,
                fileSize: row.metadata?.media?.file_size,
              },
              reference.id,
            );
          }
        } catch {
          if (aliveRef.current)
            dedupedToast.error(
              t2("canvas.reference.loadFailed", "Failed to load reference. Please try again."),
            );
        } finally {
          selectingRef.current = false;
        }
        return true;
      }
      return false;
    },
    [
      directReferences,
      existingPaths,
      onSelect,
      t2,
      allowedKinds,
      constraints2,
      onConstraintViolation,
    ],
  );
  return {
    candidates: directCandidates,
    items: directItems,
    isLoading: directLoading,
    hasError: directError,
    // true means the direct-reference path handled (or rejected) this selection.
    selectItem,
  };
}
