// hailuo03-super-resolution-popover.jsx
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { NodeToolbar, useNodeId, useStore } from "../vendor-fork/xyflow/react/index.js";
import { Position } from "../vendor-fork/xyflow/system/index.js";
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
import { Button } from "../canvas/node-shell-inner.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../generation/select-content.jsx";
// 平台只有 seedvr2，它按部署档位出片（约 1920×1104）——要 2K 得换 SwiftVR，而 SwiftVR 已下线。
// 所以这里只保留一档，并且如实标 1080P。
const H3_TARGET_RESOLUTION = "1080P";
export const Hailuo03SuperResolutionPopover = reactExports.memo(
  function Hailuo03SuperResolutionPopover({
    onSubmit,
    onClose,
    durationSec,
    renderShell,
  }) {
    const { t } = useTranslation();
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
      (storeState) => (nodeId ? !!storeState.nodeLookup.get(nodeId)?.selected : true),
      [nodeId],
    );
    const isSelected = useStore(selectedSelector);
    const isDragging = useCanvasIsDragging();
    const isMultiSelect = useCanvasIsMultiSelect();
    const isBoxSelecting = useCanvasIsBoxSelecting();
    reactExports.useEffect(() => {
      if (renderShell) return;
      if (!isSelected) onCloseRef.current();
    }, [renderShell, isSelected]);
    const hidden =
      !renderShell && (isDragging || isMultiSelect || isBoxSelecting);
    const handleSubmit = reactExports.useCallback(() => {
      if (!beforeAccountSubmission()) return;
      onSubmit();
    }, [beforeAccountSubmission, onSubmit]);
    const nativeBadge = (
      <span className="rounded-full border border-brand-accent px-1.5 py-px text-[10px] leading-[14px] text-brand-accent">
        {t("canvas.hailuo03SuperResolution.nativeBadge", "H3 原生超分")}
      </span>
    );
    const body = (
      // biome-ignore lint/a11y/noStaticElementInteractions: event barrier only — pointer/dblclick must not leak to the host node
      <div
        className="flex w-64 flex-col gap-3 rounded-lg bg-[var(--canvas-controls-bg)] p-3 shadow-[var(--canvas-shadow-dropdown)] animate-[i2v-popover-in_0.15s_ease-out]"
        style={{
          display: hidden ? "none" : void 0,
        }}
        onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
        onDoubleClick={(mouseEvent) => mouseEvent.stopPropagation()}
      >
        <div className="font-heading text-[13px] font-medium text-[var(--canvas-controls-text)]">
          {t("canvas.hailuo03SuperResolution.title", "H3 2K超分")}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-[var(--canvas-controls-text-muted)]">
            {t("canvas.hailuo03SuperResolution.resolutionLabel", "分辨率")}
          </span>
          <Select value={H3_TARGET_RESOLUTION}>
            <SelectTrigger
              size="sm"
              data-action-ui-id="canvas.hailuo03-super-resolution.resolution-select"
              className="w-full"
            >
              <span className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
                <span>{H3_TARGET_RESOLUTION}</span>
                {nativeBadge}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={H3_TARGET_RESOLUTION}>
                <span className="flex items-center gap-1.5">
                  <span>{H3_TARGET_RESOLUTION}</span>
                  {nativeBadge}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            data-action-ui-id="canvas.hailuo03-super-resolution.cancel"
          >
            {t("canvas.hailuo03SuperResolution.cancel", "取消")}
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={!accountSubmissionAllowed}
            onClick={handleSubmit}
            data-action-ui-id="canvas.hailuo03-super-resolution.submit"
            className="inline-flex items-center gap-1.5"
          >
            <span>{t("canvas.hailuo03SuperResolution.submit", "生成")}</span>
            {creditCost != null && creditCost > 0 && (
              <CreditCostBadge
                cost={creditCost}
                className="text-[12px] opacity-90"
              />
            )}
          </Button>
        </div>
      </div>
    );
    if (renderShell)
      return (
        <>
          {renderShell({
            onClose,
            children: body,
          })}
        </>
      );
    return (
      <NodeToolbar
        isVisible={true}
        position={Position.Bottom}
        offset={NODE_POPOVER_SAFE_GAP}
        align="center"
      >
        {body}
      </NodeToolbar>
    );
  },
);
