import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  addEdge,
  Background,
  BackgroundVariant,
  SelectionMode,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useEdgesState,
  useNodesState,
  type Edge as FlowEdge,
  type Node as FlowNode,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import {
  AudioLines,
  Camera,
  Copy,
  Filter,
  Grid2x2,
  Hash,
  Image as ImageIcon,
  Maximize2,
  MessageSquarePlus,
  PanelLeft,
  PanelRight,
  RefreshCw,
  Trash2,
  Type,
  Video,
  Wand2,
} from "lucide-react"

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
  createMediaNode,
  uploadFiles,
  groupNodes,
  getAssets,
  trashAssets,
  type AssetInfo,
} from "./api"
import { addNodeItemsFor, ADD_NODE_LEAD_IN } from "./addNode"
import { tidy as runTidy, type TidyKind } from "./tidy"
import {
  STICKERS,
  findStickerTarget,
  isSticker,
  makeSticker,
  syncStickerBindings,
  type Placed,
} from "./sticker"
import { captureFrame, frameFileName } from "./captureFrame"
import { GRID_PRESETS, cellFileName, gridCells, loadImage } from "./splitGrid"
import {
  TAG_PRESETS,
  addKeyword,
  nameTooLong,
  readRegistry,
  tagColor,
  tagsOf,
  toggleTag,
  withTags,
} from "./tags"
import { isValidConnection, positionOf, sizeOf, toCanvasFile, toFlow, type NodeData } from "./canvas"
import {
  BottomToolbar,
  CANVAS_BACKGROUNDS,
  EmptyHint,
  ShortcutPanel,
  TidyUndoBar,
  TagFilter,
  TopRightChrome,
} from "./CanvasChrome"
import { ContextMenu, type MenuItem } from "./ContextMenu"
import { handoffKey, submitHandoff, type Handoff } from "./handoff"
import { Home } from "./Home"
import { PromptHost, confirm as uiConfirm, prompt as uiPrompt } from "./Prompt"
import { cn } from "./lib"
import { ProjectAssets } from "./AssetsPanel"
import { Library } from "./Library"
import { ImBridge } from "./ImBridge"
import { Settings } from "./Settings"
import { Skills } from "./Skills"

/** 主区域显示什么。侧栏那四个入口切的就是它。 */
/** 「添加节点」菜单里每种类型的图标。官方用的也是 lucide 这几个。 */
const ADD_NODE_ICON: Record<string, React.ReactNode> = {
  text: <Type size={18} strokeWidth={1.5} />,
  image: <ImageIcon size={18} strokeWidth={1.5} />,
  video: <Video size={18} strokeWidth={1.5} />,
  audio: <AudioLines size={18} strokeWidth={1.5} />,
}

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
  const [help, setHelp] = useState(false)
  /** 选中的贴纸。默认「通过」—— 评审时这个用得最多。 */
  const [stickerId, setStickerId] = useState(STICKERS[0]!.id)
  const [stamping, setStamping] = useState(false)
  const [stickersHidden, setStickersHidden] = useState(false)
  /** 刚盖下去的那个，用来触发落地动画。见 styles.css 的 `sticker-stamp`。 */
  const [freshSticker, setFreshSticker] = useState<string | null>(null)
  /** 项目资产面板。官方底部工具条的 `canvas.toolbar-project-assets`。 */
  const [assetsOpen, setAssetsOpen] = useState(false)
  /**
   * 上一次整理之前的坐标。**存的是坐标不是整份文件** —— 整理期间 agent
   * 可能又加了节点，整份回滚会把那些新节点一起抹掉。
   */
  const [tidyUndo, setTidyUndo] = useState<{
    mode: CanvasMode
    before: Map<string, { x: number; y: number }>
  } | null>(null)
  const [assetList, setAssetList] = useState<AssetInfo[]>([])
  const reloadAssets = useCallback(
    () => getAssets().then(setAssetList).catch(() => {}),
    [],
  )
  // 面板打开时拉一次。**不常驻轮询** —— 列表只在打开着的时候有人看，
  // 而 agent 生成完会推 `canvas:changed`,那条路上一起刷。
  useEffect(() => {
    if (assetsOpen) void reloadAssets()
  }, [assetsOpen, reloadAssets])
  /**
   * 屏幕坐标 → 画布坐标。
   *
   * `screenToFlowPosition` 只在 `ReactFlowProvider` 内部拿得到，而这些
   * 事件处理函数写在 App 里（在 provider 外）。用一个挂在 provider 里的
   * 空组件把函数递出来，见 [`FlowBridge`]。
   */
  const toFlowPos = useRef<((p: { x: number; y: number }) => { x: number; y: number }) | null>(null)
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

  /**
   * 输入框把 `pending*` 消费掉之后要清。
   *
   * **这两个是"交接一次"的量，不是常驻设置。** 不清的话：
   *
   * - 输入框每次重挂（切画布、收起再展开右栏）都会被重新播种，
   *   于是上一次的提示词和参考图又回来了；
   * - 而界面上看不出它们是"上次留下的"，用户会以为这是这一条的内容。
   */
  const consumePending = useCallback(() => {
    setPendingPrompt(undefined)
    setPendingAttachments([])
  }, [])
  /** 当前按哪个标签筛选并定位。`null` = 不筛。见 CanvasChrome 的 TagFilter。 */
  const [tagFilter, setTagFilter] = useState<string | null>(null)
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
  // `actions` 是 useMemo([], []) —— 里面读 state 会永远拿到首帧的值。
  // 和 fileRef 同理，用 ref 取最新的节点详情。
  const detailsRef = useRef(details)
  detailsRef.current = details
  // `actions` 是空依赖的 memo，直接闭包 `addNodeMenuItems` 会永远拿首帧那个。
  const addNodeMenuRef = useRef<(from?: string) => MenuItem[]>(() => [])

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

  /**
   * 正在拖节点。**拖动期间不要用服务端那份重建 flow。**
   *
   * agent 一完成生成就会推 `canvas:changed`,我们无条件 `load()` →
   * `setFile` → 下面这个 effect 整份重建 —— 手里正拖着的那个节点会
   * 弹回原位，而用户什么都没做错。
   *
   * 用 ref 不用 state：这只是"要不要跳过这次重建"的旗标，进 state 会
   * 让每次拖动开始/结束都多一次渲染。
   */
  const draggingRef = useRef(false)

  /**
   * V / H 切换指针模式。官方那个菜单里就标着这两个字母。
   *
   * **在输入框里不能触发** —— 用户打字打到 v 就切成移动工具，而且没有
   * 任何提示。判 `isContentEditable` 是因为文本节点用的是 tiptap，
   * 它不是 `<input>` 也不是 `<textarea>`。
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (view !== "canvas" || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))
      ) {
        return
      }
      const k = e.key.toLowerCase()
      if (k === "v") setTool("select")
      else if (k === "h") setTool("hand")
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [view])

  /**
   * 按住空格平移时把光标换成小手。官方的 `.canvas-space-pan`。
   *
   * `panActivationKeyCode="Space"` 让 xyflow 接管了平移，但**它不加任何类名**,
   * 光标不会变 —— 空画布提示上写着「按住 Space 可以拖拽画布」，按下去却
   * 没有任何反馈，用户会以为没生效。
   *
   * 失焦时必须清掉：切到别的窗口再回来，keyup 是收不到的，
   * 不清的话画布会一直卡在小手光标上。
   */
  const [spacePan, setSpacePan] = useState(false)
  useEffect(() => {
    if (view !== "canvas") return
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space") return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA"].includes(t.tagName))) return
      setSpacePan(true)
    }
    const up = (e: KeyboardEvent) => e.code === "Space" && setSpacePan(false)
    const blur = () => setSpacePan(false)
    document.addEventListener("keydown", down)
    document.addEventListener("keyup", up)
    window.addEventListener("blur", blur)
    return () => {
      document.removeEventListener("keydown", down)
      document.removeEventListener("keyup", up)
      window.removeEventListener("blur", blur)
    }
  }, [view])

  useEffect(() => {
    if (!file) return
    // 拖动中收到的新文件先不落到界面上。拖完 `persistCanvas` 会以
    // `fileRef`（已经是新的那份）为底写回，agent 加的节点不会丢。
    if (draggingRef.current) return
    const flow = toFlow(file, mode, details)
    setNodes(
      flow.nodes
        // 「隐藏全部」只是**藏起来**,不是删掉 —— 数据还在，再点一下就回来。
        .filter((n) => !(stickersHidden && n.type === "sticker"))
        .map((n) =>
          n.id === freshSticker ? { ...n, data: { ...n.data, fresh: true } } : n,
        ),
    )
    setEdges(flow.edges)
  }, [file, details, mode, setNodes, setEdges, stickersHidden, freshSticker])

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
        // 见 submitFromHome 里的同一句：换画布要重拉对话记录。
        await reloadChat()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    [currentSession, load, reloadSessions, reloadChat],
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
        // 见 submitFromHome：换画布要重拉对话记录。
        await reloadChat()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        return false
      }
    },
    [load, reloadSessions, reloadChat],
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
          // **对话记录也要重拉。** 换画布时 chat.json 跟着换了一份
          // （gateway 的 `restore_chat`），不拉的话界面上还挂着上一张
          // 画布的对话 —— 用户以为新建的画布里已经聊过，而 agent 那边
          // 看到的是空的。
          await reloadChat()
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
    [load, reloadSessions, reloadChat],
  )

  /**
   * 「添加节点」菜单。拉线松手、双击画布、底部 `+` 三处共用。
   *
   * `from` 是源节点 id（从 ⊕ 拉出来时才有）。它决定两件事：
   * **能建哪几种**（见 [`addNodeItemsFor`] 的类型过滤表），以及
   * **建出来时带不带上游的素材**。
   *
   * 之前这里只有一条「以此为输入生成」，而且那条还没把源节点传出去。
   */
  const addNodeMenuItems = useCallback(
    (from?: string): MenuItem[] => {
      const path = from ? details.get(from)?.path : undefined
      return addNodeItemsFor(from ? file?.nodes.find((n) => n.id === from)?.type : undefined).map(
        (it) => ({
          id: `add-${it.kind}`,
          label: it.label,
          hint: it.desc,
          icon: ADD_NODE_ICON[it.kind],
          onClick: () => {
            // 上游的素材跟着带进输入框 —— 菜单是从那个节点拉出来的，
            // 用户的意思就是"以它为输入"。
            setPendingAttachments(path ? [path] : [])
            setPendingPrompt(ADD_NODE_LEAD_IN[it.kind])
            setComposerOpen(true)
            setRightOpen(true)
          },
        }),
      )
    },
    [details, file],
  )

  /**
   * 视频节点截帧 →  存成图片 → 作为新节点放上画布，并连一条边。
   *
   * **从画布上那个 `<video>` 元素截**，不是新建一个离屏的 —— 用户看到的
   * 是哪一帧，截出来就该是哪一帧。新建一个从头加载的话，截到的永远是第 0 秒。
   */
  const captureFrameOf = useCallback(
    async (nodeId: string, assetId: string) => {
      const el = document.querySelector<HTMLVideoElement>(
        `[data-id="${CSS.escape(nodeId)}"] video`,
      )
      if (!el) {
        setError("找不到这个视频节点的播放器")
        return
      }
      try {
        const { blob } = await captureFrame(el)
        const name = frameFileName(details.get(nodeId)?.name, el.currentTime)
        const [path] = await uploadFiles([new File([blob], name, { type: "image/png" })])
        if (!path) throw new Error("截帧没有落盘")
        // 走 media-node：和生成结果、IM 附件同一条路，会登记进资产索引。
        await createMediaNode(path, [nodeId])
        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
      void assetId
    },
    [details, load],
  )

  /**
   * 宫格切分。官方的 `canvas.splitGrid.label` =「宫格切分」。
   *
   * 出图模型常常一次给一张 2x2 拼图，用户要的是里面某一格。切开成独立
   * 节点、编成一组（官方 `cropSplitGroupLabel` =「宫格编组」），并各自
   * 连回原图。
   *
   * 官方还有「生成高清」（2x/4x 超分），那要图片超分 —— 平台上没有，
   * **不做也不放按钮**。
   */
  const splitGridOf = useCallback(
    async (nodeId: string, assetId: string, rows: number, cols: number) => {
      try {
        const img = await loadImage(assetUrl(assetId))
        const cells = gridCells(img.naturalWidth, img.naturalHeight, rows, cols)
        if (cells.length === 0) throw new Error("读不到这张图的尺寸")

        const name = details.get(nodeId)?.name
        const files: File[] = []
        for (const c of cells) {
          const cv = document.createElement("canvas")
          cv.width = c.width
          cv.height = c.height
          const ctx = cv.getContext("2d")
          if (!ctx) throw new Error("拿不到 2D 上下文")
          ctx.drawImage(img, c.x, c.y, c.width, c.height, 0, 0, c.width, c.height)
          const blob = await new Promise<Blob | null>((r) => cv.toBlob(r, "image/png"))
          if (!blob) throw new Error("这张图不允许切分（可能来自外部地址）")
          files.push(new File([blob], cellFileName(name, c), { type: "image/png" }))
        }

        const paths = await uploadFiles(files)
        const ids: string[] = []
        for (const p of paths) {
          const id = await createMediaNode(p, [nodeId])
          if (id) ids.push(id)
        }
        // 后端要求至少两个才能编组。切出来只有一个说明参数不对，
        // 但节点已经建好了 —— 不编组也比报错好。
        if (ids.length >= 2) await groupNodes(ids, "宫格编组")
        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    [details, load],
  )

  const openSessionMenu = useCallback(
    (id: string, at: { x: number; y: number }) => {
      const s = sessions.find((x) => x.id === id)
      if (!s) return
      const items: MenuItem[] = [
        {
          id: "rename",
          label: "重命名",
          onClick: () =>
            void uiPrompt("新名字", { initial: s.name }).then((v) => {
              const name = v?.trim()
              if (name) void renameSession(id, name).then(reloadSessions)
            }),
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
          onClick: () =>
            void uiPrompt("项目名字", { placeholder: "例如：柯基短片" }).then((v) => {
              const name = v?.trim()
              if (!name) return
              void createProject(name)
                .then((r) => moveSession(id, r.project.id))
                .then(reloadSessions)
            }),
        },
        {
          id: "delete",
          label: "删除",
          danger: true,
          onClick: () =>
            // 会话删掉就没了，问一句。节点删除没问是因为那个能撤销
            // （重新加载就回来了），这个不能。
            void uiConfirm(`删除「${s.name}」？里面的内容会一起消失。`, {
              confirmLabel: "删除",
              danger: true,
            }).then((ok) => {
              if (!ok) return
              void deleteSession(id)
                .then(reloadSessions)
                .then(load)
                .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
            }),
        },
      ]
      setMenu({ x: at.x, y: at.y, items })
    },
    [sessions, projects, reloadSessions, load],
  )

  /**
 * 把画布写回服务端。
 *
 * 拖完节点、连完线都走这里 —— 名字曾经叫 `onNodeDragStop`,加了连线之后
 * 就名不副实了。
 */
  const persistCanvas = useCallback(async () => {
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
      // **把界面上的连线一起带上。** 用户新拉的边只存在于界面状态里，
      // 不传的话保存会沿用服务端那份，边一松手就没了（而且不报错）。
      const currentEdges = await new Promise<typeof edges>((resolve) => {
        setEdges((es) => {
          resolve(es)
          return es
        })
      })
      const next = toCanvasFile(base, current, mode, currentEdges)
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
   *
   * 排完**留一条退路**（`tidyUndo`）。整理会一次性毁掉用户手工摆的位置,
   * 而我们是直接写回服务端的 —— 没有撤回的话那份布局就真没了。
   * 官方也有：`canvas.tidy.confirmKeep` =「保留整理结果？」+ 保留 / 撤回。
   */
  const tidy = useCallback(
    async (kind: TidyKind) => {
      const base = fileRef.current
      if (!base || base.nodes.length === 0) return

      const layout = runTidy(
        base.nodes.map((n) => {
          const size = sizeOf(n, mode, details.get(n.id))
          return { id: n.id, type: n.type, width: size.width, height: size.height }
        }),
        base.edges,
        kind,
      )

      // 旧坐标要在写回**之前**存下来。写完再取就是新的了。
      const before = new Map(
        base.nodes.map((n) => [n.id, positionOf(n, mode, base.mode)] as const),
      )

      const nodes = base.nodes.map((n) => {
        const p = layout.get(n.id)
        return p ? { ...n, positions: { ...n.positions, [mode]: p } } : n
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
        setTidyUndo({ mode, before })
      } catch (err) {
        setSaving("failed")
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [mode, details],
  )

  /** 撤回上一次整理。官方 `canvas.tidy.revert`。 */
  const revertTidy = useCallback(async () => {
    const undo = tidyUndo
    const base = fileRef.current
    if (!undo || !base) return
    setTidyUndo(null)
    const nodes = base.nodes.map((n) => {
      const p = undo.before.get(n.id)
      // 整理之后新加的节点不在 `before` 里 —— **保持原样**,
      // 别把它们挪到 (0,0)。
      return p ? { ...n, positions: { ...n.positions, [undo.mode]: p } } : n
    })
    const next = { ...base, nodes }
    try {
      await putCanvas(next)
      setFile(next)
      window.dispatchEvent(new CustomEvent("canvas:fit"))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [tidyUndo])


  /**
   * 画布上每个节点的位置和尺寸，给贴纸的命中测试和跟随同步用。
   *
   * **以服务端那份 `file` 为底算，不是拿界面上的 React Flow 节点。**
   * 界面那份在拖拽过程中是中间态，而且 `onlyRenderVisibleElements` 开着 ——
   * 视口外的节点根本不在里面，拿它做命中测试会漏掉一半画布。
   */
  const placed = useCallback((): (Placed & { parentId?: string; data?: Record<string, unknown> })[] => {
    const base = fileRef.current
    if (!base) return []
    return base.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: positionOf(n, mode, base.mode),
      size: sizeOf(n, mode, details.get(n.id)),
      hidden: n.meta?.hidden === true,
      ...(n.parentId ? { parentId: n.parentId } : {}),
      ...(n.data ? { data: n.data } : {}),
    }))
  }, [mode, details])

  /**
   * 盖一个章。
   *
   * 落点命中某个节点时贴纸会**跟随**它（存 `targetId` + 归一化 anchor），
   * 落在空白处就是自由贴纸。这个判断对用户是隐形的 —— 盖的时候一模一样，
   * 差别要等目标被拖动时才显现，所以面板上写了那句
   * 「跟随目标会随选中的产物移动和缩放」。
   */
  const placeSticker = useCallback(
    async (clientX: number, clientY: number) => {
      const base = fileRef.current
      const convert = toFlowPos.current
      if (!base || !convert) return
      const at = convert({ x: clientX, y: clientY })
      const preset = STICKERS.find((p) => p.id === stickerId)
      const target = findStickerTarget(placed(), at)
      const node = makeSticker({ at, preset, target, mode })

      const next = { ...base, nodes: [...base.nodes, node] }
      // **先更新界面再写服务端。** 连续盖章时每次都等一个来回的话，
      // 章会一个个慢半拍地冒出来，手感像卡住了。
      setFile(next)
      // 落地动画靠这个属性触发，480ms 后摘掉 —— 不摘的话下次这个节点
      // 因为别的原因重渲染时会再抖一次。
      setFreshSticker(node.id)
      window.setTimeout(() => setFreshSticker((cur) => (cur === node.id ? null : cur)), 520)
      try {
        await putCanvas(next)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [mode, placed, stickerId],
  )

  /**
   * 目标节点动过之后，把贴在它身上的章挪到新位置。
   *
   * 只在拖拽**结束**时做一次，不是拖的过程中每帧做 —— 每帧重算会整份重建
   * 画布图，手里拖着的那个节点会被抽掉重来，表现是拖到一半跳回原位。
   */
  const syncStickers = useCallback(
    async (movedIds: string[]) => {
      const base = fileRef.current
      if (!base || !base.nodes.some(isSticker)) return
      const snapshot = placed()
      const moves = new Map<string, { x: number; y: number }>()
      for (const id of movedIds) {
        for (const m of syncStickerBindings(snapshot, id)) moves.set(m.id, m.position)
      }
      if (moves.size === 0) return
      const next = {
        ...base,
        nodes: base.nodes.map((n) => {
          const p = moves.get(n.id)
          return p ? { ...n, positions: { ...n.positions, [mode]: p } } : n
        }),
      }
      setFile(next)
      try {
        await putCanvas(next)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [mode, placed],
  )

  /** 清空全部贴纸。官方那句确认文案里承诺「可以整体撤销一次」。 */
  const clearStickers = useCallback(async () => {
    const base = fileRef.current
    if (!base) return
    const count = base.nodes.filter(isSticker).length
    if (count === 0) return
    if (
      !(await uiConfirm(`确定清除当前画布的全部 Sticker 吗？共 ${count} 个。`, {
        confirmLabel: "确认清空",
        danger: true,
      }))
    ) {
      return
    }
    const gone = new Set(base.nodes.filter(isSticker).map((n) => n.id))
    const next = {
      ...base,
      nodes: base.nodes.filter((n) => !isSticker(n)),
      // 贴纸挂在边上是不可能的（它们不可连线），但历史数据里万一有，
      // 留下悬空的边会让 gateway 的引用完整性校验**拒掉整次保存** ——
      // 表现是点了「确认清空」毫无反应。
      edges: base.edges.filter((e) => !gone.has(e.source) && !gone.has(e.target)),
    }
    setFile(next)
    try {
      await putCanvas(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

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
      /**
       * 给节点打/取消标签。和 `deleteNode` 一样**直接改服务端那份**。
       *
       * 只改界面状态的话刷新就没了，而标签的用途正是"下次回来还能分清"。
       */
      /**
       * 新建一个关键词并打在节点上。
       *
       * 注册表存在 canvas.json 的顶层（gateway 对未知字段是 flatten extra，
       * 原样带进带出）。和标签一样**直接改服务端那份** —— 只改界面的话
       * 刷新就没了。
       */
      async addKeywordTo(nodeId, name) {
        const base = fileRef.current
        if (!base) return
        const added = addKeyword(readRegistry(base.canvasTags), name)
        if (!added) return
        const now = tagsOf(base.nodes.find((n) => n.id === nodeId))
        const next = {
          ...base,
          canvasTags: added.reg,
          nodes: base.nodes.map((n) =>
            n.id === nodeId
              ? { ...n, meta: withTags(n.meta, now.includes(added.id) ? now : [...now, added.id]) }
              : n,
          ),
        }
        await putCanvas(next)
        setFile(next)
      },
      async setNodeTags(nodeId, tags) {
        const base = fileRef.current
        if (!base) return
        const next = {
          ...base,
          nodes: base.nodes.map((n) =>
            n.id === nodeId ? { ...n, meta: withTags(n.meta, tags) } : n,
          ),
        }
        await putCanvas(next)
        setFile(next)
      },
      /**
       * 把这个节点当输入。工具条的「以此生成」和右键的「添加到对话」
       * 是同一件事的两个入口 —— 用同一条实现，免得两处行为慢慢分叉。
       */
      /**
       * 点节点侧边的 ⊕。官方点它开的就是「添加节点」菜单，而且**带着
       * 源节点** —— 建出来的节点会连上它、并按类型过滤能建什么
       * （见 addNode.ts 的 ALLOWED_TARGET_TYPES）。
       *
       * 之前这个回调没传，⊕ 只能拖不能点。
       */
      openAddNode(nodeId, screenX, screenY) {
        const items = addNodeMenuRef.current(nodeId)
        if (items.length === 0) return
        setMenu({ x: screenX, y: screenY, items })
      },
      useAsInput(nodeId) {
        const path = detailsRef.current.get(nodeId)?.path
        setPendingAttachments(path ? [path] : [])
        setComposerOpen(true)
        setRightOpen(true)
      },
      /**
       * 在画布上再放一张同一个素材的卡片。
       *
       * **要显式 `allowDuplicate`** —— 后端默认对同一个资产是复用已有节点
       * （`api_canvas` 的 `allow_duplicate`），不给的话点「复制」什么都不会
       * 发生，而且不报错。
       */
      async duplicateNode(nodeId) {
        const path = detailsRef.current.get(nodeId)?.path
        if (!path) return
        await createMediaNode(path, undefined, true)
        await load()
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
      {/* 应用内的确认框/输入框。**必须有它** —— `window.confirm` 和
          `window.prompt` 在 Tauri 的 WKWebView 里永远不弹（wry 没实现
          WKUIDelegate），直接返回 false/null，于是删除、重命名这些
          点了毫无反应。见 Prompt.tsx。 */}
      <PromptHost />
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
                    onClick: () =>
                      void uiPrompt("项目名字", { placeholder: "例如：柯基短片" }).then((v) => {
                        const name = v?.trim()
                        if (!name) return
                        void createProject(name).then((r) => {
                          setHomeProject(r.project.id)
                          void reloadSessions()
                        })
                      }),
                  },
                ],
              })
            }
          />
        ) : (

        <main
          className={cn(
            "relative min-w-0 flex-1",
            spacePan && "canvas-space-pan",
            stamping && "canvas-stamping",
          )}
          data-hilo-canvas-root="true"
          style={{
            background: `var(${CANVAS_BACKGROUNDS.find((b) => b.id === bg)?.varName ?? "--canvas-bg"})`,
          }}
        >
          <ReactFlowProvider>
            <FlowBridge into={toFlowPos} />
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeDragStart={() => (draggingRef.current = true)}
              onNodeDragStop={(_, __, dragged) => {
                draggingRef.current = false
                void persistCanvas().then(() => {
                  // 拖完才同步跟随的贴纸，不是拖的过程中每帧同步 ——
                  // 每帧重算会整份重建画布图，手里拖着的节点会被抽掉重来。
                  void syncStickers(dragged.map((n) => n.id))
                })
              }}
              // 把当前缩放写成 CSS 变量。节点选中的描边宽度是
              // `max(1.5px, calc(1.5px / var(--canvas-zoom)))` —— 反向抵消缩放，
              // 缩小画布时描边仍是屏幕上的 1.5 物理像素。官方就是这么做的，
              // 不喂这个变量描边会跟着缩到看不见。
              onMove={(_, vp) => {
                document.documentElement.style.setProperty("--canvas-zoom", String(vp.zoom))
              }}
              fitView
              // **不放大，最多 100%。** 官方的 fitView 传的就是
              // `{ padding: 0.2, maxZoom: 1 }`。
              //
              // 不设上限的话，画布上只有一张图时 fitView 会一路放大到它
              // 铺满整个视口 —— 一张 350px 的卡片被撑到 1400px，糊得看不
              // 清，而且用户以为节点本身就是那么大。
              fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
              // 官方 CANVAS_MIN_ZOOM / CANVAS_MAX_ZOOM。
              minZoom={0.1}
              maxZoom={4}
              // 只渲染视口内的节点。画布上一个 image 节点就是一张几百 KB 的图，
              // 几百个节点全渲染会让首屏卡住。
              onlyRenderVisibleElements
              // 空白处拖拽 = 框选，不是平移；平移交给空格/中键/滚轮。
              // select：空白处拖拽 = 框选，平移交给中键/右键和滚轮。
              // hand：拖拽 = 平移，这时不能同时开 selectionOnDrag，
              // 否则两种行为会在同一个手势上打架（表现是"拖不动画布"）。
              selectionOnDrag={tool === "select"}
              panOnDrag={tool === "hand" ? true : [1, 2]}
              // 官方三个都开着（`panOnScroll` / `zoomOnScroll` / `zoomOnPinch`）。
              //
              // 我上一版把 panOnScroll 关了，理由是空画布提示写着"滚动缩放"。
              // 但**官方的配置就是开着的** —— 那句提示旁边是个鼠标图标，
              // 说的是滚轮，而 xyflow 在 panOnScroll 下把滚轮留给平移、
              // 缩放交给 ⌘/Ctrl+滚轮和触控板捏合。以配置为准，别按提示反推。
              panOnScroll
              zoomOnScroll
              zoomOnPinch
              // xyflow 的默认值就是 "Space"，**显式写出来**：这是上面那句
              // 提示承诺的操作，不该因为哪天有人改了默认值就悄悄失效。
              panActivationKeyCode="Space"
              // 官方的 `DELETE_KEY_CODE = ["Backspace", "Delete"]`。
              // **配合下面的 onNodesDelete / onEdgesDelete 才敢开** ——
              // 光开这个的话 xyflow 只改本地状态，删掉的节点下次加载又回来。
              deleteKeyCode={["Backspace", "Delete"]}
              // 删除要落到服务端那份 canvas.json 上。走的是和右键菜单
              // 同一条路（`deleteNode`），那条是持久化的。
              onNodesDelete={(deleted) => {
                void Promise.all(deleted.map((n) => actions.deleteNode(n.id)))
              }}
              onEdgesDelete={(deleted) => {
                const base = fileRef.current
                if (!base) return
                const gone = new Set(deleted.map((e) => e.id))
                const next = { ...base, edges: base.edges.filter((e) => !gone.has(e.id)) }
                void putCanvas(next).then(() => setFile(next))
              }}
              // 官方的四条连线规则。**我们之前一条都没有** ——
              // 什么都能连：自己连自己、同一对连两次、连到分组上。
              isValidConnection={(c) =>
                isValidConnection(c, {
                  edges,
                  typeOf: (id) => file?.nodes.find((n) => n.id === id)?.type,
                })
              }
              // **双击不缩放。** 我们把双击接给了"生成节点"（空画布提示里
              // 承诺的动作），默认的双击缩放会同时触发，画布跟着跳一下。
              // 官方也是 false。
              zoomOnDoubleClick={false}
              // 框选按官方的 Partial：碰到就算选中，不要求整个框住。
              selectionMode={SelectionMode.Partial}
              multiSelectionKeyCode="Shift"
              // 官方值。按下到抬起在 4px 内才算点击 —— 不设的话手抖一下
              // 就被当成拖拽，点空白处取消选中会时灵时不灵。
              paneClickDistance={4}
              proOptions={{ hideAttribution: true }}
              // 官方用的就是 xyflow 的默认 20。真正让"容易连上"的是节点两侧
              // 那个 84x84 的感应区（见 MagneticHandle），不是这个半径。
              connectionRadius={20}
              // 从把柄拉出线、松手在空白处 → 弹出"新建什么"的菜单。
              // 官方叫 openAddNodeMenu，是他们连线交互的一半 —— 没有它，
              // 拖出去松手什么也不会发生，用户会以为连线坏了。
              // **必须有 onConnect。** xyflow 不会自己把连线变成边 ——
              // 没有这个回调，用户拉出线、松手，什么都不会发生，
              // 而且没有任何提示。
              onConnect={(c) => {
                setEdges((es) => addEdge({ ...c, type: "default" }, es))
                void persistCanvas()
              }}
              onConnectEnd={(event, state) => {
                if (state.isValid) return
                const e = event as MouseEvent
                const from = state.fromNode?.id
                const items = addNodeMenuItems(from)
                // **一条都不给时不弹菜单。** 比如从视频拉出来只有
                // 「文本 / 视频」两条；从分组拉出来一条都没有 ——
                // 弹一个空菜单比不弹更让人困惑。
                if (items.length === 0) return
                setMenu({ x: e.clientX, y: e.clientY, items })
              }}
              // 官方空画布提示上写着「双击画布 自由生成节点」。
              // **提示里承诺的动作必须真的能用** —— 写着能双击却没反应，
              // 比不写更糟。
              onDoubleClick={(e) => {
                // 官方空画布提示上写着「双击画布 自由生成节点」——
                // 弹的就是这个「添加节点」菜单，和拉线松手同一份。
                setMenu({ x: e.clientX, y: e.clientY, items: addNodeMenuItems() })
              }}
              // 盖章模式下，点画布和点节点都是"在这里盖一个"。
              //
              // **两个都要接。** 只接 onPaneClick 的话，点在图片上不会盖章 ——
              // 而"贴在产物上"正是这个功能的主要用法，等于主路径是死的。
              onPaneClick={(e) => {
                if (stamping) void placeSticker(e.clientX, e.clientY)
              }}
              onNodeClick={(e) => {
                if (!stamping) return
                // 盖章时点节点不该同时选中它 —— 选中会弹出节点工具条，
                // 正好挡住刚盖下去的章。
                e.stopPropagation()
                void placeSticker(e.clientX, e.clientY)
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
                    // 官方的 `canvas.addToChat` =「添加到对话」。
                    // 把这个节点的素材丢进右侧输入框当输入 —— 和从 ⊕
                    // 拉线出来是同一件事的另一个入口，用户更常用这个。
                    ...(details.get(node.id)?.path
                      ? [
                          {
                            id: "add-to-chat",
                            label: "添加到对话",
                            icon: <MessageSquarePlus size={15} />,
                            onClick: () => {
                              setPendingAttachments([details.get(node.id)!.path!])
                              setComposerOpen(true)
                              setRightOpen(true)
                            },
                          },
                        ]
                      : []),
                    // 官方的 `canvas.splitGrid.label` =「宫格切分」。
                    // 只有图片节点有。预设按官方的 `{{n}}宫格` 命名。
                    ...(node.data.raw.type === "image" && assetId
                      ? GRID_PRESETS.map((g, gi) => ({
                          id: `split-${g.n}`,
                          label: `${g.n}宫格切分`,
                          icon: <Grid2x2 size={15} />,
                          separator: gi === 0,
                          onClick: () => void splitGridOf(node.id, assetId, g.rows, g.cols),
                        }))
                      : []),
                    // 官方的 `canvas.captureFrame` =「截帧」。只有视频节点有。
                    ...(node.data.raw.type === "video" && assetId
                      ? [
                          {
                            id: "capture",
                            label: "截帧",
                            icon: <Camera size={15} />,
                            onClick: () => void captureFrameOf(node.id, assetId),
                          },
                        ]
                      : []),
                    // 官方的 `canvas.node-tag-*`。七个预设颜色，一个节点
                    // 只能有一个（官方 MAX_COLOR_TAGS_PER_ASSET = 1）——
                    // 再点一个是换掉，点自己是取消。
                    ...TAG_PRESETS.map((t) => {
                      const now = tagsOf(file?.nodes.find((n) => n.id === node.id))
                      const on = now.includes(t.id)
                      return {
                        id: `tag-${t.id}`,
                        label: `${on ? "取消" : ""}${t.name}`,
                        icon: (
                          <span
                            className="inline-block size-3 rounded-full"
                            style={{
                              background: tagColor(t.id),
                              outline: on ? "2px solid var(--foreground)" : undefined,
                              outlineOffset: 1,
                            }}
                          />
                        ),
                        separator: t.id === TAG_PRESETS[0]!.id,
                        onClick: () => void actions.setNodeTags(node.id, toggleTag(now, t.id)),
                      }
                    }),
                    // 官方的 `canvasTags.newKeyword` =「新建关键词」。
                    // 关键词不显示在画布上（`canvasTags.keywordInfo`），
                    // 只用于关联/搜索/筛选 —— 打几十个也不会弄脏画布。
                    {
                      id: "add-keyword",
                      label: "新建关键词…",
                      icon: <Hash size={15} />,
                      onClick: () =>
                        void uiPrompt("新建关键词", {
                          placeholder: "最多 6 个中文或 12 个英文",
                        }).then((v) => {
                          const name = v?.trim()
                          if (!name) return
                          if (nameTooLong(name)) {
                            setError("标签名称最多支持 6 个中文或 12 个英文字符")
                            return
                          }
                          void actions.addKeywordTo(node.id, name)
                        }),
                    },
                    // `canvasTags.filterByTag` =「筛选并定位"{{name}}"」。
                    // 只在这个节点确实有标签时才给 —— 没有标签时点它
                    // 会筛出一个空集，看起来像画布被清空了。
                    // 这个节点身上的每个标签（含关键词）各给一条。
                    // 只给第一个的话，打了关键词的节点没法按关键词筛。
                    ...tagsOf(file?.nodes.find((n) => n.id === node.id)).map((tid) => ({
                      id: `tag-filter-${tid}`,
                      label: `筛选并定位「${
                        readRegistry(file?.canvasTags).tags.find((t) => t.id === tid)?.name ?? tid
                      }」`,
                      icon: <Filter size={15} />,
                      onClick: () => setTagFilter(tid),
                    })),
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
              {/* 点阵。颜色走官方的 `--canvas-bg-dot`，间距 20（官方的
                  `VISIBLE_GRID_GAP`）。

                  **`size` 是直径，不是半径。** 官方自绘时用的是
                  `ctx.arc(x, y, DOT_RADIUS, …)` 且 `DOT_RADIUS = 1`,
                  也就是直径 2px；我们之前写 `size={1}`,点只有一半大 ——
                  在浅色底上基本看不见。 */}
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={2}
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
                // 开**项目资产**面板。
                //
                // 这个按钮之前打开的是「项目库」那一页（项目卡片网格）——
                // 那是侧栏的东西，和文件夹图标对不上；官方这个位置是
                // `canvas.toolbar-project-assets`,就是当前项目的文件浏览器。
                //
                // 再之前它是 `window.open("/api/assets")`,弹出来一屏未格式化
                // 的 JSON。
                onAssets={() => setAssetsOpen((v) => !v)}
                help={help}
                onHelp={setHelp}
                sticker={{
                  selected: stickerId,
                  onSelect: (id) => {
                    setStickerId(id)
                    // 选了图案就直接进盖章模式 —— 官方那句
                    // 「选择 Sticker 后点击画布即可开始盖章」承诺的就是这个。
                    // 还要求用户再拨一次开关的话，那句话就是假的。
                    setStamping(true)
                  },
                  stamping,
                  onStamping: setStamping,
                  count: file?.nodes.filter(isSticker).length ?? 0,
                  onClear: () => void clearStickers(),
                  hidden: stickersHidden,
                  onHidden: setStickersHidden,
                }}
              />
              {/* 空状态。文案逐字取自官方 i18n 的 `canvas.emptyHint.*`：
                  「双击画布 自由生成节点」+「按住 Space 可以拖拽画布，
                  滚动 ⇧ 缩放画布」。

                  **说的是操作，不是状态。** 之前那句"画布是空的"只是把
                  用户已经看得见的事实又说了一遍，而真正该告诉他的是
                  下一步怎么做。 */}
              {file && file.nodes.length === 0 && <EmptyHint />}
              {help && <ShortcutPanel onClose={() => setHelp(false)} />}
              {tidyUndo && (
                <TidyUndoBar
                  onKeep={() => setTidyUndo(null)}
                  onRevert={() => void revertTidy()}
                />
              )}
              {assetsOpen && (
                <div className="absolute inset-y-0 right-0 z-20">
                  <ProjectAssets
                    assets={assetList}
                    onClose={() => setAssetsOpen(false)}
                    onUpload={async (files) => {
                      await uploadFiles(files)
                      await reloadAssets()
                    }}
                    onDelete={async (paths) => {
                      // 映射要**在删之前**取：删完资产就从索引里没了，
                      // 那时再查 path → id 只会查到空。
                      const doomed = new Set(
                        assetList.filter((a) => paths.includes(a.path)).map((a) => a.id),
                      )
                      const gone = await trashAssets(paths)
                      if (gone.length < paths.length) {
                        setError(`有 ${paths.length - gone.length} 个文件没能删除，见日志。`)
                      }

                      // **画布上引用这些文件的节点要一起摘掉。**
                      //
                      // 不摘的话卡片还在，但素材已经不在索引里了 ——
                      // `/files/id/X` 返回 404，用户看到一张破图，而且没有
                      // 任何办法修好它（"重新加载"也救不回来）。
                      // 删掉之后至少是干净的：文件在废纸篓里，捞回来重新
                      // 加入画布即可。
                      const base = fileRef.current
                      if (base && doomed.size > 0) {
                        const drop = new Set(
                          base.nodes.filter((n) => n.assetId && doomed.has(n.assetId)).map((n) => n.id),
                        )
                        if (drop.size > 0) {
                          const next = {
                            ...base,
                            nodes: base.nodes.filter((n) => !drop.has(n.id)),
                            // 悬空的边会让 gateway 的引用完整性校验拒掉整次保存。
                            edges: base.edges.filter(
                              (e) => !drop.has(e.source) && !drop.has(e.target),
                            ),
                          }
                          await putCanvas(next).catch((err) =>
                            setError(err instanceof Error ? err.message : String(err)),
                          )
                        }
                      }
                      await reloadAssets()
                      await load()
                    }}
                    onUse={(a) => {
                      void createMediaNode(a.path).then(() => load())
                    }}
                  />
                </div>
              )}
              <TagFilter
                active={
                  tagFilter
                    ? {
                        id: tagFilter,
                        // **名字要从注册表取，不是只从预设取。** 只查预设的话
                        // 按关键词筛选时工具条上是一片空白，用户不知道在筛什么。
                        name:
                          readRegistry(file?.canvasTags).tags.find((t) => t.id === tagFilter)
                            ?.name ?? tagFilter,
                      }
                    : null
                }
                matches={(file?.nodes ?? [])
                  .filter((n) => tagsOf(n).includes(tagFilter ?? ""))
                  .map((n) => n.id)}
                onPick={(id) =>
                  window.dispatchEvent(new CustomEvent("canvas:focus", { detail: id }))
                }
                onClear={() => setTagFilter(null)}
              />
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
            title={sessions.find((x) => x.id === currentSession)?.name}
            events={events}
            activity={activity}
            messages={messages}
            agentRunning={agentRunning}
            onStop={() =>
              // `void f()` 会把 reject 变成一条没人看的 unhandled rejection ——
              // 改成 throw 之后如果这里不接，等于白改。
              void agentStop().catch((e: unknown) =>
                setError(e instanceof Error ? e.message : String(e)),
              )
            }
            saving={saving}
            composerOpen={composerOpen}
            onDone={() => void load()}
            onNewChat={() => void newSession()}
            onCollapse={() => setRightOpen(false)}
            initialPrompt={pendingPrompt}
            initialAttachments={pendingAttachments}
            onConsumed={consumePending}
            question={question}
            onOpenAsset={(path) => {
              // 产物 chip 打开的是画布上引用它的那个节点（走灯箱）。
              //
              // **按文件名匹配**：节点上只有 assetId，没有工作区路径。
              // 文件名在我们的工作区里是内容哈希，撞名的概率可以忽略；
              // 真撞了也只是打开了另一张同名的图，不会出错。
              //
              // 找不到就什么都不做 —— 灯箱认的是节点 id，把路径传进去
              // 会开出一个空框。
              const name = path.split("/").pop()
              const n = file?.nodes.find((x) => details.get(x.id)?.name === name)
              if (n) setLightbox(n.id)
            }}
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

/**
 * 把 `screenToFlowPosition` 从 provider 里递出来。
 *
 * 这个 API 只有 `ReactFlowProvider` 的子树里拿得到，而 `<ReactFlow>` 的事件
 * 处理函数都写在 App 里（在 provider 外边）。为了一个坐标换算把整棵树重排
 * 不值得，用一个不渲染任何东西的组件把函数放进 ref。
 */
function FlowBridge({
  into,
}: {
  into: React.MutableRefObject<((p: { x: number; y: number }) => { x: number; y: number }) | null>
}) {
  const { screenToFlowPosition } = useReactFlow()
  useEffect(() => {
    into.current = screenToFlowPosition
    return () => {
      into.current = null
    }
  }, [screenToFlowPosition, into])
  return null
}
