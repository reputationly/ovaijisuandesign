// use-tool-confirm-settlement.js
import {
  isToolCancelInterrupted,
  normalizeJsonToolResult,
  resolveToolInterruption,
} from "./has-structured-success-payload.js";
import { isTransientTool } from "../generation/use-tool-confirm-edit-state.js";
import { reactExports } from "../vendor.js";

export function parseToolResult(content2) {
  if (!content2)
    return {
      name: "",
    };
  const colonIdx = content2.indexOf(": ");
  if (colonIdx > 0) {
    return {
      name: content2.slice(0, colonIdx),
      result: content2.slice(colonIdx + 2),
    };
  }
  if (content2.endsWith(":"))
    return {
      name: content2.slice(0, -1),
    };
  return {
    name: content2,
  };
}

function isTerminalComfyUiRunResult(message2, toolName2) {
  if (
    toolName2 !== "hub_run_comfyui_workflow" ||
    message2.toolStatus !== "ok"
  ) {
    return false;
  }
  const encodedResult =
    message2.toolResult ??
    (message2.content ? parseToolResult(message2.content).result : void 0);
  if (!encodedResult) return false;
  try {
    const parsed = JSON.parse(normalizeJsonToolResult(encodedResult));
    return (
      !!parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      parsed.terminal === true
    );
  } catch {
    return false;
  }
}

export function filterSupersededTransientTools(messages2, getToolName) {
  let hasLaterVisibleMessage = false;
  const result = [];
  for (let index2 = messages2.length - 1; index2 >= 0; index2--) {
    const message2 = messages2[index2];
    const toolName2 = getToolName(message2);
    const transient = message2.type === "tool" && isTransientTool(toolName2);
    const durableComfyUiResult = isTerminalComfyUiRunResult(
      message2,
      toolName2,
    );
    if (!transient || !hasLaterVisibleMessage || durableComfyUiResult)
      result.push(message2);
    hasLaterVisibleMessage = true;
  }
  return result.reverse();
}

export function registryMediaTypeForCategory(category) {
  switch (category) {
    case "imageGen":
      return "image";
    case "videoGen":
    case "videoEdit":
      return "video";
    case "audioGen":
    case "musicGen":
      return "audio";
    default:
      return void 0;
  }
}

const IMAGE_VENDOR_TO_MODEL_IDS = {
  // Legacy series aliases retained for old catalog/session compatibility.
  banana: ["banana", "nano-banana"],
  seedream: ["seedream"],
  // OpenAI image vendor is unified to "gpt-image" across regions (agent-facing
  // token). UI media_model.id still differs per region — domestic ships
  // "g-image-2", overseas ships "openai-image" — so list both so the chip
  // resolves the right region's display_name.
  "gpt-image": ["openai-image", "g-image-2", "gpt-image"],
  midjourney: ["midjourney"],
  // Kling image models are retired from the generation surface (2026-08);
  // this legacy-display alias stays so chips in OLD sessions still resolve.
  // image-side picker id was "kling-image" (not bare "kling" which is the
  // video-side picker id).
  kling: ["kling-image", "kling"],
};

const VIDEO_VENDOR_TO_MODEL_IDS = {
  MiniMax: ["MiniMax-H3", "MiniMax"],
  // Veo video vendor is unified to "veo3" across regions (agent-facing token).
  // UI media_model.id still differs per region — domestic ships "beta",
  // overseas ships "veo3" — so list both for region-correct display_name.
  veo3: ["veo3", "beta"],
  seedance: ["seedance"],
  wan: ["wan"],
  // video-side picker id is bare "kling".
  kling: ["kling"],
};

export const IMAGE_DISPATCHER_TOOL = "hub_generate_image";

export const VIDEO_DISPATCHER_TOOL = "hub_generate_video";

export function resolveDispatcherSeriesLabel(toolName2, vendor, mediaModels) {
  if (!toolName2 || !vendor || !mediaModels) return void 0;
  const vendorMap =
    toolName2 === IMAGE_DISPATCHER_TOOL
      ? IMAGE_VENDOR_TO_MODEL_IDS
      : toolName2 === VIDEO_DISPATCHER_TOOL
        ? VIDEO_VENDOR_TO_MODEL_IDS
        : void 0;
  if (!vendorMap) return void 0;
  for (const candidateId of vendorMap[vendor] ?? []) {
    const hit = mediaModels.find((m3) => m3.id === candidateId);
    if (hit?.display_name) return hit.display_name;
  }
  return void 0;
}

export const VIDEO_QUALITY_VALUE_DISPLAY_MAP = new Map([
  ["std", "720P"],
  ["pro", "1080P"],
  ["4k", "4K"],
]);

const HIDDEN_VIDEO_GENERATION_MODES = new Set(["t2v", "i2v"]);

export function isHiddenVideoGenerationMode(value) {
  return HIDDEN_VIDEO_GENERATION_MODES.has(value);
}

export function getToolStatusLabel(status, t2, toolResult, interruption) {
  if (!status || status === "pending") return t2("chat.statusPending");
  if (status === "ok") return t2("chat.statusDone");
  if (status === "error") {
    if (
      isToolCancelInterrupted(toolResult) ||
      resolveToolInterruption(toolResult, interruption)
    ) {
      return t2("chat.statusInterrupted");
    }
    return t2("chat.statusError");
  }
  return status;
}

const INTERNAL_ARG_KEYS = new Set([
  "_session_id",
  "_tool_use_id",
  "_user_override_note",
]);

export function formatArgs(args) {
  try {
    const parsed = JSON.parse(args);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const filtered = Object.fromEntries(
        Object.entries(parsed).filter(([k2]) => !INTERNAL_ARG_KEYS.has(k2)),
      );
      return JSON.stringify(filtered, null, 2);
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return args;
  }
}

const ASYNC_APPROVAL_TOOLS = new Set([
  "hub_run_comfyui_workflow",
  "hub_edit_comfyui_workflow",
]);

const COMFYUI_AGENT = "comfyui-agent";

function subToolMatchesConfirm(sub, ask) {
  if (sub.type !== "tool") return false;
  const targetTool = ask.toolConfirmData?.tool;
  if (!targetTool) return false;
  return parseToolResult(sub.content ?? "").name === targetTool;
}

function subAgentMatchesConfirm(message2, ask) {
  if (message2.type !== "sub_agent") return false;
  return (message2.subMessages ?? []).some((sub) =>
    subToolMatchesConfirm(sub, ask),
  );
}

function topLevelToolMatchesConfirm(message2, ask) {
  if (message2.type !== "tool") return false;
  const targetTool = ask.toolConfirmData?.tool;
  if (!targetTool) return false;
  return (
    (message2.toolName ?? parseToolResult(message2.content).name) === targetTool
  );
}

export function findToolConfirmOwningSubAgent(messages2, ask) {
  let askIndex = messages2.indexOf(ask);
  if (askIndex < 0)
    askIndex = messages2.findIndex((message2) => message2.id === ask.id);
  if (askIndex < 0) askIndex = messages2.length;
  for (let index2 = askIndex - 1; index2 >= 0; index2 -= 1) {
    const candidate = messages2[index2];
    if (!candidate) continue;
    if (topLevelToolMatchesConfirm(candidate, ask)) return void 0;
    if (subAgentMatchesConfirm(candidate, ask)) return candidate;
  }
  return void 0;
}

function isComfyUISubAgentConfirm(message2, transcript) {
  return (
    findToolConfirmOwningSubAgent(transcript, message2)?.agent === COMFYUI_AGENT
  );
}

export function getPendingToolConfirms(messages2) {
  return messages2.filter(
    (message2) =>
      message2.type === "tool_confirm_ask" &&
      !message2.resolved &&
      !message2.expired,
  );
}

export function getMiniBarToolConfirms(messages2, transcript) {
  return messages2.filter(
    (message2) => !isComfyUISubAgentConfirm(message2, transcript),
  );
}

export function getLatestInlineToolConfirmId(messages2, transcript) {
  for (let index2 = messages2.length - 1; index2 >= 0; index2 -= 1) {
    const message2 = messages2[index2];
    if (message2 && isComfyUISubAgentConfirm(message2, transcript))
      return message2.id;
  }
  return void 0;
}

function requiresAsyncApproval(message2) {
  return ASYNC_APPROVAL_TOOLS.has(message2.toolConfirmData?.tool ?? "");
}

export function aggregateToolConfirmApprovalState(messages2, approvalState) {
  let checking = false;
  for (const message2 of messages2) {
    const requestId = message2.requestId;
    const state2 = requestId ? approvalState[requestId] : void 0;
    if (state2 === "blocked") return "blocked";
    if (
      state2 === "checking" ||
      (requiresAsyncApproval(message2) && state2 === void 0)
    ) {
      checking = true;
    }
  }
  return checking ? "checking" : "ready";
}

export function canApproveAllToolConfirms(messages2, approvalState, edits) {
  if (aggregateToolConfirmApprovalState(messages2, approvalState) !== "ready")
    return false;
  return messages2.every((message2) => {
    if (!requiresAsyncApproval(message2)) return true;
    const requestId = message2.requestId;
    return Boolean(
      requestId && approvalState[requestId] === "ready" && edits[requestId],
    );
  });
}

const TOOL_CONFIRM_SETTLEMENT_ACK_TIMEOUT_MS = 5e3;

export function useToolConfirmSettlement({
  messages: messages2,
  isPresented,
  focusedSessionId,
  onAckTimeout,
}) {
  const submissionsRef = reactExports.useRef(new Map());
  const isPresentedRef = reactExports.useRef(isPresented);
  const focusedSessionIdRef = reactExports.useRef(focusedSessionId);
  const ackTimeoutRef = reactExports.useRef(onAckTimeout);
  const [submittingIds, setSubmittingIds] = reactExports.useState(
    () => new Set(),
  );
  isPresentedRef.current = isPresented;
  focusedSessionIdRef.current = focusedSessionId;
  ackTimeoutRef.current = onAckTimeout;
  const removeSubmission = reactExports.useCallback((requestId) => {
    const submission = submissionsRef.current.get(requestId);
    if (!submission) return false;
    clearTimeout(submission.timer);
    submissionsRef.current.delete(requestId);
    setSubmittingIds((current2) => {
      if (!current2.has(requestId)) return current2;
      const next2 = new Set(current2);
      next2.delete(requestId);
      return next2;
    });
    return true;
  }, []);
  const submit = reactExports.useCallback(
    (requestId, sessionId, send2) => {
      if (submissionsRef.current.has(requestId)) return false;
      const timer2 = setTimeout(() => {
        if (!removeSubmission(requestId)) return;
        if (
          isPresentedRef.current &&
          (!sessionId || focusedSessionIdRef.current === sessionId)
        ) {
          ackTimeoutRef.current();
        }
      }, TOOL_CONFIRM_SETTLEMENT_ACK_TIMEOUT_MS);
      submissionsRef.current.set(requestId, {
        timer: timer2,
      });
      setSubmittingIds((current2) => new Set(current2).add(requestId));
      const sent = send2();
      if (!sent) removeSubmission(requestId);
      return sent;
    },
    [removeSubmission],
  );
  reactExports.useEffect(() => {
    const actionableIds = new Set(
      getPendingToolConfirms(messages2)
        .map((message2) => message2.requestId)
        .filter((requestId) => Boolean(requestId)),
    );
    for (const requestId of submissionsRef.current.keys()) {
      if (!actionableIds.has(requestId)) removeSubmission(requestId);
    }
  }, [messages2, removeSubmission]);
  reactExports.useEffect(
    () => () => {
      for (const submission of submissionsRef.current.values()) {
        clearTimeout(submission.timer);
      }
      submissionsRef.current.clear();
    },
    [],
  );
  const isSubmitting = reactExports.useCallback(
    (requestId) => requestId !== void 0 && submittingIds.has(requestId),
    [submittingIds],
  );
  return {
    isSubmitting,
    submit,
    submittingIds,
  };
}
