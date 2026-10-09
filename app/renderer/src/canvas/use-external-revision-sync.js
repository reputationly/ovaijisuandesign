// use-external-revision-sync.js
import { reactExports } from "../vendor.js";

export function useExternalRevisionSync({
  externalRevision,
  externalMarkdown,
  userEditedRef,
  externalUpdatedWhileEditingRef,
  applySync,
  resetBaseline,
  onConflictLatch,
  onConflict,
}) {
  const seenRevisionRef = reactExports.useRef(externalRevision);
  const seenMarkdownRef = reactExports.useRef(externalMarkdown);
  const pendingRevisionMarkdownRef = reactExports.useRef(null);
  const unmatchedMarkdownRef = reactExports.useRef(null);
  const awaitingConflictMarkdownRef = reactExports.useRef(false);
  const onConflictLatchRef = reactExports.useRef(onConflictLatch);
  onConflictLatchRef.current = onConflictLatch;
  const onConflictRef = reactExports.useRef(onConflict);
  onConflictRef.current = onConflict;
  reactExports.useEffect(() => {
    const previousMarkdown = seenMarkdownRef.current;
    const markdownChanged = externalMarkdown !== previousMarkdown;
    seenMarkdownRef.current = externalMarkdown;
    const revisionChanged = externalRevision !== seenRevisionRef.current;
    const latchConflict = (loadedMarkdown) => {
      if (!externalUpdatedWhileEditingRef.current)
        onConflictLatchRef.current?.();
      externalUpdatedWhileEditingRef.current = true;
      if (loadedMarkdown === null) {
        awaitingConflictMarkdownRef.current = true;
        return;
      }
      awaitingConflictMarkdownRef.current = false;
      onConflictRef.current?.(loadedMarkdown);
    };
    if (revisionChanged) {
      seenRevisionRef.current = externalRevision;
      if (userEditedRef.current) {
        pendingRevisionMarkdownRef.current = null;
        unmatchedMarkdownRef.current = null;
        latchConflict(markdownChanged ? externalMarkdown : null);
        return;
      }
      const loadedMarkdown = markdownChanged
        ? externalMarkdown
        : unmatchedMarkdownRef.current;
      unmatchedMarkdownRef.current = null;
      if (loadedMarkdown === null) {
        pendingRevisionMarkdownRef.current = externalMarkdown;
        return;
      }
      pendingRevisionMarkdownRef.current = null;
      const shouldResetBaseline = applySync(loadedMarkdown);
      if (shouldResetBaseline !== false) resetBaseline(loadedMarkdown);
      return;
    }
    const pendingMarkdown = pendingRevisionMarkdownRef.current;
    if (pendingMarkdown !== null && externalMarkdown !== pendingMarkdown) {
      pendingRevisionMarkdownRef.current = null;
      unmatchedMarkdownRef.current = null;
      if (userEditedRef.current) {
        latchConflict(externalMarkdown);
        return;
      }
      const shouldResetBaseline = applySync(externalMarkdown);
      if (shouldResetBaseline !== false) resetBaseline(externalMarkdown);
      return;
    }
    if (markdownChanged) {
      unmatchedMarkdownRef.current = externalMarkdown;
      if (awaitingConflictMarkdownRef.current) {
        awaitingConflictMarkdownRef.current = false;
        onConflictRef.current?.(externalMarkdown);
      }
    }
  }, [
    externalRevision,
    externalMarkdown,
    applySync,
    resetBaseline,
    userEditedRef,
    externalUpdatedWhileEditingRef,
  ]);
}
