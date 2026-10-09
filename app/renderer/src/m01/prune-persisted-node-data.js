// prune-persisted-node-data.js
import {
  POPOVER_DRAFT_DATA_KEY,
  CanvasNodeType,
  computeNodeSize,
  defaultNodeSizeForType,
  AUDIO_CARD_SIZE,
  TEXT_CARD_DEFAULT_SIZE,
  FILE_CARD_DEFAULT_SIZE,
  IMAGE_CARD_DEFAULT_SIZE,
  DRAFT_PROTECTED_GENERATION_STATUSES,
  TRANSIENT_DATA_KEYS,
  isGenerationErrorStatus,
  ASSET_PROJECTED_DATA_KEYS,
} from "../vendor.js";
export const CANVAS_VERSION = 1;
export const GROUP_COLOR_KEYS = ["red", "orange", "yellow", "green", "cyan", "blue", "purple"];
export function isGroupColorKey(value) {
  return typeof value === "string" && GROUP_COLOR_KEYS.includes(value);
}
export const AGENT_CANVAS_TEXT_SOURCE_TOOL = "hub_canvas_write_node";
export const CANVAS_TEXT_AGENT_PROMPT_SOURCE = "agent";
export function getPopoverDraftMap(data2) {
  if (!data2 || typeof data2 !== "object") return void 0;
  const map3 = data2[POPOVER_DRAFT_DATA_KEY];
  if (!map3 || typeof map3 !== "object") return void 0;
  return map3;
}
export function getPopoverDraft(data2, key2) {
  return getPopoverDraftMap(data2)?.[key2];
}
const NON_RESUBMITTABLE_STATUS = new Set([
  "pending",
  "generating",
  "loading",
  "recoverable_error",
  "status_unknown",
]);
export function isReexecutableGenerationNode(node2) {
  if (
    node2.type !== CanvasNodeType.Image &&
    node2.type !== CanvasNodeType.Video &&
    node2.type !== CanvasNodeType.Audio &&
    node2.type !== CanvasNodeType.Text
  ) {
    return false;
  }
  const data2 = node2.data;
  if (!data2) return false;
  const status = data2.status;
  if (typeof status === "string" && NON_RESUBMITTABLE_STATUS.has(status)) return false;
  const modelId = data2.model_id;
  return typeof modelId === "string" && modelId.length > 0;
}
export function groupByLevel(levelMap) {
  if (levelMap.size === 0) return [];
  let maxLevel = 0;
  for (const level of levelMap.values()) {
    if (level > maxLevel) maxLevel = level;
  }
  const layers = [];
  for (let i2 = 0; i2 <= maxLevel; i2++) layers.push([]);
  for (const [nodeId, level] of levelMap) {
    layers[level].push(nodeId);
  }
  return layers;
}
export const IMAGE_CARD_MAX_WIDTH = 350;
export const VIDEO_CARD_MAX_WIDTH = 350;
export const TEXT_CARD_MIN_SIZE = {
  width: 200,
  height: 100,
};
export const FILE_PREVIEW_SIZE = {
  width: 820,
  height: 480,
};
export const FILE_PREVIEW_MIN_SIZE = {
  width: 320,
  height: 200,
};
export function reconcileNodeSize(nodeType, currentSize, assetWidth, assetHeight) {
  const target = computeNodeSize(assetWidth, assetHeight);
  if (!target) return null;
  if (currentSize) {
    const fallback = defaultNodeSizeForType(nodeType);
    if (currentSize.width !== fallback.width || currentSize.height !== fallback.height) {
      return null;
    }
    if (currentSize.width === target.width && currentSize.height === target.height) {
      return null;
    }
  }
  return target;
}
export function defaultNodeSizeForKind(kind) {
  if (kind === "audio") return AUDIO_CARD_SIZE;
  if (kind === "text") return TEXT_CARD_DEFAULT_SIZE;
  if (kind === "file") return FILE_CARD_DEFAULT_SIZE;
  return IMAGE_CARD_DEFAULT_SIZE;
}
export const MAX_IMAGES_PER_NODE = 16;
function isDraftProtectedGenerationStatus(status) {
  return typeof status === "string" && DRAFT_PROTECTED_GENERATION_STATUSES.has(status);
}
export function resolveActiveNodeDraft(draft, hostStatus) {
  if (!draft) return void 0;
  if (draft.source !== "submitted") return draft;
  return isDraftProtectedGenerationStatus(hostStatus) ? draft : void 0;
}
const LEGACY_MULTI_IMAGE_DATA_KEYS = [
  "imageIds",
  "primaryImageIndex",
  "imageStatuses",
  "imageErrors",
  "history",
  "activeHistoryIndex",
  "histroy",
];
const POPOVER_DRAFT_KEY = "popoverDraft";
function analyzePromptJson(promptJson) {
  let doc2;
  try {
    doc2 = JSON.parse(promptJson);
  } catch {
    return null;
  }
  if (!doc2 || typeof doc2 !== "object") return null;
  const ALLOWED_BLOCK_TYPES = new Set(["doc", "paragraph"]);
  let hasRichContent = false;
  const blocks = [];
  const walkInline = (nodes) => {
    let out = "";
    for (const node2 of nodes) {
      if (!node2 || typeof node2 !== "object") continue;
      const n2 = node2;
      if (n2.type === "text") {
        if (typeof n2.text === "string") out += n2.text;
      } else {
        hasRichContent = true;
      }
    }
    return out;
  };
  const walkBlocks = (node2) => {
    if (!node2 || typeof node2 !== "object") return;
    const n2 = node2;
    if (typeof n2.type === "string" && !ALLOWED_BLOCK_TYPES.has(n2.type)) {
      hasRichContent = true;
    }
    if (!Array.isArray(n2.content)) return;
    if (n2.type === "doc") {
      for (const child of n2.content) walkBlocks(child);
    } else {
      blocks.push(walkInline(n2.content));
    }
  };
  walkBlocks(doc2);
  return {
    text: blocks.join("\n"),
    hasRichContent,
  };
}
function prunePopoverDraftEntry(draftVal, nodePrompt) {
  const draftPrompt = draftVal && typeof draftVal.prompt === "string" ? draftVal.prompt : void 0;
  if (draftPrompt === void 0 || draftPrompt.trim().length === 0) {
    const record2 = draftVal;
    if (record2?.dirty === true) {
      const entry = {
        ...record2,
      };
      delete entry.prompt;
      delete entry.promptJson;
      return {
        entry,
        changed: true,
      };
    }
    return {
      entry: void 0,
      changed: true,
    };
  }
  if (nodePrompt !== void 0 && draftPrompt === nodePrompt) {
    return {
      entry: void 0,
      changed: true,
    };
  }
  const promptJson = draftVal.promptJson;
  if (typeof promptJson === "string") {
    const analyzed = analyzePromptJson(promptJson);
    if (analyzed && !analyzed.hasRichContent && analyzed.text === draftPrompt) {
      const entry = {
        ...draftVal,
      };
      delete entry.promptJson;
      return {
        entry,
        changed: true,
      };
    }
  }
  return {
    entry: draftVal,
    changed: false,
  };
}
const EDGE_DATA_KEEP_KEYS = ["time"];
export function prunePersistedNodeData(data2, ctx) {
  if (!data2 || typeof data2 !== "object") return void 0;
  const source = data2;
  let copy2;
  const ensureCopy = () => {
    copy2 ??= {
      ...source,
    };
    return copy2;
  };
  for (const key2 of TRANSIENT_DATA_KEYS) {
    if (Object.hasOwn(source, key2)) delete ensureCopy()[key2];
  }
  for (const key2 of LEGACY_MULTI_IMAGE_DATA_KEYS) {
    if (Object.hasOwn(source, key2)) delete ensureCopy()[key2];
  }
  for (const key2 of ["assetId", "cloneOf"]) {
    if (Object.hasOwn(source, key2)) delete ensureCopy()[key2];
  }
  if (ctx.hasAssetId) {
    const isErrorState = isGenerationErrorStatus(source.status);
    for (const key2 of ASSET_PROJECTED_DATA_KEYS) {
      if (
        isErrorState &&
        (key2 === "cloudTraceId" || key2 === "cloudTaskId" || key2 === "providerTaskId")
      ) {
        continue;
      }
      if (Object.hasOwn(source, key2)) delete ensureCopy()[key2];
    }
  }
  const rawDraft = source[POPOVER_DRAFT_KEY];
  if (rawDraft && typeof rawDraft === "object") {
    const protectGenerationDraft = DRAFT_PROTECTED_GENERATION_STATUSES.has(
      typeof source.status === "string" ? source.status : "",
    );
    if (ctx.hidden && !protectGenerationDraft) {
      delete ensureCopy()[POPOVER_DRAFT_KEY];
    } else {
      const nodePrompt =
        !protectGenerationDraft && typeof source.prompt === "string" ? source.prompt : void 0;
      const draftMap = rawDraft;
      let nextDraft;
      let mutated = false;
      for (const [draftKey, draftVal] of Object.entries(draftMap)) {
        const { entry, changed } = prunePopoverDraftEntry(draftVal, nodePrompt);
        if (entry === void 0) {
          mutated = true;
          continue;
        }
        if (changed) mutated = true;
        nextDraft ??= {};
        nextDraft[draftKey] = entry;
      }
      if (mutated) {
        if (nextDraft && Object.keys(nextDraft).length > 0) {
          ensureCopy()[POPOVER_DRAFT_KEY] = nextDraft;
        } else {
          delete ensureCopy()[POPOVER_DRAFT_KEY];
        }
      }
    }
  }
  const result = copy2 ?? source;
  for (const key2 in result) {
    if (Object.hasOwn(result, key2)) return result;
  }
  return void 0;
}
export function prunePersistedEdgeData(data2) {
  if (!data2 || typeof data2 !== "object") return void 0;
  const source = data2;
  let next2;
  for (const key2 of EDGE_DATA_KEEP_KEYS) {
    const val = source[key2];
    if (val !== void 0) {
      next2 ??= {};
      next2[key2] = val;
    }
  }
  return next2;
}
const PARAM_BLACKLIST = new Set([
  "prompt",
  "negative_prompt",
  "lyrics",
  "text",
  // TTS text content (when surfaced as a regular param)
]);
export function pickPersistableModelParams(params, model) {
  const out = {};
  for (const [key2, value] of Object.entries(params)) {
    if (value === void 0 || value === null || value === "") continue;
    if (PARAM_BLACKLIST.has(key2)) continue;
    const def = model.params[key2];
    if (!def) continue;
    if (def.type === "textarea") continue;
    out[key2] = value;
  }
  return out;
}
const REFERENCE_PROMPT_PREAMBLE =
  "The content in <reference_text> is reference material only. Treat <user_prompt> as the primary instruction.";
const REFERENCE_TEXT_OPEN = "<reference_text>\n";
const REFERENCE_TEXT_CLOSE = "\n</reference_text>";
const USER_PROMPT_OPEN = "\n\n<user_prompt>\n";
const USER_PROMPT_CLOSE = "\n</user_prompt>";
export function composePromptWithReferenceText(referenceText, prompt) {
  const trimmedReference = referenceText.trim();
  if (!trimmedReference) return prompt;
  const referenceSection = `${REFERENCE_PROMPT_PREAMBLE}

${REFERENCE_TEXT_OPEN}${trimmedReference}${REFERENCE_TEXT_CLOSE}`;
  const trimmedPrompt = prompt.trim();
  return trimmedPrompt
    ? `${referenceSection}${USER_PROMPT_OPEN}${trimmedPrompt}${USER_PROMPT_CLOSE}`
    : referenceSection;
}
export function parseReferenceTextPrompt(prompt) {
  const prefix = `${REFERENCE_PROMPT_PREAMBLE}

${REFERENCE_TEXT_OPEN}`;
  if (!prompt.startsWith(prefix)) return void 0;
  const referenceOnlySuffix = REFERENCE_TEXT_CLOSE;
  const userSeparator = `${REFERENCE_TEXT_CLOSE}${USER_PROMPT_OPEN}`;
  if (prompt.endsWith(USER_PROMPT_CLOSE)) {
    const separatorIndex = prompt.lastIndexOf(userSeparator);
    if (separatorIndex < prefix.length) return void 0;
    return {
      referenceText: prompt.slice(prefix.length, separatorIndex),
      userPrompt: prompt.slice(separatorIndex + userSeparator.length, -USER_PROMPT_CLOSE.length),
    };
  }
  if (!prompt.endsWith(referenceOnlySuffix)) return void 0;
  return {
    referenceText: prompt.slice(prefix.length, -referenceOnlySuffix.length),
    userPrompt: "",
  };
}
const HASH_OFFSET_BASIS = 2166136261;
const HASH_PRIME = 16777619;
function sortJsonValue$1(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonValue$1(item));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const source = value;
  const sorted = {};
  for (const key2 of Object.keys(source).sort()) {
    sorted[key2] = sortJsonValue$1(source[key2]);
  }
  return sorted;
}
export function stableCanvasHash(canvas) {
  const input = JSON.stringify(sortJsonValue$1(canvas));
  let hash2 = HASH_OFFSET_BASIS;
  for (let i2 = 0; i2 < input.length; i2++) {
    hash2 ^= input.charCodeAt(i2);
    hash2 = Math.imul(hash2, HASH_PRIME);
  }
  return (hash2 >>> 0).toString(16).padStart(8, "0");
}
const SUBTITLE_FILE_EXTENSIONS = [".srt", ".vtt", ".ass", ".ssa"];
export function isSubtitleFileName(name2) {
  const lower2 = name2.toLowerCase();
  return SUBTITLE_FILE_EXTENSIONS.some((ext) => lower2.endsWith(ext));
}
export const DEFAULT_ROW_HEIGHT = "low";
export const ROW_HEIGHT_ORDER = ["low", "medium", "tall", "extraTall"];
const ROW_HEIGHT_SET = new Set(ROW_HEIGHT_ORDER);
export function isTableRowHeight(value) {
  return typeof value === "string" && ROW_HEIGHT_SET.has(value);
}
export const MIN_ROW_HEIGHT_PX = 28;
export const MAX_ROW_HEIGHT_PX = 600;
export function clampRowHeightPx(value) {
  return Math.max(MIN_ROW_HEIGHT_PX, Math.min(MAX_ROW_HEIGHT_PX, Math.round(value)));
}
export function sanitizeRowHeightOverride(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return void 0;
  return clampRowHeightPx(value);
}
export const TABLE_DOCUMENT_VERSION = 1;
function shortId() {
  return Math.random().toString(36).slice(2, 10);
}
export function newColumnId() {
  return `col_${shortId()}`;
}
export function newRowId() {
  return `row_${shortId()}`;
}
export function newConditionId() {
  return `cond_${shortId()}`;
}
export function newTablePath() {
  const a2 = Math.random().toString(36).slice(2, 8);
  const b3 = Math.random().toString(36).slice(2, 8);
  return `.hilo/tables/${a2}${b3}.htable`;
}
export function defaultColumnWidth(type2) {
  if (type2 === "attachment") return 200;
  if (type2 === "number") return 120;
  return 200;
}
export function createEmptyDocument(defaultColumnTitle = "Text") {
  return {
    version: TABLE_DOCUMENT_VERSION,
    columns: [
      {
        id: newColumnId(),
        title: defaultColumnTitle,
        type: "text",
        visible: true,
        width: defaultColumnWidth("text"),
      },
    ],
    rows: [],
  };
}
export function addColumn$1(doc2, init2) {
  const col = {
    id: newColumnId(),
    title: init2.title.trim() || "Untitled",
    type: init2.type,
    visible: true,
    width: init2.width ?? defaultColumnWidth(init2.type),
  };
  return {
    ...doc2,
    columns: [...doc2.columns, col],
  };
}
export function addRow$1(doc2) {
  const row = {
    id: newRowId(),
    cells: {},
  };
  return {
    ...doc2,
    rows: [...doc2.rows, row],
  };
}
