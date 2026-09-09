import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
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
  writeTextNode,
  type CanvasFile,
  type CanvasMode,
  type NodeDetail,
} from "./api"
import { toCanvasFile, toFlow, type NodeData } from "./canvas"
import { BottomToolbar, TopRightChrome } from "./CanvasChrome"
import { ChatPanel } from "./ChatPanel"
import { Sidebar } from "./Sidebar"
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
  const [minimap, setMinimap] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)

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


  return (
    <CanvasActionsContext value={actions}>
      {/* 三栏。按官方 3.0.12 的界面：左边项目/会话，中间画布铺满，
          右边对话面板。画布上的控件是浮层，不占布局 —— 这也是为什么
          官方的画布能一直铺满，控件不挤压可视区域。 */}
      <div className="flex h-full" style={{ background: "var(--background)" }}>
        <Sidebar file={file} details={details} dir={dir} right={<Update />} />

        <main className="relative min-w-0 flex-1" data-hilo-canvas-root="true">
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeDragStop={() => void onNodeDragStop()}
              // 把当前缩放写成 CSS 变量。节点选中的描边宽度是
              // `max(1.5px, calc(1.5px / var(--canvas-zoom)))` —— 反向抵消缩放，
              // 缩小画布时描边仍是屏幕上的 1.5 物理像素。官方就是这么做的，
              // 不喂这个变量描边会跟着缩到看不见。
              onMove={(_, vp) => {
                document.documentElement.style.setProperty("--canvas-zoom", String(vp.zoom))
              }}
              fitView
              minZoom={0.05}
              // 只渲染视口内的节点。画布上一个 image 节点就是一张几百 KB 的图，
              // 几百个节点全渲染会让首屏卡住。
              onlyRenderVisibleElements
              // 空白处拖拽 = 框选，不是平移；平移交给空格/中键/滚轮。
              selectionOnDrag
              panOnDrag={[1, 2]}
              panOnScroll
              selectNodesOnDrag={false}
              proOptions={{ hideAttribution: true }}
            >
              {/* 点阵，颜色走官方的 --canvas-bg-dot。 */}
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="var(--canvas-bg-dot)"
              />
              {minimap && (
                // 小地图在**右上**，官方就摆在缩放条底下。React Flow 默认
                // 在右下，要显式指定 position。
                <MiniMap
                  position="top-right"
                  pannable
                  zoomable
                  style={{ marginTop: 60, marginRight: 12 }}
                  maskColor="var(--canvas-minimap-mask)"
                  nodeColor="var(--canvas-minimap-node)"
                />
              )}
              <TopRightChrome
                mode={mode}
                onMode={setMode}
                minimap={minimap}
                onMinimap={setMinimap}
              />
              <BottomToolbar onCreate={() => setComposerOpen(true)} />
            </ReactFlow>
          </ReactFlowProvider>

          {error && (
            <div
              className="absolute inset-x-3 bottom-20 z-20 flex items-start gap-2 rounded-lg px-3 py-2 font-mono text-xs"
              style={{
                background: "color-mix(in srgb, var(--canvas-node-tag-red) 14%, var(--canvas-controls-bg))",
                color: "var(--canvas-node-tag-red)",
                boxShadow: "var(--canvas-shadow-panel)",
              }}
            >
              {error}
              <button onClick={() => setError(null)} className="ml-auto">
                ×
              </button>
            </div>
          )}
        </main>

        <ChatPanel
          file={file}
          events={events}
          saving={saving}
          composerOpen={composerOpen}
          onDone={() => void load()}
          onReload={() => void load()}
        />
      </div>
    </CanvasActionsContext>
  )
}
