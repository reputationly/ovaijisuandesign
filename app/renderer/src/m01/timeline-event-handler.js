// timeline-event-handler.js
import { DEFAULT_CROP_CONFIG, TIMELINE_CONFIG } from "./params-popup.jsx";
const DURATION_TIERS = [
  {
    maxDuration: 15,
    sampleInterval: 0.5,
    widthMultiplier: 1,
  },
  {
    maxDuration: 60,
    sampleInterval: 1,
    widthMultiplier: 1,
  },
  {
    maxDuration: 180,
    sampleInterval: 2,
    widthMultiplier: 1,
  },
  {
    maxDuration: 600,
    sampleInterval: 5,
    widthMultiplier: 2,
  },
  {
    maxDuration: Infinity,
    sampleInterval: 10,
    widthMultiplier: 4,
  },
];
export function getDurationTier(totalDuration) {
  return (
    DURATION_TIERS.find((tier) => totalDuration <= tier.maxDuration) ??
    DURATION_TIERS[DURATION_TIERS.length - 1]
  );
}
export function calcInitialScale(totalDuration, containerWidth) {
  const tier = getDurationTier(totalDuration);
  const { TRACK_PADDING_H, MIN_SCALE: MIN_SCALE2, MAX_SCALE: MAX_SCALE2 } = TIMELINE_CONFIG;
  const availableWidth = containerWidth - TRACK_PADDING_H * 2;
  const scale2 = (availableWidth * tier.widthMultiplier) / totalDuration;
  return Math.max(MIN_SCALE2, Math.min(MAX_SCALE2, scale2));
}
export class TimelineEventHandler {
  canvas;
  callbacks;
  cropConfig = DEFAULT_CROP_CONFIG;
  getState;
  /** 刻度尺高度（px） */
  rulerHeight = TIMELINE_CONFIG.RULER_HEIGHT;
  /** 刻度尺与轨道间距（px） */
  trackGap = 0;
  /** 缩略图轨道高度（px） */
  thumbnailHeight = TIMELINE_CONFIG.VIDEO_TRACK_HEIGHT;
  isDragging = false;
  dragType = null;
  dragStartX = 0;
  dragStartScrollX = 0;
  cropDragStartStart = 0;
  cropDragStartEnd = 0;
  cropBodyGrabOffset = 0;
  /** 拖拽过程中冻结的矩形快照，防止拖拽期间 canvas 位移导致坐标漂移 */
  cachedRect = null;
  /** 通用矩形缓存，由 ResizeObserver 失效，避免 mousemove 每次触发 layout */
  rectCache = null;
  resizeObserver = null;
  /** 抽帧等场景：禁用"按下空白区拖动滚动时间轴"，改为点击直接 seek。 */
  disableScrollDrag = false;
  boundMouseDown;
  boundMouseMove;
  boundMouseUp;
  boundWheel;
  boundMouseLeave;
  boundKeyDown;
  boundInvalidateRect;
  constructor(canvas, callbacks, getState, options) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.getState = getState;
    this.disableScrollDrag = options?.disableScrollDrag ?? false;
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundWheel = this.onWheel.bind(this);
    this.boundMouseLeave = this.onMouseLeave.bind(this);
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundInvalidateRect = () => {
      this.rectCache = null;
    };
    this.bindEvents();
  }
  updateCropConfig(config2) {
    this.cropConfig = config2;
  }
  /** 同步 Canvas 布局尺寸，resize 后需调用 */
  updateLayout(layout) {
    this.rulerHeight = layout.rulerHeight;
    this.trackGap = layout.trackGap;
    this.thumbnailHeight = layout.thumbnailHeight;
  }
  bindEvents() {
    this.canvas.addEventListener("mousedown", this.boundMouseDown);
    this.canvas.addEventListener("mousemove", this.boundMouseMove);
    this.canvas.addEventListener("mouseup", this.boundMouseUp);
    this.canvas.addEventListener("wheel", this.boundWheel, {
      passive: false,
    });
    this.canvas.addEventListener("mouseleave", this.boundMouseLeave);
    document.addEventListener("keydown", this.boundKeyDown);
    this.resizeObserver = new ResizeObserver(() => {
      this.rectCache = null;
      this.cachedRect = null;
    });
    this.resizeObserver.observe(this.canvas);
    window.addEventListener("resize", this.boundInvalidateRect);
  }
  unbindEvents() {
    this.canvas.removeEventListener("mousedown", this.boundMouseDown);
    this.canvas.removeEventListener("mousemove", this.boundMouseMove);
    this.canvas.removeEventListener("mouseup", this.boundMouseUp);
    this.canvas.removeEventListener("wheel", this.boundWheel);
    this.canvas.removeEventListener("mouseleave", this.boundMouseLeave);
    document.removeEventListener("mouseup", this.boundMouseUp);
    document.removeEventListener("mousemove", this.boundMouseMove);
    document.removeEventListener("keydown", this.boundKeyDown);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener("resize", this.boundInvalidateRect);
  }
  /**
   * 获取 canvas 的 DOMRect，优先复用缓存以避免强制 layout。
   * 缓存由 ResizeObserver 在 canvas 尺寸/位置变化时自动失效。
   */
  getCanvasRect() {
    if (!this.rectCache) {
      this.rectCache = this.canvas.getBoundingClientRect();
    }
    return this.rectCache;
  }
  /**
   * 把 scrollX clamp 到 [0, max] 区间。
   * max = totalDuration * scale - viewportInnerWidth；当内容比视口短时 max=0
   * （即时间线根本不需要滚动，禁止任何正向滚动到空白区）。
   */
  clampScrollX(scrollX, scale2, totalDuration) {
    const viewportWidth = this.getCanvasRect().width;
    const contentWidth = totalDuration * scale2;
    const innerWidth = Math.max(0, viewportWidth - TIMELINE_CONFIG.TRACK_PADDING_H * 2);
    const maxScroll = Math.max(0, contentWidth - innerWidth);
    return Math.max(0, Math.min(scrollX, maxScroll));
  }
  onKeyDown(e2) {
    const target = e2.target;
    const tag = target?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;
    if (e2.key === "Escape" && this.getState().cropRange) {
      e2.preventDefault();
      this.callbacks.onStateChange({
        cropRange: null,
      });
      this.callbacks.onRequestRender();
    }
  }
  onMouseDown(e2) {
    this.cachedRect = this.getCanvasRect();
    const rect = this.cachedRect;
    const x2 = e2.clientX - rect.left;
    const y4 = e2.clientY - rect.top;
    const state2 = this.getState();
    this.dragStartX = x2;
    this.dragStartScrollX = state2.scrollX;
    if (y4 < this.rulerHeight) {
      if (this.getState().clips.length === 0) return;
      this.isDragging = true;
      this.dragType = "playhead";
      this.updatePlayheadPosition(x2);
      this.canvas.style.cursor = "col-resize";
      document.addEventListener("mousemove", this.boundMouseMove);
      document.addEventListener("mouseup", this.boundMouseUp);
      return;
    }
    const cropHit = this.hitTestCropHandle(x2, y4);
    if (cropHit) {
      this.isDragging = true;
      this.dragType = cropHit;
      const cr2 = state2.cropRange ?? {
        start: 0,
        end: 0,
      };
      this.cropDragStartStart = cr2.start;
      this.cropDragStartEnd = cr2.end;
      if (cropHit === "crop-body") {
        const time = (x2 - TIMELINE_CONFIG.TRACK_PADDING_H + state2.scrollX) / state2.scale;
        this.cropBodyGrabOffset = time - cr2.start;
      }
      this.canvas.style.cursor = cropHit === "crop-body" ? "grab" : "ew-resize";
      this.callbacks.onUserInteraction?.();
      document.addEventListener("mousemove", this.boundMouseMove);
      document.addEventListener("mouseup", this.boundMouseUp);
      return;
    }
    const clickedTime = (x2 - TIMELINE_CONFIG.TRACK_PADDING_H + state2.scrollX) / state2.scale;
    const clickedSegment = state2.segmentRanges.find(
      (range2) => clickedTime > range2.start && clickedTime < range2.end,
    );
    if (clickedSegment) {
      this.callbacks.onStateChange({
        cropRange: {
          ...clickedSegment,
        },
      });
      this.callbacks.onPlayheadSeek?.(clickedTime);
      this.callbacks.onRequestRender();
      return;
    }
    this.isDragging = true;
    if (this.disableScrollDrag) {
      this.dragType = "playhead";
      this.updatePlayheadPosition(x2);
      this.canvas.style.cursor = "col-resize";
    } else {
      this.dragType = "scroll";
      this.canvas.style.cursor = "grabbing";
    }
    document.addEventListener("mousemove", this.boundMouseMove);
    document.addEventListener("mouseup", this.boundMouseUp);
  }
  onMouseMove(e2) {
    const rect = this.isDragging && this.cachedRect ? this.cachedRect : this.getCanvasRect();
    const x2 = e2.clientX - rect.left;
    const y4 = e2.clientY - rect.top;
    if (this.isDragging) {
      this.handleDrag(x2, y4);
      return;
    }
    this.updateHoverState(x2, y4);
  }
  handleDrag(x2, _y) {
    const { scale: scale2, scrollX, totalDuration } = this.getState();
    const { minDuration, maxDuration } = this.cropConfig;
    switch (this.dragType) {
      case "playhead":
        this.updatePlayheadPosition(x2);
        break;
      case "crop-left": {
        const time = (x2 - TIMELINE_CONFIG.TRACK_PADDING_H + scrollX) / scale2;
        const end2 = this.cropDragStartEnd;
        const minStart = Math.max(0, end2 - maxDuration);
        const maxStart = end2 - minDuration;
        const clamped = Math.max(minStart, Math.min(time, maxStart));
        this.callbacks.onStateChange({
          cropRange: {
            start: clamped,
            end: end2,
          },
        });
        this.callbacks.onRequestRender();
        break;
      }
      case "crop-right": {
        const time = (x2 - TIMELINE_CONFIG.TRACK_PADDING_H + scrollX) / scale2;
        const start2 = this.cropDragStartStart;
        const minEnd = start2 + minDuration;
        const maxEnd = Math.min(totalDuration, start2 + maxDuration);
        const clamped = Math.max(minEnd, Math.min(time, maxEnd));
        this.callbacks.onStateChange({
          cropRange: {
            start: start2,
            end: clamped,
          },
        });
        this.callbacks.onRequestRender();
        break;
      }
      case "crop-body": {
        const time = (x2 - TIMELINE_CONFIG.TRACK_PADDING_H + scrollX) / scale2;
        const duration = this.cropDragStartEnd - this.cropDragStartStart;
        let newStart = time - this.cropBodyGrabOffset;
        newStart = Math.max(0, Math.min(newStart, totalDuration - duration));
        this.callbacks.onStateChange({
          cropRange: {
            start: newStart,
            end: newStart + duration,
          },
        });
        this.callbacks.onRequestRender();
        break;
      }
      case "scroll": {
        const deltaX = this.dragStartX - x2;
        const newScrollX = this.clampScrollX(this.dragStartScrollX + deltaX, scale2, totalDuration);
        this.callbacks.onStateChange({
          scrollX: newScrollX,
        });
        this.callbacks.onUserInteraction?.();
        this.callbacks.onRequestRender();
        break;
      }
    }
  }
  onMouseUp() {
    if (this.isDragging) {
      const finishedDragType = this.dragType;
      this.isDragging = false;
      this.dragType = null;
      this.cachedRect = null;
      this.canvas.style.cursor = "default";
      document.removeEventListener("mousemove", this.boundMouseMove);
      document.removeEventListener("mouseup", this.boundMouseUp);
      if (
        finishedDragType === "crop-left" ||
        finishedDragType === "crop-right" ||
        finishedDragType === "crop-body"
      ) {
        this.callbacks.onCropDragEnd?.(finishedDragType);
      }
      this.callbacks.onRequestRender();
    }
  }
  onMouseLeave() {
    if (!this.isDragging) {
      this.canvas.style.cursor = "default";
    }
  }
  onWheel(e2) {
    e2.preventDefault();
    const { scale: scale2, scrollX, totalDuration } = this.getState();
    const { MIN_SCALE: MIN_SCALE2, MAX_SCALE: MAX_SCALE2, ZOOM_FACTOR } = TIMELINE_CONFIG;
    if (e2.ctrlKey || e2.metaKey) {
      const rect = this.getCanvasRect();
      const mouseX = e2.clientX - rect.left;
      const delta = e2.deltaY > 0 ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
      const newScale = Math.min(MAX_SCALE2, Math.max(MIN_SCALE2, scale2 * delta));
      const mouseTime = (mouseX - TIMELINE_CONFIG.TRACK_PADDING_H + scrollX) / scale2;
      const newScrollX2 = this.clampScrollX(
        mouseTime * newScale - (mouseX - TIMELINE_CONFIG.TRACK_PADDING_H),
        newScale,
        totalDuration,
      );
      this.callbacks.onStateChange({
        scale: newScale,
        scrollX: newScrollX2,
      });
      this.callbacks.onUserInteraction?.();
      this.callbacks.onRequestRender();
      return;
    }
    if (e2.deltaX !== 0) {
      const newScrollX2 = this.clampScrollX(scrollX + e2.deltaX, scale2, totalDuration);
      this.callbacks.onStateChange({
        scrollX: newScrollX2,
      });
      this.callbacks.onUserInteraction?.();
      this.callbacks.onRequestRender();
      return;
    }
    const newScrollX = this.clampScrollX(scrollX + e2.deltaY, scale2, totalDuration);
    this.callbacks.onStateChange({
      scrollX: newScrollX,
    });
    this.callbacks.onUserInteraction?.();
    this.callbacks.onRequestRender();
  }
  updateHoverState(x2, y4) {
    if (y4 < this.rulerHeight) {
      this.canvas.style.cursor = this.getState().clips.length > 0 ? "col-resize" : "default";
      return;
    }
    const cropHit = this.hitTestCropHandle(x2, y4);
    if (cropHit === "crop-left" || cropHit === "crop-right") {
      this.canvas.style.cursor = "ew-resize";
      return;
    }
    if (cropHit === "crop-body") {
      this.canvas.style.cursor = "grab";
      return;
    }
    this.canvas.style.cursor = "default";
  }
  updatePlayheadPosition(x2) {
    const { scale: scale2, scrollX, totalDuration } = this.getState();
    const time = (x2 - TIMELINE_CONFIG.TRACK_PADDING_H + scrollX) / scale2;
    const clampedTime = Math.max(0, Math.min(time, totalDuration));
    this.callbacks.onStateChange({
      currentTime: clampedTime,
    });
    this.callbacks.onPlayheadSeek?.(clampedTime);
    this.callbacks.onRequestRender();
  }
  hitTestCropHandle(x2, y4) {
    const state2 = this.getState();
    const { cropRange } = state2;
    if (!cropRange) return null;
    const { CLIP_PADDING, CROP_HANDLE_WIDTH, CROP_HANDLE_OUTSET, TRACK_PADDING_H } =
      TIMELINE_CONFIG;
    const { scale: scale2, scrollX } = state2;
    const trackY = this.rulerHeight + this.trackGap + CLIP_PADDING;
    const trackH = this.thumbnailHeight - CLIP_PADDING * 2;
    if (y4 < trackY || y4 > trackY + trackH) return null;
    const canvasWidth = this.getCanvasRect().width;
    const contentLeft = Math.max(0, TRACK_PADDING_H - CROP_HANDLE_OUTSET);
    const contentRight = Math.min(canvasWidth, canvasWidth - TRACK_PADDING_H + CROP_HANDLE_OUTSET);
    if (x2 < contentLeft || x2 > contentRight) return null;
    const cropLeftX = Math.max(
      0,
      cropRange.start * scale2 - scrollX + TRACK_PADDING_H - CROP_HANDLE_OUTSET,
    );
    const cropRightX = Math.min(
      canvasWidth,
      cropRange.end * scale2 - scrollX + TRACK_PADDING_H + CROP_HANDLE_OUTSET,
    );
    const HIT_EXTEND = 2;
    if (x2 >= cropLeftX - HIT_EXTEND && x2 <= cropLeftX + CROP_HANDLE_WIDTH + HIT_EXTEND) {
      return "crop-left";
    }
    if (x2 >= cropRightX - CROP_HANDLE_WIDTH - HIT_EXTEND && x2 <= cropRightX + HIT_EXTEND) {
      return "crop-right";
    }
    if (x2 > cropLeftX + CROP_HANDLE_WIDTH && x2 < cropRightX - CROP_HANDLE_WIDTH) {
      return "crop-body";
    }
    return null;
  }
  destroy() {
    this.unbindEvents();
  }
}
