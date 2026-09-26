import { sessionEndpoint, withGatewayIdentity } from "./gateway-identity.js";

/**
 * 技能授权、已加载技能、agent 引用、根会话的进程内缓存。
 *
 * 授权按根会话记：技能在主会话里加载，工具却常常由子 agent（另一个会话）去调，
 * 子会话要沿根会话取到同一份授权。
 */
export interface PermissionRule {
  permission: string;
  action: string;
  pattern: string;
}

/** chat.params 拿到的 agent 对象。permission 是 opencode 求值用的同一个数组，往里追加即时生效。 */
export interface AgentRef {
  name?: string;
  permission?: PermissionRule[];
}

const SESSION_LIMIT = 1024;
const ROOT_LIMIT = 1024;

const sessionGrants = new Map<string, Map<string, Set<string>>>();
const loadedSkills = new Map<string, Set<string>>();
const sessionAgentRefs = new Map<string, AgentRef>();
const sessionRootCache = new Map<string, string>();

function lruSet<K, V>(map: Map<K, V>, key: K, value: V, limit: number): void {
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  if (map.size > limit) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
}

export function rememberAgentRef(sessionId: string, agent: AgentRef): void {
  lruSet(sessionAgentRefs, sessionId, agent, SESSION_LIMIT);
}

export function getAgentRef(sessionId: string): AgentRef | undefined {
  return sessionAgentRefs.get(sessionId);
}

/** 只收 `hub_` 工具：技能不能借授权放开 bash、写文件这类内置工具。 */
export function recordGrant(rootSessionId: string, agentName: string, tools: readonly string[]): void {
  let agentMap = sessionGrants.get(rootSessionId);
  if (!agentMap) {
    agentMap = new Map();
    lruSet(sessionGrants, rootSessionId, agentMap, ROOT_LIMIT);
  }
  let bucket = agentMap.get(agentName);
  if (!bucket) {
    bucket = new Set();
    agentMap.set(agentName, bucket);
  }
  for (const t of tools) {
    if (t.startsWith("hub_")) bucket.add(t);
  }
}

export function recordSkillLoaded(rootSessionId: string, skillName: string): void {
  let skills = loadedSkills.get(rootSessionId);
  if (!skills) {
    skills = new Set();
    lruSet(loadedSkills, rootSessionId, skills, ROOT_LIMIT);
  }
  skills.add(skillName);
}

export function hasSkillLoaded(rootSessionId: string, skillName: string): boolean {
  return loadedSkills.get(rootSessionId)?.has(skillName) === true;
}

export function getGrants(rootSessionId: string): Map<string, Set<string>> | undefined {
  return sessionGrants.get(rootSessionId);
}

const ROOT_FETCH_TIMEOUT_MS = 2000;

/**
 * 根会话 id。gateway 沿 parentID 上溯；查不到（gateway 出错、超时）就当自己是根，
 * 且不缓存，下次再问 —— 缓存一个错的根会让子 agent 永远拿不到授权。
 */
export async function resolveRootSession(sessionId: string, gatewayUrl: string): Promise<string> {
  const cached = sessionRootCache.get(sessionId);
  if (cached !== undefined) return cached;
  const url = sessionEndpoint(gatewayUrl, sessionId, "root");
  try {
    const resp = await fetch(url, withGatewayIdentity({ signal: AbortSignal.timeout(ROOT_FETCH_TIMEOUT_MS) }));
    if (!resp.ok) {
      console.warn(`[hilo-plugin] resolveRootSession ${url} → HTTP ${resp.status}`);
      return sessionId;
    }
    const data = (await resp.json()) as { rootSessionId?: string | null };
    const root = data.rootSessionId ?? sessionId;
    lruSet(sessionRootCache, sessionId, root, SESSION_LIMIT);
    return root;
  } catch (err) {
    console.warn(`[hilo-plugin] resolveRootSession ${url} threw: ${err instanceof Error ? err.message : String(err)}`);
    return sessionId;
  }
}

/** 测试用：清空所有缓存。 */
export function _resetSessionSkillGrantsForTests(): void {
  sessionGrants.clear();
  loadedSkills.clear();
  sessionAgentRefs.clear();
  sessionRootCache.clear();
}
