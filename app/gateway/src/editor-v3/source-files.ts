import { mkdirSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Inject, Injectable } from "@nestjs/common";

import { ProjectKernelError } from "../project-kernel/errors.js";
import { projectId, ProjectCompositionService } from "../project-kernel/composition.service.js";
import { ProjectResourceService } from "../project-kernel/resource.service.js";
import { assertPersistent, CLIP_ID, codecForPath, DIRECTOR_ID, EDITOR_CODECS, hashCanonical, parseClipProject, parseEditorScene, type EditorCodec, type EditorSnapshot } from "./codecs.js";

type ResourceRead = {
  ok?: boolean;
  detail?: {
    resource: { kind: number; lifecycle: string; name: string };
    version: { versionId: string; relativePath: string; status: string } | null;
  };
};

type Envelope = {
  schemaVersion: 1;
  capabilityId: string;
  sourceResourceId: string;
  compositionId: string;
  draftRevision: number;
  scene?: unknown;
  project?: unknown;
};

const FILE_KIND = 5;

@Injectable()
export class EditorSourceFiles {
  constructor(
    @Inject(ProjectResourceService) private readonly resources: ProjectResourceService,
    @Inject(ProjectCompositionService) private readonly compositions: ProjectCompositionService,
  ) {}

  async read(sourceResourceId: string, fixedVersionId?: string): Promise<EditorSnapshot> {
    const [result] = this.resources.getResources([{ resourceId: sourceResourceId, ...(fixedVersionId ? { versionId: fixedVersionId } : {}) }]) as ResourceRead[];
    if (!result?.ok || result.detail?.resource.kind !== FILE_KIND || !result.detail.version || result.detail.version.status !== "ready" || result.detail.resource.lifecycle !== "active") {
      throw new Error("TARGET_NOT_FOUND");
    }
    const version = result.detail.version;
    const codec = codecForPath(version.relativePath);
    if (!codec) throw new Error("TARGET_CHANGED");
    const workspace = workspaceDir();
    const absolute = path.join(workspace, version.relativePath);
    const bytes = readFileSync(absolute);
    if (bytes.length > codec.maxFileBytes) throw new Error("INVALID_SOURCE");
    let parsed: unknown;
    try {
      parsed = JSON.parse(bytes.toString("utf8"));
    } catch {
      throw new Error("INVALID_SOURCE");
    }
    const envelope = parseEnvelope(parsed);
    if (envelope.capabilityId !== codec.capabilityId || envelope.sourceResourceId !== sourceResourceId) throw new Error("TARGET_CHANGED");
    const composition = this.compositions.get(envelope.compositionId);
    const members = composition.members as { resource?: string | null }[];
    if (composition.lifecycle !== "active" || !members.some((member) => member.resource === sourceResourceId)) throw new Error("TARGET_CHANGED");
    return snapshot(codec, envelope, envelope[codec.field], version.versionId);
  }

  async provision(seed: string, codec: EditorCodec, name: string, content: unknown = codec.empty()): Promise<EditorSnapshot> {
    const title = name.trim() || codec.defaultName;
    const receipt = this.compositions.createEditorComposition(`${seed}:composition`, title, codec.capabilityId === CLIP_ID);
    if (!receipt.committed) throw new Error("SOURCE_PROVISION_FAILED");
    const sourceResourceId = projectId("resource", [seed, "editor-source"]);
    const stored = await this.commit(`${seed}:source`, codec, {
      sourceResourceId,
      compositionId: receipt.compositionId,
      draftRevision: 0,
      content: codec.parse(content),
    }, undefined, title);
    await this.addMember(`${seed}:member`, receipt.compositionId, {
      memberId: projectId("member", [receipt.compositionId, sourceResourceId]),
      role: codec.sourceRole,
      resource: sourceResourceId,
    });
    return stored;
  }

  async save(commandId: string, current: EditorSnapshot, content: unknown): Promise<EditorSnapshot> {
    const codec = EDITOR_CODECS[current.capabilityId];
    const next = codec.parse(content);
    assertPersistent(next);
    if (hashCanonical(codec.normalize(next)) === hashCanonical(codec.normalize(this.content(current)))) return current;
    return this.commit(commandId, codec, {
      sourceResourceId: current.sourceResourceId,
      compositionId: current.compositionId,
      draftRevision: current.draftRevision + 1,
      content: next,
    }, current.versionId);
  }

  async recoverSave(commandId: string, sourceResourceId: string, revision: number, content: unknown): Promise<EditorSnapshot | undefined> {
    const versionId = projectId("version", commandId);
    const [entry] = this.resources.getResources([{ resourceId: sourceResourceId, versionId }]) as ResourceRead[];
    if (!entry?.ok) return undefined;
    const stored = await this.read(sourceResourceId, versionId);
    const codec = EDITOR_CODECS[stored.capabilityId];
    if (stored.draftRevision !== revision + 1 || hashCanonical(codec.normalize(this.content(stored))) !== hashCanonical(codec.normalize(codec.parse(content)))) {
      throw new Error("COMMAND_ID_REUSED");
    }
    return stored;
  }

  content(source: EditorSnapshot): unknown {
    return source.capabilityId === DIRECTOR_ID ? source.scene : source.project;
  }

  async addMember(commandId: string, compositionId: string, member: { memberId: string; role: string; resource: string }): Promise<void> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const composition = this.compositions.get(compositionId);
      if (composition.lifecycle !== "active") throw new Error("TARGET_CHANGED");
      if ((composition.members as { resource?: string | null }[]).some((item) => item.resource === member.resource)) return;
      const receipt = this.compositions.execute({
        commandId: `${commandId}:${composition.revision}`,
        actor: "agent",
        expectedRevision: composition.revision,
        command: { type: "composition.apply", compositionId, operations: [{ type: "member.add", member }] },
      }) as { committed?: boolean };
      if (receipt.committed) return;
    }
    throw new Error("COMPOSITION_CONFLICT");
  }

  private async commit(commandId: string, codec: EditorCodec, document: { sourceResourceId: string; compositionId: string; draftRevision: number; content: unknown }, baseVersionId?: string, name = codec.defaultName): Promise<EditorSnapshot> {
    assertPersistent(document.content);
    const dependencies = await this.dependencies(codec, document.content);
    const versionId = projectId("version", commandId);
    const [existing] = this.resources.getResources([{ resourceId: document.sourceResourceId, versionId }]) as ResourceRead[];
    if (existing?.ok) {
      const stored = await this.read(document.sourceResourceId, versionId);
      if (hashCanonical(codec.normalize(this.content(stored))) !== hashCanonical(codec.normalize(document.content))) throw new Error("COMMAND_ID_REUSED");
      return stored;
    }
    const envelope = {
      schemaVersion: 1,
      capabilityId: codec.capabilityId,
      sourceResourceId: document.sourceResourceId,
      compositionId: document.compositionId,
      draftRevision: document.draftRevision,
      ...(document.content === null ? {} : { [codec.field]: document.content }),
    };
    const relativePath = `store/${versionId}.${codec.extension}`;
    const bytes = Buffer.from(JSON.stringify(envelope));
    const limit = codec.extension === "clip" ? 4 * 1024 * 1024 : 2 * 1024 * 1024;
    if (bytes.length < 1 || bytes.length > limit) throw new Error("INVALID_SOURCE");
    const workspace = workspaceDir();
    publish(workspace, relativePath, bytes);
    try {
      if (!baseVersionId) {
        this.resources.execute({
          commandId: `${commandId}:resource`,
          actor: "agent",
          command: { type: "resource.create", resourceId: document.sourceResourceId, payload: { name, kind: FILE_KIND } },
        });
      }
      const receipt = this.resources.execute({
        commandId: `${commandId}:version`,
        actor: "agent",
        command: {
          type: "resource.update",
          resourceId: document.sourceResourceId,
          payload: {
            kind: "new_version",
            versionId,
            relativePath,
            source: "generate",
            dependencies,
            baseVersionId: baseVersionId ?? null,
            disposition: "adopted",
          },
        },
      }) as { committed?: boolean };
      if (!receipt.committed) throw new Error("REVISION_CONFLICT");
    } catch (error) {
      if (error instanceof ProjectKernelError && error.code === "PROJECT_COMMAND_ID_REUSED") throw new Error("COMMAND_ID_REUSED");
      if (error instanceof Error && (error.message === "REVISION_CONFLICT" || error.message === "COMMAND_ID_REUSED")) throw error;
      removeFile(workspace, relativePath);
      throw new Error(baseVersionId ? "REVISION_CONFLICT" : "SOURCE_PROVISION_FAILED");
    }
    return snapshot(codec, { ...envelope, schemaVersion: 1 }, document.content, versionId);
  }

  private async dependencies(codec: EditorCodec, content: unknown): Promise<{ resourceId: string; versionId: string; role: string }[]> {
    const refs = codec.references(content);
    if (!refs.length) return [];
    const versions = this.resources.getResources(refs) as ResourceRead[];
    if (versions.some((item) => !item.ok)) throw new Error("DEPENDENCY_NOT_FOUND");
    return refs.map((ref) => ({ ...ref, role: "reference" }));
  }
}

function workspaceDir(): string {
  return realpathSync(process.env.WORKSPACE_DIR ?? "");
}

function publish(workspace: string, relativePath: string, bytes: Buffer): void {
  const absolute = path.join(workspace, relativePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  try {
    writeFileSync(absolute, bytes, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    if (!readFileSync(absolute).equals(bytes)) throw new Error("COMMAND_ID_REUSED");
  }
}

function removeFile(workspace: string, relativePath: string): void {
  try {
    unlinkSync(path.join(workspace, relativePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

function parseEnvelope(value: unknown): Envelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_SOURCE");
  const raw = value as Record<string, unknown>;
  const allowed = ["schemaVersion", "capabilityId", "sourceResourceId", "compositionId", "draftRevision", "scene", "project"];
  if (Object.keys(raw).some((key) => !allowed.includes(key))) throw new Error("INVALID_SOURCE");
  if (raw.schemaVersion !== 1 || (raw.capabilityId !== DIRECTOR_ID && raw.capabilityId !== CLIP_ID)) throw new Error("INVALID_SOURCE");
  if (typeof raw.sourceResourceId !== "string" || typeof raw.compositionId !== "string") throw new Error("INVALID_SOURCE");
  if (typeof raw.draftRevision !== "number" || !Number.isSafeInteger(raw.draftRevision) || raw.draftRevision < 0) throw new Error("INVALID_SOURCE");
  return raw as Envelope;
}

function snapshot(codec: EditorCodec, envelope: { sourceResourceId: string; compositionId: string; draftRevision: number; schemaVersion?: number }, content: unknown, versionId: string): EditorSnapshot {
  const base = { schemaVersion: 1 as const, sourceResourceId: envelope.sourceResourceId, compositionId: envelope.compositionId, draftRevision: envelope.draftRevision, versionId };
  if (codec.capabilityId === DIRECTOR_ID) return { ...base, capabilityId: DIRECTOR_ID, scene: parseEditorScene(content) };
  return { ...base, capabilityId: CLIP_ID, project: parseClipProject(content) };
}
