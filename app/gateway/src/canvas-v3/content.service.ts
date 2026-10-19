import { Injectable } from "@nestjs/common";

import { CANVAS_V3_LIMITS } from "./protocol.js";
import { ProjectKernelError } from "../project-kernel/errors.js";
import { ProjectCompositionService } from "../project-kernel/composition.service.js";
import { ProjectResourceService } from "../project-kernel/resource.service.js";

const KIND_NAMES: Record<number, string> = { 1: "text", 2: "image", 3: "video", 4: "audio", 5: "file" };

function resourceKind(kind: number, relativePath?: string): string {
  const name = KIND_NAMES[kind] ?? "file";
  return name === "text" && typeof relativePath === "string" && /\.htable$/i.test(relativePath) ? "table" : name;
}

function compositionTitle(name: string, compositionId: string): string {
  const suffix = ` · ${compositionId}`;
  return name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
}

function subtitleFormat(relativePath: string | undefined, name: string): string | undefined {
  const stored = relativePath?.split(/[/\\]/).pop() ?? "";
  const source = stored.includes(".") && !/\.bin$/i.test(stored) ? stored : name;
  const extension = /\.(srt|ass|vtt)$/i.exec(source)?.[1]?.toLowerCase();
  return extension === "srt" || extension === "ass" || extension === "vtt" ? extension : undefined;
}

@Injectable()
export class CanvasV3ContentService {
  constructor(
    private readonly compositions: ProjectCompositionService,
    private readonly resources: ProjectResourceService,
  ) {}

  async read(body: unknown) {
    const compositionIds = parseIds(body);
    const items = [];
    const cache = new Map<string, unknown>();
    for (const compositionId of compositionIds) {
      let content = cache.get(compositionId);
      if (!content) {
        content = await this.project(compositionId);
        cache.set(compositionId, content);
      }
      items.push(content);
    }
    return { items };
  }

  async agentCompositions(query: { since: number; limit: number }) {
    const page = this.compositions.listAgentPlacements({ ...query, includeChatUploads: true });
    const reads: unknown[] = [];
    for (let index = 0; index < page.items.length; index += 100) {
      const slice = page.items.slice(index, index + 100);
      reads.push(...this.resources.getResources(slice.map((item) => ({ resourceId: item.firstResourceId }))));
    }
    return {
      items: page.items.map((item, index) => {
        const read = reads[index] as { ok?: boolean; detail?: { resource: { kind: number }; version: { relativePath?: string } | null } } | undefined;
        const kind = read?.ok && read.detail ? resourceKind(read.detail.resource.kind, read.detail.version?.relativePath) : "file";
        return { seq: item.seq, compositionId: item.compositionId, kind };
      }),
      nextSeq: page.nextSeq,
      complete: page.complete,
    };
  }

  async project(compositionId: string) {
    let composition: Awaited<ReturnType<ProjectCompositionService["get"]>> | undefined;
    try {
      composition = await this.compositions.get(compositionId);
    } catch (error) {
      if (error instanceof ProjectKernelError && error.code === "PROJECT_COMPOSITION_NOT_FOUND") composition = undefined;
      else throw error;
    }
    if (!composition) return { compositionId, state: "missing" };
    if (composition.lifecycle !== "active") return { compositionId, state: "deleted" };
    const members = (composition.members as { memberId: string; role: string; resource: string | null }[]).map((member) => ({ memberId: member.memberId, role: member.role, resource: member.resource }));
    const resourceIds = members.flatMap((member) => (member.resource === null ? [] : [member.resource]));
    const resources = await this.readResources(resourceIds);
    const type = composition.type as { typeId?: string; label?: string } | null;
    return {
      compositionId,
      state: "ready",
      revision: composition.revision,
      title: compositionTitle(composition.name, compositionId),
      typeId: type?.typeId ?? null,
      typeLabel: type?.label ?? "",
      position: composition.position,
      createdAt: composition.createdAt,
      attributes: composition.attributes,
      members,
      taskOutputs: [],
      protected: false,
      resources,
    };
  }

  private async readResources(ids: string[]) {
    const result: Record<string, unknown> = {};
    const unique = [...new Set(ids)];
    const reads = unique.length ? await this.resources.getResources(unique.map((resourceId) => ({ resourceId }))) : [];
    for (let index = 0; index < unique.length; index++) {
      const resourceId = unique[index] ?? "";
      const read = reads[index] as { ok?: boolean; detail?: { resource: ResourceView; version: VersionView | null } };
      if (!read?.ok || !read.detail) {
        result[resourceId] = { resourceId, name: "", kind: "file", currentVersionId: null, availability: "missing", versions: [] };
        continue;
      }
      const { resource, version } = read.detail;
      const history = ((await this.resources.listVersions({ resourceId })) as { items: VersionView[] }).items.slice().reverse();
      const kind = resourceKind(resource.kind, version?.relativePath);
      const format = kind === "text" || kind === "file" ? subtitleFormat(version?.relativePath, resource.name) : undefined;
      const available = resource.lifecycle === "active" && version?.status === "ready";
      result[resourceId] = {
        resourceId,
        name: resource.name,
        kind,
        currentVersionId: resource.currentVersionId ?? null,
        availability: available ? "available" : "unavailable",
        versions: history.map((item, ordinal) => ({
          versionId: item.versionId,
          ordinal: ordinal + 1,
          ...(item.status === "deleted" ? { deleted: true } : {}),
          availability: resource.lifecycle === "active" && item.status === "ready" ? "available" : "unavailable",
        })),
        ...(format ? { subtitleFormat: format } : {}),
      };
    }
    return result;
  }
}

type ResourceView = { name: string; kind: number; lifecycle: string; currentVersionId?: string };
type VersionView = { versionId: string; relativePath?: string; status?: string };

function parseIds(body: unknown): string[] {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid Canvas V3: expected object");
  const raw = body as Record<string, unknown>;
  if (Object.keys(raw).some((key) => key !== "compositionIds") || !Array.isArray(raw.compositionIds)) throw new Error("Invalid Canvas V3: unknown or missing field");
  if (raw.compositionIds.length > CANVAS_V3_LIMITS.contentBatch) throw new Error("Invalid Canvas V3: invalid array");
  const ids = raw.compositionIds.map((id) => {
    if (typeof id !== "string" || !id.trim() || id.length > CANVAS_V3_LIMITS.idLength) throw new Error("Invalid Canvas V3: invalid id");
    return id;
  });
  if (new Set(ids).size !== ids.length) throw new Error("Invalid Canvas V3: duplicate composition id");
  return ids;
}
