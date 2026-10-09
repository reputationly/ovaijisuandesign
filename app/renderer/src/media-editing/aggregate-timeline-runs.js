// aggregate-timeline-runs.js
import {
  inferFileKind,
  KNOWLEDGE_PATH_RE,
} from "../chat/has-structured-success-payload.js";
import {
  collectMediaResultRecords,
  getFileActivityKind,
  isRecord$2 as isRecord,
  tryParseJson$1,
} from "../vendor.js";
import {
  parseJsonRecord,
  timelineOperationTargetKey,
} from "./unwrap-mcp-json-record.js";
import { parseTimelineOperations } from "./parse-timeline-operations.js";
function isKnowledgePath(path2) {
  if (!path2) return false;
  return KNOWLEDGE_PATH_RE.test(path2);
}
function basename(path2) {
  if (!path2) return path2;
  const normalized = path2.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
}
function extractPathFromArgs(toolArgs) {
  if (!toolArgs) return void 0;
  const parsed = tryParseJson$1(toolArgs);
  if (!isRecord(parsed)) return void 0;
  const obj = parsed;
  const candidate = obj.path ?? obj.file_path ?? obj.filePath;
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
function toItem(path2, kind) {
  return {
    name: basename(path2),
    path: path2,
    kind: kind ?? inferFileKind(path2),
  };
}
function mediaTypeToKind(value) {
  if (value === "image" || value === "video" || value === "audio") return value;
  return void 0;
}
function extractMediaKindFromRecord(record2) {
  const metadata = isRecord(record2.metadata) ? record2.metadata : void 0;
  return mediaTypeToKind(
    record2.media_type ??
      record2.type ??
      metadata?.media_type ??
      metadata?.type,
  );
}
function extractMediaPathFromRecord(record2) {
  const metadata = isRecord(record2.metadata) ? record2.metadata : void 0;
  const semantic = isRecord(record2.semantic) ? record2.semantic : void 0;
  const candidate =
    record2.file_path ??
    record2.filePath ??
    record2.file ??
    record2.path ??
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
  const seen2 = new Set();
  const result = [];
  for (const path2 of paths) {
    if (seen2.has(path2)) continue;
    seen2.add(path2);
    result.push(path2);
  }
  return result;
}
function extractMediaPathsFromArgs(toolArgs) {
  if (!toolArgs) return [];
  const parsed = tryParseJson$1(toolArgs);
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
function dedupe$1(items) {
  const seen2 = new Set();
  const result = [];
  for (const item of items) {
    if (seen2.has(item.path)) continue;
    seen2.add(item.path);
    result.push(item);
  }
  return result;
}
function extractMediaItemsFromResult(toolResult) {
  if (!toolResult) return [];
  const parsed = tryParseJson$1(toolResult.trim());
  const records = collectMediaResultRecords(parsed);
  if (records.length === 0) return [];
  return dedupe$1(
    records
      .map((record2) => {
        const path2 = extractMediaPathFromRecord(record2);
        return path2
          ? toItem(path2, extractMediaKindFromRecord(record2))
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
    (path2) => resultItemByPath.get(path2) ?? toItem(path2),
  );
  return dedupe$1([...orderedItems, ...resultItems]);
}
function extractFileChipItems(toolName2, toolArgs, toolResult) {
  if (!toolName2) return [];
  const activityKind = getFileActivityKind(toolName2);
  if (activityKind === "read") {
    const path2 = extractPathFromArgs(toolArgs);
    return path2 ? [toItem(path2)] : [];
  }
  if (activityKind === "analyseMedia") {
    return extractMediaAnalysisItems(toolArgs, toolResult);
  }
  return [];
}
function tryParseJson(raw2) {
  try {
    return JSON.parse(raw2);
  } catch {
    return void 0;
  }
}
const SINGLE_TERM_FIELDS = ["pattern", "query", "keyword", "q"];
function dedupe(values3) {
  const seen2 = new Set();
  const result = [];
  for (const value of values3) {
    if (seen2.has(value)) continue;
    seen2.add(value);
    result.push(value);
  }
  return result;
}
function extractSearchChips(toolName2, toolArgs, _toolResult) {
  if (!toolName2 || !toolArgs) return [];
  const parsed = tryParseJson(toolArgs);
  if (!parsed || typeof parsed !== "object") return [];
  const obj = parsed;
  const chips = [];
  if (Array.isArray(obj.queries)) {
    for (const entry of obj.queries) {
      if (typeof entry === "string") {
        const trimmed = entry.trim();
        if (trimmed) chips.push(trimmed);
      } else if (entry && typeof entry === "object") {
        const q2 = entry.query;
        if (typeof q2 === "string" && q2.trim()) chips.push(q2.trim());
      }
    }
  }
  for (const field of SINGLE_TERM_FIELDS) {
    const value = obj[field];
    if (typeof value === "string" && value.trim()) chips.push(value.trim());
  }
  return dedupe(chips);
}
function mergeTimelineOperations(operations) {
  const merged = [];
  for (const operation of operations) {
    const key2 = timelineOperationTargetKey(operation);
    const previous2 = merged[merged.length - 1];
    if (key2 && previous2 && timelineOperationTargetKey(previous2) === key2) {
      merged[merged.length - 1] = {
        ...operation,
        inputSummary:
          operation.displayNameKnown || !previous2.displayNameKnown
            ? operation.inputSummary
            : previous2.inputSummary,
        displayNameKnown:
          operation.displayNameKnown || previous2.displayNameKnown,
        count: previous2.count + operation.count,
      };
      continue;
    }
    merged.push(operation);
  }
  return merged;
}
export function aggregateTimelineRuns(entries2) {
  const result = [];
  let i2 = 0;
  const hasConfirm = (entry) =>
    !!entry.pendingConfirm || !!entry.rejectedConfirm;
  const toCountOnlyEntry = (entry, members) => ({
    ...entry,
    toolArgs: void 0,
    toolResult: void 0,
    aggregatedCount: members.length,
    ...(entry.category === "execute"
      ? {
          aggregatedCommands: members.flatMap(({ id: id2, toolArgs }) => {
            const command2 = parseJsonRecord(toolArgs)?.command;
            return typeof command2 === "string" && command2.trim()
              ? [
                  {
                    id: id2,
                    command: command2,
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
              id: id2,
              toolName: toolName2,
              toolStatus,
              toolArgs,
              toolResult,
            }) => ({
              id: id2,
              toolName: toolName2,
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
  while (i2 < entries2.length) {
    const entry = entries2[i2];
    if (entry.type === "thinking") {
      const thinkingBlocks = [];
      let j2 = i2;
      while (j2 < entries2.length && entries2[j2].type === "thinking") {
        const content2 = entries2[j2].thinkingContent;
        if (content2) thinkingBlocks.push(content2);
        j2++;
      }
      result.push({
        ...entry,
        thinkingContent:
          thinkingBlocks.length > 0
            ? thinkingBlocks.join("\n\n")
            : entry.thinkingContent,
      });
      i2 = j2;
      continue;
    }
    if (
      entry.type === "tool" &&
      (entry.category === "read" || entry.category === "analyseMedia")
    ) {
      const files = [];
      const seen2 = new Set();
      const preservesLifecycle = entry.category === "analyseMedia";
      const status = preservesLifecycle
        ? (entry.toolStatus ?? "pending")
        : "ok";
      let j2 = i2;
      while (
        j2 < entries2.length &&
        entries2[j2].type === "tool" &&
        entries2[j2].category === entry.category &&
        (!preservesLifecycle ||
          (entries2[j2].toolStatus ?? "pending") === status)
      ) {
        const member = entries2[j2];
        for (const item of extractFileChipItems(
          member.toolName ?? "",
          member.toolArgs,
          member.toolResult,
        )) {
          if (isKnowledgePath(item.path)) continue;
          if (seen2.has(item.path)) continue;
          seen2.add(item.path);
          files.push(item);
        }
        j2++;
      }
      if (files.length > 0) {
        result.push({
          ...entry,
          toolStatus: status,
          aggregatedFiles: files,
        });
      }
      i2 = j2;
      continue;
    }
    if (entry.type === "tool" && entry.toolName === "hub_capability_search") {
      result.push(entry);
      i2++;
      continue;
    }
    if (entry.type === "tool" && entry.category === "search") {
      if (entry.toolStatus === "error") {
        result.push(entry);
        i2++;
        continue;
      }
      const chips = [];
      const seen2 = new Set();
      let j2 = i2;
      while (
        j2 < entries2.length &&
        entries2[j2].type === "tool" &&
        entries2[j2].category === "search" &&
        entries2[j2].toolName !== "hub_capability_search" &&
        entries2[j2].toolStatus !== "error"
      ) {
        const member = entries2[j2];
        for (const term of extractSearchChips(
          member.toolName ?? "",
          member.toolArgs,
          member.toolResult,
        )) {
          if (seen2.has(term)) continue;
          seen2.add(term);
          chips.push(term);
        }
        j2++;
      }
      if (chips.length > 0) {
        result.push({
          ...entry,
          toolStatus: "ok",
          aggregatedSearchChips: chips,
        });
      }
      i2 = j2;
      continue;
    }
    if (
      entry.type === "tool" &&
      (entry.category === "canvas" || entry.category === "plan")
    ) {
      if (hasConfirm(entry)) {
        const operationEntry2 = toTimelineOperationEntry(entry, [entry]);
        if (operationEntry2) result.push(operationEntry2);
        i2++;
        continue;
      }
      const status = entry.toolStatus ?? "pending";
      const members = [entry];
      let j2 = i2 + 1;
      while (
        j2 < entries2.length &&
        entries2[j2].type === "tool" &&
        entries2[j2].category === entry.category &&
        (entries2[j2].toolStatus ?? "pending") === status &&
        !hasConfirm(entries2[j2])
      ) {
        members.push(entries2[j2]);
        j2++;
      }
      const operationEntry = toTimelineOperationEntry(entry, members);
      if (operationEntry) result.push(operationEntry);
      i2 = j2;
      continue;
    }
    if (
      entry.type === "tool" &&
      (entry.category === "execute" || entry.category === "process")
    ) {
      if (hasConfirm(entry)) {
        result.push(toCountOnlyEntry(entry, [entry]));
        i2++;
        continue;
      }
      const status = entry.toolStatus ?? "pending";
      const members = [entry];
      let j2 = i2 + 1;
      while (
        j2 < entries2.length &&
        entries2[j2].type === "tool" &&
        entries2[j2].category === entry.category &&
        (entries2[j2].toolStatus ?? "pending") === status &&
        !hasConfirm(entries2[j2])
      ) {
        members.push(entries2[j2]);
        j2++;
      }
      result.push(toCountOnlyEntry(entry, members));
      i2 = j2;
      continue;
    }
    result.push(entry);
    i2++;
  }
  return result;
}
