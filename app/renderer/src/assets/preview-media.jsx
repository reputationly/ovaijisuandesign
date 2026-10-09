// preview-media.jsx
import { withThumbnail } from "../workspace/tool-label-definitions.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { formatTime$2 } from "../media-editing/package.jsx";
import {
  classifyFileType,
  guardAccountSubmission,
  reactExports,
} from "../vendor.js";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import { DeferredThumbnailImage } from "../workspace/deferred-thumbnail-image-generation.jsx";
import { PreviewCardContent } from "../text-editor/use-placeholder-asset-source.jsx";
import { PRESET_COLOR_NAME_KEYS } from "../infra/parse-connector-selection.js";
import { isSubtitleFileName } from "../canvas/is-reexecutable-generation-node.js";

const PREVIEW_IMAGE_DISPLAY_PX = 256;

export const STRICT_THUMBNAIL_MAX_RETRIES = 2;

export const STRICT_THUMBNAIL_RETRY_DELAY_MS = 2e3;

export function withStrictThumbnail(url2, width) {
  if (!url2) return void 0;
  try {
    new URL(url2);
    return withThumbnail(url2, width, {
      format: "webp",
      fallback: "error",
    });
  } catch {
    return void 0;
  }
}

export function DurationBadge({ resource }) {
  if (!resource.durationSec || resource.durationSec <= 0) return null;
  if (resource.type !== "audio" && resource.type !== "video") return null;
  return (
    <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-foreground/60 px-1 py-0.5 text-[10px] font-medium leading-none text-background tabular-nums">
      {formatTime$2(resource.durationSec, true)}
    </span>
  );
}

function PreviewMedia({ resource }) {
  const [failedUrl, setFailedUrl] = reactExports.useState(null);
  const failed = failedUrl === resource.url;
  const wrap2 =
    "relative flex aspect-video w-full items-center justify-center overflow-hidden bg-muted";
  if (resource.type === "image" && !failed) {
    return (
      <div className={wrap2}>
        <DeferredThumbnailImage
          src={withStrictThumbnail(resource.url, PREVIEW_IMAGE_DISPLAY_PX)}
          onFailure={() => setFailedUrl(resource.url)}
          alt=""
          className="max-h-full max-w-full object-contain"
          priority="interactive"
          maxRetries={STRICT_THUMBNAIL_MAX_RETRIES}
          retryDelayMs={STRICT_THUMBNAIL_RETRY_DELAY_MS}
        />
      </div>
    );
  }
  if (resource.type === "video" && !failed) {
    return (
      <div className={wrap2}>
        <video
          src={resource.url}
          onError={() => setFailedUrl(resource.url)}
          muted={true}
          playsInline={true}
          preload="metadata"
          className="max-h-full max-w-full object-contain"
        />
        <DurationBadge resource={resource} />
      </div>
    );
  }
  return (
    <div className={wrap2}>
      <FileTypeIcon
        {...classifyFileType({
          filename: resource.name,
        })}
        size={64}
        decorative={true}
      />
      <DurationBadge resource={resource} />
    </div>
  );
}

function formatBytes(n2) {
  if (n2 < 1024) return `${n2} B`;
  if (n2 < 1024 * 1024) return `${(n2 / 1024).toFixed(0)} KB`;
  return `${(n2 / (1024 * 1024)).toFixed(1)} MB`;
}

export function describeMeta(r2) {
  const bits = [];
  if (r2.width && r2.height) bits.push(`${r2.width}×${r2.height}`);
  if (r2.durationSec !== void 0) bits.push(`${r2.durationSec.toFixed(1)}s`);
  if (r2.fileSize !== void 0) bits.push(formatBytes(r2.fileSize));
  return bits.join(" · ") || r2.type.toUpperCase();
}

export function AssetPreviewPopup({ resource, side = "right" }) {
  return (
    <PreviewCardContent
      side={side}
      sideOffset={8}
      align="center"
      collisionPadding={12}
      positionerClassName="z-10002"
      className="w-64 pointer-events-none"
    >
      <div className="flex flex-col gap-2 p-2">
        <PreviewMedia resource={resource} />
        <div className="flex flex-col gap-0.5">
          <span
            className="truncate text-[11px] font-medium text-foreground"
            title={resource.name}
          >
            {resource.name}
          </span>
          <span className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
            {describeMeta(resource)}
          </span>
          {resource.path && resource.path !== resource.name && (
            <span
              className="truncate text-[10px] text-muted-foreground/70"
              title={resource.path}
            >
              {resource.path}
            </span>
          )}
        </div>
      </div>
    </PreviewCardContent>
  );
}

export const VIEW_STORAGE_KEY = "assetPicker.view";

export const TYPE_FILTER_ALL = "__all__";

export const TAG_FILTER_ALL = "__all_tags__";

export function finitePositive(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : void 0;
}

export function formatImageMinDimensionLimit(constraints2) {
  const minWidth = finitePositive(constraints2?.imageMinWidth);
  const minHeight = finitePositive(constraints2?.imageMinHeight);
  if (minWidth !== void 0 && minHeight !== void 0)
    return `${minWidth}×${minHeight}`;
  if (minWidth !== void 0) return `${minWidth}px wide`;
  if (minHeight !== void 0) return `${minHeight}px tall`;
  return "";
}

export function formatSeconds(value, fallback) {
  if (value === void 0 || !Number.isFinite(value)) return fallback;
  return String(value);
}

export function formatExceededDuration(value) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}s`;
}

export function tagLabel(tag, t2) {
  if (tag.name) return tag.name;
  return (
    t2(tag.legacyNameKey ?? PRESET_COLOR_NAME_KEYS[tag.id] ?? "") || tag.id
  );
}

export function normaliseAssetType(raw2, fileName) {
  if (fileName && isSubtitleFileName(fileName)) return "subtitle";
  switch (raw2) {
    case "image":
    case "video":
    case "audio":
    case "text":
      return raw2;
    default:
      return "file";
  }
}

function groupId(kind) {
  const decision = guardAccountSubmission(kind);
  if (!decision.allowed) return null;
  return decision.mode === "CANONICAL" ? decision.scope.groupId : void 0;
}

function send(kind, sender, message2) {
  const requestGroupId = groupId(kind);
  return requestGroupId === null
    ? false
    : sender({
        ...message2,
        group_id: requestGroupId,
      });
}

export const accountScopedMessage = {
  groupId,
  send,
};
