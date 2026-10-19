/**
 * 任务（Task）接口响应的运行时解析。
 *
 * 为什么要在客户端**再解析一遍**：这些响应决定界面怎么显示、哪些按钮可点，
 * 而它们来自 gateway、还可能被中间的代理或旧版本响应污染。类型标注只在编译期有效，
 * 运行时拿到的东西必须自己验：一个 `status` 拼错、一个 `terminal` 类型不对，
 * 界面就会走进不该走的分支（例如把还在跑的任务当成已完成）。
 *
 * 写法是「解析器组合」：每个字段是一个 `unknown → T` 的函数，不合法就抛。
 * `shape` 把字段表拼成一个对象解析器，并且**丢掉解析结果为 `undefined` 的键**
 * （对应「这个字段本次响应里没有」）。
 *
 * 有几条跨字段约束写在 `shape` 之后，因为单字段解析器看不到彼此：
 * 终态与状态枚举必须自洽、终态下只剩 `retry` 一个动作、问题的 `source` 必须与 `code` 匹配。
 */
import { COMPOSITION_POSITION_MAX } from "./composition.js";
import { PROJECT_GENERATION_MAX_COUNT } from "./generation.js";
import { PROJECT_TASK_OPERATIONS, TASK_PROGRESS_PHASES, TASK_VIEW_STATUSES, TERMINAL_TASK_STATUSES } from "./task-api.js";
import { isTaskProblemCode, taskProblemSource } from "./task-problem.js";

/** 一个字段解析器。不合法时抛错，不返回哨兵值 —— 返回哨兵会被下游当成正常值用。 */
type Parser<T> = (value: unknown) => T;

function invalid(): never {
  throw new Error("Invalid Task response");
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}

/**
 * 把字段表拼成对象解析器。
 *
 * 解析结果为 `undefined` 的键**不出现在结果里** —— 这样「字段缺失」和「字段是 null」
 * 在结果里是可区分的两种状态，调用方不需要再去猜。
 */
function shape<F extends Record<string, Parser<unknown>>>(fields: F) {
  return (value: unknown): { [K in keyof F]?: ReturnType<F[K]> } => {
    const source = record(value);
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(fields)) {
      const parsed = fields[key]!(source[key]);
      if (parsed !== undefined) result[key] = parsed;
    }
    return result as { [K in keyof F]?: ReturnType<F[K]> };
  };
}

export const text: Parser<string> = (v) => (typeof v === "string" ? v : invalid());
/** 标识符：非空、且不含 NUL（NUL 会截断下游把它当 C 字符串用的地方）。 */
export const id: Parser<string> = (v) => (typeof v === "string" && v.trim() && !v.includes("\0") ? v : invalid());
const bool: Parser<boolean> = (v) => (typeof v === "boolean" ? v : invalid());
/** 非负数；`NaN`/`Infinity` 一律不合法。 */
const number: Parser<number> = (v) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : invalid());
const integer: Parser<number> = (v) => (Number.isSafeInteger(number(v)) ? (v as number) : invalid());
/** 版本号从 1 起（0 表示「没有版本」，不该出现在这里）。 */
const revision: Parser<number> = (v) => (integer(v) >= 1 ? (v as number) : invalid());
const optional =
  <T>(parse: Parser<T>): Parser<T | undefined> =>
  (v) =>
    v === undefined ? undefined : parse(v);
const nullable =
  <T>(parse: Parser<T>): Parser<T | null> =>
  (v) =>
    v === null ? null : parse(v);
const array =
  <T>(parse: Parser<T>): Parser<T[]> =>
  (v) =>
    Array.isArray(v) ? v.map(parse) : invalid();
const oneOf =
  <T extends string>(values: readonly T[]): Parser<T> =>
  (v) =>
    typeof v === "string" && (values as readonly string[]).includes(v) ? (v as T) : invalid();
const dictionary =
  <T>(parse: Parser<T>): Parser<Record<string, T>> =>
  (v) =>
    Object.fromEntries(Object.entries(record(v)).map(([k, item]) => [k, parse(item)]));

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
const json: Parser<Json> = (v) => {
  if (v === null || typeof v === "string" || typeof v === "boolean") return v;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (Array.isArray(v)) return v.map(json);
  return dictionary(json)(v);
};

export const kind = oneOf(["text", "image", "video", "audio", "file"]);
export const operation = oneOf(PROJECT_TASK_OPERATIONS);
export const phase = oneOf(TASK_PROGRESS_PHASES);
const reason = nullable(
  oneOf([
    "scheduler",
    "model_capacity",
    "local_capacity",
    "provider_concurrency",
    "provider_queued",
    "provider_submitted",
    "submitting",
    "provider_running",
    "local_processing",
    "billing",
    "identity",
    "dependency_unavailable",
    "provider_unavailable",
    "user_paused",
    "restart_paused",
    "user_stopped",
    "confirmation_expired",
    "delivery",
    "user_action",
    "dependency",
  ]),
);
const action = oneOf([
  "pause",
  "resume",
  "stop",
  "confirm_cost",
  "adopt_version",
  "finish_as_candidate",
  "update_placement",
  "finish_without_placement",
  "retry",
]);
const disposition = oneOf(["adopted", "candidate"]);

export const media = shape({
  mimeType: text,
  sizeBytes: integer,
  width: optional(number),
  height: optional(number),
  durationSeconds: optional(number),
  fps: optional(number),
});

const coverage = shape({
  status: oneOf(["complete", "partial"]),
  reasons: array(oneOf(["indexing", "source_missing", "retention", "dependency_unavailable"])),
  coveredThroughMessageId: optional(nullable(id)),
});

const output = shape({
  key: id,
  ordinal: optional(revision),
  name: text,
  kind,
  resourceId: id,
  versionId: id,
  disposition,
  availability: oneOf(["available", "missing", "unavailable"]),
  media: optional(media),
  voiceId: optional(id),
  // Gateway session-freshness bookkeeping; clients never act on it.
  committedState: () => undefined,
});

const placement = shape({
  key: id,
  compositionId: id,
  memberId: id,
  resourceId: id,
  status: oneOf(["pending", "applied", "conflict", "skipped"]),
  appliedRevision: optional(integer),
});

/** 冲突按 `type` 分派；`default` 不返回原值而是抛错 —— 认不出的冲突不能当没有。 */
const conflict = (v: unknown): unknown => {
  switch (record(v).type) {
    case "task_revision":
      return shape({ type: oneOf(["task_revision"]), taskId: id, expectedRevision: revision, actualRevision: revision })(v);
    case "resource_version":
      return shape({ type: oneOf(["resource_version"]), resourceId: id, expectedVersionId: nullable(id), actualVersionId: nullable(id) })(v);
    case "composition_revision":
      return shape({ type: oneOf(["composition_revision"]), compositionId: id, expectedRevision: integer, actualRevision: integer })(v);
    default:
      return invalid();
  }
};

const taskProblem = shape({
  key: optional(id),
  source: oneOf(["input", "provider", "billing", "delivery", "system"]),
  code: (v: unknown) => (typeof v === "string" && isTaskProblemCode(v) ? v : invalid()),
  message: text,
  upstream: optional(shape({ code: id, userMessage: optional(text) })),
  conflict: optional(conflict),
});

/** `source` 必须和 `code` 自洽：写错 source 会让界面把「该重试」显示成「该改输入」。 */
function parseTaskProblem(value: unknown): unknown {
  const result = taskProblem(value) as { source: string; code: string };
  if (result.source !== taskProblemSource(result.code)) invalid();
  return result;
}

const parseTaskRequestError = shape({
  code: id,
  message: text,
  retryable: bool,
  conflict: optional(conflict),
});

const progress = shape({
  phase,
  reason,
  since: integer,
  queuedAt: nullable(integer),
  submittedAt: nullable(integer),
  startedAt: nullable(integer),
  percent: nullable((v: unknown) => (number(v) <= 100 ? number(v) : invalid())),
  position: nullable(integer),
  etaSeconds: nullable(number),
  nextRetryAt: nullable(integer),
  retryCount: optional(integer),
  subtasks: array(
    shape({
      key: id,
      resource: oneOf(["model", "local"]),
      modelId: nullable(id),
      phase,
      reason,
      since: integer,
      nextRetryAt: nullable(integer),
      retryCount: optional(integer),
    }),
  ),
});

const billing = shape({
  estimatedCredits: nullable(number),
  refund: shape({
    status: oneOf(["none", "pending", "refunded", "unknown"]),
    credits: nullable(number),
  }),
  confirmation: nullable(
    shape({
      id,
      kind: oneOf(["threshold", "insufficient"]),
      estimatedCredits: number,
      expiresAt: integer,
      thresholdCredits: nullable(number),
      currentCredits: nullable(number),
      shortfallCredits: nullable(number),
      batch: nullable(shape({ credits: number, taskIds: array(id) })),
    }),
  ),
});

const origin = shape({
  source: oneOf(["frontend", "agent"]),
  sessionId: optional(id),
  userMessageId: optional(id),
  chatTurnId: optional(id),
  toolUseId: optional(id),
  callIndex: optional(integer),
});

const task = shape({
  id,
  capabilityId: id,
  compositionId: optional(id),
  prompt: optional(text),
  aspectRatio: optional(text),
  artifacts: optional(array(shape({ key: id, id, kind }))),
  operation,
  status: oneOf(TASK_VIEW_STATUSES),
  terminal: bool,
  stage: oneOf(["compute", "materialize", "resource", "composition"]),
  revision,
  createdAt: integer,
  updatedAt: integer,
  origin,
  outputs: array(output),
  placements: array(placement),
  data: json,
  problem: nullable(parseTaskProblem),
  actions: array(action),
  handoff: nullable(shape({ target: oneOf(["canvas"]), at: integer, chatTurnId: optional(id) })),
  progress,
  billing: nullable(billing),
});

/**
 * 终态与状态枚举必须自洽，且终态下只剩 `retry` 一个动作。
 * 判错会让已完成的任务显示成「可暂停」——用户点了没反应，只会以为卡了。
 */
function parseTaskView(value: unknown): unknown {
  const result = task(value) as { terminal: boolean; status: string; actions: string[] };
  if (result.terminal !== TERMINAL_TASK_STATUSES.includes(result.status as never)) invalid();
  if (result.terminal && result.actions.some((item) => item !== "retry")) invalid();
  return result;
}

/** 资源目标：新建 or 往已有资源上加版本，两者字段不同，按 `mode` 分派。 */
const resourceTarget = (v: unknown): unknown =>
  record(v).mode === "create"
    ? shape({ key: id, mode: oneOf(["create"]), name: text, description: optional(text), resourceId: optional(id) })(v)
    : shape({ key: id, mode: oneOf(["new_version"]), resourceId: id, baseVersionId: optional(id), disposition: optional(disposition) })(v);

const placementTarget = (v: unknown): unknown =>
  record(v).memberId === undefined
    ? shape({ key: id, role: text })(v)
    : shape({ key: id, memberId: id, replaceResourceId: optional(id) })(v);

/** 位置只能是「在谁之后/之前」二选一，多给一个键就是错的。 */
const compositionPlacement = (v: unknown): unknown => {
  const value = record(v);
  const keys = Object.keys(value);
  if (keys.length !== 1) return invalid();
  if (keys[0] === "after") return { after: id(value.after) };
  if (keys[0] === "before") return { before: id(value.before) };
  return invalid();
};

const compositionPosition = (v: unknown) => (integer(v) <= COMPOSITION_POSITION_MAX ? v : invalid());

const composition = (v: unknown): unknown => {
  const value = record(v);
  if (value.compositionId !== undefined) return shape({ compositionId: id, placements: array(placementTarget) })(v);
  // `position` 与 `placement` 互斥：同时给无法判断是绝对位置还是相对位置
  if (value.position !== undefined && value.placement !== undefined) return invalid();
  return shape({
    type: (v2: unknown) => {
      const type = record(v2);
      // 有 id 表示引用已注册的类型（label 可不给），没 id 表示新类型（label 必给）
      return type.id === undefined
        ? shape({ label: id, description: optional(text) })(v2)
        : shape({ id, label: optional(text), description: optional(text) })(v2);
    },
    name: text,
    attributes: optional(dictionary(text)),
    position: optional(compositionPosition),
    placement: optional(compositionPlacement),
    placements: array(placementTarget),
  })(v);
};

const parseTaskRead = shape({
  task: parseTaskView,
  serverTaskIds: optional(array(id)),
  // The decoder already narrows references to the recorded form: admission
  // resolved every selector before the Task was written. `null` is a slot the
  // request left open on purpose (a video given only its last frame).
  input: shape({
    prompt: optional(text),
    params: optional(dictionary(json)),
    references: optional(array(nullable(shape({ versionId: id, resourceId: optional(id) })))),
    // The range belongs to the field, not to whoever happens to read it.
    count: optional((v: unknown) => (integer(v) >= 1 && integer(v) <= PROJECT_GENERATION_MAX_COUNT ? integer(v) : invalid())),
  }),
  output: shape({
    nameSource: optional(oneOf(["provider"])),
    resources: array(resourceTarget),
    composition: optional(composition),
  }),
});

const parseTaskSubmitResult = shape({ task: parseTaskView, reused: bool });
const parseTaskResolveResult = shape({ task: parseTaskView });
const parseTaskList = shape({ items: array(parseTaskView), nextCursor: nullable(id), coverage });

const counts = shape({
  pending: integer,
  queued: integer,
  active: integer,
  paused: integer,
  waitingUser: integer,
  reconciling: integer,
});

const parseTaskQueue = shape({
  tasks: counts,
  subtasks: array(shape({ resource: oneOf(["model", "local"]), modelId: nullable(id), counts })),
  concurrency: array(
    shape({
      modelId: id,
      limit: nullable(integer),
      cloudUsed: nullable(integer),
      localHeld: nullable(integer),
      observedAt: nullable(integer),
    }),
  ),
  updatedAt: integer,
  coverage,
});

// 上游这里有一条 `protocol → desktop/preload 入口` 的跨包循环依赖（`import { pending }`，
// 且 `pending` 在本文件里根本没被用到）。我们仓库是按包分开编译的（`rootDir: src`），
// 表达不了这种跨包相对引用，所以这一条**去掉了** —— 它是未被使用的 import，
// 去掉不改变任何运行时行为，只影响模块图。记在这里以免以后重跑还原时又加回来。
void parseTaskRequestError;
void parseTaskQueue;
