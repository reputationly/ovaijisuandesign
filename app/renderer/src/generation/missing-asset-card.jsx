// missing-asset-card.jsx
import {
  classifyFileType,
  CompositedSvg,
  reactExports,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipRoot,
  TooltipTrigger$1,
  useReactFlow,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$5 } from "../infra/dialog-content.jsx";
import { isGenerationRefundStatus } from "../canvas/compute-group-bounds-from-children.js";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import { ImageOffOutlineIcon, Trash2 } from "../media-editing/package.jsx";
import { ModelRegistryStoreContext } from "../infra/create-recently-added-store.js";

const PLACEHOLDER_MODEL_I18N_KEYS = {
  "Super Resolution": {
    key: "canvas.superResolution.label",
  },
  Erase: {
    key: "canvas.erase",
  },
  Redraw: {
    key: "canvas.redraw.label",
  },
  Outpaint: {
    key: "canvas.outpaint",
  },
  "Move Object": {
    key: "canvas.moveObject.label",
  },
  "Remove Background": {
    key: "canvas.removeBg.label",
  },
  "seedream-5-layer-decompose": {
    key: "canvas.layerDecompose.label",
    fallback: "Layer Decompose",
  },
  // MediaKit video actions — gateway services persist the raw cloud-side
  // model id (kebab-case) into placeholder.data.model. Map to the user-
  // facing UI label so the loading caption reads "高清 & 补帧" /
  // "字幕消除" instead of the raw model id. Constants tracked in
  // app/gateway/src/edit/{enhance-video,erase-subtitle}-mediakit.service.ts
  // and app/gateway/src/edit/{asr-mediakit,asr-whisper}.service.ts.
  "mediakit-enhance-video": {
    key: "canvas.enhanceVideo.label",
    fallback: "高清 & 补帧",
  },
  "mediakit-erase-subtitle": {
    key: "canvas.eraseSubtitle.label",
    fallback: "字幕消除",
  },
  "mediakit-asr": {
    key: "canvas.asr.label",
    fallback: "字幕生成",
  },
  "whisper-asr": {
    key: "canvas.asr.label",
    fallback: "字幕生成",
  },
};

export function translateModelName(model, t2) {
  if (!model) return model;
  const entry = PLACEHOLDER_MODEL_I18N_KEYS[model];
  if (!entry) return model;
  return t2(entry.key, {
    defaultValue: entry.fallback ?? model,
  });
}

export function ModelRegistryStoreProvider({ store, children: children2 }) {
  return reactExports.createElement(
    ModelRegistryStoreContext.Provider,
    {
      value: store,
    },
    children2,
  );
}

export function Tooltip$1({
  content: content2,
  children: children2,
  side = "top",
  sideOffset = 6,
  className,
  closeOnClick,
  open,
}) {
  const generatedId = reactExports.useId();
  const triggerId = children2.props.id ?? generatedId;
  if (!content2) return children2;
  return (
    <TooltipRoot
      open={open}
      triggerId={open === void 0 ? void 0 : triggerId}
      disableHoverablePopup={true}
    >
      <TooltipTrigger$1
        id={open === void 0 ? void 0 : triggerId}
        closeOnClick={closeOnClick}
        render={children2}
      />
      <TooltipPortal>
        <TooltipPositioner
          className="pointer-events-none z-[10020]"
          side={side}
          sideOffset={sideOffset}
        >
          <TooltipPopup
            role="tooltip"
            className={cn$5(
              "inline-flex w-fit max-w-xs items-center gap-1.5 rounded-sm bg-foreground text-background px-3 py-1.5 text-xs outline-none dp-motion-quick-zoom",
              className,
              "pointer-events-none select-none",
            )}
          >
            {content2}
          </TooltipPopup>
        </TooltipPositioner>
      </TooltipPortal>
    </TooltipRoot>
  );
}

export function TokenIcon$2({ size: size2 = 14 }) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.52105 2L7.25885 6.2093L4.80361 2.71115L2.71115 4.80361L6.2093 7.25885L2 6.52111V9.47895L6.2093 8.74115L2.71115 11.1964L4.80361 13.2889L7.25885 9.7907L6.52105 14H9.47889L8.74108 9.7907L11.1964 13.2889L13.2889 11.1964L9.7907 8.74115L14 9.47895V6.52111L9.7907 7.25885L13.2889 4.80361L11.1964 2.71115L8.74108 6.2093L9.47889 2H6.52105Z"
      />
    </CompositedSvg>
  );
}

export function CreditCostBadge({ cost, className, compact = false }) {
  if (cost == null) return null;
  return (
    <span
      data-slot="credit-cost-badge"
      className={`inline-flex items-center gap-1 whitespace-nowrap text-sm tracking-tight${compact ? " h-8 shrink-0 text-[13px] text-[var(--canvas-controls-text,#fff)]/70" : ""}${className ? ` ${className}` : ""}`}
    >
      <TokenIcon$2 />
      <span
        className={compact ? "pointer-events-none tabular-nums" : void 0}
        data-action-ui-id="image-edit.credit-cost"
      >
        {cost}
      </span>
    </span>
  );
}

export function RefundHint({ refundStatus, refundedCredits, compact = false }) {
  const { t: t2 } = useTranslation();
  if (!isGenerationRefundStatus(refundStatus)) return null;
  return (
    <span
      className={
        compact
          ? "inline-flex max-w-full items-center gap-1 rounded-md bg-foreground/[0.06] px-2 py-1 text-[9px] font-medium text-foreground/80"
          : "inline-flex items-center gap-1.5 rounded-md bg-foreground/[0.06] px-3 py-1.5 text-xs font-medium text-foreground/80"
      }
      data-action-ui-id="canvas.media-error.refund-hint"
    >
      <TokenIcon$2 size={compact ? 11 : 13} />
      <span className="truncate">
        {refundStatus === "refunded"
          ? refundedCredits && refundedCredits > 0
            ? t2("canvas.refundHint.refundedWithAmount", {
                count: refundedCredits,
                defaultValue: "已退还 {{count}} 积分",
              })
            : t2("canvas.refundHint.refundedNoAmount", {
                defaultValue: "积分已退还",
              })
          : refundStatus === "pending"
            ? t2("canvas.refundHint.pending", {
                defaultValue: "积分退还处理中",
              })
            : t2("canvas.refundHint.notCharged", {
                defaultValue: "未扣款",
              })}
      </span>
    </span>
  );
}

export const MEDIA_FALLBACK_NODE_SIZE = {
  width: 350,
  height: 250,
};

export function MediaUnpreviewableFallback({
  extension: extension2,
  displayName: displayName2,
  sizeLabel,
  reason = "unsupported",
}) {
  const { t: t2 } = useTranslation();
  const extLabel = extension2 ?? t2("canvas.file.unknownExt", "该");
  const headline =
    reason === "tooLarge"
      ? t2("canvas.file.unpreviewableTooLarge", "文件过大，暂不支持预览")
      : reason === "resourceLimit"
        ? t2(
            "canvas.file.unpreviewableResourceLimit",
            "预览数量过多，已暂停内嵌预览",
          )
        : reason === "missing"
          ? t2("canvas.file.missing", "文件不存在或已被移动")
          : t2("canvas.file.unpreviewable", "{{ext}} 文件类型无法预览", {
              ext: extLabel,
            });
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[var(--canvas-node-bg)] px-6 text-center">
      <FileTypeIcon
        {...classifyFileType({
          filename: extension2
            ? `file${extension2.startsWith(".") ? "" : "."}${extension2}`
            : displayName2,
        })}
        size={48}
        decorative={true}
      />
      <div className="text-sm font-medium text-foreground">{headline}</div>
      <div className="max-w-full truncate text-[13px] text-[var(--canvas-controls-text-muted)]">
        {displayName2}
        {sizeLabel ? ` · ${sizeLabel}` : ""}
      </div>
    </div>
  );
}

const ACTION_BUTTON_CLASS =
  "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-foreground/10 bg-foreground/[0.04] px-2.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/[0.08] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50";

export function MissingAssetCard({ nodeId, name: name2 }) {
  const { t: t2 } = useTranslation();
  const { deleteElements } = useReactFlow();
  const handleDelete2 = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      void deleteElements({
        nodes: [
          {
            id: nodeId,
          },
        ],
      });
    },
    [deleteElements, nodeId],
  );
  return (
    <div
      className="w-full h-full min-h-[160px] flex flex-col overflow-hidden rounded-lg"
      style={{
        background: "var(--canvas-node-bg, #fff)",
      }}
    >
      <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-center gap-3 px-6 py-6 text-center">
        <ImageOffOutlineIcon
          size={32}
          strokeWidth={1.75}
          className="text-muted-foreground"
          role="img"
          aria-label={t2("canvas.missingAsset.title")}
        />
        <div className="flex max-w-full flex-col items-center gap-1.5">
          <span className="text-[16px] leading-6 font-medium text-foreground">
            {t2("canvas.missingAsset.title")}
          </span>
          <span className="max-w-full line-clamp-2 whitespace-pre-wrap break-words text-center text-xs leading-5 text-muted-foreground">
            {t2("canvas.missingAsset.description")}
          </span>
          {name2 ? (
            <span
              className="max-w-full truncate text-[10px] leading-4 text-muted-foreground/70"
              title={name2}
            >
              {name2}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <button
            type="button"
            className={ACTION_BUTTON_CLASS}
            onClick={handleDelete2}
            data-action-ui-id="canvas.missing-asset.delete"
          >
            <Trash2 size={14} strokeWidth={1.5} className="size-3.5 shrink-0" />
            {t2("common.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function isMissingAssetNodeData(data2) {
  return data2?.assetMissing === true;
}

export const trackers$1 = new WeakMap();
