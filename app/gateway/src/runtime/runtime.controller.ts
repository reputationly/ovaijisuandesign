import { Body, Controller, HttpCode, Post } from "@nestjs/common";
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
  constructor(private readonly conn: RuntimeConnection) {}

  @Post("opencode-url")
  @HttpCode(200)
  setOpencodeUrl(@Body() body: OpencodeUrlDto) {
    this.conn.set(body);
    return { ok: true, url: this.conn.endpoint?.url };
  }
}
