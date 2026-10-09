// stalled-turn-banner.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { jsxRuntimeExports, useTranslation } from "../vendor.js";
import { Button$1 } from "../infra/dialog-content.jsx";

export function QuestionComposerGate({ blocked, dock, children: children2 }) {
  return (
    <>
      {blocked ? dock : null}
      <div
        className={blocked ? "hidden" : "contents"}
        hidden={blocked}
        aria-hidden={blocked ? true : void 0}
        inert={blocked ? true : void 0}
      >
        {children2}
      </div>
    </>
  );
}

export function queuedMessageSuccessorIds(messages2, clientMessageId) {
  const editIndex = messages2.findIndex(
    (item) => item.clientMessageId === clientMessageId,
  );
  if (editIndex === -1) return [];
  return messages2
    .slice(editIndex + 1)
    .map((item) => item.queueId)
    .filter((queueId) => Boolean(queueId));
}

export function restoreQueuedMessageToComposer(
  input,
  message2,
  setPendingInput,
  trackInputChange,
) {
  input?.reset();
  setPendingInput(message2.text);
  trackInputChange(message2.text);
  input?.setInputText(message2.text);
  for (const path2 of message2.attachments ?? []) {
    const nodeId = message2.canvasNodeAttachments?.find(
      (attachment) => attachment.path === path2,
    )?.nodeId;
    input?.addFromAssetPath(path2, path2.split("/").pop() || path2, nodeId);
  }
  requestAnimationFrame(() => input?.focus());
}

export function SessionListUnavailableNotice({ onRetry }) {
  const { t: t2 } = useTranslation();
  return (
    <div
      className="mb-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
      data-action-ui-id="chat.session-list-unavailable"
    >
      <div className="font-medium text-foreground">
        {t2(
          "chat.sessionListUnavailable.title",
          "Chat is temporarily unavailable",
        )}
      </div>
      <div>
        {t2(
          "chat.sessionListUnavailable.description",
          "The current workspace, canvas, assets, and loaded messages remain available. Retry loading chat sessions.",
        )}
      </div>
      <Button$1
        variant="outline"
        size="sm"
        className="mt-1.5 h-6 px-2 text-xs"
        onClick={onRetry}
      >
        {t2("chat.retry", "Retry")}
      </Button$1>
    </div>
  );
}

export function StalledTurnBanner({
  minutes,
  watchdog,
  onKeepWaiting,
  onStop,
}) {
  const { t: t2 } = useTranslation();
  const isHardCap = watchdog === "hard_cap";
  return (
    <div className="mb-2 border border-border [border-width:var(--divider-width)] rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <div className="font-medium text-foreground">
        {isHardCap
          ? t2(
              "chat.stalled.hardCapTitle",
              "Task has been running for a long time",
            )
          : t2(
              "chat.stalled.title",
              "Task is running but hasn't responded for a while",
            )}
      </div>
      <div>
        {isHardCap
          ? t2(
              "chat.stalled.hardCapDescription",
              "This task has been running for about {{minutes}} min. You can keep waiting or stop it.",
              {
                minutes,
              },
            )
          : t2(
              "chat.stalled.description",
              "No new progress for about {{minutes}} min. You can keep waiting or stop this task.",
              {
                minutes,
              },
            )}
      </div>
      <div className="mt-1.5 flex gap-2">
        <Button$1
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs"
          data-action-ui-id="chat-stalled-keep-waiting-button"
          onClick={onKeepWaiting}
        >
          {t2("chat.stalled.keepWaiting", "Keep waiting")}
        </Button$1>
        <Button$1
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs"
          data-action-ui-id="chat-stalled-stop-task-button"
          onClick={onStop}
        >
          {t2("chat.stalled.stopTask", "Stop task")}
        </Button$1>
      </div>
    </div>
  );
}

const SELECTION_PLACEHOLDER = {
  key: "chat.textEditAgent.selectionPlaceholder",
  fallback:
    "How should I revise this selection? Tell me the tone, focus, or length",
};

const WHOLE_DOCUMENT_PLACEHOLDER = {
  key: "chat.textEditAgent.wholeDocumentPlaceholder",
  fallback:
    "Want to make the whole piece shine? Tell me the goal, tone, or length",
};

export function textAgentInputPlaceholder(hasSelection2) {
  return hasSelection2 ? SELECTION_PLACEHOLDER : WHOLE_DOCUMENT_PLACEHOLDER;
}

const SELECTION_QUOTE_MAX_LENGTH = 40;

export const DOCUMENT_EDIT_TARGETS_PER_ANNOTATION = 32;

export function buildSelectionQuote(anchors2) {
  const normalized = anchors2
    .map((anchor) => anchor.exact)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= SELECTION_QUOTE_MAX_LENGTH) return normalized;
  return `${normalized.slice(0, SELECTION_QUOTE_MAX_LENGTH)}…`;
}

export const MILLISECONDS_PER_MINUTE = 6e4;
