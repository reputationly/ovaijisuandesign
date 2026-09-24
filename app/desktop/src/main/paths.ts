import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

import { app } from "electron";

import type { ResourceRoots } from "./opencode/index.js";
import { resolveRoots, type Roots } from "./roots.js";

export { APP_DIR_NAME, isForeignAppPath, resolveRoots, type Roots } from "./roots.js";

/** 资源根：发布包里是 resourcesPath，开发时是仓库根（app/desktop 往上两级）。 */
export function resourceRoots(): ResourceRoots {
  return app.isPackaged ? { resources: process.resourcesPath } : { repoRoot: path.resolve(app.getAppPath(), "../..") };
}

export interface DataDirs extends Roots {
  userData: string;
  /** opencode 的状态隔离目录。 */
  runtimeDir: string;
  /** 平台 / 模型配置。 */
  configPath: string;
  /** 全局存储 `hub-config.json`。 */
  globalStorePath: string;
  /** 项目事务日志目录。 */
  journalDir: string;
}

/**
 * 数据目录。**根目录名不能和同机的另一个同类应用共用**，否则两边互相覆写
 * profile、skills、记忆和项目列表。
 */
export function dataDirs(): DataDirs {
  const userData = app.getPath("userData");
  const roots = resolveRoots({ env: process.env, home: homedir(), userData });
  return {
    ...roots,
    userData,
    runtimeDir: path.join(userData, "ai-runtime"),
    // 开发时可以用 OV_CONFIG_PATH 指到别处（比如旧版的配置文件）。
    configPath: process.env.OV_CONFIG_PATH ?? path.join(userData, "config.json"),
    globalStorePath: path.join(userData, "hub-config.json"),
    journalDir: path.join(userData, "project-sync-journal"),
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
