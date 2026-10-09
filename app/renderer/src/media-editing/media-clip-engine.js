// media-clip-engine.js
import { TIMELINE_CONFIG, DEFAULT_CROP_CONFIG } from "../generation/params-popup.jsx";
import { TimelineEventHandler, getDurationTier } from "./timeline-event-handler.js";
import {
  MediaRegistry,
  ThumbnailService,
  ThumbnailStore,
  exportCroppedVideo,
} from "../vendor-inline/mediabunny/aac-encoder.js";
import { TimelineRenderer, VideoFrameCache, WaveformService } from "./timeline-renderer.js";
const defaultState = {
  clips: [],
  totalDuration: TIMELINE_CONFIG.MIN_TOTAL_DURATION,
  currentTime: 0,
  isPlaying: false,
  scale: TIMELINE_CONFIG.DEFAULT_SCALE,
  scrollX: 0,
  selectedClipIds: new Set(),
  hoverClipId: null,
  cropRange: null,
  segmentRanges: [],
  previewFrame: null,
};
class TimelineStore {
  state;
  listeners = new Set();
  /** 移除 clip 时的副作用回调（释放素材等），由 Engine 注入 */
  onAssetOrphan = null;
  constructor() {
    this.state = {
      ...defaultState,
    };
  }
  getState() {
    return this.state;
  }
  setState(partial) {
    const keys2 = Object.keys(partial);
    const hasChanged = keys2.some((k2) => this.state[k2] !== partial[k2]);
    if (!hasChanged) return;
    this.state = {
      ...this.state,
      ...partial,
    };
    this.emitChange();
  }
  /**
   * 静默更新状态，不通知订阅者。
   * 适用于播放循环中高频更新 currentTime，避免每帧触发 React 重渲染。
   * 调用方需自行保证在合适时机通过 setState 同步最终状态。
   */
  setStateSilent(partial) {
    this.state = {
      ...this.state,
      ...partial,
    };
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  emitChange() {
    for (const listener of this.listeners) {
      listener();
    }
  }
  // --- Actions ---
  setCurrentTime(time) {
    const clampedTime = Math.max(0, Math.min(time, this.state.totalDuration));
    this.setState({
      currentTime: clampedTime,
    });
  }
  setScale(scale2) {
    const { MIN_SCALE: MIN_SCALE2, MAX_SCALE: MAX_SCALE2 } = TIMELINE_CONFIG;
    const clampedScale = Math.max(MIN_SCALE2, Math.min(scale2, MAX_SCALE2));
    this.setState({
      scale: clampedScale,
    });
  }
  setScrollX(scrollX) {
    this.setState({
      scrollX: Math.max(0, scrollX),
    });
  }
  selectClip(clipId) {
    const current2 = this.state.selectedClipIds;
    if (clipId) {
      if (current2.size === 1 && current2.has(clipId)) return;
      this.setState({
        selectedClipIds: new Set([clipId]),
      });
    } else {
      if (current2.size === 0) return;
      this.setState({
        selectedClipIds: new Set(),
      });
    }
  }
  setHoverClip(clipId) {
    this.setState({
      hoverClipId: clipId,
    });
  }
  addClip(clip2) {
    this.setState({
      clips: [...this.state.clips, clip2],
      totalDuration: Math.max(
        TIMELINE_CONFIG.MIN_TOTAL_DURATION,
        this.state.totalDuration,
        clip2.startTime + clip2.duration,
      ),
    });
  }
  updateClip(clipId, updates) {
    this.setState({
      clips: this.state.clips.map((clip2) =>
        clip2.id === clipId
          ? {
              ...clip2,
              ...updates,
            }
          : clip2,
      ),
    });
  }
  removeClip(clipId) {
    const clip2 = this.state.clips.find((c3) => c3.id === clipId);
    if (clip2) {
      const stillUsed = this.state.clips.some(
        (c3) => c3.id !== clipId && c3.assetId === clip2.assetId,
      );
      if (!stillUsed) {
        this.onAssetOrphan?.(clip2.assetId);
      }
    }
    this.setState({
      clips: this.state.clips.filter((c3) => c3.id !== clipId),
      selectedClipIds: new Set([...this.state.selectedClipIds].filter((id2) => id2 !== clipId)),
    });
  }
  clearAllClips() {
    const assetIds = new Set();
    for (const c3 of this.state.clips) {
      assetIds.add(c3.assetId);
    }
    for (const id2 of assetIds) {
      this.onAssetOrphan?.(id2);
    }
    this.setState({
      clips: [],
      selectedClipIds: new Set(),
      hoverClipId: null,
    });
  }
  togglePlay() {
    this.setState({
      isPlaying: !this.state.isPlaying,
    });
  }
  setPreviewFrame(frame2) {
    const old = this.state.previewFrame;
    if (old && old !== frame2) {
      old.close();
    }
    this.setState({
      previewFrame: frame2,
    });
  }
  setCropRange(range2) {
    this.setState({
      cropRange: range2,
    });
  }
  setSegmentRanges(ranges) {
    this.setState({
      segmentRanges: ranges,
    });
  }
  reset() {
    const old = this.state.previewFrame;
    if (old) old.close();
    this.state = {
      ...defaultState,
    };
    this.emitChange();
  }
  /** 获取 TimelineActions 接口（兼容层） */
  getActions() {
    return {
      setCurrentTime: (t2) => this.setCurrentTime(t2),
      setScale: (s2) => this.setScale(s2),
      setScrollX: (sx) => this.setScrollX(sx),
      selectClip: (id2) => this.selectClip(id2),
      setHoverClip: (id2) => this.setHoverClip(id2),
      addClip: (clip2) => this.addClip(clip2),
      updateClip: (id2, updates) => this.updateClip(id2, updates),
      removeClip: (id2) => this.removeClip(id2),
      clearAllClips: () => this.clearAllClips(),
      togglePlay: () => this.togglePlay(),
      setPreviewFrame: (frame2) => this.setPreviewFrame(frame2),
      setCropRange: (range2) => this.setCropRange(range2),
      setSegmentRanges: (ranges) => this.setSegmentRanges(ranges),
      setState: (state2) => this.setState(state2),
    };
  }
}
export class MediaClipEngine {
  // 子模块实例
  store;
  mediaRegistry;
  thumbnailStore;
  videoFrameCache;
  thumbnailService;
  waveformService;
  renderer = null;
  eventHandler = null;
  canvas = null;
  cropConfig;
  colors;
  disableScrollDrag;
  thumbAbort = null;
  seekSeq = 0;
  destroyed = false;
  // 播放循环
  playRafId = null;
  playLastTime = 0;
  playUnsubscribe = null;
  // seek 预览帧 RAF 节流
  seekRafId = null;
  pendingSeekTime = null;
  // 播放时帧解码并发控制
  directDecoding = false;
  directPendingTime = null;
  // 音频播放
  audioElement = null;
  // 预览帧直绘回调（UI 层注入）
  onPreviewFrameDirect = null;
  constructor(options) {
    this.cropConfig = options?.cropConfig ?? DEFAULT_CROP_CONFIG;
    this.colors = options?.colors;
    this.disableScrollDrag = options?.disableScrollDrag ?? false;
    this.store = new TimelineStore();
    this.mediaRegistry = new MediaRegistry();
    this.thumbnailStore = new ThumbnailStore();
    this.videoFrameCache = new VideoFrameCache((id2) => this.mediaRegistry.getAsset(id2));
    this.thumbnailService = new ThumbnailService(this.videoFrameCache, this.thumbnailStore);
    this.waveformService = new WaveformService();
    this.store.onAssetOrphan = (assetId) => {
      this.mediaRegistry.releaseAsset(assetId);
    };
    let prevIsPlaying = false;
    this.playUnsubscribe = this.store.subscribe(() => {
      const { isPlaying } = this.store.getState();
      if (isPlaying === prevIsPlaying) return;
      prevIsPlaying = isPlaying;
      if (isPlaying && this.playRafId === null) {
        this.startPlayLoop();
      }
    });
  }
  // --- 生命周期 ---
  /** 默认 Canvas 布局尺寸 */
  static DEFAULT_LAYOUT = {
    rulerHeight: TIMELINE_CONFIG.RULER_HEIGHT,
    trackGap: 0,
    thumbnailHeight: TIMELINE_CONFIG.VIDEO_TRACK_HEIGHT + TIMELINE_CONFIG.CLIP_PADDING * 2,
  };
  /**
   * 挂载 Canvas。
   * @param layout Canvas 布局尺寸（rulerHeight / trackGap / thumbnailHeight）
   */
  attachCanvas(canvas, containerWidth, layout) {
    this.canvas = canvas;
    const width = containerWidth ?? canvas.parentElement?.clientWidth ?? canvas.clientWidth;
    const resolvedLayout = layout ?? MediaClipEngine.DEFAULT_LAYOUT;
    this.renderer = new TimelineRenderer(
      canvas,
      () => this.store.getState(),
      this.thumbnailStore,
      this.waveformService,
      {
        colors: this.colors,
      },
    );
    this.renderer.resize(width, resolvedLayout);
    const callbacks = {
      onStateChange: (partial) => this.store.setState(partial),
      onRequestRender: () => this.requestRender(),
      onPlayheadSeek: (time) => {
        this.scheduleSeekPreview(time);
      },
      onUserInteraction: () => {
        if (this.store.getState().isPlaying) {
          this.pause();
          this.requestRender();
        }
      },
      onCropDragEnd: (dragType) => {
        const { cropRange } = this.store.getState();
        if (!cropRange) return;
        const seekTime = dragType === "crop-right" ? cropRange.end : cropRange.start;
        this.seek(seekTime);
      },
    };
    this.eventHandler = new TimelineEventHandler(canvas, callbacks, () => this.store.getState(), {
      disableScrollDrag: this.disableScrollDrag,
    });
    this.eventHandler.updateCropConfig(this.cropConfig);
    this.eventHandler.updateLayout(resolvedLayout);
    this.requestRender();
  }
  detachCanvas(clearCanvas2 = true) {
    this.eventHandler?.destroy();
    this.renderer?.destroy(clearCanvas2);
    this.eventHandler = null;
    this.renderer = null;
    this.canvas = null;
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopPlayLoop();
    this.playUnsubscribe?.();
    if (this.seekRafId !== null) {
      cancelAnimationFrame(this.seekRafId);
      this.seekRafId = null;
    }
    this.pendingSeekTime = null;
    this.thumbAbort?.abort();
    this.disposeAudioElement();
    this.detachCanvas();
    this.thumbnailStore.clear();
    this.waveformService.clear();
    this.videoFrameCache.resetCanvases();
    void this.videoFrameCache.clear();
    this.mediaRegistry.clear();
    this.store.reset();
  }
  // --- 状态订阅 ---
  getState() {
    return this.store.getState();
  }
  subscribe(listener) {
    return this.store.subscribe(listener);
  }
  // --- 核心操作 ---
  /** 判断文件是否为音频类型 */
  isAudioFile(file) {
    return file.type.startsWith("audio/");
  }
  /**
   * 添加媒体文件（视频或音频），替换现有内容
   * 自动根据文件 MIME 类型识别并选择对应处理流程
   */
  async addMedia(file) {
    this.store.setState({
      isPlaying: false,
      currentTime: 0,
    });
    this.thumbAbort?.abort();
    this.thumbAbort = null;
    this.disposeAudioElement();
    const s2 = this.store.getState();
    if (s2.clips.length > 0) {
      const oldAssetIds = new Set(s2.clips.map((c3) => c3.assetId));
      for (const oldId of oldAssetIds) {
        this.thumbnailStore.clearAsset(oldId);
        this.waveformService.clearAsset(oldId);
      }
      this.store.clearAllClips();
      for (const oldId of oldAssetIds) {
        await this.videoFrameCache.clearAsset(oldId);
      }
    }
    if (this.isAudioFile(file)) {
      await this.addAudioInternal(file);
    } else {
      await this.addVideoInternal(file);
    }
  }
  async addVideoInternal(file) {
    const asset = this.mediaRegistry.registerVideoAsset(file);
    let meta2;
    try {
      meta2 = await this.thumbnailService.getVideoMeta(asset.id);
    } catch (e2) {
      console.warn("解析视频失败：", e2);
      return;
    }
    const duration = Math.max(0.1, meta2.sourceDuration || 0.1);
    const clipId = crypto.randomUUID();
    const newClip = {
      id: clipId,
      assetId: asset.id,
      name: file.name,
      startTime: 0,
      duration,
      sourceOffset: 0,
      sourceDuration: meta2.sourceDuration,
      thumbnails: [],
      width: meta2.width,
      height: meta2.height,
    };
    this.store.addClip(newClip);
    const cropEnd = Math.min(duration, this.cropConfig.maxDuration);
    this.store.setState({
      totalDuration: duration,
      cropRange: {
        start: 0,
        end: cropEnd,
      },
      currentTime: 0,
    });
    this.disposeAudioElement();
    this.audioElement = new Audio(asset.objectUrl);
    this.audioElement.preload = "auto";
    this.requestRender();
    await this.updatePreviewFrame(0);
    this.videoFrameCache.resetCanvases();
    this.requestRender();
    const abortController = new AbortController();
    this.thumbAbort = abortController;
    const { VIDEO_TRACK_HEIGHT } = TIMELINE_CONFIG;
    const thumbHeight = VIDEO_TRACK_HEIGHT;
    const tier = getDurationTier(duration);
    const priorityRange =
      tier.widthMultiplier > 1
        ? {
            start: 0,
            end: Math.min(duration, duration / tier.widthMultiplier),
          }
        : void 0;
    this.thumbnailService.generateThumbnails(
      asset.id,
      duration,
      thumbHeight,
      meta2.width,
      meta2.height,
      {
        onUpdate: () => this.requestRender(),
        signal: abortController.signal,
        sampleInterval: tier.sampleInterval,
        priorityRange,
      },
    );
  }
  async addAudioInternal(file) {
    const asset = this.mediaRegistry.registerAudioAsset(file);
    const audioElement = new Audio(asset.objectUrl);
    audioElement.preload = "auto";
    const [peaks, playbackDuration] = await Promise.all([
      this.waveformService.extractPeaks(asset.id, file).catch((e2) => {
        console.warn("解析音频失败：", e2);
        return null;
      }),
      // 从播放元素获取时长，与实际播放时钟一致
      new Promise((resolve) => {
        audioElement.onloadedmetadata = () => resolve(audioElement.duration);
        audioElement.onerror = () => resolve(0);
      }),
    ]);
    if (!peaks) return;
    const duration = Math.max(0.1, playbackDuration || peaks.duration || 0.1);
    const clipId = crypto.randomUUID();
    const newClip = {
      id: clipId,
      type: "audio",
      assetId: asset.id,
      name: file.name,
      startTime: 0,
      duration,
      sourceOffset: 0,
      sourceDuration: duration,
      thumbnails: [],
      width: 0,
      height: 0,
    };
    this.store.addClip(newClip);
    const cropEnd = Math.min(duration, this.cropConfig.maxDuration);
    this.store.setState({
      totalDuration: duration,
      cropRange: {
        start: 0,
        end: cropEnd,
      },
      currentTime: 0,
    });
    this.disposeAudioElement();
    this.audioElement = audioElement;
    this.requestRender();
  }
  /** 获取当前活跃的音频 clip（如果有） */
  getActiveAudioClip() {
    const clips = this.store.getState().clips;
    return clips.find((c3) => c3.type === "audio") ?? null;
  }
  disposeAudioElement() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = "";
      this.audioElement = null;
    }
  }
  removeClip(clipId) {
    this.store.removeClip(clipId);
    this.requestRender();
  }
  getClips() {
    return this.store.getState().clips;
  }
  getCropRange() {
    return this.store.getState().cropRange;
  }
  setCropRange(range2) {
    if (range2) {
      const d2 = range2.end - range2.start;
      if (d2 < this.cropConfig.minDuration || d2 > this.cropConfig.maxDuration) return;
    }
    this.store.setCropRange(range2);
    this.requestRender();
  }
  setSegmentRanges(ranges, activeRange) {
    this.store.setState({
      segmentRanges: ranges,
      ...(activeRange
        ? {
            cropRange: activeRange,
          }
        : {}),
    });
    this.requestRender();
  }
  async exportCrop(options) {
    const s2 = this.store.getState();
    if (s2.clips.length === 0 || !s2.cropRange) return null;
    if (s2.isPlaying) {
      this.store.setState({
        isPlaying: false,
      });
    }
    const clip2 = s2.clips[0];
    const asset = this.mediaRegistry.getAsset(clip2.assetId);
    if (!asset) return null;
    const AAC_ALIGNMENT_BUFFER = 0.1;
    const startTime = s2.cropRange.start + clip2.sourceOffset;
    const endTime = s2.cropRange.end + clip2.sourceOffset - AAC_ALIGNMENT_BUFFER;
    const effectiveOptions = {
      ...options,
    };
    const maxRes = effectiveOptions.maxResolution;
    if (maxRes && clip2.height > 0 && clip2.height > maxRes) {
      effectiveOptions.targetHeight = maxRes;
    }
    delete effectiveOptions.maxResolution;
    return exportCroppedVideo(asset.file, startTime, endTime, effectiveOptions);
  }
  // --- 播放控制 ---
  play() {
    const s2 = this.store.getState();
    if (s2.isPlaying) return;
    if (s2.cropRange) {
      if (s2.currentTime < s2.cropRange.start || s2.currentTime >= s2.cropRange.end) {
        this.store.setState({
          currentTime: s2.cropRange.start,
        });
      }
    }
    this.ensurePlayheadVisible();
    if (this.audioElement) {
      const clip2 = s2.clips[0];
      if (clip2) {
        this.audioElement.currentTime = s2.currentTime + clip2.sourceOffset;
      }
      this.audioElement.play().catch(() => {
        if (this.store.getState().isPlaying) {
          this.pause();
        }
      });
    }
    this.store.setState({
      isPlaying: true,
    });
  }
  pause() {
    this.audioElement?.pause();
    this.store.setState({
      isPlaying: false,
    });
  }
  togglePlay() {
    const s2 = this.store.getState();
    if (s2.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    this.requestRender();
  }
  seek(time) {
    this.store.setCurrentTime(time);
    if (this.audioElement) {
      const clip2 = this.store.getState().clips[0];
      if (clip2) {
        this.audioElement.currentTime = time + clip2.sourceOffset;
      }
    }
    this.scheduleSeekPreview(time);
    this.requestRender();
  }
  // --- 预览帧 ---
  async getPreviewFrame(time) {
    const clips = this.store.getState().clips;
    const activeClip = clips.find(
      (c3) => time >= c3.startTime && time <= c3.startTime + c3.duration,
    );
    if (!activeClip || activeClip.type === "audio") return null;
    const sourceTime = time - activeClip.startTime + activeClip.sourceOffset;
    return this.videoFrameCache.getFrame(activeClip.assetId, sourceTime);
  }
  async getPreviewFrameCanvas(time) {
    const clips = this.store.getState().clips;
    const activeClip = clips.find(
      (c3) => time >= c3.startTime && time <= c3.startTime + c3.duration,
    );
    if (!activeClip || activeClip.type === "audio") return null;
    const sourceTime = time - activeClip.startTime + activeClip.sourceOffset;
    return this.videoFrameCache.getFrameCanvas(activeClip.assetId, sourceTime);
  }
  // --- 视图控制 ---
  setScale(scale2) {
    this.pauseIfPlaying();
    this.store.setScale(scale2);
    this.requestRender();
  }
  zoomIn() {
    this.pauseIfPlaying();
    const { MAX_SCALE: MAX_SCALE2, ZOOM_FACTOR } = TIMELINE_CONFIG;
    const currentScale = this.store.getState().scale;
    this.store.setScale(Math.min(MAX_SCALE2, currentScale * ZOOM_FACTOR));
    this.requestRender();
  }
  zoomOut() {
    this.pauseIfPlaying();
    const { MIN_SCALE: MIN_SCALE2, ZOOM_FACTOR } = TIMELINE_CONFIG;
    const currentScale = this.store.getState().scale;
    this.store.setScale(Math.max(MIN_SCALE2, currentScale / ZOOM_FACTOR));
    this.requestRender();
  }
  setScrollX(scrollX) {
    this.pauseIfPlaying();
    this.store.setScrollX(scrollX);
    this.requestRender();
  }
  /**
   * 调整 Canvas 尺寸。
   * @param layout Canvas 布局尺寸（rulerHeight / trackGap / thumbnailHeight）
   */
  resize(width, layout) {
    this.renderer?.resize(width, layout);
    this.eventHandler?.updateLayout(layout);
    this.requestRender();
  }
  updateCropConfig(config2) {
    this.cropConfig = config2;
    this.eventHandler?.updateCropConfig(config2);
  }
  /** 动态更新颜色方案（主题切换时调用） */
  setColors(colors) {
    this.colors = colors;
    this.renderer?.setColors(colors);
  }
  /** 如果正在播放则暂停（用于用户主动操作时间轴时） */
  pauseIfPlaying() {
    if (this.store.getState().isPlaying) {
      this.pause();
    }
  }
  // --- 内部方法 ---
  requestRender() {
    this.renderer?.markNeedsRender();
  }
  /**
   * RAF 节流的预览帧更新调度。
   * 快速拖拽播放头时，同一帧内多次调用只执行最后一次解码，
   * 避免大量中间帧的 createImageBitmap 开销。
   */
  scheduleSeekPreview(time) {
    this.pendingSeekTime = time;
    if (this.seekRafId !== null) return;
    this.seekRafId = requestAnimationFrame(() => {
      this.seekRafId = null;
      if (this.pendingSeekTime !== null) {
        void this.updatePreviewFrame(this.pendingSeekTime);
        this.pendingSeekTime = null;
      }
    });
  }
  async updatePreviewFrame(time) {
    const seq2 = ++this.seekSeq;
    const clips = this.store.getState().clips;
    const activeClip = clips.find(
      (c3) => time >= c3.startTime && time <= c3.startTime + c3.duration,
    );
    if (!activeClip) {
      this.store.setPreviewFrame(null);
      return;
    }
    if (activeClip.type === "audio") return;
    const sourceTime = time - activeClip.startTime + activeClip.sourceOffset;
    const frame2 = await this.videoFrameCache.getFrame(activeClip.assetId, sourceTime);
    if (this.seekSeq !== seq2) {
      frame2?.close();
      return;
    }
    if (frame2) {
      this.store.setPreviewFrame(frame2);
    }
  }
  async updatePreviewFrameDirect(time) {
    if (this.directDecoding) {
      this.directPendingTime = time;
      return;
    }
    this.directDecoding = true;
    try {
      const clips = this.store.getState().clips;
      const activeClip = clips.find(
        (c3) => time >= c3.startTime && time <= c3.startTime + c3.duration,
      );
      if (!activeClip || activeClip.type === "audio") return;
      const sourceTime = time - activeClip.startTime + activeClip.sourceOffset;
      const result = await this.videoFrameCache.getFrameCanvas(activeClip.assetId, sourceTime);
      if (result && this.onPreviewFrameDirect) {
        this.onPreviewFrameDirect(result.canvas, result.width, result.height);
      }
    } finally {
      this.directDecoding = false;
      if (this.directPendingTime !== null) {
        const pending2 = this.directPendingTime;
        this.directPendingTime = null;
        void this.updatePreviewFrameDirect(pending2);
      }
    }
  }
  /** 播放前确保播放头在可视区域内，不在则跳转滚动到播放头位置 */
  ensurePlayheadVisible() {
    const { currentTime, scale: scale2, scrollX } = this.store.getState();
    const { TRACK_PADDING_H } = TIMELINE_CONFIG;
    const viewWidth = this.renderer?.getWidth() ?? 0;
    if (viewWidth <= 0) return;
    const playheadX = currentTime * scale2 - scrollX + TRACK_PADDING_H;
    if (playheadX < TRACK_PADDING_H || playheadX > viewWidth - TRACK_PADDING_H) {
      const contentWidth = viewWidth - TRACK_PADDING_H * 2;
      const newScrollX = currentTime * scale2 - contentWidth * 0.1;
      this.store.setState({
        scrollX: Math.max(0, newScrollX),
      });
    }
  }
  /** 播放时自动跟随播放头：超出右边界时翻页滚动 */
  autoFollowPlayhead(time) {
    const { scale: scale2, scrollX } = this.store.getState();
    const { TRACK_PADDING_H } = TIMELINE_CONFIG;
    const viewWidth = this.renderer?.getWidth() ?? 0;
    if (viewWidth <= 0) return;
    const contentWidth = viewWidth - TRACK_PADDING_H * 2;
    const playheadX = time * scale2 - scrollX + TRACK_PADDING_H;
    if (playheadX > viewWidth - TRACK_PADDING_H) {
      const newScrollX = time * scale2 - contentWidth * 0.1;
      this.store.setStateSilent({
        scrollX: Math.max(0, newScrollX),
      });
    }
  }
  startPlayLoop() {
    this.playLastTime = performance.now();
    this.videoFrameCache.resetCanvases();
    const isAudioOnlyMode = !!this.getActiveAudioClip();
    const hasAudio = !!this.audioElement;
    const activeClip = this.store.getState().clips[0] ?? null;
    const updateTime = (now2) => {
      if (!this.store.getState().isPlaying) {
        this.playRafId = null;
        this.videoFrameCache.resetCanvases();
        this.audioElement?.pause();
        return;
      }
      const s2 = this.store.getState();
      const cropEnd = s2.cropRange ? s2.cropRange.end : s2.totalDuration;
      let newTime;
      if (hasAudio && activeClip) {
        newTime = Math.min(
          (this.audioElement?.currentTime ?? 0) - activeClip.sourceOffset,
          cropEnd,
        );
      } else {
        const delta = (now2 - this.playLastTime) / 1e3;
        this.playLastTime = now2;
        newTime = Math.min(s2.currentTime + delta, cropEnd);
      }
      if (newTime >= cropEnd) {
        this.audioElement?.pause();
        this.store.setState({
          currentTime: cropEnd,
          isPlaying: false,
        });
        this.requestRender();
        this.playRafId = null;
        this.videoFrameCache.resetCanvases();
        return;
      }
      this.store.setStateSilent({
        currentTime: newTime,
      });
      this.autoFollowPlayhead(newTime);
      if (!isAudioOnlyMode) {
        void this.updatePreviewFrameDirect(newTime);
      }
      this.requestRender();
      this.playRafId = requestAnimationFrame(updateTime);
    };
    this.playRafId = requestAnimationFrame(updateTime);
  }
  stopPlayLoop() {
    if (this.playRafId !== null) {
      cancelAnimationFrame(this.playRafId);
      this.playRafId = null;
    }
    this.audioElement?.pause();
    this.videoFrameCache.resetCanvases();
  }
}
