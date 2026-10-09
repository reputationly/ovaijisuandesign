import type { INestApplication } from "@nestjs/common";
import type { Server } from "node:http";

/**
 * 收到信号后给自己留的收尾时间。
 *
 * **必须小于拉起我们那侧的宽限** —— 主进程是 SIGTERM → 等 5 秒 → SIGKILL
 * （`app/desktop/src/main/gateway/gateway-manager.ts` 的 `stop`）。留 1 秒余量，
 * 是为了让"没能在期限内收完"这件事由我们自己记进日志并以非零码退出，
 * 而不是变成一次没有遗言的 SIGKILL —— 后者在用户那里只表现为"偶尔关得慢"。
 */
export const SHUTDOWN_DEADLINE_MS = 4000;

export interface ShutdownDeps {
  app: Pick<INestApplication, "close">;
  server: Pick<Server, "closeAllConnections">;
  /** 退出手段。测试注进去，生产就是 `process.exit`。 */
  exit?: (code: number) => void;
  deadlineMs?: number;
  log?: (line: string) => void;
  logError?: (...args: unknown[]) => void;
}

/**
 * 建一个关停器，返回触发它的 `stop`。
 *
 * 和注册信号分开是为了可测：信号监听是**进程级**的，测试里注册 / 注销会动到
 * 跑测试那个进程的全局状态，也没法断言"收到信号后第几步做了什么"。这里把
 * 「怎么退出」做成注入的（`exit` / `log`），测试就只调 `stop("SIGTERM")`，
 * 完全不碰 `process` 和 `console`。
 */
export function createShutdown(deps: ShutdownDeps): (signal: string) => void {
  const exit = deps.exit ?? ((code: number) => process.exit(code));
  const deadlineMs = deps.deadlineMs ?? SHUTDOWN_DEADLINE_MS;
  const log = deps.log ?? ((line: string) => console.log(line));
  const logError = deps.logError ?? ((...args: unknown[]) => console.error(...args));
  let closing = false;

  return (signal: string) => {
    if (closing) return; // 连按两次 Ctrl-C 不该跑两遍收尾
    closing = true;
    const t0 = Date.now();
    // 兜底计时器：收尾卡住（比如某个 destroy 在等一个不会回来的 IO）时，
    // 由我们退出并把现状写进日志，而不是安静地等到被 SIGKILL。
    //
    // **故意不 unref**：unref 会让它不撑住事件循环，万一收尾挂住的那个句柄恰好
    // 又被放掉了，Node 会自己空转退出（码 0）—— 那正好伪装成「关得挺干净」。
    // 这里两条路径都会 clearTimeout 后显式退出，所以不存在残留计时器的问题。
    const deadline = setTimeout(() => {
      logError(`gateway 关停超时（${deadlineMs}ms，信号 ${signal}）：强制退出，收尾可能不完整`);
      exit(1);
    }, deadlineMs);

    // 掐掉还没结束的连接：进行中的下载 / 轮询会把 `close()` 一直吊着（见上面的实测）。
    deps.server.closeAllConnections();
    void deps.app
      .close()
      .then(() => {
        clearTimeout(deadline);
        log(`gateway 已关停（${signal}，${Date.now() - t0}ms）`);
        exit(0);
      })
      .catch((err: unknown) => {
        clearTimeout(deadline);
        logError(`gateway 关停失败（${signal}）：`, err);
        exit(1);
      });
  };
}

/**
 * 优雅关停。
 *
 * 不接信号的话 Node 会直接退进程：`onModuleDestroy` 一个都不跑，于是
 * 文件监视器、ffmpeg 子进程、SQLite 句柄全靠进程组被杀来收尾
 * （十个服务都写好了 destroy，一直没人调用）。资产库尤其难受 ——
 * 退出时正在写索引就会留下一个需要 `.recover()` 的库。
 *
 * 顺序不能反：**先掐连接，再 `app.close()`**。`close()` 内部是 `server.close()`，
 * 它等的是**活动请求**结束 —— 空闲连接 Node 19 起会自己关掉，所以渲染层那条
 * `/ws`（升级过的套接字）和空转的 keep-alive 都不挡路；挡路的是**请求发了一半
 * 卡在那儿**的那种。而 main.ts 把 `requestTimeout` 设成了 310 分钟，一条这样的
 * 连接就能把关停拖到桌面的宽限之外。实测过：半截 body 的 POST 会让不掐连接的版本
 * 拖满 3 秒、被 SIGKILL（`exit code null`），掐了的是 22ms 正常退出。
 */
export function installShutdownHandlers(deps: ShutdownDeps): void {
  const stop = createShutdown(deps);
  for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"] as const) process.on(sig, () => stop(sig));
}
