import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * 生成提交体里的 `params` 全是字符串（gateway 的约定），这里集中处理：
 * 从 vendor_params 收集、补缺省、把枚举大小写对齐到规范写法。
 * 每个 pick* 返回问题描述或 undefined，调用方用 firstProblem 取第一个。
 */

export type Params = Record<string, string>;

/** 入参层面的拒绝（没提交任何东西）：纯文本 + isError，区别于生成失败的结构化回话。 */
export function plainError(message: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}

type Collected = { params: Params; error?: undefined } | { params?: undefined; error: string };

/**
 * vendor_params 并入 base：键必须在 allowed 里；pinned 里的键若公共字段已给值，
 * vendor_params 只能给同样的值（避免顶层 duration 和 vendor_params.duration 打架）。
 */
export function collectVendorParams(
  scope: string,
  base: Params,
  extra: Record<string, unknown> | undefined,
  allowed: readonly string[],
  pinned: readonly string[] = [],
): Collected {
  const bag: Params = { ...base };
  for (const [name, value] of Object.entries(extra ?? {})) {
    if (value == null) continue;
    if (!allowed.includes(name)) {
      return { error: `${scope} does not support vendor_params.${name}. Supported keys: ${allowed.join(", ") || "(none)"}.` };
    }
    const text = String(value);
    const existing = bag[name];
    if (pinned.includes(name) && existing !== undefined && existing !== text) {
      return {
        error: `${scope} got conflicting ${name}: common/model value=${existing}, vendor_params.${name}=${text}. Use the common field or model_id, not both.`,
      };
    }
    bag[name] = text;
  }
  return { params: bag };
}

const present = (bag: Params, name: string): string | undefined => (bag[name] === undefined || bag[name] === "" ? undefined : bag[name]);

export function pickEnum(scope: string, bag: Params, name: string, choices: readonly string[]): string | undefined {
  const raw = present(bag, name);
  if (raw === undefined) return undefined;
  const canonical = choices.includes(raw) ? raw : choices.find((c) => c.toLowerCase() === raw.toLowerCase());
  if (canonical === undefined) return `${scope} unsupported ${name}=${raw}. Supported values: ${choices.join(", ")}.`;
  bag[name] = canonical;
  return undefined;
}

/** 只接受列出的整数档位（kling 的时长这类离散值）。 */
export function pickInt(scope: string, bag: Params, name: string, choices: readonly number[]): string | undefined {
  const raw = present(bag, name);
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || !choices.includes(value)) return `${scope} unsupported ${name}=${raw}. Supported values: ${choices.join(", ")}.`;
  bag[name] = String(value);
  return undefined;
}

export function pickIntInRange(scope: string, bag: Params, name: string, lo: number, hi: number): string | undefined {
  const raw = present(bag, name);
  if (raw === undefined) return undefined;
  const value = Number(raw);
  const fits = Number.isInteger(value) && value >= lo && value <= hi;
  if (!fits) return `${scope} unsupported ${name}=${raw}. Supported values: ${lo}..${hi}.`;
  bag[name] = String(value);
  return undefined;
}

export function pickBool(scope: string, bag: Params, name: string): string | undefined {
  const raw = present(bag, name);
  if (raw === undefined) return undefined;
  const lowered = raw.toLowerCase();
  if (lowered === "true" || lowered === "false") {
    bag[name] = lowered;
    return undefined;
  }
  return `${scope} unsupported ${name}=${raw}. Supported values: true, false.`;
}

export function requireJsonArray(scope: string, bag: Params, name: string): string | undefined {
  const raw = bag[name];
  if (!raw) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  return Array.isArray(parsed) ? undefined : `${scope} vendor_params.${name} must be a JSON array string.`;
}

export const firstProblem = (...problems: (string | undefined)[]): string | undefined => problems.find((p) => p !== undefined && p !== "");

export function fillDefaults(bag: Params, defaults: Params): void {
  for (const name of Object.keys(defaults)) {
    if (present(bag, name) === undefined) bag[name] = defaults[name] as string;
  }
}

/** 列表参数按 gateway 约定以 JSON 串放进 params；空列表不写。 */
export function putJsonList(bag: Params, name: string, list: readonly string[] | undefined): void {
  if (!list?.length) return;
  bag[name] = JSON.stringify(list);
}
