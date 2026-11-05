import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildDeck } from "./pptx.js";

/** 1x1 PNG，够 python-pptx 识别成合法图片。 */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AL+2wAAAABJRU5ErkJggg==",
  "base64",
);

function pythonAvailable(): boolean {
  try {
    execFileSync("python3", ["-c", "import pptx"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("PPTX 生成", () => {
  it("打出来的包能被 python-pptx 打开，页数/图片数正确", () => {
    const deck = buildDeck([
      { image: PNG, imageType: "png", title: "第一页" },
      { image: PNG, imageType: "png" },
    ]);
    // ZIP 头魔数，避免打出坏包却"看起来成功"。
    expect(deck.subarray(0, 2).toString("latin1")).toBe("PK");

    if (!pythonAvailable()) {
      console.warn("python-pptx 不可用，跳过结构校验");
      return;
    }
    const dir = mkdtempSync(path.join(tmpdir(), "ov-pptx-"));
    const file = path.join(dir, "deck.pptx");
    writeFileSync(file, deck);
    const out = execFileSync(
      "python3",
      [
        "-c",
        [
          "import sys, pptx",
          "p = pptx.Presentation(sys.argv[1])",
          "pics = sum(1 for s in p.slides for sh in s.shapes if sh.shape_type == 13)",
          "print(len(p.slides), pics)",
        ].join("\n"),
        file,
      ],
      { encoding: "utf8" },
    ).trim();
    expect(out).toBe("2 2");
  });

  it("多图一页与文字页都能被 python-pptx 正确读出", () => {
    const deck = buildDeck([
      { images: [{ data: PNG, type: "png" }, { data: PNG, type: "png" }, { data: PNG, type: "png" }, { data: PNG, type: "png" }], title: "四宫格" },
      { bullets: ["第一点", "第二点"], title: "纯文字页" },
    ]);
    expect(deck.subarray(0, 2).toString("latin1")).toBe("PK");
    if (!pythonAvailable()) {
      console.warn("python-pptx 不可用，跳过结构校验");
      return;
    }
    const dir = mkdtempSync(path.join(tmpdir(), "ov-pptx-grid-"));
    const file = path.join(dir, "deck.pptx");
    writeFileSync(file, deck);
    const out = execFileSync(
      "python3",
      [
        "-c",
        [
          "import sys, pptx",
          "p = pptx.Presentation(sys.argv[1])",
          "pics = sum(1 for s in p.slides for sh in s.shapes if sh.shape_type == 13)",
          "texts = sum(1 for s in p.slides for sh in s.shapes if sh.has_text_frame and sh.text_frame.text.strip())",
          "print(len(p.slides), pics, texts)",
        ].join("\n"),
        file,
      ],
      { encoding: "utf8" },
    ).trim();
    // 2 页；第一页 4 张图；文字页有标题 + 两条要点（共 2 个文本框）。
    expect(out).toBe("2 4 3");
  });
});
