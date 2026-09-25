import { type MediaConfig, params } from "@ov/maas-media";

/** 目录里的一个媒体模型。形状和模型选择器、`list_capabilities` 读的目录一致。 */
export interface CatalogModel {
  id: string;
  name: string;
  backend: string;
  model_name: string;
  max_refs: number;
  max_video_refs?: number;
  max_audio_refs?: number;
  imageMode?: string;
  params: Record<string, CatalogParam>;
  type: "image" | "video" | "audio";
  display_name: string;
  description: string;
  tool_names: string[];
  visibility: string;
  icon_url: string;
  series_id: string;
  hot: boolean;
  mention_name: string;
  hideInModelPicker?: boolean;
  hiddenParamsByImageMode?: Record<string, string[]>;
  promptLabel?: "prompt" | "text" | "musicStyle";
}

export type CatalogParam = { type: "select"; label: string; default: string; options: string[] };

export interface ModelCatalog {
  imageModels: CatalogModel[];
  videoModels: CatalogModel[];
  audioModels: CatalogModel[];
  textModels: { id: string; name: string; provider: string }[];
  defaultTextModelId: string;
}

/** 目录里模型的 backend。所有模型都走同一个自建平台，按模型名路由。 */
export const MAAS_BACKEND = "maas";

/**
 * 从本机配置生成模型目录。每个配了的模型一条；同一个 checkpoint 配在两个槽位上
 * （例如文生图和图生图是同一个）只出一条，不然选择器里会出现两个一模一样的名字。
 */
export function buildCatalog(cfg: MediaConfig): ModelCatalog {
  const m = cfg.models;
  const image: CatalogModel[] = [];
  const video: CatalogModel[] = [];
  const audio: CatalogModel[] = [];
  const seen = new Set<string>();
  const add = (list: CatalogModel[], model: string | null, entry: (id: string) => CatalogModel) => {
    if (!model || seen.has(model)) return;
    seen.add(model);
    list.push(entry(model));
  };

  add(image, m.image, (id) => media(id, "image", ["hub_generate_image"], { max_refs: m.image_edit ? 10 : 0, params: toParams(params.forModality("image")) }));
  add(image, m.image_edit, (id) =>
    media(id, "image", ["hub_generate_image"], { max_refs: 10, params: toParams(params.forModality("image_edit")), hideInModelPicker: m.image !== null }),
  );
  add(video, m.video, (id) =>
    media(id, "video", ["hub_generate_video"], {
      max_refs: 2,
      imageMode: "first-last-frame",
      params: toParams(params.forModality("video")),
      hiddenParamsByImageMode: { "first-last-frame": ["aspect_ratio"] },
    }),
  );
  add(video, m.video_ref, (id) =>
    media(id, "video", ["hub_generate_video"], { max_refs: 4, max_video_refs: 3, max_audio_refs: 3, imageMode: "reference", params: toParams(params.forModality("video_ref")) }),
  );
  add(audio, m.speech, (id) => media(id, "audio", ["hub_generate_audio_speech"], { max_refs: 0, params: {}, promptLabel: "text" }));
  add(audio, m.music, (id) => media(id, "audio", ["hub_generate_audio_music"], { max_refs: 0, params: {}, promptLabel: "musicStyle" }));
  add(audio, m.music_edit, (id) => media(id, "audio", ["hub_generate_audio_music"], { max_refs: 0, max_audio_refs: 1, params: {}, promptLabel: "musicStyle" }));

  const chat = cfg.platform.chat_model.trim();
  const textModels = chat ? [{ id: chat, name: chat, provider: "user-custom-maas" }] : [];
  return { imageModels: image, videoModels: video, audioModels: audio, textModels, defaultTextModelId: textModels[0]?.id ?? "" };
}

function media(
  id: string,
  type: CatalogModel["type"],
  tools: string[],
  extra: Partial<CatalogModel> & Pick<CatalogModel, "max_refs" | "params">,
): CatalogModel {
  return {
    id,
    name: id,
    backend: MAAS_BACKEND,
    model_name: id,
    type,
    display_name: id,
    description: "",
    tool_names: tools,
    visibility: "",
    icon_url: "",
    series_id: id,
    hot: false,
    mention_name: id,
    ...extra,
  };
}

function toParams(specs: params.ParamSpec[]): Record<string, CatalogParam> {
  return Object.fromEntries(specs.map((s) => [s.name, { type: "select", label: s.label, default: s.default, options: s.options }]));
}

/** 配置里的 voice_map → 音色列表。平台没有预设音色，每个音色是映射到的一段参考音频。 */
export function voicesFrom(cfg: MediaConfig) {
  return Object.entries(cfg.models.voice_map).map(([voice_id, ref]) => ({
    voice_id,
    name: voice_id,
    description: "",
    language: "",
    gender: "",
    age: "",
    accent: "",
    sample_audio: /^https?:\/\//.test(ref) ? ref : "",
  }));
}
