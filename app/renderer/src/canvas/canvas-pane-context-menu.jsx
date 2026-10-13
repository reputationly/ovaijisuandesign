// canvas-pane-context-menu.jsx
import {
  ActionListItem,
  ActionListPanel,
  ActionListSeparator,
  reactDomExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  resolveCanvasPlatform,
  resolveCanvasShortcut,
} from "../media-editing/use-warn-missing-asset-meta.jsx";
import { useDismissMenu } from "./canvas-high-blast-delete-dialog.jsx";
import { getClipboard } from "./partition-user-removal-elements.js";
import { useClampedMenuPosition } from "../text-editor/table-ops.jsx";
function PaneMenuItem({
  label,
  shortcut,
  disabled,
  testId,
  dataActionUiId,
  onClick,
}) {
  const isMac = resolveCanvasPlatform() === "mac";
  return (
    <ActionListItem
      data-testid={testId}
      data-action-ui-id={dataActionUiId}
      disabled={disabled}
      className="justify-between"
      data-disabled={disabled || void 0}
      onClick={() => {
        if (!disabled) onClick();
      }}
    >
      <span>{label}</span>
      {shortcut && (
        <span
          className="flex items-center gap-0.5"
          style={{
            color: "var(--canvas-controls-text)",
            opacity: 0.5,
          }}
        >
          {shortcut.map((token, tokenIndex) => (
            <span key={token} className="inline-flex items-center">
              {!isMac && tokenIndex > 0 && (
                <span
                  aria-hidden="true"
                  className="mr-0.5 text-[10px] leading-none"
                >
                  +
                </span>
              )}
              <span
                className={
                  token === "⌘"
                    ? "text-[16px] leading-none font-normal"
                    : token === "⇧" || token === "Shift"
                      ? "text-[15px] leading-none font-medium"
                      : token === "Ctrl" || token === "Alt"
                        ? "text-[14px] leading-none font-normal"
                        : "text-[11px] leading-none font-medium"
                }
              >
                {token}
              </span>
            </span>
          ))}
        </span>
      )}
    </ActionListItem>
  );
}
export function CanvasPaneContextMenu({
  motionProps,
  position,
  canUndo,
  canRedo,
  onClose,
  onUpload,
  onAddNode,
  onUndo,
  onRedo,
  onPaste,
}) {
  const { t: translate } = useTranslation();
  const hasClipboard = getClipboard() !== null;
  const { menuRef, clampedPosition } = useClampedMenuPosition({
    position,
    estimatedWidth: 240,
    estimatedHeight: 300,
  });
  useDismissMenu(menuRef, onClose, void 0, void 0, !motionProps?.inert);
  const handleAction = reactExports.useCallback(
    (action) => {
      action();
      onClose();
    },
    [onClose],
  );
  const menu = (
    <ActionListPanel
      {...motionProps}
      ref={(element) => {
        menuRef.current = element;
        if (motionProps) motionProps.ref.current = element;
      }}
      data-testid="canvas-pane-context-menu-container"
      className="dp-motion-quick-zoom fixed w-[240px]"
      style={{
        left: clampedPosition.x,
        top: clampedPosition.y,
        zIndex: 50,
        transformOrigin: `${position.x - clampedPosition.x}px ${position.y - clampedPosition.y}px`,
      }}
    >
      <PaneMenuItem
        label={translate("canvas.upload")}
        testId="canvas-handle-menu-upload-item"
        dataActionUiId="canvas.pane-menu-upload"
        onClick={() => handleAction(onUpload)}
      />
      <PaneMenuItem
        label={translate("canvas.addNode")}
        testId="canvas-pane-context-menu-new-block-item"
        dataActionUiId="canvas.pane-menu-add-block"
        onClick={() => handleAction(onAddNode)}
      />
      <ActionListSeparator />
      <PaneMenuItem
        label={translate("canvas.undo")}
        shortcut={resolveCanvasShortcut("undo")}
        disabled={!canUndo}
        dataActionUiId="canvas.pane-menu-undo"
        onClick={() => handleAction(onUndo)}
      />
      <PaneMenuItem
        label={translate("canvas.redo")}
        shortcut={resolveCanvasShortcut("redo")}
        disabled={!canRedo}
        dataActionUiId="canvas.pane-menu-redo"
        onClick={() => handleAction(onRedo)}
      />
      <ActionListSeparator />
      <PaneMenuItem
        label={translate("canvas.paste")}
        shortcut={resolveCanvasShortcut("paste")}
        disabled={!hasClipboard}
        testId="canvas-pane-context-menu-paste-item"
        dataActionUiId="canvas.pane-menu-paste"
        onClick={() => handleAction(onPaste)}
      />
    </ActionListPanel>
  );
  return typeof document === "undefined"
    ? menu
    : reactDomExports.createPortal(menu, document.body);
}
