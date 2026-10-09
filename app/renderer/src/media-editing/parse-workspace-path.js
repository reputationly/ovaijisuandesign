// parse-workspace-path.js
import { cleanPath$1 } from "./wt.js";

function stripLeadingSlash$1(path2) {
  return path2.replace(/^\/+/, "");
}

function parseWorkspacePath(src) {
  if (!src) return void 0;
  const path2 = cleanPath$1(src).replace(/\\/g, "/");
  const filesIdx = path2.indexOf("/files/");
  if (filesIdx >= 0)
    return stripLeadingSlash$1(path2.slice(filesIdx + "/files/".length));
  const outputIdx = path2.indexOf("output_files/");
  if (outputIdx >= 0)
    return stripLeadingSlash$1(path2.slice(outputIdx + "output_files/".length));
  if (/^https?:\/\//i.test(src)) return void 0;
  return stripLeadingSlash$1(path2.replace(/^\.\//, "")) || void 0;
}

export function toWorkspaceRelativePath$1(originalSrc, resolvedSrc) {
  const candidates2 = [resolvedSrc, originalSrc];
  for (const candidate of candidates2) {
    const parsed = parseWorkspacePath(candidate);
    if (parsed) return parsed;
  }
  return void 0;
}

function normalizePath$1(path2) {
  return stripLeadingSlash$1(path2.replace(/\\/g, "/"));
}

export function findAssetForPath(assets, relativePath) {
  if (!relativePath) return void 0;
  return assets.find(
    (asset) => normalizePath$1(asset.path) === normalizePath$1(relativePath),
  );
}
