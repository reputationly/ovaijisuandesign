// generic-tool-card.jsx
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { __jsx } from "../shared/jsx-runtime.js";
import { getToolLabelId } from "../chat/has-structured-success-payload.js";
import { BrailleSpinner } from "../chat/chat-empty-state.jsx";
import { getToolDisplayLabel } from "../generation/use-tool-confirm-edit-state.js";
import { getToolStatusLabel } from "../chat/use-tool-confirm-settlement.js";

const RUNNING_PHRASE_KEYS = {
  mediaGen: ["chat.toolPhrase.mediaGen.0", "chat.toolPhrase.mediaGen.1"],
  askUser: ["chat.toolPhrase.askUser.0"],
  canvasOp: ["chat.toolPhrase.canvasOp.0"],
  planOp: ["chat.toolPhrase.planOp.0"],
  spawnSubtask: ["chat.toolPhrase.spawnSubtask.0"],
  skillOp: ["chat.toolPhrase.skillOp.0"],
  searchInfo: ["chat.toolPhrase.searchInfo.0"],
  fileOp: ["chat.toolPhrase.fileOp.0"],
  contentProcess: [
    "chat.toolPhrase.contentProcess.0",
    "chat.toolPhrase.contentProcess.1",
  ],
  browser: ["chat.toolPhrase.browser.0"],
  connectorOp: ["chat.toolPhrase.connectorOp.0"],
  transient: [],
  // silent never renders — empty pool. getRunningPhraseKeys falls back
  // gracefully for any caller that still asks.
  silent: [],
};

const ASK_USER_PREVIEW_PHRASE_KEY = "chat.toolPhrase.askUser.preview.0";

function getRunningPhraseKeys(labelId, toolName) {
  if (labelId === "askUser" && toolName?.startsWith("hub_preview_")) {
    return [ASK_USER_PREVIEW_PHRASE_KEY];
  }
  return RUNNING_PHRASE_KEYS[labelId] ?? [];
}

const ROTATE_INTERVAL_MS = 1e4;

function useRunningPhrase(labelId, isRunning, toolName) {
  const { t } = useTranslation();
  const [index, setIndex] = reactExports.useState(0);
  reactExports.useEffect(() => {
    setIndex(0);
    if (!isRunning) return;
    const keys = getRunningPhraseKeys(labelId, toolName);
    if (keys.length <= 1) return;
    const tick = setInterval(() => {
      setIndex((i) => (i + 1) % keys.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(tick);
  }, [labelId, isRunning, toolName]);
  if (!isRunning) return null;
  const keys = getRunningPhraseKeys(labelId, toolName);
  if (keys.length === 0) return null;
  const key = keys[index] ?? keys[0];
  return key ? t(key) : null;
}

export function GenericToolCard({ msg, repeatCount: _repeatCount }) {
  const { t } = useTranslation();
  const toolName = msg.content;
  const status = msg.toolStatus ?? "pending";
  const labelId = getToolLabelId(toolName);
  const runningPhrase = useRunningPhrase(
    labelId,
    labelId !== "silent" && status === "running",
    toolName,
  );
  if (labelId === "silent") return null;
  const staticLabel = getToolDisplayLabel(toolName, t);
  const chipLabelText = runningPhrase ?? staticLabel;
  const isTask = labelId === "spawnSubtask";
  const toolMarker = isTask
    ? "chat-task-card"
    : status === "ok" && toolName === "hub_canvas_write_node"
      ? "chat-tool-hub-canvas-write-node"
      : void 0;
  return (
    <div
      data-action-ui-id={toolMarker}
      className="min-w-0 flex items-center gap-2 py-1"
    >
      {status === "running" ? (
        <BrailleSpinner
          type="braille"
          className="shrink-0 text-muted-foreground text-sm"
        />
      ) : null}
      <span className="text-body-14 font-medium text-muted-foreground shrink-0 truncate">
        {chipLabelText}
      </span>
      <span
        data-action-ui-id={isTask ? "chat-task-status" : void 0}
        className="ml-auto text-body-14 text-muted-foreground shrink-0"
      >
        {getToolStatusLabel(status, t, msg.toolResult, msg.interruption)}
      </span>
    </div>
  );
}
