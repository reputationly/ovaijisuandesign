import { Handle, Position, useReactFlow } from "@xyflow/react"
import { useCallback, useEffect, useRef } from "react"

/**
 * 连接点。**照官方的 `MagneticHandleInner` 实现**，这是他们画布上手感最
 * 明显的一处：鼠标靠近节点侧边时，一个 ⊕ 图标浮出来并**跟着鼠标磁吸移动**，
 * 移开就弹回去。
 *
 * 我们之前是 xyflow 默认的 9px 小圆点，几乎点不到 —— 这正是"很难找到连线
 * 的地方"的原因。
 *
 * 官方的实际参数（全部从他们代码里读的）：
 *
 * ```text
 * 感应区        84 x 84，圆形，贴在节点左/右边缘，top-1/2 -translate-y-1/2
 * 图标          30x30 svg，viewBox 0 0 20 20，circle r=9 + 十字，stroke 1.5
 * 静止位移      左侧 translate(15px) / 右侧 translate(-15px)，藏在节点里
 * 出现          .group:hover 时 opacity 1 + translate(0)
 * 磁吸范围      向外 42px、向内 26px、上下各 42px（超出就弹回）
 * 跟手          transform: translate(rawDx, dy)，dx/dy 都除以 zoom
 * 入场曲线      transform 0.25s cubic-bezier(0.34, 1.8, 0.64, 1)
 * 回弹曲线      transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)
 * ```
 *
 * **入场后 250ms 把 transition 设成 none** —— 不这么做的话，跟手移动的每一
 * 帧都要走一次过渡，图标会黏在鼠标后面拖着走，手感是"重"的。
 *
 * 官方在这里留了一条性能注释，照抄进来：
 *
 * > NO `will-change-transform` here. The zone's `-translate-y-1/2` is static
 * > (only the inner `.node-handle-plus` transitions), so the hint bought
 * > nothing — but it permanently promoted every handle zone to its own
 * > compositor layer (~570 layers on a 500-node canvas), inflating every
 * > Layerize pass during node drags.
 *
 * 也就是：**别给感应区加 `will-change`**。它不动，加了只会让 500 个节点的
 * 画布凭空多出 570 个合成层，拖动时每一帧的 Layerize 都变慢。
 */

const MAGNETIC_OUTWARD = 42
const MAGNETIC_INWARD = 26
const MAGNETIC_VERTICAL = 42
const TRANSITION_SPRING = "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
const TRANSITION_ENTRY = "transform 0.25s cubic-bezier(0.34, 1.8, 0.64, 1)"

function HandleIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 20 20" fill="none" className="node-handle-icon" aria-hidden>
      <circle
        cx="10"
        cy="10"
        r="9"
        stroke="var(--canvas-handle, #919191)"
        strokeWidth="1.5"
        fill="var(--canvas-handle-bg, transparent)"
      />
      <path
        d="M10 6v8M6 10h8"
        stroke="var(--canvas-handle, #919191)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function MagneticHandle({
  position,
  selected,
  hidden,
  onAdd,
}: {
  position: Position.Left | Position.Right
  selected?: boolean
  /** 多选或拖动时强制隐藏 —— 否则拖着节点走会有个圆圈一直跟着跳。 */
  hidden?: boolean
  onAdd?: (screenX: number, screenY: number) => void
}) {
  const side = position === Position.Left ? "left" : "right"
  const iconRef = useRef<HTMLDivElement | null>(null)
  const centerRef = useRef<{ x: number; y: number } | null>(null)
  const activeRef = useRef(false)
  const firstMoveRef = useRef(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const zoomRef = useRef(1)
  const flow = useReactFlow()

  const onMouseMove = useCallback((e: MouseEvent) => {
    const icon = iconRef.current
    const center = centerRef.current
    if (!icon || !center || !activeRef.current) return
    const z = zoomRef.current
    const rawDx = (e.clientX - center.x) / z
    // 向内和向外的容差不同：向外 42、向内只有 26 —— 手往节点里走的时候
    // 图标不该跟太深，否则会压在内容上。
    const dx = side === "left" ? -rawDx : rawDx
    const dy = (e.clientY - center.y) / z
    if (dx < -MAGNETIC_INWARD || dx > MAGNETIC_OUTWARD || Math.abs(dy) > MAGNETIC_VERTICAL) {
      icon.style.transition = TRANSITION_SPRING
      icon.style.transform = "translate(0px, 0px)"
      return
    }
    if (firstMoveRef.current) {
      icon.style.transition = TRANSITION_ENTRY
      firstMoveRef.current = false
      // 入场动画走完就把过渡关掉，之后每一帧直接跟手。留着过渡的话图标会
      // 黏在鼠标后面拖着走，手感是"重"的。
      timerRef.current = setTimeout(() => {
        if (iconRef.current) iconRef.current.style.transition = "none"
      }, 250)
    }
    icon.style.transform = `translate(${rawDx}px, ${dy}px)`
  }, [side])

  const onEnter = useCallback(() => {
    const icon = iconRef.current
    if (!icon) return
    zoomRef.current = flow.getViewport().zoom
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    icon.style.transition = "none"
    icon.style.transform = "translate(0px, 0px)"
    const r = icon.getBoundingClientRect()
    centerRef.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    firstMoveRef.current = true
    activeRef.current = true
    window.removeEventListener("mousemove", onMouseMove)
    window.addEventListener("mousemove", onMouseMove)
  }, [flow, onMouseMove])

  const onLeave = useCallback(() => {
    const icon = iconRef.current
    if (icon) {
      icon.style.transition = TRANSITION_SPRING
      icon.style.transform = "translate(0px, 0px)"
      // 回弹走完再把内联样式清掉，交还给 CSS —— 立刻清的话会从当前位置
      // 瞬移回原位，看不到回弹。
      timerRef.current = setTimeout(() => {
        if (iconRef.current) {
          iconRef.current.style.transition = ""
          iconRef.current.style.transform = ""
        }
      }, 400)
    }
    centerRef.current = null
    activeRef.current = false
    window.removeEventListener("mousemove", onMouseMove)
  }, [onMouseMove])

  useEffect(
    () => () => {
      window.removeEventListener("mousemove", onMouseMove)
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [onMouseMove],
  )

  return (
    <Handle
      type={side === "left" ? "target" : "source"}
      position={position}
      // 官方的 `HANDLE_BASE` / `HANDLE_TARGET`：**0x0 的点**，
      // `overflow: visible` 让 84x84 的感应区作为子元素溢出来照样可见可点。
      //
      // 目标端 `pointerEvents: none` —— 它不接受拖拽，让位给源端那个 ⊕。
      style={{
        width: 0,
        height: 0,
        minWidth: 0,
        minHeight: 0,
        padding: 0,
        background: "transparent",
        border: "none",
        borderRadius: 0,
        overflow: "visible",
        zIndex: 20,
        ...(side === "left" ? { pointerEvents: "none" as const } : {}),
      }}
    >
      {/*
        感应区**是 Handle 的孩子，不是兄弟**。这是整件事的关键。

        做成兄弟的话：⊕ 可见时拿到 `pointer-events: auto`（见 styles.css），
        它把指针吃掉，而它不是 Handle —— xyflow 收不到 pointerdown，
        于是这次拖拽掉给画布变成了平移。表现是"圆圈能点，但拉不出线"。

        当成孩子之后：按在 ⊕ 上就是按在 Handle 上，xyflow 正常起连线；
        `onClick` 仍然落在这个 div 上，用来开「添加节点」菜单。

        注意**不加 will-change**，理由见文件头的注释。
      */}
      <div
        data-action-ui-id="canvas.node-handle-plus"
        className={`absolute top-1/2 ${
          side === "left" ? "right-0" : "left-0"
        } flex h-[84px] w-[84px] -translate-y-1/2 items-center justify-center rounded-full`}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onClick={(e) => {
          e.stopPropagation()
          const r = iconRef.current?.getBoundingClientRect()
          if (r) onAdd?.(r.left + r.width / 2, r.top + r.height / 2)
        }}
      >
        <div
          ref={iconRef}
          className={[
            "node-handle-plus",
            side === "left" ? "node-handle-plus-left" : "node-handle-plus-right",
            selected ? "node-handle-plus-visible" : "",
            hidden ? "node-handle-plus-force-hidden" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <HandleIcon />
        </div>
      </div>
    </Handle>
  )
}
