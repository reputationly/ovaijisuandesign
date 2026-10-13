// default-settings.js

// highlights-fragment.js
export function lutToRGBA8(lookupTable) {
  const { data, size, domainMin, domainMax } = lookupTable;
  const total = size * size * size;
  const rgbaBuffer = new Uint8Array(total * 4);
  const redRange = domainMax[0] - domainMin[0] || 1;
  const greenRange = domainMax[1] - domainMin[1] || 1;
  const blueRange = domainMax[2] - domainMin[2] || 1;
  for (let voxelIndex = 0; voxelIndex < total; voxelIndex++) {
    const redValue = (data[voxelIndex * 3] - domainMin[0]) / redRange;
    const greenValue = (data[voxelIndex * 3 + 1] - domainMin[1]) / greenRange;
    const blueValue = (data[voxelIndex * 3 + 2] - domainMin[2]) / blueRange;
    rgbaBuffer[voxelIndex * 4] = Math.max(0, Math.min(255, Math.round(redValue * 255)));
    rgbaBuffer[voxelIndex * 4 + 1] = Math.max(0, Math.min(255, Math.round(greenValue * 255)));
    rgbaBuffer[voxelIndex * 4 + 2] = Math.max(0, Math.min(255, Math.round(blueValue * 255)));
    rgbaBuffer[voxelIndex * 4 + 3] = 255;
  }
  return rgbaBuffer;
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
