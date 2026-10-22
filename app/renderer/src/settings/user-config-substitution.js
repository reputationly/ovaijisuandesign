/**
 * user_config 占位符替换（4.0.3 扩展）。
 *
 * 连接器的 mcp.headers / queryParams 里可以写 `${user_config.<key>}`，
 * 安装时要把这些占位符换成真实值。
 *
 * 4.0.3 相比 4.0.0 的变化：**不再只支持一个 API key**，而是
 *   · 用同一个正则找出模板里引用的**所有**字段（referencedUserConfigKeys）
 *   · 替换时校验字段是否在 manifest 的 userConfig 里声明过、
 *     以及在允许没有值时回退到字段的 default
 *   · 任一条不满足就抛 UserConfigSubstitutionError（带 key 与原因），
 *     让界面能精确提示是哪个字段有问题
 */

/** ${user_config.<key>} 的匹配式（参照原样）。 */
const PLACEHOLDER = /\$\{user_config\.([a-z][a-z0-9_]*)\}/g;

export class UserConfigSubstitutionError extends Error {
  constructor(key, detail) {
    super(`user_config.${key}: ${detail}`);
    this.key = key;
    this.name = "UserConfigSubstitutionError";
  }
}

/** 模板里引用了哪些字段（去重，保持出现顺序）。 */
export function referencedUserConfigKeys(template) {
  const keys = new Set();
  for (const match of template.matchAll(PLACEHOLDER)) keys.add(match[1]);
  return [...keys];
}

/**
 * 把模板里的 ${user_config.<key>} 替换成真实值。
 * @param template 含 `${user_config.x}` 的字符串
 * @param values   用户填的值（key -> value）
 * @param fields   manifest.userConfig（为空表示不做"是否声明"的校验）
 */
export function substituteUserConfig(template, values, fields = []) {
  return template.replace(PLACEHOLDER, (_match, key) => {
    const declared = fields.length === 0 || fields.some((field) => field.key === key);
    if (!declared) throw new UserConfigSubstitutionError(key, "not declared in userConfig");
    const value = values[key] ?? fields.find((field) => field.key === key)?.default;
    if (value === undefined) throw new UserConfigSubstitutionError(key, "no value provided");
    return String(value);
  });
}

/** 单个值的校验（4.0.3 的 isValidUserConfigValue）。 */
export const USER_CONFIG_VALUE_MAX_LENGTH = 2048;
export function isValidUserConfigValue(value) {
  const trimmed = value.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= USER_CONFIG_VALUE_MAX_LENGTH &&
    !/[\r\n\0]/u.test(trimmed)
  );
}
