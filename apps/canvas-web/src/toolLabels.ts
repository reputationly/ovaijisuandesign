import type { ToolActivity } from "./api"

/**
 * 工具调用在对话栏里怎么显示。
 *
 * 三张表**逐条照官方 3.0.12**（`TOOL_NAME_TO_LABEL_ID` /
 * `TOOL_LABEL_DEFINITIONS` / `TRANSIENT_TOOL_LABEL_KEYS`），文案取的是
 * `chat.toolLabel.*` 的中文那一份。
 *
 * 为什么要照抄而不是自己起名：这一栏是用户判断"agent 在干什么"的唯一依据。
 * 官方把 58 个工具归成 10 类，是因为用户不需要知道调的是
 * `hub_canvas_group_recent_outputs` 还是 `hub_canvas_ungroup_node` ——
 * 都是"处理画布内容"。自己分类的话，同一个操作在两边看起来是两回事。
 */

/** 工具 → 类别。键带 `hub_` 前缀，和上报的名字一致。 */
const TOOL_NAME_TO_LABEL_ID: Record<string, string> = {
  // 媒体生成与编辑
  hub_generate_image: "mediaGen",
  hub_generate_video: "mediaGen",
  hub_generate_audio_speech: "mediaGen",
  hub_generate_audio_music: "mediaGen",
  hub_music_cover: "mediaGen",
  hub_voice_prepare: "mediaGen",
  hub_lyrics_generation: "mediaGen",
  hub_merge_videos: "mediaGen",
  hub_batch_lip_sync: "mediaGen",
  hub_image_remove_background: "mediaGen",
  hub_subtitle_format: "contentProcess",
  hub_media_transcribe: "contentProcess",
  hub_audio_analyze_music: "contentProcess",
  hub_audio_separate: "contentProcess",
  hub_audio_meta: "contentProcess",
  hub_ffmpeg: "contentProcess",
  // 编排与能力查询
  hub_list_capabilities: "transient",
  hub_search_knowledge: "transient",
  hub_select_image_recipe: "transient",
  hub_report_outcome: "transient",
  hub_get_model_concurrency: "transient",
  // ComfyUI
  hub_open_comfyui: "canvasOp",
  hub_add_comfyui_workflow: "canvasOp",
  hub_edit_comfyui_workflow: "silent",
  hub_save_comfyui_workflow: "silent",
  hub_save_comfyui_run_as_workflow: "silent",
  hub_list_comfyui_template: "transient",
  hub_list_comfyui_workflow: "transient",
  hub_get_comfyui_workflow: "transient",
  hub_run_comfyui_workflow: "transient",
  hub_get_comfyui_run_status: "transient",
  // 交互与 skill
  question: "askUser",
  hub_preview_and_collect_feedback: "askUser",
  skill: "skillOp",
  // 画布
  hub_canvas_write_node: "canvasOp",
  hub_canvas_apply_text_edits: "canvasOp",
  hub_canvas_group_nodes: "canvasOp",
  hub_canvas_group_recent_outputs: "canvasOp",
  hub_canvas_ungroup_node: "canvasOp",
  hub_canvas_get_node: "transient",
  hub_canvas_list_nodes: "transient",
  hub_canvas_grep_text: "transient",
  hub_canvas_read_text: "transient",
  // 制作计划
  hub_plan_write: "planOp",
  hub_plan_replan: "planOp",
  hub_plan_get_stage_detail: "transient",
  hub_plan_get_stage_status: "transient",
  hub_plan_get_work_items: "transient",
  hub_plan_patch_stage: "transient",
  hub_plan_update_stage_state: "transient",
  hub_memory: "transient",
  // 搜索与素材发现
  glob: "searchInfo",
  grep: "searchInfo",
  webfetch: "searchInfo",
  hub_web_media: "searchInfo",
  hub_image_search: "searchInfo",
  hub_asset_center_search: "searchInfo",
  hub_asset_center_use_entity: "searchInfo",
  // 文件与媒体检视
  hub_read: "fileOp",
  hub_analyse_media: "fileOp",
  bash: "fileOp",
  // 插件桥
  hub_plugin_agent_open_editor: "canvasOp",
  hub_plugin_agent_describe: "canvasOp",
  hub_plugin_agent_invoke: "canvasOp",
  // 内置
  task: "silent",
  todowrite: "silent",
}

/** 类别 → 文案。`silent` 的文案是空串，官方用它表示这一条根本不显示。 */
const LABELS: Record<string, string> = {
  mediaGen: "生成媒体",
  askUser: "等待回答",
  canvasOp: "处理画布内容",
  planOp: "处理制作计划",
  spawnSubtask: "处理子任务",
  skillOp: "加载Skill",
  searchInfo: "查找信息",
  fileOp: "处理文件",
  contentProcess: "处理媒体",
  transient: "处理中",
  silent: "",
}

/**
 * 一批 `transient` 的工具有自己更具体的文案。
 *
 * 没有这张表的话，`hub_canvas_read_text` 和 `hub_memory` 都只会显示
 * "处理中" —— 一连串"处理中"等于什么都没说。
 */
const TRANSIENT_LABELS: Record<string, string> = {
  hub_canvas_get_node: "获取画布内容",
  hub_canvas_list_nodes: "查看画布节点",
  hub_canvas_grep_text: "检索文档内容",
  hub_canvas_read_text: "阅读文档片段",
  hub_plan_get_stage_status: "查看计划状态",
  hub_plan_get_stage_detail: "查看阶段详情",
  hub_plan_get_work_items: "查看工作项",
  hub_plan_patch_stage: "更新阶段计划",
  hub_plan_update_stage_state: "推进阶段",
  hub_memory: "管理记忆",
  hub_search_knowledge: "查阅知识库",
  hub_select_image_recipe: "挑选图像配方",
  hub_list_capabilities: "查询可用能力",
  hub_report_outcome: "汇报阶段产出",
  hub_list_comfyui_template: "正在读取 ComfyUI 工作流列表",
  hub_list_comfyui_workflow: "正在读取 ComfyUI 工作流列表",
  hub_get_comfyui_workflow: "正在读取 ComfyUI 工作流",
  hub_run_comfyui_workflow: "正在提交 ComfyUI 工作流",
  hub_get_comfyui_run_status: "正在查询 ComfyUI 工作流状态",
}

/**
 * 官方把这几个渲染成"思考"而不是工具卡片。
 *
 * 这三个都是 agent 在决定怎么做之前查资料，不是它做了什么 ——
 * 当成工具卡片会让活动流里混进一堆和产物无关的条目。
 *
 * 注意 `todowrite` 在上面那张表里是 `silent`，也就是**根本不显示** ——
 * 两张表就是这么重叠的，silent 先生效。留着它是为了和官方逐条对齐：
 * 以后接上 opencode 自己的工具流时，这一条会自己活过来。
 */
export const THINKING_TOOLS = new Set([
  "todowrite",
  "hub_search_knowledge",
  "hub_select_image_recipe",
])

/**
 * 一个工具该显示什么。
 *
 * 认不出的工具**回名字本身**而不是"处理中"：我们只实现了 58 个里的一部分，
 * 而 opencode 还会带自己的内置工具进来。回"处理中"的话，界面上一串一模一样
 * 的条目，排查时完全看不出是哪个工具在动。
 */
export function labelFor(tool: string): { text: string; silent: boolean } {
  const id = TOOL_NAME_TO_LABEL_ID[tool]
  if (id === "silent") return { text: "", silent: true }
  const specific = TRANSIENT_LABELS[tool]
  if (specific) return { text: specific, silent: false }
  if (id && LABELS[id]) return { text: LABELS[id], silent: false }
  return { text: tool.replace(/^hub_/, ""), silent: false }
}

/**
 * 一次调用的合并结果。gateway 分两条报（start，然后 ok/error），
 * 界面上要合成一条 —— 分两行显示的话，一次成功的调用会占两行，
 * 而用户看到的"做了几件事"就翻倍了。
 */
export interface Call {
  id: string
  tool: string
  phase: "start" | "ok" | "error"
  summary?: string
  error?: string
}

export function mergeCalls(entries: ToolActivity[]): Call[] {
  const byId = new Map<string, Call>()
  const order: string[] = []
  for (const e of entries) {
    // 没有 id 的（老数据、或者上报时丢了）各算一条，不要都挤进同一个 key。
    const id = e.id || `${e.tool}-${e.at}`
    const prev = byId.get(id)
    if (!prev) {
      order.push(id)
      byId.set(id, { id, tool: e.tool, phase: e.phase, summary: e.summary, error: e.error })
      continue
    }
    // 终态压过 start；**start 不能压过已有的终态** —— 乱序到达时
    // 一次已经失败的调用会退回转圈状态，永远转下去。
    if (e.phase !== "start") {
      prev.phase = e.phase
      prev.error = e.error ?? prev.error
    }
  }
  return order.map((id) => byId.get(id)!).filter((c) => !labelFor(c.tool).silent)
}
