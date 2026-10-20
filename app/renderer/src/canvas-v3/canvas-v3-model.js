/**
 * v3 的**领域模型**（第 141 轮由 canvas-v3-document.js + canvas-v3-client.js 合并而来）。
 *
 * 合并原因：这两个文件来自 4.0.0 主包同一区域，彼此有 50 个同名重复声明，
 * 逐名字归并会形成 import 环；合并后重复变成文件内重复，可直接清理。
 */
import { assignments } from "./shared/assignments.js";
import { forbidden } from "./shared/forbidden.js";
import { ProjectResourceHttpError } from "./shared/ProjectResourceHttpError.js";
import { CANVAS_V3_AGENT_COMPOSITION_PAGE_LIMIT, CANVAS_V3_LIMITS, CANVAS_V3_MEDIA_MIME_TYPES, PROJECT_RESOURCE_HTTP_ROUTES, UUID$1, array$2, detail, enumeration$1, exact, fail, finite$1, id$5, id$7, integer$2, integer$4, invalid$5, nullableId, object$3, object$5, parseCanvasV3ImageImportResult, parseCanvasV3ImageVersionTarget, parseCanvasV3MediaImportResult, parseCanvasV3MediaReferenceOrigin, parseCanvasV3MediaVersionTarget, parseProjectResourceReadResults, resource, shape$1, string$1, version } from "./frame-services.js";
import { id$2, invalid$3, keys, object$1, parseProjectResourceTagReceipt, parseProjectResourceTagSnapshot, revision$2 } from "./project-resource-tags.js";
// ==== P3 严格归并 ====
import { CANVAS_V3_RESOURCE_DRAG_MIME, CANVAS_V3_SUBJECT_PREVIEW_SIZE, CANVAS_V3_SUBJECT_TYPE_HEADER, CANVAS_V3_SUBJECT_TYPE_PADDING } from "./canvas-v3-constants.js";
/**
 * v3 画布：校验器 + 文档协议（第 1/3 块）—— 从产物主包按「声明完整边界」整段取回（第 89 轮）。
 *
 * 这一段是产物里从 `parseCanvasV3SubjectLayout` 开始的**连续 300 条声明**：
 *   - 通用校验器：`fail` / `exact` / `record$9` / `shape$1` / `id$7` / `integer$4` /
 *     `finite$1` / `boolean` / `text$9` / `array$4` / `json$1` / `optional` / `nullable` / `oneOf`
 *   - v3 常量：`CANVAS_V3_LIMITS` / `CANVAS_V3_DEFAULT_NODE_SIZES` / `CANVAS_V3_ROUTES` / …
 *   - v3 解析：`parseCanvasV3*` 一族
 *
 * 只搬实现，未改语义。**本文件尚未接线** —— 块外依赖正在逐轮补齐。
 */
// ==== P3 严格归并 ====
import { CANVAS_V3_CLIPBOARD_MAX_BYTES, CANVAS_V3_CLIPBOARD_MIME, CANVAS_V3_CLIPBOARD_PREFIX, CANVAS_V3_CONTENT_KINDS, CANVAS_V3_DEFAULT_NODE_SIZES, CANVAS_V3_IMAGE_DOWNLOAD_MAX_BYTES, CANVAS_V3_IMAGE_MAX_BYTES, CANVAS_V3_TEXT_GENERATION_ROUTES, CANVAS_V3_TEXT_REFERENCE_LIMITS, CLIP_DOCUMENT_MAX_BYTES, CLIP_STUDIO_CAPABILITY_ID, COMPOSITION_TREE_DRAG_MIME, PROJECT_DOCUMENT_MAX_BYTES, PROJECT_GENERATION_OPERATIONS, PROJECT_QUERY_HTTP_ROUTES, PROJECT_RESOURCE_TAG_HTTP_ROUTES, PROJECT_TASK_HTTP_ROUTES } from "./canvas-v3-constants.js";
// ==== P3 严格归并 ====
import { AssetRole } from "../../../packages/protocol/src/asset-role.ts";
import {
  CANVAS_TAG_NAME_MAX_LENGTH,
  PRESET_COLOR_NAME_KEYS,
  countCanvasTagNameUnits,
} from "../infra/parse-connector-selection.js";
import { isCanvasTagColor } from "../infra/normalize-v2-registry.js";

// 块外两个常量：产物里就在本段紧邻处

const SUBJECT_DEFAULT_SECTION = "default";

function parseCanvasV3SubjectLayout(value) {
  const v2 = shape$1(
    value,
    ["preset", "columns", "sections", "spans", "rows"],
    ["arrangement", "version", "panoramaResources"]
  );
  if (v2.arrangement !== void 0 && v2.arrangement !== "masonry")
    fail("invalid subject arrangement");
  if (v2.preset !== "gallery" && v2.preset !== "board") fail("invalid subject preset");
  if (![1, 2, 3].includes(v2.columns)) fail("invalid subject grid");
  const resources = /* @__PURE__ */ new Set();
  const sections = /* @__PURE__ */ new Set();
  const parsedSections = array$4(v2.sections, 100).map((entry) => {
    const s2 = exact(entry, ["id", "title", "resources"]);
    const key2 = id$7(s2.id);
    if (sections.has(key2)) fail("duplicate subject section");
    sections.add(key2);
    return {
      id: key2,
      title: text$9(s2.title, 200),
      resources: array$4(s2.resources, 1e4).map((value2) => {
        const resource2 = id$7(value2);
        if (resources.has(resource2)) fail("duplicate subject layout resource");
        resources.add(resource2);
        return resource2;
      })
    };
  });
  if (!sections.has(SUBJECT_DEFAULT_SECTION)) fail("missing default subject section");
  const spans = array$4(v2.spans, 1e4).map((entry) => {
    const s2 = exact(entry, ["resourceId", "span"]);
    if (![1, 2, "full"].includes(s2.span)) fail("invalid subject span");
    return { resourceId: id$7(s2.resourceId), span: s2.span };
  });
  if (new Set(spans.map((s2) => s2.resourceId)).size !== spans.length) fail("duplicate subject span");
  const rowResources = /* @__PURE__ */ new Set();
  const rows = array$4(v2.rows, 1e4).map((entry) => {
    const row = exact(entry, ["sectionId", "region", "resources"]);
    const sectionId = id$7(row.sectionId);
    if (!sections.has(sectionId)) fail("unknown row section");
    if (row.region !== "visual" && row.region !== "details") fail("invalid row region");
    return {
      sectionId,
      region: row.region,
      resources: array$4(row.resources, 1e4).map((value2) => {
        const resource2 = id$7(value2);
        if (rowResources.has(resource2)) fail("duplicate row resource");
        const owner = parsedSections.find((s2) => s2.resources.includes(resource2));
        if (owner && owner.id !== sectionId) fail("row section mismatch");
        rowResources.add(resource2);
        return resource2;
      })
    };
  });
  return {
    preset: v2.preset,
    ...v2.panoramaResources !== void 0 ? { panoramaResources: [...new Set(array$4(v2.panoramaResources, 1e4).map(id$7))] } : {},
    ...v2.arrangement === "masonry" ? { arrangement: "masonry" } : {},
    columns: v2.columns,
    sections: parsedSections,
    spans,
    rows
  };
}
const CANVAS_V3_FRAME_COLORS = [
  "red",
  "orange",
  "yellow",
  "green",
  "cyan",
  "blue",
  "purple"
];


function parseCanvasV3PendingGenerationSelection(value) {
  const v2 = exact(value, ["requestId", "outputKey"]);
  return { requestId: id$7(v2.requestId), outputKey: id$7(v2.outputKey) };
}
function parseCanvasV3HistorySelection(value) {
  const v2 = object$5(value);
  if (v2.type !== "generation-request") return parseCanvasV3ItemRef(value);
  const { type: _type, ...rest } = exact(v2, ["type", "requestId", "outputKey"]);
  return { type: "generation-request", ...parseCanvasV3PendingGenerationSelection(rest) };
}
function parseMemberSelections(value) {
  const entries2 = Object.entries(object$5(value));
  if (entries2.length > CANVAS_V3_LIMITS.nodes) fail("too many member selections");
  return Object.fromEntries(
    entries2.map(([key2, selection2]) => [id$7(key2), parseCanvasV3HistorySelection(selection2)])
  );
}
function parseCanvasV3HiddenLineage(value) {
  const v2 = shape$1(value, ["taskId", "sourceNodeId", "referenceVersionId"], ["outputKey"]);
  return {
    taskId: id$7(v2.taskId),
    sourceNodeId: id$7(v2.sourceNodeId),
    referenceVersionId: id$7(v2.referenceVersionId),
    ...Object.hasOwn(v2, "outputKey") ? { outputKey: id$7(v2.outputKey) } : {}
  };
}
function parseCanvasV3HiddenTaskOutput(value) {
  const v2 = exact(value, ["taskId", "outputKey"]);
  return { taskId: id$7(v2.taskId), outputKey: id$7(v2.outputKey) };
}
const CANVAS_V3_LEGACY_FORMAT = "CANVAS_V3_LEGACY_FORMAT";
function parseCanvasV3ItemRef(value) {
  const raw2 = object$5(value);
  if (raw2.type === "version") {
    const v2 = exact(raw2, ["type", "resourceId", "versionId"]);
    return { type: "version", resourceId: id$7(v2.resourceId), versionId: id$7(v2.versionId) };
  }
  if (raw2.type === "task-output") {
    const v2 = exact(raw2, ["type", "taskId", "outputKey"]);
    return { type: "task-output", taskId: id$7(v2.taskId), outputKey: id$7(v2.outputKey) };
  }
  return fail("invalid item ref");
}
function parseCanvasV3VersionRef(value) {
  const ref = parseCanvasV3ItemRef(value);
  if (ref.type !== "version") return fail("only delivered versions are selectable");
  return ref;
}
function canvasV3ItemRefEqual(a2, b3) {
  return a2 === b3 || !!a2 && !!b3 && canvasV3ItemRefKey(a2) === canvasV3ItemRefKey(b3);
}
function canvasV3ItemRefKey(ref) {
  return JSON.stringify(
    ref.type === "version" ? ["version", ref.resourceId, ref.versionId] : ["task-output", ref.taskId, ref.outputKey]
  );
}
function parseCanvasV3GenerationDraft(value) {
  const v2 = shape$1(
    value,
    ["modelId", "prompt", "params", "references", "outputCount"],
    ["destination", "excludedReferenceVersionIds", "lastFrameOnly"]
  );
  const params = object$5(v2.params);
  const result = {
    modelId: v2.modelId === null ? null : id$7(v2.modelId),
    prompt: text$9(v2.prompt, CANVAS_V3_LIMITS.promptLength),
    params: Object.fromEntries(Object.entries(params).map(([key2, item]) => [key2, json$1(item)])),
    references: array$4(v2.references, CANVAS_V3_LIMITS.draftReferences).map((ref) => {
      const r2 = exact(ref, ["resourceId", "versionId"]);
      return { resourceId: id$7(r2.resourceId), versionId: id$7(r2.versionId) };
    }),
    outputCount: integer$4(v2.outputCount)
  };
  if (result.outputCount < 1 || result.outputCount > 8) fail("invalid outputCount");
  if (Object.hasOwn(v2, "destination")) {
    if (v2.destination !== "new" && v2.destination !== "in_place") fail("invalid destination");
    result.destination = v2.destination;
  }
  if (Object.hasOwn(v2, "excludedReferenceVersionIds"))
    result.excludedReferenceVersionIds = array$4(
      v2.excludedReferenceVersionIds,
      CANVAS_V3_LIMITS.draftReferences
    ).map(id$7);
  if (Object.hasOwn(v2, "lastFrameOnly")) {
    if (v2.lastFrameOnly !== true) fail("invalid lastFrameOnly");
    result.lastFrameOnly = true;
  }
  return result;
}
const LEGACY_NODE_FIELDS = [
  "resourceId",
  "versionId",
  "mediaKind",
  "imageResults",
  "generationIntentId"
];
function parseCanvasV3Node(value) {
  const raw2 = object$5(value);
  if (raw2.kind === "resource" || LEGACY_NODE_FIELDS.some((key2) => Object.hasOwn(raw2, key2)))
    fail(`${CANVAS_V3_LEGACY_FORMAT}: resource node snapshots are no longer supported`);
  const base2 = ["id", "parentId", "position", "size", "zIndex", "hidden", "kind"];
  const parseBase = (v2) => ({
    id: id$7(v2.id),
    parentId: v2.parentId === null ? null : id$7(v2.parentId),
    position: point$2(v2.position),
    size: size(v2.size),
    zIndex: integer$4(v2.zIndex),
    hidden: boolean(v2.hidden)
  });
  const presentation = (v2, allowed) => {
    if (!Object.hasOwn(v2, "presentation") || v2.presentation === "subject") return {};
    if (!allowed || v2.presentation !== "panorama") fail("invalid presentation");
    return { presentation: "panorama" };
  };
  const hiddenLineage = (v2) => Object.hasOwn(v2, "hiddenLineage") ? {
    hiddenLineage: array$4(v2.hiddenLineage, CANVAS_V3_LIMITS.edges).map(
      parseCanvasV3HiddenLineage
    )
  } : {};
  const pendingGeneration = (v2) => v2.pendingGeneration === void 0 ? {} : { pendingGeneration: parseCanvasV3PendingGenerationSelection(v2.pendingGeneration) };
  const previewUrl = (v2, kind2) => {
    if (!Object.hasOwn(v2, "previewUrl")) return {};
    const url2 = text$9(v2.previewUrl, 4096);
    if (!url2.trim() || /^(?:data|blob|javascript):/i.test(url2.trim()))
      fail(`invalid ${kind2} preview reference`);
    return { previewUrl: url2 };
  };
  if (raw2.kind === "clip-studio") {
    const v2 = shape$1(raw2, [...base2, "title"], ["sourceResourceId", "previewUrl"]);
    return {
      ...parseBase(v2),
      kind: "clip-studio",
      title: text$9(v2.title, CANVAS_V3_LIMITS.titleLength),
      ...v2.sourceResourceId === void 0 ? {} : { sourceResourceId: id$7(v2.sourceResourceId) },
      ...previewUrl(v2, "clip-studio")
    };
  }
  if (raw2.kind === "director-stage") {
    const v2 = shape$1(raw2, [...base2, "title"], ["viewState", "previewUrl", "sourceResourceId"]);
    const result = {
      ...parseBase(v2),
      kind: "director-stage",
      title: text$9(v2.title, CANVAS_V3_LIMITS.titleLength)
    };
    if (v2.sourceResourceId !== void 0) result.sourceResourceId = id$7(v2.sourceResourceId);
    if (Object.hasOwn(v2, "viewState")) {
      const view2 = shape$1(v2.viewState, ["viewMode", "cameraId"], ["aspect"]);
      if (!["director", "front", "top", "camera"].includes(view2.viewMode))
        fail("invalid director-stage view mode");
      result.viewState = {
        viewMode: view2.viewMode,
        cameraId: view2.cameraId === null ? null : id$7(view2.cameraId)
      };
      if (Object.hasOwn(view2, "aspect")) result.viewState.aspect = text$9(view2.aspect, 64);
    }
    return { ...result, ...previewUrl(v2, "director-stage") };
  }
  if (raw2.kind === "sticker") {
    const v2 = shape$1(raw2, [...base2, "stickerId", "rotation"], ["attachment"]);
    let attachment;
    if (Object.hasOwn(v2, "attachment")) {
      const a2 = exact(v2.attachment, ["targetId", "offset"]);
      attachment = { targetId: id$7(a2.targetId), offset: point$2(a2.offset) };
    }
    return {
      ...parseBase(v2),
      kind: "sticker",
      stickerId: id$7(v2.stickerId),
      rotation: finite$1(v2.rotation),
      ...attachment ? { attachment } : {}
    };
  }
  if (raw2.kind === "frame") {
    const v2 = shape$1(raw2, [...base2, "title", "collapsed"], ["backgroundColor"]);
    if (Object.hasOwn(v2, "backgroundColor") && !CANVAS_V3_FRAME_COLORS.includes(v2.backgroundColor))
      fail("invalid frame color");
    return {
      ...parseBase(v2),
      kind: "frame",
      title: text$9(v2.title, CANVAS_V3_LIMITS.titleLength),
      collapsed: boolean(v2.collapsed),
      ...Object.hasOwn(v2, "backgroundColor") ? { backgroundColor: v2.backgroundColor } : {}
    };
  }
  if (raw2.kind === "placeholder") {
    const v2 = shape$1(
      raw2,
      [...base2, "expectedKind", "draft"],
      ["presentation", "hiddenLineage", "pendingGeneration"]
    );
    const expectedKind = v2.expectedKind === "subject" || v2.presentation === "subject" ? "subject" : contentKind(v2.expectedKind);
    return {
      ...parseBase(v2),
      kind: "placeholder",
      expectedKind,
      ...hiddenLineage(v2),
      ...pendingGeneration(v2),
      ...presentation(v2, expectedKind === "image"),
      draft: v2.draft === null ? null : parseCanvasV3GenerationDraft(v2.draft)
    };
  }
  if (raw2.kind === "composition") {
    const v2 = shape$1(
      raw2,
      [...base2, "compositionId", "activeItem", "draft"],
      [
        "presentation",
        "containerKind",
        "subjectLayout",
        "hiddenLineage",
        "hiddenTaskOutputs",
        "pendingGeneration",
        "memberSelections"
      ]
    );
    if (v2.containerKind !== void 0 && v2.containerKind !== "subject")
      fail("invalid container kind");
    return {
      ...parseBase(v2),
      kind: "composition",
      ...v2.containerKind === "subject" || v2.presentation === "subject" ? { containerKind: "subject" } : {},
      ...v2.subjectLayout === void 0 ? {} : { subjectLayout: parseCanvasV3SubjectLayout(v2.subjectLayout) },
      compositionId: id$7(v2.compositionId),
      ...hiddenLineage(v2),
      ...Object.hasOwn(v2, "hiddenTaskOutputs") ? {
        hiddenTaskOutputs: array$4(v2.hiddenTaskOutputs, CANVAS_V3_LIMITS.edges).map(
          parseCanvasV3HiddenTaskOutput
        )
      } : {},
      activeItem: v2.activeItem === null ? null : parseCanvasV3ItemRef(v2.activeItem),
      ...pendingGeneration(v2),
      ...v2.memberSelections === void 0 ? {} : { memberSelections: parseMemberSelections(v2.memberSelections) },
      draft: v2.draft === null ? null : parseCanvasV3GenerationDraft(v2.draft),
      ...presentation(v2, true)
    };
  }
  return fail("unsupported node kind");
}
function parseCanvasV3Edge(value) {
  const v2 = shape$1(value, ["id", "source", "target"], ["sourceResourceId"]);
  const result = {
    id: id$7(v2.id),
    source: id$7(v2.source),
    target: id$7(v2.target),
    ...v2.sourceResourceId === void 0 ? {} : { sourceResourceId: id$7(v2.sourceResourceId) }
  };
  if (result.source === result.target) fail("self edge");
  return result;
}
function record$9(value, parse2, limit) {
  const raw2 = object$5(value);
  if (Object.keys(raw2).length > limit) fail("record limit exceeded");
  const result = {};
  for (const [key2, entry] of Object.entries(raw2)) {
    const parsed = parse2(entry);
    if (id$7(key2) !== parsed.id) fail("record key differs from id");
    result[key2] = parsed;
  }
  return result;
}
function createEmptyCanvasV3Document() {
  return { schemaVersion: 1, revision: 0, nodes: {}, edges: {} };
}
function parseCanvasV3Document(value) {
  const v2 = exact(value, ["schemaVersion", "revision", "nodes", "edges"]);
  if (v2.schemaVersion !== 1) fail("unsupported schemaVersion");
  const nodes = record$9(v2.nodes, parseCanvasV3Node, CANVAS_V3_LIMITS.nodes);
  const edges = record$9(v2.edges, parseCanvasV3Edge, CANVAS_V3_LIMITS.edges);
  for (const node2 of Object.values(nodes)) {
    if (node2.parentId !== null && (!Object.hasOwn(nodes, node2.parentId) || nodes[node2.parentId].kind !== "frame"))
      fail("parent must be a frame");
  }
  for (const node2 of Object.values(nodes)) {
    if (node2.kind === "sticker" && node2.attachment) {
      const target = Object.hasOwn(nodes, node2.attachment.targetId) ? nodes[node2.attachment.targetId] : void 0;
      if (!target || target.kind === "sticker") fail("invalid sticker attachment");
    }
  }
  const done = /* @__PURE__ */ new Set();
  for (const node2 of Object.values(nodes)) {
    const path2 = /* @__PURE__ */ new Set();
    let current2 = node2.id;
    while (current2 !== null && !done.has(current2)) {
      if (path2.has(current2)) fail("parent cycle");
      path2.add(current2);
      current2 = nodes[current2].parentId;
    }
    for (const entry of path2) done.add(entry);
  }
  for (const edge of Object.values(edges)) {
    if (Object.hasOwn(nodes, edge.id)) fail("duplicate element id");
    if (!Object.hasOwn(nodes, edge.source) || !Object.hasOwn(nodes, edge.target))
      fail("missing edge endpoint");
    if (nodes[edge.source].kind === "sticker" || nodes[edge.target].kind === "sticker")
      fail("sticker cannot be an edge endpoint");
  }
  return { schemaVersion: 1, revision: integer$4(v2.revision, true), nodes, edges };
}
function canvasV3Equal(a2, b3) {
  if (a2 === b3) return true;
  if (a2 === null || b3 === null || typeof a2 !== "object" || typeof b3 !== "object") return false;
  const ak = Object.keys(a2), bk = Object.keys(b3);
  return ak.length === bk.length && ak.every(
    (key2) => Object.hasOwn(b3, key2) && canvasV3Equal(a2[key2], b3[key2])
  );
}
function changes(value, parse2) {
  const seen = /* @__PURE__ */ new Set();
  return array$4(value, CANVAS_V3_LIMITS.changes).map((entry) => {
    const v2 = exact(entry, ["id", "before", "after"]);
    const key2 = id$7(v2.id);
    if (seen.has(key2)) fail("duplicate change");
    seen.add(key2);
    const before = v2.before === null ? null : parse2(v2.before);
    const after = v2.after === null ? null : parse2(v2.after);
    if (before !== null && before.id !== key2 || after !== null && after.id !== key2)
      fail("change id mismatch");
    if (canvasV3Equal(before, after)) fail("noop change");
    return { id: key2, before, after };
  });
}
function parseCanvasV3Patch(value, allowEmpty = false) {
  const v2 = exact(value, ["type", "nodes", "edges"]);
  if (v2.type !== "canvas.patch") fail("unsupported command");
  const nodes = changes(v2.nodes, parseCanvasV3Node), edges = changes(v2.edges, parseCanvasV3Edge);
  if (!allowEmpty && nodes.length + edges.length === 0 || nodes.length + edges.length > CANVAS_V3_LIMITS.changes)
    fail("empty or excessive patch");
  const ids2 = new Set(nodes.map((c3) => c3.id));
  if (edges.some((c3) => ids2.has(c3.id))) fail("duplicate change id");
  return { type: "canvas.patch", nodes, edges };
}
function applyCanvasV3Patch(document2, patch2, allowEmpty = false) {
  const next2 = parseCanvasV3Document(document2);
  const command2 = parseCanvasV3Patch(patch2, allowEmpty);
  const apply2 = (items, edits) => {
    for (const edit of edits) {
      const current2 = Object.hasOwn(items, edit.id) ? items[edit.id] : null;
      if (!canvasV3Equal(current2, edit.before)) fail(`before mismatch: ${edit.id}`);
      if (edit.after === null) delete items[edit.id];
      else items[edit.id] = edit.after;
    }
  };
  apply2(next2.nodes, command2.nodes);
  apply2(next2.edges, command2.edges);
  next2.revision++;
  return parseCanvasV3Document(next2);
}
function isCanvasV3Subject(node2) {
  return node2?.kind === "placeholder" ? node2.expectedKind === "subject" : node2?.kind === "composition" && node2.containerKind === "subject";
}
function boolean(value) {
  if (typeof value !== "boolean") fail("expected boolean");
  return value;
}
function text$9(value, limit) {
  if (typeof value !== "string" || value.length > limit) fail("invalid text");
  return value;
}
function array$4(value, limit) {
  if (!Array.isArray(value) || value.length > limit) fail("invalid array");
  if (Object.getPrototypeOf(value) !== Array.prototype || Reflect.ownKeys(value).length !== value.length + 1)
    fail("sparse or extended array");
  for (let i2 = 0; i2 < value.length; i2++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i2));
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
      fail("sparse or accessor array");
  }
  return value;
}
function json$1(value, depth2 = 0) {
  if (depth2 > 32) fail("json too deep");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("invalid json number");
    return value;
  }
  if (Array.isArray(value)) return array$4(value, 1e4).map((item) => json$1(item, depth2 + 1));
  const raw2 = object$5(value);
  const result = {};
  for (const [key2, item] of Object.entries(raw2)) result[key2] = json$1(item, depth2 + 1);
  return result;
}
function point$2(value) {
  const p3 = exact(value, ["x", "y"]);
  return { x: finite$1(p3.x), y: finite$1(p3.y) };
}
function size(value) {
  const s2 = exact(value, ["width", "height"]);
  return { width: finite$1(s2.width, true), height: finite$1(s2.height, true) };
}
function contentKind(value) {
  if (!CANVAS_V3_CONTENT_KINDS.includes(value))
    fail("invalid content kind");
  return value;
}
function parseCanvasV3AgentCompositionPage(value) {
  const v2 = exact(value, ["items", "nextSeq", "complete"]);
  return {
    items: array$4(v2.items, CANVAS_V3_AGENT_COMPOSITION_PAGE_LIMIT).map((entry) => {
      const item = exact(entry, ["seq", "compositionId", "kind"]);
      return {
        seq: integer$4(item.seq, true),
        compositionId: id$7(item.compositionId),
        kind: contentKind(item.kind)
      };
    }),
    nextSeq: integer$4(v2.nextSeq, true),
    complete: boolean(v2.complete)
  };
}
var CompositionLifecycle = /* @__PURE__ */ ((CompositionLifecycle2) => {
  CompositionLifecycle2["ACTIVE"] = "active";
  CompositionLifecycle2["DELETED"] = "deleted";
  return CompositionLifecycle2;
})(CompositionLifecycle || {});
const COMPOSITION_POSITION_MAX = 1e9;
var CompositionCommandType = /* @__PURE__ */ ((CompositionCommandType2) => {
  CompositionCommandType2["CREATE"] = "composition.create";
  CompositionCommandType2["APPLY"] = "composition.apply";
  CompositionCommandType2["RENAME"] = "composition.rename";
  CompositionCommandType2["SET_TYPE"] = "composition.set_type";
  CompositionCommandType2["SET_ATTRIBUTES"] = "composition.set_attributes";
  CompositionCommandType2["SET_LIFECYCLE"] = "composition.set_lifecycle";
  CompositionCommandType2["RESTORE"] = "composition.restore";
  CompositionCommandType2["TYPE_REGISTER"] = "composition_type.register";
  CompositionCommandType2["TYPE_RENAME"] = "composition_type.rename";
  CompositionCommandType2["MOVE"] = "composition.move";
  CompositionCommandType2["DUPLICATE"] = "composition.duplicate";
  return CompositionCommandType2;
})(CompositionCommandType || {});
var CompositionOperationType = /* @__PURE__ */ ((CompositionOperationType2) => {
  CompositionOperationType2["MEMBER_ADD"] = "member.add";
  CompositionOperationType2["MEMBER_REMOVE"] = "member.remove";
  CompositionOperationType2["MEMBER_UPDATE"] = "member.update";
  CompositionOperationType2["MEMBER_MOVE"] = "member.move";
  return CompositionOperationType2;
})(CompositionOperationType || {});
var CompositionConflictKind = /* @__PURE__ */ ((CompositionConflictKind2) => {
  CompositionConflictKind2["REVISION"] = "composition_revision";
  return CompositionConflictKind2;
})(CompositionConflictKind || {});
var CompositionConflictResolution = /* @__PURE__ */ ((CompositionConflictResolution2) => {
  CompositionConflictResolution2["RETRY"] = "retry";
  CompositionConflictResolution2["USER_DECISION"] = "user_decision";
  return CompositionConflictResolution2;
})(CompositionConflictResolution || {});
var CompositionOrderField = /* @__PURE__ */ ((CompositionOrderField2) => {
  CompositionOrderField2["CREATED_AT"] = "createdAt";
  CompositionOrderField2["UPDATED_AT"] = "updatedAt";
  CompositionOrderField2["POSITION"] = "position";
  return CompositionOrderField2;
})(CompositionOrderField || {});
var CompositionOrderDirection = /* @__PURE__ */ ((CompositionOrderDirection2) => {
  CompositionOrderDirection2["ASC"] = "asc";
  CompositionOrderDirection2["DESC"] = "desc";
  return CompositionOrderDirection2;
})(CompositionOrderDirection || {});
const PROJECT_RESOURCE_READ_BATCH_LIMIT = 100;
function invalid$6(field) {
  throw new Error(`Invalid Project Query response: ${field}`);
}
function object$4(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid$6(field);
  return value;
}
function string$2(value, field) {
  if (typeof value !== "string") invalid$6(field);
  return value;
}
function id$6(value, field) {
  const result = string$2(value, field);
  if (!result.trim() || result.includes("\0")) invalid$6(field);
  return result;
}
function integer$3(value, field, min2 = 0) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min2) invalid$6(field);
  return value;
}
function timestamp(value, field) {
  const result = integer$3(value, field);
  if (result > 864e13) invalid$6(field);
  return result;
}
function oneOf$1(value, values2, field) {
  if (typeof value !== "string" || !values2.includes(value)) invalid$6(field);
  return value;
}
function array$3(value, field) {
  if (!Array.isArray(value)) invalid$6(field);
  return value;
}
function unique(items, key2, field) {
  if (new Set(items.map(key2)).size !== items.length) invalid$6(field);
  return items;
}
function finite(value, field, min2 = 0) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min2) invalid$6(field);
  return value;
}
function attributes$2(value) {
  return Object.fromEntries(
    Object.entries(object$4(value, "attributes")).map(([key2, item]) => [
      id$6(key2, "attributes.key"),
      string$2(item, "attributes.value")
    ])
  );
}
function coverage$1(value) {
  const data2 = object$4(value, "coverage");
  const reasons = array$3(data2.reasons, "coverage.reasons").map(
    (reason2) => oneOf$1(
      reason2,
      ["indexing", "source_missing", "retention", "dependency_unavailable"],
      "coverage.reason"
    )
  );
  return {
    status: oneOf$1(data2.status, ["complete", "partial"], "coverage.status"),
    reasons: unique(reasons, (reason2) => reason2, "coverage.reasons"),
    ...data2.coveredThroughMessageId === void 0 ? {} : {
      coveredThroughMessageId: data2.coveredThroughMessageId === null ? null : id$6(data2.coveredThroughMessageId, "coverage.coveredThroughMessageId")
    }
  };
}
function page$2(value, mapper) {
  const data2 = object$4(value, "page");
  return {
    items: array$3(data2.items, "items").map(mapper),
    nextCursor: data2.nextCursor === null ? null : id$6(data2.nextCursor, "nextCursor"),
    coverage: coverage$1(data2.coverage)
  };
}
function compositionSummary(value) {
  const data2 = object$4(value, "composition");
  return {
    id: id$6(data2.id, "composition.id"),
    name: string$2(data2.name, "composition.name"),
    type: data2.type === null ? null : id$6(data2.type, "composition.type"),
    lifecycle: oneOf$1(data2.lifecycle, Object.values(CompositionLifecycle), "composition.lifecycle"),
    ...data2.position === void 0 ? {} : { position: integer$3(data2.position, "composition.position") },
    updatedAt: timestamp(data2.updatedAt, "composition.updatedAt")
  };
}
function compositionSnapshot(value) {
  const data2 = object$4(value, "composition");
  return {
    ...compositionSummary(data2),
    attributes: attributes$2(data2.attributes),
    revision: integer$3(data2.revision, "composition.revision", 1)
  };
}
function assetSummary(value) {
  const data2 = object$4(value, "resource");
  let match2;
  if (data2.match !== void 0) {
    const item = object$4(data2.match, "resource.match");
    match2 = {
      field: oneOf$1(item.field, ["name", "description"], "resource.match.field"),
      excerpt: string$2(item.excerpt, "resource.match.excerpt")
    };
  }
  return {
    id: id$6(data2.id, "resource.id"),
    name: string$2(data2.name, "resource.name"),
    ...data2.description === void 0 ? {} : { description: string$2(data2.description, "resource.description") },
    kind: oneOf$1(data2.kind, ["text", "image", "video", "audio", "file"], "resource.kind"),
    lifecycle: oneOf$1(data2.lifecycle, Object.values(ProjectResourceLifecycle), "resource.lifecycle"),
    currentVersionId: data2.currentVersionId === null ? null : id$6(data2.currentVersionId, "resource.currentVersionId"),
    createdAt: timestamp(data2.createdAt, "resource.createdAt"),
    updatedAt: timestamp(data2.updatedAt, "resource.updatedAt"),
    ...match2 ? { match: match2 } : {}
  };
}
function member(value, input) {
  const data2 = object$4(value, "member");
  if ("compositionIds" in data2 || "compositions" in data2) invalid$6("member nested compositions");
  const memberId = id$6(data2.id, "member.id");
  const role2 = string$2(data2.role, "member.role");
  if (input.memberId !== void 0 && input.memberId !== memberId) invalid$6("member.id mismatch");
  if (input.role !== void 0 && input.role !== role2) invalid$6("member.role mismatch");
  const resource2 = data2.resource === null ? null : (() => {
    const entry = object$4(data2.resource, "member.resource");
    const resourceId2 = id$6(entry.resourceId, "member.resourceId");
    const summary2 = entry.resource === void 0 ? void 0 : assetSummary(entry.resource);
    const availability = entry.availability === void 0 ? void 0 : oneOf$1(
      entry.availability,
      ["available", "missing", "unavailable"],
      "member.availability"
    );
    if (summary2 && summary2.id !== resourceId2) invalid$6("member.resource.id mismatch");
    if (input.resolveResources) {
      if (!availability || availability === "available" && !summary2)
        invalid$6("member.resource resolution");
      if (availability === "missing" && summary2) invalid$6("member.resource missing");
    } else if (summary2 || availability) invalid$6("member.resource unexpected resolution");
    return {
      resourceId: resourceId2,
      ...summary2 ? { resource: summary2 } : {},
      ...availability ? { availability } : {}
    };
  })();
  return { id: memberId, role: role2, resource: resource2 };
}
function parseProjectMediaMetadata(value) {
  const data2 = object$4(value, "preview.media");
  return {
    mimeType: id$6(data2.mimeType, "preview.media.mimeType"),
    sizeBytes: integer$3(data2.sizeBytes, "preview.media.sizeBytes"),
    ...data2.width === void 0 ? {} : { width: integer$3(data2.width, "preview.media.width", 1) },
    ...data2.height === void 0 ? {} : { height: integer$3(data2.height, "preview.media.height", 1) },
    ...data2.durationSeconds === void 0 ? {} : { durationSeconds: finite(data2.durationSeconds, "preview.media.durationSeconds") },
    ...data2.fps === void 0 ? {} : { fps: finite(data2.fps, "preview.media.fps") }
  };
}
function previewContent(value) {
  const item = object$4(value, "preview.content");
  const type = oneOf$1(item.type, ["text", "image", "audio"], "preview.content.type");
  if (type === "text") return { type, text: string$2(item.text, "preview.content.text") };
  const mimeType = id$6(item.mimeType, "preview.content.mimeType");
  const data2 = string$2(item.data, "preview.content.data");
  if (type === "audio") return { type, mimeType, data: data2 };
  return {
    type,
    mimeType,
    data: data2,
    ...item.atSeconds === void 0 ? {} : { atSeconds: finite(item.atSeconds, "preview.content.atSeconds") }
  };
}
function previewRange(value) {
  if (value === null) return null;
  const data2 = object$4(value, "preview.range");
  return {
    ...data2.startSeconds === void 0 ? {} : { startSeconds: finite(data2.startSeconds, "preview.range.startSeconds") },
    ...data2.endSeconds === void 0 ? {} : { endSeconds: finite(data2.endSeconds, "preview.range.endSeconds") },
    ...data2.startLine === void 0 ? {} : { startLine: integer$3(data2.startLine, "preview.range.startLine", 1) },
    ...data2.lineCount === void 0 ? {} : { lineCount: integer$3(data2.lineCount, "preview.range.lineCount", 1) }
  };
}
function assetPreview(value, input) {
  const data2 = object$4(value, "preview");
  const versionId = id$6(data2.versionId, "preview.versionId");
  if (versionId !== input.versionId) invalid$6("preview.versionId mismatch");
  if (typeof data2.truncated !== "boolean") invalid$6("preview.truncated");
  return {
    versionId,
    kind: oneOf$1(data2.kind, ["text", "image", "video", "audio"], "preview.kind"),
    media: parseProjectMediaMetadata(data2.media),
    range: previewRange(data2.range),
    truncated: data2.truncated,
    reason: data2.reason === null ? null : string$2(data2.reason, "preview.reason"),
    ...data2.content === void 0 ? {} : { content: array$3(data2.content, "preview.content").map(previewContent) }
  };
}
function parseProjectCompositionQueryRead(value, input) {
  if ("compositionIds" in input) invalid$6("batch composition read is not supported");
  const data2 = object$4(value, "composition");
  const result = compositionSnapshot(data2);
  if (result.id !== input.compositionId) invalid$6("composition.id mismatch");
  if ((input.view ?? "summary") === "summary") {
    if ("items" in data2 || "nextCursor" in data2 || "coverage" in data2) invalid$6("summary view");
    return result;
  }
  const members2 = page$2(data2, (value2) => member(value2, input));
  unique(members2.items, (item) => item.id, "member.id duplicate");
  return { ...result, ...members2 };
}
function parseProjectQueryResponse(operation2, value, input) {
  let result;
  switch (operation2) {
    case "composition_search": {
      const output2 = page$2(value, compositionSnapshot);
      unique(output2.items, (item) => item.id, "composition.id duplicate");
      result = output2;
      break;
    }
    case "composition_type_list": {
      const data2 = object$4(value, "types");
      if ("nextCursor" in data2 || "coverage" in data2) invalid$6("types pagination");
      const items = array$3(data2.items, "types.items").map((value2) => {
        const item = object$4(value2, "type");
        return {
          id: id$6(item.id, "type.id"),
          label: string$2(item.label, "type.label"),
          ...item.description === void 0 ? {} : { description: string$2(item.description, "type.description") }
        };
      });
      result = { items: unique(items, (item) => item.id, "type.id duplicate") };
      break;
    }
    case "composition_get":
      result = parseProjectCompositionQueryRead(value, input);
      break;
    case "resource_preview":
      result = assetPreview(value, input);
      break;
    case "resource_relations": {
      const query = input;
      if (query.relation !== "compositions") invalid$6("unsupported relation");
      const output2 = page$2(value, (value2) => {
        const item = object$4(value2, "relation");
        if ("resourceId" in item || "versionId" in item) invalid$6("relation shape");
        return {
          compositionId: id$6(item.compositionId, "relation.compositionId"),
          revision: integer$3(item.revision, "relation.revision", 1),
          memberId: id$6(item.memberId, "relation.memberId"),
          role: string$2(item.role, "relation.role")
        };
      });
      unique(
        output2.items,
        (item) => JSON.stringify([item.compositionId, item.memberId]),
        "relation duplicate"
      );
      result = output2;
      break;
    }
    default:
      return invalid$6("unsupported operation");
  }
  return result;
}
function parseProjectQueryErrorBody(value) {
  const data2 = object$4(object$4(value, "body").error, "error");
  if (typeof data2.retryable !== "boolean") invalid$6("error.retryable");
  return {
    error: {
      code: id$6(data2.code, "error.code"),
      message: string$2(data2.message, "error.message"),
      retryable: data2.retryable,
      ...data2.traceId === void 0 ? {} : { traceId: id$6(data2.traceId, "error.traceId") },
      ...data2.details === void 0 ? {} : {
        details: array$3(data2.details, "error.details").map((value2) => {
          const item = object$4(value2, "error.detail");
          return {
            field: string$2(item.field, "error.detail.field"),
            reason: string$2(item.reason, "error.detail.reason")
          };
        })
      }
    }
  };
}
const CANVAS_V3_RESOURCE_KINDS = Object.freeze([
  "image",
  "video",
  "audio",
  "file",
  "text",
  "table"
]);
const CANVAS_V3_SUBTITLE_FORMATS = ["srt", "ass", "vtt"];
function parseCanvasV3CompositionContent(value) {
  const raw2 = object$5(value);
  if (raw2.state === "missing" || raw2.state === "deleted") {
    const v22 = exact(raw2, ["compositionId", "state"]);
    return { compositionId: id$7(v22.compositionId), state: raw2.state };
  }
  const v2 = shape$1(
    raw2,
    [
      "compositionId",
      "state",
      "revision",
      "title",
      "typeId",
      "members",
      "taskOutputs",
      "protected",
      "resources"
    ],
    ["typeLabel", "attributes", "position", "createdAt"]
  );
  if (v2.state !== "ready") fail("invalid content state");
  const members2 = array$4(v2.members, 1e4).map((member2) => {
    const m2 = exact(member2, ["memberId", "role", "resource"]);
    return {
      memberId: id$7(m2.memberId),
      role: text$9(m2.role, CANVAS_V3_LIMITS.titleLength),
      resource: m2.resource === null ? null : id$7(m2.resource)
    };
  });
  const taskOutputs = array$4(v2.taskOutputs, 1e4).map((entry) => {
    const t2 = shape$1(
      entry,
      ["taskId", "outputKey", "ordinal", "resourceId", "versionId", "state"],
      ["aspectRatio"]
    );
    if (t2.state !== "generating" && t2.state !== "failed" && t2.state !== "ready")
      fail("invalid output state");
    return {
      ...t2.aspectRatio === void 0 ? {} : { aspectRatio: text$9(t2.aspectRatio, 32) },
      taskId: id$7(t2.taskId),
      outputKey: id$7(t2.outputKey),
      ordinal: integer$4(t2.ordinal),
      resourceId: t2.resourceId === null ? null : id$7(t2.resourceId),
      versionId: t2.versionId === null ? null : id$7(t2.versionId),
      state: t2.state
    };
  });
  const resources = {};
  for (const [key2, entry] of Object.entries(object$5(v2.resources))) {
    const r2 = shape$1(
      entry,
      ["resourceId", "name", "kind", "currentVersionId", "availability", "versions"],
      ["originalFile", "subtitleFormat"]
    );
    if (r2.subtitleFormat !== void 0 && !CANVAS_V3_SUBTITLE_FORMATS.includes(r2.subtitleFormat))
      fail("invalid subtitle format");
    if (!CANVAS_V3_RESOURCE_KINDS.includes(r2.kind))
      fail("invalid resource kind");
    if (!["available", "unavailable", "missing"].includes(r2.availability))
      fail("invalid availability");
    const resourceId2 = id$7(r2.resourceId);
    if (id$7(key2) !== resourceId2) fail("resource key mismatch");
    resources[resourceId2] = {
      resourceId: resourceId2,
      versions: array$4(r2.versions, 1e5).map((entry2) => {
        const version2 = shape$1(
          entry2,
          ["versionId", "ordinal", "availability"],
          ["deleted", "contentRevision", "historyHidden"]
        );
        if (!["available", "unavailable", "missing"].includes(version2.availability))
          fail("invalid version availability");
        if (version2.contentRevision !== void 0 && integer$4(version2.contentRevision, true) < 1)
          fail("invalid content revision");
        return {
          versionId: id$7(version2.versionId),
          ordinal: integer$4(version2.ordinal),
          ...version2.contentRevision === void 0 ? {} : { contentRevision: integer$4(version2.contentRevision, true) },
          ...version2.deleted === void 0 ? {} : { deleted: boolean(version2.deleted) },
          ...version2.historyHidden === void 0 ? {} : { historyHidden: boolean(version2.historyHidden) },
          availability: version2.availability
        };
      }),
      name: text$9(r2.name, CANVAS_V3_LIMITS.titleLength),
      kind: r2.kind,
      currentVersionId: r2.currentVersionId === null ? null : id$7(r2.currentVersionId),
      availability: r2.availability,
      ...r2.originalFile === void 0 ? {} : { originalFile: boolean(r2.originalFile) },
      ...r2.subtitleFormat === void 0 ? {} : { subtitleFormat: r2.subtitleFormat }
    };
  }
  return {
    compositionId: id$7(v2.compositionId),
    state: "ready",
    revision: integer$4(v2.revision, true),
    title: text$9(v2.title, CANVAS_V3_LIMITS.titleLength),
    typeId: v2.typeId === null ? null : id$7(v2.typeId),
    ...v2.attributes === void 0 ? {} : {
      attributes: array$4(v2.attributes, 1e3).map((entry) => {
        const attribute = exact(entry, ["key", "value"]);
        return {
          key: text$9(attribute.key, CANVAS_V3_LIMITS.titleLength),
          value: text$9(attribute.value, 1e4)
        };
      })
    },
    ...v2.typeLabel === void 0 ? {} : { typeLabel: text$9(v2.typeLabel, CANVAS_V3_LIMITS.titleLength) },
    ...v2.position === void 0 ? {} : { position: v2.position === null ? null : integer$4(v2.position) },
    ...v2.createdAt === void 0 ? {} : { createdAt: text$9(v2.createdAt, 64) },
    members: members2,
    taskOutputs,
    protected: boolean(v2.protected),
    resources
  };
}
function parseCanvasV3ContentBatch(value) {
  const v2 = exact(value, ["items"]);
  return {
    items: array$4(v2.items, CANVAS_V3_LIMITS.contentBatch).map(parseCanvasV3CompositionContent)
  };
}
function canvasV3ContentItems(content2) {
  const items = [];
  const seen = /* @__PURE__ */ new Set();
  for (const member2 of content2.members) {
    const resourceId2 = member2.resource;
    if (resourceId2 === null || seen.has(resourceId2)) continue;
    seen.add(resourceId2);
    const resource2 = content2.resources[resourceId2];
    if (!resource2) continue;
    for (const version2 of resource2.versions.filter((version22) => !version22.deleted))
      items.push({
        ref: { type: "version", resourceId: resourceId2, versionId: version2.versionId },
        resourceId: resourceId2,
        versionId: version2.versionId,
        ...version2.contentRevision === void 0 ? {} : { contentRevision: version2.contentRevision },
        ordinal: version2.ordinal,
        isCurrent: resource2.currentVersionId === version2.versionId,
        state: version2.availability === "available" ? "ready" : "unavailable",
        kind: resource2.kind,
        name: resource2.name,
        originalFile: resource2.originalFile,
        ...version2.historyHidden ? { historyHidden: true } : {},
        task: null
      });
  }
  for (const output2 of content2.taskOutputs) {
    if (output2.versionId) continue;
    items.push({
      ref: { type: "task-output", taskId: output2.taskId, outputKey: output2.outputKey },
      state: output2.state,
      resourceId: output2.resourceId,
      versionId: null,
      kind: null,
      name: null,
      ordinal: output2.ordinal,
      isCurrent: false,
      task: { taskId: output2.taskId, outputKey: output2.outputKey }
    });
  }
  return items.sort((a2, b3) => a2.ordinal - b3.ordinal);
}
function canvasV3SelectableItem(item) {
  return item?.state === "ready" || item?.state === "generating";
}
function canvasV3DefaultItem(items) {
  return items.find((item) => item.isCurrent) ?? items.find((item) => item.state === "ready") ?? null;
}



function placement$1(value) {
  const v2 = shape$1(
    value,
    ["parentId", "position", "size", "zIndex"],
    ["presentation", "containerKind"]
  );
  if (Object.hasOwn(v2, "presentation") && v2.presentation !== "panorama")
    fail("invalid presentation");
  if (v2.containerKind !== void 0 && v2.containerKind !== "subject")
    fail("invalid container kind");
  return {
    ...v2.containerKind ? { containerKind: "subject" } : {},
    parentId: v2.parentId === null ? null : id$7(v2.parentId),
    position: point$2(v2.position),
    size: size(v2.size),
    zIndex: integer$4(v2.zIndex),
    ...v2.presentation ? { presentation: v2.presentation } : {}
  };
}
function edgeRefs(value) {
  const seen = /* @__PURE__ */ new Set();
  return array$4(value, 100).map((edge) => {
    const e2 = exact(edge, ["id", "source"]);
    const edgeId = id$7(e2.id);
    if (seen.has(edgeId)) fail("duplicate edge");
    seen.add(edgeId);
    return { id: edgeId, source: id$7(e2.source) };
  });
}
function parseCanvasV3ClipboardSnapshot(value) {
  const v2 = exact(value, ["type", "workspaceId", "document", "content"]);
  if (v2.type !== "canvas-v3.clipboard") fail("invalid clipboard type");
  const workspaceId = id$7(v2.workspaceId);
  const document2 = parseCanvasV3Document(v2.document);
  if (document2.revision !== 0 || !Object.keys(document2.nodes).length)
    fail("invalid clipboard document");
  if (Object.values(document2.nodes).some((n2) => n2.parentId === null && n2.hidden))
    fail("invalid hidden clipboard root");
  const content2 = {};
  for (const [key2, entry] of Object.entries(object$5(v2.content))) {
    const node2 = document2.nodes[id$7(key2)];
    if (node2?.kind !== "composition") fail("clipboard content for a non-composition node");
    const c3 = shape$1(
      entry,
      ["title", "items"],
      ["members", "type", "attributes", "compositionRevision"]
    );
    const items = array$4(c3.items, 1e3).map((item) => {
      const i2 = exact(item, ["ref", "resourceId", "versionId", "name", "kind"]);
      if (!CANVAS_V3_RESOURCE_KINDS.includes(i2.kind))
        fail("invalid clipboard item kind");
      return {
        ref: parseCanvasV3ItemRef(i2.ref),
        resourceId: id$7(i2.resourceId),
        versionId: id$7(i2.versionId),
        name: text$9(i2.name, CANVAS_V3_LIMITS.titleLength),
        kind: i2.kind
      };
    });
    const keys2 = new Set(items.map((item) => canvasV3ItemRefKey(item.ref)));
    if (keys2.size !== items.length) fail("duplicate clipboard item");
    const members2 = c3.members === void 0 ? void 0 : array$4(c3.members, 1e3).map((entry2) => {
      const m2 = exact(entry2, ["memberId", "role", "resource"]);
      const resource2 = m2.resource === null ? null : id$7(m2.resource);
      if (resource2 !== null && !items.some((item) => item.resourceId === resource2))
        fail("missing clipboard member");
      return {
        memberId: id$7(m2.memberId),
        role: text$9(m2.role, CANVAS_V3_LIMITS.titleLength),
        resource: resource2
      };
    });
    content2[key2] = {
      title: text$9(c3.title, CANVAS_V3_LIMITS.titleLength),
      items,
      ...members2 ? { members: members2 } : {},
      ...c3.compositionRevision === void 0 ? {} : { compositionRevision: integer$4(c3.compositionRevision, true) },
      ...c3.type === void 0 ? {} : { type: parseClipboardCompositionType(c3.type) },
      ...c3.attributes === void 0 ? {} : { attributes: parseClipboardAttributes(c3.attributes) }
    };
  }
  for (const node2 of Object.values(document2.nodes)) {
    if (node2.kind === "composition" && !Object.hasOwn(content2, node2.id))
      fail("clipboard composition node without content");
  }
  return { type: "canvas-v3.clipboard", workspaceId, document: document2, content: content2 };
}
function parseClipboardCompositionType(value) {
  if (value === null) return null;
  const v2 = shape$1(value, ["typeId", "label", "createdAt", "updatedAt"], ["description"]);
  return {
    typeId: id$7(v2.typeId),
    label: text$9(v2.label, CANVAS_V3_LIMITS.titleLength),
    createdAt: text$9(v2.createdAt, 100),
    updatedAt: text$9(v2.updatedAt, 100),
    ...v2.description === void 0 ? {} : { description: text$9(v2.description, 1e5) }
  };
}
function parseClipboardAttributes(value) {
  const seen = /* @__PURE__ */ new Set();
  return array$4(value, 1e3).map((entry) => {
    const v2 = exact(entry, ["key", "value"]);
    const key2 = id$7(v2.key);
    if (seen.has(key2)) fail("duplicate clipboard attribute");
    seen.add(key2);
    return { key: key2, value: text$9(v2.value, 1e5) };
  });
}
function parseCanvasV3ContentCommand(value, nested = false) {
  const raw2 = object$5(value);
  switch (raw2.type) {
    case "subject.layout": {
      const v2 = exact(raw2, ["type", "nodeId", "before", "after"]);
      return {
        type: "subject.layout",
        nodeId: id$7(v2.nodeId),
        before: v2.before === null ? null : parseCanvasV3SubjectLayout(v2.before),
        after: v2.after === null ? null : parseCanvasV3SubjectLayout(v2.after)
      };
    }
    case "content.import": {
      const v2 = exact(raw2, ["type", "items"]);
      const seen = /* @__PURE__ */ new Set();
      const items = array$4(v2.items, CANVAS_V3_LIMITS.importItems).map((item) => {
        const i2 = shape$1(
          item,
          ["nodeId", "resourceId", "versionId"],
          ["placement", "size", "edges"]
        );
        const nodeId = id$7(i2.nodeId);
        if (seen.has(nodeId)) fail("duplicate import target");
        seen.add(nodeId);
        return {
          nodeId,
          resourceId: id$7(i2.resourceId),
          versionId: id$7(i2.versionId),
          ...Object.hasOwn(i2, "placement") ? { placement: placement$1(i2.placement) } : {},
          ...Object.hasOwn(i2, "size") ? { size: size(i2.size) } : {},
          ...Object.hasOwn(i2, "edges") ? { edges: edgeRefs(i2.edges) } : {}
        };
      });
      if (!items.length) fail("empty import");
      return { type: "content.import", items };
    }
    case "clip-studio.deliver": {
      const v2 = shape$1(
        raw2,
        ["type", "nodeId", "sourceResourceId", "mediaKind", "resourceId", "versionId"],
        ["placement", "sourceVersionId"]
      );
      if (v2.mediaKind !== "video" && v2.mediaKind !== "audio") fail("invalid clip output kind");
      return {
        type: "clip-studio.deliver",
        nodeId: id$7(v2.nodeId),
        sourceResourceId: id$7(v2.sourceResourceId),
        ...v2.sourceVersionId === void 0 ? {} : { sourceVersionId: id$7(v2.sourceVersionId) },
        mediaKind: v2.mediaKind,
        resourceId: id$7(v2.resourceId),
        versionId: id$7(v2.versionId),
        ...Object.hasOwn(v2, "placement") ? { placement: placement$1(v2.placement) } : {}
      };
    }
    case "composition.delete": {
      const v2 = exact(raw2, ["type", "nodeIds"]);
      const nodeIds = array$4(v2.nodeIds, CANVAS_V3_LIMITS.nodes).map(id$7);
      if (!nodeIds.length) fail("empty composition deletion");
      return { type: "composition.delete", nodeIds: [...new Set(nodeIds)] };
    }
    case "composition.restore": {
      const v2 = exact(raw2, ["type", "items", "patch"]);
      const items = array$4(v2.items, CANVAS_V3_LIMITS.nodes).map((item) => {
        const i2 = exact(item, ["compositionId", "revision"]);
        return { compositionId: id$7(i2.compositionId), revision: integer$4(i2.revision, true) };
      });
      if (!items.length || new Set(items.map((item) => item.compositionId)).size !== items.length)
        fail("invalid composition restoration");
      return { type: "composition.restore", items, patch: parseCanvasV3Patch(v2.patch) };
    }
    case "subject.convert-to-media": {
      const v2 = exact(raw2, ["type", "nodeId"]);
      return { type: "subject.convert-to-media", nodeId: id$7(v2.nodeId) };
    }
    case "subject.convert": {
      const v2 = exact(raw2, ["type", "nodeId"]);
      return { type: "subject.convert", nodeId: id$7(v2.nodeId) };
    }
    case "subject.add-members": {
      const v2 = exact(raw2, ["type", "nodeId", "items"]);
      const items = array$4(v2.items, CANVAS_V3_LIMITS.importItems).map((item) => {
        const i2 = exact(item, ["resourceId", "versionId"]);
        return { resourceId: id$7(i2.resourceId), versionId: id$7(i2.versionId) };
      });
      if (!items.length) fail("empty subject members");
      return { type: "subject.add-members", nodeId: id$7(v2.nodeId), items };
    }
    case "subject.add-resources":
    case "subject.remove-resources": {
      const v2 = exact(raw2, ["type", "nodeId", "memberId", "items"]);
      const items = array$4(v2.items, CANVAS_V3_LIMITS.importItems).map((item) => {
        const i2 = exact(item, ["resourceId", "versionId"]);
        return { resourceId: id$7(i2.resourceId), versionId: id$7(i2.versionId) };
      });
      if (!items.length) fail("empty subject resources");
      return { type: raw2.type, nodeId: id$7(v2.nodeId), memberId: id$7(v2.memberId), items };
    }
    case "subject.remove-members": {
      const v2 = exact(raw2, ["type", "nodeId", "items"]);
      const items = array$4(v2.items, CANVAS_V3_LIMITS.importItems).map((item) => {
        const i2 = shape$1(item, ["memberId", "resourceId", "versionId"], ["role"]);
        return {
          memberId: id$7(i2.memberId),
          resourceId: id$7(i2.resourceId),
          versionId: id$7(i2.versionId),
          ...i2.role !== void 0 ? { role: text$9(i2.role, CANVAS_V3_LIMITS.titleLength) } : {}
        };
      });
      if (!items.length) fail("empty subject members");
      if (new Set(items.map((item) => item.memberId)).size !== items.length)
        fail("duplicate subject member");
      return { type: "subject.remove-members", nodeId: id$7(v2.nodeId), items };
    }
    case "subject.restore-members": {
      const v2 = exact(raw2, ["type", "nodeId", "items"]);
      const items = array$4(v2.items, CANVAS_V3_LIMITS.importItems).map((item) => {
        const i2 = exact(item, ["memberId", "resourceId", "versionId", "role", "index"]);
        return {
          memberId: id$7(i2.memberId),
          resourceId: id$7(i2.resourceId),
          versionId: id$7(i2.versionId),
          role: text$9(i2.role, CANVAS_V3_LIMITS.titleLength),
          index: integer$4(i2.index, true)
        };
      });
      if (!items.length) fail("empty subject members");
      if (new Set(items.map((item) => item.memberId)).size !== items.length)
        fail("duplicate subject member");
      return { type: "subject.restore-members", nodeId: id$7(v2.nodeId), items };
    }
    case "subject.load": {
      const v2 = exact(raw2, ["type", "nodeId", "compositionId"]);
      return { type: "subject.load", nodeId: id$7(v2.nodeId), compositionId: id$7(v2.compositionId) };
    }
    case "subject.prepare": {
      const v2 = exact(raw2, ["type", "nodeId", "title"]);
      const title = text$9(v2.title, CANVAS_V3_LIMITS.titleLength);
      if (!title.trim()) fail("empty title");
      return { type: "subject.prepare", nodeId: id$7(v2.nodeId), title };
    }
    case "subject.rename-member": {
      const v2 = exact(raw2, ["type", "nodeId", "memberId", "title"]);
      const title = text$9(v2.title, CANVAS_V3_LIMITS.titleLength);
      if (title !== "" && !title.trim()) fail("empty title");
      return {
        type: "subject.rename-member",
        nodeId: id$7(v2.nodeId),
        memberId: id$7(v2.memberId),
        title
      };
    }
    case "subject.move-member": {
      const v2 = exact(raw2, ["type", "nodeId", "memberId", "beforeMemberId", "fromBeforeMemberId"]);
      const memberId = id$7(v2.memberId);
      const beforeMemberId = v2.beforeMemberId === null ? null : id$7(v2.beforeMemberId);
      const fromBeforeMemberId = v2.fromBeforeMemberId === null ? null : id$7(v2.fromBeforeMemberId);
      if (beforeMemberId === memberId || fromBeforeMemberId === memberId) fail("self move");
      return {
        type: "subject.move-member",
        nodeId: id$7(v2.nodeId),
        memberId,
        beforeMemberId,
        fromBeforeMemberId
      };
    }
    case "subject.transfer-members": {
      const v2 = exact(raw2, [
        "type",
        "sourceNodeId",
        "targetNodeId",
        "mode",
        "items",
        "beforeMemberId"
      ]);
      if (v2.mode !== "move" && v2.mode !== "copy") fail("invalid transfer mode");
      const sourceNodeId = id$7(v2.sourceNodeId);
      const targetNodeId = id$7(v2.targetNodeId);
      if (sourceNodeId === targetNodeId) fail("same transfer node");
      const items = array$4(v2.items, CANVAS_V3_LIMITS.importItems).map((item) => {
        const i2 = exact(item, [
          "memberId",
          "resourceId",
          "versionId",
          "role",
          "fromBeforeMemberId"
        ]);
        return {
          memberId: id$7(i2.memberId),
          resourceId: id$7(i2.resourceId),
          versionId: id$7(i2.versionId),
          role: text$9(i2.role, CANVAS_V3_LIMITS.titleLength),
          fromBeforeMemberId: i2.fromBeforeMemberId === null ? null : id$7(i2.fromBeforeMemberId)
        };
      });
      if (!items.length) fail("empty subject members");
      if (new Set(items.map((item) => item.memberId)).size !== items.length)
        fail("duplicate subject member");
      if (new Set(items.map((item) => item.resourceId)).size !== items.length)
        fail("duplicate subject resource");
      const beforeMemberId = v2.beforeMemberId === null ? null : id$7(v2.beforeMemberId);
      if (items.some((item) => item.memberId === beforeMemberId)) fail("self move");
      return {
        type: "subject.transfer-members",
        sourceNodeId,
        targetNodeId,
        mode: v2.mode,
        items,
        beforeMemberId
      };
    }
    case "content.rename": {
      const v2 = exact(raw2, ["type", "nodeId", "title"]);
      const title = text$9(v2.title, CANVAS_V3_LIMITS.titleLength);
      if (title !== "" && !title.trim()) fail("empty title");
      return { type: "content.rename", nodeId: id$7(v2.nodeId), title };
    }
    case "composition.move": {
      const v2 = shape$1(raw2, ["type", "nodeId", "fromPosition"], ["placement", "position"]);
      const fromPosition = v2.fromPosition === null ? null : integer$4(v2.fromPosition);
      const hasPlacement = v2.placement !== void 0;
      const hasPosition = v2.position !== void 0;
      if (hasPlacement === hasPosition) fail("move needs exactly one of placement or position");
      let placement2;
      if (hasPlacement) {
        const pl = object$5(v2.placement);
        if ("before" in pl && !("after" in pl)) placement2 = { before: id$7(pl.before) };
        else if ("after" in pl && !("before" in pl)) placement2 = { after: id$7(pl.after) };
        else fail("invalid placement");
      }
      return {
        type: "composition.move",
        nodeId: id$7(v2.nodeId),
        ...placement2 ? { placement: placement2 } : {},
        ...hasPosition ? { position: v2.position === null ? null : integer$4(v2.position) } : {},
        fromPosition
      };
    }
    case "composition.set-type": {
      const v2 = exact(raw2, ["type", "nodeId", "typeId", "fromTypeId"]);
      const typeId = v2.typeId === null ? null : id$7(v2.typeId);
      const fromTypeId = v2.fromTypeId === null ? null : id$7(v2.fromTypeId);
      if (typeId === fromTypeId) fail("type unchanged");
      return { type: "composition.set-type", nodeId: id$7(v2.nodeId), typeId, fromTypeId };
    }
    case "generation.start": {
      const v2 = shape$1(
        raw2,
        ["type", "nodeId", "draft"],
        ["create", "subjectResource", "outputCompositionId", "historyRequest"]
      );
      const result = {
        type: "generation.start",
        nodeId: id$7(v2.nodeId),
        draft: v2.draft === null ? null : parseCanvasV3GenerationDraft(v2.draft)
      };
      if (Object.hasOwn(v2, "outputCompositionId"))
        result.outputCompositionId = id$7(v2.outputCompositionId);
      if (Object.hasOwn(v2, "historyRequest"))
        result.historyRequest = parseCanvasV3PendingGenerationSelection(v2.historyRequest);
      if (Object.hasOwn(v2, "subjectResource")) {
        const target = exact(v2.subjectResource, ["resourceId", "versionId"]);
        result.subjectResource = {
          resourceId: id$7(target.resourceId),
          versionId: id$7(target.versionId)
        };
      }
      if (Object.hasOwn(v2, "create")) {
        const c3 = object$5(v2.create);
        const { expectedKind, edges, ...rest } = c3;
        if (expectedKind !== "image" && expectedKind !== "video" && expectedKind !== "audio")
          fail("invalid create kind");
        result.create = {
          ...placement$1(rest),
          expectedKind,
          ...edges !== void 0 ? { edges: edgeRefs(edges) } : {}
        };
      }
      return result;
    }
    case "composition.copyVersion": {
      const v2 = shape$1(
        raw2,
        ["type", "nodeId", "item", "targetNodeId", "position"],
        ["size", "edgeId"]
      );
      const nodeId = id$7(v2.nodeId), targetNodeId = id$7(v2.targetNodeId);
      if (nodeId === targetNodeId) fail("copy target equals source");
      const edgeId = v2.edgeId === void 0 ? void 0 : id$7(v2.edgeId);
      if (edgeId === nodeId || edgeId === targetNodeId) fail("copy edge equals node");
      return {
        type: "composition.copyVersion",
        nodeId,
        item: parseCanvasV3VersionRef(v2.item),
        targetNodeId,
        ...edgeId === void 0 ? {} : { edgeId },
        position: point$2(v2.position),
        ...v2.size === void 0 ? {} : { size: size(v2.size) }
      };
    }
    case "clipboard.paste": {
      const v2 = shape$1(raw2, ["type", "snapshot", "ids", "offset"], ["sources", "duplicate"]);
      if (Object.hasOwn(v2, "duplicate") && (v2.duplicate !== true || Object.hasOwn(v2, "sources")))
        fail("invalid duplicate paste");
      const snapshot2 = parseCanvasV3ClipboardSnapshot(v2.snapshot);
      const ids2 = {};
      const used = /* @__PURE__ */ new Set();
      for (const [key2, entry] of Object.entries(object$5(v2.ids))) {
        const mapped = id$7(entry);
        if (used.has(mapped)) fail("reused paste id");
        used.add(mapped);
        ids2[id$7(key2)] = mapped;
      }
      for (const key2 of [
        ...Object.keys(snapshot2.document.nodes),
        ...Object.keys(snapshot2.document.edges)
      ])
        if (!Object.hasOwn(ids2, key2)) fail(`missing paste id: ${key2}`);
      let sources;
      if (Object.hasOwn(v2, "sources")) {
        sources = {};
        for (const [key2, entry] of Object.entries(object$5(v2.sources))) {
          const s2 = exact(entry, ["resourceId", "versionId"]);
          sources[text$9(key2, 2 * CANVAS_V3_LIMITS.idLength + 1)] = {
            resourceId: id$7(s2.resourceId),
            versionId: id$7(s2.versionId)
          };
        }
      }
      return {
        type: "clipboard.paste",
        snapshot: snapshot2,
        ids: ids2,
        offset: point$2(v2.offset),
        ...sources ? { sources } : {},
        ...v2.duplicate === true ? { duplicate: true } : {}
      };
    }
    case "canvas.batch": {
      if (nested) fail("nested batch");
      const v2 = exact(raw2, ["type", "commands"]);
      const commands = array$4(v2.commands, CANVAS_V3_LIMITS.batchCommands).map(
        (command2) => parseCanvasV3Command(command2, true)
      );
      if (!commands.length) fail("empty batch");
      return { type: "canvas.batch", commands };
    }
    default:
      return fail("unsupported command");
  }
}
function parseCanvasV3Command(value, nested = false) {
  const raw2 = object$5(value);
  if (raw2.type === "canvas.patch") return parseCanvasV3Patch(raw2);
  return parseCanvasV3ContentCommand(raw2, nested);
}
function isCanvasV3Patch(command2) {
  return command2.type === "canvas.patch";
}
function parseCanvasV3CommandRequest(value) {
  const v2 = exact(value, ["commandId", "expectedRevision", "command"]);
  return {
    commandId: id$7(v2.commandId),
    expectedRevision: integer$4(v2.expectedRevision, true),
    command: parseCanvasV3Command(v2.command)
  };
}
function parseCanvasV3CommandEffects(value) {
  const v2 = shape$1(value, ["undo", "compositionIds"], ["generationResourceId", "protectedNodeIds"]);
  const compositionIds = array$4(v2.compositionIds, CANVAS_V3_LIMITS.nodes).map(id$7);
  return {
    undo: v2.undo === null ? null : parseCanvasV3Command(v2.undo),
    compositionIds,
    ...v2.protectedNodeIds === void 0 ? {} : { protectedNodeIds: array$4(v2.protectedNodeIds, CANVAS_V3_LIMITS.nodes).map(id$7) },
    ...v2.generationResourceId === void 0 ? {} : { generationResourceId: id$7(v2.generationResourceId) }
  };
}
function parseCanvasV3CommandReceipt(value) {
  const v2 = exact(value, ["commandId", "appliedRevision", "document", "replayed", "effects"]);
  const result = {
    commandId: id$7(v2.commandId),
    appliedRevision: integer$4(v2.appliedRevision, true),
    document: parseCanvasV3Document(v2.document),
    replayed: boolean(v2.replayed),
    effects: parseCanvasV3CommandEffects(v2.effects)
  };
  if (result.appliedRevision === 0 || result.appliedRevision > result.document.revision || !result.replayed && result.appliedRevision !== result.document.revision)
    fail("inconsistent receipt revision");
  return result;
}


function parseCanvasV3LocalFileImportResult(value) {
  const v2 = exact(value, [
    "importId",
    "resourceId",
    "versionId",
    "name",
    "width",
    "height",
    "mediaKind"
  ]);
  if (!["image", "video", "audio", "text", "file"].includes(v2.mediaKind))
    fail("invalid local file kind");
  if (typeof v2.importId !== "string" || !UUID$1.test(v2.importId)) fail("invalid importId UUID");
  if (typeof v2.name !== "string" || !v2.name || v2.name.length > CANVAS_V3_LIMITS.titleLength)
    fail("invalid image name");
  const width = integer$4(v2.width), height = integer$4(v2.height);
  if (width <= 0 || height <= 0) fail("invalid image dimensions");
  return {
    importId: v2.importId,
    mediaKind: v2.mediaKind,
    resourceId: id$7(v2.resourceId),
    versionId: id$7(v2.versionId),
    name: v2.name,
    width,
    height
  };
}
function parseCanvasV3VideoAudioSplitResult(value) {
  const v2 = shape$1(value, ["requestId", "audio", "warnings"], ["silentVideo"]);
  if (typeof v2.requestId !== "string" || !UUID$1.test(v2.requestId))
    fail("invalid split requestId UUID");
  const audio = parseCanvasV3MediaImportResult(v2.audio);
  if (audio.mediaKind !== "audio") fail("invalid split audio");
  const silentVideo = Object.hasOwn(v2, "silentVideo") ? parseCanvasV3MediaImportResult(v2.silentVideo) : void 0;
  if (silentVideo && (silentVideo.mediaKind !== "video" || silentVideo.resourceId === audio.resourceId || silentVideo.versionId === audio.versionId))
    fail("invalid split silent video");
  const warnings = array$4(v2.warnings, 1);
  if (silentVideo) {
    if (warnings.length !== 0) fail("unexpected split warnings");
  } else if (warnings.length !== 1 || warnings[0] !== "silent_video_failed")
    fail("missing split partial warning");
  return {
    requestId: v2.requestId,
    audio,
    ...silentVideo ? { silentVideo } : {},
    warnings: silentVideo ? [] : ["silent_video_failed"]
  };
}
function world$1(nodes, node2) {
  let { x: x2, y: y4 } = node2.position;
  let parent = node2.parentId;
  const seen = /* @__PURE__ */ new Set([node2.id]);
  while (parent !== null) {
    if (seen.has(parent) || !Object.hasOwn(nodes, parent))
      throw new Error("Invalid sticker parent");
    seen.add(parent);
    const frame2 = nodes[parent];
    x2 += frame2.position.x;
    y4 += frame2.position.y;
    parent = frame2.parentId;
  }
  return { x: x2, y: y4 };
}
function relative(nodes, sticker, target) {
  const p3 = world$1(nodes, sticker), t2 = world$1(nodes, target);
  return { x: (p3.x - t2.x) / target.size.width, y: (p3.y - t2.y) / target.size.height };
}
function reconcileCanvasV3StickerPatch(document2, initial) {
  if (!initial.nodes.length && !initial.edges.length) return initial;
  const patch2 = parseCanvasV3Patch(initial);
  const nodes = { ...document2.nodes };
  const edits = new Map(patch2.nodes.map((edit) => [edit.id, edit]));
  for (const edit of patch2.nodes) {
    if (!canvasV3Equal(document2.nodes[edit.id] ?? null, edit.before))
      throw new Error(`Sticker patch before mismatch: ${edit.id}`);
    if (edit.after) nodes[edit.id] = edit.after;
    else delete nodes[edit.id];
  }
  for (const node2 of Object.values(nodes)) {
    if (node2.kind !== "sticker" || !node2.attachment) continue;
    const target = nodes[node2.attachment.targetId];
    let after;
    if (!target) {
      if (!document2.nodes[node2.attachment.targetId] || edits.get(node2.attachment.targetId)?.after !== null)
        throw new Error("Invalid sticker target");
      const { attachment: _attachment, ...detached } = node2;
      after = detached;
    } else {
      if (target.kind === "sticker") throw new Error("Invalid sticker target");
      const before2 = document2.nodes[node2.id];
      const currentWorld = world$1(nodes, node2);
      const previousWorld = before2 ? world$1(document2.nodes, before2) : currentWorld;
      const explicitEdit = edits.get(node2.id);
      const priorTarget = document2.nodes[target.id];
      const targetWorld = world$1(nodes, target);
      const priorTargetWorld = priorTarget ? world$1(document2.nodes, priorTarget) : targetWorld;
      const movedWithDifferentAncestor = currentWorld.x - previousWorld.x !== targetWorld.x - priorTargetWorld.x || currentWorld.y - previousWorld.y !== targetWorld.y - priorTargetWorld.y;
      const directlyMoved = before2 && !canvasV3Equal(previousWorld, currentWorld) && (movedWithDifferentAncestor || explicitEdit?.after && (!canvasV3Equal(before2.position, node2.position) || before2.parentId !== node2.parentId));
      if (directlyMoved) {
        after = {
          ...node2,
          attachment: { targetId: target.id, offset: relative(nodes, node2, target) }
        };
      } else {
        const parentWorld = node2.parentId === null ? { x: 0, y: 0 } : world$1(nodes, nodes[node2.parentId]);
        after = {
          ...node2,
          position: {
            x: targetWorld.x + node2.attachment.offset.x * target.size.width - parentWorld.x,
            y: targetWorld.y + node2.attachment.offset.y * target.size.height - parentWorld.y
          }
        };
      }
    }
    const before = document2.nodes[node2.id] ?? null;
    if (!canvasV3Equal(before, after)) edits.set(node2.id, { id: node2.id, before, after });
    else edits.delete(node2.id);
  }
  return { ...patch2, nodes: [...edits.values()] };
}


function parseCanvasV3TextGenerationRequest(value) {
  const v2 = shape$1(value, ["requestId", "modelId", "prompt"], ["params", "references"]);
  const prompt = text$9(v2.prompt, CANVAS_V3_LIMITS.promptLength);
  if (!prompt.trim()) fail("empty prompt");
  const result = {
    requestId: id$7(v2.requestId),
    modelId: id$7(v2.modelId),
    prompt
  };
  if (v2.params !== void 0) {
    const raw2 = exact(v2.params, Object.keys(v2.params));
    const params = {};
    for (const [key2, item] of Object.entries(raw2)) {
      if (key2.length > CANVAS_V3_LIMITS.idLength) fail("invalid param key");
      params[key2] = text$9(item, CANVAS_V3_LIMITS.promptLength);
    }
    result.params = params;
  }
  if (v2.references !== void 0) {
    const seen = /* @__PURE__ */ new Set();
    result.references = array$4(v2.references, CANVAS_V3_LIMITS.draftReferences).map((item) => {
      const ref = exact(item, ["resourceId", "versionId"]);
      const versionId = id$7(ref.versionId);
      if (seen.has(versionId)) fail("duplicate reference");
      seen.add(versionId);
      return { resourceId: id$7(ref.resourceId), versionId };
    });
  }
  return result;
}
function parseCanvasV3TextGenerationResult(value) {
  const raw2 = shape$1(
    value,
    ["requestId", "ok"],
    ["text", "error", "userMessage", "errorCode", "presentation", "cloudTaskId", "traceId"]
  );
  const requestId = id$7(raw2.requestId);
  const cloudTaskId = raw2.cloudTaskId === void 0 ? void 0 : id$7(raw2.cloudTaskId);
  const traceId = raw2.traceId === void 0 ? void 0 : id$7(raw2.traceId);
  if (raw2.ok === true) {
    if (typeof raw2.text !== "string") fail("missing text");
    return { requestId, ok: true, text: raw2.text, cloudTaskId, traceId };
  }
  if (raw2.ok !== false) fail("invalid ok");
  if (typeof raw2.error !== "string" || typeof raw2.errorCode !== "string") fail("invalid error");
  if (raw2.presentation !== "terminal" && raw2.presentation !== "status_unknown")
    fail("invalid presentation");
  return {
    requestId,
    ok: false,
    error: raw2.error,
    ...typeof raw2.userMessage === "string" ? { userMessage: raw2.userMessage } : {},
    errorCode: raw2.errorCode,
    presentation: raw2.presentation,
    cloudTaskId,
    traceId
  };
}

const CLIP_MEDIA_ITEMS_LIMIT = 2e3;
const RUNTIME_MEDIA_FIELDS = [
  "blob",
  "fileHandle",
  "originalUrl",
  "sourceFile",
  "thumbnailUrl",
  "filmstripThumbnails",
  "waveformData",
  "isPlaceholder"
];
const record$8 = (v2) => !!v2 && typeof v2 === "object" && !Array.isArray(v2);
function parseClipMediaReference(value) {
  if (typeof value !== "string") return null;
  const match2 = /^clip:v1:(image|video|audio|text):([^:]+):([^:]+)$/.exec(value);
  if (!match2) return null;
  try {
    return {
      kind: match2[1],
      resourceId: decodeURIComponent(match2[2]),
      versionId: decodeURIComponent(match2[3])
    };
  } catch {
    return null;
  }
}
function parseClipProject(value) {
  if (value === null || value === void 0) return null;
  if (!record$8(value)) throw new Error("INVALID_CLIP_PROJECT");
  if (new TextEncoder().encode(JSON.stringify(value)).length > CLIP_DOCUMENT_MAX_BYTES)
    throw new Error("CLIP_PROJECT_TOO_LARGE");
  const library = value.mediaLibrary;
  const timeline = value.timeline;
  if (typeof value.id !== "string" || !value.id || !record$8(value.settings) || !record$8(library) || !Array.isArray(library.items) || library.items.length > CLIP_MEDIA_ITEMS_LIMIT || !record$8(timeline) || !Array.isArray(timeline.tracks))
    throw new Error("INVALID_CLIP_PROJECT");
  const items = library.items.map((item) => {
    if (!record$8(item) || typeof item.id !== "string" || !item.id)
      throw new Error("INVALID_CLIP_PROJECT");
    if (item.assetId !== void 0 && !parseClipMediaReference(item.assetId))
      throw new Error("INVALID_CLIP_MEDIA_REFERENCE");
    const persisted = { ...item };
    for (const field of RUNTIME_MEDIA_FIELDS) delete persisted[field];
    return persisted;
  });
  return structuredClone({ ...value, mediaLibrary: { ...library, items } });
}
function normalizeClipProject(project2) {
  if (!project2) return null;
  const { modifiedAt: _modifiedAt, ...content2 } = project2;
  return content2;
}
function parseClipSnapshot(value) {
  if (!record$8(value) || value.schemaVersion !== 1 || value.capabilityId !== CLIP_STUDIO_CAPABILITY_ID || typeof value.sourceResourceId !== "string" || typeof value.compositionId !== "string" || typeof value.versionId !== "string" || typeof value.draftRevision !== "number" || !Number.isSafeInteger(value.draftRevision) || value.draftRevision < 0)
    throw new Error("INVALID_EDITOR_RESPONSE");
  return {
    schemaVersion: 1,
    capabilityId: CLIP_STUDIO_CAPABILITY_ID,
    sourceResourceId: value.sourceResourceId,
    compositionId: value.compositionId,
    versionId: value.versionId,
    draftRevision: value.draftRevision,
    project: parseClipProject(value.project ?? null)
  };
}
var ProjectActor = /* @__PURE__ */ ((ProjectActor2) => {
  ProjectActor2["HUMAN"] = "human";
  ProjectActor2["AGENT"] = "agent";
  return ProjectActor2;
})(ProjectActor || {});
var ProjectResourceCommandType = /* @__PURE__ */ ((ProjectResourceCommandType2) => {
  ProjectResourceCommandType2["CREATE"] = "resource.create";
  ProjectResourceCommandType2["UPDATE"] = "resource.update";
  ProjectResourceCommandType2["DELETE"] = "resource.delete";
  ProjectResourceCommandType2["COPY"] = "resource.copy";
  return ProjectResourceCommandType2;
})(ProjectResourceCommandType || {});
var ProjectResourceDeleteTarget = /* @__PURE__ */ ((ProjectResourceDeleteTarget2) => {
  ProjectResourceDeleteTarget2["RESOURCE"] = "resource";
  ProjectResourceDeleteTarget2["VERSION"] = "version";
  return ProjectResourceDeleteTarget2;
})(ProjectResourceDeleteTarget || {});
var ProjectResourceUpdateKind = /* @__PURE__ */ ((ProjectResourceUpdateKind2) => {
  ProjectResourceUpdateKind2["METADATA"] = "metadata";
  ProjectResourceUpdateKind2["LIFECYCLE"] = "lifecycle";
  ProjectResourceUpdateKind2["NEW_VERSION"] = "new_version";
  ProjectResourceUpdateKind2["CURRENT_VERSION"] = "current_version";
  return ProjectResourceUpdateKind2;
})(ProjectResourceUpdateKind || {});
var ProjectResourceConflictKind = /* @__PURE__ */ ((ProjectResourceConflictKind2) => {
  ProjectResourceConflictKind2["VERSION"] = "resource_version";
  ProjectResourceConflictKind2["METADATA_REVISION"] = "resource_metadata_revision";
  return ProjectResourceConflictKind2;
})(ProjectResourceConflictKind || {});

function parseCompositionTreeDrag(transfer, scopeKey) {
  const raw2 = transfer.getData(COMPOSITION_TREE_DRAG_MIME);
  if (!raw2 || raw2.length > 16384) return;
  let value;
  try {
    value = JSON.parse(raw2);
  } catch {
    return;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const item = value;
  const identity2 = (id2) => typeof id2 === "string" && id2.length > 0 && id2.length <= 256;
  if (item.schemaVersion !== 1 || !scopeKey || item.scopeKey !== scopeKey || !identity2(item.compositionId))
    return;
  const base2 = { schemaVersion: 1, scopeKey, compositionId: item.compositionId };
  if (item.kind === "composition") return { ...base2, kind: "composition" };
  if (item.kind === "resource" && identity2(item.resourceId) && (item.versionId === void 0 || identity2(item.versionId)))
    return {
      ...base2,
      kind: "resource",
      resourceId: item.resourceId,
      ...item.versionId ? { versionId: item.versionId } : {}
    };
}
function writeCompositionTreeDrag(transfer, item) {
  transfer.setData(COMPOSITION_TREE_DRAG_MIME, JSON.stringify(item));
}
const PROJECT_COMPOSITION_HTTP_ROUTES = {
  get: "/api/project/compositions/get",
  list: "/api/project/compositions/list",
  listAll: "/api/project/compositions/list-all",
  listByResource: "/api/project/compositions/list-by-resource",
  search: "/api/project/compositions/search",
  listTypes: "/api/project/compositions/types/list",
  commands: "/api/project/compositions/commands"
};
function assertProjectResourceDetail(value) {
  detail(value);
}
function page$1(value) {
  object$3(value);
  array$2(value.items);
  if (value.nextCursor !== void 0) id$5(value.nextCursor);
}
function parseSearchProjectResourcesResult(value) {
  page$1(value);
  for (const item of value.items) resource(item);
  return value;
}
function parseListProjectResourceVersionsResult(value) {
  page$1(value);
  for (const item of value.items) version(item);
  if (value.totalCount !== void 0 && (typeof value.totalCount !== "number" || !Number.isSafeInteger(value.totalCount) || value.totalCount < 0))
    invalid$5();
  return value;
}
function parseProjectResourceReceipt(value, envelope) {
  object$3(value);
  if (value.commandId !== envelope.commandId) invalid$5();
  const command2 = envelope.command;
  if (value.committed === false) {
    if ("result" in value) invalid$5();
    object$3(value.conflict);
    const conflict2 = value.conflict;
    if (conflict2.resourceId !== command2.resourceId) invalid$5();
    if (conflict2.kind === ProjectResourceConflictKind.VERSION) {
      nullableId(conflict2.expectedVersionId);
      nullableId(conflict2.actualVersionId);
    } else if (conflict2.kind === ProjectResourceConflictKind.METADATA_REVISION) {
      integer$2(conflict2.expectedRevision);
      integer$2(conflict2.actualRevision);
    } else invalid$5();
  } else if (value.committed === true) {
    if ("conflict" in value) invalid$5();
    if (command2.type === ProjectResourceCommandType.DELETE) {
      if ("result" in value) invalid$5();
    } else if (command2.type === ProjectResourceCommandType.CREATE || command2.type === ProjectResourceCommandType.UPDATE && (command2.payload.kind === ProjectResourceUpdateKind.METADATA || command2.payload.kind === ProjectResourceUpdateKind.LIFECYCLE)) {
      resource(value.result);
      if (value.result.resourceId !== command2.resourceId) invalid$5();
    } else {
      detail(value.result);
      if (value.result.resource.resourceId !== command2.resourceId || value.result.version === null || !("versionId" in command2.payload) || value.result.version.versionId !== command2.payload.versionId)
        invalid$5();
    }
  } else invalid$5();
  return value;
}
function invalid$4() {
  throw new Error("Invalid Composition HTTP response");
}
function object$2(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid$4();
}
function string(value) {
  if (typeof value !== "string") invalid$4();
}
function id$4(value) {
  string(value);
  if (!value.trim() || value.includes("\0")) invalid$4();
}
function integer$1(value, min2 = 1) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min2) invalid$4();
}
function enumeration(value, values2) {
  if (!values2.includes(value)) invalid$4();
}
function array$1(value) {
  if (!Array.isArray(value)) invalid$4();
}
function position$1(value) {
  if (value === null || value === void 0) return;
  integer$1(value, 0);
  if (value > COMPOSITION_POSITION_MAX) invalid$4();
}
function withPosition(value) {
  return value.position === void 0 ? { ...value, position: null } : value;
}
function attributes$1(value) {
  array$1(value);
  const seen = /* @__PURE__ */ new Set();
  for (const entry of value) {
    object$2(entry);
    id$4(entry.key);
    string(entry.value);
    if (seen.has(entry.key)) invalid$4();
    seen.add(entry.key);
  }
}
function members(value) {
  array$1(value);
  const seen = /* @__PURE__ */ new Set();
  for (const entry of value) {
    object$2(entry);
    id$4(entry.memberId);
    string(entry.role);
    if ("compositions" in entry || "compositionIds" in entry || "resources" in entry) invalid$4();
    if (entry.resource !== null) id$4(entry.resource);
    if (seen.has(entry.memberId)) invalid$4();
    seen.add(entry.memberId);
  }
}
function resolvedMembers(value) {
  array$1(value);
  const seen = /* @__PURE__ */ new Set();
  for (const entry of value) {
    object$2(entry);
    id$4(entry.memberId);
    string(entry.role);
    if ("compositions" in entry || "compositionIds" in entry || "resources" in entry) invalid$4();
    const reference = entry.resource;
    if (reference !== null) {
      object$2(reference);
      id$4(reference.resourceId);
      if (reference.ok === true) {
        try {
          assertProjectResourceDetail(reference.detail);
        } catch {
          invalid$4();
        }
        if (reference.detail.resource.resourceId !== reference.resourceId) invalid$4();
      } else if (reference.ok === false) {
        object$2(reference.error);
        enumeration(reference.error.code, Object.values(ProjectResourceReadErrorCode));
        string(reference.error.message);
      } else invalid$4();
    }
    if (seen.has(entry.memberId)) invalid$4();
    seen.add(entry.memberId);
  }
}
function typeDef(value) {
  object$2(value);
  id$4(value.typeId);
  string(value.label);
  if (value.description !== void 0) string(value.description);
  string(value.createdAt);
  string(value.updatedAt);
}
function summary(value) {
  object$2(value);
  id$4(value.compositionId);
  if (value.type !== null) typeDef(value.type);
  string(value.name);
  enumeration(value.lifecycle, Object.values(CompositionLifecycle));
  position$1(value.position);
  string(value.updatedAt);
}
function page(value) {
  object$2(value);
  array$1(value.items);
  if (value.nextCursor !== void 0) id$4(value.nextCursor);
}
function parseComposition(value) {
  object$2(value);
  id$4(value.compositionId);
  if (value.type !== null) typeDef(value.type);
  string(value.name);
  attributes$1(value.attributes);
  members(value.members);
  enumeration(value.lifecycle, Object.values(CompositionLifecycle));
  position$1(value.position);
  integer$1(value.revision);
  string(value.createdAt);
  string(value.updatedAt);
  return withPosition(value);
}
function parseListAllCompositionsResult(value) {
  object$2(value);
  array$1(value.items);
  const seen = /* @__PURE__ */ new Set();
  for (const item of value.items) {
    object$2(item);
    id$4(item.compositionId);
    if (item.type !== null) typeDef(item.type);
    string(item.name);
    attributes$1(item.attributes);
    resolvedMembers(item.members);
    enumeration(item.lifecycle, Object.values(CompositionLifecycle));
    position$1(item.position);
    integer$1(item.revision);
    string(item.createdAt);
    string(item.updatedAt);
    if (seen.has(item.compositionId)) invalid$4();
    seen.add(item.compositionId);
  }
  return {
    ...value,
    items: value.items.map(withPosition)
  };
}
function parseCompositionListResult(value) {
  page(value);
  for (const item of value.items) summary(item);
  return {
    ...value,
    items: value.items.map(withPosition)
  };
}
function parseCompositionSearchResult(value) {
  page(value);
  for (const item of value.items) summary(item);
  return {
    ...value,
    items: value.items.map(withPosition)
  };
}
function parseCompositionTypeDefs(value) {
  array$1(value);
  const seen = /* @__PURE__ */ new Set();
  for (const item of value) {
    typeDef(item);
    if (seen.has(item.typeId)) invalid$4();
    seen.add(item.typeId);
  }
  return value;
}
function parseCompositionReceipt(value, envelope) {
  object$2(value);
  if (value.commandId !== envelope.commandId) invalid$4();
  const command2 = envelope.command;
  const typeCommand = command2.type === CompositionCommandType.TYPE_REGISTER || command2.type === CompositionCommandType.TYPE_RENAME;
  const duplicate = command2.type === CompositionCommandType.DUPLICATE;
  const expectedRevision = "expectedRevision" in envelope ? envelope.expectedRevision : void 0;
  const targetId = "compositionId" in command2 ? command2.compositionId : void 0;
  const casRevision = command2.type === CompositionCommandType.DUPLICATE ? command2.sourceRevision : expectedRevision;
  const casTargetId = command2.type === CompositionCommandType.DUPLICATE ? command2.sourceCompositionId : targetId;
  if (value.committed === false) {
    if (casRevision === void 0 || typeCommand) invalid$4();
    if ("compositionId" in value || "revision" in value || "typeId" in value) invalid$4();
    object$2(value.conflict);
    const conflict2 = value.conflict;
    if (conflict2.kind !== CompositionConflictKind.REVISION) invalid$4();
    if (typeCommand || conflict2.compositionId !== casTargetId) invalid$4();
    if (conflict2.expectedRevision !== casRevision) invalid$4();
    integer$1(conflict2.actualRevision);
    if (conflict2.actualRevision === casRevision) invalid$4();
    enumeration(conflict2.resolution, Object.values(CompositionConflictResolution));
  } else if (value.committed === true) {
    if ("conflict" in value) invalid$4();
    if (typeCommand) {
      if (command2.type === CompositionCommandType.TYPE_REGISTER) id$4(value.typeId);
      else if (value.typeId !== command2.typeId) invalid$4();
      if ("compositionId" in value || "revision" in value) invalid$4();
    } else {
      if (command2.type === CompositionCommandType.CREATE || duplicate) id$4(value.compositionId);
      else if (value.compositionId !== targetId) invalid$4();
      if (command2.type === CompositionCommandType.DUPLICATE && value.compositionId === command2.sourceCompositionId)
        invalid$4();
      if ("typeId" in value) invalid$4();
      integer$1(value.revision);
      if (expectedRevision !== void 0 && value.revision !== expectedRevision + 1) invalid$4();
      if (expectedRevision !== void 0 && value.revision !== expectedRevision + 1) invalid$4();
      if (value.position !== void 0) {
        integer$1(value.position, 0);
        position$1(value.position);
      }
      if (value.renumbered !== void 0) {
        array$1(value.renumbered);
        for (const entry of value.renumbered) {
          object$2(entry);
          id$4(entry.compositionId);
          integer$1(entry.position, 0);
        }
      }
      if (value.members !== void 0) {
        if (!duplicate) invalid$4();
        array$1(value.members);
        const seen = /* @__PURE__ */ new Set();
        for (const entry of value.members) {
          object$2(entry);
          id$4(entry.sourceMemberId);
          if (entry.sourceResource !== null) id$4(entry.sourceResource);
          id$4(entry.memberId);
          if (entry.resource !== null) id$4(entry.resource);
          if (entry.version !== null) id$4(entry.version);
          if (entry.resource === null !== (entry.version === null)) invalid$4();
          if (entry.sourceResource === null && entry.resource !== null) invalid$4();
          if (seen.has(entry.memberId)) invalid$4();
          seen.add(entry.memberId);
        }
      }
    }
  } else invalid$4();
  return value;
}
function projectStoredFileName(relativePath, name2) {
  const filename = relativePath?.split(/[/\\]/).pop() ?? "";
  return filename.includes(".") && !/\.bin$/i.test(filename) ? filename : name2 ?? filename;
}
function projectSubtitleFormat(relativePath, name2) {
  const source = projectStoredFileName(relativePath, name2);
  const extension2 = /\.(srt|ass)$/i.exec(source)?.[1]?.toLowerCase();
  return extension2 === "srt" || extension2 === "ass" ? extension2 : void 0;
}

const PROJECT_DOCUMENT_READ_DEFAULT_LINES = 500;
const PROJECT_DOCUMENT_READ_MAX_CHARS = 64e3;
const record$7 = (v2) => !!v2 && typeof v2 === "object" && !Array.isArray(v2);
function parseEditorScene(value) {
  if (!record$7(value) || JSON.stringify(value).length > 2e6) throw new Error("INVALID_SCENE");
  for (const key2 of ["cameras", "characters", "props"]) {
    const entries2 = value[key2];
    if (!Array.isArray(entries2) || entries2.length > 1e3) throw new Error("INVALID_SCENE");
    const ids2 = /* @__PURE__ */ new Set();
    for (const entry of entries2) {
      if (!record$7(entry) || typeof entry.id !== "string" || !entry.id || ids2.has(entry.id))
        throw new Error("INVALID_SCENE_ID");
      ids2.add(entry.id);
    }
  }
  if (!record$7(value.environment)) throw new Error("INVALID_SCENE_ENVIRONMENT");
  return structuredClone(value);
}
function editDirectorScene(scene, input) {
  if (!record$7(input) || Object.keys(input).some((k2) => k2 !== "changes") || !Array.isArray(input.changes) || !input.changes.length || input.changes.length > 30)
    throw new Error("INVALID_CHANGES");
  const next2 = parseEditorScene(scene);
  for (const raw2 of input.changes) {
    if (!record$7(raw2) || !["camera", "character", "prop"].includes(String(raw2.kind)) || typeof raw2.id !== "string")
      throw new Error("INVALID_CHANGE");
    const key2 = raw2.kind === "camera" ? "cameras" : raw2.kind === "character" ? "characters" : "props";
    const entity = next2[key2].find((v2) => v2.id === raw2.id);
    if (!entity) throw new Error("OBJECT_NOT_FOUND");
    if (entity.locked) throw new Error("OBJECT_LOCKED");
    const allowed = raw2.kind === "camera" ? ["position", "lookAt", "fov", "label", "visible"] : ["position", "rotation", "scale", "label", "visible"];
    for (const [field, value] of Object.entries(raw2)) {
      if (field === "kind" || field === "id") continue;
      if (!allowed.includes(field)) throw new Error(`INVALID_FIELD: ${field}`);
      if (["position", "rotation", "scale", "lookAt"].includes(field)) {
        if (!record$7(value) || Object.keys(value).sort().join(",") !== "x,y,z" || !Object.values(value).every(
          (v2) => typeof v2 === "number" && Number.isFinite(v2) && Math.abs(v2) < 1e6
        ) || field === "scale" && !Object.values(value).every((v2) => v2 > 0))
          throw new Error(`INVALID_VECTOR: ${field}`);
      } else if (field === "fov" && (typeof value !== "number" || !Number.isFinite(value) || value < 1 || value > 170))
        throw new Error("INVALID_FOV");
      else if (field === "label" && (typeof value !== "string" || value.length > 256))
        throw new Error("INVALID_LABEL");
      else if (field === "visible" && typeof value !== "boolean")
        throw new Error("INVALID_VISIBLE");
      entity[field] = structuredClone(value);
    }
  }
  return next2;
}
function createDirectorScene() {
  const zero2 = () => ({ x: 0, y: 0, z: 0 });
  const one2 = () => ({ x: 1, y: 1, z: 1 });
  return {
    characters: [],
    props: [],
    characterGroups: [],
    cameras: [
      {
        id: "camera_1",
        label: "Camera 1",
        position: { x: 4, y: 2, z: 6 },
        lookAt: { x: 0, y: 1, z: 0 },
        lookAtTarget: "",
        cameraRotation: zero2(),
        fov: 50,
        zoom: 1,
        visible: true,
        locked: false,
        screenshots: []
      }
    ],
    environment: {
      referenceImageUrl: "",
      referenceImageOpacity: 0.32,
      showReferenceImage: false,
      backgroundMode: "panorama",
      panoramaUrl: "",
      panoramaSource: "none",
      panoramaRotationY: 0,
      panoramaRadius: 90,
      flatFit: "contain",
      flatScale: 1,
      flatOffsetX: 0,
      flatOffsetY: 0,
      skyColor: "#060608",
      showGround: true,
      groundOpacity: 0.4,
      groundHeight: 0,
      sceneScale: one2(),
      sceneRotation: zero2(),
      scenePosition: zero2(),
      gaussianSplatPosition: zero2(),
      gaussianSplatRotation: { x: 180, y: 0, z: 0 },
      gaussianSplatScale: one2(),
      gaussianSplatSphericalHarmonicsDegree: 0
    }
  };
}
function parseDirectorSnapshot(value) {
  if (!record$7(value) || value.schemaVersion !== 1 || value.capabilityId !== "plugin:director-stage" || typeof value.sourceResourceId !== "string" || typeof value.compositionId !== "string" || typeof value.versionId !== "string" || typeof value.draftRevision !== "number" || !Number.isSafeInteger(value.draftRevision) || value.draftRevision < 0)
    throw new Error("INVALID_EDITOR_RESPONSE");
  return {
    schemaVersion: 1,
    capabilityId: "plugin:director-stage",
    sourceResourceId: value.sourceResourceId,
    compositionId: value.compositionId,
    versionId: value.versionId,
    draftRevision: value.draftRevision,
    scene: parseEditorScene(value.scene)
  };
}
const DIRECTOR_MOTION_PRESET_IDS = [
  "idle",
  "walk",
  "run",
  "jump",
  "talk",
  "wave",
  "bow",
  "cheer",
  "dance",
  "sit_talk",
  "punch",
  "death"
];
const DIRECTOR_ANIMATION_MAX_DURATION_MS = 6e4;
const DIRECTOR_ANIMATION_MAX_BATCH = 30;
const DIRECTOR_ANIMATION_MAX_POINTS = 100;
const DIRECTOR_MOTION_MAX_SOURCE_LENGTH = 16e3;
const record$6 = (v2) => !!v2 && typeof v2 === "object" && !Array.isArray(v2);
const entries = (v2) => Array.isArray(v2) ? v2.filter(record$6) : [];
const presets = new Set(DIRECTOR_MOTION_PRESET_IDS);
class DirectorAnimationError extends Error {
  diagnostic;
  constructor(code2, path2, actual, expected, recovery) {
    super(`${code2}${path2 ? ` at ${path2}` : ""}: ${expected}. ${recovery}`);
    this.name = "DirectorAnimationError";
    let actualJson;
    try {
      actualJson = JSON.stringify(actual) ?? "undefined";
    } catch {
      actualJson = "[unserializable]";
    }
    this.diagnostic = { code: code2, path: path2, actualJson: actualJson.slice(0, 256), expected, recovery };
  }
}
function validateDirectorAnimationRelations(input) {
  if (!record$6(input)) return;
  if (Object.keys(input).every((key2) => ["paths", "motions", "tracks"].includes(key2)) && !("tracks" in input) && (!("paths" in input) || Array.isArray(input.paths) && input.paths.length === 0) && (!("motions" in input) || Array.isArray(input.motions) && input.motions.length === 0))
    throw new DirectorAnimationError(
      "EMPTY_ANIMATION",
      "",
      input,
      "At least one path or motion, or an explicit tracks array",
      "Provide the requested animation data; use tracks: [] only to explicitly clear the timeline"
    );
  if (Array.isArray(input.paths))
    for (const [index2, raw2] of input.paths.entries()) {
      if (!record$6(raw2)) continue;
      const location2 = `paths[${index2}]`;
      if (Array.isArray(raw2.points) && raw2.points.some((p3) => record$6(p3) && "timeK" in p3)) {
        let previousK = -1;
        for (const [pointIndex, point2] of raw2.points.entries()) {
          if (!record$6(point2)) continue;
          const k2 = point2.timeK;
          if (typeof k2 !== "number" || !Number.isFinite(k2) || k2 < 0 || k2 > 1 || k2 <= previousK)
            throw new DirectorAnimationError(
              "INVALID_ANIMATION_TIME_K",
              `${location2}.points[${pointIndex}].timeK`,
              k2,
              `Every point must have timeK in [0, 1], strictly greater than the preceding value (${previousK})`,
              "Set strictly increasing timeK values on every point, or omit timeK from every point to use automatic timing"
            );
          previousK = k2;
        }
      }
      if ("fovStart" in raw2 !== "fovEnd" in raw2) {
        const missing = "fovStart" in raw2 ? "fovEnd" : "fovStart";
        throw new DirectorAnimationError(
          "INVALID_ANIMATION_FOV_PAIR",
          `${location2}.${missing}`,
          raw2[missing],
          "fovStart and fovEnd must be provided together",
          "Provide both FOV values in [10, 120], or omit both for a path without an FOV transition"
        );
      }
      if (raw2.lookAtTarget === "__none__" && !("lookAt" in raw2))
        throw new DirectorAnimationError(
          "INVALID_ANIMATION_LOOK_AT",
          `${location2}.lookAt`,
          raw2.lookAt,
          "lookAt is required when lookAtTarget is __none__",
          "Provide the fixed lookAt position as {x, y, z}"
        );
      if ("lookAt" in raw2 && raw2.lookAtTarget !== "__none__")
        throw new DirectorAnimationError(
          "INVALID_ANIMATION_LOOK_AT",
          `${location2}.lookAt`,
          raw2.lookAt,
          "A fixed lookAt position requires lookAtTarget: __none__",
          "Set lookAtTarget to __none__ for a fixed point, or omit lookAt and use an existing object ID for tracking"
        );
    }
  if (Array.isArray(input.tracks))
    for (const [index2, raw2] of input.tracks.entries()) {
      if (!record$6(raw2)) continue;
      const location2 = `tracks[${index2}]`;
      if (raw2.kind === "anim" && (typeof raw2.targetId !== "string" || !raw2.targetId.trim()))
        throw new DirectorAnimationError(
          "INVALID_ANIMATION_TARGET",
          `${location2}.targetId`,
          raw2.targetId,
          "A skeleton animation track requires an existing character targetId",
          "Set targetId to a character ID; for a camera path omit kind and targetId"
        );
      if (raw2.kind === "anim" && "orient" in raw2)
        throw new DirectorAnimationError(
          "INVALID_ANIMATION_ORIENT",
          `${location2}.orient`,
          raw2.orient,
          "orient is only supported on object movement tracks, not skeleton animation tracks",
          "For spatial movement keep the path and targetId and omit kind; for a skeleton motion omit orient and reference a motion ID"
        );
      if (!("targetId" in raw2) && "orient" in raw2)
        throw new DirectorAnimationError(
          "INVALID_ANIMATION_TARGET",
          `${location2}.orient`,
          raw2.orient,
          "A camera track cannot use orient; object movement requires targetId",
          "Set targetId for object movement, or omit orient for camera movement"
        );
      if (Array.isArray(raw2.clips))
        for (const [clipIndex, clip2] of raw2.clips.entries()) {
          if (!record$6(clip2)) continue;
          if (typeof clip2.start === "number" && typeof clip2.duration === "number" && clip2.start + clip2.duration > DIRECTOR_ANIMATION_MAX_DURATION_MS)
            throw new DirectorAnimationError(
              "ANIMATION_TOO_LONG",
              `${location2}.clips[${clipIndex}].duration`,
              clip2.duration,
              `start + duration must be <= ${DIRECTOR_ANIMATION_MAX_DURATION_MS} ms (start is ${clip2.start})`,
              "Adjust the clip start or duration to fit within 60000 ms without silently dropping the requested action"
            );
        }
    }
}
function fields(value, allowed, path2 = "") {
  if (!record$6(value))
    throw new DirectorAnimationError(
      "INVALID_ANIMATION_FIELD",
      path2,
      value,
      "An object",
      "Provide a JSON object with the documented fields"
    );
  const unexpected = Object.keys(value).find((key2) => !allowed.includes(key2));
  if (unexpected !== void 0)
    throw new DirectorAnimationError(
      "INVALID_ANIMATION_FIELD",
      path2 ? `${path2}.${unexpected}` : unexpected,
      value[unexpected],
      `Allowed fields: ${allowed.join(", ")}`,
      "Correct the field name using the animation contract"
    );
  return value;
}
function text$8(value, field, max2 = 256, path2 = "") {
  if (typeof value !== "string" || !value.trim() || value.length > max2)
    throw new DirectorAnimationError(
      `INVALID_ANIMATION_${field}`,
      path2,
      value,
      `A nonempty string of at most ${max2} characters`,
      "Provide a nonempty value within the length limit"
    );
  return value;
}
function id$3(value, path2 = "") {
  const result = text$8(value, "ID", 256, path2);
  if (result !== result.trim())
    throw new DirectorAnimationError(
      "INVALID_ANIMATION_ID",
      path2,
      value,
      "An ID without surrounding whitespace",
      "Trim surrounding whitespace from the ID"
    );
  return result;
}
function number$1(value, min2, max2, field, path2 = "") {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min2 || value > max2)
    throw new DirectorAnimationError(
      `INVALID_ANIMATION_${field}`,
      path2,
      value,
      `A finite number in [${min2}, ${max2}]`,
      "Provide a number within the documented bounds"
    );
  return value;
}
function optionalBoolean(value, key2, path2) {
  if (key2 in value && typeof value[key2] !== "boolean")
    throw new DirectorAnimationError(
      `INVALID_ANIMATION_${key2}`,
      `${path2}.${key2}`,
      value[key2],
      "A boolean",
      "Use true or false, or omit the optional field"
    );
}
function optionalEnum(value, key2, allowed, path2) {
  if (key2 in value && (typeof value[key2] !== "string" || !allowed.includes(value[key2])))
    throw new DirectorAnimationError(
      `INVALID_ANIMATION_${key2}`,
      `${path2}.${key2}`,
      value[key2],
      `One of: ${allowed.join(", ")}`,
      "Use a documented value, or omit the optional field"
    );
}
function vector(value, path2) {
  const v2 = fields(value, ["x", "y", "z"], path2);
  for (const axis of ["x", "y", "z"])
    number$1(v2[axis], -999999, 999999, "VECTOR", `${path2}.${axis}`);
}
function batch(value, path2, max2 = DIRECTOR_ANIMATION_MAX_BATCH) {
  if (!Array.isArray(value) || value.length > max2 || !value.every(record$6))
    throw new DirectorAnimationError(
      "INVALID_ANIMATION_BATCH",
      path2,
      value,
      `An array of at most ${max2} objects`,
      "Provide an array of documented animation entries"
    );
  const ids2 = /* @__PURE__ */ new Set();
  for (const [index2, entry] of value.entries()) {
    const entryId = id$3(entry.id, `${path2}[${index2}].id`);
    if (ids2.has(entryId))
      throw new DirectorAnimationError(
        "DUPLICATE_ANIMATION_ID",
        `${path2}[${index2}].id`,
        entryId,
        "A unique ID within this batch",
        "Give this entry a distinct ID and update any references to it"
      );
    ids2.add(entryId);
  }
  return value;
}
function validatePath(raw2, scene, location2) {
  fields(
    raw2,
    [
      "id",
      "label",
      "points",
      "duration",
      "visible",
      "lookAtTarget",
      "lookAt",
      "easing",
      "loopMode",
      "closed",
      "fovStart",
      "fovEnd",
      "keyframeCameraId"
    ],
    location2
  );
  text$8(raw2.label, "LABEL", 256, `${location2}.label`);
  number$1(raw2.duration, 1, DIRECTOR_ANIMATION_MAX_DURATION_MS, "DURATION", `${location2}.duration`);
  if (!Array.isArray(raw2.points) || raw2.points.length < 2 || raw2.points.length > DIRECTOR_ANIMATION_MAX_POINTS)
    throw new DirectorAnimationError(
      "INVALID_ANIMATION_POINTS",
      `${location2}.points`,
      raw2.points,
      `An array of 2 to ${DIRECTOR_ANIMATION_MAX_POINTS} path points`,
      "Provide at least a start and end position"
    );
  for (const [index2, point2] of raw2.points.entries()) {
    const pointLocation = `${location2}.points[${index2}]`;
    const p3 = fields(
      point2,
      ["position", "in", "out", "tilt", "fov", "speed", "tangentMode", "timeK"],
      pointLocation
    );
    vector(p3.position, `${pointLocation}.position`);
    for (const key2 of ["in", "out"]) if (key2 in p3) vector(p3[key2], `${pointLocation}.${key2}`);
    if ("tilt" in p3) number$1(p3.tilt, -Math.PI * 2, Math.PI * 2, "TILT", `${pointLocation}.tilt`);
    if ("fov" in p3) number$1(p3.fov, 10, 120, "FOV", `${pointLocation}.fov`);
    if ("speed" in p3) number$1(p3.speed, 0.1, 5, "SPEED", `${pointLocation}.speed`);
    optionalEnum(p3, "tangentMode", ["aligned", "free"], pointLocation);
  }
  optionalBoolean(raw2, "visible", location2);
  optionalBoolean(raw2, "closed", location2);
  optionalEnum(raw2, "easing", ["linear", "easeIn", "easeOut", "easeInOut", "smoothstep"], location2);
  optionalEnum(raw2, "loopMode", ["once", "loop", "pingpong"], location2);
  for (const key2 of ["fovStart", "fovEnd"])
    if (key2 in raw2) number$1(raw2[key2], 10, 120, "FOV", `${location2}.${key2}`);
  if ("lookAt" in raw2) vector(raw2.lookAt, `${location2}.lookAt`);
  if ("lookAtTarget" in raw2) {
    if (typeof raw2.lookAtTarget !== "string")
      throw new DirectorAnimationError(
        "INVALID_ANIMATION_LOOK_AT",
        `${location2}.lookAtTarget`,
        raw2.lookAtTarget,
        "An existing character/prop ID, __none__ for a fixed position, or an empty string",
        "Select a documented lookAtTarget value"
      );
    if (raw2.lookAtTarget !== "__none__" && raw2.lookAtTarget && ![...entries(scene.characters), ...entries(scene.props)].some(
      (v2) => v2.id === raw2.lookAtTarget
    )) {
      throw new DirectorAnimationError(
        "OBJECT_NOT_FOUND",
        `${location2}.lookAtTarget`,
        raw2.lookAtTarget,
        "An existing character or prop ID",
        "Read the scene to select an existing look-at target"
      );
    }
  }
  if ("keyframeCameraId" in raw2 && !entries(scene.cameras).some(
    (v2) => v2.id === id$3(raw2.keyframeCameraId, `${location2}.keyframeCameraId`)
  ))
    throw new DirectorAnimationError(
      "OBJECT_NOT_FOUND",
      `${location2}.keyframeCameraId`,
      raw2.keyframeCameraId,
      "An existing camera ID",
      "Read the scene cameras and select the intended camera ID"
    );
}
function validateTrack(raw2, scene, location2) {
  fields(raw2, ["id", "label", "muted", "clips", "kind", "targetId", "orient"], location2);
  text$8(raw2.label, "LABEL", 256, `${location2}.label`);
  optionalBoolean(raw2, "muted", location2);
  optionalEnum(raw2, "kind", ["anim"], location2);
  optionalEnum(raw2, "orient", ["follow", "keep"], location2);
  if ("targetId" in raw2) {
    const targets = raw2.kind === "anim" ? entries(scene.characters) : [...entries(scene.characters), ...entries(scene.props)];
    if (!targets.some((v2) => v2.id === id$3(raw2.targetId, `${location2}.targetId`)))
      throw new DirectorAnimationError(
        "OBJECT_NOT_FOUND",
        `${location2}.targetId`,
        raw2.targetId,
        raw2.kind === "anim" ? "An existing character ID for a skeleton track" : "An existing character or prop ID for movement",
        "Read the scene and select the correct object ID; skeleton animation does not target props or cameras"
      );
  }
  for (const [index2, clip2] of batch(raw2.clips, `${location2}.clips`).entries()) {
    const clipLocation = `${location2}.clips[${index2}]`;
    fields(clip2, ["id", "pathId", "start", "duration", "enabled"], clipLocation);
    const reference = id$3(clip2.pathId, `${clipLocation}.pathId`);
    const exists = raw2.kind === "anim" ? presets.has(reference) || entries(scene.customMotions).some((v2) => v2.id === reference) : entries(scene.camPaths).some((v2) => v2.id === reference);
    if (!exists) {
      const isSpatialPath = entries(scene.camPaths).some((v2) => v2.id === reference);
      const isMotion = presets.has(reference) || entries(scene.customMotions).some((v2) => v2.id === reference);
      throw new DirectorAnimationError(
        "ANIMATION_REFERENCE_NOT_FOUND",
        `${clipLocation}.pathId`,
        reference,
        raw2.kind === "anim" ? "A built-in or custom motion ID for kind: anim" : "A spatial path ID for a movement track",
        raw2.kind === "anim" && isSpatialPath ? "This ID is a spatial path. For object movement keep targetId and omit kind; for camera movement omit kind and targetId. Keep the requested movement track" : raw2.kind !== "anim" && isMotion ? "This ID is a skeleton motion. Set kind: anim and a character targetId; create a separate spatial path track for translation" : "Use an existing reference of the required type, or include its definition in paths/motions in this same batch"
      );
    }
    number$1(clip2.start, 0, DIRECTOR_ANIMATION_MAX_DURATION_MS, "START", `${clipLocation}.start`);
    number$1(
      clip2.duration,
      1,
      DIRECTOR_ANIMATION_MAX_DURATION_MS,
      "DURATION",
      `${clipLocation}.duration`
    );
    optionalBoolean(clip2, "enabled", clipLocation);
  }
}
function animateDirectorScene(scene, input) {
  validateDirectorAnimationRelations(input);
  const args = fields(input, ["paths", "motions", "tracks"]);
  const paths = "paths" in args ? batch(args.paths, "paths") : [];
  const motions = "motions" in args ? batch(args.motions, "motions") : [];
  const tracks = "tracks" in args ? batch(args.tracks, "tracks") : void 0;
  const next2 = parseEditorScene(scene);
  const previousTracks = record$6(next2.camTimeline) ? entries(next2.camTimeline.tracks) : [];
  const namespaces2 = /* @__PURE__ */ new Map();
  const claim = (entry, namespace2, upsert22, location2) => {
    const key2 = id$3(entry.id, `${location2}.id`);
    const previous2 = namespaces2.get(key2);
    if (previous2 && (!upsert22 || previous2 !== namespace2))
      throw new DirectorAnimationError(
        "ANIMATION_ID_EXISTS",
        `${location2}.id`,
        key2,
        `An ID not already used in ${previous2}`,
        "Use a distinct ID across objects, paths, motions, tracks and clips; only same-type upserts may reuse IDs"
      );
    namespaces2.set(key2, namespace2);
  };
  for (const [key2, value] of Object.entries(next2))
    for (const [index2, entry] of entries(value).entries())
      if (typeof entry.id === "string") claim(entry, key2, false, `scene.${key2}[${index2}]`);
  for (const [index2, track] of previousTracks.entries()) {
    claim(track, "track", false, `scene.camTimeline.tracks[${index2}]`);
    for (const [clipIndex, clip2] of entries(track.clips).entries())
      claim(clip2, "clip", false, `scene.camTimeline.tracks[${index2}].clips[${clipIndex}]`);
  }
  const locked = (targetId, location2) => {
    if ([...entries(next2.characters), ...entries(next2.props), ...entries(next2.cameras)].some(
      (v2) => v2.id === targetId && v2.locked
    ))
      throw new DirectorAnimationError(
        "OBJECT_LOCKED",
        location2,
        targetId,
        "An unlocked animation target",
        "Keep the current locked object animation intact; explicitly unlock the target before changing its tracks or referenced data"
      );
  };
  const upsert2 = (key2, incoming, location2) => {
    const current2 = entries(next2[key2]);
    for (const [incomingIndex, raw2] of incoming.entries()) {
      claim(raw2, key2, true, `${location2}[${incomingIndex}]`);
      const index2 = current2.findIndex((v2) => v2.id === raw2.id);
      if (index2 < 0) current2.push(structuredClone(raw2));
      else current2[index2] = structuredClone(raw2);
    }
    if (incoming.length) next2[key2] = current2;
  };
  for (const [index2, path2] of paths.entries()) {
    const location2 = `paths[${index2}]`;
    validatePath(path2, next2, location2);
    const previous2 = entries(next2.camPaths).find((v2) => v2.id === path2.id);
    if (previous2?.locked)
      throw new DirectorAnimationError(
        "OBJECT_LOCKED",
        `${location2}.id`,
        path2.id,
        "An unlocked path",
        "Keep the locked path unchanged, or explicitly unlock it before updating it"
      );
    if (previous2?.keyframeCameraId) locked(previous2.keyframeCameraId, `${location2}.id`);
    if (path2.keyframeCameraId) locked(path2.keyframeCameraId, `${location2}.keyframeCameraId`);
  }
  for (const [index2, motion2] of motions.entries()) {
    const location2 = `motions[${index2}]`;
    fields(motion2, ["id", "label", "source"], location2);
    if ("label" in motion2) text$8(motion2.label, "LABEL", 256, `${location2}.label`);
    text$8(motion2.source, "SOURCE", DIRECTOR_MOTION_MAX_SOURCE_LENGTH, `${location2}.source`);
    if (presets.has(id$3(motion2.id, `${location2}.id`)))
      throw new DirectorAnimationError(
        "PRESET_MOTION_READ_ONLY",
        `${location2}.id`,
        motion2.id,
        "A custom motion ID distinct from built-in presets",
        "Choose a new custom motion ID; reference the preset directly to use it without modification"
      );
  }
  upsert2(
    "camPaths",
    paths.map((path2) => ({
      visible: true,
      ...path2,
      points: entries(path2.points).map((point2) => ({
        in: { x: 0, y: 0, z: 0 },
        out: { x: 0, y: 0, z: 0 },
        ...point2
      }))
    })),
    "paths"
  );
  upsert2("customMotions", motions, "motions");
  if (tracks !== void 0) {
    const seen = /* @__PURE__ */ new Set();
    for (const [index2, track] of tracks.entries()) {
      const location2 = `tracks[${index2}]`;
      validateTrack(track, next2, location2);
      for (const [entry, namespace2, entryLocation] of [
        [track, "track", location2],
        ...entries(track.clips).map(
          (clip2, clipIndex) => [clip2, "clip", `${location2}.clips[${clipIndex}]`]
        )
      ]) {
        const key2 = id$3(entry.id, `${entryLocation}.id`);
        if (seen.has(key2))
          throw new DirectorAnimationError(
            "DUPLICATE_ANIMATION_ID",
            `${entryLocation}.id`,
            key2,
            "A unique ID across all tracks and clips",
            "Give this entry a distinct ID and update any references to it"
          );
        seen.add(key2);
        claim(entry, namespace2, true, entryLocation);
      }
    }
    for (const [index2, track] of previousTracks.entries())
      if (JSON.stringify(track) !== JSON.stringify(tracks[index2]))
        locked(track.targetId, tracks[index2] ? `tracks[${index2}]` : "tracks");
    for (const [index2, track] of tracks.entries())
      if (JSON.stringify(track) !== JSON.stringify(previousTracks[index2]))
        locked(track.targetId, `tracks[${index2}].targetId`);
    next2.camTimeline = {
      ...record$6(next2.camTimeline) ? next2.camTimeline : {},
      tracks: structuredClone(tracks)
    };
  }
  const changedReferences = new Set([...paths, ...motions].map((v2) => v2.id));
  for (const track of [...previousTracks, ...tracks ?? []]) {
    const clip2 = entries(track.clips).find((clip22) => changedReferences.has(clip22.pathId));
    if (clip2) {
      const pathIndex = paths.findIndex((path2) => path2.id === clip2.pathId);
      const location2 = pathIndex >= 0 ? `paths[${pathIndex}].id` : `motions[${motions.findIndex((motion2) => motion2.id === clip2.pathId)}].id`;
      locked(track.targetId, location2);
    }
  }
  if (!next2.camTimeline && entries(next2.camPaths).length) {
    if (entries(scene.camPaths).length)
      throw new DirectorAnimationError(
        "TIMELINE_REQUIRED",
        "tracks",
        void 0,
        "An explicit timeline when editing a legacy scene containing paths",
        "Read the existing scene and supply tracks preserving the intended playback; use [] only for an intentional clear"
      );
    next2.camTimeline = { tracks: [] };
  }
  return parseEditorScene(next2);
}
function parseEditorServerMessage(raw2) {
  if (!raw2 || typeof raw2 !== "object") throw new Error("INVALID_EDITOR_EVENT");
  const value = raw2;
  if (![
    "editor_subscription_ready",
    "editor_invalidated",
    "editor_subscription_closed",
    "editor_subscription_error"
  ].includes(String(value.type)) || typeof value.subscriptionId !== "string" || !value.subscriptionId || value.subscriptionId.length > 128 || typeof value.serverEpoch !== "string" || !value.serverEpoch || value.serverEpoch.length > 128 || value.capabilityId !== void 0 && !["plugin:director-stage", "plugin:clip-studio"].includes(String(value.capabilityId)) || value.code !== void 0 && (typeof value.code !== "string" || value.code.length > 128))
    throw new Error("INVALID_EDITOR_EVENT");
  return {
    type: value.type,
    subscriptionId: value.subscriptionId,
    serverEpoch: value.serverEpoch,
    ...typeof value.capabilityId === "string" ? { capabilityId: value.capabilityId } : {},
    ...typeof value.code === "string" ? { code: value.code } : {}
  };
}
const DIRECTOR_PROP_ASSET_IDS = [
  "mesh_cube",
  "mesh_sphere",
  "mesh_cylinder",
  "mesh_torus",
  "mesh_cone",
  "mesh_pyramid",
  "mesh_rectangle",
  "mesh_disc",
  "mesh_capsule",
  "mesh_arc",
  "mesh_half_cylinder",
  "chair",
  "stool",
  "armchair",
  "sofa",
  "square_table",
  "desk",
  "round_table",
  "bed",
  "bookshelf",
  "cabinet",
  "wardrobe",
  "tv",
  "wall_tv",
  "floor_lamp",
  "table_lamp",
  "rug",
  "wall",
  "column",
  "staircase",
  "ramp",
  "platform",
  "arch",
  "door",
  "fence",
  "ladder",
  "statue",
  "tree_small",
  "tree_large",
  "rock",
  "bush",
  "potted_plant",
  "stump",
  "flower_bed",
  "car",
  "truck",
  "bicycle",
  "streetlamp",
  "bench",
  "trash_bin",
  "traffic_cone",
  "road_barrier",
  "sign",
  "fire_hydrant",
  "barrel",
  "crate"
];
const DIRECTOR_BODY_TYPES = ["mannequin", "female", "child"];
const bodyScales = {
  mannequin: { x: 1, y: 1, z: 1 },
  female: { x: 0.92, y: 0.92, z: 0.92 },
  child: { x: 0.78, y: 0.66, z: 0.78 }
};
const defaultJoints = {
  body: { bend: 0, turn: 0, tilt: 0 },
  torso: { bend: 2, turn: 0, tilt: 0 },
  head: { nod: -10, turn: 0, tilt: 0 },
  l_arm: { raise: -5, straddle: 12, turn: 0 },
  r_arm: { raise: -5, straddle: 12, turn: 0 },
  l_elbow: { bend: 15, turn: 0 },
  r_elbow: { bend: 15, turn: 0 },
  l_wrist: { bend: 0, turn: 0 },
  r_wrist: { bend: 0, turn: 0 },
  l_leg: { raise: 0, straddle: 0, turn: 0 },
  r_leg: { raise: 0, straddle: 0, turn: 0 },
  l_knee: { bend: 0 },
  r_knee: { bend: 0 },
  l_ankle: { bend: 0 },
  r_ankle: { bend: 0 }
};
const record$5 = (v2) => !!v2 && typeof v2 === "object" && !Array.isArray(v2);
const zero = () => ({ x: 0, y: 0, z: 0 });
const one$3 = () => ({ x: 1, y: 1, z: 1 });
function createDirectorObjects(scene, input) {
  if (!record$5(input) || Object.keys(input).some((key2) => key2 !== "objects") || !Array.isArray(input.objects) || input.objects.length < 1 || input.objects.length > 30)
    throw new Error("INVALID_OBJECTS");
  const next2 = parseEditorScene(scene);
  const ids2 = new Set(
    Object.values(next2).flatMap(
      (value) => Array.isArray(value) ? value.filter(record$5).map((entry) => entry.id) : []
    )
  );
  const edits = [];
  for (const raw2 of input.objects) {
    if (!record$5(raw2) || typeof raw2.id !== "string" || !raw2.id.trim() || raw2.id !== raw2.id.trim() || raw2.id.length > 256 || typeof raw2.label !== "string" || !raw2.label.trim() || raw2.label.length > 256 || !["camera", "character", "prop"].includes(String(raw2.kind)))
      throw new Error("INVALID_OBJECT");
    if (ids2.has(raw2.id)) throw new Error("OBJECT_ID_EXISTS");
    ids2.add(raw2.id);
    const { kind: kind2, id: id2, bodyType = "mannequin", assetId, color: color2, ...changes2 } = raw2;
    if (kind2 !== "character" && ("bodyType" in raw2 || "color" in raw2))
      throw new Error("INVALID_CHARACTER_FIELD");
    if (kind2 !== "prop" && "assetId" in raw2) throw new Error("INVALID_PROP_FIELD");
    let entity;
    if (kind2 === "camera") {
      entity = { ...createDirectorScene().cameras[0], id: id2 };
    } else {
      entity = {
        id: id2,
        position: zero(),
        rotation: zero(),
        scale: one$3(),
        uniformScale: 1,
        visible: true,
        locked: false
      };
      if (kind2 === "character") {
        if (typeof bodyType !== "string" || !DIRECTOR_BODY_TYPES.some((type) => type === bodyType))
          throw new Error("INVALID_BODY_TYPE");
        if (color2 !== void 0 && (typeof color2 !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color2)))
          throw new Error("INVALID_COLOR");
        const jointAngles = structuredClone(defaultJoints);
        if (bodyType === "female") {
          jointAngles.l_arm.straddle = 19;
          jointAngles.r_arm.straddle = 19;
        }
        Object.assign(entity, {
          bodyType,
          color: color2 ?? "#4F8EF7",
          pose: "stand",
          jointAngles,
          scale: { ...bodyScales[bodyType] },
          shadowEnabled: false
        });
      } else {
        if (typeof assetId !== "string" || !DIRECTOR_PROP_ASSET_IDS.some((id22) => id22 === assetId))
          throw new Error("INVALID_ASSET_ID");
        entity.assetId = assetId;
      }
    }
    const key2 = kind2 === "camera" ? "cameras" : kind2 === "character" ? "characters" : "props";
    next2[key2].push(entity);
    edits.push({ ...changes2, kind: kind2, id: id2 });
  }
  return parseEditorScene(editDirectorScene(next2, { changes: edits }));
}

const GENERATION_OPERATION_BY_KIND = {
  image: "generate_image",
  video: "generate_video",
  speech: "generate_speech",
  music: "generate_music"
};
function projectGenerationOperation(kind2) {
  return GENERATION_OPERATION_BY_KIND[kind2];
}
function projectGenerationKindOfResource(kind2) {
  if (kind2 === ProjectResourceKind.IMAGE || kind2 === "image") return "image";
  if (kind2 === ProjectResourceKind.VIDEO || kind2 === "video") return "video";
  return void 0;
}
const PROJECT_GENERATION_MAX_COUNT = 9;
function projectGenerationOutputKey(key2, index2) {
  return index2 === 0 ? key2 : `${key2}_${index2 + 1}`;
}
const PROJECT_ID_SUFFIX_LENGTH = 12;
const PROJECT_ID_PREFIX = {
  resource: "res",
  version: "ver",
  composition: "cmp",
  compositionType: "cty",
  member: "mem",
  task: "tsk"
};
function mintProjectId(kind2) {
  const bytes2 = crypto.getRandomValues(new Uint8Array(PROJECT_ID_SUFFIX_LENGTH / 2));
  const suffix = Array.from(bytes2, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${PROJECT_ID_PREFIX[kind2]}_${suffix}`;
}

const PROJECT_TASK_OPERATIONS = [...PROJECT_GENERATION_OPERATIONS];
const PROJECT_SUBTITLE_FORMATS = ["ass", "srt", "vtt"];
const PROJECT_SUBTITLE_STYLE_PRESETS = [
  "social_safe",
  "minimal",
  "large",
  "top_caption",
  "custom"
];
const TERMINAL_TASK_STATUSES = ["completed", "failed", "cancelled"];
const TASK_VIEW_STATUSES = [
  "accepted",
  "running",
  "waiting_user",
  "unknown",
  ...TERMINAL_TASK_STATUSES
];
function billingRechecking(task2) {
  return task2.problem?.code === "BILLING_UNAVAILABLE" && task2.status !== "waiting_user" && !TERMINAL_TASK_STATUSES.includes(task2.status);
}
const TASK_PROGRESS_PHASES = [
  "pending",
  "queued",
  "active",
  "paused",
  "retrying",
  "stopped",
  "done"
];

const TASK_PROBLEM_CODES = {
  INVALID_ARGUMENT: {
    source: "input",
    recovery: "none",
    message: "Generation input was rejected before model submission; check the model parameters and reference media"
  },
  UNSUPPORTED_OPERATION: {
    source: "input",
    recovery: "none",
    message: "Model does not expose asynchronous generation for this media type"
  },
  CLIENT_UPGRADE_REQUIRED: {
    source: "input",
    recovery: "decision",
    message: "Upgrade the client before creating a new task; no subtask was submitted"
  },
  PROVIDER_REJECTED: {
    source: "provider",
    recovery: "none",
    message: "The provider rejected generation; the task is not running"
  },
  PROVIDER_UNAUTHORIZED: {
    source: "provider",
    recovery: "decision",
    message: "The provider rejected generation authorization; sign in or check model access"
  },
  PROVIDER_FAILED: {
    source: "provider",
    recovery: "retry",
    message: "Provider generation failed"
  },
  PROVIDER_CANCELLED: {
    source: "provider",
    recovery: "retry",
    message: "Provider subtask was cancelled externally"
  },
  PROVIDER_RESULT_INVALID: {
    source: "provider",
    recovery: "none",
    message: "Provider returned an unusable result; change the request and generate again"
  },
  PROVIDER_CONCURRENCY: {
    source: "provider",
    recovery: "auto",
    message: "Model concurrency exceeded before subtask creation"
  },
  PROVIDER_UNAVAILABLE: {
    source: "provider",
    recovery: "auto",
    message: "The provider did not confirm the submission; whether the generation ran is unconfirmed. It is resent with the same submission ID, so it is never charged twice"
  },
  PROVIDER_OUTCOME_UNKNOWN: {
    source: "provider",
    recovery: "retry",
    message: "The provider did not answer an operation that cannot be resent safely; whether it ran and was charged is unconfirmed. A retry runs it again and is billed again"
  },
  PROVIDER_REPAIR_UNAVAILABLE: {
    source: "provider",
    recovery: "none",
    message: "Recorded provider repair is unavailable"
  },
  PROVIDER_REPAIR_FAILED: {
    source: "provider",
    recovery: "retry",
    message: "Provider repair failed"
  },
  BILLING_CONFIRMATION_REQUIRED: {
    source: "billing",
    recovery: "decision",
    message: "Confirm the estimated cost before generation"
  },
  BILLING_INSUFFICIENT: {
    source: "billing",
    recovery: "retry",
    message: "Balance is insufficient; top up, then retry"
  },
  BILLING_UNAVAILABLE: {
    source: "billing",
    recovery: "retry",
    message: "Billing could not be checked after its automatic retries; no new subtask was submitted. Retry resumes the task in place."
  },
  BILLING_REJECTED: {
    source: "billing",
    recovery: "none",
    message: "Pricing rejected the model parameters; no new subtask will be submitted. Already-submitted subtasks are being settled."
  },
  BILLING_WAIT_EXPIRED: {
    source: "billing",
    recovery: "none",
    message: "The cost was not confirmed in time; unsubmitted subtasks were stopped"
  },
  QUOTE_EXPIRED: {
    source: "billing",
    recovery: "decision",
    message: "The cost quote expired; review the refreshed quote"
  },
  RESOURCE_VERSION_CONFLICT: {
    source: "delivery",
    recovery: "decision",
    message: "Resource delivery requires a decision"
  },
  RESOURCE_TARGET_UNAVAILABLE: {
    source: "delivery",
    recovery: "none",
    message: "The target Resource is unavailable; its outputs were not saved"
  },
  COMPOSITION_REVISION_CONFLICT: {
    source: "delivery",
    recovery: "decision",
    message: "The Composition keeps changing; choose a placement"
  },
  COMPOSITION_TARGET_UNAVAILABLE: {
    source: "delivery",
    recovery: "decision",
    message: "The Composition or member is unavailable"
  },
  DELIVERY_STEP_LIMIT: {
    source: "delivery",
    recovery: "retry",
    message: "Delivery did not settle within its step budget"
  },
  PAUSED: {
    source: "system",
    recovery: "decision",
    message: "Unsubmitted compute tasks are paused"
  },
  LOCAL_INTERRUPTED: {
    source: "system",
    recovery: "auto",
    message: "Local process ended before completion"
  },
  PROVIDER_OUTPUT_UNAVAILABLE: {
    source: "system",
    recovery: "auto",
    message: "Generation has finished, but retrieving its output failed; it is retrieved again without generating again."
  },
  MATERIALIZATION_OUTCOME_UNKNOWN: {
    source: "system",
    recovery: "auto",
    message: "Saving the outputs did not complete; it is retried without generating again"
  },
  COMPOSITION_OUTCOME_UNKNOWN: {
    source: "system",
    recovery: "auto",
    message: "Saving the outputs did not complete; it is retried without generating again"
  },
  COMMIT_OUTCOME_UNKNOWN: {
    source: "system",
    recovery: "auto",
    message: "Saving the outputs did not complete; it is retried without generating again"
  },
  /** Any kernel code the table does not declare collapses to this on the wire. */
  INTERNAL_ERROR: {
    source: "system",
    recovery: "retry",
    message: "Task could not proceed; inspect its state before retrying"
  }
};
function isTaskProblemCode(code2) {
  return Object.hasOwn(TASK_PROBLEM_CODES, code2);
}
function taskProblemSource(code2) {
  return TASK_PROBLEM_CODES[code2].source;
}
function taskProblemMessage(code2) {
  return TASK_PROBLEM_CODES[code2].message;
}
function invalid$2() {
  throw new Error("Invalid Task response");
}
function record$4(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid$2();
  return value;
}
function shape(fields2) {
  return (value) => {
    const source = record$4(value);
    const result = {};
    for (const key2 of Object.keys(fields2)) {
      const parsed = fields2[key2](source[key2]);
      if (parsed !== void 0) result[key2] = parsed;
    }
    return result;
  };
}
const text$7 = (v2) => typeof v2 === "string" ? v2 : invalid$2();
const id$1 = (v2) => typeof v2 === "string" && v2.trim() && !v2.includes("\0") ? v2 : invalid$2();
const bool = (v2) => typeof v2 === "boolean" ? v2 : invalid$2();
const number = (v2) => typeof v2 === "number" && Number.isFinite(v2) && v2 >= 0 ? v2 : invalid$2();
const integer = (v2) => Number.isSafeInteger(number(v2)) ? v2 : invalid$2();
const revision$1 = (v2) => integer(v2) >= 1 ? v2 : invalid$2();
const optional = (parse2) => (v2) => v2 === void 0 ? void 0 : parse2(v2);
const nullable = (parse2) => (v2) => v2 === null ? null : parse2(v2);
const array = (parse2) => (v2) => Array.isArray(v2) ? v2.map(parse2) : invalid$2();
const oneOf = (values2) => (v2) => typeof v2 === "string" && values2.includes(v2) ? v2 : invalid$2();
const dictionary = (parse2) => (v2) => Object.fromEntries(Object.entries(record$4(v2)).map(([k2, item]) => [k2, parse2(item)]));
const json = (v2) => {
  if (v2 === null || typeof v2 === "string" || typeof v2 === "boolean") return v2;
  if (typeof v2 === "number" && Number.isFinite(v2)) return v2;
  if (Array.isArray(v2)) return v2.map(json);
  return dictionary(json)(v2);
};
const kind = oneOf(["text", "image", "video", "audio", "file"]);
const operation = oneOf(PROJECT_TASK_OPERATIONS);
const phase = oneOf(TASK_PROGRESS_PHASES);
const reason = nullable(
  oneOf([
    "scheduler",
    "model_capacity",
    "local_capacity",
    "provider_concurrency",
    "provider_queued",
    "provider_submitted",
    "submitting",
    "provider_running",
    "local_processing",
    "billing",
    "identity",
    "dependency_unavailable",
    "provider_unavailable",
    "user_paused",
    "restart_paused",
    "user_stopped",
    "confirmation_expired",
    "delivery",
    "user_action",
    "dependency"
  ])
);
const action = oneOf([
  "pause",
  "resume",
  "stop",
  "confirm_cost",
  "adopt_version",
  "finish_as_candidate",
  "update_placement",
  "finish_without_placement",
  "retry"
]);
const disposition = oneOf(["adopted", "candidate"]);
const media$1 = shape({
  mimeType: text$7,
  sizeBytes: integer,
  width: optional(number),
  height: optional(number),
  durationSeconds: optional(number),
  fps: optional(number)
});
const coverage = shape({
  status: oneOf(["complete", "partial"]),
  reasons: array(oneOf(["indexing", "source_missing", "retention", "dependency_unavailable"])),
  coveredThroughMessageId: optional(nullable(id$1))
});
const output = shape({
  key: id$1,
  ordinal: optional(revision$1),
  name: text$7,
  kind,
  resourceId: id$1,
  versionId: id$1,
  disposition,
  availability: oneOf(["available", "missing", "unavailable"]),
  media: optional(media$1),
  voiceId: optional(id$1),
  // Gateway session-freshness bookkeeping; clients never act on it.
  committedState: () => void 0
});
const placement = shape({
  key: id$1,
  compositionId: id$1,
  memberId: id$1,
  resourceId: id$1,
  status: oneOf(["pending", "applied", "conflict", "skipped"]),
  appliedRevision: optional(integer)
});
const conflict = (v2) => {
  switch (record$4(v2).type) {
    case "task_revision":
      return shape({
        type: oneOf(["task_revision"]),
        taskId: id$1,
        expectedRevision: revision$1,
        actualRevision: revision$1
      })(v2);
    case "resource_version":
      return shape({
        type: oneOf(["resource_version"]),
        resourceId: id$1,
        expectedVersionId: nullable(id$1),
        actualVersionId: nullable(id$1)
      })(v2);
    case "composition_revision":
      return shape({
        type: oneOf(["composition_revision"]),
        compositionId: id$1,
        expectedRevision: integer,
        actualRevision: integer
      })(v2);
    default:
      return invalid$2();
  }
};
const taskProblem = shape({
  key: optional(id$1),
  source: oneOf(["input", "provider", "billing", "delivery", "system"]),
  code: (v2) => typeof v2 === "string" && isTaskProblemCode(v2) ? v2 : invalid$2(),
  message: text$7,
  upstream: optional(shape({ code: id$1, userMessage: optional(text$7) })),
  conflict: optional(conflict)
});
function parseTaskProblem(value) {
  const result = taskProblem(value);
  if (result.source !== taskProblemSource(result.code)) invalid$2();
  return result;
}
const parseTaskRequestError = shape({
  code: id$1,
  message: text$7,
  retryable: bool,
  conflict: optional(conflict)
});
const progress = shape({
  phase,
  reason,
  since: integer,
  queuedAt: nullable(integer),
  submittedAt: nullable(integer),
  startedAt: nullable(integer),
  percent: nullable((v2) => number(v2) <= 100 ? number(v2) : invalid$2()),
  position: nullable(integer),
  etaSeconds: nullable(number),
  nextRetryAt: nullable(integer),
  retryCount: optional(integer),
  subtasks: array(
    shape({
      key: id$1,
      resource: oneOf(["model", "local"]),
      modelId: nullable(id$1),
      phase,
      reason,
      since: integer,
      nextRetryAt: nullable(integer),
      retryCount: optional(integer)
    })
  )
});
const billing = shape({
  estimatedCredits: nullable(number),
  refund: shape({
    status: oneOf(["none", "pending", "refunded", "unknown"]),
    credits: nullable(number)
  }),
  confirmation: nullable(
    shape({
      id: id$1,
      kind: oneOf(["threshold", "insufficient"]),
      estimatedCredits: number,
      expiresAt: integer,
      thresholdCredits: nullable(number),
      currentCredits: nullable(number),
      shortfallCredits: nullable(number),
      batch: nullable(shape({ credits: number, taskIds: array(id$1) }))
    })
  )
});
const origin = shape({
  source: oneOf(["frontend", "agent"]),
  sessionId: optional(id$1),
  userMessageId: optional(id$1),
  chatTurnId: optional(id$1),
  toolUseId: optional(id$1),
  callIndex: optional(integer)
});
const task = shape({
  id: id$1,
  capabilityId: id$1,
  compositionId: optional(id$1),
  prompt: optional(text$7),
  aspectRatio: optional(text$7),
  artifacts: optional(array(shape({ key: id$1, id: id$1, kind }))),
  operation,
  status: oneOf(TASK_VIEW_STATUSES),
  terminal: bool,
  stage: oneOf(["compute", "materialize", "resource", "composition"]),
  revision: revision$1,
  createdAt: integer,
  updatedAt: integer,
  origin,
  outputs: array(output),
  placements: array(placement),
  data: json,
  problem: nullable(parseTaskProblem),
  actions: array(action),
  handoff: nullable(
    shape({ target: oneOf(["canvas"]), at: integer, chatTurnId: optional(id$1) })
  ),
  progress,
  billing: nullable(billing)
});
function parseTaskView(value) {
  const result = task(value);
  if (result.terminal !== TERMINAL_TASK_STATUSES.includes(result.status))
    invalid$2();
  if (result.terminal && result.actions.some((item) => item !== "retry")) invalid$2();
  return result;
}
const resourceTarget = (v2) => record$4(v2).mode === "create" ? shape({
  key: id$1,
  mode: oneOf(["create"]),
  name: text$7,
  description: optional(text$7),
  resourceId: optional(id$1)
})(v2) : shape({
  key: id$1,
  mode: oneOf(["new_version"]),
  resourceId: id$1,
  baseVersionId: optional(id$1),
  disposition: optional(disposition)
})(v2);
const placementTarget = (v2) => record$4(v2).memberId === void 0 ? shape({ key: id$1, role: text$7 })(v2) : shape({ key: id$1, memberId: id$1, replaceResourceId: optional(id$1) })(v2);
const compositionPlacement = (v2) => {
  const value = record$4(v2);
  const keys2 = Object.keys(value);
  if (keys2.length !== 1) return invalid$2();
  if (keys2[0] === "after") return { after: id$1(value.after) };
  if (keys2[0] === "before") return { before: id$1(value.before) };
  return invalid$2();
};
const compositionPosition = (v2) => integer(v2) <= COMPOSITION_POSITION_MAX ? v2 : invalid$2();
const composition = (v2) => {
  const value = record$4(v2);
  if (value.compositionId !== void 0)
    return shape({ compositionId: id$1, placements: array(placementTarget) })(v2);
  if (value.position !== void 0 && value.placement !== void 0) return invalid$2();
  return shape({
    type: (v22) => {
      const type = record$4(v22);
      return type.id === void 0 ? shape({ label: id$1, description: optional(text$7) })(v22) : shape({ id: id$1, label: optional(text$7), description: optional(text$7) })(v22);
    },
    name: text$7,
    attributes: optional(dictionary(text$7)),
    position: optional(compositionPosition),
    placement: optional(compositionPlacement),
    placements: array(placementTarget)
  })(v2);
};
const parseTaskRead = shape({
  task: parseTaskView,
  serverTaskIds: optional(array(id$1)),
  // The decoder already narrows references to the recorded form: admission
  // resolved every selector before the Task was written. `null` is a slot the
  // request left open on purpose (a video given only its last frame).
  input: shape({
    prompt: optional(text$7),
    params: optional(dictionary(json)),
    references: optional(array(nullable(shape({ versionId: id$1, resourceId: optional(id$1) })))),
    // The range belongs to the field, not to whoever happens to read it.
    count: optional(
      (v2) => integer(v2) >= 1 && integer(v2) <= PROJECT_GENERATION_MAX_COUNT ? integer(v2) : invalid$2()
    )
  }),
  output: shape({
    nameSource: optional(oneOf(["provider"])),
    resources: array(resourceTarget),
    composition: optional(composition)
  })
});
const parseTaskSubmitResult = shape({ task: parseTaskView, reused: bool });
const parseTaskResolveResult = shape({ task: parseTaskView });
const parseTaskList = shape({
  items: array(parseTaskView),
  nextCursor: nullable(id$1),
  coverage
});
const counts = shape({
  pending: integer,
  queued: integer,
  active: integer,
  paused: integer,
  waitingUser: integer,
  reconciling: integer
});
const parseTaskQueue = shape({
  tasks: counts,
  subtasks: array(
    shape({ resource: oneOf(["model", "local"]), modelId: nullable(id$1), counts })
  ),
  concurrency: array(
    shape({
      modelId: id$1,
      limit: nullable(integer),
      cloudUsed: nullable(integer),
      localHeld: nullable(integer),
      observedAt: nullable(integer)
    })
  ),
  updatedAt: integer,
  coverage
});
function parseTaskServerMessage(value) {
  const data2 = record$4(value);
  const subscriptionId = id$1(data2.subscriptionId);
  switch (data2.type) {
    case "project_changed": {
      if (!Array.isArray(data2.domains) || data2.domains.length < 1 || data2.domains.length > 2)
        return invalid$2();
      const domains = array(oneOf(["resources", "compositions"]))(data2.domains);
      return { type: data2.type, subscriptionId, domains: [...new Set(domains)] };
    }
    case "task_subscription_ready":
      if (data2.capabilities !== void 0 && (!Array.isArray(data2.capabilities) || data2.capabilities.length > 32 || data2.capabilities.some((capability) => typeof capability !== "string")))
        return invalid$2();
      return {
        type: data2.type,
        subscriptionId,
        ...data2.capabilities === void 0 ? {} : {
          capabilities: data2.capabilities.includes("project_changes") ? ["project_changes"] : []
        }
      };
    case "task_subscription_closed":
      return { type: data2.type, subscriptionId };
    case "task_changed":
      return { type: data2.type, subscriptionId, id: id$1(data2.id), task: parseTaskView(data2.task) };
    case "task_subscription_error":
      return { type: data2.type, subscriptionId, error: parseTaskRequestError(data2.error) };
    default:
      return invalid$2();
  }
}
const PROJECT_VIDEO_ENHANCE_RESOLUTIONS = ["720p", "1080p", "2k", "4k"];
const PROJECT_VIDEO_ENHANCE_FPS = [30, 60];
const PROJECT_VIDEO_ERASE_SUBTITLE_MODES = ["Subtitle", "Text"];
function normalizeVideoEraseSubtitleParams(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Erase subtitle params must be an object");
  const params = value;
  const mode2 = params.mode === void 0 ? "Subtitle" : params.mode;
  if (mode2 !== "Subtitle" && mode2 !== "Text")
    throw new Error("Erase subtitle mode must be Subtitle or Text");
  const regions = params.regions === void 0 ? [] : params.regions;
  if (!Array.isArray(regions)) throw new Error("Erase subtitle regions must be an array");
  if (mode2 === "Subtitle" && regions.length)
    throw new Error("Subtitle mode must not carry regions");
  if (mode2 === "Text" && !regions.length) throw new Error("Text mode requires at least one region");
  const fields2 = ["top_left_x", "top_left_y", "bottom_right_x", "bottom_right_y"];
  const normalized = Array.from(regions, (region, index2) => {
    const invalid2 = () => new Error(`regions[${index2}] must contain four finite numbers satisfying 0 <= tl < br <= 1`);
    if (!region || typeof region !== "object" || Array.isArray(region)) throw invalid2();
    const box2 = region;
    if (fields2.some((key2) => typeof box2[key2] !== "number" || !Number.isFinite(box2[key2])))
      throw invalid2();
    const { top_left_x, top_left_y, bottom_right_x, bottom_right_y } = box2;
    if (!(0 <= top_left_x && top_left_x < bottom_right_x && bottom_right_x <= 1 && 0 <= top_left_y && top_left_y < bottom_right_y && bottom_right_y <= 1))
      throw invalid2();
    return { top_left_x, top_left_y, bottom_right_x, bottom_right_y };
  });
  return { mode: mode2, regions: normalized };
}



// ==================== 原 canvas-v3-client.js ====================

/**
 * v3 画布：客户端装配 + 契约/工厂/选择器一族 —— 从产物主包取回（第 91/93 轮）。
 *
 * 173 条声明、3117 行，含 `createCanvasV3Client`（61 行）、`createCanvasV3ResourcePicker`、
 * `canvasV3MediaKind`，以及它们依赖的纯函数/常量（`formatSeconds` / `findFreePosition*` /
 * `aspectRatioNodeSize` / `validateCanvasV3ResourceReference` 等）。
 *
 * 抽取时踩过一个坑：抽取器**不认正则字面量**（`/\.(mp4|mov)/` 里的括号），
 * 导致一度误判 `createCanvasV3Client` 有 75,653 行 —— 实际 61 行。补上正则处理后正常。
 *
 * 只搬实现，未改语义。
 */
import { CanvasMode, TEXT_CARD_DEFAULT_SIZE, VIDEO_EMPTY_CARD_SIZE, computeNodeSize, defaultNodeSizeForType, isIdleEmptyVideoNode, parseAspectRatio } from "../canvas/compute-group-bounds-from-children.js";
import { CanvasNodeType } from "../canvas/canvas-geometry.js";
import { REFERENCE_PROMPT_PREAMBLE, REFERENCE_TEXT_CLOSE, REFERENCE_TEXT_OPEN, USER_PROMPT_CLOSE, USER_PROMPT_OPEN } from "../canvas/is-reexecutable-generation-node.js";
import { computeDerivedNodePosition } from "../canvas/resolve-derived-collision.js";
import { findFreePositionForRects } from "../canvas/find-free-position-for-rects.js";
import { findFreePositionFromAnchor } from "../canvas/find-free-position-from-anchor.js";
import { formatSeconds } from "../assets/preview-media.jsx";
import { isWorkspaceIdentityErrorCode } from "../infra/workspace-gateway.js";
import { placeholderNodeSize } from "../canvas/placeholder-node-size.js";
import { CANVAS_V3_ROUTES, ProjectResourceKind, ProjectResourceLifecycle, ProjectResourceSource, ProjectResourceVersionStatus, ProjectResourceReadErrorCode } from "./canvas-v3-constants.js";
export { CANVAS_V3_ROUTES, ProjectResourceKind, ProjectResourceLifecycle, ProjectResourceSource, ProjectResourceVersionStatus, ProjectResourceReadErrorCode };

export {  };

function createCanvasV3SubjectLayout() {
  return {
    preset: "board",
    columns: 3,
    sections: [{ id: SUBJECT_DEFAULT_SECTION, title: "", resources: [] }],
    spans: [],
    rows: []
  };
}











































































function createCanvasV3ContentTransport(request) {
  return {
    async readContent(compositionIds, signal) {
      const response = await request(CANVAS_V3_ROUTES.content, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compositionIds }),
        signal
      });
      if (!response.ok) throw new Error(`CANVAS_V3_CONTENT_FAILED: ${response.status}`);
      return parseCanvasV3ContentBatch(await response.json());
    }
  };
}

function canvasV3ResourcePresentationKind(resource2) {
  return resource2 ? contentPresentationKind(resource2.kind, resource2.name, resource2.subtitleFormat) : null;
}

function canvasV3SubjectPosition(document2, size2 = CANVAS_V3_SUBJECT_PREVIEW_SIZE, options2) {
  const origin2 = options2?.anchor ?? (() => {
    const file = placementFile(document2, options2?.exclude, true);
    return findFreePosition(file.nodes, file.mode, subjectOuterSize(size2));
  })();
  return {
    x: origin2.x + CANVAS_V3_SUBJECT_TYPE_PADDING,
    y: origin2.y + CANVAS_V3_SUBJECT_TYPE_HEADER
  };
}

function canvasV3PlacementDocument(document2, sourceId, bounds) {
  const source = document2.nodes[sourceId];
  if (!bounds || !source) return document2;
  return {
    ...document2,
    nodes: {
      ...document2.nodes,
      [sourceId]: { ...source, parentId: null, position: bounds.position, size: bounds.size }
    }
  };
}

function canvasV3PlacementFile(document2, exclude) {
  return placementFile(document2, exclude);
}

function canvasV3GridPosition(document2, size2, exclude) {
  const file = canvasV3PlacementFile(document2, exclude);
  return findFreePosition(file.nodes, file.mode, { width: size2.width, height: size2.height });
}

function canvasV3GridPositions(document2, items, exclude) {
  const working = { ...document2, nodes: { ...document2.nodes } };
  const positions = [];
  for (const item of items) {
    const position2 = canvasV3GridPosition(working, item.size, exclude);
    positions.push(position2);
    working.nodes[item.nodeId] = {
      id: item.nodeId,
      kind: "placeholder",
      expectedKind: "image",
      draft: null,
      parentId: null,
      hidden: false,
      zIndex: 0,
      position: position2,
      size: { ...item.size }
    };
  }
  return positions;
}

function canvasV3DerivedPosition(document2, sourceIds, size2, exclude) {
  const file = canvasV3PlacementFile(document2, exclude);
  const ids2 = typeof sourceIds === "string" ? [sourceIds] : [...sourceIds];
  const newSize = { width: size2.width, height: size2.height };
  return resolveDerivedOrFreePosition(file, ids2, file.mode, newSize, { verticalStacking: true });
}

function canvasV3DerivedPositions(document2, sourceId, items, exclude) {
  const working = {
    ...document2,
    nodes: { ...document2.nodes },
    edges: { ...document2.edges }
  };
  const positions = [];
  for (const item of items) {
    const position2 = canvasV3DerivedPosition(working, sourceId, item.size, exclude);
    positions.push(position2);
    working.nodes[item.nodeId] = {
      id: item.nodeId,
      kind: "placeholder",
      expectedKind: "image",
      draft: null,
      parentId: null,
      hidden: false,
      zIndex: 0,
      position: position2,
      size: { ...item.size }
    };
    const edgeId = `placement:${item.nodeId}`;
    working.edges[edgeId] = { id: edgeId, source: sourceId, target: item.nodeId };
  }
  return positions;
}

function canvasV3ReferenceInsertionPositions(document2, targetId, sizes) {
  if (!sizes.length) return [];
  const absolute = (node2) => {
    let { x: x2, y: y4 } = node2.position;
    const seen = /* @__PURE__ */ new Set([node2.id]);
    for (let parentId = node2.parentId; parentId && !seen.has(parentId); ) {
      seen.add(parentId);
      const parent = document2.nodes[parentId];
      if (!parent) break;
      x2 += parent.position.x;
      y4 += parent.position.y;
      parentId = parent.parentId;
    }
    return { x: x2, y: y4 };
  };
  const boxes = /* @__PURE__ */ new Map();
  for (const node2 of Object.values(document2.nodes)) {
    if (node2.hidden) continue;
    const position2 = absolute(node2);
    boxes.set(node2.id, {
      x: -position2.x - node2.size.width,
      y: position2.y,
      w: node2.size.width,
      h: node2.size.height
    });
  }
  const target = boxes.get(targetId);
  if (!target) throw new Error("reference_target_unavailable");
  const source = { x: target.x, y: target.y, width: target.w, height: target.h };
  const upstream = new Set(
    Object.values(document2.edges).filter((edge) => edge.target === targetId).map((edge) => edge.source)
  );
  const peers = [];
  const occupied = [];
  for (const [id2, box2] of boxes) {
    if (id2 === targetId) continue;
    occupied.push(box2);
    if (upstream.has(id2)) peers.push({ x: box2.x, y: box2.y, width: box2.w, height: box2.h });
  }
  return sizes.map((size2) => {
    const position2 = computeDerivedNodePosition(
      source,
      peers,
      void 0,
      {
        occupied,
        newSize: { width: size2.width, height: size2.height },
        preferAxis: "y",
        budgetOrigin: { x: source.x, y: source.y }
      },
      true
    );
    occupied.push({ ...position2, w: size2.width, h: size2.height });
    peers.push({ ...position2, width: size2.width, height: size2.height });
    return { x: -position2.x - size2.width, y: position2.y };
  });
}

function canvasV3DodgePosition(document2, anchor2, size2, exclude) {
  return dodgePlacementFile(canvasV3PlacementFile(document2, exclude), anchor2, size2);
}

function canvasV3NaturalMediaSize(width, height) {
  if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    return void 0;
  return width >= height ? { width: NODE_SIZE_MAX, height: NODE_SIZE_MAX * height / width } : { width: NODE_SIZE_MAX * width / height, height: NODE_SIZE_MAX };
}

function canvasV3ImportSize(input) {
  const { mediaKind: mediaKind2 } = input;
  if (mediaKind2 === "image")
    return canvasV3NaturalMediaSize(input.width, input.height) ?? {
      ...CANVAS_V3_DEFAULT_NODE_SIZES.image
    };
  if (mediaKind2 === "video")
    return canvasV3NaturalMediaSize(input.width, input.height) ?? computeNodeSize(16, 9) ?? { ...CANVAS_V3_DEFAULT_NODE_SIZES.video };
  if (mediaKind2 === "audio")
    return { width: CANVAS_V3_DEFAULT_NODE_SIZES.audio.width, height: 128 };
  if (mediaKind2 === "text") return { ...CANVAS_V3_DEFAULT_NODE_SIZES.text };
  if (mediaKind2 === "table") return { ...CANVAS_V3_DEFAULT_NODE_SIZES.table };
  if (/\.html?$/i.test(input.name ?? "")) return { ...FILE_PREVIEW_SIZE };
  return { ...FILE_CARD_DEFAULT_SIZE };
}

function canvasV3ImportCommand(document2, inputs) {
  const d2 = parseCanvasV3Document(document2);
  const seen = /* @__PURE__ */ new Set();
  const items = [];
  for (const input of inputs) {
    if (seen.has(input.nodeId)) throw new Error(`Duplicate import target: ${input.nodeId}`);
    seen.add(input.nodeId);
    const before = Object.hasOwn(d2.nodes, input.nodeId) ? d2.nodes[input.nodeId] : null;
    if (before && before.kind !== "composition" && before.kind !== "placeholder")
      throw new Error("Import target must be a content node");
    if (before?.kind === "placeholder" && before.expectedKind !== input.mediaKind)
      throw new Error("Import target kind does not match the file");
    const defaults2 = input.mediaKind === "file" ? FILE_CARD_DEFAULT_SIZE : CANVAS_V3_DEFAULT_NODE_SIZES[input.mediaKind];
    const natural = canvasV3ImportSize(input);
    const item = {
      nodeId: input.nodeId,
      resourceId: input.resourceId,
      versionId: input.versionId
    };
    if (!before)
      item.placement = {
        parentId: input.parentId ?? null,
        position: input.position,
        size: natural,
        zIndex: 0
      };
    else if (before.kind === "placeholder" && canvasV3Equal(before.size, defaults2))
      item.size = natural;
    if (input.edges?.length) item.edges = input.edges.map((edge) => ({ ...edge }));
    items.push(item);
  }
  return items.length ? { type: "content.import", items } : null;
}

function canvasV3SetActiveItemPatch(document2, nodeId, activeItem, options2) {
  const d2 = parseCanvasV3Document(document2);
  const before = Object.hasOwn(d2.nodes, nodeId) ? d2.nodes[nodeId] : null;
  if (before?.kind !== "composition") throw new Error("Active item target must be a content node");
  if (canvasV3ItemRefEqual(before.activeItem, activeItem) && !before.pendingGeneration) return null;
  const { pendingGeneration: _pendingGeneration, ...rest } = before;
  return {
    type: "canvas.patch",
    nodes: [
      {
        id: nodeId,
        before,
        after: {
          ...rest,
          activeItem,
          ...options2?.discardGenerationDraft ? { draft: null } : {}
        }
      }
    ],
    edges: []
  };
}

function canvasV3HistorySelection(node2, resourceId2) {
  if (node2?.kind !== "composition" && node2?.kind !== "placeholder") return null;
  if (node2.kind === "composition" && isCanvasV3Subject(node2) && resourceId2)
    return node2.memberSelections?.[resourceId2] ?? null;
  if (node2.pendingGeneration) return { type: "generation-request", ...node2.pendingGeneration };
  return node2.kind === "composition" ? node2.activeItem : null;
}

function canvasV3SetHistorySelectionPatch(document2, nodeId, selection2, options2) {
  const d2 = parseCanvasV3Document(document2);
  const before = d2.nodes[nodeId];
  if (before?.kind !== "composition" && before?.kind !== "placeholder")
    throw new Error("History selection target must be a content node");
  if (before.kind === "composition" && isCanvasV3Subject(before) && options2?.resourceId) {
    if (canvasV3Equal(before.memberSelections?.[options2.resourceId] ?? null, selection2))
      return null;
    if (selection2?.type === "version" && selection2.resourceId !== options2.resourceId)
      throw new Error("History selection must belong to the member Resource");
    const memberSelections = { ...before.memberSelections };
    if (selection2) memberSelections[options2.resourceId] = selection2;
    else delete memberSelections[options2.resourceId];
    return {
      type: "canvas.patch",
      nodes: [{ id: nodeId, before, after: { ...before, memberSelections } }],
      edges: []
    };
  }
  if (selection2?.type !== "generation-request" && before.kind === "composition")
    return canvasV3SetActiveItemPatch(d2, nodeId, selection2, options2);
  if (canvasV3Equal(canvasV3HistorySelection(before), selection2)) return null;
  if (selection2 && selection2.type !== "generation-request")
    throw new Error("A placeholder cannot select a materialized version");
  const { pendingGeneration: _pending, ...rest } = before;
  return {
    type: "canvas.patch",
    nodes: [
      {
        id: nodeId,
        before,
        after: {
          ...rest,
          ...selection2 ? {
            pendingGeneration: {
              requestId: selection2.requestId,
              outputKey: selection2.outputKey
            }
          } : {}
        }
      }
    ],
    edges: []
  };
}

function canvasV3ResolveHistoryRequestPatch(document2, requestId, resolve) {
  const nodes = [];
  for (const before of Object.values(document2.nodes)) {
    if (before.kind !== "composition") continue;
    let after = before;
    if (before.pendingGeneration?.requestId === requestId) {
      const ref = resolve(before.pendingGeneration.outputKey);
      if (ref) {
        const { pendingGeneration: _pending, ...rest } = after;
        after = { ...rest, activeItem: ref };
      }
    }
    for (const [resourceId2, selection2] of Object.entries(before.memberSelections ?? {})) {
      if (selection2.type !== "generation-request" || selection2.requestId !== requestId) continue;
      const ref = resolve(selection2.outputKey);
      if (!ref || ref.type === "version" && ref.resourceId !== resourceId2) continue;
      after = { ...after, memberSelections: { ...after.memberSelections, [resourceId2]: ref } };
    }
    if (after !== before) nodes.push({ id: before.id, before, after });
  }
  return nodes.length ? { type: "canvas.patch", nodes, edges: [] } : null;
}

function canvasV3RenameCommand(document2, nodeId, title) {
  const d2 = parseCanvasV3Document(document2);
  const node2 = Object.hasOwn(d2.nodes, nodeId) ? d2.nodes[nodeId] : null;
  if (!node2) return null;
  if (node2.kind === "frame") {
    if (node2.title === title) return null;
    return {
      type: "canvas.patch",
      nodes: [{ id: nodeId, before: node2, after: { ...node2, title } }],
      edges: []
    };
  }
  if (node2.kind !== "composition" || !title.trim()) return null;
  return { type: "content.rename", nodeId, title };
}

function canvasV3StartGenerationCommand(document2, nodeId, draft, outputCompositionId) {
  const d2 = parseCanvasV3Document(document2);
  const before = Object.hasOwn(d2.nodes, nodeId) ? d2.nodes[nodeId] : null;
  if (!before || before.kind === "frame")
    throw new Error("Generation target must be an image, video or audio node");
  if (before.kind === "placeholder" && before.expectedKind !== "image" && before.expectedKind !== "video" && before.expectedKind !== "audio")
    throw new Error("Generation target must be an image, video or audio node");
  return {
    type: "generation.start",
    nodeId,
    draft,
    ...outputCompositionId ? { outputCompositionId } : {}
  };
}

function canvasV3GenerationNodeSize(kind2, draft, ratioHint) {
  if (kind2 === "audio") return { ...CANVAS_V3_DEFAULT_NODE_SIZES.audio };
  return aspectRatioNodeSize(requestedAspectRatio(draft?.params)) ?? computeNodeSize(ratioHint?.width, ratioHint?.height) ?? {
    ...CANVAS_V3_DEFAULT_NODE_SIZES[kind2]
  };
}

function canvasV3DeriveGenerationCommand(document2, source, nodeId, edgeId, expectedKind, draft, ratioHint) {
  const d2 = parseCanvasV3Document(document2);
  if (!Object.hasOwn(d2.nodes, source.id)) throw new Error("CANVAS_V3_REFERENCE_NOT_READY");
  if (Object.hasOwn(d2.nodes, nodeId) || Object.hasOwn(d2.edges, nodeId))
    throw new Error("Derived node ID already exists");
  const size2 = canvasV3GenerationNodeSize(expectedKind, draft, ratioHint);
  const placementDocument = canvasV3PlacementDocument(d2, source.id, source.placementBounds);
  const create2 = {
    expectedKind,
    parentId: null,
    position: canvasV3DerivedPosition(placementDocument, source.id, size2),
    size: size2,
    zIndex: source.zIndex + 1,
    ...edgeId ? { edges: [{ id: edgeId, source: source.id }] } : {}
  };
  return { type: "generation.start", nodeId, draft, create: create2 };
}

function canvasV3ReadySource(view2) {
  return view2?.state === "ready" && view2.resourceId && view2.versionId && view2.mediaKind ? view2 : null;
}

function canvasV3ResolveNode(editor2, content2, nodeId) {
  const node2 = editor2.getSnapshot().document.nodes[nodeId];
  if (node2?.kind !== "composition") return null;
  return resolveCanvasV3Node(node2, content2.getSnapshot().get(node2.compositionId));
}

function canvasV3ResolveSource(editor2, content2, nodeId) {
  return canvasV3ReadySource(canvasV3ResolveNode(editor2, content2, nodeId));
}

function canvasV3ContentPath(reference, download = false) {
  return `${CANVAS_V3_ROUTES.previews}/${encodeURIComponent(reference.resourceId)}/${encodeURIComponent(reference.versionId)}${download ? "?download=1" : ""}`;
}

function parseCanvasV3ContentPath(path2) {
  const prefix = `${CANVAS_V3_ROUTES.previews}/`;
  if (!path2.startsWith(prefix)) return void 0;
  const [pathname, query = ""] = path2.slice(prefix.length).split("?");
  const parts = pathname.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return void 0;
  try {
    return {
      resourceId: decodeURIComponent(parts[0]),
      versionId: decodeURIComponent(parts[1]),
      download: query === "download=1"
    };
  } catch {
    return void 0;
  }
}

function canvasV3ImagePath(reference, download = false) {
  return canvasV3ContentPath({ ...reference }, download);
}

function canvasV3ClipboardContent(view2) {
  if (view2.containerKind !== "subject" && (view2.state !== "ready" || view2.item?.state !== "ready" || !view2.item.resourceId || !view2.item.versionId || !view2.item.kind))
    throw new Error("CANVAS_V3_CLIPBOARD_CONTENT_INCOMPLETE");
  if (view2.containerKind === "subject" && (view2.subjectGenerating || view2.protected || !view2.members || view2.members.some(
    (member2) => member2.resource !== null && !view2.items.some(
      (item) => item.resourceId === member2.resource && item.state === "ready" && item.isCurrent
    )
  )))
    throw new Error("CANVAS_V3_CLIPBOARD_SUBJECT_INCOMPLETE");
  const items = view2.containerKind === "subject" ? [
    ...new Map(
      view2.items.filter((item) => item.state === "ready").map((item) => [item.resourceId, item])
    ).values()
  ].map(
    (fallback) => view2.items.find(
      (item) => item.resourceId === fallback.resourceId && canvasV3ItemRefEqual(item.ref, view2.item?.ref ?? null)
    ) ?? view2.items.find(
      (item) => item.resourceId === fallback.resourceId && item.state === "ready" && item.isCurrent
    ) ?? fallback
  ) : [required(view2.item)];
  return {
    // Raw Composition name: an unnamed source must paste as unnamed, not as its file name.
    title: view2.compositionTitle ?? view2.title,
    ...view2.compositionRevision !== void 0 ? { compositionRevision: view2.compositionRevision } : {},
    ...view2.containerKind === "subject" && view2.members ? {
      members: view2.members.map((member2) => ({
        ...member2,
        resource: items.some((item) => item.resourceId === member2.resource) ? member2.resource : null
      }))
    } : {},
    items: items.flatMap(
      (item) => item.state === "ready" && item.resourceId && item.versionId && item.kind ? [
        {
          ref: item.ref,
          resourceId: item.resourceId,
          versionId: item.versionId,
          name: item.name ?? view2.title ?? item.kind,
          kind: item.kind
        }
      ] : []
    )
  };
}

const canvasV3ReferenceToken = (versionId) => `@<canvas-v3:${encodeURIComponent(versionId)}>`;

function canvasV3PromptMentions(prompt) {
  return [...prompt.matchAll(TOKEN)].map((match2) => {
    let versionId;
    try {
      versionId = decodeURIComponent(match2[1]);
    } catch {
      versionId = match2[1];
    }
    return { versionId, from: match2.index, to: match2.index + match2[0].length };
  });
}

function canvasV3FrameReferences(upstream, explicit, excluded = []) {
  const seen = /* @__PURE__ */ new Set();
  const connected = upstream.filter((ref) => {
    if (excluded.includes(ref.versionId) || seen.has(ref.versionId)) return false;
    seen.add(ref.versionId);
    return true;
  });
  return [
    ...connected,
    ...explicit.filter((ref) => {
      if (!seen.has(ref.versionId)) return true;
      seen.delete(ref.versionId);
      return false;
    })
  ];
}

function parseCanvasV3DocumentWriteResult(value, expected) {
  if (!isObject(value) || value.requestId !== expected.requestId || !isObject(value.resource))
    return void 0;
  const resource2 = value.resource;
  const metadata = media(resource2.media);
  if (resource2.kind !== (expected.kind ?? "text") || !isId$4(resource2.resourceId) || !isId$4(resource2.versionId) || resource2.contentRevision !== void 0 && (!isCount$1(resource2.contentRevision) || resource2.contentRevision < 1) || typeof resource2.name !== "string" || !isCount$1(resource2.lines) || !metadata || expected.resourceId !== void 0 && resource2.resourceId !== expected.resourceId)
    return void 0;
  return {
    requestId: expected.requestId,
    resource: {
      resourceId: resource2.resourceId,
      versionId: resource2.versionId,
      ...resource2.contentRevision === void 0 ? {} : { contentRevision: resource2.contentRevision },
      name: resource2.name,
      kind: expected.kind ?? "text",
      media: metadata,
      lines: resource2.lines
    }
  };
}

function canvasV3DerivedMembersCommand(document2, nodeId, items) {
  const node2 = document2.nodes[nodeId];
  if (node2?.kind !== "composition" || !items.length)
    throw new Error("CANVAS_V3_IMPORT_TARGET_CHANGED");
  const add2 = { type: "subject.add-members", nodeId, items };
  return node2.containerKind === "subject" || node2.subjectLayout ? add2 : { type: "canvas.batch", commands: [{ type: "subject.convert", nodeId }, add2] };
}

function canvasV3MediaKind(file) {
  if (/^audio\//i.test(file.type)) return "audio";
  if (/^video\//i.test(file.type)) return "video";
  if (/\.(mp4|mov|webm|m4v|mkv|avi|wmv|flv|mpeg|mpg|m2ts|ts)$/i.test(file.name)) return "video";
  if (/\.(mp3|wav|m4a|aac|ogg|oga|opus|weba|flac)$/i.test(file.name)) return "audio";
  return null;
}

const canvasV3ReferencePath = (ref) => `${CANVAS_V3_ROUTES.previews}/${encodeURIComponent(ref.resourceId)}/${encodeURIComponent(ref.versionId)}`;

// [tdz] resourceKinds 上移（原第 5179 行，被第 4290 行引用）
const resourceKinds = {
  image: ProjectResourceKind.IMAGE,
  video: ProjectResourceKind.VIDEO,
  audio: ProjectResourceKind.AUDIO,
  text: ProjectResourceKind.TEXT_DOCUMENT,
  table: ProjectResourceKind.TEXT_DOCUMENT,
  file: ProjectResourceKind.FILE
};

const canvasV3PickerKind = (kind2, relativePath) => kind2 === ProjectResourceKind.TEXT_DOCUMENT && /\.htable$/i.test(relativePath ?? "") ? "table" : Object.keys(resourceKinds).find(
  (key2) => resourceKinds[key2] === kind2
);

function canvasV3PromptReferences(refs) {
  return refs.map(promptReference);
}

function createCanvasV3ResourcePicker(fetch2, kinds = ["image"]) {
  const resources = createProjectResourceClient(fetch2);
  const live = (signal) => {
    if (signal.aborted) throw new Error("CANVAS_V3_IMPORT_CANCELLED");
  };
  async function resolve(selection2, signal, material = false) {
    live(signal);
    assertCanvasV3ResourceSelection(selection2);
    const { resourceId: resourceId2, versionId } = selection2;
    const [result] = await resources.getResources([{ resourceId: resourceId2, versionId }], { signal });
    live(signal);
    if (!result?.ok || result.detail.resource.resourceId !== resourceId2 || !kinds.some(
      (kind2) => kind2 === canvasV3PickerKind(result.detail.resource.kind, result.detail.version?.relativePath)
    ) || result.detail.resource.lifecycle !== ProjectResourceLifecycle.ACTIVE || result.detail.version?.versionId !== versionId || result.detail.version.resourceId !== resourceId2 || result.detail.version.status !== ProjectResourceVersionStatus.READY)
      throw new Error("CANVAS_V3_REFERENCE_NOT_READY");
    const reference = {
      resourceId: resourceId2,
      versionId,
      name: result.detail.resource.name,
      source: "resource",
      ...result.detail.resource.kind !== ProjectResourceKind.IMAGE ? {
        kind: canvasV3PickerKind(
          result.detail.resource.kind,
          result.detail.version.relativePath
        )
      } : {}
    };
    if (material || reference.kind === "text") return { reference, response: void 0 };
    const response = reference.kind && reference.kind !== "image" ? await fetch2(canvasV3ContentPath(reference), { method: "HEAD", signal }) : await validateCanvasV3ResourceReference(fetch2, promptReference(reference), signal);
    if (!response.ok || !response.headers.get("content-type")?.toLowerCase().startsWith(`${reference.kind ?? "image"}/`))
      throw new Error("CANVAS_V3_REFERENCE_NOT_READY");
    live(signal);
    return { reference, response };
  }
  return {
    async search(text2, signal, cursor) {
      live(signal);
      const result = await resources.search(
        {
          text: text2,
          kind: [...new Set(kinds.map((kind2) => resourceKinds[kind2]))],
          lifecycle: [ProjectResourceLifecycle.ACTIVE],
          limit: 50,
          ...cursor ? { cursor } : {}
        },
        { signal }
      );
      live(signal);
      return result;
    },
    async versions(resourceId2, signal, cursor) {
      live(signal);
      const result = await resources.listResourceVersions(
        { resourceId: resourceId2, limit: 50, includeDeleted: false, ...cursor ? { cursor } : {} },
        { signal }
      );
      live(signal);
      if (result.items.some(
        (version2) => version2.resourceId !== resourceId2 || version2.status !== ProjectResourceVersionStatus.READY
      ))
        throw new Error("CANVAS_V3_REFERENCE_NOT_READY");
      return result;
    },
    async select(selection2, signal) {
      return promptReference((await resolve(selection2, signal)).reference);
    },
    async selectMaterial(selection2, signal) {
      const { reference } = await resolve(selection2, signal, true);
      return { ...reference, kind: reference.kind ?? "image" };
    },
    async resolveImage(selection2, signal) {
      const { reference, response } = await resolve(selection2, signal);
      if (!response || reference.kind && reference.kind !== "image")
        throw new Error("CANVAS_V3_REFERENCE_NOT_READY");
      const width = Number(response.headers.get("x-image-width"));
      const height = Number(response.headers.get("x-image-height"));
      if (!Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0)
        throw new Error("CANVAS_V3_REFERENCE_NOT_READY");
      return { ...promptReference(reference), width, height };
    }
  };
}

function canvasV3PickerMediaReason(kind2, duration, selected2, media2) {
  if (!media2 || kind2 !== "video" && kind2 !== "audio") return void 0;
  const c3 = media2.constraints;
  if (!positive(duration)) return CANVAS_V3_PICKER_METADATA_PENDING;
  if (kind2 === "audio") {
    if (duration < c3.audioPerClipMinSec) return "audio-too-short";
    if (!canDefer("audio", media2) && c3.audioPerClipMaxSec !== void 0 && duration > c3.audioPerClipMaxSec)
      return "audio-too-long";
    if (!canDefer("audio", media2) && c3.remainingAudioTotalSec !== void 0 && c3.remainingAudioTotalSec - selected2.audio - duration < 0)
      return "audio-budget";
    return void 0;
  }
  if (c3.videoPerClipMinSec !== void 0 && duration < c3.videoPerClipMinSec)
    return "video-too-short";
  if (!canDefer("video", media2) && c3.videoPerClipMaxSec !== void 0 && duration > c3.videoPerClipMaxSec)
    return "video-too-long";
  if (!canDefer("video", media2) && c3.remainingVideoTotalSec - selected2.video - duration < 0)
    return `${VIDEO_BUDGET_PREFIX}${selected2.video + duration - c3.remainingVideoTotalSec}`;
  return void 0;
}

function canvasV3PickerMediaReasonLabel(reason2, t2, media2) {
  if (reason2.startsWith(VIDEO_BUDGET_PREFIX)) {
    const excess = Number(reason2.slice(VIDEO_BUDGET_PREFIX.length));
    if (Number.isFinite(excess) && excess > 0)
      return t2("assetPicker.disabledReason.videoBudgetExceeded", "超出 {{duration}}", {
        duration: `${Math.round(excess * 10) / 10}s`
      });
    return t2("assetPicker.disabledReason.videoBudget", "总视频超 {{max}}s", {
      max: formatSeconds(media2?.constraints.remainingVideoTotalSec)
    });
  }
  switch (reason2) {
    case "audio-too-short":
      return t2("assetPicker.disabledReason.audioTooShort", "音频过短");
    case "audio-too-long":
      return t2("assetPicker.disabledReason.audioTooLong", "音频过长");
    case "audio-budget":
      return t2("assetPicker.disabledReason.audioBudget", "总音频超 {{max}}s", {
        max: formatSeconds(media2?.constraints.remainingAudioTotalSec)
      });
    case "video-too-short":
      return t2("assetPicker.disabledReason.videoTooShort", "视频过短");
    case "video-too-long":
      return t2("assetPicker.disabledReason.videoTooLong", "视频过长");
    case CANVAS_V3_PICKER_METADATA_PENDING:
      return t2("assetPicker.disabledReason.metadataPending", "媒体信息获取失败");
    default:
      return "";
  }
}

function canvasV3SubjectConnectionIncludesResource(edgeId, resourceId2) {
  const binding = readCanvasV3SubjectConnection(edgeId);
  return !binding?.references.length || binding.references.some((reference) => reference.resourceId === resourceId2);
}

function parseCanvasV3ResourceDrop(transfer, scopeKey) {
  const raw2 = transfer.getData(CANVAS_V3_RESOURCE_DRAG_MIME);
  if (!raw2) return null;
  if (raw2.length > 32768) throw new Error("CANVAS_V3_RESOURCE_DROP_INVALID");
  let value;
  try {
    value = JSON.parse(raw2);
  } catch {
    throw new Error("CANVAS_V3_RESOURCE_DROP_INVALID");
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("CANVAS_V3_RESOURCE_DROP_INVALID");
  const data2 = value;
  if (!scopeKey || data2.scopeKey !== scopeKey)
    throw new Error("CANVAS_V3_RESOURCE_DROP_SCOPE_MISMATCH");
  if (data2.schemaVersion !== 1 || Object.keys(data2).some((key2) => !["schemaVersion", "scopeKey", "references"].includes(key2)) || !Array.isArray(data2.references) || !data2.references.length || data2.references.length > 20)
    throw new Error("CANVAS_V3_RESOURCE_DROP_INVALID");
  const seen = /* @__PURE__ */ new Map();
  const references = [];
  for (const item of data2.references) {
    assertCanvasV3ResourceSelection(item);
    if (Object.keys(item).some((key2) => key2 !== "resourceId" && key2 !== "versionId"))
      throw new Error("CANVAS_V3_RESOURCE_DROP_INVALID");
    const owner = seen.get(item.versionId);
    if (owner && owner !== item.resourceId) throw new Error("CANVAS_V3_RESOURCE_DROP_INVALID");
    if (!owner) references.push({ resourceId: item.resourceId, versionId: item.versionId });
    seen.set(item.versionId, item.resourceId);
  }
  return references;
}

function canvasV3ResourceDropCommand(document2, images) {
  if (!images.length) return null;
  const ids2 = /* @__PURE__ */ new Set();
  for (const { nodeId, image: image2 } of images) {
    assertCanvasV3ResourceSelection(image2);
    if (ids2.has(nodeId) || Object.hasOwn(document2.nodes, nodeId))
      throw new Error("CANVAS_V3_RESOURCE_DROP_TARGET_EXISTS");
    if (!Number.isSafeInteger(image2.width) || image2.width <= 0 || !Number.isSafeInteger(image2.height) || image2.height <= 0)
      throw new Error("CANVAS_V3_REFERENCE_NOT_READY");
    ids2.add(nodeId);
  }
  return canvasV3ImportCommand(
    document2,
    images.map(({ nodeId, image: image2, position: position2 }) => ({
      nodeId,
      resourceId: image2.resourceId,
      versionId: image2.versionId,
      mediaKind: "image",
      width: image2.width,
      height: image2.height,
      position: position2,
      parentId: null
    }))
  );
}

function canvasV3GenerationOperations(mediaKind2) {
  return mediaKind2 === "audio" ? [projectGenerationOperation("speech"), projectGenerationOperation("music")] : [projectGenerationOperation(mediaKind2)];
}

function canvasV3AudioModeOfModel(model) {
  return model.capability.operation === "generate_music" ? "music" : "tts";
}

function canvasV3AudioKindOfMode(mode2) {
  return mode2 === "music" ? "music" : "speech";
}

function canvasV3AudioForm(model, stored = {}) {
  const form2 = capabilityForm(model.capability, stored);
  const schema = model.capability.paramSchema.properties;
  for (const key2 of CANVAS_V3_AUDIO_FREE_PARAMS) {
    if (!schema[key2]) continue;
    const value = stored[key2];
    if (typeof value === "string" && value !== "") form2[key2] = value;
    else if (key2 === "voice_id_source") delete form2[key2];
  }
  if (schema.voice_id && form2.voice_id && !form2.voice_id_source) form2.voice_id_source = "user";
  return form2;
}

function canvasV3AudioGenerationReferences(document2, views, nodeId) {
  const versions = /* @__PURE__ */ new Set();
  return Object.values(document2.edges).filter((edge) => edge.target === nodeId).flatMap((edge) => {
    const source = canvasV3ReadySource(views.get(edge.source));
    return source && (source.mediaKind === "image" || source.mediaKind === "audio") ? [source] : [];
  }).filter((node2) => {
    if (versions.has(node2.versionId)) return false;
    versions.add(node2.versionId);
    return true;
  });
}

function canvasV3Model(capability) {
  return { id: capability.model.id, capability, info: pickerInfo(capability) };
}

function canvasV3GenerationReferences(document2, views, nodeId, kinds = ["image"]) {
  const versions = /* @__PURE__ */ new Set();
  const target = document2.nodes[nodeId];
  const references = target && (target.kind === "composition" || target.kind === "placeholder") ? target.draft?.references ?? [] : [];
  return Object.values(document2.edges).filter((edge) => edge.target === nodeId).flatMap((edge) => {
    const view2 = views.get(edge.source);
    if (view2?.containerKind === "subject") {
      const resources = new Set(
        view2.members?.flatMap((member2) => member2.resource === null ? [] : [member2.resource])
      );
      if (edge.sourceResourceId && !resources.has(edge.sourceResourceId)) return [];
      const referencedResourceIds = edge.sourceResourceId ? [edge.sourceResourceId] : [
        ...new Set(
          [...readCanvasV3SubjectConnection(edge.id)?.references ?? [], ...references].filter((ref) => resources.has(ref.resourceId)).map((ref) => ref.resourceId)
        )
      ];
      if (referencedResourceIds.length)
        return referencedResourceIds.flatMap((resourceId2) => {
          const source3 = subjectResourceSource(
            view2,
            view2.items.find((item) => item.resourceId === resourceId2 && item.isCurrent)
          );
          return source3 && kinds.includes(source3.mediaKind) ? [source3] : [];
        });
      const source2 = subjectResourceSource(view2, view2.item ?? void 0);
      return source2 && kinds.includes(source2.mediaKind) ? [source2] : [];
    }
    const source = canvasV3ReadySource(view2);
    return source && kinds.includes(source.mediaKind) ? [source] : [];
  }).filter((node2) => {
    if (versions.has(node2.versionId)) return false;
    versions.add(node2.versionId);
    return true;
  });
}

function canvasV3CanvasImages(views, kinds = ["image"]) {
  return [...views.values()].flatMap((view2) => {
    if (view2.containerKind === "subject") {
      const resources = new Set(
        view2.members?.flatMap((member2) => member2.resource === null ? [] : [member2.resource])
      );
      return [...resources].flatMap((resourceId2) => {
        const source2 = subjectResourceSource(
          view2,
          view2.items.find((item) => item.resourceId === resourceId2 && item.isCurrent)
        );
        return source2 && kinds.includes(source2.mediaKind) ? [source2] : [];
      });
    }
    const source = canvasV3ReadySource(view2);
    return source && kinds.includes(source.mediaKind) ? [source] : [];
  });
}

function canvasV3ModelReferenceBudget(model, params = {}) {
  const budget = model?.capability.references;
  return budget?.modes?.[params.mode] ?? budget;
}

function canvasV3ModelLastFrameOnly(model, params = {}) {
  return canvasV3ModelReferenceBudget(model, params)?.lastFrameOnly === true;
}

function canvasV3ModeIgnoresReferences(model, mediaKind2, params = {}) {
  return mediaKind2 === "video" && !!params.mode && !!model?.capability.references.modes?.[params.mode] && canvasV3ModelReferenceBudget(model, params)?.max === 0;
}

function canvasV3ModelReferenceKinds(model, mediaKind2, params = {}) {
  const budget = canvasV3ModelReferenceBudget(model, params);
  if (!budget || budget.max === 0) return [];
  return (mediaKind2 === "image" ? ["image"] : ["image", "video", "audio"]).filter((kind2) => budget.kinds ? (budget.kinds[kind2] ?? 0) > 0 : kind2 === "image");
}

function canvasV3ReferenceIssue(model, mediaKind2, refs, params = {}, options2 = {}) {
  const budget = canvasV3ModelReferenceBudget(model, params);
  if (!model || !budget) return { code: "count", min: 0, max: 0, message: "No model selected." };
  const kinds = canvasV3ModelReferenceKinds(model, mediaKind2, params);
  const foreign = refs.find((ref) => !kinds.some((kind2) => kind2 === (ref.kind ?? "image")));
  if (foreign)
    return {
      code: "kind_limit",
      kind: foreign.kind ?? "image",
      limit: 0,
      message: `This composer does not accept ${foreign.kind ?? "image"} references.`
    };
  return referenceBudgetIssue(budget, budgeted(refs), options2);
}

function canvasV3ModelReferencesValid(model, mediaKind2, refs, params = {}, requireMinimum = true) {
  return !canvasV3ReferenceIssue(model, mediaKind2, refs, params, { partial: !requireMinimum });
}

function canvasV3UnmeasuredReferences(model, refs, params = {}) {
  const windows2 = canvasV3ModelReferenceBudget(model, params)?.durationSeconds;
  if (!windows2) return [];
  return refs.filter(
    (ref) => (ref.kind === "video" || ref.kind === "audio") && !!windows2[ref.kind] && ref.durationSeconds === void 0
  );
}

function canvasV3AuthoredPrompt(prompt) {
  return parseReferenceTextPrompt(prompt)?.userPrompt ?? prompt;
}

function canvasV3ImageLuts(fetch2) {
  const request = async (path2, options2) => {
    const response = await fetch2(path2, options2);
    if (!response.ok) throw new Error(`CANVAS_V3_LUT_HTTP_${response.status}`);
    return response;
  };
  return {
    async listLuts() {
      const data2 = await (await request("/api/luts")).json();
      if (!Array.isArray(data2.luts)) throw new Error("CANVAS_V3_LUT_INVALID");
      return data2.luts;
    },
    async importLut(file) {
      const body2 = new FormData();
      body2.append("file", file, file.name);
      const data2 = await (await request("/api/luts/import", { method: "POST", body: body2 })).json();
      if (typeof data2.name !== "string" || !data2.name) throw new Error("CANVAS_V3_LUT_INVALID");
      return { name: data2.name };
    },
    async loadLutContent(name2) {
      const data2 = await (await request(`/api/luts/content?name=${encodeURIComponent(name2)}`)).json();
      if (typeof data2.content !== "string") throw new Error("CANVAS_V3_LUT_INVALID");
      return data2.content;
    },
    async deleteLut(name2) {
      await request(`/api/luts/${encodeURIComponent(name2)}`, { method: "DELETE" });
    }
  };
}

function createCanvasV3Client(request) {
  return {
    async load() {
      const response = await request(CANVAS_V3_ROUTES.document);
      if (!response.ok) {
        let code2 = "";
        try {
          const body2 = await response.json();
          if (typeof body2?.code === "string") code2 = body2.code;
        } catch {
        }
        throw new Error(`CANVAS_V3_LOAD_FAILED: ${response.status}${code2 ? ` ${code2}` : ""}`);
      }
      return parseCanvasV3Document(await response.json());
    },
    async execute(command2) {
      const commandId = command2.commandId;
      let response;
      try {
        response = await request(CANVAS_V3_ROUTES.commands, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command2)
        });
      } catch (error) {
        const status = error?.status;
        const code2 = error?.code;
        if (typeof status === "number" && status >= 400 && status < 500 && status !== 408 && !isWorkspaceIdentityErrorCode(code2))
          throw new CanvasV3CommandRejectedError(
            status,
            typeof code2 === "string" ? code2 : void 0
          );
        throw error;
      }
      if (!response.ok) {
        let code2 = "";
        try {
          const body2 = await response.json();
          if (typeof body2?.code === "string") code2 = body2.code;
        } catch {
        }
        if (response.status >= 400 && response.status < 500 && response.status !== 408 && !isWorkspaceIdentityErrorCode(code2))
          throw new CanvasV3CommandRejectedError(response.status, code2 || void 0);
        throw new Error(`CANVAS_V3_COMMAND_FAILED: ${response.status}${code2 ? ` ${code2}` : ""}`);
      }
      const receipt = parseCanvasV3CommandReceipt(await response.json());
      if (receipt.commandId !== commandId) throw new Error("CANVAS_V3_RECEIPT_MISMATCH");
      return receipt;
    },
    async readContent(compositionIds, signal) {
      const response = await request(CANVAS_V3_ROUTES.content, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compositionIds }),
        ...signal ? { signal } : {}
      });
      if (!response.ok) throw new Error(`CANVAS_V3_CONTENT_FAILED: ${response.status}`);
      return parseCanvasV3ContentBatch(await response.json());
    }
  };
}

const TOKEN$1 = /^@composition:([\w-]+)(?:\[("(?:[^"\\]|\\.)*")\])?/u;

const VIDEO_BUDGET_PREFIX = "video-budget:";

function aspectRatioNodeSize(aspectRatio2) {
  if (typeof aspectRatio2 !== "string") return void 0;
  const ratio = parseAspectRatio(aspectRatio2);
  return ratio ? computeNodeSize(ratio.w, ratio.h) : void 0;
}

function assertCanvasV3ResourceSelection(value) {
  if (!value || typeof value !== "object") throw new Error("CANVAS_V3_REFERENCE_NOT_READY");
  const ref = value;
  for (const key2 of ["resourceId", "versionId"]) {
    const id2 = ref[key2];
    if (typeof id2 !== "string" || !id2.length || id2.length > 256 || /[\x00-\x1f\x7f/\\]/.test(id2))
      throw new Error("CANVAS_V3_REFERENCE_NOT_READY");
  }
}

function budgeted(refs) {
  return refs.map((ref) => ({
    kind: ref.kind ?? "image",
    ...ref.durationSeconds === void 0 ? {} : { durationSeconds: ref.durationSeconds },
    ...ref.width === void 0 ? {} : { width: ref.width },
    ...ref.height === void 0 ? {} : { height: ref.height },
    ...ref.bytes === void 0 ? {} : { bytes: ref.bytes },
    ...ref.extension === void 0 ? {} : { extension: ref.extension },
    ...ref.mimeType === void 0 ? {} : { mimeType: ref.mimeType }
  }));
}

function canDefer(kind2, media2) {
  const c3 = media2.constraints;
  const optedIn = kind2 === "audio" ? media2.trimAudio : media2.trimVideo;
  const available = kind2 === "audio" ? c3.remainingAudioTotalSec ?? Infinity : c3.remainingVideoTotalSec;
  const minimum = kind2 === "audio" ? c3.audioPerClipMinSec : c3.videoPerClipMinSec ?? 0;
  return optedIn && available > 0 && available >= minimum;
}

function capabilityForm(capability, stored = {}) {
  const form2 = {};
  for (const [key2, control] of Object.entries(capability.controls ?? {})) {
    const saved = key2 === "mode" ? stored.mode ?? stored.image_mode : stored[key2];
    const value = accepted(capability, key2, saved) ?? accepted(capability, key2, capability.paramSchema.properties[key2]?.default) ?? (control.optional || control.widget !== "select" ? void 0 : paramOptions(capability, key2).map(String)[0]);
    if (value !== void 0) form2[key2] = value;
  }
  for (let pass = 0; pass <= Object.keys(form2).length; pass += 1) {
    let changed = false;
    for (const key2 of Object.keys(form2)) {
      if (paramDisabled(capability, form2, key2)) {
        delete form2[key2];
        changed = true;
        continue;
      }
      const disabled = disabledOptions(capability, form2, key2);
      if (!disabled.some((value) => same(value, form2[key2]))) continue;
      const next2 = paramOptions(capability, key2).map(String).find((option2) => !disabled.some((value) => same(value, option2)));
      if (next2 === void 0) delete form2[key2];
      else form2[key2] = next2;
      changed = true;
    }
    if (!changed) break;
  }
  return form2;
}

function contentPresentationKind(kind2, name2, subtitleFormat2) {
  return kind2 === "text" && (subtitleFormat2 || /\.(?:srt|ass|vtt)$/i.test(name2 ?? "")) ? "file" : kind2;
}

function dodgePlacementFile(file, anchor2, size2) {
  const occupied = [];
  for (const node2 of file.nodes) {
    if (node2.parentId) continue;
    const position2 = node2.positions[PLACEMENT_MODE];
    if (!position2 || !node2.size) continue;
    occupied.push({
      x: position2.x,
      y: position2.y,
      w: node2.size.width,
      h: node2.size.height
    });
  }
  return findFreePositionFromAnchor(anchor2, { width: size2.width, height: size2.height }, occupied, {
    shiftAxis: "x",
    maxShift: DEFAULT_MAX_DERIVED_COLLISION_SHIFT
  });
}

function findFreePosition(existingNodes, mode2, newSize = TEXT_CARD_DEFAULT_SIZE, options2) {
  const occupied = [];
  for (const n2 of existingNodes) {
    if (n2.parentId) continue;
    const rect = nodeToRect$2(n2, mode2);
    if (rect) occupied.push(rect);
  }
  return findFreePositionForRects(occupied, newSize, options2);
}

const isCount$1 = (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

// [tdz] ID_LIMIT 上移（原第 5237 行，被第 4845 行引用）
const ID_LIMIT = 512;

const isId$4 = (value) => typeof value === "string" && !!value.trim() && value.length <= ID_LIMIT && !value.includes("\0");

const isObject$2 = (value) => typeof value === "object" && value !== null;

function parseReferenceTextPrompt(prompt) {
  const prefix = `${REFERENCE_PROMPT_PREAMBLE}

${REFERENCE_TEXT_OPEN}`;
  if (!prompt.startsWith(prefix)) return void 0;
  const referenceOnlySuffix = REFERENCE_TEXT_CLOSE;
  const userSeparator = `${REFERENCE_TEXT_CLOSE}${USER_PROMPT_OPEN}`;
  if (prompt.endsWith(USER_PROMPT_CLOSE)) {
    const separatorIndex = prompt.lastIndexOf(userSeparator);
    if (separatorIndex < prefix.length) return void 0;
    return {
      referenceText: prompt.slice(prefix.length, separatorIndex),
      userPrompt: prompt.slice(separatorIndex + userSeparator.length, -USER_PROMPT_CLOSE.length)
    };
  }
  if (!prompt.endsWith(referenceOnlySuffix)) return void 0;
  return {
    referenceText: prompt.slice(prefix.length, -referenceOnlySuffix.length),
    userPrompt: ""
  };
}

function pickerInfo(capability) {
  const { id: id2, presentation } = capability.model;
  const params = Object.fromEntries(
    Object.entries(capability.controls ?? {}).map(([key2, control]) => {
      const schema = capability.paramSchema.properties[key2];
      return [
        key2,
        {
          type: control.widget,
          label: control.label,
          options: paramOptions(capability, key2).map(String),
          default: schema?.default === void 0 ? "" : String(schema.default),
          ...control.placeholder ? { placeholder: control.placeholder } : {},
          ...schema?.minimum !== void 0 ? { min: schema.minimum } : {},
          ...schema?.maximum !== void 0 ? { max: schema.maximum } : {},
          ...control.step !== void 0 ? { step: control.step } : {},
          ...control.marks ? { marks: control.marks.map(String) } : {},
          ...control.optional ? { optional: true } : {}
        }
      ];
    })
  );
  const { kinds } = capability.references;
  return {
    ...presentation,
    id: id2,
    name: capability.displayName || presentation.name,
    // A hidden model stays runnable for existing nodes but is never offered.
    ...presentation.visibility === "hidden" ? { hideInModelPicker: true } : {},
    params,
    max_refs: kinds ? kinds.image ?? 0 : capability.references.max,
    ...kinds?.video ? { max_video_refs: kinds.video } : {},
    ...kinds?.audio ? { max_audio_refs: kinds.audio } : {}
  };
}

function placementFile(document2, exclude, reserveSubjects = false) {
  const nodes = [];
  const kept = /* @__PURE__ */ new Set();
  for (const node2 of Object.values(document2.nodes)) {
    if (node2.hidden || exclude?.has(node2.id)) continue;
    kept.add(node2.id);
    const subject = reserveSubjects && unprojectedSubject(node2);
    nodes.push({
      id: node2.id,
      type: subject ? CanvasNodeType.Group : legacyNodeType(node2),
      positions: {
        [PLACEMENT_MODE]: {
          x: node2.position.x - (subject ? CANVAS_V3_SUBJECT_TYPE_PADDING : 0),
          y: node2.position.y - (subject ? CANVAS_V3_SUBJECT_TYPE_HEADER : 0)
        }
      },
      size: subject ? subjectOuterSize(node2.size) : { ...node2.size },
      ...node2.parentId ? { parentId: node2.parentId } : {}
    });
  }
  const edges = [];
  for (const edge of Object.values(document2.edges)) {
    if (!kept.has(edge.source) || !kept.has(edge.target)) continue;
    edges.push({ id: edge.id, source: edge.source, target: edge.target, type: "derivation" });
  }
  return { version: 1, mode: PLACEMENT_MODE, nodes, edges };
}

const positive$3 = (n2) => typeof n2 === "number" && Number.isFinite(n2) && n2 > 0;

function promptReference(ref) {
  if (ref.kind === "file" || ref.kind === "table") throw new Error("CANVAS_V3_REFERENCE_NOT_READY");
  return { ...ref, kind: ref.kind };
}

function readCanvasV3SubjectConnection(edgeId) {
  const cached = resourceConnections.get(edgeId);
  if (cached) return cached;
  try {
    const raw2 = localStorage.getItem(storageKey$1(edgeId));
    if (!raw2) return void 0;
    const value = JSON.parse(raw2);
    if (!Array.isArray(value.references) || !value.references.every(
      (ref) => typeof ref.resourceId === "string" && typeof ref.versionId === "string"
    ) || value.targetResourceId !== void 0 && typeof value.targetResourceId !== "string")
      return void 0;
    resourceConnections.set(edgeId, value);
    return value;
  } catch {
    return void 0;
  }
}

function referenceBudgetIssue(budget, references, { outputSeconds, partial = false } = {}) {
  const { min: min2, max: max2, kinds, minKinds, videoAudio, imagesWithVideo, exclusive } = budget;
  const counts2 = { image: 0, video: 0, audio: 0, text: 0 };
  for (const reference of references) counts2[reference.kind] += 1;
  if (counts2.text && !kinds?.text)
    return {
      code: "text_unsupported",
      message: "Read text resources first and include their relevant content in prompt."
    };
  for (const kind2 of Object.keys(counts2)) {
    const limit = kinds ? kinds[kind2] ?? 0 : Infinity;
    if (counts2[kind2] > limit)
      return {
        code: "kind_limit",
        kind: kind2,
        limit,
        message: limit ? `This capability accepts at most ${plural(limit, `${KIND_NAMES[kind2]} reference`)}.` : `This capability does not accept ${KIND_NAMES[kind2]} references.`
      };
  }
  const required2 = () => {
    for (const [kind2, least] of Object.entries(minKinds ?? {}))
      if (counts2[kind2] < least)
        return {
          code: "min_kind",
          kind: kind2,
          min: least,
          message: `This capability requires at least ${plural(least, `${KIND_NAMES[kind2]} reference`)}.`
        };
    return void 0;
  };
  if (references.length > max2 || !partial && references.length < min2)
    return (
      // Name the missing kind rather than the bare count where the budget states one.
      (references.length < min2 ? required2() : void 0) ?? {
        code: "count",
        min: min2,
        max: max2,
        message: min2 === max2 ? `This capability takes exactly ${plural(min2, "reference")}.` : `This capability takes ${min2}..${max2} references.`
      }
    );
  if (videoAudio !== void 0 && counts2.video + counts2.audio > videoAudio)
    return {
      code: "video_audio_limit",
      limit: videoAudio,
      message: `This capability accepts at most ${videoAudio} video and audio references combined.`
    };
  if (imagesWithVideo !== void 0 && counts2.video && counts2.image > imagesWithVideo)
    return {
      code: "images_with_video",
      limit: imagesWithVideo,
      message: `This capability accepts at most ${plural(imagesWithVideo, "image reference")} with a video reference.`
    };
  const mixed = exclusive?.find((group) => group.filter((kind2) => counts2[kind2]).length > 1);
  if (mixed)
    return {
      code: "exclusive",
      kinds: mixed,
      message: `References cannot combine ${mixed.join(" and ")} in one request.`
    };
  const sizeError = imageSizeError(budget.imageSize, references);
  if (sizeError) return { code: "image_size", message: sizeError };
  const media2 = mediaIssue(budget.media, references);
  if (media2) return media2;
  if (partial) return void 0;
  const missing = required2();
  if (missing) return missing;
  if (budget.audioNeedsVisual && counts2.audio && !counts2.image && !counts2.video)
    return {
      code: "audio_needs_visual",
      message: "Audio references need an image or video reference beside them."
    };
  return durationIssue(budget, references, outputSeconds);
}

function requestedAspectRatio(params) {
  for (const key2 of ["aspect_ratio", "ratio"]) {
    const value = params?.[key2];
    if (typeof value === "string" && value.trim()) return value;
  }
  return void 0;
}

function resolveCanvasV3Node(node2, entry) {
  if (node2.kind !== "composition") return null;
  const content2 = entry?.state === "ready" && entry.content.state === "ready" ? entry.content : void 0;
  const subject = node2.containerKind === "subject" || Boolean(node2.subjectLayout) || Boolean(content2 && content2.members.filter((member22) => member22.resource !== null).length > 1);
  const subjectGenerating = subject && Boolean(
    content2?.protected || content2?.taskOutputs.some((output2) => output2.state === "generating")
  );
  const base2 = {
    deletedVersions: content2 ? Object.values(content2.resources).flatMap(
      (resource2) => resource2.versions.filter((version2) => version2.deleted).map((version2) => ({ resourceId: resource2.resourceId, versionId: version2.versionId }))
    ) : [],
    compositionTitle: content2?.title ?? "",
    attributes: content2?.attributes,
    ...content2 ? { compositionRevision: content2.revision, typeId: content2.typeId } : {},
    typeLabel: entry?.state === "ready" && entry.content.state === "ready" ? entry.content.typeLabel : void 0,
    typePosition: entry?.state === "ready" && entry.content.state === "ready" ? entry.content.position ?? null : void 0,
    compositionCreatedAt: entry?.state === "ready" && entry.content.state === "ready" ? entry.content.createdAt : void 0,
    protected: entry?.state === "ready" && entry.content.state === "ready" && entry.content.protected,
    id: node2.id,
    kind: "composition",
    compositionId: node2.compositionId,
    node: content2 && !subject ? { ...node2, containerKind: void 0 } : node2,
    containerKind: subject ? "subject" : void 0,
    subjectGenerating,
    members: entry?.state === "ready" && entry.content.state === "ready" ? entry.content.members : void 0,
    parentId: node2.parentId,
    position: node2.position,
    size: node2.size,
    zIndex: node2.zIndex,
    hidden: node2.hidden || entry?.state === "ready" && entry.editorSourceOnly === true,
    draft: node2.draft,
    ...node2.presentation ? { presentation: node2.presentation } : {}
  };
  if (!entry || entry.state === "loading")
    return {
      ...base2,
      state: "loading",
      item: null,
      items: [],
      resourceId: null,
      versionId: null,
      mediaKind: null,
      title: ""
    };
  if (entry.state === "error" || entry.content.state !== "ready")
    return {
      ...base2,
      state: "unavailable",
      unavailableReason: entry.state === "error" ? "error" : entry.content.state === "deleted" ? "deleted" : "missing",
      item: null,
      items: [],
      resourceId: null,
      versionId: null,
      mediaKind: null,
      title: ""
    };
  const items = [...entry.items];
  const resources = entry.content.resources;
  const selected2 = node2.activeItem;
  const delivered = selected2?.type === "task-output" ? entry.content.taskOutputs.find(
    (output2) => output2.taskId === selected2.taskId && output2.outputKey === selected2.outputKey && output2.versionId
  ) : void 0;
  const selectedResourceId = selected2?.type === "version" ? selected2.resourceId : delivered?.resourceId;
  const resolvedRef = delivered?.resourceId && delivered.versionId ? { type: "version", resourceId: delivered.resourceId, versionId: delivered.versionId } : selected2;
  if (selected2?.type === "task-output" && !delivered && !items.some((item2) => canvasV3ItemRefEqual(item2.ref, selected2))) {
    items.push({
      ref: selected2,
      state: "generating",
      resourceId: null,
      versionId: null,
      ordinal: Math.max(0, ...items.map((item2) => item2.ordinal)) + 1,
      isCurrent: false,
      kind: Object.values(entry.content.resources)[0]?.kind ?? null,
      name: null,
      task: { taskId: selected2.taskId, outputKey: selected2.outputKey }
    });
  }
  const memberResources = new Set(
    entry.content.members.flatMap((member22) => member22.resource === null ? [] : [member22.resource])
  );
  const currentItems = items.filter(
    (item2) => item2.ref.type === "task-output" || memberResources.has(item2.ref.resourceId) && resources[item2.ref.resourceId]?.currentVersionId === item2.ref.versionId
  );
  const coverItems = currentItems;
  const explicit = resolvedRef ? items.find((item2) => canvasV3ItemRefEqual(item2.ref, resolvedRef)) ?? null : null;
  const hasSelection2 = Boolean(
    node2.activeItem && (!selectedResourceId || memberResources.has(selectedResourceId))
  );
  const defaultResourceId = memberResources.values().next().value;
  const defaultItems = subject ? coverItems.filter((item2) => item2.resourceId === defaultResourceId) : coverItems;
  const item = hasSelection2 ? explicit : canvasV3DefaultItem(defaultItems);
  const displayedResourceId = item?.resourceId ?? selectedResourceId ?? defaultResourceId;
  const member2 = entry.content.members.find((member22) => member22.resource === displayedResourceId);
  const resourceName = displayedResourceId ? resources[displayedResourceId]?.name : void 0;
  const title = subject ? entry.content.title || item?.name || "" : member2?.role.trim() || resourceName || "";
  if (subjectGenerating || node2.pendingGeneration)
    return {
      ...base2,
      state: "generating",
      item: null,
      items,
      resourceId: null,
      versionId: null,
      mediaKind: null,
      title
    };
  if (!item)
    return {
      ...base2,
      state: hasSelection2 ? "unavailable" : coverItems.some((entry2) => entry2.state === "generating") ? "generating" : "empty",
      item: null,
      items,
      resourceId: null,
      versionId: null,
      mediaKind: null,
      title
    };
  return {
    ...base2,
    state: item.state === "ready" ? "ready" : item.state === "generating" ? "generating" : "unavailable",
    item,
    items,
    resourceId: item.state === "ready" ? item.resourceId : null,
    versionId: item.state === "ready" ? item.versionId : null,
    contentRevision: item.contentRevision,
    mediaKind: contentPresentationKind(
      item.kind ?? Object.values(entry.content.resources)[0]?.kind ?? null,
      item.name,
      item.resourceId ? entry.content.resources[item.resourceId]?.subtitleFormat : void 0
    ),
    ...subtitleFormatField(
      item.resourceId ? entry.content.resources[item.resourceId]?.subtitleFormat : void 0
    ),
    ...item.originalFile ? { originalFile: true } : {},
    title
  };
}

function resolveDerivedOrFreePosition(canvas, sourceNodeId, mode2, size2, options2) {
  const sourceIds = sourceNodeId === void 0 ? [] : Array.isArray(sourceNodeId) ? sourceNodeId : [sourceNodeId];
  const derived = sourceIds.length > 0 ? getDerivedNodePositionFromCanvasMulti(canvas, sourceIds, mode2, {
    fallbackSourceSize: size2,
    verticalStacking: options2?.verticalStacking
  }) : null;
  return derived ?? findFreePosition(canvas.nodes, mode2, size2);
}


function subjectOuterSize(size2) {
  return {
    width: Math.max(size2.width, CANVAS_V3_SUBJECT_PREVIEW_SIZE.width) + CANVAS_V3_SUBJECT_TYPE_PADDING * 2,
    height: Math.max(size2.height, CANVAS_V3_SUBJECT_PREVIEW_SIZE.height) + CANVAS_V3_SUBJECT_TYPE_HEADER + CANVAS_V3_SUBJECT_TYPE_PADDING
  };
}

function subjectResourceSource(view2, item) {
  if (item?.ref.type !== "version" || item.state !== "ready" || !item.resourceId || !item.versionId || !item.kind)
    return null;
  const { containerKind: _nodeContainer, ...node2 } = view2.node;
  const {
    containerKind: _container,
    members: _members,
    subjectGenerating: _subjectGenerating,
    originalFile: _originalFile,
    ...source
  } = view2;
  return {
    ...source,
    node: { ...node2, activeItem: item.ref, draft: null },
    draft: null,
    subjectResourceId: item.resourceId,
    state: "ready",
    item,
    items: [item],
    resourceId: item.resourceId,
    versionId: item.versionId,
    mediaKind: item.kind,
    title: view2.members?.find((member2) => member2.resource === item.resourceId)?.role.trim() || item.name || "",
    ...item.originalFile ? { originalFile: true } : {}
  };
}

async function validateCanvasV3ResourceReference(fetch2, ref, signal) {
  const response = await fetch2(
    `${CANVAS_V3_ROUTES.images}/${encodeURIComponent(ref.resourceId)}/${encodeURIComponent(ref.versionId)}`,
    { method: "HEAD", signal }
  );
  if (signal.aborted) throw new Error("CANVAS_V3_IMPORT_CANCELLED");
  if (!response.ok || !/^image\/(jpeg|png|webp|gif)(;|$)/i.test(response.headers.get("content-type") ?? ""))
    throw new Error("CANVAS_V3_REFERENCE_NOT_READY");
  return response;
}

const DEFAULT_MAX_DERIVED_COLLISION_SHIFT = 1200;


const KIND_NAMES = {
  image: "image",
  video: "video",
  audio: "audio",
  text: "text"
};

const PLACEMENT_MODE = CanvasMode.Workflow;

function accepted(capability, key2, value) {
  if (value === void 0 || value === null || value === "") return void 0;
  const text2 = String(value);
  const control = capability.controls?.[key2];
  if (control?.widget === "textarea") return text2;
  if (control?.widget === "slider") {
    const schema2 = capability.paramSchema.properties[key2];
    const number2 = Number(text2);
    if (text2.trim() === "" || !Number.isFinite(number2)) return void 0;
    if (schema2?.minimum !== void 0 && number2 < schema2.minimum) return void 0;
    if (schema2?.maximum !== void 0 && number2 > schema2.maximum) return void 0;
    return text2;
  }
  const option2 = paramOptions(capability, key2).find((item) => same(item, text2));
  if (option2 !== void 0) return String(option2);
  const schema = capability.paramSchema.properties[key2];
  return control?.custom && schema && acceptsValue(schema, text2) ? text2 : void 0;
}

function disabledOptions(capability, form2, key2) {
  return (capability.paramRules ?? []).flatMap((rule) => {
    const when = form2[rule.when.param];
    if (rule.disable.param !== key2 || when === void 0) return [];
    if (!rule.when.values.some((value) => same(value, when))) return [];
    return (rule.disable.values ?? paramOptions(capability, key2)).map(String);
  });
}

function durationIssue(budget, references, outputSeconds) {
  for (const kind2 of ["video", "audio"]) {
    const window2 = budget.durationSeconds?.[kind2];
    if (!window2) continue;
    const { min: min2 = 0, max: max2 = Infinity } = window2;
    let total = 0;
    for (const reference of references) {
      const measured = reference.kind === kind2 ? reference.durationSeconds : void 0;
      if (measured === void 0) continue;
      const length2 = kind2 === "video" && budget.videoTailTrim ? trimmedVideoSeconds(measured, max2) : measured;
      if (length2 < min2 || length2 > max2)
        return {
          code: "duration_clip",
          kind: kind2,
          min: min2,
          max: max2,
          message: `A reference ${kind2} is ${seconds(measured)}s; this model accepts ${max2 === Infinity ? `at least ${min2}s` : `${min2}-${max2}s`} per reference.`
        };
      total += length2;
    }
    if (window2.total !== void 0 && total > window2.total)
      return {
        code: "duration_total",
        kind: kind2,
        max: window2.total,
        message: `Reference ${kind2}s total ${seconds(total)}s; this model accepts at most ${window2.total}s of reference ${kind2} per call.`
      };
    if (!total || outputSeconds === void 0) continue;
    if (window2.withOutput !== void 0 && total + outputSeconds > window2.withOutput)
      return {
        code: "duration_with_output",
        kind: kind2,
        max: Math.floor(window2.withOutput - total),
        message: `Reference ${kind2}s total ${seconds(total)}s plus a ${outputSeconds}s output exceeds this model's ${window2.withOutput}s limit; shorten the output to at most ${Math.floor(window2.withOutput - total)}s.`
      };
    if (window2.outputBeyond !== void 0 && outputSeconds - total < window2.outputBeyond)
      return {
        code: "duration_output_beyond",
        kind: kind2,
        min: Math.ceil(total + window2.outputBeyond),
        message: `The output continues ${seconds(total)}s of reference ${kind2}; request at least ${Math.ceil(total + window2.outputBeyond)}s.`
      };
  }
  return void 0;
}

function getDerivedNodePositionFromCanvasMulti(canvas, sourceNodeIds, mode2, options2) {
  const fallbackSourceSize = options2?.fallbackSourceSize;
  const sourceIdSet = /* @__PURE__ */ new Set();
  const resolvedSources = [];
  for (const id2 of sourceNodeIds) {
    if (sourceIdSet.has(id2)) continue;
    const node2 = canvas.nodes.find((n2) => n2.id === id2);
    if (!node2) continue;
    const pos = resolveAbsolutePosition(canvas, node2, mode2);
    if (!pos) continue;
    const size2 = node2.sizes?.[mode2] ?? node2.size ?? fallbackSourceSize ?? null;
    if (!size2) continue;
    sourceIdSet.add(id2);
    resolvedSources.push({ id: id2, x: pos.x, y: pos.y, width: size2.width, height: size2.height });
  }
  if (resolvedSources.length === 0) return null;
  const placementSources = rightmostLocalSourceCluster(resolvedSources);
  const placementSourceIdSet = new Set(placementSources.map((source) => source.id));
  const minX = Math.min(...placementSources.map((source) => source.x));
  const minY = Math.min(...placementSources.map((source) => source.y));
  const maxX = Math.max(...placementSources.map((source) => source.x + source.width));
  const maxY = Math.max(...placementSources.map((source) => source.y + source.height));
  const sourcePos = { x: minX, y: minY };
  const sourceSize = { width: maxX - minX, height: maxY - minY };
  const derivedTargetIds = /* @__PURE__ */ new Set();
  for (const edge of canvas.edges) {
    if (!placementSourceIdSet.has(edge.source)) continue;
    if ((edge.type ?? "derivation") !== "derivation") continue;
    derivedTargetIds.add(edge.target);
  }
  const peers = [];
  for (const node2 of canvas.nodes) {
    if (!derivedTargetIds.has(node2.id)) continue;
    if (sourceIdSet.has(node2.id)) continue;
    const pos = resolveAbsolutePosition(canvas, node2, mode2);
    if (!pos) continue;
    const footprint = resolveNodeFootprint(node2, mode2);
    peers.push({ x: pos.x, y: pos.y, height: footprint.height, width: footprint.width });
  }
  const verticalStacking = options2?.verticalStacking === true;
  let collision;
  const collisionEnabled = options2?.collision?.enabled !== false;
  const needsOccupied = collisionEnabled && verticalStacking;
  if (needsOccupied) {
    const occupied = [];
    for (const node2 of canvas.nodes) {
      if (sourceIdSet.has(node2.id)) continue;
      const pos = resolveAbsolutePosition(canvas, node2, mode2);
      if (!pos) continue;
      const nodeSize2 = resolveNodeFootprint(node2, mode2);
      occupied.push({ x: pos.x, y: pos.y, w: nodeSize2.width, h: nodeSize2.height });
    }
    if (occupied.length > 0) {
      collision = {
        occupied,
        newSize: fallbackSourceSize ?? sourceSize,
        maxCollisionShift: options2?.collision?.maxShift,
        collisionMargin: options2?.collision?.margin,
        // Vertical incremental stacking probes DOWN first (column-aligned),
        // spilling right only when the vertical budget is exhausted. Legacy
        // first-child placement keeps the default right→down order.
        preferAxis: "y",
        // Anchor every sibling's preferred travel budget to the placement
        // source component, not to each call's own candidate. A shared
        // preferred region keeps the lineage consistent; if it is full,
        // placement.ts continues along the secondary axis instead of
        // collapsing onto an occupied card.
        budgetOrigin: { x: sourcePos.x, y: sourcePos.y }
      };
    }
  }
  return computeDerivedNodePosition(
    { x: sourcePos.x, y: sourcePos.y, width: sourceSize.width, height: sourceSize.height },
    peers,
    options2?.gap,
    collision,
    verticalStacking
  );
}

function imageSizeError(size2, references) {
  if (!size2) return void 0;
  for (const { kind: kind2, width, height } of references) {
    if (kind2 !== "image" || !width || !height) continue;
    const ratio = width / height;
    const fits = width >= (size2.minWidth ?? 0) && width <= (size2.maxWidth ?? Infinity) && height >= (size2.minHeight ?? 0) && height <= (size2.maxHeight ?? Infinity) && width * height <= (size2.maxPixels ?? Infinity) && ratio >= (size2.minRatio ?? 0) && ratio <= (size2.maxRatio ?? Infinity);
    if (fits) continue;
    const bounds = [
      ...bound("width (px)", size2.minWidth, size2.maxWidth),
      ...bound("height (px)", size2.minHeight, size2.maxHeight),
      ...bound("total pixels", void 0, size2.maxPixels),
      ...bound("width/height", size2.minRatio, size2.maxRatio)
    ];
    return `A reference image is ${width}x${height}px; this model accepts ${bounds.join(", ")}. Resize or crop it, or choose another image.`;
  }
  return void 0;
}

function legacyNodeType(node2) {
  switch (node2.kind) {
    case "frame":
      return CanvasNodeType.Group;
    case "placeholder":
      return node2.expectedKind;
    case "composition":
    case "sticker":
    default:
      return CanvasNodeType.Image;
  }
}



function mediaIssue(media2, references) {
  if (!media2) return void 0;
  for (const kind2 of ["video", "audio"]) {
    const rule = media2[kind2];
    if (!rule) continue;
    for (const reference of references) {
      if (reference.kind !== kind2) continue;
      const extension2 = referenceExtension(reference);
      if (rule.extensions?.length && extension2 && !rule.extensions.includes(extension2))
        return {
          code: "media_format",
          kind: kind2,
          extensions: rule.extensions,
          message: `A reference ${kind2} is ${extension2}; this model accepts ${rule.extensions.join(", ")}.`
        };
      if (rule.maxBytes !== void 0 && reference.bytes !== void 0 && reference.bytes > rule.maxBytes)
        return {
          code: "media_bytes",
          kind: kind2,
          maxBytes: rule.maxBytes,
          message: `A reference ${kind2} is ${Math.ceil(reference.bytes / (1024 * 1024))}MB; this model accepts at most ${Math.floor(rule.maxBytes / (1024 * 1024))}MB.`
        };
      const { width, height } = reference;
      if (!width || !height) continue;
      const ratio = width / height;
      const fits = width >= (rule.minWidth ?? 0) && width <= (rule.maxWidth ?? Infinity) && height >= (rule.minHeight ?? 0) && height <= (rule.maxHeight ?? Infinity) && ratio >= (rule.minRatio ?? 0) && ratio <= (rule.maxRatio ?? Infinity);
      if (fits) continue;
      const bounds = [
        ...bound("width (px)", rule.minWidth, rule.maxWidth),
        ...bound("height (px)", rule.minHeight, rule.maxHeight),
        ...bound("width/height", rule.minRatio, rule.maxRatio)
      ];
      return {
        code: "media_size",
        kind: kind2,
        message: `A reference ${kind2} is ${width}x${height}px; this model accepts ${bounds.join(", ")}.`
      };
    }
  }
  return void 0;
}

function nodeToRect$2(node2, mode2) {
  const pos = node2.positions[mode2];
  if (!pos) return null;
  const size2 = resolveNodeFootprint(node2, mode2);
  return {
    x: pos.x,
    y: pos.y,
    w: size2.width,
    h: size2.height
  };
}

function paramDisabled(capability, form2, key2) {
  return (capability.paramRules ?? []).some(
    (rule) => rule.disable.param === key2 && !rule.disable.values && form2[rule.when.param] !== void 0 && rule.when.values.some((value) => same(value, form2[rule.when.param]))
  );
}

function paramOptions(capability, key2) {
  const control = capability.controls?.[key2];
  return control?.options ?? capability.paramSchema.properties[key2]?.enum ?? [];
}

const plural = (count2, noun) => `${count2} ${noun}${count2 === 1 ? "" : "s"}`;

function required(value) {
  if (value == null) throw new Error("Invalid Canvas V3 interaction invariant");
  return value;
}

const resourceConnections = /* @__PURE__ */ new Map();

const same = (option2, value) => String(option2).toLowerCase() === value.toLowerCase();

const storageKey$1 = (edgeId) => `canvas-v3:subject-reference:${edgeId}`;

function subtitleFormatField(format2) {
  return format2 ? { subtitleFormat: format2 } : {};
}

function unprojectedSubject(node2) {
  return (node2.kind === "composition" && node2.containerKind === "subject" || node2.kind === "placeholder" && node2.expectedKind === "subject") && !node2.parentId?.startsWith("subject-type:");
}

function acceptsValue(schema, value) {
  try {
    checkValue("value", schema, value);
    return true;
  } catch {
    return false;
  }
}

const bound = (label, min2, max2) => min2 === void 0 && max2 === void 0 ? [] : [
  min2 === void 0 ? `${label} at most ${max2}` : max2 === void 0 ? `${label} at least ${min2}` : `${label} ${min2}-${max2}`
];



// [tdz] powers 上移（原第 5775 行，被第 5538 行引用）
let powers = 0;

const number$3 = increment();



function referenceExtension(reference) {
  const raw2 = reference.extension?.trim();
  if (raw2) {
    const match2 = /(\.[A-Za-z0-9]{1,8})(?:[?#].*)?$/.exec(raw2);
    if (match2) return match2[1].toLowerCase();
  }
  const mime = reference.mimeType?.split(";")[0].trim().toLowerCase();
  return mime ? MIME_EXTENSIONS[mime] : void 0;
}

function resolveAbsolutePosition(canvas, node2, mode2) {
  const own2 = node2.positions[mode2];
  if (!own2) return null;
  let x2 = own2.x;
  let y4 = own2.y;
  let parentId = node2.parentId;
  const visited = /* @__PURE__ */ new Set([node2.id]);
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = canvas.nodes.find((n2) => n2.id === parentId);
    const parentPos = parent?.positions[mode2];
    if (!parent || !parentPos) break;
    x2 += parentPos.x;
    y4 += parentPos.y;
    parentId = parent.parentId;
  }
  return { x: x2, y: y4 };
}

function resolveNodeFootprint(node2, mode2, fallback) {
  if (isIdleEmptyVideoNode(node2)) {
    return VIDEO_EMPTY_CARD_SIZE;
  }
  if (node2.type === "placeholder") {
    const data2 = node2.data;
    return placeholderNodeSize(data2?.status, data2?.aspectRatio, data2?.mediaType);
  }
  return node2.sizes?.[mode2] ?? node2.size ?? fallback ?? defaultNodeSizeForType(node2.type);
}

function rightmostLocalSourceCluster(sources) {
  if (sources.length <= 1) return sources;
  const remaining = [...sources];
  const components2 = [];
  while (remaining.length > 0) {
    const component = [remaining.pop()];
    for (let index2 = 0; index2 < component.length; index2 += 1) {
      const anchor2 = component[index2];
      for (let candidateIndex = remaining.length - 1; candidateIndex >= 0; candidateIndex -= 1) {
        if (!sourceBoxesAreLocal(anchor2, remaining[candidateIndex])) continue;
        component.push(remaining[candidateIndex]);
        remaining.splice(candidateIndex, 1);
      }
    }
    components2.push(component);
  }
  return components2.reduce((rightmost, component) => {
    const componentRight = Math.max(...component.map((source) => source.x + source.width));
    const rightmostRight = Math.max(...rightmost.map((source) => source.x + source.width));
    if (componentRight !== rightmostRight) {
      return componentRight > rightmostRight ? component : rightmost;
    }
    const componentBottom = Math.max(...component.map((source) => source.y + source.height));
    const rightmostBottom = Math.max(...rightmost.map((source) => source.y + source.height));
    return componentBottom > rightmostBottom ? component : rightmost;
  });
}

const seconds = (value) => Number(value.toFixed(3));





function trimmedVideoSeconds(length2, max2) {
  return max2 !== void 0 && length2 > max2 && length2 <= max2 + REFERENCE_VIDEO_TAIL_TRIM_SECONDS ? max2 : length2;
}

const CANVAS_V3_AUDIO_FREE_PARAMS = ["voice_id", "voice_id_source", "lyrics"];

const CANVAS_V3_PICKER_METADATA_PENDING = "media-metadata-pending";









class CanvasV3CommandRejectedError extends Error {
  constructor(status, code2) {
    super(`CANVAS_V3_COMMAND_REJECTED: ${status}${code2 ? ` ${code2}` : ""}`);
    this.status = status;
    this.code = code2;
  }
  status;
  code;
}

const FILE_CARD_DEFAULT_SIZE = { width: 350, height: 76 };

const FILE_PREVIEW_SIZE = { width: 820, height: 480 };

const NODE_SIZE_MAX = 350;



// ==== 块外：9 个媒体/校验小工具 ====
const MIME_EXTENSIONS = {
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "video/x-matroska": ".mkv",
  "video/x-msvideo": ".avi",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/wave": ".wav",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/aac": ".aac",
  "audio/flac": ".flac",
  "audio/ogg": ".ogg"
};

const REFERENCE_VIDEO_TAIL_TRIM_SECONDS = 1;

const TOKEN = /@<canvas-v3:([^>]+)>/g;

function checkValue(path2, schema, raw2) {
  if (schema.anyOf) {
    for (const option2 of schema.anyOf) {
      try {
        return checkValue(path2, option2, raw2);
      } catch {
      }
    }
    reject(`${path2} does not match any accepted form.`);
  }
  if (schema.enum) {
    const match2 = schema.enum.find((option2) => sameValue(option2, raw2));
    if (match2 === void 0)
      reject(
        `${path2}=${String(raw2)} is not supported. Supported values: ${schema.enum.join(", ")}.`
      );
    return match2;
  }
  const value = typeof raw2 === "string" ? fromText(schema, raw2) : raw2;
  const types2 = schema.type === void 0 ? [] : [schema.type].flat();
  const actual = typeOf(value);
  if (types2.length && !types2.some((type) => type === actual || type === "number" && actual === "integer"))
    reject(`${path2} must be ${types2.join(" or ")}.`);
  if (typeof value === "number" && (schema.minimum !== void 0 && value < schema.minimum || schema.maximum !== void 0 && value > schema.maximum || schema.exclusiveMinimum !== void 0 && value <= schema.exclusiveMinimum || schema.exclusiveMaximum !== void 0 && value >= schema.exclusiveMaximum))
    reject(`${path2}=${value} is outside the supported range; see the parameter description.`);
  if (typeof value === "string" && schema.pattern && !new RegExp(schema.pattern).test(value))
    reject(`${path2} does not match ${schema.pattern}.`);
  if (Array.isArray(value)) {
    if (schema.minItems !== void 0 && value.length < schema.minItems || schema.maxItems !== void 0 && value.length > schema.maxItems)
      reject(`${path2} has an unsupported number of items.`);
    const items = schema.items;
    return items ? value.map((item, index2) => checkValue(`${path2}[${index2}]`, items, item)) : value;
  }
  if (actual === "object" && value !== null && schema.properties)
    return checkObject(path2, schema, value, true);
  return value;
}

function increment() {
  return 2 ** ++powers;
}

const isObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);

function media(value) {
  if (!isObject(value) || typeof value.mimeType !== "string" || !isCount$1(value.sizeBytes) || !isOptionalSize(value.width) || !isOptionalSize(value.height) || !isOptionalSize(value.durationSeconds))
    return void 0;
  return {
    mimeType: value.mimeType,
    sizeBytes: value.sizeBytes,
    ...value.width === void 0 ? {} : { width: value.width },
    ...value.height === void 0 ? {} : { height: value.height },
    ...value.durationSeconds === void 0 ? {} : { durationSeconds: value.durationSeconds }
  };
}

const positive = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;

function sourceBoxesAreLocal(a2, b3) {
  const horizontalGap = Math.max(0, a2.x - (b3.x + b3.width), b3.x - (a2.x + a2.width));
  const verticalGap = Math.max(0, a2.y - (b3.y + b3.height), b3.y - (a2.y + a2.height));
  return horizontalGap <= DEFAULT_MAX_DERIVED_COLLISION_SHIFT && verticalGap <= DEFAULT_MAX_DERIVED_COLLISION_SHIFT;
}

function checkObject(path2, schema, value, defaults2) {
  const properties2 = schema.properties ?? {};
  const unknown2 = Object.keys(value).find(
    (key2) => !(key2 in properties2) && value[key2] !== void 0 && value[key2] !== null
  );
  if (unknown2)
    reject(
      `${path2}.${unknown2} is not a parameter of this capability. Supported keys: ${Object.keys(properties2).join(", ") || "none"}.`
    );
  const out = {};
  for (const [key2, property] of Object.entries(properties2)) {
    const item = value[key2];
    if (item !== void 0 && item !== null)
      out[key2] = checkValue(`${path2}.${key2}`, property, item);
  }
  {
    for (const [key2, property] of Object.entries(properties2))
      if (out[key2] === void 0 && property.default !== void 0) out[key2] = property.default;
  }
  for (const key2 of schema.required ?? [])
    if (out[key2] === void 0 && defaults2)
      reject(`${path2}.${key2} is required.`);
  return out;
}

function fromText(schema, value) {
  const types2 = schema.type === void 0 ? [] : [schema.type].flat();
  if (types2.includes("string")) return value;
  if (types2.includes("boolean") && (value === "true" || value === "false")) return value === "true";
  if ((types2.includes("number") || types2.includes("integer")) && value.trim() !== "") {
    const number2 = Number(value);
    if (Number.isFinite(number2)) return number2;
  }
  return value;
}

const isOptionalSize = (value) => value === void 0 || typeof value === "number" && Number.isFinite(value) && value >= 0;


function reject(message2) {
  throw new CapabilityInputError(message2);
}

function sameValue(option2, value) {
  if (option2 === value) return true;
  if (typeof option2 === "string" && typeof value === "string")
    return option2.toLowerCase() === value.toLowerCase();
  return typeof value === "string" && String(option2) === value;
}

const typeOf = (value) => Array.isArray(value) ? "array" : Number.isInteger(value) ? "integer" : typeof value === "number" ? "number" : typeof value;

class CapabilityInputError extends Error {
  name = "CapabilityInputError";
}
// createProjectResourceClient 归 model 所有（否则与 project-resource-client 成环）
function createProjectResourceClient(request) {
  async function post2(path2, body2, options2) {
    const response = await request(path2, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body2),
      ...options2?.signal ? { signal: options2.signal } : {}
    });
    if (!response.ok) throw await ProjectResourceHttpError.fromResponse(response);
    return response.json();
  }
  return {
    async getResources(selectors2, options2) {
      const request2 = { selectors: selectors2 };
      const count2 = selectors2.length;
      return parseProjectResourceReadResults(await post2(PROJECT_RESOURCE_HTTP_ROUTES.get, request2, options2), count2);
    },
    async search(query, options2) {
      return parseSearchProjectResourcesResult(await post2(PROJECT_RESOURCE_HTTP_ROUTES.search, query, options2));
    },
    async listResourceVersions(query, options2) {
      return parseListProjectResourceVersionsResult(
        await post2(PROJECT_RESOURCE_HTTP_ROUTES.listVersions, query, options2)
      );
    },
    async execute(envelope) {
      const snapshot2 = structuredClone(envelope);
      return parseProjectResourceReceipt(await post2(PROJECT_RESOURCE_HTTP_ROUTES.commands, snapshot2), snapshot2);
    }
  };
}

export {
  CANVAS_V3_AGENT_COMPOSITION_PAGE_LIMIT,
  CANVAS_V3_AUDIO_FREE_PARAMS,
  CANVAS_V3_FRAME_COLORS,
  CANVAS_V3_LEGACY_FORMAT,
  CANVAS_V3_LIMITS,
  CANVAS_V3_MEDIA_MIME_TYPES,
  CANVAS_V3_PICKER_METADATA_PENDING,
  CANVAS_V3_RESOURCE_DRAG_MIME,
  CANVAS_V3_RESOURCE_KINDS,
  CANVAS_V3_SUBJECT_PREVIEW_SIZE,
  CANVAS_V3_SUBJECT_TYPE_HEADER,
  CANVAS_V3_SUBJECT_TYPE_PADDING,
  CANVAS_V3_SUBTITLE_FORMATS,
  CLIP_MEDIA_ITEMS_LIMIT,
  COMPOSITION_POSITION_MAX,
  CanvasV3CommandRejectedError,
  CapabilityInputError,
  CompositionCommandType,
  CompositionConflictKind,
  CompositionConflictResolution,
  CompositionLifecycle,
  CompositionOperationType,
  CompositionOrderDirection,
  CompositionOrderField,
  DEFAULT_MAX_DERIVED_COLLISION_SHIFT,
  DIRECTOR_ANIMATION_MAX_BATCH,
  DIRECTOR_ANIMATION_MAX_DURATION_MS,
  DIRECTOR_ANIMATION_MAX_POINTS,
  DIRECTOR_BODY_TYPES,
  DIRECTOR_MOTION_MAX_SOURCE_LENGTH,
  DIRECTOR_MOTION_PRESET_IDS,
  DIRECTOR_PROP_ASSET_IDS,
  DirectorAnimationError,
  FILE_CARD_DEFAULT_SIZE,
  FILE_PREVIEW_SIZE,
  GENERATION_OPERATION_BY_KIND,
  ID_LIMIT,
  KIND_NAMES,
  LEGACY_NODE_FIELDS,
  MIME_EXTENSIONS,
  NODE_SIZE_MAX,
  PLACEMENT_MODE,
  PROJECT_COMPOSITION_HTTP_ROUTES,
  PROJECT_DOCUMENT_READ_DEFAULT_LINES,
  PROJECT_DOCUMENT_READ_MAX_CHARS,
  PROJECT_GENERATION_MAX_COUNT,
  PROJECT_ID_PREFIX,
  PROJECT_ID_SUFFIX_LENGTH,
  PROJECT_RESOURCE_HTTP_ROUTES,
  PROJECT_RESOURCE_READ_BATCH_LIMIT,
  PROJECT_SUBTITLE_FORMATS,
  PROJECT_SUBTITLE_STYLE_PRESETS,
  PROJECT_TASK_OPERATIONS,
  PROJECT_VIDEO_ENHANCE_FPS,
  PROJECT_VIDEO_ENHANCE_RESOLUTIONS,
  PROJECT_VIDEO_ERASE_SUBTITLE_MODES,
  ProjectActor,
  ProjectResourceCommandType,
  ProjectResourceConflictKind,
  ProjectResourceDeleteTarget,
  ProjectResourceHttpError,
  ProjectResourceUpdateKind,
  REFERENCE_VIDEO_TAIL_TRIM_SECONDS,
  RUNTIME_MEDIA_FIELDS,
  SUBJECT_DEFAULT_SECTION,
  TASK_PROBLEM_CODES,
  TASK_PROGRESS_PHASES,
  TASK_VIEW_STATUSES,
  TERMINAL_TASK_STATUSES,
  TOKEN,
  TOKEN$1,
  UUID$1,
  VIDEO_BUDGET_PREFIX,
  accepted,
  acceptsValue,
  action,
  animateDirectorScene,
  applyCanvasV3Patch,
  array,
  array$1,
  array$2,
  array$3,
  array$4,
  aspectRatioNodeSize,
  assertCanvasV3ResourceSelection,
  assertProjectResourceDetail,
  assetPreview,
  assetSummary,
  assignments,
  attributes$1,
  attributes$2,
  batch,
  billing,
  billingRechecking,
  bodyScales,
  bool,
  boolean,
  bound,
  budgeted,
  canDefer,
  canvasV3AudioForm,
  canvasV3AudioGenerationReferences,
  canvasV3AudioKindOfMode,
  canvasV3AudioModeOfModel,
  canvasV3AuthoredPrompt,
  canvasV3CanvasImages,
  canvasV3ClipboardContent,
  canvasV3ContentItems,
  canvasV3ContentPath,
  canvasV3DefaultItem,
  canvasV3DeriveGenerationCommand,
  canvasV3DerivedMembersCommand,
  canvasV3DerivedPosition,
  canvasV3DerivedPositions,
  canvasV3DodgePosition,
  canvasV3Equal,
  canvasV3FrameReferences,
  canvasV3GenerationNodeSize,
  canvasV3GenerationOperations,
  canvasV3GenerationReferences,
  canvasV3GridPosition,
  canvasV3GridPositions,
  canvasV3HistorySelection,
  canvasV3ImageLuts,
  canvasV3ImagePath,
  canvasV3ImportCommand,
  canvasV3ImportSize,
  canvasV3ItemRefEqual,
  canvasV3ItemRefKey,
  canvasV3MediaKind,
  canvasV3ModeIgnoresReferences,
  canvasV3Model,
  canvasV3ModelLastFrameOnly,
  canvasV3ModelReferenceBudget,
  canvasV3ModelReferenceKinds,
  canvasV3ModelReferencesValid,
  canvasV3NaturalMediaSize,
  canvasV3PickerKind,
  canvasV3PickerMediaReason,
  canvasV3PickerMediaReasonLabel,
  canvasV3PlacementDocument,
  canvasV3PlacementFile,
  canvasV3PromptMentions,
  canvasV3PromptReferences,
  canvasV3ReadySource,
  canvasV3ReferenceInsertionPositions,
  canvasV3ReferenceIssue,
  canvasV3ReferencePath,
  canvasV3ReferenceToken,
  canvasV3RenameCommand,
  canvasV3ResolveHistoryRequestPatch,
  canvasV3ResolveNode,
  canvasV3ResolveSource,
  canvasV3ResourceDropCommand,
  canvasV3ResourcePresentationKind,
  canvasV3SelectableItem,
  canvasV3SetActiveItemPatch,
  canvasV3SetHistorySelectionPatch,
  canvasV3StartGenerationCommand,
  canvasV3SubjectConnectionIncludesResource,
  canvasV3SubjectPosition,
  canvasV3UnmeasuredReferences,
  capabilityForm,
  changes,
  checkObject,
  checkValue,
  composition,
  compositionPlacement,
  compositionPosition,
  compositionSnapshot,
  compositionSummary,
  conflict,
  contentKind,
  contentPresentationKind,
  counts,
  coverage,
  coverage$1,
  createCanvasV3Client,
  createCanvasV3ContentTransport,
  createCanvasV3ResourcePicker,
  createCanvasV3SubjectLayout,
  createDirectorObjects,
  createDirectorScene,
  createEmptyCanvasV3Document,
  createProjectResourceClient,
  defaultJoints,
  detail,
  dictionary,
  disabledOptions,
  disposition,
  dodgePlacementFile,
  durationIssue,
  edgeRefs,
  editDirectorScene,
  entries,
  enumeration,
  enumeration$1,
  exact,
  fail,
  fields,
  findFreePosition,
  finite,
  finite$1,
  forbidden,
  fromText,
  getDerivedNodePositionFromCanvasMulti,
  id$1,
  id$2,
  id$3,
  id$4,
  id$5,
  id$6,
  id$7,
  imageSizeError,
  increment,
  integer,
  integer$1,
  integer$2,
  integer$3,
  integer$4,
  invalid$2,
  invalid$3,
  invalid$4,
  invalid$5,
  invalid$6,
  isCanvasV3Patch,
  isCanvasV3Subject,
  isCount$1,
  isId$4,
  isObject,
  isObject$2,
  isOptionalSize,
  isTaskProblemCode,
  json,
  json$1,
  keys,
  kind,
  legacyNodeType,
  media,
  media$1,
  mediaIssue,
  member,
  members,
  mintProjectId,
  nodeToRect$2,
  normalizeClipProject,
  normalizeVideoEraseSubtitleParams,
  nullable,
  nullableId,
  number,
  number$1,
  number$3,
  object$1,
  object$2,
  object$3,
  object$4,
  object$5,
  one$3,
  oneOf,
  oneOf$1,
  operation,
  optional,
  optionalBoolean,
  optionalEnum,
  origin,
  output,
  page,
  page$1,
  page$2,
  paramDisabled,
  paramOptions,
  parseCanvasV3AgentCompositionPage,
  parseCanvasV3ClipboardSnapshot,
  parseCanvasV3Command,
  parseCanvasV3CommandEffects,
  parseCanvasV3CommandReceipt,
  parseCanvasV3CommandRequest,
  parseCanvasV3CompositionContent,
  parseCanvasV3ContentBatch,
  parseCanvasV3ContentCommand,
  parseCanvasV3ContentPath,
  parseCanvasV3Document,
  parseCanvasV3DocumentWriteResult,
  parseCanvasV3Edge,
  parseCanvasV3GenerationDraft,
  parseCanvasV3HiddenLineage,
  parseCanvasV3HiddenTaskOutput,
  parseCanvasV3HistorySelection,
  parseCanvasV3ImageImportResult,
  parseCanvasV3ImageVersionTarget,
  parseCanvasV3ItemRef,
  parseCanvasV3LocalFileImportResult,
  parseCanvasV3MediaImportResult,
  parseCanvasV3MediaReferenceOrigin,
  parseCanvasV3MediaVersionTarget,
  parseCanvasV3Node,
  parseCanvasV3Patch,
  parseCanvasV3PendingGenerationSelection,
  parseCanvasV3ResourceDrop,
  parseCanvasV3SubjectLayout,
  parseCanvasV3TextGenerationRequest,
  parseCanvasV3TextGenerationResult,
  parseCanvasV3VersionRef,
  parseCanvasV3VideoAudioSplitResult,
  parseClipMediaReference,
  parseClipProject,
  parseClipSnapshot,
  parseClipboardAttributes,
  parseClipboardCompositionType,
  parseComposition,
  parseCompositionListResult,
  parseCompositionReceipt,
  parseCompositionSearchResult,
  parseCompositionTreeDrag,
  parseCompositionTypeDefs,
  parseDirectorSnapshot,
  parseEditorScene,
  parseEditorServerMessage,
  parseListAllCompositionsResult,
  parseListProjectResourceVersionsResult,
  parseMemberSelections,
  parseProjectCompositionQueryRead,
  parseProjectMediaMetadata,
  parseProjectQueryErrorBody,
  parseProjectQueryResponse,
  parseProjectResourceReadResults,
  parseProjectResourceReceipt,
  parseProjectResourceTagReceipt,
  parseProjectResourceTagSnapshot,
  parseReferenceTextPrompt,
  parseSearchProjectResourcesResult,
  parseTaskList,
  parseTaskProblem,
  parseTaskQueue,
  parseTaskRead,
  parseTaskRequestError,
  parseTaskResolveResult,
  parseTaskServerMessage,
  parseTaskSubmitResult,
  parseTaskView,
  phase,
  pickerInfo,
  placement,
  placement$1,
  placementFile,
  placementTarget,
  plural,
  point$2,
  position$1,
  positive,
  positive$3,
  powers,
  presets,
  previewContent,
  previewRange,
  progress,
  projectGenerationKindOfResource,
  projectGenerationOperation,
  projectGenerationOutputKey,
  projectStoredFileName,
  projectSubtitleFormat,
  promptReference,
  readCanvasV3SubjectConnection,
  reason,
  reconcileCanvasV3StickerPatch,
  record$4,
  record$5,
  record$6,
  record$7,
  record$8,
  record$9,
  referenceBudgetIssue,
  referenceExtension,
  reject,
  relative,
  requestedAspectRatio,
  required,
  resolveAbsolutePosition,
  resolveCanvasV3Node,
  resolveDerivedOrFreePosition,
  resolveNodeFootprint,
  resolvedMembers,
  resource,
  resourceConnections,
  resourceKinds,
  resourceTarget,
  revision$1,
  revision$2,
  rightmostLocalSourceCluster,
  same,
  sameValue,
  seconds,
  shape,
  shape$1,
  size,
  sourceBoxesAreLocal,
  storageKey$1,
  string,
  string$1,
  string$2,
  subjectOuterSize,
  subjectResourceSource,
  subtitleFormatField,
  summary,
  task,
  taskProblem,
  taskProblemMessage,
  taskProblemSource,
  text$7,
  text$8,
  text$9,
  timestamp,
  trimmedVideoSeconds,
  typeDef,
  typeOf,
  unique,
  unprojectedSubject,
  validateCanvasV3ResourceReference,
  validateDirectorAnimationRelations,
  validatePath,
  validateTrack,
  vector,
  version,
  withPosition,
  world$1,
  writeCompositionTreeDrag,
  zero,
};
