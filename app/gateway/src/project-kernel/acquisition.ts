import { createHash } from "node:crypto";
import { lookup as dnsLookup } from "node:dns/promises";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { isIP } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import { Body, Controller, HttpCode, HttpException, Inject, Injectable, Post } from "@nestjs/common";
import { fileTypeFromBuffer } from "file-type";

import { spawnTool } from "../common/spawn-tool.js";
import { WorkspaceProjectArchitectureService } from "../canvas-v3/workspace-project-architecture.service.js";
import { projectId, ProjectCompositionService } from "./composition.service.js";
import { ProjectKernelError, ProjectQueryError } from "./errors.js";
import { ProjectResourceService } from "./resource.service.js";

const DIRECT_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"];
const RESOURCE_KIND: Record<string, number> = { subtitle: 1, image: 2, video: 3, audio: 4 };
const DOWNLOAD_LIMIT = 32 * 1024 * 1024;
const WEB_MEDIA_TYPES = ["inspect", "download_video", "download_audio", "download_subtitles", "download_thumbnail"];

/**
 * 图库检索走厂商搜索服务。这里和现有搜图一样：请求照常校验，搜不到时回空结果，不编造图片。
 * 直接图片地址会先拒绝内网，再把下载到的图放进组合。
 */
@Injectable()
export class ProjectAcquisitionService {
  lookup: (hostname: string) => Promise<{ address: string }> = (hostname) => dnsLookup(hostname);
  fetcher: typeof fetch = globalThis.fetch;

  constructor(
    @Inject(WorkspaceProjectArchitectureService) private readonly architecture: WorkspaceProjectArchitectureService,
    @Inject(ProjectResourceService) private readonly resources: ProjectResourceService,
    @Inject(ProjectCompositionService) private readonly compositions: ProjectCompositionService,
  ) {}

  searchImages(value: unknown) {
    this.scope();
    const input = parseSearch(value);
    return { queries: input.queries.map((item) => ({ query: item.query, images: [], error: "no images found" })) };
  }

  async webMedia(value: unknown) {
    const workspace = this.scope();
    const input = parseWebMedia(value);
    const decision = await vetUrl(input.url, this.lookup);
    if (!decision.ok) throw new ProjectQueryError("WEB_MEDIA_FAILED", `URL rejected by network safety policy: ${decision.reason}`, 422);
    if (input.type === "inspect") return { metadata: await inspectMedia(input.url) };
    if (input.type !== "download_thumbnail" || !isDirectImageUrl(input.url)) {
      return this.downloadWithTool(workspace, input);
    }
    const response = await this.fetcher(input.url, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
    if (response.status >= 300 && response.status < 400) throw new ProjectQueryError("WEB_MEDIA_FAILED", "Redirects are not followed", 422);
    if (!response.ok) throw new ProjectQueryError("WEB_MEDIA_FAILED", `Download failed (${response.status}): ${input.url}`, 422);
    const declared = Number(response.headers.get("content-length"));
    const bytes = Buffer.from(await response.arrayBuffer());
    if (Number.isFinite(declared) && declared !== bytes.length) throw new ProjectQueryError("WEB_MEDIA_FAILED", `Truncated download: got ${bytes.length}B, Content-Length declared ${declared}B: ${input.url}`, 422);
    if (bytes.length < 1 || bytes.length > DOWNLOAD_LIMIT) throw new ProjectQueryError("WEB_MEDIA_FAILED", "Downloaded image is empty or exceeds 32 MB", 422);
    const detected = await fileTypeFromBuffer(bytes);
    if (!detected?.mime.startsWith("image/")) throw new ProjectQueryError("WEB_MEDIA_FAILED", `The direct URL did not resolve to an image (detected ${detected?.mime ?? "unknown"})`, 422);
    const digest = createHash("sha256").update(input.url).update("\0").update(bytes).digest("hex");
    const resourceId = projectId("resource", ["web-media", digest]);
    const versionId = projectId("version", ["web-media", digest]);
    const relativePath = `store/${versionId}.${detected.ext}`;
    const filename = path.posix.basename(new URL(input.url).pathname).slice(0, 120) || "image";
    publish(workspace, relativePath, bytes);
    const now = new Date().toISOString();
    const created = this.resources.execute({
      commandId: `acquisition:${versionId}:create`,
      actor: "human",
      command: { type: "resource.create", resourceId, payload: { name: filename, description: `Downloaded from ${input.url}`, kind: 2 } },
    }) as { committed?: boolean; result?: { name?: string; metadataRevision?: number } };
    if (!created.committed) throw new ProjectQueryError("WEB_MEDIA_FAILED", "Image resource was not created", 422);
    const updated = this.resources.execute({
      commandId: `acquisition:${versionId}:version`,
      actor: "human",
      command: {
        type: "resource.update",
        resourceId,
        payload: { kind: "new_version", versionId, relativePath, source: "import", dependencies: [], baseVersionId: null, disposition: "adopted" },
      },
    }) as { committed?: boolean };
    if (!updated.committed) throw new ProjectQueryError("WEB_MEDIA_FAILED", "Image version was not stored", 422);
    this.resources.recordImportedVersion({ versionId, provenance: { method: "url_import", sourceUrl: input.url }, createdAt: now, updatedAt: now });
    if (!input.composition) throw new ProjectQueryError("INVALID_ARGUMENT", "composition.name is required for download operations");
    const composition = this.compositions.ensureAgent(`acquisition:${versionId}:composition`, {
      label: "Web Media",
      description: "Media downloaded from public web pages.",
      name: input.composition.name,
      attributes: { source: "url_import", url: input.url.slice(0, 2000), ...(input.composition?.description ? { description: input.composition.description.slice(0, 2000) } : {}) },
    }) as { compositionId: string; revision: number };
    const memberId = projectId("member", [versionId, "image", resourceId]);
    const current = this.compositions.get(composition.compositionId);
    if (!current.members.some((member) => (member as { memberId?: string }).memberId === memberId)) {
      this.compositions.execute({
        commandId: `acquisition:${versionId}:member`,
        actor: "human",
        expectedRevision: current.revision,
        command: { type: "composition.apply", compositionId: composition.compositionId, operations: [{ type: "member.add", member: { memberId, role: "image", resource: resourceId } }] },
      });
    }
    return {
      compositionId: composition.compositionId,
      members: [{ memberId, role: "image", resource: { resourceId, versionId, name: created.result?.name ?? filename, kind: "image" } }],
    };
  }

  private async downloadWithTool(workspace: string, input: { type: string; url: string; composition?: { name: string; description?: string }; quality?: string; format_id?: string; container?: string; subtitle_languages?: string[]; subtitle_format?: string; include_auto_subtitles?: boolean }) {
    if (!input.composition) throw new ProjectQueryError("INVALID_ARGUMENT", "composition.name is required for download operations");
    const staging = mkdtempSync(path.join(tmpdir(), "ov-ytdlp-"));
    try {
      const binary = process.env.YTDLP_PATH?.trim() || "yt-dlp";
      await runProcess(binary, ytDlpArgs(input, staging));
      const files = readdirSync(staging).flatMap((name) => {
        const kind = classifyDownload(name);
        return kind ? [{ name, kind, bytes: readFileSync(path.join(staging, name)) }] : [];
      }).filter((file) => file.bytes.length > 0);
      if (!files.length) throw new ProjectQueryError("WEB_MEDIA_FAILED", "yt-dlp completed without a downloadable asset", 422);
      const members = [];
      for (const file of files) {
        const saved = this.storeDownload(workspace, input.url, file.name, file.kind, file.bytes);
        const memberId = this.placeDownload(input, saved);
        members.push({ memberId, role: file.kind, resource: saved });
      }
      return { compositionId: this.compositionId, members };
    } catch (error) {
      if (error instanceof ProjectQueryError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("ENOENT")) throw new ProjectQueryError("WEB_MEDIA_FAILED", "Web media downloader is not available", 422);
      throw new ProjectQueryError("WEB_MEDIA_FAILED", message, 422);
    } finally {
      rmSync(staging, { recursive: true, force: true });
    }
  }

  private compositionId = "";

  private storeDownload(workspace: string, url: string, filename: string, kind: string, bytes: Buffer) {
    const digest = createHash("sha256").update(url).update("\0").update(filename).update("\0").update(bytes).digest("hex");
    const resourceId = projectId("resource", ["web-media", digest]);
    const versionId = projectId("version", ["web-media", digest]);
    const extension = path.posix.extname(filename).slice(1) || "bin";
    const relativePath = `store/${versionId}.${extension}`;
    const name = path.posix.basename(filename, path.posix.extname(filename)).slice(0, 120) || kind;
    publish(workspace, relativePath, bytes);
    const created = this.resources.execute({
      commandId: `acquisition:${versionId}:create`,
      actor: "human",
      command: { type: "resource.create", resourceId, payload: { name, description: `Downloaded from ${url}`, kind: RESOURCE_KIND[kind] ?? 5 } },
    }) as { committed?: boolean; result?: { name?: string } };
    if (!created.committed) throw new ProjectQueryError("WEB_MEDIA_FAILED", "Downloaded resource was not created", 422);
    const updated = this.resources.execute({
      commandId: `acquisition:${versionId}:version`,
      actor: "human",
      command: { type: "resource.update", resourceId, payload: { kind: "new_version", versionId, relativePath, source: "import", dependencies: [], baseVersionId: null, disposition: "adopted" } },
    }) as { committed?: boolean };
    if (!updated.committed) throw new ProjectQueryError("WEB_MEDIA_FAILED", "Downloaded version was not stored", 422);
    const now = new Date().toISOString();
    this.resources.recordImportedVersion({ versionId, provenance: { method: "web_media", sourceUrl: url }, createdAt: now, updatedAt: now });
    return { resourceId, versionId, name: created.result?.name ?? name, kind };
  }

  private placeDownload(input: { url: string; composition?: { name: string; description?: string } }, saved: { resourceId: string; versionId: string; kind: string }) {
    if (!input.composition) throw new ProjectQueryError("INVALID_ARGUMENT", "composition.name is required for download operations");
    const composition = this.compositions.ensureAgent(`web-media:${createHash("sha256").update(input.url).update("\0").update(input.composition.name).digest("hex").slice(0, 24)}:composition`, {
      label: "Web Media",
      description: "Media downloaded from public web pages.",
      name: input.composition.name,
      attributes: { source: "web_media", url: input.url.slice(0, 2000), ...(input.composition.description ? { description: input.composition.description.slice(0, 2000) } : {}) },
    }) as { compositionId: string };
    this.compositionId = composition.compositionId;
    const memberId = projectId("member", [saved.versionId, saved.kind, saved.resourceId]);
    const current = this.compositions.get(composition.compositionId);
    if (!current.members.some((member) => (member as { memberId?: string }).memberId === memberId)) {
      this.compositions.execute({
        commandId: `acquisition:${saved.versionId}:member`,
        actor: "human",
        expectedRevision: current.revision,
        command: { type: "composition.apply", compositionId: composition.compositionId, operations: [{ type: "member.add", member: { memberId, role: saved.kind, resource: saved.resourceId } }] },
      });
    }
    return memberId;
  }

  private scope(): string {
    try {
      this.architecture.assertV3();
    } catch {
      throw new ProjectKernelError("PROJECT_V3_DISABLED");
    }
    if (process.env.HILO_GATEWAY_ROLE !== "workspace" || !process.env.WORKSPACE_DIR) throw new ProjectKernelError("PROJECT_V3_DISABLED");
    return realpathSync(process.env.WORKSPACE_DIR);
  }
}

@Controller("api/v3")
export class ProjectAcquisitionController {
  constructor(@Inject(ProjectAcquisitionService) private readonly acquisitions: ProjectAcquisitionService) {}

  @Post("search/images")
  @HttpCode(200)
  searchImages(@Body() body: unknown) {
    return this.respond(() => this.acquisitions.searchImages(body));
  }

  @Post("web-media")
  @HttpCode(200)
  webMedia(@Body() body: unknown) {
    return this.respond(() => this.acquisitions.webMedia(body));
  }

  private async respond(operation: () => unknown) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof ProjectKernelError && error.code === "PROJECT_V3_DISABLED") {
        throw new HttpException({ error: { code: error.code, message: "Project v3 is not enabled", retryable: false } }, 403);
      }
      if (error instanceof ProjectQueryError) {
        throw new HttpException({ error: { code: error.code, message: error.message, retryable: false } }, error.status);
      }
      throw error;
    }
  }
}

type SearchQuery = { query: string; num?: number };
type SearchInput = { queries: SearchQuery[]; max_images_per_query?: number; max_total_images?: number; min_dimension?: number; composition: { name: string; description?: string } };

function parseSearch(value: unknown): SearchInput {
  const raw = record(value, "request");
  const allowed = ["queries", "max_images_per_query", "max_total_images", "min_dimension", "composition"];
  for (const key of Object.keys(raw)) if (!allowed.includes(key)) invalid(`request.${key}: Unexpected field`);
  if (!Array.isArray(raw.queries) || raw.queries.length < 1 || raw.queries.length > 4) invalid("queries: Expected 1 to 4 queries");
  const queries = raw.queries.map((item, index) => {
    const query = record(item, `queries.${index}`);
    for (const key of Object.keys(query)) if (!["query", "num"].includes(key)) invalid(`queries.${index}.${key}: Unexpected field`);
    if (typeof query.query !== "string" || !query.query.trim() || query.query.trim().length > 500) invalid(`queries.${index}.query: Expected 1 to 500 characters`);
    const parsed: SearchQuery = { query: query.query.trim() };
    if (query.num !== undefined) {
      if (typeof query.num !== "number" || !Number.isInteger(query.num) || query.num < 1 || query.num > 50) invalid(`queries.${index}.num: Expected an integer from 1 to 50`);
      parsed.num = query.num;
    }
    return parsed;
  });
  const input: SearchInput = { queries, composition: composition(raw.composition) };
  if (raw.max_images_per_query !== undefined) input.max_images_per_query = integer(raw.max_images_per_query, 1, 20, "max_images_per_query");
  if (raw.max_total_images !== undefined) input.max_total_images = integer(raw.max_total_images, 1, 80, "max_total_images");
  if (raw.min_dimension !== undefined) input.min_dimension = integer(raw.min_dimension, 1, 4096, "min_dimension");
  return input;
}

function composition(value: unknown): { name: string; description?: string } {
  const raw = record(value, "composition");
  for (const key of Object.keys(raw)) if (!["name", "description"].includes(key)) invalid(`composition.${key}: Unexpected field`);
  if (typeof raw.name !== "string" || !raw.name.trim() || raw.name.trim().length > 512) invalid("composition.name: Expected 1 to 512 characters");
  const result: { name: string; description?: string } = { name: raw.name.trim() };
  if (raw.description !== undefined) {
    if (typeof raw.description !== "string" || raw.description.length > 2000) invalid("composition.description: Expected at most 2000 characters");
    result.description = raw.description;
  }
  return result;
}

function integer(value: unknown, min: number, max: number, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) invalid(`${field}: Expected an integer from ${min} to ${max}`);
  return value;
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(`${field}: Expected an object`);
  return value as Record<string, unknown>;
}

function invalid(message: string): never {
  throw new ProjectQueryError("INVALID_ARGUMENT", message);
}

function parseWebMedia(value: unknown): { type: string; url: string; composition?: { name: string; description?: string }; quality?: string; format_id?: string; container?: string; subtitle_languages?: string[]; subtitle_format?: string; include_auto_subtitles?: boolean } {
  const raw = record(value, "request");
  const allowed = ["type", "url", "quality", "format_id", "container", "subtitle_languages", "subtitle_format", "include_auto_subtitles", "playlist_mode", "max_items", "filename", "composition"];
  for (const key of Object.keys(raw)) if (!allowed.includes(key)) invalid(`request.${key}: Unexpected field`);
  if (typeof raw.type !== "string" || !WEB_MEDIA_TYPES.includes(raw.type)) invalid("type: Unsupported web media operation");
  if (typeof raw.url !== "string" || raw.url.length > 4096) invalid("url: Expected a URL of at most 4096 characters");
  let parsed: URL;
  try {
    parsed = new URL(raw.url);
  } catch {
    invalid("url: Expected a URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") invalid("url: Expected an http or https URL");
  if (raw.type !== "inspect" && raw.composition === undefined) throw new ProjectQueryError("INVALID_ARGUMENT", "composition.name is required for download operations");
  return {
    type: raw.type,
    url: raw.url,
    ...(raw.composition === undefined ? {} : { composition: composition(raw.composition) }),
    ...(typeof raw.quality === "string" ? { quality: raw.quality } : {}),
    ...(typeof raw.format_id === "string" ? { format_id: raw.format_id } : {}),
    ...(typeof raw.container === "string" ? { container: raw.container } : {}),
    ...(typeof raw.subtitle_format === "string" ? { subtitle_format: raw.subtitle_format } : {}),
    ...(raw.include_auto_subtitles === true ? { include_auto_subtitles: true } : {}),
    ...(Array.isArray(raw.subtitle_languages) ? { subtitle_languages: raw.subtitle_languages.filter((item): item is string => typeof item === "string") } : {}),
  };
}

function isDirectImageUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    return DIRECT_IMAGE_EXTENSIONS.some((extension) => parsed.pathname.toLowerCase().endsWith(extension));
  } catch {
    return false;
  }
}

export async function vetUrl(url: string, lookup: (hostname: string) => Promise<{ address: string }>): Promise<{ ok: true } | { ok: false; reason: string }> {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return { ok: false, reason: "scheme-not-allowed" };
  const bare = parsed.hostname.startsWith("[") && parsed.hostname.endsWith("]") ? parsed.hostname.slice(1, -1) : parsed.hostname;
  if (isIP(bare) !== 0) return isPrivateAddress(bare) ? { ok: false, reason: "private-address" } : { ok: true };
  try {
    const result = await lookup(bare);
    return isPrivateAddress(result.address) ? { ok: false, reason: "private-address" } : { ok: true };
  } catch {
    return { ok: false, reason: "dns-lookup-failed" };
  }
}

function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) return isPrivateIPv4(ip);
  if (isIP(ip) === 6) return isPrivateIPv6(ip);
  return false;
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const a = parts[0] ?? 0;
  const b = parts[1] ?? 0;
  if (a === 0 || a === 127 || a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  const mapped = lower.match(/^::ffff:(?:0:)?([0-9a-f.:]+)$/);
  if (mapped?.[1]?.includes(".")) return isPrivateIPv4(mapped[1]);
  const first = lower.split(":", 1)[0] ?? "";
  if (first.length > 0) {
    const firstByte = Number.parseInt(first.padStart(4, "0").slice(0, 2), 16);
    if (firstByte === 252 || firstByte === 253) return true;
  }
  return /^fe[89ab][0-9a-f]?:/.test(lower);
}

function ytDlpArgs(input: { type: string; url: string; quality?: string; format_id?: string; container?: string; subtitle_languages?: string[]; subtitle_format?: string; include_auto_subtitles?: boolean }, staging: string): string[] {
  const args = ["--ignore-config", "--no-warnings", "--no-cookies", "--no-cache-dir", "--no-remote-components", "--no-playlist", "--paths", staging, "--output", "%(title).180B [%(id)s].%(ext)s", "--no-write-info-json"];
  if (input.type === "download_video") {
    const container = input.container ?? "mp4";
    args.push("--match-filter", "!is_live", "-f", input.format_id ?? qualitySelector(input.quality), "--merge-output-format", container, "--remux-video", container);
  } else if (input.type === "download_audio") {
    args.push("-f", input.format_id ?? "bestaudio/best", "--extract-audio", "--audio-format", input.container ?? "m4a");
  } else if (input.type === "download_subtitles") {
    const format = input.subtitle_format ?? "srt";
    args.push("--skip-download", "--write-subs", "--sub-format", format, "--convert-subs", format);
    if (input.include_auto_subtitles) args.push("--write-auto-subs");
    if (input.subtitle_languages?.length) args.push("--sub-langs", input.subtitle_languages.join(","));
  } else {
    args.push("--skip-download", "--write-thumbnail", "--convert-thumbnails", "jpg");
  }
  args.push(input.url);
  return args;
}

function qualitySelector(quality?: string): string {
  if (!quality || quality === "best") return "bv*+ba/b";
  const height = Number.parseInt(quality, 10);
  return `bv*[height<=${height}]+ba/b[height<=${height}]/best[height<=${height}]`;
}

function classifyDownload(filename: string): string | undefined {
  const extension = path.posix.extname(filename).toLowerCase();
  if ([".srt", ".vtt", ".ass"].includes(extension)) return "subtitle";
  if (DIRECT_IMAGE_EXTENSIONS.includes(extension)) return "image";
  if ([".mp3", ".m4a", ".wav", ".flac", ".aac", ".ogg"].includes(extension)) return "audio";
  if ([".mp4", ".mkv", ".webm", ".mov", ".avi"].includes(extension)) return "video";
  return undefined;
}

async function inspectMedia(url: string): Promise<Record<string, unknown>> {
  const binary = process.env.YTDLP_PATH?.trim() || "yt-dlp";
  let stdout: string;
  try {
    stdout = await runProcess(binary, ["--ignore-config", "--no-warnings", "--no-cookies", "--no-cache-dir", "--no-remote-components", "--no-playlist", "--dump-single-json", "--skip-download", url]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ENOENT")) throw new ProjectQueryError("WEB_MEDIA_FAILED", "Web media downloader is not available", 422);
    throw new ProjectQueryError("WEB_MEDIA_FAILED", message, 422);
  }
  let info: Record<string, unknown>;
  try {
    info = JSON.parse(stdout.trim()) as Record<string, unknown>;
  } catch {
    throw new ProjectQueryError("WEB_MEDIA_FAILED", "Web media inspection returned invalid metadata", 422);
  }
  return mapMetadata(info);
}

function runProcess(executable: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    // `.cmd`/`.bat` 在 Windows 上要经 cmd.exe（用户装的 yt-dlp 常见是包装脚本）。
    const child = spawnTool(executable, args);
    let stdout = "";
    let stderr = "";
    const limit = 8 * 1024 * 1024;
    child.stdout.on("data", (chunk: Buffer) => {
      if (Buffer.byteLength(stdout) + chunk.byteLength > limit) child.kill();
      else stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString("utf8")).slice(0, 4000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr.trim() || `yt-dlp exited ${code}`));
    });
  });
}

export function mapMetadata(info: Record<string, unknown>): Record<string, unknown> {
  const formats = Array.isArray(info.formats) ? info.formats.flatMap((format) => {
    if (!format || typeof format !== "object") return [];
    const item = format as Record<string, unknown>;
    if (typeof item.format_id !== "string" || !item.format_id) return [];
    return [{
      id: item.format_id,
      ...(typeof item.ext === "string" ? { extension: item.ext } : {}),
      ...(typeof item.resolution === "string" ? { resolution: item.resolution } : {}),
      ...(typeof item.width === "number" ? { width: item.width } : {}),
      ...(typeof item.height === "number" ? { height: item.height } : {}),
      ...(typeof item.fps === "number" ? { fps: item.fps } : {}),
      ...(typeof item.vcodec === "string" ? { video_codec: item.vcodec } : {}),
      ...(typeof item.acodec === "string" ? { audio_codec: item.acodec } : {}),
      ...(typeof item.filesize === "number" ? { filesize: item.filesize } : typeof item.filesize_approx === "number" ? { filesize: item.filesize_approx } : {}),
    }];
  }).slice(0, 100) : [];
  return {
    ...(typeof info.id === "string" ? { id: info.id } : {}),
    ...(typeof info.title === "string" ? { title: info.title } : {}),
    ...(typeof info.webpage_url === "string" ? { webpage_url: info.webpage_url } : {}),
    ...(typeof info.uploader === "string" ? { uploader: info.uploader } : {}),
    ...(typeof info.duration === "number" ? { duration: info.duration } : {}),
    ...(typeof info.upload_date === "string" ? { upload_date: info.upload_date } : {}),
    ...(typeof info.is_live === "boolean" ? { is_live: info.is_live } : {}),
    ...(formats.length ? { formats } : {}),
    ...(info.subtitles && typeof info.subtitles === "object" ? { subtitle_languages: Object.keys(info.subtitles as object) } : {}),
    ...(Array.isArray(info.thumbnails) ? { thumbnails: info.thumbnails.map((item) => item && typeof item === "object" ? (item as { url?: unknown }).url : undefined).filter((url): url is string => typeof url === "string").slice(0, 20) } : {}),
  };
}

function publish(workspace: string, relativePath: string, bytes: Buffer): void {
  const absolute = path.join(workspace, relativePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  try {
    writeFileSync(absolute, bytes, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
}
