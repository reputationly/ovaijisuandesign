// use-message-history.js
import reactExports from "react";

function extractUserMessages(messages) {
  const result = [];
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex--) {
    const message = messages[messageIndex];
    if (message.role === "user" && message.type === "text") {
      result.push(message);
    }
  }
  return result;
}

export function useMessageHistory(messages, resetKey) {
  const userMessages = reactExports.useMemo(
    () => extractUserMessages(messages ?? []),
    [messages],
  );
  const [index, setIndex] = reactExports.useState(-1);
  const indexRef = reactExports.useRef(-1);
  const draftRef = reactExports.useRef(null);
  const resetKeyRef = reactExports.useRef(resetKey);
  const navigateUp = reactExports.useCallback(
    (currentText, currentAttachmentPaths) => {
      if (userMessages.length === 0) return null;
      const current = indexRef.current;
      const next = current + 1;
      if (next >= userMessages.length) return null;
      if (current === -1) {
        draftRef.current = {
          text: currentText,
          attachmentPaths: [...currentAttachmentPaths],
        };
      }
      indexRef.current = next;
      setIndex(next);
      return userMessages[next];
    },
    [userMessages],
  );
  const navigateDown = reactExports.useCallback(() => {
    const current = indexRef.current;
    if (current <= -1) return null;
    const next = current - 1;
    indexRef.current = next;
    setIndex(next);
    if (next >= 0) {
      return {
        type: "history",
        message: userMessages[next],
      };
    }
    const draft = draftRef.current;
    draftRef.current = null;
    return {
      type: "draft",
      text: draft?.text ?? "",
      attachmentPaths: draft?.attachmentPaths ?? [],
    };
  }, [userMessages]);
  const reset = reactExports.useCallback(() => {
    if (indexRef.current !== -1) {
      indexRef.current = -1;
      setIndex(-1);
      draftRef.current = null;
    }
  }, []);
  reactExports.useEffect(() => {
    if (Object.is(resetKeyRef.current, resetKey)) return;
    resetKeyRef.current = resetKey;
    reset();
  }, [resetKey, reset]);
  return {
    isActive: index >= 0,
    navigateUp,
    navigateDown,
    reset,
  };
}

export function filenameFromPath(path) {
  return path.split("/").pop() ?? path;
}

export function attachmentsFromHistory(attachments) {
  if (!attachments?.length) return [];
  return attachments.map((attachment) => ({
    path: attachment.path,
    filename: filenameFromPath(attachment.path),
    ...(attachment.attachment_source === "asset_vault" && attachment.attachment_id
      ? {
          attachmentId: attachment.attachment_id,
        }
      : {}),
  }));
}
