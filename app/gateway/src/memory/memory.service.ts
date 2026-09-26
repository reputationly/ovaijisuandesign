import path from "node:path";

import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";

import { GatewayEventBus } from "../common/gateway-event-bus.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { GatewayConfig } from "../config/gateway-config.js";
import {
  type MemoryDirs,
  MemoryError,
  type MemoryScope,
  type MemoryWriteInput,
  listRecentAutoFeedback,
  memoryDelete,
  memoryList,
  memoryRead,
  memorySearch,
  memoryWrite,
} from "./memory-store.js";

/**
 * 记忆的增删查（设置页的记忆管理、项目面板）。
 */
@Injectable()
export class MemoryService {
  private readonly log = new Logger("Memory");

  constructor(
    private readonly cfg: GatewayConfig,
    private readonly paths: WorkspacePathService,
    private readonly bus: GatewayEventBus,
  ) {}

  /** 用户级目录和 MCP、插件同一套规则：`$HUB_MEMORY_DIR`，没有就是数据根下的 memory。 */
  userDir(): string {
    return process.env.HUB_MEMORY_DIR || path.join(this.cfg.hubDir, "memory");
  }

  /**
   * 项目级目录取 gateway 的基准目录。app-level gateway 没有绑定工作区，基准目录是它的输出目录：
   * 设置页（连的就是 app-level）按 all 列表时，项目级那一半自然是空的，而不是整个请求 400。
   */
  private dirsFor(scope: MemoryScope | "all"): MemoryDirs {
    return { userDir: this.userDir(), ...(scope === "user" ? {} : { projectRoot: this.paths.root }) };
  }

  /** 最近自动提取的记忆；读失败回空列表（这只是个提示条，不该让设置页报错）。 */
  async recentAuto(sinceMs: number, limit?: number) {
    try {
      return (await listRecentAutoFeedback(this.dirsFor("all"), { scope: "all", sinceMs, ...(limit !== undefined ? { limit } : {}) })).entries;
    } catch (err) {
      this.log.warn(`recent-auto list failed: ${(err as Error).message}`);
      return [];
    }
  }

  async list(scope: MemoryScope | "all" = "all") {
    try {
      return (await memoryList(this.dirsFor(scope), scope)).entries;
    } catch (err) {
      throw this.translate(err);
    }
  }

  async search(q: string, scope: MemoryScope | "all" = "all", type?: string) {
    try {
      return (await memorySearch(this.dirsFor(scope), { query: q, scope, ...(type !== undefined ? { type } : {}) })).entries;
    } catch (err) {
      throw this.translate(err);
    }
  }

  async read(scope: MemoryScope, name: string) {
    try {
      return await memoryRead(this.dirsFor(scope), { scope, name });
    } catch (err) {
      throw this.translate(err);
    }
  }

  async write(input: MemoryWriteInput) {
    try {
      const result = await memoryWrite(this.dirsFor(input.scope), input);
      const autoExtracted = result.created && input.source === "auto";
      this.bus.emit("memory:changed", {
        type: "memory_changed",
        scope: input.scope,
        name: input.name,
        action: result.created ? "created" : "updated",
        ...(autoExtracted ? { auto_extracted: true } : {}),
      });
      return result;
    } catch (err) {
      throw this.translate(err);
    }
  }

  async delete(scope: MemoryScope, name: string) {
    try {
      const result = await memoryDelete(this.dirsFor(scope), { scope, name });
      if (result.deleted) this.bus.emit("memory:changed", { type: "memory_changed", scope, name, action: "deleted" });
      return result;
    } catch (err) {
      throw this.translate(err);
    }
  }

  /** 存储层的业务错误映射成 400 / 404；其他异常原样抛（500）。 */
  translate(err: unknown): unknown {
    if (err instanceof MemoryError) {
      if (/^memory not found:/.test(err.message)) return new NotFoundException(err.message);
      return new BadRequestException(err.message);
    }
    if (!(err instanceof BadRequestException)) this.log.error(`memory-store unexpected error: ${(err as Error)?.message ?? String(err)}`);
    return err;
  }
}
