// stalled-turn-banner.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import jsxRuntimeExports from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { Button } from "../infra/dialog-content.jsx";
export function QuestionComposerGate({ blocked, dock, children }) {
  return (
    <>
      {blocked ? dock : null}
      <div
        className={blocked ? "hidden" : "contents"}
        hidden={blocked}
        aria-hidden={blocked ? true : void 0}
        inert={blocked ? true : void 0}
      >
        {children}
      </div>
    </>
  );
}
export function queuedMessageSuccessorIds(messages, clientMessageId) {
  const editIndex = messages.findIndex(
    (item) => item.clientMessageId === clientMessageId,
  );
  if (editIndex === -1) return [];
  return messages
    .slice(editIndex + 1)
    .map((item) => item.queueId)
    .filter((queueId) => Boolean(queueId));
}
export function restoreQueuedMessageToComposer(
  input,
  message,
  setPendingInput,
  trackInputChange,
) {
  input?.reset();
  setPendingInput(message.text);
  trackInputChange(message.text);
  input?.setInputText(message.text);
  for (const path of message.attachments ?? []) {
    const nodeId = message.canvasNodeAttachments?.find(
      (attachment) => attachment.path === path,
    )?.nodeId;
    input?.addFromAssetPath(path, path.split("/").pop() || path, nodeId);
  }
  requestAnimationFrame(() => input?.focus());
}
export function SessionListUnavailableNotice({ onRetry }) {
  const { t: translate } = useTranslation();
  return (
    <div
      className="mb-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
      data-action-ui-id="chat.session-list-unavailable"
    >
      <div className="font-medium text-foreground">
        {translate(
          "chat.sessionListUnavailable.title",
          "Chat is temporarily unavailable",
        )}
      </div>
      <div>
        {translate(
          "chat.sessionListUnavailable.description",
          "The current workspace, canvas, assets, and loaded messages remain available. Retry loading chat sessions.",
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-1.5 h-6 px-2 text-xs"
        onClick={onRetry}
      >
        {translate("chat.retry", "Retry")}
      </Button>
    </div>
  );
}
export function StalledTurnBanner({
  minutes,
  watchdog,
  onKeepWaiting,
  onStop,
}) {
  const { t: translate } = useTranslation();
  const isHardCap = watchdog === "hard_cap";
  return (
    <div className="mb-2 border border-border [border-width:var(--divider-width)] rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <div className="font-medium text-foreground">
        {isHardCap
          ? translate(
              "chat.stalled.hardCapTitle",
              "Task has been running for a long time",
            )
          : translate(
              "chat.stalled.title",
              "Task is running but hasn't responded for a while",
            )}
      </div>
      <div>
        {isHardCap
          ? translate(
              "chat.stalled.hardCapDescription",
              "This task has been running for about {{minutes}} min. You can keep waiting or stop it.",
              {
                minutes,
              },
            )
          : translate(
              "chat.stalled.description",
              "No new progress for about {{minutes}} min. You can keep waiting or stop this task.",
              {
                minutes,
              },
            )}
      </div>
      <div className="mt-1.5 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs"
          data-action-ui-id="chat-stalled-keep-waiting-button"
          onClick={onKeepWaiting}
        >
          {translate("chat.stalled.keepWaiting", "Keep waiting")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs"
          data-action-ui-id="chat-stalled-stop-task-button"
          onClick={onStop}
        >
          {translate("chat.stalled.stopTask", "Stop task")}
        </Button>
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
export function textAgentInputPlaceholder(hasSelection) {
  return hasSelection ? SELECTION_PLACEHOLDER : WHOLE_DOCUMENT_PLACEHOLDER;
}
const SELECTION_QUOTE_MAX_LENGTH = 40;
export const DOCUMENT_EDIT_TARGETS_PER_ANNOTATION = 32;
export function buildSelectionQuote(anchors) {
  const normalized = anchors
    .map((anchor) => anchor.exact)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= SELECTION_QUOTE_MAX_LENGTH) return normalized;
  return `${normalized.slice(0, SELECTION_QUOTE_MAX_LENGTH)}…`;
}
export const MILLISECONDS_PER_MINUTE = 6e4;
