import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Header, Inject, InternalServerErrorException, Put } from "@nestjs/common";

import { WorkspacePathService } from "../common/workspace-path.service.js";
import { ProjectRulesConflictError, parseSaveProjectRulesRequest, readProjectRules, saveProjectRules } from "./project-rules.js";

@Controller()
export class ProjectRulesController {
  constructor(@Inject(WorkspacePathService) private readonly workspace: WorkspacePathService) {}

  /** v3 工作区才有这份文档；旧画布网关和没绑工作区的进程不能读写。 */
  private projectRoot(): string {
    if (process.env.HILO_PROJECT_ARCHITECTURE !== "resource_v3" || process.env.HILO_GATEWAY_ROLE !== "workspace" || !this.workspace.isWorkspaceLocked) {
      throw new ForbiddenException("Project rules require a bound V3 workspace.");
    }
    return this.workspace.root;
  }

  @Get("api/project-rules")
  @Header("Cache-Control", "no-store")
  async read() {
    const root = this.projectRoot();
    try {
      return await readProjectRules(root);
    } catch (error) {
      throw new InternalServerErrorException(`Cannot read project rules: ${errorMessage(error)}`);
    }
  }

  @Put("api/project-rules")
  @Header("Cache-Control", "no-store")
  async save(@Body() body: unknown) {
    const root = this.projectRoot();
    try {
      parseSaveProjectRulesRequest(body);
    } catch (error) {
      throw new BadRequestException(errorMessage(error));
    }
    try {
      return await saveProjectRules(root, body);
    } catch (error) {
      if (error instanceof ProjectRulesConflictError) throw new ConflictException(error.message);
      throw new InternalServerErrorException(`Cannot save project rules: ${errorMessage(error)}`);
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
