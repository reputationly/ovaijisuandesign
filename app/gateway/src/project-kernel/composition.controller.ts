import { ArgumentsHost, Body, Catch, Controller, ExceptionFilter, Header, HttpCode, Logger, Post, UseFilters } from "@nestjs/common";

import { COMPOSITION_HTTP_MESSAGE, COMPOSITION_HTTP_STATUS, ProjectKernelError, ProjectQueryError } from "./errors.js";
import { ProjectCompositionService } from "./composition.service.js";

@Catch()
class ProjectCompositionHttpFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProjectCompositionHttpFilter.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>();
    const code = error instanceof ProjectKernelError || error instanceof ProjectQueryError ? error.code : undefined;
    const status = code ? COMPOSITION_HTTP_STATUS[code] : undefined;
    const message = code ? COMPOSITION_HTTP_MESSAGE[code] : undefined;
    if (!code || status === undefined || !message) {
      this.logger.error(`Composition HTTP failure: ${error instanceof Error ? error.name : "unknown"} (${code ?? "unmapped"})`);
      response.status(500).json({ code: "PROJECT_INTERNAL_ERROR", message: "Project store failed" });
      return;
    }
    response.status(status).json({ code, message });
  }
}

@Controller()
@UseFilters(ProjectCompositionHttpFilter)
export class ProjectCompositionController {
  constructor(private readonly kernel: ProjectCompositionService) {}

  @Post("api/project/compositions/get")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  getComposition(@Body() body: unknown) {
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => key !== "compositionId")) throw new ProjectKernelError("PROJECT_INVALID_QUERY");
    return this.kernel.get((body as { compositionId: string }).compositionId);
  }

  @Post("api/project/compositions/list")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  list(@Body() body: unknown) {
    return this.kernel.list(body);
  }

  @Post("api/project/compositions/list-all")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  listAll(@Body() body: unknown) {
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["type", "lifecycle", "order"].includes(key))) {
      throw new ProjectKernelError("PROJECT_INVALID_QUERY");
    }
    return this.kernel.list(body);
  }

  @Post("api/project/compositions/search")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  search(@Body() body: unknown) {
    return this.kernel.search(body);
  }

  @Post("api/project/compositions/list-by-resource")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  listByResource(@Body() body: unknown) {
    return this.kernel.listByResource(body);
  }

  @Post("api/project/compositions/types/list")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  listTypes(@Body() body: unknown) {
    return this.kernel.listTypes(body);
  }

  @Post("api/project/compositions/commands")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  execute(@Body() body: unknown) {
    return this.kernel.execute(body);
  }
}
