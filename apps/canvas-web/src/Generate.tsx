import { ArrowUp, FileText, Loader2, Plus, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { agentSend, uploadFiles } from "./api"

/** 画布上常见的比例。和官方模型目录里那组一致。 */
const RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"]
const RESOLUTIONS = ["1K", "2K"]

type Phase =
  | { kind: "idle" }
  | { kind: "generating"; seconds: number }
  | { kind: "placing" }
  | { kind: "failed"; message: string }

/**
 * 生成面板。
 *
 * ```text
 * 出图 + 落盘   我们的 gateway（内部借上游的 import-url 收进工作区）
 * 建节点        /api/canvas/media-node
 * ```
 *
 * 前端只知道"提交 → 轮询 → 拿到一个工作区路径 → 建节点" —— 这正是官方
 * 契约的形状。落盘藏在 gateway 里，等自己的资产库写完，前端一行都不用改。
 */
export function Generate({
  onDone,
  autoFocus,
  initial,
  initialAttachments,
  onConsumed,
}: {
  onDone: () => void
  autoFocus?: boolean
  /**
   * 首页带过来的参考素材（工作区相对路径）。
   *
   * **非空就是图生图。** gateway 那边按 `image_paths` 非空分叉，
   * 见 `generate.rs::submit_image`。
   */
  initialAttachments?: string[]
  /** 播种完就通知父组件清掉 —— 那两个是"交接一次"的量。 */
  onConsumed?: () => void
  /**
   * 从首页带过来的提示词。
   *
   * **必须是 prop，不能靠事件。** 之前用的是 `window.dispatchEvent`，
   * 而首页那一下是「切到画布 + 发事件」同一个 tick 完成的 —— 右栏还没渲染
   * 出来，监听器根本没挂上，事件被直接丢掉。表现就是"点了没反应"。
   */
  initial?: string
}) {
  const [prompt, setPrompt] = useState("")
  const [ratio, setRatio] = useState("1:1")
  const [resolution, setResolution] = useState("1K")
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // 首页带过来的内容。只在它变化时覆盖，不会把用户正在打的字冲掉。
  useEffect(() => {
    if (initial) {
      setPrompt(initial)
      inputRef.current?.focus()
    }
  }, [initial])

  /**
   * 这一条要带的参考素材。
   *
   * **必须是本地状态，不能直接用 `initialAttachments` 那个 prop。**
   * 用 prop 的话发送后没人清它 —— 于是"以此为输入生成"用过一次之后，
   * 这张画布里**之后的每一条消息都会悄悄再带上那张图**，而界面上
   * 什么都看不见。
   */
  const [attachments, setAttachments] = useState<string[]>([])
  useEffect(() => {
    if (!initialAttachments?.length && !initial) return
    if (initialAttachments?.length) setAttachments(initialAttachments)
    // 播种完立刻通知父组件清掉。留着的话输入框每次重挂都会被重新播种，
    // 上一次的提示词和参考图又回来了 —— 而界面上看不出它们是旧的。
    onConsumed?.()
  }, [initialAttachments, initial, onConsumed])
  const [uploading, setUploading] = useState(false)
  const abort = useRef<AbortController | null>(null)

  const busy = phase.kind === "generating" || phase.kind === "placing"

  /**
   * 发给 agent。
   *
   * **不再直接调 submitImage。** 那条路只能出图 —— 用户说「做一支 15 秒的
   * 短片」会被当成一句出图的提示词，出来一张静态图，而且不报错。
   * 现在这里只负责把话交出去，做什么、调哪些工具由 agent 决定。
   *
   * 进度不在这里显示：右栏的对话和活动流会实时长出来，那里比一个
   * "生成中 12s" 的计数器信息量大得多。
   */
  const run = async () => {
    if (!prompt.trim() || busy) return
    const text = prompt
    setPhase({ kind: "generating", seconds: 0 })
    try {
      await agentSend(text, attachments)
      // 发出去就清空。**不等 agent 跑完** —— 一轮可能几分钟，
      // 输入框锁着的话用户连下一句都没法先写好。
      //
      // 附件也要清：它是"这一条"的素材，不是这张画布的常驻设置。
      setPrompt("")
      setAttachments([])
      setPhase({ kind: "idle" })
      onDone()
    } catch (err) {
      setPhase({ kind: "failed", message: err instanceof Error ? err.message : String(err) })
    } finally {
      abort.current = null
    }
  }

  // 造型按官方的 --home-input-* 那套：圆角 24、极淡边框、柔和阴影，
  // 输入区在上、工具行在下、发送键在右下角的圆形按钮里。
  return (
    <div
      className="flex flex-col"
      style={{
        borderRadius: "var(--home-input-radius)",
        background: "var(--home-input-surface)",
        border: "var(--home-input-border-width) solid var(--home-input-border)",
        boxShadow: "var(--home-input-shadow)",
      }}
    >
      {/* 附件条。**在输入框上面、能看见、能删。**
          之前 `initialAttachments` 只在发送时用、从不渲染 —— 用户不知道
          这一条带了什么，也没法去掉。

          图片直接给缩略图，其余给文件名：一律给文件名的话，传了三张参考图
          会看到三行看不出区别的 png，而参考图恰恰是靠"长什么样"来区分的。 */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pt-3">
          {attachments.map((path) => (
            <div key={path} className="group relative">
              {/^images?\//.test(path) ? (
                <img
                  src={`/files/${path}?w=120`}
                  alt=""
                  title={path}
                  className="h-14 w-14 rounded-lg object-cover"
                  style={{ border: "1px solid var(--border)" }}
                />
              ) : (
                <div
                  className="flex h-14 max-w-[150px] items-center gap-1.5 rounded-lg px-2.5 text-[12px]"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                  title={path}
                >
                  <FileText size={13} className="shrink-0" />
                  <span className="truncate">{path.split("/").pop()}</span>
                </div>
              )}
              <button
                type="button"
                title="移除"
                onClick={() => setAttachments((a) => a.filter((x) => x !== path))}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: "var(--foreground)", color: "var(--background)" }}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          // 回车发送、Shift+回车换行。`isComposing` 必须判 —— 中文输入法
          // 选词时按回车会被当成发送，把半截拼音提交上去。
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            void run()
          }
        }}
        placeholder="描述你要生成的内容"
        disabled={busy}
        rows={2}
        className="resize-none bg-transparent px-4 pt-3.5 outline-none disabled:opacity-50"
        style={{
          fontSize: "var(--home-input-editor-font-size)",
          color: "var(--foreground)",
        }}
      />

      <div className="flex items-center gap-1 px-2.5 pt-1 pb-2.5">
        {/* 上传。画布这个输入框之前**根本没有上传入口** —— 想拿一张本地图
            当参考，只能先从首页发一次，或者拖到画布上再右键「添加到对话」。 */}
        <label
          title="添加文件"
          className="flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-[var(--canvas-controls-hover)]"
          style={{ color: uploading ? "var(--muted-foreground)" : "var(--foreground)" }}
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          <input
            type="file"
            multiple
            hidden
            disabled={busy || uploading}
            onChange={async (e) => {
              const files = [...(e.target.files ?? [])]
              // **要清掉 value** —— 不清的话选同一个文件第二次不会触发
              // change，用户以为传失败了。
              e.target.value = ""
              if (files.length === 0) return
              setUploading(true)
              try {
                const paths = await uploadFiles(files)
                setAttachments((a) => [...a, ...paths.filter((p) => !a.includes(p))])
              } catch (err) {
                setPhase({
                  kind: "failed",
                  message: err instanceof Error ? err.message : String(err),
                })
              } finally {
                setUploading(false)
              }
            }}
          />
        </label>
        <Select value={ratio} onChange={setRatio} options={RATIOS} disabled={busy} />
        <Select value={resolution} onChange={setResolution} options={RESOLUTIONS} disabled={busy} />
        <span className="flex-1" />
        {phase.kind !== "idle" && (
          <span
            className="mr-1 flex items-center gap-1 font-mono text-[11px]"
            style={{
              color:
                phase.kind === "failed"
                  ? "var(--canvas-node-tag-red)"
                  : "var(--muted-foreground)",
            }}
          >
            {busy && <Loader2 size={11} className="animate-spin" />}
            {phase.kind === "generating" && `${phase.seconds}s`}
            {phase.kind === "placing" && "放到画布上…"}
            {phase.kind === "failed" && phase.message.slice(0, 40)}
          </span>
        )}
        <button
          onClick={() => (busy ? abort.current?.abort() : void run())}
          disabled={!busy && !prompt.trim()}
          title={busy ? "取消" : "生成"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-85 disabled:opacity-30"
          style={{
            background: "var(--canvas-primary-btn-bg)",
            color: "var(--canvas-primary-btn-icon)",
          }}
        >
          {busy ? <X size={15} /> : <ArrowUp size={16} />}
        </button>
      </div>
    </div>
  )
}

/** 朴素的下拉。等要做真正的参数面板时换成 Base UI。 */
function Select({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="rounded-md px-2 py-1 text-[12px] outline-none disabled:opacity-50"
      style={{
        background: "var(--canvas-controls-hover)",
        color: "var(--canvas-controls-text)",
        border: "none",
      }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}
