// table-document-to-llm-content.js
import {
  TABLE_DOCUMENT_VERSION,
  isTableRowHeight,
  newConditionId,
  sanitizeRowHeightOverride,
} from "../canvas/prune-persisted-node-data.js";
export function setCell(doc2, rowId, columnId, value) {
  return {
    ...doc2,
    rows: doc2.rows.map((r2) =>
      r2.id === rowId
        ? {
            ...r2,
            cells: {
              ...r2.cells,
              [columnId]: value,
            },
          }
        : r2,
    ),
  };
}
export function serializeTableDocument(doc2) {
  return JSON.stringify(doc2, null, 2);
}
export function parseTableDocument(raw2) {
  const data2 = JSON.parse(raw2);
  if (!data2 || typeof data2 !== "object") {
    throw new Error("Invalid table document: not an object");
  }
  const doc2 = data2;
  if (doc2.version !== TABLE_DOCUMENT_VERSION) {
    throw new Error(`Unsupported table document version: ${doc2.version}`);
  }
  if (!Array.isArray(doc2.columns) || !Array.isArray(doc2.rows)) {
    throw new Error("Invalid table document: columns/rows must be arrays");
  }
  const rowHeight = isTableRowHeight(doc2.rowHeight) ? doc2.rowHeight : void 0;
  const rows = doc2.rows.map((r2) => {
    if (!("height" in r2) || r2.height === void 0) return r2;
    const sanitized = sanitizeRowHeightOverride(r2.height);
    if (sanitized === r2.height) return r2;
    if (sanitized === void 0) {
      const { height: _drop, ...rest } = r2;
      return rest;
    }
    return {
      ...r2,
      height: sanitized,
    };
  });
  const filter2 = migrateFilter(doc2.filter);
  return {
    version: doc2.version,
    columns: doc2.columns,
    rows,
    ...(filter2
      ? {
          filter: filter2,
        }
      : {}),
    ...(rowHeight
      ? {
          rowHeight,
        }
      : {}),
  };
}
function migrateFilter(raw2) {
  if (!raw2) return void 0;
  if (Array.isArray(raw2.conditions)) {
    const filter2 = raw2;
    if (filter2.conditions.length === 0) return void 0;
    return {
      match: filter2.match === "all" ? "all" : "any",
      conditions: filter2.conditions.map((c3) => ({
        id: c3.id || newConditionId(),
        columnId: c3.columnId,
        op: c3.op,
        value: c3.value,
      })),
    };
  }
  const legacy = raw2;
  if (!legacy.columnId || !legacy.op) return void 0;
  return {
    match: "any",
    conditions: [
      {
        id: newConditionId(),
        columnId: legacy.columnId,
        op: legacy.op,
        value: legacy.value,
      },
    ],
  };
}
export function tableDocumentToLlmContent(doc2) {
  const columnIndexById = new Map();
  doc2.columns.forEach((col, idx) => {
    columnIndexById.set(col.id, idx);
  });
  const llmColumns = doc2.columns.map((col) => ({
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
  const llmRows = doc2.rows.map((row) => ({
    cells: doc2.columns.map((col) => {
      const cell = row.cells[col.id];
      if (cell === void 0 || cell === null) return null;
      if (Array.isArray(cell)) {
        return cell.map((a2) => ({
          assetId: a2.assetId,
          name: a2.name,
          kind: a2.kind,
        }));
      }
      return cell;
    }),
  }));
  const llm = {
    columns: llmColumns,
    rows: llmRows,
  };
  if (doc2.filter && doc2.filter.conditions.length > 0) {
    llm.filter = {
      match: doc2.filter.match,
      conditions: doc2.filter.conditions
        .map((cond) => {
          const idx = columnIndexById.get(cond.columnId);
          if (idx == null) return null;
          return {
            columnIndex: idx,
            op: cond.op,
            value: cond.value,
          };
        })
        .filter((c3) => c3 != null),
    };
    if (llm.filter.conditions.length === 0) {
      llm.filter = void 0;
    }
  }
  if (doc2.rowHeight) llm.rowHeight = doc2.rowHeight;
  return llm;
}
export function DerivationEdge() {
  return null;
}
const MENTION_TOKEN_RE = /@\[([^\]\n]+)\]|@([^\s@[\]]+)/g;
export function findAllMentions(text2) {
  if (!text2) return [];
  const out = [];
  MENTION_TOKEN_RE.lastIndex = 0;
  let m3 = MENTION_TOKEN_RE.exec(text2);
  while (m3 !== null) {
    const path2 = m3[1] ?? m3[2] ?? "";
    out.push({
      start: m3.index,
      end: m3.index + m3[0].length,
      path: path2,
    });
    m3 = MENTION_TOKEN_RE.exec(text2);
  }
  return out;
}
export const CANVAS_REFERENCE_API = {
  search: "/api/canvas-references/search",
  resolve: "/api/canvas-references/resolve",
  content: "/api/canvas-references/content",
};
const PREFIX$1 = "hilo-ref:";
export function isCanvasReferenceUri(value) {
  return value.startsWith(PREFIX$1);
}
export function encodeCanvasReference(reference) {
  return PREFIX$1 + encodeURIComponent(JSON.stringify(reference));
}
export function parseCanvasReference(value) {
  if (typeof value !== "string" || !isCanvasReferenceUri(value) || value.length > 8192) return;
  try {
    return mapCanvasDirectReference(JSON.parse(decodeURIComponent(value.slice(PREFIX$1.length))));
  } catch {
    return void 0;
  }
}
function mapCanvasDirectReference(value) {
  if (!value || typeof value !== "object") return;
  const row = value;
  if (row.source !== "project" && row.source !== "subject") return;
  if (typeof row.id !== "string" || !row.id || row.id.length > 256) return;
  if (typeof row.scope !== "string" || !row.scope || row.scope.length > 256) return;
  if (typeof row.name !== "string" || row.name.length > 1024) return;
  if (!["image", "video", "audio", "text", "other"].includes(String(row.kind))) return;
  if (
    row.target !== void 0 &&
    (row.target !== "entity" || row.source !== "subject" || row.id !== row.scope)
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
export function canvasReferenceIdentity(reference) {
  return JSON.stringify([
    reference.source,
    reference.scope,
    reference.id,
    ...(reference.target ? [reference.target] : []),
  ]);
}
export function restoreCanvasReferencePaths(prompt, paths) {
  const restored = {
    ...paths,
  };
  for (const { path: uri } of findAllMentions(prompt)) {
    const reference = parseCanvasReference(uri);
    if (!reference) continue;
    const kinds =
      reference.target === "entity"
        ? (reference.attachmentKinds ?? [reference.kind])
        : [reference.kind];
    for (const kind of kinds) {
      const bucket = kind === "other" ? "text" : kind;
      if (!existingCanvasReferencePath(reference, restored[bucket]))
        restored[bucket] = [...restored[bucket], uri];
    }
  }
  return restored;
}
export function mapCanvasReferenceCandidates(value) {
  if (!Array.isArray(value)) throw new Error("Invalid reference search response");
  return value.map((raw2) => {
    if (!raw2 || typeof raw2 !== "object") throw new Error("Invalid reference candidate");
    const row = raw2;
    if (
      typeof row.id !== "string" ||
      typeof row.name !== "string" ||
      (row.source !== "project" && row.source !== "subject") ||
      !Array.isArray(row.references)
    ) {
      throw new Error("Invalid reference candidate");
    }
    const references = row.references.map(mapCanvasDirectReference);
    if (references.some((ref) => !ref)) throw new Error("Invalid reference identity");
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
export function mapCanvasReferenceResolutions(value, expected) {
  if (!Array.isArray(value)) throw new Error("Invalid reference resolution response");
  if (expected && value.length !== expected.length) {
    throw new Error("Reference resolution count mismatch");
  }
  return value.map((raw2, index2) => {
    if (!raw2 || typeof raw2 !== "object") throw new Error("Invalid reference resolution");
    const row = raw2;
    const reference = mapCanvasDirectReference(row.reference);
    if (
      !reference ||
      !["available", "deleted", "missing", "unavailable"].includes(String(row.status))
    ) {
      throw new Error("Invalid reference resolution");
    }
    if (
      expected &&
      canvasReferenceIdentity(reference) !== canvasReferenceIdentity(expected[index2])
    ) {
      throw new Error("Reference resolution identity mismatch");
    }
    return {
      reference,
      status: row.status,
      ...(typeof row.name === "string"
        ? {
            name: row.name,
          }
        : {}),
      ...(row.metadata === void 0
        ? {}
        : {
            metadata: mapCanvasReferenceMetadata(row.metadata),
          }),
    };
  });
}
function mapReferenceMediaMetadata(value) {
  if (!value || typeof value !== "object") throw new Error("Invalid reference media metadata");
  const row = value;
  const result = {};
  for (const key2 of ["duration_sec", "width", "height", "file_size"]) {
    const number2 = row[key2];
    if (number2 === void 0) continue;
    if (
      typeof number2 !== "number" ||
      !Number.isFinite(number2) ||
      (key2 === "file_size" ? number2 < 0 : number2 <= 0) ||
      (key2 !== "duration_sec" && !Number.isSafeInteger(number2))
    )
      throw new Error("Invalid reference media metadata");
    result[key2] = number2;
  }
  return result;
}
function mapCanvasReferenceMetadata(value) {
  if (!value || typeof value !== "object") throw new Error("Invalid reference metadata");
  const row = value;
  if (!Array.isArray(row.attachments) || row.attachments.length > 256)
    throw new Error("Invalid reference attachments");
  return {
    media: row.media === void 0 ? void 0 : mapReferenceMediaMetadata(row.media),
    attachments: row.attachments.map((raw2) => {
      if (!raw2 || typeof raw2 !== "object") throw new Error("Invalid reference attachment");
      const attachment = raw2;
      if (
        typeof attachment.id !== "string" ||
        !attachment.id ||
        attachment.id.length > 256 ||
        !["image", "video", "audio", "text", "other"].includes(String(attachment.kind))
      )
        throw new Error("Invalid reference attachment");
      return {
        id: attachment.id,
        kind: String(attachment.kind),
        metadata:
          attachment.metadata === void 0 ? void 0 : mapReferenceMediaMetadata(attachment.metadata),
      };
    }),
  };
}
export function existingCanvasReferencePath(reference, paths) {
  const identity2 = canvasReferenceIdentity(reference);
  for (const path2 of paths) {
    const candidate = parseCanvasReference(path2);
    if (candidate && canvasReferenceIdentity(candidate) === identity2) return path2;
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
      ...Object.values(CLOUD_GATEWAY_URLS).flatMap((channels) => Object.values(channels)),
      ...LEGACY_PLATFORM_PROVIDER_URLS,
    ].flatMap((url2) => [url2, url2.replace("https://", "http://")]),
  ),
];
const AD_ATTRIBUTION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1e3;
const AD_ATTRIBUTION_MAX_URL_LENGTH = 2048;
const MAX_INPUT_URL_LENGTH = 8192;
const MAX_PARAM_VALUE_LENGTH = 1024;
const CLOCK_SKEW_MS = 5 * 60 * 1e3;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const ADS_PREFIX = "hl_ads_";
const PUBLIC_LANDING_PATH = /^\/(?:$|(?:h3|tools|blog|campaign|skill)(?:\/[a-z0-9-]+)*\/?$)/;
const AUTH_PARAM_KEYS = new Set([
  "accesstoken",
  "access_token",
  "idtoken",
  "id_token",
  "refresh_token",
  "token",
  "code",
  "state",
  "login_redirect",
  "redirect_uri",
]);
const LANDING_ORIGINS = {
  domestic: [
    "https://design.minimaxi.com",
    "https://design.minimax.cn",
    "https://hub.minimaxi.com",
    "https://hub-pre.xaminim.com",
  ],
  overseas: ["https://design.minimax.io", "https://hub.minimax.io", "https://hub-test.xaminim.com"],
};
const AD_PARAM_KEYS = new Set([
  "monitorId",
  "trackChannelId",
  "gclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "fbclid",
  "ttclid",
  "twclid",
  "yclid",
  "campaign",
  "adgroup",
  "creative",
  "campaign_id",
  "adgroup_id",
  "creative_id",
  "ad_id",
  "keyword",
  "matchtype",
  "placement",
]);
new Set([
  "https://design.minimax.cn",
  ...CLOUD_GATEWAY_URL_PREFIXES.filter((url2) => url2.startsWith("https://")),
  "https://hailuo-pre.xaminim.com",
  "https://hailuoai-video-test.xaminim.com",
  "https://hailuoai.com",
  "https://hailuoai.video",
  "https://openplatform-test.xaminim.com",
  "https://openplatform-test-i18n.xaminim.com",
  "https://www.minimaxi.com",
  "https://platform.minimax.io",
]);
function isAdParam(key2) {
  return AD_PARAM_KEYS.has(key2) || /^utm_[a-z0-9_]{1,48}$/.test(key2);
}
function normalizeAdAttributionUrl(value, region) {
  if (
    typeof value !== "string" ||
    value.length > MAX_INPUT_URL_LENGTH ||
    CONTROL_CHARACTERS.test(value)
  )
    return null;
  try {
    const source = new URL(value);
    const origins = region ? LANDING_ORIGINS[region] : Object.values(LANDING_ORIGINS).flat();
    if (source.username || source.password || !origins.includes(source.origin)) return null;
    const params = new URLSearchParams();
    for (const prefixed of [false, true]) {
      for (const key2 of new Set(source.searchParams.keys())) {
        if (key2.startsWith(ADS_PREFIX) !== prefixed) continue;
        const canonicalKey = prefixed ? key2.slice(ADS_PREFIX.length) : key2;
        if (!isAdParam(canonicalKey)) continue;
        const values3 = source.searchParams.getAll(key2).filter(Boolean);
        if (new Set(values3).size > 1) return null;
        const param = values3[0];
        if (!param) continue;
        if (param.length > MAX_PARAM_VALUE_LENGTH || CONTROL_CHARACTERS.test(param)) return null;
        if (!params.has(canonicalKey)) params.set(canonicalKey, param);
      }
    }
    if (
      params.size === 0 &&
      (!PUBLIC_LANDING_PATH.test(source.pathname) ||
        [...source.searchParams.keys()].some((key2) => AUTH_PARAM_KEYS.has(key2.toLowerCase())))
    )
      return null;
    if (!params.has("utm_media_source") && params.has("utm_source")) {
      params.set("utm_media_source", params.get("utm_source") ?? "");
    }
    const sanitized = new URL(source.href);
    sanitized.hash = "";
    sanitized.search = params.toString();
    const result = sanitized.toString();
    return result.length <= AD_ATTRIBUTION_MAX_URL_LENGTH ? result : null;
  } catch {
    return null;
  }
}
export function normalizeAdAttribution(value, now2 = Date.now(), region) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record2 = value;
  const { capturedAt, expiresAt } = record2;
  if (
    record2.v !== 1 ||
    typeof capturedAt !== "number" ||
    typeof expiresAt !== "number" ||
    !Number.isSafeInteger(capturedAt) ||
    !Number.isSafeInteger(expiresAt) ||
    capturedAt <= 0 ||
    capturedAt > now2 + CLOCK_SKEW_MS ||
    expiresAt <= now2 ||
    expiresAt <= capturedAt ||
    expiresAt - capturedAt > AD_ATTRIBUTION_MAX_AGE_MS
  )
    return null;
  const url2 = normalizeAdAttributionUrl(record2.url, region);
  return url2
    ? {
        v: 1,
        url: url2,
        capturedAt,
        expiresAt,
      }
    : null;
}
