// 第 271 轮整份镜像：webgpu-renderer-impl-7Yg5lr3D.js → webgpu-renderer.js

const compositeShaderSource = (
  /* wgsl */
  `
struct VertexOutput {
 @builtin(position) position: vec4<f32>,
 @location(0) texCoord: vec2<f32>,
};

struct LayerUniforms {
 opacity: f32,
 padding: vec3<f32>,
};

@group(0) @binding(0) var<uniform> layer: LayerUniforms;
@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var layerTexture: texture_2d<f32>;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
 var output: VertexOutput;
 let x = f32(i32(vertexIndex & 1u) * 4 - 1);
 let y = f32(i32(vertexIndex >> 1u) * 4 - 1);
 output.position = vec4<f32>(x, y, 0.0, 1.0);
 output.texCoord = vec2<f32>((x + 1.0) * 0.5, (1.0 - y) * 0.5);
 return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
 let texColor = textureSample(layerTexture, textureSampler, input.texCoord);
 return vec4<f32>(texColor.rgb, texColor.a * layer.opacity);
}
`
);
const transformShaderSource = (
  /* wgsl */
  `
struct VertexOutput {
 @builtin(position) position: vec4<f32>,
 @location(0) texCoord: vec2<f32>,
};

struct TransformUniforms {
 matrix: mat4x4<f32>,
 opacity: f32,
 borderRadius: f32,
 cropX: f32,
 cropY: f32,
 cropWidth: f32,
 cropHeight: f32,
 padding: vec2<f32>,
};

@group(0) @binding(0) var<uniform> transform: TransformUniforms;
@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var layerTexture: texture_2d<f32>;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
 var output: VertexOutput;
 var positions = array<vec2<f32>, 6>(
 vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0),
 vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0)
 );
 var texCoords = array<vec2<f32>, 6>(
 vec2<f32>(0.0, 1.0), vec2<f32>(1.0, 1.0), vec2<f32>(0.0, 0.0),
 vec2<f32>(0.0, 0.0), vec2<f32>(1.0, 1.0), vec2<f32>(1.0, 0.0)
 );
 let pos = positions[vertexIndex];
 output.position = transform.matrix * vec4<f32>(pos, 0.0, 1.0);
 output.texCoord = texCoords[vertexIndex];
 return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
 let croppedUV = vec2<f32>(
 transform.cropX + input.texCoord.x * transform.cropWidth,
 transform.cropY + input.texCoord.y * transform.cropHeight
 );
 let texColor = textureSample(layerTexture, textureSampler, croppedUV);
 return vec4<f32>(texColor.rgb, texColor.a * transform.opacity);
}
`
);
const borderRadiusShaderSource = (
  /* wgsl */
  `
struct VertexOutput {
 @builtin(position) position: vec4<f32>,
 @location(0) texCoord: vec2<f32>,
 @location(1) localPos: vec2<f32>,
};

struct BorderRadiusUniforms {
 matrix: mat4x4<f32>,
 opacity: f32,
 radius: f32,
 aspectRatio: f32,
 smoothness: f32,
};

@group(0) @binding(0) var<uniform> uniforms: BorderRadiusUniforms;
@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var layerTexture: texture_2d<f32>;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
 var output: VertexOutput;
 var positions = array<vec2<f32>, 6>(
 vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0),
 vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0)
 );
 var texCoords = array<vec2<f32>, 6>(
 vec2<f32>(0.0, 1.0), vec2<f32>(1.0, 1.0), vec2<f32>(0.0, 0.0),
 vec2<f32>(0.0, 0.0), vec2<f32>(1.0, 1.0), vec2<f32>(1.0, 0.0)
 );
 let pos = positions[vertexIndex];
 output.position = uniforms.matrix * vec4<f32>(pos, 0.0, 1.0);
 output.texCoord = texCoords[vertexIndex];
 output.localPos = pos;
 return output;
}

fn sdRoundedRect(p: vec2<f32>, b: vec2<f32>, r: f32) -> f32 {
 let q = abs(p) - b + vec2<f32>(r);
 return min(max(q.x, q.y), 0.0) + length(max(q, vec2<f32>(0.0))) - r;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
 let texColor = textureSample(layerTexture, textureSampler, input.texCoord);
 let halfSize = vec2<f32>(1.0, 1.0);
 let clampedRadius = clamp(uniforms.radius, 0.0, 0.5);
 let dist = sdRoundedRect(input.localPos, halfSize, clampedRadius * 2.0);
 let alpha = 1.0 - smoothstep(-uniforms.smoothness, uniforms.smoothness, dist);
 return vec4<f32>(texColor.rgb, texColor.a * uniforms.opacity * alpha);
}
`
);
function createLayerUniformsBuffer(opacity) {
  const buffer = new Float32Array(8);
  buffer[0] = opacity;
  return buffer;
}
function createTransformUniformsBuffer(matrix, opacity, borderRadius, crop) {
  const buffer = new Float32Array(24);
  buffer.set(matrix, 0);
  buffer[16] = opacity;
  buffer[17] = borderRadius;
  buffer[18] = crop?.x ?? 0;
  buffer[19] = crop?.y ?? 0;
  buffer[20] = crop?.width ?? 1;
  buffer[21] = crop?.height ?? 1;
  return buffer;
}
function createTransformMatrix(position, scale, rotation, anchor, canvasWidth, canvasHeight) {
  const matrix = new Float32Array(16);
  const normalizedX = position.x / canvasWidth * 2;
  const normalizedY = position.y / canvasHeight * 2;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const anchorOffsetX = (anchor.x - 0.5) * 2;
  const anchorOffsetY = (anchor.y - 0.5) * 2;
  matrix[0] = scale.x * cos;
  matrix[1] = scale.x * sin;
  matrix[2] = 0;
  matrix[3] = 0;
  matrix[4] = -scale.y * sin;
  matrix[5] = scale.y * cos;
  matrix[6] = 0;
  matrix[7] = 0;
  matrix[8] = 0;
  matrix[9] = 0;
  matrix[10] = 1;
  matrix[11] = 0;
  const tx = normalizedX + anchorOffsetX * (1 - scale.x * cos) + anchorOffsetY * scale.y * sin;
  const ty = normalizedY + anchorOffsetY * (1 - scale.y * cos) - anchorOffsetX * scale.x * sin;
  matrix[12] = tx;
  matrix[13] = ty;
  matrix[14] = 0;
  matrix[15] = 1;
  return matrix;
}
const effectsComputeShaderSource = (
  /* wgsl */
  `
// Effect parameters uniform buffer
struct EffectUniforms {
 brightness: f32, // -1 to 1
 contrast: f32,
 saturation: f32,
 hue: f32, // 0 to 360 degrees
 temperature: f32, // -1 to 1 (cool to warm)
 tint: f32, // -1 to 1 (green to magenta)
 shadows: f32, // -1 to 1
 highlights: f32, // -1 to 1
};

// Image dimensions
struct Dimensions {
 width: u32,
 height: u32,
 padding: vec2<u32>,
};

@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var outputTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> effects: EffectUniforms;
@group(0) @binding(3) var<uniform> dimensions: Dimensions;
fn rgb2hsv(rgb: vec3<f32>) -> vec3<f32> {
 let r = rgb.r;
 let g = rgb.g;
 let b = rgb.b;

 let maxC = max(max(r, g), b);
 let minC = min(min(r, g), b);
 let delta = maxC - minC;

 var h: f32 = 0.0;
 var s: f32 = 0.0;
 let v: f32 = maxC;

 if (delta > 0.00001) {
 s = delta / maxC;

 if (maxC == r) {
 h = (g - b) / delta;
 if (g < b) {
 h = h + 6.0;
 }
 } else if (maxC == g) {
 h = 2.0 + (b - r) / delta;
 } else {
 h = 4.0 + (r - g) / delta;
 }
 h = h / 6.0;
 }

 return vec3<f32>(h, s, v);
}
fn hsv2rgb(hsv: vec3<f32>) -> vec3<f32> {
 let h = hsv.x * 6.0;
 let s = hsv.y;
 let v = hsv.z;

 let i = floor(h);
 let f = h - i;
 let p = v * (1.0 - s);
 let q = v * (1.0 - s * f);
 let t = v * (1.0 - s * (1.0 - f));

 let idx = i32(i) % 6;

 if (idx == 0) {
 return vec3<f32>(v, t, p);
 } else if (idx == 1) {
 return vec3<f32>(q, v, p);
 } else if (idx == 2) {
 return vec3<f32>(p, v, t);
 } else if (idx == 3) {
 return vec3<f32>(p, q, v);
 } else if (idx == 4) {
 return vec3<f32>(t, p, v);
 } else {
 return vec3<f32>(v, p, q);
 }
}
fn applyBrightness(color: vec3<f32>, brightness: f32) -> vec3<f32> {
 return clamp(color + vec3<f32>(brightness), vec3<f32>(0.0), vec3<f32>(1.0));
}
fn applyContrast(color: vec3<f32>, contrast: f32) -> vec3<f32> {
 return clamp((color - 0.5) * contrast + 0.5, vec3<f32>(0.0), vec3<f32>(1.0));
}
fn applySaturation(color: vec3<f32>, saturation: f32) -> vec3<f32> {
 let luminance = dot(color, vec3<f32>(0.299, 0.587, 0.114));
 return clamp(mix(vec3<f32>(luminance), color, saturation), vec3<f32>(0.0), vec3<f32>(1.0));
}
fn applyHueRotation(color: vec3<f32>, hueShift: f32) -> vec3<f32> {
 var hsv = rgb2hsv(color);
 hsv.x = fract(hsv.x + hueShift / 360.0);
 return hsv2rgb(hsv);
}
fn applyTemperature(color: vec3<f32>, temperature: f32) -> vec3<f32> {
 var result = color;
 if (temperature > 0.0) {
 result.r = min(1.0, result.r + temperature * 0.2);
 result.g = min(1.0, result.g + temperature * 0.1);
 result.b = max(0.0, result.b - temperature * 0.2);
 } else {
 result.r = max(0.0, result.r + temperature * 0.2);
 result.g = max(0.0, result.g + temperature * 0.05);
 result.b = min(1.0, result.b - temperature * 0.2);
 }
 return result;
}
fn applyTint(color: vec3<f32>, tint: f32) -> vec3<f32> {
 var result = color;
 result.r = clamp(result.r + tint * 0.1, 0.0, 1.0);
 result.g = clamp(result.g - tint * 0.2, 0.0, 1.0);
 result.b = clamp(result.b + tint * 0.1, 0.0, 1.0);
 return result;
}
fn smoothstepCustom(edge0: f32, edge1: f32, x: f32) -> f32 {
 let t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
 return t * t * (3.0 - 2.0 * t);
}
fn applyShadowsHighlights(color: vec3<f32>, shadows: f32, highlights: f32) -> vec3<f32> {
 let luminance = dot(color, vec3<f32>(0.299, 0.587, 0.114));
 let shadowWeight = 1.0 - smoothstepCustom(0.0, 0.33, luminance);
 let highlightWeight = smoothstepCustom(0.66, 1.0, luminance);
 let adjustment = shadows * shadowWeight * 0.3 + highlights * highlightWeight * 0.3;
 return clamp(color + vec3<f32>(adjustment), vec3<f32>(0.0), vec3<f32>(1.0));
}

// Main compute shader entry point
@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
 let x = global_id.x;
 let y = global_id.y;

 if (x >= dimensions.width || y >= dimensions.height) {
 return;
 }

 let coords = vec2<i32>(i32(x), i32(y));
 var color = textureLoad(inputTexture, coords, 0);
 var rgb = color.rgb;
 if (abs(effects.brightness) > 0.001) {
 rgb = applyBrightness(rgb, effects.brightness);
 }
 if (abs(effects.contrast - 1.0) > 0.001) {
 rgb = applyContrast(rgb, effects.contrast);
 }
 if (abs(effects.saturation - 1.0) > 0.001) {
 rgb = applySaturation(rgb, effects.saturation);
 }
 if (abs(effects.hue) > 0.001) {
 rgb = applyHueRotation(rgb, effects.hue);
 }
 if (abs(effects.temperature) > 0.001) {
 rgb = applyTemperature(rgb, effects.temperature);
 }
 if (abs(effects.tint) > 0.001) {
 rgb = applyTint(rgb, effects.tint);
 }
 if (abs(effects.shadows) > 0.001 || abs(effects.highlights) > 0.001) {
 rgb = applyShadowsHighlights(rgb, effects.shadows, effects.highlights);
 }

 textureStore(outputTexture, coords, vec4<f32>(rgb, color.a));
}
`
);
const blurComputeShaderSource = (
  /* wgsl */
  `
// Blur parameters
struct BlurUniforms {
 radius: f32,
 sigma: f32,
 direction: vec2<f32>,
};

struct Dimensions {
 width: u32,
 height: u32,
 padding: vec2<u32>,
};

@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var outputTexture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> blur: BlurUniforms;
@group(0) @binding(3) var<uniform> dimensions: Dimensions;

fn gaussianWeight(offset: f32, sigma: f32) -> f32 {
 let sigma2 = sigma * sigma;
 return exp(-(offset * offset) / (2.0 * sigma2)) / (sqrt(2.0 * 3.14159265) * sigma);
}

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
 let x = global_id.x;
 let y = global_id.y;

 if (x >= dimensions.width || y >= dimensions.height) {
 return;
 }

 let coords = vec2<i32>(i32(x), i32(y));

 if (blur.radius < 0.5) {
 let color = textureLoad(inputTexture, coords, 0);
 textureStore(outputTexture, coords, color);
 return;
 }

 let kernelRadius = i32(min(blur.radius, 20.0));
 let sigma = max(blur.sigma, blur.radius / 3.0);

 var colorSum = vec4<f32>(0.0);
 var weightSum: f32 = 0.0;

 for (var i = -kernelRadius; i <= kernelRadius; i = i + 1) {
 let offset = vec2<i32>(i32(blur.direction.x * f32(i)), i32(blur.direction.y * f32(i)));
 let sampleCoords = coords + offset;
 let clampedCoords = vec2<i32>(
 clamp(sampleCoords.x, 0, i32(dimensions.width) - 1),
 clamp(sampleCoords.y, 0, i32(dimensions.height) - 1)
 );
 let weight = gaussianWeight(f32(i), sigma);
 colorSum = colorSum + textureLoad(inputTexture, clampedCoords, 0) * weight;
 weightSum = weightSum + weight;
 }

 let finalColor = colorSum / weightSum;
 textureStore(outputTexture, coords, finalColor);
}
`
);
function createEffectUniformsBuffer(brightness = 0, contrast = 1, saturation = 1, hue = 0, temperature = 0, tint = 0, shadows = 0, highlights = 0) {
  const buffer = new Float32Array(8);
  buffer[0] = brightness;
  buffer[1] = contrast;
  buffer[2] = saturation;
  buffer[3] = hue;
  buffer[4] = temperature;
  buffer[5] = tint;
  buffer[6] = shadows;
  buffer[7] = highlights;
  return buffer;
}
function createBlurUniformsBuffer(radius = 0, sigma = 0, directionX = 1, directionY = 0) {
  const buffer = new Float32Array(4);
  buffer[0] = radius;
  buffer[1] = sigma > 0 ? sigma : radius / 3;
  buffer[2] = directionX;
  buffer[3] = directionY;
  return buffer;
}
function createDimensionsBuffer(width, height) {
  const buffer = new Uint32Array(4);
  buffer[0] = width;
  buffer[1] = height;
  buffer[2] = 0;
  buffer[3] = 0;
  return buffer;
}
class WebGPUEffectsProcessor {
  device;
  width;
  height;
  // Compute pipelines
  effectsPipeline = null;
  blurPipeline = null;
  // Bind group layouts
  effectsBindGroupLayout = null;
  blurBindGroupLayout = null;
  // Uniform buffers
  effectsUniformBuffer = null;
  blurUniformBuffer = null;
  dimensionsBuffer = null;
  // Intermediate textures for ping-pong rendering
  intermediateTextures = [];
  currentTextureIndex = 0;
  // Effect change tracking for re-render trigger
  effectsChangeCallbacks = [];
  lastEffectsHash = /* @__PURE__ */ new Map();
  pendingReRenders = /* @__PURE__ */ new Map();
  // Performance tracking
  lastProcessingTime = 0;
  constructor(config) {
    this.device = config.device;
    this.width = config.width;
    this.height = config.height;
  }
  async initialize() {
    try {
      this.createBindGroupLayouts();
      await this.createPipelines();
      this.createUniformBuffers();
      this.createIntermediateTextures();
      return true;
    } catch (error) {
      console.error("[WebGPUEffectsProcessor] Initialization failed:", error);
      return false;
    }
  }
  createBindGroupLayouts() {
    this.effectsBindGroupLayout = this.device.createBindGroupLayout({
      label: "Effects Bind Group Layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          texture: { sampleType: "float" }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          storageTexture: { access: "write-only", format: "rgba8unorm" }
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }
        }
      ]
    });
    this.blurBindGroupLayout = this.device.createBindGroupLayout({
      label: "Blur Bind Group Layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          texture: { sampleType: "float" }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          storageTexture: { access: "write-only", format: "rgba8unorm" }
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" }
        }
      ]
    });
  }
  async createPipelines() {
    const effectsShaderModule = this.device.createShaderModule({
      label: "Effects Compute Shader",
      code: effectsComputeShaderSource
    });
    this.effectsPipeline = this.device.createComputePipeline({
      label: "Effects Compute Pipeline",
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [this.effectsBindGroupLayout]
      }),
      compute: {
        module: effectsShaderModule,
        entryPoint: "main"
      }
    });
    const blurShaderModule = this.device.createShaderModule({
      label: "Blur Compute Shader",
      code: blurComputeShaderSource
    });
    this.blurPipeline = this.device.createComputePipeline({
      label: "Blur Compute Pipeline",
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [this.blurBindGroupLayout]
      }),
      compute: {
        module: blurShaderModule,
        entryPoint: "main"
      }
    });
  }
  createUniformBuffers() {
    this.effectsUniformBuffer = this.device.createBuffer({
      label: "Effects Uniform Buffer",
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    this.blurUniformBuffer = this.device.createBuffer({
      label: "Blur Uniform Buffer",
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    this.dimensionsBuffer = this.device.createBuffer({
      label: "Dimensions Buffer",
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const dimensionsData = createDimensionsBuffer(this.width, this.height);
    this.device.queue.writeBuffer(
      this.dimensionsBuffer,
      0,
      dimensionsData.buffer
    );
  }
  createIntermediateTextures() {
    for (const texture of this.intermediateTextures) {
      texture.destroy();
    }
    this.intermediateTextures = [];
    for (let i = 0; i < 2; i++) {
      const texture = this.device.createTexture({
        label: `Intermediate Texture ${i}`,
        size: { width: this.width, height: this.height },
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST
      });
      this.intermediateTextures.push(texture);
    }
  }
  processEffects(inputTexture, effects) {
    const startTime = performance.now();
    const enabledEffects = effects.filter((e) => e.enabled);
    if (enabledEffects.length === 0) {
      this.lastProcessingTime = performance.now() - startTime;
      return inputTexture;
    }
    const aggregatedParams = this.aggregateEffectParams(enabledEffects);
    const hasBlur = enabledEffects.some((e) => e.type === "blur");
    const blurEffect = enabledEffects.find((e) => e.type === "blur");
    const commandEncoder = this.device.createCommandEncoder({
      label: "Effects Processing"
    });
    commandEncoder.copyTextureToTexture(
      { texture: inputTexture },
      { texture: this.intermediateTextures[0] },
      { width: this.width, height: this.height }
    );
    this.currentTextureIndex = 0;
    if (this.hasColorEffects(aggregatedParams)) {
      this.applyColorEffects(commandEncoder, aggregatedParams);
    }
    if (hasBlur && blurEffect) {
      const blurParams = blurEffect.params;
      this.applyBlur(commandEncoder, {
        radius: blurParams.radius ?? 0,
        sigma: blurParams.sigma
      });
    }
    this.device.queue.submit([commandEncoder.finish()]);
    this.lastProcessingTime = performance.now() - startTime;
    return this.intermediateTextures[this.currentTextureIndex];
  }
  aggregateEffectParams(effects) {
    const params = {
      brightness: 0,
      contrast: 1,
      saturation: 1,
      hue: 0,
      temperature: 0,
      tint: 0,
      shadows: 0,
      highlights: 0
    };
    for (const effect of effects) {
      const effectParams = effect.params;
      switch (effect.type) {
        case "brightness":
          params.brightness += effectParams.value ?? 0;
          break;
        case "contrast":
          params.contrast *= effectParams.value ?? 1;
          break;
        case "saturation":
          params.saturation *= effectParams.value ?? 1;
          break;
        case "hue":
          params.hue += effectParams.rotation ?? 0;
          break;
        case "temperature":
          params.temperature += effectParams.value ?? 0;
          break;
        case "tint":
          params.tint += effectParams.value ?? 0;
          break;
        case "tonal":
          params.shadows += effectParams.shadows ?? 0;
          params.highlights += effectParams.highlights ?? 0;
          break;
      }
    }
    params.brightness = Math.max(-1, Math.min(1, params.brightness));
    params.contrast = Math.max(0, Math.min(4, params.contrast));
    params.saturation = Math.max(0, Math.min(4, params.saturation));
    params.hue = params.hue % 360;
    params.temperature = Math.max(-1, Math.min(1, params.temperature));
    params.tint = Math.max(-1, Math.min(1, params.tint));
    params.shadows = Math.max(-1, Math.min(1, params.shadows));
    params.highlights = Math.max(-1, Math.min(1, params.highlights));
    return params;
  }
  hasColorEffects(params) {
    return Math.abs(params.brightness) > 1e-3 || Math.abs(params.contrast - 1) > 1e-3 || Math.abs(params.saturation - 1) > 1e-3 || Math.abs(params.hue) > 1e-3 || Math.abs(params.temperature) > 1e-3 || Math.abs(params.tint) > 1e-3 || Math.abs(params.shadows) > 1e-3 || Math.abs(params.highlights) > 1e-3;
  }
  applyColorEffects(commandEncoder, params) {
    const uniformData = createEffectUniformsBuffer(
      params.brightness,
      params.contrast,
      params.saturation,
      params.hue,
      params.temperature,
      params.tint,
      params.shadows,
      params.highlights
    );
    this.device.queue.writeBuffer(
      this.effectsUniformBuffer,
      0,
      uniformData.buffer
    );
    const inputTexture = this.intermediateTextures[this.currentTextureIndex];
    const outputIndex = 1 - this.currentTextureIndex;
    const outputTexture = this.intermediateTextures[outputIndex];
    const bindGroup = this.device.createBindGroup({
      label: "Effects Bind Group",
      layout: this.effectsBindGroupLayout,
      entries: [
        { binding: 0, resource: inputTexture.createView() },
        { binding: 1, resource: outputTexture.createView() },
        { binding: 2, resource: { buffer: this.effectsUniformBuffer } },
        { binding: 3, resource: { buffer: this.dimensionsBuffer } }
      ]
    });
    const computePass = commandEncoder.beginComputePass({
      label: "Effects Compute Pass"
    });
    computePass.setPipeline(this.effectsPipeline);
    computePass.setBindGroup(0, bindGroup);
    const workgroupsX = Math.ceil(this.width / 16);
    const workgroupsY = Math.ceil(this.height / 16);
    computePass.dispatchWorkgroups(workgroupsX, workgroupsY, 1);
    computePass.end();
    this.currentTextureIndex = outputIndex;
  }
  applyBlur(commandEncoder, params) {
    if (params.radius < 0.5) return;
    this.applyBlurPass(commandEncoder, params, 1, 0);
    this.applyBlurPass(commandEncoder, params, 0, 1);
  }
  applyBlurPass(commandEncoder, params, dirX, dirY) {
    const uniformData = createBlurUniformsBuffer(
      params.radius,
      params.sigma ?? params.radius / 3,
      dirX,
      dirY
    );
    this.device.queue.writeBuffer(
      this.blurUniformBuffer,
      0,
      uniformData.buffer
    );
    const inputTexture = this.intermediateTextures[this.currentTextureIndex];
    const outputIndex = 1 - this.currentTextureIndex;
    const outputTexture = this.intermediateTextures[outputIndex];
    const bindGroup = this.device.createBindGroup({
      label: `Blur Bind Group (${dirX},${dirY})`,
      layout: this.blurBindGroupLayout,
      entries: [
        { binding: 0, resource: inputTexture.createView() },
        { binding: 1, resource: outputTexture.createView() },
        { binding: 2, resource: { buffer: this.blurUniformBuffer } },
        { binding: 3, resource: { buffer: this.dimensionsBuffer } }
      ]
    });
    const computePass = commandEncoder.beginComputePass({
      label: `Blur Compute Pass (${dirX},${dirY})`
    });
    computePass.setPipeline(this.blurPipeline);
    computePass.setBindGroup(0, bindGroup);
    const workgroupsX = Math.ceil(this.width / 16);
    const workgroupsY = Math.ceil(this.height / 16);
    computePass.dispatchWorkgroups(workgroupsX, workgroupsY, 1);
    computePass.end();
    this.currentTextureIndex = outputIndex;
  }
  onEffectsChange(callback) {
    this.effectsChangeCallbacks.push(callback);
  }
  notifyEffectsChanged(clipId, effects) {
    const effectsHash = this.calculateEffectsHash(effects);
    const previousHash = this.lastEffectsHash.get(clipId);
    if (effectsHash === previousHash) {
      return;
    }
    this.lastEffectsHash.set(clipId, effectsHash);
    const pendingTimeout = this.pendingReRenders.get(clipId);
    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
    }
    const timeout = setTimeout(() => {
      this.pendingReRenders.delete(clipId);
      for (const callback of this.effectsChangeCallbacks) {
        callback(clipId, effects);
      }
    }, 16);
    this.pendingReRenders.set(clipId, timeout);
  }
  calculateEffectsHash(effects) {
    return effects.filter((e) => e.enabled).map((e) => `${e.id}:${e.type}:${JSON.stringify(e.params)}`).join("|");
  }
  getLastProcessingTime() {
    return this.lastProcessingTime;
  }
  resize(width, height) {
    this.width = width;
    this.height = height;
    if (this.dimensionsBuffer) {
      const dimensionsData = createDimensionsBuffer(width, height);
      this.device.queue.writeBuffer(
        this.dimensionsBuffer,
        0,
        dimensionsData.buffer
      );
    }
    this.createIntermediateTextures();
  }
  dispose() {
    for (const timeout of this.pendingReRenders.values()) {
      clearTimeout(timeout);
    }
    this.pendingReRenders.clear();
    for (const texture of this.intermediateTextures) {
      texture.destroy();
    }
    this.intermediateTextures = [];
    this.effectsUniformBuffer?.destroy();
    this.blurUniformBuffer?.destroy();
    this.dimensionsBuffer?.destroy();
    this.effectsUniformBuffer = null;
    this.blurUniformBuffer = null;
    this.dimensionsBuffer = null;
    this.effectsChangeCallbacks = [];
    this.lastEffectsHash.clear();
  }
}
const DEFAULT_MAX_SIZE = 500 * 1024 * 1024;
function getCacheKey(clipId, frameTime) {
  return `${clipId}:${frameTime.toFixed(6)}`;
}
class TextureCache {
  cache = /* @__PURE__ */ new Map();
  maxSize;
  currentSize = 0;
  onEvict;
  constructor(config = {}) {
    this.maxSize = config.maxSize ?? DEFAULT_MAX_SIZE;
    this.onEvict = config.onEvict;
  }
  get(clipId, frameTime) {
    const key = getCacheKey(clipId, frameTime);
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    entry.lastUsed = Date.now();
    return entry.texture;
  }
  set(clipId, frameTime, texture, size) {
    const key = getCacheKey(clipId, frameTime);
    if (this.cache.has(key)) {
      this.evictKey(key);
    }
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }
    const entry = {
      texture,
      lastUsed: Date.now(),
      size,
      clipId,
      frameTime
    };
    this.cache.set(key, entry);
    this.currentSize += size;
  }
  evict(clipId) {
    const keysToRemove = [];
    for (const [key, entry] of this.cache.entries()) {
      if (entry.clipId === clipId) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      this.evictKey(key);
    }
  }
  evictLRU() {
    if (this.cache.size === 0) {
      return;
    }
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.evictKey(oldestKey);
    }
  }
  evictKey(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return;
    }
    if (this.onEvict) {
      this.onEvict(entry);
    }
    entry.texture.destroy();
    this.currentSize -= entry.size;
    this.cache.delete(key);
  }
  clear() {
    for (const [key] of this.cache.entries()) {
      this.evictKey(key);
    }
  }
  getMemoryUsage() {
    return this.currentSize;
  }
  getMaxSize() {
    return this.maxSize;
  }
  getCount() {
    return this.cache.size;
  }
  has(clipId, frameTime) {
    const key = getCacheKey(clipId, frameTime);
    return this.cache.has(key);
  }
  getEntriesForClip(clipId) {
    const entries = [];
    for (const entry of this.cache.values()) {
      if (entry.clipId === clipId) {
        entries.push(entry);
      }
    }
    return entries;
  }
  getAllEntries() {
    return Array.from(this.cache.values());
  }
}
function calculateTextureSize(width, height, format = "rgba8unorm") {
  const bytesPerPixel = {
    rgba8unorm: 4,
    rgba8snorm: 4,
    rgba16float: 8,
    rgba32float: 16,
    bgra8unorm: 4,
    r8unorm: 1,
    rg8unorm: 2
  };
  const bpp = bytesPerPixel[format] ?? 4;
  return width * height * bpp;
}
class WebGPURenderer {
  type = "webgpu";
  canvas;
  adapter = null;
  device = null;
  context = null;
  width;
  height;
  _maxTextureCache;
  deviceLostCallbacks = [];
  layers = [];
  isDeviceLost = false;
  deviceRecreationInProgress = false;
  _config;
  // Double buffering
  frameBuffers = [];
  currentFrameBuffer = 0;
  // Pipeline resources
  compositePipeline = null;
  transformPipeline = null;
  borderRadiusPipeline = null;
  // Bind group layouts
  compositeUniformLayout = null;
  compositeTextureLayout = null;
  transformUniformLayout = null;
  transformTextureLayout = null;
  borderRadiusUniformLayout = null;
  borderRadiusTextureLayout = null;
  // Uniform buffers
  layerUniformBuffer = null;
  transformUniformBuffer = null;
  borderRadiusUniformBuffer = null;
  // Sampler for texture sampling
  textureSampler = null;
  // Effects processor for GPU-accelerated effects
  effectsProcessor = null;
  // Re-render tracking for effects changes
  effectsChangeCallbacks = [];
  currentFrameTexture = null;
  lastRenderTime = 0;
  // Frame cache for decoded video frames
  frameCache = null;
  frameCacheHits = 0;
  frameCacheMisses = 0;
  renderPipelineRef = null;
  bindGroupLayoutRef = null;
  constructor(config) {
    this._config = config;
    this.width = config.width;
    this.height = config.height;
    this._maxTextureCache = config.maxTextureCache ?? 500 * 1024 * 1024;
    this.canvas = new OffscreenCanvas(config.width, config.height);
    void this.renderPipelineRef;
    void this.bindGroupLayoutRef;
  }
  /** Get the max texture cache size */
  get maxTextureCache() {
    return this._maxTextureCache;
  }
  /** Get the renderer config */
  get config() {
    return this._config;
  }
  async initialize() {
    try {
      if (!navigator.gpu) {
        console.warn("[WebGPURenderer] WebGPU not supported");
        return false;
      }
      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: "high-performance"
      });
      if (!this.adapter) {
        console.warn("[WebGPURenderer] No GPU adapter available");
        return false;
      }
      this.device = await this.adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {
          maxTextureDimension2D: Math.max(this.width, this.height, 4096),
          maxBindGroups: 4,
          maxSampledTexturesPerShaderStage: 16
        }
      });
      this.setupDeviceLossHandling();
      this.context = this.canvas.getContext("webgpu");
      if (!this.context) {
        console.warn("[WebGPURenderer] Failed to get WebGPU context");
        return false;
      }
      const format = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format,
        alphaMode: "premultiplied"
      });
      this.createFrameBuffers();
      this.createBindGroupLayouts();
      this.createUniformBuffers();
      this.createTextureSampler();
      await this.initializePipelines();
      this.effectsProcessor = new WebGPUEffectsProcessor({
        device: this.device,
        width: this.width,
        height: this.height
      });
      await this.effectsProcessor.initialize();
      this.effectsProcessor.onEffectsChange((clipId, effects) => {
        this.triggerReRender(clipId, effects);
      });
      this.frameCache = new TextureCache({
        maxSize: this._maxTextureCache,
        onEvict: (entry) => {
          console.debug(
            `[WebGPURenderer] Evicted frame cache entry: ${entry.clipId}:${entry.frameTime}`
          );
        }
      });
      return true;
    } catch (error) {
      console.error("[WebGPURenderer] Initialization failed:", error);
      return false;
    }
  }
  setupDeviceLossHandling() {
    if (!this.device) return;
    this.device.lost.then((info) => {
      console.warn(
        `[WebGPURenderer] Device lost: ${info.reason}`,
        info.message
      );
      this.isDeviceLost = true;
      for (const callback of this.deviceLostCallbacks) {
        callback();
      }
      if (!this.deviceRecreationInProgress) {
        this.attemptDeviceRecreation().catch((error) => {
          console.error("[WebGPURenderer] Device recreation failed:", error);
        });
      }
    });
  }
  async attemptDeviceRecreation() {
    this.deviceRecreationInProgress = true;
    const maxAttempts = 3;
    const delayMs = 1e3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const success = await this.recreateDevice();
      if (success) {
        this.deviceRecreationInProgress = false;
        return;
      }
    }
    console.error(
      "[WebGPURenderer] Failed to recreate device after multiple attempts"
    );
    this.deviceRecreationInProgress = false;
  }
  createFrameBuffers() {
    if (!this.device) return;
    for (const buffer of this.frameBuffers) {
      buffer.destroy();
    }
    this.frameBuffers = [];
    for (let i = 0; i < 2; i++) {
      const texture = this.device.createTexture({
        size: { width: this.width, height: this.height },
        format: "rgba8unorm",
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
      });
      this.frameBuffers.push(texture);
    }
  }
  createBindGroupLayouts() {
    if (!this.device) return;
    this.compositeUniformLayout = this.device.createBindGroupLayout({
      label: "Composite Uniform Layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" }
        }
      ]
    });
    this.compositeTextureLayout = this.device.createBindGroupLayout({
      label: "Composite Texture Layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: "filtering" }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float" }
        }
      ]
    });
    this.transformUniformLayout = this.device.createBindGroupLayout({
      label: "Transform Uniform Layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" }
        }
      ]
    });
    this.transformTextureLayout = this.compositeTextureLayout;
    this.borderRadiusUniformLayout = this.device.createBindGroupLayout({
      label: "Border Radius Uniform Layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" }
        }
      ]
    });
    this.borderRadiusTextureLayout = this.compositeTextureLayout;
    this.bindGroupLayoutRef = this.compositeUniformLayout;
  }
  createUniformBuffers() {
    if (!this.device) return;
    this.layerUniformBuffer = this.device.createBuffer({
      label: "Layer Uniform Buffer",
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    this.transformUniformBuffer = this.device.createBuffer({
      label: "Transform Uniform Buffer",
      size: 96,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    this.borderRadiusUniformBuffer = this.device.createBuffer({
      label: "Border Radius Uniform Buffer",
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
  }
  createTextureSampler() {
    if (!this.device) return;
    this.textureSampler = this.device.createSampler({
      label: "Texture Sampler",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge"
    });
  }
  async initializePipelines() {
    if (!this.device) return;
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    await this.createCompositePipeline(canvasFormat);
    await this.createTransformPipeline("rgba8unorm");
    await this.createBorderRadiusPipeline("rgba8unorm");
    this.renderPipelineRef = this.compositePipeline;
  }
  async createCompositePipeline(format) {
    if (!this.device || !this.compositeUniformLayout || !this.compositeTextureLayout)
      return;
    const shaderModule = this.device.createShaderModule({
      label: "Composite Shader",
      code: compositeShaderSource
    });
    this.compositePipeline = this.device.createRenderPipeline({
      label: "Composite Pipeline",
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [
          this.compositeUniformLayout,
          this.compositeTextureLayout
        ]
      }),
      vertex: {
        module: shaderModule,
        entryPoint: "vertexMain"
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fragmentMain",
        targets: [
          {
            format,
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
                operation: "add"
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add"
              }
            }
          }
        ]
      },
      primitive: {
        topology: "triangle-list"
      }
    });
  }
  async createTransformPipeline(format) {
    if (!this.device || !this.transformUniformLayout || !this.transformTextureLayout)
      return;
    const shaderModule = this.device.createShaderModule({
      label: "Transform Shader",
      code: transformShaderSource
    });
    this.transformPipeline = this.device.createRenderPipeline({
      label: "Transform Pipeline",
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [
          this.transformUniformLayout,
          this.transformTextureLayout
        ]
      }),
      vertex: {
        module: shaderModule,
        entryPoint: "vertexMain"
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fragmentMain",
        targets: [
          {
            format,
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
                operation: "add"
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add"
              }
            }
          }
        ]
      },
      primitive: {
        topology: "triangle-list"
      }
    });
  }
  async createBorderRadiusPipeline(format) {
    if (!this.device || !this.borderRadiusUniformLayout || !this.borderRadiusTextureLayout)
      return;
    const shaderModule = this.device.createShaderModule({
      label: "Border Radius Shader",
      code: borderRadiusShaderSource
    });
    this.borderRadiusPipeline = this.device.createRenderPipeline({
      label: "Border Radius Pipeline",
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [
          this.borderRadiusUniformLayout,
          this.borderRadiusTextureLayout
        ]
      }),
      vertex: {
        module: shaderModule,
        entryPoint: "vertexMain"
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fragmentMain",
        targets: [
          {
            format,
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
                operation: "add"
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add"
              }
            }
          }
        ]
      },
      primitive: {
        topology: "triangle-list"
      }
    });
  }
  isSupported() {
    return typeof navigator !== "undefined" && "gpu" in navigator;
  }
  destroy() {
    if (this.effectsProcessor) {
      this.effectsProcessor.dispose();
      this.effectsProcessor = null;
    }
    if (this.frameCache) {
      this.frameCache.clear();
      this.frameCache = null;
    }
    for (const buffer of this.frameBuffers) {
      buffer.destroy();
    }
    this.frameBuffers = [];
    if (this.currentFrameTexture) {
      this.currentFrameTexture.destroy();
      this.currentFrameTexture = null;
    }
    this.layerUniformBuffer?.destroy();
    this.transformUniformBuffer?.destroy();
    this.borderRadiusUniformBuffer?.destroy();
    this.layerUniformBuffer = null;
    this.transformUniformBuffer = null;
    this.borderRadiusUniformBuffer = null;
    this.compositePipeline = null;
    this.transformPipeline = null;
    this.borderRadiusPipeline = null;
    this.renderPipelineRef = null;
    this.compositeUniformLayout = null;
    this.compositeTextureLayout = null;
    this.transformUniformLayout = null;
    this.transformTextureLayout = null;
    this.borderRadiusUniformLayout = null;
    this.borderRadiusTextureLayout = null;
    this.bindGroupLayoutRef = null;
    this.textureSampler = null;
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    this.adapter = null;
    this.context = null;
    this.deviceLostCallbacks = [];
    this.effectsChangeCallbacks = [];
    this.layers = [];
    this.frameCacheHits = 0;
    this.frameCacheMisses = 0;
  }
  beginFrame() {
    if (!this.device || this.isDeviceLost) return;
    this.layers = [];
    this.currentFrameBuffer = 1 - this.currentFrameBuffer;
  }
  renderLayer(layer) {
    this.layers.push(layer);
  }
  async endFrame() {
    if (!this.device || !this.context || this.isDeviceLost) {
      throw new Error("WebGPU device not available");
    }
    const startTime = performance.now();
    const currentTexture = this.context.getCurrentTexture();
    const commandEncoder = this.device.createCommandEncoder({
      label: "Frame Command Encoder"
    });
    const frameBuffer = this.frameBuffers[this.currentFrameBuffer];
    const frameRenderPass = commandEncoder.beginRenderPass({
      label: "Frame Buffer Render Pass",
      colorAttachments: [
        {
          view: frameBuffer.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store"
        }
      ]
    });
    this.renderLayersToPass(frameRenderPass);
    frameRenderPass.end();
    const presentRenderPass = commandEncoder.beginRenderPass({
      label: "Present Render Pass",
      colorAttachments: [
        {
          view: currentTexture.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store"
        }
      ]
    });
    this.renderFrameBufferToScreen(presentRenderPass);
    presentRenderPass.end();
    const commandBuffer = commandEncoder.finish();
    this.device.queue.submit([commandBuffer]);
    const bytesPerRow = Math.ceil(this.width * 4 / 256) * 256;
    const buffer = this.device.createBuffer({
      size: bytesPerRow * this.height,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    const copyEncoder = this.device.createCommandEncoder();
    copyEncoder.copyTextureToBuffer(
      { texture: frameBuffer },
      { buffer, bytesPerRow },
      { width: this.width, height: this.height }
    );
    this.device.queue.submit([copyEncoder.finish()]);
    await buffer.mapAsync(1);
    const arrayBuffer = buffer.getMappedRange();
    const srcData = new Uint8ClampedArray(arrayBuffer);
    const dstData = new Uint8ClampedArray(this.width * this.height * 4);
    const srcBytesPerRow = bytesPerRow;
    const dstBytesPerRow = this.width * 4;
    for (let y = 0; y < this.height; y++) {
      const srcOffset = y * srcBytesPerRow;
      const dstOffset = y * dstBytesPerRow;
      dstData.set(
        srcData.subarray(srcOffset, srcOffset + dstBytesPerRow),
        dstOffset
      );
    }
    buffer.unmap();
    buffer.destroy();
    const imageData = new ImageData(dstData, this.width, this.height);
    this.lastRenderTime = performance.now() - startTime;
    return createImageBitmap(imageData, {
      premultiplyAlpha: "premultiply"
    });
  }
  renderLayersToPass(renderPass) {
    if (!this.device || !this.textureSampler) return;
    for (const layer of this.layers) {
      if (!layer.texture || !("createView" in layer.texture)) {
        continue;
      }
      const gpuTexture = layer.texture;
      const hasBorderRadius = layer.borderRadius > 0;
      let processedTexture = gpuTexture;
      if (layer.effects.length > 0 && this.effectsProcessor) {
        processedTexture = this.effectsProcessor.processEffects(
          gpuTexture,
          layer.effects
        );
      }
      if (hasBorderRadius && this.borderRadiusPipeline) {
        this.renderLayerWithBorderRadius(renderPass, processedTexture, layer);
      } else if (this.transformPipeline) {
        this.renderLayerWithTransform(renderPass, processedTexture, layer);
      }
    }
  }
  renderLayerWithTransform(renderPass, texture, layer) {
    if (!this.device || !this.transformPipeline || !this.transformUniformBuffer || !this.transformUniformLayout || !this.transformTextureLayout || !this.textureSampler) {
      return;
    }
    const matrix = createTransformMatrix(
      layer.transform.position,
      layer.transform.scale,
      layer.transform.rotation,
      layer.transform.anchor,
      this.width,
      this.height
    );
    const uniformData = createTransformUniformsBuffer(
      matrix,
      layer.opacity * layer.transform.opacity,
      layer.borderRadius,
      layer.transform.crop
    );
    this.device.queue.writeBuffer(
      this.transformUniformBuffer,
      0,
      uniformData.buffer
    );
    const uniformBindGroup = this.device.createBindGroup({
      label: "Transform Uniform Bind Group",
      layout: this.transformUniformLayout,
      entries: [
        { binding: 0, resource: { buffer: this.transformUniformBuffer } }
      ]
    });
    const textureBindGroup = this.device.createBindGroup({
      label: "Transform Texture Bind Group",
      layout: this.transformTextureLayout,
      entries: [
        { binding: 0, resource: this.textureSampler },
        { binding: 1, resource: texture.createView() }
      ]
    });
    renderPass.setPipeline(this.transformPipeline);
    renderPass.setBindGroup(0, uniformBindGroup);
    renderPass.setBindGroup(1, textureBindGroup);
    renderPass.draw(6);
  }
  renderLayerWithBorderRadius(renderPass, texture, layer) {
    if (!this.device || !this.borderRadiusPipeline || !this.borderRadiusUniformBuffer || !this.borderRadiusUniformLayout || !this.borderRadiusTextureLayout || !this.textureSampler) {
      return;
    }
    const matrix = createTransformMatrix(
      layer.transform.position,
      layer.transform.scale,
      layer.transform.rotation,
      layer.transform.anchor,
      this.width,
      this.height
    );
    const normalizedRadius = Math.min(layer.borderRadius / 100, 0.5);
    const uniformData = new Float32Array(20);
    uniformData.set(matrix, 0);
    uniformData[16] = layer.opacity * layer.transform.opacity;
    uniformData[17] = normalizedRadius;
    uniformData[18] = this.width / this.height;
    uniformData[19] = 0.01;
    this.device.queue.writeBuffer(
      this.borderRadiusUniformBuffer,
      0,
      uniformData.buffer
    );
    const uniformBindGroup = this.device.createBindGroup({
      label: "Border Radius Uniform Bind Group",
      layout: this.borderRadiusUniformLayout,
      entries: [
        { binding: 0, resource: { buffer: this.borderRadiusUniformBuffer } }
      ]
    });
    const textureBindGroup = this.device.createBindGroup({
      label: "Border Radius Texture Bind Group",
      layout: this.borderRadiusTextureLayout,
      entries: [
        { binding: 0, resource: this.textureSampler },
        { binding: 1, resource: texture.createView() }
      ]
    });
    renderPass.setPipeline(this.borderRadiusPipeline);
    renderPass.setBindGroup(0, uniformBindGroup);
    renderPass.setBindGroup(1, textureBindGroup);
    renderPass.draw(6);
  }
  renderFrameBufferToScreen(renderPass) {
    if (!this.device || !this.compositePipeline || !this.layerUniformBuffer || !this.compositeUniformLayout || !this.compositeTextureLayout || !this.textureSampler) {
      return;
    }
    const frameBuffer = this.frameBuffers[this.currentFrameBuffer];
    const uniformData = createLayerUniformsBuffer(1);
    this.device.queue.writeBuffer(
      this.layerUniformBuffer,
      0,
      uniformData.buffer
    );
    const uniformBindGroup = this.device.createBindGroup({
      label: "Composite Uniform Bind Group",
      layout: this.compositeUniformLayout,
      entries: [{ binding: 0, resource: { buffer: this.layerUniformBuffer } }]
    });
    const textureBindGroup = this.device.createBindGroup({
      label: "Composite Texture Bind Group",
      layout: this.compositeTextureLayout,
      entries: [
        { binding: 0, resource: this.textureSampler },
        { binding: 1, resource: frameBuffer.createView() }
      ]
    });
    renderPass.setPipeline(this.compositePipeline);
    renderPass.setBindGroup(0, uniformBindGroup);
    renderPass.setBindGroup(1, textureBindGroup);
    renderPass.draw(3);
  }
  createTextureFromImage(image) {
    if (!this.device) {
      throw new Error("WebGPU device not initialized");
    }
    const texture = this.device.createTexture({
      size: { width: image.width, height: image.height },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });
    this.device.queue.copyExternalImageToTexture(
      { source: image },
      { texture },
      { width: image.width, height: image.height }
    );
    return texture;
  }
  releaseTexture(texture) {
    if (texture && "destroy" in texture) {
      texture.destroy();
    }
  }
  applyEffects(texture, effects) {
    if (!this.effectsProcessor || !texture || !("destroy" in texture && "createView" in texture)) {
      return texture;
    }
    return this.effectsProcessor.processEffects(texture, effects);
  }
  notifyEffectsChanged(clipId, effects) {
    if (this.effectsProcessor) {
      this.effectsProcessor.notifyEffectsChanged(clipId, effects);
    }
  }
  onEffectsReRender(callback) {
    this.effectsChangeCallbacks.push(callback);
  }
  triggerReRender(clipId, effects) {
    const startTime = performance.now();
    for (const callback of this.effectsChangeCallbacks) {
      callback(clipId, effects);
    }
    this.lastRenderTime = performance.now() - startTime;
    if (this.lastRenderTime > 100) {
      console.warn(
        `[WebGPURenderer] Re-render took ${this.lastRenderTime.toFixed(
          2
        )}ms, exceeds 100ms target`
      );
    }
  }
  getLastRenderTime() {
    return this.lastRenderTime;
  }
  getEffectsProcessingTime() {
    return this.effectsProcessor?.getLastProcessingTime() ?? 0;
  }
  onDeviceLost(callback) {
    this.deviceLostCallbacks.push(callback);
  }
  async recreateDevice() {
    this.isDeviceLost = false;
    this.destroy();
    return this.initialize();
  }
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    if (this.context && this.device) {
      const format = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format,
        alphaMode: "premultiplied"
      });
      this.createFrameBuffers();
      if (this.effectsProcessor) {
        this.effectsProcessor.resize(width, height);
      }
    }
  }
  getMemoryUsage() {
    const frameBufferSize = this.width * this.height * 4 * 2;
    return frameBufferSize;
  }
  getDevice() {
    return this.device;
  }
  isLost() {
    return this.isDeviceLost;
  }
  getCachedFrame(clipId, frameTime) {
    if (!this.frameCache) return null;
    const texture = this.frameCache.get(clipId, frameTime);
    if (texture) {
      this.frameCacheHits++;
      return texture;
    }
    this.frameCacheMisses++;
    return null;
  }
  cacheFrame(clipId, frameTime, image) {
    if (!this.device) {
      throw new Error("WebGPU device not initialized");
    }
    const existing = this.getCachedFrame(clipId, frameTime);
    if (existing) {
      return existing;
    }
    const texture = this.createTextureFromImage(image);
    const size = calculateTextureSize(image.width, image.height, "rgba8unorm");
    if (this.frameCache) {
      this.frameCache.set(clipId, frameTime, texture, size);
    }
    return texture;
  }
  hasFrameCached(clipId, frameTime) {
    return this.frameCache?.has(clipId, frameTime) ?? false;
  }
  evictClipFrames(clipId) {
    this.frameCache?.evict(clipId);
  }
  getFrameCacheStats() {
    const total = this.frameCacheHits + this.frameCacheMisses;
    return {
      hits: this.frameCacheHits,
      misses: this.frameCacheMisses,
      hitRate: total > 0 ? this.frameCacheHits / total : 0,
      memoryUsage: this.frameCache?.getMemoryUsage() ?? 0,
      maxSize: this.frameCache?.getMaxSize() ?? 0,
      entryCount: this.frameCache?.getCount() ?? 0
    };
  }
  clearFrameCache() {
    this.frameCache?.clear();
    this.frameCacheHits = 0;
    this.frameCacheMisses = 0;
  }
  getRenderPipeline() {
    return this.compositePipeline;
  }
  getTransformPipeline() {
    return this.transformPipeline;
  }
  getBorderRadiusPipeline() {
    return this.borderRadiusPipeline;
  }
  arePipelinesInitialized() {
    return this.compositePipeline !== null && this.transformPipeline !== null && this.borderRadiusPipeline !== null;
  }
}
const webgpuRendererImpl = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  WebGPURenderer
}, Symbol.toStringTag, { value: "Module" }));
export {
  TextureCache as T,
  WebGPUEffectsProcessor as W,
  WebGPURenderer as a,
  blurComputeShaderSource as b,
  borderRadiusShaderSource as c,
  calculateTextureSize as d,
  compositeShaderSource as e,
  createBlurUniformsBuffer as f,
  createDimensionsBuffer as g,
  createEffectUniformsBuffer as h,
  createLayerUniformsBuffer as i,
  createTransformMatrix as j,
  createTransformUniformsBuffer as k,
  effectsComputeShaderSource as l,
  transformShaderSource as t,
  webgpuRendererImpl as w
};
