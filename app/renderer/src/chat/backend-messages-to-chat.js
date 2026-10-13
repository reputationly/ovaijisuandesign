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

function trimRepeatedChildTranscriptPrefixes(messages2) {
  const previousTranscriptByRenderKey = new Map();
  const trimmedMessages = [];
  for (const message2 of messages2) {
    if (message2.type !== "sub_agent") {
      trimmedMessages.push(message2);
      continue;
    }
    const renderKey = message2.partId ?? message2.childSessionId;
    if (!renderKey) {
      trimmedMessages.push(message2);
      continue;
    }
    const current2 = message2.subMessages ?? [];
    const previous2 = previousTranscriptByRenderKey.get(renderKey);
    previousTranscriptByRenderKey.set(renderKey, current2);
    if (!previous2 || current2.length < previous2.length) {
      trimmedMessages.push(message2);
      continue;
    }
    const repeatsPrevious = previous2.every(
      (subMessage, index2) =>
        subMessageSemanticKey(subMessage) ===
        subMessageSemanticKey(current2[index2]),
    );
    if (!repeatsPrevious) {
      trimmedMessages.push(message2);
      continue;
    }
    const incrementalSubMessages = current2.slice(previous2.length);
    if (incrementalSubMessages.length > 0) {
      trimmedMessages.push({
        ...message2,
        subMessages: incrementalSubMessages,
      });
    }
  }
  return trimmedMessages;
}

function fillEmptySubAgentTaskDetails(messages2) {
  const pendingPromptBySubAgentKey = new Map();
  return messages2.map((message2) => {
    if (message2.type === "tool" && message2.content === "task") {
      const key22 = message2.partId
        ? subAgentHistoryPartId(message2.partId)
        : message2.childSessionId;
      const prompt2 = extractTaskDisplayPrompt(message2.toolArgs);
      if (key22 && prompt2) pendingPromptBySubAgentKey.set(key22, prompt2);
      return message2;
    }
    if (message2.type !== "sub_agent") return message2;
    const key2 = message2.partId ?? message2.childSessionId;
    if (!key2) return message2;
    const prompt = pendingPromptBySubAgentKey.get(key2);
    pendingPromptBySubAgentKey.delete(key2);
    if (!prompt || (message2.subMessages?.length ?? 0) > 0) return message2;
    return {
      ...message2,
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
    const identity2 = backendMessage.runtimeMessageId
      ? {
          runtimeMessageId: backendMessage.runtimeMessageId,
        }
      : {};
    switch (backendMessage.type) {
      case "tool_result": {
        const toolIdx = findLastIndex(result, (message) => message.type === "tool");
        if (toolIdx >= 0) {
          const tool2 = result[toolIdx];
          result[toolIdx] = {
            ...tool2,
            toolResult: backendMessage.content,
          };
        }
        break;
      }
      case "text": {
        const content2 = stripContextPrefix(backendMessage.content);
        if (backendMessage.role === "user" && isCancelMarkerText(content2)) {
          const generationHandoffTargets =
            backendMessage.generationHandoffTargets ??
            parseCanvasGenerationHandoffTargets(content2);
          const hasCanvasContinuation =
            generationHandoffTargets.length > 0 ||
            cancelMarkerHasCanvasContinuation(content2);
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
              const matches2 = generationHandoffTargets.filter(
                (target) => target.tool_use_id === message.callID,
              );
              if (matches2.length > 0) {
                result[index] = {
                  ...message,
                  interruption: "canvas_continuation",
                  generationHandoffTargets: matches2,
                };
              }
            }
          }
          result.push({
            id: nextMessageId(),
            ...identity2,
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
          content: content2,
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
          ...identity2,
        });
        break;
      }
      case "thinking":
        result.push({
          id: nextMessageId(),
          ...identity2,
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
          ...identity2,
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
            ...identity2,
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
          ...identity2,
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
            ...identity2,
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
          ...identity2,
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
            ...identity2,
          });
          subAgentIndex = result.length - 1;
        }
        const subAgentMessage = result[subAgentIndex];
        const toolName2 = serverToolName(backendMessage) ?? "tool";
        result[subAgentIndex] = {
          ...subAgentMessage,
          subMessages: [
            ...(subAgentMessage.subMessages ?? []),
            {
              id: nextMessageId(),
              type: "tool",
              content: toolName2,
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
            ...identity2,
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
            const toolName2 =
              toolNameFromSubContent(toolSubMessage.content) ?? eventToolName ?? "tool";
            subs[toolIdx] = {
              ...toolSubMessage,
              content: `${toolName2}: ${backendMessage.content}`,
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
