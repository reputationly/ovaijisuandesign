import type { MediaType } from "./media.js";

/**
 * `GET /api/assets` 返回的单条资产。
 *
 * 注意是 `fileSize`（驼峰）—— 旧 Rust 版回的是 `file_size`，渲染层迁移时要跟着改。
 * `metadata` 只在 `?include=metadata` 时返回。
 */
export interface AssetInfo {
  id: string;
  path: string;
  type: MediaType;
  name: string;
  prompt: string;
  model: string;
  description: string;
  /** ISO 时间，来自 created_at。 */
  time: string;
  fileSize: number;
  width?: number;
  height?: number;
  aspect_ratio?: string;
  voice_id?: string;
  lyrics?: string;
  composition_plan?: unknown;
  params?: unknown;
  backend?: string;
  model_id?: string;
  source_tool?: string;
  cloud_trace_id?: string;
  cloud_task_id?: string;
  gateway_task_id?: string;
  provider_task_id?: string;
  /** 秒。 */
  duration?: number;
  reference_images?: unknown;
  subtitle_path?: string;
  tagIds?: string[];
  metadata?: Record<string, unknown>;
  status: "active" | "missing";
  candidate?: { asset_id: string; path: string };
}
