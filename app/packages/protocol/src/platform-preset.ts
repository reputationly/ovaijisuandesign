// 产品内置的平台地址与模型。
//
// 用户只填令牌（API Key）；地址和各模态用的模型由产品固定，界面只展示、不让选。
// 配置文件（config.json）里**非空**的值照常优先，缺了或是空（含 null）的都用这里的默认值。
// 没有"在配置里关掉某个模型"这个用法：老版本设置页会把没填的模型写成 null，
// 如果把 null 当成"关掉"，这些用户会看到一屏"未启用"，而界面又不让改。
// gateway（生成）和主进程（对话、设置页）读配置都要过这一道，口径必须一致。

export const PLATFORM_PRESET = {
  base_url: "https://maas.ovaijisuan.com/v1",
  chat_model: "qwen3.8-flash-fp8",
  // **模型名不在这里写死（L-1）。** 平台上有哪些模型、每个模态默认用哪个，由
  // `GET /v1/ov/capabilities` 说了算（见 `app/gateway/src/generate/platform-catalog.ts`）。
  // 产品里再存一份的后果是两边会漂移：平台上换了默认模型，客户端还在用旧名字，
  // 而报错是"模型不存在"，看不出是客户端没跟上。
  //
  // 空表示"由目录决定"；配置文件里显式写了模型名仍然优先（老配置继续有效）。
  models: {
    image: null,
    image_edit: null,
    video: null,
    video_ref: null,
    video_upscale: null,
    image_upscale: null,
    music: null,
    music_edit: null,
    speech: null,
  },
} as const;

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => !!v && typeof v === "object" && !Array.isArray(v);

/** 去掉首尾空白后非空才算有值；否则返回 null。 */
const text = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
};

/**
 * 把读出来的配置 JSON 补全成"实际生效的配置"。不改入参，返回新对象；
 * 未知字段原样保留。`api_key` 缺了补成空串，免得 `parseMediaConfig` 因为缺字段直接抛错。
 */
export function withPlatformPreset(raw: unknown): Json {
  const root: Json = isObject(raw) ? raw : {};
  const platform: Json = isObject(root.platform) ? root.platform : {};
  const models: Json = isObject(root.models) ? root.models : {};

  const nextModels: Json = { ...models };
  for (const [key, fallback] of Object.entries(PLATFORM_PRESET.models)) {
    // 非空串就用它；缺了 / null / 空串都是"没写"，用预设（预设本身为 null 的就是未启用）。
    nextModels[key] = text(models[key]) ?? fallback;
  }

  return {
    ...root,
    platform: {
      ...platform,
      base_url: text(platform.base_url) ?? PLATFORM_PRESET.base_url,
      api_key: typeof platform.api_key === "string" ? platform.api_key : "",
      chat_model: text(platform.chat_model) ?? PLATFORM_PRESET.chat_model,
    },
    models: nextModels,
  };
}
