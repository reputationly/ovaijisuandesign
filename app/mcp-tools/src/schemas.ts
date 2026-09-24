import { z } from "zod";

/**
 * 多个模块共用的 gateway 响应 schema。只放跨模块的；单个工具独有的响应
 * schema 放在各自的工具模块里。
 *
 * 注意 zod 默认剥掉未声明的键 —— 需要透传给 agent 的字段必须在这里声明。
 */

export const FAILURE_PRESENTATIONS = ["terminal", "recoverable", "status_unknown", "cancelled"] as const;
export const FailurePresentationSchema = z.enum(FAILURE_PRESENTATIONS);
export type FailurePresentation = z.infer<typeof FailurePresentationSchema>;

export const REFUND_STATUSES = ["none", "pending", "refunded"] as const;

export const BillingErrorMetadataSchema = z.object({
  estimated_credits: z.number().nonnegative().optional(),
  current_credits: z.number().nonnegative().optional(),
  shortfall_credits: z.number().nonnegative().optional(),
});

/** gateway 失败体（生成提交失败时解析用）。 */
export const GatewayErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  error_code: z.string().optional(),
  user_message: z.string().optional(),
  failure_presentation: FailurePresentationSchema.optional(),
  recovery_handle: z.string().min(1).optional(),
  cloud_error_type: z.string().optional(),
  cloud_status: z.number().optional(),
  billing: BillingErrorMetadataSchema.optional(),
});
export type GatewayError = z.infer<typeof GatewayErrorSchema>;

export const GENERATE_ERROR_CODES = [
  "client_error",
  "backend_error",
  "billing_insufficient_balance",
  "concurrency_limit",
  "image_aspect_ratio_conflict",
  "network_connect_timeout",
  "content_policy_violation",
  "timeout",
  "unavailable",
  "shutdown",
  "unknown",
  "network_error",
  "storage_full",
] as const;

export const GenerateSuccessSchema = z.object({
  ok: z.literal(true),
  path: z.string(),
  /** 一次调用出多张时的全部路径，paths[0] === path。 */
  paths: z.array(z.string()).optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(),
  subtitle_path: z.string().optional(),
  lyrics: z.string().optional(),
  provider_task_id: z.string().optional(),
  /** 输入来自本轮之外时 gateway 给的血缘提示。 */
  _relations: z.string().optional(),
  /** gateway 在任务完成时自动建的画布节点 id。 */
  node_id: z.string().optional(),
});

export const GenerateFailureSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  error_code: z.enum(GENERATE_ERROR_CODES),
  user_message: z.string().optional(),
  failure_presentation: FailurePresentationSchema.optional(),
  recovery_handle: z.string().min(1).optional(),
  billing: BillingErrorMetadataSchema.optional(),
  refund_status: z.enum(REFUND_STATUSES).optional(),
  refunded_credits: z.number().optional(),
});

export const GenerateResponseSchema = z.discriminatedUnion("ok", [GenerateSuccessSchema, GenerateFailureSchema]);
export type GenerateSuccess = z.infer<typeof GenerateSuccessSchema>;
export type GenerateFailure = z.infer<typeof GenerateFailureSchema>;
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;

const EditFailureSchema = z.object({ ok: z.literal(false), error: z.string() }).passthrough();

/** /api/edit/* 的同步结果。`_probe` 只在 `-f null` 这类不出文件的预演里出现。 */
export const EditResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    path: z.string(),
    _relations: z.string().optional(),
    node_id: z.string().optional(),
    _probe: z.object({ stdout: z.string(), stderr: z.string() }).optional(),
  }),
  EditFailureSchema,
]);
export type EditResponse = z.infer<typeof EditResponseSchema>;

export const AnalyzeMediaResponseSchema = z
  .object({
    ok: z.boolean(),
    text: z.string().optional(),
    error: z.string().optional(),
  })
  .passthrough();

export const HealthResponseSchema = z.object({}).passthrough();
