// collect-fallback-turn-artifacts.js
import {
  addArtifact,
  CANVAS_WRITE_NODE_RE,
  collectAssetOutputs,
  collectFromRecoveredText,
  collectFromTaskResultText,
  isTaskTool,
  parseJsonPayload,
} from "./collect-asset-outputs.js";
import { collectFromToolPayload } from "./extract-paths-from-payload.js";

const ASYNC_TASK_COMPLETED_PREFIX = "Async task completed:\n";

function isCanvasTextWriteTool(toolName2) {
  return CANVAS_WRITE_NODE_RE.test(toolName2);
}

function collectFromAsyncTaskText(content2, seen2, out) {
  if (!content2.startsWith(ASYNC_TASK_COMPLETED_PREFIX)) return;
  const payload = parseJsonPayload(
    content2.slice(ASYNC_TASK_COMPLETED_PREFIX.length),
  );
  collectAssetOutputs(payload, seen2, out);
}

function extractToolNameFromSubContent(content2) {
  const colonIdx = content2.indexOf(": ");
  return colonIdx > 0 ? content2.slice(0, colonIdx) : content2;
}

function extractToolResultFromSubContent(content2) {
  const colonIdx = content2.indexOf(": ");
  return colonIdx > 0 ? content2.slice(colonIdx + 2) : void 0;
}

export function collectFromSubMessages(subs, seen2, out) {
  for (const sub of subs) {
    if (sub.type === "image" || sub.type === "video" || sub.type === "audio") {
      const url2 = sub.url ?? sub.content;
      if (url2) addArtifact(seen2, out, sub.type, url2);
      continue;
    }
    if (sub.type === "text") {
      collectFromRecoveredText(sub.content, seen2, out);
      continue;
    }
    if (sub.type === "tool") {
      const toolName2 = extractToolNameFromSubContent(sub.content);
      const status = sub.toolStatus ?? "ok";
      if (status !== "ok") continue;
      const result = extractToolResultFromSubContent(sub.content);
      if (!result) continue;
      collectFromTaskResultText(toolName2, result, seen2, out);
      collectFromToolPayload(
        toolName2,
        parseJsonPayload(sub.args),
        parseJsonPayload(result),
        seen2,
        out,
      );
      continue;
    }
    if (sub.type === "sub_agent" && sub.subMessages) {
      collectFromSubMessages(sub.subMessages, seen2, out);
    }
  }
}

function collectFallbackFromSubMessages(subs, seen2, out) {
  collectFromSubMessages(subs, seen2, out);
}

export function collectFallbackTurnArtifacts(messages2) {
  const seen2 = new Set();
  const out = [];
  for (const msg of messages2) {
    if (msg.type === "tool") {
      const toolMsg = msg;
      const toolName2 = toolMsg.toolName?.trim() || toolMsg.content;
      if (
        toolMsg.toolStatus !== "ok" ||
        !toolMsg.toolResult ||
        (!isCanvasTextWriteTool(toolName2) && !isTaskTool(toolName2))
      ) {
        continue;
      }
      collectFromTaskResultText(toolName2, toolMsg.toolResult, seen2, out);
      collectFromToolPayload(
        toolName2,
        parseJsonPayload(toolMsg.toolArgs),
        parseJsonPayload(toolMsg.toolResult),
        seen2,
        out,
      );
      continue;
    }
    if (msg.type === "text" && msg.role === "user") {
      collectFromAsyncTaskText(msg.content, seen2, out);
      collectFromRecoveredText(msg.content, seen2, out);
      continue;
    }
    if (msg.type === "sub_agent") {
      const sub = msg;
      if (sub.subMessages)
        collectFallbackFromSubMessages(sub.subMessages, seen2, out);
    }
  }
  return out;
}
