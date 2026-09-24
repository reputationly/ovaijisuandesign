/**
 * 一个工作区的一套进程：workspace gateway + opencode。
 *
 * 顺序：gateway 先起（opencode 的插件和 MCP server 都要回连它）→ opencode 起来并
 * 健康 → 把 opencode 地址推给 gateway。opencode 崩溃重启后端口会变，所以每次
 * 回到 ready 都再推一次；推不过去只记日志，不拖垮整套。
 */
import path from "node:path";

import { GatewayManager, type RunningGateway } from "./gateway/gateway-manager.js";
import { OpenCodeRuntime, type Platform, prepareLaunch, type ResourceRoots, type Status } from "./opencode/index.js";

export interface BundleOptions {
  roots: ResourceRoots;
  version: string;
  workspaceDir: string;
  platform: Platform;
  hubRoot: string;
  runtimeDir: string;
  configPath: string;
  /** 跑 gateway 和 MCP server 的可执行文件（Electron 里是 process.execPath）。 */
  nodeExec: string;
  log?: (line: string) => void;
}

export class WorkspaceBundle {
  readonly gateway: GatewayManager;
  readonly opencode: OpenCodeRuntime;
  private readonly log: (line: string) => void;

  constructor(private readonly o: BundleOptions) {
    this.log = o.log ?? ((l) => console.log(l));
    const entry = o.roots.resources
      ? path.join(o.roots.resources, "gateway/dist/main.js")
      : path.join(o.roots.repoRoot!, "app/gateway/dist/main.js");
    this.gateway = new GatewayManager(
      {
        entry,
        role: "workspace",
        workspaceDir: o.workspaceDir,
        exec: o.nodeExec,
        env: { OV_CONFIG_PATH: o.configPath },
      },
      this.log,
    );
    this.opencode = new OpenCodeRuntime(this.log);
    this.opencode.on("status", (s: Status) => {
      if (s.state === "ready") void this.pushOpencodeUrl();
    });
  }

  async start(): Promise<RunningGateway> {
    const gw = await this.gateway.start();
    try {
      const spec = prepareLaunch({
        roots: this.o.roots,
        version: this.o.version,
        workspace: this.o.workspaceDir,
        platform: this.o.platform,
        gatewayUrl: gw.url,
        hubRoot: this.o.hubRoot,
        runtimeDir: this.o.runtimeDir,
        skillsDir: path.join(this.o.hubRoot, "skills"),
        nodeExec: this.o.nodeExec,
      });
      await this.opencode.start(spec);
    } catch (err) {
      // 画布、资产、生成都不依赖 agent：opencode 起不来只是聊天用不了，
      // 原因记在 status 里给界面显示，gateway 照常提供服务。
      this.log(`opencode 没有启动：${err instanceof Error ? err.message : String(err)}`);
      if (this.opencode.status.state !== "failed") this.opencode.fail(String(err));
    }
    return gw;
  }

  private async pushOpencodeUrl(): Promise<void> {
    const gw = this.gateway.running;
    const ep = this.opencode.endpoint;
    if (!gw || !ep) return;
    try {
      const r = await fetch(`${gw.url}/api/runtime/opencode-url`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: ep.url, username: ep.username, password: ep.password }),
      });
      if (!r.ok) this.log(`推送 opencode 地址失败：${r.status}`);
    } catch (err) {
      this.log(`推送 opencode 地址失败：${String(err)}`);
    }
  }

  /** 先停 opencode 再停 gateway：反过来的话 opencode 的插件会对着一个已经没了的 gateway 报一串错。 */
  async stop(): Promise<void> {
    await this.opencode.stop();
    await this.gateway.stop();
  }

  stopSync(): void {
    this.opencode.stopSync();
    this.gateway.stopSync();
  }
}
