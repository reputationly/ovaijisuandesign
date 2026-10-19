/**
 * v3 产物校验的测试。
 *
 * 这里的用例都是合成产物 —— 真实产物在 `.probe/`（不入库），但校验逻辑本身
 * 必须能在 CI 里跑。合成用例覆盖的是**拒绝路径**：v3 的产物一旦被换掉或改坏，
 * 应用必须启动失败而不是把来路不明的代码加载进窗口。
 */
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assertV3BundlePath, collectV3BundleFiles, createV3BundleManifest, validateV3Bundle, V3_BUNDLE_MANIFEST } from "./bundle.js";

const dirs: string[] = [];

/** 造一份最小可用产物：index.html 引一个本地脚本，其余按参数补。 */
function makeBundle(extra: Record<string, string> = {}, html?: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), "v3-bundle-"));
  dirs.push(dir);
  const indexHtml = html ?? `<!doctype html><html><body><div id="root"></div><script type="module" src="./assets/app.js"></script></body></html>`;
  writeFileSync(path.join(dir, "index.html"), indexHtml);
  mkdirSync(path.join(dir, "assets"), { recursive: true });
  writeFileSync(path.join(dir, "assets", "app.js"), "console.log(1);\n");
  for (const [rel, body] of Object.entries(extra)) {
    const full = path.join(dir, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
  return dir;
}

/** 按目录真实内容写出清单（就是被测函数产出的那份）。 */
function writeManifest(dir: string): void {
  writeFileSync(path.join(dir, V3_BUNDLE_MANIFEST), `${JSON.stringify(createV3BundleManifest(dir), null, 2)}\n`);
}

afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe("assertV3BundlePath", () => {
  it("拦越界路径", () => {
    for (const bad of ["", "/etc/passwd", "../x", "a/../../b", "./a", "a//b", "a/./b", "C:\\x", "a\\b", "a\0b"]) {
      expect(() => assertV3BundlePath(bad), bad).toThrow();
    }
  });

  it("拦敏感文件", () => {
    for (const bad of [".env", ".env.local", "assets/server.pem", "assets/tls.key", "credentials.json", "serviceAccountKey.json"]) {
      expect(() => assertV3BundlePath(bad), bad).toThrow(/Sensitive/);
    }
  });

  it("放行普通产物路径", () => {
    expect(() => assertV3BundlePath("assets/index-abc.js")).not.toThrow();
    expect(() => assertV3BundlePath("index.html")).not.toThrow();
  });
});

describe("collectV3BundleFiles", () => {
  it("列出全部文件并算 sha256，但不含清单自身", () => {
    const dir = makeBundle({ "assets/extra.css": "a{}" });
    writeManifest(dir);
    const files = collectV3BundleFiles(dir);
    expect(files.map((f) => f.path).sort()).toEqual(["assets/app.js", "assets/extra.css", "index.html"]);
    const app = files.find((f) => f.path === "assets/app.js")!;
    expect(app.sha256).toBe(createHash("sha256").update("console.log(1);\n").digest("hex"));
  });

  it("拒绝符号链接", () => {
    const dir = makeBundle();
    symlinkSync("/etc/hosts", path.join(dir, "assets", "link.js"));
    expect(() => collectV3BundleFiles(dir)).toThrow(/Symlinks/);
  });

  it("目录不存在时报错", () => {
    expect(() => collectV3BundleFiles(path.join(tmpdir(), "definitely-not-here-v3"))).toThrow(/regular directory/);
  });
});

describe("createV3BundleManifest", () => {
  it("缺入口页时报错", () => {
    const dir = makeBundle();
    rmSync(path.join(dir, "index.html"));
    expect(() => createV3BundleManifest(dir)).toThrow(/index.html/);
  });

  it("入口引用了不存在的资源时报错", () => {
    const dir = makeBundle({}, `<!doctype html><html><body><script type="module" src="./assets/missing.js"></script></body></html>`);
    expect(() => createV3BundleManifest(dir)).toThrow(/missing asset/);
  });

  it("没有本地脚本入口时报错", () => {
    const dir = makeBundle({}, `<!doctype html><html><head><link rel="stylesheet" href="./assets/app.js"></head></html>`);
    expect(() => createV3BundleManifest(dir)).toThrow(/no local script entry/);
  });

  it("外链不计入本地资源检查", () => {
    const dir = makeBundle({}, `<!doctype html><html><body><script type="module" src="./assets/app.js"></script><script src="https://cdn.example.com/x.js"></script></body></html>`);
    expect(createV3BundleManifest(dir).files.length).toBe(2);
  });
});

describe("validateV3Bundle", () => {
  it("产物缺失时按 required 决定抛错还是返回 false", () => {
    const missing = path.join(tmpdir(), "definitely-not-here-v3-2");
    expect(validateV3Bundle(missing)).toBe(false);
    expect(() => validateV3Bundle(missing, { required: true })).toThrow(/missing/);
  });

  it("清单缺失时报错", () => {
    expect(() => validateV3Bundle(makeBundle())).toThrow(/manifest is missing/);
  });

  it("清单与产物一致时通过", () => {
    const dir = makeBundle();
    writeManifest(dir);
    expect(validateV3Bundle(dir, { required: true })).toBe(true);
  });

  it("产物被改动后校验失败", () => {
    const dir = makeBundle();
    writeManifest(dir);
    writeFileSync(path.join(dir, "assets", "app.js"), "console.log(2);\n");
    expect(() => validateV3Bundle(dir, { required: true })).toThrow(/checksum mismatch/);
  });

  it("产物多出一个文件时校验失败", () => {
    const dir = makeBundle();
    writeManifest(dir);
    writeFileSync(path.join(dir, "assets", "injected.js"), "evil();\n");
    expect(() => validateV3Bundle(dir, { required: true })).toThrow(/checksum mismatch/);
  });

  it("清单里有重复条目时校验失败", () => {
    const dir = makeBundle();
    const manifest = createV3BundleManifest(dir);
    manifest.files.push({ ...manifest.files[0]! });
    writeFileSync(path.join(dir, V3_BUNDLE_MANIFEST), JSON.stringify(manifest));
    expect(() => validateV3Bundle(dir, { required: true })).toThrow(/checksum entry/);
  });

  it("清单版本不对时报错", () => {
    const dir = makeBundle();
    const manifest = createV3BundleManifest(dir);
    writeFileSync(path.join(dir, V3_BUNDLE_MANIFEST), JSON.stringify({ ...manifest, protocolVersion: 2 }));
    expect(() => validateV3Bundle(dir, { required: true })).toThrow(/Unsupported/);
  });
});
