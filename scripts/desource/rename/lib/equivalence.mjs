import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import traverseModule from "@babel/traverse";
import * as t from "@babel/types";
import { collectBindings } from "./bindings.mjs";
import { parse } from "./parse.mjs";

const traverse = [traverseModule, traverseModule?.default, traverseModule?.default?.default]
  .find((candidate) => typeof candidate === "function");
const strippedKeys = new Set(["start", "end", "loc", "range"]);
const exportedName = (node) => node?.name ?? node?.value;
const digest = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function setExternalRename(externalRenames, start, name, role) {
  externalRenames.set(start, name);
  if (role) {
    externalRenames.roles ??= new Map();
    externalRenames.roles.set(start, role);
  }
}

function normalizeAst(ast, bindingInfo, externalRenames = new Map()) {
  const orderedBindings = [...bindingInfo.bindings].sort(
    (a, b) => a.identifier.start - b.identifier.start,
  );
  const bindingIds = new Map(orderedBindings.map((binding, index) => [binding, `#${index}`]));

  const externalNode = (parent, key, grandparent, role) => {
    if (parent?.type === "ExportSpecifier") {
      const expectedRole = role ?? (grandparent?.source ? "local" : "exported");
      return key === expectedRole;
    }
    return (parent?.type === "ImportSpecifier" && key === "imported") ||
      ((parent?.type === "MemberExpression" || parent?.type === "OptionalMemberExpression") && key === "property");
  };
  const visit = (value, parent = null, parentKey = null, grandparent = null) => {
    if (Array.isArray(value)) return value.map((item) => visit(item, parent, parentKey, grandparent));
    if (!value || typeof value !== "object") return value;
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      if (strippedKeys.has(key)) continue;
      if (key === "extra" && item && typeof item === "object") {
        const extra = Object.fromEntries(
          Object.entries(item).filter(([extraKey]) =>
            extraKey !== "parenStart" &&
            !(value.type === "ObjectProperty" && extraKey === "shorthand"),
          ),
        );
        if (value.type === "StringLiteral" && externalRenames.has(value.start)) {
          const externalName = externalRenames.get(value.start);
          if (typeof extra.raw === "string" && extra.raw.length >= 2) {
            extra.raw = `${extra.raw[0]}${externalName}${extra.raw.at(-1)}`;
          }
          if ("rawValue" in extra) extra.rawValue = externalName;
        }
        if (Object.keys(extra).length) result[key] = visit(extra, value, key, parent);
        continue;
      }
      if (value.type === "ObjectProperty" && key === "shorthand") continue;
      if (
        key === "name" &&
        (value.type === "Identifier" || value.type === "JSXIdentifier")
      ) {
        if (parent?.type === "ObjectProperty" && parent.shorthand && parentKey === "key") {
          result[key] = value.name;
          continue;
        }
        const binding = bindingInfo.nodeToBinding.get(value);
        if (binding) {
          result[key] = bindingIds.get(binding);
          continue;
        }
        const role = externalRenames.roles?.get(value.start);
        if (externalNode(parent, parentKey, grandparent, role) && externalRenames.has(value.start)) {
          result[key] = externalRenames.get(value.start);
          continue;
        }
      }
      if (
        value.type === "StringLiteral" &&
        key === "value" &&
        externalNode(parent, parentKey, grandparent, externalRenames.roles?.get(value.start)) &&
        externalRenames.has(value.start)
      ) {
        result[key] = externalRenames.get(value.start);
        continue;
      }
      result[key] = visit(item, value, key, parent);
    }
    return result;
  };

  return visit(ast);
}

export function normalize(source, { externalRenames = new Map(), filename } = {}) {
  const ast = parse(source, filename);
  const bindingInfo = collectBindings(ast, filename);
  return {
    normalized: normalizeAst(ast, bindingInfo, externalRenames),
    bindings: bindingInfo.bindings.length,
    bindingInfo,
  };
}

function sorted(values) {
  return values.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

export function externalNames(source, filename = "source.jsx") {
  const ast = parse(source, filename);
  const names = {
    exports: [],
    imports: [],
    freeReferences: [],
    propertyNames: [],
    jsxTags: [],
  };
  const bindingInfo = collectBindings(ast, filename);
  for (const statement of ast.program.body) {
    if (statement.type === "ExportNamedDeclaration") {
      for (const specifier of statement.specifiers) {
        names.exports.push(exportedName(specifier.exported));
      }
      if (statement.declaration) {
        const declaration = statement.declaration;
        if (declaration.id?.name) names.exports.push(declaration.id.name);
        if (declaration.type === "VariableDeclaration") {
          for (const item of declaration.declarations) {
            if (item.id.type === "Identifier") names.exports.push(item.id.name);
          }
        }
      }
    } else if (statement.type === "ExportDefaultDeclaration") {
      names.exports.push("default");
    }
  }
  traverse(ast, {
    ImportDeclaration(importPath) {
      for (const specifier of importPath.node.specifiers) {
        const imported = specifier.type === "ImportNamespaceSpecifier"
          ? "*"
          : specifier.type === "ImportDefaultSpecifier"
            ? "default"
            : exportedName(specifier.imported);
        names.imports.push([importPath.node.source.value, imported]);
      }
    },
    MemberExpression(memberPath) {
      const property = memberPath.node.property;
      if (!memberPath.node.computed && property.type === "Identifier") {
        names.propertyNames.push(property.name);
      } else if (memberPath.node.computed && property.type === "StringLiteral") {
        names.propertyNames.push(property.value);
      }
    },
    ObjectProperty(propertyPath) {
      const { node } = propertyPath;
      if (!node.computed && node.key.type === "Identifier") names.propertyNames.push(node.key.name);
      else if (node.key.type === "StringLiteral") names.propertyNames.push(node.key.value);
    },
    ObjectMethod(methodPath) {
      const { node } = methodPath;
      if (!node.computed && node.key.type === "Identifier") names.propertyNames.push(node.key.name);
      else if (node.key.type === "StringLiteral") names.propertyNames.push(node.key.value);
    },
    ClassMethod(methodPath) {
      const { node } = methodPath;
      if (!node.computed && node.key.type === "Identifier") names.propertyNames.push(node.key.name);
      else if (node.key.type === "StringLiteral") names.propertyNames.push(node.key.value);
    },
    ClassProperty(propertyPath) {
      const { node } = propertyPath;
      if (!node.computed && node.key.type === "Identifier") names.propertyNames.push(node.key.name);
      else if (node.key.type === "StringLiteral") names.propertyNames.push(node.key.value);
    },
    JSXOpeningElement(openingPath) {
      const name = openingPath.node.name;
      if (name.type === "JSXIdentifier" && t.react.isCompatTag(name.name)) {
        names.jsxTags.push(name.name);
      }
    },
  });
  names.freeReferences = bindingInfo.freeReferences.map((path) => path.node.name);
  for (const key of Object.keys(names)) names[key] = sorted(names[key]);
  return names;
}

export function externalNamesDiff(before, after) {
  const left = externalNames(before);
  const right = externalNames(after);
  return Object.fromEntries(
    Object.keys(left)
      .filter((key) => !isDeepStrictEqual(left[key], right[key]))
      .map((key) => [key, { before: left[key], after: right[key] }]),
  );
}

export function checkEquivalence(before, after, { externalRenames = new Map(), filename } = {}) {
  const beforeResult = normalize(before, { externalRenames, filename });
  const afterResult = normalize(after, { filename });
  const same = isDeepStrictEqual(beforeResult.normalized, afterResult.normalized);
  return {
    status: same ? "pass" : "fail",
    bindings: beforeResult.bindings,
    normalizedSha256Before: digest(beforeResult.normalized),
    normalizedSha256After: digest(afterResult.normalized),
    externalNamesDiff: externalNamesDiff(before, after),
    beforeNormalized: beforeResult.normalized,
    afterNormalized: afterResult.normalized,
  };
}
