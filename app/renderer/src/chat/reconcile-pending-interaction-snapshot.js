// reconcile-pending-interaction-snapshot.js

export function extractSessionId(message) {
  return message.session_id;
}

export function applyComfyUiProgress(messages2, callID, progress) {
  const patchSubMessages = (subMessages) =>
    subMessages?.map((message2) => ({
      ...message2,
      ...(message2.type === "tool" && message2.callID === callID
        ? {
            comfyUiProgress: progress,
          }
        : {}),
      ...(message2.subMessages
        ? {
            subMessages: patchSubMessages(message2.subMessages),
          }
        : {}),
    }));
  return messages2.map((message2) => {
    if (message2.type === "tool" && message2.callID === callID) {
      return {
        ...message2,
        comfyUiProgress: progress,
      };
    }
    if (message2.type === "sub_agent" && message2.subMessages) {
      return {
        ...message2,
        subMessages: patchSubMessages(message2.subMessages),
      };
    }
    return message2;
  });
}

export function normalizeKeepCount(keepCount) {
  if (!Number.isFinite(keepCount) || keepCount <= 0) return 0;
  return Math.floor(keepCount);
}

export function protectedFocusedSessionIds(focusedSessionId) {
  return focusedSessionId ? new Set([focusedSessionId]) : void 0;
}

export function subAgentPartId(partId) {
  return `${partId}__sub_agent`;
}

function chatMessageShallowEqual(leftMessage, rightMessage) {
  if (leftMessage === rightMessage) return true;
  const aRecord = leftMessage;
  const bRecord = rightMessage;
  const aKeys = Object.keys(aRecord);
  const bKeys = Object.keys(bRecord);
  if (aKeys.length !== bKeys.length) return false;
  for (const key2 of aKeys) {
    if (aRecord[key2] !== bRecord[key2]) {
      return false;
    }
  }
  return true;
}

export function messagesShallowEqual(prev, next2) {
  if (prev === next2) return true;
  if (prev.length !== next2.length) return false;
  for (let index2 = 0; index2 < prev.length; index2 += 1) {
    if (!chatMessageShallowEqual(prev[index2], next2[index2])) return false;
  }
  return true;
}

export function reconcilePendingInteractionSnapshot(
  messages2,
  pendingInteractions,
) {
  const pendingIds = new Set(
    pendingInteractions
      .filter((interaction) => interaction.type === "loop_guard_ask")
      .map((interaction) => interaction.id),
  );
  const pendingCreditThresholdIds = new Set(
    pendingInteractions
      .filter((interaction) => interaction.type === "credit_threshold_request")
      .map((interaction) => interaction.id),
  );
  return messages2.map((message2) => {
    if (message2.type === "credit_threshold" && message2.requestId) {
      return pendingCreditThresholdIds.has(message2.requestId)
        ? message2.resolved
          ? {
              ...message2,
              resolved: false,
              settlementStatus: void 0,
              decision: void 0,
            }
          : message2
        : message2.resolved
          ? message2
          : {
              ...message2,
              resolved: true,
              settlementStatus: "unavailable",
            };
    }
    if (message2.type !== "loop_guard_ask" || !message2.requestId) {
      return message2;
    }
    if (pendingIds.has(message2.requestId)) {
      return message2.resolved
        ? {
            ...message2,
            resolved: false,
            loopGuardDecision: void 0,
            loopGuardSettlementCause: void 0,
          }
        : message2;
    }
    return message2.resolved
      ? message2
      : {
          ...message2,
          resolved: true,
          loopGuardDecision: void 0,
          loopGuardSettlementCause: "unavailable",
        };
  });
}

export function applyToolConfirmSettlements(messages2, settlements) {
  if (settlements.length === 0) return [...messages2];
  const byRequestId = new Map(
    settlements.map((settlement) => [settlement.id, settlement]),
  );
  return messages2.map((message2) => {
    if (message2.type !== "tool_confirm_ask" || !message2.requestId)
      return message2;
    const settlement = byRequestId.get(message2.requestId);
    if (!settlement) return message2;
    return {
      ...message2,
      resolved: true,
      expired: settlement.cause !== "reply",
      toolConfirmDecision: settlement.decision,
      toolConfirmSettlementCause: settlement.cause,
      ...(settlement.modified_args && message2.toolConfirmData
        ? {
            toolConfirmData: {
              ...message2.toolConfirmData,
              args: settlement.modified_args,
            },
          }
        : {}),
    };
  });
}

export function applyLoopGuardSettlements(messages2, settlements) {
  if (settlements.length === 0) return [...messages2];
  const byRequestId = new Map(
    settlements.map((settlement) => [settlement.id, settlement]),
  );
  return messages2.map((message2) => {
    if (message2.type !== "loop_guard_ask" || !message2.requestId)
      return message2;
    const settlement = byRequestId.get(message2.requestId);
    if (!settlement || settlement.session_id !== message2.loopGuardSessionId)
      return message2;
    return {
      ...message2,
      resolved: true,
      loopGuardDecision: settlement.decision,
      loopGuardSettlementCause: settlement.cause,
    };
  });
}

function stripToolResultPrefix(content2) {
  const separatorIndex = content2.indexOf(": ");
  return separatorIndex >= 0 ? content2.slice(0, separatorIndex) : content2;
}

function safeParseToolArgs(serialized) {
  if (!serialized) return void 0;
  try {
    return JSON.parse(serialized);
  } catch {
    return serialized;
  }
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const record = value;
  const keys2 = Object.keys(record).sort();
  return `{${keys2.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

function canonicalArgsKey(args) {
  if (args === void 0) return "__undefined__";
  if (args === null || typeof args !== "object") return JSON.stringify(args);
  const filtered = {};
  for (const key of Object.keys(args)) {
    if (key === "_session_id" || key === "_tool_use_id") continue;
    filtered[key] = args[key];
  }
  return stableStringify(filtered);
}

export function insertToolConfirmAsk(prev, chatMsg) {
  if (chatMsg.type !== "tool_confirm_ask" || !chatMsg.toolConfirmData) {
    return [...prev, chatMsg];
  }
  const targetTool = chatMsg.toolConfirmData.tool;
  const targetArgsKey = canonicalArgsKey(chatMsg.toolConfirmData.args);
  for (let index = prev.length - 1; index >= 0; index--) {
    const message = prev[index];
    if (message.type === "tool") {
      if (message.content === targetTool) {
        if (
          canonicalArgsKey(safeParseToolArgs(message.toolArgs)) === targetArgsKey
        ) {
          return [...prev.slice(0, index + 1), chatMsg, ...prev.slice(index + 1)];
        }
      }
    } else if (message.type === "sub_agent") {
      const subs = message.subMessages ?? [];
      const matchesSub = subs.some(
        (subMessage) =>
          subMessage.type === "tool" &&
          stripToolResultPrefix(subMessage.content ?? "") === targetTool &&
          canonicalArgsKey(safeParseToolArgs(subMessage.args)) === targetArgsKey,
      );
      if (matchesSub) {
        return [...prev.slice(0, index + 1), chatMsg, ...prev.slice(index + 1)];
      }
    }
  }
  return [...prev, chatMsg];
}

export function resplicePendingToolConfirms(messages2) {
  const base2 = [];
  const lifted = [];
  for (const message2 of messages2) {
    if (
      message2.type === "tool_confirm_ask" &&
      !message2.resolved &&
      !message2.expired
    ) {
      lifted.push(message2);
    } else {
      base2.push(message2);
    }
  }
  let result = base2;
  for (const confirmationAsk of lifted) {
    result = insertToolConfirmAsk(result, confirmationAsk);
  }
  return result;
}

export function upsertPendingInteraction(prev, interaction) {
  const requestId = "requestId" in interaction ? interaction.requestId : void 0;
  if (
    requestId &&
    prev.some(
      (message2) => "requestId" in message2 && message2.requestId === requestId,
    )
  ) {
    if (interaction.type === "credit_threshold") {
      return prev.map((message2) =>
        message2.type === "credit_threshold" && message2.requestId === requestId
          ? {
              ...interaction,
              id: message2.id,
              revision: (message2.revision ?? 0) + 1,
            }
          : message2,
      );
    }
    return [...prev];
  }
  return interaction.type === "tool_confirm_ask"
    ? insertToolConfirmAsk(prev, interaction)
    : [...prev, interaction];
}
