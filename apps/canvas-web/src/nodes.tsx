/** 四种节点的渲染。这是官方画布里唯一闭源、必须自己写的那一层。 */

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react"

import { assetUrl } from "./api"
import type { NodeData } from "./canvas"

type Props = NodeProps<Node<NodeData>>

function Frame({ data, kind, children }: Props & { kind: string; children: React.ReactNode }) {
  const name = data.detail?.name ?? (data.raw.data?.name as string | undefined) ?? data.raw.id.slice(0, 8)
  return (
    <div className={`card card-${kind}`}>
      <Handle type="target" position={Position.Left} />
      <div className="card-body">{children}</div>
      <div className="card-foot" title={name}>
        <span className="badge">{kind}</span>
        {name}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

/** 没有 assetId 的媒体节点是占位（生成中 / 生成失败）。 */
function Placeholder({ text }: { text: string }) {
  return <div className="placeholder">{text}</div>
}

export function ImageNode(props: Props) {
  const id = props.data.raw.assetId
  return (
    <Frame {...props} kind="image">
      {id ? (
        // 走缩略图：原图在这个项目里是 1664x928 / 1.8MB，全量拉三张只为了
        // 显示 350px 宽的卡片是纯浪费。
        //
        // 宽度取 512 而不是 2x 卡片宽（700）：gateway 回的是 PNG，无损压缩对
        // 照片几乎不起作用 —— 实测 700 要 1.38MB，512 只要 357KB，而卡片才
        // 350px 宽，肉眼分不出。节点一多这个差别就是几十 MB。
        <img src={assetUrl(id, 512)} alt="" loading="lazy" />
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
      {id ? <video src={assetUrl(id)} controls preload="metadata" /> : <Placeholder text="占位节点" />}
    </Frame>
  )
}

export function AudioNode(props: Props) {
  const id = props.data.raw.assetId
  return (
    <Frame {...props} kind="audio">
      {id ? <audio src={assetUrl(id)} controls preload="metadata" /> : <Placeholder text="占位节点" />}
    </Frame>
  )
}

export function TextNode(props: Props) {
  const text = props.data.detail?.textContent
  return (
    <Frame {...props} kind="text">
      {text === undefined ? (
        <Placeholder text="读取中…" />
      ) : (
        <pre className="text-content">{text}</pre>
      )}
    </Frame>
  )
}

/**
 * 认不出的类型。
 *
 * 官方那边至少还有 group / table / file / plugin 几种，将来升级也会加新的。
 * 显式画成"未支持"而不是让它退回默认节点 —— 后者看起来像渲染正常，
 * 实际上内容一个字都没显示。
 */
export function UnknownNode(props: Props) {
  const raw = props.data.raw
  return (
    <Frame {...props} kind={raw.type || "?"}>
      <div className="placeholder unknown">
        未支持的节点类型
        <code>{raw.type || "(空)"}</code>
      </div>
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
