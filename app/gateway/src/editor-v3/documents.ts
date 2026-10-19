import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Inject, Injectable } from "@nestjs/common";
import { fileTypeFromBuffer } from "file-type";

import { CanvasV3Service } from "../canvas-v3/canvas-v3.controller.js";
import { projectId } from "../project-kernel/composition.service.js";
import { ProjectResourceService } from "../project-kernel/resource.service.js";
import { hashCanonical } from "./codecs.js";
import { CLIP_ID, DIRECTOR_ID, editorCodecForNode, EDITOR_CODECS, type EditorSnapshot } from "./codecs.js";
import { EditorSourceFiles } from "./source-files.js";

@Injectable()
export class EditorDocumentService {
  constructor(
    @Inject(EditorSourceFiles) private readonly sources: EditorSourceFiles,
    @Inject(CanvasV3Service) readonly canvas: CanvasV3Service,
    @Inject(ProjectResourceService) private readonly resources: ProjectResourceService,
  ) {}

  async read(target: { sourceResourceId?: string; compositionId?: string; nodeId?: string; canvasId?: string }, fixedVersionId?: string): Promise<EditorSnapshot> {
    if (target.canvasId && target.canvasId !== "workspace") throw new Error("TARGET_CHANGED");
    if (!target.sourceResourceId) throw new Error("TARGET_NOT_FOUND");
    const source = await this.sources.read(target.sourceResourceId, fixedVersionId);
    if (target.compositionId && target.compositionId !== source.compositionId) throw new Error("TARGET_CHANGED");
    if (target.nodeId) {
      const node = this.canvas.getDocument().nodes[target.nodeId];
      const codec = EDITOR_CODECS[source.capabilityId];
      if (node?.kind !== codec.nodeKind || node.sourceResourceId !== source.sourceResourceId) throw new Error("TARGET_CHANGED");
    }
    return source;
  }

  async readDirector(target: { sourceResourceId?: string; compositionId?: string; nodeId?: string; canvasId?: string }, fixedVersionId?: string): Promise<Extract<EditorSnapshot, { capabilityId: typeof DIRECTOR_ID }>> {
    const source = await this.read(target, fixedVersionId);
    if (source.capabilityId !== DIRECTOR_ID) throw new Error("TARGET_CHANGED");
    return source;
  }

  async readClip(target: { sourceResourceId?: string; nodeId?: string }, fixedVersionId?: string): Promise<Extract<EditorSnapshot, { capabilityId: typeof CLIP_ID }>> {
    const source = await this.read(target, fixedVersionId);
    if (source.capabilityId !== CLIP_ID) throw new Error("TARGET_CHANGED");
    return source;
  }

  /** 画布上的新节点还没有源。用节点编号做种子，重试仍绑定同一份源。 */
  async provision(nodeId: string, capabilityId?: string): Promise<EditorSnapshot> {
    const node = this.canvas.getDocument().nodes[nodeId];
    const codec = node ? editorCodecForNode(node.kind) : undefined;
    if (!node || !codec || (capabilityId && codec.capabilityId !== capabilityId)) throw new Error("TARGET_NOT_FOUND");
    if (typeof node.sourceResourceId === "string" && node.sourceResourceId) return this.read({ sourceResourceId: node.sourceResourceId, nodeId });
    const seed = `editor_provision_${hashCanonical(nodeId).slice(0, 32)}`;
    const title = typeof node.title === "string" ? node.title : "";
    const source = await this.sources.provision(seed, codec, title);
    const placed = await this.place(seed, source, codec, { nodeId, name: title });
    if (placed.placement !== "placed") throw new Error("SOURCE_BIND_PENDING");
    return source;
  }

  async create(commandId: string, capabilityId: keyof typeof EDITOR_CODECS, name: string, sourceNodeIds: string[] = []): Promise<EditorSnapshot & { canvasId: "workspace"; nodeId: string; placement: "placed" | "pending" }> {
    const codec = EDITOR_CODECS[capabilityId];
    const canvas = this.canvas.getDocument();
    for (const sourceNodeId of sourceNodeIds) {
      const kind = canvas.nodes[sourceNodeId]?.kind;
      if (!kind || editorCodecForNode(kind)) throw new Error("SOURCE_NOT_FOUND");
    }
    const source = await this.sources.provision(commandId, codec, name);
    return { ...source, ...(await this.place(commandId, source, codec, { name, sourceNodeIds })) };
  }

  async place(commandId: string, source: EditorSnapshot, codec: NonNullable<ReturnType<typeof editorCodecForNode>>, options: { nodeId?: string; name?: string; sourceNodeIds?: string[] }): Promise<{ canvasId: "workspace"; nodeId: string; placement: "placed" | "pending" }> {
    const canvas = this.canvas.getDocument();
    const existing = Object.values(canvas.nodes).find((node) => node.kind === codec.nodeKind && node.sourceResourceId === source.sourceResourceId);
    if (existing) return { canvasId: "workspace", nodeId: existing.id, placement: "placed" };
    const before = options.nodeId ? canvas.nodes[options.nodeId] : undefined;
    if (options.nodeId && (before?.kind !== codec.nodeKind || before.sourceResourceId)) throw new Error("TARGET_CHANGED");
    const id = options.nodeId ?? `${codec.nodeKind === "clip-studio" ? "clip" : "director"}_${hashCanonical(commandId).slice(0, 24)}`;
    const sources = options.sourceNodeIds ?? [];
    const size = codec.nodeKind === "clip-studio" ? { width: 720, height: 180 } : { width: 480, height: 320 };
    const after = before
      ? { ...before, sourceResourceId: source.sourceResourceId }
      : {
          id,
          kind: codec.nodeKind,
          title: options.name ?? codec.defaultName,
          sourceResourceId: source.sourceResourceId,
          position: { x: 100, y: 100 },
          size,
          parentId: null,
          zIndex: 0,
          hidden: false,
        };
    try {
      await this.canvas.execute({
        commandId: `${commandId}:place:${canvas.revision}`,
        expectedRevision: canvas.revision,
        command: {
          type: "canvas.patch",
          nodes: [{ id, before: before ?? null, after }],
          edges: before ? [] : sources.map((sourceId, index) => {
            const edgeId = `${id}_in_${index}`;
            return { id: edgeId, before: null, after: { id: edgeId, source: sourceId, target: id } };
          }),
        },
      });
      return { canvasId: "workspace", nodeId: id, placement: "placed" };
    } catch (error) {
      if (error instanceof Error && error.message === "TARGET_CHANGED") throw error;
      return { canvasId: "workspace", nodeId: id, placement: "pending" };
    }
  }

  async save(commandId: string, target: { sourceResourceId?: string; compositionId?: string; nodeId?: string; canvasId?: string }, revision: number, baseVersionId: string, content: unknown): Promise<EditorSnapshot> {
    const current = await this.read(target);
    if (current.draftRevision !== revision || current.versionId !== baseVersionId) throw new Error("REVISION_CONFLICT");
    return this.sources.save(commandId, current, content);
  }

  async recoverSave(commandId: string, target: { sourceResourceId?: string }, revision: number, content: unknown): Promise<EditorSnapshot | undefined> {
    if (!target.sourceResourceId) throw new Error("TARGET_NOT_FOUND");
    return this.sources.recoverSave(commandId, target.sourceResourceId, revision, content);
  }

  async persistSnapshot(commandId: string, target: { sourceResourceId?: string }, cameraId: string, sourceVersionId: string, image: string): Promise<CaptureAsset> {
    const encoded = /^data:image\/(?:jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image)?.[1];
    if (!encoded) throw new Error("INVALID_SNAPSHOT");
    const source = await this.readDirector(target, sourceVersionId);
    const cameras = source.scene.cameras;
    const camera = Array.isArray(cameras) ? cameras.find((entry) => entry && typeof entry === "object" && (entry as { id?: unknown }).id === cameraId) as { id?: string; label?: unknown } | undefined : undefined;
    if (!camera) throw new Error("CAMERA_NOT_FOUND");
    const [entry] = this.resources.getResources([{ resourceId: source.sourceResourceId }]) as { ok?: boolean; detail?: { resource: { name: string } } }[];
    const sourceName = entry?.ok ? entry.detail?.resource.name ?? "Director" : "Director";
    const label = typeof camera.label === "string" && camera.label.trim() ? camera.label : cameraId;
    return this.persistCapture(commandId, source, `${sourceName} · ${label}`, "image", Buffer.from(encoded, "base64"), "snapshot");
  }

  async persistVideo(commandId: string, target: { sourceResourceId?: string }, sourceVersionId: string, name: string, bytes: Buffer): Promise<CaptureAsset> {
    const source = await this.readDirector(target, sourceVersionId);
    return this.persistCapture(commandId, source, name, "video", bytes, "video");
  }

  private async persistCapture(commandId: string, source: EditorSnapshot, name: string, kind: "image" | "video", bytes: Buffer, capture: "snapshot" | "video"): Promise<CaptureAsset> {
    const detected = await fileTypeFromBuffer(bytes);
    if (!detected?.mime.startsWith(`${kind}/`)) throw new Error("CAPTURE_PERSIST_FAILED");
    const resourceId = projectId("resource", [commandId, capture]);
    const versionId = projectId("version", [commandId, capture]);
    const relativePath = `store/${versionId}.${detected.ext}`;
    const absolute = path.join(realpathSync(process.env.WORKSPACE_DIR ?? ""), relativePath);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, bytes, { flag: "wx", mode: 0o600 });
    this.resources.execute({
      commandId: `${commandId}:${capture}:resource`,
      actor: "agent",
      command: { type: "resource.create", resourceId, payload: { name, kind: kind === "image" ? 2 : 3 } },
    });
    const receipt = this.resources.execute({
      commandId: `${commandId}:${capture}:version`,
      actor: "agent",
      command: {
        type: "resource.update",
        resourceId,
        payload: {
          kind: "new_version",
          versionId,
          relativePath,
          source: "generate",
          dependencies: [{ resourceId: source.sourceResourceId, versionId: source.versionId, role: "reference" }],
          baseVersionId: null,
          disposition: "adopted",
        },
      },
    }) as { committed?: boolean };
    if (!receipt.committed) throw new Error("CAPTURE_PERSIST_FAILED");
    const memberId = projectId("member", [source.compositionId, resourceId]);
    await this.sources.addMember(`${commandId}:${capture}:member`, source.compositionId, { memberId, role: `director-${capture}`, resource: resourceId });
    return { resourceId, versionId, compositionId: source.compositionId, memberId, name };
  }
}

export type CaptureAsset = { resourceId: string; versionId: string; compositionId: string; memberId: string; name: string };
