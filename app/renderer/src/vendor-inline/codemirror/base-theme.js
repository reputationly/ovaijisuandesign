// base-theme.js
import { Transaction2, Prec, Facet, StateEffect, Parser$1, StateField, Decoration2, tags$1, Text, moveLineUp, copyLineUp, moveLineDown, copyLineDown, addCursorAbove, addCursorBelow, simplifySelection, selectLine, indentLess, indentMore, deleteLine, toggleComment, toggleBlockComment, toggleTabFocusMode, ensureAnchor, setActive, moveToField, ActiveSnippet, Snippet, pickedCompletion, fieldSelection, Type, isBulletList, space$2, isSetextUnderline, skipSpaceBack, isBlockquote, getListIndent, isAtxHeading, isHTMLBlock, HTMLBlockStyle, EmptyLine, CommentEnd, ProcessingEnd, skipSpace, lineEnd, LeafBlock, toRelative, scanLineResult, none, TreeElement, resolveConfig, nonEmpty$1, Tag, findName, Punctuation, InlineDelimiter, NotLast, leftOverSpace, scriptTokens, styleTokens, textareaTokens, endTag$1, tagStart, commentContent, ScriptText, maybeNest, StyleText, TextareaText, Element$1, findTagName, getAttrs, CloseTag, Attribute2, AttributeValue, UnquotedAttributeValue } from "../../vendor.js";
import { isOrderedList, isFencedCode, Line2, Escapable, EmphasisUnderscore, EmphasisAsterisk, LinkStart, ImageStart, elementContext } from "./line2.js";
import { NodeProp, Tree, NodeSet, parseMixed } from "@lezer/common";
import { LRParser } from "@lezer/lr";
import { EditorView2 } from "./editor-view2.js";
import {
  cursorMatchingBracket,
  cursorSyntaxLeft,
  cursorSyntaxRight,
  indentSelection,
  insertBlankLine,
  selectParentSyntax,
  selectSyntaxLeft,
  selectSyntaxRight,
  standardKeymap,
} from "./standard-keymap.js";
import { NodeType3, keymap, styleTags, syntaxTree } from "./tree-node.js";
export const defaultKeymap = [
  {
    key: "Alt-ArrowLeft",
    mac: "Ctrl-ArrowLeft",
    run: cursorSyntaxLeft,
    shift: selectSyntaxLeft,
  },
  {
    key: "Alt-ArrowRight",
    mac: "Ctrl-ArrowRight",
    run: cursorSyntaxRight,
    shift: selectSyntaxRight,
  },
  {
    key: "Alt-ArrowUp",
    run: moveLineUp,
  },
  {
    key: "Shift-Alt-ArrowUp",
    run: copyLineUp,
  },
  {
    key: "Alt-ArrowDown",
    run: moveLineDown,
  },
  {
    key: "Shift-Alt-ArrowDown",
    run: copyLineDown,
  },
  {
    key: "Mod-Alt-ArrowUp",
    run: addCursorAbove,
  },
  {
    key: "Mod-Alt-ArrowDown",
    run: addCursorBelow,
  },
  {
    key: "Escape",
    run: simplifySelection,
  },
  {
    key: "Mod-Enter",
    run: insertBlankLine,
  },
  {
    key: "Alt-l",
    mac: "Ctrl-l",
    run: selectLine,
  },
  {
    key: "Mod-i",
    run: selectParentSyntax,
    preventDefault: true,
  },
  {
    key: "Mod-[",
    run: indentLess,
  },
  {
    key: "Mod-]",
    run: indentMore,
  },
  {
    key: "Mod-Alt-\\",
    run: indentSelection,
  },
  {
    key: "Shift-Mod-k",
    run: deleteLine,
  },
  {
    key: "Shift-Mod-\\",
    run: cursorMatchingBracket,
  },
  {
    key: "Mod-/",
    run: toggleComment,
  },
  {
    key: "Alt-A",
    run: toggleBlockComment,
  },
  {
    key: "Ctrl-m",
    mac: "Shift-Alt-m",
    run: toggleTabFocusMode,
  },
].concat(standardKeymap);
export class CompletionContext {
  /**
  Create a new completion context. (Mostly useful for testing
  completion sources—in the editor, the extension will create
  these for you.)
  */
  constructor(state2, pos, explicit, view2) {
    this.state = state2;
    this.pos = pos;
    this.explicit = explicit;
    this.view = view2;
    this.abortListeners = [];
    this.abortOnDocChange = false;
  }
  /**
  Get the extent, content, and (if there is a token) type of the
  token before `this.pos`.
  */
  tokenBefore(types2) {
    let token2 = syntaxTree(this.state).resolveInner(this.pos, -1);
    while (token2 && types2.indexOf(token2.name) < 0) token2 = token2.parent;
    return token2
      ? {
          from: token2.from,
          to: this.pos,
          text: this.state.sliceDoc(token2.from, this.pos),
          type: token2.type,
        }
      : null;
  }
  /**
  Get the match of the given expression directly before the
  cursor.
  */
  matchBefore(expr) {
    let line = this.state.doc.lineAt(this.pos);
    let start2 = Math.max(line.from, this.pos - 250);
    let str2 = line.text.slice(start2 - line.from, this.pos - line.from);
    let found2 = str2.search(ensureAnchor(expr));
    return found2 < 0
      ? null
      : {
          from: start2 + found2,
          to: this.pos,
          text: str2.slice(found2),
        };
  }
  /**
  Yields true when the query has been aborted. Can be useful in
  asynchronous queries to avoid doing work that will be ignored.
  */
  get aborted() {
    return this.abortListeners == null;
  }
  /**
  Allows you to register abort handlers, which will be called when
  the query is
  [aborted](https://codemirror.net/6/docs/ref/#autocomplete.CompletionContext.aborted).
  
  By default, running queries will not be aborted for regular
  typing or backspacing, on the assumption that they are likely to
  return a result with a
  [`validFor`](https://codemirror.net/6/docs/ref/#autocomplete.CompletionResult.validFor) field that
  allows the result to be used after all. Passing `onDocChange:
  true` will cause this query to be aborted for any document
  change.
  */
  addEventListener(type2, listener, options) {
    if (type2 == "abort" && this.abortListeners) {
      this.abortListeners.push(listener);
      if (options && options.onDocChange) this.abortOnDocChange = true;
    }
  }
}
export function ifNotIn(nodes, source) {
  return (context) => {
    for (let pos = syntaxTree(context.state).resolveInner(context.pos, -1); pos; pos = pos.parent) {
      if (nodes.indexOf(pos.name) > -1) return null;
      if (pos.type.isTop) break;
    }
    return source(context);
  };
}
const baseTheme$1 = EditorView2.baseTheme({
  ".cm-tooltip.cm-tooltip-autocomplete": {
    "& > ul": {
      fontFamily: "monospace",
      whiteSpace: "nowrap",
      overflow: "hidden auto",
      maxWidth_fallback: "700px",
      maxWidth: "min(700px, 95vw)",
      minWidth: "250px",
      maxHeight: "10em",
      height: "100%",
      listStyle: "none",
      margin: 0,
      padding: 0,
      "& > li, & > completion-section": {
        padding: "1px 3px",
        lineHeight: 1.2,
      },
      "& > li": {
        overflowX: "hidden",
        textOverflow: "ellipsis",
        cursor: "pointer",
      },
      "& > completion-section": {
        display: "list-item",
        borderBottom: "1px solid silver",
        paddingLeft: "0.5em",
        opacity: 0.7,
      },
    },
  },
  "&light .cm-tooltip-autocomplete ul li[aria-selected]": {
    background: "#17c",
    color: "white",
  },
  "&light .cm-tooltip-autocomplete-disabled ul li[aria-selected]": {
    background: "#777",
  },
  "&dark .cm-tooltip-autocomplete ul li[aria-selected]": {
    background: "#347",
    color: "white",
  },
  "&dark .cm-tooltip-autocomplete-disabled ul li[aria-selected]": {
    background: "#444",
  },
  ".cm-completionListIncompleteTop:before, .cm-completionListIncompleteBottom:after": {
    content: '"···"',
    opacity: 0.5,
    display: "block",
    textAlign: "center",
    cursor: "pointer",
  },
  ".cm-tooltip.cm-completionInfo": {
    position: "absolute",
    padding: "3px 9px",
    width: "max-content",
    maxWidth: `${400}px`,
    boxSizing: "border-box",
    whiteSpace: "pre-line",
  },
  ".cm-completionInfo.cm-completionInfo-left": {
    right: "100%",
  },
  ".cm-completionInfo.cm-completionInfo-right": {
    left: "100%",
  },
  ".cm-completionInfo.cm-completionInfo-left-narrow": {
    right: `${30}px`,
  },
  ".cm-completionInfo.cm-completionInfo-right-narrow": {
    left: `${30}px`,
  },
  "&light .cm-snippetField": {
    backgroundColor: "#00000022",
  },
  "&dark .cm-snippetField": {
    backgroundColor: "#ffffff22",
  },
  ".cm-snippetFieldPosition": {
    verticalAlign: "text-top",
    width: 0,
    height: "1.15em",
    display: "inline-block",
    margin: "0 -0.7px -.7em",
    borderLeft: "1.4px dotted #888",
  },
  ".cm-completionMatchedText": {
    textDecoration: "underline",
  },
  ".cm-completionDetail": {
    marginLeft: "0.5em",
    fontStyle: "italic",
  },
  ".cm-completionIcon": {
    fontSize: "90%",
    width: ".8em",
    display: "inline-block",
    textAlign: "center",
    paddingRight: ".6em",
    opacity: "0.6",
    boxSizing: "content-box",
  },
  ".cm-completionIcon-function, .cm-completionIcon-method": {
    "&:after": {
      content: "'ƒ'",
    },
  },
  ".cm-completionIcon-class": {
    "&:after": {
      content: "'○'",
    },
  },
  ".cm-completionIcon-interface": {
    "&:after": {
      content: "'◌'",
    },
  },
  ".cm-completionIcon-variable": {
    "&:after": {
      content: "'𝑥'",
    },
  },
  ".cm-completionIcon-constant": {
    "&:after": {
      content: "'𝐶'",
    },
  },
  ".cm-completionIcon-type": {
    "&:after": {
      content: "'𝑡'",
    },
  },
  ".cm-completionIcon-enum": {
    "&:after": {
      content: "'∪'",
    },
  },
  ".cm-completionIcon-property": {
    "&:after": {
      content: "'□'",
    },
  },
  ".cm-completionIcon-keyword": {
    "&:after": {
      content: "'🔑︎'",
    },
    // Disable emoji rendering
  },
  ".cm-completionIcon-namespace": {
    "&:after": {
      content: "'▢'",
    },
  },
  ".cm-completionIcon-text": {
    "&:after": {
      content: "'abc'",
      fontSize: "50%",
      verticalAlign: "middle",
    },
  },
});
const snippetState = StateField.define({
  create() {
    return null;
  },
  update(value, tr2) {
    for (let effect2 of tr2.effects) {
      if (effect2.is(setActive)) return effect2.value;
      if (effect2.is(moveToField) && value) return new ActiveSnippet(value.ranges, effect2.value);
    }
    if (value && tr2.docChanged) value = value.map(tr2.changes);
    if (value && tr2.selection && !value.selectionInsideField(tr2.selection)) value = null;
    return value;
  },
  provide: (f2) => EditorView2.decorations.from(f2, (val) => (val ? val.deco : Decoration2.none)),
});
function snippet(template) {
  let snippet2 = Snippet.parse(template);
  return (editor, completion, from2, to) => {
    let { text: text2, ranges } = snippet2.instantiate(editor.state, from2);
    let { main: main2 } = editor.state.selection;
    let spec = {
      changes: {
        from: from2,
        to: to == main2.from ? main2.to : to,
        insert: Text.of(text2),
      },
      scrollIntoView: true,
      annotations: completion
        ? [pickedCompletion.of(completion), Transaction2.userEvent.of("input.complete")]
        : void 0,
    };
    if (ranges.length) spec.selection = fieldSelection(ranges, 0);
    if (ranges.some((r2) => r2.field > 0)) {
      let active2 = new ActiveSnippet(ranges, 0);
      let effects = (spec.effects = [setActive.of(active2)]);
      if (editor.state.field(snippetState, false) === void 0)
        effects.push(
          StateEffect.appendConfig.of([
            snippetState,
            addSnippetKeymap,
            snippetPointerHandler,
            baseTheme$1,
          ]),
        );
    }
    editor.dispatch(editor.state.update(spec));
  };
}
function moveField(dir) {
  return ({ state: state2, dispatch: dispatch2 }) => {
    let active2 = state2.field(snippetState, false);
    if (!active2 || (dir < 0 && active2.active == 0)) return false;
    let next2 = active2.active + dir,
      last2 = dir > 0 && !active2.ranges.some((r2) => r2.field == next2 + dir);
    dispatch2(
      state2.update({
        selection: fieldSelection(active2.ranges, next2),
        effects: setActive.of(last2 ? null : new ActiveSnippet(active2.ranges, next2)),
        scrollIntoView: true,
      }),
    );
    return true;
  };
}
const clearSnippet = ({ state: state2, dispatch: dispatch2 }) => {
  let active2 = state2.field(snippetState, false);
  if (!active2) return false;
  dispatch2(
    state2.update({
      effects: setActive.of(null),
    }),
  );
  return true;
};
const nextSnippetField = moveField(1);
const prevSnippetField = moveField(-1);
const defaultSnippetKeymap = [
  {
    key: "Tab",
    run: nextSnippetField,
    shift: prevSnippetField,
  },
  {
    key: "Escape",
    run: clearSnippet,
  },
];
const snippetKeymap = Facet.define({
  combine(maps) {
    return maps.length ? maps[0] : defaultSnippetKeymap;
  },
});
const addSnippetKeymap = Prec.highest(
  keymap.compute([snippetKeymap], (state2) => state2.facet(snippetKeymap)),
);
export function snippetCompletion(template, completion) {
  return {
    ...completion,
    apply: snippet(template),
  };
}
const snippetPointerHandler = EditorView2.domEventHandlers({
  mousedown(event, view2) {
    let active2 = view2.state.field(snippetState, false),
      pos;
    if (
      !active2 ||
      (pos = view2.posAtCoords({
        x: event.clientX,
        y: event.clientY,
      })) == null
    )
      return false;
    let match2 = active2.ranges.find((r2) => r2.from <= pos && r2.to >= pos);
    if (!match2 || match2.field == active2.active) return false;
    view2.dispatch({
      selection: fieldSelection(active2.ranges, match2.field),
      effects: setActive.of(
        active2.ranges.some((r2) => r2.field > match2.field)
          ? new ActiveSnippet(active2.ranges, match2.field)
          : null,
      ),
      scrollIntoView: true,
    });
    return true;
  },
});
class CompositeBlock {
  static create(type2, value, from2, parentHash, end2) {
    let hash2 = (parentHash + (parentHash << 8) + type2 + (value << 4)) | 0;
    return new CompositeBlock(type2, value, from2, hash2, end2, [], []);
  }
  constructor(type2, value, from2, hash2, end2, children2, positions) {
    this.type = type2;
    this.value = value;
    this.from = from2;
    this.hash = hash2;
    this.end = end2;
    this.children = children2;
    this.positions = positions;
    this.hashProp = [[NodeProp.contextHash, hash2]];
  }
  addChild(child, pos) {
    if (child.prop(NodeProp.contextHash) != this.hash)
      child = new Tree(child.type, child.children, child.positions, child.length, this.hashProp);
    this.children.push(child);
    this.positions.push(pos);
  }
  toTree(nodeSet, end2 = this.end) {
    let last2 = this.children.length - 1;
    if (last2 >= 0)
      end2 = Math.max(end2, this.positions[last2] + this.children[last2].length + this.from);
    return new Tree(
      nodeSet.types[this.type],
      this.children,
      this.positions,
      end2 - this.from,
    ).balance({
      makeTree: (children2, positions, length2) =>
        new Tree(NodeType3.none, children2, positions, length2, this.hashProp),
    });
  }
}
function skipForList(bl, cx2, line) {
  if (
    line.pos == line.text.length ||
    (bl != cx2.block && line.indent >= cx2.stack[line.depth + 1].value + line.baseIndent)
  )
    return true;
  if (line.indent >= line.baseIndent + 4) return false;
  let size2 = (bl.type == Type.OrderedList ? isOrderedList : isBulletList)(line, cx2, false);
  return (
    size2 > 0 &&
    (bl.type != Type.BulletList || isHorizontalRule(line, cx2, false) < 0) &&
    line.text.charCodeAt(line.pos + size2 - 1) == bl.value
  );
}
const DefaultSkipMarkup = {
  [Type.Blockquote](bl, cx2, line) {
    if (line.next != 62) return false;
    line.markers.push(elt(Type.QuoteMark, cx2.lineStart + line.pos, cx2.lineStart + line.pos + 1));
    line.moveBase(line.pos + (space$2(line.text.charCodeAt(line.pos + 1)) ? 2 : 1));
    bl.end = cx2.lineStart + line.text.length;
    return true;
  },
  [Type.ListItem](bl, _cx, line) {
    if (line.indent < line.baseIndent + bl.value && line.next > -1) return false;
    line.moveBaseColumn(line.baseIndent + bl.value);
    return true;
  },
  [Type.OrderedList]: skipForList,
  [Type.BulletList]: skipForList,
  [Type.Document]() {
    return true;
  },
};
function isHorizontalRule(line, cx2, breaking) {
  if (line.next != 42 && line.next != 45 && line.next != 95) return -1;
  let count2 = 1;
  for (let pos = line.pos + 1; pos < line.text.length; pos++) {
    let ch = line.text.charCodeAt(pos);
    if (ch == line.next) count2++;
    else if (!space$2(ch)) return -1;
  }
  if (
    breaking &&
    line.next == 45 &&
    isSetextUnderline(line) > -1 &&
    line.depth == cx2.stack.length &&
    cx2.parser.leafBlockParsers.indexOf(DefaultLeafBlocks.SetextHeading) > -1
  )
    return -1;
  return count2 < 3 ? -1 : 1;
}
function addCodeText(marks, from2, to) {
  let last2 = marks.length - 1;
  if (last2 >= 0 && marks[last2].to == from2 && marks[last2].type == Type.CodeText)
    marks[last2].to = to;
  else marks.push(elt(Type.CodeText, from2, to));
}
const DefaultBlockParsers = {
  LinkReference: void 0,
  IndentedCode(cx2, line) {
    let base2 = line.baseIndent + 4;
    if (line.indent < base2) return false;
    let start2 = line.findColumn(base2);
    let from2 = cx2.lineStart + start2,
      to = cx2.lineStart + line.text.length;
    let marks = [],
      pendingMarks = [];
    addCodeText(marks, from2, to);
    while (cx2.nextLine() && line.depth >= cx2.stack.length) {
      if (line.pos == line.text.length) {
        addCodeText(pendingMarks, cx2.lineStart - 1, cx2.lineStart);
        for (let m3 of line.markers) pendingMarks.push(m3);
      } else if (line.indent < base2) {
        break;
      } else {
        if (pendingMarks.length) {
          for (let m3 of pendingMarks) {
            if (m3.type == Type.CodeText) addCodeText(marks, m3.from, m3.to);
            else marks.push(m3);
          }
          pendingMarks = [];
        }
        addCodeText(marks, cx2.lineStart - 1, cx2.lineStart);
        for (let m3 of line.markers) marks.push(m3);
        to = cx2.lineStart + line.text.length;
        let codeStart = cx2.lineStart + line.findColumn(line.baseIndent + 4);
        if (codeStart < to) addCodeText(marks, codeStart, to);
      }
    }
    if (pendingMarks.length) {
      pendingMarks = pendingMarks.filter((m3) => m3.type != Type.CodeText);
      if (pendingMarks.length) line.markers = pendingMarks.concat(line.markers);
    }
    cx2.addNode(cx2.buffer.writeElements(marks, -from2).finish(Type.CodeBlock, to - from2), from2);
    return true;
  },
  FencedCode(cx2, line) {
    let fenceEnd = isFencedCode(line);
    if (fenceEnd < 0) return false;
    let from2 = cx2.lineStart + line.pos,
      ch = line.next,
      len = fenceEnd - line.pos;
    let infoFrom = line.skipSpace(fenceEnd),
      infoTo = skipSpaceBack(line.text, line.text.length, infoFrom);
    let marks = [elt(Type.CodeMark, from2, from2 + len)];
    if (infoFrom < infoTo)
      marks.push(elt(Type.CodeInfo, cx2.lineStart + infoFrom, cx2.lineStart + infoTo));
    for (
      let first2 = true, empty2 = true, hasLine = false;
      cx2.nextLine() && line.depth >= cx2.stack.length;
      first2 = false
    ) {
      let i2 = line.pos;
      if (line.indent - line.baseIndent < 4)
        while (i2 < line.text.length && line.text.charCodeAt(i2) == ch) i2++;
      if (i2 - line.pos >= len && line.skipSpace(i2) == line.text.length) {
        for (let m3 of line.markers) marks.push(m3);
        if (empty2 && hasLine) addCodeText(marks, cx2.lineStart - 1, cx2.lineStart);
        marks.push(elt(Type.CodeMark, cx2.lineStart + line.pos, cx2.lineStart + i2));
        cx2.nextLine();
        break;
      } else {
        hasLine = true;
        if (!first2) {
          addCodeText(marks, cx2.lineStart - 1, cx2.lineStart);
          empty2 = false;
        }
        for (let m3 of line.markers) marks.push(m3);
        let textStart = cx2.lineStart + line.basePos,
          textEnd = cx2.lineStart + line.text.length;
        if (textStart < textEnd) {
          addCodeText(marks, textStart, textEnd);
          empty2 = false;
        }
      }
    }
    cx2.addNode(
      cx2.buffer.writeElements(marks, -from2).finish(Type.FencedCode, cx2.prevLineEnd() - from2),
      from2,
    );
    return true;
  },
  Blockquote(cx2, line) {
    let size2 = isBlockquote(line);
    if (size2 < 0) return false;
    cx2.startContext(Type.Blockquote, line.pos);
    cx2.addNode(Type.QuoteMark, cx2.lineStart + line.pos, cx2.lineStart + line.pos + 1);
    line.moveBase(line.pos + size2);
    return null;
  },
  HorizontalRule(cx2, line) {
    if (isHorizontalRule(line, cx2, false) < 0) return false;
    let from2 = cx2.lineStart + line.pos;
    cx2.nextLine();
    cx2.addNode(Type.HorizontalRule, from2);
    return true;
  },
  BulletList(cx2, line) {
    let size2 = isBulletList(line, cx2, false);
    if (size2 < 0) return false;
    if (cx2.block.type != Type.BulletList)
      cx2.startContext(Type.BulletList, line.basePos, line.next);
    let newBase = getListIndent(line, line.pos + 1);
    cx2.startContext(Type.ListItem, line.basePos, newBase - line.baseIndent);
    cx2.addNode(Type.ListMark, cx2.lineStart + line.pos, cx2.lineStart + line.pos + size2);
    line.moveBaseColumn(newBase);
    return null;
  },
  OrderedList(cx2, line) {
    let size2 = isOrderedList(line, cx2, false);
    if (size2 < 0) return false;
    if (cx2.block.type != Type.OrderedList)
      cx2.startContext(Type.OrderedList, line.basePos, line.text.charCodeAt(line.pos + size2 - 1));
    let newBase = getListIndent(line, line.pos + size2);
    cx2.startContext(Type.ListItem, line.basePos, newBase - line.baseIndent);
    cx2.addNode(Type.ListMark, cx2.lineStart + line.pos, cx2.lineStart + line.pos + size2);
    line.moveBaseColumn(newBase);
    return null;
  },
  ATXHeading(cx2, line) {
    let size2 = isAtxHeading(line);
    if (size2 < 0) return false;
    let off = line.pos,
      from2 = cx2.lineStart + off;
    let endOfSpace = skipSpaceBack(line.text, line.text.length, off),
      after = endOfSpace;
    while (after > off && line.text.charCodeAt(after - 1) == line.next) after--;
    if (after == endOfSpace || after == off || !space$2(line.text.charCodeAt(after - 1)))
      after = line.text.length;
    let buf = cx2.buffer
      .write(Type.HeaderMark, 0, size2)
      .writeElements(
        cx2.parser.parseInline(line.text.slice(off + size2 + 1, after), from2 + size2 + 1),
        -from2,
      );
    if (after < line.text.length) buf.write(Type.HeaderMark, after - off, endOfSpace - off);
    let node2 = buf.finish(Type.ATXHeading1 - 1 + size2, line.text.length - off);
    cx2.nextLine();
    cx2.addNode(node2, from2);
    return true;
  },
  HTMLBlock(cx2, line) {
    let type2 = isHTMLBlock(line, cx2, false);
    if (type2 < 0) return false;
    let from2 = cx2.lineStart + line.pos,
      end2 = HTMLBlockStyle[type2][1];
    let marks = [],
      trailing = end2 != EmptyLine;
    while (!end2.test(line.text) && cx2.nextLine()) {
      if (line.depth < cx2.stack.length) {
        trailing = false;
        break;
      }
      for (let m3 of line.markers) marks.push(m3);
    }
    if (trailing) cx2.nextLine();
    let nodeType =
      end2 == CommentEnd
        ? Type.CommentBlock
        : end2 == ProcessingEnd
          ? Type.ProcessingInstructionBlock
          : Type.HTMLBlock;
    let to = cx2.prevLineEnd();
    cx2.addNode(cx2.buffer.writeElements(marks, -from2).finish(nodeType, to - from2), from2);
    return true;
  },
  SetextHeading: void 0,
  // Specifies relative precedence for block-continue function
};
class LinkReferenceParser {
  constructor(leaf) {
    this.stage = 0;
    this.elts = [];
    this.pos = 0;
    this.start = leaf.start;
    this.advance(leaf.content);
  }
  nextLine(cx2, line, leaf) {
    if (this.stage == -1) return false;
    let content2 = leaf.content + "\n" + line.scrub();
    let finish = this.advance(content2);
    if (finish > -1 && finish < content2.length) return this.complete(cx2, leaf, finish);
    return false;
  }
  finish(cx2, leaf) {
    if (
      (this.stage == 2 || this.stage == 3) &&
      skipSpace(leaf.content, this.pos) == leaf.content.length
    )
      return this.complete(cx2, leaf, leaf.content.length);
    return false;
  }
  complete(cx2, leaf, len) {
    cx2.addLeafElement(leaf, elt(Type.LinkReference, this.start, this.start + len, this.elts));
    return true;
  }
  nextStage(elt2) {
    if (elt2) {
      this.pos = elt2.to - this.start;
      this.elts.push(elt2);
      this.stage++;
      return true;
    }
    if (elt2 === false) this.stage = -1;
    return false;
  }
  advance(content2) {
    for (;;) {
      if (this.stage == -1) {
        return -1;
      } else if (this.stage == 0) {
        if (!this.nextStage(parseLinkLabel(content2, this.pos, this.start, true))) return -1;
        if (content2.charCodeAt(this.pos) != 58) return (this.stage = -1);
        this.elts.push(elt(Type.LinkMark, this.pos + this.start, this.pos + this.start + 1));
        this.pos++;
      } else if (this.stage == 1) {
        if (!this.nextStage(parseURL(content2, skipSpace(content2, this.pos), this.start)))
          return -1;
      } else if (this.stage == 2) {
        let skip = skipSpace(content2, this.pos),
          end2 = 0;
        if (skip > this.pos) {
          let title = parseLinkTitle(content2, skip, this.start);
          if (title) {
            let titleEnd = lineEnd(content2, title.to - this.start);
            if (titleEnd > 0) {
              this.nextStage(title);
              end2 = titleEnd;
            }
          }
        }
        if (!end2) end2 = lineEnd(content2, this.pos);
        return end2 > 0 && end2 < content2.length ? end2 : -1;
      } else {
        return lineEnd(content2, this.pos);
      }
    }
  }
}
class SetextHeadingParser {
  nextLine(cx2, line, leaf) {
    let underline = line.depth < cx2.stack.length ? -1 : isSetextUnderline(line);
    let next2 = line.next;
    if (underline < 0) return false;
    let underlineMark = elt(Type.HeaderMark, cx2.lineStart + line.pos, cx2.lineStart + underline);
    cx2.nextLine();
    cx2.addLeafElement(
      leaf,
      elt(next2 == 61 ? Type.SetextHeading1 : Type.SetextHeading2, leaf.start, cx2.prevLineEnd(), [
        ...cx2.parser.parseInline(leaf.content, leaf.start),
        underlineMark,
      ]),
    );
    return true;
  }
  finish() {
    return false;
  }
}
const DefaultLeafBlocks = {
  LinkReference(_2, leaf) {
    return leaf.content.charCodeAt(0) == 91 ? new LinkReferenceParser(leaf) : null;
  },
  SetextHeading() {
    return new SetextHeadingParser();
  },
};
const DefaultEndLeaf = [
  (_2, line) => isAtxHeading(line) >= 0,
  (_2, line) => isFencedCode(line) >= 0,
  (_2, line) => isBlockquote(line) >= 0,
  (p3, line) => isBulletList(line, p3, true) >= 0,
  (p3, line) => isOrderedList(line, p3, true) >= 0,
  (p3, line) => isHorizontalRule(line, p3, true) >= 0,
  (p3, line) => isHTMLBlock(line, p3, true) >= 0,
];
class BlockContext {
  /**
  @internal
  */
  constructor(parser2, input, fragments, ranges) {
    this.parser = parser2;
    this.input = input;
    this.ranges = ranges;
    this.line = new Line2();
    this.atEnd = false;
    this.reusePlaceholders = new Map();
    this.stoppedAt = null;
    this.rangeI = 0;
    this.to = ranges[ranges.length - 1].to;
    this.lineStart = this.absoluteLineStart = this.absoluteLineEnd = ranges[0].from;
    this.block = CompositeBlock.create(Type.Document, 0, this.lineStart, 0, 0);
    this.stack = [this.block];
    this.fragments = fragments.length ? new FragmentCursor$1(fragments, input) : null;
    this.readLine();
  }
  get parsedPos() {
    return this.absoluteLineStart;
  }
  advance() {
    if (this.stoppedAt != null && this.absoluteLineStart > this.stoppedAt) return this.finish();
    let { line } = this;
    for (;;) {
      for (let markI = 0; ;) {
        let next2 = line.depth < this.stack.length ? this.stack[this.stack.length - 1] : null;
        while (markI < line.markers.length && (!next2 || line.markers[markI].from < next2.end)) {
          let mark2 = line.markers[markI++];
          this.addNode(mark2.type, mark2.from, mark2.to);
        }
        if (!next2) break;
        this.finishContext();
      }
      if (line.pos < line.text.length) break;
      if (!this.nextLine()) return this.finish();
    }
    if (this.fragments && this.reuseFragment(line.basePos)) return null;
    start: for (;;) {
      for (let type2 of this.parser.blockParsers)
        if (type2) {
          let result = type2(this, line);
          if (result != false) {
            if (result == true) return null;
            line.forward();
            continue start;
          }
        }
      break;
    }
    if (line.pos == line.text.length) return this.nextLine() ? null : this.finish();
    let leaf = new LeafBlock(this.lineStart + line.pos, line.text.slice(line.pos));
    for (let parse2 of this.parser.leafBlockParsers)
      if (parse2) {
        let parser2 = parse2(this, leaf);
        if (parser2) leaf.parsers.push(parser2);
      }
    lines: while (this.nextLine()) {
      if (line.pos == line.text.length) break;
      if (line.indent < line.baseIndent + 4) {
        for (let stop of this.parser.endLeafBlock) if (stop(this, line, leaf)) break lines;
      }
      for (let parser2 of leaf.parsers) if (parser2.nextLine(this, line, leaf)) return null;
      leaf.content += "\n" + line.scrub();
      for (let m3 of line.markers) leaf.marks.push(m3);
    }
    this.finishLeaf(leaf);
    return null;
  }
  stopAt(pos) {
    if (this.stoppedAt != null && this.stoppedAt < pos)
      throw new RangeError("Can't move stoppedAt forward");
    this.stoppedAt = pos;
  }
  reuseFragment(start2) {
    if (
      !this.fragments.moveTo(this.absoluteLineStart + start2, this.absoluteLineStart) ||
      !this.fragments.matches(this.block.hash)
    )
      return false;
    let taken = this.fragments.takeNodes(this);
    if (!taken) return false;
    this.absoluteLineStart += taken;
    this.lineStart = toRelative(this.absoluteLineStart, this.ranges);
    this.moveRangeI();
    if (this.absoluteLineStart < this.to) {
      this.lineStart++;
      this.absoluteLineStart++;
      this.readLine();
    } else {
      this.atEnd = true;
      this.readLine();
    }
    return true;
  }
  /**
  The number of parent blocks surrounding the current block.
  */
  get depth() {
    return this.stack.length;
  }
  /**
  Get the type of the parent block at the given depth. When no
  depth is passed, return the type of the innermost parent.
  */
  parentType(depth2 = this.depth - 1) {
    return this.parser.nodeSet.types[this.stack[depth2].type];
  }
  /**
  Move to the next input line. This should only be called by
  (non-composite) [block parsers](#BlockParser.parse) that consume
  the line directly, or leaf block parser
  [`nextLine`](#LeafBlockParser.nextLine) methods when they
  consume the current line (and return true).
  */
  nextLine() {
    this.lineStart += this.line.text.length;
    if (this.absoluteLineEnd >= this.to) {
      this.absoluteLineStart = this.absoluteLineEnd;
      this.atEnd = true;
      this.readLine();
      return false;
    } else {
      this.lineStart++;
      this.absoluteLineStart = this.absoluteLineEnd + 1;
      this.moveRangeI();
      this.readLine();
      return true;
    }
  }
  /**
  Retrieve the text of the line after the current one, without
  actually moving the context's current line forward.
  */
  peekLine() {
    return this.scanLine(this.absoluteLineEnd + 1).text;
  }
  moveRangeI() {
    while (
      this.rangeI < this.ranges.length - 1 &&
      this.absoluteLineStart >= this.ranges[this.rangeI].to
    ) {
      this.rangeI++;
      this.absoluteLineStart = Math.max(this.absoluteLineStart, this.ranges[this.rangeI].from);
    }
  }
  /**
  @internal
  Collect the text for the next line.
  */
  scanLine(start2) {
    let r2 = scanLineResult;
    r2.end = start2;
    if (start2 >= this.to) {
      r2.text = "";
    } else {
      r2.text = this.lineChunkAt(start2);
      r2.end += r2.text.length;
      if (this.ranges.length > 1) {
        let textOffset = this.absoluteLineStart,
          rangeI = this.rangeI;
        while (this.ranges[rangeI].to < r2.end) {
          rangeI++;
          let nextFrom = this.ranges[rangeI].from;
          let after = this.lineChunkAt(nextFrom);
          r2.end = nextFrom + after.length;
          r2.text = r2.text.slice(0, this.ranges[rangeI - 1].to - textOffset) + after;
          textOffset = r2.end - r2.text.length;
        }
      }
    }
    return r2;
  }
  /**
  @internal
  Populate this.line with the content of the next line. Skip
  leading characters covered by composite blocks.
  */
  readLine() {
    let { line } = this,
      { text: text2, end: end2 } = this.scanLine(this.absoluteLineStart);
    this.absoluteLineEnd = end2;
    line.reset(text2);
    for (; line.depth < this.stack.length; line.depth++) {
      let cx2 = this.stack[line.depth],
        handler = this.parser.skipContextMarkup[cx2.type];
      if (!handler) throw new Error("Unhandled block context " + Type[cx2.type]);
      let marks = this.line.markers.length;
      if (!handler(cx2, this, line)) {
        if (this.line.markers.length > marks)
          cx2.end = this.line.markers[this.line.markers.length - 1].to;
        line.forward();
        break;
      }
      line.forward();
    }
  }
  lineChunkAt(pos) {
    let next2 = this.input.chunk(pos),
      text2;
    if (!this.input.lineChunks) {
      let eol = next2.indexOf("\n");
      text2 = eol < 0 ? next2 : next2.slice(0, eol);
    } else {
      text2 = next2 == "\n" ? "" : next2;
    }
    return pos + text2.length > this.to ? text2.slice(0, this.to - pos) : text2;
  }
  /**
  The end position of the previous line.
  */
  prevLineEnd() {
    return this.atEnd ? this.lineStart : this.lineStart - 1;
  }
  /**
  @internal
  */
  startContext(type2, start2, value = 0) {
    this.block = CompositeBlock.create(
      type2,
      value,
      this.lineStart + start2,
      this.block.hash,
      this.lineStart + this.line.text.length,
    );
    this.stack.push(this.block);
  }
  /**
  Start a composite block. Should only be called from [block
  parser functions](#BlockParser.parse) that return null.
  */
  startComposite(type2, start2, value = 0) {
    this.startContext(this.parser.getNodeType(type2), start2, value);
  }
  /**
  @internal
  */
  addNode(block, from2, to) {
    if (typeof block == "number")
      block = new Tree(
        this.parser.nodeSet.types[block],
        none,
        none,
        (to !== null && to !== void 0 ? to : this.prevLineEnd()) - from2,
      );
    this.block.addChild(block, from2 - this.block.from);
  }
  /**
  Add a block element. Can be called by [block
  parsers](#BlockParser.parse).
  */
  addElement(elt2) {
    this.block.addChild(elt2.toTree(this.parser.nodeSet), elt2.from - this.block.from);
  }
  /**
  Add a block element from a [leaf parser](#LeafBlockParser). This
  makes sure any extra composite block markup (such as blockquote
  markers) inside the block are also added to the syntax tree.
  */
  addLeafElement(leaf, elt2) {
    this.addNode(
      this.buffer
        .writeElements(injectMarks(elt2.children, leaf.marks), -elt2.from)
        .finish(elt2.type, elt2.to - elt2.from),
      elt2.from,
    );
  }
  /**
  @internal
  */
  finishContext() {
    let cx2 = this.stack.pop();
    let top2 = this.stack[this.stack.length - 1];
    top2.addChild(cx2.toTree(this.parser.nodeSet), cx2.from - top2.from);
    this.block = top2;
  }
  finish() {
    while (this.stack.length > 1) this.finishContext();
    return this.addGaps(this.block.toTree(this.parser.nodeSet, this.lineStart));
  }
  addGaps(tree) {
    return this.ranges.length > 1
      ? injectGaps(this.ranges, 0, tree.topNode, this.ranges[0].from, this.reusePlaceholders)
      : tree;
  }
  /**
  @internal
  */
  finishLeaf(leaf) {
    for (let parser2 of leaf.parsers) if (parser2.finish(this, leaf)) return;
    let inline2 = injectMarks(this.parser.parseInline(leaf.content, leaf.start), leaf.marks);
    this.addNode(
      this.buffer.writeElements(inline2, -leaf.start).finish(Type.Paragraph, leaf.content.length),
      leaf.start,
    );
  }
  elt(type2, from2, to, children2) {
    if (typeof type2 == "string") return elt(this.parser.getNodeType(type2), from2, to, children2);
    return new TreeElement(type2, from2);
  }
  /**
  @internal
  */
  get buffer() {
    return new Buffer$1(this.parser.nodeSet);
  }
}
function injectGaps(ranges, rangeI, tree, offset2, dummies) {
  let rangeEnd2 = ranges[rangeI].to;
  let children2 = [],
    positions = [],
    start2 = tree.from + offset2;
  function movePastNext(upto, inclusive) {
    while (inclusive ? upto >= rangeEnd2 : upto > rangeEnd2) {
      let size2 = ranges[rangeI + 1].from - rangeEnd2;
      offset2 += size2;
      upto += size2;
      rangeI++;
      rangeEnd2 = ranges[rangeI].to;
    }
  }
  for (let ch = tree.firstChild; ch; ch = ch.nextSibling) {
    movePastNext(ch.from + offset2, true);
    let from2 = ch.from + offset2,
      node2,
      reuse = dummies.get(ch.tree);
    if (reuse) {
      node2 = reuse;
    } else if (ch.to + offset2 > rangeEnd2) {
      node2 = injectGaps(ranges, rangeI, ch, offset2, dummies);
      movePastNext(ch.to + offset2, false);
    } else {
      node2 = ch.toTree();
    }
    children2.push(node2);
    positions.push(from2 - start2);
  }
  movePastNext(tree.to + offset2, false);
  return new Tree(
    tree.type,
    children2,
    positions,
    tree.to + offset2 - start2,
    tree.tree ? tree.tree.propValues : void 0,
  );
}
export class MarkdownParser extends Parser$1 {
  /**
  @internal
  */
  constructor(
    nodeSet,
    blockParsers,
    leafBlockParsers,
    blockNames,
    endLeafBlock,
    skipContextMarkup,
    inlineParsers,
    inlineNames,
    wrappers,
  ) {
    super();
    this.nodeSet = nodeSet;
    this.blockParsers = blockParsers;
    this.leafBlockParsers = leafBlockParsers;
    this.blockNames = blockNames;
    this.endLeafBlock = endLeafBlock;
    this.skipContextMarkup = skipContextMarkup;
    this.inlineParsers = inlineParsers;
    this.inlineNames = inlineNames;
    this.wrappers = wrappers;
    this.nodeTypes = Object.create(null);
    for (let t2 of nodeSet.types) this.nodeTypes[t2.name] = t2.id;
  }
  createParse(input, fragments, ranges) {
    let parse2 = new BlockContext(this, input, fragments, ranges);
    for (let w3 of this.wrappers) parse2 = w3(parse2, input, fragments, ranges);
    return parse2;
  }
  /**
  Reconfigure the parser.
  */
  configure(spec) {
    let config2 = resolveConfig(spec);
    if (!config2) return this;
    let { nodeSet, skipContextMarkup } = this;
    let blockParsers = this.blockParsers.slice(),
      leafBlockParsers = this.leafBlockParsers.slice(),
      blockNames = this.blockNames.slice(),
      inlineParsers = this.inlineParsers.slice(),
      inlineNames = this.inlineNames.slice(),
      endLeafBlock = this.endLeafBlock.slice(),
      wrappers = this.wrappers;
    if (nonEmpty$1(config2.defineNodes)) {
      skipContextMarkup = Object.assign({}, skipContextMarkup);
      let nodeTypes2 = nodeSet.types.slice(),
        styles;
      for (let s2 of config2.defineNodes) {
        let {
          name: name2,
          block,
          composite,
          style: style2,
        } = typeof s2 == "string"
          ? {
              name: s2,
            }
          : s2;
        if (nodeTypes2.some((t2) => t2.name == name2)) continue;
        if (composite)
          skipContextMarkup[nodeTypes2.length] = (bl, cx2, line) => composite(cx2, line, bl.value);
        let id2 = nodeTypes2.length;
        let group = composite
          ? ["Block", "BlockContext"]
          : !block
            ? void 0
            : id2 >= Type.ATXHeading1 && id2 <= Type.SetextHeading2
              ? ["Block", "LeafBlock", "Heading"]
              : ["Block", "LeafBlock"];
        nodeTypes2.push(
          NodeType3.define({
            id: id2,
            name: name2,
            props: group && [[NodeProp.group, group]],
          }),
        );
        if (style2) {
          if (!styles) styles = {};
          if (Array.isArray(style2) || style2 instanceof Tag) styles[name2] = style2;
          else Object.assign(styles, style2);
        }
      }
      nodeSet = new NodeSet(nodeTypes2);
      if (styles) nodeSet = nodeSet.extend(styleTags(styles));
    }
    if (nonEmpty$1(config2.props)) nodeSet = nodeSet.extend(...config2.props);
    if (nonEmpty$1(config2.remove)) {
      for (let rm2 of config2.remove) {
        let block = this.blockNames.indexOf(rm2),
          inline2 = this.inlineNames.indexOf(rm2);
        if (block > -1) blockParsers[block] = leafBlockParsers[block] = void 0;
        if (inline2 > -1) inlineParsers[inline2] = void 0;
      }
    }
    if (nonEmpty$1(config2.parseBlock)) {
      for (let spec2 of config2.parseBlock) {
        let found2 = blockNames.indexOf(spec2.name);
        if (found2 > -1) {
          blockParsers[found2] = spec2.parse;
          leafBlockParsers[found2] = spec2.leaf;
        } else {
          let pos = spec2.before
            ? findName(blockNames, spec2.before)
            : spec2.after
              ? findName(blockNames, spec2.after) + 1
              : blockNames.length - 1;
          blockParsers.splice(pos, 0, spec2.parse);
          leafBlockParsers.splice(pos, 0, spec2.leaf);
          blockNames.splice(pos, 0, spec2.name);
        }
        if (spec2.endLeaf) endLeafBlock.push(spec2.endLeaf);
      }
    }
    if (nonEmpty$1(config2.parseInline)) {
      for (let spec2 of config2.parseInline) {
        let found2 = inlineNames.indexOf(spec2.name);
        if (found2 > -1) {
          inlineParsers[found2] = spec2.parse;
        } else {
          let pos = spec2.before
            ? findName(inlineNames, spec2.before)
            : spec2.after
              ? findName(inlineNames, spec2.after) + 1
              : inlineNames.length - 1;
          inlineParsers.splice(pos, 0, spec2.parse);
          inlineNames.splice(pos, 0, spec2.name);
        }
      }
    }
    if (config2.wrap) wrappers = wrappers.concat(config2.wrap);
    return new MarkdownParser(
      nodeSet,
      blockParsers,
      leafBlockParsers,
      blockNames,
      endLeafBlock,
      skipContextMarkup,
      inlineParsers,
      inlineNames,
      wrappers,
    );
  }
  /**
  @internal
  */
  getNodeType(name2) {
    let found2 = this.nodeTypes[name2];
    if (found2 == null) throw new RangeError(`Unknown node type '${name2}'`);
    return found2;
  }
  /**
  Parse the given piece of inline text at the given offset,
  returning an array of [`Element`](#Element) objects representing
  the inline content.
  */
  parseInline(text2, offset2) {
    let cx2 = new InlineContext(this, text2, offset2);
    outer: for (let pos = offset2; pos < cx2.end;) {
      let next2 = cx2.char(pos);
      for (let token2 of this.inlineParsers)
        if (token2) {
          let result = token2(cx2, next2, pos);
          if (result >= 0) {
            pos = result;
            continue outer;
          }
        }
      pos++;
    }
    return cx2.resolveMarkers(0);
  }
}
let nodeTypes = [NodeType3.none];
for (let i2 = 1, name2; (name2 = Type[i2]); i2++) {
  nodeTypes[i2] = NodeType3.define({
    id: i2,
    name: name2,
    props:
      i2 >= Type.Escape
        ? []
        : [
            [
              NodeProp.group,
              i2 in DefaultSkipMarkup ? ["Block", "BlockContext"] : ["Block", "LeafBlock"],
            ],
          ],
    top: name2 == "Document",
  });
}
let Buffer$1 = class Buffer2 {
  constructor(nodeSet) {
    this.nodeSet = nodeSet;
    this.content = [];
    this.nodes = [];
  }
  write(type2, from2, to, children2 = 0) {
    this.content.push(type2, from2, to, 4 + children2 * 4);
    return this;
  }
  writeElements(elts, offset2 = 0) {
    for (let e2 of elts) e2.writeTo(this, offset2);
    return this;
  }
  finish(type2, length2) {
    return Tree.build({
      buffer: this.content,
      nodeSet: this.nodeSet,
      reused: this.nodes,
      topID: type2,
      length: length2,
    });
  }
};
let Element$2 = class Element2 {
  /**
  @internal
  */
  constructor(type2, from2, to, children2 = none) {
    this.type = type2;
    this.from = from2;
    this.to = to;
    this.children = children2;
  }
  /**
  @internal
  */
  writeTo(buf, offset2) {
    let startOff = buf.content.length;
    buf.writeElements(this.children, offset2);
    buf.content.push(
      this.type,
      this.from + offset2,
      this.to + offset2,
      buf.content.length + 4 - startOff,
    );
  }
  /**
  @internal
  */
  toTree(nodeSet) {
    return new Buffer$1(nodeSet)
      .writeElements(this.children, -this.from)
      .finish(this.type, this.to - this.from);
  }
};
function elt(type2, from2, to, children2) {
  return new Element$2(type2, from2, to, children2);
}
const DefaultInline = {
  Escape(cx2, next2, start2) {
    if (next2 != 92 || start2 == cx2.end - 1) return -1;
    let escaped = cx2.char(start2 + 1);
    for (let i2 = 0; i2 < Escapable.length; i2++)
      if (Escapable.charCodeAt(i2) == escaped)
        return cx2.append(elt(Type.Escape, start2, start2 + 2));
    return -1;
  },
  Entity(cx2, next2, start2) {
    if (next2 != 38) return -1;
    let m3 = /^(?:#\d+|#x[a-f\d]+|\w+);/i.exec(cx2.slice(start2 + 1, start2 + 31));
    return m3 ? cx2.append(elt(Type.Entity, start2, start2 + 1 + m3[0].length)) : -1;
  },
  InlineCode(cx2, next2, start2) {
    if (next2 != 96 || (start2 && cx2.char(start2 - 1) == 96)) return -1;
    let pos = start2 + 1;
    while (pos < cx2.end && cx2.char(pos) == 96) pos++;
    let size2 = pos - start2,
      curSize = 0;
    for (; pos < cx2.end; pos++) {
      if (cx2.char(pos) == 96) {
        curSize++;
        if (curSize == size2 && cx2.char(pos + 1) != 96)
          return cx2.append(
            elt(Type.InlineCode, start2, pos + 1, [
              elt(Type.CodeMark, start2, start2 + size2),
              elt(Type.CodeMark, pos + 1 - size2, pos + 1),
            ]),
          );
      } else {
        curSize = 0;
      }
    }
    return -1;
  },
  HTMLTag(cx2, next2, start2) {
    if (next2 != 60 || start2 == cx2.end - 1) return -1;
    let after = cx2.slice(start2 + 1, cx2.end);
    let url2 =
      /^(?:[a-z][-\w+.]+:[^\s>]+|[a-z\d.!#$%&'*+/=?^_`{|}~-]+@[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?)*)>/i.exec(
        after,
      );
    if (url2) {
      return cx2.append(
        elt(Type.Autolink, start2, start2 + 1 + url2[0].length, [
          elt(Type.LinkMark, start2, start2 + 1),
          // url[0] includes the closing bracket, so exclude it from this slice
          elt(Type.URL, start2 + 1, start2 + url2[0].length),
          elt(Type.LinkMark, start2 + url2[0].length, start2 + 1 + url2[0].length),
        ]),
      );
    }
    let comment2 = /^!--[^>](?:-[^-]|[^-])*?-->/i.exec(after);
    if (comment2) return cx2.append(elt(Type.Comment, start2, start2 + 1 + comment2[0].length));
    let procInst = /^\?[^]*?\?>/.exec(after);
    if (procInst)
      return cx2.append(elt(Type.ProcessingInstruction, start2, start2 + 1 + procInst[0].length));
    let m3 =
      /^(?:![A-Z][^]*?>|!\[CDATA\[[^]*?\]\]>|\/\s*[a-zA-Z][\w-]*\s*>|\s*[a-zA-Z][\w-]*(\s+[a-zA-Z:_][\w-.:]*(?:\s*=\s*(?:[^\s"'=<>`]+|'[^']*'|"[^"]*"))?)*\s*(\/\s*)?>)/.exec(
        after,
      );
    if (!m3) return -1;
    return cx2.append(elt(Type.HTMLTag, start2, start2 + 1 + m3[0].length));
  },
  Emphasis(cx2, next2, start2) {
    if (next2 != 95 && next2 != 42) return -1;
    let pos = start2 + 1;
    while (cx2.char(pos) == next2) pos++;
    let before = cx2.slice(start2 - 1, start2),
      after = cx2.slice(pos, pos + 1);
    let pBefore = Punctuation.test(before),
      pAfter = Punctuation.test(after);
    let sBefore = /\s|^$/.test(before),
      sAfter = /\s|^$/.test(after);
    let leftFlanking = !sAfter && (!pAfter || sBefore || pBefore);
    let rightFlanking = !sBefore && (!pBefore || sAfter || pAfter);
    let canOpen = leftFlanking && (next2 == 42 || !rightFlanking || pBefore);
    let canClose = rightFlanking && (next2 == 42 || !leftFlanking || pAfter);
    return cx2.append(
      new InlineDelimiter(
        next2 == 95 ? EmphasisUnderscore : EmphasisAsterisk,
        start2,
        pos,
        (canOpen ? 1 : 0) | (canClose ? 2 : 0),
      ),
    );
  },
  HardBreak(cx2, next2, start2) {
    if (next2 == 92 && cx2.char(start2 + 1) == 10)
      return cx2.append(elt(Type.HardBreak, start2, start2 + 2));
    if (next2 == 32) {
      let pos = start2 + 1;
      while (cx2.char(pos) == 32) pos++;
      if (cx2.char(pos) == 10 && pos >= start2 + 2)
        return cx2.append(elt(Type.HardBreak, start2, pos + 1));
    }
    return -1;
  },
  Link(cx2, next2, start2) {
    return next2 == 91
      ? cx2.append(
          new InlineDelimiter(
            LinkStart,
            start2,
            start2 + 1,
            1,
            /* Mark.Open */
          ),
        )
      : -1;
  },
  Image(cx2, next2, start2) {
    return next2 == 33 && cx2.char(start2 + 1) == 91
      ? cx2.append(
          new InlineDelimiter(
            ImageStart,
            start2,
            start2 + 2,
            1,
            /* Mark.Open */
          ),
        )
      : -1;
  },
  LinkEnd(cx2, next2, start2) {
    if (next2 != 93) return -1;
    for (let i2 = cx2.parts.length - 1; i2 >= 0; i2--) {
      let part = cx2.parts[i2];
      if (part instanceof InlineDelimiter && (part.type == LinkStart || part.type == ImageStart)) {
        if (
          !part.side ||
          (cx2.skipSpace(part.to) == start2 && !/[(\[]/.test(cx2.slice(start2 + 1, start2 + 2)))
        ) {
          cx2.parts[i2] = null;
          return -1;
        }
        let content2 = cx2.takeContent(i2);
        let link2 = (cx2.parts[i2] = finishLink(
          cx2,
          content2,
          part.type == LinkStart ? Type.Link : Type.Image,
          part.from,
          start2 + 1,
        ));
        if (part.type == LinkStart)
          for (let j2 = 0; j2 < i2; j2++) {
            let p3 = cx2.parts[j2];
            if (p3 instanceof InlineDelimiter && p3.type == LinkStart) p3.side = 0;
          }
        return link2.to;
      }
    }
    return -1;
  },
};
function finishLink(cx2, content2, type2, start2, startPos) {
  let { text: text2 } = cx2,
    next2 = cx2.char(startPos),
    endPos = startPos;
  content2.unshift(elt(Type.LinkMark, start2, start2 + (type2 == Type.Image ? 2 : 1)));
  content2.push(elt(Type.LinkMark, startPos - 1, startPos));
  if (next2 == 40) {
    let pos = cx2.skipSpace(startPos + 1);
    let dest = parseURL(text2, pos - cx2.offset, cx2.offset),
      title;
    if (dest) {
      pos = cx2.skipSpace(dest.to);
      if (pos != dest.to) {
        title = parseLinkTitle(text2, pos - cx2.offset, cx2.offset);
        if (title) pos = cx2.skipSpace(title.to);
      }
    }
    if (cx2.char(pos) == 41) {
      content2.push(elt(Type.LinkMark, startPos, startPos + 1));
      endPos = pos + 1;
      if (dest) content2.push(dest);
      if (title) content2.push(title);
      content2.push(elt(Type.LinkMark, pos, endPos));
    }
  } else if (next2 == 91) {
    let label = parseLinkLabel(text2, startPos - cx2.offset, cx2.offset, false);
    if (label) {
      content2.push(label);
      endPos = label.to;
    }
  }
  return elt(type2, start2, endPos, content2);
}
function parseURL(text2, start2, offset2) {
  let next2 = text2.charCodeAt(start2);
  if (next2 == 60) {
    for (let pos = start2 + 1; pos < text2.length; pos++) {
      let ch = text2.charCodeAt(pos);
      if (ch == 62) return elt(Type.URL, start2 + offset2, pos + 1 + offset2);
      if (ch == 60 || ch == 10) return false;
    }
    return null;
  } else {
    let depth2 = 0,
      pos = start2;
    for (let escaped = false; pos < text2.length; pos++) {
      let ch = text2.charCodeAt(pos);
      if (space$2(ch)) {
        break;
      } else if (escaped) {
        escaped = false;
      } else if (ch == 40) {
        depth2++;
      } else if (ch == 41) {
        if (!depth2) break;
        depth2--;
      } else if (ch == 92) {
        escaped = true;
      }
    }
    return pos > start2
      ? elt(Type.URL, start2 + offset2, pos + offset2)
      : pos == text2.length
        ? null
        : false;
  }
}
function parseLinkTitle(text2, start2, offset2) {
  let next2 = text2.charCodeAt(start2);
  if (next2 != 39 && next2 != 34 && next2 != 40) return false;
  let end2 = next2 == 40 ? 41 : next2;
  for (let pos = start2 + 1, escaped = false; pos < text2.length; pos++) {
    let ch = text2.charCodeAt(pos);
    if (escaped) escaped = false;
    else if (ch == end2) return elt(Type.LinkTitle, start2 + offset2, pos + 1 + offset2);
    else if (ch == 92) escaped = true;
  }
  return null;
}
function parseLinkLabel(text2, start2, offset2, requireNonWS) {
  for (
    let escaped = false, pos = start2 + 1, end2 = Math.min(text2.length, pos + 999);
    pos < end2;
    pos++
  ) {
    let ch = text2.charCodeAt(pos);
    if (escaped) escaped = false;
    else if (ch == 93)
      return requireNonWS ? false : elt(Type.LinkLabel, start2 + offset2, pos + 1 + offset2);
    else {
      if (requireNonWS && !space$2(ch)) requireNonWS = false;
      if (ch == 91) return false;
      else if (ch == 92) escaped = true;
    }
  }
  return null;
}
class InlineContext {
  /**
  @internal
  */
  constructor(parser2, text2, offset2) {
    this.parser = parser2;
    this.text = text2;
    this.offset = offset2;
    this.parts = [];
  }
  /**
  Get the character code at the given (document-relative)
  position.
  */
  char(pos) {
    return pos >= this.end ? -1 : this.text.charCodeAt(pos - this.offset);
  }
  /**
  The position of the end of this inline section.
  */
  get end() {
    return this.offset + this.text.length;
  }
  /**
  Get a substring of this inline section. Again uses
  document-relative positions.
  */
  slice(from2, to) {
    return this.text.slice(from2 - this.offset, to - this.offset);
  }
  /**
  @internal
  */
  append(elt2) {
    this.parts.push(elt2);
    return elt2.to;
  }
  /**
  Add a [delimiter](#DelimiterType) at this given position. `open`
  and `close` indicate whether this delimiter is opening, closing,
  or both. Returns the end of the delimiter, for convenient
  returning from [parse functions](#InlineParser.parse).
  */
  addDelimiter(type2, from2, to, open, close2) {
    return this.append(new InlineDelimiter(type2, from2, to, (open ? 1 : 0) | (close2 ? 2 : 0)));
  }
  /**
  Returns true when there is an unmatched link or image opening
  token before the current position.
  */
  get hasOpenLink() {
    for (let i2 = this.parts.length - 1; i2 >= 0; i2--) {
      let part = this.parts[i2];
      if (part instanceof InlineDelimiter && (part.type == LinkStart || part.type == ImageStart))
        return true;
    }
    return false;
  }
  /**
  Add an inline element. Returns the end of the element.
  */
  addElement(elt2) {
    return this.append(elt2);
  }
  /**
  Resolve markers between this.parts.length and from, wrapping matched markers in the
  appropriate node and updating the content of this.parts. @internal
  */
  resolveMarkers(from2) {
    for (let i2 = from2; i2 < this.parts.length; i2++) {
      let close2 = this.parts[i2];
      if (!(close2 instanceof InlineDelimiter && close2.type.resolve && close2.side & 2)) continue;
      let emp = close2.type == EmphasisUnderscore || close2.type == EmphasisAsterisk;
      let closeSize = close2.to - close2.from;
      let open,
        j2 = i2 - 1;
      for (; j2 >= from2; j2--) {
        let part = this.parts[j2];
        if (
          part instanceof InlineDelimiter &&
          part.side & 1 &&
          part.type == close2.type &&
          // Ignore emphasis delimiters where the character count doesn't match
          !(
            emp &&
            (close2.side & 1 || part.side & 2) &&
            (part.to - part.from + closeSize) % 3 == 0 &&
            ((part.to - part.from) % 3 || closeSize % 3)
          )
        ) {
          open = part;
          break;
        }
      }
      if (!open) continue;
      let type2 = close2.type.resolve,
        content2 = [];
      let start2 = open.from,
        end2 = close2.to;
      if (emp) {
        let size2 = Math.min(2, open.to - open.from, closeSize);
        start2 = open.to - size2;
        end2 = close2.from + size2;
        type2 = size2 == 1 ? "Emphasis" : "StrongEmphasis";
      }
      if (open.type.mark) content2.push(this.elt(open.type.mark, start2, open.to));
      for (let k2 = j2 + 1; k2 < i2; k2++) {
        if (this.parts[k2] instanceof Element$2) content2.push(this.parts[k2]);
        this.parts[k2] = null;
      }
      if (close2.type.mark) content2.push(this.elt(close2.type.mark, close2.from, end2));
      let element2 = this.elt(type2, start2, end2, content2);
      this.parts[j2] =
        emp && open.from != start2
          ? new InlineDelimiter(open.type, open.from, start2, open.side)
          : null;
      let keep = (this.parts[i2] =
        emp && close2.to != end2
          ? new InlineDelimiter(close2.type, end2, close2.to, close2.side)
          : null);
      if (keep) this.parts.splice(i2, 0, element2);
      else this.parts[i2] = element2;
    }
    let result = [];
    for (let i2 = from2; i2 < this.parts.length; i2++) {
      let part = this.parts[i2];
      if (part instanceof Element$2) result.push(part);
    }
    return result;
  }
  /**
  Find an opening delimiter of the given type. Returns `null` if
  no delimiter is found, or an index that can be passed to
  [`takeContent`](#InlineContext.takeContent) otherwise.
  */
  findOpeningDelimiter(type2) {
    for (let i2 = this.parts.length - 1; i2 >= 0; i2--) {
      let part = this.parts[i2];
      if (part instanceof InlineDelimiter && part.type == type2 && part.side & 1) return i2;
    }
    return null;
  }
  /**
  Remove all inline elements and delimiters starting from the
  given index (which you should get from
  [`findOpeningDelimiter`](#InlineContext.findOpeningDelimiter),
  resolve delimiters inside of them, and return them as an array
  of elements.
  */
  takeContent(startIndex) {
    let content2 = this.resolveMarkers(startIndex);
    this.parts.length = startIndex;
    return content2;
  }
  /**
  Return the delimiter at the given index. Mostly useful to get
  additional info out of a delimiter index returned by
  [`findOpeningDelimiter`](#InlineContext.findOpeningDelimiter).
  Returns null if there is no delimiter at this index.
  */
  getDelimiterAt(index2) {
    let part = this.parts[index2];
    return part instanceof InlineDelimiter ? part : null;
  }
  /**
  Skip space after the given (document) position, returning either
  the position of the next non-space character or the end of the
  section.
  */
  skipSpace(from2) {
    return skipSpace(this.text, from2 - this.offset) + this.offset;
  }
  elt(type2, from2, to, children2) {
    if (typeof type2 == "string") return elt(this.parser.getNodeType(type2), from2, to, children2);
    return new TreeElement(type2, from2);
  }
}
InlineContext.linkStart = LinkStart;
InlineContext.imageStart = ImageStart;
function injectMarks(elements, marks) {
  if (!marks.length) return elements;
  if (!elements.length) return marks;
  let elts = elements.slice(),
    eI = 0;
  for (let mark2 of marks) {
    while (eI < elts.length && elts[eI].to < mark2.to) eI++;
    if (eI < elts.length && elts[eI].from < mark2.from) {
      let e2 = elts[eI];
      if (e2 instanceof Element$2)
        elts[eI] = new Element$2(e2.type, e2.from, e2.to, injectMarks(e2.children, [mark2]));
    } else {
      elts.splice(eI++, 0, mark2);
    }
  }
  return elts;
}
let FragmentCursor$1 = class FragmentCursor2 {
  constructor(fragments, input) {
    this.fragments = fragments;
    this.input = input;
    this.i = 0;
    this.fragment = null;
    this.fragmentEnd = -1;
    this.cursor = null;
    if (fragments.length) this.fragment = fragments[this.i++];
  }
  nextFragment() {
    this.fragment = this.i < this.fragments.length ? this.fragments[this.i++] : null;
    this.cursor = null;
    this.fragmentEnd = -1;
  }
  moveTo(pos, lineStart) {
    while (this.fragment && this.fragment.to <= pos) this.nextFragment();
    if (!this.fragment || this.fragment.from > (pos ? pos - 1 : 0)) return false;
    if (this.fragmentEnd < 0) {
      let end2 = this.fragment.to;
      while (end2 > 0 && this.input.read(end2 - 1, end2) != "\n") end2--;
      this.fragmentEnd = end2 ? end2 - 1 : 0;
    }
    let c3 = this.cursor;
    if (!c3) {
      c3 = this.cursor = this.fragment.tree.cursor();
      c3.firstChild();
    }
    let rPos = pos + this.fragment.offset;
    while (c3.to <= rPos) if (!c3.parent()) return false;
    for (;;) {
      if (c3.from >= rPos) return this.fragment.from <= lineStart;
      if (!c3.childAfter(rPos)) return false;
    }
  }
  matches(hash2) {
    let tree = this.cursor.tree;
    return tree && tree.prop(NodeProp.contextHash) == hash2;
  }
  takeNodes(cx2) {
    let cur = this.cursor,
      off = this.fragment.offset,
      fragEnd = this.fragmentEnd - (this.fragment.openEnd ? 1 : 0);
    let start2 = cx2.absoluteLineStart,
      end2 = start2,
      blockI = cx2.block.children.length;
    let prevEnd = end2,
      prevI = blockI;
    for (;;) {
      if (cur.to - off > fragEnd) {
        if (cur.type.isAnonymous && cur.firstChild()) continue;
        break;
      }
      let pos = toRelative(cur.from - off, cx2.ranges);
      if (cur.to - off <= cx2.ranges[cx2.rangeI].to) {
        cx2.addNode(cur.tree, pos);
      } else {
        let dummy = new Tree(
          cx2.parser.nodeSet.types[Type.Paragraph],
          [],
          [],
          0,
          cx2.block.hashProp,
        );
        cx2.reusePlaceholders.set(dummy, cur.tree);
        cx2.addNode(dummy, pos);
      }
      if (cur.type.is("Block")) {
        if (NotLast.indexOf(cur.type.id) < 0) {
          end2 = cur.to - off;
          blockI = cx2.block.children.length;
        } else {
          end2 = prevEnd;
          blockI = prevI;
        }
        prevEnd = cur.to - off;
        prevI = cx2.block.children.length;
      }
      if (!cur.nextSibling()) break;
    }
    while (cx2.block.children.length > blockI) {
      cx2.block.children.pop();
      cx2.block.positions.pop();
    }
    return end2 - start2;
  }
};
const markdownHighlighting = styleTags({
  "Blockquote/...": tags$1.quote,
  HorizontalRule: tags$1.contentSeparator,
  "ATXHeading1/... SetextHeading1/...": tags$1.heading1,
  "ATXHeading2/... SetextHeading2/...": tags$1.heading2,
  "ATXHeading3/...": tags$1.heading3,
  "ATXHeading4/...": tags$1.heading4,
  "ATXHeading5/...": tags$1.heading5,
  "ATXHeading6/...": tags$1.heading6,
  "Comment CommentBlock": tags$1.comment,
  Escape: tags$1.escape,
  Entity: tags$1.character,
  "Emphasis/...": tags$1.emphasis,
  "StrongEmphasis/...": tags$1.strong,
  "Link/... Image/...": tags$1.link,
  "OrderedList/... BulletList/...": tags$1.list,
  "BlockQuote/...": tags$1.quote,
  "InlineCode CodeText": tags$1.monospace,
  "URL Autolink": tags$1.url,
  "HeaderMark HardBreak QuoteMark ListMark LinkMark EmphasisMark CodeMark":
    tags$1.processingInstruction,
  "CodeInfo LinkLabel": tags$1.labelName,
  LinkTitle: tags$1.string,
  Paragraph: tags$1.content,
});
export const parser$3 = new MarkdownParser(
  new NodeSet(nodeTypes).extend(markdownHighlighting),
  Object.keys(DefaultBlockParsers).map((n2) => DefaultBlockParsers[n2]),
  Object.keys(DefaultBlockParsers).map((n2) => DefaultLeafBlocks[n2]),
  Object.keys(DefaultBlockParsers),
  DefaultEndLeaf,
  DefaultSkipMarkup,
  Object.keys(DefaultInline).map((n2) => DefaultInline[n2]),
  Object.keys(DefaultInline),
  [],
);
export function parseCode(config2) {
  let { codeParser, htmlParser } = config2;
  let wrap2 = parseMixed((node2, input) => {
    let id2 = node2.type.id;
    if (codeParser && (id2 == Type.CodeBlock || id2 == Type.FencedCode)) {
      let info2 = "";
      if (id2 == Type.FencedCode) {
        let infoNode = node2.node.getChild(Type.CodeInfo);
        if (infoNode) info2 = input.read(infoNode.from, infoNode.to);
      }
      let parser2 = codeParser(info2);
      if (parser2)
        return {
          parser: parser2,
          overlay: (node3) => node3.type.id == Type.CodeText,
          bracketed: id2 == Type.FencedCode,
        };
    } else if (
      htmlParser &&
      (id2 == Type.HTMLBlock || id2 == Type.HTMLTag || id2 == Type.CommentBlock)
    ) {
      return {
        parser: htmlParser,
        overlay: leftOverSpace(node2.node, node2.from, node2.to),
      };
    }
    return null;
  });
  return {
    wrap: wrap2,
  };
}
const htmlHighlighting = styleTags({
  "Text RawText IncompleteTag IncompleteCloseTag": tags$1.content,
  "StartTag StartCloseTag SelfClosingEndTag EndTag": tags$1.angleBracket,
  TagName: tags$1.tagName,
  "MismatchedCloseTag/TagName": [tags$1.tagName, tags$1.invalid],
  AttributeName: tags$1.attributeName,
  "AttributeValue UnquotedAttributeValue": tags$1.attributeValue,
  Is: tags$1.definitionOperator,
  "EntityReference CharacterReference": tags$1.character,
  Comment: tags$1.blockComment,
  ProcessingInst: tags$1.processingInstruction,
  DoctypeDecl: tags$1.documentMeta,
});
export const parser$2 = LRParser.deserialize({
  version: 14,
  states:
    ",xOVO!rOOO!ZQ#tO'#CrO!`Q#tO'#C{O!eQ#tO'#DOO!jQ#tO'#DRO!oQ#tO'#DTO!tOaO'#CqO#PObO'#CqO#[OdO'#CqO$kO!rO'#CqOOO`'#Cq'#CqO$rO$fO'#DUO$zQ#tO'#DWO%PQ#tO'#DXOOO`'#Dl'#DlOOO`'#DZ'#DZQVO!rOOO%UQ&rO,59^O%aQ&rO,59gO%lQ&rO,59jO%wQ&rO,59mO&SQ&rO,59oOOOa'#D_'#D_O&_OaO'#CyO&jOaO,59]OOOb'#D`'#D`O&rObO'#C|O&}ObO,59]OOOd'#Da'#DaO'VOdO'#DPO'bOdO,59]OOO`'#Db'#DbO'jO!rO,59]O'qQ#tO'#DSOOO`,59],59]OOOp'#Dc'#DcO'vO$fO,59pOOO`,59p,59pO(OQ#|O,59rO(TQ#|O,59sOOO`-E7X-E7XO(YQ&rO'#CtOOQW'#D['#D[O(hQ&rO1G.xOOOa1G.x1G.xOOO`1G/Z1G/ZO(sQ&rO1G/ROOOb1G/R1G/RO)OQ&rO1G/UOOOd1G/U1G/UO)ZQ&rO1G/XOOO`1G/X1G/XO)fQ&rO1G/ZOOOa-E7]-E7]O)qQ#tO'#CzOOO`1G.w1G.wOOOb-E7^-E7^O)vQ#tO'#C}OOOd-E7_-E7_O){Q#tO'#DQOOO`-E7`-E7`O*QQ#|O,59nOOOp-E7a-E7aOOO`1G/[1G/[OOO`1G/^1G/^OOO`1G/_1G/_O*VQ,UO,59`OOQW-E7Y-E7YOOOa7+$d7+$dOOO`7+$u7+$uOOOb7+$m7+$mOOOd7+$p7+$pOOO`7+$s7+$sO*bQ#|O,59fO*gQ#|O,59iO*lQ#|O,59lOOO`1G/Y1G/YO*qO7[O'#CwO+SOMhO'#CwOOQW1G.z1G.zOOO`1G/Q1G/QOOO`1G/T1G/TOOO`1G/W1G/WOOOO'#D]'#D]O+eO7[O,59cOOQW,59c,59cOOOO'#D^'#D^O+vOMhO,59cOOOO-E7Z-E7ZOOQW1G.}1G.}OOOO-E7[-E7[",
  stateData:
    ",c~O!_OS~OUSOVPOWQOXROYTO[]O][O^^O_^Oa^Ob^Oc^Od^Oy^O|_O!eZO~OgaO~OgbO~OgcO~OgdO~OgeO~O!XfOPmP![mP~O!YiOQpP![pP~O!ZlORsP![sP~OUSOVPOWQOXROYTOZqO[]O][O^^O_^Oa^Ob^Oc^Od^Oy^O!eZO~O![rO~P#gO!]sO!fuO~OgvO~OgwO~OS|OT}OiyO~OS!POT}OiyO~OS!ROT}OiyO~OS!TOT}OiyO~OS}OT}OiyO~O!XfOPmX![mX~OP!WO![!XO~O!YiOQpX![pX~OQ!ZO![!XO~O!ZlORsX![sX~OR!]O![!XO~O![!XO~P#gOg!_O~O!]sO!f!aO~OS!bO~OS!cO~Oj!dOShXThXihX~OS!fOT!gOiyO~OS!hOT!gOiyO~OS!iOT!gOiyO~OS!jOT!gOiyO~OS!gOT!gOiyO~Og!kO~Og!lO~Og!mO~OS!nO~Ol!qO!a!oO!c!pO~OS!rO~OS!sO~OS!tO~Ob!uOc!uOd!uO!a!wO!b!uO~Ob!xOc!xOd!xO!c!wO!d!xO~Ob!uOc!uOd!uO!a!{O!b!uO~Ob!xOc!xOd!xO!c!{O!d!xO~OT~cbd!ey|!e~",
  goto: "%q!aPPPPPPPPPPPPPPPPPPPPP!b!hP!nPP!zP!}#Q#T#Z#^#a#g#j#m#s#y!bP!b!bP$P$V$m$s$y%P%V%]%cPPPPPPPP%iX^OX`pXUOX`pezabcde{!O!Q!S!UR!q!dRhUR!XhXVOX`pRkVR!XkXWOX`pRnWR!XnXXOX`pQrXR!XpXYOX`pQ`ORx`Q{aQ!ObQ!QcQ!SdQ!UeZ!e{!O!Q!S!UQ!v!oR!z!vQ!y!pR!|!yQgUR!VgQjVR!YjQmWR![mQpXR!^pQtZR!`tS_O`ToXp",
  nodeNames:
    "⚠ StartCloseTag StartCloseTag StartCloseTag EndTag SelfClosingEndTag StartTag StartTag StartTag StartTag StartTag StartCloseTag StartCloseTag StartCloseTag IncompleteTag IncompleteCloseTag Document Text EntityReference CharacterReference InvalidEntity Element OpenTag TagName Attribute AttributeName Is AttributeValue UnquotedAttributeValue ScriptText CloseTag OpenTag StyleText CloseTag OpenTag TextareaText CloseTag OpenTag CloseTag SelfClosingTag Comment ProcessingInst MismatchedCloseTag CloseTag DoctypeDecl",
  maxTerm: 68,
  context: elementContext,
  nodeProps: [
    [
      "closedBy",
      -10,
      1,
      2,
      3,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      "EndTag",
      6,
      "EndTag SelfClosingEndTag",
      -4,
      22,
      31,
      34,
      37,
      "CloseTag",
    ],
    ["openedBy", 4, "StartTag StartCloseTag", 5, "StartTag", -4, 30, 33, 36, 38, "OpenTag"],
    [
      "group",
      -10,
      14,
      15,
      18,
      19,
      20,
      21,
      40,
      41,
      42,
      43,
      "Entity",
      17,
      "Entity TextContent",
      -3,
      29,
      32,
      35,
      "TextContent Entity",
    ],
    ["isolate", -11, 22, 30, 31, 33, 34, 36, 37, 38, 39, 42, 43, "ltr", -3, 27, 28, 40, ""],
  ],
  propSources: [htmlHighlighting],
  skippedNodes: [0],
  repeatNodeCount: 9,
  tokenData:
    "!<p!aR!YOX$qXY,QYZ,QZ[$q[]&X]^,Q^p$qpq,Qqr-_rs3_sv-_vw3}wxHYx}-_}!OH{!O!P-_!P!Q$q!Q![-_![!]Mz!]!^-_!^!_!$S!_!`!;x!`!a&X!a!c-_!c!}Mz!}#R-_#R#SMz#S#T1k#T#oMz#o#s-_#s$f$q$f%W-_%W%oMz%o%p-_%p&aMz&a&b-_&b1pMz1p4U-_4U4dMz4d4e-_4e$ISMz$IS$I`-_$I`$IbMz$Ib$Kh-_$Kh%#tMz%#t&/x-_&/x&EtMz&Et&FV-_&FV;'SMz;'S;:j!#|;:j;=`3X<%l?&r-_?&r?AhMz?Ah?BY$q?BY?MnMz?MnO$q!Z$|caPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr$qrs&}sv$qvw+Pwx(tx!^$q!^!_*V!_!a&X!a#S$q#S#T&X#T;'S$q;'S;=`+z<%lO$q!R&bXaP!b`!dpOr&Xrs&}sv&Xwx(tx!^&X!^!_*V!_;'S&X;'S;=`*y<%lO&Xq'UVaP!dpOv&}wx'kx!^&}!^!_(V!_;'S&};'S;=`(n<%lO&}P'pTaPOv'kw!^'k!_;'S'k;'S;=`(P<%lO'kP(SP;=`<%l'kp([S!dpOv(Vx;'S(V;'S;=`(h<%lO(Vp(kP;=`<%l(Vq(qP;=`<%l&}a({WaP!b`Or(trs'ksv(tw!^(t!^!_)e!_;'S(t;'S;=`*P<%lO(t`)jT!b`Or)esv)ew;'S)e;'S;=`)y<%lO)e`)|P;=`<%l)ea*SP;=`<%l(t!Q*^V!b`!dpOr*Vrs(Vsv*Vwx)ex;'S*V;'S;=`*s<%lO*V!Q*vP;=`<%l*V!R*|P;=`<%l&XW+UYlWOX+PZ[+P^p+Pqr+Psw+Px!^+P!a#S+P#T;'S+P;'S;=`+t<%lO+PW+wP;=`<%l+P!Z+}P;=`<%l$q!a,]`aP!b`!dp!_^OX&XXY,QYZ,QZ]&X]^,Q^p&Xpq,Qqr&Xrs&}sv&Xwx(tx!^&X!^!_*V!_;'S&X;'S;=`*y<%lO&X!_-ljiSaPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr-_rs&}sv-_vw/^wx(tx!P-_!P!Q$q!Q!^-_!^!_*V!_!a&X!a#S-_#S#T1k#T#s-_#s$f$q$f;'S-_;'S;=`3X<%l?Ah-_?Ah?BY$q?BY?Mn-_?MnO$q[/ebiSlWOX+PZ[+P^p+Pqr/^sw/^x!P/^!P!Q+P!Q!^/^!a#S/^#S#T0m#T#s/^#s$f+P$f;'S/^;'S;=`1e<%l?Ah/^?Ah?BY+P?BY?Mn/^?MnO+PS0rXiSqr0msw0mx!P0m!Q!^0m!a#s0m$f;'S0m;'S;=`1_<%l?Ah0m?BY?Mn0mS1bP;=`<%l0m[1hP;=`<%l/^!V1vciSaP!b`!dpOq&Xqr1krs&}sv1kvw0mwx(tx!P1k!P!Q&X!Q!^1k!^!_*V!_!a&X!a#s1k#s$f&X$f;'S1k;'S;=`3R<%l?Ah1k?Ah?BY&X?BY?Mn1k?MnO&X!V3UP;=`<%l1k!_3[P;=`<%l-_!Z3hV!ahaP!dpOv&}wx'kx!^&}!^!_(V!_;'S&};'S;=`(n<%lO&}!_4WiiSlWd!ROX5uXZ7SZ[5u[^7S^p5uqr8trs7Sst>]tw8twx7Sx!P8t!P!Q5u!Q!]8t!]!^/^!^!a7S!a#S8t#S#T;{#T#s8t#s$f5u$f;'S8t;'S;=`>V<%l?Ah8t?Ah?BY5u?BY?Mn8t?MnO5u!Z5zblWOX5uXZ7SZ[5u[^7S^p5uqr5urs7Sst+Ptw5uwx7Sx!]5u!]!^7w!^!a7S!a#S5u#S#T7S#T;'S5u;'S;=`8n<%lO5u!R7VVOp7Sqs7St!]7S!]!^7l!^;'S7S;'S;=`7q<%lO7S!R7qOb!R!R7tP;=`<%l7S!Z8OYlWb!ROX+PZ[+P^p+Pqr+Psw+Px!^+P!a#S+P#T;'S+P;'S;=`+t<%lO+P!Z8qP;=`<%l5u!_8{iiSlWOX5uXZ7SZ[5u[^7S^p5uqr8trs7Sst/^tw8twx7Sx!P8t!P!Q5u!Q!]8t!]!^:j!^!a7S!a#S8t#S#T;{#T#s8t#s$f5u$f;'S8t;'S;=`>V<%l?Ah8t?Ah?BY5u?BY?Mn8t?MnO5u!_:sbiSlWb!ROX+PZ[+P^p+Pqr/^sw/^x!P/^!P!Q+P!Q!^/^!a#S/^#S#T0m#T#s/^#s$f+P$f;'S/^;'S;=`1e<%l?Ah/^?Ah?BY+P?BY?Mn/^?MnO+P!V<QciSOp7Sqr;{rs7Sst0mtw;{wx7Sx!P;{!P!Q7S!Q!];{!]!^=]!^!a7S!a#s;{#s$f7S$f;'S;{;'S;=`>P<%l?Ah;{?Ah?BY7S?BY?Mn;{?MnO7S!V=dXiSb!Rqr0msw0mx!P0m!Q!^0m!a#s0m$f;'S0m;'S;=`1_<%l?Ah0m?BY?Mn0m!V>SP;=`<%l;{!_>YP;=`<%l8t!_>dhiSlWOX@OXZAYZ[@O[^AY^p@OqrBwrsAYswBwwxAYx!PBw!P!Q@O!Q!]Bw!]!^/^!^!aAY!a#SBw#S#TE{#T#sBw#s$f@O$f;'SBw;'S;=`HS<%l?AhBw?Ah?BY@O?BY?MnBw?MnO@O!Z@TalWOX@OXZAYZ[@O[^AY^p@Oqr@OrsAYsw@OwxAYx!]@O!]!^Az!^!aAY!a#S@O#S#TAY#T;'S@O;'S;=`Bq<%lO@O!RA]UOpAYq!]AY!]!^Ao!^;'SAY;'S;=`At<%lOAY!RAtOc!R!RAwP;=`<%lAY!ZBRYlWc!ROX+PZ[+P^p+Pqr+Psw+Px!^+P!a#S+P#T;'S+P;'S;=`+t<%lO+P!ZBtP;=`<%l@O!_COhiSlWOX@OXZAYZ[@O[^AY^p@OqrBwrsAYswBwwxAYx!PBw!P!Q@O!Q!]Bw!]!^Dj!^!aAY!a#SBw#S#TE{#T#sBw#s$f@O$f;'SBw;'S;=`HS<%l?AhBw?Ah?BY@O?BY?MnBw?MnO@O!_DsbiSlWc!ROX+PZ[+P^p+Pqr/^sw/^x!P/^!P!Q+P!Q!^/^!a#S/^#S#T0m#T#s/^#s$f+P$f;'S/^;'S;=`1e<%l?Ah/^?Ah?BY+P?BY?Mn/^?MnO+P!VFQbiSOpAYqrE{rsAYswE{wxAYx!PE{!P!QAY!Q!]E{!]!^GY!^!aAY!a#sE{#s$fAY$f;'SE{;'S;=`G|<%l?AhE{?Ah?BYAY?BY?MnE{?MnOAY!VGaXiSc!Rqr0msw0mx!P0m!Q!^0m!a#s0m$f;'S0m;'S;=`1_<%l?Ah0m?BY?Mn0m!VHPP;=`<%lE{!_HVP;=`<%lBw!ZHcW!cxaP!b`Or(trs'ksv(tw!^(t!^!_)e!_;'S(t;'S;=`*P<%lO(t!aIYliSaPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr-_rs&}sv-_vw/^wx(tx}-_}!OKQ!O!P-_!P!Q$q!Q!^-_!^!_*V!_!a&X!a#S-_#S#T1k#T#s-_#s$f$q$f;'S-_;'S;=`3X<%l?Ah-_?Ah?BY$q?BY?Mn-_?MnO$q!aK_kiSaPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr-_rs&}sv-_vw/^wx(tx!P-_!P!Q$q!Q!^-_!^!_*V!_!`&X!`!aMS!a#S-_#S#T1k#T#s-_#s$f$q$f;'S-_;'S;=`3X<%l?Ah-_?Ah?BY$q?BY?Mn-_?MnO$q!TM_XaP!b`!dp!fQOr&Xrs&}sv&Xwx(tx!^&X!^!_*V!_;'S&X;'S;=`*y<%lO&X!aNZ!ZiSgQaPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr-_rs&}sv-_vw/^wx(tx}-_}!OMz!O!PMz!P!Q$q!Q![Mz![!]Mz!]!^-_!^!_*V!_!a&X!a!c-_!c!}Mz!}#R-_#R#SMz#S#T1k#T#oMz#o#s-_#s$f$q$f$}-_$}%OMz%O%W-_%W%oMz%o%p-_%p&aMz&a&b-_&b1pMz1p4UMz4U4dMz4d4e-_4e$ISMz$IS$I`-_$I`$IbMz$Ib$Je-_$Je$JgMz$Jg$Kh-_$Kh%#tMz%#t&/x-_&/x&EtMz&Et&FV-_&FV;'SMz;'S;:j!#|;:j;=`3X<%l?&r-_?&r?AhMz?Ah?BY$q?BY?MnMz?MnO$q!a!$PP;=`<%lMz!R!$ZY!b`!dpOq*Vqr!$yrs(Vsv*Vwx)ex!a*V!a!b!4t!b;'S*V;'S;=`*s<%lO*V!R!%Q]!b`!dpOr*Vrs(Vsv*Vwx)ex}*V}!O!%y!O!f*V!f!g!']!g#W*V#W#X!0`#X;'S*V;'S;=`*s<%lO*V!R!&QX!b`!dpOr*Vrs(Vsv*Vwx)ex}*V}!O!&m!O;'S*V;'S;=`*s<%lO*V!R!&vV!b`!dp!ePOr*Vrs(Vsv*Vwx)ex;'S*V;'S;=`*s<%lO*V!R!'dX!b`!dpOr*Vrs(Vsv*Vwx)ex!q*V!q!r!(P!r;'S*V;'S;=`*s<%lO*V!R!(WX!b`!dpOr*Vrs(Vsv*Vwx)ex!e*V!e!f!(s!f;'S*V;'S;=`*s<%lO*V!R!(zX!b`!dpOr*Vrs(Vsv*Vwx)ex!v*V!v!w!)g!w;'S*V;'S;=`*s<%lO*V!R!)nX!b`!dpOr*Vrs(Vsv*Vwx)ex!{*V!{!|!*Z!|;'S*V;'S;=`*s<%lO*V!R!*bX!b`!dpOr*Vrs(Vsv*Vwx)ex!r*V!r!s!*}!s;'S*V;'S;=`*s<%lO*V!R!+UX!b`!dpOr*Vrs(Vsv*Vwx)ex!g*V!g!h!+q!h;'S*V;'S;=`*s<%lO*V!R!+xY!b`!dpOr!+qrs!,hsv!+qvw!-Swx!.[x!`!+q!`!a!/j!a;'S!+q;'S;=`!0Y<%lO!+qq!,mV!dpOv!,hvx!-Sx!`!,h!`!a!-q!a;'S!,h;'S;=`!.U<%lO!,hP!-VTO!`!-S!`!a!-f!a;'S!-S;'S;=`!-k<%lO!-SP!-kO|PP!-nP;=`<%l!-Sq!-xS!dp|POv(Vx;'S(V;'S;=`(h<%lO(Vq!.XP;=`<%l!,ha!.aX!b`Or!.[rs!-Ssv!.[vw!-Sw!`!.[!`!a!.|!a;'S!.[;'S;=`!/d<%lO!.[a!/TT!b`|POr)esv)ew;'S)e;'S;=`)y<%lO)ea!/gP;=`<%l!.[!R!/sV!b`!dp|POr*Vrs(Vsv*Vwx)ex;'S*V;'S;=`*s<%lO*V!R!0]P;=`<%l!+q!R!0gX!b`!dpOr*Vrs(Vsv*Vwx)ex#c*V#c#d!1S#d;'S*V;'S;=`*s<%lO*V!R!1ZX!b`!dpOr*Vrs(Vsv*Vwx)ex#V*V#V#W!1v#W;'S*V;'S;=`*s<%lO*V!R!1}X!b`!dpOr*Vrs(Vsv*Vwx)ex#h*V#h#i!2j#i;'S*V;'S;=`*s<%lO*V!R!2qX!b`!dpOr*Vrs(Vsv*Vwx)ex#m*V#m#n!3^#n;'S*V;'S;=`*s<%lO*V!R!3eX!b`!dpOr*Vrs(Vsv*Vwx)ex#d*V#d#e!4Q#e;'S*V;'S;=`*s<%lO*V!R!4XX!b`!dpOr*Vrs(Vsv*Vwx)ex#X*V#X#Y!+q#Y;'S*V;'S;=`*s<%lO*V!R!4{Y!b`!dpOr!4trs!5ksv!4tvw!6Vwx!8]x!a!4t!a!b!:]!b;'S!4t;'S;=`!;r<%lO!4tq!5pV!dpOv!5kvx!6Vx!a!5k!a!b!7W!b;'S!5k;'S;=`!8V<%lO!5kP!6YTO!a!6V!a!b!6i!b;'S!6V;'S;=`!7Q<%lO!6VP!6lTO!`!6V!`!a!6{!a;'S!6V;'S;=`!7Q<%lO!6VP!7QOyPP!7TP;=`<%l!6Vq!7]V!dpOv!5kvx!6Vx!`!5k!`!a!7r!a;'S!5k;'S;=`!8V<%lO!5kq!7yS!dpyPOv(Vx;'S(V;'S;=`(h<%lO(Vq!8YP;=`<%l!5ka!8bX!b`Or!8]rs!6Vsv!8]vw!6Vw!a!8]!a!b!8}!b;'S!8];'S;=`!:V<%lO!8]a!9SX!b`Or!8]rs!6Vsv!8]vw!6Vw!`!8]!`!a!9o!a;'S!8];'S;=`!:V<%lO!8]a!9vT!b`yPOr)esv)ew;'S)e;'S;=`)y<%lO)ea!:YP;=`<%l!8]!R!:dY!b`!dpOr!4trs!5ksv!4tvw!6Vwx!8]x!`!4t!`!a!;S!a;'S!4t;'S;=`!;r<%lO!4t!R!;]V!b`!dpyPOr*Vrs(Vsv*Vwx)ex;'S*V;'S;=`*s<%lO*V!R!;uP;=`<%l!4t!V!<TXjSaP!b`!dpOr&Xrs&}sv&Xwx(tx!^&X!^!_*V!_;'S&X;'S;=`*y<%lO&X",
  tokenizers: [
    scriptTokens,
    styleTokens,
    textareaTokens,
    endTag$1,
    tagStart,
    commentContent,
    0,
    1,
    2,
    3,
    4,
    5,
  ],
  topRules: {
    Document: [0, 16],
  },
  dialects: {
    noMatch: 0,
    selfClosing: 515,
  },
  tokenPrec: 517,
});
export function configureNesting(tags2 = [], attributes = []) {
  let script2 = [],
    style2 = [],
    textarea = [],
    other = [];
  for (let tag of tags2) {
    let array2 =
      tag.tag == "script"
        ? script2
        : tag.tag == "style"
          ? style2
          : tag.tag == "textarea"
            ? textarea
            : other;
    array2.push(tag);
  }
  let attrs = attributes.length ? Object.create(null) : null;
  for (let attr2 of attributes) (attrs[attr2.name] || (attrs[attr2.name] = [])).push(attr2);
  return parseMixed((node2, input) => {
    let id2 = node2.type.id;
    if (id2 == ScriptText) return maybeNest(node2, input, script2);
    if (id2 == StyleText) return maybeNest(node2, input, style2);
    if (id2 == TextareaText) return maybeNest(node2, input, textarea);
    if (id2 == Element$1 && other.length) {
      let n2 = node2.node,
        open = n2.firstChild,
        tagName = open && findTagName(open, input),
        attrs2;
      if (tagName)
        for (let tag of other) {
          if (
            tag.tag == tagName &&
            (!tag.attrs || tag.attrs(attrs2 || (attrs2 = getAttrs(open, input))))
          ) {
            let close2 = n2.lastChild;
            let to = close2.type.id == CloseTag ? close2.from : n2.to;
            if (to > open.to)
              return {
                parser: tag.parser,
                overlay: [
                  {
                    from: open.to,
                    to,
                  },
                ],
              };
          }
        }
    }
    if (attrs && id2 == Attribute2) {
      let n2 = node2.node,
        nameNode;
      if ((nameNode = n2.firstChild)) {
        let matches2 = attrs[input.read(nameNode.from, nameNode.to)];
        if (matches2)
          for (let attr2 of matches2) {
            if (attr2.tagName && attr2.tagName != findTagName(n2.parent, input)) continue;
            let value = n2.lastChild;
            if (value.type.id == AttributeValue) {
              let from2 = value.from + 1;
              let last2 = value.lastChild,
                to = value.to - (last2 && last2.isError ? 0 : 1);
              if (to > from2)
                return {
                  parser: attr2.parser,
                  overlay: [
                    {
                      from: from2,
                      to,
                    },
                  ],
                  bracketed: true,
                };
            } else if (value.type.id == UnquotedAttributeValue) {
              return {
                parser: attr2.parser,
                overlay: [
                  {
                    from: value.from,
                    to: value.to,
                  },
                ],
              };
            }
          }
      }
    }
    return null;
  });
}
