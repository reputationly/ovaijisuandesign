import { randomBytes } from "node:crypto";
import { mkdir, open, rename, rm } from "node:fs/promises";
import path from "node:path";

/**
 * 原子写：写同目录下的临时文件 → fsync → rename。
 *
 * 直接覆盖写的话，进程在写一半时被杀（应用退出、崩溃、断电）会留下一个截断的
 * JSON，下次启动整份数据就没了。rename 在同一文件系统内是原子的；fsync 保证
 * rename 之后读到的不是还在页缓存里没落盘的内容。
 */
export async function atomicWriteFile(file: string, data: string | Uint8Array): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  const fh = await open(tmp, "w");
  try {
    await fh.writeFile(data);
    await fh.sync();
  } finally {
    await fh.close();
  }
  try {
    await rename(tmp, file);
  } catch (err) {
    await rm(tmp, { force: true });
    throw err;
  }
}

export async function atomicWriteJson(file: string, value: unknown): Promise<void> {
  await atomicWriteFile(file, JSON.stringify(value, null, 2));
}
