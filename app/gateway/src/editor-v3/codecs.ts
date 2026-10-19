import { createHash } from "node:crypto";

export const DIRECTOR_ID = "plugin:director-stage";
export const CLIP_ID = "plugin:clip-studio";
export const EDITOR_IDS = [DIRECTOR_ID, CLIP_ID] as const;

const DIRECTOR_MAX_BYTES = 2 * 1024 * 1024;
const CLIP_MAX_BYTES = 4 * 1024 * 1024 + 64 * 1024;
const CLIP_DOCUMENT_MAX_BYTES = 4 * 1024 * 1024;
const PREVIEW_PREFIX = "canvas-v3-resource:/api/v3/canvas/previews/";
const RUNTIME_MEDIA_FIELDS = ["blob", "fileHandle", "originalUrl", "sourceFile", "thumbnailUrl", "filmstripThumbnails", "waveformData", "isPlaceholder"];

export type EditorCapabilityId = (typeof EDITOR_IDS)[number];

export type DirectorSnapshot = {
  schemaVersion: 1;
  capabilityId: typeof DIRECTOR_ID;
  sourceResourceId: string;
  compositionId: string;
  draftRevision: number;
  versionId: string;
  scene: Record<string, unknown>;
};

export type ClipSnapshot = {
  schemaVersion: 1;
  capabilityId: typeof CLIP_ID;
  sourceResourceId: string;
  compositionId: string;
  draftRevision: number;
  versionId: string;
  project: Record<string, unknown> | null;
};

export type EditorSnapshot = DirectorSnapshot | ClipSnapshot;

export type EditorCodec = {
  capabilityId: EditorCapabilityId;
  extension: "director" | "clip";
  nodeKind: "director-stage" | "clip-studio";
  sourceRole: "director-source" | "clip-source";
  defaultName: string;
  maxFileBytes: number;
  field: "scene" | "project";
  parse: (content: unknown) => Record<string, unknown> | null;
  empty: () => Record<string, unknown> | null;
  normalize: (content: unknown) => unknown;
  references: (content: unknown) => { resourceId: string; versionId: string }[];
};

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function canonicalJson(value: unknown, ancestors = new Set<object>()): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "string":
    case "boolean":
      return JSON.stringify(value);
    case "number":
      if (!Number.isFinite(value)) throw new Error("INVALID_SOURCE");
      return JSON.stringify(value);
    case "object": {
      if (ancestors.has(value)) throw new Error("INVALID_SOURCE");
      const next = new Set(ancestors).add(value);
      if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item, next)).join(",")}]`;
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key], next)}`).join(",")}}`;
    }
    default:
      throw new Error("INVALID_SOURCE");
  }
}

export function hashCanonical(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function parseEditorScene(value: unknown): Record<string, unknown> {
  if (!record(value) || JSON.stringify(value).length > 2_000_000) throw new Error("INVALID_SCENE");
  for (const key of ["cameras", "characters", "props"]) {
    const entries = value[key];
    if (!Array.isArray(entries) || entries.length > 1_000) throw new Error("INVALID_SCENE");
    const ids = new Set<string>();
    for (const entry of entries) {
      if (!record(entry) || typeof entry.id !== "string" || !entry.id || ids.has(entry.id)) throw new Error("INVALID_SCENE_ID");
      ids.add(entry.id);
    }
  }
  if (!record(value.environment)) throw new Error("INVALID_SCENE_ENVIRONMENT");
  return structuredClone(value);
}

function zero(): { x: number; y: number; z: number } {
  return { x: 0, y: 0, z: 0 };
}

function one(): { x: number; y: number; z: number } {
  return { x: 1, y: 1, z: 1 };
}

export function createDirectorScene(): Record<string, unknown> {
  return {
    characters: [],
    props: [],
    characterGroups: [],
    cameras: [{
      id: "camera_1",
      label: "Camera 1",
      position: { x: 4, y: 2, z: 6 },
      lookAt: { x: 0, y: 1, z: 0 },
      lookAtTarget: "",
      cameraRotation: zero(),
      fov: 50,
      zoom: 1,
      visible: true,
      locked: false,
      screenshots: [],
    }],
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
      sceneScale: one(),
      sceneRotation: zero(),
      scenePosition: zero(),
      gaussianSplatPosition: zero(),
      gaussianSplatRotation: { x: 180, y: 0, z: 0 },
      gaussianSplatScale: one(),
      gaussianSplatSphericalHarmonicsDegree: 0,
    },
  };
}

export function directorReferences(scene: unknown): { resourceId: string; versionId: string }[] {
  const refs = new Map<string, { resourceId: string; versionId: string }>();
  const visit = (value: unknown) => {
    if (typeof value === "string" && value.startsWith(PREVIEW_PREFIX)) {
      const parts = value.slice(PREVIEW_PREFIX.length).split("/");
      if (parts.length !== 2) throw new Error("INVALID_SCENE_REFERENCE");
      const [resourceId, versionId] = parts.map(decodeURIComponent);
      refs.set(value, { resourceId: resourceId ?? "", versionId: versionId ?? "" });
    } else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(scene);
  return [...refs.values()];
}

export function parseClipMediaReference(value: unknown): { kind: string; resourceId: string; versionId: string } | null {
  if (typeof value !== "string") return null;
  const match = /^clip:v1:(image|video|audio|text):([^:]+):([^:]+)$/.exec(value);
  if (!match) return null;
  try {
    return { kind: match[1] ?? "", resourceId: decodeURIComponent(match[2] ?? ""), versionId: decodeURIComponent(match[3] ?? "") };
  } catch {
    return null;
  }
}

export function parseClipProject(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (!record(value)) throw new Error("INVALID_CLIP_PROJECT");
  if (Buffer.byteLength(JSON.stringify(value)) > CLIP_DOCUMENT_MAX_BYTES) throw new Error("CLIP_PROJECT_TOO_LARGE");
  const library = value.mediaLibrary;
  const timeline = value.timeline;
  if (typeof value.id !== "string" || !value.id || !record(value.settings) || !record(library) || !Array.isArray(library.items) || library.items.length > 2_000 || !record(timeline) || !Array.isArray(timeline.tracks)) {
    throw new Error("INVALID_CLIP_PROJECT");
  }
  const items = library.items.map((item) => {
    if (!record(item) || typeof item.id !== "string" || !item.id) throw new Error("INVALID_CLIP_PROJECT");
    if (item.assetId !== undefined && !parseClipMediaReference(item.assetId)) throw new Error("INVALID_CLIP_MEDIA_REFERENCE");
    const persisted = { ...item };
    for (const field of RUNTIME_MEDIA_FIELDS) delete persisted[field];
    return persisted;
  });
  return structuredClone({ ...value, mediaLibrary: { ...library, items } });
}

export function normalizeClipProject(project: unknown): unknown {
  if (!project || typeof project !== "object") return null;
  const { modifiedAt: _modifiedAt, ...content } = project as Record<string, unknown>;
  return content;
}

export function clipReferences(project: unknown): { resourceId: string; versionId: string }[] {
  if (!project || typeof project !== "object") return [];
  const library = (project as { mediaLibrary?: { items?: unknown[] } }).mediaLibrary;
  const refs = new Map<string, { resourceId: string; versionId: string }>();
  for (const item of library?.items ?? []) {
    const ref = parseClipMediaReference(record(item) ? item.assetId : undefined);
    if (ref) refs.set(`${ref.resourceId}\0${ref.versionId}`, ref);
  }
  return [...refs.values()];
}

export function assertPersistent(value: unknown): void {
  if (typeof value === "string" && /^(?:blob:|data:|file:|javascript:)/i.test(value)) throw new Error("TRANSIENT_SOURCE_REFERENCE");
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      if (key === "codeModels" && Array.isArray(entry) && entry.length) throw new Error("UNSAFE_CODE_UNAVAILABLE");
      assertPersistent(entry);
    }
  }
}

export const EDITOR_CODECS: Record<EditorCapabilityId, EditorCodec> = {
  [DIRECTOR_ID]: {
    capabilityId: DIRECTOR_ID,
    extension: "director",
    nodeKind: "director-stage",
    sourceRole: "director-source",
    defaultName: "Director",
    maxFileBytes: DIRECTOR_MAX_BYTES,
    field: "scene",
    parse: (content) => parseEditorScene(content),
    empty: () => createDirectorScene(),
    normalize: (content) => content,
    references: directorReferences,
  },
  [CLIP_ID]: {
    capabilityId: CLIP_ID,
    extension: "clip",
    nodeKind: "clip-studio",
    sourceRole: "clip-source",
    defaultName: "Clip",
    maxFileBytes: CLIP_MAX_BYTES,
    field: "project",
    parse: (content) => parseClipProject(content),
    empty: () => null,
    normalize: (content) => normalizeClipProject(content),
    references: clipReferences,
  },
};

export function editorCodecForNode(kind: string): EditorCodec | undefined {
  return Object.values(EDITOR_CODECS).find((codec) => codec.nodeKind === kind);
}

export function codecForPath(relativePath: string): EditorCodec | undefined {
  return Object.values(EDITOR_CODECS).find((codec) => relativePath.endsWith(`.${codec.extension}`));
}
