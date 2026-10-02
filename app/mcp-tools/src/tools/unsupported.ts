/**
 * 接口面里有、但我们平台还没有后端的工具 —— 第一波不注册。
 * agent 配置按这份名单从白名单里去掉它们；以后补上后端，写一个
 * `src/tools/<x>-tools.ts` 模块、在 index.ts 注册、再从这里删掉即可。
 */
export const UNSUPPORTED_TOOLS: readonly { name: string; reason: string }[] = [
  { name: "list_comfyui_template", reason: "no ComfyUI backend (featured workflow catalog)" },
  { name: "list_comfyui_workflow", reason: "no ComfyUI backend (workflow library)" },
  { name: "get_comfyui_workflow", reason: "no ComfyUI backend (workflow detail)" },
  { name: "run_comfyui_workflow", reason: "no ComfyUI backend (local ComfyUI runner)" },
  { name: "edit_comfyui_workflow", reason: "no ComfyUI backend (workflow draft editing)" },
  { name: "save_comfyui_workflow", reason: "no ComfyUI backend (workflow persistence)" },
  { name: "save_comfyui_run_as_workflow", reason: "no ComfyUI backend (run snapshots)" },
  { name: "get_comfyui_run_status", reason: "no ComfyUI backend (batch run status)" },
  { name: "add_comfyui_workflow", reason: "no ComfyUI backend (workflow canvas node)" },
  { name: "open_comfyui", reason: "no ComfyUI backend (editor surface)" },
  { name: "browser", reason: "no in-app browser automation surface" },
  { name: "connector_authorize", reason: "no remote connector / OAuth preparation service" },
  { name: "plugin_agent_open_editor", reason: "no canvas plugin agent bridge" },
  { name: "plugin_agent_describe", reason: "no canvas plugin agent bridge" },
  { name: "plugin_agent_invoke", reason: "no canvas plugin agent bridge" },
  { name: "web_media", reason: "no yt-dlp download service" },
  { name: "image_search", reason: "no web image search service" },
  { name: "asset_center_search", reason: "no cross-workspace subject library" },
  { name: "asset_center_use_entity", reason: "no cross-workspace subject library" },
  { name: "media_transcribe", reason: "no ASR service" },
  { name: "image_remove_background", reason: "no background removal service" },
  { name: "capability_search", reason: "no connector market / capability resolver (routes /api/connectors/capability-* absent)" },
  { name: "image_layer_decompose", reason: "no layer decomposition model on the configured platform" },
];

export const UNSUPPORTED_TOOL_NAMES: ReadonlySet<string> = new Set(UNSUPPORTED_TOOLS.map((t) => t.name));
