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
  resolveCanvasShortcut$1,
} from "../media-editing/use-warn-missing-asset-meta.jsx";
import { useDismissMenu } from "./canvas-high-blast-delete-dialog.jsx";
import { getClipboard } from "./partition-user-removal-elements.js";
import { useClampedMenuPosition } from "../text-editor/table-ops.jsx";

function PaneMenuItem({
  label,
  shortcut,
  disabled: disabled2,
  testId,
  dataActionUiId,
  onClick,
}) {
  const isMac2 = resolveCanvasPlatform() === "mac";
  return (
    <ActionListItem
      data-testid={testId}
      data-action-ui-id={dataActionUiId}
      disabled={disabled2}
      className="justify-between"
      data-disabled={disabled2 || void 0}
      onClick={() => {
        if (!disabled2) onClick();
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
          {shortcut.map((token2, tokenIndex) => (
            <span key={token2} className="inline-flex items-center">
              {!isMac2 && tokenIndex > 0 && (
                <span
                  aria-hidden="true"
                  className="mr-0.5 text-[10px] leading-none"
                >
                  +
                </span>
              )}
              <span
                className={
                  token2 === "⌘"
                    ? "text-[16px] leading-none font-normal"
                    : token2 === "⇧" || token2 === "Shift"
                      ? "text-[15px] leading-none font-medium"
                      : token2 === "Ctrl" || token2 === "Alt"
                        ? "text-[14px] leading-none font-normal"
                        : "text-[11px] leading-none font-medium"
                }
              >
                {token2}
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
  position: position2,
  canUndo,
  canRedo,
  onClose,
  onUpload,
  onAddNode,
  onUndo,
  onRedo,
  onPaste,
}) {
  const { t: t2 } = useTranslation();
  const hasClipboard = getClipboard() !== null;
  const { menuRef, clampedPosition } = useClampedMenuPosition({
    position: position2,
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
      ref={(element2) => {
        menuRef.current = element2;
        if (motionProps) motionProps.ref.current = element2;
      }}
      data-testid="canvas-pane-context-menu-container"
      className="dp-motion-quick-zoom fixed w-[240px]"
      style={{
        left: clampedPosition.x,
        top: clampedPosition.y,
        zIndex: 50,
        transformOrigin: `${position2.x - clampedPosition.x}px ${position2.y - clampedPosition.y}px`,
      }}
    >
      <PaneMenuItem
        label={t2("canvas.upload")}
        testId="canvas-handle-menu-upload-item"
        dataActionUiId="canvas.pane-menu-upload"
        onClick={() => handleAction(onUpload)}
      />
      <PaneMenuItem
        label={t2("canvas.addNode")}
        testId="canvas-pane-context-menu-new-block-item"
        dataActionUiId="canvas.pane-menu-add-block"
        onClick={() => handleAction(onAddNode)}
      />
      <ActionListSeparator />
      <PaneMenuItem
        label={t2("canvas.undo")}
        shortcut={resolveCanvasShortcut$1("undo")}
        disabled={!canUndo}
        dataActionUiId="canvas.pane-menu-undo"
        onClick={() => handleAction(onUndo)}
      />
      <PaneMenuItem
        label={t2("canvas.redo")}
        shortcut={resolveCanvasShortcut$1("redo")}
        disabled={!canRedo}
        dataActionUiId="canvas.pane-menu-redo"
        onClick={() => handleAction(onRedo)}
      />
      <ActionListSeparator />
      <PaneMenuItem
        label={t2("canvas.paste")}
        shortcut={resolveCanvasShortcut$1("paste")}
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
