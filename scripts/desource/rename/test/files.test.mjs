import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renameFiles } from "../lib/rename-files.mjs";
import { fixture, put, commitFiles } from "./helpers.mjs";

describe("文件路径改名", () => {
  it("重写静态/动态引用、再导出和 URL 并处理移动的导入方", () => {
    const root = fixture();
    put(root, "app/renderer/src/chat/qs.jsx", "export const Qs = 1;\n");
    put(root, "app/renderer/src/chat/links.jsx", `import { Qs } from "./qs.jsx";
export {} from "./qs.jsx";
const loaded = import("./qs");
const templated = import(\`./qs.jsx\`);
const url = new URL("./qs.jsx", import.meta.url);
const imageUrl = new URL(\`./pixel.png\`, import.meta.url);
console.log(Qs, loaded, templated, url, imageUrl);
`);
    put(root, "app/renderer/src/pages/main.jsx", `import "../chat/qs.jsx";
`);
    put(root, "app/renderer/src/chat/image.jsx", `const image = new URL("./pixel.png", import.meta.url);
`);
    put(root, "app/renderer/src/chat/pixel.png", "pixel");
    put(root, "app/renderer/src/chat/sub/index.jsx", "export {};\n");
    put(root, "app/renderer/src/chat/sub/user.jsx", `import "./";\n`);
    commitFiles(root);
    const result = renameFiles({
      root,
      map: {
        "app/renderer/src/chat/qs.jsx": "app/renderer/src/chat/streamdown.jsx",
        "app/renderer/src/pages/main.jsx": "app/renderer/src/pages/home.jsx",
        "app/renderer/src/chat/image.jsx": "app/renderer/src/pages/image.jsx",
        "app/renderer/src/chat/sub/index.jsx": "app/renderer/src/chat/sub/entry.jsx",
      },
      report: "report.json",
    });
    expect(result.stats.rewrittenReferences).toBeGreaterThanOrEqual(4);
    expect(existsSync(`${root}/app/renderer/src/chat/streamdown.jsx`)).toBe(true);
    expect(existsSync(`${root}/app/renderer/src/pages/home.jsx`)).toBe(true);
    expect(readFileSync(`${root}/app/renderer/src/chat/links.jsx`, "utf8")).toContain("./streamdown");
    expect(readFileSync(`${root}/app/renderer/src/pages/home.jsx`, "utf8")).toContain("../chat/streamdown.jsx");
    expect(readFileSync(`${root}/app/renderer/src/pages/image.jsx`, "utf8")).toContain("../chat/pixel.png");
    expect(readFileSync(`${root}/app/renderer/src/chat/sub/user.jsx`, "utf8")).toContain("./entry.jsx");
  });

  it("发现字符串数组中的旧路径时保证完全不改文件", () => {
    const root = fixture();
    put(root, "app/renderer/src/chat/qs.jsx", "export {};\n");
    const importer = put(root, "app/renderer/src/chat/app.jsx", `const paths = ["./qs.jsx"];\n`);
    commitFiles(root);
    const before = readFileSync(importer, "utf8");
    expect(() => renameFiles({
      root,
      map: { "app/renderer/src/chat/qs.jsx": "app/renderer/src/chat/new.jsx" },
      report: "report.json",
    })).toThrow(/遗漏/);
    expect(readFileSync(importer, "utf8")).toBe(before);
    expect(existsSync(`${root}/app/renderer/src/chat/new.jsx`)).toBe(false);
  });

  it("dry-run 只生成报告且校验文件在 git 中被跟踪", () => {
    const root = fixture();
    put(root, "app/renderer/src/a.jsx", "export {};\n");
    commitFiles(root);
    const result = renameFiles({
      root,
      map: { "app/renderer/src/a.jsx": "app/renderer/src/b.jsx" },
      dryRun: true,
      report: "report.json",
    });
    expect(result.stats.renamedFiles).toBe(1);
    expect(existsSync(`${root}/app/renderer/src/a.jsx`)).toBe(true);
    expect(existsSync(`${root}/app/renderer/src/b.jsx`)).toBe(false);
  });

  it("拒绝映射链和重复目标", () => {
    const root = fixture();
    put(root, "app/renderer/src/a.jsx", "export {};\n");
    put(root, "app/renderer/src/b.jsx", "export {};\n");
    put(root, "app/renderer/src/c.jsx", "export {};\n");
    commitFiles(root);
    expect(() => renameFiles({
      root,
      map: {
        "app/renderer/src/a.jsx": "app/renderer/src/c.jsx",
        "app/renderer/src/c.jsx": "app/renderer/src/d.jsx",
      },
      dryRun: true,
      report: "report.json",
    })).toThrow(/改名链/);
  });
});
