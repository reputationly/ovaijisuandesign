/**
 * 生成参数。**选项由后端按模态下发，不在这里写死。**
 *
 * ## 为什么
 *
 * 输入框以前写死一套 `RATIOS` + `RESOLUTIONS = ["1K","2K"]`,不管当前要
 * 生成什么。它在对话框里是**无主的** —— 用户看着那排下拉，不知道它说的是
 * 图片还是视频。这不只是观感问题，实测踩出一串"不报错的错"：
 *
 * - **视频没有 1K 这个档位。** 选 1K 之后后端 `resolve_size` 认不出，
 *   落进 768 的兜底 —— 出来 768P，而界面上一直显示 1K。
 * - **首帧驱动的视频不该选比例**（比例由那张图定）。强塞一个的结果是平台
 *   把 size 反推成 `32:57`,直接拒掉整个任务。
 * - **时长对图片毫无意义**,却一直摆在那儿。
 *
 * 官方把 `params` 挂在**模型**上（`MiniMax-H3-Max.params = {...}`）,
 * 我们照这个思路，粒度先做到模态 —— 见 gateway 的 `maas_media::params`。
 *
 * ## 和官方的一处结构差异
 *
 * 官方的参数芯片挂在**画布上的生成节点**上，那里"要生成什么"是确定的。
 * 我们的生成全部由 agent 发起，**打字的那一刻还不知道是图还是视频** ——
 * 所以芯片里按模态分区全列出来，agent 用哪个模态就应用哪一区。
 */

/** 后端 `/api/capabilities` 里每个模态带的参数定义。 */
export interface ParamSpec {
  /** 字段名，和生成接口收的一致。 */
  name: string
  label: string
  options: string[]
  default: string
}

export interface Capability {
  modality: string
  available: boolean
  model: string | null
  params?: ParamSpec[]
}

/** 芯片里显示的分区。 */
export interface ParamGroup {
  /** 模态名，提交时按它归组。 */
  modality: string
  title: string
  model: string | null
  specs: ParamSpec[]
}

const TITLE: Record<string, string> = {
  image: "图片",
  video: "视频",
}

/**
 * 把能力清单整理成界面上的分区。
 *
 * **只留有参数可调的模态。** 音乐/语音没有画幅可言（后端给的是空表）——
 * 摆一个永远不起作用的比例下拉比不摆更糟。
 *
 * `image_edit` / `video_ref` 并进 `image` / `video`：对用户来说"改图"和
 * "生图"是同一件事的两种输入，分成四区只会让这个面板更难读。并进去时取
 * **主模态**的参数（`image` 有比例，`image_edit` 没有）。
 */
export function groupParams(caps: readonly Capability[]): ParamGroup[] {
  const out: ParamGroup[] = []
  for (const key of ["image", "video"]) {
    const c = caps.find((x) => x.modality === key)
    if (!c?.available) continue
    const specs = c.params ?? []
    if (specs.length === 0) continue
    out.push({ modality: key, title: TITLE[key] ?? key, model: c.model, specs })
  }
  return out
}

/** 每个分区的当前取值。`{ image: { aspect_ratio: "1:1" }, … }` */
export type ParamValues = Record<string, Record<string, string>>

/** 用各分区的默认值初始化。 */
export function defaultValues(groups: readonly ParamGroup[]): ParamValues {
  const v: ParamValues = {}
  for (const g of groups) {
    v[g.modality] = Object.fromEntries(g.specs.map((s) => [s.name, s.default]))
  }
  return v
}

/**
 * 合并进已有取值：**保留用户已经改过的**,只给新出现的键补默认值。
 *
 * 能力清单会重拉（比如改了设置里的模型），重拉后直接用默认值覆盖的话，
 * 用户刚选好的比例会被悄悄改回去。
 */
export function mergeValues(groups: readonly ParamGroup[], prev: ParamValues): ParamValues {
  const next: ParamValues = {}
  for (const g of groups) {
    const old = prev[g.modality] ?? {}
    next[g.modality] = Object.fromEntries(
      g.specs.map((s) => [
        s.name,
        // 旧值必须仍是合法选项 —— 换了模型之后 `1K` 可能已经不在表里了，
        // 留着的话提交下去又是一次"选了 1K 实际出 768"。
        s.options.includes(old[s.name] ?? "") ? old[s.name]! : s.default,
      ]),
    )
  }
  return next
}

/** 界面上显示的选项文案。`adaptive` / `auto` 是后端的值，不直接给人看。 */
export function optionLabel(name: string, value: string): string {
  if (value === "adaptive") return "自适应"
  if (value === "auto") return "自动"
  if (name === "duration") return `${value}s`
  return value
}

/**
 * 提交时带上的参数。
 *
 * **`adaptive` / `auto` 不传。** 它们的意思就是"让平台按输入素材定"——
 * 传一个空串或字面量下去，后端会当成用户明确要求，反而覆盖掉那个判断。
 */
export function toPayload(values: ParamValues): {
  aspectRatio?: string
  resolution?: string
  duration?: number
} {
  const pick = (modality: string, key: string) => {
    const v = values[modality]?.[key]
    return v && v !== "adaptive" && v !== "auto" ? v : undefined
  }
  // 图片和视频各有一套，而提交时只有一组字段。**取视频那套优先** ——
  // 视频参数更严格（档位是 P 制、比例有白名单），拿图片的 1K 去生成视频
  // 会落进后端的兜底；反过来把 768P 用在图片上只是尺寸小一点，不会失败。
  //
  // 真正按模态分发在 agent 那边：它知道自己要调哪个工具。这里只是把两套
  // 都送过去的一个折中 —— 见下面 `perModality`。
  const ar = pick("video", "aspect_ratio") ?? pick("image", "aspect_ratio")
  const res = pick("video", "resolution") ?? pick("image", "resolution")
  const dur = pick("video", "duration")
  return {
    ...(ar ? { aspectRatio: ar } : {}),
    ...(res ? { resolution: res } : {}),
    ...(dur ? { duration: Number.parseInt(dur, 10) } : {}),
  }
}

/**
 * 按模态分开的完整取值。后端拿它给**对应的工具**兜底 ——
 * 调 `generate_image` 用 image 那套，调 `generate_video` 用 video 那套。
 *
 * 这才是正解，`toPayload` 只是为了兼容还没改的旧字段。
 */
export function perModality(values: ParamValues): ParamValues {
  const out: ParamValues = {}
  for (const [modality, kv] of Object.entries(values)) {
    const kept = Object.fromEntries(
      Object.entries(kv).filter(([, v]) => v && v !== "adaptive" && v !== "auto"),
    )
    if (Object.keys(kept).length > 0) out[modality] = kept
  }
  return out
}
