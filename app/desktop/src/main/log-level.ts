import { Emitter, type Event } from "./ipc/events.js";

export type LogLevelName = "error" | "warn" | "info" | "debug";

const DEFAULT_TTL_SEC = 86_400;
const LEVELS: LogLevelName[] = ["error", "warn", "info", "debug"];

/**
 * 主进程日志级别：默认 info；远端只能通过本机 gateway 的心跳指令临时改，到期自动恢复。
 * 变化只写本地日志，不上报。
 */
export class LogLevelController {
  private level: LogLevelName = "info";
  private timer: NodeJS.Timeout | undefined;
  private readonly changed = new Emitter<LogLevelName>();
  readonly onDidChange: Event<LogLevelName> = this.changed.event;

  constructor(private readonly log: (line: string) => void = () => undefined) {}

  getLevel(): LogLevelName {
    return this.level;
  }

  setLevel(level: string, ttlSec = DEFAULT_TTL_SEC): boolean {
    if (!LEVELS.includes(level as LogLevelName)) return false;
    this.level = level as LogLevelName;
    this.log(`[log-level] override=${this.level} ttl=${ttlSec}s`);
    this.changed.fire(this.level);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.level = "info";
      this.log("[log-level] override expired, back to info");
      this.changed.fire(this.level);
    }, Math.max(1, ttlSec) * 1000);
    this.timer.unref?.();
    return true;
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
  }
}
