// exposure-fragment.js

// exposure-fragment.js
export const clamp01 = (value) => Math.min(1, Math.max(0, value));

const cubicBezier = (t2, p0, p1, p22, p3) => {
  const u4 = 1 - t2;
  return (
    u4 * u4 * u4 * p0 +
    3 * u4 * u4 * t2 * p1 +
    3 * u4 * t2 * t2 * p22 +
    t2 * t2 * t2 * p3
  );
};

const PALETTE_SIZE = 256;

export const buildCurvePalette = (lowControl, highControl) => {
  const data2 = new Uint8Array(PALETTE_SIZE * 3);
  for (let i2 = 0; i2 < PALETTE_SIZE; i2 += 1) {
    const t2 = i2 / (PALETTE_SIZE - 1);
    const y4 = cubicBezier(t2, 0, lowControl, highControl, 1);
    const v2 = Math.round(clamp01(y4) * 255);
    const idx = i2 * 3;
    data2[idx] = v2;
    data2[idx + 1] = v2;
    data2[idx + 2] = v2;
  }
  return data2;
};

export const vertexShader = `
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn main(@location(0) position: vec2<f32>, @location(1) uv: vec2<f32>) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4<f32>(position, 0.0, 1.0);
  output.uv = uv;
  return output;
}
`;

export const vibranceFragment = `
struct Params {
  amount: f32,
}

@group(0) @binding(0) var uTexture: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let col = textureSample(uTexture, uSampler, uv);
  var color = col.rgb;
  let luminance = color.r * 0.299 + color.g * 0.587 + color.b * 0.114;
  let mn = min(min(color.r, color.g), color.b);
  let mx = max(max(color.r, color.g), color.b);
  let sat = (1.0 - (mx - mn)) * (1.0 - mx) * luminance * 5.0;
  let lightness = vec3<f32>((mn + mx) / 2.0);
  color = mix(color, mix(color, lightness, -params.amount), sat);
  return vec4<f32>(
    mix(color, lightness, (1.0 - lightness) * (1.0 - params.amount) / 2.0 * abs(params.amount)),
    col.a
  );
}
`;

export const saturationFragment = `
struct Params {
  matrix: array<vec4<f32>, 5>,
}

@group(0) @binding(0) var uTexture: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let c = textureSample(uTexture, uSampler, uv);
  var result: vec4<f32>;
  result.r = params.matrix[0].x * c.r + params.matrix[0].y * c.g + params.matrix[0].z * c.b + params.matrix[0].w * c.a + params.matrix[1].x;
  result.g = params.matrix[1].y * c.r + params.matrix[1].z * c.g + params.matrix[1].w * c.b + params.matrix[2].x * c.a + params.matrix[2].y;
  result.b = params.matrix[2].z * c.r + params.matrix[2].w * c.g + params.matrix[3].x * c.b + params.matrix[3].y * c.a + params.matrix[3].z;
  result.a = params.matrix[3].w * c.r + params.matrix[4].x * c.g + params.matrix[4].y * c.b + params.matrix[4].z * c.a + params.matrix[4].w;
  return result;
}
`;

export const temperatureFragment = `
struct Params {
  amount: f32,
}

@group(0) @binding(0) var uTexture: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  var color = textureSample(uTexture, uSampler, uv);
  color.r = clamp(color.r + params.amount, 0.0, 1.0);
  color.b = clamp(color.b - params.amount, 0.0, 1.0);
  return color;
}
`;

export const tintFragment = `
struct Params {
  amount: f32,
}

@group(0) @binding(0) var uTexture: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  var color = textureSample(uTexture, uSampler, uv);
  color.g = clamp(color.g + params.amount, 0.0, 1.0);
  return color;
}
`;

export const hueFragment = `
struct Params {
  rotation: f32,
}

@group(0) @binding(0) var uTexture: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

fn rgb2hsv(c: vec3<f32>) -> vec3<f32> {
  let K = vec4<f32>(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  let p = mix(vec4<f32>(c.bg, K.wz), vec4<f32>(c.gb, K.xy), vec4<f32>(step(c.b, c.g)));
  let q = mix(vec4<f32>(p.xyw, c.r), vec4<f32>(c.r, p.yzx), vec4<f32>(step(p.x, c.r)));
  let d = q.x - min(q.w, q.y);
  let e = 1.0e-10;
  return vec3<f32>(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

fn hsv2rgb(c: vec3<f32>) -> vec3<f32> {
  let K = vec4<f32>(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  let p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, vec3<f32>(0.0), vec3<f32>(1.0)), c.y);
}

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let base = textureSample(uTexture, uSampler, uv);
  var hsv = rgb2hsv(base.rgb);
  hsv.x = fract(hsv.x + params.rotation);
  return vec4<f32>(hsv2rgb(hsv), base.a);
}
`;

export const exposureFragment = `
struct Params {
  amount: f32,
}

@group(0) @binding(0) var uTexture: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

const epsilon: f32 = 0.000001;
const mx: f32 = 1.0 - 0.000001;

// GLSL mat3 列主序: mat3(col0_elem0, col0_elem1, col0_elem2, col1_elem0, ...)
// WGSL mat3x3 也是列主序: mat3x3(vec3_col0, vec3_col1, vec3_col2)
const matRGBtoROMM = mat3x3<f32>(
  vec3<f32>(0.5293459296226501, 0.3300727903842926, 0.14058130979537964),   // 第一列
  vec3<f32>(0.09837432950735092, 0.8734610080718994, 0.028164653107523918), // 第二列
  vec3<f32>(0.01688321679830551, 0.11767247319221497, 0.8654443025588989)   // 第三列
);

const matROMMtoRGB = mat3x3<f32>(
  vec3<f32>(2.0340757369995117, -0.727334201335907, -0.3067416846752167),         // 第一列
  vec3<f32>(-0.22881317138671875, 1.2317301034927368, -0.0029169507324695587),    // 第二列
  vec3<f32>(-0.008569774217903614, -0.1532866358757019, 1.1618564128875732)       // 第三列
);

fn rgb2hsv(c: vec3<f32>) -> vec3<f32> {
  let K = vec4<f32>(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  let p = mix(vec4<f32>(c.bg, K.wz), vec4<f32>(c.gb, K.xy), vec4<f32>(step(c.b, c.g)));
  let q = mix(vec4<f32>(p.xyw, c.r), vec4<f32>(c.r, p.yzx), vec4<f32>(step(p.x, c.r)));
  let d = q.x - min(q.w, q.y);
  let e = 1.0e-10;
  return vec3<f32>(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

fn hsv2rgb(c: vec3<f32>) -> vec3<f32> {
  let K = vec4<f32>(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  let p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, vec3<f32>(0.0), vec3<f32>(1.0)), c.y);
}

fn setHue(res: vec3<f32>, base: vec3<f32>) -> vec3<f32> {
  let hsv = rgb2hsv(base);
  let res_hsv = rgb2hsv(res);
  return hsv2rgb(vec3<f32>(hsv.x, res_hsv.y, res_hsv.z));
}

fn ramp(t_in: f32) -> f32 {
  var t = t_in * 2.0;
  if (t >= 1.0) {
    t = t - 1.0;
    t = log(0.5) / log(0.5 * (1.0 - t) + 0.9332 * t);
  }
  return clamp(t, 0.001, 10.0);
}

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let col = textureSample(uTexture, uSampler, uv);
  var base = col.rgb * matRGBtoROMM;
  let a = abs(params.amount) * col.a + epsilon;
  let v = pow(2.0, a * 2.0 + 1.0) - 2.0;
  let m = mx - exp(-v);
  var res: vec3<f32>;
  if (params.amount > 0.0) {
    res = (1.0 - exp(-v * base)) / m;
  } else {
    res = log(1.0 - base * m) / -v;
  }
  res = mix(base, res, min(a * 100.0, 1.0));
  res = setHue(res, base);
  res = pow(res, vec3<f32>(ramp(1.0 - (0.0 * col.a + 1.0) / 2.0)));
  res = res * matROMMtoRGB;
  return vec4<f32>(res, col.a);
}
`;

export const whitesFragment = `
struct Params {
  amount: f32,
}

@group(0) @binding(0) var uTexture: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

const RGB2Y = vec3<f32>(0.2126, 0.7152, 0.0722);

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let base = textureSample(uTexture, uSampler, uv);
  var color = base.rgb;
  let lum = dot(color, RGB2Y);
  let whiteMask = smoothstep(0.5, 1.0, lum);
  color = color + params.amount * whiteMask;
  return vec4<f32>(clamp(color, vec3<f32>(0.0), vec3<f32>(1.0)), base.a);
}
`;

export const highlightsFragment = `
struct Params {
  amount: f32,
}

@group(0) @binding(0) var uTexture: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

const epsilon: f32 = 0.000001;
const mx: f32 = 1.0 - 0.000001;

const matRGBtoROMM = mat3x3<f32>(
  vec3<f32>(0.5293459296226501, 0.3300727903842926, 0.14058130979537964),
  vec3<f32>(0.09837432950735092, 0.8734610080718994, 0.028164653107523918),
  vec3<f32>(0.01688321679830551, 0.11767247319221497, 0.8654443025588989)
);

const matROMMtoRGB = mat3x3<f32>(
  vec3<f32>(2.0340757369995117, -0.727334201335907, -0.3067416846752167),
  vec3<f32>(-0.22881317138671875, 1.2317301034927368, -0.0029169507324695587),
  vec3<f32>(-0.008569774217903614, -0.1532866358757019, 1.1618564128875732)
);

fn luma_romm(color: vec3<f32>) -> f32 {
  return dot(color, vec3<f32>(0.242655, 0.755158, 0.002187));
}

fn rgb2hsv(c: vec3<f32>) -> vec3<f32> {
  let K = vec4<f32>(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  let p = mix(vec4<f32>(c.bg, K.wz), vec4<f32>(c.gb, K.xy), vec4<f32>(step(c.b, c.g)));
  let q = mix(vec4<f32>(p.xyw, c.r), vec4<f32>(c.r, p.yzx), vec4<f32>(step(p.x, c.r)));
  let d = q.x - min(q.w, q.y);
  let e = 1.0e-10;
  return vec3<f32>(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

fn hsv2rgb(c: vec3<f32>) -> vec3<f32> {
  let K = vec4<f32>(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  let p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, vec3<f32>(0.0), vec3<f32>(1.0)), c.y);
}

fn setHue(res: vec3<f32>, base: vec3<f32>) -> vec3<f32> {
  let hsv = rgb2hsv(base);
  let res_hsv = rgb2hsv(res);
  return hsv2rgb(vec3<f32>(hsv.x, res_hsv.y, res_hsv.z));
}

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let col = textureSample(uTexture, uSampler, uv);
  let map = col.rgb;
  var base = col.rgb * matRGBtoROMM;
  let map_lum = luma_romm(map * matRGBtoROMM);
  let exposure = mix(params.amount, 0.0, 1.0 - map_lum) * col.a;
  let a = abs(exposure) * col.a + epsilon;
  let v = pow(2.0, a + 1.0) - 2.0;
  let m = mx - exp(-v);
  var res: vec3<f32>;
  if (exposure > 0.0) {
    res = (1.0 - exp(-v * base)) / m;
  } else {
    res = log(1.0 - base * m) / -v;
  }
  res = mix(base, res, min(a * 100.0, 1.0));
  res = setHue(res, base);
  res = res * matROMMtoRGB;
  return vec4<f32>(res, col.a);
}
`;

export const shadowsFragment = `
struct Params {
  amount: f32,
}

@group(0) @binding(0) var uTexture: texture_2d<f32>;
@group(0) @binding(1) var uSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

const epsilon: f32 = 0.000001;
const mx: f32 = 1.0 - 0.000001;

const matRGBtoROMM = mat3x3<f32>(
  vec3<f32>(0.5293459296226501, 0.3300727903842926, 0.14058130979537964),
  vec3<f32>(0.09837432950735092, 0.8734610080718994, 0.028164653107523918),
  vec3<f32>(0.01688321679830551, 0.11767247319221497, 0.8654443025588989)
);

const matROMMtoRGB = mat3x3<f32>(
  vec3<f32>(2.0340757369995117, -0.727334201335907, -0.3067416846752167),
  vec3<f32>(-0.22881317138671875, 1.2317301034927368, -0.0029169507324695587),
  vec3<f32>(-0.008569774217903614, -0.1532866358757019, 1.1618564128875732)
);

fn luma_romm(color: vec3<f32>) -> f32 {
  return dot(color, vec3<f32>(0.242655, 0.755158, 0.002187));
}

fn rgb2hsv(c: vec3<f32>) -> vec3<f32> {
  let K = vec4<f32>(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  let p = mix(vec4<f32>(c.bg, K.wz), vec4<f32>(c.gb, K.xy), vec4<f32>(step(c.b, c.g)));
  let q = mix(vec4<f32>(p.xyw, c.r), vec4<f32>(c.r, p.yzx), vec4<f32>(step(p.x, c.r)));
  let d = q.x - min(q.w, q.y);
  let e = 1.0e-10;
  return vec3<f32>(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

fn hsv2rgb(c: vec3<f32>) -> vec3<f32> {
  let K = vec4<f32>(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  let p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, vec3<f32>(0.0), vec3<f32>(1.0)), c.y);
}

fn setHue(res: vec3<f32>, base: vec3<f32>) -> vec3<f32> {
  let hsv = rgb2hsv(base);
  let res_hsv = rgb2hsv(res);
  return hsv2rgb(vec3<f32>(hsv.x, res_hsv.y, res_hsv.z));
}

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let col = textureSample(uTexture, uSampler, uv);
  let map = col.rgb;
  var base = col.rgb * matRGBtoROMM;
  let map_lum = luma_romm(map * matRGBtoROMM);
  let exposure = mix(0.0, params.amount, 1.0 - map_lum) * col.a;
  let a = abs(exposure) * col.a + epsilon;
  let v = pow(2.0, a + 1.0) - 2.0;
  let m = mx - exp(-v);
  var res: vec3<f32>;
  if (exposure > 0.0) {
    res = (1.0 - exp(-v * base)) / m;
  } else {
    res = log(1.0 - base * m) / -v;
  }
  res = mix(base, res, min(a * 100.0, 1.0));
  res = setHue(res, base);
  res = res * matROMMtoRGB;
  return vec4<f32>(res, col.a);
}
`;
