// table-node-inner.jsx
import { reactExports, CompositedSvg, useTranslation, dedupedToast, useAssetMetadataStore, reactDomExports, classifyFileType, rangeTo, rangeFrom } from "../vendor.js";
import { getAnnotationMarks } from "./annotation-highlight.js";
import { NodeResizeFrame } from "../infra/create-html-iframe-pool-store.jsx";
import { FileTypeIcon } from "../infra/create-recently-added-store.jsx";
import { TABLE_CARD_DEFAULT_SIZE } from "../canvas/group-nodes-in-canvas.js";
import { useCanvasBridge, useCanvasIsMultiSelect, useCanvasIsBoxSelecting, useCanvasActions } from "../media-editing/parse-item.jsx";
import {
  areNodePropsEqual,
  useCanvasNodeIsDragging,
  AddToChatIcon,
  FullscreenIcon$1,
} from "../canvas/generating-media-area.jsx";
import { NodeHeader, NodeHandles } from "../canvas/use-inline-rename.jsx";
import { NodeToolbar } from "../media-editing/use-lightbox-media-actions.jsx";
import { NodeShell, NodeBody } from "../canvas/use-media-node-actions.jsx";
import {
  parseTableDocument,
  serializeTableDocument,
} from "./table-document-to-llm-content.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  PaperclipIcon,
  applyFilter,
  attachmentThumbnailUrl,
  getRowHeightLines,
  getRowHeightPx,
  visibleColumns,
} from "../media-editing/ready-sub-video-card.jsx";
import { TableFullscreenInner } from "./table-editor-inner.jsx";
const TableFullscreen = reactExports.memo(TableFullscreenInner);
const HEADER_HEIGHT = 32;
const FALLBACK_ROW_HEIGHT = 32;
const FALLBACK_COL_WIDTH = 200;
const ATTACHMENT_VERTICAL_PADDING = 4;
const MIN_ATTACHMENT_CHIP_SIZE = 18;
const MAX_PREVIEW_CHIPS = 2;
function TablePreviewInner({ doc: doc2, bodyHeight, bodyWidth }) {
  const { t: t2 } = useTranslation();
  const allColumns = reactExports.useMemo(() => (doc2 ? visibleColumns(doc2) : []), [doc2]);
  const rows = reactExports.useMemo(() => (doc2 ? applyFilter(doc2) : []), [doc2]);
  const rowHeightPx = doc2 ? getRowHeightPx(doc2) : FALLBACK_ROW_HEIGHT;
  const maxLines = doc2 ? getRowHeightLines(doc2) : 1;
  const columns = reactExports.useMemo(() => {
    if (allColumns.length === 0) return allColumns;
    const limit = Math.max(0, bodyWidth);
    let acc = 0;
    const out = [];
    for (const c3 of allColumns) {
      out.push(c3);
      acc += c3.width ?? FALLBACK_COL_WIDTH;
      if (acc >= limit) break;
    }
    return out;
  }, [allColumns, bodyWidth]);
  const footerHeight = 24;
  const availableHeight = bodyHeight - HEADER_HEIGHT;
  const maxRowSlots = Math.max(
    1,
    Math.floor(
      (availableHeight -
        (rows.length > Math.floor(availableHeight / rowHeightPx) ? footerHeight : 0)) /
        rowHeightPx,
    ),
  );
  const visibleRowCount = Math.min(rows.length, maxRowSlots);
  const displayRows = rows.slice(0, visibleRowCount);
  const hiddenRowCount = Math.max(0, rows.length - displayRows.length);
  Math.max(0, allColumns.length - columns.length);
  if (!doc2) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[12px] text-[var(--fg-muted,#999)]">
        {t2("canvas.table.loading", "Loading...")}
      </div>
    );
  }
  if (allColumns.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[12px] text-[var(--fg-muted,#999)]">
        {t2("canvas.table.empty", "No visible columns")}
      </div>
    );
  }
  return (
    <div className="flex h-full w-full flex-col overflow-hidden text-[12px]">
      <table className="w-full table-fixed border-collapse select-none">
        <colgroup>
          {columns.map((c3) => (
            <col
              key={c3.id}
              style={{
                width: c3.width ?? FALLBACK_COL_WIDTH,
              }}
            />
          ))}
        </colgroup>
        <thead>
          <tr
            style={{
              height: HEADER_HEIGHT,
            }}
          >
            {columns.map((c3) => (
              <th
                key={c3.id}
                className="border-b px-2 text-left font-normal"
                style={{
                  borderColor: "var(--canvas-node-border, #e5e5e5)",
                  background: "var(--bg-subtle, #fafafa)",
                  color: "var(--fg-muted, #525252)",
                }}
              >
                <span className="flex items-center gap-1 truncate">
                  <FieldIcon type={c3.type} />
                  <span className="truncate">{c3.title}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.length === 0 ? (
            <tr
              style={{
                height: rowHeightPx,
              }}
            >
              <td
                colSpan={columns.length}
                className="px-2 text-center"
                style={{
                  color: "var(--fg-muted, #999)",
                  borderBottom: "1px solid var(--canvas-node-border, #e5e5e5)",
                }}
              >
                {t2("canvas.table.noRows", "No rows")}
              </td>
            </tr>
          ) : (
            displayRows.map((row) => (
              <tr
                key={row.id}
                style={{
                  height: rowHeightPx,
                }}
              >
                {columns.map((c3) => (
                  <td
                    key={c3.id}
                    className="overflow-hidden align-top"
                    style={{
                      height: rowHeightPx,
                      borderBottom: "1px solid var(--canvas-node-border, #e5e5e5)",
                      color: "var(--fg-default, #141414)",
                    }}
                  >
                    <CellPreview
                      value={row.cells[c3.id]}
                      type={c3.type}
                      rowHeightPx={rowHeightPx}
                      maxLines={maxLines}
                    />
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {hiddenRowCount > 0 && (
        <div
          className="mt-auto flex gap-2 px-2 py-1 text-[10px]"
          style={{
            color: "var(--fg-muted, #999)",
          }}
        >
          {hiddenRowCount > 0 && (
            <span>
              {t2("canvas.table.moreRows", "+{{count}} rows", {
                count: hiddenRowCount,
              })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
const TablePreview = reactExports.memo(TablePreviewInner);
function CellPreview({ value, type: type2, rowHeightPx, maxLines }) {
  if (type2 === "attachment") {
    const list2 = Array.isArray(value) ? value : [];
    return <AttachmentPreviewList attachments={list2} rowHeightPx={rowHeightPx} />;
  }
  if (value == null || value === "") {
    return (
      <div
        className="flex h-full items-start px-2"
        style={{
          paddingTop: 4,
          paddingBottom: 4,
        }}
      >
        <span className="opacity-30">—</span>
      </div>
    );
  }
  if (type2 === "number") {
    return (
      <div
        className="flex h-full items-start justify-start px-2 tabular-nums"
        style={{
          paddingTop: 4,
          paddingBottom: 4,
        }}
      >
        <span className="block w-full truncate">{String(value)}</span>
      </div>
    );
  }
  const text2 = String(value);
  return (
    <div
      className="h-full px-2"
      style={{
        paddingTop: 4,
        paddingBottom: 4,
      }}
      title={text2}
    >
      <span
        className="block w-full overflow-hidden break-words"
        style={{
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: maxLines,
          whiteSpace: maxLines === 1 ? "normal" : "pre-wrap",
        }}
      >
        {text2}
      </span>
    </div>
  );
}
function AttachmentPreviewList({ attachments, rowHeightPx }) {
  if (attachments.length === 0) {
    return (
      <div
        className="flex h-full items-center px-2"
        style={{
          paddingTop: ATTACHMENT_VERTICAL_PADDING,
          paddingBottom: ATTACHMENT_VERTICAL_PADDING,
        }}
      >
        <span className="opacity-30">—</span>
      </div>
    );
  }
  const chipSize = Math.max(
    MIN_ATTACHMENT_CHIP_SIZE,
    rowHeightPx - ATTACHMENT_VERTICAL_PADDING * 2,
  );
  const visible = attachments.slice(0, MAX_PREVIEW_CHIPS);
  const overflow = attachments.length - visible.length;
  return (
    <div
      className="flex h-full items-center gap-1 overflow-hidden px-1"
      style={{
        paddingTop: ATTACHMENT_VERTICAL_PADDING,
        paddingBottom: ATTACHMENT_VERTICAL_PADDING,
      }}
    >
      {visible.map((att) => (
        <AttachmentPreviewChip key={att.assetId} attachment={att} size={chipSize} />
      ))}
      {overflow > 0 && (
        <span
          className="inline-flex shrink-0 items-center justify-center text-[10px] tabular-nums"
          style={{
            width: chipSize,
            height: chipSize,
            background: "var(--bg-subtle,#fafafa)",
            color: "var(--fg-muted,#666)",
            border: "1px solid var(--canvas-node-border,#e0e0e0)",
          }}
          title={`+${overflow}`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
function AttachmentPreviewChip({ attachment, size: size2 }) {
  const { t: t2 } = useTranslation();
  const meta2 = useAssetMetadataStore((s2) => s2.assets.get(attachment.assetId));
  const thumbnail = attachmentThumbnailUrl(attachment, meta2, size2);
  const [failedThumbnail, setFailedThumbnail] = reactExports.useState(null);
  const thumb = thumbnail === failedThumbnail ? void 0 : thumbnail;
  const missing = !meta2;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      style={{
        width: size2,
        height: size2,
      }}
      title={missing ? `${attachment.name} (missing)` : attachment.name}
    >
      <span
        className="flex h-full w-full items-center justify-center overflow-hidden"
        style={{
          background: thumb || !missing ? "var(--bg-subtle,#fafafa)" : "transparent",
          border: missing
            ? "1px dashed var(--canvas-node-border,#c0c0c0)"
            : thumb
              ? "1px solid var(--canvas-node-border,#e0e0e0)"
              : "none",
        }}
      >
        {thumb ? (
          <img
            src={thumb}
            onError={() => setFailedThumbnail(thumb)}
            alt={attachment.name}
            className="h-full w-full object-cover"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <FileTypeIcon
            {...classifyFileType({
              filename: attachment.name,
            })}
            size={size2 >= 30 ? 24 : 14}
            accessibleLabel={
              attachment.name.trim() ? attachment.name : t2("canvas.file.untitled", "Untitled")
            }
          />
        )}
      </span>
    </span>
  );
}
function FieldIcon({ type: type2 }) {
  if (type2 === "number") return <NumberIcon />;
  if (type2 === "attachment") return <PaperclipIcon />;
  return <TextFieldIcon />;
}
function TextFieldIcon() {
  return (
    <CompositedSvg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8.437 4.898 5.447 13h6.063L8.437 4.898Zm6.025 15.881L12.269 15h-7.56l-2.131 5.78a1 1 0 1 1-1.873-.703L7.02 2.982c.491-1.31 2.344-1.31 2.835 0l6.48 17.095a1 1 0 1 1-1.872.702ZM15.056 5a1 1 0 1 0 0 2H23a1 1 0 1 0 0-2h-7.944Zm1.055 7a1 1 0 0 1 1-1H23a1 1 0 1 1 0 2h-5.89a1 1 0 0 1-1-1Zm3.056 5a1 1 0 1 0 0 2H23a1 1 0 1 0 0-2h-3.833Z"
      />
    </CompositedSvg>
  );
}
function NumberIcon() {
  return (
    <CompositedSvg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8.774 2.14a1 1 0 0 1 .85 1.129L9.242 6h6.98l.423-3.01a1 1 0 1 1 1.98.279L18.242 6H22a1 1 0 1 1 0 2h-4.04l-.984 7H20a1 1 0 1 1 0 2h-3.305l-.575 4.093a1 1 0 1 1-1.98-.278L14.674 17h-6.98l-.575 4.093a1 1 0 1 1-1.98-.278L5.674 17H2a1 1 0 1 1 0-2h3.956l.984-7H4a1 1 0 1 1 0-2h3.221l.423-3.01a1 1 0 0 1 1.13-.85ZM14.956 15l.984-7H8.96l-.984 7h6.98Z"
      />
    </CompositedSvg>
  );
}
function TableNodeInner({ id: id2, selected: selected2, width, height, data: data2 }) {
  const { t: t2 } = useTranslation();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  const isDragging = useCanvasNodeIsDragging(id2);
  const isInteractiveSelect = !isMultiSelect && !isBoxSelecting && !isDragging;
  const tableData = data2 ?? {};
  const tablePath = tableData.tablePath;
  const title = tableData.title || t2("canvas.table.untitled", "Untitled table");
  const tableRevision = tableData.tableRevision;
  const [nodeWidth, setNodeWidth] = reactExports.useState(width || TABLE_CARD_DEFAULT_SIZE.width);
  const [nodeHeight, setNodeHeight] = reactExports.useState(
    height || TABLE_CARD_DEFAULT_SIZE.height,
  );
  reactExports.useEffect(() => {
    if (typeof width === "number" && width > 0) setNodeWidth(width);
  }, [width]);
  reactExports.useEffect(() => {
    if (typeof height === "number" && height > 0) setNodeHeight(height);
  }, [height]);
  const [doc2, setDoc] = reactExports.useState(null);
  const [loaded, setLoaded] = reactExports.useState(false);
  const [fullscreen, setFullscreen] = reactExports.useState(false);
  const appliedRevisionRef = reactExports.useRef(tableRevision);
  const { loadTableContent, saveTableContent, onAddToChat } = useCanvasBridge();
  const { updateNodeData } = useCanvasActions();
  reactExports.useEffect(() => {
    if (!tablePath || !loadTableContent) {
      setLoaded(true);
      return;
    }
    if (fullscreen) return;
    if (tableRevision === appliedRevisionRef.current && loaded) return;
    let cancelled = false;
    appliedRevisionRef.current = tableRevision;
    loadTableContent(tablePath)
      .then((raw2) => {
        if (cancelled) return;
        try {
          setDoc(parseTableDocument(raw2));
        } catch (err) {
          console.warn("[table-node] failed to parse", tablePath, err);
          setDoc(null);
        }
        setLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("[table-node] failed to load", tablePath, err);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tablePath, tableRevision, loadTableContent, fullscreen, loaded]);
  const handleDoubleClick2 = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      if (!loaded) return;
      setFullscreen(true);
    },
    [loaded],
  );
  const handleResize = reactExports.useCallback((newW, newH) => {
    setNodeWidth(newW);
    setNodeHeight(newH);
  }, []);
  const tableDataRef = reactExports.useRef(tableData);
  tableDataRef.current = tableData;
  const handleRename = reactExports.useCallback(
    (newName) => {
      updateNodeData(id2, {
        ...tableDataRef.current,
        title: newName,
      });
    },
    [id2, updateNodeData],
  );
  const handleAddToChat = reactExports.useCallback(() => {
    if (!tablePath || !onAddToChat) return;
    onAddToChat(tablePath, `${title}.htable`, id2);
  }, [tablePath, onAddToChat, title, id2]);
  const handleCloseFullscreen = reactExports.useCallback(
    (dirtyDoc) => {
      setFullscreen(false);
      if (!dirtyDoc) return;
      setDoc(dirtyDoc);
      if (tablePath && saveTableContent) {
        const serialized = serializeTableDocument(dirtyDoc);
        saveTableContent(tablePath, serialized).catch((err) => {
          console.error("[table-node] save failed", err);
          dedupedToast.error(t2("canvas.table.saveFailed", "Failed to save table"));
        });
      }
    },
    [tablePath, saveTableContent, t2],
  );
  const previewBodyHeight = reactExports.useMemo(() => Math.max(80, nodeHeight), [nodeHeight]);
  const previewBodyWidth = reactExports.useMemo(() => Math.max(120, nodeWidth), [nodeWidth]);
  const toolbarItems = reactExports.useMemo(
    () => [
      {
        id: "add-to-chat",
        label: t2("canvas.addToChat"),
        icon: <AddToChatIcon />,
        onClick: handleAddToChat,
      },
      {
        id: "fullscreen",
        label: t2("canvas.fullscreenEdit"),
        icon: <FullscreenIcon$1 />,
        onClick: () => {
          if (loaded) setFullscreen(true);
        },
      },
    ],
    [t2, handleAddToChat, loaded],
  );
  return (
    <NodeShell width={nodeWidth} dataActionUiId="canvas.table-node">
      <NodeHeader
        nodeType="table"
        name={title}
        selected={selected2}
        maxWidth={nodeWidth}
        onRename={handleRename}
        preserveExtension={false}
      />
      {selected2 && isInteractiveSelect && <NodeToolbar items={toolbarItems} visible={true} />}
      <NodeHandles nodeId={id2} selected={!!selected2} />
      <NodeBody
        width={nodeWidth}
        height={nodeHeight}
        selected={!!selected2}
        variant="panel"
        onDoubleClick={handleDoubleClick2}
      >
        <div
          style={{
            margin: "-12px -16px",
          }}
        >
          <TablePreview doc={doc2} bodyHeight={previewBodyHeight} bodyWidth={previewBodyWidth} />
        </div>
      </NodeBody>
      {selected2 && (
        <NodeResizeFrame
          nodeId={id2}
          minWidth={TABLE_CARD_DEFAULT_SIZE.width}
          minHeight={TABLE_CARD_DEFAULT_SIZE.height}
          onResize={handleResize}
        />
      )}
      {fullscreen && (
        <TableFullscreen
          initialDoc={doc2}
          title={title}
          onClose={handleCloseFullscreen}
          onTitleChange={handleRename}
        />
      )}
    </NodeShell>
  );
}
export const TableNode = reactExports.memo(TableNodeInner, areNodePropsEqual);
export function selectPendingHunksForNode(state2, nodeId) {
  if (!nodeId || !state2.session || state2.session.nodeId !== nodeId) return [];
  return state2.session.hunks.filter((hunk) => hunk.status === "pending");
}
export function selectHasPendingHunksForNode(state2, nodeId) {
  if (!nodeId || !state2.session || state2.session.nodeId !== nodeId) return false;
  return state2.session.hunks.some((hunk) => hunk.status === "pending");
}
export function selectAgentWriteSignalForNode(state2, nodeId) {
  if (!nodeId || !state2.session || state2.session.nodeId !== nodeId) return null;
  return state2.session.requestId;
}
const ABSOLUTE_URL_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
function joinAndNormalize(base2, rel) {
  const normalizedBase = base2.replace(/\\/g, "/").replace(/\/+$/g, "");
  const normalizedRel = rel.replace(/\\/g, "/");
  const combined = normalizedBase ? `${normalizedBase}/${normalizedRel}` : normalizedRel;
  const segments = [];
  for (const segment of combined.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (segments.length > 0) segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments.join("/");
}
export function deriveMdDir(filePath) {
  if (!filePath) return "";
  const normalized = filePath.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? normalized.slice(0, idx) : "";
}
export function resolveMarkdownAssetUrl(rawUrl, mdDir, resolveFileUrl) {
  if (!rawUrl) return rawUrl;
  if (rawUrl.startsWith("#")) return rawUrl;
  if (ABSOLUTE_URL_RE.test(rawUrl)) return rawUrl;
  if (!resolveFileUrl) return rawUrl;
  const stripped = rawUrl.startsWith("/") ? rawUrl.replace(/^\/+/, "") : rawUrl;
  const isAbsoluteFromRoot = rawUrl.startsWith("/");
  const joined = isAbsoluteFromRoot
    ? joinAndNormalize("", stripped)
    : joinAndNormalize(mdDir, stripped);
  if (!joined) return rawUrl;
  const resolved = resolveFileUrl(joined);
  return resolved || rawUrl;
}
const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogv|ogg)$/i;
const AUDIO_EXT_RE = /\.(mp3|wav|m4a|aac|flac|opus|oga)$/i;
export function classifyMarkdownAsset(url2) {
  if (!url2) return "image";
  const cleaned = url2.split("#")[0]?.split("?")[0] ?? "";
  if (VIDEO_EXT_RE.test(cleaned)) return "video";
  if (AUDIO_EXT_RE.test(cleaned)) return "audio";
  return "image";
}
const RICH_MARKDOWN_MAX_CHARS = 5e5;
export function isTextEditorContentReady(loaded, currentPath, loadedPath) {
  return loaded && (currentPath ? loadedPath === currentPath : loadedPath === null);
}
export function resolveTextEditorMode(markdown2, plain) {
  if (plain) return "plain-text";
  return markdown2.length <= RICH_MARKDOWN_MAX_CHARS ? "rich-markdown" : "source-markdown";
}
export function AnnotationGutter({ editor, markers, activeId, anchorEl, onActivate }) {
  const [positions, setPositions] = reactExports.useState({});
  reactExports.useLayoutEffect(() => {
    if (!anchorEl) return;
    let raf = 0;
    const compute = () => {
      const hostTop = anchorEl.getBoundingClientRect().top;
      const next2 = {};
      for (const m3 of markers) {
        if (m3.seq == null) continue;
        try {
          const coords = editor.view.coordsAtPos(m3.from);
          next2[m3.id] = coords.top - hostTop;
        } catch {}
      }
      setPositions(next2);
    };
    raf = requestAnimationFrame(compute);
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [editor, anchorEl, markers]);
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 w-0">
      {markers.map((m3) => {
        if (m3.seq == null) return null;
        const top2 = positions[m3.id];
        if (top2 == null) return null;
        const active2 = m3.id === activeId;
        return (
          <button
            key={m3.id}
            type="button"
            data-annotation-badge={m3.id}
            onClick={() => onActivate(m3.id)}
            className="pointer-events-auto absolute flex h-[18px] w-[18px] -translate-y-0.5 items-center justify-center rounded-full text-xs font-medium transition-transform hover:scale-110"
            style={{
              top: top2,
              right: -25,
              background: active2 ? "var(--canvas-text-accent)" : "var(--canvas-text-accent-soft)",
              color: active2 ? "var(--canvas-text-accent-foreground)" : "var(--canvas-text-accent)",
              boxShadow: active2 ? "0 0 0 2px var(--canvas-text-accent)" : "none",
            }}
            title={`#${m3.seq}`}
          >
            {m3.seq}
          </button>
        );
      })}
    </div>
  );
}
const POPOVER_WIDTH = 320;
const GAP = 8;
const FALLBACK_HEIGHT = 120;
export function AnnotationInput({
  editor,
  annotationId,
  value,
  placeholder,
  portalTarget,
  boundsEl,
  onChange,
  onClose,
}) {
  const getBounds = reactExports.useCallback(() => {
    const el = boundsEl ?? portalTarget;
    const rect = el?.getBoundingClientRect();
    const left = rect && rect.width > 0 ? rect.left : 0;
    const right = rect && rect.width > 0 ? rect.right : window.innerWidth;
    return {
      left,
      right,
      top: 0,
      bottom: window.innerHeight,
    };
  }, [boundsEl, portalTarget]);
  const { t: t2 } = useTranslation();
  const cardRef = reactExports.useRef(null);
  const textareaRef = reactExports.useRef(null);
  const [pos, setPos] = reactExports.useState(null);
  reactExports.useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
    return () => cancelAnimationFrame(raf);
  }, []);
  reactExports.useLayoutEffect(() => {
    const compute = () => {
      const mark2 = getAnnotationMarks(editor).find((m3) => m3.id === annotationId);
      if (!mark2) return;
      try {
        const start2 = editor.view.coordsAtPos(mark2.from);
        const end2 = editor.view.coordsAtPos(mark2.to);
        const selTop = Math.min(start2.top, end2.top);
        const selBottom = Math.max(start2.bottom, end2.bottom);
        const card = cardRef.current;
        const height = card?.offsetHeight || FALLBACK_HEIGHT;
        const width = card?.offsetWidth || POPOVER_WIDTH;
        const bounds = getBounds();
        const left = Math.max(bounds.left + GAP, Math.min(start2.left, bounds.right - width - GAP));
        let top2 = selBottom + GAP;
        if (top2 + height + GAP > bounds.bottom) {
          const above = selTop - height - GAP;
          top2 = above >= bounds.top + GAP ? above : bounds.bottom - height - GAP;
        }
        top2 = Math.max(bounds.top + GAP, top2);
        setPos({
          left,
          top: top2,
        });
      } catch {}
    };
    compute();
    const onScroll = () => compute();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    const onTransaction = () => compute();
    editor.on("transaction", onTransaction);
    const ro = cardRef.current ? new ResizeObserver(() => compute()) : null;
    if (ro && cardRef.current) ro.observe(cardRef.current);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      editor.off("transaction", onTransaction);
      ro?.disconnect();
    };
  }, [editor, annotationId, getBounds]);
  const node2 = (
    // biome-ignore lint/a11y/noStaticElementInteractions: onMouseDown only guards textarea focus (prevents blur-close when clicking the popover chrome)
    <div
      ref={cardRef}
      data-canvas-chrome="true"
      className="fixed z-[10110] flex flex-col gap-2 rounded-xl border p-3 animate-[toolbar-fade-in_0.12s_ease-out]"
      style={{
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        width: POPOVER_WIDTH,
        background: "var(--canvas-node-bg, #fff)",
        borderColor: "var(--canvas-node-border, rgba(0,0,0,0.08))",
        boxShadow: "0 6px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)",
        // Hidden until positioned to avoid a first-frame flash at (0,0).
        opacity: pos ? 1 : 0,
        pointerEvents: pos ? "auto" : "none",
      }}
      onMouseDown={(e2) => {
        if (e2.target !== textareaRef.current) e2.preventDefault();
      }}
    >
      <textarea
        ref={textareaRef}
        rows={2}
        value={value}
        placeholder={placeholder}
        onChange={(e2) => onChange(e2.currentTarget.value)}
        onBlur={onClose}
        onKeyDown={(e2) => {
          e2.stopPropagation();
          if (e2.nativeEvent.isComposing || e2.keyCode === 229) return;
          if (e2.key === "Escape") {
            e2.preventDefault();
            onClose();
            return;
          }
          if (e2.key === "Enter" && !e2.shiftKey) {
            e2.preventDefault();
            onClose();
          }
        }}
        className="max-h-40 min-h-[3rem] w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-[var(--fg-disabled,#919191)]"
        style={{
          color: "var(--fg-default, #141414)",
          caretColor: "var(--canvas-text-accent)",
        }}
      />
      <div
        className="flex items-center justify-between border-t pt-2"
        style={{
          borderColor: "var(--canvas-node-border, rgba(0,0,0,0.06))",
        }}
      >
        <span
          className="text-[11px]"
          style={{
            color: "var(--fg-disabled, #919191)",
          }}
        >
          {t2("canvas.annotationHint", "Enter 确认 · Shift+Enter 换行")}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-90"
          style={{
            background: "var(--canvas-text-accent)",
            color: "var(--canvas-text-accent-foreground)",
          }}
        >
          {t2("canvas.annotationConfirm", "完成")}
        </button>
      </div>
    </div>
  );
  return reactDomExports.createPortal(node2, document.body);
}
(() => {
  let numbers =
    "lc,34,7n,7,7b,19,,,,2,,2,,,20,b,1c,l,g,,2t,7,2,6,2,2,,4,z,,u,r,2j,b,1m,9,9,,o,4,,9,,3,,5,17,3,3b,f,,w,1j,,,,4,8,4,,3,7,a,2,t,,1m,,,,2,4,8,,9,,a,2,q,,2,2,1l,,4,2,4,2,2,3,3,,u,2,3,,b,2,1l,,4,5,,2,4,,k,2,m,6,,,1m,,,2,,4,8,,7,3,a,2,u,,1n,,,,c,,9,,14,,3,,1l,3,5,3,,4,7,2,b,2,t,,1m,,2,,2,,3,,5,2,7,2,b,2,s,2,1l,2,,,2,4,8,,9,,a,2,t,,20,,4,,2,3,,,8,,29,,2,7,c,8,2q,,2,9,b,6,22,2,r,,,,,,1j,e,,5,,2,5,b,,10,9,,2u,4,,6,,2,2,2,p,2,4,3,g,4,d,,2,2,6,,f,,jj,3,qa,3,t,3,t,2,u,2,1s,2,,7,8,,2,b,9,,19,3,3b,2,y,,3a,3,4,2,9,,6,3,63,2,2,,1m,,,7,,,,,2,8,6,a,2,,1c,h,1r,4,1c,7,,,5,,14,9,c,2,w,4,2,2,,3,1k,,,2,3,,,3,1m,8,2,2,48,3,,d,,7,4,,6,,3,2,5i,1m,,5,ek,,5f,x,2da,3,3x,,2o,w,fe,6,2x,2,n9w,4,,a,w,2,28,2,7k,,3,,4,,p,2,5,,47,2,q,i,d,,12,8,p,b,1a,3,1c,,2,4,2,2,13,,1v,6,2,2,2,2,c,,8,,1b,,1f,,,3,2,2,5,2,,,16,2,8,,6m,,2,,4,,fn4,,kh,g,g,g,a6,2,gt,,6a,,45,5,1ae,3,,2,5,4,14,3,4,,4l,2,fx,4,ar,2,49,b,4w,,1i,f,1k,3,1d,4,2,2,1x,3,10,5,,8,1q,,c,2,1g,9,a,4,2,,2n,3,2,,,2,6,,4g,,3,8,l,2,1l,2,,,,,m,,e,7,3,5,5f,8,2,3,,,n,,29,,2,6,,,2,,,2,,2,6j,,2,4,6,2,,2,r,2,2d,8,2,,,2,2y,,,,2,6,,,2t,3,2,4,,5,77,9,,2,6t,,a,2,,,4,,40,4,2,2,4,,w,a,14,6,2,4,8,,9,6,2,3,1a,d,,2,ba,7,,6,,,2a,m,2,7,,2,,2,3e,6,3,,,2,,7,,,20,2,3,,,,9n,2,f0b,5,1n,7,t4,,1r,4,29,,f5k,2,43q,,,3,4,5,8,8,2,7,u,4,44,3,1iz,1j,4,1e,8,,e,,m,5,,f,11s,7,,h,2,7,,2,,5,79,7,c5,4,15s,7,31,7,240,5,gx7k,2o,3k,6o"
      .split(",")
      .map((s2) => (s2 ? parseInt(s2, 36) : 1));
  for (let i2 = 0, n2 = 0; i2 < numbers.length; i2++)
    (i2 % 2 ? rangeTo : rangeFrom).push((n2 = n2 + numbers[i2]));
})();
