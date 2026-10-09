// parse-workspace-path.js
import { cleanPath } from "./wt.js";
function stripLeadingSlash(path2) {
  return path2.replace(/^\/+/, "");
}
function parseWorkspacePath(src) {
  if (!src) return void 0;
  const path2 = cleanPath(src).replace(/\\/g, "/");
  const filesIdx = path2.indexOf("/files/");
  if (filesIdx >= 0)
    return stripLeadingSlash(path2.slice(filesIdx + "/files/".length));
  const outputIdx = path2.indexOf("output_files/");
  if (outputIdx >= 0)
    return stripLeadingSlash(path2.slice(outputIdx + "output_files/".length));
  if (/^https?:\/\//i.test(src)) return void 0;
  return stripLeadingSlash(path2.replace(/^\.\//, "")) || void 0;
}
export function toWorkspaceRelativePath(originalSrc, resolvedSrc) {
  const candidates2 = [resolvedSrc, originalSrc];
  for (const candidate of candidates2) {
    const parsed = parseWorkspacePath(candidate);
    if (parsed) return parsed;
  }
  return void 0;
}
function normalizePath(path2) {
  return stripLeadingSlash(path2.replace(/\\/g, "/"));
}
export function findAssetForPath(assets, relativePath) {
  if (!relativePath) return void 0;
  return assets.find(
    (asset) => normalizePath(asset.path) === normalizePath(relativePath),
  );
}
