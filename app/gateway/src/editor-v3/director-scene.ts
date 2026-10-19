import { createDirectorScene, parseEditorScene } from "./codecs.js";

const BODY_TYPES = ["mannequin", "female", "child"] as const;
const PROP_ASSETS = ["mesh_cube", "mesh_sphere", "mesh_cylinder", "mesh_torus", "mesh_cone", "mesh_pyramid", "mesh_rectangle", "mesh_disc", "mesh_capsule", "mesh_arc", "mesh_half_cylinder", "chair", "stool", "armchair", "sofa", "square_table", "desk", "round_table", "bed", "bookshelf", "cabinet", "wardrobe", "tv", "wall_tv", "floor_lamp", "table_lamp", "rug", "wall", "column", "staircase", "ramp", "platform", "arch", "door", "fence", "ladder", "statue", "tree_small", "tree_large", "rock", "bush", "potted_plant", "stump", "flower_bed", "car", "truck", "bicycle", "streetlamp", "bench", "trash_bin", "traffic_cone", "road_barrier", "sign", "fire_hydrant", "barrel", "crate"];
const BODY_SCALES = {
  mannequin: { x: 1, y: 1, z: 1 },
  female: { x: 0.92, y: 0.92, z: 0.92 },
  child: { x: 0.78, y: 0.66, z: 0.78 },
} as const;
const DEFAULT_JOINTS = {
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
  r_ankle: { bend: 0 },
};

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function zero() {
  return { x: 0, y: 0, z: 0 };
}

function one() {
  return { x: 1, y: 1, z: 1 };
}

export function editDirectorScene(scene: Record<string, unknown>, input: Record<string, unknown>): Record<string, unknown> {
  if (Object.keys(input).some((key) => key !== "changes") || !Array.isArray(input.changes) || !input.changes.length || input.changes.length > 30) throw new Error("INVALID_CHANGES");
  const next = parseEditorScene(scene);
  for (const raw of input.changes) {
    if (!record(raw) || !["camera", "character", "prop"].includes(String(raw.kind)) || typeof raw.id !== "string") throw new Error("INVALID_CHANGE");
    const key = raw.kind === "camera" ? "cameras" : raw.kind === "character" ? "characters" : "props";
    const list = next[key];
    const entity = Array.isArray(list) ? list.find((item) => record(item) && item.id === raw.id) as Record<string, unknown> | undefined : undefined;
    if (!entity) throw new Error("OBJECT_NOT_FOUND");
    if (entity.locked) throw new Error("OBJECT_LOCKED");
    const allowed = raw.kind === "camera" ? ["position", "lookAt", "fov", "label", "visible"] : ["position", "rotation", "scale", "label", "visible"];
    for (const [field, value] of Object.entries(raw)) {
      if (field === "kind" || field === "id") continue;
      if (!allowed.includes(field)) throw new Error(`INVALID_FIELD: ${field}`);
      if (["position", "rotation", "scale", "lookAt"].includes(field)) {
        if (!record(value) || Object.keys(value).sort().join(",") !== "x,y,z" || !Object.values(value).every((item) => typeof item === "number" && Number.isFinite(item) && Math.abs(item) < 1_000_000) || (field === "scale" && !Object.values(value).every((item) => typeof item === "number" && item > 0))) {
          throw new Error(`INVALID_VECTOR: ${field}`);
        }
      } else if (field === "fov" && (typeof value !== "number" || !Number.isFinite(value) || value < 1 || value > 170)) throw new Error("INVALID_FOV");
      else if (field === "label" && (typeof value !== "string" || value.length > 256)) throw new Error("INVALID_LABEL");
      else if (field === "visible" && typeof value !== "boolean") throw new Error("INVALID_VISIBLE");
      entity[field] = structuredClone(value);
    }
  }
  return next;
}

export function createDirectorObjects(scene: Record<string, unknown>, input: Record<string, unknown>): Record<string, unknown> {
  if (Object.keys(input).some((key) => key !== "objects") || !Array.isArray(input.objects) || input.objects.length < 1 || input.objects.length > 30) throw new Error("INVALID_OBJECTS");
  const next = parseEditorScene(scene);
  const ids = new Set(Object.values(next).flatMap((value) => Array.isArray(value) ? value.filter(record).map((entry) => entry.id) : []));
  const edits: Record<string, unknown>[] = [];
  for (const raw of input.objects) {
    if (!record(raw) || typeof raw.id !== "string" || !raw.id.trim() || raw.id !== raw.id.trim() || raw.id.length > 256 || typeof raw.label !== "string" || !raw.label.trim() || raw.label.length > 256 || !["camera", "character", "prop"].includes(String(raw.kind))) {
      throw new Error("INVALID_OBJECT");
    }
    if (ids.has(raw.id)) throw new Error("OBJECT_ID_EXISTS");
    ids.add(raw.id);
    const { kind, id, bodyType = "mannequin", assetId, color, ...changes } = raw;
    if (kind !== "character" && ("bodyType" in raw || "color" in raw)) throw new Error("INVALID_CHARACTER_FIELD");
    if (kind !== "prop" && "assetId" in raw) throw new Error("INVALID_PROP_FIELD");
    let entity: Record<string, unknown>;
    if (kind === "camera") entity = { ...(createDirectorScene().cameras as Record<string, unknown>[])[0], id };
    else {
      entity = { id, position: zero(), rotation: zero(), scale: one(), uniformScale: 1, visible: true, locked: false };
      if (kind === "character") {
        if (typeof bodyType !== "string" || !BODY_TYPES.includes(bodyType as (typeof BODY_TYPES)[number])) throw new Error("INVALID_BODY_TYPE");
        if (color !== undefined && (typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color))) throw new Error("INVALID_COLOR");
        const jointAngles = structuredClone(DEFAULT_JOINTS);
        if (bodyType === "female") {
          jointAngles.l_arm.straddle = 19;
          jointAngles.r_arm.straddle = 19;
        }
        Object.assign(entity, { bodyType, color: color ?? "#4F8EF7", pose: "stand", jointAngles, scale: { ...BODY_SCALES[bodyType as keyof typeof BODY_SCALES] }, shadowEnabled: false });
      } else {
        if (typeof assetId !== "string" || !PROP_ASSETS.includes(assetId)) throw new Error("INVALID_ASSET_ID");
        entity.assetId = assetId;
      }
    }
    const key = kind === "camera" ? "cameras" : kind === "character" ? "characters" : "props";
    const list = next[key];
    if (!Array.isArray(list)) throw new Error("INVALID_SCENE");
    list.push(entity);
    edits.push({ ...changes, kind, id });
  }
  return editDirectorScene(next, { changes: edits });
}
