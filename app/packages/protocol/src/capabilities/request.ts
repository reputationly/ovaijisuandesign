/**
 * 能力调用的入参校验原语。
 *
 * 后端对参数的容忍度很低：多传一个空串就报「unsupported」，少传一个必填项也是同样的错。
 * 所以这里做两件事 ——
 *
 * - `wire`：把调用方给的参数压成后端要的「字符串字典」，并**丢掉空值**。
 *   空值的判断放在这里统一做，是因为界面上「没填」和「填了空」是同一个东西，
 *   但后端会把空串当成显式取值。
 * - 其余几个：把校验失败的报错文案统一成一种形状，方便上层按前缀归类。
 */
export class CapabilityInputError extends Error {
  name = "CapabilityInputError";
}

/** 校验不通过时抛这个。返回类型标成 `never`，是为了让调用点不需要写 `else`。 */
export function reject(message: string): never {
  throw new CapabilityInputError(message);
}

/**
 * 把参数压成后端要的字符串字典。
 *
 * 对象值会被 JSON 序列化（后端收的是字符串字段），`undefined`/`null`/空串一律丢掉 ——
 * 留着会被后端当成显式传值、进而走进「不支持」的分支。
 */
export function wire(params: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => [key, typeof value === "object" ? JSON.stringify(value) : String(value)]),
  );
}

/** 空列表返回 `undefined` 而不是 `"[]"`：后端对空数组和「没传」的处理不一样。 */
export const jsonList = (values: unknown[]): string | undefined => (values.length ? JSON.stringify(values) : undefined);

/** 整数范围校验。`undefined` 放行（表示没传，由后端取默认值）。 */
export function intInRange(scope: string, key: string, value: unknown, min: number, max: number): void {
  if (value === undefined) return;
  const n = Number(value);
  // 空串会被 Number 转成 0，必须单独挡掉，否则「空」会被当成合法的 0
  if (!Number.isInteger(n) || n < min || n > max || String(value).trim() === "") {
    reject(`${scope} unsupported ${key}=${String(value)}. Supported values: ${min}..${max}.`);
  }
}
