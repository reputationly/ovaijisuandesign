import { Download, Minus, Plus, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

/**
 * 图片灯箱。点开画布上的图片看大图。
 *
 * 结构照官方的 `ImageLightbox`（`data-action-ui-id` 全是
 * `canvas.image-lightbox.*`）：顶部一条 header、左上角缩放三连、中间
 * media-frame、下面 counter 和一排动作按钮、两侧翻页箭头。
 *
 * ## 常量和数学是抄的，不是估的
 *
 * 缩放手感全在这几个数上。自己拍一组的话，滚轮会明显比官方"重"或"飘"，
 * 而这种差别没法用文字描述、只能上手才知道 —— 所以逐个照搬：
 *
 * | 量 | 值 |
 * |---|---|
 * | 最小 / 最大缩放 | 0.5 / 10 |
 * | 按钮每次乘除 | 1.3 |
 * | 滚轮灵敏度 | 0.0018（指数） |
 * | 单次滚轮增量上限 | 120px |
 *
 * 滚轮走的是 `exp(-delta * 灵敏度)` 而不是线性加减：线性的话放大到 8 倍时
 * 再滚一格会直接跳到顶，而缩小时永远到不了底。
 *
 * `deltaMode` 那两个换算（行=16px、页=800px）不能省 —— Firefox 和部分鼠标
 * 驱动报的是行数而不是像素，不换算的话一格滚轮只动 0.000006 倍，表现是
 * "滚轮在这个浏览器里没用"。
 */
const MIN_SCALE = 0.5
const MAX_SCALE = 10
const BUTTON_ZOOM_FACTOR = 1.3
const WHEEL_ZOOM_SENSITIVITY = 0.0018
const MAX_WHEEL_DELTA_PX = 120
const LINE_HEIGHT_PX = 16
const PAGE_HEIGHT_PX = 800
/** 超过这个位移才算拖动而不是点击。没有它，手抖一下就关不掉灯箱。 */
const DRAG_SLOP_PX = 3

export interface LightboxItem {
  /** 大图地址。**不是缩略图** —— 灯箱就是用来看细节的。 */
  url: string
  name?: string
  /** 下载用。没有就退回 url。 */
  downloadUrl?: string
}

function clampScale(s: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))
}

/** 把不同 `deltaMode` 的滚轮增量统一成像素。 */
export function normalizeWheelDeltaY(deltaY: number, deltaMode: number) {
  if (deltaMode === 1) return deltaY * LINE_HEIGHT_PX
  if (deltaMode === 2) return deltaY * PAGE_HEIGHT_PX
  return deltaY
}

/**
 * 滚一格之后的缩放值。
 *
 * 截断到 ±120px：触控板的惯性滚动一帧能报几百像素，不截的话一次轻扫
 * 就从 1 倍冲到 10 倍。
 */
export function wheelZoomScale(current: number, deltaY: number, deltaMode = 0) {
  if (!Number.isFinite(current) || current <= 0) return 1
  const d = normalizeWheelDeltaY(deltaY, deltaMode)
  const clamped = Math.max(-MAX_WHEEL_DELTA_PX, Math.min(MAX_WHEEL_DELTA_PX, d))
  return clampScale(current * Math.exp(-clamped * WHEEL_ZOOM_SENSITIVITY))
}

/** Cmd/Ctrl+C。带 Alt 的不算 —— 那是别的快捷键。 */
export function isCopyShortcut(e: { metaKey: boolean; ctrlKey: boolean; altKey: boolean; code: string }) {
  return (e.metaKey || e.ctrlKey) && !e.altKey && e.code === "KeyC"
}

/**
 * 转成 png。剪贴板 API 只认 png —— 直接写 jpeg/webp 会抛
 * `NotAllowedError`，而那条错误信息完全看不出是格式的问题。
 */
async function toPng(url: string): Promise<Blob | null> {
  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const el = new Image()
    el.crossOrigin = "anonymous"
    el.onload = () => resolve(el)
    el.onerror = () => resolve(null)
    el.src = url
  })
  if (!img) return null
  const c = document.createElement("canvas")
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  c.getContext("2d")?.drawImage(img, 0, 0)
  return new Promise((resolve) => c.toBlob(resolve, "image/png"))
}

export function Lightbox({
  items,
  index,
  onIndexChange,
  onClose,
}: {
  items: LightboxItem[]
  index: number
  onIndexChange: (next: number) => void
  onClose: () => void
}) {
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [transitioning, setTransitioning] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const translateAtStart = useRef({ x: 0, y: 0 })
  const didDrag = useRef(false)
  // 滚轮回调要读最新的缩放和位移，但它挂在原生监听器上、闭包是建立时那一份。
  const scaleRef = useRef(scale)
  const translateRef = useRef(translate)
  scaleRef.current = scale
  translateRef.current = translate

  const total = items.length
  const multi = total > 1
  const current = items[index]

  const goPrev = useCallback(() => {
    if (total <= 1) return
    onIndexChange((index - 1 + total) % total)
  }, [index, total, onIndexChange])
  const goNext = useCallback(() => {
    if (total <= 1) return
    onIndexChange((index + 1) % total)
  }, [index, total, onIndexChange])

  // 换图时缩放归位。不归位的话，上一张放大到 6 倍会带到下一张上，
  // 而下一张的尺寸可能完全不同 —— 打开就是一片色块。
  useEffect(() => {
    setScale(1)
    setTranslate({ x: 0, y: 0 })
    setTransitioning(false)
  }, [index, current?.url])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onClose()
        return
      }
      if (!multi) return
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        e.stopPropagation()
        goPrev()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        e.stopPropagation()
        goNext()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [multi, goPrev, goNext, onClose])

  // Cmd/Ctrl+C 复制当前这张。官方同时挂了快捷键和 `copy` 事件 ——
  // 只挂 copy 事件的话，焦点不在文档上时（比如刚点过按钮）浏览器不发它。
  const copyImage = useCallback(async () => {
    const url = current?.url
    if (!url) return
    try {
      const blob = await fetch(url).then((r) => r.blob())
      // 剪贴板只认 png。jpeg/webp 直接写会抛 NotAllowedError，
      // 而那个错误信息完全看不出是格式问题。
      const png =
        blob.type === "image/png" ? blob : await toPng(url).catch(() => null)
      if (!png) return
      await navigator.clipboard.write([new ClipboardItem({ "image/png": png })])
    } catch {
      /* 没有剪贴板权限时静默 —— 复制失败不该弹东西打断看图 */
    }
  }, [current?.url])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isCopyShortcut(e)) return
      e.preventDefault()
      e.stopPropagation()
      void copyImage()
    }
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      void copyImage()
    }
    document.addEventListener("keydown", onKey, true)
    document.addEventListener("copy", onCopy, true)
    return () => {
      document.removeEventListener("keydown", onKey, true)
      document.removeEventListener("copy", onCopy, true)
    }
  }, [copyImage])

  // 滚轮必须用原生监听器且 passive:false。React 的 onWheel 是 passive 的，
  // 里面 preventDefault() 不生效 —— 表现是缩放正常但**整个页面跟着滚**。
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left - rect.width / 2
      const cy = e.clientY - rect.top - rect.height / 2
      const prev = scaleRef.current
      const next = wheelZoomScale(prev, e.deltaY, e.deltaMode)
      if (next === prev) return
      // 以光标为锚点缩放：光标下的那个点缩放前后停在原地。
      // 不做这步的话图像总是围绕中心涨缩，放大后想看的角落会跑出画面。
      const ratio = 1 - next / prev
      const tx = translateRef.current.x + (cx - translateRef.current.x) * ratio
      const ty = translateRef.current.y + (cy - translateRef.current.y) * ratio
      setScale(next)
      // 缩回 1 倍以内就把位移清零，否则图会歪在一边而且推不回来。
      setTranslate(next <= 1 ? { x: 0, y: 0 } : { x: tx, y: ty })
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  useEffect(() => {
    if (!transitioning) return
    const t = setTimeout(() => setTransitioning(false), 200)
    return () => clearTimeout(t)
  }, [transitioning])

  const zoomIn = (e: React.MouseEvent) => {
    e.stopPropagation()
    setTransitioning(true)
    setScale((s) => Math.min(MAX_SCALE, s * BUTTON_ZOOM_FACTOR))
  }
  const zoomOut = (e: React.MouseEvent) => {
    e.stopPropagation()
    setTransitioning(true)
    setScale((s) => {
      const next = Math.max(MIN_SCALE, s / BUTTON_ZOOM_FACTOR)
      if (next <= 1) {
        setTranslate({ x: 0, y: 0 })
        return 1
      }
      return next
    })
  }
  const resetZoom = (e: React.MouseEvent) => {
    e.stopPropagation()
    setTransitioning(true)
    setScale(1)
    setTranslate({ x: 0, y: 0 })
  }

  /** 双击在「适应窗口」和「原始像素 1:1」之间切。 */
  const onDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setTransitioning(true)
    if (scale === 1) {
      const img = imgRef.current
      if (!img || !img.width) return
      setScale(clampScale(img.naturalWidth / img.width))
    } else {
      setScale(1)
    }
    setTranslate({ x: 0, y: 0 })
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    dragging.current = true
    didDrag.current = false
    dragStart.current = { x: e.clientX, y: e.clientY }
    translateAtStart.current = { ...translateRef.current }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    if (Math.abs(dx) > DRAG_SLOP_PX || Math.abs(dy) > DRAG_SLOP_PX) didDrag.current = true
    setTranslate({ x: translateAtStart.current.x + dx, y: translateAtStart.current.y + dy })
  }
  const onPointerUp = (e: React.PointerEvent) => {
    dragging.current = false
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
  }

  if (!current) return null

  const download = (e: React.MouseEvent) => {
    e.stopPropagation()
    const a = document.createElement("a")
    a.href = current.downloadUrl ?? current.url
    a.download = current.name ?? ""
    a.click()
  }

  return (
    // 点背景关闭。**但拖动过就不关** —— 放大后拖着看细节，松手落在背景上
    // 会把灯箱关掉，那是这类组件最恼人的一个 bug。
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(0,0,0,.82)", backdropFilter: "blur(2px)" }}
      onClick={() => {
        if (!didDrag.current) onClose()
      }}
    >
      <div
        data-action-ui-id="canvas.image-lightbox.header"
        className="flex h-12 shrink-0 items-center justify-center px-3"
      >
        <div
          data-action-ui-id="canvas.image-lightbox.zoom-controls"
          className="absolute left-3 flex items-center gap-1 rounded-lg px-1 py-1 backdrop-blur-sm"
          style={{ background: "rgba(255,255,255,.08)" }}
        >
          <IconBtn onClick={zoomOut} title="缩小" id="canvas.image-lightbox.zoom-out">
            <Minus size={15} />
          </IconBtn>
          <button
            data-action-ui-id="canvas.image-lightbox.zoom-reset"
            onClick={resetZoom}
            title="还原"
            className="min-w-11 rounded px-1 text-[12px] text-white/80 tabular-nums hover:bg-white/10"
          >
            {Math.round(scale * 100)}%
          </button>
          <IconBtn onClick={zoomIn} title="放大" id="canvas.image-lightbox.zoom-in">
            <Plus size={15} />
          </IconBtn>
          {/* 官方**只有百分比这一个重置入口**（`canvas.image-lightbox.zoom-reset`
              就挂在那个数字上）。这里原本还有一个圆箭头按钮，和百分比做的是
              同一件事、还共用同一个动作 id —— 两个不同图标的按钮做同一件事，
              用户会以为其中一个是别的功能。 */}
        </div>
        <span className="truncate text-[13px] text-white/70">{current.name}</span>
        <IconBtn
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          title="关闭"
          id="canvas.image-lightbox.close"
          className="absolute right-3"
        >
          <X size={17} />
        </IconBtn>
      </div>

      <div
        ref={containerRef}
        data-action-ui-id="canvas.image-lightbox.media-frame"
        className="relative z-0 min-h-0 flex-1 overflow-hidden"
        style={{ cursor: scale > 1 ? "grab" : "default" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        <div className="flex h-full w-full items-center justify-center">
          <img
            ref={imgRef}
            src={current.url}
            alt={current.name ?? ""}
            draggable={false}
            className="max-h-full max-w-full select-none object-contain"
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transition: transitioning ? "transform .2s ease-out" : "none",
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {multi && (
          <>
            <NavBtn side="left" onClick={goPrev} id="canvas.image-lightbox.prev" />
            <NavBtn side="right" onClick={goNext} id="canvas.image-lightbox.next" />
          </>
        )}
      </div>

      <div className="shrink-0 pb-4">
        {multi && (
          <p
            data-action-ui-id="canvas.image-lightbox.counter"
            className="mb-3 text-center text-[12px] text-white/60 tabular-nums"
          >
            {index + 1} / {total} 张
          </p>
        )}
        <div
          data-action-ui-id="canvas.image-lightbox.actions"
          className="flex items-center justify-center"
        >
          <div
            data-action-ui-id="canvas.image-lightbox.action-group"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 backdrop-blur-sm"
            style={{ background: "rgba(255,255,255,.08)" }}
          >
            <TextBtn onClick={download} id="canvas.image-lightbox.download">
              <Download size={14} /> 下载
            </TextBtn>
            {/* 官方这排还有「在文件夹中显示」「设为主图」「独立展示」
                「全部下载」。**这里一个都不放。**

                - 在文件夹中显示：要 Tauri 的 opener 插件，桌面端还没装。
                - 设为主图 / 独立展示 / 全部下载：都是多图节点的操作，
                  我们还没有多图节点。

                放一个点了没反应的按钮比没有这个按钮更糟 —— 用户会以为
                功能坏了，而不是还没做。 */}
          </div>
        </div>
      </div>
    </div>
  )
}

function IconBtn({
  children,
  onClick,
  title,
  id,
  className = "",
}: {
  children: React.ReactNode
  onClick: (e: React.MouseEvent) => void
  title: string
  id: string
  className?: string
}) {
  return (
    <button
      data-action-ui-id={id}
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded text-white/80 hover:bg-white/10 ${className}`}
    >
      {children}
    </button>
  )
}

function TextBtn({
  children,
  onClick,
  id,
}: {
  children: React.ReactNode
  onClick: (e: React.MouseEvent) => void
  id: string
}) {
  return (
    <button
      data-action-ui-id={id}
      onClick={onClick}
      className="flex items-center gap-1.5 rounded px-2 py-1 text-[12px] text-white/80 hover:bg-white/10"
    >
      {children}
    </button>
  )
}

function NavBtn({
  side,
  onClick,
  id,
}: {
  side: "left" | "right"
  onClick: () => void
  id: string
}) {
  return (
    <button
      data-action-ui-id={id}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`absolute top-1/2 ${side === "left" ? "left-4" : "right-4"} flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white/80 backdrop-blur-sm hover:bg-white/20`}
      style={{ background: "rgba(255,255,255,.1)" }}
      title={side === "left" ? "上一张" : "下一张"}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  )
}
