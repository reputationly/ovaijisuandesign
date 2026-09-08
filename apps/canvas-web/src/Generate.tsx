import { Loader2, Sparkles, X } from "lucide-react"
import { useRef, useState } from "react"

import { createMediaNode, importUrl, pollTask, submitImage } from "./api"
import { cn } from "./lib"

/** 画布上常见的比例。和官方模型目录里那组一致。 */
const RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"]
const RESOLUTIONS = ["1K", "2K"]

type Phase =
  | { kind: "idle" }
  | { kind: "generating"; seconds: number }
  | { kind: "importing" }
  | { kind: "failed"; message: string }

/**
 * 生成面板。
 *
 * 整条链跨两个后端：
 *
 * ```text
 * 出图    我们的 gateway → maas-media → 平台（返回公网 URL）
 * 落盘    官方 gateway /api/files/import-url
 * 建节点  官方 gateway /api/canvas/media-node
 * ```
 *
 * 编排放在前端而不是我们的 gateway 里：这一步的目的是验证"我的前端 → 我的
 * 后端"这条线，让借用官方的那两跳**显式可见**。等自己的 gateway 有了资产库，
 * 后两跳会挪进去，前端只留一次调用。
 */
export function Generate({ onDone }: { onDone: () => void }) {
  const [prompt, setPrompt] = useState("")
  const [ratio, setRatio] = useState("1:1")
  const [resolution, setResolution] = useState("1K")
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  const abort = useRef<AbortController | null>(null)

  const busy = phase.kind === "generating" || phase.kind === "importing"

  const run = async () => {
    if (!prompt.trim() || busy) return
    const ctrl = new AbortController()
    abort.current = ctrl
    setPhase({ kind: "generating", seconds: 0 })
    try {
      const taskId = await submitImage({ prompt, aspectRatio: ratio, resolution })
      const url = await pollTask(taskId, ctrl.signal, (seconds) =>
        setPhase((p) => (p.kind === "generating" ? { kind: "generating", seconds } : p)),
      )
      setPhase({ kind: "importing" })
      const asset = await importUrl(url)
      await createMediaNode(asset.path)
      setPhase({ kind: "idle" })
      setPrompt("")
      onDone()
    } catch (err) {
      setPhase({ kind: "failed", message: err instanceof Error ? err.message : String(err) })
    } finally {
      abort.current = null
    }
  }

  return (
    <div className="flex flex-col gap-2 border-b border-line bg-panel px-3 py-2">
      <div className="flex items-center gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) void run()
          }}
          placeholder="描述要生成的画面，回车开始"
          disabled={busy}
          className="min-w-0 flex-1 rounded border border-line bg-[#0f1015] px-2.5 py-1.5 outline-none placeholder:text-dim focus:border-accent disabled:opacity-50"
        />

        <Select value={ratio} onChange={setRatio} options={RATIOS} disabled={busy} />
        <Select value={resolution} onChange={setResolution} options={RESOLUTIONS} disabled={busy} />

        {busy ? (
          <button
            onClick={() => abort.current?.abort()}
            className="flex items-center gap-1.5 rounded border border-line bg-raised px-3 py-1.5 hover:border-bad"
          >
            <X size={14} />
            取消
          </button>
        ) : (
          <button
            onClick={() => void run()}
            disabled={!prompt.trim()}
            className="flex items-center gap-1.5 rounded border border-accent bg-accent px-3 py-1.5 text-[#10121a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Sparkles size={14} />
            生成
          </button>
        )}
      </div>

      {phase.kind !== "idle" && (
        <div
          className={cn(
            "flex items-center gap-1.5 font-mono text-xs",
            phase.kind === "failed" ? "text-bad" : "text-dim",
          )}
        >
          {busy && <Loader2 size={12} className="animate-spin" />}
          {phase.kind === "generating" && `平台出图中… ${phase.seconds}s`}
          {phase.kind === "importing" && "收进工作区并建节点…"}
          {phase.kind === "failed" && phase.message}
        </div>
      )}
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
      className="rounded border border-line bg-raised px-2 py-1.5 outline-none focus:border-accent disabled:opacity-50"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}
