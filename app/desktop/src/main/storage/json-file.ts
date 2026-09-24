import { randomBytes } from "node:crypto";
import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeSync } from "node:fs";
import path from "node:path";

/**
 * 同步原子写：临时文件 → fsync → rename。
 *
 * 存储文件很小，而调用方（IPC handler、退出钩子）经常不能 await；同步写让
 * "set 返回即已落盘"成立。直接覆盖写的话进程在半路被杀会留下截断的 JSON，
 * 下次启动整份设置就没了。
 */
export function writeJsonAtomic(file: string, value: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  const fd = openSync(tmp, "w");
  try {
    writeSync(fd, JSON.stringify(value, null, 2));
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  try {
    renameSync(tmp, file);
  } catch (err) {
    rmSync(tmp, { force: true });
    throw err;
  }
}

export type ReadResult<T> = { kind: "missing" } | { kind: "ok"; value: T } | { kind: "corrupt"; backup?: string };

/**
 * 读 JSON。坏文件不当空文件处理后直接覆盖：先挪成 `.corrupt-<时间戳>` 留证据，
 * 否则下一次写入会把还能人工抢救的内容抹掉。
 */
export function readJsonFile<T = unknown>(file: string): ReadResult<T> {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return { kind: "missing" };
    throw err;
  }
  try {
    return { kind: "ok", value: JSON.parse(text) as T };
  } catch {
    const backup = `${file}.corrupt-${Date.now()}`;
    try {
      renameSync(file, backup);
      return { kind: "corrupt", backup };
    } catch {
      return { kind: "corrupt" };
    }
  }
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** 深拷贝（值都是 JSON）。返回给调用方的对象不能和内存里的状态共用引用。 */
export function cloneJson<T>(v: T): T {
  return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T);
}
