// tree-node.js
import {
  logException,
  StyleModule,
  ViewPlugin,
  Prec,
  Facet,
  StateEffect,
  runHandlers,
  Keymaps,
  buildKeymap,
  selectionConfig,
  cursorLayer,
  selectionLayer,
  nativeSelectionHidden,
  panelConfig,
  PanelGroup,
  noProps,
  IterMode,
  getChildren,
  matchNodeContext,
  checkSide,
  BufferContext,
  Rule$1,
  highlightTags,
  defineLanguageFacet,
  DocInput,
  TreeFragment,
  cutFragments,
  Parser$1,
  StateField,
  requestIdle,
  isInputPending,
  IndentContext,
  indentService,
  delimitedStrategy,
  ignoreClosed,
  topIndent,
  isParent,
  tagHighlighter,
  highlighterFacet,
  getHighlighters,
  Decoration2,
  RangeSetBuilder,
  DefaultScanDist,
  DefaultBrackets,
  matchPlainBrackets,
  noTokens,
  tags$1,
  warnForPart,
  byTag,
} from "../vendor.js";
import { EditorState2 } from "../m04/editor-state2.js";
import { NodeProp, Tree, TreeCursor, MountedTree, TreeBuffer } from "@lezer/common";
import { EditorView2 } from "./editor-view2.js";
const handleKeyEvents = Prec.default(
  EditorView2.domEventHandlers({
    keydown(event, view2) {
      return runHandlers(getKeymap(view2.state), event, view2, "editor");
    },
  }),
);
export const keymap = Facet.define({
  enables: handleKeyEvents,
});
function getKeymap(state2) {
  let bindings = state2.facet(keymap);
  let map3 = Keymaps.get(bindings);
  if (!map3)
    Keymaps.set(bindings, (map3 = buildKeymap(bindings.reduce((a2, b3) => a2.concat(b3), []))));
  return map3;
}
export function runScopeHandlers(view2, event, scope) {
  return runHandlers(getKeymap(view2.state), event, view2, scope);
}
export function drawSelection(config2 = {}) {
  return [
    selectionConfig.of(config2),
    cursorLayer,
    selectionLayer,
    hideNativeSelection,
    nativeSelectionHidden.of(true),
  ];
}
const hideNativeSelection = Prec.highest(
  EditorView2.theme({
    ".cm-line": {
      "& ::selection, &::selection": {
        backgroundColor: "transparent !important",
      },
      caretColor: "transparent !important",
    },
    ".cm-content": {
      caretColor: "transparent !important",
      "& :focus": {
        caretColor: "initial !important",
        "&::selection, & ::selection": {
          backgroundColor: "Highlight !important",
        },
      },
    },
  }),
);
export function getPanel(view2, panel) {
  let plugin = view2.plugin(panelPlugin);
  let index2 = plugin ? plugin.specs.indexOf(panel) : -1;
  return index2 > -1 ? plugin.panels[index2] : null;
}
const panelPlugin = ViewPlugin.fromClass(
  class {
    constructor(view2) {
      this.input = view2.state.facet(showPanel);
      this.specs = this.input.filter((s2) => s2);
      this.panels = this.specs.map((spec) => spec(view2));
      let conf = view2.state.facet(panelConfig);
      this.top = new PanelGroup(view2, true, conf.topContainer);
      this.bottom = new PanelGroup(view2, false, conf.bottomContainer);
      this.top.sync(this.panels.filter((p3) => p3.top));
      this.bottom.sync(this.panels.filter((p3) => !p3.top));
      for (let p3 of this.panels) {
        p3.dom.classList.add("cm-panel");
        if (p3.mount) p3.mount();
      }
    }
    update(update2) {
      let conf = update2.state.facet(panelConfig);
      if (this.top.container != conf.topContainer) {
        this.top.sync([]);
        this.top = new PanelGroup(update2.view, true, conf.topContainer);
      }
      if (this.bottom.container != conf.bottomContainer) {
        this.bottom.sync([]);
        this.bottom = new PanelGroup(update2.view, false, conf.bottomContainer);
      }
      this.top.syncClasses();
      this.bottom.syncClasses();
      let input = update2.state.facet(showPanel);
      if (input != this.input) {
        let specs = input.filter((x2) => x2);
        let panels = [],
          top2 = [],
          bottom = [],
          mount = [];
        for (let spec of specs) {
          let known = this.specs.indexOf(spec),
            panel;
          if (known < 0) {
            panel = spec(update2.view);
            mount.push(panel);
          } else {
            panel = this.panels[known];
            if (panel.update) panel.update(update2);
          }
          panels.push(panel);
          (panel.top ? top2 : bottom).push(panel);
        }
        this.specs = specs;
        this.panels = panels;
        this.top.sync(top2);
        this.bottom.sync(bottom);
        for (let p3 of mount) {
          p3.dom.classList.add("cm-panel");
          if (p3.mount) p3.mount();
        }
      } else {
        for (let p3 of this.panels) if (p3.update) p3.update(update2);
      }
    }
    destroy() {
      this.top.sync([]);
      this.bottom.sync([]);
    }
  },
  {
    provide: (plugin) =>
      EditorView2.scrollMargins.of((view2) => {
        let value = view2.plugin(plugin);
        return (
          value && {
            top: value.top.scrollMargin(),
            bottom: value.bottom.scrollMargin(),
          }
        );
      }),
  },
);
export const showPanel = Facet.define({
  enables: panelPlugin,
});
NodeProp.closedBy = new NodeProp({
  deserialize: (str2) => str2.split(" "),
});
NodeProp.openedBy = new NodeProp({
  deserialize: (str2) => str2.split(" "),
});
NodeProp.group = new NodeProp({
  deserialize: (str2) => str2.split(" "),
});
NodeProp.isolate = new NodeProp({
  deserialize: (value) => {
    if (value && value != "rtl" && value != "ltr" && value != "auto")
      throw new RangeError("Invalid value for isolate: " + value);
    return value || "auto";
  },
});
NodeProp.contextHash = new NodeProp({
  perNode: true,
});
NodeProp.lookAhead = new NodeProp({
  perNode: true,
});
NodeProp.mounted = new NodeProp({
  perNode: true,
});
export class NodeType3 {
  /**
  @internal
  */
  constructor(name2, props, id2, flags = 0) {
    this.name = name2;
    this.props = props;
    this.id = id2;
    this.flags = flags;
  }
  /**
  Define a node type.
  */
  static define(spec) {
    let props = spec.props && spec.props.length ? Object.create(null) : noProps;
    let flags =
      (spec.top ? 1 : 0) |
      (spec.skipped ? 2 : 0) |
      (spec.error ? 4 : 0) |
      (spec.name == null ? 8 : 0);
    let type2 = new NodeType3(spec.name || "", props, spec.id, flags);
    if (spec.props)
      for (let src of spec.props) {
        if (!Array.isArray(src)) src = src(type2);
        if (src) {
          if (src[0].perNode) throw new RangeError("Can't store a per-node prop on a node type");
          props[src[0].id] = src[1];
        }
      }
    return type2;
  }
  /**
  Retrieves a node prop for this type. Will return `undefined` if
  the prop isn't present on this node.
  */
  prop(prop) {
    return this.props[prop.id];
  }
  /**
  True when this is the top node of a grammar.
  */
  get isTop() {
    return (this.flags & 1) > 0;
  }
  /**
  True when this node is produced by a skip rule.
  */
  get isSkipped() {
    return (this.flags & 2) > 0;
  }
  /**
  Indicates whether this is an error node.
  */
  get isError() {
    return (this.flags & 4) > 0;
  }
  /**
  When true, this node type doesn't correspond to a user-declared
  named node, for example because it is used to cache repetition.
  */
  get isAnonymous() {
    return (this.flags & 8) > 0;
  }
  /**
  Returns true when this node's name or one of its
  [groups](#common.NodeProp^group) matches the given string.
  */
  is(name2) {
    if (typeof name2 == "string") {
      if (this.name == name2) return true;
      let group = this.prop(NodeProp.group);
      return group ? group.indexOf(name2) > -1 : false;
    }
    return this.id == name2;
  }
  /**
  Create a function from node types to arbitrary values by
  specifying an object whose property names are node or
  [group](#common.NodeProp^group) names. Often useful with
  [`NodeProp.add`](#common.NodeProp.add). You can put multiple
  names, separated by spaces, in a single property name to map
  multiple node names to a single value.
  */
  static match(map3) {
    let direct = Object.create(null);
    for (let prop in map3) for (let name2 of prop.split(" ")) direct[name2] = map3[prop];
    return (node2) => {
      for (
        let groups = node2.prop(NodeProp.group), i2 = -1;
        i2 < (groups ? groups.length : 0);
        i2++
      ) {
        let found2 = direct[i2 < 0 ? node2.name : groups[i2]];
        if (found2) return found2;
      }
    };
  }
}
NodeType3.none = new NodeType3(
  "",
  Object.create(null),
  0,
  8,
  /* NodeFlag.Anonymous */
);
Tree.empty = new Tree(NodeType3.none, [], [], 0);
function resolveNode(node2, pos, side, overlays) {
  var _a2;
  while (
    node2.from == node2.to ||
    (side < 1 ? node2.from >= pos : node2.from > pos) ||
    (side > -1 ? node2.to <= pos : node2.to < pos)
  ) {
    let parent = !overlays && node2 instanceof TreeNode && node2.index < 0 ? null : node2.parent;
    if (!parent) return node2;
    node2 = parent;
  }
  let mode2 = overlays ? 0 : IterMode.IgnoreOverlays;
  if (overlays)
    for (let scan = node2, parent = scan.parent; parent; scan = parent, parent = scan.parent) {
      if (
        scan instanceof TreeNode &&
        scan.index < 0 &&
        ((_a2 = parent.enter(pos, side, mode2)) === null || _a2 === void 0 ? void 0 : _a2.from) !=
          scan.from
      )
        node2 = parent;
    }
  for (;;) {
    let inner = node2.enter(pos, side, mode2);
    if (!inner) return node2;
    node2 = inner;
  }
}
class BaseNode {
  cursor(mode2 = 0) {
    return new TreeCursor(this, mode2);
  }
  getChild(type2, before = null, after = null) {
    let r2 = getChildren(this, type2, before, after);
    return r2.length ? r2[0] : null;
  }
  getChildren(type2, before = null, after = null) {
    return getChildren(this, type2, before, after);
  }
  resolve(pos, side = 0) {
    return resolveNode(this, pos, side, false);
  }
  resolveInner(pos, side = 0) {
    return resolveNode(this, pos, side, true);
  }
  matchContext(context) {
    return matchNodeContext(this.parent, context);
  }
  enterUnfinishedNodesBefore(pos) {
    let scan = this.childBefore(pos),
      node2 = this;
    while (scan) {
      let last2 = scan.lastChild;
      if (!last2 || last2.to != scan.to) break;
      if (last2.type.isError && last2.from == last2.to) {
        node2 = scan;
        scan = last2.prevSibling;
      } else {
        scan = last2;
      }
    }
    return node2;
  }
  get node() {
    return this;
  }
  get next() {
    return this.parent;
  }
}
class TreeNode extends BaseNode {
  constructor(_tree, from2, index2, _parent) {
    super();
    this._tree = _tree;
    this.from = from2;
    this.index = index2;
    this._parent = _parent;
  }
  get type() {
    return this._tree.type;
  }
  get name() {
    return this._tree.type.name;
  }
  get to() {
    return this.from + this._tree.length;
  }
  nextChild(i2, dir, pos, side, mode2 = 0) {
    for (let parent = this; ;) {
      for (
        let { children: children2, positions } = parent._tree, e2 = dir > 0 ? children2.length : -1;
        i2 != e2;
        i2 += dir
      ) {
        let next2 = children2[i2],
          start2 = positions[i2] + parent.from,
          mounted;
        if (
          !(
            mode2 & IterMode.EnterBracketed &&
            next2 instanceof Tree &&
            (mounted = MountedTree.get(next2)) &&
            !mounted.overlay &&
            mounted.bracketed &&
            pos >= start2 &&
            pos <= start2 + next2.length
          ) &&
          !checkSide(side, pos, start2, start2 + next2.length)
        )
          continue;
        if (next2 instanceof TreeBuffer) {
          if (mode2 & IterMode.ExcludeBuffers) continue;
          let index2 = next2.findChild(0, next2.buffer.length, dir, pos - start2, side);
          if (index2 > -1)
            return new BufferNode(new BufferContext(parent, next2, i2, start2), null, index2);
        } else if (
          mode2 & IterMode.IncludeAnonymous ||
          !next2.type.isAnonymous ||
          hasChild(next2)
        ) {
          let mounted2;
          if (
            !(mode2 & IterMode.IgnoreMounts) &&
            (mounted2 = MountedTree.get(next2)) &&
            !mounted2.overlay
          )
            return new TreeNode(mounted2.tree, start2, i2, parent);
          let inner = new TreeNode(next2, start2, i2, parent);
          return mode2 & IterMode.IncludeAnonymous || !inner.type.isAnonymous
            ? inner
            : inner.nextChild(dir < 0 ? next2.children.length - 1 : 0, dir, pos, side, mode2);
        }
      }
      if (mode2 & IterMode.IncludeAnonymous || !parent.type.isAnonymous) return null;
      if (parent.index >= 0) i2 = parent.index + dir;
      else i2 = dir < 0 ? -1 : parent._parent._tree.children.length;
      parent = parent._parent;
      if (!parent) return null;
    }
  }
  get firstChild() {
    return this.nextChild(
      0,
      1,
      0,
      4,
      /* Side.DontCare */
    );
  }
  get lastChild() {
    return this.nextChild(
      this._tree.children.length - 1,
      -1,
      0,
      4,
      /* Side.DontCare */
    );
  }
  childAfter(pos) {
    return this.nextChild(
      0,
      1,
      pos,
      2,
      /* Side.After */
    );
  }
  childBefore(pos) {
    return this.nextChild(
      this._tree.children.length - 1,
      -1,
      pos,
      -2,
      /* Side.Before */
    );
  }
  prop(prop) {
    return this._tree.prop(prop);
  }
  enter(pos, side, mode2 = 0) {
    let mounted;
    if (
      !(mode2 & IterMode.IgnoreOverlays) &&
      (mounted = MountedTree.get(this._tree)) &&
      mounted.overlay
    ) {
      let rPos = pos - this.from,
        enterBracketed = mode2 & IterMode.EnterBracketed && mounted.bracketed;
      for (let { from: from2, to } of mounted.overlay) {
        if (
          (side > 0 || enterBracketed ? from2 <= rPos : from2 < rPos) &&
          (side < 0 || enterBracketed ? to >= rPos : to > rPos)
        )
          return new TreeNode(mounted.tree, mounted.overlay[0].from + this.from, -1, this);
      }
    }
    return this.nextChild(0, 1, pos, side, mode2);
  }
  nextSignificantParent() {
    let val = this;
    while (val.type.isAnonymous && val._parent) val = val._parent;
    return val;
  }
  get parent() {
    return this._parent ? this._parent.nextSignificantParent() : null;
  }
  get nextSibling() {
    return this._parent && this.index >= 0
      ? this._parent.nextChild(
          this.index + 1,
          1,
          0,
          4,
          /* Side.DontCare */
        )
      : null;
  }
  get prevSibling() {
    return this._parent && this.index >= 0
      ? this._parent.nextChild(
          this.index - 1,
          -1,
          0,
          4,
          /* Side.DontCare */
        )
      : null;
  }
  get tree() {
    return this._tree;
  }
  toTree() {
    return this._tree;
  }
  /**
  @internal
  */
  toString() {
    return this._tree.toString();
  }
}
class BufferNode extends BaseNode {
  get name() {
    return this.type.name;
  }
  get from() {
    return this.context.start + this.context.buffer.buffer[this.index + 1];
  }
  get to() {
    return this.context.start + this.context.buffer.buffer[this.index + 2];
  }
  constructor(context, _parent, index2) {
    super();
    this.context = context;
    this._parent = _parent;
    this.index = index2;
    this.type = context.buffer.set.types[context.buffer.buffer[index2]];
  }
  child(dir, pos, side) {
    let { buffer } = this.context;
    let index2 = buffer.findChild(
      this.index + 4,
      buffer.buffer[this.index + 3],
      dir,
      pos - this.context.start,
      side,
    );
    return index2 < 0 ? null : new BufferNode(this.context, this, index2);
  }
  get firstChild() {
    return this.child(
      1,
      0,
      4,
      /* Side.DontCare */
    );
  }
  get lastChild() {
    return this.child(
      -1,
      0,
      4,
      /* Side.DontCare */
    );
  }
  childAfter(pos) {
    return this.child(
      1,
      pos,
      2,
      /* Side.After */
    );
  }
  childBefore(pos) {
    return this.child(
      -1,
      pos,
      -2,
      /* Side.Before */
    );
  }
  prop(prop) {
    return this.type.prop(prop);
  }
  enter(pos, side, mode2 = 0) {
    if (mode2 & IterMode.ExcludeBuffers) return null;
    let { buffer } = this.context;
    let index2 = buffer.findChild(
      this.index + 4,
      buffer.buffer[this.index + 3],
      side > 0 ? 1 : -1,
      pos - this.context.start,
      side,
    );
    return index2 < 0 ? null : new BufferNode(this.context, this, index2);
  }
  get parent() {
    return this._parent || this.context.parent.nextSignificantParent();
  }
  externalSibling(dir) {
    return this._parent
      ? null
      : this.context.parent.nextChild(
          this.context.index + dir,
          dir,
          0,
          4,
          /* Side.DontCare */
        );
  }
  get nextSibling() {
    let { buffer } = this.context;
    let after = buffer.buffer[this.index + 3];
    if (after < (this._parent ? buffer.buffer[this._parent.index + 3] : buffer.buffer.length))
      return new BufferNode(this.context, this._parent, after);
    return this.externalSibling(1);
  }
  get prevSibling() {
    let { buffer } = this.context;
    let parentStart = this._parent ? this._parent.index + 4 : 0;
    if (this.index == parentStart) return this.externalSibling(-1);
    return new BufferNode(
      this.context,
      this._parent,
      buffer.findChild(
        parentStart,
        this.index,
        -1,
        0,
        4,
        /* Side.DontCare */
      ),
    );
  }
  get tree() {
    return null;
  }
  toTree() {
    let children2 = [],
      positions = [];
    let { buffer } = this.context;
    let startI = this.index + 4,
      endI = buffer.buffer[this.index + 3];
    if (endI > startI) {
      let from2 = buffer.buffer[this.index + 1];
      children2.push(buffer.slice(startI, endI, from2));
      positions.push(0);
    }
    return new Tree(this.type, children2, positions, this.to - this.from);
  }
  /**
  @internal
  */
  toString() {
    return this.context.buffer.childString(this.index);
  }
}
function iterStack(heads) {
  if (!heads.length) return null;
  let pick = 0,
    picked = heads[0];
  for (let i2 = 1; i2 < heads.length; i2++) {
    let node2 = heads[i2];
    if (node2.from > picked.from || node2.to < picked.to) {
      picked = node2;
      pick = i2;
    }
  }
  let next2 = picked instanceof TreeNode && picked.index < 0 ? null : picked.parent;
  let newHeads = heads.slice();
  if (next2) newHeads[pick] = next2;
  else newHeads.splice(pick, 1);
  return new StackIterator(newHeads, picked);
}
class StackIterator {
  constructor(heads, node2) {
    this.heads = heads;
    this.node = node2;
  }
  get next() {
    return iterStack(this.heads);
  }
}
function hasChild(tree) {
  return tree.children.some(
    (ch) => ch instanceof TreeBuffer || !ch.type.isAnonymous || hasChild(ch),
  );
}
export function styleTags(spec) {
  let byName = Object.create(null);
  for (let prop in spec) {
    let tags2 = spec[prop];
    if (!Array.isArray(tags2)) tags2 = [tags2];
    for (let part of prop.split(" "))
      if (part) {
        let pieces = [],
          mode2 = 2,
          rest = part;
        for (let pos = 0; ;) {
          if (rest == "..." && pos > 0 && pos + 3 == part.length) {
            mode2 = 1;
            break;
          }
          let m3 = /^"(?:[^"\\]|\\.)*?"|[^\/!]+/.exec(rest);
          if (!m3) throw new RangeError("Invalid path: " + part);
          pieces.push(m3[0] == "*" ? "" : m3[0][0] == '"' ? JSON.parse(m3[0]) : m3[0]);
          pos += m3[0].length;
          if (pos == part.length) break;
          let next2 = part[pos++];
          if (pos == part.length && next2 == "!") {
            mode2 = 0;
            break;
          }
          if (next2 != "/") throw new RangeError("Invalid path: " + part);
          rest = part.slice(pos);
        }
        let last2 = pieces.length - 1,
          inner = pieces[last2];
        if (!inner) throw new RangeError("Invalid path: " + part);
        let rule = new Rule$1(tags2, mode2, last2 > 0 ? pieces.slice(0, last2) : null);
        byName[inner] = rule.sort(byName[inner]);
      }
  }
  return ruleNodeProp.add(byName);
}
const ruleNodeProp = new NodeProp({
  combine(a2, b3) {
    let cur, root2, take;
    while (a2 || b3) {
      if (!a2 || (b3 && a2.depth >= b3.depth)) {
        take = b3;
        b3 = b3.next;
      } else {
        take = a2;
        a2 = a2.next;
      }
      if (cur && cur.mode == take.mode && !take.context && !cur.context) continue;
      let copy2 = new Rule$1(take.tags, take.mode, take.context);
      if (cur) cur.next = copy2;
      else root2 = copy2;
      cur = copy2;
    }
    return root2;
  },
});
function highlightTree(tree, highlighter, putStyle, from2 = 0, to = tree.length) {
  let builder = new HighlightBuilder(
    from2,
    Array.isArray(highlighter) ? highlighter : [highlighter],
    putStyle,
  );
  builder.highlightRange(tree.cursor(), from2, to, "", builder.highlighters);
  builder.flush(to);
}
class HighlightBuilder {
  constructor(at2, highlighters, span) {
    this.at = at2;
    this.highlighters = highlighters;
    this.span = span;
    this.class = "";
  }
  startSpan(at2, cls) {
    if (cls != this.class) {
      this.flush(at2);
      if (at2 > this.at) this.at = at2;
      this.class = cls;
    }
  }
  flush(to) {
    if (to > this.at && this.class) this.span(this.at, to, this.class);
  }
  highlightRange(cursor, from2, to, inheritedClass, highlighters) {
    let { type: type2, from: start2, to: end2 } = cursor;
    if (start2 >= to || end2 <= from2) return;
    if (type2.isTop) highlighters = this.highlighters.filter((h2) => !h2.scope || h2.scope(type2));
    let cls = inheritedClass;
    let rule = getStyleTags(cursor) || Rule$1.empty;
    let tagCls = highlightTags(highlighters, rule.tags);
    if (tagCls) {
      if (cls) cls += " ";
      cls += tagCls;
      if (rule.mode == 1) inheritedClass += (inheritedClass ? " " : "") + tagCls;
    }
    this.startSpan(Math.max(from2, start2), cls);
    if (rule.opaque) return;
    let mounted = cursor.tree && cursor.tree.prop(NodeProp.mounted);
    if (mounted && mounted.overlay) {
      let inner = cursor.node.enter(mounted.overlay[0].from + start2, 1);
      let innerHighlighters = this.highlighters.filter(
        (h2) => !h2.scope || h2.scope(mounted.tree.type),
      );
      let hasChild2 = cursor.firstChild();
      for (let i2 = 0, pos = start2; ; i2++) {
        let next2 = i2 < mounted.overlay.length ? mounted.overlay[i2] : null;
        let nextPos = next2 ? next2.from + start2 : end2;
        let rangeFrom2 = Math.max(from2, pos),
          rangeTo2 = Math.min(to, nextPos);
        if (rangeFrom2 < rangeTo2 && hasChild2) {
          while (cursor.from < rangeTo2) {
            this.highlightRange(cursor, rangeFrom2, rangeTo2, inheritedClass, highlighters);
            this.startSpan(Math.min(rangeTo2, cursor.to), cls);
            if (cursor.to >= nextPos || !cursor.nextSibling()) break;
          }
        }
        if (!next2 || nextPos > to) break;
        pos = next2.to + start2;
        if (pos > from2) {
          this.highlightRange(
            inner.cursor(),
            Math.max(from2, next2.from + start2),
            Math.min(to, pos),
            "",
            innerHighlighters,
          );
          this.startSpan(Math.min(to, pos), cls);
        }
      }
      if (hasChild2) cursor.parent();
    } else if (cursor.firstChild()) {
      if (mounted) inheritedClass = "";
      do {
        if (cursor.to <= from2) continue;
        if (cursor.from >= to) break;
        this.highlightRange(cursor, from2, to, inheritedClass, highlighters);
        this.startSpan(Math.min(to, cursor.to), cls);
      } while (cursor.nextSibling());
      cursor.parent();
    }
  }
}
function getStyleTags(node2) {
  let rule = node2.type.prop(ruleNodeProp);
  while (rule && rule.context && !node2.matchContext(rule.context)) rule = rule.next;
  return rule || null;
}
export const languageDataProp = new NodeProp();
export const sublanguageProp = new NodeProp();
export class Language {
  /**
  Construct a language object. If you need to invoke this
  directly, first define a data facet with
  [`defineLanguageFacet`](https://codemirror.net/6/docs/ref/#language.defineLanguageFacet), and then
  configure your parser to [attach](https://codemirror.net/6/docs/ref/#language.languageDataProp) it
  to the language's outer syntax node.
  */
  constructor(data2, parser2, extraExtensions = [], name2 = "") {
    this.data = data2;
    this.name = name2;
    if (!EditorState2.prototype.hasOwnProperty("tree"))
      Object.defineProperty(EditorState2.prototype, "tree", {
        get() {
          return syntaxTree(this);
        },
      });
    this.parser = parser2;
    this.extension = [
      language.of(this),
      EditorState2.languageData.of((state2, pos, side) => {
        let top2 = topNodeAt(state2, pos, side),
          data3 = top2.type.prop(languageDataProp);
        if (!data3) return [];
        let base2 = state2.facet(data3),
          sub = top2.type.prop(sublanguageProp);
        if (sub) {
          let innerNode = top2.resolve(pos - top2.from, side);
          for (let sublang of sub)
            if (sublang.test(innerNode, state2)) {
              let data4 = state2.facet(sublang.facet);
              return sublang.type == "replace" ? data4 : data4.concat(base2);
            }
        }
        return base2;
      }),
    ].concat(extraExtensions);
  }
  /**
  Query whether this language is active at the given position.
  */
  isActiveAt(state2, pos, side = -1) {
    return topNodeAt(state2, pos, side).type.prop(languageDataProp) == this.data;
  }
  /**
  Find the document regions that were parsed using this language.
  The returned regions will _include_ any nested languages rooted
  in this language, when those exist.
  */
  findRegions(state2) {
    let lang = state2.facet(language);
    if ((lang === null || lang === void 0 ? void 0 : lang.data) == this.data)
      return [
        {
          from: 0,
          to: state2.doc.length,
        },
      ];
    if (!lang || !lang.allowsNesting) return [];
    let result = [];
    let explore = (tree, from2) => {
      if (tree.prop(languageDataProp) == this.data) {
        result.push({
          from: from2,
          to: from2 + tree.length,
        });
        return;
      }
      let mount = tree.prop(NodeProp.mounted);
      if (mount) {
        if (mount.tree.prop(languageDataProp) == this.data) {
          if (mount.overlay)
            for (let r2 of mount.overlay)
              result.push({
                from: r2.from + from2,
                to: r2.to + from2,
              });
          else
            result.push({
              from: from2,
              to: from2 + tree.length,
            });
          return;
        } else if (mount.overlay) {
          let size2 = result.length;
          explore(mount.tree, mount.overlay[0].from + from2);
          if (result.length > size2) return;
        }
      }
      for (let i2 = 0; i2 < tree.children.length; i2++) {
        let ch = tree.children[i2];
        if (ch instanceof Tree) explore(ch, tree.positions[i2] + from2);
      }
    };
    explore(syntaxTree(state2), 0);
    return result;
  }
  /**
  Indicates whether this language allows nested languages. The
  default implementation returns true.
  */
  get allowsNesting() {
    return true;
  }
}
Language.setState = StateEffect.define();
function topNodeAt(state2, pos, side) {
  let topLang = state2.facet(language),
    tree = syntaxTree(state2).topNode;
  if (!topLang || topLang.allowsNesting) {
    for (
      let node2 = tree;
      node2;
      node2 = node2.enter(pos, side, IterMode.ExcludeBuffers | IterMode.EnterBracketed)
    )
      if (node2.type.isTop) tree = node2;
  }
  return tree;
}
export class LRLanguage extends Language {
  constructor(data2, parser2, name2) {
    super(data2, parser2, [], name2);
    this.parser = parser2;
  }
  /**
  Define a language from a parser.
  */
  static define(spec) {
    let data2 = defineLanguageFacet(spec.languageData);
    return new LRLanguage(
      data2,
      spec.parser.configure({
        props: [languageDataProp.add((type2) => (type2.isTop ? data2 : void 0))],
      }),
      spec.name,
    );
  }
  /**
  Create a new instance of this language with a reconfigured
  version of its parser and optionally a new name.
  */
  configure(options, name2) {
    return new LRLanguage(this.data, this.parser.configure(options), name2 || this.name);
  }
  get allowsNesting() {
    return this.parser.hasWrappers();
  }
}
export function syntaxTree(state2) {
  let field = state2.field(Language.state, false);
  return field ? field.tree : Tree.empty;
}
let currentContext = null;
export class ParseContext2 {
  constructor(parser2, state2, fragments = [], tree, treeLen, viewport, skipped, scheduleOn) {
    this.parser = parser2;
    this.state = state2;
    this.fragments = fragments;
    this.tree = tree;
    this.treeLen = treeLen;
    this.viewport = viewport;
    this.skipped = skipped;
    this.scheduleOn = scheduleOn;
    this.parse = null;
    this.tempSkipped = [];
  }
  /**
  @internal
  */
  static create(parser2, state2, viewport) {
    return new ParseContext2(parser2, state2, [], Tree.empty, 0, viewport, [], null);
  }
  startParse() {
    return this.parser.startParse(new DocInput(this.state.doc), this.fragments);
  }
  /**
  @internal
  */
  work(until, upto) {
    if (upto != null && upto >= this.state.doc.length) upto = void 0;
    if (
      this.tree != Tree.empty &&
      this.isDone(upto !== null && upto !== void 0 ? upto : this.state.doc.length)
    ) {
      this.takeTree();
      return true;
    }
    return this.withContext(() => {
      var _a2;
      if (typeof until == "number") {
        let endTime = Date.now() + until;
        until = () => Date.now() > endTime;
      }
      if (!this.parse) this.parse = this.startParse();
      if (
        upto != null &&
        (this.parse.stoppedAt == null || this.parse.stoppedAt > upto) &&
        upto < this.state.doc.length
      )
        this.parse.stopAt(upto);
      for (;;) {
        let done = this.parse.advance();
        if (done) {
          this.fragments = this.withoutTempSkipped(
            TreeFragment.addTree(done, this.fragments, this.parse.stoppedAt != null),
          );
          this.treeLen =
            (_a2 = this.parse.stoppedAt) !== null && _a2 !== void 0 ? _a2 : this.state.doc.length;
          this.tree = done;
          this.parse = null;
          if (this.treeLen < (upto !== null && upto !== void 0 ? upto : this.state.doc.length))
            this.parse = this.startParse();
          else return true;
        }
        if (until()) return false;
      }
    });
  }
  /**
  @internal
  */
  takeTree() {
    let pos, tree;
    if (this.parse && (pos = this.parse.parsedPos) >= this.treeLen) {
      if (this.parse.stoppedAt == null || this.parse.stoppedAt > pos) this.parse.stopAt(pos);
      this.withContext(() => {
        while (!(tree = this.parse.advance())) {}
      });
      this.treeLen = pos;
      this.tree = tree;
      this.fragments = this.withoutTempSkipped(
        TreeFragment.addTree(this.tree, this.fragments, true),
      );
      this.parse = null;
    }
  }
  withContext(f2) {
    let prev = currentContext;
    currentContext = this;
    try {
      return f2();
    } finally {
      currentContext = prev;
    }
  }
  withoutTempSkipped(fragments) {
    for (let r2; (r2 = this.tempSkipped.pop());)
      fragments = cutFragments(fragments, r2.from, r2.to);
    return fragments;
  }
  /**
  @internal
  */
  changes(changes, newState) {
    let { fragments, tree, treeLen, viewport, skipped } = this;
    this.takeTree();
    if (!changes.empty) {
      let ranges = [];
      changes.iterChangedRanges((fromA, toA, fromB, toB) =>
        ranges.push({
          fromA,
          toA,
          fromB,
          toB,
        }),
      );
      fragments = TreeFragment.applyChanges(fragments, ranges);
      tree = Tree.empty;
      treeLen = 0;
      viewport = {
        from: changes.mapPos(viewport.from, -1),
        to: changes.mapPos(viewport.to, 1),
      };
      if (this.skipped.length) {
        skipped = [];
        for (let r2 of this.skipped) {
          let from2 = changes.mapPos(r2.from, 1),
            to = changes.mapPos(r2.to, -1);
          if (from2 < to)
            skipped.push({
              from: from2,
              to,
            });
        }
      }
    }
    return new ParseContext2(
      this.parser,
      newState,
      fragments,
      tree,
      treeLen,
      viewport,
      skipped,
      this.scheduleOn,
    );
  }
  /**
  @internal
  */
  updateViewport(viewport) {
    if (this.viewport.from == viewport.from && this.viewport.to == viewport.to) return false;
    this.viewport = viewport;
    let startLen = this.skipped.length;
    for (let i2 = 0; i2 < this.skipped.length; i2++) {
      let { from: from2, to } = this.skipped[i2];
      if (from2 < viewport.to && to > viewport.from) {
        this.fragments = cutFragments(this.fragments, from2, to);
        this.skipped.splice(i2--, 1);
      }
    }
    if (this.skipped.length >= startLen) return false;
    this.reset();
    return true;
  }
  /**
  @internal
  */
  reset() {
    if (this.parse) {
      this.takeTree();
      this.parse = null;
    }
  }
  /**
  Notify the parse scheduler that the given region was skipped
  because it wasn't in view, and the parse should be restarted
  when it comes into view.
  */
  skipUntilInView(from2, to) {
    this.skipped.push({
      from: from2,
      to,
    });
  }
  /**
  Returns a parser intended to be used as placeholder when
  asynchronously loading a nested parser. It'll skip its input and
  mark it as not-really-parsed, so that the next update will parse
  it again.
  
  When `until` is given, a reparse will be scheduled when that
  promise resolves.
  */
  static getSkippingParser(until) {
    return new (class extends Parser$1 {
      createParse(input, fragments, ranges) {
        let from2 = ranges[0].from,
          to = ranges[ranges.length - 1].to;
        let parser2 = {
          parsedPos: from2,
          advance() {
            let cx2 = currentContext;
            if (cx2) {
              for (let r2 of ranges) cx2.tempSkipped.push(r2);
              if (until)
                cx2.scheduleOn = cx2.scheduleOn ? Promise.all([cx2.scheduleOn, until]) : until;
            }
            this.parsedPos = to;
            return new Tree(NodeType3.none, [], [], to - from2);
          },
          stoppedAt: null,
          stopAt() {},
        };
        return parser2;
      }
    })();
  }
  /**
  @internal
  */
  isDone(upto) {
    upto = Math.min(upto, this.state.doc.length);
    let frags = this.fragments;
    return this.treeLen >= upto && frags.length && frags[0].from == 0 && frags[0].to >= upto;
  }
  /**
  Get the context for the current parse, or `null` if no editor
  parse is in progress.
  */
  static get() {
    return currentContext;
  }
}
class LanguageState {
  constructor(context) {
    this.context = context;
    this.tree = context.tree;
  }
  apply(tr2) {
    if (!tr2.docChanged && this.tree == this.context.tree) return this;
    let newCx = this.context.changes(tr2.changes, tr2.state);
    let upto =
      this.context.treeLen == tr2.startState.doc.length
        ? void 0
        : Math.max(tr2.changes.mapPos(this.context.treeLen), newCx.viewport.to);
    if (!newCx.work(20, upto)) newCx.takeTree();
    return new LanguageState(newCx);
  }
  static init(state2) {
    let vpTo = Math.min(3e3, state2.doc.length);
    let parseState = ParseContext2.create(state2.facet(language).parser, state2, {
      from: 0,
      to: vpTo,
    });
    if (!parseState.work(20, vpTo)) parseState.takeTree();
    return new LanguageState(parseState);
  }
}
Language.state = StateField.define({
  create: LanguageState.init,
  update(value, tr2) {
    for (let e2 of tr2.effects) if (e2.is(Language.setState)) return e2.value;
    if (tr2.startState.facet(language) != tr2.state.facet(language))
      return LanguageState.init(tr2.state);
    return value.apply(tr2);
  },
});
const parseWorker = ViewPlugin.fromClass(
  class ParseWorker {
    constructor(view2) {
      this.view = view2;
      this.working = null;
      this.workScheduled = 0;
      this.chunkEnd = -1;
      this.chunkBudget = -1;
      this.work = this.work.bind(this);
      this.scheduleWork();
    }
    update(update2) {
      let cx2 = this.view.state.field(Language.state).context;
      if (cx2.updateViewport(update2.view.viewport) || this.view.viewport.to > cx2.treeLen)
        this.scheduleWork();
      if (update2.docChanged || update2.selectionSet) {
        if (this.view.hasFocus) this.chunkBudget += 50;
        this.scheduleWork();
      }
      this.checkAsyncSchedule(cx2);
    }
    scheduleWork() {
      if (this.working) return;
      let { state: state2 } = this.view,
        field = state2.field(Language.state);
      if (field.tree != field.context.tree || !field.context.isDone(state2.doc.length))
        this.working = requestIdle(this.work);
    }
    work(deadline) {
      this.working = null;
      let now2 = Date.now();
      if (this.chunkEnd < now2 && (this.chunkEnd < 0 || this.view.hasFocus)) {
        this.chunkEnd = now2 + 3e4;
        this.chunkBudget = 3e3;
      }
      if (this.chunkBudget <= 0) return;
      let {
          state: state2,
          viewport: { to: vpTo },
        } = this.view,
        field = state2.field(Language.state);
      if (
        field.tree == field.context.tree &&
        field.context.isDone(
          vpTo + 1e5,
          /* Work.MaxParseAhead */
        )
      )
        return;
      let endTime =
        Date.now() +
        Math.min(
          this.chunkBudget,
          100,
          deadline && !isInputPending ? Math.max(25, deadline.timeRemaining() - 5) : 1e9,
        );
      let viewportFirst = field.context.treeLen < vpTo && state2.doc.length > vpTo + 1e3;
      let done = field.context.work(
        () => {
          return (isInputPending && isInputPending()) || Date.now() > endTime;
        },
        vpTo + (viewportFirst ? 0 : 1e5),
      );
      this.chunkBudget -= Date.now() - now2;
      if (done || this.chunkBudget <= 0) {
        field.context.takeTree();
        this.view.dispatch({
          effects: Language.setState.of(new LanguageState(field.context)),
        });
      }
      if (this.chunkBudget > 0 && !(done && !viewportFirst)) this.scheduleWork();
      this.checkAsyncSchedule(field.context);
    }
    checkAsyncSchedule(cx2) {
      if (cx2.scheduleOn) {
        this.workScheduled++;
        cx2.scheduleOn
          .then(() => this.scheduleWork())
          .catch((err) => logException(this.view.state, err))
          .then(() => this.workScheduled--);
        cx2.scheduleOn = null;
      }
    }
    destroy() {
      if (this.working) this.working();
    }
    isWorking() {
      return !!(this.working || this.workScheduled > 0);
    }
  },
  {
    eventHandlers: {
      focus() {
        this.scheduleWork();
      },
    },
  },
);
const language = Facet.define({
  combine(languages) {
    return languages.length ? languages[0] : null;
  },
  enables: (language2) => [
    Language.state,
    parseWorker,
    EditorView2.contentAttributes.compute([language2], (state2) => {
      let lang = state2.facet(language2);
      return lang && lang.name
        ? {
            "data-language": lang.name,
          }
        : {};
    }),
  ],
});
export function getIndentation(context, pos) {
  if (context instanceof EditorState2) context = new IndentContext(context);
  for (let service2 of context.state.facet(indentService)) {
    let result = service2(context, pos);
    if (result !== void 0) return result;
  }
  let tree = syntaxTree(context.state);
  return tree.length >= pos ? syntaxIndentation(context, tree, pos) : null;
}
export const indentNodeProp = new NodeProp();
function syntaxIndentation(cx2, ast, pos) {
  let stack = ast.resolveStack(pos);
  let inner = ast.resolveInner(pos, -1).resolve(pos, 0).enterUnfinishedNodesBefore(pos);
  if (inner != stack.node) {
    let add2 = [];
    for (
      let cur = inner;
      cur &&
      !(
        cur.from < stack.node.from ||
        cur.to > stack.node.to ||
        (cur.from == stack.node.from && cur.type == stack.node.type)
      );
      cur = cur.parent
    )
      add2.push(cur);
    for (let i2 = add2.length - 1; i2 >= 0; i2--)
      stack = {
        node: add2[i2],
        next: stack,
      };
  }
  return indentFor(stack, cx2, pos);
}
function indentFor(stack, cx2, pos) {
  for (let cur = stack; cur; cur = cur.next) {
    let strategy = indentStrategy(cur.node);
    if (strategy) return strategy(TreeIndentContext.create(cx2, pos, cur));
  }
  return 0;
}
function indentStrategy(tree) {
  let strategy = tree.type.prop(indentNodeProp);
  if (strategy) return strategy;
  let first2 = tree.firstChild,
    close2;
  if (first2 && (close2 = first2.type.prop(NodeProp.closedBy))) {
    let last2 = tree.lastChild,
      closed = last2 && close2.indexOf(last2.name) > -1;
    return (cx2) =>
      delimitedStrategy(cx2, true, 1, void 0, closed && !ignoreClosed(cx2) ? last2.from : void 0);
  }
  return tree.parent == null ? topIndent : null;
}
class TreeIndentContext extends IndentContext {
  constructor(base2, pos, context) {
    super(base2.state, base2.options);
    this.base = base2;
    this.pos = pos;
    this.context = context;
  }
  /**
  The syntax tree node to which the indentation strategy
  applies.
  */
  get node() {
    return this.context.node;
  }
  /**
  @internal
  */
  static create(base2, pos, context) {
    return new TreeIndentContext(base2, pos, context);
  }
  /**
  Get the text directly after `this.pos`, either the entire line
  or the next 100 characters, whichever is shorter.
  */
  get textAfter() {
    return this.textAfterPos(this.pos);
  }
  /**
  Get the indentation at the reference line for `this.node`, which
  is the line on which it starts, unless there is a node that is
  _not_ a parent of this node covering the start of that line. If
  so, the line at the start of that node is tried, again skipping
  on if it is covered by another such node.
  */
  get baseIndent() {
    return this.baseIndentFor(this.node);
  }
  /**
  Get the indentation for the reference line of the given node
  (see [`baseIndent`](https://codemirror.net/6/docs/ref/#language.TreeIndentContext.baseIndent)).
  */
  baseIndentFor(node2) {
    let line = this.state.doc.lineAt(node2.from);
    for (;;) {
      let atBreak = node2.resolve(line.from);
      while (atBreak.parent && atBreak.parent.from == atBreak.from) atBreak = atBreak.parent;
      if (isParent(atBreak, node2)) break;
      line = this.state.doc.lineAt(atBreak.from);
    }
    return this.lineIndent(line.from);
  }
  /**
  Continue looking for indentations in the node's parent nodes,
  and return the result of that.
  */
  continue() {
    return indentFor(this.context.next, this.base, this.pos);
  }
}
export const foldNodeProp = new NodeProp();
export class HighlightStyle {
  constructor(specs, options) {
    this.specs = specs;
    let modSpec;
    function def(spec) {
      let cls = StyleModule.newName();
      (modSpec || (modSpec = Object.create(null)))["." + cls] = spec;
      return cls;
    }
    const all2 =
      typeof options.all == "string" ? options.all : options.all ? def(options.all) : void 0;
    const scopeOpt = options.scope;
    this.scope =
      scopeOpt instanceof Language
        ? (type2) => type2.prop(languageDataProp) == scopeOpt.data
        : scopeOpt
          ? (type2) => type2 == scopeOpt
          : void 0;
    this.style = tagHighlighter(
      specs.map((style2) => ({
        tag: style2.tag,
        class:
          style2.class ||
          def(
            Object.assign({}, style2, {
              tag: null,
            }),
          ),
      })),
      {
        all: all2,
      },
    ).style;
    this.module = modSpec ? new StyleModule(modSpec) : null;
    this.themeType = options.themeType;
  }
  /**
  Create a highlighter style that associates the given styles to
  the given tags. The specs must be objects that hold a style tag
  or array of tags in their `tag` property, and either a single
  `class` property providing a static CSS class (for highlighter
  that rely on external styling), or a
  [`style-mod`](https://code.haverbeke.berlin/marijn/style-mod#documentation)-style
  set of CSS properties (which define the styling for those tags).
  
  The CSS rules created for a highlighter will be emitted in the
  order of the spec's properties. That means that for elements that
  have multiple tags associated with them, styles defined further
  down in the list will have a higher CSS precedence than styles
  defined earlier.
  */
  static define(specs, options) {
    return new HighlightStyle(specs, options || {});
  }
}
export function syntaxHighlighting(highlighter, options) {
  let ext = [treeHighlighter],
    themeType;
  if (highlighter instanceof HighlightStyle) {
    if (highlighter.module) ext.push(EditorView2.styleModule.of(highlighter.module));
    themeType = highlighter.themeType;
  }
  if (themeType)
    ext.push(
      highlighterFacet.computeN([EditorView2.darkTheme], (state2) => {
        return state2.facet(EditorView2.darkTheme) == (themeType == "dark") ? [highlighter] : [];
      }),
    );
  else ext.push(highlighterFacet.of(highlighter));
  return ext;
}
class TreeHighlighter {
  constructor(view2) {
    this.markCache = Object.create(null);
    this.tree = syntaxTree(view2.state);
    this.decorations = this.buildDeco(view2, getHighlighters(view2.state));
    this.decoratedTo = view2.viewport.to;
  }
  update(update2) {
    let tree = syntaxTree(update2.state),
      highlighters = getHighlighters(update2.state);
    let styleChange = highlighters != getHighlighters(update2.startState);
    let { viewport } = update2.view,
      decoratedToMapped = update2.changes.mapPos(this.decoratedTo, 1);
    if (
      tree.length < viewport.to &&
      !styleChange &&
      tree.type == this.tree.type &&
      decoratedToMapped >= viewport.to
    ) {
      this.decorations = this.decorations.map(update2.changes);
      this.decoratedTo = decoratedToMapped;
    } else if (tree != this.tree || update2.viewportChanged || styleChange) {
      this.tree = tree;
      this.decorations = this.buildDeco(update2.view, highlighters);
      this.decoratedTo = viewport.to;
    }
  }
  buildDeco(view2, highlighters) {
    if (!highlighters || !this.tree.length) return Decoration2.none;
    let builder = new RangeSetBuilder();
    for (let { from: from2, to } of view2.visibleRanges) {
      highlightTree(
        this.tree,
        highlighters,
        (from3, to2, style2) => {
          builder.add(
            from3,
            to2,
            this.markCache[style2] ||
              (this.markCache[style2] = Decoration2.mark({
                class: style2,
              })),
          );
        },
        from2,
        to,
      );
    }
    return builder.finish();
  }
}
const treeHighlighter = Prec.high(
  ViewPlugin.fromClass(TreeHighlighter, {
    decorations: (v2) => v2.decorations,
  }),
);
export const bracketMatchingHandle = new NodeProp();
function matchingNodes(node2, dir, brackets) {
  let byProp = node2.prop(dir < 0 ? NodeProp.openedBy : NodeProp.closedBy);
  if (byProp) return byProp;
  if (node2.name.length == 1) {
    let index2 = brackets.indexOf(node2.name);
    if (index2 > -1 && index2 % 2 == (dir < 0 ? 1 : 0)) return [brackets[index2 + dir]];
  }
  return null;
}
function findHandle(node2) {
  let hasHandle = node2.type.prop(bracketMatchingHandle);
  return hasHandle ? hasHandle(node2.node) : node2;
}
export function matchBrackets(state2, pos, dir, config2 = {}) {
  let maxScanDistance = config2.maxScanDistance || DefaultScanDist,
    brackets = config2.brackets || DefaultBrackets;
  let tree = syntaxTree(state2),
    node2 = tree.resolveInner(pos, dir);
  for (let cur = node2; cur; cur = cur.parent) {
    let matches2 = matchingNodes(cur.type, dir, brackets);
    if (matches2 && cur.from < cur.to) {
      let handle2 = findHandle(cur);
      if (
        handle2 &&
        (dir > 0
          ? pos >= handle2.from && pos < handle2.to
          : pos > handle2.from && pos <= handle2.to)
      )
        return matchMarkedBrackets(state2, pos, dir, cur, handle2, matches2, brackets);
    }
  }
  return matchPlainBrackets(state2, pos, dir, tree, node2.type, maxScanDistance, brackets);
}
function matchMarkedBrackets(_state, _pos, dir, token2, handle2, matching, brackets) {
  let parent = token2.parent,
    firstToken = {
      from: handle2.from,
      to: handle2.to,
    };
  let depth2 = 0,
    cursor = parent === null || parent === void 0 ? void 0 : parent.cursor();
  if (cursor && (dir < 0 ? cursor.childBefore(token2.from) : cursor.childAfter(token2.to)))
    do {
      if (dir < 0 ? cursor.to <= token2.from : cursor.from >= token2.to) {
        if (depth2 == 0 && matching.indexOf(cursor.type.name) > -1 && cursor.from < cursor.to) {
          let endHandle = findHandle(cursor);
          return {
            start: firstToken,
            end: endHandle
              ? {
                  from: endHandle.from,
                  to: endHandle.to,
                }
              : void 0,
            matched: true,
          };
        } else if (matchingNodes(cursor.type, dir, brackets)) {
          depth2++;
        } else if (matchingNodes(cursor.type, -dir, brackets)) {
          if (depth2 == 0) {
            let endHandle = findHandle(cursor);
            return {
              start: firstToken,
              end:
                endHandle && endHandle.from < endHandle.to
                  ? {
                      from: endHandle.from,
                      to: endHandle.to,
                    }
                  : void 0,
              matched: false,
            };
          }
          depth2--;
        }
      }
    } while (dir < 0 ? cursor.prevSibling() : cursor.nextSibling());
  return {
    start: firstToken,
    matched: false,
  };
}
const typeArray = [NodeType3.none];
const defaultTable = Object.create(null);
for (let [legacyName, name2] of [
  ["variable", "variableName"],
  ["variable-2", "variableName.special"],
  ["string-2", "string.special"],
  ["def", "variableName.definition"],
  ["tag", "tagName"],
  ["attribute", "attributeName"],
  ["type", "typeName"],
  ["builtin", "variableName.standard"],
  ["qualifier", "modifier"],
  ["error", "invalid"],
  ["header", "heading"],
  ["property", "propertyName"],
])
  defaultTable[legacyName] = createTokenType(noTokens, name2);
function createTokenType(extra, tagStr) {
  let tags$1$1 = [];
  for (let name3 of tagStr.split(" ")) {
    let found2 = [];
    for (let part of name3.split(".")) {
      let value = extra[part] || tags$1[part];
      if (!value) {
        warnForPart(part, `Unknown highlighting tag ${part}`);
      } else if (typeof value == "function") {
        if (!found2.length) warnForPart(part, `Modifier ${part} used at start of tag`);
        else found2 = found2.map(value);
      } else {
        if (found2.length) warnForPart(part, `Tag ${part} used as modifier`);
        else found2 = Array.isArray(value) ? value : [value];
      }
    }
    for (let tag of found2) tags$1$1.push(tag);
  }
  if (!tags$1$1.length) return 0;
  let name2 = tagStr.replace(/ /g, "_"),
    key2 = name2 + " " + tags$1$1.map((t2) => t2.id);
  let known = byTag[key2];
  if (known) return known.id;
  let type2 = (byTag[key2] = NodeType3.define({
    id: typeArray.length,
    name: name2,
    props: [
      styleTags({
        [name2]: tags$1$1,
      }),
    ],
  }));
  typeArray.push(type2);
  return type2.id;
}
