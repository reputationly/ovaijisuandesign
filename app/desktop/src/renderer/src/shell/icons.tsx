import type { SVGProps } from "react"

/** 侧栏开合按钮：外框 + 左侧实心块；收起时实心块变淡 */
export function PanelToggleIcon({ active = true, side = "left", ...rest }: SVGProps<SVGSVGElement> & { active?: boolean; side?: "left" | "right" }) {
  const x = side === "left" ? 2.75 : 10
  return (
    <svg viewBox="0 0 18 18" width={16} height={16} aria-hidden="true" data-panel-side={side} data-panel-active={active} {...rest}>
      <rect x="1.25" y="2.25" width="15.5" height="13.5" rx="3" fill="none" className="stroke-current opacity-65" strokeWidth="1.25" />
      <rect x={x} y="3.75" width="5.25" height="10.5" rx="1.5" className={active ? "fill-current opacity-60" : "fill-current opacity-20"} />
    </svg>
  )
}

/** 竖排三点，用在「更多」「排序」这类小按钮上 */
export function DotsVerticalIcon({ size = 16, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  )
}
