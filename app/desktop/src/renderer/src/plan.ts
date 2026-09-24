/**
 * 制作计划。官方 `productionPlan.*`（57 条文案里和面板结构有关的那些）：
 *
 * ```
 * title                     = 制作计划
 * status.todo/doing/review/done/blocked = 待规划/进行中/待确认/已完成/受阻
 * actions.confirmPlan       = 继续      messages.confirmPlan
 *   = 确认"{{stage}}"的执行计划，请开始执行。
 * actions.confirmResult     = 继续      messages.confirmResult
 *   = 确认"{{stage}}"的产物，请继续下一阶段。
 * actions.finish            = 完成制作  messages.finish
 *   = 确认"{{stage}}"的最终产物，请完成制作。
 * actions.collapsePlan      = 收起      loadFailed = 暂时无法读取
 * feedbackPlaceholder = 输入文字将作为本阶段修改意见；添加附件则作为普通消息发送
 * ```
 *
 * ## 一条关键事实：确认动作就是**发一句话给 agent**
 *
 * 官方那几个 `messages.*` 才是重点 —— 「继续」不是调一个 confirm 接口，
 * 而是把「确认"分镜"的执行计划，请开始执行。」当成一条用户消息发出去。
 * 所以这块和我们的架构完全兼容：我们已经有 `agentSend`。
 *
 * ## 为什么以前没有这个面板
 *
 * 后端有整套（7 个 `plan_*` 路由 + `plan:changed` 事件 + 乐观并发），
 * `plan.rs` 的注释写着"是 agent 之间的共享状态，不是给人看的文档"——
 * 于是前端零界面，事件发出来没人接。结果是**长任务在官方那边是分阶段、
 * 可确认、可干预的，在我们这儿 agent 闷头跑完**。
 */

/** 后端 `plan.rs` 的 `StageState`。**字面量和 agent 提示词里的一致**,不能改。 */
export type StageState =
  | "pending"
  | "in_progress"
  | "completed"
  | "blocked"
  | "skipped"
  | "failed"

export interface WorkItem {
  id: string
  title: string
  done: boolean
}

export interface Stage {
  id: string
  name: string
  order: number
  state: StageState
  work_items: WorkItem[]
}

export interface Plan {
  id: string
  goal: string
  revision: number
  stages: Stage[]
}

/**
 * 状态标签。官方 `productionPlan.status.*`。
 *
 * **`skipped` 和 `failed` 官方没有对应的标签**,但我们的后端有这两个状态。
 * 硬塞进官方那五个里会让用户看到一个和实际不符的词 —— 比如把失败显示成
 * 「受阻」,那是"在等什么东西"的意思，而失败是"这一步没做成"。各给各的。
 */
const LABEL: Record<StageState, string> = {
  pending: "待规划",
  in_progress: "进行中",
  completed: "已完成",
  blocked: "受阻",
  skipped: "已跳过",
  failed: "失败",
}

export function stateLabel(s: StageState): string {
  return LABEL[s] ?? s
}

/** 状态对应的颜色 token。 */
export function stateColor(s: StageState): string {
  switch (s) {
    case "in_progress":
      return "var(--brand-accent)"
    case "completed":
      return "var(--canvas-node-tag-green)"
    case "blocked":
    case "failed":
      return "var(--canvas-node-tag-red)"
    default:
      return "var(--muted-foreground)"
  }
}

const terminal = (s: StageState) =>
  s === "completed" || s === "skipped" || s === "failed"

/**
 * 当前该看哪个阶段：按 order 排序后**第一个没结束的**。
 *
 * 和后端 `Plan::next_stage` 同一个判据 —— 两边不一致的话，面板上高亮的
 * 阶段和 agent 正在做的不是同一个。
 */
export function currentStage(plan: Plan): Stage | undefined {
  const live = [...plan.stages]
    .filter((s) => !terminal(s.state))
    .sort((a, b) => a.order - b.order)
  return live[0]
}

/** 整份计划做完了没有。 */
export function allDone(plan: Plan): boolean {
  return plan.stages.length > 0 && plan.stages.every((s) => terminal(s.state))
}

/**
 * 这一步该给用户什么按钮。
 *
 * 官方分三种（`confirmPlan` / `confirmResult` / `finish`），**前两个的按钮
 * 文案都是「继续」,但发出去的话不一样** —— 一个是"计划我看过了，开始做",
 * 一个是"产物我看过了，下一阶段"。
 *
 * 判据：
 * - 阶段还没开工（`pending`）→ 确认执行计划
 * - 阶段在做、而且所有 work item 都打钩了 → 确认产物
 *   （官方的 `review`「待确认」就是这个状态，我们后端没有这个枚举，
 *   从 work item 推出来）
 * - 它是最后一个 → 完成制作
 * - 别的情况（做到一半、受阻）→ 没有可确认的东西，返回 null
 */
export interface NextAction {
  /** 按钮文案。 */
  label: string
  /** 点下去发给 agent 的那句话。 */
  message: string
}

export function nextAction(plan: Plan): NextAction | null {
  const stage = currentStage(plan)
  if (!stage) return null

  const items = stage.work_items ?? []
  const ready = items.length > 0 && items.every((w) => w.done)
  // 这个阶段之后还有没有别的。
  const rest = plan.stages.filter((s) => !terminal(s.state) && s.order > stage.order)

  if (stage.state === "pending") {
    return {
      label: "继续",
      message: `确认"${stage.name}"的执行计划，请开始执行。`,
    }
  }
  if (stage.state === "in_progress" && ready) {
    return rest.length === 0
      ? { label: "完成制作", message: `确认"${stage.name}"的最终产物，请完成制作。` }
      : { label: "继续", message: `确认"${stage.name}"的产物，请继续下一阶段。` }
  }
  // **做到一半、或者受阻时不给"继续"。** 给了的话用户点下去等于在说
  // "这一步我确认了",而它还没做完 —— agent 会带着半成品进入下一阶段。
  return null
}

/** 阶段的完成进度，`3 / 5`。没有 work item 时返回 null（不显示）。 */
export function progressOf(stage: Stage): { done: number; total: number } | null {
  const items = stage.work_items ?? []
  if (items.length === 0) return null
  return { done: items.filter((w) => w.done).length, total: items.length }
}
