import { createHash } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";

import { WorkspaceProjectArchitectureService } from "../canvas-v3/workspace-project-architecture.service.js";
import { getCaller, getRuntimeSessionId, getToolUseId } from "../common/request-context.js";
import { ProjectResourceService } from "../project-kernel/resource.service.js";
import { editorCapabilityData } from "./capabilities.data.js";
import { CLIP_ID, DIRECTOR_ID, EDITOR_IDS, hashCanonical, type EditorSnapshot } from "./codecs.js";
import { animateDirectorScene, summarizeDirectorAnimation, validateDirectorAnimationRelations } from "./director-animation.js";
import { createDirectorObjects, editDirectorScene } from "./director-scene.js";
import { EditorDocumentService } from "./documents.js";
import { EditorRequestError, parseEditorArgs } from "./editor.service.js";

const ID_PATTERN = /^[a-zA-Z0-9_.:-]{1,256}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = ["poll", "claim", "open", "provision", "save", "complete", "release"] as const;
const MUTATING = new Set(["scene.edit", "scene.create", "scene.animate"]);

type HostAction = (typeof ACTIONS)[number];
type HostTarget = { sourceResourceId?: string; compositionId?: string; nodeId?: string; canvasId?: string };
type HostRequest = {
  action: HostAction;
  connectionGeneration: string;
  capabilityIds?: string[];
  commandId?: string;
  target?: HostTarget;
  expectedDraftRevision?: number;
  baseVersionId?: string;
  data?: Record<string, unknown>;
};

type Invocation = {
  method: string;
  contractVersion?: string;
  target: HostTarget;
  args: Record<string, unknown>;
  baseVersionId?: string;
  expectedDraftRevision?: number;
  capabilityId?: string;
};

type Pending = {
  commandId: string;
  subject: string;
  capabilityId: string;
  invocation: Invocation;
  generation?: string;
  recoveryOnly?: boolean;
  release?: () => void;
  finish: (value: unknown) => void;
};

/**
 * 渲染进程通过这一条长连接协议打开、保存和交回编辑器命令。
 * 本地没有云端用户编号，命令回执按工作区隔离。
 */
@Injectable()
export class EditorHostService {
  private readonly owners = new Map<string, string | null>();
  private readonly pending = new Map<string, Pending>();
  private readonly writes = new Map<string, Promise<unknown>>();
  private readonly videoUploads = new Map<string, Promise<unknown>>();
  private readonly completing = new Map<string, { identity: string; result: Promise<unknown> }>();
  private readonly clipCreates = new Map<string, Promise<unknown>>();

  constructor(
    @Inject(WorkspaceProjectArchitectureService) private readonly architecture: WorkspaceProjectArchitectureService,
    @Inject(EditorDocumentService) private readonly documents: EditorDocumentService,
    @Inject(ProjectResourceService) private readonly resources: ProjectResourceService,
  ) {}

  async video(value: unknown, file?: { buffer?: Buffer; mimetype?: string }): Promise<unknown> {
    const subject = this.scope();
    if (getCaller() === "agent") throw new Error("HOST_REQUIRED");
    const req = parseHost(value);
    if (req.action !== "complete" || !req.commandId || !req.target?.sourceResourceId || !file?.buffer?.length || file.buffer.length > 32 * 1024 * 1024 || !/^video\/(mp4|webm)(?:;|$)/i.test(file.mimetype ?? "")) {
      throw new Error("INVALID_VIDEO_UPLOAD");
    }
    const commandId = req.commandId;
    const invocation = this.read(subject, commandId, "request") as Invocation | undefined;
    if (invocation?.method !== "video.export" || this.read(subject, commandId, "generation") !== req.connectionGeneration || invocation.target.sourceResourceId !== req.target.sourceResourceId || invocation.baseVersionId !== req.baseVersionId || invocation.expectedDraftRevision !== req.expectedDraftRevision) {
      throw new Error("TARGET_CHANGED");
    }
    const intent = { sourceResourceId: req.target.sourceResourceId, versionId: req.baseVersionId, checksum: createHash("sha256").update(file.buffer).digest("hex") };
    const prior = this.read(subject, commandId, "video-intent");
    if (prior && hashCanonical(prior) !== hashCanonical(intent)) throw new Error("COMMAND_ID_REUSED");
    const result = this.read(subject, commandId, "result");
    if (result) return result;
    if (this.owners.get(req.target.sourceResourceId) !== req.connectionGeneration) throw new Error("TARGET_CHANGED");
    const waiting = this.pending.get(commandId);
    if (!waiting || waiting.generation !== req.connectionGeneration) throw new Error("COMMAND_NOT_RUNNING");
    const key = `${subject}:${commandId}`;
    const running = this.videoUploads.get(key);
    if (running) return running;
    this.record(subject, commandId, "video-intent", intent);
    const write = (async () => {
      const source = await this.documents.readDirector(invocation.target, invocation.baseVersionId);
      if (source.draftRevision !== invocation.expectedDraftRevision) throw new Error("REVISION_CONFLICT");
      const asset = await this.documents.persistVideo(commandId, invocation.target, invocation.baseVersionId ?? "", String(invocation.args.name), file.buffer as Buffer);
      const receipt = this.record(subject, commandId, "result", {
        commandId,
        status: "completed",
        target: invocation.target,
        versionId: source.versionId,
        draftRevision: source.draftRevision,
        asset,
      });
      waiting.release?.();
      waiting.finish(receipt);
      return receipt;
    })();
    this.videoUploads.set(key, write);
    try {
      return await write;
    } finally {
      if (this.videoUploads.get(key) === write) this.videoUploads.delete(key);
    }
  }

  async host(value: unknown): Promise<unknown> {
    const req = parseHost(value);
    if (getCaller() === "agent") throw new Error("HOST_REQUIRED");
    if (req.action !== "complete" || !req.commandId) return this.hostRequest(req);
    const subject = this.scope();
    const identity = hashCanonical(req);
    const key = `${subject}:${req.commandId}`;
    const waiting = this.pending.get(req.commandId);
    const recovering = waiting?.subject === subject && waiting.capabilityId === CLIP_ID && waiting.invocation.method === "project.export" && waiting.recoveryOnly === true && waiting.generation === req.connectionGeneration && !!req.target?.sourceResourceId && waiting.invocation.target.sourceResourceId === req.target.sourceResourceId;
    const acknowledged = this.read(subject, req.commandId, `host-completion:${identity}`) as { result?: unknown } | undefined;
    if (acknowledged && !recovering) return acknowledged.result;
    const legacy = this.read(subject, req.commandId, "host-completion") as { identity?: string; result?: { status?: string } } | undefined;
    if (legacy?.identity === identity && !recovering) return legacy.result;
    const terminal = (this.read(subject, req.commandId, "host-completion-terminal") as { identity?: string; result?: unknown } | undefined) ?? (legacy?.result?.status !== "unknown" ? legacy : undefined);
    if (terminal) {
      if (terminal.identity !== identity) throw new Error("TARGET_CHANGED");
      return terminal.result;
    }
    const committed = this.readStored(subject, req.commandId, "result") as { _hostCompletionIdentity?: string } | undefined;
    if (committed && typeof committed._hostCompletionIdentity === "string") {
      if (committed._hostCompletionIdentity !== identity) throw new Error("TARGET_CHANGED");
      return withoutIdentity(committed);
    }
    const uncertain = this.read(subject, req.commandId, "uncertain") as { status?: string } | undefined;
    if ((legacy?.result?.status === "unknown" || uncertain?.status === "unknown") && !recovering) throw new Error("TARGET_CHANGED");
    if (!this.pending.has(req.commandId)) {
      const original = this.read(subject, req.commandId, "request") as Invocation | undefined;
      const stored = this.read(subject, req.commandId, "result");
      if (stored && original?.target.sourceResourceId === req.target?.sourceResourceId && this.read(subject, req.commandId, "generation") === req.connectionGeneration) return stored;
    }
    const running = this.completing.get(key);
    if (running) {
      if (running.identity !== identity) throw new Error("TARGET_CHANGED");
      return running.result;
    }
    const result = this.hostRequest(req).then((value) => {
      const receipt = value && typeof value === "object" ? { ...(value as Record<string, unknown>) } : {};
      delete receipt.image;
      delete receipt.images;
      this.record(subject, req.commandId as string, receipt.status === "unknown" ? `host-completion:${identity}` : "host-completion-terminal", { identity, result: receipt });
      return value;
    }).finally(() => {
      this.completing.delete(key);
    });
    this.completing.set(key, { identity, result });
    return result;
  }

  private async hostRequest(req: HostRequest): Promise<unknown> {
    const subject = this.scope();
    const generation = req.connectionGeneration;
    if (req.action === "poll" || req.action === "claim") {
      const capabilities = req.capabilityIds ?? [DIRECTOR_ID];
      const next = [...this.pending.values()].find((item) => item.subject === subject && capabilities.includes(item.capabilityId) && (!item.generation || item.generation === generation));
      if (!next) return { pending: null, canvasRevision: this.documents.canvas.getDocument().revision };
      next.generation = generation;
      this.record(subject, next.commandId, "generation", generation);
      return { pending: { commandId: next.commandId, capabilityId: next.capabilityId, ...next.invocation, ...(next.recoveryOnly ? { recoveryOnly: true } : {}) } };
    }
    if (req.action === "complete" && req.commandId && this.pending.get(req.commandId)?.capabilityId === CLIP_ID) return this.completeClip(subject, req);
    if (req.action === "provision") {
      if (!req.target?.nodeId || req.target.sourceResourceId) throw new Error("TARGET_NOT_FOUND");
      return this.documents.provision(req.target.nodeId);
    }
    if (!req.target?.sourceResourceId) throw new Error("TARGET_NOT_FOUND");
    const sourceId = req.target.sourceResourceId;
    if (req.action === "open" || (req.action === "save" && !this.owners.has(sourceId))) {
      const snapshot = await this.documents.read(req.target);
      if (req.action !== "open" && this.owners.has(sourceId) && this.owners.get(sourceId) !== generation) throw new Error("TARGET_CHANGED");
      if ([...this.pending.values()].some((item) => item.invocation.target.sourceResourceId === sourceId && item.generation && item.generation !== generation)) throw new Error("BUSY");
      if (this.writes.has(sourceId) && this.owners.get(sourceId) !== generation) throw new Error("BUSY");
      this.owners.set(sourceId, generation);
      if (req.action === "open") return snapshot;
    }
    if (req.action !== "complete" && this.owners.get(sourceId) !== generation) throw new Error("TARGET_CHANGED");
    if (req.action === "release") {
      if ([...this.pending.values()].some((item) => item.invocation.target.sourceResourceId === sourceId)) throw new Error("BUSY");
      this.owners.set(sourceId, null);
      return { status: "released" };
    }
    if (req.action === "save") return this.save(subject, req, sourceId, generation);
    if (!req.commandId) throw new Error("COMMAND_REQUIRED");
    return this.completeDirector(subject, req, sourceId, generation);
  }

  private async save(subject: string, req: HostRequest, sourceId: string, generation: string): Promise<EditorSnapshot> {
    if (req.expectedDraftRevision === undefined || !req.baseVersionId || !req.commandId) throw new Error("REVISION_REQUIRED");
    const invocation = this.read(subject, req.commandId, "request") as Invocation | undefined;
    const content = req.data && Object.hasOwn(req.data, "project") ? req.data.project : req.data?.scene;
    const saveIntent = { target: req.target, revision: req.expectedDraftRevision, baseVersionId: req.baseVersionId, content };
    const priorIntent = this.read(subject, req.commandId, "save-intent");
    if (priorIntent && hashCanonical(priorIntent) !== hashCanonical(saveIntent)) throw new Error("COMMAND_ID_REUSED");
    const saved = this.read(subject, req.commandId, "save") as EditorSnapshot | undefined;
    if (saved) return saved;
    if (invocation) {
      const waiting = this.pending.get(req.commandId);
      if ((waiting?.generation ?? this.read(subject, req.commandId, "generation")) !== generation || invocation.target.sourceResourceId !== sourceId) throw new Error("TARGET_CHANGED");
      if (!MUTATING.has(invocation.method)) throw new Error("READ_ONLY_COMMAND");
    }
    this.record(subject, req.commandId, "save-intent", saveIntent);
    const prior = this.writes.get(sourceId) ?? Promise.resolve();
    const write = prior.catch(() => undefined).then(async () => {
      if (this.owners.get(sourceId) !== generation) throw new Error("TARGET_CHANGED");
      const again = this.read(subject, req.commandId as string, "save") as EditorSnapshot | undefined;
      if (again) return again;
      const recovered = await this.documents.recoverSave(req.commandId as string, req.target as HostTarget, req.expectedDraftRevision as number, content);
      if (!recovered && invocation && MUTATING.has(invocation.method)) {
        const current = await this.documents.readDirector(req.target as HostTarget);
        if (hashCanonical(applyDirectorWrite(invocation.method, current.scene, invocation.args)) !== hashCanonical(content)) throw new Error("COMMAND_RESULT_MISMATCH");
      }
      const snapshot = recovered ?? await this.documents.save(req.commandId as string, req.target as HostTarget, req.expectedDraftRevision as number, req.baseVersionId as string, content);
      this.record(subject, req.commandId as string, "save", snapshot);
      if (invocation) {
        const args = invocation.args;
        const affected = invocation.method === "scene.edit" || invocation.method === "scene.create"
          ? ((invocation.method === "scene.create" ? args.objects : args.changes) as { kind?: unknown; id?: unknown }[] | undefined ?? []).map((item) => ({ kind: item.kind, id: item.id }))
          : [];
        this.record(subject, req.commandId as string, "result", {
          commandId: req.commandId,
          status: "committed",
          undoable: MUTATING.has(invocation.method),
          affectedObjects: affected,
          beforeRevision: req.expectedDraftRevision,
          sourceResourceId: snapshot.sourceResourceId,
          compositionId: snapshot.compositionId,
          versionId: snapshot.versionId,
          draftRevision: snapshot.draftRevision,
          ...(invocation.method === "scene.animate" && snapshot.capabilityId === DIRECTOR_ID ? { animationSummary: summarizeDirectorAnimation(snapshot.scene) } : {}),
        });
      }
      return snapshot;
    });
    this.writes.set(sourceId, write);
    try {
      return await write as EditorSnapshot;
    } finally {
      if (this.writes.get(sourceId) === write) this.writes.delete(sourceId);
    }
  }

  private async completeDirector(subject: string, req: HostRequest, sourceId: string, generation: string): Promise<unknown> {
    const waiting = this.pending.get(req.commandId as string);
    if (waiting?.subject !== subject || waiting.generation !== generation || waiting.invocation.target.sourceResourceId !== sourceId) throw new Error("TARGET_CHANGED");
    const existing = this.read(subject, req.commandId as string, "result");
    const writing = methodWrite(waiting.capabilityId, waiting.invocation.method);
    const attemptedSave = this.read(subject, req.commandId as string, "save-intent");
    const attemptedVideo = this.read(subject, req.commandId as string, "video-intent");
    const { image, ...data } = req.data ?? {};
    let asset: unknown;
    let persistError = waiting.invocation.method === "video.export" && !data.error ? "VIDEO_NOT_SAVED" : undefined;
    if (!existing && waiting.invocation.method === "scene.snapshot" && typeof image === "string" && !data.error) {
      try {
        asset = await this.documents.persistSnapshot(req.commandId as string, waiting.invocation.target, String(waiting.invocation.args.cameraId), String(data.versionId), image);
      } catch (error) {
        persistError = error instanceof Error ? error.message : "SNAPSHOT_PERSIST_FAILED";
      }
    }
    const outcome = {
      target: waiting.invocation.target,
      ...data,
      commandId: req.commandId,
      status: writing && (attemptedSave || req.data?.writeAttempted) || waiting.invocation.method === "video.export" && attemptedVideo ? "unknown" : data.error || persistError ? "rejected" : writing ? "unchanged" : "completed",
      ...(asset ? { asset } : {}),
      ...(persistError ? { code: waiting.invocation.method === "video.export" ? "VIDEO_NOT_SAVED" : "SNAPSHOT_PERSIST_FAILED", error: persistError } : {}),
    };
    const receipt = existing ?? (outcome.status === "unknown" ? outcome : this.record(subject, req.commandId as string, "result", outcome));
    waiting.release?.();
    waiting.finish(asset ? { ...(receipt as Record<string, unknown>), image } : receipt);
    return receipt;
  }

  private async completeClip(subject: string, req: HostRequest): Promise<unknown> {
    const commandId = req.commandId as string;
    const waiting = this.pending.get(commandId);
    const sourceResourceId = waiting?.invocation.target.sourceResourceId;
    if (waiting?.subject !== subject || waiting.generation !== req.connectionGeneration || !sourceResourceId || sourceResourceId !== req.target?.sourceResourceId) throw new Error("TARGET_CHANGED");
    const existing = this.read(subject, commandId, "result");
    const method = waiting.invocation.method;
    if (!editorCapabilityData.clipMethods.some((entry) => entry.method === method)) throw new Error("METHOD_UNAVAILABLE");
    const writing = methodWrite(CLIP_ID, method);
    const data = req.data ?? {};
    const images = Array.isArray(data.images) ? data.images.filter((image) => typeof image === "string").slice(0, 4) : [];
    let versionId = typeof data.versionId === "string" ? data.versionId : undefined;
    let draftRevision: number | undefined;
    if (versionId) {
      const reported = await this.documents.readClip({ sourceResourceId }, versionId).catch(() => undefined);
      if (reported) draftRevision = reported.draftRevision;
      else versionId = undefined;
    }
    const result = data.result && typeof data.result === "object" && !Array.isArray(data.result) ? data.result : undefined;
    const asset = clipAsset(data.asset);
    const error = typeof data.error === "string" ? data.error.slice(0, 500) : versionId ? method === "project.export" && !asset ? "EXPORT_NOT_DELIVERED" : undefined : "INVALID_EDITOR_RECEIPT";
    const editFailed = method === "project.edit" && result && (result as { ok?: unknown }).ok === false;
    const exportUncertain = method === "project.export" && (recoverableClipExport(error) || waiting.recoveryOnly === true && error !== undefined);
    const status = error ? exportUncertain || (writing && data.writeAttempted === true) ? "unknown" : "rejected" : editFailed ? "rejected" : writing ? versionId === waiting.invocation.baseVersionId ? "unchanged" : "committed" : "completed";
    let recovery: string | undefined;
    if (status === "committed") {
      const current = await this.documents.readClip({ sourceResourceId }).catch(() => undefined);
      if (current?.versionId !== versionId) recovery = "The project changed after this command; re-read with project.get before the next write.";
    }
    const outcome = {
      commandId,
      status,
      target: waiting.invocation.target,
      ...(versionId ? { versionId } : {}),
      ...(draftRevision !== undefined ? { draftRevision } : {}),
      ...(result ? { result } : {}),
      ...(asset ? { asset } : {}),
      ...(error ? { code: error, error } : editFailed ? { code: "EDIT_FAILED" } : {}),
      ...(status === "unknown" ? { recovery: "Use command.get with this commandId." } : {}),
      ...(recovery ? { recovery } : {}),
    };
    const receipt = existing ?? (status === "unknown" ? exportUncertain ? this.record(subject, commandId, "uncertain", outcome) : outcome : withoutIdentity(this.record(subject, commandId, "result", { ...outcome, _hostCompletionIdentity: hashCanonical(req) })));
    waiting.release?.();
    waiting.finish(images.length && !existing ? { ...(receipt as Record<string, unknown>), images } : receipt);
    return receipt;
  }

  async execute(input: unknown): Promise<unknown> {
    const subject = this.scope();
    if (getCaller() !== "agent" || !getRuntimeSessionId() || !getToolUseId()) throw new Error("TRUSTED_TOOL_ID_REQUIRED");
    const envelope = parseExecute(input);
    if (envelope.capabilityId === CLIP_ID) return this.executeClip(subject, envelope.plugin);
    const invocation = envelope.plugin;
    if (invocation.contractVersion !== "3") throw new Error("CONTRACT_CHANGED");
    const method = directorMethod(invocation.method);
    if (method === "scene.animate") validateDirectorAnimationRelations(invocation.args);
    invocation.args = parseArgs(method, invocation.args, false);
    if (method === "command.get" || method === "command.recover") return this.readDirectorCommand(subject, method, String(invocation.args.commandId));
    const commandId = editorCommandId(subject);
    const previous = this.read(subject, commandId, "request") as Invocation | undefined;
    if (previous && hashCanonical(previous) !== hashCanonical(invocation)) throw new Error("COMMAND_ID_REUSED");
    const stored = this.read(subject, commandId, "result");
    if (stored) return { command: stored };
    if (previous) return { command: { commandId, status: this.pending.has(commandId) ? "running" : "unknown" } };
    if (method === "document.create") assertCreateTarget(invocation.target);
    else {
      if (!invocation.target.sourceResourceId) throw new Error("SOURCE_RESOURCE_REQUIRED");
      const source = await this.documents.readDirector(invocation.target);
      if ((methodWrite(DIRECTOR_ID, method) || method === "video.export") && (invocation.baseVersionId !== source.versionId || invocation.expectedDraftRevision !== source.draftRevision)) throw new Error("REVISION_CONFLICT");
      if (method === "scene.edit") editDirectorScene(source.scene, invocation.args);
      if (method === "scene.create") createDirectorObjects(source.scene, invocation.args);
      if (method === "scene.animate") animateDirectorScene(source.scene, invocation.args);
      if (method === "scene.get") return { result: scenePage(source, invocation) };
    }
    const admitted = this.read(subject, commandId, "request") as Invocation | undefined;
    if (admitted) {
      if (hashCanonical(admitted) !== hashCanonical(invocation)) throw new Error("COMMAND_ID_REUSED");
      return { command: this.read(subject, commandId, "result") ?? { commandId, status: this.pending.has(commandId) ? "running" : "unknown" } };
    }
    this.record(subject, commandId, "request", invocation);
    if (method === "document.create") {
      const source = await this.documents.create(commandId, DIRECTOR_ID, String(invocation.args.name));
      return { command: this.record(subject, commandId, "result", { commandId, status: "committed", ...sourceReceipt(source) }) };
    }
    if ([...this.pending.values()].some((item) => item.invocation.target.sourceResourceId === invocation.target.sourceResourceId)) {
      return { command: this.record(subject, commandId, "result", { commandId, status: "rejected", code: "BUSY" }) };
    }
    return { command: await this.park(subject, commandId, DIRECTOR_ID, invocation, method === "video.export" ? 180_000 : 60_000) };
  }

  private async readDirectorCommand(subject: string, method: string, commandId: string): Promise<unknown> {
    const original = this.read(subject, commandId, "request") as Invocation | undefined;
    const result = this.read(subject, commandId, "result");
    const recovered = this.read(subject, commandId, "provisioned");
    if (recovered) return { command: recovered };
    if (method === "command.get" && result) return { command: result };
    if (method === "command.recover") {
      if (original?.method !== "document.create") throw new Error("RECOVERY_UNAVAILABLE");
      if (result && typeof result === "object" && (result as { placement?: string }).placement === "placed") return { command: result };
      const source = await this.documents.create(commandId, DIRECTOR_ID, String(original.args.name));
      const receipt = { commandId, status: "committed", ...sourceReceipt(source) };
      if (source.placement === "placed") this.record(subject, commandId, "provisioned", receipt);
      return { command: receipt };
    }
    const intent = this.read(subject, commandId, "save-intent") as { target: HostTarget; revision: number; content: unknown } | undefined;
    if (original && intent) {
      const saved = await this.documents.recoverSave(commandId, intent.target, intent.revision, intent.content);
      if (saved) {
        return {
          command: {
            commandId,
            status: "committed",
            beforeRevision: intent.revision,
            ...sourceReceipt(saved),
            ...(original.method === "scene.animate" && saved.capabilityId === DIRECTOR_ID ? { animationSummary: summarizeDirectorAnimation(saved.scene) } : {}),
          },
        };
      }
    }
    return {
      command: result ?? (original ? { commandId, status: this.pending.has(commandId) ? "running" : "unknown", recovery: "Original command retained. Do not resubmit." } : { commandId, status: "not_found" }),
    };
  }

  private async executeClip(subject: string, raw: Invocation): Promise<unknown> {
    if (raw.contractVersion !== "3") throw new Error("CONTRACT_CHANGED");
    const method = clipMethod(raw.method);
    raw.args = parseArgs(method, raw.args, true);
    if (method === "document.list") return this.listClipNodes(raw);
    if (method === "command.get") {
      const commandId = String(raw.args.commandId);
      const original = this.read(subject, commandId, "request") as (Invocation & { capabilityId?: string }) | undefined;
      const result = this.read(subject, commandId, "provisioned") ?? this.read(subject, commandId, "result");
      if (original?.capabilityId === CLIP_ID && original.method === "document.create" && !(result && typeof result === "object" && (result as { placement?: string }).placement === "placed")) {
        return { command: await this.createClip(subject, commandId, original) };
      }
      return { command: result ?? (original ? { commandId, status: this.pending.has(commandId) ? "running" : "unknown", recovery: "Original command retained. Do not resubmit." } : { commandId, status: "not_found" }) };
    }
    const commandId = editorCommandId(subject);
    const request = { capabilityId: CLIP_ID, ...raw };
    const previous = this.read(subject, commandId, "request");
    if (previous) {
      if (hashCanonical(previous) !== hashCanonical(request)) throw new Error("COMMAND_ID_REUSED");
      return { command: this.read(subject, commandId, "provisioned") ?? this.read(subject, commandId, "result") ?? { commandId, status: this.pending.has(commandId) ? "running" : "unknown" } };
    }
    if (method === "document.create") assertCreateTarget(raw.target);
    else {
      raw.target = await this.clipTarget(raw.target);
      const source = await this.documents.readClip(raw.target);
      if (methodWrite(CLIP_ID, method) && (raw.baseVersionId !== source.versionId || (raw.expectedDraftRevision !== undefined && raw.expectedDraftRevision !== source.draftRevision))) throw new Error("REVISION_CONFLICT");
    }
    this.record(subject, commandId, "request", request);
    if (method === "document.create") return { command: await this.createClip(subject, commandId, raw) };
    if ([...this.pending.values()].some((item) => item.capabilityId === CLIP_ID && item.invocation.target.sourceResourceId === raw.target.sourceResourceId)) {
      return { command: this.record(subject, commandId, "result", { commandId, status: "rejected", code: "BUSY" }) };
    }
    return { command: await this.park(subject, commandId, CLIP_ID, raw, clipTimeout(method)) };
  }

  private async createClip(subject: string, commandId: string, invocation: Invocation): Promise<unknown> {
    const key = `${subject}:${commandId}`;
    const running = this.clipCreates.get(key);
    if (running) return running;
    const write = (async () => {
      const source = await this.documents.create(commandId, CLIP_ID, String(invocation.args.name), Array.isArray(invocation.args.sourceNodeIds) ? invocation.args.sourceNodeIds.filter((item): item is string => typeof item === "string") : []);
      return this.record(subject, commandId, source.placement === "placed" ? "provisioned" : "result", { commandId, status: "committed", ...sourceReceipt(source) });
    })();
    this.clipCreates.set(key, write);
    try {
      return await write;
    } finally {
      if (this.clipCreates.get(key) === write) this.clipCreates.delete(key);
    }
  }

  private async clipTarget(target: HostTarget): Promise<HostTarget> {
    if (target.canvasId && target.canvasId !== "workspace") throw new Error("TARGET_NOT_FOUND");
    if (target.compositionId) throw new Error("TARGET_NOT_FOUND");
    if (target.sourceResourceId) return target;
    if (!target.nodeId) throw new Error("TARGET_NOT_FOUND");
    const source = await this.documents.provision(target.nodeId, CLIP_ID);
    return { sourceResourceId: source.sourceResourceId, nodeId: target.nodeId };
  }

  private async listClipNodes(invocation: Invocation): Promise<unknown> {
    assertCreateTarget(invocation.target);
    const document = this.documents.canvas.getDocument();
    const nodeIds = Array.isArray(invocation.args.nodeIds) ? invocation.args.nodeIds : undefined;
    const clips = Object.values(document.nodes).filter((node) => node.kind === "clip-studio" && (!nodeIds || nodeIds.includes(node.id)));
    const offset = typeof invocation.args.offset === "number" ? invocation.args.offset : 0;
    const limit = typeof invocation.args.limit === "number" ? invocation.args.limit : 20;
    const items = [];
    for (const node of clips.slice(offset, offset + limit)) {
      const source = typeof node.sourceResourceId === "string" ? await this.documents.readClip({ sourceResourceId: node.sourceResourceId, nodeId: node.id }).catch(() => undefined) : undefined;
      items.push({
        nodeId: node.id,
        title: node.title,
        ...(source ? { sourceResourceId: source.sourceResourceId, compositionId: source.compositionId, versionId: source.versionId, draftRevision: source.draftRevision } : {}),
        empty: !source?.project,
      });
    }
    return { result: { status: "saved", total: clips.length, items, ...(offset + items.length < clips.length ? { nextOffset: offset + items.length } : {}) } };
  }

  private park(subject: string, commandId: string, capabilityId: string, invocation: Invocation, timeoutMs: number): Promise<unknown> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (!this.pending.get(commandId)?.generation) this.pending.delete(commandId);
        resolve({ commandId, status: "unknown", code: "TIMEOUT", recovery: "Use command.get with this commandId." });
      }, timeoutMs);
      this.pending.set(commandId, {
        commandId,
        subject,
        capabilityId,
        invocation,
        finish: (value) => {
          clearTimeout(timer);
          this.pending.delete(commandId);
          resolve(value);
        },
      });
    });
  }

  private scope(): string {
    try {
      this.architecture.assertV3();
    } catch {
      throw new Error("FORBIDDEN");
    }
    if (process.env.HILO_GATEWAY_ROLE !== "workspace" || !process.env.WORKSPACE_DIR) throw new Error("FORBIDDEN");
    return "workspace";
  }

  private read(subject: string, id: string, part: string): unknown {
    const value = this.readStored(subject, id, part);
    return part === "result" ? withoutIdentity(value) : value;
  }

  private readStored(subject: string, id: string, part: string): unknown {
    return this.resources.readDeliveryReceipt(`editor:${subject}:${id}:${part}`, { subject, id });
  }

  private record(subject: string, id: string, part: string, value: unknown): unknown {
    return this.resources.saveDeliveryReceipt(`editor:${subject}:${id}:${part}`, { subject, id }, value);
  }
}

function editorCommandId(subject: string): string {
  return `editor_${hashCanonical([subject, getRuntimeSessionId(), getToolUseId()]).slice(0, 40)}`;
}

function sourceReceipt(source: object): Record<string, unknown> {
  const { scene: _scene, project: _project, ...receipt } = source as Record<string, unknown>;
  return receipt;
}

function assertCreateTarget(target: HostTarget): void {
  const { canvasId, ...rest } = target;
  if (canvasId !== "workspace" || Object.keys(rest).length) throw new Error("INVALID_CREATE_TARGET");
}

function directorMethod(method: string): string {
  if (!editorCapabilityData.directorMethods.some((entry) => entry.method === method)) throw new Error("METHOD_UNAVAILABLE");
  return method;
}

function clipMethod(method: string): string {
  if (!editorCapabilityData.clipMethods.some((entry) => entry.method === method)) throw new Error("METHOD_UNAVAILABLE");
  return method;
}

function parseArgs(method: string, args: Record<string, unknown>, clip: boolean): Record<string, unknown> {
  return parseEditorArgs(clip, method, args);
}

function clipTimeout(method: string): number {
  if (method === "project.edit") return 180_000;
  if (method === "project.view") return 30_000;
  if (method === "project.snapshot") return 90_000;
  return 60_000;
}

function scenePage(source: Extract<EditorSnapshot, { capabilityId: typeof DIRECTOR_ID }>, invocation: Invocation) {
  const query = invocation.args;
  const kind = typeof query.kind === "string" ? query.kind : undefined;
  const kinds = kind ? [kind] : ["camera", "character", "prop", "path", "motion", "track"];
  const objects = kinds.flatMap((item) => {
    const list = item === "track" ? (source.scene.camTimeline as { tracks?: unknown[] } | undefined)?.tracks : source.scene[item === "camera" ? "cameras" : item === "path" ? "camPaths" : item === "motion" ? "customMotions" : `${item}s`];
    return (Array.isArray(list) ? list : []).map((object) => ({ kind: item, ...(object as Record<string, unknown>) }) as Record<string, unknown>);
  });
  const ids = Array.isArray(query.ids) ? query.ids.map(String) : undefined;
  const selected = objects.filter((object) => !ids || ids.includes(String(object.id)));
  const offset = typeof query.offset === "number" ? query.offset : 0;
  const limit = typeof query.limit === "number" ? query.limit : 10;
  const animationSummary = summarizeDirectorAnimation(source.scene);
  const page: Record<string, unknown>[] = [];
  for (const object of selected.slice(offset, offset + limit)) {
    if (Buffer.byteLength(JSON.stringify({ animationSummary, objects: [...page, object] })) > 14_000) break;
    page.push(object);
  }
  if (!page.length && offset < selected.length) throw new Error("OBJECT_EXCEEDS_PAGE_BUDGET");
  return {
    status: "saved",
    target: invocation.target,
    versionId: source.versionId,
    draftRevision: source.draftRevision,
    objects: page,
    animationSummary,
    ...(offset + page.length < selected.length ? { nextOffset: offset + page.length } : {}),
  };
}

function parseExecute(value: unknown): { capabilityId: string; plugin: Invocation } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid("capabilityId", "object");
  const raw = value as Record<string, unknown>;
  if (Object.keys(raw).some((key) => !["capabilityId", "plugin"].includes(key))) throw invalid("plugin", "unexpected");
  if (raw.capabilityId !== DIRECTOR_ID && raw.capabilityId !== CLIP_ID) throw new Error("METHOD_UNAVAILABLE");
  if (!raw.plugin || typeof raw.plugin !== "object" || Array.isArray(raw.plugin)) throw invalid("plugin", "object");
  const plugin = raw.plugin as Record<string, unknown>;
  const allowed = ["method", "contractVersion", "target", "args", "expectedDraftRevision", "baseVersionId"];
  if (Object.keys(plugin).some((key) => !allowed.includes(key))) throw invalid("plugin", "unexpected");
  if (typeof plugin.method !== "string" || !ID_PATTERN.test(plugin.method)) throw invalid("plugin.method", "id");
  if (plugin.contractVersion !== "3") throw new Error("CONTRACT_CHANGED");
  if (!plugin.target || typeof plugin.target !== "object" || Array.isArray(plugin.target)) throw invalid("plugin.target", "object");
  if (!plugin.args || typeof plugin.args !== "object" || Array.isArray(plugin.args)) throw invalid("plugin.args", "object");
  const target = parseTarget(plugin.target);
  const invocation: Invocation = { method: plugin.method, contractVersion: "3", target, args: plugin.args as Record<string, unknown> };
  if (plugin.expectedDraftRevision !== undefined) {
    if (typeof plugin.expectedDraftRevision !== "number" || !Number.isSafeInteger(plugin.expectedDraftRevision) || plugin.expectedDraftRevision < 0) throw invalid("plugin.expectedDraftRevision", "integer");
    invocation.expectedDraftRevision = plugin.expectedDraftRevision;
  }
  if (plugin.baseVersionId !== undefined) {
    if (typeof plugin.baseVersionId !== "string" || !ID_PATTERN.test(plugin.baseVersionId)) throw invalid("plugin.baseVersionId", "id");
    invocation.baseVersionId = plugin.baseVersionId;
  }
  return { capabilityId: raw.capabilityId, plugin: invocation };
}

function applyDirectorWrite(method: string, scene: Record<string, unknown>, args: Record<string, unknown>): unknown {
  if (method === "scene.edit") return editDirectorScene(scene, args);
  if (method === "scene.create") return createDirectorObjects(scene, args);
  return animateDirectorScene(scene, args);
}

function methodWrite(capabilityId: string, method: string): boolean {
  const table = capabilityId === CLIP_ID ? editorCapabilityData.clipMethods : editorCapabilityData.directorMethods;
  const found = table.find((entry) => entry.method === method);
  if (!found) throw new Error("METHOD_UNAVAILABLE");
  return found.write;
}

function recoverableClipExport(error: string | undefined): boolean {
  return error !== undefined && /^(?:EXPORT_FAILED:\s*)?CLIP_STUDIO_EXPORT_(?:RECOVERY_REQUIRED|BYTES_UNAVAILABLE|DELIVERY_UNKNOWN)(?:$|:)/.test(error);
}

function clipAsset(value: unknown): { resourceId: string; versionId: string; mediaKind: string } | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  if (Object.keys(raw).some((key) => !["resourceId", "versionId", "mediaKind"].includes(key))) return undefined;
  if (typeof raw.resourceId !== "string" || raw.resourceId.length < 1 || raw.resourceId.length > 256) return undefined;
  if (typeof raw.versionId !== "string" || raw.versionId.length < 1 || raw.versionId.length > 256) return undefined;
  if (raw.mediaKind !== "video" && raw.mediaKind !== "audio") return undefined;
  return { resourceId: raw.resourceId, versionId: raw.versionId, mediaKind: raw.mediaKind };
}

function withoutIdentity(value: unknown): unknown {
  if (!value || typeof value !== "object" || !("_hostCompletionIdentity" in value)) return value;
  const { _hostCompletionIdentity: _identity, ...result } = value as Record<string, unknown>;
  return result;
}

function parseHost(value: unknown): HostRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid("action", "object");
  const raw = value as Record<string, unknown>;
  const allowed = ["action", "connectionGeneration", "capabilityIds", "commandId", "target", "expectedDraftRevision", "baseVersionId", "data"];
  for (const key of Object.keys(raw)) if (!allowed.includes(key)) throw invalid(key, "unexpected");
  if (typeof raw.action !== "string" || !ACTIONS.includes(raw.action as HostAction)) throw invalid("action", "enum");
  if (typeof raw.connectionGeneration !== "string" || !UUID_PATTERN.test(raw.connectionGeneration)) throw invalid("connectionGeneration", "uuid");
  const request: HostRequest = { action: raw.action as HostAction, connectionGeneration: raw.connectionGeneration };
  if (raw.capabilityIds !== undefined) {
    if (!Array.isArray(raw.capabilityIds) || raw.capabilityIds.length < 1 || raw.capabilityIds.length > EDITOR_IDS.length || raw.capabilityIds.some((item) => !EDITOR_IDS.includes(item))) {
      throw invalid("capabilityIds", "capability");
    }
    request.capabilityIds = raw.capabilityIds;
  }
  if (raw.commandId !== undefined) {
    if (typeof raw.commandId !== "string" || raw.commandId.length < 1 || raw.commandId.length > 256) throw invalid("commandId", "string");
    request.commandId = raw.commandId;
  }
  if (raw.target !== undefined) request.target = parseTarget(raw.target);
  if (raw.expectedDraftRevision !== undefined) {
    if (typeof raw.expectedDraftRevision !== "number" || !Number.isSafeInteger(raw.expectedDraftRevision) || raw.expectedDraftRevision < 0) throw invalid("expectedDraftRevision", "integer");
    request.expectedDraftRevision = raw.expectedDraftRevision;
  }
  if (raw.baseVersionId !== undefined) {
    if (typeof raw.baseVersionId !== "string") throw invalid("baseVersionId", "string");
    request.baseVersionId = raw.baseVersionId;
  }
  if (raw.data !== undefined) {
    if (!raw.data || typeof raw.data !== "object" || Array.isArray(raw.data)) throw invalid("data", "object");
    request.data = raw.data as Record<string, unknown>;
  }
  return request;
}

function parseTarget(value: unknown): HostTarget {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid("target", "object");
  const raw = value as Record<string, unknown>;
  const target: HostTarget = {};
  for (const key of Object.keys(raw)) {
    if (!["sourceResourceId", "compositionId", "nodeId", "canvasId"].includes(key)) throw invalid(`target.${key}`, "unexpected");
    const item = raw[key];
    if (typeof item !== "string" || !ID_PATTERN.test(item)) throw invalid(`target.${key}`, "id");
    target[key as keyof HostTarget] = item;
  }
  return target;
}

function invalid(path: string, expected: string): EditorRequestError {
  return new EditorRequestError("VALIDATION_FAILED", "Invalid editor request", [{ path, expected }]);
}
