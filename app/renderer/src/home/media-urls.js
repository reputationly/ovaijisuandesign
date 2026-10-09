// 展示区海报图的 CDN 地址与缩略参数。
const HOME_SHOWCASE_IMAGE_CDN_HOSTS = new Set(["cdn.hailuoai.com", "cdn.hailuoai.video"]);
const OSS_IMAGE_PROCESS_PARAM = "x-oss-process";
const OSS_SIGNED_QUERY_PARAMS = new Set(["ossaccesskeyid", "signature", "expires", "security-token", "x-oss-signature", "x-oss-credential", "x-oss-date", "x-oss-expires", "x-oss-security-token"]);
const HOME_SHOWCASE_POSTER_PIXEL_WIDTH = {
  // The CSS cards top out at 336px / 240px. These 2x buckets keep posters
  // sharp on common Retina displays without downloading the Apollo originals.
  landscape: 672,
  portrait: 480
};
function resizeOperation(operation, pixelWidth) {
  const parts = operation.split(",");
  const widthIndex = parts.findIndex(part => /^w_\d+$/.test(part));
  if (widthIndex === -1) parts.push(`w_${pixelWidth}`);else parts[widthIndex] = `w_${pixelWidth}`;
  return parts.join(",");
}
function mergeOssImageResize(existingProcess, pixelWidth) {
  if (!existingProcess) return `image/resize,w_${pixelWidth}/format,webp`;
  const operations = existingProcess.split("/");
  if (operations[0] !== "image") return null;
  const resizeIndex = operations.findIndex(operation => operation.startsWith("resize,"));
  if (resizeIndex === -1) operations.splice(1, 0, `resize,w_${pixelWidth}`);else operations[resizeIndex] = resizeOperation(operations[resizeIndex] ?? "resize", pixelWidth);
  return operations.join("/");
}
export function homeShowcasePosterThumbnailUrl(sourceUrl, orientation) {
  try {
    const url = new URL(sourceUrl);
    const hasSignedQuery = [...url.searchParams.keys()].some(key => OSS_SIGNED_QUERY_PARAMS.has(key.toLowerCase()));
    if (url.protocol !== "https:" && url.protocol !== "http:" || !HOME_SHOWCASE_IMAGE_CDN_HOSTS.has(url.hostname.toLowerCase()) || url.port !== "" || url.username !== "" || url.password !== "" || hasSignedQuery || url.searchParams.getAll(OSS_IMAGE_PROCESS_PARAM).length > 1) {
      return sourceUrl;
    }
    const imageProcess = mergeOssImageResize(url.searchParams.get(OSS_IMAGE_PROCESS_PARAM), HOME_SHOWCASE_POSTER_PIXEL_WIDTH[orientation]);
    if (!imageProcess) return sourceUrl;
    url.searchParams.set(OSS_IMAGE_PROCESS_PARAM, imageProcess);
    return url.toString();
  } catch {
    return sourceUrl;
  }
}
