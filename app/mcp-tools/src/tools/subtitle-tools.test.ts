import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createHarness, resultJson, resultText } from "../testing/harness.js";
import { escapeFfmpegFilterValue } from "./ffmpeg-guards.js";
import { foldCjkSegment, formatSubtitleContent, hexToAssColor, parseSrt } from "./subtitle-format.js";
import { registerSubtitleTools } from "./subtitle-tools.js";

const SRT = `1
00:00:01,000 --> 00:00:03,500
Hello there

2
00:00:04,000 --> 00:00:06,000
今天天气很好
`;

let dir: string;
const savedFont = process.env.HILO_BUNDLED_CJK_FONT_PATH;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "subtitle-"));
  delete process.env.HILO_BUNDLED_CJK_FONT_PATH;
});
afterEach(() => {
  if (savedFont === undefined) delete process.env.HILO_BUNDLED_CJK_FONT_PATH;
  else process.env.HILO_BUNDLED_CJK_FONT_PATH = savedFont;
});

function writeSrt(content: string, name = "clip.srt"): string {
  const p = path.join(dir, name);
  writeFileSync(p, content, "utf8");
  return p;
}

describe("subtitle formatting (pure)", () => {
  it("parses SRT blocks, tolerating CRLF and missing index lines", () => {
    const cues = parseSrt("00:00:01,000 --> 00:00:02,000\r\nline a\r\nline b\r\n\r\n2\r\n00:00:03,000 --> 00:00:04,000\r\nc");
    expect(cues).toEqual([
      { start: "00:00:01,000", end: "00:00:02,000", text: "line a\\Nline b" },
      { start: "00:00:03,000", end: "00:00:04,000", text: "c" },
    ]);
  });

  it("converts colours to ASS &HAABBGGRR with inverted alpha", () => {
    expect(hexToAssColor("#FFFFFF")).toBe("&H00FFFFFF");
    expect(hexToAssColor("#112233")).toBe("&H00332211");
    expect(hexToAssColor("#00000080")).toBe("&H7F000000");
  });

  it("folds CJK within the per-line limit without losing characters", () => {
    const text = "今天天气很好，我们一起去公园散步吧然后回家吃饭";
    const lines = foldCjkSegment(text, 10);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(Array.from(l).length).toBeLessThanOrEqual(10);
    expect(lines.join("")).toBe(text);
    // 后半行出现的逗号优先作为断点
    expect(lines[0]).toBe("今天天气很好，");
  });

  it("builds a portrait ASS with derived style and a centre anchor on every event", () => {
    const f = formatSubtitleContent(SRT, { sourceSrtPath: "/x/clip.srt", outputSize: "1080x1920", fontName: "Test Sans" });
    expect(f.path).toBe("/x/clip.ass");
    expect(f.style).toMatchObject({ frameClass: "portrait", fontSize: 80, marginL: 76, marginR: 76, marginV: 192, cjkCharsPerLine: 10, englishWordsPerLine: 7 });
    const lines = f.content.split("\n");
    expect(lines).toContain("PlayResX: 1080");
    expect(lines).toContain("PlayResY: 1920");
    expect(lines).toContain(
      "Style: Default,Test Sans,80,&H00FFFFFF,&H00FFFFFF,&H00000000,&H7F000000,0,0,0,0,100,100,0,0,1,2,1,2,76,76,192,1",
    );
    expect(lines).toContain("Dialogue: 0,0:00:01.00,0:00:03.50,Default,,0,0,0,,{\\an5\\pos(540,1688)}Hello there");
    expect(lines).toContain("Dialogue: 0,0:00:04.00,0:00:06.00,Default,,0,0,0,,{\\an5\\pos(540,1688)}今天天气很好");
  });

  it("top position uses 12.5% margin and alignment 8; landscape uses H/19", () => {
    const f = formatSubtitleContent(SRT, { sourceSrtPath: "a.srt", outputSize: "1920x1080", position: "top", fontName: "F" });
    expect(f.style).toMatchObject({ frameClass: "landscape", fontSize: 57, marginV: 135 });
    expect(f.content).toMatch(/,8,134,134,135,1\n/);
    expect(f.content).toContain("{\\an5\\pos(960,164)}");
  });

  it("clamps unsafe margins with warnings unless unsafe_override", () => {
    const clamped = formatSubtitleContent(SRT, { sourceSrtPath: "a.srt", outputSize: "1000x1000", marginL: 0, marginV: 5, fontName: "F" });
    expect(clamped.style.marginL).toBe(70);
    expect(clamped.style.marginV).toBe(100);
    expect(clamped.warnings).toHaveLength(2);
    const raw = formatSubtitleContent(SRT, { sourceSrtPath: "a.srt", outputSize: "1000x1000", marginL: 0, marginV: 5, unsafeOverride: true, fontName: "F" });
    expect(raw.style).toMatchObject({ marginL: 0, marginV: 5 });
    expect(raw.warnings).toEqual([]);
  });

  it("splits an over-long cue into timed parts weighted by text", () => {
    const long = `1\n00:00:00,000 --> 00:00:10,000\n${Array.from({ length: 28 }, (_, i) => `w${i}`).join(" ")}\n`;
    const f = formatSubtitleContent(long, { sourceSrtPath: "a.srt", outputSize: "1080x1920", format: "srt", fontName: "F" });
    expect(f.cueCount).toBe(2);
    expect(f.content).toContain("00:00:00,000 --> 00:00:05,000");
    expect(f.content).toContain("00:00:05,000 --> 00:00:10,000");
  });

  it("rejects a malformed output_size", () => {
    expect(() => formatSubtitleContent(SRT, { sourceSrtPath: "a.srt", outputSize: "big" })).toThrow(/output_size/);
  });
});

describe("subtitle_format tool", () => {
  it("writes ASS next to the source and returns a burn hint with the bundled font dir", async () => {
    const font = path.join(dir, "fonts", "Noto.otf");
    await import("node:fs").then((fs) => {
      fs.mkdirSync(path.dirname(font));
      fs.writeFileSync(font, "");
    });
    process.env.HILO_BUNDLED_CJK_FONT_PATH = font;
    const src = writeSrt(SRT);
    const h = createHarness();
    registerSubtitleTools(h.registrar, undefined as never, "domestic");
    const r = await h.call("subtitle_format", { source_srt_path: src, output_size: "1080x1920" });
    expect(r.isError).toBeFalsy();
    const out = resultJson<Record<string, any>>(r);
    expect(out.path).toBe(path.join(dir, "clip.ass"));
    expect(out.format).toBe("ass");
    expect(out.cue_count).toBe(2);
    expect(out.play_res).toBe("1080x1920");
    expect(out.style_resolved).toMatchObject({ preset: "social_safe", font_name: "Noto Sans CJK SC", max_lines: 2, safe_area: "social" });
    expect(out.burn_hint).toBe(`ass='${escapeFfmpegFilterValue(out.absolute_path)}':fontsdir='${escapeFfmpegFilterValue(path.dirname(font))}'`);
    expect(readFileSync(out.path, "utf8")).toContain("[Events]");
  });

  it("converts to VTT with a custom filename", async () => {
    const src = writeSrt(SRT);
    const h = createHarness();
    registerSubtitleTools(h.registrar, undefined as never, "domestic");
    const r = await h.call("subtitle_format", { source_srt_path: src, output_size: "1920x1080", format: "vtt", filename: "captions.en" });
    const out = resultJson<Record<string, any>>(r);
    expect(out.path).toBe(path.join(dir, "captions.vtt"));
    expect(out.burn_hint).toMatch(/^subtitles='/);
    expect(readFileSync(out.path, "utf8")).toBe(
      "WEBVTT\n\n00:00:01.000 --> 00:00:03.500\nHello there\n\n00:00:04.000 --> 00:00:06.000\n今天天气很好\n",
    );
  });

  it("re-folds SRT to SRT with renumbered cues and single-line limit", async () => {
    const src = writeSrt("5\n00:00:00,000 --> 00:00:04,000\none two three four five six seven eight nine\n", "raw.srt");
    const h = createHarness();
    registerSubtitleTools(h.registrar, undefined as never, "domestic");
    const r = await h.call("subtitle_format", {
      source_srt_path: src,
      output_size: "1080x1920",
      format: "srt",
      filename: "folded",
      max_lines: 1,
    });
    const out = resultJson<Record<string, any>>(r);
    expect(out.cue_count).toBe(2);
    expect(readFileSync(out.path, "utf8")).toBe(
      "1\n00:00:00,000 --> 00:00:03,111\none two three four five six seven\n\n2\n00:00:03,111 --> 00:00:04,000\neight nine\n",
    );
  });

  it("reports a missing source file as an error", async () => {
    const h = createHarness();
    registerSubtitleTools(h.registrar, undefined as never, "domestic");
    const r = await h.call("subtitle_format", { source_srt_path: path.join(dir, "nope.srt"), output_size: "1080x1920" });
    expect(r.isError).toBe(true);
    expect(resultText(r)).toMatch(/^Error reading SRT at /);
  });

  it("rejects a malformed output_size at the schema", async () => {
    const h = createHarness();
    registerSubtitleTools(h.registrar, undefined as never, "domestic");
    await expect(h.call("subtitle_format", { source_srt_path: "a.srt", output_size: "1080*1920" })).rejects.toThrow();
  });
});
