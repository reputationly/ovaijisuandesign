import { readFileSync } from "node:fs";

import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { parseMediaConfig } from "@ov/maas-media";

import { GatewayConfig } from "../config/gateway-config.js";
import { IsOptional, IsString, IsUrl } from "class-validator";

import { RuntimeConnection } from "./runtime-connection.js";

class OpencodeUrlDto {
  @IsUrl({ require_tld: false, protocols: ["http", "https"] })
  url!: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;
}

@Controller("api/runtime")
export class RuntimeController {
  constructor(
    private readonly conn: RuntimeConnection,
    private readonly cfg: GatewayConfig,
  ) {}

  /**
   * 对话模型目录（输入框的模型选择器）。只有一个 provider：配置里的自建平台。
   * id 形如 `user-custom-maas/<模型>`，和 opencode 配置里的 provider id 一致。
   */
  @Get("models")
  models() {
    let chat = "";
    try {
      if (this.cfg.mediaConfigPath) chat = parseMediaConfig(JSON.parse(readFileSync(this.cfg.mediaConfigPath, "utf8"))).platform.chat_model.trim();
    } catch {
      chat = "";
    }
    const models = chat ? [{ id: `user-custom-maas/${chat}`, providerID: "user-custom-maas", modelID: chat, name: chat }] : [];
    return { models, default: models[0]?.id ?? null };
  }

  @Post("opencode-url")
  @HttpCode(200)
  setOpencodeUrl(@Body() body: OpencodeUrlDto) {
    this.conn.set(body);
    return { ok: true, url: this.conn.endpoint?.url };
  }
}
