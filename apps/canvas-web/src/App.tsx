import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge as FlowEdge,
  type Node as FlowNode,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import {
  CANVAS_MODES,
  connectEvents,
  getCanvas,
  getNodeDetails,
  getWorkspace,
  putCanvas,
  type CanvasFile,
  type CanvasMode,
  type NodeDetail,
} from "./api"
import { toCanvasFile, toFlow, type NodeData } from "./canvas"
import { nodeTypes } from "./nodes"

interface EventLine {
  at: string
  event: string
}

export default function App() {
  const [file, setFile] = useState<CanvasFile | null>(null)
  const [details, setDetails] = useState<Map<string, NodeDetail>>(new Map())
  const [mode, setMode] = useState<CanvasMode>("workflow")
  const [dir, setDir] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "failed">("idle")
  const [events, setEvents] = useState<EventLine[]>([])

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode<NodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([])

  // 保存时要以「服务端那份原文」为底改，而不是以界面状态重建。
  const fileRef = useRef<CanvasFile | null>(null)
  fileRef.current = file

  const load = useCallback(async () => {
    try {
      const [ws, canvas] = await Promise.all([getWorkspace(), getCanvas()])
      setDir(ws.dir)
      setFile(canvas)
      setError(null)
      // 名字和文本内容不在 canvas.json 里，要单独取一次。
      const list = await getNodeDetails(canvas.nodes.map((n) => n.id))
      setDetails(new Map(list.map((d) => [d.id, d])))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // 首次进来跟随文件自己声明的 mode，而不是硬认 workflow。
  const appliedFileMode = useRef(false)
  useEffect(() => {
    if (!file || appliedFileMode.current) return
    appliedFileMode.current = true
    if ((CANVAS_MODES as string[]).includes(file.mode)) setMode(file.mode as CanvasMode)
  }, [file])

  useEffect(() => {
    if (!file) return
    const flow = toFlow(file, mode, details)
    setNodes(flow.nodes)
    setEdges(flow.edges)
  }, [file, details, mode, setNodes, setEdges])

  useEffect(
    () =>
      connectEvents((event) => {
        setEvents((prev) => [{ at: new Date().toLocaleTimeString(), event }, ...prev].slice(0, 12))
      }),
    [],
  )

  const onNodeDragStop = useCallback(async () => {
    const base = fileRef.current
    if (!base) return
    setSaving("saving")
    try {
      // 从 setNodes 的回调里取当前节点，避免闭包拿到旧的一版。
      const current = await new Promise<FlowNode<NodeData>[]>((resolve) => {
        setNodes((ns) => {
          resolve(ns)
          return ns
        })
      })
      const next = toCanvasFile(base, current, mode)
      await putCanvas(next)
      setFile(next)
      setSaving("saved")
      setTimeout(() => setSaving((s) => (s === "saved" ? "idle" : s)), 1500)
    } catch (err) {
      setSaving("failed")
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [mode, setNodes])

  const counts = useMemo(() => {
    const byType = new Map<string, number>()
    for (const n of file?.nodes ?? []) byType.set(n.type, (byType.get(n.type) ?? 0) + 1)
    return [...byType.entries()].map(([t, c]) => `${t}×${c}`).join("  ")
  }, [file])

  return (
    <div className="app">
      <header>
        <strong>canvas-web</strong>
        <span className="dim">{dir || "连接中…"}</span>
        <span className="spacer" />
        <div className="modes">
          {CANVAS_MODES.map((m) => (
            <button key={m} className={m === mode ? "on" : ""} onClick={() => setMode(m)}>
              {m}
            </button>
          ))}
        </div>
        <button onClick={() => void load()}>重新加载</button>
        <span className={`save save-${saving}`}>
          {{ idle: "", saving: "保存中…", saved: "已保存", failed: "保存失败" }[saving]}
        </span>
      </header>

      {error && (
        <div className="error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="flow">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={() => void onNodeDragStop()}
          fitView
          minZoom={0.05}
          proOptions={{ hideAttribution: false }}
        >
          <Background gap={24} />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>

      <footer>
        <span>
          {file ? `${file.nodes.length} 节点 / ${file.edges.length} 边` : "—"}
          {counts && <span className="dim">　{counts}</span>}
        </span>
        <span className="spacer" />
        <span className="dim">
          /ws：
          {events.length === 0 ? "（尚无事件）" : events.map((e) => `${e.at} ${e.event}`).join("　")}
        </span>
      </footer>
    </div>
  )
}
