// read-upload-finalize-outbox.js
import {
  compactUploadFinalizeOutbox,
  UPLOAD_FINALIZE_OUTBOX_KEY,
  writeUploadFinalizeOutbox,
} from "./classify-upload-error.js";

const UPLOAD_FINALIZE_OUTBOX_MAX_ENTRIES = 512;

export function readUploadFinalizeOutbox() {
  try {
    const raw2 = localStorage.getItem(UPLOAD_FINALIZE_OUTBOX_KEY);
    if (!raw2) return [];
    const parsed = JSON.parse(raw2);
    if (!Array.isArray(parsed))
      throw new Error("invalid upload finalize outbox");
    const records = parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const record2 = entry;
      return typeof record2.scopeKey === "string" &&
        record2.scopeKey.length > 0 &&
        record2.scopeKey.length <= 2048 &&
        typeof record2.operationId === "string" &&
        record2.operationId.length <= 128 &&
        typeof record2.queuedAt === "number" &&
        Number.isFinite(record2.queuedAt)
        ? [
            {
              scopeKey: record2.scopeKey,
              operationId: record2.operationId,
              queuedAt: record2.queuedAt,
            },
          ]
        : [];
    });
    const compacted = compactUploadFinalizeOutbox(records, Date.now());
    if (compacted.length !== parsed.length)
      writeUploadFinalizeOutbox(compacted);
    return compacted;
  } catch {
    try {
      localStorage.removeItem(UPLOAD_FINALIZE_OUTBOX_KEY);
    } catch {}
    return [];
  }
}

export function enqueueUploadFinalizeOperations(scopeKey, operationIds) {
  const records = compactUploadFinalizeOutbox(
    readUploadFinalizeOutbox(),
    Date.now(),
  );
  const known = new Set(
    records.map((record2) => `${record2.scopeKey}\0${record2.operationId}`),
  );
  const additions = operationIds.flatMap((operationId) => {
    const key2 = `${scopeKey}\0${operationId}`;
    if (known.has(key2)) return [];
    known.add(key2);
    return [
      {
        scopeKey,
        operationId,
        queuedAt: Date.now(),
      },
    ];
  });
  if (records.length + additions.length > UPLOAD_FINALIZE_OUTBOX_MAX_ENTRIES)
    return false;
  return writeUploadFinalizeOutbox([...records, ...additions]);
}

export function removeUploadFinalizeOperation(scopeKey, operationId) {
  const records = readUploadFinalizeOutbox();
  writeUploadFinalizeOutbox(
    records.filter(
      (record2) =>
        record2.scopeKey !== scopeKey || record2.operationId !== operationId,
    ),
  );
}
