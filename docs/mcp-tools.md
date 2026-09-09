# MCP 工具面

官方 `mcp-tools` 注册的**全部 58 个工具**。opencode 按 MCP server 名加前缀，
所以 agent 侧看到的是 `hub_<name>`。

这是**要对齐的接口规格** —— 名字和入参保持一致，官方那套 agent 配置就能直接
驱动我们的实现。入参名从 zod `inputSchema` 提取，类型和可选性没有提取，
实现时去源文件核对。

> 只记接口事实，不含任何官方文件的原文。
> 由 `scripts/extract-mcp-tools.py` 生成，应用升级后重跑。

## 画布（9）

| 工具 | 入参 |
|---|---|
| `canvas_list_nodes` | `limit`, `offset`, `type` |
| `canvas_get_node` | `nodeId`, `nodeIds` |
| `canvas_grep_text` | `contextAfter`, `contextBefore`, `maxMatches`, `nodeId`, `query`, `regex` |
| `canvas_read_text` | `limitLines`, `nodeId`, `offsetLine` |
| `canvas_apply_text_edits` | `editSessionId`, `edits`, `expectedContentHash`, `nodeId`, `requestId` |
| `canvas_group_nodes` | `label`, `nodeIds` |
| `canvas_group_recent_outputs` | `label` |
| `canvas_write_node` | `allowDuplicate`, `assetPath`, `columns`, `content`, `expectedContentHash`, `filter`, `items`, `kind`, `mode`, `name`, `nodeId`, `rowHeight`, `rows`, `sourceNodeId`, `sourceNodeIds`, `title` |
| `canvas_ungroup_node` | `groupId` |

## 计划编排（7）

| 工具 | 入参 |
|---|---|
| `plan_get_work_items` | `plan_id`, `projectRoot`, `stage_id`, `work_item_ids` |
| `plan_get_stage_status` | `order`, `plan_id`, `projectRoot`, `stage_id` |
| `plan_get_stage_detail` | `order`, `plan_id`, `projectRoot`, `stage_id` |
| `plan_update_stage_state` | `expected_revision`, `plan_id`, `projectRoot`, `updates` |
| `plan_replan` | `expected_revision`, `operations`, `plan_id`, `preserve_through_stage_id`, `projectRoot`, `reason`, `request_id`, `resume_stage_id`, `workflow_path`, `workflow_variant` |
| `plan_write` | `expected_revision`, `plan`, `plan_id`, `projectRoot` |
| `plan_patch_stage` | `after_order`, `expected_revision`, `omit`, `plan_id`, `projectRoot`, `remove`, `stage`, `stage_id` |

## 生成 · 图片（4）

| 工具 | 入参 |
|---|---|
| `generate_image` | `aspect_ratio_evidence`, `aspect_ratio_source`, `count`, `filename`, `filenames`, `image_paths`, `model_id`, `order`, `orders`, `prompt`, `prompts`, `vendor`, `vendor_params` |
| `image_remove_background` | `filename`, `image_path`, `source_node_id` |
| `select_image_recipe` | `modality`, `user_request` |
| `image_search` | `max_images_per_query`, `min_dimension`, `queries` |

## 生成 · 视频（3）

| 工具 | 入参 |
|---|---|
| `generate_video` | `audio_path`, `duration`, `filename`, `first_frame_image`, `last_frame_image`, `mode`, `model_id`, `order`, `prompt`, `reference_audio_urls`, `reference_image_paths`, `reference_video_urls`, `vendor`, `vendor_params`, `video_url` |
| `batch_lip_sync` | `audio_paths`, `filenames`, `video_paths` |
| `merge_videos` | `filename`, `scale_mode`, `source_node_id`, `target_height`, `target_width`, `video_paths` |

## 生成 · 语音（2）

| 工具 | 入参 |
|---|---|
| `generate_audio_speech` | `emotions`, `filename`, `filenames`, `format`, `language_boost`, `model_name`, `pitches`, `pronunciation_dict`, `reference_audio_paths`, `reference_image_path`, `sample_rate`, `speeds`, `texts`, `vendor`, `voice_id`, `voice_id_source`, `voice_ids`, `voice_modify`, `vols`, `volumes` |
| `voice_prepare` | `items` |

## 生成 · 音乐（3）

| 工具 | 入参 |
|---|---|
| `generate_audio_music` | `filename`, `lyrics`, `mode`, `model_id`, `prompt`, `vendor` |
| `music_cover` | `action`, `audio`, `cover_feature_id`, `filename`, `lyrics`, `prompt`, `source_node_id` |
| `lyrics_generation` | `lyrics`, `mode`, `prompt`, `title` |

## 后期处理（6）

| 工具 | 入参 |
|---|---|
| `audio_meta` | `audio_path` |
| `ffmpeg` | `args`, `filename`, `metadata`, `output_type`, `preserve_source_canvas_node`, `replace_node_id` |
| `media_transcribe` | `audio_path`, `file_path`, `filename`, `language`, `mode`, `total_duration` |
| `subtitle_format` | `cjk_chars_per_line`, `english_words_per_line`, `filename`, `font_name`, `font_scale`, `font_size`, `format`, `margin_l`, `margin_r`, `margin_v`, `max_lines`, `output_size`, `position`, `safe_area`, `source_srt_path`, `style_preset`, `unsafe_override` |
| `audio_analyze_music` | `audio_path`, `num_segments` |
| `audio_separate` | `audio_path`, `filename`, `source_node_id`, `video_path` |

## 资产与文件（5）

| 工具 | 入参 |
|---|---|
| `asset_center_search` | `limit`, `q`, `type` |
| `asset_center_use_entity` | `entity_id`, `workspace_path` |
| `read` | `file_path`, `limit`, `offset` |
| `analyse_media` | `file_path`, `file_paths`, `force`, `question`, `type` |
| `web_media` | `container`, `filename`, `format_id`, `include_auto_subtitles`, `max_items`, `playlist_mode`, `quality`, `source_node_id`, `subtitle_format`, `subtitle_languages`, `type`, `url` |

## 记忆与知识（3）

| 工具 | 入参 |
|---|---|
| `memory` | `action`, `asset_modality`, `asset_uri`, `body`, `description`, `name`, `projectRoot`, `query`, `scope`, `type` |
| `search_knowledge` | `category`, `limit`, `query`, `topic` |
| `report_outcome` | `outcomes` |

## ComfyUI（10）

| 工具 | 入参 |
|---|---|
| `list_comfyui_template` | `locale` |
| `list_comfyui_workflow` | — |
| `get_comfyui_workflow` | `include_graph`, `include_parameters`, `source_node_id`, `workflow_id` |
| `run_comfyui_workflow` | `count`, `expected_source_sha256`, `input_bindings`, `input_values`, `overrides`, `repair_operations`, `review_mode`, `source_node_id`, `workflow_id` |
| `edit_comfyui_workflow` | `expected_source_sha256`, `input_bindings`, `operations`, `source_node_id`, `workflow_id` |
| `save_comfyui_workflow` | `expected_source_sha256`, `mode`, `name`, `overwrite_existing`, `source_node_id` |
| `save_comfyui_run_as_workflow` | `mode`, `name`, `output_node_id`, `overwrite_existing`, `run_id` |
| `get_comfyui_run_status` | `batch_id`, `max_wait_seconds` |
| `add_comfyui_workflow` | `workflow_id` |
| `open_comfyui` | `workflow` |

## 插件（4）

| 工具 | 入参 |
|---|---|
| `plugin_agent_open_editor` | `initialMessage`, `nodeId`, `sourceNodeIds` |
| `plugin_agent_describe` | `nodeId` |
| `plugin_agent_invoke` | `args`, `method`, `nodeId` |
| `preview_and_collect_feedback` | `args`, `feedback_path`, `script` |

## DAG / 其他（2）

| 工具 | 入参 |
|---|---|
| `list_capabilities` | `modality` |
| `get_model_concurrency` | `models` |
