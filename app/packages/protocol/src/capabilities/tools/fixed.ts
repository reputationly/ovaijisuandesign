/**
 * 「固定路由」工具的定义模板。
 *
 * 有些后端不接受自由提示词，只能按固定模板出图/出片（例如只吃「参考图 + 参数」的那些）。
 * 这类工具不写各自的 `prepare`，而是共用这一个：把 `compile` 产出的片段铺进请求体，
 * 缺什么补什么。这样新增一个固定路由只需给一份 `provider` 和一段 `compile`。
 */
import { wire } from "../request.js";

export interface FixedProvider {
  backend: string;
  model: string;
  [key: string]: unknown;
}

export interface FixedCompiled {
  prompt?: string;
  params?: Record<string, unknown>;
  image_paths?: string[];
}

/**
 * 调用方传进来的请求。
 *
 * 三个素材数组都是**必填**（可以为空数组）—— 上游就是这么定的：`prepare` 里直接
 * `[...request.media.image]`、`request.media.audio.length`，没有兜底。
 * 我第一版把这里写成可选并加了 `?? []`，看着更稳，实际是**改了行为**：
 * 上游在这种情况下会抛 TypeError，而「静默把 undefined 当空数组」会让上层拿到一份
 * 看似正常的请求，问题被推到后端才暴露。类型照上游写，行为才对得上。
 */
export interface FixedRequest<P = Record<string, unknown>> {
  prompt?: string;
  /** 工具自己的入参。由 `paramSchema` 在**运行时**校验，所以这里只能给到形状。 */
  params: P;
  media: { image: string[]; video: string[]; audio: string[] };
  /** 引用素材（按角色带过来的资源列表）。 */
  references: ReadonlyArray<Record<string, unknown>>;
}

export function fixed<P = Record<string, unknown>>(
  provider: FixedProvider,
  compile: (request: FixedRequest<P>) => FixedCompiled = () => ({}),
) {
  return {
    mode: "task" as const,
    route: "fixed" as const,
    ...provider,
    prepare: (request: FixedRequest<P>) => {
      const out = compile(request);
      return {
        backend: provider.backend,
        model_id: provider.model,
        // 提示词优先用 compile 给的；没给就退回调用方的
        prompt: out.prompt ?? request.prompt,
        // `model_name` 必须进参数表：后端靠它选模型，而不是靠 model_id
        params: wire({ ...out.params, model_name: provider.model }),
        // 图片路径优先用 compile 给的，其余来自调用方的素材（没有兜底，和上游一致）
        image_paths: [...(out.image_paths ?? request.media.image)],
        video_paths: [...request.media.video],
        // 音频是可选**字段**：空数组时整条不出现在请求体里
        ...(request.media.audio.length ? { audio_paths: [...request.media.audio] } : {}),
      };
    },
  };
}

/** 组一个对象参数。`required` 为空时不要留一个空数组字段。 */
export const objectParams = (properties: Record<string, unknown>, required?: string[]) => ({
  type: "object",
  properties,
  ...(required?.length ? { required } : {}),
});
