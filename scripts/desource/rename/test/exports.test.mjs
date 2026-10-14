import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renameIdentifiers } from "../lib/rename-identifiers.mjs";
import { fixture, keyFor, put } from "./helpers.mjs";

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

  it("本地导入名改为 imported 名时收成简写", () => {
    const root = fixture();
    const relative = "app/renderer/src/a.jsx";
    const source = `import { value as localValue } from "./t.jsx";
console.log(localValue);
`;
    put(root, relative, source);
    const result = renameIdentifiers({
      root,
      map: { [relative]: { [keyFor(source, "localValue")]: "value" } },
      report: "report.json",
    });
    expect(result.files[0].equivalence.status).toBe("pass");
    expect(readFileSync(`${root}/${relative}`, "utf8")).toContain("import { value }");
  });

  it("本地导出名改为 exported 名时收成简写", () => {
    const root = fixture();
    const relative = "app/renderer/src/a.jsx";
    const source = "const localValue = 1; export { localValue as value };\n";
    put(root, relative, source);
    const result = renameIdentifiers({
      root,
      map: { [relative]: { [keyFor(source, "localValue")]: "value" } },
      report: "report.json",
    });
    expect(result.files[0].equivalence.status).toBe("pass");
    expect(readFileSync(`${root}/${relative}`, "utf8")).toContain("export { value }");
  });

  it("同一文件里连续改多个再导出时按当前文本定位", () => {
    const root = fixture();
    const target = "app/renderer/src/t.jsx";
    put(root, target, `export { Bitstream as Bitstream2 } from "mediabunny";
export var TableView2 = class {};
export { WidgetType as WidgetType2 } from "codemirror";
`);
    const result = renameIdentifiers({
      root,
      mode: "export",
      map: {
        [target]: {
          Bitstream2: "Bitstream",
          TableView2: "TableView",
          WidgetType2: "WidgetType",
        },
      },
      report: "report.json",
    });
    expect(result.files.every((item) => item.equivalence.status === "pass")).toBe(true);
    expect(result.files.flatMap((item) => item.rejected)).toEqual([]);
    const next = readFileSync(`${root}/${target}`, "utf8");
    expect(next).toContain("export { Bitstream as Bitstream }");
    expect(next).toContain("export var TableView = class {}");
    expect(next).toContain("export { WidgetType as WidgetType }");
  });

  it("后改同一文件的导出时保留先前的导入改名", () => {
    const root = fixture();
    put(root, "app/renderer/src/lib.jsx", "export const Event$1 = 1;\n");
    put(root, "app/renderer/src/app.jsx", `import { Event$1 as eventApi } from "./lib.jsx";
export const TUTORIAL_URL$2 = 2;
console.log(eventApi, TUTORIAL_URL$2);
`);
    const result = renameIdentifiers({
      root,
      mode: "export",
      map: {
        "app/renderer/src/lib.jsx": { Event$1: "VSCodeEvent" },
        "app/renderer/src/app.jsx": { TUTORIAL_URL$2: "TUTORIAL_URL_BY_REGION" },
      },
      report: "report.json",
    });
    expect(result.files.every((item) => item.equivalence.status === "pass")).toBe(true);
    expect(result.files.flatMap((item) => item.rejected)).toEqual([]);
    const next = readFileSync(`${root}/app/renderer/src/app.jsx`, "utf8");
    expect(next).toContain("import { VSCodeEvent as eventApi }");
    expect(next).toContain("export const TUTORIAL_URL_BY_REGION = 2");
    expect(next).not.toContain("Event$1");
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
