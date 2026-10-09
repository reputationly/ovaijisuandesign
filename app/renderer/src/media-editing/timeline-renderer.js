// timeline-renderer.js
import { BlobSource, CanvasSink } from "../vendor.js";
import { Input$3, ALL_FORMATS } from "../vendor-inline/mediabunny/hls-segmented-input.js";
import { TIMELINE_CONFIG, LIGHT_THEME_COLORS, TIME_INTERVALS } from "../generation/params-popup.jsx";
export function estimateBytes(frame2) {
  const img = frame2.img;
  if (img instanceof ImageBitmap) {
    return img.width * img.height * 4;
  }
  return 0;
}
export class VideoFrameCache {
  decoderMap = new Map();
  canvasesMap = new Map();
  getAsset;
  /** resetCanvases 产生的异步清理 Promise，在创建新 generator 前 await */
  cleanupPromises = [];
  constructor(getAsset2) {
    this.getAsset = getAsset2;
  }
  async getVideoDecoderCtx(assetId) {
    return await this._getDecoder(assetId);
  }
  async getCanvases(assetId, timestamp2) {
    if (this.canvasesMap.has(assetId)) {
      return this.canvasesMap.get(assetId);
    }
    if (this.cleanupPromises.length > 0) {
      await Promise.all(this.cleanupPromises);
      this.cleanupPromises = [];
    }
    const ctx = await this._getDecoder(assetId);
    const canvases = ctx.canvasSink.canvases(timestamp2);
    this.canvasesMap.set(assetId, canvases);
    ctx.nextFrame = (await canvases.next())?.value ?? null;
    return this.canvasesMap.get(assetId);
  }
  /**
   * 获取视频帧的原始 canvas（零拷贝，适用于播放时直接绘制）
   */
  async getFrameCanvas(assetId, timestamp2) {
    try {
      const asset = this.getAsset(assetId);
      if (!asset) return null;
      const ctx = await this._getDecoder(assetId);
      const clampedTimestamp = Math.max(
        0,
        Math.min(timestamp2, Math.max(0, ctx.sourceDuration - 1e-3)),
      );
      if (
        ctx.lastSeekTime !== void 0 &&
        clampedTimestamp < ctx.lastSeekTime &&
        this.canvasesMap.has(assetId)
      ) {
        const oldGen = this.canvasesMap.get(assetId);
        this.canvasesMap.delete(assetId);
        try {
          await oldGen?.return(null);
        } catch {}
      }
      ctx.lastSeekTime = clampedTimestamp;
      const canvases = await this.getCanvases(assetId, clampedTimestamp);
      while (ctx.nextFrame) {
        if (ctx.nextFrame.timestamp <= clampedTimestamp) {
          const current2 = ctx.nextFrame;
          const next2 = (await canvases.next())?.value ?? null;
          if (!next2) {
            ctx.nextFrame = current2;
            return {
              canvas: current2.canvas,
              width: ctx.width,
              height: ctx.height,
            };
          }
          ctx.nextFrame = next2;
        } else {
          const canvas = ctx.nextFrame.canvas;
          return {
            canvas,
            width: ctx.width,
            height: ctx.height,
          };
        }
      }
      return null;
    } catch (error) {
      console.error("VideoFrameCache: 解码视频帧失败", error);
      return null;
    }
  }
  /**
   * 获取视频帧（返回 ImageBitmap，适用于非播放时 seek 预览）
   */
  async getFrame(assetId, timestamp2) {
    const result = await this.getFrameCanvas(assetId, timestamp2);
    if (!result) return null;
    return await createImageBitmap(result.canvas);
  }
  async _getDecoder(assetId) {
    const cached = this.decoderMap.get(assetId);
    if (cached) return cached;
    const promise = (async () => {
      const asset = this.getAsset(assetId);
      if (!asset) throw new Error(`asset 不存在: ${assetId}`);
      const input = new Input$3({
        formats: ALL_FORMATS,
        source: new BlobSource(asset.file),
      });
      const sourceDuration = await input.computeDuration();
      const track = await input.getPrimaryVideoTrack();
      if (!track) {
        input.dispose();
        throw new Error("该文件不包含视频轨道");
      }
      const videoCanBeTransparent = await track.canBeTransparent();
      const canvasSink = new CanvasSink(track, {
        poolSize: 2,
        fit: "contain",
        alpha: videoCanBeTransparent,
      });
      let width = track.displayWidth ?? track.codedWidth ?? 0;
      let height = track.displayHeight ?? track.codedHeight ?? 0;
      if (!width || !height) {
        width = 1920;
        height = 1080;
      }
      return {
        input,
        nextFrame: null,
        track,
        canvasSink,
        sourceDuration,
        width,
        height,
      };
    })();
    this.decoderMap.set(assetId, promise);
    return promise;
  }
  resetCanvases() {
    for (const decoderPromise of this.decoderMap.values()) {
      decoderPromise
        .then((ctx) => {
          ctx.nextFrame = null;
        })
        .catch(() => {});
    }
    const promises = [];
    this.canvasesMap.forEach((item) => {
      promises.push(
        item
          .return(null)
          .then(() => {})
          .catch(() => {}),
      );
    });
    this.canvasesMap.clear();
    this.cleanupPromises = promises;
  }
  async clearAsset(assetId) {
    const canvases = this.canvasesMap.get(assetId);
    this.canvasesMap.delete(assetId);
    if (canvases) {
      try {
        await canvases.return(null);
      } catch {}
    }
    const decoderPromise = this.decoderMap.get(assetId);
    this.decoderMap.delete(assetId);
    if (decoderPromise) {
      try {
        const ctx = await decoderPromise;
        ctx.nextFrame = null;
        ctx.input.dispose();
      } catch {}
    }
  }
  async clear() {
    for (const [, canvases] of this.canvasesMap.entries()) {
      try {
        await canvases.return(null);
      } catch {}
    }
    this.canvasesMap.clear();
    for (const [, decoderPromise] of this.decoderMap.entries()) {
      try {
        const ctx = await decoderPromise;
        ctx.nextFrame = null;
        ctx.input.dispose();
      } catch {}
    }
    this.decoderMap.clear();
  }
}
const PEAK_WORKER_CODE =
  /* javascript */
  `
self.onmessage = function (e) {
  var channelData = e.data.channelData;
  var samplesPerPixel = e.data.samplesPerPixel;
  var jobId = e.data.jobId;
  var totalSamples = channelData.length;
  var peakCount = Math.ceil(totalSamples / samplesPerPixel);
  var peaks = new Float32Array(peakCount * 2);
  for (var i = 0; i < peakCount; i++) {
    var start = i * samplesPerPixel;
    var end = Math.min(start + samplesPerPixel, totalSamples);
    var min = 1, max = -1;
    for (var j = start; j < end; j++) {
      var v = channelData[j];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    peaks[i * 2] = min;
    peaks[i * 2 + 1] = max;
  }
  self.postMessage({ jobId: jobId, peaks: peaks }, [peaks.buffer]);
};
`;
export class WaveformService {
  cache = new Map();
  /**
   * 仅用于 decodeAudioData，使用低采样率减少 PCM 数据量。
   * 22050Hz 覆盖 11kHz 以下频率，波形包络视觉形态准确，内存约为 44100Hz 的一半。
   */
  audioContext = null;
  worker = null;
  workerJobId = 0;
  workerPending = new Map();
  getAudioContext() {
    if (!this.audioContext) {
      try {
        this.audioContext = new AudioContext({
          sampleRate: 22050,
        });
      } catch {
        this.audioContext = new AudioContext();
      }
    }
    return this.audioContext;
  }
  /**
   * 懒初始化 Blob Worker。
   * 使用 Blob URL 创建，无需打包配置，兼容所有 bundler。
   * Worker 创建失败时返回 null，由调用方降级到同步计算。
   */
  getWorker() {
    if (this.worker) return this.worker;
    try {
      const blob = new Blob([PEAK_WORKER_CODE], {
        type: "text/javascript",
      });
      const url2 = URL.createObjectURL(blob);
      const worker = new Worker(url2);
      URL.revokeObjectURL(url2);
      worker.onmessage = (e2) => {
        const { jobId, peaks } = e2.data;
        const job = this.workerPending.get(jobId);
        if (job) {
          this.workerPending.delete(jobId);
          job.resolve(peaks);
        }
      };
      worker.onerror = (e2) => {
        for (const [, job] of this.workerPending) {
          job.reject(new Error(e2.message ?? "Peak worker error"));
        }
        this.workerPending.clear();
        this.worker?.terminate();
        this.worker = null;
      };
      this.worker = worker;
      return worker;
    } catch {
      return null;
    }
  }
  /**
   * 从音频文件提取波形峰值数据
   * @param assetId 素材 ID，用于缓存
   * @param file 音频文件
   * @param samplesPerPixel 每像素的采样数，默认 256
   */
  async extractPeaks(assetId, file, samplesPerPixel = 256) {
    const cached = this.cache.get(assetId);
    if (cached) return cached;
    const ctx = this.getAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const { duration, sampleRate } = audioBuffer;
    const channelData = audioBuffer.getChannelData(0);
    const peaks = await this.computePeaksInWorker(channelData, samplesPerPixel);
    const result = {
      peaks,
      duration,
      sampleRate,
    };
    this.cache.set(assetId, result);
    return result;
  }
  /**
   * 将峰值计算委托给 Worker，避免阻塞主线程。
   * channelData 拷贝一份再 transfer 到 Worker（AudioBuffer 内部 buffer 不可直接 transfer）。
   * Worker 不可用或出错时，自动降级为同步计算。
   */
  async computePeaksInWorker(channelData, samplesPerPixel) {
    const worker = this.getWorker();
    if (!worker) {
      return this.computePeaksSync(channelData, samplesPerPixel);
    }
    const jobId = ++this.workerJobId;
    const channelDataCopy = new Float32Array(channelData);
    return new Promise((resolve, reject) => {
      this.workerPending.set(jobId, {
        resolve,
        reject,
      });
      worker.postMessage(
        {
          jobId,
          channelData: channelDataCopy,
          samplesPerPixel,
        },
        [channelDataCopy.buffer],
      );
    }).catch(() => {
      return this.computePeaksSync(channelData, samplesPerPixel);
    });
  }
  /** 同步降级计算，Worker 不可用时的兜底方案 */
  computePeaksSync(channelData, samplesPerPixel) {
    const totalSamples = channelData.length;
    const peakCount = Math.ceil(totalSamples / samplesPerPixel);
    const peaks = new Float32Array(peakCount * 2);
    for (let i2 = 0; i2 < peakCount; i2++) {
      const start2 = i2 * samplesPerPixel;
      const end2 = Math.min(start2 + samplesPerPixel, totalSamples);
      let min2 = 1;
      let max2 = -1;
      for (let j2 = start2; j2 < end2; j2++) {
        const val = channelData[j2];
        if (val < min2) min2 = val;
        if (val > max2) max2 = val;
      }
      peaks[i2 * 2] = min2;
      peaks[i2 * 2 + 1] = max2;
    }
    return peaks;
  }
  /** 获取已缓存的波形数据 */
  getPeaks(assetId) {
    return this.cache.get(assetId) ?? null;
  }
  /** 清除指定素材的缓存 */
  clearAsset(assetId) {
    this.cache.delete(assetId);
  }
  /** 清除所有缓存并释放资源 */
  clear() {
    this.cache.clear();
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }
    this.worker?.terminate();
    this.worker = null;
    this.workerPending.clear();
  }
}
export function formatTime$1(seconds, showMs = false) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  const minsStr = mins.toString().padStart(2, "0");
  const secsStr = secs.toString().padStart(2, "0");
  if (showMs) {
    const msStr = ms.toString().padStart(2, "0");
    return `${minsStr}:${secsStr}.${msStr}`;
  }
  return `${minsStr}:${secsStr}`;
}
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
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法获取 Canvas 2D 上下文");
    this.ctx = ctx;
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
    const height = layout.rulerHeight + layout.trackGap + layout.thumbnailHeight;
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
    this.rulerLayer = new OffscreenCanvas(newCanvasW, layout.rulerHeight * this.dpr);
    this.rulerCtx = this.rulerLayer.getContext("2d");
    this.rulerCacheKey = "";
  }
  render(state2) {
    this.needsRender = false;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.clear();
    this.drawBackground();
    this.drawRulerCached(state2);
    this.drawTrack(state2);
    this.drawCropOverlay(state2);
    this.drawPlayhead(state2);
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
  drawRulerCached(state2) {
    if (!this.rulerLayer || !this.rulerCtx) return;
    const cacheKey = `${state2.scale}:${state2.scrollX}:${state2.totalDuration}:${this.width}`;
    if (this.rulerCacheKey !== cacheKey) {
      this.drawRulerToLayer(state2);
      this.rulerCacheKey = cacheKey;
    }
    this.ctx.drawImage(this.rulerLayer, 0, 0, this.width, this.rulerHeight);
  }
  drawRulerToLayer(state2) {
    const ctx = this.rulerCtx;
    if (!ctx) return;
    const rulerH = this.rulerHeight;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, rulerH);
    const { RULER_LINE, RULER_TEXT } = this.colors;
    const { TRACK_PADDING_H } = TIMELINE_CONFIG;
    const { scale: scale2, scrollX } = state2;
    const contentLeft = TRACK_PADDING_H;
    const contentRight = this.width - TRACK_PADDING_H;
    const { interval: interval2, subDivisions } = this.calculateInterval(scale2);
    const startTime = Math.floor(scrollX / scale2 / interval2) * interval2;
    const endTime = Math.ceil((scrollX + this.width) / scale2 / interval2) * interval2;
    const centerY = rulerH / 2;
    ctx.font = "11px Inter, sans-serif";
    ctx.textBaseline = "middle";
    ctx.save();
    ctx.beginPath();
    ctx.rect(contentLeft, 0, contentRight - contentLeft, rulerH);
    ctx.clip();
    for (let time = startTime; time <= endTime; time += interval2) {
      const x2 = time * scale2 - scrollX + TRACK_PADDING_H;
      if (x2 >= contentLeft - 8 && x2 <= contentRight + 8) {
        ctx.fillStyle = RULER_TEXT;
        const label = formatTimeShort(time);
        if (x2 < contentLeft + 4) {
          ctx.textAlign = "left";
          ctx.fillText(label, contentLeft, centerY);
        } else if (x2 > contentRight - 4) {
          ctx.textAlign = "right";
          ctx.fillText(label, contentRight, centerY);
        } else {
          ctx.textAlign = "center";
          ctx.fillText(label, x2, centerY);
        }
      }
    }
    ctx.fillStyle = RULER_LINE;
    ctx.beginPath();
    for (let time = startTime; time <= endTime; time += interval2) {
      const x2 = time * scale2 - scrollX + TRACK_PADDING_H;
      const lastSubX = x2 + (interval2 / subDivisions) * (subDivisions - 1) * scale2;
      if (x2 > contentRight || lastSubX < contentLeft) continue;
      for (let i2 = 1; i2 < subDivisions; i2++) {
        const subX = x2 + (interval2 / subDivisions) * i2 * scale2;
        if (subX > contentRight) break;
        if (subX < contentLeft) continue;
        ctx.moveTo(subX + 0.5, centerY);
        ctx.ellipse(subX, centerY, 0.5, 1, 0, 0, Math.PI * 2);
      }
    }
    ctx.fill();
    ctx.restore();
  }
  drawTrack(state2) {
    const trackY = this.rulerHeight + this.trackGap;
    const trackHeight = this.height - trackY;
    const { TRACK_PADDING_H } = TIMELINE_CONFIG;
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(TRACK_PADDING_H, trackY, this.width - TRACK_PADDING_H * 2, trackHeight);
    ctx.clip();
    this.drawClips(state2, trackY);
    ctx.restore();
  }
  drawClips(state2, trackY) {
    const { CLIP_BORDER_RADIUS, CLIP_PADDING, TRACK_PADDING_H } = TIMELINE_CONFIG;
    const trackHeight = this.height - this.rulerHeight - this.trackGap;
    const { scale: scale2, scrollX, clips } = state2;
    const contentRight = this.width - TRACK_PADDING_H;
    clips.forEach((clip2) => {
      const x2 = clip2.startTime * scale2 - scrollX + TRACK_PADDING_H;
      const sourceX = (clip2.startTime - clip2.sourceOffset) * scale2 - scrollX + TRACK_PADDING_H;
      const clipWidth = clip2.duration * scale2;
      const y4 = trackY + CLIP_PADDING;
      const clipHeight = trackHeight - CLIP_PADDING * 2;
      if (x2 + clipWidth < TRACK_PADDING_H || x2 > contentRight) return;
      const visibleX = Math.max(x2, TRACK_PADDING_H);
      const visibleWidth = Math.min(x2 + clipWidth, contentRight) - visibleX;
      if (visibleWidth <= 0) return;
      const rect = {
        x: x2,
        y: y4,
        width: clipWidth,
        height: clipHeight,
        sourceX,
      };
      this.ctx.save();
      this.drawRoundRect(x2, y4, clipWidth, clipHeight, CLIP_BORDER_RADIUS);
      this.ctx.fillStyle = this.colors.VIDEO_CLIP;
      this.ctx.fill();
      const handled = this.hooks.drawClipContent?.(this.ctx, clip2, rect);
      if (!handled) {
        if (clip2.type === "audio") {
          this.drawAudioWaveform(clip2, x2, y4, clipWidth, clipHeight);
        } else {
          this.drawVideoThumbnails(clip2, x2, y4, clipWidth, clipHeight, sourceX);
        }
      }
      this.hooks.drawClipOverlay?.(this.ctx, clip2, rect);
      this.ctx.restore();
    });
  }
  drawVideoThumbnails(clip2, x2, y4, width, height, sourceX) {
    const ctx = this.ctx;
    const radius = TIMELINE_CONFIG.CLIP_BORDER_RADIUS;
    ctx.save();
    this.drawRoundRect(x2, y4, width, height, radius);
    ctx.clip();
    ctx.fillStyle = this.colors.THUMBNAIL_PLACEHOLDER;
    ctx.fillRect(x2, y4, width, height);
    if (!this.thumbnailStore.has(clip2.assetId)) {
      ctx.restore();
      return;
    }
    const aspect = clip2.width && clip2.height ? clip2.width / clip2.height : 16 / 9;
    const thumbH = Math.max(8, Math.floor(height));
    const thumbW = Math.max(12, Math.floor(thumbH * aspect));
    const maxTiles = Math.ceil(width / thumbW) + 1;
    for (let i2 = 0; i2 < maxTiles; i2++) {
      const tileX = sourceX + i2 * thumbW;
      if (tileX > x2 + width) break;
      if (tileX + thumbW < x2) continue;
      const tileCenterT = ((tileX + thumbW / 2 - sourceX) / width) * clip2.duration;
      const thumb = this.thumbnailStore.getFrameAtTime(clip2.assetId, tileCenterT);
      if (thumb) {
        try {
          ctx.drawImage(thumb, tileX, y4, thumbW, height);
        } catch {
          ctx.fillRect(tileX, y4, thumbW, height);
        }
      }
    }
    ctx.strokeStyle = this.colors.THUMBNAIL_SEPARATOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i2 = 0; i2 < maxTiles; i2++) {
      const tileX = sourceX + i2 * thumbW;
      if (tileX > x2 + width) break;
      if (tileX + thumbW < x2) continue;
      ctx.moveTo(tileX + thumbW, y4);
      ctx.lineTo(tileX + thumbW, y4 + height);
    }
    ctx.stroke();
    ctx.restore();
  }
  drawAudioWaveform(clip2, x2, y4, width, height) {
    const ctx = this.ctx;
    const radius = TIMELINE_CONFIG.CLIP_BORDER_RADIUS;
    ctx.save();
    this.drawRoundRect(x2, y4, width, height, radius);
    ctx.clip();
    const peaks = this.waveformService?.getPeaks(clip2.assetId);
    if (!peaks) {
      ctx.restore();
      return;
    }
    const peakCount = peaks.peaks.length / 2;
    const peaksPerSecond = peakCount / peaks.duration;
    const barWidth = TIMELINE_CONFIG.WAVEFORM_BAR_WIDTH;
    const barGap = TIMELINE_CONFIG.WAVEFORM_BAR_GAP;
    const barStep = barWidth + barGap;
    const barCount = Math.floor(width / barStep);
    if (barCount <= 0) {
      ctx.restore();
      return;
    }
    const secondsPerBar = clip2.duration / barCount;
    const centerY = y4 + height / 2;
    const amplitude = height / 2;
    ctx.fillStyle = this.colors.AUDIO_WAVEFORM;
    ctx.beginPath();
    for (let i2 = 0; i2 < barCount; i2++) {
      const timeStart = clip2.sourceOffset + i2 * secondsPerBar;
      const timeEnd = timeStart + secondsPerBar;
      const peakStart = Math.floor(timeStart * peaksPerSecond);
      const peakEnd = Math.min(Math.ceil(timeEnd * peaksPerSecond), peakCount);
      let minVal = 0;
      let maxVal = 0;
      for (let j2 = peakStart; j2 < peakEnd; j2++) {
        minVal = Math.min(minVal, peaks.peaks[j2 * 2]);
        maxVal = Math.max(maxVal, peaks.peaks[j2 * 2 + 1]);
      }
      const barX = x2 + i2 * barStep;
      const barTop = centerY - maxVal * amplitude;
      const barBottom = centerY - minVal * amplitude;
      const barH = Math.max(1, barBottom - barTop);
      ctx.rect(barX, barTop, barWidth, barH);
    }
    ctx.fill();
    ctx.restore();
  }
  drawCropOverlay(state2) {
    if (state2.cropRange) {
      this.drawRangeFrame(state2, state2.cropRange, true);
    }
    for (const range2 of state2.segmentRanges) {
      this.drawRangeFrame(state2, range2, false);
    }
  }
  /** Draws the trim frame and, for the active trim, its dimmed outside area. */
  drawRangeFrame(state2, range2, drawMask) {
    const { CLIP_PADDING, CROP_HANDLE_WIDTH, CROP_HANDLE_OUTSET, TRACK_PADDING_H } =
      TIMELINE_CONFIG;
    const { CROP_MASK, SEGMENT_MASK, CROP_HANDLE, CROP_HANDLE_INNER } = this.colors;
    const { scale: scale2, scrollX } = state2;
    const ctx = this.ctx;
    const trackY = this.rulerHeight + this.trackGap + CLIP_PADDING;
    const trackH = this.height - this.rulerHeight - this.trackGap - CLIP_PADDING * 2;
    const cropLeftX = range2.start * scale2 - scrollX + TRACK_PADDING_H - CROP_HANDLE_OUTSET;
    const cropRightX = range2.end * scale2 - scrollX + TRACK_PADDING_H + CROP_HANDLE_OUTSET;
    const INDICATOR_W = 2;
    const INDICATOR_H = 12;
    const BORDER_W = 2;
    const windowLeft = cropLeftX + CROP_HANDLE_WIDTH;
    const windowRight = cropRightX - CROP_HANDLE_WIDTH;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, trackY, this.width, trackH);
    ctx.clip();
    if (drawMask) {
      ctx.fillStyle = state2.segmentRanges.length > 0 ? SEGMENT_MASK : CROP_MASK;
      const maskLeftEnd = Math.min(windowLeft, this.width);
      if (maskLeftEnd > 0) {
        ctx.fillRect(0, trackY, maskLeftEnd, trackH);
      }
      const maskRightStart = Math.max(windowRight, 0);
      if (maskRightStart < this.width) {
        ctx.fillRect(maskRightStart, trackY, this.width - maskRightStart, trackH);
      }
    }
    const frameVisible = cropRightX > 0 && cropLeftX < this.width;
    if (frameVisible) {
      ctx.fillStyle = CROP_HANDLE;
      const borderLeft = Math.max(windowLeft, 0);
      const borderRight = Math.min(windowRight, this.width);
      if (borderRight > borderLeft) {
        ctx.fillRect(borderLeft, trackY, borderRight - borderLeft, BORDER_W);
        ctx.fillRect(borderLeft, trackY + trackH - BORDER_W, borderRight - borderLeft, BORDER_W);
      }
      const HANDLE_R = CROP_HANDLE_WIDTH / 2;
      const drawHandle = (handleX, isLeft) => {
        ctx.fillStyle = CROP_HANDLE;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          const radii = isLeft ? [HANDLE_R, 0, 0, HANDLE_R] : [0, HANDLE_R, HANDLE_R, 0];
          ctx.roundRect(handleX, trackY, CROP_HANDLE_WIDTH, trackH, radii);
          ctx.fill();
        } else {
          ctx.fillRect(handleX, trackY, CROP_HANDLE_WIDTH, trackH);
        }
        const indicatorX = handleX + (CROP_HANDLE_WIDTH - INDICATOR_W) / 2;
        const indicatorY = trackY + (trackH - INDICATOR_H) / 2;
        ctx.fillStyle = CROP_HANDLE_INNER;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(indicatorX, indicatorY, INDICATOR_W, INDICATOR_H, INDICATOR_W / 2);
          ctx.fill();
        } else {
          ctx.fillRect(indicatorX, indicatorY, INDICATOR_W, INDICATOR_H);
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
    ctx.restore();
  }
  drawPlayhead(state2) {
    if (state2.clips.length === 0) return;
    const { TRACK_PADDING_H, CLIP_PADDING } = TIMELINE_CONFIG;
    const { PLAYHEAD, PLAYHEAD_FILL, PLAYHEAD_STROKE } = this.colors;
    const { currentTime, scale: scale2, scrollX } = state2;
    const x2 = currentTime * scale2 - scrollX + TRACK_PADDING_H;
    if (x2 < TRACK_PADDING_H || x2 > this.width - TRACK_PADDING_H) return;
    const ctx = this.ctx;
    const trackBottom = this.height - CLIP_PADDING;
    ctx.strokeStyle = PLAYHEAD;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x2, 14);
    ctx.lineTo(x2, trackBottom);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2 - 2, 0.75);
    ctx.lineTo(x2 + 2, 0.75);
    ctx.bezierCurveTo(x2 + 3.821, 0.75, x2 + 5.25, 2.167, x2 + 5.25, 3.858);
    ctx.lineTo(x2 + 5.25, 11.507);
    ctx.bezierCurveTo(x2 + 5.25, 11.889, x2 + 5.051, 12.258, x2 + 4.702, 12.481);
    ctx.lineTo(x2 + 0.702, 15.046);
    ctx.bezierCurveTo(x2 + 0.278, 15.318, x2 - 0.278, 15.318, x2 - 0.702, 15.046);
    ctx.lineTo(x2 - 4.702, 12.481);
    ctx.bezierCurveTo(x2 - 5.051, 12.258, x2 - 5.25, 11.889, x2 - 5.25, 11.507);
    ctx.lineTo(x2 - 5.25, 3.858);
    ctx.bezierCurveTo(x2 - 5.25, 2.167, x2 - 3.821, 0.75, x2 - 2, 0.75);
    ctx.closePath();
    ctx.fillStyle = PLAYHEAD_FILL;
    ctx.fill();
    ctx.strokeStyle = PLAYHEAD_STROKE;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  drawRoundRect(x2, y4, width, height, radius) {
    this.ctx.beginPath();
    this.ctx.roundRect(x2, y4, width, height, radius);
  }
  calculateInterval(scale2) {
    for (const config2 of TIME_INTERVALS) {
      if (scale2 >= config2.minScale) {
        return {
          interval: config2.interval,
          subDivisions: config2.subDivisions,
        };
      }
    }
    return {
      interval: 10,
      subDivisions: 5,
    };
  }
  destroy(clearCanvas2 = true) {
    this.destroyed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (clearCanvas2) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.rulerLayer = null;
    this.rulerCtx = null;
    this.rulerCacheKey = "";
  }
}
