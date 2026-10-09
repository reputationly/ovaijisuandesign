// restore-root-tool-messages.js
import {
  extractChildSessionId,
  subMessageSemanticKey,
} from "./attach-handoff-targets-to-sub-messages.js";
import { createStreamingBuffers } from "./create-history-sub-agent-message.js";
import { reduceServerMessage } from "./reduce-server-message.js";

export function completeLatestCompactionStatus(messages2) {
  for (let index2 = messages2.length - 1; index2 >= 0; index2 -= 1) {
    const message2 = messages2[index2];
    if (
      message2.type !== "compaction_status" ||
      message2.content === "compacted"
    )
      continue;
    const next2 = [...messages2];
    next2[index2] = {
      ...message2,
      content: "compacted",
    };
    return next2;
  }
  return messages2;
}

export function clearRunningCompactionStatus(messages2) {
  return messages2.filter(
    (message2) =>
      message2.type !== "compaction_status" || message2.content === "compacted",
  );
}

function compactionAnchorKeys(message2) {
  return [
    ...(message2.partId ? [`part:${message2.partId}`] : []),
    ...(message2.runtimeMessageId
      ? [`runtime:${message2.runtimeMessageId}`]
      : []),
    `id:${message2.id}`,
  ];
}

export function retainCompletedCompactionStatuses(history2, previous2) {
  if (
    !previous2.some(
      (message2) =>
        message2.type === "compaction_status" &&
        message2.content === "compacted",
    )
  ) {
    return history2;
  }
  const positions = new Map();
  for (let index2 = history2.length - 1; index2 >= 0; index2--) {
    for (const key2 of compactionAnchorKeys(history2[index2]))
      positions.set(key2, index2);
  }
  const seenIds = new Set(history2.map((message2) => message2.id));
  const insertions = new Map();
  let nextPosition = history2.length;
  for (let index2 = previous2.length - 1; index2 >= 0; index2--) {
    const message2 = previous2[index2];
    if (message2.type === "compaction_status") {
      if (message2.content !== "compacted" || seenIds.has(message2.id))
        continue;
      seenIds.add(message2.id);
      const records = insertions.get(nextPosition) ?? [];
      records.unshift(message2);
      insertions.set(nextPosition, records);
    } else {
      const position2 = compactionAnchorKeys(message2)
        .map((key2) => positions.get(key2))
        .find((value) => value !== void 0);
      if (position2 !== void 0) nextPosition = position2;
    }
  }
  if (insertions.size === 0) return history2;
  const result = [];
  for (let index2 = 0; index2 <= history2.length; index2++) {
    result.push(...(insertions.get(index2) ?? []));
    if (index2 < history2.length) result.push(history2[index2]);
  }
  return result;
}

const UNKNOWN_HISTORY_TIME = 0;

function restoreToolState(message2) {
  const input = message2.toolArgs ?? "";
  const time = {
    start: UNKNOWN_HISTORY_TIME,
    end: UNKNOWN_HISTORY_TIME,
  };
  switch (message2.toolStatus) {
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
        error: message2.toolResult ?? "",
        time,
      };
    default:
      return {
        status: "completed",
        input,
        output: message2.toolResult ?? "",
        title: "",
        time,
      };
  }
}

export function restoreRootToolParts(
  partStore,
  runtimeSessionId,
  messages2,
  replaceSnapshot,
) {
  if (replaceSnapshot) {
    partStore.pruneHistoryToolSeeds(
      runtimeSessionId,
      new Set(
        messages2.flatMap((message2) =>
          message2.partId ? [message2.partId] : [],
        ),
      ),
    );
  }
  const taskPartIds = [];
  for (const message2 of messages2) {
    if (message2.type !== "tool" || !message2.partId) continue;
    const part = {
      type: "tool",
      id: message2.partId,
      sessionID: runtimeSessionId,
      messageID: message2.runtimeMessageId ?? "",
      tool: message2.content,
      callID: message2.callID ?? message2.partId,
      state: {
        ...restoreToolState(message2),
        ...(message2.content === "task" && message2.childSessionId
          ? {
              metadata: {
                sessionId: message2.childSessionId,
              },
            }
          : {}),
      },
    };
    partStore.seedHistoryToolPart(
      part,
      message2.interruption,
      message2.generationHandoffTargets,
    );
    if (part.tool === "task") taskPartIds.push(part.id);
  }
  partStore.restoreHistoryTaskOwnership(taskPartIds);
}

function historySubAgentSeedKey(childSessionId, agent2) {
  return agent2 ? `${childSessionId}\0${agent2}` : childSessionId;
}

export function restoreHistorySubAgents(
  getPartStore,
  messages2,
  onlyMissing = false,
) {
  const childSeeds = new Map();
  for (const m3 of messages2) {
    if (
      m3.type !== "sub_agent" ||
      !m3.childSessionId ||
      !m3.subMessages?.length
    )
      continue;
    const taskPartId = m3.partId?.endsWith("__sub_agent")
      ? m3.partId.slice(0, -"__sub_agent".length)
      : void 0;
    if (
      onlyMissing &&
      (taskPartId
        ? getPartStore().getPart(taskPartId)
        : getPartStore().hasChildSubMessageSeed(m3.childSessionId, m3.agent))
    )
      continue;
    const key2 =
      taskPartId ?? historySubAgentSeedKey(m3.childSessionId, m3.agent);
    const entry = childSeeds.get(key2) ?? {
      childSessionId: m3.childSessionId,
      agent: m3.agent,
      taskPartId,
      seed: [],
    };
    entry.seed.push(...m3.subMessages);
    childSeeds.set(key2, entry);
  }
  if (childSeeds.size === 0) return;
  const partStore = getPartStore();
  for (const {
    childSessionId,
    agent: agent2,
    taskPartId,
    seed,
  } of childSeeds.values()) {
    partStore.seedChildSubMessages(childSessionId, seed, agent2, taskPartId);
  }
}

export function restoreRootToolMessages(
  partStore,
  runtimeSessionId,
  messages2,
  replaceSnapshot,
  childSessions,
) {
  restoreHistorySubAgents(() => partStore, messages2);
  const toolsByCallId = new Map(
    partStore
      .getSessionParts(runtimeSessionId)
      .flatMap((part) => (part.type === "tool" ? [[part.callID, part]] : [])),
  );
  messages2 = messages2.map((message2) => {
    if (message2.type !== "tool" || message2.partId || !message2.callID)
      return message2;
    const part = toolsByCallId.get(message2.callID);
    return part?.tool === message2.content
      ? {
          ...message2,
          partId: part.id,
        }
      : message2;
  });
  restoreRootToolParts(partStore, runtimeSessionId, messages2, replaceSnapshot);
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
  const restored = messages2.map((message2) => {
    if (
      (message2.type !== "tool" && message2.type !== "sub_agent") ||
      !message2.partId
    )
      return message2;
    const derived = derivedByPartId.get(message2.partId);
    if (!derived) return message2;
    derivedByPartId.delete(message2.partId);
    if (message2.type === "sub_agent")
      return {
        ...message2,
        ...derived,
        id: message2.id,
      };
    const {
      interruption: _interruption,
      generationHandoffTargets: _targets,
      ...base2
    } = message2;
    return {
      ...base2,
      ...derived,
      id: message2.id,
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
  for (let start2 = 0; start2 <= lastStart; start2++) {
    if (
      transcriptKeys.every(
        (key2, offset2) => candidateKeys[start2 + offset2] === key2,
      )
    )
      return true;
  }
  return false;
}

export function dropSupersededHistorySubAgents(messages2) {
  const partDerivedByChild = new Map();
  for (const m3 of messages2) {
    if (m3.type === "sub_agent" && m3.partId && m3.childSessionId) {
      const transcripts = partDerivedByChild.get(m3.childSessionId) ?? [];
      transcripts.push(m3.subMessages ?? []);
      partDerivedByChild.set(m3.childSessionId, transcripts);
    }
  }
  if (partDerivedByChild.size === 0) return messages2;
  return messages2.filter((m3) => {
    if (m3.type !== "sub_agent" || m3.partId || !m3.childSessionId) return true;
    const derivedTranscripts = partDerivedByChild.get(m3.childSessionId);
    if (!derivedTranscripts) return true;
    return !derivedTranscripts.some((candidate) =>
      transcriptContains(candidate, m3.subMessages ?? []),
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
  reduce(prev, msg) {
    return reduceServerMessage(prev, msg, this.buffers, this.sessionId);
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
    .map((question2, index2) => {
      const answer = answers[index2]?.join(", ") ?? "";
      return `${JSON.stringify(question2.question)}=${JSON.stringify(answer)}`;
    })
    .join("\n");
}

export function questionAttachmentCount(answers) {
  if (!answers) return 0;
  let count2 = 0;
  for (const answer of answers) {
    for (const value of answer) {
      if (value.includes("[User attached files:\n")) count2 += 1;
    }
  }
  return count2;
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
