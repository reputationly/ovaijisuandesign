const forbidden = new Set(["__proto__", "prototype", "constructor"]);

export const CANVAS_V3_FRAME_COLORS = ["red", "orange", "yellow", "green", "cyan", "blue", "purple"] as const;
export const CANVAS_V3_CONTENT_KINDS = Object.freeze(["image", "video", "audio", "text", "file", "table"] as const);
export const CANVAS_V3_LIMITS = {
  nodes: 10_000,
  edges: 20_000,
  changes: 30_000,
  idLength: 256,
  titleLength: 4096,
  promptLength: 20_000,
  draftReferences: 64,
  batchCommands: 64,
  importItems: 100,
  contentBatch: 200,
};
export const CANVAS_V3_LEGACY_FORMAT = "CANVAS_V3_LEGACY_FORMAT";
const SUBJECT_DEFAULT_SECTION = "default";

export interface CanvasV3Point {
  x: number;
  y: number;
}
export interface CanvasV3Size {
  width: number;
  height: number;
}
export interface CanvasV3Node {
  id: string;
  parentId: string | null;
  position: CanvasV3Point;
  size: CanvasV3Size;
  zIndex: number;
  hidden: boolean;
  kind: string;
  [key: string]: unknown;
}
export interface CanvasV3Edge {
  id: string;
  source: string;
  target: string;
  sourceResourceId?: string;
}
export interface CanvasV3Document {
  schemaVersion: 1;
  revision: number;
  nodes: Record<string, CanvasV3Node>;
  edges: Record<string, CanvasV3Edge>;
}
export interface CanvasV3Change<T> {
  id: string;
  before: T | null;
  after: T | null;
}
export interface CanvasV3Patch {
  type: "canvas.patch";
  nodes: CanvasV3Change<CanvasV3Node>[];
  edges: CanvasV3Change<CanvasV3Edge>[];
}

/** 导入项自带的落位信息。只有目标节点还不存在时渲染层才发。 */
export interface CanvasV3ImportPlacement {
  parentId: string | null;
  position: CanvasV3Point;
  size: CanvasV3Size;
  zIndex: number;
  containerKind?: "subject";
  presentation?: "panorama";
}
/** 导入时顺带建的边：起点在 `source`，终点永远是导入出来的节点。 */
export interface CanvasV3ImportEdgeRef {
  id: string;
  source: string;
}
export interface CanvasV3ImportItem {
  nodeId: string;
  resourceId: string;
  versionId: string;
  placement?: CanvasV3ImportPlacement;
  size?: CanvasV3Size;
  edges?: CanvasV3ImportEdgeRef[];
}
/** 主体库 / 剪辑交付类命令。 */
export interface CanvasV3SubjectCommand {
  type:
    | "subject.prepare"
    | "subject.convert"
    | "subject.convert-to-media"
    | "subject.load"
    | "subject.remove-resources"
    | "subject.restore-members"
    | "subject.transfer-members";
  nodeId?: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  compositionId?: string;
  memberId?: string;
  title?: string;
  mode?: "move" | "copy";
  beforeMemberId?: string | null;
  items?: Record<string, unknown>[];
}
export interface CanvasV3ClipDeliver {
  type: "clip-studio.deliver";
  nodeId: string;
  sourceResourceId: string;
  sourceVersionId?: string;
  mediaKind: "video" | "audio";
  resourceId: string;
  versionId: string;
  placement?: { parentId: string | null; position: { x: number; y: number } };
}

/** 组合级命令：只改组合（成员/类型/顺序），不改画布文档。 */
export interface CanvasV3CompositionNodeCommand {
  type: "composition.set-type" | "composition.move";
  nodeId: string;
  typeId?: string | null;
  fromTypeId?: string | null;
  fromPosition?: number | null;
  position?: number;
  placement?: { before: string } | { after: string };
}
export interface CanvasV3SubjectMemberCommand {
  type: "subject.rename-member" | "subject.move-member" | "subject.add-members" | "subject.remove-members";
  nodeId: string;
  memberId?: string;
  title?: string;
  beforeMemberId?: string | null;
  fromBeforeMemberId?: string | null;
  items?: { memberId?: string; resourceId: string; versionId: string; role?: string }[];
}
export interface CanvasV3SubjectLayoutCommand {
  type: "subject.layout";
  nodeId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}
export interface CanvasV3CompositionDelete {
  type: "composition.delete";
  nodeIds: string[];
}
export interface CanvasV3CompositionRestore {
  type: "composition.restore";
  items: { compositionId: string; revision: number }[];
  patch: CanvasV3Patch;
}

/** 在节点上发起生成：把节点改成"待生成"的组合，任务由渲染层随后提交。 */
export interface CanvasV3GenerationCreate extends CanvasV3ImportPlacement {
  expectedKind: "image" | "video" | "audio";
  edges?: CanvasV3ImportEdgeRef[];
}
export interface CanvasV3GenerationStart {
  type: "generation.start";
  nodeId: string;
  draft: Record<string, unknown> | null;
  create?: CanvasV3GenerationCreate;
  subjectResource?: { resourceId: string; versionId: string };
  outputCompositionId?: string;
  historyRequest?: { requestId: string; outputKey: string };
}

/** 剪贴板快照：一整份子文档 + 每个组合的内容（成员与条目）。 */
export interface CanvasV3ClipboardItem {
  ref: { type: "version"; resourceId: string; versionId: string };
  resourceId: string;
  versionId: string;
  name: string;
  kind: string;
  isCurrent?: boolean;
}
export interface CanvasV3ClipboardMember {
  memberId: string;
  role: string;
  resource: string | null;
}
export interface CanvasV3ClipboardContent {
  title: string;
  compositionRevision?: number;
  members?: CanvasV3ClipboardMember[];
  items: CanvasV3ClipboardItem[];
}
export interface CanvasV3ClipboardSnapshot {
  type: "canvas-v3.clipboard";
  workspaceId: string;
  document: CanvasV3Document;
  content: Record<string, CanvasV3ClipboardContent>;
}
/** 粘贴：把快照里的节点/边按 `ids` 改名、按 `offset` 平移，组合内容建出新的组合。 */
export interface CanvasV3ClipboardPaste {
  type: "clipboard.paste";
  snapshot: CanvasV3ClipboardSnapshot;
  ids: Record<string, string>;
  offset: CanvasV3Point;
  sources?: Record<string, { resourceId: string; versionId: string }>;
  duplicate?: true;
}

/** 把一份资源版本放进画布：没有节点就新建，占位符就填上，组合就切到这一版。 */
export interface CanvasV3ContentImport {
  type: "content.import";
  items: CanvasV3ImportItem[];
}

function fail(message: string): never {
  throw new Error(`Invalid Canvas V3: ${message}`);
}

function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("expected object");
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail("non-plain object");
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || forbidden.has(key)) fail("unsafe key");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) fail("accessor or hidden field");
  }
  return value as Record<string, unknown>;
}

function exact(value: unknown, keys: string[]): Record<string, unknown> {
  const result = object(value);
  const actual = Object.keys(result);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) fail("unknown or missing field");
  return result;
}

function shape(value: unknown, required: string[], optional: string[]): Record<string, unknown> {
  const raw = object(value);
  return exact(raw, [...required, ...optional.filter((key) => Object.hasOwn(raw, key))]);
}

function id(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > CANVAS_V3_LIMITS.idLength || forbidden.has(value)) fail("invalid id");
  return value;
}

function integer(value: unknown, nonnegative = false): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || (nonnegative && value < 0)) fail("invalid integer");
  return value;
}

function finite(value: unknown, positive = false): number {
  if (typeof value !== "number" || !Number.isFinite(value) || (positive && value <= 0)) fail("invalid coordinate/size");
  return value;
}

function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") fail("expected boolean");
  return value;
}

function text(value: unknown, limit: number): string {
  if (typeof value !== "string" || value.length > limit) fail("invalid text");
  return value;
}

function array(value: unknown, limit: number): unknown[] {
  if (!Array.isArray(value) || value.length > limit) fail("invalid array");
  if (Object.getPrototypeOf(value) !== Array.prototype || Reflect.ownKeys(value).length !== value.length + 1) fail("sparse or extended array");
  for (let i = 0; i < value.length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) fail("sparse or accessor array");
  }
  return value;
}

function json(value: unknown, depth = 0): unknown {
  if (depth > 32) fail("json too deep");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("invalid json number");
    return value;
  }
  if (Array.isArray(value)) return array(value, 10_000).map((item) => json(item, depth + 1));
  const raw = object(value);
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(raw)) result[key] = json(item, depth + 1);
  return result;
}

function point(value: unknown): CanvasV3Point {
  const parsed = exact(value, ["x", "y"]);
  return { x: finite(parsed.x), y: finite(parsed.y) };
}

function size(value: unknown): CanvasV3Size {
  const parsed = exact(value, ["width", "height"]);
  return { width: finite(parsed.width, true), height: finite(parsed.height, true) };
}

function contentKind(value: unknown): string {
  if (typeof value !== "string" || !(CANVAS_V3_CONTENT_KINDS as readonly string[]).includes(value)) fail("invalid content kind");
  return value;
}

export interface CanvasV3ItemRef {
  type: "version" | "task-output" | "generation-request";
  resourceId?: string;
  versionId?: string;
  taskId?: string;
  outputKey?: string;
  requestId?: string;
}

function parseItemRef(value: unknown): CanvasV3ItemRef {
  const raw = object(value);
  if (raw.type === "version") {
    const parsed = exact(raw, ["type", "resourceId", "versionId"]);
    return { type: "version", resourceId: id(parsed.resourceId), versionId: id(parsed.versionId) };
  }
  if (raw.type === "task-output") {
    const parsed = exact(raw, ["type", "taskId", "outputKey"]);
    return { type: "task-output", taskId: id(parsed.taskId), outputKey: id(parsed.outputKey) };
  }
  return fail("invalid item ref");
}

function parsePendingGeneration(value: unknown): { requestId: string; outputKey: string } {
  const parsed = exact(value, ["requestId", "outputKey"]);
  return { requestId: id(parsed.requestId), outputKey: id(parsed.outputKey) };
}

function parseHistorySelection(value: unknown): CanvasV3ItemRef {
  const raw = object(value);
  if (raw.type !== "generation-request") return parseItemRef(value);
  const { type: _type, ...rest } = exact(raw, ["type", "requestId", "outputKey"]);
  return { type: "generation-request", ...parsePendingGeneration(rest) };
}

function parseMemberSelections(value: unknown): Record<string, CanvasV3ItemRef> {
  const entries = Object.entries(object(value));
  if (entries.length > CANVAS_V3_LIMITS.nodes) fail("too many member selections");
  return Object.fromEntries(entries.map(([key, selection]) => [id(key), parseHistorySelection(selection)]));
}

function parseHiddenLineage(value: unknown): Record<string, unknown> {
  const parsed = shape(value, ["taskId", "sourceNodeId", "referenceVersionId"], ["outputKey"]);
  return {
    taskId: id(parsed.taskId),
    sourceNodeId: id(parsed.sourceNodeId),
    referenceVersionId: id(parsed.referenceVersionId),
    ...(Object.hasOwn(parsed, "outputKey") ? { outputKey: id(parsed.outputKey) } : {}),
  };
}

function parseHiddenTaskOutput(value: unknown): { taskId: string; outputKey: string } {
  const parsed = exact(value, ["taskId", "outputKey"]);
  return { taskId: id(parsed.taskId), outputKey: id(parsed.outputKey) };
}

function parseGenerationDraft(value: unknown): Record<string, unknown> {
  const parsed = shape(value, ["modelId", "prompt", "params", "references", "outputCount"], ["destination", "excludedReferenceVersionIds", "lastFrameOnly"]);
  const params = object(parsed.params);
  const result: Record<string, unknown> = {
    modelId: parsed.modelId === null ? null : id(parsed.modelId),
    prompt: text(parsed.prompt, CANVAS_V3_LIMITS.promptLength),
    params: Object.fromEntries(Object.entries(params).map(([key, item]) => [key, json(item)])),
    references: array(parsed.references, CANVAS_V3_LIMITS.draftReferences).map((ref) => {
      const item = exact(ref, ["resourceId", "versionId"]);
      return { resourceId: id(item.resourceId), versionId: id(item.versionId) };
    }),
    outputCount: integer(parsed.outputCount),
  };
  if ((result.outputCount as number) < 1 || (result.outputCount as number) > 8) fail("invalid outputCount");
  if (Object.hasOwn(parsed, "destination")) {
    if (parsed.destination !== "new" && parsed.destination !== "in_place") fail("invalid destination");
    result.destination = parsed.destination;
  }
  if (Object.hasOwn(parsed, "excludedReferenceVersionIds")) {
    result.excludedReferenceVersionIds = array(parsed.excludedReferenceVersionIds, CANVAS_V3_LIMITS.draftReferences).map(id);
  }
  if (Object.hasOwn(parsed, "lastFrameOnly")) {
    if (parsed.lastFrameOnly !== true) fail("invalid lastFrameOnly");
    result.lastFrameOnly = true;
  }
  return result;
}

function parseSubjectLayout(value: unknown): Record<string, unknown> {
  const parsed = shape(value, ["preset", "columns", "sections", "spans", "rows"], ["arrangement", "version", "panoramaResources"]);
  if (parsed.arrangement !== undefined && parsed.arrangement !== "masonry") fail("invalid subject arrangement");
  if (parsed.preset !== "gallery" && parsed.preset !== "board") fail("invalid subject preset");
  if (![1, 2, 3].includes(parsed.columns as number)) fail("invalid subject grid");
  const resources = new Set<string>();
  const sections = new Set<string>();
  const parsedSections = array(parsed.sections, 100).map((entry) => {
    const section = exact(entry, ["id", "title", "resources"]);
    const key = id(section.id);
    if (sections.has(key)) fail("duplicate subject section");
    sections.add(key);
    return {
      id: key,
      title: text(section.title, 200),
      resources: array(section.resources, 10_000).map((item) => {
        const resource = id(item);
        if (resources.has(resource)) fail("duplicate subject layout resource");
        resources.add(resource);
        return resource;
      }),
    };
  });
  if (!sections.has(SUBJECT_DEFAULT_SECTION)) fail("missing default subject section");
  const spans = array(parsed.spans, 10_000).map((entry) => {
    const span = exact(entry, ["resourceId", "span"]);
    if (![1, 2, "full"].includes(span.span as never)) fail("invalid subject span");
    return { resourceId: id(span.resourceId), span: span.span };
  });
  if (new Set(spans.map((span) => span.resourceId)).size !== spans.length) fail("duplicate subject span");
  const rowResources = new Set<string>();
  const rows = array(parsed.rows, 10_000).map((entry) => {
    const row = exact(entry, ["sectionId", "region", "resources"]);
    const sectionId = id(row.sectionId);
    if (!sections.has(sectionId)) fail("unknown row section");
    if (row.region !== "visual" && row.region !== "details") fail("invalid row region");
    return {
      sectionId,
      region: row.region,
      resources: array(row.resources, 10_000).map((item) => {
        const resource = id(item);
        if (rowResources.has(resource)) fail("duplicate row resource");
        const owner = parsedSections.find((section) => section.resources.includes(resource));
        if (owner && owner.id !== sectionId) fail("row section mismatch");
        rowResources.add(resource);
        return resource;
      }),
    };
  });
  return {
    preset: parsed.preset,
    ...(parsed.panoramaResources !== undefined ? { panoramaResources: [...new Set(array(parsed.panoramaResources, 10_000).map(id))] } : {}),
    ...(parsed.arrangement === "masonry" ? { arrangement: "masonry" } : {}),
    columns: parsed.columns,
    sections: parsedSections,
    spans,
    rows,
  };
}

const LEGACY_NODE_FIELDS = ["resourceId", "versionId", "mediaKind", "imageResults", "generationIntentId"];

function parseNode(value: unknown): CanvasV3Node {
  const raw = object(value);
  if (raw.kind === "resource" || LEGACY_NODE_FIELDS.some((key) => Object.hasOwn(raw, key))) {
    fail(`${CANVAS_V3_LEGACY_FORMAT}: resource node snapshots are no longer supported`);
  }
  const base = ["id", "parentId", "position", "size", "zIndex", "hidden", "kind"];
  const parseBase = (parsed: Record<string, unknown>) => ({
    id: id(parsed.id),
    parentId: parsed.parentId === null ? null : id(parsed.parentId),
    position: point(parsed.position),
    size: size(parsed.size),
    zIndex: integer(parsed.zIndex),
    hidden: boolean(parsed.hidden),
  });
  const presentation = (parsed: Record<string, unknown>, allowed: boolean) => {
    if (!Object.hasOwn(parsed, "presentation") || parsed.presentation === "subject") return {};
    if (!allowed || parsed.presentation !== "panorama") fail("invalid presentation");
    return { presentation: "panorama" as const };
  };
  const hiddenLineage = (parsed: Record<string, unknown>) =>
    Object.hasOwn(parsed, "hiddenLineage") ? { hiddenLineage: array(parsed.hiddenLineage, CANVAS_V3_LIMITS.edges).map(parseHiddenLineage) } : {};
  const pendingGeneration = (parsed: Record<string, unknown>) =>
    parsed.pendingGeneration === undefined ? {} : { pendingGeneration: parsePendingGeneration(parsed.pendingGeneration) };
  const previewUrl = (parsed: Record<string, unknown>, kind: string) => {
    if (!Object.hasOwn(parsed, "previewUrl")) return {};
    const url = text(parsed.previewUrl, 4096);
    if (!url.trim() || /^(?:data|blob|javascript):/i.test(url.trim())) fail(`invalid ${kind} preview reference`);
    return { previewUrl: url };
  };
  if (raw.kind === "clip-studio") {
    const parsed = shape(raw, [...base, "title"], ["sourceResourceId", "previewUrl"]);
    return {
      ...parseBase(parsed),
      kind: "clip-studio",
      title: text(parsed.title, CANVAS_V3_LIMITS.titleLength),
      ...(parsed.sourceResourceId === undefined ? {} : { sourceResourceId: id(parsed.sourceResourceId) }),
      ...previewUrl(parsed, "clip-studio"),
    };
  }
  if (raw.kind === "director-stage") {
    const parsed = shape(raw, [...base, "title"], ["viewState", "previewUrl", "sourceResourceId"]);
    const result: CanvasV3Node = { ...parseBase(parsed), kind: "director-stage", title: text(parsed.title, CANVAS_V3_LIMITS.titleLength) };
    if (parsed.sourceResourceId !== undefined) result.sourceResourceId = id(parsed.sourceResourceId);
    if (Object.hasOwn(parsed, "viewState")) {
      const view = shape(parsed.viewState, ["viewMode", "cameraId"], ["aspect"]);
      if (!["director", "front", "top", "camera"].includes(view.viewMode as string)) fail("invalid director-stage view mode");
      const viewState: Record<string, unknown> = {
        viewMode: view.viewMode,
        cameraId: view.cameraId === null ? null : id(view.cameraId),
      };
      if (Object.hasOwn(view, "aspect")) viewState.aspect = text(view.aspect, 64);
      result.viewState = viewState;
    }
    return { ...result, ...previewUrl(parsed, "director-stage") };
  }
  if (raw.kind === "sticker") {
    const parsed = shape(raw, [...base, "stickerId", "rotation"], ["attachment"]);
    let attachment: { targetId: string; offset: CanvasV3Point } | undefined;
    if (Object.hasOwn(parsed, "attachment")) {
      const item = exact(parsed.attachment, ["targetId", "offset"]);
      attachment = { targetId: id(item.targetId), offset: point(item.offset) };
    }
    return {
      ...parseBase(parsed),
      kind: "sticker",
      stickerId: id(parsed.stickerId),
      rotation: finite(parsed.rotation),
      ...(attachment ? { attachment } : {}),
    };
  }
  if (raw.kind === "frame") {
    const parsed = shape(raw, [...base, "title", "collapsed"], ["backgroundColor"]);
    if (Object.hasOwn(parsed, "backgroundColor") && !(CANVAS_V3_FRAME_COLORS as readonly string[]).includes(parsed.backgroundColor as string)) {
      fail("invalid frame color");
    }
    return {
      ...parseBase(parsed),
      kind: "frame",
      title: text(parsed.title, CANVAS_V3_LIMITS.titleLength),
      collapsed: boolean(parsed.collapsed),
      ...(Object.hasOwn(parsed, "backgroundColor") ? { backgroundColor: parsed.backgroundColor } : {}),
    };
  }
  if (raw.kind === "placeholder") {
    const parsed = shape(raw, [...base, "expectedKind", "draft"], ["presentation", "hiddenLineage", "pendingGeneration"]);
    const expectedKind = parsed.expectedKind === "subject" || parsed.presentation === "subject" ? "subject" : contentKind(parsed.expectedKind);
    return {
      ...parseBase(parsed),
      kind: "placeholder",
      expectedKind,
      ...hiddenLineage(parsed),
      ...pendingGeneration(parsed),
      ...presentation(parsed, expectedKind === "image"),
      draft: parsed.draft === null ? null : parseGenerationDraft(parsed.draft),
    };
  }
  if (raw.kind === "composition") {
    const parsed = shape(raw, [...base, "compositionId", "activeItem", "draft"], [
      "presentation",
      "containerKind",
      "subjectLayout",
      "hiddenLineage",
      "hiddenTaskOutputs",
      "pendingGeneration",
      "memberSelections",
    ]);
    if (parsed.containerKind !== undefined && parsed.containerKind !== "subject") fail("invalid container kind");
    return {
      ...parseBase(parsed),
      kind: "composition",
      ...(parsed.containerKind === "subject" || parsed.presentation === "subject" ? { containerKind: "subject" } : {}),
      ...(parsed.subjectLayout === undefined ? {} : { subjectLayout: parseSubjectLayout(parsed.subjectLayout) }),
      compositionId: id(parsed.compositionId),
      ...hiddenLineage(parsed),
      ...(Object.hasOwn(parsed, "hiddenTaskOutputs")
        ? { hiddenTaskOutputs: array(parsed.hiddenTaskOutputs, CANVAS_V3_LIMITS.edges).map(parseHiddenTaskOutput) }
        : {}),
      activeItem: parsed.activeItem === null ? null : parseItemRef(parsed.activeItem),
      ...pendingGeneration(parsed),
      ...(parsed.memberSelections === undefined ? {} : { memberSelections: parseMemberSelections(parsed.memberSelections) }),
      draft: parsed.draft === null ? null : parseGenerationDraft(parsed.draft),
      ...presentation(parsed, true),
    };
  }
  return fail("unsupported node kind");
}

function parseEdge(value: unknown): CanvasV3Edge {
  const parsed = shape(value, ["id", "source", "target"], ["sourceResourceId"]);
  const result: CanvasV3Edge = {
    id: id(parsed.id),
    source: id(parsed.source),
    target: id(parsed.target),
    ...(parsed.sourceResourceId === undefined ? {} : { sourceResourceId: id(parsed.sourceResourceId) }),
  };
  if (result.source === result.target) fail("self edge");
  return result;
}

function parseImportPlacement(value: unknown): CanvasV3ImportPlacement {
  const parsed = shape(value, ["parentId", "position", "size", "zIndex"], ["presentation", "containerKind"]);
  if (parsed.presentation !== undefined && parsed.presentation !== "panorama") fail("invalid presentation");
  if (parsed.containerKind !== undefined && parsed.containerKind !== "subject") fail("invalid container kind");
  return {
    parentId: parsed.parentId === null ? null : id(parsed.parentId),
    position: point(parsed.position),
    size: size(parsed.size),
    zIndex: integer(parsed.zIndex),
    ...(parsed.containerKind === "subject" ? { containerKind: "subject" as const } : {}),
    ...(parsed.presentation === "panorama" ? { presentation: "panorama" as const } : {}),
  };
}

function parseImportEdges(value: unknown): CanvasV3ImportEdgeRef[] {
  const seen = new Set<string>();
  return array(value, CANVAS_V3_LIMITS.edges).map((entry) => {
    const parsed = exact(entry, ["id", "source"]);
    const edgeId = id(parsed.id);
    if (seen.has(edgeId)) fail("duplicate import edge");
    seen.add(edgeId);
    return { id: edgeId, source: id(parsed.source) };
  });
}

export function parseCanvasV3ContentImport(value: unknown): CanvasV3ContentImport {
  const parsed = exact(value, ["type", "items"]);
  if (parsed.type !== "content.import") fail("unsupported command");
  const seen = new Set<string>();
  const items = array(parsed.items, CANVAS_V3_LIMITS.importItems).map((entry) => {
    const raw = shape(entry, ["nodeId", "resourceId", "versionId"], ["placement", "size", "edges"]);
    const nodeId = id(raw.nodeId);
    if (seen.has(nodeId)) fail("duplicate import target");
    seen.add(nodeId);
    return {
      nodeId,
      resourceId: id(raw.resourceId),
      versionId: id(raw.versionId),
      ...(Object.hasOwn(raw, "placement") ? { placement: parseImportPlacement(raw.placement) } : {}),
      ...(Object.hasOwn(raw, "size") ? { size: size(raw.size) } : {}),
      ...(Object.hasOwn(raw, "edges") ? { edges: parseImportEdges(raw.edges) } : {}),
    } satisfies CanvasV3ImportItem;
  });
  if (!items.length) fail("empty import");
  return { type: "content.import", items };
}

function parseClipboardItem(value: unknown): CanvasV3ClipboardItem {
  const raw = shape(value, ["ref", "resourceId", "versionId", "name", "kind"], ["isCurrent"]);
  const ref = exact(raw.ref, ["type", "resourceId", "versionId"]);
  if (ref.type !== "version") fail("invalid clipboard item ref");
  if (raw.isCurrent !== undefined && typeof raw.isCurrent !== "boolean") fail("invalid clipboard item currency");
  return {
    ref: { type: "version", resourceId: id(ref.resourceId), versionId: id(ref.versionId) },
    resourceId: id(raw.resourceId),
    versionId: id(raw.versionId),
    name: text(raw.name, CANVAS_V3_LIMITS.titleLength),
    kind: contentKind(raw.kind),
    ...(raw.isCurrent === undefined ? {} : { isCurrent: raw.isCurrent }),
  };
}

function parseClipboardContent(value: unknown): CanvasV3ClipboardContent {
  const raw = shape(value, ["title", "items"], ["members", "compositionRevision"]);
  const items = array(raw.items, CANVAS_V3_LIMITS.importItems).map(parseClipboardItem);
  const keys = new Set(items.map((item) => `${item.resourceId}\u0000${item.versionId}`));
  if (keys.size !== items.length) fail("duplicate clipboard item");
  const members = Object.hasOwn(raw, "members")
    ? array(raw.members, CANVAS_V3_LIMITS.importItems).map((entry) => {
        const member = exact(entry, ["memberId", "role", "resource"]);
        const resource = member.resource === null ? null : id(member.resource);
        if (resource !== null && !items.some((item) => item.resourceId === resource)) fail("missing clipboard member");
        return { memberId: id(member.memberId), role: text(member.role, CANVAS_V3_LIMITS.titleLength), resource };
      })
    : undefined;
  if (raw.compositionRevision !== undefined) integer(raw.compositionRevision, true);
  return {
    title: text(raw.title, CANVAS_V3_LIMITS.titleLength),
    items,
    ...(members === undefined ? {} : { members }),
    ...(raw.compositionRevision === undefined ? {} : { compositionRevision: integer(raw.compositionRevision, true) }),
  };
}

function parseCompositionNodeCommand(value: unknown): CanvasV3CompositionNodeCommand {
  const raw = object(value);
  if (raw.type === "composition.set-type") {
    const parsed = exact(raw, ["type", "nodeId", "typeId", "fromTypeId"]);
    const typeId = parsed.typeId === null ? null : id(parsed.typeId);
    const fromTypeId = parsed.fromTypeId === null ? null : id(parsed.fromTypeId);
    if (typeId === fromTypeId) fail("type unchanged");
    return { type: "composition.set-type", nodeId: id(parsed.nodeId), typeId, fromTypeId };
  }
  if (raw.type === "composition.move") {
    const parsed = shape(raw, ["type", "nodeId", "fromPosition"], ["placement", "position"]);
    const hasPlacement = Object.hasOwn(parsed, "placement");
    const hasPosition = Object.hasOwn(parsed, "position");
    if (hasPlacement === hasPosition) fail("move needs exactly one of placement or position");
    const result: CanvasV3CompositionNodeCommand = {
      type: "composition.move",
      nodeId: id(parsed.nodeId),
      fromPosition: parsed.fromPosition === null ? null : integer(parsed.fromPosition),
    };
    if (hasPlacement) {
      const placement = object(parsed.placement);
      const hasBefore = Object.hasOwn(placement, "before");
      const hasAfter = Object.hasOwn(placement, "after");
      if (hasBefore === hasAfter) fail("invalid placement");
      result.placement = hasBefore ? { before: id(placement.before) } : { after: id(placement.after) };
    } else {
      result.position = integer(parsed.position, true);
    }
    return result;
  }
  return fail("unsupported command");
}

function parseSubjectMemberCommand(value: unknown): CanvasV3SubjectMemberCommand {
  const raw = object(value);
  if (raw.type === "subject.rename-member") {
    const parsed = exact(raw, ["type", "nodeId", "memberId", "title"]);
    const title = text(parsed.title, CANVAS_V3_LIMITS.titleLength);
    if (title !== "" && !title.trim()) fail("empty title");
    return { type: "subject.rename-member", nodeId: id(parsed.nodeId), memberId: id(parsed.memberId), title };
  }
  if (raw.type === "subject.move-member") {
    const parsed = exact(raw, ["type", "nodeId", "memberId", "beforeMemberId", "fromBeforeMemberId"]);
    const memberId = id(parsed.memberId);
    const beforeMemberId = parsed.beforeMemberId === null ? null : id(parsed.beforeMemberId);
    const fromBeforeMemberId = parsed.fromBeforeMemberId === null ? null : id(parsed.fromBeforeMemberId);
    if (beforeMemberId === memberId || fromBeforeMemberId === memberId) fail("self move");
    return { type: "subject.move-member", nodeId: id(parsed.nodeId), memberId, beforeMemberId, fromBeforeMemberId };
  }
  if (raw.type === "subject.add-members") {
    const parsed = exact(raw, ["type", "nodeId", "items"]);
    const items = array(parsed.items, CANVAS_V3_LIMITS.importItems).map((entry) => {
      const item = exact(entry, ["resourceId", "versionId"]);
      return { resourceId: id(item.resourceId), versionId: id(item.versionId) };
    });
    if (!items.length) fail("empty subject members");
    return { type: "subject.add-members", nodeId: id(parsed.nodeId), items };
  }
  if (raw.type === "subject.remove-members") {
    const parsed = exact(raw, ["type", "nodeId", "items"]);
    const seen = new Set<string>();
    const items = array(parsed.items, CANVAS_V3_LIMITS.importItems).map((entry) => {
      const item = shape(entry, ["memberId", "resourceId", "versionId"], ["role"]);
      const memberId = id(item.memberId);
      if (seen.has(memberId)) fail("duplicate subject member");
      seen.add(memberId);
      return {
        memberId,
        resourceId: id(item.resourceId),
        versionId: id(item.versionId),
        ...(item.role === undefined ? {} : { role: text(item.role, CANVAS_V3_LIMITS.titleLength) }),
      };
    });
    if (!items.length) fail("empty subject members");
    return { type: "subject.remove-members", nodeId: id(parsed.nodeId), items };
  }
  return fail("unsupported command");
}

export function parseCanvasV3SubjectCommand(value: unknown): CanvasV3SubjectCommand {
  const raw = object(value);
  const type = raw.type;
  if (type === "subject.prepare") {
    const parsed = exact(raw, ["type", "nodeId", "title"]);
    const title = text(parsed.title, CANVAS_V3_LIMITS.titleLength);
    if (!title.trim()) fail("empty title");
    return { type, nodeId: id(parsed.nodeId), title };
  }
  if (type === "subject.convert" || type === "subject.convert-to-media") {
    const parsed = exact(raw, ["type", "nodeId"]);
    return { type, nodeId: id(parsed.nodeId) };
  }
  if (type === "subject.load") {
    const parsed = exact(raw, ["type", "nodeId", "compositionId"]);
    return { type, nodeId: id(parsed.nodeId), compositionId: id(parsed.compositionId) };
  }
  if (type === "subject.remove-resources") {
    const parsed = exact(raw, ["type", "nodeId", "memberId", "items"]);
    const items = array(parsed.items, CANVAS_V3_LIMITS.importItems).map((entry) => {
      const item = exact(entry, ["resourceId", "versionId"]);
      return { resourceId: id(item.resourceId), versionId: id(item.versionId) };
    });
    if (!items.length) fail("empty subject resources");
    return { type, nodeId: id(parsed.nodeId), memberId: id(parsed.memberId), items };
  }
  if (type === "subject.restore-members") {
    const parsed = exact(raw, ["type", "nodeId", "items"]);
    const seen = new Set<string>();
    const items = array(parsed.items, CANVAS_V3_LIMITS.importItems).map((entry) => {
      const item = exact(entry, ["memberId", "resourceId", "versionId", "role", "index"]);
      const memberId = id(item.memberId);
      if (seen.has(memberId)) fail("duplicate subject member");
      seen.add(memberId);
      return { memberId, resourceId: id(item.resourceId), versionId: id(item.versionId), role: text(item.role, CANVAS_V3_LIMITS.titleLength), index: integer(item.index, true) };
    });
    if (!items.length) fail("empty subject members");
    return { type, nodeId: id(parsed.nodeId), items };
  }
  if (type === "subject.transfer-members") {
    const parsed = exact(raw, ["type", "sourceNodeId", "targetNodeId", "mode", "items", "beforeMemberId"]);
    if (parsed.mode !== "move" && parsed.mode !== "copy") fail("invalid transfer mode");
    const sourceNodeId = id(parsed.sourceNodeId);
    const targetNodeId = id(parsed.targetNodeId);
    if (sourceNodeId === targetNodeId) fail("same transfer node");
    const items = array(parsed.items, CANVAS_V3_LIMITS.importItems).map((entry) => {
      const item = exact(entry, ["memberId", "resourceId", "versionId", "role", "fromBeforeMemberId"]);
      return {
        memberId: id(item.memberId),
        resourceId: id(item.resourceId),
        versionId: id(item.versionId),
        role: text(item.role, CANVAS_V3_LIMITS.titleLength),
        fromBeforeMemberId: item.fromBeforeMemberId === null ? null : id(item.fromBeforeMemberId),
      };
    });
    if (!items.length) fail("empty subject transfer");
    return {
      type,
      sourceNodeId,
      targetNodeId,
      mode: parsed.mode,
      items,
      beforeMemberId: parsed.beforeMemberId === null ? null : id(parsed.beforeMemberId),
    };
  }
  return fail("unsupported command");
}

export function parseCanvasV3ClipDeliver(value: unknown): CanvasV3ClipDeliver {
  const parsed = shape(value, ["type", "nodeId", "sourceResourceId", "mediaKind", "resourceId", "versionId"], ["placement", "sourceVersionId"]);
  if (parsed.mediaKind !== "video" && parsed.mediaKind !== "audio") fail("invalid clip output kind");
  const result: CanvasV3ClipDeliver = {
    type: "clip-studio.deliver",
    nodeId: id(parsed.nodeId),
    sourceResourceId: id(parsed.sourceResourceId),
    mediaKind: parsed.mediaKind,
    resourceId: id(parsed.resourceId),
    versionId: id(parsed.versionId),
  };
  if (parsed.sourceVersionId !== undefined) result.sourceVersionId = id(parsed.sourceVersionId);
  if (Object.hasOwn(parsed, "placement")) {
    const placement = object(parsed.placement);
    result.placement = {
      parentId: placement.parentId === null || placement.parentId === undefined ? null : id(placement.parentId),
      position: point(placement.position),
    };
  }
  return result;
}

export function parseCanvasV3SubjectLayoutCommand(value: unknown): CanvasV3SubjectLayoutCommand {
  const parsed = exact(value, ["type", "nodeId", "before", "after"]);
  if (parsed.type !== "subject.layout") fail("unsupported command");
  return {
    type: "subject.layout",
    nodeId: id(parsed.nodeId),
    before: parsed.before === null ? null : parseSubjectLayout(parsed.before),
    after: parsed.after === null ? null : parseSubjectLayout(parsed.after),
  };
}

function parseCompositionDelete(value: unknown): CanvasV3CompositionDelete {
  const parsed = exact(value, ["type", "nodeIds"]);
  const nodeIds = [...new Set(array(parsed.nodeIds, CANVAS_V3_LIMITS.nodes).map(id))];
  if (!nodeIds.length) fail("empty composition deletion");
  return { type: "composition.delete", nodeIds };
}

function parseCompositionRestore(value: unknown): CanvasV3CompositionRestore {
  const parsed = exact(value, ["type", "items", "patch"]);
  const seen = new Set<string>();
  const items = array(parsed.items, CANVAS_V3_LIMITS.nodes).map((entry) => {
    const item = exact(entry, ["compositionId", "revision"]);
    const compositionId = id(item.compositionId);
    if (seen.has(compositionId)) fail("invalid composition restoration");
    seen.add(compositionId);
    return { compositionId, revision: integer(item.revision, true) };
  });
  if (!items.length) fail("invalid composition restoration");
  return { type: "composition.restore", items, patch: parseCanvasV3Patch(parsed.patch) };
}

export function parseCanvasV3GenerationStart(value: unknown): CanvasV3GenerationStart {
  const raw = shape(value, ["type", "nodeId", "draft"], ["create", "subjectResource", "outputCompositionId", "historyRequest"]);
  if (raw.type !== "generation.start") fail("unsupported command");
  const result: CanvasV3GenerationStart = {
    type: "generation.start",
    nodeId: id(raw.nodeId),
    draft: raw.draft === null ? null : parseGenerationDraft(raw.draft),
  };
  if (Object.hasOwn(raw, "outputCompositionId")) result.outputCompositionId = id(raw.outputCompositionId);
  if (Object.hasOwn(raw, "historyRequest")) result.historyRequest = parsePendingGeneration(raw.historyRequest);
  if (Object.hasOwn(raw, "subjectResource")) {
    const target = exact(raw.subjectResource, ["resourceId", "versionId"]);
    result.subjectResource = { resourceId: id(target.resourceId), versionId: id(target.versionId) };
  }
  if (Object.hasOwn(raw, "create")) {
    const create = object(raw.create);
    const { expectedKind, edges, ...rest } = create;
    if (expectedKind !== "image" && expectedKind !== "video" && expectedKind !== "audio") fail("invalid create kind");
    result.create = {
      ...parseImportPlacement(rest),
      expectedKind,
      ...(edges === undefined ? {} : { edges: parseImportEdges(edges) }),
    };
  }
  return result;
}

export function parseCanvasV3ClipboardSnapshot(value: unknown): CanvasV3ClipboardSnapshot {
  const raw = exact(value, ["type", "workspaceId", "document", "content"]);
  if (raw.type !== "canvas-v3.clipboard") fail("invalid clipboard type");
  const document = parseCanvasV3Document(raw.document);
  // 快照永远是一份未落盘的子文档：revision 0、不能只有隐藏节点。
  if (document.revision !== 0 || !Object.keys(document.nodes).length) fail("invalid clipboard document");
  for (const node of Object.values(document.nodes)) {
    if (node.parentId === null && node.hidden) fail("invalid hidden clipboard root");
  }
  const content: Record<string, CanvasV3ClipboardContent> = {};
  for (const [nodeId, entry] of Object.entries(object(raw.content))) {
    const key = id(nodeId);
    if (document.nodes[key]?.kind !== "composition") fail("clipboard content for a non-composition node");
    content[key] = parseClipboardContent(entry);
  }
  return { type: "canvas-v3.clipboard", workspaceId: id(raw.workspaceId), document, content };
}

export function parseCanvasV3ClipboardPaste(value: unknown): CanvasV3ClipboardPaste {
  const raw = shape(value, ["type", "snapshot", "ids", "offset"], ["sources", "duplicate"]);
  if (raw.type !== "clipboard.paste") fail("unsupported command");
  if (Object.hasOwn(raw, "duplicate") && (raw.duplicate !== true || Object.hasOwn(raw, "sources"))) fail("invalid duplicate paste");
  const snapshot = parseCanvasV3ClipboardSnapshot(raw.snapshot);
  const ids: Record<string, string> = {};
  const used = new Set<string>();
  for (const [key, entry] of Object.entries(object(raw.ids))) {
    const mapped = id(entry);
    if (used.has(mapped)) fail("reused paste id");
    used.add(mapped);
    ids[id(key)] = mapped;
  }
  for (const key of [...Object.keys(snapshot.document.nodes), ...Object.keys(snapshot.document.edges)]) {
    if (!Object.hasOwn(ids, key)) fail("missing paste id");
  }
  let sources: Record<string, { resourceId: string; versionId: string }> | undefined;
  if (Object.hasOwn(raw, "sources")) {
    sources = {};
    for (const [key, entry] of Object.entries(object(raw.sources))) {
      const source = exact(entry, ["resourceId", "versionId"]);
      sources[text(key, 2 * CANVAS_V3_LIMITS.idLength + 1)] = { resourceId: id(source.resourceId), versionId: id(source.versionId) };
    }
  }
  return {
    type: "clipboard.paste",
    snapshot,
    ids,
    offset: point(raw.offset),
    ...(sources === undefined ? {} : { sources }),
    ...(raw.duplicate === true ? { duplicate: true as const } : {}),
  };
}

function record<T extends { id: string }>(value: unknown, parse: (entry: unknown) => T, limit: number): Record<string, T> {
  const raw = object(value);
  if (Object.keys(raw).length > limit) fail("record limit exceeded");
  const result: Record<string, T> = {};
  for (const [key, entry] of Object.entries(raw)) {
    const parsed = parse(entry);
    if (id(key) !== parsed.id) fail("record key differs from id");
    result[key] = parsed;
  }
  return result;
}

export function createEmptyCanvasV3Document(): CanvasV3Document {
  return { schemaVersion: 1, revision: 0, nodes: {}, edges: {} };
}

export function parseCanvasV3Document(value: unknown): CanvasV3Document {
  const parsed = exact(value, ["schemaVersion", "revision", "nodes", "edges"]);
  if (parsed.schemaVersion !== 1) fail("unsupported schemaVersion");
  const nodes = record(parsed.nodes, parseNode, CANVAS_V3_LIMITS.nodes);
  const edges = record(parsed.edges, parseEdge, CANVAS_V3_LIMITS.edges);
  for (const node of Object.values(nodes)) {
    if (node.parentId !== null) {
      const parent = nodes[node.parentId];
      if (!parent || parent.kind !== "frame") fail("parent must be a frame");
    }
  }
  for (const node of Object.values(nodes)) {
    const attachment = node.attachment as { targetId?: string } | undefined;
    if (node.kind === "sticker" && attachment) {
      const target = Object.hasOwn(nodes, attachment.targetId ?? "") ? nodes[attachment.targetId as string] : undefined;
      if (!target || target.kind === "sticker") fail("invalid sticker attachment");
    }
  }
  const done = new Set<string>();
  for (const node of Object.values(nodes)) {
    const path = new Set<string>();
    let current: string | null = node.id;
    while (current !== null && !done.has(current)) {
      if (path.has(current)) fail("parent cycle");
      path.add(current);
      const parent: CanvasV3Node | undefined = nodes[current];
      if (!parent) fail("parent must be a frame");
      current = parent.parentId;
    }
    for (const entry of path) done.add(entry);
  }
  for (const edge of Object.values(edges)) {
    if (Object.hasOwn(nodes, edge.id)) fail("duplicate element id");
    const source = nodes[edge.source];
    const target = nodes[edge.target];
    if (!source || !target) fail("missing edge endpoint");
    if (source.kind === "sticker" || target.kind === "sticker") fail("sticker cannot be an edge endpoint");
  }
  return { schemaVersion: 1, revision: integer(parsed.revision, true), nodes, edges };
}

export function canvasV3Equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every((key) => Object.hasOwn(right, key) && canvasV3Equal(left[key], right[key]));
}

function changes<T extends { id: string }>(value: unknown, parse: (entry: unknown) => T): CanvasV3Change<T>[] {
  const seen = new Set<string>();
  return array(value, CANVAS_V3_LIMITS.changes).map((entry) => {
    const parsed = exact(entry, ["id", "before", "after"]);
    const key = id(parsed.id);
    if (seen.has(key)) fail("duplicate change");
    seen.add(key);
    const before = parsed.before === null ? null : parse(parsed.before);
    const after = parsed.after === null ? null : parse(parsed.after);
    if ((before !== null && before.id !== key) || (after !== null && after.id !== key)) fail("change id mismatch");
    if (canvasV3Equal(before, after)) fail("noop change");
    return { id: key, before, after };
  });
}

export function parseCanvasV3Patch(value: unknown, allowEmpty = false): CanvasV3Patch {
  const parsed = exact(value, ["type", "nodes", "edges"]);
  if (parsed.type !== "canvas.patch") fail("unsupported command");
  const nodes = changes(parsed.nodes, parseNode);
  const edges = changes(parsed.edges, parseEdge);
  if ((!allowEmpty && nodes.length + edges.length === 0) || nodes.length + edges.length > CANVAS_V3_LIMITS.changes) fail("empty or excessive patch");
  const ids = new Set(nodes.map((change) => change.id));
  if (edges.some((change) => ids.has(change.id))) fail("duplicate change id");
  return { type: "canvas.patch", nodes, edges };
}

export function applyCanvasV3Patch(document: CanvasV3Document, patch: unknown, allowEmpty = false): CanvasV3Document {
  const next = parseCanvasV3Document(document);
  const command = parseCanvasV3Patch(patch, allowEmpty);
  const apply = <T extends { id: string }>(items: Record<string, T>, edits: CanvasV3Change<T>[]) => {
    for (const edit of edits) {
      const current = Object.hasOwn(items, edit.id) ? items[edit.id] : null;
      if (!canvasV3Equal(current, edit.before)) fail(`before mismatch: ${edit.id}`);
      if (edit.after === null) delete items[edit.id];
      else items[edit.id] = edit.after;
    }
  };
  apply(next.nodes, command.nodes);
  apply(next.edges, command.edges);
  next.revision++;
  return parseCanvasV3Document(next);
}

export function invertCanvasV3Patch(patch: CanvasV3Patch): CanvasV3Patch {
  const parsed = parseCanvasV3Patch(patch, true);
  const invert = <T extends { id: string }>(change: CanvasV3Change<T>): CanvasV3Change<T> => ({
    id: change.id,
    before: change.after,
    after: change.before,
  });
  return { type: "canvas.patch", nodes: parsed.nodes.map(invert), edges: parsed.edges.map(invert) };
}

export type CanvasV3Command =
  | CanvasV3Patch
  | CanvasV3ContentImport
  | CanvasV3ClipboardPaste
  | CanvasV3GenerationStart
  | CanvasV3CompositionNodeCommand
  | CanvasV3SubjectMemberCommand
  | CanvasV3SubjectLayoutCommand
  | CanvasV3CompositionDelete
  | CanvasV3CompositionRestore
  | CanvasV3SubjectCommand
  | CanvasV3ClipDeliver
  | { type: "canvas.batch"; commands: CanvasV3Command[] };

export interface CanvasV3CommandRequest {
  commandId: string;
  expectedRevision: number;
  command: CanvasV3Command;
}

function parseCommand(value: unknown, nested = false): CanvasV3Command {
  const raw = object(value);
  if (raw.type === "canvas.patch") return parseCanvasV3Patch(raw);
  if (raw.type === "content.import") return parseCanvasV3ContentImport(raw);
  if (raw.type === "clipboard.paste") return parseCanvasV3ClipboardPaste(raw);
  if (raw.type === "generation.start") return parseCanvasV3GenerationStart(raw);
  if (raw.type === "subject.layout") return parseCanvasV3SubjectLayoutCommand(raw);
  if (raw.type === "composition.delete") return parseCompositionDelete(raw);
  if (raw.type === "composition.restore") return parseCompositionRestore(raw);
  if (typeof raw.type === "string" && (raw.type === "composition.set-type" || raw.type === "composition.move")) return parseCompositionNodeCommand(raw);
  if (typeof raw.type === "string" && raw.type.startsWith("subject.") && raw.type.endsWith("member")) return parseSubjectMemberCommand(raw);
  if (typeof raw.type === "string" && (raw.type === "subject.add-members" || raw.type === "subject.remove-members")) return parseSubjectMemberCommand(raw);
  if (raw.type === "clip-studio.deliver") return parseCanvasV3ClipDeliver(raw);
  if (typeof raw.type === "string" && (raw.type === "subject.prepare" || raw.type === "subject.convert" || raw.type === "subject.convert-to-media" || raw.type === "subject.load" || raw.type === "subject.remove-resources" || raw.type === "subject.restore-members" || raw.type === "subject.transfer-members")) return parseCanvasV3SubjectCommand(raw);
  if (raw.type === "canvas.batch") {
    if (nested) fail("nested batch");
    const parsed = exact(raw, ["type", "commands"]);
    const commands = array(parsed.commands, CANVAS_V3_LIMITS.batchCommands).map((command) => parseCommand(command, true));
    if (!commands.length) fail("empty batch");
    // 批量里只能放扁平命令：再套一层 batch 会让人分不清撤销的边界。
    if (commands.some((command) => command.type === "canvas.batch")) fail("unsupported command");
    return { type: "canvas.batch", commands };
  }
  return fail("unsupported command");
}

export function parseCanvasV3CommandRequest(value: unknown): CanvasV3CommandRequest {
  const parsed = exact(value, ["commandId", "expectedRevision", "command"]);
  return {
    commandId: id(parsed.commandId),
    expectedRevision: integer(parsed.expectedRevision, true),
    command: parseCommand(parsed.command),
  };
}
