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

function collectFromAsyncTaskText(content2, seen2, artifacts) {
  if (!content2.startsWith(ASYNC_TASK_COMPLETED_PREFIX)) return;
  const payload = parseJsonPayload(
    content2.slice(ASYNC_TASK_COMPLETED_PREFIX.length),
  );
  collectAssetOutputs(payload, seen2, artifacts);
}

function extractToolNameFromSubContent(content2) {
  const colonIdx = content2.indexOf(": ");
  return colonIdx > 0 ? content2.slice(0, colonIdx) : content2;
}

function extractToolResultFromSubContent(content2) {
  const colonIdx = content2.indexOf(": ");
  return colonIdx > 0 ? content2.slice(colonIdx + 2) : void 0;
}

export function collectFromSubMessages(subs, seen2, artifacts) {
  for (const subMessage of subs) {
    if (subMessage.type === "image" || subMessage.type === "video" || subMessage.type === "audio") {
      const url2 = subMessage.url ?? subMessage.content;
      if (url2) addArtifact(seen2, artifacts, subMessage.type, url2);
      continue;
    }
    if (subMessage.type === "text") {
      collectFromRecoveredText(subMessage.content, seen2, artifacts);
      continue;
    }
    if (subMessage.type === "tool") {
      const toolName2 = extractToolNameFromSubContent(subMessage.content);
      const status = subMessage.toolStatus ?? "ok";
      if (status !== "ok") continue;
      const result = extractToolResultFromSubContent(subMessage.content);
      if (!result) continue;
      collectFromTaskResultText(toolName2, result, seen2, artifacts);
      collectFromToolPayload(
        toolName2,
        parseJsonPayload(subMessage.args),
        parseJsonPayload(result),
        seen2,
        artifacts,
      );
      continue;
    }
    if (subMessage.type === "sub_agent" && subMessage.subMessages) {
      collectFromSubMessages(subMessage.subMessages, seen2, artifacts);
    }
  }
}

function collectFallbackFromSubMessages(subs, seen2, artifacts) {
  collectFromSubMessages(subs, seen2, artifacts);
}

export function collectFallbackTurnArtifacts(messages2) {
  const seen2 = new Set();
  const artifacts = [];
  for (const message of messages2) {
    if (message.type === "tool") {
      const toolMsg = message;
      const toolName2 = toolMsg.toolName?.trim() || toolMsg.content;
      if (
        toolMsg.toolStatus !== "ok" ||
        !toolMsg.toolResult ||
        (!isCanvasTextWriteTool(toolName2) && !isTaskTool(toolName2))
      ) {
        continue;
      }
      collectFromTaskResultText(toolName2, toolMsg.toolResult, seen2, artifacts);
      collectFromToolPayload(
        toolName2,
        parseJsonPayload(toolMsg.toolArgs),
        parseJsonPayload(toolMsg.toolResult),
        seen2,
        artifacts,
      );
      continue;
    }
    if (message.type === "text" && message.role === "user") {
      collectFromAsyncTaskText(message.content, seen2, artifacts);
      collectFromRecoveredText(message.content, seen2, artifacts);
      continue;
    }
    if (message.type === "sub_agent") {
      const subAgentMessage = message;
      if (subAgentMessage.subMessages)
        collectFallbackFromSubMessages(subAgentMessage.subMessages, seen2, artifacts);
    }
  }
  return artifacts;
}
