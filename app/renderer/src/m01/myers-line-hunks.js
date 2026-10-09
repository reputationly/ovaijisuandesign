// myers-line-hunks.js
import { CONNECTOR_TOKEN_SOURCE } from "../vendor.js";
import { detectFileType } from "../m15/relayout-group-children.js";
const CANCELLED_MESSAGE_TEXT = "[Request interrupted by user]";
const CANCELLED_WITH_CANVAS_CONTINUATION_TEXT =
  "[Request interrupted by user — generation continues on canvas]";
const CANVAS_HANDOFF_MARKER_PREFIX = `${CANCELLED_WITH_CANVAS_CONTINUATION_TEXT}
[HILO_CANVAS_HANDOFF_V1]`;
const MAX_CANVAS_HANDOFF_TARGETS = 32;
function isCanvasGenerationHandoffTarget(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const target = value;
  return (
    typeof target.node_id === "string" &&
    target.node_id.length > 0 &&
    (target.media_type === "image" ||
      target.media_type === "video" ||
      target.media_type === "audio" ||
      target.media_type === "text") &&
    (target.tool_use_id === void 0 || typeof target.tool_use_id === "string") &&
    (target.child_session_id === void 0 || typeof target.child_session_id === "string") &&
    (target.generation_attempt_id === void 0 || typeof target.generation_attempt_id === "string")
  );
}
export function parseCanvasGenerationHandoffTargets(text2) {
  const normalized = text2.trim();
  if (!normalized.startsWith(CANVAS_HANDOFF_MARKER_PREFIX)) return [];
  try {
    const parsed = JSON.parse(normalized.slice(CANVAS_HANDOFF_MARKER_PREFIX.length));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCanvasGenerationHandoffTarget).slice(0, MAX_CANVAS_HANDOFF_TARGETS);
  } catch {
    return [];
  }
}
const CANVAS_HANDOFF_METADATA_KEY = "hilo_canvas_handoff";
export function parseCanvasGenerationHandoffTargetsFromMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const raw2 = metadata[CANVAS_HANDOFF_METADATA_KEY];
  if (!Array.isArray(raw2)) return [];
  return raw2.filter(isCanvasGenerationHandoffTarget).slice(0, MAX_CANVAS_HANDOFF_TARGETS);
}
const CANCEL_MARKER_TEXTS = [CANCELLED_MESSAGE_TEXT, CANCELLED_WITH_CANVAS_CONTINUATION_TEXT];
export function isCancelMarkerText(text2) {
  const normalized = text2.trim();
  return (
    CANCEL_MARKER_TEXTS.some((marker) => marker === normalized) ||
    normalized.startsWith(CANVAS_HANDOFF_MARKER_PREFIX)
  );
}
export function cancelMarkerHasCanvasContinuation(text2) {
  const normalized = text2.trim();
  return (
    normalized === CANCELLED_WITH_CANVAS_CONTINUATION_TEXT ||
    normalized.startsWith(CANVAS_HANDOFF_MARKER_PREFIX)
  );
}
const RECOVERED_MESSAGE_PREFIX = "[系统恢复]";
const RECOVERED_MESSAGE_PREFIX_EN = "[System Recovery]";
export const RECOVERED_ASSET_LINE_PREFIX = "RECOVERED_ASSET:";
const RECOVERED_MESSAGE_PREFIXES = [RECOVERED_MESSAGE_PREFIX, RECOVERED_MESSAGE_PREFIX_EN];
export function isRecoveredMessage(text2) {
  const trimmed = text2.trimStart();
  return RECOVERED_MESSAGE_PREFIXES.some((p3) => trimmed.startsWith(p3));
}
const RESUME_CHILD_PROMPT_ZH = `${RECOVERED_MESSAGE_PREFIX} 你之前中断的生成步骤已恢复，产物见上。请基于这些产物继续完成本任务剩余的步骤；若已全部完成，简要总结产物即可。`;
const RESUME_CHILD_PROMPT_EN = `${RECOVERED_MESSAGE_PREFIX_EN} The generation steps that were interrupted have been recovered; the products are shown above. Continue the remaining steps of this task based on them. If everything is already done, briefly summarize the products.`;
const RESUME_CHILD_PROMPTS = [RESUME_CHILD_PROMPT_ZH, RESUME_CHILD_PROMPT_EN];
export function isResumeChildPrompt(text2) {
  const normalized = stripContextPrefix(text2).trim();
  return RESUME_CHILD_PROMPTS.some((p3) => normalized === p3);
}
export function stripRecoveredPrefix(text2) {
  const trimmed = text2.trimStart();
  for (const p3 of RECOVERED_MESSAGE_PREFIXES) {
    if (trimmed.startsWith(p3)) return trimmed.slice(p3.length).trimStart();
  }
  return text2;
}
const CONTEXT_PREFIX_RE =
  /^(?:\[IM chat_id: [^\]]*\]\n)?(?:\[IM message_id: [^\]]*\]\n)?(?:\[CONTEXT [^\]]*\]\s*)?(?:\[HISTORY[\s\S]*?\[END HISTORY\]\s*)?(?:\[USER_MSG\][\s\S]*?\[\/USER_MSG\]\s*)?/;
export function stripContextPrefix(text2) {
  return text2.replace(CONTEXT_PREFIX_RE, "");
}
export const AGENT_LABELS = {
  main: "Main Agent",
  image: "Image Agent",
  video: "Video Agent",
  audio: "Audio Agent",
  editing: "Editing Agent",
};
export function diagnosticToolPart(part) {
  if (part.type !== "tool") return void 0;
  return {
    tool: part.tool,
    partId: part.id,
    callID: part.callID,
    status: part.state?.status,
  };
}
export function diagnosticChatTools(messages2) {
  const result = [];
  const visitChildren = (children2) => {
    for (const child of children2) {
      if (child.type === "tool")
        result.push({
          tool: child.content,
          callID: child.callID,
          status: child.toolStatus,
          scope: "child",
        });
      if (child.subMessages) visitChildren(child.subMessages);
    }
  };
  for (const message2 of messages2) {
    if (message2.type === "tool")
      result.push({
        tool: message2.content,
        partId: message2.partId,
        callID: message2.callID,
        status: message2.toolStatus,
      });
    if (message2.type === "sub_agent") {
      result.push({
        tool: "task",
        partId: message2.partId?.replace(/__sub_agent$/, ""),
        status: message2.resolved ? "completed" : "running",
      });
      visitChildren(message2.subMessages ?? []);
    }
  }
  return result;
}
export const CHAT_TASK_CATEGORIES = [
  "shortDrama",
  "filmEdit",
  "ecommerce",
  "adsMarketing",
  "mvMusic",
  "animation",
  "knowledge",
  "other",
];
export const CHAT_FEEDBACK_REASONS = [
  "misunderstood_request",
  "forgot_requirements",
  "misused_materials",
  "poor_quality",
  "incomplete_result",
  "slow_or_repeated_failures",
  "vague_or_unprofessional",
  "other",
];
export const CHAT_RATING_COMMENT_MAX_LENGTH = 1e3;
const CONNECTOR_TOKEN_RE = new RegExp(`^${CONNECTOR_TOKEN_SOURCE}`, "u");
export function parseConnectorMentionAt(text2, start2) {
  if (start2 > 0 && !/\s/u.test(text2.charAt(start2 - 1))) return void 0;
  const match2 = CONNECTOR_TOKEN_RE.exec(text2.slice(start2));
  if (!match2) return void 0;
  return {
    serverName: match2[1],
    ...(match2[2]
      ? {
          displayName: match2[2],
        }
      : {}),
    start: start2,
    end: start2 + match2[0].length,
  };
}
export function isCustomModelProvider(id2) {
  return /^user-custom-[a-z0-9-]+$/.test(id2 ?? "");
}
export function isCustomModelId(id2) {
  return isCustomModelProvider(id2?.split("/")[0]);
}
export const MEDIA_FILE_ACCEPT = {
  image: ".png,.jpg,.jpeg,.webp,.gif,.bmp,.heic,.heif,.avif",
  video: ".mp4,.mov,.avi,.mkv,.webm",
  audio: ".mp3,.wav,.aac,.flac,.ogg,.m4a",
  text: ".md,.txt",
  subtitle: ".srt,.vtt,.ass,.ssa",
  file: ".pdf,.docx,.csv,.xlsx,.pptx",
};
export const ALL_MEDIA_FILE_ACCEPT = "*/*";
export const SEEDANCE_REFERENCE_AUDIO_EXTS = [".mp3", ".wav"];
export const SEEDANCE_REFERENCE_AUDIO_MIN_SEC = 1.8;
export const SEEDANCE_REFERENCE_AUDIO_MAX_SEC = 15.2;
export const RESOURCE_DRAG_MIME = "application/x-hilo-resource";
export function parseResourceDrag(e2) {
  const raw2 = e2.dataTransfer?.getData(RESOURCE_DRAG_MIME);
  if (!raw2) return null;
  try {
    const parsed = JSON.parse(raw2);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const first2 = parsed[0];
    if (typeof first2.path !== "string" || typeof first2.absolutePath !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}
const VALID_MEDIA_TYPES = new Set(["image", "video", "audio", "text"]);
export function buildResourceDragItem(
  absolutePath,
  relativePath,
  name2,
  isDirectory,
  assetId,
  projectAsset,
) {
  const detected = isDirectory ? void 0 : detectFileType(name2);
  const type2 = detected && VALID_MEDIA_TYPES.has(detected) ? detected : "file";
  return {
    path: relativePath,
    absolutePath,
    name: name2,
    type: type2,
    isDirectory,
    ...(assetId != null && {
      assetId,
    }),
    ...(projectAsset != null && {
      projectAsset,
    }),
  };
}
export const TEXT_EDIT_SELECTION_MAX_LENGTH = 2e4;
const MYERS_MAX_D = 2e3;
export function myersLineHunks(oldLines, newLines) {
  let start2 = 0;
  const oldLen = oldLines.length;
  const newLen = newLines.length;
  while (start2 < oldLen && start2 < newLen && oldLines[start2] === newLines[start2]) start2 += 1;
  let oldEnd = oldLen;
  let newEnd = newLen;
  while (oldEnd > start2 && newEnd > start2 && oldLines[oldEnd - 1] === newLines[newEnd - 1]) {
    oldEnd -= 1;
    newEnd -= 1;
  }
  const a2 = oldLines.slice(start2, oldEnd);
  const b3 = newLines.slice(start2, newEnd);
  const n2 = a2.length;
  const m3 = b3.length;
  if (n2 === 0 && m3 === 0) return [];
  if (n2 === 0)
    return [
      {
        oldStart: start2,
        oldCount: 0,
        newStart: start2,
        newCount: m3,
      },
    ];
  if (m3 === 0)
    return [
      {
        oldStart: start2,
        oldCount: n2,
        newStart: start2,
        newCount: 0,
      },
    ];
  const max2 = Math.min(n2 + m3, MYERS_MAX_D);
  const offset2 = max2;
  let v2 = new Int32Array(2 * max2 + 2);
  const trace = [];
  let foundD = -1;
  for (let d2 = 0; d2 <= max2; d2 += 1) {
    trace.push(v2.slice());
    const next2 = v2.slice();
    for (let k2 = -d2; k2 <= d2; k2 += 2) {
      if (k2 < -max2 || k2 > max2) continue;
      let x22;
      if (k2 === -d2 || (k2 !== d2 && v2[k2 - 1 + offset2] < v2[k2 + 1 + offset2])) {
        x22 = v2[k2 + 1 + offset2];
      } else {
        x22 = v2[k2 - 1 + offset2] + 1;
      }
      let y22 = x22 - k2;
      while (x22 < n2 && y22 < m3 && a2[x22] === b3[y22]) {
        x22 += 1;
        y22 += 1;
      }
      next2[k2 + offset2] = x22;
      if (x22 >= n2 && y22 >= m3) {
        foundD = d2;
        break;
      }
    }
    v2 = next2;
    if (foundD >= 0) break;
  }
  if (foundD < 0) return null;
  const ops = [];
  let x2 = n2;
  let y4 = m3;
  for (let d2 = foundD; d2 > 0; d2 -= 1) {
    const prev = trace[d2];
    if (!prev) return null;
    const k2 = x2 - y4;
    let prevK;
    if (k2 === -d2 || (k2 !== d2 && prev[k2 - 1 + offset2] < prev[k2 + 1 + offset2])) {
      prevK = k2 + 1;
    } else {
      prevK = k2 - 1;
    }
    const prevX = prev[prevK + offset2];
    const prevY = prevX - prevK;
    while (x2 > prevX && y4 > prevY) {
      ops.push("equal");
      x2 -= 1;
      y4 -= 1;
    }
    if (x2 === prevX) {
      ops.push("insert");
      y4 -= 1;
    } else {
      ops.push("delete");
      x2 -= 1;
    }
  }
  while (x2 > 0 && y4 > 0) {
    ops.push("equal");
    x2 -= 1;
    y4 -= 1;
  }
  while (x2 > 0) {
    ops.push("delete");
    x2 -= 1;
  }
  while (y4 > 0) {
    ops.push("insert");
    y4 -= 1;
  }
  ops.reverse();
  const hunks = [];
  let oldLine = start2;
  let newLine = start2;
  let current2 = null;
  for (const op of ops) {
    if (op === "equal") {
      if (current2) {
        hunks.push(current2);
        current2 = null;
      }
      oldLine += 1;
      newLine += 1;
      continue;
    }
    current2 ??= {
      oldStart: oldLine,
      oldCount: 0,
      newStart: newLine,
      newCount: 0,
    };
    if (op === "delete") {
      current2.oldCount += 1;
      oldLine += 1;
    } else {
      current2.newCount += 1;
      newLine += 1;
    }
  }
  if (current2) hunks.push(current2);
  return hunks;
}
export function coarseLineHunk(oldLines, newLines) {
  let start2 = 0;
  const oldLen = oldLines.length;
  const newLen = newLines.length;
  while (start2 < oldLen && start2 < newLen && oldLines[start2] === newLines[start2]) start2 += 1;
  let oldEnd = oldLen;
  let newEnd = newLen;
  while (oldEnd > start2 && newEnd > start2 && oldLines[oldEnd - 1] === newLines[newEnd - 1]) {
    oldEnd -= 1;
    newEnd -= 1;
  }
  if (oldEnd === start2 && newEnd === start2) return null;
  return {
    oldStart: start2,
    oldCount: oldEnd - start2,
    newStart: start2,
    newCount: newEnd - start2,
  };
}
function isWorkspaceRelativeMediaPath(path2) {
  if (!path2 || typeof path2 !== "string") return false;
  const trimmed = path2.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  if (trimmed.startsWith("/files/")) return false;
  if (trimmed.includes("..")) return false;
  return true;
}
function isAsrAudioInput(mediaPath, mediaType) {
  return false;
}
function mediakitLanguage(language2) {
  if (language2 === "en") return "en";
  if (language2 === "auto") return "auto";
  return "zh";
}
export function buildAsrGatewayRequest(input) {
  const { mediaPath, filename, sourceNodeId } = input;
  if (!isWorkspaceRelativeMediaPath(mediaPath)) {
    return {
      ok: false,
      reason: "invalid_path",
    };
  }
  const isAudio = isAsrAudioInput();
  const base2 = {
    filename,
    ...(sourceNodeId
      ? {
          source_node_id: sourceNodeId,
        }
      : {}),
  };
  const pathField = isAudio
    ? {
        audio_path: mediaPath,
      }
    : {
        video_path: mediaPath,
      };
  const language2 = input.language ?? "zh";
  if (language2 === "other") {
    return {
      ok: true,
      route: "whisper",
      request: {
        ...base2,
        ...pathField,
      },
    };
  }
  return {
    ok: true,
    route: "mediakit",
    request: {
      ...base2,
      ...pathField,
      language: mediakitLanguage(language2),
    },
  };
}
export const ENHANCE_IMAGE_INPUT_SHORT_MIN = 256;
export const ENHANCE_IMAGE_INPUT_LONG_MAX = 2048;
export const ENHANCE_IMAGE_INPUT_LONG_HARD_MAX = 3072;
export const ENHANCE_IMAGE_INPUT_MAX_ASPECT =
  ENHANCE_IMAGE_INPUT_LONG_MAX / ENHANCE_IMAGE_INPUT_SHORT_MIN;
export function longEdge$1(width, height) {
  if (!width || !height || width <= 0 || height <= 0) return void 0;
  return Math.max(width, height);
}
