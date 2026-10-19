/**
 * 能力参数描述的构造原语。
 *
 * 每个后端模型的能力表都是「一堆字段名 → JSON Schema 片段」。这里放的是最常用的几种，
 * 让各处的能力表写起来只有字段名和取值范围两种信息，不会各写一套 schema 形状。
 *
 * `description` 都是给模型看的英文句子（能力表会进工具定义），所以措辞本身是接口的一部分。
 */

/** 布尔参数。没有描述时不要留一个空 `description` 字段 —— 有些后端会因此判为非法。 */
export const booleanParam = (description?: string) => ({
  type: "boolean",
  ...(description ? { description } : {}),
});

/** 枚举参数（后端只认字符串枚举）。 */
export const enumParam = (values: readonly string[], description?: string) => ({
  type: "string",
  enum: values,
  ...(description ? { description } : {}),
});

/**
 * 时长参数（各厂商的能力表共用，所以要导出）。
 *
 * 文案里把三条规则都说清楚（取整、封顶、下限拒绝），因为这三条后端都会执行，
 * 而模型看不到后端代码 —— 不写清楚它就会反复试错。时长固定时（min === max）
 * 换一套措辞，并额外提示「从参考素材继承时长的模式会拒绝该参数」。
 */
export const durationParam = (min: number, max: number) => ({
  type: "integer",
  minimum: min,
  maximum: max,
  description: `${min === max ? `Fixed at ${min} seconds.` : `Output duration in seconds, ${min}..${max}.`} A requested value is rounded up to whole seconds and capped at ${max}; below ${min} is rejected.${min === max ? "" : " Modes that inherit their length from a reference reject it."}`,
});

/** 把一组取值同时映射成「原值 → 大写」的字典，用于文本类枚举。 */
export const upperCased = (...values: string[]) => Object.fromEntries(values.map((value) => [value, value.toUpperCase()]));

/** 字符串字面量形式的布尔值（后端有些字段收 `"true"`/`"false"` 而不是布尔）。 */
export const TRUE_FALSE = { true: "true", false: "false" };
