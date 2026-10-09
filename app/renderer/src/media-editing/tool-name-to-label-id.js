// tool-name-to-label-id.js

const TOOL_NAME_TO_LABEL_ID = {
  // Unified media generation and editing surface.
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
  hub_image_enhance: "mediaGen",
  hub_image_layer_decompose: "mediaGen",
  hub_subtitle_format: "contentProcess",
  hub_media_transcribe: "contentProcess",
  hub_audio_analyze_music: "contentProcess",
  hub_audio_separate: "contentProcess",
  hub_audio_meta: "contentProcess",
  hub_ffmpeg: "contentProcess",
  // Orchestration and capability inspection.
  hub_capability_search: "searchInfo",
  hub_list_capabilities: "transient",
  hub_search_knowledge: "transient",
  hub_select_image_recipe: "transient",
  hub_report_outcome: "transient",
  hub_get_model_concurrency: "transient",
  // ComfyUI workflow surface.
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
  browser: "browser",
  hub_browser: "browser",
  // Interaction and built-in skill loading.
  hub_connector_authorize: "connectorOp",
  question: "askUser",
  hub_preview_and_collect_feedback: "askUser",
  skill: "skillOp",
  // Canvas mutation and inspection.
  hub_canvas_write_node: "canvasOp",
  hub_canvas_apply_text_edits: "canvasOp",
  hub_canvas_group_nodes: "canvasOp",
  hub_canvas_group_recent_outputs: "canvasOp",
  hub_canvas_ungroup_node: "canvasOp",
  hub_canvas_get_node: "transient",
  hub_canvas_list_nodes: "transient",
  hub_canvas_grep_text: "transient",
  hub_canvas_read_text: "transient",
  // Production plan surface.
  hub_plan_write: "planOp",
  hub_plan_replan: "planOp",
  hub_plan_get_stage_detail: "transient",
  hub_plan_get_stage_status: "transient",
  hub_plan_get_work_items: "transient",
  hub_plan_patch_stage: "transient",
  hub_plan_update_stage_state: "transient",
  // Memory activity is transient process feedback.
  hub_memory: "transient",
  // Search and asset discovery.
  glob: "searchInfo",
  grep: "searchInfo",
  webfetch: "searchInfo",
  hub_web_media: "searchInfo",
  hub_image_search: "searchInfo",
  hub_asset_center_search: "searchInfo",
  hub_asset_center_use_entity: "searchInfo",
  // File and media inspection.
  hub_read: "fileOp",
  hub_analyse_media: "fileOp",
  bash: "fileOp",
  // Generic plugin-agent bridge.
  hub_plugin_agent_open_editor: "canvasOp",
  hub_plugin_agent_describe: "canvasOp",
  hub_plugin_agent_invoke: "canvasOp",
  // Internal built-ins.
  task: "silent",
  todowrite: "silent",
};

const PREFIX_RULES = [
  [/^apify_/iu, "connectorOp"],
  [/^fastmoss(?:-mcp)?_/iu, "connectorOp"],
  [/^shopify(?:-mcp)?_/iu, "connectorOp"],
  [/^hub_plugin_agent_/, "canvasOp"],
  [/^hub_skill_/, "skillOp"],
  [/^hub_asset_center_/, "searchInfo"],
  [/^hub_preview_/, "askUser"],
];

export function getBuiltInToolLabelId(toolName2) {
  const exact = Object.hasOwn(TOOL_NAME_TO_LABEL_ID, toolName2)
    ? TOOL_NAME_TO_LABEL_ID[toolName2]
    : void 0;
  if (exact) return exact;
  for (const [pattern, labelId] of PREFIX_RULES) {
    if (pattern.test(toolName2)) return labelId;
  }
  return void 0;
}
