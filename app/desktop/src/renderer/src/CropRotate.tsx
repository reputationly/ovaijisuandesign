import { FlipHorizontal, FlipVertical, RotateCcw, RotateCw, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { assetUrl } from "./api"
import {
  CROP_RATIOS,
  NO_ORIENTATION,
  clampCrop,
  cropForRatio,
  drawTransformed,
  rotateBy,
  transformedName,
  type CropRect,
  type Orientation,
} from "./transform"

/**
 * 裁剪 + 旋转与镜像。官方 `canvas.crop` / `canvas.rotate.title` =「旋转与镜像」。
 *
 * 逻辑在 `transform.ts`,这里只管画和交互。
 *
 * ## 为什么两个功能放一个面板
 *
 * 官方工具条上它们是两个入口，但都进同一个"编辑这张图"的状态 —— 而且
 * **顺序有关**:先裁再转（`drawTransformed` 里那条注释）。做成两个独立
 * 的对话框的话，用户先转后裁时框的是转后的图，而我们按原图坐标裁 ——
 * 裁出来的是另一块地方，还不报错。一个面板里两件事一起确认，顺序就固定了。
 *
 * ## 预览是 CSS transform，落盘是 canvas
 *
 * 预览用 CSS 是为了拖动时跟手（每帧重画一张 1664×928 的 canvas 会卡）;
 * 落盘必须走 canvas —— CSS 只是显示变换，像素并没有真的动。
 */
export function CropRotate({
  assetId,
  name,
  onCancel,
  onSave,
}: {
  assetId: string
  name?: string
  onCancel: () => void
  /** 存成一张新图。**不覆盖原图** —— 原图可能还被别的节点引用着。 */
  onSave: (file: File) => Promise<void>
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [crop, setCrop] = useState<CropRect | null>(null)
  const [o, setO] = useState<Orientation>(NO_ORIENTATION)
  const [ratio, setRatio] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = new Image()
    el.crossOrigin = "anonymous"
    el.onload = () => {
      setImg(el)
      setCrop({ x: 0, y: 0, width: el.naturalWidth, height: el.naturalHeight })
    }
    el.onerror = () => setErr("图片加载不出来，可能是素材关联异常")
    // **走原图不走缩略图。** 裁剪要按真实像素算，拿 512 宽的缩略图裁出来
    // 的框换算回原图会有偏移，而且落盘的分辨率也只有 512。
    el.src = assetUrl(assetId)
  }, [assetId])

  // 换比例时把框重算成该比例下最大的那个。
  useEffect(() => {
    if (!img) return
    setCrop(cropForRatio(img.naturalWidth, img.naturalHeight, ratio))
  }, [ratio, img])

  const save = async () => {
    if (!img || !crop || busy) return
    setBusy(true)
    setErr(null)
    try {
      const canvas = drawTransformed(img, img.naturalWidth, img.naturalHeight, crop, o)
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"))
      if (!blob) throw new Error("导出失败")
      const file = new File(
        [blob],
        transformedName(name, crop, o, img.naturalWidth, img.naturalHeight),
        { type: "image/png" },
      )
      await onSave(file)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  // 拖动裁剪框。**按图片的真实像素算**,不是按屏幕像素 —— 面板里图是缩放
  // 显示的，直接用 clientX 的增量会让框跟不上手。
  const drag = (e: React.PointerEvent) => {
    if (!img || !crop || !boxRef.current) return
    const rect = boxRef.current.getBoundingClientRect()
    const scale = img.naturalWidth / rect.width
    const start = { x: e.clientX, y: e.clientY }
    const from = { ...crop }
    const move = (ev: PointerEvent) => {
      setCrop(
        clampCrop(
          {
            ...from,
            x: from.x + (ev.clientX - start.x) * scale,
            y: from.y + (ev.clientY - start.y) * scale,
          },
          img.naturalWidth,
          img.naturalHeight,
        ),
      )
    }
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  const pct = (v: number, total: number) => `${(v / total) * 100}%`

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col"
      style={{ background: "var(--modal-mask-bg)", backdropFilter: "var(--modal-mask-blur)" }}
      onPointerDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="flex h-12 shrink-0 items-center gap-3 px-4">
        <span className="text-[13px] text-white/80">裁剪 · 旋转与镜像</span>
        <span className="flex-1" />
        <button onClick={onCancel} className="rounded p-1 text-white/70 hover:bg-white/10">
          <X size={16} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-6">
        {img && crop ? (
          <div
            ref={boxRef}
            className="relative max-h-full max-w-full select-none"
            style={{
              // 预览的整体旋转用 CSS —— 拖动时要跟手，每帧重画 canvas 会卡。
              transform: `rotate(${o.degrees}deg) scale(${o.flipH ? -1 : 1}, ${o.flipV ? -1 : 1})`,
              transition: "transform .15s ease-out",
            }}
          >
            <img
              src={img.src}
              alt=""
              draggable={false}
              className="block max-h-[70vh] max-w-full object-contain"
            />
            {/* 框外压暗。**用四条边框而不是一个半透明遮罩** —— 遮罩盖在图上
                会把框内的颜色也带偏一点，而裁剪时用户正是在看颜色。 */}
            <div
              className="absolute cursor-move border-2 border-white"
              onPointerDown={drag}
              style={{
                left: pct(crop.x, img.naturalWidth),
                top: pct(crop.y, img.naturalHeight),
                width: pct(crop.width, img.naturalWidth),
                height: pct(crop.height, img.naturalHeight),
                boxShadow: "0 0 0 9999px rgba(0,0,0,.5)",
              }}
            />
          </div>
        ) : (
          <p className="text-[13px] text-white/60">{err ?? "加载中…"}</p>
        )}
      </div>

      <div className="shrink-0 space-y-3 px-6 pb-5 pt-3">
        {/* 比例。官方裁剪的预设，`null` 是「自由」。 */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {CROP_RATIOS.map((r) => (
            <button
              key={r.label}
              onClick={() => setRatio(r.ratio)}
              className="rounded-full px-2.5 py-1 text-[12px] transition-colors"
              style={{
                background: ratio === r.ratio ? "var(--brand-accent)" : "rgba(255,255,255,.1)",
                color: ratio === r.ratio ? "var(--brand-accent-foreground)" : "rgba(255,255,255,.8)",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* 旋转与镜像。官方 `canvas.rotate.step90` / `flipH` / `flipV`。 */}
        <div className="flex items-center justify-center gap-1.5">
          <Tool title="逆时针 90°" onClick={() => setO((v) => rotateBy(v, -90))}>
            <RotateCcw size={15} />
          </Tool>
          <Tool title="顺时针 90°" onClick={() => setO((v) => rotateBy(v, 90))}>
            <RotateCw size={15} />
          </Tool>
          <Tool title="水平翻转" on={o.flipH} onClick={() => setO((v) => ({ ...v, flipH: !v.flipH }))}>
            <FlipHorizontal size={15} />
          </Tool>
          <Tool title="垂直翻转" on={o.flipV} onClick={() => setO((v) => ({ ...v, flipV: !v.flipV }))}>
            <FlipVertical size={15} />
          </Tool>
          <span className="ml-1 min-w-12 text-[12px] tabular-nums text-white/60">{o.degrees}°</span>
        </div>

        {err && <p className="text-center text-[12px]" style={{ color: "var(--canvas-node-tag-red)" }}>
            {err}
          </p>}

        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-[13px] text-white/80 hover:bg-white/10"
          >
            取消
          </button>
          <button
            onClick={() => void save()}
            disabled={busy || !img}
            className="rounded-lg px-4 py-1.5 text-[13px] transition-opacity enabled:hover:opacity-85 disabled:opacity-40"
            style={{
              background: "var(--brand-accent)",
              color: "var(--brand-accent-foreground)",
            }}
          >
            {/* 官方 `canvas.rotate.save` =「保存」/「保存中」。
                **说清楚是存成新图** —— 不说的话用户会以为原图被改了,
                而原图可能还被别的节点引用着。 */}
            {busy ? "保存中…" : "存为新图"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Tool({
  children,
  title,
  onClick,
  on,
}: {
  children: React.ReactNode
  title: string
  onClick: () => void
  on?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={on}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-lg transition-colors"
      style={{
        background: on ? "var(--brand-accent)" : "rgba(255,255,255,.1)",
        color: on ? "var(--brand-accent-foreground)" : "rgba(255,255,255,.85)",
      }}
    >
      {children}
    </button>
  )
}
