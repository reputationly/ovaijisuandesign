// empty-viewport-toast.jsx
import { useTranslation, useReactFlow, reactExports, Panel, useStoreApi, MonochromeIcon, X$7, Position } from "../vendor.js";
import { syncStableZoomSignals } from "./canvas-surface-recovery-scheduler.jsx";
import { TooltipProvider$1 } from "../infra/create-recently-added-store.jsx";
import { useActiveMode, CANVAS_COMMAND_IDS } from "./node-tag-rings-canvas.jsx";
import { useCanvasActive, useCanvasIsDragging } from "../media-editing/parse-item.jsx";
import { Button$2 } from "./use-media-node-actions.jsx";
import { Tooltip$1 } from "../generation/create-tracker.jsx";
import { ReferenceNavigationContext } from "../media-editing/decode-worker-pool.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { QuickZoomPresence } from "./canvas-toggle-icon.jsx";
import {
  CANVAS_TOOL_DOCK_CONTROL_SIZE_PX,
  CANVAS_TOOL_DOCK_HEIGHT_PX,
  CANVAS_TOOL_DOCK_ICON_SIZE_PX,
  CANVAS_TOOL_DOCK_SAFE_BOTTOM_PX,
} from "./node-alignment-guides.jsx";
import {
  StickerIcon,
  TOOL_COMMANDS,
  ToolModeSplitButton,
  ToolbarSeparator,
  ToolbarTooltipContent,
  handleCanvasCommandPanelEscape,
} from "./zoom-menu.jsx";
function ToolDockButton({
  definition: definition2,
  icon: Icon2,
  iconSize = CANVAS_TOOL_DOCK_ICON_SIZE_PX,
  iconClassName,
  primary,
  kind = "action",
  pressed,
  expanded,
  controlsId,
  hasPopup,
  buttonRef,
  onClick,
  label,
}) {
  const selected2 =
    (kind === "toggle" && pressed) || (kind === "panel" && expanded) || Boolean(expanded);
  return (
    <Tooltip$1 content={<ToolbarTooltipContent label={label} shortcut={definition2.shortcut} />}>
      <button
        ref={buttonRef}
        type="button"
        data-action-ui-id={definition2.id}
        data-canvas-control-kind={kind}
        aria-label={label}
        aria-keyshortcuts={definition2.ariaKeyshortcuts}
        aria-pressed={kind === "toggle" ? pressed : void 0}
        aria-expanded={kind === "action" ? void 0 : expanded}
        aria-controls={kind === "action" ? void 0 : controlsId}
        aria-haspopup={kind === "action" ? void 0 : hasPopup}
        onClick={onClick}
        style={{
          width: CANVAS_TOOL_DOCK_CONTROL_SIZE_PX,
          height: CANVAS_TOOL_DOCK_CONTROL_SIZE_PX,
        }}
        className={`${primary && !selected2 ? "" : "canvas-monochrome-control"} flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring ${selected2 ? "bg-[var(--canvas-controls-active)] text-[var(--canvas-controls-text)]" : primary ? "bg-black text-white hover:opacity-80 dark:bg-white dark:text-black" : "text-[var(--canvas-controls-text-muted)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"}`}
      >
        {primary && !selected2 ? (
          <Icon2 size={iconSize} strokeWidth={1.5} className={iconClassName} aria-hidden="true" />
        ) : (
          <MonochromeIcon tone="control">
            <Icon2 size={iconSize} strokeWidth={1.5} className={iconClassName} aria-hidden="true" />
          </MonochromeIcon>
        )}
      </button>
    </Tooltip$1>
  );
}
export function CanvasToolbar({
  commandRegistry,
  addNodeButtonRef,
  addNodeMenuOpen = false,
  onOpenAddNodeMenu,
  activeCommand,
  interactionMode = "move",
  stickerMode,
  panelContent,
  onClosePanel,
  beforeSticker,
  trailing,
}) {
  const { t: t2 } = useTranslation();
  const activeDefinition = activeCommand ? commandRegistry.get(activeCommand) : null;
  const stickerDefinition = commandRegistry.get(CANVAS_COMMAND_IDS.sticker);
  const stickerLabel = t2("canvas.toolbar.stickers", "Stickers");
  const commandPanelRef = reactExports.useRef(null);
  const stickerTriggerRef = reactExports.useRef(null);
  const commandPanelId = reactExports.useId();
  const stickerPanelId = reactExports.useId();
  const commandPanelOpen = Boolean(activeDefinition && panelContent);
  const stickerPanelOpen = commandPanelOpen && activeCommand === CANVAS_COMMAND_IDS.sticker;
  const renderedPanelId = stickerPanelOpen ? stickerPanelId : commandPanelId;
  const closeCommandPanel = reactExports.useCallback(() => {
    onClosePanel?.();
    if (activeCommand === CANVAS_COMMAND_IDS.sticker) {
      stickerTriggerRef.current?.focus({
        preventScroll: true,
      });
    }
  }, [activeCommand, onClosePanel]);
  reactExports.useEffect(() => {
    if (!commandPanelOpen || !activeCommand) return;
    commandPanelRef.current
      ?.querySelector(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      )
      ?.focus({
        preventScroll: true,
      });
  }, [activeCommand, commandPanelOpen]);
  reactExports.useEffect(() => {
    if (!commandPanelOpen) return;
    const handleKeyDown2 = (event) => {
      handleCanvasCommandPanelEscape(event, {
        isStickerPanel: activeCommand === CANVAS_COMMAND_IDS.sticker,
        stickerMode,
        executeSelect: () => commandRegistry.execute(CANVAS_COMMAND_IDS.select),
        closePanel: closeCommandPanel,
      });
    };
    document.addEventListener("keydown", handleKeyDown2, true);
    return () => document.removeEventListener("keydown", handleKeyDown2, true);
  }, [activeCommand, closeCommandPanel, commandPanelOpen, commandRegistry, stickerMode]);
  return (
    <TooltipProvider$1 delay={150} closeDelay={0}>
      <div className="relative">
        <QuickZoomPresence
          value={
            commandPanelOpen && activeDefinition
              ? {
                  definition: activeDefinition,
                  content: panelContent,
                  id: renderedPanelId,
                }
              : null
          }
          elementRef={commandPanelRef}
        >
          {(panel, motionProps) => (
            <div
              {...motionProps}
              id={panel.id}
              className="dp-motion-quick-zoom absolute bottom-full right-0 mb-2 w-[min(360px,calc(100vw-24px))] rounded-lg border p-3 shadow-[var(--canvas-shadow-menu)]"
              style={{
                transformOrigin: "bottom right",
                background: "var(--canvas-controls-bg)",
                borderColor: "var(--canvas-controls-border)",
                borderWidth: "var(--divider-width)",
              }}
              data-action-ui-id="canvas.command-panel"
              role="dialog"
              aria-label={t2(panel.definition.labelKey)}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-[var(--canvas-controls-text)]">
                  {t2(panel.definition.labelKey)}
                </span>
                <button
                  type="button"
                  className="canvas-monochrome-control flex size-6 items-center justify-center rounded-full text-[var(--canvas-controls-text-muted)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"
                  aria-label={t2("common.close", "Close")}
                  title={t2("common.close", "Close")}
                  data-action-ui-id="canvas.command-panel-close"
                  onClick={closeCommandPanel}
                >
                  <MonochromeIcon tone="control">
                    <X$7 size={14} strokeWidth={1.5} aria-hidden="true" />
                  </MonochromeIcon>
                </button>
              </div>
              {panel.content}
            </div>
          )}
        </QuickZoomPresence>
        <div
          className="flex items-center gap-px rounded-full border p-[5px] shadow-[var(--canvas-shadow-panel)]"
          style={{
            height: CANVAS_TOOL_DOCK_HEIGHT_PX,
            background: "var(--canvas-controls-bg)",
            borderColor: "var(--canvas-controls-border)",
            borderWidth: "var(--divider-width)",
          }}
          data-action-ui-id="canvas.tool-dock"
          role="toolbar"
          aria-label={t2("canvas.toolbar.label")}
        >
          {TOOL_COMMANDS.map(({ id: id2, icon, primary }) => {
            const definition2 = commandRegistry.get(id2);
            const label = t2(definition2.labelKey);
            return (
              <ToolDockButton
                key={id2}
                definition={definition2}
                icon={icon}
                primary={primary}
                buttonRef={addNodeButtonRef}
                iconClassName={`transition-transform duration-200 ease-out motion-reduce:transition-none ${addNodeMenuOpen ? "rotate-45" : "rotate-0"}`}
                label={label}
                onClick={() => {
                  if (id2 === CANVAS_COMMAND_IDS.addNode && onOpenAddNodeMenu) onOpenAddNodeMenu();
                  else commandRegistry.execute(id2);
                }}
              />
            );
          })}
          <ToolbarSeparator large={true} />
          <ToolModeSplitButton
            commandRegistry={commandRegistry}
            mode={interactionMode}
            labels={{
              move: t2("canvas.toolbar.move"),
              hand: t2("canvas.toolbar.handTool"),
            }}
          />
          {beforeSticker && (
            <div
              className="mx-[2px] flex items-center"
              style={{
                height: CANVAS_TOOL_DOCK_CONTROL_SIZE_PX,
              }}
            >
              {beforeSticker}
            </div>
          )}
          <ToolDockButton
            definition={stickerDefinition}
            icon={StickerIcon}
            iconSize={18}
            kind="toggle"
            pressed={stickerMode}
            expanded={stickerPanelOpen}
            controlsId={stickerPanelId}
            hasPopup="dialog"
            buttonRef={stickerTriggerRef}
            label={stickerLabel}
            onClick={() => commandRegistry.execute(CANVAS_COMMAND_IDS.sticker)}
          />
          {trailing && (
            <div
              className="ml-[3px] flex items-center"
              style={{
                height: CANVAS_TOOL_DOCK_CONTROL_SIZE_PX,
              }}
            >
              {trailing}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider$1>
  );
}
const RECENTER_PADDING = 0.5;
const RECENTER_MAX_ZOOM = 0.2;
function isUsableNode(node2) {
  if (node2.hidden) return false;
  const w3 = node2.measured?.width ?? node2.width ?? 0;
  const h2 = node2.measured?.height ?? node2.height ?? 0;
  return w3 > 0 && h2 > 0;
}
function readBox(node2) {
  if (node2.hidden) return null;
  const w3 = node2.measured?.width ?? node2.width ?? 0;
  const h2 = node2.measured?.height ?? node2.height ?? 0;
  if (w3 === 0 || h2 === 0) return null;
  return {
    left: node2.position.x,
    top: node2.position.y,
    right: node2.position.x + w3,
    bottom: node2.position.y + h2,
  };
}
function findLastNodeId(state2) {
  let last2 = null;
  for (const [id2, node2] of state2.nodeLookup) {
    if (isUsableNode(node2)) last2 = id2;
  }
  return last2;
}
function recenterToNodes(args) {
  const id2 = findLastNodeId(args.state);
  if (!id2) return void 0;
  return args.fitView({
    nodes: [
      {
        id: id2,
      },
    ],
    padding: RECENTER_PADDING,
    maxZoom: RECENTER_MAX_ZOOM,
    duration: args.duration ?? 500,
  });
}
function selectIsViewportEmpty(s2) {
  if (s2.nodeLookup.size === 0) return false;
  const [tx, ty, zoom2] = s2.transform;
  if (s2.width === 0 || s2.height === 0 || zoom2 === 0) return false;
  const vpLeft = -tx / zoom2;
  const vpTop = -ty / zoom2;
  const vpRight = (s2.width - tx) / zoom2;
  const vpBottom = (s2.height - ty) / zoom2;
  let consideredCount = 0;
  for (const node2 of s2.nodeLookup.values()) {
    if (node2.dragging) return false;
    const box2 = readBox(node2);
    if (!box2) continue;
    consideredCount += 1;
    if (
      box2.right >= vpLeft &&
      box2.left <= vpRight &&
      box2.bottom >= vpTop &&
      box2.top <= vpBottom
    ) {
      return false;
    }
  }
  return consideredCount > 0;
}
function CanvasBottomToast(props) {
  const { show } = props;
  const [retained, setRetained] = reactExports.useState(show);
  const lastVisibleProps = reactExports.useRef(props);
  if (show) lastVisibleProps.current = props;
  reactExports.useEffect(() => {
    if (show) {
      setRetained(true);
      return;
    }
    const timer2 = setTimeout(() => setRetained(false), 200);
    return () => clearTimeout(timer2);
  }, [show]);
  if (!show && !retained) return null;
  const { message: message2, action, dismiss, dataActionUiId } = lastVisibleProps.current;
  return (
    <Panel
      position="bottom-center"
      className={show ? "!pointer-events-auto" : "!pointer-events-none"}
      style={{
        marginBottom: `var(--canvas-tool-dock-safe-bottom, ${CANVAS_TOOL_DOCK_SAFE_BOTTOM_PX}px)`,
      }}
      data-action-ui-id={dataActionUiId}
    >
      <div
        role="status"
        aria-hidden={!show}
        data-state={show ? "open" : "closed"}
        className="canvas-bottom-toast flex min-h-[calc(2lh+0.75rem+var(--divider-width)*2)] select-none items-center gap-3 rounded-lg border px-3 py-1.5 text-xs"
        style={{
          background: "var(--canvas-controls-bg)",
          borderColor: "var(--canvas-controls-border)",
          borderWidth: "var(--divider-width)",
          boxShadow: "var(--canvas-shadow-dropdown)",
          color: "var(--canvas-controls-text-muted)",
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onAnimationEnd={(event) => {
          if (
            event.target === event.currentTarget &&
            event.animationName === "canvas-bottom-toast-exit" &&
            !show
          )
            setRetained(false);
        }}
      >
        <span className="min-w-0">{message2}</span>
        <Button$2
          size="sm"
          variant={action.variant}
          disabled={!show}
          onClick={action.onClick}
          className="rounded-sm"
          data-action-ui-id={action.dataActionUiId}
        >
          {action.label}
        </Button$2>
        {dismiss && (
          <Button$2
            size="icon-sm"
            variant="ghost"
            disabled={!show}
            aria-label={dismiss.label}
            data-action-ui-id={dismiss.dataActionUiId}
            onClick={dismiss.onClick}
          >
            <X$7 size={16} strokeWidth={1.5} />
          </Button$2>
        )}
      </div>
    </Panel>
  );
}
export function EmptyViewportToast({ duration = 500, quietDelay = 1e3 }) {
  const { t: t2 } = useTranslation();
  const referenceNavigation = reactExports.useContext(ReferenceNavigationContext);
  const { fitView, getViewport } = useReactFlow();
  const storeApi = useStoreApi();
  const active2 = useCanvasActive();
  const isDragging = useCanvasIsDragging();
  const { isAnyActive } = useActiveMode();
  const [shouldShow, setShouldShow] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!active2 || isAnyActive || isDragging) {
      setShouldShow(false);
      return;
    }
    let rafId2 = 0;
    let pendingTimer = null;
    let prevTransform = storeApi.getState().transform;
    const cancelTimer = () => {
      if (pendingTimer !== null) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
    };
    const check = () => {
      rafId2 = 0;
      const state2 = storeApi.getState();
      const next2 = state2.transform;
      const transformChanged =
        next2[0] !== prevTransform[0] ||
        next2[1] !== prevTransform[1] ||
        next2[2] !== prevTransform[2];
      prevTransform = next2;
      const empty2 = selectIsViewportEmpty(state2);
      if (!empty2) {
        cancelTimer();
        setShouldShow(false);
        return;
      }
      if (transformChanged) {
        cancelTimer();
        setShouldShow(false);
        pendingTimer = setTimeout(() => setShouldShow(true), quietDelay);
        return;
      }
      if (pendingTimer === null) {
        pendingTimer = setTimeout(() => setShouldShow(true), quietDelay);
      }
    };
    check();
    const unsubscribe = storeApi.subscribe(() => {
      if (rafId2 !== 0) return;
      rafId2 = requestAnimationFrame(check);
    });
    return () => {
      if (rafId2 !== 0) cancelAnimationFrame(rafId2);
      cancelTimer();
      unsubscribe();
    };
  }, [active2, isAnyActive, isDragging, storeApi, quietDelay]);
  const handleBack = reactExports.useCallback(() => {
    const result = recenterToNodes({
      state: storeApi.getState(),
      fitView,
      duration,
    });
    const sync = () => syncStableZoomSignals(getViewport().zoom);
    if (result) void result.then(sync, sync);
  }, [fitView, getViewport, storeApi, duration]);
  const focused = Boolean(referenceNavigation?.record && !referenceNavigation.record.returning);
  return (
    <CanvasBottomToast
      show={active2 && (focused || shouldShow)}
      message={t2(focused ? "canvas.referenceNavigation.focused" : "canvas.emptyViewport")}
      dataActionUiId={focused ? "canvas.reference-focus-toast" : "canvas.empty-viewport-toast"}
      action={
        focused
          ? {
              label: t2("canvas.referenceNavigation.return"),
              variant: "secondary",
              onClick: () => void referenceNavigation?.returnToNode(),
              dataActionUiId: "canvas.reference-return",
            }
          : {
              label: t2("canvas.backToContent"),
              variant: "default",
              onClick: handleBack,
              dataActionUiId: "canvas.empty-viewport-back",
            }
      }
      dismiss={
        focused && referenceNavigation
          ? {
              label: t2("canvas.referenceNavigation.dismiss"),
              onClick: referenceNavigation.dismiss,
              dataActionUiId: "canvas.reference-return-dismiss",
            }
          : void 0
      }
    />
  );
}
export const CLICK_VS_DRAG_THRESHOLD_SQ_PX = 25;
export const PLUS_CLICK_FLOW_OFFSET = 120;
export const PLUS_CLICK_MENU_GAP_PX = 16;
export const CONNECT_NODE_MENU_WIDTH_PX = 240;
export function inputHandleOffset(sourcePos, size2) {
  switch (sourcePos) {
    case Position.Right:
      return {
        x: 0,
        y: size2.height / 2,
      };
    case Position.Left:
      return {
        x: size2.width,
        y: size2.height / 2,
      };
    case Position.Bottom:
      return {
        x: size2.width / 2,
        y: 0,
      };
    case Position.Top:
      return {
        x: size2.width / 2,
        y: size2.height,
      };
    default: {
      const _exhaustive = sourcePos;
      throw new Error(`Unhandled handle position: ${String(_exhaustive)}`);
    }
  }
}
export function offsetAlongHandle(point2, pos, distance2) {
  switch (pos) {
    case Position.Right:
      return {
        x: point2.x + distance2,
        y: point2.y,
      };
    case Position.Left:
      return {
        x: point2.x - distance2,
        y: point2.y,
      };
    case Position.Bottom:
      return {
        x: point2.x,
        y: point2.y + distance2,
      };
    case Position.Top:
      return {
        x: point2.x,
        y: point2.y - distance2,
      };
    default: {
      const _exhaustive = pos;
      throw new Error(`Unhandled handle position: ${String(_exhaustive)}`);
    }
  }
}
export function newSourcesForTarget(sources, target, edges) {
  const existing = new Set();
  for (const e2 of edges) {
    if (e2.target === target) existing.add(e2.source);
  }
  const result = [];
  const seen2 = new Set();
  for (const source of sources) {
    if (source === target) continue;
    if (existing.has(source)) continue;
    if (seen2.has(source)) continue;
    result.push(source);
    seen2.add(source);
  }
  return result;
}
export function targetsFullyConnectedFromAll(sources, edges) {
  if (sources.length === 0) return new Set();
  const sourceSet = new Set(sources);
  const reach = new Map();
  for (const e2 of edges) {
    if (!sourceSet.has(e2.source)) continue;
    const bucket = reach.get(e2.target) ?? new Set();
    bucket.add(e2.source);
    reach.set(e2.target, bucket);
  }
  const fullyConnected = new Set();
  for (const [target, bucket] of reach) {
    if (bucket.size === sourceSet.size) fullyConnected.add(target);
  }
  return fullyConnected;
}
export function resolveSelectionConnectionSources(nodes, selectedIds) {
  const nodesById = new Map(nodes.map((node2) => [node2.id, node2]));
  const childIdsByParent = new Map();
  for (const node2 of nodes) {
    if (!node2.parentId) continue;
    const childIds = childIdsByParent.get(node2.parentId) ?? [];
    childIds.push(node2.id);
    childIdsByParent.set(node2.parentId, childIds);
  }
  const sourceNodeIds = [];
  const seenSourceIds = new Set();
  for (const selectedId of selectedIds) {
    const selectedNode = nodesById.get(selectedId);
    const resolvedIds =
      selectedNode?.type === "group" ? (childIdsByParent.get(selectedId) ?? []) : [selectedId];
    for (const resolvedId of resolvedIds) {
      if (seenSourceIds.has(resolvedId)) continue;
      seenSourceIds.add(resolvedId);
      sourceNodeIds.push(resolvedId);
    }
  }
  return {
    sourceNodeIds,
    isSingleGroupSelection:
      selectedIds.length === 1 && nodesById.get(selectedIds[0])?.type === "group",
  };
}
