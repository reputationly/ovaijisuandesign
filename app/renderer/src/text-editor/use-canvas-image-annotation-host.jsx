// use-canvas-image-annotation-host.jsx
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ImageAnnotationDialog } from "./image-annotation-dialog.jsx";

export function useCanvasImageAnnotationHost(active2) {
  const [session, setSession] = reactExports.useState(null);
  const sessionRef = reactExports.useRef(null);
  const activeRef = reactExports.useRef(active2);
  activeRef.current = active2;
  const handleClose = reactExports.useCallback(() => {
    const current = sessionRef.current;
    if (!current) return;
    sessionRef.current = null;
    current.controller.abort();
    current.finish();
    setSession(null);
  }, []);
  reactExports.useEffect(() => {
    if (!active2) handleClose();
  }, [active2, handleClose]);
  reactExports.useEffect(
    () => () => {
      const current = sessionRef.current;
      sessionRef.current = null;
      current?.controller.abort();
      current?.finish();
    },
    [],
  );
  const openImageAnnotation = reactExports.useCallback(
    (request) => {
      if (!activeRef.current || request.signal.aborted || sessionRef.current)
        return Promise.resolve();
      return new Promise((resolve) => {
        const controller = new AbortController();
        const abort = () => handleClose();
        const current = {
          request,
          controller,
          attachment: {
            id: `canvas-annotation-${crypto.randomUUID()}`,
            filename: request.name,
            relativePath: request.path,
            previewUrl: request.url,
            fileType: "image",
            status: "done",
          },
          finish: () => {
            request.signal.removeEventListener("abort", abort);
            resolve();
          },
        };
        request.signal.addEventListener("abort", abort, {
          once: true,
        });
        sessionRef.current = current;
        setSession(current);
      });
    },
    [handleClose],
  );
  const annotationDialog = session ? (
    <ImageAnnotationDialog
      key={session.attachment.id}
      attachment={session.attachment}
      canAppend={session.request.canAppend}
      applyDisabled={!active2}
      onClose={handleClose}
      onApply={async (_attachment, file, mode, signal) => {
        const isCurrent = () =>
          activeRef.current &&
          sessionRef.current === session &&
          !session.controller.signal.aborted &&
          !session.request.signal.aborted &&
          !signal.aborted;
        if (!isCurrent() || (mode === "append" && !session.request.canAppend))
          return false;
        const combined = new AbortController();
        const abort = () => combined.abort();
        for (const source of [
          signal,
          session.controller.signal,
          session.request.signal,
        ]) {
          source.addEventListener("abort", abort, {
            once: true,
          });
        }
        try {
          return await session.request.onApply(file, mode, combined.signal);
        } finally {
          for (const source of [
            signal,
            session.controller.signal,
            session.request.signal,
          ]) {
            source.removeEventListener("abort", abort);
          }
        }
      }}
    />
  ) : null;
  return {
    openImageAnnotation,
    annotationDialog,
  };
}
