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

import { Copy, Maximize2, RefreshCw, Trash2, Wand2 } from "lucide-react"

import {
  CANVAS_MODES,
  assetUrl,
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
import { BackgroundPicker, BottomToolbar, CANVAS_BACKGROUNDS, TopRightChrome } from "./CanvasChrome"
import { ContextMenu, type MenuItem } from "./ContextMenu"
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
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null)
  // 画布底色。存 localStorage —— 这是纯粹的个人偏好，不该进 canvas.json
  // （那份文件是和 agent 共享的数据，写进外观设置会让每次改底色都变成
  // 一次画布内容变更，agent 那边会看到一串无意义的 canvas:changed）。
  const [bg, setBg] = useState(() => localStorage.getItem("canvas-bg") ?? "default")
  useEffect(() => localStorage.setItem("canvas-bg", bg), [bg])

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

      /**
       * 删除节点。**改的是服务端那份 canvas.json，不是界面状态** ——
       * 只删界面的话刷新就回来了，而用户以为删掉了。
       *
       * 以 `fileRef` 里那份服务端原文为底改，不是拿界面重建：界面上的节点
       * 只带我们认识的字段，重建会把官方写进去、我们还不认识的字段抹掉。
       */
      async deleteNode(nodeId) {
        const base = fileRef.current
        if (!base) return
        const next = { ...base, nodes: base.nodes.filter((n) => n.id !== nodeId) }
        // 连带删掉挂在它上面的边，否则会留下指向不存在节点的悬空边。
        next.edges = base.edges.filter((e) => e.source !== nodeId && e.target !== nodeId)
        await putCanvas(next)
        setFile(next)
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

        <main
          className="relative min-w-0 flex-1"
          data-hilo-canvas-root="true"
          style={{
            background: `var(${CANVAS_BACKGROUNDS.find((b) => b.id === bg)?.varName ?? "--canvas-bg"})`,
          }}
        >
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
              // 官方用的就是 xyflow 的默认 20。真正让"容易连上"的是节点两侧
              // 那个 84x84 的感应区（见 MagneticHandle），不是这个半径。
              connectionRadius={20}
              // 从把柄拉出线、松手在空白处 → 弹出"新建什么"的菜单。
              // 官方叫 openAddNodeMenu，是他们连线交互的一半 —— 没有它，
              // 拖出去松手什么也不会发生，用户会以为连线坏了。
              onConnectEnd={(event, state) => {
                if (state.isValid) return
                const e = event as MouseEvent
                setMenu({
                  x: e.clientX,
                  y: e.clientY,
                  items: [
                    {
                      id: "gen",
                      label: "以此为输入生成",
                      icon: <Wand2 size={15} />,
                      onClick: () => setComposerOpen(true),
                    },
                  ],
                })
              }}
              onPaneContextMenu={(e) => {
                e.preventDefault()
                setMenu({
                  x: e.clientX,
                  y: e.clientY,
                  items: [
                    { id: "new", label: "新建生成", icon: <Wand2 size={15} />, onClick: () => setComposerOpen(true) },
                    {
                      id: "fit",
                      label: "适应画布",
                      icon: <Maximize2 size={15} />,
                      // 通过自定义事件让画布内部的组件去 fitView：那个 API 只在
                      // ReactFlowProvider 里面拿得到，为一个菜单项把整棵树重排
                      // 不值得。
                      onClick: () => window.dispatchEvent(new CustomEvent("canvas:fit")),
                    },
                    { id: "reload", label: "重新加载", icon: <RefreshCw size={15} />, separator: true, onClick: () => void load() },
                  ],
                })
              }}
              onNodeContextMenu={(e, node) => {
                e.preventDefault()
                const assetId = node.data.raw.assetId
                setMenu({
                  x: e.clientX,
                  y: e.clientY,
                  items: [
                    ...(assetId
                      ? [
                          {
                            id: "open",
                            label: "在新标签页打开",
                            icon: <Maximize2 size={15} />,
                            onClick: () => window.open(assetUrl(assetId), "_blank"),
                          },
                        ]
                      : []),
                    {
                      id: "copy-id",
                      label: "复制节点 ID",
                      icon: <Copy size={15} />,
                      onClick: () => void navigator.clipboard.writeText(node.id),
                    },
                    {
                      id: "del",
                      label: "删除",
                      icon: <Trash2 size={15} />,
                      danger: true,
                      separator: true,
                      onClick: () => void actions.deleteNode(node.id),
                    },
                  ],
                })
              }}
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
              <div className="pointer-events-none absolute right-3 bottom-4 z-10 flex justify-end">
                <BackgroundPicker value={bg} onChange={setBg} />
              </div>

              {/* 空状态。画布空着时给一句话和一个入口，而不是一片白 ——
                  一片白会让人以为是没加载出来。 */}
              {file && file.nodes.length === 0 && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <img src="/logo.png" alt="" width={44} height={44} className="opacity-25" />
                  <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
                    画布是空的。右侧描述你要生成的内容，或者右键新建。
                  </p>
                </div>
              )}
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

        {menu && (
          <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />
        )}

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
