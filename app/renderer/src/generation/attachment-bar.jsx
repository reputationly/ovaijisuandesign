// attachment-bar.jsx
import {
  AttachmentPresence,
  attachmentMotionStyle,
  createRailScrollBy,
  useAttachmentRailOverflow,
} from "../media-editing/attachment-presence.js";
import reactExports from "react";
import { StarterKit } from "@tiptap/starter-kit";
import { useTranslation } from "react-i18next";
import { PlaybackPlayIcon$1 as PlaybackPlayIcon } from "../media-editing/playback-icons.js";
import { Plus } from "../media-editing/lucide-icon-wraps.js";
import { NodeToolbar, useNodeId, useStore } from "../vendor-fork/xyflow/react/index.js";
import { Position } from "../vendor-fork/xyflow/system/index.js";
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
import { SegmentedSwitch } from "./segmented-switch.jsx";
import { ExpandToggleButton } from "./expand-arrow-icon.jsx";
export function AttachmentBar({
  items,
  disabled,
  readOnly,
  videoDurationLimitSec,
  audioDurationLimitSec,
  onClipVideo,
  onClipAudio,
  onReplace,
  onEdit,
  showAddButton,
  onRemove,
  onAdd,
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
  // 4.0.3：横向溢出状态（左右渐隐用）。hooks 必须在 return 之前调用。
  const rail = useAttachmentRailOverflow(items, true);
  const railScrollBy = createRailScrollBy(rail.scrollRef);
  return (
    <div
      ref={rail.scrollRef}
      data-action-ui-id="composer-reference-rail"
      data-fade-left={rail.overflow.left || undefined}
      data-fade-right={rail.overflow.right || undefined}
      onScroll={rail.syncOverflow}
      className="flex flex-wrap items-center gap-1"
      style={attachmentMotionStyle}
    >
      {/* 4.0.3：用 AttachmentPresence 包住，附件增删才有进出场动画（否则是瞬间跳动） */}
      <AttachmentPresence>
        {items.map((item) => (
        <ThumbChip
          key={item.path}
          item={item}
          disabled={disabled}
          readOnly={readOnly}
          videoDurationExcessSec={videoDurationExcesses.get(item.path)}
          audioDurationExcessSec={audioDurationExcesses.get(item.path)}
          onClipVideo={onClipVideo}
          onClipAudio={onClipAudio}
          onReplace={onReplace}
          onEdit={onEdit}
          onRemove={onRemove}
          onClick={onItemClick}
          onLocate={getLocateAction?.(item)}
        />
      ))}
      </AttachmentPresence>
      {/* 4.0.3：附件区溢出时，两侧各出一个滚动圆钮 */}
      <div
        data-action-ui-id="attachment-scroll-controls"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 transition-[height] duration-[var(--attachment-layout-duration)] ease-[var(--attachment-motion-easing)] motion-reduce:transition-none"
      >
        {["left", "right"].map((side) => {
          if (!rail.overflow[side]) return null;
          return (
            <button
              key={side}
              type="button"
              data-action-ui-id={`attachment-scroll-${side}`}
              onClick={() => railScrollBy(side === "left" ? -1 : 1)}
              className={`pointer-events-auto absolute top-1/2 size-6 -translate-y-1/2 rounded-full border border-border bg-popover text-foreground hover:bg-muted ${
                side === "left" ? "left-0" : "right-0"
              }`}
              aria-label={side === "left" ? "向左滚动" : "向右滚动"}
            >
              {side === "left" ? "‹" : "›"}
            </button>
          );
        })}
      </div>
      {showAddButton && !disabled && (
        <button
          type="button"
          className="shrink-0 flex items-center justify-center border-[1.5px] border-dashed border-foreground/10 rounded-[8px] text-foreground/50 hover:text-foreground hover:border-foreground/30 transition-colors duration-150"
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
          }}
          onClick={(clickEvent) => {
            clickEvent.stopPropagation();
            onAdd();
          }}
        >
          <Plus size={16} />
        </button>
      )}
    </div>
  );
}
export function TextPopoverReferenceSection({
  mode,
  audioMode,
  controlsDisabled,
  onAudioModeChange,
  expanded,
  onToggle,
  references,
  audioAttachments,
}) {
  const { t: translate } = useTranslation();
  if (mode !== "audio" && !references) return null;
  return (
    <div className="flex shrink-0 flex-col gap-2">
      {mode === "audio" ? (
        <div className="relative flex items-center gap-2">
          <div role="presentation" onClick={(event) => event.stopPropagation()}>
            <SegmentedSwitch
              variant="label"
              value={audioMode}
              itemClassName="px-[22px] font-normal"
              thumbClassName="ring-[0.5px] ring-inset ring-foreground/10 shadow-none"
              options={["tts", "music"].map((value) => ({
                value,
                label:
                  value === "tts"
                    ? translate("canvas.txt.audioMode.tts")
                    : translate("canvas.txt.audioMode.music"),
                dataActionUiId: `popover.audio-tab-${value}`,
                disabled: controlsDisabled,
              }))}
              onValueChange={(next) => {
                if (next === "tts" || next === "music")
                  onAudioModeChange(next);
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
      {mode === "audio" && audioAttachments ? (
        <div className="shrink-0">
          <AttachmentBar {...audioAttachments} />
        </div>
      ) : null}
    </div>
  );
}
const HEIGHT_COMPACT = 208;
const HEIGHT_EXPANDED = 500;
function nextDeselectGate(armed, selected) {
  return selected
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
  children,
  expanded = false,
  promptLayout = false,
  extraHeight = 0,
  gapOffset = 0,
}) {
  const onCloseRef = reactExports.useRef(onClose);
  onCloseRef.current = onClose;
  const nodeId = useNodeId();
  const selectedSelector = reactExports.useCallback(
    (canvasState) =>
      // No nodeId = popover not anchored to a node → keep mounted.
      nodeId ? !!canvasState.nodeLookup.get(nodeId)?.selected : true,
    [nodeId],
  );
  const selected = useStore(selectedSelector);
  const isDragging = useCanvasIsDragging();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const gateArmedRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    const gate = nextDeselectGate(gateArmedRef.current, selected);
    gateArmedRef.current = gate.armed;
    if (gate.close) onCloseRef.current();
  }, [selected]);
  const hidden = isDragging || isMultiSelect || isBoxSelecting;
  return (
    <NodeToolbar
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
        onDoubleClick={(doubleClickEvent) => doubleClickEvent.stopPropagation()}
        onContextMenu={blockPopoverContextMenu}
        style={{
          background: "var(--canvas-controls-bg)",
          boxShadow: "var(--canvas-prompt-panel-shadow)",
          height: (expanded ? HEIGHT_EXPANDED : HEIGHT_COMPACT) + extraHeight,
          display: hidden ? "none" : void 0,
        }}
      >
        {children}
      </div>
    </NodeToolbar>
  );
}
export var src_default = StarterKit;
export function VideoPlayIndicator({ size = 14 }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <PlaybackPlayIcon
        size={size}
        style={{
          color: "var(--canvas-media-play-icon)",
          filter: "drop-shadow(0 1px 2px rgb(0 0 0 / 0.65))",
        }}
      />
    </span>
  );
}
function finitePositive(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : void 0;
}
export function getImageConstraintReason(dimensions, constraints) {
  if (!dimensions || !constraints) return void 0;
  const width = finitePositive(dimensions.width);
  const height = finitePositive(dimensions.height);
  if (width === void 0 || height === void 0) return void 0;
  if (
    constraints.imageMinWidth !== void 0 &&
    width < constraints.imageMinWidth
  ) {
    return "image-size";
  }
  if (
    constraints.imageMinHeight !== void 0 &&
    height < constraints.imageMinHeight
  ) {
    return "image-size";
  }
  const ratio = width / height;
  if (
    constraints.imageMinAspectRatio !== void 0 &&
    ratio < constraints.imageMinAspectRatio
  ) {
    return "image-aspect";
  }
  if (
    constraints.imageMaxAspectRatio !== void 0 &&
    ratio > constraints.imageMaxAspectRatio
  ) {
    return "image-aspect";
  }
  return void 0;
}
export function mapKind(type) {
  if (
    type === "image" ||
    type === "video" ||
    type === "audio" ||
    type === "text"
  )
    return type;
  return void 0;
}
export var ReferenceDisabledReason = ((ReferenceDisabledReason) => {
  ReferenceDisabledReason["Empty"] = "empty";
  ReferenceDisabledReason["Unsupported"] = "unsupported";
  ReferenceDisabledReason["Full"] = "full";
  ReferenceDisabledReason["ImageSize"] = "image-size";
  ReferenceDisabledReason["ImageAspect"] = "image-aspect";
  ReferenceDisabledReason["AudioRange"] = "audio-range";
  ReferenceDisabledReason["AudioBudget"] = "audio-budget";
  ReferenceDisabledReason["VideoRange"] = "video-range";
  ReferenceDisabledReason["VideoBudget"] = "video-budget";
  return ReferenceDisabledReason;
})(ReferenceDisabledReason || {});
export function passesBudgetGate(kind, isReference, remainingByKind) {
  if (isReference) return true;
  if (kind === "text" && remainingByKind?.text === void 0) return true;
  if (!remainingByKind) return true;
  return (remainingByKind[kind] ?? 0) > 0;
}
export function reasonForDisabled(kind, meta, constraints) {
  if (!constraints) return void 0;
  if (kind === "text") {
    const remaining = constraints.remainingByKind.text;
    return remaining !== void 0 && remaining <= 0 ? "full" : void 0;
  }
  if (constraints.remainingByKind[kind] <= 0) return "full";
  if (kind === "image") {
    const reason = getImageConstraintReason(meta, constraints);
    if (reason)
      return {
        "image-size": "image-size",
        "image-aspect": "image-aspect",
        /* ImageAspect */
      }[reason];
  }
  if (kind === "audio") {
    const durationSeconds = typeof meta.durationSec === "number" ? meta.durationSec : 0;
    if (
      durationSeconds > 0 &&
      (durationSeconds < constraints.audioPerClipMinSec ||
        durationSeconds > constraints.audioPerClipMaxSec)
    ) {
      return "audio-range";
    }
    if (durationSeconds > 0 && durationSeconds > constraints.remainingAudioTotalSec)
      return "audio-budget";
  }
  if (kind === "video") {
    const durationSeconds = typeof meta.durationSec === "number" ? meta.durationSec : 0;
    if (
      durationSeconds > 0 &&
      ((constraints.videoPerClipMinSec !== void 0 &&
        durationSeconds < constraints.videoPerClipMinSec) ||
        (constraints.videoPerClipMaxSec !== void 0 &&
          durationSeconds > constraints.videoPerClipMaxSec))
    ) {
      return "video-range";
    }
    if (durationSeconds > 0 && durationSeconds > constraints.remainingVideoTotalSec)
      return "video-budget";
  }
  return void 0;
}
