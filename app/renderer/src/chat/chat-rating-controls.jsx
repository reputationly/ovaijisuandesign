// chat-rating-controls.jsx
import { isRecord$g, jsxRuntimeExports, MonochromeIcon, reactExports, RotateCcw, ThumbsDown, ThumbsUp, useIsMutating, useMutation, useQuery, useQueryClient, useTranslation, X$7 as X } from "../vendor.js";
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
  cn$2 as cn,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import { Textarea } from "../infra/badge-variants.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
import { PopoverTitle } from "../canvas/popover-title.jsx";
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
      const code2 = character.charCodeAt(0);
      return code2 >= 32 && code2 !== 127;
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
      workspaceDir: capturedTarget.workspaceDir,
      runtimeSessionId:
        request.event.rating === "none" ? void 0 : capturedTarget.sessionId,
    },
    // The snapshot needs the workspace; logs run in main and the final save
    // uses the app gateway, so closing that workspace cannot abort the rating.
    {
      exportFetch: fetchFeedback,
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
  comment2,
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
      CHAT_FEEDBACK_REASONS.some((code2) => code2 === reason),
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
    chatLog.warn(
      "Feedback saved, but its local acknowledgement could not be cached",
    );
  }
}
function chatRatingRetryStorageKey(workspaceKey, userId, sessionId, groupId2) {
  return `hilo:chat-feedback-retry:v1:${JSON.stringify([workspaceKey, userId, sessionId, groupId2])}`;
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
  const previous2 = events2.find(
    (event2) => event2.request_id === candidate.request_id,
  );
  const event =
    previous2 &&
    previous2.session_id === candidate.session_id &&
    previous2.rating === candidate.rating &&
    previous2.task_category === candidate.task_category &&
    previous2.comment === candidate.comment &&
    previous2.supersedes_ticket_id === candidate.supersedes_ticket_id &&
    JSON.stringify(previous2.reason_codes) ===
      JSON.stringify(candidate.reason_codes)
      ? previous2
      : candidate;
  const others = events2.filter(
    (item) => item.request_id !== candidate.request_id,
  );
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
function useChatRating(target) {
  const { user, isLoggedIn } = useAuth();
  const { t: t2, i18n } = useTranslation();
  const fetchFeedback = useGatewayFetch();
  const workspaceKey = useGatewayScopeKey();
  const queryClient2 = useQueryClient();
  const userId = isLoggedIn ? user?.userID : void 0;
  const queryKey = ["chat-ratings", workspaceKey, userId, target.sessionId];
  const storageKey2 = chatRatingStorageKey(
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
      acknowledgeChatRatingRetry(
        input.client,
        input.retryStorageKey,
        input.request.event.event_id,
      );
      input.client.setQueryData(input.queryKey, (previous2 = []) => [
        ...previous2.filter(
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
        query.data?.find((item) => item.request_id === capturedTarget.requestId)
          ?.ticket_id,
      );
      const event = prepareChatRatingRetry(
        queryClient2,
        retryStorageKey,
        request.event,
      );
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
  return CHAT_RATING_CATEGORY_OPTIONS.some((option2) => option2 === normalized)
    ? normalized
    : "";
}
export function ChatRatingControls({ target, onOpenChange }) {
  const { t: t2 } = useTranslation();
  const {
    current: current2,
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
  const [comment2, setComment] = reactExports.useState("");
  const commentRef = reactExports.useRef(null);
  const hasOtherReason = reasons.includes("other");
  reactExports.useEffect(() => {
    if (open && hasOtherReason) commentRef.current?.focus();
  }, [open, hasOtherReason]);
  const disabled2 = loading || submitting || !signedIn;
  const handleOpenChange = (next2) => {
    if (submitting) return;
    if (next2) {
      setReasons(normalizeReasons(current2?.reason_codes ?? []));
      setCategory(normalizeCategory(current2?.task_category ?? ""));
      setComment(current2?.comment ?? "");
    }
    setOpen(next2);
    onOpenChange(next2);
  };
  const handleSubmit = async () => {
    if (reasons.length === 0 || !category) return;
    if (
      await submit("down", reasons, category, hasOtherReason ? comment2 : "")
    ) {
      setOpen(false);
      onOpenChange(false);
    }
  };
  const likeLabel = t2(
    current2?.rating === "up" ? "chat.rating.removeLike" : "chat.rating.like",
  );
  const dislikeLabel = t2("chat.rating.dislike");
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={disabled2}
              aria-label={likeLabel}
              aria-pressed={current2?.rating === "up"}
              data-action-ui-id="chat-assistant-like"
              className={cn(
                "icon-muted-control",
                current2?.rating === "up" &&
                  "bg-muted text-brand-accent hover:text-brand-accent",
              )}
              onClick={() =>
                void submit(current2?.rating === "up" ? "none" : "up")
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
                    disabled={disabled2}
                    aria-label={dislikeLabel}
                    aria-pressed={current2?.rating === "down"}
                    data-action-ui-id="chat-assistant-dislike"
                    className={cn(
                      "icon-muted-control",
                      current2?.rating === "down" &&
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
            <PopoverTitle>{t2("chat.rating.title")}</PopoverTitle>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={submitting}
              aria-label={t2("chat.rating.close")}
              onClick={() => handleOpenChange(false)}
              data-action-ui-id="chat-rating-close"
            >
              <X strokeWidth={1.5} aria-hidden="true" />
            </Button>
          </div>
          <fieldset disabled={submitting} className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-medium">
              {t2("chat.rating.reasons")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {CHAT_RATING_REASON_OPTIONS.map((reason) => {
                const selected2 = reasons.includes(reason);
                return (
                  <Button
                    key={reason}
                    variant={selected2 ? "default" : "outline"}
                    size="sm"
                    aria-pressed={selected2}
                    className={cn(
                      "font-normal",
                      selected2 &&
                        "border-brand-accent bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90 hover:text-brand-accent-foreground",
                    )}
                    data-action-ui-id={`chat-rating-reason-${reason}`}
                    onClick={() =>
                      setReasons((previous2) =>
                        selected2
                          ? previous2.filter((item) => item !== reason)
                          : [...previous2, reason],
                      )
                    }
                  >
                    {t2(`chat.rating.reason.${reason}`)}
                  </Button>
                );
              })}
            </div>
            {hasOtherReason && (
              <Textarea
                ref={commentRef}
                value={comment2}
                onChange={(event) => setComment(event.target.value)}
                maxLength={CHAT_RATING_COMMENT_MAX_LENGTH}
                disabled={submitting}
                aria-label={t2("chat.rating.comment")}
                placeholder={t2("chat.rating.comment")}
                data-action-ui-id="chat-rating-comment"
              />
            )}
          </fieldset>
          <fieldset disabled={submitting} className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-medium">
              {t2("chat.rating.category")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {CHAT_RATING_CATEGORY_OPTIONS.map((key2) => (
                <Button
                  key={key2}
                  variant={category === key2 ? "default" : "outline"}
                  size="sm"
                  aria-pressed={category === key2}
                  className={cn(
                    "font-normal",
                    category === key2 &&
                      "border-brand-accent bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90 hover:text-brand-accent-foreground",
                  )}
                  data-action-ui-id={`chat-rating-category-${key2}`}
                  onClick={() => setCategory(key2)}
                >
                  {t2(`chat.rating.category.${key2}`)}
                </Button>
              ))}
            </div>
          </fieldset>
          <p className="text-xs text-muted-foreground">
            {t2("chat.rating.contextHint")}
          </p>
          <div className="flex gap-2">
            {current2?.rating === "down" && (
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
                {t2("chat.rating.withdraw")}
              </Button>
            )}
            <Button
              className="flex-1"
              loading={submitting}
              disabled={reasons.length === 0 || !category}
              onClick={() => void handleSubmit()}
              data-action-ui-id="chat-rating-submit"
            >
              {t2("chat.rating.submit")}
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
                aria-label={t2("chat.rating.retryLoad")}
                data-action-ui-id="chat-rating-reload"
              >
                <RotateCcw strokeWidth={1.5} aria-hidden="true" />
              </Button>
            }
          />
          <TooltipContent>{t2("chat.rating.retryLoad")}</TooltipContent>
        </Tooltip>
      )}
    </>
  );
}
