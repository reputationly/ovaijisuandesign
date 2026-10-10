// icon-opacity-preview-section.jsx
import { useTranslation, reactExports, jsxRuntimeExports, Button$3 as Button$2, LoaderCircle$1 as LoaderCircle, cva, CloudOff$1 as CloudOff, Minus, CompositedSvg, Globe, Brain$2 as Brain, Pin, Smartphone, Globe2, ArrowLeft, RotateCw, Settings2$1 as Settings2, Users$1 as Users, FolderOpen$1 as FolderOpen, Folder$1 as Folder, ChevronDown$1 as ChevronDown, ChevronRight$2 as ChevronRight, ArrowUpRight$1 as ArrowUpRight, Plus$1 as Plus, Library$1 as Library, Workflow$1 as Workflow, MonochromeIcon, Pin$1, Search$1 as Search, Copy$1 as Copy, ThumbsUp$1 as ThumbsUp } from "../vendor.js";
import { Button as Button$1, cn$2 as cn, TooltipContent, Dialog, DialogContent, DialogHeader } from "../infra/dialog-content.jsx";
import { CanvasLoadError } from "../canvas/canvas-load-error.jsx";
import { CircleUserRound, HardDrive, Megaphone, PencilLine, RotateIcon, Rotate90Icon, FlipHorizontalIcon, FlipVerticalIcon } from "../media-editing/package.jsx";
import { Icon, TooltipProvider, Tooltip, TooltipTrigger, MoreVerticalIcon } from "../vendor-inline/vscode-base/graph.jsx";
import { GLOBAL_SIDEBAR_RAIL_WIDTH } from "../workspace/set-home-widget-dev-preview-mode.js";
import { SidebarReleaseBadge } from "../workspace/sidebar-release-badge.jsx";
import { ContextMenu } from "../workspace/topbar-state-context.jsx";
import { ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from "../workspace/context-menu-content.jsx";
import { PluginIcon } from "../workspace/home-service.jsx";
import { SidebarNavButton } from "../workspace/sidebar-nav-button.jsx";
import { RecentProjectGroupHeader } from "../settings/recent-project-group-header.jsx";
import { RetryIcon } from "../workspace/use-prompt-icon.jsx";
import { CanvasToolbarExtensionButton } from "../canvas/canvas-toolbar-extension-button.jsx";
import { CanvasLabelIcon } from "../canvas/use-inline-rename.jsx";
import { ParamsChip } from "../generation/params-chip.jsx";
import { useTheme } from "../generation/use-model-catalog-scope-key.js";
import { DialogTitle, DialogDescription } from "../infra/badge-variants.jsx";
import {
  readPageIconDiagnostics,
  OpacitySampleCell,
} from "./opacity-sample-cell.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
function PageIconDiagnosticsSection({ revision }) {
  const { t } = useTranslation();
  const [icons, setIcons] = reactExports.useState([]);
  const handleRefresh = reactExports.useCallback(
    () => setIcons(readPageIconDiagnostics()),
    [],
  );
  reactExports.useEffect(() => {
    const id = requestAnimationFrame(handleRefresh);
    return () => cancelAnimationFrame(id);
  }, [handleRefresh, revision]);
  return (
    <section
      className="mb-4 rounded-lg border border-border bg-background p-3"
      data-action-ui-id="debug.icon-opacity.page-diagnostics"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">
          {t("debugPanel.iconOpacity.pageTitle", {
            count: icons.length,
          })}
        </h3>
        <Button$1
          type="button"
          variant="outline"
          size="xs"
          onClick={handleRefresh}
          data-action-ui-id="debug.icon-opacity.refresh-page"
        >
          {t("debugPanel.iconOpacity.refresh")}
        </Button$1>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("debugPanel.iconOpacity.pageHint")}
      </p>
      {icons.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("debugPanel.iconOpacity.pageEmpty")}
        </p>
      ) : (
        <div className="mt-3 max-h-60 space-y-2 overflow-y-auto">
          {icons.map((icon) => (
            <details
              key={icon.id}
              className="rounded-md border border-border/50 p-2 text-caption-11"
              data-page-icon-control={icon.control}
            >
              <summary className="cursor-pointer break-all font-mono">
                {icon.control || icon.id}
                {" / "}
                {icon.tone || t("debugPanel.iconOpacity.unmapped")}
                {" / alpha="}
                {icon.colorAlpha}
              </summary>
              <dl className="mt-2 space-y-1 break-all font-mono text-muted-foreground">
                <dt>{t("debugPanel.iconOpacity.control")}</dt>
                <dd>
                  {icon.control} {icon.label}
                </dd>
                <dt>{t("debugPanel.iconOpacity.colorAlpha")}</dt>
                <dd>
                  {icon.color}
                  {" / alpha="}
                  {icon.colorAlpha}
                </dd>
                <dt>{t("debugPanel.iconOpacity.root")}</dt>
                <dd>
                  {icon.rootOpacity}
                  {" / "}
                  {icon.filter}
                </dd>
                <dt>{t("debugPanel.iconOpacity.ancestors")}</dt>
                <dd>{icon.ancestors}</dd>
                <dt>{t("debugPanel.iconOpacity.primitives")}</dt>
                <dd className="whitespace-pre-wrap">{icon.primitives}</dd>
              </dl>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  ...props
}) {
  return (
    <Button$2
      data-slot="button"
      disabled={disabled || loading}
      className={cn(
        buttonVariants({
          variant,
          size,
          className,
        }),
      )}
      {...props}
    >
      {loading && <LoaderCircle className="animate-spin" />}
      {children}
    </Button$2>
  );
}
const LegacyRetryIcon = reactExports.forwardRef(function LegacyRetryIcon2(
  { size = 24, ...props },
  ref,
) {
  const ariaHidden =
    props["aria-hidden"] ?? (props["aria-label"] ? void 0 : true);
  return (
    <svg
      ref={ref}
      {...props}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={ariaHidden}
    >
      <title>{props["aria-label"] ?? "Retry"}</title>
      <path
        d="M20.8128 9.96004C21.1123 10.1009 21.2992 10.4013 21.3011 10.7266C21.4176 11.6856 21.3857 12.6787 21.1858 13.6749C20.1769 18.7026 15.283 21.9609 10.2552 20.9522C7.54129 20.4077 5.34204 18.7293 4.05303 16.5128L5.6087 15.6085C6.64962 17.3984 8.42209 18.7487 10.6097 19.1876C14.3119 19.9301 17.9226 17.8019 19.1399 14.3389L17.5638 14.0225C17.3322 13.9758 17.2431 13.6914 17.4066 13.5206L20.8128 9.96004ZM2.81378 10.3262C3.82264 5.29847 8.71662 2.04025 13.7444 3.04891C16.458 3.59349 18.6567 5.2711 19.9456 7.48738L18.3899 8.39266C17.349 6.60274 15.5775 5.25248 13.3899 4.81355C9.68787 4.07088 6.07735 6.19867 4.85968 9.66121L6.43292 9.97664C6.6646 10.0233 6.75455 10.3077 6.59112 10.4786L3.18389 14.0391C2.88075 13.8966 2.69387 13.5907 2.69659 13.2608C2.58201 12.306 2.61487 11.3178 2.81378 10.3262Z"
        fill="currentColor"
        fillOpacity="0.85"
      />
    </svg>
  );
});
LegacyRetryIcon.displayName = "LegacyRetryIcon";
const INITIAL_DESCRIPTION_KEYS = {
  unavailable: "canvas.loadError.unavailableDescription",
  access: "canvas.loadError.accessDescription",
  "invalid-response": "canvas.loadError.invalidResponseDescription",
  unknown: "canvas.loadError.unknownDescription",
};
function LegacyCanvasLoadError({ failure, retrying, onRetry }) {
  const { t } = useTranslation();
  const retryButton = (
    <Button
      type="button"
      size="sm"
      variant={failure.phase === "initial" ? "default" : "outline"}
      loading={retrying}
      disabled={retrying}
      onClick={onRetry}
      data-action-ui-id="canvas.load-error-retry"
      className="rounded-md"
    >
      {!retrying && <LegacyRetryIcon size={16} />}
      {retrying ? t("canvas.loadError.retrying") : t("canvas.loadError.retry")}
    </Button>
  );
  if (failure.phase === "refresh") {
    return (
      <div className="pointer-events-none absolute inset-x-3 top-3 z-40 flex justify-center">
        <div
          data-action-ui-id="canvas.load-error-banner"
          role="status"
          aria-live="polite"
          aria-busy={retrying}
          className="pointer-events-auto flex max-w-xl items-center gap-3 rounded-lg border border-border bg-popover/95 px-3 py-2 text-popover-foreground shadow-sm backdrop-blur-sm"
        >
          <CloudOff
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {retrying
                ? t("canvas.loadError.refreshRetryingTitle")
                : t("canvas.loadError.refreshTitle")}
            </span>{" "}
            {t("canvas.loadError.refreshDescription")}
          </p>
          {retryButton}
        </div>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/95 p-6 backdrop-blur-sm">
      <section
        data-action-ui-id="canvas.load-error-card"
        role="alert"
        aria-busy={retrying}
        className="w-full max-w-sm rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <CloudOff className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-medium text-foreground">
              {retrying
                ? t("canvas.loadError.initialRetryingTitle")
                : t("canvas.loadError.initialTitle")}
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {retrying
                ? t("canvas.loadError.retryingDescription")
                : t(INITIAL_DESCRIPTION_KEYS[failure.kind])}
            </p>
            <div className="mt-4">{retryButton}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
const handlePreviewRetry = () => {};
const CANVAS_ERROR_OPACITY_SAMPLES = [
  {
    phase: "initial",
    retrying: false,
  },
  {
    phase: "initial",
    retrying: true,
  },
  {
    phase: "refresh",
    retrying: false,
  },
  {
    phase: "refresh",
    retrying: true,
  },
].map(({ phase, retrying }) => ({
  id: `canvas-error-${phase}-${retrying ? "retrying" : "idle"}`,
  name: `CanvasLoadError · ${phase} / ${retrying ? "retrying" : "idle"}`,
  titleKey: `debugPanel.iconOpacity.reconnect.${phase}.${retrying ? "retrying" : "idle"}`,
  category: "reconnect",
  wide: true,
  source: "@hilo/canvas/react → CanvasLoadError",
  location: "canvas/react/components/canvas-load-error.tsx",
  noteKey: "debugPanel.iconOpacity.reconnectHint",
  owner: "root",
  render: (fixed) => {
    const Recovery = fixed ? CanvasLoadError : LegacyCanvasLoadError;
    return (
      <div
        className={`relative w-full overflow-hidden rounded-md ${phase === "initial" ? "h-72" : "h-44"}`}
      >
        <Recovery
          failure={{
            kind: "unavailable",
            phase,
            autoRecoverable: true,
          }}
          retrying={retrying}
          onRetry={handlePreviewRetry}
        />
      </div>
    );
  },
}));
const INHERITED_COLOR_SAMPLES = [
  {
    id: "filter-geometry",
    name: "Minus / vertical diagnostic / Globe / Brain / Pin",
    titleKey: "debugPanel.iconOpacity.inherited.geometry",
    source: "@hilo/canvas/icons + @hilo/canvas/mx-icons",
    location:
      "layout/home-sidebar/RecentProjectRow.tsx; components/settings/settings-dialog.tsx; CompositedSvg vertical-line diagnostic",
    category: "inherited",
    owner: "root",
    noteKey: "debugPanel.iconOpacity.inherited.geometryHint",
    render: () => (
      <div className="flex items-center gap-4 text-muted-foreground">
        <Minus size={16} strokeWidth={1.5} />
        <CompositedSvg
          width={16}
          height={16}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path d="M8 2v12" />
        </CompositedSvg>
        <Globe size={16} strokeWidth={1.5} />
        <Brain size={16} strokeWidth={1.5} />
        <Pin size={16} strokeWidth={1.5} className="fill-current" />
      </div>
    ),
  },
  {
    id: "settings-inherited",
    name: "CircleUserRound / HardDrive / Globe / Brain / Smartphone",
    titleKey: "debugPanel.iconOpacity.inherited.settings",
    source: "@hilo/canvas/icons + @hilo/canvas/mx-icons",
    location: "components/settings/settings-dialog.tsx",
    category: "inherited",
    owner: "root",
    noteKey: "debugPanel.iconOpacity.inherited.fixture",
    render: (_fixed, disabled, t) => (
      <button
        type="button"
        disabled={disabled}
        className="flex items-center gap-3 text-foreground/70 hover:text-foreground disabled:text-muted-foreground disabled:opacity-60"
        aria-label={t("debugPanel.iconOpacity.inherited.settings")}
      >
        {[CircleUserRound, HardDrive, Globe, Brain, Smartphone].map(
          (Glyph, index) => (
            <Glyph
              key={["user", "storage", "network", "memory", "bridge"][index]}
              size={16}
              strokeWidth={1.5}
              className="shrink-0 text-current"
            />
          ),
        )}
      </button>
    ),
  },
  {
    id: "inspiration-inherited",
    name: "Megaphone / Globe2",
    titleKey: "debugPanel.iconOpacity.inherited.inspiration",
    source: "@hilo/canvas/icons + modules/base/icon",
    location:
      "pages/workspace/components/browser-inspiration.tsx; browser-inspiration-favicon.tsx",
    category: "inherited",
    owner: "root",
    noteKey: "debugPanel.iconOpacity.inherited.fixture",
    render: () => (
      <div className="flex items-center gap-3 text-foreground/70">
        <Icon
          icon={Megaphone}
          size="sm"
          className="shrink-0 text-muted-foreground/70"
        />
        <Icon icon={Globe2} size="md" className="text-muted-foreground" />
      </div>
    ),
  },
  {
    id: "custom-model-inherited",
    name: "PencilLine",
    titleKey: "debugPanel.iconOpacity.inherited.customModel",
    source: "@hilo/canvas/icons + modules/base/icon",
    location: "pages/workspace/components/chat/MediaModelSelector.tsx",
    category: "inherited",
    owner: "root",
    noteKey: "debugPanel.iconOpacity.inherited.customModelHint",
    render: (_fixed, _disabled, t) => (
      <button
        type="button"
        aria-disabled="true"
        className="inline-flex cursor-not-allowed items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground/50"
        aria-label={t("debugPanel.iconOpacity.inherited.customModel")}
      >
        <Icon icon={PencilLine} size="sm" strokeWidth={1.5} />
      </button>
    ),
  },
  {
    id: "browser-inherited",
    name: "Globe2 / ArrowLeft / RotateCw",
    titleKey: "debugPanel.iconOpacity.inherited.browser",
    source: "@hilo/canvas/icons + modules/base/icon",
    location: "pages/workspace/components/WorkspaceBrowser.tsx",
    category: "inherited",
    owner: "control",
    noteKey: "debugPanel.iconOpacity.inherited.fixture",
    render: (_fixed, disabled) => (
      <div className="flex items-center gap-3">
        <span className="text-foreground/55 hover:text-foreground">
          <Icon icon={Globe2} size="sm" />
        </span>
        {[ArrowLeft, RotateCw].map((Glyph, index) => (
          <button
            key={index === 0 ? "back" : "reload"}
            type="button"
            disabled={disabled}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label={index === 0 ? "ArrowLeft" : "RotateCw"}
          >
            <Icon icon={Glyph} size="md" />
          </button>
        ))}
      </div>
    ),
  },
];
function AspectRatioIcon({ ratio }) {
  const parsed = parseRatio(ratio);
  const maxSize = 14;
  let rectW = maxSize;
  let rectH = maxSize;
  if (parsed) {
    const [w, h] = parsed;
    if (w >= h) {
      rectW = maxSize;
      rectH = (maxSize * h) / w;
    } else {
      rectH = maxSize;
      rectW = (maxSize * w) / h;
    }
  }
  const x = (18 - rectW) / 2;
  const y = (18 - rectH) / 2;
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x={x} y={y} width={rectW} height={rectH} />
    </svg>
  );
}
function parseRatio(value) {
  const m = value.match(/^(\d+)\s*[:x]\s*(\d+)$/i);
  if (!m) return null;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!w || !h) return null;
  return [w, h];
}
function ClockIcon({ size = 12, className }) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative leading icon
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      className={className}
      aria-hidden={true}
    >
      <path
        d="M5 1.00012H7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 7.00012L7.5 5.50012"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 11C8.20914 11 10 9.20914 10 7C10 4.79086 8.20914 3 6 3C3.79086 3 2 4.79086 2 7C2 9.20914 3.79086 11 6 11Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
const DURATION_REGEX =
  /^\d+(?:[.-]\d+)*\s*(?:s|sec|secs|seconds?|m|min|mins|minutes?|秒|分钟)$/i;
function splitSummary(summary) {
  if (!summary) return [];
  const tokens = summary
    .split(/\s*[·•|]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  return tokens.map((tok) => {
    if (parseRatio(tok))
      return {
        kind: "ratio",
        text: tok,
      };
    if (DURATION_REGEX.test(tok))
      return {
        kind: "duration",
        text: tok,
      };
    return {
      kind: "text",
      text: tok,
    };
  });
}
function LegacyParamsChip({
  anchorRef,
  summary,
  open: _open,
  onToggle,
  disabled,
  iconOnly = false,
  showSummaryIcons = true,
}) {
  const { t } = useTranslation();
  const segments = splitSummary(summary);
  const hasSegments = segments.length > 0;
  const tooltipContent = summary || t("canvas.param.chip.placeholder");
  return (
    <button
      ref={anchorRef}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      disabled={disabled}
      className="h-8 shrink-0 px-2 text-[13px] font-normal tracking-normal leading-[20px] opacity-70 text-foreground hover:enabled:opacity-100 disabled:cursor-default disabled:opacity-40 min-w-0 max-w-[320px] flex items-center gap-1 rounded-[4px]"
      aria-label={tooltipContent}
      data-action-ui-id="popover.params-chip"
    >
      {iconOnly ? (
        <Settings2 size={16} strokeWidth={1.7} aria-hidden="true" />
      ) : !showSummaryIcons ? (
        <span className="min-w-0 flex-1 truncate text-left">
          {summary || t("canvas.param.chip.placeholder")}
        </span>
      ) : hasSegments ? (
        <span className="min-w-0 flex-1 truncate text-left">
          <span className="inline-flex items-center gap-1">
            {segments.map((seg, i) =>
              // Index is part of the key only to disambiguate the rare case
              // of duplicate raw tokens; segments are short-lived render-only
              // data with no per-item state, so position-based identity is fine.
              // biome-ignore lint/suspicious/noArrayIndexKey: render-only, no state
              jsxRuntimeExports.jsxs(
                reactExports.Fragment,
                {
                  children: [
                    i > 0 && <span className="opacity-60">·</span>,
                    seg.kind === "ratio" ? (
                      <span className="inline-flex items-center gap-0.5">
                        <span
                          aria-hidden={true}
                          className="inline-flex size-3 shrink-0 items-center justify-center opacity-70 [&>svg]:size-full"
                        >
                          <AspectRatioIcon ratio={seg.text} />
                        </span>
                        <span>{seg.text}</span>
                      </span>
                    ) : seg.kind === "duration" ? (
                      <span className="inline-flex items-center gap-0.5">
                        <ClockIcon className="opacity-70 shrink-0" />
                        <span>{seg.text}</span>
                      </span>
                    ) : (
                      <span>{seg.text}</span>
                    ),
                  ],
                },
                `${seg.kind}-${i}-${seg.text}`,
              ),
            )}
          </span>
        </span>
      ) : (
        <span className="min-w-0 flex-1 truncate text-left">
          {summary || t("canvas.param.chip.placeholder")}
        </span>
      )}
    </button>
  );
}
function LegacyRotateIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8.60059 14.6699H7.39941V12.0029H8.60059V14.6699ZM6.84082 5.00977L5.62402 7.3877L4.55469 6.83984L4.84668 6.26758C4.35115 6.38 3.90104 6.51695 3.50879 6.67383C2.94768 6.89829 2.53339 7.15095 2.26953 7.40039C2.00692 7.64874 1.93359 7.85288 1.93359 8.00293C1.93359 8.15298 2.00692 8.35712 2.26953 8.60547C2.53339 8.85491 2.94768 9.10757 3.50879 9.33203C4.6282 9.77972 6.21604 10.0693 8 10.0693C9.78395 10.0693 11.3718 9.77971 12.4912 9.33203C13.0523 9.10757 13.4666 8.85491 13.7305 8.60547C13.9931 8.35712 14.0664 8.15298 14.0664 8.00293C14.0664 7.85288 13.9931 7.64874 13.7305 7.40039C13.4666 7.15095 13.0523 6.89829 12.4912 6.67383C11.6598 6.34133 10.5696 6.09645 9.33301 5.99219V4.78809C10.7076 4.89567 11.9529 5.16714 12.9365 5.56055C13.5816 5.81857 14.1448 6.14078 14.5557 6.5293C14.9675 6.91895 15.2666 7.41683 15.2666 8.00293C15.2666 8.58903 14.9675 9.08691 14.5557 9.47656C14.1448 9.86508 13.5816 10.1873 12.9365 10.4453C11.6431 10.9626 9.89764 11.2695 8 11.2695C6.10236 11.2695 4.35689 10.9626 3.06348 10.4453C2.41843 10.1873 1.85516 9.86508 1.44434 9.47656C1.03249 9.08691 0.733399 8.58903 0.733398 8.00293C0.733398 7.41683 1.03249 6.91895 1.44434 6.5293C1.85516 6.14078 2.41843 5.81857 3.06348 5.56055C3.56192 5.36119 4.12758 5.19377 4.74316 5.0625L4.1582 4.67578L4.81934 3.67383L6.84082 5.00977ZM8.60059 9.33594H7.39941V1.33594H8.60059V9.33594Z"
        fill="currentColor"
      />
    </svg>
  );
}
function LegacyRotate90Icon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        fillOpacity="0.9"
        d="M10.057 8.385a2.75 2.75 0 0 1 3.888 0l4.243 4.242a2.75 2.75 0 0 1 0 3.888l-4.243 4.244a2.75 2.75 0 0 1-3.889 0l-4.243-4.244a2.75 2.75 0 0 1 0-3.888zm2.828 1.06a1.25 1.25 0 0 0-1.768 0l-4.243 4.242a1.25 1.25 0 0 0 0 1.768l4.243 4.243a1.25 1.25 0 0 0 1.768 0l4.243-4.243a1.25 1.25 0 0 0 0-1.768zM7.226 3.212a6.75 6.75 0 0 1 9.547 0l2.477 2.476V4.5a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-.75.75h-3a.75.75 0 0 1 0-1.5h1.19l-2.478-2.477a5.25 5.25 0 0 0-7.424 0L5.03 7.53a.75.75 0 1 1-1.06-1.06z"
      />
    </svg>
  );
}
function LegacyFlipHorizontalIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        fillOpacity="0.9"
        d="M12 2.25a.75.75 0 0 1 .75.75v18a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75M2.25 8.414c0-1.559 1.885-2.34 2.987-1.237l3.586 3.586a1.75 1.75 0 0 1 0 2.474l-3.586 3.586c-1.102 1.102-2.987.322-2.987-1.237zm16.513-1.237c1.102-1.103 2.987-.322 2.987 1.237v7.172c0 1.559-1.885 2.34-2.987 1.237l-3.586-3.586a1.75 1.75 0 0 1 0-2.474zM4.177 8.237a.25.25 0 0 0-.427.177v7.172c0 .223.27.334.427.177l3.586-3.586a.25.25 0 0 0 0-.354zm16.073.177a.25.25 0 0 0-.427-.177l-3.586 3.586a.25.25 0 0 0 0 .354l3.586 3.586a.25.25 0 0 0 .427-.177z"
      />
    </svg>
  );
}
function LegacyFlipVerticalIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        fillOpacity="0.9"
        d="M21.75 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h18a.75.75 0 0 1 .75.75m-6.164-9.75c1.559 0 2.34 1.885 1.237 2.987l-3.586 3.586a1.75 1.75 0 0 1-2.474 0L7.177 5.237C6.074 4.135 6.855 2.25 8.414 2.25zm1.237 16.513c1.102 1.102.322 2.987-1.237 2.987H8.414c-1.559 0-2.34-1.885-1.237-2.987l3.586-3.586a1.75 1.75 0 0 1 2.474 0zm-1.06-14.586a.25.25 0 0 0-.177-.427H8.414a.25.25 0 0 0-.177.427l3.586 3.586a.25.25 0 0 0 .354 0zm-.177 16.073a.25.25 0 0 0 .177-.427l-3.586-3.586a.25.25 0 0 0-.354 0l-3.586 3.586a.25.25 0 0 0 .177.427z"
      />
    </svg>
  );
}
const HOME_NAV_BUTTON_CLASS =
  "group flex h-9 w-full items-center text-[14px] leading-[14px] transition-colors duration-100 cursor-pointer";
const HOME_NAV_PILL_CLASS =
  "home-sidebar-nav-pill relative isolate flex h-8 w-full items-center gap-2 rounded-md pr-1 after:pointer-events-none after:absolute after:inset-y-0 after:-z-10 after:rounded-md";
const HOME_NAV_INACTIVE_TEXT_CLASS =
  "text-[var(--home-sidebar-primary-text)] hover:text-foreground";
const HOME_RECENT_GROUP_ACTION_CLASS =
  "flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none";
const HOME_NAV_ICON_SIZE = 18;
const HOME_NAV_ICON_SLOT_CLASS =
  "flex size-6 shrink-0 items-center justify-center";
const HOME_RAIL_PILL_CLASS = "home-sidebar-rail-pill";
const HOME_NAV_HOVER_CLASS =
  "group-hover:after:bg-[var(--home-sidebar-nav-hover)]";
const HOME_NAV_ACTIVE_CLASS = "after:bg-[var(--home-sidebar-nav-active)]";
const HOME_RAIL_TOOLTIP_DELAY_MS = 150;
function LegacyRecentProjectGroupHeader({
  project,
  expanded,
  onToggle,
  ungroupedToggleKey,
  selected = false,
  depth = 0,
  onNewCreation,
  onOpenDetail,
  onNewCreationUngrouped,
  onOpenAllUngrouped,
  holdPreviewOpen,
  releasePreviewHold,
}) {
  const { t } = useTranslation();
  const [contextMenuOpen, setContextMenuOpen] = reactExports.useState(false);
  const label = project?.name ?? t("project.ungrouped");
  const projectId = project?.id;
  const FolderIcon =
    project?.kind === "team" ? Users : expanded ? FolderOpen : Folder;
  const ChevronToggle = expanded ? ChevronDown : ChevronRight;
  const indentPx = 20 + depth * 16;
  reactExports.useEffect(() => {
    if (
      !contextMenuOpen ||
      !projectId ||
      !holdPreviewOpen ||
      !releasePreviewHold
    )
      return;
    const token = `home-sidebar.recent-group-menu:${projectId}`;
    holdPreviewOpen(token);
    return () => releasePreviewHold(token);
  }, [contextMenuOpen, holdPreviewOpen, projectId, releasePreviewHold]);
  const handleToggle = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      if (projectId) onToggle(projectId);
    },
    [onToggle, projectId],
  );
  const handleRowClick = reactExports.useCallback(() => {
    if (projectId) onToggle(projectId);
    else if (ungroupedToggleKey) onToggle(ungroupedToggleKey);
  }, [onToggle, projectId, ungroupedToggleKey]);
  const headerClass = cn(
    "group relative isolate flex h-[32px] items-center gap-1 pr-2 text-sm",
    project
      ? "text-[var(--home-sidebar-secondary-text)]"
      : "text-[var(--home-sidebar-section-text)]",
    "after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:left-[calc(var(--hover-left)_-_6px)] after:-z-10 after:rounded-md",
    project &&
      (selected
        ? "after:bg-[var(--home-sidebar-nav-hover)] text-foreground"
        : "hover:after:bg-[var(--home-sidebar-nav-hover)]"),
  );
  const header = (
    <div
      className={headerClass}
      style={{
        paddingLeft: indentPx,
        ["--hover-left"]: `${indentPx}px`,
      }}
      data-action-ui-id="home-sidebar.recent-group-header"
      data-project-id={projectId}
      data-selected={selected ? "true" : "false"}
    >
      {projectId ? (
        <button
          type="button"
          aria-label={expanded ? t("project.collapse") : t("project.expand")}
          aria-expanded={expanded}
          data-action-ui-id="home-sidebar.recent-group-toggle"
          className="relative z-10 flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none"
          onClick={handleToggle}
        >
          <FolderIcon size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      ) : null}
      {projectId ? (
        <button
          type="button"
          aria-label={label}
          data-action-ui-id="home-sidebar.recent-group-label"
          className="flex min-w-0 flex-1 items-center gap-1 cursor-pointer text-left"
          onClick={handleRowClick}
        >
          <span className="min-w-0 truncate">{label}</span>
        </button>
      ) : ungroupedToggleKey ? (
        <button
          type="button"
          aria-label={label}
          data-action-ui-id="home-sidebar.recent-group-label"
          className="flex min-w-0 items-center gap-1 cursor-pointer text-left"
          onClick={handleRowClick}
        >
          <span className="min-w-0 truncate">{label}</span>
          <ChevronToggle
            size={14}
            strokeWidth={1.75}
            aria-hidden="true"
            className="shrink-0 text-muted-foreground"
          />
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <span className="min-w-0 truncate">{label}</span>
        </div>
      )}
      {!projectId && ungroupedToggleKey ? (
        <div className="flex-1" aria-hidden="true" />
      ) : null}
      {!projectId && ungroupedToggleKey && onOpenAllUngrouped ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={t("home.viewAll")}
                  data-action-ui-id="home-sidebar.recent-group-ungrouped-view-all"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenAllUngrouped();
                  }}
                  className="pointer-events-none relative z-10 flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity duration-150 hover:bg-foreground/[0.06] hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
                >
                  <ArrowUpRight
                    size={16}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </button>
              }
            />
            <TooltipContent side="top">{t("home.viewAll")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
      {!projectId && ungroupedToggleKey && onNewCreationUngrouped ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={t("project.newCreation")}
                  data-action-ui-id="home-sidebar.recent-group-ungrouped-new-creation"
                  onClick={(event) => {
                    event.stopPropagation();
                    onNewCreationUngrouped();
                  }}
                  className="pointer-events-none relative z-10 flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity duration-150 hover:bg-foreground/[0.06] hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
                >
                  <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
                </button>
              }
            />
            <TooltipContent side="top">
              {t("project.newCreation")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
      {project ? (
        <span
          className="pointer-events-none absolute inset-y-0 right-0.5 z-10 flex items-center gap-0.5 rounded-r-md bg-[var(--home-sidebar-nav-hover)] px-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
          data-action-ui-id="home-sidebar.recent-group-actions"
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label={t("project.openDetail")}
                    data-action-ui-id="home-sidebar.recent-group-open-detail"
                    className={HOME_RECENT_GROUP_ACTION_CLASS}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenDetail(project.id);
                    }}
                  />
                }
              >
                <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent side="top">
                {t("project.openDetail")}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label={t("project.newCreation")}
                    data-action-ui-id="home-sidebar.recent-group-new-creation"
                    className={HOME_RECENT_GROUP_ACTION_CLASS}
                    onClick={(event) => {
                      event.stopPropagation();
                      onNewCreation(project.id);
                    }}
                  />
                }
              >
                <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent side="top">
                {t("project.newCreation")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
      ) : null}
    </div>
  );
  if (!project) return header;
  return (
    <ContextMenu open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
      <ContextMenuTrigger render={header} />
      <ContextMenuContent
        data-action-ui-id="home-sidebar.recent-group-menu"
        data-global-sidebar-hover-region="true"
      >
        <ContextMenuItem onClick={() => onNewCreation(project.id)}>
          <Plus size={14} strokeWidth={1.5} />
          {t("project.newCreation")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onOpenDetail(project.id)}>
          <ArrowUpRight size={14} strokeWidth={1.5} />
          {t("project.openDetail")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
function LegacySidebarNavButton({ item, active, onClick, compact = false }) {
  const {
    icon: Icon2,
    iconClassName,
    iconSize = HOME_NAV_ICON_SIZE,
    label,
    to,
    disabled,
    tooltip,
    badgeTarget,
    releaseBadge,
  } = item;
  const accessibleLabel = releaseBadge
    ? `${label}, ${releaseBadge.label}`
    : label;
  const button = (
    <button
      type="button"
      aria-label={compact || releaseBadge ? accessibleLabel : void 0}
      aria-current={active ? "page" : void 0}
      data-action-ui-id={`home-sidebar-nav-${to.replace(/^\//, "") || "home"}`}
      onClick={disabled ? void 0 : () => onClick(to)}
      className={cn(
        HOME_NAV_BUTTON_CLASS,
        disabled
          ? "text-muted-foreground/30 cursor-not-allowed"
          : active
            ? "text-foreground"
            : HOME_NAV_INACTIVE_TEXT_CLASS,
      )}
    >
      <span
        className={cn(
          HOME_NAV_PILL_CLASS,
          compact && HOME_RAIL_PILL_CLASS,
          !disabled && (active ? HOME_NAV_ACTIVE_CLASS : HOME_NAV_HOVER_CLASS),
        )}
      >
        {to === "/asset-center" ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0"
            data-action-ui-id="home-sidebar-nav-asset-center-coachmark-anchor"
            data-presentation={compact ? "rail" : "full"}
            style={{
              width: compact ? GLOBAL_SIDEBAR_RAIL_WIDTH : "100%",
            }}
          />
        ) : null}
        <span
          className={cn(HOME_NAV_ICON_SLOT_CLASS, "relative", iconClassName)}
          data-action-ui-id="home-sidebar.nav-icon-slot"
        >
          <Icon2 aria-hidden={true} size={iconSize} strokeWidth={1.5} />
          {compact && (
            <SidebarReleaseBadge
              compact={true}
              target={badgeTarget}
              releaseBadge={releaseBadge}
            />
          )}
        </span>
        <span className="home-sidebar-detail truncate leading-[normal]">
          {label}
        </span>
        {!compact ? (
          <SidebarReleaseBadge
            target={badgeTarget}
            releaseBadge={releaseBadge}
          />
        ) : null}
      </span>
    </button>
  );
  return (
    <TooltipProvider delay={HOME_RAIL_TOOLTIP_DELAY_MS}>
      <Tooltip>
        <TooltipTrigger render={button} />
        {(disabled && tooltip) || compact ? (
          <TooltipContent side="right">
            {tooltip ?? accessibleLabel}
          </TooltipContent>
        ) : null}
      </Tooltip>
    </TooltipProvider>
  );
}
const handlePreview$1 = () => {};
const SIDEBAR_OPACITY_SAMPLES = [
  ...[false, true].map((active) => ({
    id: active ? "sidebar-nav-selected" : "sidebar-nav",
    name: "SidebarNavButton · FolderOpen / Library / PluginIcon / Workflow",
    titleKey: active
      ? "debugPanel.iconOpacity.sidebarSelected"
      : "debugPanel.iconOpacity.sidebarNav",
    category: "sidebar",
    source: "layout/HomeSidebar.tsx → SidebarNavButton",
    location: "layout/HomeSidebar.tsx",
    noteKey: "debugPanel.iconOpacity.sidebarNavHint",
    owner: "control",
    render: (fixed, disabled, t) => {
      const NavButton = fixed ? SidebarNavButton : LegacySidebarNavButton;
      const items = [
        {
          to: "/projects",
          icon: FolderOpen,
          label: t("project.hubTitle"),
        },
        {
          to: "/asset-center",
          icon: Library,
          label: t("homeSidebar.assetCenter"),
        },
        {
          to: "/skills",
          icon: PluginIcon,
          label: t("homeSidebar.skillCommunity"),
        },
        {
          to: "/workflows",
          icon: Workflow,
          label: t("homeSidebar.comfyWorkflows"),
        },
      ];
      return (
        <div
          className="w-full bg-[var(--topbar-transparent-bg)] p-2"
          data-sidebar-opacity-fixture="nav"
        >
          {items.map((item) => (
            <NavButton
              key={item.to}
              item={{
                ...item,
                disabled,
              }}
              active={active}
              onClick={handlePreview$1}
            />
          ))}
        </div>
      );
    },
  })),
  {
    id: "sidebar-project-groups",
    name: "RecentProjectGroupHeader · Folder / FolderOpen / Users",
    titleKey: "debugPanel.iconOpacity.sidebarGroups",
    category: "sidebar",
    source: "layout/HomeSidebar.tsx → RecentProjectGroupHeader",
    location: "layout/HomeSidebar.tsx",
    owner: "control",
    render: (fixed, _disabled, t) => {
      const GroupHeader = fixed
        ? RecentProjectGroupHeader
        : LegacyRecentProjectGroupHeader;
      const base = {
        createdAt: 0,
        updatedAt: 0,
        workspacePaths: [],
        revision: 1,
        transactionId: "icon-opacity-preview",
      };
      const project = {
        ...base,
        id: "icon-opacity-local",
        name: t("project.create.local"),
        kind: "local",
      };
      const team = {
        ...base,
        id: "icon-opacity-team",
        name: t("project.create.team"),
        kind: "team",
      };
      return (
        <div className="w-full bg-[var(--topbar-transparent-bg)] py-2">
          <GroupHeader
            project={project}
            expanded={false}
            onToggle={handlePreview$1}
            onNewCreation={handlePreview$1}
            onOpenDetail={handlePreview$1}
            onRequestDelete={handlePreview$1}
          />
          <GroupHeader
            project={project}
            expanded={true}
            onToggle={handlePreview$1}
            onNewCreation={handlePreview$1}
            onOpenDetail={handlePreview$1}
            onRequestDelete={handlePreview$1}
          />
          <GroupHeader
            project={team}
            expanded={true}
            onToggle={handlePreview$1}
            onNewCreation={handlePreview$1}
            onOpenDetail={handlePreview$1}
            onRequestDelete={handlePreview$1}
          />
          <GroupHeader
            expanded={false}
            ungroupedToggleKey="icon-preview"
            onToggle={handlePreview$1}
            onNewCreation={handlePreview$1}
            onOpenDetail={handlePreview$1}
            onRequestDelete={handlePreview$1}
            onNewCreationUngrouped={handlePreview$1}
            onOpenAllUngrouped={handlePreview$1}
          />
          <GroupHeader
            expanded={true}
            ungroupedToggleKey="icon-preview"
            onToggle={handlePreview$1}
            onNewCreation={handlePreview$1}
            onOpenDetail={handlePreview$1}
            onRequestDelete={handlePreview$1}
          />
        </div>
      );
    },
  },
  {
    id: "sidebar-project-row-actions",
    name: "Pin / MoreVerticalIcon",
    titleKey: "debugPanel.iconOpacity.sidebarRowActions",
    category: "sidebar",
    noteKey: "debugPanel.iconOpacity.sidebarRowFixture",
    source: "layout/home-sidebar/RecentProjectRow.tsx",
    location: "layout/home-sidebar/RecentProjectRow.tsx",
    owner: "control",
    render: (fixed, disabled, t) => (
      <div className="flex items-center gap-2 bg-[var(--topbar-transparent-bg)] p-3">
        {[false, true].map((pinned) => (
          <button
            key={String(pinned)}
            type="button"
            disabled={disabled}
            aria-label={t(pinned ? "session.unpin" : "session.pin")}
            data-icon-active={pinned ? true : void 0}
            className={`${fixed ? "icon-sidebar-action-control" : ""} flex size-6 items-center justify-center rounded-md ${pinned ? "text-foreground" : "text-muted-foreground"} hover:text-foreground disabled:opacity-50`}
            data-action-ui-id={`debug.icon-opacity.pin.${pinned}`}
          >
            {fixed ? (
              <MonochromeIcon tone="control">
                <Pin$1
                  size={14}
                  strokeWidth={1.5}
                  fill={pinned ? "currentColor" : "none"}
                />
              </MonochromeIcon>
            ) : (
              <Pin$1
                size={14}
                strokeWidth={1.5}
                fill={pinned ? "currentColor" : "none"}
              />
            )}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          aria-label={t("homeSidebar.recentProjectsMore")}
          className={`${fixed ? "icon-sidebar-action-control" : ""} flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground disabled:opacity-50`}
          data-action-ui-id="debug.icon-opacity.project-more"
        >
          {fixed ? (
            <MonochromeIcon tone="control">
              <MoreVerticalIcon size={14} />
            </MonochromeIcon>
          ) : (
            <MoreVerticalIcon size={14} />
          )}
        </button>
      </div>
    ),
  },
];
const handlePreview = () => {};
const OPACITY_SAMPLES = [
  ...SIDEBAR_OPACITY_SAMPLES,
  ...INHERITED_COLOR_SAMPLES,
  ...CANVAS_ERROR_OPACITY_SAMPLES,
  {
    id: "search",
    name: "Search",
    source: "lucide-react",
    location: "layout/topbar/SearchButton.tsx",
    owner: "root",
    render: (fixed) =>
      fixed ? (
        <MonochromeIcon tone="topbar">
          <Search size={15} strokeWidth={1.75} />
        </MonochromeIcon>
      ) : (
        <Search
          size={15}
          strokeWidth={1.75}
          className="text-[var(--topbar-icon-fg)]"
        />
      ),
  },
  ...[Copy, ThumbsUp, Settings2].map((glyph, index) => ({
    id: ["copy", "thumbs-up", "settings"][index],
    name: ["Copy", "ThumbsUp", "Settings2"][index],
    source: "lucide-react",
    location: [
      "pages/workspace/components/chat/AssistantMessageActions.tsx",
      "modules/business/feedback/ChatRatingControls.tsx",
      "canvas/react/nodes/shared/popover-params-chip.tsx",
    ][index],
    owner: "root",
    render: (fixed) => (
      <Icon
        icon={glyph}
        size={index === 1 ? "xs" : index === 2 ? "md" : "sm"}
        strokeWidth={index === 2 ? 1.7 : 1.5}
        tone={fixed ? "muted" : void 0}
        className={fixed ? void 0 : "text-muted-foreground"}
      />
    ),
  })),
  {
    id: "retry",
    name: "RetryIcon",
    source: "modules/base/icon/retry.tsx",
    location: "components/settings/sections/software-update-section.tsx",
    owner: "root",
    render: (fixed) =>
      fixed ? (
        <Icon icon={RetryIcon} size="sm" className="text-foreground" />
      ) : (
        <LegacyRetryIcon size={14} className="text-foreground" />
      ),
  },
  ...[
    [RotateIcon, LegacyRotateIcon],
    [Rotate90Icon, LegacyRotate90Icon],
    [FlipHorizontalIcon, LegacyFlipHorizontalIcon],
    [FlipVerticalIcon, LegacyFlipVerticalIcon],
  ].map(([Glyph, LegacyGlyph], index) => ({
    id: ["rotate", "rotate-90", "flip-h", "flip-v"][index],
    name: [
      "RotateIcon",
      "Rotate90Icon",
      "FlipHorizontalIcon",
      "FlipVerticalIcon",
    ][index],
    source: "canvas/react/nodes/shared/icons.tsx",
    location:
      "canvas/react/nodes/image-node/image-rotate-edit-toolbar.tsx; image-node-toolbar.tsx",
    owner: "root",
    render: (fixed) => (
      <span className="text-[var(--canvas-controls-text)]">
        {fixed ? <Glyph /> : <LegacyGlyph />}
      </span>
    ),
  })),
  {
    id: "button",
    name: "Button + Copy",
    source: "components/ui/button + modules/base/icon",
    location: "pages/workspace/components/chat/AssistantMessageActions.tsx",
    noteKey: "debugPanel.iconOpacity.buttonFixture",
    owner: "control",
    render: (fixed, disabled, t) => (
      <Button$1
        variant="ghost"
        size="icon"
        disabled={disabled}
        aria-label={t("common.copy")}
        data-action-ui-id={`debug.icon-opacity.${fixed ? "after" : "before"}.button`}
        className={
          fixed
            ? "icon-muted-control text-muted-foreground"
            : "text-muted-foreground"
        }
      >
        <Icon icon={Copy} size="sm" tone={fixed ? "control" : void 0} />
      </Button$1>
    ),
  },
  {
    id: "canvas-label",
    name: "CanvasToolbarExtensionButton + CanvasLabelIcon",
    source: "@hilo/canvas/react",
    location: "pages/workspace/components/canvas-global-tag-manager.tsx",
    owner: "control",
    render: (fixed, disabled, t) => (
      <div className="h-8 rounded-full bg-[var(--canvas-controls-bg)]">
        <CanvasToolbarExtensionButton
          label={t("debugPanel.iconOpacity.background.canvas")}
          onClick={handlePreview}
          disabled={disabled}
          dataActionUiId={`debug.icon-opacity.${fixed ? "after" : "before"}.canvas-label`}
        >
          <Icon
            icon={CanvasLabelIcon}
            size="lg"
            strokeWidth={1.25}
            className="scale-110 opacity-55 [stroke-dasharray:4_2]"
            tone={fixed ? "control" : void 0}
          />
        </CanvasToolbarExtensionButton>
      </div>
    ),
  },
  ...[false, true].map((iconOnly) => ({
    id: iconOnly ? "params-settings" : "params-summary",
    name: iconOnly
      ? "ParamsChip + Settings2"
      : "ParamsChip + AspectRatioIcon + ClockIcon",
    source: "canvas/react/nodes/shared/popover-params-chip.tsx",
    location:
      "canvas/react/nodes/image-node/i2i-popover.tsx; i2v-popover.tsx; text-node/txt-popover.tsx; panorama-node/panorama-viewer.tsx; image-node/storyboard-grid/storyboard-grid-editor.tsx",
    owner: "parent",
    render: (fixed, disabled) => (
      <div className="text-muted-foreground">
        {fixed ? (
          <ParamsChip
            summary="16:9 · 1080P · 5s"
            open={false}
            onToggle={handlePreview}
            disabled={disabled}
            iconOnly={iconOnly}
          />
        ) : (
          <LegacyParamsChip
            summary="16:9 · 1080P · 5s"
            open={false}
            onToggle={handlePreview}
            disabled={disabled}
            iconOnly={iconOnly}
          />
        )}
      </div>
    ),
  })),
];
const BACKGROUNDS = {
  page: "bg-background",
  card: "bg-card",
  canvas: "bg-[var(--canvas-controls-bg)]",
  topbar: "bg-[var(--topbar-bg)]",
};
function IconOpacityPreviewSection() {
  const { t } = useTranslation();
  const { theme, resolved, setTheme } = useTheme();
  const previousTheme = reactExports.useRef(theme);
  const [open, setOpen] = reactExports.useState(false);
  const [opacity, setOpacity] = reactExports.useState(1);
  const [category, setCategory] = reactExports.useState("all");
  const [disabled, setDisabled] = reactExports.useState(false);
  const [background, setBackground] = reactExports.useState("page");
  const handleOpenChange = (nextOpen) => {
    if (nextOpen) previousTheme.current = theme;
    else setTheme(previousTheme.current);
    setOpen(nextOpen);
  };
  return (
    <section
      data-icon-opacity-debug="section"
      className="rounded-md border border-border/70 bg-background"
    >
      <div className="border-b border-border/70 px-4 py-3">
        <div className="text-sm font-medium">
          {t("debugPanel.iconOpacity.title")}
        </div>
        <p className="mt-0.5 text-caption-11 leading-relaxed text-muted-foreground">
          {t("debugPanel.iconOpacity.description")}
        </p>
      </div>
      <div className="flex justify-end px-4 py-2.5">
        <Button$1
          type="button"
          variant="outline"
          size="xs"
          onClick={() => handleOpenChange(true)}
          data-action-ui-id="debug.icon-opacity.open"
        >
          {t("debugPanel.preview")}
        </Button$1>
      </div>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          size="xl"
          showCloseButton={false}
          overlayClassName="z-[69]"
          className="z-[70] flex h-[95dvh] w-[95vw] max-w-none! flex-col gap-0 overflow-hidden p-0 sm:max-w-none!"
          data-action-ui-id="debug.icon-opacity.dialog"
          data-icon-opacity-debug="dialog"
        >
          <DialogHeader className="shrink-0 border-b border-border bg-background p-4">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle>{t("debugPanel.iconOpacity.title")}</DialogTitle>
              <Button$1
                type="button"
                size="xs"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                data-action-ui-id="debug.icon-opacity.close"
              >
                {t("common.back")}
              </Button$1>
            </div>
            <DialogDescription>
              {t("debugPanel.iconOpacity.hint")}
            </DialogDescription>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs text-muted-foreground">
                {t("debugPanel.iconOpacity.theme")}
              </span>
              {["light", "dark"].map((value) => (
                <Button$1
                  key={value}
                  size="xs"
                  variant={resolved === value ? "default" : "outline"}
                  onClick={() => setTheme(value)}
                  data-action-ui-id={`debug.icon-opacity.theme.${value}`}
                >
                  {t(`debugPanel.iconOpacity.${value}`)}
                </Button$1>
              ))}
              <span className="ml-2 text-xs text-muted-foreground">
                {t("debugPanel.iconOpacity.background")}
              </span>
              {Object.keys(BACKGROUNDS).map((value) => (
                <Button$1
                  key={value}
                  size="xs"
                  variant={background === value ? "default" : "outline"}
                  onClick={() => setBackground(value)}
                  data-action-ui-id={`debug.icon-opacity.background.${value}`}
                >
                  {t(`debugPanel.iconOpacity.background.${value}`)}
                </Button$1>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {t("debugPanel.iconOpacity.opacity")}
              </span>
              {[1, 0.7, 0.5, 0.4].map((value) => (
                <Button$1
                  key={value}
                  size="xs"
                  variant={opacity === value ? "default" : "outline"}
                  onClick={() => setOpacity(value)}
                  data-action-ui-id={`debug.icon-opacity.opacity.${value}`}
                >
                  {Math.round(value * 100)}%
                </Button$1>
              ))}
              <span className="ml-2 text-xs text-muted-foreground">
                {t("debugPanel.iconOpacity.state")}
              </span>
              {[false, true].map((value) => (
                <Button$1
                  key={String(value)}
                  size="xs"
                  variant={disabled === value ? "default" : "outline"}
                  onClick={() => setDisabled(value)}
                  data-action-ui-id={`debug.icon-opacity.state.${value ? "disabled" : "normal"}`}
                >
                  {t(
                    value
                      ? "debugPanel.iconOpacity.disabled"
                      : "debugPanel.iconOpacity.normal",
                  )}
                </Button$1>
              ))}
            </div>
          </DialogHeader>
          <div
            className={`min-h-0 flex-1 overflow-y-auto p-4 ${BACKGROUNDS[background]}`}
            data-action-ui-id="debug.icon-opacity.samples"
          >
            <p className="mb-4 text-xs text-muted-foreground">
              {t("debugPanel.iconOpacity.scope")}
            </p>
            <PageIconDiagnosticsSection revision={resolved} />
            <div className="mb-4 flex flex-wrap gap-2">
              {["all", "sidebar", "reconnect", "inherited", ...[]].map(
                (value) => (
                  <Button$1
                    key={value}
                    size="sm"
                    variant={category === value ? "default" : "outline"}
                    onClick={() => setCategory(value)}
                    data-action-ui-id={`debug.icon-opacity.category.${value}`}
                  >
                    {t(`debugPanel.iconOpacity.category.${value}`)}
                  </Button$1>
                ),
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {OPACITY_SAMPLES.filter(
                (sample) => category === "all" || sample.category === category,
              ).map((sample) => (
                <article
                  key={sample.id}
                  className={`min-w-0 rounded-lg border border-border p-3 ${sample.wide ? "xl:col-span-2" : ""}`}
                  data-opacity-sample={sample.id}
                >
                  <div className="text-sm font-medium">
                    {sample.titleKey ? t(sample.titleKey) : sample.name}
                  </div>
                  {sample.titleKey && (
                    <p className="text-caption-11 text-muted-foreground">
                      {sample.name}
                    </p>
                  )}
                  <p className="mt-1 break-all text-caption-11 text-muted-foreground">
                    {t("debugPanel.iconOpacity.source")}
                    {": "}
                    {sample.source}
                    <br />
                    {t("debugPanel.iconOpacity.location")}
                    {": "}
                    {sample.location}
                  </p>
                  {sample.noteKey && (
                    <p className="mt-1 text-caption-11 text-muted-foreground">
                      {t(sample.noteKey)}
                    </p>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {[false, true].map((fixed) => (
                      <div key={String(fixed)} className="min-w-0">
                        <p className="mb-2 text-xs font-medium">
                          {t(
                            fixed
                              ? "debugPanel.iconOpacity.after"
                              : "debugPanel.iconOpacity.before",
                          )}
                        </p>
                        <OpacitySampleCell
                          sample={sample}
                          fixed={fixed}
                          disabled={disabled}
                          opacity={opacity}
                          revision={`${resolved}-${background}`}
                        />
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
export { IconOpacityPreviewSection };
