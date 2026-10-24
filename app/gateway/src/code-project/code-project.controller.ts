import { Body, Controller, Get, HttpCode, HttpException, Post, Query } from "@nestjs/common";

import { CodeProjectError } from "./common.js";
import { CodeProjectService } from "./code-project.service.js";
import { CodePublishService } from "./code-publish.service.js";

async function handle<T>(fn: () => Promise<T> | T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof CodeProjectError) {
      throw new HttpException({ code: error.code, message: error.message, retryable: error.retryable }, error.status);
    }
    throw error;
  }
}

@Controller("api/v3/code-projects")
export class CodeProjectController {
  constructor(
    private readonly projects: CodeProjectService,
    private readonly publisher: CodePublishService,
  ) {}

  @Post("open")
  @HttpCode(200)
  open(@Body() body: { inputs?: unknown }) {
    return handle(() => {
      const inputs = body?.inputs;
      if (
        inputs !== undefined &&
        (!Array.isArray(inputs) ||
          inputs.some((item) => !item || typeof (item as { versionId?: unknown }).versionId !== "string" || !(item as { versionId: string }).versionId.trim()))
      ) {
        throw new CodeProjectError("INVALID_ARGUMENT", "inputs must be [{versionId}]");
      }
      return this.projects.open(this.projects.sessionId(), {
        inputs: (inputs as { versionId: string }[] | undefined)?.map((item) => ({ versionId: item.versionId.trim() })),
      });
    });
  }

  @Post("status")
  @HttpCode(200)
  status() {
    return handle(() => this.projects.status(this.projects.sessionId()));
  }

  @Post("checkpoint")
  @HttpCode(200)
  checkpoint(@Body() body: { message?: unknown }) {
    return handle(() => {
      if (typeof body?.message !== "string") throw new CodeProjectError("INVALID_ARGUMENT", "message is required");
      return this.projects.checkpoint(this.projects.sessionId(), body.message);
    });
  }

  @Post("publish")
  @HttpCode(200)
  publish(@Body() body: unknown) {
    return handle(() => this.publisher.publish(this.projects.sessionId(), body));
  }

  @Get("binding")
  binding(@Query("sessionId") sessionId?: string) {
    return handle(async () => {
      if (!sessionId?.trim()) throw new CodeProjectError("INVALID_ARGUMENT", "sessionId required");
      return { binding: await this.projects.binding(sessionId.trim()) };
    });
  }
}
