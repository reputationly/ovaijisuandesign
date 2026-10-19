import { Body, Controller, Get, HttpCode, Inject, Post, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";

import { CapabilityExecutionService } from "../generate/execute-task.js";
import { EditorCapabilityService, editorResponse } from "./editor.service.js";
import { EditorHostService } from "./host.js";

@Controller("api/v3/editors")
export class EditorController {
  constructor(
    @Inject(EditorCapabilityService) private readonly editors: EditorCapabilityService,
    @Inject(EditorHostService) private readonly host: EditorHostService,
  ) {}

  @Get("capabilities")
  list() {
    return editorResponse(() => this.editors.list());
  }

  @Post("capabilities")
  @HttpCode(200)
  contracts(@Body() body: unknown) {
    return editorResponse(() => this.editors.contracts(body));
  }

  @Post("video")
  @HttpCode(200)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 32 * 1024 * 1024, files: 1, fields: 1, fieldSize: 64 * 1024 } }))
  video(@Body("request") request: unknown, @UploadedFile() file?: { buffer: Buffer; mimetype: string }) {
    return editorResponse(() => {
      if (typeof request !== "string" || request.length > 64 * 1024) throw new Error("INVALID_VIDEO_REQUEST");
      return this.host.video(JSON.parse(request), file);
    });
  }

  @Post("host")
  @HttpCode(200)
  open(@Body() body: unknown) {
    return editorResponse(() => this.host.host(body));
  }
}

@Controller("api/v3/execute")
export class ExecuteController {
  constructor(
    @Inject(EditorHostService) private readonly host: EditorHostService,
    @Inject(CapabilityExecutionService) private readonly tasks: CapabilityExecutionService,
  ) {}

  @Post()
  execute(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const capabilityId = body && typeof body === "object" && !Array.isArray(body) ? (body as { capabilityId?: unknown }).capabilityId : undefined;
    if (typeof capabilityId === "string" && capabilityId.startsWith("plugin:")) {
      response.status(200);
      return editorResponse(() => this.host.execute(body));
    }
    return this.tasks.execute(body, response);
  }
}
