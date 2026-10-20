/** 聊天输入框草稿 hook（第 284 轮）。种子：useHostComposerText。偏移是 UTF-16 码元。 */

import reactExports from "react";
import jsxRuntimeExports from "react/jsx-runtime";
import { chatLog } from "../vendor-inline/vscode-base/graph.jsx";
import { hostAttachmentRef } from "./chat-session-adapter.js";
import { DRAFT_NEW_TAB } from "./chat-drafts.js";

export function attachmentIdentity(attachment) {
  return JSON.stringify([
    attachment.id,
    attachment.relativePath,
    hostAttachmentRef(attachment),
    attachment.status
  ]);
}

export function sameHostComposerDraft(left, right) {
  return left.text === right.text && left.attachments.length === right.attachments.length && left.attachments.every(
    (attachment, index2) => attachmentIdentity(attachment) === attachmentIdentity(right.attachments[index2])
  );
}

export function mergeHostComposerAttachments(current2, requested) {
  const native = current2.filter(
    (attachment) => !("hostComposer" in attachment && attachment.hostComposer === true)
  );
  return [
    ...native,
    ...requested.map((attachment) => {
      const previous2 = current2.find(
        (candidate) => "hostComposer" in candidate && candidate.hostComposer === true && JSON.stringify(hostAttachmentRef(candidate)) === JSON.stringify(attachment.resourceRef) && candidate.relativePath === attachment.relativePath
      );
      return previous2 ?? attachment;
    })
  ];
}

export function consumeHostComposerDraft(current2, submitted) {
  const consumed = new Set(submitted.attachments.map(attachmentIdentity));
  return {
    ...current2,
    ...current2.text === submitted.text ? { text: "", editorDoc: void 0 } : {},
    attachments: current2.attachments.filter(
      (attachment) => !consumed.has(attachmentIdentity(attachment))
    )
  };
}

export function useHostComposerText({
  sessionStore,
  drafts,
  input,
  editorDoc,
  attachments,
  setInput,
  setPendingEditorDoc,
  setPendingAttachments
}) {
  const sequence = reactExports.useRef(0);
  const pending2 = reactExports.useRef(null);
  const [pendingHostComposerReset, setPendingReset] = reactExports.useState(null);
  const writeText = reactExports.useCallback(
    (sessionId, text2, expectedText, requireDurable, nextAttachments = attachments.current, expectedDraft) => {
      if (sessionStore.getState().focusedSessionId !== sessionId || expectedText !== void 0 && input.current !== expectedText || expectedDraft !== void 0 && !sameHostComposerDraft(
        { text: input.current, attachments: attachments.current },
        expectedDraft
      ))
        return false;
      const key2 = sessionId ?? DRAFT_NEW_TAB;
      const nextDoc = text2 && text2 === input.current ? editorDoc.current : void 0;
      const next2 = {
        ...drafts.get(key2),
        text: text2,
        editorDoc: nextDoc,
        attachments: nextAttachments
      };
      const persisted = drafts.setNow(key2, next2, { requireDurable });
      if (!persisted && requireDurable) return false;
      if (!persisted) {
        try {
          chatLog.warn("submitted chat draft cleanup persistence failed", { sessionId });
        } catch {
        }
      }
      input.current = text2;
      editorDoc.current = nextDoc;
      if (nextAttachments !== attachments.current) {
        attachments.current = nextAttachments;
        setPendingAttachments?.(nextAttachments);
      }
      setInput(text2);
      setPendingEditorDoc(nextDoc ?? null);
      pending2.current = text2 ? null : { id: ++sequence.current, sessionId };
      setPendingReset(pending2.current);
      return true;
    },
    [
      sessionStore,
      drafts,
      input,
      editorDoc,
      attachments,
      setInput,
      setPendingEditorDoc,
      setPendingAttachments
    ]
  );
  const getHostComposerDraft = reactExports.useCallback(
    () => ({
      text: input.current,
      attachments: attachments.current.map((attachment) => ({ ...attachment }))
    }),
    [input, attachments]
  );
  const setHostComposerDraft = reactExports.useCallback(
    (sessionId, text2, requested, expected) => writeText(
      sessionId,
      text2,
      void 0,
      true,
      mergeHostComposerAttachments(attachments.current, requested),
      expected
    ),
    [writeText, attachments]
  );
  const clearSubmittedComposerDraft = reactExports.useCallback(
    (sessionId, submitted) => {
      const remaining = consumeHostComposerDraft(getHostComposerDraft(), submitted);
      return writeText(sessionId, remaining.text, void 0, false, remaining.attachments);
    },
    [getHostComposerDraft, writeText]
  );
  const setHostComposerText = reactExports.useCallback(
    (sessionId, text2, expectedText) => writeText(sessionId, text2, expectedText, true),
    [writeText]
  );
  const clearSubmittedComposerText = reactExports.useCallback(
    (sessionId, expectedText) => writeText(sessionId, "", expectedText, false),
    [writeText]
  );
  const consumeHostComposerReset = reactExports.useCallback(
    (id2) => {
      const reset2 = pending2.current;
      if (!reset2 || reset2.id !== id2 || sessionStore.getState().focusedSessionId !== reset2.sessionId || input.current !== "" || editorDoc.current !== void 0)
        return false;
      pending2.current = null;
      return true;
    },
    [sessionStore, input, editorDoc]
  );
  return {
    getHostComposerDraft,
    setHostComposerDraft,
    clearSubmittedComposerDraft,
    setHostComposerText,
    clearSubmittedComposerText,
    pendingHostComposerReset,
    consumeHostComposerReset
  };
}
