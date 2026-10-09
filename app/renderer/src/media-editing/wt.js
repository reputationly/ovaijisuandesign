// wt.js
import { registrySelectionRowIds } from "../generation/normalize-skill-detail-metadata.js";
import { AUDIO_MODELS } from "../generation/audio-models.js";
import { IMAGE_MODELS } from "../generation/image-models.js";
import { VIDEO_MODELS } from "../generation/video-models.js";
import {
  reactExports,
  remarkParse,
  remarkRehype,
  unified,
  urlAttributes,
  visit,
} from "../vendor.js";
import { rehypeRaw } from "../workspace/build-inspiration-media-showcase-collections.js";

export var et = reactExports.createContext(false);

export var tt = () => reactExports.useContext(et);

export var nt = reactExports.createContext({
  code: "",
});

export var He = () => reactExports.useContext(nt);

export var De = {
  copyCode: "Copy Code",
  downloadFile: "Download file",
  downloadDiagram: "Download diagram",
  downloadDiagramAsSvg: "Download diagram as SVG",
  downloadDiagramAsPng: "Download diagram as PNG",
  downloadDiagramAsMmd: "Download diagram as MMD",
  viewFullscreen: "View fullscreen",
  exitFullscreen: "Exit fullscreen",
  mermaidFormatSvg: "SVG",
  mermaidFormatPng: "PNG",
  mermaidFormatMmd: "MMD",
  copyTable: "Copy table",
  copyTableAsMarkdown: "Copy table as Markdown",
  copyTableAsCsv: "Copy table as CSV",
  copyTableAsTsv: "Copy table as TSV",
  downloadTable: "Download table",
  downloadTableAsCsv: "Download table as CSV",
  downloadTableAsMarkdown: "Download table as Markdown",
  tableFormatMarkdown: "Markdown",
  tableFormatCsv: "CSV",
  tableFormatTsv: "TSV",
  imageNotAvailable: "Image not available",
  downloadImage: "Download image",
  openExternalLink: "Open external link?",
  externalLinkWarning: "You're about to visit an external website.",
  close: "Close",
  copyLink: "Copy link",
  copied: "Copied",
  openLink: "Open link",
};

export var Be = reactExports.createContext(De);

export var D3 = () => reactExports.useContext(Be);

export var Ve = reactExports.createContext(null);

export var ct2 = () => reactExports.useContext(Ve);

export var Li = () => {
  var t2;
  let e2 = ct2();
  return (t2 = e2 == null ? void 0 : e2.code) != null ? t2 : null;
};

export var de = () => {
  var t2;
  let e2 = ct2();
  return (t2 = e2 == null ? void 0 : e2.mermaid) != null ? t2 : null;
};

var Go = () => (e2) => {
  visit(e2, "html", (t2, o2, n2) => {
    !n2 ||
      typeof o2 != "number" ||
      (n2.children[o2] = {
        type: "text",
        value: t2.value,
      });
  });
};

var Qo = [];

var en = {
  allowDangerousHtml: true,
};

var We = new WeakMap();

export var wt = class {
  constructor() {
    this.cache = new Map();
    this.keyCache = new WeakMap();
    this.maxSize = 100;
  }
  generateCacheKey(t2) {
    let o2 = this.keyCache.get(t2);
    if (o2) return o2;
    let n2 = t2.rehypePlugins,
      r2 = t2.remarkPlugins,
      s2 = t2.remarkRehypeOptions;
    if (!(n2 || r2 || s2)) {
      let p3 = "default";
      return (this.keyCache.set(t2, p3), p3);
    }
    let a2 = (p3) => {
        if (!p3 || p3.length === 0) return "";
        let m3 = "";
        for (let u4 = 0; u4 < p3.length; u4 += 1) {
          let f2 = p3[u4];
          if ((u4 > 0 && (m3 += ","), Array.isArray(f2))) {
            let [h2, b3] = f2;
            if (typeof h2 == "function") {
              let g2 = We.get(h2);
              (g2 || ((g2 = h2.name), We.set(h2, g2)), (m3 += g2));
            } else m3 += String(h2);
            ((m3 += ":"), (m3 += JSON.stringify(b3)));
          } else if (typeof f2 == "function") {
            let h2 = We.get(f2);
            (h2 || ((h2 = f2.name), We.set(f2, h2)), (m3 += h2));
          } else m3 += String(f2);
        }
        return m3;
      },
      l2 = a2(n2),
      i2 = a2(r2),
      d2 = s2 ? JSON.stringify(s2) : "",
      c3 = `${i2}::${l2}::${d2}`;
    return (this.keyCache.set(t2, c3), c3);
  }
  get(t2) {
    let o2 = this.generateCacheKey(t2),
      n2 = this.cache.get(o2);
    return (n2 && (this.cache.delete(o2), this.cache.set(o2, n2)), n2);
  }
  set(t2, o2) {
    let n2 = this.generateCacheKey(t2);
    if (this.cache.size >= this.maxSize) {
      let r2 = this.cache.keys().next().value;
      r2 && this.cache.delete(r2);
    }
    this.cache.set(n2, o2);
  }
  clear() {
    this.cache.clear();
  }
};

var Cs = (e2) =>
  e2.some((t2) => (Array.isArray(t2) ? t2[0] === rehypeRaw : t2 === rehypeRaw));

export var ks = (e2) => {
  let t2 = e2.rehypePlugins || Qo,
    o2 = e2.remarkPlugins || Qo,
    n2 = Cs(t2) ? o2 : [...o2, Go],
    r2 = e2.remarkRehypeOptions
      ? {
          ...en,
          ...e2.remarkRehypeOptions,
        }
      : en;
  return unified().use(remarkParse).use(n2).use(remarkRehype, r2).use(t2);
};

export var on = (e2) => e2;

export var vs = (e2, t2, o2, n2) => {
  o2
    ? e2.children.splice(t2, 1)
    : (e2.children[t2] = {
        type: "text",
        value: n2,
      });
};

export var xs = (e2, t2) => {
  var o2;
  for (let n2 in urlAttributes)
    if (Object.hasOwn(urlAttributes, n2) && Object.hasOwn(e2.properties, n2)) {
      let r2 = e2.properties[n2],
        s2 = urlAttributes[n2];
      (s2 === null || s2.includes(e2.tagName)) &&
        (e2.properties[n2] =
          (o2 = t2(String(r2 || ""), n2, e2)) != null ? o2 : void 0);
    }
};

export var Ts = (e2, t2, o2, n2, r2, s2) => {
  let a2 = false;
  return (
    n2 ? (a2 = !n2.includes(e2.tagName)) : r2 && (a2 = r2.includes(e2.tagName)),
    !a2 && s2 && typeof t2 == "number" && (a2 = !s2(e2, t2, o2)),
    a2
  );
};

function safeDecodeURIComponent$1(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function cleanPath$1(src) {
  if (!src) return "";
  try {
    const url2 = new URL(src);
    return safeDecodeURIComponent$1(url2.pathname);
  } catch {
    return safeDecodeURIComponent$1(src.split(/[?#]/)[0] ?? src);
  }
}

export const MEDIA_CATEGORIES = ["image", "video", "audio"];

function buildSelectionAliasIndex(entries2) {
  const mutable = new Map();
  for (const entry of entries2) {
    const aliases = [
      entry.id,
      entry.model_name,
      entry.publicToken,
      ...(entry.selectionAliases ?? []),
    ].filter((value) => Boolean(value));
    for (const alias of aliases) {
      const existing = mutable.get(alias) ?? {
        rowIds: new Set(),
      };
      for (const rowId of registrySelectionRowIds(entry))
        existing.rowIds.add(rowId);
      mutable.set(alias, existing);
    }
  }
  return mutable;
}

const SELECTION_ALIASES_BY_CATEGORY = {
  image: buildSelectionAliasIndex(IMAGE_MODELS),
  video: buildSelectionAliasIndex(VIDEO_MODELS),
  audio: buildSelectionAliasIndex(AUDIO_MODELS),
};

function isMediaCategory(value) {
  return MEDIA_CATEGORIES.includes(value);
}

function selectionIdMatchesVisibleModel(selectionId, model, category) {
  if (selectionId === model.id || selectionId === model.series_id) return true;
  const aliases = SELECTION_ALIASES_BY_CATEGORY[category].get(selectionId);
  if (!aliases) return false;
  return aliases.rowIds.has(model.id);
}

export function isVisibleMediaModelSelected(selected2, model) {
  if (!isMediaCategory(model.type)) return false;
  const category = model.type;
  const selectedIds = selected2[category];
  if (selectedIds === void 0) return true;
  return selectedIds.some((id2) =>
    selectionIdMatchesVisibleModel(id2, model, category),
  );
}

export function countVisibleSelectedMediaModels(selected2, models) {
  return models.filter(
    (model) =>
      model.visibility !== "hidden" &&
      isMediaCategory(model.type) &&
      isVisibleMediaModelSelected(selected2, model),
  ).length;
}

export function isAllVisibleMediaModelsSelected(selected2, models) {
  for (const category of MEDIA_CATEGORIES) {
    const visibleModels = models.filter(
      (model) => model.type === category && model.visibility !== "hidden",
    );
    if (
      !visibleModels.every((model) =>
        isVisibleMediaModelSelected(selected2, model),
      )
    )
      return false;
  }
  return true;
}
