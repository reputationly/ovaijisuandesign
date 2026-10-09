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
      for (const p3 of parsed.paths) {
        if (typeof p3 === "string" && p3.length > 0 && !p3.startsWith("["))
          paths.push(p3);
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

function textArtifactPath(result) {
  return typeof result.path === "string" && result.path.trim()
    ? result.path.trim()
    : void 0;
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

function collectCanvasTextArtifacts(
  toolName2,
  argsPayload,
  resultPayload,
  seen2,
  out,
) {
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

export function collectFromToolPayload(
  toolName2,
  argsPayload,
  payload,
  seen2,
  out,
) {
  collectCanvasTextArtifacts(toolName2, argsPayload, payload, seen2, out);
  const cat = categorizeToolAction(toolName2);
  if (
    MEDIA_GEN_CATEGORIES.has(cat) ||
    getToolLabelId(toolName2) === "contentProcess"
  ) {
    const fallbackMediaType = mediaTypeFromCategory(
      resolveMediaTaskCategory(toolName2),
    );
    for (const p3 of extractPathsFromPayload(payload)) {
      addArtifact(
        seen2,
        out,
        inferArtifactTypeFromPath(p3) ?? fallbackMediaType,
        p3,
      );
    }
    collectAssetOutputs(payload, seen2, out);
    return;
  }
}
