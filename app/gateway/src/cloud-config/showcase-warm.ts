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
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { WorkspacePathService } from "../common/workspace-path.service.js";

import { showcaseCovers } from "./home-quick-start-cloud.js";

/** 预热多少张封面。24 张 ≈ 25MB（平均 1.04MB/张），够铺满第一屏又不至于占满磁盘。 */
const DEFAULT_LIMIT = 24;
/** 同时最多下几张。太高会被 CDN 限流，太低又慢。 */
const CONCURRENCY = 4;
/** 单张超时。预热是锦上添花，卡住的那张直接放弃，不拖累其余。 */
const PER_FILE_TIMEOUT_MS = 20_000;
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
  opts: { limit?: number; concurrency?: number; fetchImpl?: typeof fetch } = {},
): Promise<{ warmed: number; skipped: number; reason?: string }> {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const dir = showcaseCacheDir(paths);
  const covers = showcaseCovers().slice(0, limit);
  if (covers.length === 0) return { warmed: 0, skipped: 0, reason: "没有可预热的封面（配置缺失）" };

  let lock: string | undefined;
  try {
    await mkdir(dir, { recursive: true });
    const lockPath = path.join(dir, LOCK_FILE);
    if (await isLocked(lockPath)) return { warmed: 0, skipped: covers.length, reason: "另一个 gateway 正在预热" };
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

  onApplicationBootstrap(): void {
    // 不 await：启动路径不因为下载图片变慢。
    void warmShowcaseCovers(this.paths).then((r) => {
      if (r.warmed > 0) this.log.log(`首启预热：写入 ${r.warmed} 张封面${r.reason ? `（${r.reason}）` : ""}`);
      else if (r.reason) this.log.log(`首启预热跳过：${r.reason}`);
    });
  }
}

export { fetchOne as __fetchOneForTest, DEFAULT_LIMIT, LOCK_FILE };
