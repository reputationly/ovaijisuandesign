// configuration2.js
import { PluginKey, Step, StepMap, StepResult } from "../vendor.js";
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
export const annotationPluginKey = new PluginKey("canvasAnnotation");
export function getAnnotationMarks(editor) {
  return annotationPluginKey.getState(editor.state)?.marks ?? [];
}
export function getAnnotationSelectionRanges(selection2) {
  return selection2.ranges
    .map((range2) => ({
      from: range2.$from.pos,
      to: range2.$to.pos,
    }))
    .filter((range2) => range2.from < range2.to)
    .sort((a, b) => a.from - b.from || a.to - b.to);
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
