import { Controller, Get, Headers, Inject, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import { pipeline } from "node:stream/promises";

import { SitePreviewService } from "./site-preview.service.js";

@Controller("api/v3/sites")
export class SitePreviewController {
  constructor(@Inject(SitePreviewService) private readonly sites: SitePreviewService) {}

  @Get(":versionId/manifest")
  manifest(@Param("versionId") versionId: string) {
    return this.sites.manifest(versionId);
  }

  @Get(":versionId/files{/*path}")
  async file(
    @Param("versionId") versionId: string,
    @Param("path") path: string | string[],
    @Headers("accept") accept: string | undefined,
    @Res() response: Response,
  ) {
    const requested = Array.isArray(path) ? path.join("/") : path ?? "";
    const trailing = response.req.path.endsWith("/") && requested ? "/" : "";
    const file = await this.sites.file(versionId, `${requested}${trailing}`, (accept ?? "").includes("text/html"));
    response.status(200).set({
      "Content-Type": file.contentType,
      "Content-Length": String(file.size),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=31536000, immutable",
    });
    await pipeline(file.stream, response).catch(() => {
      if (!response.headersSent) response.status(500).end();
      else response.destroy();
    });
  }
}
