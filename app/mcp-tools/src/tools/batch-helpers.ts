import type { GenerateSuccess } from "../schemas.js";

/** count>1 的批量生成每批并发数：再高 gateway / 云端会开始限流。 */
export const BATCH_CONCURRENCY = 10;

/** 按批跑，批内并发、批间串行；单个失败不影响其余。 */
export async function settledInBatches<T>(
  tasks: (() => Promise<T>)[],
  concurrency = BATCH_CONCURRENCY,
): Promise<PromiseSettledResult<T>[]> {
  const out: PromiseSettledResult<T>[] = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    out.push(...(await Promise.allSettled(tasks.slice(i, i + concurrency).map((fn) => fn()))));
  }
  return out;
}

export function pathsOf(r: Pick<GenerateSuccess, "path" | "paths">): string[] {
  return r.paths && r.paths.length > 0 ? r.paths : [r.path];
}
