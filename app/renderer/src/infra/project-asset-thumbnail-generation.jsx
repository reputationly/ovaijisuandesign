// project-asset-thumbnail-generation.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { PlaybackPlayIcon } from "../workspace/home-service.jsx";
import {
  File$1,
  FileArchive,
  FileAudio,
  FileCode,
  FileText,
  FileVideo,
  Folder,
  ImageOutlineIcon,
} from "../media-editing/package.jsx";
import { classifyFileType, reactExports } from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { FolderTileGlyph } from "./new-folder-dialog.jsx";
import { FileTypeIcon } from "./file-type-icon.jsx";
import { DeferredThumbnailImage } from "../workspace/deferred-thumbnail-image-generation.jsx";
import { cn$2 } from "./dialog-content.jsx";

function VideoThumbnailPlayIndicator({ size: size2 = 14 }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      data-project-asset-video-play="true"
    >
      <PlaybackPlayIcon
        size={size2}
        style={{
          color: "var(--media-overlay-foreground)",
          filter: "drop-shadow(0 1px 2px rgb(0 0 0 / 0.65))",
        }}
      />
    </span>
  );
}

function typeBucketMeta(bucket) {
  switch (bucket) {
    case "folder":
      return {
        bucket,
        Icon: Folder,
        colorClass: "text-foreground/70",
        containerClass: "bg-muted",
      };
    case "image":
      return {
        bucket,
        Icon: ImageOutlineIcon,
        colorClass: "text-foreground/70",
        containerClass: "bg-muted",
      };
    case "video":
      return {
        bucket,
        Icon: FileVideo,
        colorClass: "text-foreground/70",
        containerClass: "bg-muted",
      };
    case "audio":
      return {
        bucket,
        Icon: FileAudio,
        colorClass: "text-foreground/70",
        containerClass: "bg-muted",
      };
    case "archive":
      return {
        bucket,
        Icon: FileArchive,
        colorClass: "text-foreground/70",
        containerClass: "bg-muted",
      };
    case "document":
      return {
        bucket,
        Icon: FileText,
        colorClass: "text-foreground/70",
        containerClass: "bg-muted",
      };
    case "code":
      return {
        bucket,
        Icon: FileCode,
        colorClass: "text-foreground/70",
        containerClass: "bg-muted",
      };
    default:
      return {
        bucket,
        Icon: File$1,
        colorClass: "text-muted-foreground",
        containerClass: "bg-muted",
      };
  }
}

function ProjectAssetThumbnailGeneration({
  name: name2,
  kind,
  typeBucket,
  thumbnailSrc,
  variant,
  muted = false,
  className,
}) {
  const [failed, setFailed] = reactExports.useState(false);
  const isGrid = variant === "grid";
  const canRenderThumbnail =
    kind === "file" &&
    Boolean(thumbnailSrc) &&
    (typeBucket === "image" ||
      typeBucket === "video" ||
      typeBucket === "audio");
  if (!isGrid && kind === "folder") {
    return (
      <FolderTileGlyph className={cn$2(muted && "opacity-50", className)} />
    );
  }
  const containerClassName = cn$2(
    "relative flex shrink-0 items-center justify-center overflow-hidden bg-muted",
    isGrid ? "aspect-[4/3] w-full border-b border-border" : "size-8 rounded-sm",
    className,
  );
  if (failed || !canRenderThumbnail) {
    const FallbackIcon2 = typeBucketMeta(typeBucket).Icon;
    return (
      <span className={containerClassName} aria-hidden="true">
        {kind === "file" ? (
          <FileTypeIcon
            {...classifyFileType({
              filename: name2,
              mediaKind:
                typeBucket === "image" ||
                typeBucket === "video" ||
                typeBucket === "audio"
                  ? typeBucket
                  : void 0,
            })}
            size={isGrid ? 48 : 24}
            decorative={true}
            className={muted ? "opacity-50" : void 0}
          />
        ) : (
          <Icon
            icon={FallbackIcon2}
            size={isGrid ? "lg" : "sm"}
            strokeWidth={isGrid ? 2 : 1.5}
            className={cn$2(
              "text-foreground opacity-50",
              isGrid && "size-8",
              kind === "folder" && "opacity-70",
              muted && "opacity-30",
            )}
            aria-hidden={true}
          />
        )}
      </span>
    );
  }
  return (
    <span className={containerClassName}>
      <DeferredThumbnailImage
        src={thumbnailSrc}
        alt={isGrid ? name2 : ""}
        draggable={false}
        onFailure={() => setFailed(true)}
        className={cn$2(
          "size-full",
          isGrid ? "object-cover" : "object-contain",
        )}
      />
      {typeBucket === "video" ? (
        <VideoThumbnailPlayIndicator size={isGrid ? 24 : 12} />
      ) : null}
    </span>
  );
}

export function ProjectAssetThumbnail(props) {
  return (
    <ProjectAssetThumbnailGeneration
      key={`${props.thumbnailSrc ?? "fallback"}:${props.kind}:${props.typeBucket}:${props.variant}`}
      {...props}
    />
  );
}
