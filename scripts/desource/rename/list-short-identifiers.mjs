#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import traverseModule from "@babel/traverse";
import { bindingKey, collectBindings, declarationPosition } from "./lib/bindings.mjs";
import { parse } from "./lib/parse.mjs";

const traverse = [traverseModule, traverseModule?.default, traverseModule?.default?.default]
  .find((candidate) => typeof candidate === "function");

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDir, "../../..");

function classify(info, source) {
  const bindingPath = info.path;
  if (bindingPath.isImportSpecifier() || bindingPath.isImportDefaultSpecifier() ||
    bindingPath.isImportNamespaceSpecifier()) return "import";
  if (bindingPath.findParent((parent) => parent.isCatchClause())) return "catch";
  if (bindingPath.isFunctionDeclaration()) return info.name[0] === info.name[0]?.toUpperCase() ? "component" : "function";
  if (bindingPath.isClassDeclaration() || bindingPath.isClassExpression()) return "class";
  if (bindingPath.isVariableDeclarator()) {
    const initializer = bindingPath.get("init");
    if (initializer?.isClassExpression()) return "class";
    if (initializer?.isArrowFunctionExpression() || initializer?.isFunctionExpression()) {
      let hasJsx = false;
      initializer.traverse({
        JSXElement() {
          hasJsx = true;
        },
        JSXFragment() {
          hasJsx = true;
        },
      });
      if (/^[A-Z]/.test(info.name) && (hasJsx || /^[A-Z]/.test(info.name))) return "component";
      return "function";
    }
    return "variable";
  }
  if (bindingPath.isFunction() && bindingPath.node.params.includes(info.identifier)) return "param";
  if (bindingPath.isIdentifier() && bindingPath.parentPath?.isCatchClause()) return "catch";
  if (bindingPath.parentPath?.isFunction() && bindingPath.listKey === "params") return "param";
  return "variable";
}

function importMetadata(info) {
  let current = info.path;
  while (current && !current.isProgram()) {
    if (current.isImportDeclaration()) {
      const node = info.path.node;
      const imported = node.type === "ImportSpecifier"
        ? node.imported.name ?? node.imported.value
        : node.type === "ImportDefaultSpecifier" ? "default" : "*";
      return { source: current.node.source.value, imported };
    }
    current = current.parentPath;
  }
  return null;
}

function exportedNames(ast, localName) {
  const output = [];
  for (const statement of ast.program.body) {
    if (statement.type !== "ExportNamedDeclaration") continue;
    for (const specifier of statement.specifiers) {
      if (specifier.local?.name === localName) output.push(specifier.exported.name ?? specifier.exported.value);
    }
    const declaration = statement.declaration;
    if (declaration?.id?.name === localName) output.push(localName);
    if (declaration?.type === "VariableDeclaration" && declaration.declarations.some(
      (item) => item.id.type === "Identifier" && item.id.name === localName,
    )) output.push(localName);
  }
  return output;
}

function outerFunctionKey(info, bindings) {
  let scope = info.scope;
  while (scope) {
    if (scope.path.isFunction()) {
      const functionNode = scope.path.node;
      let name = functionNode.id?.name;
      if (!name && scope.path.parentPath?.isVariableDeclarator()) name = scope.path.parentPath.node.id.name;
      if (name) {
        const binding = bindings.find((item) => item.identifier.name === name && item.scope === scope.parent);
        return binding ? bindingKey(binding) : name;
      }
    }
    scope = scope.parent;
  }
  return null;
}

export function listShortIdentifiers({ file, source, filename = file ?? "source.jsx" } = {}) {
  const text = source ?? readFileSync(file, "utf8");
  const ast = parse(text, filename);
  const info = collectBindings(ast, filename);
  const lineText = (line) => text.split("\n")[line - 1] ?? "";
  const matches = info.bindings.filter((binding) => binding.name.length <= 3 || /\$\d/.test(binding.name));
  const keyCounts = new Map();
  for (const binding of matches) {
    const { line } = declarationPosition(binding);
    const compositeKey = `${binding.name}@${line}`;
    keyCounts.set(compositeKey, (keyCounts.get(compositeKey) ?? 0) + 1);
  }
  const items = matches.map((binding) => {
    const position = declarationPosition(binding);
    const key = bindingKey(binding, keyCounts.get(`${binding.name}@${position.line}`) === 1);
    const declaration = lineText(position.line);
    const usages = binding.binding.referencePaths.slice(0, 3).map((reference) => ({
      line: reference.node.loc.start.line,
      context: lineText(reference.node.loc.start.line).trim().slice(0, 160),
    }));
    const metadata = importMetadata(binding);
    return {
      key,
      name: binding.name,
      kind: classify(binding, text),
      outerFunction: outerFunctionKey(binding, info.bindings),
      declarationLine: declaration.trim().slice(0, 160),
      references: binding.binding.referencePaths.length,
      usages,
      ...(metadata ? { import: metadata } : {}),
      ...(exportedNames(ast, binding.name).length
        ? { exports: exportedNames(ast, binding.name) }
        : {}),
    };
  });
  return items;
}

function main() {
  const args = process.argv.slice(2);
  const takesValue = new Set(["--root", "--template"]);
  let fileArg = null;
  for (let index = 0; index < args.length; index++) {
    if (takesValue.has(args[index])) {
      index++;
      continue;
    }
    if (!args[index].startsWith("--")) {
      fileArg = args[index];
      break;
    }
  }
  if (!fileArg) throw new Error("用法：list-short-identifiers.mjs <file> [--json] [--template map.json]");
  const rootIndex = args.indexOf("--root");
  const root = rootIndex >= 0 ? path.resolve(args[rootIndex + 1]) : defaultRoot;
  const file = path.resolve(root, fileArg);
  const items = listShortIdentifiers({ file, filename: file });
  const json = args.includes("--json");
  const templateIndex = args.indexOf("--template");
  if (templateIndex >= 0) {
    const template = { [path.relative(root, file).split(path.sep).join("/")]: Object.fromEntries(items.map((item) => [item.key, ""])) };
    const out = path.resolve(root, args[templateIndex + 1]);
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify(template, null, 2)}\n`);
  }
  if (json) console.log(JSON.stringify(items, null, 2));
  else {
    for (const item of items) {
      console.log(`${item.key} [${item.kind}] refs=${item.references} ${item.declarationLine}`);
      for (const usage of item.usages) console.log(`  ${usage.line}: ${usage.context}`);
    }
    console.log(`共 ${items.length} 个短标识符绑定`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
