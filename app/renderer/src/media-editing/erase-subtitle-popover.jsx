// erase-subtitle-popover.jsx
import {
  NodeToolbar$1,
  Position,
  reactExports,
  useNodeId,
  useStore$3,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  useCanvasIsBoxSelecting,
  useCanvasIsDragging,
  useCanvasIsMultiSelect,
} from "./package.jsx";
import { CloseIcon$1, SendArrowIcon } from "../canvas/file-missing-icon.jsx";
import { NODE_POPOVER_SAFE_GAP } from "./use-warn-missing-asset-meta.jsx";
import { Button$2 } from "../canvas/node-shell-inner.jsx";

const MODES = ["auto", "manual"];

const MODE_LABEL_KEYS = {
  auto: "canvas.eraseSubtitle.mode.auto",
  manual: "canvas.eraseSubtitle.mode.manual",
};

const MODE_LABEL_FALLBACKS = {
  auto: "自动识别字幕",
  manual: "手动框选",
};

const MODE_DESC_KEYS = {
  auto: "canvas.eraseSubtitle.mode.auto.desc",
  manual: "canvas.eraseSubtitle.mode.manual.desc",
};

const MODE_DESC_FALLBACKS = {
  auto: "自动识别并去除视频底部字幕条文字（OCR + AIGC 修复）。处理耗时与视频时长相关，约为原视频时长的 6～10 倍（1 分钟以内的短视频相对更久），请耐心等待。",
  manual: "点击下方「开始」后，在视频上手动框选要消除的文字区域。",
};

function ModeToggle({ value, onChange }) {
  const { t: t2 } = useTranslation();
  return (
    <div
      className="flex h-8 items-center gap-0.5 rounded-md p-0.5"
      style={{
        background: "var(--canvas-controls-active)",
      }}
    >
      {MODES.map((option2) => {
        const active2 = option2 === value;
        return (
          // biome-ignore lint/a11y/useSemanticElements: native <input type="radio"> would clash with the segmented-toggle visual + add a hidden a11y tree; ARIA radio role is the correct primitive here
          <button
            key={option2}
            type="button"
            role="radio"
            aria-checked={active2}
            onClick={() => {
              if (option2 !== value) onChange(option2);
            }}
            data-action-ui-id={`canvas.erase-subtitle.mode-${option2}`}
            className="flex-1 h-7 rounded-md px-2.5 text-[13px] font-medium transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-text)]"
            style={{
              background: active2
                ? "var(--canvas-primary-btn-bg)"
                : "transparent",
              color: active2
                ? "var(--canvas-primary-btn-icon)"
                : "var(--canvas-controls-text-muted)",
              cursor: "pointer",
            }}
          >
            {t2(MODE_LABEL_KEYS[option2], MODE_LABEL_FALLBACKS[option2])}
          </button>
        );
      })}
    </div>
  );
}

export const EraseSubtitlePopover = reactExports.memo(
  function EraseSubtitlePopover2({
    mode: mode2,
    onModeChange,
    onSubmit,
    onClose,
  }) {
    const { t: t2 } = useTranslation();
    const onCloseRef = reactExports.useRef(onClose);
    onCloseRef.current = onClose;
    const nodeId = useNodeId();
    const selectedSelector = reactExports.useCallback(
      (s2) => (nodeId ? !!s2.nodeLookup.get(nodeId)?.selected : true),
      [nodeId],
    );
    const selected2 = useStore$3(selectedSelector);
    const isDragging = useCanvasIsDragging();
    const isMultiSelect = useCanvasIsMultiSelect();
    const isBoxSelecting = useCanvasIsBoxSelecting();
    reactExports.useEffect(() => {
      if (!selected2) onCloseRef.current();
    }, [selected2]);
    const hidden = isDragging || isMultiSelect || isBoxSelecting;
    const handleSubmit = reactExports.useCallback(() => {
      onSubmit(mode2);
    }, [onSubmit, mode2]);
    const submitLabel =
      mode2 === "manual"
        ? t2("canvas.eraseSubtitle.submitManual", "下一步")
        : t2("canvas.eraseSubtitle.submit", "开始");
    return (
      <NodeToolbar$1
        isVisible={true}
        position={Position.Bottom}
        offset={NODE_POPOVER_SAFE_GAP}
        align="center"
      >
        <div
          className="flex w-72 flex-col gap-3 rounded-lg border border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] p-3 shadow-[var(--canvas-shadow-dropdown)] animate-[i2v-popover-in_0.15s_ease-out]"
          style={{
            display: hidden ? "none" : void 0,
          }}
          onPointerDown={(e2) => e2.stopPropagation()}
          onDoubleClick={(e2) => e2.stopPropagation()}
        >
          <div className="font-heading text-[13px] font-medium text-[var(--canvas-controls-text)]">
            {t2("canvas.eraseSubtitle.title", "字幕消除")}
          </div>
          <div className="rounded-md bg-[var(--canvas-controls-hover)] px-2.5 py-2 text-[12px] leading-relaxed text-[var(--canvas-controls-text-muted)]">
            {t2(MODE_DESC_KEYS[mode2], MODE_DESC_FALLBACKS[mode2])}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-[var(--canvas-controls-text-muted)]">
              {t2("canvas.eraseSubtitle.modeLabel", "处理方式")}
            </span>
            <ModeToggle value={mode2} onChange={onModeChange} />
          </div>
          <div className="flex w-full items-center justify-between pt-1">
            <button
              type="button"
              onClick={onClose}
              data-action-ui-id="canvas.erase-subtitle.cancel"
              aria-label={t2("canvas.eraseSubtitle.cancel", "取消")}
              title={t2("canvas.eraseSubtitle.cancel", "取消")}
              className="flex size-8 items-center justify-center rounded-md text-[var(--canvas-controls-text)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-text)]"
            >
              <CloseIcon$1 />
            </button>
            <Button$2
              variant="default"
              size="icon"
              onClick={handleSubmit}
              data-action-ui-id="canvas.erase-subtitle.submit"
              aria-label={submitLabel}
            >
              <SendArrowIcon />
            </Button$2>
          </div>
        </div>
      </NodeToolbar$1>
    );
  },
);
