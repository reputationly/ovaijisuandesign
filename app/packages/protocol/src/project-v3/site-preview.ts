/**
 * 站点预览：每个 Resource Version 一个独立 origin，内容来自本地 gateway。
 *
 * CSP 是安全边界的一部分：预览页只能加载自身/内联/blob，不允许连外网。
 */
export const SITE_PREVIEW_SCHEME = "hub-site";

export const SITE_PREVIEW_ENTRY = "index.html";

export const SITE_PREVIEW_ROUTES = {
  manifest: (versionId: string) => `/api/v3/sites/${encodeURIComponent(versionId)}/manifest`,
  file: (versionId: string, path: string) =>
    `/api/v3/sites/${encodeURIComponent(versionId)}/files/${path}`,
} as const;

export const SITE_PREVIEW_CSP = [
  "default-src 'self' data: blob:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline' data: blob:",
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "font-src 'self' data: blob:",
  "connect-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "frame-src 'self' blob: data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self' app: http://localhost:*",
].join("; ");

export interface SitePreviewManifest {
  site: true;
  entry: typeof SITE_PREVIEW_ENTRY;
  fileCount: number;
  totalBytes: number;
}
