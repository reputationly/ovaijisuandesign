import { realpathSync } from "node:fs";

import { Body, Controller, Injectable, Logger, Module, Post } from "@nestjs/common";
import { Equals, IsInt, IsObject, IsString, Matches, Max, MaxLength, Min } from "class-validator";

import { WorkspacePathService } from "../common/workspace-path.service.js";
import { RuntimeConnection } from "../runtime/runtime-connection.js";

/** 用户自定义 MCP 的名字：不能冒充内置的 hub 工具，也不能是原型链上的键（opencode 按名字做对象键）。 */
export class CustomMcpApplyDto {
  @Matches(/^(?!hub(?:[_.]|$)|__proto__$|constructor$|prototype$)[a-zA-Z0-9_.-]{1,80}$/i) name!: string;
  @IsObject() config!: Record<string, unknown>;
  @IsString() @MaxLength(2048) expectedRuntimeUrl!: string;
  @IsInt() @Min(1) @Max(65000) timeoutMs!: number;
}

/** 授权只给内置登记过的第三方连接器用。 */
export class CustomMcpAuthenticateDto {
  @Equals("libtv") name!: string;
  @IsString() @MaxLength(2048) expectedRuntimeUrl!: string;
}

type ApplyResult = { status: "connected" | "disabled" | "failed" };

const trimSlash = (u: string) => u.replace(/\/+$/, "");

/**
 * 把设置页里用户加的 MCP 服务热加载进正在跑的 opencode（`POST /mcp` 装上，再 `GET /mcp` 确认状态），
 * 不用重启 opencode。主进程负责持久化配置，这里只负责"让当前运行时生效并核实"。
 *
 * 调用方带着它以为的 opencode 地址：地址对不上（opencode 刚重启换了端口）就直接失败，
 * 免得装到一个即将被替换的进程上还报成功。失败只回 `{status:"failed"}`，细节进日志（配置里可能有密钥）。
 */
@Injectable()
export class CustomMcpService {
  private readonly log = new Logger("CustomMcp");

  constructor(
    private readonly conn: RuntimeConnection,
    private readonly paths: WorkspacePathService,
  ) {}

  private directory(): string {
    try {
      return realpathSync.native(this.paths.root);
    } catch {
      return this.paths.root;
    }
  }

  async apply(req: CustomMcpApplyDto): Promise<ApplyResult> {
    const startedAt = Date.now();
    const ep = this.conn.endpoint;
    let stage = "runtime_identity";
    const failed = (detail: Record<string, unknown>): ApplyResult => {
      this.log.warn(`[custom-mcp] Apply failed ${JSON.stringify({ server: req.name, stage, elapsedMs: Date.now() - startedAt, ...detail })}`);
      return { status: "failed" };
    };
    if (!ep || trimSlash(ep.url) !== trimSlash(req.expectedRuntimeUrl)) return failed({ reason: "runtime_unavailable_or_changed" });
    const url = new URL("/mcp", ep.url);
    url.searchParams.set("directory", this.directory());
    const headers = { ...this.conn.headers(), "content-type": "application/json" };
    const configTimeout = typeof req.config.timeout === "number" ? req.config.timeout : 0;
    const signal = AbortSignal.timeout(Math.max(req.timeoutMs, Math.min(configTimeout, 3_600_000) + 5000));
    try {
      stage = "apply";
      const applied = await fetch(url, { method: "POST", headers, body: JSON.stringify({ name: req.name, config: req.config }), signal });
      if (!applied.ok) {
        await applied.body?.cancel();
        return failed({ reason: "http_error", httpStatus: applied.status });
      }
      await applied.arrayBuffer();
      stage = "verify";
      const res = await fetch(url, { headers, signal });
      if (!res.ok) {
        await res.body?.cancel();
        return failed({ reason: "http_error", httpStatus: res.status });
      }
      const raw = (await res.json()) as Record<string, unknown> | null;
      const entry = raw && typeof raw === "object" ? (raw[req.name] as Record<string, unknown> | undefined) : undefined;
      const status = entry && typeof entry === "object" ? entry.status : undefined;
      const expected = req.config.enabled === false ? "disabled" : "connected";
      if (this.conn.endpoint?.url !== ep.url) return failed({ reason: "runtime_changed" });
      if (status !== expected) return failed({ reason: "status_mismatch", expectedStatus: expected, actualStatus: typeof status === "string" ? status : "unknown" });
      this.log.log(`[custom-mcp] Apply verified ${JSON.stringify({ server: req.name, status, elapsedMs: Date.now() - startedAt })}`);
      return { status: expected };
    } catch (err) {
      return failed({ reason: "request_failed", error: (err as Error).name });
    }
  }
}

@Controller()
export class CustomMcpController {
  constructor(private readonly service: CustomMcpService) {}

  @Post("api/connectors/mcp")
  apply(@Body() body: CustomMcpApplyDto) {
    return this.service.apply(body);
  }

  /**
   * 第三方连接器的托管 OAuth（浏览器授权 → 回调换 token）依赖桌面端的授权窗口和连接器登记，这个版本没有接入：
   * 按"授权未完成"回 `{status:"failed"}`，主进程据此显示"需要授权"，不会卡住。
   */
  @Post("api/connectors/mcp/authenticate")
  authenticate(@Body() _body: CustomMcpAuthenticateDto): ApplyResult {
    return { status: "failed" };
  }
}

@Module({ controllers: [CustomMcpController], providers: [CustomMcpService] })
export class CustomMcpModule {}
