import { Injectable } from "@nestjs/common";
import os from "node:os";
import path from "node:path";

import { identityFromEnv } from "../common/workspace-identity.js";

export type GatewayRole = "workspace" | "app-level" | "dev";

/**
 * gateway 的运行参数，全部来自环境变量（由 Electron 主进程设置）。
 * 集中在这里读，别处注入它 —— 散落各处的 `process.env.X` 改一个名字就会漏。
 */
@Injectable()
export class GatewayConfig {
  readonly port = Number(process.env.PORT ?? 8001);
  readonly host = process.env.HILO_GATEWAY_HOST ?? "127.0.0.1";
  readonly role: GatewayRole = parseRole(process.env.HILO_GATEWAY_ROLE);
  readonly nonce = process.env.GATEWAY_NONCE;
  /** 工作区根目录。workspace 角色必须有；dev 下退回当前目录。 */
  readonly workspaceDir = path.resolve(process.env.WORKSPACE_DIR ?? process.cwd());
  readonly outputDir = path.resolve(process.env.OUTPUT_DIR ?? this.workspaceDir);
  readonly opencodeUrl = process.env.OPENCODE_URL ?? "http://127.0.0.1:4096";
  readonly opencodeUsername = process.env.OPENCODE_SERVER_USERNAME;
  readonly opencodePassword = process.env.OPENCODE_SERVER_PASSWORD;
  readonly ffmpegPath = process.env.FFMPEG_PATH;
  readonly ffprobePath = process.env.FFPROBE_PATH;
  /** 平台 / 模型配置文件（config.json）。主进程管理这份文件，gateway 只读。 */
  readonly mediaConfigPath = process.env.OV_CONFIG_PATH;
  /** 主进程的 HTTP bridge（移到废纸篓等只有主进程能做的事）。 */
  readonly mainBridgeUrl = process.env.HILO_MAIN_BRIDGE_URL;
  readonly mainBridgeToken = process.env.HILO_MAIN_BRIDGE_TOKEN;
  /**
   * 应用级数据根（克隆音色等跨工作区的东西放这里），和主进程的 `hubRoot` 同一套规则。
   * 不能落在工作区里：同一个音色在别的工作区也要能用。
   */
  readonly hubDir = path.resolve(process.env.HILO_DATA_DIR?.trim() || path.join(os.homedir(), ".ovhub"));
  /** 主进程发的工作区身份；独立启动时没有，校验整个不生效。 */
  readonly workspaceIdentity = identityFromEnv(process.env);
}

function parseRole(v: string | undefined): GatewayRole {
  return v === "workspace" || v === "app-level" ? v : "dev";
}
