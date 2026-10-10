// markdown-fullscreen.jsx
import {
  closeDiffReviewHistoryGroup,
  DIFF_REVIEW_SYNC_META,
  getDiffReviewHistorySnapshot,
  LEAF_PLACEHOLDER,
  MARKDOWN_TABLE_CELL_MAX_WIDTH,
  recordFinalizedBoundary,
  replaceEditorMarkdown,
  restoreEditorSelection,
  rewindReviewHistory,
  ScrollableMarkdownTableView,
} from "./scrollable-markdown-table-view.js";
import {
  buildDeletedBlock,
  buildDeletedInline,
  compileFindPattern,
  computeReplacement,
  findMatchesInText,
  isInlineTextReplacement,
  MAX_FIND_MATCHES,
  paragraphLinePlacement,
  topLevelBlockAt,
} from "./paragraph-line-placement.js";
import {
  beginDiffReviewWriteAckEpoch,
  buildDecorations,
  DIFF_REVIEW_WRITE_ACK_TTL_MS,
  FIND_MATCH_ACTIVE_CLASS,
  findPluginKey,
  hashDiffReviewMarkdown,
  MAX_PENDING_DIFF_REVIEW_WRITE_ACKS,
  pruneExpiredDiffReviewWriteAcks,
  reconstructDiffReviewBaseline,
} from "./build-decorations.js";
import { ActionListPanel, ActionListSeparator, BubbleMenu, commands_exports, Decoration$1 as Decoration, DecorationSet, EditorContent, Extension, Grid2x2Plus, jsxRuntimeExports, Plugin, PluginKey, reactDomExports, reactExports, redo$1 as redo, src_default$1, Table$2 as Table, TableCell$1 as TableCell, TableHeader$1 as TableHeader, TableRow$1 as TableRow, TextSelection, undo$1 as undo, undoDepth$1 as undoDepth, useEditor, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { AnnotationIcon } from "../canvas/fullscreen-icon.jsx";
import {
  EditorHistoryControls,
  ToolbarBtn,
  ToolbarSeparator,
} from "./editor-history-controls.jsx";
import {
  defaultColumnWidth,
  newColumnId,
  newRowId,
  TABLE_DOCUMENT_VERSION,
} from "../canvas/is-reexecutable-generation-node.js";
import {
  getManager,
  MarkdownTableScrollbarsInner,
  MenuItem,
  patchBlankLinePadding,
  patchEntityEscaping,
  TABLE_OPS,
  useClampedMenuPosition,
} from "./table-ops.jsx";
import { ParagraphIcon } from "../canvas/file-missing-icon.jsx";
import {
  BoldIcon,
  BulletListIcon,
  ItalicIcon,
  OrderedListIcon,
} from "../canvas/generating-media-area.jsx";
import {
  buildControls,
  DIFF_ADD_CLASS,
  DIFF_CONTROLS_CLASS,
  diffReviewPluginKey,
} from "./build-controls.js";
import { useCanvasActive } from "../media-editing/package.jsx";
import { useDiffReviewStore } from "./use-diff-review-store.js";
import {
  annotationPluginKey,
  getAnnotationHistorySnapshot,
  getAnnotationSelectionRanges,
} from "./configuration2.js";
import { MarkdownManager } from "./markdown-manager.js";
import { buildPmSelectionState } from "../vendor-inline/codemirror/delete-markup-backward.js";
import { DiffPendingDialog } from "./diff-pending-dialog.jsx";
import { recordProvisionalDiffReviewHistory } from "./record-provisional-diff-review-history.js";
import { useAnnotations } from "./use-annotations.js";
import { CanvasActionsContext } from "../media-editing/use-canvas-actions.js";
import {
  AnnotationGutter,
  selectHasPendingHunksForNode,
} from "./annotation-gutter.jsx";
import { AnnotationInput } from "./annotation-input.jsx";
import { useCanvasRootElement } from "../media-editing/director-stage-header-icon.jsx";
import { src_default } from "../generation/attachment-bar.jsx";
import { FullscreenShell } from "./find-bar.jsx";
import {
  decideFullscreenCloseAction,
  TextSaveStatus,
  useEditingSelectionReporter,
  useFindEscapeClose,
} from "../canvas/text-save-status.jsx";
import { useDebouncedDraftSave } from "../canvas/use-debounced-draft-save.js";
import { useExternalRevisionSync } from "../canvas/use-external-revision-sync.js";
import { useDiffReview } from "./use-diff-review.js";
import { useFindController } from "./use-find-controller.js";
import { useTextConflictResolver } from "./use-text-conflict-resolver.jsx";
import { useTextDocumentDirty } from "./text-diff-hunk-view.jsx";
import { useTextVersionPanel } from "./use-text-version-panel.jsx";
function assumeContentType(content2, contentType) {
  if (typeof content2 !== "string") return "json";
  return contentType;
}
const Markdown = Extension.create({
  name: "markdown",
  addOptions() {
    return {
      indentation: {
        style: "space",
        size: 2,
      },
      marked: void 0,
      markedOptions: {},
    };
  },
  addCommands() {
    return {
      setContent: (content2, options) => {
        if (
          !(options === null || options === void 0
            ? void 0
            : options.contentType)
        )
          return commands_exports.setContent(content2, options);
        if (
          assumeContentType(
            content2,
            options === null || options === void 0
              ? void 0
              : options.contentType,
          ) !== "markdown" ||
          !this.editor.markdown
        )
          return commands_exports.setContent(content2, options);
        const mdContent = this.editor.markdown.parse(content2);
        return commands_exports.setContent(mdContent, options);
      },
      insertContent: (value, options) => {
        if (
          !(options === null || options === void 0
            ? void 0
            : options.contentType)
        )
          return commands_exports.insertContent(value, options);
        if (
          assumeContentType(
            value,
            options === null || options === void 0
              ? void 0
              : options.contentType,
          ) !== "markdown" ||
          !this.editor.markdown
        )
          return commands_exports.insertContent(value, options);
        const mdContent = this.editor.markdown.parse(value);
        return commands_exports.insertContent(mdContent, options);
      },
      insertContentAt: (position2, value, options) => {
        if (
          !(options === null || options === void 0
            ? void 0
            : options.contentType)
        )
          return commands_exports.insertContentAt(position2, value, options);
        if (
          assumeContentType(
            value,
            options === null || options === void 0
              ? void 0
              : options.contentType,
          ) !== "markdown" ||
          !this.editor.markdown
        )
          return commands_exports.insertContentAt(position2, value, options);
        const mdContent = this.editor.markdown.parse(value);
        return commands_exports.insertContentAt(position2, mdContent, options);
      },
    };
  },
  addStorage() {
    return {
      manager: new MarkdownManager({
        indentation: this.options.indentation,
        marked: this.options.marked,
        markedOptions: this.options.markedOptions,
        extensions: [],
      }),
    };
  },
  onBeforeCreate() {
    var _json$content;
    if (this.editor.markdown) {
      console.error(
        "[tiptap][markdown]: There is already a `markdown` property on the editor instance. This might lead to unexpected behavior.",
      );
      return;
    }
    this.storage.manager = new MarkdownManager({
      indentation: this.options.indentation,
      marked: this.options.marked,
      markedOptions: this.options.markedOptions,
      extensions: this.editor.extensionManager.baseExtensions,
    });
    this.editor.markdown = this.storage.manager;
    this.editor.getMarkdown = () => {
      return this.storage.manager.serialize(this.editor.getJSON());
    };
    if (!this.editor.options.contentType) return;
    if (
      assumeContentType(
        this.editor.options.content,
        this.editor.options.contentType,
      ) !== "markdown"
    )
      return;
    if (!this.editor.markdown)
      throw new Error(
        '[tiptap][markdown]: The `contentType` option is set to "markdown", but the Markdown extension is not added to the editor. Please add the Markdown extension to use this feature.',
      );
    if (
      this.editor.options.content === void 0 ||
      typeof this.editor.options.content !== "string"
    )
      throw new Error(
        '[tiptap][markdown]: The `contentType` option is set to "markdown", but the initial content is not a string. Please provide the initial content as a markdown string.',
      );
    const json2 = this.editor.markdown.parse(this.editor.options.content);
    if (
      (_json$content = json2.content) === null || _json$content === void 0
        ? void 0
        : _json$content.length
    )
      this.editor.options.content = json2;
  },
});
const ANNOTATION_CLASS = "canvas-annotation-mark";
const ANNOTATION_ACTIVE_CLASS = "canvas-annotation-mark-active";
const AnnotationHighlight = Extension.create({
  name: "canvasAnnotation",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: annotationPluginKey,
        state: {
          init() {
            return {
              marks: [],
              activeId: null,
            };
          },
          apply(tr2, prev) {
            const meta2 = tr2.getMeta(annotationPluginKey);
            const historySnapshot = getAnnotationHistorySnapshot(tr2);
            let next2 = historySnapshot
              ? {
                  marks: historySnapshot.marks.map((mark2) => ({
                    ...mark2,
                  })),
                  activeId: null,
                }
              : prev;
            if (!historySnapshot && meta2) {
              switch (meta2.kind) {
                case "add":
                  next2 = {
                    ...next2,
                    marks: [...next2.marks, meta2.mark],
                  };
                  break;
                case "remove":
                  next2 = {
                    marks: next2.marks.filter((m3) => m3.id !== meta2.id),
                    activeId:
                      next2.activeId === meta2.id ? null : next2.activeId,
                  };
                  break;
                case "clear":
                  next2 = {
                    marks: [],
                    activeId: null,
                  };
                  break;
                case "setActive":
                  next2 = {
                    ...next2,
                    activeId: meta2.id,
                  };
                  break;
              }
            }
            if (tr2.docChanged && !historySnapshot) {
              const mapped = next2.marks.map((m3) => ({
                id: m3.id,
                from: tr2.mapping.map(m3.from, -1),
                to: tr2.mapping.map(m3.to, 1),
              }));
              next2 = {
                ...next2,
                marks: mapped,
              };
            }
            return next2;
          },
        },
        props: {
          decorations(state2) {
            const pluginState = annotationPluginKey.getState(state2);
            if (!pluginState) return DecorationSet.empty;
            const decorations2 = pluginState.marks
              .filter(
                (m3) => m3.from < m3.to && m3.to <= state2.doc.content.size,
              )
              .map((m3) =>
                Decoration.inline(m3.from, m3.to, {
                  class:
                    m3.id === pluginState.activeId
                      ? `${ANNOTATION_CLASS} ${ANNOTATION_ACTIVE_CLASS}`
                      : ANNOTATION_CLASS,
                  "data-annotation-id": m3.id,
                }),
              );
            return DecorationSet.create(state2.doc, decorations2);
          },
        },
      }),
    ];
  },
});
const BLUR_SELECTION_CLASS = "canvas-blur-selection";
const blurSelectionPluginKey = new PluginKey("canvasBlurSelectionHighlight");
const BlurSelectionHighlight = Extension.create({
  name: "canvasBlurSelectionHighlight",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: blurSelectionPluginKey,
        state: {
          init() {
            return false;
          },
          apply(tr2, prev) {
            const meta2 = tr2.getMeta(blurSelectionPluginKey);
            return meta2 ?? prev;
          },
        },
        props: {
          handleDOMEvents: {
            focus(view2) {
              if (blurSelectionPluginKey.getState(view2.state)) {
                const tr2 = view2.state.tr.setMeta(
                  blurSelectionPluginKey,
                  false,
                );
                if (!view2.state.selection.empty) {
                  tr2.setSelection(
                    TextSelection.near(view2.state.selection.$head),
                  );
                }
                view2.dispatch(tr2);
              }
              return false;
            },
            blur(view2) {
              if (!blurSelectionPluginKey.getState(view2.state)) {
                view2.dispatch(
                  view2.state.tr.setMeta(blurSelectionPluginKey, true),
                );
              }
              return false;
            },
          },
          decorations(state2) {
            if (!blurSelectionPluginKey.getState(state2)) return null;
            const ranges = getAnnotationSelectionRanges(state2.selection);
            if (ranges.length === 0) return null;
            return DecorationSet.create(
              state2.doc,
              ranges.map(({ from: from2, to }) =>
                Decoration.inline(from2, to, {
                  class: BLUR_SELECTION_CLASS,
                }),
              ),
            );
          },
        },
      }),
    ];
  },
});
function buildFormatItems(editor, t2) {
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
function preserveMarkdownFidelity(editor) {
  const manager = getManager(editor);
  if (!manager) return;
  patchEntityEscaping(manager);
  patchBlankLinePadding(manager);
}
const MarkdownTableScrollbars = reactExports.memo(MarkdownTableScrollbarsInner);
function extractTableGridAtSelection(editor) {
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
function tableDocumentFromGrid(grid, untitledColumn = "Untitled") {
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
function TableContextMenu({
  editor,
  position: position2,
  onClose,
  onConvertToNode,
}) {
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
              <MenuItem
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
          <MenuItem
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
function useEditorHistoryShortcuts(editor, nodeId) {
  const active2 = useCanvasActive();
  const editorRef = reactExports.useRef(editor);
  editorRef.current = editor;
  reactExports.useEffect(() => {
    if (!active2) return;
    const isNativeTextInput = (target) =>
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
    const run2 = (redo2, event) => {
      if (isNativeTextInput(event.target)) return;
      const current2 = editorRef.current;
      if (!current2) return;
      const reviewState = useDiffReviewStore.getState();
      const reviewSession = reviewState.session;
      const reviewUndoBlocked =
        !redo2 &&
        reviewSession !== null &&
        reviewSession.nodeId === nodeId &&
        (reviewSession.baselineMarkdown === void 0 ||
          undoDepth(current2.state) <=
            (reviewSession.historyDepthAtStart ?? 0) + 1);
      if (reviewState.reverting || reviewUndoBlocked) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }
      const handled = redo2
        ? redo(current2.state, current2.view.dispatch)
        : undo(current2.state, current2.view.dispatch);
      if (!handled) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };
    const handleKeyDown2 = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const key2 = event.key.toLowerCase();
      if (key2 === "z") {
        run2(event.shiftKey, event);
      } else if (key2 === "y" && event.ctrlKey && !event.shiftKey) {
        run2(true, event);
      }
    };
    const handleBeforeInput = (event) => {
      if (event.inputType === "historyUndo") run2(false, event);
      else if (event.inputType === "historyRedo") run2(true, event);
    };
    document.addEventListener("keydown", handleKeyDown2, true);
    document.addEventListener("beforeinput", handleBeforeInput, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown2, true);
      document.removeEventListener("beforeinput", handleBeforeInput, true);
    };
  }, [active2, nodeId]);
}
function splitCompletedReviewFromUserEdit(
  editor,
  baselineMarkdown,
  reviewedMarkdown,
  userMarkdown,
  historyDepthAtStart = 0,
) {
  if (editor.isDestroyed) return;
  const selection2 = editor.state.selection.toJSON();
  const selectionPosition = editor.state.selection.from;
  rewindReviewHistory(editor, historyDepthAtStart);
  if (editor.getMarkdown() !== baselineMarkdown) {
    replaceEditorMarkdown(editor, baselineMarkdown, false);
  }
  if (baselineMarkdown !== reviewedMarkdown) {
    replaceEditorMarkdown(editor, reviewedMarkdown, true);
    closeDiffReviewHistoryGroup(editor);
  }
  if (reviewedMarkdown !== userMarkdown) {
    replaceEditorMarkdown(editor, userMarkdown, true);
    closeDiffReviewHistoryGroup(editor);
  } else if (baselineMarkdown === reviewedMarkdown) {
    recordFinalizedBoundary(editor);
  }
  restoreEditorSelection(editor, selection2, selectionPosition);
}
const MARKDOWN_TABLE_CELL_MIN_WIDTH = 60;
const ScrollableMarkdownTable = Table.extend({
  addNodeView() {
    const cellMinWidth = this.options.cellMinWidth;
    return ({ node: node2 }) =>
      new ScrollableMarkdownTableView(
        node2,
        cellMinWidth,
        MARKDOWN_TABLE_CELL_MAX_WIDTH,
      );
  },
}).configure({
  resizable: false,
  cellMinWidth: MARKDOWN_TABLE_CELL_MIN_WIDTH,
});
function buildControlsRow(ids2, config2) {
  const row = document.createElement("div");
  row.className = `${DIFF_CONTROLS_CLASS}-row`;
  row.contentEditable = "false";
  row.appendChild(buildControls(ids2, config2));
  return row;
}
const DiffReviewHighlight = Extension.create({
  name: "canvasDiffReview",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: diffReviewPluginKey,
        state: {
          init() {
            return {
              hunks: [],
              config: null,
            };
          },
          apply(tr2, prev) {
            const meta2 = tr2.getMeta(diffReviewPluginKey);
            let next2 = prev;
            if (meta2) {
              next2 =
                meta2.kind === "clear"
                  ? {
                      hunks: [],
                      config: null,
                    }
                  : {
                      hunks: meta2.hunks,
                      config: meta2.config,
                    };
            }
            if (tr2.docChanged && next2.hunks.length > 0) {
              next2 = {
                ...next2,
                hunks: next2.hunks.map((hunk) => ({
                  ...hunk,
                  from: tr2.mapping.map(hunk.from, -1),
                  to: tr2.mapping.map(hunk.to, 1),
                })),
              };
            }
            return next2;
          },
        },
        props: {
          decorations(state2) {
            const pluginState = diffReviewPluginKey.getState(state2);
            if (
              !pluginState ||
              pluginState.hunks.length === 0 ||
              !pluginState.config
            ) {
              return DecorationSet.empty;
            }
            const config2 = pluginState.config;
            const docSize = state2.doc.content.size;
            const decorations2 = [];
            const tableGroups = new Map();
            const controlIdOf = (hunk) => hunk.controlId ?? hunk.id;
            for (const hunk of pluginState.hunks) {
              if (
                hunk.from > docSize ||
                hunk.to > docSize ||
                hunk.from > hunk.to
              )
                continue;
              if (!hunk.zeroWidth && hunk.from === hunk.to) continue;
              if (hunk.from < hunk.to) {
                decorations2.push(
                  Decoration.inline(hunk.from, hunk.to, {
                    class: DIFF_ADD_CLASS,
                    "data-diff-hunk-id": hunk.id,
                  }),
                );
              }
              const topLevel = topLevelBlockAt(state2.doc, hunk.from);
              const belongsToTable =
                topLevel?.node.type.name === "table" &&
                hunk.from >= topLevel.from &&
                hunk.to <= topLevel.to;
              if (topLevel && belongsToTable) {
                const groupKey = `${topLevel.from}:${topLevel.to}`;
                const group = tableGroups.get(groupKey) ?? {
                  to: topLevel.to,
                  controlIds: [],
                };
                const controlId = controlIdOf(hunk);
                if (!group.controlIds.includes(controlId))
                  group.controlIds.push(controlId);
                tableGroups.set(groupKey, group);
                if (hunk.deletedMarkdown) {
                  decorations2.push(
                    Decoration.widget(
                      hunk.from,
                      () => buildDeletedInline(hunk, config2),
                      {
                        side: -1,
                        key: `diff-del-inline-${hunk.id}`,
                        stopEvent: () => true,
                      },
                    ),
                  );
                }
                continue;
              }
              const inlineDeleted = isInlineTextReplacement(state2.doc, hunk);
              if (inlineDeleted) {
                decorations2.push(
                  Decoration.widget(
                    hunk.from,
                    () => buildDeletedInline(hunk, config2),
                    {
                      side: -1,
                      key: `diff-del-inline-${hunk.id}`,
                      stopEvent: () => true,
                    },
                  ),
                );
              }
              let delPos = hunk.from;
              let ctlPos = hunk.to;
              const linePlacement = paragraphLinePlacement(state2.doc, hunk);
              if (linePlacement) {
                delPos = linePlacement.delPos;
                ctlPos = linePlacement.ctlPos;
              } else {
                try {
                  const $from = state2.doc.resolve(hunk.from);
                  if ($from.depth > 0) delPos = $from.before(1);
                  const $to = state2.doc.resolve(hunk.to);
                  if ($to.depth > 0) ctlPos = $to.after(1);
                } catch {
                  continue;
                }
              }
              if (hunk.deletedMarkdown && !inlineDeleted) {
                decorations2.push(
                  Decoration.widget(
                    delPos,
                    () => buildDeletedBlock(hunk, config2),
                    {
                      side: -1,
                      key: `diff-del-${hunk.id}`,
                      stopEvent: () => true,
                    },
                  ),
                );
              }
              decorations2.push(
                Decoration.widget(
                  ctlPos,
                  () => buildControlsRow([controlIdOf(hunk)], config2),
                  {
                    // Adjacent line edits can share one PM position: the prior
                    // replacement ends exactly where the next deletion starts.
                    // Keep the prior control before that deletion (-2 < -1),
                    // while a zero-width deletion keeps its own control after
                    // its red widget (-1 < 1).
                    side: !hunk.zeroWidth ? -2 : 1,
                    key: `diff-ctl-${hunk.id}-${config2.disabled ? "off" : "on"}`,
                    stopEvent: () => true,
                  },
                ),
              );
            }
            for (const group of tableGroups.values()) {
              const ids2 = group.controlIds;
              decorations2.push(
                Decoration.widget(
                  group.to,
                  () => buildControlsRow(ids2, config2),
                  {
                    side: 1,
                    key: `diff-table-ctl-${ids2.join("-")}-${config2.disabled ? "off" : "on"}`,
                    stopEvent: () => true,
                  },
                ),
              );
            }
            return DecorationSet.create(state2.doc, decorations2);
          },
        },
      }),
    ];
  },
});
const FindHighlight = Extension.create({
  name: "canvasFindHighlight",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: findPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr2, prev) {
            const meta2 = tr2.getMeta(findPluginKey);
            if (meta2) return buildDecorations(tr2.doc, meta2);
            if (tr2.docChanged) return prev.map(tr2.mapping, tr2.doc);
            return prev;
          },
        },
        props: {
          decorations(state2) {
            return findPluginKey.getState(state2) ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
function searchPmDoc(doc2, query, options, maxMatches) {
  const pattern = compileFindPattern(query, options);
  if (!pattern)
    return {
      matches: [],
      limited: false,
    };
  const matches2 = [];
  const cap2 = maxMatches ?? Number.POSITIVE_INFINITY;
  let limited = false;
  doc2.descendants((node2, pos) => {
    if (limited) return false;
    if (!node2.isTextblock) return true;
    const text2 = node2.textBetween(
      0,
      node2.content.size,
      void 0,
      LEAF_PLACEHOLDER,
    );
    if (text2) {
      const remaining = cap2 - matches2.length;
      const result = findMatchesInText(text2, query, options, {
        maxMatches: remaining,
        baseOffset: pos + 1,
        pattern,
      });
      matches2.push(...result.matches);
      if (result.limited || matches2.length >= cap2) limited = true;
    }
    return false;
  });
  return {
    matches: matches2,
    limited,
  };
}
function resetProseMirrorHistory(editor) {
  const plugins = editor.state.plugins;
  const withoutHistory = plugins.filter(
    (plugin) => plugin.spec.key?.key !== "history$",
  );
  if (withoutHistory.length === plugins.length) return;
  const stateWithoutHistory = editor.state.reconfigure({
    plugins: withoutHistory,
  });
  editor.view.updateState(
    stateWithoutHistory.reconfigure({
      plugins,
    }),
  );
}
function createDiffReviewWriteAckTracker() {
  return {
    epoch: null,
    pending: [],
  };
}
function enqueueDiffReviewWriteAck(
  tracker2,
  markdown2,
  epoch,
  now2 = Date.now(),
) {
  beginDiffReviewWriteAckEpoch(tracker2, epoch);
  pruneExpiredDiffReviewWriteAcks(tracker2, now2);
  tracker2.pending.push({
    markdown: markdown2,
    expiresAt: now2 + DIFF_REVIEW_WRITE_ACK_TTL_MS,
  });
  if (tracker2.pending.length > MAX_PENDING_DIFF_REVIEW_WRITE_ACKS) {
    tracker2.pending.splice(
      0,
      tracker2.pending.length - MAX_PENDING_DIFF_REVIEW_WRITE_ACKS,
    );
  }
}
function consumeDiffReviewWriteAck(tracker2, markdown2, now2 = Date.now()) {
  pruneExpiredDiffReviewWriteAcks(tracker2, now2);
  const index2 = tracker2.pending.findIndex(
    (entry) => entry.markdown === markdown2,
  );
  if (index2 < 0) return false;
  tracker2.pending.splice(index2, 1);
  return true;
}
function pendingDiffReviewWriteAckCount(tracker2, now2 = Date.now()) {
  pruneExpiredDiffReviewWriteAcks(tracker2, now2);
  return tracker2.pending.length;
}
function clearDiffReviewWriteAcks(tracker2) {
  tracker2.pending = [];
}
function serializeMarkdownDocument(editor, document2) {
  const manager = editor.storage.markdown?.manager;
  if (!manager) return null;
  try {
    return manager.serialize(document2.toJSON());
  } catch {
    return null;
  }
}
function startTextAnnotation(getCloseBlockReason, onStart, onAgentRunning) {
  if (getCloseBlockReason?.() === "agent-running") {
    onAgentRunning();
    return false;
  }
  onStart();
  return true;
}
function SelectionFormatToolbar({ editor, formatItems, annotate }) {
  return (
    <BubbleMenu
      editor={editor}
      options={{
        placement: "top",
        offset: 8,
      }}
      shouldShow={({ editor: ed, state: state2 }) => {
        if (!ed.isEditable) return false;
        const { from: from2, to } = state2.selection;
        return from2 !== to;
      }}
      className="canvas-toolbar-surface"
      data-canvas-toolbar="true"
      data-density="compact"
    >
      {formatItems.map((item) => (
        <ToolbarBtn key={item.id} item={item} contextToolbar={true} />
      ))}
      {annotate && (
        <>
          <ToolbarSeparator contextToolbar={true} />
          <button
            type="button"
            title={annotate.label}
            onMouseDown={(e2) => e2.preventDefault()}
            onClick={annotate.onClick}
            className="canvas-toolbar-action"
            data-action-ui-id="canvas-text-annotate"
          >
            <AnnotationIcon size={16} />
            <span className="whitespace-nowrap">{annotate.label}</span>
          </button>
        </>
      )}
    </BubbleMenu>
  );
}
export function MarkdownFullscreen({
  initialMarkdown,
  onClose,
  onDraftChange,
  externalRevision,
  sourceNodeId,
  documentPath,
  onAnnotationsChange,
  onAnnotationActivate,
  subscribeAnnotationCommand,
  onEditingSelectionChange,
  getCloseBlockReason,
}) {
  const { t: t2 } = useTranslation();
  const closedRef = reactExports.useRef(false);
  const initializedRef = reactExports.useRef(false);
  const userEditedRef = reactExports.useRef(false);
  const externalUpdatedWhileEditingRef = reactExports.useRef(false);
  const programmaticUpdateRef = reactExports.useRef(false);
  const externalMarkdownRef = reactExports.useRef(initialMarkdown);
  externalMarkdownRef.current = initialMarkdown;
  const dirtyState = useTextDocumentDirty();
  const markDirty = dirtyState.markDirty;
  const [diffPendingOpen, setDiffPendingOpen] = reactExports.useState(false);
  const hasPendingDiffReview = useDiffReviewStore((state2) =>
    selectHasPendingHunksForNode(state2, sourceNodeId),
  );
  const hasPendingDiffReviewRef = reactExports.useRef(hasPendingDiffReview);
  hasPendingDiffReviewRef.current = hasPendingDiffReview;
  const [contentRevision, setContentRevision] = reactExports.useState(0);
  const reviewReverting = useDiffReviewStore((state2) => state2.reverting);
  const reviewRequestId = useDiffReviewStore(
    (state2) => state2.session?.requestId ?? null,
  );
  const expectedReviewWriteAcksRef = reactExports.useRef(
    createDiffReviewWriteAckTracker(),
  );
  reactExports.useEffect(() => {
    if (reviewRequestId) {
      beginDiffReviewWriteAckEpoch(
        expectedReviewWriteAcksRef.current,
        reviewRequestId,
      );
    }
  }, [reviewRequestId]);
  const deferredReviewMarkdownRef = reactExports.useRef(null);
  const {
    status: draftSaveStatus,
    latestDraftRef,
    scheduleDraftSave,
    pauseDraftSave,
    resumeDraftSave,
    forceDraftSave,
    flushDraftSave,
    flushDraftSaveAsync,
    resetBaseline,
  } = useDebouncedDraftSave(initialMarkdown, onDraftChange);
  const findRef = reactExports.useRef(null);
  const scheduleSelectionReport = useEditingSelectionReporter(
    onEditingSelectionChange,
  );
  const fsEditor = useEditor({
    extensions: [
      src_default,
      ScrollableMarkdownTable,
      TableRow,
      TableHeader,
      TableCell,
      Markdown,
      src_default$1.configure({
        placeholder: t2("canvas.editorPlaceholder"),
      }),
      FindHighlight,
      AnnotationHighlight,
      DiffReviewHighlight,
      BlurSelectionHighlight,
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "outline-none min-h-[200px] text-sm",
        style:
          "color: var(--fg-default, #141414); caret-color: var(--canvas-text-accent)",
      },
    },
    onCreate: ({ editor }) => {
      preserveMarkdownFidelity(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      if (!initializedRef.current) return;
      scheduleSelectionReport(() => buildPmSelectionState(editor.state));
    },
    onUpdate: ({ editor, transaction }) => {
      if (!initializedRef.current) return;
      scheduleSelectionReport(() => buildPmSelectionState(editor.state));
      if (
        programmaticUpdateRef.current ||
        transaction.getMeta(DIFF_REVIEW_SYNC_META)
      )
        return;
      if (getAnnotationHistorySnapshot(transaction)) return;
      const reviewSnapshot = getDiffReviewHistorySnapshot(transaction);
      const markdown2 = editor.getMarkdown();
      if (reviewSnapshot) {
        enqueueDiffReviewWriteAck(
          expectedReviewWriteAcksRef.current,
          markdown2,
          reviewSnapshot.requestId,
        );
        markDirty();
        scheduleDraftSave(markdown2);
        flushDraftSave();
        findRef.current?.refresh();
        return;
      }
      const activeReview = useDiffReviewStore.getState().session;
      if (activeReview && activeReview.nodeId === sourceNodeId) {
        const reviewedMarkdown = serializeMarkdownDocument(
          editor,
          transaction.before,
        );
        if (reviewedMarkdown !== null) {
          const baseline =
            activeReview.baselineMarkdown ??
            reconstructDiffReviewBaseline(reviewedMarkdown, activeReview) ??
            reviewedMarkdown;
          splitCompletedReviewFromUserEdit(
            editor,
            baseline,
            reviewedMarkdown,
            markdown2,
            activeReview.historyDepthAtStart,
          );
        }
        useDiffReviewStore
          .getState()
          .finishSessionForUserEdit(activeReview.requestId);
      }
      userEditedRef.current = true;
      markDirty();
      scheduleDraftSave(markdown2);
      findRef.current?.refresh();
    },
  });
  reactExports.useEffect(() => {
    if (!fsEditor || initializedRef.current) return;
    if (initialMarkdown) {
      fsEditor
        .chain()
        .command(({ tr: tr2 }) => {
          tr2.setMeta("addToHistory", false);
          return true;
        })
        .setContent(initialMarkdown, {
          contentType: "markdown",
        })
        .run();
    }
    resetProseMirrorHistory(fsEditor);
    initializedRef.current = true;
    setContentRevision((rev) => rev + 1);
    if (
      useDiffReviewStore.getState().pendingScrollToFirstHunkNodeId !==
      sourceNodeId
    ) {
      const frame2 = requestAnimationFrame(() => {
        if (!fsEditor.isDestroyed) fsEditor.commands.focus("start");
      });
      return () => cancelAnimationFrame(frame2);
    }
  }, [fsEditor, initialMarkdown, sourceNodeId]);
  const canvasRootEl = useCanvasRootElement();
  const handleAnnotationConflict = reactExports.useCallback(() => {
    dedupedToast.error(
      t2("canvas.annotationConflict", "选区与已有批注重叠，请重新选择"),
    );
  }, [t2]);
  const annotations = useAnnotations(fsEditor, {
    onSnapshotsChange: onAnnotationsChange,
    onActivate: onAnnotationActivate,
    onConflict: handleAnnotationConflict,
  });
  const handleAnnotationStart = reactExports.useCallback(() => {
    startTextAnnotation(getCloseBlockReason, annotations.begin, () => {
      dedupedToast.warning(
        t2(
          "canvas.annotationAgentRunning",
          "Text Assistant is running. Annotation is unavailable.",
        ),
      );
    });
  }, [annotations.begin, getCloseBlockReason, t2]);
  const editorAnnotationsRef = reactExports.useRef(annotations);
  editorAnnotationsRef.current = annotations;
  useEditorHistoryShortcuts(fsEditor, sourceNodeId);
  reactExports.useEffect(() => {
    if (!subscribeAnnotationCommand) return;
    return subscribeAnnotationCommand((cmd2) =>
      editorAnnotationsRef.current.handleCommand(cmd2),
    );
  }, [subscribeAnnotationCommand]);
  const [editorAreaEl, setEditorAreaEl] = reactExports.useState(null);
  const applySync = reactExports.useCallback(
    (md) => {
      if (!fsEditor) return false;
      const reviewState = useDiffReviewStore.getState();
      if (
        reviewState.reverting &&
        reviewState.session?.nodeId === sourceNodeId
      ) {
        deferredReviewMarkdownRef.current = md;
        return false;
      }
      if (consumeDiffReviewWriteAck(expectedReviewWriteAcksRef.current, md)) {
        setContentRevision((rev) => rev + 1);
        return fsEditor.getMarkdown() === md;
      }
      if (
        pendingDiffReviewWriteAckCount(expectedReviewWriteAcksRef.current) > 0
      ) {
        clearDiffReviewWriteAcks(expectedReviewWriteAcksRef.current);
      }
      const activeReview = reviewState.session;
      if (
        activeReview &&
        activeReview.nodeId === sourceNodeId &&
        activeReview.baselineMarkdown === void 0
      ) {
        const baselineMarkdown = fsEditor.getMarkdown();
        if (baselineMarkdown !== md) markDirty();
        const requestId = activeReview.requestId;
        const expectedContentHash = activeReview.contentHash;
        void hashDiffReviewMarkdown(md)
          .then((contentHash) => {
            if (fsEditor.isDestroyed || contentHash !== expectedContentHash)
              return;
            const current2 = useDiffReviewStore.getState().session;
            if (
              !current2 ||
              current2.requestId !== requestId ||
              current2.baselineMarkdown !== void 0
            )
              return;
            editorAnnotationsRef.current.reset();
            const historyDepthAtStart = recordProvisionalDiffReviewHistory(
              fsEditor,
              baselineMarkdown,
              md,
              true,
            );
            useDiffReviewStore
              .getState()
              .setBaselineMarkdown(
                requestId,
                baselineMarkdown,
                historyDepthAtStart,
              );
            setContentRevision((rev) => rev + 1);
          })
          .catch(() => {});
        return true;
      }
      editorAnnotationsRef.current.reset();
      if (fsEditor.getMarkdown() !== md) markDirty();
      programmaticUpdateRef.current = true;
      try {
        fsEditor
          .chain()
          .command(({ tr: tr2 }) => {
            tr2.setMeta("addToHistory", false);
            return true;
          })
          .setContent(md, {
            contentType: "markdown",
          })
          .run();
        resetProseMirrorHistory(fsEditor);
      } finally {
        programmaticUpdateRef.current = false;
      }
      setContentRevision((rev) => rev + 1);
      return true;
    },
    [fsEditor, sourceNodeId, markDirty],
  );
  const getMineMarkdown = reactExports.useCallback(
    () => fsEditor?.getMarkdown() ?? initialMarkdown,
    [fsEditor, initialMarkdown],
  );
  const handleConflictResolved = reactExports.useCallback(
    (merged) => {
      externalUpdatedWhileEditingRef.current = false;
      if (
        fsEditor &&
        !fsEditor.isDestroyed &&
        fsEditor.getMarkdown() !== merged
      ) {
        applySync(merged);
      }
      userEditedRef.current = true;
      forceDraftSave(merged);
    },
    [applySync, forceDraftSave, fsEditor],
  );
  const conflict = useTextConflictResolver({
    getMineMarkdown,
    onResolved: handleConflictResolved,
  });
  const openConflict = conflict.open;
  const handleExternalConflict = reactExports.useCallback(
    (external) => {
      if (hasPendingDiffReviewRef.current) {
        externalUpdatedWhileEditingRef.current = false;
        resumeDraftSave();
        return;
      }
      if (openConflict(external)) return;
      const current2 = fsEditor?.getMarkdown() ?? external;
      externalUpdatedWhileEditingRef.current = false;
      resetBaseline(external);
      resumeDraftSave();
      if (current2 !== external) scheduleDraftSave(current2);
    },
    [fsEditor, openConflict, resetBaseline, resumeDraftSave, scheduleDraftSave],
  );
  useExternalRevisionSync({
    externalRevision,
    externalMarkdown: initialMarkdown,
    userEditedRef,
    externalUpdatedWhileEditingRef,
    applySync,
    resetBaseline,
    onConflictLatch: pauseDraftSave,
    onConflict: handleExternalConflict,
  });
  reactExports.useEffect(() => {
    if (reviewReverting || deferredReviewMarkdownRef.current === null) return;
    const markdown2 = deferredReviewMarkdownRef.current;
    deferredReviewMarkdownRef.current = null;
    if (
      consumeDiffReviewWriteAck(expectedReviewWriteAcksRef.current, markdown2)
    ) {
      if (fsEditor?.getMarkdown() === markdown2) resetBaseline(markdown2);
      setContentRevision((rev) => rev + 1);
      return;
    }
    const shouldResetBaseline = applySync(markdown2);
    if (shouldResetBaseline !== false) resetBaseline(markdown2);
  }, [reviewReverting, applySync, resetBaseline, fsEditor]);
  const handleReviewDocumentApplied = reactExports.useCallback(
    (markdown2) => {
      const requestId = useDiffReviewStore.getState().session?.requestId;
      if (requestId) {
        enqueueDiffReviewWriteAck(
          expectedReviewWriteAcksRef.current,
          markdown2,
          requestId,
        );
      }
      resetBaseline(markdown2);
      setContentRevision((rev) => rev + 1);
    },
    [resetBaseline],
  );
  useDiffReview(fsEditor, sourceNodeId, contentRevision, {
    sourceMarkdown: initialMarkdown,
    onReviewDocumentApplied: handleReviewDocumentApplied,
  });
  const finalizeClose = reactExports.useCallback(
    (md) => {
      if (closedRef.current) return;
      closedRef.current = true;
      onClose(md);
    },
    [onClose],
  );
  const handleClose = reactExports.useCallback(() => {
    if (closedRef.current) return;
    if (!fsEditor) {
      finalizeClose();
      return;
    }
    if (hasPendingDiffReviewRef.current) {
      setDiffPendingOpen(true);
      return;
    }
    if (conflict.active) {
      dedupedToast.error(
        t2("canvas.textConflict.blockedClose", "请先处理完所有冲突再退出"),
      );
      return;
    }
    const action = decideFullscreenCloseAction({
      userEdited: userEditedRef.current,
      externalUpdatedWhileEditing: externalUpdatedWhileEditingRef.current,
    });
    if (action === "close-without-save") {
      finalizeClose();
      return;
    }
    latestDraftRef.current = fsEditor.getMarkdown();
    if (action === "show-conflict") {
      openConflict(externalMarkdownRef.current);
      return;
    }
    const markdown2 = flushDraftSave();
    finalizeClose(onDraftChange ? void 0 : markdown2);
  }, [
    conflict.active,
    finalizeClose,
    flushDraftSave,
    fsEditor,
    latestDraftRef,
    onDraftChange,
    openConflict,
    t2,
  ]);
  const findAdapter = reactExports.useMemo(
    () => ({
      search(query, options) {
        if (!fsEditor)
          return {
            matches: [],
            limited: false,
            caretPos: 0,
          };
        const { matches: matches2, limited } = searchPmDoc(
          fsEditor.state.doc,
          query,
          options,
          MAX_FIND_MATCHES,
        );
        return {
          matches: matches2,
          limited,
          caretPos: fsEditor.state.selection.from,
        };
      },
      activate(matches2, index2) {
        if (!fsEditor) return;
        if (index2 < 0 || index2 >= matches2.length) return;
        fsEditor.view.dispatch(
          fsEditor.state.tr.setMeta(findPluginKey, {
            ranges: matches2,
            activeIndex: index2,
          }),
        );
        requestAnimationFrame(() => {
          fsEditor.view.dom
            .querySelector(`.${FIND_MATCH_ACTIVE_CLASS}`)
            ?.scrollIntoView({
              block: "nearest",
            });
        });
      },
      clear() {
        if (!fsEditor) return;
        fsEditor.view.dispatch(
          fsEditor.state.tr.setMeta(findPluginKey, {
            ranges: [],
            activeIndex: -1,
          }),
        );
      },
      getSelectedText() {
        if (!fsEditor) return "";
        const { from: from2, to } = fsEditor.state.selection;
        return from2 === to
          ? ""
          : fsEditor.state.doc.textBetween(from2, to, "\n");
      },
      focusEditor() {
        fsEditor?.commands.focus();
      },
      replaceOne(match2, query, options, replacement) {
        if (!fsEditor) return;
        const matched = fsEditor.state.doc.textBetween(
          match2.from,
          match2.to,
          void 0,
          LEAF_PLACEHOLDER,
        );
        const expanded = computeReplacement(
          matched,
          query,
          options,
          replacement,
        );
        const tr2 = fsEditor.state.tr.insertText(
          expanded,
          match2.from,
          match2.to,
        );
        tr2.setSelection(
          TextSelection.create(tr2.doc, match2.from + expanded.length),
        );
        fsEditor.view.dispatch(tr2);
      },
      replaceAll(query, options, replacement) {
        if (!fsEditor) return;
        const { matches: matches2 } = searchPmDoc(
          fsEditor.state.doc,
          query,
          options,
        );
        if (matches2.length === 0) return;
        const tr2 = fsEditor.state.tr;
        for (let i2 = matches2.length - 1; i2 >= 0; i2--) {
          const m3 = matches2[i2];
          const matched = fsEditor.state.doc.textBetween(
            m3.from,
            m3.to,
            void 0,
            LEAF_PLACEHOLDER,
          );
          tr2.insertText(
            computeReplacement(matched, query, options, replacement),
            m3.from,
            m3.to,
          );
        }
        fsEditor.view.dispatch(tr2);
      },
    }),
    [fsEditor],
  );
  const find2 = useFindController(findAdapter);
  findRef.current = find2;
  useFindEscapeClose(find2, handleClose);
  const [tableCtxPos, setTableCtxPos] = reactExports.useState(null);
  const closeTableCtxMenu = reactExports.useCallback(
    () => setTableCtxPos(null),
    [],
  );
  const handleEditorContextMenu = reactExports.useCallback(
    (e2) => {
      if (!fsEditor) return;
      if (!e2.target.closest("td, th")) return;
      e2.preventDefault();
      const coords = fsEditor.view.posAtCoords({
        left: e2.clientX,
        top: e2.clientY,
      });
      if (coords) fsEditor.chain().setTextSelection(coords.pos).run();
      setTableCtxPos({
        x: e2.clientX,
        y: e2.clientY,
      });
    },
    [fsEditor],
  );
  const canvasActions = reactExports.useContext(CanvasActionsContext);
  const handleConvertToNode = reactExports.useMemo(() => {
    if (!canvasActions || !fsEditor) return void 0;
    return () => {
      const grid = extractTableGridAtSelection(fsEditor);
      if (!grid) return;
      const doc2 = tableDocumentFromGrid(
        grid,
        t2("canvas.table.untitledColumn", "Untitled"),
      );
      void canvasActions
        .addTableNodeFromDocument(doc2, sourceNodeId)
        .then((nodeId) => {
          if (nodeId)
            dedupedToast.success(
              t2("canvas.mdTable.toNodeDone", "已插入表格节点"),
            );
          else
            dedupedToast.error(
              t2("canvas.mdTable.toNodeFailed", "插入表格节点失败"),
            );
        });
    };
  }, [canvasActions, fsEditor, sourceNodeId, t2]);
  const formatItems = reactExports.useMemo(
    () => (fsEditor ? buildFormatItems(fsEditor, t2) : []),
    [fsEditor, t2],
  );
  const flushForVersionSave = reactExports.useCallback(async () => {
    if (fsEditor) latestDraftRef.current = fsEditor.getMarkdown();
    await flushDraftSaveAsync();
  }, [fsEditor, flushDraftSaveAsync, latestDraftRef]);
  const prepareForVersionReplace = reactExports.useCallback(async () => {
    await flushForVersionSave();
    userEditedRef.current = false;
    externalUpdatedWhileEditingRef.current = false;
  }, [flushForVersionSave]);
  const versionPanel = useTextVersionPanel({
    path: documentPath,
    ...(sourceNodeId
      ? {
          nodeId: sourceNodeId,
        }
      : {}),
    flushBeforeSave: flushForVersionSave,
    prepareForReplace: prepareForVersionReplace,
    // A snapshot taken mid-review would checkpoint hunks the user has neither
    // accepted nor undone — same reason closing is blocked. An unresolved
    // conflict merge is blocked for exactly the same reason.
    disabled: hasPendingDiffReview || conflict.active,
    dirty: dirtyState,
    getContent: getMineMarkdown,
  });
  return (
    <FullscreenShell
      saveStatus={
        <TextSaveStatus
          draftStatus={draftSaveStatus}
          versionSaving={versionPanel.versionSaving}
        />
      }
      headerLeft={
        conflict.active
          ? conflict.headerLeft
          : versionPanel.previewing
            ? versionPanel.previewHeaderLeft
            : null
      }
      overlay={conflict.active ? conflict.body : versionPanel.preview}
      hideFind={versionPanel.previewing || conflict.active}
      hideClose={versionPanel.previewing}
      toolbarActions={
        conflict.active ? (
          conflict.toolbarActions
        ) : versionPanel.previewing ? (
          versionPanel.previewToolbar
        ) : fsEditor ? (
          <>
            <EditorHistoryControls editor={fsEditor} nodeId={sourceNodeId} />
            <ToolbarSeparator />
            {versionPanel.toolbarButtons}
          </>
        ) : (
          versionPanel.toolbarButtons
        )
      }
      find={find2}
      onClose={handleClose}
    >
      {fsEditor && (
        <SelectionFormatToolbar
          editor={fsEditor}
          formatItems={formatItems}
          annotate={{
            label: t2("canvas.annotate", "批注"),
            onClick: handleAnnotationStart,
          }}
        />
      )}
      <div
        ref={setEditorAreaEl}
        className="relative"
        onContextMenu={handleEditorContextMenu}
      >
        <EditorContent editor={fsEditor} />
        <MarkdownTableScrollbars editorRoot={editorAreaEl} />
        {fsEditor && (
          <AnnotationGutter
            editor={fsEditor}
            markers={annotations.markers}
            activeId={annotations.activeId}
            anchorEl={editorAreaEl}
            onActivate={annotations.activate}
          />
        )}
      </div>
      {fsEditor && tableCtxPos && (
        <TableContextMenu
          editor={fsEditor}
          position={tableCtxPos}
          onClose={closeTableCtxMenu}
          onConvertToNode={handleConvertToNode}
        />
      )}
      {versionPanel.dialog}
      <DiffPendingDialog
        open={diffPendingOpen}
        onDismiss={() => setDiffPendingOpen(false)}
      />
      {annotations.pending && (
        <AnnotationInput
          editor={fsEditor}
          annotationId={annotations.pending.id}
          value={annotations.pendingComment}
          placeholder={t2("canvas.annotationPlaceholder", "添加批注……")}
          portalTarget={canvasRootEl}
          boundsEl={editorAreaEl}
          onChange={annotations.updatePendingComment}
          onClose={annotations.closePending}
        />
      )}
    </FullscreenShell>
  );
}
