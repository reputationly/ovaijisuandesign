// recent-project-row.jsx
import {
  API_PATHS,
  Check,
  CircleAlert,
  CircleX,
  CompositedSvg,
  Copy,
  dedupedToast,
  FolderX,
  MonochromeIcon,
  Pin,
  reactExports,
  usePlatform,
  useQuery,
  useTranslation,
} from "../vendor.js";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { DeferredThumbnailImage } from "./deferred-thumbnail-image-generation.jsx";
import {
  LocalFolderIcon,
  PencilIcon,
  PlaybackPlayIcon,
  QuestionPromptIcon,
} from "./home-service.jsx";
import { useWorkspaceThumbnails } from "./use-project-delete.js";
import {
  DropdownMenu,
  Icon,
  MoreVerticalIcon,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { FourCornerLoading } from "../chat/chat-empty-state.jsx";
import {
  cn$2,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import { Badge } from "../infra/badge-variants.jsx";
import { Popover } from "../assets/credit-query-keys.jsx";
import { PlatformFileManagerLabel } from "../settings/request-prompt-prefill.jsx";
import { Trash2 } from "../media-editing/package.jsx";
import { workspaceDisplayName } from "../generation/use-model-catalog-scope-key.js";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
import { StrokeIcon } from "./use-prompt-icon.jsx";
import { AddToProjectSubMenu } from "./add-to-project-sub-menu.jsx";
import { InlineRenameInput } from "../infra/inline-rename-input.jsx";
import { useWorkspaceDisplayNameRename } from "./use-new-workspace-dialog.jsx";
import { DeleteConfirmDialog } from "./move-workspace-dialog.jsx";

function isWorkspaceMediaSummary(value) {
  if (value === null || typeof value !== "object" || !("counts" in value))
    return false;
  const counts = value.counts;
  if (counts === null || typeof counts !== "object") return false;
  const candidate = counts;
  return ["image", "video", "audio", "text"].every(
    (key2) =>
      typeof candidate[key2] === "number" && Number.isFinite(candidate[key2]),
  );
}

async function fetchWorkspaceSummary(workspacePath) {
  const response = await gatewayFetch(
    API_PATHS.workspaceSummary(workspacePath),
  );
  if (!response.ok) {
    throw new Error(`Workspace summary request failed: ${response.status}`);
  }
  const value = await response.json();
  if (!isWorkspaceMediaSummary(value)) {
    throw new Error("Invalid workspace summary response");
  }
  return value;
}

function useWorkspaceSummary(workspacePath, enabled) {
  return useQuery({
    queryKey: ["workspace-media-summary", workspacePath],
    queryFn: () => fetchWorkspaceSummary(workspacePath),
    enabled: enabled && workspacePath.length > 0,
    staleTime: 3e4,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

const MINUTE_MS = 6e4;

const HOUR_MS = 60 * MINUTE_MS;

const DAY_MS = 24 * HOUR_MS;

function localCalendarDay(date2) {
  return (
    Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate()) / DAY_MS
  );
}

function formatWorkspaceOpenedAt(timestamp2, locale, now2 = Date.now()) {
  if (!Number.isFinite(timestamp2) || !Number.isFinite(now2)) return "";
  const openedAt = new Date(timestamp2);
  const current2 = new Date(now2);
  if (Number.isNaN(openedAt.getTime()) || Number.isNaN(current2.getTime()))
    return "";
  const dayDifference = localCalendarDay(current2) - localCalendarDay(openedAt);
  const relativeTime = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
  });
  if (dayDifference === 0) {
    const elapsed = Math.max(0, now2 - timestamp2);
    if (elapsed < MINUTE_MS) return relativeTime.format(0, "second");
    if (elapsed < HOUR_MS) {
      return relativeTime.format(
        -Math.max(1, Math.floor(elapsed / MINUTE_MS)),
        "minute",
      );
    }
    return relativeTime.format(
      -Math.max(1, Math.floor(elapsed / HOUR_MS)),
      "hour",
    );
  }
  if (dayDifference === 1) return relativeTime.format(-1, "day");
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(openedAt);
}

const HOME_RECENT_DETAILS_SIDE_OFFSET = 0;

const HOME_RECENT_CLICK_RESOLUTION_DELAY = 240;

const HOME_NAV_PILL_CLASS$1 =
  "home-sidebar-nav-pill relative isolate flex h-8 w-full items-center gap-2 rounded-md pr-1 after:pointer-events-none after:absolute after:inset-y-0 after:-z-10 after:rounded-md";

const HOME_NAV_ACTIVE_CLASS$1 = "after:bg-[var(--home-sidebar-nav-active)]";

function RecentProjectStatusContent({
  variant,
  userAction,
  userActionLabel,
  displayName: displayName2,
  openedAtLabel,
}) {
  const rowActionId =
    userAction === "confirmation"
      ? "home-sidebar.recent-confirmation-tag"
      : "home-sidebar.recent-question-tag";
  const detailsActionId =
    userAction === "confirmation"
      ? "home-sidebar.recent-details-confirmation-tag"
      : "home-sidebar.recent-details-question-tag";
  if (variant === "row") {
    return (
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span
          className="min-w-0 flex-1 truncate"
          data-recent-project-name="true"
        >
          {displayName2}
        </span>
        {userAction ? (
          <Badge
            role="status"
            aria-label={userActionLabel}
            data-action-ui-id={rowActionId}
            className="h-4 rounded-sm bg-brand-accent/10 px-1.5 py-0 text-[10px] font-medium leading-none text-brand-accent group-focus-within:hidden"
          >
            {userActionLabel}
          </Badge>
        ) : null}
      </span>
    );
  }
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      {userAction ? (
        <Badge
          role="status"
          aria-label={userActionLabel}
          data-action-ui-id={detailsActionId}
          className="h-4 rounded-sm bg-brand-accent/10 px-1.5 py-0 text-[10px] font-medium leading-none text-brand-accent"
        >
          {userActionLabel}
        </Badge>
      ) : null}
      <span
        data-action-ui-id="home-sidebar.recent-details-time"
        className="text-right text-[10px] tabular-nums whitespace-nowrap text-muted-foreground"
      >
        {openedAtLabel}
      </span>
    </div>
  );
}

function WorkspaceStatusBadge({ status, className }) {
  const { t: t2 } = useTranslation();
  if (!status || (!status.running && !status.unread && !status.needsUserAction))
    return null;
  if (status.needsUserAction) {
    const needsAnswer = status.needsUserAction === "answer";
    const label = needsAnswer
      ? t2("session.tabs.status.awaitingAnswer", "Waiting for your answer")
      : t2(
          "session.tabs.status.awaitingConfirmation",
          "Waiting for your confirmation",
        );
    return (
      <span
        role="status"
        aria-label={label}
        title={label}
        className={cn$2(
          "flex size-4 shrink-0 items-center justify-center text-foreground/70",
          className,
        )}
      >
        {needsAnswer ? (
          <QuestionPromptIcon className="size-3.5 text-foreground/70" />
        ) : (
          <Icon icon={CircleAlert} size="sm" />
        )}
      </span>
    );
  }
  if (status.running) {
    return (
      <FourCornerLoading
        variant="tab"
        size="sm"
        label={t2("session.tabs.status.generating", "Generating")}
        className={className}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={t2(
        "session.tabs.status.completedUnread",
        "Completed, unread",
      )}
      className={cn$2(
        "size-[5px] shrink-0 rounded-full bg-brand-accent",
        className,
      )}
    />
  );
}

function RecentProjectTrailingStatus({
  status,
  hovered,
  hasTrailingStatus,
  completedUnreadLabel,
}) {
  return (
    <span
      data-action-ui-id="home-sidebar.recent-trailing-slot"
      className={cn$2(
        "relative flex h-4 shrink-0 items-center justify-center overflow-hidden transition-[width] duration-150 ease-out group-hover:w-5 group-focus-within:w-5",
        hasTrailingStatus ? "w-5" : "w-0",
      )}
    >
      {!hovered && hasTrailingStatus && status?.running ? (
        <WorkspaceStatusBadge status={status} />
      ) : !hovered && hasTrailingStatus ? (
        <span
          role="img"
          aria-label={completedUnreadLabel}
          className="size-[5px] shrink-0 rounded-full bg-brand-accent"
        />
      ) : null}
    </span>
  );
}

function WorkspaceThumbnailFallback() {
  return (
    <span
      aria-hidden="true"
      className="home-sidebar-recent-thumbnail-fallback flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-foreground/[0.04] text-sidebar-foreground"
    >
      <CompositedSvg
        className="size-3"
        opacity="0.16"
        role="presentation"
        viewBox="0 0 145 137"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M116 6.31573e-05C123.69 6.31573e-05 131.069 3.04111 136.515 8.44623C141.939 13.8621 145 21.1907 145 28.8417V86.5356C145 94.1866 141.95 101.515 136.515 106.931C131.066 112.355 123.687 115.393 116 115.377H81.7478L47.227 135.977C46.1888 136.595 45.0131 136.944 43.806 136.994C42.5988 137.043 41.3984 136.791 40.3132 136.26C39.228 135.729 38.2922 134.936 37.5902 133.952C36.8883 132.968 36.4425 131.825 36.293 130.625L36.25 129.798V115.377H29C21.5683 115.386 14.4171 112.539 9.02222 107.425C3.63642 102.34 0.41663 95.3744 0.0322224 87.9755L0 86.5356V28.8417C0 21.1907 3.05037 13.8621 8.48518 8.44623C13.9343 3.02195 21.3131 -0.0159719 29 6.31573e-05H116ZM87 64.9044H43.5C41.5882 64.91 39.7554 65.6686 38.3985 67.0161C37.0416 68.3635 36.2698 70.1914 36.25 72.1041C36.2471 73.0559 36.4329 73.9988 36.7967 74.8783C37.1604 75.7578 37.6948 76.5565 38.3691 77.228C39.0433 77.8995 39.8439 78.4307 40.7246 78.7906C41.6053 79.1506 42.5487 79.3323 43.5 79.3252H87C88.9137 79.3196 90.748 78.5595 92.1052 77.2097C93.4624 75.86 94.233 74.0293 94.25 72.1148C94.2514 71.1639 94.0646 70.2221 93.7002 69.3439C93.3359 68.4656 92.8012 67.6682 92.1271 66.9978C91.453 66.3274 90.6529 65.7973 89.7729 65.438C88.8929 65.0787 87.9504 64.8973 87 64.9044ZM101.5 36.0521H43.5C41.5863 36.0576 39.752 36.8177 38.3948 38.1675C37.0376 39.5177 36.267 41.348 36.25 43.2625C36.2486 44.2134 36.4354 45.1552 36.7998 46.0334C37.1641 46.9117 37.6988 47.709 38.3729 48.3794C39.047 49.0498 39.847 49.58 40.7271 49.9393C41.6071 50.2986 42.5496 50.48 43.5 50.4729H101.5C103.412 50.4673 105.245 49.7087 106.601 48.3612C107.958 47.0137 108.73 45.1858 108.75 43.2732C108.753 42.3214 108.567 41.3785 108.203 40.4989C107.84 39.6194 107.305 38.8208 106.631 38.1493C105.957 37.4777 105.156 36.9466 104.275 36.5866C103.395 36.2267 102.451 36.045 101.5 36.0521Z"
          fill="currentColor"
        />
      </CompositedSvg>
    </span>
  );
}

const HOME_RECENT_THUMBNAIL_ROOT_MARGIN = "96px 0px";

const HOME_RECENT_THUMBNAIL_STABLE_DELAY_MS = 240;

function RecentWorkspaceThumbnail({ workspacePath, scanAllowed }) {
  const hostRef = reactExports.useRef(null);
  const [loadEnabled, setLoadEnabled] = reactExports.useState(
    () => typeof IntersectionObserver === "undefined",
  );
  const { data: thumbnails } = useWorkspaceThumbnails(
    workspacePath,
    scanAllowed && loadEnabled,
  );
  const [failedSource, setFailedSource] = reactExports.useState(null);
  const thumbnail = thumbnails?.[0];
  const thumbnailFailed = thumbnail ? failedSource === thumbnail.src : false;
  reactExports.useEffect(() => {
    if (
      !scanAllowed ||
      loadEnabled ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const host = hostRef.current;
    if (!host) return;
    let visibilityTimer = null;
    const observer2 = new IntersectionObserver(
      (entries2) => {
        if (!entries2.some((entry) => entry.isIntersecting)) {
          if (visibilityTimer !== null) {
            window.clearTimeout(visibilityTimer);
            visibilityTimer = null;
          }
          return;
        }
        if (visibilityTimer !== null) return;
        visibilityTimer = window.setTimeout(() => {
          visibilityTimer = null;
          setLoadEnabled(true);
          observer2.disconnect();
        }, HOME_RECENT_THUMBNAIL_STABLE_DELAY_MS);
      },
      {
        rootMargin: HOME_RECENT_THUMBNAIL_ROOT_MARGIN,
      },
    );
    observer2.observe(host);
    return () => {
      observer2.disconnect();
      if (visibilityTimer !== null) window.clearTimeout(visibilityTimer);
    };
  }, [loadEnabled, scanAllowed]);
  return (
    <span
      ref={hostRef}
      data-action-ui-id="home-sidebar.recent-thumbnail"
      className="relative flex size-6 shrink-0 overflow-hidden rounded-sm"
    >
      {!thumbnail || thumbnailFailed ? (
        <WorkspaceThumbnailFallback />
      ) : (
        <span className="relative size-6 shrink-0 overflow-hidden rounded-sm bg-muted">
          <DeferredThumbnailImage
            src={thumbnail.src}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
            onFailure={() => {
              setFailedSource(thumbnail.src);
            }}
          />
          {thumbnail.mediaType === "video" && (
            <span
              className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[var(--media-overlay-surface)] text-[var(--media-overlay-foreground)]"
              data-home-video-play="true"
            >
              <PlaybackPlayIcon
                size={9}
                className="text-[var(--media-overlay-foreground)]"
              />
            </span>
          )}
        </span>
      )}
    </span>
  );
}

const THEME_TOKENS = [
  "--popover",
  "--foreground",
  "--muted",
  "--muted-foreground",
  "--elevated-border-width",
  "--elevated-border-color",
  "--radius",
  "--radius-md",
  "--font-sans",
  "--ring",
  "--brand-accent",
];

function useNativeProjectPreview(options) {
  const browser2 = window.hilo?.browser;
  const supported =
    typeof browser2?.showProjectPreview === "function" &&
    typeof browser2?.hideProjectPreview === "function" &&
    typeof browser2?.onProjectPreviewEvent === "function";
  const [domFallback, setDomFallback] = reactExports.useState(false);
  const latest2 = reactExports.useRef(options);
  latest2.current = options;
  const publishRef = reactExports.useRef(null);
  const { open, anchor } = options;
  reactExports.useLayoutEffect(() => {
    if (!open || !supported || !browser2) return;
    const element2 = anchor.current;
    if (!element2) return;
    setDomFallback(false);
    const token2 = `project-preview:${crypto.randomUUID()}`;
    let disposed = false;
    let held = false;
    let lastPayload = "";
    let revision = 0;
    let nativeActive = true;
    const hold = latest2.current.holdPreviewOpen;
    const release = latest2.current.releasePreviewHold;
    const hide2 = () => {
      void browser2.hideProjectPreview(token2).catch(() => {});
    };
    const unsubscribe = browser2.onProjectPreviewEvent((event) => {
      if (!disposed && event.token === token2) latest2.current.onEvent(event);
    });
    const publish = () => {
      if (disposed) return;
      const rect = element2.getBoundingClientRect();
      const computed = getComputedStyle(element2);
      const request = {
        token: token2,
        anchor: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        content: latest2.current.content,
        theme: Object.fromEntries(
          THEME_TOKENS.map((key2) => [
            key2,
            computed.getPropertyValue(key2).trim(),
          ]),
        ),
      };
      const payload = JSON.stringify(request);
      if (payload === lastPayload) return;
      lastPayload = payload;
      const currentRevision = ++revision;
      void browser2.showProjectPreview(request).then(
        (shown) => {
          if (disposed || currentRevision !== revision) return;
          nativeActive = shown;
          setDomFallback(!shown);
          if (shown && !held) {
            held = true;
            hold?.(token2);
          }
        },
        () => {
          if (disposed || currentRevision !== revision) return;
          nativeActive = false;
          hide2();
          setDomFallback(true);
        },
      );
    };
    publishRef.current = publish;
    publish();
    const close2 = () => {
      if (nativeActive)
        latest2.current.onEvent({
          token: token2,
          type: "close",
        });
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") close2();
    };
    document.addEventListener("scroll", close2, true);
    document.addEventListener("pointerdown", close2, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", close2);
    const themeObserver = new MutationObserver(publish);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    return () => {
      disposed = true;
      publishRef.current = null;
      unsubscribe();
      themeObserver.disconnect();
      document.removeEventListener("scroll", close2, true);
      document.removeEventListener("pointerdown", close2, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", close2);
      hide2();
      if (held) release?.(token2);
    };
  }, [anchor, browser2, open, supported]);
  reactExports.useEffect(() => {
    publishRef.current?.();
  });
  return open && supported && !domFallback;
}

const COPY_FEEDBACK_DURATION_MS = 1500;

export function RecentProjectRow({
  workspace,
  renamePath,
  active: active2 = false,
  status,
  onOpen,
  onDelete,
  onCloseRuntime,
  dragOver,
  draggable = true,
  dragging = false,
  moveCompleted = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onPreviewInteractionEnter,
  onPreviewInteractionLeave,
  loadThumbnail,
  detailsEnabled,
  detailsOpen,
  onDetailsOpenChange,
  projects,
  currentProject,
  onAddToProject,
  onRemoveFromProject,
  pinned = false,
  onTogglePin,
  holdPreviewOpen,
  releasePreviewHold,
}) {
  const { t: t2, i18n } = useTranslation();
  const platform2 = usePlatform();
  const [menuOpen, setMenuOpen] = reactExports.useState(false);
  const [renameSurface, setRenameSurface] = reactExports.useState(null);
  const [renameMenuHandoff, setRenameMenuHandoff] =
    reactExports.useState(false);
  const [deleting, setDeleting] = reactExports.useState(false);
  const [hovered, setHovered] = reactExports.useState(false);
  const [pathCopied, setPathCopied] = reactExports.useState(false);
  const rowRef = reactExports.useRef(null);
  const copyFeedbackTimerRef = reactExports.useRef(null);
  const detailsTimerRef = reactExports.useRef(null);
  const openTimerRef = reactExports.useRef(null);
  const renameAfterMenuCloseRef = reactExports.useRef(false);
  const renameAfterMenuCloseTimerRef = reactExports.useRef(null);
  const draggingRef = reactExports.useRef(false);
  const displayName2 = workspaceDisplayName(workspace);
  const pendingUserAction = status?.needsUserAction;
  const hasTrailingStatus =
    Boolean(status?.running || status?.unread) && !pendingUserAction;
  const renaming = renameSurface !== null;
  const previewHoldActive =
    menuOpen || renaming || renameMenuHandoff || deleting;
  reactExports.useEffect(() => {
    if (!previewHoldActive || !holdPreviewOpen || !releasePreviewHold) return;
    const token2 = `home-sidebar.recent-row:${workspace.path}`;
    holdPreviewOpen(token2);
    return () => releasePreviewHold(token2);
  }, [holdPreviewOpen, previewHoldActive, releasePreviewHold, workspace.path]);
  const setDetailsOpen = reactExports.useCallback(
    (open) => onDetailsOpenChange(workspace.path, open),
    [onDetailsOpenChange, workspace.path],
  );
  const renameDisplayName = useWorkspaceDisplayNameRename(
    renamePath ?? workspace.path,
  );
  const openedAtLabel = formatWorkspaceOpenedAt(
    workspace.openedAt,
    i18n.language,
  );
  const pendingUserActionLabel =
    pendingUserAction === "confirmation"
      ? t2("homeSidebar.recentProjectAwaitingApproval", "Awaiting approval")
      : t2("homeSidebar.recentProjectAwaitingAnswer", "Awaiting reply");
  const visibleDetailsOpen = detailsEnabled && detailsOpen;
  const recentPillStateClass = active2
    ? HOME_NAV_ACTIVE_CLASS$1
    : cn$2(
        "group-hover/recent-row:after:bg-[var(--home-sidebar-nav-hover)] group-has-[:focus-visible]/recent-row:after:bg-[var(--home-sidebar-nav-hover)]",
        (visibleDetailsOpen || menuOpen) &&
          "after:bg-[var(--home-sidebar-nav-hover)]",
      );
  const summaryQuery = useWorkspaceSummary(
    workspace.path,
    visibleDetailsOpen && !menuOpen,
  );
  const counts = summaryQuery.data?.counts;
  const assetSummaryItems = counts
    ? [
        {
          key: "video",
          label: t2("home.recentProjectDetails.videos"),
          count: counts.video,
        },
        {
          key: "image",
          label: t2("home.recentProjectDetails.images"),
          count: counts.image,
        },
        {
          key: "text",
          label: t2("home.recentProjectDetails.text"),
          count: counts.text,
        },
        {
          key: "audio",
          label: t2("home.recentProjectDetails.audio"),
          count: counts.audio,
        },
      ].filter((item) => item.count > 0)
    : [];
  const handleCopyWorkspacePath = reactExports.useCallback(
    async (feedback = "toast") => {
      try {
        await platform2.clipboard.writeText(workspace.path);
        if (feedback === "toast") {
          dedupedToast.success(t2("fileExplorer.pathCopied"));
          return;
        }
        if (copyFeedbackTimerRef.current)
          clearTimeout(copyFeedbackTimerRef.current);
        setPathCopied(true);
        copyFeedbackTimerRef.current = setTimeout(() => {
          copyFeedbackTimerRef.current = null;
          setPathCopied(false);
        }, COPY_FEEDBACK_DURATION_MS);
      } catch {
        if (copyFeedbackTimerRef.current)
          clearTimeout(copyFeedbackTimerRef.current);
        copyFeedbackTimerRef.current = null;
        setPathCopied(false);
        dedupedToast.error(t2("fileExplorer.copyFailed"));
      }
    },
    [platform2.clipboard, t2, workspace.path],
  );
  reactExports.useEffect(
    () => () => {
      if (copyFeedbackTimerRef.current)
        clearTimeout(copyFeedbackTimerRef.current);
    },
    [],
  );
  const handleOpenWorkspacePath = reactExports.useCallback(async () => {
    try {
      if (platform2.shell.openPath) {
        await platform2.shell.openPath(workspace.path);
        return;
      }
      if (platform2.shell.showItemInFolder) {
        await platform2.shell.showItemInFolder(workspace.path);
        return;
      }
      dedupedToast.error(t2("fileExplorer.platformNotSupported"));
    } catch {
      dedupedToast.error(t2("fileExplorer.openFailed"));
    }
  }, [platform2.shell, t2, workspace.path]);
  const clearDetailsTimer = reactExports.useCallback(() => {
    if (detailsTimerRef.current) {
      clearTimeout(detailsTimerRef.current);
      detailsTimerRef.current = null;
    }
  }, []);
  reactExports.useEffect(() => clearDetailsTimer, [clearDetailsTimer]);
  reactExports.useLayoutEffect(() => {
    if (detailsEnabled) return;
    clearDetailsTimer();
    setHovered(false);
    setDetailsOpen(false);
    setRenameSurface((surface) => (surface === "details" ? null : surface));
  }, [clearDetailsTimer, detailsEnabled, setDetailsOpen]);
  const clearOpenTimer = reactExports.useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);
  reactExports.useEffect(() => clearOpenTimer, [clearOpenTimer]);
  const handleMenuOpenChange = reactExports.useCallback(
    (open) => {
      setMenuOpen(open);
      if (open) {
        clearOpenTimer();
        clearDetailsTimer();
        setDetailsOpen(false);
        return;
      }
      if (!renameAfterMenuCloseRef.current) return;
      renameAfterMenuCloseRef.current = false;
      if (renameAfterMenuCloseTimerRef.current) {
        clearTimeout(renameAfterMenuCloseTimerRef.current);
      }
      renameAfterMenuCloseTimerRef.current = setTimeout(() => {
        renameAfterMenuCloseTimerRef.current = null;
        setRenameMenuHandoff(false);
        setRenameSurface("row");
      }, 0);
    },
    [clearDetailsTimer, clearOpenTimer, setDetailsOpen],
  );
  reactExports.useEffect(
    () => () => {
      if (renameAfterMenuCloseTimerRef.current) {
        clearTimeout(renameAfterMenuCloseTimerRef.current);
      }
    },
    [],
  );
  const scheduleDetailsClose = reactExports.useCallback(() => {
    clearDetailsTimer();
    if (renameSurface === "details") return;
    detailsTimerRef.current = setTimeout(() => setDetailsOpen(false), 140);
  }, [clearDetailsTimer, renameSurface, setDetailsOpen]);
  const handlePointerEnter = reactExports.useCallback(() => {
    onPreviewInteractionEnter?.();
    clearDetailsTimer();
    setHovered(true);
    if (detailsEnabled && !menuOpen && !renaming && !draggingRef.current) {
      detailsTimerRef.current = setTimeout(() => setDetailsOpen(true), 160);
    }
  }, [
    clearDetailsTimer,
    detailsEnabled,
    menuOpen,
    onPreviewInteractionEnter,
    renaming,
    setDetailsOpen,
  ]);
  const handlePointerLeave = reactExports.useCallback(() => {
    setHovered(false);
    scheduleDetailsClose();
  }, [scheduleDetailsClose]);
  const handleProjectClick = reactExports.useCallback(
    (event) => {
      if (renaming || menuOpen) return;
      const shouldRename =
        event.detail >= 3 &&
        event.target instanceof HTMLElement &&
        event.target.closest('[data-recent-project-name="true"]');
      if (!shouldRename) {
        clearOpenTimer();
        openTimerRef.current = setTimeout(() => {
          openTimerRef.current = null;
          onOpen(workspace);
        }, HOME_RECENT_CLICK_RESOLUTION_DELAY);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      clearOpenTimer();
      clearDetailsTimer();
      setDetailsOpen(false);
      setMenuOpen(false);
      setRenameSurface("row");
    },
    [
      clearDetailsTimer,
      clearOpenTimer,
      menuOpen,
      onOpen,
      renaming,
      setDetailsOpen,
      workspace,
    ],
  );
  const nativeDetails = useNativeProjectPreview({
    open: visibleDetailsOpen && !menuOpen && !deleting,
    anchor: rowRef,
    content: {
      name: displayName2,
      path: workspace.path,
      status: pendingUserAction
        ? `${pendingUserActionLabel}
${openedAtLabel}`
        : openedAtLabel,
      summary: assetSummaryItems
        .map((item) => `${item.label} · ${item.count}`)
        .join(" ｜ "),
      loading: summaryQuery.isPending,
      copyLabel: t2("fileExplorer.copyPath"),
      copiedLabel: t2("common.copiedShort"),
      copied: pathCopied,
      renamePlaceholder: t2("home.workspace.displayNamePlaceholder"),
    },
    holdPreviewOpen,
    releasePreviewHold,
    onEvent: (event) => {
      if (event.type === "enter") {
        onPreviewInteractionEnter?.();
        clearDetailsTimer();
      } else if (event.type === "leave") {
        scheduleDetailsClose();
        onPreviewInteractionLeave?.();
      } else if (event.type === "close") {
        clearDetailsTimer();
        setDetailsOpen(false);
      } else if (event.type === "copy") {
        void handleCopyWorkspacePath("inline");
      } else if (event.type === "rename" && event.name?.trim()) {
        renameDisplayName(event.name.trim());
        setDetailsOpen(false);
      }
    },
  });
  return (
    <Popover
      open={visibleDetailsOpen && !nativeDetails}
      onOpenChange={(open) => {
        if (open && !detailsEnabled) return;
        setDetailsOpen(open);
        if (!open && renameSurface === "details") setRenameSurface(null);
      }}
    >
      <li
        ref={rowRef}
        draggable={draggable && !renaming}
        data-action-ui-id="home-sidebar-recent"
        data-workspace-path={workspace.path}
        onDragStart={(event) => {
          draggingRef.current = true;
          clearDetailsTimer();
          clearOpenTimer();
          setDetailsOpen(false);
          setMenuOpen(false);
          onDragStart(event, workspace.path);
        }}
        onDragOver={(event) => {
          clearDetailsTimer();
          clearOpenTimer();
          setDetailsOpen(false);
          onDragOver(event, workspace.path);
        }}
        onDrop={(event) => {
          draggingRef.current = false;
          clearDetailsTimer();
          clearOpenTimer();
          setDetailsOpen(false);
          onDrop(event, workspace.path);
        }}
        onDragEnd={() => {
          draggingRef.current = false;
          clearDetailsTimer();
          clearOpenTimer();
          setDetailsOpen(false);
          onDragEnd();
        }}
        className={cn$2(
          "group group/recent-row relative flex h-[32px] shrink-0 cursor-pointer items-center text-left text-sm text-[var(--home-sidebar-secondary-text)] transition-colors hover:text-foreground",
          active2 && "text-foreground",
          dragging && "sidebar-drag-source",
          moveCompleted && "sidebar-move-completed",
          dragOver && "home-sidebar-recent-drag-over",
          dragOver && `home-sidebar-recent-drag-over-${dragOver}`,
        )}
        data-drag-over-position={dragOver}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        {renameSurface === "row" ? (
          <div
            className={cn$2(
              HOME_NAV_PILL_CLASS$1,
              recentPillStateClass,
              "pr-2 group-hover/recent-row:pr-16 group-has-[:focus-visible]/recent-row:pr-16",
              menuOpen && "pr-16",
            )}
            data-action-ui-id="home-sidebar.recent-pill"
          >
            <RecentWorkspaceThumbnail
              workspacePath={workspace.path}
              scanAllowed={loadThumbnail}
            />
            <InlineRenameInput
              initialName={displayName2}
              placeholder={t2("home.workspace.displayNamePlaceholder")}
              onConfirm={(name2) => {
                renameDisplayName(name2);
                setRenameSurface(null);
              }}
              onCancel={() => setRenameSurface(null)}
            />
          </div>
        ) : (
          <button
            type="button"
            tabIndex={0}
            aria-current={active2 ? "page" : void 0}
            onClick={handleProjectClick}
            className={cn$2(
              HOME_NAV_PILL_CLASS$1,
              recentPillStateClass,
              "list-row-hit-area [--list-row-gap:1px] group-first/recent-row:before:top-0 group-last/recent-row:before:bottom-0 pr-2 text-left group-hover/recent-row:pr-16 group-has-[:focus-visible]/recent-row:pr-16",
              menuOpen && "pr-16",
            )}
            data-action-ui-id="home-sidebar.recent-pill"
          >
            <RecentWorkspaceThumbnail
              workspacePath={workspace.path}
              scanAllowed={loadThumbnail}
            />
            <RecentProjectStatusContent
              variant="row"
              userAction={hovered ? void 0 : pendingUserAction}
              userActionLabel={pendingUserActionLabel}
              displayName={displayName2}
            />
            <RecentProjectTrailingStatus
              status={status}
              hovered={hovered}
              hasTrailingStatus={hasTrailingStatus}
              completedUnreadLabel={t2(
                "session.tabs.status.completedUnread",
                "Completed, unread",
              )}
            />
          </button>
        )}
        <div
          className={cn$2(
            "pointer-events-none absolute right-0.5 top-0 bottom-0 flex items-center gap-0.5 px-2 rounded-r-md opacity-0 transition-opacity duration-150 group-hover/recent-row:opacity-100 group-hover/recent-row:pointer-events-auto group-has-[:focus-visible]/recent-row:opacity-100 group-has-[:focus-visible]/recent-row:pointer-events-auto",
            menuOpen && "pointer-events-auto opacity-100",
          )}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label={
                      pinned ? t2("session.unpin") : t2("session.pin")
                    }
                    data-action-ui-id="home-sidebar-recent-pin"
                    data-icon-active={pinned || void 0}
                    onClick={(event) => {
                      event.stopPropagation();
                      onTogglePin();
                    }}
                    className={cn$2(
                      "icon-sidebar-action-control flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:outline-none",
                      pinned && "text-foreground",
                    )}
                  >
                    <MonochromeIcon tone="control">
                      <Pin
                        size={14}
                        strokeWidth={1.5}
                        aria-hidden="true"
                        className={cn$2(pinned && "fill-current")}
                      />
                    </MonochromeIcon>
                  </button>
                }
              />
              <TooltipContent side="top">
                {pinned ? t2("session.unpin") : t2("session.pin")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenu open={menuOpen} onOpenChange={handleMenuOpenChange}>
            <DropdownMenuTrigger
              type="button"
              draggable={false}
              disabled={renaming}
              aria-label={t2("homeSidebar.recentProjectActions")}
              data-action-ui-id="home-sidebar-recent-more"
              className={cn$2(
                "icon-sidebar-action-control flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:outline-none",
                menuOpen &&
                  "bg-[var(--home-sidebar-nav-active)] hover:bg-[var(--home-sidebar-nav-active)]",
              )}
            >
              <MonochromeIcon tone="control">
                <MoreVerticalIcon size={14} />
              </MonochromeIcon>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              side="bottom"
              sideOffset={2}
              finalFocus={false}
              className="[&_[data-slot=dropdown-menu-item]>svg:first-child]:mx-px [&_[data-slot=dropdown-menu-sub-trigger]>span>svg:first-child]:mx-px"
              data-action-ui-id="home-sidebar.recent-actions-menu"
              data-global-sidebar-hover-region="true"
              onPointerEnter={onPreviewInteractionEnter}
              onPointerLeave={onPreviewInteractionLeave}
            >
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  renameAfterMenuCloseRef.current = true;
                  setRenameMenuHandoff(true);
                  handleMenuOpenChange(false);
                }}
              >
                <StrokeIcon icon={PencilIcon} size={14} />
                {t2("common.rename")}
              </DropdownMenuItem>
              <AddToProjectSubMenu
                useStrokeSpec={true}
                projects={projects}
                currentProjectId={currentProject?.id}
                onSelect={(projectId) => {
                  setMenuOpen(false);
                  onAddToProject(workspace.path, projectId);
                }}
              />
              {currentProject ? (
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    onRemoveFromProject(workspace.path);
                  }}
                  data-action-ui-id="home-sidebar.recent-remove-from-project"
                >
                  <StrokeIcon icon={FolderX} size={14} />
                  {t2("project.removeFromProject")}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  void handleCopyWorkspacePath();
                }}
              >
                <StrokeIcon icon={Copy} size={14} />
                {t2("fileExplorer.copyPath")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  void handleOpenWorkspacePath();
                }}
              >
                <LocalFolderIcon className="size-4" aria-hidden="true" />
                <PlatformFileManagerLabel os={platform2.app.os} />
              </DropdownMenuItem>
              {onCloseRuntime ? (
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    onCloseRuntime();
                  }}
                  data-action-ui-id="home-sidebar.recent-close-runtime"
                >
                  <StrokeIcon icon={CircleX} size={14} />
                  {t2("homeSidebar.closeProject")}
                </DropdownMenuItem>
              ) : null}
              {onDelete ? (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    setDeleting(true);
                  }}
                >
                  <StrokeIcon icon={Trash2} size={14} />
                  {t2("common.delete")}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </li>
      {visibleDetailsOpen && !nativeDetails ? (
        <PopoverContent
          anchor={rowRef}
          side="right"
          align="start"
          sideOffset={HOME_RECENT_DETAILS_SIDE_OFFSET}
          initialFocus={false}
          finalFocus={false}
          className="w-64 gap-0 p-3"
          data-action-ui-id="home-sidebar.recent-details"
          data-global-sidebar-hover-region="true"
          data-side-offset={HOME_RECENT_DETAILS_SIDE_OFFSET}
          onPointerEnter={() => {
            onPreviewInteractionEnter?.();
            clearDetailsTimer();
          }}
          onPointerLeave={() => {
            scheduleDetailsClose();
            onPreviewInteractionLeave?.();
          }}
        >
          <div className="flex min-w-0 items-start gap-3">
            {renameSurface === "details" ? (
              <div className="min-w-0 flex-1">
                <InlineRenameInput
                  initialName={displayName2}
                  placeholder={t2("home.workspace.displayNamePlaceholder")}
                  onConfirm={(name2) => {
                    renameDisplayName(name2);
                    setRenameSurface(null);
                    setDetailsOpen(false);
                  }}
                  onCancel={() => {
                    setRenameSurface(null);
                    setDetailsOpen(false);
                  }}
                />
              </div>
            ) : (
              <p
                data-action-ui-id="home-sidebar.recent-details-name"
                className="min-w-0 flex-1 cursor-text whitespace-normal break-words text-sm font-medium leading-5 text-foreground"
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  clearDetailsTimer();
                  setRenameSurface("details");
                }}
              >
                {displayName2}
              </p>
            )}
            <RecentProjectStatusContent
              variant="details"
              userAction={pendingUserAction}
              userActionLabel={pendingUserActionLabel}
              openedAtLabel={openedAtLabel}
            />
          </div>
          <div
            data-action-ui-id="home-sidebar.recent-details-path"
            className="relative mt-2 flex w-full max-w-full items-center gap-1.5 overflow-hidden rounded-md bg-muted px-1.5 py-1 text-[11px] text-muted-foreground"
          >
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <span
                className="line-clamp-2 min-w-0 whitespace-normal leading-4 [overflow-wrap:anywhere]"
                title={workspace.path}
              >
                {workspace.path}
              </span>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 right-0 h-4 w-8 bg-gradient-to-r from-transparent to-muted"
              />
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  closeOnClick={false}
                  render={
                    <button
                      type="button"
                      className="icon-sidebar-action-control relative z-10 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-[var(--home-sidebar-nav-hover)] hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50"
                      aria-label={
                        pathCopied
                          ? t2("common.copiedShort")
                          : t2("fileExplorer.copyPath")
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleCopyWorkspacePath("inline");
                      }}
                      data-action-ui-id="home-sidebar.recent-details-copy-path"
                    />
                  }
                >
                  {pathCopied ? (
                    <MonochromeIcon tone="control">
                      <StrokeIcon icon={Check} size={14} />
                    </MonochromeIcon>
                  ) : (
                    <MonochromeIcon tone="control">
                      <StrokeIcon icon={Copy} size={14} />
                    </MonochromeIcon>
                  )}
                </TooltipTrigger>
                <TooltipContent side="top">
                  {pathCopied
                    ? t2("common.copiedShort")
                    : t2("fileExplorer.copyPath")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {summaryQuery.isPending ? (
            <div
              data-action-ui-id="home-sidebar.recent-details-assets-loading"
              className="mt-2 h-3 w-28 animate-pulse rounded-sm bg-muted"
              aria-hidden="true"
            />
          ) : assetSummaryItems.length > 0 ? (
            <p
              data-action-ui-id="home-sidebar.recent-details-assets"
              className="mt-2 truncate text-[10px] leading-4 text-muted-foreground"
            >
              {assetSummaryItems.map((item, index2) => (
                <span key={item.key}>
                  {index2 > 0 && (
                    <span
                      aria-hidden="true"
                      className="mx-1 text-foreground/25"
                    >
                      ｜
                    </span>
                  )}
                  {item.label}
                  {" · "}
                  {item.count}
                </span>
              ))}
            </p>
          ) : null}
        </PopoverContent>
      ) : null}
      <DeleteConfirmDialog
        open={Boolean(onDelete && deleting)}
        name={displayName2}
        onConfirm={() => {
          onDelete?.();
          setDeleting(false);
        }}
        onCancel={() => setDeleting(false)}
      />
    </Popover>
  );
}
