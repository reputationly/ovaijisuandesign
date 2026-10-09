// standard-keymap.js
import {
  EditorSelection,
  IndentContext,
  historyField_,
  historyConfig,
  undo,
  redo,
  interestingNode,
  moveSel,
  ltrAtCursor,
  updateSel,
  rangeEnd,
  setSel,
  extendSel,
  countColumn,
  getIndentUnit,
  findClusterBreak,
  indentString,
  Text,
  changeBySelectedLine,
  cursorCharLeft,
  selectCharLeft,
  cursorCharRight,
  selectCharRight,
  cursorLineUp,
  selectLineUp,
  cursorLineDown,
  selectLineDown,
  cursorLineStart,
  selectLineStart,
  cursorLineEnd,
  selectLineEnd,
  splitLine,
  transposeChars,
  cursorGroupLeft,
  selectGroupLeft,
  cursorLineBoundaryLeft,
  selectLineBoundaryLeft,
  cursorGroupRight,
  selectGroupRight,
  cursorLineBoundaryRight,
  selectLineBoundaryRight,
  cursorDocStart,
  selectDocStart,
  cursorDocEnd,
  selectDocEnd,
  cursorLineBoundaryBackward,
  selectLineBoundaryBackward,
  cursorLineBoundaryForward,
  selectLineBoundaryForward,
  selectAll,
} from "../../vendor.js";
import { NodeProp } from "@lezer/common";
import { EditorView2 } from "./editor-view2.js";
import { getIndentation, matchBrackets, syntaxTree } from "./tree-node.js";
export function history(config2 = {}) {
  return [
    historyField_,
    historyConfig.of(config2),
    EditorView2.domEventHandlers({
      beforeinput(e2, view2) {
        let command2 =
          e2.inputType == "historyUndo" ? undo : e2.inputType == "historyRedo" ? redo : null;
        if (!command2) return false;
        e2.preventDefault();
        return command2(view2);
      },
    }),
  ];
}
function moveBySyntax(state2, start2, forward) {
  let pos = syntaxTree(state2).resolveInner(start2.head);
  let bracketProp = forward ? NodeProp.closedBy : NodeProp.openedBy;
  for (let at2 = start2.head; ;) {
    let next2 = forward ? pos.childAfter(at2) : pos.childBefore(at2);
    if (!next2) break;
    if (interestingNode(state2, next2, bracketProp)) pos = next2;
    else at2 = forward ? next2.to : next2.from;
  }
  let bracket2 = pos.type.prop(bracketProp),
    match2,
    newPos;
  if (
    bracket2 &&
    (match2 = forward ? matchBrackets(state2, pos.from, 1) : matchBrackets(state2, pos.to, -1)) &&
    match2.matched
  )
    newPos = forward ? match2.end.to : match2.end.from;
  else newPos = forward ? pos.to : pos.from;
  return EditorSelection.cursor(newPos, forward ? -1 : 1);
}
export const cursorSyntaxLeft = (view2) =>
  moveSel(view2, (range2) => moveBySyntax(view2.state, range2, !ltrAtCursor(view2)));
export const cursorSyntaxRight = (view2) =>
  moveSel(view2, (range2) => moveBySyntax(view2.state, range2, ltrAtCursor(view2)));
function pageInfo(view2) {
  let selfScroll = view2.scrollDOM.clientHeight < view2.scrollDOM.scrollHeight - 2;
  let marginTop = 0,
    marginBottom = 0,
    height;
  if (selfScroll) {
    for (let source of view2.state.facet(EditorView2.scrollMargins)) {
      let margins = source(view2);
      if (margins === null || margins === void 0 ? void 0 : margins.top)
        marginTop = Math.max(
          margins === null || margins === void 0 ? void 0 : margins.top,
          marginTop,
        );
      if (margins === null || margins === void 0 ? void 0 : margins.bottom)
        marginBottom = Math.max(
          margins === null || margins === void 0 ? void 0 : margins.bottom,
          marginBottom,
        );
    }
    height = view2.scrollDOM.clientHeight - marginTop - marginBottom;
  } else {
    height = (view2.dom.ownerDocument.defaultView || window).innerHeight;
  }
  return {
    marginTop,
    marginBottom,
    selfScroll,
    height: Math.max(view2.defaultLineHeight, height - 5),
  };
}
function cursorByPage(view2, forward) {
  let page = pageInfo(view2);
  let { state: state2 } = view2,
    selection2 = updateSel(state2.selection, (range2) => {
      return range2.empty
        ? view2.moveVertically(range2, forward, page.height)
        : rangeEnd(range2, forward);
    });
  if (selection2.eq(state2.selection)) return false;
  let effect2;
  if (page.selfScroll) {
    let startPos = view2.coordsAtPos(state2.selection.main.head);
    let scrollRect = view2.scrollDOM.getBoundingClientRect();
    let scrollTop = scrollRect.top + page.marginTop,
      scrollBottom = scrollRect.bottom - page.marginBottom;
    if (startPos && startPos.top > scrollTop && startPos.bottom < scrollBottom)
      effect2 = EditorView2.scrollIntoView(selection2.main.head, {
        y: "start",
        yMargin: startPos.top - scrollTop,
      });
  }
  view2.dispatch(setSel(state2, selection2), {
    effects: effect2,
  });
  return true;
}
const cursorPageUp = (view2) => cursorByPage(view2, false);
const cursorPageDown = (view2) => cursorByPage(view2, true);
function toMatchingBracket(state2, dispatch2, extend2) {
  let found2 = false,
    selection2 = updateSel(state2.selection, (range2) => {
      let matching =
        matchBrackets(state2, range2.head, -1) ||
        matchBrackets(state2, range2.head, 1) ||
        (range2.head > 0 && matchBrackets(state2, range2.head - 1, 1)) ||
        (range2.head < state2.doc.length && matchBrackets(state2, range2.head + 1, -1));
      if (!matching || !matching.end) return range2;
      found2 = true;
      let head2 = matching.start.from == range2.head ? matching.end.to : matching.end.from;
      return EditorSelection.cursor(head2);
    });
  if (!found2) return false;
  dispatch2(setSel(state2, selection2));
  return true;
}
export const cursorMatchingBracket = ({ state: state2, dispatch: dispatch2 }) =>
  toMatchingBracket(state2, dispatch2);
export const selectSyntaxLeft = (view2) => {
  let forward = !ltrAtCursor(view2);
  return extendSel(view2, forward, (range2) => moveBySyntax(view2.state, range2, forward));
};
export const selectSyntaxRight = (view2) => {
  let forward = ltrAtCursor(view2);
  return extendSel(view2, forward, (range2) => moveBySyntax(view2.state, range2, forward));
};
function selectByPage(view2, forward) {
  return extendSel(view2, forward, (range2) =>
    view2.moveVertically(range2, forward, pageInfo(view2).height),
  );
}
const selectPageUp = (view2) => selectByPage(view2, false);
const selectPageDown = (view2) => selectByPage(view2, true);
export const selectParentSyntax = ({ state: state2, dispatch: dispatch2 }) => {
  let selection2 = updateSel(state2.selection, (range2) => {
    let tree = syntaxTree(state2),
      stack = tree.resolveStack(range2.from, 1);
    if (range2.empty) {
      let stackBefore = tree.resolveStack(range2.from, -1);
      if (stackBefore.node.from >= stack.node.from && stackBefore.node.to <= stack.node.to)
        stack = stackBefore;
    }
    for (let cur = stack; cur; cur = cur.next) {
      let { node: node2 } = cur;
      if (
        ((node2.from < range2.from && node2.to >= range2.to) ||
          (node2.to > range2.to && node2.from <= range2.from)) &&
        cur.next
      )
        return EditorSelection.range(node2.to, node2.from);
    }
    return range2;
  });
  if (selection2.eq(state2.selection)) return false;
  dispatch2(setSel(state2, selection2));
  return true;
};
function deleteBy(target, by) {
  if (target.state.readOnly) return false;
  let event = "delete.selection",
    { state: state2 } = target;
  let changes = state2.changeByRange((range2) => {
    let { from: from2, to } = range2;
    if (from2 == to) {
      let towards = by(range2);
      if (towards < from2) {
        event = "delete.backward";
        towards = skipAtomic(target, towards, false);
      } else if (towards > from2) {
        event = "delete.forward";
        towards = skipAtomic(target, towards, true);
      }
      from2 = Math.min(from2, towards);
      to = Math.max(to, towards);
    } else {
      from2 = skipAtomic(target, from2, false);
      to = skipAtomic(target, to, true);
    }
    return from2 == to
      ? {
          range: range2,
        }
      : {
          changes: {
            from: from2,
            to,
          },
          range: EditorSelection.cursor(from2, from2 < range2.head ? -1 : 1),
        };
  });
  if (changes.changes.empty) return false;
  target.dispatch(
    state2.update(changes, {
      scrollIntoView: true,
      userEvent: event,
      effects:
        event == "delete.selection"
          ? EditorView2.announce.of(state2.phrase("Selection deleted"))
          : void 0,
    }),
  );
  return true;
}
function skipAtomic(target, pos, forward) {
  if (target instanceof EditorView2)
    for (let ranges of target.state.facet(EditorView2.atomicRanges).map((f2) => f2(target)))
      ranges.between(pos, pos, (from2, to) => {
        if (from2 < pos && to > pos) pos = forward ? to : from2;
      });
  return pos;
}
const deleteByChar = (target, forward, byIndentUnit) =>
  deleteBy(target, (range2) => {
    let pos = range2.from,
      { state: state2 } = target,
      line = state2.doc.lineAt(pos),
      before,
      targetPos;
    if (
      byIndentUnit &&
      !forward &&
      pos > line.from &&
      pos < line.from + 200 &&
      !/[^ \t]/.test((before = line.text.slice(0, pos - line.from)))
    ) {
      if (before[before.length - 1] == "	") return pos - 1;
      let col = countColumn(before, state2.tabSize),
        drop = col % getIndentUnit(state2) || getIndentUnit(state2);
      for (let i2 = 0; i2 < drop && before[before.length - 1 - i2] == " "; i2++) pos--;
      targetPos = pos;
    } else {
      targetPos = findClusterBreak(line.text, pos - line.from, forward, forward) + line.from;
      if (targetPos == pos && line.number != (forward ? state2.doc.lines : 1))
        targetPos += forward ? 1 : -1;
      else if (
        !forward &&
        /[\ufe00-\ufe0f]/.test(line.text.slice(targetPos - line.from, pos - line.from))
      )
        targetPos = findClusterBreak(line.text, targetPos - line.from, false, false) + line.from;
    }
    return targetPos;
  });
const deleteCharBackward = (view2) => deleteByChar(view2, false, true);
const deleteCharForward = (view2) => deleteByChar(view2, true, false);
const deleteByGroup = (target, forward) =>
  deleteBy(target, (range2) => {
    let pos = range2.head,
      { state: state2 } = target,
      line = state2.doc.lineAt(pos);
    let categorize = state2.charCategorizer(pos);
    for (let cat = null; ;) {
      if (pos == (forward ? line.to : line.from)) {
        if (pos == range2.head && line.number != (forward ? state2.doc.lines : 1))
          pos += forward ? 1 : -1;
        break;
      }
      let next2 = findClusterBreak(line.text, pos - line.from, forward) + line.from;
      let nextChar = line.text.slice(
        Math.min(pos, next2) - line.from,
        Math.max(pos, next2) - line.from,
      );
      let nextCat = categorize(nextChar);
      if (cat != null && nextCat != cat) break;
      if (nextChar != " " || pos != range2.head) cat = nextCat;
      pos = next2;
    }
    return pos;
  });
const deleteGroupBackward = (target) => deleteByGroup(target, false);
const deleteGroupForward = (target) => deleteByGroup(target, true);
const deleteToLineEnd = (view2) =>
  deleteBy(view2, (range2) => {
    let lineEnd2 = view2.lineBlockAt(range2.head).to;
    return range2.head < lineEnd2 ? lineEnd2 : Math.min(view2.state.doc.length, range2.head + 1);
  });
const deleteLineBoundaryBackward = (view2) =>
  deleteBy(view2, (range2) => {
    let lineStart = view2.moveToLineBoundary(range2, false).head;
    return range2.head > lineStart ? lineStart : Math.max(0, range2.head - 1);
  });
const deleteLineBoundaryForward = (view2) =>
  deleteBy(view2, (range2) => {
    let lineStart = view2.moveToLineBoundary(range2, true).head;
    return range2.head < lineStart ? lineStart : Math.min(view2.state.doc.length, range2.head + 1);
  });
function isBetweenBrackets(state2, pos) {
  if (/\(\)|\[\]|\{\}/.test(state2.sliceDoc(pos - 1, pos + 1)))
    return {
      from: pos,
      to: pos,
    };
  let context = syntaxTree(state2).resolveInner(pos);
  let before = context.childBefore(pos),
    after = context.childAfter(pos),
    closedBy;
  if (
    before &&
    after &&
    before.to <= pos &&
    after.from >= pos &&
    (closedBy = before.type.prop(NodeProp.closedBy)) &&
    closedBy.indexOf(after.name) > -1 &&
    state2.doc.lineAt(before.to).from == state2.doc.lineAt(after.from).from &&
    !/\S/.test(state2.sliceDoc(before.to, after.from))
  )
    return {
      from: before.to,
      to: after.from,
    };
  return null;
}
const insertNewlineAndIndent = newlineAndIndent(false);
export const insertBlankLine = newlineAndIndent(true);
function newlineAndIndent(atEof) {
  return ({ state: state2, dispatch: dispatch2 }) => {
    if (state2.readOnly) return false;
    let changes = state2.changeByRange((range2) => {
      let { from: from2, to } = range2,
        line = state2.doc.lineAt(from2);
      let explode = !atEof && from2 == to && isBetweenBrackets(state2, from2);
      if (atEof) from2 = to = (to <= line.to ? line : state2.doc.lineAt(to)).to;
      let cx2 = new IndentContext(state2, {
        simulateBreak: from2,
        simulateDoubleBreak: !!explode,
      });
      let indent2 = getIndentation(cx2, from2);
      if (indent2 == null)
        indent2 = countColumn(/^\s*/.exec(state2.doc.lineAt(from2).text)[0], state2.tabSize);
      while (to < line.to && /\s/.test(line.text[to - line.from])) to++;
      if (explode) ({ from: from2, to } = explode);
      else if (
        from2 > line.from &&
        from2 < line.from + 100 &&
        !/\S/.test(line.text.slice(0, from2))
      )
        from2 = line.from;
      let insert2 = ["", indentString(state2, indent2)];
      if (explode) insert2.push(indentString(state2, cx2.lineIndent(line.from, -1)));
      return {
        changes: {
          from: from2,
          to,
          insert: Text.of(insert2),
        },
        range: EditorSelection.cursor(from2 + 1 + insert2[1].length),
      };
    });
    dispatch2(
      state2.update(changes, {
        scrollIntoView: true,
        userEvent: "input",
      }),
    );
    return true;
  };
}
export const indentSelection = ({ state: state2, dispatch: dispatch2 }) => {
  if (state2.readOnly) return false;
  let updated = Object.create(null);
  let context = new IndentContext(state2, {
    overrideIndentation: (start2) => {
      let found2 = updated[start2];
      return found2 == null ? -1 : found2;
    },
  });
  let changes = changeBySelectedLine(state2, (line, changes2, range2) => {
    let indent2 = getIndentation(context, line.from);
    if (indent2 == null) return;
    if (!/\S/.test(line.text)) indent2 = 0;
    let cur = /^\s*/.exec(line.text)[0];
    let norm = indentString(state2, indent2);
    if (cur != norm || range2.from < line.from + cur.length) {
      updated[line.from] = indent2;
      changes2.push({
        from: line.from,
        to: line.from + cur.length,
        insert: norm,
      });
    }
  });
  if (!changes.changes.empty)
    dispatch2(
      state2.update(changes, {
        userEvent: "indent",
      }),
    );
  return true;
};
const emacsStyleKeymap = [
  {
    key: "Ctrl-b",
    run: cursorCharLeft,
    shift: selectCharLeft,
    preventDefault: true,
  },
  {
    key: "Ctrl-f",
    run: cursorCharRight,
    shift: selectCharRight,
  },
  {
    key: "Ctrl-p",
    run: cursorLineUp,
    shift: selectLineUp,
  },
  {
    key: "Ctrl-n",
    run: cursorLineDown,
    shift: selectLineDown,
  },
  {
    key: "Ctrl-a",
    run: cursorLineStart,
    shift: selectLineStart,
  },
  {
    key: "Ctrl-e",
    run: cursorLineEnd,
    shift: selectLineEnd,
  },
  {
    key: "Ctrl-d",
    run: deleteCharForward,
  },
  {
    key: "Ctrl-h",
    run: deleteCharBackward,
  },
  {
    key: "Ctrl-k",
    run: deleteToLineEnd,
  },
  {
    key: "Ctrl-Alt-h",
    run: deleteGroupBackward,
  },
  {
    key: "Ctrl-o",
    run: splitLine,
  },
  {
    key: "Ctrl-t",
    run: transposeChars,
  },
  {
    key: "Ctrl-v",
    run: cursorPageDown,
  },
];
export const standardKeymap = [
  {
    key: "ArrowLeft",
    run: cursorCharLeft,
    shift: selectCharLeft,
    preventDefault: true,
  },
  {
    key: "Mod-ArrowLeft",
    mac: "Alt-ArrowLeft",
    run: cursorGroupLeft,
    shift: selectGroupLeft,
    preventDefault: true,
  },
  {
    mac: "Cmd-ArrowLeft",
    run: cursorLineBoundaryLeft,
    shift: selectLineBoundaryLeft,
    preventDefault: true,
  },
  {
    key: "ArrowRight",
    run: cursorCharRight,
    shift: selectCharRight,
    preventDefault: true,
  },
  {
    key: "Mod-ArrowRight",
    mac: "Alt-ArrowRight",
    run: cursorGroupRight,
    shift: selectGroupRight,
    preventDefault: true,
  },
  {
    mac: "Cmd-ArrowRight",
    run: cursorLineBoundaryRight,
    shift: selectLineBoundaryRight,
    preventDefault: true,
  },
  {
    key: "ArrowUp",
    run: cursorLineUp,
    shift: selectLineUp,
    preventDefault: true,
  },
  {
    mac: "Cmd-ArrowUp",
    run: cursorDocStart,
    shift: selectDocStart,
  },
  {
    mac: "Ctrl-ArrowUp",
    run: cursorPageUp,
    shift: selectPageUp,
  },
  {
    key: "ArrowDown",
    run: cursorLineDown,
    shift: selectLineDown,
    preventDefault: true,
  },
  {
    mac: "Cmd-ArrowDown",
    run: cursorDocEnd,
    shift: selectDocEnd,
  },
  {
    mac: "Ctrl-ArrowDown",
    run: cursorPageDown,
    shift: selectPageDown,
  },
  {
    key: "PageUp",
    run: cursorPageUp,
    shift: selectPageUp,
  },
  {
    key: "PageDown",
    run: cursorPageDown,
    shift: selectPageDown,
  },
  {
    key: "Home",
    run: cursorLineBoundaryBackward,
    shift: selectLineBoundaryBackward,
    preventDefault: true,
  },
  {
    key: "Mod-Home",
    run: cursorDocStart,
    shift: selectDocStart,
  },
  {
    key: "End",
    run: cursorLineBoundaryForward,
    shift: selectLineBoundaryForward,
    preventDefault: true,
  },
  {
    key: "Mod-End",
    run: cursorDocEnd,
    shift: selectDocEnd,
  },
  {
    key: "Enter",
    run: insertNewlineAndIndent,
    shift: insertNewlineAndIndent,
  },
  {
    key: "Mod-a",
    run: selectAll,
  },
  {
    key: "Backspace",
    run: deleteCharBackward,
    shift: deleteCharBackward,
    preventDefault: true,
  },
  {
    key: "Delete",
    run: deleteCharForward,
    preventDefault: true,
  },
  {
    key: "Mod-Backspace",
    mac: "Alt-Backspace",
    run: deleteGroupBackward,
    preventDefault: true,
  },
  {
    key: "Mod-Delete",
    mac: "Alt-Delete",
    run: deleteGroupForward,
    preventDefault: true,
  },
  {
    mac: "Mod-Backspace",
    run: deleteLineBoundaryBackward,
    preventDefault: true,
  },
  {
    mac: "Mod-Delete",
    run: deleteLineBoundaryForward,
    preventDefault: true,
  },
].concat(
  emacsStyleKeymap.map((b3) => ({
    mac: b3.key,
    run: b3.run,
    shift: b3.shift,
  })),
);
