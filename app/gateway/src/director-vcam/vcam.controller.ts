import { BadRequestException, Body, Controller, ForbiddenException, Get, Header, HttpCode, Inject, Post, Req } from "@nestjs/common";
import type { Request } from "express";

import { DirectorVcamService } from "./vcam.service.js";

function localOrigin(origin: string | undefined): boolean {
  if (!origin || origin === "null" || origin === "file://" || origin === "app://.") return true;
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname);
  } catch {
    return false;
  }
}

@Controller("api/director-stage/vcam")
export class DirectorVcamController {
  constructor(@Inject(DirectorVcamService) private readonly vcam: DirectorVcamService) {}

  @Post("start")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  start(@Req() req: Request, @Body() body: unknown) {
    this.authorize(req);
    if (body != null && (typeof body !== "object" || Array.isArray(body))) throw new BadRequestException("Expected JSON object");
    const ip = (body as { lanIp?: unknown } | null)?.lanIp;
    if (ip !== undefined && typeof ip !== "string") throw new BadRequestException("lanIp must be a local IPv4 address");
    return this.vcam.start(ip).catch((error: unknown) => {
      if (error instanceof Error && error.message === "NO_LAN") throw new BadRequestException("No matching LAN IPv4 address; connect to Wi-Fi or select a local network interface");
      throw error;
    });
  }

  @Get("status")
  @Header("Cache-Control", "no-store")
  status(@Req() req: Request) {
    this.authorize(req);
    return this.vcam.status();
  }

  @Post("stop")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  stop(@Req() req: Request) {
    this.authorize(req);
    return this.vcam.stop();
  }

  private authorize(req: Request): void {
    const ip = req.socket.remoteAddress;
    if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(ip ?? "") || !localOrigin(req.headers.origin)) throw new ForbiddenException("VCam management is local-only");
  }
}
