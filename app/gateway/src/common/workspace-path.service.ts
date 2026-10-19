import path from "node:path";

import { Injectable } from "@nestjs/common";
import { relativize, safeResolve } from "@ov/assets";

import { GatewayConfig } from "../config/gateway-config.js";

/** 工作区路径：根目录、`.hilo/`、相对路径的安全解析。 */
@Injectable()
export class WorkspacePathService {
  constructor(private readonly cfg: GatewayConfig) {}

  get root(): string {
    return this.cfg.workspaceDir;
  }

  /** 进程启动时就绑死了一个工作区。没设 WORKSPACE_DIR 的 app-level / dev 不算。 */
  get isWorkspaceLocked(): boolean {
    return Boolean(process.env.WORKSPACE_DIR?.trim());
  }

  get hiloDir(): string {
    return path.join(this.root, ".hilo");
  }

  hilo(...parts: string[]): string {
    return path.join(this.hiloDir, ...parts);
  }

  /** 相对路径 → 绝对路径；逃出工作区返回 null。 */
  resolve(rel: string): string | null {
    return safeResolve(this.root, rel);
  }

  relativize(abs: string): string | null {
    return relativize(this.root, abs);
  }
}
