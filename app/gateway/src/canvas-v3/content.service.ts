import { Injectable } from "@nestjs/common";

import { CANVAS_V3_LIMITS, type CanvasV3ClipboardContent } from "./protocol.js";
import { canvasV3Error } from "./errors.js";
import { ProjectKernelError } from "../project-kernel/errors.js";
import { ProjectCompositionService, projectId } from "../project-kernel/composition.service.js";
import { ProjectResourceService } from "../project-kernel/resource.service.js";

const KIND_NAMES: Record<number, string> = { 1: "text", 2: "image", 3: "video", 4: "audio", 5: "file" };
/** 内容组合的类型名，和产品里已有的「图片/视频/音频/表格」保持一致。 */
const COMPOSITION_LABELS: Record<string, string> = { image: "图片", video: "视频", audio: "音频", text: "文本", table: "表格", file: "文件" };

/** 读一份资源版本的结果。字段都可选：读不到的时候要能落到"不可用"，而不是抛解析错误。 */
type ImportRead = {
  ok?: boolean;
  detail?: {
    resource?: { name?: string; kind?: number; lifecycle?: string };
    version?: { versionId?: string; relativePath?: string; status?: string } | null;
  };
};

function importUnavailable(): never {
  throw canvasV3Error(409, "CANVAS_V3_CONTENT_UNAVAILABLE", "Imported content is unavailable");
}

export interface CanvasV3PastedComposition {
  compositionId: string;
  /** 旧资源 id → 新的资源/版本（只在跨项目 `sources` 给到时才有）。 */
  remap: Map<string, { resourceId: string; versionId: string }>;
}

export interface CanvasV3ImportTarget {
  mediaKind: string;
  /** 成员角色。画布把非组合类节点的标题取成成员角色，所以这里放资源名。 */
  role: string;
  name: string;
}

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

  /**
   * 导入前先确认这份资源版本真的能用，顺便拿到它的呈现类别。
   * `.htable` 的文本资源在这里就是 `table` —— 画布靠这个决定开表格编辑器还是文本编辑器。
   */
  async importTarget(reference: { resourceId: string; versionId: string }): Promise<CanvasV3ImportTarget> {
    const read = this.resources.getResources([{ resourceId: reference.resourceId, versionId: reference.versionId }]) as ImportRead[];
    const entries: ImportRead[] = Array.isArray(read) ? read : [];
    const entry = entries[0];
    const resource = entry?.detail?.resource;
    const version = entry?.detail?.version;
    if (
      !entry?.ok ||
      !resource ||
      typeof resource.name !== "string" ||
      typeof resource.kind !== "number" ||
      !version ||
      version.versionId !== reference.versionId ||
      resource.lifecycle !== "active" ||
      version.status !== "ready"
    ) {
      throw importUnavailable();
    }
    const mediaKind = resourceKind(resource.kind, version.relativePath);
    return { mediaKind, name: resource.name, role: resource.name };
  }

  /**
   * 一份资源在画布上要有自己的组合：节点是组合节点，内容从组合投影出来。
   * 已经挂在某个组合上就直接复用，否则按 `commandId` 建一个（重放同一条命令拿到同一个组合）。
   */
  async contentComposition(commandId: string, resourceId: string, target: CanvasV3ImportTarget, mounted: ReadonlySet<string>): Promise<string> {
    const existing = this.mountedComposition(resourceId, mounted);
    if (existing) return existing;
    const receipt = (await this.compositions.ensureAgent(commandId, {
      label: COMPOSITION_LABELS[target.mediaKind] ?? COMPOSITION_LABELS.file ?? "画布内容",
      // 名字带上组合 id，既能显示成资源名，又不会和同名资源撞车。
      name: `${target.name} · ${projectId("composition", commandId)}`,
      operations: [{ type: "member.add", member: { memberId: projectId("member", commandId), role: target.role, resource: resourceId } }],
    })) as { compositionId?: string };
    if (typeof receipt.compositionId !== "string" || !receipt.compositionId) throw importUnavailable();
    return receipt.compositionId;
  }

  /**
   * 组合级命令的统一入口：读当前 revision → 执行 → 版本冲突就重读重试。
   * 这些命令**只改组合**、不改画布文档（节点的标题/成员都从组合投影出来）。
   */
  private async compose(compositionId: string, keyPrefix: string, build: (revision: number) => Record<string, unknown>): Promise<void> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const composition = await this.compositions.get(compositionId);
      if (composition.lifecycle !== "active") throw importUnavailable();
      const command = build(composition.revision);
      const receipt = this.compositions.execute({
        commandId: `${keyPrefix}:${composition.revision}`,
        actor: "human",
        expectedRevision: composition.revision,
        command,
      }) as { committed?: boolean };
      if (receipt.committed) return;
    }
    throw canvasV3Error(409, "CANVAS_V3_CONTENT_UNAVAILABLE", "Composition kept changing; retry the edit");
  }

  setCompositionType(compositionId: string, keyPrefix: string, compositionType: string | null): Promise<void> {
    return this.compose(compositionId, keyPrefix, () => ({ type: "composition.set_type", compositionId, compositionType }));
  }

  /** `composition.move` 是**不**带 expectedRevision 的命令（内核按位置自身做冲突处理）。 */
  moveComposition(compositionId: string, keyPrefix: string, target: { position?: number; placement?: { before: string } | { after: string } }): Promise<void> {
    const receipt = this.compositions.execute({
      commandId: keyPrefix,
      actor: "human",
      command: { type: "composition.move", compositionId, ...target },
    }) as { committed?: boolean };
    if (!receipt.committed) throw canvasV3Error(409, "CANVAS_V3_CONTENT_UNAVAILABLE", "Composition could not be moved");
    return Promise.resolve();
  }

  restoreComposition(compositionId: string, keyPrefix: string): Promise<void> {
    return this.compose(compositionId, keyPrefix, () => ({ type: "composition.set_lifecycle", compositionId, lifecycle: "active" }));
  }

  updateMember(compositionId: string, keyPrefix: string, memberId: string, changes: { role?: string; resource?: string | null }): Promise<void> {
    return this.compose(compositionId, keyPrefix, () => ({ type: "composition.apply", compositionId, operations: [{ type: "member.update", memberId, ...changes }] }));
  }

  moveMember(compositionId: string, keyPrefix: string, memberId: string, beforeMemberId: string | null): Promise<void> {
    return this.compose(compositionId, keyPrefix, () => ({ type: "composition.apply", compositionId, operations: [{ type: "member.move", memberId, beforeMemberId }] }));
  }

  removeMembers(compositionId: string, keyPrefix: string, memberIds: string[]): Promise<void> {
    return this.compose(compositionId, keyPrefix, (revision) => ({
      type: "composition.apply",
      compositionId,
      operations: memberIds.map((memberId, index) => ({ type: "member.remove", memberId, _seq: `${revision}:${index}` })).map(({ _seq, ...op }) => op),
    }));
  }

  /** 加入成员：每个 `{resourceId, versionId}` 变成一条成员，角色取资源名。 */
  async addMembers(compositionId: string, keyPrefix: string, items: { resourceId: string; versionId: string }[]): Promise<void> {
    const roles: string[] = [];
    for (const item of items) {
      const target = await this.importTarget(item);
      roles.push(target.name);
    }
    await this.compose(compositionId, keyPrefix, (revision) => ({
      type: "composition.apply",
      compositionId,
      operations: items.map((item, index) => ({
        type: "member.add",
        member: { memberId: projectId("member", `${keyPrefix}:${revision}:${index}`), role: roles[index] ?? "内容", resource: item.resourceId },
      })),
    }));
  }

  /**
   * 生成前要有一个空组合：节点先变成组合、进入"生成中"，产物由渲染层随后落进这个组合。
   * `commandId` 参与派生，重放同一条命令拿到同一个组合。
   */
  async generationComposition(commandId: string, kind: string): Promise<string> {
    const label = COMPOSITION_LABELS[kind] ?? COMPOSITION_LABELS.file ?? "画布内容";
    const compositionId = projectId("composition", commandId);
    const receipt = (await this.compositions.ensureAgent(commandId, {
      label,
      // 名字带上组合 id：显示时后缀会被 compositionTitle 剥掉，又不会和已有组合撞名。
      name: `${label} · ${compositionId}`,
    })) as { compositionId?: string };
    if (typeof receipt.compositionId !== "string" || !receipt.compositionId) throw importUnavailable();
    return receipt.compositionId;
  }

  /**
   * 粘贴出来的组合：内容照抄剪贴板快照，但组合本身是新的。
   * 成员指向同一批资源（粘贴不复制文件）；跨项目时按 `sources` 换成对端的资源/版本。
   */
  async pastedComposition(commandId: string, content: CanvasV3ClipboardContent, sources?: Record<string, { resourceId: string; versionId: string }>): Promise<CanvasV3PastedComposition> {
    // `sources` 的键是渲染层约定的 `资源id\n版本id`。同一份资源只可能命中一条。
    const remap = new Map<string, { resourceId: string; versionId: string }>();
    for (const item of content.items) {
      const source = sources?.[`${item.resourceId}\n${item.versionId}`];
      if (source) remap.set(item.resourceId, source);
    }
    const resourceOf = (resourceId: string) => remap.get(resourceId)?.resourceId ?? resourceId;
    const members = content.members?.length
      ? content.members.map((member) => ({ ...member, resource: member.resource === null ? null : resourceOf(member.resource) }))
      : content.items.length
        ? [{ memberId: projectId("member", commandId), role: content.items[0]?.name || content.title, resource: resourceOf(content.items[0]?.resourceId ?? "") }]
        : [];
    const compositionId = projectId("composition", commandId);
    const receipt = (await this.compositions.ensureAgent(commandId, {
      label: members.length > 1 ? "画布内容" : (COMPOSITION_LABELS[content.items[0]?.kind ?? "file"] ?? "画布内容"),
      name: `${content.title} · ${compositionId}`,
      ...(members.length
        ? { operations: members.map((member) => ({ type: "member.add", member: { memberId: member.memberId, role: member.role || content.title || "内容", resource: member.resource } })) }
        : {}),
    })) as { compositionId?: string };
    if (typeof receipt.compositionId !== "string" || !receipt.compositionId) throw importUnavailable();
    return { compositionId: receipt.compositionId, remap };
  }

  /** 已经建好、但画布上还没有节点用的单成员组合。重试时复用它，免得堆一堆组合。 */
  private mountedComposition(resourceId: string, mounted: ReadonlySet<string>): string | undefined {
    const page = this.compositions.queryMemberships({ resourceId, limit: 20 }) as { items?: { compositionId: string }[] };
    for (const item of page.items ?? []) {
      if (mounted.has(item.compositionId)) continue;
      const composition = this.compositions.get(item.compositionId);
      if (composition.lifecycle !== "active") continue;
      const members = composition.members as { resource: string | null }[];
      if (members.length === 1 && members[0]?.resource === resourceId) return item.compositionId;
    }
    return undefined;
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
