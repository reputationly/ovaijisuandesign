// image-color-grading.js
import {
  isWebGLSupported,
  isWebGPUSupported,
  parseCubeLUT,
  selectBestBackend,
} from "./base-backend.jsx";
import { defaultLUTParams, defaultSettings } from "./highlights-fragment.js";
import { WebGLBackend } from "./web-gl-backend.js";
import { WebGPUBackend } from "./web-gpu-backend.js";
function analyzeImageLevels(imageData) {
  const { data: data2, width, height } = imageData;
  const histogram = new Array(256).fill(0);
  for (let i2 = 0; i2 < data2.length; i2 += 4) {
    histogram[data2[i2]] += 1;
    histogram[data2[i2 + 1]] += 1;
    histogram[data2[i2 + 2]] += 1;
  }
  const threshold = Math.round((width * height) / 1e3);
  let black = 0;
  for (let i2 = 0; i2 < 256; i2++) {
    if (histogram[i2] > threshold) {
      black = i2;
      break;
    }
  }
  let white = 255;
  for (let i2 = 255; i2 >= 0; i2--) {
    if (histogram[i2] > threshold) {
      white = i2;
      break;
    }
  }
  if (black > 100) black = 100;
  if (white < 155) white = 155;
  return {
    black,
    white,
  };
}
function analyzeImageVibrance(imageData) {
  const { data: data2, width, height } = imageData;
  let saturationSum = 1;
  let brightnessSum = 1;
  for (let i2 = 0; i2 < data2.length; i2 += 4) {
    const r2 = data2[i2];
    const g2 = data2[i2 + 1];
    const b3 = data2[i2 + 2];
    const min2 = Math.min(r2, g2, b3);
    const max2 = Math.max(r2, g2, b3);
    brightnessSum += max2 / 255;
    const chroma = max2 - min2;
    if (chroma > 0) {
      saturationSum += chroma / max2;
    }
  }
  const pixelCount = width * height;
  return (saturationSum + brightnessSum) / (pixelCount * 2);
}
function analyzeImage(imageData) {
  return {
    levels: analyzeImageLevels(imageData),
    vibrance: analyzeImageVibrance(imageData),
  };
}
const presets$1 = {
  auto: {},
  blackAndWhite: {
    saturation: -100,
    contrast: 20,
    exposure: 10,
    clarity: 10,
  },
  pop: {
    highlights: 50,
    shadows: -50,
    vibrance: 50,
    saturation: 20,
    exposure: 20,
    clarity: 20,
  },
  vintage: {
    saturation: -20,
    contrast: 10,
    temperature: 15,
    grain: 30,
    vignette: 25,
  },
  vivid: {
    vibrance: 40,
    saturation: 20,
    contrast: 15,
    clarity: 20,
  },
  cinematic: {
    contrast: 25,
    highlights: -20,
    shadows: 15,
    temperature: -10,
    vignette: 30,
  },
};
function looksLikeUrl$1(input) {
  return /^(?:https?:|blob:|data:|file:|\/|\.\.?\/)/.test(input.trim());
}
export class ImageColorGrading {
  canvas;
  backend = null;
  backendType;
  settings = {
    ...defaultSettings,
  };
  imageLoaded = false;
  initPromise = null;
  currentLUT = null;
  lutParams = {
    ...defaultLUTParams,
  };
  /** 全分辨率源图（解码后缓存），导出时用。 */
  sourceBitmap = null;
  /** 实际用于预览渲染的位图；未降采样时 === sourceBitmap。 */
  previewBitmap = null;
  /** 预览最大长边；0 = 不降采样。 */
  maxPreviewSize;
  constructor(options = {}) {
    this.canvas = options.canvas || document.createElement("canvas");
    this.backendType = selectBestBackend(options.backend);
    this.maxPreviewSize = Math.max(0, options.maxPreviewSize ?? 0);
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
    this.renderIfReady();
  }
  resetSettings() {
    this.settings = {
      ...defaultSettings,
    };
    this.renderIfReady();
  }
  renderIfReady() {
    if (this.backend && this.imageLoaded) this.render();
  }
  async initBackend() {
    if (this.backend) return;
    const backendOptions = {};
    if (this.backendType === "webgpu") {
      this.backend = new WebGPUBackend(this.canvas, backendOptions);
      try {
        await this.backend.init();
      } catch (e2) {
        console.warn("WebGPU initialization failed, falling back to WebGL:", e2);
        this.backend = new WebGLBackend(this.canvas, backendOptions);
        this.backend.init();
        this.backendType = "webgl";
      }
    } else {
      this.backend = new WebGLBackend(this.canvas, backendOptions);
      this.backend.init();
    }
  }
  async ensureBackend() {
    if (!this.initPromise) {
      this.initPromise = this.initBackend();
    }
    await this.initPromise;
  }
  async loadImage(url2) {
    await this.ensureBackend();
    const bitmap = await this.decodeUrl(url2);
    await this.adoptSource(bitmap);
  }
  async loadFromImage(image2) {
    await this.ensureBackend();
    const bitmap = await this.toBitmap(image2);
    await this.adoptSource(bitmap);
  }
  async loadFromFile(file) {
    await this.ensureBackend();
    const bitmap = await this.decodeBlob(file);
    await this.adoptSource(bitmap);
  }
  /**
   * 用 createImageBitmap 异步解码，避免 new Image().onload 在主线程同步解码
   * 大图时卡住 UI。失败时回退到 HTMLImageElement 解码。
   */
  async decodeUrl(url2) {
    if (typeof createImageBitmap === "function" && typeof fetch === "function") {
      try {
        const resp = await fetch(url2, {
          mode: "cors",
        });
        if (resp.ok) return await createImageBitmap(await resp.blob());
      } catch {}
    }
    const image2 = await new Promise((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Failed to load image: ${url2}`));
      el.src = url2;
    });
    return this.toBitmap(image2);
  }
  async decodeBlob(blob) {
    if (typeof createImageBitmap === "function") {
      return createImageBitmap(blob);
    }
    const url2 = URL.createObjectURL(blob);
    try {
      return await this.decodeUrl(url2);
    } finally {
      URL.revokeObjectURL(url2);
    }
  }
  async toBitmap(image2) {
    if (typeof createImageBitmap === "function") {
      if (typeof image2.decode === "function") {
        try {
          await image2.decode();
        } catch {}
      }
      return createImageBitmap(image2);
    }
    throw new Error("createImageBitmap is not supported");
  }
  /**
   * 缓存全分辨率源图，构建（可能降采样的）预览位图并上传到后端渲染。
   */
  async adoptSource(source) {
    this.disposeBitmaps();
    const preview = await this.buildPreview(source);
    if (!this.backend) {
      if (preview !== source) preview.close();
      source.close();
      return;
    }
    this.sourceBitmap = source;
    this.previewBitmap = preview;
    this.backend.loadFromSource(preview, preview.width, preview.height);
    this.imageLoaded = true;
    this.reapplyLUT();
    this.render();
  }
  /**
   * 长边超过 maxPreviewSize 时降采样，否则复用原图（不额外分配）。
   */
  async buildPreview(source) {
    const longEdge2 = Math.max(source.width, source.height);
    if (this.maxPreviewSize <= 0 || longEdge2 <= this.maxPreviewSize) {
      return source;
    }
    const scale2 = this.maxPreviewSize / longEdge2;
    const width = Math.max(1, Math.round(source.width * scale2));
    const height = Math.max(1, Math.round(source.height * scale2));
    try {
      return await createImageBitmap(source, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: "high",
      });
    } catch {
      return source;
    }
  }
  /** loadFromSource 会重建后端资源，LUT 需要重新绑定。 */
  reapplyLUT() {
    if (!this.backend || !this.currentLUT) return;
    this.backend.setLUT(this.currentLUT);
    this.backend.setLUTParams(this.lutParams);
  }
  disposeBitmaps() {
    if (this.previewBitmap && this.previewBitmap !== this.sourceBitmap) {
      this.previewBitmap.close();
    }
    this.sourceBitmap?.close();
    this.sourceBitmap = null;
    this.previewBitmap = null;
  }
  async loadFromImageData(imageData) {
    await this.ensureBackend();
    this.backend?.loadFromImageData(imageData);
    this.imageLoaded = true;
    this.render();
  }
  /**
   * 加载 LUT（接受 .cube 文本、File、URL 字符串或已解析的 CubeLUT 对象）
   *
   * 字符串歧义解析：以 http(s)/blob/data/file/绝对或相对路径开头视为 URL，
   * 否则视为 .cube 文本内容（详见 {@link looksLikeUrl}）。
   */
  async loadLUT(input) {
    await this.ensureBackend();
    let lut;
    if (typeof input === "string") {
      if (looksLikeUrl$1(input)) {
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
    this.renderIfReady();
  }
  /**
   * 清除已加载的 LUT
   */
  clearLUT() {
    if (!this.backend || !this.currentLUT) return;
    this.backend.setLUT(null);
    this.currentLUT = null;
    this.renderIfReady();
  }
  /**
   * 设置 LUT 应用强度 (0~100)
   */
  setLUTIntensity(intensity) {
    const next2 = Math.max(0, Math.min(100, intensity)) / 100;
    if (this.lutParams.intensity === next2) return;
    this.lutParams = {
      ...this.lutParams,
      intensity: next2,
    };
    this.backend?.setLUTParams(this.lutParams);
    if (this.currentLUT) this.renderIfReady();
  }
  /**
   * 是否已加载 LUT
   */
  hasLUT() {
    return this.currentLUT !== null;
  }
  render() {
    if (!this.backend || !this.imageLoaded) {
      console.warn("No image loaded");
      return;
    }
    this.backend.render(this.settings);
  }
  toDataURL(options) {
    const format2 = options?.format || "image/png";
    const quality = options?.quality;
    const switched = this.enterFullRes();
    if (!switched) this.render();
    const url2 = this.canvas.toDataURL(format2, quality);
    if (switched) this.exitFullRes();
    return url2;
  }
  toBlob(options) {
    const format2 = options?.format || "image/png";
    const quality = options?.quality;
    const switched = this.enterFullRes();
    if (!switched) this.render();
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (switched) this.exitFullRes();
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create blob"));
          }
        },
        format2,
        quality,
      );
    });
  }
  /**
   * 临时将后端切到全分辨率源图并渲染，用于导出。若未降采样（预览即
   * 原图）则返回 false，调用方自行 render。
   */
  enterFullRes() {
    if (
      !this.backend ||
      !this.imageLoaded ||
      !this.sourceBitmap ||
      !this.previewBitmap ||
      this.previewBitmap === this.sourceBitmap
    ) {
      return false;
    }
    this.backend.loadFromSource(
      this.sourceBitmap,
      this.sourceBitmap.width,
      this.sourceBitmap.height,
    );
    this.reapplyLUT();
    this.backend.render(this.settings);
    return true;
  }
  /** 导出完毕后恢复降采样预览位图。 */
  exitFullRes() {
    if (!this.backend || !this.previewBitmap) return;
    this.backend.loadFromSource(
      this.previewBitmap,
      this.previewBitmap.width,
      this.previewBitmap.height,
    );
    this.reapplyLUT();
    this.backend.render(this.settings);
  }
  getImageData() {
    if (!this.backend) {
      throw new Error("No backend initialized");
    }
    this.render();
    return this.backend.getImageData();
  }
  getSize() {
    if (!this.backend) {
      return {
        width: 0,
        height: 0,
      };
    }
    return this.backend.getSize();
  }
  isLoaded() {
    return this.imageLoaded;
  }
  dispose() {
    if (this.backend) {
      this.backend.dispose();
      this.backend = null;
    }
    this.disposeBitmaps();
    this.imageLoaded = false;
    this.initPromise = null;
  }
  analyze() {
    if (!this.imageLoaded || !this.backend) {
      throw new Error("No image loaded");
    }
    const currentSettings = {
      ...this.settings,
    };
    this.settings = {
      ...defaultSettings,
    };
    this.render();
    const imageData = this.getImageData();
    const analysis = analyzeImage(imageData);
    this.settings = currentSettings;
    this.render();
    return analysis;
  }
  autoFix() {
    if (!this.imageLoaded || !this.backend) {
      throw new Error("No image loaded");
    }
    this.settings = {
      ...defaultSettings,
    };
    this.render();
    const imageData = this.getImageData();
    const levels = analyzeImageLevels(imageData);
    const vibrance = analyzeImageVibrance(imageData);
    const newSettings = {
      ...defaultSettings,
    };
    newSettings.whites = Math.round(255 - levels.white);
    newSettings.blacks = Math.round(levels.black);
    if (vibrance < 0.7) {
      const vibranceBoost = Math.round((0.7 - vibrance) * 100);
      newSettings.vibrance = Math.min(vibranceBoost, 50);
    }
    this.settings = newSettings;
    this.render();
    return newSettings;
  }
  applyPreset(preset2) {
    if (preset2 === "auto") {
      return this.autoFix();
    }
    const presetSettings = presets$1[preset2];
    const newSettings = {
      ...defaultSettings,
      ...presetSettings,
    };
    this.settings = newSettings;
    this.renderIfReady();
    return newSettings;
  }
}
