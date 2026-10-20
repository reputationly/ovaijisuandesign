// 第 271 轮整份镜像：canvas2d-fallback-renderer-CWfJSdcd.js → canvas2d-fallback-renderer.js

class Canvas2DFallbackRenderer {
  type = "canvas2d";
  canvas;
  ctx = null;
  width;
  height;
  deviceLostCallbacks = [];
  layers = [];
  constructor(config) {
    this.width = config.width;
    this.height = config.height;
    this.canvas = new OffscreenCanvas(config.width, config.height);
  }
  async initialize() {
    try {
      this.ctx = this.canvas.getContext("2d");
      return this.ctx !== null;
    } catch {
      return false;
    }
  }
  isSupported() {
    return true;
  }
  destroy() {
    this.ctx = null;
    this.deviceLostCallbacks = [];
    this.layers = [];
  }
  beginFrame() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.layers = [];
  }
  renderLayer(layer) {
    this.layers.push(layer);
  }
  async endFrame() {
    if (!this.ctx) {
      throw new Error("Canvas2D context not initialized");
    }
    for (const layer of this.layers) {
      await this.renderLayerToCanvas(layer);
    }
    return createImageBitmap(this.canvas);
  }
  async renderLayerToCanvas(layer) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const { transform, opacity, borderRadius } = layer;
    let image;
    if (layer.texture instanceof ImageBitmap) {
      image = layer.texture;
    } else {
      return;
    }
    ctx.save();
    ctx.globalAlpha = opacity * transform.opacity;
    const centerX = this.width / 2 + transform.position.x;
    const centerY = this.height / 2 + transform.position.y;
    ctx.translate(centerX, centerY);
    ctx.rotate(transform.rotation * Math.PI / 180);
    ctx.scale(transform.scale.x, transform.scale.y);
    const drawX = -image.width * transform.anchor.x;
    const drawY = -image.height * transform.anchor.y;
    if (borderRadius > 0) {
      ctx.beginPath();
      this.roundRect(
        ctx,
        drawX,
        drawY,
        image.width,
        image.height,
        borderRadius
      );
      ctx.clip();
    }
    ctx.drawImage(image, drawX, drawY);
    ctx.restore();
  }
  roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  createTextureFromImage(image) {
    return image;
  }
  releaseTexture(_texture) {
  }
  applyEffects(texture, _effects) {
    return texture;
  }
  onDeviceLost(callback) {
    this.deviceLostCallbacks.push(callback);
  }
  async recreateDevice() {
    return true;
  }
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }
  getMemoryUsage() {
    return this.width * this.height * 4;
  }
  getDevice() {
    return null;
  }
}
export {
  Canvas2DFallbackRenderer
};
