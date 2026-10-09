// default-settings.js

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
