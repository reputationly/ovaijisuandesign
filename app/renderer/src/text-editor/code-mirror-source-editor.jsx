// code-mirror-source-editor.jsx
import {
  reactExports,
} from "../vendor.js";
import { StateEffect, StateField } from "@codemirror/state";
import { Decoration } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  redo,
  redoDepth,
  undo,
  undoDepth,
} from "@codemirror/commands";
import { EditorView2 } from "../vendor-inline/codemirror/editor-view2.js";
import {
  drawSelection,
  HighlightStyle,
  keymap,
  syntaxHighlighting,
} from "../vendor-inline/codemirror/tree-node.js";
import {
  buildCodeMirrorSelectionAnchor,
  buildCodeMirrorSelectionState,
  markdownLivePreview,
} from "../vendor-inline/codemirror/delete-markup-backward.js";
import { markdown } from "@codemirror/lang-markdown";
import {
  replaceAll,
  SearchQuery,
  search,
  setSearchQuery,
} from "@codemirror/search";
import { markdownLanguage } from "../vendor-inline/codemirror/insert-newline-continue-markup-command.js";
import {
  Compartment,
  EditorState2,
} from "../vendor-inline/codemirror/editor-state2.js";
import { __jsx } from "../shared/jsx-runtime.js";
const setSourceFindHighlights = StateEffect.define();
const sourceFindMatch = Decoration.mark({
  class: "canvas-find-match",
});
const sourceFindMatchActive = Decoration.mark({
  class: "canvas-find-match canvas-find-match-active",
});
const MAX_SOURCE_FIND_DECORATIONS = 2e3;
function buildSourceFindDecorations(
  docLength,
  { matches, activeIndex },
) {
  const ranges = [];
  const push = (match, active) => {
    if (match.from < 0 || match.from >= match.to || match.to > docLength)
      return;
    ranges.push(
      (active ? sourceFindMatchActive : sourceFindMatch).range(
        match.from,
        match.to,
      ),
    );
  };
  const count = Math.min(matches.length, MAX_SOURCE_FIND_DECORATIONS);
  for (let i = 0; i < count; i++) push(matches[i], i === activeIndex);
  if (activeIndex >= count && activeIndex < matches.length)
    push(matches[activeIndex], true);
  return Decoration.set(ranges, true);
}
const sourceFindHighlightField = StateField.define({
  create: () => Decoration.none,
  update(value, transaction) {
    let next = transaction.docChanged ? value.map(transaction.changes) : value;
    for (const effect of transaction.effects) {
      if (effect.is(setSourceFindHighlights)) {
        next = buildSourceFindDecorations(
          transaction.state.doc.length,
          effect.value,
        );
      }
    }
    return next;
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
    test: (match) => match.length > 0,
  });
}
const emptySourceSearchQuery = new SearchQuery({
  search: "",
});
const markdownHighlightStyle = HighlightStyle.define([
  {
    tag: tags.heading1,
    color: "var(--foreground)",
    fontSize: "1.5em",
    fontWeight: "700",
  },
  {
    tag: tags.heading2,
    color: "var(--foreground)",
    fontSize: "1.25em",
    fontWeight: "600",
  },
  {
    tag: tags.heading3,
    color: "var(--foreground)",
    fontSize: "1.1em",
    fontWeight: "600",
  },
  // h4-h6 fallback.
  {
    tag: tags.heading,
    color: "var(--foreground)",
    fontWeight: "600",
  },
  {
    tag: tags.strong,
    color: "var(--foreground)",
    fontWeight: "700",
  },
  {
    tag: tags.emphasis,
    fontStyle: "italic",
  },
  {
    tag: tags.strikethrough,
    textDecoration: "line-through",
  },
  {
    tag: [
      tags.meta,
      tags.processingInstruction,
      tags.contentSeparator,
      tags.quote,
    ],
    color: "var(--muted-foreground)",
  },
  {
    tag: tags.link,
    color: "var(--primary, #2563eb)",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  },
  {
    tag: tags.url,
    color: "var(--muted-foreground)",
  },
  {
    tag: tags.monospace,
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
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection":
    {
      backgroundColor:
        "color-mix(in srgb, var(--canvas-text-accent) 28%, transparent)",
    },
});
function historyAvailability(state) {
  return {
    canUndo: undoDepth(state) > 0,
    canRedo: redoDepth(state) > 0,
  };
}
export const CodeMirrorSourceEditor = reactExports.forwardRef(
  function CodeMirrorSourceEditor(
    {
      initialValue,
      readOnly = false,
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
    const readOnlyRef = reactExports.useRef(readOnly);
    readOnlyRef.current = readOnly;
    const onDocumentChangeRef = reactExports.useRef(onDocumentChange);
    onDocumentChangeRef.current = onDocumentChange;
    const onSelectionChangeRef = reactExports.useRef(onSelectionChange);
    onSelectionChangeRef.current = onSelectionChange;
    const onHistoryAvailabilityChangeRef = reactExports.useRef(
      onHistoryAvailabilityChange,
    );
    onHistoryAvailabilityChangeRef.current = onHistoryAvailabilityChange;
    reactExports.useLayoutEffect(() => {
      const host = hostRef.current;
      if (!host) return;
      const extensions = [
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
        search(),
        sourceEditorTheme,
        EditorView2.lineWrapping,
        EditorView2.contentAttributes.of({
          spellcheck: "false",
          autocorrect: "off",
          autocapitalize: "off",
        }),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView2.updateListener.of((update) => {
          if (update.docChanged) {
            onDocumentChangeRef.current(() =>
              update.view.state.doc.toString(),
            );
            onHistoryAvailabilityChangeRef.current(
              historyAvailability(update.state),
            );
          }
          if (update.docChanged || update.selectionSet)
            onSelectionChangeRef.current();
        }),
      ];
      const createState = (doc) =>
        EditorState2.create({
          doc,
          extensions: [
            ...extensions,
            editabilityCompartmentRef.current.of([
              EditorState2.readOnly.of(readOnlyRef.current),
              EditorView2.editable.of(!readOnlyRef.current),
            ]),
          ],
        });
      createStateRef.current = createState;
      const view = new EditorView2({
        state: createState(initialValueRef.current),
        parent: host,
      });
      viewRef.current = view;
      onHistoryAvailabilityChangeRef.current(historyAvailability(view.state));
      return () => {
        viewRef.current = null;
        createStateRef.current = null;
        view.destroy();
      };
    }, []);
    reactExports.useLayoutEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: editabilityCompartmentRef.current.reconfigure([
          EditorState2.readOnly.of(readOnly),
          EditorView2.editable.of(!readOnly),
        ]),
      });
    }, [readOnly]);
    reactExports.useImperativeHandle(
      forwardedRef,
      () => ({
        getValue: () =>
          viewRef.current?.state.doc.toString() ?? initialValueRef.current,
        setValue: (value) => {
          const view = viewRef.current;
          const createState = createStateRef.current;
          if (!view || !createState || view.state.doc.toString() === value)
            return;
          view.setState(createState(value));
          onHistoryAvailabilityChangeRef.current(
            historyAvailability(view.state),
          );
          onSelectionChangeRef.current();
        },
        getSelectionAnchor: () => {
          const view = viewRef.current;
          return view ? buildCodeMirrorSelectionAnchor(view.state) : null;
        },
        getSelectionState: () => {
          const view = viewRef.current;
          return view
            ? buildCodeMirrorSelectionState(view.state)
            : {
                anchor: null,
              };
        },
        getSelectedText: () => {
          const view = viewRef.current;
          if (!view) return "";
          const { from, to } = view.state.selection.main;
          return from === to ? "" : view.state.sliceDoc(from, to);
        },
        getText: (from, to) => {
          const view = viewRef.current;
          if (!view) return "";
          const start = Math.max(0, Math.min(from, view.state.doc.length));
          const end = Math.max(start, Math.min(to, view.state.doc.length));
          return view.state.sliceDoc(start, end);
        },
        getCaretPosition: () => viewRef.current?.state.selection.main.head ?? 0,
        findMatches: (query, options, maxMatches) => {
          const view = viewRef.current;
          const sourceQuery = createSourceSearchQuery(query, options);
          if (!view || !sourceQuery.valid || maxMatches <= 0) {
            return {
              matches: [],
              limited: false,
            };
          }
          const matches = [];
          const cursor = sourceQuery.getCursor(view.state);
          for (
            let result = cursor.next();
            !result.done;
            result = cursor.next()
          ) {
            const match = result.value;
            if (match.from >= match.to) continue;
            matches.push({
              from: match.from,
              to: match.to,
            });
            if (matches.length >= maxMatches)
              return {
                matches,
                limited: true,
              };
          }
          return {
            matches,
            limited: false,
          };
        },
        setSelection: (from, to) => {
          const view = viewRef.current;
          if (!view) return;
          const start = Math.max(0, Math.min(from, view.state.doc.length));
          const end = Math.max(start, Math.min(to, view.state.doc.length));
          view.dispatch({
            selection: {
              anchor: start,
              head: end,
            },
            effects: EditorView2.scrollIntoView(start, {
              y: "center",
            }),
          });
        },
        clearSelection: () => {
          const view = viewRef.current;
          if (!view) return;
          const { from, to } = view.state.selection.main;
          if (from === to) return;
          view.dispatch({
            selection: {
              anchor: to,
            },
          });
        },
        setFindMatches: (matches, activeIndex) => {
          const view = viewRef.current;
          const active = matches[activeIndex];
          if (!view || !active) return;
          const start = Math.max(
            0,
            Math.min(active.from, view.state.doc.length),
          );
          const end = Math.max(
            start,
            Math.min(active.to, view.state.doc.length),
          );
          view.dispatch({
            selection: {
              anchor: start,
              head: end,
            },
            effects: [
              setSourceFindHighlights.of({
                matches,
                activeIndex,
              }),
              EditorView2.scrollIntoView(start, {
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
        replaceRange: (from, to, value) => {
          const view = viewRef.current;
          if (!view) return;
          view.dispatch({
            changes: {
              from,
              to,
              insert: value,
            },
            selection: {
              anchor: from + value.length,
            },
            scrollIntoView: true,
          });
        },
        replaceAll: (query, options, replacement) => {
          const view = viewRef.current;
          const sourceQuery = createSourceSearchQuery(
            query,
            options,
            replacement,
          );
          if (!view || !sourceQuery.valid) return false;
          view.dispatch({
            effects: setSearchQuery.of(sourceQuery),
          });
          const replaced = replaceAll(view);
          view.dispatch({
            effects: setSearchQuery.of(emptySourceSearchQuery),
          });
          return replaced;
        },
        replaceDocument: (value) => {
          const view = viewRef.current;
          if (!view) return;
          view.dispatch({
            changes: {
              from: 0,
              to: view.state.doc.length,
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
          const view = viewRef.current;
          return view ? undo(view) : false;
        },
        redo: () => {
          const view = viewRef.current;
          return view ? redo(view) : false;
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
  },
);
