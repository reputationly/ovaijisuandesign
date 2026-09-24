import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

import { app } from "electron";

import type { ResourceRoots } from "./opencode/index.js";

/** 资源根：发布包里是 resourcesPath，开发时是仓库根（app/desktop 往上两级）。 */
export function resourceRoots(): ResourceRoots {
  return app.isPackaged ? { resources: process.resourcesPath } : { repoRoot: path.resolve(app.getAppPath(), "../..") };
}

export interface DataDirs {
  userData: string;
  /** 应用数据根：profile 同步、用户级 skills / memory。可用 HILO_DATA_DIR 覆盖。 */
  hubRoot: string;
  /** opencode 的状态隔离目录。 */
  runtimeDir: string;
  /** 平台 / 模型配置。 */
  configPath: string;
}

/**
 * 数据目录。**根目录名不能和同机的另一个同类应用共用**，否则两边互相覆写
 * profile、skills 和记忆。
 */
export function dataDirs(): DataDirs {
  const userData = app.getPath("userData");
  const hubRoot = process.env.HILO_DATA_DIR ?? path.join(homedir(), ".ovhub");
  return {
    userData,
    hubRoot,
    runtimeDir: path.join(userData, "ai-runtime"),
    // 开发时可以用 OV_CONFIG_PATH 指到别处（比如旧版的配置文件）。
    configPath: process.env.OV_CONFIG_PATH ?? path.join(userData, "config.json"),
  };
}

/**
 * 跑 gateway / MCP server 的 Node。
 *
 * 发布包里是 Electron 自己（`ELECTRON_RUN_AS_NODE`），打包时原生模块按 Electron 的 ABI 重编。
 * **开发时用系统 Node**：pnpm 装出来的 better-sqlite3 是按系统 Node 编的，拿 Electron 去加载
 * 会因为 NODE_MODULE_VERSION 不一致直接抛错 —— 而且只在第一次碰资产库时才抛，gateway 照常启动，
 * 表现是"生成成功了却登记不进资产库"。可用 OV_NODE_EXEC 指定。
 */
export function nodeExecutable(): string {
  if (app.isPackaged) return process.execPath;
  return process.env.OV_NODE_EXEC ?? findOnPath(process.platform === "win32" ? "node.exe" : "node") ?? process.execPath;
}

function findOnPath(exe: string): string | undefined {
  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    const p = dir && path.join(dir, exe);
    if (p && existsSync(p)) return p;
  }
  return undefined;
}
