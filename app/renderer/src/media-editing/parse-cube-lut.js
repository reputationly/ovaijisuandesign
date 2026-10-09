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
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    _webglSupported = !!gl;
    if (gl) {
      const lose = gl.getExtension("WEBGL_lose_context");
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

export function parseCubeLUT(text2) {
  const lines = text2.split(/\r?\n/);
  let size2 = 0;
  let title;
  const domainMin = [0, 0, 0];
  const domainMax = [1, 1, 1];
  const triplets = [];
  for (let i2 = 0; i2 < lines.length; i2++) {
    const raw2 = lines[i2];
    const line = raw2.trim();
    if (!line || line.startsWith("#")) continue;
    const tokens2 = line.split(/\s+/);
    const head2 = tokens2[0].toUpperCase();
    if (head2 === "TITLE") {
      const m3 = line.match(/"([^"]*)"/);
      title = m3?.[1] ?? tokens2.slice(1).join(" ");
      continue;
    }
    if (head2 === "LUT_3D_SIZE") {
      size2 = parseInt(tokens2[1], 10);
      if (!Number.isFinite(size2) || size2 < 2 || size2 > 256) {
        throw new Error(`Invalid LUT_3D_SIZE: ${tokens2[1]}`);
      }
      continue;
    }
    if (head2 === "LUT_1D_SIZE") {
      throw new Error("1D LUTs are not supported, only LUT_3D_SIZE is allowed");
    }
    if (head2 === "DOMAIN_MIN") {
      domainMin[0] = parseFloat(tokens2[1]);
      domainMin[1] = parseFloat(tokens2[2]);
      domainMin[2] = parseFloat(tokens2[3]);
      continue;
    }
    if (head2 === "DOMAIN_MAX") {
      domainMax[0] = parseFloat(tokens2[1]);
      domainMax[1] = parseFloat(tokens2[2]);
      domainMax[2] = parseFloat(tokens2[3]);
      continue;
    }
    if (tokens2.length >= 3) {
      const r2 = parseFloat(tokens2[0]);
      const g2 = parseFloat(tokens2[1]);
      const b3 = parseFloat(tokens2[2]);
      if (
        !Number.isFinite(r2) ||
        !Number.isFinite(g2) ||
        !Number.isFinite(b3)
      ) {
        throw new Error(`Invalid sample at line ${i2 + 1}: ${line}`);
      }
      triplets.push(r2, g2, b3);
    }
  }
  if (size2 === 0) {
    throw new Error("Missing LUT_3D_SIZE directive");
  }
  const expectedTriplets = size2 * size2 * size2;
  if (triplets.length / 3 !== expectedTriplets) {
    throw new Error(
      `Sample count mismatch: expected ${expectedTriplets}, got ${triplets.length / 3}`,
    );
  }
  return {
    size: size2,
    data: new Float32Array(triplets),
    domainMin,
    domainMax,
    title,
  };
}
