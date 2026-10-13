// extract-paths-from-payload.js
import {
  addArtifact,
  asRecord,
  CANVAS_WRITE_NODE_RE,
  collectAssetOutputs,
  inferArtifactTypeFromPath,
} from "./collect-asset-outputs.js";
import {
  categorizeToolAction,
  getToolLabelId,
  resolveMediaTaskCategory,
} from "./has-structured-success-payload.js";

const MEDIA_GEN_CATEGORIES = new Set([
  "imageGen",
  "videoGen",
  "videoEdit",
  "audioGen",
  "musicGen",
]);

function mediaTypeFromCategory(category) {
  if (category === "imageGen") return "image";
  if (category === "videoGen" || category === "videoEdit") return "video";
  return "audio";
}

function extractPathsFromPayload(payload) {
  const parsed = asRecord(payload);
  if (!parsed) return [];
  try {
    const paths = [];
    if (Array.isArray(parsed?.paths)) {
      for (const path of parsed.paths) {
        if (typeof path === "string" && path.length > 0 && !path.startsWith("["))
          paths.push(path);
      }
    } else if (Array.isArray(parsed?.results)) {
      for (const result of parsed.results) {
        if (Array.isArray(result?.paths)) {
          for (const path of result.paths) {
            if (typeof path === "string") paths.push(path);
          }
        } else if (typeof result?.path === "string") {
          paths.push(result.path);
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

function textArtifactPath(result) {
  return typeof result.path === "string" && result.path.trim()
    ? result.path.trim()
    : void 0;
}

function collectTextWriteResult(result, seen2, artifacts) {
  if (result.ok === false || result.created !== true) return;
  const path2 = textArtifactPath(result);
  if (!path2) return;
  const nodeId = typeof result.nodeId === "string" ? result.nodeId : void 0;
  const assetId = typeof result.assetId === "string" ? result.assetId : void 0;
  addArtifact(seen2, artifacts, "file", path2, {
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

function collectCanvasTextArtifacts(
  toolName2,
  argsPayload,
  resultPayload,
  seen2,
  artifacts,
) {
  const args = asRecord(argsPayload);
  const result = asRecord(resultPayload);
  if (!result) return;
  if (!CANVAS_WRITE_NODE_RE.test(toolName2)) return;
  if (Array.isArray(result.results)) {
    for (const item of result.results) {
      const itemResult = asRecord(item);
      if (!itemResult || itemResult.kind !== "text") continue;
      collectTextWriteResult(itemResult, seen2, artifacts);
    }
    return;
  }
  if (result.kind === "text" || args?.kind === "text") {
    collectTextWriteResult(result, seen2, artifacts);
  }
}

export function collectFromToolPayload(
  toolName2,
  argsPayload,
  payload,
  seen2,
  artifacts,
) {
  collectCanvasTextArtifacts(toolName2, argsPayload, payload, seen2, artifacts);
  const category = categorizeToolAction(toolName2);
  if (
    MEDIA_GEN_CATEGORIES.has(category) ||
    getToolLabelId(toolName2) === "contentProcess"
  ) {
    const fallbackMediaType = mediaTypeFromCategory(
      resolveMediaTaskCategory(toolName2),
    );
    for (const path of extractPathsFromPayload(payload)) {
      addArtifact(
        seen2,
        artifacts,
        inferArtifactTypeFromPath(path) ?? fallbackMediaType,
        path,
      );
    }
    collectAssetOutputs(payload, seen2, artifacts);
    return;
  }
}
