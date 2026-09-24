import { describe, expect, it } from "vitest";

import { applyTextEdits } from "./text-edits.js";

describe("applyTextEdits", () => {
  const doc = "第一场：白天。\n第二场：夜晚。\n第三场：白天。\n";

  it("唯一匹配直接改，并给出反向定位信息", () => {
    const r = applyTextEdits(doc, [{ annotationId: "a", exact: "夜晚", replacement: "黄昏" }]);
    expect(r.ok).toBe(true);
    expect(r.content).toBe("第一场：白天。\n第二场：黄昏。\n第三场：白天。\n");
    expect(r.applied[0]).toMatchObject({ originalText: "夜晚", replacement: "黄昏", startLine: 2 });
  });

  it("多处匹配又没给 occurrence：ambiguous，整批不改", () => {
    const r = applyTextEdits(doc, [
      { annotationId: "a", exact: "夜晚", replacement: "黄昏" },
      { annotationId: "b", exact: "白天", replacement: "清晨" },
    ]);
    expect(r.ok).toBe(false);
    expect(r.content).toBe(doc);
    expect(r.results.find((x) => x.annotationId === "b")).toMatchObject({ reason: "ambiguous" });
    // 本来能成的那条也标成冲突 —— 调用方要看到"这批一条都没落地"。
    expect(r.results.find((x) => x.annotationId === "a")?.status).toBe("conflict");
  });

  it("prefix / occurrence 消歧", () => {
    expect(applyTextEdits(doc, [{ annotationId: "a", prefix: "第三场：", exact: "白天", replacement: "清晨" }]).content).toContain("第三场：清晨");
    expect(applyTextEdits(doc, [{ annotationId: "a", exact: "白天", occurrence: 1, replacement: "清晨" }]).content).toContain("第三场：清晨");
  });

  it("找不到时给最接近的行", () => {
    const r = applyTextEdits(doc, [{ annotationId: "a", exact: "第二场：凌晨", replacement: "x" }]);
    expect(r.results[0]).toMatchObject({ reason: "not_found" });
    expect(r.results[0]!.nearest?.[0]?.line).toBe(2);
  });

  it("重叠和重复 id 都算冲突", () => {
    expect(
      applyTextEdits(doc, [
        { annotationId: "a", exact: "第二场：夜", replacement: "x" },
        { annotationId: "b", exact: "夜晚", replacement: "y" },
      ]).results[1],
    ).toMatchObject({ reason: "overlap" });
    expect(
      applyTextEdits(doc, [
        { annotationId: "a", exact: "夜晚", replacement: "x" },
        { annotationId: "a", exact: "第一场", replacement: "y" },
      ]).results[1],
    ).toMatchObject({ reason: "duplicate_id" });
  });

  it("多条修改的新位置按替换后的文本算", () => {
    const r = applyTextEdits("aaa bbb ccc", [
      { annotationId: "1", exact: "aaa", replacement: "A" },
      { annotationId: "2", exact: "ccc", replacement: "CCCCC" },
    ]);
    expect(r.content).toBe("A bbb CCCCC");
    expect(r.applied.map((a) => [a.newStart, a.newEnd])).toEqual([
      [0, 1],
      [6, 11],
    ]);
  });
});
