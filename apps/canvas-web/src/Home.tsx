import {
  ArrowUp,
  Box,
  ChevronDown,
  ExternalLink,
  FileText,
  Folder as FolderIcon,
  Image as ImageIcon,
  Music,
  Plus,
  Sparkles,
  Video,
  X,
} from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"

import { getCapabilities, uploadFiles } from "./api"
import { cn } from "./lib"

/**
 * 首页。布局照官方的 3.0.12：hero（logo + 标题 + 副标题）→ 大输入框 →
 * 「创作灵感 / Skill」两个 tab → 分类胶囊 → 卡片网格。
 *
 * 尺寸全部用他们的 `--home-*` 变量，都是量出来的：
 *
 * ```
 * --home-hero-title-size          40px      标题
 * --home-hero-title-line-height   40px
 * --home-hero-subtitle-size       16px      副标题
 * --home-hero-content-gap         24px
 * --home-input-radius             24px      输入框
 * --home-input-editor-min-height  90px
 * --home-input-shadow             0 10px 24px -20px #11111329, 0 1px 4px -3px #11111314
 * --home-primary-stack-width      793px     中间那一栏的宽度
 * --home-scene-tag-height         52px      分类胶囊
 * --home-query-card-radius        16px      卡片
 * --home-query-card-gap           12px
 * ```
 *
 * **内容是我们自己的。** 官方那些 MV 封面来自他们的推荐服务，我们没有 ——
 * 与其放一堆占位图，不如放真实可用的东西：「创作灵感」是能直接跑的提示词
 * 预设，「Skill」是我们实际装着的 agent 和 MCP 工具。空壳看着像，点下去
 * 什么都没有，那比不做更糟。
 */

type Inspiration = {
  id: string
  category: string
  title: string
  desc: string
  /** 点卡片会填进输入框的提示词。**预览和提示词必须是一对** ——
   *  看到的就是这句话产出的，用户点一下就能复现。这是官方那套灵感卡片
   *  真正有用的地方，不是那张图好看。 */
  prompt: string
  kind: "image" | "video" | "audio"
  /**
   * 预览视频的地址。**留着不填** —— 将来把预览视频放到 CDN 上，
   * 这里填 URL，打开首页时按需下载（视频几 MB 一个，不能进仓库）。
   * 有 `previewUrl` 就播视频，没有就用本地那张静态封面。
   */
  previewUrl?: string
}

/** 分类。按我们真正接了的模态来分，不是照抄他们的栏目名。 */
const CATEGORIES = ["全部", "静物", "人像", "场景", "视频", "音乐"] as const

const INSPIRATIONS: Inspiration[] = [
  {
    id: "still-lamp",
    category: "静物",
    kind: "image",
    title: "暖光台灯",
    desc: "静物摄影，浅景深，暖色调，桌面与木质纹理。",
    prompt: "一盏黄铜台灯放在旧木桌上，暖光，静物摄影，浅景深，柔和阴影",
  },
  {
    id: "still-ceramic",
    category: "静物",
    kind: "image",
    title: "陶器与影子",
    desc: "极简布光，长投影，米白背景。",
    prompt: "一只手工陶罐，米白背景，侧逆光拉出长影子，极简，静物摄影",
  },
  {
    id: "portrait-studio",
    category: "人像",
    kind: "image",
    title: "棚拍人像",
    desc: "单灯，硬光，深色背景，胶片颗粒。",
    prompt: "棚拍人像，单灯硬光，深灰背景，轻微胶片颗粒，35mm",
  },
  {
    id: "scene-street",
    category: "场景",
    kind: "image",
    title: "雨后街道",
    desc: "夜晚，霓虹倒影，湿地面，电影感。",
    prompt: "雨后的城市街道，夜晚，霓虹在湿地面上的倒影，电影感构图",
  },
  {
    id: "scene-interior",
    category: "场景",
    kind: "image",
    title: "清晨室内",
    desc: "自然光从窗户斜射进来，尘埃可见。",
    prompt: "清晨的室内，阳光从百叶窗斜射进来，空气中可见尘埃，安静",
  },
  {
    id: "video-corgi",
    category: "视频",
    kind: "video",
    title: "奔跑的柯基",
    desc: "跟拍，落叶，浅景深，5 秒。",
    prompt: "一只柯基在落叶铺满的小路上奔跑，跟拍镜头，浅景深",
  },
  {
    id: "music-lofi",
    category: "音乐",
    kind: "audio",
    title: "Lo-fi 学习曲",
    desc: "慢速鼓组，暖底噪，钢琴动机。",
    prompt: "lo-fi hip hop，慢速鼓组，暖底噪，简单钢琴动机，适合专注",
  },
  {
    id: "music-rap",
    category: "音乐",
    kind: "audio",
    title: "中文说唱",
    desc: "trap 底鼓，中文歌词，副歌重复。",
    prompt: "中文说唱，trap 风格，重低音，副歌重复且上口",
  },
]

/**
 * 我们实际装着的 agent。名字和职责取自 `reference/agent-profiles/agents/`。
 *
 * `hint` 是点这张卡时填进输入框的话 —— 卡片不能只是介绍文字，
 * 点了得有事发生，否则就是个摆设。
 */
const SKILLS = [
  {
    id: "planner",
    name: "planner",
    desc: "把一句话拆成可执行的步骤，决定调哪些工具。",
    hint: "帮我规划一下：做一支 15 秒的产品短片，先出分镜再出图",
  },
  {
    id: "router",
    name: "router",
    desc: "判断这一轮该交给哪个专项 agent。",
    hint: "我想给这张图换个背景，该用什么方式做",
  },
  {
    id: "executor",
    name: "executor",
    desc: "执行具体步骤，负责落盘和错误恢复。",
    hint: "把画布上所有图片按 16:9 重新出一遍并放到新的一行",
  },
  {
    id: "media-agent",
    name: "media-agent",
    desc: "出图 / 出视频 / 出音乐，管参数和轮询。",
    hint: "生成三张不同角度的产品静物图，1:1，2K",
  },
  {
    id: "comfyui-agent",
    name: "comfyui-agent",
    desc: "ComfyUI 工作流：解析图、收参数、跑、回报产物。",
    hint: "用画布上的 ComfyUI 工作流跑一遍，参数保持默认",
  },
]

function Cover({ preset }: { preset: Inspiration }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className="flex aspect-[3/4] items-center justify-center"
        style={{ background: KIND_TINT[preset.kind] ?? "var(--bg-subtle)" }}
      >
        <span style={{ color: "var(--muted-foreground)" }}>{KIND_ICON[preset.kind]}</span>
      </div>
    )
  }

  return (
    <div className="relative aspect-[3/4] overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
      {preset.previewUrl ? (
        // `preload="metadata"` 只拉文件头，**hover 才真正播** ——
        // 首屏不会同时下十几个视频。官方也是这个行为。
        <video
          src={preset.previewUrl}
          poster={COVER(preset.id)}
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
          onMouseEnter={(e) => void e.currentTarget.play().catch(() => {})}
          onMouseLeave={(e) => {
            e.currentTarget.pause()
            e.currentTarget.currentTime = 0
          }}
        />
      ) : (
        <img
          src={COVER(preset.id)}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
      {preset.kind !== "image" && (
        // 非图片的预设，封面只是示意画面 —— 不标的话用户会以为点了出的是图。
        <span
          className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded px-1.5 py-px text-[10px]"
          style={{ background: "var(--canvas-media-control-bg)", color: "#fff" }}
        >
          {KIND_ICON[preset.kind]}
          {preset.kind === "video" ? "视频" : "音乐"}
        </span>
      )}
    </div>
  )
}

const KIND_ICON: Record<string, ReactNode> = {
  image: <ImageIcon size={14} />,
  video: <Video size={14} />,
  audio: <Music size={14} />,
}

/**
 * 预设的封面。
 *
 * `public/covers/<id>.webp`，**由 `scripts/gen-covers.py` 用这台机器上的
 * MaaS 平台、按下面那些提示词生成一次**，产物提交进仓库。八张一共 155 KB。
 *
 * 试过两条不行的路，记下来免得再走：
 *
 * - **抄官方的封面**：那些图不在应用包里（包里只有托盘图标），是运行时从
 *   他们的推荐服务拉的；而且题材对不上 —— 卡片写"暖光台灯"配一个说唱 MV
 *   比占位图更糟。
 * - **用用户自己生成的结果**：不稳定。换台机器、清了工作区就没了，
 *   而首页应该是确定的。
 *
 * 视频预览走 `previewUrl`（见 [`Inspiration`]）：视频几 MB 一个，不能进
 * 仓库，将来放 CDN 按需下载。
 */
const COVER = (id: string) => `/covers/${id}.webp`

/** 按类型给的兜底底色（封面缺失时）。用画布那 9 档底色，色调统一。 */
const KIND_TINT: Record<string, string> = {
  image: "var(--canvas-bg-mist-blue)",
  video: "var(--canvas-bg-lavender)",
  audio: "var(--canvas-bg-sage)",
}

export function Home({
  onSubmit,
  onOpenCanvas,
  projectName,
  onPickProject,
  onOpenSkills,
}: {
  onSubmit: (prompt: string, presetId?: string, attachments?: string[]) => void
  onOpenCanvas: () => void
  /** 当前选中的项目名。`null` = 还没选。 */
  projectName: string | null
  onPickProject: (at: { x: number; y: number }) => void
  onOpenSkills: () => void
}) {
  const [tab, setTab] = useState<"inspiration" | "skill">("inspiration")
  const [cat, setCat] = useState<string>("全部")
  const [prompt, setPrompt] = useState("")
  // 记住内容来自哪个预设，生成完把结果登记成它的封面。
  const [preset, setPreset] = useState<string | undefined>()
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  /** 挂在输入框上的参考素材。提交时作为底图一起发出去。 */
  const [attachments, setAttachments] = useState<{ path: string; name: string }[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  // 哪个下拉开着。模型选择器还没做，点了先跳到 Skill 页 —— 见下面。
  const [picker, setPicker] = useState<"model" | "skill" | null>(null)

  /**
   * 上传后**先挂在输入框上，不直接落画布**。
   *
   * 之前是传完就建节点 + 跳画布 —— 用户传参考图本来是想"照着这张生成"，
   * 结果画布上多了一张原图、提示词还没写就被弹走了。
   */
  const upload = async (files: File[]) => {
    setUploading(true)
    setUploadError(null)
    try {
      const paths = await uploadFiles(files)
      setAttachments((prev) => [
        ...prev,
        ...paths.map((path, i) => ({ path, name: files[i]?.name ?? path.split("/").pop()! })),
      ])
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e))
    } finally {
      setUploading(false)
    }
  }

  const list = INSPIRATIONS.filter((i) => cat === "全部" || i.category === cat)

  return (
    // 结构照官方的 `home-hero-zone`：
    //
    //   main(flex-1, overflow-y-auto)
    //     └ hero-zone(min-h-full, justify-center, padding-inline 40)   ← 垂直居中
    //         └ div(w-full, max-w-793)                                 ← 这里没有内边距
    //             └ hero-content(gap 24)
    //
    // **两处之前做错了：**
    // 1. 用固定的 pt-16 而不是 `min-height:100% + justify-content:center`。
    //    官方整块内容是在视口里垂直居中的，窗口一高，上面的留白跟着涨。
    // 2. 把 px-10 放在了 max-width 容器**里面**，于是输入框只有 793-80=713 宽。
    //    官方那 40px 内边距在 max-width 外面，输入框是实打实的 793。
    <main
      className="relative isolate flex min-w-0 flex-1 flex-col items-stretch overflow-y-auto"
      style={{ background: "var(--home-content-surface, var(--background))" }}
    >
      {/* 顶部一条透明的拖拽区。首页可能左右栏都收着，没有它整个窗口拖不动。 */}
      <div data-tauri-drag-region className="absolute inset-x-0 top-0 z-0 h-11" />
      <div
        className="relative flex shrink-0 flex-col items-center"
        style={{
          minHeight: "100%",
          paddingInline: "var(--home-hero-padding-x)",
          paddingBlockStart: "var(--home-hero-safe-inset)",
          // 底部多留一段：官方叫 --home-hero-bottom-balance，作用是让
          // 居中的那一块视觉上略微偏上 —— 正正好居中会显得下沉。
          paddingBlockEnd:
            "calc(var(--home-hero-safe-inset) + var(--home-hero-bottom-balance))",
          justifyContent: "safe center",
        }}
      >
      <div
        className="flex w-full flex-col"
        style={{ maxWidth: "var(--home-primary-stack-width)", gap: "var(--home-hero-content-gap)" }}
      >
        {/* hero */}
        <div className="flex flex-col items-center" style={{ gap: "var(--home-hero-title-block-gap)" }}>
          {/* 蒜狸。**不加圆角也不裁切** —— 它是个带黑描边的手绘形象，
              套一个 rounded-xl 会把耳朵尖切掉。

              旁边原本有一行品牌名，去掉了：侧栏顶上已经有一次，
              同一屏里出现两遍是重复，而这里真正该占位的是形象本身。 */}
          <img
            src="/mascot.png"
            alt="蒜狸"
            width={96}
            height={96}
            className="shrink-0 select-none"
            draggable={false}
          />
          {/* 标题没了之后这行是 hero 里唯一的文字，字号往上提一档 ——
              还按副标题的尺寸的话，整块会显得头重脚轻。
              `--home-hero-subtitle-tracking-zh` 也不用了：楷书自己的字距
              在 .font-brand 里调过，再叠一层会散开。 */}
          <p
            className="font-brand"
            style={{
              fontSize: "calc(var(--home-hero-subtitle-size) * 1.35)",
              lineHeight: "var(--home-hero-title-line-height)",
              color: "var(--foreground)",
            }}
          >
            说一句话，剩下的交给蒜狸
          </p>
        </div>

        {/* 大输入框 */}
        {/* Composer = 输入框 + 托盘，**必须包成一个单元**。

            上层那个 hero 容器有 `gap: var(--home-hero-content-gap)` = 24px。
            输入框和托盘要是它的两个兄弟节点，flex 的 gap 会把它们推开 24px，
            而托盘的 `-mt-4` 只有 16px —— 净剩 8px 缝隙，托盘就"掉"在下面、
            吸不上去。官方也是把这两个放在同一个 composer 里的。 */}
        <div className="flex w-full flex-col">
        {/* 输入框。类名照官方的 `home-input-surface`：
            `relative z-10 flex w-full min-h-[var(--input-card-height)]
             flex-col justify-between rounded-[…] p-[var(--message-input-card-padding)]`

            **`justify-between` + `min-h` 是一对**：工具行被推到卡片底部，
            而不是紧贴在文本下面。没有它，空输入框里工具行会往上缩，
            整个卡片看起来扁一截。 */}
        <div
          className="relative z-10 flex w-full flex-col justify-between"
          style={{
            minHeight: "var(--input-card-height)",
            padding: "var(--message-input-card-padding)",
            borderRadius: "var(--home-input-radius)",
            background: "var(--home-input-surface)",
            border: "var(--home-input-border-width) solid var(--home-input-border)",
            boxShadow: "var(--home-input-shadow)",
          }}
        >
          {/* 附件条。官方是缩略图 + 右上角 `×`，悬停出大图和「替换素材」。
              我们做前两样；「替换素材」要一个素材选择器，那是另一块。

              **图片直接显示缩略图，其余显示文件名。** 一律显示文件名的话，
              用户传了三张参考图会看到三行看不出区别的 png，而参考图恰恰是
              靠"长什么样"来区分的。 */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-2 pt-2">
              {attachments.map((a) => (
                <div key={a.path} className="group relative">
                  {/^images?\//.test(a.path) ? (
                    <img
                      src={`/files/${a.path}?w=160`}
                      alt={a.name}
                      title={a.name}
                      className="h-16 w-16 rounded-lg object-cover"
                      style={{ border: "1px solid var(--border)" }}
                    />
                  ) : (
                    <div
                      className="flex h-16 max-w-[160px] items-center gap-1.5 rounded-lg px-2.5 text-[12px]"
                      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                      title={a.name}
                    >
                      <FileText size={14} className="shrink-0" />
                      <span className="truncate">{a.name}</span>
                    </div>
                  )}
                  <button
                    onClick={() => setAttachments((p) => p.filter((x) => x.path !== a.path))}
                    title="移除"
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ background: "var(--foreground)", color: "var(--background)" }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              // 回车提交、Shift+回车换行。isComposing 必须判 —— 中文选词时
              // 按回车会把半截拼音提交上去。
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                if (prompt.trim()) onSubmit(prompt, preset, attachments.map((a) => a.path))
              }
            }}
            placeholder="描述你要生成的内容"
            className="resize-none bg-transparent px-4 pt-3 outline-none"
            style={{
              minHeight: "var(--home-input-editor-min-height)",
              fontSize: "var(--home-input-editor-font-size)",
            }}
          />
          {/* 底部工具行。**结构和类名照官方的 `HomeToolbar`**：
              左边 `+` / 模型 / 分隔线 / Skill，右边发送。
              分隔线是 `mx-1 h-3 w-[1.5px] bg-foreground/15`，不是 border。 */}
          <div
            data-composer-action-row="true"
            className="flex min-w-0 items-end justify-between gap-2 px-1 pb-1"
          >
            <div data-composer-actions-left="true" className="flex min-w-0 flex-1 items-center">
              <button
                type="button"
                data-action-ui-id="home-attachment-add"
                title="添加文件"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="mr-1 flex size-[var(--btn-height-sm)] cursor-pointer items-center justify-center rounded-full bg-[var(--message-input-attachment-bg)] text-foreground/70 transition-colors duration-75 hover:bg-[var(--message-input-attachment-bg-hover)] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Plus size={16} strokeWidth={1.5} />
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                data-action-ui-id="home-attachment-local"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  // **必须清空 value。** 不清的话，选同一个文件第二次
                  // 不会触发 change —— 表现是"第二次点没反应"。官方同款。
                  e.target.value = ""
                  if (files.length) void upload(files)
                }}
              />

              <div className="relative">
                <ToolBtn
                  data-action-ui-id="home-model-btn"
                  onClick={() => setPicker(picker === "model" ? null : "model")}
                >
                  <Box size={16} strokeWidth={1.5} />
                  模型
                </ToolBtn>
                {picker === "model" && <ModelPopover onClose={() => setPicker(null)} />}
              </div>

              <ToolbarDivider />

              {/* Skill 在官方是个弹层（带分类标签和搜索）。我们已经有一整页
                  Skill 了，点这里直接过去 —— 再做一个功能重叠的弹层，
                  两处的"创建/编辑"就要维护两份。 */}
              <ToolBtn data-action-ui-id="home-skill-btn" onClick={onOpenSkills}>
                <Sparkles size={16} strokeWidth={1.5} />
                Skill
              </ToolBtn>

              <ToolbarDivider />

              {/* 官方这行没有「打开画布」——他们从侧栏进画布。我们保留它，
                  但**放在左边这一组里**而不是用 ml-auto 顶到最右：顶到最右
                  会和发送按钮挤在一起、中间空出一大片，整行的节奏就断了。 */}
              <ToolBtn data-action-ui-id="home-open-canvas" onClick={onOpenCanvas}>
                <ExternalLink size={15} strokeWidth={1.5} />
                打开画布
              </ToolBtn>
            </div>

            <div data-composer-actions-right="true" className="flex shrink-0 items-end gap-2">
              <button
                type="button"
                data-action-ui-id="message-send-btn"
                aria-label="发送"
                onClick={() => prompt.trim() && onSubmit(prompt, preset, attachments.map((a) => a.path))}
                disabled={!prompt.trim()}
                className="flex size-[var(--btn-height-sm)] cursor-pointer items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowUp size={17} />
              </button>
            </div>
          </div>
        </div>

        {/* 「选择项目」托盘。官方是**压在输入框底下**的一层浅色面板，
            只露出下半截 —— 靠负 margin 塞回去，视觉上像输入框的底托。
            单独放一行的话会多出一条明显的横向分隔，整块散掉。 */}
        <div
          className="relative z-0 mx-5 -mt-4 flex min-h-[46px] items-end rounded-b-[var(--home-input-radius)] px-3 pt-[22px] pb-1.5"
          style={{ background: "var(--home-composer-tray-bg)" }}
        >
          <button
            data-action-ui-id="home-project-btn"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              onPickProject({ x: r.left, y: r.bottom + 6 })
            }}
            // 类名逐字照官方的 `triggerClass` + `max-w-[180px]`。
            // 高度用 --btn-height-sm(32px) 而不是 py-1：托盘 min-h 是 46，
            // 按钮撑高会把托盘顶出去，看起来就不是"压在下面"了。
            className="flex h-[var(--btn-height-sm)] max-w-[180px] cursor-pointer items-center gap-[var(--home-input-control-content-gap)] rounded-full px-[var(--home-input-toolbar-padding-x)] py-0 text-[13px] leading-5 font-normal tracking-[var(--home-input-toolbar-letter-spacing)] text-foreground/70 transition-colors duration-75 hover:bg-[var(--message-input-control-hover)] hover:text-foreground"
          >
            <FolderIcon size={16} strokeWidth={1.5} className="shrink-0" />
            <span className="truncate">{projectName ?? "选择项目"}</span>
            <ChevronDown size={13} strokeWidth={1.5} className="shrink-0 opacity-60" />
          </button>
          {uploading && (
            <span className="ml-3 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
              上传中…
            </span>
          )}
          {uploadError && (
            <span className="ml-3 text-[12px]" style={{ color: "var(--canvas-node-tag-red)" }}>
              {uploadError}
            </span>
          )}
        </div>
        </div>

        {/* tabs */}
        <div
          className="flex items-center gap-6 border-b"
          style={{
            marginTop: "var(--home-input-to-tags-gap)",
            borderColor: "var(--border)",
          }}
        >
          {(
            [
              ["inspiration", "创作灵感"],
              ["skill", "Skill"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn("relative pb-3 text-[15px] transition-colors")}
              style={{
                color: tab === id ? "var(--foreground)" : "var(--muted-foreground)",
                fontWeight: tab === id ? 600 : 400,
              }}
            >
              {label}
              {tab === id && (
                <span
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full"
                  style={{ background: "var(--foreground)" }}
                />
              )}
            </button>
          ))}
        </div>

        {tab === "inspiration" ? (
          <>
            {/* 分类胶囊 */}
            <div className="mt-5 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className="rounded-full px-4 py-2 text-[13px] transition-colors"
                  style={{
                    background: cat === c ? "var(--foreground)" : "var(--home-scene-tag-surface)",
                    color: cat === c ? "var(--background)" : "var(--foreground)",
                    border:
                      cat === c ? "1px solid transparent" : "1px solid var(--border)",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            <div
              className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
              style={{ gap: "var(--home-query-card-gap)" }}
            >
              {list.map((i) => (
                <button
                  key={i.id}
                  // 官方的行为是**填进上面的输入框**，不是直接跳走 ——
                  // 用户通常要在预设基础上改两句再发。
                  onClick={() => {
                    setPrompt(i.prompt)
                    setPreset(i.id)
                    inputRef.current?.focus()
                    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
                  }}
                  className="flex flex-col overflow-hidden text-left transition-colors"
                  style={{
                    borderRadius: "var(--home-query-card-radius)",
                    border: "1px solid var(--home-query-card-border)",
                    background: "var(--card)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--home-media-showcase-card-hover)")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--card)")}
                >
                  {/* 封面：优先用这个预设自己产出过的资产，其次同类型的任意
                      一个，都没有才用占位。**不放假图** —— 看到的必须是这台
                      机器上真实存在的东西。 */}
                  <Cover preset={i} />
                  <div className="flex flex-col gap-1 p-3">
                    <span className="flex items-center gap-1.5 text-[14px] font-medium">
                      <span style={{ color: "var(--muted-foreground)" }}>{KIND_ICON[i.kind]}</span>
                      {i.title}
                    </span>
                    <span
                      className="line-clamp-2 text-[12px] leading-snug"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {i.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div
            className="mt-5 grid grid-cols-1 sm:grid-cols-2"
            style={{ gap: "var(--home-query-card-gap)" }}
          >
            {SKILLS.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setPrompt(s.hint)
                  inputRef.current?.focus()
                  inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
                }}
                className="flex flex-col gap-1 p-4 text-left transition-colors"
                style={{
                  borderRadius: "var(--home-query-card-radius)",
                  border: "1px solid var(--home-query-card-border)",
                  background: "var(--card)",
                }}
              >
                <span className="font-mono text-[14px] font-medium">{s.name}</span>
                <span className="text-[12px] leading-snug" style={{ color: "var(--muted-foreground)" }}>
                  {s.desc}
                </span>
              </button>
            ))}
            <p
              className="col-span-full mt-2 text-[12px]"
              style={{ color: "var(--muted-foreground)" }}
            >
              这些是 <code>reference/agent-profiles/agents/</code> 里实际装着的 agent，
              由 <code>ovagent</code> 拉起 opencode 时加载。
            </p>
          </div>
        )}
      </div>
      </div>
    </main>
  )
}

/** 工具行上的一个按钮。类名逐字照官方 `HomeToolbar`。 */
function ToolBtn({
  children,
  onClick,
  ...rest
}: {
  children: ReactNode
  onClick: () => void
} & Record<string, unknown>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center gap-[var(--home-input-control-content-gap)] rounded-full px-[var(--home-input-toolbar-padding-x)] h-[var(--btn-height-sm)] text-[length:var(--home-input-toolbar-font-size)] font-normal leading-5 tracking-[var(--home-input-toolbar-letter-spacing)] text-foreground/70 transition-colors duration-75 hover:bg-[var(--message-input-control-hover)] hover:text-foreground"
      {...rest}
    >
      {children}
    </button>
  )
}

/** 官方是 `mx-1 h-3 w-[1.5px] bg-foreground/15` —— 一个 div，不是 border。 */
function ToolbarDivider() {
  return <div className="mx-1 h-3 w-[var(--home-input-toolbar-divider-width)] shrink-0 bg-foreground/15" />
}

/**
 * 模型清单。
 *
 * 官方这里是可勾选的模型选择器（选中的会算进按钮上的 `· N`）。我们**只读**：
 * 用哪个模型是 `config.json` 决定的，让用户在这里勾一个选不中的模型，
 * 比不给这个界面更糟。
 *
 * 数据来自 `/api/capabilities` —— 就是 agent 调 `list_capabilities` 看到的
 * 同一份，包括"这个模态本机没配"。
 */
function ModelPopover({ onClose }: { onClose: () => void }) {
  const [caps, setCaps] = useState<
    { modality: string; available: boolean; model: string | null }[] | null
  >(null)
  useEffect(() => {
    void getCapabilities()
      .then(setCaps)
      .catch(() => setCaps([]))
  }, [])
  return (
    <>
      {/* 点外面关掉。不加这层的话弹层只能靠再点一次按钮关，
          而用户的直觉是点别处就该收起来。 */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-xl p-2 shadow-lg"
        style={{ background: "var(--canvas-node-bg)", border: "1px solid var(--border)" }}
      >
        <p className="px-2 pt-1 pb-2 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
          本机配置的模型（改 config.json 生效）
        </p>
        {caps === null ? (
          <p className="px-2 pb-1 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
            读取中…
          </p>
        ) : (
          caps.map((c) => (
            <div key={c.modality} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px]">
              <span className="w-20 shrink-0" style={{ color: "var(--muted-foreground)" }}>
                {MODALITY_ZH[c.modality] ?? c.modality}
              </span>
              <span className="truncate" style={{ color: c.available ? undefined : "var(--muted-foreground)" }}>
                {c.model ?? "未配置"}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  )
}

const MODALITY_ZH: Record<string, string> = {
  image: "文生图",
  image_edit: "图生图",
  video: "文生视频",
  video_ref: "参考生视频",
  music: "音乐",
  music_edit: "翻唱",
  speech: "语音",
}
