/**
 * 「下一步提示建议」的目标解析：把 OpenCode 的 config + 模型引用变成「打到哪、用什么协议」。
 *
 * 移植自 4.0.3 的 `gateway/dist/next-prompt-suggestion/suggestion-target.js`
 * （抽取在 `.probe/extracted/nps-4.0.3/suggestion-target.js`）。
 *
 * 两种情况（照搬参照）：
 *   · **非自定义 provider**：只有 messages / responses 两种协议可以直接走（source: "cloud"），
 *     由 service 用平台凭据补 baseURL；chat 协议不在这条路上。
 *   · **自定义 provider**（id 形如 `user-custom-xxx`）：必须自带 baseURL + apiKey，
 *     这里直接把 endpoint 拼好（协议路径 + 认证头 + 用户自定义头）。
 */

import {
  SUGGESTION_PROTOCOL_PATHS,
  protocolForProviderPackage,
  type SuggestionProtocol,
} from "./suggestion-protocols.js";

/** 非自定义 provider 允许的协议（参照里就这两种）。 */
const CLOUD_PROTOCOLS = new Set<SuggestionProtocol>(["messages", "responses"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** 参照的判定：provider id 形如 `user-custom-xxx` 才算用户自配。 */
export function isCustomModelProvider(id: string | undefined): boolean {
  return /^user-custom-[a-z0-9-]+$/.test(id ?? "");
}

function stringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

export interface SuggestionTarget {
  protocol: SuggestionProtocol;
  model: string;
  source: "cloud" | "custom";
  endpoint?: { url: string; headers: Record<string, string> };
}

/**
 * 解析请求目标。返回 null 表示「这个模型不适合用来生成建议」，调用方应回空结果。
 */
export function resolveSuggestionTarget(
  config: unknown,
  ref: { providerID: string; modelID: string },
): SuggestionTarget | null {
  if (!isRecord(config) || !isRecord(config.provider)) return null;
  if (
    Array.isArray(config.enabled_providers) &&
    !config.enabled_providers.includes(ref.providerID)
  ) {
    return null;
  }
  const provider = config.provider[ref.providerID];
  if (!isRecord(provider) || !isRecord(provider.models)) return null;
  const model = provider.models[ref.modelID];
  const protocol = protocolForProviderPackage(
    typeof provider.npm === "string" ? provider.npm : undefined,
  );
  if (!isRecord(model) || !protocol) return null;

  const call = {
    protocol,
    model: typeof model.id === "string" && model.id ? model.id : ref.modelID,
  };

  if (!isCustomModelProvider(ref.providerID)) {
    return CLOUD_PROTOCOLS.has(protocol) ? { ...call, source: "cloud" } : null;
  }

  const providerOptions = isRecord(provider.options) ? provider.options : {};
  const { baseURL, apiKey } = providerOptions;
  if (typeof baseURL !== "string" || !baseURL || typeof apiKey !== "string" || !apiKey) {
    return null;
  }
  const auth: Record<string, string> =
    protocol === "messages"
      ? { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }
      : { Authorization: `Bearer ${apiKey}` };

  return {
    ...call,
    source: "custom",
    endpoint: {
      url: `${baseURL.replace(/\/+$/, "")}${SUGGESTION_PROTOCOL_PATHS[protocol]}`,
      headers: {
        "Content-Type": "application/json",
        ...auth,
        ...stringRecord(providerOptions.headers),
      },
    },
  };
}
