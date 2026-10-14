// 画布写入修订号要跟网关头对上，单独放避免塞进网关客户端。


export const HILO_CANVAS_WRITER_REVISION_HEADER = "x-hilo-canvas-writer-revision";
export const MAX_CANVAS_WRITER_WORKSPACES = 100;
export const CANVAS_WRITER_REVISIONS_PER_MS = 1e3;
export const canvasWriterRevisions = /* @__PURE__ */new Map();
export function nextCanvasWriterRevision(binding) {
  const key = binding.claim;
  const timeFloor = Date.now() * CANVAS_WRITER_REVISIONS_PER_MS;
  const next = Math.max((canvasWriterRevisions.get(key) ?? 0) + 1, timeFloor);
  canvasWriterRevisions.set(key, next);
  if (canvasWriterRevisions.size > MAX_CANVAS_WRITER_WORKSPACES) {
    const oldest = canvasWriterRevisions.keys().next().value;
    if (oldest !== void 0 && oldest !== key) canvasWriterRevisions.delete(oldest);
  }
  return next;
}
export function advanceCanvasWriterRevision(binding, observedRevision) {
  if (!Number.isSafeInteger(observedRevision) || (observedRevision ?? 0) < 1) return;
  const current = canvasWriterRevisions.get(binding.claim) ?? 0;
  if (observedRevision > current) {
    canvasWriterRevisions.set(binding.claim, observedRevision);
  }
}
