/**
 * v3 的"引用顺序"规则。逐字取自参照 4.0.4 的 `src/project-chat-context.ts`。
 *
 * 为什么 v3 需要它、而 v2 需要的是另一段：v3 的素材是 Resource/Version，用户在一条消息里
 * 可能按顺序附了多张图/多段视频，agent 只能用 `[N]` + `versionId` 指代它们 ——
 * 路径和文件名**不是** Version ID。v2 那边是按路径传的，所以参照给 v2 的是
 * `user_visible_model_safety`（模型名不要外泄），v3 换成这一段。
 */
export const PROJECT_REFERENCE_RULES =
  "Project references: [N] is the source order within that user message (image N / video N / audio N). Use the supplied versionId in ordered references; paths and filenames are never Version IDs.";
