import { open, readFile, stat } from "node:fs/promises";

import { xxh3 } from "@node-rs/xxhash";

export const QUICK_HASH_BYTES = 4 * 1024 * 1024;

/**
 * 快速指纹：文件前 4MB 的 xxh3-64，16 位 hex。文件被挪动 / 改名后，reconcile
 * 靠 (size, quick_hash) 把它和原来的 id 重新对上。
 */
export async function quickHash(absPath: string): Promise<string> {
  const { size } = await stat(absPath);
  if (size <= QUICK_HASH_BYTES) return toHex(xxh3.xxh64(await readFile(absPath)));
  const fh = await open(absPath, "r");
  try {
    const buf = Buffer.alloc(QUICK_HASH_BYTES);
    let read = 0;
    while (read < QUICK_HASH_BYTES) {
      const { bytesRead } = await fh.read(buf, read, QUICK_HASH_BYTES - read, read);
      if (bytesRead === 0) break;
      read += bytesRead;
    }
    return toHex(xxh3.xxh64(buf.subarray(0, read)));
  } finally {
    await fh.close();
  }
}

function toHex(v: bigint): string {
  return v.toString(16).padStart(16, "0");
}
