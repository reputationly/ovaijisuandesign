import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { startFakeGateway, type FakeGateway, type RecordedRequest } from "../testing/fake-gateway.js";
import { createHarness, gatewayFor, resultJson, resultText, type Harness } from "../testing/harness.js";
import { aggregateSpeech, registerAudioTools } from "./audio-tools.js";
import { resetVoiceCache } from "./voice-catalog.js";

const VOICES = [
  { voice_id: "female-shaonv", name: "少女", language: "中文（普通话）", gender: "女", age: "青年", accent: "", description: "", sample_audio: "" },
  { voice_id: "male-qn-qingse", name: "青涩青年", language: "中文（普通话）", gender: "男", age: "青年", accent: "", description: "", sample_audio: "" },
  { voice_id: "English_Graceful_Lady", name: "Graceful Lady", language: "英语", gender: "女", age: "", accent: "", description: "", sample_audio: "" },
];

let gw: FakeGateway;
let h: Harness;
let taskSeq = 0;

function submits(kind: string): RecordedRequest[] {
  return gw.requests.filter((r) => r.method === "POST" && r.path === `/api/generate/${kind}/submit`);
}

beforeAll(async () => {
  gw = await startFakeGateway();
});
afterAll(async () => {
  await gw.close();
});

beforeEach(() => {
  resetVoiceCache();
  gw.requests.length = 0;
  gw.routes.clear();
  gw.on("GET", "/api/internal/sessions/billing-current-scope", { json: { group_id: null, mode: "legacy", source: "no_selection" } });
  gw.on("GET", "/api/internal/sessions/s1/request-group", { json: { group_id: null, mode: "legacy", source: "no_selection" } });
  gw.on("GET", "/api/speech/voices", { json: VOICES });
  // 每次提交分配一个任务，查询立即成功，路径里带上提交时的文件名
  const tasks = new Map<string, Record<string, unknown>>();
  for (const kind of ["speech", "music"]) {
    gw.on("POST", `/api/generate/${kind}/submit`, (req) => {
      const task_id = `t${++taskSeq}`;
      tasks.set(task_id, req.body as Record<string, unknown>);
      return { json: { ok: true, task_id, status: "processing", media_type: kind } };
    });
  }
  const queryHandler = (req: RecordedRequest) => {
    const id = req.path.split("/")[4] ?? "";
    const body = tasks.get(id);
    return {
      json: { ok: true, task_id: id, status: "succeeded", result: { ok: true, path: `out/${String(body?.filename)}.mp3`, duration: 2.5, node_id: `n-${id}` } },
    };
  };
  // 假 gateway 按精确路径匹配：给接下来可能分配的任务 id 预先登记查询路由
  for (let i = taskSeq + 1; i <= taskSeq + 20; i++) gw.on("GET", `/api/generate/tasks/t${i}/query`, queryHandler);
  h = createHarness();
  registerAudioTools(h.registrar, gatewayFor(gw.url), "domestic");
});

afterEach(() => {
  delete process.env.FFPROBE_PATH;
});

describe("generate_audio_speech", () => {
  it("two texts → two submits with aligned params, aggregated results", async () => {
    const r = await h.call("generate_audio_speech", {
      texts: ["你好", "再见"],
      voice_ids: ["female-shaonv", "male-qn-qingse"],
      voice_id_source: "catalog",
      filenames: ["a", "b"],
      speeds: [1.5, null],
      emotions: "happy",
      pronunciation_dict: { tone: ["处理/(chu3)(li3)"] },
    });
    expect(r.isError).toBeFalsy();
    const out = resultJson<{ ok: boolean; results: { ok: boolean; path: string; node_id: string }[] }>(r);
    expect(out.ok).toBe(true);
    expect(out.results.map((x) => x.path).sort()).toEqual(["out/a.mp3", "out/b.mp3"]);
    const bodies = submits("speech").map((s) => s.body as Record<string, any>);
    expect(bodies).toHaveLength(2);
    const a = bodies.find((b) => b.filename === "a")!;
    expect(a).toMatchObject({
      backend: "minimax_tts",
      model_id: "speech-2.8-hd",
      prompt: "你好",
      source_tool: "hub_generate_audio_speech",
      params: {
        model_name: "speech-2.8-hd",
        voice_id: "female-shaonv",
        speed: "1.5",
        language_boost: "auto",
        emotion: "happy",
        pronunciation_dict: JSON.stringify({ tone: ["处理/(chu3)(li3)"] }),
      },
    });
    const b = bodies.find((x) => x.filename === "b")!;
    expect(b.params.speed).toBe("1");
    expect(b.params.voice_id).toBe("male-qn-qingse");
  });

  it("single text returns flat result", async () => {
    const r = await h.call("generate_audio_speech", { texts: "hi", filename: "one" });
    expect(resultJson(r)).toEqual({ ok: true, path: "out/one.mp3", duration: 2.5, node_id: expect.any(String) });
    expect((submits("speech")[0]?.body as any).params.voice_id).toBe("Friendly_Person");
  });

  it("rejects explicit voice id without voice_id_source, and unknown catalog ids", async () => {
    const r1 = await h.call("generate_audio_speech", { texts: "hi", filename: "x", voice_id: "female-shaonv" });
    expect(r1.isError).toBe(true);
    expect(resultText(r1)).toBe("voice_id_source is required with explicit official voice_id(s).");
    const r2 = await h.call("generate_audio_speech", { texts: "hi", filename: "x", voice_id: "shaonv", voice_id_source: "catalog" });
    expect(r2.isError).toBe(true);
    expect(resultText(r2)).toBe('Error: voice_id "shaonv" not found in current voice catalog.\nDid you mean: female-shaonv (少女, 中文（普通话）)');
    const r3 = await h.call("generate_audio_speech", { texts: "hi", filename: "x", voice_id: "zzz", voice_id_source: "tool" });
    expect(resultText(r3)).toBe('Error: voice_id "zzz" not found in current voice catalog.\nCall get_voice_id to find available voices.');
    expect(submits("speech")).toHaveLength(0);
  });

  it("seedaudio body carries references and seed params", async () => {
    const r = await h.call("generate_audio_speech", {
      texts: "台词",
      model_name: "seed-audio-1.0",
      filename: "s",
      reference_audio_paths: ["/a.wav"],
      volumes: 1.2,
      pitches: 3,
    });
    expect(r.isError).toBeFalsy();
    expect(submits("speech")[0]?.body).toEqual({
      backend: "seedaudio",
      model_id: "seed-audio-1.0",
      prompt: "台词",
      filename: "s",
      params: { model_name: "seed-audio-1.0", speed: "1", volume: "1.2", sample_rate: "24000", pitch: "3" },
      audio_paths: ["/a.wav"],
      source_tool: "hub_generate_audio_speech",
    });
  });
});

describe("generate_audio_music", () => {
  it("song submits lyrics in params", async () => {
    const r = await h.call("generate_audio_music", { mode: "song", prompt: "upbeat pop", lyrics: "[verse] la la", filename: "song" });
    expect(resultJson(r)).toMatchObject({ ok: true, path: "out/song.mp3", duration: 2.5 });
    expect(submits("music")[0]?.body).toEqual({
      backend: "minimax_music",
      model_id: "music-3.0",
      prompt: "upbeat pop",
      filename: "song",
      params: { lyrics: "[verse] la la" },
      source_tool: "hub_generate_audio_music:official:song",
    });
  });

  it("instrumental ignores lyrics; song without lyrics is rejected", async () => {
    await h.call("generate_audio_music", { mode: "instrumental", prompt: "calm", lyrics: "ignored", filename: "bgm" });
    expect((submits("music")[0]?.body as any).params).toEqual({ is_instrumental: "instrumental" });
    const bad = await h.call("generate_audio_music", { mode: "song", prompt: "x", filename: "y" });
    expect(bad.isError).toBe(true);
    expect(submits("music")).toHaveLength(1);
  });
});

describe("audio picker guard", () => {
  it("rejects speech when the user only selected music", async () => {
    gw.on("GET", "/api/internal/sessions/s1/selected-models", { json: { selected: { audio: ["music-3.0"] } } });
    const r = await h.call("generate_audio_speech", { texts: "hi", filename: "x", _session_id: "s1" });
    expect(r.isError).toBe(true);
    expect(resultText(r)).toBe(
      "Selected audio models do not include vendor=speech. selected_ids=[music-3.0] available_vendors=[official]",
    );
    expect(submits("speech")).toHaveLength(0);
  });

  it("rejects music outside the selected series, allows when selected", async () => {
    gw.on("GET", "/api/internal/sessions/s1/selected-models", { json: { selected: { audio: ["seed-audio-1.0"] } } });
    const r = await h.call("generate_audio_music", { mode: "instrumental", prompt: "p", filename: "f", _session_id: "s1" });
    expect(r.isError).toBe(true);
    expect(resultText(r)).toBe(
      "Selected audio models do not include series=official-music. selected_ids=[seed-audio-1.0] available_series=[seedaudio]",
    );

    gw.on("GET", "/api/internal/sessions/s1/selected-models", { json: { selected: { audio: ["music-3.0"] } } });
    const ok = await h.call("generate_audio_music", { mode: "instrumental", prompt: "p", filename: "f", _session_id: "s1" });
    expect(ok.isError).toBeFalsy();
    expect(submits("music")[0]?.headers["x-session-id"]).toBe("s1");
  });

  it("speech: vendor ticked without a concrete model, or a different model ticked", async () => {
    gw.on("GET", "/api/internal/sessions/s1/selected-models", { json: { selected: { audio: ["official-speech"] } } });
    const r1 = await h.call("generate_audio_speech", { texts: "hi", filename: "x", _session_id: "s1" });
    expect(resultText(r1)).toBe(
      "Selected audio models do not include a concrete model_id for vendor=speech. selected_ids=[official-speech]. Ask the user to enable a concrete model in the picker.",
    );
    gw.on("GET", "/api/internal/sessions/s1/selected-models", { json: { selected: { audio: ["speech-2.8-hd"] } } });
    const r2 = await h.call("generate_audio_speech", { texts: "hi", filename: "x", model_name: "speech-2.8-turbo", _session_id: "s1" });
    expect(resultText(r2)).toBe(
      "Selected audio models do not include model_id=speech-2.8-turbo (vendor=speech). selected_models=[speech-2.8-hd]. Use one of the selected models, or ask the user to enable this model in the picker.",
    );
    expect(submits("speech")).toHaveLength(0);
  });

  it("music: series ticked without its concrete model", async () => {
    gw.on("GET", "/api/internal/sessions/s1/selected-models", { json: { selected: { audio: ["official-music"] } } });
    const r = await h.call("generate_audio_music", { mode: "instrumental", prompt: "p", filename: "f", _session_id: "s1" });
    expect(resultText(r)).toBe("Selected audio models do not include a concrete model_id for series=official-music.");
  });

  it("fails open when the selection lookup errors", async () => {
    gw.on("GET", "/api/internal/sessions/s1/selected-models", { status: 500, json: {} });
    const r = await h.call("generate_audio_music", { mode: "instrumental", prompt: "p", filename: "f", _session_id: "s1" });
    expect(r.isError).toBeFalsy();
  });
});

describe("voice_prepare", () => {
  it("filters catalog by language prefix and case-insensitive gender", async () => {
    const r = await h.call("voice_prepare", {
      items: [
        { id: "hero", action: "search_catalog", language: "中文", gender: "男" },
        { action: "search_catalog", language: "英语" },
      ],
    });
    const out = resultJson<any>(r);
    expect(out).toMatchObject({ ok: true, total: 2, successCount: 2, errorCount: 0, failed: [] });
    expect(out.results[0]).toMatchObject({ index: 0, id: "hero", total: 1 });
    expect(out.results[0].voices[0].voice_id).toBe("male-qn-qingse");
    expect(out.results[1].voices.map((v: any) => v.voice_id)).toEqual(["English_Graceful_Lady"]);
    // 同一批只拉一次目录
    expect(gw.requests.filter((q) => q.path === "/api/speech/voices")).toHaveLength(1);
  });

  it("overseas region accepts lower-case enum values", async () => {
    const h2 = createHarness();
    registerAudioTools(h2.registrar, gatewayFor(gw.url), "overseas");
    const r = await h2.call("voice_prepare", { items: [{ action: "search_catalog", language: "english", gender: "female" }] });
    expect(resultJson<any>(r).ok).toBe(true);
  });

  it("invalid item fails the whole batch without calling clone", async () => {
    const r = await h.call("voice_prepare", { items: [{ action: "clone", audio_path: "/a.mp3" }, { action: "design", prompt: "deep" }] });
    const out = resultJson<any>(r);
    expect(out.ok).toBe(false);
    expect(out.errorCount).toBe(2);
    expect(out.results[1].error).toBe("items[1].prompt and preview_text are required for action=design.");
    expect(out.results[0].error).toBe("not run because batch validation failed");
    expect(gw.requests.some((q) => q.path === "/api/speech/voice_clone")).toBe(false);
  });

  it("clone forwards body; risk-flagged audio is a failed item", async () => {
    gw.on("POST", "/api/speech/voice_clone", { json: { voice_id: "hub_clone_1", input_sensitive_type: 2 } });
    const r = await h.call("voice_prepare", { items: [{ action: "clone", audio_path: "/ref.mp3", demo_text: "hello" }] });
    const out = resultJson<any>(r);
    expect(out.failed[0]).toMatchObject({
      voice_id: "hub_clone_1",
      input_sensitive_type: 2,
      ok: false,
      error: "reference audio was flagged for risk (type=2); ask the user before using it",
    });
    const req = gw.requests.find((q) => q.path === "/api/speech/voice_clone")!;
    expect(req.body).toEqual({ audio_path: "/ref.mp3", demo_text: "hello", demo_model: "speech-2.8-hd" });
  });
});

describe("aggregateSpeech", () => {
  it("any recoverable member makes the batch do_not_resubmit", () => {
    const out = aggregateSpeech([
      { status: "fulfilled", value: { ok: true, path: "a.mp3" } },
      { status: "fulfilled", value: { ok: false, error: "slow", error_code: "timeout", failure_presentation: "recoverable", recovery_handle: "t9" } },
    ]);
    expect(out).toMatchObject({ ok: false, failure_presentation: "recoverable", do_not_resubmit: true });
    expect((out.results as any[])[1]).toMatchObject({ recovery_handle: "t9", do_not_resubmit: true });
  });

  it("billing failure surfaces at top level as terminal", () => {
    const out = aggregateSpeech([
      { status: "fulfilled", value: { ok: false, error: "no money", error_code: "billing_insufficient_balance", failure_presentation: "terminal" } },
    ]);
    expect(out).toMatchObject({ error_code: "billing_insufficient_balance", failure_presentation: "terminal" });
    expect(out.do_not_resubmit).toBeUndefined();
  });
});

describe("audio_meta", () => {
  it("missing file is an error", async () => {
    const r = await h.call("audio_meta", { audio_path: "/definitely/not/here.mp3" });
    expect(r.isError).toBe(true);
    expect(resultText(r)).toMatch(/^Error getting audio metadata: Error: Command failed: /);
  });

  const hasFfprobe = (() => {
    try {
      execFileSync("ffprobe", ["-version"], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  })();

  it.skipIf(!hasFfprobe)("reads duration of a generated wav", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "audio-meta-"));
    try {
      // 1 秒 8kHz 单声道 16bit 静音 WAV
      const rate = 8000;
      const data = Buffer.alloc(rate * 2);
      const header = Buffer.alloc(44);
      header.write("RIFF", 0);
      header.writeUInt32LE(36 + data.length, 4);
      header.write("WAVEfmt ", 8);
      header.writeUInt32LE(16, 16);
      header.writeUInt16LE(1, 20);
      header.writeUInt16LE(1, 22);
      header.writeUInt32LE(rate, 24);
      header.writeUInt32LE(rate * 2, 28);
      header.writeUInt16LE(2, 32);
      header.writeUInt16LE(16, 34);
      header.write("data", 36);
      header.writeUInt32LE(data.length, 40);
      const file = path.join(dir, "s.wav");
      writeFileSync(file, Buffer.concat([header, data]));
      const out = resultJson<any>(await h.call("audio_meta", { audio_path: file }));
      expect(out.duration).toBeCloseTo(1, 1);
      expect(out.format_name).toBe("wav");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
