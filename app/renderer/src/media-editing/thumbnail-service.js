import { CanvasSink } from "mediabunny";

const DEFAULT_SAMPLE_INTERVAL = 0.5;

export class ThumbnailService {
  videoFrameCache;
  thumbnailStore;

  constructor(videoFrameCache, thumbnailStore) {
    this.videoFrameCache = videoFrameCache;
    this.thumbnailStore = thumbnailStore;
  }

  async getVideoMeta(assetId) {
    const decoderContext = await this.videoFrameCache.getVideoDecoderCtx(assetId);
    return {
      sourceDuration: decoderContext.sourceDuration,
      width: decoderContext.width,
      height: decoderContext.height,
    };
  }

  async generateThumbnails(
    assetId,
    duration,
    thumbHeight,
    videoWidth,
    videoHeight,
    options = {},
  ) {
    if (this.thumbnailStore.has(assetId)) return;
    const {
      onUpdate,
      signal,
      sampleInterval = DEFAULT_SAMPLE_INTERVAL,
      priorityRange,
    } = options;
    const pixelScale =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const physThumbHeight = Math.max(8, Math.round(thumbHeight * pixelScale));
    const aspect = videoWidth && videoHeight ? videoWidth / videoHeight : 16 / 9;
    const physThumbW = Math.max(12, Math.floor(physThumbHeight * aspect));
    const count = Math.max(1, Math.ceil(duration / sampleInterval));
    const allSamples = [];
    for (let i = 0; i < count; i++) {
      allSamples.push({
        time: ((i + 0.5) * duration) / count,
      });
    }
    const decoderContext = await this.videoFrameCache.getVideoDecoderCtx(assetId);
    if (signal?.aborted) return;
    const maxClamp = Math.max(0, decoderContext.sourceDuration - 1e-3);
    const clampedSamples = allSamples.map((sample) => ({
      time: Math.max(0, Math.min(sample.time, maxClamp)),
    }));
    const batches = this.splitByPriority(clampedSamples, priorityRange);
    for (const batch of batches) {
      if (signal?.aborted) return;
      if (batch.length === 0) continue;
      await this.decodeBatch(
        decoderContext.track,
        batch,
        physThumbW,
        physThumbHeight,
        assetId,
        onUpdate,
        signal,
      );
    }
  }

  async decodeBatch(
    track,
    samples,
    physThumbW,
    physThumbHeight,
    assetId,
    onUpdate,
    signal,
  ) {
    const thumbSink = new CanvasSink(track, {
      width: physThumbW,
      height: physThumbHeight,
      fit: "contain",
      poolSize: 2,
    });
    const timestamps = samples.map((sample) => sample.time);
    const canvases = thumbSink.canvasesAtTimestamps(timestamps);
    if (!canvases) return;
    const FLUSH_MIN_INTERVAL_MS = 200;
    let lastFlush = 0;
    let lastTimestamp = -Infinity;
    try {
      for (let i = 0; i < samples.length; i++) {
        if (signal?.aborted) return;
        const canvas = await canvases.next();
        if (signal?.aborted) return;
        if (!canvas.value) continue;
        const realTimestamp = canvas.value.timestamp;
        if (realTimestamp <= lastTimestamp) continue;
        lastTimestamp = realTimestamp;
        if (this.thumbnailStore.hasFrameAt(assetId, realTimestamp)) continue;
        const imageBitmap = await createImageBitmap(canvas.value.canvas);
        this.thumbnailStore.appendFrameSorted(assetId, {
          timestamp: realTimestamp,
          img: imageBitmap,
        });
        const flushTimeMs = performance.now();
        const isLast = i === samples.length - 1;
        if (isLast || flushTimeMs - lastFlush >= FLUSH_MIN_INTERVAL_MS) {
          onUpdate?.();
          lastFlush = flushTimeMs;
        }
      }
    } finally {
      try {
        await canvases.return(void 0);
      } catch {}
    }
  }

  splitByPriority(samples, range) {
    if (!range) return [samples];
    const inside = [];
    const outside = [];
    for (const sample of samples) {
      if (sample.time >= range.start && sample.time <= range.end) {
        inside.push(sample);
      } else {
        outside.push(sample);
      }
    }
    if (inside.length === 0) return [samples];
    if (outside.length === 0) return [inside];
    return [inside, outside];
  }

  async disposeAsset(assetId) {
    await this.videoFrameCache.clearAsset(assetId);
    this.thumbnailStore.clearAsset(assetId);
  }
}
