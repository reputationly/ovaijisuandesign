import { estimateBytes } from "./estimate-bytes.js";

const DEFAULT_MAX_BYTES = 200 * 1024 * 1024;

function findNearest(frames, time) {
  if (frames.length === 0) return null;
  if (frames.length === 1) return frames[0];
  let low = 0;
  let high = frames.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (frames[middle].timestamp < time) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  if (low === 0) return frames[0];
  const prev = frames[low - 1];
  const curr = frames[low];
  return Math.abs(prev.timestamp - time) <= Math.abs(curr.timestamp - time)
    ? prev
    : curr;
}

function lowerBound(frames, target) {
  let low = 0;
  let high = frames.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (frames[middle].timestamp < target) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}

export class ThumbnailStore {
  frameAtlas = new Map();
  bytesPerAsset = new Map();
  currentBytes = 0;
  maxBytes;

  constructor(options) {
    this.maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;
  }

  setFrames(assetId, frames) {
    this.releaseAsset(assetId);
    this.frameAtlas.set(assetId, frames);
    let bytes = 0;
    for (const frame of frames) bytes += estimateBytes(frame);
    this.bytesPerAsset.set(assetId, bytes);
    this.currentBytes += bytes;
    this.evictIfNeeded(assetId);
  }

  appendFrame(assetId, frame) {
    let frames = this.frameAtlas.get(assetId);
    if (!frames) {
      frames = [];
      this.frameAtlas.set(assetId, frames);
    }
    frames.push(frame);
    const bytes = estimateBytes(frame);
    this.bytesPerAsset.set(
      assetId,
      (this.bytesPerAsset.get(assetId) ?? 0) + bytes,
    );
    this.currentBytes += bytes;
    this.evictIfNeeded(assetId);
  }

  appendFrameSorted(assetId, frame) {
    let frames = this.frameAtlas.get(assetId);
    if (!frames) {
      frames = [];
      this.frameAtlas.set(assetId, frames);
    }
    const index = lowerBound(frames, frame.timestamp);
    frames.splice(index, 0, frame);
    const bytes = estimateBytes(frame);
    this.bytesPerAsset.set(
      assetId,
      (this.bytesPerAsset.get(assetId) ?? 0) + bytes,
    );
    this.currentBytes += bytes;
    this.evictIfNeeded(assetId);
  }

  hasFrameAt(assetId, target, epsilon = 1e-3) {
    const frames = this.frameAtlas.get(assetId);
    if (!frames || frames.length === 0) return false;
    const index = lowerBound(frames, target - epsilon);
    if (index < frames.length && Math.abs(frames[index].timestamp - target) <= epsilon)
      return true;
    if (index > 0 && Math.abs(frames[index - 1].timestamp - target) <= epsilon)
      return true;
    return false;
  }

  getFrameAtTime(assetId, time) {
    const frames = this.frameAtlas.get(assetId);
    if (!frames) return null;
    const entry = findNearest(frames, time);
    return entry?.img ?? null;
  }

  getFrames(assetId) {
    return this.frameAtlas.get(assetId) ?? null;
  }

  findIndexAtOrAfter(assetId, time) {
    const frames = this.frameAtlas.get(assetId);
    if (!frames || frames.length === 0) return 0;
    return lowerBound(frames, time);
  }

  getFrameCount(assetId) {
    return this.frameAtlas.get(assetId)?.length ?? 0;
  }

  has(assetId) {
    const frames = this.frameAtlas.get(assetId);
    return !!frames && frames.length > 0;
  }

  getCurrentBytes() {
    return this.currentBytes;
  }

  clearAsset(assetId) {
    this.releaseAsset(assetId);
  }

  clear() {
    for (const frames of this.frameAtlas.values()) {
      this.releaseFrames(frames);
    }
    this.frameAtlas.clear();
    this.bytesPerAsset.clear();
    this.currentBytes = 0;
  }

  releaseAsset(assetId) {
    const frames = this.frameAtlas.get(assetId);
    if (!frames) return;
    this.releaseFrames(frames);
    this.currentBytes -= this.bytesPerAsset.get(assetId) ?? 0;
    if (this.currentBytes < 0) this.currentBytes = 0;
    this.bytesPerAsset.delete(assetId);
    this.frameAtlas.delete(assetId);
  }

  evictIfNeeded(protectedId) {
    if (this.maxBytes <= 0 || this.currentBytes <= this.maxBytes) return;
    for (const assetId of Array.from(this.frameAtlas.keys())) {
      if (assetId === protectedId) continue;
      this.releaseAsset(assetId);
      if (this.currentBytes <= this.maxBytes) break;
    }
  }

  releaseFrames(frames) {
    frames?.forEach(({ img: image }) => {
      if (image instanceof ImageBitmap) image.close();
    });
  }
}
