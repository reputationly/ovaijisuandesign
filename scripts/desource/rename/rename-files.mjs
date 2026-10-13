#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renameFiles } from "./lib/rename-files.mjs";

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
  const mapFile = positionalArgument(args, ["--report", "--root", "--src"]);
  if (!mapFile) throw new Error("用法：rename-files.mjs map.json [--dry-run] [--report <path>] [--root <path>] [--src <path>]");
  const option = (name, fallback) => {
    const index = args.indexOf(name);
    return index < 0 ? fallback : args[index + 1];
  };
  const root = path.resolve(option("--root", defaultRoot));
  const map = JSON.parse(readFileSync(path.resolve(root, mapFile), "utf8"));
  const result = renameFiles({
    root,
    srcDir: option("--src", "app/renderer/src"),
    map,
    dryRun: args.includes("--dry-run"),
    report: option("--report"),
  });
  console.log(`改名 ${result.stats.renamedFiles} 个文件、改写引用 ${result.stats.rewrittenReferences} 处、涉及文件 ${result.stats.affectedFiles} 个`);
  console.log(`报告：${path.relative(root, result.reportPath)}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
