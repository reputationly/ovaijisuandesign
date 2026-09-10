import { Check, GripVertical, Loader2, PanelRight, Plus, X } from "lucide-react"

import type { AgentMsg, CanvasFile, ToolActivity } from "./api"
import { Generate } from "./Generate"
import { QuestionCard, type QuestionRequest } from "./Question"
import { THINKING_TOOLS, labelFor, mergeCalls, type Call } from "./toolLabels"

/**
 * 右侧对话面板。官方那栏是和 agent 的会话：上面是渲染好的回复，
 * 下面是输入框（圆角 24px、带一排工具、右下角发送按钮）。
 *
 * 上半部分现在是**工具活动流** —— 每个 MCP 工具调用都经过我们自己的 hub
 * server，所以这条流是真的。文案按官方的分类表（见 `toolLabels.ts`）：
 * 用户不需要知道调的是 `hub_canvas_ungroup_node` 还是
 * `hub_canvas_group_nodes`，两个都是"处理画布内容"。
 *
 * 还差的是 agent 的自然语言回复 —— 那要 opencode 的会话流，不是这一层。
 *
 * 下半部分是真的：`<Generate>` 就是我们的输入框，只是造型按官方的
 * `--home-input-*` 改过（圆角 24、阴影、工具行）。
 */
export function ChatPanel({
  file,
  events,
  activity,
  messages,
  agentRunning,
  onStop,
  saving,
  composerOpen,
  onDone,
  onReload,
  onCollapse,
  initialPrompt,
  initialAttachments,
  question,
  onAnswer,
}: {
  file: CanvasFile | null
  events: { at: string; event: string }[]
  activity: ToolActivity[]
  /** agent 的对话记录。 */
  messages: AgentMsg[]
  agentRunning: boolean
  onStop: () => void
  saving: "idle" | "saving" | "saved" | "failed"
  composerOpen: boolean
  onDone: () => void
  onReload: () => void
  onCollapse: () => void
  initialPrompt?: string
  /** 首页带过来的参考素材，作为底图。 */
  initialAttachments?: string[]
  /** 待回答的决策点。`null` = 没有。 */
  question: QuestionRequest | null
  /** `answers` 为 null 表示跳过（对应 question.rejected）。 */
  onAnswer: (id: string, answers: string[][] | null) => void
}) {
  return (
    <aside
      className="flex h-full w-[380px] shrink-0 flex-col border-l"
      style={{ background: "var(--background)", borderColor: "var(--border)" }}
    >
      {/* 右栏顶部也当拖拽区：侧栏收起时那一条就没了，不留第二处会拖不动。 */}
      <div data-tauri-drag-region className="flex h-11 shrink-0 items-center gap-2 px-3">
        <GripVertical size={14} style={{ color: "var(--muted-foreground)" }} />
        <strong className="truncate text-[13px]">画布</strong>
        {/* 节点数和保存状态收进顶栏。原来它们占了正文第一行，
            而那个位置现在是对话 —— 状态是背景信息，不该排在对话前面。 */}
        <span className="truncate text-[12px]" style={{ color: "var(--muted-foreground)" }}>
          {file ? `${file.nodes.length} 节点` : "连接中…"}
          {saving !== "idle" &&
            ` · ${{ saving: "保存中", saved: "已保存", failed: "保存失败", idle: "" }[saving]}`}
        </span>
        <span className="flex-1" />
        <button
          onClick={onReload}
          title="重新加载"
          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--canvas-controls-hover)]"
          style={{ color: "var(--topbar-icon-fg)" }}
        >
          <Plus size={16} />
        </button>
        <button
          onClick={onCollapse}
          title="收起面板"
          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--canvas-controls-hover)]"
          style={{ color: "var(--topbar-icon-fg)" }}
        >
          <PanelRight size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-2 text-[13px] leading-6">
        {/* agent 的决策点。协议是 opencode 自带的 question 工具，
            见 Question.tsx 的注释。 */}
        {question && (
          <div className="mb-3">
            <QuestionCard
              request={question}
              onReply={(answers) => onAnswer(question.id, answers)}
              onReject={() => onAnswer(question.id, null)}
            />
          </div>
        )}

        {/* 对话。**空的时候不放假消息** —— 放一句"你好，我能帮你做什么"
            的话，用户会以为已经连上了模型，而那句话只是写死的。 */}
        {messages.length === 0 ? (
          <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
            说一句话，蒜狸会调用工具把东西做出来，产物直接出现在画布上。
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages
              // `tool` 那些不显示：它们是工具的原始 JSON 返回，几 KB 一条，
              // 而用户要看的是"做了什么"——那在下面的活动流里。
              .filter((m) => m.role !== "tool" && (m.content ?? "").trim())
              .map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[85%] rounded-2xl rounded-br-md px-3 py-2 text-[13px] whitespace-pre-wrap"
                        : "text-[13px] leading-6 whitespace-pre-wrap"
                    }
                    style={
                      m.role === "user"
                        ? { background: "var(--bg-subtle)", color: "var(--foreground)" }
                        : { color: "var(--foreground)" }
                    }
                  >
                    {m.content}
                  </div>
                </div>
              ))}
          </div>
        )}

        {agentRunning && (
          <div className="mt-3 flex items-center gap-2 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
            <Loader2 size={13} className="animate-spin" />
            思考中…
            <button onClick={onStop} className="ml-1 underline">
              停止
            </button>
          </div>
        )}

        {/* 工具活动流。每个工具调用都经过我们自己的进程，所以这条流是
            agent 真在做什么的直接记录。 */}
        <div className="mt-4 space-y-1.5">
          {mergeCalls(activity).map((c) => (
            <CallRow key={c.id} call={c} />
          ))}
        </div>

        {/* 原始 /ws 事件。**留着，但收起来。** 活动流是给用户看的，
            这条是排查用的 —— 工具活动没出现时，这里能区分"事件没发出来"
            和"发出来了但没渲染"。 */}
        {events.length > 0 && (
          <details className="mt-4">
            <summary
              className="cursor-pointer text-[11px] select-none"
              style={{ color: "var(--muted-foreground)" }}
            >
              原始事件（{events.length}）
            </summary>
            <div className="mt-1 space-y-0.5">
              {events.map((e, i) => (
                <p
                  key={i}
                  className="font-mono text-[11px]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <span className="opacity-60">{e.at}</span> {e.event}
                </p>
              ))}
            </div>
          </details>
        )}
      </div>

      <div className="shrink-0 px-3 pb-3">
        <Generate
          onDone={onDone}
          autoFocus={composerOpen}
          initial={initialPrompt}
          initialAttachments={initialAttachments}
        />
      </div>
    </aside>
  )
}

/**
 * 一条工具活动。
 *
 * 官方把查资料类的（`todowrite` / `search_knowledge` / `select_image_recipe`）
 * 渲染成"思考"而不是工具卡片 —— 那几个是 agent 在决定怎么做之前查东西，
 * 不是它做了什么。混进工具卡片里会让活动流看起来做了一堆和产物无关的事。
 */
function CallRow({ call }: { call: Call }) {
  const { text } = labelFor(call.tool)
  const thinking = THINKING_TOOLS.has(call.tool)
  const failed = call.phase === "error"

  return (
    <div className="flex items-start gap-1.5">
      <span className="mt-[3px] shrink-0">
        {call.phase === "start" ? (
          <Loader2 size={12} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />
        ) : failed ? (
          <X size={12} style={{ color: "var(--canvas-node-tag-red)" }} />
        ) : (
          <Check size={12} style={{ color: "var(--muted-foreground)" }} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <span
          className={`text-[12px] ${thinking ? "italic" : ""}`}
          style={{ color: failed ? "var(--canvas-node-tag-red)" : "var(--muted-foreground)" }}
        >
          {text}
        </span>
        {/* 失败原因**始终显示，不折叠**。折起来的话，一次失败在界面上
            和一次成功长得几乎一样，用户只会觉得"做了但没效果"。 */}
        {failed && call.error && (
          <p className="mt-0.5 text-[11px] break-words" style={{ color: "var(--canvas-node-tag-red)" }}>
            {call.error}
          </p>
        )}
      </div>
    </div>
  )
}
