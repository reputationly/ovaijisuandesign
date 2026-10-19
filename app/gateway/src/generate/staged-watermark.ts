import { AsyncLocalStorage } from "node:async_hooks";

type Hook = (stagedPath: string) => Promise<void>;

const sink = new AsyncLocalStorage<Hook>();

/** 下载还在临时文件里时叠水印。文件改名进工作区之后，监视器只会看到已经叠过的那份。 */
export function withStagedWatermark<T>(hook: Hook, fn: () => Promise<T>): Promise<T> {
  return sink.run(hook, fn);
}

export function getStagedWatermark(): Hook | undefined {
  return sink.getStore();
}
