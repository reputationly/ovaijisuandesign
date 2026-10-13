// reference-media-strip.jsx
import {
  API_PATHS,
  AudioLines,
  ChevronLeft,
  ChevronRight$1 as ChevronRight,
  Loader2,
  useTranslation,
} from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  getParamLabel,
  mediaItemId,
  mediaKindForKey,
  mediaValues,
} from "./domestic-param-labels.jsx";
import { Textarea } from "../infra/badge-variants.jsx";
function resolveMediaPath(path, resolveUrl) {
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  if (path.startsWith("asset://")) return void 0;
  return resolveUrl(API_PATHS.serveFile(path));
}
export function parseParamValueLikeOriginal(originalValue, value) {
  if (typeof originalValue === "number") {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : originalValue;
  }
  if (typeof originalValue === "boolean") return value === "true";
  if (Array.isArray(originalValue)) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}
export function BatchPager({ pageIndex, pageCount, onChange }) {
  const { t: translate } = useTranslation();
  if (pageCount <= 1) return null;
  return (
    <div className="ml-auto flex shrink-0 items-center gap-1 text-caption-10 text-muted-foreground">
      <button
        type="button"
        data-action-ui-id="tool-confirm-batch-prev"
        aria-label={translate(
          "chat.toolConfirm.batch.previous",
          "Previous batch item",
        )}
        disabled={pageIndex === 0}
        className="rounded-sm p-0.5 transition-colors hover:bg-muted disabled:opacity-30"
        style={{
          cursor: pageIndex === 0 ? "not-allowed" : "pointer",
        }}
        onClick={() => onChange(Math.max(0, pageIndex - 1))}
      >
        <Icon icon={ChevronLeft} size="xs" strokeWidth={1.5} />
      </button>
      <span className="tabular-nums">
        {pageIndex + 1}/{pageCount}
      </span>
      <button
        type="button"
        data-action-ui-id="tool-confirm-batch-next"
        aria-label={translate("chat.toolConfirm.batch.next", "Next batch item")}
        disabled={pageIndex === pageCount - 1}
        className="rounded-sm p-0.5 transition-colors hover:bg-muted disabled:opacity-30"
        style={{
          cursor: pageIndex === pageCount - 1 ? "not-allowed" : "pointer",
        }}
        onClick={() => onChange(Math.min(pageCount - 1, pageIndex + 1))}
      >
        <Icon icon={ChevronRight} size="xs" strokeWidth={1.5} />
      </button>
    </div>
  );
}
export function EditablePromptBlock({ paramKey, value, pageIndex, onChange }) {
  const items = Array.isArray(value)
    ? value.map((item) => String(item ?? ""))
    : [String(value ?? "")];
  const visibleItems =
    Array.isArray(value) && pageIndex !== void 0
      ? [
          {
            item: items[pageIndex] ?? "",
            absoluteIndex: pageIndex,
          },
        ]
      : items.map((item, absoluteIndex) => ({
          item,
          absoluteIndex,
        }));
  const updateItem = (index, next) => {
    if (Array.isArray(value)) {
      onChange(
        JSON.stringify(items.map((item, itemIndex) => (itemIndex === index ? next : item))),
      );
      return;
    }
    onChange(next);
  };
  return (
    <div
      data-action-ui-id={`tool-confirm-param-${paramKey}`}
      className="flex flex-col gap-2"
    >
      {visibleItems.map(({ item, absoluteIndex }) => (
        <Textarea
          key={`${paramKey}-${absoluteIndex}`}
          value={item}
          rows={3}
          onChange={(changeEvent) => updateItem(absoluteIndex, changeEvent.target.value)}
          className="resize-none !rounded-sm border-border bg-transparent px-3 py-2 !text-body-14 text-muted-foreground shadow-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-transparent placeholder:text-tertiary"
          style={{
            fieldSizing: "content",
          }}
        />
      ))}
    </div>
  );
}
export function ReferenceMediaStrip({
  paramKey,
  value,
  uploadingId,
  onPick,
  resolveUrl,
}) {
  const kind = mediaKindForKey(paramKey);
  const values = mediaValues(value);
  if (!kind || values.length === 0) return null;
  return (
    <div
      data-action-ui-id={`tool-confirm-param-${paramKey}`}
      className="flex flex-col gap-1.5 min-w-0"
    >
      <div className="text-caption-10 font-medium text-muted-foreground">
        {getParamLabel(paramKey)}
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto min-w-0">
        {values.map((path, index) => {
          const src = resolveMediaPath(path, resolveUrl);
          const id = mediaItemId(paramKey, index);
          const uploading = uploadingId === id;
          const fileName = path.split("/").pop() ?? path;
          return (
            <button
              key={`${paramKey}-${path}`}
              type="button"
              data-action-ui-id={`tool-confirm-media-${paramKey}-${index}`}
              title={getParamLabel(paramKey)}
              disabled={uploading}
              className="group/media relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border/40 bg-card text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-60 disabled:cursor-wait"
              onClick={() => onPick(paramKey, index, kind)}
            >
              {kind === "image" && src ? (
                <img
                  src={src}
                  alt={fileName}
                  className="h-full w-full object-contain"
                  loading="lazy"
                  onError={(errorEvent) => {
                    errorEvent.currentTarget.style.display = "none";
                  }}
                />
              ) : kind === "video" && src ? (
                <video
                  src={src}
                  muted={true}
                  playsInline={true}
                  preload="metadata"
                  className="h-full w-full object-contain"
                >
                  <track kind="captions" />
                </video>
              ) : (
                <div className="flex max-w-full flex-col items-center gap-0.5 px-1">
                  <Icon icon={AudioLines} size="md" className="shrink-0" />
                  <span className="max-w-full truncate text-caption-10">
                    {fileName}
                  </span>
                </div>
              )}
              <span className="absolute inset-x-0 bottom-0 hidden bg-black/65 px-1 py-0.5 text-caption-10 leading-none text-white group-hover/media:block">
                {fileName}
              </span>
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Icon
                    icon={Loader2}
                    size="sm"
                    className="animate-spin text-foreground"
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
export function displayName(src, label, assetName) {
  if (assetName) return assetName;
  const clean = src.split(/[?#]/)[0] ?? src;
  return clean.split(/[\\/]/).filter(Boolean).pop() || label || "audio";
}
