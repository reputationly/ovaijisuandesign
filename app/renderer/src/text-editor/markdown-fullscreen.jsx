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
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { BubbleMenu } from "@tiptap/react/menus";
import { commands as commands_exports, Extension } from "@tiptap/core";
import { Decoration, DecorationSet } from "prosemirror-view";
import { EditorContent, useEditor } from "@tiptap/react";
import jsxRuntimeExports from "react/jsx-runtime";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import reactDomExports from "react-dom";
import reactExports from "react";
import { redo, undo, undoDepth } from "prosemirror-history";
import { Placeholder as src_default$1 } from "@tiptap/extensions";
import { useTranslation } from "react-i18next";
import { ActionListPanel, ActionListSeparator } from "../media-editing/action-list.jsx";
import { Grid2x2Plus } from "../media-editing/lucide-icon-wraps.js";
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
function assumeContentType(content, contentType) {
  if (typeof content !== "string") return "json";
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
      setContent: (content, options) => {
        if (
          !(options === null || options === void 0
            ? void 0
            : options.contentType)
        )
          return commands_exports.setContent(content, options);
        if (
          assumeContentType(
            content,
            options === null || options === void 0
              ? void 0
              : options.contentType,
          ) !== "markdown" ||
          !this.editor.markdown
        )
          return commands_exports.setContent(content, options);
        const mdContent = this.editor.markdown.parse(content);
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
      insertContentAt: (position, value, options) => {
        if (
          !(options === null || options === void 0
            ? void 0
            : options.contentType)
        )
          return commands_exports.insertContentAt(position, value, options);
        if (
          assumeContentType(
            value,
            options === null || options === void 0
              ? void 0
              : options.contentType,
          ) !== "markdown" ||
          !this.editor.markdown
        )
          return commands_exports.insertContentAt(position, value, options);
        const mdContent = this.editor.markdown.parse(value);
        return commands_exports.insertContentAt(position, mdContent, options);
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
    const json = this.editor.markdown.parse(this.editor.options.content);
    if (
      (_json$content = json.content) === null || _json$content === void 0
        ? void 0
        : _json$content.length
    )
      this.editor.options.content = json;
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
          apply(tr, prev) {
            const meta = tr.getMeta(annotationPluginKey);
            const historySnapshot = getAnnotationHistorySnapshot(tr);
            let next = historySnapshot
              ? {
                  marks: historySnapshot.marks.map((mark) => ({
                    ...mark,
                  })),
                  activeId: null,
                }
              : prev;
            if (!historySnapshot && meta) {
              switch (meta.kind) {
                case "add":
                  next = {
                    ...next,
                    marks: [...next.marks, meta.mark],
                  };
                  break;
                case "remove":
                  next = {
                    marks: next.marks.filter((mark) => mark.id !== meta.id),
                    activeId:
                      next.activeId === meta.id ? null : next.activeId,
                  };
                  break;
                case "clear":
                  next = {
                    marks: [],
                    activeId: null,
                  };
                  break;
                case "setActive":
                  next = {
                    ...next,
                    activeId: meta.id,
                  };
                  break;
              }
            }
            if (tr.docChanged && !historySnapshot) {
              const mapped = next.marks.map((mark) => ({
                id: mark.id,
                from: tr.mapping.map(mark.from, -1),
                to: tr.mapping.map(mark.to, 1),
              }));
              next = {
                ...next,
                marks: mapped,
              };
            }
            return next;
          },
        },
        props: {
          decorations(state) {
            const pluginState = annotationPluginKey.getState(state);
            if (!pluginState) return DecorationSet.empty;
            const decorations = pluginState.marks
              .filter(
                (mark) => mark.from < mark.to && mark.to <= state.doc.content.size,
              )
              .map((mark) =>
                Decoration.inline(mark.from, mark.to, {
                  class:
                    mark.id === pluginState.activeId
                      ? `${ANNOTATION_CLASS} ${ANNOTATION_ACTIVE_CLASS}`
                      : ANNOTATION_CLASS,
                  "data-annotation-id": mark.id,
                }),
              );
            return DecorationSet.create(state.doc, decorations);
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
          apply(tr, prev) {
            const meta = tr.getMeta(blurSelectionPluginKey);
            return meta ?? prev;
          },
        },
        props: {
          handleDOMEvents: {
            focus(view) {
              if (blurSelectionPluginKey.getState(view.state)) {
                const tr = view.state.tr.setMeta(
                  blurSelectionPluginKey,
                  false,
                );
                if (!view.state.selection.empty) {
                  tr.setSelection(
                    TextSelection.near(view.state.selection.$head),
                  );
                }
                view.dispatch(tr);
              }
              return false;
            },
            blur(view) {
              if (!blurSelectionPluginKey.getState(view.state)) {
                view.dispatch(
                  view.state.tr.setMeta(blurSelectionPluginKey, true),
                );
              }
              return false;
            },
          },
          decorations(state) {
            if (!blurSelectionPluginKey.getState(state)) return null;
            const ranges = getAnnotationSelectionRanges(state.selection);
            if (ranges.length === 0) return null;
            return DecorationSet.create(
              state.doc,
              ranges.map(({ from, to }) =>
                Decoration.inline(from, to, {
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
function buildFormatItems(editor, t) {
  return [
    {
      id: "h1",
      label: t("canvas.heading1"),
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
      label: t("canvas.heading2"),
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
      label: t("canvas.heading3"),
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
      label: t("canvas.paragraph"),
      icon: <ParagraphIcon />,
      onClick: () => editor.chain().focus().setParagraph().run(),
    },
    {
      id: "bold",
      label: t("canvas.bold"),
      icon: <BoldIcon />,
      separator: true,
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      id: "italic",
      label: t("canvas.italic"),
      icon: <ItalicIcon />,
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      id: "bullet-list",
      label: t("canvas.bulletList"),
      icon: <BulletListIcon />,
      separator: true,
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      id: "ordered-list",
      label: t("canvas.orderedList"),
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
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === "table") {
      tableNode = node;
      break;
    }
  }
  if (!tableNode) return null;
  let headers = null;
  const rows = [];
  tableNode.forEach((row) => {
    if (row.type.name !== "tableRow") return;
    const cells = [];
    let isHeaderRow = false;
    row.forEach((cell) => {
      if (cell.type.name === "tableHeader") isHeaderRow = true;
      cells.push(cell.textContent.trim());
    });
    if (isHeaderRow && headers === null) headers = cells;
    else rows.push(cells);
  });
  if (headers === null) {
    const first = rows.shift();
    if (!first) return null;
    headers = first;
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
  const rows = grid.rows.map((cells) => {
    const row = {
      id: newRowId(),
      cells: {},
    };
    columns.forEach((col, i) => {
      row.cells[col.id] = cells[i] ?? "";
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
  position,
  onClose,
  onConvertToNode,
}) {
  const { t } = useTranslation();
  const { menuRef, clampedPosition } = useClampedMenuPosition({
    position,
    estimatedWidth: 208,
    estimatedHeight: 360,
  });
  reactExports.useEffect(() => {
    const handleMouseDown = (mouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(mouseEvent.target)) {
        onClose();
      }
    };
    const handleKeyDown = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        keyboardEvent.stopPropagation();
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleMouseDown);
      document.addEventListener("keydown", handleKeyDown, {
        capture: true,
      });
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown, {
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
                label={t(op.labelKey)}
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
            label={t("canvas.mdTable.toNode")}
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
  const active = useCanvasActive();
  const editorRef = reactExports.useRef(editor);
  editorRef.current = editor;
  reactExports.useEffect(() => {
    if (!active) return;
    const isNativeTextInput = (target) =>
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
    const run = (isRedo, event) => {
      if (isNativeTextInput(event.target)) return;
      const current = editorRef.current;
      if (!current) return;
      const reviewState = useDiffReviewStore.getState();
      const reviewSession = reviewState.session;
      const reviewUndoBlocked =
        !isRedo &&
        reviewSession !== null &&
        reviewSession.nodeId === nodeId &&
        (reviewSession.baselineMarkdown === void 0 ||
          undoDepth(current.state) <=
            (reviewSession.historyDepthAtStart ?? 0) + 1);
      if (reviewState.reverting || reviewUndoBlocked) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }
      const handled = isRedo
        ? redo(current.state, current.view.dispatch)
        : undo(current.state, current.view.dispatch);
      if (!handled) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };
    const handleKeyDown = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "z") {
        run(event.shiftKey, event);
      } else if (key === "y" && event.ctrlKey && !event.shiftKey) {
        run(true, event);
      }
    };
    const handleBeforeInput = (event) => {
      if (event.inputType === "historyUndo") run(false, event);
      else if (event.inputType === "historyRedo") run(true, event);
    };
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("beforeinput", handleBeforeInput, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("beforeinput", handleBeforeInput, true);
    };
  }, [active, nodeId]);
}
function splitCompletedReviewFromUserEdit(
  editor,
  baselineMarkdown,
  reviewedMarkdown,
  userMarkdown,
  historyDepthAtStart = 0,
) {
  if (editor.isDestroyed) return;
  const selection = editor.state.selection.toJSON();
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
  restoreEditorSelection(editor, selection, selectionPosition);
}
const MARKDOWN_TABLE_CELL_MIN_WIDTH = 60;
const ScrollableMarkdownTable = Table.extend({
  addNodeView() {
    const cellMinWidth = this.options.cellMinWidth;
    return ({ node }) =>
      new ScrollableMarkdownTableView(
        node,
        cellMinWidth,
        MARKDOWN_TABLE_CELL_MAX_WIDTH,
      );
  },
}).configure({
  resizable: false,
  cellMinWidth: MARKDOWN_TABLE_CELL_MIN_WIDTH,
});
function buildControlsRow(ids, config) {
  const row = document.createElement("div");
  row.className = `${DIFF_CONTROLS_CLASS}-row`;
  row.contentEditable = "false";
  row.appendChild(buildControls(ids, config));
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
          apply(tr, prev) {
            const meta = tr.getMeta(diffReviewPluginKey);
            let next = prev;
            if (meta) {
              next =
                meta.kind === "clear"
                  ? {
                      hunks: [],
                      config: null,
                    }
                  : {
                      hunks: meta.hunks,
                      config: meta.config,
                    };
            }
            if (tr.docChanged && next.hunks.length > 0) {
              next = {
                ...next,
                hunks: next.hunks.map((hunk) => ({
                  ...hunk,
                  from: tr.mapping.map(hunk.from, -1),
                  to: tr.mapping.map(hunk.to, 1),
                })),
              };
            }
            return next;
          },
        },
        props: {
          decorations(state) {
            const pluginState = diffReviewPluginKey.getState(state);
            if (
              !pluginState ||
              pluginState.hunks.length === 0 ||
              !pluginState.config
            ) {
              return DecorationSet.empty;
            }
            const config = pluginState.config;
            const docSize = state.doc.content.size;
            const decorations = [];
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
                decorations.push(
                  Decoration.inline(hunk.from, hunk.to, {
                    class: DIFF_ADD_CLASS,
                    "data-diff-hunk-id": hunk.id,
                  }),
                );
              }
              const topLevel = topLevelBlockAt(state.doc, hunk.from);
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
                  decorations.push(
                    Decoration.widget(
                      hunk.from,
                      () => buildDeletedInline(hunk, config),
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
              const inlineDeleted = isInlineTextReplacement(state.doc, hunk);
              if (inlineDeleted) {
                decorations.push(
                  Decoration.widget(
                    hunk.from,
                    () => buildDeletedInline(hunk, config),
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
              const linePlacement = paragraphLinePlacement(state.doc, hunk);
              if (linePlacement) {
                delPos = linePlacement.delPos;
                ctlPos = linePlacement.ctlPos;
              } else {
                try {
                  const $from = state.doc.resolve(hunk.from);
                  if ($from.depth > 0) delPos = $from.before(1);
                  const $to = state.doc.resolve(hunk.to);
                  if ($to.depth > 0) ctlPos = $to.after(1);
                } catch {
                  continue;
                }
              }
              if (hunk.deletedMarkdown && !inlineDeleted) {
                decorations.push(
                  Decoration.widget(
                    delPos,
                    () => buildDeletedBlock(hunk, config),
                    {
                      side: -1,
                      key: `diff-del-${hunk.id}`,
                      stopEvent: () => true,
                    },
                  ),
                );
              }
              decorations.push(
                Decoration.widget(
                  ctlPos,
                  () => buildControlsRow([controlIdOf(hunk)], config),
                  {
                    // Adjacent line edits can share one PM position: the prior
                    // replacement ends exactly where the next deletion starts.
                    // Keep the prior control before that deletion (-2 < -1),
                    // while a zero-width deletion keeps its own control after
                    // its red widget (-1 < 1).
                    side: !hunk.zeroWidth ? -2 : 1,
                    key: `diff-ctl-${hunk.id}-${config.disabled ? "off" : "on"}`,
                    stopEvent: () => true,
                  },
                ),
              );
            }
            for (const group of tableGroups.values()) {
              const ids = group.controlIds;
              decorations.push(
                Decoration.widget(
                  group.to,
                  () => buildControlsRow(ids, config),
                  {
                    side: 1,
                    key: `diff-table-ctl-${ids.join("-")}-${config.disabled ? "off" : "on"}`,
                    stopEvent: () => true,
                  },
                ),
              );
            }
            return DecorationSet.create(state.doc, decorations);
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
          apply(tr, prev) {
            const meta = tr.getMeta(findPluginKey);
            if (meta) return buildDecorations(tr.doc, meta);
            if (tr.docChanged) return prev.map(tr.mapping, tr.doc);
            return prev;
          },
        },
        props: {
          decorations(state) {
            return findPluginKey.getState(state) ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
function searchPmDoc(doc, query, options, maxMatches) {
  const pattern = compileFindPattern(query, options);
  if (!pattern)
    return {
      matches: [],
      limited: false,
    };
  const matches = [];
  const cap = maxMatches ?? Number.POSITIVE_INFINITY;
  let limited = false;
  doc.descendants((node, pos) => {
    if (limited) return false;
    if (!node.isTextblock) return true;
    const text = node.textBetween(
      0,
      node.content.size,
      void 0,
      LEAF_PLACEHOLDER,
    );
    if (text) {
      const remaining = cap - matches.length;
      const result = findMatchesInText(text, query, options, {
        maxMatches: remaining,
        baseOffset: pos + 1,
        pattern,
      });
      matches.push(...result.matches);
      if (result.limited || matches.length >= cap) limited = true;
    }
    return false;
  });
  return {
    matches,
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
  tracker,
  markdown,
  epoch,
  now = Date.now(),
) {
  beginDiffReviewWriteAckEpoch(tracker, epoch);
  pruneExpiredDiffReviewWriteAcks(tracker, now);
  tracker.pending.push({
    markdown,
    expiresAt: now + DIFF_REVIEW_WRITE_ACK_TTL_MS,
  });
  if (tracker.pending.length > MAX_PENDING_DIFF_REVIEW_WRITE_ACKS) {
    tracker.pending.splice(
      0,
      tracker.pending.length - MAX_PENDING_DIFF_REVIEW_WRITE_ACKS,
    );
  }
}
function consumeDiffReviewWriteAck(tracker, markdown, now = Date.now()) {
  pruneExpiredDiffReviewWriteAcks(tracker, now);
  const index = tracker.pending.findIndex(
    (entry) => entry.markdown === markdown,
  );
  if (index < 0) return false;
  tracker.pending.splice(index, 1);
  return true;
}
function pendingDiffReviewWriteAckCount(tracker, now = Date.now()) {
  pruneExpiredDiffReviewWriteAcks(tracker, now);
  return tracker.pending.length;
}
function clearDiffReviewWriteAcks(tracker) {
  tracker.pending = [];
}
function serializeMarkdownDocument(editor, markdownDocument) {
  const manager = editor.storage.markdown?.manager;
  if (!manager) return null;
  try {
    return manager.serialize(markdownDocument.toJSON());
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
      shouldShow={({ editor, state }) => {
        if (!editor.isEditable) return false;
        const { from, to } = state.selection;
        return from !== to;
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
            onMouseDown={(mouseEvent) => mouseEvent.preventDefault()}
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
  const { t } = useTranslation();
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
  const hasPendingDiffReview = useDiffReviewStore((state) =>
    selectHasPendingHunksForNode(state, sourceNodeId),
  );
  const hasPendingDiffReviewRef = reactExports.useRef(hasPendingDiffReview);
  hasPendingDiffReviewRef.current = hasPendingDiffReview;
  const [contentRevision, setContentRevision] = reactExports.useState(0);
  const reviewReverting = useDiffReviewStore((state) => state.reverting);
  const reviewRequestId = useDiffReviewStore(
    (state) => state.session?.requestId ?? null,
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
        placeholder: t("canvas.editorPlaceholder"),
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
      const markdown = editor.getMarkdown();
      if (reviewSnapshot) {
        enqueueDiffReviewWriteAck(
          expectedReviewWriteAcksRef.current,
          markdown,
          reviewSnapshot.requestId,
        );
        markDirty();
        scheduleDraftSave(markdown);
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
            markdown,
            activeReview.historyDepthAtStart,
          );
        }
        useDiffReviewStore
          .getState()
          .finishSessionForUserEdit(activeReview.requestId);
      }
      userEditedRef.current = true;
      markDirty();
      scheduleDraftSave(markdown);
      findRef.current?.refresh();
    },
  });
  reactExports.useEffect(() => {
    if (!fsEditor || initializedRef.current) return;
    if (initialMarkdown) {
      fsEditor
        .chain()
        .command(({ tr }) => {
          tr.setMeta("addToHistory", false);
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
      const frame = requestAnimationFrame(() => {
        if (!fsEditor.isDestroyed) fsEditor.commands.focus("start");
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [fsEditor, initialMarkdown, sourceNodeId]);
  const canvasRootEl = useCanvasRootElement();
  const handleAnnotationConflict = reactExports.useCallback(() => {
    dedupedToast.error(
      t("canvas.annotationConflict", "选区与已有批注重叠，请重新选择"),
    );
  }, [t]);
  const annotations = useAnnotations(fsEditor, {
    onSnapshotsChange: onAnnotationsChange,
    onActivate: onAnnotationActivate,
    onConflict: handleAnnotationConflict,
  });
  const handleAnnotationStart = reactExports.useCallback(() => {
    startTextAnnotation(getCloseBlockReason, annotations.begin, () => {
      dedupedToast.warning(
        t(
          "canvas.annotationAgentRunning",
          "Text Assistant is running. Annotation is unavailable.",
        ),
      );
    });
  }, [annotations.begin, getCloseBlockReason, t]);
  const editorAnnotationsRef = reactExports.useRef(annotations);
  editorAnnotationsRef.current = annotations;
  useEditorHistoryShortcuts(fsEditor, sourceNodeId);
  reactExports.useEffect(() => {
    if (!subscribeAnnotationCommand) return;
    return subscribeAnnotationCommand((cmd) =>
      editorAnnotationsRef.current.handleCommand(cmd),
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
            const current = useDiffReviewStore.getState().session;
            if (
              !current ||
              current.requestId !== requestId ||
              current.baselineMarkdown !== void 0
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
          .command(({ tr }) => {
            tr.setMeta("addToHistory", false);
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
      const current = fsEditor?.getMarkdown() ?? external;
      externalUpdatedWhileEditingRef.current = false;
      resetBaseline(external);
      resumeDraftSave();
      if (current !== external) scheduleDraftSave(current);
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
    const markdown = deferredReviewMarkdownRef.current;
    deferredReviewMarkdownRef.current = null;
    if (
      consumeDiffReviewWriteAck(expectedReviewWriteAcksRef.current, markdown)
    ) {
      if (fsEditor?.getMarkdown() === markdown) resetBaseline(markdown);
      setContentRevision((rev) => rev + 1);
      return;
    }
    const shouldResetBaseline = applySync(markdown);
    if (shouldResetBaseline !== false) resetBaseline(markdown);
  }, [reviewReverting, applySync, resetBaseline, fsEditor]);
  const handleReviewDocumentApplied = reactExports.useCallback(
    (markdown) => {
      const requestId = useDiffReviewStore.getState().session?.requestId;
      if (requestId) {
        enqueueDiffReviewWriteAck(
          expectedReviewWriteAcksRef.current,
          markdown,
          requestId,
        );
      }
      resetBaseline(markdown);
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
        t("canvas.textConflict.blockedClose", "请先处理完所有冲突再退出"),
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
    const markdown = flushDraftSave();
    finalizeClose(onDraftChange ? void 0 : markdown);
  }, [
    conflict.active,
    finalizeClose,
    flushDraftSave,
    fsEditor,
    latestDraftRef,
    onDraftChange,
    openConflict,
    t,
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
        const { matches, limited } = searchPmDoc(
          fsEditor.state.doc,
          query,
          options,
          MAX_FIND_MATCHES,
        );
        return {
          matches,
          limited,
          caretPos: fsEditor.state.selection.from,
        };
      },
      activate(matches, index) {
        if (!fsEditor) return;
        if (index < 0 || index >= matches.length) return;
        fsEditor.view.dispatch(
          fsEditor.state.tr.setMeta(findPluginKey, {
            ranges: matches,
            activeIndex: index,
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
        const { from, to } = fsEditor.state.selection;
        return from === to
          ? ""
          : fsEditor.state.doc.textBetween(from, to, "\n");
      },
      focusEditor() {
        fsEditor?.commands.focus();
      },
      replaceOne(match, query, options, replacement) {
        if (!fsEditor) return;
        const matched = fsEditor.state.doc.textBetween(
          match.from,
          match.to,
          void 0,
          LEAF_PLACEHOLDER,
        );
        const expanded = computeReplacement(
          matched,
          query,
          options,
          replacement,
        );
        const tr = fsEditor.state.tr.insertText(
          expanded,
          match.from,
          match.to,
        );
        tr.setSelection(
          TextSelection.create(tr.doc, match.from + expanded.length),
        );
        fsEditor.view.dispatch(tr);
      },
      replaceAll(query, options, replacement) {
        if (!fsEditor) return;
        const { matches } = searchPmDoc(
          fsEditor.state.doc,
          query,
          options,
        );
        if (matches.length === 0) return;
        const tr = fsEditor.state.tr;
        for (let i = matches.length - 1; i >= 0; i--) {
          const match = matches[i];
          const matched = fsEditor.state.doc.textBetween(
            match.from,
            match.to,
            void 0,
            LEAF_PLACEHOLDER,
          );
          tr.insertText(
            computeReplacement(matched, query, options, replacement),
            match.from,
            match.to,
          );
        }
        fsEditor.view.dispatch(tr);
      },
    }),
    [fsEditor],
  );
  const findController = useFindController(findAdapter);
  findRef.current = findController;
  useFindEscapeClose(findController, handleClose);
  const [tableCtxPos, setTableCtxPos] = reactExports.useState(null);
  const closeTableCtxMenu = reactExports.useCallback(
    () => setTableCtxPos(null),
    [],
  );
  const handleEditorContextMenu = reactExports.useCallback(
    (mouseEvent) => {
      if (!fsEditor) return;
      if (!mouseEvent.target.closest("td, th")) return;
      mouseEvent.preventDefault();
      const coords = fsEditor.view.posAtCoords({
        left: mouseEvent.clientX,
        top: mouseEvent.clientY,
      });
      if (coords) fsEditor.chain().setTextSelection(coords.pos).run();
      setTableCtxPos({
        x: mouseEvent.clientX,
        y: mouseEvent.clientY,
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
      const doc = tableDocumentFromGrid(
        grid,
        t("canvas.table.untitledColumn", "Untitled"),
      );
      void canvasActions
        .addTableNodeFromDocument(doc, sourceNodeId)
        .then((nodeId) => {
          if (nodeId)
            dedupedToast.success(
              t("canvas.mdTable.toNodeDone", "已插入表格节点"),
            );
          else
            dedupedToast.error(
              t("canvas.mdTable.toNodeFailed", "插入表格节点失败"),
            );
        });
    };
  }, [canvasActions, fsEditor, sourceNodeId, t]);
  const formatItems = reactExports.useMemo(
    () => (fsEditor ? buildFormatItems(fsEditor, t) : []),
    [fsEditor, t],
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
      find={findController}
      onClose={handleClose}
    >
      {fsEditor && (
        <SelectionFormatToolbar
          editor={fsEditor}
          formatItems={formatItems}
          annotate={{
            label: t("canvas.annotate", "批注"),
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
          placeholder={t("canvas.annotationPlaceholder", "添加批注……")}
          portalTarget={canvasRootEl}
          boundsEl={editorAreaEl}
          onChange={annotations.updatePendingComment}
          onClose={annotations.closePending}
        />
      )}
    </FullscreenShell>
  );
}
