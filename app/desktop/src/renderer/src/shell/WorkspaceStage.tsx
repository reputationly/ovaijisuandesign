import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import { clampChatWidth, useWorkspaceLayout, type Pane } from "../stores/ui"

const PANE_MOTION: CSSProperties = {
  transitionDuration: "320ms",
  transitionProperty: "transform",
  transitionTimingFunction: "cubic-bezier(0.2, 0.9, 0.25, 1.02)",
}

type ViewValue = "split" | "chat" | "canvas"

/**
 * 工作区舞台：对话与画布两栏。
 *
 * - split：对话栏固定宽度（可拖动分隔条调整），画布占满其余；对话可放左或右
 * - focus：只显示一侧，另一侧保持挂载但隐藏——画布和对话的运行状态不因切换而丢失
 */
export function WorkspaceStage({ canvas, chat }: { canvas: ReactNode; chat: ReactNode }) {
  const { t } = useTranslation()
  const { mode, focusPane, chatSide, chatWidth, setMode, setChatSide, setChatWidth } = useWorkspaceLayout()
  const [dragWidth, setDragWidth] = useState<number | null>(null)
  const width = dragWidth ?? chatWidth
  const chatOrder = chatSide === "right" ? 2 : 0
  const canvasOrder = chatSide === "right" ? 0 : 2
  const visible = (p: Pane) => mode === "split" || focusPane === p

  const startRef = useRef({ x: 0, w: 0 })
  const onResizeStart = (e: ReactPointerEvent<HTMLHRElement>) => {
    e.preventDefault()
    startRef.current = { x: e.clientX, w: width }
    document.body.classList.add("workspace-stage-resizing")
    let latest = width
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startRef.current.x
      // 对话在右侧时往左拖是变宽
      latest = clampChatWidth(startRef.current.w + (chatSide === "right" ? -dx : dx))
      setDragWidth(latest)
    }
    const up = () => {
      document.body.classList.remove("workspace-stage-resizing")
      setChatWidth(latest)
      setDragWidth(null)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  const view: ViewValue = mode === "split" ? "split" : focusPane
  const onView = (v: ViewValue) => (v === "split" ? setMode("split") : setMode("focus", v))

  return (
    <div
      className="relative flex min-h-0 min-w-0 flex-1 rounded-xl bg-background elevated-surface-border overflow-hidden"
      data-action-ui-id="workspace-stage"
      data-layout-mode={mode}
      data-physical-pane-order={chatSide === "right" ? "canvas-chat" : "chat-canvas"}
    >
      <section
        className="relative min-h-0 min-w-0"
        data-workspace-pane="chat"
        data-pane-visible={visible("chat")}
        style={{ ...PANE_MOTION, order: chatOrder, flex: mode === "split" ? `0 0 ${width}px` : "1 1 0%", display: visible("chat") ? undefined : "none" }}
      >
        <div className="h-full min-h-0 min-w-0 overflow-hidden bg-card">
          <div className="relative h-full min-h-0 overflow-hidden bg-card">{chat}</div>
        </div>
      </section>
      {mode === "split" ? (
        <div className="relative z-30 h-full w-0 shrink-0" style={{ ...PANE_MOTION, order: 1 }}>
          <span className="pointer-events-none absolute left-1/2 top-0 h-full -translate-x-1/2 bg-border" style={{ width: 0.5 }} />
          <hr
            className="resize-col absolute left-1/2 top-0 z-30 h-full w-[9px] -translate-x-1/2 cursor-col-resize overflow-visible border-0 bg-transparent p-0"
            data-action-ui-id="workspace-stage.resize-handle"
            aria-label={t("a11y.resizeChatCanvas")}
            data-active={dragWidth !== null}
            onPointerDown={onResizeStart}
            onDoubleClick={() => setChatWidth(366)}
          />
        </div>
      ) : null}
      <section
        className="relative min-h-0 min-w-0"
        data-workspace-pane="canvas"
        data-pane-visible={visible("canvas")}
        style={{ ...PANE_MOTION, order: canvasOrder, flex: "1 1 0%", display: visible("canvas") ? undefined : "none" }}
      >
        <div className="h-full min-h-0 min-w-0 overflow-hidden bg-background">
          <div className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">{canvas}</div>
        </div>
      </section>
      <div className="no-drag absolute top-2 z-40 flex h-8 items-center justify-center" data-action-ui-id="workspace-stage.controls" style={chatSide === "right" ? { right: 8 } : { left: 8 }}>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 -mt-0.5 h-7 w-8 rounded-md px-2 text-foreground/65 hover:bg-foreground/[0.06] hover:text-foreground data-[popup-open]:bg-foreground/[0.06] data-[popup-open]:text-foreground"
            data-action-ui-id="workspace.view-mode-menu.stage"
            aria-label={`${t("workspace.layout.label")}: ${t(view === "split" ? "workspace.layout.chatAndCanvas" : view === "chat" ? "workspace.layout.chatOnly" : "workspace.layout.canvasOnly")}`}
          >
            <ViewModeIcon left={visible(chatSide === "left" ? "chat" : "canvas")} right={visible(chatSide === "right" ? "chat" : "canvas")} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuLabel>{t("workspace.layout.view")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={view} onValueChange={(v) => onView(v as ViewValue)}>
              <DropdownMenuRadioItem value="split">{t("workspace.layout.chatAndCanvas")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="chat">{t("workspace.layout.chatOnly")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="canvas">{t("workspace.layout.canvasOnly")}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("workspace.layout.chatPosition")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={chatSide} onValueChange={(v) => setChatSide(v as "left" | "right")}>
              <DropdownMenuRadioItem value="left">{t("workspace.layout.chatLeft")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="right">{t("workspace.layout.chatRight")}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

/** 布局图标：外框内左右两块，哪一侧在显示就画实心 */
function ViewModeIcon({ left, right }: { left: boolean; right: boolean }) {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className="size-4 shrink-0" data-left-active={left} data-right-active={right}>
      <rect x="1.25" y="2.25" width="15.5" height="13.5" rx="3" fill="none" className="stroke-current opacity-65" strokeWidth="1.25" />
      <rect x="2.75" y="3.75" width="5.25" height="10.5" rx="1.5" className={left ? "fill-current opacity-60" : "fill-current opacity-15"} />
      <rect x="10" y="3.75" width="5.25" height="10.5" rx="1.5" className={right ? "fill-current opacity-60" : "fill-current opacity-15"} />
    </svg>
  )
}
