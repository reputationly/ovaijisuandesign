// multi-angle-editor.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import { CANVAS_SIZE, ToolResetIcon } from "./plane-quad.jsx";
import {
  CompositedSvg,
  dedupedToast,
  NodeToolbar$1 as NodeToolbar,
  Position,
  reactExports,
  useNodeId,
  useStore$3 as useStore,
  useTranslation,
  X$7 as X,
} from "../vendor.js";
import { CreditCostBadge, Tooltip } from "../generation/missing-asset-card.jsx";
import {
  LeftPanel,
  readableGenerationError,
  SegmentedControl,
} from "./segmented-control.jsx";
import { ToolSlider } from "./tool-slider.jsx";
import {
  useCanvasBridge,
  useCanvasIsBoxSelecting,
  useCanvasIsDragging,
  useCanvasIsMultiSelect,
} from "./package.jsx";
import { BACKEND_VIBE_MULTI_SHOT } from "../generation/to-workspace-browser-url.js";
import { CameraBall } from "./camera-ball.jsx";
import { NODE_POPOVER_SAFE_GAP } from "./use-warn-missing-asset-meta.jsx";
const DarkLoadingIcon = ({ className = "" }) => (
  <CompositedSvg
    aria-hidden="true"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`animate-spin ${className}`}
  >
    <path
      d="M16 10C16 13.3137 13.3137 16 10 16C6.68629 16 4 13.3137 4 10C4 6.68629 6.68629 4 10 4"
      stroke="currentColor"
      strokeWidth="2"
    />
  </CompositedSvg>
);
function StudioPreview({ children: children2 }) {
  return (
    <section className="flex size-full items-center justify-center">
      <div className="flex aspect-square h-full max-w-full items-center justify-center">
        <div
          className="relative"
          style={{
            width: CANVAS_SIZE,
            height: CANVAS_SIZE,
          }}
        >
          {children2}
        </div>
      </div>
    </section>
  );
}
const messages = {
  en: {
    title: "Adjust camera angle",
    preset_section: "Angle presets",
    adjust_section: "Fine-tune",
    adjust_hint: "Drag the camera on the left for a quicker adjustment",
    upload_prefix: "Upload or Choose from ",
    upload_action: "Assets",
    upload_suffix: "",
    reset: "Reset",
    horizontal_angle: "Horizontal Angle",
    vertical_angle: "Vertical Angle",
    zoom: "Zoom",
    zoom_long_shot: "Long Shot",
    zoom_medium_shot: "Medium Shot",
    zoom_close_up: "Close-up",
    preset_eye_level: "Eye Level",
    preset_close_up: "Close-up",
    preset_low_angle: "Low Angle",
    preset_high_angle: "High Angle",
    preset_birds_eye: "Bird's Eye",
    preset_left_side: "Left Side",
    preset_right_side: "Right Side",
    preset_back: "Back View",
    preset_dutch: "Dutch Angle",
    generate: "Generate",
    generating: "Generating...",
    error_asset_missing:
      "The selected asset does not have an available workspace file.",
    error_asset_picker: "Failed to open the asset picker",
    error_generate: "Failed to generate the adjusted angle",
  },
  zh: {
    title: "调整拍摄角度",
    preset_section: "角度预设",
    adjust_section: "精确调整",
    adjust_hint: "也可以直接拖动左侧相机快速调整",
    upload_prefix: "上传或从",
    upload_action: "资产",
    upload_suffix: "选择",
    reset: "重置参数",
    horizontal_angle: "水平角度",
    vertical_angle: "垂直角度",
    zoom: "景别",
    zoom_long_shot: "远景",
    zoom_medium_shot: "中景",
    zoom_close_up: "特写",
    preset_eye_level: "平视镜头",
    preset_close_up: "特写",
    preset_low_angle: "低角度",
    preset_high_angle: "高角度",
    preset_birds_eye: "鸟瞰",
    preset_left_side: "左侧视角",
    preset_right_side: "右侧视角",
    preset_back: "背影",
    preset_dutch: "荷兰角",
    generate: "生成",
    generating: "生成中...",
    error_asset_missing: "所选资源缺少可用的工作区文件",
    error_asset_picker: "打开资源选择面板失败",
    error_generate: "调整角度生成失败",
  },
};
const H_RANGE = {
  min: -180,
  max: 180,
};
const V_RANGE = {
  min: -30,
  max: 60,
};
const ANGLE_STEP = 5;
const PER_IMAGE_CREDIT = 60;
function wrapHAngle(value) {
  return ((value % 360) + 360) % 360;
}
function clampHAngle(value) {
  return Math.max(H_RANGE.min, Math.min(H_RANGE.max, value));
}
function clampVAngle(value) {
  return Math.max(V_RANGE.min, Math.min(V_RANGE.max, value));
}
const formatDegree = (v2) => {
  const rounded = Math.round(v2);
  return `${rounded > 0 ? "+" : ""}${rounded}°`;
};
function MultiAngleCustomPanel({ camera, onUpdateCamera, t: t2 }) {
  const zoomOptions = [
    {
      value: "0",
      label: t2.zoom_long_shot,
    },
    {
      value: "5",
      label: t2.zoom_medium_shot,
    },
    {
      value: "10",
      label: t2.zoom_close_up,
    },
  ];
  const horizontalSliderValue =
    camera.horizontalAngle > 180
      ? camera.horizontalAngle - 360
      : camera.horizontalAngle;
  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-col gap-3">
        <ToolSlider
          className="flex-1"
          dataActionUiId="canvas.multi-angle.horizontal-angle"
          label={t2.horizontal_angle}
          value={horizontalSliderValue}
          min={H_RANGE.min}
          max={H_RANGE.max}
          step={ANGLE_STEP}
          formatValue={formatDegree}
          onChange={(v2) =>
            onUpdateCamera({
              horizontalAngle: v2,
            })
          }
        />
        <ToolSlider
          className="flex-1"
          dataActionUiId="canvas.multi-angle.vertical-angle"
          label={t2.vertical_angle}
          value={camera.verticalAngle}
          min={V_RANGE.min}
          max={V_RANGE.max}
          step={ANGLE_STEP}
          formatValue={formatDegree}
          onChange={(v2) =>
            onUpdateCamera({
              verticalAngle: v2,
            })
          }
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-hl_text_02 text-[13px] font-medium leading-5">
          {t2.zoom}
        </span>
        <SegmentedControl
          options={zoomOptions}
          value={String(camera.zoom)}
          dataActionUiIdPrefix="canvas.multi-angle.zoom"
          onChange={(v2) =>
            onUpdateCamera({
              zoom: Number(v2),
            })
          }
        />
      </div>
    </div>
  );
}
function MultiAngleGenerateBar({
  totalCreditCost,
  isDisabled,
  isSubmitting,
  onSubmit,
  t: t2,
}) {
  const { t: translate2 } = useTranslation();
  const canGenerate = !isDisabled;
  const estimatedCostLabel = translate2("canvas.billing.estimatedCost", {
    cost: totalCreditCost,
    defaultValue: "预计消耗 {{cost}} 积分",
  });
  return (
    <div className="bg-hl_bg_01 flex shrink-0 items-center justify-end px-4 py-2">
      <div className="flex shrink-0 items-center gap-2">
        {!isSubmitting && (
          <Tooltip content={estimatedCostLabel} side="top">
            <span
              className="inline-flex h-8 shrink-0 items-center rounded-md px-2 transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)]"
              data-action-ui-id="popover.credit-cost"
            >
              <CreditCostBadge cost={totalCreditCost} compact={true} />
            </span>
          </Tooltip>
        )}
        <button
          type="button"
          data-run-action={true}
          data-action-ui-id="canvas.multi-angle.generate"
          onClick={onSubmit}
          disabled={isDisabled}
          aria-label={t2.generate}
          title={t2.generate}
          className={`bg-hl_text_00 text-hl_text_05 flex size-8 items-center justify-center rounded-md text-[13px] transition-opacity ${!canGenerate ? "cursor-not-allowed opacity-50" : "hover:opacity-90"}`}
        >
          {isSubmitting ? (
            <DarkLoadingIcon className="size-3" />
          ) : (
            <span aria-hidden="true">↑</span>
          )}
        </button>
      </div>
    </div>
  );
}
const HOVER_ENTER_DELAY = 150;
const OPACITY_TRANSITION_MS = 300;
function CoverSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="bg-hl_bg_05 pointer-events-none absolute inset-0 animate-pulse"
    />
  );
}
function PresetMediaCover({ coverUrl, videoUrl, alt, isActive: isActive2 }) {
  const [isHovering, setIsHovering] = reactExports.useState(false);
  const [loadedCoverUrl, setLoadedCoverUrl] = reactExports.useState(null);
  const videoRef = reactExports.useRef(null);
  const imageRef = reactExports.useRef(null);
  const enterTimerRef = reactExports.useRef(null);
  const hasVideo = !!videoUrl;
  const shouldShowVideo = hasVideo && (isActive2 || isHovering);
  const isCoverLoaded = loadedCoverUrl === coverUrl;
  const clearTimer2 = () => {
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
  };
  reactExports.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (shouldShowVideo) {
      video.play().catch(() => {});
    } else {
      video.pause();
      const timer2 = setTimeout(() => {
        video.currentTime = 0;
      }, 100);
      return () => clearTimeout(timer2);
    }
  }, [shouldShowVideo]);
  reactExports.useEffect(
    () => () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    },
    [],
  );
  reactExports.useEffect(() => {
    const image2 = imageRef.current;
    if (image2?.complete) setLoadedCoverUrl(coverUrl);
  }, [coverUrl]);
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover only controls decorative preview playback inside the parent button
    <div
      role="presentation"
      className="bg-hl_bg_05 relative size-full overflow-hidden"
      onMouseEnter={() => {
        if (!hasVideo) return;
        clearTimer2();
        enterTimerRef.current = setTimeout(() => {
          setIsHovering(true);
          enterTimerRef.current = null;
        }, HOVER_ENTER_DELAY);
      }}
      onMouseLeave={() => {
        if (!hasVideo) return;
        clearTimer2();
        setIsHovering(false);
      }}
    >
      {!isCoverLoaded && <CoverSkeleton />}
      <img
        ref={imageRef}
        src={coverUrl}
        alt={alt}
        className={`absolute inset-0 size-full object-cover transition-opacity duration-200 ${isCoverLoaded ? "opacity-100" : "opacity-0"}`}
        loading="lazy"
        onLoad={() => setLoadedCoverUrl(coverUrl)}
        onError={() => setLoadedCoverUrl(coverUrl)}
      />
      {hasVideo && (
        <video
          ref={videoRef}
          src={videoUrl}
          className="absolute inset-0 size-full object-cover"
          style={{
            opacity: shouldShowVideo ? 1 : 0,
            transition: `opacity ${OPACITY_TRANSITION_MS}ms ease`,
          }}
          muted={true}
          loop={true}
          playsInline={true}
          preload="none"
        />
      )}
    </div>
  );
}
function PresetCardItem({ preset: preset2, label, isSelected, onSelect }) {
  return (
    <button
      type="button"
      className="group flex w-[90px] flex-col items-center gap-1"
      onClick={() => onSelect(preset2)}
      aria-pressed={isSelected}
      data-action-ui-id={`canvas.multi-angle.preset.${preset2.id}`}
    >
      <div
        className={`ring-hl_text_00 relative size-[90px] overflow-hidden rounded-md transition-all duration-200 ${isSelected ? "ring-[1.5px]" : "ring-0"}`}
      >
        <PresetMediaCover
          coverUrl={preset2.thumbUrl}
          videoUrl={preset2.videoUrl}
          alt={label}
          isActive={isSelected}
        />
      </div>
      <span
        className={`w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-[11px] leading-4 ${isSelected ? "text-hl_text_00 font-medium" : "text-hl_text_02 font-normal"}`}
        title={label}
      >
        {label}
      </span>
    </button>
  );
}
function MultiAnglePresetsPanel({
  presets: presets2,
  selectedPresetId,
  onSelect,
  t: t2,
}) {
  return (
    <div className="grid grid-cols-[repeat(3,90px)] gap-x-3 gap-y-2">
      {presets2.map((preset2) => {
        const isSelected = selectedPresetId === preset2.id;
        return (
          <PresetCardItem
            key={preset2.id}
            preset={preset2}
            label={t2[preset2.titleKey]}
            isSelected={isSelected}
            onSelect={onSelect}
          />
        );
      })}
    </div>
  );
}
const CDN_BASE = "https://cdn.hailuoai.com/asset/2026-04-03-17/multiview";
const THUMB_SUFFIX = "?x-oss-process=image/resize,w_540/format,webp";
function preset(id2, asset, titleKey, horizontalAngle, verticalAngle, zoom2) {
  return {
    id: id2,
    titleKey,
    horizontalAngle,
    verticalAngle,
    zoom: zoom2,
    thumbUrl: `${CDN_BASE}/${asset}.png${THUMB_SUFFIX}`,
    videoUrl: `${CDN_BASE}/${asset}.mp4`,
  };
}
const ANGLE_PRESETS = [
  preset("eye-level", "eye_level", "preset_eye_level", 0, 0, 5),
  preset("close-up", "extreme_closeup", "preset_close_up", 0, 0, 10),
  preset("low-angle", "low_angle", "preset_low_angle", 0, -30, 5),
  preset("high-angle", "high_angle", "preset_high_angle", 0, 30, 5),
  preset("birds-eye", "birds_eye", "preset_birds_eye", 0, 60, 0),
  preset("left-side", "left_side", "preset_left_side", 270, 0, 5),
  preset("right-side", "right_side", "preset_right_side", 90, 0, 5),
  preset("back", "back_view", "preset_back", 180, 0, 0),
  preset("dutch", "dutch_angle", "preset_dutch", 45, -30, 0),
];
function buildDefaultCamera() {
  const preset2 = ANGLE_PRESETS[0];
  return {
    horizontalAngle: preset2.horizontalAngle,
    verticalAngle: preset2.verticalAngle,
    zoom: preset2.zoom,
    presetId: preset2.id,
  };
}
function MultiAngleEditor({ nodeId, imageUrl, imagePath, onClose }) {
  const { i18n } = useTranslation();
  const t2 = reactExports.useMemo(
    () => (i18n.resolvedLanguage?.startsWith("zh") ? messages.zh : messages.en),
    [i18n.resolvedLanguage],
  );
  const { pickAsset, submitImg2Image } = useCanvasBridge();
  const [source, setSource] = reactExports.useState({
    url: imageUrl ?? null,
    path: imagePath ?? null,
  });
  const [camera, setCamera] = reactExports.useState(buildDefaultCamera);
  const [isSubmitting, setIsSubmitting] = reactExports.useState(false);
  const submitLockRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    setSource({
      url: imageUrl ?? null,
      path: imagePath ?? null,
    });
  }, [imagePath, imageUrl]);
  const handleUpdateCamera = reactExports.useCallback((updates) => {
    setCamera((previous2) => {
      const next2 = {
        ...previous2,
        ...updates,
        presetId: void 0,
      };
      if (updates.horizontalAngle !== void 0) {
        next2.horizontalAngle = clampHAngle(updates.horizontalAngle);
      }
      next2.verticalAngle = clampVAngle(next2.verticalAngle);
      return next2;
    });
  }, []);
  const handleRotateCamera = reactExports.useCallback(
    (horizontalDelta, verticalDelta) => {
      setCamera((previous2) => ({
        ...previous2,
        horizontalAngle: wrapHAngle(
          previous2.horizontalAngle + horizontalDelta,
        ),
        verticalAngle: clampVAngle(previous2.verticalAngle + verticalDelta),
        presetId: void 0,
      }));
    },
    [],
  );
  const handleSelectPreset = reactExports.useCallback((preset2) => {
    setCamera({
      horizontalAngle: preset2.horizontalAngle,
      verticalAngle: preset2.verticalAngle,
      zoom: preset2.zoom,
      presetId: preset2.id,
    });
  }, []);
  const handleReset = reactExports.useCallback(() => {
    setCamera(buildDefaultCamera());
  }, []);
  const handlePickImage = reactExports.useCallback(async () => {
    if (!pickAsset) return;
    try {
      const resources = await pickAsset({
        type: "image",
      });
      const selected2 = resources?.[0];
      if (!selected2) return;
      if (!selected2.url || !selected2.path) {
        dedupedToast.error(t2.error_asset_missing);
        return;
      }
      setSource({
        url: selected2.url,
        path: selected2.path,
      });
    } catch (error) {
      dedupedToast.error(
        `${t2.error_asset_picker}: ${readableGenerationError(error)}`,
      );
    }
  }, [pickAsset, t2]);
  const isButtonDisabled =
    isSubmitting || !source.url || !source.path || !submitImg2Image;
  const handleSubmit = reactExports.useCallback(async () => {
    const sourcePath = source.path;
    if (!submitImg2Image || !sourcePath || submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      const submission = submitImg2Image(
        nodeId,
        "Multi-Shot",
        "multi-shot",
        {
          horizontal_angle: String(wrapHAngle(camera.horizontalAngle)),
          vertical_angle: String(camera.verticalAngle),
          zoom: String(camera.zoom),
        },
        [sourcePath],
        void 0,
        1,
        void 0,
        false,
        BACKEND_VIBE_MULTI_SHOT,
      );
      onClose();
      const result = await submission;
      if (!result.success && result.error) throw new Error(result.error);
    } catch (error) {
      dedupedToast.error(
        `${t2.error_generate}: ${readableGenerationError(error)}`,
      );
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [camera, nodeId, onClose, source.path, submitImg2Image, t2]);
  return (
    <div className="multi-angle-theme flex h-full min-h-0 flex-col bg-hl_bg_01">
      <header className="shrink-0 px-4 pb-1 pt-3 pr-10">
        <h2 className="text-hl_text_00 text-sm font-semibold leading-5">
          {t2.title}
        </h2>
      </header>
      <div className="min-h-0 flex-1">
        <LeftPanel
          leftContent={
            <div className="flex min-h-full flex-col">
              <div
                className="relative mx-3 mt-2 rounded-xl bg-hl_bg_05 p-3"
                data-action-ui-id="canvas.multi-angle.control-card"
              >
                <button
                  type="button"
                  data-action-ui-id="canvas.multi-angle.reset"
                  className="text-hl_text_03 hover:bg-hl_bg_07 hover:text-hl_text_00 absolute right-2 top-2 z-10 flex h-7 items-center gap-1 rounded-md px-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSubmitting}
                  onClick={handleReset}
                >
                  <ToolResetIcon />
                  <span>{t2.reset}</span>
                </button>
                <div className="h-[212px] shrink-0">
                  <StudioPreview>
                    <CameraBall
                      camera={camera}
                      imageUrl={source.url}
                      disabled={isSubmitting}
                      onRotate={handleRotateCamera}
                      onUpload={handlePickImage}
                      t={t2}
                    />
                  </StudioPreview>
                </div>
                <section className="pt-3">
                  <MultiAngleCustomPanel
                    camera={camera}
                    onUpdateCamera={handleUpdateCamera}
                    t={t2}
                  />
                </section>
              </div>
            </div>
          }
          leftFooter={null}
          rightContent={
            <section className="flex flex-col gap-2 px-4 pb-3 pt-2">
              <h3 className="text-hl_text_01 text-[13px] font-medium">
                {t2.preset_section}
              </h3>
              <MultiAnglePresetsPanel
                presets={ANGLE_PRESETS}
                selectedPresetId={camera.presetId}
                onSelect={handleSelectPreset}
                t={t2}
              />
            </section>
          }
          rightFooter={
            <MultiAngleGenerateBar
              totalCreditCost={PER_IMAGE_CREDIT}
              isDisabled={isButtonDisabled}
              isSubmitting={isSubmitting}
              onSubmit={() => void handleSubmit()}
              t={t2}
            />
          }
        />
      </div>
    </div>
  );
}
const MULTI_ANGLE_POPOVER_WIDTH = 658;
const MULTI_ANGLE_POPOVER_MAX_HEIGHT = 490;
const MULTI_ANGLE_POPOVER_MIN_HEIGHT = 360;
const MULTI_ANGLE_POPOVER_VIEWPORT_MARGIN = 16;
export function MultiAnglePopover({ onClose, imageUrl, imagePath }) {
  const { t: t2 } = useTranslation();
  const nodeId = useNodeId() ?? "";
  const onCloseRef = reactExports.useRef(onClose);
  onCloseRef.current = onClose;
  const selectedSelector = reactExports.useCallback(
    (state2) => (nodeId ? !!state2.nodeLookup.get(nodeId)?.selected : true),
    [nodeId],
  );
  const selected2 = useStore(selectedSelector);
  const sourceScreenBottom = useStore((state2) => {
    const sourceNode = nodeId ? state2.nodeLookup.get(nodeId) : void 0;
    const sourcePosition = sourceNode?.internals.positionAbsolute;
    const sourceHeight = sourceNode?.measured.height ?? sourceNode?.height ?? 0;
    if (!sourcePosition) return 0;
    const [, viewportY, zoom2] = state2.transform;
    return viewportY + (sourcePosition.y + sourceHeight) * zoom2;
  });
  const isDragging = useCanvasIsDragging();
  const isMultiSelect = useCanvasIsMultiSelect();
  const isBoxSelecting = useCanvasIsBoxSelecting();
  reactExports.useEffect(() => {
    if (!selected2) onCloseRef.current();
  }, [selected2]);
  const hidden = isDragging || isMultiSelect || isBoxSelecting;
  const availableHeight =
    window.innerHeight -
    sourceScreenBottom -
    NODE_POPOVER_SAFE_GAP -
    MULTI_ANGLE_POPOVER_VIEWPORT_MARGIN;
  const popoverHeight = Math.max(
    MULTI_ANGLE_POPOVER_MIN_HEIGHT,
    Math.min(MULTI_ANGLE_POPOVER_MAX_HEIGHT, availableHeight),
  );
  return (
    <NodeToolbar
      isVisible={true}
      position={Position.Bottom}
      offset={NODE_POPOVER_SAFE_GAP}
      align="center"
      style={{
        zIndex: 1100,
      }}
    >
      <div
        className="relative flex max-w-[calc(100vw-4rem)] flex-col overflow-hidden rounded-lg bg-background shadow-[var(--canvas-shadow-dropdown)] animate-[i2v-popover-in_0.15s_ease-out]"
        style={{
          width: MULTI_ANGLE_POPOVER_WIDTH,
          height: popoverHeight,
          display: hidden ? "none" : void 0,
        }}
        data-action-ui-id="canvas.multi-angle.popover"
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-md text-[var(--canvas-controls-text-muted)] transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"
          aria-label={t2("common.close", "Close")}
          data-action-ui-id="canvas.multi-angle.close"
        >
          <X size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <MultiAngleEditor
          nodeId={nodeId}
          imageUrl={imageUrl}
          imagePath={imagePath}
          onClose={onClose}
        />
      </div>
    </NodeToolbar>
  );
}
