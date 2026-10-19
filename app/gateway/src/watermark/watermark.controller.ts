import { Body, Controller, HttpCode, Post } from "@nestjs/common";

import { WatermarkService } from "./watermark.service.js";

@Controller()
export class WatermarkController {
  constructor(private readonly service: WatermarkService) {}

  @Post("api/watermark/config")
  @HttpCode(200)
  setConfig(@Body() body: { enabled?: unknown }) {
    const enabled = body?.enabled === undefined ? true : Boolean(body.enabled);
    this.service.setEnabled(enabled);
    return { ok: true, enabled };
  }
}
