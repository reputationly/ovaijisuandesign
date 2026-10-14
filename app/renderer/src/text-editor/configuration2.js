// configuration2.js
import { PluginKey } from "prosemirror-state";
import { Step, StepMap, StepResult } from "prosemirror-transform";
function cloneSnapshot(snapshot) {
  return {
    marks: snapshot.marks.map((mark) => ({
      ...mark,
    })),
    comments: {
      ...snapshot.comments,
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
  apply(doc) {
    return StepResult.ok(doc);
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
  for (let index = transaction.steps.length - 1; index >= 0; index -= 1) {
    const step = transaction.steps[index];
    if (step instanceof AnnotationHistoryStep) return step.after;
  }
  return null;
}
export const annotationPluginKey = new PluginKey("canvasAnnotation");
export function getAnnotationMarks(editor) {
  return annotationPluginKey.getState(editor.state)?.marks ?? [];
}
export function getAnnotationSelectionRanges(selection) {
  return selection.ranges
    .map((range) => ({
      from: range.$from.pos,
      to: range.$to.pos,
    }))
    .filter((range) => range.from < range.to)
    .sort((a, b) => a.from - b.from || a.to - b.to);
}
export function updateAttrs(dom, prev, attrs) {
  let changed = false;
  if (prev) {
    for (let attrName in prev)
      if (!(attrs && attrName in attrs)) {
        changed = true;
        if (attrName == "style") dom.style.cssText = "";
        else dom.removeAttribute(attrName);
      }
  }
  if (attrs) {
    for (let attrName in attrs)
      if (!(prev && prev[attrName] == attrs[attrName])) {
        changed = true;
        if (attrName == "style") dom.style.cssText = attrs[attrName];
        else dom.setAttribute(attrName, attrs[attrName]);
      }
  }
  return changed;
}
export const BidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac\ufb50-\ufdff]/;
export const types = [];
