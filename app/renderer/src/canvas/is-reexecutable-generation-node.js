// is-reexecutable-generation-node.js
import {
  AUDIO_CARD_SIZE,
  computeNodeSize,
  defaultNodeSizeForType,
  FILE_CARD_DEFAULT_SIZE,
  IMAGE_CARD_DEFAULT_SIZE,
  POPOVER_DRAFT_DATA_KEY,
  TEXT_CARD_DEFAULT_SIZE,
} from "./compute-group-bounds-from-children.js";
import { CanvasNodeType } from "../vendor.js";
import { DRAFT_PROTECTED_GENERATION_STATUSES } from "./find-free-position-from-anchor.js";
export const CANVAS_VERSION = 1;
export const GROUP_COLOR_KEYS = [
  "red",
  "orange",
  "yellow",
  "green",
  "cyan",
  "blue",
  "purple",
];
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
  if (typeof status === "string" && NON_RESUBMITTABLE_STATUS.has(status))
    return false;
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
export function reconcileNodeSize(
  nodeType,
  currentSize,
  assetWidth,
  assetHeight,
) {
  const target = computeNodeSize(assetWidth, assetHeight);
  if (!target) return null;
  if (currentSize) {
    const fallback = defaultNodeSizeForType(nodeType);
    if (
      currentSize.width !== fallback.width ||
      currentSize.height !== fallback.height
    ) {
      return null;
    }
    if (
      currentSize.width === target.width &&
      currentSize.height === target.height
    ) {
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
  return (
    typeof status === "string" &&
    DRAFT_PROTECTED_GENERATION_STATUSES.has(status)
  );
}
export function resolveActiveNodeDraft(draft, hostStatus) {
  if (!draft) return void 0;
  if (draft.source !== "submitted") return draft;
  return isDraftProtectedGenerationStatus(hostStatus) ? draft : void 0;
}
const EDGE_DATA_KEEP_KEYS = ["time"];
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
export const REFERENCE_PROMPT_PREAMBLE =
  "The content in <reference_text> is reference material only. Treat <user_prompt> as the primary instruction.";
export const REFERENCE_TEXT_OPEN = "<reference_text>\n";
export const REFERENCE_TEXT_CLOSE = "\n</reference_text>";
export const USER_PROMPT_OPEN = "\n\n<user_prompt>\n";
export const USER_PROMPT_CLOSE = "\n</user_prompt>";
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
const HASH_OFFSET_BASIS = 2166136261;
const HASH_PRIME = 16777619;
function sortJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonValue(item));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const source = value;
  const sorted = {};
  for (const key2 of Object.keys(source).sort()) {
    sorted[key2] = sortJsonValue(source[key2]);
  }
  return sorted;
}
export function stableCanvasHash(canvas) {
  const input = JSON.stringify(sortJsonValue(canvas));
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
export const MIN_ROW_HEIGHT_PX = 28;
export const MAX_ROW_HEIGHT_PX = 600;
export function clampRowHeightPx(value) {
  return Math.max(
    MIN_ROW_HEIGHT_PX,
    Math.min(MAX_ROW_HEIGHT_PX, Math.round(value)),
  );
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
export function addColumn(doc2, init2) {
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
export function addRow(doc2) {
  const row = {
    id: newRowId(),
    cells: {},
  };
  return {
    ...doc2,
    rows: [...doc2.rows, row],
  };
}
