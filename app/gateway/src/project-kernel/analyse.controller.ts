import { Body, Controller, HttpCode, HttpException, Inject, Post } from "@nestjs/common";

import { EditService } from "../edit/edit.service.js";
import { ProjectCompositionService } from "./composition.service.js";
import { ProjectKernelError, ProjectQueryError } from "./errors.js";
import { ProjectResourceService } from "./resource.service.js";
import { WorkspaceProjectArchitectureService } from "../canvas-v3/workspace-project-architecture.service.js";

import path from "node:path";

/**
 * `design_analyse_media` 的服务端实现。
 *
 * 工具 schema 只接受项目 Resource 的 `references`（`resourceId` / `versionId`），
 * 但真正的分析要一个**文件路径** —— 之前 MCP 直接把参数打到
 * `/api/project/resources/analyse`（这条路由根本不存在，真机上是 404/参数错误）。
 *
 * 这里做的是"身份 → 路径 → 分析"：按 versionId（或 resourceId 的当前版本）查出
 * `relativePath`，拼成工作区绝对路径，再交给既有的 `EditService.analyzeMedia`
 * （它就是 `/api/edit/analyze-media` 的实现，走平台的对话模型看帧/图）。
 */
@Controller("api/v3")
export class ProjectAnalyseController {
  constructor(
    @Inject(WorkspaceProjectArchitectureService) private readonly architecture: WorkspaceProjectArchitectureService,
    @Inject(ProjectResourceService) private readonly resources: ProjectResourceService,
    @Inject(ProjectCompositionService) private readonly compositions: ProjectCompositionService,
    @Inject(EditService) private readonly edit: EditService,
  ) {}

  @Post("analyse")
  @HttpCode(200)
  async analyse(@Body() body: unknown) {
    try {
      this.architecture.assertV3();
      const workspace = process.env.WORKSPACE_DIR;
      if (!workspace) throw new ProjectKernelError("PROJECT_V3_DISABLED");
      const request = parseAnalyseBody(body);
      const relative = this.relativePath(request);
      const question = request.references[0]?.question ?? request.question ?? "描述这段媒体的内容。";
      const result = await this.edit.analyzeMedia({ file_path: path.join(workspace, relative), question });
      // 返回形状必须和工具声明的 outputSchema 一致：{ type, results: [{ reference, semantic|error }] }。
      const ok = (result as { ok?: boolean; text?: string; error?: string }).ok !== false;
      const entry = {
        reference: request.references[0],
        ...(request.references[0]?.question ? { question: request.references[0].question } : {}),
        ...(ok
          ? { semantic: { text: String((result as { text?: string }).text ?? "") } }
          : { error: { message: String((result as { error?: string }).error ?? "analyse failed") } }),
      };
      return { type: request.type, results: [entry] };
    } catch (error) {
      if (error instanceof ProjectKernelError && error.code === "PROJECT_V3_DISABLED") {
        const code = error.code;
        throw new HttpException({ error: { code, message: "Project v3 is not enabled", retryable: false } }, 403);
      }
      if (error instanceof ProjectQueryError) {
        throw new HttpException({ error: { code: error.code, message: error.message, retryable: false } }, error.status);
      }
      throw error;
    }
  }

  private relativePath(request: { references: { resourceId?: string; versionId?: string }[] }): string {
    const first = request.references[0];
    if (!first) throw new ProjectQueryError("INVALID_ARGUMENT", "references is required", 400);
    if (first.versionId) return this.resources.relativePathOfVersion(first.versionId);
    if (first.resourceId) {
      const read = this.resources.queryResource({ resourceId: first.resourceId }) as { ok?: boolean; detail?: { version?: { versionId?: string } | null } };
      const versionId = read.detail?.version?.versionId;
      if (!read.ok || !versionId) throw new ProjectQueryError("NOT_FOUND", "Resource has no readable version", 404);
      return this.resources.relativePathOfVersion(versionId);
    }
    throw new ProjectQueryError("INVALID_ARGUMENT", "Each reference needs resourceId or versionId", 400);
  }
}

export function parseAnalyseBody(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProjectQueryError("INVALID_ARGUMENT", "Body must be an object", 400);
  const record = value as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type : "semantic";
  const references = record.references;
  if (!Array.isArray(references) || references.length === 0) throw new ProjectQueryError("INVALID_ARGUMENT", "references is required", 400);
  const mapped = references.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new ProjectQueryError("INVALID_ARGUMENT", "reference must be an object", 400);
    const ref = item as Record<string, unknown>;
    const question = typeof ref.question === "string" && ref.question.trim() ? ref.question : undefined;
    if (typeof ref.versionId === "string" && ref.versionId) return { versionId: ref.versionId, question };
    if (typeof ref.resourceId === "string" && ref.resourceId) return { resourceId: ref.resourceId, question };
    throw new ProjectQueryError("INVALID_ARGUMENT", "Each reference needs resourceId or versionId", 400);
  });
  return { type, references: mapped, question: typeof record.question === "string" ? record.question : undefined };
}
