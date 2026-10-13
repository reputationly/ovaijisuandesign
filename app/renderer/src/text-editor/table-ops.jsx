// table-ops.jsx
import {
  ActionListItem,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  jsxRuntimeExports,
  reactDomExports,
  reactExports,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Trash2 } from "../media-editing/package.jsx";
import { OverlayScrollbar } from "./overlay-scrollbar-inner.jsx";
export function getManager(editor) {
  return editor.storage.markdown?.manager;
}
function normalizeSerializedMarkdown(markdown) {
  const lines = markdown.split("\n");
  const out = [];
  let inFence = false;
  let pendingBlank = false;
  for (const line of lines) {
    if (/^\s{0,3}(?:```|~~~)/.test(line)) {
      inFence = !inFence;
      if (pendingBlank) {
        out.push("");
        pendingBlank = false;
      }
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }
    if (line.trim() === "") {
      pendingBlank = out.length > 0;
      continue;
    }
    if (pendingBlank) {
      out.push("");
      pendingBlank = false;
    }
    out.push(line);
  }
  return out.length === 0
    ? ""
    : `${out.join("\n")}
`;
}
export function patchEntityEscaping(manager) {
  const original = manager.encodeTextForMarkdown;
  if (typeof original !== "function") return;
  manager.encodeTextForMarkdown = (text, node, parentNode) => {
    const upstream = original.call(manager, text, node, parentNode);
    if (upstream === text) return text;
    return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };
}
export function patchBlankLinePadding(manager) {
  const original = manager.serialize;
  if (typeof original !== "function") return;
  manager.serialize = (inputDocument) =>
    normalizeSerializedMarkdown(original.call(manager, inputDocument));
}
const TABLE_SCROLL_VIEWPORT_SELECTOR = ".canvas-markdown-table-scroll-viewport";
function sameTargets(left, right) {
  return (
    left.length === right.length &&
    left.every((target, index) => target === right[index])
  );
}
function MarkdownTableScrollbarPortal({ target }) {
  const targetRef = reactExports.useMemo(
    () => ({
      current: target,
    }),
    [target],
  );
  const shell = target.parentElement;
  if (!shell) return null;
  return reactDomExports.createPortal(
    <OverlayScrollbar
      targetRef={targetRef}
      orientation="horizontal"
      placement="sticky"
    />,
    shell,
  );
}
export function MarkdownTableScrollbarsInner({ editorRoot }) {
  const [targets, setTargets] = reactExports.useState([]);
  const targetIdsRef = reactExports.useRef(new WeakMap());
  const nextTargetIdRef = reactExports.useRef(1);
  reactExports.useEffect(() => {
    const syncTargets = () => {
      const next = editorRoot
        ? Array.from(
            editorRoot.querySelectorAll(TABLE_SCROLL_VIEWPORT_SELECTOR),
          )
        : [];
      setTargets((current) =>
        sameTargets(current, next) ? current : next,
      );
    };
    syncTargets();
    if (!editorRoot) return;
    const observer = new MutationObserver(syncTargets);
    observer.observe(editorRoot, {
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [editorRoot]);
  const targetKey = (target) => {
    const existing = targetIdsRef.current.get(target);
    if (existing !== void 0) return existing;
    const next = nextTargetIdRef.current;
    nextTargetIdRef.current += 1;
    targetIdsRef.current.set(target, next);
    return next;
  };
  return (
    <>
      {targets.map((target) => (
        <MarkdownTableScrollbarPortal key={targetKey(target)} target={target} />
      ))}
    </>
  );
}
function clampToViewport(
  position,
  menuRef,
  estimatedWidth = 240,
  estimatedHeight = 400,
) {
  const VIEWPORT_MARGIN = 8;
  const { x, y } = position;
  const el = menuRef.current;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const menuW = el?.offsetWidth || estimatedWidth;
  const menuH = el?.offsetHeight || estimatedHeight;
  const maxX = Math.max(VIEWPORT_MARGIN, viewportWidth - menuW - VIEWPORT_MARGIN);
  const maxY = Math.max(VIEWPORT_MARGIN, viewportHeight - menuH - VIEWPORT_MARGIN);
  return {
    x: Math.max(VIEWPORT_MARGIN, Math.min(x, maxX)),
    y: Math.max(VIEWPORT_MARGIN, Math.min(y, maxY)),
  };
}
export function useClampedMenuPosition({
  position,
  estimatedWidth,
  estimatedHeight,
  getAnchorPosition,
}) {
  const menuRef = reactExports.useRef(null);
  const resolvePosition = reactExports.useCallback(
    () =>
      getAnchorPosition?.(
        menuRef.current?.offsetHeight || estimatedHeight || 400,
      ) ?? position,
    [getAnchorPosition, estimatedHeight, position],
  );
  const [clampedPosition, setClampedPosition] = reactExports.useState(() =>
    clampToViewport(
      resolvePosition(),
      menuRef,
      estimatedWidth,
      estimatedHeight,
    ),
  );
  reactExports.useLayoutEffect(() => {
    setClampedPosition(
      clampToViewport(
        resolvePosition(),
        menuRef,
        estimatedWidth,
        estimatedHeight,
      ),
    );
  }, [resolvePosition, estimatedWidth, estimatedHeight]);
  reactExports.useEffect(() => {
    const updatePosition = () => {
      setClampedPosition((current) => {
        const next = clampToViewport(
          resolvePosition(),
          menuRef,
          estimatedWidth,
          estimatedHeight,
        );
        if (current.x === next.x && current.y === next.y) {
          return current;
        }
        return next;
      });
    };
    const resizeObserver = new ResizeObserver(() => {
      updatePosition();
    });
    if (menuRef.current) {
      resizeObserver.observe(menuRef.current);
    }
    window.addEventListener("resize", updatePosition);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePosition);
    };
  }, [resolvePosition, estimatedWidth, estimatedHeight]);
  return {
    menuRef,
    clampedPosition,
  };
}
export const TABLE_OPS = [
  {
    id: "add-row-above",
    labelKey: "canvas.mdTable.addRowAbove",
    Icon: ArrowUpToLine,
    run: (editor) => editor.chain().focus().addRowBefore().run(),
  },
  {
    id: "add-row-below",
    labelKey: "canvas.mdTable.addRowBelow",
    Icon: ArrowDownToLine,
    run: (editor) => editor.chain().focus().addRowAfter().run(),
  },
  {
    id: "delete-row",
    destructive: true,
    labelKey: "canvas.mdTable.deleteRow",
    Icon: Trash2,
    run: (editor) => editor.chain().focus().deleteRow().run(),
  },
  {
    id: "add-col-left",
    labelKey: "canvas.mdTable.addColLeft",
    Icon: ArrowLeftToLine,
    groupStart: true,
    run: (editor) => editor.chain().focus().addColumnBefore().run(),
  },
  {
    id: "add-col-right",
    labelKey: "canvas.mdTable.addColRight",
    Icon: ArrowRightToLine,
    run: (editor) => editor.chain().focus().addColumnAfter().run(),
  },
  {
    id: "delete-col",
    destructive: true,
    labelKey: "canvas.mdTable.deleteCol",
    Icon: Trash2,
    run: (editor) => editor.chain().focus().deleteColumn().run(),
  },
  {
    id: "delete-table",
    destructive: true,
    labelKey: "canvas.mdTable.delete",
    Icon: Trash2,
    groupStart: true,
    run: (editor) => editor.chain().focus().deleteTable().run(),
  },
];
export function MenuItem({ icon, label, onClick, destructive, actionId }) {
  return (
    <ActionListItem
      onClick={onClick}
      data-action-ui-id={`canvas.md-table.${actionId}`}
      variant={destructive ? "destructive" : "default"}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span>{label}</span>
    </ActionListItem>
  );
}
