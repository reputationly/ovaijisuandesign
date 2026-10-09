// line2.js
import {
  BidiSpan,
  Facet,
  StyleModule,
  browser,
  skipSpace,
  space$2,
  inList,
  Type,
  StartTag,
  StartSelfClosingTag,
  StartScriptTag,
  StartStyleTag,
  StartTextareaTag,
  ContextTracker,
  tagNameAfter,
  Element$1,
  OpenTag,
  LineComment,
  BlockComment,
  spaces,
  newline,
  ExternalTokenizer,
  braceR,
  insertSemi,
  Tags,
  GlobalAttrs,
  QueryType,
  regexpCursor,
  StateEffect,
  Decoration2,
  WidgetType2,
} from "../../vendor.js";
import { types } from "../../text-editor/configuration2.js";
export function processNeutrals(rFrom, rTo, isolates, outerType) {
  for (let iI = 0, prev = outerType; iI <= isolates.length; iI++) {
    let from2 = iI ? isolates[iI - 1].to : rFrom,
      to = iI < isolates.length ? isolates[iI].from : rTo;
    for (let i2 = from2; i2 < to;) {
      let type2 = types[i2];
      if (type2 == 256) {
        let end2 = i2 + 1;
        for (;;) {
          if (end2 == to) {
            if (iI == isolates.length) break;
            end2 = isolates[iI++].to;
            to = iI < isolates.length ? isolates[iI].from : rTo;
          } else if (types[end2] == 256) {
            end2++;
          } else {
            break;
          }
        }
        let beforeL = prev == 1;
        let afterL = (end2 < rTo ? types[end2] : outerType) == 1;
        let replace2 = beforeL == afterL ? (beforeL ? 1 : 2) : outerType;
        for (let j2 = end2, jI = iI, fromJ = jI ? isolates[jI - 1].to : rFrom; j2 > i2;) {
          if (j2 == fromJ) {
            j2 = isolates[--jI].from;
            fromJ = jI ? isolates[jI - 1].to : rFrom;
          }
          types[--j2] = replace2;
        }
        i2 = end2;
      } else {
        prev = type2;
        i2++;
      }
    }
  }
}
export function trivialOrder(length2) {
  return [new BidiSpan(0, length2, 0)];
}
export const mouseSelectionStyle = Facet.define();
export const updateListener = Facet.define();
export const perLineTextDirection = Facet.define({
  combine: (values3) => values3.some((x2) => x2),
});
export const theme = Facet.define({
  combine: (strs) => strs.join(" "),
});
export const darkTheme = Facet.define({
  combine: (values3) => values3.indexOf(true) > -1,
});
export const baseThemeID = StyleModule.newName();
export const baseLightID = StyleModule.newName();
export const baseDarkID = StyleModule.newName();
export const lightDarkIDs = {
  "&light": "." + baseLightID,
  "&dark": "." + baseDarkID,
};
export function buildTheme(main2, spec, scopes) {
  return new StyleModule(spec, {
    finish(sel) {
      return /&/.test(sel)
        ? sel.replace(/&\w*/, (m3) => {
            if (m3 == "&") return main2;
            if (!scopes || !scopes[m3]) throw new RangeError(`Unsupported selector: ${m3}`);
            return scopes[m3];
          })
        : main2 + " " + sel;
    },
  });
}
export const useCharData = browser.ie && browser.ie_version <= 11;
export const MaxBidiLine = 4096;
export const BadMeasure = {};
export const noProps = Object.create(null);
export const CachedNode = new WeakMap();
export const CachedInnerNode = new WeakMap();
export const DefaultScanDist = 1e4;
export const DefaultBrackets = "()[]{}";
export class Line2 {
  constructor() {
    this.text = "";
    this.baseIndent = 0;
    this.basePos = 0;
    this.depth = 0;
    this.markers = [];
    this.pos = 0;
    this.indent = 0;
    this.next = -1;
  }
  /**
  @internal
  */
  forward() {
    if (this.basePos > this.pos) this.forwardInner();
  }
  /**
  @internal
  */
  forwardInner() {
    let newPos = this.skipSpace(this.basePos);
    this.indent = this.countIndent(newPos, this.pos, this.indent);
    this.pos = newPos;
    this.next = newPos == this.text.length ? -1 : this.text.charCodeAt(newPos);
  }
  /**
  Skip whitespace after the given position, return the position of
  the next non-space character or the end of the line if there's
  only space after `from`.
  */
  skipSpace(from2) {
    return skipSpace(this.text, from2);
  }
  /**
  @internal
  */
  reset(text2) {
    this.text = text2;
    this.baseIndent = this.basePos = this.pos = this.indent = 0;
    this.forwardInner();
    this.depth = 1;
    while (this.markers.length) this.markers.pop();
  }
  /**
  Move the line's base position forward to the given position.
  This should only be called by composite [block
  parsers](#BlockParser.parse) or [markup skipping
  functions](#NodeSpec.composite).
  */
  moveBase(to) {
    this.basePos = to;
    this.baseIndent = this.countIndent(to, this.pos, this.indent);
  }
  /**
  Move the line's base position forward to the given _column_.
  */
  moveBaseColumn(indent2) {
    this.baseIndent = indent2;
    this.basePos = this.findColumn(indent2);
  }
  /**
  Store a composite-block-level marker. Should be called from
  [markup skipping functions](#NodeSpec.composite) when they
  consume any non-whitespace characters.
  */
  addMarker(elt2) {
    this.markers.push(elt2);
  }
  /**
  Find the column position at `to`, optionally starting at a given
  position and column.
  */
  countIndent(to, from2 = 0, indent2 = 0) {
    for (let i2 = from2; i2 < to; i2++)
      indent2 += this.text.charCodeAt(i2) == 9 ? 4 - (indent2 % 4) : 1;
    return indent2;
  }
  /**
  Find the position corresponding to the given column.
  */
  findColumn(goal) {
    let i2 = 0;
    for (let indent2 = 0; i2 < this.text.length && indent2 < goal; i2++)
      indent2 += this.text.charCodeAt(i2) == 9 ? 4 - (indent2 % 4) : 1;
    return i2;
  }
  /**
  @internal
  */
  scrub() {
    if (!this.baseIndent) return this.text;
    let result = "";
    for (let i2 = 0; i2 < this.basePos; i2++) result += " ";
    return result + this.text.slice(this.basePos);
  }
}
export function isFencedCode(line) {
  if (line.next != 96 && line.next != 126) return -1;
  let pos = line.pos + 1;
  while (pos < line.text.length && line.text.charCodeAt(pos) == line.next) pos++;
  if (pos < line.pos + 3) return -1;
  if (line.next == 96) {
    for (let i2 = pos; i2 < line.text.length; i2++) if (line.text.charCodeAt(i2) == 96) return -1;
  }
  return pos;
}
export function isOrderedList(line, cx2, breaking) {
  let pos = line.pos,
    next2 = line.next;
  for (;;) {
    if (next2 >= 48 && next2 <= 57) pos++;
    else break;
    if (pos == line.text.length) return -1;
    next2 = line.text.charCodeAt(pos);
  }
  if (
    pos == line.pos ||
    pos > line.pos + 9 ||
    (next2 != 46 && next2 != 41) ||
    (pos < line.text.length - 1 && !space$2(line.text.charCodeAt(pos + 1))) ||
    (breaking &&
      !inList(cx2, Type.OrderedList) &&
      (line.skipSpace(pos + 1) == line.text.length || pos > line.pos + 1 || line.next != 49))
  )
    return -1;
  return pos + 1 - line.pos;
}
export const EmphasisUnderscore = {
  resolve: "Emphasis",
  mark: "EmphasisMark",
};
export const EmphasisAsterisk = {
  resolve: "Emphasis",
  mark: "EmphasisMark",
};
export const LinkStart = {};
export const ImageStart = {};
export const Escapable = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
export function getSpecializer(spec) {
  if (spec.external) {
    let mask = spec.extend ? 1 : 0;
    return (value, stack) => (spec.external(value, stack) << 1) | mask;
  }
  return spec.get;
}
function ElementContext(name2, parent) {
  this.name = name2;
  this.parent = parent;
}
const startTagTerms = [
  StartTag,
  StartSelfClosingTag,
  StartScriptTag,
  StartStyleTag,
  StartTextareaTag,
];
export const elementContext = new ContextTracker({
  start: null,
  shift(context, term, stack, input) {
    return startTagTerms.indexOf(term) > -1
      ? new ElementContext(tagNameAfter(input, 1) || "", context)
      : context;
  },
  reduce(context, term) {
    return term == Element$1 && context ? context.parent : context;
  },
  reuse(context, node2, stack, input) {
    let type2 = node2.type.id;
    return type2 == StartTag || type2 == OpenTag
      ? new ElementContext(tagNameAfter(input, 1) || "", context)
      : context;
  },
  strict: false,
});
export const values2 = [
  "above",
  "absolute",
  "activeborder",
  "additive",
  "activecaption",
  "after-white-space",
  "ahead",
  "alias",
  "all",
  "all-scroll",
  "alphabetic",
  "alternate",
  "always",
  "antialiased",
  "appworkspace",
  "asterisks",
  "attr",
  "auto",
  "auto-flow",
  "avoid",
  "avoid-column",
  "avoid-page",
  "avoid-region",
  "axis-pan",
  "background",
  "backwards",
  "baseline",
  "below",
  "bidi-override",
  "blink",
  "block",
  "block-axis",
  "bold",
  "bolder",
  "border",
  "border-box",
  "both",
  "bottom",
  "break",
  "break-all",
  "break-word",
  "bullets",
  "button",
  "button-bevel",
  "buttonface",
  "buttonhighlight",
  "buttonshadow",
  "buttontext",
  "calc",
  "capitalize",
  "caps-lock-indicator",
  "caption",
  "captiontext",
  "caret",
  "cell",
  "center",
  "checkbox",
  "circle",
  "cjk-decimal",
  "clear",
  "clip",
  "close-quote",
  "col-resize",
  "collapse",
  "color",
  "color-burn",
  "color-dodge",
  "column",
  "column-reverse",
  "compact",
  "condensed",
  "contain",
  "content",
  "contents",
  "content-box",
  "context-menu",
  "continuous",
  "copy",
  "counter",
  "counters",
  "cover",
  "crop",
  "cross",
  "crosshair",
  "currentcolor",
  "cursive",
  "cyclic",
  "darken",
  "dashed",
  "decimal",
  "decimal-leading-zero",
  "default",
  "default-button",
  "dense",
  "destination-atop",
  "destination-in",
  "destination-out",
  "destination-over",
  "difference",
  "disc",
  "discard",
  "disclosure-closed",
  "disclosure-open",
  "document",
  "dot-dash",
  "dot-dot-dash",
  "dotted",
  "double",
  "down",
  "e-resize",
  "ease",
  "ease-in",
  "ease-in-out",
  "ease-out",
  "element",
  "ellipse",
  "ellipsis",
  "embed",
  "end",
  "ethiopic-abegede-gez",
  "ethiopic-halehame-aa-er",
  "ethiopic-halehame-gez",
  "ew-resize",
  "exclusion",
  "expanded",
  "extends",
  "extra-condensed",
  "extra-expanded",
  "fantasy",
  "fast",
  "fill",
  "fill-box",
  "fixed",
  "flat",
  "flex",
  "flex-end",
  "flex-start",
  "footnotes",
  "forwards",
  "from",
  "geometricPrecision",
  "graytext",
  "grid",
  "groove",
  "hand",
  "hard-light",
  "help",
  "hidden",
  "hide",
  "higher",
  "highlight",
  "highlighttext",
  "horizontal",
  "hsl",
  "hsla",
  "hue",
  "icon",
  "ignore",
  "inactiveborder",
  "inactivecaption",
  "inactivecaptiontext",
  "infinite",
  "infobackground",
  "infotext",
  "inherit",
  "initial",
  "inline",
  "inline-axis",
  "inline-block",
  "inline-flex",
  "inline-grid",
  "inline-table",
  "inset",
  "inside",
  "intrinsic",
  "invert",
  "italic",
  "justify",
  "keep-all",
  "landscape",
  "large",
  "larger",
  "left",
  "level",
  "lighter",
  "lighten",
  "line-through",
  "linear",
  "linear-gradient",
  "lines",
  "list-item",
  "listbox",
  "listitem",
  "local",
  "logical",
  "loud",
  "lower",
  "lower-hexadecimal",
  "lower-latin",
  "lower-norwegian",
  "lowercase",
  "ltr",
  "luminosity",
  "manipulation",
  "match",
  "matrix",
  "matrix3d",
  "medium",
  "menu",
  "menutext",
  "message-box",
  "middle",
  "min-intrinsic",
  "mix",
  "monospace",
  "move",
  "multiple",
  "multiple_mask_images",
  "multiply",
  "n-resize",
  "narrower",
  "ne-resize",
  "nesw-resize",
  "no-close-quote",
  "no-drop",
  "no-open-quote",
  "no-repeat",
  "none",
  "normal",
  "not-allowed",
  "nowrap",
  "ns-resize",
  "numbers",
  "numeric",
  "nw-resize",
  "nwse-resize",
  "oblique",
  "opacity",
  "open-quote",
  "optimizeLegibility",
  "optimizeSpeed",
  "outset",
  "outside",
  "outside-shape",
  "overlay",
  "overline",
  "padding",
  "padding-box",
  "painted",
  "page",
  "paused",
  "perspective",
  "pinch-zoom",
  "plus-darker",
  "plus-lighter",
  "pointer",
  "polygon",
  "portrait",
  "pre",
  "pre-line",
  "pre-wrap",
  "preserve-3d",
  "progress",
  "push-button",
  "radial-gradient",
  "radio",
  "read-only",
  "read-write",
  "read-write-plaintext-only",
  "rectangle",
  "region",
  "relative",
  "repeat",
  "repeating-linear-gradient",
  "repeating-radial-gradient",
  "repeat-x",
  "repeat-y",
  "reset",
  "reverse",
  "rgb",
  "rgba",
  "ridge",
  "right",
  "rotate",
  "rotate3d",
  "rotateX",
  "rotateY",
  "rotateZ",
  "round",
  "row",
  "row-resize",
  "row-reverse",
  "rtl",
  "run-in",
  "running",
  "s-resize",
  "sans-serif",
  "saturation",
  "scale",
  "scale3d",
  "scaleX",
  "scaleY",
  "scaleZ",
  "screen",
  "scroll",
  "scrollbar",
  "scroll-position",
  "se-resize",
  "self-start",
  "self-end",
  "semi-condensed",
  "semi-expanded",
  "separate",
  "serif",
  "show",
  "single",
  "skew",
  "skewX",
  "skewY",
  "skip-white-space",
  "slide",
  "slider-horizontal",
  "slider-vertical",
  "sliderthumb-horizontal",
  "sliderthumb-vertical",
  "slow",
  "small",
  "small-caps",
  "small-caption",
  "smaller",
  "soft-light",
  "solid",
  "source-atop",
  "source-in",
  "source-out",
  "source-over",
  "space",
  "space-around",
  "space-between",
  "space-evenly",
  "spell-out",
  "square",
  "start",
  "static",
  "status-bar",
  "stretch",
  "stroke",
  "stroke-box",
  "sub",
  "subpixel-antialiased",
  "svg_masks",
  "super",
  "sw-resize",
  "symbolic",
  "symbols",
  "system-ui",
  "table",
  "table-caption",
  "table-cell",
  "table-column",
  "table-column-group",
  "table-footer-group",
  "table-header-group",
  "table-row",
  "table-row-group",
  "text",
  "text-bottom",
  "text-top",
  "textarea",
  "textfield",
  "thick",
  "thin",
  "threeddarkshadow",
  "threedface",
  "threedhighlight",
  "threedlightshadow",
  "threedshadow",
  "to",
  "top",
  "transform",
  "translate",
  "translate3d",
  "translateX",
  "translateY",
  "translateZ",
  "transparent",
  "ultra-condensed",
  "ultra-expanded",
  "underline",
  "unidirectional-pan",
  "unset",
  "up",
  "upper-latin",
  "uppercase",
  "url",
  "var",
  "vertical",
  "vertical-text",
  "view-box",
  "visible",
  "visibleFill",
  "visiblePainted",
  "visibleStroke",
  "visual",
  "w-resize",
  "wait",
  "wave",
  "wider",
  "window",
  "windowframe",
  "windowtext",
  "words",
  "wrap",
  "wrap-reverse",
  "x-large",
  "x-small",
  "xor",
  "xx-large",
  "xx-small",
]
  .map((name2) => ({
    type: "keyword",
    label: name2,
  }))
  .concat(
    [
      "aliceblue",
      "antiquewhite",
      "aqua",
      "aquamarine",
      "azure",
      "beige",
      "bisque",
      "black",
      "blanchedalmond",
      "blue",
      "blueviolet",
      "brown",
      "burlywood",
      "cadetblue",
      "chartreuse",
      "chocolate",
      "coral",
      "cornflowerblue",
      "cornsilk",
      "crimson",
      "cyan",
      "darkblue",
      "darkcyan",
      "darkgoldenrod",
      "darkgray",
      "darkgreen",
      "darkkhaki",
      "darkmagenta",
      "darkolivegreen",
      "darkorange",
      "darkorchid",
      "darkred",
      "darksalmon",
      "darkseagreen",
      "darkslateblue",
      "darkslategray",
      "darkturquoise",
      "darkviolet",
      "deeppink",
      "deepskyblue",
      "dimgray",
      "dodgerblue",
      "firebrick",
      "floralwhite",
      "forestgreen",
      "fuchsia",
      "gainsboro",
      "ghostwhite",
      "gold",
      "goldenrod",
      "gray",
      "grey",
      "green",
      "greenyellow",
      "honeydew",
      "hotpink",
      "indianred",
      "indigo",
      "ivory",
      "khaki",
      "lavender",
      "lavenderblush",
      "lawngreen",
      "lemonchiffon",
      "lightblue",
      "lightcoral",
      "lightcyan",
      "lightgoldenrodyellow",
      "lightgray",
      "lightgreen",
      "lightpink",
      "lightsalmon",
      "lightseagreen",
      "lightskyblue",
      "lightslategray",
      "lightsteelblue",
      "lightyellow",
      "lime",
      "limegreen",
      "linen",
      "magenta",
      "maroon",
      "mediumaquamarine",
      "mediumblue",
      "mediumorchid",
      "mediumpurple",
      "mediumseagreen",
      "mediumslateblue",
      "mediumspringgreen",
      "mediumturquoise",
      "mediumvioletred",
      "midnightblue",
      "mintcream",
      "mistyrose",
      "moccasin",
      "navajowhite",
      "navy",
      "oldlace",
      "olive",
      "olivedrab",
      "orange",
      "orangered",
      "orchid",
      "palegoldenrod",
      "palegreen",
      "paleturquoise",
      "palevioletred",
      "papayawhip",
      "peachpuff",
      "peru",
      "pink",
      "plum",
      "powderblue",
      "purple",
      "rebeccapurple",
      "red",
      "rosybrown",
      "royalblue",
      "saddlebrown",
      "salmon",
      "sandybrown",
      "seagreen",
      "seashell",
      "sienna",
      "silver",
      "skyblue",
      "slateblue",
      "slategray",
      "snow",
      "springgreen",
      "steelblue",
      "tan",
      "teal",
      "thistle",
      "tomato",
      "turquoise",
      "violet",
      "wheat",
      "white",
      "whitesmoke",
      "yellow",
      "yellowgreen",
    ].map((name2) => ({
      type: "constant",
      label: name2,
    })),
  );
export const trackNewline = new ContextTracker({
  start: false,
  shift(context, term) {
    return term == LineComment || term == BlockComment || term == spaces
      ? context
      : term == newline;
  },
  strict: false,
});
export const insertSemicolon = new ExternalTokenizer(
  (input, stack) => {
    let { next: next2 } = input;
    if (next2 == braceR || next2 == -1 || stack.context) input.acceptToken(insertSemi);
  },
  {
    contextual: true,
    fallback: true,
  },
);
export class Schema3 {
  constructor(extraTags, extraAttrs) {
    this.tags = {
      ...Tags,
      ...extraTags,
    };
    this.globalAttrs = {
      ...GlobalAttrs,
      ...extraAttrs,
    };
    this.allTags = Object.keys(this.tags);
    this.globalAttrNames = Object.keys(this.globalAttrs);
  }
}
Schema3.default = new Schema3();
export class RegExpQuery extends QueryType {
  nextMatch(state2, curFrom, curTo) {
    let cursor = regexpCursor(this.spec, state2, curTo, state2.doc.length).next();
    if (cursor.done) cursor = regexpCursor(this.spec, state2, 0, curFrom).next();
    return cursor.done ? null : cursor.value;
  }
  prevMatchInRange(state2, from2, to) {
    for (let size2 = 1; ; size2++) {
      let start2 = Math.max(
        from2,
        to - size2 * 1e4,
        /* FindPrev.ChunkSize */
      );
      let cursor = regexpCursor(this.spec, state2, start2, to),
        range2 = null;
      while (!cursor.next().done) range2 = cursor.value;
      if (range2 && (start2 == from2 || range2.from > start2 + 10)) return range2;
      if (start2 == from2) return null;
    }
  }
  prevMatch(state2, curFrom, curTo) {
    return (
      this.prevMatchInRange(state2, 0, curFrom) ||
      this.prevMatchInRange(state2, curTo, state2.doc.length)
    );
  }
  getReplacement(result) {
    return this.spec.unquote(this.spec.replace).replace(/\$([$&]|\d+)/g, (m3, i2) => {
      if (i2 == "&") return result.match[0];
      if (i2 == "$") return "$";
      for (let l2 = i2.length; l2 > 0; l2--) {
        let n2 = +i2.slice(0, l2);
        if (n2 > 0 && n2 < result.match.length) return result.match[n2] + i2.slice(l2);
      }
      return m3;
    });
  }
  matchAll(state2, limit) {
    let cursor = regexpCursor(this.spec, state2, 0, state2.doc.length),
      ranges = [];
    while (!cursor.next().done) {
      if (ranges.length >= limit) return null;
      ranges.push(cursor.value);
    }
    return ranges;
  }
  highlight(state2, from2, to, add2) {
    let cursor = regexpCursor(
      this.spec,
      state2,
      Math.max(
        0,
        from2 - 250,
        /* RegExp.HighlightMargin */
      ),
      Math.min(to + 250, state2.doc.length),
    );
    while (!cursor.next().done) add2(cursor.value.from, cursor.value.to);
  }
}
export const setSearchQuery = StateEffect.define();
export const togglePanel = StateEffect.define();
export class SearchState {
  constructor(query, panel) {
    this.query = query;
    this.panel = panel;
  }
}
export const matchMark = Decoration2.mark({
  class: "cm-searchMatch",
});
export const selectedMatchMark = Decoration2.mark({
  class: "cm-searchMatch cm-searchMatch-selected",
});
export const ATX_HEADINGS = new Set([
  "ATXHeading1",
  "ATXHeading2",
  "ATXHeading3",
  "ATXHeading4",
  "ATXHeading5",
  "ATXHeading6",
]);
export const INLINE_MARKS = {
  Emphasis: "EmphasisMark",
  StrongEmphasis: "EmphasisMark",
  InlineCode: "CodeMark",
  Strikethrough: "StrikethroughMark",
};
function isSpace(state2, pos) {
  const ch = state2.doc.sliceString(pos, pos + 1);
  return ch === " " || ch === "	";
}
export function collectHeadingMarks(state2, heading2, out) {
  for (const mark2 of heading2.getChildren("HeaderMark")) {
    if (mark2.from - heading2.from <= 3) {
      let to = mark2.to;
      while (to < heading2.to && isSpace(state2, to)) to++;
      out.push({
        from: mark2.from,
        to,
        kind: "hide",
      });
    } else {
      let from2 = mark2.from;
      while (from2 > heading2.from && isSpace(state2, from2 - 1)) from2--;
      out.push({
        from: from2,
        to: mark2.to,
        kind: "hide",
      });
    }
  }
}
export function collectLinkChrome(link2, out) {
  const marks = link2.getChildren("LinkMark");
  const open = marks[0];
  const label = marks[1];
  if (!open || !label || label.from <= open.to) return;
  for (const mark2 of marks)
    out.push({
      from: mark2.from,
      to: mark2.to,
      kind: "hide",
    });
  for (const url2 of link2.getChildren("URL"))
    out.push({
      from: url2.from,
      to: url2.to,
      kind: "hide",
    });
  for (const title of link2.getChildren("LinkTitle"))
    out.push({
      from: title.from,
      to: title.to,
      kind: "hide",
    });
}
export function collectInlineMarks(node2, markName, out) {
  for (const mark2 of node2.getChildren(markName)) {
    out.push({
      from: mark2.from,
      to: mark2.to,
      kind: "hide",
    });
  }
}
export function isBlankLine$1(text2) {
  return /^[ \t]*$/.test(text2);
}
export class HorizontalRuleWidget extends WidgetType2 {
  eq() {
    return true;
  }
  toDOM() {
    const rule = document.createElement("span");
    rule.className = "cm-md-hr";
    return rule;
  }
}
