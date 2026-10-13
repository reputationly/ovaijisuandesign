// collect-asset-outputs.js
import {
  isRecoveredMessage,
  RECOVERED_ASSET_LINE_PREFIX,
  stripContextPrefix,
} from "../text-editor/build-asr-gateway-request.js";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);

const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v"]);

const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "m4a", "ogg", "flac", "aac"]);

export const CANVAS_WRITE_NODE_RE = /(?:^|_)canvas_write_node$/;

const TASK_RESULT_PATH_FIELD_RE =
  /\b(?:image_path|video_path|audio_path|file_path|path)\s*[:=]\s*["'“”]?([^"',，\n\r;；]+?\.(?:png|jpg|jpeg|gif|webp|svg|mp4|webm|mov|m4v|mp3|wav|m4a|ogg|flac|aac|md|txt))(?=["'”]?(?:\s|[,，;；]|$))/giu;

function normalizeKey(raw) {
  const segments = raw.replace(/\\/g, "/").split("/").filter(Boolean);
  return segments.length >= 2
    ? `${segments[segments.length - 2]}/${segments[segments.length - 1]}`
    : (segments[segments.length - 1] ?? raw);
}

function jsonCandidates(raw) {
  const candidates = [raw];
  const objectStart = raw.indexOf("{");
  const objectEnd = raw.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(raw.slice(objectStart, objectEnd + 1));
  }
  const arrayStart = raw.indexOf("[");
  const arrayEnd = raw.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    candidates.push(raw.slice(arrayStart, arrayEnd + 1));
  }
  return candidates;
}

export function parseJsonPayload(raw) {
  if (!raw) return void 0;
  const trimmed = raw.trim();
  if (!trimmed) return void 0;
  for (const candidate of jsonCandidates(trimmed)) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }
  return void 0;
}

export function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : void 0;
}

export function inferArtifactTypeFromPath(path) {
  const clean = path.split("?")[0]?.split("#")[0] ?? "";
  const dot = clean.lastIndexOf(".");
  if (dot < 0) return void 0;
  const extension = clean.slice(dot + 1).toLowerCase();
  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  if (AUDIO_EXTENSIONS.has(extension)) return "audio";
  if (extension === "md" || extension === "txt") return "file";
  return void 0;
}

function isSuccessfulAssetStatus(status) {
  if (typeof status !== "string") return true;
  return ["finished", "succeeded", "success", "completed", "ok"].includes(
    status,
  );
}

export function isTaskTool(toolName) {
  return toolName.trim() === "task";
}

const RECOVERED_ITEM_RE = /^\d+\.\s*(image|video|audio)\s*·\s*(.+)$/;

export function addArtifact(seen, artifacts, type, url, metadata = {}) {
  const key = normalizeKey(url);
  if (seen.has(key)) return;
  seen.add(key);
  artifacts.push({
    type,
    path: key,
    url,
    ...metadata,
  });
}

export function collectAssetOutputs(payload, seen, artifacts) {
  const parsed = asRecord(payload);
  if (!parsed) return;
  const assetOutputs = parsed.asset_outputs;
  if (Array.isArray(assetOutputs)) {
    for (const item of assetOutputs) {
      const asset = asRecord(item);
      if (!asset || !isSuccessfulAssetStatus(asset.status)) continue;
      const source =
        typeof asset.local_path === "string" ? asset.local_path : asset.url;
      if (typeof source !== "string" || source.length === 0) continue;
      const type = inferArtifactTypeFromPath(source);
      if (!type) continue;
      addArtifact(seen, artifacts, type, source);
    }
  }
  if (Array.isArray(parsed.runs)) {
    for (const run of parsed.runs) {
      collectAssetOutputs(run, seen, artifacts);
    }
  }
}

export function collectFromTaskResultText(toolName, rawResult, seen, artifacts) {
  if (!isTaskTool(toolName) || !rawResult) return;
  TASK_RESULT_PATH_FIELD_RE.lastIndex = 0;
  for (const match of rawResult.matchAll(TASK_RESULT_PATH_FIELD_RE)) {
    const path = match[1]?.trim();
    if (!path) continue;
    const type = inferArtifactTypeFromPath(path);
    if (type) addArtifact(seen, artifacts, type, path);
  }
}

export function collectFromRecoveredText(content, seen, artifacts) {
  const normalized = stripContextPrefix(content).trimStart();
  if (!isRecoveredMessage(normalized)) return;
  for (const line of normalized.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith(RECOVERED_ASSET_LINE_PREFIX)) {
      const path = trimmed.slice(RECOVERED_ASSET_LINE_PREFIX.length).trim();
      if (!path) continue;
      const type = inferArtifactTypeFromPath(path);
      if (type) addArtifact(seen, artifacts, type, path);
      continue;
    }
    const recoveredItemMatch = RECOVERED_ITEM_RE.exec(trimmed);
    if (recoveredItemMatch) {
      const path = recoveredItemMatch[2].trim();
      if (path) addArtifact(seen, artifacts, recoveredItemMatch[1], path);
    }
  }
}
