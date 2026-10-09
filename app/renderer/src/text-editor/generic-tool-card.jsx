// generic-tool-card.jsx
import { reactExports, useTranslation } from "../vendor.js";
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

function getRunningPhraseKeys(labelId, toolName2) {
  if (labelId === "askUser" && toolName2?.startsWith("hub_preview_")) {
    return [ASK_USER_PREVIEW_PHRASE_KEY];
  }
  return RUNNING_PHRASE_KEYS[labelId] ?? [];
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

export function GenericToolCard({ msg, repeatCount: _repeatCount }) {
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
        {getToolStatusLabel(status, t2, msg.toolResult, msg.interruption)}
      </span>
    </div>
  );
}
