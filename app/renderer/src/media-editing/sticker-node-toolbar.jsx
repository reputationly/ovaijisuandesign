// sticker-node-toolbar.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import {
  ChevronDown,
  ChevronUp,
  CopyPlus,
  jsxRuntimeExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { Tooltip } from "../generation/missing-asset-card.jsx";
import {
  CANVAS_EMOJI_STICKERS,
  CANVAS_STICKER_PICKER_ASSETS,
  CanvasToolModeContext,
  getCanvasStickerAsset,
} from "./canvas-sticker-assets.jsx";
import { Trash2 } from "./package.jsx";
import { useCanvasActions } from "./use-canvas-actions.js";
import { useCanvasNodeIsDragging } from "../canvas/fullscreen-icon.jsx";
import { NodeToolbar } from "./toolbar-item.jsx";
import { useRegisterZoomCounter } from "../infra/create-recently-added-store.js";
import { NodeFrameStroke } from "../canvas/node-shell-inner.jsx";
function useCanvasToolMode() {
  return reactExports.useContext(CanvasToolModeContext);
}
const COMPACT_STICKER_COUNT = 7;
const ALL_STICKER_CHOICES = [
  ...CANVAS_STICKER_PICKER_ASSETS.map((asset) => ({
    id: asset.id,
    kind: "asset",
    asset,
  })),
  ...CANVAS_EMOJI_STICKERS.map((emoji2, index2) => ({
    id: `emoji-${index2}`,
    kind: "emoji",
    emoji: emoji2,
    index: index2,
  })),
];
function choiceActionUiId(choice, expanded) {
  const prefix = expanded
    ? "canvas.sticker-selection-panel"
    : "canvas.sticker-selection";
  return choice.kind === "asset"
    ? `${prefix}-${choice.asset.id}`
    : `${prefix}-emoji-${choice.index}`;
}
function choiceLabel(choice, t2) {
  return choice.kind === "asset" ? t2(choice.asset.labelKey) : choice.emoji;
}
function StickerChoiceIcon({ choice }) {
  if (choice.kind === "asset") {
    return (
      <img
        src={choice.asset.src}
        alt=""
        draggable={false}
        className="size-6 object-contain"
      />
    );
  }
  return (
    <span
      className="text-xl leading-none text-[var(--canvas-controls-text)]"
      aria-hidden="true"
    >
      {choice.emoji}
    </span>
  );
}
function StickerToolbarButton({
  label,
  icon,
  dataActionUiId,
  onClick,
  active: active2 = false,
  toggle = false,
  destructive = false,
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={toggle ? active2 : void 0}
        className="canvas-toolbar-action"
        onClick={onClick}
        data-action-ui-id={dataActionUiId}
        data-variant={destructive ? "destructive" : void 0}
        data-active={active2 || void 0}
        data-content={toggle ? "sticker" : void 0}
      >
        {icon}
      </button>
    </Tooltip>
  );
}
function StickerPickerControl({
  choices,
  activeChoiceId,
  expanded,
  onExpandedChange,
  onSelect,
  getChoiceLabel,
  expandLabel,
  collapseLabel,
}) {
  const label = expanded ? collapseLabel : expandLabel;
  const handleToggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onExpandedChange(!expanded);
  };
  return (
    <div className="relative flex items-center">
      <Tooltip content={label}>
        <button
          type="button"
          aria-label={label}
          aria-expanded={expanded}
          className="canvas-toolbar-action canvas-toolbar-disclosure"
          onClick={handleToggle}
          data-action-ui-id="canvas.sticker-selection-expand"
          data-active={expanded || void 0}
        >
          {expanded ? (
            <ChevronUp
              className="size-4"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          ) : (
            <ChevronDown
              className="size-4"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          )}
        </button>
      </Tooltip>
      {expanded && (
        <div
          role="dialog"
          aria-label={expandLabel}
          className="absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-max max-w-[calc(100vw-24px)] -translate-x-1/2 overflow-x-auto canvas-toolbar-menu p-3"
        >
          <div className="flex flex-nowrap gap-1">
            {choices.map((choice) => {
              const active2 = choice.id === activeChoiceId;
              return (
                <button
                  key={choice.id}
                  type="button"
                  aria-label={getChoiceLabel(choice)}
                  aria-pressed={active2}
                  title={getChoiceLabel(choice)}
                  className="canvas-toolbar-action"
                  onClick={(event) => onSelect(choice, event)}
                  data-action-ui-id={choiceActionUiId(choice, true)}
                  data-content="sticker"
                >
                  <StickerChoiceIcon choice={choice} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
function StickerNodeToolbar({ id: id2, data: data2, selected: selected2 }) {
  const { t: t2 } = useTranslation();
  const toolMode = useCanvasToolMode();
  const isDragging = useCanvasNodeIsDragging(id2);
  const {
    mergeNodeData,
    setStickerSelectionAsset,
    setStickerSelectionEmoji,
    copyNode,
    removeNode,
  } = useCanvasActions();
  const [stickerPickerExpanded, setStickerPickerExpanded] =
    reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!selected2 || toolMode === "hand") {
      setStickerPickerExpanded(false);
    }
  }, [selected2, toolMode]);
  const handleAssetChange = reactExports.useCallback(
    (assetId) => {
      mergeNodeData(id2, {
        brandId: assetId,
      });
      if (toolMode === "sticker") setStickerSelectionAsset?.(assetId);
    },
    [id2, mergeNodeData, setStickerSelectionAsset, toolMode],
  );
  const handleEmojiChange = reactExports.useCallback(
    (emoji2) => {
      mergeNodeData(id2, {
        brandId: void 0,
        emoji: emoji2,
      });
      if (toolMode === "sticker") setStickerSelectionEmoji?.(emoji2);
    },
    [id2, mergeNodeData, setStickerSelectionEmoji, toolMode],
  );
  const handleChoiceSelect = reactExports.useCallback(
    (choice, event) => {
      event.preventDefault();
      event.stopPropagation();
      if (choice.kind === "asset") handleAssetChange(choice.asset.id);
      else handleEmojiChange(choice.emoji);
    },
    [handleAssetChange, handleEmojiChange],
  );
  const handleCopy = reactExports.useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      copyNode(id2);
    },
    [copyNode, id2],
  );
  const handleDelete2 = reactExports.useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeNode(id2);
    },
    [id2, removeNode],
  );
  const getChoiceLabel = reactExports.useCallback(
    (choice) => choiceLabel(choice, (key2) => t2(key2)),
    [t2],
  );
  const activeChoiceId = reactExports.useMemo(
    () =>
      data2.brandId ??
      (data2.emoji
        ? `emoji-${CANVAS_EMOJI_STICKERS.indexOf(data2.emoji)}`
        : void 0),
    [data2.brandId, data2.emoji],
  );
  const compactChoices = reactExports.useMemo(
    () => ALL_STICKER_CHOICES.slice(0, COMPACT_STICKER_COUNT),
    [],
  );
  const expandedChoices = reactExports.useMemo(() => {
    const compactChoiceIds = new Set(compactChoices.map((choice) => choice.id));
    return ALL_STICKER_CHOICES.filter(
      (choice) => !compactChoiceIds.has(choice.id),
    );
  }, [compactChoices]);
  const toolbarItems = reactExports.useMemo(
    () => [
      ...compactChoices.map((choice) => ({
        id: `sticker-selection-${choice.id}`,
        label: getChoiceLabel(choice),
        render: () => (
          <StickerToolbarButton
            label={getChoiceLabel(choice)}
            icon={<StickerChoiceIcon choice={choice} />}
            active={choice.id === activeChoiceId}
            toggle={true}
            dataActionUiId={choiceActionUiId(choice, false)}
            onClick={(event) => handleChoiceSelect(choice, event)}
          />
        ),
      })),
      {
        id: "sticker-selection-expand",
        label: t2("canvas.sticker.expand", "展开更多贴纸"),
        render: () => (
          <StickerPickerControl
            choices={expandedChoices}
            activeChoiceId={activeChoiceId}
            expanded={stickerPickerExpanded}
            onExpandedChange={setStickerPickerExpanded}
            onSelect={handleChoiceSelect}
            getChoiceLabel={getChoiceLabel}
            expandLabel={t2("canvas.sticker.expand", "展开更多贴纸")}
            collapseLabel={t2("canvas.sticker.collapse", "收起贴纸")}
          />
        ),
      },
      {
        id: "sticker-copy-node",
        label: t2("canvas.copySticker", "Copy Sticker"),
        separator: true,
        render: () => (
          <StickerToolbarButton
            label={t2("canvas.copySticker", "Copy Sticker")}
            icon={
              <CopyPlus
                className="size-4"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            }
            dataActionUiId="canvas.sticker-copy-node"
            onClick={handleCopy}
          />
        ),
      },
      {
        id: "sticker-delete-node",
        label: t2("common.delete"),
        render: () => (
          <StickerToolbarButton
            label={t2("common.delete")}
            icon={
              <Trash2 className="size-4" strokeWidth={1.5} aria-hidden="true" />
            }
            dataActionUiId="canvas.sticker-delete-node"
            onClick={handleDelete2}
            destructive={true}
          />
        ),
      },
    ],
    [
      activeChoiceId,
      compactChoices,
      expandedChoices,
      getChoiceLabel,
      handleChoiceSelect,
      handleCopy,
      handleDelete2,
      stickerPickerExpanded,
      t2,
    ],
  );
  const visible =
    selected2 &&
    !isDragging &&
    (toolMode === "select" || toolMode === "sticker");
  return (
    <NodeToolbar items={toolbarItems} visible={visible} density="compact" />
  );
}
export const StickerNode = reactExports.memo(function StickerNode2({
  id: id2,
  data: data2,
  selected: selected2,
}) {
  const frameRef = reactExports.useRef(null);
  useRegisterZoomCounter(frameRef);
  const sticker = data2;
  const asset = getCanvasStickerAsset(sticker.brandId);
  const label = asset ? `Sticker ${asset.id}` : `Sticker ${sticker.emoji}`;
  const rotation = typeof sticker.rotation === "number" ? sticker.rotation : 0;
  return (
    <>
      <div
        className="relative flex size-full items-center justify-center"
        role="img"
        aria-label={label}
        data-action-ui-id="canvas.sticker-node"
        data-sticker-target-id={sticker.targetId}
        data-sticker-fresh={sticker.__fresh ? "" : void 0}
      >
        <span
          className="sticker-art size-full"
          style={{
            "--sticker-rotation": `${rotation}deg`,
          }}
        >
          {sticker.__fresh && (
            <span className="sticker-burst" aria-hidden="true">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <span
                  key={angle}
                  className="sticker-spark"
                  style={{
                    "--sticker-spark-angle": `${angle}deg`,
                  }}
                />
              ))}
            </span>
          )}
          {asset ? (
            <img
              src={asset.src}
              alt=""
              draggable={false}
              className="relative size-full select-none object-contain"
            />
          ) : (
            <span
              className="relative flex size-full items-center justify-center text-[2.75rem] leading-none"
              style={{
                color: "var(--canvas-controls-text)",
                filter:
                  "drop-shadow(0 2px 2px color-mix(in srgb, var(--canvas-controls-text) 22%, transparent))",
                WebkitTextStroke: "4px var(--canvas-controls-bg)",
                paintOrder: "stroke fill",
              }}
            >
              {sticker.emoji}
            </span>
          )}
        </span>
        <span
          ref={frameRef}
          className="canvas-node-frame pointer-events-none absolute inset-0 rounded-[10px]"
          data-node-selected={selected2 ? "true" : "false"}
          style={{
            transform: `rotate(${rotation}deg)`,
          }}
          aria-hidden="true"
        >
          <NodeFrameStroke />
        </span>
      </div>
      <StickerNodeToolbar id={id2} data={sticker} selected={!!selected2} />
    </>
  );
});
