/**
 * v3 工作台窗口的宿主参数：产物从哪读、交给窗口前怎么验。
 *
 * v3 的界面代码不走 `file://`，而是主进程整份读进内存、经自定义协议按需喂给窗口。
 * 这么做的直接好处是产物可以被逐字节核对（见 `bundle.ts`），代价是**每个文件都要等
 * 主进程读一遍**，所以这里只做「读 + 校验」，不做缓存以外的加工。
 *
 * 开发态读 `src/renderer/public/v3`（前端构建单元直接输出在那），打包后读
 * `out/renderer/v3`。两条路径都必须能通过清单校验 —— 开发态漏跑构建时，
 * 这里的报错比窗口白屏更容易定位。
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { app } from "electron";
import { collectV3BundleFiles, validateV3Bundle } from "./bundle.js";

/**
 * 按扩展名给出 Content-Type。
 *
 * 缺省是 `application/octet-stream` —— 脚本一旦落到缺省值就会被浏览器的 MIME 校验挡下，
 * 所以新增产物类型时要同步补到这里。
 *
 * 这份表是照上游原样搬的，**故意没有加 `.wasm` 和 `.json`**：4.0.0 的产物里确实有
 * `assets/fft-*.wasm` 和两个 `helvetiker_*.typeface-*.json`，但上游也没给它们类型，
 * 说明取用方是按二进制读的（`fetch().arrayBuffer()`），不是 `instantiateStreaming`。
 * 补上 `.wasm` 反而会和上游行为不一致。
 */
export const V3_CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

export interface V3BundleEntry {
  body: Buffer;
  contentType: string;
}

export interface V3WorkbenchOptions {
  /** v3 专用 preload 的绝对路径。 */
  preload: string;
  /** 读入全部产物，key 是相对路径。 */
  loadBundle(): Map<string, V3BundleEntry>;
}

/** v3 产物目录（按运行方式选路径）。 */
export function v3BundleDirectory(): string {
  return path.join(app.getAppPath(), app.isPackaged ? "out/renderer/v3" : "src/renderer/public/v3");
}

export function nativeWorkbenchOptions(): V3WorkbenchOptions {
  return {
    preload: path.join(app.getAppPath(), "out/preload/v3-workbench.cjs"),
    loadBundle(): Map<string, V3BundleEntry> {
      const directory = v3BundleDirectory();
      validateV3Bundle(directory, { required: true });
      return new Map(
        collectV3BundleFiles(directory).map((file) => {
          const body = readFileSync(path.join(directory, file.path));
          // 校验和读取之间产物可能被换掉（构建脚本正好在写）。这里再算一次摘要，
          // 保证「验过的那份」就是「喂给窗口的那份」。
          if (createHash("sha256").update(body).digest("hex") !== file.sha256) {
            throw new Error("V3 bundle changed during loading");
          }
          return [file.path, { body, contentType: V3_CONTENT_TYPES[path.extname(file.path)] ?? "application/octet-stream" }];
        }),
      );
    },
  };
}
