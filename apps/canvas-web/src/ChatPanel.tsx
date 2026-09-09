import { GripVertical, PanelRight, Plus } from "lucide-react"

import type { CanvasFile } from "./api"
import { Generate } from "./Generate"
import { QuestionCard, type QuestionRequest } from "./Question"

/**
 * 右侧对话面板。官方那栏是和 agent 的会话：上面是渲染好的回复，
 * 下面是输入框（圆角 24px、带一排工具、右下角发送按钮）。
 *
 * 我们还没有会话，所以上半部分先放**画布状态和 /ws 事件流** —— 这是我们
 * 真实有的东西。放一个假的聊天记录不如放真信息：等 agent 接进来时这里
 * 换成消息列表，布局不用动。
 *
 * 下半部分是真的：`<Generate>` 就是我们的输入框，只是造型按官方的
 * `--home-input-*` 改过（圆角 24、阴影、工具行）。
 */
export function ChatPanel({
  file,
  events,
  saving,
  composerOpen,
  onDone,
  onReload,
  onCollapse,
  initialPrompt,
  question,
  onAnswer,
}: {
  file: CanvasFile | null
  events: { at: string; event: string }[]
  saving: "idle" | "saving" | "saved" | "failed"
  composerOpen: boolean
  onDone: () => void
  onReload: () => void
  onCollapse: () => void
  initialPrompt?: string
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

        <p style={{ color: "var(--muted-foreground)" }}>
          {file ? `${file.nodes.length} 个节点 / ${file.edges.length} 条边` : "连接中…"}
          {saving !== "idle" && (
            <>

              <span
                style={{
                  color: saving === "failed" ? "var(--canvas-node-tag-red)" : undefined,
                }}
              >
                {{ saving: "保存中…", saved: "已保存", failed: "保存失败", idle: "" }[saving]}
              </span>
            </>
          )}
        </p>

        {/* /ws 事件流。这是我们真实有的东西 —— agent 在后台改画布时，
            这里会实时冒出来，是"另一端确实在动"的唯一可见证据。 */}
        <div className="mt-3 space-y-1">
          {events.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
              尚无事件。agent 改动画布时会在这里实时出现。
            </p>
          ) : (
            events.map((e, i) => (
              <p key={i} className="font-mono text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                <span className="opacity-60">{e.at}</span> {e.event}
              </p>
            ))
          )}
        </div>
      </div>

      <div className="shrink-0 px-3 pb-3">
        <Generate onDone={onDone} autoFocus={composerOpen} initial={initialPrompt} />
      </div>
    </aside>
  )
}
