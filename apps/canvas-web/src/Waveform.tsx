import { useEffect, useRef, useState } from "react"
import WaveSurfer from "wavesurfer.js"

/**
 * 音频节点的波形。
 *
 * 只画波形 + 一个播放键，不做区间选择/裁剪 —— 那些属于编辑器，
 * 画布上的卡片只要能确认"这段音频是不是我要的"。
 */
export function Waveform({ src }: { src: string }) {
  const host = useRef<HTMLDivElement>(null)
  const ws = useRef<WaveSurfer | null>(null)
  const [playing, setPlaying] = useState(false)
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
    inst.on("play", () => setPlaying(true))
    inst.on("pause", () => setPlaying(false))
    inst.on("finish", () => setPlaying(false))
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

  if (failed) {
    return <div className="p-3 text-center text-xs text-dim">波形解码失败</div>
  }

  return (
    <div className="flex h-full w-full items-center gap-2 px-2">
      <button
        className="shrink-0 rounded border border-line bg-[#262933] px-2 py-1 text-xs hover:border-accent"
        onClick={(e) => {
          e.stopPropagation()
          void ws.current?.playPause()
        }}
        // 卡片本身可拖拽，按钮上要挡住，否则点一下就变成拖了 1px。
        onPointerDown={(e) => e.stopPropagation()}
      >
        {playing ? "⏸" : "▶"}
      </button>
      <div
        ref={host}
        className="min-w-0 flex-1"
        onPointerDown={(e) => e.stopPropagation()}
      />
    </div>
  )
}
