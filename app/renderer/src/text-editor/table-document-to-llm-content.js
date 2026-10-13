// table-document-to-llm-content.js

export function setCell(doc, rowId, columnId, value) {
  return {
    ...doc,
    rows: doc.rows.map((row) =>
      row.id === rowId
        ? {
            ...row,
            cells: {
              ...row.cells,
              [columnId]: value,
            },
          }
        : row,
    ),
  };
}
export function serializeTableDocument(doc) {
  return JSON.stringify(doc, null, 2);
}
export function tableDocumentToLlmContent(doc) {
  const columnIndexById = new Map();
  doc.columns.forEach((col, idx) => {
    columnIndexById.set(col.id, idx);
  });
  const llmColumns = doc.columns.map((col) => ({
    title: col.title,
    type: col.type,
    ...(col.visible === false
      ? {
          visible: false,
        }
      : {}),
    ...(col.width != null
      ? {
          width: col.width,
        }
      : {}),
  }));
  const llmRows = doc.rows.map((row) => ({
    cells: doc.columns.map((col) => {
      const cell = row.cells[col.id];
      if (cell === void 0 || cell === null) return null;
      if (Array.isArray(cell)) {
        return cell.map((attachment) => ({
          assetId: attachment.assetId,
          name: attachment.name,
          kind: attachment.kind,
        }));
      }
      return cell;
    }),
  }));
  const llmContent = {
    columns: llmColumns,
    rows: llmRows,
  };
  if (doc.filter && doc.filter.conditions.length > 0) {
    llmContent.filter = {
      match: doc.filter.match,
      conditions: doc.filter.conditions
        .map((cond) => {
          const idx = columnIndexById.get(cond.columnId);
          if (idx == null) return null;
          return {
            columnIndex: idx,
            op: cond.op,
            value: cond.value,
          };
        })
        .filter((condition) => condition != null),
    };
    if (llmContent.filter.conditions.length === 0) {
      llmContent.filter = void 0;
    }
  }
  if (doc.rowHeight) llmContent.rowHeight = doc.rowHeight;
  return llmContent;
}
export function DerivationEdge() {
  return null;
}
const MENTION_TOKEN_RE = /@\[([^\]\n]+)\]|@([^\s@[\]]+)/g;
export function findAllMentions(text) {
  if (!text) return [];
  const out = [];
  MENTION_TOKEN_RE.lastIndex = 0;
  let match = MENTION_TOKEN_RE.exec(text);
  while (match !== null) {
    const path = match[1] ?? match[2] ?? "";
    out.push({
      start: match.index,
      end: match.index + match[0].length,
      path,
    });
    match = MENTION_TOKEN_RE.exec(text);
  }
  return out;
}
export const CANVAS_REFERENCE_API = {
  search: "/api/canvas-references/search",
  resolve: "/api/canvas-references/resolve",
  content: "/api/canvas-references/content",
};
const PREFIX = "hilo-ref:";
export function isCanvasReferenceUri(value) {
  return value.startsWith(PREFIX);
}
export function encodeCanvasReference(reference) {
  return PREFIX + encodeURIComponent(JSON.stringify(reference));
}
export function mapCanvasDirectReference(value) {
  if (!value || typeof value !== "object") return;
  const row = value;
  if (row.source !== "project" && row.source !== "subject") return;
  if (typeof row.id !== "string" || !row.id || row.id.length > 256) return;
  if (typeof row.scope !== "string" || !row.scope || row.scope.length > 256)
    return;
  if (typeof row.name !== "string" || row.name.length > 1024) return;
  if (!["image", "video", "audio", "text", "other"].includes(String(row.kind)))
    return;
  if (
    row.target !== void 0 &&
    (row.target !== "entity" ||
      row.source !== "subject" ||
      row.id !== row.scope)
  )
    return;
  if (
    row.attachmentKinds !== void 0 &&
    (row.target !== "entity" ||
      !Array.isArray(row.attachmentKinds) ||
      row.attachmentKinds.length > 256 ||
      row.attachmentKinds.some(
        (kind) => !["image", "video", "audio", "text", "other"].includes(kind),
      ))
  )
    return;
  return {
    ...(row.target === "entity"
      ? {
          target: "entity",
        }
      : {}),
    ...(typeof row.entityType === "string"
      ? {
          entityType: row.entityType,
        }
      : {}),
    source: row.source,
    id: row.id,
    scope: row.scope,
    name: row.name,
    kind: row.kind,
    ...(typeof row.subjectName === "string"
      ? {
          subjectName: row.subjectName,
        }
      : {}),
    ...(Array.isArray(row.attachmentKinds)
      ? {
          attachmentKinds: row.attachmentKinds,
        }
      : {}),
  };
}
export function parseCanvasReference(value) {
  if (
    typeof value !== "string" ||
    !isCanvasReferenceUri(value) ||
    value.length > 8192
  )
    return;
  try {
    return mapCanvasDirectReference(
      JSON.parse(decodeURIComponent(value.slice(PREFIX.length))),
    );
  } catch {
    return void 0;
  }
}
export function canvasReferenceIdentity(reference) {
  return JSON.stringify([
    reference.source,
    reference.scope,
    reference.id,
    ...(reference.target ? [reference.target] : []),
  ]);
}
export function mapCanvasReferenceCandidates(value) {
  if (!Array.isArray(value))
    throw new Error("Invalid reference search response");
  return value.map((raw) => {
    if (!raw || typeof raw !== "object")
      throw new Error("Invalid reference candidate");
    const row = raw;
    if (
      typeof row.id !== "string" ||
      typeof row.name !== "string" ||
      (row.source !== "project" && row.source !== "subject") ||
      !Array.isArray(row.references)
    ) {
      throw new Error("Invalid reference candidate");
    }
    const references = row.references.map(mapCanvasDirectReference);
    if (references.some((ref) => !ref))
      throw new Error("Invalid reference identity");
    return {
      id: row.id,
      name: row.name,
      source: row.source,
      references,
      ...(typeof row.entityType === "string"
        ? {
            entityType: row.entityType,
          }
        : {}),
    };
  });
}
export function existingCanvasReferencePath(reference, paths) {
  const identity = canvasReferenceIdentity(reference);
  for (const path of paths) {
    const candidate = parseCanvasReference(path);
    if (candidate && canvasReferenceIdentity(candidate) === identity)
      return path;
  }
  return void 0;
}
export function isCanvasSubjectReference(value) {
  return parseCanvasReference(value)?.target === "entity";
}
export const CLOUD_SERVER_TIME_HEADER = "X-Hilo-Server-Time";
const CLOUD_GATEWAY_URLS = {
  domestic: {
    dev: "https://hub-pre.xaminim.com",
    test: "https://hub-pre.xaminim.com",
    staging: "https://design.minimax.cn",
    prod: "https://design.minimax.cn",
  },
  overseas: {
    dev: "https://hilo-test.xaminim.com",
    test: "https://hilo-test.xaminim.com",
    staging: "https://design.minimax.io",
    prod: "https://design.minimax.io",
  },
};
const LEGACY_PLATFORM_PROVIDER_URLS = [
  // The config endpoint is routed through hub-pre, but provider baseURL values
  // can still be served as the legacy hilo-pre alias.
  "https://hilo-pre.xaminim.com",
  // Pre-rebrand hub.* domains: server-side provider baseURL values may still
  // point at hub.* during the design.* domain migration window.
  "https://hub.minimaxi.com",
  "https://hub.minimax.io",
  // Pre-rebrand domestic design.minimaxi.com: the server may still serve provider
  // baseURL values on the old domain while clients roll over to design.minimax.cn.
  // Dropping this would stop token injection and fail LLM calls with 401.
  "https://design.minimaxi.com",
];
const CLOUD_GATEWAY_URL_PREFIXES = [
  ...new Set(
    [
      ...Object.values(CLOUD_GATEWAY_URLS).flatMap((channels) =>
        Object.values(channels),
      ),
      ...LEGACY_PLATFORM_PROVIDER_URLS,
    ].flatMap((url) => [url, url.replace("https://", "http://")]),
  ),
];
new Set([
  "https://design.minimax.cn",
  ...CLOUD_GATEWAY_URL_PREFIXES.filter((url) => url.startsWith("https://")),
  "https://hailuo-pre.xaminim.com",
  "https://hailuoai-video-test.xaminim.com",
  "https://hailuoai.com",
  "https://hailuoai.video",
  "https://openplatform-test.xaminim.com",
  "https://openplatform-test-i18n.xaminim.com",
  "https://www.minimaxi.com",
  "https://platform.minimax.io",
]);
