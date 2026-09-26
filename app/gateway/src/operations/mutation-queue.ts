import { Injectable } from "@nestjs/common";

/** 单个任务的上限。卡住的话后面排队的改动全堵着，不如失败让用户重试。 */
export const MUTATION_TIMEOUT_MS = 5500;

/**
 * 工作区文件改动（删除、改名、移动、复制一份、撤销）的串行队列。
 *
 * 两个改动交错执行会让撤销栈里的操作顺序和盘上的实际顺序对不上：比如先删后改名的
 * 两个请求交错了，撤销改名时文件已经在回收站里。排队串行后每一步都看得到上一步的结果。
 */
@Injectable()
export class MutationQueue {
  private tail: Promise<unknown> = Promise.resolve();

  /** 超时从轮到它开始算，排队等待的时间不算在内。超时后队列照常往下走。 */
  enqueue<T>(task: () => Promise<T>, timeoutMessage = "文件操作超时", timeoutMs = MUTATION_TIMEOUT_MS): Promise<T> {
    const run = this.tail.then(() => withTimeout(task(), timeoutMs, timeoutMessage));
    this.tail = run.catch(() => undefined);
    return run;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(msg)), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });
}
