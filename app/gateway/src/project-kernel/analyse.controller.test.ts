import { describe, expect, it } from "vitest";

/**
 * `POST /api/v3/analyse` 的最小契约：只接受 references，且 reference 必须是
 * resourceId / versionId —— 本地路径不是合法身份（工具 schema 里也写着这句）。
 * 真正的"路径 → 分析"要起网关 + 假平台，这里只钉住解析层，避免又退化成 404/参数错。
 */
import { parseAnalyseBody } from "./analyse.controller.js";

describe("v3 analyse 的请求解析", () => {
  it("接受 versionId / resourceId 并保留每个条目的 question", () => {
    const parsed = parseAnalyseBody({ type: "semantic", references: [{ versionId: "ver_1", question: "画面里有什么" }] });
    expect(parsed.type).toBe("semantic");
    expect(parsed.references).toEqual([{ versionId: "ver_1", question: "画面里有什么" }]);
  });

  it("没有 references 时明确报错", () => {
    expect(() => parseAnalyseBody({ type: "semantic" })).toThrow(/references/);
  });

  it("reference 只给路径（模型的坏习惯）时明确报错", () => {
    expect(() => parseAnalyseBody({ references: [{ path: "/tmp/a.png" }] })).toThrow(/resourceId or versionId/);
  });
});
