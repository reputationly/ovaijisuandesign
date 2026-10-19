import { Controller, Get, Header, Res } from "@nestjs/common";
import type { Response } from "express";

import { HUB_SDK_SOURCE } from "./hub-sdk.js";

@Controller()
export class PluginSdkController {
  @Get("__hub-sdk__.js")
  @Header("Cache-Control", "no-cache")
  serve(@Res() response: Response) {
    response.type("application/javascript; charset=utf-8").send(HUB_SDK_SOURCE);
  }
}
