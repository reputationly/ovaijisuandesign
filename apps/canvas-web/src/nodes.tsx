/** 四种节点的渲染。这是官方画布里唯一闭源、必须自己写的那一层。 */

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react"
import { AlertTriangle, FileQuestion } from "lucide-react"
import { createContext, useContext, useState, type ReactNode } from "react"

import { assetUrl } from "./api"
import type { NodeData } from "./canvas"
import { TextEditor } from "./TextEditor"
import { Waveform } from "./Waveform"

/**
 * 节点里能发起的动作。
 *
 * 用 context 而不是塞进 `data`：`data` 每次重建图都会重新构造，把回调放进去
 * 会让所有节点在每次刷新时都重渲染。
 */
export interface CanvasActions {
  saveText(nodeId: string, content: string, expectedHash: string | undefined): Promise<void>
}

export const CanvasActionsContext = createContext<CanvasActions | null>(null)

type Props = NodeProps<Node<NodeData>>

/** 节点类型 → 官方 `--canvas-node-tag-*` 里的哪一档颜色。
 *
 * 他们有 7 种（blue/green/purple/deep-purple/orange/red/yellow），每种三个
 * 变量（基色 / surface / foreground）。用哪个配哪个是产品决定，我们按媒体
 * 类型分，颜色值本身照抄。 */
const TAG_COLOR: Record<string, string> = {
  image: "blue",
  video: "purple",
  audio: "green",
  text: "yellow",
}

/**
 * 节点外壳。**结构照官方的 NodeShell / NodeBody 两层**：
 *
 * - 外层 `canvas-node-shell`：只管定位和状态类（生成中 / 新节点），
 *   `overflow-visible`，因为选中的 outline 和工具栏要溢出去。
 * - 内层：`overflow-hidden` + 圆角 16px，**媒体变体没有边框也没有背景** ——
 *   就是媒体本身。有边框的是 `panel` 变体（文本那种），padding 12px 16px。
 *
 * 选中态是 outline 而不是 border，宽度 `max(1.5px, calc(1.5px / zoom))`：
 * **反向抵消缩放**，这样缩小画布时描边仍是屏幕上的 1.5 物理像素，
 * 不会细到看不见。这个表达式要靠 `--canvas-zoom` 喂，见 App.tsx。
 */
function Frame({
  data,
  selected,
  kind,
  children,
  variant = "media",
}: Props & { kind: string; children: ReactNode; variant?: "media" | "panel" }) {
  const name =
    data.detail?.name ?? (data.raw.data?.name as string | undefined) ?? data.raw.id.slice(0, 8)
  const tag = TAG_COLOR[kind] ?? "blue"
  const isPanel = variant === "panel"
  return (
    <div
      className="canvas-node-shell group relative h-full w-full overflow-visible"
      data-selected={selected ? "true" : "false"}
      data-kind={kind}
    >
      <Handle type="target" position={Position.Left} />
      <div
        className="relative h-full w-full overflow-hidden"
        style={{
          borderRadius: "var(--canvas-media-node-radius)",
          background: isPanel ? "var(--canvas-node-bg)" : undefined,
          border: isPanel ? "1px solid var(--canvas-node-border)" : "none",
          outlineStyle: "solid",
          outlineWidth: selected ? "max(1.5px, calc(1.5px / var(--canvas-zoom, 1)))" : 0,
          outlineColor: selected ? "var(--canvas-node-border-selected)" : "transparent",
          outlineOffset: 0,
          transition: "outline-color 0.2s, border-color 0.15s",
          ...(isPanel ? { padding: "12px 16px" } : {}),
        }}
      >
        {children}
      </div>

      {/* 名字条：**浮在节点下方外侧**，不占节点内部空间。
          官方的媒体节点是"整块就是媒体"，名字不在卡片里 —— 塞进去会让
          每个节点都矮一截，一屏能看到的图变少，那是最直观的差异之一。
          只在 hover 或选中时出现，平时画布上是干净的。 */}
      <div
        className="pointer-events-none absolute top-full left-0 mt-1.5 flex w-full items-center gap-1.5 overflow-hidden text-[11px] whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        style={{ opacity: selected ? 1 : undefined }}
        title={name}
      >
        <span
          className="shrink-0 rounded-sm px-1.5 text-[10px]"
          style={{
            // 官方那套 node-tag 配色：底色由 surface 按 strength 混出来，
            // 前景色单独给 —— 明暗两套下都保证对比度。
            background: `color-mix(in srgb, var(--canvas-node-tag-${tag}-surface) var(--canvas-node-tag-surface-strength), var(--canvas-node-tag-surface-base))`,
            color: `var(--canvas-node-tag-${tag}-foreground)`,
          }}
        >
          {kind}
        </span>
        <span className="truncate text-[var(--canvas-controls-text-muted)]">{name}</span>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  )
}

/** 没有 assetId 的媒体节点是占位（生成中 / 生成失败）。 */
function Placeholder({ text, icon }: { text: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 text-center text-xs text-dim">
      {icon}
      {text}
    </div>
  )
}

export function ImageNode(props: Props) {
  const id = props.data.raw.assetId
  return (
    <Frame {...props} kind="image">
      {id ? (
        // 走缩略图：原图动辄 1.8MB，而卡片才 350px 宽。宽度取 512 而不是 2x
        // 卡片宽（700）—— gateway 回的是 PNG，无损压缩对照片几乎不起作用，
        // 实测 700 要 1.38MB，512 只要 357KB，肉眼分不出。
        <img src={assetUrl(id, 512)} alt="" loading="lazy" className="h-full w-full object-contain" />
      ) : (
        <Placeholder text="占位节点（无 assetId）" />
      )}
    </Frame>
  )
}

export function VideoNode(props: Props) {
  const id = props.data.raw.assetId
  return (
    <Frame {...props} kind="video">
      {id ? (
        <video
          src={assetUrl(id)}
          controls
          preload="metadata"
          className="h-full w-full object-contain"
          onPointerDown={(e) => e.stopPropagation()}
        />
      ) : (
        <Placeholder text="占位节点" />
      )}
    </Frame>
  )
}

export function AudioNode(props: Props) {
  const id = props.data.raw.assetId
  return (
    <Frame {...props} kind="audio">
      {id ? <Waveform src={assetUrl(id)} /> : <Placeholder text="占位节点" />}
    </Frame>
  )
}

/**
 * 文本节点。双击进入编辑。
 *
 * 内容是 Markdown 源码，编辑器用的是收窄过的纯文本 schema —— 理由见
 * [`TextEditor`]。
 */
export function TextNode(props: Props) {
  const actions = useContext(CanvasActionsContext)
  const detail = props.data.detail
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)

  const text = detail?.textContent

  const start = () => {
    if (text === undefined) return
    setDraft(text)
    setError(null)
    setEditing(true)
  }

  const finish = async () => {
    setEditing(false)
    if (draft === text) return
    try {
      await actions?.saveText(props.id, draft, detail?.textContentHash)
    } catch (err) {
      // 失败时把编辑器重新打开、草稿留着 —— 直接丢回只读会让用户刚写的东西
      // 凭空消失，而最常见的失败恰恰是"别人也在改"，这时草稿最值钱。
      setError(err instanceof Error ? err.message : String(err))
      setEditing(true)
    }
  }

  // 文本走 panel 变体：有背景、有边框、内边距 —— 官方就是这么分的，
  // 媒体是"整块媒体"，文本是"一张纸"。
  return (
    <Frame {...props} kind="text" variant="panel">
      <div className="relative -m-3 h-[calc(100%+24px)] w-[calc(100%+32px)]" onDoubleClick={start}>
        {error && (
          <div className="absolute inset-x-0 top-0 z-10 flex items-start gap-1.5 px-2 py-1 text-[10px] leading-4"
            style={{ background: "color-mix(in srgb, var(--canvas-node-tag-red) 22%, var(--canvas-node-bg))", color: "var(--canvas-node-tag-red)" }}>
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        {editing ? (
          <TextEditor value={draft} onChange={setDraft} onDone={() => void finish()} />
        ) : text === undefined ? (
          <Placeholder text="读取中…" />
        ) : (
          <pre className="m-0 h-full w-full overflow-auto px-4 py-3 font-mono text-[11px] leading-6 break-words whitespace-pre-wrap text-[var(--canvas-controls-text)]">
            {text}
          </pre>
        )}
      </div>
    </Frame>
  )
}

/**
 * 认不出的类型。
 *
 * 官方那边至少还有 group / table / file / plugin 几种，将来升级也会加新的。
 * 显式画成"未支持"而不是让它退回 React Flow 的默认节点 —— 后者看起来像渲染
 * 正常，实际上内容一个字都没显示。
 */
export function UnknownNode(props: Props) {
  const raw = props.data.raw
  return (
    <Frame {...props} kind={raw.type || "?"}>
      <Placeholder
        icon={<FileQuestion size={18} />}
        text={`未支持的节点类型：${raw.type || "(空)"}`}
      />
    </Frame>
  )
}

export const nodeTypes = {
  image: ImageNode,
  video: VideoNode,
  audio: AudioNode,
  text: TextNode,
  unknown: UnknownNode,
}
