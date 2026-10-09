// table-context-menu.jsx
import {
  jsxRuntimeExports,
  reactExports,
  useTranslation,
  reactDomExports,
  ArrowUpToLine,
  ArrowDownToLine,
  Trash2,
  ArrowLeftToLine,
  ArrowRightToLine,
  ActionListItem,
  ActionListPanel,
  ActionListSeparator,
  Grid2x2Plus,
} from "../vendor.js";
import {
  ParagraphIcon,
  BoldIcon,
  ItalicIcon,
  BulletListIcon,
  OrderedListIcon,
} from "../m01/generating-media-area.jsx";
import { OverlayScrollbar } from "../m04/table-editor-inner.jsx";
import {
  newColumnId,
  defaultColumnWidth,
  newRowId,
  TABLE_DOCUMENT_VERSION,
} from "../m01/prune-persisted-node-data.js";
import { __jsx } from "../shared/jsx-runtime.js";
function countNewlinesBefore(text2, offset2) {
  let count2 = 0;
  const end2 = Math.min(offset2, text2.length);
  for (let i2 = 0; i2 < end2; i2++) {
    if (text2.charCodeAt(i2) === 10) count2++;
  }
  return count2;
}
export function scrollTextareaToOffset(textarea, offset2, lineHeight) {
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;
  const line = countNewlinesBefore(textarea.value, offset2);
  const target = line * lineHeight - textarea.clientHeight / 2;
  textarea.scrollTop = Math.max(0, target);
}
export function resolveLineHeight(textarea) {
  const raw2 = window.getComputedStyle(textarea).lineHeight;
  const parsed = Number.parseFloat(raw2);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
}
export function buildFormatItems(editor, t2) {
  return [
    {
      id: "h1",
      label: t2("canvas.heading1"),
      icon: (
        <span className="text-[13px] font-semibold leading-none">
          H<sub className="text-[9px]">1</sub>
        </span>
      ),
      onClick: () =>
        editor
          .chain()
          .focus()
          .toggleHeading({
            level: 1,
          })
          .run(),
    },
    {
      id: "h2",
      label: t2("canvas.heading2"),
      icon: (
        <span className="text-[13px] font-semibold leading-none">
          H<sub className="text-[9px]">2</sub>
        </span>
      ),
      onClick: () =>
        editor
          .chain()
          .focus()
          .toggleHeading({
            level: 2,
          })
          .run(),
    },
    {
      id: "h3",
      label: t2("canvas.heading3"),
      icon: (
        <span className="text-[13px] font-semibold leading-none">
          H<sub className="text-[9px]">3</sub>
        </span>
      ),
      onClick: () =>
        editor
          .chain()
          .focus()
          .toggleHeading({
            level: 3,
          })
          .run(),
    },
    {
      id: "paragraph",
      label: t2("canvas.paragraph"),
      icon: <ParagraphIcon />,
      onClick: () => editor.chain().focus().setParagraph().run(),
    },
    {
      id: "bold",
      label: t2("canvas.bold"),
      icon: <BoldIcon />,
      separator: true,
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      id: "italic",
      label: t2("canvas.italic"),
      icon: <ItalicIcon />,
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      id: "bullet-list",
      label: t2("canvas.bulletList"),
      icon: <BulletListIcon />,
      separator: true,
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      id: "ordered-list",
      label: t2("canvas.orderedList"),
      icon: <OrderedListIcon />,
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
  ];
}
function getManager(editor) {
  return editor.storage.markdown?.manager;
}
function normalizeSerializedMarkdown(markdown2) {
  const lines = markdown2.split("\n");
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
function patchEntityEscaping(manager) {
  const original = manager.encodeTextForMarkdown;
  if (typeof original !== "function") return;
  manager.encodeTextForMarkdown = (text2, node2, parentNode2) => {
    const upstream = original.call(manager, text2, node2, parentNode2);
    if (upstream === text2) return text2;
    return text2.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };
}
function patchBlankLinePadding(manager) {
  const original = manager.serialize;
  if (typeof original !== "function") return;
  manager.serialize = (document2) => normalizeSerializedMarkdown(original.call(manager, document2));
}
export function preserveMarkdownFidelity(editor) {
  const manager = getManager(editor);
  if (!manager) return;
  patchEntityEscaping(manager);
  patchBlankLinePadding(manager);
}
const TABLE_SCROLL_VIEWPORT_SELECTOR = ".canvas-markdown-table-scroll-viewport";
function sameTargets(left, right) {
  return left.length === right.length && left.every((target, index2) => target === right[index2]);
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
    <OverlayScrollbar targetRef={targetRef} orientation="horizontal" placement="sticky" />,
    shell,
  );
}
function MarkdownTableScrollbarsInner({ editorRoot }) {
  const [targets, setTargets] = reactExports.useState([]);
  const targetIdsRef = reactExports.useRef(new WeakMap());
  const nextTargetIdRef = reactExports.useRef(1);
  reactExports.useEffect(() => {
    const syncTargets = () => {
      const next2 = editorRoot
        ? Array.from(editorRoot.querySelectorAll(TABLE_SCROLL_VIEWPORT_SELECTOR))
        : [];
      setTargets((current2) => (sameTargets(current2, next2) ? current2 : next2));
    };
    syncTargets();
    if (!editorRoot) return;
    const observer2 = new MutationObserver(syncTargets);
    observer2.observe(editorRoot, {
      childList: true,
      subtree: true,
    });
    return () => observer2.disconnect();
  }, [editorRoot]);
  const targetKey = (target) => {
    const existing = targetIdsRef.current.get(target);
    if (existing !== void 0) return existing;
    const next2 = nextTargetIdRef.current;
    nextTargetIdRef.current += 1;
    targetIdsRef.current.set(target, next2);
    return next2;
  };
  return (
    <>
      {targets.map((target) => (
        <MarkdownTableScrollbarPortal key={targetKey(target)} target={target} />
      ))}
    </>
  );
}
export const MarkdownTableScrollbars = reactExports.memo(MarkdownTableScrollbarsInner);
export function extractTableGridAtSelection(editor) {
  const { $from } = editor.state.selection;
  let tableNode = null;
  for (let depth2 = $from.depth; depth2 > 0; depth2--) {
    const node2 = $from.node(depth2);
    if (node2.type.name === "table") {
      tableNode = node2;
      break;
    }
  }
  if (!tableNode) return null;
  let headers = null;
  const rows = [];
  tableNode.forEach((row) => {
    if (row.type.name !== "tableRow") return;
    const cells2 = [];
    let isHeaderRow = false;
    row.forEach((cell) => {
      if (cell.type.name === "tableHeader") isHeaderRow = true;
      cells2.push(cell.textContent.trim());
    });
    if (isHeaderRow && headers === null) headers = cells2;
    else rows.push(cells2);
  });
  if (headers === null) {
    const first2 = rows.shift();
    if (!first2) return null;
    headers = first2;
  }
  if (headers.length === 0) return null;
  return {
    headers,
    rows,
  };
}
export function tableDocumentFromGrid(grid, untitledColumn = "Untitled") {
  const columns = grid.headers.map((title) => ({
    id: newColumnId(),
    title: title.trim() || untitledColumn,
    type: "text",
    visible: true,
    width: defaultColumnWidth("text"),
  }));
  const rows = grid.rows.map((cells2) => {
    const row = {
      id: newRowId(),
      cells: {},
    };
    columns.forEach((col, i2) => {
      row.cells[col.id] = cells2[i2] ?? "";
    });
    return row;
  });
  return {
    version: TABLE_DOCUMENT_VERSION,
    columns,
    rows,
  };
}
function clampToViewport(position2, menuRef, estimatedWidth = 240, estimatedHeight = 400) {
  const VIEWPORT_MARGIN2 = 8;
  const { x: x2, y: y4 } = position2;
  const el = menuRef.current;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const menuW = el?.offsetWidth || estimatedWidth;
  const menuH = el?.offsetHeight || estimatedHeight;
  const maxX = Math.max(VIEWPORT_MARGIN2, vw - menuW - VIEWPORT_MARGIN2);
  const maxY = Math.max(VIEWPORT_MARGIN2, vh - menuH - VIEWPORT_MARGIN2);
  return {
    x: Math.max(VIEWPORT_MARGIN2, Math.min(x2, maxX)),
    y: Math.max(VIEWPORT_MARGIN2, Math.min(y4, maxY)),
  };
}
export function useClampedMenuPosition({
  position: position2,
  estimatedWidth,
  estimatedHeight,
  getAnchorPosition,
}) {
  const menuRef = reactExports.useRef(null);
  const resolvePosition = reactExports.useCallback(
    () => getAnchorPosition?.(menuRef.current?.offsetHeight || estimatedHeight || 400) ?? position2,
    [getAnchorPosition, estimatedHeight, position2],
  );
  const [clampedPosition, setClampedPosition] = reactExports.useState(() =>
    clampToViewport(resolvePosition(), menuRef, estimatedWidth, estimatedHeight),
  );
  reactExports.useLayoutEffect(() => {
    setClampedPosition(
      clampToViewport(resolvePosition(), menuRef, estimatedWidth, estimatedHeight),
    );
  }, [resolvePosition, estimatedWidth, estimatedHeight]);
  reactExports.useEffect(() => {
    const updatePosition = () => {
      setClampedPosition((current2) => {
        const next2 = clampToViewport(resolvePosition(), menuRef, estimatedWidth, estimatedHeight);
        if (current2.x === next2.x && current2.y === next2.y) {
          return current2;
        }
        return next2;
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
const TABLE_OPS = [
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
function MenuItem$1({ icon, label, onClick, destructive, actionId }) {
  return (
    <ActionListItem
      onClick={onClick}
      data-action-ui-id={`canvas.md-table.${actionId}`}
      variant={destructive ? "destructive" : "default"}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">{icon}</span>
      <span>{label}</span>
    </ActionListItem>
  );
}
export function TableContextMenu({ editor, position: position2, onClose, onConvertToNode }) {
  const { t: t2 } = useTranslation();
  const { menuRef, clampedPosition } = useClampedMenuPosition({
    position: position2,
    estimatedWidth: 208,
    estimatedHeight: 360,
  });
  reactExports.useEffect(() => {
    const handleMouseDown2 = (e2) => {
      if (menuRef.current && !menuRef.current.contains(e2.target)) {
        onClose();
      }
    };
    const handleKeyDown2 = (e2) => {
      if (e2.key === "Escape") {
        e2.stopPropagation();
        onClose();
      }
    };
    const timer2 = setTimeout(() => {
      document.addEventListener("mousedown", handleMouseDown2);
      document.addEventListener("keydown", handleKeyDown2, {
        capture: true,
      });
    }, 0);
    return () => {
      clearTimeout(timer2);
      document.removeEventListener("mousedown", handleMouseDown2);
      document.removeEventListener("keydown", handleKeyDown2, {
        capture: true,
      });
    };
  }, [menuRef, onClose]);
  return reactDomExports.createPortal(
    <ActionListPanel
      ref={menuRef}
      data-testid="canvas-table-context-menu"
      className="min-w-52 max-h-[calc(100vh-16px)] overflow-y-auto"
      style={{
        position: "fixed",
        top: clampedPosition.y,
        left: clampedPosition.x,
        // Above the fullscreen modal (z-[9999] in text-fullscreen.tsx).
        zIndex: 1e4,
        animation: "context-menu-in 0.12s ease-out",
      }}
    >
      {TABLE_OPS.map((op) =>
        jsxRuntimeExports.jsxs(
          reactExports.Fragment,
          {
            children: [
              op.groupStart && <ActionListSeparator />,
              <MenuItem$1
                actionId={op.id}
                destructive={op.destructive}
                icon={<op.Icon size={16} strokeWidth={1.5} />}
                label={t2(op.labelKey)}
                onClick={() => {
                  op.run(editor);
                  onClose();
                }}
              />,
            ],
          },
          op.id,
        ),
      )}
      {onConvertToNode && (
        <>
          <ActionListSeparator />
          <MenuItem$1
            actionId="convert-to-node"
            icon={<Grid2x2Plus size={16} strokeWidth={1.5} />}
            label={t2("canvas.mdTable.toNode")}
            onClick={() => {
              onConvertToNode();
              onClose();
            }}
          />
        </>
      )}
    </ActionListPanel>,
    document.body,
  );
}
export const CONFLICT_CONTEXT_LINES = 2;
export const CONFLICT_MAX_HUNKS = 200;
export function splitConflictLines(text2) {
  return text2.length === 0 ? [] : text2.split("\n");
}
