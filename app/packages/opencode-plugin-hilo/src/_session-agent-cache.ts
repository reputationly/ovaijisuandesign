/**
 * 会话 id → agent 名，在 chat.params 里记下。
 *
 * tool.execute.before 的入参里没有 agent 名：技能在本轮授权工具时，要靠它找到该往哪个 agent 的
 * permission 数组里追加，好让同一轮里下一次工具调用就能用上。
 *
 * 没有会话结束的信号可听，按插入顺序做一个上限 1024 的 LRU，靠自然淘汰保持内存不涨。
 *
 * 放在单独的文件里、不从入口导出：opencode 加载插件时会把入口的每个具名导出都当成插件函数调用，
 * 导出一个普通对象会让整个插件加载失败。
 */
export const SESSION_AGENT_CACHE_MAX = 1024;
export const sessionAgentCache = new Map<string, string>();

export function rememberSessionAgent(sessionID: string, agentName: string): void {
  if (sessionAgentCache.has(sessionID)) sessionAgentCache.delete(sessionID);
  sessionAgentCache.set(sessionID, agentName);
  if (sessionAgentCache.size > SESSION_AGENT_CACHE_MAX) {
    const oldest = sessionAgentCache.keys().next().value;
    if (oldest !== undefined) sessionAgentCache.delete(oldest);
  }
}
