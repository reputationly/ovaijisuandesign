// parse-workspace-path.js
import { cleanPath } from "./wt.js";
function stripLeadingSlash(path) {
  return path.replace(/^\/+/, "");
}
function parseWorkspacePath(src) {
  if (!src) return void 0;
  const path = cleanPath(src).replace(/\\/g, "/");
  const filesIdx = path.indexOf("/files/");
  if (filesIdx >= 0)
    return stripLeadingSlash(path.slice(filesIdx + "/files/".length));
  const outputIdx = path.indexOf("output_files/");
  if (outputIdx >= 0)
    return stripLeadingSlash(path.slice(outputIdx + "output_files/".length));
  if (/^https?:\/\//i.test(src)) return void 0;
  return stripLeadingSlash(path.replace(/^\.\//, "")) || void 0;
}
export function toWorkspaceRelativePath(originalSrc, resolvedSrc) {
  const candidates = [resolvedSrc, originalSrc];
  for (const candidate of candidates) {
    const parsed = parseWorkspacePath(candidate);
    if (parsed) return parsed;
  }
  return void 0;
}
function normalizePath(path) {
  return stripLeadingSlash(path.replace(/\\/g, "/"));
}
export function findAssetForPath(assets, relativePath) {
  if (!relativePath) return void 0;
  return assets.find(
    (asset) => normalizePath(asset.path) === normalizePath(relativePath),
  );
}
