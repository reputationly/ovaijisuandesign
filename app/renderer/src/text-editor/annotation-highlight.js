// annotation-highlight.js
import {
  Extension,
  commands_exports,
  Step,
  StepResult,
  StepMap,
  PluginKey,
  Plugin,
  DecorationSet,
  Decoration$1,
  TextSelection,
  flatten,
  StateField,
  sameArray$1,
  dynamicFacetSlot,
  charType,
} from "../vendor.js";
import { MarkdownManager, assumeContentType } from "./markdown-manager.js";
export const Markdown = Extension.create({
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
        if (!(options === null || options === void 0 ? void 0 : options.contentType))
          return commands_exports.setContent(content2, options);
        if (
          assumeContentType(
            content2,
            options === null || options === void 0 ? void 0 : options.contentType,
          ) !== "markdown" ||
          !this.editor.markdown
        )
          return commands_exports.setContent(content2, options);
        const mdContent = this.editor.markdown.parse(content2);
        return commands_exports.setContent(mdContent, options);
      },
      insertContent: (value, options) => {
        if (!(options === null || options === void 0 ? void 0 : options.contentType))
          return commands_exports.insertContent(value, options);
        if (
          assumeContentType(
            value,
            options === null || options === void 0 ? void 0 : options.contentType,
          ) !== "markdown" ||
          !this.editor.markdown
        )
          return commands_exports.insertContent(value, options);
        const mdContent = this.editor.markdown.parse(value);
        return commands_exports.insertContent(mdContent, options);
      },
      insertContentAt: (position2, value, options) => {
        if (!(options === null || options === void 0 ? void 0 : options.contentType))
          return commands_exports.insertContentAt(position2, value, options);
        if (
          assumeContentType(
            value,
            options === null || options === void 0 ? void 0 : options.contentType,
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
      assumeContentType(this.editor.options.content, this.editor.options.contentType) !== "markdown"
    )
      return;
    if (!this.editor.markdown)
      throw new Error(
        '[tiptap][markdown]: The `contentType` option is set to "markdown", but the Markdown extension is not added to the editor. Please add the Markdown extension to use this feature.',
      );
    if (this.editor.options.content === void 0 || typeof this.editor.options.content !== "string")
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
function cloneSnapshot(snapshot2) {
  return {
    marks: snapshot2.marks.map((mark2) => ({
      ...mark2,
    })),
    comments: {
      ...snapshot2.comments,
    },
  };
}
export class AnnotationHistoryStep extends Step {
  before;
  after;
  constructor(before, after) {
    super();
    this.before = cloneSnapshot(before);
    this.after = cloneSnapshot(after);
  }
  apply(doc2) {
    return StepResult.ok(doc2);
  }
  getMap() {
    return StepMap.empty;
  }
  invert() {
    return new AnnotationHistoryStep(this.after, this.before);
  }
  map() {
    return this;
  }
  toJSON() {
    return {
      stepType: "canvasAnnotationHistory",
      before: this.before,
      after: this.after,
    };
  }
}
export function getAnnotationHistorySnapshot(transaction) {
  for (let index2 = transaction.steps.length - 1; index2 >= 0; index2 -= 1) {
    const step = transaction.steps[index2];
    if (step instanceof AnnotationHistoryStep) return step.after;
  }
  return null;
}
const ANNOTATION_CLASS = "canvas-annotation-mark";
const ANNOTATION_ACTIVE_CLASS = "canvas-annotation-mark-active";
const annotationPluginKey = new PluginKey("canvasAnnotation");
export const AnnotationHighlight = Extension.create({
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
                    activeId: next2.activeId === meta2.id ? null : next2.activeId,
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
              .filter((m3) => m3.from < m3.to && m3.to <= state2.doc.content.size)
              .map((m3) =>
                Decoration$1.inline(m3.from, m3.to, {
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
export function getAnnotationMarks(editor) {
  return annotationPluginKey.getState(editor.state)?.marks ?? [];
}
function dispatchMeta(editor, meta2) {
  editor.view.dispatch(editor.state.tr.setMeta(annotationPluginKey, meta2));
}
export function addAnnotationMark(editor, mark2) {
  dispatchMeta(editor, {
    kind: "add",
    mark: mark2,
  });
}
export function removeAnnotationMark(editor, id2) {
  dispatchMeta(editor, {
    kind: "remove",
    id: id2,
  });
}
export function clearAnnotationMarks(editor) {
  dispatchMeta(editor, {
    kind: "clear",
  });
}
export function setActiveAnnotationMark(editor, id2) {
  dispatchMeta(editor, {
    kind: "setActive",
    id: id2,
  });
}
export function getAnnotationSelectionRanges(selection2) {
  return selection2.ranges
    .map((range2) => ({
      from: range2.$from.pos,
      to: range2.$to.pos,
    }))
    .filter((range2) => range2.from < range2.to)
    .sort((a2, b3) => a2.from - b3.from || a2.to - b3.to);
}
export function createAnnotationCaretSelection(doc2, ranges) {
  const first2 = ranges[0];
  return first2 ? TextSelection.near(doc2.resolve(first2.to), -1) : null;
}
export function groupAnnotationRanges(items) {
  const byId = new Map();
  for (const item of orderByPosition(items)) {
    const ranges = byId.get(item.id);
    if (ranges) ranges.push(item);
    else byId.set(item.id, [item]);
  }
  return [...byId.entries()].map(([id2, ranges]) => ({
    id: id2,
    from: ranges[0].from,
    to: ranges[ranges.length - 1].to,
    ranges,
  }));
}
function rangesOverlap(a2, b3) {
  return a2.from < b3.to && b3.from < a2.to;
}
export function findConflictingIds(next2, existing, ignoreId) {
  const out = new Set();
  for (const a2 of existing) {
    if (rangesOverlap(next2, a2)) out.add(a2.id);
  }
  return [...out];
}
function orderByPosition(items) {
  return [...items].sort((a2, b3) => a2.from - b3.from || a2.to - b3.to);
}
export function buildQuote(text2, maxLen = 40) {
  const normalized = text2.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen)}…`;
}
const BLUR_SELECTION_CLASS = "canvas-blur-selection";
const blurSelectionPluginKey = new PluginKey("canvasBlurSelectionHighlight");
export const BlurSelectionHighlight = Extension.create({
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
                const tr2 = view2.state.tr.setMeta(blurSelectionPluginKey, false);
                if (!view2.state.selection.empty) {
                  tr2.setSelection(TextSelection.near(view2.state.selection.$head));
                }
                view2.dispatch(tr2);
              }
              return false;
            },
            blur(view2) {
              if (!blurSelectionPluginKey.getState(view2.state)) {
                view2.dispatch(view2.state.tr.setMeta(blurSelectionPluginKey, true));
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
                Decoration$1.inline(from2, to, {
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
export class Configuration2 {
  constructor(base2, compartments, dynamicSlots, address, staticValues, facets) {
    this.base = base2;
    this.compartments = compartments;
    this.dynamicSlots = dynamicSlots;
    this.address = address;
    this.staticValues = staticValues;
    this.facets = facets;
    this.statusTemplate = [];
    while (this.statusTemplate.length < dynamicSlots.length)
      this.statusTemplate.push(
        0,
        /* SlotStatus.Unresolved */
      );
  }
  staticFacet(facet) {
    let addr = this.address[facet.id];
    return addr == null ? facet.default : this.staticValues[addr >> 1];
  }
  static resolve(base2, compartments, oldState) {
    let fields = [];
    let facets = Object.create(null);
    let newCompartments = new Map();
    for (let ext of flatten(base2, compartments, newCompartments)) {
      if (ext instanceof StateField) fields.push(ext);
      else (facets[ext.facet.id] || (facets[ext.facet.id] = [])).push(ext);
    }
    let address = Object.create(null);
    let staticValues = [];
    let dynamicSlots = [];
    for (let field of fields) {
      address[field.id] = dynamicSlots.length << 1;
      dynamicSlots.push((a2) => field.slot(a2));
    }
    let oldFacets = oldState === null || oldState === void 0 ? void 0 : oldState.config.facets;
    for (let id2 in facets) {
      let providers = facets[id2],
        facet = providers[0].facet;
      let oldProviders = (oldFacets && oldFacets[id2]) || [];
      if (
        providers.every(
          (p3) => p3.type == 0,
          /* Provider.Static */
        )
      ) {
        address[facet.id] = (staticValues.length << 1) | 1;
        if (sameArray$1(oldProviders, providers)) {
          staticValues.push(oldState.facet(facet));
        } else {
          let value = facet.combine(providers.map((p3) => p3.value));
          staticValues.push(
            oldState && facet.compare(value, oldState.facet(facet)) ? oldState.facet(facet) : value,
          );
        }
      } else {
        for (let p3 of providers) {
          if (p3.type == 0) {
            address[p3.id] = (staticValues.length << 1) | 1;
            staticValues.push(p3.value);
          } else {
            address[p3.id] = dynamicSlots.length << 1;
            dynamicSlots.push((a2) => p3.dynamicSlot(a2));
          }
        }
        address[facet.id] = dynamicSlots.length << 1;
        dynamicSlots.push((a2) => dynamicFacetSlot(a2, facet, providers));
      }
    }
    let dynamic = dynamicSlots.map((f2) => f2(address));
    return new Configuration2(base2, newCompartments, dynamic, address, staticValues, facets);
  }
}
export function updateAttrs(dom, prev, attrs) {
  let changed = false;
  if (prev) {
    for (let name2 in prev)
      if (!(attrs && name2 in attrs)) {
        changed = true;
        if (name2 == "style") dom.style.cssText = "";
        else dom.removeAttribute(name2);
      }
  }
  if (attrs) {
    for (let name2 in attrs)
      if (!(prev && prev[name2] == attrs[name2])) {
        changed = true;
        if (name2 == "style") dom.style.cssText = attrs[name2];
        else dom.setAttribute(name2, attrs[name2]);
      }
  }
  return changed;
}
export const BidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac\ufb50-\ufdff]/;
export const types = [];
export function computeCharTypes(line, rFrom, rTo, isolates, outerType) {
  for (let iI = 0; iI <= isolates.length; iI++) {
    let from2 = iI ? isolates[iI - 1].to : rFrom,
      to = iI < isolates.length ? isolates[iI].from : rTo;
    let prevType = iI ? 256 : outerType;
    for (let i2 = from2, prev = prevType, prevStrong = prevType; i2 < to; i2++) {
      let type2 = charType(line.charCodeAt(i2));
      if (type2 == 512) type2 = prev;
      else if (type2 == 8 && prevStrong == 4) type2 = 16;
      types[i2] = type2 == 4 ? 2 : type2;
      if (type2 & 7) prevStrong = type2;
      prev = type2;
    }
    for (let i2 = from2, prev = prevType, prevStrong = prevType; i2 < to; i2++) {
      let type2 = types[i2];
      if (type2 == 128) {
        if (i2 < to - 1 && prev == types[i2 + 1] && prev & 24) type2 = types[i2] = prev;
        else types[i2] = 256;
      } else if (type2 == 64) {
        let end2 = i2 + 1;
        while (end2 < to && types[end2] == 64) end2++;
        let replace2 =
          (i2 && prev == 8) || (end2 < rTo && types[end2] == 8) ? (prevStrong == 1 ? 1 : 8) : 256;
        for (let j2 = i2; j2 < end2; j2++) types[j2] = replace2;
        i2 = end2 - 1;
      } else if (type2 == 8 && prevStrong == 1) {
        types[i2] = 1;
      }
      prev = type2;
      if (type2 & 7) prevStrong = type2;
    }
  }
}
