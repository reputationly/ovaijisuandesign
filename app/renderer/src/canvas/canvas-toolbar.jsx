// canvas-toolbar.jsx
import {
  CompositedSvg,
  MonochromeIcon,
  Plus,
  reactExports,
  useTranslation,
  X$7,
} from "../vendor.js";
import { CANVAS_COMMAND_IDS } from "./use-active-mode.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Tooltip$1 } from "../generation/missing-asset-card.jsx";
import {
  CANVAS_TOOL_DOCK_CONTROL_SIZE_PX,
  CANVAS_TOOL_DOCK_HEIGHT_PX,
} from "./cursor-icon.jsx";
import {
  ToolbarSeparator,
  ToolbarTooltipContent,
} from "./canvas-toolbar-extension-button.jsx";
import { TooltipProvider$1 } from "../infra/create-recently-added-store.js";
import { QuickZoomPresence } from "./canvas-high-blast-delete-dialog.jsx";
import { ToolModeSplitButton } from "./tool-mode-split-button.jsx";

const CANVAS_TOOL_DOCK_ICON_SIZE_PX = 18;

const StickerIcon = reactExports.forwardRef(function StickerIcon2(
  { size: size2 = 22, ...props },
  ref,
) {
  return (
    <CompositedSvg
      ref={ref}
      width={size2}
      height={size2}
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M0.75 10.75C0.75 16.273 5.227 20.75 10.75 20.75C11.398 20.75 12 20.45 12.458 19.992L19.992 12.458C20.45 12 20.75 11.398 20.75 10.75C20.75 5.227 16.273 0.75 10.75 0.75C5.227 0.75 0.75 5.227 0.75 10.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6.87793 13.2244C8.29599 14.2909 9.863 14.6169 11.2408 14.6169"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10.75 20.75C10.75 17.957 10.75 16.56 11.143 15.438C11.4903 14.4455 12.0568 13.5439 12.8004 12.8004C13.5439 12.0568 14.4455 11.4903 15.438 11.143C16.561 10.75 17.958 10.75 20.75 10.75"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6.85449 7.48438V8.95911"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M14.7402 7.48438V8.95911"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </CompositedSvg>
  );
});

function handleCanvasCommandPanelEscape(event, options) {
  if (event.key !== "Escape") return false;
  event.preventDefault();
  event.stopPropagation();
  if (options.isStickerPanel && options.stickerMode) {
    options.executeSelect();
  }
  options.closePanel();
  return true;
}

const TOOL_COMMANDS = [
  {
    id: CANVAS_COMMAND_IDS.addNode,
    icon: Plus,
    primary: true,
  },
];

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
    (kind === "toggle" && pressed) ||
    (kind === "panel" && expanded) ||
    Boolean(expanded);
  return (
    <Tooltip$1
      content={
        <ToolbarTooltipContent label={label} shortcut={definition2.shortcut} />
      }
    >
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
          <Icon2
            size={iconSize}
            strokeWidth={1.5}
            className={iconClassName}
            aria-hidden="true"
          />
        ) : (
          <MonochromeIcon tone="control">
            <Icon2
              size={iconSize}
              strokeWidth={1.5}
              className={iconClassName}
              aria-hidden="true"
            />
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
  const activeDefinition = activeCommand
    ? commandRegistry.get(activeCommand)
    : null;
  const stickerDefinition = commandRegistry.get(CANVAS_COMMAND_IDS.sticker);
  const stickerLabel = t2("canvas.toolbar.stickers", "Stickers");
  const commandPanelRef = reactExports.useRef(null);
  const stickerTriggerRef = reactExports.useRef(null);
  const commandPanelId = reactExports.useId();
  const stickerPanelId = reactExports.useId();
  const commandPanelOpen = Boolean(activeDefinition && panelContent);
  const stickerPanelOpen =
    commandPanelOpen && activeCommand === CANVAS_COMMAND_IDS.sticker;
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
  }, [
    activeCommand,
    closeCommandPanel,
    commandPanelOpen,
    commandRegistry,
    stickerMode,
  ]);
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
                  if (id2 === CANVAS_COMMAND_IDS.addNode && onOpenAddNodeMenu)
                    onOpenAddNodeMenu();
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
