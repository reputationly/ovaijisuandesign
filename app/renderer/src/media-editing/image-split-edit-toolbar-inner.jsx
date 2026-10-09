// image-split-edit-toolbar-inner.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { CloseIcon, GroupIcon } from "../canvas/file-missing-icon.jsx";
import {
  jsxRuntimeExports,
  NodeToolbar$1 as NodeToolbar,
  Position,
  reactExports,
  useStore$3 as useStore,
  useTranslation,
} from "../vendor.js";
import { SPLIT_MAGNIFICATIONS } from "./image-rotate-preview-inner.jsx";
import { DropdownArrowIcon } from "../canvas/generating-media-area.jsx";
import { CreditCostBadge, Tooltip } from "../generation/missing-asset-card.jsx";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "./use-warn-missing-asset-meta.jsx";
import { DropdownMenuContent, DropdownMenuItem } from "./audio-lightbox.jsx";
import { TooltipProvider } from "../infra/create-recently-added-store.js";
const HEADER_FLOW_HEIGHT = 28;
const TOOLBAR_GAP = 16;
const zoomSelector = (s2) => s2.transform[2];
function MagnificationGenerateControl({
  magnification,
  onSelect,
  onGenerate,
  totalCost,
  disabled: disabled2,
  processing,
}) {
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  return (
    <div className="ml-1 flex h-8 items-center gap-0.5">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          disabled={processing}
          aria-label={t2("canvas.splitGrid.magnification", "选择高清倍率")}
          className="canvas-toolbar-action"
          data-action-ui-id="canvas.split-grid.magnification"
        >
          <span className="whitespace-nowrap">
            {t2("canvas.splitGrid.scale", "{{magnification}}倍", {
              magnification: magnification.multiplier,
            })}
          </span>
          <DropdownArrowIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          sideOffset={8}
          align="start"
          className="flex min-w-24 flex-col gap-0.5 p-1"
          variant="toolbar"
        >
          {SPLIT_MAGNIFICATIONS.map((m3) => (
            <DropdownMenuItem
              key={m3.id}
              onClick={() => onSelect(m3.id)}
              className="canvas-toolbar-menu-item px-3 py-2"
            >
              <span className="whitespace-nowrap">
                {t2("canvas.splitGrid.scale", "{{magnification}}倍", {
                  magnification: m3.multiplier,
                })}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Tooltip
        content={t2(
          "canvas.splitGrid.generateHdTooltip",
          "将选中的宫格图片高清放大后创建分镜组。",
        )}
        side="bottom"
      >
        <button
          type="button"
          aria-disabled={disabled2}
          onClick={disabled2 ? void 0 : onGenerate}
          className="canvas-toolbar-action"
          data-action-ui-id="canvas.split-grid.generate-hd-group"
        >
          <span className="whitespace-nowrap">
            {processing
              ? t2("canvas.splitGrid.generating", "生成中…")
              : t2("canvas.splitGrid.generateHd", "生成高清图片")}
          </span>
          {!processing && (
            <CreditCostBadge
              cost={totalCost}
              className="origin-center scale-[0.84] rounded-md bg-[var(--canvas-toolbar-action-hover)] px-1.5 py-0.5 gap-0.5 text-[13px] text-[var(--canvas-toolbar-fg)]/70"
            />
          )}
        </button>
      </Tooltip>
    </div>
  );
}
function ExitChip({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="canvas-toolbar-action"
    >
      <CloseIcon />
    </button>
  );
}
function Divider() {
  return <div className="canvas-toolbar-separator" aria-hidden="true" />;
}
function ImageSplitEditToolbarInner({
  visible,
  selectedCount,
  magnification,
  onSetMagnification,
  onGenerate,
  onSplitLocal,
  onExit,
  processing,
  perCellCost,
}) {
  const { t: t2 } = useTranslation();
  const zoom2 = useStore(zoomSelector);
  const offset2 = HEADER_FLOW_HEIGHT * zoom2 + TOOLBAR_GAP;
  const hasSelection2 = selectedCount > 0;
  const totalCost =
    perCellCost != null && hasSelection2 ? perCellCost * selectedCount : void 0;
  return (
    <NodeToolbar
      isVisible={visible}
      position={Position.Top}
      offset={offset2}
      align="center"
    >
      <TooltipProvider delay={150} closeDelay={0}>
        <div
          className="canvas-toolbar-surface animate-[toolbar-fade-in_0.15s_ease-out]"
          onPointerDown={(e2) => e2.stopPropagation()}
          onWheel={(e2) => e2.stopPropagation()}
          onContextMenu={(e2) => e2.stopPropagation()}
          data-canvas-toolbar="true"
          data-density="compact"
        >
          <ExitChip
            onClick={onExit}
            label={t2("canvas.splitGrid.label", "宫格切分")}
          />
          <span
            className="canvas-toolbar-label px-2.5 whitespace-nowrap"
            style={{
              color: "var(--canvas-toolbar-muted-fg)",
            }}
          >
            {hasSelection2
              ? t2("canvas.splitGrid.selectedCount", "已选 {{count}} 个宫格", {
                  count: selectedCount,
                })
              : t2("canvas.splitGrid.selectHint", "选择想切分的宫格")}
          </span>
          {onSplitLocal && (
            <>
              <Tooltip
                content={t2(
                  "canvas.splitGrid.createGroupTooltip",
                  "将选中的宫格拆分为图片并创建分镜组，不消耗积分。",
                )}
                side="bottom"
              >
                <button
                  type="button"
                  aria-disabled={!hasSelection2 || processing}
                  onClick={hasSelection2 && !processing ? onSplitLocal : void 0}
                  className="canvas-toolbar-action"
                  data-action-ui-id="canvas.split-grid.create-storyboard-group"
                >
                  <GroupIcon size={18} />
                  <span className="whitespace-nowrap">
                    {t2("canvas.splitGrid.createGroup", "创建分镜组")}
                  </span>
                </button>
              </Tooltip>
              <Divider />
            </>
          )}
          <MagnificationGenerateControl
            magnification={magnification}
            onSelect={onSetMagnification}
            onGenerate={onGenerate}
            totalCost={totalCost}
            disabled={!hasSelection2 || processing}
            processing={processing}
          />
        </div>
      </TooltipProvider>
    </NodeToolbar>
  );
}
export const ImageSplitEditToolbar = reactExports.memo(
  ImageSplitEditToolbarInner,
);
