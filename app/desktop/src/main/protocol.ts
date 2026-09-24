import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

import { app, protocol } from "electron";

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

/** 必须在 app ready 之前调。 */
export function registerAppScheme() {
  protocol.registerSchemesAsPrivileged([
    { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
  ]);
}

/**
 * `app://./…` → `out/renderer/…`，找不到就回 index.html（SPA 回退）。
 * 路径逃逸（`..`）一律回 index.html，不读 renderer 目录之外的文件。
 */
export function handleAppScheme() {
  const root = join(app.getAppPath(), "out/renderer");
  protocol.handle("app", async (req) => {
    const url = new URL(req.url);
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, "");
    const file = rel && !rel.startsWith("..") ? join(root, rel) : join(root, "index.html");
    try {
      const body = await readFile(file);
      return new Response(body, { headers: { "content-type": MIME[extname(file)] ?? "application/octet-stream" } });
    } catch {
      const body = await readFile(join(root, "index.html"));
      return new Response(body, { headers: { "content-type": "text/html" } });
    }
  });
}
