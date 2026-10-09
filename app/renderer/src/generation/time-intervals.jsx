// time-intervals.jsx
import { usePromptFontSizeStore } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { PromptInputMetaRow } from "./prompt-font-size-control.jsx";
import { countPromptCharacters } from "../assets/parse-prompt-to-tiptap.js";

export function PromptTextarea({
  value,
  onChange,
  placeholder,
  disabled: disabled2,
  readOnly: readOnly2,
  onClose,
  blockKeyHandlers,
  textareaRef,
  maxLength,
  currentLength,
  showUtilityControls,
}) {
  const fontSize = usePromptFontSizeStore((state2) => state2.fontSize);
  const handleKeyDown2 = (e2) => {
    e2.stopPropagation();
    if (e2.key === "Escape" && !blockKeyHandlers) onClose();
  };
  return (
    <div
      className="canvas-prompt-font-size-editor flex w-full h-full min-h-0 flex-col"
      style={{
        "--canvas-prompt-font-size": fontSize,
      }}
    >
      <textarea
        ref={textareaRef}
        className={`canvas-prompt-font-size-textarea nowheel nopan w-full min-h-0 flex-1 resize-none border-none bg-transparent text-[var(--canvas-controls-text)] outline-none placeholder:text-muted-foreground/50 ${readOnly2 ? "hover:cursor-not-allowed" : ""}`}
        value={value}
        onChange={(e2) => onChange(e2.target.value)}
        onKeyDown={handleKeyDown2}
        onClick={(e2) => e2.stopPropagation()}
        disabled={disabled2}
        readOnly={readOnly2}
        placeholder={placeholder}
        data-action-ui-id="popover.prompt-input"
      />
      <PromptInputMetaRow
        getPromptText={() => value}
        copyDisabled={value.length === 0}
        currentLength={currentLength ?? countPromptCharacters(value)}
        maxLength={readOnly2 ? void 0 : maxLength}
        showUtilityControls={showUtilityControls}
      />
    </div>
  );
}

export const TIMELINE_CONFIG = {
  /** 刻度尺高度 */
  RULER_HEIGHT: 28,
  /** 视频轨道高度 */
  VIDEO_TRACK_HEIGHT: 80,
  /** 片段圆角 */
  CLIP_BORDER_RADIUS: 6,
  /** 片段内边距 */
  CLIP_PADDING: 4,
  /** 默认缩放（像素/秒） */
  DEFAULT_SCALE: 100,
  /** 最小缩放 */
  MIN_SCALE: 0.5,
  /** 最大缩放 */
  MAX_SCALE: 500,
  /** 缩放步进因子 */
  ZOOM_FACTOR: 1.15,
  /** 裁剪选框手柄宽度 */
  CROP_HANDLE_WIDTH: 8,
  /** 裁剪手柄向外扩展的像素数，使播放指针在起止位置时位于手柄内部 */
  CROP_HANDLE_OUTSET: 8,
  /** 波形 bar 宽度（像素） */
  WAVEFORM_BAR_WIDTH: 2,
  /** 波形 bar 间距（像素） */
  WAVEFORM_BAR_GAP: 1,
  /** 刻度尺与缩略图轨道左右内边距 */
  TRACK_PADDING_H: 6,
  /** 时间轴最小总时长（秒），保证时间轴始终有足够的可见长度 */
  MIN_TOTAL_DURATION: 60,
};

export const LIGHT_THEME_COLORS = {
  BACKGROUND: "#ffffff",
  RULER_LINE: "#12141F73",
  RULER_TEXT: "#12141F73",
  PLAYHEAD: "#15171F",
  PLAYHEAD_FILL: "#F5F7FF",
  PLAYHEAD_STROKE: "#000000",
  VIDEO_CLIP: "#ffffff10",
  SELECTED_BORDER: "#ffffff",
  HOVER_BORDER: "#aaaaaa",
  CLIP_TEXT: "#ffffff",
  CROP_MASK: "rgba(255, 255, 255, 0.8)",
  SEGMENT_MASK: "rgba(255, 255, 255, 0.65)",
  CROP_BORDER: "#000000",
  CROP_HANDLE: "#000000",
  CROP_HANDLE_INNER: "#F5F6FF",
  AUDIO_WAVEFORM: "#7657FF",
  THUMBNAIL_PLACEHOLDER: "rgba(0, 0, 0, 0.10)",
  THUMBNAIL_SEPARATOR: "rgba(255, 255, 255, 0.06)",
};

export const DARK_THEME_COLORS = {
  BACKGROUND: "#121316",
  RULER_LINE: "rgba(224, 229, 255, 0.35)",
  RULER_TEXT: "rgba(235, 238, 255, 0.65)",
  PLAYHEAD: "#F5F6FF",
  PLAYHEAD_FILL: "#F5F6FF",
  PLAYHEAD_STROKE: "#15171F",
  VIDEO_CLIP: "rgba(255, 255, 255, 0.06)",
  SELECTED_BORDER: "#F5F6FF",
  HOVER_BORDER: "rgba(235, 238, 255, 0.65)",
  CLIP_TEXT: "#F5F6FF",
  CROP_MASK: "rgba(18, 19, 22, 0.8)",
  SEGMENT_MASK: "rgba(18, 19, 22, 0.65)",
  CROP_BORDER: "#F5F6FF",
  CROP_HANDLE: "#F5F6FF",
  CROP_HANDLE_INNER: "#15171F",
  AUDIO_WAVEFORM: "#7657FF",
  THUMBNAIL_PLACEHOLDER: "rgba(255, 255, 255, 0.06)",
  THUMBNAIL_SEPARATOR: "rgba(197, 184, 255, 0.08)",
};

export const DEFAULT_CROP_CONFIG = {
  /** 最小裁切时长（秒） */
  minDuration: 2,
  /** 最大裁切时长（秒） */
  maxDuration: 15.4,
};

export const TIME_INTERVALS = [
  {
    minScale: 400,
    interval: 0.5,
    subDivisions: 5,
  },
  // 每格0.1s  gap@400: 200px
  {
    minScale: 200,
    interval: 1,
    subDivisions: 5,
  },
  // 每格0.2s  gap@200: 200px
  {
    minScale: 100,
    interval: 1,
    subDivisions: 5,
  },
  // 每格0.2s  gap@100: 100px
  {
    minScale: 50,
    interval: 2,
    subDivisions: 4,
  },
  // 每格0.5s  gap@50:  100px
  {
    minScale: 25,
    interval: 5,
    subDivisions: 5,
  },
  // 每格1s    gap@25:  125px
  {
    minScale: 10,
    interval: 10,
    subDivisions: 5,
  },
  // 每格2s    gap@10:  100px
  {
    minScale: 4,
    interval: 30,
    subDivisions: 6,
  },
  // 每格5s    gap@4:   120px
  {
    minScale: 1.5,
    interval: 60,
    subDivisions: 6,
  },
  // 每格10s   gap@1.5: 90px
  {
    minScale: 0,
    interval: 120,
    subDivisions: 4,
  },
  // 每格30s   gap@0.5: 60px
];
