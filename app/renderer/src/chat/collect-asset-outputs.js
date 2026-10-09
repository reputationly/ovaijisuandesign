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

function normalizeKey(raw2) {
  const segments = raw2.replace(/\\/g, "/").split("/").filter(Boolean);
  return segments.length >= 2
    ? `${segments[segments.length - 2]}/${segments[segments.length - 1]}`
    : (segments[segments.length - 1] ?? raw2);
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

export function parseJsonPayload(raw2) {
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

export function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : void 0;
}

export function inferArtifactTypeFromPath(path2) {
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
  return ["finished", "succeeded", "success", "completed", "ok"].includes(
    status,
  );
}

export function isTaskTool(toolName2) {
  return toolName2.trim() === "task";
}

const RECOVERED_ITEM_RE = /^\d+\.\s*(image|video|audio)\s*·\s*(.+)$/;

export function addArtifact(seen2, out, type2, url2, metadata = {}) {
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

export function collectAssetOutputs(payload, seen2, out) {
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

export function collectFromTaskResultText(toolName2, rawResult, seen2, out) {
  if (!isTaskTool(toolName2) || !rawResult) return;
  TASK_RESULT_PATH_FIELD_RE.lastIndex = 0;
  for (const match2 of rawResult.matchAll(TASK_RESULT_PATH_FIELD_RE)) {
    const path2 = match2[1]?.trim();
    if (!path2) continue;
    const type2 = inferArtifactTypeFromPath(path2);
    if (type2) addArtifact(seen2, out, type2, path2);
  }
}

export function collectFromRecoveredText(content2, seen2, out) {
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
