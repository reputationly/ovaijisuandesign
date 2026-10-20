/**
 * 工作区聊天会话适配器（第 227 轮取回）。
 *
 * 种子：useChatSessionAdapter（参考 512651，51 行）
 * 闭包：23 个声明 / 约 622 行，每圈 1 → 2 → 9 → 5 → 3 → 3（收敛）
 * 按**全局声明边界**切（不用括号计数 —— 正则里的 [ ] 会让计数失真）。
 */

import reactExports from "react";
import { WorkspaceChatStoreContext, useWorkspaceChatStoreOptionalSelector } from "../assets/use-canvas-model-registry-hydration.js";
import { ProjectResourceKind } from "../canvas-v3/canvas-v3-constants.js";
import { useWorkspaceChatStoreOptional } from "../canvas-v3/canvas-v3-hooks.js";
import { createProjectResourceClient } from "../canvas-v3/canvas-v3-model.js";
import { resolveAttachment } from "../canvas-v3/desktop-misc.jsx";
import {
  CHAT_SESSION_DRAFT_LIMIT, CHAT_SESSION_LIMIT, CHAT_SESSION_MESSAGE_LIMIT,
  CHAT_SESSION_RESOURCE_LIMIT, CHAT_SESSION_TEXT_LIMIT, CHAT_SESSION_TITLE_LIMIT,
  CHAT_SESSION_TOTAL_RESOURCE_LIMIT, CHAT_SESSION_TOTAL_TEXT_LIMIT,
  isChatSessionCommand, isChatSessionId, isChatSessionResource, isChatSessionResourceRef,
} from "../canvas-v3/frame-services.js";
import { createProjectTaskClient, guardAccountSubmission, useCurrentWorkspace } from "../canvas-v3/main-exports.js";
import { EMPTY, useChatReadiness } from "../chat/chat-compliance-notice.jsx";
import { parseCompositionMentionAt } from "../chat/rich-user-prompt-content.jsx";
import { readDesignJson } from "../chat/message-turn.jsx";
import { LEADING_CONTEXT_RE } from "../chat/long-edge.jsx";
import { useAstraSendGate } from "../generation/use-astra-send-gate.js";
import { useLoginGuard } from "../infra/schedule.js";


export const USER_ATTACHED_FILES_OPEN = "<user_attached_files>\n";

export const USER_ATTACHED_FILES_CLOSE = "\n</user_attached_files>";

export const LEADING_LEGACY_RE = /^\[User attached files:\n([\s\S]*?)\]\n\n([\s\S]*)$/;

export function parseHiddenContextEnvelope(text2) {
  const tagged = LEADING_CONTEXT_RE.exec(text2);
  if (tagged) {
    const content2 = tagged[2] ?? "";
    return {
      envelope: text2.slice(0, text2.length - content2.length),
      manifest: manifestFromContextBody(tagged[1]),
      content: content2
    };
  }
  const legacy = LEADING_LEGACY_RE.exec(text2);
  if (legacy) {
    return {
      envelope: text2.slice(0, text2.length - legacy[2].length),
      manifest: legacy[1],
      content: legacy[2]
    };
  }
  const mention = parseCompositionMentionAt(text2, 0);
  const offset2 = mention && text2[mention.end] === "\n" ? mention.end + 1 : 0;
  const asset = /^\[asset_context resourceId=[^\s[\]]+(?: versionId=[^\s[\]]+)?(?: taskId=[^\s[\]]+)?(?: capabilityId=[^\]\r\n]+)?\](?:\n|$)/.exec(
    text2.slice(offset2)
  );
  if (asset) {
    return {
      envelope: asset[0],
      manifest: "",
      content: text2.slice(0, offset2) + text2.slice(offset2 + asset[0].length)
    };
  }
  return null;
}

export function stripHiddenContext(text2) {
  return parseHiddenContextEnvelope(text2)?.content ?? text2;
}

export function manifestFromContextBody(body2) {
  const start2 = body2.indexOf(USER_ATTACHED_FILES_OPEN);
  if (start2 === -1) return "";
  const rest = body2.slice(start2 + USER_ATTACHED_FILES_OPEN.length);
  const end2 = rest.indexOf(USER_ATTACHED_FILES_CLOSE);
  return end2 === -1 ? "" : rest.slice(0, end2);
}

export function parseChatSessionResourceUrl(value) {
  const match2 = /^resource:\/\/([a-zA-Z0-9_-]{1,256})\/([a-zA-Z0-9_-]{1,256})$/.exec(value);
  return match2 ? { resourceId: match2[1], versionId: match2[2] } : void 0;
}

export function chatSessionSendIdentity(command2) {
  return JSON.stringify([
    command2.sessionId,
    command2.text,
    command2.editorFocus,
    (command2.resources ?? []).map((ref) => [ref.resourceId, ref.versionId])
  ]);
}

export function hostAttachmentRef(value) {
  if (!value || typeof value !== "object" || !("resourceRef" in value)) return;
  return isChatSessionResourceRef(value.resourceRef) ? { resourceId: value.resourceRef.resourceId, versionId: value.resourceRef.versionId } : void 0;
}

export function useWorkspaceChatOptionalSelector(selector2, isEqual2) {
  const store = reactExports.useContext(WorkspaceChatStoreContext);
  return useWorkspaceChatStoreOptionalSelector(store, selector2);
}

export const KIND = {
  [ProjectResourceKind.IMAGE]: "image",
  [ProjectResourceKind.VIDEO]: "video",
  [ProjectResourceKind.AUDIO]: "audio",
  [ProjectResourceKind.TEXT_DOCUMENT]: "text",
  [ProjectResourceKind.FILE]: "file"
};

async function resolveSessionResource(resources, ref, signal) {
  if (!isChatSessionResourceRef(ref)) throw new Error("CHAT_RESOURCE_UNAVAILABLE");
  const resolved = await resolveAttachment(resources, ref, signal);
  const display = {
    ...ref,
    name: resolved.filename.split(/[\\/]/).pop()?.slice(0, 1024) ?? "",
    mimeType: resolved.mimeType,
    kind: KIND[resolved.kind]
  };
  if (!isChatSessionResource(display)) throw new Error("CHAT_RESOURCE_UNAVAILABLE");
  return {
    display,
    attachment: {
      id: crypto.randomUUID(),
      filename: resolved.filename,
      relativePath: resolved.relativePath,
      previewUrl: "",
      fileType: display.kind === "file" ? void 0 : display.kind,
      status: "done",
      resourceRef: { ...ref },
      hostComposer: true
    }
  };
}

export function attachmentRef(value) {
  const stored = hostAttachmentRef(value);
  if (stored) return stored;
  if (!value || typeof value !== "object") return;
  if ("resourceId" in value && "versionId" in value) {
    const ref = { resourceId: value.resourceId, versionId: value.versionId };
    if (isChatSessionResourceRef(ref)) return ref;
  }
  if ("url" in value && typeof value.url === "string")
    return parseChatSessionResourceUrl(value.url);
}

export function uniqueRefs(values2) {
  const found2 = /* @__PURE__ */ new Map();
  for (const value of values2) {
    const ref = attachmentRef(value);
    if (ref) found2.set(JSON.stringify(ref), ref);
    if (found2.size === CHAT_SESSION_RESOURCE_LIMIT) break;
  }
  return [...found2.values()];
}

export function taskIdOf(message2) {
  if (message2.type !== "tool") return;
  const nestedPrefix = "design_execute: ";
  const nested = !("toolName" in message2) && message2.content.startsWith(nestedPrefix);
  if (!nested && (!("toolName" in message2) || message2.toolName !== "design_execute")) return;
  const result = readDesignJson(
    "toolResult" in message2 ? message2.toolResult : message2.content.slice(nestedPrefix.length)
  );
  const task2 = result?.task;
  if (!task2 || typeof task2 !== "object" || !("id" in task2)) return;
  return typeof task2.id === "string" && /^[a-zA-Z0-9_.:-]{1,256}$/.test(task2.id) ? task2.id : void 0;
}

export function createChatResourceProjection({
  resources,
  tasks,
  events: events2,
  scopeKey,
  isLive: isLive2,
  changed
}) {
  let epoch = 0;
  let key2 = "";
  let current2 = EMPTY;
  let pending2 = Promise.resolve();
  let abort = new AbortController();
  let unsubscribe;
  const invalidate2 = () => {
    epoch += 1;
    abort.abort();
    abort = new AbortController();
    key2 = "";
    current2 = EMPTY;
  };
  return {
    connect() {
      unsubscribe ??= events2?.subscribe((event) => {
        if (!isLive2() || event.scopeKey !== scopeKey) return;
        invalidate2();
        changed();
      });
    },
    disconnect() {
      unsubscribe?.();
      unsubscribe = void 0;
      invalidate2();
    },
    invalidate: invalidate2,
    settled: () => pending2,
    read(messages2, draft) {
      const items = messages2.map((message2) => ({
        id: message2.id,
        refs: uniqueRefs("attachments" in message2 ? message2.attachments ?? [] : []),
        taskId: taskIdOf(message2)
      })).filter((item) => item.taskId || item.refs.length).slice(0, CHAT_SESSION_TOTAL_RESOURCE_LIMIT);
      const draftRefs = uniqueRefs(draft);
      const nextKey = JSON.stringify([items, draftRefs]);
      if (nextKey === key2) return current2;
      key2 = nextKey;
      current2 = EMPTY;
      const revision2 = ++epoch;
      abort.abort();
      abort = new AbortController();
      if (!items.length && !draftRefs.length) return current2;
      const signal = abort.signal;
      const resolved = /* @__PURE__ */ new Map();
      const resolve = (ref) => {
        const id2 = JSON.stringify(ref);
        let read = resolved.get(id2);
        if (!read) {
          read = resolveSessionResource(resources, ref, signal).then(
            (value) => value.display,
            () => void 0
          );
          resolved.set(id2, read);
        }
        return read;
      };
      pending2 = (async () => {
        let budget = CHAT_SESSION_TOTAL_RESOURCE_LIMIT;
        const resolveMany = async (refs) => {
          const found2 = await Promise.all(
            refs.slice(0, Math.min(budget, CHAT_SESSION_RESOURCE_LIMIT)).map(resolve)
          );
          const values2 = found2.filter((value) => value !== void 0);
          budget -= values2.length;
          return values2;
        };
        const projectedDraft = await resolveMany(draftRefs);
        const projected = /* @__PURE__ */ new Map();
        for (const item of items) {
          if (signal.aborted || !isLive2() || budget <= 0) break;
          let refs = item.refs;
          if (item.taskId && tasks) {
            try {
              const result = await tasks.get(item.taskId, { signal });
              if (result.task.id === item.taskId)
                refs = uniqueRefs([
                  ...refs,
                  ...result.task.outputs.filter((output2) => output2.availability === "available")
                ]);
            } catch {
            }
          }
          const values2 = await resolveMany(refs);
          if (values2.length) projected.set(item.id, values2);
        }
        if (revision2 !== epoch || signal.aborted || !isLive2()) return;
        current2 = { messages: projected, draft: projectedDraft };
        changed();
      })();
      return current2;
    }
  };
}

export const ACCEPTED_REQUEST_LIMIT = 128;

export const MAX_PROJECTION_DEPTH = 16;

export function isPendingInteraction(message2) {
  if (message2.type === "sub_agent" && message2.subMessages?.some(isPendingInteraction)) return true;
  return [
    "question",
    "interact",
    "confirm",
    "tool_confirm_ask",
    "loop_guard_ask",
    "credit_threshold"
  ].includes(message2.type) && "resolved" in message2 && !message2.resolved;
}

export function projectMessage(message2, clean2) {
  const common = { id: message2.id, role: "role" in message2 ? message2.role : "agent" };
  switch (message2.type) {
    case "text":
    case "thinking":
    case "error":
      return { ...common, kind: message2.type, text: clean2(message2.content) };
    case "tool":
      return {
        ...common,
        kind: "tool",
        text: "",
        ..."toolName" in message2 && message2.toolName ? { toolName: clean2(message2.toolName).slice(0, CHAT_SESSION_TITLE_LIMIT) } : {},
        ...message2.toolStatus === "ok" ? { status: "completed" } : message2.toolStatus === "pending" || message2.toolStatus === "running" || message2.toolStatus === "error" ? { status: message2.toolStatus } : {}
      };
    default:
      return { ...common, kind: "notice", text: "" };
  }
}
function* newestMessages(messages2, depth2 = 0) {
  for (let index2 = messages2.length - 1; index2 >= 0; index2 -= 1) {
    const message2 = messages2[index2];
    if (message2.type === "sub_agent" && message2.subMessages && depth2 < MAX_PROJECTION_DEPTH)
      yield* newestMessages(message2.subMessages, depth2 + 1);
    yield message2;
  }
}

export function createChatSessionAdapter(binding) {
  let revision2 = 0;
  const listeners2 = /* @__PURE__ */ new Set();
  const accepted2 = /* @__PURE__ */ new Map();
  const sending = /* @__PURE__ */ new Map();
  const contexts = /* @__PURE__ */ new Map();
  const uncertain = /* @__PURE__ */ new Set();
  let stopEditing;
  const publish2 = () => {
    if (!binding.isLive() || listeners2.size === 0) return;
    const snapshot2 = read();
    for (const listener of listeners2) listener(snapshot2);
  };
  const projection = binding.resources ? createChatResourceProjection({
    resources: binding.resources,
    tasks: binding.tasks,
    events: binding.events,
    scopeKey: binding.scopeKey,
    isLive: binding.isLive,
    changed: publish2
  }) : void 0;
  const assertLive = () => {
    if (!binding.isLive()) throw new Error("CHAT_SESSION_SCOPE_RETIRED");
  };
  const clean2 = (text2) => {
    const visible2 = stripHiddenContext(text2);
    return binding.workspacePath ? visible2.split(binding.workspacePath).join("[project]") : visible2;
  };
  const read = () => {
    assertLive();
    const chat = binding.store.getSnapshot();
    const state2 = chat.sessionStore.getState();
    const privateSession = Boolean(chat.textEditAgentState) || Boolean(chat.focusedSessionId && chat.textEditSessionIds.has(chat.focusedSessionId));
    const messages2 = [];
    const visibleMessages = [];
    let remaining = CHAT_SESSION_TOTAL_TEXT_LIMIT;
    const ids2 = /* @__PURE__ */ new Set();
    for (const message2 of newestMessages(privateSession ? [] : chat.messages)) {
      if (messages2.length >= CHAT_SESSION_MESSAGE_LIMIT) break;
      if (!isChatSessionId(message2.id) || ids2.has(message2.id)) continue;
      ids2.add(message2.id);
      visibleMessages.push(message2);
      const projected = projectMessage(message2, clean2);
      const text2 = projected.text.slice(0, Math.min(CHAT_SESSION_TEXT_LIMIT, remaining));
      remaining -= text2.length;
      messages2.push({ ...projected, text: text2 });
    }
    const sessions = chat.sessions.filter(
      (session) => isChatSessionId(session.id) && !chat.textEditSessionIds.has(session.id) && !(session.runtime_session_id && chat.textEditSessionIds.has(session.runtime_session_id))
    ).slice(0, CHAT_SESSION_LIMIT).map((session) => ({
      id: session.id,
      title: clean2(session.display_name || session.name).slice(0, CHAT_SESSION_TITLE_LIMIT),
      busy: state2.sessions.get(session.id)?.busy ?? false
    }));
    const rich = projection?.read(
      visibleMessages,
      privateSession ? [] : chat.getHostComposerDraft().attachments
    );
    return {
      ...rich ? { projectionVersion: 2, draftResources: rich.draft } : {},
      ...binding.textEdit && rich ? { editing: privateSession ? null : binding.textEdit.getSnapshot() } : {},
      revision: ++revision2,
      sessionId: privateSession ? null : chat.focusedSessionId,
      sessions,
      messages: messages2.reverse().map((message2) => {
        const resources = rich?.messages.get(message2.id);
        return resources?.length ? { ...message2, resources } : message2;
      }),
      connected: chat.connected && binding.isReady(),
      busy: chat.busy || chat.pendingReasons.length > 0,
      historyLoading: chat.sessionsLoading || chat.conversationLoading || chat.switching || chat.creatingSession || chat.historyReloading,
      historyUnavailable: privateSession || chat.historyLoadFailed || Boolean(chat.sessionListUnavailable),
      draft: privateSession ? "" : chat.getDraftText().slice(0, CHAT_SESSION_DRAFT_LIMIT)
    };
  };
  return {
    refresh: publish2,
    snapshot: async () => {
      read();
      await projection?.settled();
      return read();
    },
    subscribe(listener) {
      assertLive();
      listeners2.add(listener);
      if (listeners2.size === 1) {
        projection?.connect();
        stopEditing = binding.textEdit?.subscribe(publish2);
      }
      const unsubscribe = binding.store.subscribe(() => {
        if (binding.isLive()) listener(read());
      });
      return () => {
        listeners2.delete(listener);
        unsubscribe();
        if (listeners2.size === 0) {
          projection?.disconnect();
          stopEditing?.();
          stopEditing = void 0;
        }
      };
    },
    async execute(input) {
      const command2 = structuredClone(input);
      if (!isChatSessionCommand(command2)) throw new Error("CHAT_SESSION_COMMAND_REJECTED");
      if (command2.kind === "send") {
        const identity2 = chatSessionSendIdentity(command2);
        const previous2 = accepted2.get(command2.requestId);
        if (previous2)
          return previous2 === identity2 ? void 0 : Promise.reject(new Error("CHAT_SESSION_REQUEST_CONFLICT"));
        const inFlight = sending.get(command2.requestId);
        if (inFlight)
          return inFlight.identity === identity2 ? inFlight.promise : Promise.reject(new Error("CHAT_SESSION_REQUEST_CONFLICT"));
        const promise = send2(command2, identity2);
        sending.set(command2.requestId, { identity: identity2, promise });
        try {
          return await promise;
        } finally {
          sending.delete(command2.requestId);
        }
      }
      assertLive();
      if (command2.kind === "text-edit") {
        if (!binding.textEdit) throw new Error("CHAT_SESSION_EDIT_UNAVAILABLE");
        await binding.textEdit.execute(command2.event);
        return;
      }
      const chat = binding.store.getSnapshot();
      if (chat.textEditAgentState) throw new Error("CHAT_SESSION_PRIVATE");
      const currentSessionId = chat.sessionStore.getState().focusedSessionId;
      if (chat.focusedSessionId !== currentSessionId) throw new Error("CHAT_SESSION_SWITCHING");
      if (command2.kind !== "select" && command2.kind !== "new" && command2.sessionId !== currentSessionId)
        throw new Error("CHAT_SESSION_CHANGED");
      if (command2.kind === "draft") {
        if (command2.resources !== void 0) {
          const resources = binding.resources;
          if (!resources) throw new Error("CHAT_SESSION_DRAFT_REJECTED");
          const expected = chat.getHostComposerDraft();
          const attachments = await Promise.all(
            command2.resources.map((ref) => resolveSessionResource(resources, ref))
          );
          assertLive();
          const latest2 = binding.store.getSnapshot();
          if (latest2.textEditAgentState || latest2.focusedSessionId !== command2.sessionId || latest2.sessionStore.getState().focusedSessionId !== command2.sessionId || !latest2.setHostComposerDraft(
            command2.sessionId,
            command2.text,
            attachments.map((value) => value.attachment),
            expected
          ))
            throw new Error("CHAT_SESSION_DRAFT_REJECTED");
        } else if (!chat.setHostComposerText(command2.sessionId, command2.text))
          throw new Error("CHAT_SESSION_DRAFT_REJECTED");
        publish2();
        return;
      }
      if (command2.kind === "open-link") {
        let url2;
        try {
          url2 = new URL(command2.url);
        } catch {
          throw new Error("CHAT_SESSION_LINK_REJECTED");
        }
        if (!/^https?:\/\//.test(command2.url) || !["http:", "https:"].includes(url2.protocol) || !url2.hostname || url2.username || url2.password || [...command2.url].some((character) => character.charCodeAt(0) <= 32) || !binding.openLink)
          throw new Error("CHAT_SESSION_LINK_REJECTED");
        await binding.openLink(url2.href);
        return;
      }
      if (!chat.connected || !binding.isReady()) throw new Error("CHAT_SESSION_UNAVAILABLE");
      if (command2.kind === "stop") {
        chat.handleCancel();
        return;
      }
      if (chat.switching || chat.creatingSession) throw new Error("CHAT_SESSION_SWITCHING");
      if (command2.kind === "new") {
        if (!chat.sendWsMessage({ type: "create_session" }))
          throw new Error("CHAT_SESSION_CREATE_REJECTED");
        return;
      }
      if (command2.kind === "select") {
        const known = chat.sessions.find((session) => session.id === command2.sessionId);
        if (!known || chat.textEditSessionIds.has(known.id) || known.runtime_session_id && chat.textEditSessionIds.has(known.runtime_session_id))
          throw new Error("CHAT_SESSION_UNKNOWN");
        if (!chat.sendWsMessage({ type: "switch_session", session_id: command2.sessionId }))
          throw new Error("CHAT_SESSION_SELECT_REJECTED");
        return;
      }
    }
  };
  function checkSend(command2) {
    assertLive();
    const chat = binding.store.getSnapshot();
    const state2 = chat.sessionStore.getState();
    const session = command2.sessionId ? state2.sessions.get(command2.sessionId) : void 0;
    if (chat.textEditAgentState || chat.textEditSessionIds.has(command2.sessionId ?? "") || chat.focusedSessionId !== command2.sessionId || state2.focusedSessionId !== command2.sessionId || session?.busy || (session?.pendingReasons.length ?? 0) > 0 || !chat.connected || !binding.isReady() || chat.switching || chat.creatingSession || chat.sessionsLoading || chat.conversationLoading || chat.historyReloading || chat.historyLoadFailed || chat.sessionListUnavailable || chat.busy || chat.pendingReasons.length > 0 || chat.messages.some(isPendingInteraction))
      throw new Error("CHAT_SESSION_SEND_BLOCKED");
    return chat;
  }
  async function send2(command2, identity2) {
    let chat;
    let context;
    let submitted;
    let paths;
    let resourceRefs;
    try {
      chat = checkSend(command2);
      const frozen2 = contexts.get(command2.requestId);
      if (frozen2 && frozen2.identity !== identity2) throw new Error("CHAT_SESSION_REQUEST_CONFLICT");
      if (!frozen2 && contexts.size >= ACCEPTED_REQUEST_LIMIT)
        throw new Error("CHAT_SESSION_SEND_BLOCKED");
      context = frozen2?.context ?? binding.textEdit?.captureSendContext(command2.requestId, command2.text) ?? {
        text: command2.text
      };
      contexts.set(command2.requestId, { identity: identity2, context });
      const expected = chat.getHostComposerDraft();
      if (command2.resources !== void 0) {
        const resources = binding.resources;
        if (!resources) throw new Error("CHAT_RESOURCE_UNAVAILABLE");
        const resolved = await Promise.all(
          command2.resources.map((ref) => resolveSessionResource(resources, ref))
        );
        chat = checkSend(command2);
        if (!binding.canSend()) throw new Error("CHAT_SESSION_SEND_BLOCKED");
        chat = checkSend(command2);
        if (!chat.setHostComposerDraft(
          command2.sessionId,
          command2.text,
          resolved.map((value) => value.attachment),
          expected
        ))
          throw new Error("CHAT_SESSION_SEND_BLOCKED");
        const requested = new Set(
          command2.resources.map((ref) => JSON.stringify([ref.resourceId, ref.versionId]))
        );
        submitted = {
          text: command2.text,
          attachments: chat.getHostComposerDraft().attachments.filter((attachment) => {
            const ref = hostAttachmentRef(attachment);
            return ref && requested.has(JSON.stringify([ref.resourceId, ref.versionId]));
          })
        };
        resourceRefs = resolved.map(({ attachment }) => {
          if (!attachment.relativePath) throw new Error("CHAT_RESOURCE_UNAVAILABLE");
          return { path: attachment.relativePath, ...attachment.resourceRef };
        });
        paths = resolved.map((value) => value.attachment.relativePath).filter((path2) => typeof path2 === "string");
      } else {
        if (!binding.canSend()) throw new Error("CHAT_SESSION_SEND_BLOCKED");
        chat = checkSend(command2);
        if (context.documentEditRequest || context.textEditContext || context.text !== command2.text) {
          submitted = { text: command2.text, attachments: [] };
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message === "CHAT_SESSION_REQUEST_CONFLICT") throw error;
      throw new Error(
        uncertain.has(command2.requestId) ? "CHAT_SESSION_SEND_UNKNOWN" : "CHAT_SESSION_SEND_BLOCKED"
      );
    }
    let sent;
    try {
      sent = chat.sendMessage(
        context.text,
        paths,
        void 0,
        void 0,
        void 0,
        command2.requestId,
        context.documentEditRequest,
        context.textEditContext,
        void 0,
        void 0,
        void 0,
        {
          ...submitted ? { hostComposerDraft: submitted } : { textOnlyComposer: true },
          resourceRefs,
          editorFocus: command2.editorFocus
        }
      );
    } catch {
      uncertain.add(command2.requestId);
      throw new Error("CHAT_SESSION_SEND_UNKNOWN");
    }
    if (!sent)
      throw new Error(
        uncertain.has(command2.requestId) ? "CHAT_SESSION_SEND_UNKNOWN" : "CHAT_SESSION_SEND_BLOCKED"
      );
    accepted2.set(command2.requestId, identity2);
    contexts.delete(command2.requestId);
    uncertain.delete(command2.requestId);
    if (accepted2.size > ACCEPTED_REQUEST_LIMIT) accepted2.delete(accepted2.keys().next().value ?? "");
    try {
      binding.textEdit?.acceptSend(command2.requestId);
      if (command2.sessionId) {
        if (submitted) chat.clearSubmittedComposerDraft(command2.sessionId, submitted);
        else chat.clearSubmittedComposerText(command2.sessionId, command2.text);
      }
      publish2();
    } catch {
    }
  }
}

export function useChatSessionAdapter(identity2, options2 = {}) {
  const store = useWorkspaceChatStoreOptional();
  const workspacePath = useCurrentWorkspace();
  const selectedModelId = useWorkspaceChatOptionalSelector((chat) => chat.selectedModelId);
  const readiness = useChatReadiness();
  const { guard: loginGuard } = useLoginGuard();
  const astra = useAstraSendGate(selectedModelId);
  const { request, events: events2, scopeKey, openLink, textEdit } = options2;
  const current2 = reactExports.useRef({
    identity: identity2,
    store,
    readiness,
    loginGuard,
    sendGuard: astra.sendGuard,
    mounted: true
  });
  current2.current = {
    identity: identity2,
    store,
    readiness,
    loginGuard,
    sendGuard: astra.sendGuard,
    mounted: true
  };
  reactExports.useLayoutEffect(() => {
    current2.current.mounted = true;
    return () => {
      current2.current.mounted = false;
    };
  }, []);
  const adapter = reactExports.useMemo(
    () => store ? createChatSessionAdapter({
      store,
      workspacePath,
      resources: request ? createProjectResourceClient(request) : void 0,
      tasks: request ? createProjectTaskClient(request) : void 0,
      events: events2,
      scopeKey,
      openLink,
      textEdit,
      isLive: () => current2.current.mounted && current2.current.identity === identity2 && current2.current.store === store,
      isReady: () => current2.current.readiness === "ready",
      canSend: () => current2.current.loginGuard() && guardAccountSubmission("chat").allowed && current2.current.sendGuard()
    }) : void 0,
    [store, identity2, workspacePath, request, events2, scopeKey, openLink, textEdit]
  );
  reactExports.useLayoutEffect(() => {
    adapter?.refresh();
  }, [adapter, readiness]);
  return adapter;
}
