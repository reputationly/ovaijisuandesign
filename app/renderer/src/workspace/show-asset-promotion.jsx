import jsxRuntimeExports from "react/jsx-runtime";
import { DropdownArrowIcon } from "../canvas/generating-media-area.jsx";
import { Tooltip as Tooltip$2 } from "../generation/missing-asset-card.jsx";
import { TooltipProvider$2 } from "../infra/base-ui.js";
import { cn as cn$5 } from "../infra/dialog-content.jsx";
import { ActionListItem, ActionListPanel, ActionListSeparator } from "../media-editing/action-list.jsx";
import { CompositedSvg } from "../media-editing/icon-compositing.js";
import { DropdownMenu as DropdownMenu$3, DropdownMenuContent as DropdownMenuContent$3, DropdownMenuItem as DropdownMenuItem$3, DropdownMenuSub as DropdownMenuSub$1, DropdownMenuSubTrigger as DropdownMenuSubTrigger$3, DropdownMenuTrigger as DropdownMenuTrigger$3 } from "./dropdown-menu.jsx";
import { default as reactExports } from "react";
import { __jsx } from "../shared/jsx-runtime.js";
export const SHOW_ASSET_PROMOTION = false;
export function isCanvasToolbarActionVisible(id2) {
  return id2 !== "promote-to-asset" || SHOW_ASSET_PROMOTION;
}
export function filterVisibleCanvasToolbarItems(items) {
  let pendingSeparator = false;
  return items.flatMap(item => {
    pendingSeparator ||= !!item.separator;
    if (!isCanvasToolbarActionVisible(item.id)) return [];
    const visibleItem = pendingSeparator && !item.separator ? {
      ...item,
      separator: true
    } : item;
    pendingSeparator = false;
    return [visibleItem];
  });
}
export function ToolbarSurface({
  density = "standard",
  className,
  ...props
}) {
  return <div {...props} data-canvas-toolbar="true" data-density={density} className={cn$5("canvas-toolbar-surface", className)} />;
}
export const TOOLBAR_ANIM_MS = 150;
export function NodeToolbarPalette({
  items,
  state: state2 = "entering",
  density = "standard"
}) {
  const visibleItems = filterVisibleCanvasToolbarItems(items);
  if (visibleItems.length === 0) return null;
  const animation = state2 === "entering" ? `toolbar-fade-in ${TOOLBAR_ANIM_MS}ms ease-out` : `toolbar-fade-out ${TOOLBAR_ANIM_MS}ms ease-in forwards`;
  return <TooltipProvider$2 delay={80} closeDelay={0}>
      <ToolbarSurface density={density} className="pointer-events-auto relative z-[1] nopan nodrag nokey" style={{
      animation
    }} data-canvas-chrome="true" onPointerDown={event => event.stopPropagation()}>
        {visibleItems.map((item, i2) => <ToolbarItem key={item.id} item={item} showSeparator={item.separator && i2 > 0} />)}
      </ToolbarSurface>
    </TooltipProvider$2>;
}
export function ToolbarItem({
  item,
  showSeparator
}) {
  const hasDropdown = !!item.dropdownItems;
  const hasMainAction = hasDropdown && !!item.onClick;
  const iconOnlyDropdown = hasDropdown && item.hideDropdownArrow;
  const showLabel = !!item.label && (!item.icon || hasDropdown && !iconOnlyDropdown || item.forceLabel);
  const [open, setOpen] = reactExports.useState(false);
  const handleOpenChange = nextOpen => {
    setOpen(nextOpen);
    if (nextOpen) item.onDropdownOpen?.();
  };
  const labelEl = showLabel ? <span className="canvas-toolbar-label whitespace-nowrap">{item.label}</span> : null;
  const newFeatureDot = item.showNewFeatureDot ? <NewFeatureDot /> : null;
  const trailingEl = null;
  const tooltipContent = item.tooltipLabel ? item.tooltipLabel : item.trailing ? <span className="inline-flex items-center gap-1.5">
      {item.label}
      {item.trailing}
    </span> : showLabel ? void 0 : item.label;
  const separator = showSeparator ? <div className="canvas-toolbar-separator" aria-hidden="true" /> : null;
  if (item.render) {
    return <>
        {separator}
        {item.render()}
      </>;
  }
  if (hasMainAction) {
    return <>
        {separator}
        <div className="canvas-toolbar-split">
          <button type="button" disabled={item.disabled} onClick={item.onClick} className="canvas-toolbar-action" data-content={!showLabel ? "icon" : void 0} data-active={item.active || void 0}>
            {item.icon}
            {labelEl}
            {newFeatureDot}
            {trailingEl}
          </button>
          <DropdownMenu$3 open={open} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger$3 disabled={item.disabled} className="canvas-toolbar-action canvas-toolbar-disclosure" openOnHover={true} delay={100} closeDelay={150}>
              <DropdownArrowIcon />
            </DropdownMenuTrigger$3>
            <ActionListPanel className="w-max" render={<DropdownMenuContent$3 variant="toolbar" className="data-open:zoom-in-100 data-closed:zoom-out-100" side="bottom" sideOffset={8} align="center" />}>
              {item.dropdownItems?.map((child, idx) => <DropdownChildSlot key={child.id} child={child} isActive={item.activeChildId === child.id} showSeparator={!!child.separator && idx > 0} />)}
            </ActionListPanel>
          </DropdownMenu$3>
        </div>
      </>;
  }
  if (hasDropdown) {
    return <>
        {separator}
        <DropdownMenu$3 open={open} onOpenChange={handleOpenChange}>
          <Tooltip$2 content={tooltipContent}>
            <DropdownMenuTrigger$3 disabled={item.disabled} className="canvas-toolbar-action" data-action-ui-id={`canvas.toolbar-dropdown-${item.id}`} data-content={!showLabel ? "icon" : void 0} data-active={item.active || void 0}>
              {item.icon}
              {labelEl}
              {newFeatureDot}
              {trailingEl}
              {item.hideDropdownArrow ? null : <DropdownArrowIcon />}
            </DropdownMenuTrigger$3>
          </Tooltip$2>
          <ActionListPanel className="w-max" render={<DropdownMenuContent$3 variant="toolbar" className="data-open:zoom-in-100 data-closed:zoom-out-100" side="bottom" sideOffset={8} align="center" />}>
            {item.dropdownItems?.map((child, idx) => <DropdownChildSlot key={child.id} child={child} isActive={item.activeChildId === child.id} showSeparator={!!child.separator && idx > 0} />)}
          </ActionListPanel>
        </DropdownMenu$3>
      </>;
  }
  return <>
      {separator}
      <Tooltip$2 content={tooltipContent}>
        <button type="button" aria-disabled={item.disabled || void 0} aria-label={!showLabel && typeof item.label === "string" ? item.label : void 0} onClick={item.disabled ? void 0 : item.onClick} className="canvas-toolbar-action" data-content={!showLabel ? "icon" : void 0} data-active={item.active || void 0} data-action-ui-id={item.dataActionUiId ?? `canvas.image-tool.${item.id}`}>
          {item.icon}
          {labelEl}
          {newFeatureDot}
          {trailingEl}
        </button>
      </Tooltip$2>
    </>;
}
export function DropdownEntry({
  child,
  isActive: isActive2
}) {
  if (child.renderSubmenu) {
    return <DropdownMenuSub$1>
        <ActionListItem render={<DropdownMenuSubTrigger$3 />} data-action-ui-id={`canvas.image-tool.${child.id}`} disabled={child.disabled} onClick={() => {
        if (!child.disabled) child.onSelect?.();
      }} className="canvas-toolbar-menu-item">
          {child.icon && <span className="canvas-toolbar-action-list-icon">
              <span>{child.icon}</span>
            </span>}
          <span className="whitespace-nowrap">{child.label}</span>
          {child.showNewFeatureDot ? <NewFeatureDot /> : null}
          <span className="ml-auto pl-3 opacity-60">
            <SubmenuChevron />
          </span>
        </ActionListItem>
        <ActionListPanel className="w-max" render={<DropdownMenuContent$3 variant="toolbar" className="data-open:zoom-in-100 data-closed:zoom-out-100" side="right" sideOffset={8} align="start" />}>
          {child.renderSubmenu()}
        </ActionListPanel>
      </DropdownMenuSub$1>;
  }
  return <Tooltip$2 content={child.tooltipLabel} side="right" sideOffset={8}>
      <ActionListItem render={<DropdownMenuItem$3 />} data-action-ui-id={`canvas.image-tool.${child.id}`} disabled={child.disabled} onClick={() => {
      if (!child.disabled) child.onSelect?.();
    }} className="canvas-toolbar-menu-item" data-active={isActive2 || void 0}>
        {child.icon && <span className="canvas-toolbar-action-list-icon">
            <span>{child.icon}</span>
          </span>}
        <span className="whitespace-nowrap">{child.label}</span>
        {child.showNewFeatureDot ? <NewFeatureDot /> : null}
        {child.trailing && <span className="ml-auto flex w-12 shrink-0 items-center pl-3 text-muted-foreground">{child.trailing}</span>}
      </ActionListItem>
    </Tooltip$2>;
}
export function NewFeatureDot() {
  return <span aria-hidden="true" className="relative -top-2 -ml-px inline-block size-[6px] shrink-0 rounded-full bg-brand-accent" />;
}
export function SubmenuChevron() {
  return <CompositedSvg width="8" height="10" viewBox="0 0 8 10" fill="none" aria-hidden="true">
      <path d="M2 1L6 5L2 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </CompositedSvg>;
}
export function DropdownChildSlot({
  child,
  isActive: isActive2,
  showSeparator
}) {
  return <>
      {showSeparator && <ActionListSeparator />}
      <DropdownEntry child={child} isActive={isActive2} />
    </>;
}