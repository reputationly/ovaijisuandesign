import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Header, HttpCode, Inject, Injectable, Post } from "@nestjs/common";
import { chat } from "@ov/maas-media";

import { imageDataUri } from "../edit/edit.service.js";
import { describeFailure } from "../generate/generation-runner.service.js";
import { MediaConfigService } from "../generate/media-config.service.js";
import { buildCatalog } from "../generate/model-catalog.js";
import { ProjectResourceService } from "../project-kernel/resource.service.js";
import { WorkspaceProjectArchitectureService } from "./workspace-project-architecture.service.js";

const LIMITS = { image: 6, video: 2, audio: 2, text: 5 };
const TEXT_BUDGET = 8192;
const TEXT_TIMEOUT_MS = 300_000;
const UNSAFE = /[\u0000-\u001f\u007f/\\]/;

type Reference = { resourceId: string; versionId: string };
type TextRequest = { requestId: string; modelId: string; prompt: string; params?: Record<string, string>; references?: Reference[] };
type TextResult = { requestId: string; ok: boolean; text?: string; error?: string; errorCode?: string; presentation?: string };
type ResourceRead = {
  ok?: boolean;
  detail?: { resource: { kind: number; lifecycle: string }; version: { versionId: string; status: string; relativePath: string } | null };
};

@Injectable()
export class CanvasV3TextGenerationService {
  private readonly running = new Map<string, { fingerprint: string; promise: Promise<TextResult> }>();

  constructor(
    @Inject(WorkspaceProjectArchitectureService) private readonly architecture: WorkspaceProjectArchitectureService,
    @Inject(ProjectResourceService) private readonly resources: ProjectResourceService,
    @Inject(MediaConfigService) private readonly media: MediaConfigService,
  ) {}

  listModels() {
    this.admit();
    const catalog = buildCatalog(this.media.load());
    return { models: catalog.textModels, defaultModelId: catalog.defaultTextModelId ?? "" };
  }

  generate(body: unknown): Promise<TextResult> {
    const workspace = this.admit();
    const request = parseRequest(body);
    const filename = path.join(workspace, ".hilo", `canvas-v3-text-${createHash("sha256").update(request.requestId).digest("hex")}.json`);
    const fingerprint = stable(request);
    const pending = this.running.get(filename);
    if (pending) {
      if (pending.fingerprint !== fingerprint) throw new ConflictException("Generation request ID was reused with different input");
      return pending.promise;
    }
    const existing = readReceipt(filename);
    if (existing) return Promise.resolve(replay(existing, request.requestId, fingerprint));
    const promise = this.generateOnce(workspace, request).then((result) => {
      writeReceipt(filename, { requestId: request.requestId, fingerprint, state: "completed", result });
      return result;
    });
    this.running.set(filename, { fingerprint, promise });
    return promise.finally(() => this.running.delete(filename));
  }

  private async generateOnce(workspace: string, request: TextRequest): Promise<TextResult> {
    const paths = { image: [] as string[], video: [] as string[], audio: [] as string[], text: [] as string[] };
    for (const reference of request.references ?? []) {
      const [read] = this.resources.getResources([reference]) as ResourceRead[];
      const version = read?.detail?.version;
      if (!read?.ok || read.detail?.resource.lifecycle !== "active" || version?.status !== "ready" || version.versionId !== reference.versionId) {
        return rejected(request.requestId, "Reference version is unavailable");
      }
      const bucket = bucketFor(read.detail?.resource.kind);
      if (!bucket) return rejected(request.requestId, "Reference kind is unsupported");
      try {
        assertStored(workspace, version.relativePath);
      } catch {
        return rejected(request.requestId, "Reference content is unavailable");
      }
      paths[bucket].push(version.relativePath);
    }
    for (const kind of Object.keys(paths) as (keyof typeof paths)[]) {
      if (paths[kind].length > LIMITS[kind]) return rejected(request.requestId, `Too many ${kind} references`);
    }
    const catalog = buildCatalog(this.media.load());
    const model = catalog.textModels.find((item) => item.id === request.modelId);
    if (!model) return rejected(request.requestId, "No text model for this model id");
    if (paths.video.length || paths.audio.length) return rejected(request.requestId, "Video and audio references are not supported: the configured chat model only accepts text and images.");
    try {
      const texts = await Promise.all(paths.text.map((relative) => readFile(path.join(workspace, relative), "utf8")));
      const images = await Promise.all(paths.image.map((relative) => imageDataUri(path.join(workspace, relative))));
      const userText = [...texts.map((text, index) => `【文本${index + 1}】\n${text}`), request.prompt].join("\n\n");
      const content = images.length ? [{ type: "text", text: userText }, ...images.map((url) => ({ type: "image_url", image_url: { url } }))] : userText;
      const system = request.params?.system_prompt?.trim() || `你是${model.name}。按用户给出的正文直接写，不要加开场白。`;
      const turn = await chat.completeWithTools(this.media.client(), this.media.load(), [{ role: "system", content: system }, { role: "user", content }], [], TEXT_BUDGET, TEXT_TIMEOUT_MS, request.modelId);
      if (!turn.content.trim()) return { requestId: request.requestId, ok: false, error: "Model returned empty output", errorCode: "backend_error", presentation: "terminal" };
      return { requestId: request.requestId, ok: true, text: turn.content };
    } catch (error) {
      const failure = describeFailure(error);
      const uncertain = failure.code === "network_error";
      return { requestId: request.requestId, ok: false, error: failure.message, errorCode: failure.code, presentation: uncertain ? "status_unknown" : "terminal" };
    }
  }

  private admit(): string {
    try {
      this.architecture.assertV3();
    } catch {
      throw new ForbiddenException("Canvas V3 is unavailable.");
    }
    const workspace = process.env.WORKSPACE_DIR;
    if (!workspace) throw new ForbiddenException("Canvas V3 is unavailable.");
    return workspace;
  }
}

@Controller()
export class CanvasV3TextGenerationController {
  constructor(@Inject(CanvasV3TextGenerationService) private readonly text: CanvasV3TextGenerationService) {}

  @Get("api/v3/canvas/text/models")
  @Header("Cache-Control", "no-store")
  listModels() {
    return this.text.listModels();
  }

  @Post("api/v3/canvas/text/generate")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  generate(@Body() body: unknown) {
    return this.text.generate(body);
  }
}

function parseRequest(body: unknown): TextRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new BadRequestException("Invalid text generation request");
  const raw = body as Record<string, unknown>;
  if (Object.keys(raw).some((key) => !["requestId", "modelId", "prompt", "params", "references"].includes(key))) throw new BadRequestException("Invalid text generation request");
  const requestId = identifier(raw.requestId);
  const modelId = identifier(raw.modelId);
  if (typeof raw.prompt !== "string" || !raw.prompt.trim()) throw new BadRequestException("Invalid text generation request");
  const request: TextRequest = { requestId, modelId, prompt: raw.prompt };
  if (raw.params !== undefined) {
    if (!raw.params || typeof raw.params !== "object" || Array.isArray(raw.params)) throw new BadRequestException("Invalid text generation request");
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw.params)) {
      if (!key || key.length > 256 || typeof value !== "string") throw new BadRequestException("Invalid text generation request");
      params[key] = value;
    }
    request.params = params;
  }
  if (raw.references !== undefined) {
    if (!Array.isArray(raw.references)) throw new BadRequestException("Invalid text generation request");
    const seen = new Set<string>();
    request.references = raw.references.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new BadRequestException("Invalid text generation request");
      const reference = item as Record<string, unknown>;
      if (Object.keys(reference).some((key) => key !== "resourceId" && key !== "versionId")) throw new BadRequestException("Invalid text generation request");
      const versionId = identifier(reference.versionId);
      if (seen.has(versionId)) throw new BadRequestException("Invalid text generation request");
      seen.add(versionId);
      return { resourceId: identifier(reference.resourceId), versionId };
    });
  }
  return request;
}

function identifier(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || UNSAFE.test(value)) throw new BadRequestException("Invalid text generation request");
  return value;
}

function bucketFor(kind: number | undefined): keyof typeof LIMITS | undefined {
  if (kind === 2) return "image";
  if (kind === 3) return "video";
  if (kind === 4) return "audio";
  if (kind === 1) return "text";
  return undefined;
}

function rejected(requestId: string, error: string): TextResult {
  return { requestId, ok: false, error, errorCode: "client_error", presentation: "terminal" };
}

function assertStored(workspace: string, relativePath: string): void {
  if (!relativePath || relativePath.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("Unsafe content");
  let current = workspace;
  for (const part of relativePath.split("/")) {
    current = path.join(current, part);
    const stat = lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error("Unsafe content");
  }
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function readReceipt(filename: string): { requestId?: string; fingerprint?: string; state?: string; result?: TextResult } | undefined {
  try {
    return JSON.parse(readFileSync(filename, "utf8")) as { requestId?: string; fingerprint?: string; state?: string; result?: TextResult };
  } catch {
    return undefined;
  }
}

function replay(receipt: { requestId?: string; fingerprint?: string; state?: string; result?: TextResult }, requestId: string, fingerprint: string): TextResult {
  if (receipt.fingerprint !== fingerprint) throw new ConflictException("Generation request ID was reused with different input");
  if (receipt.state === "completed" && receipt.result) return receipt.result;
  return { requestId, ok: false, error: "The previous generation may have run; its result is not yet available.", errorCode: "status_unknown", presentation: "status_unknown" };
}

function writeReceipt(filename: string, receipt: unknown): void {
  mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.partial`;
  writeFileSync(temporary, JSON.stringify(receipt));
  renameSync(temporary, filename);
}
