import { createHash } from "node:crypto";

/**
 * 画布的稳定哈希：key 递归排序后序列化，FNV-1a 32 位，8 位 hex。
 * 用来判断"这次要写的和上次写的是不是同一份" —— 相同就不写盘，省掉一次 fsync，
 * 也避免文件 mtime 变了让别的读者误以为画布改过。
 */
export function stableCanvasHash(value: unknown): string {
  const s = JSON.stringify(sortKeys(value));
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.keys(v as object)
        .sort()
        .map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]),
    );
  }
  return v;
}

/** 文本节点的内容哈希：`.md` 原始 UTF-8 字符串的 sha256，不做任何规范化。 */
export function textContentHash(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}
