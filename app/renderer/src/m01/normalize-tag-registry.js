// normalize-tag-registry.js
const BUILTIN_AGENT_MODEL_ACCESS = {
  "alpha/alpha": {
    requirement: "membership",
  },
  "alpha/claude-opus-5-5": {
    requirement: "membership",
  },
  "gamma/gamma-6-astra": {
    requirement: "membership",
  },
  "gamma/gpt-6-astra": {
    requirement: "membership",
  },
};
export function agentModelMatchesSelection(model, selectedId) {
  return (
    model.id === selectedId ||
    Boolean(model.reasoningLevels?.some((choice) => choice.modelId === selectedId))
  );
}
function normalizeAgentModelAccess(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
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
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
  const row = value;
  const display = {};
  if (typeof row.icon === "string" && row.icon.trim().length <= 2048) {
    try {
      const icon = row.icon.trim();
      const url2 = new URL(icon);
      if (url2.protocol === "https:" && !url2.username && !url2.password) display.icon = icon;
    } catch {}
  }
  for (const key2 of ["description", "listDescription"]) {
    const text2 = typeof row[key2] === "string" ? row[key2].trim() : "";
    if (text2 && text2.length <= 500) display[key2] = text2;
  }
  if (row.metrics && typeof row.metrics === "object" && !Array.isArray(row.metrics)) {
    const metrics = {};
    for (const key2 of ["speed", "intelligence", "cost"]) {
      const score = row.metrics[key2];
      if (typeof score === "number" && Number.isInteger(score) && score >= 0 && score <= 5) {
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
  return typeof sourceTool === "string" && EDIT_RESULT_SOURCE_TOOLS.includes(sourceTool);
}
const BENCHMARK_PROVEN_COMPLETION_REASONS = ["supervisor_completed", "external_control"];
new Set(BENCHMARK_PROVEN_COMPLETION_REASONS);
const CANVAS_TAG_REGISTRY_VERSION = 2;
export const CANVAS_TAG_NAME_MAX_LENGTH = 12;
const MAX_COLOR_TAGS_PER_ASSET = 1;
export const MAX_VISIBLE_CANVAS_TAG_COLORS = MAX_COLOR_TAGS_PER_ASSET;
const CANVAS_TAG_COLOR_PALETTE = [
  "#0A84FF",
  "#BF5AF2",
  "#FF9F0A",
  "#5E3DF5",
  "#FF5F57",
  "#30D158",
  "#FFD60A",
];
const PRESET_COLOR_TAG_IDS = {
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
const PRESET_COLOR_TAGS = CANVAS_TAG_COLOR_PALETTE.map((color2) => {
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
  if (countCanvasTagNameUnits(trimmed) > CANVAS_TAG_NAME_MAX_LENGTH) return "too-long";
  return null;
}
function isCanvasTagColor(color2) {
  return CANVAS_TAG_COLOR_PALETTE.includes(color2);
}
const PRESET_COLOR_TAG_ID_SET = new Set(Object.values(PRESET_COLOR_TAG_IDS));
function isPresetCanvasColorTagId(id2) {
  return PRESET_COLOR_TAG_ID_SET.has(id2);
}
export function isCanvasColorTag(tag) {
  return tag.kind === "color" && typeof tag.color === "string";
}
export function isCanvasKeywordTag(tag) {
  return tag.kind === "keyword";
}
function orderCanvasTagsByDefaultColor(tags2) {
  const priority = new Map(CANVAS_TAG_COLOR_PALETTE.map((color2, index2) => [color2, index2]));
  return tags2
    .map((tag, index2) => ({
      tag,
      index: index2,
    }))
    .sort(
      (left, right) =>
        (priority.get(left.tag.color ?? "") ?? Number.MAX_SAFE_INTEGER) -
          (priority.get(right.tag.color ?? "") ?? Number.MAX_SAFE_INTEGER) ||
        left.index - right.index,
    )
    .map(({ tag }) => tag);
}
function normalizeV2Registry(raw2) {
  if (raw2.version !== CANVAS_TAG_REGISTRY_VERSION || !Array.isArray(raw2.tags)) return null;
  const tags2 = [];
  const seenIds = new Set();
  for (const candidate of raw2.tags) {
    if (!candidate || typeof candidate !== "object") continue;
    const tag = candidate;
    const id2 = typeof tag.id === "string" ? tag.id.trim() : "";
    const name2 = typeof tag.name === "string" ? tag.name.trim() : "";
    const legacyNameKey = typeof tag.legacyNameKey === "string" ? tag.legacyNameKey : void 0;
    const color2 =
      typeof tag.color === "string" && isCanvasTagColor(tag.color) ? tag.color : void 0;
    const kind = isPresetCanvasColorTagId(id2) ? "color" : "keyword";
    if (!id2 || seenIds.has(id2) || (kind === "color" && !color2)) continue;
    if (!name2 && !legacyNameKey) continue;
    seenIds.add(id2);
    tags2.push({
      id: id2,
      kind,
      ...(kind === "color" && color2
        ? {
            color: color2,
          }
        : {}),
      name: name2 || void 0,
      legacyNameKey,
    });
  }
  const revision =
    typeof raw2.revision === "number" && Number.isSafeInteger(raw2.revision) && raw2.revision >= 0
      ? raw2.revision
      : 0;
  const orderMode = raw2.orderMode === "custom" ? "custom" : "default";
  const existingIds = new Set(tags2.map((tag) => tag.id));
  const missingPresetTags = PRESET_COLOR_TAGS.filter((tag) => !existingIds.has(tag.id)).map(
    (tag) => ({
      ...tag,
    }),
  );
  const completeTags =
    orderMode === "custom"
      ? [
          ...tags2.filter((tag) => tag.kind === "color"),
          ...missingPresetTags,
          ...tags2.filter((tag) => tag.kind === "keyword"),
        ]
      : orderCanvasTagsByDefaultColor([...tags2, ...missingPresetTags]);
  return {
    version: CANVAS_TAG_REGISTRY_VERSION,
    revision,
    orderMode,
    tags: completeTags,
  };
}
export function normalizeTagRegistry(input) {
  if (input && typeof input === "object") {
    const v2 = normalizeV2Registry(input);
    if (v2) return v2;
  }
  const legacy = input && typeof input === "object" ? input : null;
  if (!legacy || (!Array.isArray(legacy.colors) && !Array.isArray(legacy.transparents))) {
    return seedTagRegistry();
  }
  const tags2 = PRESET_COLOR_TAGS.map((preset2) => ({
    ...preset2,
  }));
  const byId = new Map(tags2.map((tag) => [tag.id, tag]));
  for (const candidate of Array.isArray(legacy.colors) ? legacy.colors : []) {
    if (!candidate || typeof candidate !== "object") continue;
    const old = candidate;
    if (typeof old.id !== "string") continue;
    const current2 = byId.get(old.id);
    if (!current2) continue;
    const name2 = typeof old.name === "string" ? old.name.trim() : "";
    if (name2) current2.name = name2;
  }
  const seenIds = new Set(tags2.map((tag) => tag.id));
  for (const candidate of Array.isArray(legacy.transparents) ? legacy.transparents : []) {
    if (!candidate || typeof candidate !== "object") continue;
    const old = candidate;
    const id2 = typeof old.id === "string" ? old.id.trim() : "";
    const name2 = typeof old.name === "string" ? old.name.trim() : "";
    if (!id2 || seenIds.has(id2) || !name2) continue;
    seenIds.add(id2);
    tags2.push({
      id: id2,
      kind: "keyword",
      name: name2,
    });
  }
  return {
    version: CANVAS_TAG_REGISTRY_VERSION,
    revision: 0,
    orderMode: "default",
    tags: orderCanvasTagsByDefaultColor(tags2),
  };
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
function isMarketConnectorId(value) {
  return /^[a-z0-9][a-z0-9._-]{0,127}$/.test(value) && !value.startsWith("custom.");
}
function configuredConnectorId(runtimeName) {
  return `custom.${runtimeName}`;
}
function isConfiguredConnectorId(id2) {
  return /^custom\.[a-zA-Z0-9_.-]{1,80}$/.test(id2) && !/^custom\.hub(?:[._]|$)/i.test(id2);
}
export const CONNECTOR_CAPABILITY_PATHS = {
  catalog: "/api/connectors/capability-catalog",
  selection: "/api/connectors/capability-selection",
};
function record(value) {
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
      (delivery.runtimeMessageId !== void 0 && typeof delivery.runtimeMessageId !== "string"))
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
export function parseConnectorCatalog(value) {
  if (!record(value) || typeof value.version !== "string" || !Array.isArray(value.connectors))
    throw new Error("Invalid connector catalog");
  return {
    version: value.version,
    ...(typeof value.marketAvailable === "boolean"
      ? {
          marketAvailable: value.marketAvailable,
        }
      : {}),
    ...(typeof value.fromCache === "boolean"
      ? {
          fromCache: value.fromCache,
        }
      : {}),
    connectors: value.connectors.map((item) => {
      if (
        !record(item) ||
        typeof item.connectorId !== "string" ||
        (item.source === "configured"
          ? typeof item.runtimeName !== "string" ||
            !isConfiguredConnectorId(item.connectorId) ||
            item.connectorId !== configuredConnectorId(item.runtimeName)
          : !isMarketConnectorId(item.connectorId)) ||
        (item.source !== void 0 && item.source !== "configured") ||
        typeof item.displayName !== "string" ||
        typeof item.summary !== "string" ||
        !["local", "remote"].includes(String(item.connection)) ||
        ![
          "not_installed",
          "not_configured",
          "disabled",
          "connecting",
          "connected",
          "failed",
        ].includes(String(item.state)) ||
        (item.runtimeName !== void 0 && typeof item.runtimeName !== "string") ||
        (item.autoActivated !== void 0 && typeof item.autoActivated !== "boolean") ||
        (item.aliases !== void 0 &&
          (!Array.isArray(item.aliases) || !item.aliases.every((v2) => typeof v2 === "string"))) ||
        (item.inputTypes !== void 0 &&
          (!Array.isArray(item.inputTypes) ||
            !item.inputTypes.every((v2) => typeof v2 === "string")))
      )
        throw new Error("Invalid connector entry");
      return {
        connectorId: item.connectorId,
        displayName: item.displayName,
        summary: item.summary,
        ...(Array.isArray(item.aliases)
          ? {
              aliases: item.aliases,
            }
          : {}),
        ...(Array.isArray(item.inputTypes)
          ? {
              inputTypes: item.inputTypes,
            }
          : {}),
        connection: item.connection,
        state: item.state,
        ...(typeof item.runtimeName === "string"
          ? {
              runtimeName: item.runtimeName,
            }
          : {}),
        ...(item.source === "configured"
          ? {
              source: "configured",
            }
          : {}),
        ...(typeof item.autoActivated === "boolean"
          ? {
              autoActivated: item.autoActivated,
            }
          : {}),
      };
    }),
  };
}
export function parseCapabilitySearchResult(value) {
  if (!value || typeof value !== "object") throw new Error("Invalid capability search result");
  const data2 = value;
  if (
    !Array.isArray(data2.matches) ||
    typeof data2.partial !== "boolean" ||
    typeof data2.nextStep !== "string" ||
    !data2.sources ||
    typeof data2.sources !== "object"
  )
    throw new Error("Invalid capability search result");
  const sources = {};
  for (const [key2, item] of Object.entries(data2.sources)) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.available !== "boolean" ||
      typeof item.stale !== "boolean" ||
      (item.reason !== void 0 && typeof item.reason !== "string")
    )
      throw new Error("Invalid capability source");
    sources[key2] = {
      available: item.available,
      stale: item.stale,
      ...(item.reason
        ? {
            reason: item.reason,
          }
        : {}),
    };
  }
  const matches2 = data2.matches.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Invalid capability match");
    const match2 = item;
    if (
      typeof match2.score !== "number" ||
      !Number.isFinite(match2.score) ||
      !Array.isArray(match2.matchedTerms) ||
      !match2.matchedTerms.every((t2) => typeof t2 === "string") ||
      !match2.capability ||
      typeof match2.capability !== "object" ||
      !("kind" in match2.capability) ||
      match2.capability.kind !== "connector"
    )
      throw new Error("Invalid capability match");
    const capability = parseConnectorCatalog({
      version: "search",
      connectors: [match2.capability],
    }).connectors[0];
    return {
      capability: {
        ...capability,
        kind: "connector",
      },
      score: match2.score,
      matchedTerms: match2.matchedTerms,
    };
  });
  return {
    matches: matches2,
    sources,
    partial: data2.partial,
    nextStep: data2.nextStep,
  };
}
