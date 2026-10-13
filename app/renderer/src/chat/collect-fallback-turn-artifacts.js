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

function isCanvasTextWriteTool(toolName) {
  return CANVAS_WRITE_NODE_RE.test(toolName);
}

function collectFromAsyncTaskText(content, seen, artifacts) {
  if (!content.startsWith(ASYNC_TASK_COMPLETED_PREFIX)) return;
  const payload = parseJsonPayload(
    content.slice(ASYNC_TASK_COMPLETED_PREFIX.length),
  );
  collectAssetOutputs(payload, seen, artifacts);
}

function extractToolNameFromSubContent(content) {
  const colonIdx = content.indexOf(": ");
  return colonIdx > 0 ? content.slice(0, colonIdx) : content;
}

function extractToolResultFromSubContent(content) {
  const colonIdx = content.indexOf(": ");
  return colonIdx > 0 ? content.slice(colonIdx + 2) : void 0;
}

export function collectFromSubMessages(subs, seen, artifacts) {
  for (const subMessage of subs) {
    if (subMessage.type === "image" || subMessage.type === "video" || subMessage.type === "audio") {
      const url = subMessage.url ?? subMessage.content;
      if (url) addArtifact(seen, artifacts, subMessage.type, url);
      continue;
    }
    if (subMessage.type === "text") {
      collectFromRecoveredText(subMessage.content, seen, artifacts);
      continue;
    }
    if (subMessage.type === "tool") {
      const toolName = extractToolNameFromSubContent(subMessage.content);
      const status = subMessage.toolStatus ?? "ok";
      if (status !== "ok") continue;
      const result = extractToolResultFromSubContent(subMessage.content);
      if (!result) continue;
      collectFromTaskResultText(toolName, result, seen, artifacts);
      collectFromToolPayload(
        toolName,
        parseJsonPayload(subMessage.args),
        parseJsonPayload(result),
        seen,
        artifacts,
      );
      continue;
    }
    if (subMessage.type === "sub_agent" && subMessage.subMessages) {
      collectFromSubMessages(subMessage.subMessages, seen, artifacts);
    }
  }
}

function collectFallbackFromSubMessages(subs, seen, artifacts) {
  collectFromSubMessages(subs, seen, artifacts);
}

export function collectFallbackTurnArtifacts(messages) {
  const seen = new Set();
  const artifacts = [];
  for (const message of messages) {
    if (message.type === "tool") {
      const toolMsg = message;
      const toolName = toolMsg.toolName?.trim() || toolMsg.content;
      if (
        toolMsg.toolStatus !== "ok" ||
        !toolMsg.toolResult ||
        (!isCanvasTextWriteTool(toolName) && !isTaskTool(toolName))
      ) {
        continue;
      }
      collectFromTaskResultText(toolName, toolMsg.toolResult, seen, artifacts);
      collectFromToolPayload(
        toolName,
        parseJsonPayload(toolMsg.toolArgs),
        parseJsonPayload(toolMsg.toolResult),
        seen,
        artifacts,
      );
      continue;
    }
    if (message.type === "text" && message.role === "user") {
      collectFromAsyncTaskText(message.content, seen, artifacts);
      collectFromRecoveredText(message.content, seen, artifacts);
      continue;
    }
    if (message.type === "sub_agent") {
      const subAgentMessage = message;
      if (subAgentMessage.subMessages)
        collectFallbackFromSubMessages(subAgentMessage.subMessages, seen, artifacts);
    }
  }
  return artifacts;
}
