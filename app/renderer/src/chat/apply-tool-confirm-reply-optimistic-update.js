// apply-tool-confirm-reply-optimistic-update.js

function encodeArgs(args) {
  return JSON.stringify(args);
}

function parseArgs(args) {
  if (!args) return void 0;
  try {
    const parsed = JSON.parse(args);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : void 0;
  } catch {
    return void 0;
  }
}

function sameArgs(actualArgs, expectedArgs) {
  if (!actualArgs) return false;
  return JSON.stringify(actualArgs) === JSON.stringify(expectedArgs);
}

function toolNameMatches(name2, target) {
  return name2 === target;
}

function toolMessageMatches(message2, confirmationAsk) {
  if (message2.type !== "tool") return false;
  const target = confirmationAsk.toolConfirmData?.tool;
  const originalArgs = confirmationAsk.toolConfirmData?.args;
  if (!target || !originalArgs) return false;
  const tool2 = message2;
  if (!toolNameMatches(tool2.toolName ?? tool2.content, target)) return false;
  return sameArgs(parseArgs(tool2.toolArgs), originalArgs);
}

function subToolMatches(subMessage, confirmationAsk) {
  if (subMessage.type !== "tool") return false;
  const target = confirmationAsk.toolConfirmData?.tool;
  const originalArgs = confirmationAsk.toolConfirmData?.args;
  if (!target || !originalArgs) return false;
  if (!toolNameMatches(subMessage.content, target)) return false;
  return sameArgs(parseArgs(subMessage.args), originalArgs);
}

function applyToolArgsToMessage(message2, modifiedArgs) {
  if (message2.type !== "tool") return message2;
  const tool2 = message2;
  const encoded = encodeArgs(modifiedArgs);
  return {
    ...tool2,
    toolArgs: encoded,
    url: tool2.url === tool2.toolArgs ? encoded : tool2.url,
  };
}

function applyToolArgsToSubAgent(message2, confirmationAsk, modifiedArgs) {
  const subs = message2.subMessages ?? [];
  for (let index = subs.length - 1; index >= 0; index--) {
    const subMessage = subs[index];
    if (!subToolMatches(subMessage, confirmationAsk)) continue;
    const nextSubs = [...subs];
    nextSubs[index] = {
      ...subMessage,
      args: encodeArgs(modifiedArgs),
    };
    return {
      ...message2,
      subMessages: nextSubs,
    };
  }
  return void 0;
}

export function applyToolConfirmReplyOptimisticUpdate(messages2, reply) {
  const askIndex = messages2.findIndex(
    (message2) =>
      message2.type === "tool_confirm_ask" && message2.requestId === reply.id,
  );
  if (askIndex < 0) return [...messages2];
  const confirmationAsk = messages2[askIndex];
  const next2 = [...messages2];
  const modifiedArgs =
    reply.decision === "confirm" ? reply.modified_args : void 0;
  next2[askIndex] = {
    ...confirmationAsk,
    resolved: true,
    toolConfirmDecision: reply.decision,
    ...(modifiedArgs && confirmationAsk.toolConfirmData
      ? {
          toolConfirmData: {
            ...confirmationAsk.toolConfirmData,
            args: modifiedArgs,
          },
        }
      : {}),
  };
  if (!modifiedArgs) return next2;
  for (let index = askIndex - 1; index >= 0; index--) {
    const message2 = next2[index];
    if (toolMessageMatches(message2, confirmationAsk)) {
      next2[index] = applyToolArgsToMessage(message2, modifiedArgs);
      break;
    }
    if (message2.type === "sub_agent") {
      const updated = applyToolArgsToSubAgent(message2, confirmationAsk, modifiedArgs);
      if (updated) {
        next2[index] = updated;
        break;
      }
    }
  }
  return next2;
}
