/**
 * 工具结果的统一解包：字符串 → JSON，structuredContent → 内层，content 文本 → 第一个可解析项。
 * 4.0.4 的 message/turn、sub-agent 与 connector 三处此前各有一份，语义相同，这里合并。
 */
export function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}

export function readDesignJson(value, depth = 0) {
  if (depth > 4) return undefined;
  if (typeof value === "string") {
    try {
      return readDesignJson(JSON.parse(value), depth + 1);
    } catch {
      return undefined;
    }
  }
  const object = record(value);
  if (object?.structuredContent) return readDesignJson(object.structuredContent, depth + 1);
  if (object?.task || object?.output || object?.capabilityId) return object;
  const content = Array.isArray(value) ? value : object?.content;
  if (Array.isArray(content)) {
    for (const item of content) {
      const parsed = readDesignJson(record(item)?.text, depth + 1);
      if (parsed) return parsed;
    }
  }
  return object;
}
