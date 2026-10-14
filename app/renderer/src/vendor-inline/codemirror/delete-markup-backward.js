// 留在这里：markdownLivePreview、buildPmSelectionState、buildTextareaSelectionState、buildCodeMirrorSelectionState、buildCodeMirrorSelectionAnchor 在已安装的 @codemirror/lang-markdown@6.5.2、@codemirror/view@6.43.6、@codemirror/language@6.12.4、@codemirror/state@6.7.5 的 dist/index.js 导出和源码里都不存在。这是应用自己的 Markdown 实时预览和选区锚点，不能改成 npm import。
import { syntaxTree } from "@codemirror/language";
import { Decoration, EditorView, ViewPlugin } from "@codemirror/view";
import { getAnnotationSelectionRanges } from "../../text-editor/configuration2.js";
import { TEXT_EDIT_SELECTION_MAX_LENGTH } from "../../text-editor/build-asr-gateway-request.js";
import { blankLine, blankLineExtra, horizontalRule, hiddenMark } from "../../text-editor/scrollable-markdown-table-view.js";
import {
  ATX_HEADINGS,
  collectHeadingMarks,
  collectInlineMarks,
  collectLinkChrome,
  INLINE_MARKS,
  isBlankLine$1,
} from "./line2.js";

function computeLivePreviewRanges(state, from, to) {
  const out = [];
  syntaxTree(state).iterate({
    from,
    to,
    enter: (ref) => {
      const name = ref.name;
      if (name === "HorizontalRule") {
        out.push({ from: ref.from, to: ref.to, kind: "horizontal-rule" });
        return;
      }
      const node =
        ATX_HEADINGS.has(name) || name in INLINE_MARKS || name === "Link" ? ref.node : null;
      if (!node) return;
      if (ATX_HEADINGS.has(name)) collectHeadingMarks(state, node, out);
      else if (name === "Link") collectLinkChrome(node, out);
      else collectInlineMarks(node, INLINE_MARKS[name] ?? "", out);
    },
  });
  for (let pos = from; pos <= to; ) {
    const line = state.doc.lineAt(pos);
    if (isBlankLine$1(line.text)) {
      const prevBlank = line.from > 0 && isBlankLine$1(state.doc.lineAt(line.from - 1).text);
      out.push({ from: line.from, to: line.from, kind: prevBlank ? "blank-line-extra" : "blank-line" });
    }
    pos = line.to + 1;
  }
  return out;
}

function buildDecorations(view) {
  const decorations = [];
  const atoms = [];
  for (const { from, to } of view.visibleRanges) {
    for (const range of computeLivePreviewRanges(view.state, from, to)) {
      if (range.kind === "blank-line" || range.kind === "blank-line-extra") {
        decorations.push((range.kind === "blank-line" ? blankLine : blankLineExtra).range(range.from));
        continue;
      }
      if (range.to <= range.from) continue;
      const decoration = range.kind === "horizontal-rule" ? horizontalRule : hiddenMark;
      decorations.push(decoration.range(range.from, range.to));
      atoms.push(decoration.range(range.from, range.to));
    }
  }
  return { decorations: Decoration.set(decorations, true), atoms: Decoration.set(atoms, true) };
}

const livePreviewTheme = EditorView.baseTheme({
  ".cm-md-hr": {
    display: "inline-block",
    width: "100%",
    height: "0",
    verticalAlign: "middle",
    borderTop: "1px solid var(--border-muted, #e5e7eb)",
  },
  ".cm-line.cm-md-blank": {
    fontSize: "0.375rem",
    lineHeight: "0.375rem",
  },
  ".cm-line.cm-md-blank-extra": {
    fontSize: "0.125rem",
    lineHeight: "0.125rem",
  },
});

export function markdownLivePreview() {
  const plugin = ViewPlugin.fromClass(
    class {
      constructor(view) {
        Object.assign(this, buildDecorations(view));
      }

      update(update) {
        if (
          update.docChanged ||
          update.viewportChanged ||
          syntaxTree(update.state) !== syntaxTree(update.startState)
        ) {
          Object.assign(this, buildDecorations(update.view));
        }
      }
    },
    {
      decorations: (value) => value.decorations,
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => view.plugin(plugin)?.atoms ?? Decoration.none),
    },
  );
  return [plugin, livePreviewTheme];
}

const SELECTION_ANCHOR_CONTEXT_LENGTH = 32;
const SELECTION_ANCHOR_MAX_LENGTH = TEXT_EDIT_SELECTION_MAX_LENGTH;
const EMPTY_SELECTION_STATE = { anchor: null };

export function buildPmSelectionState(state) {
  const ranges = getAnnotationSelectionRanges(state.selection);
  if (ranges.length === 0) return EMPTY_SELECTION_STATE;
  const anchors = [];
  let totalLength = 0;
  for (const { from, to } of ranges) {
    const exact = state.doc.textBetween(from, to, " ", " ");
    if (!exact.trim()) continue;
    totalLength += exact.length;
    anchors.push({
      exact,
      prefix: state.doc.textBetween(Math.max(0, from - SELECTION_ANCHOR_CONTEXT_LENGTH), from, " ", " "),
      suffix: state.doc.textBetween(to, Math.min(state.doc.content.size, to + SELECTION_ANCHOR_CONTEXT_LENGTH), " ", " "),
    });
  }
  if (anchors.length === 0) return EMPTY_SELECTION_STATE;
  if (totalLength > SELECTION_ANCHOR_MAX_LENGTH) return { anchor: null, oversizedLength: totalLength };
  return { anchor: anchors[0], anchors };
}

function buildSourceSelectionState(length, selectionStart, selectionEnd, slice) {
  if (selectionStart == null || selectionEnd == null) return EMPTY_SELECTION_STATE;
  const from = Math.min(selectionStart, selectionEnd);
  const to = Math.max(selectionStart, selectionEnd);
  if (from >= to) return EMPTY_SELECTION_STATE;
  if (to - from > SELECTION_ANCHOR_MAX_LENGTH) return { anchor: null, oversizedLength: to - from };
  const exact = slice(from, to);
  if (!exact.trim()) return EMPTY_SELECTION_STATE;
  return {
    anchor: {
      exact,
      prefix: slice(Math.max(0, from - SELECTION_ANCHOR_CONTEXT_LENGTH), from),
      suffix: slice(to, Math.min(length, to + SELECTION_ANCHOR_CONTEXT_LENGTH)),
    },
  };
}

export function buildTextareaSelectionState(value, selectionStart, selectionEnd) {
  return buildSourceSelectionState(value.length, selectionStart, selectionEnd, (from, to) =>
    value.slice(from, to),
  );
}

export function buildCodeMirrorSelectionState(state) {
  const { from, to } = state.selection.main;
  return buildSourceSelectionState(state.doc.length, from, to, (start, end) =>
    state.sliceDoc(start, end),
  );
}

export function buildCodeMirrorSelectionAnchor(state) {
  return buildCodeMirrorSelectionState(state).anchor;
}
