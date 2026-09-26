import { mkdir, open, rm, stat, utimes } from "node:fs/promises";
import path from "node:path";

/**
 * 跨进程文件锁，和 proper-lockfile 的约定兼容：锁就是 `<target>.lock` 这个目录，mkdir 成功即拿到，
 * 持有期间定时刷新它的 mtime，mtime 超过 `staleMs` 没动的锁视为持有者已死、可以抢。
 *
 * MCP 进程用 proper-lockfile 锁同一批文件（记忆目录的 MEMORY.md、计划文件旁的 lock-target），
 * 两边必须认同一个锁，否则并发写会互相覆盖。这里只需要"拿不到就轮询到超时"，用不着整个库。
 */
export class FileLockTimeoutError extends Error {
  constructor(target: string, waitMs: number) {
    super(`failed to acquire file lock within ${waitMs}ms: ${target}`);
    this.name = "FileLockTimeoutError";
  }
}

export interface FileLockOptions {
  staleMs: number;
  waitMs: number;
  retryMs: number;
}

export async function withFileLock<T>(target: string, opts: FileLockOptions, fn: () => Promise<T>): Promise<T> {
  await mkdir(path.dirname(target), { recursive: true });
  // 锁目标文件本身要存在：proper-lockfile 那边对不存在的目标会直接报错。
  await (await open(target, "a")).close();
  const lockDir = `${target}.lock`;
  const startedAt = Date.now();
  for (;;) {
    try {
      await mkdir(lockDir);
      break;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      const st = await stat(lockDir).catch(() => null);
      if (st && Date.now() - st.mtimeMs > opts.staleMs) {
        await rm(lockDir, { recursive: true, force: true }).catch(() => undefined);
        continue;
      }
      if (Date.now() - startedAt >= opts.waitMs) throw new FileLockTimeoutError(target, opts.waitMs);
      await new Promise((r) => setTimeout(r, opts.retryMs));
    }
  }
  const refresh = setInterval(() => {
    const now = new Date();
    void utimes(lockDir, now, now).catch(() => undefined);
  }, Math.max(1000, Math.floor(opts.staleMs / 2)));
  refresh.unref();
  try {
    return await fn();
  } finally {
    clearInterval(refresh);
    await rm(lockDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
