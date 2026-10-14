import { describe, expect, it } from "vitest";
import { listShortIdentifiers } from "../list-short-identifiers.mjs";

describe("短绑定列表", () => {
  it("列出绑定位置、类型、引用上下文和导入信息", () => {
    const items = listShortIdentifiers({
      filename: "fixture.jsx",
      source: `import { at as ax } from "./tool.js";
export const Ab = (p) => <div>{p.children}</div>;
function run(x) { return ax(x); }
`,
    });
    expect(items.some((item) => item.name === "ax" && item.kind === "import")).toBe(true);
    expect(items.find((item) => item.name === "ax").import).toEqual({ source: "./tool.js", imported: "at" });
    expect(items.some((item) => item.name === "Ab" && item.kind === "component")).toBe(true);
    expect(items.find((item) => item.name === "Ab").exports).toEqual(["Ab"]);
  });
});
