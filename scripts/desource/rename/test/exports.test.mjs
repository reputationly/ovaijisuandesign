import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renameIdentifiers } from "../lib/rename-identifiers.mjs";
import { fixture, put } from "./helpers.mjs";

describe("导出名重命名", () => {
  it("更新声明、具名导入、别名、命名空间、受限动态导入和再导出", () => {
    const root = fixture();
    const target = "app/renderer/src/t.jsx";
    put(root, target, "export const Ab = () => <Ab />;\n");
    put(root, "app/renderer/src/a.jsx", `import { Ab } from "./t.jsx";
export const view = <Ab/>;
`);
    put(root, "app/renderer/src/b.jsx", `import { Ab as X } from "./t.jsx";
console.log(X);
`);
    put(root, "app/renderer/src/c.jsx", `import * as ns from "./t.jsx";
console.log(ns.Ab, ns["Ab"]);
`);
    put(root, "app/renderer/src/d.jsx", `import("./t.jsx").then((m) => ({ default: m.Ab }));
`);
    put(root, "app/renderer/src/e.jsx", `export { Ab } from "./t.jsx";
`);

    const result = renameIdentifiers({
      root,
      mode: "export",
      map: { [target]: { Ab: "Panel" } },
      report: "report.json",
    });
    expect(result.files.every((item) => item.equivalence.status === "pass")).toBe(true);
    expect(result.files.flatMap((item) => item.rejected)).toEqual([]);
    expect(readFileSync(`${root}/app/renderer/src/a.jsx`, "utf8")).toContain("import { Panel }");
    expect(readFileSync(`${root}/app/renderer/src/b.jsx`, "utf8")).toContain("import { Panel as X }");
    expect(readFileSync(`${root}/app/renderer/src/c.jsx`, "utf8")).toContain('ns.Panel, ns["Panel"]');
    expect(readFileSync(`${root}/app/renderer/src/d.jsx`, "utf8")).toContain("m.Panel");
    expect(readFileSync(`${root}/app/renderer/src/e.jsx`, "utf8")).toContain("export { Panel as Ab }");
  });

  it("拒绝新导出名冲突及整体传递命名空间", () => {
    const root = fixture();
    put(root, "app/renderer/src/t.jsx", "export const Ab = 1; export const Panel = 2;\n");
    put(root, "app/renderer/src/a.jsx", `import * as ns from "./t.jsx";
consume(ns);
`);
    expect(() => renameIdentifiers({
      root,
      mode: "export",
      map: { "app/renderer/src/t.jsx": { Ab: "Panel" } },
      report: "report.json",
    })).toThrow();
  });

  it("导入方存在绑定冲突时保留本地名并以别名导入", () => {
    const root = fixture();
    put(root, "app/renderer/src/t.jsx", "export const Ab = 1;\n");
    put(root, "app/renderer/src/a.jsx", `import { Ab } from "./t.jsx";
const Panel = 2;
console.log(Ab, Panel);
`);
    const result = renameIdentifiers({
      root,
      mode: "export",
      map: { "app/renderer/src/t.jsx": { Ab: "Panel" } },
      report: "report.json",
    });
    expect(result.warnings.some((item) => item.includes("保留本地名"))).toBe(true);
    expect(readFileSync(`${root}/app/renderer/src/a.jsx`, "utf8")).toContain("import { Panel as Ab }");
  });

  it("改名本地绑定时更新简写导出但保留别名导出", () => {
    const root = fixture();
    const target = "app/renderer/src/t.jsx";
    put(root, target, "const Qs = 1; export { Qs }; export { Qs as Alias };\n");
    put(root, "app/renderer/src/a.jsx", `import { Qs } from "./t.jsx";\nconsole.log(Qs);\n`);
    const result = renameIdentifiers({
      root,
      mode: "export",
      map: { [target]: { Qs: "Panel" } },
      report: "report.json",
    });
    expect(result.files.every((item) => item.equivalence.status === "pass")).toBe(true);
    expect(readFileSync(`${root}/${target}`, "utf8")).toContain(
      "const Panel = 1; export { Panel }; export { Panel as Alias };",
    );
    expect(readFileSync(`${root}/app/renderer/src/a.jsx`, "utf8")).toContain("import { Panel }");
  });
});
