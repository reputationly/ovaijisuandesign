// highlights-fragment.js
export function lutToRGBA8(lut) {
  const { data: data2, size: size2, domainMin, domainMax } = lut;
  const total = size2 * size2 * size2;
  const out = new Uint8Array(total * 4);
  const dxR = domainMax[0] - domainMin[0] || 1;
  const dxG = domainMax[1] - domainMin[1] || 1;
  const dxB = domainMax[2] - domainMin[2] || 1;
  for (let i2 = 0; i2 < total; i2++) {
    const r2 = (data2[i2 * 3] - domainMin[0]) / dxR;
    const g2 = (data2[i2 * 3 + 1] - domainMin[1]) / dxG;
    const b3 = (data2[i2 * 3 + 2] - domainMin[2]) / dxB;
    out[i2 * 4] = Math.max(0, Math.min(255, Math.round(r2 * 255)));
    out[i2 * 4 + 1] = Math.max(0, Math.min(255, Math.round(g2 * 255)));
    out[i2 * 4 + 2] = Math.max(0, Math.min(255, Math.round(b3 * 255)));
    out[i2 * 4 + 3] = 255;
  }
  return out;
}
export function lutToFlat2D(lut) {
  const { size: size2, data: data2, domainMin, domainMax } = lut;
  const width = size2 * size2;
  const height = size2;
  const out = new Uint8Array(width * height * 4);
  const dxR = domainMax[0] - domainMin[0] || 1;
  const dxG = domainMax[1] - domainMin[1] || 1;
  const dxB = domainMax[2] - domainMin[2] || 1;
  for (let bSlice = 0; bSlice < size2; bSlice++) {
    for (let gRow = 0; gRow < size2; gRow++) {
      for (let rCol = 0; rCol < size2; rCol++) {
        const srcIdx = (bSlice * size2 * size2 + gRow * size2 + rCol) * 3;
        const dstX = bSlice * size2 + rCol;
        const dstY = gRow;
        const dstIdx = (dstY * width + dstX) * 4;
        const r2 = (data2[srcIdx] - domainMin[0]) / dxR;
        const g2 = (data2[srcIdx + 1] - domainMin[1]) / dxG;
        const b3 = (data2[srcIdx + 2] - domainMin[2]) / dxB;
        out[dstIdx] = Math.max(0, Math.min(255, Math.round(r2 * 255)));
        out[dstIdx + 1] = Math.max(0, Math.min(255, Math.round(g2 * 255)));
        out[dstIdx + 2] = Math.max(0, Math.min(255, Math.round(b3 * 255)));
        out[dstIdx + 3] = 255;
      }
    }
  }
  return {
    width,
    height,
    data: out,
  };
}
export const defaultSettings = {
  vibrance: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  hue: 0,
  brightness: 0,
  exposure: 0,
  contrast: 0,
  blacks: 0,
  whites: 0,
  highlights: 0,
  shadows: 0,
  dehaze: 0,
  bloom: 0,
  glamour: 0,
  clarity: 0,
  sharpen: 0,
  smooth: 0,
  blur: 0,
  vignette: 0,
  grain: 0,
};
export const defaultLUTParams = {
  intensity: 1,
};
export const vertexSource = `
precision highp float;
attribute vec2 aPosition;
attribute vec2 aTexCoord;
varying vec2 vUv;
uniform float uFlipY;
void main() {
  vUv = vec2(aTexCoord.x, mix(aTexCoord.y, 1.0 - aTexCoord.y, uFlipY));
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;
export const blackVertexSource = `
precision highp float;
attribute vec2 apos;
attribute vec2 auv;
varying vec2 uv;
uniform vec4 transform;
uniform float uFlipY;
void main(void) {
  uv = vec2(auv.x, mix(auv.y, 1.0 - auv.y, uFlipY));
  gl_Position = vec4(
    apos.x * transform.x + transform.z,
    apos.y * transform.y + transform.w,
    0.0,
    1.0
  );
}
`;
export const passFragment$1 = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
void main() {
  gl_FragColor = texture2D(uTexture, vUv);
}
`;
export const vibranceFragment$1 = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uAmount;
void main() {
  vec4 col = texture2D(uTexture, vUv);
  vec3 color = col.rgb;
  float luminance = color.r * 0.299 + color.g * 0.587 + color.b * 0.114;
  float mn = min(min(color.r, color.g), color.b);
  float mx = max(max(color.r, color.g), color.b);
  float sat = (1.0 - (mx - mn)) * (1.0 - mx) * luminance * 5.0;
  vec3 lightness = vec3((mn + mx) / 2.0);
  color = mix(color, mix(color, lightness, -uAmount), sat);
  gl_FragColor = vec4(
    mix(color, lightness, (1.0 - lightness) * (1.0 - uAmount) / 2.0 * abs(uAmount)),
    col.a
  );
}
`;
export const saturationFragment$1 = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uMatrix[20];
void main(void) {
  vec4 c = texture2D(uTexture, vUv);
  gl_FragColor.r = uMatrix[0] * c.r + uMatrix[1] * c.g + uMatrix[2] * c.b + uMatrix[3] * c.a + uMatrix[4];
  gl_FragColor.g = uMatrix[5] * c.r + uMatrix[6] * c.g + uMatrix[7] * c.b + uMatrix[8] * c.a + uMatrix[9];
  gl_FragColor.b = uMatrix[10] * c.r + uMatrix[11] * c.g + uMatrix[12] * c.b + uMatrix[13] * c.a + uMatrix[14];
  gl_FragColor.a = uMatrix[15] * c.r + uMatrix[16] * c.g + uMatrix[17] * c.b + uMatrix[18] * c.a + uMatrix[19];
}
`;
export const temperatureFragment$1 = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uAmount;
void main() {
  vec4 color = texture2D(uTexture, vUv);
  color.r = clamp(color.r + uAmount, 0.0, 1.0);
  color.b = clamp(color.b - uAmount, 0.0, 1.0);
  gl_FragColor = color;
}
`;
export const tintFragment$1 = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uAmount;
void main() {
  vec4 color = texture2D(uTexture, vUv);
  color.g = clamp(color.g + uAmount, 0.0, 1.0);
  gl_FragColor = color;
}
`;
export const hueFragment$1 = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uRotation;
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
void main() {
  lowp vec4 base = texture2D(uTexture, vUv);
  vec3 hsv = rgb2hsv(base.rgb);
  hsv.x = fract(hsv.x + uRotation);
  gl_FragColor = vec4(hsv2rgb(hsv), base.a);
}
`;
export const brightnessFragment$1 = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uAmount;
const float PI = 3.1415926535897932384626433832795;
void main() {
  vec4 color = texture2D(uTexture, vUv);
  if (uAmount >= 0.0) {
    color.r = color.r + uAmount * sin(color.r * PI);
    color.g = color.g + uAmount * sin(color.g * PI);
    color.b = color.b + uAmount * sin(color.b * PI);
  } else {
    color.r = (1.0 + uAmount) * color.r;
    color.g = (1.0 + uAmount) * color.g;
    color.b = (1.0 + uAmount) * color.b;
  }
  gl_FragColor = color;
}
`;
export const exposureFragment$1 = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uAmount;
const float epsilon = 0.000001;
const float mx = 1.0 - epsilon;
const mat3 matRGBtoROMM = mat3(
  0.5293459296226501, 0.3300727903842926, 0.14058130979537964,
  0.09837432950735092, 0.8734610080718994, 0.028164653107523918,
  0.01688321679830551, 0.11767247319221497, 0.8654443025588989
);
const mat3 matROMMtoRGB = mat3(
  2.0340757369995117, -0.727334201335907, -0.3067416846752167,
  -0.22881317138671875, 1.2317301034927368, -0.0029169507324695587,
  -0.008569774217903614, -0.1532866358757019, 1.1618564128875732
);
float ramp(in float t) {
  t *= 2.0;
  if (t >= 1.0) {
    t -= 1.0;
    t = log(0.5) / log(0.5 * (1.0 - t) + 0.9332 * t);
  }
  return clamp(t, 0.001, 10.0);
}
vec3 rgb2hsv(in vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(in vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
vec3 setHue(in vec3 res, in vec3 base) {
  vec3 hsv = rgb2hsv(base);
  vec3 res_hsv = rgb2hsv(res);
  return hsv2rgb(vec3(hsv.x, res_hsv.y, res_hsv.z));
}
void main() {
  lowp vec4 col = texture2D(uTexture, vUv);
  vec3 base = col.rgb * matRGBtoROMM;
  float a = abs(uAmount) * col.a + epsilon;
  float v = pow(2.0, a * 2.0 + 1.0) - 2.0;
  float m = mx - exp(-v);
  vec3 res = (uAmount > 0.0) ? (1.0 - exp(-v * base)) / m : log(1.0 - base * m) / -v;
  res = mix(base, res, min(a * 100.0, 1.0));
  res = setHue(res, base);
  res = pow(res, vec3(ramp(1.0 - (0.0 * col.a + 1.0) / 2.0)));
  res = res * matROMMtoRGB;
  gl_FragColor = vec4(res, col.a);
}
`;
export const contrastFragment$1 = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uMatrix[20];
void main(void) {
  vec4 c = texture2D(uTexture, vUv);
  gl_FragColor.r = uMatrix[0] * c.r + uMatrix[1] * c.g + uMatrix[2] * c.b + uMatrix[3] * c.a + uMatrix[4];
  gl_FragColor.g = uMatrix[5] * c.r + uMatrix[6] * c.g + uMatrix[7] * c.b + uMatrix[8] * c.a + uMatrix[9];
  gl_FragColor.b = uMatrix[10] * c.r + uMatrix[11] * c.g + uMatrix[12] * c.b + uMatrix[13] * c.a + uMatrix[14];
  gl_FragColor.a = uMatrix[15] * c.r + uMatrix[16] * c.g + uMatrix[17] * c.b + uMatrix[18] * c.a + uMatrix[19];
}
`;
export const whitesFragment$1 = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uAmount;
const vec3 RGB2Y = vec3(0.2126, 0.7152, 0.0722);
void main() {
  vec4 base = texture2D(uTexture, vUv.xy);
  vec3 color = base.rgb;
  float lum = dot(color, RGB2Y);
  float whiteMask = smoothstep(0.5, 1.0, lum);
  color += uAmount * whiteMask;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), base.a);
}
`;
export const blackPaletteFragment = `
precision highp float;
varying vec2 uv;
uniform sampler2D uTexture;
uniform sampler2D uPaletteMap;
void main() {
  lowp vec4 base = texture2D(uTexture, uv.xy);
  float r = texture2D(uPaletteMap, vec2(base.r, 0.0)).r;
  float g = texture2D(uPaletteMap, vec2(base.g, 0.0)).g;
  float b = texture2D(uPaletteMap, vec2(base.b, 0.0)).b;
  gl_FragColor = vec4(r, g, b, base.a);
}
`;
export const highlightsFragment$1 = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uAmount;
const float epsilon = 0.000001;
const float mx = 1.0 - epsilon;
const float PI = 3.1415926535897932384626433832795;
const mat3 matRGBtoROMM = mat3(
  0.5293459296226501, 0.3300727903842926, 0.14058130979537964,
  0.09837432950735092, 0.8734610080718994, 0.028164653107523918,
  0.01688321679830551, 0.11767247319221497, 0.8654443025588989
);
const mat3 matROMMtoRGB = mat3(
  2.0340757369995117, -0.727334201335907, -0.3067416846752167,
  -0.22881317138671875, 1.2317301034927368, -0.0029169507324695587,
  -0.008569774217903614, -0.1532866358757019, 1.1618564128875732
);
float luma_romm(in vec3 color) {
  return dot(color, vec3(0.242655, 0.755158, 0.002187));
}
float luma(in vec3 color) {
  return dot(color, vec3(0.298839, 0.586811, 0.11435));
}
vec3 rgb2hsv(in vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(in vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
vec3 setHue(in vec3 res, in vec3 base) {
  vec3 hsv = rgb2hsv(base);
  vec3 res_hsv = rgb2hsv(res);
  return hsv2rgb(vec3(hsv.x, res_hsv.y, res_hsv.z));
}
float gaussian(in float x) {
  return 1.0 - exp(-PI * 2.0 * x * x);
}
void main() {
  lowp vec4 col = texture2D(uTexture, vUv);
  lowp vec3 map = col.rgb;
  vec3 base = col.rgb * matRGBtoROMM;
  float base_lum = luma(col.rgb);
  float map_lum = luma_romm(map * matRGBtoROMM);
  float exposure = mix(uAmount, 0.0, 1.0 - map_lum) * col.a;
  float a = abs(exposure) * col.a + epsilon;
  float v = pow(2.0, a + 1.0) - 2.0;
  float m = mx - exp(-v);
  vec3 res = (exposure > 0.0) ? (1.0 - exp(-v * base)) / m : log(1.0 - base * m) / -v;
  res = mix(base, res, min(a * 100.0, 1.0));
  res = setHue(res, base);
  res = res * matROMMtoRGB;
  gl_FragColor = vec4(res, col.a);
}
`;
export const shadowsFragment$1 = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uAmount;
const float epsilon = 0.000001;
const float mx = 1.0 - epsilon;
const float PI = 3.1415926535897932384626433832795;
const mat3 matRGBtoROMM = mat3(
  0.5293459296226501, 0.3300727903842926, 0.14058130979537964,
  0.09837432950735092, 0.8734610080718994, 0.028164653107523918,
  0.01688321679830551, 0.11767247319221497, 0.8654443025588989
);
const mat3 matROMMtoRGB = mat3(
  2.0340757369995117, -0.727334201335907, -0.3067416846752167,
  -0.22881317138671875, 1.2317301034927368, -0.0029169507324695587,
  -0.008569774217903614, -0.1532866358757019, 1.1618564128875732
);
float luma_romm(in vec3 color) {
  return dot(color, vec3(0.242655, 0.755158, 0.002187));
}
float luma(in vec3 color) {
  return dot(color, vec3(0.298839, 0.586811, 0.11435));
}
vec3 rgb2hsv(in vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(in vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
vec3 setHue(in vec3 res, in vec3 base) {
  vec3 hsv = rgb2hsv(base);
  vec3 res_hsv = rgb2hsv(res);
  return hsv2rgb(vec3(hsv.x, res_hsv.y, res_hsv.z));
}
float gaussian(in float x) {
  return 1.0 - exp(-PI * 2.0 * x * x);
}
void main() {
  lowp vec4 col = texture2D(uTexture, vUv);
  lowp vec3 map = col.rgb;
  vec3 base = col.rgb * matRGBtoROMM;
  float base_lum = luma(col.rgb);
  float map_lum = luma_romm(map * matRGBtoROMM);
  float exposure = mix(0.0, uAmount, 1.0 - map_lum) * col.a;
  float a = abs(exposure) * col.a + epsilon;
  float v = pow(2.0, a + 1.0) - 2.0;
  float m = mx - exp(-v);
  vec3 res = (exposure > 0.0) ? (1.0 - exp(-v * base)) / m : log(1.0 - base * m) / -v;
  res = mix(base, res, min(a * 100.0, 1.0));
  res = setHue(res, base);
  res = res * matROMMtoRGB;
  gl_FragColor = vec4(res, col.a);
}
`;
