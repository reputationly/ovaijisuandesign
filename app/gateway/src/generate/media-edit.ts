import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { formatSubtitleContent, type SubtitleFormatOptions } from "@ov/mcp-tools/subtitle-format";
import { Inject, Injectable } from "@nestjs/common";

import { getCaller } from "../common/request-context.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { FfmpegService, type ScaleMode } from "../edit/ffmpeg.service.js";
import { checkFfmpegCommand, resolveOutputExt, type OutputType } from "../edit/ffmpeg-args.js";
import { ProjectDeliveryService } from "../project-kernel/delivery.js";
import { ProjectQueryError } from "../project-kernel/errors.js";
import { ProjectResourceService } from "../project-kernel/resource.service.js";

const CAPABILITIES = ["edit_media:ffmpeg", "edit_media:merge_videos", "edit_media:transcribe", "edit_media:subtitle_format"];
const PLACEHOLDER = /@reference\[(\d+)\]/g;
const EXACT_PLACEHOLDER = /^@reference\[\d+\]$/;

/**
 * 同步媒体编辑直接改出文件，不进生成队列。
 * 参考图钉死在资源版本上，ffmpeg 参数里只能用 @reference[N]，避免读到工作区外的路径。
 */
@Injectable()
export class MediaEditService {
  constructor(
    @Inject(WorkspacePathService) private readonly paths: WorkspacePathService,
    @Inject(FfmpegService) private readonly ffmpeg: FfmpegService,
    @Inject(ProjectResourceService) private readonly resources: ProjectResourceService,
    @Inject(ProjectDeliveryService) private readonly delivery: ProjectDeliveryService,
  ) {}

  async edit(value: unknown) {
    const body = object(value, ["capabilityId", "input", "output"], "media edit");
    const capabilityId = identifier(body.capabilityId, "capabilityId");
    if (!CAPABILITIES.includes(capabilityId)) throw new ProjectQueryError("UNSUPPORTED_OPERATION", "Unsupported media edit capability", 422);
    const input = object(body.input, ["params", "references"], "input");
    const versionIds = referenceIds(input.references);
    const caller = getCaller();
    const output = parseEditOutput(body.output, caller);
    if (output.resources.length !== 1 || output.resources[0]?.key !== "primary") {
      throw new ProjectQueryError("INVALID_ARGUMENT", "Media edits produce a single output; output.resources must declare exactly the primary target");
    }
    const target = output.resources[0];
    if (target?.mode === "new_version" && (!target.baseVersionId || !target.disposition)) {
      throw new ProjectQueryError("INVALID_ARGUMENT", "Media version edits require baseVersionId and an explicit adopted or candidate disposition");
    }
    if (target?.mode === "new_version" && target.disposition === "candidate" && output.composition) {
      throw new ProjectQueryError("INVALID_ARGUMENT", "Composition placement requires an adopted media result");
    }
    if (output.composition && (output.composition.placements.length !== 1 || output.composition.placements[0]?.key !== "primary")) {
      throw new ProjectQueryError("INVALID_ARGUMENT", "Media edit placements must target the primary output exactly once");
    }
    if (capabilityId === "edit_media:transcribe") {
      throw new ProjectQueryError("DEPENDENCY_UNAVAILABLE", "Speech transcription is not available in this gateway", 503);
    }
    if (capabilityId === "edit_media:subtitle_format") return this.formatSubtitles(versionIds, input.params, output);
    let preparedArgs: string[] | undefined;
    let extension = "mp4";
    if (capabilityId === "edit_media:merge_videos") {
      if (versionIds.length < 2) throw new ProjectQueryError("INVALID_ARGUMENT", "merge_videos requires at least 2 videos after member expansion");
      scaleOptions(input.params);
    } else {
      preparedArgs = ffmpegArgs(input.params, versionIds.length);
      const outputType = (object(input.params, ["args", "outputType"], "params").outputType ?? "video") as OutputType;
      const resolved = resolveOutputExt(outputType, preparedArgs);
      if ("error" in resolved) throw new ProjectQueryError("INVALID_ARGUMENT", resolved.error);
      extension = resolved.ext.replace(/^\./, "");
    }
    const sources = versionIds.map((versionId) => this.resources.relativePathOfVersion(versionId));
    const requestId = createHash("sha256").update(JSON.stringify([capabilityId, versionIds, input.params, output])).digest("hex");
    // **必须是 POSIX 分隔符**：这个路径要交给 `delivery.deliver()` 当 workspace 相对路径，
    // 而它的校验明确拒绝带 `\` 的路径（`source.path must be a workspace file path`）。
    // 用 `path.join` 在 Windows 上会得到 `.hilo\tmp\x.ass` —— 每一个 edit_media 产物
    // 都会 400，mac/Linux 看不出来。
    const scratch = path.posix.join(".hilo", "tmp", `${requestId.slice(0, 24)}.${extension}`);
    const absolute = path.join(this.paths.root, scratch);
    await mkdir(path.dirname(absolute), { recursive: true });
    const temporary = path.join(path.dirname(absolute), `.partial-${path.basename(absolute)}`);
    try {
      if (capabilityId === "edit_media:merge_videos") {
        const scale = scaleOptions(input.params);
        await this.ffmpeg.concatenate(sources.map((item) => path.join(this.paths.root, item)), temporary, scale.mode, scale.width, scale.height);
      } else {
        const substituted = (preparedArgs ?? []).map((arg) => arg.replace(PLACEHOLDER, (_match, index: string) => {
          const resolved = sources[Number(index)];
          if (!resolved) throw new ProjectQueryError("INVALID_ARGUMENT", `Frozen reference @reference[${index}] is not available`);
          return path.join(this.paths.root, resolved);
        }));
        await this.ffmpeg.exec([...substituted, "-y", temporary], { cwd: this.paths.root });
      }
      const info = await stat(temporary).catch(() => undefined);
      if (!info?.isFile() || info.size < 1) throw new ProjectQueryError("MEDIA_EDIT_FAILED", "FFmpeg produced no output file");
      await rename(temporary, absolute);
    } catch (error) {
      await rm(temporary, { force: true });
      if (error instanceof ProjectQueryError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new ProjectQueryError("MEDIA_EDIT_FAILED", message.slice(0, 4000));
    }
    return this.publish(requestId, scratch, output);
  }

  private async formatSubtitles(versionIds: string[], params: unknown, output: ReturnType<typeof parseEditOutput>) {
    const style = subtitleOptions(params, versionIds.length);
    const relative = this.resources.relativePathOfVersion(versionIds[0] ?? "");
    const source = path.join(this.paths.root, relative);
    const info = await stat(source).catch(() => undefined);
    if (!info?.isFile() || info.size < 1) throw new ProjectQueryError("MEDIA_EDIT_FAILED", "Source subtitle is missing or empty");
    if (info.size > 2 * 1024 * 1024) throw new ProjectQueryError("MEDIA_EDIT_FAILED", "Source subtitle exceeds the 2 MB text limit");
    const text = await readFile(source, "utf8");
    let formatted;
    try {
      formatted = formatSubtitleContent(text, { sourceSrtPath: source, ...style });
    } catch (error) {
      throw new ProjectQueryError("MEDIA_EDIT_FAILED", error instanceof Error ? error.message : String(error));
    }
    if (formatted.cueCount < 1) throw new ProjectQueryError("MEDIA_EDIT_FAILED", "Source content contains no SRT cues");
    const requestId = createHash("sha256").update(JSON.stringify(["edit_media:subtitle_format", versionIds, style, output])).digest("hex");
    // 同上：交给 delivery 的必须是 POSIX 相对路径。
    const scratch = path.posix.join(".hilo", "tmp", `${requestId.slice(0, 24)}.${formatted.format}`);
    await mkdir(path.dirname(path.join(this.paths.root, scratch)), { recursive: true });
    await writeFile(path.join(this.paths.root, scratch), formatted.content, "utf8");
    return {
      ...(await this.publish(requestId, scratch, output)),
      detail: { format: formatted.format, cueCount: formatted.cueCount, playRes: formatted.playRes, styleResolved: formatted.style, warnings: formatted.warnings },
    };
  }

  private publish(requestId: string, scratch: string, output: ReturnType<typeof parseEditOutput>) {
    const delivered = this.delivery.deliver({
      requestId,
      sources: [{ key: "primary", path: scratch }],
      output,
    }) as { resources?: { resourceId?: string; versionId?: string; name?: string; kind?: string; disposition?: string }[]; placements?: { compositionId?: string; memberId?: string; role?: string }[] };
    const resource = delivered.resources?.[0];
    const placement = delivered.placements?.[0];
    return {
      output: {
        key: "primary",
        resourceId: resource?.resourceId,
        versionId: resource?.versionId,
        name: resource?.name,
        kind: resource?.kind,
        disposition: resource?.disposition,
      },
      ...(placement ? { placement: { compositionId: placement.compositionId, memberId: placement.memberId, role: placement.role } } : {}),
    };
  }
}

function subtitleOptions(params: unknown, count: number): Omit<SubtitleFormatOptions, "sourceSrtPath"> {
  if (count !== 1) throw new ProjectQueryError("INVALID_ARGUMENT", "subtitle_format takes exactly one reference");
  const input = object(params, ["outputSize", "format", "stylePreset", "position", "safeArea", "fontName", "fontSize", "fontScale", "marginV", "marginL", "marginR", "cjkCharsPerLine", "englishWordsPerLine", "maxLines", "unsafeOverride"], "params");
  if (typeof input.outputSize !== "string" || !/^\d{2,5}x\d{2,5}$/.test(input.outputSize)) {
    throw new ProjectQueryError("INVALID_ARGUMENT", 'outputSize must be "WxH" with 2–5 digit dimensions, e.g. 1080x1920');
  }
  const format = oneOf(input.format, ["ass", "srt", "vtt"] as const, "format");
  const stylePreset = oneOf(input.stylePreset, ["social_safe", "minimal", "large", "top_caption", "custom"] as const, "stylePreset");
  const position = oneOf(input.position, ["bottom", "top", "middle"] as const, "position");
  const safeArea = oneOf(input.safeArea, ["auto", "social", "none"] as const, "safeArea");
  if (input.fontName !== undefined && (typeof input.fontName !== "string" || !input.fontName.trim() || input.fontName.length > 200)) {
    throw new ProjectQueryError("INVALID_ARGUMENT", "fontName must be a non-empty string of at most 200 characters");
  }
  if (input.fontScale !== undefined && (typeof input.fontScale !== "number" || !Number.isFinite(input.fontScale) || input.fontScale <= 0 || input.fontScale > 100)) {
    throw new ProjectQueryError("INVALID_ARGUMENT", "fontScale must be a positive number of at most 100");
  }
  if (input.unsafeOverride !== undefined && typeof input.unsafeOverride !== "boolean") throw new ProjectQueryError("INVALID_ARGUMENT", "unsafeOverride must be a boolean");
  const maxLines = input.maxLines === undefined ? undefined : input.maxLines === 1 || input.maxLines === 2 ? input.maxLines : undefined;
  if (input.maxLines !== undefined && maxLines === undefined) throw new ProjectQueryError("INVALID_ARGUMENT", "maxLines must be 1 or 2");
  return {
    outputSize: input.outputSize,
    ...(format ? { format } : {}),
    ...(stylePreset ? { stylePreset } : {}),
    ...(position ? { position } : {}),
    ...(safeArea ? { safeArea } : {}),
    ...(typeof input.fontName === "string" ? { fontName: input.fontName } : {}),
    ...(boundedInteger(input.fontSize, 1, 4096, "fontSize")),
    ...(typeof input.fontScale === "number" ? { fontScale: input.fontScale } : {}),
    ...(boundedInteger(input.marginV, 0, 100_000, "marginV")),
    ...(boundedInteger(input.marginL, 0, 100_000, "marginL")),
    ...(boundedInteger(input.marginR, 0, 100_000, "marginR")),
    ...(boundedInteger(input.cjkCharsPerLine, 1, 200, "cjkCharsPerLine")),
    ...(boundedInteger(input.englishWordsPerLine, 1, 100, "englishWordsPerLine")),
    ...(maxLines ? { maxLines } : {}),
    ...(input.unsafeOverride === true ? { unsafeOverride: true } : {}),
  };
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], name: string): T | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new ProjectQueryError("INVALID_ARGUMENT", `Invalid ${name}`);
  return value as T;
}

function boundedInteger(value: unknown, min: number, max: number, name: string): Record<string, number> {
  if (value === undefined) return {};
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) throw new ProjectQueryError("INVALID_ARGUMENT", `Invalid ${name}`);
  return { [name]: value as number };
}

function ffmpegArgs(params: unknown, referenceCount: number): string[] {
  const record = object(params, ["args", "outputType"], "params");
  const outputType = record.outputType ?? "video";
  if (outputType !== "video" && outputType !== "audio" && outputType !== "image") throw new ProjectQueryError("INVALID_ARGUMENT", "params.outputType must be video, audio or image");
  if (!Array.isArray(record.args) || record.args.length < 1 || record.args.length > 256) throw new ProjectQueryError("INVALID_ARGUMENT", "params.args must contain 1–256 entries");
  if (record.args.some((arg) => typeof arg !== "string" || arg.length > 4096)) throw new ProjectQueryError("INVALID_ARGUMENT", "Each arg must be a string of at most 4096 characters");
  const args = record.args.filter((arg): arg is string => typeof arg === "string" && arg !== "-y");
  const check = checkFfmpegCommand(args, outputType);
  if (!check.ok) throw new ProjectQueryError("INVALID_ARGUMENT", check.error);
  const used = new Set<number>();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";
    if (arg === "-f" && args[index + 1] === "null") throw new ProjectQueryError("INVALID_ARGUMENT", "Media edits require a durable output artifact; dry-run (-f null) produces no artifact");
    if (arg === "-i" && !EXACT_PLACEHOLDER.test(args[index + 1] ?? "")) throw new ProjectQueryError("INVALID_ARGUMENT", "Every -i value must be exactly one @reference[N] placeholder");
    for (const match of arg.matchAll(PLACEHOLDER)) {
      const reference = Number(match[1]);
      if (reference >= referenceCount) throw new ProjectQueryError("INVALID_ARGUMENT", `@reference[${reference}] is outside the references list`);
      used.add(reference);
    }
  }
  for (let index = 0; index < referenceCount; index += 1) if (!used.has(index)) throw new ProjectQueryError("INVALID_ARGUMENT", `references[${index}] is never addressed by params.args`);
  return args;
}

function scaleOptions(params: unknown): { mode: ScaleMode; width?: number; height?: number } {
  const record = object(params ?? {}, ["scaleMode", "targetWidth", "targetHeight"], "params");
  const mode = (record.scaleMode ?? "first") as ScaleMode;
  if (!["first", "max", "min", "custom"].includes(mode)) throw new ProjectQueryError("INVALID_ARGUMENT", "params.scaleMode must be first, max, min or custom");
  if (mode !== "custom") {
    if (record.targetWidth !== undefined || record.targetHeight !== undefined) throw new ProjectQueryError("INVALID_ARGUMENT", "Target dimensions are only allowed with scaleMode custom");
    return { mode };
  }
  for (const side of [record.targetWidth, record.targetHeight]) {
    if (!Number.isSafeInteger(side) || (side as number) < 1 || (side as number) > 8192) throw new ProjectQueryError("INVALID_ARGUMENT", "Custom scaling requires targetWidth and targetHeight between 1 and 8192");
  }
  return { mode, width: record.targetWidth as number, height: record.targetHeight as number };
}

function parseEditOutput(value: unknown, caller: "agent" | "canvas") {
  const output = object(value, ["resources", "composition", "nameSource"], "output");
  if (!Array.isArray(output.resources) || output.resources.length !== 1) {
    throw new ProjectQueryError("INVALID_ARGUMENT", "Media edits produce a single output; output.resources must declare exactly the primary target");
  }
  const target = object(output.resources[0], ["key", "mode", "name", "description", "resourceId", "baseVersionId", "disposition"], "output.resource");
  const key = typeof target.key === "string" ? target.key : "primary";
  if (key !== "primary") throw new ProjectQueryError("INVALID_ARGUMENT", "Media edits produce a single output; output.resources must declare exactly the primary target");
  if (target.mode !== "create" && target.mode !== "new_version") throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid output.resource");
  if (target.mode === "create" && (typeof target.name !== "string" || !target.name.trim())) throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid name");
  let composition: { name?: string; type?: { label?: string }; placements: { key: string; role?: string; memberId?: string }[] } | undefined;
  if (output.composition !== undefined) {
    const item = object(output.composition, ["compositionId", "type", "name", "attributes", "position", "placement", "placements"], "output.composition");
    if (!Array.isArray(item.placements) || item.placements.length !== 1) throw new ProjectQueryError("INVALID_ARGUMENT", "Media edit placements must target the primary output exactly once");
    const parsed = object(item.placements[0], ["key", "role", "memberId"], "output.composition.placements");
    const placementKey = typeof parsed.key === "string" ? parsed.key : "primary";
    if (placementKey !== "primary") throw new ProjectQueryError("INVALID_ARGUMENT", "Media edit placements must target the primary output exactly once");
    if ((parsed.role === undefined) === (parsed.memberId === undefined)) throw new ProjectQueryError("INVALID_ARGUMENT", "role adds a new member and memberId fills an existing one; give exactly one.");
    const type = item.type === undefined ? undefined : object(item.type, ["id", "label", "description"], "composition.type");
    composition = {
      ...(typeof item.name === "string" ? { name: item.name } : {}),
      ...(typeof item.compositionId === "string" ? { compositionId: item.compositionId } : {}),
      ...(type && typeof type.label === "string" ? { type: { label: type.label } } : {}),
      placements: [{ key: placementKey, ...(typeof parsed.role === "string" ? { role: parsed.role } : {}), ...(typeof parsed.memberId === "string" ? { memberId: parsed.memberId } : {}) }],
    };
  }
  if (caller === "agent" && target.mode !== "new_version" && !composition) {
    throw new ProjectQueryError("INVALID_ARGUMENT", "output.composition: primary would be created without a place in a Composition, and the canvas shows only Composition members. Nothing was submitted. Add output.composition with compositionId (existing) or type and name (new), plus placements: [{ key, role }] for each of them.");
  }
  return {
    resources: [{ key, mode: target.mode, name: target.name, description: target.description, resourceId: target.resourceId, baseVersionId: target.baseVersionId, disposition: target.disposition }],
    ...(composition ? { composition } : {}),
  };
}

function referenceIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 100) throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid references");
  return value.map((item) => {
    const reference = object(item, ["versionId", "compositionId", "resourceId", "memberId"], "reference");
    if (reference.versionId !== undefined && Object.keys(reference).length !== 1) throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid reference");
    return identifier(reference.versionId, "versionId");
  });
}

function object(value: unknown, fields: string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProjectQueryError("INVALID_ARGUMENT", `Invalid ${label}`);
  const record = value as Record<string, unknown>;
  for (const field of Object.keys(record)) if (!fields.includes(field)) throw new ProjectQueryError("UNSUPPORTED_FIELD", `${label}.${field} is not supported`, 422);
  return record;
}

function identifier(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 512) throw new ProjectQueryError("INVALID_ARGUMENT", `Invalid ${field}`);
  return value;
}
