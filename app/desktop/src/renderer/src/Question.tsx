import { Check } from "lucide-react"
import { useEffect, useState } from "react"

/**
 * agent 的决策点，渲染成选择题。
 *
 * **协议是 opencode 自带的 `question` 工具**，不是 MCP 的 —— 我一开始判断
 * 错了。定义在 opencode 的 `packages/schema/src/v1/question.ts`：
 *
 * ```ts
 * Option  = { label: string      // 1-5 词，简短
 *           , description: string }
 * Info    = { question: string   // 完整问题
 *           , header: string     // 极短标签，≤30 字符
 *           , options: Option[]
 *           , multiple?: boolean // 允许多选
 *           , custom?: boolean } // 允许自己填，默认 true
 * Request = { id, sessionID, questions: Info[], tool? }
 * Answer  = string[]             // 选中的 label 数组
 * Reply   = { answers: Answer[] }  // 顺序和 questions 对应
 * ```
 *
 * 事件是 `question.asked` / `question.replied` / `question.rejected`。
 *
 * 所以我们并**不缺这个工具** —— agent 那边一直能调，只是界面没把它画出来，
 * 用户看不到题也就答不了，agent 只能一直等到超时。官方那套选择题界面消费的
 * 就是这套事件。
 *
 * 三个必须照做的行为：
 *
 * - **答案是 label 数组**，不是索引。索引会在选项顺序变化时错位，而
 *   `question` 的结果直接进 agent 的上下文 —— 错了它按错的答案继续干活。
 * - **`custom` 默认 true**：agent 给的选项常常不全，不给自己填的口子，
 *   用户只能挑一个最接近的错答案。
 * - **`multiple` 时必须允许零选**（"都不要"也是有效回答），
 *   但要显式提交，不能靠"没选就当放弃"。
 */

export interface QuestionOption {
  label: string
  description: string
}

export interface QuestionInfo {
  question: string
  header: string
  options: QuestionOption[]
  multiple?: boolean
  custom?: boolean
}

export interface QuestionRequest {
  id: string
  questions: QuestionInfo[]
}

export function QuestionCard({
  request,
  onReply,
  onReject,
}: {
  request: QuestionRequest
  /** `answers[i]` 是第 i 题选中的 label 数组。顺序必须和 questions 一致。 */
  onReply: (answers: string[][]) => void
  onReject: () => void
}) {
  const [picked, setPicked] = useState<string[][]>(() => request.questions.map(() => []))
  const [custom, setCustom] = useState<string[]>(() => request.questions.map(() => ""))
  const [sent, setSent] = useState(false)

  // **双保险。** 调用方应该给 `key={request.id}`（见 ChatPanel 的注释），
  // 但那是调用方的事，而这里的 `picked[qi]!` 一旦越界就是白屏 ——
  // 这种代价不该依赖别人记得加一个 key。
  useEffect(() => {
    setPicked(request.questions.map(() => []))
    setCustom(request.questions.map(() => ""))
    setSent(false)
  }, [request])

  const toggle = (qi: number, label: string, multiple: boolean) => {
    setPicked((prev) => {
      const next = prev.map((a) => [...a])
      const cur = next[qi]!
      if (multiple) {
        const at = cur.indexOf(label)
        if (at >= 0) cur.splice(at, 1)
        else cur.push(label)
      } else {
        next[qi] = cur[0] === label ? [] : [label]
      }
      return next
    })
  }

  // 单选题必须每题都有答案才能提交；多选允许零选（"都不要"也是回答）。
  const ready = request.questions.every(
    (q, i) => q.multiple || picked[i]!.length > 0 || custom[i]!.trim().length > 0,
  )

  if (sent) {
    return (
      <div
        className="rounded-lg border px-3 py-2 text-[12px]"
        style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
      >
        已提交，等 agent 继续…
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: "var(--brutalist-border-subtle)",
        background: "var(--canvas-controls-bg)",
        boxShadow: "var(--canvas-shadow-panel)",
      }}
    >
      {request.questions.map((q, qi) => (
        <div key={qi} className={qi > 0 ? "mt-4" : undefined}>
          <p
            className="mb-0.5 text-[11px] tracking-wide uppercase"
            style={{ color: "var(--muted-foreground)" }}
          >
            {q.header}
            {/* 官方 `chat.question.multiSelect` =「可多选」。
                **形状（圆/方）只有见过的人才认得**，写出来才是所有人都懂。 */}
            {q.multiple && <span className="ml-1.5 normal-case">可多选</span>}
          </p>
          <p className="mb-2 text-[13px] leading-5">{q.question}</p>

          <div className="flex flex-col gap-1">
            {q.options.map((o) => {
              const on = picked[qi]!.includes(o.label)
              return (
                <button
                  key={o.label}
                  onClick={() => toggle(qi, o.label, !!q.multiple)}
                  className="flex items-start gap-2 rounded-md px-2.5 py-2 text-left transition-colors"
                  style={{
                    background: on ? "var(--canvas-controls-active)" : "transparent",
                    border: `1px solid ${on ? "var(--canvas-node-border-selected)" : "var(--border)"}`,
                  }}
                >
                  <span
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center"
                    style={{
                      // 单选画圆、多选画方 —— 形状本身就在告诉用户能选几个。
                      borderRadius: q.multiple ? 4 : 9999,
                      border: `1.5px solid ${on ? "var(--canvas-node-border-selected)" : "var(--border-strong)"}`,
                      background: on ? "var(--canvas-node-border-selected)" : "transparent",
                      color: "var(--canvas-controls-bg)",
                    }}
                  >
                    {on && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] leading-5">{o.label}</span>
                    {o.description && (
                      <span
                        className="block text-[12px] leading-snug"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {o.description}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}

            {/* `custom` 默认 true。agent 给的选项常常不全，不给自己填的口子，
                用户只能挑一个最接近的错答案。 */}
            {q.custom !== false && (
              <input
                value={custom[qi]}
                onChange={(e) =>
                  setCustom((prev) => prev.map((v, i) => (i === qi ? e.target.value : v)))
                }
                // 官方 `chat.question.customPlaceholder` =「输入你的回答...」
                placeholder="输入你的回答..."
                className="mt-0.5 rounded-md px-2.5 py-2 text-[13px] outline-none"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--background)",
                  color: "var(--foreground)",
                }}
              />
            )}
          </div>
        </div>
      ))}

      <div className="mt-3 flex items-center gap-2">
        <button
          // **「跳过」也要置 `sent`。** 只有「提交」置的话，连点两次会向
          // agent 发两次拒绝 —— 而它那一轮只在等一个回答，第二次会被
          // 当成下一个决策点的答复。
          onClick={() => {
            setSent(true)
            onReject()
          }}
          className="rounded-md px-2.5 py-1.5 text-[13px]"
          style={{ color: "var(--muted-foreground)" }}
        >
          {/* 官方这条是 `chat.reject` =「拒绝」。「跳过」听起来像"这题不答，
              下一题继续"，而它实际上是**终止这次提问**，agent 会换个做法。 */}
          拒绝
        </button>
        {/* 官方 `chat.question.answerRequired` =「请先回答此题再提交。」
            之前只是把提交键置灰 —— 用户不知道是哪一题没答，尤其多题时。 */}
        {!ready && (
          <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
            请先回答此题再提交。
          </span>
        )}
        <span className="flex-1" />
        <button
          disabled={!ready}
          onClick={() => {
            // 自己填的内容也是一个 label —— 协议里答案就是字符串数组，
            // 不区分"选的"和"填的"。
            const answers = picked.map((a, i) => {
              const extra = custom[i]!.trim()
              return extra ? [...a, extra] : a
            })
            setSent(true)
            onReply(answers)
          }}
          className="rounded-md px-3 py-1.5 text-[13px] transition-opacity hover:opacity-85 disabled:opacity-30"
          style={{
            background: "var(--canvas-primary-btn-bg)",
            color: "var(--canvas-primary-btn-icon)",
          }}
        >
          提交
        </button>
      </div>
    </div>
  )
}
