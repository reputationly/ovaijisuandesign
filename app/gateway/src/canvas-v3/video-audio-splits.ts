import { createHash } from "node:crypto";
import { constants, copyFileSync, createReadStream, lstatSync, mkdirSync, openSync, realpathSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import { BadRequestException, Body, ConflictException, Controller, HttpCode, Inject, Injectable, NotFoundException, Param, Post, UseFilters } from "@nestjs/common";

import { FfmpegService } from "../edit/ffmpeg.service.js";
import { ProjectKernelError } from "../project-kernel/errors.js";
import { projectId } from "../project-kernel/composition.service.js";
import { ProjectResourceService } from "../project-kernel/resource.service.js";
import { CanvasV3ImagesHttpFilter, CanvasV3ImagesService } from "./images.js";

const IMPORT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNSAFE_IDENTIFIER = /[\u0000-\u001f\u007f/\\]/;

type SplitInput = { resourceId: string; versionId: string };
type SplitOutput = { importId: string; resourceId: string; versionId: string; name: string; mediaKind: "audio" | "video"; mimeType: string; duration: number; width?: number; height?: number };
type Prepared = { digest: string; result: SplitOutput };
type Plan = { digest: string; names: { audio: string; video: string } };
type ResourceRead = {
  ok?: boolean;
  error?: { code?: string };
  detail?: { resource: { lifecycle: string; kind: number; name: string; currentVersionId?: string; metadataRevision?: number }; version: { resourceId: string; status: string; relativePath: string } | null };
};

@Injectable()
export class CanvasV3VideoAudioSplitsService {
  private readonly pending = new Map<string, { source: string; work: Promise<unknown> }>();

  constructor(
    @Inject(CanvasV3ImagesService) private readonly images: CanvasV3ImagesService,
    @Inject(ProjectResourceService) private readonly resources: ProjectResourceService,
    @Inject(FfmpegService) private readonly ffmpeg: FfmpegService,
  ) {}

  /** 抽出 mp3，并在原视频上再记一条无声版本。同一请求号重放时交回回执，不再编码。 */
  split(requestId: string, body: unknown) {
    this.images.admit();
    if (!IMPORT_ID.test(requestId)) throw new BadRequestException("Invalid import ID");
    const normalized = requestId.toLowerCase();
    const input = parseSplit(body);
    const source = JSON.stringify([input.resourceId, input.versionId]);
    const pending = this.pending.get(normalized);
    if (pending) {
      if (pending.source !== source) throw new ConflictException("Split source conflict");
      return pending.work;
    }
    const work = this.run(normalized, input);
    this.pending.set(normalized, { source, work });
    return work.finally(() => {
      if (this.pending.get(normalized)?.work === work) this.pending.delete(normalized);
    });
  }

  private async run(requestId: string, input: SplitInput) {
    const workspace = this.images.admit();
    const sourceFile = this.sourceFile(workspace, input);
    const originalDigest = await hashFile(sourceFile);
    const probed = await this.ffmpeg.probeMedia(sourceFile);
    if (probed.width <= 0 || probed.height <= 0) throw new BadRequestException("Not video");
    const intent = { resourceId: input.resourceId, versionId: input.versionId };
    const plan = this.plan(requestId, intent, sourceFile, originalDigest);
    const identity = createHash("sha256").update(requestId).update(JSON.stringify([input.resourceId, input.versionId])).digest("hex");
    const created = this.resources.execute({
      commandId: `canvas-split:${requestId}:audio:create`,
      actor: "human",
      command: { type: "resource.create", resourceId: projectId("resource", ["canvas-split", "audio", identity]), payload: { kind: 4, name: plan.names.audio } },
    }) as { committed?: boolean };
    if (!created.committed) throw new ConflictException("Split request conflict");
    const temp = await mkdtemp(path.join(os.tmpdir(), "canvas-v3-split-"));
    try {
      if (await hashFile(this.sourceFile(workspace, input)) !== originalDigest) throw new ConflictException("Source changed");
      const audio = await this.produce(workspace, temp, requestId, input, intent, identity, plan, "audio", originalDigest);
      const silentVideo = await this.produce(workspace, temp, requestId, input, intent, identity, plan, "video", originalDigest);
      if (await hashFile(this.sourceFile(workspace, input)) !== originalDigest) throw new ConflictException("Source changed");
      return { requestId, audio, ...(silentVideo ? { silentVideo } : {}), warnings: silentVideo ? [] : ["silent_video_failed"] };
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  }

  private async produce(workspace: string, temp: string, requestId: string, input: SplitInput, intent: SplitInput, identity: string, plan: Plan, kind: "audio" | "video", originalDigest: string): Promise<SplitOutput | undefined> {
    const resourceId = kind === "video" ? input.resourceId : projectId("resource", ["canvas-split", kind, identity]);
    const versionId = projectId("version", ["canvas-split", kind, requestId]);
    const extension = kind === "audio" ? "mp3" : "mp4";
    const relativePath = `store/${versionId}.${extension}`;
    const hasVersion = this.hasVersion(resourceId, versionId, relativePath);
    let artifact = this.readRecord(requestId, intent, `${kind}:prepared`) as Prepared | undefined;
    const stored = path.join(workspace, relativePath);
    if (!artifact || !(await matches(stored, artifact.digest))) {
      if (hasVersion) throw new ConflictException("Split output unavailable");
      if (kind === "video" && this.readRecord(requestId, intent, "video:failed")) return undefined;
      if (await hashFile(this.sourceFile(workspace, input)) !== originalDigest) throw new ConflictException("Source changed");
      const staged = path.join(temp, kind === "audio" ? "audio.mp3" : "video.mp4");
      try {
        const pinned = path.join(temp, "source");
        if (!existsFile(pinned)) copyFileSync(this.sourceFile(workspace, input), pinned, constants.COPYFILE_EXCL);
        if (kind === "audio") await this.ffmpeg.extractAudio(pinned, staged);
        else await this.ffmpeg.removeAudio(pinned, staged);
        const info = await this.ffmpeg.probeMedia(staged);
        if (kind === "audio" ? !info.hasAudio : info.width <= 0) throw new BadRequestException("Invalid output");
        artifact = {
          digest: await hashFile(staged),
          result: {
            importId: requestId,
            resourceId,
            versionId,
            name: plan.names[kind],
            mediaKind: kind,
            mimeType: kind === "audio" ? "audio/mpeg" : "video/mp4",
            duration: info.duration,
            ...(kind === "video" ? { width: info.width, height: info.height } : {}),
          },
        };
      } catch (error) {
        if (kind === "audio" || error instanceof BadRequestException || error instanceof ConflictException || error instanceof NotFoundException) throw error;
        this.saveRecord(requestId, intent, "video:failed", { failed: true });
        return undefined;
      }
      await publishFile(workspace, relativePath, staged, artifact.digest);
      artifact = this.saveRecord(requestId, intent, `${kind}:prepared`, artifact) as Prepared;
    }
    const committed = this.resources.execute({
      commandId: `canvas-split:${requestId}:${kind}:version`,
      actor: "human",
      command: {
        type: "resource.update",
        resourceId,
        payload: {
          kind: "new_version",
          versionId,
          baseVersionId: kind === "video" ? input.versionId : null,
          relativePath,
          source: "generate",
          disposition: kind === "video" ? "candidate" : "adopted",
          dependencies: [{ resourceId: input.resourceId, versionId: input.versionId, role: "source", inputIndex: 0 }],
        },
      },
    }) as { committed?: boolean };
    if (!committed.committed) throw new ConflictException("Split output conflict");
    if (!(await matches(stored, artifact.digest))) throw new ConflictException("Split output unavailable");
    return artifact.result;
  }

  private plan(requestId: string, intent: SplitInput, sourceFile: string, digest: string): Plan {
    const name = this.sourceName(intent);
    const base = name.slice(0, name.length - path.extname(name).length);
    const saved = this.readRecord(requestId, intent, "plan") as Plan | undefined;
    const plan = saved ?? (this.saveRecord(requestId, intent, "plan", { digest, names: { audio: `${base}-audio.mp3`, video: `${base}-muted.mp4` } }) as Plan);
    if (plan.digest !== digest) throw new ConflictException("Source changed");
    if (!existsFile(sourceFile)) throw new NotFoundException("Video unavailable");
    return plan;
  }

  private sourceFile(workspace: string, input: SplitInput): string {
    const [read] = this.resources.getResources([input]) as ResourceRead[];
    const version = read?.detail?.version;
    if (!read?.ok || read.detail?.resource.kind !== 3 || read.detail.resource.lifecycle !== "active" || version?.status !== "ready" || version.resourceId !== input.resourceId) {
      throw new NotFoundException("Video unavailable");
    }
    assertStored(workspace, version.relativePath);
    return path.join(workspace, version.relativePath);
  }

  private sourceName(input: SplitInput): string {
    const [read] = this.resources.getResources([input]) as ResourceRead[];
    return read?.detail?.resource.name ?? "";
  }

  private hasVersion(resourceId: string, versionId: string, relativePath: string): boolean {
    const [read] = this.resources.getResources([{ resourceId, versionId }]) as ResourceRead[];
    if (read?.ok) {
      const version = read.detail?.version;
      if (read.detail?.resource.lifecycle !== "active" || version?.status !== "ready" || version.resourceId !== resourceId || version.relativePath !== relativePath) throw new ConflictException("Split output unavailable");
      return true;
    }
    if (read?.error?.code !== "VERSION_NOT_FOUND") throw new ConflictException("Split output unavailable");
    return false;
  }

  private readRecord(requestId: string, intent: SplitInput, key: string): unknown {
    try {
      return this.resources.readDeliveryReceipt(`canvas-split:${requestId}:${key}`, intent);
    } catch (error) {
      if (error instanceof ProjectKernelError && error.code === "PROJECT_COMMAND_ID_REUSED") throw new ConflictException("Split scope or source conflict");
      throw error;
    }
  }

  private saveRecord(requestId: string, intent: SplitInput, key: string, data: unknown): unknown {
    try {
      return this.resources.saveDeliveryReceipt(`canvas-split:${requestId}:${key}`, intent, data);
    } catch (error) {
      if (error instanceof ProjectKernelError && error.code === "PROJECT_COMMAND_ID_REUSED") throw new ConflictException("Split scope or source conflict");
      throw error;
    }
  }
}

@Controller("api/v3/canvas/video-audio-splits")
@UseFilters(CanvasV3ImagesHttpFilter)
export class CanvasV3VideoAudioSplitsController {
  constructor(@Inject(CanvasV3VideoAudioSplitsService) private readonly splits: CanvasV3VideoAudioSplitsService) {}

  @Post(":requestId")
  @HttpCode(200)
  split(@Param("requestId") requestId: string, @Body() body: unknown) {
    return this.splits.split(requestId, body);
  }
}

function parseSplit(body: unknown): SplitInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new BadRequestException("Invalid split request");
  const raw = body as Record<string, unknown>;
  if (Object.keys(raw).some((key) => key !== "resourceId" && key !== "versionId")) throw new BadRequestException("Invalid split request");
  if (typeof raw.resourceId !== "string" || typeof raw.versionId !== "string" || !raw.resourceId.trim() || !raw.versionId.trim() || UNSAFE_IDENTIFIER.test(raw.resourceId) || UNSAFE_IDENTIFIER.test(raw.versionId)) {
    throw new BadRequestException("Invalid split request");
  }
  return { resourceId: raw.resourceId, versionId: raw.versionId };
}

function assertStored(workspace: string, relativePath: string): void {
  if (!relativePath || relativePath.includes("\0") || relativePath.includes("\\") || relativePath.includes(":") || path.posix.isAbsolute(relativePath) || relativePath.split("/").some((part) => !part || part === "." || part === "..") || relativePath.split("/")[0] === ".hilo") {
    throw new NotFoundException("Video unavailable");
  }
  let current = workspace;
  const parts = relativePath.split("/");
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index] ?? "");
    const fileStat = lstatSync(current);
    if (fileStat.isSymbolicLink()) throw new NotFoundException("Video unavailable");
    if (index === parts.length - 1 ? !fileStat.isFile() : !fileStat.isDirectory()) throw new NotFoundException("Video unavailable");
  }
  if (realpathSync(current) !== current) throw new NotFoundException("Video unavailable");
}

function existsFile(file: string): boolean {
  try {
    return lstatSync(file).isFile();
  } catch {
    return false;
  }
}

function hashFile(file: string): Promise<string> {
  const hash = createHash("sha256");
  const fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  return pipeline(createReadStream("", { fd, autoClose: true }), hash).then(() => hash.digest("hex"));
}

async function matches(file: string, digest: string): Promise<boolean> {
  if (!existsFile(file)) return false;
  return (await hashFile(file)) === digest;
}

async function publishFile(workspace: string, relativePath: string, source: string, digest: string): Promise<void> {
  const dir = path.join(workspace, "store");
  mkdirSync(dir, { recursive: true });
  const destination = path.join(workspace, relativePath);
  if (!existsFile(destination)) copyFileSync(source, destination, constants.COPYFILE_EXCL);
  if (!(await matches(destination, digest))) throw new ConflictException("Split output unavailable");
}
