// field-row.jsx
import {
  CompositedSvg,
  reactDomExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { DragHandleIcon, TrashIcon } from "./canvas-sticker-assets.jsx";
import { MoreVerticalIcon$1 } from "../canvas/fullscreen-icon.jsx";

const COLUMN_DRAG_MIME = "application/x-table-column-id";

const MENU_WIDTH = 140;

const MENU_GAP = 4;

function MenuItem$2({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 items-center gap-2 rounded-md px-3 text-left text-[12px] transition-colors hover:bg-[var(--canvas-controls-hover,#0000000d)]"
      style={{
        color: "var(--fg-default,#141414)",
      }}
    >
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center"
        style={{
          color: "var(--fg-muted,#525252)",
        }}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function FieldTypeIcon$1({ type: type2 }) {
  if (type2 === "number") {
    return (
      <CompositedSvg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M8.774 2.14a1 1 0 0 1 .85 1.129L9.242 6h6.98l.423-3.01a1 1 0 1 1 1.98.279L18.242 6H22a1 1 0 1 1 0 2h-4.04l-.984 7H20a1 1 0 1 1 0 2h-3.305l-.575 4.093a1 1 0 1 1-1.98-.278L14.674 17h-6.98l-.575 4.093a1 1 0 1 1-1.98-.278L5.674 17H2a1 1 0 1 1 0-2h3.956l.984-7H4a1 1 0 1 1 0-2h3.221l.423-3.01a1 1 0 0 1 1.13-.85ZM14.956 15l.984-7H8.96l-.984 7h6.98Z"
        />
      </CompositedSvg>
    );
  }
  if (type2 === "attachment") {
    return (
      <CompositedSvg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M12.304 7.315a1 1 0 0 1 1.414 1.414L8.13 14.317a1.485 1.485 0 0 0 0 2.1l.01.011a1.5 1.5 0 0 0 2.117-.005l7.43-7.43a3.5 3.5 0 0 0 0-4.95l-.036-.037a3.5 3.5 0 0 0-4.95 0l-7.778 7.777a5.521 5.521 0 0 0 7.808 7.809l7.07-7.07a1 1 0 0 1 1.415 1.414l-7.07 7.07A7.521 7.521 0 0 1 3.509 10.37l7.778-7.778a5.5 5.5 0 0 1 7.778 0l.037.037a5.5 5.5 0 0 1 0 7.778l-7.43 7.43a3.5 3.5 0 0 1-4.939.012l-.006-.006-.012-.012a3.485 3.485 0 0 1 0-4.928l5.589-5.588Z"
        />
      </CompositedSvg>
    );
  }
  return (
    <CompositedSvg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M8.437 4.898 5.447 13h6.063L8.437 4.898Zm6.025 15.881L12.269 15h-7.56l-2.131 5.78a1 1 0 1 1-1.873-.703L7.02 2.982c.491-1.31 2.344-1.31 2.835 0l6.48 17.095a1 1 0 1 1-1.872.702ZM15.056 5a1 1 0 1 0 0 2H23a1 1 0 1 0 0-2h-7.944Zm1.055 7a1 1 0 0 1 1-1H23a1 1 0 1 1 0 2h-5.89a1 1 0 0 1-1-1Zm3.056 5a1 1 0 1 0 0 2H23a1 1 0 1 0 0-2h-3.833Z"
      />
    </CompositedSvg>
  );
}

function EditIcon() {
  return (
    <CompositedSvg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}

function FieldRowMenu({ anchorRef, onClose, onEdit, onDelete }) {
  const { t: t2 } = useTranslation();
  const menuRef = reactExports.useRef(null);
  const [pos, setPos] = reactExports.useState(null);
  reactExports.useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    let left = rect.right + MENU_GAP;
    if (left + MENU_WIDTH > window.innerWidth - 8) {
      left = rect.left - MENU_WIDTH - MENU_GAP;
    }
    if (left < 8) left = 8;
    setPos({
      top: rect.top,
      left,
    });
  }, [anchorRef]);
  reactExports.useEffect(() => {
    const handler = (e2) => {
      const target = e2.target;
      if (menuRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    const id2 = window.setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 0);
    return () => {
      window.clearTimeout(id2);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose, anchorRef.current?.contains]);
  if (!pos) return null;
  return reactDomExports.createPortal(
    <div
      ref={menuRef}
      data-field-row-menu="true"
      className="flex w-[140px] flex-col gap-0.5 rounded-lg p-1 shadow-xl overflow-hidden"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: MENU_WIDTH,
        // Above the fullscreen modal (z-[9999] in table-fullscreen.tsx).
        zIndex: 1e4,
        background: "var(--canvas-node-bg, #fff)",
        border: "1px solid var(--canvas-node-border, #e0e0e0)",
        animation: "context-menu-in 0.12s ease-out",
      }}
    >
      <MenuItem$2
        icon={<EditIcon />}
        label={t2("canvas.table.field.edit", "Edit")}
        onClick={onEdit}
      />
      <MenuItem$2
        icon={<TrashIcon />}
        label={t2("canvas.table.field.delete", "Delete")}
        onClick={onDelete}
      />
    </div>,
    document.body,
  );
}

function EyeIcon() {
  return (
    <CompositedSvg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M11.985 18.5c3.238 0 6.236-2.06 9.015-6.513C18.292 7.55 15.3 5.5 11.985 5.5 8.67 5.5 5.689 7.549 3 11.987c2.76 4.454 5.748 6.513 8.985 6.513ZM1.502 12.89a1.782 1.782 0 0 1 .023-1.838C4.428 6.017 7.915 3.5 11.984 3.5c4.086 0 7.594 2.538 10.523 7.614l.028.048c.296.519.294 1.16-.01 1.675-3.006 5.108-6.52 7.663-10.541 7.663-4.007 0-7.501-2.537-10.482-7.61ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}

function EyeOffIcon() {
  return (
    <CompositedSvg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2.032 8.172a1 1 0 0 1 1.388.267C5.263 11.159 8.637 13 12 13c3.364 0 6.737-1.841 8.58-4.561a1 1 0 0 1 1.656 1.122 11.928 11.928 0 0 1-2.002 2.259l2.009 2.008a1 1 0 1 1-1.415 1.415l-2.12-2.122a1.003 1.003 0 0 1-.085-.096c-.745.472-1.54.87-2.368 1.181l.712 2.658a1 1 0 1 1-1.932.517l-.702-2.62A11.64 11.64 0 0 1 12 15c-.71 0-1.42-.068-2.118-.197l-.691 2.578a1 1 0 1 1-1.932-.517l.692-2.582a13.01 13.01 0 0 1-2.607-1.278c-.03.04-.064.08-.101.117L3.12 15.243a1 1 0 1 1-1.414-1.415l2.032-2.032a11.919 11.919 0 0 1-1.974-2.235 1 1 0 0 1 .267-1.389Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}

export function FieldRow({ column, onToggle, onRename, onDelete, onMove }) {
  const { t: t2 } = useTranslation();
  const visible = column.visible !== false;
  const [editing, setEditing] = reactExports.useState(false);
  const [menuOpen, setMenuOpen] = reactExports.useState(false);
  const [dropEdge, setDropEdge] = reactExports.useState(null);
  const inputRef = reactExports.useRef(null);
  const moreButtonRef = reactExports.useRef(null);
  const rowRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing]);
  const commitEdit = () => {
    const next2 = inputRef.current?.value ?? column.title;
    if (next2.trim() !== column.title) onRename(next2);
    setEditing(false);
  };
  const handleDragStart = (e2) => {
    e2.dataTransfer.setData(COLUMN_DRAG_MIME, column.id);
    e2.dataTransfer.effectAllowed = "move";
    if (rowRef.current) {
      e2.dataTransfer.setDragImage(
        rowRef.current,
        12,
        rowRef.current.offsetHeight / 2,
      );
    }
  };
  const handleDragOver = (e2) => {
    if (!e2.dataTransfer.types.includes(COLUMN_DRAG_MIME)) return;
    e2.preventDefault();
    e2.dataTransfer.dropEffect = "move";
    const rect = e2.currentTarget.getBoundingClientRect();
    const isAfter2 = e2.clientY > rect.top + rect.height / 2;
    setDropEdge(isAfter2 ? "after" : "before");
  };
  const handleDragLeave = (e2) => {
    if (!e2.currentTarget.contains(e2.relatedTarget)) {
      setDropEdge(null);
    }
  };
  const handleDrop2 = (e2) => {
    const fromId = e2.dataTransfer.getData(COLUMN_DRAG_MIME);
    const edge = dropEdge;
    setDropEdge(null);
    if (!fromId || fromId === column.id || !edge) return;
    e2.preventDefault();
    onMove(fromId, column.id, edge);
  };
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: native drag-over/drop target for HTML5 drag-and-drop; row click stays on the inner content.
    <div
      ref={rowRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop2}
      className="group relative flex items-center gap-1.5 rounded-md px-1 py-1.5 transition-colors hover:bg-[var(--canvas-controls-hover,#0000000d)]"
    >
      {dropEdge === "before" && (
        <span
          aria-hidden={true}
          className="pointer-events-none absolute left-1 right-1 top-0 h-[2px] rounded-full"
          style={{
            background: "var(--canvas-accent, #3b82f6)",
          }}
        />
      )}
      {dropEdge === "after" && (
        <span
          aria-hidden={true}
          className="pointer-events-none absolute bottom-0 left-1 right-1 h-[2px] rounded-full"
          style={{
            background: "var(--canvas-accent, #3b82f6)",
          }}
        />
      )}
      <span
        draggable={true}
        onDragStart={handleDragStart}
        onDragEnd={() => setDropEdge(null)}
        className="flex h-5 w-3 shrink-0 cursor-grab items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        style={{
          color: "var(--fg-muted,#999)",
        }}
        title={t2("canvas.table.dragField", "Drag to reorder")}
      >
        <DragHandleIcon />
      </span>
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center"
        style={{
          color: "var(--fg-muted,#525252)",
        }}
      >
        <FieldTypeIcon$1 type={column.type} />
      </span>
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          defaultValue={column.title}
          onBlur={commitEdit}
          onKeyDown={(e2) => {
            e2.stopPropagation();
            if (e2.key === "Enter") {
              e2.preventDefault();
              commitEdit();
            } else if (e2.key === "Escape") {
              e2.preventDefault();
              setEditing(false);
            }
          }}
          className="flex-1 min-w-0 bg-[var(--bg-subtle,#fafafa)] px-1 text-[12px] outline-none"
          style={{
            color: "var(--fg-default,#141414)",
          }}
        />
      ) : (
        // biome-ignore lint/a11y/noStaticElementInteractions: row-level edit shortcut, primary action via menu
        <span
          onDoubleClick={() => setEditing(true)}
          className="flex-1 min-w-0 truncate text-[12px]"
          style={{
            color: "var(--fg-default,#141414)",
          }}
          title={column.title}
        >
          {column.title}
        </span>
      )}
      <button
        type="button"
        onClick={onToggle}
        title={
          visible
            ? t2("canvas.table.hideField", "Hide")
            : t2("canvas.table.showField", "Show")
        }
        className="flex h-6 w-6 shrink-0 items-center justify-center transition-colors hover:bg-[var(--canvas-controls-hover,#0000000d)]"
        style={{
          color: "var(--fg-muted,#666)",
        }}
      >
        {visible ? <EyeIcon /> : <EyeOffIcon />}
      </button>
      <div className="shrink-0">
        <button
          ref={moreButtonRef}
          type="button"
          onClick={() => setMenuOpen((v2) => !v2)}
          title={t2("canvas.table.fieldMore", "More")}
          className="flex h-6 w-6 items-center justify-center transition-colors hover:bg-[var(--canvas-controls-hover,#0000000d)]"
          style={{
            color: "var(--fg-muted,#666)",
            background: menuOpen ? "var(--bg-subtle,#eee)" : void 0,
          }}
        >
          <MoreVerticalIcon$1 size={14} />
        </button>
        {menuOpen && (
          <FieldRowMenu
            anchorRef={moreButtonRef}
            onClose={() => setMenuOpen(false)}
            onEdit={() => {
              setMenuOpen(false);
              setEditing(true);
            }}
            onDelete={() => {
              setMenuOpen(false);
              onDelete();
            }}
          />
        )}
      </div>
    </div>
  );
}
