# MCP 工具面

官方 `mcp-tools` 注册的**全部 103 个工具**。opencode 按 MCP server 名加前缀，
所以 agent 侧看到的是 `hub_<name>`。

这是**要对齐的接口规格** —— 名字和入参保持一致，官方那套 agent 配置就能直接
驱动我们的实现。入参名从 zod `inputSchema` 提取，类型和可选性没有提取，
实现时去源文件核对。

> 只记接口事实，不含任何官方文件的原文。
> 由 `scripts/extract-mcp-tools.py` 生成，应用升级后重跑。

## 画布（14）

| 工具 | 入参 |
|---|---|
| `canvas_list_nodes` | `limit`, `offset`, `type` |
| `canvas_get_node` | `nodeId`, `nodeIds` |
| `canvas_grep_text` | `contextAfter`, `contextBefore`, `maxMatches`, `nodeId`, `query`, `regex` |
| `canvas_read_text` | `limitLines`, `nodeId`, `offsetLine` |
| `canvas_search_nodes` | `fields`, `limit`, `offset`, `query`, `type` |
| `canvas_write_text_node` | `content`, `expectedContentHash`, `mode`, `name`, `nodeId`, `sourceNodeIds` |
| `canvas_apply_text_edits` | `annotationId`, `editSessionId`, `edits`, `exact`, `expectedContentHash`, `nodeId`, `occurrence`, `prefix`, `replacement`, `requestId`, `suffix`, `targetIndex` |
| `canvas_write_table_node` | `columns`, `nodeId`, `rowHeight`, `rows`, `sourceNodeIds`, `title` |
| `canvas_write_file_node` | `allowDuplicate`, `assetPath`, `height`, `sourceNodeIds`, `viewMode`, `width` |
| `canvas_write_media_node` | `allowDuplicate`, `assetPath`, `sourceNodeIds` |
| `canvas_group_nodes` | `label`, `nodeIds` |
| `canvas_group_recent_outputs` | `label` |
| `canvas_write_node` | `allowDuplicate`, `assetPath`, `columns`, `content`, `expectedContentHash`, `items`, `kind`, `mode`, `name`, `nodeId`, `rowHeight`, `rows`, `sourceNodeId`, `sourceNodeIds`, `title` |
| `canvas_ungroup_node` | `groupId` |

## 计划编排（7）

| 工具 | 入参 |
|---|---|
| `plan_get_work_items` | `plan_id`, `projectRoot`, `stage_id`, `work_item_ids` |
| `plan_get_stage_status` | `order`, `plan_id`, `projectRoot`, `stage_id` |
| `plan_get_stage_detail` | `order`, `plan_id`, `projectRoot`, `stage_id` |
| `plan_update_stage_state` | `expected_revision`, `plan_id`, `projectRoot`, `updates` |
| `plan_replan` | `expected_revision`, `operations`, `plan_id`, `preserve_through_stage_id`, `projectRoot`, `reason`, `request_id`, `resume_stage_id`, `workflow_path`, `workflow_variant` |
| `plan_write` | `expected_revision`, `plan_id`, `projectRoot` |
| `plan_patch_stage` | `after_order`, `expected_revision`, `omit`, `plan_id`, `projectRoot`, `remove`, `stage_id` |

## 生成 · 图片（5）

| 工具 | 入参 |
|---|---|
| `generate_image` | `count`, `filename`, `filenames`, `image_paths`, `model_id`, `order`, `orders`, `prompt`, `prompts`, `vendor` |
| `image_remove_background` | `filename`, `image_path` |
| `select_image_recipe` | `user_request` |
| `prompt_write` | `base_requirement`, `image_paths` |
| `image_search` | `max_images_per_query`, `min_dimension`, `num`, `queries`, `query` |

## 生成 · 视频（5）

| 工具 | 入参 |
|---|---|
| `generate_video` | `audio_path`, `duration`, `filename`, `first_frame_image`, `last_frame_image`, `mode`, `model_id`, `order`, `prompt`, `reference_audio_urls`, `reference_image_paths`, `reference_video_urls`, `video_url` |
| `batch_lip_sync` | `audio_paths`, `filenames`, `video_paths` |
| `merge_videos` | `filename`, `scale_mode`, `target_height`, `target_width`, `video_paths` |
| `validate_mv_storyboard` | `character_id`, `characters`, `characters_in_scene`, `end`, `lyrics`, `scene_id`, `scenes`, `segment_type`, `segments`, `singer_gender`, `start`, `total_duration` |
| `mv_final_assembly` | `audio_path`, `filename`, `video_paths` |

## 生成 · 语音（9）

| 工具 | 入参 |
|---|---|
| `get_voice_id` | `gender`, `language` |
| `audio_generation` | `filename`, `pitch`, `source_node_id`, `speed`, `text`, `voice_id`, `vol` |
| `audios_batch_generation` | — |
| `voice_clone` | `audio_path`, `demo_model`, `demo_text`, `need_noise_reduction`, `need_volume_normalization`, `prompt_audio_path`, `prompt_text` |
| `design_voice` | `preview_text`, `prompt` |
| `voice_isolation` | `audio_path`, `filename`, `language`, `source_node_id` |
| `seedaudio_generation` | `filename`, `format`, `model_name`, `pitch`, `reference_audio_paths`, `reference_image_path`, `sample_rate`, `source_node_id`, `speed`, `text_prompt`, `volume` |
| `generate_audio_speech` | `emotions`, `filename`, `filenames`, `format`, `pitches`, `reference_audio_paths`, `reference_image_path`, `sample_rate`, `speeds`, `texts`, `vendor`, `voice_id`, `voice_id_source`, `voice_ids`, `vols`, `volumes` |
| `voice_prepare` | `items` |

## 生成 · 音乐（9）

| 工具 | 入参 |
|---|---|
| `generate_audio_music` | `filename`, `lyrics`, `mode`, `model_id`, `prompt`, `vendor` |
| `music_cover` | `action`, `audio`, `cover_feature_id`, `filename`, `lyrics`, `prompt` |
| `music_generation_song` | `filename`, `lyrics`, `prompt` |
| `music_generation_instrumental` | `filename`, `prompt` |
| `music_generation_elevenlabs` | `filename`, `is_instrumental`, `music_length`, `prompt` |
| `music_cover_preprocess` | `audio` |
| `music_cover_generate_with_lyrics` | `cover_feature_id`, `filename`, `lyrics`, `prompt` |
| `music_cover_generate_oneshot` | `audio`, `filename`, `prompt` |
| `lyrics_generation` | `lyrics`, `mode`, `prompt`, `title` |

## 后期处理（12）

| 工具 | 入参 |
|---|---|
| `audio_meta` | `audio_path` |
| `ffmpeg` | `args`, `description`, `filename`, `metadata`, `model`, `output_type`, `preserve_source_canvas_node`, `prompt`, `replace_node_id` |
| `super_resolution` | `filename`, `image_path`, `resolution`, `video_path` |
| `embed_audio` | `audio_path`, `audio_paths`, `concurrency`, `filename`, `filenames`, `preserve_source_canvas_node`, `replace_existing`, `replace_node_id`, `replace_node_ids`, `video_path`, `video_paths` |
| `media_transcribe` | `audio_path`, `file_path`, `filename`, `language`, `mode`, `total_duration` |
| `subtitle_format` | `cjk_chars_per_line`, `english_words_per_line`, `filename`, `font_name`, `font_scale`, `font_size`, `margin_l`, `margin_r`, `margin_v`, `max_lines`, `output_size`, `position`, `source_srt_path`, `unsafe_override` |
| `probe_media` | `file_path`, `file_paths` |
| `audio_transcribe_lyrics` | `audio_path`, `language`, `total_duration` |
| `media_generate_subtitle` | `file_path`, `filename`, `font_name`, `language`, `output_size`, `position` |
| `audio_subclip_batch` | `audio_path`, `end`, `segments`, `start` |
| `audio_analyze_music` | `audio_path`, `num_segments` |
| `audio_separate` | `audio_path`, `filename`, `source_node_id`, `video_path` |

## 资产与文件（11）

| 工具 | 入参 |
|---|---|
| `asset_center_search` | `limit`, `q`, `type` |
| `asset_center_use_entity` | `entity_id`, `workspace_path` |
| `get_asset_relations` | `asset_path`, `direction`, `exclude_roles`, `max_depth`, `max_nodes`, `mode` |
| `read` | `file_path`, `limit`, `offset` |
| `analyse_media` | `file_path`, `file_paths`, `force`, `question`, `type` |
| `read_media` | `file_path`, `file_paths`, `force`, `question` |
| `write` | `content`, `file_path` |
| `edit` | `file_path`, `new_string`, `old_string`, `replace_all` |
| `save_file_to_session` | `description`, `file_type`, `source_path` |
| `upload_to_cdn` | `file_path` |
| `web_media` | `container`, `filename`, `format_id`, `include_auto_subtitles`, `max_items`, `playlist_mode`, `quality`, `source_node_id`, `subtitle_format`, `subtitle_languages`, `type`, `url` |

## 记忆与知识（9）

| 工具 | 入参 |
|---|---|
| `memory_list` | `projectRoot` |
| `memory_read` | `projectRoot` |
| `memory_write` | `asset_uri`, `body`, `description`, `projectRoot` |
| `memory_delete` | `projectRoot` |
| `memory_search` | `projectRoot`, `query` |
| `memory` | `action`, `asset_uri`, `body`, `description`, `projectRoot`, `query` |
| `search_knowledge` | `limit`, `query`, `topic` |
| `report_outcome` | `outcomes` |
| `reload_skills` | — |

## ComfyUI（10）

| 工具 | 入参 |
|---|---|
| `list_comfyui_template` | `locale` |
| `list_comfyui_workflow` | — |
| `get_comfyui_workflow` | `include_graph`, `include_parameters`, `source_node_id`, `workflow_id` |
| `run_comfyui_workflow` | `cfg`, `count`, `denoise`, `expected_source_sha256`, `input_bindings`, `input_values`, `negative_prompt`, `node_id`, `overrides`, `parameter`, `positive_prompt`, `repair_operations`, `review_mode`, `sampler_name`, `sampler_node_id`, `scheduler`, `seed`, `source_node_id`, `steps`, `type`, `value`, `workflow_id`, `workspace_path` |
| `edit_comfyui_workflow` | `expected_source_sha256`, `input_bindings`, `node_id`, `operations`, `parameter`, `source_node_id`, `workflow_id`, `workspace_path` |
| `save_comfyui_workflow` | `expected_source_sha256`, `mode`, `name`, `overwrite_existing`, `source_node_id` |
| `save_comfyui_run_as_workflow` | `mode`, `name`, `output_node_id`, `overwrite_existing`, `run_id` |
| `get_comfyui_run_status` | `batch_id`, `max_wait_seconds` |
| `add_comfyui_workflow` | `workflow_id` |
| `open_comfyui` | `workflow` |

## 插件（6）

| 工具 | 入参 |
|---|---|
| `open_remote_tool_gui` | `entry`, `initial_params`, `tool_name` |
| `plugin_agent_open_editor` | `initialMessage`, `nodeId`, `sourceNodeIds` |
| `plugin_agent_describe` | `nodeId` |
| `plugin_agent_invoke` | `args`, `method`, `nodeId` |
| `recommend_plugin` | `plugin_id`, `value_line` |
| `preview_and_collect_feedback` | `args`, `feedback_path`, `script` |

## DAG / 其他（6）

| 工具 | 入参 |
|---|---|
| `list_capabilities` | — |
| `get_model_concurrency` | `models` |
| `run_dag` | `asset_keys`, `dag_id`, `inputs` |
| `submit_dag` | `asset_keys`, `concurrency`, `dag_id`, `inputs` |
| `query_dag_result` | `run_id` |
| `submit_test_async_task` | — |
