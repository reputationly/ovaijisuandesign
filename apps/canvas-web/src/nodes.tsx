/** 四种节点的渲染。这是官方画布里唯一闭源、必须自己写的那一层。 */

import { Position, type Node, type NodeProps } from "@xyflow/react"
import {
  AlertTriangle,
  FileQuestion,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
} from "lucide-react"
import { createContext, useContext, useState, type ReactNode } from "react"

import { tagById, tagsOf } from "./tags"
import { assetUrl } from "./api"
import { AudioPlayer, VideoPlayer } from "./MediaPlayer"
import { MagneticHandle } from "./MagneticHandle"
import { StickerNode } from "./StickerCard"
import { NodeToolbar } from "./NodeToolbar"
import type { NodeData } from "./canvas"
import { FindBar } from "./FindBar"
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
  deleteNode(nodeId: string): Promise<void>
  /** 打开灯箱看大图。见 Lightbox.tsx。 */
  openLightbox(nodeId: string): void
  /** 打/取消画布标签。见 tags.ts。 */
  setNodeTags(nodeId: string, tags: string[]): Promise<void>
  /** 新建一个关键词并打在节点上。关键词不显示在画布上，只进筛选。 */
  addKeywordTo(nodeId: string, name: string): Promise<void>
  /** 把这个节点当作下一次生成的输入（工具条的「以此生成」）。 */
  useAsInput(nodeId: string): void
  /** 在画布上再放一张同一个素材的卡片（工具条的「复制」）。 */
  duplicateNode(nodeId: string): Promise<void>
  /** 点节点侧边的 ⊕：在那个位置开「添加节点」菜单。 */
  openAddNode(nodeId: string, screenX: number, screenY: number): void
}

export const CanvasActionsContext = createContext<CanvasActions | null>(null)

type Props = NodeProps<Node<NodeData>>

/** 节点类型 → 官方 `--canvas-node-tag-*` 里的哪一档颜色。
 *
 * 他们有 7 种（blue/green/purple/deep-purple/orange/red/yellow），每种三个
 * 变量（基色 / surface / foreground）。用哪个配哪个是产品决定，我们按媒体
 * 类型分，颜色值本身照抄。 */
// 标签配色留着：官方的 tag 是用户可设的，我们还没有那套 UI。
// 变量已经在 tokens.css 里，接上 tag 系统时直接用。
export const TAG_COLOR: Record<string, string> = {
  image: "blue",
  video: "purple",
  audio: "green",
  text: "yellow",
}

/** 名字条前面的类型图标。官方图片节点前面就是一个小图片图标。 */
const KIND_ICON: Record<string, ReactNode> = {
  image: <ImageIcon size={14} />,
  video: <Video size={14} />,
  audio: <Music size={14} />,
  text: <FileText size={14} />,
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
function Frame(
  props: Props & { kind: string; children: ReactNode; variant?: "media" | "panel" },
) {
  const { data, selected, kind, children, variant = "media" } = props
  const actions = useContext(CanvasActionsContext)
  const assetId = data.raw.assetId
  const name =
    data.detail?.name ?? (data.raw.data?.name as string | undefined) ?? data.raw.id.slice(0, 8)
  const isPanel = variant === "panel"
  const tags = tagsOf(data.raw)
  // 拖动中隐藏 ⊕ —— 官方的 `forceHidden = isMultiSelect || isDragging`。
  // 不隐藏的话，拖着节点走时那个圈会跟着抖，而且可能误触发连线。
  const dragging = props.dragging
  return (
    <div
      className="canvas-node-shell group relative h-full w-full overflow-visible"
      data-selected={selected ? "true" : "false"}
      data-kind={kind}
    >
      <NodeToolbar
        nodeId={props.id}
        visible={!!selected}
        onDelete={() => void actions?.deleteNode(props.id)}
        // 「以此生成」和「复制」之前**根本没传进去，两个按钮等于不存在**。
        onGenerate={() => actions?.useAsInput(props.id)}
        onDuplicate={assetId ? () => void actions?.duplicateNode(props.id) : undefined}
        // 「放大查看」开灯箱。之前它和「下载」都是 `window.open(assetUrl)` ——
        // **两个不同标签的按钮做同一件事**，而且做的都不是标签说的那件。
        onOpen={assetId ? () => actions?.openLightbox(props.id) : undefined}
        onDownload={assetId ? () => downloadAsset(assetId, name) : undefined}
      />
      {/* **`onAdd` 和 `hidden` 之前没传，两个能力都是死的**：
          点 ⊕ 不会开菜单（官方点它是开「添加节点」），多选和拖动时 ⊕
          也不会隐藏（官方的 `forceHidden = isMultiSelect || isDragging`）。 */}
      <MagneticHandle
        position={Position.Left}
        selected={!!selected}
        hidden={!!dragging}
        onAdd={(x, y) => actions?.openAddNode(props.id, x, y)}
      />
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

        {/* 画布标签。官方 `canvasTags.canvasLabelInfo` 写着「画布标签会直接
            显示在画布上」—— **不显示的话打了标等于没打**。

            画在节点内容之上、左上角，不占布局（absolute）：占布局的话
            打个标签图就矮一截，同一排节点会错位。 */}
        {tags.length > 0 && (
          <span
            data-action-ui-id="canvas.node-tag-labels"
            className="pointer-events-none absolute top-1.5 left-1.5 flex gap-1"
          >
            {tags.map((id) => {
              // **只画预设那七个。** 关键词（`kind: "keyword"`）不显示在
              // 画布上 —— 官方的 `canvasTags.keywordInfo` 就是这么说的，
              // 而用户正是照这句话去用关键词做批量归类的。
              const t = tagById(id)
              if (!t) return null
              return (
                <span
                  key={id}
                  data-action-ui-id="canvas.node-tag-label"
                  className="rounded px-1.5 py-px text-[10px] leading-4 font-medium"
                  style={{ background: t.color, color: t.foreground }}
                >
                  {t.name}
                </span>
              )
            })}
          </span>
        )}
      </div>

      {/* 名字条在节点**上方外侧、常驻**（截图确认）。带类型图标 + 文件名。
          放在节点里会让每张图都矮一截；放下面则和下一行节点的名字打架。 */}
      <div
        className="pointer-events-none absolute bottom-full left-0 mb-1.5 flex w-full items-center gap-1.5 overflow-hidden text-[13px] whitespace-nowrap"
        title={name}
      >
        <span className="shrink-0" style={{ color: "var(--muted-foreground)" }}>
          {KIND_ICON[kind] ?? <FileText size={14} />}
        </span>
        <span className="truncate" style={{ color: "var(--foreground)" }}>
          {name}
        </span>
      </div>

      <MagneticHandle
        position={Position.Right}
        selected={!!selected}
        hidden={!!dragging}
        onAdd={(x, y) => actions?.openAddNode(props.id, x, y)}
      />
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
  const actions = useContext(CanvasActionsContext)
  return (
    <Frame {...props} kind="image">
      {id ? (
        // 走缩略图：原图动辄 1.8MB，而卡片才 350px 宽。宽度取 512 而不是 2x
        // 卡片宽（700）—— gateway 回的是 PNG，无损压缩对照片几乎不起作用，
        // 实测 700 要 1.38MB，512 只要 357KB，肉眼分不出。
        // 双击开灯箱而不是单击：单击在画布上是"选中"，抢掉它会让框选、
        // 连线这些操作全部失灵。官方也是双击。
        <img
          src={assetUrl(id, 512)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onDoubleClick={(e) => {
            e.stopPropagation()
            actions?.openLightbox(props.id)
          }}
        />
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
      {/* 自绘播放层，不用浏览器原生 controls —— 原生控件在每个平台长得不一样，
          而且高度固定，在 350x197 的节点里占掉六分之一。 */}
      {id ? <VideoPlayer src={assetUrl(id)} /> : <Placeholder text="占位节点" />}
    </Frame>
  )
}

export function AudioNode(props: Props) {
  const id = props.data.raw.assetId
  return (
    <Frame {...props} kind="audio">
      {id ? (
        <AudioPlayer src={assetUrl(id)}>
          <Waveform src={assetUrl(id)} />
        </AudioPlayer>
      ) : (
        <Placeholder text="占位节点" />
      )}
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
  /** 查找条开着没有。官方的 `canvas-text-find-bar`,⌘F / Ctrl+F 打开。 */
  const [finding, setFinding] = useState(false)

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
      <div
        className="relative -m-3 h-[calc(100%+24px)] w-[calc(100%+32px)]"
        onDoubleClick={start}
        onKeyDown={(e) => {
          // ⌘F / Ctrl+F 打开查找。**要 preventDefault** —— 不拦的话
          // 浏览器/WebView 自带的页内查找会弹出来，那个找的是整页 DOM，
          // 改不了节点内容。
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f" && editing) {
            e.preventDefault()
            setFinding(true)
          }
        }}
      >
        {error && (
          <div className="absolute inset-x-0 top-0 z-10 flex items-start gap-1.5 px-2 py-1 text-[10px] leading-4"
            style={{ background: "color-mix(in srgb, var(--canvas-node-tag-red) 22%, var(--canvas-node-bg))", color: "var(--canvas-node-tag-red)" }}>
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        {editing ? (
          <>
            {/* 查找条压在编辑区上方。**只在编辑态给** —— 只读时改不了内容，
                给一个「替换」按钮点了没反应比没有更糟。 */}
            {finding && (
              <div className="absolute top-1 right-1 z-20">
                <FindBar
                  text={draft}
                  onReplace={setDraft}
                  onClose={() => setFinding(false)}
                />
              </div>
            )}
            <TextEditor value={draft} onChange={setDraft} onDone={() => void finish()} />
          </>
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
  sticker: StickerNode,
  unknown: UnknownNode,
}

/**
 * 真的下载，而不是在新标签页打开。
 *
 * `window.open` 对图片是"在浏览器里显示"，对视频是"开始播放" —— 只有
 * 带 `download` 属性的 `<a>` 才会走保存流程。这两件事标签上写的是
 * 「下载」，做的却是「打开」。
 */
function downloadAsset(assetId: string, name: string) {
  const a = document.createElement("a")
  a.href = assetUrl(assetId)
  a.download = name
  // 必须挂进文档才能在部分浏览器里触发点击。
  document.body.appendChild(a)
  a.click()
  a.remove()
}
