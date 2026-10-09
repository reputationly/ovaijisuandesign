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
  Tag$1,
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
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const panelId = reactExports.useId();
  const label = t2("canvasTags.entry");
  const trigger = (
    <ActionListItem
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={panelId}
      data-action-ui-id="canvas.node-tag-submenu"
    >
      <NodeContextMenuIcon icon={Tag$1} />
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

const ESTIMATED_MENU_SIZE$1 = {
  width: 192,
  height: 440,
};

const SHOW_CANCEL_GENERATION_IN_CONTEXT_MENU = false;

function MenuButton$1({ icon, label, onClick, testId, destructive }) {
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
  const { t: t2 } = useTranslation();
  const fallbackRef = reactExports.useRef(null);
  const ref = motionProps?.ref ?? fallbackRef;
  const closing2 = motionProps?.["data-ending-style"] !== void 0;
  const [menuPosition, setMenuPosition] = reactExports.useState(() =>
    resolveNodeContextMenuPosition({
      anchor: position2,
      menuSize: ESTIMATED_MENU_SIZE$1,
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
    const menu2 = ref.current;
    const next2 = resolveNodeContextMenuPosition({
      anchor: {
        x: position2.x,
        y: position2.y,
      },
      menuSize: menu2
        ? {
            width: menu2.offsetWidth,
            height: menu2.offsetHeight,
          }
        : ESTIMATED_MENU_SIZE$1,
      viewportSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });
    setMenuPosition((current2) =>
      current2.x === next2.x && current2.y === next2.y ? current2 : next2,
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
    if (closing2) return;
    const handleClick2 = (e2) => {
      const target = e2.target;
      if (ref.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest("[data-canvas-tag-panel]")
      )
        return;
      onClose();
    };
    const handleKey = (e2) => {
      if (e2.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick2);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick2);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose, closing2, ref]);
  const wrap2 = (fn2) => () => {
    fn2();
    onClose();
  };
  const isSingle = targets.length === 1;
  const single = isSingle ? targets[0] : null;
  const isSingleGroup = isSingle && single?.nodeType === CanvasNodeType.Group;
  const fileBackedTargets = targets.filter((t22) => t22.filePath);
  const hasFileBackedTargets = fileBackedTargets.length > 0;
  const fsTargets = targets.filter((t22) => t22.filePath && t22.absolutePath);
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
    (t22) => t22.nodeType === CanvasNodeType.Group,
  );
  const hasTableTarget = targets.some((t22) => t22.fileType === "table");
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
  const handleAddToChat = wrap2(() => onAddToChat(fileBackedTargets));
  const handleCopy = wrap2(() => {
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
  const handleSaveAs = wrap2(() => {
    if (!single) return;
    trackEvent(TRACK_EVENTS.CANVAS_NODE_SAVE, {
      node_id: single.nodeId,
      action: "save_as",
    });
    onSaveAs(single);
  });
  const handleShowInFolder = wrap2(() => {
    if (fsTargets.length === 0) return;
    const seen2 = new Set();
    for (const target of fsTargets) {
      const abs = target.absolutePath;
      if (!abs) continue;
      const slash2 = Math.max(abs.lastIndexOf("/"), abs.lastIndexOf("\\"));
      const dir = slash2 >= 0 ? abs.slice(0, slash2) : abs;
      if (seen2.has(dir)) continue;
      seen2.add(dir);
      onShowInFolder(target);
    }
  });
  const handleCopyCanvas = wrap2(() => {
    trackEvent(TRACK_EVENTS.CANVAS_NODE_COPY_PASTE, {
      action: "copy",
      node_count: targets.length,
      via: "context_menu",
    });
    actions.duplicateToCanvas();
  });
  const handleGroup = wrap2(actions.groupSelected);
  const handleUngroup = wrap2(() => {
    if (single?.nodeType === CanvasNodeType.Group)
      actions.ungroupGroup(single.nodeId);
  });
  const handlePromoteToAsset = wrap2(() => {
    actions.promoteToAsset?.(targets.map((target) => target.nodeId));
  });
  const handleSaveToProjectAssets = wrap2(() => {
    actions.saveToProjectAssets?.(targets.map((target) => target.nodeId));
  });
  const handleRename = wrap2(() => {
    if (single && onRename) onRename(single);
  });
  const handleDelete2 = wrap2(actions.deleteSelected);
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
        <MenuButton$1
          testId="canvas-add-to-chat"
          icon={<NodeContextMenuIcon icon={AddToChatIcon} viewBoxSize={20} />}
          label={t2("canvas.addToChat")}
          onClick={handleAddToChat}
        />
      )}
      {showOsClipboardActions && (
        <>
          <MenuButton$1
            testId="canvas-copy-from-menu"
            icon={<NodeContextMenuIcon icon={Copy} />}
            label={t2("common.copy")}
            onClick={handleCopy}
          />
          <MenuButton$1
            icon={<NodeContextMenuIcon icon={Save} />}
            label={t2("common.saveAs")}
            onClick={handleSaveAs}
          />
        </>
      )}
      {showRename && (
        <MenuButton$1
          testId="canvas-rename-from-menu"
          icon={<NodeContextMenuIcon icon={PencilIcon} />}
          label={t2("common.rename")}
          onClick={handleRename}
        />
      )}
      {tagAssets && tagAssets.length > 0 && <TagMenuItem assets={tagAssets} />}
      {(showAddToChat || showOsClipboardActions || showRename) &&
        showCopyCanvas && <ActionListSeparator />}
      <MenuButton$1
        testId="canvas-copy-canvas"
        icon={<NodeContextMenuIcon icon={CopyPlus} />}
        label={t2("canvas.copyCanvasNode")}
        onClick={handleCopyCanvas}
      />
      {showGroup && (
        <MenuButton$1
          testId="canvas-group-from-menu"
          icon={<GroupIcon size={16} />}
          label={t2("canvas.group")}
          onClick={handleGroup}
        />
      )}
      {showUngroup && (
        <MenuButton$1
          testId="canvas-ungroup-from-menu"
          icon={<UngroupIcon size={16} />}
          label={t2("canvas.ungroup")}
          onClick={handleUngroup}
        />
      )}
      {showPromoteToAsset && (
        <MenuButton$1
          testId="canvas-promote-to-asset-from-menu"
          icon={<NodeContextMenuIcon icon={Library} />}
          label={t2("canvas.addToLibrary")}
          onClick={handlePromoteToAsset}
        />
      )}
      {showSaveToProjectAssets && (
        <MenuButton$1
          testId="canvas-save-to-project-assets-from-menu"
          icon={<NodeContextMenuIcon icon={FolderInput} />}
          label={t2("canvas.saveToProjectAssets")}
          onClick={handleSaveToProjectAssets}
        />
      )}
      {showShowInFolder && (
        <>
          <ActionListSeparator />
          <MenuButton$1
            icon={<LocalFolderIcon className="size-4" />}
            label={<PlatformFileManagerLabel />}
            onClick={handleShowInFolder}
          />
        </>
      )}
      {showDelete && <ActionListSeparator />}
      {showCancelGeneration}
      {showDelete && (
        <MenuButton$1
          testId="canvas-delete-from-menu"
          destructive={true}
          icon={<NodeContextMenuIcon icon={Trash2} />}
          label={
            single?.generationErrorStatus === "status_unknown"
              ? t2("canvas.removeLocalPlaceholder")
              : t2("common.delete")
          }
          onClick={handleDelete2}
        />
      )}
    </ActionListPanel>
  );
  return typeof document === "undefined"
    ? menu
    : reactDomExports.createPortal(menu, document.body);
}
