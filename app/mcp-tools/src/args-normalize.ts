/**
 * `execute.references` 归一。
 *
 * 真机里模型把这几种都试了一遍：
 *   references: "ver_x"                      → 单个字符串
 *   references: "{\"versionId\":\"ver_x\"}"      → JSON 字符串
 *   references: { versionId: "ver_x" }       → 单个对象
 * schema 只收对象数组，前三种全被判 "Expected array, received …"，
 * 光是在一条 MV 里就白折腾了 4 轮。这里统一成 `[{versionId}]`。
 */
/**
 * 把被宿主/模型改写过的数组还原成数组。
 *
 * 实测（opencode 宿主 + 模型 emit 的参数）会出现这些形状：
 *   - `{"item": [ … ]}` / `{"items": [ … ]}` —— 单元素数组被包了层壳；
 *   - `{"0": {...}, "1": {...}}` —— 变成了数字键对象；
 *   - `{...}` —— 单个对象当数组传（本来就该按一项处理）。
 * 这些都会让 schema 报 `Expected array, received object at output.resources`，
 * 于是整条 `design_execute` 被拒、一次生成也派不出去。
 */
export function asArrayLike(value: unknown): unknown[] | undefined {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") {
    const parsed = parseJsonLike(value);
    if (parsed === value) return [value];
    return asArrayLike(parsed);
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["item", "items", "value", "values", "list", "data"]) {
      if (Object.hasOwn(record, key)) {
        const inner = asArrayLike(record[key]);
        if (inner) return inner;
      }
    }
    const keys = Object.keys(record);
    if (keys.length > 0 && keys.every((key) => /^\d+$/.test(key))) {
      return keys.sort((a, b) => Number(a) - Number(b)).map((key) => record[key]);
    }
    return [record];
  }
  return [value];
}

/** 把"看起来像 JSON 的字符串"解开；不是就原样返回。 */
function parseJsonLike(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!(text.startsWith("[") || text.startsWith("{"))) return value;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

export function normalizeExecuteReferences(args: Record<string, unknown>): Record<string, unknown> {
  if (args.references === undefined) return args;
  // 宿主会把数组改写成 `{"item": …}`；先统一解壳再谈逐项。
  const list = asArrayLike(args.references) ?? [];
  // **收敛成恰好 `{versionId}`**：网关只收单键（`{versionId, role}` / `{resourceId, versionId}`
  // 一律判 `Invalid reference`），而模型很爱顺手带 role/name/resourceId。
  const refs: Record<string, string>[] = list.flatMap((item): Record<string, string>[] => {
    if (typeof item === "string" && item.trim() !== "") {
      const value = item.trim();
      return value.startsWith("res_") ? [{ resourceId: value }] : [{ versionId: value }];
    }
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const record = item as Record<string, unknown>;
      const versionId = typeof record.versionId === "string" && record.versionId.trim() !== "" ? record.versionId : undefined;
      if (versionId) return [{ versionId }];
      const resourceId = typeof record.resourceId === "string" && record.resourceId.trim() !== "" ? record.resourceId : undefined;
      if (resourceId) return [{ resourceId }];
      return [];
    }
    return [];
  });
  return { ...args, references: refs };
}

/** execute 的全部参数兜底（目前只有 references）。 */
export function normalizeExecuteArgs(args: Record<string, unknown>): Record<string, unknown> {
  return normalizeExecuteReferences(args);
}
