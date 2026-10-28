// 产品内置的平台地址，以及**拿不到平台目录时的兜底模型表**。
//
// 用户只填令牌（API Key）；地址由产品固定，界面只展示、不让选。
// 配置文件（config.json）里**非空**的值照常优先，缺了或是空（含 null）的都用这里的默认值。
// 没有"在配置里关掉某个模型"这个用法：老版本设置页会把没填的模型写成 null，
// 如果把 null 当成"关掉"，这些用户会看到一屏"未启用"，而界面又不让改。
// gateway（生成）和主进程（对话、设置页）读配置都要过这一道，口径必须一致。

export const PLATFORM_PRESET = {
  base_url: "https://maas.ovaijisuan.com/v1",
  // 默认值随平台目录走。**注意**：new-api 仓库里 `setting/hilo_catalog_text.go`
  // 的注释写着"2026-10-23 把 qwen3.8-flash-fp8 下架"，但运营确认平台**仍在提供**
  // qwen3.8-flash-fp8 —— 那条注释只是当时换默认值的动机，不是下架记录。
  // 最终默认值等模型/档位评测结论再定，这里只保证"目录里没有就切目录第一个"。
  chat_model: "deepseek-v4-1-flash",
  // **默认值不在这里（L-1）。** 平台上有哪些模型、每个模态默认用哪个，由
  // `GET /v1/ov/capabilities` 说了算（见 `app/gateway/src/generate/platform-catalog.ts`）。
  // 产品里再存一份的后果是两边会漂移：平台上换了默认模型，客户端还在用旧名字，
  // 而报错是"模型不存在"，看不出是客户端没跟上。
  //
  // 这里保持全 null：`withPlatformPreset` **只补地址和对话模型**，模型槽位留给目录。
  // 万一目录拿不到（新装、离线、平台还没发 `/v1/ov`），由 `FALLBACK_MODELS` 在
  // `MediaConfigService.load()` 里补 —— 那里能分清"目录没给"和"目录说没有"。
  // 若在这一层就把槽位填满，目录补位将永远不会生效（槽位非空就跳过）。
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

/**
 * 拿不到平台目录时的兜底模型名。
 *
 * **只在 `MediaConfigService.load()` 里用，不要塞进 `withPlatformPreset`** ——
 * 槽位一旦非空，目录补位就永远不会生效（那里的规则是"空才补"）。
 *
 * 生效范围（写死，不是"能补就补"）：
 * - 一份目录都没有（内存和磁盘缓存都没有）→ 补**全部**空槽位，界面至少能用；
 * - 有目录 → 只补目录**表达不了**的三个槽位（两个超分、音乐编辑）。其余槽位以目录为准，
 *   目录里没有就留空 —— 不能让"目录没给"变成"照样调用"。
 *
 * 取值是改造前产品里那组；`swiftvr` 已下线，超分统一用 `seedvr2`。
 */
export const FALLBACK_MODELS = {
  image: "qwen-image-pro-enhanced",
  image_edit: null,
  video: "minimax-h3-2k",
  video_ref: "minimax-h3-ref-2k",
  video_upscale: "seedvr2",
  // 图片超分没有可用模型：`seedvr2` 注册在视频任务通道（task_type=sr），而客户端的
  // 图片超分走同步 `/images/edits`，平台没有对应的适配器。置空 → 入口按"无模型"降级。
  // 平台若把某个图片超分引擎接到 `/images/edits`，把名字填回来即可（只改这一处）。
  image_upscale: null,
  music: "minimax-music3",
  music_edit: "ace-step",
  speech: null,
} as const satisfies Record<string, string | null>;

/** 有目录时也允许兜底表补的槽位：目录里根本没有这些操作（`upscale` 只报一次、`music_edit` 不报）。 */
export const FALLBACK_ONLY_SLOTS = ["image_upscale", "video_upscale", "music_edit"] as const;

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
/**
 * 配置里的对话模型**已经不在平台目录里**时，改用目录里的第一个。
 *
 * 运营换模型（下架旧名）后，老用户 config.json 里的旧名字仍然非空 —— 按
 * "非空优先"的规则会一直用下去，请求带着一个目录里已经没有的模型名。
 * 目录拿不到（新装/离线）时不做任何替换，保持原值。
 */
export function pickChatModel(configured: string, available: readonly string[]): string {
  const value = configured.trim();
  const list = available.map((item) => item.trim()).filter((item) => item !== "");
  if (list.length === 0) return value;
  if (list.includes(value)) return value;
  return list[0] ?? value;
}

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
