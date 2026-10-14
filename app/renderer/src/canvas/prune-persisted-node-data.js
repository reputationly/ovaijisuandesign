// prune-persisted-node-data.js
import { isGenerationErrorStatus } from "./compute-group-bounds-from-children.js";
import {
  ASSET_PROJECTED_DATA_KEYS,
  DRAFT_PROTECTED_GENERATION_STATUSES,
  TRANSIENT_DATA_KEYS,
} from "./find-free-position-from-anchor.js";

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
  let doc;
  try {
    doc = JSON.parse(promptJson);
  } catch {
    return null;
  }
  if (!doc || typeof doc !== "object") return null;
  const ALLOWED_BLOCK_TYPES = new Set(["doc", "paragraph"]);
  let hasRichContent = false;
  const blocks = [];
  const walkInline = (nodes) => {
    let out = "";
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const inlineNode = node;
      if (inlineNode.type === "text") {
        if (typeof inlineNode.text === "string") out += inlineNode.text;
      } else {
        hasRichContent = true;
      }
    }
    return out;
  };
  const walkBlocks = (node) => {
    if (!node || typeof node !== "object") return;
    const blockNode = node;
    if (typeof blockNode.type === "string" && !ALLOWED_BLOCK_TYPES.has(blockNode.type)) {
      hasRichContent = true;
    }
    if (!Array.isArray(blockNode.content)) return;
    if (blockNode.type === "doc") {
      for (const child of blockNode.content) walkBlocks(child);
    } else {
      blocks.push(walkInline(blockNode.content));
    }
  };
  walkBlocks(doc);
  return {
    text: blocks.join("\n"),
    hasRichContent,
  };
}

function prunePopoverDraftEntry(draftVal, nodePrompt) {
  const draftPrompt =
    draftVal && typeof draftVal.prompt === "string" ? draftVal.prompt : void 0;
  if (draftPrompt === void 0 || draftPrompt.trim().length === 0) {
    const record = draftVal;
    if (record?.dirty === true) {
      const entry = {
        ...record,
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

export function prunePersistedNodeData(data, ctx) {
  if (!data || typeof data !== "object") return void 0;
  const source = data;
  let copy;
  const ensureCopy = () => {
    copy ??= {
      ...source,
    };
    return copy;
  };
  for (const key of TRANSIENT_DATA_KEYS) {
    if (Object.hasOwn(source, key)) delete ensureCopy()[key];
  }
  for (const key of LEGACY_MULTI_IMAGE_DATA_KEYS) {
    if (Object.hasOwn(source, key)) delete ensureCopy()[key];
  }
  for (const key of ["assetId", "cloneOf"]) {
    if (Object.hasOwn(source, key)) delete ensureCopy()[key];
  }
  if (ctx.hasAssetId) {
    const isErrorState = isGenerationErrorStatus(source.status);
    for (const key of ASSET_PROJECTED_DATA_KEYS) {
      if (
        isErrorState &&
        (key === "cloudTraceId" ||
          key === "cloudTaskId" ||
          key === "providerTaskId")
      ) {
        continue;
      }
      if (Object.hasOwn(source, key)) delete ensureCopy()[key];
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
        !protectGenerationDraft && typeof source.prompt === "string"
          ? source.prompt
          : void 0;
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
  const result = copy ?? source;
  for (const key in result) {
    if (Object.hasOwn(result, key)) return result;
  }
  return void 0;
}
