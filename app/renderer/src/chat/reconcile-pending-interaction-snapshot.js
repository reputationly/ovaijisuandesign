// reconcile-pending-interaction-snapshot.js

export function extractSessionId(message) {
  return message.session_id;
}

export function applyComfyUiProgress(messages, callID, progress) {
  const patchSubMessages = (subMessages) =>
    subMessages?.map((message) => ({
      ...message,
      ...(message.type === "tool" && message.callID === callID
        ? {
            comfyUiProgress: progress,
          }
        : {}),
      ...(message.subMessages
        ? {
            subMessages: patchSubMessages(message.subMessages),
          }
        : {}),
    }));
  return messages.map((message) => {
    if (message.type === "tool" && message.callID === callID) {
      return {
        ...message,
        comfyUiProgress: progress,
      };
    }
    if (message.type === "sub_agent" && message.subMessages) {
      return {
        ...message,
        subMessages: patchSubMessages(message.subMessages),
      };
    }
    return message;
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
  for (const key of aKeys) {
    if (aRecord[key] !== bRecord[key]) {
      return false;
    }
  }
  return true;
}

export function messagesShallowEqual(prev, next) {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;
  for (let index = 0; index < prev.length; index += 1) {
    if (!chatMessageShallowEqual(prev[index], next[index])) return false;
  }
  return true;
}

export function reconcilePendingInteractionSnapshot(
  messages,
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
  return messages.map((message) => {
    if (message.type === "credit_threshold" && message.requestId) {
      return pendingCreditThresholdIds.has(message.requestId)
        ? message.resolved
          ? {
              ...message,
              resolved: false,
              settlementStatus: void 0,
              decision: void 0,
            }
          : message
        : message.resolved
          ? message
          : {
              ...message,
              resolved: true,
              settlementStatus: "unavailable",
            };
    }
    if (message.type !== "loop_guard_ask" || !message.requestId) {
      return message;
    }
    if (pendingIds.has(message.requestId)) {
      return message.resolved
        ? {
            ...message,
            resolved: false,
            loopGuardDecision: void 0,
            loopGuardSettlementCause: void 0,
          }
        : message;
    }
    return message.resolved
      ? message
      : {
          ...message,
          resolved: true,
          loopGuardDecision: void 0,
          loopGuardSettlementCause: "unavailable",
        };
  });
}

export function applyToolConfirmSettlements(messages, settlements) {
  if (settlements.length === 0) return [...messages];
  const byRequestId = new Map(
    settlements.map((settlement) => [settlement.id, settlement]),
  );
  return messages.map((message) => {
    if (message.type !== "tool_confirm_ask" || !message.requestId)
      return message;
    const settlement = byRequestId.get(message.requestId);
    if (!settlement) return message;
    return {
      ...message,
      resolved: true,
      expired: settlement.cause !== "reply",
      toolConfirmDecision: settlement.decision,
      toolConfirmSettlementCause: settlement.cause,
      ...(settlement.modified_args && message.toolConfirmData
        ? {
            toolConfirmData: {
              ...message.toolConfirmData,
              args: settlement.modified_args,
            },
          }
        : {}),
    };
  });
}

export function applyLoopGuardSettlements(messages, settlements) {
  if (settlements.length === 0) return [...messages];
  const byRequestId = new Map(
    settlements.map((settlement) => [settlement.id, settlement]),
  );
  return messages.map((message) => {
    if (message.type !== "loop_guard_ask" || !message.requestId)
      return message;
    const settlement = byRequestId.get(message.requestId);
    if (!settlement || settlement.session_id !== message.loopGuardSessionId)
      return message;
    return {
      ...message,
      resolved: true,
      loopGuardDecision: settlement.decision,
      loopGuardSettlementCause: settlement.cause,
    };
  });
}

function stripToolResultPrefix(content) {
  const separatorIndex = content.indexOf(": ");
  return separatorIndex >= 0 ? content.slice(0, separatorIndex) : content;
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
  const keys = Object.keys(record).sort();
  return `{${keys.map((propertyKey) => `${JSON.stringify(propertyKey)}:${stableStringify(record[propertyKey])}`).join(",")}}`;
}

function canonicalArgsKey(args) {
  if (args === void 0) return "__undefined__";
  if (args === null || typeof args !== "object") return JSON.stringify(args);
  const filtered = {};
  for (const argumentKey of Object.keys(args)) {
    if (argumentKey === "_session_id" || argumentKey === "_tool_use_id") continue;
    filtered[argumentKey] = args[argumentKey];
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

export function resplicePendingToolConfirms(messages) {
  const base = [];
  const lifted = [];
  for (const message of messages) {
    if (
      message.type === "tool_confirm_ask" &&
      !message.resolved &&
      !message.expired
    ) {
      lifted.push(message);
    } else {
      base.push(message);
    }
  }
  let result = base;
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
      (message) => "requestId" in message && message.requestId === requestId,
    )
  ) {
    if (interaction.type === "credit_threshold") {
      return prev.map((message) =>
        message.type === "credit_threshold" && message.requestId === requestId
          ? {
              ...interaction,
              id: message.id,
              revision: (message.revision ?? 0) + 1,
            }
          : message,
      );
    }
    return [...prev];
  }
  return interaction.type === "tool_confirm_ask"
    ? insertToolConfirmAsk(prev, interaction)
    : [...prev, interaction];
}
