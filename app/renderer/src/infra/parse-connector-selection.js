// parse-connector-selection.js

// normalize-tag-registry.js
const BUILTIN_AGENT_MODEL_ACCESS = {};

export function agentModelMatchesSelection(model, selectedId) {
  return (
    model.id === selectedId ||
    Boolean(
      model.reasoningLevels?.some((choice) => choice.modelId === selectedId),
    )
  );
}

function normalizeAgentModelAccess(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return void 0;
  const requirement = value.requirement;
  return requirement === "membership"
    ? {
        requirement,
      }
    : void 0;
}

export function resolveAgentModelAccess(modelId, configured) {
  const remote = normalizeAgentModelAccess(configured);
  if (remote) return remote;
  return modelId ? BUILTIN_AGENT_MODEL_ACCESS[modelId] : void 0;
}

export function normalizeAgentModelDisplay(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return void 0;
  const row = value;
  const display = {};
  if (typeof row.icon === "string" && row.icon.trim().length <= 2048) {
    try {
      const icon = row.icon.trim();
      const url2 = new URL(icon);
      if (url2.protocol === "https:" && !url2.username && !url2.password)
        display.icon = icon;
    } catch {}
  }
  for (const key2 of ["description", "listDescription"]) {
    const text2 = typeof row[key2] === "string" ? row[key2].trim() : "";
    if (text2 && text2.length <= 500) display[key2] = text2;
  }
  if (
    row.metrics &&
    typeof row.metrics === "object" &&
    !Array.isArray(row.metrics)
  ) {
    const metrics = {};
    for (const key2 of ["speed", "intelligence", "cost"]) {
      const score = row.metrics[key2];
      if (
        typeof score === "number" &&
        Number.isInteger(score) &&
        score >= 0 &&
        score <= 5
      ) {
        metrics[key2] = score;
      }
    }
    if (Object.keys(metrics).length) display.metrics = metrics;
  }
  return Object.keys(display).length ? display : void 0;
}

export const ROLE_DISPLAY_NAMES = {
  ["source"]: /* Source */ "Source",
  ["init_image"]: /* InitImage */ "Init Image",
  ["style"]: /* Style */ "Style",
  ["subject"]: /* Subject */ "Subject",
  ["mask"]: /* Mask */ "Mask",
  ["pose"]: /* Pose */ "Pose",
  ["depth"]: /* Depth */ "Depth",
  ["audio_track"]: /* AudioTrack */ "Audio Track",
  ["subtitle"]: /* Subtitle */ "Subtitle",
  ["frame"]: /* Frame */ "Frame",
  ["reference"]: /* Reference */ "Reference",
};

const EDIT_RESULT_SOURCE_TOOLS = [
  "redraw",
  "outpaint",
  "erase",
  "move_object",
  "remove_background",
  "enhance_image",
];

export function isEditResultSourceTool(sourceTool) {
  return (
    typeof sourceTool === "string" &&
    EDIT_RESULT_SOURCE_TOOLS.includes(sourceTool)
  );
}

const BENCHMARK_PROVEN_COMPLETION_REASONS = [
  "supervisor_completed",
  "external_control",
];

new Set(BENCHMARK_PROVEN_COMPLETION_REASONS);

export const CANVAS_TAG_REGISTRY_VERSION = 2;

export const CANVAS_TAG_NAME_MAX_LENGTH = 12;

const MAX_COLOR_TAGS_PER_ASSET = 1;

export const MAX_VISIBLE_CANVAS_TAG_COLORS = MAX_COLOR_TAGS_PER_ASSET;

export const CANVAS_TAG_COLOR_PALETTE = [
  "#0A84FF",
  "#BF5AF2",
  "#FF9F0A",
  "#5E3DF5",
  "#FF5F57",
  "#30D158",
  "#FFD60A",
];

export const PRESET_COLOR_TAG_IDS = {
  red: "color:red",
  orange: "color:orange",
  yellow: "color:yellow",
  green: "color:green",
  blue: "color:blue",
  purple: "color:purple",
  deepPurple: "color:deep-purple",
};

export const PRESET_COLOR_NAME_KEYS = {
  [PRESET_COLOR_TAG_IDS.red]: "canvasTags.preset.red",
  [PRESET_COLOR_TAG_IDS.orange]: "canvasTags.preset.orange",
  [PRESET_COLOR_TAG_IDS.yellow]: "canvasTags.preset.yellow",
  [PRESET_COLOR_TAG_IDS.green]: "canvasTags.preset.green",
  [PRESET_COLOR_TAG_IDS.blue]: "canvasTags.preset.blue",
  [PRESET_COLOR_TAG_IDS.purple]: "canvasTags.preset.purple",
  [PRESET_COLOR_TAG_IDS.deepPurple]: "canvasTags.preset.deepPurple",
};

const PRESET_COLOR_TAG_ID_BY_COLOR = {
  "#FF5F57": PRESET_COLOR_TAG_IDS.red,
  "#FF9F0A": PRESET_COLOR_TAG_IDS.orange,
  "#FFD60A": PRESET_COLOR_TAG_IDS.yellow,
  "#30D158": PRESET_COLOR_TAG_IDS.green,
  "#0A84FF": PRESET_COLOR_TAG_IDS.blue,
  "#BF5AF2": PRESET_COLOR_TAG_IDS.purple,
  "#5E3DF5": PRESET_COLOR_TAG_IDS.deepPurple,
};

export const PRESET_COLOR_TAGS = CANVAS_TAG_COLOR_PALETTE.map((color2) => {
  const id2 = PRESET_COLOR_TAG_ID_BY_COLOR[color2];
  return {
    id: id2,
    kind: "color",
    color: color2,
    legacyNameKey: PRESET_COLOR_NAME_KEYS[id2],
  };
});

export function seedTagRegistry() {
  return {
    version: CANVAS_TAG_REGISTRY_VERSION,
    revision: 0,
    orderMode: "default",
    tags: PRESET_COLOR_TAGS.map((tag) => ({
      ...tag,
    })),
  };
}

const WIDE_CANVAS_TAG_GRAPHEME =
  /(?:[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Extended_Pictographic}\p{Regional_Indicator}\u{3000}-\u{303F}\u{FF01}-\u{FF60}\u{FFE0}-\u{FFE6}]|\u{20E3}|\u{FE0F})/u;

function segmentCanvasTagName(name2) {
  if (typeof Intl.Segmenter === "function") {
    return Array.from(
      new Intl.Segmenter(void 0, {
        granularity: "grapheme",
      }).segment(name2),
      ({ segment }) => segment,
    );
  }
  return Array.from(name2);
}

function getCanvasTagNameGraphemeWidth(grapheme) {
  return WIDE_CANVAS_TAG_GRAPHEME.test(grapheme) ? 2 : 1;
}

export function countCanvasTagNameUnits(name2) {
  return segmentCanvasTagName(name2).reduce(
    (total, grapheme) => total + getCanvasTagNameGraphemeWidth(grapheme),
    0,
  );
}

export function truncateCanvasTagName(name2) {
  let units = 0;
  let result = "";
  for (const grapheme of segmentCanvasTagName(name2)) {
    const width = getCanvasTagNameGraphemeWidth(grapheme);
    if (units + width > CANVAS_TAG_NAME_MAX_LENGTH) break;
    units += width;
    result += grapheme;
  }
  return result;
}

export function validateCanvasTagName(name2) {
  const trimmed = name2.trim();
  if (!trimmed) return "required";
  if (countCanvasTagNameUnits(trimmed) > CANVAS_TAG_NAME_MAX_LENGTH)
    return "too-long";
  return null;
}

export function isCanvasColorTag(tag) {
  return tag.kind === "color" && typeof tag.color === "string";
}

export function isCanvasKeywordTag(tag) {
  return tag.kind === "keyword";
}

function buildTagIndex(registry2) {
  return new Map(registry2.tags.map((tag) => [tag.id, tag]));
}

export function resolveTagIds(tagIds, registry2) {
  const index2 = buildTagIndex(registry2);
  const resolved = [];
  for (const id2 of tagIds ?? []) {
    const tag = index2.get(id2);
    if (tag) resolved.push(tag);
  }
  return resolved;
}

export function isTagNameTaken(name2, resolvedNames, excludeId) {
  const needle = name2.trim();
  if (!needle) return false;
  for (const [id2, display] of resolvedNames) {
    if (id2 !== excludeId && display.trim() === needle) return true;
  }
  return false;
}

export const CONNECTOR_CAPABILITY_PATHS = {
  catalog: "/api/connectors/capability-catalog",
  selection: "/api/connectors/capability-selection",
};

export function record(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function parseConnectorSelection(value) {
  if (
    !record(value) ||
    typeof value.selectionId !== "string" ||
    !/^[a-f0-9-]{36}$/.test(value.selectionId) ||
    typeof value.connectorId !== "string" ||
    typeof value.searchCallId !== "string" ||
    typeof value.sessionId !== "string" ||
    !["selected", "ready", "sent", "cancelled"].includes(String(value.state)) ||
    (value.runtimeName !== void 0 && typeof value.runtimeName !== "string")
  )
    throw new Error("Invalid connector selection");
  if (value.taskMessageId !== void 0 && typeof value.taskMessageId !== "string")
    throw new Error("Invalid connector task reference");
  const delivery = value.delivery;
  if (
    delivery !== void 0 &&
    (!record(delivery) ||
      typeof delivery.clientMessageId !== "string" ||
      !["submitting", "queued", "accepted", "unknown", "failed"].includes(
        String(delivery.status),
      ) ||
      (delivery.runtimeMessageId !== void 0 &&
        typeof delivery.runtimeMessageId !== "string"))
  )
    throw new Error("Invalid connector delivery receipt");
  return {
    selectionId: value.selectionId,
    connectorId: value.connectorId,
    searchCallId: value.searchCallId,
    sessionId: value.sessionId,
    state: value.state,
    ...(typeof value.runtimeName === "string"
      ? {
          runtimeName: value.runtimeName,
        }
      : {}),
    ...(typeof value.taskMessageId === "string"
      ? {
          taskMessageId: value.taskMessageId,
        }
      : {}),
    ...(record(delivery)
      ? {
          delivery: {
            clientMessageId: delivery.clientMessageId,
            status: delivery.status,
            ...(typeof delivery.runtimeMessageId === "string"
              ? {
                  runtimeMessageId: delivery.runtimeMessageId,
                }
              : {}),
          },
        }
      : {}),
  };
}

export function parseConnectorSelections(value) {
  if (!Array.isArray(value)) throw new Error("Invalid connector selections");
  return value.map(parseConnectorSelection);
}
