// hailuo03-super-resolution-popover.jsx
import {
  jsxRuntimeExports,
  NodeToolbar$1,
  Position,
  reactExports,
  useNodeId,
  useStore$3,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useVideoEditCost } from "./video-tool-meta.jsx";
import {
  useCanvasBridge,
  useCanvasIsBoxSelecting,
  useCanvasIsDragging,
  useCanvasIsMultiSelect,
} from "./package.jsx";
import { NODE_POPOVER_SAFE_GAP } from "./use-warn-missing-asset-meta.jsx";
import { CreditCostBadge } from "../generation/missing-asset-card.jsx";
import { Button$2 } from "../canvas/node-shell-inner.jsx";
import {
  Select$2,
  SelectContent$1,
  SelectItem$1,
  SelectTrigger$1,
} from "../generation/select-content.jsx";

const H3_TARGET_RESOLUTION = "2K";

export const Hailuo03SuperResolutionPopover = reactExports.memo(
  function Hailuo03SuperResolutionPopover2({
    onSubmit,
    onClose,
    durationSec,
    renderShell,
  }) {
    const { t: t2 } = useTranslation();
    const {
      accountSubmissionAllowed = true,
      beforeAccountSubmission = () => true,
    } = useCanvasBridge();
    const creditCost = useVideoEditCost(
      "hailuo03-super-resolution",
      durationSec,
    );
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
      if (renderShell) return;
      if (!selected2) onCloseRef.current();
    }, [renderShell, selected2]);
    const hidden =
      !renderShell && (isDragging || isMultiSelect || isBoxSelecting);
    const handleSubmit = reactExports.useCallback(() => {
      if (!beforeAccountSubmission()) return;
      onSubmit();
    }, [beforeAccountSubmission, onSubmit]);
    const nativeBadge = (
      <span className="rounded-full border border-brand-accent px-1.5 py-px text-[10px] leading-[14px] text-brand-accent">
        {t2("canvas.hailuo03SuperResolution.nativeBadge", "H3 原生超分")}
      </span>
    );
    const body2 = (
      // biome-ignore lint/a11y/noStaticElementInteractions: event barrier only — pointer/dblclick must not leak to the host node
      <div
        className="flex w-64 flex-col gap-3 rounded-lg bg-[var(--canvas-controls-bg)] p-3 shadow-[var(--canvas-shadow-dropdown)] animate-[i2v-popover-in_0.15s_ease-out]"
        style={{
          display: hidden ? "none" : void 0,
        }}
        onPointerDown={(e2) => e2.stopPropagation()}
        onDoubleClick={(e2) => e2.stopPropagation()}
      >
        <div className="font-heading text-[13px] font-medium text-[var(--canvas-controls-text)]">
          {t2("canvas.hailuo03SuperResolution.title", "H3 2K超分")}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-[var(--canvas-controls-text-muted)]">
            {t2("canvas.hailuo03SuperResolution.resolutionLabel", "分辨率")}
          </span>
          <Select$2 value={H3_TARGET_RESOLUTION}>
            <SelectTrigger$1
              size="sm"
              data-action-ui-id="canvas.hailuo03-super-resolution.resolution-select"
              className="w-full"
            >
              <span className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
                <span>{H3_TARGET_RESOLUTION}</span>
                {nativeBadge}
              </span>
            </SelectTrigger$1>
            <SelectContent$1>
              <SelectItem$1 value={H3_TARGET_RESOLUTION}>
                <span className="flex items-center gap-1.5">
                  <span>{H3_TARGET_RESOLUTION}</span>
                  {nativeBadge}
                </span>
              </SelectItem$1>
            </SelectContent$1>
          </Select$2>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button$2
            variant="ghost"
            size="sm"
            onClick={onClose}
            data-action-ui-id="canvas.hailuo03-super-resolution.cancel"
          >
            {t2("canvas.hailuo03SuperResolution.cancel", "取消")}
          </Button$2>
          <Button$2
            variant="default"
            size="sm"
            disabled={!accountSubmissionAllowed}
            onClick={handleSubmit}
            data-action-ui-id="canvas.hailuo03-super-resolution.submit"
            className="inline-flex items-center gap-1.5"
          >
            <span>{t2("canvas.hailuo03SuperResolution.submit", "生成")}</span>
            {creditCost != null && creditCost > 0 && (
              <CreditCostBadge
                cost={creditCost}
                className="text-[12px] opacity-90"
              />
            )}
          </Button$2>
        </div>
      </div>
    );
    if (renderShell)
      return (
        <>
          {renderShell({
            onClose,
            children: body2,
          })}
        </>
      );
    return (
      <NodeToolbar$1
        isVisible={true}
        position={Position.Bottom}
        offset={NODE_POPOVER_SAFE_GAP}
        align="center"
      >
        {body2}
      </NodeToolbar$1>
    );
  },
);
