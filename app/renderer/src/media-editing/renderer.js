// renderer.js
import { clearCanvas, createOffscreen } from "./mosaic-shape.js";
import { drawSelectionHandles } from "./mosaic-tool.js";
export let HistoryManager$1 = class HistoryManager {
  undoStack = [];
  redoStack = [];
  limit;
  constructor(limit = 50) {
    this.limit = limit;
  }
  push(snapshot2) {
    this.undoStack.push(snapshot2);
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift();
    }
    this.redoStack.length = 0;
  }
  /**
   * 调用前需把"当前状态"传进来作为 redoStack 的入栈值。
   * 返回 undo 后应当被采用的 shapes 数组。
   */
  undo(currentSnapshot) {
    const previous2 = this.undoStack.pop();
    if (!previous2) return null;
    this.redoStack.push(currentSnapshot);
    return previous2;
  }
  redo(currentSnapshot) {
    const next2 = this.redoStack.pop();
    if (!next2) return null;
    this.undoStack.push(currentSnapshot);
    return next2;
  }
  get canUndo() {
    return this.undoStack.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }
  clear() {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
};
function generateBlur(source, radius) {
  const w3 = source.width;
  const h2 = source.height;
  const r2 = Math.max(1, Math.round(radius));
  const pad = r2 * 2;
  const tmp = createOffscreen(w3 + pad * 2, h2 + pad * 2);
  const tmpCtx = tmp.getContext("2d");
  tmpCtx.drawImage(source, pad, pad);
  tmpCtx.drawImage(source, 0, 0, w3, 1, pad, 0, w3, pad);
  tmpCtx.drawImage(source, 0, h2 - 1, w3, 1, pad, h2 + pad, w3, pad);
  tmpCtx.drawImage(source, 0, 0, 1, h2, 0, pad, pad, h2);
  tmpCtx.drawImage(source, w3 - 1, 0, 1, h2, w3 + pad, pad, pad, h2);
  tmpCtx.drawImage(source, 0, 0, 1, 1, 0, 0, pad, pad);
  tmpCtx.drawImage(source, w3 - 1, 0, 1, 1, w3 + pad, 0, pad, pad);
  tmpCtx.drawImage(source, 0, h2 - 1, 1, 1, 0, h2 + pad, pad, pad);
  tmpCtx.drawImage(source, w3 - 1, h2 - 1, 1, 1, w3 + pad, h2 + pad, pad, pad);
  const out = createOffscreen(w3, h2);
  const outCtx = out.getContext("2d");
  outCtx.filter = `blur(${r2}px)`;
  outCtx.drawImage(tmp, -pad, -pad);
  outCtx.filter = "none";
  return out;
}
function generateMosaic(source, blockSize) {
  const w3 = source.width;
  const h2 = source.height;
  const block = Math.max(2, Math.round(blockSize));
  const smallW = Math.max(1, Math.ceil(w3 / block));
  const smallH = Math.max(1, Math.ceil(h2 / block));
  const small = createOffscreen(smallW, smallH);
  const smallCtx = small.getContext("2d");
  smallCtx.imageSmoothingEnabled = true;
  smallCtx.imageSmoothingQuality = "high";
  smallCtx.drawImage(source, 0, 0, smallW, smallH);
  const out = createOffscreen(w3, h2);
  const outCtx = out.getContext("2d");
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(small, 0, 0, w3, h2);
  return out;
}
const PROCESSED_CACHE_LIMIT = 8;
export class Renderer {
  main;
  bgLayer;
  shapeLayer;
  previewLayer;
  mainCtx;
  bgCtx;
  shapeCtx;
  previewCtx;
  width = 0;
  height = 0;
  dpr = window.devicePixelRatio || 1;
  /** 当前背景图的原始像素宽度（drawBackground 时记录）。0 表示未加载图片。 */
  imageNaturalWidth = 0;
  /**
   * 实际写入 canvas 的像素 scale = max(dpr * uiScaleTier, naturalWidth / width)。
   * 当源图分辨率高于 (width * dpr * uiScaleTier) 时，按源图分辨率分配物理像素，
   * 这样显示不会因下采样变糊，导出也会保留源图细节。
   */
  get pixelScale() {
    const baseScale = this.dpr * this.uiScaleTier;
    if (this.imageNaturalWidth > 0 && this.width > 0) {
      return Math.max(baseScale, this.imageNaturalWidth / this.width);
    }
    return baseScale;
  }
  /**
   * 把连续的 uiScale 量化为整数阶梯。zoom 每微动一次就重建画布会很贵
   * （canvas.width 重置 + 三层离屏 + 背景图重新栅格化）；按整数 ceil 后，
   * 同一阶梯内复用同一份物理像素分配，跨阶梯才触发重建。下限 1，避免缩小时
   * 跌破 dpr 基线。
   */
  get uiScaleTier() {
    return Math.max(1, Math.ceil(this.uiScale));
  }
  rafId = null;
  pending = new Set();
  /**
   * UI 屏幕缩放：屏幕 CSS 像素 / canvas 逻辑像素。等于外层（如 ReactFlow）施加在
   * canvas DOM 上的 transform: scale。用于让选中虚线 / 4 角手柄保持屏幕像素大小，
   * 不随画布被一起放大。默认 1（无外层缩放）。
   */
  uiScale = 1;
  /** 当前合成画布快照（不含预览/选中），仅在工具需要"看到当前画面"时使用。 */
  composedSnapshot;
  composedCtx;
  /**
   * 全图处理版缓存：key = `${mode}-${strength}`。Map 按插入顺序枚举，
   * 上限 PROCESSED_CACHE_LIMIT，超出时丢弃最早一张（LRU），避免用户拖动滑块
   * 时缓存十几张全屏 RGBA bitmap (~每张数 MB) 占用内存。
   */
  processedCache = new Map();
  /**
   * 画过的"原图副本"。每次 drawBackground 时刷新。
   * 用作生成 processed 源的输入，避免 generateMosaic 调用 getImageData 影响 bgLayer。
   */
  bgSource;
  bgSourceCtx;
  currentBgImage = null;
  /**
   * 最近一次 drawShapes 的 shape 列表。setSize / setUiScale 跨 tier / DPR 切换
   * 都会重置离屏 canvas 的物理尺寸，从而清空已绘制的内容；保留这份引用是为了
   * 在重置后能立即把 shapes 重画到新尺寸的 layer 上，否则用户会看到画布闪空。
   */
  lastShapes = [];
  // DPR 跨屏监听
  dprMql = null;
  dprListener = null;
  drawHelpers = {
    getProcessedSource: (mode2, strength) => this.getProcessedSource(mode2, strength),
  };
  pendingSelected = null;
  constructor() {
    this.main = document.createElement("canvas");
    this.main.style.display = "block";
    this.main.style.touchAction = "none";
    this.mainCtx = this.main.getContext("2d");
    this.bgLayer = createOffscreen(1, 1);
    this.bgCtx = this.bgLayer.getContext("2d");
    this.shapeLayer = createOffscreen(1, 1);
    this.shapeCtx = this.shapeLayer.getContext("2d");
    this.previewLayer = createOffscreen(1, 1);
    this.previewCtx = this.previewLayer.getContext("2d");
    this.composedSnapshot = createOffscreen(1, 1);
    this.composedCtx = this.composedSnapshot.getContext("2d");
    this.bgSource = createOffscreen(1, 1);
    this.bgSourceCtx = this.bgSource.getContext("2d");
    this.bindDprListener();
  }
  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.applyDimensions();
  }
  /**
   * 实际把 width/height/pixelScale 应用到所有 canvas，并把现有 bg + shapes
   * 重画一遍，最后触发一次合成。canvas.width 赋值会清空像素与 ctx 状态，
   * 所以这里必须重画 — 否则 setSize / setUiScale 跨 tier / DPR 切换都会让画布闪空。
   */
  applyDimensions() {
    const { width, height } = this;
    const scale2 = this.pixelScale;
    this.main.width = Math.round(width * scale2);
    this.main.height = Math.round(height * scale2);
    this.main.style.width = `${width}px`;
    this.main.style.height = `${height}px`;
    this.mainCtx.setTransform(scale2, 0, 0, scale2, 0, 0);
    const physW = Math.round(width * scale2);
    const physH = Math.round(height * scale2);
    for (const [c3, ctx] of [
      [this.bgLayer, this.bgCtx],
      [this.shapeLayer, this.shapeCtx],
      [this.previewLayer, this.previewCtx],
    ]) {
      c3.width = physW;
      c3.height = physH;
      ctx.setTransform(scale2, 0, 0, scale2, 0, 0);
    }
    this.composedSnapshot.width = width;
    this.composedSnapshot.height = height;
    this.composedCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.bgSource.width = width;
    this.bgSource.height = height;
    this.bgSourceCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.processedCache.clear();
    this.repaintLayers();
    this.requestRender("all");
  }
  /**
   * 把 currentBgImage + lastShapes 写回各自 layer。preview 不重画（下一次 pointermove
   * 会自然刷新；保留旧的预览反而会因为坐标系已切换而错位）。
   */
  repaintLayers() {
    if (this.currentBgImage) {
      this.bgCtx.drawImage(this.currentBgImage, 0, 0, this.width, this.height);
      this.bgSourceCtx.drawImage(this.currentBgImage, 0, 0, this.width, this.height);
    }
    for (const s2 of this.lastShapes) s2.draw(this.shapeCtx, this.drawHelpers);
  }
  /**
   * matchMedia 监听 dpr 变化（跨显示器拖动）。每次变化重绑监听（query 包含旧 dpr）。
   * applyDimensions 内部会重画 bg + shapes，无需在这里再单独触发。
   */
  bindDprListener() {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(`(resolution: ${this.dpr}dppx)`);
    const listener = () => {
      const newDpr = window.devicePixelRatio || 1;
      if (newDpr === this.dpr) return;
      this.dpr = newDpr;
      this.applyDimensions();
      this.unbindDprListener();
      this.bindDprListener();
    };
    if ("addEventListener" in mql) mql.addEventListener("change", listener);
    else mql.addListener(listener);
    this.dprMql = mql;
    this.dprListener = listener;
  }
  unbindDprListener() {
    if (!this.dprMql || !this.dprListener) return;
    if ("removeEventListener" in this.dprMql) {
      this.dprMql.removeEventListener("change", this.dprListener);
    } else {
      this.dprMql.removeListener(this.dprListener);
    }
    this.dprMql = null;
    this.dprListener = null;
  }
  drawBackground(img) {
    this.currentBgImage = img;
    if (img.naturalWidth !== this.imageNaturalWidth) {
      this.imageNaturalWidth = img.naturalWidth;
      this.applyDimensions();
      return;
    }
    clearCanvas(this.bgCtx);
    this.bgCtx.drawImage(img, 0, 0, this.width, this.height);
    clearCanvas(this.bgSourceCtx);
    this.bgSourceCtx.drawImage(img, 0, 0, this.width, this.height);
    this.processedCache.clear();
    this.requestRender("all");
  }
  drawShapes(shapes) {
    this.lastShapes = shapes;
    clearCanvas(this.shapeCtx);
    for (const s2 of shapes) s2.draw(this.shapeCtx, this.drawHelpers);
    this.requestRender("shapes");
  }
  drawPreview(shape) {
    clearCanvas(this.previewCtx);
    if (shape) shape.draw(this.previewCtx, this.drawHelpers);
    this.requestRender("preview");
  }
  /**
   * 选中状态绘制：放在主 canvas 合成最上层（不污染 shapeLayer），
   * 这样移动选中框时不需要重绘整个 shapeLayer。
   */
  drawSelectionOverlay(selected2) {
    if (!selected2) return;
    selected2.drawSelection(this.mainCtx, this.uiScale);
    drawSelectionHandles(this.mainCtx, selected2.getBounds(), this.uiScale, selected2.style);
  }
  /**
   * 把当前 background + shapes 合成快照供外部采样。
   * 仅用于工具需要"看到当前画布像素"的场景，目前 mosaic 已不再依赖它。
   */
  snapshotComposed() {
    clearCanvas(this.composedCtx);
    this.composedCtx.drawImage(this.bgLayer, 0, 0, this.width, this.height);
    this.composedCtx.drawImage(this.shapeLayer, 0, 0, this.width, this.height);
    return this.composedSnapshot;
  }
  /**
   * 导出 PNG 用：以 pixelScale 输出高清 canvas（背景图、文字、形状全部保持设备像素细节）。
   */
  exportComposed() {
    const scale2 = this.pixelScale;
    const out = createOffscreen(Math.round(this.width * scale2), Math.round(this.height * scale2));
    const ctx = out.getContext("2d");
    ctx.drawImage(this.bgLayer, 0, 0);
    ctx.drawImage(this.shapeLayer, 0, 0);
    return out;
  }
  /**
   * 取或生成 (mode, strength) 全图处理版。LRU 限制最多 PROCESSED_CACHE_LIMIT 张。
   */
  getProcessedSource(mode2, strength) {
    if (this.width <= 0 || this.height <= 0) return null;
    const key2 = `${mode2}-${strength}`;
    const cached = this.processedCache.get(key2);
    if (cached) {
      this.processedCache.delete(key2);
      this.processedCache.set(key2, cached);
      return cached;
    }
    const generated =
      mode2 === "blur"
        ? generateBlur(this.bgSource, strength)
        : generateMosaic(this.bgSource, strength);
    this.processedCache.set(key2, generated);
    if (this.processedCache.size > PROCESSED_CACHE_LIMIT) {
      const oldest = this.processedCache.keys().next().value;
      if (oldest !== void 0) this.processedCache.delete(oldest);
    }
    return generated;
  }
  requestRender(job = "all") {
    this.pending.add(job);
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.composite();
    });
  }
  composite() {
    this.pending.clear();
    const scale2 = this.pixelScale;
    this.mainCtx.save();
    this.mainCtx.setTransform(scale2, 0, 0, scale2, 0, 0);
    this.mainCtx.clearRect(0, 0, this.width, this.height);
    this.mainCtx.drawImage(this.bgLayer, 0, 0, this.width, this.height);
    this.mainCtx.drawImage(this.shapeLayer, 0, 0, this.width, this.height);
    this.mainCtx.drawImage(this.previewLayer, 0, 0, this.width, this.height);
    this.drawSelectionOverlay(this.pendingSelected);
    this.mainCtx.restore();
  }
  setSelected(shape) {
    this.pendingSelected = shape;
    this.requestRender("all");
  }
  /**
   * 设置外层施加在 canvas 上的 CSS scale（屏幕像素 / 逻辑像素）。
   * 选中虚线和 4 角手柄会按 1/uiScale 反向缩放，让它们在屏幕上的视觉大小
   * 与外层缩放无关。
   *
   * 同时驱动 pixelScale：跨 tier（整数阶梯）时重建画布物理像素，让 shapes
   * 在外层放大时也能跟得上屏幕物理像素，避免被浏览器上采样变模糊。
   */
  setUiScale(scale2) {
    if (!Number.isFinite(scale2) || scale2 <= 0) return;
    if (scale2 === this.uiScale) return;
    const prevTier = this.uiScaleTier;
    this.uiScale = scale2;
    if (this.uiScaleTier !== prevTier) {
      this.applyDimensions();
    } else if (this.pendingSelected) {
      this.requestRender("all");
    }
  }
  getUiScale() {
    return this.uiScale;
  }
  destroy() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.pending.clear();
    this.processedCache.clear();
    this.unbindDprListener();
  }
}
export const DEFAULT_STYLE = {
  stroke: "#FF3B30",
  fill: void 0,
  strokeWidth: 3,
  fontSize: 18,
  fontFamily: 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
  fontWeight: 500,
  mosaicMode: "mosaic",
  mosaicShape: "rectangle",
  mosaicBlockSize: 12,
  mosaicBrushSize: 24,
  blurRadius: 8,
  tagBackground: "rgba(0, 0, 0, 0.6)",
  tagTextColor: "#FFFFFF",
  textVariant: "plain",
};
export function cloneShapeData(data2) {
  const cloned = {
    ...data2,
    style: {
      ...data2.style,
    },
  };
  if ("points" in cloned) {
    cloned.points = cloned.points.map((p3) => ({
      x: p3.x,
      y: p3.y,
    }));
  }
  return cloned;
}
