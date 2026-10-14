// backend-messages-to-chat.js
import {
  attachHandoffTargetsToSubMessages,
  extractTaskDisplayPrompt,
  subMessageSemanticKey,
} from "./attach-handoff-targets-to-sub-messages.js";
import {
  createHistorySubAgentMessage,
  findHistorySubAgentIndex,
  inferToolResultStatus,
  mapToolStatus,
  nextMessageId,
  optionalStringField,
  serverCallID,
  serverToolName,
  subAgentHistoryPartId,
  toolNameFromSubContent,
} from "./create-history-sub-agent-message.js";
import { ErrorCodes } from "../generation/normalize-skill-detail-metadata.js";
import { findLastIndex } from "../infra/find-last-index.js";
import {
  cancelMarkerHasCanvasContinuation,
  isCancelMarkerText,
  isRecoveredMessage,
  parseCanvasGenerationHandoffTargets,
  stripContextPrefix,
} from "../text-editor/build-asr-gateway-request.js";

function trimRepeatedChildTranscriptPrefixes(messages) {
  const previousTranscriptByRenderKey = new Map();
  const trimmedMessages = [];
  for (const message of messages) {
    if (message.type !== "sub_agent") {
      trimmedMessages.push(message);
      continue;
    }
    const renderKey = message.partId ?? message.childSessionId;
    if (!renderKey) {
      trimmedMessages.push(message);
      continue;
    }
    const current = message.subMessages ?? [];
    const previous = previousTranscriptByRenderKey.get(renderKey);
    previousTranscriptByRenderKey.set(renderKey, current);
    if (!previous || current.length < previous.length) {
      trimmedMessages.push(message);
      continue;
    }
    const repeatsPrevious = previous.every(
      (subMessage, index) =>
        subMessageSemanticKey(subMessage) ===
        subMessageSemanticKey(current[index]),
    );
    if (!repeatsPrevious) {
      trimmedMessages.push(message);
      continue;
    }
    const incrementalSubMessages = current.slice(previous.length);
    if (incrementalSubMessages.length > 0) {
      trimmedMessages.push({
        ...message,
        subMessages: incrementalSubMessages,
      });
    }
  }
  return trimmedMessages;
}

function fillEmptySubAgentTaskDetails(messages) {
  const pendingPromptBySubAgentKey = new Map();
  return messages.map((message) => {
    if (message.type === "tool" && message.content === "task") {
      const key = message.partId
        ? subAgentHistoryPartId(message.partId)
        : message.childSessionId;
      const taskDisplayPrompt = extractTaskDisplayPrompt(message.toolArgs);
      if (key && taskDisplayPrompt) pendingPromptBySubAgentKey.set(key, taskDisplayPrompt);
      return message;
    }
    if (message.type !== "sub_agent") return message;
    const key = message.partId ?? message.childSessionId;
    if (!key) return message;
    const prompt = pendingPromptBySubAgentKey.get(key);
    pendingPromptBySubAgentKey.delete(key);
    if (!prompt || (message.subMessages?.length ?? 0) > 0) return message;
    return {
      ...message,
      subMessages: [
        {
          id: nextMessageId(),
          type: "text",
          content: prompt,
        },
      ],
    };
  });
}

export function backendMessagesToChat(msgs) {
  const result = [];
  for (const backendMessage of msgs) {
    if (backendMessage.type === "done") continue;
    const identity = backendMessage.runtimeMessageId
      ? {
          runtimeMessageId: backendMessage.runtimeMessageId,
        }
      : {};
    switch (backendMessage.type) {
      case "tool_result": {
        const toolIdx = findLastIndex(result, (message) => message.type === "tool");
        if (toolIdx >= 0) {
          const tool = result[toolIdx];
          result[toolIdx] = {
            ...tool,
            toolResult: backendMessage.content,
          };
        }
        break;
      }
      case "text": {
        const content = stripContextPrefix(backendMessage.content);
        if (backendMessage.role === "user" && isCancelMarkerText(content)) {
          const generationHandoffTargets =
            backendMessage.generationHandoffTargets ??
            parseCanvasGenerationHandoffTargets(content);
          const hasCanvasContinuation =
            generationHandoffTargets.length > 0 ||
            cancelMarkerHasCanvasContinuation(content);
          for (let index = result.length - 1; index >= 0; index--) {
            const message = result[index];
            if (message.type === "text" && message.role === "user") break;
            if (message.type === "sub_agent") {
              result[index] = {
                ...message,
                cancelled: true,
                subMessages: message.subMessages
                  ? attachHandoffTargetsToSubMessages(
                      message.subMessages,
                      generationHandoffTargets,
                    )
                  : message.subMessages,
              };
            } else if (message.type === "tool" && message.callID) {
              const matches = generationHandoffTargets.filter(
                (target) => target.tool_use_id === message.callID,
              );
              if (matches.length > 0) {
                result[index] = {
                  ...message,
                  interruption: "canvas_continuation",
                  generationHandoffTargets: matches,
                };
              }
            }
          }
          result.push({
            id: nextMessageId(),
            ...identity,
            role: "agent",
            type: "cancelled",
            content: "",
            ...(hasCanvasContinuation
              ? {
                  generationContinuesOnCanvas: true,
                  generationHandoffTargets,
                }
              : {}),
          });
          break;
        }
        const role = backendMessage.role === "user" ? "user" : "agent";
        result.push({
          id: nextMessageId(),
          role,
          type: "text",
          content,
          agent: role === "user" ? void 0 : "main",
          ...(role === "user" && backendMessage.attachments?.length
            ? {
                attachments: backendMessage.attachments,
              }
            : {}),
          ...(role === "user" && backendMessage.documentAnnotations?.length
            ? {
                documentAnnotations: backendMessage.documentAnnotations,
              }
            : {}),
          ...identity,
        });
        break;
      }
      case "thinking":
        result.push({
          id: nextMessageId(),
          ...identity,
          role: "agent",
          type: "thinking",
          content: backendMessage.content,
          thinkingContent: backendMessage.content,
          agent: "main",
        });
        break;
      case "error":
        if (
          backendMessage.error_code === ErrorCodes.CONTENT_POLICY_VIOLATION &&
          backendMessage.runtimeMessageId
        ) {
          result.push({
            id: nextMessageId(),
            role: "agent",
            type: "withdrawn",
            runtimeMessageId: backendMessage.runtimeMessageId,
            reason: ErrorCodes.CONTENT_POLICY_VIOLATION,
            content: "",
          });
          break;
        }
        result.push({
          id: nextMessageId(),
          ...identity,
          role: "agent",
          type: "error",
          content: backendMessage.content,
        });
        break;
      case "tool_call": {
        const toolStatus = mapToolStatus(backendMessage.status);
        if (backendMessage.tool === "task") {
          const childSessionId = backendMessage.childSessionId;
          const taskMsg = {
            id: nextMessageId(),
            ...identity,
            role: "agent",
            type: "tool",
            content: "task",
            partId: backendMessage.taskPartId,
            url: backendMessage.args,
            toolArgs: backendMessage.args,
            toolStatus,
            agent: "main",
            callID: backendMessage.callID,
            childSessionId,
          };
          const saIdx = findHistorySubAgentIndex(result, {
            taskPartId: backendMessage.taskPartId,
            childSessionId,
            unresolvedOnly: true,
            matchAnyAgent: true,
          });
          if (saIdx >= 0) {
            result.splice(saIdx, 0, taskMsg);
          } else {
            result.push(taskMsg);
          }
          break;
        }
        result.push({
          id: nextMessageId(),
          ...identity,
          role: "agent",
          type: "tool",
          content: backendMessage.tool,
          partId: backendMessage.partId,
          url: backendMessage.args,
          toolArgs: backendMessage.args,
          toolStatus,
          agent: "main",
          callID: backendMessage.callID,
        });
        break;
      }
      case "file_added":
        break;
      case "sub_agent_text": {
        const csId = backendMessage.childSessionId;
        let subAgentIndex = findHistorySubAgentIndex(result, {
          taskPartId: backendMessage.taskPartId,
          childSessionId: csId,
          agent: backendMessage.agent,
        });
        if (subAgentIndex === -1) {
          result.push({
            ...createHistorySubAgentMessage(
              backendMessage.agent,
              csId,
              backendMessage.taskPartId,
              true,
            ),
            ...identity,
          });
          subAgentIndex = result.length - 1;
        }
        const subAgentMessage = result[subAgentIndex];
        const subs = subAgentMessage.subMessages ?? [];
        const lastSub = subs[subs.length - 1];
        if (
          lastSub?.type === "text" &&
          !isRecoveredMessage(backendMessage.content) &&
          !isRecoveredMessage(lastSub.content)
        ) {
          subs[subs.length - 1] = {
            ...lastSub,
            content: lastSub.content + backendMessage.content,
          };
        } else {
          subs.push({
            id: nextMessageId(),
            type: "text",
            content: backendMessage.content,
          });
        }
        result[subAgentIndex] = {
          ...subAgentMessage,
          subMessages: subs,
        };
        break;
      }
      case "sub_agent_start": {
        const csId = backendMessage.childSessionId;
        const existingIdx = findHistorySubAgentIndex(result, {
          taskPartId: backendMessage.taskPartId,
          childSessionId: csId,
          agent: backendMessage.agent,
        });
        const latestTaskIdx =
          csId && !backendMessage.taskPartId
            ? findLastIndex(
                result,
                (message) =>
                  message.type === "tool" &&
                  message.content === "task" &&
                  message.childSessionId === csId,
              )
            : -1;
        const startsNewTaskInvocation =
          !backendMessage.taskPartId && existingIdx >= 0 && latestTaskIdx > existingIdx;
        if (existingIdx >= 0 && !startsNewTaskInvocation) {
          result[existingIdx] = {
            ...result[existingIdx],
            resolved: false,
          };
          break;
        }
        result.push({
          ...createHistorySubAgentMessage(
            backendMessage.agent,
            backendMessage.childSessionId,
            backendMessage.taskPartId,
            false,
            backendMessage.task,
          ),
          ...identity,
        });
        break;
      }
      case "sub_agent_end": {
        const csId = backendMessage.childSessionId;
        const endIdx = findHistorySubAgentIndex(result, {
          taskPartId: backendMessage.taskPartId,
          childSessionId: csId,
          agent: backendMessage.agent,
          unresolvedOnly: true,
        });
        if (endIdx >= 0) {
          result[endIdx] = {
            ...result[endIdx],
            resolved: true,
          };
        }
        break;
      }
      case "sub_agent_tool_call": {
        const csId = backendMessage.childSessionId;
        let subAgentIndex = findHistorySubAgentIndex(result, {
          taskPartId: backendMessage.taskPartId,
          childSessionId: csId,
          agent: backendMessage.agent,
        });
        if (subAgentIndex === -1) {
          result.push({
            ...createHistorySubAgentMessage(
              backendMessage.agent,
              csId,
              backendMessage.taskPartId,
              true,
            ),
            ...identity,
          });
          subAgentIndex = result.length - 1;
        }
        const subAgentMessage = result[subAgentIndex];
        const toolName = serverToolName(backendMessage) ?? "tool";
        result[subAgentIndex] = {
          ...subAgentMessage,
          subMessages: [
            ...(subAgentMessage.subMessages ?? []),
            {
              id: nextMessageId(),
              type: "tool",
              content: toolName,
              args: backendMessage.args,
              toolStatus: "ok",
              hasToolResult: false,
              callID: serverCallID(backendMessage),
            },
          ],
        };
        break;
      }
      case "sub_agent_thinking": {
        const csId = backendMessage.childSessionId;
        let subAgentIndex = findHistorySubAgentIndex(result, {
          taskPartId: backendMessage.taskPartId,
          childSessionId: csId,
          agent: backendMessage.agent,
        });
        if (subAgentIndex === -1) {
          result.push({
            ...createHistorySubAgentMessage(
              backendMessage.agent,
              csId,
              backendMessage.taskPartId,
              true,
            ),
            ...identity,
          });
          subAgentIndex = result.length - 1;
        }
        const subAgentMessage = result[subAgentIndex];
        const subs = [...(subAgentMessage.subMessages ?? [])];
        const lastSub = subs[subs.length - 1];
        if (lastSub?.type === "thinking") {
          subs[subs.length - 1] = {
            ...lastSub,
            content: lastSub.content + backendMessage.content,
          };
        } else {
          subs.push({
            id: nextMessageId(),
            type: "thinking",
            content: backendMessage.content,
          });
        }
        result[subAgentIndex] = {
          ...subAgentMessage,
          subMessages: subs,
        };
        break;
      }
      case "sub_agent_tool_result": {
        const csId = backendMessage.childSessionId;
        const subAgentIndex = findHistorySubAgentIndex(result, {
          taskPartId: backendMessage.taskPartId,
          childSessionId: csId,
          agent: backendMessage.agent,
        });
        if (subAgentIndex >= 0) {
          const subAgentMessage = result[subAgentIndex];
          const subs = [...(subAgentMessage.subMessages ?? [])];
          const callID = serverCallID(backendMessage);
          const eventToolName = serverToolName(backendMessage);
          let toolIdx = findLastIndex(
            subs,
            (subMessage) =>
              subMessage.type === "tool" &&
              (callID
                ? subMessage.callID === callID
                : !eventToolName ||
                  toolNameFromSubContent(subMessage.content) === eventToolName),
          );
          if (toolIdx < 0)
            toolIdx = findLastIndex(subs, (subMessage) => subMessage.type === "tool");
          if (toolIdx >= 0) {
            const toolSubMessage = subs[toolIdx];
            const toolName =
              toolNameFromSubContent(toolSubMessage.content) ?? eventToolName ?? "tool";
            subs[toolIdx] = {
              ...toolSubMessage,
              content: `${toolName}: ${backendMessage.content}`,
              toolStatus: inferToolResultStatus(
                backendMessage.content,
                optionalStringField(backendMessage, "status"),
              ),
              hasToolResult: true,
            };
            result[subAgentIndex] = {
              ...subAgentMessage,
              subMessages: subs,
            };
          }
        }
        break;
      }
    }
  }
  return fillEmptySubAgentTaskDetails(
    trimRepeatedChildTranscriptPrefixes(result),
  );
}
