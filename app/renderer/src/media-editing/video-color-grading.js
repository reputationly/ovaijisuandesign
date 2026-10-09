// video-color-grading.js
import {
  isWebGLSupported,
  parseCubeLUT,
  selectBestBackend,
} from "./parse-cube-lut.js";
import { isWebGPUSupported } from "./base-backend.jsx";
import { defaultLUTParams, defaultSettings } from "./default-settings.js";
import { WebGPUBackend } from "./web-gpu-backend.js";
import { WebGLBackend } from "./web-gl-backend.js";

function looksLikeUrl(input) {
  return /^(?:https?:|blob:|data:|file:|\/|\.\.?\/)/.test(input.trim());
}

export class VideoColorGrading {
  canvas;
  backend = null;
  backendType;
  settings = {
    ...defaultSettings,
  };
  currentLUT = null;
  lutParams = {
    ...defaultLUTParams,
  };
  video = null;
  videoReady = false;
  rafId = null;
  rvfcId = null;
  initPromise = null;
  renderErrorLogged = false;
  constructor(options = {}) {
    this.canvas = options.canvas || document.createElement("canvas");
    this.backendType = selectBestBackend(options.backend);
  }
  getCanvas() {
    return this.canvas;
  }
  getBackendType() {
    return this.backendType;
  }
  static isWebGPUSupported() {
    return isWebGPUSupported();
  }
  static isWebGLSupported() {
    return isWebGLSupported();
  }
  getSettings() {
    return {
      ...this.settings,
    };
  }
  setSettings(newSettings) {
    this.settings = {
      ...this.settings,
      ...newSettings,
    };
  }
  resetSettings() {
    this.settings = {
      ...defaultSettings,
    };
  }
  /**
   * 绑定视频元素，建立纹理资源。
   * 内部确保视频真正解码出第一帧（GPU 已有 backing resource）后再上传到纹理，
   * 避免 WebGPU copyExternalImageToTexture 因 video 无 backing resource 而抛错。
   */
  async attachVideo(video) {
    this.stop();
    this.videoReady = false;
    await this.ensureBackend();
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      await new Promise((resolve, reject) => {
        const cleanup = () => {
          video.removeEventListener("loadeddata", onReady);
          video.removeEventListener("canplay", onReady);
          video.removeEventListener("error", onErr);
        };
        const onReady = () => {
          if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
            cleanup();
            resolve();
          }
        };
        const onErr = () => {
          cleanup();
          reject(new Error("Video failed to load"));
        };
        video.addEventListener("loadeddata", onReady);
        video.addEventListener("canplay", onReady);
        video.addEventListener("error", onErr);
        if (video.networkState === 0 && video.src) video.load();
      });
    }
    await this.ensureFirstFrameOnGPU(video);
    this.video = video;
    await this.tryLoadVideoToBackend(video, 3);
    if (this.currentLUT) {
      this.backend?.setLUTParams(this.lutParams);
    }
    this.videoReady = true;
    this.renderOnce();
  }
  /**
   * 加载 LUT（接受 .cube 文本、File、URL 字符串或已解析的 CubeLUT 对象）
   *
   * 字符串歧义解析：以 http(s)/blob/data/file/绝对或相对路径开头视为 URL，
   * 否则视为 .cube 文本内容。
   */
  async loadLUT(input) {
    await this.ensureBackend();
    let lut;
    if (typeof input === "string") {
      if (looksLikeUrl(input)) {
        const text2 = await fetch(input).then((r2) => r2.text());
        lut = parseCubeLUT(text2);
      } else {
        lut = parseCubeLUT(input);
      }
    } else if (input instanceof File) {
      const text2 = await input.text();
      lut = parseCubeLUT(text2);
    } else {
      lut = input;
    }
    if (lut === this.currentLUT) return;
    this.backend?.setLUT(lut);
    this.backend?.setLUTParams(this.lutParams);
    this.currentLUT = lut;
  }
  clearLUT() {
    if (!this.currentLUT) return;
    this.backend?.setLUT(null);
    this.currentLUT = null;
  }
  setLUTIntensity(intensity) {
    const next2 = Math.max(0, Math.min(100, intensity)) / 100;
    if (this.lutParams.intensity === next2) return;
    this.lutParams = {
      ...this.lutParams,
      intensity: next2,
    };
    this.backend?.setLUTParams(this.lutParams);
  }
  hasLUT() {
    return this.currentLUT !== null;
  }
  /**
   * 启动渲染循环：每一帧视频画面到来时上传到 GPU 并渲染。
   * 优先 video.requestVideoFrameCallback（精确到帧），否则 fallback 到 rAF。
   *
   * 闭包内 capture 当前 video / backend，避免 attachVideo 被快速重复调用时 tick 内
   * 读到混合的实例（旧 video + 新 backend，或反之）。源切换前应先调 stop()。
   */
  start() {
    if (!this.video || !this.backend || !this.videoReady) {
      return;
    }
    this.stop();
    const video = this.video;
    const backend = this.backend;
    const host = video;
    const useRVFC = typeof host.requestVideoFrameCallback === "function";
    if (useRVFC) {
      const tick = () => {
        if (this.video !== video || this.backend !== backend) return;
        try {
          backend.updateFromVideo(video);
          backend.render(this.settings);
        } catch (err) {
          this.logRenderError(err);
        }
        this.rvfcId = host.requestVideoFrameCallback(tick);
      };
      this.rvfcId = host.requestVideoFrameCallback(tick);
    } else {
      const loop = () => {
        if (this.video !== video || this.backend !== backend) return;
        try {
          backend.updateFromVideo(video);
          backend.render(this.settings);
        } catch (err) {
          this.logRenderError(err);
        }
        this.rafId = requestAnimationFrame(loop);
      };
      this.rafId = requestAnimationFrame(loop);
    }
  }
  stop() {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.rvfcId != null && this.video) {
      const host = this.video;
      host.cancelVideoFrameCallback?.(this.rvfcId);
      this.rvfcId = null;
    }
  }
  /**
   * 同步渲染当前视频帧一次。导出/seek 场景使用。
   */
  renderOnce() {
    if (!this.video || !this.backend || !this.videoReady) return;
    try {
      this.backend.updateFromVideo(this.video);
      this.backend.render(this.settings);
    } catch (err) {
      this.logRenderError(err);
    }
  }
  /**
   * 离线导出场景：保证 backend 就绪，并以传入的 source 尺寸初始化纹理资源。
   * 调用方拿到的 backend 不再绑定 <video>，可任意 renderFromSource。
   */
  async ensureReadyForSource(width, height) {
    await this.ensureBackend();
    const backend = this.backend;
    if (!backend) throw new Error("Backend not available");
    const placeholder = await createImageBitmap(new ImageData(width, height));
    try {
      backend.loadFromSource(placeholder, width, height);
    } finally {
      placeholder.close();
    }
    if (this.currentLUT) {
      backend.setLUT(this.currentLUT);
      backend.setLUTParams(this.lutParams);
    }
  }
  /**
   * 离线导出每一帧：上传任意 CanvasImageSource（VideoFrame、Canvas 等），渲染当前 settings。
   * 必须先调用 ensureReadyForSource 完成尺寸协商。
   */
  renderFromSource(source) {
    if (!this.backend) throw new Error("Backend not initialized");
    this.backend.updateFromSource(source);
    this.backend.render(this.settings);
  }
  getSize() {
    return (
      this.backend?.getSize() ?? {
        width: 0,
        height: 0,
      }
    );
  }
  dispose() {
    this.stop();
    if (this.backend) {
      this.backend.dispose();
      this.backend = null;
    }
    this.video = null;
    this.videoReady = false;
    this.currentLUT = null;
    this.initPromise = null;
  }
  async initBackend() {
    if (this.backend) return;
    if (this.backendType === "webgpu") {
      this.backend = new WebGPUBackend(this.canvas);
      try {
        await this.backend.init();
      } catch {
        this.backend = new WebGLBackend(this.canvas);
        this.backend.init();
        this.backendType = "webgl";
      }
    } else {
      this.backend = new WebGLBackend(this.canvas);
      this.backend.init();
    }
  }
  /**
   * 调用 backend.loadFromVideo，如失败则等下一帧重试，最多 attempts 次。
   * Chrome 偶发：seek 完成但 GPU 合成器还没拿到帧。
   */
  async tryLoadVideoToBackend(video, attempts) {
    let lastErr;
    for (let i2 = 0; i2 < attempts; i2++) {
      try {
        this.backend?.loadFromVideo(video);
        return;
      } catch (e2) {
        lastErr = e2;
        await new Promise((resolve) => {
          const host = video;
          if (typeof host.requestVideoFrameCallback === "function") {
            let done = false;
            host.requestVideoFrameCallback(() => {
              if (done) return;
              done = true;
              resolve();
            });
            setTimeout(() => {
              if (done) return;
              done = true;
              resolve();
            }, 200);
          } else {
            setTimeout(resolve, 100);
          }
        });
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new Error(`Failed to upload video to GPU after ${attempts} attempts`);
  }
  async ensureBackend() {
    if (!this.initPromise) {
      this.initPromise = this.initBackend();
    }
    await this.initPromise;
  }
  logRenderError(err) {
    if (this.renderErrorLogged) return;
    this.renderErrorLogged = true;
    console.error(
      "[VideoColorGrading] render failed (further errors suppressed):",
      err,
    );
  }
  /**
   * 确保 video 的第一帧已经解码并上传到 GPU 合成器层。
   * Chrome 在 video 元素从未参与渲染（display:none、未播放、未 seek）时,
   * 即使 readyState=4 也可能没有 GPU backing texture, 导致
   * WebGPU copyExternalImageToTexture 抛 "external image without back resource"。
   * 解决：play→pause 触发 GPU 解码会话建立 + seek + RVFC 三重保险。
   */
  async ensureFirstFrameOnGPU(video) {
    const wasPaused = video.paused;
    try {
      await video.play();
      if (wasPaused) video.pause();
    } catch {}
    await new Promise((resolve) => {
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      };
      video.addEventListener("seeked", onSeeked);
      try {
        const target = video.currentTime > 1e-3 ? video.currentTime : 1e-3;
        video.currentTime = target;
      } catch {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      }
      setTimeout(() => {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      }, 800);
    });
    const host = video;
    if (typeof host.requestVideoFrameCallback === "function") {
      await new Promise((resolve) => {
        let done = false;
        host.requestVideoFrameCallback(() => {
          if (done) return;
          done = true;
          resolve();
        });
        setTimeout(() => {
          if (done) return;
          done = true;
          resolve();
        }, 500);
      });
    }
  }
}
