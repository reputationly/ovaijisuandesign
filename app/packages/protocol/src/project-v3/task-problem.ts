/**
 * 任务失败原因表。
 *
 * 一个「问题码」要同时回答三个问题，所以集中放一张表而不是散在各处判断：
 *
 * - `source`：**谁的锅** —— 输入错、模型侧错、计费、投递、系统。
 *   界面据此决定把用户引到哪里（改提示词 / 去登录 / 去充值 / 等一会儿）。
 * - `recovery`：**能怎么办** —— `none` 只能改输入、`retry` 可以重试、
 *   `auto` 系统自己会重试、`decision` 需要用户先做个选择。
 * - `message`：**给谁看** —— 这些是英文的兜底文案，界面有 i18n 时优先用 i18n。
 *
 * `none` 和 `auto` 的区别是「能做但不能做同一件事」和「什么都不用做」，
 * 判错会让界面显示一个点了没用的重试按钮。
 */
export type ProblemSource = "input" | "provider" | "billing" | "delivery" | "system";
export type ProblemRecovery = "none" | "retry" | "auto" | "decision";

export interface TaskProblemInfo {
  source: ProblemSource;
  recovery: ProblemRecovery;
  message: string;
}

export const TASK_PROBLEM_CODES: Record<string, TaskProblemInfo> = {
  INVALID_ARGUMENT: {
    source: "input",
    recovery: "none",
    message: "Generation input was rejected before model submission; check the model parameters and reference media"
  },
  UNSUPPORTED_OPERATION: {
    source: "input",
    recovery: "none",
    message: "Model does not expose asynchronous generation for this media type"
  },
  CLIENT_UPGRADE_REQUIRED: {
    source: "input",
    recovery: "decision",
    message: "Upgrade the client before creating a new task; no subtask was submitted"
  },
  PROVIDER_REJECTED: {
    source: "provider",
    recovery: "none",
    message: "The provider rejected generation; the task is not running"
  },
  PROVIDER_UNAUTHORIZED: {
    source: "provider",
    recovery: "decision",
    message: "The provider rejected generation authorization; sign in or check model access"
  },
  PROVIDER_FAILED: {
    source: "provider",
    recovery: "retry",
    message: "Provider generation failed"
  },
  PROVIDER_CANCELLED: {
    source: "provider",
    recovery: "retry",
    message: "Provider subtask was cancelled externally"
  },
  PROVIDER_RESULT_INVALID: {
    source: "provider",
    recovery: "none",
    message: "Provider returned an unusable result; change the request and generate again"
  },
  PROVIDER_CONCURRENCY: {
    source: "provider",
    recovery: "auto",
    message: "Model concurrency exceeded before subtask creation"
  },
  PROVIDER_UNAVAILABLE: {
    source: "provider",
    recovery: "auto",
    message: "The provider did not confirm the submission; whether the generation ran is unconfirmed. It is resent with the same submission ID, so it is never charged twice"
  },
  PROVIDER_OUTCOME_UNKNOWN: {
    source: "provider",
    recovery: "retry",
    message: "The provider did not answer an operation that cannot be resent safely; whether it ran and was charged is unconfirmed. A retry runs it again and is billed again"
  },
  PROVIDER_REPAIR_UNAVAILABLE: {
    source: "provider",
    recovery: "none",
    message: "Recorded provider repair is unavailable"
  },
  PROVIDER_REPAIR_FAILED: {
    source: "provider",
    recovery: "retry",
    message: "Provider repair failed"
  },
  BILLING_CONFIRMATION_REQUIRED: {
    source: "billing",
    recovery: "decision",
    message: "Confirm the estimated cost before generation"
  },
  BILLING_INSUFFICIENT: {
    source: "billing",
    recovery: "retry",
    message: "Balance is insufficient; top up, then retry"
  },
  BILLING_UNAVAILABLE: {
    source: "billing",
    recovery: "retry",
    message: "Billing could not be checked after its automatic retries; no new subtask was submitted. Retry resumes the task in place."
  },
  BILLING_REJECTED: {
    source: "billing",
    recovery: "none",
    message: "Pricing rejected the model parameters; no new subtask will be submitted. Already-submitted subtasks are being settled."
  },
  BILLING_WAIT_EXPIRED: {
    source: "billing",
    recovery: "none",
    message: "The cost was not confirmed in time; unsubmitted subtasks were stopped"
  },
  QUOTE_EXPIRED: {
    source: "billing",
    recovery: "decision",
    message: "The cost quote expired; review the refreshed quote"
  },
  RESOURCE_VERSION_CONFLICT: {
    source: "delivery",
    recovery: "decision",
    message: "Resource delivery requires a decision"
  },
  RESOURCE_TARGET_UNAVAILABLE: {
    source: "delivery",
    recovery: "none",
    message: "The target Resource is unavailable; its outputs were not saved"
  },
  COMPOSITION_REVISION_CONFLICT: {
    source: "delivery",
    recovery: "decision",
    message: "The Composition keeps changing; choose a placement"
  },
  COMPOSITION_TARGET_UNAVAILABLE: {
    source: "delivery",
    recovery: "decision",
    message: "The Composition or member is unavailable"
  },
  DELIVERY_STEP_LIMIT: {
    source: "delivery",
    recovery: "retry",
    message: "Delivery did not settle within its step budget"
  },
  PAUSED: {
    source: "system",
    recovery: "decision",
    message: "Unsubmitted compute tasks are paused"
  },
  LOCAL_INTERRUPTED: {
    source: "system",
    recovery: "auto",
    message: "Local process ended before completion"
  },
  PROVIDER_OUTPUT_UNAVAILABLE: {
    source: "system",
    recovery: "auto",
    message: "Generation has finished, but retrieving its output failed; it is retrieved again without generating again."
  },
  MATERIALIZATION_OUTCOME_UNKNOWN: {
    source: "system",
    recovery: "auto",
    message: "Saving the outputs did not complete; it is retried without generating again"
  },
  COMPOSITION_OUTCOME_UNKNOWN: {
    source: "system",
    recovery: "auto",
    message: "Saving the outputs did not complete; it is retried without generating again"
  },
  COMMIT_OUTCOME_UNKNOWN: {
    source: "system",
    recovery: "auto",
    message: "Saving the outputs did not complete; it is retried without generating again"
  },
  /** Any kernel code the table does not declare collapses to this on the wire. */
  INTERNAL_ERROR: {
    source: "system",
    recovery: "retry",
    message: "Task could not proceed; inspect its state before retrying"
  }
};

/**
 * 判一个码认不认识。
 *
 * 用 `Object.hasOwn` 而不是 `in`：`in` 会把原型链上的名字（`toString`、`constructor`）
 * 也当成认识，那样服务端返回一个畸形码时会静默走到「已知」分支。
 */
export function isTaskProblemCode(code: string): boolean {
  return Object.hasOwn(TASK_PROBLEM_CODES, code);
}

/**
 * 取问题码对应的 source。
 *
 * 调用方（`task-mappers`）先判 `isTaskProblemCode` 再调这里，所以直接索引即可。
 */
export function taskProblemSource(code: string): ProblemSource {
  return TASK_PROBLEM_CODES[code]!.source;
}
