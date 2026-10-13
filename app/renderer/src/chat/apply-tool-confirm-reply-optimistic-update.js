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

function toolNameMatches(toolName, target) {
  return toolName === target;
}

function toolMessageMatches(message, confirmationAsk) {
  if (message.type !== "tool") return false;
  const target = confirmationAsk.toolConfirmData?.tool;
  const originalArgs = confirmationAsk.toolConfirmData?.args;
  if (!target || !originalArgs) return false;
  const tool = message;
  if (!toolNameMatches(tool.toolName ?? tool.content, target)) return false;
  return sameArgs(parseArgs(tool.toolArgs), originalArgs);
}

function subToolMatches(subMessage, confirmationAsk) {
  if (subMessage.type !== "tool") return false;
  const target = confirmationAsk.toolConfirmData?.tool;
  const originalArgs = confirmationAsk.toolConfirmData?.args;
  if (!target || !originalArgs) return false;
  if (!toolNameMatches(subMessage.content, target)) return false;
  return sameArgs(parseArgs(subMessage.args), originalArgs);
}

function applyToolArgsToMessage(message, modifiedArgs) {
  if (message.type !== "tool") return message;
  const tool = message;
  const encoded = encodeArgs(modifiedArgs);
  return {
    ...tool,
    toolArgs: encoded,
    url: tool.url === tool.toolArgs ? encoded : tool.url,
  };
}

function applyToolArgsToSubAgent(message, confirmationAsk, modifiedArgs) {
  const subs = message.subMessages ?? [];
  for (let index = subs.length - 1; index >= 0; index--) {
    const subMessage = subs[index];
    if (!subToolMatches(subMessage, confirmationAsk)) continue;
    const nextSubs = [...subs];
    nextSubs[index] = {
      ...subMessage,
      args: encodeArgs(modifiedArgs),
    };
    return {
      ...message,
      subMessages: nextSubs,
    };
  }
  return void 0;
}

export function applyToolConfirmReplyOptimisticUpdate(messages, reply) {
  const askIndex = messages.findIndex(
    (message) =>
      message.type === "tool_confirm_ask" && message.requestId === reply.id,
  );
  if (askIndex < 0) return [...messages];
  const confirmationAsk = messages[askIndex];
  const next = [...messages];
  const modifiedArgs =
    reply.decision === "confirm" ? reply.modified_args : void 0;
  next[askIndex] = {
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
  if (!modifiedArgs) return next;
  for (let index = askIndex - 1; index >= 0; index--) {
    const message = next[index];
    if (toolMessageMatches(message, confirmationAsk)) {
      next[index] = applyToolArgsToMessage(message, modifiedArgs);
      break;
    }
    if (message.type === "sub_agent") {
      const updated = applyToolArgsToSubAgent(message, confirmationAsk, modifiedArgs);
      if (updated) {
        next[index] = updated;
        break;
      }
    }
  }
  return next;
}
