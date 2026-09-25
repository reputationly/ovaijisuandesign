import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { type Client, createClient } from "./client.js";
import { defaultMediaConfig, defaultModels, type MediaConfig } from "./config.js";
import { PlatformError } from "./error.js";
import {
  MAX_PIXELS,
  TIMEOUT_MS,
  generate,
  loadImageInputs,
  loadMediaInputs,
  resolveSize,
  upscale,
  upscaleSize,
} from "./image.js";

/** 本该失败的调用竟然成功了。放在 `.then(unexpected, …)` 里，让失败分支的类型收窄成 PlatformError。 */
const unexpected = (): never => {
  throw new Error("本该失败");
};

/** 一碰网络就炸的客户端 —— 「在联网之前就报」这类断言靠它才站得住。 */
function offline(): Client {
  return createClient({
    fetch: () => {
      throw new Error("这个用例不该发出任何网络请求");
    },
  });
}

const tmpDirs: string[] = [];
async function tempdir(): Promise<string> {
  const d = await mkdtemp(join(tmpdir(), "maas-media-"));
  tmpDirs.push(d);
  return d;
}
afterEach(async () => {
  for (const d of tmpDirs.splice(0)) await rm(d, { recursive: true, force: true });
});

function parts(s: string): [number, number] {
  const [w, h] = s.split("x");
  return [Number.parseInt(w!, 10), Number.parseInt(h!, 10)];
}

describe("image", () => {
  /** 2K / 4K 档位都要**按源图比例**算出精确尺寸，长边落在档位上。 */
  it("upscale size hits the tier on the long edge", () => {
    // 416x232（16:9 附近）→ 2K
    const s = upscaleSize(416, 232, "2K");
    expect(s).not.toBeNull();
    const [w, h] = parts(s!);
    expect(w, "长边要落在档位上").toBe(2048);
    // 比例要保住 —— 变形了用户一眼能看出来。
    const want = Math.round((232 / 416) * 2048);
    expect(Math.abs(h - want) <= 8, `算出 ${h}，期望 ${want} 附近`).toBe(true);
  });

  /**
   * **已经比档位大的图不超分。**
   *
   * 不拦的话算出来的 `target_shape` 小于源图，而引擎会照办 ——
   * 用户点「高清」得到一张更糊的图，全程不报错。
   */
  /** 高清增强面板有 1K 档；认不出时退回 2K 的话，选 1K 实际拿到 2K。 */
  it("upscale size honours the 1K tier", () => {
    const [w] = parts(upscaleSize(512, 288, "1k")!);
    expect(w).toBe(1024);
    expect(upscaleSize(1024, 768, "1K")).toBeNull();
  });

  it("upscale size refuses to shrink", () => {
    expect(upscaleSize(4000, 3000, "2K")).toBeNull();
    expect(upscaleSize(2048, 2048, "2K")).toBeNull();
    expect(upscaleSize(0, 100, "2K")).toBeNull();
  });

  /**
   * 任何档位算出来的像素数都不能超预算。
   *
   * **方图是这里的关键用例**：4K 方图长边合规（3840）但总量 14.7M,
   * 是横图 4K 的 1.8 倍 —— 只看长边会让它落进平台的静默截断区,
   * 表现是「选了 4K，出来的尺寸对不上」。
   */
  it("upscale size stays within the pixel budget", () => {
    for (const [w, h] of [
      [464, 464],
      [416, 232],
      [800, 600],
      [300, 1200],
    ] as const) {
      for (const tier of ["2K", "4K"]) {
        const s = upscaleSize(w, h, tier);
        if (s === null) continue;
        const [ow, oh] = parts(s);
        expect(
          ow * oh <= MAX_PIXELS + Math.floor(MAX_PIXELS / 100),
          `${w}x${h} @${tier} → ${s} = ${(ow * oh) / 1e6}M 像素，超出预算`,
        ).toBe(true);
        // 而且必须真的是放大。
        expect(ow >= w && oh >= h, `${w}x${h} @${tier} → ${s} 不是放大`).toBe(true);
      }
    }
  });

  it("maps ratio and resolution to pixel size", () => {
    expect(resolveSize("1:1", "1K")).toBe("1024x1024");
    expect(resolveSize("16:9", "1K")).toBe("1824x1024");
    expect(resolveSize("9:16", "1K")).toBe("1024x1824");
    expect(resolveSize("1:1", "2K")).toBe("1440x1440");
  });

  it("falls back to square 1k on junk input", () => {
    expect(resolveSize("", "")).toBe("1024x1024");
    expect(resolveSize("not-a-ratio", "8K")).toBe("1024x1024");
    expect(resolveSize("0:0", "1K")).toBe("1024x1024");
  });

  it("sizes are multiples of eight", () => {
    for (const ratio of ["21:9", "4:5", "3:2", "5:4"]) {
      const size = resolveSize(ratio, "1K");
      const [w, h] = parts(size);
      expect(w % 8, size).toBe(0);
      expect(h % 8, size).toBe(0);
    }
  });

  it("reads relative paths as data uris", async () => {
    const dir = await tempdir();
    await mkdir(join(dir, "images"), { recursive: true });
    await writeFile(join(dir, "images/a.png"), Buffer.from("\x89PNG fake", "latin1"));

    const out = await loadImageInputs(dir, ["images/a.png"]);
    expect(out[0]!.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("passes through urls and data uris untouched", async () => {
    const dir = await tempdir();
    const inputs = ["https://cdn.example.com/a.png", "data:image/png;base64,AAAA"];
    expect(await loadImageInputs(dir, inputs)).toEqual(inputs);
  });

  it("a missing file is an error not a silent skip", async () => {
    // 静默跳过会让图生图退化成文生图，用户看到的是「重绘把整张图换了」。
    const dir = await tempdir();
    const err = await loadImageInputs(dir, ["images/gone.png"]).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PlatformError);
    expect((err as PlatformError).code).toBe("dpp.io");
  });

  it("media inputs guess av mime not png", async () => {
    const dir = await tempdir();
    await writeFile(join(dir, "a.mp4"), "fake");
    const out = await loadMediaInputs(dir, ["a.mp4"]);
    expect(out[0]!.startsWith("data:video/mp4;base64,"), out[0]).toBe(true);
  });

  it("a missing model is reported before any network call", async () => {
    const cfg = defaultMediaConfig();
    const err = await generate(offline(), cfg, "cat", [], "1:1", "1K", null).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PlatformError);
    expect((err as PlatformError).code).toBe("dpp.config");
    expect((err as PlatformError).message).toContain("models.image");
  });
});

// ---------------------------------------------------------------------------
// TS 移植新增：Rust 那边这几条没有 HTTP 层面的测试。这里用 fetch 桩守住
// 请求形状，因为 HTTP 这一层是整个重写过的。
// ---------------------------------------------------------------------------

interface Captured {
  url: string;
  method: string;
  auth: string | null;
  body: Record<string, unknown>;
  timeoutAborts: boolean;
}

function stub(respond: (c: Captured) => Response): { client: Client; calls: Captured[] } {
  const calls: Captured[] = [];
  const client = createClient({
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      const c: Captured = {
        url: String(input),
        method: init?.method ?? "GET",
        auth: headers.get("authorization"),
        body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {},
        timeoutAborts: init?.signal instanceof AbortSignal,
      };
      calls.push(c);
      return respond(c);
    },
  });
  return { client, calls };
}

function cfg(): MediaConfig {
  return {
    platform: { base_url: "https://maas.example.com/v1/", api_key: "sk-test", chat_model: "chat" },
    models: { ...defaultModels(), image: "qwen-image", image_edit: "qwen-image-edit", image_upscale: "swiftvr" },
  };
}

describe("image（TS 移植新增）", () => {
  it("文生图走 /images/generations，带 Bearer 和算好的 size", async () => {
    const { client, calls } = stub(() => Response.json({ data: [{ url: "" }, { url: "https://o/a.png" }] }));
    const url = await generate(client, cfg(), "猫", [], "16:9", "1K", "nano-banana");
    expect(url).toBe("https://o/a.png");
    expect(calls[0]!.url).toBe("https://maas.example.com/v1/images/generations");
    expect(calls[0]!.method).toBe("POST");
    expect(calls[0]!.auth).toBe("Bearer sk-test");
    expect(calls[0]!.timeoutAborts).toBe(true);
    expect(calls[0]!.body).toEqual({ model: "qwen-image", prompt: "猫", n: 1, size: "1824x1024" });
    expect(TIMEOUT_MS).toBe(300_000);
  });

  it("图生图走 /images/edits，底图放 images", async () => {
    const { client, calls } = stub(() => Response.json({ data: [{ url: "https://o/b.png" }] }));
    await generate(client, cfg(), "重绘", ["data:image/png;base64,A"], "", "", null);
    expect(calls[0]!.url).toBe("https://maas.example.com/v1/images/edits");
    expect(calls[0]!.body).toEqual({ model: "qwen-image-edit", prompt: "重绘", images: ["data:image/png;base64,A"] });
  });

  it("超分用顶层 image（单数）+ size，prompt 非空", async () => {
    const { client, calls } = stub(() => Response.json({ data: [{ url: "https://o/c.png" }] }));
    await upscale(client, cfg(), "https://o/src.png", "2048x1144");
    expect(calls[0]!.url).toBe("https://maas.example.com/v1/images/edits");
    expect(calls[0]!.body).toEqual({ model: "swiftvr", prompt: "upscale", image: "https://o/src.png", size: "2048x1144" });
    expect(calls[0]!.body.metadata).toBeUndefined();
  });

  it("只回 b64_json 时显式失败；非 2xx 解信封", async () => {
    const onlyB64 = stub(() => Response.json({ data: [{ b64_json: "AAAA" }] }));
    const e1 = await generate(onlyB64.client, cfg(), "猫", [], "", "", null).then(unexpected, (e: unknown) => e as PlatformError);
    expect(e1.code).toBe("dpp.protocol");

    const bad = stub(() => Response.json({ code: "invalid_request", message: "prompt is required" }, { status: 400 }));
    const e2 = await generate(bad.client, cfg(), "猫", [], "", "", null).then(unexpected, (e: unknown) => e as PlatformError);
    expect(e2.code).toBe("platform.invalid_request");
  });
});
