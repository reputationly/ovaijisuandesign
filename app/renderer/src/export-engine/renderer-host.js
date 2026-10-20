// 第 271 轮整份镜像：index-hd5oJZKf.js → renderer-host.js

import { WAVEFORM_RESOLUTIONS, getWaveformGenerator, getFFmpegFallback } from "./export-engine.js";
import { FFmpegFallback as S, MediaBunnyEngine as a1, MediaImportService as a2, PROXY_PRESETS as a7, PROXY_THRESHOLDS as a8, SUPPORTED_AUDIO_FORMATS as al, SUPPORTED_IMAGE_FORMATS as am, SUPPORTED_VIDEO_FORMATS as an, WaveformGenerator as aJ, createGifFrameCache as aU, createWaveformGenerator as aZ, decodeGif as a_, getGifFrameAtTime as bi, getMediaEngine as bm, getMediaImportService as bn, getRecommendedProxyPreset as bw, inferMediaType as bI, initializeMediaEngine as bN, initializeMediaImportService as bO, isAnimatedGif as bR, isSupportedFormat as bU, shouldUseProxy as c8 } from "./export-engine.js";
const DEFAULT_STYLE = {
  fillColor: "#4a9eff",
  backgroundColor: "transparent",
  rmsColor: "#2d7dd2",
  showRms: true,
  lineWidth: 1,
  mirror: true,
  verticalPadding: 0.1,
  amplitudeScale: 1
};
class WaveformRenderer {
  canvas = null;
  ctx = null;
  setCanvas(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  }
  setWaveform(_waveform) {
  }
  render(waveformData, options) {
    if (!this.canvas || !this.ctx) {
      throw new Error("Canvas not set. Call setCanvas() first.");
    }
    const style = { ...DEFAULT_STYLE, ...options.style };
    const dpr = options.devicePixelRatio || 1;
    this.canvas.width = options.width * dpr;
    this.canvas.height = options.height * dpr;
    this.ctx.scale(dpr, dpr);
    if (style.backgroundColor !== "transparent") {
      this.ctx.fillStyle = style.backgroundColor;
      this.ctx.fillRect(0, 0, options.width, options.height);
    } else {
      this.ctx.clearRect(0, 0, options.width, options.height);
    }
    const duration = options.endTime - options.startTime;
    if (duration <= 0) return;
    const startSample = Math.floor(
      options.startTime * waveformData.samplesPerSecond
    );
    const endSample = Math.ceil(
      options.endTime * waveformData.samplesPerSecond
    );
    const sampleCount = endSample - startSample;
    if (sampleCount <= 0) return;
    const padding = options.height * style.verticalPadding;
    const waveformHeight = options.height - padding * 2;
    const centerY = options.height / 2;
    const halfHeight = waveformHeight / 2 * style.amplitudeScale;
    const samplesPerPixel = sampleCount / options.width;
    this.ctx.fillStyle = style.fillColor;
    if (samplesPerPixel <= 1) {
      this.renderHighZoom(
        waveformData,
        startSample,
        endSample,
        options.width,
        centerY,
        halfHeight,
        style
      );
    } else {
      this.renderLowZoom(
        waveformData,
        startSample,
        endSample,
        options.width,
        centerY,
        halfHeight,
        samplesPerPixel,
        style
      );
    }
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  renderHighZoom(waveformData, startSample, endSample, width, centerY, halfHeight, style) {
    if (!this.ctx) return;
    const sampleCount = endSample - startSample;
    const pixelsPerSample = width / sampleCount;
    this.ctx.beginPath();
    for (let i = 0; i < sampleCount; i++) {
      const sampleIdx = startSample + i;
      if (sampleIdx < 0 || sampleIdx >= waveformData.peaks.length) continue;
      const x = i * pixelsPerSample;
      const peak = Math.min(1, waveformData.peaks[sampleIdx]);
      const peakHeight = peak * halfHeight;
      if (style.mirror) {
        this.ctx.moveTo(x, centerY - peakHeight);
        this.ctx.lineTo(x, centerY + peakHeight);
      } else {
        this.ctx.moveTo(x, centerY);
        this.ctx.lineTo(x, centerY - peakHeight);
      }
    }
    this.ctx.strokeStyle = style.fillColor;
    this.ctx.lineWidth = Math.max(1, pixelsPerSample);
    this.ctx.stroke();
    if (style.showRms) {
      this.ctx.beginPath();
      for (let i = 0; i < sampleCount; i++) {
        const sampleIdx = startSample + i;
        if (sampleIdx < 0 || sampleIdx >= waveformData.rms.length) continue;
        const x = i * pixelsPerSample;
        const rms = Math.min(1, waveformData.rms[sampleIdx]);
        const rmsHeight = rms * halfHeight;
        if (style.mirror) {
          this.ctx.moveTo(x, centerY - rmsHeight);
          this.ctx.lineTo(x, centerY + rmsHeight);
        } else {
          this.ctx.moveTo(x, centerY);
          this.ctx.lineTo(x, centerY - rmsHeight);
        }
      }
      this.ctx.strokeStyle = style.rmsColor;
      this.ctx.lineWidth = Math.max(1, pixelsPerSample);
      this.ctx.stroke();
    }
  }
  renderLowZoom(waveformData, startSample, _endSample, width, centerY, halfHeight, samplesPerPixel, style) {
    if (!this.ctx) return;
    this.ctx.beginPath();
    this.ctx.moveTo(0, centerY);
    for (let x = 0; x < width; x++) {
      const sampleStart = startSample + Math.floor(x * samplesPerPixel);
      const sampleEnd = Math.min(
        startSample + Math.floor((x + 1) * samplesPerPixel),
        waveformData.peaks.length
      );
      let maxPeak = 0;
      for (let i = sampleStart; i < sampleEnd; i++) {
        if (i >= 0 && i < waveformData.peaks.length) {
          maxPeak = Math.max(maxPeak, waveformData.peaks[i]);
        }
      }
      const peakHeight = Math.min(1, maxPeak) * halfHeight;
      this.ctx.lineTo(x, centerY - peakHeight);
    }
    if (style.mirror) {
      for (let x = width - 1; x >= 0; x--) {
        const sampleStart = startSample + Math.floor(x * samplesPerPixel);
        const sampleEnd = Math.min(
          startSample + Math.floor((x + 1) * samplesPerPixel),
          waveformData.peaks.length
        );
        let maxPeak = 0;
        for (let i = sampleStart; i < sampleEnd; i++) {
          if (i >= 0 && i < waveformData.peaks.length) {
            maxPeak = Math.max(maxPeak, waveformData.peaks[i]);
          }
        }
        const peakHeight = Math.min(1, maxPeak) * halfHeight;
        this.ctx.lineTo(x, centerY + peakHeight);
      }
    } else {
      this.ctx.lineTo(width, centerY);
    }
    this.ctx.closePath();
    this.ctx.fillStyle = style.fillColor;
    this.ctx.fill();
    if (style.showRms) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, centerY);
      for (let x = 0; x < width; x++) {
        const sampleStart = startSample + Math.floor(x * samplesPerPixel);
        const sampleEnd = Math.min(
          startSample + Math.floor((x + 1) * samplesPerPixel),
          waveformData.rms.length
        );
        let sumSquares = 0;
        let count = 0;
        for (let i = sampleStart; i < sampleEnd; i++) {
          if (i >= 0 && i < waveformData.rms.length) {
            sumSquares += waveformData.rms[i] * waveformData.rms[i];
            count++;
          }
        }
        const avgRms = count > 0 ? Math.sqrt(sumSquares / count) : 0;
        const rmsHeight = Math.min(1, avgRms) * halfHeight;
        this.ctx.lineTo(x, centerY - rmsHeight);
      }
      if (style.mirror) {
        for (let x = width - 1; x >= 0; x--) {
          const sampleStart = startSample + Math.floor(x * samplesPerPixel);
          const sampleEnd = Math.min(
            startSample + Math.floor((x + 1) * samplesPerPixel),
            waveformData.rms.length
          );
          let sumSquares = 0;
          let count = 0;
          for (let i = sampleStart; i < sampleEnd; i++) {
            if (i >= 0 && i < waveformData.rms.length) {
              sumSquares += waveformData.rms[i] * waveformData.rms[i];
              count++;
            }
          }
          const avgRms = count > 0 ? Math.sqrt(sumSquares / count) : 0;
          const rmsHeight = Math.min(1, avgRms) * halfHeight;
          this.ctx.lineTo(x, centerY + rmsHeight);
        }
      } else {
        this.ctx.lineTo(width, centerY);
      }
      this.ctx.closePath();
      this.ctx.fillStyle = style.rmsColor;
      this.ctx.fill();
    }
  }
  renderMultiResolution(multiRes, options) {
    const duration = options.endTime - options.startTime;
    const pixelsPerSecond = options.width / duration;
    const generator = getWaveformGenerator();
    const waveformData = generator.getWaveformForZoomLevel(
      multiRes,
      pixelsPerSecond
    );
    if (!waveformData) {
      const firstRes = multiRes.resolutions.values().next().value;
      if (firstRes) {
        this.render(firstRes, options);
      }
      return;
    }
    this.render(waveformData, options);
  }
  getAmplitudeAtPosition(waveformData, x, options) {
    const duration = options.endTime - options.startTime;
    const timePerPixel = duration / options.width;
    const time = options.startTime + x * timePerPixel;
    const sampleIdx = Math.floor(time * waveformData.samplesPerSecond);
    if (sampleIdx < 0 || sampleIdx >= waveformData.peaks.length) {
      return null;
    }
    const peak = waveformData.peaks[sampleIdx];
    const rms = waveformData.rms[sampleIdx];
    const db = peak > 0 ? Math.max(-60, 20 * Math.log10(peak)) : -60;
    return {
      time,
      peak,
      rms,
      db
    };
  }
  toDataURL(type = "image/png", quality) {
    if (!this.canvas) {
      throw new Error("Canvas not set");
    }
    if (this.canvas instanceof HTMLCanvasElement) {
      return this.canvas.toDataURL(type, quality);
    }
    throw new Error(
      "toDataURL not supported for OffscreenCanvas. Use toBlob() instead."
    );
  }
  async toBlob(type = "image/png", quality) {
    if (!this.canvas) {
      throw new Error("Canvas not set");
    }
    if (this.canvas instanceof OffscreenCanvas) {
      return this.canvas.convertToBlob({ type, quality });
    }
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create blob"));
          }
        },
        type,
        quality
      );
    });
  }
  static getOptimalResolution(pixelsPerSecond) {
    const idealSamples = pixelsPerSecond * 1.5;
    if (idealSamples <= WAVEFORM_RESOLUTIONS.OVERVIEW) {
      return WAVEFORM_RESOLUTIONS.OVERVIEW;
    } else if (idealSamples <= WAVEFORM_RESOLUTIONS.LOW) {
      return WAVEFORM_RESOLUTIONS.LOW;
    } else if (idealSamples <= WAVEFORM_RESOLUTIONS.MEDIUM) {
      return WAVEFORM_RESOLUTIONS.MEDIUM;
    } else if (idealSamples <= WAVEFORM_RESOLUTIONS.HIGH) {
      return WAVEFORM_RESOLUTIONS.HIGH;
    } else {
      return WAVEFORM_RESOLUTIONS.MAX;
    }
  }
}
function createWaveformImage(waveformData, width, height, style) {
  const canvas = new OffscreenCanvas(width, height);
  const renderer = new WaveformRenderer();
  renderer.setCanvas(canvas);
  renderer.render(waveformData, {
    startTime: 0,
    endTime: waveformData.duration,
    width,
    height,
    style
  });
  return canvas;
}
function createClipWaveformThumbnail(waveformData, clipStartTime, clipDuration, width, height, style) {
  const canvas = new OffscreenCanvas(width, height);
  const renderer = new WaveformRenderer();
  renderer.setCanvas(canvas);
  renderer.render(waveformData, {
    startTime: clipStartTime,
    endTime: clipStartTime + clipDuration,
    width,
    height,
    style
  });
  return canvas;
}
const QUALITY_PRESETS = {
  "4k": { width: 3840, height: 2160, videoBitrate: 35e6 },
  "1080p": { width: 1920, height: 1080, videoBitrate: 8e6 },
  "720p": { width: 1280, height: 720, videoBitrate: 5e6 },
  "480p": { width: 854, height: 480, videoBitrate: 25e5 }
};
const AUDIO_QUALITY_PRESETS = {
  high: { bitrate: 32e4, sampleRate: 48e3 },
  medium: { bitrate: 192e3, sampleRate: 44100 },
  low: { bitrate: 128e3, sampleRate: 44100 }
};
export {
  AUDIO_QUALITY_PRESETS,
  S as FFmpegFallback,
  a1 as MediaBunnyEngine,
  a2 as MediaImportService,
  a7 as PROXY_PRESETS,
  a8 as PROXY_THRESHOLDS,
  QUALITY_PRESETS,
  al as SUPPORTED_AUDIO_FORMATS,
  am as SUPPORTED_IMAGE_FORMATS,
  an as SUPPORTED_VIDEO_FORMATS,
  WAVEFORM_RESOLUTIONS,
  aJ as WaveformGenerator,
  WaveformRenderer,
  createClipWaveformThumbnail,
  aU as createGifFrameCache,
  aZ as createWaveformGenerator,
  createWaveformImage,
  a_ as decodeGif,
  getFFmpegFallback,
  bi as getGifFrameAtTime,
  bm as getMediaEngine,
  bn as getMediaImportService,
  bw as getRecommendedProxyPreset,
  getWaveformGenerator,
  bI as inferMediaType,
  bN as initializeMediaEngine,
  bO as initializeMediaImportService,
  bR as isAnimatedGif,
  bU as isSupportedFormat,
  c8 as shouldUseProxy
};
