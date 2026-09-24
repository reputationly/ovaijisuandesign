/**
 * 串行锁：promise 链。前一个任务失败不堵后面（`then(fn, fn)`）。**不可重入** ——
 * 锁内再申请同一把锁会死等自己。锁内要调别的写操作时用它们的 `*Locked` 版本。
 */
export class AsyncMutex {
  private chain: Promise<unknown> = Promise.resolve();

  runExclusive<T>(fn: () => Promise<T> | T): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.catch(() => undefined);
    return run;
  }
}
