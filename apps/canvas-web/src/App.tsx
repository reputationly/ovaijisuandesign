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

import { Copy, Maximize2, PanelLeft, PanelRight, RefreshCw, Trash2, Wand2 } from "lucide-react"

import {
  CANVAS_MODES,
  assetUrl,
  answerQuestion,
  connectEvents,
  agentMessages,
  agentStop,
  createProject,
  createSession,
  deleteProject,
  deleteSession,
  getActivity,
  getCanvas,
  listSessions,
  moveSession,
  openSession,
  renameSession,
  pendingQuestion,
  getNodeDetails,
  getWorkspace,
  putCanvas,
  writeTextNode,
  type CanvasFile,
  type CanvasMode,
  type NodeDetail,
  type AgentMsg,
  type Project,
  type Session,
  type ToolActivity,
} from "./api"
import { sizeOf, toCanvasFile, toFlow, type NodeData } from "./canvas"
import { BottomToolbar, CANVAS_BACKGROUNDS, TopRightChrome } from "./CanvasChrome"
import { ContextMenu, type MenuItem } from "./ContextMenu"
import { handoffKey, submitHandoff, type Handoff } from "./handoff"
import { Home } from "./Home"
import { Library } from "./Library"
import { ImBridge } from "./ImBridge"
import { Settings } from "./Settings"
import { Skills } from "./Skills"

/** 主区域显示什么。侧栏那四个入口切的就是它。 */
export type View = "home" | "canvas" | "library" | "skill"
import type { QuestionRequest } from "./Question"
import { ChatPanel } from "./ChatPanel"
import { Sidebar } from "./Sidebar"
import { Update } from "./Update"
import { Lightbox, type LightboxItem } from "./Lightbox"
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
  // agent 的工具活动流。右栏按官方的标签表渲染，见 toolLabels.ts。
  const [activity, setActivity] = useState<ToolActivity[]>([])
  // agent 的对话。**服务端是唯一真相** —— 历史存在 .hilo/chat.json 里，
  // 前端只负责显示；这样刷新、切画布、甚至从终端跑 ovagent 都能对上。
  const [messages, setMessages] = useState<AgentMsg[]>([])
  const [agentRunning, setAgentRunning] = useState(false)
  /**
   * 灯箱当前看的是哪个节点。`null` = 没打开。
   *
   * 存**节点 id 而不是下标**：翻页期间 agent 可能往画布上加了图，
   * 下标会指到另一张上去 —— 用户看到的是"图自己跳了一下"。
   */
  const [lightbox, setLightbox] = useState<string | null>(null)
  // 会话（= 画布）与项目。侧栏那一栏列的是这些。
  const [sessions, setSessions] = useState<Session[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [currentSession, setCurrentSession] = useState("")
  /**
   * 首页「选择项目」选中的那个。
   *
   * **只在新建会话时用一次**，不是一个全局的"当前项目"——把它做成全局状态
   * 的话，用户从侧栏点开一条属于别的项目的会话，这里还显示着旧的那个，
   * 而两者根本不是一回事。
   */
  const [homeProject, setHomeProject] = useState<string | null>(null)
  // 设置和 IM 是**弹窗不是视图**：它们是一次性的插曲，做成占满主区域的
  // 页面的话，用户改完还得自己想办法"回去"。
  const [dialog, setDialog] = useState<"settings" | "im" | null>(null)
  const [minimap, setMinimap] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null)
  // 画布底色。存 localStorage —— 这是纯粹的个人偏好，不该进 canvas.json
  // （那份文件是和 agent 共享的数据，写进外观设置会让每次改底色都变成
  // 一次画布内容变更，agent 那边会看到一串无意义的 canvas:changed）。
  const [view, setView] = useState<View>("home")
  // 指针模式。select = 空白处拖拽框选；hand = 拖拽平移。官方的分体按钮
  // 切的就是这个 —— 画布类工具里这是最基本的一对模式。
  const [tool, setTool] = useState<"select" | "hand">("select")
  const [sticker, setSticker] = useState(false)
  const [help, setHelp] = useState(false)
  // agent 抛出来的决策点。同一时刻只可能有一个 —— question 工具是阻塞的，
  // agent 在等回答，不会同时问第二次。
  const [question, setQuestion] = useState<QuestionRequest | null>(null)
  /**
   * 首页填好、要带到画布输入框里的内容。
   *
   * **必须是 state 不能是事件。** 之前用 dispatchEvent：切视图和发事件在
   * 同一个 tick，右栏还没渲染出来、监听器没挂上，事件被丢掉 ——
   * 表现就是"点了没反应"。
   */
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>()
  /** 首页带过来的参考素材（工作区相对路径）。作为底图发给图生图。 */
  const [pendingAttachments, setPendingAttachments] = useState<string[]>([])
  // 两侧栏的折叠。存 localStorage —— 这是纯偏好，不进 canvas.json。
  const [leftOpen, setLeftOpen] = useState(() => localStorage.getItem("left-open") !== "0")
  const [rightOpen, setRightOpen] = useState(() => localStorage.getItem("right-open") !== "0")
  useEffect(() => localStorage.setItem("left-open", leftOpen ? "1" : "0"), [leftOpen])
  useEffect(() => localStorage.setItem("right-open", rightOpen ? "1" : "0"), [rightOpen])
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

  // 轮询待答的决策点。**只在画布视图里轮询** —— agent 是画布上的东西，
  // 首页没有它。两秒一次，这是个纯内存读的接口。
  //
  // 用轮询而不是等 /ws 推送：ws 断线重连的那几秒里推送会丢，而丢一道题
  // 意味着 agent 永远卡在那儿等一个不会来的回答。轮询没有这个问题。
  useEffect(() => {
    if (view !== "canvas") return
    let alive = true
    const tick = () =>
      void pendingQuestion()
        .then((r) => alive && setQuestion(r.pending))
        .catch(() => {})
    tick()
    const t = setInterval(tick, 2000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [view])

  useEffect(
    () =>
      connectEvents((event, data) => {
        setEvents((prev) => [{ at: new Date().toLocaleTimeString(), event }, ...prev].slice(0, 12))
        if (event === "tool:activity" && data) {
          setActivity((prev) => [...prev, data as ToolActivity].slice(-200))
        }
        // agent 每追加一条消息就重拉一次。**不在前端自己拼** ——
        // 服务端那份才是模型真正看到的历史，两边各拼一份必然会分叉。
        if (event === "agent:message") void reloadChat()
        // **agent 改了画布必须重载。** 不重载有两个后果：界面上看不到
        // agent 刚做的东西；更糟的是 fileRef 里还是旧副本，用户随手拖一下
        // 节点就会以那份为底整份写回，把 agent 加的节点悄悄抹掉。
        if (event === "canvas:changed") void load()
        if (event === "agent:done") {
          setAgentRunning(false)
          void reloadChat()
          void load()
        }
      }),
    [],
  )

  // 先拉一次历史再接实时流。只接实时流的话刷新后右栏是空的。
  useEffect(() => {
    getActivity().then(setActivity).catch(() => {})
  }, [])

  const reloadChat = useCallback(async () => {
    try {
      const r = await agentMessages()
      setMessages(r.messages)
      setAgentRunning(r.running)
    } catch {
      /* 拉不动对话不该让画布也打不开 */
    }
  }, [])
  useEffect(() => {
    void reloadChat()
  }, [reloadChat])

  const reloadSessions = useCallback(async () => {
    try {
      const r = await listSessions()
      setSessions(r.list)
      setProjects(r.projects)
      setCurrentSession(r.current)
    } catch {
      /* 侧栏拉不动不该让画布也打不开 */
    }
  }, [])
  useEffect(() => {
    void reloadSessions()
  }, [reloadSessions])

  /**
   * 切换会话。**切完必须重新加载画布** —— gateway 那边是「换内容不换路径」，
   * 文件已经变了但界面还拿着上一张的节点，不重载的话下一次拖动保存会把
   * 上一张的内容写进这一张。
   */
  const openSessionAndReload = useCallback(
    async (id: string) => {
      if (id === currentSession) {
        setView("canvas")
        return
      }
      try {
        await openSession(id)
        setCurrentSession(id)
        setView("canvas")
        await load()
        await reloadSessions()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    [currentSession, load, reloadSessions],
  )

  /**
   * 新建一条创作并切过去。
   *
   * `name` 给了就用它命名 —— 从首页发起时传的是那句提示词，侧边栏里
   * 那一条就叫这句话。官方的 `createWorkspaceWithResult({ name: text })`
   * 也是这么做的。
   */
  const newSession = useCallback(
    async (name?: string) => {
      try {
        const r = await createSession(name)
        setCurrentSession(r.id)
        setView("canvas")
        await load()
        await reloadSessions()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        return false
      }
    },
    [load, reloadSessions],
  )

  /**
   * 上一次「建好了画布、但后面的步骤没走完」留下的交接。
   *
   * **在新建成功之后、切过去之前就记下来** —— 后面任何一步失败，用户重试
   * 同一句提示词时会复用这张，而不是再建一张。不做这件事的话，每次失败
   * 重试都会在侧边栏留一张空画布，而用户完全不知道那些是哪来的。
   *
   * 对应官方的 `pendingWorkspaceHandoffRef`。
   */
  const handoffRef = useRef<Handoff | null>(null)
  /** 正在提交。防连点 —— 官方的 `homeSubmitInFlightRef`。 */
  const submitInFlightRef = useRef(false)
  const [homeSubmitting, setHomeSubmitting] = useState(false)

  /**
   * 首页发送：进一张**新**画布，用提示词命名。
   *
   * 官方是 `createWorkspaceWithResult({ name: text })` —— 一句话一个工作区。
   * 复用当前那张的话，第二次从首页发起的活会落在上一次的成果旁边，
   * 两件不相干的事挤在一张画布上，而"未分组"里始终只有一条。
   */
  const submitFromHome = useCallback(
    async (p: string, attachments: string[]) => {
      // 连点会建出好几张空画布。挡在最前面，比在按钮上做 disabled 可靠 ——
      // 回车那条路绕过按钮状态。
      if (submitInFlightRef.current) return
      submitInFlightRef.current = true
      setHomeSubmitting(true)
      const out = await submitHandoff({
        pending: handoffRef.current,
        key: handoffKey(p, attachments),
        create: async () => (await createSession(p)).id,
        activate: async (id) => {
          // **先把数据取回来，再切视图。** 反过来的话会先闪一下上一张画布，
          // 而且中途失败时用户会停在一张空画布上 —— 重试的入口却在首页。
          //
          // 注意 `load` / `reloadSessions` 自己吞异常（各有各的理由，见它们
          // 的定义），所以今天这里几乎不会抛。交接机制挡的是**新建成功之后
          // 任何一步失败**这条路，眼下主要靠它挡住"以后往 activate 里加了
          // 会抛的东西"。真正每天都在生效的是上面那个连点保护。
          await load()
          await reloadSessions()
          // 参考素材跟着提示词一起带进画布那个输入框 —— 在首页传了图
          // 却在画布上发不出去，那次上传就白做了。
          setPendingPrompt(p)
          setPendingAttachments(attachments)
          setCurrentSession(id)
          setView("canvas")
          setComposerOpen(true)
          setRightOpen(true)
        },
      })
      handoffRef.current = out.ok ? null : out.pending
      if (!out.ok) {
        // 留在首页：输入框里的提示词和附件都还在，再点一次就是重试 ——
        // 而且会复用已经建好的那张，不会在侧边栏留下一串空画布。
        setError(out.error instanceof Error ? out.error.message : String(out.error))
      }
      submitInFlightRef.current = false
      setHomeSubmitting(false)
    },
    [load, reloadSessions],
  )

  const openSessionMenu = useCallback(
    (id: string, at: { x: number; y: number }) => {
      const s = sessions.find((x) => x.id === id)
      if (!s) return
      const items: MenuItem[] = [
        {
          id: "rename",
          label: "重命名",
          onClick: () => {
            const name = window.prompt("新名字", s.name)?.trim()
            if (name) void renameSession(id, name).then(reloadSessions)
          },
        },
        ...projects
          .filter((p) => p.id !== s.project)
          .map((p) => ({
            id: `move-${p.id}`,
            label: `移到「${p.name}」`,
            onClick: () => void moveSession(id, p.id).then(reloadSessions),
          })),
        ...(s.project
          ? [
              {
                id: "unmove",
                label: "移出项目",
                onClick: () => void moveSession(id, null).then(reloadSessions),
              },
            ]
          : []),
        {
          id: "new-project",
          label: "新建项目并移入",
          onClick: () => {
            const name = window.prompt("项目名字")?.trim()
            if (!name) return
            void createProject(name)
              .then((r) => moveSession(id, r.project.id))
              .then(reloadSessions)
          },
        },
        {
          id: "delete",
          label: "删除",
          danger: true,
          onClick: () => {
            // 会话删掉就没了，问一句。节点删除没问是因为那个能撤销
            // （重新加载就回来了），这个不能。
            if (!window.confirm(`删除「${s.name}」？里面的内容会一起消失。`)) return
            void deleteSession(id)
              .then(reloadSessions)
              .then(load)
              .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
          },
        },
      ]
      setMenu({ x: at.x, y: at.y, items })
    },
    [sessions, projects, reloadSessions, load],
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

  /**
   * 整理：把节点重排并**写回服务端**。
   *
   * 只改当前 mode 的坐标（`positions[mode]`），别的模式那份不动 ——
   * 用户在 workflow 里手工摆好的布局，不该因为在 grid 里点了一下整理
   * 就没了。
   *
   * 以 `fileRef` 里那份服务端原文为底改，不是拿界面重建：界面上的节点只带
   * 我们认识的字段，重建会把官方写进去、我们还不认识的字段抹掉。
   */
  const tidy = useCallback(
    async (kind: "grid" | "type") => {
      const base = fileRef.current
      if (!base || base.nodes.length === 0) return
      const GAP = 40
      const COL_W = 350 + GAP

      // 按类型分组时先排序，网格时保持原顺序 —— 原顺序通常是创建顺序，
      // 打乱它会让人找不到刚生成的那个。
      const list = [...base.nodes]
      if (kind === "type") {
        const order = ["image", "video", "audio", "text"]
        list.sort((a, b) => {
          const d = (order.indexOf(a.type) + 99) % 99 - ((order.indexOf(b.type) + 99) % 99)
          return d !== 0 ? d : 0
        })
      }

      const cols = Math.max(1, Math.ceil(Math.sqrt(list.length)))
      // 每一列的当前底边。**按列累加而不是按行固定行高** —— 节点是按素材
      // 比例算的，高度各不相同，固定行高会让矮的下面留一大片空。
      const colBottom = new Array<number>(cols).fill(0)
      const nodes = list.map((n) => {
        const size = sizeOf(n, mode, details.get(n.id))
        // 放进当前最短的那一列，出来的排布最紧凑（瀑布流那套）。
        let c = 0
        for (let i = 1; i < cols; i++) if (colBottom[i]! < colBottom[c]!) c = i
        const pos = { x: c * COL_W, y: colBottom[c]! }
        colBottom[c] = colBottom[c]! + size.height + GAP
        return { ...n, positions: { ...n.positions, [mode]: pos } }
      })

      const next = { ...base, nodes }
      setSaving("saving")
      try {
        await putCanvas(next)
        setFile(next)
        setSaving("saved")
        setTimeout(() => setSaving((s) => (s === "saved" ? "idle" : s)), 1500)
        // 排完把视野对上，否则节点被挪到视口外，看起来像"整理把画布清空了"。
        window.dispatchEvent(new CustomEvent("canvas:fit"))
      } catch (err) {
        setSaving("failed")
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [mode, details],
  )

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
      openLightbox(nodeId) {
        setLightbox(nodeId)
      },
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


  /**
   * 灯箱要显示的那一组图。
   *
   * 只在灯箱开着时才算 —— 关着的时候画布上有几十张图，每次渲染都遍历一遍
   * 纯属白算。
   */
  const lightboxNodeIds = useMemo(
    () =>
      lightbox === null
        ? []
        : (file?.nodes ?? []).filter((n) => n.type === "image" && n.assetId).map((n) => n.id),
    [lightbox, file],
  )
  const lightboxItems = useMemo<LightboxItem[]>(
    () =>
      lightboxNodeIds.map((id) => {
        const node = file?.nodes.find((n) => n.id === id)
        // 灯箱走**原图**不走缩略图 —— 它就是用来看细节的，
        // 放大到 400% 看一张 512px 的缩略图等于什么都没看到。
        return { url: assetUrl(node!.assetId!), name: details.get(id)?.name }
      }),
    [lightboxNodeIds, file, details],
  )
  const lightboxIndex = Math.max(0, lightboxNodeIds.indexOf(lightbox ?? ""))

  return (
    <CanvasActionsContext value={actions}>
      {/* 三栏。按官方 3.0.12 的界面：左边项目/会话，中间画布铺满，
          右边对话面板。画布上的控件是浮层，不占布局 —— 这也是为什么
          官方的画布能一直铺满，控件不挤压可视区域。 */}
      <div className="flex h-full" style={{ background: "var(--background)" }}>
        {leftOpen ? (
          <Sidebar
            dir={dir}
            right={<Update />}
            view={view}
            onView={setView}
            onCollapse={() => setLeftOpen(false)}
            onOpenSettings={() => setDialog("settings")}
            onOpenImBridge={() => setDialog("im")}
            sessions={sessions}
            projects={projects}
            current={currentSession}
            onOpenSession={openSessionAndReload}
            onSessionMenu={openSessionMenu}
          />
        ) : (
          // 收起后留一个把手，否则再也打不开了。
          <button
            onClick={() => setLeftOpen(true)}
            title="展开侧栏"
            className="flex w-8 shrink-0 items-center justify-center border-r"
            style={{ background: "var(--sidebar)", borderColor: "var(--sidebar-border)" }}
          >
            <PanelLeft size={16} style={{ color: "var(--home-sidebar-primary-text)" }} />
          </button>
        )}

        {view === "library" ? (
          <Library
            sessions={sessions}
            projects={projects}
            onOpenSession={openSessionAndReload}
            onCreateProject={(name) => void createProject(name).then(reloadSessions)}
            onDeleteProject={(id) => void deleteProject(id).then(reloadSessions)}
            onNewSession={() => void newSession()}
          />
        ) : view === "skill" ? (
          <Skills
            onUse={(slug, body) => {
              // 用一个 skill = 把它的提示词填进输入框，用户再补自己的话。
              // **不直接发出去** —— 提示词是模板，用户总要加一句
              // "对这张图"或"做 15 秒的"。
              setPendingPrompt(`/${slug}\n\n${body}\n\n---\n`)
              setComposerOpen(true)
              setRightOpen(true)
              setView("canvas")
            }}
          />
        ) : view === "home" ? (
          <Home
            onSubmit={(p, _preset, attachments) => void submitFromHome(p, attachments ?? [])}
            submitting={homeSubmitting}
            projectName={projects.find((p) => p.id === homeProject)?.name ?? null}
            onOpenSkills={() => setView("skill")}
            onPickProject={(at) =>
              setMenu({
                x: at.x,
                y: at.y,
                items: [
                  {
                    id: "none",
                    label: "不归入项目",
                    onClick: () => setHomeProject(null),
                  },
                  ...projects.map((p) => ({
                    id: p.id,
                    label: p.name,
                    onClick: () => setHomeProject(p.id),
                  })),
                  {
                    id: "new",
                    label: "新建项目…",
                    onClick: () => {
                      const name = window.prompt("项目名字")?.trim()
                      if (!name) return
                      void createProject(name).then((r) => {
                        setHomeProject(r.project.id)
                        void reloadSessions()
                      })
                    },
                  },
                ],
              })
            }
          />
        ) : (

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
              // select：空白处拖拽 = 框选，平移交给中键/右键和滚轮。
              // hand：拖拽 = 平移，这时不能同时开 selectionOnDrag，
              // 否则两种行为会在同一个手势上打架（表现是"拖不动画布"）。
              selectionOnDrag={tool === "select"}
              panOnDrag={tool === "hand" ? true : [1, 2]}
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
                bg={bg}
                onBg={setBg}
                onTidy={tidy}
              />
              <BottomToolbar
                onCreate={() => setComposerOpen(true)}
                mode={tool}
                onMode={setTool}
                sticker={sticker}
                onSticker={setSticker}
                onAssets={() => window.open("/api/assets", "_blank")}
                help={help}
                onHelp={setHelp}
              />
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

        )}

        {menu && (
          <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />
        )}

        {/* 首页占满，不出右栏 —— 官方点「开始创作」也是整屏的首页。
            右栏是画布的伴生面板，首页上没有画布，它就没有意义。 */}
        {view === "canvas" && rightOpen ? (
          <ChatPanel
            file={file}
            events={events}
            activity={activity}
            messages={messages}
            agentRunning={agentRunning}
            onStop={() => void agentStop()}
            saving={saving}
            composerOpen={composerOpen}
            onDone={() => void load()}
            onReload={() => void load()}
            onCollapse={() => setRightOpen(false)}
            initialPrompt={pendingPrompt}
            initialAttachments={pendingAttachments}
            question={question}
            onAnswer={(id, answers) => {
              void answerQuestion(id, answers).catch((e: unknown) =>
                setError(e instanceof Error ? e.message : String(e)),
              )
              setQuestion(null)
            }}
          />
        ) : view === "canvas" ? (
          <button
            onClick={() => setRightOpen(true)}
            title="展开面板"
            className="flex w-8 shrink-0 items-center justify-center border-l"
            style={{ background: "var(--background)", borderColor: "var(--border)" }}
          >
            <PanelRight size={16} style={{ color: "var(--topbar-icon-fg)" }} />
          </button>
        ) : null}
      </div>

      {dialog === "settings" && <Settings onClose={() => setDialog(null)} />}
      {dialog === "im" && <ImBridge onClose={() => setDialog(null)} />}

      {/* 图片灯箱。
          **翻页范围是画布上的全部图片**，而官方翻的是一个多图节点里的那几张。
          差别的原因是我们还没有多图节点（一次生成出多张、叠在一张卡片上），
          所以照官方做的话箭头永远不出现、那段代码是死的。等多图节点做出来，
          把这里传的 items 换成那一组即可，组件本身不用动。 */}
      {lightboxItems.length > 0 && (
        <Lightbox
          items={lightboxItems}
          index={lightboxIndex}
          onIndexChange={(i) => setLightbox(lightboxNodeIds[i] ?? null)}
          onClose={() => setLightbox(null)}
        />
      )}
    </CanvasActionsContext>
  )
}
