// 项目封面：取工作区缩略图、按可见性延迟加载、没有图时用稳定的渐变占位。
import { reactExports, useQueryClient, useQueries } from "../vendor.js";
import { WORKSPACE_THUMBNAILS_QUERY_ROOT, WORKSPACE_THUMBNAILS_STALE_TIME, fetchWorkspaceThumbnails, workspaceThumbnailsQueryKey } from "../workspace/tool-label-definitions.js";
import { useGatewayReady } from "../infra/inline-rename-input.jsx";
import { FolderOpen } from "../media-editing/package.jsx";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
import { DeferredThumbnailImage } from "../workspace/deferred-thumbnail-image-generation.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
const PROJECT_COVER_TILE_LIMIT = 4;
export function useRefreshProjectCovers() {
  const queryClient = useQueryClient();
  reactExports.useEffect(() => {
    void queryClient.invalidateQueries({
      queryKey: WORKSPACE_THUMBNAILS_QUERY_ROOT,
      refetchType: "none",
    });
  }, [queryClient]);
}
function useProjectCover(project, workspacePaths, enabled) {
  const gatewayReady = useGatewayReady();
  const paths = reactExports.useMemo(
    () => workspacePaths.slice(0, PROJECT_COVER_TILE_LIMIT),
    [workspacePaths],
  );
  const customCover = project?.coverImage;
  const results = useQueries({
    queries: paths.map((path) => ({
      queryKey: workspaceThumbnailsQueryKey(path),
      queryFn: () => fetchWorkspaceThumbnails(path),
      enabled: enabled && gatewayReady && !customCover,
      staleTime: WORKSPACE_THUMBNAILS_STALE_TIME,
      retry: false,
      refetchOnWindowFocus: false,
    })),
  });
  if (customCover)
    return [
      {
        src: customCover,
        mediaType: "image",
      },
    ];
  return results
    .map((result) => result.data?.[0])
    .filter((thumbnail) => Boolean(thumbnail))
    .map((thumbnail) => ({
      src: thumbnail.src,
      mediaType: thumbnail.mediaType,
    }));
}
const PLACEHOLDER_GRADIENTS = [
  "from-[color-mix(in_oklab,var(--chart-1)_28%,transparent)] to-[color-mix(in_oklab,var(--chart-1)_8%,transparent)]",
  "from-[color-mix(in_oklab,var(--chart-2)_28%,transparent)] to-[color-mix(in_oklab,var(--chart-2)_8%,transparent)]",
  "from-[color-mix(in_oklab,var(--chart-3)_28%,transparent)] to-[color-mix(in_oklab,var(--chart-3)_8%,transparent)]",
  "from-[color-mix(in_oklab,var(--chart-4)_28%,transparent)] to-[color-mix(in_oklab,var(--chart-4)_8%,transparent)]",
  "from-[color-mix(in_oklab,var(--chart-5)_28%,transparent)] to-[color-mix(in_oklab,var(--chart-5)_8%,transparent)]",
];
function stableGradient(seed) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 1000003;
  }
  return PLACEHOLDER_GRADIENTS[hash % PLACEHOLDER_GRADIENTS.length] ?? PLACEHOLDER_GRADIENTS[0];
}
const COVER_VISIBILITY_ROOT_MARGIN = "96px 0px";
const COVER_VISIBILITY_STABLE_DELAY_MS = 240;
function useStableVisibility() {
  const hostRef = reactExports.useRef(null);
  const [visible, setVisible] = reactExports.useState(
    () => typeof IntersectionObserver === "undefined",
  );
  reactExports.useEffect(() => {
    if (visible || typeof IntersectionObserver === "undefined") return;
    const host = hostRef.current;
    if (!host) return;
    let timer = null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          if (timer !== null) {
            window.clearTimeout(timer);
            timer = null;
          }
          return;
        }
        if (timer !== null) return;
        timer = window.setTimeout(() => {
          timer = null;
          setVisible(true);
          observer.disconnect();
        }, COVER_VISIBILITY_STABLE_DELAY_MS);
      },
      {
        rootMargin: COVER_VISIBILITY_ROOT_MARGIN,
      },
    );
    observer.observe(host);
    return () => {
      observer.disconnect();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [visible]);
  return [hostRef, visible];
}
function CoverTile({ tile }) {
  return (
    <div className="relative h-full w-full min-w-0 overflow-hidden bg-muted">
      <DeferredThumbnailImage
        src={tile.src}
        alt=""
        draggable={false}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
export function ProjectCover({ project, workspacePaths, className }) {
  const [hostRef, visible] = useStableVisibility();
  const tiles = useProjectCover(project, workspacePaths, visible);
  const gradient = stableGradient(project.id);
  return (
    <div ref={hostRef} className={cn("relative h-full w-full overflow-hidden", className)}>
      {tiles.length === 0 ? (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center bg-gradient-to-br",
            gradient,
          )}
          data-action-ui-id="project.cover-placeholder"
        >
          <FolderOpen size={28} strokeWidth={1.2} className="text-foreground/25" />
        </div>
      ) : tiles.length === 1 ? (
        <CoverTile tile={tiles[0]} />
      ) : (
        <div
          className={cn(
            "grid h-full w-full",
            tiles.length === 2 && "grid-cols-2",
            tiles.length === 3 && "grid-cols-2 grid-rows-2",
            tiles.length >= 4 && "grid-cols-2 grid-rows-2",
          )}
          data-action-ui-id="project.cover-collage"
        >
          {tiles.map((tile, index) => (
            <div
              key={tile.src}
              className={cn(
                "relative min-h-0 min-w-0 overflow-hidden",
                // 3 tiles: first one spans the full left column.
                tiles.length === 3 && index === 0 && "row-span-2",
              )}
            >
              <CoverTile tile={tile} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
