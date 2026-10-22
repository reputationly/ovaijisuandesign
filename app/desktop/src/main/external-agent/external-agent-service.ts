/**
 * 外部 Agent 的进程管理（4.0.3 新增）。
 *
 * 参照 `startExternalAgentService` / `IExternalAgentService`：
 * 应用启动时按设置拉起 `mcp-tools/dist/external-main.js`，`will-quit` 时停掉。
 *
 * **为什么不复用 GatewayManager**：那个类是为 gateway 设计的 —— 要占定端口、
 * 轮询 `/health`、还要求 role/workspaceDir。外部 Agent 三项都不适用：
 * 端口固定（设置里那个）、没有 `/health`、可以随设置随时开关。
 * 硬套会带来三个无用抽象，所以这里只写需要的那点。
 *
 * 失败处理原则：**spawn 失败只记日志，绝不抛到主进程**（外部 Agent 挂了不该拖垮应用）。
 */
import { spawn, type ChildProcess } from "node:child_process";

import {
  EXTERNAL_AGENT_DEFAULT_PORT,
  EXTERNAL_AGENT_MCP_PATH,
} from "@ov/protocol";

export interface ExternalAgentSettings {
  enabled: boolean;
  port: number;
  allowedProjectPaths: string[];
}

export interface ExternalAgentStatus {
  running: boolean;
  port: number;
  url: string | null;
}

export interface ExternalAgentServiceOptions {
  /** node 可执行文件（主进程用 nodeExecutable() 的结果）。 */
  exec: string;
  /** external-main.js 的绝对路径（见 resolveExternalAgentEntryPath）。 */
  entry: string;
  /** 读当前设置。每次 start 都重新读，改了设置只要重启即可生效。 */
  readSettings: () => ExternalAgentSettings;
  /** 被管理的 gateway 地址（子进程用 GATEWAY_URL 连它）。 */
  gatewayUrl: () => string | undefined;
  log?: (line: string) => void;
}

export const EXTERNAL_AGENT_STOP_TIMEOUT_MS = 3_000;

export class ExternalAgentService {
  private child: ChildProcess | null = null;
  private currentPort = EXTERNAL_AGENT_DEFAULT_PORT;
  private stopping = false;

  constructor(private readonly opts: ExternalAgentServiceOptions) {}

  private log(line: string): void {
    (this.opts.log ?? ((l: string) => console.log(l)))(line);
  }

  status(): ExternalAgentStatus {
    const running = this.child !== null && this.child.exitCode === null;
    return {
      running,
      port: this.currentPort,
      url: running ? `http://127.0.0.1:${this.currentPort}${EXTERNAL_AGENT_MCP_PATH}` : null,
    };
  }

  /** 按设置启动。已启用且已在跑则不动；未启用则先停。 */
  async start(): Promise<ExternalAgentStatus> {
    let settings: ExternalAgentSettings;
    try {
      settings = this.opts.readSettings();
    } catch (err) {
      this.log(`[external-agent] 读设置失败，跳过启动: ${err instanceof Error ? err.message : String(err)}`);
      return this.status();
    }
    this.currentPort = settings.port || EXTERNAL_AGENT_DEFAULT_PORT;

    if (!settings.enabled) {
      await this.stop();
      return this.status();
    }
    if (this.child) return this.status();

    const gateway = this.opts.gatewayUrl();
    if (!gateway) {
      // gateway 还没起来时不启动：外部 Agent 的每一轮都要打回 gateway，没地址没意义
      this.log("[external-agent] gateway 尚未就绪，暂不启动");
      return this.status();
    }

    try {
      const child = spawn(this.opts.exec, [this.opts.entry], {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          GATEWAY_URL: gateway,
          EXTERNAL_AGENT_PORT: String(this.currentPort),
          EXTERNAL_AGENT_HOST: "127.0.0.1",
          EXTERNAL_AGENT_ALLOWED_PATHS: settings.allowedProjectPaths.join("\n"),
        },
      });
      child.stdout?.on("data", (b: Buffer) => this.log(`[external-agent] ${b.toString().trimEnd()}`));
      child.stderr?.on("data", (b: Buffer) => this.log(`[external-agent] ${b.toString().trimEnd()}`));
      child.on("exit", (code, signal) => {
        if (!this.stopping) {
          this.log(`[external-agent] 进程退出 code=${code ?? "null"} signal=${signal ?? "null"}`);
        }
        if (this.child === child) this.child = null;
      });
      child.on("error", (err) => {
        this.log(`[external-agent] 进程错误: ${err.message}`);
        if (this.child === child) this.child = null;
      });
      this.child = child;
      this.stopping = false;
      this.log(`[external-agent] 已启动 port=${this.currentPort}`);
    } catch (err) {
      this.log(`[external-agent] 启动失败: ${err instanceof Error ? err.message : String(err)}`);
    }
    return this.status();
  }

  /** 停掉。SIGTERM 优先，超时再 SIGKILL（不阻塞主进程退出）。 */
  async stop(): Promise<void> {
    const child = this.child;
    if (!child) return;
    this.stopping = true;
    this.child = null;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {
          // 已经退出了
        }
        resolve();
      }, EXTERNAL_AGENT_STOP_TIMEOUT_MS);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
      try {
        child.kill("SIGTERM");
      } catch {
        clearTimeout(timer);
        resolve();
      }
    });
    this.log("[external-agent] 已停止");
  }

  /** 设置变更后调用：先停再起。 */
  async restart(): Promise<ExternalAgentStatus> {
    await this.stop();
    return this.start();
  }
}
