#!/usr/bin/env node
/**
 * 真实平台联调：一次跑完 P0 的六个场景，把证据落盘。
 *
 *   OV_PLATFORM_KEY=… node scripts/smoke/platform-online.mjs
 *   node scripts/smoke/platform-online.mjs --self-test        # 假平台，零成本，验证脚本本身
 *   … --only image,speech                                     # 只跑几项
 *   … --voice-ref ./ref.wav                                    # 语音要一段参考音频（平台没有预设音色）
 *   … --music-engine music3                                    # 模型名判不出音乐引擎族时显式指定
 *   … --check                                                  # 只验 key 与平台部署状态，不生成任何东西
 *
 * # 平台还没部署 `/v1/ov/*` 的时候
 *
 * 那一步会 404（实测 `https://maas.ovaijisuan.com` 现在就是）。脚本**不会因此整跑失败**：
 * 目录拿不到就退回一份写死的模型名（`FALLBACK_MODELS`，与本轮联调用的那套一致），并在
 * 结论里明确写"目录未部署、模型名是兜底值" —— 否则会让人以为"目录里就该有这些"。
 * 代价是：这条路上验证不到"目录下发的模型名"，等 new-api 的 `/v1/ov` 上线后再跑一次才算完整。
 *
 * # 为什么要有这个脚本
 *
 * P0 的验收是"用真实 key 分别跑通一次生图、视频、语音合成、音乐、对话"。手点六次既慢又
 * 容易漏，而每次漏掉的场景都要再花一次钱。这里把它们串成一条命令，一趟跑完、证据落盘。
 *
 * # 走的是产品自己的代码
 *
 * 不手写 HTTP：直接用 `@ov/maas-media`（gateway 调平台用的就是它），参数形状、task_type、
 * 轮询、错误解析全部与产品一致。**手写一份请求体的脚本会漂移** —— 而漂移出来的"通过"
 * 恰恰是最坏的：它证明的是脚本而不是产品。
 *
 * # 钱
 *
 * 六个场景各跑**一次**，不循环、不压测。`--self-test` 完全不花钱（全部打到本地假平台），
 * 改脚本时先跑它。
 *
 * # key
 *
 * 只从 `OV_PLATFORM_KEY` 读，不落盘、不进命令行参数、不进日志。结果里的 `sk-` 串一律
 * 脱敏成 `sk-…redacted(<长度>)`。
 */
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** maas-media 已构建的入口。脚本与产品共用同一份实现，见文件头。 */
const media = await import(new URL("../../app/packages/maas-media/dist/index.js", import.meta.url).href);

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] && !args[at + 1].startsWith("--") ? args[at + 1] : fallback;
};

const selfTest = flag("self-test");
const only = new Set((value("only", "") || "").split(",").map((s) => s.trim()).filter(Boolean));
const shouldRun = (name) => only.size === 0 || only.has(name);
const voiceRef = value("voice-ref", process.env.OV_SMOKE_VOICE_REF || "");
const musicEngine = value("music-engine", process.env.OV_SMOKE_MUSIC_ENGINE || "");
const checkOnly = flag("check");
const key = process.env.OV_PLATFORM_KEY ?? "";
const baseUrl = value("base-url", process.env.OV_PLATFORM_BASE_URL || "https://maas.ovaijisuan.com/v1");
const runAt = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.resolve(repo, value("out", `.probe/platform/${runAt}-${selfTest ? "selftest" : "online"}`));

if (!selfTest && !key.trim()) {
  console.error("需要 OV_PLATFORM_KEY（只从环境变量读）。想先验证脚本本身，用 --self-test。");
  process.exit(2);
}

const redact = (v) =>
  typeof v === "string"
    ? v.replace(/sk-[A-Za-z0-9_-]{6,}/g, (m) => `${m.slice(0, 3)}…redacted(${m.length})`)
    : Array.isArray(v)
      ? v.map(redact)
      : v && typeof v === "object"
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, redact(x)]))
        : v;

/**
 * `/v1/ov/capabilities` 还没部署时的兜底模型名（等于本轮联调手工确认过的那套）。
 *
 * 为什么要有它：云平台的 `/v1/ov` 是这次新加的路由，**线上还没发布**（实测 404）。
 * 没有兜底的话，"取到 key 之后跑一次"这件事会被一个与产品无关的部署时点挡住。
 * 但兜底值**不能冒充目录**：结论里会写清楚，接口一上线就该复跑。
 */
const FALLBACK_MODELS = [
  { operation: "generate_image", model: "qwen-image-pro-enhanced" },
  { operation: "generate_image", model: "qwen-image-edit", limits: { maxReferenceImages: 4 } },
  { operation: "generate_video", model: "minimax-h3-2k", taskTypes: ["t2v", "i2v"] },
  { operation: "generate_video", model: "minimax-h3-ref-2k", taskTypes: ["r2va"] },
  { operation: "generate_music", model: "minimax-music3" },
  { operation: "generate_speech", model: "indextts-2.5" },
  { operation: "chat", model: "deepseek-v4-1-flash" },
];

const results = [];
const record = (scenario, status, detail) => {
  results.push(redact({ scenario, status, ...detail }));
  const mark = status === "pass" ? "PASS" : status === "skip" ? "SKIP" : "FAIL";
  console.log(`${mark}  ${scenario}${detail?.note ? `  — ${detail.note}` : ""}`);
};

// ---------------------------------------------------------------------------
// 假平台（--self-test）
// ---------------------------------------------------------------------------

/** self-test 用的目录：四个媒体操作 + 对话，各一条默认。 */
function fakeCatalog(base) {
  const capability = (operation, model, extra = {}) => ({
    id: `${operation}:${model}`,
    operation,
    model,
    transport: { kind: operation === "generate_image" ? "images" : "videos_task" },
    default: true,
    ...extra,
  });
  return {
    version: "selftest-v1",
    capabilities: [
      capability("generate_image", "fake-image", { paramSchema: { type: "object", properties: { aspect_ratio: { type: "string", enum: ["1:1"], default: "1:1" } } } }),
      capability("generate_video", "fake-video", { taskTypes: ["t2v"] }),
      capability("generate_speech", "fake-speech", { taskTypes: ["tts"] }),
      capability("generate_music", "fake-music3", { taskTypes: ["t2m"] }),
      { id: "chat:fake-chat", operation: "chat", model: "fake-chat", transport: { kind: "chat" } },
    ],
    fetchedAt: new Date().toISOString(),
    source: "live",
    _base: base,
  };
}

const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082", "hex");
const WAV = Buffer.from("524946462400000057415645666d742010000000010001004400000088000000020010006461746100000000", "hex");

async function startFakePlatform() {
  const tasks = new Map();
  const polls = new Map();
  const server = createServer((req, res) => {
    const base = `http://127.0.0.1:${server.address().port}`;
    const json = (payload) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(payload));
    };
    if (req.url === "/v1/ov/capabilities") return json(fakeCatalog(base));
    if (req.url === "/v1/images/generations") return json({ data: [{ url: `${base}/files/out.png` }] });
    if (req.url === "/files/out.png") {
      res.setHeader("content-type", "image/png");
      return res.end(PNG);
    }
    if (req.url === "/files/out.wav") {
      res.setHeader("content-type", "audio/wav");
      return res.end(WAV);
    }
    if (req.url === "/v1/videos" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += String(chunk)));
      return req.on("end", () => {
        const taskId = `task-${tasks.size + 1}`;
        tasks.set(taskId, JSON.parse(body || "{}"));
        return json({ task_id: taskId, id: taskId });
      });
    }
    const poll = /^\/v1\/videos\/([^/?]+)$/.exec(req.url ?? "");
    if (poll) {
      const taskId = poll[1];
      const count = (polls.get(taskId) ?? 0) + 1;
      polls.set(taskId, count);
      // 第一次回进行中，第二次完成 —— 顺带验证轮询这条链。
      if (count < 2) return json({ status: "in_progress" });
      return json({ status: "completed", metadata: { url: `${base}/files/out.wav` } });
    }
    if (req.url === "/v1/chat/completions") return json({ choices: [{ message: { content: "pong" } }] });
    res.statusCode = 404;
    res.end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}`, tasks, polls };
}

// ---------------------------------------------------------------------------
// 目录 → 配置（与 gateway 的 MediaConfigService 同一套取默认项规则）
// ---------------------------------------------------------------------------

function configFromCatalog(catalog, platform) {
  const defaultOf = (operation) => {
    const matching = catalog.capabilities.filter((c) => c.operation === operation);
    return (matching.find((c) => c.default === true) ?? matching[0])?.model;
  };
  const models = {
    image: defaultOf("generate_image") ?? null,
    image_edit: catalog.capabilities.find((c) => c.operation === "generate_image" && (c.limits?.maxReferenceImages ?? 0) > 0)?.model ?? null,
    video: defaultOf("generate_video") ?? null,
    video_ref: catalog.capabilities.find((c) => c.operation === "generate_video" && (c.taskTypes ?? []).includes("r2va"))?.model ?? null,
    music: defaultOf("generate_music") ?? null,
    music_edit: null,
    speech: defaultOf("generate_speech") ?? null,
    video_upscale: null,
    image_upscale: null,
    music_engine: null,
    enhance_music_caption: false,
    voice_map: {},
  };
  const cfg = media.parseMediaConfig({ platform, models });
  // 目录里的名字要原样放行，否则 route() 会把不认识的名字换成槽位默认。
  cfg.models.known = catalog.capabilities.map((c) => c.model);
  return cfg;
}

/** 结果 URL 要真的下得下来 —— 只拿到字符串不代表产物存在。 */
async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`下载产物失败：HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) throw new Error("产物是空的");
  return { bytes: bytes.length, contentType: response.headers.get("content-type") ?? "" };
}

// ---------------------------------------------------------------------------
// 六个场景
// ---------------------------------------------------------------------------

async function main() {
  const fake = selfTest ? await startFakePlatform() : null;
  const platform = {
    base_url: fake ? `${fake.base}/v1` : baseUrl,
    api_key: fake ? "sk-selftest" : key,
    chat_model: "",
  };
  // self-test 里把 sleep 换掉：轮询不必真等 5 秒。
  const client = media.createClient(selfTest ? { sleep: async () => {}, logger: { info() {}, warn() {} } } : { logger: { info() {}, warn() {} } });
  const evidence = { runAt: new Date().toISOString(), selfTest, baseUrl: platform.base_url, scenarios: results };

  mkdirSync(outDir, { recursive: true });

  // 1. 能力目录 —— 后面每一项的模型名都从这里来；它不通，别的都不用跑。
  let catalog = null;
  const startedCatalog = Date.now();
  try {
    const response = await fetch(`${platform.base_url.replace(/\/v1$/, "")}/v1/ov/capabilities`, {
      headers: { Authorization: `Bearer ${platform.api_key}` },
    });
    const body = await response.json();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(redact(body)).slice(0, 200)}`);
    if (typeof body.version !== "string" || !Array.isArray(body.capabilities)) throw new Error("响应形状不对（缺 version / capabilities）");
    catalog = body;
    const byOperation = {};
    for (const capability of body.capabilities) (byOperation[capability.operation] ??= []).push(capability.model);
    record("capabilities", "pass", { version: body.version, elapsedMs: Date.now() - startedCatalog, byOperation });
  } catch (error) {
    const note = error instanceof Error ? error.message : String(error);
    // 404 = 这个部署还没有 `/v1/ov`。那不是"产品坏了"，是"云平台还没发版"，
    // 所以不判失败，改成退回兜底模型名并把话说清楚。
    if (/HTTP 404/.test(note) && !selfTest) {
      catalog = { version: "fallback", capabilities: FALLBACK_MODELS, fetchedAt: new Date().toISOString(), source: "cache" };
      record("capabilities", "skip", {
        note: "平台上没有 /v1/ov/capabilities（HTTP 404）—— 云平台还没发这个版；下面用兜底模型名跑，模型名不是目录下发的",
        elapsedMs: Date.now() - startedCatalog,
      });
    } else {
      record("capabilities", "fail", { note });
    }
  }

  // --check：只回答"这个 key 能不能用、平台发了哪些接口"，不生成任何东西（不花钱）。
  if (checkOnly) {
    try {
      const response = await fetch(`${platform.base_url}/models`, { headers: { Authorization: `Bearer ${platform.api_key}` } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const models = Array.isArray(body.data) ? body.data.map((m) => m.id) : [];
      record("key", "pass", { models: models.length, sample: models.slice(0, 8) });
    } catch (error) {
      record("key", "fail", { note: error instanceof Error ? error.message : String(error) });
    }
    evidence.results = results;
    writeFileSync(path.join(outDir, "result.json"), JSON.stringify(evidence, null, 2));
    const failedCheck = results.some((r) => r.status === "fail");
    console.log(`\ncheck：${failedCheck ? "key 或平台不可用" : "key 可用"} → ${path.relative(repo, outDir)}/result.json`);
    if (fake) fake.server.close();
    process.exit(failedCheck ? 1 : 0);
  }

  if (catalog) {
    platform.chat_model = catalog.capabilities.find((c) => c.operation === "chat")?.model ?? "";
    const cfg = configFromCatalog(catalog, { ...platform, chat_model: platform.chat_model || "unused" });

    // 2. 生图（同步接口）
    if (shouldRun("image")) {
      if (!cfg.models.image) record("image", "skip", { note: "目录里没有 generate_image" });
      else {
        const started = Date.now();
        try {
          const url = await media.image.generate(client, cfg, "一只红色的苹果，白底，简洁", [], "1:1", "1K", cfg.models.image);
          const asset = await download(url);
          record("image", "pass", { model: cfg.models.image, url, elapsedMs: Date.now() - started, ...asset });
        } catch (error) {
          record("image", "fail", { model: cfg.models.image, elapsedMs: Date.now() - started, note: error instanceof Error ? error.message : String(error) });
        }
      }
    }

    // 3. 视频（异步任务 + 轮询）
    if (shouldRun("video")) {
      if (!cfg.models.video) record("video", "skip", { note: "目录里没有 generate_video" });
      else {
        const started = Date.now();
        try {
          const job = {
            ...media.video.VideoJob.textToVideo("一只橘猫在窗台上打哈欠"),
            duration: 5,
            aspectRatio: "adaptive",
            resolution: "",
            modelId: cfg.models.video,
          };
          const url = await media.video.generate(client, cfg, job);
          const asset = await download(url);
          record("video", "pass", { model: cfg.models.video, url, elapsedMs: Date.now() - started, ...asset });
        } catch (error) {
          record("video", "fail", { model: cfg.models.video, elapsedMs: Date.now() - started, note: error instanceof Error ? error.message : String(error) });
        }
      }
    }

    // 4. 语音合成（要一段参考音频：平台没有预设音色）
    if (shouldRun("speech")) {
      if (!cfg.models.speech) record("speech", "skip", { note: "目录里没有 generate_speech" });
      else if (!voiceRef) {
        record("speech", "skip", { note: "没给 --voice-ref：平台没有预设音色，合成需要一段参考音频（本地文件或 URL）" });
      } else {
        const started = Date.now();
        try {
          const resolved = selfTest ? `${fake.base}/files/out.wav` : voiceRef;
          cfg.models.voice_map = { smoke: resolved };
          const url = await media.audio.synthesizeSpeech(client, cfg, "这是一段联调用的语音。", "smoke", cfg.models.speech);
          const asset = await download(url);
          record("speech", "pass", { model: cfg.models.speech, url, elapsedMs: Date.now() - started, ...asset });
        } catch (error) {
          record("speech", "fail", { model: cfg.models.speech, elapsedMs: Date.now() - started, note: error instanceof Error ? error.message : String(error) });
        }
      }
    }

    // 5. 音乐（纯器乐：不需要歌词）
    if (shouldRun("music")) {
      if (!cfg.models.music) record("music", "skip", { note: "目录里没有 generate_music" });
      else if (musicEngine) {
        cfg.models.music_engine = musicEngine;
      }
      if (cfg.models.music && (musicEngine || media.config.resolveMusicEngine(cfg.models, cfg.models.music).ok)) {
        const started = Date.now();
        try {
          const url = await media.audio.generateMusic(client, cfg, "lo-fi hip hop，钢琴与轻鼓，60 BPM", "", media.audio.MusicIntent.Instrumental, cfg.models.music);
          const asset = await download(url);
          record("music", "pass", { model: cfg.models.music, url, elapsedMs: Date.now() - started, ...asset });
        } catch (error) {
          record("music", "fail", { model: cfg.models.music, elapsedMs: Date.now() - started, note: error instanceof Error ? error.message : String(error) });
        }
      } else if (cfg.models.music) {
        record("music", "skip", {
          model: cfg.models.music,
          note: "模型名判不出音乐引擎族（music3 / ace_step）：加 --music-engine music3 或 ace_step 再跑",
        });
      }
    }

    // 6. 对话 —— token 预算按"思考模型"给足（给 16 会被推理吃光，content 回 null）。
    if (shouldRun("chat")) {
      if (!platform.chat_model) record("chat", "skip", { note: "目录里没有 chat 能力" });
      else {
        const started = Date.now();
        try {
          const text = await media.chat.complete(client, cfg, "只回答要求的那个词，不要解释。", "回答 pong", 0, 512, 120_000);
          record("chat", "pass", { model: platform.chat_model, elapsedMs: Date.now() - started, chars: text.length, sample: text.slice(0, 40) });
        } catch (error) {
          record("chat", "fail", { model: platform.chat_model, elapsedMs: Date.now() - started, note: error instanceof Error ? error.message : String(error) });
        }
      }
    }

    evidence.models = cfg.models;
  }

  evidence.results = results;
  writeFileSync(path.join(outDir, "result.json"), JSON.stringify(evidence, null, 2));
  const failed = results.filter((r) => r.status === "fail").length;
  const skipped = results.filter((r) => r.status === "skip").length;
  console.log(`\n${results.length - failed - skipped} 通过 / ${failed} 失败 / ${skipped} 跳过 → ${path.relative(repo, outDir)}/result.json`);
  if (fake) fake.server.close();
  process.exit(failed === 0 ? 0 : 1);
}

await main();
