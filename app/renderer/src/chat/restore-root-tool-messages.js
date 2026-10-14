// restore-root-tool-messages.js
import {
  extractChildSessionId,
  subMessageSemanticKey,
} from "./attach-handoff-targets-to-sub-messages.js";
import { createStreamingBuffers } from "./create-history-sub-agent-message.js";
import { reduceServerMessage } from "./reduce-server-message.js";

export function completeLatestCompactionStatus(messages) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (
      message.type !== "compaction_status" ||
      message.content === "compacted"
    )
      continue;
    const next = [...messages];
    next[index] = {
      ...message,
      content: "compacted",
    };
    return next;
  }
  return messages;
}

export function clearRunningCompactionStatus(messages) {
  return messages.filter(
    (message) =>
      message.type !== "compaction_status" || message.content === "compacted",
  );
}

function compactionAnchorKeys(message) {
  return [
    ...(message.partId ? [`part:${message.partId}`] : []),
    ...(message.runtimeMessageId
      ? [`runtime:${message.runtimeMessageId}`]
      : []),
    `id:${message.id}`,
  ];
}

export function retainCompletedCompactionStatuses(messageHistory, previous) {
  if (
    !previous.some(
      (message) =>
        message.type === "compaction_status" &&
        message.content === "compacted",
    )
  ) {
    return messageHistory;
  }
  const positions = new Map();
  for (let index = messageHistory.length - 1; index >= 0; index--) {
    for (const key of compactionAnchorKeys(messageHistory[index]))
      positions.set(key, index);
  }
  const seenIds = new Set(messageHistory.map((message) => message.id));
  const insertions = new Map();
  let nextPosition = messageHistory.length;
  for (let index = previous.length - 1; index >= 0; index--) {
    const message = previous[index];
    if (message.type === "compaction_status") {
      if (message.content !== "compacted" || seenIds.has(message.id))
        continue;
      seenIds.add(message.id);
      const records = insertions.get(nextPosition) ?? [];
      records.unshift(message);
      insertions.set(nextPosition, records);
    } else {
      const position = compactionAnchorKeys(message)
        .map((key) => positions.get(key))
        .find((value) => value !== void 0);
      if (position !== void 0) nextPosition = position;
    }
  }
  if (insertions.size === 0) return messageHistory;
  const result = [];
  for (let index = 0; index <= messageHistory.length; index++) {
    result.push(...(insertions.get(index) ?? []));
    if (index < messageHistory.length) result.push(messageHistory[index]);
  }
  return result;
}

const UNKNOWN_HISTORY_TIME = 0;

function restoreToolState(message) {
  const input = message.toolArgs ?? "";
  const time = {
    start: UNKNOWN_HISTORY_TIME,
    end: UNKNOWN_HISTORY_TIME,
  };
  switch (message.toolStatus) {
    case "pending":
      return {
        status: "pending",
        input,
      };
    case "running":
      return {
        status: "running",
        input,
        time,
      };
    case "error":
      return {
        status: "error",
        input,
        error: message.toolResult ?? "",
        time,
      };
    default:
      return {
        status: "completed",
        input,
        output: message.toolResult ?? "",
        title: "",
        time,
      };
  }
}

export function restoreRootToolParts(
  partStore,
  runtimeSessionId,
  messages,
  replaceSnapshot,
) {
  if (replaceSnapshot) {
    partStore.pruneHistoryToolSeeds(
      runtimeSessionId,
      new Set(
        messages.flatMap((message) =>
          message.partId ? [message.partId] : [],
        ),
      ),
    );
  }
  const taskPartIds = [];
  for (const message of messages) {
    if (message.type !== "tool" || !message.partId) continue;
    const part = {
      type: "tool",
      id: message.partId,
      sessionID: runtimeSessionId,
      messageID: message.runtimeMessageId ?? "",
      tool: message.content,
      callID: message.callID ?? message.partId,
      state: {
        ...restoreToolState(message),
        ...(message.content === "task" && message.childSessionId
          ? {
              metadata: {
                sessionId: message.childSessionId,
              },
            }
          : {}),
      },
    };
    partStore.seedHistoryToolPart(
      part,
      message.interruption,
      message.generationHandoffTargets,
    );
    if (part.tool === "task") taskPartIds.push(part.id);
  }
  partStore.restoreHistoryTaskOwnership(taskPartIds);
}

function historySubAgentSeedKey(childSessionId, agent) {
  return agent ? `${childSessionId}\0${agent}` : childSessionId;
}

export function restoreHistorySubAgents(
  getPartStore,
  messages,
  onlyMissing = false,
) {
  const childSeeds = new Map();
  for (const historySubAgentMessage of messages) {
    if (
      historySubAgentMessage.type !== "sub_agent" ||
      !historySubAgentMessage.childSessionId ||
      !historySubAgentMessage.subMessages?.length
    )
      continue;
    const taskPartId = historySubAgentMessage.partId?.endsWith("__sub_agent")
      ? historySubAgentMessage.partId.slice(0, -"__sub_agent".length)
      : void 0;
    if (
      onlyMissing &&
      (taskPartId
        ? getPartStore().getPart(taskPartId)
        : getPartStore().hasChildSubMessageSeed(historySubAgentMessage.childSessionId, historySubAgentMessage.agent))
    )
      continue;
    const key =
      taskPartId ?? historySubAgentSeedKey(historySubAgentMessage.childSessionId, historySubAgentMessage.agent);
    const entry = childSeeds.get(key) ?? {
      childSessionId: historySubAgentMessage.childSessionId,
      agent: historySubAgentMessage.agent,
      taskPartId,
      seed: [],
    };
    entry.seed.push(...historySubAgentMessage.subMessages);
    childSeeds.set(key, entry);
  }
  if (childSeeds.size === 0) return;
  const partStore = getPartStore();
  for (const {
    childSessionId,
    agent,
    taskPartId,
    seed,
  } of childSeeds.values()) {
    partStore.seedChildSubMessages(childSessionId, seed, agent, taskPartId);
  }
}

export function restoreRootToolMessages(
  partStore,
  runtimeSessionId,
  messages,
  replaceSnapshot,
  childSessions,
) {
  restoreHistorySubAgents(() => partStore, messages);
  const toolsByCallId = new Map(
    partStore
      .getSessionParts(runtimeSessionId)
      .flatMap((part) => (part.type === "tool" ? [[part.callID, part]] : [])),
  );
  messages = messages.map((message) => {
    if (message.type !== "tool" || message.partId || !message.callID)
      return message;
    const part = toolsByCallId.get(message.callID);
    return part?.tool === message.content
      ? {
          ...message,
          partId: part.id,
        }
      : message;
  });
  restoreRootToolParts(partStore, runtimeSessionId, messages, replaceSnapshot);
  const derivedByPartId = new Map();
  for (const derived of partStore.deriveMessages(
    runtimeSessionId,
    childSessions,
  )) {
    if (
      (derived.type === "tool" || derived.type === "sub_agent") &&
      derived.partId
    )
      derivedByPartId.set(derived.partId, derived);
  }
  const restored = messages.map((message) => {
    if (
      (message.type !== "tool" && message.type !== "sub_agent") ||
      !message.partId
    )
      return message;
    const derived = derivedByPartId.get(message.partId);
    if (!derived) return message;
    derivedByPartId.delete(message.partId);
    if (message.type === "sub_agent")
      return {
        ...message,
        ...derived,
        id: message.id,
      };
    const {
      interruption: _interruption,
      generationHandoffTargets: _targets,
      ...base
    } = message;
    return {
      ...base,
      ...derived,
      id: message.id,
    };
  });
  return [...restored, ...derivedByPartId.values()];
}

function transcriptContains(candidate, transcript) {
  if (transcript.length === 0) return true;
  if (candidate.length < transcript.length) return false;
  const candidateKeys = candidate.map(subMessageSemanticKey);
  const transcriptKeys = transcript.map(subMessageSemanticKey);
  const lastStart = candidateKeys.length - transcriptKeys.length;
  for (let start = 0; start <= lastStart; start++) {
    if (
      transcriptKeys.every(
        (key, offset) => candidateKeys[start + offset] === key,
      )
    )
      return true;
  }
  return false;
}

export function dropSupersededHistorySubAgents(messages) {
  const partDerivedByChild = new Map();
  for (const historySubAgentMessage of messages) {
    if (historySubAgentMessage.type === "sub_agent" && historySubAgentMessage.partId && historySubAgentMessage.childSessionId) {
      const transcripts = partDerivedByChild.get(historySubAgentMessage.childSessionId) ?? [];
      transcripts.push(historySubAgentMessage.subMessages ?? []);
      partDerivedByChild.set(historySubAgentMessage.childSessionId, transcripts);
    }
  }
  if (partDerivedByChild.size === 0) return messages;
  return messages.filter((historySubAgentMessage) => {
    if (historySubAgentMessage.type !== "sub_agent" || historySubAgentMessage.partId || !historySubAgentMessage.childSessionId) return true;
    const derivedTranscripts = partDerivedByChild.get(historySubAgentMessage.childSessionId);
    if (!derivedTranscripts) return true;
    return !derivedTranscripts.some((candidate) =>
      transcriptContains(candidate, historySubAgentMessage.subMessages ?? []),
    );
  });
}

export class SessionReducer {
  buffers;
  sessionId;
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.buffers = createStreamingBuffers();
  }
  /**
   * Reduce a ServerMessage for this session.
   * Delegates to the shared reduceServerMessage function
   * with session-scoped StreamingBuffers.
   */
  reduce(prev, serverMessage) {
    return reduceServerMessage(prev, serverMessage, this.buffers, this.sessionId);
  }
  /** Reset buffers (e.g. on turn end to ensure clean state for next turn). */
  resetBuffers() {
    this.buffers = createStreamingBuffers();
  }
}

export const PART_SUPERSEDED_TYPES = new Set([
  "text_chunk",
  "thinking",
  "text_end",
  "tool_call",
  "tool_result",
  "sub_agent_start",
  "sub_agent_end",
  "sub_agent_text",
  "sub_agent_thinking",
  "sub_agent_tool_call",
  "sub_agent_tool_result",
  "done",
  "error",
  "image",
  "video",
  "audio",
  "file_added",
  "status",
]);

export const INTERACTION_MESSAGE_TYPES = new Set([
  "question_request",
  "loop_guard_ask",
  "interact_request",
  "confirm_request",
  "tool_confirm_ask",
  "credit_threshold_request",
]);

export const DEFAULT_WARM_KEEP_COUNT = 50;

export const MEMORY_PRESSURE_WARM_KEEP_COUNT = 20;

export const MEMORY_PRESSURE_WARM_MIN_PART_COUNT = 25;

export const MEMORY_PRESSURE_COLD_MIN_PART_COUNT = 50;

const CHAT_REDERIVE_COALESCING_FLAG = "hilo.chat.rederiveCoalescing.enabled";

const CHAT_INCREMENTAL_DERIVE_FLAG = "hilo.chat.incrementalDerive.enabled";

export function formatQuestionToolResult(questions, answers) {
  return questions
    .map((question, index) => {
      const answer = answers[index]?.join(", ") ?? "";
      return `${JSON.stringify(question.question)}=${JSON.stringify(answer)}`;
    })
    .join("\n");
}

export function questionAttachmentCount(answers) {
  if (!answers) return 0;
  let count = 0;
  for (const answer of answers) {
    for (const value of answer) {
      if (value.includes("[User attached files:\n")) count += 1;
    }
  }
  return count;
}

export function extractTaskChildSessionId(part) {
  return part?.type === "tool" && part.tool === "task"
    ? extractChildSessionId(part)
    : void 0;
}

export function isChatRederiveCoalescingEnabled() {
  try {
    const storage = globalThis.localStorage;
    return storage?.getItem(CHAT_REDERIVE_COALESCING_FLAG) !== "0";
  } catch {
    return true;
  }
}

export function isChatIncrementalDeriveEnabled() {
  try {
    const storage = globalThis.localStorage;
    return storage?.getItem(CHAT_INCREMENTAL_DERIVE_FLAG) !== "0";
  } catch {
    return true;
  }
}
