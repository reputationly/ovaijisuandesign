// qo.jsx
import {
  jsxRuntimeExports,
  reactExports,
  visit,
  unified,
  remarkParse,
  remarkRehype,
  urlAttributes,
  toJsxRuntime,
  G$1,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { resolveMediaUrl } from "../workspace/deferred-thumbnail-image-generation.jsx";
import { rehypeRaw } from "../workspace/build-inspiration-media-showcase-collections.js";
import {
  AUDIO_MODELS,
  IMAGE_MODELS,
  VIDEO_MODELS,
  registrySelectionRowIds,
} from "../generation/push-inline.js";
import { usePricingConfig } from "../canvas/use-canvas-tag-filter.js";
import { InlineColorValue } from "../generation/use-mention-models.jsx";
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
var as = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
var is = new RegExp("\\p{L}", "u");
export function $e(e2) {
  let t2 = e2
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*{1,3}|_{1,3})/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^[\s>*\-+\d.]+/gm, "");
  for (let o2 of t2) {
    if (as.test(o2)) return "rtl";
    if (is.test(o2)) return "ltr";
  }
  return "ltr";
}
export var ls = /^[ \t]{0,3}(`{3,}|~{3,})/;
export var cs = /^\|?[ \t]*:?-{1,}:?[ \t]*(\|[ \t]*:?-{1,}:?[ \t]*)*\|?$/;
export var ht = (e2) => {
  let t2 = e2.split(`
`),
    o2 = null,
    n2 = 0;
  for (let r2 of t2) {
    let s2 = ls.exec(r2);
    if (o2 === null) {
      if (s2) {
        let a2 = s2[1];
        ((o2 = a2[0]), (n2 = a2.length));
      }
    } else if (s2) {
      let a2 = s2[1],
        l2 = a2[0],
        i2 = a2.length;
      l2 === o2 && i2 >= n2 && ((o2 = null), (n2 = 0));
    }
  }
  return o2 !== null;
};
export var Uo = (e2) => {
  let t2 = e2.split(`
`);
  for (let o2 of t2) {
    let n2 = o2.trim();
    if (n2.length > 0 && n2.includes("|") && cs.test(n2)) return true;
  }
  return false;
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
export var Qo = [];
export var en = {
  allowDangerousHtml: true,
};
export var We = new WeakMap();
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
export var tn = new wt();
export var Ct2 = (e2) => {
  let t2 = ws(e2),
    o2 = e2.children || "",
    n2 = t2.runSync(t2.parse(o2), o2);
  return Ps(n2, e2);
};
export var ws = (e2) => {
  let t2 = tn.get(e2);
  if (t2) return t2;
  let o2 = ks(e2);
  return (tn.set(e2, o2), o2);
};
export var Cs = (e2) =>
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
        (e2.properties[n2] = (o2 = t2(String(r2 || ""), n2, e2)) != null ? o2 : void 0);
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
export var Ps = (e2, t2) => {
  let {
    allowElement: o2,
    allowedElements: n2,
    disallowedElements: r2,
    skipHtml: s2,
    unwrapDisallowed: a2,
    urlTransform: l2,
  } = t2;
  if (o2 || n2 || r2 || s2 || l2) {
    let d2 = l2 || on;
    visit(e2, (c3, p3, m3) => {
      if (c3.type === "raw" && m3 && typeof p3 == "number") return (vs(m3, p3, s2, c3.value), p3);
      if (
        c3.type === "element" &&
        (xs(c3, d2), Ts(c3, p3, m3, n2, r2, o2) && m3 && typeof p3 == "number")
      )
        return (
          a2 && c3.children ? m3.children.splice(p3, 1, ...c3.children) : m3.children.splice(p3, 1),
          p3
        );
    });
  }
  return toJsxRuntime(e2, {
    Fragment: jsxRuntimeExports.Fragment,
    components: t2.components,
    ignoreInvalidStyle: true,
    jsx: jsxRuntimeExports.jsx,
    jsxs: jsxRuntimeExports.jsxs,
    passKeys: true,
    passNode: true,
  });
};
export function getMediaExtension(src) {
  const name2 = basename$3(src);
  const dot2 = name2.lastIndexOf(".");
  return dot2 > 0 ? name2.slice(dot2 + 1).toUpperCase() : "";
}
export function joinMetadata(parts) {
  return parts.filter(Boolean).join(" · ");
}
export function getDisplayName(originalSrc, resolvedSrc, alt, asset) {
  if (asset?.name) return asset.name;
  return basename$3(originalSrc) || basename$3(resolvedSrc) || alt || "media";
}
function basename$3(src) {
  const path2 = cleanPath$1(src);
  return path2.split(/[\\/]/).pop() || "";
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
function safeDecodeURIComponent$1(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
function extractFilePath(src) {
  let filePath = src;
  if (/^file:\/\//i.test(filePath)) {
    return filePath.replace(/^file:\/\//i, "");
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(filePath)) {
    filePath = filePath.replace(/^[a-z][a-z0-9+.-]*:/, "");
    filePath = filePath.replace(/^file:\/\//, "");
  }
  return filePath;
}
export function rewriteImgSrc(src, workspaceDir, resolveUrl = resolveMediaUrl) {
  if (!src) return src;
  if (/^https?:\/\//.test(src)) return src;
  const filePath = extractFilePath(src);
  const ofMatch = filePath.match(/output_files\/(.+)$/);
  if (ofMatch) return resolveUrl(`/files/${ofMatch[1]}`);
  if (filePath.startsWith("/files/")) return resolveUrl(filePath);
  if (filePath.startsWith("/")) {
    if (workspaceDir) {
      const base2 = workspaceDir.endsWith("/") ? workspaceDir : `${workspaceDir}/`;
      if (filePath.startsWith(base2)) {
        return resolveUrl(`/files/${filePath.slice(base2.length)}`);
      }
    }
    const name2 = filePath.split("/").pop();
    return name2 ? resolveUrl(`/files/${name2}`) : src;
  }
  const cleaned = filePath.replace(/^\.\//, "");
  return resolveUrl(`/files/${cleaned}`);
}
export const FILE_REFERENCE_CODE_BLOCK_LANGUAGES = new Set(["", "text", "plaintext", "txt"]);
const CODE_BLOCK_LANGUAGE_PATTERN = /language-([^\s]+)/;
export function MarkdownSpan(props) {
  const {
    children: children2,
    node: _node,
    dataInlineVisual,
    dataColorValue,
    "data-inline-visual": dataInlineVisualAttribute,
    "data-color-value": dataColorValueAttribute,
    ...domProps
  } = props;
  const visualType = dataInlineVisual ?? dataInlineVisualAttribute;
  const colorValue = dataColorValue ?? dataColorValueAttribute;
  if (visualType === "color" && colorValue) {
    return <InlineColorValue value={colorValue}>{children2}</InlineColorValue>;
  }
  return <span {...domProps}>{children2}</span>;
}
export function codeBlockLanguage(className) {
  return className?.match(CODE_BLOCK_LANGUAGE_PATTERN)?.[1]?.toLowerCase() ?? "";
}
function hasStringChildren(value) {
  if (!reactExports.isValidElement(value)) return false;
  const props = value.props;
  return typeof props.children === "string";
}
export function codeBlockContent(children2) {
  if (typeof children2 === "string") return children2;
  if (typeof children2 === "number") return String(children2);
  if (hasStringChildren(children2)) return children2.props.children;
  return "";
}
export const stablePlugins = {
  code: G$1,
};
export function useSessionCostVisible(session) {
  const { data: data2 } = usePricingConfig();
  const statsSince = data2?.sessionStatsSinceMs;
  if (statsSince === void 0) return false;
  const createdAt = Date.parse(session.created_at);
  if (!Number.isFinite(createdAt)) return false;
  return createdAt >= statsSince;
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
      for (const rowId of registrySelectionRowIds(entry)) existing.rowIds.add(rowId);
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
  return selectedIds.some((id2) => selectionIdMatchesVisibleModel(id2, model, category));
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
    if (!visibleModels.every((model) => isVisibleMediaModelSelected(selected2, model)))
      return false;
  }
  return true;
}
export const TOOL_NAME_TO_LABEL_ID = {
  // Unified media generation and editing surface.
  hub_generate_image: "mediaGen",
  hub_generate_video: "mediaGen",
  hub_generate_audio_speech: "mediaGen",
  hub_generate_audio_music: "mediaGen",
  hub_music_cover: "mediaGen",
  hub_voice_prepare: "mediaGen",
  hub_lyrics_generation: "mediaGen",
  hub_merge_videos: "mediaGen",
  hub_batch_lip_sync: "mediaGen",
  hub_image_remove_background: "mediaGen",
  hub_image_enhance: "mediaGen",
  hub_image_layer_decompose: "mediaGen",
  hub_subtitle_format: "contentProcess",
  hub_media_transcribe: "contentProcess",
  hub_audio_analyze_music: "contentProcess",
  hub_audio_separate: "contentProcess",
  hub_audio_meta: "contentProcess",
  hub_ffmpeg: "contentProcess",
  // Orchestration and capability inspection.
  hub_capability_search: "searchInfo",
  hub_list_capabilities: "transient",
  hub_search_knowledge: "transient",
  hub_select_image_recipe: "transient",
  hub_report_outcome: "transient",
  hub_get_model_concurrency: "transient",
  // ComfyUI workflow surface.
  hub_open_comfyui: "canvasOp",
  hub_add_comfyui_workflow: "canvasOp",
  hub_edit_comfyui_workflow: "silent",
  hub_save_comfyui_workflow: "silent",
  hub_save_comfyui_run_as_workflow: "silent",
  hub_list_comfyui_template: "transient",
  hub_list_comfyui_workflow: "transient",
  hub_get_comfyui_workflow: "transient",
  hub_run_comfyui_workflow: "transient",
  hub_get_comfyui_run_status: "transient",
  browser: "browser",
  hub_browser: "browser",
  // Interaction and built-in skill loading.
  hub_connector_authorize: "connectorOp",
  question: "askUser",
  hub_preview_and_collect_feedback: "askUser",
  skill: "skillOp",
  // Canvas mutation and inspection.
  hub_canvas_write_node: "canvasOp",
  hub_canvas_apply_text_edits: "canvasOp",
  hub_canvas_group_nodes: "canvasOp",
  hub_canvas_group_recent_outputs: "canvasOp",
  hub_canvas_ungroup_node: "canvasOp",
  hub_canvas_get_node: "transient",
  hub_canvas_list_nodes: "transient",
  hub_canvas_grep_text: "transient",
  hub_canvas_read_text: "transient",
  // Production plan surface.
  hub_plan_write: "planOp",
  hub_plan_replan: "planOp",
  hub_plan_get_stage_detail: "transient",
  hub_plan_get_stage_status: "transient",
  hub_plan_get_work_items: "transient",
  hub_plan_patch_stage: "transient",
  hub_plan_update_stage_state: "transient",
  // Memory activity is transient process feedback.
  hub_memory: "transient",
  // Search and asset discovery.
  glob: "searchInfo",
  grep: "searchInfo",
  webfetch: "searchInfo",
  hub_web_media: "searchInfo",
  hub_image_search: "searchInfo",
  hub_asset_center_search: "searchInfo",
  hub_asset_center_use_entity: "searchInfo",
  // File and media inspection.
  hub_read: "fileOp",
  hub_analyse_media: "fileOp",
  bash: "fileOp",
  // Generic plugin-agent bridge.
  hub_plugin_agent_open_editor: "canvasOp",
  hub_plugin_agent_describe: "canvasOp",
  hub_plugin_agent_invoke: "canvasOp",
  // Internal built-ins.
  task: "silent",
  todowrite: "silent",
};
