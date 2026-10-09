// build-asr-gateway-request.js
import { detectFileType } from "../canvas/diagnostic-history-tools.js";
import { CONNECTOR_TOKEN_SOURCE } from "../vendor.js";

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
    (target.child_session_id === void 0 ||
      typeof target.child_session_id === "string") &&
    (target.generation_attempt_id === void 0 ||
      typeof target.generation_attempt_id === "string")
  );
}

export function parseCanvasGenerationHandoffTargets(text2) {
  const normalized = text2.trim();
  if (!normalized.startsWith(CANVAS_HANDOFF_MARKER_PREFIX)) return [];
  try {
    const parsed = JSON.parse(
      normalized.slice(CANVAS_HANDOFF_MARKER_PREFIX.length),
    );
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isCanvasGenerationHandoffTarget)
      .slice(0, MAX_CANVAS_HANDOFF_TARGETS);
  } catch {
    return [];
  }
}

const CANVAS_HANDOFF_METADATA_KEY = "hilo_canvas_handoff";

export function parseCanvasGenerationHandoffTargetsFromMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    return [];
  const raw2 = metadata[CANVAS_HANDOFF_METADATA_KEY];
  if (!Array.isArray(raw2)) return [];
  return raw2
    .filter(isCanvasGenerationHandoffTarget)
    .slice(0, MAX_CANVAS_HANDOFF_TARGETS);
}

const CANCEL_MARKER_TEXTS = [
  CANCELLED_MESSAGE_TEXT,
  CANCELLED_WITH_CANVAS_CONTINUATION_TEXT,
];

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

const RECOVERED_MESSAGE_PREFIXES = [
  RECOVERED_MESSAGE_PREFIX,
  RECOVERED_MESSAGE_PREFIX_EN,
];

export function isRecoveredMessage(text2) {
  const trimmed = text2.trimStart();
  return RECOVERED_MESSAGE_PREFIXES.some((p3) => trimmed.startsWith(p3));
}

const RESUME_CHILD_PROMPT_ZH = `${RECOVERED_MESSAGE_PREFIX} 你之前中断的生成步骤已恢复，产物见上。请基于这些产物继续完成本任务剩余的步骤；若已全部完成，简要总结产物即可。`;

const RESUME_CHILD_PROMPT_EN = `${RECOVERED_MESSAGE_PREFIX_EN} The generation steps that were interrupted have been recovered; the products are shown above. Continue the remaining steps of this task based on them. If everything is already done, briefly summarize the products.`;

const RESUME_CHILD_PROMPTS = [RESUME_CHILD_PROMPT_ZH, RESUME_CHILD_PROMPT_EN];

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

export function isResumeChildPrompt(text2) {
  const normalized = stripContextPrefix(text2).trim();
  return RESUME_CHILD_PROMPTS.some((p3) => normalized === p3);
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
    if (
      typeof first2.path !== "string" ||
      typeof first2.absolutePath !== "string"
    )
      return null;
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

export function coarseLineHunk(oldLines, newLines) {
  let start2 = 0;
  const oldLen = oldLines.length;
  const newLen = newLines.length;
  while (
    start2 < oldLen &&
    start2 < newLen &&
    oldLines[start2] === newLines[start2]
  )
    start2 += 1;
  let oldEnd = oldLen;
  let newEnd = newLen;
  while (
    oldEnd > start2 &&
    newEnd > start2 &&
    oldLines[oldEnd - 1] === newLines[newEnd - 1]
  ) {
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
