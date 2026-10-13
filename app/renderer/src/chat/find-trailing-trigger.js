// find-trailing-trigger.js
import { RESOURCE_DRAG_MIME } from "../text-editor/build-asr-gateway-request.js";

export function hasFileDropPayload(dataTransfer) {
  if (!dataTransfer) return false;
  const types = Array.from(dataTransfer.types ?? []);
  return types.includes("Files") || types.includes(RESOURCE_DRAG_MIME);
}

export function currentCanvasWorkflowNodeKey(workflow) {
  return `${workflow.id}\0${workflow.title}\0${workflow.copyOrdinal ?? ""}\0${workflow.canvasNodeId ?? ""}`;
}

export function findTrailingTrigger(textBeforeCaret, trigger, invalidChars) {
  const escaped = trigger === "/" ? "\\/" : trigger;
  const trailingTriggerPattern = new RegExp(`${escaped}([^${invalidChars}]*)$`);
  const match = textBeforeCaret.match(trailingTriggerPattern);
  if (!match) return null;
  const start = match.index ?? 0;
  return {
    start,
    query: match[1] ?? "",
  };
}

export function findMentionTrigger(textBeforeCaret) {
  return findTrailingTrigger(textBeforeCaret, "@", "\\s@");
}
