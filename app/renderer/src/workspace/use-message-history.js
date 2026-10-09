// use-message-history.js
import { reactExports } from "../vendor.js";

function extractUserMessages(messages2) {
  const result = [];
  for (let i2 = messages2.length - 1; i2 >= 0; i2--) {
    const m3 = messages2[i2];
    if (m3.role === "user" && m3.type === "text") {
      result.push(m3);
    }
  }
  return result;
}

export function useMessageHistory(messages2, resetKey) {
  const userMessages = reactExports.useMemo(
    () => extractUserMessages(messages2 ?? []),
    [messages2],
  );
  const [index2, setIndex] = reactExports.useState(-1);
  const indexRef = reactExports.useRef(-1);
  const draftRef = reactExports.useRef(null);
  const resetKeyRef = reactExports.useRef(resetKey);
  const navigateUp = reactExports.useCallback(
    (currentText, currentAttachmentPaths) => {
      if (userMessages.length === 0) return null;
      const current2 = indexRef.current;
      const next2 = current2 + 1;
      if (next2 >= userMessages.length) return null;
      if (current2 === -1) {
        draftRef.current = {
          text: currentText,
          attachmentPaths: [...currentAttachmentPaths],
        };
      }
      indexRef.current = next2;
      setIndex(next2);
      return userMessages[next2];
    },
    [userMessages],
  );
  const navigateDown = reactExports.useCallback(() => {
    const current2 = indexRef.current;
    if (current2 <= -1) return null;
    const next2 = current2 - 1;
    indexRef.current = next2;
    setIndex(next2);
    if (next2 >= 0) {
      return {
        type: "history",
        message: userMessages[next2],
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
  const reset2 = reactExports.useCallback(() => {
    if (indexRef.current !== -1) {
      indexRef.current = -1;
      setIndex(-1);
      draftRef.current = null;
    }
  }, []);
  reactExports.useEffect(() => {
    if (Object.is(resetKeyRef.current, resetKey)) return;
    resetKeyRef.current = resetKey;
    reset2();
  }, [resetKey, reset2]);
  return {
    isActive: index2 >= 0,
    navigateUp,
    navigateDown,
    reset: reset2,
  };
}

export function filenameFromPath(path2) {
  return path2.split("/").pop() ?? path2;
}

export function attachmentsFromHistory(attachments) {
  if (!attachments?.length) return [];
  return attachments.map((att) => ({
    path: att.path,
    filename: filenameFromPath(att.path),
    ...(att.attachment_source === "asset_vault" && att.attachment_id
      ? {
          attachmentId: att.attachment_id,
        }
      : {}),
  }));
}
