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

function sameArgs(a2, b3) {
  if (!a2) return false;
  return JSON.stringify(a2) === JSON.stringify(b3);
}

function toolNameMatches(name2, target) {
  return name2 === target;
}

function toolMessageMatches(message2, ask) {
  if (message2.type !== "tool") return false;
  const target = ask.toolConfirmData?.tool;
  const originalArgs = ask.toolConfirmData?.args;
  if (!target || !originalArgs) return false;
  const tool2 = message2;
  if (!toolNameMatches(tool2.toolName ?? tool2.content, target)) return false;
  return sameArgs(parseArgs(tool2.toolArgs), originalArgs);
}

function subToolMatches(sub, ask) {
  if (sub.type !== "tool") return false;
  const target = ask.toolConfirmData?.tool;
  const originalArgs = ask.toolConfirmData?.args;
  if (!target || !originalArgs) return false;
  if (!toolNameMatches(sub.content, target)) return false;
  return sameArgs(parseArgs(sub.args), originalArgs);
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

function applyToolArgsToSubAgent(message2, ask, modifiedArgs) {
  const subs = message2.subMessages ?? [];
  for (let i2 = subs.length - 1; i2 >= 0; i2--) {
    const sub = subs[i2];
    if (!subToolMatches(sub, ask)) continue;
    const nextSubs = [...subs];
    nextSubs[i2] = {
      ...sub,
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
  const ask = messages2[askIndex];
  const next2 = [...messages2];
  const modifiedArgs =
    reply.decision === "confirm" ? reply.modified_args : void 0;
  next2[askIndex] = {
    ...ask,
    resolved: true,
    toolConfirmDecision: reply.decision,
    ...(modifiedArgs && ask.toolConfirmData
      ? {
          toolConfirmData: {
            ...ask.toolConfirmData,
            args: modifiedArgs,
          },
        }
      : {}),
  };
  if (!modifiedArgs) return next2;
  for (let i2 = askIndex - 1; i2 >= 0; i2--) {
    const message2 = next2[i2];
    if (toolMessageMatches(message2, ask)) {
      next2[i2] = applyToolArgsToMessage(message2, modifiedArgs);
      break;
    }
    if (message2.type === "sub_agent") {
      const updated = applyToolArgsToSubAgent(message2, ask, modifiedArgs);
      if (updated) {
        next2[i2] = updated;
        break;
      }
    }
  }
  return next2;
}
