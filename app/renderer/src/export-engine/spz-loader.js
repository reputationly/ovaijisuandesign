// 第 273 轮整份镜像：spzLoader-D7TKiXtU.js

import { B as BufferGeometry, F as Float32BufferAttribute } from "./panorama-viewer.js";
import { finalizePointCloud } from "./ply-loader.js";


const SPZ_MAGIC = 1347635022;
const SH_C0 = 0.28209479177387814;
const cache = /* @__PURE__ */ new Map();
async function gunzip(buffer) {
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}
function parseSPZ(raw) {
  const view = new DataView(raw);
  const magic = view.getUint32(0, true);
  if (magic !== SPZ_MAGIC) throw new Error("Invalid SPZ file: bad magic");
  const version = view.getUint32(4, true);
  if (version < 1 || version > 3) throw new Error(`Unsupported SPZ version: ${version}`);
  const numPoints = view.getUint32(8, true);
  const fractionalBits = view.getUint8(13);
  const bytes = new Uint8Array(raw);
  let off = 16;
  const positions = new Float32Array(numPoints * 3);
  const scale = 1 / (1 << fractionalBits);
  for (let i = 0; i < numPoints * 3; i++) {
    let fixed = bytes[off] | bytes[off + 1] << 8 | bytes[off + 2] << 16;
    if (fixed & 8388608) fixed -= 16777216;
    positions[i] = fixed * scale;
    off += 3;
  }
  off += numPoints;
  const colors = new Float32Array(numPoints * 3);
  for (let i = 0; i < numPoints * 3; i++) {
    const f_dc = (bytes[off + i] / 255 - 0.5) / 0.15;
    colors[i] = Math.max(0, Math.min(1, 0.5 + SH_C0 * f_dc));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return geometry;
}
async function loadSPZPointCloud(url, pointSize = 0.05, color, theme = "dark") {
  let geometryPromise = cache.get(url);
  if (!geometryPromise) {
    geometryPromise = (async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch SPZ: ${res.status}`);
      const compressed = await res.arrayBuffer();
      const raw = await gunzip(compressed);
      const geometry2 = parseSPZ(raw);
      console.log(`[SPZ] Loaded ${url}:`, {
        vertices: geometry2.getAttribute("position").count
      });
      return geometry2;
    })().catch((e) => {
      cache.delete(url);
      throw e;
    });
    cache.set(url, geometryPromise);
  }
  const geometry = await geometryPromise;
  return finalizePointCloud(geometry.clone(), url, pointSize, color, theme);
}
export {
  loadSPZPointCloud
};
