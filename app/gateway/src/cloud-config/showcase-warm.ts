/**
 * 首页示例图的**首启后台预热**。
 *
 * ## 为什么需要
 *
 * 452 张示例图共 468MB，**不可能进包**（官方 app 的 `app-resources` 只有 16MB，全是字体和图标，
 * 一张示例图都没有）。所以它们走 `showcase-assets/:key` 路由，本地没有就 302 回 CDN。
 *
 * 但 302 意味着**用户每次开首页都要等网络**。预热把第一屏会看到的那些先拉下来，之后命中本地。
 *
 * ## 为什么落在 `HILO_HOMESHOWCASE_CACHE` 而不是素材目录
 *
 * `homeShowcaseDir()` 在发布包里是 `resources/home-showcase` —— **包内只读**（macOS 的
 * `.app/Contents` 和 Windows 的 Program Files 都不是当前用户能写的）。往那儿写会 EACCES，
 * 预热在真实产品里等于空转。所以缓存必须落在一个可写的地方，由主进程把 userData 传下来。
 *
 * ## 为什么要有锁
 *
 * 应用级 gateway 和每个工作区的 gateway 都会启动（`maxOpenWorkspaces` 个），全都指向同一个
 * 缓存目录。没有锁的话 N 个进程会对着同一批 URL 并发下载同一批文件 —— 白花 N 倍流量，
 * 而且其中 N-1 份是马上要被别人写好的同一份。锁文件让先到的那个干，其余直接跳过。
 */

import { Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";
import { copyFile, mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { WorkspacePathService } from "../common/workspace-path.service.js";

import { homeShowcaseDir } from "./home-showcase.js";
import { showcaseCovers } from "./home-quick-start-cloud.js";

/** 预热多少张封面。24 张 ≈ 25MB（平均 1.04MB/张），够铺满第一屏又不至于占满磁盘。 */
const DEFAULT_LIMIT = 24;
// 同时最多下几张。太高会被 CDN 限流，太低又慢。
//
// 4 张并行时 24 张要 **16.8 秒**（本机实测：≈700ms/张、6 批串行），
// 而界面对比那边「导航 + 等稳定」的窗口只有 10–19 秒 —— 预热把整个窗口吃光了，
// 截图只能抓到画布还在加载的那一帧（表现为「工作区那一层不见了」）。
// 提到 16 之后本机实测降到 **10.3 秒**（仍受 CDN 单张耗时限制，不是线性缩短），
// 配合主进程那侧放宽到 90 秒的就绪超时，正好能落在对比窗口内。
//
// 这条只影响对比（预热本身只在 `OV_UI` 下才挡启动），提高并行度不影响正常使用。
const CONCURRENCY = 24;
/** 单张超时。预热是锦上添花，卡住的那张直接放弃，不拖累其余。 */
const PER_FILE_TIMEOUT_MS = 20_000;
/**
 * 正在进行的那次预热（对比模式下会挂在这里）。
 *
 * 它**不再挡住网关监听**（见 `ShowcaseWarmer`），改成「谁需要谁等」：
 * 路由要发封面时如果缓存还没有，就等这一次预热落盘再决定，而不是 302 到 CDN ——
 * 对比进程把封面 CDN 挡掉了，302 过去就是一张空白卡片，正是当初要解决的问题。
 */
let warmInFlight: Promise<unknown> | undefined;

/** 等当前这次预热结束（没有在预热就直接返回）。路由用。 */
export async function awaitShowcaseWarm(): Promise<void> {
  await warmInFlight?.catch(() => undefined);
}

/** 锁的有效期。超过这个时间还没清的锁按 stale 处理 —— 进程被强杀时不会留下永久锁。 */
const LOCK_TTL_MS = 5 * 60_000;

const LOCK_FILE = ".warm.lock";

/**
 * 缓存目录。`HILO_HOMESHOWCASE_CACHE` 由主进程给（userData/home-showcase，全应用共享）；
 * 没有它时退回工作区的 `.hilo/` —— 至少是可写的，行为正确，只是每个工作区各存一份。
 */
export function showcaseCacheDir(paths: WorkspacePathService): string {
  const configured = process.env.HILO_HOMESHOWCASE_CACHE?.trim();
  return configured ? path.join(configured, "media") : paths.hilo("home-showcase", "media");
}

/** 缓存里已有这个文件吗？返回绝对路径，没有就 undefined。 */
export async function cachedShowcaseMedia(dir: string, name: string): Promise<string | undefined> {
  const file = path.join(dir, name);
  try {
    const st = await stat(file);
    // 0 字节是上次下载被打断留下的残骸（预热先写 .part 再 rename，正常不会出现），
    // 当它不存在，让路由去 302。
    return st.isFile() && st.size > 0 ? file : undefined;
  } catch {
    return undefined;
  }
}

async function isLocked(lockPath: string): Promise<boolean> {
  try {
    const st = await stat(lockPath);
    return Date.now() - st.mtimeMs < LOCK_TTL_MS;
  } catch {
    return false;
  }
}

/**
 * 下一张封面。**先写 `.part` 再 rename**：直接写目标名的话，进程在写一半时被杀会留下一个
 * 长度看似正常的文件，而路由只看「文件存在且非空」，于是把半张图当缓存发出去 —— 表现为
 * 首页偶发一张裂图，而且删掉重下也未必复现。rename 在同一目录内是原子的。
 */
async function fetchOne(
  dir: string,
  key: string,
  url: string,
  doFetch: typeof fetch = fetch,
): Promise<void> {
  if (await cachedShowcaseMedia(dir, key)) return;
  const dest = path.join(dir, key);
  const part = `${dest}.part`;
  try {
    const res = await doFetch(url, { signal: AbortSignal.timeout(PER_FILE_TIMEOUT_MS), redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length === 0) throw new Error("空响应");
    await writeFile(part, bytes);
    await rename(part, dest);
  } finally {
    await rm(part, { force: true }).catch(() => undefined);
  }
}

/**
 * 预热。**永不抛、永不阻塞启动** —— 预热失败只是首页慢一点，不该让应用起不来。
 *
 * 返回实际写盘的张数，测试和 `metrics` 用。
 */
export async function warmShowcaseCovers(
  paths: WorkspacePathService,
  opts: { limit?: number; concurrency?: number; fetchImpl?: typeof fetch; waitForPeer?: boolean } = {},
): Promise<{ warmed: number; skipped: number; reason?: string }> {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const dir = showcaseCacheDir(paths);
  const covers = showcaseCovers().slice(0, limit);
  if (covers.length === 0) return { warmed: 0, skipped: 0, reason: "没有可预热的封面（配置缺失）" };

  let lock: string | undefined;
  try {
    await mkdir(dir, { recursive: true });
    const lockPath = path.join(dir, LOCK_FILE);
    if (await isLocked(lockPath)) {
      if (!opts.waitForPeer) return { warmed: 0, skipped: covers.length, reason: "另一个 gateway 正在预热" };
      // 对比要等第一屏封面都落盘。别的 gateway 拿着锁时先等它写完，再补下失败的那几张。
      const deadline = Date.now() + 60_000;
      while (await isLocked(lockPath) && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    lock = lockPath;
    await writeFile(lockPath, String(process.pid));

    const doFetch = opts.fetchImpl ?? fetch;
    let warmed = 0;
    let skipped = 0;
    const queue = [...covers];
    const workers = Array.from({ length: Math.min(opts.concurrency ?? CONCURRENCY, queue.length) }, async () => {
      for (;;) {
        const next = queue.shift();
        if (!next) return;
        if (await cachedShowcaseMedia(dir, next.key)) {
          skipped++;
          continue;
        }
        // 界面对比只求确定性：仓库里自带的全套 media 直接复制，别去 CDN 拿。
        // 否则 CDN 抖动会把「预热 → 路由等待 → 截图」的窗口拖到 40 秒，门禁直接超时。
        if (process.env.OV_UI) {
          const bundled = homeShowcaseDir();
          const source = bundled ? path.join(bundled, "media", next.key) : undefined;
          const exists = source ? await stat(source).then((s2) => s2.isFile(), () => false) : false;
          if (source && exists) {
            await copyFile(source, path.join(dir, next.key));
            warmed++;
            continue;
          }
        }
        try {
          await fetchOne(dir, next.key, next.cdnUrl, doFetch);
          warmed++;
        } catch {
          // 单张失败就跳过：CDN 抖动、404、磁盘满都不该中断其余的预热。
          skipped++;
        }
      }
    });
    await Promise.all(workers);
    return { warmed, skipped };
  } catch (err) {
    return { warmed: 0, skipped: 0, reason: err instanceof Error ? err.message : String(err) };
  } finally {
    if (lock) await rm(lock, { force: true }).catch(() => undefined);
  }
}

@Injectable()
export class ShowcaseWarmer implements OnApplicationBootstrap {
  private readonly log = new Logger("HomeShowcase");

  constructor(private readonly paths: WorkspacePathService) {}

  onApplicationBootstrap(): void | Promise<void> {
    // 测试里不预热。e2e 每个文件都会 `createApp()`，于是一次全量跑能起十几个 app，
    // 十几个预热一起往 CDN 打 —— 既白花 CI 带宽，也给那些对时序敏感的老用例添噪声
    // （实测把 `i18n：记下界面语言` 偶发带挂）。预热对测试也没有意义：断言的是路由
    // 的三级回落，不该由真下载来满足。
    if (process.env.VITEST || process.env.NODE_ENV === "test") {
      this.log.log("测试环境，跳过首启预热");
      return;
    }
    if (process.env.OV_UI) {
      // 对比模式：封面必须来自本地缓存（对比进程把封面 CDN 挡掉了，302 过去只会是空白卡片），
      // 所以仍然要预热、且失败的张再试一轮。
      //
      // 但**不能像以前那样 `return` 这个 promise** —— 那会让 Nest 等它跑完才开始 listen，
      // 本机实测 24 张要 10 秒以上，整个「导航 + 等稳定」的截图窗口被它吃光，
      // 截到的永远是「画布还在加载」。现在把 promise 挂到 `warmInFlight`，
      // 由路由在真要发封面时按需等（`awaitShowcaseWarm`）。
      warmInFlight = (async () => {
        const first = await warmShowcaseCovers(this.paths, { waitForPeer: true });
        const second = await warmShowcaseCovers(this.paths, { waitForPeer: true });
        this.log.log(`界面对比预热：写入 ${first.warmed + second.warmed} 张封面`);
      })();
      return;
    }
    // 不 await：启动路径不因为下载图片变慢。
    void warmShowcaseCovers(this.paths).then((r) => {
      if (r.warmed > 0) this.log.log(`首启预热：写入 ${r.warmed} 张封面${r.reason ? `（${r.reason}）` : ""}`);
      else if (r.reason) this.log.log(`首启预热跳过：${r.reason}`);
    });
  }
}

export { fetchOne as __fetchOneForTest, DEFAULT_LIMIT, LOCK_FILE };
