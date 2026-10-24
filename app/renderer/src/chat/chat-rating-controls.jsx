// chat-rating-controls.jsx
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MonochromeIcon } from "../media-editing/icon-compositing.js";
import { RotateCcw, ThumbsDown, ThumbsUp, X$7 as CloseIcon } from "../media-editing/lucide-icon-wraps.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { submitFeedback } from "../infra/submit-feedback.js";
import {
  chatLog,
  Tooltip,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import {
  CHAT_FEEDBACK_REASONS,
  CHAT_RATING_COMMENT_MAX_LENGTH,
  CHAT_TASK_CATEGORIES,
} from "../text-editor/build-asr-gateway-request.js";
import { getSelectedRequestGroupId } from "../infra/gateway-http-error.jsx";
import { Popover, useAuth } from "../assets/credit-query-keys.jsx";
import {
  useGatewayFetch,
  useGatewayScopeKey,
} from "../generation/use-model-catalog-scope-key.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { PopoverTrigger } from "../assets/gateway-scope-provider.jsx";
import {
  Button,
  mergeTailwindClasses as mergeClassNames,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import { Textarea } from "../infra/badge-variants.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
import { PopoverTitle } from "../canvas/popover-title.jsx";

export function isRecord$g(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const CHAT_MODEL_TRACES_PATH = "/api/chat/model-traces";
const CHAT_MODEL_TRACE_LOOKUP_LIMIT = 100;
const AUXILIARY_AGENTS = new Set(["title", "summary", "compaction"]);
function selectChatModelTraceForFeedback(traces) {
  return traces.find((trace) => !AUXILIARY_AGENTS.has(trace.agent));
}
function isChatModelTraceId(value) {
  return (
    typeof value === "string" &&
    /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(value)
  );
}
function isLabel(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= 256 &&
    Array.from(value).every((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
  );
}
function mapChatModelTrace(value) {
  if (
    !isRecord$g(value) ||
    !isChatModelTraceId(value.call_id) ||
    !isChatModelTraceId(value.session_id) ||
    !isChatModelTraceId(value.request_id) ||
    !isChatModelTraceId(value.trace_id) ||
    !isLabel(value.agent) ||
    !isLabel(value.model_id) ||
    typeof value.started_at !== "number" ||
    !Number.isSafeInteger(value.started_at) ||
    value.started_at <= 0 ||
    typeof value.status_code !== "number" ||
    !Number.isInteger(value.status_code) ||
    value.status_code < 100 ||
    value.status_code > 599
  ) {
    return void 0;
  }
  return {
    call_id: value.call_id,
    session_id: value.session_id,
    request_id: value.request_id,
    trace_id: value.trace_id,
    agent: value.agent,
    model_id: value.model_id,
    started_at: value.started_at,
    status_code: value.status_code,
  };
}
function mapChatModelTraceLookup(value) {
  if (
    !isRecord$g(value) ||
    !Array.isArray(value.traces) ||
    value.traces.length > CHAT_MODEL_TRACE_LOOKUP_LIMIT ||
    (value.trace_id !== null && !isChatModelTraceId(value.trace_id))
  )
    return void 0;
  const traces = [];
  for (const item of value.traces) {
    const trace = mapChatModelTrace(item);
    if (!trace) return void 0;
    traces.push(trace);
  }
  if (
    (selectChatModelTraceForFeedback(traces)?.trace_id ?? null) !==
    value.trace_id
  )
    return void 0;
  return {
    trace_id: value.trace_id,
    traces,
  };
}
async function tryFetchModelTraces(fetchFeedback, target) {
  try {
    const query = new URLSearchParams({
      session_id: target.sessionId,
      request_id: target.requestId,
    });
    const response = await fetchFeedback(`${CHAT_MODEL_TRACES_PATH}?${query}`, {
      method: "GET",
      timeoutMs: 3e3,
    });
    if (!response.ok) return void 0;
    const lookup = mapChatModelTraceLookup(await response.json());
    if (
      !lookup ||
      lookup.traces.some(
        (trace) =>
          trace.session_id !== target.sessionId ||
          trace.request_id !== target.requestId,
      )
    ) {
      return void 0;
    }
    return lookup;
  } catch {
    return void 0;
  }
}
async function saveChatRating(
  fetchFeedback,
  target,
  request,
  isCurrentIdentity,
) {
  const capturedTarget = {
    ...target,
  };
  if (
    request.event.session_id !== capturedTarget.sessionId ||
    request.event.request_id !== capturedTarget.requestId
  ) {
    throw new Error("Feedback turn identity mismatch");
  }
  if (!(await isCurrentIdentity())) throw new Error("Feedback account changed");
  const modelTraces = await tryFetchModelTraces(fetchFeedback, capturedTarget);
  const saved = await submitFeedback(
    {
      source: "chat_message",
      contextType: "chat_feedback",
      description: JSON.stringify(request.event),
      context: {
        ...request.context,
        ...(modelTraces?.traces.length
          ? {
              model_traces: modelTraces.traces,
            }
          : {}),
      },
      traceId: modelTraces?.trace_id ?? void 0,
      idempotencyKey: request.event.event_id,
      locale: request.locale,
      workspaceId: capturedTarget.workspaceId,
    },
    // 最终保存走应用 gateway；关掉那个工作区不会中断这次评分保存。
    {
      isCurrentIdentity,
    },
  );
  return saved.ticket_id;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function buildChatRatingRequest(
  target,
  rating,
  reasons,
  category,
  comment,
  locale,
  supersedesTicketId = "",
) {
  if (!target.sessionId || !target.requestId)
    throw new Error("Missing feedback turn identity");
  if (rating !== "up" && rating !== "down" && rating !== "none")
    throw new Error("Invalid feedback rating");
  const reasonCodes = CHAT_FEEDBACK_REASONS.filter((reason) =>
    reasons.includes(reason),
  );
  const taskCategory = CHAT_TASK_CATEGORIES.find((value) => value === category);
  if (
    rating === "down" &&
    (!taskCategory ||
      reasonCodes.length === 0 ||
      reasonCodes.length !== reasons.length)
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
        ? comment.trim().slice(0, CHAT_RATING_COMMENT_MAX_LENGTH)
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
        truncated:
          userText !== target.userText ||
          assistantText !== target.assistantText,
      },
      session_archive_entry: rating === "none" ? null : "opencode-session.json",
    },
    locale,
  };
}
function captureChatRatingIdentity(userId) {
  const groupId = getSelectedRequestGroupId();
  return async () => {
    try {
      if (typeof __HILO_AUTH__ === "undefined") return false;
      const { user, tokens } = await __HILO_AUTH__.getStoredAuth();
      return (
        Boolean(tokens.accessToken) &&
        user.userID === userId &&
        getSelectedRequestGroupId() === groupId
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
    isRecord(value) &&
    typeof value.request_id === "string" &&
    value.request_id.length > 0 &&
    (value.rating === "up" ||
      value.rating === "down" ||
      value.rating === "none") &&
    typeof value.comment === "string" &&
    (value.task_category === "" ||
      CHAT_TASK_CATEGORIES.some(
        (category) => category === value.task_category,
      )) &&
    Array.isArray(value.reason_codes) &&
    value.reason_codes.every((reason) =>
      CHAT_FEEDBACK_REASONS.some((code) => code === reason),
    )
  );
}
function isRatingState(value) {
  return (
    isRecord(value) &&
    typeof value.ticket_id === "string" &&
    value.ticket_id.length > 0 &&
    isRatingDetails(value)
  );
}
function loadLocalChatRatings(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isRatingState) : [];
  } catch {
    chatLog.warn("Feedback acknowledgement cache could not be read");
    return [];
  }
}
function storeLocalChatRating(key, rating) {
  try {
    const others = loadLocalChatRatings(key).filter(
      (item) => item.request_id !== rating.request_id,
    );
    localStorage.setItem(key, JSON.stringify([...others.slice(-999), rating]));
  } catch {
    chatLog.warn(
      "Feedback saved, but its local acknowledgement could not be cached",
    );
  }
}
function chatRatingRetryStorageKey(workspaceKey, userId, sessionId, groupId) {
  return `hilo:chat-feedback-retry:v1:${JSON.stringify([workspaceKey, userId, sessionId, groupId])}`;
}
function isPendingEvent(value) {
  return (
    isRecord(value) &&
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
function pendingEvents(client, key) {
  const cached = client.getQueryData(["chat-rating-retry", key]);
  if (cached) return cached;
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter(isPendingEvent).slice(-1e3) : [];
  } catch {
    chatLog.warn("Feedback retry metadata could not be read");
    return [];
  }
}
function storePendingEvents(client, key, events) {
  client.setQueryData(["chat-rating-retry", key], events);
  try {
    if (events.length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(events));
  } catch {
    chatLog.warn("Feedback retry metadata could not be persisted");
  }
}
function prepareChatRatingRetry(client, key, candidate) {
  const events = pendingEvents(client, key);
  const previous = events.find(
    (ratingEvent) => ratingEvent.request_id === candidate.request_id,
  );
  const event =
    previous &&
    previous.session_id === candidate.session_id &&
    previous.rating === candidate.rating &&
    previous.task_category === candidate.task_category &&
    previous.comment === candidate.comment &&
    previous.supersedes_ticket_id === candidate.supersedes_ticket_id &&
    JSON.stringify(previous.reason_codes) ===
      JSON.stringify(candidate.reason_codes)
      ? previous
      : candidate;
  const others = events.filter(
    (item) => item.request_id !== candidate.request_id,
  );
  storePendingEvents(client, key, [...others.slice(-999), event]);
  return event;
}
function acknowledgeChatRatingRetry(client, key, eventId) {
  storePendingEvents(
    client,
    key,
    pendingEvents(client, key).filter((event) => event.event_id !== eventId),
  );
}
function useChatRating(target) {
  const { user, isLoggedIn } = useAuth();
  const { t: translate, i18n } = useTranslation();
  const fetchFeedback = useGatewayFetch();
  const workspaceKey = useGatewayScopeKey();
  const queryClient = useQueryClient();
  const userId = isLoggedIn ? user?.userID : void 0;
  const queryKey = ["chat-ratings", workspaceKey, userId, target.sessionId];
  const storageKey = chatRatingStorageKey(
    workspaceKey,
    userId ?? "",
    target.sessionId,
  );
  const mutationKey = [
    "chat-rating-submit",
    workspaceKey,
    userId,
    target.sessionId,
    target.requestId,
  ];
  const query = useQuery({
    queryKey,
    queryFn: () => loadLocalChatRatings(storageKey),
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
      acknowledgeChatRatingRetry(
        input.client,
        input.retryStorageKey,
        input.request.event.event_id,
      );
      input.client.setQueryData(input.queryKey, (previous = []) => [
        ...previous.filter(
          (item) => item.request_id !== input.target.requestId,
        ),
        saved,
      ]);
      if (await input.isCurrentIdentity())
        dedupedToast.success(input.successMessage);
    },
    onError: async (_error, input) => {
      if (await input.isCurrentIdentity())
        dedupedToast.error(input.errorMessage);
    },
  });
  const submitting =
    useIsMutating({
      mutationKey,
      exact: true,
    }) > 0;
  const submit = async (rating, reasons = [], category = "", comment = "") => {
    if (
      !userId ||
      queryClient.isMutating({
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
        comment,
        i18n.language,
        query.data?.find((item) => item.request_id === capturedTarget.requestId)
          ?.ticket_id,
      );
      const event = prepareChatRatingRetry(
        queryClient,
        retryStorageKey,
        request.event,
      );
      await mutation.mutateAsync({
        client: queryClient,
        queryKey,
        storageKey,
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
        successMessage: translate("chat.rating.saved"),
        errorMessage: translate("chat.rating.failed"),
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
const CHAT_RATING_REASON_OPTIONS = [
  "misunderstood_request",
  "misused_materials",
  "poor_quality",
  "incomplete_result",
  "slow_or_repeated_failures",
  "other",
];
const CHAT_RATING_CATEGORY_OPTIONS = [
  "shortDrama",
  "ecommerce",
  "mvMusic",
  "animation",
  "knowledge",
  "other",
];
const LEGACY_REASON_MAP = {
  forgot_requirements: "misunderstood_request",
  vague_or_unprofessional: "poor_quality",
};
const LEGACY_CATEGORY_MAP = {
  filmEdit: "shortDrama",
  adsMarketing: "ecommerce",
};
function normalizeReasons(reasonCodes) {
  const visibleReasons = new Set(CHAT_RATING_REASON_OPTIONS);
  return Array.from(
    new Set(
      reasonCodes
        .map((reason) => LEGACY_REASON_MAP[reason] ?? reason)
        .filter((reason) => visibleReasons.has(reason)),
    ),
  );
}
function normalizeCategory(category) {
  const normalized = LEGACY_CATEGORY_MAP[category] ?? category;
  return CHAT_RATING_CATEGORY_OPTIONS.some((option) => option === normalized)
    ? normalized
    : "";
}
export function ChatRatingControls({ target, onOpenChange }) {
  const { t: translate } = useTranslation();
  const {
    current,
    submitting,
    submit,
    loading,
    loadFailed,
    retry,
    signedIn,
  } = useChatRating(target);
  const [open, setOpen] = reactExports.useState(false);
  const [reasons, setReasons] = reactExports.useState([]);
  const [category, setCategory] = reactExports.useState("");
  const [comment, setComment] = reactExports.useState("");
  const commentRef = reactExports.useRef(null);
  const hasOtherReason = reasons.includes("other");
  reactExports.useEffect(() => {
    if (open && hasOtherReason) commentRef.current?.focus();
  }, [open, hasOtherReason]);
  const disabled = loading || submitting || !signedIn;
  const handleOpenChange = (next) => {
    if (submitting) return;
    if (next) {
      setReasons(normalizeReasons(current?.reason_codes ?? []));
      setCategory(normalizeCategory(current?.task_category ?? ""));
      setComment(current?.comment ?? "");
    }
    setOpen(next);
    onOpenChange(next);
  };
  const handleSubmit = async () => {
    if (reasons.length === 0 || !category) return;
    if (
      await submit("down", reasons, category, hasOtherReason ? comment : "")
    ) {
      setOpen(false);
      onOpenChange(false);
    }
  };
  const likeLabel = translate(
    current?.rating === "up" ? "chat.rating.removeLike" : "chat.rating.like",
  );
  const dislikeLabel = translate("chat.rating.dislike");
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={disabled}
              aria-label={likeLabel}
              aria-pressed={current?.rating === "up"}
              data-action-ui-id="chat-assistant-like"
              className={mergeClassNames(
                "icon-muted-control",
                current?.rating === "up" &&
                  "bg-muted text-brand-accent hover:text-brand-accent",
              )}
              onClick={() =>
                void submit(current?.rating === "up" ? "none" : "up")
              }
            >
              <MonochromeIcon tone="control">
                <ThumbsUp
                  className="size-3.5"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </MonochromeIcon>
            </Button>
          }
        />
        <TooltipContent>{likeLabel}</TooltipContent>
      </Tooltip>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={disabled}
                    aria-label={dislikeLabel}
                    aria-pressed={current?.rating === "down"}
                    data-action-ui-id="chat-assistant-dislike"
                    className={mergeClassNames(
                      "icon-muted-control",
                      current?.rating === "down" &&
                        "bg-muted text-brand-accent hover:text-brand-accent",
                    )}
                  >
                    <MonochromeIcon tone="control">
                      <ThumbsDown
                        className="size-3.5"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    </MonochromeIcon>
                  </Button>
                }
              />
            }
          />
          <TooltipContent>{dislikeLabel}</TooltipContent>
        </Tooltip>
        <PopoverContent
          align="start"
          side="top"
          sideOffset={8}
          className="w-88 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto p-4 gap-4"
          data-action-ui-id="chat-rating-popover"
        >
          <div className="flex items-center justify-between gap-3">
            <PopoverTitle>{translate("chat.rating.title")}</PopoverTitle>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={submitting}
              aria-label={translate("chat.rating.close")}
              onClick={() => handleOpenChange(false)}
              data-action-ui-id="chat-rating-close"
            >
              <CloseIcon strokeWidth={1.5} aria-hidden="true" />
            </Button>
          </div>
          <fieldset disabled={submitting} className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-medium">
              {translate("chat.rating.reasons")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {CHAT_RATING_REASON_OPTIONS.map((reason) => {
                const selected = reasons.includes(reason);
                return (
                  <Button
                    key={reason}
                    variant={selected ? "default" : "outline"}
                    size="sm"
                    aria-pressed={selected}
                    className={mergeClassNames(
                      "font-normal",
                      selected &&
                        "border-brand-accent bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90 hover:text-brand-accent-foreground",
                    )}
                    data-action-ui-id={`chat-rating-reason-${reason}`}
                    onClick={() =>
                      setReasons((previous) =>
                        selected
                          ? previous.filter((item) => item !== reason)
                          : [...previous, reason],
                      )
                    }
                  >
                    {translate(`chat.rating.reason.${reason}`)}
                  </Button>
                );
              })}
            </div>
            {hasOtherReason && (
              <Textarea
                ref={commentRef}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={CHAT_RATING_COMMENT_MAX_LENGTH}
                disabled={submitting}
                aria-label={translate("chat.rating.comment")}
                placeholder={translate("chat.rating.comment")}
                data-action-ui-id="chat-rating-comment"
              />
            )}
          </fieldset>
          <fieldset disabled={submitting} className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-medium">
              {translate("chat.rating.category")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {CHAT_RATING_CATEGORY_OPTIONS.map((key) => (
                <Button
                  key={key}
                  variant={category === key ? "default" : "outline"}
                  size="sm"
                  aria-pressed={category === key}
                  className={mergeClassNames(
                    "font-normal",
                    category === key &&
                      "border-brand-accent bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90 hover:text-brand-accent-foreground",
                  )}
                  data-action-ui-id={`chat-rating-category-${key}`}
                  onClick={() => setCategory(key)}
                >
                  {translate(`chat.rating.category.${key}`)}
                </Button>
              ))}
            </div>
          </fieldset>
          <p className="text-xs text-muted-foreground">
            {translate("chat.rating.contextHint")}
          </p>
          <div className="flex gap-2">
            {current?.rating === "down" && (
              <Button
                variant="outline"
                disabled={submitting}
                data-action-ui-id="chat-rating-withdraw"
                onClick={async () => {
                  if (await submit("none")) {
                    setOpen(false);
                    onOpenChange(false);
                  }
                }}
              >
                {translate("chat.rating.withdraw")}
              </Button>
            )}
            <Button
              className="flex-1"
              loading={submitting}
              disabled={reasons.length === 0 || !category}
              onClick={() => void handleSubmit()}
              data-action-ui-id="chat-rating-submit"
            >
              {translate("chat.rating.submit")}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {loadFailed && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => void retry()}
                aria-label={translate("chat.rating.retryLoad")}
                data-action-ui-id="chat-rating-reload"
              >
                <RotateCcw strokeWidth={1.5} aria-hidden="true" />
              </Button>
            }
          />
          <TooltipContent>{translate("chat.rating.retryLoad")}</TooltipContent>
        </Tooltip>
      )}
    </>
  );
}
