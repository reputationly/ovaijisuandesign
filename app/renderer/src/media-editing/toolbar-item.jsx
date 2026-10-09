// toolbar-item.jsx
import {
  ActionListItem,
  ActionListPanel,
  ActionListSeparator,
  CompositedSvg,
  jsxRuntimeExports,
  NodeToolbar$1,
  Position,
  reactExports,
  useStore$3 as useStore,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSubTrigger,
  ToolbarSurface,
} from "./audio-lightbox.jsx";
import {
  DropdownMenu,
  DropdownMenuSub,
  DropdownMenuTrigger,
} from "./use-warn-missing-asset-meta.jsx";
import { Tooltip } from "../generation/missing-asset-card.jsx";
import { DropdownArrowIcon } from "../canvas/generating-media-area.jsx";
import { TooltipProvider } from "../infra/create-recently-added-store.js";
import {
  useCanvasIsBoxSelecting,
  useCanvasIsDragging,
  useCanvasIsMultiSelect,
} from "./package.jsx";
const HEADER_FLOW_HEIGHT = 28;
const TOOLBAR_GAP = 12;
const zoomSelector = (s2) => s2.transform[2];
const TOOLBAR_ANIM_MS = 150;
function useDelayedUnmount(visible, hidden) {
  const [shouldRender, setShouldRender] = reactExports.useState(
    visible && !hidden,
  );
  const [state2, setState] = reactExports.useState(
    visible ? "entering" : "exiting",
  );
  const timeoutRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (hidden) {
      setShouldRender(false);
      setState("exiting");
    } else if (visible) {
      setShouldRender(true);
      setState("entering");
    } else {
      setState("exiting");
      timeoutRef.current = setTimeout(() => {
        setShouldRender(false);
        timeoutRef.current = null;
      }, TOOLBAR_ANIM_MS);
    }
    return () => {
      if (timeoutRef.current != null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [visible, hidden]);
  return {
    shouldRender,
    state: state2,
  };
}
function NewFeatureDot() {
  return (
    <span
      aria-hidden="true"
      className="relative -top-2 -ml-px inline-block size-[6px] shrink-0 rounded-full bg-[var(--canvas-toolbar-new-feature)]"
    />
  );
}
function SubmenuChevron() {
  return (
    <CompositedSvg
      width="8"
      height="10"
      viewBox="0 0 8 10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 1L6 5L2 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
function DropdownEntry({ child, isActive: isActive2 }) {
  if (child.renderSubmenu) {
    return (
      <DropdownMenuSub>
        <ActionListItem
          render={<DropdownMenuSubTrigger />}
          disabled={child.disabled}
          onClick={() => {
            if (!child.disabled) child.onSelect();
          }}
          className="canvas-toolbar-menu-item"
          data-action-ui-id={`canvas.toolbar-menu-${child.id}`}
        >
          {child.icon && (
            <span className="canvas-toolbar-action-list-icon">
              <span>{child.icon}</span>
            </span>
          )}
          <span className="whitespace-nowrap">{child.label}</span>
          {child.showNewFeatureDot ? <NewFeatureDot /> : null}
          <span className="ml-auto pl-3 opacity-60">
            <SubmenuChevron />
          </span>
        </ActionListItem>
        <ActionListPanel
          className="w-max"
          render={
            <DropdownMenuContent
              variant="toolbar"
              className="data-open:zoom-in-100 data-closed:zoom-out-100"
              side="right"
              sideOffset={8}
              align="start"
            />
          }
        >
          {child.renderSubmenu()}
        </ActionListPanel>
      </DropdownMenuSub>
    );
  }
  return (
    <Tooltip content={child.tooltipLabel} side="right" sideOffset={8}>
      <ActionListItem
        render={<DropdownMenuItem />}
        disabled={child.disabled}
        onClick={() => {
          if (!child.disabled) child.onSelect();
        }}
        className="canvas-toolbar-menu-item"
        data-action-ui-id={`canvas.toolbar-menu-${child.id}`}
        data-active={isActive2 || void 0}
      >
        {child.icon && (
          <span className="canvas-toolbar-action-list-icon">
            <span>{child.icon}</span>
          </span>
        )}
        <span className="whitespace-nowrap">{child.label}</span>
        {child.showNewFeatureDot ? <NewFeatureDot /> : null}
        {child.trailing && (
          <span className="ml-auto flex w-12 shrink-0 items-center pl-3 text-muted-foreground">
            {child.trailing}
          </span>
        )}
      </ActionListItem>
    </Tooltip>
  );
}
function DropdownChildSlot({ child, isActive: isActive2, showSeparator }) {
  return (
    <>
      {showSeparator && <ActionListSeparator />}
      <DropdownEntry child={child} isActive={isActive2} />
    </>
  );
}
function ToolbarItem({ item, showSeparator }) {
  const hasDropdown = !!item.dropdownItems;
  const hasMainAction = hasDropdown && !!item.onClick;
  const iconOnlyDropdown = hasDropdown && item.hideDropdownArrow;
  const showLabel =
    !!item.label &&
    (!item.icon || (hasDropdown && !iconOnlyDropdown) || item.forceLabel);
  const [open, setOpen] = reactExports.useState(false);
  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);
    if (nextOpen) item.onDropdownOpen?.();
  };
  const labelEl = showLabel ? (
    <span className="canvas-toolbar-label whitespace-nowrap">{item.label}</span>
  ) : null;
  const newFeatureDot = item.showNewFeatureDot ? <NewFeatureDot /> : null;
  const trailingEl = null;
  const tooltipContent = item.tooltipLabel ? (
    item.tooltipLabel
  ) : item.trailing ? (
    <span className="inline-flex items-center gap-1.5">
      {item.label}
      {item.trailing}
    </span>
  ) : showLabel ? (
    void 0
  ) : (
    item.label
  );
  const separator = showSeparator ? (
    <div className="canvas-toolbar-separator" aria-hidden="true" />
  ) : null;
  if (item.render) {
    return (
      <>
        {separator}
        {item.render()}
      </>
    );
  }
  if (hasMainAction) {
    return (
      <>
        {separator}
        <div className="canvas-toolbar-split">
          <button
            type="button"
            disabled={item.disabled}
            onClick={item.onClick}
            className="canvas-toolbar-action"
            data-content={!showLabel ? "icon" : void 0}
          >
            {item.icon}
            {labelEl}
            {newFeatureDot}
            {trailingEl}
          </button>
          <DropdownMenu open={open} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger
              disabled={item.disabled}
              className="canvas-toolbar-action canvas-toolbar-disclosure"
              openOnHover={true}
              delay={100}
              closeDelay={150}
            >
              <DropdownArrowIcon />
            </DropdownMenuTrigger>
            <ActionListPanel
              className="w-max"
              render={
                <DropdownMenuContent
                  variant="toolbar"
                  className="data-open:zoom-in-100 data-closed:zoom-out-100"
                  side="bottom"
                  sideOffset={8}
                  align="center"
                />
              }
            >
              {item.dropdownItems?.map((child, idx) => (
                <DropdownChildSlot
                  key={child.id}
                  child={child}
                  isActive={item.activeChildId === child.id}
                  showSeparator={!!child.separator && idx > 0}
                />
              ))}
            </ActionListPanel>
          </DropdownMenu>
        </div>
      </>
    );
  }
  if (hasDropdown) {
    return (
      <>
        {separator}
        <DropdownMenu open={open} onOpenChange={handleOpenChange}>
          <Tooltip content={tooltipContent}>
            <DropdownMenuTrigger
              disabled={item.disabled}
              className="canvas-toolbar-action"
              data-action-ui-id={`canvas.toolbar-dropdown-${item.id}`}
              data-content={!showLabel ? "icon" : void 0}
            >
              {item.icon}
              {labelEl}
              {newFeatureDot}
              {trailingEl}
              {item.hideDropdownArrow ? null : <DropdownArrowIcon />}
            </DropdownMenuTrigger>
          </Tooltip>
          <ActionListPanel
            className="w-max"
            render={
              <DropdownMenuContent
                variant="toolbar"
                className="data-open:zoom-in-100 data-closed:zoom-out-100"
                side="bottom"
                sideOffset={8}
                align="center"
              />
            }
          >
            {item.dropdownItems?.map((child, idx) => (
              <DropdownChildSlot
                key={child.id}
                child={child}
                isActive={item.activeChildId === child.id}
                showSeparator={!!child.separator && idx > 0}
              />
            ))}
          </ActionListPanel>
        </DropdownMenu>
      </>
    );
  }
  return (
    <>
      {separator}
      <Tooltip content={tooltipContent}>
        <button
          type="button"
          aria-disabled={item.disabled || void 0}
          aria-label={
            !showLabel && typeof item.label === "string" ? item.label : void 0
          }
          onClick={item.disabled ? void 0 : item.onClick}
          className="canvas-toolbar-action"
          data-content={!showLabel ? "icon" : void 0}
          data-action-ui-id={item.dataActionUiId}
          data-active={item.active || void 0}
        >
          {item.icon}
          {labelEl}
          {newFeatureDot}
          {trailingEl}
        </button>
      </Tooltip>
    </>
  );
}
function NodeToolbarPalette({
  items,
  state: state2 = "entering",
  density = "standard",
}) {
  if (items.length === 0) return null;
  const animation =
    state2 === "entering"
      ? `toolbar-fade-in ${TOOLBAR_ANIM_MS}ms ease-out`
      : `toolbar-fade-out ${TOOLBAR_ANIM_MS}ms ease-in forwards`;
  return (
    <TooltipProvider delay={80} closeDelay={0}>
      <ToolbarSurface
        density={density}
        className="pointer-events-auto relative z-[1] nopan nodrag nokey"
        style={{
          animation,
        }}
        data-canvas-chrome="true"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {items.map((item, i2) => (
          <ToolbarItem
            key={item.id}
            item={item}
            showSeparator={item.separator && i2 > 0}
          />
        ))}
      </ToolbarSurface>
    </TooltipProvider>
  );
}
function NodeToolbarInner({ items, visible, renderShell, density }) {
  const zoom2 = useStore(zoomSelector);
  const isDragging = useCanvasIsDragging();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const hidden = isDragging || isMultiSelect || isBoxSelecting;
  const { shouldRender, state: state2 } = useDelayedUnmount(visible, hidden);
  if (items.length === 0) return null;
  if (hidden) return null;
  if (!shouldRender) return null;
  const palette = (
    <NodeToolbarPalette items={items} state={state2} density={density} />
  );
  if (renderShell) {
    return <>{renderShell(palette)}</>;
  }
  const offset2 = HEADER_FLOW_HEIGHT * zoom2 + TOOLBAR_GAP;
  return (
    <NodeToolbar$1
      isVisible={true}
      position={Position.Top}
      offset={offset2}
      align="center"
    >
      {palette}
    </NodeToolbar$1>
  );
}
export const NodeToolbar = reactExports.memo(NodeToolbarInner);
