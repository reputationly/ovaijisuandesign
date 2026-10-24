import { BadRequestException, Body, Controller, ForbiddenException, HttpCode, Injectable, Logger, Module, Post, Req } from "@nestjs/common";
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class HeartbeatDto {
  @IsString() @IsNotEmpty() appVersion!: string;
  @IsString() @IsNotEmpty() os!: string;
  @IsString() @IsNotEmpty() arch!: string;
  @IsString() @MaxLength(64) macAddress!: string;
  @IsString() @IsNotEmpty() releaseChannel!: string;
  @IsString() @IsNotEmpty() releaseRegion!: string;
  @IsString() @IsIn(["active", "suspended", "locked"]) powerState!: string;
  @IsString() @IsIn(["online", "offline"]) onlineStatus!: string;
  @IsNumber() timestamp!: number;
}

export interface HeartbeatCommand {
  type: string;
  [k: string]: unknown;
}

const MAX_PENDING_COMMANDS = 10;

const LOG_LEVELS = ["error", "warn", "info", "debug"] as const;
const DEFAULT_LOG_LEVEL_TTL_SEC = 86_400;
const MIN_LOG_LEVEL_TTL_SEC = 60;
const MAX_LOG_LEVEL_TTL_SEC = 259_200;

export class RequestLogLevelDto {
  @IsString() @IsIn(LOG_LEVELS as unknown as string[]) level!: string;
  @IsOptional() @IsInt() @Min(MIN_LOG_LEVEL_TTL_SEC) @Max(MAX_LOG_LEVEL_TTL_SEC) ttl?: number;
}

function isLoopback(address: string | undefined): boolean {
  return /^(127\.|::1$|::ffff:127\.)/.test(address ?? "");
}

/**
 * 主进程的心跳：每次心跳顺带取走排队给主进程的指令（比如"上传日志"）。心跳本身只记一条调试日志，
 * 不往外发任何东西；机器标识在日志里打码。
 */
@Injectable()
export class HeartbeatService {
  private readonly log = new Logger("Heartbeat");
  private pending: HeartbeatCommand[] = [];

  receive(payload: HeartbeatDto): HeartbeatCommand[] {
    this.log.debug(
      `[heartbeat] os=${payload.os} arch=${payload.arch} mac=${maskMacHash(payload.macAddress)} power=${payload.powerState} online=${payload.onlineStatus} v=${payload.appVersion}`,
    );
    return this.pending.splice(0);
  }

  /** 给其他模块用：排一条指令，下次心跳带回去。队列满了丢最老的，免得主进程长时间不来时无限堆积。 */
  enqueueCommand(command: HeartbeatCommand): void {
    if (this.pending.length >= MAX_PENDING_COMMANDS) {
      const dropped = this.pending.shift();
      this.log.warn(`[heartbeat] Pending commands at capacity (${MAX_PENDING_COMMANDS}), dropped oldest: ${dropped?.type}`);
    }
    this.pending.push(command);
  }
}

function maskMacHash(mac: string): string {
  const normalized = mac?.trim() ?? "";
  if (!normalized) return "";
  if (normalized.length <= 6) return "***";
  return `${normalized.slice(0, 4)}****${normalized.slice(-4)}`;
}

@Controller("api/heartbeat")
export class HeartbeatController {
  constructor(private readonly heartbeat: HeartbeatService) {}

  /** 没有指令时不带 `commands` 字段。 */
  @Post()
  @HttpCode(200)
  receive(@Body() body: HeartbeatDto) {
    const commands = this.heartbeat.receive(body);
    return commands.length > 0 ? { status: "ok", commands } : { status: "ok" };
  }
}

/**
 * 只给本机用的运维入口：请求主进程在下次心跳时临时切换日志级别。
 *
 * 不收集、不上传任何日志；非本机来源一律 403。指令走现有的心跳队列。
 */
@Controller("api/logs")
export class LogUploadController {
  constructor(private readonly heartbeat: HeartbeatService) {}

  @Post("request-level")
  @HttpCode(200)
  requestLevel(@Req() req: { socket?: { remoteAddress?: string }; ip?: string }, @Body() body: RequestLogLevelDto) {
    if (!isLoopback(req.socket?.remoteAddress ?? req.ip)) {
      throw new ForbiddenException("Only loopback requests are allowed");
    }
    if (!LOG_LEVELS.includes(body.level as (typeof LOG_LEVELS)[number])) {
      throw new BadRequestException("invalid_level");
    }
    const ttl = body.ttl ?? DEFAULT_LOG_LEVEL_TTL_SEC;
    if (!Number.isInteger(ttl) || ttl < MIN_LOG_LEVEL_TTL_SEC || ttl > MAX_LOG_LEVEL_TTL_SEC) {
      throw new BadRequestException("invalid_ttl");
    }
    this.heartbeat.enqueueCommand({ type: "set_log_level", args: { level: body.level, ttl } });
    return { ok: true, message: "Log level request queued, will execute on next heartbeat" };
  }
}

@Module({ controllers: [HeartbeatController, LogUploadController], providers: [HeartbeatService], exports: [HeartbeatService] })
export class HeartbeatModule {}
