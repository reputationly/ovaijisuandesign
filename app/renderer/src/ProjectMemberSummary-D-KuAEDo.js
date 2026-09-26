import { r as reactExports, j as jsxRuntimeExports, aq as AvatarGroup, ar as Avatar, as as AvatarImage, at as AvatarFallback, au as cn, av as ChevronDown } from "./main.jsx";
const AVATAR_PALETTE = [
  {
    bg: "bg-[color:color-mix(in_srgb,var(--brand-accent)_22%,var(--card))]",
    fg: "text-[color:color-mix(in_srgb,var(--brand-accent)_70%,var(--foreground))]"
  },
  {
    bg: "bg-[color:color-mix(in_srgb,var(--info)_22%,var(--card))]",
    fg: "text-[color:color-mix(in_srgb,var(--info)_70%,var(--foreground))]"
  },
  {
    bg: "bg-[color:color-mix(in_srgb,var(--success)_22%,var(--card))]",
    fg: "text-[color:color-mix(in_srgb,var(--success)_70%,var(--foreground))]"
  },
  {
    bg: "bg-[color:color-mix(in_srgb,var(--warning)_22%,var(--card))]",
    fg: "text-[color:color-mix(in_srgb,var(--warning)_70%,var(--foreground))]"
  },
  {
    bg: "bg-[color:color-mix(in_srgb,var(--destructive)_20%,var(--card))]",
    fg: "text-[color:color-mix(in_srgb,var(--destructive)_65%,var(--foreground))]"
  }
];
function stableHash(input) {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = hash * 33 ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}
function memberAvatarColors(key) {
  const idx = stableHash(key || "anonymous") % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[idx] ?? AVATAR_PALETTE[0];
}
function useWindowedList(items, pageSize, resetKey) {
  const [visibleCount, setVisibleCount] = reactExports.useState(pageSize);
  const [lastResetKey, setLastResetKey] = reactExports.useState(resetKey);
  const sentinelRef = reactExports.useRef(null);
  if (!Object.is(lastResetKey, resetKey)) {
    setLastResetKey(resetKey);
    setVisibleCount(pageSize);
  }
  const visibleItems = reactExports.useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = items.length > visibleCount;
  const reset = reactExports.useCallback(() => setVisibleCount(pageSize), [pageSize]);
  reactExports.useEffect(() => {
    if (!hasMore || typeof IntersectionObserver === "undefined") return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setVisibleCount((previous) => previous + pageSize);
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, pageSize]);
  return { visibleItems, hasMore, sentinelRef, reset };
}
const VISIBLE_MEMBER_LIMIT = 2;
const ProjectMemberSummary = reactExports.forwardRef(
  function ProjectMemberSummary2({ members, label, ariaLabel, ...buttonProps }, ref) {
    if (members.length === 0) return null;
    const visible = members.slice(0, VISIBLE_MEMBER_LIMIT);
    const overflow = members.length - VISIBLE_MEMBER_LIMIT;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        ref,
        type: "button",
        "aria-label": ariaLabel,
        className: "flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-foreground/[0.06] pl-1 pr-2 text-[12px] text-muted-foreground transition-colors hover:bg-foreground/[0.1] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
        "data-action-ui-id": "project-detail.members",
        ...buttonProps,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(AvatarGroup, { children: [
            visible.map((member) => {
              const palette = memberAvatarColors(member.userId || member.nickname);
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(Avatar, { className: "size-6", children: [
                member.avatarUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarImage, { src: member.avatarUrl, alt: "" }) : null,
                /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarFallback, { className: cn("text-[10px] font-medium", palette.bg, palette.fg), children: member.nickname.charAt(0).toUpperCase() || "?" })
              ] }, member.userId);
            }),
            overflow > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { className: "size-6", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AvatarFallback, { className: "bg-muted text-[10px] font-medium tabular-nums text-muted-foreground", children: [
              "+",
              overflow
            ] }) }) : null
          ] }),
          label ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tabular-nums whitespace-nowrap", children: label }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 12, strokeWidth: 1.75, "aria-hidden": "true" })
        ]
      }
    );
  }
);
export {
  ProjectMemberSummary as P,
  memberAvatarColors as m,
  useWindowedList as u
};
