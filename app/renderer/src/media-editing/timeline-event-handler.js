// timeline-event-handler.js
import {
  DEFAULT_CROP_CONFIG,
  TIMELINE_CONFIG,
} from "../generation/time-intervals.jsx";

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
  updateCropConfig(config) {
    this.cropConfig = config;
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
  clampScrollX(scrollX, scale, totalDuration) {
    const viewportWidth = this.getCanvasRect().width;
    const contentWidth = totalDuration * scale;
    const innerWidth = Math.max(
      0,
      viewportWidth - TIMELINE_CONFIG.TRACK_PADDING_H * 2,
    );
    const maxScroll = Math.max(0, contentWidth - innerWidth);
    return Math.max(0, Math.min(scrollX, maxScroll));
  }
  onKeyDown(keyboardEvent) {
    const target = keyboardEvent.target;
    const tagName = target?.tagName?.toLowerCase();
    if (tagName === "input" || tagName === "textarea" || target?.isContentEditable)
      return;
    if (keyboardEvent.key === "Escape" && this.getState().cropRange) {
      keyboardEvent.preventDefault();
      this.callbacks.onStateChange({
        cropRange: null,
      });
      this.callbacks.onRequestRender();
    }
  }
  onMouseDown(mouseEvent) {
    this.cachedRect = this.getCanvasRect();
    const rect = this.cachedRect;
    const pointerX = mouseEvent.clientX - rect.left;
    const pointerY = mouseEvent.clientY - rect.top;
    const state = this.getState();
    this.dragStartX = pointerX;
    this.dragStartScrollX = state.scrollX;
    if (pointerY < this.rulerHeight) {
      if (this.getState().clips.length === 0) return;
      this.isDragging = true;
      this.dragType = "playhead";
      this.updatePlayheadPosition(pointerX);
      this.canvas.style.cursor = "col-resize";
      document.addEventListener("mousemove", this.boundMouseMove);
      document.addEventListener("mouseup", this.boundMouseUp);
      return;
    }
    const cropHit = this.hitTestCropHandle(pointerX, pointerY);
    if (cropHit) {
      this.isDragging = true;
      this.dragType = cropHit;
      const cropRange = state.cropRange ?? {
        start: 0,
        end: 0,
      };
      this.cropDragStartStart = cropRange.start;
      this.cropDragStartEnd = cropRange.end;
      if (cropHit === "crop-body") {
        const time =
          (pointerX - TIMELINE_CONFIG.TRACK_PADDING_H + state.scrollX) /
          state.scale;
        this.cropBodyGrabOffset = time - cropRange.start;
      }
      this.canvas.style.cursor = cropHit === "crop-body" ? "grab" : "ew-resize";
      this.callbacks.onUserInteraction?.();
      document.addEventListener("mousemove", this.boundMouseMove);
      document.addEventListener("mouseup", this.boundMouseUp);
      return;
    }
    const clickedTime =
      (pointerX - TIMELINE_CONFIG.TRACK_PADDING_H + state.scrollX) / state.scale;
    const clickedSegment = state.segmentRanges.find(
      (range) => clickedTime > range.start && clickedTime < range.end,
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
      this.updatePlayheadPosition(pointerX);
      this.canvas.style.cursor = "col-resize";
    } else {
      this.dragType = "scroll";
      this.canvas.style.cursor = "grabbing";
    }
    document.addEventListener("mousemove", this.boundMouseMove);
    document.addEventListener("mouseup", this.boundMouseUp);
  }
  onMouseMove(mouseEvent) {
    const rect =
      this.isDragging && this.cachedRect
        ? this.cachedRect
        : this.getCanvasRect();
    const pointerX = mouseEvent.clientX - rect.left;
    const pointerY = mouseEvent.clientY - rect.top;
    if (this.isDragging) {
      this.handleDrag(pointerX, pointerY);
      return;
    }
    this.updateHoverState(pointerX, pointerY);
  }
  handleDrag(pointerX, _y) {
    const { scale, scrollX, totalDuration } = this.getState();
    const { minDuration, maxDuration } = this.cropConfig;
    switch (this.dragType) {
      case "playhead":
        this.updatePlayheadPosition(pointerX);
        break;
      case "crop-left": {
        const time = (pointerX - TIMELINE_CONFIG.TRACK_PADDING_H + scrollX) / scale;
        const end = this.cropDragStartEnd;
        const minStart = Math.max(0, end - maxDuration);
        const maxStart = end - minDuration;
        const clamped = Math.max(minStart, Math.min(time, maxStart));
        this.callbacks.onStateChange({
          cropRange: {
            start: clamped,
            end,
          },
        });
        this.callbacks.onRequestRender();
        break;
      }
      case "crop-right": {
        const time = (pointerX - TIMELINE_CONFIG.TRACK_PADDING_H + scrollX) / scale;
        const start = this.cropDragStartStart;
        const minEnd = start + minDuration;
        const maxEnd = Math.min(totalDuration, start + maxDuration);
        const clamped = Math.max(minEnd, Math.min(time, maxEnd));
        this.callbacks.onStateChange({
          cropRange: {
            start,
            end: clamped,
          },
        });
        this.callbacks.onRequestRender();
        break;
      }
      case "crop-body": {
        const time = (pointerX - TIMELINE_CONFIG.TRACK_PADDING_H + scrollX) / scale;
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
        const deltaX = this.dragStartX - pointerX;
        const newScrollX = this.clampScrollX(
          this.dragStartScrollX + deltaX,
          scale,
          totalDuration,
        );
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
  onWheel(wheelEvent) {
    wheelEvent.preventDefault();
    const { scale, scrollX, totalDuration } = this.getState();
    const {
      MIN_SCALE,
      MAX_SCALE,
      ZOOM_FACTOR,
    } = TIMELINE_CONFIG;
    if (wheelEvent.ctrlKey || wheelEvent.metaKey) {
      const rect = this.getCanvasRect();
      const mouseX = wheelEvent.clientX - rect.left;
      const delta = wheelEvent.deltaY > 0 ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
      const newScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, scale * delta),
      );
      const mouseTime =
        (mouseX - TIMELINE_CONFIG.TRACK_PADDING_H + scrollX) / scale;
      const clampedScrollX = this.clampScrollX(
        mouseTime * newScale - (mouseX - TIMELINE_CONFIG.TRACK_PADDING_H),
        newScale,
        totalDuration,
      );
      this.callbacks.onStateChange({
        scale: newScale,
        scrollX: clampedScrollX,
      });
      this.callbacks.onUserInteraction?.();
      this.callbacks.onRequestRender();
      return;
    }
    if (wheelEvent.deltaX !== 0) {
      const clampedScrollX = this.clampScrollX(
        scrollX + wheelEvent.deltaX,
        scale,
        totalDuration,
      );
      this.callbacks.onStateChange({
        scrollX: clampedScrollX,
      });
      this.callbacks.onUserInteraction?.();
      this.callbacks.onRequestRender();
      return;
    }
    const newScrollX = this.clampScrollX(
      scrollX + wheelEvent.deltaY,
      scale,
      totalDuration,
    );
    this.callbacks.onStateChange({
      scrollX: newScrollX,
    });
    this.callbacks.onUserInteraction?.();
    this.callbacks.onRequestRender();
  }
  updateHoverState(pointerX, pointerY) {
    if (pointerY < this.rulerHeight) {
      this.canvas.style.cursor =
        this.getState().clips.length > 0 ? "col-resize" : "default";
      return;
    }
    const cropHit = this.hitTestCropHandle(pointerX, pointerY);
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
  updatePlayheadPosition(pointerX) {
    const { scale, scrollX, totalDuration } = this.getState();
    const time = (pointerX - TIMELINE_CONFIG.TRACK_PADDING_H + scrollX) / scale;
    const clampedTime = Math.max(0, Math.min(time, totalDuration));
    this.callbacks.onStateChange({
      currentTime: clampedTime,
    });
    this.callbacks.onPlayheadSeek?.(clampedTime);
    this.callbacks.onRequestRender();
  }
  hitTestCropHandle(pointerX, pointerY) {
    const state = this.getState();
    const { cropRange } = state;
    if (!cropRange) return null;
    const {
      CLIP_PADDING,
      CROP_HANDLE_WIDTH,
      CROP_HANDLE_OUTSET,
      TRACK_PADDING_H,
    } = TIMELINE_CONFIG;
    const { scale, scrollX } = state;
    const trackY = this.rulerHeight + this.trackGap + CLIP_PADDING;
    const trackH = this.thumbnailHeight - CLIP_PADDING * 2;
    if (pointerY < trackY || pointerY > trackY + trackH) return null;
    const canvasWidth = this.getCanvasRect().width;
    const contentLeft = Math.max(0, TRACK_PADDING_H - CROP_HANDLE_OUTSET);
    const contentRight = Math.min(
      canvasWidth,
      canvasWidth - TRACK_PADDING_H + CROP_HANDLE_OUTSET,
    );
    if (pointerX < contentLeft || pointerX > contentRight) return null;
    const cropLeftX = Math.max(
      0,
      cropRange.start * scale - scrollX + TRACK_PADDING_H - CROP_HANDLE_OUTSET,
    );
    const cropRightX = Math.min(
      canvasWidth,
      cropRange.end * scale - scrollX + TRACK_PADDING_H + CROP_HANDLE_OUTSET,
    );
    const HIT_EXTEND = 2;
    if (
      pointerX >= cropLeftX - HIT_EXTEND &&
      pointerX <= cropLeftX + CROP_HANDLE_WIDTH + HIT_EXTEND
    ) {
      return "crop-left";
    }
    if (
      pointerX >= cropRightX - CROP_HANDLE_WIDTH - HIT_EXTEND &&
      pointerX <= cropRightX + HIT_EXTEND
    ) {
      return "crop-right";
    }
    if (
      pointerX > cropLeftX + CROP_HANDLE_WIDTH &&
      pointerX < cropRightX - CROP_HANDLE_WIDTH
    ) {
      return "crop-body";
    }
    return null;
  }
  destroy() {
    this.unbindEvents();
  }
}
