// collapse-replayed-sub-message-sequences.jsx
import { reactExports, useTranslation } from "../vendor.js";
import { useResolveMediaUrl, withThumbnail } from "../m15/deferred-thumbnail-image-generation.jsx";
import { getToolLabelId, resolveMediaTaskCategory, isToolRecoveredInterrupted, hasSuccessfulMediaOutput, isGenerationFailureNonTerminal, categorizeToolAction } from "../m15/save-chat-rating.js";
import {
  stripContextPrefix,
  isRecoveredMessage,
  RECOVERED_ASSET_LINE_PREFIX,
  isResumeChildPrompt,
} from "../m01/myers-line-hunks.js";
import { inferArtifactMime } from "../m10/topbar-provider.jsx";
import { subMessageSemanticKey } from "../m08/part-store.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { AudioArtifactChip } from "./domestic-param-labels.jsx";
import { parseToolResult } from "./use-chat-rating.js";
export function SubImage({ sub }) {
  const { t: t2 } = useTranslation();
  const [error, setError] = reactExports.useState(false);
  const resolveMediaUrl2 = useResolveMediaUrl();
  const src = resolveMediaUrl2(sub.url) ?? sub.content;
  const thumbSrc = withThumbnail(src, 300);
  if (error || !src)
    return <div className="text-xs text-muted-foreground">{t2("chat.imageUnavailable")}</div>;
  const mime = inferArtifactMime(src, "image");
  return (
    <img
      data-action-ui-id="chat-generated-image"
      data-artifact-type="image"
      data-artifact-path={src}
      data-artifact-mime={mime}
      src={thumbSrc}
      alt={t2("chat.generatedContent")}
      className="rounded-lg max-w-full h-auto"
      style={{
        maxWidth: 300,
      }}
      onError={() => setError(true)}
    />
  );
}
export function SubVideo({ sub }) {
  const { t: t2 } = useTranslation();
  const [error, setError] = reactExports.useState(false);
  const resolveMediaUrl2 = useResolveMediaUrl();
  const src = resolveMediaUrl2(sub.url) ?? sub.content;
  if (error || !src)
    return <div className="text-xs text-muted-foreground">{t2("chat.videoUnavailable")}</div>;
  const mime = inferArtifactMime(src, "video");
  return (
    // biome-ignore lint/a11y/useMediaCaption: generated video sub-message
    <video
      data-action-ui-id="chat-artifact-video"
      data-artifact-type="video"
      data-artifact-path={src}
      data-artifact-mime={mime}
      src={src}
      controls={true}
      className="rounded-lg max-w-full h-auto"
      style={{
        maxWidth: 300,
      }}
      onError={() => setError(true)}
    />
  );
}
export function SubAudio({ sub }) {
  const { t: t2 } = useTranslation();
  const resolveMediaUrl2 = useResolveMediaUrl();
  const src = resolveMediaUrl2(sub.url) ?? sub.content;
  if (!src)
    return <div className="text-xs text-muted-foreground">{t2("chat.audioUnavailable")}</div>;
  return <AudioArtifactChip src={src} originalSrc={sub.url ?? sub.content} />;
}
const MEDIA_GEN_CATEGORIES = new Set(["imageGen", "videoGen", "videoEdit", "audioGen", "musicGen"]);
const ASYNC_TASK_COMPLETED_PREFIX = "Async task completed:\n";
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "m4a", "ogg", "flac", "aac"]);
const CANVAS_WRITE_NODE_RE = /(?:^|_)canvas_write_node$/;
const TASK_RESULT_PATH_FIELD_RE =
  /\b(?:image_path|video_path|audio_path|file_path|path)\s*[:=]\s*["'“”]?([^"',，\n\r;；]+?\.(?:png|jpg|jpeg|gif|webp|svg|mp4|webm|mov|m4v|mp3|wav|m4a|ogg|flac|aac|md|txt))(?=["'”]?(?:\s|[,，;；]|$))/giu;
function normalizeKey(raw2) {
  const segments = raw2.replace(/\\/g, "/").split("/").filter(Boolean);
  return segments.length >= 2
    ? `${segments[segments.length - 2]}/${segments[segments.length - 1]}`
    : (segments[segments.length - 1] ?? raw2);
}
function mediaTypeFromCategory(category) {
  if (category === "imageGen") return "image";
  if (category === "videoGen" || category === "videoEdit") return "video";
  return "audio";
}
function parseJsonPayload(raw2) {
  if (!raw2) return void 0;
  const trimmed = raw2.trim();
  if (!trimmed) return void 0;
  for (const candidate of jsonCandidates(trimmed)) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }
  return void 0;
}
function jsonCandidates(raw2) {
  const candidates2 = [raw2];
  const objectStart = raw2.indexOf("{");
  const objectEnd = raw2.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates2.push(raw2.slice(objectStart, objectEnd + 1));
  }
  const arrayStart = raw2.indexOf("[");
  const arrayEnd = raw2.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    candidates2.push(raw2.slice(arrayStart, arrayEnd + 1));
  }
  return candidates2;
}
function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
function extractPathsFromPayload(payload) {
  const parsed = asRecord(payload);
  if (!parsed) return [];
  try {
    const paths = [];
    if (Array.isArray(parsed?.paths)) {
      for (const p3 of parsed.paths) {
        if (typeof p3 === "string" && p3.length > 0 && !p3.startsWith("[")) paths.push(p3);
      }
    } else if (Array.isArray(parsed?.results)) {
      for (const r2 of parsed.results) {
        if (Array.isArray(r2?.paths)) {
          for (const p3 of r2.paths) {
            if (typeof p3 === "string") paths.push(p3);
          }
        } else if (typeof r2?.path === "string") {
          paths.push(r2.path);
        }
      }
    } else if (typeof parsed?.path === "string" && parsed.path.length > 0) {
      paths.push(parsed.path);
    }
    return paths;
  } catch {
    return [];
  }
}
function inferArtifactTypeFromPath(path2) {
  const clean = path2.split("?")[0]?.split("#")[0] ?? "";
  const dot2 = clean.lastIndexOf(".");
  if (dot2 < 0) return void 0;
  const ext = clean.slice(dot2 + 1).toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  if (AUDIO_EXTENSIONS.has(ext)) return "audio";
  if (ext === "md" || ext === "txt") return "file";
  return void 0;
}
function isSuccessfulAssetStatus(status) {
  if (typeof status !== "string") return true;
  return ["finished", "succeeded", "success", "completed", "ok"].includes(status);
}
function collectAssetOutputs(payload, seen2, out) {
  const parsed = asRecord(payload);
  if (!parsed) return;
  const assetOutputs = parsed.asset_outputs;
  if (Array.isArray(assetOutputs)) {
    for (const item of assetOutputs) {
      const asset = asRecord(item);
      if (!asset || !isSuccessfulAssetStatus(asset.status)) continue;
      const source = typeof asset.local_path === "string" ? asset.local_path : asset.url;
      if (typeof source !== "string" || source.length === 0) continue;
      const type2 = inferArtifactTypeFromPath(source);
      if (!type2) continue;
      addArtifact(seen2, out, type2, source);
    }
  }
  if (Array.isArray(parsed.runs)) {
    for (const run2 of parsed.runs) {
      collectAssetOutputs(run2, seen2, out);
    }
  }
}
function isTaskTool(toolName2) {
  return toolName2.trim() === "task";
}
function isCanvasTextWriteTool(toolName2) {
  return CANVAS_WRITE_NODE_RE.test(toolName2);
}
function textArtifactPath(result) {
  return typeof result.path === "string" && result.path.trim() ? result.path.trim() : void 0;
}
function collectTextWriteResult(result, seen2, out) {
  if (result.ok === false || result.created !== true) return;
  const path2 = textArtifactPath(result);
  if (!path2) return;
  const nodeId = typeof result.nodeId === "string" ? result.nodeId : void 0;
  const assetId = typeof result.assetId === "string" ? result.assetId : void 0;
  addArtifact(seen2, out, "file", path2, {
    ...(assetId
      ? {
          assetId,
        }
      : {}),
    ...(nodeId
      ? {
          nodeIds: [nodeId],
        }
      : {}),
  });
}
function collectCanvasTextArtifacts(toolName2, argsPayload, resultPayload, seen2, out) {
  const args = asRecord(argsPayload);
  const result = asRecord(resultPayload);
  if (!result) return;
  if (!CANVAS_WRITE_NODE_RE.test(toolName2)) return;
  if (Array.isArray(result.results)) {
    for (const item of result.results) {
      const itemResult = asRecord(item);
      if (!itemResult || itemResult.kind !== "text") continue;
      collectTextWriteResult(itemResult, seen2, out);
    }
    return;
  }
  if (result.kind === "text" || args?.kind === "text") {
    collectTextWriteResult(result, seen2, out);
  }
}
function collectFromToolPayload(toolName2, argsPayload, payload, seen2, out) {
  collectCanvasTextArtifacts(toolName2, argsPayload, payload, seen2, out);
  const cat = categorizeToolAction(toolName2);
  if (MEDIA_GEN_CATEGORIES.has(cat) || getToolLabelId(toolName2) === "contentProcess") {
    const fallbackMediaType = mediaTypeFromCategory(resolveMediaTaskCategory(toolName2));
    for (const p3 of extractPathsFromPayload(payload)) {
      addArtifact(seen2, out, inferArtifactTypeFromPath(p3) ?? fallbackMediaType, p3);
    }
    collectAssetOutputs(payload, seen2, out);
    return;
  }
}
function collectFromTaskResultText(toolName2, rawResult, seen2, out) {
  if (!isTaskTool(toolName2) || !rawResult) return;
  TASK_RESULT_PATH_FIELD_RE.lastIndex = 0;
  for (const match2 of rawResult.matchAll(TASK_RESULT_PATH_FIELD_RE)) {
    const path2 = match2[1]?.trim();
    if (!path2) continue;
    const type2 = inferArtifactTypeFromPath(path2);
    if (type2) addArtifact(seen2, out, type2, path2);
  }
}
function collectFromAsyncTaskText(content2, seen2, out) {
  if (!content2.startsWith(ASYNC_TASK_COMPLETED_PREFIX)) return;
  const payload = parseJsonPayload(content2.slice(ASYNC_TASK_COMPLETED_PREFIX.length));
  collectAssetOutputs(payload, seen2, out);
}
const RECOVERED_ITEM_RE = /^\d+\.\s*(image|video|audio)\s*·\s*(.+)$/;
function collectFromRecoveredText(content2, seen2, out) {
  const normalized = stripContextPrefix(content2).trimStart();
  if (!isRecoveredMessage(normalized)) return;
  for (const line of normalized.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith(RECOVERED_ASSET_LINE_PREFIX)) {
      const path2 = trimmed.slice(RECOVERED_ASSET_LINE_PREFIX.length).trim();
      if (!path2) continue;
      const type2 = inferArtifactTypeFromPath(path2);
      if (type2) addArtifact(seen2, out, type2, path2);
      continue;
    }
    const m3 = RECOVERED_ITEM_RE.exec(trimmed);
    if (m3) {
      const path2 = m3[2].trim();
      if (path2) addArtifact(seen2, out, m3[1], path2);
    }
  }
}
function addArtifact(seen2, out, type2, url2, metadata = {}) {
  const key2 = normalizeKey(url2);
  if (seen2.has(key2)) return;
  seen2.add(key2);
  out.push({
    type: type2,
    path: key2,
    url: url2,
    ...metadata,
  });
}
function extractToolNameFromSubContent(content2) {
  const colonIdx = content2.indexOf(": ");
  return colonIdx > 0 ? content2.slice(0, colonIdx) : content2;
}
function extractToolResultFromSubContent(content2) {
  const colonIdx = content2.indexOf(": ");
  return colonIdx > 0 ? content2.slice(colonIdx + 2) : void 0;
}
function collectFromSubMessages(subs, seen2, out) {
  for (const sub of subs) {
    if (sub.type === "image" || sub.type === "video" || sub.type === "audio") {
      const url2 = sub.url ?? sub.content;
      if (url2) addArtifact(seen2, out, sub.type, url2);
      continue;
    }
    if (sub.type === "text") {
      collectFromRecoveredText(sub.content, seen2, out);
      continue;
    }
    if (sub.type === "tool") {
      const toolName2 = extractToolNameFromSubContent(sub.content);
      const status = sub.toolStatus ?? "ok";
      if (status !== "ok") continue;
      const result = extractToolResultFromSubContent(sub.content);
      if (!result) continue;
      collectFromTaskResultText(toolName2, result, seen2, out);
      collectFromToolPayload(
        toolName2,
        parseJsonPayload(sub.args),
        parseJsonPayload(result),
        seen2,
        out,
      );
      continue;
    }
    if (sub.type === "sub_agent" && sub.subMessages) {
      collectFromSubMessages(sub.subMessages, seen2, out);
    }
  }
}
function collectFallbackFromSubMessages(subs, seen2, out) {
  collectFromSubMessages(subs, seen2, out);
}
export function collectFallbackTurnArtifacts(messages2) {
  const seen2 = new Set();
  const out = [];
  for (const msg of messages2) {
    if (msg.type === "tool") {
      const toolMsg = msg;
      const toolName2 = toolMsg.toolName?.trim() || toolMsg.content;
      if (
        toolMsg.toolStatus !== "ok" ||
        !toolMsg.toolResult ||
        (!isCanvasTextWriteTool(toolName2) && !isTaskTool(toolName2))
      ) {
        continue;
      }
      collectFromTaskResultText(toolName2, toolMsg.toolResult, seen2, out);
      collectFromToolPayload(
        toolName2,
        parseJsonPayload(toolMsg.toolArgs),
        parseJsonPayload(toolMsg.toolResult),
        seen2,
        out,
      );
      continue;
    }
    if (msg.type === "text" && msg.role === "user") {
      collectFromAsyncTaskText(msg.content, seen2, out);
      collectFromRecoveredText(msg.content, seen2, out);
      continue;
    }
    if (msg.type === "sub_agent") {
      const sub = msg;
      if (sub.subMessages) collectFallbackFromSubMessages(sub.subMessages, seen2, out);
    }
  }
  return out;
}
function collectArtifactsFromSubMessages(subs) {
  if (!subs?.length) return [];
  const seen2 = new Set();
  const out = [];
  collectFromSubMessages(subs, seen2, out);
  return out;
}
function isOutputProducingTool(toolName2) {
  const labelId = getToolLabelId(toolName2);
  return labelId === "mediaGen" || labelId === "contentProcess";
}
function isFailedGenerationResult(result) {
  if (!result) return false;
  try {
    const parsed = JSON.parse(result);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
    const record2 = parsed;
    const requestGroupUnavailable =
      typeof record2.error === "string" && record2.error.includes("REQUEST_GROUP_UNAVAILABLE");
    return (
      record2.ok === false ||
      record2.success === false ||
      record2.is_error === true ||
      requestGroupUnavailable
    );
  } catch {
    return /^\s*(?:\w*(?:Error|Exception)\s*:|REQUEST_GROUP_UNAVAILABLE\b)/i.test(result);
  }
}
export function subAgentHasError(subs) {
  if (!subs?.length) return false;
  let generationError = false;
  let hasOkGeneration = false;
  const walk = (list2) => {
    for (const s2 of list2) {
      if (s2.type === "tool") {
        const parsed = parseToolResult(s2.content);
        if (isOutputProducingTool(parsed.name)) {
          const failedResult = isFailedGenerationResult(parsed.result);
          if (
            (s2.toolStatus === "error" || failedResult) &&
            !isGenerationFailureNonTerminal(parsed.result) &&
            !isToolRecoveredInterrupted(parsed.result) &&
            !hasSuccessfulMediaOutput(parsed.result)
          ) {
            generationError = true;
          } else if (s2.toolStatus === "ok" && !failedResult) {
            hasOkGeneration = true;
          }
        }
      }
      if (s2.subMessages?.length) walk(s2.subMessages);
    }
  };
  walk(subs);
  if (!generationError) return false;
  if (hasOkGeneration) return false;
  return collectArtifactsFromSubMessages(subs).length === 0;
}
export const SUB_AGENT_TIMELINE_ICON_STROKE_WIDTH = 1.24;
const MIN_REPLAY_SEQUENCE_LENGTH = 3;
export const IN_PROGRESS_AGENT_KEYS = new Set(["planner", "executor", "excutor"]);
export function dropResumePrompts(subs) {
  return subs.filter((s2) => !isResumeChildPrompt(s2.content ?? ""));
}
function replayBlocksMatch(keys2, firstStart, secondStart, length2) {
  for (let offset2 = 0; offset2 < length2; offset2++) {
    if (keys2[firstStart + offset2] !== keys2[secondStart + offset2]) return false;
  }
  return true;
}
export function collapseReplayedSubMessageSequences(messages2) {
  const keys2 = messages2.map(subMessageSemanticKey);
  const result = [];
  let index2 = 0;
  while (index2 < messages2.length) {
    let bestLength = 0;
    let bestRepeatCount = 1;
    let bestRemovedCount = 0;
    const maxLength = Math.floor((messages2.length - index2) / 2);
    for (let length2 = MIN_REPLAY_SEQUENCE_LENGTH; length2 <= maxLength; length2++) {
      let repeatCount = 1;
      while (
        index2 + (repeatCount + 1) * length2 <= messages2.length &&
        replayBlocksMatch(keys2, index2, index2 + repeatCount * length2, length2)
      ) {
        repeatCount++;
      }
      const removedCount = (repeatCount - 1) * length2;
      if (removedCount <= bestRemovedCount) continue;
      bestLength = length2;
      bestRepeatCount = repeatCount;
      bestRemovedCount = removedCount;
    }
    if (bestRepeatCount > 1) {
      result.push(...messages2.slice(index2, index2 + bestLength));
      index2 += bestLength * bestRepeatCount;
      continue;
    }
    result.push(messages2[index2]);
    index2++;
  }
  return result;
}
