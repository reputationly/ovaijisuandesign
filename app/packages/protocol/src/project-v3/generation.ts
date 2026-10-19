/**
 * 项目 v3 的创作指令类型。
 *
 * 这四个是**指令名**，会出现在请求体和历史记录里，所以是稳定串值。
 * `generate_speech` / `generate_music` 和另外两个并列，说明音频走的是同一条指令通道 ——
 * 界面上「生成」按钮是共用的，靠这里的取值分发。
 */

/** 可发起生成的指令。 */
export const PROJECT_GENERATION_OPERATIONS = ["generate_image", "generate_video", "generate_speech", "generate_music"] as const;

export type ProjectGenerationOperation = (typeof PROJECT_GENERATION_OPERATIONS)[number];

/**
 * 单次生成的产物数量上限。
 *
 * 取 9 是后端的硬上限（9 宫格）；界面上的多选也用它，改这个值要连后端一起改。
 */
export const PROJECT_GENERATION_MAX_COUNT = 9;
