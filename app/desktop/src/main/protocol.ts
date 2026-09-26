import { existsSync } from "node:fs";
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
 * 界面用哪一份（`OV_UI`）：
 * - 默认：`out/official-ui`（参照渲染层 + 补丁，app/official-ui/build.mjs 生成）
 * - `recovered`：`out/recovered-ui`（还原中的界面源码，app/renderer 构建）
 * - `official-raw`：`out/official-ui-raw`（参照渲染层原样、不打补丁，和 recovered 做逐屏对比用）
 * - `ours`：我们早先自己写的 `out/renderer`
 */
export function rendererRoot(): string {
  const dirs: Record<string, string> = { recovered: "out/recovered-ui", "official-raw": "out/official-ui-raw", ours: "out/renderer" };
  const picked = join(app.getAppPath(), dirs[process.env.OV_UI ?? ""] ?? "out/official-ui");
  return existsSync(join(picked, "index.html")) ? picked : join(app.getAppPath(), "out/renderer");
}

/**
 * `app://./…` → 界面目录下的文件，找不到就回 index.html（SPA 回退）。
 * 路径逃逸（`..`）一律回 index.html，不读界面目录之外的文件。
 */
export function handleAppScheme() {
  const root = rendererRoot();
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
