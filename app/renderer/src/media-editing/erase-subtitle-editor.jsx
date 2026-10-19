// erase-subtitle-editor.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { PlaybackPauseIcon$1 as PlaybackPauseIcon, PlaybackPlayIcon$1 as PlaybackPlayIcon } from "./playback-icons.js";
import { cn as classNames } from "../infra/dialog-content.jsx";
import { Dialog } from "../canvas/separator.jsx";
import { Trash2, useCanvasActive } from "./package.jsx";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./use-preview-text.jsx";
import { Button } from "../canvas/node-shell-inner.jsx";
import { useSuspendCanvasInteractions } from "../canvas/use-inline-rename.jsx";
import { ProgressBar } from "./progress-bar-inner.jsx";
function normToPxRect(box, videoRect) {
  return {
    x: videoRect.x + box.tlx * videoRect.w,
    y: videoRect.y + box.tly * videoRect.h,
    w: (box.brx - box.tlx) * videoRect.w,
    h: (box.bry - box.tly) * videoRect.h,
  };
}
const HANDLE_SIZE = 10;
function handlePositionStyle(handle) {
  const offset = -HANDLE_SIZE / 2;
  switch (handle) {
    case "tl":
      return {
        left: offset,
        top: offset,
      };
    case "tr":
      return {
        right: offset,
        top: offset,
      };
    case "bl":
      return {
        left: offset,
        bottom: offset,
      };
    case "br":
      return {
        right: offset,
        bottom: offset,
      };
    case "t":
      return {
        left: "50%",
        top: offset,
        transform: "translateX(-50%)",
      };
    case "b":
      return {
        left: "50%",
        bottom: offset,
        transform: "translateX(-50%)",
      };
    case "l":
      return {
        left: offset,
        top: "50%",
        transform: "translateY(-50%)",
      };
    case "r":
      return {
        right: offset,
        top: "50%",
        transform: "translateY(-50%)",
      };
  }
}
function handleCursor(handle) {
  switch (handle) {
    case "tl":
    case "br":
      return "nwse-resize";
    case "tr":
    case "bl":
      return "nesw-resize";
    case "t":
    case "b":
      return "ns-resize";
    case "l":
    case "r":
      return "ew-resize";
  }
}
function ResizeHandle({ handle, onPointerDown }) {
  const style = handlePositionStyle(handle);
  return (
    <div
      onPointerDown={(pointerEvent) => onPointerDown(pointerEvent, handle)}
      className="absolute z-10 rounded-full border-2 border-primary bg-background"
      style={{
        ...style,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        cursor: handleCursor(handle),
        touchAction: "none",
      }}
    />
  );
}
const MIN_BOX_SIZE = 0.02;
function clamp(value, minimum, maximum) {
  if (value < minimum) return minimum;
  if (value > maximum) return maximum;
  return value;
}
function getVideoLetterboxRect(
  videoWidth,
  videoHeight,
  stageWidth,
  stageHeight,
) {
  if (
    !Number.isFinite(videoWidth) ||
    !Number.isFinite(videoHeight) ||
    videoWidth <= 0 ||
    videoHeight <= 0 ||
    stageWidth <= 0 ||
    stageHeight <= 0
  ) {
    return {
      x: 0,
      y: 0,
      w: stageWidth,
      h: stageHeight,
    };
  }
  const videoAspectRatio = videoWidth / videoHeight;
  const stageAspectRatio = stageWidth / stageHeight;
  if (videoAspectRatio >= stageAspectRatio) {
    const displayWidth = stageWidth;
    const displayHeight = stageWidth / videoAspectRatio;
    return {
      x: 0,
      y: (stageHeight - displayHeight) / 2,
      w: displayWidth,
      h: displayHeight,
    };
  }
  const displayHeight = stageHeight;
  const displayWidth = stageHeight * videoAspectRatio;
  return {
    x: (stageWidth - displayWidth) / 2,
    y: 0,
    w: displayWidth,
    h: displayHeight,
  };
}
function pxToNorm(pixelX, pixelY, videoRect) {
  if (videoRect.w <= 0 || videoRect.h <= 0)
    return {
      x: 0,
      y: 0,
    };
  return {
    x: clamp((pixelX - videoRect.x) / videoRect.w, 0, 1),
    y: clamp((pixelY - videoRect.y) / videoRect.h, 0, 1),
  };
}
function createBoxFromDrag(anchor, current) {
  return {
    tlx: Math.min(anchor.x, current.x),
    tly: Math.min(anchor.y, current.y),
    brx: Math.max(anchor.x, current.x),
    bry: Math.max(anchor.y, current.y),
  };
}
function isBoxBigEnough(box) {
  return (
    box.brx - box.tlx >= MIN_BOX_SIZE && box.bry - box.tly >= MIN_BOX_SIZE
  );
}
function moveBox(initial, dxNorm, dyNorm) {
  const boxWidth = initial.brx - initial.tlx;
  const boxHeight = initial.bry - initial.tly;
  const topLeftX = clamp(initial.tlx + dxNorm, 0, 1 - boxWidth);
  const topLeftY = clamp(initial.tly + dyNorm, 0, 1 - boxHeight);
  return {
    tlx: topLeftX,
    tly: topLeftY,
    brx: topLeftX + boxWidth,
    bry: topLeftY + boxHeight,
  };
}
function resizeBoxByHandle(initial, handle, dxNorm, dyNorm) {
  let { tlx: topLeftX, tly: topLeftY, brx: bottomRightX, bry: bottomRightY } = initial;
  const movesL = handle === "tl" || handle === "bl" || handle === "l";
  const movesR = handle === "tr" || handle === "br" || handle === "r";
  const movesT = handle === "tl" || handle === "tr" || handle === "t";
  const movesB = handle === "bl" || handle === "br" || handle === "b";
  if (movesL) topLeftX = clamp(initial.tlx + dxNorm, 0, initial.brx - MIN_BOX_SIZE);
  if (movesR) bottomRightX = clamp(initial.brx + dxNorm, initial.tlx + MIN_BOX_SIZE, 1);
  if (movesT) topLeftY = clamp(initial.tly + dyNorm, 0, initial.bry - MIN_BOX_SIZE);
  if (movesB) bottomRightY = clamp(initial.bry + dyNorm, initial.tly + MIN_BOX_SIZE, 1);
  return {
    tlx: topLeftX,
    tly: topLeftY,
    brx: bottomRightX,
    bry: bottomRightY,
  };
}
function toEraseBox(box) {
  return {
    top_left_x: box.tlx,
    top_left_y: box.tly,
    bottom_right_x: box.brx,
    bottom_right_y: box.bry,
  };
}
function fromEraseBox(box) {
  return {
    tlx: box.top_left_x,
    tly: box.top_left_y,
    brx: box.bottom_right_x,
    bry: box.bottom_right_y,
  };
}
function isValidBox(box) {
  return (
    box.tlx >= 0 &&
    box.tly >= 0 &&
    box.brx <= 1 &&
    box.bry <= 1 &&
    box.brx - box.tlx >= MIN_BOX_SIZE &&
    box.bry - box.tly >= MIN_BOX_SIZE
  );
}
let __idSeq = 0;
function nextRegionId() {
  __idSeq += 1;
  return `region-${Date.now().toString(36)}-${__idSeq}`;
}
function RegionView({
  box,
  videoRect,
  selected,
  onPointerDown,
  onHandlePointerDown,
}) {
  const pixelRect = normToPxRect(box, videoRect);
  return (
    // biome-ignore lint/a11y/useSemanticElements: native <button> swallows pointer + child handle events; this is a generic interactive surface, not a button-style action
    <div
      role="button"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={(keyboardEvent) => {
        if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") keyboardEvent.preventDefault();
      }}
      className={classNames(
        "absolute box-border cursor-move border-2 transition-colors",
        selected
          ? "border-primary bg-primary/15 ring-1 ring-background/40"
          : "border-foreground/80 bg-background/10 hover:border-foreground",
      )}
      style={{
        left: pixelRect.x,
        top: pixelRect.y,
        width: pixelRect.w,
        height: pixelRect.h,
        // Disable native drag to avoid Chrome's ghost image when starting a
        // pointer drag on the rectangle.
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {selected && (
        <>
          <ResizeHandle handle="tl" onPointerDown={onHandlePointerDown} />
          <ResizeHandle handle="tr" onPointerDown={onHandlePointerDown} />
          <ResizeHandle handle="bl" onPointerDown={onHandlePointerDown} />
          <ResizeHandle handle="br" onPointerDown={onHandlePointerDown} />
          {pixelRect.w > 32 && (
            <ResizeHandle handle="t" onPointerDown={onHandlePointerDown} />
          )}
          {pixelRect.w > 32 && (
            <ResizeHandle handle="b" onPointerDown={onHandlePointerDown} />
          )}
          {pixelRect.h > 32 && (
            <ResizeHandle handle="l" onPointerDown={onHandlePointerDown} />
          )}
          {pixelRect.h > 32 && (
            <ResizeHandle handle="r" onPointerDown={onHandlePointerDown} />
          )}
        </>
      )}
    </div>
  );
}
function DraftBoxView({ box, videoRect }) {
  const pixelRect = normToPxRect(box, videoRect);
  return (
    <div
      className="pointer-events-none absolute box-border border-2 border-dashed border-primary bg-primary/10"
      style={{
        left: pixelRect.x,
        top: pixelRect.y,
        width: pixelRect.w,
        height: pixelRect.h,
      }}
    />
  );
}
function isValidBoxFromWire(wireBox) {
  return (
    wireBox.top_left_x >= 0 &&
    wireBox.top_left_y >= 0 &&
    wireBox.bottom_right_x <= 1 &&
    wireBox.bottom_right_y <= 1 &&
    wireBox.bottom_right_x - wireBox.top_left_x >= MIN_BOX_SIZE &&
    wireBox.bottom_right_y - wireBox.top_left_y >= MIN_BOX_SIZE
  );
}
export const EraseSubtitleEditor = reactExports.memo(
  function EraseSubtitleEditorImpl({
    videoSrc,
    videoName,
    initialRegions,
    onCancel,
    onConfirm,
  }) {
    const { t } = useTranslation();
    useSuspendCanvasInteractions(true);
    const active = useCanvasActive();
    const stageRef = reactExports.useRef(null);
    const videoRef = reactExports.useRef(null);
    const [regions, setRegions] = reactExports.useState(() =>
      (initialRegions ?? []).filter(isValidBoxFromWire).map((wireBox) => ({
        id: nextRegionId(),
        box: fromEraseBox(wireBox),
      })),
    );
    const [selectedId, setSelectedId] = reactExports.useState(null);
    const [interaction, setInteraction] = reactExports.useState({
      kind: "idle",
    });
    const [draftBox, setDraftBox] = reactExports.useState(null);
    const [isPlaying, setIsPlaying] = reactExports.useState(false);
    const [stageRect, setStageRect] = reactExports.useState(null);
    const [videoMeta, setVideoMeta] = reactExports.useState({
      w: 0,
      h: 0,
    });
    const videoRect = reactExports.useMemo(() => {
      if (!stageRect)
        return {
          x: 0,
          y: 0,
          w: 0,
          h: 0,
        };
      return getVideoLetterboxRect(
        videoMeta.w,
        videoMeta.h,
        stageRect.width,
        stageRect.height,
      );
    }, [stageRect, videoMeta]);
    reactExports.useEffect(() => {
      const el = stageRef.current;
      if (!el) return;
      const update = () => setStageRect(el.getBoundingClientRect());
      update();
      const initialFrameId = requestAnimationFrame(() => {
        const followUpFrameId = requestAnimationFrame(update);
        cancelAnimationFrame(followUpFrameId);
        update();
      });
      const resizeObserver = new ResizeObserver(update);
      resizeObserver.observe(el);
      return () => {
        cancelAnimationFrame(initialFrameId);
        resizeObserver.disconnect();
      };
    }, []);
    const handleLoadedMetadata = reactExports.useCallback(() => {
      const videoElement = videoRef.current;
      if (!videoElement) return;
      setVideoMeta({
        w: videoElement.videoWidth,
        h: videoElement.videoHeight,
      });
    }, []);
    reactExports.useEffect(() => {
      const videoElement = videoRef.current;
      if (!videoElement) return;
      if (videoElement.readyState >= 1 && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
        setVideoMeta({
          w: videoElement.videoWidth,
          h: videoElement.videoHeight,
        });
      }
      const onLoadedData = () => {
        if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
          setVideoMeta({
            w: videoElement.videoWidth,
            h: videoElement.videoHeight,
          });
        }
      };
      videoElement.addEventListener("loadeddata", onLoadedData);
      return () => videoElement.removeEventListener("loadeddata", onLoadedData);
    }, []);
    const togglePlay = reactExports.useCallback(() => {
      const videoElement = videoRef.current;
      if (!videoElement) return;
      if (videoElement.paused) void videoElement.play();
      else videoElement.pause();
    }, []);
    reactExports.useEffect(() => {
      const videoElement = videoRef.current;
      if (!videoElement) return;
      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);
      videoElement.addEventListener("play", onPlay);
      videoElement.addEventListener("pause", onPause);
      return () => {
        videoElement.removeEventListener("play", onPlay);
        videoElement.removeEventListener("pause", onPause);
      };
    }, []);
    const stageLocal = reactExports.useCallback((pointerEvent) => {
      const stageBounds = stageRef.current?.getBoundingClientRect();
      if (!stageBounds)
        return {
          x: 0,
          y: 0,
        };
      return {
        x: pointerEvent.clientX - stageBounds.left,
        y: pointerEvent.clientY - stageBounds.top,
      };
    }, []);
    const handleStagePointerDown = reactExports.useCallback((pointerEvent) => {
      if (pointerEvent.button !== 0) return;
      const stage = stageRef.current;
      const video = videoRef.current;
      if (!stage) return;
      const liveStageRect = stage.getBoundingClientRect();
      if (liveStageRect.width <= 0 || liveStageRect.height <= 0) return;
      const liveVideoRect = getVideoLetterboxRect(
        video?.videoWidth ?? 0,
        video?.videoHeight ?? 0,
        liveStageRect.width,
        liveStageRect.height,
      );
      setStageRect(liveStageRect);
      const local = {
        x: pointerEvent.clientX - liveStageRect.left,
        y: pointerEvent.clientY - liveStageRect.top,
      };
      if (
        local.x < liveVideoRect.x ||
        local.x > liveVideoRect.x + liveVideoRect.w ||
        local.y < liveVideoRect.y ||
        local.y > liveVideoRect.y + liveVideoRect.h
      ) {
        setSelectedId(null);
        return;
      }
      const norm = pxToNorm(local.x, local.y, liveVideoRect);
      setSelectedId(null);
      setInteraction({
        kind: "creating",
        anchor: norm,
      });
      setDraftBox({
        tlx: norm.x,
        tly: norm.y,
        brx: norm.x,
        bry: norm.y,
      });
      stageRef.current?.setPointerCapture(pointerEvent.pointerId);
    }, []);
    const handleStagePointerMove = reactExports.useCallback(
      (pointerEvent) => {
        if (interaction.kind === "idle") return;
        const stage = stageRef.current;
        const video = videoRef.current;
        if (!stage) return;
        const liveStageRect = stage.getBoundingClientRect();
        if (liveStageRect.width <= 0 || liveStageRect.height <= 0) return;
        const liveVideoRect = getVideoLetterboxRect(
          video?.videoWidth ?? 0,
          video?.videoHeight ?? 0,
          liveStageRect.width,
          liveStageRect.height,
        );
        const local = {
          x: pointerEvent.clientX - liveStageRect.left,
          y: pointerEvent.clientY - liveStageRect.top,
        };
        if (interaction.kind === "creating") {
          const currentPosition = pxToNorm(local.x, local.y, liveVideoRect);
          setDraftBox(createBoxFromDrag(interaction.anchor, currentPosition));
          return;
        }
        if (interaction.kind === "moving") {
          const normalizedDeltaX =
            (local.x - interaction.pointerStart.x) / (liveVideoRect.w || 1);
          const normalizedDeltaY =
            (local.y - interaction.pointerStart.y) / (liveVideoRect.h || 1);
          const moved = moveBox(interaction.initial, normalizedDeltaX, normalizedDeltaY);
          setRegions((previousRegions) =>
            previousRegions.map((region) =>
              region.id === interaction.boxId
                ? {
                    id: region.id,
                    box: moved,
                  }
                : region,
            ),
          );
          return;
        }
        if (interaction.kind === "resizing") {
          const normalizedDeltaX =
            (local.x - interaction.pointerStart.x) / (liveVideoRect.w || 1);
          const normalizedDeltaY =
            (local.y - interaction.pointerStart.y) / (liveVideoRect.h || 1);
          const resized = resizeBoxByHandle(
            interaction.initial,
            interaction.handle,
            normalizedDeltaX,
            normalizedDeltaY,
          );
          setRegions((previousRegions) =>
            previousRegions.map((region) =>
              region.id === interaction.boxId
                ? {
                    id: region.id,
                    box: resized,
                  }
                : region,
            ),
          );
        }
      },
      [interaction],
    );
    const handleStagePointerUp = reactExports.useCallback(
      (pointerEvent) => {
        if (interaction.kind === "creating" && draftBox) {
          if (isBoxBigEnough(draftBox)) {
            const regionId = nextRegionId();
            setRegions((previousRegions) => [
              ...previousRegions,
              {
                id: regionId,
                box: draftBox,
              },
            ]);
            setSelectedId(regionId);
          }
          setDraftBox(null);
        }
        setInteraction({
          kind: "idle",
        });
        try {
          stageRef.current?.releasePointerCapture(pointerEvent.pointerId);
        } catch {}
      },
      [interaction, draftBox],
    );
    const handleBoxPointerDown = reactExports.useCallback(
      (pointerEvent, regionId) => {
        if (pointerEvent.button !== 0) return;
        pointerEvent.stopPropagation();
        const region = regions.find((region) => region.id === regionId);
        if (!region) return;
        setSelectedId(regionId);
        const start = stageLocal(pointerEvent);
        setInteraction({
          kind: "moving",
          boxId: regionId,
          initial: region.box,
          pointerStart: start,
        });
        stageRef.current?.setPointerCapture(pointerEvent.pointerId);
      },
      [regions, stageLocal],
    );
    const handleResizeHandlePointerDown = reactExports.useCallback(
      (pointerEvent, regionId, handle) => {
        if (pointerEvent.button !== 0) return;
        pointerEvent.stopPropagation();
        const region = regions.find((region) => region.id === regionId);
        if (!region) return;
        setSelectedId(regionId);
        const start = stageLocal(pointerEvent);
        setInteraction({
          kind: "resizing",
          boxId: regionId,
          handle,
          initial: region.box,
          pointerStart: start,
        });
        stageRef.current?.setPointerCapture(pointerEvent.pointerId);
      },
      [regions, stageLocal],
    );
    reactExports.useEffect(() => {
      if (!selectedId || !active) return;
      const onKey = (keyboardEvent) => {
        if (keyboardEvent.key === "Delete" || keyboardEvent.key === "Backspace") {
          keyboardEvent.preventDefault();
          keyboardEvent.stopPropagation();
          setRegions((previousRegions) => previousRegions.filter((region) => region.id !== selectedId));
          setSelectedId(null);
        } else if (keyboardEvent.key === "Escape") {
          keyboardEvent.preventDefault();
          keyboardEvent.stopPropagation();
          setSelectedId(null);
        }
      };
      window.addEventListener("keydown", onKey, true);
      return () => window.removeEventListener("keydown", onKey, true);
    }, [selectedId, active]);
    const validRegions = reactExports.useMemo(
      () => regions.filter((region) => isValidBox(region.box)),
      [regions],
    );
    const canSubmit = validRegions.length > 0;
    const handleConfirm = reactExports.useCallback(() => {
      if (!canSubmit) return;
      onConfirm(validRegions.map((region) => toEraseBox(region.box)));
    }, [canSubmit, validRegions, onConfirm]);
    const handleClearAll = reactExports.useCallback(() => {
      setRegions([]);
      setSelectedId(null);
    }, []);
    const showDraftBox =
      interaction.kind === "creating" && draftBox && isBoxBigEnough(draftBox);
    return (
      <Dialog
        open={true}
        onOpenChange={(isOpen) => {
          if (!isOpen) onCancel();
        }}
      >
        <DialogContent
          className={classNames(
            "grid h-[80vh] gap-0 overflow-hidden p-0",
            "sm:!max-w-[min(1280px,90vw)]",
            "grid-rows-[auto_minmax(0,1fr)_auto]",
          )}
        >
          <DialogHeader className="gap-1 border-b border-border/40 px-5 py-3 pr-12">
            <DialogTitle className="text-sm font-medium">
              {t("canvas.eraseSubtitle.editor.title", "框选要消除的文字区域")}
              {videoName && (
                <span className="ml-2 truncate text-xs font-normal text-muted-foreground">
                  {"— "}
                  {videoName}
                </span>
              )}
            </DialogTitle>
            <span className="text-xs text-muted-foreground">
              {t(
                "canvas.eraseSubtitle.editor.hint",
                "在视频上拖拽创建框；选中后可拖动 / 缩放，按 Delete 删除",
              )}
            </span>
          </DialogHeader>
          <div className="relative flex min-h-0 flex-col bg-black">
            <div
              ref={stageRef}
              className="relative flex min-h-0 flex-1 select-none items-center justify-center overflow-hidden"
              onPointerDown={handleStagePointerDown}
              onPointerMove={handleStagePointerMove}
              onPointerUp={handleStagePointerUp}
              onPointerCancel={handleStagePointerUp}
              style={{
                touchAction: "none",
                // crosshair signals "drag here to draw a box" while idle.
                // Region body / handles override locally to move/resize cursors.
                cursor: "crosshair",
              }}
            >
              <video
                ref={videoRef}
                src={videoSrc}
                className="pointer-events-none block h-full w-full object-contain"
                playsInline={true}
                onLoadedMetadata={handleLoadedMetadata}
              />
              {videoRect.w > 0 &&
                regions.map((region) => (
                  <RegionView
                    key={region.id}
                    box={region.box}
                    videoRect={videoRect}
                    selected={region.id === selectedId}
                    onPointerDown={(pointerEvent) => handleBoxPointerDown(pointerEvent, region.id)}
                    onHandlePointerDown={(pointerEvent, handle) =>
                      handleResizeHandlePointerDown(pointerEvent, region.id, handle)
                    }
                  />
                ))}
              {showDraftBox && draftBox && videoRect.w > 0 && (
                <DraftBoxView box={draftBox} videoRect={videoRect} />
              )}
              <button
                type="button"
                onClick={togglePlay}
                className="pointer-events-auto absolute left-3 top-3 z-20 flex items-center justify-center size-8 rounded-full bg-transparent p-0 text-[var(--canvas-media-control-fg)] opacity-0 transition-opacity duration-200 hover:opacity-100 group-hover:opacity-100"
                aria-label={
                  isPlaying
                    ? t("canvas.video.pause", "Pause")
                    : t("canvas.video.play", "Play")
                }
                data-action-ui-id="canvas.erase-subtitle.editor.play-pause"
                onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
              >
                {isPlaying ? (
                  <PlaybackPauseIcon size={16} className="drop-shadow-sm" />
                ) : (
                  <PlaybackPlayIcon size={16} className="drop-shadow-sm" />
                )}
              </button>
            </div>
            <div className="border-t border-border/40 px-5 py-2">
              <ProgressBar
                videoRef={videoRef}
                isPlaying={isPlaying}
                tone="light"
              />
            </div>
          </div>
          <DialogFooter className="flex-row items-center justify-between gap-3 border-t border-border/40 px-5 py-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {t(
                  "canvas.eraseSubtitle.editor.boxCount",
                  "已选 {{count}} 个框",
                  {
                    count: regions.length,
                  },
                )}
              </span>
              {regions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  data-action-ui-id="canvas.erase-subtitle.editor.clear-all"
                >
                  <Trash2 className="size-3.5" />
                  <span className="ml-1">
                    {t("canvas.eraseSubtitle.editor.clearAll", "清空")}
                  </span>
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                data-action-ui-id="canvas.erase-subtitle.editor.cancel"
              >
                {t("canvas.eraseSubtitle.editor.cancel", "取消")}
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={!canSubmit}
                onClick={handleConfirm}
                data-action-ui-id="canvas.erase-subtitle.editor.submit"
              >
                {t("canvas.eraseSubtitle.editor.submit", "开始消除")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
);
