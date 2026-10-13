// aggregate-timeline-runs.js
import {
  inferFileKind,
  KNOWLEDGE_PATH_RE,
} from "../chat/has-structured-success-payload.js";
import {
  collectMediaResultRecords,
  getFileActivityKind,
  isRecord$2 as isRecord,
  tryParseJson$1 as tryParseVendorJson,
} from "../vendor.js";
import {
  parseJsonRecord,
  timelineOperationTargetKey,
} from "./unwrap-mcp-json-record.js";
import { parseTimelineOperations } from "./parse-timeline-operations.js";
function isKnowledgePath(path) {
  if (!path) return false;
  return KNOWLEDGE_PATH_RE.test(path);
}
function basename(path) {
  if (!path) return path;
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
}
function extractPathFromArgs(toolArgs) {
  if (!toolArgs) return void 0;
  const parsed = tryParseVendorJson(toolArgs);
  if (!isRecord(parsed)) return void 0;
  const parsedObject = parsed;
  const candidate = parsedObject.path ?? parsedObject.file_path ?? parsedObject.filePath;
  return typeof candidate === "string" && candidate.length > 0
    ? candidate
    : void 0;
}
function collectStrings(value) {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item) => typeof item === "string" && item.trim().length > 0,
  );
}
function toItem(path, kind) {
  return {
    name: basename(path),
    path,
    kind: kind ?? inferFileKind(path),
  };
}
function mediaTypeToKind(value) {
  if (value === "image" || value === "video" || value === "audio") return value;
  return void 0;
}
function extractMediaKindFromRecord(record) {
  const metadata = isRecord(record.metadata) ? record.metadata : void 0;
  return mediaTypeToKind(
    record.media_type ??
      record.type ??
      metadata?.media_type ??
      metadata?.type,
  );
}
function extractMediaPathFromRecord(record) {
  const metadata = isRecord(record.metadata) ? record.metadata : void 0;
  const semantic = isRecord(record.semantic) ? record.semantic : void 0;
  const candidate =
    record.file_path ??
    record.filePath ??
    record.file ??
    record.path ??
    metadata?.file_path ??
    metadata?.filePath ??
    metadata?.file ??
    metadata?.path ??
    semantic?.file_path ??
    semantic?.filePath ??
    semantic?.file ??
    semantic?.path;
  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate.trim()
    : void 0;
}
function dedupePaths(paths) {
  const seen = new Set();
  const result = [];
  for (const path of paths) {
    if (seen.has(path)) continue;
    seen.add(path);
    result.push(path);
  }
  return result;
}
function extractMediaPathsFromArgs(toolArgs) {
  if (!toolArgs) return [];
  const parsed = tryParseVendorJson(toolArgs);
  if (!isRecord(parsed)) return [];
  return dedupePaths([
    ...collectStrings(parsed.file_paths),
    ...collectStrings(parsed.filePaths),
    ...collectStrings(parsed.paths),
    ...collectStrings(parsed.file_path),
    ...collectStrings(parsed.filePath),
    ...collectStrings(parsed.path),
  ]);
}
function dedupeMediaItems(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (seen.has(item.path)) continue;
    seen.add(item.path);
    result.push(item);
  }
  return result;
}
function extractMediaItemsFromResult(toolResult) {
  if (!toolResult) return [];
  const parsed = tryParseVendorJson(toolResult.trim());
  const records = collectMediaResultRecords(parsed);
  if (records.length === 0) return [];
  return dedupeMediaItems(
    records
      .map((record) => {
        const path = extractMediaPathFromRecord(record);
        return path
          ? toItem(path, extractMediaKindFromRecord(record))
          : void 0;
      })
      .filter((item) => !!item),
  );
}
function extractMediaAnalysisItems(toolArgs, toolResult) {
  const resultItems = extractMediaItemsFromResult(toolResult);
  const resultItemByPath = new Map(
    resultItems.map((item) => [item.path, item]),
  );
  const pathsFromArgs = extractMediaPathsFromArgs(toolArgs);
  const orderedItems = pathsFromArgs.map(
    (path) => resultItemByPath.get(path) ?? toItem(path),
  );
  return dedupeMediaItems([...orderedItems, ...resultItems]);
}
function extractFileChipItems(toolName, toolArgs, toolResult) {
  if (!toolName) return [];
  const activityKind = getFileActivityKind(toolName);
  if (activityKind === "read") {
    const path = extractPathFromArgs(toolArgs);
    return path ? [toItem(path)] : [];
  }
  if (activityKind === "analyseMedia") {
    return extractMediaAnalysisItems(toolArgs, toolResult);
  }
  return [];
}
function tryParseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return void 0;
  }
}
const SINGLE_TERM_FIELDS = ["pattern", "query", "keyword", "q"];
function dedupe(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}
function extractSearchChips(toolName, toolArgs, _toolResult) {
  if (!toolName || !toolArgs) return [];
  const parsed = tryParseJson(toolArgs);
  if (!parsed || typeof parsed !== "object") return [];
  const parsedObject = parsed;
  const chips = [];
  if (Array.isArray(parsedObject.queries)) {
    for (const entry of parsedObject.queries) {
      if (typeof entry === "string") {
        const trimmed = entry.trim();
        if (trimmed) chips.push(trimmed);
      } else if (entry && typeof entry === "object") {
        const queryText = entry.query;
        if (typeof queryText === "string" && queryText.trim()) chips.push(queryText.trim());
      }
    }
  }
  for (const field of SINGLE_TERM_FIELDS) {
    const value = parsedObject[field];
    if (typeof value === "string" && value.trim()) chips.push(value.trim());
  }
  return dedupe(chips);
}
function mergeTimelineOperations(operations) {
  const merged = [];
  for (const operation of operations) {
    const key = timelineOperationTargetKey(operation);
    const previous = merged[merged.length - 1];
    if (key && previous && timelineOperationTargetKey(previous) === key) {
      merged[merged.length - 1] = {
        ...operation,
        inputSummary:
          operation.displayNameKnown || !previous.displayNameKnown
            ? operation.inputSummary
            : previous.inputSummary,
        displayNameKnown:
          operation.displayNameKnown || previous.displayNameKnown,
        count: previous.count + operation.count,
      };
      continue;
    }
    merged.push(operation);
  }
  return merged;
}
export function aggregateTimelineRuns(entries) {
  const result = [];
  let entryIndex = 0;
  const hasConfirm = (entry) =>
    !!entry.pendingConfirm || !!entry.rejectedConfirm;
  const toCountOnlyEntry = (entry, members) => ({
    ...entry,
    toolArgs: void 0,
    toolResult: void 0,
    aggregatedCount: members.length,
    ...(entry.category === "execute"
      ? {
          aggregatedCommands: members.flatMap(({ id: toolId, toolArgs }) => {
            const command = parseJsonRecord(toolArgs)?.command;
            return typeof command === "string" && command.trim()
              ? [
                  {
                    id: toolId,
                    command,
                  },
                ]
              : [];
          }),
        }
      : {}),
    ...(entry.category === "process"
      ? {
          aggregatedProcessSteps: members.map(
            ({
              id: toolId,
              toolName,
              toolStatus,
              toolArgs,
              toolResult,
            }) => ({
              id: toolId,
              toolName,
              toolStatus,
              toolArgs,
              toolResult,
            }),
          ),
        }
      : {}),
  });
  const toTimelineOperationEntry = (entry, members) => {
    const operations = [];
    let fallbackCount = 0;
    for (const member of members) {
      const parsed = parseTimelineOperations(
        member.toolName,
        member.toolArgs,
        member.toolResult,
        member.toolStatus,
      );
      if (parsed.length > 0) {
        operations.push(...parsed);
      } else {
        fallbackCount++;
      }
    }
    if (operations.length === 0) {
      const isInFlight = members.some(
        (member) =>
          member.toolStatus === "running" || member.toolStatus === "pending",
      );
      const hasFailure = members.some(
        (member) => member.toolStatus === "error",
      );
      return hasConfirm(entry) || isInFlight || hasFailure
        ? toCountOnlyEntry(entry, members)
        : void 0;
    }
    return {
      ...entry,
      toolArgs: void 0,
      toolResult: void 0,
      aggregatedTimelineOperations: mergeTimelineOperations(operations),
      aggregatedTimelineFallbackCount:
        fallbackCount > 0 ? fallbackCount : void 0,
    };
  };
  while (entryIndex < entries.length) {
    const entry = entries[entryIndex];
    if (entry.type === "thinking") {
      const thinkingBlocks = [];
      let thinkingIndex = entryIndex;
      while (thinkingIndex < entries.length && entries[thinkingIndex].type === "thinking") {
        const content = entries[thinkingIndex].thinkingContent;
        if (content) thinkingBlocks.push(content);
        thinkingIndex++;
      }
      result.push({
        ...entry,
        thinkingContent:
          thinkingBlocks.length > 0
            ? thinkingBlocks.join("\n\n")
            : entry.thinkingContent,
      });
      entryIndex = thinkingIndex;
      continue;
    }
    if (
      entry.type === "tool" &&
      (entry.category === "read" || entry.category === "analyseMedia")
    ) {
      const files = [];
      const seen = new Set();
      const preservesLifecycle = entry.category === "analyseMedia";
      const status = preservesLifecycle
        ? (entry.toolStatus ?? "pending")
        : "ok";
      let relatedToolIndex = entryIndex;
      while (
        relatedToolIndex < entries.length &&
        entries[relatedToolIndex].type === "tool" &&
        entries[relatedToolIndex].category === entry.category &&
        (!preservesLifecycle ||
          (entries[relatedToolIndex].toolStatus ?? "pending") === status)
      ) {
        const member = entries[relatedToolIndex];
        for (const item of extractFileChipItems(
          member.toolName ?? "",
          member.toolArgs,
          member.toolResult,
        )) {
          if (isKnowledgePath(item.path)) continue;
          if (seen.has(item.path)) continue;
          seen.add(item.path);
          files.push(item);
        }
        relatedToolIndex++;
      }
      if (files.length > 0) {
        result.push({
          ...entry,
          toolStatus: status,
          aggregatedFiles: files,
        });
      }
      entryIndex = relatedToolIndex;
      continue;
    }
    if (entry.type === "tool" && entry.toolName === "hub_capability_search") {
      result.push(entry);
      entryIndex++;
      continue;
    }
    if (entry.type === "tool" && entry.category === "search") {
      if (entry.toolStatus === "error") {
        result.push(entry);
        entryIndex++;
        continue;
      }
      const chips = [];
      const seen = new Set();
      let searchToolIndex = entryIndex;
      while (
        searchToolIndex < entries.length &&
        entries[searchToolIndex].type === "tool" &&
        entries[searchToolIndex].category === "search" &&
        entries[searchToolIndex].toolName !== "hub_capability_search" &&
        entries[searchToolIndex].toolStatus !== "error"
      ) {
        const member = entries[searchToolIndex];
        for (const term of extractSearchChips(
          member.toolName ?? "",
          member.toolArgs,
          member.toolResult,
        )) {
          if (seen.has(term)) continue;
          seen.add(term);
          chips.push(term);
        }
        searchToolIndex++;
      }
      if (chips.length > 0) {
        result.push({
          ...entry,
          toolStatus: "ok",
          aggregatedSearchChips: chips,
        });
      }
      entryIndex = searchToolIndex;
      continue;
    }
    if (
      entry.type === "tool" &&
      (entry.category === "canvas" || entry.category === "plan")
    ) {
      if (hasConfirm(entry)) {
        const operationEntry = toTimelineOperationEntry(entry, [entry]);
        if (operationEntry) result.push(operationEntry);
        entryIndex++;
        continue;
      }
      const status = entry.toolStatus ?? "pending";
      const members = [entry];
      let groupedToolIndex = entryIndex + 1;
      while (
        groupedToolIndex < entries.length &&
        entries[groupedToolIndex].type === "tool" &&
        entries[groupedToolIndex].category === entry.category &&
        (entries[groupedToolIndex].toolStatus ?? "pending") === status &&
        !hasConfirm(entries[groupedToolIndex])
      ) {
        members.push(entries[groupedToolIndex]);
        groupedToolIndex++;
      }
      const operationEntry = toTimelineOperationEntry(entry, members);
      if (operationEntry) result.push(operationEntry);
      entryIndex = groupedToolIndex;
      continue;
    }
    if (
      entry.type === "tool" &&
      (entry.category === "execute" || entry.category === "process")
    ) {
      if (hasConfirm(entry)) {
        result.push(toCountOnlyEntry(entry, [entry]));
        entryIndex++;
        continue;
      }
      const status = entry.toolStatus ?? "pending";
      const members = [entry];
      let toolGroupIndex = entryIndex + 1;
      while (
        toolGroupIndex < entries.length &&
        entries[toolGroupIndex].type === "tool" &&
        entries[toolGroupIndex].category === entry.category &&
        (entries[toolGroupIndex].toolStatus ?? "pending") === status &&
        !hasConfirm(entries[toolGroupIndex])
      ) {
        members.push(entries[toolGroupIndex]);
        toolGroupIndex++;
      }
      result.push(toCountOnlyEntry(entry, members));
      entryIndex = toolGroupIndex;
      continue;
    }
    result.push(entry);
    entryIndex++;
  }
  return result;
}
