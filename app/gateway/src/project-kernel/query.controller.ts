import { Body, Controller, Headers, HttpCode, HttpException, Inject, Param, Post } from "@nestjs/common";

import { ProjectQueryError } from "./errors.js";
import { ProjectQueryService } from "./query.service.js";

@Controller("api/v3")
export class ProjectQueryController {
  constructor(@Inject(ProjectQueryService) private readonly queries: ProjectQueryService) {}

  @Post("query/:operation")
  @HttpCode(200)
  async query(@Param("operation") operation: string, @Body() body: unknown) {
    try {
      return await this.queries.query(operation, body);
    } catch (error) {
      if (error instanceof ProjectQueryError) {
        throw new HttpException({ error: { code: error.code, message: error.message, retryable: error.status === 503 || error.status === 429 } }, error.status);
      }
      throw error;
    }
  }

  @Post("composition/commands")
  @HttpCode(200)
  async composition(@Body() body: unknown, @Headers("x-tool-use-id") toolUseId?: string) {
    try {
      return await this.queries.writeComposition(body, toolUseId);
    } catch (error) {
      if (error instanceof ProjectQueryError) {
        throw new HttpException({ error: { code: error.code, message: error.message, retryable: error.status === 503 || error.status === 429 } }, error.status);
      }
      throw error;
    }
  }
}
