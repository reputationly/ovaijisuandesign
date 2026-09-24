import type { CanvasFile, CanvasNode } from "@ov/protocol";
import { describe, expect, it } from "vitest";

import { stableCanvasHash, textContentHash } from "./canvas-hash.js";
import {
  absolutePosition,
  computeNodeSize,
  findFreePosition,
  placeholderNodeSize,
  resolveDerivedOrFreePosition,
} from "./canvas-geometry.js";

const node = (id: string, x: number, y: number, extra: Partial<CanvasNode> = {}): CanvasNode => ({
  id,
  type: "image",
  positions: { workflow: { x, y } },
  size: { width: 350, height: 350 },
  ...extra,
});
const canvas = (nodes: CanvasNode[], edges: CanvasFile["edges"] = []): CanvasFile => ({ version: 1, mode: "workflow", nodes, edges });

describe("尺寸", () => {
  it("长边缩到 350，每边至少 100", () => {
    expect(computeNodeSize(1920, 1080)).toEqual({ width: 350, height: 197 });
    expect(computeNodeSize(100, 2000)).toEqual({ width: 100, height: 350 });
    expect(computeNodeSize(0, 10)).toBeUndefined();
  });

  it("占位卡：生成中按比例，出错是固定高度", () => {
    expect(placeholderNodeSize("generating", "16:9", "video")).toEqual({ width: 350, height: 197 });
    expect(placeholderNodeSize("generating", undefined, "audio")).toEqual({ width: 350, height: 150 });
    expect(placeholderNodeSize("error", "16:9", "image")).toEqual({ width: 350, height: 216 });
    expect(placeholderNodeSize("pending", "bad", "text")).toEqual({ width: 350, height: 188 });
  });
});

describe("放置", () => {
  it("空画布放原点，否则接在最后一行末尾右边 100", () => {
    expect(findFreePosition(canvas([]), "workflow")).toEqual({ x: 0, y: 0 });
    expect(findFreePosition(canvas([node("a", 0, 0)]), "workflow")).toEqual({ x: 450, y: 0 });
  });

  it("一行满 8 个换行", () => {
    const row = Array.from({ length: 8 }, (_, i) => node(`n${i}`, i * 450, 0));
    expect(findFreePosition(canvas(row), "workflow")).toEqual({ x: 0, y: 450 });
  });

  it("派生：放在来源右边；已有兄弟时接在下面", () => {
    const c = canvas([node("src", 0, 0)]);
    expect(resolveDerivedOrFreePosition(c, "workflow", { width: 350, height: 350 }, ["src"])).toEqual({ x: 450, y: 0 });
    const c2 = canvas([node("src", 0, 0), node("kid", 450, 0)], [{ id: "src->kid", source: "src", target: "kid", type: "derivation" }]);
    expect(resolveDerivedOrFreePosition(c2, "workflow", { width: 350, height: 350 }, ["src"])).toEqual({ x: 450, y: 450 });
  });

  it("子节点的绝对坐标沿父链累加", () => {
    const c = canvas([node("g", 100, 200, { type: "group" }), node("c", 24, 48, { parentId: "g" })]);
    expect(absolutePosition(c, c.nodes[1]!, "workflow")).toEqual({ x: 124, y: 248 });
  });
});

describe("哈希", () => {
  it("稳定哈希与 key 顺序无关", () => {
    expect(stableCanvasHash({ a: 1, b: [{ y: 2, x: 1 }] })).toBe(stableCanvasHash({ b: [{ x: 1, y: 2 }], a: 1 }));
    expect(stableCanvasHash({ a: 1 })).toMatch(/^[0-9a-f]{8}$/);
  });

  it("文本哈希是原始内容的 sha256", () => {
    expect(textContentHash("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
});
