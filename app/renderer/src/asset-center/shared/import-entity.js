// shared/import-entity.js
import { BASE, readObject, wrapAsAssetCenterError, isRecord$9 } from "../../vendor.js";
export class ImportEntityConflictError extends Error {
  conflict;
  constructor(conflict) {
    super(`Entity ${conflict.existingEntity.name} already exists`);
    this.name = "ImportEntityConflictError";
    this.conflict = conflict;
  }
}
export async function importEntity(buildUrl, file, mode2 = "create-new") {
  const form = new FormData();
  form.append("file", file);
  const params = new URLSearchParams();
  if (mode2 !== "create-new") params.set("mode", mode2);
  const qs = params.toString();
  const path2 = `${BASE}/import${qs ? `?${qs}` : ""}`;
  const url2 = buildUrl(path2);
  if (!url2) {
    throw new Error("Gateway not ready");
  }
  const controller = new AbortController();
  const timer2 = setTimeout(() => controller.abort(), 18e4);
  let res;
  try {
    res = await fetch(url2, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer2);
  }
  if (res.status === 409) {
    let body2;
    try {
      body2 = await res.json();
    } catch {
      throw new Error(`Import failed: 409 ${res.statusText}`);
    }
    const payload = extractConflictPayload(body2);
    if (payload) {
      throw new ImportEntityConflictError(payload);
    }
    throw new Error(`Import failed: 409 ${res.statusText}`);
  }
  if (!res.ok) {
    throw await wrapAsAssetCenterError(res);
  }
  return readObject(res, "import entity result");
}
function extractConflictPayload(body2) {
  if (!isRecord$9(body2)) return null;
  if (isRecord$9(body2.existingEntity) && isRecord$9(body2.importedManifest)) {
    return body2;
  }
  const nested = body2.message;
  if (
    isRecord$9(nested) &&
    isRecord$9(nested.existingEntity) &&
    isRecord$9(nested.importedManifest)
  ) {
    return nested;
  }
  return null;
}
