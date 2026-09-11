import { useEffect, useRef, useState } from "react"
import WaveSurfer from "wavesurfer.js"

/**
 * 音频节点的波形。**同时也是这张卡片唯一的播放器。**
 *
 * 只画波形，不做区间选择/裁剪 —— 那些属于编辑器，画布上的卡片只要能确认
 * "这段音频是不是我要的"。
 *
 * ## 为什么是受控的
 *
 * 以前这里有自己的播放按钮、驱动 wavesurfer，而外面的 `AudioPlayer` 另有
 * 一个圆按钮、驱动一个独立的 `<audio>` 元素 —— **一张卡片上两个播放器**:
 *
 * - 点圆按钮：声音在放，**波形上的进度一动不动**（wavesurfer 不知道）
 * - 两个都点：同一段音频叠着播两遍
 * - 音频还被下载解码了两次
 *
 * 现在播放状态由外面持有，这里只负责跟着动、并把 wavesurfer 自己发起的
 * 变化报上去（比如放完了）。
 */
export function Waveform({
  src,
  playing,
  onPlayingChange,
  onDuration,
}: {
  src: string
  playing: boolean
  onPlayingChange: (v: boolean) => void
  /** 解码出真实时长后报上去。卡片要显示它。 */
  onDuration?: (seconds: number) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const ws = useRef<WaveSurfer | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!host.current) return
    const inst = WaveSurfer.create({
      container: host.current,
      url: src,
      height: 56,
      waveColor: "#4a5163",
      progressColor: "#6f9dff",
      cursorColor: "#e6e7ea",
      cursorWidth: 1,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      normalize: true,
    })
    ws.current = inst
    // wavesurfer 自己发起的变化要报上去 —— 放完了、或者用户点了波形跳转。
    inst.on("play", () => onPlayingChange(true))
    inst.on("pause", () => onPlayingChange(false))
    inst.on("finish", () => onPlayingChange(false))
    inst.on("ready", (d: number) => onDuration?.(d))
    // 解码失败要显式说出来。静默留一片空白会被当成"这段音频是静音的"，
    // 而实际原因通常是格式不支持或文件坏了。
    inst.on("error", () => setFailed(true))
    return () => {
      // 卸载时可能正在解码，destroy 会抛 AbortError —— 那是预期的。
      try {
        inst.destroy()
      } catch {
        /* 解码被中断 */
      }
      ws.current = null
    }
  }, [src])

  // **外面说播就播。** `isPlaying()` 先对一下，不对的话
  // 重渲染会把一段正在放的音频重新 play 一次（wavesurfer 会从头开始）。
  useEffect(() => {
    const inst = ws.current
    if (!inst) return
    if (playing && !inst.isPlaying()) void inst.play()
    else if (!playing && inst.isPlaying()) inst.pause()
  }, [playing])

  if (failed) {
    return <div className="p-3 text-center text-xs text-dim">波形解码失败</div>
  }

  return (
    <div className="flex h-full w-full items-center px-2">
      {/* 播放按钮在外面（`AudioPlayer`）。**这里不能再有一个** ——
          两个按钮各驱动一个播放器的时候，波形进度和声音是对不上的。 */}
      <div
        ref={host}
        className="min-w-0 flex-1"
        onPointerDown={(e) => e.stopPropagation()}
      />
    </div>
  )
}
