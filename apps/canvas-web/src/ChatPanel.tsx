import {
  Check,
  ChevronRight,
  Copy,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  PanelRight,
  Plus,
  X,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

import type { AgentMsg, CanvasFile, ToolActivity } from "./api"
import { Generate } from "./Generate"
import { QuestionCard, type QuestionRequest } from "./Question"
import { THINKING_TOOLS, activityText, mergeCalls, type Call } from "./toolLabels"

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
  title,
  events,
  activity,
  messages,
  agentRunning,
  onStop,
  saving,
  composerOpen,
  onDone,
  onNewChat,
  onCollapse,
  initialPrompt,
  initialAttachments,
  onConsumed,
  question,
  onAnswer,
  onOpenAsset,
}: {
  file: CanvasFile | null
  /** 这次创作的名字。显示在面板顶上。 */
  title?: string
  events: { at: string; event: string }[]
  activity: ToolActivity[]
  /** agent 的对话记录。 */
  messages: AgentMsg[]
  agentRunning: boolean
  onStop: () => void
  saving: "idle" | "saving" | "saved" | "failed"
  composerOpen: boolean
  onDone: () => void
  /** 开一段新对话（= 新建一张画布）。官方的 `chat.newChat`。 */
  onNewChat: () => void
  onCollapse: () => void
  initialPrompt?: string
  /** 首页带过来的参考素材，作为底图。 */
  initialAttachments?: string[]
  /** 输入框把上面两个消费掉了。父组件据此清空，见 App 的 `consumePending`。 */
  onConsumed?: () => void
  /** 待回答的决策点。`null` = 没有。 */
  question: QuestionRequest | null
  /** `answers` 为 null 表示跳过（对应 question.rejected）。 */
  onAnswer: (id: string, answers: string[][] | null) => void
  /** 点产物 chip 时打开它。给了才显示成可点。 */
  onOpenAsset?: (path: string) => void
}) {
  const calls = mergeCalls(activity)
  // 见下面 `原始事件` 那段的注释：只在确实出问题时露出来。
  const showEvents =
    events.length > 0 &&
    (calls.some((c) => c.phase === "error") || (calls.length === 0 && messages.length === 0))

  return (
    <aside
      className="flex h-full w-[380px] shrink-0 flex-col border-l"
      style={{ background: "var(--background)", borderColor: "var(--border)" }}
    >
      {/* 右栏顶部也当拖拽区：侧栏收起时那一条就没了，不留第二处会拖不动。 */}
      <div data-tauri-drag-region className="flex h-11 shrink-0 items-center gap-2 px-3">
        <GripVertical size={14} style={{ color: "var(--muted-foreground)" }} />
        {/* **标题是这次创作的名字，不是"画布"。** 官方那栏顶上写的就是
            会话名（也就是第一句提示词），侧边栏里选中的那条和这里是同一个
            东西 —— 写死"画布"的话，开着好几个会话时根本分不清在哪一个里。 */}
        <strong className="truncate text-[13px]">{title?.trim() || "对话"}</strong>
        {/* 节点数和保存状态收进顶栏。状态是背景信息，不该排在对话前面。
            **只在有话说的时候才占位置** —— 常态下那句"N 节点"会把标题挤窄。 */}
        {(saving !== "idle" || !file) && (
          <span className="shrink-0 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
            {!file
              ? "连接中…"
              : { saving: "保存中", saved: "已保存", failed: "保存失败", idle: "" }[saving]}
          </span>
        )}
        <span className="flex-1" />
        {/* 官方这个位置是 `chat.newChat` =「新建对话」—— 图标是 `+`。
            我们之前把它接成了「重新加载」：**图标说的是"加一个"，
            做的却是"刷新"**，用户点它是想开一段新对话。 */}
        <button
          onClick={onNewChat}
          title="新建对话"
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
            {/* **`key` 必须带上题目 id。** 没有它，agent 问第二道题时 React
                会复用同一个实例，而 `QuestionCard` 里 `picked` / `custom`
                的初值是 `useState(() => request.questions.map(…))` ——
                初始化只在首次挂载跑一次。

                第二道题题数更多时，`picked[qi]!` 就是 `undefined`,
                点一下选项直接白屏。换题 = 换实例，这是最省事也最不容易
                再错的做法。 */}
            <QuestionCard
              key={question.id}
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
                // **key 不能只用下标。** 后端在历史超长时会从头截断
                // （`agent/mod.rs` 的 `truncate` 返回 `msgs[start..]`），
                // 切画布时整份列表也会换掉 —— 两种情况下相同的下标会指向
                // 完全不同的消息，而 `Message` 里的「已复制」状态会跟着
                // 留在原位，串到别人身上。
                //
                // `at` 是发送时刻，同一条消息在截断前后不变。它是可选的
                // （老数据没有），所以拿不到时退回下标。
                <Message
                  key={m.at ? `${m.at}-${m.role}` : `i${i}`}
                  role={m.role}
                  content={m.content ?? ""}
                />
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
        <div className="mt-3 space-y-2">
          {calls.map((c) => (
            <CallRow key={c.id} call={c} onOpen={onOpenAsset} />
          ))}
        </div>

        {/* 原始 /ws 事件。**默认不显示** —— 官方那栏没有这种东西，
            平时挂在对话下面只是噪声。
            但它有真实的排查价值：工具活动没出现时，这里能区分"事件没发
            出来"和"发出来了但没渲染"。所以只在**确实出问题的时候**露出来：
            有失败的调用，或者事件来了却一条活动都没渲染出来。 */}
        {showEvents && (
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

      <div className="shrink-0 px-3 pb-2">
        <Generate
          onDone={onDone}
          autoFocus={composerOpen}
          initial={initialPrompt}
          initialAttachments={initialAttachments}
          onConsumed={onConsumed}
        />
        {/* 官方的 `chat.complianceNotice`。生成式产品里这句是要有的，
            而且位置就在输入框正下方。 */}
        <p
          className="pt-1.5 text-center text-[11px]"
          style={{ color: "var(--muted-foreground)" }}
        >
          请确保不侵权，合法使用
        </p>
      </div>
    </aside>
  )
}

/**
 * 一条消息。
 *
 * 用户的是右对齐气泡，assistant 的是裸文本 —— 官方就是这么分的，
 * 两边都套气泡的话，长回复会被挤成一根细柱子。
 *
 * ## 悬停出操作
 *
 * 官方在 assistant 消息下面挂「复制 / 更多操作」，**平时不占位置**。
 * 常驻的话每条回复下面都有一排图标，把对话切得很碎。
 */
function Message({ role, content }: { role: string; content: string }) {
  const [copied, setCopied] = useState(false)
  // 「已复制」那 1.2 秒的计时器要能取消。`Message` 会随历史截断和切画布
  // 卸载 —— 计时器落在已卸载的组件上，React 18 不报错，但那是个真泄漏，
  // 而且用户快速复制两条时第一条的计时器会把第二条的状态提前清掉。
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current)
  }, [])
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[85%] rounded-2xl rounded-br-md px-3 py-2 text-[13px] whitespace-pre-wrap"
          style={{ background: "var(--bg-subtle)", color: "var(--foreground)" }}
        >
          {content}
        </div>
      </div>
    )
  }
  return (
    <div className="group">
      <div className="text-[13px] leading-6 whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>
        {content}
      </div>
      <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          title={copied ? "已复制" : "复制消息"}
          aria-label="复制消息"
          onClick={() => {
            // `writeText` 在非安全上下文里会 reject。**要 catch** ——
            // 不 catch 的话控制台里一条未处理的 rejection，而按钮看起来
            // 像是成功了。
            void navigator.clipboard
              .writeText(content)
              .then(() => {
                setCopied(true)
                if (copyTimer.current) clearTimeout(copyTimer.current)
                copyTimer.current = setTimeout(() => setCopied(false), 1200)
              })
              .catch(() => {})
          }}
          className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-[var(--canvas-controls-hover)]"
          style={{ color: "var(--muted-foreground)" }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  )
}

/**
 * 一条工具活动。
 *
 * 官方把查资料类的（`todowrite` / `search_knowledge` / `select_image_recipe`）
 * 渲染成"思考"而不是工具卡片 —— 那几个是 agent 在决定怎么做之前查东西，
 * 不是它做了什么。混进工具卡片里会让活动流看起来做了一堆和产物无关的事。
 */
function CallRow({ call, onOpen }: { call: Call; onOpen?: (path: string) => void }) {
  const [open, setOpen] = useState(false)
  const text = activityText(call)
  const thinking = THINKING_TOOLS.has(call.tool)
  const failed = call.phase === "error"
  // 有东西可展开才做成可点的。没有的话点了没反应，比不能点更糟。
  const detail = call.summary?.trim()

  return (
    <div>
      <div className="flex items-start gap-1.5">
        <span className="mt-[3px] shrink-0">
          {call.phase === "start" ? (
            <Loader2 size={12} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />
          ) : failed ? (
            <X size={12} style={{ color: "var(--canvas-node-tag-red)" }} />
          ) : (
            <ImageIcon size={12} style={{ color: "var(--muted-foreground)" }} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          {/* 官方那行是「图标 + 文案 + ›」，点开看细节。 */}
          <button
            type="button"
            disabled={!detail}
            onClick={() => setOpen((v) => !v)}
            className="flex max-w-full items-center gap-1 text-left enabled:cursor-pointer"
            style={{ color: failed ? "var(--canvas-node-tag-red)" : "var(--muted-foreground)" }}
          >
            <span className={`truncate text-[12px] ${thinking ? "italic" : ""}`}>{text}</span>
            {detail && (
              <ChevronRight
                size={12}
                className="shrink-0 transition-transform"
                style={{ transform: open ? "rotate(90deg)" : undefined }}
              />
            )}
          </button>

          {open && detail && (
            <pre
              className="mt-1 max-h-40 overflow-auto rounded-md px-2 py-1.5 text-[11px] whitespace-pre-wrap"
              style={{ background: "var(--bg-subtle)", color: "var(--muted-foreground)" }}
            >
              {detail}
            </pre>
          )}

          {/* 失败原因**始终显示，不折叠**。折起来的话，一次失败在界面上
              和一次成功长得几乎一样，用户只会觉得"做了但没效果"。 */}
          {failed && call.error && (
            <p className="mt-0.5 text-[11px] break-words" style={{ color: "var(--canvas-node-tag-red)" }}>
              {call.error}
            </p>
          )}

          {/* 产物 chip。官方的 `chat.turnArtifacts` —— 只说"生成 1 张图片"
              的话，画布上同时有好几张图时用户对不上是哪一张。 */}
          {call.artifact && <FileChip path={call.artifact} onOpen={onOpen} />}
        </div>
      </div>
    </div>
  )
}

/** 一个产物文件。显示文件名，点了打开。 */
function FileChip({ path, onOpen }: { path: string; onOpen?: (path: string) => void }) {
  // 只显示文件名。整条工作区路径在这个宽度里会被截得只剩目录名，
  // 而目录名对每个产物都一样。
  const name = path.split("/").pop() || path
  return (
    <button
      type="button"
      title={path}
      disabled={!onOpen}
      onClick={() => onOpen?.(path)}
      className="mt-1 flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-[12px] enabled:cursor-pointer enabled:hover:bg-[var(--canvas-controls-hover)]"
      style={{ background: "var(--bg-subtle)", color: "var(--foreground)" }}
    >
      <ImageIcon size={12} className="shrink-0" style={{ color: "var(--muted-foreground)" }} />
      <span className="truncate font-mono">{name}</span>
    </button>
  )
}
