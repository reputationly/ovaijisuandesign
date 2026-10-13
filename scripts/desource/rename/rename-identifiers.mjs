#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renameIdentifiers } from "./lib/rename-identifiers.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDir, "../../..");

function positionalArgument(args, valueOptions) {
  const takesValue = new Set(valueOptions);
  for (let index = 0; index < args.length; index++) {
    if (takesValue.has(args[index])) {
      index++;
      continue;
    }
    if (!args[index].startsWith("--")) return args[index];
  }
  return null;
}

function main() {
  const args = process.argv.slice(2);
  const mapFile = positionalArgument(args, ["--mode", "--report", "--root", "--src"]);
  if (!mapFile) throw new Error("用法：rename-identifiers.mjs map.json [--mode local|export] [--dry-run] [--report <path>] [--root <path>] [--src <path>]");
  const option = (name, fallback) => {
    const index = args.indexOf(name);
    return index < 0 ? fallback : args[index + 1];
  };
  const root = path.resolve(option("--root", defaultRoot));
  const map = JSON.parse(readFileSync(path.resolve(root, mapFile), "utf8"));
  const result = renameIdentifiers({
    root,
    srcDir: option("--src", "app/renderer/src"),
    map,
    mode: option("--mode", "local"),
    dryRun: args.includes("--dry-run"),
    report: option("--report"),
  });
  for (const file of result.files) {
    const changedPositions = file.renames.reduce((sum, item) => sum + (item.positions?.length ?? 0), 0);
    const changedLines = new Set(file.renames.flatMap((item) => (item.positions ?? []).map((position) => position.line))).size;
    console.log(`${file.file}: 改名绑定 ${file.renames.length} 个、改动位置 ${changedPositions} 处、改动行 ${changedLines} 行`);
  }
  console.log(`报告：${path.relative(root, result.reportPath)}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  if (error.reportPath) console.error(`报告：${error.reportPath}`);
  process.exitCode = 1;
}
