import { gatewayEndpoint, withGatewayIdentity } from "./gateway-identity.js";

/**
 * 从 gateway 取模型目录（`/api/models`，和界面模型选择器同一份），把图 / 视频 / 音频三类摊平，
 * 给 question 的模型选项校验用。
 *
 * 插件里不缓存：opencode 进程常驻，用户在设置里换了模型要马上生效；gateway 那边每次现读配置，
 * 走本机回环，代价可以忽略。取不到就回空列表，校验随之放行，而不是拿旧数据去拦。
 */
export interface MediaModelInfo {
  id: string;
  type: string;
  display_name: string;
  description: string;
  tool_names: string[];
  visibility: string;
  icon_url: string;
  series_id: string;
  hot: boolean;
}

export interface MediaModelsSnapshot {
  models: MediaModelInfo[];
}

const FETCH_TIMEOUT_MS = 5000;

export async function fetchMediaModels(gatewayUrl: string): Promise<MediaModelsSnapshot> {
  const url = gatewayEndpoint(gatewayUrl, "/api/models");
  try {
    const resp = await fetch(url, withGatewayIdentity({ signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }));
    if (!resp.ok) {
      console.warn(`[hilo-plugin] models catalog fetch ${url} → HTTP ${resp.status}`);
      return { models: [] };
    }
    const parsed = parseMediaModelsResponse(await resp.json());
    if (!parsed.valid) console.warn(`[hilo-plugin] models catalog fetch ${url} returned invalid schema`);
    console.log(`[hilo-plugin] models catalog fetched ${parsed.models.length} media models`);
    return { models: parsed.models };
  } catch (err) {
    console.warn(`[hilo-plugin] models catalog fetch ${url} threw: ${err instanceof Error ? err.message : String(err)}`);
    return { models: [] };
  }
}

export function parseMediaModelsResponse(data: unknown): { models: MediaModelInfo[]; valid: boolean } {
  if (!isRecord(data)) return { models: [], valid: false };
  const categories = [data.imageModels, data.videoModels, data.audioModels];
  if (!categories.every(Array.isArray)) return { models: [], valid: false };
  return { models: (categories as unknown[][]).flatMap((models) => models.flatMap(normalizeModelInfo)), valid: true };
}

/** 缺 id / type / tool_names 的行丢掉：没有工具的模型不可能被选来生成。 */
function normalizeModelInfo(raw: unknown): MediaModelInfo[] {
  if (!isRecord(raw)) return [];
  const id = readString(raw.id);
  const type = readString(raw.type);
  const toolNames = readStringArray(raw.tool_names);
  if (!id || !type || toolNames.length === 0) return [];
  return [
    {
      id,
      type,
      display_name: readString(raw.display_name) ?? id,
      description: readString(raw.description) ?? "",
      tool_names: toolNames,
      visibility: readString(raw.visibility) ?? "",
      icon_url: readString(raw.icon_url) ?? "",
      series_id: readString(raw.series_id) ?? "",
      hot: raw.hot === true,
    },
  ];
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
