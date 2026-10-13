// multi-image-chrome.jsx
import {
  ExternalLink$2 as ExternalLink,
  jsxRuntimeExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Ungroup } from "../canvas/diagnostic-history-tools.js";
import { CountBadge } from "./compute-multi-image-grid-positions.jsx";
function SplitAllButton({ onSplitAll, disabled }) {
  const { t } = useTranslation();
  const label = t("canvas.multiImage.splitAll", "全部独立");
  const handleClick = (clickEvent) => {
    clickEvent.stopPropagation();
    if (disabled) return;
    onSplitAll();
  };
  if (disabled) return null;
  return (
    <button
      type="button"
      data-action-ui-id="canvas.image-node.split-all"
      onClick={handleClick}
      aria-label={label}
      title={label}
      className="pointer-events-auto flex h-6 items-center gap-1 rounded-[8px] bg-black/55 px-2 text-[11px] font-medium text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
    >
      <Ungroup size={12} />
      {label}
    </button>
  );
}
function SplitMainButton({ onSplitMain, disabled }) {
  const { t } = useTranslation();
  const label = t("canvas.multiImage.splitMain", "独立展示");
  const handleClick = (clickEvent) => {
    clickEvent.stopPropagation();
    if (disabled) return;
    onSplitMain();
  };
  if (disabled) return null;
  return (
    <button
      type="button"
      data-action-ui-id="canvas.image-node.split-main"
      onClick={handleClick}
      aria-label={label}
      title={label}
      className="pointer-events-auto flex h-6 items-center gap-1 rounded-[8px] bg-black/55 px-2 text-[11px] font-medium text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
    >
      <ExternalLink size={12} />
      {label}
    </button>
  );
}
export const MultiImageChrome = reactExports.memo(function MultiImageChrome({
  view,
  showOverlay,
  hasLifecyclePrimary,
  isEmpty,
  imgError,
  imageEditing,
  rotateEditing,
  onToggleOverlay,
  onSplitAll,
  onSplitMain,
}) {
  const { t } = useTranslation();
  const countUnit = t("canvas.multiImage.countUnit", "张");
  const collapseLabel = t("canvas.multiMedia.collapseView", "收起视图");
  const showMultiChrome = view.isMulti && !imageEditing && !rotateEditing;
  const showSplitAll =
    view.isMulti &&
    !hasLifecyclePrimary &&
    !isEmpty &&
    !imgError &&
    !imageEditing &&
    !rotateEditing &&
    view.slots.some(
      (slot, slotIndex) => slotIndex !== view.primaryIndex && slot.status === "ready",
    );
  const showSplitMain =
    view.rounds.length > 1 &&
    !hasLifecyclePrimary &&
    !isEmpty &&
    !imgError &&
    !imageEditing &&
    !rotateEditing;
  const showCollapsedSplitRow = !showOverlay && (showSplitAll || showSplitMain);
  const showCollapsedActionRow =
    !showOverlay && (showMultiChrome || showCollapsedSplitRow);
  return (
    <>
      {showMultiChrome && showOverlay ? (
        <div
          data-action-ui-id="canvas.image-node.expanded-actions"
          className="pointer-events-none absolute left-1 top-1 z-20 flex items-center gap-1"
        >
          <button
            type="button"
            data-action-ui-id="canvas.image-node.collapse-view"
            onClick={onToggleOverlay}
            aria-label={collapseLabel}
            aria-expanded={showOverlay}
            className="pointer-events-auto inline-flex h-6 cursor-pointer items-center rounded-[8px] border-0 bg-black/55 px-2 text-[11px] font-medium text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
          >
            {collapseLabel}
          </button>
          {showSplitAll && (
            <SplitAllButton onSplitAll={onSplitAll} disabled={false} />
          )}
          {showSplitMain && (
            <SplitMainButton onSplitMain={onSplitMain} disabled={false} />
          )}
        </div>
      ) : null}
      {showCollapsedActionRow && (
        <div
          data-action-ui-id="canvas.image-node.primary-actions"
          className="canvas-media-primary-actions pointer-events-none absolute left-1 top-1 z-20 flex items-center gap-1"
        >
          {showMultiChrome && (
            <CountBadge
              count={view.slots.length}
              expanded={showOverlay}
              unit={countUnit}
              onClick={onToggleOverlay}
            />
          )}
          {showCollapsedSplitRow && (
            <div
              data-action-ui-id="canvas.image-node.split-actions"
              className="pointer-events-none flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
            >
              {showSplitAll && (
                <SplitAllButton onSplitAll={onSplitAll} disabled={false} />
              )}
              {showSplitMain && (
                <SplitMainButton onSplitMain={onSplitMain} disabled={false} />
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
});
