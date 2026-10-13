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
    let text = "";
    for (const node2 of nodes) {
      if (!node2 || typeof node2 !== "object") continue;
      const inlineNode = node2;
      if (inlineNode.type === "text") {
        if (typeof inlineNode.text === "string") text += inlineNode.text;
      } else {
        hasRichContent = true;
      }
    }
    return text;
  };
  const walkBlocks = (node2) => {
    if (!node2 || typeof node2 !== "object") return;
    const blockNode = node2;
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
  walkBlocks(doc2);
  return {
    text: blocks.join("\n"),
    hasRichContent,
  };
}

function prunePopoverDraftEntry(draftVal, nodePrompt) {
  const draftPrompt =
    draftVal && typeof draftVal.prompt === "string" ? draftVal.prompt : void 0;
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

export function prunePersistedNodeData(data2, context) {
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
  if (context.hasAssetId) {
    const isErrorState = isGenerationErrorStatus(source.status);
    for (const key2 of ASSET_PROJECTED_DATA_KEYS) {
      if (
        isErrorState &&
        (key2 === "cloudTraceId" ||
          key2 === "cloudTaskId" ||
          key2 === "providerTaskId")
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
    if (context.hidden && !protectGenerationDraft) {
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
  const result = copy2 ?? source;
  for (const key2 in result) {
    if (Object.hasOwn(result, key2)) return result;
  }
  return void 0;
}
