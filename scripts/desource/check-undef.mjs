import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
let repo = path.resolve(scriptDir, "../..");
let baseRef = "441a06b";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--base") {
    if (!args[i + 1]) throw new Error("--base requires a git ref");
    baseRef = args[++i];
  } else {
    repo = path.resolve(args[i]);
  }
}
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

function objectLiteral(node) {
  while (node?.type === "AssignmentExpression") node = node.right;
  return node?.type === "ObjectExpression" ? node : null;
}

function objectPropertyName(property) {
  if (property.type === "SpreadElement") return null;
  if (!property.computed && property.key.type === "Identifier") return property.key.name;
  if (property.key.type === "StringLiteral" || property.key.type === "NumericLiteral") {
    return String(property.key.value);
  }
  return null;
}

function memberPropertyName(member) {
  if (!member.computed && member.property.type === "Identifier") return member.property.name;
  if (member.computed && (member.property.type === "StringLiteral" || member.property.type === "NumericLiteral")) {
    return String(member.property.value);
  }
  return null;
}

function prototypeTarget(node) {
  if (
    node?.type === "MemberExpression" &&
    !node.computed &&
    node.property.type === "Identifier" &&
    node.property.name === "prototype" &&
    node.object.type === "Identifier"
  ) return node.object.name;
  return null;
}

function prototypeMutations(ast) {
  const mutations = [];
  for (const statement of ast.program.body) {
    if (statement.type !== "ExpressionStatement") continue;
    const expression = statement.expression;
    if (expression.type === "AssignmentExpression" && expression.left.type === "MemberExpression") {
      const target = prototypeTarget(expression.left.object);
      const key = memberPropertyName(expression.left);
      if (target && key !== null) mutations.push({ target, key, line: statement.loc.start.line });
      continue;
    }
    if (
      expression.type !== "CallExpression" ||
      expression.callee.type !== "MemberExpression" ||
      expression.callee.object.type !== "Identifier" ||
      expression.callee.object.name !== "Object"
    ) continue;
    const method = memberPropertyName(expression.callee);
    const target = prototypeTarget(expression.arguments[0]);
    if (!target) continue;
    if (method === "assign") {
      const value = expression.arguments[1];
      if (value?.type === "ObjectExpression") {
        for (const property of value.properties) {
          const key = objectPropertyName(property);
          mutations.push({ target, key: key ?? "*", line: statement.loc.start.line });
        }
      } else {
        mutations.push({ target, key: "*", line: statement.loc.start.line });
      }
    } else if (method === "defineProperty") {
      const keyNode = expression.arguments[1];
      const key = keyNode?.type === "StringLiteral" ? keyNode.value : "*";
      mutations.push({ target, key: String(key), line: statement.loc.start.line });
    }
  }
  return mutations;
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
  const objectBindings = new Map();
  const mutatedBindings = new Set();
  const assignedProperties = new Map();

  traverse(ast, {
    VariableDeclarator(declaratorPath) {
      const id = declaratorPath.node.id;
      if (id.type !== "Identifier") return;
      const literal = objectLiteral(declaratorPath.node.init);
      if (!literal) return;
      const binding = declaratorPath.scope.getBinding(id.name);
      if (!binding) return;
      const keys = new Set();
      let unknownKeys = false;
      for (const property of literal.properties) {
        const key = objectPropertyName(property);
        if (key === null) unknownKeys = true;
        else keys.add(key);
      }
      objectBindings.set(binding.identifier, { keys, unknownKeys });
    },
  });

  const bindingFor = (node, scope) =>
    node?.type === "Identifier" ? scope.getBinding(node.name)?.identifier : null;
  const noteWrite = (memberPath) => {
    const member = memberPath.node;
    const base = bindingFor(member.object, memberPath.scope);
    if (!base || !objectBindings.has(base)) return;
    const key = memberPropertyName(member);
    if (key === null) {
      mutatedBindings.add(base);
      return;
    }
    if (!assignedProperties.has(base)) assignedProperties.set(base, new Set());
    assignedProperties.get(base).add(key);
  };

  traverse(ast, {
    AssignmentExpression(assignmentPath) {
      const left = assignmentPath.get("left");
      if (left.isIdentifier()) {
        const binding = bindingFor(left.node, left.scope);
        if (binding && objectBindings.has(binding)) mutatedBindings.add(binding);
      } else if (left.isMemberExpression() || left.isOptionalMemberExpression()) {
        noteWrite(left);
      }
    },
    UpdateExpression(updatePath) {
      const argument = updatePath.get("argument");
      if (argument.isMemberExpression() || argument.isOptionalMemberExpression()) noteWrite(argument);
    },
    CallExpression(callPath) {
      const callee = callPath.node.callee;
      if (
        callee.type !== "MemberExpression" ||
        callee.object.type !== "Identifier" ||
        callee.object.name !== "Object" ||
        !["assign", "defineProperty", "defineProperties"].includes(memberPropertyName(callee))
      ) return;
      const target = bindingFor(callPath.node.arguments[0], callPath.scope);
      if (target && objectBindings.has(target)) mutatedBindings.add(target);
    },
  });

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
    MemberExpression(memberPath) {
      const member = memberPath.node;
      if (
        memberPath.parentPath.isBinaryExpression() &&
        ["===", "!==", "==", "!="].includes(memberPath.parentPath.node.operator)
      ) return;
      if (
        (memberPath.parentPath.isAssignmentExpression() && memberPath.parentPath.get("left") === memberPath) ||
        (memberPath.parentPath.isUpdateExpression() && memberPath.parentPath.get("argument") === memberPath) ||
        memberPath.parentPath.isUnaryExpression({ operator: "delete" })
      ) return;
      const binding = bindingFor(member.object, memberPath.scope);
      const object = objectBindings.get(binding);
      const key = memberPropertyName(member);
      if (
        !object ||
        object.unknownKeys ||
        key === null ||
        object.keys.has(key) ||
        mutatedBindings.has(binding) ||
        assignedProperties.get(binding)?.has(key) ||
        Object.prototype.hasOwnProperty.call(Object.prototype, key)
      ) return;
      const position = member.property.loc.start;
      findings.push(
        `${path.relative(repo, file)}:${position.line}:${position.column + 1} [missing object property] ${member.object.name}.${key}`,
      );
    },
    OptionalMemberExpression(memberPath) {
      const member = memberPath.node;
      if (
        memberPath.parentPath.isBinaryExpression() &&
        ["===", "!==", "==", "!="].includes(memberPath.parentPath.node.operator)
      ) return;
      const binding = bindingFor(member.object, memberPath.scope);
      const object = objectBindings.get(binding);
      const key = memberPropertyName(member);
      if (
        !object ||
        object.unknownKeys ||
        key === null ||
        object.keys.has(key) ||
        mutatedBindings.has(binding) ||
        assignedProperties.get(binding)?.has(key) ||
        Object.prototype.hasOwnProperty.call(Object.prototype, key)
      ) return;
      const position = member.property.loc.start;
      findings.push(
        `${path.relative(repo, file)}:${position.line}:${position.column + 1} [missing object property] ${member.object.name}.${key}`,
      );
    },
  });
}

const baseVendor = execFileSync(
  "git",
  ["-C", repo, "show", `${baseRef}:app/renderer/src/vendor.js`],
  { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
);
const baseAst = parser.parse(baseVendor, {
  allowReturnOutsideFunction: true,
  plugins: ["jsx", "decorators-legacy"],
  sourceType: "unambiguous",
});
const baseMutations = prototypeMutations(baseAst);
const currentMutations = new Set();
const currentDefinitions = new Set();
for (const ast of asts.values()) {
  if (!ast) continue;
  for (const { target, key } of prototypeMutations(ast)) {
    currentMutations.add(`${target}.prototype.${key}`);
  }
  for (const item of ast.program.body) {
    const declaration =
      item.type === "ExportNamedDeclaration" || item.type === "ExportDefaultDeclaration"
        ? item.declaration
        : item;
    if (!declaration) continue;
    if (
      (declaration.type === "FunctionDeclaration" || declaration.type === "ClassDeclaration") &&
      declaration.id
    ) currentDefinitions.add(declaration.id.name);
    if (declaration.type === "VariableDeclaration") {
      for (const declarator of declaration.declarations) collectPatternNames(declarator.id, currentDefinitions);
    }
  }
}
for (const { target, key, line } of baseMutations) {
  if (!currentDefinitions.has(target) || currentMutations.has(`${target}.prototype.${key}`)) continue;
  findings.push(
    `app/renderer/src/vendor.js:${line} [missing prototype mutation] ${target}.prototype.${key} (base ${baseRef})`,
  );
}

if (findings.length) {
  console.error(findings.join("\n"));
  console.error(`Found ${findings.length} unresolved-name, local-export, missing-object-property, or missing-prototype-mutation issue(s).`);
  process.exitCode = 1;
} else {
  console.log(`Checked ${files.length} renderer source files; no unresolved names, local export mismatches, missing object properties, or missing prototype mutations (base ${baseRef}).`);
}
