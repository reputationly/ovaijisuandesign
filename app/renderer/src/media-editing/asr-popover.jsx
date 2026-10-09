// asr-popover.jsx
import {
  NodeToolbar$1,
  Position,
  reactExports,
  useNodeId,
  useStore$3,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { DEFAULT_ASR_LANGUAGE } from "./video-tool-meta.jsx";
import {
  useCanvasIsBoxSelecting,
  useCanvasIsDragging,
  useCanvasIsMultiSelect,
} from "./package.jsx";
import { CloseIcon$1, SendArrowIcon } from "../canvas/file-missing-icon.jsx";
import { NODE_POPOVER_SAFE_GAP } from "./use-warn-missing-asset-meta.jsx";
import { Button$2 } from "../canvas/node-shell-inner.jsx";

const ASR_LANGUAGES = ["zh", "en", "other"];

const ASR_LANGUAGE_LABEL_KEYS = {
  zh: "canvas.asr.language.zh",
  en: "canvas.asr.language.en",
  other: "canvas.asr.language.other",
};

const ASR_LANGUAGE_LABEL_FALLBACKS = {
  zh: "中文",
  en: "英文",
  other: "其他",
};

function LanguageToggle({ value, onChange }) {
  const { t: t2 } = useTranslation();
  return (
    <div
      className="flex h-8 items-center gap-0.5 rounded-md p-0.5"
      style={{
        background: "var(--canvas-controls-active)",
      }}
    >
      {ASR_LANGUAGES.map((option2) => {
        const active2 = option2 === value;
        return (
          <button
            key={option2}
            type="button"
            onClick={() => {
              if (option2 !== value) onChange(option2);
            }}
            data-action-ui-id={`canvas.asr.language-${option2}`}
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
            {t2(
              ASR_LANGUAGE_LABEL_KEYS[option2],
              ASR_LANGUAGE_LABEL_FALLBACKS[option2],
            )}
          </button>
        );
      })}
    </div>
  );
}

export const AsrPopover = reactExports.memo(function AsrPopover2({
  onSubmit,
  onClose,
  defaultLanguage = DEFAULT_ASR_LANGUAGE,
}) {
  const { t: t2 } = useTranslation();
  const [language2, setLanguage] = reactExports.useState(defaultLanguage);
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
    onSubmit({
      language: language2,
    });
  }, [onSubmit, language2]);
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
          {t2("canvas.asr.title", "字幕生成")}
        </div>
        <div className="rounded-md bg-[var(--canvas-controls-hover)] px-2.5 py-2 text-[12px] leading-relaxed text-[var(--canvas-controls-text-muted)]">
          {t2(
            "canvas.asr.description",
            "基于视频音轨自动识别并生成字幕文件（SRT 格式）。处理时长需要几分钟，结果会作为派生文件出现在画布上。",
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-[var(--canvas-controls-text-muted)]">
            {t2("canvas.asr.languageLabel", "识别语言")}
          </span>
          <LanguageToggle value={language2} onChange={setLanguage} />
        </div>
        <div className="flex w-full items-center justify-between pt-1">
          <button
            type="button"
            onClick={onClose}
            data-action-ui-id="canvas.asr.cancel"
            aria-label={t2("canvas.asr.cancel", "取消")}
            title={t2("canvas.asr.cancel", "取消")}
            className="flex size-8 items-center justify-center rounded-md text-[var(--canvas-controls-text)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] focus-visible:ring-1 focus-visible:ring-[var(--canvas-controls-text)]"
          >
            <CloseIcon$1 />
          </button>
          <Button$2
            variant="default"
            size="icon"
            onClick={handleSubmit}
            data-action-ui-id="canvas.asr.submit"
            aria-label={t2("canvas.asr.submit", "开始")}
          >
            <SendArrowIcon />
          </Button$2>
        </div>
      </div>
    </NodeToolbar$1>
  );
});
