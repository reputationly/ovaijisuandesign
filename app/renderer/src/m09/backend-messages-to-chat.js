// backend-messages-to-chat.js
import { ErrorCodes } from "../m15/push-inline.js";
import { findLastIndex } from "../m08/support-01.js";
import {
  stripContextPrefix,
  isCancelMarkerText,
  parseCanvasGenerationHandoffTargets,
  cancelMarkerHasCanvasContinuation,
  isRecoveredMessage,
} from "../m01/myers-line-hunks.js";
import {
  attachHandoffTargetsToSubMessages,
  subMessageSemanticKey,
  extractTaskDisplayPrompt,
} from "../m08/part-store.jsx";
import {
  nextMessageId,
  mapToolStatus,
  findHistorySubAgentIndex,
  createHistorySubAgentMessage,
  serverToolName,
  serverCallID,
  toolNameFromSubContent,
  inferToolResultStatus,
  optionalStringField,
  subAgentHistoryPartId,
} from "../m08/reduce-server-message.js";
export function backendMessagesToChat(msgs) {
  const result = [];
  for (const m3 of msgs) {
    if (m3.type === "done") continue;
    const identity2 = m3.runtimeMessageId
      ? {
          runtimeMessageId: m3.runtimeMessageId,
        }
      : {};
    switch (m3.type) {
      case "tool_result": {
        const toolIdx = findLastIndex(result, (r2) => r2.type === "tool");
        if (toolIdx >= 0) {
          const tool2 = result[toolIdx];
          result[toolIdx] = {
            ...tool2,
            toolResult: m3.content,
          };
        }
        break;
      }
      case "text": {
        const content2 = stripContextPrefix(m3.content);
        if (m3.role === "user" && isCancelMarkerText(content2)) {
          const generationHandoffTargets =
            m3.generationHandoffTargets ?? parseCanvasGenerationHandoffTargets(content2);
          const hasCanvasContinuation =
            generationHandoffTargets.length > 0 || cancelMarkerHasCanvasContinuation(content2);
          for (let i2 = result.length - 1; i2 >= 0; i2--) {
            const r2 = result[i2];
            if (r2.type === "text" && r2.role === "user") break;
            if (r2.type === "sub_agent") {
              result[i2] = {
                ...r2,
                cancelled: true,
                subMessages: r2.subMessages
                  ? attachHandoffTargetsToSubMessages(r2.subMessages, generationHandoffTargets)
                  : r2.subMessages,
              };
            } else if (r2.type === "tool" && r2.callID) {
              const matches2 = generationHandoffTargets.filter(
                (target) => target.tool_use_id === r2.callID,
              );
              if (matches2.length > 0) {
                result[i2] = {
                  ...r2,
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
        const role = m3.role === "user" ? "user" : "agent";
        result.push({
          id: nextMessageId(),
          role,
          type: "text",
          content: content2,
          agent: role === "user" ? void 0 : "main",
          ...(role === "user" && m3.attachments?.length
            ? {
                attachments: m3.attachments,
              }
            : {}),
          ...(role === "user" && m3.documentAnnotations?.length
            ? {
                documentAnnotations: m3.documentAnnotations,
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
          content: m3.content,
          thinkingContent: m3.content,
          agent: "main",
        });
        break;
      case "error":
        if (m3.error_code === ErrorCodes.CONTENT_POLICY_VIOLATION && m3.runtimeMessageId) {
          result.push({
            id: nextMessageId(),
            role: "agent",
            type: "withdrawn",
            runtimeMessageId: m3.runtimeMessageId,
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
          content: m3.content,
        });
        break;
      case "tool_call": {
        const toolStatus = mapToolStatus(m3.status);
        if (m3.tool === "task") {
          const childSessionId = m3.childSessionId;
          const taskMsg = {
            id: nextMessageId(),
            ...identity2,
            role: "agent",
            type: "tool",
            content: "task",
            partId: m3.taskPartId,
            url: m3.args,
            toolArgs: m3.args,
            toolStatus,
            agent: "main",
            callID: m3.callID,
            childSessionId,
          };
          const saIdx = findHistorySubAgentIndex(result, {
            taskPartId: m3.taskPartId,
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
          content: m3.tool,
          partId: m3.partId,
          url: m3.args,
          toolArgs: m3.args,
          toolStatus,
          agent: "main",
          callID: m3.callID,
        });
        break;
      }
      case "file_added":
        break;
      case "sub_agent_text": {
        const csId = m3.childSessionId;
        let idx = findHistorySubAgentIndex(result, {
          taskPartId: m3.taskPartId,
          childSessionId: csId,
          agent: m3.agent,
        });
        if (idx === -1) {
          result.push({
            ...createHistorySubAgentMessage(m3.agent, csId, m3.taskPartId, true),
            ...identity2,
          });
          idx = result.length - 1;
        }
        const sa = result[idx];
        const subs = sa.subMessages ?? [];
        const lastSub = subs[subs.length - 1];
        if (
          lastSub?.type === "text" &&
          !isRecoveredMessage(m3.content) &&
          !isRecoveredMessage(lastSub.content)
        ) {
          subs[subs.length - 1] = {
            ...lastSub,
            content: lastSub.content + m3.content,
          };
        } else {
          subs.push({
            id: nextMessageId(),
            type: "text",
            content: m3.content,
          });
        }
        result[idx] = {
          ...sa,
          subMessages: subs,
        };
        break;
      }
      case "sub_agent_start": {
        const csId = m3.childSessionId;
        const existingIdx = findHistorySubAgentIndex(result, {
          taskPartId: m3.taskPartId,
          childSessionId: csId,
          agent: m3.agent,
        });
        const latestTaskIdx =
          csId && !m3.taskPartId
            ? findLastIndex(
                result,
                (r2) => r2.type === "tool" && r2.content === "task" && r2.childSessionId === csId,
              )
            : -1;
        const startsNewTaskInvocation =
          !m3.taskPartId && existingIdx >= 0 && latestTaskIdx > existingIdx;
        if (existingIdx >= 0 && !startsNewTaskInvocation) {
          result[existingIdx] = {
            ...result[existingIdx],
            resolved: false,
          };
          break;
        }
        result.push({
          ...createHistorySubAgentMessage(
            m3.agent,
            m3.childSessionId,
            m3.taskPartId,
            false,
            m3.task,
          ),
          ...identity2,
        });
        break;
      }
      case "sub_agent_end": {
        const csId = m3.childSessionId;
        const endIdx = findHistorySubAgentIndex(result, {
          taskPartId: m3.taskPartId,
          childSessionId: csId,
          agent: m3.agent,
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
        const csId = m3.childSessionId;
        let idx = findHistorySubAgentIndex(result, {
          taskPartId: m3.taskPartId,
          childSessionId: csId,
          agent: m3.agent,
        });
        if (idx === -1) {
          result.push({
            ...createHistorySubAgentMessage(m3.agent, csId, m3.taskPartId, true),
            ...identity2,
          });
          idx = result.length - 1;
        }
        const sa = result[idx];
        const toolName2 = serverToolName(m3) ?? "tool";
        result[idx] = {
          ...sa,
          subMessages: [
            ...(sa.subMessages ?? []),
            {
              id: nextMessageId(),
              type: "tool",
              content: toolName2,
              args: m3.args,
              toolStatus: "ok",
              hasToolResult: false,
              callID: serverCallID(m3),
            },
          ],
        };
        break;
      }
      case "sub_agent_thinking": {
        const csId = m3.childSessionId;
        let idx = findHistorySubAgentIndex(result, {
          taskPartId: m3.taskPartId,
          childSessionId: csId,
          agent: m3.agent,
        });
        if (idx === -1) {
          result.push({
            ...createHistorySubAgentMessage(m3.agent, csId, m3.taskPartId, true),
            ...identity2,
          });
          idx = result.length - 1;
        }
        const sa = result[idx];
        const subs = [...(sa.subMessages ?? [])];
        const lastSub = subs[subs.length - 1];
        if (lastSub?.type === "thinking") {
          subs[subs.length - 1] = {
            ...lastSub,
            content: lastSub.content + m3.content,
          };
        } else {
          subs.push({
            id: nextMessageId(),
            type: "thinking",
            content: m3.content,
          });
        }
        result[idx] = {
          ...sa,
          subMessages: subs,
        };
        break;
      }
      case "sub_agent_tool_result": {
        const csId = m3.childSessionId;
        const idx = findHistorySubAgentIndex(result, {
          taskPartId: m3.taskPartId,
          childSessionId: csId,
          agent: m3.agent,
        });
        if (idx >= 0) {
          const sa = result[idx];
          const subs = [...(sa.subMessages ?? [])];
          const callID = serverCallID(m3);
          const eventToolName = serverToolName(m3);
          let toolIdx = findLastIndex(
            subs,
            (s2) =>
              s2.type === "tool" &&
              (callID
                ? s2.callID === callID
                : !eventToolName || toolNameFromSubContent(s2.content) === eventToolName),
          );
          if (toolIdx < 0) toolIdx = findLastIndex(subs, (s2) => s2.type === "tool");
          if (toolIdx >= 0) {
            const sub = subs[toolIdx];
            const toolName2 = toolNameFromSubContent(sub.content) ?? eventToolName ?? "tool";
            subs[toolIdx] = {
              ...sub,
              content: `${toolName2}: ${m3.content}`,
              toolStatus: inferToolResultStatus(m3.content, optionalStringField(m3, "status")),
              hasToolResult: true,
            };
            result[idx] = {
              ...sa,
              subMessages: subs,
            };
          }
        }
        break;
      }
    }
  }
  return fillEmptySubAgentTaskDetails(trimRepeatedChildTranscriptPrefixes(result));
}
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
        subMessageSemanticKey(subMessage) === subMessageSemanticKey(current2[index2]),
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
export function upsertRunningCompactionStatus(messages2) {
  const hasRunningStatus = messages2.some(
    (message2) => message2.type === "compaction_status" && message2.content !== "compacted",
  );
  if (hasRunningStatus) return messages2;
  return [
    ...messages2,
    {
      id: nextMessageId(),
      role: "agent",
      type: "compaction_status",
      content: "compacting",
    },
  ];
}
