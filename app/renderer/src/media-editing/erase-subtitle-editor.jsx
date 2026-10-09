// erase-subtitle-editor.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import {
  jsxRuntimeExports,
  PlaybackPauseIcon$1,
  PlaybackPlayIcon$1,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { cn$5 } from "../infra/dialog-content.jsx";
import { Dialog$1 } from "../canvas/separator.jsx";
import { Trash2, useCanvasActive } from "./package.jsx";
import {
  DialogContent$1,
  DialogFooter$1,
  DialogHeader$1,
  DialogTitle$1,
} from "./use-preview-text.jsx";
import { Button$2 } from "../canvas/node-shell-inner.jsx";
import { useSuspendCanvasInteractions } from "../canvas/use-inline-rename.jsx";
import { ProgressBar } from "./progress-bar-inner.jsx";

function normToPxRect(box2, vr) {
  return {
    x: vr.x + box2.tlx * vr.w,
    y: vr.y + box2.tly * vr.h,
    w: (box2.brx - box2.tlx) * vr.w,
    h: (box2.bry - box2.tly) * vr.h,
  };
}

const HANDLE_SIZE = 10;

function handlePositionStyle(handle2) {
  const offset2 = -HANDLE_SIZE / 2;
  switch (handle2) {
    case "tl":
      return {
        left: offset2,
        top: offset2,
      };
    case "tr":
      return {
        right: offset2,
        top: offset2,
      };
    case "bl":
      return {
        left: offset2,
        bottom: offset2,
      };
    case "br":
      return {
        right: offset2,
        bottom: offset2,
      };
    case "t":
      return {
        left: "50%",
        top: offset2,
        transform: "translateX(-50%)",
      };
    case "b":
      return {
        left: "50%",
        bottom: offset2,
        transform: "translateX(-50%)",
      };
    case "l":
      return {
        left: offset2,
        top: "50%",
        transform: "translateY(-50%)",
      };
    case "r":
      return {
        right: offset2,
        top: "50%",
        transform: "translateY(-50%)",
      };
  }
}

function handleCursor(handle2) {
  switch (handle2) {
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

function ResizeHandle({ handle: handle2, onPointerDown: onPointerDown2 }) {
  const style2 = handlePositionStyle(handle2);
  return (
    <div
      onPointerDown={(e2) => onPointerDown2(e2, handle2)}
      className="absolute z-10 rounded-full border-2 border-primary bg-background"
      style={{
        ...style2,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        cursor: handleCursor(handle2),
        touchAction: "none",
      }}
    />
  );
}

const MIN_BOX_SIZE = 0.02;

function clamp$3(v2, lo, hi) {
  if (v2 < lo) return lo;
  if (v2 > hi) return hi;
  return v2;
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
  const r2 = videoWidth / videoHeight;
  const sR = stageWidth / stageHeight;
  if (r2 >= sR) {
    const w22 = stageWidth;
    const h22 = stageWidth / r2;
    return {
      x: 0,
      y: (stageHeight - h22) / 2,
      w: w22,
      h: h22,
    };
  }
  const h2 = stageHeight;
  const w3 = stageHeight * r2;
  return {
    x: (stageWidth - w3) / 2,
    y: 0,
    w: w3,
    h: h2,
  };
}

function pxToNorm(px, py, vr) {
  if (vr.w <= 0 || vr.h <= 0)
    return {
      x: 0,
      y: 0,
    };
  return {
    x: clamp$3((px - vr.x) / vr.w, 0, 1),
    y: clamp$3((py - vr.y) / vr.h, 0, 1),
  };
}

function createBoxFromDrag(anchor, current2) {
  return {
    tlx: Math.min(anchor.x, current2.x),
    tly: Math.min(anchor.y, current2.y),
    brx: Math.max(anchor.x, current2.x),
    bry: Math.max(anchor.y, current2.y),
  };
}

function isBoxBigEnough(box2) {
  return (
    box2.brx - box2.tlx >= MIN_BOX_SIZE && box2.bry - box2.tly >= MIN_BOX_SIZE
  );
}

function moveBox(initial, dxNorm, dyNorm) {
  const w3 = initial.brx - initial.tlx;
  const h2 = initial.bry - initial.tly;
  const tlx = clamp$3(initial.tlx + dxNorm, 0, 1 - w3);
  const tly = clamp$3(initial.tly + dyNorm, 0, 1 - h2);
  return {
    tlx,
    tly,
    brx: tlx + w3,
    bry: tly + h2,
  };
}

function resizeBoxByHandle(initial, handle2, dxNorm, dyNorm) {
  let { tlx, tly, brx, bry } = initial;
  const movesL = handle2 === "tl" || handle2 === "bl" || handle2 === "l";
  const movesR = handle2 === "tr" || handle2 === "br" || handle2 === "r";
  const movesT = handle2 === "tl" || handle2 === "tr" || handle2 === "t";
  const movesB = handle2 === "bl" || handle2 === "br" || handle2 === "b";
  if (movesL)
    tlx = clamp$3(initial.tlx + dxNorm, 0, initial.brx - MIN_BOX_SIZE);
  if (movesR)
    brx = clamp$3(initial.brx + dxNorm, initial.tlx + MIN_BOX_SIZE, 1);
  if (movesT)
    tly = clamp$3(initial.tly + dyNorm, 0, initial.bry - MIN_BOX_SIZE);
  if (movesB)
    bry = clamp$3(initial.bry + dyNorm, initial.tly + MIN_BOX_SIZE, 1);
  return {
    tlx,
    tly,
    brx,
    bry,
  };
}

function toEraseBox(box2) {
  return {
    top_left_x: box2.tlx,
    top_left_y: box2.tly,
    bottom_right_x: box2.brx,
    bottom_right_y: box2.bry,
  };
}

function fromEraseBox(box2) {
  return {
    tlx: box2.top_left_x,
    tly: box2.top_left_y,
    brx: box2.bottom_right_x,
    bry: box2.bottom_right_y,
  };
}

function isValidBox(box2) {
  return (
    box2.tlx >= 0 &&
    box2.tly >= 0 &&
    box2.brx <= 1 &&
    box2.bry <= 1 &&
    box2.brx - box2.tlx >= MIN_BOX_SIZE &&
    box2.bry - box2.tly >= MIN_BOX_SIZE
  );
}

let __idSeq = 0;

function nextRegionId() {
  __idSeq += 1;
  return `region-${Date.now().toString(36)}-${__idSeq}`;
}

function RegionView({
  box: box2,
  videoRect,
  selected: selected2,
  onPointerDown: onPointerDown2,
  onHandlePointerDown,
}) {
  const px = normToPxRect(box2, videoRect);
  return (
    // biome-ignore lint/a11y/useSemanticElements: native <button> swallows pointer + child handle events; this is a generic interactive surface, not a button-style action
    <div
      role="button"
      tabIndex={0}
      onPointerDown={onPointerDown2}
      onKeyDown={(e2) => {
        if (e2.key === "Enter" || e2.key === " ") e2.preventDefault();
      }}
      className={cn$5(
        "absolute box-border cursor-move border-2 transition-colors",
        selected2
          ? "border-primary bg-primary/15 shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
          : "border-white/80 bg-white/5 hover:border-white",
      )}
      style={{
        left: px.x,
        top: px.y,
        width: px.w,
        height: px.h,
        // Disable native drag to avoid Chrome's ghost image when starting a
        // pointer drag on the rectangle.
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {selected2 && (
        <>
          <ResizeHandle handle="tl" onPointerDown={onHandlePointerDown} />
          <ResizeHandle handle="tr" onPointerDown={onHandlePointerDown} />
          <ResizeHandle handle="bl" onPointerDown={onHandlePointerDown} />
          <ResizeHandle handle="br" onPointerDown={onHandlePointerDown} />
          {px.w > 32 && (
            <ResizeHandle handle="t" onPointerDown={onHandlePointerDown} />
          )}
          {px.w > 32 && (
            <ResizeHandle handle="b" onPointerDown={onHandlePointerDown} />
          )}
          {px.h > 32 && (
            <ResizeHandle handle="l" onPointerDown={onHandlePointerDown} />
          )}
          {px.h > 32 && (
            <ResizeHandle handle="r" onPointerDown={onHandlePointerDown} />
          )}
        </>
      )}
    </div>
  );
}

function DraftBoxView({ box: box2, videoRect }) {
  const px = normToPxRect(box2, videoRect);
  return (
    <div
      className="pointer-events-none absolute box-border border-2 border-dashed border-primary bg-primary/10"
      style={{
        left: px.x,
        top: px.y,
        width: px.w,
        height: px.h,
      }}
    />
  );
}

function isValidBoxFromWire(b3) {
  return (
    b3.top_left_x >= 0 &&
    b3.top_left_y >= 0 &&
    b3.bottom_right_x <= 1 &&
    b3.bottom_right_y <= 1 &&
    b3.bottom_right_x - b3.top_left_x >= MIN_BOX_SIZE &&
    b3.bottom_right_y - b3.top_left_y >= MIN_BOX_SIZE
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
    const { t: t2 } = useTranslation();
    useSuspendCanvasInteractions(true);
    const active2 = useCanvasActive();
    const stageRef = reactExports.useRef(null);
    const videoRef = reactExports.useRef(null);
    const [regions, setRegions] = reactExports.useState(() =>
      (initialRegions ?? []).filter(isValidBoxFromWire).map((b3) => ({
        id: nextRegionId(),
        box: fromEraseBox(b3),
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
      const update2 = () => setStageRect(el.getBoundingClientRect());
      update2();
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(update2);
        cancelAnimationFrame(raf2);
        update2();
      });
      const ro = new ResizeObserver(update2);
      ro.observe(el);
      return () => {
        cancelAnimationFrame(raf1);
        ro.disconnect();
      };
    }, []);
    const handleLoadedMetadata = reactExports.useCallback(() => {
      const v2 = videoRef.current;
      if (!v2) return;
      setVideoMeta({
        w: v2.videoWidth,
        h: v2.videoHeight,
      });
    }, []);
    reactExports.useEffect(() => {
      const v2 = videoRef.current;
      if (!v2) return;
      if (v2.readyState >= 1 && v2.videoWidth > 0 && v2.videoHeight > 0) {
        setVideoMeta({
          w: v2.videoWidth,
          h: v2.videoHeight,
        });
      }
      const onLoadedData = () => {
        if (v2.videoWidth > 0 && v2.videoHeight > 0) {
          setVideoMeta({
            w: v2.videoWidth,
            h: v2.videoHeight,
          });
        }
      };
      v2.addEventListener("loadeddata", onLoadedData);
      return () => v2.removeEventListener("loadeddata", onLoadedData);
    }, []);
    const togglePlay = reactExports.useCallback(() => {
      const v2 = videoRef.current;
      if (!v2) return;
      if (v2.paused) void v2.play();
      else v2.pause();
    }, []);
    reactExports.useEffect(() => {
      const v2 = videoRef.current;
      if (!v2) return;
      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);
      v2.addEventListener("play", onPlay);
      v2.addEventListener("pause", onPause);
      return () => {
        v2.removeEventListener("play", onPlay);
        v2.removeEventListener("pause", onPause);
      };
    }, []);
    const stageLocal = reactExports.useCallback((e2) => {
      const r2 = stageRef.current?.getBoundingClientRect();
      if (!r2)
        return {
          x: 0,
          y: 0,
        };
      return {
        x: e2.clientX - r2.left,
        y: e2.clientY - r2.top,
      };
    }, []);
    const handleStagePointerDown = reactExports.useCallback((e2) => {
      if (e2.button !== 0) return;
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
        x: e2.clientX - liveStageRect.left,
        y: e2.clientY - liveStageRect.top,
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
      stageRef.current?.setPointerCapture(e2.pointerId);
    }, []);
    const handleStagePointerMove = reactExports.useCallback(
      (e2) => {
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
          x: e2.clientX - liveStageRect.left,
          y: e2.clientY - liveStageRect.top,
        };
        if (interaction.kind === "creating") {
          const cur = pxToNorm(local.x, local.y, liveVideoRect);
          setDraftBox(createBoxFromDrag(interaction.anchor, cur));
          return;
        }
        if (interaction.kind === "moving") {
          const dx =
            (local.x - interaction.pointerStart.x) / (liveVideoRect.w || 1);
          const dy =
            (local.y - interaction.pointerStart.y) / (liveVideoRect.h || 1);
          const moved = moveBox(interaction.initial, dx, dy);
          setRegions((rs2) =>
            rs2.map((r2) =>
              r2.id === interaction.boxId
                ? {
                    id: r2.id,
                    box: moved,
                  }
                : r2,
            ),
          );
          return;
        }
        if (interaction.kind === "resizing") {
          const dx =
            (local.x - interaction.pointerStart.x) / (liveVideoRect.w || 1);
          const dy =
            (local.y - interaction.pointerStart.y) / (liveVideoRect.h || 1);
          const resized = resizeBoxByHandle(
            interaction.initial,
            interaction.handle,
            dx,
            dy,
          );
          setRegions((rs2) =>
            rs2.map((r2) =>
              r2.id === interaction.boxId
                ? {
                    id: r2.id,
                    box: resized,
                  }
                : r2,
            ),
          );
        }
      },
      [interaction],
    );
    const handleStagePointerUp = reactExports.useCallback(
      (e2) => {
        if (interaction.kind === "creating" && draftBox) {
          if (isBoxBigEnough(draftBox)) {
            const id2 = nextRegionId();
            setRegions((rs2) => [
              ...rs2,
              {
                id: id2,
                box: draftBox,
              },
            ]);
            setSelectedId(id2);
          }
          setDraftBox(null);
        }
        setInteraction({
          kind: "idle",
        });
        try {
          stageRef.current?.releasePointerCapture(e2.pointerId);
        } catch {}
      },
      [interaction, draftBox],
    );
    const handleBoxPointerDown = reactExports.useCallback(
      (e2, regionId) => {
        if (e2.button !== 0) return;
        e2.stopPropagation();
        const region = regions.find((r2) => r2.id === regionId);
        if (!region) return;
        setSelectedId(regionId);
        const start2 = stageLocal(e2);
        setInteraction({
          kind: "moving",
          boxId: regionId,
          initial: region.box,
          pointerStart: start2,
        });
        stageRef.current?.setPointerCapture(e2.pointerId);
      },
      [regions, stageLocal],
    );
    const handleResizeHandlePointerDown = reactExports.useCallback(
      (e2, regionId, handle2) => {
        if (e2.button !== 0) return;
        e2.stopPropagation();
        const region = regions.find((r2) => r2.id === regionId);
        if (!region) return;
        setSelectedId(regionId);
        const start2 = stageLocal(e2);
        setInteraction({
          kind: "resizing",
          boxId: regionId,
          handle: handle2,
          initial: region.box,
          pointerStart: start2,
        });
        stageRef.current?.setPointerCapture(e2.pointerId);
      },
      [regions, stageLocal],
    );
    reactExports.useEffect(() => {
      if (!selectedId || !active2) return;
      const onKey = (e2) => {
        if (e2.key === "Delete" || e2.key === "Backspace") {
          e2.preventDefault();
          e2.stopPropagation();
          setRegions((rs2) => rs2.filter((r2) => r2.id !== selectedId));
          setSelectedId(null);
        } else if (e2.key === "Escape") {
          e2.preventDefault();
          e2.stopPropagation();
          setSelectedId(null);
        }
      };
      window.addEventListener("keydown", onKey, true);
      return () => window.removeEventListener("keydown", onKey, true);
    }, [selectedId, active2]);
    const validRegions = reactExports.useMemo(
      () => regions.filter((r2) => isValidBox(r2.box)),
      [regions],
    );
    const canSubmit = validRegions.length > 0;
    const handleConfirm = reactExports.useCallback(() => {
      if (!canSubmit) return;
      onConfirm(validRegions.map((r2) => toEraseBox(r2.box)));
    }, [canSubmit, validRegions, onConfirm]);
    const handleClearAll = reactExports.useCallback(() => {
      setRegions([]);
      setSelectedId(null);
    }, []);
    const showDraftBox =
      interaction.kind === "creating" && draftBox && isBoxBigEnough(draftBox);
    return (
      <Dialog$1
        open={true}
        onOpenChange={(o2) => {
          if (!o2) onCancel();
        }}
      >
        <DialogContent$1
          className={cn$5(
            "grid h-[80vh] gap-0 overflow-hidden p-0",
            "sm:!max-w-[min(1280px,90vw)]",
            "grid-rows-[auto_minmax(0,1fr)_auto]",
          )}
        >
          <DialogHeader$1 className="gap-1 border-b border-border/40 px-5 py-3 pr-12">
            <DialogTitle$1 className="text-sm font-medium">
              {t2("canvas.eraseSubtitle.editor.title", "框选要消除的文字区域")}
              {videoName && (
                <span className="ml-2 truncate text-xs font-normal text-muted-foreground">
                  {"— "}
                  {videoName}
                </span>
              )}
            </DialogTitle$1>
            <span className="text-xs text-muted-foreground">
              {t2(
                "canvas.eraseSubtitle.editor.hint",
                "在视频上拖拽创建框；选中后可拖动 / 缩放，按 Delete 删除",
              )}
            </span>
          </DialogHeader$1>
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
                regions.map((r2) => (
                  <RegionView
                    key={r2.id}
                    box={r2.box}
                    videoRect={videoRect}
                    selected={r2.id === selectedId}
                    onPointerDown={(e2) => handleBoxPointerDown(e2, r2.id)}
                    onHandlePointerDown={(e2, handle2) =>
                      handleResizeHandlePointerDown(e2, r2.id, handle2)
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
                    ? t2("canvas.video.pause", "Pause")
                    : t2("canvas.video.play", "Play")
                }
                data-action-ui-id="canvas.erase-subtitle.editor.play-pause"
                onPointerDown={(e2) => e2.stopPropagation()}
              >
                {isPlaying ? (
                  <PlaybackPauseIcon$1 size={16} className="drop-shadow-sm" />
                ) : (
                  <PlaybackPlayIcon$1 size={16} className="drop-shadow-sm" />
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
          <DialogFooter$1 className="flex-row items-center justify-between gap-3 border-t border-border/40 px-5 py-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {t2(
                  "canvas.eraseSubtitle.editor.boxCount",
                  "已选 {{count}} 个框",
                  {
                    count: regions.length,
                  },
                )}
              </span>
              {regions.length > 0 && (
                <Button$2
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  data-action-ui-id="canvas.erase-subtitle.editor.clear-all"
                >
                  <Trash2 className="size-3.5" />
                  <span className="ml-1">
                    {t2("canvas.eraseSubtitle.editor.clearAll", "清空")}
                  </span>
                </Button$2>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button$2
                variant="ghost"
                size="sm"
                onClick={onCancel}
                data-action-ui-id="canvas.erase-subtitle.editor.cancel"
              >
                {t2("canvas.eraseSubtitle.editor.cancel", "取消")}
              </Button$2>
              <Button$2
                variant="default"
                size="sm"
                disabled={!canSubmit}
                onClick={handleConfirm}
                data-action-ui-id="canvas.erase-subtitle.editor.submit"
              >
                {t2("canvas.eraseSubtitle.editor.submit", "开始消除")}
              </Button$2>
            </div>
          </DialogFooter$1>
        </DialogContent$1>
      </Dialog$1>
    );
  },
);
