// use-pricing-config.js
import { API_PATHS } from "../infra/workspace-gateway.js";
import { useGatewayScope } from "../infra/runtime-config.js";
import { useQuery } from "@tanstack/react-query";
import {
  accountScopeKey,
  useOptionalTeamAccount,
} from "../assets/credit-query-keys.jsx";
import { useGatewayFetch } from "../generation/use-model-catalog-scope-key.js";

function mapStoryboardPricing(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return void 0;
  const creditCost = raw.creditCost;
  return typeof creditCost === "number" &&
    Number.isFinite(creditCost) &&
    creditCost >= 0
    ? {
        creditCost,
      }
    : void 0;
}

function mapH3ContextIrPricing(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return void 0;
  const value = raw;
  const input = value.input_credit_per_million_tokens;
  const output = value.output_credit_per_million_tokens;
  if (
    typeof input !== "number" ||
    !Number.isFinite(input) ||
    input < 0 ||
    typeof output !== "number" ||
    !Number.isFinite(output) ||
    output < 0
  ) {
    return void 0;
  }
  return {
    inputCreditPerMillionTokens: input,
    outputCreditPerMillionTokens: output,
  };
}

function mapPricingResponse(raw) {
  const ttsRaw = raw.tts;
  const musicRaw = raw.music;
  return {
    enabled: raw.enabled,
    video: raw.video ?? [],
    image: raw.image ?? [],
    tts: ttsRaw
      ? {
          hdCreditPerChar: ttsRaw.hd_credit_per_char ?? 1,
          turboCreditPerChar: ttsRaw.turbo_credit_per_char ?? 0.6,
          hdModels: ttsRaw.hd_models ?? [],
          turboModels: ttsRaw.turbo_models ?? [],
        }
      : void 0,
    music: musicRaw
      ? {
          oncePrice: musicRaw.once_price ?? 0,
          elevenLabsMusicV1PerMinute:
            musicRaw["11labs_music_v1_per_minute"] ?? 0,
          elevenLabsMusicV2PerMinute:
            musicRaw["11labs_music_v2_per_minute"] ?? 0,
        }
      : void 0,
    text: raw.text ?? void 0,
    tool: raw.tool ?? [],
    h3ContextIr: mapH3ContextIrPricing(raw.h3_context_ir),
    storyboard: mapStoryboardPricing(raw.storyboard),
    promotionEndUnix:
      typeof raw.promotionEndUnix === "number"
        ? raw.promotionEndUnix
        : void 0,
    sessionStatsSinceMs:
      typeof raw.session_stats_since_ms === "number"
        ? raw.session_stats_since_ms
        : void 0,
  };
}

const DEFAULT_STALE_MS = 60 * 60 * 1e3;

const MIN_STALE_MS = 60 * 1e3;

const LEGACY_PERSONAL_PRICING_SCOPE = "LEGACY_PERSONAL";

const CANONICAL_PRICING_PENDING_SCOPE = "CANONICAL_PENDING";

async function fetchPricing(gatewayFetch) {
  const resp = await gatewayFetch(API_PATHS.billingPricing);
  const raw = await resp.json();
  return mapPricingResponse(raw);
}

export function usePricingConfig() {
  const gatewayFetch = useGatewayFetch();
  const { scopeKey, baseUrl, gatewayBinding } = useGatewayScope();
  const teamAccount = useOptionalTeamAccount();
  const workspaceInstanceId = gatewayBinding?.instanceId;
  const workspaceGeneration = gatewayBinding?.generation;
  const canonicalScopeKey = accountScopeKey(teamAccount?.activeScope ?? null);
  const canonicalIntegrationActive = teamAccount?.integrationEnabled === true;
  const canonicalAccountReady =
    !canonicalIntegrationActive ||
    (teamAccount.accountDataVisible === true && canonicalScopeKey !== null);
  const pricingAccountScope = !canonicalIntegrationActive
    ? LEGACY_PERSONAL_PRICING_SCOPE
    : canonicalAccountReady
      ? canonicalScopeKey
      : CANONICAL_PRICING_PENDING_SCOPE;
  return useQuery({
    queryKey: [
      "billing-pricing",
      scopeKey,
      baseUrl,
      workspaceInstanceId,
      workspaceGeneration,
      pricingAccountScope,
    ],
    enabled: Boolean(baseUrl) && canonicalAccountReady,
    queryFn: () => fetchPricing(gatewayFetch),
    // 动态 staleTime：活动期内按服务端下发的 endUnix 精准失效，
    // 活动外用默认 1h。失效后下一次组件挂载/聚焦会自动重新拉取。
    // 注意：全局 QueryClient retry/refetch 都是关闭的。workspace gateway
    // 重启时第一次请求可能命中短暂 Failed to fetch；这里必须局部有限重试，
    // 且 queryKey 同时带 gateway instance/generation 与 canonical account
    // scope：gateway rebind 或 Personal/Team 切换后都不能沿用旧实例、旧计费空间
    // 的价格。切换中使用永不 fetch 的 pending key，避免短暂展示上个账号的优惠价。
    retry: 2,
    staleTime: (query) => {
      const endUnix = query.state.data?.promotionEndUnix;
      if (!endUnix) return DEFAULT_STALE_MS;
      const remaining = endUnix * 1e3 - query.state.dataUpdatedAt;
      return Math.max(MIN_STALE_MS, remaining);
    },
  });
}
