import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(process.argv[2] ?? path.join(scriptDir, "../.."));
const srcRoot = path.join(repo, "app/renderer/src");
const require = createRequire(path.join(scriptDir, "../decompile/package.json"));
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const globals = require("globals");
const allowedGlobals = new Set(
  ["browser", "worker", "es2024"].flatMap((name) => Object.keys(globals[name] ?? {})),
);
allowedGlobals.add("WebKitCSSMatrix");
const projectGlobals = new Set(["__HILO_AUTH__", "hilo"]);
const bundledRuntimeGlobals = new Set([
  ...Object.keys(globals.node ?? {}),
  ...Object.keys(globals.bunBuiltin ?? {}),
  ...Object.keys(globals.denoBuiltin ?? {}),
  ...Object.keys(globals.es2026 ?? {}),
  "SuppressedError",
]);
const extensions = [".js", ".jsx", ".mjs"];
const skippedFile = (file) =>
  /^pdf\.worker\.min-.*\.mjs$/.test(path.basename(file)) ||
  /^wasm-.*\.js$/.test(path.basename(file));

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .flatMap((entry) => {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(file);
      return entry.isFile() && extensions.includes(path.extname(file)) && !skippedFile(file)
        ? [file]
        : [];
    });
}

function resolveLocalFile(specifier, importer) {
  if (!specifier.startsWith(".") && !path.isAbsolute(specifier)) return null;
  const base = path.resolve(path.dirname(importer), specifier);
  if (base !== srcRoot && !base.startsWith(`${srcRoot}${path.sep}`)) return null;
  const extension = path.extname(base);
  if (extension && !extensions.includes(extension)) return null;
  const candidates = extension
    ? [base]
    : [...extensions.map((item) => `${base}${item}`), ...extensions.map((item) => path.join(base, `index${item}`))];
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile() && !skippedFile(candidate)) ?? null;
}

function exportedName(node) {
  return node.name ?? node.value;
}

function collectPatternNames(pattern, names) {
  if (!pattern) return;
  if (pattern.type === "Identifier") names.add(pattern.name);
  else if (pattern.type === "RestElement") collectPatternNames(pattern.argument, names);
  else if (pattern.type === "AssignmentPattern") collectPatternNames(pattern.left, names);
  else if (pattern.type === "ArrayPattern") {
    for (const element of pattern.elements) collectPatternNames(element, names);
  } else if (pattern.type === "ObjectPattern") {
    for (const property of pattern.properties) {
      collectPatternNames(property.type === "RestElement" ? property.argument : property.value, names);
    }
  }
}

const files = walk(srcRoot);
const asts = new Map();
const findings = [];

for (const file of files) {
  try {
    asts.set(
      file,
      parser.parse(readFileSync(file, "utf8"), {
        allowReturnOutsideFunction: true,
        plugins: ["jsx", "decorators-legacy"],
        sourceFilename: file,
        sourceType: "unambiguous",
      }),
    );
  } catch (error) {
    const position = error.loc ? `${error.loc.line}:${error.loc.column + 1}` : "1:1";
    findings.push(`${path.relative(repo, file)}:${position} [parse] ${error.message}`);
  }
}

const exportCache = new Map();
const resolvingExports = new Set();

function exportsFor(file) {
  if (exportCache.has(file)) return exportCache.get(file);
  if (resolvingExports.has(file)) return new Set();
  const ast = asts.get(file);
  if (!ast) return new Set();

  resolvingExports.add(file);
  const names = new Set();
  traverse(ast, {
    ExportAllDeclaration(exportPath) {
      const node = exportPath.node;
      if (node.exported) {
        names.add(exportedName(node.exported));
        return;
      }
      const target = resolveLocalFile(node.source.value, file);
      if (target) for (const name of exportsFor(target)) if (name !== "default") names.add(name);
    },
    ExportDefaultDeclaration() {
      names.add("default");
    },
    ExportNamedDeclaration(exportPath) {
      const node = exportPath.node;
      if (node.declaration) {
        const declaration = node.declaration;
        if ((declaration.type === "FunctionDeclaration" || declaration.type === "ClassDeclaration") && declaration.id) {
          names.add(declaration.id.name);
        } else if (declaration.type === "VariableDeclaration") {
          for (const item of declaration.declarations) collectPatternNames(item.id, names);
        }
      }
      for (const specifier of node.specifiers) names.add(exportedName(specifier.exported));
    },
  });
  resolvingExports.delete(file);
  exportCache.set(file, names);
  return names;
}

for (const file of files) {
  const ast = asts.get(file);
  if (!ast) continue;
  const relativeFile = path.relative(srcRoot, file);
  const bundledModule = relativeFile === "vendor.js" || relativeFile.startsWith(`vendor-inline${path.sep}`);
  traverse(ast, {
    ImportDeclaration(importPath) {
      const node = importPath.node;
      const target = resolveLocalFile(node.source.value, file);
      if (!target) return;
      const exports = exportsFor(target);
      for (const specifier of node.specifiers) {
        if (specifier.type !== "ImportSpecifier") continue;
        const name = exportedName(specifier.imported);
        if (!exports.has(name)) {
          const position = specifier.loc?.start ?? node.loc.start;
          findings.push(
            `${path.relative(repo, file)}:${position.line}:${position.column + 1} [missing export] ${node.source.value} does not export ${name}`,
          );
        }
      }
    },
    ReferencedIdentifier(identifierPath) {
      const name = identifierPath.node.name;
      if (identifierPath.scope.getBinding(name) || allowedGlobals.has(name) || projectGlobals.has(name)) return;
      if (name === "arguments") {
        let functionPath = identifierPath.getFunctionParent();
        while (functionPath?.isArrowFunctionExpression()) {
          functionPath = functionPath.findParent((parent) => parent.isFunction());
        }
        if (functionPath) return;
      }
      if (bundledModule && bundledRuntimeGlobals.has(name)) return;
      const position = identifierPath.node.loc.start;
      findings.push(
        `${path.relative(repo, file)}:${position.line}:${position.column + 1} [unbound] ${name}`,
      );
    },
  });
}

if (findings.length) {
  console.error(findings.join("\n"));
  console.error(`Found ${findings.length} unresolved-name or local-export issue(s).`);
  process.exitCode = 1;
} else {
  console.log(`Checked ${files.length} renderer source files; no unresolved names or local export mismatches.`);
}
