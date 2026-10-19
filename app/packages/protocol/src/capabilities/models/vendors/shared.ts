/**
 * 各厂商能力表共用的字段描述。
 *
 * 同一个语义（画幅、分辨率）在不同厂商那里的取值不同，但**描述的措辞必须一致**：
 * 这些描述会进工具定义给模型看，措辞不一致模型就会按厂商记两套规则，进而反复试探。
 * 所以措辞放在这里统一，只有取值范围由各厂商自己给。
 *
 * 描述里反复强调「不传就继承默认/参考素材」，是因为模型倾向于把参数填满 ——
 * 而多传一个显式取值往往意味着更高档位、更高成本。
 */
import { booleanParam, enumParam } from "../vendor.js";

export const IMAGE_ASPECT_RATIO = (values: readonly string[]) =>
  enumParam(
    values,
    "Output aspect ratio. Omit it to inherit the nearest supported ratio of the first image reference; required without image references (the default only presets UI forms). Pass it only for an explicit user, platform or project framing.",
  );

export const IMAGE_RESOLUTION = (values: readonly string[]) =>
  enumParam(
    values,
    "Output size tier. Omit it to use the default; a tier above the default increases cost and requires the user's requested tier or acceptance of a cost proposal.",
  );

export const VIDEO_ASPECT_RATIO = (values: readonly string[]) => enumParam(values, "Output frame ratio.");

export const VIDEO_RESOLUTION = (values: readonly string[]) =>
  enumParam(
    values,
    "Output size tier. Omit it to use the default; a tier above the default increases cost and requires the user's requested tier or acceptance of a cost proposal.",
  );

/** 音频开关，默认打开。 */
export const VIDEO_AUDIO = { ...booleanParam("Audio switch."), default: true };

export interface ParamSchema {
  type: string;
  enum?: readonly string[];
  description?: string;
  default?: unknown;
  [key: string]: unknown;
}

/**
 * 厂商能力表的类型。
 *
 * 上游把这类定义放在 `capabilities/types.ts`，但那个文件在 preload 产物里是**残的**
 *（只留下一个 `CAPABILITY_OPERATIONS`，其余被 tree-shaking 去掉）。所以这里按
 * 14 个厂商模块实际用到的形状补出来 —— 字段是从产物里逐个对出来的，不是猜的。
 *
 * 把这些类型写出来还有一个直接好处：各厂商的 `prepare` 是**内联解构**
 *（`({ modelId, prompt, params, media }) => ...`），只要给厂商对象标上类型，
 * 解构参数就自动有类型了，不用逐个回调去标。
 */

/** 音色目录的一项。 */
export interface VoiceEntry {
  voice_id: string;
  name: string;
  language: string;
  [key: string]: unknown;
}

/** 厂商能力表收到的请求。两种形态：给「素材」或给「引用」。 */
export interface VendorPrepareRequest {
  modelId: string;
  /**
   * 提示词与引用素材都按**必填**处理（可以为空串 / 空数组）。
   * 上游的 `prepare` 直接写 `prompt.trim()`、`references.map(...)`，没有兜底 ——
   * 写成可选虽然「更稳」，但和上游行为不一致（见计划里 fixed.ts 那次教训）。
   */
  prompt: string;
  params: Record<string, unknown>;
  media: { image: string[]; video: string[]; audio: string[] };
  references: ReadonlyArray<Record<string, unknown>>;
  /** 少数厂商特有的调度字段（例如 MiniMax 的生成模式）。 */
  mode?: string;
  /** 语音厂商用：账号下可用的音色目录（调用方在生成前查好放进来）。 */
  voices?: ReadonlyArray<VoiceEntry>;
  [key: string]: unknown;
}

/** `prepare` 产出的请求体片段。后端收的是字符串参数字典。 */
export interface VendorPreparedRequest {
  backend: string;
  model_id: string;
  prompt?: string;
  params?: Record<string, string>;
  image_paths?: string[];
  video_paths?: string[];
  audio_paths?: string[];
  [key: string]: unknown;
}

/** 单个模型的说明与它支持的参数取值。 */
export interface VendorModel {
  description: string;
  /** 计费档位名。不写就按 `model_id` 计。 */
  pricing?: string;
  /** 下面几个是少数厂商在自己模型上带的调度元数据，见各自模块。 */
  /** 各生成模式是否必须给提示词。 */
  promptModes?: Record<string, "required" | "optional" | "forbidden">;
  /** 某模式下不该出现的参数。 */
  paramsNotInMode?: Record<string, readonly string[]>;
  /** 某模式下至少需要几个引用素材。 */
  minReferencesInMode?: Record<string, number>;
  /** 从已有参数推导出别的参数（旧界面遗留的规则）。 */
  paramDerivations?: readonly Record<string, unknown>[];
  /** 该模型支持的参数取值。有些模型没有可调项，所以可选。 */
  params?: Record<string, unknown>;
}

/** 一个厂商的能力表。 */
export interface VendorEntry {
  vendor: string;
  modality: string;
  backend: string;
  /** 知识库文档路径（相对 `agent-profiles`），模型选型时会读它。不是每个厂商都有。 */
  knowledgeCard?: string;
  models: Record<string, VendorModel>;
  params: Record<string, unknown>;
  prepare: (request: VendorPrepareRequest) => VendorPreparedRequest;
  /** 少数厂商特有的字段，见各自模块。 */
  type?: string;
  speed?: string;
  requiredParams?: readonly string[];
  [key: string]: unknown;
}
