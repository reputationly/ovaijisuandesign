import { ArrowUp, ExternalLink, Music, Video, Image as ImageIcon, Wand2 } from "lucide-react"
import { useRef, useState, type ReactNode } from "react"

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
  prompt: string
  kind: "image" | "video" | "audio"
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

const KIND_ICON: Record<string, ReactNode> = {
  image: <ImageIcon size={14} />,
  video: <Video size={14} />,
  audio: <Music size={14} />,
}

export function Home({
  onSubmit,
  onOpenCanvas,
}: {
  onSubmit: (prompt: string) => void
  onOpenCanvas: () => void
}) {
  const [tab, setTab] = useState<"inspiration" | "skill">("inspiration")
  const [cat, setCat] = useState<string>("全部")
  const [prompt, setPrompt] = useState("")
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const list = INSPIRATIONS.filter((i) => cat === "全部" || i.category === cat)

  return (
    <div className="relative h-full overflow-auto" style={{ background: "var(--background)" }}>
      {/* 顶部一条透明的拖拽区。首页可能左右栏都收着，没有它整个窗口拖不动。 */}
      <div data-tauri-drag-region className="absolute inset-x-0 top-0 h-11" />
      <div
        className="mx-auto flex flex-col px-10 pt-16 pb-20"
        style={{ maxWidth: "var(--home-primary-stack-width)" }}
      >
        {/* hero */}
        <div className="flex flex-col items-center" style={{ gap: "var(--home-hero-title-block-gap)" }}>
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="" width={56} height={56} className="rounded-xl" />
            <h1
              className="font-semibold"
              style={{
                fontSize: "var(--home-hero-title-size)",
                lineHeight: "var(--home-hero-title-line-height)",
              }}
            >
              ovaijisuandesign
            </h1>
          </div>
          <p
            style={{
              fontSize: "var(--home-hero-subtitle-size)",
              lineHeight: "var(--home-hero-subtitle-line-height)",
              letterSpacing: "var(--home-hero-subtitle-tracking-zh)",
              color: "var(--muted-foreground)",
            }}
          >
            接你自己的 MaaS 平台，画布 + agent 都在本地
          </p>
        </div>

        {/* 大输入框 */}
        <div
          className="mt-8 flex flex-col"
          style={{
            borderRadius: "var(--home-input-radius)",
            background: "var(--home-input-surface)",
            border: "var(--home-input-border-width) solid var(--home-input-border)",
            boxShadow: "var(--home-input-shadow)",
          }}
        >
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              // 回车提交、Shift+回车换行。isComposing 必须判 —— 中文选词时
              // 按回车会把半截拼音提交上去。
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                if (prompt.trim()) onSubmit(prompt)
              }
            }}
            placeholder="描述你要生成的内容"
            className="resize-none bg-transparent px-6 pt-5 outline-none"
            style={{
              minHeight: "var(--home-input-editor-min-height)",
              fontSize: "var(--home-input-editor-font-size)",
            }}
          />
          <div className="flex items-center gap-2 px-4 pb-4">
            <button
              onClick={onOpenCanvas}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition-colors"
              style={{ background: "var(--home-composer-tray-bg)", color: "var(--foreground)" }}
            >
              打开画布
              <ExternalLink size={13} />
            </button>
            <span className="flex-1" />
            <button
              onClick={() => prompt.trim() && onSubmit(prompt)}
              disabled={!prompt.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-opacity hover:opacity-85 disabled:opacity-30"
              style={{
                background: "var(--canvas-primary-btn-bg)",
                color: "var(--canvas-primary-btn-icon)",
              }}
            >
              <ArrowUp size={17} />
            </button>
          </div>
        </div>

        {/* tabs */}
        <div className="mt-14 flex items-center gap-6 border-b" style={{ borderColor: "var(--border)" }}>
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
                  {/* 官方这里是视频封面。我们没有素材库，用一块底色 + 类型图标
                      占位 —— 明确是"预设"而不是"作品"，不假装有内容。 */}
                  <div
                    className="flex aspect-[3/4] items-center justify-center"
                    style={{ background: "var(--bg-subtle)", color: "var(--muted-foreground)" }}
                  >
                    <Wand2 size={26} />
                  </div>
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
  )
}
