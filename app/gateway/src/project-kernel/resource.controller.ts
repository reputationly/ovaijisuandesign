import { ArgumentsHost, Body, Catch, Controller, ExceptionFilter, Header, HttpCode, Logger, Post, UseFilters } from "@nestjs/common";

import { COMPOSITION_HTTP_MESSAGE, COMPOSITION_HTTP_STATUS, ProjectKernelError, ProjectQueryError } from "./errors.js";
import { ProjectResourceService } from "./resource.service.js";

const RESOURCE_MESSAGE: Record<string, string> = {
  ...COMPOSITION_HTTP_MESSAGE,
  PROJECT_RESOURCE_ALREADY_EXISTS: "Resource ID already exists",
  PROJECT_RESOURCE_NOT_FOUND: "Resource not found",
  PROJECT_VERSION_NOT_FOUND: "Version not found",
  PROJECT_VERSION_RESOURCE_MISMATCH: "Version does not belong to this resource",
  PROJECT_CURRENT_VERSION_DELETE_FORBIDDEN: "Current version cannot be deleted while it is in use",
  PROJECT_INVALID_LIFECYCLE: "Resource lifecycle does not allow this operation",
};

@Catch()
class ProjectResourceHttpFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProjectResourceHttpFilter.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>();
    const code = error instanceof ProjectKernelError || error instanceof ProjectQueryError ? error.code : undefined;
    const status = code ? COMPOSITION_HTTP_STATUS[code] : undefined;
    const message = code ? RESOURCE_MESSAGE[code] : undefined;
    if (!code || status === undefined || !message) {
      this.logger.error(`Resource HTTP failure: ${error instanceof Error ? error.name : "unknown"} (${code ?? "unmapped"})`);
      response.status(500).json({ code: "PROJECT_INTERNAL_ERROR", message: "Project store failed" });
      return;
    }
    response.status(status).json({ code, message });
  }
}

@Controller()
@UseFilters(ProjectResourceHttpFilter)
export class ProjectResourceController {
  constructor(private readonly resources: ProjectResourceService) {}

  @Post("api/project/resources/get")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  getResources(@Body() body: unknown) {
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => key !== "selectors")) throw new ProjectKernelError("PROJECT_INVALID_QUERY");
    return this.resources.getResources((body as { selectors: unknown }).selectors);
  }

  @Post("api/project/resources/search")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  search(@Body() body: unknown) {
    return this.resources.search(body);
  }

  @Post("api/project/resources/versions/list")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  listVersions(@Body() body: unknown) {
    return this.resources.listVersions(body);
  }

  @Post("api/project/resources/commands")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  execute(@Body() body: unknown) {
    return this.resources.execute(body);
  }

  @Post("api/project/resources/commands/batch")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  executeBatch(@Body() body: unknown) {
    return this.resources.executeBatch(body);
  }

  @Post("api/project/resources/tags/get")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  getResourceTags(@Body() body: unknown) {
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length) throw new ProjectKernelError("PROJECT_INVALID_QUERY");
    return this.resources.getResourceTags();
  }

  @Post("api/project/resources/tags/commands")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  executeResourceTags(@Body() body: unknown) {
    return this.resources.executeResourceTags(body);
  }
}
