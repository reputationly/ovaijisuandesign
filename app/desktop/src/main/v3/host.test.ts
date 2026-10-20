/**
 * v3 宿主参数的测试。
 *
 * 重点是「喂给窗口的那份」必须就是「校验过的那份」：产物在开发态随时会被构建脚本改写，
 * 校验和读取之间隔着一个文件读操作，这里要能抓到中间被换掉的情况。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const appPath = { value: "" };
vi.mock("electron", () => ({
  app: { getAppPath: () => appPath.value, isPackaged: true },
}));

const { nativeWorkbenchOptions, v3BundleDirectory, V3_CONTENT_TYPES } = await import("./host.js");
const { createV3BundleManifest, V3_BUNDLE_MANIFEST } = await import("./bundle.js");

const dirs: string[] = [];

/**
 * 造一份产物，返回 **应用根**（不是产物目录本身）。
 * 打包态下 `v3BundleDirectory()` 会在应用根后面接 `out/renderer/v3`，所以夹具要造出完整层级。
 */
function makeBundle(): { appRoot: string; bundleDir: string } {
  const appRoot = mkdtempSync(path.join(tmpdir(), "v3-host-"));
  dirs.push(appRoot);
  const bundleDir = path.join(appRoot, "out", "renderer", "v3");
  mkdirSync(path.join(bundleDir, "assets"), { recursive: true });
  writeFileSync(path.join(bundleDir, "index.html"), `<!doctype html><html><body><script type="module" src="./assets/app.js"></script></body></html>`);
  writeFileSync(path.join(bundleDir, "assets", "app.js"), "console.log(1);\n");
  writeFileSync(path.join(bundleDir, "assets", "style.css"), "a{}");
  writeFileSync(path.join(bundleDir, V3_BUNDLE_MANIFEST), JSON.stringify(createV3BundleManifest(bundleDir)));
  return { appRoot, bundleDir };
}

afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe("v3BundleDirectory", () => {
  it("打包态指到 out/renderer/v3", () => {
    appPath.value = "/opt/app";
    expect(v3BundleDirectory()).toBe(path.join("/opt/app", "out/renderer/v3"));
  });
});

describe("nativeWorkbenchOptions", () => {
  it("preload 指向 v3 专用 preload", () => {
    appPath.value = "/opt/app";
    expect(nativeWorkbenchOptions().preload).toBe(path.join("/opt/app", "out/preload/v3-workbench.mjs"));
  });

  it("读入全部产物并带上 Content-Type", () => {
    appPath.value = makeBundle().appRoot;
    const bundle = nativeWorkbenchOptions().loadBundle();
    expect([...bundle.keys()].sort()).toEqual(["assets/app.js", "assets/style.css", "index.html"]);
    expect(bundle.get("assets/app.js")!.contentType).toBe("application/javascript; charset=utf-8");
    expect(bundle.get("assets/style.css")!.contentType).toBe("text/css; charset=utf-8");
    expect(bundle.get("index.html")!.contentType).toBe("text/html; charset=utf-8");
    // 清单自身不该被当成产物喂给窗口
    expect(bundle.has(V3_BUNDLE_MANIFEST)).toBe(false);
  });

  it("未登记扩展名落到 octet-stream", () => {
    const { appRoot, bundleDir } = makeBundle();
    writeFileSync(path.join(bundleDir, "assets", "fft.wasm"), Buffer.from([0, 97, 115, 109]));
    writeFileSync(path.join(bundleDir, V3_BUNDLE_MANIFEST), JSON.stringify(createV3BundleManifest(bundleDir)));
    appPath.value = appRoot;
    expect(nativeWorkbenchOptions().loadBundle().get("assets/fft.wasm")!.contentType).toBe("application/octet-stream");
  });

  it("产物与清单不一致时拒绝加载", () => {
    const { appRoot, bundleDir } = makeBundle();
    writeFileSync(path.join(bundleDir, "assets", "app.js"), "console.log(2);\n");
    appPath.value = appRoot;
    expect(() => nativeWorkbenchOptions().loadBundle()).toThrow(/checksum mismatch/);
  });

  it("产物缺失时拒绝加载", () => {
    appPath.value = path.join(tmpdir(), "definitely-not-here-v3-host");
    expect(() => nativeWorkbenchOptions().loadBundle()).toThrow(/missing/);
  });

  it("扩展名表覆盖脚本和样式（缺了会被 MIME 校验挡下）", () => {
    expect(V3_CONTENT_TYPES[".js"]).toMatch(/javascript/);
    expect(V3_CONTENT_TYPES[".css"]).toMatch(/text\/css/);
  });
});
