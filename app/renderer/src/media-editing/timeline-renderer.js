// timeline-renderer.js
import {
  LIGHT_THEME_COLORS,
  TIME_INTERVALS,
  TIMELINE_CONFIG,
} from "../generation/time-intervals.jsx";

function formatTimeShort(seconds) {
  if (seconds < 60) {
    if (Number.isInteger(seconds)) {
      return `${seconds}s`;
    }
    return `${seconds.toFixed(1)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) {
    return `${mins}m`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export class TimelineRenderer {
  canvas;
  ctx;
  dpr;
  width = 0;
  height = 0;
  needsRender = false;
  destroyed = false;
  rafId = null;
  colors;
  /** 刻度尺高度（px） */
  rulerHeight = TIMELINE_CONFIG.RULER_HEIGHT;
  /** 刻度尺与缩略图轨道之间的间距（px） */
  trackGap = 0;
  /** 获取渲染区域宽度（px） */
  getWidth() {
    return this.width;
  }
  rulerLayer = null;
  rulerCtx = null;
  rulerCacheKey = "";
  getState;
  thumbnailStore;
  waveformService;
  hooks;
  constructor(canvas, getState, thumbnailStore, waveformService, options) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法获取 Canvas 2D 上下文");
    this.ctx = context;
    this.dpr = window.devicePixelRatio || 1;
    this.getState = getState;
    this.thumbnailStore = thumbnailStore;
    this.waveformService = waveformService ?? null;
    this.hooks = options?.hooks ?? {};
    this.colors = options?.colors ?? LIGHT_THEME_COLORS;
  }
  /** 动态更新颜色方案（主题切换时调用），更新后自动触发重绘 */
  setColors(colors) {
    this.colors = colors;
    this.rulerCacheKey = "";
    this.markNeedsRender();
  }
  markNeedsRender() {
    this.needsRender = true;
    if (this.rafId === null && !this.destroyed) {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        if (this.destroyed) return;
        if (this.needsRender) {
          this.render(this.getState());
        }
      });
    }
  }
  resize(width, layout) {
    this.rulerHeight = layout.rulerHeight;
    this.trackGap = layout.trackGap;
    const height =
      layout.rulerHeight + layout.trackGap + layout.thumbnailHeight;
    this.width = width;
    this.height = height;
    const newCanvasW = width * this.dpr;
    const newCanvasH = height * this.dpr;
    if (this.canvas.width !== newCanvasW || this.canvas.height !== newCanvasH) {
      this.canvas.width = newCanvasW;
      this.canvas.height = newCanvasH;
    }
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.rulerLayer = new OffscreenCanvas(
      newCanvasW,
      layout.rulerHeight * this.dpr,
    );
    this.rulerCtx = this.rulerLayer.getContext("2d");
    this.rulerCacheKey = "";
  }
  render(state) {
    this.needsRender = false;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.clear();
    this.drawBackground();
    this.drawRulerCached(state);
    this.drawTrack(state);
    this.drawCropOverlay(state);
    this.drawPlayhead(state);
  }
  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
  drawBackground() {
    if (this.hooks.drawBackground) {
      this.hooks.drawBackground(this.ctx, this.width, this.height);
      return;
    }
    this.ctx.fillStyle = this.colors.BACKGROUND;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
  drawRulerCached(state) {
    if (!this.rulerLayer || !this.rulerCtx) return;
    const cacheKey = `${state.scale}:${state.scrollX}:${state.totalDuration}:${this.width}`;
    if (this.rulerCacheKey !== cacheKey) {
      this.drawRulerToLayer(state);
      this.rulerCacheKey = cacheKey;
    }
    this.ctx.drawImage(this.rulerLayer, 0, 0, this.width, this.rulerHeight);
  }
  drawRulerToLayer(state) {
    const context = this.rulerCtx;
    if (!context) return;
    const rulerH = this.rulerHeight;
    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    context.clearRect(0, 0, this.width, rulerH);
    const { RULER_LINE, RULER_TEXT } = this.colors;
    const { TRACK_PADDING_H } = TIMELINE_CONFIG;
    const { scale, scrollX } = state;
    const contentLeft = TRACK_PADDING_H;
    const contentRight = this.width - TRACK_PADDING_H;
    const { interval, subDivisions } =
      this.calculateInterval(scale);
    const startTime = Math.floor(scrollX / scale / interval) * interval;
    const endTime =
      Math.ceil((scrollX + this.width) / scale / interval) * interval;
    const centerY = rulerH / 2;
    context.font = "11px Inter, sans-serif";
    context.textBaseline = "middle";
    context.save();
    context.beginPath();
    context.rect(contentLeft, 0, contentRight - contentLeft, rulerH);
    context.clip();
    for (let time = startTime; time <= endTime; time += interval) {
      const tickX = time * scale - scrollX + TRACK_PADDING_H;
      if (tickX >= contentLeft - 8 && tickX <= contentRight + 8) {
        context.fillStyle = RULER_TEXT;
        const label = formatTimeShort(time);
        if (tickX < contentLeft + 4) {
          context.textAlign = "left";
          context.fillText(label, contentLeft, centerY);
        } else if (tickX > contentRight - 4) {
          context.textAlign = "right";
          context.fillText(label, contentRight, centerY);
        } else {
          context.textAlign = "center";
          context.fillText(label, tickX, centerY);
        }
      }
    }
    context.fillStyle = RULER_LINE;
    context.beginPath();
    for (let time = startTime; time <= endTime; time += interval) {
      const tickX = time * scale - scrollX + TRACK_PADDING_H;
      const lastSubX =
        tickX + (interval / subDivisions) * (subDivisions - 1) * scale;
      if (tickX > contentRight || lastSubX < contentLeft) continue;
      for (let subdivisionIndex = 1; subdivisionIndex < subDivisions; subdivisionIndex++) {
        const subX = tickX + (interval / subDivisions) * subdivisionIndex * scale;
        if (subX > contentRight) break;
        if (subX < contentLeft) continue;
        context.moveTo(subX + 0.5, centerY);
        context.ellipse(subX, centerY, 0.5, 1, 0, 0, Math.PI * 2);
      }
    }
    context.fill();
    context.restore();
  }
  drawTrack(state) {
    const trackY = this.rulerHeight + this.trackGap;
    const trackHeight = this.height - trackY;
    const { TRACK_PADDING_H } = TIMELINE_CONFIG;
    const context = this.ctx;
    context.save();
    context.beginPath();
    context.rect(
      TRACK_PADDING_H,
      trackY,
      this.width - TRACK_PADDING_H * 2,
      trackHeight,
    );
    context.clip();
    this.drawClips(state, trackY);
    context.restore();
  }
  drawClips(state, trackY) {
    const { CLIP_BORDER_RADIUS, CLIP_PADDING, TRACK_PADDING_H } =
      TIMELINE_CONFIG;
    const trackHeight = this.height - this.rulerHeight - this.trackGap;
    const { scale, scrollX, clips } = state;
    const contentRight = this.width - TRACK_PADDING_H;
    clips.forEach((clip) => {
      const clipX = clip.startTime * scale - scrollX + TRACK_PADDING_H;
      const sourceX =
        (clip.startTime - clip.sourceOffset) * scale -
        scrollX +
        TRACK_PADDING_H;
      const clipWidth = clip.duration * scale;
      const clipY = trackY + CLIP_PADDING;
      const clipHeight = trackHeight - CLIP_PADDING * 2;
      if (clipX + clipWidth < TRACK_PADDING_H || clipX > contentRight) return;
      const visibleX = Math.max(clipX, TRACK_PADDING_H);
      const visibleWidth = Math.min(clipX + clipWidth, contentRight) - visibleX;
      if (visibleWidth <= 0) return;
      const rect = {
        x: clipX,
        y: clipY,
        width: clipWidth,
        height: clipHeight,
        sourceX,
      };
      this.ctx.save();
      this.drawRoundRect(clipX, clipY, clipWidth, clipHeight, CLIP_BORDER_RADIUS);
      this.ctx.fillStyle = this.colors.VIDEO_CLIP;
      this.ctx.fill();
      const handled = this.hooks.drawClipContent?.(this.ctx, clip, rect);
      if (!handled) {
        if (clip.type === "audio") {
          this.drawAudioWaveform(clip, clipX, clipY, clipWidth, clipHeight);
        } else {
          this.drawVideoThumbnails(
            clip,
            clipX,
            clipY,
            clipWidth,
            clipHeight,
            sourceX,
          );
        }
      }
      this.hooks.drawClipOverlay?.(this.ctx, clip, rect);
      this.ctx.restore();
    });
  }
  drawVideoThumbnails(clip, clipX, clipY, width, height, sourceX) {
    const context = this.ctx;
    const radius = TIMELINE_CONFIG.CLIP_BORDER_RADIUS;
    context.save();
    this.drawRoundRect(clipX, clipY, width, height, radius);
    context.clip();
    context.fillStyle = this.colors.THUMBNAIL_PLACEHOLDER;
    context.fillRect(clipX, clipY, width, height);
    if (!this.thumbnailStore.has(clip.assetId)) {
      context.restore();
      return;
    }
    const aspect =
      clip.width && clip.height ? clip.width / clip.height : 16 / 9;
    const thumbH = Math.max(8, Math.floor(height));
    const thumbW = Math.max(12, Math.floor(thumbH * aspect));
    const maxTiles = Math.ceil(width / thumbW) + 1;
    for (let thumbnailIndex = 0; thumbnailIndex < maxTiles; thumbnailIndex++) {
      const tileX = sourceX + thumbnailIndex * thumbW;
      if (tileX > clipX + width) break;
      if (tileX + thumbW < clipX) continue;
      const tileCenterT =
        ((tileX + thumbW / 2 - sourceX) / width) * clip.duration;
      const thumb = this.thumbnailStore.getFrameAtTime(
        clip.assetId,
        tileCenterT,
      );
      if (thumb) {
        try {
          context.drawImage(thumb, tileX, clipY, thumbW, height);
        } catch {
          context.fillRect(tileX, clipY, thumbW, height);
        }
      }
    }
    context.strokeStyle = this.colors.THUMBNAIL_SEPARATOR;
    context.lineWidth = 1;
    context.beginPath();
    for (let thumbnailIndex = 0; thumbnailIndex < maxTiles; thumbnailIndex++) {
      const tileX = sourceX + thumbnailIndex * thumbW;
      if (tileX > clipX + width) break;
      if (tileX + thumbW < clipX) continue;
      context.moveTo(tileX + thumbW, clipY);
      context.lineTo(tileX + thumbW, clipY + height);
    }
    context.stroke();
    context.restore();
  }
  drawAudioWaveform(clip, clipX, clipY, width, height) {
    const context = this.ctx;
    const radius = TIMELINE_CONFIG.CLIP_BORDER_RADIUS;
    context.save();
    this.drawRoundRect(clipX, clipY, width, height, radius);
    context.clip();
    const peaks = this.waveformService?.getPeaks(clip.assetId);
    if (!peaks) {
      context.restore();
      return;
    }
    const peakCount = peaks.peaks.length / 2;
    const peaksPerSecond = peakCount / peaks.duration;
    const barWidth = TIMELINE_CONFIG.WAVEFORM_BAR_WIDTH;
    const barGap = TIMELINE_CONFIG.WAVEFORM_BAR_GAP;
    const barStep = barWidth + barGap;
    const barCount = Math.floor(width / barStep);
    if (barCount <= 0) {
      context.restore();
      return;
    }
    const secondsPerBar = clip.duration / barCount;
    const centerY = clipY + height / 2;
    const amplitude = height / 2;
    context.fillStyle = this.colors.AUDIO_WAVEFORM;
    context.beginPath();
    for (let waveformBarIndex = 0; waveformBarIndex < barCount; waveformBarIndex++) {
      const timeStart = clip.sourceOffset + waveformBarIndex * secondsPerBar;
      const timeEnd = timeStart + secondsPerBar;
      const peakStart = Math.floor(timeStart * peaksPerSecond);
      const peakEnd = Math.min(Math.ceil(timeEnd * peaksPerSecond), peakCount);
      let minVal = 0;
      let maxVal = 0;
      for (let peakIndex = peakStart; peakIndex < peakEnd; peakIndex++) {
        minVal = Math.min(minVal, peaks.peaks[peakIndex * 2]);
        maxVal = Math.max(maxVal, peaks.peaks[peakIndex * 2 + 1]);
      }
      const barX = clipX + waveformBarIndex * barStep;
      const barTop = centerY - maxVal * amplitude;
      const barBottom = centerY - minVal * amplitude;
      const barH = Math.max(1, barBottom - barTop);
      context.rect(barX, barTop, barWidth, barH);
    }
    context.fill();
    context.restore();
  }
  drawCropOverlay(state) {
    if (state.cropRange) {
      this.drawRangeFrame(state, state.cropRange, true);
    }
    for (const range of state.segmentRanges) {
      this.drawRangeFrame(state, range, false);
    }
  }
  /** Draws the trim frame and, for the active trim, its dimmed outside area. */
  drawRangeFrame(state, range, drawMask) {
    const {
      CLIP_PADDING,
      CROP_HANDLE_WIDTH,
      CROP_HANDLE_OUTSET,
      TRACK_PADDING_H,
    } = TIMELINE_CONFIG;
    const { CROP_MASK, SEGMENT_MASK, CROP_HANDLE, CROP_HANDLE_INNER } =
      this.colors;
    const { scale, scrollX } = state;
    const context = this.ctx;
    const trackY = this.rulerHeight + this.trackGap + CLIP_PADDING;
    const trackH =
      this.height - this.rulerHeight - this.trackGap - CLIP_PADDING * 2;
    const cropLeftX =
      range.start * scale - scrollX + TRACK_PADDING_H - CROP_HANDLE_OUTSET;
    const cropRightX =
      range.end * scale - scrollX + TRACK_PADDING_H + CROP_HANDLE_OUTSET;
    const INDICATOR_W = 2;
    const INDICATOR_H = 12;
    const BORDER_W = 2;
    const windowLeft = cropLeftX + CROP_HANDLE_WIDTH;
    const windowRight = cropRightX - CROP_HANDLE_WIDTH;
    context.save();
    context.beginPath();
    context.rect(0, trackY, this.width, trackH);
    context.clip();
    if (drawMask) {
      context.fillStyle =
        state.segmentRanges.length > 0 ? SEGMENT_MASK : CROP_MASK;
      const maskLeftEnd = Math.min(windowLeft, this.width);
      if (maskLeftEnd > 0) {
        context.fillRect(0, trackY, maskLeftEnd, trackH);
      }
      const maskRightStart = Math.max(windowRight, 0);
      if (maskRightStart < this.width) {
        context.fillRect(
          maskRightStart,
          trackY,
          this.width - maskRightStart,
          trackH,
        );
      }
    }
    const frameVisible = cropRightX > 0 && cropLeftX < this.width;
    if (frameVisible) {
      context.fillStyle = CROP_HANDLE;
      const borderLeft = Math.max(windowLeft, 0);
      const borderRight = Math.min(windowRight, this.width);
      if (borderRight > borderLeft) {
        context.fillRect(borderLeft, trackY, borderRight - borderLeft, BORDER_W);
        context.fillRect(
          borderLeft,
          trackY + trackH - BORDER_W,
          borderRight - borderLeft,
          BORDER_W,
        );
      }
      const HANDLE_R = CROP_HANDLE_WIDTH / 2;
      const drawHandle = (handleX, isLeft) => {
        context.fillStyle = CROP_HANDLE;
        context.beginPath();
        if (typeof context.roundRect === "function") {
          const radii = isLeft
            ? [HANDLE_R, 0, 0, HANDLE_R]
            : [0, HANDLE_R, HANDLE_R, 0];
          context.roundRect(handleX, trackY, CROP_HANDLE_WIDTH, trackH, radii);
          context.fill();
        } else {
          context.fillRect(handleX, trackY, CROP_HANDLE_WIDTH, trackH);
        }
        const indicatorX = handleX + (CROP_HANDLE_WIDTH - INDICATOR_W) / 2;
        const indicatorY = trackY + (trackH - INDICATOR_H) / 2;
        context.fillStyle = CROP_HANDLE_INNER;
        context.beginPath();
        if (typeof context.roundRect === "function") {
          context.roundRect(
            indicatorX,
            indicatorY,
            INDICATOR_W,
            INDICATOR_H,
            INDICATOR_W / 2,
          );
          context.fill();
        } else {
          context.fillRect(indicatorX, indicatorY, INDICATOR_W, INDICATOR_H);
        }
      };
      const clampedLeftX = Math.max(0, cropLeftX);
      const clampedRightX = Math.min(this.width, cropRightX);
      if (clampedLeftX + CROP_HANDLE_WIDTH > 0 && clampedLeftX < this.width) {
        drawHandle(clampedLeftX, true);
      }
      if (clampedRightX > 0 && clampedRightX - CROP_HANDLE_WIDTH < this.width) {
        drawHandle(clampedRightX - CROP_HANDLE_WIDTH, false);
      }
    }
    context.restore();
  }
  drawPlayhead(state) {
    if (state.clips.length === 0) return;
    const { TRACK_PADDING_H, CLIP_PADDING } = TIMELINE_CONFIG;
    const { PLAYHEAD, PLAYHEAD_FILL, PLAYHEAD_STROKE } = this.colors;
    const { currentTime, scale, scrollX } = state;
    const playheadX = currentTime * scale - scrollX + TRACK_PADDING_H;
    if (playheadX < TRACK_PADDING_H || playheadX > this.width - TRACK_PADDING_H) return;
    const context = this.ctx;
    const trackBottom = this.height - CLIP_PADDING;
    context.strokeStyle = PLAYHEAD;
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(playheadX, 14);
    context.lineTo(playheadX, trackBottom);
    context.stroke();
    context.beginPath();
    context.moveTo(playheadX - 2, 0.75);
    context.lineTo(playheadX + 2, 0.75);
    context.bezierCurveTo(playheadX + 3.821, 0.75, playheadX + 5.25, 2.167, playheadX + 5.25, 3.858);
    context.lineTo(playheadX + 5.25, 11.507);
    context.bezierCurveTo(
      playheadX + 5.25,
      11.889,
      playheadX + 5.051,
      12.258,
      playheadX + 4.702,
      12.481,
    );
    context.lineTo(playheadX + 0.702, 15.046);
    context.bezierCurveTo(
      playheadX + 0.278,
      15.318,
      playheadX - 0.278,
      15.318,
      playheadX - 0.702,
      15.046,
    );
    context.lineTo(playheadX - 4.702, 12.481);
    context.bezierCurveTo(playheadX - 5.051, 12.258, playheadX - 5.25, 11.889, playheadX - 5.25, 11.507);
    context.lineTo(playheadX - 5.25, 3.858);
    context.bezierCurveTo(playheadX - 5.25, 2.167, playheadX - 3.821, 0.75, playheadX - 2, 0.75);
    context.closePath();
    context.fillStyle = PLAYHEAD_FILL;
    context.fill();
    context.strokeStyle = PLAYHEAD_STROKE;
    context.lineWidth = 1.5;
    context.stroke();
  }
  drawRoundRect(rectX, rectY, width, height, radius) {
    this.ctx.beginPath();
    this.ctx.roundRect(rectX, rectY, width, height, radius);
  }
  calculateInterval(scale) {
    for (const config of TIME_INTERVALS) {
      if (scale >= config.minScale) {
        return {
          interval: config.interval,
          subDivisions: config.subDivisions,
        };
      }
    }
    return {
      interval: 10,
      subDivisions: 5,
    };
  }
  destroy(clearCanvas = true) {
    this.destroyed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (clearCanvas) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.rulerLayer = null;
    this.rulerCtx = null;
    this.rulerCacheKey = "";
  }
}
