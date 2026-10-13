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
  var codeText;
  let renderContext = ct2();
  return (codeText = renderContext == null ? void 0 : renderContext.code) != null ? codeText : null;
};
export var de = () => {
  var mermaidOptions;
  let renderContext = ct2();
  return (mermaidOptions = renderContext == null ? void 0 : renderContext.mermaid) != null ? mermaidOptions : null;
};
var textifyRawHtmlPlugin = () => (tree) => {
  visit(tree, "html", (node, childIndex, parentNode) => {
    !parentNode ||
      typeof childIndex != "number" ||
      (parentNode.children[childIndex] = {
        type: "text",
        value: node.value,
      });
  });
};
var emptyPluginList = [];
var defaultRemarkRehypeOptions = {
  allowDangerousHtml: true,
};
var pluginFunctionNameCache = new WeakMap();
export var wt = class {
  constructor() {
    this.cache = new Map();
    this.keyCache = new WeakMap();
    this.maxSize = 100;
  }
  generateCacheKey(processorOptions) {
    let cachedKey = this.keyCache.get(processorOptions);
    if (cachedKey) return cachedKey;
    let rehypePlugins = processorOptions.rehypePlugins,
      remarkPlugins = processorOptions.remarkPlugins,
      remarkRehypeOptions = processorOptions.remarkRehypeOptions;
    if (!(rehypePlugins || remarkPlugins || remarkRehypeOptions)) {
      let defaultCacheKey = "default";
      return (this.keyCache.set(processorOptions, defaultCacheKey), defaultCacheKey);
    }
    let serializePluginList = (pluginList) => {
        if (!pluginList || pluginList.length === 0) return "";
        let pluginSignature = "";
        for (let pluginIndex = 0; pluginIndex < pluginList.length; pluginIndex += 1) {
          let pluginEntry = pluginList[pluginIndex];
          if ((pluginIndex > 0 && (pluginSignature += ","), Array.isArray(pluginEntry))) {
            let [plugin, pluginOptions] = pluginEntry;
            if (typeof plugin == "function") {
              let cachedFunctionName = pluginFunctionNameCache.get(plugin);
              (cachedFunctionName || ((cachedFunctionName = plugin.name), pluginFunctionNameCache.set(plugin, cachedFunctionName)), (pluginSignature += cachedFunctionName));
            } else pluginSignature += String(plugin);
            ((pluginSignature += ":"), (pluginSignature += JSON.stringify(pluginOptions)));
          } else if (typeof pluginEntry == "function") {
            let cachedFunctionName = pluginFunctionNameCache.get(pluginEntry);
            (cachedFunctionName || ((cachedFunctionName = pluginEntry.name), pluginFunctionNameCache.set(pluginEntry, cachedFunctionName)), (pluginSignature += cachedFunctionName));
          } else pluginSignature += String(pluginEntry);
        }
        return pluginSignature;
      },
      rehypePluginKey = serializePluginList(rehypePlugins),
      remarkPluginKey = serializePluginList(remarkPlugins),
      remarkRehypeOptionsKey = remarkRehypeOptions ? JSON.stringify(remarkRehypeOptions) : "",
      cacheKey = `${remarkPluginKey}::${rehypePluginKey}::${remarkRehypeOptionsKey}`;
    return (this.keyCache.set(processorOptions, cacheKey), cacheKey);
  }
  get(processorOptions) {
    let cacheKey = this.generateCacheKey(processorOptions),
      cachedProcessor = this.cache.get(cacheKey);
    return (cachedProcessor && (this.cache.delete(cacheKey), this.cache.set(cacheKey, cachedProcessor)), cachedProcessor);
  }
  set(processorOptions, processor) {
    let cacheKey = this.generateCacheKey(processorOptions);
    if (this.cache.size >= this.maxSize) {
      let oldestCacheKey = this.cache.keys().next().value;
      oldestCacheKey && this.cache.delete(oldestCacheKey);
    }
    this.cache.set(cacheKey, processor);
  }
  clear() {
    this.cache.clear();
  }
};
var hasRehypeRawPlugin = (pluginList) =>
  pluginList.some((pluginEntry) => (Array.isArray(pluginEntry) ? pluginEntry[0] === rehypeRaw : pluginEntry === rehypeRaw));
export var ks = (processorOptions) => {
  let rehypePlugins = processorOptions.rehypePlugins || emptyPluginList,
    remarkPlugins = processorOptions.remarkPlugins || emptyPluginList,
    remarkPluginsWithHtmlFallback = hasRehypeRawPlugin(rehypePlugins) ? remarkPlugins : [...remarkPlugins, textifyRawHtmlPlugin],
    remarkRehypeOptions = processorOptions.remarkRehypeOptions
      ? {
          ...defaultRemarkRehypeOptions,
          ...processorOptions.remarkRehypeOptions,
        }
      : defaultRemarkRehypeOptions;
  return unified().use(remarkParse).use(remarkPluginsWithHtmlFallback).use(remarkRehype, remarkRehypeOptions).use(rehypePlugins);
};
export var on = (url) => url;
export var vs = (parentNode, childIndex, shouldRemoveChild, textContent) => {
  shouldRemoveChild
    ? parentNode.children.splice(childIndex, 1)
    : (parentNode.children[childIndex] = {
        type: "text",
        value: textContent,
      });
};
export var xs = (element, urlTransform) => {
  var transformedUrl;
  for (let attributeName in urlAttributes)
    if (Object.hasOwn(urlAttributes, attributeName) && Object.hasOwn(element.properties, attributeName)) {
      let attributeValue = element.properties[attributeName],
        allowedTags = urlAttributes[attributeName];
      (allowedTags === null || allowedTags.includes(element.tagName)) &&
        (element.properties[attributeName] =
          (transformedUrl = urlTransform(String(attributeValue || ""), attributeName, element)) != null ? transformedUrl : void 0);
    }
};
export var Ts = (element, childIndex, parentNode, allowedElements, disallowedElements, allowElement) => {
  let shouldSkipElement = false;
  return (
    allowedElements ? (shouldSkipElement = !allowedElements.includes(element.tagName)) : disallowedElements && (shouldSkipElement = disallowedElements.includes(element.tagName)),
    !shouldSkipElement && allowElement && typeof childIndex == "number" && (shouldSkipElement = !allowElement(element, childIndex, parentNode)),
    shouldSkipElement
  );
};
function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
export function cleanPath(src) {
  if (!src) return "";
  try {
    const url2 = new URL(src);
    return safeDecodeURIComponent(url2.pathname);
  } catch {
    return safeDecodeURIComponent(src.split(/[?#]/)[0] ?? src);
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
  return selectedIds.some((selectionId) =>
    selectionIdMatchesVisibleModel(selectionId, model, category),
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
