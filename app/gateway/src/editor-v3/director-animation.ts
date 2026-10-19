import { parseEditorScene } from "./codecs.js";

const MAX_DURATION_MS = 60_000;
const MAX_BATCH = 30;
const MAX_POINTS = 100;
const MAX_SOURCE = 16_000;
const PRESETS = new Set(["idle", "walk", "run", "jump", "talk", "wave", "bow", "cheer", "dance", "sit_talk", "punch", "death"]);

export class DirectorAnimationError extends Error {
  readonly diagnostic: { code: string; path: string; actualJson: string; expected: string; recovery: string };

  constructor(code: string, path: string, actual: unknown, expected: string, recovery: string) {
    super(`${code}${path ? ` at ${path}` : ""}: ${expected}. ${recovery}`);
    this.name = "DirectorAnimationError";
    let actualJson: string;
    try {
      actualJson = JSON.stringify(actual) ?? "undefined";
    } catch {
      actualJson = "[unserializable]";
    }
    this.diagnostic = { code, path, actualJson: actualJson.slice(0, 256), expected, recovery };
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function entries(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(record) : [];
}

function fields(value: unknown, allowed: string[], path = ""): Record<string, unknown> {
  if (!record(value)) throw new DirectorAnimationError("INVALID_ANIMATION_FIELD", path, value, "An object", "Provide a JSON object with the documented fields");
  const unexpected = Object.keys(value).find((key) => !allowed.includes(key));
  if (unexpected !== undefined) throw new DirectorAnimationError("INVALID_ANIMATION_FIELD", path ? `${path}.${unexpected}` : unexpected, value[unexpected], `Allowed fields: ${allowed.join(", ")}`, "Correct the field name using the animation contract");
  return value;
}

function text(value: unknown, field: string, max = 256, path = ""): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new DirectorAnimationError(`INVALID_ANIMATION_${field}`, path, value, `A nonempty string of at most ${max} characters`, "Provide a nonempty value within the length limit");
  return value;
}

function idOf(value: unknown, path = ""): string {
  const result = text(value, "ID", 256, path);
  if (result !== result.trim()) throw new DirectorAnimationError("INVALID_ANIMATION_ID", path, value, "An ID without surrounding whitespace", "Trim surrounding whitespace from the ID");
  return result;
}

function numberIn(value: unknown, min: number, max: number, field: string, path = ""): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new DirectorAnimationError(`INVALID_ANIMATION_${field}`, path, value, `A finite number in [${min}, ${max}]`, "Provide a number within the documented bounds");
  return value;
}

function optionalBoolean(value: Record<string, unknown>, key: string, path: string): void {
  if (key in value && typeof value[key] !== "boolean") throw new DirectorAnimationError(`INVALID_ANIMATION_${key}`, `${path}.${key}`, value[key], "A boolean", "Use true or false, or omit the optional field");
}

function optionalEnum(value: Record<string, unknown>, key: string, allowed: string[], path: string): void {
  if (key in value && (typeof value[key] !== "string" || !allowed.includes(value[key] as string))) throw new DirectorAnimationError(`INVALID_ANIMATION_${key}`, `${path}.${key}`, value[key], `One of: ${allowed.join(", ")}`, "Use a documented value, or omit the optional field");
}

function vector(value: unknown, path: string): void {
  const item = fields(value, ["x", "y", "z"], path);
  for (const axis of ["x", "y", "z"]) numberIn(item[axis], -999_999, 999_999, "VECTOR", `${path}.${axis}`);
}

function batch(value: unknown, path: string, max = MAX_BATCH): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length > max || !value.every(record)) throw new DirectorAnimationError("INVALID_ANIMATION_BATCH", path, value, `An array of at most ${max} objects`, "Provide an array of documented animation entries");
  const ids = new Set<string>();
  value.forEach((entry, index) => {
    const entryId = idOf(entry.id, `${path}[${index}].id`);
    if (ids.has(entryId)) throw new DirectorAnimationError("DUPLICATE_ANIMATION_ID", `${path}[${index}].id`, entryId, "A unique ID within this batch", "Give this entry a distinct ID and update any references to it");
    ids.add(entryId);
  });
  return value;
}

export function validateDirectorAnimationRelations(input: unknown): void {
  if (!record(input)) return;
  if (Object.keys(input).every((key) => ["paths", "motions", "tracks"].includes(key)) && !("tracks" in input) && (!("paths" in input) || (Array.isArray(input.paths) && input.paths.length === 0)) && (!("motions" in input) || (Array.isArray(input.motions) && input.motions.length === 0))) {
    throw new DirectorAnimationError("EMPTY_ANIMATION", "", input, "At least one path or motion, or an explicit tracks array", "Provide the requested animation data; use tracks: [] only to explicitly clear the timeline");
  }
  if (Array.isArray(input.paths)) {
    input.paths.forEach((raw, index) => {
      if (!record(raw)) return;
      const location = `paths[${index}]`;
      if (Array.isArray(raw.points) && raw.points.some((point) => record(point) && "timeK" in point)) {
        let previous = -1;
        raw.points.forEach((point, pointIndex) => {
          if (!record(point)) return;
          const timeK = point.timeK;
          if (typeof timeK !== "number" || !Number.isFinite(timeK) || timeK < 0 || timeK > 1 || timeK <= previous) {
            throw new DirectorAnimationError("INVALID_ANIMATION_TIME_K", `${location}.points[${pointIndex}].timeK`, timeK, `Every point must have timeK in [0, 1], strictly greater than the preceding value (${previous})`, "Set strictly increasing timeK values on every point, or omit timeK from every point to use automatic timing");
          }
          previous = timeK;
        });
      }
      if (("fovStart" in raw) !== ("fovEnd" in raw)) {
        const missing = "fovStart" in raw ? "fovEnd" : "fovStart";
        throw new DirectorAnimationError("INVALID_ANIMATION_FOV_PAIR", `${location}.${missing}`, raw[missing], "fovStart and fovEnd must be provided together", "Provide both FOV values in [10, 120], or omit both for a path without an FOV transition");
      }
      if (raw.lookAtTarget === "__none__" && !("lookAt" in raw)) throw new DirectorAnimationError("INVALID_ANIMATION_LOOK_AT", `${location}.lookAt`, raw.lookAt, "lookAt is required when lookAtTarget is __none__", "Provide the fixed lookAt position as {x, y, z}");
      if ("lookAt" in raw && raw.lookAtTarget !== "__none__") throw new DirectorAnimationError("INVALID_ANIMATION_LOOK_AT", `${location}.lookAt`, raw.lookAt, "A fixed lookAt position requires lookAtTarget: __none__", "Set lookAtTarget to __none__ for a fixed point, or omit lookAt and use an existing object ID for tracking");
    });
  }
  if (Array.isArray(input.tracks)) {
    input.tracks.forEach((raw, index) => {
      if (!record(raw)) return;
      const location = `tracks[${index}]`;
      if (raw.kind === "anim" && (typeof raw.targetId !== "string" || !raw.targetId.trim())) throw new DirectorAnimationError("INVALID_ANIMATION_TARGET", `${location}.targetId`, raw.targetId, "A skeleton animation track requires an existing character targetId", "Set targetId to a character ID; for a camera path omit kind and targetId");
      if (raw.kind === "anim" && "orient" in raw) throw new DirectorAnimationError("INVALID_ANIMATION_ORIENT", `${location}.orient`, raw.orient, "orient is only supported on object movement tracks, not skeleton animation tracks", "For spatial movement keep the path and targetId and omit kind; for a skeleton motion omit orient and reference a motion ID");
      if (!("targetId" in raw) && "orient" in raw) throw new DirectorAnimationError("INVALID_ANIMATION_TARGET", `${location}.orient`, raw.orient, "A camera track cannot use orient; object movement requires targetId", "Set targetId for object movement, or omit orient for camera movement");
      if (Array.isArray(raw.clips)) {
        raw.clips.forEach((clip, clipIndex) => {
          if (!record(clip)) return;
          if (typeof clip.start === "number" && typeof clip.duration === "number" && clip.start + clip.duration > MAX_DURATION_MS) {
            throw new DirectorAnimationError("ANIMATION_TOO_LONG", `${location}.clips[${clipIndex}].duration`, clip.duration, `start + duration must be <= ${MAX_DURATION_MS} ms (start is ${clip.start})`, "Adjust the clip start or duration to fit within 60000 ms without silently dropping the requested action");
          }
        });
      }
    });
  }
}

function validatePath(raw: Record<string, unknown>, scene: Record<string, unknown>, location: string): void {
  fields(raw, ["id", "label", "points", "duration", "visible", "lookAtTarget", "lookAt", "easing", "loopMode", "closed", "fovStart", "fovEnd", "keyframeCameraId"], location);
  text(raw.label, "LABEL", 256, `${location}.label`);
  numberIn(raw.duration, 1, MAX_DURATION_MS, "DURATION", `${location}.duration`);
  if (!Array.isArray(raw.points) || raw.points.length < 2 || raw.points.length > MAX_POINTS) throw new DirectorAnimationError("INVALID_ANIMATION_POINTS", `${location}.points`, raw.points, `An array of 2 to ${MAX_POINTS} path points`, "Provide at least a start and end position");
  raw.points.forEach((point, index) => {
    const pointLocation = `${location}.points[${index}]`;
    const item = fields(point, ["position", "in", "out", "tilt", "fov", "speed", "tangentMode", "timeK"], pointLocation);
    vector(item.position, `${pointLocation}.position`);
    for (const key of ["in", "out"]) if (key in item) vector(item[key], `${pointLocation}.${key}`);
    if ("tilt" in item) numberIn(item.tilt, -Math.PI * 2, Math.PI * 2, "TILT", `${pointLocation}.tilt`);
    if ("fov" in item) numberIn(item.fov, 10, 120, "FOV", `${pointLocation}.fov`);
    if ("speed" in item) numberIn(item.speed, 0.1, 5, "SPEED", `${pointLocation}.speed`);
    optionalEnum(item, "tangentMode", ["aligned", "free"], pointLocation);
  });
  optionalBoolean(raw, "visible", location);
  optionalBoolean(raw, "closed", location);
  optionalEnum(raw, "easing", ["linear", "easeIn", "easeOut", "easeInOut", "smoothstep"], location);
  optionalEnum(raw, "loopMode", ["once", "loop", "pingpong"], location);
  for (const key of ["fovStart", "fovEnd"]) if (key in raw) numberIn(raw[key], 10, 120, "FOV", `${location}.${key}`);
  if ("lookAt" in raw) vector(raw.lookAt, `${location}.lookAt`);
  if ("lookAtTarget" in raw) {
    if (typeof raw.lookAtTarget !== "string") throw new DirectorAnimationError("INVALID_ANIMATION_LOOK_AT", `${location}.lookAtTarget`, raw.lookAtTarget, "An existing character/prop ID, __none__ for a fixed position, or an empty string", "Select a documented lookAtTarget value");
    if (raw.lookAtTarget !== "__none__" && raw.lookAtTarget && ![...entries(scene.characters), ...entries(scene.props)].some((item) => item.id === raw.lookAtTarget)) {
      throw new DirectorAnimationError("OBJECT_NOT_FOUND", `${location}.lookAtTarget`, raw.lookAtTarget, "An existing character or prop ID", "Read the scene to select an existing look-at target");
    }
  }
  if ("keyframeCameraId" in raw && !entries(scene.cameras).some((item) => item.id === idOf(raw.keyframeCameraId, `${location}.keyframeCameraId`))) {
    throw new DirectorAnimationError("OBJECT_NOT_FOUND", `${location}.keyframeCameraId`, raw.keyframeCameraId, "An existing camera ID", "Read the scene cameras and select the intended camera ID");
  }
}

function validateTrack(raw: Record<string, unknown>, scene: Record<string, unknown>, location: string): void {
  fields(raw, ["id", "label", "muted", "clips", "kind", "targetId", "orient"], location);
  text(raw.label, "LABEL", 256, `${location}.label`);
  optionalBoolean(raw, "muted", location);
  optionalEnum(raw, "kind", ["anim"], location);
  optionalEnum(raw, "orient", ["follow", "keep"], location);
  if ("targetId" in raw) {
    const targets = raw.kind === "anim" ? entries(scene.characters) : [...entries(scene.characters), ...entries(scene.props)];
    if (!targets.some((item) => item.id === idOf(raw.targetId, `${location}.targetId`))) {
      throw new DirectorAnimationError("OBJECT_NOT_FOUND", `${location}.targetId`, raw.targetId, raw.kind === "anim" ? "An existing character ID for a skeleton track" : "An existing character or prop ID for movement", "Read the scene and select the correct object ID; skeleton animation does not target props or cameras");
    }
  }
  batch(raw.clips, `${location}.clips`).forEach((clip, index) => {
    const clipLocation = `${location}.clips[${index}]`;
    fields(clip, ["id", "pathId", "start", "duration", "enabled"], clipLocation);
    const reference = idOf(clip.pathId, `${clipLocation}.pathId`);
    const exists = raw.kind === "anim" ? PRESETS.has(reference) || entries(scene.customMotions).some((item) => item.id === reference) : entries(scene.camPaths).some((item) => item.id === reference);
    if (!exists) {
      const isSpatialPath = entries(scene.camPaths).some((item) => item.id === reference);
      const isMotion = PRESETS.has(reference) || entries(scene.customMotions).some((item) => item.id === reference);
      throw new DirectorAnimationError("ANIMATION_REFERENCE_NOT_FOUND", `${clipLocation}.pathId`, reference, raw.kind === "anim" ? "A built-in or custom motion ID for kind: anim" : "A spatial path ID for a movement track", raw.kind === "anim" && isSpatialPath ? "This ID is a spatial path. For object movement keep targetId and omit kind; for camera movement omit kind and targetId. Keep the requested movement track" : raw.kind !== "anim" && isMotion ? "This ID is a skeleton motion. Set kind: anim and a character targetId; create a separate spatial path track for translation" : "Use an existing reference of the required type, or include its definition in paths/motions in this same batch");
    }
    numberIn(clip.start, 0, MAX_DURATION_MS, "START", `${clipLocation}.start`);
    numberIn(clip.duration, 1, MAX_DURATION_MS, "DURATION", `${clipLocation}.duration`);
    optionalBoolean(clip, "enabled", clipLocation);
  });
}

export function animateDirectorScene(scene: Record<string, unknown>, input: Record<string, unknown>): Record<string, unknown> {
  validateDirectorAnimationRelations(input);
  const args = fields(input, ["paths", "motions", "tracks"]);
  const paths = "paths" in args ? batch(args.paths, "paths") : [];
  const motions = "motions" in args ? batch(args.motions, "motions") : [];
  const tracks = "tracks" in args ? batch(args.tracks, "tracks") : undefined;
  const next = parseEditorScene(scene);
  const previousTracks = record(next.camTimeline) ? entries(next.camTimeline.tracks) : [];
  const namespaces = new Map<string, string>();
  const claim = (entry: Record<string, unknown>, namespace: string, upsert: boolean, location: string) => {
    const key = idOf(entry.id, `${location}.id`);
    const previous = namespaces.get(key);
    if (previous && (!upsert || previous !== namespace)) throw new DirectorAnimationError("ANIMATION_ID_EXISTS", `${location}.id`, key, `An ID not already used in ${previous}`, "Use a distinct ID across objects, paths, motions, tracks and clips; only same-type upserts may reuse IDs");
    namespaces.set(key, namespace);
  };
  for (const [key, value] of Object.entries(next)) {
    entries(value).forEach((entry, index) => {
      if (typeof entry.id === "string") claim(entry, key, false, `scene.${key}[${index}]`);
    });
  }
  previousTracks.forEach((track, index) => {
    claim(track, "track", false, `scene.camTimeline.tracks[${index}]`);
    entries(track.clips).forEach((clip, clipIndex) => claim(clip, "clip", false, `scene.camTimeline.tracks[${index}].clips[${clipIndex}]`));
  });
  const locked = (targetId: unknown, location: string) => {
    if ([...entries(next.characters), ...entries(next.props), ...entries(next.cameras)].some((item) => item.id === targetId && item.locked)) {
      throw new DirectorAnimationError("OBJECT_LOCKED", location, targetId, "An unlocked animation target", "Keep the current locked object animation intact; explicitly unlock the target before changing its tracks or referenced data");
    }
  };
  const upsert = (key: string, incoming: Record<string, unknown>[], location: string) => {
    const current = entries(next[key]);
    incoming.forEach((raw, incomingIndex) => {
      claim(raw, key, true, `${location}[${incomingIndex}]`);
      const index = current.findIndex((item) => item.id === raw.id);
      if (index < 0) current.push(structuredClone(raw));
      else current[index] = structuredClone(raw);
    });
    if (incoming.length) next[key] = current;
  };
  paths.forEach((path, index) => {
    const location = `paths[${index}]`;
    validatePath(path, next, location);
    const previous = entries(next.camPaths).find((item) => item.id === path.id);
    if (previous?.locked) throw new DirectorAnimationError("OBJECT_LOCKED", `${location}.id`, path.id, "An unlocked path", "Keep the locked path unchanged, or explicitly unlock it before updating it");
    if (typeof previous?.keyframeCameraId === "string") locked(previous.keyframeCameraId, `${location}.id`);
    if (path.keyframeCameraId) locked(path.keyframeCameraId, `${location}.keyframeCameraId`);
  });
  motions.forEach((motion, index) => {
    const location = `motions[${index}]`;
    fields(motion, ["id", "label", "source"], location);
    if ("label" in motion) text(motion.label, "LABEL", 256, `${location}.label`);
    text(motion.source, "SOURCE", MAX_SOURCE, `${location}.source`);
    if (PRESETS.has(idOf(motion.id, `${location}.id`))) throw new DirectorAnimationError("PRESET_MOTION_READ_ONLY", `${location}.id`, motion.id, "A custom motion ID distinct from built-in presets", "Choose a new custom motion ID; reference the preset directly to use it without modification");
  });
  upsert("camPaths", paths.map((path) => ({
    visible: true,
    ...path,
    points: entries(path.points).map((point) => ({ in: { x: 0, y: 0, z: 0 }, out: { x: 0, y: 0, z: 0 }, ...point })),
  })), "paths");
  upsert("customMotions", motions, "motions");
  if (tracks !== undefined) {
    const seen = new Set<string>();
    tracks.forEach((track, index) => {
      const location = `tracks[${index}]`;
      validateTrack(track, next, location);
      [[track, "track", location] as const, ...entries(track.clips).map((clip, clipIndex) => [clip, "clip", `${location}.clips[${clipIndex}]`] as const)].forEach(([entry, namespace, entryLocation]) => {
        const key = idOf(entry.id, `${entryLocation}.id`);
        if (seen.has(key)) throw new DirectorAnimationError("DUPLICATE_ANIMATION_ID", `${entryLocation}.id`, key, "A unique ID across all tracks and clips", "Give this entry a distinct ID and update any references to it");
        seen.add(key);
        claim(entry, namespace, true, entryLocation);
      });
    });
    previousTracks.forEach((track, index) => {
      if (JSON.stringify(track) !== JSON.stringify(tracks[index])) locked(track.targetId, tracks[index] ? `tracks[${index}]` : "tracks");
    });
    tracks.forEach((track, index) => {
      if (JSON.stringify(track) !== JSON.stringify(previousTracks[index])) locked(track.targetId, `tracks[${index}].targetId`);
    });
    next.camTimeline = { ...(record(next.camTimeline) ? next.camTimeline : {}), tracks: structuredClone(tracks) };
  }
  const changedReferences = new Set([...paths, ...motions].map((item) => item.id));
  for (const track of [...previousTracks, ...(tracks ?? [])]) {
    const clip = entries(track.clips).find((item) => changedReferences.has(String(item.pathId)));
    if (clip) {
      const pathIndex = paths.findIndex((path) => path.id === clip.pathId);
      const location = pathIndex >= 0 ? `paths[${pathIndex}].id` : `motions[${motions.findIndex((motion) => motion.id === clip.pathId)}].id`;
      locked(track.targetId, location);
    }
  }
  if (!next.camTimeline && entries(next.camPaths).length) {
    if (entries(scene.camPaths).length) throw new DirectorAnimationError("TIMELINE_REQUIRED", "tracks", undefined, "An explicit timeline when editing a legacy scene containing paths", "Read the existing scene and supply tracks preserving the intended playback; use [] only for an intentional clear");
    next.camTimeline = { tracks: [] };
  }
  return parseEditorScene(next);
}

export function summarizeDirectorAnimation(scene: Record<string, unknown>) {
  const result = { verification: "structure_only" as const, cameraTrackIds: [] as string[], movementTargetIds: [] as string[], poseTargetIds: [] as string[] };
  const tracks = record(scene.camTimeline) ? scene.camTimeline.tracks : undefined;
  if (!Array.isArray(tracks)) return result;
  for (const track of tracks) {
    if (!record(track) || track.muted || !Array.isArray(track.clips) || !track.clips.some((clip) => record(clip) && clip.enabled !== false && typeof clip.duration === "number" && clip.duration > 0)) continue;
    if (track.kind === "anim" && typeof track.targetId === "string") result.poseTargetIds.push(track.targetId);
    else if (typeof track.targetId === "string" && track.targetId) result.movementTargetIds.push(track.targetId);
    else if (typeof track.id === "string") result.cameraTrackIds.push(track.id);
  }
  result.movementTargetIds = [...new Set(result.movementTargetIds)];
  result.poseTargetIds = [...new Set(result.poseTargetIds)];
  return result;
}
