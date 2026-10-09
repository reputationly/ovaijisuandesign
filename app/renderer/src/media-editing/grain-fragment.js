// grain-fragment.js
export const dehazeFragment$1 = `
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
export const bloomFragment$1 = `
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
export const glamourFragment$1 = `
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
export const clarityFragment$1 = `
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
export const kernelFragment$1 = `
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
export const blurFragment$1 = `
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
export const vignetteFragment$1 = `
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
export const grainFragment$1 = `
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
export const lutFragment$1 = `
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
export function buildProgram(gl, vertex, fragment2, uniforms) {
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
