// expandable-text.jsx
import { reactExports, useTranslation, CompositedSvg, Check, ChevronDown, API_PATHS, Globe, AlertCircle } from "../vendor.js";
import { useResolveMediaUrl } from "../m15/deferred-thumbnail-image-generation.jsx";
import { Icon } from "../m15/graph.jsx";
import { detectFileType } from "../m15/relayout-group-children.js";
import { getToolLabelId, normalizeJsonToolResult, isToolCancelInterrupted } from "../m15/save-chat-rating.js";
import { Button$1 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { QuestionPromptIcon } from "../m08/browser-inspiration-urls.jsx";
import { FileChip } from "../m12/file-chip.jsx";
import { parseCapabilitySearchResult } from "../m01/normalize-tag-registry.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ConnectorCapabilityCard } from "./connector-capability-card.jsx";
import { BrailleSpinner } from "./empty-chat-recommendations.jsx";
import { useChatPresentation } from "./history-anchor-rail-impl.jsx";
import {
  TODO_STATUS_ICON,
  getRunningPhraseKeys,
  getToolDisplayLabel,
  isTransientTool,
} from "./media-model-selector.jsx";
import { redactForCurrentRegion } from "./resolve-chat-file-reference.js";
import { getToolStatusLabel, parseTodos } from "./use-chat-rating.js";
export function CapabilitySearchCard({ result, searchCallId }) {
  const { t: t2 } = useTranslation();
  const actionable = result.matches.filter(({ capability }) => !capability.autoActivated);
  if (!result.partial && !actionable.length) return null;
  return (
    <div className="space-y-3 empty:hidden" data-action-ui-id="capability-search-card">
      {result.partial && (
        <p role="status" className="text-xs text-muted-foreground">
          {t2("chat.capabilitySearch.connectorsUnavailable")}
        </p>
      )}
      {actionable.map(({ capability }) => {
        switch (capability.kind) {
          case "connector":
            return (
              <ConnectorCapabilityCard
                key={`connector:${capability.connectorId}`}
                capability={capability}
                searchCallId={searchCallId}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
export function parseCapabilitySearchCardResult(name2, result) {
  if (name2 !== "hub_capability_search" || !result) return null;
  try {
    let value = JSON.parse(normalizeJsonToolResult(result));
    if (value && typeof value === "object" && "content" in value && Array.isArray(value.content)) {
      const block = value.content.find(
        (item) =>
          !!item &&
          typeof item === "object" &&
          "type" in item &&
          item.type === "text" &&
          "text" in item &&
          typeof item.text === "string",
      );
      if (!block) return null;
      value = JSON.parse(normalizeJsonToolResult(block.text));
    }
    return parseCapabilitySearchResult(value);
  } catch {
    return null;
  }
}
export function ExpandableText({
  children: children2,
  lineClamp = 8,
  className,
  asPre = false,
  richContent = false,
  ellipsis = false,
}) {
  const { t: t2 } = useTranslation();
  const isPresented = useChatPresentation();
  const [expanded, setExpanded] = reactExports.useState(false);
  const [collapsedHeight, setCollapsedHeight] = reactExports.useState(null);
  const [fullHeight, setFullHeight] = reactExports.useState(null);
  const ref = reactExports.useRef(null);
  const transitioningRef = reactExports.useRef(false);
  const measure = reactExports.useCallback(() => {
    const el = ref.current;
    if (!el || !isPresented || transitioningRef.current) return;
    const lineHeightStr = window.getComputedStyle(el).lineHeight;
    let lineHeight = parseFloat(lineHeightStr);
    if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
      const fontSize = parseFloat(window.getComputedStyle(el).fontSize) || 14;
      lineHeight = fontSize * 1.5;
    }
    const collapsed = Math.round(lineHeight * lineClamp);
    const full = el.scrollHeight;
    if (full <= 0) return;
    setCollapsedHeight(collapsed);
    setFullHeight(full);
  }, [isPresented, lineClamp]);
  reactExports.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !isPresented) return;
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, children2, isPresented]);
  const overflow =
    fullHeight != null && collapsedHeight != null && fullHeight > collapsedHeight + 1;
  const showEllipsis = ellipsis && overflow && !expanded;
  const style2 = {
    maxHeight: !overflow || expanded ? (fullHeight ?? void 0) : (collapsedHeight ?? void 0),
    ...(showEllipsis
      ? {
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: lineClamp,
        }
      : void 0),
  };
  const innerClass = [
    richContent ? "" : "whitespace-pre-wrap break-words [overflow-wrap:anywhere]",
    "overflow-hidden transition-[max-height] duration-200 ease-out",
    asPre ? "font-mono" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  const handleToggle = () => {
    transitioningRef.current = true;
    setExpanded((v2) => !v2);
  };
  const handleTransitionEnd = (e2) => {
    if (e2.propertyName !== "max-height") return;
    transitioningRef.current = false;
    measure();
  };
  return (
    <div className="flex flex-col gap-1">
      {asPre ? (
        <pre
          data-line-clamp={lineClamp}
          data-ellipsis={ellipsis || void 0}
          ref={(el) => {
            ref.current = el;
          }}
          className={innerClass}
          style={style2}
          onTransitionEnd={handleTransitionEnd}
        >
          {children2}
        </pre>
      ) : (
        <div
          data-line-clamp={lineClamp}
          data-ellipsis={ellipsis || void 0}
          ref={(el) => {
            ref.current = el;
          }}
          className={innerClass}
          style={style2}
          onTransitionEnd={handleTransitionEnd}
        >
          {children2}
        </div>
      )}
      {overflow && (
        <button
          type="button"
          className="self-start text-xs text-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
          onClick={handleToggle}
        >
          {expanded ? t2("chat.showLess") : t2("chat.showMore")}
        </button>
      )}
    </div>
  );
}
export function ErrorBlock({
  title,
  statusSuffix,
  detail,
  actions,
  Icon: Icon2 = AlertCircle,
  icon,
  iconSize = 20,
  iconStrokeWidth = 1.5,
  iconContainerClassName = "size-5 text-destructive/50",
  defaultExpanded = false,
  compact = false,
}) {
  const [expanded, setExpanded] = reactExports.useState(defaultExpanded);
  const hasBody = !!detail || !!actions;
  if (compact) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-1.5">
          <span className={`flex shrink-0 items-center justify-center ${iconContainerClassName}`}>
            <Icon2 size={iconSize} strokeWidth={iconStrokeWidth} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex w-full items-center gap-1 text-left">
              <span
                data-error-title={true}
                className="truncate text-body-14 font-normal text-foreground/60"
              >
                {title}
              </span>
              {statusSuffix && (
                <span
                  data-error-suffix={true}
                  className="truncate text-body-14 text-destructive/50"
                >
                  {statusSuffix}
                </span>
              )}
            </div>
            {detail && (
              <div className="text-body-14 text-muted-foreground">
                {typeof detail === "string" ? (
                  <ExpandableText lineClamp={8}>{detail}</ExpandableText>
                ) : (
                  <div className="break-words whitespace-pre-wrap">{detail}</div>
                )}
              </div>
            )}
          </div>
        </div>
        {actions && (
          <div data-error-actions={true} className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="min-w-0 flex flex-col">
      <button
        type="button"
        className="flex items-center gap-2 w-full text-left cursor-pointer"
        onClick={() => setExpanded((v2) => !v2)}
        aria-expanded={expanded}
        disabled={!hasBody}
      >
        <span className={`flex shrink-0 items-center justify-center ${iconContainerClassName}`}>
          {icon ?? <Icon2 size={iconSize} strokeWidth={iconStrokeWidth} />}
        </span>
        <div className="min-w-0 text-body-14 flex items-center gap-1">
          <span data-error-title={true} className="text-foreground/60 font-normal truncate">
            {title}
          </span>
          {statusSuffix && (
            <span data-error-suffix={true} className="text-destructive/50 truncate">
              {statusSuffix}
            </span>
          )}
          {hasBody && (
            <ChevronDown
              size={16}
              strokeWidth={1.5}
              className={`shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? "" : "-rotate-90"}`}
            />
          )}
        </div>
      </button>
      {hasBody && (
        <div
          className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="overflow-hidden min-h-0">
            <div className="flex items-start gap-1 w-full min-w-0 pt-2">
              <span className="shrink-0 size-6 flex items-center justify-center text-tertiary">
                <CompositedSvg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className="text-current"
                >
                  <path d="M10 0V10C10 11.1046 10.8954 12 12 12H22" stroke="currentColor" />
                </CompositedSvg>
              </span>
              <div className="flex-1 min-w-0 flex flex-col gap-2 text-body-14 text-muted-foreground">
                {detail &&
                  (typeof detail === "string" ? (
                    <ExpandableText lineClamp={8}>{detail}</ExpandableText>
                  ) : (
                    <div className="break-words whitespace-pre-wrap">{detail}</div>
                  ))}
                {actions && (
                  <div data-error-actions={true} className="flex flex-wrap items-center gap-2">
                    {actions}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
const RECOMMENDED_SUFFIX_PATTERN = /\s*(?:（推荐）|\((?:推荐|recommended)\))\s*$/iu;
export function localizeRecommendedQuestionOptionLabel(label, t2) {
  if (!RECOMMENDED_SUFFIX_PATTERN.test(label)) return label;
  const baseLabel = label.replace(RECOMMENDED_SUFFIX_PATTERN, "").trimEnd();
  return t2("chat.question.recommendedLabel", {
    label: baseLabel,
  });
}
const ROTATE_INTERVAL_MS = 1e4;
function useRunningPhrase(labelId, isRunning, toolName2) {
  const { t: t2 } = useTranslation();
  const [index2, setIndex] = reactExports.useState(0);
  reactExports.useEffect(() => {
    setIndex(0);
    if (!isRunning) return;
    const keys22 = getRunningPhraseKeys(labelId, toolName2);
    if (keys22.length <= 1) return;
    const tick = setInterval(() => {
      setIndex((i2) => (i2 + 1) % keys22.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(tick);
  }, [labelId, isRunning, toolName2]);
  if (!isRunning) return null;
  const keys2 = getRunningPhraseKeys(labelId, toolName2);
  if (keys2.length === 0) return null;
  const key2 = keys2[index2] ?? keys2[0];
  return key2 ? t2(key2) : null;
}
const QUESTION_CARD_TYPOGRAPHY_CLASS_NAME = "text-body-14";
const QUESTION_ATTACHMENT_PREFIX = "[User attached files:\n";
function extractQuestionHistoryValue(result, question2) {
  const serializedQuestion = JSON.stringify(question2);
  const pairStart = result.indexOf(`${serializedQuestion}=`);
  if (pairStart < 0) return void 0;
  const valueStart = pairStart + serializedQuestion.length + 1;
  const serializedValue = result.slice(valueStart).match(/^"(?:\\.|[^"\\])*"/s)?.[0];
  if (!serializedValue) return void 0;
  try {
    return JSON.parse(serializedValue);
  } catch {
    return serializedValue.slice(1, -1);
  }
}
function parseQuestionHistoryAnswer(value) {
  const prefixStart = value.indexOf(QUESTION_ATTACHMENT_PREFIX);
  const visibleValue = (prefixStart >= 0 ? value.slice(0, prefixStart) : value)
    .replace(/,\s*$/, "")
    .trim();
  const labels = visibleValue
    .split(/,\s*/)
    .map((label) => label.trim())
    .filter(Boolean);
  if (prefixStart < 0)
    return {
      labels,
      attachments: [],
    };
  const attachments = [];
  const attachmentLines = value.slice(prefixStart + QUESTION_ATTACHMENT_PREFIX.length).split("\n");
  for (const line of attachmentLines) {
    if (!line.trim() || line.trim() === "]") break;
    const match2 = /^-\s+(?:\[\d+\]\s*)?(?:(image|video|audio|text|file):\s*)?(.+)$/.exec(line);
    if (!match2) continue;
    const path2 = match2[2]?.trim();
    if (!path2) continue;
    attachments.push({
      path: path2,
      type: detectFileType(path2) ?? match2[1] ?? "file",
    });
  }
  return {
    labels,
    attachments,
  };
}
function QuestionHistoryAttachmentChip({ attachment }) {
  const resolveMediaUrl2 = useResolveMediaUrl();
  const filename = attachment.path.split(/[\\/]/).pop() ?? attachment.path;
  const url2 = resolveMediaUrl2(API_PATHS.serveLocal(attachment.path));
  const imageUrl = attachment.type === "image" ? url2 : void 0;
  const mediaUrl = attachment.type === "video" || attachment.type === "audio" ? url2 : void 0;
  return (
    <div
      data-action-ui-id="chat-question-history-attachment"
      data-attachment-path={attachment.path}
    >
      <FileChip
        filename={filename}
        imageUrl={imageUrl}
        mediaUrl={mediaUrl}
        fileType={attachment.type}
        previewOnClick={true}
        layout="tile"
        className="size-10 rounded-md hover:border-foreground/25"
      />
    </div>
  );
}
export function ToolCallCard({ msg, repeatCount, questionDefaultExpanded = true }) {
  const toolName2 = msg.content;
  const capabilityResult =
    msg.toolStatus === "ok" ? parseCapabilitySearchCardResult(toolName2, msg.toolResult) : null;
  if (capabilityResult)
    return <CapabilitySearchCard result={capabilityResult} searchCallId={msg.callID ?? msg.id} />;
  if (toolName2 === "todowrite") {
    return <TodoCard msg={msg} />;
  }
  if (toolName2 === "question") {
    return <QuestionToolCard msg={msg} defaultExpanded={questionDefaultExpanded} />;
  }
  return <GenericToolCard msg={msg} repeatCount={repeatCount} />;
}
export function BrowserOpenCard({ onContinue }) {
  const { t: t2 } = useTranslation();
  const [opening2, setOpening] = reactExports.useState(false);
  const [opened, setOpened] = reactExports.useState(false);
  const openBrowser = () => {
    if (opening2 || opened) return;
    setOpening(true);
    let settled = false;
    let fallbackTimer;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener("hilo:browser-surface-ready", finish);
      if (fallbackTimer !== void 0) window.clearTimeout(fallbackTimer);
      setOpening(false);
      setOpened(true);
      onContinue?.();
    };
    window.addEventListener("hilo:browser-surface-ready", finish, {
      once: true,
    });
    window.dispatchEvent(new CustomEvent("hilo:open-browser"));
    fallbackTimer = window.setTimeout(finish, 3e3);
  };
  return (
    <div className="flex max-w-md items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
      <Icon icon={Globe} size="md" className="shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground">
          {t2("chat.browser.openRequired", "需要开启内置浏览器")}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {t2("chat.browser.openRequiredDescription", "Agent 需要使用内置浏览器完成此任务。")}
        </div>
      </div>
      <Button$1 type="button" size="sm" disabled={opening2 || opened} onClick={openBrowser}>
        {opening2
          ? t2("chat.browser.opening", "正在开启…")
          : opened
            ? t2("chat.browser.opened", "已开启")
            : t2("chat.browser.open", "开启浏览器")}
      </Button$1>
    </div>
  );
}
function QuestionToolCard({ msg, defaultExpanded }) {
  const { t: t2 } = useTranslation();
  const status = msg.toolStatus ?? "pending";
  const questionTypographyClassName = QUESTION_CARD_TYPOGRAPHY_CLASS_NAME;
  const questions = reactExports.useMemo(() => {
    const args = msg.toolArgs ?? msg.url;
    if (!args) return [];
    try {
      const raw2 = JSON.parse(args)?.questions;
      if (!Array.isArray(raw2)) return [];
      return raw2.filter(
        (item) =>
          typeof item?.question === "string" &&
          typeof item?.header === "string" &&
          Array.isArray(item.options),
      );
    } catch {
      return [];
    }
  }, [msg.toolArgs, msg.url]);
  const answers = reactExports.useMemo(() => {
    const result = msg.toolResult;
    if (!result) return [];
    return questions.map((q2) => {
      const value = extractQuestionHistoryValue(result, q2.question);
      if (value !== void 0) {
        return parseQuestionHistoryAnswer(value);
      }
      return {
        labels: [],
        attachments: [],
      };
    });
  }, [msg.toolResult, questions]);
  if (status === "pending" || status === "running") {
    return null;
  }
  if (status === "error") {
    const result = redactForCurrentRegion(msg.toolResult ?? "");
    const dismissed =
      result.includes("QuestionRejectedError") || result.includes("dismissed this question");
    if (dismissed) {
      return (
        <div className={questionTypographyClassName}>
          <QuestionStatusCard statusSuffix={t2("chat.question.dismissed")} />
        </div>
      );
    }
    if (isToolCancelInterrupted(msg.toolResult)) {
      const interruptedDetail =
        questions.length > 0
          ? questions.map((q2) => redactForCurrentRegion(q2.question)).join("\n")
          : void 0;
      return (
        <div className={questionTypographyClassName}>
          <QuestionStatusCard
            statusSuffix={t2("chat.question.interrupted")}
            detail={interruptedDetail}
          />
        </div>
      );
    }
    return (
      <ErrorBlock
        title={t2("chat.errors.title.question")}
        statusSuffix={t2("chat.errors.suffix.failed")}
        icon={
          <QuestionPromptIcon
            actionId="chat-question-error-icon"
            className="size-4 text-muted-foreground"
          />
        }
        iconContainerClassName="size-4 text-muted-foreground"
        detail={result || t2("chat.statusError")}
      />
    );
  }
  if (questions.length === 0) return null;
  return (
    <QuestionCardCollapsible
      questions={questions}
      answers={answers}
      defaultExpanded={defaultExpanded}
    />
  );
}
function QuestionStatusCard({ statusSuffix, detail }) {
  const { t: t2 } = useTranslation();
  const [expanded, setExpanded] = reactExports.useState(false);
  const hasDetail = Boolean(detail);
  return (
    <div className="min-w-0">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-2 text-left disabled:cursor-default"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        disabled={!hasDetail}
      >
        <QuestionPromptIcon
          actionId="chat-question-status-icon"
          className="size-4 text-muted-foreground"
        />
        <div className="flex min-w-0 items-center gap-1">
          <span className="truncate font-normal text-muted-foreground">
            {t2("chat.question.card")}
          </span>
          <span className="truncate text-muted-foreground">{statusSuffix}</span>
          {hasDetail && (
            <ChevronDown
              size={16}
              strokeWidth={1.5}
              className={`shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? "" : "-rotate-90"}`}
            />
          )}
        </div>
      </button>
      {hasDetail && (
        <div
          className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="min-h-0 overflow-hidden">
            <p className="whitespace-pre-wrap break-words pt-2 pl-6 text-muted-foreground">
              {detail}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
function QuestionCardCollapsible({ questions, answers, defaultExpanded }) {
  const { t: t2 } = useTranslation();
  const [expanded, setExpanded] = reactExports.useState(defaultExpanded);
  const questionTypographyClassName = QUESTION_CARD_TYPOGRAPHY_CLASS_NAME;
  return (
    <div className="min-w-0">
      <button
        type="button"
        data-action-ui-id="chat-question-history-toggle"
        className="-mx-1 flex w-[calc(100%+0.5rem)] cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
        onClick={() => setExpanded((v2) => !v2)}
        aria-expanded={expanded}
      >
        <QuestionPromptIcon
          actionId="chat-question-history-icon"
          className="size-4 text-muted-foreground"
        />
        <div className={`flex min-w-0 items-center gap-1 ${questionTypographyClassName}`}>
          <span className="truncate font-normal text-muted-foreground">
            {t2("chat.question.card")}
          </span>
          <ChevronDown
            size={16}
            strokeWidth={1.5}
            className={`shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? "" : "-rotate-90"}`}
          />
        </div>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden min-h-0">
          <div
            data-action-ui-id="chat-question-history-content"
            className="mt-2 overflow-hidden rounded-md border border-border bg-card"
          >
            {questions.map((q2, i2) => (
              <div
                key={q2.header}
                className={`flex flex-col px-3 py-2.5 ${i2 > 0 ? "border-t border-border/70" : ""}`}
              >
                <p className="whitespace-pre-wrap break-words text-body-12 leading-[18px] text-muted-foreground">
                  {redactForCurrentRegion(q2.question)}
                </p>
                {answers?.[i2] && answers[i2].attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {answers[i2].attachments.map((attachment) => (
                      <QuestionHistoryAttachmentChip
                        key={attachment.path}
                        attachment={attachment}
                      />
                    ))}
                  </div>
                )}
                {answers?.[i2] && answers[i2].labels.length > 0 && (
                  <div className="mt-1 flex flex-col gap-1">
                    {answers[i2].labels.map((label) => (
                      <p
                        key={label}
                        className="flex items-start gap-1.5 whitespace-pre-wrap break-words text-body-13 font-medium leading-5 text-foreground"
                      >
                        <Icon
                          icon={Check}
                          size="xs"
                          strokeWidth={1.5}
                          className="mt-1 shrink-0 text-muted-foreground"
                        />
                        <span>
                          {localizeRecommendedQuestionOptionLabel(
                            redactForCurrentRegion(label),
                            t2,
                          )}
                        </span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
function TodoCard({ msg }) {
  const { t: t2 } = useTranslation();
  const todos = reactExports.useMemo(
    () => parseTodos(msg.toolArgs ?? msg.url),
    [msg.toolArgs, msg.url],
  );
  const completed = todos.filter((todo) => todo.status === "completed").length;
  const pct = todos.length > 0 ? Math.round((completed / todos.length) * 100) : 0;
  return (
    <div className="min-w-0 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-body-14">
        <span className="font-medium text-muted-foreground shrink-0">{t2("chat.todoList")}</span>
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-1 bg-foreground/10 rounded-full overflow-hidden max-w-20">
            <div
              className="h-full bg-foreground/50 rounded-full transition-all duration-300"
              style={{
                width: `${pct}%`,
              }}
            />
          </div>
          <span className="text-caption-11 text-muted-foreground shrink-0">
            {completed}/{todos.length}
          </span>
        </div>
      </div>
      {todos.length > 0 && (
        <div className="flex items-start gap-1 w-full min-w-0">
          <span className="shrink-0 size-6 flex items-center justify-center text-tertiary">
            <CompositedSvg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="text-current"
            >
              <path d="M10 0V10C10 11.1046 10.8954 12 12 12H22" stroke="currentColor" />
            </CompositedSvg>
          </span>
          <div className="flex-1 min-w-0 flex flex-col gap-2 text-body-14">
            {todos.map((todo) => (
              <div key={todo.content} className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5">
                  {TODO_STATUS_ICON[todo.status] ?? TODO_STATUS_ICON.pending}
                </span>
                <span
                  className={`flex-1 text-muted-foreground ${todo.status === "completed" ? "line-through" : ""}`}
                >
                  {redactForCurrentRegion(todo.content)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function GenericToolCard({ msg, repeatCount: _repeatCount }) {
  const { t: t2 } = useTranslation();
  const toolName2 = msg.content;
  const status = msg.toolStatus ?? "pending";
  const labelId = getToolLabelId(toolName2);
  const runningPhrase = useRunningPhrase(
    labelId,
    labelId !== "silent" && status === "running",
    toolName2,
  );
  if (labelId === "silent") return null;
  const staticLabel = getToolDisplayLabel(toolName2, t2);
  const chipLabelText = runningPhrase ?? staticLabel;
  const isTask = labelId === "spawnSubtask";
  const toolMarker = isTask
    ? "chat-task-card"
    : status === "ok" && toolName2 === "hub_canvas_write_node"
      ? "chat-tool-hub-canvas-write-node"
      : void 0;
  return (
    <div data-action-ui-id={toolMarker} className="min-w-0 flex items-center gap-2 py-1">
      {status === "running" ? (
        <BrailleSpinner type="braille" className="shrink-0 text-muted-foreground text-sm" />
      ) : null}
      <span className="text-body-14 font-medium text-muted-foreground shrink-0 truncate">
        {chipLabelText}
      </span>
      <span
        data-action-ui-id={isTask ? "chat-task-status" : void 0}
        className="ml-auto text-body-14 text-muted-foreground shrink-0"
      >
        {getToolStatusLabel(status, t2, msg.toolResult, msg.interruption)}
      </span>
    </div>
  );
}
const GROUPABLE_CATEGORIES = new Set([
  "read",
  "analyseMedia",
  "search",
  "execute",
  "skillOp",
  "process",
  "connector",
  "other",
]);
export function groupTimelineEntries(entries2) {
  const units = [];
  let pending2 = [];
  const flush2 = () => {
    if (pending2.length === 1)
      units.push({
        kind: "standalone",
        entry: pending2[0],
      });
    else if (pending2.length > 1)
      units.push({
        kind: "tool-group",
        entries: pending2,
      });
    pending2 = [];
  };
  for (const entry of entries2) {
    if (
      entry.type === "tool" &&
      GROUPABLE_CATEGORIES.has(entry.category) &&
      entry.toolName !== "hub_run_comfyui_workflow" &&
      entry.toolName !== "hub_capability_search" &&
      !isTransientTool(entry.toolName) &&
      entry.toolStatus !== "error" &&
      !entry.pendingConfirm &&
      !entry.rejectedConfirm &&
      !entry.interruption
    ) {
      pending2.push(entry);
    } else {
      flush2();
      units.push({
        kind: "standalone",
        entry,
      });
    }
  }
  flush2();
  return units;
}
export function summarizeTimelineEntries(entries2) {
  const counts = new Map();
  for (const entry of entries2) {
    const count2 =
      entry.aggregatedFiles?.length ??
      entry.aggregatedSearchChips?.length ??
      entry.aggregatedCount ??
      1;
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + count2);
  }
  return Array.from(counts, ([category, count2]) => ({
    category,
    count: count2,
  }));
}
const defaultValue = {
  openPlan: () => false,
};
export const ProductionPlanDisclosureContext = reactExports.createContext(defaultValue);
export function useProductionPlanDisclosure() {
  return reactExports.useContext(ProductionPlanDisclosureContext);
}
