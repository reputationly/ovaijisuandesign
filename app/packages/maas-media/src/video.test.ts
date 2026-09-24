import { describe, expect, it } from "vitest";

import { type Client, createClient } from "./client.js";
import { type MediaConfig, defaultModels } from "./config.js";
import { PlatformError } from "./error.js";
import {
  POLL_INTERVAL_MS,
  POLL_MAX_WAIT_MS,
  QUERY_TIMEOUT_MS,
  SUBMIT_TIMEOUT_MS,
  VideoJob,
  VideoPlan,
  buildBody,
  generate,
  resolveSize,
  submitAndPoll,
  upscale,
} from "./video.js";

/** 本该失败的调用竟然成功了。放在 `.then(unexpected, …)` 里，让失败分支的类型收窄成 PlatformError。 */
const unexpected = (): never => {
  throw new Error("本该失败");
};

function offline(): Client {
  return createClient({
    fetch: () => {
      throw new Error("这个用例不该发出任何网络请求");
    },
  });
}

function cfg(): MediaConfig {
  return {
    platform: { base_url: "https://maas.example.com/v1", api_key: "k", chat_model: "chat" },
    models: {
      ...defaultModels(),
      video: "minimax-h3-fl2va",
      video_ref: "minimax-h3-ref2va",
      video_upscale: "swiftvr",
    },
  };
}

function job(plan: VideoPlan, frames: string[], refs: string[]): VideoJob {
  return {
    plan,
    prompt: "一只猫",
    frames,
    refImages: refs,
    refVideos: [],
    refAudios: [],
    duration: 5,
    aspectRatio: "16:9",
    resolution: "768P",
    generateAudio: null,
    modelId: null,
  };
}

describe("video", () => {
  it("task types match the platform enum", () => {
    // 这五个字符串是平台的 videoFamilyTaskTypes，改之前先去平台复测。
    expect(VideoPlan.taskType(VideoPlan.TextToVideo)).toBe("t2v");
    expect(VideoPlan.taskType(VideoPlan.ImageToVideo)).toBe("i2v");
    expect(VideoPlan.taskType(VideoPlan.FirstLastFrame)).toBe("flf2v");
    expect(VideoPlan.taskType(VideoPlan.LastFrame)).toBe("l2va");
    expect(VideoPlan.taskType(VideoPlan.Reference)).toBe("r2va");
  });

  it("single frame plans use image not images", () => {
    // 多传会被平台 400。
    const frames = ["data:image/png;base64,A"];
    for (const plan of [VideoPlan.ImageToVideo, VideoPlan.LastFrame]) {
      const b = buildBody(cfg(), job(plan, frames, []));
      expect(b.image).toBe(frames[0]);
      expect(b.images, plan).toBeUndefined();
      expect((b.metadata as Record<string, unknown>).task_type).toBe(VideoPlan.taskType(plan));
    }
  });

  it("first last frame sends both in order", () => {
    const frames = ["first", "last"];
    const b = buildBody(cfg(), job(VideoPlan.FirstLastFrame, frames, []));
    expect(b.images).toEqual(["first", "last"]);
    expect(b.image).toBeUndefined();
  });

  it("reference material goes to metadata not the frame keys", () => {
    // 参考素材和首帧图混用会让平台的输入形态判定失准。
    const refs = ["https://x/a.png"];
    const b = buildBody(cfg(), job(VideoPlan.Reference, [], refs));
    expect((b.metadata as Record<string, unknown>).src_ref_images).toEqual(refs);
    expect(b.image).toBeUndefined();
    expect(b.images).toBeUndefined();
  });

  it("reference plan uses the reference checkpoint", () => {
    // 参考族和首尾帧族是两个 checkpoint，发错模型出来的东西完全不同。
    const refs = ["https://x/a.png"];
    expect(buildBody(cfg(), job(VideoPlan.Reference, [], refs)).model).toBe("minimax-h3-ref2va");
    expect(buildBody(cfg(), job(VideoPlan.TextToVideo, [], [])).model).toBe("minimax-h3-fl2va");
  });

  it("generate audio reaches the payload", () => {
    // 这个开关此前在调用链上被整个丢掉了：用户在界面上关掉音轨，
    // 平台照样生成 —— 不报错，只是多花时间出一个没人要的音轨。
    const j = job(VideoPlan.TextToVideo, [], []);
    j.generateAudio = false;
    let b = buildBody(cfg(), j);
    expect((b.metadata as Record<string, unknown>).generate_audio).toBe(false);

    // 不指定就不发这个键，交给平台默认。
    b = buildBody(cfg(), job(VideoPlan.TextToVideo, [], []));
    expect("generate_audio" in (b.metadata as Record<string, unknown>)).toBe(false);
  });

  it("adaptive ratio omits size entirely", () => {
    // 硬塞一个 size 会把画面裁掉，而且不报错。
    expect(resolveSize("adaptive", "1080P")).toBeNull();
    expect(resolveSize("", "1080P")).toBeNull();
    // 这里原来期望 `1368x768` —— 那是旧算法的产物，而 `1368:768`
    // 约分是 **57:32**,正是平台拒掉请求的那个 bug。现在是
    // `1408x792` = 16×88 : 9×88，严格 16:9。
    expect(resolveSize("16:9", "768P")).toBe("1408x792");

    const j = job(VideoPlan.TextToVideo, [], []);
    j.aspectRatio = "adaptive";
    expect(buildBody(cfg(), j).size).toBeUndefined();
  });

  it("video sizes are multiples of eight", () => {
    for (const ratio of ["21:9", "4:5", "3:2", "9:16"]) {
      const size = resolveSize(ratio, "1080P")!;
      const [w, h] = size.split("x").map((n) => Number.parseInt(n, 10));
      expect(w! % 8, size).toBe(0);
      expect(h! % 8, size).toBe(0);
    }
  });

  it("a missing model is reported as config not as a failed generation", () => {
    const c = cfg();
    c.models.video = null;
    let err: unknown;
    try {
      buildBody(c, job(VideoPlan.TextToVideo, [], []));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(PlatformError);
    expect((err as PlatformError).code).toBe("dpp.config");
    expect((err as PlatformError).message).toContain("models.video");
  });

  it("upscale without a model fails before any network call", async () => {
    const c = cfg();
    c.models.video_upscale = null;
    const err = await upscale(offline(), c, "https://x/a.mp4", "2K").then(unexpected, (e: unknown) => e as PlatformError);
    expect(err).toBeInstanceOf(PlatformError);
    expect(err.message).toContain("models.video_upscale");
  });
});

function sizeParts(s: string): [number, number] {
  const [w, h] = s.split("x");
  return [Number.parseInt(w!, 10), Number.parseInt(h!, 10)];
}

describe("video size", () => {
  /**
   * **最重要的一条：算出来的尺寸必须严格约分回请求的比例。**
   *
   * 以前 9:16 @1K 得到 1024x1824 —— 约分是 32:57。平台从 size 反推
   * aspect_ratio 再按模型白名单校验，于是：
   *
   *     MiniMax H3 aspect_ratio must be one of 21:9, 16:9, 4:3, 1:1,
   *     3:4, 9:16, got '32:57'
   *
   * 而且这个错**不在提交时报**,是平台内部转换时才报 —— 任务排上队了
   * 才失败，用户看到的是活动流里一个红叉。
   */
  it("the size always reduces back to the requested ratio", () => {
    for (const ratio of ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9"]) {
      for (const tier of ["1K", "2K", "1080P", "480P"]) {
        const got = resolveSize(ratio, tier)!;
        // **按值比，不按字符串。** `21:9` 本身不是最简分数
        // （约分是 `7:3`），字符串比会误报 —— 而它作为比例是对的。
        const [w, h] = sizeParts(got);
        const [aw, ah] = ratio.split(":").map((n) => Number.parseInt(n, 10));
        expect(w * ah!, `${ratio} @ ${tier} 算出 ${got}，比例对不上`).toBe(h * aw!);
      }
    }
  });

  /**
   * 两条边都要是 8 的倍数。不是的话平台可能自己再调一次尺寸，
   * 调完又偏离比例。
   */
  it("both edges are multiples of eight", () => {
    for (const ratio of ["1:1", "16:9", "9:16", "4:3", "21:9"]) {
      for (const tier of ["1K", "2K"]) {
        const [w, h] = sizeParts(resolveSize(ratio, tier)!);
        expect([w % 8, h % 8], `${ratio} @ ${tier} → ${w}x${h}`).toEqual([0, 0]);
      }
    }
  });

  /**
   * 短边要落在档位附近。
   *
   * 界面给用户的选项就是 1K / 2K（Generate.tsx 的 RESOLUTIONS），
   * 而 `"1K"` 以前落进 `_ => 768` 的兜底 —— 用户选 1K，出来的是 768P,
   * 不报错，也没有任何地方说明为什么。图片那边 1K 一直是 1024。
   */
  it("the short edge lands near the tier", () => {
    const near = (got: string, want: number) => {
      const [w, h] = sizeParts(got);
      const short = Math.min(w, h);
      expect(Math.abs(short - want) <= Math.floor(want / 10), `${got} 的短边 ${short} 离档位 ${want} 太远`).toBe(true);
    };
    near(resolveSize("9:16", "1K")!, 1024);
    near(resolveSize("16:9", "1K")!, 1024);
    near(resolveSize("1:1", "2K")!, 1440);
    near(resolveSize("1:1", "480P")!, 480);
  });

  /** 比例为空 = 让平台自己定（比如按首帧图）。**不能当成 1:1。** */
  it("an empty ratio means let the platform decide", () => {
    expect(resolveSize("", "1K")).toBeNull();
    expect(resolveSize("adaptive", "1K")).toBeNull();
  });

  it("a nonsense ratio is none not a guess", () => {
    expect(resolveSize("abc", "1K")).toBeNull();
    expect(resolveSize("0:16", "1K")).toBeNull();
    expect(resolveSize("16:0", "1K")).toBeNull();
  });
});

describe("video frame driven", () => {
  /**
   * **有首帧图时不发比例。** 界面上首尾帧模式本来就把比例这一项藏起来
   * （`hiddenParamsByImageMode: { "first-last-frame": ["aspect_ratio"] }`）。
   *
   * 用户实测撞到的：要 2.39:1，模型挑了最接近的 21:9，而首帧图是 16:9
   * （1664x928）—— 平台把 16:9 的画面塞进 21:9 的画框，出来的视频是
   * 1792x768，"技术上是 21:9 没错"而**画面被横向拉开**,全程不报错。
   */
  it("a frame driven job never sends a ratio", () => {
    for (const plan of [VideoPlan.ImageToVideo, VideoPlan.LastFrame, VideoPlan.FirstLastFrame]) {
      const frames = ["https://x/a.png", "https://x/b.png"];
      const j = job(plan, frames, []);
      j.aspectRatio = "21:9";
      j.resolution = "768P";
      const body = buildBody(cfg(), j);
      expect(body.aspect_ratio, `${plan} 不该发 aspect_ratio`).toBeUndefined();
      expect(body.size, `${plan} 不该发 size`).toBeUndefined();
    }
  });

  /** 纯文生视频没有输入图，比例**必须发** —— 不发的话平台不知道出什么形状。 */
  it("text to video still sends the ratio", () => {
    const j = job(VideoPlan.TextToVideo, [], []);
    j.aspectRatio = "21:9";
    j.resolution = "768P";
    const body = buildBody(cfg(), j);
    expect(body.aspect_ratio).toBe("21:9");
    expect(body.size).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// TS 移植新增：提交/轮询。Rust 那边没有这一层的测试；这里 HTTP 整个重写过，
// 而且 sleep / now 可注入，30 分钟的轮询在几毫秒内就能跑完。
// ---------------------------------------------------------------------------

interface Step {
  status?: number;
  body?: unknown;
  raw?: string;
  throws?: unknown;
}

/** 按顺序回放响应；每次 sleep 让时钟走一个轮询间隔。 */
function scripted(steps: Step[]) {
  const calls: { url: string; method: string; body: unknown }[] = [];
  let clock = 0;
  let sleeps = 0;
  const client = createClient({
    fetch: async (input, init) => {
      calls.push({
        url: String(input),
        method: init?.method ?? "GET",
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      const s = steps.shift();
      if (!s) throw new Error("脚本里的响应用完了");
      if (s.throws !== undefined) throw s.throws;
      return new Response(s.raw ?? JSON.stringify(s.body ?? {}), { status: s.status ?? 200 });
    },
    sleep: async (ms) => {
      sleeps++;
      clock += ms;
    },
    now: () => clock,
    logger: { info() {}, warn() {} },
  });
  return { client, calls, sleeps: () => sleeps, advance: (ms: number) => (clock += ms) };
}

describe("video 提交/轮询（TS 移植新增）", () => {
  it("时间常数和 Rust 一致", () => {
    expect(SUBMIT_TIMEOUT_MS).toBe(60_000);
    expect(QUERY_TIMEOUT_MS).toBe(30_000);
    expect(POLL_INTERVAL_MS).toBe(5_000);
    expect(POLL_MAX_WAIT_MS).toBe(1_800_000);
  });

  it("提交拿 task_id，轮询到完成，结果在 metadata.url", async () => {
    const s = scripted([
      { body: { task_id: "t-1" } },
      { body: { status: "queued" } },
      { body: { status: "in_progress" } },
      { body: { status: "completed", metadata: { url: "https://o/v.mp4" } } },
    ]);
    const url = await generate(s.client, cfg(), VideoJob.textToVideo("猫"));
    expect(url).toBe("https://o/v.mp4");
    expect(s.calls[0]).toMatchObject({ url: "https://maas.example.com/v1/videos", method: "POST" });
    expect(s.calls[1]).toMatchObject({ url: "https://maas.example.com/v1/videos/t-1", method: "GET" });
    expect(s.sleeps()).toBe(3);
  });

  it("只有 id 没有 task_id 也认", async () => {
    const s = scripted([{ body: { id: "t-2" } }, { body: { status: "succeeded", metadata: { url: "u" } } }]);
    expect(await submitAndPoll(s.client, cfg(), {})).toBe("u");
    expect(s.calls[1]!.url).toBe("https://maas.example.com/v1/videos/t-2");
  });

  it("单次查询网络抖动 / 响应解析不了不算失败，接着轮询", async () => {
    const s = scripted([
      { body: { task_id: "t" } },
      { throws: new TypeError("fetch failed") },
      { raw: "<html>" },
      { body: { status: "success", metadata: { url: "u" } } },
    ]);
    expect(await submitAndPoll(s.client, cfg(), {})).toBe("u");
  });

  it("终态失败按错误信封报，轮询中的非 2xx 直接报", async () => {
    const failed = scripted([
      { body: { task_id: "t" } },
      { body: { status: "failed", error: { code: "convert_request_failed", message: "32:57" } } },
    ]);
    const e1 = await submitAndPoll(failed.client, cfg(), {}).then(unexpected, (e: unknown) => e as PlatformError);
    expect(e1.code).toBe("platform.convert_request_failed");

    const http = scripted([{ body: { task_id: "t" } }, { status: 404, raw: "not found" }]);
    const e2 = await submitAndPoll(http.client, cfg(), {}).then(unexpected, (e: unknown) => e as PlatformError);
    expect(e2.code).toBe("platform.http_404");
  });

  it("完成了却没有 URL、提交响应没有 task_id，都是协议错误", async () => {
    const noUrl = scripted([{ body: { task_id: "t" } }, { body: { status: "completed" } }]);
    const e1 = await submitAndPoll(noUrl.client, cfg(), {}).then(unexpected, (e: unknown) => e as PlatformError);
    expect(e1.code).toBe("dpp.protocol");

    const noId = scripted([{ body: {} }]);
    const e2 = await submitAndPoll(noId.client, cfg(), {}).then(unexpected, (e: unknown) => e as PlatformError);
    expect(e2.message).toContain("task_id");
  });

  it("超过 30 分钟报轮询超时，而不是无限转", async () => {
    const steps: Step[] = [{ body: { task_id: "t" } }];
    for (let i = 0; i < 400; i++) steps.push({ body: { status: "in_progress" } });
    const s = scripted(steps);
    const err = await submitAndPoll(s.client, cfg(), {}).then(unexpected, (e: unknown) => e as PlatformError);
    expect(err.message).toBe("平台任务轮询超时");
    // 30 分钟 / 5 秒 = 360 次查询，第 361 次睡醒时越界。
    expect(s.calls.length - 1).toBe(360);
  });

  it("提交失败按传输错误定性", async () => {
    const s = scripted([{ throws: new DOMException("The operation was aborted due to timeout", "TimeoutError") }]);
    const err = await submitAndPoll(s.client, cfg(), {}).then(unexpected, (e: unknown) => e as PlatformError);
    expect(err.code).toBe("dpp.transport");
    expect(err.message.startsWith("超时")).toBe(true);
    expect(err.message).toContain("https://maas.example.com/v1/videos");
  });

  it("视频超分：源素材走 metadata.video，档位词走 metadata.resolution", async () => {
    const s = scripted([{ body: { task_id: "t" } }, { body: { status: "completed", metadata: { url: "u" } } }]);
    await upscale(s.client, cfg(), "https://x/a.mp4", "2K");
    expect(s.calls[0]!.body).toEqual({
      model: "swiftvr",
      prompt: "upscale",
      metadata: { task_type: "sr", video: "https://x/a.mp4", resolution: "2K" },
    });
  });
});
