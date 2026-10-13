// node-context-menu.jsx
import {
  ActionListItem,
  ActionListPanel,
  ActionListSeparator,
  CanvasNodeType,
  Copy,
  CopyPlus,
  FolderInput,
  jsxRuntimeExports,
  Library,
  reactDomExports,
  reactExports,
  Save,
  Tag$1 as Tag,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { StrokeIcon } from "../workspace/use-prompt-icon.jsx";
import { PopoverTrigger } from "../assets/gateway-scope-provider.jsx";
import { Popover } from "../assets/credit-query-keys.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
import { CanvasTagPickerPanel } from "../canvas/canvas-tag-picker-panel.jsx";
import {
  NODE_CONTEXT_MENU_VIEWPORT_MARGIN,
  resolveNodeContextMenuPosition,
} from "./canvas-host-toolbar-button.jsx";
import { PlatformFileManagerLabel } from "../settings/request-prompt-prefill.jsx";
import { Trash2 } from "../media-editing/package.jsx";
import { AddToChatIcon } from "../canvas/fullscreen-icon.jsx";
import { GroupIcon, UngroupIcon } from "../canvas/file-missing-icon.jsx";
import { LocalFolderIcon, PencilIcon } from "../workspace/home-service.jsx";
function NodeContextMenuIcon({ icon, viewBoxSize = 24 }) {
  return <StrokeIcon icon={icon} size={16} viewBoxSize={viewBoxSize} />;
}
function TagMenuItem({ assets }) {
  const { t } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const panelId = reactExports.useId();
  const label = t("canvasTags.entry");
  const trigger = (
    <ActionListItem
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={panelId}
      data-action-ui-id="canvas.node-tag-submenu"
    >
      <NodeContextMenuIcon icon={Tag} />
      <span className="flex-1 text-left">{label}</span>
      {assets.length > 1 ? (
        <span className="text-xs text-muted-foreground">{assets.length}</span>
      ) : null}
    </ActionListItem>
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent
        id={panelId}
        role="dialog"
        aria-label={label}
        side="right"
        align="start"
        sideOffset={4}
        positionerClassName="z-[60]"
        className="w-auto gap-0 p-1.5"
        data-canvas-tag-panel=""
        data-action-ui-id="canvas.node-tag-submenu-panel"
        onKeyDown={(event) => {
          if (event.key === "Escape") event.stopPropagation();
        }}
      >
        <CanvasTagPickerPanel assets={assets} embedded={true} />
      </PopoverContent>
    </Popover>
  );
}
const ESTIMATED_MENU_SIZE = {
  width: 192,
  height: 440,
};
const SHOW_CANCEL_GENERATION_IN_CONTEXT_MENU = false;
function MenuButton({ icon, label, onClick, testId, destructive }) {
  return (
    <ActionListItem
      data-action-ui-id={testId}
      variant={destructive ? "destructive" : "default"}
      onClick={() => {
        if (testId) {
          trackEvent(TRACK_EVENTS.CANVAS_CONTEXT_MENU_CLICK, {
            menu_item: testId,
          });
        }
        onClick();
      }}
    >
      {icon}
      {label}
    </ActionListItem>
  );
}
export function NodeContextMenu({
  position: position2,
  targets,
  actions,
  onCopy,
  onSaveAs,
  onShowInFolder,
  onAddToChat,
  onRename,
  onCancelGeneration,
  tagAssets,
  onClose,
  motionProps,
}) {
  const { t } = useTranslation();
  const fallbackRef = reactExports.useRef(null);
  const ref = motionProps?.ref ?? fallbackRef;
  const closing = motionProps?.["data-ending-style"] !== void 0;
  const [menuPosition, setMenuPosition] = reactExports.useState(() =>
    resolveNodeContextMenuPosition({
      anchor: position2,
      menuSize: ESTIMATED_MENU_SIZE,
      viewportSize:
        typeof window === "undefined"
          ? {
              width: Number.MAX_SAFE_INTEGER,
              height: Number.MAX_SAFE_INTEGER,
            }
          : {
              width: window.innerWidth,
              height: window.innerHeight,
            },
    }),
  );
  const updateMenuPosition = reactExports.useCallback(() => {
    if (typeof window === "undefined") return;
    const menu = ref.current;
    const next = resolveNodeContextMenuPosition({
      anchor: {
        x: position2.x,
        y: position2.y,
      },
      menuSize: menu
        ? {
            width: menu.offsetWidth,
            height: menu.offsetHeight,
          }
        : ESTIMATED_MENU_SIZE,
      viewportSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });
    setMenuPosition((current) =>
      current.x === next.x && current.y === next.y ? current : next,
    );
  }, [position2.x, position2.y, ref]);
  reactExports.useLayoutEffect(updateMenuPosition, [updateMenuPosition]);
  reactExports.useEffect(() => {
    window.addEventListener("resize", updateMenuPosition);
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateMenuPosition);
    if (ref.current) resizeObserver?.observe(ref.current);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [updateMenuPosition, ref]);
  reactExports.useEffect(() => {
    if (closing) return;
    const handleClick = (mouseEvent) => {
      const target = mouseEvent.target;
      if (ref.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest("[data-canvas-tag-panel]")
      )
        return;
      onClose();
    };
    const handleKey = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose, closing, ref]);
  const wrap = (fn) => () => {
    fn();
    onClose();
  };
  const isSingle = targets.length === 1;
  const single = isSingle ? targets[0] : null;
  const isSingleGroup = isSingle && single?.nodeType === CanvasNodeType.Group;
  const fileBackedTargets = targets.filter((menuTarget) => menuTarget.filePath);
  const hasFileBackedTargets = fileBackedTargets.length > 0;
  const fsTargets = targets.filter((menuTarget) => menuTarget.filePath && menuTarget.absolutePath);
  const isTable = single?.fileType === "table";
  const showAddToChat = hasFileBackedTargets;
  const hasFileSlot = isSingle && !!single?.filePath && !!single.absolutePath;
  const showOsClipboardActions = hasFileSlot && !isTable;
  const showRename =
    isSingle &&
    !!onRename &&
    (isSingleGroup ||
      (!!single?.filePath && single.nodeType !== CanvasNodeType.File));
  const showShowInFolder = fsTargets.length > 0;
  const showCopyCanvas = true;
  const showGroup = !isSingle;
  const showUngroup = !!isSingleGroup && !!single;
  const hasGroupTarget = targets.some(
    (menuTarget) => menuTarget.nodeType === CanvasNodeType.Group,
  );
  const hasTableTarget = targets.some((menuTarget) => menuTarget.fileType === "table");
  const showPromoteToAsset =
    !!actions.promoteToAsset &&
    !hasTableTarget &&
    (hasFileBackedTargets || hasGroupTarget);
  const showSaveToProjectAssets =
    !!actions.saveToProjectAssets &&
    !hasTableTarget &&
    (hasFileBackedTargets || hasGroupTarget);
  const showCancelGeneration = SHOW_CANCEL_GENERATION_IN_CONTEXT_MENU;
  const showDelete = !targets.some(
    (target) =>
      target.generationErrorStatus === "recoverable_error" ||
      (target.generationErrorStatus === "status_unknown" &&
        target.nodeType !== CanvasNodeType.Placeholder),
  );
  const handleAddToChat = wrap(() => onAddToChat(fileBackedTargets));
  const handleCopy = wrap(() => {
    if (!single) return;
    if (single.isMultiImage) {
      trackEvent(TRACK_EVENTS.CANVAS_NODE_COPY_PASTE, {
        action: "copy",
        node_count: 1,
        via: "context_menu",
      });
      actions.copyToCanvasClipboard();
      return;
    }
    trackEvent(TRACK_EVENTS.CANVAS_NODE_SAVE, {
      node_id: single.nodeId,
      action: "copy",
    });
    onCopy(single);
  });
  const handleSaveAs = wrap(() => {
    if (!single) return;
    trackEvent(TRACK_EVENTS.CANVAS_NODE_SAVE, {
      node_id: single.nodeId,
      action: "save_as",
    });
    onSaveAs(single);
  });
  const handleShowInFolder = wrap(() => {
    if (fsTargets.length === 0) return;
    const seen = new Set();
    for (const target of fsTargets) {
      const abs = target.absolutePath;
      if (!abs) continue;
      const slash = Math.max(abs.lastIndexOf("/"), abs.lastIndexOf("\\"));
      const dir = slash >= 0 ? abs.slice(0, slash) : abs;
      if (seen.has(dir)) continue;
      seen.add(dir);
      onShowInFolder(target);
    }
  });
  const handleCopyCanvas = wrap(() => {
    trackEvent(TRACK_EVENTS.CANVAS_NODE_COPY_PASTE, {
      action: "copy",
      node_count: targets.length,
      via: "context_menu",
    });
    actions.duplicateToCanvas();
  });
  const handleGroup = wrap(actions.groupSelected);
  const handleUngroup = wrap(() => {
    if (single?.nodeType === CanvasNodeType.Group)
      actions.ungroupGroup(single.nodeId);
  });
  const handlePromoteToAsset = wrap(() => {
    actions.promoteToAsset?.(targets.map((target) => target.nodeId));
  });
  const handleSaveToProjectAssets = wrap(() => {
    actions.saveToProjectAssets?.(targets.map((target) => target.nodeId));
  });
  const handleRename = wrap(() => {
    if (single && onRename) onRename(single);
  });
  const handleDelete = wrap(actions.deleteSelected);
  const menu = (
    <ActionListPanel
      {...motionProps}
      ref={ref}
      data-testid="canvas-node-context-menu"
      className={`fixed z-50 min-w-48 dp-motion-quick-zoom`}
      style={{
        left: menuPosition.x,
        top: menuPosition.y,
        maxHeight: `calc(100vh - ${NODE_CONTEXT_MENU_VIEWPORT_MARGIN * 2}px)`,
        overflowY: "auto",
      }}
    >
      {showAddToChat && (
        <MenuButton
          testId="canvas-add-to-chat"
          icon={<NodeContextMenuIcon icon={AddToChatIcon} viewBoxSize={20} />}
          label={t("canvas.addToChat")}
          onClick={handleAddToChat}
        />
      )}
      {showOsClipboardActions && (
        <>
          <MenuButton
            testId="canvas-copy-from-menu"
            icon={<NodeContextMenuIcon icon={Copy} />}
            label={t("common.copy")}
            onClick={handleCopy}
          />
          <MenuButton
            icon={<NodeContextMenuIcon icon={Save} />}
            label={t("common.saveAs")}
            onClick={handleSaveAs}
          />
        </>
      )}
      {showRename && (
        <MenuButton
          testId="canvas-rename-from-menu"
          icon={<NodeContextMenuIcon icon={PencilIcon} />}
          label={t("common.rename")}
          onClick={handleRename}
        />
      )}
      {tagAssets && tagAssets.length > 0 && <TagMenuItem assets={tagAssets} />}
      {(showAddToChat || showOsClipboardActions || showRename) &&
        showCopyCanvas && <ActionListSeparator />}
      <MenuButton
        testId="canvas-copy-canvas"
        icon={<NodeContextMenuIcon icon={CopyPlus} />}
        label={t("canvas.copyCanvasNode")}
        onClick={handleCopyCanvas}
      />
      {showGroup && (
        <MenuButton
          testId="canvas-group-from-menu"
          icon={<GroupIcon size={16} />}
          label={t("canvas.group")}
          onClick={handleGroup}
        />
      )}
      {showUngroup && (
        <MenuButton
          testId="canvas-ungroup-from-menu"
          icon={<UngroupIcon size={16} />}
          label={t("canvas.ungroup")}
          onClick={handleUngroup}
        />
      )}
      {showPromoteToAsset && (
        <MenuButton
          testId="canvas-promote-to-asset-from-menu"
          icon={<NodeContextMenuIcon icon={Library} />}
          label={t("canvas.addToLibrary")}
          onClick={handlePromoteToAsset}
        />
      )}
      {showSaveToProjectAssets && (
        <MenuButton
          testId="canvas-save-to-project-assets-from-menu"
          icon={<NodeContextMenuIcon icon={FolderInput} />}
          label={t("canvas.saveToProjectAssets")}
          onClick={handleSaveToProjectAssets}
        />
      )}
      {showShowInFolder && (
        <>
          <ActionListSeparator />
          <MenuButton
            icon={<LocalFolderIcon className="size-4" />}
            label={<PlatformFileManagerLabel />}
            onClick={handleShowInFolder}
          />
        </>
      )}
      {showDelete && <ActionListSeparator />}
      {showCancelGeneration}
      {showDelete && (
        <MenuButton
          testId="canvas-delete-from-menu"
          destructive={true}
          icon={<NodeContextMenuIcon icon={Trash2} />}
          label={
            single?.generationErrorStatus === "status_unknown"
              ? t("canvas.removeLocalPlaceholder")
              : t("common.delete")
          }
          onClick={handleDelete}
        />
      )}
    </ActionListPanel>
  );
  return typeof document === "undefined"
    ? menu
    : reactDomExports.createPortal(menu, document.body);
}
