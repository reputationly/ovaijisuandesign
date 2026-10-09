// code-mirror-source-editor.jsx
import {
  StateField,
  Decoration2,
  tags$1,
  undo,
  redo,
  setSearchQuery,
  setSourceFindHighlights,
  buildSourceFindDecorations,
  undoDepth,
  redoDepth,
  reactExports,
  historyKeymap,
  indentWithTab,
  PluginKey,
} from "../vendor.js";
import { EditorState2, Compartment } from "../m04/editor-state2.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { defaultKeymap } from "./base-theme.js";
import {
  SearchQuery,
  buildCodeMirrorSelectionAnchor,
  buildCodeMirrorSelectionState,
  markdown,
  markdownLivePreview,
  replaceAll,
  search$1,
} from "./delete-markup-backward.js";
import { EditorView2 } from "./editor-view2.js";
import { markdownLanguage } from "./insert-newline-continue-markup-command.js";
import { history } from "./standard-keymap.js";
import { HighlightStyle, drawSelection, keymap, syntaxHighlighting } from "./tree-node.js";
export function editingSelectionStatesEqual(a2, b3) {
  const aAnchors = a2.anchors ?? (a2.anchor ? [a2.anchor] : []);
  const bAnchors = b3.anchors ?? (b3.anchor ? [b3.anchor] : []);
  return (
    aAnchors.length === bAnchors.length &&
    aAnchors.every((anchor, index2) => selectionAnchorsEqual(anchor, bAnchors[index2])) &&
    selectionAnchorsEqual(a2.anchor, b3.anchor) &&
    (a2.oversizedLength ?? null) === (b3.oversizedLength ?? null)
  );
}
function selectionAnchorsEqual(a2, b3) {
  if (a2 === b3) return true;
  if (!a2 || !b3) return false;
  return (
    a2.exact === b3.exact &&
    a2.prefix === b3.prefix &&
    a2.suffix === b3.suffix &&
    a2.occurrence === b3.occurrence
  );
}
const sourceFindHighlightField = StateField.define({
  create: () => Decoration2.none,
  update(value, transaction) {
    let next2 = transaction.docChanged ? value.map(transaction.changes) : value;
    for (const effect2 of transaction.effects) {
      if (effect2.is(setSourceFindHighlights)) {
        next2 = buildSourceFindDecorations(transaction.state.doc.length, effect2.value);
      }
    }
    return next2;
  },
  provide: (field) => EditorView2.decorations.from(field),
});
function createSourceSearchQuery(query, options, replacement = "") {
  return new SearchQuery({
    search: query,
    caseSensitive: options.matchCase,
    regexp: options.regex,
    wholeWord: options.wholeWord,
    // Preserve the custom FindBar's exact backslash semantics. Regex patterns
    // stay raw, and replacement text only expands `$&` / capture groups.
    literal: true,
    replace: replacement,
    // The shared find logic ignores zero-width regex matches; keep source mode
    // aligned so replace-all never inserts at every character boundary.
    test: (match2) => match2.length > 0,
  });
}
const emptySourceSearchQuery = new SearchQuery({
  search: "",
});
const markdownHighlightStyle = HighlightStyle.define([
  {
    tag: tags$1.heading1,
    color: "var(--foreground)",
    fontSize: "1.5em",
    fontWeight: "700",
  },
  {
    tag: tags$1.heading2,
    color: "var(--foreground)",
    fontSize: "1.25em",
    fontWeight: "600",
  },
  {
    tag: tags$1.heading3,
    color: "var(--foreground)",
    fontSize: "1.1em",
    fontWeight: "600",
  },
  // h4-h6 fallback.
  {
    tag: tags$1.heading,
    color: "var(--foreground)",
    fontWeight: "600",
  },
  {
    tag: tags$1.strong,
    color: "var(--foreground)",
    fontWeight: "700",
  },
  {
    tag: tags$1.emphasis,
    fontStyle: "italic",
  },
  {
    tag: tags$1.strikethrough,
    textDecoration: "line-through",
  },
  {
    tag: [tags$1.meta, tags$1.processingInstruction, tags$1.contentSeparator, tags$1.quote],
    color: "var(--muted-foreground)",
  },
  {
    tag: tags$1.link,
    color: "var(--primary, #2563eb)",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  },
  {
    tag: tags$1.url,
    color: "var(--muted-foreground)",
  },
  {
    tag: tags$1.monospace,
    color: "var(--foreground)",
    fontFamily: "'SF Mono', 'Fira Code', Menlo, Consolas, monospace",
    fontSize: "0.9em",
    background: "var(--bg-surface-secondary, #f7f7f7)",
    borderRadius: "3px",
    padding: "0.1em 0.3em",
  },
]);
const sourceEditorTheme = EditorView2.theme({
  "&": {
    height: "100%",
    backgroundColor: "transparent",
    color: "var(--foreground)",
    // Match the Tiptap fullscreen editor exactly: its ProseMirror root is
    // `text-sm` (14px). Tailwind 4's text-sm line-height is the RELATIVE
    // calc(1.25 / 0.875) ≈ 1.4286 — body lines get 20px, and heading lines
    // scale with their em font-size (h2 → 25px, h1 → 30px) just like the
    // rendered h1/h2 blocks in Tiptap.
    fontSize: "0.875rem",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-scroller": {
    height: "100%",
    overflow: "auto",
    fontFamily: "inherit",
    lineHeight: "calc(1.25 / 0.875)",
  },
  ".cm-content": {
    minHeight: "100%",
    // The editor owns the scroller (FullscreenShell only keeps the static
    // left gutter), so the page padding lives inside the content and scrolls
    // with it — the scrollbar spans the full pane at its right edge.
    padding: "16px 32px 16px 0",
    caretColor: "var(--canvas-text-accent)",
  },
  ".cm-line": {
    padding: "0",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--canvas-text-accent)",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in srgb, var(--canvas-text-accent) 28%, transparent)",
  },
});
function historyAvailability(state2) {
  return {
    canUndo: undoDepth(state2) > 0,
    canRedo: redoDepth(state2) > 0,
  };
}
export const CodeMirrorSourceEditor = reactExports.forwardRef(function CodeMirrorSourceEditor2(
  {
    initialValue,
    readOnly: readOnly2 = false,
    onDocumentChange,
    onSelectionChange,
    onHistoryAvailabilityChange,
  },
  forwardedRef,
) {
  const hostRef = reactExports.useRef(null);
  const viewRef = reactExports.useRef(null);
  const createStateRef = reactExports.useRef(null);
  const editabilityCompartmentRef = reactExports.useRef(new Compartment());
  const initialValueRef = reactExports.useRef(initialValue);
  initialValueRef.current = initialValue;
  const readOnlyRef = reactExports.useRef(readOnly2);
  readOnlyRef.current = readOnly2;
  const onDocumentChangeRef = reactExports.useRef(onDocumentChange);
  onDocumentChangeRef.current = onDocumentChange;
  const onSelectionChangeRef = reactExports.useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;
  const onHistoryAvailabilityChangeRef = reactExports.useRef(onHistoryAvailabilityChange);
  onHistoryAvailabilityChangeRef.current = onHistoryAvailabilityChange;
  reactExports.useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const extensions2 = [
      history(),
      // Layer-drawn selection stays visible while the editor is blurred (focus
      // in the sibling chat/agent input) — the native selection would vanish.
      drawSelection(),
      // GFM base: strikethrough / tables / task lists parse like the rich
      // editor's Markdown pipeline instead of plain CommonMark.
      markdown({
        base: markdownLanguage,
      }),
      syntaxHighlighting(markdownHighlightStyle),
      markdownLivePreview(),
      sourceFindHighlightField,
      // Search state is headless here: FullscreenShell keeps the product FindBar,
      // while CodeMirror supplies rope-backed scanning and replace-all commands.
      search$1(),
      sourceEditorTheme,
      EditorView2.lineWrapping,
      EditorView2.contentAttributes.of({
        spellcheck: "false",
        autocorrect: "off",
        autocapitalize: "off",
      }),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      EditorView2.updateListener.of((update2) => {
        if (update2.docChanged) {
          onDocumentChangeRef.current(() => update2.view.state.doc.toString());
          onHistoryAvailabilityChangeRef.current(historyAvailability(update2.state));
        }
        if (update2.docChanged || update2.selectionSet) onSelectionChangeRef.current();
      }),
    ];
    const createState2 = (doc2) =>
      EditorState2.create({
        doc: doc2,
        extensions: [
          ...extensions2,
          editabilityCompartmentRef.current.of([
            EditorState2.readOnly.of(readOnlyRef.current),
            EditorView2.editable.of(!readOnlyRef.current),
          ]),
        ],
      });
    createStateRef.current = createState2;
    const view2 = new EditorView2({
      state: createState2(initialValueRef.current),
      parent: host,
    });
    viewRef.current = view2;
    onHistoryAvailabilityChangeRef.current(historyAvailability(view2.state));
    return () => {
      viewRef.current = null;
      createStateRef.current = null;
      view2.destroy();
    };
  }, []);
  reactExports.useLayoutEffect(() => {
    const view2 = viewRef.current;
    if (!view2) return;
    view2.dispatch({
      effects: editabilityCompartmentRef.current.reconfigure([
        EditorState2.readOnly.of(readOnly2),
        EditorView2.editable.of(!readOnly2),
      ]),
    });
  }, [readOnly2]);
  reactExports.useImperativeHandle(
    forwardedRef,
    () => ({
      getValue: () => viewRef.current?.state.doc.toString() ?? initialValueRef.current,
      setValue: (value) => {
        const view2 = viewRef.current;
        const createState2 = createStateRef.current;
        if (!view2 || !createState2 || view2.state.doc.toString() === value) return;
        view2.setState(createState2(value));
        onHistoryAvailabilityChangeRef.current(historyAvailability(view2.state));
        onSelectionChangeRef.current();
      },
      getSelectionAnchor: () => {
        const view2 = viewRef.current;
        return view2 ? buildCodeMirrorSelectionAnchor(view2.state) : null;
      },
      getSelectionState: () => {
        const view2 = viewRef.current;
        return view2
          ? buildCodeMirrorSelectionState(view2.state)
          : {
              anchor: null,
            };
      },
      getSelectedText: () => {
        const view2 = viewRef.current;
        if (!view2) return "";
        const { from: from2, to } = view2.state.selection.main;
        return from2 === to ? "" : view2.state.sliceDoc(from2, to);
      },
      getText: (from2, to) => {
        const view2 = viewRef.current;
        if (!view2) return "";
        const start2 = Math.max(0, Math.min(from2, view2.state.doc.length));
        const end2 = Math.max(start2, Math.min(to, view2.state.doc.length));
        return view2.state.sliceDoc(start2, end2);
      },
      getCaretPosition: () => viewRef.current?.state.selection.main.head ?? 0,
      findMatches: (query, options, maxMatches) => {
        const view2 = viewRef.current;
        const sourceQuery = createSourceSearchQuery(query, options);
        if (!view2 || !sourceQuery.valid || maxMatches <= 0) {
          return {
            matches: [],
            limited: false,
          };
        }
        const matches2 = [];
        const cursor = sourceQuery.getCursor(view2.state);
        for (let result = cursor.next(); !result.done; result = cursor.next()) {
          const match2 = result.value;
          if (match2.from >= match2.to) continue;
          matches2.push({
            from: match2.from,
            to: match2.to,
          });
          if (matches2.length >= maxMatches)
            return {
              matches: matches2,
              limited: true,
            };
        }
        return {
          matches: matches2,
          limited: false,
        };
      },
      setSelection: (from2, to) => {
        const view2 = viewRef.current;
        if (!view2) return;
        const start2 = Math.max(0, Math.min(from2, view2.state.doc.length));
        const end2 = Math.max(start2, Math.min(to, view2.state.doc.length));
        view2.dispatch({
          selection: {
            anchor: start2,
            head: end2,
          },
          effects: EditorView2.scrollIntoView(start2, {
            y: "center",
          }),
        });
      },
      clearSelection: () => {
        const view2 = viewRef.current;
        if (!view2) return;
        const { from: from2, to } = view2.state.selection.main;
        if (from2 === to) return;
        view2.dispatch({
          selection: {
            anchor: to,
          },
        });
      },
      setFindMatches: (matches2, activeIndex) => {
        const view2 = viewRef.current;
        const active2 = matches2[activeIndex];
        if (!view2 || !active2) return;
        const start2 = Math.max(0, Math.min(active2.from, view2.state.doc.length));
        const end2 = Math.max(start2, Math.min(active2.to, view2.state.doc.length));
        view2.dispatch({
          selection: {
            anchor: start2,
            head: end2,
          },
          effects: [
            setSourceFindHighlights.of({
              matches: matches2,
              activeIndex,
            }),
            EditorView2.scrollIntoView(start2, {
              y: "center",
            }),
          ],
        });
      },
      clearFindMatches: () => {
        viewRef.current?.dispatch({
          effects: setSourceFindHighlights.of({
            matches: [],
            activeIndex: -1,
          }),
        });
      },
      replaceRange: (from2, to, value) => {
        const view2 = viewRef.current;
        if (!view2) return;
        view2.dispatch({
          changes: {
            from: from2,
            to,
            insert: value,
          },
          selection: {
            anchor: from2 + value.length,
          },
          scrollIntoView: true,
        });
      },
      replaceAll: (query, options, replacement) => {
        const view2 = viewRef.current;
        const sourceQuery = createSourceSearchQuery(query, options, replacement);
        if (!view2 || !sourceQuery.valid) return false;
        view2.dispatch({
          effects: setSearchQuery.of(sourceQuery),
        });
        const replaced = replaceAll(view2);
        view2.dispatch({
          effects: setSearchQuery.of(emptySourceSearchQuery),
        });
        return replaced;
      },
      replaceDocument: (value) => {
        const view2 = viewRef.current;
        if (!view2) return;
        view2.dispatch({
          changes: {
            from: 0,
            to: view2.state.doc.length,
            insert: value,
          },
          selection: {
            anchor: 0,
          },
          scrollIntoView: true,
        });
      },
      focus: () => viewRef.current?.focus(),
      undo: () => {
        const view2 = viewRef.current;
        return view2 ? undo(view2) : false;
      },
      redo: () => {
        const view2 = viewRef.current;
        return view2 ? redo(view2) : false;
      },
    }),
    [],
  );
  return (
    <div
      ref={hostRef}
      className="h-full min-h-0 w-full"
      data-action-ui-id="canvas-text-large-markdown-editor"
    />
  );
});
export const DIFF_ADD_CLASS = "canvas-diff-add";
export const DIFF_DEL_CLASS = "canvas-diff-del";
export const DIFF_DEL_INLINE_CLASS = "canvas-diff-del-inline";
export const DIFF_CONTROLS_CLASS = "canvas-diff-controls";
export const diffReviewPluginKey = new PluginKey("canvasDiffReview");
export function buildControls(ids2, config2) {
  const bar = document.createElement("div");
  bar.className = DIFF_CONTROLS_CLASS;
  bar.setAttribute("data-diff-controls-for", ids2.join(" "));
  bar.setAttribute("data-diff-control-count", String(ids2.length));
  bar.contentEditable = "false";
  const mkBtn = (label, action, onClick) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.className = `${DIFF_CONTROLS_CLASS}-btn ${DIFF_CONTROLS_CLASS}-btn-${action}`;
    btn.setAttribute("data-action-ui-id", `canvas-diff-${action}`);
    btn.disabled = config2.disabled;
    btn.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    bar.appendChild(btn);
  };
  const hunkIds = [...ids2];
  mkBtn(config2.undoLabel, "undo", () => {
    if (hunkIds.length === 1) config2.onUndo(hunkIds[0]);
    else config2.onUndoGroup(hunkIds);
  });
  mkBtn(config2.acceptLabel, "accept", () => {
    if (hunkIds.length === 1) config2.onAccept(hunkIds[0]);
    else config2.onAcceptGroup(hunkIds);
  });
  return bar;
}
