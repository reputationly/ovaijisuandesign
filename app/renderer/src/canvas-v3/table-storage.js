/**
 * 画布表格的文档存储。
 *
 * 画布里 `CanvasV3TableSession` 需要一个 storage：
 *   - `subscribe(listener)` / `getSnapshot()` → `{ pending, error }`
 *   - `load({ resourceId, versionId, contentRevision }, signal)` → 文档文本
 *   - `save({ nodeId, doc, name, source })` → 写回 `.htable`
 *
 * 之前这个 prop 从来没被提供（`tableStorage` 恒为 undefined），于是
 * `addActions.table.enabled = Boolean(tableStorage)` 永远为假 —— 「+ → 表格」
 * 点了没反应，表格节点根本建不出来。
 *
 * 后端两个端点（都已存在）：
 *   - 读：`POST api/project/resources/get`（mode=content，分块返回）
 *   - 写：`POST api/v3/document`（mode=create/update，带 baseRevision 冲突保护）
 */
import { serializeTableDocument } from "../text-editor/table-document-to-llm-content.js";

const READ_ROUTE = "api/project/resources/get";
const WRITE_ROUTE = "api/v3/document";
const EMPTY = Object.freeze({ pending: false, error: null });

/** 把 `resources/get` 的分块结果拼回文本。 */
export function contentTextOf(result) {
  if (!result || typeof result !== "object") return "";
  const detail = result.detail ?? result;
  const content = detail.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((chunk) => (typeof chunk === "string" ? chunk : typeof chunk?.text === "string" ? chunk.text : ""))
      .join("");
  }
  if (Array.isArray(detail.chunks)) {
    return detail.chunks.map((chunk) => (typeof chunk === "string" ? chunk : chunk?.text ?? "")).join("");
  }
  return "";
}

export function contentRevisionOf(result) {
  const detail = result?.detail ?? result;
  const revision = detail?.contentRevision;
  return typeof revision === "number" ? revision : undefined;
}

/**
 * @param {{ fetch: (path: string, init?: RequestInit) => Promise<Response>, hash?: (input: string) => string }} deps
 */
export function createCanvasV3TableStorage({ fetch: fetch2, hash }) {
  let snapshot = EMPTY;
  const listeners = new Set();
  const requestId = hash ?? ((input) => `tbl-${input.length}-${input.slice(0, 32)}`);
  const emit = () => {
    for (const listener of listeners) listener();
  };
  const setState = (next) => {
    snapshot = next;
    emit();
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return snapshot;
    },
    async load(ref, signal) {
      const response = await fetch2(READ_ROUTE, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              resourceId: ref.resourceId,
              versionId: ref.versionId,
              mode: "content",
              ...(ref.contentRevision === undefined ? {} : { contentRevision: ref.contentRevision }),
            },
          ],
        }),
        ...(signal ? { signal } : {}),
      });
      if (!response.ok) throw new Error(`TABLE_DOCUMENT_READ_${response.status}`);
      const body = await response.json();
      const first = Array.isArray(body?.results) ? body.results[0] : body;
      if (!first?.ok) throw new Error(first?.reason ? `TABLE_DOCUMENT_READ_${first.reason}` : "TABLE_DOCUMENT_READ_FAILED");
      return { text: contentTextOf(first), contentRevision: contentRevisionOf(first) };
    },
    async save({ nodeId, doc, name, source }) {
      setState({ pending: true, error: null });
      try {
        const content = serializeTableDocument(doc);
        const mode = source?.resourceId && source?.versionId ? "update" : "create";
        const response = await fetch2(WRITE_ROUTE, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            requestId: requestId(`${nodeId}:${name}:${content}`),
            mode,
            format: "htable",
            name,
            content,
            ...(mode === "update"
              ? { resourceId: source.resourceId, baseVersionId: source.versionId, baseRevision: source.contentRevision }
              : {}),
          }),
        });
        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          throw new Error(`TABLE_DOCUMENT_WRITE_${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
        }
        setState(EMPTY);
        return await response.json();
      } catch (error) {
        setState({ pending: false, error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    },
  };
}
