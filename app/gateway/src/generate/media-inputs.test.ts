import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { type MediaConfig, createClient, parseMediaConfig } from "@ov/maas-media";
import { describe, expect, it } from "vitest";

import { prepareInputs } from "./media-inputs.js";

function config(apiKey = "sk-test"): MediaConfig {
  return parseMediaConfig({ platform: { base_url: "https://maas.example.com/v1", api_key: apiKey, chat_model: "c" }, models: {} });
}

function workspaceWith(files: Record<string, number>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "ov-inputs-"));
  for (const [name, size] of Object.entries(files)) writeFileSync(path.join(dir, name), Buffer.alloc(size));
  return dir;
}

const MB = 1024 * 1024;

describe("参考素材的送入方式", () => {
  it("阈值以下的本地文件不动，留给下游内联", async () => {
    const root = workspaceWith({ "small.png": 1024 });
    const calls: string[] = [];
    const client = createClient({ fetch: (async (url: string) => { calls.push(String(url)); return new Response("{}"); }) as unknown as typeof fetch });
    const result = await prepareInputs(client, config(), root, ["small.png"], { thresholdBytes: MB });
    expect(result).toEqual(["small.png"]);
    expect(calls).toEqual([]);
  });

  it("超过阈值的先上传，换成平台给的 URL", async () => {
    const root = workspaceWith({ "big.mp4": 2 * MB });
    const calls: { url: string; hasAuth: boolean }[] = [];
    const client = createClient({
      fetch: (async (url: string, init?: RequestInit) => {
        calls.push({ url: String(url), hasAuth: Boolean((init?.headers as Record<string, string>)?.authorization) });
        return new Response(JSON.stringify({ url: "https://obs.example.com/signed/big.mp4", bytes: 2 * MB, expires_at: "2026-11-01T00:00:00Z" }), { status: 200 });
      }) as unknown as typeof fetch,
    });
    const result = await prepareInputs(client, config(), root, ["big.mp4"], { thresholdBytes: MB });
    expect(result).toEqual(["https://obs.example.com/signed/big.mp4"]);
    // 地址在 host 根下的 /v1/ov/files，不是 /v1/v1/ov/files —— 少剥一层就是 404。
    expect(calls[0]!.url).toBe("https://maas.example.com/v1/ov/files");
    expect(calls[0]!.hasAuth).toBe(true);
  });

  it("上传失败退回内联，并说明原因", async () => {
    const root = workspaceWith({ "big.mp4": 2 * MB });
    const failures: string[] = [];
    const client = createClient({
      fetch: (async () => new Response(JSON.stringify({ error: { code: "capability_unavailable", message: "no storage" } }), { status: 503 })) as unknown as typeof fetch,
    });
    const result = await prepareInputs(client, config(), root, ["big.mp4"], {
      thresholdBytes: MB,
      onUploadFailure: (file) => failures.push(path.basename(file)),
    });
    expect(result).toEqual(["big.mp4"]);
    expect(failures).toEqual(["big.mp4"]);
  });

  it("URL 与 data URI 原样透传；没配 key 时不做任何上传", async () => {
    const root = workspaceWith({ "big.mp4": 2 * MB });
    const calls: string[] = [];
    const client = createClient({ fetch: (async (url: string) => { calls.push(String(url)); return new Response("{}"); }) as unknown as typeof fetch });
    const inline = await prepareInputs(client, config(), root, ["https://x/y.png", "data:image/png;base64,AAAA"], { thresholdBytes: MB });
    expect(inline).toEqual(["https://x/y.png", "data:image/png;base64,AAAA"]);
    const offline = await prepareInputs(client, config(""), root, ["big.mp4"], { thresholdBytes: MB });
    expect(offline).toEqual(["big.mp4"]);
    expect(calls).toEqual([]);
  });

  it("读不到的文件原样交给下游报错，不在这里换一种说法", async () => {
    const root = workspaceWith({});
    const client = createClient({ fetch: (async () => new Response("{}")) as unknown as typeof fetch });
    const result = await prepareInputs(client, config(), root, ["missing.png"], { thresholdBytes: MB });
    expect(result).toEqual(["missing.png"]);
  });
});
