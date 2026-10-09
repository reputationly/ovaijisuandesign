// use-chat-rating.js
import { reactExports, useTranslation, dedupedToast, useQuery, useQueryClient, useMutation, useIsMutating } from "../vendor.js";
import { getSelectedRequestGroupId } from "../m15/agent-ws-client.jsx";
import { useAuth } from "../m15/apply-asset-change.jsx";
import { chatLog } from "../m15/graph.jsx";
import { normalizeJsonToolResult, isToolCancelInterrupted, resolveToolInterruption, saveChatRating } from "../m15/save-chat-rating.js";
import { useGatewayFetch, useGatewayScopeKey } from "../m15/use-resizable-width.js";
import {
  CHAT_FEEDBACK_REASONS,
  CHAT_TASK_CATEGORIES,
  CHAT_RATING_COMMENT_MAX_LENGTH,
} from "../m01/myers-line-hunks.js";
import { isTransientTool } from "./media-model-selector.jsx";
export function filterSupersededTransientTools(messages2, getToolName) {
  let hasLaterVisibleMessage = false;
  const result = [];
  for (let index2 = messages2.length - 1; index2 >= 0; index2--) {
    const message2 = messages2[index2];
    const toolName2 = getToolName(message2);
    const transient = message2.type === "tool" && isTransientTool(toolName2);
    const durableComfyUiResult = isTerminalComfyUiRunResult(message2, toolName2);
    if (!transient || !hasLaterVisibleMessage || durableComfyUiResult) result.push(message2);
    hasLaterVisibleMessage = true;
  }
  return result.reverse();
}
function isTerminalComfyUiRunResult(message2, toolName2) {
  if (toolName2 !== "hub_run_comfyui_workflow" || message2.toolStatus !== "ok") {
    return false;
  }
  const encodedResult =
    message2.toolResult ?? (message2.content ? parseToolResult(message2.content).result : void 0);
  if (!encodedResult) return false;
  try {
    const parsed = JSON.parse(normalizeJsonToolResult(encodedResult));
    return (
      !!parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.terminal === true
    );
  } catch {
    return false;
  }
}
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
export function parseTodos(args) {
  if (!args) return [];
  try {
    const parsed = JSON.parse(args);
    const todos = parsed?.todos ?? parsed;
    if (!Array.isArray(todos)) return [];
    return todos.filter(
      (item) =>
        typeof item?.content === "string" &&
        typeof item?.status === "string" &&
        typeof item?.priority === "string",
    );
  } catch {}
  return [];
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
const VIDEO_MODE_I18N_KEYS = new Map([
  ["first-last-frame", "chat.videoMode.firstLastFrame"],
  ["multimodal", "chat.videoMode.omniReference"],
  ["omni", "chat.videoMode.omniReference"],
  ["video-edit", "chat.videoMode.videoEdit"],
  ["video-extend", "chat.videoMode.videoExtend"],
  ["avatar", "chat.videoMode.avatar"],
]);
export function resolveVideoModeValueDisplay(value, t2) {
  const i18nKey = VIDEO_MODE_I18N_KEYS.get(value);
  if (!i18nKey) return value;
  return t2(i18nKey, {
    defaultValue: value,
  });
}
export function getToolStatusLabel(status, t2, toolResult, interruption) {
  if (!status || status === "pending") return t2("chat.statusPending");
  if (status === "ok") return t2("chat.statusDone");
  if (status === "error") {
    if (isToolCancelInterrupted(toolResult) || resolveToolInterruption(toolResult, interruption)) {
      return t2("chat.statusInterrupted");
    }
    return t2("chat.statusError");
  }
  return status;
}
const INTERNAL_ARG_KEYS = new Set(["_session_id", "_tool_use_id", "_user_override_note"]);
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
const ASYNC_APPROVAL_TOOLS = new Set(["hub_run_comfyui_workflow", "hub_edit_comfyui_workflow"]);
const COMFYUI_AGENT = "comfyui-agent";
function subToolMatchesConfirm(sub, ask) {
  if (sub.type !== "tool") return false;
  const targetTool = ask.toolConfirmData?.tool;
  if (!targetTool) return false;
  return parseToolResult(sub.content ?? "").name === targetTool;
}
function subAgentMatchesConfirm(message2, ask) {
  if (message2.type !== "sub_agent") return false;
  return (message2.subMessages ?? []).some((sub) => subToolMatchesConfirm(sub, ask));
}
function topLevelToolMatchesConfirm(message2, ask) {
  if (message2.type !== "tool") return false;
  const targetTool = ask.toolConfirmData?.tool;
  if (!targetTool) return false;
  return (message2.toolName ?? parseToolResult(message2.content).name) === targetTool;
}
export function findToolConfirmOwningSubAgent(messages2, ask) {
  let askIndex = messages2.indexOf(ask);
  if (askIndex < 0) askIndex = messages2.findIndex((message2) => message2.id === ask.id);
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
  return findToolConfirmOwningSubAgent(transcript, message2)?.agent === COMFYUI_AGENT;
}
export function getPendingToolConfirms(messages2) {
  return messages2.filter(
    (message2) => message2.type === "tool_confirm_ask" && !message2.resolved && !message2.expired,
  );
}
export function getMiniBarToolConfirms(messages2, transcript) {
  return messages2.filter((message2) => !isComfyUISubAgentConfirm(message2, transcript));
}
export function getLatestInlineToolConfirmId(messages2, transcript) {
  for (let index2 = messages2.length - 1; index2 >= 0; index2 -= 1) {
    const message2 = messages2[index2];
    if (message2 && isComfyUISubAgentConfirm(message2, transcript)) return message2.id;
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
    if (state2 === "checking" || (requiresAsyncApproval(message2) && state2 === void 0)) {
      checking = true;
    }
  }
  return checking ? "checking" : "ready";
}
export function canApproveAllToolConfirms(messages2, approvalState, edits) {
  if (aggregateToolConfirmApprovalState(messages2, approvalState) !== "ready") return false;
  return messages2.every((message2) => {
    if (!requiresAsyncApproval(message2)) return true;
    const requestId = message2.requestId;
    return Boolean(requestId && approvalState[requestId] === "ready" && edits[requestId]);
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
  const [submittingIds, setSubmittingIds] = reactExports.useState(() => new Set());
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
        if (isPresentedRef.current && (!sessionId || focusedSessionIdRef.current === sessionId)) {
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
function isRecord$4(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function buildChatRatingRequest(
  target,
  rating,
  reasons,
  category,
  comment2,
  locale,
  supersedesTicketId = "",
) {
  if (!target.sessionId || !target.requestId) throw new Error("Missing feedback turn identity");
  if (rating !== "up" && rating !== "down" && rating !== "none")
    throw new Error("Invalid feedback rating");
  const reasonCodes = CHAT_FEEDBACK_REASONS.filter((reason) => reasons.includes(reason));
  const taskCategory = CHAT_TASK_CATEGORIES.find((value) => value === category);
  if (
    rating === "down" &&
    (!taskCategory || reasonCodes.length === 0 || reasonCodes.length !== reasons.length)
  )
    throw new Error("Invalid dissatisfaction reasons or category");
  const event = {
    schema_version: 1,
    kind: "chat_feedback",
    event_id: crypto.randomUUID(),
    occurred_at: new Date().toISOString(),
    session_id: target.sessionId,
    request_id: target.requestId,
    rating,
    reason_codes: rating === "down" ? reasonCodes : [],
    task_category: rating === "down" ? (taskCategory ?? "") : "",
    comment:
      rating === "down" && reasonCodes.includes("other")
        ? comment2.trim().slice(0, CHAT_RATING_COMMENT_MAX_LENGTH)
        : "",
    supersedes_ticket_id: supersedesTicketId,
  };
  const userText = target.userText.slice(0, 24e3);
  const assistantText = target.assistantText.slice(0, 96e3);
  return {
    event,
    context: {
      ...event,
      request_context: {
        user_text: userText,
        assistant_text: assistantText,
        truncated: userText !== target.userText || assistantText !== target.assistantText,
      },
      session_archive_entry: rating === "none" ? null : "opencode-session.json",
    },
    locale,
  };
}
function captureChatRatingIdentity(userId) {
  const groupId2 = getSelectedRequestGroupId();
  return async () => {
    try {
      if (typeof __HILO_AUTH__ === "undefined") return false;
      const { user, tokens: tokens2 } = await __HILO_AUTH__.getStoredAuth();
      return (
        Boolean(tokens2.accessToken) &&
        user.userID === userId &&
        getSelectedRequestGroupId() === groupId2
      );
    } catch {
      return false;
    }
  };
}
function chatRatingStorageKey(workspaceKey, userId, sessionId) {
  return `hilo:chat-feedback:v1:${JSON.stringify([workspaceKey, userId, sessionId])}`;
}
function isRatingDetails(value) {
  return (
    isRecord$4(value) &&
    typeof value.request_id === "string" &&
    value.request_id.length > 0 &&
    (value.rating === "up" || value.rating === "down" || value.rating === "none") &&
    typeof value.comment === "string" &&
    (value.task_category === "" ||
      CHAT_TASK_CATEGORIES.some((category) => category === value.task_category)) &&
    Array.isArray(value.reason_codes) &&
    value.reason_codes.every((reason) => CHAT_FEEDBACK_REASONS.some((code2) => code2 === reason))
  );
}
function isRatingState(value) {
  return (
    isRecord$4(value) &&
    typeof value.ticket_id === "string" &&
    value.ticket_id.length > 0 &&
    isRatingDetails(value)
  );
}
function loadLocalChatRatings(key2) {
  try {
    const raw2 = localStorage.getItem(key2);
    if (!raw2) return [];
    const value = JSON.parse(raw2);
    return Array.isArray(value) ? value.filter(isRatingState) : [];
  } catch {
    chatLog.warn("Feedback acknowledgement cache could not be read");
    return [];
  }
}
function storeLocalChatRating(key2, rating) {
  try {
    const others = loadLocalChatRatings(key2).filter(
      (item) => item.request_id !== rating.request_id,
    );
    localStorage.setItem(key2, JSON.stringify([...others.slice(-999), rating]));
  } catch {
    chatLog.warn("Feedback saved, but its local acknowledgement could not be cached");
  }
}
function chatRatingRetryStorageKey(workspaceKey, userId, sessionId, groupId2) {
  return `hilo:chat-feedback-retry:v1:${JSON.stringify([workspaceKey, userId, sessionId, groupId2])}`;
}
function isPendingEvent(value) {
  return (
    isRecord$4(value) &&
    isRatingDetails(value) &&
    value.schema_version === 1 &&
    value.kind === "chat_feedback" &&
    typeof value.event_id === "string" &&
    value.event_id.length > 0 &&
    typeof value.occurred_at === "string" &&
    Number.isFinite(Date.parse(value.occurred_at)) &&
    typeof value.session_id === "string" &&
    value.session_id.length > 0 &&
    typeof value.supersedes_ticket_id === "string" &&
    typeof value.comment === "string" &&
    value.comment.length <= CHAT_RATING_COMMENT_MAX_LENGTH
  );
}
function pendingEvents(client2, key2) {
  const cached = client2.getQueryData(["chat-rating-retry", key2]);
  if (cached) return cached;
  try {
    const value = JSON.parse(localStorage.getItem(key2) ?? "[]");
    return Array.isArray(value) ? value.filter(isPendingEvent).slice(-1e3) : [];
  } catch {
    chatLog.warn("Feedback retry metadata could not be read");
    return [];
  }
}
function storePendingEvents(client2, key2, events2) {
  client2.setQueryData(["chat-rating-retry", key2], events2);
  try {
    if (events2.length === 0) localStorage.removeItem(key2);
    else localStorage.setItem(key2, JSON.stringify(events2));
  } catch {
    chatLog.warn("Feedback retry metadata could not be persisted");
  }
}
function prepareChatRatingRetry(client2, key2, candidate) {
  const events2 = pendingEvents(client2, key2);
  const previous2 = events2.find((event2) => event2.request_id === candidate.request_id);
  const event =
    previous2 &&
    previous2.session_id === candidate.session_id &&
    previous2.rating === candidate.rating &&
    previous2.task_category === candidate.task_category &&
    previous2.comment === candidate.comment &&
    previous2.supersedes_ticket_id === candidate.supersedes_ticket_id &&
    JSON.stringify(previous2.reason_codes) === JSON.stringify(candidate.reason_codes)
      ? previous2
      : candidate;
  const others = events2.filter((item) => item.request_id !== candidate.request_id);
  storePendingEvents(client2, key2, [...others.slice(-999), event]);
  return event;
}
function acknowledgeChatRatingRetry(client2, key2, eventId) {
  storePendingEvents(
    client2,
    key2,
    pendingEvents(client2, key2).filter((event) => event.event_id !== eventId),
  );
}
export function useChatRating(target) {
  const { user, isLoggedIn } = useAuth();
  const { t: t2, i18n } = useTranslation();
  const fetchFeedback = useGatewayFetch();
  const workspaceKey = useGatewayScopeKey();
  const queryClient2 = useQueryClient();
  const userId = isLoggedIn ? user?.userID : void 0;
  const queryKey = ["chat-ratings", workspaceKey, userId, target.sessionId];
  const storageKey2 = chatRatingStorageKey(workspaceKey, userId ?? "", target.sessionId);
  const mutationKey = [
    "chat-rating-submit",
    workspaceKey,
    userId,
    target.sessionId,
    target.requestId,
  ];
  const query = useQuery({
    queryKey,
    queryFn: () => loadLocalChatRatings(storageKey2),
    enabled: Boolean(userId),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
  const mutation = useMutation({
    mutationKey,
    retry: false,
    mutationFn: async (input) => {
      await input.client.cancelQueries({
        queryKey: input.queryKey,
      });
      return saveChatRating(
        input.fetchFeedback,
        input.target,
        input.request,
        input.isCurrentIdentity,
      );
    },
    onSuccess: async (ticketId, input) => {
      await input.client.cancelQueries({
        queryKey: input.queryKey,
      });
      const saved = {
        ticket_id: ticketId,
        request_id: input.target.requestId,
        rating: input.request.event.rating,
        reason_codes: input.request.event.reason_codes,
        task_category: input.request.event.task_category,
        comment: input.request.event.comment,
      };
      storeLocalChatRating(input.storageKey, saved);
      acknowledgeChatRatingRetry(input.client, input.retryStorageKey, input.request.event.event_id);
      input.client.setQueryData(input.queryKey, (previous2 = []) => [
        ...previous2.filter((item) => item.request_id !== input.target.requestId),
        saved,
      ]);
      if (await input.isCurrentIdentity()) dedupedToast.success(input.successMessage);
    },
    onError: async (_error, input) => {
      if (await input.isCurrentIdentity()) dedupedToast.error(input.errorMessage);
    },
  });
  const submitting =
    useIsMutating({
      mutationKey,
      exact: true,
    }) > 0;
  const submit = async (rating, reasons = [], category = "", comment2 = "") => {
    if (
      !userId ||
      queryClient2.isMutating({
        mutationKey,
        exact: true,
      }) > 0
    )
      return false;
    const capturedTarget = {
      ...target,
    };
    try {
      const retryStorageKey = chatRatingRetryStorageKey(
        workspaceKey,
        userId,
        capturedTarget.sessionId,
        getSelectedRequestGroupId(),
      );
      const request = buildChatRatingRequest(
        capturedTarget,
        rating,
        [...reasons],
        category,
        comment2,
        i18n.language,
        query.data?.find((item) => item.request_id === capturedTarget.requestId)?.ticket_id,
      );
      const event = prepareChatRatingRetry(queryClient2, retryStorageKey, request.event);
      await mutation.mutateAsync({
        client: queryClient2,
        queryKey,
        storageKey: storageKey2,
        retryStorageKey,
        target: capturedTarget,
        request: {
          ...request,
          event,
          context: {
            ...request.context,
            ...event,
          },
        },
        fetchFeedback,
        isCurrentIdentity: captureChatRatingIdentity(userId),
        successMessage: t2("chat.rating.saved"),
        errorMessage: t2("chat.rating.failed"),
      });
      return true;
    } catch {
      return false;
    }
  };
  return {
    current: query.data?.find((item) => item.request_id === target.requestId),
    submitting,
    submit,
    loading: Boolean(userId) && query.isPending,
    loadFailed: query.isError,
    retry: query.refetch,
    signedIn: Boolean(userId),
  };
}
