import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge as FlowEdge,
  type Node as FlowNode,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { RefreshCw } from "lucide-react"

import {
  CANVAS_MODES,
  connectEvents,
  getCanvas,
  getNodeDetails,
  getWorkspace,
  putCanvas,
  writeTextNode,
  type CanvasFile,
  type CanvasMode,
  type NodeDetail,
} from "./api"
import { toCanvasFile, toFlow, type NodeData } from "./canvas"
import { Generate } from "./Generate"
import { cn } from "./lib"
import { Update } from "./Update"
import { CanvasActionsContext, nodeTypes, type CanvasActions } from "./nodes"

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

  const actions = useMemo<CanvasActions>(
    () => ({
      async saveText(nodeId, content, expectedHash) {
        const hash = await writeTextNode(nodeId, content, expectedHash)
        // 就地更新这一个节点的 detail，不整图重载 —— 重载会把别人正在编辑的
        // 另一个节点也刷掉。
        setDetails((prev) => {
          const next = new Map(prev)
          const old = next.get(nodeId)
          if (old) next.set(nodeId, { ...old, textContent: content, textContentHash: hash })
          return next
        })
      },
    }),
    [],
  )

  const counts = useMemo(() => {
    const byType = new Map<string, number>()
    for (const n of file?.nodes ?? []) byType.set(n.type, (byType.get(n.type) ?? 0) + 1)
    return [...byType.entries()].map(([t, c]) => `${t}×${c}`).join("  ")
  }, [file])

  return (
    <CanvasActionsContext value={actions}>
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-2.5 border-b border-line bg-panel px-3 py-2">
          <img src="/logo.png" alt="" width={18} height={18} className="shrink-0" />
          <strong>ovaijisuandesign</strong>
          <span className="text-dim">{dir || "连接中…"}</span>
          <span className="flex-1" />
          <div className="flex gap-1">
            {CANVAS_MODES.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded border px-2.5 py-0.5",
                  m === mode
                    ? "border-accent bg-accent text-[#10121a]"
                    : "border-line bg-raised hover:border-accent",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={() => void load()}
            className="flex items-center gap-1.5 rounded border border-line bg-raised px-2.5 py-0.5 hover:border-accent"
          >
            <RefreshCw size={12} />
            重新加载
          </button>
          <Update />
          <span
            className={cn(
              "min-w-14 text-xs",
              saving === "saved" ? "text-ok" : saving === "failed" ? "text-bad" : "text-dim",
            )}
          >
            {{ idle: "", saving: "保存中…", saved: "已保存", failed: "保存失败" }[saving]}
          </span>
        </header>

        <Generate onDone={() => void load()} />

        {error && (
          <div className="flex items-start gap-2 border-b border-bad bg-[#3a1f22] px-3 py-2 font-mono text-xs text-[#ffd7d7]">
            {error}
            <button onClick={() => setError(null)} className="ml-auto">
              ×
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1" data-hilo-canvas-root="true">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={() => void onNodeDragStop()}
            fitView
            minZoom={0.05}
            // 只渲染视口内的节点。画布上一个 image 节点就是一张几百 KB 的图，
            // 几百个节点全渲染会让首屏卡住。
            onlyRenderVisibleElements
            // 空白处拖拽 = 框选，不是平移；平移交给空格/中键/滚轮。
            // 这是画布类工具的惯例，也和官方一致。
            selectionOnDrag
            panOnDrag={[1, 2]}
            panOnScroll
            selectNodesOnDrag={false}
          >
            {/* 点阵，颜色走官方的 --canvas-bg-dot
                （= color-mix(in srgb, var(--foreground) 12%, transparent)）。
                间距是我们定的：他们的实际值在压缩代码里是变量传的，抠不出来。 */}
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="var(--canvas-bg-dot)"
            />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              maskColor="var(--canvas-minimap-mask)"
              nodeColor="var(--canvas-minimap-node)"
            />
          </ReactFlow>
        </div>

        <footer className="flex items-center gap-2.5 overflow-hidden border-t border-line bg-panel px-3 py-2 text-xs whitespace-nowrap">
          <span>
            {file ? `${file.nodes.length} 节点 / ${file.edges.length} 边` : "—"}
            {counts && <span className="text-dim">　{counts}</span>}
          </span>
          <span className="flex-1" />
          <span className="truncate text-dim">
            /ws：
            {events.length === 0
              ? "（尚无事件）"
              : events.map((e) => `${e.at} ${e.event}`).join("　")}
          </span>
        </footer>
      </div>
    </CanvasActionsContext>
  )
}
