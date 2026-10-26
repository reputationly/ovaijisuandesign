import { describe, expect, it } from "vitest";

import { v3ToolMaterials } from "./v3-tool-materials.js";

describe("v3ToolMaterials", () => {
  it("不是 design_ 工具就什么都不报", () => {
    expect(v3ToolMaterials("hub_generate_image", "input", { prompt: "x" })).toEqual([]);
  });

  it("入参：references 里的 resourceId/versionId/path 都算素材", () => {
    const materials = v3ToolMaterials("design_execute", "input", {
      capabilityId: "generate_image:x",
      references: [
        { resourceId: "res_1", versionId: "ver_1", role: "source" },
        { path: "/w/ref.png", role: "source" },
        { availability: "missing", resourceId: "res_gone" },
      ],
    });
    // `material()` 按参照的顺序取**第一个**命中的键：versionId > artifactId > path > url。
    expect(materials).toEqual([{ versionId: "ver_1" }, { path: "/w/ref.png" }]);
  });

  it("产出：从 structuredContent 里取 outputs，失败项跳过", () => {
    const materials = v3ToolMaterials("design_execute", "output", {
      structuredContent: {
        task: { outputs: [{ resourceId: "res_a", versionId: "ver_a", availability: "available", disposition: "adopted" }, { resourceId: "res_b", error: "boom" }] },
      },
    });
    expect(materials).toEqual([{ versionId: "ver_a" }]);
  });

  it("产出：content 文本里是 JSON 时也能解开；不是 JSON 就不报", () => {
    const ok = v3ToolMaterials("design_deliver", "output", { content: [{ type: "text", text: JSON.stringify({ delivery: { outputs: [{ versionId: "ver_x" }] } }) }] });
    expect(ok).toEqual([{ versionId: "ver_x" }]);
    expect(v3ToolMaterials("design_deliver", "output", { content: [{ type: "text", text: "not json" }] })).toEqual([]);
  });

  it("结果带 isError 就不报（失败的调用没有素材归属）", () => {
    expect(v3ToolMaterials("design_execute", "output", { isError: true, structuredContent: { task: { outputs: [{ resourceId: "r" }] } } })).toEqual([]);
  });

  it("resource_get 的 resourceIds/versionIds 逐项转成素材；去重", () => {
    const materials = v3ToolMaterials("design_resource_get", "input", {
      resourceIds: ["res_1", "res_2"],
      versionIds: ["ver_1"],
    });
    // 字段顺序按参照的 inputFields 表：`""`（整条）→ versionIds → resourceIds。
    expect(materials).toEqual([{ versionId: "ver_1" }, { resourceId: "res_1" }, { resourceId: "res_2" }]);
  });
});
