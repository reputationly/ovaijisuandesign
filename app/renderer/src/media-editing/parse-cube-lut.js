// parse-cube-lut.js
import { isWebGPUSupported } from "./base-backend.jsx";

let _webglSupported = null;

export function isWebGLSupported() {
  if (_webglSupported !== null) return _webglSupported;
  if (typeof document === "undefined") {
    _webglSupported = false;
    return false;
  }
  try {
    const canvas = document.createElement("canvas");
    const webglContext =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    _webglSupported = !!webglContext;
    if (webglContext) {
      const lose = webglContext.getExtension("WEBGL_lose_context");
      lose?.loseContext();
    }
  } catch {
    _webglSupported = false;
  }
  return _webglSupported;
}

export function selectBestBackend(preferred) {
  if (preferred === "webgpu" && isWebGPUSupported()) {
    return "webgpu";
  }
  if (preferred === "webgl" && isWebGLSupported()) {
    return "webgl";
  }
  if (preferred === "auto" || preferred === void 0) {
    if (isWebGPUSupported()) return "webgpu";
    if (isWebGLSupported()) return "webgl";
  }
  throw new Error("No supported graphics backend available");
}

export function parseCubeLUT(text) {
  const lines = text.split(/\r?\n/);
  let size = 0;
  let title;
  const domainMin = [0, 0, 0];
  const domainMax = [1, 1, 1];
  const triplets = [];
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex];
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const tokens = line.split(/\s+/);
    const head = tokens[0].toUpperCase();
    if (head === "TITLE") {
      const quotedTitleMatch = line.match(/"([^"]*)"/);
      title = quotedTitleMatch?.[1] ?? tokens.slice(1).join(" ");
      continue;
    }
    if (head === "LUT_3D_SIZE") {
      size = parseInt(tokens[1], 10);
      if (!Number.isFinite(size) || size < 2 || size > 256) {
        throw new Error(`Invalid LUT_3D_SIZE: ${tokens[1]}`);
      }
      continue;
    }
    if (head === "LUT_1D_SIZE") {
      throw new Error("1D LUTs are not supported, only LUT_3D_SIZE is allowed");
    }
    if (head === "DOMAIN_MIN") {
      domainMin[0] = parseFloat(tokens[1]);
      domainMin[1] = parseFloat(tokens[2]);
      domainMin[2] = parseFloat(tokens[3]);
      continue;
    }
    if (head === "DOMAIN_MAX") {
      domainMax[0] = parseFloat(tokens[1]);
      domainMax[1] = parseFloat(tokens[2]);
      domainMax[2] = parseFloat(tokens[3]);
      continue;
    }
    if (tokens.length >= 3) {
      const redChannel = parseFloat(tokens[0]);
      const greenChannel = parseFloat(tokens[1]);
      const blueChannel = parseFloat(tokens[2]);
      if (
        !Number.isFinite(redChannel) ||
        !Number.isFinite(greenChannel) ||
        !Number.isFinite(blueChannel)
      ) {
        throw new Error(`Invalid sample at line ${lineIndex + 1}: ${line}`);
      }
      triplets.push(redChannel, greenChannel, blueChannel);
    }
  }
  if (size === 0) {
    throw new Error("Missing LUT_3D_SIZE directive");
  }
  const expectedTriplets = size * size * size;
  if (triplets.length / 3 !== expectedTriplets) {
    throw new Error(
      `Sample count mismatch: expected ${expectedTriplets}, got ${triplets.length / 3}`,
    );
  }
  return {
    size,
    data: new Float32Array(triplets),
    domainMin,
    domainMax,
    title,
  };
}
