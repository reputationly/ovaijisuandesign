import { ArrowUp, ExternalLink, Music, Video, Image as ImageIcon } from "lucide-react"
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
}: {
  onSubmit: (prompt: string, presetId?: string) => void
  onOpenCanvas: () => void
}) {
  const [tab, setTab] = useState<"inspiration" | "skill">("inspiration")
  const [cat, setCat] = useState<string>("全部")
  const [prompt, setPrompt] = useState("")
  // 记住内容来自哪个预设，生成完把结果登记成它的封面。
  const [preset, setPreset] = useState<string | undefined>()
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
              光谷爱计算
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
                if (prompt.trim()) onSubmit(prompt, preset)
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
              onClick={() => prompt.trim() && onSubmit(prompt, preset)}
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
  )
}
