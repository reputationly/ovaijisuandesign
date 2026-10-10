// 搜索结果左侧的图标与缩略图：命令图标、媒体图标、工作区预览。
import { reactExports, Search, PlaybackPlayIcon$1 as PlaybackPlayIcon, LayoutGrid, classifyFileType, Command, PackageSearch, FolderPlus, Music, Video } from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { BookOpen, MessageSquare, Folder, FolderOpen, Brain, Settings, MessageSquarePlus, FileText, ImageOutlineIcon } from "../media-editing/package.jsx";
import { PluginIcon } from "../workspace/home-service.jsx";
import { SkillIcon } from "../workspace/use-prompt-icon.jsx";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import { useWorkspaceThumbnails } from "../workspace/use-project-delete.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { THUMBNAIL_STABLE_DELAY_MS, THUMBNAIL_VISIBLE_ROOT_MARGIN } from "./constants.js";
import { inferResultMediaFilter } from "./result-filters.js";
export function formatRelativeTime(time, t) {
  const ms = typeof time === "string" ? new Date(time).getTime() : time;
  if (Number.isNaN(ms)) return "";
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 6e4);
  if (minutes < 1) return t("globalSearch.time.now", "now");
  if (minutes < 60) {
    return t("globalSearch.time.minutes", {
      count: minutes,
      defaultValue: "{{count}}m",
    });
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return t("globalSearch.time.hours", {
      count: hours,
      defaultValue: "{{count}}h",
    });
  }
  const days = Math.floor(hours / 24);
  return t("globalSearch.time.days", {
    count: days,
    defaultValue: "{{count}}d",
  });
}
function commandIcon(result) {
  switch (result.action?.type) {
    case "new-session":
      return MessageSquarePlus;
    case "new-project":
      return FolderPlus;
    case "open-workspace-dialog":
    case "project":
      return FolderOpen;
    case "open-project":
      return Folder;
    case "settings":
      return result.action.section === "memory" ? Brain : Settings;
    case "route":
      return result.action.target === "asset-center" ? PackageSearch : Command;
    case "query":
      return Search;
    default:
      return Command;
  }
}
function mediaIcon(result) {
  switch (inferResultMediaFilter(result)) {
    case "image":
      return ImageOutlineIcon;
    case "video":
      return Video;
    case "text":
      return FileText;
    case "audio":
      return Music;
    default:
      return null;
  }
}
export function ResultIcon({ result }) {
  switch (result.category) {
    case "project":
      return <Icon icon={FolderOpen} size="lg" />;
    case "hubProject":
      return <Icon icon={Folder} size="lg" />;
    case "session":
      return <Icon icon={MessageSquare} size="lg" />;
    case "file":
      return (
        <FileTypeIcon
          {...classifyFileType({
            filename: result.title,
          })}
          size={24}
          decorative={true}
        />
      );
    case "canvas":
      return <Icon icon={mediaIcon(result) ?? LayoutGrid} size="lg" />;
    case "skill":
      return <SkillIcon size={20} strokeWidth={1.75} />;
    case "plugin":
      return <PluginIcon size={20} strokeWidth={1.75} />;
    case "command":
      return <Icon icon={commandIcon(result)} size="lg" />;
    case "help":
      return <Icon icon={BookOpen} size="lg" />;
  }
}
function WorkspaceResultVisual({ workspacePath }) {
  const hostRef = reactExports.useRef(null);
  const [loadEnabled, setLoadEnabled] = reactExports.useState(
    () => typeof IntersectionObserver === "undefined",
  );
  const { data: thumbnails } = useWorkspaceThumbnails(workspacePath, loadEnabled);
  const [failed, setFailed] = reactExports.useState(false);
  const thumbnail = thumbnails?.[0];
  reactExports.useEffect(() => {
    if (loadEnabled || typeof IntersectionObserver === "undefined") return;
    const host = hostRef.current;
    if (!host) return;
    let visibilityTimer = null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          if (visibilityTimer !== null) {
            clearTimeout(visibilityTimer);
            visibilityTimer = null;
          }
          return;
        }
        if (visibilityTimer !== null) return;
        visibilityTimer = setTimeout(() => {
          visibilityTimer = null;
          setLoadEnabled(true);
          observer.disconnect();
        }, THUMBNAIL_STABLE_DELAY_MS);
      },
      {
        rootMargin: THUMBNAIL_VISIBLE_ROOT_MARGIN,
      },
    );
    observer.observe(host);
    return () => {
      observer.disconnect();
      if (visibilityTimer !== null) clearTimeout(visibilityTimer);
    };
  }, [loadEnabled]);
  if (!thumbnail || failed) {
    return (
      <span
        ref={hostRef}
        className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-transparent text-foreground/55 transition-colors duration-100 group-hover/result:border-border group-hover/result:text-foreground/70"
      >
        <Icon icon={FolderOpen} size="lg" />
      </span>
    );
  }
  return (
    <span
      ref={hostRef}
      className="relative flex size-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/40"
    >
      <img
        src={thumbnail.src}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
      {thumbnail.mediaType === "video" && (
        <span className="absolute inset-0 flex items-center justify-center bg-foreground/10">
          <PlaybackPlayIcon
            aria-hidden={true}
            size={14}
            strokeWidth={1.5}
            className="fill-background text-background drop-shadow-sm"
          />
        </span>
      )}
    </span>
  );
}
export function ResultLeadingVisual({ result }) {
  const [thumbnailFailed, setThumbnailFailed] = reactExports.useState(false);
  const mediaType = inferResultMediaFilter(result);
  const canPreviewMedia = mediaType === "image" || mediaType === "video";
  const thumbnailUrl = canPreviewMedia && !thumbnailFailed ? result.thumbnailUrl : void 0;
  if (result.category === "project" && result.workspacePath) {
    return <WorkspaceResultVisual workspacePath={result.workspacePath} />;
  }
  if (thumbnailUrl) {
    return (
      <span className="relative flex size-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/40">
        <img
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setThumbnailFailed(true)}
        />
        {mediaType === "video" && (
          <span className="absolute inset-0 flex items-center justify-center bg-foreground/10">
            <PlaybackPlayIcon
              aria-hidden={true}
              size={14}
              strokeWidth={1.5}
              className="fill-background text-background drop-shadow-sm"
            />
          </span>
        )}
      </span>
    );
  }
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-transparent text-foreground/55 transition-colors duration-100 group-hover/result:border-border group-hover/result:text-foreground/70">
      <ResultIcon result={result} />
    </span>
  );
}
