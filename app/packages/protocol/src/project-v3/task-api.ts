/**
 * 项目 v3 任务接口的取值表。
 *
 * 这些数组既是**契约**（服务端按它们取值）、也是**白名单**（客户端按它们校验响应，
 * 见 `task-mappers`），还决定界面上的展示分组。所以它们必须是 readonly 元组、
 * 且顺序有意义：`TASK_VIEW_STATUSES` 把终态放在末尾，界面按它排列分组。
 */
import { PROJECT_GENERATION_OPERATIONS } from "./generation.js";

/** 可发起的任务操作。目前与生成指令一一对应，展开写是为了将来能各自独立扩。 */
export const PROJECT_TASK_OPERATIONS = [...PROJECT_GENERATION_OPERATIONS] as const;

/** 字幕导出格式。 */
export const PROJECT_SUBTITLE_FORMATS = ["ass", "srt", "vtt"] as const;

/** 字幕样式预设。`custom` 表示用户自定义，界面据此决定要不要展开样式编辑。 */
export const PROJECT_SUBTITLE_STYLE_PRESETS = ["social_safe", "minimal", "large", "top_caption", "custom"] as const;

/** 终态。进这三个状态后任务不再变化，界面停止轮询。 */
export const TERMINAL_TASK_STATUSES = ["completed", "failed", "cancelled"] as const;

/**
 * 任务对外可见的状态。
 * `unknown` 单独列出来：服务端可能返回客户端还不认识的状态，那时显示「未知」而不是崩。
 */
export const TASK_VIEW_STATUSES = ["accepted", "running", "waiting_user", "unknown", ...TERMINAL_TASK_STATUSES] as const;

/** 任务进度所处的阶段（比状态更细，用于进度条的措辞）。 */
export const TASK_PROGRESS_PHASES = ["pending", "queued", "active", "paused", "retrying", "stopped", "done"] as const;

export type TerminalTaskStatus = (typeof TERMINAL_TASK_STATUSES)[number];
export type TaskViewStatus = (typeof TASK_VIEW_STATUSES)[number];
export type TaskProgressPhase = (typeof TASK_PROGRESS_PHASES)[number];
