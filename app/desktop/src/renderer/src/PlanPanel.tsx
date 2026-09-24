import { Check, ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"

import {
  currentStage,
  nextAction,
  progressOf,
  stateColor,
  stateLabel,
  type Plan,
} from "./plan"

/**
 * 制作计划面板。官方 `productionPlan.title` =「制作计划」。
 *
 * 逻辑在 `plan.ts`,这里只管画 —— 状态映射和"这一步该给什么按钮"在界面里
 * 很难测，而那正是最容易出"标签和实际对不上"的地方。
 *
 * ## 它解决的问题
 *
 * 后端有整套制作计划（7 个 `plan_*` 路由 + `plan:changed` 事件 + 乐观
 * 并发），前端零界面 —— **长任务在官方那边是分阶段、可确认、可干预的，
 * 在我们这儿 agent 闷头跑完**,用户只能看着活动流猜进度。
 *
 * ## 「继续」发的是一句话，不是一个接口
 *
 * 官方的 `messages.confirmPlan` 才是重点：点「继续」等于替用户说
 * 「确认"分镜"的执行计划，请开始执行。」。所以这个面板不需要任何新的
 * 后端写接口 —— 它读计划、发消息，就这两件事。
 */
export function PlanPanel({
  plan,
  onSend,
  busy,
}: {
  plan: Plan
  /** 把确认/反馈当成一条用户消息发出去。 */
  onSend: (text: string) => void
  /** agent 正在跑。跑的时候不给点确认 —— 它还没停下来听。 */
  busy: boolean
}) {
  const [open, setOpen] = useState(true)
  const [feedback, setFeedback] = useState("")
  const cur = currentStage(plan)
  const action = nextAction(plan)

  return (
    <div
      data-action-ui-id="production-plan"
      className="mb-3 rounded-xl border"
      style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "收起制作计划" : "展开制作计划"}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="text-[13px]">制作计划</span>
        {/* 收起时也要能看出进行到哪 —— 收起来之后只剩标题的话，
            这个面板就只是个占地方的东西。 */}
        {cur && (
          <span className="truncate text-[12px]" style={{ color: "var(--muted-foreground)" }}>
            {cur.name}
          </span>
        )}
        <span className="flex-1" />
        <span className="text-[11px] tabular-nums" style={{ color: "var(--muted-foreground)" }}>
          {plan.stages.filter((s) => s.state === "completed").length} / {plan.stages.length}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-2.5">
          {plan.goal && (
            <p className="mb-2 text-[12px] leading-5" style={{ color: "var(--muted-foreground)" }}>
              {plan.goal}
            </p>
          )}

          <ol className="flex flex-col gap-1.5">
            {[...plan.stages]
              .sort((a, b) => a.order - b.order)
              .map((s) => {
                const p = progressOf(s)
                const isCur = s.id === cur?.id
                return (
                  <li
                    key={s.id}
                    className="flex items-start gap-2 rounded-lg px-2 py-1.5"
                    style={{ background: isCur ? "var(--background)" : "transparent" }}
                  >
                    <span
                      className="mt-[3px] size-1.5 shrink-0 rounded-full"
                      style={{ background: stateColor(s.state) }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate text-[12px]">{s.name}</span>
                        <span className="shrink-0 text-[11px]" style={{ color: stateColor(s.state) }}>
                          {stateLabel(s.state)}
                        </span>
                        {p && (
                          <span
                            className="shrink-0 text-[11px] tabular-nums"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            {p.done} / {p.total}
                          </span>
                        )}
                      </div>
                      {/* work item 只展开当前阶段的。全展开的话一份五阶段的
                          计划会占掉整个对话面板。 */}
                      {isCur && (s.work_items?.length ?? 0) > 0 && (
                        <ul className="mt-1 flex flex-col gap-0.5">
                          {s.work_items.map((w) => (
                            <li
                              key={w.id}
                              className="flex items-center gap-1.5 text-[11px]"
                              style={{
                                color: w.done ? "var(--muted-foreground)" : "var(--foreground)",
                              }}
                            >
                              <Check
                                size={11}
                                style={{ opacity: w.done ? 1 : 0.2 }}
                                className="shrink-0"
                              />
                              <span className="truncate">{w.title}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                )
              })}
          </ol>

          {/* 反馈。官方 `feedbackPlaceholder` 说清楚了这段文字会被当成什么 ——
              不说的话用户不知道它和普通聊天有什么区别。 */}
          {cur && (
            <div className="mt-2 flex items-center gap-1.5">
              <input
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="输入文字将作为本阶段修改意见"
                disabled={busy}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || e.nativeEvent.isComposing) return
                  const t = feedback.trim()
                  if (!t) return
                  onSend(`关于"${cur.name}"：${t}`)
                  setFeedback("")
                }}
                className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-[12px] outline-none disabled:opacity-50"
                style={{ background: "var(--background)", border: "1px solid var(--border)" }}
              />
              {/* **只在真的有东西可确认时才显示。** 做到一半、受阻时
                  `nextAction` 返回 null —— 那时给一个「继续」,用户点下去
                  等于在说"这一步我确认了",而它还没做完。 */}
              {action && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSend(action.message)}
                  className="shrink-0 rounded-md px-2.5 py-1.5 text-[12px] transition-opacity enabled:hover:opacity-85 disabled:opacity-40"
                  style={{
                    background: "var(--brand-accent)",
                    color: "var(--brand-accent-foreground)",
                  }}
                >
                  {action.label}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
