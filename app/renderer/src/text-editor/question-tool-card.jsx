// question-tool-card.jsx
import {
  API_PATHS,
  Check,
  ChevronDown,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useResolveMediaUrl } from "../workspace/tool-label-definitions.js";
import { FileChip } from "../generation/file-chip.jsx";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { localizeRecommendedQuestionOptionLabel } from "./capability-search-card.jsx";
import { QuestionPromptIcon } from "../workspace/home-service.jsx";
import { redactForCurrentRegion } from "../generation/replace-configured-model-names-for-current-region.js";
import { detectFileType } from "../canvas/diagnostic-history-tools.js";
import { ErrorBlock } from "./error-block.jsx";
import { isToolCancelInterrupted } from "../chat/has-structured-success-payload.js";

const QUESTION_CARD_TYPOGRAPHY_CLASS_NAME = "text-body-14";

const QUESTION_ATTACHMENT_PREFIX = "[User attached files:\n";

function extractQuestionHistoryValue(result, question2) {
  const serializedQuestion = JSON.stringify(question2);
  const pairStart = result.indexOf(`${serializedQuestion}=`);
  if (pairStart < 0) return void 0;
  const valueStart = pairStart + serializedQuestion.length + 1;
  const serializedValue = result
    .slice(valueStart)
    .match(/^"(?:\\.|[^"\\])*"/s)?.[0];
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
  const attachmentLines = value
    .slice(prefixStart + QUESTION_ATTACHMENT_PREFIX.length)
    .split("\n");
  for (const line of attachmentLines) {
    if (!line.trim() || line.trim() === "]") break;
    const match2 =
      /^-\s+(?:\[\d+\]\s*)?(?:(image|video|audio|text|file):\s*)?(.+)$/.exec(
        line,
      );
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
  const mediaUrl =
    attachment.type === "video" || attachment.type === "audio" ? url2 : void 0;
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
        <div
          className={`flex min-w-0 items-center gap-1 ${questionTypographyClassName}`}
        >
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

export function QuestionToolCard({ msg, defaultExpanded }) {
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
      result.includes("QuestionRejectedError") ||
      result.includes("dismissed this question");
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
          ? questions
              .map((q2) => redactForCurrentRegion(q2.question))
              .join("\n")
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
