import { estimateBytes } from "./estimate-bytes.js";

const DEFAULT_MAX_BYTES = 200 * 1024 * 1024;

function findNearest(frames, time) {
  if (frames.length === 0) return null;
  if (frames.length === 1) return frames[0];
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].timestamp < time) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  if (lo === 0) return frames[0];
  const prev = frames[lo - 1];
  const curr = frames[lo];
  return Math.abs(prev.timestamp - time) <= Math.abs(curr.timestamp - time)
    ? prev
    : curr;
}

function lowerBound(frames, target) {
  let lo = 0;
  let hi = frames.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].timestamp < target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
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
    const idx = lowerBound(frames, frame.timestamp);
    frames.splice(idx, 0, frame);
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
    const idx = lowerBound(frames, target - epsilon);
    if (idx < frames.length && Math.abs(frames[idx].timestamp - target) <= epsilon)
      return true;
    if (idx > 0 && Math.abs(frames[idx - 1].timestamp - target) <= epsilon)
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
    for (const id of Array.from(this.frameAtlas.keys())) {
      if (id === protectedId) continue;
      this.releaseAsset(id);
      if (this.currentBytes <= this.maxBytes) break;
    }
  }

  releaseFrames(frames) {
    frames?.forEach(({ img }) => {
      if (img instanceof ImageBitmap) img.close();
    });
  }
}
