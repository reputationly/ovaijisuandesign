/**
 * 工作区外壳闭包（第 267 轮取回）。种子：WorkspaceCompositionActions / WorkspaceStructurePresentation。
 * 来源：主包 + use-window-chrome。偏移是 UTF-16 码元。
 */

import reactExports from "react";
import jsxRuntimeExports from "react/jsx-runtime";
import jsxRuntime from "react/jsx-runtime";
import { X as X$8 } from "lucide-react";
const hasRequiredJsxRuntime = () => true;
const requireReactJsxRuntime_production = () => jsxRuntime;
import { API_PATHS } from "../infra/workspace-gateway.js";
import { AudioFileIcon } from "./../assets/audio-file-icon.jsx";
import { BUTTON_ZOOM_FACTOR } from "./../assets/button-zoom-factor.jsx";
import { getCanvasTagPresentationColor } from "./../assets/inline-input.jsx";
import { useGatewayFetch } from "./../assets/listeners-a.jsx";
import { PageStateView } from "./../assets/page-state-view.jsx";
import { PromoteToAssetForm } from "./../assets/promote-to-asset-form.jsx";
import { CANVAS_V3_AUDIO_ACCEPT, CANVAS_V3_IMAGE_ACCEPT, CANVAS_V3_ROUTES, CANVAS_V3_VIDEO_ACCEPT, PICKER_VIEW_STORAGE_KEY, ProjectResourceKind, ProjectResourceLifecycle, ProjectResourceVersionStatus } from "./../canvas-v3/canvas-v3-constants.js";
import { useCanvasV3DialogProps, useCanvasV3HostServices, useCanvasV3PickerMedia, useCanvasV3PickerTags, useMediaMuted, useOptionalWorkspaceStructure, usePromptFontSizePreference, useSetCurrentVersion, useVersionMediaSource, useVideoPoster, useWorkbench } from "./../canvas-v3/canvas-v3-hooks.js";
import { CompositionLifecycle, PROJECT_DOCUMENT_READ_DEFAULT_LINES, canvasV3ContentPath, canvasV3ModelLastFrameOnly, canvasV3ModelReferenceBudget, canvasV3ModelReferencesValid, canvasV3PickerKind, canvasV3PickerMediaReason, canvasV3PickerMediaReasonLabel, canvasV3PromptMentions, canvasV3PromptReferences, canvasV3ReferencePath, canvasV3ReferenceToken, capabilityForm, createCanvasV3ResourcePicker, disabledOptions, paramDisabled, projectGenerationKindOfResource } from "./../canvas-v3/canvas-v3-model.js";
import { CanvasV3HostServicesProvider } from "./../canvas-v3/contexts.js";
import { createFrameChatComposer } from "./../canvas-v3/desktop-host-services.js";
import { CHAT_FRAME_RESOURCE_LIMIT } from "./../canvas-v3/frame-services.js";
import { CanvasV3AudioPlayer, CanvasV3PromptInput, CanvasV3ReferenceBar, CanvasV3ReferenceImports, Checkbox as Checkbox$2, CompositedSvg, DialogContent as DialogContent$4, DialogContent as DialogContent$5, DialogFooter as DialogFooter$3, DialogHeader as DialogHeader$2, DialogTitle as DialogTitle$3, DialogTitle as DialogTitle$4, DocumentContent, EnhanceImagePanel, FileText, FileTypeIcon, ImageGenerationPanelContent, ImageModeHostProvider, Input as Input$4, Loader2, Markdown, Maximize, NodeToolbarPalette, PickerGridTile, PickerListRow, PickerTab, PickerTabsList, PickerViewToggle, Plus as Plus$3, ProgressBar, PromptInputMetaRowView, ResourceThumbnail, SubmitButton, Tabs as Tabs$2, Upload, VideoPlayer, calcImageCost, classifyFileType, cn as cn$1, cn as cn$5, compileCanvasV3Prompt, createResourceQueryOptions, dedupedToast, describePickerMedia, formatTime, getRuntimeConfig, initialCanvasV3ImageModelSelection, loadCanvasV3Models, mapPricingResponse, mergeCanvasV3References, pickerMediaKey, previewImageDataUrl, readCanvasV3ImageModelPreference, readResourceDocument, referenceMediaKind, remarkGfm, removeCanvasV3PromptReference, resolvePricingId, resolveVideoPlaybackUrl, resourceQueryKeys, restoreCanvasV3ReferencePrompt, restoredReferenceKind, useBrowserOverlayDialogProps, useCurrentWorkspace, useGatewayUrl, useInfiniteQuery, useMediaActions, useMediaElementPlayback, useRequiredGatewayScope, useTheme } from "./../canvas-v3/main-exports.js";
import { ASPECT_RATIOS, CANVAS_V3_IMAGE_MODEL_PREFERENCE_KEY, ComposerPanelLayout, DEFAULT_CROP, MediaUrlContext, calcCropRect, compositionQueryKeys, createReadLimiter, cropRectForAspectRatio$1, isDocumentObject, parseDocumentContent, queryOptions, resourceThumbnailQuery, selectionToNormalizedBBox, taskQueryKeys, useImageErase, useImageMaskPainter, useQueries, withCanvasTagDownloadActivity } from "./../canvas-v3/ui-components.js";
import { CanvasRedrawBottomBar } from "./../canvas/canvas-redraw-bottom-bar.jsx";
import { CropIcon, RedrawIcon, SuperResolutionIcon } from "./../canvas/file-missing-icon.jsx";
import { Button as Button$3 } from "./../canvas/node-shell-inner.jsx";
import { Dialog as Dialog$3, Dialog as Dialog$4 } from "./../canvas/separator.jsx";
import { REDRAW_HIGHLIGHT_CSS_COLOR, REDRAW_HIGHLIGHT_UI_OPACITY, insertCanvasRedrawRegion } from "./../canvas/use-active-mode.js";
import { useMarqueeSelection } from "./../canvas/use-marquee-selection.js";
import { prependHiddenContext } from "./../chat/long-edge.jsx";
import { PROMPT_FONT_SIZE_DEFAULT, PROMPT_FONT_SIZE_MAX, PROMPT_FONT_SIZE_MIN } from "./../generation/prompt-font-size.js";
import { DialogDescription as DialogDescription$4 } from "./../infra/badge-variants.jsx";
import { DialogBackdrop, DialogClose$1, DialogPopup, DialogRoot } from "./../infra/base-ui.js";
import { DialogPortal as DialogPortal$3 } from "./../infra/gateway-http-error.jsx";
import { PRESET_COLOR_NAME_KEYS } from "./../infra/parse-connector-selection.js";
import { PauseIcon, PlayIcon, VolumeOffTablerIcon, VolumeOnTablerIcon } from "./../media-editing/build-video-thumb-base.jsx";
import { Download$2, Film$2, Music$2, Search$2, Video$2 } from "./../media-editing/custom-icons.js";
import { ChevronDown as ChevronDown$3, Minus as Minus$1 } from "./../media-editing/lucide-icon-wraps.js";
import { MEDIA_NODE_RADIUS } from "./../media-editing/package.jsx";
import { emptySnapshot } from "./content-budget-canvas-node-warn-count.jsx";
import { GRID_CLASS_BY_COUNT } from "./grid-class-by-count.jsx";
import { TabsContent as TabsContent$2 } from "./shortcut-hint.jsx";
import { withThumbnail } from "./thumbnail-width-buckets.jsx";
import { useMutation, useQuery } from "@tanstack/react-query";
import { renderDocument } from "docx-preview";
import { createInstance } from "i18next";
import { AudioWaveform, createLucideIcon } from "lucide-react";
import { defaults } from "marked";
import { I18nextProvider, useTranslation } from "react-i18next";
const MIN_SCALE = 0.05;

export const ADD_TO_CHAT_VIEW_BOX$1 = "0 0 20 20";

export const ADD_TO_CHAT_PATHS$1 = [
  "M12.1545 15.3767H18.6118",
  "M15.3896 12.1545L15.3896 18.6118",
  "M17.2956 9.34192C17.2956 4.94921 13.7346 1.38821 9.34191 1.38821C4.94919 1.38821 1.3882 4.94921 1.3882 9.34192C1.3882 10.9548 1.38819 14.4074 1.38819 16.186C1.38818 16.7996 1.88394 17.2956 2.49759 17.2956C4.28696 17.2956 7.76843 17.2956 9.34191 17.2956",
  "M5.93323 7.60952L12.7507 7.60952",
  "M5.93323 12.1545L9.34196 12.1545"
];

export function AddToChatIcon$1({
  size: size2 = 20,
  ...props
} = {}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    CompositedSvg,
    {
      width: size2,
      height: size2,
      viewBox: ADD_TO_CHAT_VIEW_BOX$1,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.5",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      ...props,
      children: ADD_TO_CHAT_PATHS$1.map((d2) => /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: d2 }, d2))
    }
  );
}

export function cropImageToBlob$1(imageSrc, cropRect, originalWidth, originalHeight) {
  return new Promise((resolve, reject2) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const sx = Math.round(cropRect.x * originalWidth);
      const sy = Math.round(cropRect.y * originalHeight);
      const sw = Math.round(cropRect.width * originalWidth);
      const sh = Math.round(cropRect.height * originalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject2(new Error("Failed to get canvas 2d context"));
        return;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject2(new Error("canvas.toBlob returned null"));
        },
        "image/png",
        1
      );
    };
    img.onerror = () => reject2(new Error(`Failed to load image: ${imageSrc}`));
    img.src = imageSrc;
  });
}

export function useImageCrop$1(containerWidth, containerHeight) {
  const [cropRect, setCropRect] = reactExports.useState(DEFAULT_CROP);
  const [aspectRatio2, setAspectRatioState] = reactExports.useState("free");
  const [isDragging2, setIsDragging] = reactExports.useState(false);
  const [activeHandle, setActiveHandle] = reactExports.useState(null);
  const dragRef = reactExports.useRef(null);
  const rafRef = reactExports.useRef(null);
  const latestRef = reactExports.useRef({ containerWidth, containerHeight, aspectRatio: aspectRatio2 });
  latestRef.current = { containerWidth, containerHeight, aspectRatio: aspectRatio2 };
  const handleMove = reactExports.useCallback((e2) => {
    const drag2 = dragRef.current;
    if (!drag2) return;
    const { containerWidth: cw, containerHeight: ch, aspectRatio: ar } = latestRef.current;
    if (!cw || !ch) return;
    const deltaX = (e2.clientX - drag2.startX) / cw;
    const deltaY = (e2.clientY - drag2.startY) / ch;
    const numericRatio = ASPECT_RATIOS[ar];
    const next2 = calcCropRect({
      initialRect: drag2.initialRect,
      deltaX,
      deltaY,
      handle: drag2.handle,
      aspectRatio: numericRatio,
      containerWidth: cw,
      containerHeight: ch
    });
    setCropRect(next2);
  }, []);
  reactExports.useEffect(() => {
    if (!isDragging2) return;
    let pendingEvent = null;
    const onMove = (e2) => {
      if (e2.cancelable) e2.preventDefault();
      pendingEvent = e2;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          if (pendingEvent) {
            handleMove(pendingEvent);
            pendingEvent = null;
          }
        });
      }
    };
    const onUp = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (pendingEvent) {
        handleMove(pendingEvent);
        pendingEvent = null;
      }
      setIsDragging(false);
      setActiveHandle(null);
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDragging2, handleMove]);
  const handlePointerDown = reactExports.useCallback(
    (e2, handle2 = null) => {
      if (!e2.isPrimary) return;
      e2.stopPropagation();
      e2.preventDefault();
      dragRef.current = {
        startX: e2.clientX,
        startY: e2.clientY,
        initialRect: { ...cropRect },
        handle: handle2
      };
      setIsDragging(true);
      setActiveHandle(handle2);
    },
    [cropRect]
  );
  const setAspectRatio = reactExports.useCallback((preset2) => {
    setAspectRatioState(preset2);
    const ratio = ASPECT_RATIOS[preset2];
    const { containerWidth: cw, containerHeight: ch } = latestRef.current;
    setCropRect(cropRectForAspectRatio$1(ratio, cw, ch));
  }, []);
  const reset2 = reactExports.useCallback(() => {
    setAspectRatioState("free");
    setCropRect(DEFAULT_CROP);
  }, []);
  return {
    cropRect,
    aspectRatio: aspectRatio2,
    isDragging: isDragging2,
    activeHandle,
    handlePointerDown,
    setAspectRatio,
    setCropRect,
    reset: reset2
  };
}

export const inputRegex$1 = /^\s*(\[([( |x])?\])\s$/;

export const visuallyHiddenStyle = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";

export const getCheckboxLabel = (node2, checked, a11y) => {
  var _a11y$checkboxLabel;
  return (a11y === null || a11y === void 0 || (_a11y$checkboxLabel = a11y.checkboxLabel) === null || _a11y$checkboxLabel === void 0 ? void 0 : _a11y$checkboxLabel.call(a11y, node2, checked)) || `Task item checkbox for ${node2.textContent || "empty task item"}`;
};

export function normalizePromptFontSize$1(value) {
  if (!Number.isFinite(value)) return PROMPT_FONT_SIZE_DEFAULT;
  return Math.min(PROMPT_FONT_SIZE_MAX, Math.max(PROMPT_FONT_SIZE_MIN, Math.round(value)));
}

export function SegmentedSwitch$1({
  value,
  options: options2,
  onValueChange,
  ariaLabel,
  dataActionUiId,
  thumbDataSlot = "segmented-switch-thumb",
  variant = "icon",
  size: size2 = "md",
  gap = "none",
  stretch = false,
  className,
  itemClassName,
  thumbClassName,
  iconSize = 16,
  iconStrokeWidth = 1.5,
  renderTooltip
}) {
  const selectedIndex = Math.max(
    0,
    options2.findIndex((option2) => option2.value === value)
  );
  const optionCount = Math.max(1, options2.length);
  const itemGapRem = gap === "xs" ? 0.125 : 0;
  const totalGapRem = (optionCount - 1) * itemGapRem;
  const selectedGapOffsetRem = selectedIndex * itemGapRem;
  const gridStyle = options2.length in GRID_CLASS_BY_COUNT ? void 0 : { gridTemplateColumns: `repeat(${optionCount}, minmax(0, 1fr))` };
  const thumbStyle = {
    width: gap === "xs" ? `calc((100% - 4px - ${totalGapRem}rem) / ${optionCount})` : `calc((100% - 4px) / ${optionCount})`,
    transform: selectedGapOffsetRem > 0 ? `translateX(calc(${selectedIndex * 100}% + ${selectedGapOffsetRem}rem))` : `translateX(${selectedIndex * 100}%)`
  };
  const content2 = /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "fieldset",
    {
      "aria-label": ariaLabel,
      "data-action-ui-id": dataActionUiId,
      className: cn$5(
        "relative m-0 grid min-w-0 rounded-[8px] border-0 bg-foreground/[0.025] p-0.5 dark:bg-foreground/[0.05]",
        gap === "xs" && "gap-0.5",
        stretch ? "w-full" : "w-max",
        GRID_CLASS_BY_COUNT[options2.length],
        className
      ),
      style: gridStyle,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            "aria-hidden": true,
            "data-slot": thumbDataSlot,
            className: cn$5(
              "pointer-events-none absolute top-0.5 left-0.5 rounded-[6px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] transition-transform duration-200 ease-out dark:bg-white/[0.08] dark:shadow-none",
              size2 === "sm" ? "h-6" : "h-7",
              thumbClassName
            ),
            style: thumbStyle
          }
        ),
        options2.map((option2) => {
          const selected2 = option2.value === value;
          const Icon2 = option2.icon;
          const labelText = typeof option2.label === "string" ? option2.label : void 0;
          const button = /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              "aria-pressed": selected2,
              "aria-label": option2.ariaLabel ?? labelText,
              disabled: option2.disabled,
              "data-action-ui-id": option2.dataActionUiId,
              className: cn$5(
                "relative z-10 inline-flex items-center justify-center rounded-[6px] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                variant === "icon" ? size2 === "sm" ? "size-6" : "size-7" : cn$5(
                  "min-w-0 gap-1 whitespace-nowrap",
                  size2 === "sm" ? "h-6 px-2 text-[11px]" : "h-7 px-2.5 text-[13px]"
                ),
                selected2 ? "text-foreground font-medium" : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground font-normal",
                itemClassName
              ),
              onClick: () => {
                if (!option2.disabled && option2.value !== value) {
                  onValueChange(option2.value);
                }
              },
              children: [
                Icon2 && /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, { className: "shrink-0", size: iconSize, strokeWidth: iconStrokeWidth }),
                (variant === "label" || !Icon2) && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate", children: option2.label })
              ]
            },
            option2.value
          );
          if (!option2.tooltip || !renderTooltip) return button;
          return renderTooltip(button, option2.tooltip);
        })
      ]
    }
  );
  return content2;
}

export function referenceResourceKind(kind2) {
  return kind2 === "video" ? ProjectResourceKind.VIDEO : kind2 === "audio" ? ProjectResourceKind.AUDIO : kind2 === "text" ? ProjectResourceKind.TEXT_DOCUMENT : kind2 === "file" ? ProjectResourceKind.FILE : ProjectResourceKind.IMAGE;
}

export async function readResourceVersionHistory(resources, resourceId2, signal) {
  const items = [];
  let cursor;
  let pages = 0;
  do {
    const page2 = await resources.listResourceVersions(
      { resourceId: resourceId2, limit: 50, cursor },
      { signal }
    );
    items.push(...page2.items);
    cursor = page2.nextCursor;
    pages += 1;
  } while (cursor && pages < 100);
  return items;
}

export function PickerSidebarFilterButton({
  active: active2,
  count: count2,
  children: children2,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      ...props,
      type: "button",
      "aria-pressed": active2,
      className: cn$5(
        "flex h-8 w-full items-center justify-between gap-2 rounded-md px-2.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
        active2 ? "bg-accent font-medium text-foreground" : "font-normal text-muted-foreground hover:bg-muted hover:text-foreground"
      ),
      children: [
        children2,
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 tabular-nums font-normal text-muted-foreground/40", children: count2 })
      ]
    }
  );
}

export function subscribeTheme$1(onChange) {
  const observer2 = new MutationObserver(onChange);
  observer2.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer2.disconnect();
}

export const getDark$1 = () => document.documentElement.classList.contains("dark");

export const getServerDark$1 = () => false;

export function PickerEmptyState({
  title,
  onClearFilters
}) {
  const { t: t2 } = useTranslation();
  const dark = reactExports.useSyncExternalStore(subscribeTheme$1, getDark$1, getServerDark$1);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    PageStateView,
    {
      density: "panel",
      state: {
        type: "empty",
        title,
        description: onClearFilters ? t2("assetPicker.empty.filteredHint", "请调整搜索或筛选条件") : void 0,
        actions: onClearFilters ? [
          {
            key: "clear-filter",
            label: t2("assetPicker.filter.clear", "清除筛选"),
            variant: "outline",
            onClick: onClearFilters
          }
        ] : []
      },
      labels: {
        emptyText: t2("pageState.emptyText", "No content yet"),
        errorText: t2("pageState.errorText", "Something went wrong. Please try again."),
        networkErrorText: t2(
          "pageState.networkErrorText",
          "No network connection. Check your connection and try again."
        )
      },
      renderIllustration: (props) => /* @__PURE__ */ jsxRuntimeExports.jsx(PageStateIllustration, { ...props, theme: dark ? "dark" : "light" })
    }
  );
}

export function PickerProblemStatusTag({ label }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      className: "inline-flex h-[18px] max-w-28 items-center gap-1 rounded-full border-0 bg-[var(--media-overlay-surface)] px-1.5 text-[10px] font-medium leading-none text-[var(--media-overlay-foreground)]",
      "data-action-ui-id": "asset-picker.problem-tag",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            "aria-hidden": "true",
            className: "size-1.5 shrink-0 rounded-full bg-destructive saturate-75 brightness-110"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: label })
      ]
    }
  );
}

export const PROJECT_ASSETS_TAB = "assets";

export const DEFAULT_PICKER_TABS = [PROJECT_ASSETS_TAB];

export const DEFAULT_RESOURCE_KINDS = ["image"];

export function CanvasV3ResourcePickerDialog(props) {
  const owner = reactExports.useMemo(
    () => ({ key: crypto.randomUUID(), fetch: props.fetch, scope: props.scope }),
    [props.fetch, props.scope]
  );
  const current2 = reactExports.useRef(owner);
  current2.current = owner;
  if (!props.open) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ResourcePickerSession,
    {
      ...props,
      onSelect: (references, signal) => {
        if (current2.current !== owner) throw new Error("CANVAS_V3_IMPORT_CANCELLED");
        return props.onSelect(references, signal);
      }
    },
    owner.key
  );
}

export function PickerTagMark({ color: color2 }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      "aria-hidden": true,
      className: "size-2.5 shrink-0 rounded-full border border-muted-foreground",
      style: color2 ? { backgroundColor: getCanvasTagPresentationColor(color2), borderColor: "transparent" } : void 0
    }
  );
}

export function PickerMediaThumbnail({
  src,
  size: size2,
  kind: kind2,
  onDuration
}) {
  const preview = useVideoPoster(src);
  reactExports.useEffect(() => {
    if (preview.duration > 0) onDuration(preview.duration);
  }, [preview.duration, onDuration]);
  return preview.poster ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    "img",
    {
      src: preview.poster,
      alt: "",
      loading: "lazy",
      decoding: "async",
      draggable: false,
      onLoad: preview.onLoad,
      onError: preview.onError,
      className: "size-full object-cover"
    }
  ) : kind2 === "audio" ? /* @__PURE__ */ jsxRuntimeExports.jsx(AudioFileIcon, { size: size2, strokeWidth: 1.5 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Video$2, { size: size2, strokeWidth: 1.5 });
}

export function PickerMediaDuration({
  src,
  rowKey,
  onDuration
}) {
  const { duration } = useVideoPoster(src);
  reactExports.useEffect(() => {
    if (duration > 0) onDuration(rowKey, duration);
  }, [duration, rowKey, onDuration]);
  return null;
}

export function ResourcePickerSession({
  renderThumbnail: renderThumbnail2,
  preferences,
  fetch: fetch2,
  scope,
  url: url2,
  onSelect,
  onClose,
  maxCount = 20,
  minCount,
  selectionLimits,
  sharedMediaLimit,
  totalMediaLimit,
  mediaConstraints,
  durationLimits,
  portalContainer,
  tabs = DEFAULT_PICKER_TABS,
  canvasReferences = [],
  upstreamReferences = [],
  alreadyAddedReferences = [],
  onImportFiles,
  hasPendingImports,
  mediaKinds = ["image"],
  textRole = "text",
  resourceKinds: resourceKinds2 = DEFAULT_RESOURCE_KINDS,
  resolveResource,
  tags: suppliedTags,
  uploadMediaKinds = mediaKinds
}) {
  const { t: t2 } = useTranslation();
  const typeLabel = (kind2) => t2(
    `assetPicker.typeFilter.${kind2 === "text" && textRole === "subtitle" ? "subtitle" : kind2}`,
    kind2 === "all" ? "全部" : kind2 === "text" && textRole === "subtitle" ? "字幕" : kind2
  );
  const tagSnapshot = useCanvasV3PickerTags(fetch2, suppliedTags === void 0);
  const tags2 = suppliedTags ?? tagSnapshot?.registry.tags.map((tag) => ({
    id: tag.id,
    name: tag.name || t2(tag.legacyNameKey ?? PRESET_COLOR_NAME_KEYS[tag.id] ?? "") || tag.id,
    color: tag.color
  })) ?? [];
  const resourceTags = new Map(
    tagSnapshot?.assignments.map((item) => [item.resourceId, item.tagIds]) ?? []
  );
  const picker = reactExports.useMemo(
    () => createCanvasV3ResourcePicker(fetch2, resourceKinds2),
    [fetch2, resourceKinds2]
  );
  const hostTabs = tabs.filter((id2) => id2 !== "upload" || onImportFiles);
  const visibleTabs = hostTabs.length ? hostTabs : DEFAULT_PICKER_TABS;
  const browserTabs = visibleTabs.includes("canvas") ? visibleTabs.filter((id2) => id2 !== "upload") : visibleTabs;
  const [tab2, setTab] = reactExports.useState(browserTabs[0]);
  const [uploaded, setUploaded] = reactExports.useState([]);
  const [uploading, setUploading] = reactExports.useState(false);
  const [uploadError, setUploadError] = reactExports.useState(null);
  const fileInputRef = reactExports.useRef(null);
  const [query, setQuery] = reactExports.useState("");
  const [view2, setView] = reactExports.useState(() => {
    if (preferences !== void 0) return "grid";
    try {
      return localStorage.getItem(PICKER_VIEW_STORAGE_KEY) === "list" ? "list" : "grid";
    } catch {
      return "grid";
    }
  });
  const viewChanged = reactExports.useRef(false);
  reactExports.useEffect(() => {
    let active2 = true;
    void preferences?.get(PICKER_VIEW_STORAGE_KEY).then((value) => {
      if (active2 && !viewChanged.current) setView(value === "list" ? "list" : "grid");
    }).catch(() => {
    });
    return () => {
      active2 = false;
    };
  }, [preferences]);
  const changeView = (next2) => {
    viewChanged.current = true;
    if (preferences !== void 0) {
      setView(next2);
      void preferences?.set(PICKER_VIEW_STORAGE_KEY, next2).catch(() => {
      });
      return;
    }
    setView(next2);
    try {
      localStorage.setItem(PICKER_VIEW_STORAGE_KEY, next2);
    } catch {
    }
  };
  const rowsClassName = view2 === "grid" ? "grid grid-cols-4 min-[1000px]:grid-cols-5 content-start gap-2 py-2 pl-2 pr-3" : "space-y-1 p-1";
  const [typeFilter, setTypeFilter] = reactExports.useState("all");
  const [tagFilter, setTagFilter] = reactExports.useState();
  const [tagsExpanded, setTagsExpanded] = reactExports.useState(true);
  const [availableOnly, setAvailableOnly] = reactExports.useState(false);
  const handleTypeFilter = (kind2) => {
    setTypeFilter(kind2);
    setTagFilter(void 0);
  };
  const handleTagFilter = (id2) => {
    setTypeFilter("all");
    setTagFilter((current2) => current2 === id2 ? void 0 : id2);
  };
  const handleClearFilters = () => {
    setQuery("");
    setTypeFilter("all");
    setTagFilter(void 0);
    setAvailableOnly(false);
  };
  const [reload, setReload] = reactExports.useState(0);
  const [resources, setResources] = reactExports.useState([]);
  const [cursor, setCursor] = reactExports.useState();
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(false);
  const [versions, setVersions] = reactExports.useState([]);
  const [versionCursor, setVersionCursor] = reactExports.useState();
  const [versionLoading, setVersionLoading] = reactExports.useState(false);
  const [versionError, setVersionError] = reactExports.useState(false);
  const [busy, setBusy] = reactExports.useState(false);
  const lifetime = reactExports.useRef(new AbortController());
  const listRequest = reactExports.useRef(void 0);
  const mediaMetadata = useCanvasV3PickerMedia(fetch2, scope, [
    ...canvasReferences,
    ...upstreamReferences,
    ...uploaded,
    ...resources.flatMap(
      (resource2) => resource2.currentVersionId ? [{ resourceId: resource2.resourceId, versionId: resource2.currentVersionId }] : []
    ),
    ...versions.map((version2) => ({
      resourceId: version2.resourceId,
      versionId: version2.versionId
    }))
  ]);
  const [measuredDurations, setMeasuredDurations] = reactExports.useState(/* @__PURE__ */ new Map());
  const handleDuration = reactExports.useCallback((rowKey, duration) => {
    setMeasuredDurations((current2) => {
      if (current2.get(rowKey) === duration) return current2;
      return new Map(current2).set(rowKey, duration);
    });
  }, []);
  const [scrollEl, setScrollEl] = reactExports.useState(null);
  const [selections, setSelected] = reactExports.useState(/* @__PURE__ */ new Map());
  const pendingUploads = reactExports.useRef(/* @__PURE__ */ new Map());
  const alreadyAdded = new Set(alreadyAddedReferences.map(identity));
  const unavailable2 = new Set(
    [...canvasReferences, ...upstreamReferences, ...uploaded].filter(
      (ref) => ref.unavailableReason || !mediaKinds.includes(ref.mediaKind ?? ref.kind ?? "image")
    ).map(identity)
  );
  const selectionKind = (ref) => ref.mediaKind ?? ref.ready?.mediaKind ?? ref.ready?.kind ?? "image";
  const durationFor = (ref) => mediaMetadata.get(identity(ref))?.durationSeconds ?? measuredDurations.get(identity(ref));
  const legacyDurationReason = (ref, current2) => {
    const kind2 = selectionKind(ref);
    if (kind2 !== "video" && kind2 !== "audio") return void 0;
    const limit = durationLimits?.[kind2];
    if (!limit) return void 0;
    const duration = durationFor(ref);
    if (duration === void 0)
      return t2("assetPicker.disabledReason.metadataPending", "媒体信息获取失败");
    if (duration < (limit.min ?? 0))
      return kind2 === "video" ? t2("assetPicker.disabledReason.videoTooShort", "视频过短") : t2("assetPicker.disabledReason.audioTooShort", "音频过短");
    const used = [...current2.values()].reduce(
      (total, item) => total + (identity(item) !== identity(ref) && selectionKind(item) === kind2 ? durationFor(item) ?? 0 : 0),
      0
    );
    const allowed = Math.min(limit.max ?? Infinity, (limit.total ?? Infinity) - used);
    if (Math.round(duration * 1e3) > Math.round(allowed * 1e3))
      return t2("assetPicker.disabledReason.videoBudgetExceeded", "超出 {{duration}}", {
        duration: `${Math.round((duration - allowed) * 10) / 10}s`
      });
    return void 0;
  };
  const canAdd = (ref, current2) => {
    const kind2 = selectionKind(ref);
    if (!mediaKinds.includes(kind2) || current2.size >= maxCount || legacyDurationReason(ref, current2) || mediaReason(ref, current2))
      return false;
    const kinds = [...current2.values()].map(selectionKind);
    const isMedia = (value) => value === "image" || value === "video" || value === "audio";
    if (isMedia(kind2) && kinds.filter(isMedia).length >= (totalMediaLimit ?? Infinity))
      return false;
    if (kinds.filter((value) => value === kind2).length >= (selectionLimits?.[kind2] ?? Infinity))
      return false;
    return kind2 !== "video" && kind2 !== "audio" || kinds.filter((value) => value === "video" || value === "audio").length < (sharedMediaLimit ?? Infinity);
  };
  const eligibleSelections = (current2) => {
    const next2 = /* @__PURE__ */ new Map();
    for (const [key2, ref] of current2)
      if (!alreadyAdded.has(key2) && !unavailable2.has(key2) && canAdd(ref, next2)) next2.set(key2, ref);
    return next2;
  };
  const selected2 = eligibleSelections(selections);
  const readyUploads = [...pendingUploads.current.values()].filter((ref) => {
    const kind2 = selectionKind(ref);
    return kind2 !== "audio" && kind2 !== "video" || !durationLimits?.[kind2] && !mediaConstraints || durationFor(ref) !== void 0;
  });
  const readyUploadKeys = JSON.stringify(readyUploads.map(identity));
  reactExports.useEffect(() => {
    if (uploading || busy || !readyUploads.length) return;
    const ready2 = readyUploads.filter((ref) => pendingUploads.current.delete(identity(ref)));
    if (!ready2.length) return;
    setSelected((previous2) => {
      const next2 = eligibleSelections(previous2);
      for (const ref of ready2)
        if (!unavailable2.has(identity(ref)) && !alreadyAdded.has(identity(ref)) && (next2.has(identity(ref)) || canAdd(ref, next2)))
          next2.set(identity(ref), ref);
      return next2;
    });
  }, [readyUploadKeys, uploading, busy]);
  const [expanded, setExpanded] = reactExports.useState();
  const versionRequest = reactExports.useRef(void 0);
  const selectionRequest = reactExports.useRef(void 0);
  reactExports.useEffect(() => {
    lifetime.current = new AbortController();
    return () => {
      lifetime.current.abort();
      listRequest.current?.abort();
      versionRequest.current?.abort();
      selectionRequest.current?.abort();
    };
  }, []);
  const showAssets = visibleTabs.includes("assets");
  reactExports.useEffect(() => {
    const abort = new AbortController();
    listRequest.current?.abort();
    listRequest.current = abort;
    setResources([]);
    setCursor(void 0);
    setExpanded(void 0);
    setLoading(true);
    setError(false);
    if (!showAssets) {
      setLoading(false);
      return () => abort.abort();
    }
    void picker.search(query, abort.signal).then((page2) => {
      if (!abort.signal.aborted) {
        setResources(page2.items);
        setCursor(page2.nextCursor);
      }
    }).catch(() => {
      if (!abort.signal.aborted) setError(true);
    }).finally(() => {
      if (!abort.signal.aborted) setLoading(false);
    });
    return () => abort.abort();
  }, [picker, query, reload, showAssets]);
  reactExports.useEffect(() => {
    const abort = new AbortController();
    versionRequest.current?.abort();
    versionRequest.current = abort;
    setVersions([]);
    setVersionCursor(void 0);
    setVersionError(false);
    setVersionLoading(Boolean(expanded));
    if (expanded)
      void picker.versions(expanded, abort.signal).then((page2) => {
        if (!abort.signal.aborted) {
          setVersions(page2.items);
          setVersionCursor(page2.nextCursor);
        }
      }).catch(() => {
        if (!abort.signal.aborted) setVersionError(true);
      }).finally(() => {
        if (!abort.signal.aborted) setVersionLoading(false);
      });
    return () => abort.abort();
  }, [picker, expanded, reload]);
  const cancel = () => {
    lifetime.current.abort();
    selectionRequest.current?.abort();
    listRequest.current?.abort();
    versionRequest.current?.abort();
    onClose();
  };
  const toggle2 = (reference) => {
    if (busy || unavailable2.has(identity(reference)) || alreadyAdded.has(identity(reference)))
      return;
    setSelected((previous2) => {
      const next2 = eligibleSelections(previous2);
      const key2 = identity(reference);
      if (next2.has(key2)) next2.delete(key2);
      else if (canAdd(reference, next2)) next2.set(key2, reference);
      return next2;
    });
  };
  const importFiles = async (files) => {
    if (!onImportFiles || !uploadMediaKinds.length || uploading || busy) return;
    setUploading(true);
    setUploadError(null);
    try {
      const imported = await onImportFiles(files);
      const added = imported.filter(
        (ref) => mediaKinds.includes(ref.mediaKind ?? ref.kind ?? "image") && uploadMediaKinds.includes(ref.mediaKind ?? ref.kind ?? "image")
      );
      if (lifetime.current.signal.aborted) return;
      setUploaded((rows) => [
        ...rows.filter((row) => !added.some((ref) => identity(ref) === identity(row))),
        ...added
      ]);
      setSelected((previous2) => {
        const next2 = eligibleSelections(previous2);
        for (const ref of added) {
          const selection2 = readySelection(ref);
          if (ref.unavailableReason || alreadyAdded.has(identity(ref))) continue;
          const kind2 = selectionKind(selection2);
          if ((kind2 === "audio" || kind2 === "video") && (durationLimits?.[kind2] || mediaConstraints) && durationFor(selection2) === void 0)
            pendingUploads.current.set(identity(ref), selection2);
          else if (next2.has(identity(ref)) || canAdd(selection2, next2))
            next2.set(identity(ref), selection2);
        }
        return next2;
      });
    } catch (cause) {
      if (!lifetime.current.signal.aborted)
        setUploadError(
          cause instanceof Error && cause.message === "CANVAS_V3_IMAGE_INVALID" ? "invalid" : "failed"
        );
    } finally {
      if (!lifetime.current.signal.aborted) setUploading(false);
    }
  };
  const confirm = async () => {
    if (busy || uploading || !selected2.size || selected2.size < (minCount ?? 0) || lifetime.current.signal.aborted)
      return;
    const abort = new AbortController();
    selectionRequest.current = abort;
    setBusy(true);
    setError(false);
    try {
      const references = [];
      for (const selection2 of selected2.values()) {
        const reference = selection2.ready ?? await (resolveResource ?? picker.select)(
          { resourceId: selection2.resourceId, versionId: selection2.versionId },
          abort.signal
        );
        if (reference.resourceId !== selection2.resourceId || reference.versionId !== selection2.versionId)
          throw new Error("CANVAS_V3_REFERENCE_NOT_READY");
        references.push(reference);
      }
      if (abort.signal.aborted || lifetime.current.signal.aborted) return;
      await onSelect(references, abort.signal);
      if (!abort.signal.aborted && !lifetime.current.signal.aborted) onClose();
    } catch {
      if (!abort.signal.aborted && !lifetime.current.signal.aborted) setError(true);
    } finally {
      if (!abort.signal.aborted && !lifetime.current.signal.aborted) setBusy(false);
    }
  };
  const more = async (resourceId2) => {
    const abort = resourceId2 ? versionRequest.current : listRequest.current;
    if (!abort || abort.signal.aborted) return;
    if (resourceId2) {
      setVersionLoading(true);
      setVersionError(false);
    } else {
      setLoading(true);
      setError(false);
    }
    try {
      if (resourceId2) {
        const page2 = await picker.versions(resourceId2, abort.signal, versionCursor);
        if (!abort.signal.aborted) {
          setVersions((rows) => [...rows, ...page2.items]);
          setVersionCursor(page2.nextCursor);
        }
      } else {
        const page2 = await picker.search(query, abort.signal, cursor);
        if (!abort.signal.aborted) {
          setResources((rows) => [...rows, ...page2.items]);
          setCursor(page2.nextCursor);
        }
      }
    } catch {
      if (!abort.signal.aborted) {
        if (resourceId2) setVersionError(true);
        else setError(true);
      }
    } finally {
      if (!abort.signal.aborted) {
        if (resourceId2) setVersionLoading(false);
        else setLoading(false);
      }
    }
  };
  function mediaReason(ref, current2) {
    if (!mediaConstraints) return void 0;
    const totals = { video: 0, audio: 0 };
    for (const [key2, item] of current2) {
      if (key2 === identity(ref)) continue;
      const kind2 = selectionKind(item);
      if (kind2 !== "video" && kind2 !== "audio") continue;
      totals[kind2] += durationFor(item) ?? 0;
    }
    return canvasV3PickerMediaReason(
      selectionKind(ref),
      durationFor(ref),
      totals,
      mediaConstraints
    );
  }
  const renderRow = (selection2, label, title, src, actionId, mediaKind2 = "image", unavailableReason) => {
    const rowKey = identity(selection2);
    const chosen = selected2.has(rowKey);
    const selectionOrder = [...selected2.keys()].indexOf(rowKey) + 1;
    const onDuration = (duration) => handleDuration(rowKey, duration);
    const existing2 = alreadyAdded.has(identity(selection2));
    const existingLabel = `✓ ${t2("assetPicker.existing", "已添加")}`;
    const durationReason = existing2 || chosen || unavailableReason ? void 0 : mediaReason({ ...selection2, mediaKind: mediaKind2 }, selected2);
    const durationLabel = existing2 || chosen || unavailableReason ? void 0 : legacyDurationReason({ ...selection2, mediaKind: mediaKind2 }, selected2) ?? (durationReason ? canvasV3PickerMediaReasonLabel(durationReason, t2, mediaConstraints) : void 0);
    const media2 = renderThumbnail2 ? renderThumbnail2(selection2, mediaKind2) : mediaKind2 === "audio" || mediaKind2 === "video" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      PickerMediaThumbnail,
      {
        src: src ?? "",
        size: view2 === "grid" ? 24 : 16,
        kind: mediaKind2,
        onDuration
      }
    ) : mediaKind2 === "file" || mediaKind2 === "table" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      FileTypeIcon,
      {
        ...classifyFileType({ filename: label }),
        size: view2 === "grid" ? 48 : 24,
        decorative: true
      }
    ) : mediaKind2 === "text" ? /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: view2 === "grid" ? 24 : 16, strokeWidth: 1.5 }) : src ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "img",
      {
        src,
        alt: "",
        loading: "lazy",
        decoding: "async",
        draggable: false,
        className: "size-full object-cover"
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx(Image$1, { size: view2 === "grid" ? 24 : 16, strokeWidth: 1.5 });
    const common = {
      "aria-pressed": chosen,
      "aria-label": label,
      disabled: Boolean(unavailableReason) || Boolean(durationReason) || existing2 || busy || !chosen && !canAdd({ ...selection2, mediaKind: mediaKind2 }, selected2),
      "data-action-ui-id": actionId,
      title: unavailableReason ?? durationLabel ?? title,
      selected: chosen,
      rowKey,
      onClick: () => toggle2({ ...selection2, mediaKind: mediaKind2 })
    };
    return view2 === "grid" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      PickerGridTile,
      {
        ...common,
        className: "rounded-lg [&>div:first-child]:aspect-3/2",
        name: label,
        media: media2,
        mediaKind: mediaKind2,
        metadata: describePickerMedia(mediaMetadata.get(pickerMediaKey(selection2))),
        mediaSrc: src,
        durationSeconds: durationFor(selection2),
        selectionOrder,
        badge: existing2 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute right-1 top-1 rounded-sm bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground", children: existingLabel }) : unavailableReason ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "span",
          {
            "data-action-ui-id": "asset-picker.problem-tag",
            className: "absolute left-2 top-2 inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--media-overlay-surface)] px-1.5 py-0.5 text-[10px] text-[var(--media-overlay-foreground)]",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": true, className: "size-1.5 shrink-0 rounded-full bg-destructive" }),
              unavailableReason
            ]
          }
        ) : durationLabel ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute left-2 top-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PickerProblemStatusTag, { label: durationLabel }) }) : void 0
      },
      identity(selection2)
    ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(PickerListRow, { ...common, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted text-muted-foreground", children: media2 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 truncate text-xs", children: label }),
      chosen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "span",
        {
          "data-action-ui-id": "asset-picker.selection-order",
          "data-selection-order": selectionOrder,
          className: "flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] text-background",
          children: selectionOrder
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto shrink-0 text-[11px] uppercase tracking-wide", children: existing2 ? existingLabel : durationLabel ? /* @__PURE__ */ jsxRuntimeExports.jsx(PickerProblemStatusTag, { label: durationLabel }) : unavailableReason ?? t2(`assetPicker.typeFilter.${mediaKind2}`) })
    ] }, identity(selection2));
  };
  const renderChoice = (resource2, versionId, label) => {
    const selection2 = { resourceId: resource2.resourceId, versionId, name: resource2.name };
    const kind2 = canvasV3PickerKind(resource2.kind) ?? "image";
    return renderRow(
      selection2,
      label,
      `${resource2.name} · ${versionId}`,
      url2(
        kind2 === "image" ? canvasV3ReferencePath(selection2) : canvasV3ContentPath({ ...selection2 }),
        kind2
      ),
      `canvas-v3.resource-picker.version-${versionId}`,
      kind2
    );
  };
  const readySelection = (ref) => ({
    resourceId: ref.resourceId,
    versionId: ref.versionId,
    // Never carry a display URL into a draft identity.
    ready: {
      resourceId: ref.resourceId,
      versionId: ref.versionId,
      name: ref.name,
      ...ref.mediaKind && ref.mediaKind !== "image" ? { kind: ref.mediaKind } : ref.kind ? { kind: ref.kind } : {},
      source: "resource"
    }
  });
  const renderReady = (ref, src, prefix) => renderRow(
    readySelection(ref),
    ref.name,
    `${ref.name} · ${ref.versionId}`,
    src,
    `canvas-v3.resource-picker.${prefix}-${ref.versionId}`,
    ref.mediaKind ?? ref.kind,
    ref.unavailableReason
  );
  const matches2 = (name2) => !query.trim() || name2.toLowerCase().includes(query.trim().toLowerCase());
  const uniqueReferences = (references) => [
    ...new Map(
      references.filter((ref) => mediaKinds.includes(ref.mediaKind ?? ref.kind ?? "image")).map((ref) => [identity(ref), ref])
    ).values()
  ];
  const uniqueCanvasReferences = uniqueReferences(canvasReferences);
  const uniqueUpstreamReferences = uniqueReferences(upstreamReferences);
  const matchesFilters = (ref) => matches2(ref.name) && (typeFilter === "all" || (ref.mediaKind ?? ref.kind ?? "image") === typeFilter) && (!tagFilter || (ref.tagIds ?? resourceTags.get(ref.resourceId))?.includes(tagFilter)) && (!availableOnly || !alreadyAdded.has(identity(ref)) && !ref.unavailableReason && !legacyDurationReason(
    { ...readySelection(ref), mediaKind: ref.mediaKind ?? ref.kind },
    selected2
  ) && (selected2.has(identity(ref)) || canAdd({ ...ref, ready: ref }, selected2)));
  const canvasRows = uniqueCanvasReferences.filter(matchesFilters);
  const upstreamRows = uniqueUpstreamReferences.filter(matchesFilters);
  const uploadedRows = uploaded.filter(
    (ref) => mediaKinds.includes(ref.mediaKind ?? ref.kind ?? "image") && matchesFilters(ref)
  );
  const visibleResources = resources.filter(
    (resource2) => (typeFilter === "all" || typeFilter === canvasV3PickerKind(resource2.kind)) && !tagFilter && (!availableOnly || resource2.currentVersionId && !alreadyAdded.has(
      identity({ resourceId: resource2.resourceId, versionId: resource2.currentVersionId })
    ) && (selected2.has(
      identity({ resourceId: resource2.resourceId, versionId: resource2.currentVersionId })
    ) || canAdd(
      {
        resourceId: resource2.resourceId,
        versionId: resource2.currentVersionId,
        mediaKind: canvasV3PickerKind(resource2.kind)
      },
      selected2
    )))
  );
  const marqueeReferences = tab2 === "canvas" ? [...canvasRows, ...uploadedRows] : tab2 === "upstream" ? upstreamRows : tab2 === "upload" ? uploadedRows : [];
  const marqueeRows = [
    ...new Map(
      [
        ...marqueeReferences.map((ref) => ({
          ...readySelection(ref),
          mediaKind: ref.mediaKind ?? ref.kind,
          unavailableReason: ref.unavailableReason
        })),
        ...tab2 === "assets" ? visibleResources.flatMap((resource2) => [
          ...resource2.currentVersionId ? [
            {
              resourceId: resource2.resourceId,
              versionId: resource2.currentVersionId,
              name: resource2.name,
              mediaKind: canvasV3PickerKind(resource2.kind)
            }
          ] : [],
          ...expanded === resource2.resourceId ? versions.map((version2) => ({
            resourceId: resource2.resourceId,
            versionId: version2.versionId,
            name: resource2.name,
            mediaKind: canvasV3PickerKind(resource2.kind)
          })) : []
        ]) : []
      ].map((ref) => [identity(ref), { ...ref, rowKey: identity(ref) }])
    ).values()
  ];
  const visiblePreviewKeys = new Set(marqueeRows.map((ref) => ref.rowKey));
  const durationProbes = new Map(
    [
      ...tab2 === "canvas" ? uniqueCanvasReferences : tab2 === "upstream" ? uniqueUpstreamReferences : [],
      ...uploaded.map((ref) => ({
        ...ref,
        url: url2(ref.path ?? canvasV3ContentPath(ref)) ?? ""
      })),
      ...tab2 === "assets" ? resources.flatMap((resource2) => {
        const kind2 = canvasV3PickerKind(resource2.kind) ?? "image";
        const versionIds = [
          ...resource2.currentVersionId ? [resource2.currentVersionId] : [],
          ...expanded === resource2.resourceId ? versions.map((version2) => version2.versionId) : []
        ];
        return versionIds.map((versionId) => {
          const ref = { resourceId: resource2.resourceId, versionId, mediaKind: kind2 };
          return { ...ref, url: url2(canvasV3ContentPath(ref), kind2) ?? "" };
        });
      }) : []
    ].filter((ref) => {
      const kind2 = ref.mediaKind ?? ("kind" in ref ? ref.kind : void 0) ?? "image";
      const rowKey = identity(ref);
      return (kind2 === "video" || kind2 === "audio") && mediaKinds.includes(kind2) && (durationLimits?.[kind2] || mediaConstraints) && durationFor(ref) === void 0 && !alreadyAdded.has(rowKey) && !unavailable2.has(rowKey) && (renderThumbnail2 || !visiblePreviewKeys.has(rowKey));
    }).map((ref) => [identity(ref), ref.url])
  );
  const rectangle = useMarqueeSelection({
    scrollEl,
    enabled: !busy && !uploading && maxCount !== 1,
    rows: marqueeRows,
    view: `${tab2}:${view2}`,
    selected: new Map([...selected2].map(([key2, ref]) => [key2, { ...ref, rowKey: key2 }])),
    onSelectionChange: setSelected,
    canAddSelection: (ref, current2) => !("unavailableReason" in ref && ref.unavailableReason) && !alreadyAdded.has(identity(ref)) && canAdd(ref, current2)
  });
  const countRows = (tab2 === "upstream" ? uniqueUpstreamReferences : tab2 === "upload" ? uploaded : [
    ...new Map(
      [...uploaded, ...uniqueCanvasReferences].map((ref) => [identity(ref), ref])
    ).values()
  ]).filter((ref) => mediaKinds.includes(ref.mediaKind ?? ref.kind ?? "image") && matches2(ref.name));
  const totalCount = tab2 === "assets" ? resources.length : countRows.length;
  const activeUploadKinds = typeFilter === "all" ? uploadMediaKinds : uploadMediaKinds.filter((kind2) => kind2 === typeFilter);
  const canUpload = !!onImportFiles && visibleTabs.includes("upload") && !tagFilter && activeUploadKinds.length > 0;
  const tabLabel = {
    upstream: t2("assetPicker.tab.upstream", "连线的资源"),
    canvas: t2("assetPicker.tab.canvas", "画布上的资源"),
    upload: t2("assetPicker.tab.upload", "本地上传"),
    assets: t2("mention.popover.tabProjectAssets", "Project assets")
  };
  const filtersActive = !!query.trim() || typeFilter !== "all" || !!tagFilter || availableOnly;
  const activeTag = tags2.find((tag) => tag.id === tagFilter);
  const renderEmptyState = (fallback) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    PickerEmptyState,
    {
      title: filtersActive ? t2("assetPicker.empty.filtered", "没有符合条件的资源") : fallback,
      onClearFilters: filtersActive ? handleClearFilters : void 0
    }
  );
  const dialogProps = useCanvasV3DialogProps({
    open: true,
    onOpenChange: (open) => {
      if (!open) cancel();
    }
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog$4, { ...dialogProps, disablePointerDismissal: true, children: [
    [...durationProbes].map(([rowKey, src]) => /* @__PURE__ */ jsxRuntimeExports.jsx(PickerMediaDuration, { rowKey, src, onDuration: handleDuration }, rowKey)),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      DialogContent$5,
      {
        size: "xl",
        closeLabel: t2("common.close"),
        className: "z-10001 h-[min(680px,calc(100dvh-3rem))] w-[calc(100vw-3rem)] grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-[920px]",
        overlayClassName: "asset-picker-overlay z-10000",
        portalContainer,
        "data-action-ui-id": "canvas-v3.resource-picker",
        onKeyDown: (event) => event.stopPropagation(),
        onDragOver: (event) => {
          event.preventDefault();
          event.stopPropagation();
        },
        onDrop: (event) => {
          event.preventDefault();
          event.stopPropagation();
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Tabs$2,
            {
              className: "flex min-h-0 min-w-0 flex-row",
              value: tab2,
              onValueChange: (value) => setTab(value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "flex w-44 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border bg-muted/20 p-4", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle$4, { className: "sr-only", children: t2("assetPicker.title", "选择资源") }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Input$4,
                    {
                      value: query,
                      onChange: (event) => setQuery(event.target.value),
                      placeholder: t2("assetPicker.searchPlaceholder", "搜索资源…"),
                      startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Search$2, { className: "size-3.5", strokeWidth: 1.5 }),
                      className: "h-8 shrink-0 text-xs",
                      "data-action-ui-id": "canvas-v3.resource-picker.search"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-0.5", children: ["all", ...mediaKinds].map((kind2) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    PickerSidebarFilterButton,
                    {
                      active: !tagFilter && typeFilter === kind2,
                      "data-action-ui-id": `canvas-v3.resource-picker.type.${kind2}`,
                      onClick: () => handleTypeFilter(kind2),
                      count: kind2 === "all" ? totalCount : tab2 === "assets" ? kind2 === "image" ? resources.length : 0 : countRows.filter((ref) => (ref.mediaKind ?? ref.kind ?? "image") === kind2).length,
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: typeLabel(kind2) })
                    },
                    kind2
                  )) }),
                  tags2.length > 0 && tab2 !== "assets" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "button",
                      {
                        type: "button",
                        className: "flex h-8 w-full items-center justify-between rounded-md px-2.5 text-[11px] font-normal text-muted-foreground/60 transition-colors hover:bg-muted/60 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
                        "aria-expanded": tagsExpanded,
                        onClick: () => setTagsExpanded((expanded2) => !expanded2),
                        "data-action-ui-id": "canvas-v3.resource-picker.tags.toggle",
                        children: [
                          t2("assetFilter.tagSection", "标签"),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            ChevronDown$3,
                            {
                              className: `size-3.5 shrink-0 transition-transform ${tagsExpanded ? "" : "-rotate-90"}`,
                              strokeWidth: 1.5,
                              "aria-hidden": true
                            }
                          )
                        ]
                      }
                    ),
                    tagsExpanded && tags2.map((tag) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                      PickerSidebarFilterButton,
                      {
                        active: tagFilter === tag.id,
                        onClick: () => handleTagFilter(tag.id),
                        "data-action-ui-id": `canvas-v3.resource-picker.tag.${tag.id}`,
                        count: countRows.filter(
                          (ref) => (ref.tagIds ?? resourceTags.get(ref.resourceId))?.includes(tag.id)
                        ).length,
                        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex min-w-0 items-center gap-2", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(PickerTagMark, { color: tag.color }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: tag.name })
                        ] })
                      },
                      tag.id
                    ))
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    ref: fileInputRef,
                    type: "file",
                    accept: activeUploadKinds.includes("file") ? void 0 : activeUploadKinds.map(
                      (kind2) => kind2 === "audio" ? CANVAS_V3_AUDIO_ACCEPT : kind2 === "video" ? CANVAS_V3_VIDEO_ACCEPT : kind2 === "file" ? "" : kind2 === "table" ? ".htable" : kind2 === "text" ? textRole === "subtitle" ? ".srt,application/x-subrip,text/srt" : "text/*,.md,.txt,.json,.csv" : CANVAS_V3_IMAGE_ACCEPT
                    ).join(","),
                    multiple: maxCount !== 1,
                    hidden: true,
                    "aria-label": t2("assetPicker.upload.action"),
                    "data-action-ui-id": "canvas-v3.resource-picker.upload-input",
                    onChange: (event) => {
                      const files = Array.from(event.currentTarget.files ?? []);
                      event.currentTarget.value = "";
                      if (files.length) void importFiles(files);
                    }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "flex min-w-0 flex-1 flex-col", "data-asset-picker-selection-scope": true, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      "data-marquee-blank-origin": true,
                      className: "flex h-16 shrink-0 items-center gap-3 px-6 pr-12",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          PickerViewToggle,
                          {
                            view: view2,
                            onViewChange: changeView,
                            actionPrefix: "canvas-v3.resource-picker"
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Checkbox$2,
                          {
                            size: "sm",
                            checked: availableOnly,
                            onCheckedChange: setAvailableOnly,
                            label: t2("assetPicker.filter.availableOnly", "仅显示可用"),
                            "data-action-ui-id": "canvas-v3.resource-picker.available-only"
                          }
                        ),
                        tagFilter && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "span",
                          {
                            className: "inline-flex h-8 min-w-0 shrink items-center gap-2 rounded-md bg-secondary pl-2.5 pr-1 text-xs font-medium text-secondary-foreground",
                            "data-action-ui-id": "canvas-v3.resource-picker.filter-tag",
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(PickerTagMark, { color: activeTag?.color }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: activeTag?.name ?? tagFilter }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                Button$3,
                                {
                                  type: "button",
                                  variant: "ghost",
                                  size: "icon",
                                  className: "size-6 shrink-0",
                                  "aria-label": t2("assetFilter.reset", "清除筛选"),
                                  onClick: () => setTagFilter(void 0),
                                  "data-action-ui-id": "canvas-v3.resource-picker.filter-tag.clear",
                                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$8, { className: "size-3", strokeWidth: 2 })
                                }
                              )
                            ]
                          }
                        )
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      ref: setScrollEl,
                      "data-action-ui-id": "canvas-v3.resource-picker.viewport",
                      className: "relative min-h-0 flex-1 overflow-y-auto pl-4 pr-3",
                      children: [
                        browserTabs.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(PickerTabsList, { children: browserTabs.map((id2) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          PickerTab,
                          {
                            value: id2,
                            "data-action-ui-id": `canvas-v3.resource-picker.tab.${id2}`,
                            children: [
                              tabLabel[id2],
                              (id2 === "canvas" || id2 === "upstream") && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-1 text-[11px] text-muted-foreground", children: [
                                "(",
                                id2 === "upstream" ? uniqueUpstreamReferences.length : uniqueCanvasReferences.length,
                                ")"
                              ] }),
                              id2 === "upload" && uploaded.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-1 text-[11px] text-muted-foreground", children: [
                                "(",
                                uploaded.length,
                                ")"
                              ] })
                            ]
                          },
                          id2
                        )) }),
                        ["upstream", "canvas"].filter((id2) => visibleTabs.includes(id2)).map((id2) => {
                          const rows = id2 === "upstream" ? upstreamRows : canvasRows;
                          const uploads = id2 === "canvas" ? uploadedRows : [];
                          const showUpload = id2 === "canvas" && canUpload;
                          return /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent$2, { value: id2, className: "flex flex-col", children: [
                            (rows.length > 0 || uploads.length > 0 || showUpload) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: rowsClassName, children: [
                              showUpload && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                Button$3,
                                {
                                  variant: "outline",
                                  disabled: uploading || busy || !uploadMediaKinds.length,
                                  onClick: () => fileInputRef.current?.click(),
                                  className: `w-full gap-2 border-dashed border-foreground/30 bg-muted/30 text-xs font-normal ${view2 === "grid" ? "relative block h-auto p-0" : "h-14"}`,
                                  "data-action-ui-id": "canvas-v3.resource-picker.upload-entry",
                                  children: [
                                    view2 === "grid" && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { "aria-hidden": "true", className: "block w-full", children: [
                                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block aspect-3/2" }),
                                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block h-12" })
                                    ] }),
                                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                      "span",
                                      {
                                        className: view2 === "grid" ? "absolute inset-0 flex flex-col items-center justify-center gap-2" : "flex items-center gap-2",
                                        children: [
                                          uploading ? /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { className: "size-5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "size-5", strokeWidth: 1.5 }),
                                          t2("assetPicker.upload.action", "本地上传")
                                        ]
                                      }
                                    )
                                  ]
                                }
                              ),
                              uploads.filter((ref) => !rows.some((row) => identity(row) === identity(ref))).map(
                                (ref) => renderReady(
                                  ref,
                                  url2(ref.path ?? canvasV3ContentPath(ref)) ?? "",
                                  "upload"
                                )
                              ),
                              rows.map((ref) => renderReady(ref, ref.url, id2))
                            ] }),
                            !rows.length && !uploads.length && (filtersActive || !showUpload) && renderEmptyState(
                              id2 === "upstream" ? t2("assetPicker.empty.upstream", "没有连线的可选资源") : t2("assetPicker.empty.canvas", "画布上没有可选资源")
                            )
                          ] }, id2);
                        }),
                        visibleTabs.includes("upload") && /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent$2, { value: "upload", className: "flex flex-col", children: [
                          uploadedRows.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `flex-1 overflow-y-auto ${rowsClassName}`, children: uploadedRows.map(
                            (ref) => renderReady(ref, url2(ref.path ?? canvasV3ContentPath(ref)) ?? "", "upload")
                          ) }),
                          !uploadedRows.length && filtersActive && renderEmptyState(t2("assetPicker.empty.filtered", "没有符合条件的资源")),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs(
                            "div",
                            {
                              className: `flex flex-col items-center justify-center gap-2 px-3 py-6 ${uploadedRows.length || filtersActive ? "border-t border-border" : "flex-1"}`,
                              children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  Button$3,
                                  {
                                    type: "button",
                                    disabled: uploading || busy || !onImportFiles || !uploadMediaKinds.length,
                                    "data-action-ui-id": "canvas-v3.resource-picker.upload-pick",
                                    onClick: () => fileInputRef.current?.click(),
                                    children: uploading ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                                      /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { className: "size-4 animate-spin" }),
                                      t2("assetPicker.upload.uploading", "上传中…")
                                    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                                      /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "size-4", strokeWidth: 1.5 }),
                                      uploaded.length ? t2("assetPicker.upload.continue", "继续上传") : maxCount === 1 ? t2("assetPicker.upload.action") : t2("assetPicker.upload.chooseMulti", "选择文件（可多选）")
                                    ] })
                                  }
                                ),
                                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-[11px] text-muted-foreground", children: t2("assetPicker.upload.hintAttachMulti", "上传后入库为附件，可继续上传") }),
                                uploadError && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { role: "alert", className: "text-center text-[11px] text-destructive", children: [
                                  mediaKinds.includes("audio") ? t2("canvasV3.generation.referenceNotReady") : uploadError === "invalid" ? t2("canvasV3.imageImport.invalid") : t2("canvasV3.imageImport.failed"),
                                  hasPendingImports?.() && /* @__PURE__ */ jsxRuntimeExports.jsx(
                                    Button$3,
                                    {
                                      variant: "ghost",
                                      size: "sm",
                                      disabled: uploading || busy,
                                      "data-action-ui-id": "canvas-v3.resource-picker.upload-retry",
                                      onClick: () => void importFiles(),
                                      children: t2("common.retry", "Retry")
                                    }
                                  )
                                ] })
                              ]
                            }
                          )
                        ] }),
                        visibleTabs.includes("assets") && /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent$2, { value: "assets", className: "flex flex-col", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: rowsClassName, children: visibleResources.map((resource2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 flex-1", children: resource2.currentVersionId ? renderChoice(resource2, resource2.currentVersionId, resource2.name) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 text-sm", children: resource2.name }) }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                Button$3,
                                {
                                  size: "icon",
                                  variant: "ghost",
                                  "aria-expanded": expanded === resource2.resourceId,
                                  "aria-label": t2("canvas.textVersion.historyTitle", "Version history"),
                                  "data-action-ui-id": `canvas-v3.resource-picker.versions-${resource2.resourceId}`,
                                  onClick: () => setExpanded(
                                    expanded === resource2.resourceId ? void 0 : resource2.resourceId
                                  ),
                                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown$3, { size: 14, strokeWidth: 1.5 })
                                }
                              )
                            ] }),
                            expanded === resource2.resourceId && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-4 border-l border-border pl-2", children: [
                              versions.map(
                                (version2) => renderChoice(
                                  resource2,
                                  version2.versionId,
                                  `${resource2.name} · ${version2.createdAt} · ${version2.versionId}`
                                )
                              ),
                              versionLoading && /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { className: "m-2 size-4 animate-spin" }),
                              versionError && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "alert", className: "px-2 text-xs text-destructive", children: t2("canvas.reference.loadFailed", "References could not be loaded") }),
                              versionCursor && /* @__PURE__ */ jsxRuntimeExports.jsx(
                                Button$3,
                                {
                                  variant: "ghost",
                                  disabled: versionLoading,
                                  onClick: () => void more(resource2.resourceId),
                                  children: t2("common.loadMore", "Load more")
                                }
                              )
                            ] })
                          ] }, resource2.resourceId)) }),
                          loading && /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { className: "m-2 size-4 animate-spin" }),
                          !loading && !error && !visibleResources.length && renderEmptyState(t2("assetPicker.empty.filtered", "没有符合条件的资源")),
                          cursor && /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "ghost", disabled: loading, onClick: () => void more(), children: t2("common.loadMore", "Load more") })
                        ] }),
                        rectangle && /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "div",
                          {
                            "data-action-ui-id": "canvas-v3.resource-picker.marquee",
                            className: "pointer-events-none absolute z-50 border border-foreground/30 bg-foreground/10",
                            style: {
                              left: rectangle.left,
                              top: rectangle.top,
                              width: rectangle.right - rectangle.left,
                              height: rectangle.bottom - rectangle.top
                            }
                          }
                        )
                      ]
                    }
                  )
                ] })
              ]
            }
          ),
          uploadError && tab2 !== "upload" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { role: "alert", className: "px-4 text-xs text-destructive", children: [
            t2("assetPicker.upload.failed", "上传失败"),
            hasPendingImports?.() && /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button$3,
              {
                variant: "ghost",
                disabled: uploading || busy,
                "data-action-ui-id": "canvas-v3.resource-picker.upload-retry",
                onClick: () => void importFiles(),
                children: t2("common.retry", "Retry")
              }
            )
          ] }),
          (error || versionError) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { role: "alert", className: "text-xs text-destructive", children: [
            t2("canvas.reference.loadFailed", "References could not be loaded"),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "ghost", disabled: busy, onClick: () => setReload((value) => value + 1), children: t2("common.retry", "Retry") })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter$3, { className: "flex-row items-center gap-4 border-t border-border px-4 py-3 sm:justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "mr-auto min-w-0 text-xs text-muted-foreground",
                "aria-live": "polite",
                "data-action-ui-id": "canvas-v3.resource-picker.selection-summary",
                title: [...selected2.values()].map((ref) => ref.ready?.name ?? ref.name ?? ref.versionId).join("、"),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium text-foreground", children: Number.isFinite(maxCount) ? t2("assetPicker.summary.bounded", "已选：{{count}} / {{max}}", {
                    count: selected2.size,
                    max: Math.min(
                      maxCount,
                      mediaKinds.filter((kind2) => kind2 !== "video" && kind2 !== "audio").reduce((sum2, kind2) => sum2 + (selectionLimits?.[kind2] ?? maxCount), 0) + Math.min(
                        sharedMediaLimit ?? maxCount,
                        mediaKinds.filter((kind2) => kind2 === "video" || kind2 === "audio").reduce((sum2, kind2) => sum2 + (selectionLimits?.[kind2] ?? maxCount), 0)
                      )
                    )
                  }) : t2("assetPicker.summary.unbounded", "已选 {{count}} 项", { count: selected2.size }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 text-[11px]", children: [
                    t2("assetPicker.summary.types", "可选：{{types}}", {
                      types: mediaKinds.map((kind2) => {
                        const label = typeLabel(kind2);
                        const limit = selectionLimits?.[kind2];
                        return limit === void 0 ? label : t2("assetPicker.summary.limits", "最多 {{types}}", {
                          types: `${limit} ${label}`
                        });
                      }).join(" · ")
                    }),
                    sharedMediaLimit !== void 0 && mediaKinds.includes("video") && mediaKinds.includes("audio") ? t2("assetPicker.summary.shared", "；视频与音频合计最多 {{max}} 项", {
                      max: sharedMediaLimit
                    }) : "",
                    minCount !== void 0 && minCount > 0 ? t2("assetPicker.summary.minimum", "；至少选择 {{min}} 项", { min: minCount }) : ""
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button$3,
              {
                variant: "outline",
                className: "min-w-22 rounded-[calc(var(--radius-sm)+2px)]",
                onClick: cancel,
                "data-action-ui-id": "canvas-v3.resource-picker.cancel",
                children: t2("common.cancel", "取消")
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button$3,
              {
                disabled: busy || uploading || !selected2.size || selected2.size < (minCount ?? 0),
                className: "min-w-26 rounded-[calc(var(--radius-sm)+2px)]",
                onClick: () => void confirm(),
                "data-action-ui-id": "canvas-v3.resource-picker.confirm",
                children: busy ? /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { className: "size-4 animate-spin" }) : minCount !== void 0 && selected2.size < minCount ? t2("assetPicker.confirmMin", "至少选 {{min}} 项", { min: minCount }) : t2("common.confirm", "确认")
              }
            )
          ] })
        ]
      }
    )
  ] });
}

export function PromoteToAssetDialog({ files, workspaceRoot, onClose }) {
  const { t: t2 } = useTranslation();
  const [isSubmitting, setIsSubmitting] = reactExports.useState(false);
  const filesLen = files?.length ?? 0;
  const open = files !== null && filesLen > 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Dialog$3,
    {
      open,
      onOpenChange: (o2) => {
        if (!o2 && !isSubmitting) onClose();
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        DialogContent$4,
        {
          className: "sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-xl",
          "data-action-ui-id": "asset-panel.promote-to-asset-dialog",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader$2, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle$4, { children: t2("assetCenter.promote.title") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription$4, { className: "text-xs", children: t2("assetCenter.promote.descriptionMulti", { count: filesLen }) })
            ] }),
            open && files && /* @__PURE__ */ jsxRuntimeExports.jsx(
              PromoteToAssetForm,
              {
                files,
                workspaceRoot,
                onCancel: onClose,
                onSuccess: onClose,
                onSubmittingChange: setIsSubmitting,
                variant: "dialog"
              }
            )
          ]
        }
      )
    }
  );
}

export const ActionsContext = reactExports.createContext({});

export function CompositionActionsProvider({
  actions,
  children: children2
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ActionsContext.Provider, { value: actions, children: children2 });
}

export function toAsyncSectionState(input) {
  const { hasData, isError, isFetching, isEmpty: isEmpty2 = false } = input;
  if (!hasData) {
    if (isError) return frozen("error", false, false, true);
    if (isFetching) return frozen("loading", false, true, false);
    return frozen("loading", false, false, false);
  }
  const status = isEmpty2 ? "empty" : "ready";
  return frozen(status, isError, isFetching, isError);
}

export function frozen(status, staleError, refreshing, canRetry) {
  return Object.freeze({ status, staleError, refreshing, canRetry });
}

export function createCompositionQueryOptions(client, scopeKey) {
  assertScope(scopeKey);
  return {
    details(compositionId) {
      return queryOptions({
        ...defaults,
        queryKey: compositionQueryKeys.domain(scopeKey, "get", { compositionId }),
        queryFn: ({ signal }) => client.get(compositionId, { signal })
      });
    },
    list(input = {}) {
      const query = structuredClone(input);
      return queryOptions({
        ...defaults,
        queryKey: compositionQueryKeys.domain(scopeKey, "list", query),
        queryFn: ({ signal }) => client.list(query, { signal })
      });
    },
    search(input = {}) {
      const query = structuredClone(input);
      return queryOptions({
        ...defaults,
        queryKey: compositionQueryKeys.domain(scopeKey, "search", query),
        queryFn: ({ signal }) => client.search(query, { signal })
      });
    },
    /** Full resolved export. */
    listAll(input = {}) {
      const query = structuredClone(input);
      return queryOptions({
        ...defaults,
        queryKey: compositionQueryKeys.domain(scopeKey, "listAll", query),
        queryFn: ({ signal }) => client.listAll(query, { signal })
      });
    },
    listByResource(input) {
      const query = structuredClone(input);
      return queryOptions({
        ...defaults,
        queryKey: compositionQueryKeys.domain(scopeKey, "listByResource", query),
        queryFn: ({ signal }) => client.listByResource(query, { signal })
      });
    },
    types(input = {}) {
      const query = structuredClone(input);
      return queryOptions({
        ...defaults,
        queryKey: compositionQueryKeys.domain(scopeKey, "listTypes", query),
        queryFn: ({ signal }) => client.listTypes(query, { signal })
      });
    }
  };
}

export function createTaskQueryOptions(client, scopeKey) {
  if (!scopeKey.trim()) throw new Error("Task queries require a workspace scope");
  const defaults2 = {
    networkMode: "always",
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  };
  return {
    detail(id2) {
      return queryOptions({
        ...defaults2,
        queryKey: [...taskQueryKeys.all(scopeKey), "detail", id2],
        queryFn: ({ signal }) => client.get(id2, { signal })
      });
    },
    list(query = {}) {
      const snapshot2 = structuredClone(query);
      return queryOptions({
        ...defaults2,
        queryKey: [...taskQueryKeys.all(scopeKey), "list", snapshot2],
        queryFn: ({ signal }) => client.list(snapshot2, { signal })
      });
    },
    queue() {
      return queryOptions({
        ...defaults2,
        queryKey: [...taskQueryKeys.all(scopeKey), "queue"],
        queryFn: ({ signal }) => client.queue({ signal })
      });
    }
  };
}

export function useTaskResolve() {
  const workbench = useWorkbench();
  return useMutation({
    networkMode: "always",
    retry: false,
    mutationFn: ({ taskId, input }) => workbench.execution.resolve(taskId, input)
  });
}

export function StructureMediaProvider({
  imageUrl,
  renderImage,
  videoUrl,
  videoThumbnailUrl: videoThumbnailUrl2,
  thumbnailUrl,
  renderAudio,
  renderDocument: renderDocument2,
  renderDocuments: renderDocuments2,
  children: children2
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    MediaUrlContext.Provider,
    {
      value: {
        imageUrl,
        renderImage,
        videoUrl,
        videoThumbnailUrl: videoThumbnailUrl2,
        thumbnailUrl,
        renderAudio,
        renderDocument: renderDocument2,
        renderDocuments: renderDocuments2
      },
      children: children2
    }
  );
}

export function resourceBatches(locations) {
  const unique2 = [...new Set(locations.map((location2) => location2.resourceId))].sort();
  const batches = [];
  for (let offset2 = 0; offset2 < unique2.length; offset2 += 100)
    batches.push(unique2.slice(offset2, offset2 + 100).map((resourceId2) => ({ resourceId: resourceId2 })));
  return batches;
}

export const structureEditorZh = {
  editorExistingAttribute: "选择已有属性",
  editorNewAttribute: "新增属性",
  editorAttributeHelp: "选择已有属性进行修改，或填写新的属性名。内容支持多行。",
  editorRequiredName: "请填写名称。",
  editorRequiredType: "请选择类型。",
  editorRequiredAttributeKey: "请填写有效的属性名。",
  editorAttributeMissing: "此属性已不存在，请选择已有属性或取消移除。",
  editorRequiredResource: "请选择素材。",
  editorDuplicateReference: "此成员已关联该素材，无需重复添加。",
  editorAlreadyLinked: "已关联",
  editorRequiredDestination: "请选择其他目标成员。",
  editorTargetMissing: "操作位置已不存在，请取消后从最新目录重新操作。",
  editorMemberOccupied: "目标成员已关联其他素材，请先移除或明确替换。",
  editorOrderChanged: "来源或目标成员的素材已变化。本次操作未提交，请取消后从最新目录重新操作。",
  editorReviewTitle: "更新差异",
  editorReviewHelp: "草稿已保留，请对照最新内容检查后再提交。",
  editorOriginalValue: "原基线",
  editorLatestValue: "最新内容",
  editorDraftValue: "我的草稿",
  editorMissingValue: "不存在",
  editorEmptyValue: "空",
  editorRemovedValue: "将移除",
  editorReferenceOrder: "素材引用",
  editorMoveDuplicate: "目标成员已有此素材，移动后只移除来源位置的引用。"
};

export const structureEditorEn = {
  editorExistingAttribute: "Choose an Existing Attribute",
  editorNewAttribute: "New Attribute",
  editorAttributeHelp: "Choose an existing attribute to edit, or enter a new key. Content supports multiple lines.",
  editorRequiredName: "Enter a name.",
  editorRequiredType: "Choose a type.",
  editorRequiredAttributeKey: "Enter a valid attribute key.",
  editorAttributeMissing: "This attribute no longer exists. Choose an existing one or cancel removal.",
  editorRequiredResource: "Choose a resource.",
  editorDuplicateReference: "This member already links to the resource. No duplicate is needed.",
  editorAlreadyLinked: "Already linked",
  editorRequiredDestination: "Choose another destination member.",
  editorTargetMissing: "The target no longer exists. Cancel and start again from the current structure.",
  editorMemberOccupied: "The member holds another resource. Clear or explicitly replace it first.",
  editorOrderChanged: "The source or destination resource changed. Nothing was submitted. Cancel and start again from the current structure.",
  editorReviewTitle: "Review Changes",
  editorReviewHelp: "Your draft is retained. Compare it with the latest content before submitting.",
  editorOriginalValue: "Original",
  editorLatestValue: "Latest",
  editorDraftValue: "My Draft",
  editorMissingValue: "Not present",
  editorEmptyValue: "Empty",
  editorRemovedValue: "Will remove",
  editorReferenceOrder: "Resource reference",
  editorMoveDuplicate: "The destination already links to this resource. Moving it will only remove the source reference."
};

export const compositionEditZh = {
  editComposition: "编辑 Composition",
  editCompositionNamed: "编辑 {{name}}",
  editBasic: "基本信息",
  editAttributes: "属性",
  editGroups: "成员",
  editGroupName: "成员名称",
  editAddGroup: "添加成员",
  editRemoveGroup: "移除成员",
  editAddResources: "添加素材",
  editRemove: "移除",
  editReplace: "替换",
  editEarlier: "前移",
  editLater: "后移",
  editMoveTo: "移动到其他成员",
  editUnclassified: "未分类",
  editAttributeKey: "属性名",
  editAttributeValue: "属性内容",
  editAddAttribute: "添加属性",
  editAttributeHint: "内容支持多行。属性改名后将移至末尾。",
  editReferenceHint: "每位成员最多关联一个素材；移除成员或引用不会删除素材。",
  editClose: "关闭编辑面板",
  editCloseButton: "关闭",
  editSave: "保存",
  editDiscardTitle: "有尚未保存的修改",
  editDiscardHint: "放弃仅撤销未提交的草稿，已经保存的修改会保留。",
  editDiscard: "放弃未保存的修改",
  editContinue: "继续编辑",
  editKeepDraft: "保留草稿并关闭",
  editProgress: "已保存 {{saved}} / {{total}} 项修改",
  editPartial: "部分修改已保存，其余草稿已保留。",
  editInvalid: "请填写名称和有效、唯一的属性名；每位成员最多关联一个素材。",
  editReadFailed: "读取失败，请重试。草稿已保留。",
  editPending: "此 Composition 还有未确认的操作，请先恢复操作结果。",
  editKeepMine: "保留我的修改",
  editUseLatest: "采用最新内容",
  editConflictHint: "请核对原内容、最新内容和草稿。保留我的修改会覆盖相应字段，未修改的字段使用最新内容。",
  editTargetMissing: "编辑的成员已被移除，请采用最新内容后重新编辑。",
  editDeleted: "此 Composition 已删除，关联素材已保留。",
  editRestore: "撤销删除",
  editDeleteHint: "请先保存或放弃当前修改，再删除 Composition。",
  editConfirmDelete: "确认删除 Composition",
  editResourceSearch: "搜索当前项目素材",
  editResourceKind: "素材类型",
  editAllResources: "全部素材",
  editImage: "图片",
  editVideo: "视频",
  editAudio: "音频",
  editDocument: "文档",
  editSelectResources: "选择已有素材",
  editConfirmResources: "添加选中的素材",
  editConfirmReplace: "替换为选中的素材",
  editNoResources: "暂无匹配素材",
  editBack: "返回编辑",
  editSelected: "已选择"
};

export const compositionEditEn = {
  editComposition: "Edit Composition",
  editCompositionNamed: "Edit {{name}}",
  editBasic: "Basic information",
  editAttributes: "Attributes",
  editGroups: "Members",
  editGroupName: "Member name",
  editAddGroup: "Add member",
  editRemoveGroup: "Remove member",
  editAddResources: "Add resource",
  editRemove: "Remove",
  editReplace: "Replace",
  editEarlier: "Move earlier",
  editLater: "Move later",
  editMoveTo: "Move to another member",
  editUnclassified: "Unclassified",
  editAttributeKey: "Attribute name",
  editAttributeValue: "Attribute content",
  editAddAttribute: "Add attribute",
  editAttributeHint: "Content supports multiple lines. Renamed attributes move to the end.",
  editReferenceHint: "Each member links to at most one resource. Removing a member or reference keeps the resource.",
  editClose: "Close composition editor",
  editCloseButton: "Close",
  editSave: "Save",
  editDiscardTitle: "You have unsaved changes",
  editDiscardHint: "Discarding only removes unsubmitted changes. Saved changes will remain.",
  editDiscard: "Discard unsaved changes",
  editContinue: "Continue editing",
  editKeepDraft: "Keep draft and close",
  editProgress: "Saved {{saved}} of {{total}} changes",
  editPartial: "Some changes were saved. The remaining draft has been retained.",
  editInvalid: "Enter a name and valid, unique attribute names. Each member links to at most one resource.",
  editReadFailed: "Could not read the composition. Retry; your draft is retained.",
  editPending: "This composition has an unconfirmed operation. Recover its result first.",
  editKeepMine: "Keep my changes",
  editUseLatest: "Use latest content",
  editConflictHint: "Compare the original, latest content and your draft. Keeping your changes overwrites the edited fields; unedited fields retain the latest content.",
  editTargetMissing: "An edited member was removed. Use the latest content and edit again.",
  editDeleted: "This composition was deleted. Its resources have been retained.",
  editRestore: "Undo deletion",
  editDeleteHint: "Save or discard your changes before deleting this composition.",
  editConfirmDelete: "Confirm composition deletion",
  editResourceSearch: "Search project resources",
  editResourceKind: "Resource type",
  editAllResources: "All resources",
  editImage: "Images",
  editVideo: "Videos",
  editAudio: "Audio",
  editDocument: "Documents",
  editSelectResources: "Choose an existing resource",
  editConfirmResources: "Add selected resource",
  editConfirmReplace: "Replace with selected resource",
  editNoResources: "No matching resources",
  editBack: "Back to editor",
  editSelected: "Selected"
};

export const treeLabelsZh = {
  dragHint: "拖动素材可移至空成员或关联同一素材的成员；也可使用行尾操作。放下后确认保存。",
  dragReference: "拖动 {{name}}，或点击选择移动位置",
  dropBefore: "放在 {{name}} 之前",
  dropAtEnd: "放到 {{name}} 末尾",
  dropMove: "移动到 {{name}}，已有引用不重复添加",
  dragChanged: "内容已变化或目标不可用，请重新拖动。",
  emptyMemberDrop: "此成员暂无素材，可拖入当前结构内的素材或关联素材。"
};

export const treeLabelsEn = {
  dragHint: "Drag a resource to an empty member or one linking the same resource, or use row actions. Confirm to save after dropping.",
  dragReference: "Drag {{name}} Or Click To Choose A Destination",
  dropBefore: "Place before {{name}}",
  dropAtEnd: "Place at the end of {{name}}",
  dropMove: "Move to {{name}} without duplicating an existing reference",
  dragChanged: "The content changed or the destination is unavailable. Start the drag again.",
  emptyMemberDrop: "No resources in this member. Drag from this structure or link a resource."
};

export const zh = {
  ...compositionEditZh,
  audioOff: "无声",
  audioOn: "有声",
  jsonExpand: "展开",
  jsonCollapse: "收起",
  jsonMore: "查看其余 {{count}} 项",
  jsonParameters: "参数",
  jsonFieldId: "编号",
  jsonFieldEpisode: "集数",
  jsonFieldType: "类型",
  jsonFieldDuration: "时长（秒）",
  jsonFieldAspectRatio: "画幅",
  jsonFieldEmotion: "情绪强度",
  jsonFieldImagePrompt: "画面 Prompt",
  jsonFieldVideoPrompt: "视频 Prompt",
  jsonFieldReferences: "参考图",
  jsonFieldImageGeneration: "图片生成",
  jsonFieldVideoGeneration: "视频生成",
  jsonFieldCapability: "模型",
  jsonFieldResolution: "分辨率",
  jsonFieldQuality: "质量",
  jsonFieldMode: "模式",
  jsonFieldAudio: "生成声音",
  referenceDuration: "时长",
  documentBackup: "阅读备份与原始数据",
  referenceDimensions: "尺寸",
  referenceFormat: "格式",
  referenceSize: "大小",
  referenceModified: "修改时间",
  referenceDependencies: "查看依赖",
  referenceNoDependencies: "没有记录输入素材",
  referenceVersion: "引用版本",
  ...structureEditorZh,
  ...treeLabelsZh,
  pageEmpty: "暂无内容",
  networkError: "网络连接已断开，请检查网络后重试。",
  directoryContents: "项目结构目录",
  directorySearch: "搜索结构名称",
  directoryEmpty: "暂无结构",
  directoryEmptyMembers: "暂无成员",
  directoryEmptyResources: "暂无素材",
  advancedSearch: "搜索选项",
  testViewNotice: "测试视图；实际展示位置由项目工作区控制。",
  resourceStrip: "关联素材",
  documentEmpty: "文档暂无正文",
  documentIncomplete: "正文过长，当前内容未完整显示。",
  editResourceNamed: "编辑素材 {{name}}",
  addToChat: "添加到对话",
  collect: "收录进资产库",
  exportComposition: "导出",
  selectVersionNamed: "选择版本 {{versionId}}",
  adoptVersion: "设为当前版本",
  adoptVersionNotice: "选择版本仅预览；设为当前版本后，引用此素材的所有结构都会跟随更新。",
  previewNamed: "预览 {{name}}",
  previewVersionNamed: "预览 {{name}}，{{time}}，版本 {{versionId}}",
  moreResourcePreviews: "展开其余 {{count}} 个素材预览",
  moreResourceCount: "+{{count}}",
  fewerResourcePreviews: "收起更多预览",
  manageResources: "管理素材",
  editContent: "编辑内容",
  closeManagement: "收起管理",
  typeFilters: "结构类型筛选",
  mediaLoading: "媒体加载中",
  mediaUnavailable: "暂无内容预览",
  mediaFailed: "媒体加载失败",
  mediaPlayNamed: "播放 {{name}}",
  mediaPauseNamed: "暂停 {{name}}",
  versionDetails: "版本信息",
  filtersActive: "筛选已启用",
  title: "项目 Composition",
  subtitle: "当前项目的结构、成员与素材引用。",
  tree: "目录",
  viewMode: "结构展示方式",
  editNamed: "编辑 {{name}}",
  editingBadge: "编辑中",
  unconfirmedBadge: "待确认",
  previewPanel: "所选素材详情",
  unavailable: "当前项目暂不支持结构管理。",
  loading: "正在读取…",
  empty: "暂无结构。",
  emptyMembers: "暂无成员，可以添加成员后关联素材。",
  loadError: "读取失败，请重试。",
  stale: "刷新未完成，当前显示上次读取的内容。",
  partial: "部分内容尚未就绪，当前结果不代表全部内容。",
  refresh: "刷新",
  retry: "重试",
  more: "加载更多",
  restart: "从头重新读取",
  allTypes: "全部类型",
  list: "列表",
  cards: "卡片",
  open: "展开 {{name}}",
  selectMedia: "预览 {{name}}",
  select: "选择一个结构查看成员",
  loaded: "已加载 {{count}} 项",
  referenceCount: "{{count}} 个引用",
  knownReferences: "已读取 {{count}} 个引用",
  create: "新建结构",
  rename: "修改名称",
  type: "修改类型",
  attribute: "编辑属性",
  delete: "删除结构",
  "add-member": "添加成员",
  "member-role": "修改成员名称",
  "remove-member": "移除成员",
  "add-reference": "关联素材",
  "remove-reference": "移除引用",
  move: "移动到",
  reorder: "调整引用顺序",
  actions: "操作",
  name: "名称",
  typeLabel: "类型",
  memberLabel: "成员名称",
  attributeKey: "属性名",
  value: "内容",
  destination: "目标成员",
  choose: "请选择",
  resource: "项目素材",
  removeAttribute: "移除此属性",
  save: "确认提交",
  cancel: "取消",
  saving: "正在提交…",
  loadingBaseline: "正在读取最新内容…",
  confirmDelete: "确认删除此结构？关联素材不会被删除。",
  closeDelete: "关闭删除确认",
  confirmMember: "确认移除此成员及其引用？素材不会被删除。",
  confirmReference: "确认移除此位置的引用？素材及其他位置不会被删除。",
  saved: "操作已完成。",
  conflict: "内容已被其他操作更新。草稿已保留，请重新读取后检查并再次提交。",
  unknown: "提交结果尚未确认。请恢复本次操作，不要重复创建新操作。",
  rejected: "操作未成功，请检查内容或重新读取后再试。",
  invalid: "请检查输入内容和操作位置。",
  reloadBaseline: "重新读取并保留草稿",
  recover: "恢复本次操作",
  pending: "此结构有未确认的操作。",
  members: "成员",
  unnamedMember: "未命名成员",
  deleted: "此结构已删除。",
  history: "历史版本",
  preview: "版本详情",
  current: "当前采用",
  followingCurrent: "跟随当前版本",
  pinned: "固定版本预览",
  pinNotice: "预览不会改变当前采用的版本。",
  noVersion: "暂无可用版本",
  missing: "素材不可用",
  readFailed: "素材读取失败",
  resourceLoading: "正在读取素材",
  createdAt: "创建时间",
  updatedAt: "更新时间",
  versionId: "版本",
  path: "文件",
  dependencies: "输入依赖",
  noDependencies: "没有记录输入依赖",
  previewUnavailable: "内容预览暂未接入，可查看此版本信息。",
  text: "文本",
  image: "图片",
  video: "视频",
  audio: "音频",
  earlier: "向前移动",
  later: "向后移动",
  noResources: "没有可关联的素材",
  typeError: "类型读取失败；已有结构仍可查看。",
  closePreview: "关闭版本详情",
  projectSearch: "项目内搜索",
  searchCompositions: "搜索结构",
  searchResources: "查找素材引用",
  searchName: "名称关键词",
  search: "搜索",
  clearSearch: "清空筛选",
  attributeFilter: "按属性筛选",
  attributeExactValue: "属性值（精确匹配）",
  projectSearchNotice: "仅搜索当前项目。查找素材引用后，可选择具体位置定位。",
  resourceResults: "素材搜索结果",
  noSearchResults: "没有符合筛选条件的结果。",
  searchIncomplete: "暂未读取到匹配项，当前结果尚不完整。",
  showLocationsNamed: "查看 {{name}} 的引用位置",
  locations: "引用位置",
  refreshLocations: "刷新位置",
  chooseLocation: "请选择具体的结构和成员；定位前会重新确认该引用。",
  loadedLocations: "已读取 {{count}} 个引用位置",
  noLocations: "当前项目中没有找到此素材的结构引用。",
  locationsIncomplete: "暂未读取到引用位置，当前结果尚不完整。",
  locate: "定位到此处",
  locateNamed: "定位到 {{name}} / {{role}}",
  locationNameUnavailable: "名称暂不可用，仍可尝试确认此位置。",
  locationResult: "定位结果",
  locatedMemberOnly: "当前仅显示定位成员，可返回完整目录继续浏览。",
  locatedReferenceCount: "当前成员显示 {{count}} 个引用",
  fullTree: "返回完整目录",
  verifyingLocation: "正在确认引用位置…",
  locationGone: "此引用位置已失效，可能已被移动或删除。请刷新引用位置后重新选择。",
  locationUnconfirmed: "当前读取结果不完整，暂时无法确认此引用位置。",
  locationUpdated: "结构已更新，已按最新内容确认此引用位置。",
  locationVerified: "已确认引用位置。",
  locatedHere: "已定位"
};

export const en$2 = {
  ...compositionEditEn,
  audioOff: "Without audio",
  audioOn: "With audio",
  jsonExpand: "Expand",
  jsonCollapse: "Show less",
  jsonMore: "Show {{count}} more items",
  jsonParameters: "Parameters",
  jsonFieldId: "ID",
  jsonFieldEpisode: "Episode",
  jsonFieldType: "Type",
  jsonFieldDuration: "Duration (s)",
  jsonFieldAspectRatio: "Aspect ratio",
  jsonFieldEmotion: "Intensity",
  jsonFieldImagePrompt: "Image prompt",
  jsonFieldVideoPrompt: "Video prompt",
  jsonFieldReferences: "References",
  jsonFieldImageGeneration: "Image generation",
  jsonFieldVideoGeneration: "Video generation",
  jsonFieldCapability: "Model",
  jsonFieldResolution: "Resolution",
  jsonFieldQuality: "Quality",
  jsonFieldMode: "Mode",
  jsonFieldAudio: "Generate audio",
  referenceDuration: "Duration",
  documentBackup: "Reading backup and source documents",
  referenceDimensions: "Dimensions",
  referenceFormat: "Format",
  referenceSize: "Size",
  referenceModified: "Modified",
  referenceDependencies: "Dependencies",
  referenceNoDependencies: "No recorded inputs",
  referenceVersion: "Referenced version",
  ...structureEditorEn,
  ...treeLabelsEn,
  pageEmpty: "No content yet",
  networkError: "No network connection. Check your connection and retry.",
  directoryContents: "Project Structure Directory",
  directorySearch: "Search structure names",
  directoryEmpty: "No structures yet",
  directoryEmptyMembers: "No members yet",
  directoryEmptyResources: "No resources yet",
  advancedSearch: "Search Options",
  testViewNotice: "Test view. The project workspace controls the production surface.",
  resourceStrip: "Linked Resources",
  documentEmpty: "This document is empty.",
  documentIncomplete: "This document is too long to display in full.",
  editResourceNamed: "Edit Resource {{name}}",
  addToChat: "Add to Chat",
  collect: "Save to Asset Library",
  exportComposition: "Export",
  selectVersionNamed: "Select Version {{versionId}}",
  adoptVersion: "Use This Version",
  adoptVersionNotice: "Selecting a version only previews it. Applying it updates the current version in every structure referencing this resource.",
  previewNamed: "Preview {{name}}",
  previewVersionNamed: "Preview {{name}}, {{time}}, version {{versionId}}",
  moreResourcePreviews: "Show {{count}} More Resource Previews",
  moreResourceCount: "+{{count}}",
  fewerResourcePreviews: "Show Fewer Previews",
  manageResources: "Manage Resources",
  editContent: "Edit Content",
  closeManagement: "Close Management",
  typeFilters: "Structure Type Filters",
  mediaLoading: "Loading media",
  mediaUnavailable: "Preview Unavailable",
  mediaFailed: "Unable to load media",
  mediaPlayNamed: "Play {{name}}",
  mediaPauseNamed: "Pause {{name}}",
  versionDetails: "Version Information",
  filtersActive: "Filters Active",
  title: "Project Composition",
  subtitle: "Structures, members and resource references in this project.",
  tree: "Directory",
  viewMode: "Structure view",
  editNamed: "Edit {{name}}",
  editingBadge: "Editing",
  unconfirmedBadge: "Unconfirmed",
  previewPanel: "Selected resource details",
  unavailable: "Structure is unavailable in this project.",
  loading: "Loading…",
  empty: "No structures yet.",
  emptyMembers: "No members yet. Add a member to link resources.",
  loadError: "Unable to load. Please retry.",
  stale: "Refresh did not complete. Previously loaded content is still visible.",
  partial: "Some content is not ready. These results are incomplete.",
  refresh: "Refresh",
  retry: "Retry",
  more: "Load More",
  restart: "Reload From the Start",
  allTypes: "All Types",
  list: "List",
  cards: "Cards",
  open: "Open {{name}}",
  selectMedia: "Preview {{name}}",
  select: "Select a structure to view its members",
  loaded: "{{count}} loaded",
  referenceCount: "{{count}} references",
  knownReferences: "{{count}} references loaded",
  create: "Create Structure",
  rename: "Rename",
  type: "Change Type",
  attribute: "Edit Attribute",
  delete: "Delete Structure",
  "add-member": "Add Member",
  "member-role": "Rename Member",
  "remove-member": "Remove Member",
  "add-reference": "Link Resource",
  "remove-reference": "Remove Reference",
  move: "Move To",
  reorder: "Reorder References",
  actions: "Actions",
  name: "Name",
  typeLabel: "Type",
  memberLabel: "Member name",
  attributeKey: "Attribute key",
  value: "Value",
  destination: "Destination member",
  choose: "Select an option",
  resource: "Project resource",
  removeAttribute: "Remove this attribute",
  save: "Confirm",
  cancel: "Cancel",
  saving: "Submitting…",
  loadingBaseline: "Loading the latest content…",
  confirmDelete: "Delete this structure? Its resources will not be deleted.",
  closeDelete: "Close Delete Confirmation",
  confirmMember: "Remove this member and its references? Resources will not be deleted.",
  confirmReference: "Remove the reference at this location? Its resource and other locations will not be deleted.",
  saved: "Operation completed.",
  conflict: "The content changed. Your draft is retained. Reload, review and submit again.",
  unknown: "The result is unconfirmed. Recover this operation instead of creating a new one.",
  rejected: "The operation failed. Check the content or reload before retrying.",
  invalid: "Check your input and the selected location.",
  reloadBaseline: "Reload and Keep Draft",
  recover: "Recover Operation",
  pending: "This structure has an unconfirmed operation.",
  members: "Members",
  unnamedMember: "Unnamed member",
  deleted: "This structure has been deleted.",
  history: "Version History",
  preview: "Version Details",
  current: "Current",
  followingCurrent: "Follow Current Version",
  pinned: "Pinned version preview",
  pinNotice: "Previewing does not change the current version.",
  noVersion: "No usable version",
  missing: "Resource unavailable",
  readFailed: "Unable to read resource",
  resourceLoading: "Loading resource",
  createdAt: "Created",
  updatedAt: "Updated",
  versionId: "Version",
  path: "File",
  dependencies: "Input dependencies",
  noDependencies: "No input dependencies recorded",
  previewUnavailable: "Content preview is not connected yet. Version information is available below.",
  text: "Text",
  image: "Image",
  video: "Video",
  audio: "Audio",
  earlier: "Move Earlier",
  later: "Move Later",
  noResources: "No resources available to link",
  typeError: "Unable to load types. Existing structures are still available.",
  closePreview: "Close Version Details",
  projectSearch: "Search This Project",
  searchCompositions: "Search Structures",
  searchResources: "Find Resource References",
  searchName: "Name keywords",
  search: "Search",
  clearSearch: "Clear Filters",
  attributeFilter: "Filter by Attribute",
  attributeExactValue: "Attribute value (exact match)",
  projectSearchNotice: "Search this project only. Choose a reference location to reveal it in the structure.",
  resourceResults: "Resource Search Results",
  noSearchResults: "No results match these filters.",
  searchIncomplete: "No matches have been loaded yet. These results are incomplete.",
  showLocationsNamed: "Show reference locations for {{name}}",
  locations: "Reference Locations",
  refreshLocations: "Refresh Locations",
  chooseLocation: "Choose a specific structure and member. The reference will be checked again before locating it.",
  loadedLocations: "{{count}} reference locations loaded",
  noLocations: "No structure references to this resource were found in this project.",
  locationsIncomplete: "No locations have been loaded yet. These results are incomplete.",
  locate: "Locate Here",
  locateNamed: "Locate in {{name}} / {{role}}",
  locationNameUnavailable: "The name is unavailable. You can still try to verify this location.",
  locationResult: "Located Reference",
  locatedMemberOnly: "Only the located member is shown. Return to the full tree to keep browsing.",
  locatedReferenceCount: "{{count}} references shown in this member",
  fullTree: "Return to Full Tree",
  verifyingLocation: "Verifying the reference location…",
  locationGone: "This reference location is no longer valid. It may have been moved or deleted. Refresh locations and choose again.",
  locationUnconfirmed: "The results are incomplete. This reference location cannot be confirmed yet.",
  locationUpdated: "The structure changed. This reference location was verified against its latest content.",
  locationVerified: "Reference location verified.",
  locatedHere: "Located"
};

export const structureTranslations = { zh, en: en$2 };

export const ResourceDetailDialogContext = reactExports.createContext(null);

export const ResourceDetailContext = reactExports.createContext(null);

export function ResourceDetailProvider({
  render: render2,
  renderDialog,
  children: children2
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ResourceDetailContext.Provider, { value: render2 ?? null, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResourceDetailDialogContext.Provider, { value: renderDialog ?? null, children: children2 }) });
}

export function useWorkspaceChatComposer(workbench, workspaceRoot, active2) {
  const lifetime = reactExports.useMemo(
    () => ({ workbench, workspaceRoot, active: active2, mounted: true }),
    [workbench, workspaceRoot, active2]
  );
  const current2 = reactExports.useRef(lifetime);
  current2.current = lifetime;
  reactExports.useLayoutEffect(() => {
    lifetime.mounted = true;
    return () => {
      lifetime.mounted = false;
    };
  }, [lifetime]);
  return reactExports.useMemo(() => {
    if (!workbench || !workspaceRoot || !active2) return;
    return createFrameChatComposer({
      workspaceId: workspaceRoot,
      resources: workbench.resources,
      compositions: { workspaceRoot, reader: workbench.structure },
      assertLive() {
        if (current2.current !== lifetime || !lifetime.mounted)
          throw new Error("CHAT_SCOPE_RETIRED");
      }
    });
  }, [workbench, workspaceRoot, active2, lifetime]);
}

export function resolveResourceAbsolutePath(workspacePath, relativePath) {
  if (!workspacePath || !relativePath) return void 0;
  const base2 = workspacePath.replace(/[\\/]+$/, "");
  const rel = relativePath.replace(/^[\\/]+/, "");
  return `${base2}/${rel}`;
}

export async function readCompositionFiles(workbench, compositionId, workspaceRoot) {
  const { composition: composition2, details } = await readCompositionResources(
    workbench.structure,
    workbench.resources,
    compositionId
  );
  const files = [];
  for (const { resource: resource2, version: version2 } of details) {
    const relativePath = version2.relativePath;
    if (
      // biome-ignore lint/suspicious/noControlCharactersInRegex: Reject unsafe characters before passing paths to native file operations.
      /^[\\/]|^[a-z]:|[\u0000-\u001f]/i.test(relativePath) || relativePath.split(/[\\/]/).some((part) => part === ".." || part === ".")
    )
      throw new Error("Invalid resource path");
    const absolutePath = resolveResourceAbsolutePath(workspaceRoot, relativePath);
    if (!absolutePath) throw new Error("Workspace unavailable");
    const extension2 = relativePath.split(/[\\/]/).at(-1)?.match(/\.[^.]+$/)?.[0] ?? "";
    const displayName2 = resource2.name.toLowerCase().endsWith(extension2.toLowerCase()) ? resource2.name : `${resource2.name}${extension2}`;
    files.push({ workspaceRelPath: relativePath, absolutePath, displayName: displayName2 });
  }
  return { composition: composition2, files };
}

export function WorkspaceCompositionActions({
  children: children2,
  active: active2
}) {
  const workbench = useWorkbench();
  const workspaceRoot = useCurrentWorkspace();
  const composer = useWorkspaceChatComposer(workbench, workspaceRoot, active2);
  const gatewayFetch2 = useGatewayFetch();
  const { saveManyAs } = useMediaActions();
  const { t: t2 } = useTranslation();
  const [files, setFiles] = reactExports.useState(null);
  const [busy, setBusy] = reactExports.useState(false);
  const inFlight = reactExports.useRef(false);
  const live = reactExports.useRef({ active: active2, workbench, workspaceRoot, mounted: true });
  live.current = { active: active2, workbench, workspaceRoot, mounted: live.current.mounted };
  reactExports.useEffect(() => {
    live.current.mounted = true;
    return () => {
      live.current.mounted = false;
    };
  }, []);
  async function handleAction(id2, action2) {
    if (inFlight.current || !active2 || !workspaceRoot) return;
    inFlight.current = true;
    setBusy(true);
    const stillCurrent = () => live.current.mounted && live.current.active && live.current.workbench === workbench && live.current.workspaceRoot === workspaceRoot;
    try {
      if (action2 === "chat") {
        await composer?.draft({ compositions: [{ compositionId: id2 }] });
        return;
      }
      const resolved = await readCompositionFiles(workbench, id2, workspaceRoot);
      if (!stillCurrent()) return;
      if (action2 === "collect") {
        setFiles(resolved.files);
      } else {
        const exportFiles = async (selected2) => {
          if (!stillCurrent()) return;
          await withCanvasTagDownloadActivity({
            gatewayFetch: gatewayFetch2,
            workspaceDir: workspaceRoot,
            ownerPid: getRuntimeConfig().rendererPid,
            task: () => saveManyAs(selected2, {
              rootFolderName: resolved.composition.name || t2("canvas.subject.identity.untitled"),
              onRetry: (failed) => {
                void exportFiles(failed).catch(() => dedupedToast.error(t2("common.saveFailed")));
              }
            })
          });
        };
        await exportFiles(
          resolved.files.map((file) => ({
            filePath: file.absolutePath,
            fileName: file.displayName
          }))
        );
      }
    } catch {
      if (!stillCurrent()) return;
      window.hilo?.logger?.error(`[composition-actions] ${action2} failed`, "composition-actions");
      dedupedToast.error(
        t2(action2 === "export" ? "common.saveFailed" : "workspace.structure.actionFailed")
      );
    } finally {
      inFlight.current = false;
      if (live.current.mounted) setBusy(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      CompositionActionsProvider,
      {
        actions: {
          busy,
          addToChat: (id2) => void handleAction(id2, "chat"),
          collect: (id2) => void handleAction(id2, "collect"),
          export: (id2) => void handleAction(id2, "export")
        },
        children: children2
      }
    ),
    files && /* @__PURE__ */ jsxRuntimeExports.jsx(
      PromoteToAssetDialog,
      {
        files,
        workspaceRoot: workspaceRoot ?? null,
        onClose: () => setFiles(null)
      }
    )
  ] });
}

export class ResourceGenerationHistoryUnavailableError extends Error {
  constructor() {
    super("Generation history is unavailable for this version");
    this.name = "ResourceGenerationHistoryUnavailableError";
  }
}

export function createDetailReferenceImports$1(workbench, createBatch) {
  return createBatch(async (path2, init2) => {
    const prefix = `${CANVAS_V3_ROUTES.images}/`;
    const file = init2?.body instanceof FormData ? init2.body.get("file") : null;
    if (!workbench.importCanvasImage || init2?.method !== "POST" || !path2.startsWith(prefix) || !(file instanceof File))
      throw new Error("CANVAS_V3_IMPORT_UNAVAILABLE");
    const result = await workbench.importCanvasImage(
      { importId: decodeURIComponent(path2.slice(prefix.length)), name: file.name, file },
      init2.signal ? { signal: init2.signal } : void 0
    );
    return Response.json(result);
  });
}

export function ImageFullscreenButton({
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

export const AudioPlayer = reactExports.memo(function AudioPlayer22({
  src,
  fileName,
  isPlaying,
  active: active2 = true,
  onTogglePlay: handleTogglePlay,
  onStop: stop,
  onDownload,
  onError,
  onLoadedData,
  volume = 1,
  onVolumeChange,
  compact: compact2 = false
}) {
  const { t: t2 } = useTranslation();
  const audioRef = reactExports.useRef(null);
  const rafRef = reactExports.useRef(0);
  const playedRef = reactExports.useRef(null);
  const durationRef = reactExports.useRef(null);
  const [duration, setDuration] = reactExports.useState(0);
  const progressRef = reactExports.useRef(0);
  const waveformRef = reactExports.useRef(null);
  useMediaElementPlayback(audioRef, isPlaying, active2, src, stop);
  reactExports.useEffect(() => {
    if (src && audioRef.current) audioRef.current.volume = Math.max(0, Math.min(1, volume));
  }, [volume, src]);
  reactExports.useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isPlaying || compact2) return;
    const tick = () => {
      const t22 = audio.currentTime;
      const d2 = audio.duration;
      progressRef.current = d2 > 0 ? t22 / d2 : 0;
      if (playedRef.current) {
        playedRef.current.textContent = formatTime(t22);
      }
      if (durationRef.current) {
        durationRef.current.textContent = formatTime(d2, true);
      }
      waveformRef.current?.setPlayheadProgress(progressRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, compact2]);
  const handleLoadedMetadata = reactExports.useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setDuration(audio.duration);
      onLoadedData?.();
    }
  }, [onLoadedData]);
  const handleEnded = reactExports.useCallback(() => {
    stop();
    progressRef.current = 0;
    waveformRef.current?.setPlayheadProgress(0);
    if (playedRef.current) {
      playedRef.current.textContent = formatTime(0);
    }
    if (durationRef.current) {
      durationRef.current.textContent = formatTime(duration, true);
    }
  }, [stop, duration]);
  const handleSeek = reactExports.useCallback(
    (p3) => {
      const audio = audioRef.current;
      if (!audio || !Number.isFinite(duration) || duration <= 0) return;
      audio.currentTime = p3 * duration;
      progressRef.current = p3;
      waveformRef.current?.setPlayheadProgress(p3);
      if (playedRef.current) {
        playedRef.current.textContent = formatTime(audio.currentTime);
      }
      if (durationRef.current) {
        durationRef.current.textContent = formatTime(duration, true);
      }
    },
    [duration]
  );
  const media2 = src && // biome-ignore lint/a11y/useMediaCaption: generated audio has no caption tracks.
  /* @__PURE__ */ jsxRuntimeExports.jsx(
    "audio",
    {
      ref: audioRef,
      src,
      "aria-label": fileName ?? void 0,
      preload: "metadata",
      loop: true,
      onLoadedMetadata: handleLoadedMetadata,
      onEnded: handleEnded,
      onError,
      onLoadedData
    }
  );
  if (compact2) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex size-full min-h-32 flex-col", children: [
      media2,
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-1 items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Music$2, { "aria-hidden": "true", className: "size-8 text-muted-foreground", strokeWidth: 1.5 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "nodrag nopan nowheel flex flex-col gap-1 px-1.5 pb-2 text-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-0.5 [&>span]:text-[10px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button$3,
            {
              variant: "ghost",
              size: "icon",
              className: "size-6 shrink-0",
              onClick: handleTogglePlay,
              "aria-label": isPlaying ? t2("common.pause") : t2("common.play"),
              "data-action-ui-id": "resource-preview.audio.toggle-play",
              children: isPlaying ? /* @__PURE__ */ jsxRuntimeExports.jsx(PauseIcon, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(PlayIcon, {})
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ProgressBar, { videoRef: audioRef, isPlaying, tone: "light", display: "time" }),
          onVolumeChange && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button$3,
            {
              variant: "ghost",
              size: "icon",
              className: "ml-auto size-6 shrink-0",
              onClick: (event) => {
                event.stopPropagation();
                onVolumeChange(volume === 0 ? 1 : 0);
              },
              "aria-label": volume === 0 ? t2("assetPreview.unmute") : t2("assetPreview.mute"),
              "data-action-ui-id": "resource-preview.audio.toggle-mute",
              children: volume === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(VolumeOffTablerIcon, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(VolumeOnTablerIcon, {})
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ProgressBar, { videoRef: audioRef, isPlaying, tone: "light", display: "bar" })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    media2,
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex flex-col",
        style: {
          width: "100%",
          height: "100%",
          // Tighter chrome: 6px top/left/right (was 12px) for a more
          // compact frame around the waveform. Bottom kept at 12px
          // so the play button + time strip don't crowd the card
          // edge — design called out "底部太紧 / 上部太空" so we
          // narrow the top/sides and keep the bottom.
          padding: "6px 6px 12px 6px",
          background: "var(--background)",
          border: "1px solid var(--border)",
          borderRadius: MEDIA_NODE_RADIUS,
          boxSizing: "border-box"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "flex min-h-0 flex-1 items-center justify-center bg-foreground/[0.04] py-2",
              style: {
                borderRadius: 10
              },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                AudioWaveform,
                {
                  ref: waveformRef,
                  fileName,
                  progress: progressRef.current,
                  width: WAVEFORM_WIDTH,
                  height: WAVEFORM_CONTAINER_HEIGHT,
                  onClick: handleSeek
                }
              )
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "nodrag shrink-0",
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 8,
                height: 20,
                position: "relative"
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "span",
                  {
                    className: "tabular-nums",
                    style: {
                      fontSize: 12,
                      whiteSpace: "nowrap"
                    },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { ref: playedRef, style: { color: "var(--foreground)" }, children: formatTime(0) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: "var(--muted-foreground)" }, children: [
                        " / ",
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { ref: durationRef, children: formatTime(duration, true) })
                      ] })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: handleTogglePlay,
                    "aria-label": isPlaying ? t2("common.pause") : t2("common.play"),
                    "data-action-ui-id": "resource-preview.audio.toggle-play",
                    style: {
                      position: "absolute",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      border: "none",
                      background: "var(--foreground)",
                      color: "var(--background)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      padding: 0,
                      flexShrink: 0
                    },
                    children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "span",
                      {
                        style: {
                          position: "relative",
                          width: 8,
                          height: 10,
                          display: "block"
                        },
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "span",
                            {
                              style: {
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                opacity: isPlaying ? 0 : 1,
                                transform: isPlaying ? "scale(0.6)" : "scale(1)",
                                transition: "opacity 150ms, transform 150ms"
                              },
                              children: /* @__PURE__ */ jsxRuntimeExports.jsx(PlayIcon, {})
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "span",
                            {
                              style: {
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                opacity: isPlaying ? 1 : 0,
                                transform: isPlaying ? "scale(1)" : "scale(0.6)",
                                transition: "opacity 150ms, transform 150ms"
                              },
                              children: /* @__PURE__ */ jsxRuntimeExports.jsx(PauseIcon, {})
                            }
                          )
                        ]
                      }
                    )
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex items-center gap-2", children: [
                  onVolumeChange && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "range",
                      min: "0",
                      max: "1",
                      step: "0.01",
                      value: volume,
                      "aria-label": t2("canvas.params.volume"),
                      className: "pointer-events-auto w-12 accent-current",
                      onClick: (event) => event.stopPropagation(),
                      onChange: (event) => onVolumeChange(Number(event.target.value))
                    }
                  ),
                  onDownload ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: (e2) => {
                        e2.stopPropagation();
                        onDownload?.();
                      },
                      "data-action-ui-id": "resource-preview.audio.download",
                      "aria-label": t2("canvas.downloadAudio", "Download audio"),
                      style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 20,
                        height: 20,
                        padding: 0,
                        background: "transparent",
                        border: "none",
                        color: "var(--muted-foreground)",
                        cursor: "pointer",
                        flexShrink: 0
                      },
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Download$2, { size: 14 })
                    }
                  ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 20 } })
                ] })
              ]
            }
          )
        ]
      }
    )
  ] });
});

export function AudioPreview({
  src,
  name: name2,
  unavailableLabel
}) {
  const [playing, setPlaying2] = reactExports.useState(false);
  const [volume, setVolume] = reactExports.useState(1);
  const [failed, setFailed] = reactExports.useState(false);
  const handleStop = reactExports.useCallback(() => setPlaying2(false), []);
  if (failed)
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "p-4 text-sm text-muted-foreground", children: unavailableLabel });
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex size-full items-center justify-center p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    AudioPlayer,
    {
      src,
      fileName: name2,
      isPlaying: playing,
      volume,
      onVolumeChange: setVolume,
      onTogglePlay: () => setPlaying2((value) => !value),
      onStop: handleStop,
      onError: () => setFailed(true)
    }
  ) });
}

export const DocumentContent$1 = reactExports.memo(function DocumentContent2({
  text: text2,
  plain
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm leading-relaxed [overflow-wrap:anywhere] [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-medium [&_h2]:my-3 [&_h2]:font-medium [&_h3]:my-2 [&_h3]:font-medium [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_code]:text-xs [&_blockquote]:border-l [&_blockquote]:border-border [&_blockquote]:pl-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2", children: plain ? /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "m-0 whitespace-pre-wrap break-words font-sans", children: text2 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
    Markdown,
    {
      remarkPlugins: [remarkGfm],
      skipHtml: true,
      components: {
        a: ({ children: children2, href }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "a",
          {
            href,
            target: "_blank",
            rel: "noreferrer",
            className: "underline underline-offset-2",
            children: children2
          }
        ),
        img: ({ alt }) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: alt })
      },
      children: text2
    }
  ) });
});

export function DocumentFullscreenPreview({
  name: name2,
  closeLabel,
  onClose,
  children: children2
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    DialogRoot,
    {
      open: true,
      onOpenChange: (open) => {
        if (!open) onClose();
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogPortal$3, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogBackdrop, { className: "fixed inset-0 z-[60] bg-background/80" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          DialogPopup,
          {
            "data-action-ui-id": "resource-document-fullscreen",
            className: "fixed inset-4 z-[60] flex min-h-0 flex-col rounded-lg border border-border bg-background text-foreground shadow-lg outline-none",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle$3, { className: "min-w-0 truncate text-base font-medium", children: name2 }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  DialogClose$1,
                  {
                    render: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Button$3,
                      {
                        variant: "ghost",
                        size: "icon",
                        "aria-label": closeLabel,
                        "data-action-ui-id": "resource-document-fullscreen-close"
                      }
                    ),
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$8, { className: "size-4", strokeWidth: 1.5 })
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "min-h-0 flex-1 overflow-auto overscroll-contain p-6",
                  "data-slot": "resource-document-fullscreen-content",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto max-w-5xl", children: children2 })
                }
              )
            ]
          }
        )
      ] })
    }
  );
}

export function useDocumentContent(resourceId2, versionId) {
  const { host, scopeKey } = useWorkbench();
  return useInfiniteQuery({
    queryKey: [...resourceQueryKeys.all(scopeKey), "document", resourceId2, versionId],
    initialPageParam: { startLine: 1, contentRevision: void 0 },
    queryFn: async ({ pageParam, signal }) => {
      const page2 = await readResourceDocument(host, resourceId2, versionId, {
        startLine: pageParam.startLine,
        signal
      });
      if (pageParam.contentRevision !== void 0 && (page2.contentRevision ?? 1) !== pageParam.contentRevision)
        throw new Error("DOCUMENT_CONTENT_REVISION_CHANGED");
      return page2;
    },
    getNextPageParam: (page2) => page2.more && page2.lineCount > 0 ? { startLine: page2.startLine + page2.lineCount, contentRevision: page2.contentRevision ?? 1 } : void 0,
    staleTime: Infinity,
    retry: false,
    networkMode: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}

export function DocumentPreview({ resourceId: resourceId2, versionId, name: name2, labels }) {
  const { t: t2 } = useTranslation();
  const [fullscreen, setFullscreen] = reactExports.useState(false);
  const query = useDocumentContent(resourceId2, versionId);
  const { hasNextPage: hasNextPage2, isFetching, isError, fetchNextPage } = query;
  reactExports.useEffect(() => {
    if (fullscreen && hasNextPage2 && !isFetching && !isError) void fetchNextPage();
  }, [fullscreen, hasNextPage2, isFetching, isError, fetchNextPage]);
  const pages = query.data?.pages;
  const text2 = pages?.map((page2) => page2.text).join("\n") ?? "";
  const content2 = /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    query.isPending && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "text-sm text-muted-foreground", children: labels.loading }),
    pages && (text2 ? /* @__PURE__ */ jsxRuntimeExports.jsx(DocumentContent$1, { text: text2, plain: pages[0].media.mimeType === "text/plain" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: t2("workspace.resourcePreview.documentEmpty") })),
    isError && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { role: "alert", className: "text-sm text-muted-foreground", children: [
      labels.loadError,
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button$3,
        {
          variant: "ghost",
          size: "sm",
          onClick: () => void (query.isFetchNextPageError && query.error?.message !== "DOCUMENT_CONTENT_REVISION_CHANGED" ? fetchNextPage() : query.refetch()),
          children: labels.retry
        }
      )
    ] }),
    hasNextPage2 && !isError && /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button$3,
      {
        variant: "outline",
        size: "sm",
        disabled: isFetching,
        onClick: () => void fetchNextPage(),
        children: isFetching ? labels.loading : t2("workspace.resourcePreview.more")
      }
    ),
    pages?.at(-1)?.more && !hasNextPage2 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "text-sm text-muted-foreground", children: t2("workspace.resourcePreview.incomplete") })
  ] });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex size-full min-h-0 flex-col pt-12", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button$3,
      {
        variant: "ghost",
        size: "icon",
        className: "absolute right-2 top-2",
        "aria-label": t2("canvas.fullscreenPreview"),
        "data-action-ui-id": "resource-document-expand",
        onClick: () => setFullscreen(true),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Maximize, { className: "size-4", strokeWidth: 1.5 })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-0 flex-1 space-y-3 overflow-auto overscroll-contain px-4 pb-4", children: content2 }),
    fullscreen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      DocumentFullscreenPreview,
      {
        name: name2,
        closeLabel: t2("common.close"),
        onClose: () => setFullscreen(false),
        children: content2
      }
    )
  ] });
}

export function ImagePreview({
  src,
  name: name2,
  unavailableLabel
}) {
  const [failed, setFailed] = reactExports.useState(false);
  return failed ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "p-4 text-sm text-muted-foreground", children: unavailableLabel }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative size-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "img",
      {
        src,
        alt: name2,
        draggable: false,
        className: "size-full object-contain",
        onError: () => setFailed(true)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ImageFullscreenButton, { src, name: name2 })
  ] });
}

export function VideoPreview({ src, unavailableLabel }) {
  const videoRef = reactExports.useRef(null);
  const [playing, setPlaying2] = reactExports.useState(false);
  const [volume, setVolume] = reactExports.useState(1);
  const { muted: muted2, toggle: toggleMuted } = useMediaMuted();
  const [failed, setFailed] = reactExports.useState(false);
  const handleStop = reactExports.useCallback(() => setPlaying2(false), []);
  if (failed)
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "p-4 text-sm text-muted-foreground", children: unavailableLabel });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    VideoPlayer,
    {
      src,
      width: "100%",
      height: "100%",
      videoRef,
      isPlaying: playing,
      muted: muted2,
      volume,
      onVolumeChange: setVolume,
      onTogglePlay: () => setPlaying2((value) => !value),
      onStop: handleStop,
      onToggleMuted: toggleMuted,
      onFullscreen: () => void videoRef.current?.requestFullscreen(),
      onError: () => setFailed(true)
    }
  );
}

export function ResourcePreview(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-full", "data-slot": "resource-preview", children: props.kind === ProjectResourceKind.TEXT_DOCUMENT ? /* @__PURE__ */ jsxRuntimeExports.jsx(DocumentPreview, { ...props }, `${props.resourceId}:${props.versionId}`) : /* @__PURE__ */ jsxRuntimeExports.jsx(MediaPreview$1, { ...props }, `${props.resourceId}:${props.versionId}`) });
}

export function MediaPreview$1({ resourceId: resourceId2, versionId, kind: kind2, name: name2, labels }) {
  const mediaKind2 = kind2 === ProjectResourceKind.IMAGE ? "image" : kind2 === ProjectResourceKind.VIDEO ? "video" : kind2 === ProjectResourceKind.AUDIO ? "audio" : "other";
  const { src, isLoading, isError } = useVersionMediaSource(resourceId2, versionId, mediaKind2);
  if (isLoading)
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        role: "status",
        className: "flex size-full items-center justify-center text-sm text-muted-foreground",
        children: labels.loading
      }
    );
  if (isError || !src)
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        role: "status",
        className: "flex size-full items-center justify-center text-sm text-muted-foreground",
        children: labels.mediaUnavailable
      }
    );
  if (mediaKind2 === "image")
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ImagePreview, { src, name: name2, unavailableLabel: labels.mediaUnavailable }, src);
  if (mediaKind2 === "video")
    return /* @__PURE__ */ jsxRuntimeExports.jsx(VideoPreview, { src, unavailableLabel: labels.mediaUnavailable }, src);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AudioPreview, { src, name: name2, unavailableLabel: labels.mediaUnavailable }, src);
}

export function useDetailPricing() {
  const { host, scopeKey } = useWorkbench();
  return useQuery({
    queryKey: ["resource-detail-pricing", scopeKey],
    enabled: Boolean(host.billing?.readPricing),
    queryFn: async ({ signal }) => {
      if (!host.billing?.readPricing) throw new Error("BILLING_PRICING_UNAVAILABLE");
      const response = await host.billing?.readPricing({ signal });
      if (!response.ok) throw new Error(`BILLING_PRICING_HTTP_${response.status}`);
      return mapPricingResponse(await response.json());
    },
    staleTime: 3e4,
    retry: false
  });
}

export function useDetailFontSize() {
  const usePreference = useCanvasV3HostServices().usePromptFontSize ?? useStoredDetailFontSize;
  return usePreference();
}

export function useStoredDetailFontSize() {
  const { host } = useWorkbench();
  const [size2, setSize] = reactExports.useState(PROMPT_FONT_SIZE_DEFAULT);
  const changed = reactExports.useRef(false);
  reactExports.useEffect(() => {
    let active2 = true;
    void host.preferences?.get("hilo:canvas:prompt-font-size").then((value) => {
      if (active2 && !changed.current && value?.trim())
        setSize(normalizePromptFontSize$1(Number(value)));
    }).catch(() => {
    });
    return () => {
      active2 = false;
    };
  }, [host]);
  const change = reactExports.useCallback(
    (value) => {
      changed.current = true;
      const next2 = normalizePromptFontSize$1(value);
      setSize(next2);
      void host.preferences?.set("hilo:canvas:prompt-font-size", String(next2)).catch(() => {
      });
    },
    [host]
  );
  return [size2, change];
}

export function useDetailReferenceOptions(references) {
  const { queries, scopeKey } = useWorkbench();
  const previews = useQueries({
    queries: references.map((reference) => {
      const input = resourceThumbnailQuery({
        versionId: reference.versionId,
        kind: referenceResourceKind(reference.kind)
      });
      return {
        queryKey: [...resourceQueryKeys.all(scopeKey), "preview", input],
        enabled: queries.available && input !== null,
        queryFn: ({ signal }) => {
          if (!input) throw new Error("RESOURCE_PREVIEW_UNAVAILABLE");
          return queries.query("resource_preview", input, { signal });
        },
        networkMode: "always",
        staleTime: Number.POSITIVE_INFINITY,
        retry: false,
        refetchOnWindowFocus: false
      };
    })
  });
  return references.map((reference, index2) => ({
    ...reference,
    url: previewImageDataUrl(previews[index2].data) ?? ""
  }));
}

export const alwaysReady = () => true;

export const noSubscription$1 = () => () => {
};

export function useDetailReady() {
  const { host } = useWorkbench();
  return reactExports.useSyncExternalStore(
    host.readiness?.subscribe ?? noSubscription$1,
    host.readiness?.getSnapshot ?? alwaysReady,
    alwaysReady
  );
}

export function createDetailReferenceImports(workbench) {
  return createDetailReferenceImports$1(
    workbench,
    (request) => new CanvasV3ReferenceImports(request)
  );
}

export const emptySubscribe$1 = () => () => {
};

export function useDetailCanvasImages(enabled) {
  const workbench = useWorkbench();
  const images = reactExports.useSyncExternalStore(
    workbench.host.canvas?.subscribeImages ?? emptySubscribe$1,
    workbench.host.canvas?.getImagesSnapshot ?? emptySnapshot
  );
  const compositionIds = [...new Set(images.map((image2) => image2.compositionId))];
  const compositions = useQueries({
    queries: workbench ? compositionIds.map((id2) => ({
      ...createCompositionQueryOptions(workbench.structure, workbench.scopeKey).details(id2),
      enabled
    })) : []
  });
  const batches = compositions.flatMap(
    ({ data: data2 }) => workbench && data2 && data2.lifecycle === CompositionLifecycle.ACTIVE ? resourceBatches(
      data2.members.flatMap(
        (member2) => (member2.resource ? [member2.resource] : []).map((resourceId2) => ({
          scopeKey: workbench.scopeKey,
          compositionId: data2.compositionId,
          memberId: member2.memberId,
          resourceId: resourceId2
        }))
      )
    ) : []
  );
  const uniqueBatches = [
    ...new Map(batches.map((batch2) => [JSON.stringify(batch2), batch2])).values()
  ];
  const resources = useQueries({
    queries: workbench ? uniqueBatches.map((batch2) => ({
      ...createResourceQueryOptions(workbench.resources, workbench.scopeKey).details(batch2),
      enabled
    })) : []
  });
  const details = new Map(
    resources.flatMap(
      ({ data: data2 }) => (data2 ?? []).flatMap(
        (result) => result.ok ? [[result.detail.resource.resourceId, result.detail]] : []
      )
    )
  );
  return images.flatMap(({ compositionId, resourceId: resourceId2 }) => {
    const composition2 = compositions[compositionIds.indexOf(compositionId)]?.data;
    const member2 = composition2?.members.find((member22) => member22.resource === resourceId2);
    const detail2 = details.get(resourceId2);
    if (composition2?.lifecycle !== CompositionLifecycle.ACTIVE || !member2 || detail2?.resource.kind !== ProjectResourceKind.IMAGE || detail2.resource.lifecycle !== ProjectResourceLifecycle.ACTIVE || detail2.version?.status !== ProjectResourceVersionStatus.READY)
      return [];
    return [
      {
        resourceId: resourceId2,
        versionId: detail2.version.versionId,
        title: member2.role.trim() || detail2.resource.name
      }
    ];
  });
}

export const noUrl = () => void 0;

export function ResourceReferencePicker({
  onClose,
  onSelect,
  references,
  maxCount = 20
}) {
  const workbench = useWorkbench();
  const images = useDetailCanvasImages(true);
  const canvasReferences = useDetailReferenceOptions(
    images.map((image2) => ({ ...image2, name: image2.title, source: "resource" }))
  );
  const imports = reactExports.useMemo(
    () => ({ batch: createDetailReferenceImports(workbench), cancelled: false }),
    [workbench]
  );
  reactExports.useEffect(() => {
    if (imports.cancelled) {
      imports.batch = createDetailReferenceImports(workbench);
      imports.cancelled = false;
    }
    return () => {
      imports.batch.cancel();
      imports.cancelled = true;
    };
  }, [imports, workbench]);
  const resolveResource = async (source, signal) => {
    const [result] = await workbench.resources.getResources([source], { signal });
    if (!result?.ok || result.detail.resource.resourceId !== source.resourceId || result.detail.resource.kind !== ProjectResourceKind.IMAGE || result.detail.resource.lifecycle !== ProjectResourceLifecycle.ACTIVE || result.detail.version?.versionId !== source.versionId || result.detail.version.status !== ProjectResourceVersionStatus.READY)
      throw new Error("RESOURCE_REFERENCE_UNAVAILABLE");
    const image2 = images.find(
      (image22) => image22.resourceId === source.resourceId && image22.versionId === source.versionId
    );
    return { ...source, name: image2?.title ?? result.detail.resource.name, source: "resource" };
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    CanvasV3ResourcePickerDialog,
    {
      open: true,
      scope: workbench,
      fetch: workbench.host.resource.request,
      url: noUrl,
      preferences: workbench.host.preferences ?? null,
      renderThumbnail: (reference) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        ResourceThumbnail,
        {
          versionId: reference.versionId,
          kind: ProjectResourceKind.IMAGE,
          className: "size-full"
        }
      ),
      resolveResource,
      onClose,
      onSelect: (refs) => onSelect(canvasV3PromptReferences(refs)),
      maxCount,
      tabs: ["assets", "canvas", "upload"],
      canvasReferences,
      alreadyAddedReferences: references,
      hasPendingImports: () => imports.batch.hasPending,
      onImportFiles: workbench.importCanvasImage ? (files) => imports.batch.run(files) : void 0
    }
  );
}

export function ResourceReferencePreview({
  reference,
  onClose
}) {
  const { t: t2 } = useTranslation();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DialogRoot, { open: true, onOpenChange: (open) => !open && onClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogPortal$3, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogBackdrop, { className: "modal-mask fixed inset-0 z-50" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogPopup, { className: "fixed left-1/2 top-1/2 z-50 flex h-[70vh] w-[80vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-hidden rounded-xl border border-border bg-popover p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle$3, { className: "pr-8 text-sm font-medium", children: reference.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        DialogClose$1,
        {
          render: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button$3,
            {
              variant: "ghost",
              size: "icon",
              "aria-label": t2("common.close"),
              className: "absolute right-2 top-2 size-8"
            }
          ),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$8, { className: "size-4", strokeWidth: 1.5 })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-0 flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        ResourcePreview,
        {
          resourceId: reference.resourceId,
          versionId: reference.versionId,
          kind: referenceResourceKind(reference.kind),
          name: reference.name,
          labels: {
            loading: t2("common.loading"),
            loadError: t2("workspace.composition.resourceError"),
            retry: t2("common.retry"),
            mediaUnavailable: t2("workspace.structure.detail.mediaUnavailable")
          }
        }
      ) })
    ] })
  ] }) });
}

export function editorReference(reference) {
  return { ...reference, kind: reference.kind === "file" ? "text" : reference.kind };
}

export function ResourceAgentInput(props) {
  const { scopeKey } = useWorkbench();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ResourceAgentInputBody,
    {
      ...props
    },
    `${scopeKey}:${props.target.resourceId}:${props.target.versionId ?? ""}`
  );
}

export function ResourceAgentInputBody({
  target,
  expanded = false,
  compact: compact2 = false,
  onToggleExpanded,
  fontSizePreference,
  renderReferences
}) {
  const { host, scopeKey } = useWorkbench();
  const { t: t2 } = useTranslation();
  const ready2 = useDetailReady();
  const storedFontSize = useDetailFontSize();
  const [fontSize, setFontSize] = fontSizePreference ?? storedFontSize;
  const [text2, setText] = reactExports.useState("");
  const [busy, setBusy] = reactExports.useState(false);
  const [error, setError] = reactExports.useState();
  const selectedReference = target.versionId ? [
    {
      resourceId: target.resourceId,
      versionId: target.versionId,
      name: target.resourceName,
      kind: target.kind === ProjectResourceKind.IMAGE ? "image" : target.kind === ProjectResourceKind.VIDEO ? "video" : target.kind === ProjectResourceKind.AUDIO ? "audio" : target.kind === ProjectResourceKind.TEXT_DOCUMENT ? "text" : "file",
      source: "resource"
    }
  ] : [];
  const [attachments, setAttachments] = reactExports.useState(selectedReference);
  const [editing, setEditing] = reactExports.useState(false);
  const input = reactExports.useRef(null);
  const [pickerOpen, setPickerOpen] = reactExports.useState(false);
  const references = useDetailReferenceOptions(
    attachments.map(
      (reference) => reference.resourceId === target.resourceId && reference.versionId === target.versionId ? { ...reference, name: target.resourceName } : reference
    )
  );
  const editorReferences = references.map(editorReference);
  const sending = reactExports.useRef(null);
  reactExports.useLayoutEffect(() => () => sending.current?.abort(), []);
  const canSend = Boolean(ready2 && host.chat && text2.trim() && !busy && !pickerOpen && !editing);
  async function handleSend() {
    if (!canSend || sending.current || !host.chat) return;
    const controller = new AbortController();
    sending.current = controller;
    setBusy(true);
    setError(void 0);
    const submitted = text2;
    const targetContext = [
      "Selected resource version (current editing target):",
      `resourceId=${target.resourceId}`,
      ...target.versionId ? [`versionId=${target.versionId}`] : []
    ].join("\n").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    try {
      await host.chat.send(
        {
          text: prependHiddenContext(
            compileCanvasV3Prompt(submitted, attachments),
            `<asset_context>
${targetContext}
</asset_context>`
          ),
          resources: attachments.map(({ resourceId: resourceId2, versionId }) => ({ resourceId: resourceId2, versionId }))
        },
        { signal: controller.signal }
      );
      if (controller.signal.aborted) return;
      setText((current2) => current2 === submitted ? "" : current2);
      setAttachments(selectedReference);
    } catch {
      if (!controller.signal.aborted) setError(t2("chat.sendFailed"));
    } finally {
      if (sending.current === controller) {
        sending.current = null;
        if (!controller.signal.aborted) setBusy(false);
      }
    }
  }
  const referenceProps = {
    references,
    disabled: busy || !ready2,
    onAdd: () => setPickerOpen(true),
    onRemove: (reference) => {
      setAttachments((items) => items.filter((item) => item.versionId !== reference.versionId));
      setText((value) => removeCanvasV3PromptReference(value, reference.versionId));
    },
    onReference: (reference) => input.current?.insertReference(editorReference(reference)),
    onReplace: (previous2, next2, append2 = false) => {
      setAttachments(
        (items) => mergeCanvasV3References(
          append2 ? items : items.filter((item) => item.versionId !== previous2.versionId),
          [next2]
        )
      );
      if (!append2)
        setText(
          (value) => value.replaceAll(
            canvasV3ReferenceToken(previous2.versionId),
            canvasV3ReferenceToken(next2.versionId)
          )
        );
    },
    onEditingChange: setEditing
  };
  const promptMeta = /* @__PURE__ */ jsxRuntimeExports.jsx(
    PromptInputMetaRowView,
    {
      fontSize,
      onFontSizeChange: setFontSize,
      getPromptText: () => text2,
      copyDisabled: !text2.length || !host.clipboard,
      clipboard: host.clipboard ?? null,
      currentLength: Array.from(text2).length
    }
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "canvas-prompt-font-size-editor col-span-2 flex h-full min-h-0 min-w-0 flex-col",
      style: { "--canvas-prompt-font-size": fontSize },
      "data-action-ui-id": "resource-detail-chat.agent",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ComposerPanelLayout,
          {
            expanded,
            onToggleExpanded,
            attachments: renderReferences ? renderReferences(referenceProps) : /* @__PURE__ */ jsxRuntimeExports.jsx(
              CanvasV3ReferenceBar,
              {
                references: editorReferences,
                disabled: busy || !ready2,
                resourceScopeKey: scopeKey,
                renderPreview: (reference, onClose) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  ResourceReferencePreview,
                  {
                    reference: references.find((item) => item.versionId === reference.versionId) ?? reference,
                    onClose
                  }
                ),
                onAdd: referenceProps.onAdd,
                onRemove: referenceProps.onRemove,
                onItemClick: referenceProps.onReference
              }
            ),
            notices: error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "alert", className: "text-xs text-destructive", children: error }),
            actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              compact2 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "[&>div]:mt-0", children: promptMeta }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                SubmitButton,
                {
                  submitting: busy,
                  canSubmit: canSend,
                  title: t2("chat.send"),
                  onClick: () => void handleSend()
                }
              )
            ] }),
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full min-h-0 flex-col", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                CanvasV3PromptInput,
                {
                  inputRef: input,
                  prompt: text2,
                  options: editorReferences,
                  selected: editorReferences,
                  disabled: busy || editing,
                  expanded,
                  fillHeight: true,
                  fontSize,
                  onChange: setText,
                  onAddReference: (reference) => setAttachments((items) => mergeCanvasV3References(items, [reference])),
                  onSubmit: () => void handleSend(),
                  placeholder: t2("chat.placeholder")
                }
              ),
              !compact2 && promptMeta
            ] })
          }
        ),
        pickerOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
          ResourceReferencePicker,
          {
            onClose: () => setPickerOpen(false),
            onSelect: (selected2) => {
              setAttachments((items) => mergeCanvasV3References(items, selected2));
              setPickerOpen(false);
            },
            references: editorReferences,
            maxCount: Math.max(0, CHAT_FRAME_RESOURCE_LIMIT - attachments.length)
          }
        )
      ]
    }
  );
}

export function ResourceChat(props) {
  const workbench = useWorkbench();
  const { t: t2 } = useTranslation();
  const [mode2, setMode] = reactExports.useState("agent");
  if (!workbench.host.chat && !workbench.host.task?.request)
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-xs text-muted-foreground", children: t2("workspace.structure.detail.chat.unavailable") });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ResourceDetailChatBody,
    {
      target: props,
      mode: projectGenerationKindOfResource(props.kind) ? mode2 : "agent",
      onModeChange: setMode
    },
    `${workbench.scopeKey}:${props.resourceId}:${props.versionId ?? ""}`
  );
}

export function ResourceDetailChatBody({
  target,
  mode: mode2,
  onModeChange: setMode
}) {
  const { t: t2 } = useTranslation();
  const workbench = useWorkbench();
  const scopedWorkbench = workbench;
  const ready2 = useDetailReady();
  const fetch2 = workbench.host.task?.request;
  const mediaKind2 = projectGenerationKindOfResource(target.kind);
  const supportsPromptMode = mediaKind2 !== void 0;
  const historyQuery = useQuery({
    queryKey: [
      "resource-detail-history",
      workbench.scopeKey,
      target.resourceId,
      target.versionId,
      target.taskId
    ],
    queryFn: async ({ signal }) => target.versionId ? await workbench.resourceDetail.history(
      { resourceId: target.resourceId, versionId: target.versionId },
      target.taskId,
      { signal }
    ) ?? null : null,
    enabled: Boolean(mode2 === "prompt" && fetch2 && target.versionId),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false
  });
  const historyMissing = historyQuery.error instanceof ResourceGenerationHistoryUnavailableError;
  const historyReady = historyQuery.isSuccess || historyMissing;
  const modelsQuery = useQuery({
    queryKey: ["canvas-v3-models", workbench?.scopeKey, mediaKind2],
    queryFn: ({ signal }) => mediaKind2 && fetch2 ? loadCanvasV3Models(fetch2, mediaKind2, signal) : [],
    enabled: Boolean(fetch2 && supportsPromptMode && mode2 === "prompt"),
    staleTime: 3e4,
    retry: false
  });
  const { data: pricingConfig } = useDetailPricing();
  const preferenceQuery = useQuery({
    queryKey: ["resource-detail-model-preference", workbench.scopeKey],
    queryFn: async () => {
      const value = await workbench.host.preferences?.get(CANVAS_V3_IMAGE_MODEL_PREFERENCE_KEY);
      return readCanvasV3ImageModelPreference(() => ({
        getItem: () => value ?? null,
        setItem: () => {
        }
      })) ?? null;
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: false
  });
  const initialized2 = reactExports.useRef(false);
  const [selection2, setSelection] = reactExports.useState(null);
  const models = reactExports.useMemo(
    () => (modelsQuery.data ?? []).filter((model) => !model.info.hideInModelPicker),
    [modelsQuery.data]
  );
  const selectedModel = models.find((model) => model.id === selection2?.modelId);
  const params = reactExports.useMemo(
    () => selectedModel ? capabilityForm(selectedModel.capability, selection2?.params) : {},
    [selectedModel, selection2]
  );
  const [prompt, setPrompt] = reactExports.useState("");
  const [attachments, setAttachments] = reactExports.useState([]);
  const [closingFrame, setClosingFrame] = reactExports.useState();
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [generation, setGeneration] = reactExports.useState();
  const generationQuery = useQuery({
    ...createTaskQueryOptions(scopedWorkbench.execution, scopedWorkbench.scopeKey).detail(
      generation?.task.id ?? ""
    ),
    enabled: Boolean(generation && workbench)
  });
  const generationTask = generationQuery.data?.task ?? generation?.task;
  const resolveTask = useTaskResolve();
  const waitingForUser = generationTask?.status === "waiting_user";
  const busy = submitting || Boolean(generationTask && !generationTask.terminal);
  const generating = busy && !waitingForUser;
  const [expanded, setExpanded] = reactExports.useState(false);
  const [fontSize, setFontSize] = useDetailFontSize();
  const [paramsOpen, setParamsOpen] = reactExports.useState(false);
  const [pickerOpen, setPickerOpen] = reactExports.useState(false);
  const submittingRef = reactExports.useRef(false);
  const inputRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!generation || !generationTask?.terminal) return;
    setGeneration(void 0);
    if (generationTask.status === "completed") {
      scopedWorkbench.invalidateResources({
        scopeKey: scopedWorkbench.scopeKey,
        resourceIds: [generation.resourceId]
      });
      setPrompt("");
      setAttachments([]);
      setClosingFrame(void 0);
      dedupedToast.success(t2("workspace.structure.detail.chat.generated"));
    } else if (generationTask.status === "cancelled") {
      dedupedToast.info(t2("canvasV3.generation.stopped"));
    } else {
      dedupedToast.error(generationTask.problem?.message ?? t2("canvas.generateFailed"));
    }
  }, [generation, generationTask, scopedWorkbench, t2]);
  reactExports.useEffect(() => {
    if (initialized2.current || mode2 !== "prompt" || !historyReady || !modelsQuery.isSuccess || preferenceQuery.isPending)
      return;
    initialized2.current = true;
    const history2 = historyQuery.data;
    const restored = history2?.references.map((ref) => ({
      resourceId: ref.resourceId,
      versionId: ref.versionId,
      name: ref.name,
      source: "resource",
      ...restoredReferenceKind(referenceMediaKind(ref.kind))
    })) ?? [];
    setAttachments(restored);
    setClosingFrame(history2?.lastFrameOnly ? restored[0]?.versionId : void 0);
    setPrompt(
      history2 ? restoreCanvasV3ReferencePrompt(
        history2.prompt,
        restored,
        history2.references.map((ref) => referenceMediaKind(ref.kind)),
        mediaKind2 === "video"
      ) : ""
    );
    setSelection(
      history2 ? { modelId: history2.modelId ?? "", params: history2.params } : initialCanvasV3ImageModelSelection(models, preferenceQuery.data ?? void 0)
    );
  }, [
    mode2,
    historyReady,
    historyQuery.data,
    modelsQuery.isSuccess,
    models,
    preferenceQuery.isPending,
    preferenceQuery.data,
    mediaKind2
  ]);
  const canvasImages = useDetailCanvasImages(mode2 === "prompt");
  const referenceOptions = useDetailReferenceOptions(
    mergeCanvasV3References(
      attachments.map((reference) => ({
        ...reference,
        name: canvasImages.find(
          (image2) => image2.resourceId === reference.resourceId && image2.versionId === reference.versionId
        )?.title ?? reference.name
      })),
      canvasImages.map((ref) => ({
        resourceId: ref.resourceId,
        versionId: ref.versionId,
        name: ref.title || t2("canvas.image"),
        source: "resource"
      }))
    )
  );
  const allReferences = referenceOptions.filter(
    (ref) => attachments.some(
      (item) => item.resourceId === ref.resourceId && item.versionId === ref.versionId
    )
  );
  const availableReferences = referenceOptions;
  let missingReference = false;
  try {
    compileCanvasV3Prompt(prompt, allReferences, mediaKind2 === "video");
  } catch {
    missingReference = true;
  }
  const countedPrompt = canvasV3PromptMentions(prompt).reduceRight(
    (text2, mention) => text2.slice(0, mention.from) + text2.slice(mention.to),
    prompt
  );
  const promptLength = Array.from(countedPrompt).length;
  const budget = canvasV3ModelReferenceBudget(selectedModel, params);
  const maxReferences = budget?.max;
  const invalidReferences = missingReference || (mediaKind2 ? !canvasV3ModelReferencesValid(selectedModel, mediaKind2, allReferences, params) : false);
  const promptMaxLength = selectedModel?.capability.prompt.maxLength;
  const tooLong = !!promptMaxLength && promptLength > promptMaxLength;
  const canGenerate = Boolean(
    !busy && !pickerOpen && ready2 && workbench.host.billing?.guardSubmission && historyReady && initialized2.current && target.versionId && selectedModel && prompt.trim() && !invalidReferences && !tooLong
  );
  const handleGenerate = reactExports.useCallback(async () => {
    const baseVersionId = target.versionId;
    if (!canGenerate || !baseVersionId || !selectedModel || !mediaKind2 || submittingRef.current)
      return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (!await workbench.host.billing?.guardSubmission?.("canvas")) return;
      const compiled = compileCanvasV3Prompt(prompt, allReferences, mediaKind2 === "video");
      const versions = allReferences.map((ref) => ref.versionId);
      const openFirst = !!closingFrame && versions.length === 1 && versions[0] === closingFrame && canvasV3ModelLastFrameOnly(selectedModel, params);
      const task2 = await workbench.resourceDetail.generate({
        kind: target.kind,
        resourceId: target.resourceId,
        baseVersionId,
        modelId: selectedModel.id,
        prompt: compiled,
        params,
        references: openFirst ? [null, ...versions] : versions
      });
      if (mediaKind2 === "image")
        void workbench.host.preferences?.set(
          CANVAS_V3_IMAGE_MODEL_PREFERENCE_KEY,
          JSON.stringify({ modelId: selectedModel.id, params })
        ).catch(() => {
        });
      setGeneration({ task: task2, resourceId: target.resourceId });
    } catch (error) {
      dedupedToast.error(error instanceof Error ? error.message : t2("canvas.generateFailed"));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [
    canGenerate,
    mediaKind2,
    target.kind,
    target.resourceId,
    target.versionId,
    selectedModel,
    prompt,
    params,
    allReferences,
    closingFrame,
    workbench,
    t2
  ]);
  async function handleRetry() {
    if (!workbench || !generationTask || resolveTask.isPending) return;
    try {
      await resolveTask.mutateAsync({
        taskId: generationTask.id,
        input: {
          requestId: crypto.randomUUID(),
          expectedRevision: generationTask.revision,
          action: "retry"
        }
      });
    } catch (error) {
      dedupedToast.error(error instanceof Error ? error.message : t2("canvas.generateFailed"));
    } finally {
      void generationQuery.refetch();
    }
  }
  const modeOptions = reactExports.useMemo(() => {
    const options2 = supportsPromptMode ? [
      { value: "agent", label: t2("workspace.structure.detail.chat.agentTab") },
      { value: "prompt", label: t2("workspace.structure.detail.chat.promptTab") }
    ] : [{ value: "agent", label: t2("workspace.structure.detail.chat.agentTab") }];
    return options2;
  }, [supportsPromptMode, t2]);
  const perCallCost = mediaKind2 === "image" && pricingConfig && selectedModel ? calcImageCost(
    pricingConfig,
    resolvePricingId(selectedModel.info),
    params.resolution,
    selectedModel.info.params.quality ? params.quality : void 0,
    allReferences.length
  ) : void 0;
  const summaryModel = selectedModel?.info;
  const copyText = canvasV3PromptMentions(prompt).reduceRight((text2, mention) => {
    const reference = allReferences.find((ref) => ref.versionId === mention.versionId);
    return `${text2.slice(0, mention.from)}@${reference?.name || mention.versionId}${text2.slice(mention.to)}`;
  }, prompt);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-action-ui-id": "resource-detail-chat.input",
      "data-expanded": expanded,
      "data-mode": mode2,
      className: "resource-detail-chat grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-xl border border-border bg-card p-2",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SegmentedSwitch$1,
          {
            value: mode2,
            options: modeOptions,
            onValueChange: setMode,
            variant: "label",
            size: "sm",
            className: "self-start",
            ariaLabel: t2("workspace.structure.detail.chat.modeAria"),
            dataActionUiId: "resource-detail-chat.mode"
          }
        ),
        mode2 === "prompt" && mediaKind2 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          ImageGenerationPanelContent,
          {
            mediaKind: mediaKind2,
            attachments: /* @__PURE__ */ jsxRuntimeExports.jsx(
              CanvasV3ReferenceBar,
              {
                references: allReferences,
                renderPreview: (reference, onClose) => /* @__PURE__ */ jsxRuntimeExports.jsx(ResourceReferencePreview, { reference, onClose }),
                disabled: busy,
                resourceScopeKey: workbench?.scopeKey,
                onAdd: () => setPickerOpen(true),
                onItemClick: (reference) => inputRef.current?.insertReference(reference),
                onReplace: (reference) => inputRef.current?.replaceReference(reference),
                onRemove: (reference) => {
                  setAttachments(
                    (items) => items.filter((item) => item.versionId !== reference.versionId)
                  );
                  setPrompt((text2) => removeCanvasV3PromptReference(text2, reference.versionId));
                }
              }
            ),
            expanded,
            onToggleExpanded: () => setExpanded(!expanded),
            models: models.map((model) => model.info),
            selectedModel: summaryModel,
            modelParams: params,
            modelsLoading: modelsQuery.isLoading,
            formDisabled: busy || !initialized2.current,
            onModelChange: (modelId) => {
              const next2 = models.find((item) => item.id === modelId);
              if (!next2 || busy) return;
              setSelection({ modelId, params: capabilityForm(next2.capability, params) });
              setParamsOpen(false);
            },
            onParamChange: (key2, value) => {
              if (!selectedModel || busy) return;
              setSelection({
                modelId: selectedModel.id,
                params: capabilityForm(selectedModel.capability, { ...params, [key2]: value })
              });
            },
            disabledOptions: (key2, form2) => selectedModel ? disabledOptions(selectedModel.capability, form2, key2) : [],
            paramUnavailable: (key2, form2) => selectedModel ? paramDisabled(selectedModel.capability, form2, key2) : false,
            canSubmit: canGenerate,
            generating,
            creditCost: perCallCost,
            onSubmit: () => void handleGenerate(),
            paramsOpen,
            onParamsOpenChange: setParamsOpen,
            retryAction: generationTask?.actions.includes("retry") ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button$3,
              {
                variant: "outline",
                size: "sm",
                disabled: !workbench || resolveTask.isPending || generationQuery.isFetching,
                onClick: () => void handleRetry(),
                "data-action-ui-id": "resource-detail-chat.resolve-retry",
                children: t2(generationTask.terminal ? "common.retry" : "canvasV3.generation.checkBalance")
              }
            ) : generationQuery.isError ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button$3,
              {
                variant: "outline",
                size: "sm",
                onClick: () => void generationQuery.refetch(),
                "data-action-ui-id": "resource-detail-chat.retry-task",
                children: t2("common.retry")
              }
            ) : historyQuery.isError ? /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "outline", disabled: busy, onClick: () => void historyQuery.refetch(), children: t2("common.retry") }) : modelsQuery.isError ? /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "outline", disabled: busy, onClick: () => modelsQuery.refetch(), children: t2("common.retry") }) : void 0,
            notices: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-h-16 shrink-0 overflow-y-auto text-xs empty:hidden", children: [
              historyQuery.isError && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "alert", className: "text-destructive", children: t2(
                historyMissing ? "workspace.structure.detail.chat.historyMissing" : "workspace.structure.detail.chat.historyError"
              ) }),
              historyQuery.isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "text-muted-foreground", children: t2("common.loading") }),
              historyQuery.data && !selectedModel && initialized2.current && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "text-muted-foreground", children: t2("workspace.structure.detail.chat.modelUnavailable") }),
              waitingForUser && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { role: "status", className: "text-muted-foreground", children: generationTask.problem?.code === "BILLING_INSUFFICIENT" ? t2("chat.billingInsufficient.title") : generationTask.problem?.message ?? t2("canvasV3.generation.waiting") }),
              generationQuery.isError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { role: "alert", className: "text-destructive", children: t2("canvasV3.generation.recoveryFailed") }),
              modelsQuery.isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { role: "status", className: "text-muted-foreground", children: t2("canvas.loadingModels") }),
              !modelsQuery.isLoading && !modelsQuery.isError && !selectedModel && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { role: "status", className: "text-muted-foreground", children: t2("canvas.noModels") }),
              modelsQuery.isError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { role: "alert", className: "text-destructive", children: t2("canvasV3.generation.modelsFailed") }),
              invalidReferences && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { role: "alert", className: "text-muted-foreground", children: t2("canvas.reference.unavailable") }),
              tooLong && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { role: "alert", className: "text-destructive", children: t2("canvas.prompt.tooLong", {
                current: promptLength,
                max: promptMaxLength
              }) })
            ] }),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              CanvasV3PromptInput,
              {
                inputRef,
                fillHeight: true,
                maxReferences,
                onReplaceReference: (previous2, next2) => {
                  setAttachments(
                    (items) => mergeCanvasV3References(
                      items.filter((item) => item.versionId !== previous2.versionId),
                      [
                        {
                          resourceId: next2.resourceId,
                          versionId: next2.versionId,
                          name: next2.name,
                          source: "resource"
                        }
                      ]
                    )
                  );
                  setPrompt(
                    (text2) => canvasV3PromptMentions(text2).reduceRight(
                      (result, mention) => mention.versionId === previous2.versionId ? result.slice(0, mention.from) + canvasV3ReferenceToken(next2.versionId) + result.slice(mention.to) : result,
                      text2
                    )
                  );
                },
                onClose: () => {
                  if (paramsOpen) setParamsOpen(false);
                },
                onSubmit: () => void handleGenerate(),
                prompt,
                options: availableReferences,
                selected: allReferences,
                disabled: busy || !initialized2.current,
                expanded,
                fontSize,
                metadata: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  PromptInputMetaRowView,
                  {
                    getPromptText: () => copyText,
                    copyDisabled: !prompt.length || !workbench.host.clipboard,
                    clipboard: workbench.host.clipboard ?? null,
                    currentLength: promptLength,
                    maxLength: promptMaxLength,
                    fontSize,
                    onFontSizeChange: setFontSize
                  }
                ),
                onChange: (nextPrompt) => {
                  setPrompt(nextPrompt);
                  const previous2 = new Set(
                    canvasV3PromptMentions(prompt).map((item) => item.versionId)
                  );
                  const added = canvasV3PromptMentions(nextPrompt).flatMap((item) => {
                    if (previous2.has(item.versionId)) return [];
                    const ref = availableReferences.find(
                      (option2) => option2.versionId === item.versionId
                    );
                    return ref ? [
                      {
                        resourceId: ref.resourceId,
                        versionId: ref.versionId,
                        name: ref.name,
                        source: "resource"
                      }
                    ] : [];
                  });
                  if (added.length) {
                    setAttachments((items) => mergeCanvasV3References(items, added));
                  }
                },
                onAddReference: (reference) => {
                  setAttachments(
                    (items) => items.some((item) => item.versionId === reference.versionId) ? items : [
                      ...items,
                      {
                        resourceId: reference.resourceId,
                        versionId: reference.versionId,
                        name: reference.name,
                        source: "resource"
                      }
                    ]
                  );
                }
              }
            )
          }
        ) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { hidden: mode2 !== "agent", className: "col-span-2 min-h-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          ResourceAgentInput,
          {
            target,
            compact: true,
            expanded,
            onToggleExpanded: () => setExpanded((value) => !value),
            fontSizePreference: [fontSize, setFontSize]
          }
        ) }),
        pickerOpen && workbench && /* @__PURE__ */ jsxRuntimeExports.jsx(
          ResourceReferencePicker,
          {
            onClose: () => setPickerOpen(false),
            onSelect: (references) => {
              setAttachments((items) => mergeCanvasV3References(items, references));
              setPickerOpen(false);
            },
            references: allReferences,
            maxCount: maxReferences === void 0 ? 20 : Math.max(0, maxReferences - allReferences.length)
          }
        )
      ]
    }
  );
}

export function useResourceDetail(resourceId2) {
  const runtime = useWorkbench();
  const queries = reactExports.useMemo(
    () => createResourceQueryOptions(runtime.resources, runtime.scopeKey),
    [runtime.resources, runtime.scopeKey]
  );
  const detailQuery = useQuery(queries.details([{ resourceId: resourceId2 }]));
  const versionsQuery = useQuery({
    queryKey: [...resourceQueryKeys.versions(runtime.scopeKey, { resourceId: resourceId2 }), "all"],
    queryFn: ({ signal }) => readResourceVersionHistory(runtime.resources, resourceId2, signal),
    networkMode: "always",
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
  const detailSection = toAsyncSectionState({
    hasData: detailQuery.data !== void 0 && versionsQuery.data !== void 0,
    isEmpty: false,
    isError: detailQuery.isError || versionsQuery.isError,
    isFetching: detailQuery.isFetching || versionsQuery.isFetching
  });
  const result = detailQuery.data?.[0];
  const detail2 = result?.ok ? result.detail : void 0;
  function refetch() {
    runtime.invalidateResources();
  }
  return {
    detail: detail2,
    versions: versionsQuery.data ?? [],
    status: detailSection.status,
    staleError: detailSection.staleError,
    refreshing: detailSection.refreshing,
    refetch
  };
}

export const ResourceChatRendererContext = reactExports.createContext(null);

export const ResourceChatTargetContext = reactExports.createContext(null);

export function useResourceChatRenderer() {
  return reactExports.useContext(ResourceChatRendererContext);
}

export function ResourceChatTargetProvider({
  target,
  children: children2
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ResourceChatTargetContext.Provider, { value: target, children: children2 });
}

export const handles = [
  { handle: "tl", left: "0%", top: "0%", cursor: "nwse-resize" },
  { handle: "tr", left: "100%", top: "0%", cursor: "nesw-resize" },
  { handle: "bl", left: "0%", top: "100%", cursor: "nesw-resize" },
  { handle: "br", left: "100%", top: "100%", cursor: "nwse-resize" },
  { handle: "t", left: "50%", top: "0%", cursor: "ns-resize" },
  { handle: "b", left: "50%", top: "100%", cursor: "ns-resize" },
  { handle: "l", left: "0%", top: "50%", cursor: "ew-resize" },
  { handle: "r", left: "100%", top: "50%", cursor: "ew-resize" }
];

export const ratios = ["free", "1:1", "4:3", "3:4", "16:9", "9:16"];

export function ResourceCropControls({
  src,
  geometry: geometry2,
  busy,
  onSubmit,
  onClose
}) {
  const { t: t2 } = useTranslation();
  const { cropRect, aspectRatio: aspectRatio2, handlePointerDown, setAspectRatio } = useImageCrop$1(
    geometry2.w,
    geometry2.h
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "pointer-events-none absolute inset-0",
      "data-action-ui-id": "resource-detail-crop-editor",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "absolute overflow-hidden",
            style: { left: geometry2.x, top: geometry2.y, width: geometry2.w, height: geometry2.h },
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "absolute border-2 border-background shadow-[0_0_0_9999px_var(--modal-mask-bg)]",
                style: {
                  left: `${cropRect.x * 100}%`,
                  top: `${cropRect.y * 100}%`,
                  width: `${cropRect.width * 100}%`,
                  height: `${cropRect.height * 100}%`
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      className: "pointer-events-auto absolute inset-0 cursor-move touch-none",
                      onPointerDown: (event) => !busy && handlePointerDown(event),
                      "data-action-ui-id": "resource-detail-crop-selection"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pointer-events-none absolute inset-0", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute inset-y-0 left-1/3 border-l border-background/30" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute inset-y-0 right-1/3 border-r border-background/30" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute inset-x-0 top-1/3 border-t border-background/30" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute inset-x-0 bottom-1/3 border-b border-background/30" })
                  ] }),
                  handles.map(({ handle: handle2, ...style2 }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      disabled: busy,
                      "aria-label": `${t2("canvas.crop")} ${handle2}`,
                      "data-action-ui-id": `resource-detail-crop-handle-${handle2}`,
                      className: "pointer-events-auto absolute z-10 size-4 -translate-x-1/2 -translate-y-1/2 touch-none rounded-sm border border-foreground bg-background hover:bg-muted",
                      style: style2,
                      onPointerDown: (event) => handlePointerDown(event, handle2)
                    },
                    handle2 ?? "move"
                  ))
                ]
              }
            )
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pointer-events-auto absolute bottom-3 left-1/2 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-lg border border-border bg-popover p-1.5 shadow-sm", children: [
          ratios.map((ratio) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button$3,
            {
              variant: aspectRatio2 === ratio ? "default" : "ghost",
              size: "sm",
              disabled: busy,
              onClick: () => setAspectRatio(ratio),
              "aria-pressed": aspectRatio2 === ratio,
              children: ratio === "free" ? t2("canvas.freeAspect") : ratio
            },
            ratio
          )),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "ghost", size: "sm", disabled: busy, onClick: onClose, children: t2("common.cancel") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button$3,
            {
              size: "sm",
              disabled: busy,
              "data-action-ui-id": "resource-detail-crop-submit",
              onClick: () => void onSubmit(
                () => cropImageToBlob$1(src, cropRect, geometry2.originalWidth, geometry2.originalHeight)
              ).catch(() => {
              }),
              children: t2("common.confirm")
            }
          )
        ] })
      ]
    }
  );
}

export function ResourceRedrawControls({
  geometry: geometry2,
  busy,
  onSubmit,
  onClose,
  cost
}) {
  const workbench = useWorkbench();
  const { t: t2 } = useTranslation();
  const [resolution2, setResolution] = reactExports.useState("2K");
  const [fontSize, setFontSize] = useDetailFontSize();
  const [pickedReferences, setPickedReferences] = reactExports.useState([]);
  const thumbnails = useDetailReferenceOptions(pickedReferences);
  const tool2 = useImageErase();
  const editor2 = reactExports.useRef(null);
  const [picker, setPicker] = reactExports.useState();
  const pickerRef = reactExports.useRef(picker);
  pickerRef.current = picker;
  reactExports.useEffect(() => () => pickerRef.current?.resolve(null), []);
  const painter = useImageMaskPainter({
    meta: geometry2,
    imagePos: geometry2,
    toolApi: tool2,
    onCancel: () => {
      if (!busy && !pickerRef.current) onClose();
    },
    brushColor: REDRAW_HIGHLIGHT_CSS_COLOR,
    overlayOpacity: REDRAW_HIGHLIGHT_UI_OPACITY,
    onSelectionComplete: (rect) => {
      if (editor2.current && !editor2.current.isDestroyed)
        insertCanvasRedrawRegion(editor2.current, selectionToNormalizedBBox(rect));
    }
  });
  const host = reactExports.useMemo(
    () => ({
      container: null,
      width: geometry2.w,
      height: geometry2.h,
      transform: [0, 0, 1],
      viewport: { getViewport: () => ({ x: 0, y: 0, zoom: 1 }), setViewport: () => {
      } },
      promptFontSize: fontSize,
      onPromptFontSizeChange: setFontSize,
      clipboard: workbench.host.clipboard ?? null,
      resolveAttachmentUrl: (attachment) => thumbnails.find((item) => item.versionId === attachment.reference?.versionId)?.url,
      resolveCost: (_tool, value, _model, count2) => cost(value ?? resolution2, count2),
      pickAttachment: (existing2) => new Promise((resolve) => setPicker({ existing: existing2, resolve }))
    }),
    [
      geometry2.w,
      geometry2.h,
      fontSize,
      setFontSize,
      workbench.host.clipboard,
      cost,
      resolution2,
      thumbnails
    ]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ImageModeHostProvider, { value: host, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "contents", "data-action-ui-id": "resource-detail-redraw-editor", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          ref: painter.paintRectRef,
          className: `absolute select-none touch-none ${busy ? "pointer-events-none" : "pointer-events-auto"}`,
          style: {
            left: geometry2.x,
            top: geometry2.y,
            width: geometry2.w,
            height: geometry2.h,
            ...painter.cursorStyle
          },
          ...painter.paintRectHandlers,
          "data-action-ui-id": "resource-detail-redraw-selection",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "canvas",
            {
              ref: painter.maskCanvasRef,
              className: "pointer-events-none absolute left-0 top-0",
              style: { opacity: painter.maskOverlayOpacity }
            }
          )
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pointer-events-auto absolute right-14 top-3 flex gap-1 rounded-lg bg-popover p-1 shadow-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button$3,
          {
            size: "sm",
            variant: "ghost",
            disabled: busy || !tool2.hasSelection,
            onClick: tool2.undoSelection,
            children: t2("canvas.undo")
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button$3,
          {
            size: "sm",
            variant: "ghost",
            disabled: busy || !tool2.canRedo,
            onClick: tool2.redoSelection,
            children: t2("canvas.redo")
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { size: "sm", variant: "ghost", disabled: busy, onClick: onClose, children: t2("common.cancel") })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "pointer-events-auto shrink-0 p-2",
          "data-action-ui-id": "resource-detail-redraw-composer",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            CanvasRedrawBottomBar,
            {
              hasRegions: tool2.hasSelection,
              submitting: busy,
              resolution: resolution2,
              onResolutionChange: setResolution,
              onEditorReady: (value) => {
                editor2.current = value;
              },
              onSend: (prompt, attachments) => {
                if (!tool2.selections[0] || busy) return;
                void onSubmit({
                  prompt,
                  attachments,
                  bbox: selectionToNormalizedBBox(tool2.selections[0]),
                  resolution: resolution2,
                  aspectRatio: geometry2.originalWidth / geometry2.originalHeight
                }).catch(() => {
                });
              }
            }
          )
        }
      )
    ] }),
    picker && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ResourceReferencePicker,
      {
        maxCount: 1,
        references: picker.existing.flatMap(
          (item) => item.reference ? [{ ...item.reference, name: item.name, source: "resource" }] : []
        ),
        onClose: () => {
          picker.resolve(null);
          setPicker(void 0);
        },
        onSelect: (references) => {
          setPickedReferences((current2) => mergeCanvasV3References(current2, references));
          const reference = references[0];
          picker.resolve(
            reference ? { id: reference.versionId, name: reference.name, reference } : null
          );
          setPicker(void 0);
        }
      }
    )
  ] });
}

export function ResourceToolbar({
  source,
  ready: ready2,
  canEdit = false,
  busy = false,
  tool: tool2 = null,
  onToolChange
}) {
  const { host, importCanvasImage } = useWorkbench();
  const hostReady = useDetailReady();
  const { t: t2 } = useTranslation();
  const [drafting, setDrafting] = reactExports.useState(false);
  const [error, setError] = reactExports.useState();
  const draft = reactExports.useRef(false);
  async function handleAddToChat() {
    if (draft.current || !host.chat) return;
    draft.current = true;
    setDrafting(true);
    setError(void 0);
    try {
      await host.chat.draft({ resources: [source] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t2("workspace.composition.actionFailed"));
    } finally {
      draft.current = false;
      setDrafting(false);
    }
  }
  const items = [
    {
      id: "add-to-chat",
      label: t2("canvas.addToChat"),
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AddToChatIcon$1, {}),
      forceLabel: true,
      disabled: !ready2 || !hostReady || drafting || !host.chat,
      onClick: () => void handleAddToChat(),
      dataActionUiId: "resource-detail-add-to-chat"
    }
  ];
  if (onToolChange) {
    for (const [id2, Icon2, label, available] of [
      ["crop", CropIcon, "canvas.crop", Boolean(importCanvasImage)],
      [
        "enhance",
        SuperResolutionIcon,
        "canvas.superResolution.label",
        Boolean(host.billing?.guardSubmission)
      ],
      ["redraw", RedrawIcon, "canvas.redraw.label", Boolean(host.billing?.guardSubmission)]
    ]) {
      items.push({
        id: id2,
        label: t2(label),
        tooltipLabel: t2(label),
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, {}),
        forceLabel: true,
        separator: id2 === "crop",
        active: tool2 === id2,
        disabled: !ready2 || !canEdit || busy || !available,
        onClick: () => onToolChange(tool2 === id2 ? null : id2),
        dataActionUiId: `resource-detail-${id2}`
      });
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "flex min-w-0 flex-col items-center gap-1",
      "data-action-ui-id": onToolChange ? "resource-detail-image-actions" : "resource-detail-actions",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(NodeToolbarPalette, { items, density: "compact" }),
        error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "alert", className: "max-w-40 text-xs text-destructive", children: error })
      ]
    }
  );
}

export function containedImageGeometry(width, height, originalWidth, originalHeight) {
  const scale2 = Math.min(width / originalWidth, height / originalHeight);
  const w3 = originalWidth * scale2;
  const h2 = originalHeight * scale2;
  return { x: (width - w3) / 2, y: (height - h2) / 2, w: w3, h: h2, originalWidth, originalHeight };
}

export function ResourceImageStage({
  source,
  name: name2,
  ready: ready2,
  children: children2
}) {
  const workbench = useWorkbench();
  const hostReady = useDetailReady();
  const { t: t2 } = useTranslation();
  const media2 = useVersionMediaSource(source.resourceId, source.versionId, "image");
  const { data: pricing } = useDetailPricing();
  const [container, setContainer] = reactExports.useState(null);
  const [size2, setSize] = reactExports.useState({ width: 0, height: 0 });
  const [image2, setImage] = reactExports.useState();
  const [failedSource, setFailedSource] = reactExports.useState();
  const [tool2, setTool] = reactExports.useState(null);
  const [pending2, setPending] = reactExports.useState(false);
  const [error, setError] = reactExports.useState();
  const busy = reactExports.useRef(false);
  const alive = reactExports.useRef(true);
  reactExports.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  reactExports.useEffect(() => {
    if (!container) return;
    const measure = ({ width, height }) => setSize({ width, height });
    const observer2 = new ResizeObserver(([entry]) => {
      if (entry) measure(entry.contentRect);
    });
    observer2.observe(container);
    measure(container.getBoundingClientRect());
    return () => observer2.disconnect();
  }, [container]);
  reactExports.useEffect(() => {
    if (!tool2) return;
    const handleEscape = (event) => {
      if (event.key === "Escape" && tool2 !== "redraw") {
        event.stopPropagation();
        event.preventDefault();
        if (!busy.current) setTool(null);
      }
    };
    document.addEventListener("keydown", handleEscape, true);
    return () => document.removeEventListener("keydown", handleEscape, true);
  }, [tool2]);
  const geometry2 = image2 && image2.src === media2.src && failedSource !== media2.src && image2.width && image2.height && size2.width ? containedImageGeometry(size2.width, size2.height, image2.width, image2.height) : void 0;
  const cost = reactExports.useCallback(
    (resolution2, count2) => calcImageCost(pricing, "doubao-seedream-5-0-pro-260628", resolution2, void 0, count2),
    [pricing]
  );
  async function submit(operation2, paid) {
    if (busy.current || !ready2 || !hostReady) return;
    busy.current = true;
    setPending(true);
    setError(void 0);
    try {
      if (paid && !await workbench.host.billing?.guardSubmission?.("canvas")) return;
      await operation2();
      if (alive.current) setTool(null);
      dedupedToast.success(
        t2(
          paid ? "workspace.structure.detail.taskSubmitted" : "workspace.structure.detail.versionAdded"
        )
      );
    } catch (cause) {
      if (alive.current)
        setError(cause instanceof Error ? cause.message : t2("workspace.composition.actionFailed"));
      throw cause;
    } finally {
      busy.current = false;
      if (alive.current) setPending(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "relative flex size-full flex-col",
      "data-action-ui-id": "resource-detail-image-stage",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `flex shrink-0 justify-center pb-2 ${tool2 ? "hidden" : ""}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          ResourceToolbar,
          {
            source,
            ready: ready2 && hostReady,
            canEdit: Boolean(geometry2),
            busy: pending2 || !hostReady,
            tool: tool2,
            onToolChange: setTool
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            ref: setContainer,
            className: "relative min-h-0 flex-1",
            "data-action-ui-id": "resource-detail-image-viewport",
            children: media2.src && failedSource !== media2.src ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "absolute overflow-hidden rounded-lg",
                "data-action-ui-id": "resource-detail-image-bounds",
                style: geometry2 ? { left: geometry2.x, top: geometry2.y, width: geometry2.w, height: geometry2.h } : { inset: 0 },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "img",
                    {
                      src: media2.src,
                      alt: name2,
                      draggable: false,
                      className: "absolute inset-0 size-full select-none rounded-lg object-contain",
                      onLoad: (event) => setImage({
                        src: event.currentTarget.src,
                        width: event.currentTarget.naturalWidth,
                        height: event.currentTarget.naturalHeight
                      }),
                      onError: (event) => setFailedSource(event.currentTarget.src)
                    },
                    media2.src
                  ),
                  !tool2 && children2,
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ImageFullscreenButton, { src: media2.src, name: name2 }, `fullscreen:${media2.src}`)
                ]
              }
            ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
              "p",
              {
                role: "status",
                className: "flex size-full items-center justify-center text-sm text-muted-foreground",
                children: t2(
                  media2.isError || failedSource ? "workspace.structure.detail.mediaUnavailable" : "common.loading"
                )
              }
            )
          }
        ),
        geometry2 && media2.src && tool2 === "crop" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          ResourceCropControls,
          {
            src: media2.src,
            geometry: geometry2,
            busy: pending2 || !hostReady,
            onClose: () => setTool(null),
            onSubmit: (createBlob) => submit(async () => workbench.resourceDetail.crop(source, await createBlob()), false)
          }
        ),
        geometry2 && tool2 === "enhance" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "absolute bottom-3 right-3",
            "data-action-ui-id": "resource-detail-enhance-panel",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              EnhanceImagePanel,
              {
                width: geometry2.originalWidth,
                height: geometry2.originalHeight,
                creditCost: calcImageCost(pricing, "mediakit_enhance"),
                submitting: pending2 || !hostReady,
                onClose: () => !pending2 && setTool(null),
                onSubmit: (params) => {
                  const { targetWidth, targetHeight } = params;
                  if (targetWidth && targetHeight)
                    void submit(
                      () => workbench.resourceDetail.enhance(source, {
                        targetWidth,
                        targetHeight
                      }),
                      true
                    ).catch(() => {
                    });
                }
              }
            )
          }
        ),
        geometry2 && tool2 === "redraw" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          ResourceRedrawControls,
          {
            geometry: geometry2,
            busy: pending2 || !hostReady,
            cost,
            onClose: () => setTool(null),
            onSubmit: (params) => submit(
              () => workbench.resourceDetail.redraw(source, {
                prompt: params.prompt,
                resolution: params.resolution,
                aspectRatio: params.aspectRatio,
                references: params.attachments.map((item) => {
                  if (!item.reference) throw new Error("RESOURCE_REFERENCE_UNAVAILABLE");
                  return item.reference;
                })
              }),
              true
            )
          }
        ),
        error && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "p",
          {
            role: "alert",
            className: "absolute left-3 right-3 top-3 rounded-lg bg-popover p-2 text-xs text-destructive",
            children: error
          }
        )
      ]
    }
  );
}

export function ResourceDetail({
  resourceId: resourceId2,
  labels,
  renderPageState,
  renderHeaderActions,
  renderVersionActions
}) {
  const { detail: detail2, versions, status, refreshing, refetch } = useResourceDetail(resourceId2);
  const { setCurrentVersion, isPending } = useSetCurrentVersion({
    resourceId: resourceId2,
    expectedCurrentVersionId: detail2?.resource.currentVersionId ?? null
  });
  const pageStateInput = status === "error" ? { type: "error", text: labels.loadError, retry: { onClick: refetch, loading: refreshing } } : { type: "empty", text: labels.empty };
  const renderState = () => renderPageState ? renderPageState(pageStateInput) : /* @__PURE__ */ jsxRuntimeExports.jsx(
    PageStateView,
    {
      density: "panel",
      state: resolvePageState(pageStateInput, labels.retry),
      labels: {
        emptyText: labels.empty,
        errorText: labels.loadError,
        networkErrorText: labels.loadError
      }
    }
  );
  if (status === "loading") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center p-8 text-sm text-muted-foreground", children: labels.loading });
  }
  if (status === "error" || !detail2) {
    return renderState();
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ResourceDetailContent,
    {
      resource: detail2.resource,
      versions,
      labels,
      renderHeaderActions,
      renderVersionActions,
      onSetCurrent: setCurrentVersion,
      isPending
    },
    resourceId2
  );
}

export function ResourceDetailContent({
  resource: resource2,
  versions,
  labels,
  renderHeaderActions,
  renderVersionActions,
  onSetCurrent,
  isPending
}) {
  const currentVersionId = resource2.currentVersionId;
  const fallbackVersionId = currentVersionId ?? versions[0]?.versionId;
  const [selectedVersionId, setSelectedVersionId] = reactExports.useState(fallbackVersionId);
  const [visitedVersionIds, setVisitedVersionIds] = reactExports.useState(
    fallbackVersionId ? [fallbackVersionId] : []
  );
  reactExports.useEffect(() => {
    if (selectedVersionId)
      setVisitedVersionIds(
        (ids2) => ids2.includes(selectedVersionId) ? ids2 : [...ids2, selectedVersionId]
      );
  }, [selectedVersionId]);
  reactExports.useEffect(() => {
    const known = versions.some((version2) => version2.versionId === selectedVersionId);
    if (!known) setSelectedVersionId(fallbackVersionId);
  }, [versions, selectedVersionId, fallbackVersionId]);
  const selectedIndex = reactExports.useMemo(() => {
    const index2 = versions.findIndex((version2) => version2.versionId === selectedVersionId);
    return index2 === -1 ? void 0 : index2;
  }, [versions, selectedVersionId]);
  const selectedVersion = selectedIndex === void 0 ? void 0 : versions[selectedIndex];
  const isCurrentSelected = selectedVersion?.versionId === currentVersionId;
  const ResourceIcon = resourceKindIcon(resource2.kind);
  const actionsRequest = selectedVersion ? { resourceId: resource2.resourceId, versionId: selectedVersion.versionId } : void 0;
  const renderChat = useResourceChatRenderer();
  const chatSurface = /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "data-action-ui-id": "resource-detail-chat", className: "shrink-0 border-t border-border p-2", children: versions.filter((version2) => visitedVersionIds.includes(version2.versionId)).map((version2) => {
    const target = {
      resourceId: resource2.resourceId,
      versionId: version2.versionId,
      kind: resource2.kind,
      resourceName: resource2.name
    };
    const active2 = version2.versionId === selectedVersionId;
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { hidden: !active2, inert: !active2, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResourceChatTargetProvider, { target, children: renderChat ? renderChat() : /* @__PURE__ */ jsxRuntimeExports.jsx(ResourceChat, { ...target }) }) }, version2.versionId);
  }) });
  const previewActions = isCurrentSelected && resource2.kind === ProjectResourceKind.IMAGE ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      "data-action-ui-id": "resource-detail-current-cover",
      className: "inline-flex h-8 items-center rounded-lg bg-background/70 px-2 text-xs font-medium text-foreground",
      children: labels.currentCover
    }
  ) : !isCurrentSelected && selectedVersion ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    Button$3,
    {
      type: "button",
      variant: "ghost",
      size: "sm",
      "data-action-ui-id": "resource-detail-set-cover",
      disabled: isPending,
      onClick: () => onSetCurrent(selectedVersion.versionId),
      className: "h-8 rounded-lg bg-background/70 px-2 text-xs font-medium",
      children: labels.setAsCover
    }
  ) : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "resource-detail flex min-h-0 min-w-0 flex-1 flex-col",
      "data-action-ui-id": "resource-detail",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "shrink-0 border-b border-border px-4 py-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "flex min-w-0 flex-1 items-center gap-1.5 text-base font-medium text-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ResourceIcon, { "aria-hidden": "true", strokeWidth: 1.5, className: "size-4 shrink-0" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate", title: resource2.name, children: resource2.name })
            ] }),
            renderHeaderActions?.()
          ] }),
          resource2.description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "max-h-20 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-5 text-foreground", children: resource2.description })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "min-h-0 flex-auto overflow-y-auto overscroll-contain px-4 py-3",
            "data-action-ui-id": "resource-detail-content",
            children: versions.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground", children: labels.empty }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-col gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex min-w-0 items-center", children: [
                renderVersionActions && actionsRequest && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute left-2 top-2 z-10", children: renderVersionActions(actionsRequest) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    className: `resource-detail-preview relative min-w-0 flex-1 overflow-hidden rounded-lg ${resource2.kind === ProjectResourceKind.IMAGE && !renderVersionActions ? "resource-detail-preview-image" : "bg-muted/40"}`,
                    "data-action-ui-id": "resource-detail-preview",
                    children: [
                      selectedVersion && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 overflow-auto", children: resource2.kind === ProjectResourceKind.IMAGE && !renderVersionActions ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                        ResourceImageStage,
                        {
                          source: {
                            resourceId: resource2.resourceId,
                            versionId: selectedVersion.versionId
                          },
                          name: resource2.name,
                          ready: selectedVersion.status === "ready" && resource2.lifecycle === "active",
                          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "div",
                            {
                              className: "absolute left-2 top-2 z-10",
                              "data-action-ui-id": "resource-detail-cover-overlay",
                              children: previewActions
                            }
                          )
                        },
                        selectedVersion.versionId
                      ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                        ResourcePreview,
                        {
                          resourceId: resource2.resourceId,
                          versionId: selectedVersion.versionId,
                          kind: resource2.kind,
                          name: resource2.name,
                          labels
                        },
                        selectedVersion.versionId
                      ) }),
                      !renderVersionActions && resource2.kind !== ProjectResourceKind.IMAGE && selectedVersion && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute left-2 top-2 z-10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                        ResourceToolbar,
                        {
                          source: {
                            resourceId: resource2.resourceId,
                            versionId: selectedVersion.versionId
                          },
                          ready: selectedVersion.status === "ready" && resource2.lifecycle === "active"
                        },
                        selectedVersion.versionId
                      ) })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-col items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "ul",
                  {
                    "aria-label": labels.versionsTitle,
                    className: "flex max-w-full items-center gap-2 overflow-x-auto p-1",
                    children: versions.map((version2, index2) => {
                      const isSelected = version2.versionId === selectedVersionId;
                      const isCover = version2.versionId === currentVersionId;
                      return /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "button",
                        {
                          type: "button",
                          "data-action-ui-id": "resource-detail-version",
                          "aria-current": isSelected,
                          "aria-label": isCover ? `${labels.currentCover} ${index2 + 1}/${versions.length}` : `${index2 + 1}/${versions.length}`,
                          onClick: () => setSelectedVersionId(version2.versionId),
                          className: `relative flex w-20 cursor-pointer flex-col overflow-hidden rounded-lg border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isSelected ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground hover:border-foreground"}`,
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              ResourceThumbnail,
                              {
                                resourceId: resource2.resourceId,
                                versionId: version2.status === "ready" ? version2.versionId : void 0,
                                kind: resource2.kind,
                                variant: "version",
                                className: "h-12 w-full"
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex w-full items-center justify-between gap-1 px-1 py-0.5 text-[11px]", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                                "V",
                                index2 + 1
                              ] }),
                              isCover && resource2.kind !== ProjectResourceKind.IMAGE && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[10px]", children: labels.currentCover })
                            ] })
                          ]
                        }
                      ) }, version2.versionId);
                    })
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center gap-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-foreground", children: [
                    selectedIndex === void 0 ? versions.length : selectedIndex + 1,
                    "/",
                    versions.length
                  ] }),
                  (resource2.kind !== ProjectResourceKind.IMAGE || renderVersionActions) && previewActions
                ] })
              ] })
            ] })
          }
        ),
        chatSurface
      ]
    }
  );
}

export function resourceKindIcon(kind2) {
  if (kind2 === ProjectResourceKind.IMAGE) return Image$1;
  if (kind2 === ProjectResourceKind.VIDEO) return Film$2;
  if (kind2 === ProjectResourceKind.AUDIO) return Music$2;
  return FileText;
}

export function ResourceDetailDialog({
  active: active2,
  onClose,
  resourceId: resourceId2,
  labels
}) {
  const { t: t2 } = useTranslation();
  const activeRef = reactExports.useRef(active2);
  activeRef.current = active2;
  const returnFocus = reactExports.useRef(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DialogRoot, { open: true, onOpenChange: (open) => !open && onClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogPortal$3, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogBackdrop, { className: "modal-mask fixed inset-0 z-50" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      DialogPopup,
      {
        finalFocus: () => activeRef.current && returnFocus.current?.isConnected ? returnFocus.current : false,
        className: "fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl elevated-surface-border bg-popover text-popover-foreground outline-none sm:max-w-3xl",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle$3, { className: "sr-only", children: labels.versionsTitle }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            DialogClose$1,
            {
              render: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button$3,
                {
                  variant: "ghost",
                  size: "icon",
                  className: "absolute right-2 top-2 z-10 size-8 rounded-lg",
                  "aria-label": t2("common.close"),
                  "data-action-ui-id": "structure-detail-close"
                }
              ),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$8, { "aria-hidden": "true", strokeWidth: 1.5, className: "size-4" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "min-h-0 flex-1 overflow-y-auto", "aria-label": labels.versionsTitle, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResourceDetail, { resourceId: resourceId2, labels }) })
        ]
      }
    )
  ] }) });
}

export function parseStructuredDocument(source) {
  let remaining = 1e4;
  function validate2(value, depth2) {
    if (--remaining < 0 || depth2 > 32) return false;
    if (value === null || typeof value === "string" || typeof value === "boolean") return true;
    if (typeof value === "number") return Number.isFinite(value);
    if (Array.isArray(value)) return value.every((child) => validate2(child, depth2 + 1));
    return typeof value === "object" && Object.values(value).every((child) => validate2(child, depth2 + 1));
  }
  try {
    const value = JSON.parse(source);
    return validate2(value, 0) ? { value } : null;
  } catch {
    return null;
  }
}

export function WorkspaceStructuredDocument({
  name: name2,
  value,
  active: active2
}) {
  const title = isDocumentObject(value) && typeof value.title === "string" && value.title.trim() ? value.title : name2;
  const content2 = title !== name2 && isDocumentObject(value) ? Object.fromEntries(Object.entries(value).filter(([key2]) => key2 !== "title")) : value;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: "@container/document min-w-0 space-y-4",
      "data-action-ui-id": "structure-json-card",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "flex items-center gap-1.5 text-sm font-medium", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            FileText$1,
            {
              "aria-hidden": true,
              strokeWidth: 1.5,
              className: "size-3.5 shrink-0 text-muted-foreground"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "[overflow-wrap:anywhere]", children: title })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DocumentContent, { value: content2, active: active2, depth: 0 })
      ]
    }
  );
}

export const readDocument = createReadLimiter();

export function WorkspaceCompositionDocuments({
  documents,
  active: active2,
  children: children2
}) {
  const { t: t2 } = useTranslation();
  const { scopeKey } = useWorkbench();
  const runtime = useOptionalWorkspaceStructure();
  const request = useGatewayFetch();
  const [backupOpen, setBackupOpen] = reactExports.useState(false);
  const unique2 = [
    ...new Map(documents.map((d2) => [`${d2.resourceId}:${d2.versionId}`, d2])).values()
  ].sort(
    (a2, b3) => b3.updatedAt.localeCompare(a2.updatedAt) || a2.resourceId.localeCompare(b3.resourceId)
  );
  const reads = useQueries({
    queries: unique2.map(({ resourceId: resourceId2, versionId }) => ({
      queryKey: [...resourceQueryKeys.all(scopeKey), "structured-document", resourceId2, versionId],
      enabled: active2 && Boolean(runtime?.ready),
      networkMode: "always",
      staleTime: Infinity,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      queryFn: ({ signal }) => readDocument(signal, async () => {
        const response = await request("/api/v3/query/document_read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            versionId,
            startLine: 1,
            lineCount: PROJECT_DOCUMENT_READ_DEFAULT_LINES
          }),
          signal
        });
        if (!response.ok) throw Error(`Document read failed: ${response.status}`);
        const document2 = parseDocumentContent(await response.json(), resourceId2, versionId, 1);
        if (document2.more || document2.truncated) return null;
        const parsed = parseStructuredDocument(document2.text);
        return parsed ? { ...parsed, name: document2.name } : null;
      })
    }))
  });
  const cards = reads.flatMap(
    (read, index2) => read.data ? [{ source: unique2[index2], data: read.data }] : []
  );
  if (!cards.length) return children2;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 space-y-4", "data-action-ui-id": "structure-json-documents", children: [
    cards.map(({ source, data: data2 }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      WorkspaceStructuredDocument,
      {
        name: data2.name,
        value: data2.value,
        active: active2
      },
      `${scopeKey}:${source.resourceId}:${source.versionId}`
    )),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "details",
      {
        className: "border-t border-border/50 pt-3",
        onToggle: (event) => setBackupOpen(event.currentTarget.open),
        "data-action-ui-id": "structure-document-backup",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { className: "cursor-pointer text-xs text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-foreground", children: t2("structure.documentBackup") }),
          backupOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4", children: children2 })
        ]
      }
    )
  ] });
}

export const detailServices = {
  useDialogProps: useBrowserOverlayDialogProps,
  usePromptFontSize: usePromptFontSizePreference
};

export const renderDocuments = (props) => /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceCompositionDocuments, { ...props });

export function WorkspaceStructurePresentation({ children: children2 }) {
  const runtime = useOptionalWorkspaceStructure();
  const gatewayUrl2 = useGatewayUrl();
  const { gatewayBinding } = useRequiredGatewayScope();
  const imageUrl = reactExports.useCallback(
    ({ resourceId: resourceId2, versionId }) => runtime?.ready && runtime.workbench && gatewayBinding ? gatewayUrl2(
      `${CANVAS_V3_ROUTES.images}/${encodeURIComponent(resourceId2)}/${encodeURIComponent(versionId)}`
    ) : void 0,
    [gatewayUrl2, gatewayBinding, runtime?.ready, runtime?.workbench]
  );
  const videoThumbnailUrl2 = reactExports.useCallback(
    ({ relativePath }) => runtime?.ready && runtime.workbench && gatewayBinding ? withThumbnail(gatewayUrl2(API_PATHS.thumbnail(relativePath)), 320) : void 0,
    [gatewayUrl2, gatewayBinding, runtime?.ready, runtime?.workbench]
  );
  const videoUrl = reactExports.useCallback(
    ({ relativePath }) => {
      const source = runtime?.ready && runtime.workbench && gatewayBinding ? gatewayUrl2(API_PATHS.serveFile(relativePath)) : void 0;
      return source ? resolveVideoPlaybackUrl(source) : void 0;
    },
    [gatewayUrl2, gatewayBinding, runtime?.ready, runtime?.workbench]
  );
  const thumbnailUrl = reactExports.useCallback(
    ({ relativePath, width, kind: kind2 }) => runtime?.ready && runtime.workbench && gatewayBinding ? withThumbnail(
      gatewayUrl2(
        kind2 === 2 ? API_PATHS.serveFile(relativePath) : API_PATHS.thumbnail(relativePath)
      ),
      width
    ) : void 0,
    [gatewayUrl2, gatewayBinding, runtime?.ready, runtime?.workbench]
  );
  const { t: t2, i18n } = useTranslation();
  const renderAudio = reactExports.useCallback(
    ({ relativePath, name: name2, active: active2 = true, compact: compact2 = false }) => {
      const src = runtime?.ready && gatewayBinding ? gatewayUrl2(API_PATHS.serveFile(relativePath)) : void 0;
      return src ? /* @__PURE__ */ jsxRuntimeExports.jsx(I18nextProvider, { i18n, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: `h-full [&_svg[data-waveform-kind]]:max-w-full ${compact2 ? "[&_svg[data-waveform-kind]]:h-6 [&_div:has(>svg[data-waveform-kind])]:py-1" : "[&_svg[data-waveform-kind]]:h-12"}`,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            CanvasV3AudioPlayer,
            {
              src,
              active: active2 && runtime?.isActive !== false,
              fileName: name2
            }
          )
        }
      ) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: t2("workspace.structure.detail.mediaUnavailable") });
    },
    [gatewayUrl2, gatewayBinding, runtime?.ready, runtime?.isActive, i18n, t2]
  );
  const renderResourceDetail = reactExports.useCallback(
    ({ resourceId: resourceId2, active: active2, onClose }) => /* @__PURE__ */ jsxRuntimeExports.jsx(I18nextProvider, { i18n, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CanvasV3HostServicesProvider, { value: detailServices, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      ResourceDetailDialog,
      {
        active: active2,
        onClose,
        resourceId: resourceId2,
        labels: resourceDetailLabels(t2)
      }
    ) }) }),
    [t2, i18n]
  );
  const [locale] = reactExports.useState(() => {
    const instance2 = createInstance();
    void instance2.init({
      lng: i18n.language.startsWith("zh") ? "zh" : "en",
      fallbackLng: "en",
      initImmediate: false,
      resources: {
        zh: { translation: { structure: structureTranslations.zh } },
        en: { translation: { structure: structureTranslations.en } }
      },
      interpolation: { escapeValue: false }
    });
    return instance2;
  });
  reactExports.useEffect(() => {
    locale.addResourceBundle(
      "zh",
      "translation",
      { structure: structureTranslations.zh },
      true,
      true
    );
    locale.addResourceBundle(
      "en",
      "translation",
      { structure: structureTranslations.en },
      true,
      true
    );
    void locale.changeLanguage(i18n.language.startsWith("zh") ? "zh" : "en");
  }, [i18n.language, locale, structureTranslations]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(I18nextProvider, { i18n: locale, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    StructureMediaProvider,
    {
      imageUrl,
      videoUrl,
      videoThumbnailUrl: videoThumbnailUrl2,
      thumbnailUrl,
      renderAudio,
      renderDocument,
      renderDocuments,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResourceDetailProvider, { renderDialog: renderResourceDetail, children: children2 })
    }
  ) });
}

export function resourceDetailLabels(t2) {
  return {
    loading: t2("common.loading"),
    loadError: t2("workspace.composition.resourceError"),
    retry: t2("common.retry"),
    empty: t2("workspace.structure.detail.empty"),
    versionsTitle: t2("workspace.structure.detail.versionsTitle"),
    setAsCover: t2("assetCenter.cover.set"),
    currentCover: t2("workspace.structure.detail.currentCover"),
    mediaUnavailable: t2("workspace.structure.detail.mediaUnavailable")
  };
}

var g = (n2) => {
  if (!n2) return false;
  let r2 = n2.charCodeAt(0);
  return r2 >= 48 && r2 <= 57 || r2 >= 65 && r2 <= 90 || r2 >= 97 && r2 <= 122 || r2 === 95 ? true : H.test(n2);
}, X = (n2, r2) => {
  let e2 = 1;
  for (let i2 = r2 - 1; i2 >= 0; i2 -= 1) if (n2[i2] === "]") e2 += 1;
  else if (n2[i2] === "[" && (e2 -= 1, e2 === 0)) return i2;
  return -1;
}, C2 = (n2, r2) => {
  let e2 = 1;
  for (let i2 = r2 + 1; i2 < n2.length; i2 += 1) if (n2[i2] === "[") e2 += 1;
  else if (n2[i2] === "]" && (e2 -= 1, e2 === 0)) return i2;
  return -1;
}, h = (n2, r2) => {
  let e2 = false, i2 = false;
  for (let s2 = 0; s2 < n2.length && s2 < r2; s2 += 1) {
    if (n2[s2] === "\\" && n2[s2 + 1] === "$") {
      s2 += 1;
      continue;
    }
    n2[s2] === "$" && (n2[s2 + 1] === "$" ? (i2 = !i2, s2 += 1, e2 = false) : i2 || (e2 = !e2));
  }
  return e2 || i2;
}, In = (n2, r2) => {
  for (let e2 = r2; e2 < n2.length; e2 += 1) {
    if (n2[e2] === ")") return true;
    if (n2[e2] === `
`) return false;
  }
  return false;
}, m = (n2, r2) => {
  for (let e2 = r2 - 1; e2 >= 0; e2 -= 1) {
    if (n2[e2] === ")") return false;
    if (n2[e2] === "(") return e2 > 0 && n2[e2 - 1] === "]" ? In(n2, r2) : false;
    if (n2[e2] === `
`) return false;
  }
  return false;
}, z2 = (n2, r2) => {
  for (let e2 = r2 - 1; e2 >= 0; e2 -= 1) {
    if (n2[e2] === ">") return false;
    if (n2[e2] === "<") {
      let i2 = e2 + 1 < n2.length ? n2[e2 + 1] : "";
      return i2 >= "a" && i2 <= "z" || i2 >= "A" && i2 <= "Z" || i2 === "/";
    }
    if (n2[e2] === `
`) return false;
  }
  return false;
}, p2 = (n2, r2, e2) => {
  let i2 = 0;
  for (let l2 = r2 - 1; l2 >= 0; l2 -= 1) if (n2[l2] === `
`) {
    i2 = l2 + 1;
    break;
  }
  let s2 = n2.length;
  for (let l2 = r2; l2 < n2.length; l2 += 1) if (n2[l2] === `
`) {
    s2 = l2;
    break;
  }
  let o2 = n2.substring(i2, s2), t2 = 0, a2 = false;
  for (let l2 of o2) if (l2 === e2) t2 += 1;
  else if (l2 !== " " && l2 !== "	") {
    a2 = true;
    break;
  }
  return t2 >= 3 && !a2;
};

export const FileText$1 = createLucideIcon("FileText", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M10 9H8", key: "b1mrlr" }],
  ["path", { d: "M16 13H8", key: "t4e002" }],
  ["path", { d: "M16 17H8", key: "z1uh3a" }]
]);

export const Image$1 = createLucideIcon("Image", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2", key: "1m3agn" }],
  ["circle", { cx: "9", cy: "9", r: "2", key: "af1f0g" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "1xmnt7" }]
]);

export function resolvePageState(input, defaultRetryLabel, online = true) {
  if (input.type === "normal") return { type: "normal" };
  const retryAction = resolveRetryAction(input.retry, defaultRetryLabel);
  const actions = retryAction ? [retryAction, ...(input.actions ?? []).filter((action) => action.key !== retryAction.key)] : [...input.actions ?? []];
  const presentation = {
    icon: input.icon,
    title: input.title,
    description: input.description,
    text: input.text,
    actions
  };
  if (input.type === "error") {
    return {
      type: "error",
      reason: input.reason ?? (online ? "generic" : "network"),
      ...presentation
    };
  }
  return {
    type: "empty",
    reason: input.reason ?? "generic",
    ...presentation
  };
}

var M = /(\*\*)([^*]*\*?)$/, N = /(__)([^_]*?)$/, y$1 = /(\*\*\*)([^*]*?)$/, R$1 = /(\*)([^*]*?)$/, U = /(_)([^_]*?)$/, W$1 = /(`)([^`]*?)$/, K$1 = /(~~)([^~]*?)$/, d = /^[\s_~*`]*$/, b2 = /^[\s]*[-*+][\s]+$/, H = /[\p{L}\p{N}_]/u, D$1 = /^```[^`\n]*```?$/, w2 = /^\*{4,}$/;

export function ImageFullscreenPreview(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ImageFullscreenContent, { ...props }, props.previewKey ?? props.src);
}

export function PageStateIllustration(props) {
  const { resolved } = useTheme();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(PageStateIllustration$1, { ...props, theme: resolved });
}

export const WAVEFORM_CONTAINER_HEIGHT = 64;

export const WAVEFORM_WIDTH = 318;

export function assertScope(scopeKey) {
  if (!scopeKey.trim()) throw new Error("Composition queries require a workspace scope key");
}

export const identity = (ref) => JSON.stringify([ref.resourceId, ref.versionId]);

export async function readCompositionResources(compositions, resources, compositionId, options2) {
  const composition2 = await compositions.get(compositionId, options2);
  if (composition2.compositionId !== compositionId || composition2.lifecycle !== "active")
    throw new Error("Composition unavailable");
  const ids2 = [
    ...new Set(
      composition2.members.flatMap((member2) => member2.resource === null ? [] : [member2.resource])
    )
  ];
  const details = [];
  for (let offset2 = 0; offset2 < ids2.length; offset2 += 50) {
    const batch2 = ids2.slice(offset2, offset2 + 50);
    const results = await resources.getResources(
      batch2.map((resourceId2) => ({ resourceId: resourceId2 })),
      options2
    );
    if (results.length !== batch2.length) throw new Error("Incomplete composition resources");
    for (const [index2, result] of results.entries()) {
      if (!result.ok || result.detail.resource.resourceId !== batch2[index2] || result.detail.resource.lifecycle !== "active" || result.detail.version?.status !== "ready")
        throw new Error("Composition resource unavailable");
      details.push({ resource: result.detail.resource, version: result.detail.version });
    }
  }
  if (!details.length) throw new Error("Composition has no readable files");
  return { composition: composition2, details };
}

export function resolveRetryAction(retry, defaultLabel) {
  if (!retry) return void 0;
  if (typeof retry === "function") {
    return {
      key: DEFAULT_RETRY_ACTION_KEY,
      label: defaultLabel,
      variant: DEFAULT_RETRY_ACTION_VARIANT,
      onClick: retry
    };
  }
  return {
    key: retry.key ?? DEFAULT_RETRY_ACTION_KEY,
    icon: retry.icon,
    label: retry.label ?? defaultLabel,
    variant: retry.variant ?? DEFAULT_RETRY_ACTION_VARIANT,
    onClick: retry.onClick,
    placement: retry.placement,
    disabled: retry.disabled,
    loading: retry.loading
  };
}

export const DEFAULT_RETRY_ACTION_KEY = "retry";

export const DEFAULT_RETRY_ACTION_VARIANT = "default";

export function ImageFullscreenContent({ src, name: name2, statusLabel: statusLabel2, onClose }) {
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

export function PageStateIllustration$1({
  type: type2,
  emptyReason,
  errorReason,
  className,
  theme
}) {
  const illustration = type2 === "empty" && emptyReason === "project" ? "empty_project_icon" : type2 === "error" && errorReason === "network" ? "network" : type2;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "img",
    {
      src: ILLUSTRATION_URLS[illustration][theme],
      alt: "",
      className: cn$1("size-40 max-w-full object-contain", className),
      "aria-hidden": "true",
      draggable: false,
      "data-page-state-illustration": illustration,
      "data-theme": theme
    }
  );
}


export const ILLUSTRATION_URLS = {
  empty: {
    light: new URL("" + new URL("empty-light-BIA_9y_3.svg", import.meta.url).href, import.meta.url).href,
    dark: new URL("" + new URL("empty-dark-BE6TzTYo.svg", import.meta.url).href, import.meta.url).href
  },
  empty_project_icon: {
    light: new URL("" + new URL("empty-project-light-VIJs1g6w.svg", import.meta.url).href, import.meta.url).href,
    dark: new URL("" + new URL("empty-project-dark-DfthmI8z.svg", import.meta.url).href, import.meta.url).href
  },
  error: {
    light: new URL("" + new URL("error-light-WSZvGPdq.svg", import.meta.url).href, import.meta.url).href,
    dark: new URL("" + new URL("error-dark-DDp36kGq.svg", import.meta.url).href, import.meta.url).href
  },
  network: {
    light: new URL("" + new URL("network-error-light-brwv6dty.svg", import.meta.url).href, import.meta.url).href,
    dark: new URL("" + new URL("network-error-dark-DyHxJMnZ.svg", import.meta.url).href, import.meta.url).href
  }
};

export const MAX_SCALE = 10;

export function requireJsxRuntime() {
  if (hasRequiredJsxRuntime) return jsxRuntime.exports;
  hasRequiredJsxRuntime = 1;
  {
    jsxRuntime.exports = requireReactJsxRuntime_production();
  }
  return jsxRuntime.exports;
}

export function wheelZoomScale(scale2, event) {
  const unit2 = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 800 : 1;
  const delta = Math.max(-120, Math.min(120, event.deltaY * unit2));
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale2 * Math.exp(-delta * 18e-4)));
}
