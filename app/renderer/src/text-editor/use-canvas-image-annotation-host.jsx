// use-canvas-image-annotation-host.jsx
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ImageAnnotationDialog } from "./image-annotation-dialog.jsx";

export function useCanvasImageAnnotationHost(active2) {
  const [session, setSession] = reactExports.useState(null);
  const sessionRef = reactExports.useRef(null);
  const activeRef = reactExports.useRef(active2);
  activeRef.current = active2;
  const close2 = reactExports.useCallback(() => {
    const current2 = sessionRef.current;
    if (!current2) return;
    sessionRef.current = null;
    current2.controller.abort();
    current2.finish();
    setSession(null);
  }, []);
  reactExports.useEffect(() => {
    if (!active2) close2();
  }, [active2, close2]);
  reactExports.useEffect(
    () => () => {
      const current2 = sessionRef.current;
      sessionRef.current = null;
      current2?.controller.abort();
      current2?.finish();
    },
    [],
  );
  const openImageAnnotation = reactExports.useCallback(
    (request) => {
      if (!activeRef.current || request.signal.aborted || sessionRef.current)
        return Promise.resolve();
      return new Promise((resolve) => {
        const controller = new AbortController();
        const abort = () => close2();
        const current2 = {
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
        sessionRef.current = current2;
        setSession(current2);
      });
    },
    [close2],
  );
  const annotationDialog = session ? (
    <ImageAnnotationDialog
      key={session.attachment.id}
      attachment={session.attachment}
      canAppend={session.request.canAppend}
      applyDisabled={!active2}
      onClose={close2}
      onApply={async (_attachment, file, mode2, signal) => {
        const isCurrent = () =>
          activeRef.current &&
          sessionRef.current === session &&
          !session.controller.signal.aborted &&
          !session.request.signal.aborted &&
          !signal.aborted;
        if (!isCurrent() || (mode2 === "append" && !session.request.canAppend))
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
          return await session.request.onApply(file, mode2, combined.signal);
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
