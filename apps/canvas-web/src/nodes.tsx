/** 四种节点的渲染。这是官方画布里唯一闭源、必须自己写的那一层。 */

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react"
import { AlertTriangle, FileQuestion } from "lucide-react"
import { createContext, useContext, useState, type ReactNode } from "react"

import { assetUrl } from "./api"
import type { NodeData } from "./canvas"
import { cn } from "./lib"
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

function Frame({
  data,
  selected,
  kind,
  children,
}: Props & { kind: string; children: ReactNode }) {
  const name =
    data.detail?.name ?? (data.raw.data?.name as string | undefined) ?? data.raw.id.slice(0, 8)
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-lg border bg-panel",
        selected ? "border-accent" : "border-line",
      )}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#0f1015]">{children}</div>
      <div
        className="flex items-center gap-1.5 overflow-hidden border-t border-line px-2 py-1 text-[11px] whitespace-nowrap text-dim"
        title={name}
      >
        <span className="rounded-sm bg-[#2b2f3c] px-1.5 text-[10px] text-[#a9b2c9]">{kind}</span>
        <span className="truncate">{name}</span>
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

  return (
    <Frame {...props} kind="text">
      <div className="relative h-full w-full" onDoubleClick={start}>
        {error && (
          <div className="absolute inset-x-0 top-0 z-10 flex items-start gap-1.5 bg-[#3a1f22] px-2 py-1 text-[10px] leading-4 text-[#ffd7d7]">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        {editing ? (
          <TextEditor value={draft} onChange={setDraft} onDone={() => void finish()} />
        ) : text === undefined ? (
          <Placeholder text="读取中…" />
        ) : (
          <pre className="m-0 h-full w-full overflow-auto p-2.5 font-mono text-[11px] leading-6 break-words whitespace-pre-wrap text-[#cfd3dd]">
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
