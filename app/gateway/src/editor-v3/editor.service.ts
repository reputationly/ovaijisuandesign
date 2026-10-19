import { HttpException, Inject, Injectable } from "@nestjs/common";

import { WorkspaceProjectArchitectureService } from "../canvas-v3/workspace-project-architecture.service.js";
import { editorCapabilityData } from "./capabilities.data.js";
import { DirectorAnimationError } from "./director-animation.js";
import { directorGuides } from "./guides.data.js";

const PAGE_LIMIT = 15_000;
const DIRECTOR_ID = "plugin:director-stage";
const CLIP_ID = "plugin:clip-studio";
const ID_PATTERN = /^[a-zA-Z0-9_.:-]{1,256}$/;
const SELECTOR_KEYS = ["ids", "methodGroups", "methods", "knownContractVersion", "cursor", "guides"];
const GUIDE_IDS = ["motion-dsl", "staging", "delivery"] as const;

type MethodInfo = { method: string; group: string; write: boolean; renderer: boolean; undoable: boolean; description: string };
type Selector = {
  ids: string[];
  methodGroups?: string[];
  methods?: string[];
  knownContractVersion?: string;
  cursor?: string;
  guides?: string[];
};

const idSchema = { type: "string", minLength: 1, maxLength: 256 };
const secondsSchema = { type: "number", minimum: 0, maximum: 86400 };
const emptySchema = { type: "object", additionalProperties: false, properties: {} };

function objectSchema(properties: Record<string, unknown>, required: string[] = []): Record<string, unknown> {
  return { type: "object", additionalProperties: false, properties, ...(required.length ? { required } : {}) };
}

const INPUT_SCHEMAS: Record<string, Record<string, unknown>> = {
  "clip:document.list": objectSchema({
    nodeIds: { type: "array", items: idSchema, minItems: 1, maxItems: 20 },
    offset: { type: "integer", minimum: 0 },
    limit: { type: "integer", minimum: 1, maximum: 20 },
  }),
  "clip:document.create": objectSchema({ name: idSchema, sourceNodeIds: { type: "array", items: idSchema, minItems: 1, maxItems: 20 } }, ["name"]),
  "clip:editor.prepare": emptySchema,
  "clip:editor.reveal": emptySchema,
  "clip:command.get": objectSchema({ commandId: idSchema }, ["commandId"]),
  "clip:project.get": objectSchema({
    view: { enum: ["summary", "tracks", "clips", "full"] },
    trackId: idSchema,
    clipId: idSchema,
    fromSec: secondsSchema,
    toSec: secondsSchema,
  }),
  "clip:project.diagnostics": emptySchema,
  "clip:project.edit": objectSchema({
    description: { type: "string", minLength: 1, maxLength: 200 },
    operations: { type: "array", minItems: 1, maxItems: 50, items: { type: "object" } },
    validateOnly: { type: "boolean" },
  }, ["description", "operations"]),
  "clip:project.history": objectSchema({ action: { enum: ["undo", "redo"] }, steps: { type: "integer", minimum: 1, maximum: 20 } }, ["action"]),
  "clip:project.view": objectSchema({ action: { enum: ["seek", "play", "pause"] }, toSec: secondsSchema, fromSec: secondsSchema }, ["action"]),
  "clip:project.snapshot": objectSchema({
    times: { type: "array", items: secondsSchema, minItems: 1, maxItems: 4 },
    fromSec: secondsSchema,
    toSec: secondsSchema,
    count: { type: "integer", minimum: 1, maximum: 4 },
    maxDim: { type: "integer", minimum: 160, maximum: 1024 },
  }),
  "clip:project.export": objectSchema({ format: { enum: ["mp4", "wav"] }, name: { type: "string", minLength: 1, maxLength: 200 } }),
  "director:document.create": objectSchema({ name: idSchema }, ["name"]),
  "director:editor.prepare": emptySchema,
  "director:editor.reveal": emptySchema,
  "director:command.recover": objectSchema({ commandId: idSchema }, ["commandId"]),
  "director:command.get": objectSchema({ commandId: idSchema }, ["commandId"]),
  "director:scene.get": objectSchema({
    kind: { enum: ["camera", "character", "prop", "path", "motion", "track"] },
    ids: { type: "array", items: idSchema, maxItems: 30 },
    offset: { type: "integer", minimum: 0 },
    limit: { type: "integer", minimum: 1, maximum: 20 },
  }),
  "director:scene.create": objectSchema({ objects: { type: "array", minItems: 1, maxItems: 30, items: { type: "object" } } }, ["objects"]),
  "director:scene.edit": objectSchema({ changes: { type: "array", minItems: 1, maxItems: 30, items: { type: "object" } } }, ["changes"]),
  "director:scene.animate": objectSchema({ paths: { type: "array", minItems: 1, items: { type: "object" } } }, ["paths"]),
  "director:video.export": objectSchema({
    name: idSchema,
    fps: { enum: [24, 30] },
    aspectRatio: { enum: ["16:9", "9:16", "1:1"] },
  }, ["name"]),
  "director:scene.undo": emptySchema,
  "director:scene.snapshot": objectSchema({ cameraId: idSchema }, ["cameraId"]),
};

const targetSchema = objectSchema({
  sourceResourceId: idSchema,
  compositionId: idSchema,
  nodeId: idSchema,
  canvasId: idSchema,
});
const workspaceTargetSchema = objectSchema({ canvasId: { const: "workspace" } }, ["canvasId"]);
const sourceTargetSchema = objectSchema({
  sourceResourceId: idSchema,
  compositionId: idSchema,
  nodeId: idSchema,
  canvasId: idSchema,
}, ["sourceResourceId"]);

class EditorFailure extends Error {
  constructor(readonly code: string, message = code) {
    super(message);
  }
}

export class EditorRequestError extends Error {
  constructor(readonly code: string, message = code, readonly diagnostics?: unknown) {
    super(message);
  }
}

function plainObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new EditorFailure("VALIDATION_FAILED", "Invalid editor request");
  return value as Record<string, unknown>;
}

function idList(value: unknown, min: number, max: number): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length < min || value.length > max || value.some((item) => typeof item !== "string" || !ID_PATTERN.test(item))) {
    throw new EditorFailure("VALIDATION_FAILED", "Invalid editor request");
  }
  return value;
}

function parseSelector(input: unknown): Selector {
  const raw = plainObject(input);
  if (Object.keys(raw).some((key) => !SELECTOR_KEYS.includes(key))) throw new EditorFailure("VALIDATION_FAILED", "Invalid editor request");
  const ids = idList(raw.ids, 1, 20);
  if (!ids) throw new EditorFailure("VALIDATION_FAILED", "Invalid editor request");
  const methodGroups = idList(raw.methodGroups, 1, 10);
  const methods = idList(raw.methods, 1, 10);
  const knownContractVersion = raw.knownContractVersion === undefined ? undefined : raw.knownContractVersion;
  if (knownContractVersion !== undefined && (typeof knownContractVersion !== "string" || !ID_PATTERN.test(knownContractVersion))) {
    throw new EditorFailure("VALIDATION_FAILED", "Invalid editor request");
  }
  if (raw.cursor !== undefined && (typeof raw.cursor !== "string" || raw.cursor.length > 20)) throw new EditorFailure("VALIDATION_FAILED", "Invalid editor request");
  let guides: string[] | undefined;
  if (raw.guides !== undefined) {
    if (!Array.isArray(raw.guides) || raw.guides.length !== 1 || typeof raw.guides[0] !== "string" || !GUIDE_IDS.includes(raw.guides[0] as (typeof GUIDE_IDS)[number])) throw new EditorFailure("VALIDATION_FAILED", "Invalid editor request");
    guides = [raw.guides[0]];
  }
  return { ids, ...(methodGroups ? { methodGroups } : {}), ...(methods ? { methods } : {}), ...(knownContractVersion ? { knownContractVersion } : {}), ...(typeof raw.cursor === "string" ? { cursor: raw.cursor } : {}), ...(guides ? { guides } : {}) };
}

function groupsOf(table: readonly MethodInfo[]): string[] {
  return [...new Set(table.map((method) => method.group))];
}

function byteLength(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value));
}

@Injectable()
export class EditorCapabilityService {
  constructor(@Inject(WorkspaceProjectArchitectureService) private readonly architecture: WorkspaceProjectArchitectureService) {}

  list() {
    this.admit();
    return {
      capabilities: [
        { id: DIRECTOR_ID, kind: "plugin", displayName: "导演台", description: "三维场景、相机与预览" },
        { id: CLIP_ID, kind: "plugin", displayName: "剪辑器", description: "时间线剪辑、字幕、预览截帧与成片导出" },
      ],
    };
  }

  contracts(input: unknown) {
    this.admit();
    const query = parseSelector(input);
    const filters = [query.methods, query.methodGroups, query.guides].filter(Boolean).length;
    if (filters > 1 || (query.guides && query.cursor !== undefined) || ((query.methods || query.methodGroups || query.guides || query.cursor !== undefined || query.knownContractVersion) && query.ids.length !== 1)) {
      throw new Error("INVALID_PLUGIN_SELECTOR");
    }
    const capabilities = [];
    const unavailable = [];
    for (const id of query.ids) {
      if (id !== DIRECTOR_ID && id !== CLIP_ID) {
        unavailable.push({ id, reason: "UNKNOWN_CAPABILITY" });
        continue;
      }
      const clip = id === CLIP_ID;
      const table = (clip ? editorCapabilityData.clipMethods : editorCapabilityData.directorMethods) as readonly MethodInfo[];
      const base = {
        ...(clip
          ? { id: CLIP_ID, kind: "plugin" as const, displayName: "剪辑器", description: "时间线剪辑、字幕、预览截帧与成片导出" }
          : { id: DIRECTOR_ID, kind: "plugin" as const, displayName: "导演台", description: "三维场景、相机与预览" }),
        contractVersion: "3",
        availability: "available" as const,
        ...(clip && query.ids.length === 1 ? { instructions: editorCapabilityData.clipInstructions } : {}),
        ...(!clip && query.ids.length === 1 ? { instructions: editorCapabilityData.directorInstructions } : {}),
      };
      if (query.guides) {
        if (clip) throw new Error("GUIDE_UNAVAILABLE");
        const guideId = query.guides[0] as keyof typeof directorGuides;
        const guide = directorGuides[guideId];
        const page = { ...base, guides: [{ id: guideId, title: guide.title, content: guide.content }] };
        if (byteLength(page) > PAGE_LIMIT) throw new Error("CONTRACT_PAGE_TOO_LARGE");
        capabilities.push(page);
        continue;
      }
      const groups = groupsOf(table);
      if (query.methodGroups?.some((group) => !groups.includes(group))) throw new Error("UNKNOWN_METHOD_GROUP");
      for (const method of query.methods ?? []) if (!table.some((entry) => entry.method === method)) throw new Error("METHOD_UNAVAILABLE");
      if (!query.methods && !query.methodGroups) {
        capabilities.push({
          ...base,
          ...(clip && query.ids.length === 1 ? { craft: editorCapabilityData.clipCraft } : {}),
          ...(!clip && query.ids.length === 1 ? { guides: Object.entries(directorGuides).map(([guideId, guide]) => ({ id: guideId, title: guide.title })) } : {}),
          methodGroups: groups.map((group) => ({ id: group, methods: table.filter((entry) => entry.group === group).map((entry) => entry.method) })),
        });
        continue;
      }
      const selected = table.filter((entry) => query.methods?.includes(entry.method) || query.methodGroups?.includes(entry.group));
      const offset = query.cursor === undefined ? 0 : Number(query.cursor);
      if (!Number.isSafeInteger(offset) || offset < 0 || offset >= selected.length) throw new Error("INVALID_CURSOR");
      const page: Record<string, unknown>[] = [];
      let next = offset;
      while (next < selected.length) {
        const entry = selected[next];
        if (!entry) break;
        const detail = this.methodPage(entry, clip);
        if (byteLength({ ...base, methods: [...page, detail] }) > PAGE_LIMIT) break;
        page.push(detail);
        next += 1;
      }
      if (!page.length) throw new Error("CONTRACT_PAGE_TOO_LARGE");
      capabilities.push({ ...base, methods: page, ...(next < selected.length ? { nextCursor: String(next) } : {}) });
    }
    return { capabilities, unavailable };
  }

  private admit(): void {
    try {
      this.architecture.assertV3();
    } catch {
      throw new Error("FORBIDDEN");
    }
    if (process.env.HILO_GATEWAY_ROLE !== "workspace" || !process.env.WORKSPACE_DIR) throw new Error("FORBIDDEN");
  }

  private methodPage(entry: MethodInfo, clip: boolean): Record<string, unknown> {
    const schema = INPUT_SCHEMAS[`${clip ? "clip" : "director"}:${entry.method}`] ?? emptySchema;
    return {
      method: entry.method,
      description: entry.description,
      ...(!clip
        ? {
            targetSchema: entry.method === "document.create" ? workspaceTargetSchema : entry.method === "command.get" || entry.method === "command.recover" ? targetSchema : sourceTargetSchema,
            requiredInvocationFields: ["method", "contractVersion", "target", "args", ...(!["document.create", "command.recover"].includes(entry.method) && (entry.write || entry.method === "video.export") ? ["baseVersionId", "expectedDraftRevision"] : [])],
          }
        : {}),
      execution: entry.write ? "write" : "read",
      requiresRenderer: entry.renderer,
      undoable: entry.undoable,
      inputSchema: schema,
    };
  }
}

export function parseEditorArgs(clip: boolean, method: string, value: unknown): Record<string, unknown> {
  const schema = INPUT_SCHEMAS[`${clip ? "clip" : "director"}:${method}`];
  if (!schema) throw new Error("METHOD_UNAVAILABLE");
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new EditorRequestError("VALIDATION_FAILED", "Invalid editor request", [{ path: "args", expected: "object" }]);
  const raw = value as Record<string, unknown>;
  const properties = schema.properties as Record<string, Record<string, unknown>>;
  const required = (schema.required as string[] | undefined) ?? [];
  for (const key of Object.keys(raw)) {
    if (!properties[key]) throw new EditorRequestError("VALIDATION_FAILED", "Invalid editor request", [{ path: `args.${key}`, expected: "unexpected" }]);
  }
  for (const key of required) if (raw[key] === undefined) throw new EditorRequestError("VALIDATION_FAILED", "Invalid editor request", [{ path: `args.${key}`, expected: "required" }]);
  const parsed: Record<string, unknown> = {};
  for (const [key, property] of Object.entries(properties)) {
    if (raw[key] === undefined) continue;
    parsed[key] = checkArg(property, raw[key], `args.${key}`);
  }
  return parsed;
}

function checkArg(property: Record<string, unknown>, value: unknown, path: string): unknown {
  if (property.const !== undefined && value !== property.const) throw new EditorRequestError("VALIDATION_FAILED", "Invalid editor request", [{ path, expected: "const" }]);
  if (Array.isArray(property.enum) && !property.enum.includes(value)) throw new EditorRequestError("VALIDATION_FAILED", "Invalid editor request", [{ path, expected: "enum" }]);
  if (property.type === "string") {
    if (typeof value !== "string") throw new EditorRequestError("VALIDATION_FAILED", "Invalid editor request", [{ path, expected: "string" }]);
    if (typeof property.minLength === "number" && value.length < property.minLength) throw new EditorRequestError("VALIDATION_FAILED", "Invalid editor request", [{ path, expected: "minLength" }]);
    if (typeof property.maxLength === "number" && value.length > property.maxLength) throw new EditorRequestError("VALIDATION_FAILED", "Invalid editor request", [{ path, expected: "maxLength" }]);
    return value;
  }
  if (property.type === "boolean") {
    if (typeof value !== "boolean") throw new EditorRequestError("VALIDATION_FAILED", "Invalid editor request", [{ path, expected: "boolean" }]);
    return value;
  }
  if (property.type === "number" || property.type === "integer") {
    if (typeof value !== "number" || !Number.isFinite(value) || (property.type === "integer" && !Number.isInteger(value))) throw new EditorRequestError("VALIDATION_FAILED", "Invalid editor request", [{ path, expected: property.type }]);
    if (typeof property.minimum === "number" && value < property.minimum) throw new EditorRequestError("VALIDATION_FAILED", "Invalid editor request", [{ path, expected: "minimum" }]);
    if (typeof property.maximum === "number" && value > property.maximum) throw new EditorRequestError("VALIDATION_FAILED", "Invalid editor request", [{ path, expected: "maximum" }]);
    return value;
  }
  if (property.type === "array") {
    if (!Array.isArray(value)) throw new EditorRequestError("VALIDATION_FAILED", "Invalid editor request", [{ path, expected: "array" }]);
    if (typeof property.minItems === "number" && value.length < property.minItems) throw new EditorRequestError("VALIDATION_FAILED", "Invalid editor request", [{ path, expected: "minItems" }]);
    if (typeof property.maxItems === "number" && value.length > property.maxItems) throw new EditorRequestError("VALIDATION_FAILED", "Invalid editor request", [{ path, expected: "maxItems" }]);
    const items = property.items as Record<string, unknown> | undefined;
    return items ? value.map((item, index) => checkArg(items, item, `${path}[${index}]`)) : value;
  }
  if (property.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new EditorRequestError("VALIDATION_FAILED", "Invalid editor request", [{ path, expected: "object" }]);
    return value;
  }
  return value;
}

export async function editorResponse<T>(action: () => T | Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof HttpException) throw error;
    const message = error instanceof Error ? error.message : "EDITOR_FAILED";
    const animation = error instanceof DirectorAnimationError ? error.diagnostic : undefined;
    const code = animation ? animation.code : error instanceof EditorFailure || error instanceof EditorRequestError ? error.code : message;
    const diagnostics = animation ? [animation] : error instanceof EditorRequestError ? error.diagnostics : undefined;
    throw new HttpException({ error: { code, message, ...(diagnostics ? { diagnostics } : {}) } }, 409);
  }
}
