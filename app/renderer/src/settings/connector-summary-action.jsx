// connector-summary-action.jsx
import { KeyRound, Link2, Loader2, MessageCircle } from "../vendor.js";
import { Download } from "../media-editing/package.jsx";
import { RetryIcon } from "../workspace/use-prompt-icon.jsx";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { IntegrationActionButton } from "./use-im-accounts.jsx";
import { cn$2 } from "../infra/dialog-content.jsx";

export function ConnectorDetailNotice({
  description,
  tone = "neutral",
  actionUiId,
}) {
  return (
    <div
      role={tone === "error" ? "alert" : void 0}
      className={cn$2(
        "rounded-md bg-secondary px-2.5 py-1.5",
        tone === "warning" && "bg-warning/10",
        tone === "error" ? "text-left" : "text-center",
      )}
      data-action-ui-id={actionUiId}
      data-layout-slot="connector-detail-notice"
      data-notice-tone={tone}
    >
      <p
        className={cn$2(
          "min-w-0 text-[13px] leading-relaxed text-foreground/70",
          tone === "warning" && "text-warning-foreground",
          tone === "error" && "text-destructive",
        )}
      >
        {description}
      </p>
    </div>
  );
}

export function ConnectorSetupSection({
  title,
  headerAction,
  children: children2,
  actionUiId,
  className,
}) {
  return (
    <section
      className={cn$2("w-full text-left", className)}
      data-action-ui-id={actionUiId}
      data-layout-slot="connector-detail-setup-section"
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h3 className="min-w-0 font-heading text-sm font-medium text-foreground">
          {title}
        </h3>
        {headerAction}
      </div>
      <div className="mt-3 min-w-0">{children2}</div>
    </section>
  );
}

const connectorSummaryActionVisual = {
  authorize: {
    icon: KeyRound,
    variant: "default",
  },
  connect: {
    icon: Link2,
    variant: "default",
  },
  install: {
    icon: Download,
    variant: "default",
  },
  reinstall: {
    icon: RetryIcon,
    variant: "outline",
  },
  try: {
    icon: MessageCircle,
    variant: "default",
  },
  update: {
    icon: Download,
    variant: "outline",
  },
};

export function ConnectorSummaryAction({
  mode: mode2,
  label,
  loading = false,
  disabled: disabled2,
  ...props
}) {
  const visual = connectorSummaryActionVisual[mode2];
  const actionIcon = loading ? Loader2 : visual.icon;
  return (
    <IntegrationActionButton
      variant={visual.variant}
      disabled={disabled2 || loading}
      aria-busy={loading || void 0}
      leadingIcon={
        <span
          aria-hidden="true"
          className="flex size-3.5 shrink-0 items-center justify-center"
          data-layout-slot="connector-summary-action-icon"
        >
          <Icon
            icon={actionIcon}
            size="sm"
            strokeWidth={1.5}
            className={loading ? "animate-spin" : void 0}
            aria-hidden={true}
          />
        </span>
      }
      data-connector-summary-action-mode={mode2}
      {...props}
    >
      {label}
    </IntegrationActionButton>
  );
}
