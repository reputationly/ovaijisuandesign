// ==== 逐文件收敛 ====
import { DropdownMenu as DropdownMenu$3, DropdownMenuContent as DropdownMenuContent$3, DropdownMenuItem as DropdownMenuItem$3, DropdownMenuTrigger as DropdownMenuTrigger$3 } from "../canvas-v3/main-exports.js";
import jsxRuntimeExports from "react/jsx-runtime";
import { MenuPopup, MenuPortal as MenuPortal$1, MenuPositioner, MenuRoot, MenuSubmenuRoot, MenuSubmenuTrigger, MenuTrigger } from "../infra/base-ui.js";
import { cn as cn$5 } from "../infra/dialog-content.jsx";
import { ActionListItem, ActionListPanel, ActionListSeparator } from "../media-editing/action-list.jsx";
import { LightboxActionButton } from "../media-editing/use-warn-missing-asset-meta.jsx";
import { lightboxActionButtonClassName } from "../text-editor/instrumental-param-values.jsx";
import { MenuItem as MenuItem$4 } from "../text-editor/table-ops.jsx";
import { Archive, ChevronDown as ChevronDown$3, Download as Download$2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { __jsx } from "../shared/jsx-runtime.js";
import { MENU_ITEM_CLASS } from "../text-editor/menu-item-class.jsx";
export function DropdownMenu({
  ...props
}) {
  return <MenuRoot data-slot="dropdown-menu" {...props} />;
}
export function DropdownMenuTrigger({
  className,
  ...props
}) {
  return <MenuTrigger data-slot="dropdown-menu-trigger" className={cn$5("select-none outline-none", className)} {...props} />;
}
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
  return <MenuPortal$1>
      <MenuPositioner className={cn$5("isolate z-50 outline-none", positionerClassName)} align={align} alignOffset={alignOffset} side={side} sideOffset={sideOffset}>
        <MenuPopup data-slot="dropdown-menu-content" className={cn$5("z-50 flex max-h-(--available-height) min-w-32 origin-(--transform-origin) flex-col overflow-x-hidden overflow-y-auto rounded-lg p-1 outline-none dp-motion-quick-zoom", variant === "toolbar" && "canvas-toolbar-menu", className)} style={variant === "toolbar" ? void 0 : {
        background: "var(--canvas-controls-bg)",
        color: "var(--canvas-controls-text)",
        boxShadow: "var(--canvas-shadow-dropdown)"
      }} {...props} />
      </MenuPositioner>
    </MenuPortal$1>;
}
export function DropdownMenuItem({
  className,
  ...props
}) {
  return <MenuItem$4 data-slot="dropdown-menu-item" className={cn$5(MENU_ITEM_CLASS, className)} {...props} />;
}
export function DropdownMenuSub({
  ...props
}) {
  return <MenuSubmenuRoot {...props} />;
}
export function DropdownMenuSubTrigger({
  className,
  ...props
}) {
  return <MenuSubmenuTrigger data-slot="dropdown-menu-sub-trigger" className={cn$5("list-row-hit-area relative flex cursor-default items-center gap-2.5 rounded-sm px-3 py-2 text-[12px] outline-hidden select-none transition-colors duration-[80ms] hover:bg-[var(--canvas-controls-hover)] focus:bg-[var(--canvas-controls-hover)] data-popup-open:bg-[var(--canvas-controls-hover)] data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0", className)} {...props} />;
}
export function LightboxDownloadAction({
  dataActionUiId,
  onDownload,
  onDownloadAll,
  disabled = false,
  downloadCount = 1,
  downloadNames = []
}) {
  const {
    t: t2
  } = useTranslation();
  const hasBatch = downloadCount > 1 && Boolean(onDownloadAll);
  const names = new Map();
  for (const name2 of downloadNames) {
    if (name2) names.set(name2, (names.get(name2) ?? 0) + 1);
  }
  return <div className="pointer-events-auto inline-flex min-w-[8.5rem] shrink-0">
      <LightboxActionButton label={t2("canvas.lightbox.downloadCurrent")} icon={Download$2} dataActionUiId={dataActionUiId} className={hasBatch ? "min-w-0 flex-1 rounded-r-none" : void 0} disabled={disabled} onClick={onDownload} />
      {hasBatch && <DropdownMenu$3>
          <DropdownMenuTrigger$3 openOnHover={true} delay={100} closeDelay={150} aria-label={t2("canvas.lightbox.downloadOptions")} title={t2("canvas.lightbox.downloadOptions")} data-action-ui-id={`${dataActionUiId}-options`} className={cn$5(lightboxActionButtonClassName, "w-8 min-w-0 rounded-l-none border-l-0 px-0")} onClick={event => event.stopPropagation()}>
            <ChevronDown$3 size={14} strokeWidth={1.25} aria-hidden={true} />
          </DropdownMenuTrigger$3>
          <ActionListPanel className="canvas-lightbox-action-menu w-max max-w-[80vw]" render={<DropdownMenuContent$3 variant="toolbar" side="top" align="end" sideOffset={8} positionerClassName="z-[10000]" onKeyDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()} />}>
            <ActionListItem render={<DropdownMenuItem$3 />} data-action-ui-id={`${dataActionUiId}-all`} onClick={onDownloadAll}>
              <Archive size={16} strokeWidth={1.5} aria-hidden={true} />
              <span>
                {t2("canvas.lightbox.downloadAllCount", {
              count: downloadCount
            })}
              </span>
            </ActionListItem>
            {names.size > 0 && <>
                <ActionListSeparator />
                <div className="max-h-40 max-w-64 overflow-y-auto px-2 py-1 text-xs leading-5 text-[var(--canvas-lightbox-foreground)]/70">
                  {Array.from(names, ([name2, count2]) => <div key={name2} title={name2} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate">{name2}</span>
                      {count2 > 1 && <span className="shrink-0 tabular-nums">×{count2}</span>}
                    </div>)}
                </div>
              </>}
          </ActionListPanel>
        </DropdownMenu$3>}
    </div>;
}