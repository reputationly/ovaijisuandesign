// canvas-host-toolbar-button.jsx
import { DEFAULT_PLACEMENT_GAP } from "../canvas/ungroup-in-canvas.js";
import { jsxRuntimeExports, useStorage, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { CoachMark } from "../assets/use-materialized-entities.jsx";
import { CDN_COACHMARK_CANVAS_GROUP } from "../workspace/context-menu-content.jsx";
import { Settings2 } from "../media-editing/package.jsx";
import { useSettingsDialog } from "../settings/persist-visible-workspace-manual-order.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { CanvasToolbarExtensionButton } from "../canvas/canvas-toolbar-extension-button.jsx";
export function CanvasHostToolbarButton({
  icon,
  label,
  onClick,
  dataActionUiId,
  iconSize = "md",
  tooltipSide = "top",
  kind = "action",
  active: active2,
  controlsId,
  hasPopup,
  count: count2,
}) {
  const content = (
    <>
      <Icon icon={icon} size={iconSize} aria-hidden={true} />
      {count2 !== void 0 && (
        <span className="text-[11px] tabular-nums" aria-hidden="true">
          {count2}
        </span>
      )}
    </>
  );
  let trigger;
  if (kind === "action") {
    trigger = (
      <CanvasToolbarExtensionButton
        label={label}
        tooltipSide={tooltipSide}
        onClick={onClick}
        dataActionUiId={dataActionUiId}
      >
        {content}
      </CanvasToolbarExtensionButton>
    );
  } else if (kind === "toggle") {
    trigger = (
      <CanvasToolbarExtensionButton
        label={label}
        tooltipSide={tooltipSide}
        onClick={onClick}
        dataActionUiId={dataActionUiId}
        kind="toggle"
        active={active2 ?? false}
      >
        {content}
      </CanvasToolbarExtensionButton>
    );
  } else {
    trigger = (
      <CanvasToolbarExtensionButton
        label={label}
        tooltipSide={tooltipSide}
        onClick={onClick}
        dataActionUiId={dataActionUiId}
        kind="panel"
        active={active2 ?? false}
        controlsId={controlsId}
        hasPopup={hasPopup}
      >
        {content}
      </CanvasToolbarExtensionButton>
    );
  }
  return trigger;
}
export function CanvasWatermarkChip({ variant = "floating" }) {
  const { t } = useTranslation();
  const { openSettings } = useSettingsDialog();
  const [config] = useStorage("global.config");
  const watermarkEnabled = false;
  if (!watermarkEnabled) return null;
  const handleWatermarkSettings = () => {
    openSettings("general");
  };
  const buttonClassName =
    variant === "toolbar"
      ? "pointer-events-auto flex size-8 cursor-pointer items-center justify-center rounded-full text-[var(--canvas-controls-text)] opacity-80 transition-colors hover:bg-[var(--canvas-controls-hover)] hover:opacity-100"
      : "pointer-events-auto flex h-8 items-center rounded-lg border border-border bg-background transition-colors [border-width:var(--divider-width)] hover:border-foreground/80";
  const innerClassName =
    variant === "toolbar"
      ? "flex size-full cursor-pointer items-center justify-center rounded-full"
      : "flex h-full cursor-pointer select-none items-center gap-1.5 rounded-lg px-2 text-xs opacity-70 transition-colors hover:bg-muted/60 hover:opacity-100";
  return (
    <div className={variant === "toolbar" ? void 0 : "pointer-events-auto"}>
      <button
        type="button"
        onClick={handleWatermarkSettings}
        title={t("canvas.watermark.settings")}
        aria-label={t("canvas.watermark.settings")}
        data-action-ui-id="canvas.watermark-settings"
        className={buttonClassName}
      >
        <span className={innerClassName}>
          <Settings2 size={14} strokeWidth={1.5} />
          {variant === "floating" && (
            <span className="@max-[640px]/canvas-area:hidden">
              {t("canvas.watermark.settings")}
            </span>
          )}
        </span>
      </button>
    </div>
  );
}
function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}
function requiredString(record, key) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
export function mapLocalComfyUiWorkflows(value) {
  const workflows = asRecord(value)?.workflows;
  if (!Array.isArray(workflows)) return [];
  return workflows.flatMap((candidate) => {
    const record = asRecord(candidate);
    if (!record || record.source !== "user") return [];
    const id = requiredString(record, "id");
    const recordName = requiredString(record, "name");
    const title = requiredString(record, "title");
    if (!id || !recordName || !title) return [];
    const shortDesc = requiredString(record, "short_desc");
    const tags = Array.isArray(record.tags)
      ? record.tags.filter((tag) => typeof tag === "string")
      : void 0;
    return [
      {
        id,
        name: recordName,
        title,
        source: "user",
        ...(shortDesc
          ? {
              short_desc: shortDesc,
            }
          : {}),
        ...(tags?.length
          ? {
              tags,
            }
          : {}),
      },
    ];
  });
}
export function computeGridDropPositions(
  anchor,
  sizes,
  gap = DEFAULT_PLACEMENT_GAP,
) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(sizes.length)));
  const positions = [];
  let cursorX = anchor.x;
  let cursorY = anchor.y;
  let rowMaxHeight = 0;
  for (const [i, size] of sizes.entries()) {
    if (i > 0 && i % cols === 0) {
      cursorX = anchor.x;
      cursorY += rowMaxHeight + gap;
      rowMaxHeight = 0;
    }
    positions.push({
      x: cursorX,
      y: cursorY,
    });
    cursorX += size.width + gap;
    rowMaxHeight = Math.max(rowMaxHeight, size.height);
  }
  return positions;
}
const MEDIA_TYPE_SET = new Set(["image", "video", "audio", "text", "file"]);
export function asMediaType(value) {
  return value && MEDIA_TYPE_SET.has(value) ? value : void 0;
}
const MARK_ID = "canvas-group-intro";
export function GroupCoachMark({ anchorRef, selectedCount }) {
  const { t } = useTranslation();
  return (
    <CoachMark
      markId={MARK_ID}
      enabled={selectedCount >= 2}
      anchorRef={anchorRef}
      side="top"
      align="end"
      sideOffset={0}
      hideArrow={true}
      showClose={true}
      media={{
        url: CDN_COACHMARK_CANVAS_GROUP,
        type: "image",
      }}
      title={t("coachMark.canvas.group.title", "素材编组")}
      description={t(
        "coachMark.canvas.group.desc",
        "画布乱了？选多个节点右键「编组」，垂直/水平/宫格三种布局自动排",
      )}
      ctaLabel={t("coachMark.gotIt", "我知道了")}
    />
  );
}
export const NODE_CONTEXT_MENU_VIEWPORT_MARGIN = 8;
const NODE_CONTEXT_MENU_ANCHOR_GAP = 4;
function resolveAxis(anchor, menuSize, viewportSize, margin, gap) {
  const min = margin;
  const max = Math.max(min, viewportSize - margin - menuSize);
  const after = anchor + gap;
  const before = anchor - gap - menuSize;
  if (after >= min && after <= max) return after;
  if (before >= min && before <= max) return before;
  return Math.min(Math.max(after, min), max);
}
export function resolveNodeContextMenuPosition({
  anchor,
  menuSize,
  viewportSize,
  margin = NODE_CONTEXT_MENU_VIEWPORT_MARGIN,
  gap = NODE_CONTEXT_MENU_ANCHOR_GAP,
}) {
  return {
    x: resolveAxis(anchor.x, menuSize.width, viewportSize.width, margin, gap),
    y: resolveAxis(anchor.y, menuSize.height, viewportSize.height, margin, gap),
  };
}
