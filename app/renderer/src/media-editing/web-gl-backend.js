// web-gl-backend.js
import { BaseBackend } from "./base-backend.jsx";
import { isWebGLSupported } from "./parse-cube-lut.js";
import { defaultLUTParams } from "./default-settings.js";
function lutToFlat2D(lut) {
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
const vertexSource = `
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
const blackVertexSource = `
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
const passFragment = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
void main() {
  gl_FragColor = texture2D(uTexture, vUv);
}
`;
const vibranceFragment = `
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
const saturationFragment = `
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
const temperatureFragment = `
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
const tintFragment = `
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
const hueFragment = `
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
const brightnessFragment = `
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
const exposureFragment = `
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
const contrastFragment = `
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
const whitesFragment = `
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
const blackPaletteFragment = `
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
const highlightsFragment = `
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
const shadowsFragment = `
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

// grain-fragment.js
const dehazeFragment = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uAmount;
uniform vec2 uSize;

float hazeMap(vec2 coord) {
  vec3 color = vec3(1.0);
  vec2 stepSize = vec2(1.0 / uSize.x, 1.0 / uSize.y);
  for (int i = -1; i <= 1; ++i) {
    for (int j = -1; j <= 1; ++j) {
      vec2 offset = vec2(float(i), float(j)) * stepSize;
      vec2 uv = clamp(coord + offset, 0.0, 1.0);
      vec3 sample = texture2D(uTexture, uv).rgb;
      color = min(color, sample);
    }
  }
  return min(color.r, min(color.g, color.b));
}

void main() {
  vec4 base = texture2D(uTexture, vUv);
  float haze = hazeMap(vUv);
  float transmission = 1.0 - 0.95 * haze;
  const float A = 0.95;
  const float t0 = 0.1;
  float t = mix(1.0, max(t0, transmission), uAmount);
  vec3 J = (base.rgb - A) / t + A;
  gl_FragColor = vec4(J, base.a);
}
`;
const bloomFragment = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uAmount;
uniform vec2 uTexel;
uniform float uThreshold;

void main() {
  vec4 sum = vec4(0.0);
  int j = -2;
  for (int i = -2; i <= 2; i++) sum += texture2D(uTexture, vUv + vec2(float(i), float(j)) * uTexel);
  j = -1;
  for (int i = -2; i <= 2; i++) sum += texture2D(uTexture, vUv + vec2(float(i), float(j)) * uTexel);
  j = 0;
  for (int i = -2; i <= 2; i++) sum += texture2D(uTexture, vUv + vec2(float(i), float(j)) * uTexel);
  j = 1;
  for (int i = -2; i <= 2; i++) sum += texture2D(uTexture, vUv + vec2(float(i), float(j)) * uTexel);
  j = 2;
  for (int i = -2; i <= 2; i++) sum += texture2D(uTexture, vUv + vec2(float(i), float(j)) * uTexel);
  sum /= 25.0;
  vec4 base = texture2D(uTexture, vUv);
  if (length(sum.rgb) > uThreshold) {
    base += sum * uAmount;
  }
  gl_FragColor = base;
}
`;
const glamourFragment = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uAmount;
uniform vec2 uTexel;

float normpdf(in float x, in float sigma) {
  return 0.39894 * exp(-0.5 * x * x / (sigma * sigma)) / sigma;
}

vec3 blurMap() {
  const int mSize = 11;
  const int kSize = (mSize - 1) / 2;
  float kernel[mSize];
  vec3 final_colour = vec3(0.0);
  float sigma = 7.0;
  float Z = 0.0;
  for (int j = 0; j <= kSize; ++j) {
    kernel[kSize + j] = kernel[kSize - j] = normpdf(float(j), sigma);
  }
  for (int j = 0; j < mSize; ++j) {
    Z += kernel[j];
  }
  for (int i = -kSize; i <= kSize; ++i) {
    for (int j = -kSize; j <= kSize; ++j) {
      final_colour += kernel[kSize + j] * kernel[kSize + i] *
        texture2D(uTexture, vUv + vec2(float(i), float(j)) * uTexel).rgb;
    }
  }
  return vec3(final_colour / (Z * Z));
}

float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec4 base = texture2D(uTexture, vUv);
  vec3 color = blurMap();
  color = vec3(luma(color));
  color = vec3(
    (base.r <= 0.5) ? (2.0 * base.r * color.r) : (1.0 - 2.0 * (1.0 - base.r) * (1.0 - color.r)),
    (base.g <= 0.5) ? (2.0 * base.g * color.g) : (1.0 - 2.0 * (1.0 - base.g) * (1.0 - color.g)),
    (base.b <= 0.5) ? (2.0 * base.b * color.b) : (1.0 - 2.0 * (1.0 - base.b) * (1.0 - color.b))
  );
  gl_FragColor = mix(base, vec4(color, base.a), uAmount);
}
`;
const clarityFragment = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uAmount;
uniform vec2 uTexel;

float Lum(vec3 c) {
  return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
}
float BlendOverlayf(float base, float blend) {
  return (base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)));
}
vec3 BlendOverlay(vec3 base, vec3 blend) {
  return vec3(BlendOverlayf(base.r, blend.r), BlendOverlayf(base.g, blend.g), BlendOverlayf(base.b, blend.b));
}
float BlendVividLightf(float base, float blend) {
  float BlendColorBurnf = (((2.0 * blend) == 0.0) ? (2.0 * blend) : max((1.0 - ((1.0 - base) / (2.0 * blend))), 0.0));
  float BlendColorDodgef = (((2.0 * (blend - 0.5)) == 1.0) ? (2.0 * (blend - 0.5)) : min(base / (1.0 - (2.0 * (blend - 0.5))), 1.0));
  return ((blend < 0.5) ? BlendColorBurnf : BlendColorDodgef);
}
vec3 BlendVividLight(vec3 base, vec3 blend) {
  return vec3(BlendVividLightf(base.r, blend.r), BlendVividLightf(base.g, blend.g), BlendVividLightf(base.b, blend.b));
}
float normpdf(in float x, in float sigma) {
  return 0.39894 * exp(-0.5 * x * x / (sigma * sigma)) / sigma;
}
vec3 blurMap() {
  const int mSize = 11;
  const int kSize = (mSize - 1) / 2;
  float kernel[mSize];
  vec3 final_colour = vec3(0.0);
  float sigma = 7.0;
  float Z = 0.0;
  for (int j = 0; j <= kSize; ++j) {
    kernel[kSize + j] = kernel[kSize - j] = normpdf(float(j), sigma);
  }
  for (int j = 0; j < mSize; ++j) {
    Z += kernel[j];
  }
  for (int i = -kSize; i <= kSize; ++i) {
    for (int j = -kSize; j <= kSize; ++j) {
      final_colour += kernel[kSize + j] * kernel[kSize + i] *
        texture2D(uTexture, vUv + vec2(float(i), float(j)) * uTexel).rgb;
    }
  }
  return vec3(final_colour / (Z * Z));
}
void main() {
  vec4 base4 = texture2D(uTexture, vUv);
  vec3 blur = blurMap();
  vec3 base = base4.rgb;
  float intensity = (uAmount < 0.0) ? (uAmount / 2.0) : uAmount;
  float lum = Lum(base);
  vec3 col = vec3(lum);
  vec3 mask = vec3(1.0 - pow(lum, 1.8));
  vec3 layer = vec3(1.0 - Lum(blur));
  vec3 detail = clamp(BlendVividLight(col, layer), 0.0, 1.0);
  vec3 inverse = mix(1.0 - detail, detail, (intensity + 1.0) / 2.0);
  gl_FragColor = vec4(BlendOverlay(base, mix(vec3(0.5), inverse, mask)), base4.a);
}
`;
const kernelFragment = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform vec2 uTexel;
uniform float uKernel[9];
uniform float uAmount;
void main(void) {
  vec4 c11 = texture2D(uTexture, vUv - uTexel);
  vec4 c12 = texture2D(uTexture, vec2(vUv.x, vUv.y - uTexel.y));
  vec4 c13 = texture2D(uTexture, vec2(vUv.x + uTexel.x, vUv.y - uTexel.y));
  vec4 c21 = texture2D(uTexture, vec2(vUv.x - uTexel.x, vUv.y));
  vec4 c22 = texture2D(uTexture, vUv);
  vec4 c23 = texture2D(uTexture, vec2(vUv.x + uTexel.x, vUv.y));
  vec4 c31 = texture2D(uTexture, vec2(vUv.x - uTexel.x, vUv.y + uTexel.y));
  vec4 c32 = texture2D(uTexture, vec2(vUv.x, vUv.y + uTexel.y));
  vec4 c33 = texture2D(uTexture, vUv + uTexel);
  vec4 color = c11 * uKernel[0] + c12 * uKernel[1] + c13 * uKernel[2] +
    c21 * uKernel[3] + c22 * uKernel[4] + c23 * uKernel[5] +
    c31 * uKernel[6] + c32 * uKernel[7] + c33 * uKernel[8];
  gl_FragColor = color * uAmount + (c22 * (1.0 - uAmount));
}
`;
const blurFragment = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform vec2 uSize;
float random(vec3 scale, float seed) {
  return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
}
void main() {
  vec4 color = vec4(0.0);
  float total = 0.0;
  float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);
  for (int t = -30; t <= 30; t++) {
    float percent = (float(t) + offset - 0.5) / 30.0;
    float weight = 1.0 - abs(percent);
    vec4 sample = texture2D(uTexture, vUv + uSize * percent);
    sample.rgb *= sample.a;
    color += sample * weight;
    total += weight;
  }
  gl_FragColor = color / total;
  gl_FragColor.rgb /= gl_FragColor.a + 0.00001;
}
`;
const vignetteFragment = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uAmount;
uniform float uSize;
void main() {
  vec4 color = texture2D(uTexture, vUv);
  float dist = distance(vUv, vec2(0.5, 0.5));
  float amt = clamp(uAmount, -1.0, 1.0);
  float edge = dist * (abs(amt) * 0.75 + uSize * 2.0);
  float vignette = smoothstep(0.8, uSize * 0.799, edge);
  if (amt < 0.0) {
    vignette = 1.0 + (1.0 - vignette) * (-amt);
  } else {
    vignette = mix(1.0, vignette, amt);
  }
  color.rgb *= vignette;
  gl_FragColor = color;
}
`;
const grainFragment = `
precision highp float;
uniform sampler2D uTexture;
varying vec2 vUv;
uniform vec2 uResolution;
uniform float uAmount;
uniform float uTime;
const float permTexUnit = 1.0 / 256.0;
const float permTexUnitHalf = 0.5 / 256.0;
float grainsize = 1.8;
float lumamount = 1.0;

vec4 rnm(in vec2 tc) {
  float noise = sin(dot(tc + vec2(uTime, uTime), vec2(12.9898, 78.233))) * 43758.5453;
  float noiseR = fract(noise) * 2.0 - 1.0;
  float noiseG = fract(noise * 1.2154) * 2.0 - 1.0;
  float noiseB = fract(noise * 1.3453) * 2.0 - 1.0;
  float noiseA = fract(noise * 1.3647) * 2.0 - 1.0;
  return vec4(noiseR, noiseG, noiseB, noiseA);
}
float fade(in float t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
float pnoise3D(in vec3 p) {
  vec3 pi = permTexUnit * floor(p) + permTexUnitHalf;
  vec3 pf = fract(p);
  float perm00 = rnm(pi.xy).a;
  vec3 grad000 = rnm(vec2(perm00, pi.z)).rgb * 4.0 - 1.0;
  float n000 = dot(grad000, pf);
  vec3 grad001 = rnm(vec2(perm00, pi.z + permTexUnit)).rgb * 4.0 - 1.0;
  float n001 = dot(grad001, pf - vec3(0.0, 0.0, 1.0));
  float perm01 = rnm(pi.xy + vec2(0.0, permTexUnit)).a;
  vec3 grad010 = rnm(vec2(perm01, pi.z)).rgb * 4.0 - 1.0;
  float n010 = dot(grad010, pf - vec3(0.0, 1.0, 0.0));
  vec3 grad011 = rnm(vec2(perm01, pi.z + permTexUnit)).rgb * 4.0 - 1.0;
  float n011 = dot(grad011, pf - vec3(0.0, 1.0, 1.0));
  float perm10 = rnm(pi.xy + vec2(permTexUnit, 0.0)).a;
  vec3 grad100 = rnm(vec2(perm10, pi.z)).rgb * 4.0 - 1.0;
  float n100 = dot(grad100, pf - vec3(1.0, 0.0, 0.0));
  vec3 grad101 = rnm(vec2(perm10, pi.z + permTexUnit)).rgb * 4.0 - 1.0;
  float n101 = dot(grad101, pf - vec3(1.0, 0.0, 1.0));
  float perm11 = rnm(pi.xy + vec2(permTexUnit, permTexUnit)).a;
  vec3 grad110 = rnm(vec2(perm11, pi.z)).rgb * 4.0 - 1.0;
  float n110 = dot(grad110, pf - vec3(1.0, 1.0, 0.0));
  vec3 grad111 = rnm(vec2(perm11, pi.z + permTexUnit)).rgb * 4.0 - 1.0;
  float n111 = dot(grad111, pf - vec3(1.0, 1.0, 1.0));
  vec4 n_x = mix(vec4(n000, n001, n010, n011), vec4(n100, n101, n110, n111), fade(pf.x));
  vec2 n_xy = mix(n_x.xy, n_x.zw, fade(pf.y));
  float n_xyz = mix(n_xy.x, n_xy.y, fade(pf.z));
  return n_xyz;
}
vec2 coordRot(in vec2 tc, in float angle) {
  float aspect = uResolution.x / uResolution.y;
  float rotX = ((tc.x * 2.0 - 1.0) * aspect * cos(angle)) - ((tc.y * 2.0 - 1.0) * sin(angle));
  float rotY = ((tc.y * 2.0 - 1.0) * cos(angle)) + ((tc.x * 2.0 - 1.0) * aspect * sin(angle));
  rotX = ((rotX / aspect) * 0.5 + 0.5);
  rotY = rotY * 0.5 + 0.5;
  return vec2(rotX, rotY);
}
void main() {
  vec3 rotOffset = vec3(1.425, 3.892, 5.835);
  vec2 rotCoordsR = coordRot(vUv, uTime + rotOffset.x);
  vec3 noise = vec3(pnoise3D(vec3(rotCoordsR * vec2(uResolution.x / grainsize, uResolution.y / grainsize), 0.0)));
  vec4 tex = texture2D(uTexture, vUv);
  vec3 col = tex.rgb;
  vec3 lumcoeff = vec3(0.299, 0.587, 0.114);
  float luminance = mix(0.0, dot(col, lumcoeff), lumamount);
  float lum = smoothstep(0.2, 0.0, luminance);
  lum += luminance;
  noise = mix(noise, vec3(0.0), pow(lum, 4.0));
  col = col + noise * uAmount;
  gl_FragColor = vec4(col, tex.a);
}
`;
const lutFragment = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform sampler2D uLUT;
uniform float uLUTSize;
uniform float uIntensity;

vec3 sampleLUT(vec3 rgb) {
  float size = uLUTSize;
  float bF = clamp(rgb.b, 0.0, 1.0) * (size - 1.0);
  float bLow = floor(bF);
  float bHigh = min(bLow + 1.0, size - 1.0);
  float bFrac = bF - bLow;

  float xCol = clamp(rgb.r, 0.0, 1.0) * (size - 1.0) + 0.5;
  float y = (clamp(rgb.g, 0.0, 1.0) * (size - 1.0) + 0.5) / size;

  float xLow = (bLow * size + xCol) / (size * size);
  float xHigh = (bHigh * size + xCol) / (size * size);

  vec3 colorLow = texture2D(uLUT, vec2(xLow, y)).rgb;
  vec3 colorHigh = texture2D(uLUT, vec2(xHigh, y)).rgb;

  return mix(colorLow, colorHigh, bFrac);
}

void main() {
  vec4 base = texture2D(uTexture, vUv);
  vec3 rgb = clamp(base.rgb, 0.0, 1.0);
  vec3 lutColor = sampleLUT(rgb);
  vec3 finalColor = mix(rgb, lutColor, uIntensity);

  gl_FragColor = vec4(finalColor, base.a);
}
`;
function createShader(gl, type2, source) {
  const shader = gl.createShader(type2);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}
function createProgram(gl, vs2, fs) {
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs2);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}
function buildProgram(gl, vertex, fragment2, uniforms) {
  const vs2 = createShader(gl, gl.VERTEX_SHADER, vertex);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fragment2);
  if (!vs2 || !fs) {
    throw new Error("Shader compile failed.");
  }
  const program = createProgram(gl, vs2, fs);
  if (!program) {
    throw new Error("Program link failed.");
  }
  const attribs = {
    aPosition: gl.getAttribLocation(program, "aPosition"),
    aTexCoord: gl.getAttribLocation(program, "aTexCoord"),
    apos: gl.getAttribLocation(program, "apos"),
    auv: gl.getAttribLocation(program, "auv"),
  };
  const uniformMap = {};
  ["uFlipY", ...uniforms].forEach((name2) => {
    uniformMap[name2] = gl.getUniformLocation(program, name2);
  });
  return {
    program,
    attribs,
    uniforms: uniformMap,
  };
}
function createRenderTarget(gl, width, height) {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Unable to create texture");
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) {
    throw new Error("Unable to create framebuffer");
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0,
  );
  return {
    framebuffer,
    texture,
  };
}
const PALETTE_SIZE = 256;
const clamp01$1 = (value) => Math.min(1, Math.max(0, value));
const cubicBezier = (t2, p0, p1, p22, p3) => {
  const u4 = 1 - t2;
  return (
    u4 * u4 * u4 * p0 +
    3 * u4 * u4 * t2 * p1 +
    3 * u4 * t2 * t2 * p22 +
    t2 * t2 * t2 * p3
  );
};
const buildCurvePalette = (lowControl, highControl) => {
  const data2 = new Uint8Array(PALETTE_SIZE * 3);
  for (let i2 = 0; i2 < PALETTE_SIZE; i2 += 1) {
    const t2 = i2 / (PALETTE_SIZE - 1);
    const y4 = cubicBezier(t2, 0, lowControl, highControl, 1);
    const v2 = Math.round(clamp01$1(y4) * 255);
    const idx = i2 * 3;
    data2[idx] = v2;
    data2[idx + 1] = v2;
    data2[idx + 2] = v2;
  }
  return data2;
};
const buildBlackPalette = (amount) => {
  const amt = Math.max(-100, Math.min(100, amount)) / 100;
  const strength = 0.35;
  const lowControl = clamp01$1(0.33 - amt * strength);
  const highControl = 0.66;
  return buildCurvePalette(lowControl, highControl);
};
const createPaletteTexture = (gl, data2) => {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Unable to create palette texture");
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGB,
    PALETTE_SIZE,
    1,
    0,
    gl.RGB,
    gl.UNSIGNED_BYTE,
    data2,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
};
const updatePaletteTexture = (gl, texture, data2) => {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texSubImage2D(
    gl.TEXTURE_2D,
    0,
    0,
    0,
    PALETTE_SIZE,
    1,
    gl.RGB,
    gl.UNSIGNED_BYTE,
    data2,
  );
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
const SHARPEN_KERNEL = new Float32Array([0, -1, 0, -1, 5, -1, 0, -1, 0]);
const SMOOTH_KERNEL = new Float32Array([
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
]);
export class WebGLBackend extends BaseBackend {
  gl = null;
  resources = null;
  lutParams = {
    ...defaultLUTParams,
  };
  lastBlacksPalette = Number.NaN;
  // ImageBitmap / raw pixel uploads ignore UNPACK_FLIP_Y_WEBGL. Correct only
  // the source-texture pass; framebuffer textures already have WebGL orientation.
  sourceNeedsFlipY = false;
  constructor(canvas, options = {}) {
    super(canvas, options);
  }
  getType() {
    return "webgl";
  }
  static isSupported() {
    return isWebGLSupported();
  }
  init() {
    this.gl = this.canvas.getContext("webgl", {
      antialias: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    if (!this.gl) {
      throw new Error("WebGL not supported");
    }
    this.initialized = true;
  }
  loadFromImage(image2) {
    if (!this.gl) this.init();
    const gl = this.gl;
    if (!gl) throw new Error("WebGL context not available");
    this.sourceNeedsFlipY = false;
    const width = image2.naturalWidth || image2.width;
    const height = image2.naturalHeight || image2.height;
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.disposeResources();
    gl.disable(gl.DEPTH_TEST);
    gl.viewport(0, 0, width, height);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    const sourceTexture = gl.createTexture();
    if (!sourceTexture) throw new Error("Failed to create texture");
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image2);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.initResources(gl, width, height, sourceTexture);
  }
  loadFromImageData(imageData) {
    if (!this.gl) this.init();
    const gl = this.gl;
    if (!gl) throw new Error("WebGL context not available");
    this.sourceNeedsFlipY = true;
    const { width, height, data: data2 } = imageData;
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.disposeResources();
    gl.viewport(0, 0, width, height);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    const sourceTexture = gl.createTexture();
    if (!sourceTexture) throw new Error("Failed to create texture");
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      data2,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.initResources(gl, width, height, sourceTexture);
  }
  loadFromVideo(video) {
    this.loadFromSource(video, video.videoWidth, video.videoHeight);
  }
  loadFromSource(source, width, height) {
    if (!this.gl) this.init();
    const gl = this.gl;
    if (!gl) throw new Error("WebGL context not available");
    if (!width || !height) {
      throw new Error("Source dimensions unavailable");
    }
    this.sourceNeedsFlipY =
      typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap;
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.disposeResources();
    gl.disable(gl.DEPTH_TEST);
    gl.viewport(0, 0, width, height);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    const sourceTexture = gl.createTexture();
    if (!sourceTexture) throw new Error("Failed to create texture");
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.initResources(gl, width, height, sourceTexture);
  }
  updateFromVideo(video) {
    this.updateFromSource(video);
  }
  updateFromSource(source) {
    const gl = this.gl;
    if (!gl || !this.resources) {
      throw new Error("Backend not ready, call loadFromSource first");
    }
    this.sourceNeedsFlipY =
      typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.bindTexture(gl.TEXTURE_2D, this.resources.sourceTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }
  setLUT(lut) {
    const gl = this.gl;
    if (!gl || !this.resources) {
      throw new Error("Backend not initialized");
    }
    if (this.resources.lutTexture) {
      gl.deleteTexture(this.resources.lutTexture);
      this.resources.lutTexture = null;
      this.resources.lutSize = 0;
    }
    if (!lut) return;
    const flat = lutToFlat2D(lut);
    const tex = gl.createTexture();
    if (!tex) throw new Error("Failed to create LUT texture");
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      flat.width,
      flat.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      flat.data,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    this.resources.lutTexture = tex;
    this.resources.lutSize = lut.size;
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
  getImageData() {
    const gl = this.gl;
    if (gl) {
      const pixels = new Uint8ClampedArray(this.width * this.height * 4);
      gl.readPixels(
        0,
        0,
        this.width,
        this.height,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels,
      );
      return new ImageData(pixels, this.width, this.height);
    }
    throw new Error("Cannot get ImageData");
  }
  dispose() {
    this.disposeResources();
    if (this.gl) {
      const loseExt = this.gl.getExtension("WEBGL_lose_context");
      loseExt?.loseContext();
    }
    this.gl = null;
    this.initialized = false;
  }
  initResources(gl, width, height, sourceTexture) {
    const blackPalette = createPaletteTexture(gl, buildBlackPalette(0));
    this.lastBlacksPalette = 0;
    const positionBuffer = gl.createBuffer();
    const texCoordBuffer = gl.createBuffer();
    if (!positionBuffer || !texCoordBuffer) {
      throw new Error("Failed to create buffers");
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const vs2 = vertexSource;
    const blackVs = blackVertexSource;
    const programs = {
      pass: buildProgram(gl, vs2, passFragment, ["uTexture"]),
      vibrance: buildProgram(gl, vs2, vibranceFragment, [
        "uTexture",
        "uAmount",
      ]),
      saturation: buildProgram(gl, vs2, saturationFragment, [
        "uTexture",
        "uMatrix[0]",
      ]),
      temperature: buildProgram(gl, vs2, temperatureFragment, [
        "uTexture",
        "uAmount",
      ]),
      tint: buildProgram(gl, vs2, tintFragment, ["uTexture", "uAmount"]),
      hue: buildProgram(gl, vs2, hueFragment, ["uTexture", "uRotation"]),
      brightness: buildProgram(gl, vs2, brightnessFragment, [
        "uTexture",
        "uAmount",
      ]),
      exposure: buildProgram(gl, vs2, exposureFragment, [
        "uTexture",
        "uAmount",
      ]),
      contrast: buildProgram(gl, vs2, contrastFragment, [
        "uTexture",
        "uMatrix[0]",
      ]),
      blacks: buildProgram(gl, blackVs, blackPaletteFragment, [
        "uTexture",
        "uPaletteMap",
        "transform",
      ]),
      whites: buildProgram(gl, vs2, whitesFragment, ["uTexture", "uAmount"]),
      highlights: buildProgram(gl, vs2, highlightsFragment, [
        "uTexture",
        "uAmount",
      ]),
      shadows: buildProgram(gl, vs2, shadowsFragment, ["uTexture", "uAmount"]),
      dehaze: buildProgram(gl, vs2, dehazeFragment, [
        "uTexture",
        "uAmount",
        "uSize",
      ]),
      bloom: buildProgram(gl, vs2, bloomFragment, [
        "uTexture",
        "uAmount",
        "uTexel",
        "uThreshold",
      ]),
      glamour: buildProgram(gl, vs2, glamourFragment, [
        "uTexture",
        "uAmount",
        "uTexel",
      ]),
      clarity: buildProgram(gl, vs2, clarityFragment, [
        "uTexture",
        "uAmount",
        "uTexel",
      ]),
      sharpen: buildProgram(gl, vs2, kernelFragment, [
        "uTexture",
        "uTexel",
        "uKernel[0]",
        "uAmount",
      ]),
      smooth: buildProgram(gl, vs2, kernelFragment, [
        "uTexture",
        "uTexel",
        "uKernel[0]",
        "uAmount",
      ]),
      blur: buildProgram(gl, vs2, blurFragment, ["uTexture", "uSize"]),
      vignette: buildProgram(gl, vs2, vignetteFragment, [
        "uTexture",
        "uAmount",
        "uSize",
      ]),
      grain: buildProgram(gl, vs2, grainFragment, [
        "uTexture",
        "uResolution",
        "uAmount",
        "uTime",
      ]),
      lut: buildProgram(gl, vs2, lutFragment, [
        "uTexture",
        "uLUT",
        "uLUTSize",
        "uIntensity",
      ]),
    };
    const targets = [
      createRenderTarget(gl, width, height),
      createRenderTarget(gl, width, height),
    ];
    this.resources = {
      gl,
      width,
      height,
      sourceTexture,
      blackPalette,
      lutTexture: null,
      lutSize: 0,
      quad: {
        positionBuffer,
        texCoordBuffer,
      },
      programs,
      targets,
    };
  }
  disposeResources() {
    if (!this.resources) return;
    const {
      gl,
      sourceTexture,
      blackPalette,
      lutTexture,
      quad,
      programs,
      targets,
    } = this.resources;
    gl.deleteTexture(sourceTexture);
    gl.deleteTexture(blackPalette);
    if (lutTexture) gl.deleteTexture(lutTexture);
    gl.deleteBuffer(quad.positionBuffer);
    gl.deleteBuffer(quad.texCoordBuffer);
    targets.forEach((target) => {
      gl.deleteFramebuffer(target.framebuffer);
      gl.deleteTexture(target.texture);
    });
    Object.values(programs).forEach((programInfo) => {
      gl.deleteProgram(programInfo.program);
    });
    this.resources = null;
  }
  drawFrame(resources, settings) {
    const {
      gl,
      width,
      height,
      sourceTexture,
      blackPalette,
      quad,
      programs,
      targets,
    } = resources;
    gl.viewport(0, 0, width, height);
    const texel = [1 / width, 1 / height];
    let inputTexture = sourceTexture;
    let pingIndex = 0;
    const bindAttributes = (program) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, quad.positionBuffer);
      const positionAttrib =
        program.attribs.aPosition >= 0
          ? program.attribs.aPosition
          : program.attribs.apos;
      if (positionAttrib >= 0) {
        gl.enableVertexAttribArray(positionAttrib);
        gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, quad.texCoordBuffer);
      const texAttrib =
        program.attribs.aTexCoord >= 0
          ? program.attribs.aTexCoord
          : program.attribs.auv;
      if (texAttrib >= 0) {
        gl.enableVertexAttribArray(texAttrib);
        gl.vertexAttribPointer(texAttrib, 2, gl.FLOAT, false, 0, 0);
      }
    };
    const drawPass = (program, setupUniforms, output) => {
      gl.useProgram(program.program);
      bindAttributes(program);
      gl.uniform1f(
        program.uniforms.uFlipY,
        this.sourceNeedsFlipY && inputTexture === sourceTexture ? 1 : 0,
      );
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, inputTexture);
      const textureLoc = program.uniforms.uTexture;
      if (textureLoc) gl.uniform1i(textureLoc, 0);
      setupUniforms();
      gl.bindFramebuffer(gl.FRAMEBUFFER, output ? output.framebuffer : null);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      inputTexture = output ? output.texture : inputTexture;
    };
    const swapTarget = () => {
      const target = targets[pingIndex % 2];
      pingIndex += 1;
      return target;
    };
    const lut = resources.lutTexture;
    const lutSize = resources.lutSize;
    if (lut && lutSize > 0 && this.lutParams.intensity > 5e-3) {
      drawPass(
        programs.lut,
        () => {
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, lut);
          gl.uniform1i(programs.lut.uniforms.uLUT, 1);
          gl.uniform1f(programs.lut.uniforms.uLUTSize, lutSize);
          gl.uniform1f(
            programs.lut.uniforms.uIntensity,
            this.lutParams.intensity,
          );
          gl.activeTexture(gl.TEXTURE0);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.vibrance) > 0.5) {
      drawPass(
        programs.vibrance,
        () => {
          gl.uniform1f(
            programs.vibrance.uniforms.uAmount,
            settings.vibrance / 100,
          );
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.saturation) > 0.5) {
      drawPass(
        programs.saturation,
        () => {
          const matrix = buildSaturationMatrix(settings.saturation);
          gl.uniform1fv(programs.saturation.uniforms["uMatrix[0]"], matrix);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.temperature) > 0.5) {
      drawPass(
        programs.temperature,
        () => {
          gl.uniform1f(
            programs.temperature.uniforms.uAmount,
            settings.temperature / 500,
          );
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.tint) > 0.5) {
      drawPass(
        programs.tint,
        () => {
          gl.uniform1f(programs.tint.uniforms.uAmount, settings.tint / 500);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.hue) > 0.5) {
      drawPass(
        programs.hue,
        () => {
          gl.uniform1f(programs.hue.uniforms.uRotation, settings.hue / 200);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.brightness) > 0.5) {
      drawPass(
        programs.brightness,
        () => {
          gl.uniform1f(
            programs.brightness.uniforms.uAmount,
            settings.brightness / 200,
          );
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.exposure) > 0.5) {
      drawPass(
        programs.exposure,
        () => {
          gl.uniform1f(
            programs.exposure.uniforms.uAmount,
            settings.exposure / 100,
          );
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.contrast) > 0.5) {
      drawPass(
        programs.contrast,
        () => {
          const matrix = buildContrastMatrix(settings.contrast);
          gl.uniform1fv(programs.contrast.uniforms["uMatrix[0]"], matrix);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.blacks) > 0.5) {
      if (this.lastBlacksPalette !== settings.blacks) {
        updatePaletteTexture(
          gl,
          blackPalette,
          buildBlackPalette(settings.blacks),
        );
        this.lastBlacksPalette = settings.blacks;
      }
      drawPass(
        programs.blacks,
        () => {
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, blackPalette);
          gl.uniform1i(programs.blacks.uniforms.uPaletteMap, 1);
          gl.uniform4f(programs.blacks.uniforms.transform, 1, 1, 0, 0);
          gl.activeTexture(gl.TEXTURE0);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.whites) > 0.5) {
      drawPass(
        programs.whites,
        () => {
          gl.uniform1f(programs.whites.uniforms.uAmount, settings.whites / 400);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.highlights) > 0.5) {
      drawPass(
        programs.highlights,
        () => {
          gl.uniform1f(
            programs.highlights.uniforms.uAmount,
            settings.highlights / 100,
          );
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.shadows) > 0.5) {
      drawPass(
        programs.shadows,
        () => {
          gl.uniform1f(
            programs.shadows.uniforms.uAmount,
            settings.shadows / 100,
          );
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.dehaze) > 0.5) {
      drawPass(
        programs.dehaze,
        () => {
          gl.uniform1f(programs.dehaze.uniforms.uAmount, settings.dehaze / 100);
          gl.uniform2f(programs.dehaze.uniforms.uSize, width, height);
        },
        swapTarget(),
      );
    }
    if (settings.bloom > 0.5) {
      drawPass(
        programs.bloom,
        () => {
          gl.uniform1f(programs.bloom.uniforms.uAmount, settings.bloom / 100);
          gl.uniform2f(programs.bloom.uniforms.uTexel, texel[0], texel[1]);
          gl.uniform1f(programs.bloom.uniforms.uThreshold, 0.5);
        },
        swapTarget(),
      );
    }
    if (settings.glamour > 0.5) {
      drawPass(
        programs.glamour,
        () => {
          gl.uniform1f(
            programs.glamour.uniforms.uAmount,
            settings.glamour / 100,
          );
          gl.uniform2f(programs.glamour.uniforms.uTexel, texel[0], texel[1]);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.clarity) > 0.5) {
      drawPass(
        programs.clarity,
        () => {
          gl.uniform1f(
            programs.clarity.uniforms.uAmount,
            settings.clarity / 100,
          );
          gl.uniform2f(programs.clarity.uniforms.uTexel, texel[0], texel[1]);
        },
        swapTarget(),
      );
    }
    if (settings.sharpen > 0.5) {
      drawPass(
        programs.sharpen,
        () => {
          gl.uniform2f(programs.sharpen.uniforms.uTexel, texel[0], texel[1]);
          gl.uniform1f(
            programs.sharpen.uniforms.uAmount,
            settings.sharpen / 100,
          );
          gl.uniform1fv(
            programs.sharpen.uniforms["uKernel[0]"],
            SHARPEN_KERNEL,
          );
        },
        swapTarget(),
      );
    }
    if (settings.smooth > 0.5) {
      drawPass(
        programs.smooth,
        () => {
          gl.uniform2f(programs.smooth.uniforms.uTexel, texel[0], texel[1]);
          gl.uniform1f(programs.smooth.uniforms.uAmount, settings.smooth / 100);
          gl.uniform1fv(programs.smooth.uniforms["uKernel[0]"], SMOOTH_KERNEL);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.blur) > 0.5) {
      const blurRadius = settings.blur;
      drawPass(
        programs.blur,
        () => {
          gl.uniform2f(programs.blur.uniforms.uSize, blurRadius / width, 0);
        },
        swapTarget(),
      );
      drawPass(
        programs.blur,
        () => {
          gl.uniform2f(programs.blur.uniforms.uSize, 0, blurRadius / height);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.vignette) > 0.5) {
      drawPass(
        programs.vignette,
        () => {
          gl.uniform1f(
            programs.vignette.uniforms.uAmount,
            settings.vignette / 100,
          );
          gl.uniform1f(programs.vignette.uniforms.uSize, 0.25);
        },
        swapTarget(),
      );
    }
    if (Math.abs(settings.grain) > 0.5) {
      drawPass(
        programs.grain,
        () => {
          gl.uniform2f(programs.grain.uniforms.uResolution, width, height);
          gl.uniform1f(programs.grain.uniforms.uAmount, settings.grain / 800);
          gl.uniform1f(programs.grain.uniforms.uTime, 0);
        },
        swapTarget(),
      );
    }
    drawPass(programs.pass, () => {}, null);
  }
}
