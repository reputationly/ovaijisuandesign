// canvas-command-panel-content.jsx
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Eye, EyeOff } from "../media-editing/lucide-icon-wraps.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { CANVAS_COMMAND_IDS } from "./use-active-mode.js";
import { Trash2 } from "../media-editing/package.jsx";
import {
  CANVAS_EMOJI_STICKERS,
  CANVAS_STICKER_PICKER_ASSETS,
} from "../media-editing/canvas-sticker-assets.jsx";

export function CanvasCommandPanelContent({
  activeCommand,
  stickerCount,
  allStickersHidden,
  emojiPickerOpen,
  stickerAssetId,
  stickerEmoji,
  onToggleStickerVisibility,
  onClearStickers,
  onEmojiPickerOpenChange,
  onStickerAssetChange,
  onStickerEmojiChange,
}) {
  const { t: translate } = useTranslation();
  if (!activeCommand) return null;
  if (activeCommand === CANVAS_COMMAND_IDS.comments) {
    return (
      <p className="text-[11px] leading-5 text-[var(--canvas-controls-text-muted)]">
        {translate("canvas.toolbar.commentsHint")}
      </p>
    );
  }
  if (activeCommand === CANVAS_COMMAND_IDS.sticker) {
    const stickerOptionClass = (active) =>
      `flex h-10 min-w-0 items-center justify-center rounded-md border p-1 transition-colors [border-width:var(--divider-width)] ${active ? "border-[var(--canvas-controls-text)] bg-transparent text-[var(--canvas-controls-text)]" : "border-transparent text-[var(--canvas-controls-text-muted)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"}`;
    const stickerSummaryRow = (
      <div className="flex items-center gap-1 text-[10px] text-[var(--canvas-controls-text-muted)]">
        <span className="shrink-0 px-1">
          {translate("canvas.toolbar.stickerCount", {
            count: stickerCount,
          })}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="flex h-7 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-[var(--canvas-controls-border)] px-2 text-[10px] text-[var(--canvas-controls-text-muted)] transition-colors [border-width:var(--divider-width)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)] disabled:cursor-default disabled:opacity-40"
            onClick={onToggleStickerVisibility}
            disabled={stickerCount === 0}
            aria-label={
              allStickersHidden
                ? translate("canvas.toolbar.showStickers")
                : translate("canvas.toolbar.hideStickers")
            }
          >
            {allStickersHidden ? (
              <EyeOff size={12} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Eye size={12} strokeWidth={1.5} aria-hidden="true" />
            )}
            {allStickersHidden
              ? translate("canvas.toolbar.showStickers")
              : translate("canvas.toolbar.hideStickers")}
          </button>
          <button
            type="button"
            className="flex h-7 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-[var(--canvas-controls-border)] px-2 text-[10px] text-[var(--canvas-controls-text-muted)] transition-colors [border-width:var(--divider-width)] hover:border-destructive hover:bg-destructive/10 hover:text-destructive disabled:cursor-default disabled:opacity-40"
            onClick={onClearStickers}
            disabled={stickerCount === 0}
            aria-label={translate("canvas.toolbar.clearStickers", "Clear")}
          >
            <Trash2 size={12} strokeWidth={1.5} aria-hidden="true" />
            {translate("canvas.toolbar.clearStickers", "Clear")}
          </button>
        </div>
      </div>
    );
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1 pt-2">
          {CANVAS_STICKER_PICKER_ASSETS.map((asset) => (
            <button
              key={asset.id}
              type="button"
              data-action-ui-id={`canvas.sticker-picker-${asset.id}`}
              className={`${stickerOptionClass(stickerAssetId === asset.id)} flex-1`}
              aria-label={translate(asset.labelKey)}
              aria-pressed={stickerAssetId === asset.id}
              title={translate(asset.labelKey)}
              onClick={() => {
                onStickerAssetChange(asset.id);
              }}
            >
              <img
                src={asset.src}
                alt=""
                draggable={false}
                className="size-6 object-contain"
              />
            </button>
          ))}
          <button
            type="button"
            data-action-ui-id="canvas.sticker-picker-more"
            className={`${stickerOptionClass(false)} flex-1`}
            aria-expanded={emojiPickerOpen}
            aria-label={
              emojiPickerOpen
                ? translate("canvas.sticker.collapse", "收起贴纸")
                : translate("canvas.sticker.expand", "展开更多贴纸")
            }
            title={
              emojiPickerOpen
                ? translate("canvas.sticker.collapse", "收起贴纸")
                : translate("canvas.sticker.expand", "展开更多贴纸")
            }
            onClick={() => onEmojiPickerOpenChange(!emojiPickerOpen)}
          >
            {emojiPickerOpen ? (
              <ChevronUp size={16} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
        </div>
        {emojiPickerOpen && (
          <div className="flex items-center gap-1 pt-2 opacity-100">
            {CANVAS_EMOJI_STICKERS.map((emoji, index) => (
              <button
                key={emoji}
                type="button"
                data-action-ui-id={`canvas.sticker-picker-emoji-${index}`}
                className={`${stickerOptionClass(!stickerAssetId && stickerEmoji === emoji)} flex-1 opacity-100`}
                aria-label={emoji}
                aria-pressed={!stickerAssetId && stickerEmoji === emoji}
                onClick={() => {
                  onStickerAssetChange("");
                  onStickerEmojiChange(emoji);
                }}
              >
                <span
                  className="text-xl leading-none text-[var(--canvas-controls-text)]"
                  aria-hidden="true"
                >
                  {emoji}
                </span>
              </button>
            ))}
          </div>
        )}
        {stickerSummaryRow}
      </div>
    );
  }
  if (activeCommand === CANVAS_COMMAND_IDS.assets) {
    return (
      <p className="text-[11px] leading-5 text-[var(--canvas-controls-text-muted)]">
        {translate("canvas.toolbar.assetsHint")}
      </p>
    );
  }
  return null;
}
