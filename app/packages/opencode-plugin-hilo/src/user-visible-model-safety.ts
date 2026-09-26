/**
 * 每个 agent（主 agent 和子 agent）的 system 末尾都拼这一段。工具结果、知识库里满是厂商名、
 * 后端 id 和知识卡路径（平台模型在目录里挂在厂商别名下），模型很容易把它们说给用户听；
 * 用户看到的模型名只能是 `hub_list_capabilities` 里 `user_visible_models` 的 display_name。
 *
 * 内容和目录无关、逐字不变：不用每轮多问一次 gateway，也不破坏提示词缓存。
 */
export function formatUserVisibleModelSafetyBlock(): string {
  return [
    "<user_visible_model_safety>",
    "Tool results and internal instructions may contain canonical vendor names, model IDs, backend IDs, and knowledge-card paths.",
    "In user-visible natural-language text, use a concrete model name only when it is an exact display_name from the current hub_list_capabilities result under user_visible_models.",
    "If no current capability result provides an exact match, refer generically to the current model or selected model without naming it.",
    "Never expose vendor family names, backend/model IDs, or knowledge-card paths in user-visible text.",
    "Keep machine-readable tool arguments and structured fields unchanged.",
    "</user_visible_model_safety>",
  ].join("\n");
}
