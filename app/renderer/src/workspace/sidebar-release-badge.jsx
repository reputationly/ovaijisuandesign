// sidebar-release-badge.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 } from "../infra/dialog-content.jsx";

export function SidebarReleaseBadge({ compact = false, target, releaseBadge }) {
  if (!target || !releaseBadge) return null;
  if (compact) {
    return releaseBadge.tone === "brand" ? (
      <span
        aria-hidden="true"
        className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-brand-accent ring-1 ring-[var(--topbar-transparent-bg)]"
        data-action-ui-id={`home-sidebar.${target}-release-badge`}
        data-variant="new"
      />
    ) : null;
  }
  if (target === "connectors" && releaseBadge.tone === "brand") {
    return (
      <span
        aria-hidden="true"
        className="home-sidebar-detail size-1.5 shrink-0 rounded-full bg-brand-accent"
        data-action-ui-id="home-sidebar.connectors-release-badge"
        data-variant="new"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn$2(
        "home-sidebar-detail shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
        releaseBadge.tone === "brand"
          ? "bg-brand-accent text-brand-accent-foreground"
          : "bg-muted text-muted-foreground",
      )}
      data-action-ui-id={`home-sidebar.${target}-release-badge`}
      data-variant={releaseBadge.tone === "brand" ? "new" : "beta"}
    >
      {releaseBadge.label}
    </span>
  );
}
