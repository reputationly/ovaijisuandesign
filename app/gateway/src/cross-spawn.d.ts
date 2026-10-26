/**
 * `cross-spawn` 只带 CommonJS 实现、没有自带类型；`@types/cross-spawn` 不在离线缓存里。
 * 我们只用到 `spawn(command, args, options)` 这一种形态，按 `child_process.spawn` 声明即可。
 */
declare module "cross-spawn" {
  import type { ChildProcess, SpawnOptions } from "node:child_process";

  function crossSpawn(command: string, args?: readonly string[], options?: SpawnOptions): ChildProcess;
  export default crossSpawn;
}
