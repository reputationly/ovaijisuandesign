// attachment-bar.jsx
import {
  NodeToolbar$1,
  PlaybackPlayIcon$1,
  Plus,
  Position,
  reactExports,
  StarterKit,
  useNodeId,
  useStore$3,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  useCanvasIsBoxSelecting,
  useCanvasIsDragging,
  useCanvasIsMultiSelect,
} from "../media-editing/package.jsx";
import { NODE_POPOVER_SAFE_GAP } from "../media-editing/use-warn-missing-asset-meta.jsx";
import {
  calculateAudioDurationExcesses,
  calculateVideoDurationExcesses,
  THUMB_SIZE,
} from "../media-editing/use-preview-text.jsx";
import { ThumbChip } from "../media-editing/thumb-chip.jsx";
import { SegmentedSwitch$1 } from "./segmented-switch.jsx";
import { ExpandToggleButton } from "./expand-arrow-icon.jsx";

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
  const videoDurationExcesses = calculateVideoDurationExcesses(
    items,
    videoDurationLimitSec,
  );
  const audioDurationExcesses = calculateAudioDurationExcesses(
    items,
    audioDurationLimitSec,
  );
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
                if (next2 === "tts" || next2 === "music")
                  onAudioModeChange(next2);
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
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : void 0;
}

export function getImageConstraintReason(dimensions2, constraints2) {
  if (!dimensions2 || !constraints2) return void 0;
  const width = finitePositive$2(dimensions2.width);
  const height = finitePositive$2(dimensions2.height);
  if (width === void 0 || height === void 0) return void 0;
  if (
    constraints2.imageMinWidth !== void 0 &&
    width < constraints2.imageMinWidth
  ) {
    return "image-size";
  }
  if (
    constraints2.imageMinHeight !== void 0 &&
    height < constraints2.imageMinHeight
  ) {
    return "image-size";
  }
  const ratio = width / height;
  if (
    constraints2.imageMinAspectRatio !== void 0 &&
    ratio < constraints2.imageMinAspectRatio
  ) {
    return "image-aspect";
  }
  if (
    constraints2.imageMaxAspectRatio !== void 0 &&
    ratio > constraints2.imageMaxAspectRatio
  ) {
    return "image-aspect";
  }
  return void 0;
}

export function mapKind(type2) {
  if (
    type2 === "image" ||
    type2 === "video" ||
    type2 === "audio" ||
    type2 === "text"
  )
    return type2;
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
    if (
      d2 > 0 &&
      (d2 < constraints2.audioPerClipMinSec ||
        d2 > constraints2.audioPerClipMaxSec)
    ) {
      return "audio-range";
    }
    if (d2 > 0 && d2 > constraints2.remainingAudioTotalSec)
      return "audio-budget";
  }
  if (kind === "video") {
    const d2 = typeof meta2.durationSec === "number" ? meta2.durationSec : 0;
    if (
      d2 > 0 &&
      ((constraints2.videoPerClipMinSec !== void 0 &&
        d2 < constraints2.videoPerClipMinSec) ||
        (constraints2.videoPerClipMaxSec !== void 0 &&
          d2 > constraints2.videoPerClipMaxSec))
    ) {
      return "video-range";
    }
    if (d2 > 0 && d2 > constraints2.remainingVideoTotalSec)
      return "video-budget";
  }
  return void 0;
}
