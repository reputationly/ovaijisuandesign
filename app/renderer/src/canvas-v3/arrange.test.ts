import { describe, expect, it } from "vitest";

import { arrangeCanvasV3SelectionPatch, matchesReferenceSelectionDurationWith } from "./arrange.js";

const node = (id, x, y) => ({ id, kind: "composition", position: { x, y }, size: { width: 100, height: 100 }, zIndex: 0, hidden: false });

describe("arrangeCanvasV3SelectionPatch", () => {
  // a 故意偏离锚点一点点，保证三个节点都会动（没动的节点按设计不进补丁）
  const document = { nodes: { a: node("a", 520, 300), b: node("b", 900, 320), c: node("c", 1200, 340) }, edges: {} };

  it("画布上按选区左上角锚定，dagre 坐标是相对量", () => {
    // dagre 从 0 开始，这里故意整体偏移 (50,20)：最小坐标落到 (50,20)，
    // 相对量仍是 0/200/400，锚点仍是选区左上角。
    const positions = new Map([
      ["a", { x: 50, y: 20 }],
      ["b", { x: 250, y: 20 }],
      ["c", { x: 450, y: 20 }],
    ]);
    const patch = arrangeCanvasV3SelectionPatch(document, ["a", "b", "c"], "horizontal", { positions });
    expect(patch?.type).toBe("canvas.patch");
    // 锚点 = 选区当前最小坐标 (520, 300)。a 正好落在锚点上 → 没动 → **按设计不进补丁**。
    expect(patch.nodes.map((change) => [change.id, change.after.position])).toEqual([
      ["b", { x: 720, y: 300 }],
      ["c", { x: 920, y: 300 }],
    ]);
    // before 必须是原节点，撤销才回得去
    expect(patch.nodes[0].before).toBe(document.nodes.b);
  });

  it("容器内用 origin 当锚点（容器原点 + 内边距），而不是选区左上角", () => {
    const positions = new Map([
      ["a", { x: 0, y: 0 }],
      ["b", { x: 0, y: 150 }],
    ]);
    const patch = arrangeCanvasV3SelectionPatch(document, ["a", "b"], "vertical", { positions, origin: { x: 40, y: 60 } });
    expect(patch.nodes.map((change) => change.after.position)).toEqual([
      { x: 40, y: 60 },
      { x: 40, y: 210 },
    ]);
  });

  it("位置没变就不发补丁；缺 positions / 缺节点都返回 null", () => {
    const same = new Map([
      ["a", { x: 520, y: 300 }],
      ["b", { x: 900, y: 320 }],
    ]);
    expect(arrangeCanvasV3SelectionPatch(document, ["a", "b"], "grid", { positions: same })).toBeNull();
    expect(arrangeCanvasV3SelectionPatch(document, ["a"], "grid", {})).toBeNull();
    expect(arrangeCanvasV3SelectionPatch(document, ["ghost"], "grid", { positions: same })).toBeNull();
  });

  it("重复 id 只出现一次", () => {
    const positions = new Map([
      ["b", { x: 250, y: 20 }],
      ["c", { x: 450, y: 20 }],
    ]);
    // 显式给 origin，避免"落在锚点上的节点本来就没动"这条设计把断言带偏
    const patch = arrangeCanvasV3SelectionPatch(document, ["b", "b", "c"], "horizontal", { positions, origin: { x: 100, y: 100 } });
    expect(patch.nodes).toHaveLength(2);
  });
});

describe("matchesReferenceSelectionDurationWith", () => {
  const crop = (range) => range?.duration ?? 0;

  it("落在容差内算匹配（帧量化 + 1%）", () => {
    expect(matchesReferenceSelectionDurationWith({ duration: 5.0 }, { range: { duration: 5 } }, crop)).toBe(true);
    expect(matchesReferenceSelectionDurationWith({ duration: 5.05 }, { range: { duration: 5 } }, crop)).toBe(true);
  });

  it("差得远就算不匹配（以前恒 false 会一律要求重取）", () => {
    expect(matchesReferenceSelectionDurationWith({ duration: 6 }, { range: { duration: 5 } }, crop)).toBe(false);
    expect(matchesReferenceSelectionDurationWith({ duration: 4 }, { range: { duration: 5 } }, crop)).toBe(false);
  });

  it("时长缺失/为 0 时保守判不匹配", () => {
    expect(matchesReferenceSelectionDurationWith({}, { range: { duration: 5 } }, crop)).toBe(false);
    expect(matchesReferenceSelectionDurationWith({ duration: 5 }, { range: { duration: 0 } }, crop)).toBe(false);
  });
});
