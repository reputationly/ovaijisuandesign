/**
 * 丢掉全局 HTTP 连接池里的 keep-alive 连接。
 *
 * Node 18+ 的 `fetch` 走 undici，`http` 有 `globalAgent` —— 两者都会把连接留着复用。
 * 测试里每个文件起自己的 app/server、跑完就关，下一个文件再请求时可能拿到上一个文件
 * 留下的**死连接**，症状是 `socket hang up` / `Parse Error: Expected HTTP/` /
 * 莫名其妙的 `{}` 响应。
 */
export async function destroyGlobalAgent(): Promise<void> {
  const { globalAgent } = await import("node:http");
  globalAgent.destroy();
  const undici = globalThis as { [key: symbol]: unknown };
  const dispatcher = undici[Symbol.for("undici.globalDispatcher.1")] as { destroy?: () => Promise<void> } | undefined;
  if (dispatcher?.destroy) await dispatcher.destroy();
}
