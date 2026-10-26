/**
 * design_execute 入参/输出的纯函数，照参照 4.0.4 的 designInput / designOutputs 写。
 */
function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}
const OPERATIONS = new Set(["generate_image", "generate_video", "generate_speech", "generate_music"]);
function capabilityOperation(value) {
  if (typeof value !== "string") return undefined;
  const [prefix] = value.split(":");
  if (prefix === "edit_media") return "edit_media";
  return OPERATIONS.has(prefix) ? prefix : undefined;
}
export const isMediaEditCapabilityId = (value) => typeof value === "string" && value.startsWith("edit_media:");
export const isSidecarOutputKey = (key) => typeof key === "string" && /(^|_)(subtitle|lyrics)$/.test(key);

export function designExecutionInput(args) {
  if (["prompt", "params", "references"].some((key) => Object.hasOwn(args ?? {}, key))) return args;
  return record(args?.input) ?? args;
}
export function designReferences(value) {
  if (!Array.isArray(value)) return [];
  const references = [];
  for (const item of value) {
    const reference = record(item);
    if (!reference) continue;
    const resourceId = typeof reference.resourceId === "string" ? reference.resourceId : "";
    const versionId = typeof reference.versionId === "string" ? reference.versionId : "";
    const name = typeof reference.name === "string" && reference.name.trim() ? reference.name : undefined;
    if (resourceId) references.push(versionId ? { resourceId, versionId, name } : { resourceId, name });
    else if (versionId) references.push({ versionId, name });
  }
  return references;
}
export function primaryResourceName(output) {
  const resources = record(output)?.resources;
  if (!Array.isArray(resources)) return undefined;
  const primary = resources.map(record).find((target) => target?.key === "primary");
  return primary?.mode === "create" && typeof primary.name === "string" && primary.name.trim() ? primary.name.trim() : undefined;
}
export function designInput(args) {
  const parsed = typeof args === "string" ? (() => { try { return JSON.parse(args); } catch { return undefined; } })() : record(args);
  const capabilityId = typeof parsed?.capabilityId === "string" ? parsed.capabilityId : "";
  const kind = capabilityOperation(capabilityId);
  const operation = kind && kind !== "edit_media" ? kind : undefined;
  const input = designExecutionInput(parsed ?? {});
  return {
    capabilityId,
    title: primaryResourceName(input.output) ?? primaryResourceName(parsed?.output),
    operation,
    kind: isMediaEditCapabilityId(capabilityId) ? capabilityId : operation,
    input,
    prompt: typeof input?.prompt === "string" ? input.prompt : undefined,
    params: record(input.params) ?? (operation ? {} : input),
    references: designReferences(input.references),
    lastFrameOnly: Array.isArray(input.references) && input.references[0] === null,
  };
}
export function designOutputs(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const output = record(item);
    if (!output || isSidecarOutputKey(output.key) || typeof output.resourceId !== "string" || !output.resourceId || typeof output.versionId !== "string" || !output.versionId || !["image", "video", "audio", "text"].includes(String(output.kind))) return [];
    return [{ key: typeof output.key === "string" ? output.key : output.versionId, resourceId: output.resourceId, versionId: output.versionId, name: typeof output.name === "string" ? output.name : "", kind: output.kind, availability: typeof output.availability === "string" ? output.availability : undefined }];
  });
}
export function designTags(params) {
  return ["aspect_ratio", "ratio", "resolution", "duration", "quality", "voice_id", "speed", "emotion", "language"].flatMap((key) => {
    const value = params?.[key];
    return typeof value === "string" || typeof value === "number" ? [{ key, value: String(value) }] : [];
  });
}
const QUALITY_TIER_RESOLUTION = { std: "720P", pro: "1080P", max: "4K" };
function qualityTierResolution(value) {
  return typeof value === "string" ? QUALITY_TIER_RESOLUTION[value.trim().toLowerCase()] : undefined;
}
export function designTaskDetails(params) {
  const text = (...keys) => {
    for (const key of keys) {
      const value = params?.[key];
      if ((typeof value === "string" && value.trim()) || typeof value === "number") return String(value).trim();
    }
    return undefined;
  };
  return { resolution: text("resolution") ?? qualityTierResolution(params?.quality_tier), aspectRatio: text("aspect_ratio", "ratio"), duration: text("duration") };
}
export function isDesignDeliveryComplete(value, task = false) {
  const delivery = record(value);
  if (!delivery || delivery.status !== "completed" || delivery.problem || (task && delivery.terminal === false)) return false;
  const outputs = delivery.outputs;
  if (!Array.isArray(outputs) || outputs.length === 0 || outputs.some((item) => {
    const output = record(item);
    return !output || output.disposition === "candidate" || (output.availability !== undefined && output.availability !== "available");
  })) return false;
  return !Array.isArray(delivery.placements) || delivery.placements.every((item) => record(item)?.status === "applied");
}

