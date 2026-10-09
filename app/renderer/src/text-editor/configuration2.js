// configuration2.js
import {
  charType,
  dynamicFacetSlot,
  flatten,
  PluginKey,
  sameArray$1 as sameArray,
  StateField,
  Step,
  StepMap,
  StepResult,
} from "../vendor.js";
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
    .sort((a2, b3) => a2.from - b3.from || a2.to - b3.to);
}
export class Configuration2 {
  constructor(
    base2,
    compartments,
    dynamicSlots,
    address,
    staticValues,
    facets,
  ) {
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
    let oldFacets =
      oldState === null || oldState === void 0
        ? void 0
        : oldState.config.facets;
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
        if (sameArray(oldProviders, providers)) {
          staticValues.push(oldState.facet(facet));
        } else {
          let value = facet.combine(providers.map((p3) => p3.value));
          staticValues.push(
            oldState && facet.compare(value, oldState.facet(facet))
              ? oldState.facet(facet)
              : value,
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
    return new Configuration2(
      base2,
      newCompartments,
      dynamic,
      address,
      staticValues,
      facets,
    );
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
    for (
      let i2 = from2, prev = prevType, prevStrong = prevType;
      i2 < to;
      i2++
    ) {
      let type2 = charType(line.charCodeAt(i2));
      if (type2 == 512) type2 = prev;
      else if (type2 == 8 && prevStrong == 4) type2 = 16;
      types[i2] = type2 == 4 ? 2 : type2;
      if (type2 & 7) prevStrong = type2;
      prev = type2;
    }
    for (
      let i2 = from2, prev = prevType, prevStrong = prevType;
      i2 < to;
      i2++
    ) {
      let type2 = types[i2];
      if (type2 == 128) {
        if (i2 < to - 1 && prev == types[i2 + 1] && prev & 24)
          type2 = types[i2] = prev;
        else types[i2] = 256;
      } else if (type2 == 64) {
        let end2 = i2 + 1;
        while (end2 < to && types[end2] == 64) end2++;
        let replace2 =
          (i2 && prev == 8) || (end2 < rTo && types[end2] == 8)
            ? prevStrong == 1
              ? 1
              : 8
            : 256;
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
