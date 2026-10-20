// ==== 逐文件收敛 ====

// ==== 逐文件收敛 ====

// ==== 逐文件收敛 ====
import { useMediaMuted } from "../canvas-v3/canvas-v3-hooks.js";
// asset-panel-overlay-host.jsx
import WaveSurfer from "wavesurfer.js";
import { API_PATHS } from "../infra/workspace-gateway.js";
import { BROWSER_ASSET_SOURCE_METADATA_KEYS } from "../infra/shared-runtime.js";
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight$1 as ChevronRight, Crosshair, Network, Volume2 as Volume } from "../media-editing/lucide-icon-wraps.js";
import { classifyFileType } from "../infra/file-type.js";
import { PopoverPopup, PopoverPortal, PopoverPositioner, PopoverRoot, PreviewCardPopup, PreviewCardPortal, PreviewCardPositioner, PreviewCardRoot } from "../infra/base-ui.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Package, Sprout, VolumeX } from "../media-editing/package.jsx";
import {
  useGatewayFetch,
  useGatewayScopeKey,
  useGatewayUrl,
} from "../generation/use-model-catalog-scope-key.js";
import { Button, mergeTailwindClasses as cn } from "../infra/dialog-content.jsx";
import { Skeleton } from "../team/use-wallet-query.jsx";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import { withThumbnail } from "../workspace/tool-label-definitions.js";
import {
  formatDuration,
  formatFileSizeCompact,
} from "../workspace/set-home-widget-dev-preview-mode.js";
import { ROLE_DISPLAY_NAMES } from "../infra/parse-connector-selection.js";
import { Spinner } from "../team/use-team-transactions-feed-query.jsx";
import {
  useAssetDescendants,
  useAssetInputs,
  useAssetLineage,
} from "../settings/use-asset-lineage.js";
import { VideoPlayer } from "../media-editing/video-player-inner.jsx";


const MIN_SCALE = 0.5;
function wheelZoomScale(scale, event) {
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 800 : 1;
  const delta = Math.max(-120, Math.min(120, event.deltaY * unit));
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * Math.exp(-delta * 18e-4)));
}

import { Minus as Minus$1, Plus as Plus$3, X as X$8 } from "lucide-react";
import { Button as Button$3 } from "../infra/dialog-content.jsx";
import { DialogBackdrop, DialogPopup, DialogRoot } from "../infra/base-ui.js";
import { DialogTitle as DialogTitle$3 } from "../infra/badge-variants.jsx";
import { DialogClose as DialogClose$1, DialogPortal as DialogPortal$3 } from "../infra/gateway-http-error.jsx";
import { Maximize } from "../canvas-v3/main-exports.js";

// ---- 第 201 轮：从产物取回（参考 bundle 417429–417663，232 行）----
const MAX_SCALE = 10;
const BUTTON_ZOOM_FACTOR = 1.3;



function ImageFullscreenPreview(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ImageFullscreenContent, { ...props }, props.previewKey ?? props.src);
}

function ImageFullscreenContent({ src, name: name2, statusLabel: statusLabel2, onClose }) {
  const { t: t2 } = useTranslation();
  const [view2, setView] = reactExports.useState({ scale: 1, x: 0, y: 0 });
  const [dragging, setDragging] = reactExports.useState(false);
  const imageRef = reactExports.useRef(null);
  const [frame2, setFrame2] = reactExports.useState(null);
  const drag2 = reactExports.useRef(void 0);
  reactExports.useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [onClose]);
  reactExports.useEffect(() => {
    if (!frame2) return;
    const handleWheel = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!src) return;
      const rect = frame2.getBoundingClientRect();
      const x2 = event.clientX - rect.left - rect.width / 2;
      const y4 = event.clientY - rect.top - rect.height / 2;
      setView((current2) => {
        const scale2 = wheelZoomScale(current2.scale, event);
        const ratio = 1 - scale2 / current2.scale;
        return {
          scale: scale2,
          x: scale2 <= 1 ? 0 : current2.x + (x2 - current2.x) * ratio,
          y: scale2 <= 1 ? 0 : current2.y + (y4 - current2.y) * ratio
        };
      });
    };
    frame2.addEventListener("wheel", handleWheel, { passive: false });
    return () => frame2.removeEventListener("wheel", handleWheel);
  }, [frame2, src]);
  function handleZoomIn() {
    setView((current2) => ({
      ...current2,
      scale: Math.min(MAX_SCALE, current2.scale * BUTTON_ZOOM_FACTOR)
    }));
  }
  function handleZoomOut() {
    setView((current2) => {
      const scale2 = Math.max(1, current2.scale / BUTTON_ZOOM_FACTOR);
      return scale2 <= 1 ? { scale: 1, x: 0, y: 0 } : { ...current2, scale: scale2 };
    });
  }
  function handleReset() {
    setView({ scale: 1, x: 0, y: 0 });
  }
  function handleDoubleClick2() {
    const image2 = imageRef.current;
    if (!image2?.naturalWidth || !image2.width) return;
    setView((current2) => ({
      scale: current2.scale === 1 ? image2.naturalWidth / image2.width : 1,
      x: 0,
      y: 0
    }));
  }
  function handlePointerDown(event) {
    if (!src || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    drag2.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      imageX: view2.x,
      imageY: view2.y
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }
  function handlePointerMove(event) {
    const start2 = drag2.current;
    if (!start2 || start2.pointerId !== event.pointerId) return;
    setView((current2) => ({
      ...current2,
      x: start2.imageX + event.clientX - start2.x,
      y: start2.imageY + event.clientY - start2.y
    }));
  }
  function handlePointerUp(event) {
    if (drag2.current?.pointerId !== event.pointerId) return;
    drag2.current = void 0;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DialogRoot, { open: true, onOpenChange: (open) => !open && onClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogPortal$3, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DialogBackdrop,
      {
        forceRender: true,
        className: "fixed inset-0 z-[60] bg-background/85 backdrop-blur-sm",
        "data-action-ui-id": "resource-image-fullscreen-backdrop"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      DialogPopup,
      {
        className: "no-drag fixed inset-0 z-[60] flex items-center justify-center overflow-hidden text-foreground outline-none",
        "data-action-ui-id": "resource-image-fullscreen",
        onClick: (event) => {
          if (event.target === event.currentTarget) onClose();
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle$3, { className: "sr-only", children: name2 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            DialogClose$1,
            {
              render: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button$3,
                {
                  variant: "ghost",
                  size: "icon-lg",
                  className: "absolute right-8 top-8 z-20 rounded-full bg-background/70",
                  "aria-label": t2("common.close"),
                  "data-action-ui-id": "resource-image-fullscreen-close"
                }
              ),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$8, { size: 16, absoluteStrokeWidth: true, strokeWidth: 1.25, className: "size-4" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pointer-events-none relative flex max-h-full max-w-full flex-col items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pointer-events-auto relative z-10 flex items-center gap-1 rounded-full bg-background/70 px-2 py-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button$3,
                {
                  variant: "ghost",
                  size: "icon-sm",
                  className: "rounded-full",
                  "aria-label": t2("canvas.zoomOut"),
                  "data-action-ui-id": "resource-image-fullscreen-zoom-out",
                  disabled: !src,
                  onClick: handleZoomOut,
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Minus$1, { size: 16, absoluteStrokeWidth: true, strokeWidth: 1.25, className: "size-4" })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button$3,
                {
                  variant: "ghost",
                  className: "min-w-12 rounded-full px-1 tabular-nums active:translate-y-0",
                  "aria-label": t2("canvas.fitToView"),
                  "data-action-ui-id": "resource-image-fullscreen-zoom-reset",
                  disabled: !src,
                  onClick: handleReset,
                  children: [
                    Math.round(view2.scale * 100),
                    "%"
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button$3,
                {
                  variant: "ghost",
                  size: "icon-sm",
                  className: "rounded-full",
                  "aria-label": t2("canvas.zoomIn"),
                  "data-action-ui-id": "resource-image-fullscreen-zoom-in",
                  disabled: !src,
                  onClick: handleZoomIn,
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus$3, { size: 16, absoluteStrokeWidth: true, strokeWidth: 1.25, className: "size-4" })
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                ref: setFrame2,
                className: `pointer-events-auto relative touch-none ${!src ? "cursor-default" : dragging ? "cursor-grabbing" : "cursor-grab"}`,
                "data-action-ui-id": "resource-image-fullscreen-frame",
                onDoubleClick: handleDoubleClick2,
                onPointerDown: handlePointerDown,
                onPointerMove: handlePointerMove,
                onPointerUp: handlePointerUp,
                onPointerCancel: handlePointerUp,
                children: src ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "img",
                  {
                    ref: imageRef,
                    src,
                    alt: name2,
                    draggable: false,
                    className: "block max-h-[calc(80vh-5.5rem)] max-w-[80vw] select-none rounded-lg object-contain shadow-lg",
                    style: { transform: `translate(${view2.x}px, ${view2.y}px) scale(${view2.scale})` }
                  }
                ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { role: "status", className: "p-8 text-sm text-muted-foreground", children: statusLabel2 ?? t2("common.loading") })
              }
            )
          ] })
        ]
      }
    )
  ] }) });
}

function ImageFullscreenButton({
  src,
  name: name2
}) {
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button$3,
      {
        variant: "ghost",
        size: "icon",
        className: "absolute right-2 top-2 z-20 rounded-lg bg-background/70",
        "aria-label": t2("canvas.fullscreenPreview"),
        title: t2("canvas.fullscreenPreview"),
        "data-action-ui-id": "resource-image-expand",
        onClick: () => setOpen(true),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Maximize, { size: 16, absoluteStrokeWidth: true, strokeWidth: 1.25, className: "size-4" })
      }
    ),
    open && /* @__PURE__ */ jsxRuntimeExports.jsx(ImageFullscreenPreview, { src, name: name2, onClose: () => setOpen(false) })
  ] });
}
function formatModifiedAt(value) {
  if (value == null || value === "") return "";
  let date;
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1e3 : value;
    date = new Date(ms);
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function browserAssetSourceWebsite(metadata) {
  const pageUrl = metadata?.[BROWSER_ASSET_SOURCE_METADATA_KEYS.pageUrl];
  if (typeof pageUrl !== "string" || !pageUrl) return "";
  try {
    const url = new URL(pageUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.hostname.replace(/^www\./iu, "");
  } catch {
    return "";
  }
}
function pickString(meta, key) {
  const stringValue = meta?.[key];
  return typeof stringValue === "string" && stringValue ? stringValue : void 0;
}
function pickNumber(meta, key) {
  const numberValue = meta?.[key];
  return typeof numberValue === "number" && Number.isFinite(numberValue) ? numberValue : void 0;
}
function extOf(detail2, media) {
  const base = detail2.version?.relativePath.split(/[/\\]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot > 0) return base.slice(dot + 1).toUpperCase();
  const mime = media?.mimeType ?? "";
  const slash2 = mime.indexOf("/");
  return slash2 > 0 ? mime.slice(slash2 + 1).toUpperCase() : "";
}
function dimensions(media) {
  if (media?.width && media?.height) return `${media.width} × ${media.height}`;
  return "";
}
function modifiedAt(asset) {
  const mtime = asset.metadata?.mtime;
  if (typeof mtime === "number" || typeof mtime === "string") {
    const formatted = formatModifiedAt(mtime);
    if (formatted) return formatted;
  }
  return formatModifiedAt(asset.time);
}
function imageRows(asset) {
  return [
    {
      labelKey: "dimensions",
      labelFallback: "Dimensions",
      value: dimensions(asset),
    },
    {
      labelKey: "format",
      labelFallback: "Format",
      value: extOf(asset),
    },
    {
      labelKey: "size",
      labelFallback: "Size",
      value: formatFileSizeCompact(asset.fileSize),
    },
    {
      labelKey: "modifiedAt",
      labelFallback: "Modified",
      value: modifiedAt(asset),
    },
  ];
}
function videoRows(asset, _unusedArg) {
  const fps = pickNumber(asset.metadata, "fps");
  const codec = pickString(asset.metadata, "codec");
  const bitRate = pickNumber(asset.metadata, "bitRate");
  return [
    {
      labelKey: "dimensions",
      labelFallback: "Resolution",
      value: dimensions(asset),
    },
    {
      labelKey: "duration",
      labelFallback: "Duration",
      value: formatDuration(asset.duration),
    },
    {
      labelKey: "fps",
      labelFallback: "Frame rate",
      value: fps != null ? `${fps} fps` : "",
    },
    {
      labelKey: "codec",
      labelFallback: "Codec",
      value: codec ?? "",
    },
    {
      labelKey: "bitrate",
      labelFallback: "Bitrate",
      value: bitRate != null ? `${Math.round(bitRate / 1e3)} kbps` : "",
    },
    {
      labelKey: "size",
      labelFallback: "Size",
      value: formatFileSizeCompact(asset.fileSize),
    },
    {
      labelKey: "modifiedAt",
      labelFallback: "Modified",
      value: modifiedAt(asset),
    },
  ];
}
function fileRows(asset) {
  const pageCount = pickNumber(asset.metadata, "pageCount");
  const wordCount = pickNumber(asset.metadata, "wordCount");
  return [
    {
      labelKey: "format",
      labelFallback: "Format",
      value: extOf(asset),
    },
    {
      labelKey: "pageCount",
      labelFallback: "Pages",
      // 0 pages is a real (degenerate) value — explicitly check for null
      // rather than relying on truthy coercion that would hide a 0.
      value: pageCount != null ? `${pageCount}` : "",
    },
    {
      labelKey: "wordCount",
      labelFallback: "Words",
      value: wordCount != null ? `${wordCount.toLocaleString()}` : "",
    },
    {
      labelKey: "size",
      labelFallback: "Size",
      value: formatFileSizeCompact(asset.fileSize),
    },
    {
      labelKey: "modifiedAt",
      labelFallback: "Modified",
      value: modifiedAt(asset),
    },
  ];
}
const LINEAGE_DEPTH = 5;
function Section({ title, loading, error, children }) {
  const { t: translate } = useTranslation();
  const [collapsed, setCollapsed] = reactExports.useState(false);
  const Arrow = collapsed ? ChevronRight : ChevronDown;
  return (
    <section className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setCollapsed((isCollapsed) => !isCollapsed)}
        className="flex items-center gap-1 text-hl-text-02 hover:text-hl-text-01 transition-colors text-xs font-medium"
      >
        <Arrow size={12} strokeWidth={1.5} className="shrink-0" />
        <span>{title}</span>
        {loading && <Spinner className="size-3 ml-1" />}
      </button>
      {!collapsed && (
        <div className="pl-3.5">
          {error ? (
            <div className="text-hl-error text-xs py-1">
              {translate("lineage.loadError", {
                message: error.message,
              })}
            </div>
          ) : (
            children
          )}
        </div>
      )}
    </section>
  );
}
function RoleChip({ role }) {
  const { t } = useTranslation();
  const fallback = ROLE_DISPLAY_NAMES[role] ?? role;
  const display = t(`assetRole.${role.toLowerCase()}`, fallback);
  return <span className="shrink-0 px-1 py-0 text-[10px] text-hl-text-03 bg-hl-alpha-04 rounded">{display}</span>;
}
function AssetRow({
  assetId,
  path,
  name: assetName,
  status,
  role: role2,
  depthHint,
  onSelectAsset,
}) {
  const isMissing = status === "missing";
  const display = assetName ?? path ?? assetId;
  return (
    <button
      type="button"
      onClick={() => onSelectAsset?.(assetId)}
      disabled={!onSelectAsset}
      className={cn(
        "flex items-center gap-1.5 w-full px-1 py-0.5 text-left rounded-sm transition-colors",
        onSelectAsset
          ? "cursor-pointer hover:bg-hl-alpha-08 text-hl-text-01"
          : "cursor-default text-hl-text-02",
        isMissing && "opacity-50",
      )}
      title={path ?? void 0}
    >
      <span className="truncate flex-1">{display}</span>
      {depthHint !== void 0 && depthHint > 1 && (
        <span className="shrink-0 text-hl-text-03 text-[10px]">
          +{depthHint - 1}
        </span>
      )}
      <RoleChip role={role2} />
    </button>
  );
}
function EntityTypeChip({ type }) {
  const { t: translate } = useTranslation();
  const display = translate(`assetCenter.types.${type}`);
  return (
    <span className="shrink-0 px-1 py-0 text-[10px] text-hl-text-03 bg-hl-alpha-04 rounded">
      {display}
    </span>
  );
}
function AttachmentRow({ node, role : role2}) {
  const { t: translate } = useTranslation();
  if (node.parent_attachment_entity_name && node.parent_attachment_filename) {
    return (
      <div
        className="flex items-center gap-1.5 w-full px-1 py-0.5 text-hl-text-01"
        title={node.parent_attachment_entity_id ?? void 0}
        data-action-ui-id="lineage.attachment-row-live"
      >
        <Package size={11} className="shrink-0 text-hl-text-03" />
        <span className="truncate flex-1">
          {translate("lineage.attachmentEntityLabel", {
            entityName: node.parent_attachment_entity_name,
            filename: node.parent_attachment_filename,
          })}
        </span>
        {node.parent_attachment_entity_type && (
          <EntityTypeChip type={node.parent_attachment_entity_type} />
        )}
        <RoleChip role={role2} />
      </div>
    );
  }
  return (
    <div
      className="flex items-center gap-1.5 text-hl-text-03 italic py-0.5"
      data-action-ui-id="lineage.attachment-row-broken"
    >
      <AlertTriangle size={11} className="shrink-0" />
      <span className="truncate">{translate("lineage.brokenAttachment")}</span>
      <RoleChip role={role2} />
    </div>
  );
}
function UpstreamRow({ node, onSelectAsset }) {
  const { t: translate } = useTranslation();
  if (node.parent_id !== null) {
    return (
      <AssetRow
        assetId={node.parent_id}
        path={node.parent_path}
        name={node.parent_name}
        status={node.parent_status}
        role={node.role}
        onSelectAsset={onSelectAsset}
      />
    );
  }
  if (node.parent_attachment_id) {
    return <AttachmentRow node={node} role={node.role} />;
  }
  const fallbackPath =
    typeof node.metadata?.parent_path === "string"
      ? node.metadata.parent_path
      : null;
  return (
    <div className="flex items-center gap-1.5 text-hl-text-03 italic py-0.5">
      <AlertTriangle size={11} className="shrink-0" />
      <span className="truncate">
        {fallbackPath
          ? translate("lineage.brokenParentWithPath", {
              path: fallbackPath,
            })
          : translate("lineage.brokenParent")}
      </span>
      {node.role && <RoleChip role={node.role} />}
    </div>
  );
}
function UpstreamLevel({ depth, nodes, onSelectAsset }) {
  const { t: translate } = useTranslation();
  const [collapsed, setCollapsed] = reactExports.useState(false);
  const Arrow = collapsed ? ChevronRight : ChevronDown;
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setCollapsed((isCollapsed) => !isCollapsed)}
        className="flex items-center gap-1 text-hl-text-03 hover:text-hl-text-02 transition-colors text-xs"
      >
        <Arrow size={11} className="shrink-0" />
        <span>
          {translate("lineage.depthLabel", {
            depth,
            count: nodes.length,
          })}
        </span>
      </button>
      {!collapsed && (
        <ul className="flex flex-col pl-3.5">
          {nodes.map((node) => (
            <li key={node.id}>
              <UpstreamRow node={node} onSelectAsset={onSelectAsset} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
function InputRow({ node, onSelectAsset }) {
  const { t: translate } = useTranslation();
  if (node.parent_id !== null) {
    return (
      <AssetRow
        assetId={node.parent_id}
        path={node.parent_path}
        name={node.parent_name}
        status={node.parent_status}
        role={node.role}
        onSelectAsset={onSelectAsset}
      />
    );
  }
  if (node.parent_attachment_id) {
    return <AttachmentRow node={node} role={node.role} />;
  }
  return (
    <div className="flex items-center gap-1.5 text-hl-text-03 italic py-0.5">
      <AlertTriangle size={11} className="shrink-0" />
      <span className="truncate">{translate("lineage.brokenParent")}</span>
      <RoleChip role={node.role} />
    </div>
  );
}
function InputsView({ nodes, onSelectAsset }) {
  const { t: translate } = useTranslation();
  if (nodes.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-hl-text-03 italic py-1">
        <Sprout size={11} className="shrink-0" />
        <span>{translate("lineage.noInputs")}</span>
      </div>
    );
  }
  return (
    <ul className="flex flex-col">
      {nodes.map((node) => (
        <li key={node.id}>
          <InputRow node={node} onSelectAsset={onSelectAsset} />
        </li>
      ))}
    </ul>
  );
}
function StandaloneHint({ variant = "upstream" }) {
  const { t: translate } = useTranslation();
  const text =
    variant === "upstream"
      ? translate("lineage.standaloneUpstream")
      : translate("lineage.standaloneDownstream");
  return (
    <div className="flex items-start gap-1.5 text-hl-text-03 italic py-1">
      <Sprout size={11} className="shrink-0 mt-0.5" />
      <span className="leading-snug">{text}</span>
    </div>
  );
}
function UpstreamView({ data, maxDepth, onSelectAsset }) {
  const { t: translate } = useTranslation();
  const groupedByDepth = reactExports.useMemo(() => {
    if (!data) return [];
    const buckets = new Map();
    for (const node of data.nodes) {
      const arr = buckets.get(node.depth) ?? [];
      arr.push(node);
      buckets.set(node.depth, arr);
    }
    return [...buckets.entries()].sort(([leftDepth], [rightDepth]) => leftDepth - rightDepth);
  }, [data]);
  if (!data) return null;
  if (data.nodes.length === 0) {
    return <StandaloneHint />;
  }
  const reachedCap = data.nodes.some((node) => node.depth >= maxDepth);
  return (
    <div className="flex flex-col gap-1">
      {groupedByDepth.map(([nodeDepth, nodes]) => (
        <UpstreamLevel
          key={nodeDepth}
          depth={nodeDepth}
          nodes={nodes}
          onSelectAsset={onSelectAsset}
        />
      ))}
      {reachedCap && (
        <div className="text-hl-text-03 text-xs italic pl-1">
          {translate("lineage.depthTruncated", {
            depth: maxDepth,
          })}
        </div>
      )}
    </div>
  );
}
function DescendantsView({ nodes, maxDepth, onSelectAsset }) {
  const { t: translate } = useTranslation();
  if (nodes.length === 0) {
    return <StandaloneHint variant="downstream" />;
  }
  const reachedCap = nodes.some((node) => node.depth >= maxDepth);
  return (
    <div className="flex flex-col gap-0.5">
      <ul className="flex flex-col">
        {nodes.map((node) => (
          <li key={node.id}>
            <AssetRow
              assetId={node.child_id}
              path={node.child_path}
              name={node.child_name}
              status={node.child_status}
              role={node.role}
              depthHint={node.depth}
              onSelectAsset={onSelectAsset}
            />
          </li>
        ))}
      </ul>
      {reachedCap && (
        <div className="text-hl-text-03 text-xs italic pl-1">
          {translate("lineage.depthTruncated", {
            depth: maxDepth,
          })}
        </div>
      )}
    </div>
  );
}
function LineageTree({
  assetId,
  depth = LINEAGE_DEPTH,
  onSelectAsset,
  className,
}) {
  const { t: translate } = useTranslation();
  const lineage = useAssetLineage(assetId, {
    depth,
  });
  const descendants = useAssetDescendants(assetId, {
    depth,
  });
  const inputs = useAssetInputs(assetId);
  if (!assetId) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-xs text-hl-text-03 py-6",
          className,
        )}
      >
        {translate("lineage.noSelection")}
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col gap-4 text-xs", className)}>
      <Section
        title={translate("lineage.upstreamTitle")}
        loading={lineage.isLoading}
        error={lineage.error}
      >
        <UpstreamView
          data={lineage.data}
          maxDepth={depth}
          onSelectAsset={onSelectAsset}
        />
      </Section>
      <Section
        title={translate("lineage.downstreamTitle")}
        loading={descendants.isLoading}
        error={descendants.error}
      >
        <DescendantsView
          nodes={descendants.data?.nodes ?? []}
          maxDepth={depth}
          onSelectAsset={onSelectAsset}
        />
      </Section>
      <Section
        title={translate("lineage.inputsTitle")}
        loading={inputs.isLoading}
        error={inputs.error}
      >
        <InputsView
          nodes={inputs.data?.inputs ?? []}
          onSelectAsset={onSelectAsset}
        />
      </Section>
    </div>
  );
}
const STALE_TIME_MS = 5 * 60 * 1e3;
function useAssetMetadata(asset, { enabled }) {
  const gatewayFetch = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  return useQuery({
    // `?? null` keeps the queryKey stable & non-warning when asset.id is
    // missing — TanStack Query complains about `undefined` slots in keys.
    queryKey: ["asset-metadata", scopeKey, asset.id ?? null],
    enabled: Boolean(asset.id),
    staleTime: STALE_TIME_MS,
    queryFn: async () => {
      const resp = await gatewayFetch(API_PATHS.assetMetadata(asset.id));
      return await resp.json();
    },
  });
}
const DEFAULT_CHARS = 200;
const TEXT_PREVIEW_STALE_TIME_MS = 5 * 60 * 1e3;
function useAssetTextPreview(
  asset,
  { enabled, chars = DEFAULT_CHARS },
) {
  const gatewayFetch = useGatewayFetch();
  const scopeKey = useGatewayScopeKey();
  return useQuery({
    queryKey: ["asset-text-preview", scopeKey, asset.path, chars],
    enabled: asset.type === "text",
    staleTime: TEXT_PREVIEW_STALE_TIME_MS,
    queryFn: async () => {
      const resp = await gatewayFetch(
        API_PATHS.assetTextPreview(asset.path, chars),
      );
      return await resp.json();
    },
  });
}
function RowItem({ row }) {
  return (
    <>
      <dt className="text-foreground/30 opacity-70">{row.label}</dt>
      <dd className="text-foreground/70 truncate" title={row.value}>
        {row.value}
      </dd>
    </>
  );
}
function audioRows(asset, translate) {
  const sampleRate = pickNumber(asset.metadata, "sampleRate");
  const channels = pickNumber(asset.metadata, "channels");
  const bitRate = pickNumber(asset.metadata, "bitRate");
  const channelLabel =
    channels === 1
      ? translate("assetPreview.meta.mono", {
          defaultValue: "Mono",
        })
      : channels === 2
        ? translate("assetPreview.meta.stereo", {
            defaultValue: "Stereo",
          })
        : channels != null
          ? translate("assetPreview.meta.channelCount", {
              defaultValue: "{{count}} ch",
              count: channels,
            })
          : "";
  return [
    {
      labelKey: "duration",
      labelFallback: "Duration",
      value: formatDuration(asset.duration),
    },
    {
      labelKey: "sampleRate",
      labelFallback: "Sample rate",
      value: sampleRate != null ? `${sampleRate} Hz` : "",
    },
    {
      labelKey: "channels",
      labelFallback: "Channels",
      value: channelLabel,
    },
    {
      labelKey: "bitrate",
      labelFallback: "Bitrate",
      value: bitRate != null ? `${Math.round(bitRate / 1e3)} kbps` : "",
    },
    {
      labelKey: "size",
      labelFallback: "Size",
      value: formatFileSizeCompact(asset.fileSize),
    },
    {
      labelKey: "modifiedAt",
      labelFallback: "Modified",
      value: modifiedAt(asset),
    },
  ];
}
function buildRows(asset, translate) {
  let rows;
  switch (asset.type) {
    case "image":
      rows = imageRows(asset);
      break;
    case "video":
      rows = videoRows(asset);
      break;
    case "audio":
      rows = audioRows(asset, translate);
      break;
    default:
      rows = fileRows(asset);
  }
  return [
    ...rows,
    {
      labelKey: "sourceWebsite",
      labelFallback: "Source website",
      value: browserAssetSourceWebsite(asset.metadata),
    },
  ];
}
function MetadataTable({ asset, className }) {
  const { t: translate } = useTranslation();
  const rows = buildRows(asset, translate).filter((row) => row.value);
  if (rows.length === 0) return null;
  return (
    <dl
      data-slot="metadata-table"
      className={cn(
        "grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs",
        className,
      )}
    >
      {rows.map((row) => (
        <RowItem key={row.labelKey} t={translate} row={row} />
      ))}
    </dl>
  );
}
const WAVE_HEIGHT = 96;
const UNMUTED_VOLUME = 0.3;
const WAVE_COLOR = "#9ca3af";
const PROGRESS_COLOR = "#8b5cf6";
const CURSOR_COLOR = "#8b5cf6";
const PEAKS_ENDPOINT_THRESHOLD_BYTES = 10 * 1024 * 1024;
const PEAKS_BUCKETS = 200;
function AudioPreview({ asset }) {
  const { t: translate } = useTranslation();
  const gatewayUrl = useGatewayUrl();
  const gatewayFetch = useGatewayFetch();
  const containerRef = reactExports.useRef(null);
  const wavesurferRef = reactExports.useRef(null);
  const [muted, setMuted] = reactExports.useState(true);
  const url = reactExports.useMemo(
    () => gatewayUrl(API_PATHS.serveFile(asset.path)),
    [asset.path, gatewayUrl],
  );
  reactExports.useEffect(() => {
    const container = containerRef.current;
    if (!container || !url) return;
    const useServerPeaks =
      (asset.fileSize ?? 0) > PEAKS_ENDPOINT_THRESHOLD_BYTES;
    let cancelled = false;
    let waveSurfer = null;
    let cleanupReady = null;
    const fetchAbort = new AbortController();
    const start = (peaksData) => {
      if (cancelled || !container) return;
      waveSurfer = WaveSurfer.create({
        container,
        url,
        ...(peaksData
          ? // Wavesurfer skips decodeAudioData entirely when both peaks
            // and duration are supplied at construction time. The `url`
            // is still required so the underlying <audio> can fetch the
            // bytes for actual playback (no PCM round-trip).
            {
              peaks: peaksData.peaks,
              duration: peaksData.duration,
            }
          : {}),
        waveColor: WAVE_COLOR,
        progressColor: PROGRESS_COLOR,
        cursorColor: CURSOR_COLOR,
        cursorWidth: 1,
        height: WAVE_HEIGHT,
        barWidth: 2,
        barGap: 1,
        barRadius: 1,
        normalize: true,
        // Click + drag-to-scrub.
        interact: true,
        // IMPORTANT: do NOT autoplay here. WaveSurferOptions has no `muted`
        // or `volume` init prop, so by the time we can call setMuted() in
        // the `ready` handler, autoplay would already be playing audibly
        // for a few hundred ms. Instead we mute first, then start play().
        autoplay: false,
      });
      wavesurferRef.current = waveSurfer;
      const offReady = waveSurfer.on("ready", () => {
        waveSurfer?.setMuted(true);
        waveSurfer?.setVolume(0);
        waveSurfer?.play().catch(() => {});
      });
      cleanupReady = offReady;
    };
    if (useServerPeaks) {
      gatewayFetch(API_PATHS.assetPeaks(asset.path, PEAKS_BUCKETS), {
        signal: fetchAbort.signal,
      })
        .then(async (resp) => {
          if (!resp.ok)
            throw new Error(`peaks endpoint returned ${resp.status}`);
          const data = await resp.json();
          if (
            !data ||
            !Array.isArray(data.peaks) ||
            typeof data.duration !== "number" ||
            !Number.isFinite(data.duration)
          ) {
            throw new Error("peaks endpoint returned malformed payload");
          }
          start(data);
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          console.warn(
            "[audio-preview] peaks endpoint failed, falling back to self-decode:",
            err,
          );
          start(null);
        });
    } else {
      start(null);
    }
    return () => {
      cancelled = true;
      fetchAbort.abort();
      try {
        cleanupReady?.();
        waveSurfer?.pause();
        waveSurfer?.destroy();
      } catch {}
      wavesurferRef.current = null;
    };
  }, [url, asset.path, gatewayFetch]);
  reactExports.useEffect(() => {
    const waveSurfer = wavesurferRef.current;
    if (!waveSurfer) return;
    waveSurfer.setMuted(muted);
    waveSurfer.setVolume(muted ? 0 : UNMUTED_VOLUME);
  }, [muted]);
  const toggleMute = reactExports.useCallback(() => setMuted((wasMuted) => !wasMuted), []);
  if (!url) {
    return (
      <div
        data-slot="audio-preview-fallback"
        className="flex w-full h-24 items-center justify-center bg-muted text-muted-foreground text-xs"
      >
        {translate("assetPreview.audioUnavailable", {
          defaultValue: "Preview unavailable",
        })}
      </div>
    );
  }
  return (
    // Wrapper is `relative` so the mute toggle can absolute-position itself
    // in the corner without a separate row underneath the waveform — keeps
    // the hover card compact (matches the video-preview layout idiom).
    <div data-slot="audio-preview" className="relative w-full">
      <div
        ref={containerRef}
        data-slot="audio-preview-waveform"
        className="w-full bg-muted/30 cursor-pointer select-none"
        style={{
          height: WAVE_HEIGHT,
        }}
      />
      <button
        type="button"
        data-slot="audio-preview-mute-toggle"
        onClick={toggleMute}
        title={
          muted
            ? translate("assetPreview.unmute", {
                defaultValue: "Unmute",
              })
            : translate("assetPreview.mute", {
                defaultValue: "Mute",
              })
        }
        className={cn(
          // `z-10` is required because wavesurfer's internal <canvas> +
          // wrapper divs sit above the default stacking context, which
          // would otherwise hide / block clicks on this absolute-
          // positioned button.
          "absolute top-2 right-2 z-10 inline-flex items-center justify-center size-7 rounded-full",
          "bg-foreground/60 text-background hover:bg-foreground/80 transition-colors",
        )}
      >
        {muted ? (
          <VolumeX size={14} strokeWidth={1.5} />
        ) : (
          <Volume size={14} strokeWidth={1.5} />
        )}
      </button>
    </div>
  );
}
const PREVIEW_MAX_WIDTH = 480;
function ImagePreview({ src, name, unavailableLabel }) {
  const [failed, setFailed] = reactExports.useState(false);
  return failed ? (
    <p role="status" className="p-4 text-sm text-muted-foreground">
      {unavailableLabel}
    </p>
  ) : (
    <div className="relative size-full">
      <img
        src={src}
        alt={name}
        draggable={false}
        className="size-full object-contain"
        onError={() => setFailed(true)}
      />
      <ImageFullscreenButton src={src} name={name} />
    </div>
  );
}
function TextPreview({ asset: _asset, previewText, loading, error }) {
  const { t: translate } = useTranslation();
  if (loading) {
    return (
      <div data-slot="text-preview" className="flex flex-col gap-1">
        <Skeleton className="w-full h-3" />
        <Skeleton className="w-5/6 h-3" />
        <Skeleton className="w-4/5 h-3" />
        <Skeleton className="w-5/6 h-3" />
      </div>
    );
  }
  if (error) {
    return (
      <span
        data-slot="text-preview-error"
        className="block text-xs text-foreground/30"
        title={error}
      >
        {translate("assetPreview.unsupportedText", {
          defaultValue: "Preview not supported",
        })}
      </span>
    );
  }
  if (!previewText) {
    return (
      <span
        data-slot="text-preview-empty"
        className="block text-xs text-foreground/30"
      >
        {translate("assetPreview.emptyText", {
          defaultValue: "(empty file)",
        })}
      </span>
    );
  }
  return (
    <pre
      data-slot="text-preview"
      className={cn(
        "whitespace-pre-wrap break-words text-xs text-foreground/50 line-clamp-10 font-mono",
      )}
    >
      {previewText}
    </pre>
  );
}
let currentInlineVideo = null;
function claimInlineVideoSlot(video) {
  if (currentInlineVideo === video) return;
  if (currentInlineVideo) {
    try {
      currentInlineVideo.pause();
    } catch {}
  }
  currentInlineVideo = video;
}
const PREVIEW_LOOP_LIMIT_S = 5;
function VideoPreview({ src, unavailableLabel }) {
  const videoRef = reactExports.useRef(null);
  const [playing, setPlaying2] = reactExports.useState(false);
  const [volume, setVolume] = reactExports.useState(1);
  const { muted, toggle: toggleMuted } = useMediaMuted();
  const [failed, setFailed] = reactExports.useState(false);
  const handleStop = reactExports.useCallback(() => setPlaying2(false), []);
  if (failed)
    return (
      <p role="status" className="p-4 text-sm text-muted-foreground">
        {unavailableLabel}
      </p>
    );
  return (
    <VideoPlayer
      src={src}
      width="100%"
      height="100%"
      videoRef={videoRef}
      isPlaying={playing}
      muted={muted}
      volume={volume}
      onVolumeChange={setVolume}
      onTogglePlay={() => setPlaying2((value) => !value)}
      onStop={handleStop}
      onToggleMuted={toggleMuted}
      onFullscreen={() => void videoRef.current?.requestFullscreen()}
      onError={() => setFailed(true)}
    />
  );
}
function AssetHoverPopupInner({ target, onMouseEnter, onMouseLeave, onLocateOnCanvas }) {
  const { asset, anchor } = target;
  const { t } = useTranslation();
  const [positioned, setPositioned] = reactExports.useState(false);
  reactExports.useLayoutEffect(() => {
    const id = requestAnimationFrame(() => setPositioned(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const [lineageOpen, setLineageOpen] = reactExports.useState(false);
  const lineageCloseTimer = reactExports.useRef(null);
  const cancelLineageClose = reactExports.useCallback(() => {
    if (lineageCloseTimer.current) {
      clearTimeout(lineageCloseTimer.current);
      lineageCloseTimer.current = null;
    }
  }, []);
  const openLineage = reactExports.useCallback(() => {
    cancelLineageClose();
    setLineageOpen(true);
  }, [cancelLineageClose]);
  const scheduleLineageClose = reactExports.useCallback(() => {
    cancelLineageClose();
    lineageCloseTimer.current = setTimeout(() => {
      setLineageOpen(false);
      lineageCloseTimer.current = null;
    }, 150);
  }, [cancelLineageClose]);
  reactExports.useEffect(() => {
    return () => {
      if (lineageCloseTimer.current) {
        clearTimeout(lineageCloseTimer.current);
        lineageCloseTimer.current = null;
      }
    };
  }, []);
  reactExports.useEffect(() => {
    setLineageOpen(false);
  }, [asset.id, asset.path]);
  const textPreview = useAssetTextPreview(asset, {
    enabled: true,
  });
  const metadata = useAssetMetadata(asset, {
    enabled: true,
  });
  const mergedAsset = reactExports.useMemo(() => {
    const fetched = metadata.data?.ok ? metadata.data.metadata : void 0;
    return {
      ...asset,
      metadata: {
        ...(fetched ?? {}),
      },
    };
  }, [asset, metadata.data]);
  const handleLocate = reactExports.useCallback(() => {
    if (!onLocateOnCanvas || !asset.id) return;
    onLocateOnCanvas();
  }, [onLocateOnCanvas, asset.id]);
  const previewBody = reactExports.useMemo(() => {
    switch (asset.type) {
      case "image":
        return <ImagePreview asset={asset} />;
      case "video":
        return <VideoPreview asset={asset} />;
      case "audio":
        return <AudioPreview asset={asset} />;
      case "text": {
        const data = textPreview.data;
        const previewText = data?.ok ? data.text : null;
        const errorReason = data && !data.ok ? data.reason : null;
        const errorMessage = textPreview.error ? String(textPreview.error) : errorReason;
        return (
          <TextPreview
            asset={asset}
            previewText={previewText}
            loading={textPreview.isLoading || textPreview.isFetching}
            error={errorMessage}
          />
        );
      }
      default:
        return null;
    }
  }, [asset, textPreview.data, textPreview.error, textPreview.isLoading, textPreview.isFetching]);
  const locateDisabled = !onLocateOnCanvas || !asset.id;
  const lineageAvailable = !!asset.id;
  return (
    <PreviewCardRoot open={true}>
      <PreviewCardPortal>
        <PreviewCardPositioner
          anchor={anchor}
          side="left"
          sideOffset={8}
          align="start"
          alignOffset={0}
          className={cn(
            "isolate z-50",
            // Smooth slide when the panel's overlay host swaps to a new
            // target row without unmounting (target prop changes but
            // state.kind stays 'hover'). Without this, base-ui repositions
            // via inline transform and the popup snaps — visible as a
            // flicker. Gated on `positioned` so the initial mount's
            // (0,0) → first-anchor jump stays instant; see useLayoutEffect
            // above. Relies on base-ui Positioner using transform for
            // placement (true as of @base-ui/react@1.3.0); revisit if it
            // ever moves to top/left.
            positioned && "transition-transform duration-200 ease-out motion-reduce:transition-none",
          )}
        >
          <PreviewCardPopup
            data-slot="preview-card-content"
            onPointerEnter={onMouseEnter}
            onPointerLeave={onMouseLeave}
            className={cn(
              "elevated-surface-border z-50 w-[260px] origin-(--transform-origin) rounded-lg bg-popover text-popover-foreground shadow-lg outline-none",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
          >
            <div className="relative flex flex-col gap-3 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground/70 truncate" title={asset.name ?? asset.path}>
                  {asset.name ?? asset.path.split(/[/\\]/).pop() ?? asset.path}
                </span>
                <button
                  type="button"
                  data-slot="asset-hover-card-locate"
                  onClick={handleLocate}
                  disabled={locateDisabled}
                  title={t("assetPreview.locateOnCanvas")}
                  className={cn(
                    "inline-flex items-center justify-center size-6 rounded",
                    "text-foreground/50 hover:text-foreground/70 hover:bg-muted transition-colors",
                    "disabled:opacity-40 disabled:pointer-events-none",
                  )}
                >
                  <Crosshair size={14} strokeWidth={1.5} />
                </button>
              </div>
              {previewBody && <div data-slot="asset-hover-card-preview">{previewBody}</div>}
              <MetadataTable asset={mergedAsset} />
              {lineageAvailable && (
                <button
                  type="button"
                  data-slot="asset-hover-card-lineage-toggle"
                  onMouseEnter={openLineage}
                  onMouseLeave={scheduleLineageClose}
                  onFocus={openLineage}
                  onBlur={scheduleLineageClose}
                  className={cn(
                    "flex w-full items-center justify-between gap-1 py-1.5 text-xs cursor-default",
                    "text-foreground/50 opacity-40 hover:opacity-100 focus-visible:opacity-100 transition-opacity",
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Network size={12} strokeWidth={1.5} />
                    {t("assetPreview.viewLineage")}
                  </span>
                  <ChevronLeft size={12} strokeWidth={1.5} />
                </button>
              )}
              {lineageOpen && (
                // biome-ignore lint/a11y/noStaticElementInteractions: hover-driven dependency reveal
                <div
                  data-slot="asset-hover-card-lineage"
                  onMouseEnter={openLineage}
                  onMouseLeave={scheduleLineageClose}
                  className={cn(
                    "absolute top-0 right-full mr-1 w-[260px] max-h-full overflow-auto",
                    "elevated-surface-border rounded-lg bg-popover text-popover-foreground shadow-lg",
                    "p-3 flex flex-col gap-2",
                  )}
                >
                  <span className="text-xs font-medium text-foreground/70">{t("assetPreview.lineageTitle")}</span>
                  <LineageTree assetId={asset.id} />
                </div>
              )}
            </div>
          </PreviewCardPopup>
        </PreviewCardPositioner>
      </PreviewCardPortal>
    </PreviewCardRoot>
  );
}
function AssetHoverPopup(props) {
  if (!props.target) return null;
  return <AssetHoverPopupInner {...props} target={props.target} />;
}
const HOVER_OPEN_DELAY_MS = 300;
const HOVER_CLOSE_DELAY_MS = 150;
export const AssetPanelOverlayHost = reactExports.forwardRef(
  function AssetPanelOverlayHost(
    { onLocateOnCanvas, onLocateMissingConfirmInsert },
    ref,
  ) {
    const { t: translate } = useTranslation();
    const [state, setState] = reactExports.useState({
      kind: "idle",
    });
    const stateRef = reactExports.useRef(state);
    const openTimerRef = reactExports.useRef(null);
    const closeTimerRef = reactExports.useRef(null);
    const setBoth = reactExports.useCallback((next) => {
      stateRef.current = next;
      setState(next);
    }, []);
    const cancelOpen = reactExports.useCallback(() => {
      if (openTimerRef.current) {
        clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
      }
    }, []);
    const cancelClose = reactExports.useCallback(() => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    }, []);
    reactExports.useImperativeHandle(
      ref,
      () => ({
        notifyHoverIntent: (target) => {
          if (target.asset.status === "missing") return;
          if (stateRef.current.kind === "locate-missing") return;
          cancelClose();
          cancelOpen();
          openTimerRef.current = setTimeout(() => {
            openTimerRef.current = null;
            if (stateRef.current.kind === "locate-missing") return;
            setBoth({
              kind: "hover",
              target,
            });
          }, HOVER_OPEN_DELAY_MS);
        },
        notifyHoverEnd: () => {
          cancelOpen();
          if (stateRef.current.kind !== "hover") return;
          cancelClose();
          closeTimerRef.current = setTimeout(() => {
            closeTimerRef.current = null;
            if (stateRef.current.kind === "hover")
              setBoth({
                kind: "idle",
              });
          }, HOVER_CLOSE_DELAY_MS);
        },
        showLocateMissing: (anchor, absolutePath) => {
          cancelOpen();
          cancelClose();
          setBoth({
            kind: "locate-missing",
            anchor,
            absolutePath,
          });
        },
        hideLocateMissing: () => {
          if (stateRef.current.kind === "locate-missing")
            setBoth({
              kind: "idle",
            });
        },
      }),
      [cancelClose, cancelOpen, setBoth],
    );
    const handlePopupMouseEnter = reactExports.useCallback(() => {
      cancelOpen();
      cancelClose();
    }, [cancelClose, cancelOpen]);
    const handlePopupMouseLeave = reactExports.useCallback(() => {
      cancelOpen();
      cancelClose();
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        if (stateRef.current.kind === "hover")
          setBoth({
            kind: "idle",
          });
      }, HOVER_CLOSE_DELAY_MS);
    }, [cancelClose, cancelOpen, setBoth]);
    const handlePopupLocateOnCanvas = reactExports.useCallback(() => {
      const overlayState = stateRef.current;
      if (overlayState.kind !== "hover" || !onLocateOnCanvas) return;
      onLocateOnCanvas(overlayState.target.absolutePath);
    }, [onLocateOnCanvas]);
    const handleLocateOpenChange = reactExports.useCallback(
      (next) => {
        if (!next && stateRef.current.kind === "locate-missing")
          setBoth({
            kind: "idle",
          });
      },
      [setBoth],
    );
    const handleLocateConfirm = reactExports.useCallback(() => {
      const overlayState = stateRef.current;
      if (overlayState.kind !== "locate-missing") return;
      const path = overlayState.absolutePath;
      setBoth({
        kind: "idle",
      });
      onLocateMissingConfirmInsert(path);
    }, [onLocateMissingConfirmInsert, setBoth]);
    const handleLocateCancel = reactExports.useCallback(() => {
      setBoth({
        kind: "idle",
      });
    }, [setBoth]);
    const activeAnchor =
      state.kind === "hover"
        ? state.target.anchor
        : state.kind === "locate-missing"
          ? state.anchor
          : null;
    reactExports.useEffect(() => {
      if (!activeAnchor) return;
      if (!activeAnchor.isConnected) {
        setBoth({
          kind: "idle",
        });
        return;
      }
      const intersectionObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting)
              setBoth({
                kind: "idle",
              });
          }
        },
        {
          threshold: 0,
        },
      );
      intersectionObserver.observe(activeAnchor);
      return () => intersectionObserver.disconnect();
    }, [activeAnchor, setBoth]);
    reactExports.useEffect(() => {
      return () => {
        cancelOpen();
        cancelClose();
      };
    }, [cancelOpen, cancelClose]);
    return (
      <>
        <AssetHoverPopup
          target={state.kind === "hover" ? state.target : null}
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
          onLocateOnCanvas={
            onLocateOnCanvas ? handlePopupLocateOnCanvas : void 0
          }
        />
        <PopoverRoot
          open={state.kind === "locate-missing"}
          onOpenChange={handleLocateOpenChange}
        >
          {state.kind === "locate-missing" && (
            <PopoverPortal>
              <PopoverPositioner
                anchor={state.anchor}
                align="center"
                side="left"
                sideOffset={8}
                className="isolate z-50"
              >
                <PopoverPopup
                  data-slot="locate-missing-popover"
                  className={cn(
                    "elevated-surface-border z-50 flex w-64 origin-(--transform-origin) flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-xs text-popover-foreground shadow-lg outline-hidden",
                    "dp-motion-quick-zoom",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm text-foreground">
                        {translate("fileExplorer.locateMissing.title")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {translate("fileExplorer.locateMissing.description")}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleLocateCancel}
                      data-action-ui-id="asset-panel.locate-missing-cancel"
                    >
                      {translate("common.cancel")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleLocateConfirm}
                      data-action-ui-id="asset-panel.locate-missing-confirm"
                    >
                      {translate("fileExplorer.locateMissing.confirm")}
                    </Button>
                  </div>
                </PopoverPopup>
              </PopoverPositioner>
            </PopoverPortal>
          )}
        </PopoverRoot>
      </>
    );
  },
);
