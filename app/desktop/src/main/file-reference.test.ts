import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createFileReferenceRevealer, type FileReferenceHost, inspectFileReference, parseLocalPath, pathKindOnDisk } from "./file-reference.js";

let root: string;
let allowed: string;
let outside: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "fileref-"));
  allowed = path.join(root, "allowed");
  outside = path.join(root, "outside");
  mkdirSync(allowed);
  mkdirSync(outside);
  writeFileSync(path.join(allowed, "a.png"), "x");
  writeFileSync(path.join(outside, "b.png"), "x");
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

function host(over: Partial<FileReferenceHost> = {}): FileReferenceHost & { trusted: string[]; shown: string[] } {
  const trusted: string[] = [];
  const shown: string[] = [];
  return {
    trusted,
    shown,
    platform: "darwin",
    getStaticAllowedDirs: () => [allowed],
    getTrustedDirs: () => trusted,
    trustDirectory: (d) => void trusted.push(d),
    getPathKind: pathKindOnDisk,
    openPath: async () => "",
    showItemInFolder: (p) => void shown.push(p),
    createToken: () => "tok",
    ...over,
  };
}

describe("parseLocalPath", () => {
  it("去掉引号、sandbox: 前缀，解析 file: URL", () => {
    expect(parseLocalPath("`/tmp/a b.png`", "darwin")).toEqual({ ok: true, path: "/tmp/a b.png" });
    expect(parseLocalPath("sandbox:/tmp/x", "darwin")).toEqual({ ok: true, path: "/tmp/x" });
    expect(parseLocalPath("file:///tmp/a%20b.png", "darwin")).toEqual({ ok: true, path: "/tmp/a b.png" });
  });

  it("相对路径、网页链接、别的平台的路径都不接", () => {
    expect(parseLocalPath("a.png", "darwin")).toEqual({ ok: false, reason: "invalid-path" });
    expect(parseLocalPath("https://x.com/a.png", "darwin")).toEqual({ ok: false, reason: "unsupported-scheme" });
    expect(parseLocalPath("C:\\a.png", "darwin")).toEqual({ ok: false, reason: "unsupported-platform" });
  });
});

describe("inspectFileReference", () => {
  it("允许目录里的文件可直接打开，别处的要确认，不存在的拦下", () => {
    const h = host();
    expect(inspectFileReference(h, { rawPath: path.join(allowed, "a.png") })).toMatchObject({ status: "openable", permission: "static", directory: allowed });
    expect(inspectFileReference(h, { rawPath: path.join(outside, "b.png") })).toEqual({ status: "needs-consent", path: path.join(outside, "b.png"), directory: outside });
    expect(inspectFileReference(h, { rawPath: path.join(allowed, "nope.png") })).toMatchObject({ status: "blocked", reason: "missing" });
  });

  it("当前项目目录也放行；请求里没有 rawPath 时按非法路径处理", () => {
    const h = host();
    expect(inspectFileReference(h, { rawPath: path.join(outside, "b.png"), currentWorkspace: outside }).status).toBe("openable");
    expect(inspectFileReference(h, { path: "/x" } as never)).toEqual({ status: "blocked", reason: "invalid-path" });
  });

  it("敏感位置一律拦下", () => {
    const ssh = path.join(allowed, ".ssh");
    mkdirSync(ssh);
    writeFileSync(path.join(ssh, "id_rsa"), "k");
    expect(inspectFileReference(host(), { rawPath: path.join(ssh, "id_rsa") })).toMatchObject({ status: "blocked", reason: "sensitive-path" });
  });
});

describe("revealFileReference", () => {
  it("别处的文件：先要确认 token，带着 token 同意后才打开；信任目录会记下来", async () => {
    const h = host();
    const reveal = createFileReferenceRevealer(h);
    const file = path.join(outside, "b.png");
    expect(await reveal({ rawPath: file })).toEqual({ status: "needs-consent", path: file, directory: outside, consentToken: "tok" });
    expect(await reveal({ rawPath: file, consent: "once", consentToken: "wrong" })).toMatchObject({ status: "blocked", reason: "invalid-consent" });
    await reveal({ rawPath: file });
    expect(await reveal({ rawPath: file, consent: "trust-folder", consentToken: "tok" })).toMatchObject({ status: "revealed", permission: "new-trusted-folder" });
    expect(h.trusted).toEqual([outside]);
    expect(h.shown).toEqual([file]);
    // 信任过的目录之后直接可开
    expect(await reveal({ rawPath: file })).toMatchObject({ status: "revealed", permission: "trusted-folder" });
  });

  it("目录用 openPath 打开，打不开时报 reveal-failed", async () => {
    const openPath = vi.fn(async () => "no app");
    const reveal = createFileReferenceRevealer(host({ openPath }));
    expect(await reveal({ rawPath: allowed })).toMatchObject({ status: "blocked", reason: "reveal-failed", message: "no app" });
    expect(openPath).toHaveBeenCalledWith(allowed);
  });
});
