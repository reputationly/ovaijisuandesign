// use-tool-confirm-settlement.js
import {
  isToolCancelInterrupted,
  normalizeJsonToolResult,
  resolveToolInterruption,
} from "./has-structured-success-payload.js";
import { isTransientTool } from "../generation/use-tool-confirm-edit-state.js";
import { reactExports } from "../vendor.js";

export function parseToolResult(content) {
  if (!content)
    return {
      name: "",
    };
  const colonIdx = content.indexOf(": ");
  if (colonIdx > 0) {
    return {
      name: content.slice(0, colonIdx),
      result: content.slice(colonIdx + 2),
    };
  }
  if (content.endsWith(":"))
    return {
      name: content.slice(0, -1),
    };
  return {
    name: content,
  };
}

function isTerminalComfyUiRunResult(message, toolName) {
  if (
    toolName !== "hub_run_comfyui_workflow" ||
    message.toolStatus !== "ok"
  ) {
    return false;
  }
  const encodedResult =
    message.toolResult ??
    (message.content ? parseToolResult(message.content).result : void 0);
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

export function filterSupersededTransientTools(messages, getToolName) {
  let hasLaterVisibleMessage = false;
  const result = [];
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    const toolName = getToolName(message);
    const transient = message.type === "tool" && isTransientTool(toolName);
    const durableComfyUiResult = isTerminalComfyUiRunResult(
      message,
      toolName,
    );
    if (!transient || !hasLaterVisibleMessage || durableComfyUiResult)
      result.push(message);
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

export function resolveDispatcherSeriesLabel(toolName, vendor, mediaModels) {
  if (!toolName || !vendor || !mediaModels) return void 0;
  const vendorMap =
    toolName === IMAGE_DISPATCHER_TOOL
      ? IMAGE_VENDOR_TO_MODEL_IDS
      : toolName === VIDEO_DISPATCHER_TOOL
        ? VIDEO_VENDOR_TO_MODEL_IDS
        : void 0;
  if (!vendorMap) return void 0;
  for (const candidateId of vendorMap[vendor] ?? []) {
    const matchedModel = mediaModels.find((mediaModel) => mediaModel.id === candidateId);
    if (matchedModel?.display_name) return matchedModel.display_name;
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

export function getToolStatusLabel(status, translate, toolResult, interruption) {
  if (!status || status === "pending") return translate("chat.statusPending");
  if (status === "ok") return translate("chat.statusDone");
  if (status === "error") {
    if (
      isToolCancelInterrupted(toolResult) ||
      resolveToolInterruption(toolResult, interruption)
    ) {
      return translate("chat.statusInterrupted");
    }
    return translate("chat.statusError");
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
        Object.entries(parsed).filter(([argumentKey]) => !INTERNAL_ARG_KEYS.has(argumentKey)),
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

function subToolMatchesConfirm(subMessage, confirmationAsk) {
  if (subMessage.type !== "tool") return false;
  const targetTool = confirmationAsk.toolConfirmData?.tool;
  if (!targetTool) return false;
  return parseToolResult(subMessage.content ?? "").name === targetTool;
}

function subAgentMatchesConfirm(message, confirmationAsk) {
  if (message.type !== "sub_agent") return false;
  return (message.subMessages ?? []).some((subMessage) =>
    subToolMatchesConfirm(subMessage, confirmationAsk),
  );
}

function topLevelToolMatchesConfirm(message, confirmationAsk) {
  if (message.type !== "tool") return false;
  const targetTool = confirmationAsk.toolConfirmData?.tool;
  if (!targetTool) return false;
  return (
    (message.toolName ?? parseToolResult(message.content).name) === targetTool
  );
}

export function findToolConfirmOwningSubAgent(messages, confirmationAsk) {
  let askIndex = messages.indexOf(confirmationAsk);
  if (askIndex < 0)
    askIndex = messages.findIndex((message) => message.id === confirmationAsk.id);
  if (askIndex < 0) askIndex = messages.length;
  for (let index = askIndex - 1; index >= 0; index -= 1) {
    const candidate = messages[index];
    if (!candidate) continue;
    if (topLevelToolMatchesConfirm(candidate, confirmationAsk)) return void 0;
    if (subAgentMatchesConfirm(candidate, confirmationAsk)) return candidate;
  }
  return void 0;
}

function isComfyUISubAgentConfirm(message, transcript) {
  return (
    findToolConfirmOwningSubAgent(transcript, message)?.agent === COMFYUI_AGENT
  );
}

export function getPendingToolConfirms(messages) {
  return messages.filter(
    (message) =>
      message.type === "tool_confirm_ask" &&
      !message.resolved &&
      !message.expired,
  );
}

export function getMiniBarToolConfirms(messages, transcript) {
  return messages.filter(
    (message) => !isComfyUISubAgentConfirm(message, transcript),
  );
}

export function getLatestInlineToolConfirmId(messages, transcript) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message && isComfyUISubAgentConfirm(message, transcript))
      return message.id;
  }
  return void 0;
}

function requiresAsyncApproval(message) {
  return ASYNC_APPROVAL_TOOLS.has(message.toolConfirmData?.tool ?? "");
}

export function aggregateToolConfirmApprovalState(messages, approvalState) {
  let checking = false;
  for (const message of messages) {
    const requestId = message.requestId;
    const state = requestId ? approvalState[requestId] : void 0;
    if (state === "blocked") return "blocked";
    if (
      state === "checking" ||
      (requiresAsyncApproval(message) && state === void 0)
    ) {
      checking = true;
    }
  }
  return checking ? "checking" : "ready";
}

export function canApproveAllToolConfirms(messages, approvalState, edits) {
  if (aggregateToolConfirmApprovalState(messages, approvalState) !== "ready")
    return false;
  return messages.every((message) => {
    if (!requiresAsyncApproval(message)) return true;
    const requestId = message.requestId;
    return Boolean(
      requestId && approvalState[requestId] === "ready" && edits[requestId],
    );
  });
}

const TOOL_CONFIRM_SETTLEMENT_ACK_TIMEOUT_MS = 5e3;

export function useToolConfirmSettlement({
  messages,
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
    setSubmittingIds((current) => {
      if (!current.has(requestId)) return current;
      const next = new Set(current);
      next.delete(requestId);
      return next;
    });
    return true;
  }, []);
  const submit = reactExports.useCallback(
    (requestId, sessionId, send) => {
      if (submissionsRef.current.has(requestId)) return false;
      const timer = setTimeout(() => {
        if (!removeSubmission(requestId)) return;
        if (
          isPresentedRef.current &&
          (!sessionId || focusedSessionIdRef.current === sessionId)
        ) {
          ackTimeoutRef.current();
        }
      }, TOOL_CONFIRM_SETTLEMENT_ACK_TIMEOUT_MS);
      submissionsRef.current.set(requestId, {
        timer,
      });
      setSubmittingIds((current) => new Set(current).add(requestId));
      const sent = send();
      if (!sent) removeSubmission(requestId);
      return sent;
    },
    [removeSubmission],
  );
  reactExports.useEffect(() => {
    const actionableIds = new Set(
      getPendingToolConfirms(messages)
        .map((message) => message.requestId)
        .filter((requestId) => Boolean(requestId)),
    );
    for (const requestId of submissionsRef.current.keys()) {
      if (!actionableIds.has(requestId)) removeSubmission(requestId);
    }
  }, [messages, removeSubmission]);
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
