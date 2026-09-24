import { describe, expect, it } from "vitest";

import { canvasFileSchema, emptyCanvas } from "./canvas.js";
import { detectFileType, fileTypeFromMime, mimeFromPath } from "./media.js";

describe("canvas schema", () => {
  it("不认识的字段往返不丢 —— 每一层都要保住", () => {
    // 照旧 Rust 版 canvas_roundtrip 测试：顶层、节点、边、data 里都挂一个没人认识的字段。
    const raw = {
      version: 1,
      mode: "workflow",
      viewport: { x: 1, y: 2, zoom: 1 },
      nodes: [
        {
          id: "n1",
          type: "image",
          positions: { default: { x: 0, y: 0, z: 9 } },
          data: { popoverDraft: "编辑到一半" },
          selectedByPeer: "u2",
        },
      ],
      edges: [{ id: "e1", source: "n1", target: "n2", type: "default", animated: true }],
    };
    const parsed = canvasFileSchema.parse(raw);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(raw);
  });

  it("缺必填字段时拒绝，而不是悄悄补默认值", () => {
    expect(canvasFileSchema.safeParse({ version: 1, nodes: [], edges: [] }).success).toBe(false);
    expect(
      canvasFileSchema.safeParse({ version: 1, mode: "workflow", nodes: [{ id: "", type: "image", positions: {} }], edges: [] })
        .success,
    ).toBe(false);
  });

  it("空画布本身合法", () => {
    expect(canvasFileSchema.safeParse(emptyCanvas()).success).toBe(true);
  });
});

describe("media types", () => {
  it("扩展名大小写不敏感，没有扩展名算 file", () => {
    expect(detectFileType("A.PNG")).toBe("image");
    expect(detectFileType("clip.MoV")).toBe("video");
    expect(detectFileType("README")).toBe("file");
  });

  it("csv 是 file、srt 不在表里 —— 和旧 Rust 版不同", () => {
    expect(detectFileType("a.csv")).toBe("file");
    expect(detectFileType("a.srt")).toBe("file");
    expect(detectFileType("a.htable")).toBe("file");
  });

  it("mime 优先，认不出再看扩展名", () => {
    expect(fileTypeFromMime("image/png", "x.bin")).toBe("image");
    expect(fileTypeFromMime("application/octet-stream", "x.mp3")).toBe("audio");
    expect(fileTypeFromMime(null, "x.md")).toBe("text");
    expect(mimeFromPath("a/b/C.JPG")).toBe("image/jpeg");
    expect(mimeFromPath("noext")).toBeNull();
  });
});
