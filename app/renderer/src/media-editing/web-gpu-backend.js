// web-gpu-backend.js
import {
  buildCurvePalette,
  clamp01,
  exposureFragment,
  highlightsFragment,
  hueFragment,
  saturationFragment,
  shadowsFragment,
  temperatureFragment,
  tintFragment,
  vertexShader,
  vibranceFragment,
  whitesFragment,
} from "./exposure-fragment.js";
import { BaseBackend } from "./base-backend.jsx";
import { defaultLUTParams, lutToRGBA8 } from "./default-settings.js";

const buildBlackPalette = (amount) => {
  const amt = Math.max(-100, Math.min(100, amount)) / 100;
  const strength = 0.35;
  const lowControl = clamp01(0.33 - amt * strength);
  const highControl = 0.66;
  return buildCurvePalette(lowControl, highControl);
};

const buildContrastMatrix = (amount) => {
  const t2 = Math.max(-100, Math.min(100, amount)) / 100;
  const scale2 = 1 + t2;
  const offset2 = 0.5 * (1 - scale2);
  return new Float32Array([
    scale2,
    0,
    0,
    0,
    offset2,
    0,
    scale2,
    0,
    0,
    offset2,
    0,
    0,
    scale2,
    0,
    offset2,
    0,
    0,
    0,
    1,
    0,
  ]);
};

const buildSaturationMatrix = (amount) => {
  const t2 = Math.max(-100, Math.min(100, amount)) / 100;
  const scale2 = 1 + t2;
  const lumR = 0.299;
  const lumG = 0.587;
  const lumB = 0.114;
  const inv = 1 - scale2;
  return new Float32Array([
    inv * lumR + scale2,
    inv * lumG,
    inv * lumB,
    0,
    0,
    inv * lumR,
    inv * lumG + scale2,
    inv * lumB,
    0,
    0,
    inv * lumR,
    inv * lumG,
    inv * lumB + scale2,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
  ]);
};

const passFragment = `
@group(0) @binding(0) var uTexture: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  return textureSample(uTexture, uSampler, uv);
}
`;

const brightnessFragment = `
struct Params {
  amount: f32,
}

@group(0) @binding(0) var uTexture: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

const PI: f32 = 3.1415926535897932384626433832795;

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  var color = textureSample(uTexture, uSampler, uv);
  if (params.amount >= 0.0) {
    color.r = color.r + params.amount * sin(color.r * PI);
    color.g = color.g + params.amount * sin(color.g * PI);
    color.b = color.b + params.amount * sin(color.b * PI);
  } else {
    color.r = (1.0 + params.amount) * color.r;
    color.g = (1.0 + params.amount) * color.g;
    color.b = (1.0 + params.amount) * color.b;
  }
  return color;
}
`;

const contrastFragment = saturationFragment;

const blacksFragment = `
@group(0) @binding(0) var uTexture: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;
@group(0) @binding(2) var uPaletteMap: texture_2d<f32>;
@group(0) @binding(3) var uPaletteSampler: sampler;

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let base = textureSample(uTexture, uSampler, uv);
  let r = textureSample(uPaletteMap, uPaletteSampler, vec2<f32>(base.r, 0.0)).r;
  let g = textureSample(uPaletteMap, uPaletteSampler, vec2<f32>(base.g, 0.0)).g;
  let b = textureSample(uPaletteMap, uPaletteSampler, vec2<f32>(base.b, 0.0)).b;
  return vec4<f32>(r, g, b, base.a);
}
`;

const dehazeFragment = `
struct Params {
  amount: f32,
  width: f32,
  height: f32,
  _pad: f32,
}

@group(0) @binding(0) var uTexture: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

fn hazeMap(coord: vec2<f32>) -> f32 {
  var color = vec3<f32>(1.0);
  let stepSize = vec2<f32>(1.0 / params.width, 1.0 / params.height);
  for (var i: i32 = -1; i <= 1; i = i + 1) {
    for (var j: i32 = -1; j <= 1; j = j + 1) {
      let offset = vec2<f32>(f32(i), f32(j)) * stepSize;
      let uv = clamp(coord + offset, vec2<f32>(0.0), vec2<f32>(1.0));
      let sample = textureSample(uTexture, uSampler, uv).rgb;
      color = min(color, sample);
    }
  }
  return min(color.r, min(color.g, color.b));
}

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let base = textureSample(uTexture, uSampler, uv);
  let haze = hazeMap(uv);
  let transmission = 1.0 - 0.95 * haze;
  let A = 0.95;
  let t0 = 0.1;
  let t = mix(1.0, max(t0, transmission), params.amount);
  let J = (base.rgb - A) / t + A;
  return vec4<f32>(J, base.a);
}
`;

const bloomFragment = `
struct Params {
  amount: f32,
  texelX: f32,
  texelY: f32,
  threshold: f32,
}

@group(0) @binding(0) var uTexture: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  var sum = vec4<f32>(0.0);
  let texel = vec2<f32>(params.texelX, params.texelY);
  
  for (var j: i32 = -2; j <= 2; j = j + 1) {
    for (var i: i32 = -2; i <= 2; i = i + 1) {
      sum = sum + textureSample(uTexture, uSampler, uv + vec2<f32>(f32(i), f32(j)) * texel);
    }
  }
  sum = sum / 25.0;
  
  var base = textureSample(uTexture, uSampler, uv);
  if (length(sum.rgb) > params.threshold) {
    base = base + sum * params.amount;
  }
  return base;
}
`;

const glamourFragment = `
struct Params {
  amount: f32,
  texelX: f32,
  texelY: f32,
  _pad: f32,
}

@group(0) @binding(0) var uTexture: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

fn normpdf(x: f32, sigma: f32) -> f32 {
  return 0.39894 * exp(-0.5 * x * x / (sigma * sigma)) / sigma;
}

fn luma(color: vec3<f32>) -> f32 {
  return dot(color, vec3<f32>(0.299, 0.587, 0.114));
}

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let texel = vec2<f32>(params.texelX, params.texelY);
  let sigma = 7.0;
  var final_colour = vec3<f32>(0.0);
  var Z = 0.0;
  
  // 简化版高斯模糊
  for (var i: i32 = -5; i <= 5; i = i + 1) {
    for (var j: i32 = -5; j <= 5; j = j + 1) {
      let weight = normpdf(f32(i), sigma) * normpdf(f32(j), sigma);
      final_colour = final_colour + weight * textureSample(uTexture, uSampler, uv + vec2<f32>(f32(i), f32(j)) * texel).rgb;
      Z = Z + weight;
    }
  }
  final_colour = final_colour / Z;
  
  let base = textureSample(uTexture, uSampler, uv);
  var color = vec3<f32>(luma(final_colour));
  
  // Soft light blend
  color = vec3<f32>(
    select(1.0 - 2.0 * (1.0 - base.r) * (1.0 - color.r), 2.0 * base.r * color.r, base.r <= 0.5),
    select(1.0 - 2.0 * (1.0 - base.g) * (1.0 - color.g), 2.0 * base.g * color.g, base.g <= 0.5),
    select(1.0 - 2.0 * (1.0 - base.b) * (1.0 - color.b), 2.0 * base.b * color.b, base.b <= 0.5)
  );
  
  return mix(base, vec4<f32>(color, base.a), params.amount);
}
`;

const clarityFragment = `
struct Params {
  amount: f32,
  texelX: f32,
  texelY: f32,
  _pad: f32,
}

@group(0) @binding(0) var uTexture: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

fn Lum(c: vec3<f32>) -> f32 {
  return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
}

fn BlendOverlayf(base: f32, blend: f32) -> f32 {
  return select(1.0 - 2.0 * (1.0 - base) * (1.0 - blend), 2.0 * base * blend, base < 0.5);
}

fn BlendOverlay(base: vec3<f32>, blend: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(BlendOverlayf(base.r, blend.r), BlendOverlayf(base.g, blend.g), BlendOverlayf(base.b, blend.b));
}

fn BlendVividLightf(base: f32, blend: f32) -> f32 {
  let BlendColorBurnf = select(max(1.0 - ((1.0 - base) / (2.0 * blend)), 0.0), 2.0 * blend, (2.0 * blend) == 0.0);
  let BlendColorDodgef = select(min(base / (1.0 - (2.0 * (blend - 0.5))), 1.0), 2.0 * (blend - 0.5), (2.0 * (blend - 0.5)) == 1.0);
  return select(BlendColorDodgef, BlendColorBurnf, blend < 0.5);
}

fn BlendVividLight(base: vec3<f32>, blend: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(BlendVividLightf(base.r, blend.r), BlendVividLightf(base.g, blend.g), BlendVividLightf(base.b, blend.b));
}

fn normpdf(x: f32, sigma: f32) -> f32 {
  return 0.39894 * exp(-0.5 * x * x / (sigma * sigma)) / sigma;
}

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let texel = vec2<f32>(params.texelX, params.texelY);
  let sigma = 7.0;
  var blur = vec3<f32>(0.0);
  var Z = 0.0;
  
  for (var i: i32 = -5; i <= 5; i = i + 1) {
    for (var j: i32 = -5; j <= 5; j = j + 1) {
      let weight = normpdf(f32(i), sigma) * normpdf(f32(j), sigma);
      blur = blur + weight * textureSample(uTexture, uSampler, uv + vec2<f32>(f32(i), f32(j)) * texel).rgb;
      Z = Z + weight;
    }
  }
  blur = blur / Z;
  
  let base4 = textureSample(uTexture, uSampler, uv);
  let base = base4.rgb;
  var intensity = params.amount;
  if (params.amount < 0.0) {
    intensity = params.amount / 2.0;
  }
  
  let lum = Lum(base);
  let col = vec3<f32>(lum);
  let mask = vec3<f32>(1.0 - pow(lum, 1.8));
  let layer = vec3<f32>(1.0 - Lum(blur));
  let detail = clamp(BlendVividLight(col, layer), vec3<f32>(0.0), vec3<f32>(1.0));
  let inverse = mix(1.0 - detail, detail, (intensity + 1.0) / 2.0);
  
  return vec4<f32>(BlendOverlay(base, mix(vec3<f32>(0.5), inverse, mask)), base4.a);
}
`;

const kernelFragment = `
struct Params {
  texelX: f32,
  texelY: f32,
  amount: f32,
  _pad: f32,
  // uniform 数组要求 16 字节 stride，用 3 个 vec4 装 9 个 kernel 值（最后 3 个分量是 padding）
  kernel: array<vec4<f32>, 3>,
}

@group(0) @binding(0) var uTexture: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let texel = vec2<f32>(params.texelX, params.texelY);

  let c11 = textureSample(uTexture, uSampler, uv - texel);
  let c12 = textureSample(uTexture, uSampler, vec2<f32>(uv.x, uv.y - texel.y));
  let c13 = textureSample(uTexture, uSampler, vec2<f32>(uv.x + texel.x, uv.y - texel.y));
  let c21 = textureSample(uTexture, uSampler, vec2<f32>(uv.x - texel.x, uv.y));
  let c22 = textureSample(uTexture, uSampler, uv);
  let c23 = textureSample(uTexture, uSampler, vec2<f32>(uv.x + texel.x, uv.y));
  let c31 = textureSample(uTexture, uSampler, vec2<f32>(uv.x - texel.x, uv.y + texel.y));
  let c32 = textureSample(uTexture, uSampler, vec2<f32>(uv.x, uv.y + texel.y));
  let c33 = textureSample(uTexture, uSampler, uv + texel);

  let color = c11 * params.kernel[0].x + c12 * params.kernel[0].y + c13 * params.kernel[0].z +
              c21 * params.kernel[0].w + c22 * params.kernel[1].x + c23 * params.kernel[1].y +
              c31 * params.kernel[1].z + c32 * params.kernel[1].w + c33 * params.kernel[2].x;

  return color * params.amount + (c22 * (1.0 - params.amount));
}
`;

const blurFragment = `
struct Params {
  sizeX: f32,
  sizeY: f32,
  _pad1: f32,
  _pad2: f32,
}

@group(0) @binding(0) var uTexture: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

fn random(scale: vec3<f32>, seed: f32, coord: vec3<f32>) -> f32 {
  return fract(sin(dot(coord + seed, scale)) * 43758.5453 + seed);
}

@fragment
fn main(@location(0) uv: vec2<f32>, @builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
  var color = vec4<f32>(0.0);
  var total = 0.0;
  let size = vec2<f32>(params.sizeX, params.sizeY);
  let offset = random(vec3<f32>(12.9898, 78.233, 151.7182), 0.0, fragCoord.xyz);
  
  for (var t: i32 = -30; t <= 30; t = t + 1) {
    let percent = (f32(t) + offset - 0.5) / 30.0;
    let weight = 1.0 - abs(percent);
    var sample = textureSample(uTexture, uSampler, uv + size * percent);
    sample = vec4<f32>(sample.rgb * sample.a, sample.a);
    color = color + sample * weight;
    total = total + weight;
  }
  
  color = color / total;
  return vec4<f32>(color.rgb / (color.a + 0.00001), color.a);
}
`;

const vignetteFragment = `
struct Params {
  amount: f32,
  size: f32,
  _pad1: f32,
  _pad2: f32,
}

@group(0) @binding(0) var uTexture: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  var color = textureSample(uTexture, uSampler, uv);
  let dist = distance(uv, vec2<f32>(0.5, 0.5));
  let amt = clamp(params.amount, -1.0, 1.0);
  let edge = dist * (abs(amt) * 0.75 + params.size * 2.0);
  var vignette = smoothstep(0.8, params.size * 0.799, edge);
  
  if (amt < 0.0) {
    vignette = 1.0 + (1.0 - vignette) * (-amt);
  } else {
    vignette = mix(1.0, vignette, amt);
  }
  
  color = vec4<f32>(color.rgb * vignette, color.a);
  return color;
}
`;

const grainFragment = `
struct Params {
  width: f32,
  height: f32,
  amount: f32,
  time: f32,
}

@group(0) @binding(0) var uTexture: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

fn rnm(tc: vec2<f32>) -> vec4<f32> {
  let noise = sin(dot(tc + vec2<f32>(params.time), vec2<f32>(12.9898, 78.233))) * 43758.5453;
  return vec4<f32>(
    fract(noise) * 2.0 - 1.0,
    fract(noise * 1.2154) * 2.0 - 1.0,
    fract(noise * 1.3453) * 2.0 - 1.0,
    fract(noise * 1.3647) * 2.0 - 1.0
  );
}

fn fade(t: f32) -> f32 {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let grainsize = 1.8;
  let lumamount = 1.0;
  
  let rotCoordsR = uv;
  let noiseScale = vec2<f32>(params.width / grainsize, params.height / grainsize);
  let noise = vec3<f32>(rnm(rotCoordsR * noiseScale).rgb);
  
  let tex = textureSample(uTexture, uSampler, uv);
  var col = tex.rgb;
  let lumcoeff = vec3<f32>(0.299, 0.587, 0.114);
  let luminance = mix(0.0, dot(col, lumcoeff), lumamount);
  var lum = smoothstep(0.2, 0.0, luminance);
  lum = lum + luminance;
  let finalNoise = mix(noise, vec3<f32>(0.0), pow(lum, 4.0));
  col = col + finalNoise * params.amount;

  return vec4<f32>(col, tex.a);
}
`;

const lutFragment = `
struct Params {
  intensity: f32,
  _pad0: f32,
  _pad1: f32,
  _pad2: f32,
}

@group(0) @binding(0) var uTexture: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;
@group(0) @binding(3) var uLUT: texture_3d<f32>;
@group(0) @binding(4) var uLUTSampler: sampler;

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let base = textureSample(uTexture, uSampler, uv);
  let rgb = clamp(base.rgb, vec3<f32>(0.0), vec3<f32>(1.0));
  let lutColor = textureSample(uLUT, uLUTSampler, rgb).rgb;
  let finalColor = mix(rgb, lutColor, params.intensity);

  return vec4<f32>(finalColor, base.a);
}
`;

const SHARPEN_KERNEL = [0, -1, 0, -1, 5, -1, 0, -1, 0];

const SMOOTH_KERNEL = [
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
];

export class WebGPUBackend extends BaseBackend {
  device = null;
  resources = null;
  lutParams = {
    ...defaultLUTParams,
  };
  // Hoisted scratch buffers — `drawFrame` runs at video frame rate (~60fps).
  // Allocating fresh Float32Arrays / Uint8Arrays per pass per frame would
  // produce ~20+ GC roots per frame; reusing these keeps the steady-state
  // allocation count to zero. `writeBuffer` reads bytes immediately so we
  // can safely mutate between calls.
  scratch1 = new Float32Array(1);
  scratch4 = new Float32Array(4);
  scratch16 = new Float32Array(16);
  // sharpen / smooth kernel pass (4 + 9-cell kernel + 3 padding)
  blacksRgba = new Uint8Array(256 * 4);
  lastBlacksPalette = Number.NaN;
  constructor(canvas, options = {}) {
    super(canvas, options);
  }
  getType() {
    return "webgpu";
  }
  static isSupported() {
    return typeof navigator !== "undefined" && "gpu" in navigator;
  }
  async init() {
    if (!navigator.gpu) {
      throw new Error("WebGPU not supported");
    }
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error("No WebGPU adapter found");
    }
    this.device = await adapter.requestDevice();
    this.initialized = true;
  }
  loadFromImage(image2) {
    if (!this.device) {
      throw new Error("WebGPU not initialized. Call init() first.");
    }
    const width = image2.naturalWidth || image2.width;
    const height = image2.naturalHeight || image2.height;
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.disposeResources();
    this.initResources(this.device, width, height, image2);
  }
  loadFromImageData(imageData) {
    if (!this.device) {
      throw new Error("WebGPU not initialized. Call init() first.");
    }
    const { width, height } = imageData;
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.disposeResources();
    this.initResourcesFromImageData(this.device, width, height, imageData);
  }
  loadFromVideo(video) {
    if (video.readyState < 2) {
      throw new Error(
        "Video has no decoded frame yet; wait for readyState >= HAVE_CURRENT_DATA",
      );
    }
    this.loadFromSource(video, video.videoWidth, video.videoHeight);
  }
  loadFromSource(source, width, height) {
    if (!this.device) {
      throw new Error("WebGPU not initialized. Call init() first.");
    }
    if (!width || !height) {
      throw new Error("Source dimensions unavailable");
    }
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.disposeResources();
    const context = this.canvas.getContext("webgpu");
    if (!context) throw new Error("Failed to get WebGPU context");
    const format2 = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device: this.device,
      format: format2,
      alphaMode: "opaque",
    });
    const sourceTexture = this.device.createTexture({
      size: {
        width,
        height,
      },
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.device.queue.copyExternalImageToTexture(
      {
        source,
      },
      {
        texture: sourceTexture,
      },
      {
        width,
        height,
      },
    );
    this.setupResources(
      this.device,
      context,
      format2,
      width,
      height,
      sourceTexture,
    );
  }
  updateFromVideo(video) {
    if (!this.device || !this.resources) {
      throw new Error("Backend not ready, call loadFromVideo first");
    }
    if (video.readyState < 2) return;
    this.device.queue.copyExternalImageToTexture(
      {
        source: video,
      },
      {
        texture: this.resources.sourceTexture,
      },
      {
        width: this.resources.width,
        height: this.resources.height,
      },
    );
  }
  updateFromSource(source) {
    if (!this.device || !this.resources) {
      throw new Error("Backend not ready, call loadFromSource first");
    }
    this.device.queue.copyExternalImageToTexture(
      {
        source,
      },
      {
        texture: this.resources.sourceTexture,
      },
      {
        width: this.resources.width,
        height: this.resources.height,
      },
    );
  }
  setLUT(lut) {
    if (!this.device || !this.resources) {
      throw new Error("Backend not initialized");
    }
    this.resources.bindGroupCache.get("lut")?.clear();
    if (this.resources.lut) {
      this.resources.lut.texture.destroy();
      this.resources.lut = null;
    }
    if (!lut) return;
    const rgba2 = lutToRGBA8(lut);
    const texture = this.device.createTexture({
      dimension: "3d",
      size: {
        width: lut.size,
        height: lut.size,
        depthOrArrayLayers: lut.size,
      },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this.device.queue.writeTexture(
      {
        texture,
      },
      // TS 5.7 narrows TypedArray to `Uint8Array<ArrayBufferLike>` (which
      // includes SharedArrayBuffer); WebGPU's writeTexture wants
      // `BufferSource` (no SAB). The runtime buffer is always a plain
      // ArrayBuffer here — cast keeps the source ergonomic.
      rgba2,
      {
        bytesPerRow: lut.size * 4,
        rowsPerImage: lut.size,
      },
      {
        width: lut.size,
        height: lut.size,
        depthOrArrayLayers: lut.size,
      },
    );
    const sampler = this.device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      addressModeW: "clamp-to-edge",
    });
    this.resources.lut = {
      texture,
      view: texture.createView(),
      sampler,
      size: lut.size,
    };
  }
  setLUTParams(params) {
    this.lutParams = {
      ...params,
    };
  }
  render(settings) {
    if (!this.resources) {
      return;
    }
    this.drawFrame(this.resources, settings);
  }
  /**
   * 同步读回当前 canvas 像素。
   *
   * 限制：WebGPU canvas 的 swap-chain texture 是 transient 的——一旦本帧被合成器
   * 消费，下一次 getCurrentTexture() 拿到的是新帧，旧像素已不可读。本方法用
   * `ctx.drawImage(this.canvas, 0, 0)` 走浏览器内部的 readback，依赖**调用前
   * 立刻 render() 同步过**。如果中间穿插了其他 render 或 getCurrentTexture，
   * 结果可能为空或为旧帧。需要稳定可重复读回时改用 {@link getImageDataAsync}。
   */
  getImageData() {
    if (!this.resources) {
      throw new Error("No image loaded");
    }
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) {
      throw new Error("Cannot create 2D context");
    }
    const { width, height } = this.resources;
    ctx.canvas.width = width;
    ctx.canvas.height = height;
    ctx.drawImage(this.canvas, 0, 0);
    return ctx.getImageData(0, 0, width, height);
  }
  /**
   * 异步获取 ImageData（推荐方式，稳定可重复）
   *
   * 通过 copyTextureToBuffer + mapAsync 从 ping-pong target 读回上一次 render 的
   * 像素，与 swap-chain 状态无关，不受合成器消费影响。
   */
  async getImageDataAsync() {
    if (!this.resources) {
      throw new Error("No image loaded");
    }
    const { device, width, height, targets } = this.resources;
    const bytesPerRow = Math.ceil((width * 4) / 256) * 256;
    const bufferSize = bytesPerRow * height;
    const readBuffer = device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const commandEncoder = device.createCommandEncoder();
    commandEncoder.copyTextureToBuffer(
      {
        texture: targets[0].texture,
      },
      {
        buffer: readBuffer,
        bytesPerRow,
      },
      {
        width,
        height,
      },
    );
    device.queue.submit([commandEncoder.finish()]);
    await readBuffer.mapAsync(GPUMapMode.READ);
    const data2 = new Uint8Array(readBuffer.getMappedRange());
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let y4 = 0; y4 < height; y4++) {
      const srcOffset = y4 * bytesPerRow;
      const dstOffset = y4 * width * 4;
      pixels.set(data2.subarray(srcOffset, srcOffset + width * 4), dstOffset);
    }
    readBuffer.unmap();
    readBuffer.destroy();
    return new ImageData(pixels, width, height);
  }
  dispose() {
    this.disposeResources();
    this.device?.destroy();
    this.device = null;
    this.initialized = false;
  }
  createPipeline(device, format2, fragmentShader, bindingMode = "uniform") {
    const entries2 = [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: "float",
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {
          type: "filtering",
        },
      },
    ];
    if (bindingMode === "uniform") {
      entries2.push({
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: "uniform",
        },
      });
    } else if (bindingMode === "extra-texture") {
      entries2.push(
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {
            sampleType: "float",
          },
        },
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {
            type: "filtering",
          },
        },
      );
    }
    const bindGroupLayout = device.createBindGroupLayout({
      entries: entries2,
    });
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });
    const vertexModule = device.createShaderModule({
      code: vertexShader,
    });
    const fragmentModule = device.createShaderModule({
      code: fragmentShader,
    });
    const pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: vertexModule,
        entryPoint: "main",
        buffers: [
          {
            arrayStride: 16,
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: "float32x2",
              },
              {
                shaderLocation: 1,
                offset: 8,
                format: "float32x2",
              },
            ],
          },
        ],
      },
      fragment: {
        module: fragmentModule,
        entryPoint: "main",
        targets: [
          {
            format: format2,
          },
        ],
      },
      primitive: {
        topology: "triangle-strip",
      },
    });
    return {
      pipeline,
      bindGroupLayout,
      bindingMode,
    };
  }
  createRenderTarget(device, width, height, format2) {
    const texture = device.createTexture({
      size: {
        width,
        height,
      },
      format: format2,
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.COPY_SRC,
    });
    return {
      texture,
      view: texture.createView(),
    };
  }
  createLUTPipeline(device, format2) {
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {
            sampleType: "float",
          },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {
            type: "filtering",
          },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {
            type: "uniform",
          },
        },
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {
            sampleType: "float",
            viewDimension: "3d",
          },
        },
        {
          binding: 4,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {
            type: "filtering",
          },
        },
      ],
    });
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });
    const vertexModule = device.createShaderModule({
      code: vertexShader,
    });
    const fragmentModule = device.createShaderModule({
      code: lutFragment,
    });
    const pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: vertexModule,
        entryPoint: "main",
        buffers: [
          {
            arrayStride: 16,
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: "float32x2",
              },
              {
                shaderLocation: 1,
                offset: 8,
                format: "float32x2",
              },
            ],
          },
        ],
      },
      fragment: {
        module: fragmentModule,
        entryPoint: "main",
        targets: [
          {
            format: format2,
          },
        ],
      },
      primitive: {
        topology: "triangle-strip",
      },
    });
    return {
      pipeline,
      bindGroupLayout,
    };
  }
  initResources(device, width, height, image2) {
    const context = this.canvas.getContext("webgpu");
    if (!context) {
      throw new Error("Failed to get WebGPU context");
    }
    const format2 = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format: format2,
      alphaMode: "opaque",
    });
    const sourceTexture = device.createTexture({
      size: {
        width,
        height,
      },
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) throw new Error("Failed to get 2d context");
    tempCtx.drawImage(image2, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, width, height);
    device.queue.writeTexture(
      {
        texture: sourceTexture,
      },
      imageData.data,
      {
        bytesPerRow: width * 4,
      },
      {
        width,
        height,
      },
    );
    this.setupResources(device, context, format2, width, height, sourceTexture);
  }
  initResourcesFromImageData(device, width, height, imageData) {
    const context = this.canvas.getContext("webgpu");
    if (!context) {
      throw new Error("Failed to get WebGPU context");
    }
    const format2 = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format: format2,
      alphaMode: "opaque",
    });
    const sourceTexture = device.createTexture({
      size: {
        width,
        height,
      },
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.writeTexture(
      {
        texture: sourceTexture,
      },
      imageData.data,
      {
        bytesPerRow: width * 4,
      },
      {
        width,
        height,
      },
    );
    this.setupResources(device, context, format2, width, height, sourceTexture);
  }
  setupResources(device, context, format2, width, height, sourceTexture) {
    const sampler = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    });
    const vertices = new Float32Array([
      -1, -1, 0, 1,
      // position, uv (flip y)
      1, -1, 1, 1, -1, 1, 0, 0, 1, 1, 1, 0,
    ]);
    const vertexBuffer = device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertices);
    const intermediateFormat = "rgba8unorm";
    const pipelines = {
      // 最终输出到 canvas 的 pass 管线使用 canvas 格式
      pass: this.createPipeline(device, format2, passFragment, "none"),
      // 其他管线使用 rgba8unorm 格式（与渲染目标匹配）
      vibrance: this.createPipeline(
        device,
        intermediateFormat,
        vibranceFragment,
      ),
      saturation: this.createPipeline(
        device,
        intermediateFormat,
        saturationFragment,
      ),
      temperature: this.createPipeline(
        device,
        intermediateFormat,
        temperatureFragment,
      ),
      tint: this.createPipeline(device, intermediateFormat, tintFragment),
      hue: this.createPipeline(device, intermediateFormat, hueFragment),
      brightness: this.createPipeline(
        device,
        intermediateFormat,
        brightnessFragment,
      ),
      exposure: this.createPipeline(
        device,
        intermediateFormat,
        exposureFragment,
      ),
      contrast: this.createPipeline(
        device,
        intermediateFormat,
        contrastFragment,
      ),
      blacks: this.createPipeline(
        device,
        intermediateFormat,
        blacksFragment,
        "extra-texture",
      ),
      whites: this.createPipeline(device, intermediateFormat, whitesFragment),
      highlights: this.createPipeline(
        device,
        intermediateFormat,
        highlightsFragment,
      ),
      shadows: this.createPipeline(device, intermediateFormat, shadowsFragment),
      dehaze: this.createPipeline(device, intermediateFormat, dehazeFragment),
      bloom: this.createPipeline(device, intermediateFormat, bloomFragment),
      glamour: this.createPipeline(device, intermediateFormat, glamourFragment),
      clarity: this.createPipeline(device, intermediateFormat, clarityFragment),
      kernel: this.createPipeline(device, intermediateFormat, kernelFragment),
      blur: this.createPipeline(device, intermediateFormat, blurFragment),
      vignette: this.createPipeline(
        device,
        intermediateFormat,
        vignetteFragment,
      ),
      grain: this.createPipeline(device, intermediateFormat, grainFragment),
    };
    const paletteTexture = device.createTexture({
      size: {
        width: 256,
        height: 1,
      },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    const targets = [
      this.createRenderTarget(device, width, height, "rgba8unorm"),
      this.createRenderTarget(device, width, height, "rgba8unorm"),
    ];
    const uniformBuffers = {};
    const bindGroupCache = new Map();
    for (const [name2, info2] of Object.entries(pipelines)) {
      bindGroupCache.set(name2, new Map());
      if (info2.bindingMode === "uniform") {
        uniformBuffers[name2] = device.createBuffer({
          size: 256,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
      }
    }
    const lutPipeline = this.createLUTPipeline(device, intermediateFormat);
    bindGroupCache.set("lut", new Map());
    const lutUniformBuffer = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.resources = {
      device,
      context,
      format: format2,
      width,
      height,
      sourceTexture,
      sourceTextureView: sourceTexture.createView(),
      sampler,
      vertexBuffer,
      pipelines,
      lutPipeline,
      lut: null,
      lutUniformBuffer,
      targets,
      paletteTexture,
      paletteTextureView: paletteTexture.createView(),
      uniformBuffers,
      bindGroupCache,
    };
  }
  disposeResources() {
    if (!this.resources) return;
    const {
      context,
      sourceTexture,
      vertexBuffer,
      targets,
      paletteTexture,
      uniformBuffers,
      lut,
      lutUniformBuffer,
    } = this.resources;
    sourceTexture.destroy();
    vertexBuffer.destroy();
    for (const t2 of targets) {
      t2.texture.destroy();
    }
    if (paletteTexture) paletteTexture.destroy();
    if (lut) lut.texture.destroy();
    lutUniformBuffer.destroy();
    for (const buf of Object.values(uniformBuffers)) {
      buf.destroy();
    }
    try {
      context.unconfigure();
    } catch {}
    this.resources = null;
  }
  drawFrame(resources, settings) {
    const {
      device,
      context,
      width,
      height,
      sourceTextureView,
      sampler,
      vertexBuffer,
      pipelines,
      targets,
      paletteTexture,
      paletteTextureView,
      uniformBuffers,
      bindGroupCache,
    } = resources;
    let inputTextureView = sourceTextureView;
    let pingIndex = 0;
    const commandEncoder = device.createCommandEncoder();
    const swapTarget = () => {
      const target = targets[pingIndex % 2];
      pingIndex++;
      return target;
    };
    const getOrCreateBindGroup = (pipelineName, pipelineInfo, inputView) => {
      const cache2 = bindGroupCache.get(pipelineName);
      if (!cache2) {
        throw new Error(`No bindGroup cache for pipeline ${pipelineName}`);
      }
      const cached = cache2.get(inputView);
      if (cached) return cached;
      const entries2 = [
        {
          binding: 0,
          resource: inputView,
        },
        {
          binding: 1,
          resource: sampler,
        },
      ];
      if (pipelineInfo.bindingMode === "uniform") {
        entries2.push({
          binding: 2,
          resource: {
            buffer: uniformBuffers[pipelineName],
          },
        });
      }
      if (pipelineInfo.bindingMode === "extra-texture") {
        if (!paletteTextureView) {
          throw new Error(
            "Pipeline requires palette texture but none allocated",
          );
        }
        entries2.push(
          {
            binding: 2,
            resource: paletteTextureView,
          },
          {
            binding: 3,
            resource: sampler,
          },
        );
      }
      const bindGroup = device.createBindGroup({
        layout: pipelineInfo.bindGroupLayout,
        entries: entries2,
      });
      cache2.set(inputView, bindGroup);
      return bindGroup;
    };
    const runPass = (pipelineName, uniformData, outputView) => {
      const pipelineInfo = pipelines[pipelineName];
      if (!pipelineInfo) return;
      const target = outputView ? null : swapTarget();
      const targetView = outputView || target?.view;
      if (!targetView) return;
      if (uniformData) {
        device.queue.writeBuffer(uniformBuffers[pipelineName], 0, uniformData);
      }
      const bindGroup = getOrCreateBindGroup(
        pipelineName,
        pipelineInfo,
        inputTextureView,
      );
      const passEncoder = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: targetView,
            loadOp: "clear",
            storeOp: "store",
            clearValue: {
              r: 0,
              g: 0,
              b: 0,
              a: 1,
            },
          },
        ],
      });
      passEncoder.setPipeline(pipelineInfo.pipeline);
      passEncoder.setVertexBuffer(0, vertexBuffer);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.draw(4);
      passEncoder.end();
      if (target) {
        inputTextureView = target.view;
      }
    };
    const lut = resources.lut;
    if (lut && this.lutParams.intensity > 5e-3) {
      const lutTarget = swapTarget();
      const cache2 = bindGroupCache.get("lut");
      let bindGroup = cache2.get(inputTextureView);
      if (!bindGroup) {
        bindGroup = device.createBindGroup({
          layout: resources.lutPipeline.bindGroupLayout,
          entries: [
            {
              binding: 0,
              resource: inputTextureView,
            },
            {
              binding: 1,
              resource: sampler,
            },
            {
              binding: 2,
              resource: {
                buffer: resources.lutUniformBuffer,
              },
            },
            {
              binding: 3,
              resource: lut.view,
            },
            {
              binding: 4,
              resource: lut.sampler,
            },
          ],
        });
        cache2.set(inputTextureView, bindGroup);
      }
      const params = this.scratch4;
      params[0] = this.lutParams.intensity;
      params[1] = 0;
      params[2] = 0;
      params[3] = 0;
      device.queue.writeBuffer(resources.lutUniformBuffer, 0, params.buffer);
      const passEncoder = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: lutTarget.view,
            loadOp: "clear",
            storeOp: "store",
            clearValue: {
              r: 0,
              g: 0,
              b: 0,
              a: 1,
            },
          },
        ],
      });
      passEncoder.setPipeline(resources.lutPipeline.pipeline);
      passEncoder.setVertexBuffer(0, vertexBuffer);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.draw(4);
      passEncoder.end();
      inputTextureView = lutTarget.view;
    }
    if (Math.abs(settings.vibrance) > 0.5) {
      this.scratch1[0] = settings.vibrance / 100;
      runPass("vibrance", this.scratch1.buffer);
    }
    if (Math.abs(settings.saturation) > 0.5) {
      const matrix = buildSaturationMatrix(settings.saturation);
      runPass("saturation", matrix.buffer);
    }
    if (Math.abs(settings.temperature) > 0.5) {
      this.scratch1[0] = settings.temperature / 500;
      runPass("temperature", this.scratch1.buffer);
    }
    if (Math.abs(settings.tint) > 0.5) {
      this.scratch1[0] = settings.tint / 500;
      runPass("tint", this.scratch1.buffer);
    }
    if (Math.abs(settings.hue) > 0.5) {
      this.scratch1[0] = settings.hue / 200;
      runPass("hue", this.scratch1.buffer);
    }
    if (Math.abs(settings.brightness) > 0.5) {
      this.scratch1[0] = settings.brightness / 200;
      runPass("brightness", this.scratch1.buffer);
    }
    if (Math.abs(settings.exposure) > 0.5) {
      this.scratch1[0] = settings.exposure / 100;
      runPass("exposure", this.scratch1.buffer);
    }
    if (Math.abs(settings.contrast) > 0.5) {
      const matrix = buildContrastMatrix(settings.contrast);
      runPass("contrast", matrix.buffer);
    }
    if (
      Math.abs(settings.blacks) > 0.5 &&
      paletteTexture &&
      paletteTextureView
    ) {
      if (this.lastBlacksPalette !== settings.blacks) {
        const paletteData = buildBlackPalette(settings.blacks);
        const rgbaData = this.blacksRgba;
        for (let i2 = 0; i2 < 256; i2++) {
          rgbaData[i2 * 4] = paletteData[i2 * 3];
          rgbaData[i2 * 4 + 1] = paletteData[i2 * 3 + 1];
          rgbaData[i2 * 4 + 2] = paletteData[i2 * 3 + 2];
          rgbaData[i2 * 4 + 3] = 255;
        }
        device.queue.writeTexture(
          {
            texture: paletteTexture,
          },
          rgbaData,
          {
            bytesPerRow: 256 * 4,
          },
          {
            width: 256,
            height: 1,
          },
        );
        this.lastBlacksPalette = settings.blacks;
      }
      runPass("blacks");
    }
    if (Math.abs(settings.whites) > 0.5) {
      this.scratch1[0] = settings.whites / 400;
      runPass("whites", this.scratch1.buffer);
    }
    if (Math.abs(settings.highlights) > 0.5) {
      this.scratch1[0] = settings.highlights / 100;
      runPass("highlights", this.scratch1.buffer);
    }
    if (Math.abs(settings.shadows) > 0.5) {
      this.scratch1[0] = settings.shadows / 100;
      runPass("shadows", this.scratch1.buffer);
    }
    if (Math.abs(settings.dehaze) > 0.5) {
      const data2 = this.scratch4;
      data2[0] = settings.dehaze / 100;
      data2[1] = width;
      data2[2] = height;
      data2[3] = 0;
      runPass("dehaze", data2.buffer);
    }
    if (settings.bloom > 0.5) {
      const data2 = this.scratch4;
      data2[0] = settings.bloom / 100;
      data2[1] = 1 / width;
      data2[2] = 1 / height;
      data2[3] = 0.5;
      runPass("bloom", data2.buffer);
    }
    if (settings.glamour > 0.5) {
      const data2 = this.scratch4;
      data2[0] = settings.glamour / 100;
      data2[1] = 1 / width;
      data2[2] = 1 / height;
      data2[3] = 0;
      runPass("glamour", data2.buffer);
    }
    if (Math.abs(settings.clarity) > 0.5) {
      const data2 = this.scratch4;
      data2[0] = settings.clarity / 100;
      data2[1] = 1 / width;
      data2[2] = 1 / height;
      data2[3] = 0;
      runPass("clarity", data2.buffer);
    }
    if (settings.sharpen > 0.5) {
      const data2 = this.scratch16;
      data2[0] = 1 / width;
      data2[1] = 1 / height;
      data2[2] = settings.sharpen / 100;
      data2[3] = 0;
      for (let i2 = 0; i2 < 9; i2++) data2[4 + i2] = SHARPEN_KERNEL[i2];
      data2[13] = 0;
      data2[14] = 0;
      data2[15] = 0;
      runPass("kernel", data2.buffer);
    }
    if (settings.smooth > 0.5) {
      const data2 = this.scratch16;
      data2[0] = 1 / width;
      data2[1] = 1 / height;
      data2[2] = settings.smooth / 100;
      data2[3] = 0;
      for (let i2 = 0; i2 < 9; i2++) data2[4 + i2] = SMOOTH_KERNEL[i2];
      data2[13] = 0;
      data2[14] = 0;
      data2[15] = 0;
      runPass("kernel", data2.buffer);
    }
    if (Math.abs(settings.blur) > 0.5) {
      const data2 = this.scratch4;
      data2[0] = settings.blur / width;
      data2[1] = 0;
      data2[2] = 0;
      data2[3] = 0;
      runPass("blur", data2.buffer);
      data2[0] = 0;
      data2[1] = settings.blur / height;
      runPass("blur", data2.buffer);
    }
    if (Math.abs(settings.vignette) > 0.5) {
      const data2 = this.scratch4;
      data2[0] = settings.vignette / 100;
      data2[1] = 0.25;
      data2[2] = 0;
      data2[3] = 0;
      runPass("vignette", data2.buffer);
    }
    if (Math.abs(settings.grain) > 0.5) {
      const data2 = this.scratch4;
      data2[0] = width;
      data2[1] = height;
      data2[2] = settings.grain / 800;
      data2[3] = 0;
      runPass("grain", data2.buffer);
    }
    const canvasTexture = context.getCurrentTexture();
    runPass("pass", void 0, canvasTexture.createView());
    device.queue.submit([commandEncoder.finish()]);
  }
}
