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

export type CanvasV3Command = CanvasV3Patch | { type: "canvas.batch"; commands: CanvasV3Command[] };

export interface CanvasV3CommandRequest {
  commandId: string;
  expectedRevision: number;
  command: CanvasV3Command;
}

function parseCommand(value: unknown, nested = false): CanvasV3Command {
  const raw = object(value);
  if (raw.type === "canvas.patch") return parseCanvasV3Patch(raw);
  if (raw.type === "canvas.batch") {
    if (nested) fail("nested batch");
    const parsed = exact(raw, ["type", "commands"]);
    const commands = array(parsed.commands, CANVAS_V3_LIMITS.batchCommands).map((command) => parseCommand(command, true));
    if (!commands.length) fail("empty batch");
    if (commands.some((command) => command.type !== "canvas.patch")) fail("unsupported command");
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
