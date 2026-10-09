// use-debounced-draft-save.js
import { reactExports } from "../vendor.js";

export function useDebouncedDraftSave(initialMarkdown, onDraftChange) {
  const [status, setStatus] = reactExports.useState("idle");
  const latestDraftRef = reactExports.useRef(initialMarkdown);
  const latestDraftReaderRef = reactExports.useRef(null);
  const lastPersistedDraftRef = reactExports.useRef(initialMarkdown);
  const timerRef = reactExports.useRef(null);
  const pausedRef = reactExports.useRef(false);
  const activeWriteDraftRef = reactExports.useRef(null);
  const queuedWriteRef = reactExports.useRef(null);
  const writeLoopRef = reactExports.useRef(null);
  const lastWriteFailureRef = reactExports.useRef(null);
  const onDraftChangeRef = reactExports.useRef(onDraftChange);
  onDraftChangeRef.current = onDraftChange;
  const setLatestDraft = reactExports.useCallback((markdown2) => {
    latestDraftReaderRef.current = null;
    latestDraftRef.current = markdown2;
  }, []);
  const readLatestDraft = reactExports.useCallback(() => {
    const reader = latestDraftReaderRef.current;
    if (!reader) return latestDraftRef.current;
    const markdown2 = reader();
    latestDraftRef.current = markdown2;
    return markdown2;
  }, []);
  const runDraftChange = reactExports.useCallback(
    (markdown2, force = false) => {
      if (!onDraftChangeRef.current || pausedRef.current) return;
      if (
        !force &&
        (markdown2 === lastPersistedDraftRef.current ||
          markdown2 === activeWriteDraftRef.current ||
          markdown2 === queuedWriteRef.current)
      )
        return;
      queuedWriteRef.current = markdown2;
      if (writeLoopRef.current) return;
      const startWriteLoop = () => {
        if (
          writeLoopRef.current ||
          pausedRef.current ||
          queuedWriteRef.current === null
        )
          return;
        setStatus("saving");
        let tracked;
        const loop = (async () => {
          while (queuedWriteRef.current !== null && !pausedRef.current) {
            const next2 = queuedWriteRef.current;
            queuedWriteRef.current = null;
            activeWriteDraftRef.current = next2;
            try {
              await onDraftChangeRef.current?.(next2);
              lastPersistedDraftRef.current = next2;
              lastWriteFailureRef.current = null;
            } catch (error) {
              lastWriteFailureRef.current = {
                markdown: next2,
                error:
                  error instanceof Error
                    ? error
                    : new Error("Failed to persist text draft"),
              };
            } finally {
              activeWriteDraftRef.current = null;
            }
          }
        })();
        tracked = loop.finally(() => {
          if (writeLoopRef.current !== tracked) return;
          writeLoopRef.current = null;
          if (queuedWriteRef.current !== null && !pausedRef.current) {
            startWriteLoop();
            return;
          }
          setStatus(lastWriteFailureRef.current ? "failed" : "saved");
        });
        writeLoopRef.current = tracked;
      };
      startWriteLoop();
    },
    [],
  );
  const flushDraftSave = reactExports.useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const nextMarkdown = readLatestDraft();
    if (
      !pausedRef.current &&
      onDraftChangeRef.current &&
      nextMarkdown !== lastPersistedDraftRef.current
    ) {
      runDraftChange(nextMarkdown);
    }
    return nextMarkdown;
  }, [readLatestDraft, runDraftChange]);
  const flushDraftSaveAsync = reactExports.useCallback(async () => {
    while (true) {
      const flushedMarkdown = flushDraftSave();
      while (writeLoopRef.current) await writeLoopRef.current;
      const latestMarkdown = readLatestDraft();
      if (latestMarkdown !== flushedMarkdown) continue;
      if (latestMarkdown !== lastPersistedDraftRef.current) {
        throw (
          lastWriteFailureRef.current?.error ??
          new Error("Failed to persist text draft")
        );
      }
      lastWriteFailureRef.current = null;
      setStatus("saved");
      return;
    }
  }, [flushDraftSave, readLatestDraft]);
  const schedulePendingSave = reactExports.useCallback(() => {
    if (!onDraftChangeRef.current || pausedRef.current) return;
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      const currentMarkdown = readLatestDraft();
      if (
        pausedRef.current ||
        currentMarkdown === lastPersistedDraftRef.current
      )
        return;
      runDraftChange(currentMarkdown);
    }, 800);
  }, [readLatestDraft, runDraftChange]);
  const scheduleDraftSave = reactExports.useCallback(
    (nextMarkdown) => {
      setLatestDraft(nextMarkdown);
      schedulePendingSave();
    },
    [schedulePendingSave, setLatestDraft],
  );
  const scheduleDraftSaveFrom = reactExports.useCallback(
    (readMarkdown) => {
      latestDraftReaderRef.current = readMarkdown;
      schedulePendingSave();
    },
    [schedulePendingSave],
  );
  const pauseDraftSave = reactExports.useCallback(() => {
    pausedRef.current = true;
    queuedWriteRef.current = null;
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  const resumeDraftSave = reactExports.useCallback(() => {
    pausedRef.current = false;
  }, []);
  const forceDraftSave = reactExports.useCallback(
    (markdown2) => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setLatestDraft(markdown2);
      pausedRef.current = false;
      runDraftChange(markdown2, true);
    },
    [runDraftChange, setLatestDraft],
  );
  const resetBaseline = reactExports.useCallback(
    (nextMarkdown) => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setLatestDraft(nextMarkdown);
      lastPersistedDraftRef.current = nextMarkdown;
      lastWriteFailureRef.current = null;
      setStatus("idle");
    },
    [setLatestDraft],
  );
  const flushRef = reactExports.useRef(flushDraftSave);
  flushRef.current = flushDraftSave;
  reactExports.useEffect(() => {
    return () => {
      flushRef.current();
    };
  }, []);
  return {
    status,
    latestDraftRef,
    setLatestDraft,
    scheduleDraftSave,
    scheduleDraftSaveFrom,
    pauseDraftSave,
    resumeDraftSave,
    forceDraftSave,
    flushDraftSave,
    flushDraftSaveAsync,
    resetBaseline,
  };
}
