// connector-relationship-graphic.jsx
import {
  dedupedToast,
  jsxRuntimeExports,
  Link2,
  reactExports,
  ShieldAlert,
  useTranslation,
  X$7 as X,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
import { cdnRegionalImage } from "../workspace/topbar-state-context.jsx";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { HubLogo } from "../infra/hub-logo.jsx";
import { HubWordmark } from "../infra/inline-rename-input.jsx";
import { TOAST_DURATION_MS, TOAST_ID } from "./request-prompt-prefill.jsx";
const CDN_CONNECTOR_HUB = cdnRegionalImage({
  domestic: "connector-hub-512-283b2f4fd24a.png",
  overseas: "connector-hub-512-283b2f4fd24a.png",
});
function ProxyToastContent({ onDismiss }) {
  const { t: t2 } = useTranslation();
  return (
    <div className="elevated-surface-border-width flex items-start gap-3 w-full rounded-lg border-yellow-500/30 bg-popover p-4 text-popover-foreground shadow-lg">
      <ShieldAlert className="size-5 text-yellow-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {t2("proxy.toastTitle", "Proxy / VPN detected")}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t2(
            "proxy.toastDescription",
            "A system proxy or VPN is active. This may cause connection issues. For best experience, add MiniMax Design to your proxy bypass list or disable the proxy while using MiniMax Design.",
          )}
        </p>
      </div>
      <button
        type="button"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={onDismiss}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
export function showProxyToast(onDismiss) {
  dedupedToast.custom(() => <ProxyToastContent onDismiss={onDismiss} />, {
    duration: TOAST_DURATION_MS,
    id: TOAST_ID,
  });
}
const FRAME_CLASS = {
  inline: "size-4 rounded-sm bg-transparent",
  list: "size-6 rounded-sm bg-muted/40",
  card: "size-10 rounded-lg bg-muted",
  detail: "size-12 rounded-lg bg-muted p-0.5",
};
const IMAGE_CLASS = {
  inline: "size-full rounded-sm",
  list: "size-5 rounded-sm",
  card: "size-8 rounded-sm",
  detail: "size-full rounded-sm",
};
const FALLBACK_SIZE = {
  inline: 12,
  list: 14,
  card: 20,
  detail: 24,
};
export function ConnectorIcon({
  iconUrl,
  size: size2 = "list",
  className,
  fallback,
}) {
  const [failedUrl, setFailedUrl] = reactExports.useState(null);
  const showImage = Boolean(iconUrl && failedUrl !== iconUrl);
  return (
    <span
      data-slot="connector-icon"
      data-connector-icon-size={size2}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden text-muted-foreground",
        FRAME_CLASS[size2],
        className,
      )}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          key={iconUrl}
          src={iconUrl ?? void 0}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className={cn("object-contain", IMAGE_CLASS[size2])}
          onError={() => setFailedUrl(iconUrl ?? null)}
        />
      ) : (
        (fallback ?? <Link2 size={FALLBACK_SIZE[size2]} strokeWidth={1.5} />)
      )}
    </span>
  );
}
export function ConnectorRelationshipGraphic({ targetIconUrl, className }) {
  return (
    <div
      className={cn("flex shrink-0 items-center gap-1.5", className)}
      aria-hidden="true"
      data-layout-slot="connector-relationship"
    >
      <span className="contents" data-layout-slot="connector-source-icon">
        <ConnectorIcon iconUrl={CDN_CONNECTOR_HUB} size="detail" />
      </span>
      <span
        className="flex shrink-0 items-center gap-1"
        data-layout-slot="connector-link-dots"
      >
        <span className="size-1.5 rounded-full bg-muted-foreground/40" />
        <span className="size-1 rounded-full bg-muted-foreground/40" />
        <span className="size-1 rounded-full bg-muted-foreground/40" />
      </span>
      <span
        className="mx-1 flex size-7 items-center justify-center rounded-full bg-secondary text-muted-foreground"
        data-layout-slot="connector-link-icon"
      >
        <Icon icon={Link2} size="sm" strokeWidth={1.7} aria-hidden={true} />
      </span>
      <span
        className="flex shrink-0 items-center gap-1"
        data-layout-slot="connector-link-dots"
      >
        <span className="size-1 rounded-full bg-muted-foreground/40" />
        <span className="size-1 rounded-full bg-muted-foreground/40" />
        <span className="size-1.5 rounded-full bg-muted-foreground/40" />
      </span>
      <span className="contents" data-layout-slot="connector-target-icon">
        <ConnectorIcon iconUrl={targetIconUrl} size="detail" />
      </span>
    </div>
  );
}
export function HubBrandLine({
  logoSize = 28,
  showSubtitle = true,
  className,
}) {
  const { t: t2 } = useTranslation();
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <HubLogo size={logoSize} className="shrink-0" />
      <h1 className="flex items-center gap-2 font-heading text-xl font-medium leading-none text-foreground">
        <HubWordmark width={158} height={24} />
        {showSubtitle && (
          <>
            <span aria-hidden={true} className="text-foreground/40">
              —
            </span>
            <span className="whitespace-nowrap text-foreground/85">
              {t2("home.heroSubtitle")}
            </span>
          </>
        )}
      </h1>
    </div>
  );
}
