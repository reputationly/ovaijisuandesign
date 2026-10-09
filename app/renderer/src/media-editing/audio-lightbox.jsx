// audio-lightbox.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { cn } from "../infra/dialog-content.jsx";
import {
  MenuItem$3 as MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuSubmenuTrigger,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { Download } from "./package.jsx";
import { normalizeLegacyLightboxItems } from "./use-warn-missing-asset-meta.jsx";
import { useLightboxMediaActions } from "./use-lightbox-media-actions.jsx";
import { MediaLightbox } from "./media-lightbox.jsx";
function LightboxDownloadButton({ label, dataActionUiId, onClick, className }) {
  return (
    <button
      type="button"
      data-action-ui-id={dataActionUiId}
      aria-label={label}
      title={label}
      className={cn(
        "pointer-events-auto flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white/80 transition-[background-color,color,transform] duration-150 hover:bg-black/70 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60",
        className,
      )}
      onClick={onClick}
    >
      <Download size={14} strokeWidth={1} aria-hidden={true} />
    </button>
  );
}
export const AudioLightbox = reactExports.memo(function AudioLightbox2({
  src,
  name: name2,
  lyrics,
  onClose,
  item,
}) {
  const { t: t2 } = useTranslation();
  const current2 =
    item ??
    normalizeLegacyLightboxItems("audio", void 0, void 0, void 0, src)[0];
  const downloadLabel = t2("canvas.downloadAudio");
  const { canSave, handleDownload, handleContextMenu, contextMenu } =
    useLightboxMediaActions({
      item: current2,
    });
  if (!current2?.url) return null;
  return (
    <MediaLightbox onClose={onClose} onContextMenu={handleContextMenu}>
      <div
        className="flex flex-col items-center gap-4 cursor-default"
        onClick={(e2) => e2.stopPropagation()}
      >
        {name2 && (
          <span className="text-sm font-medium text-white/80 max-w-[60vw] truncate">
            {name2}
          </span>
        )}
        {lyrics && (
          <div className="w-[min(480px,80vw)] max-h-[50vh] overflow-y-auto rounded-md border border-white/10 bg-white/5 px-4 py-3">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-white/85">
              {lyrics}
            </pre>
          </div>
        )}
        <audio
          src={current2.url}
          className="w-[min(480px,80vw)]"
          controls={true}
          autoPlay={true}
        />
      </div>
      {contextMenu}
      {canSave && (
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 pointer-events-auto">
          <LightboxDownloadButton
            label={downloadLabel}
            dataActionUiId="canvas.audio-lightbox.download"
            onClick={handleDownload}
          />
        </div>
      )}
    </MediaLightbox>
  );
});
export function DropdownMenuContent({
  className,
  positionerClassName,
  variant,
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  ...props
}) {
  return (
    <MenuPortal>
      <MenuPositioner
        className={cn("isolate z-50 outline-none", positionerClassName)}
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPopup
          data-slot="dropdown-menu-content"
          className={cn(
            "z-50 flex max-h-(--available-height) min-w-32 origin-(--transform-origin) flex-col overflow-x-hidden overflow-y-auto rounded-lg p-1 outline-none dp-motion-quick-zoom",
            variant === "toolbar" && "canvas-toolbar-menu",
            className,
          )}
          style={
            variant === "toolbar"
              ? void 0
              : {
                  background: "var(--canvas-controls-bg)",
                  color: "var(--canvas-controls-text)",
                  boxShadow: "var(--canvas-shadow-dropdown)",
                }
          }
          {...props}
        />
      </MenuPositioner>
    </MenuPortal>
  );
}
export function DropdownMenuItem({ className, ...props }) {
  return (
    <MenuItem
      data-slot="dropdown-menu-item"
      className={cn(
        "list-row-hit-area relative flex cursor-default items-center gap-2.5 rounded-sm px-3 py-2 text-[12px] outline-hidden select-none transition-colors duration-[80ms] hover:bg-[var(--canvas-controls-hover)] focus:bg-[var(--canvas-controls-hover)] data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}
export function DropdownMenuSeparator({ className, ...props }) {
  return (
    <hr
      data-slot="dropdown-menu-separator"
      className={cn("mx-1 my-1 h-px border-none", className)}
      style={{
        background:
          "var(--canvas-divider-subtle, var(--canvas-controls-border))",
      }}
      {...props}
    />
  );
}
export function DropdownMenuSubTrigger({ className, ...props }) {
  return (
    <MenuSubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={cn(
        "list-row-hit-area relative flex cursor-default items-center gap-2.5 rounded-sm px-3 py-2 text-[12px] outline-hidden select-none transition-colors duration-[80ms] hover:bg-[var(--canvas-controls-hover)] focus:bg-[var(--canvas-controls-hover)] data-popup-open:bg-[var(--canvas-controls-hover)] data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}
export function ToolbarSurface({ density = "standard", className, ...props }) {
  return (
    <div
      {...props}
      data-canvas-toolbar="true"
      data-density={density}
      className={cn("canvas-toolbar-surface", className)}
    />
  );
}
export function buildPlaceholderFillData(existingData, staged) {
  return staged
    ? {
        ...existingData,
      }
    : {};
}
