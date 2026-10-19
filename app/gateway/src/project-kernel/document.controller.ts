import { Body, Controller, HttpCode, HttpException, Inject, Post } from "@nestjs/common";

import { ProjectDocumentService } from "./document.service.js";
import { ProjectKernelError, ProjectQueryError } from "./errors.js";

@Controller("api/v3")
export class ProjectDocumentController {
  constructor(@Inject(ProjectDocumentService) private readonly documents: ProjectDocumentService) {}

  @Post("document")
  @HttpCode(200)
  write(@Body() body: unknown) {
    try {
      return this.documents.write(body);
    } catch (error) {
      if (error instanceof ProjectKernelError && error.code === "PROJECT_COMMAND_ID_REUSED") {
        throw new HttpException({ error: { code: error.code, message: "This requestId was already used for a different document write. Use a new requestId for a new edit or changed arguments; only reuse an ID when retrying the exact original request.", retryable: false } }, 409);
      }
      if (error instanceof ProjectKernelError && error.code === "PROJECT_V3_DISABLED") {
        throw new HttpException({ error: { code: error.code, message: "Project v3 is not enabled", retryable: false } }, 403);
      }
      if (error instanceof ProjectQueryError) {
        throw new HttpException({
          error: {
            code: error.code,
            message: error.message,
            retryable: error.status === 503 || error.status === 429,
            ...(error.details ? { conflict: error.details } : {}),
          },
        }, error.status);
      }
      throw error;
    }
  }
}
