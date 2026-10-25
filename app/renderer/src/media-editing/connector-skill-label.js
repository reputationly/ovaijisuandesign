import { readDesignJson } from "../chat/read-design-json.js";
/**
 * Skill 加载文案的支撑函数（4.0.3 新增）：readDesignJson / 能力 id 解析 / 名字与失败判定。
 *
 * 逐个移植自参照 index-B3Ss5vz1.js 的同名函数。这一组是为了一条提示：
 *   「加载 Skill xxx 失败」——需要从工具结果里判断能力有没有真的加载成功。
 *
 * 依赖链（这也是为什么它看起来"只是几个小函数"却牵连很多）：
 *   renderToolLabel 的 skillOp 分支
 *     -> connectorSkillLoadFailed(toolResult)        判断这次加载是否失败
 *     -> extractSkillName(toolArgs, toolName)        取展示用的名字
 *        -> connectorSkillLoadName(toolName, toolArgs)  从能力 id 反推名字
 *           -> parseConnectorSkillCapabilityId(id)     解析 "connector-skill:<connector>/<name>"
 *           -> readDesignJson(...)                     把工具结果/参数解析成对象
 */

/** 能力 id 前缀（参照值）。 */
const CONNECTOR_SKILL_CAPABILITY_PREFIX = "connector-skill:";
/** connector id 形状（参照值）。 */
const CONNECTOR_ID = /^[a-z][a-z0-9-]{0,63}$/;

const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * 把工具结果解析成对象。参照会递归下钻：
 * 字符串先 JSON.parse；structuredContent 再剥一层；认 task/output/capabilityId；
 * content 数组里找 text。深度上限 4 防死循环。
 */
/** 解析 "connector-skill:<connectorId>/<name>"；形状不对返回 undefined。 */
export function parseConnectorSkillCapabilityId(id) {
  if (typeof id !== "string" || !id.startsWith(CONNECTOR_SKILL_CAPABILITY_PREFIX)) return undefined;
  const rest = id.slice(CONNECTOR_SKILL_CAPABILITY_PREFIX.length);
  const separator = rest.indexOf("/");
  if (separator < 0) return undefined;
  const connectorId = rest.slice(0, separator);
  const name = rest.slice(separator + 1);
  return CONNECTOR_ID.test(connectorId) && name ? { connectorId, name } : undefined;
}

/** 从 design_capability_get 的参数 ids 里反推要展示的名字；多个用逗号连接。 */
export function connectorSkillLoadName(toolName, toolArgs) {
  if (toolName !== "design_capability_get") return undefined;
  const ids = readDesignJson(toolArgs)?.ids;
  if (!Array.isArray(ids) || ids.length === 0) return undefined;
  const skills = ids.map((id) => (typeof id === "string" ? parseConnectorSkillCapabilityId(id) : undefined));
  if (!skills.every(Boolean)) return undefined;
  return skills.map((s) => s?.name).join(", ");
}

/** 这次 design_capability_get 是否没加载到任何 skill。 */
export function connectorSkillLoadFailed(toolResult) {
  if (toolResult === undefined) return false;
  const result = readDesignJson(toolResult);
  const loaded = Array.isArray(result?.capabilities)
    ? result.capabilities.some((item) => (isRecord(item) ? item.kind === "skill" : false))
    : false;
  return !loaded;
}
