import { Pause, Play, Volume2, VolumeX } from "lucide-react"
import { useEffect, useRef, useState } from "react"

/**
 * 视频节点的播放层。样式用官方的 `--canvas-video-control-*` / `--canvas-media-*`：
 *
 * ```
 * --canvas-media-control-bg        rgba(0,0,0,0.55)   悬浮按钮底
 * --canvas-media-control-bg-hover  rgba(0,0,0,0.7)
 * --canvas-video-control-track     rgba(255,255,255,0.35)   进度条底
 * --canvas-video-control-progress  #ffffff
 * --canvas-video-control-label     rgba(255,255,255,0.92)
 * --canvas-video-control-shadow    rgba(0,0,0,0.9)
 * ```
 *
 * 两个刻意的行为：
 *
 * - **控件只在 hover 时出现**，平时画布上是干净的一张画面 —— 和节点名字条
 *   的处理一致。
 * - **不自动播放**。画布上可能同时有十几个视频，自动播是灾难。
 *
 * ## 默认不静音
 *
 * 以前默认静音，理由写的是"画布上可能有十几个视频，任何一个自己出声都是
 * 灾难"—— **那个理由是针对自动播放的，而我们从不自动播放**。用户必须点
 * 播放键才会开始，点了就是想看这段视频；静音的话他看到的是一段默片，
 * 而那个音量按钮藏在 hover 才出现的控件条里。
 */
export function VideoPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    const onTime = () => setProgress(v.duration ? v.currentTime / v.duration : 0)
    const onEnd = () => setPlaying(false)
    v.addEventListener("timeupdate", onTime)
    v.addEventListener("ended", onEnd)
    return () => {
      v.removeEventListener("timeupdate", onTime)
      v.removeEventListener("ended", onEnd)
    }
  }, [])

  const toggle = () => {
    const v = ref.current
    if (!v) return
    if (v.paused) {
      void v.play()
      setPlaying(true)
    } else {
      v.pause()
      setPlaying(false)
    }
  }

  return (
    <div className="group/media relative h-full w-full">
      <video
        ref={ref}
        src={src}
        muted={muted}
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />

      {/* 中央播放键。没在播时常驻，播放中只在 hover 出现 —— 不然一直挡着画面。 */}
      <button
        onClick={toggle}
        className={[
          "absolute inset-0 flex items-center justify-center transition-opacity",
          playing ? "opacity-0 group-hover/media:opacity-100" : "opacity-100",
        ].join(" ")}
      >
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-sm transition-colors"
          style={{
            background: "var(--canvas-media-control-bg)",
            color: "var(--canvas-media-play-icon)",
          }}
        >
          {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </span>
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2 opacity-0 transition-opacity group-hover/media:opacity-100">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => setMuted((m) => !m)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
            style={{
              color: "var(--canvas-video-control-fg)",
              textShadow: `0 1px 2px var(--canvas-video-control-shadow)`,
            }}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <div
            className="h-1 flex-1 overflow-hidden rounded-full"
            style={{ background: "var(--canvas-video-control-track)" }}
          >
            <div
              className="h-full"
              style={{
                width: `${progress * 100}%`,
                background: "var(--canvas-video-control-progress)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 音频卡。官方的是 350x150 —— 一条波形加一个播放键。
 *
 * **播放器只有一个**：波形（wavesurfer）就是播放器，这里只出按钮、时间和
 * 布局。以前这儿另有一个 `<audio>` 元素，和波形各播各的 —— 点圆按钮声音
 * 在放而波形进度一动不动，两个都点还会叠着播两遍。
 */
export function AudioPlayer({
  children,
  playing,
  onToggle,
  duration,
}: {
  /** 波形。由调用方传进来，因为它同时是播放器。 */
  children?: React.ReactNode
  playing: boolean
  onToggle: () => void
  /** 秒。解码完才有。 */
  duration?: number
}) {
  return (
    <div className="relative flex h-full w-full flex-col justify-center gap-2 px-3">
      {children}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        // 卡片本身可拖拽，按钮上要挡住，否则点一下就变成拖了 1px。
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
        style={{
          background: "var(--canvas-media-control-bg)",
          color: "var(--canvas-media-play-icon)",
        }}
      >
        {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>
      {/* 时长。官方的素材信息里有这一项（`assetPreview.meta.duration`）——
          一段音频光看波形判断不出长短，而"这是 8 秒还是 3 分钟"
          往往是用户最先想知道的。 */}
      {duration !== undefined && (
        <span
          className="absolute right-2 bottom-1.5 text-[11px] tabular-nums"
          style={{ color: "var(--muted-foreground)" }}
        >
          {clock(duration)}
        </span>
      )}
    </div>
  )
}

/** 秒 → `m:ss`。 */
export function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--"
  const s = Math.round(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}
