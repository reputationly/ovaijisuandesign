import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fixture, put, commitFiles } from "./helpers.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("命令行", () => {
  it("--dry-run 不改文件并写出报告", () => {
    const root = fixture();
    put(root, "app/renderer/src/a.jsx", "export {};\n");
    put(root, "map.json", JSON.stringify({
      "app/renderer/src/a.jsx": "app/renderer/src/b.jsx",
    }));
    commitFiles(root);
    const output = execFileSync("node", [
      path.join(repo, "scripts/desource/rename/rename-files.mjs"),
      "--dry-run",
      "--root",
      root,
      "--report",
      "report.json",
      "map.json",
    ], { encoding: "utf8" });
    expect(output).toContain("改名 1 个文件");
    expect(existsSync(path.join(root, "app/renderer/src/a.jsx"))).toBe(true);
    expect(existsSync(path.join(root, "app/renderer/src/b.jsx"))).toBe(false);
    expect(JSON.parse(readFileSync(path.join(root, "report.json"), "utf8")).stats.renamedFiles).toBe(1);
  });
});
