(function() {
  "use strict";
  const HAS_WIDTH_QUERY = /[?&]w=/;
  function thumbnailUrlForTier(url, tier) {
    if (HAS_WIDTH_QUERY.test(url)) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}w=${tier}`;
  }
  const inflight = /* @__PURE__ */ new Map();
  self.addEventListener("message", (event) => {
    const msg = event.data;
    if (msg.type === "cancel") {
      const ctrl = inflight.get(msg.taskId);
      if (ctrl) ctrl.abort();
      return;
    }
    if (msg.type === "decode") {
      void handleDecode(msg);
    }
  });
  async function handleDecode(req) {
    const ctrl = new AbortController();
    inflight.set(req.taskId, ctrl);
    let failureKind = "decode";
    let failureStatus;
    try {
      const url = thumbnailUrlForTier(req.url, req.tier);
      failureKind = "network";
      const resp = await fetch(url, { signal: ctrl.signal, credentials: "same-origin" });
      if (!resp.ok) {
        failureKind = "http";
        failureStatus = resp.status;
        throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
      }
      const blob = await resp.blob();
      failureKind = "decode";
      if (ctrl.signal.aborted) {
        throw new DOMException("aborted", "AbortError");
      }
      const bitmap = await createImageBitmap(blob, {
        resizeWidth: req.tier,
        resizeQuality: "high"
      });
      if (ctrl.signal.aborted) {
        bitmap.close();
        throw new DOMException("aborted", "AbortError");
      }
      const bytes = bitmap.width * bitmap.height * 4;
      const success = {
        type: "success",
        taskId: req.taskId,
        bitmap,
        width: bitmap.width,
        height: bitmap.height,
        bytes
      };
      postOut(success, [bitmap]);
    } catch (err) {
      const cancelled = isAbortError(err);
      const error = {
        type: "error",
        taskId: req.taskId,
        message: cancelled ? "aborted" : err?.message ?? String(err),
        cancelled,
        ...cancelled ? {} : { kind: failureKind, status: failureStatus }
      };
      postOut(error);
    } finally {
      inflight.delete(req.taskId);
    }
  }
  function isAbortError(err) {
    return err instanceof DOMException && err.name === "AbortError" || err?.name === "AbortError";
  }
  function postOut(msg, transfer) {
    if (transfer?.length) {
      self.postMessage(msg, transfer);
    } else {
      self.postMessage(msg);
    }
  }
})();
