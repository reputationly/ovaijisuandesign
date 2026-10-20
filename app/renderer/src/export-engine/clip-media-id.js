/**
 * Clip 媒体 id 的编解码（第 271 轮，整份复制自参照的 clip-media-id-CCJeV8yp.js）。
 *
 * 格式：`clip:v1:<kind>:<encodeURIComponent(resourceId)>:<encodeURIComponent(versionId)>`
 */

export function clipMediaId(kind, resourceId, versionId) {
  return `clip:v1:${kind}:${encodeURIComponent(resourceId)}:${encodeURIComponent(versionId)}`;
}

export function parseClipMediaId(value) {
  const match = /^clip:v1:(image|video|audio|text):([^:]+):([^:]+)$/.exec(value);
  if (!match) return null;
  try {
    return {
      kind: match[1],
      resourceId: decodeURIComponent(match[2]),
      versionId: decodeURIComponent(match[3]),
    };
  } catch {
    return null;
  }
}
