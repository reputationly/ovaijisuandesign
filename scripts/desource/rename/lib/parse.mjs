import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as babelParse } from "@babel/parser";

export const extensions = [".js", ".jsx", ".mjs"];
export const skippedFile = (file) =>
  /^pdf\.worker\.min-.*\.mjs$/.test(path.basename(file)) ||
  /^wasm-.*\.js$/.test(path.basename(file));

export function parse(source, sourceFilename = "source.jsx") {
  return babelParse(source, {
    plugins: ["jsx", "decorators-legacy"],
    sourceFilename,
    sourceType: "module",
  });
}

export function walkSourceFiles(root, srcDir = "app/renderer/src") {
  const srcRoot = path.resolve(root, srcDir);
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap((entry) => {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(file);
        return entry.isFile() && extensions.includes(path.extname(file)) && !skippedFile(file)
          ? [file]
          : [];
      });
  return walk(srcRoot);
}

export function resolveLocalFile(root, srcDir, specifier, importer, files) {
  if (!specifier.startsWith(".")) return null;
  const srcRoot = path.resolve(root, srcDir);
  const importerPath = path.isAbsolute(importer) ? importer : path.resolve(root, importer);
  const base = path.resolve(path.dirname(importerPath), specifier);
  if (base !== srcRoot && !base.startsWith(`${srcRoot}${path.sep}`)) return null;
  const extension = path.extname(base);
  if (extension && !extensions.includes(extension)) return null;
  const candidates = extension
    ? [base]
    : [
        ...extensions.map((item) => `${base}${item}`),
        ...extensions.map((item) => path.join(base, `index${item}`)),
      ];
  return candidates.find((candidate) => {
    if (skippedFile(candidate)) return false;
    if (files) return files.has(candidate);
    return existsSync(candidate) && statSync(candidate).isFile();
  }) ?? null;
}

export function readSourceFiles(root, srcDir = "app/renderer/src") {
  return new Map(
    walkSourceFiles(root, srcDir).map((file) => [file, readFileSync(file, "utf8")]),
  );
}

export function toRepoPath(root, file) {
  return path.relative(root, file).split(path.sep).join("/");
}

export function toPosix(file) {
  return file.split(path.sep).join("/");
}
