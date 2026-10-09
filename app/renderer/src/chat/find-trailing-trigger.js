// find-trailing-trigger.js
import { RESOURCE_DRAG_MIME } from "../text-editor/build-asr-gateway-request.js";

export function hasFileDropPayload(dataTransfer) {
  if (!dataTransfer) return false;
  const types2 = Array.from(dataTransfer.types ?? []);
  return types2.includes("Files") || types2.includes(RESOURCE_DRAG_MIME);
}

export function currentCanvasWorkflowNodeKey(workflow) {
  return `${workflow.id}\0${workflow.title}\0${workflow.copyOrdinal ?? ""}\0${workflow.canvasNodeId ?? ""}`;
}

export function findTrailingTrigger(textBeforeCaret, trigger, invalidChars) {
  const escaped = trigger === "/" ? "\\/" : trigger;
  const re2 = new RegExp(`${escaped}([^${invalidChars}]*)$`);
  const match2 = textBeforeCaret.match(re2);
  if (!match2) return null;
  const start2 = match2.index ?? 0;
  return {
    start: start2,
    query: match2[1] ?? "",
  };
}

export function findMentionTrigger(textBeforeCaret) {
  return findTrailingTrigger(textBeforeCaret, "@", "\\s@");
}
