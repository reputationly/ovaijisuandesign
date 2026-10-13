import traverseModule from "@babel/traverse";
import * as t from "@babel/types";
import { parse } from "./parse.mjs";

const traverse = [traverseModule, traverseModule?.default, traverseModule?.default?.default]
  .find((candidate) => typeof candidate === "function");
const nameOf = (node) => node?.name;

function isJsxBindingReference(path) {
  if (!path.isJSXIdentifier()) return false;
  const parent = path.parentPath;
  if (
    parent.isJSXOpeningElement() ||
    parent.isJSXClosingElement()
  ) return parent.node.name === path.node;
  if (!parent.isJSXMemberExpression() || parent.node.object !== path.node) return false;
  let member = parent;
  while (member.isJSXMemberExpression()) {
    const object = member.get("object");
    if (!object.isJSXMemberExpression()) return object.node === path.node;
    member = object;
  }
  return false;
}

function isReference(path) {
  if (path.isIdentifier()) return path.isReferencedIdentifier();
  if (isJsxBindingReference(path)) {
    const name = path.node.name;
    return !t.react.isCompatTag(name);
  }
  return false;
}

export function collectBindings(sourceOrAst, filename = "source.jsx") {
  const ast = typeof sourceOrAst === "string" ? parse(sourceOrAst, filename) : sourceOrAst;
  const bindings = [];
  const nodeToBinding = new WeakMap();
  const bindingToInfo = new Map();
  const allIdentifiers = [];
  const freeReferences = [];

  traverse(ast, {
    Scopable(scopePath) {
      for (const binding of Object.values(scopePath.scope.bindings)) {
        if (bindingToInfo.has(binding)) continue;
        const info = {
          binding,
          name: binding.identifier.name,
          identifier: binding.identifier,
          declaration: binding.identifier,
          scope: binding.scope,
          path: binding.path,
          referencePaths: [...binding.referencePaths],
          nodes: new Set(),
        };
        bindings.push(info);
        bindingToInfo.set(binding, info);
        info.nodes.add(binding.identifier);
        nodeToBinding.set(binding.identifier, info);
        for (const referencePath of binding.referencePaths) {
          const node = referencePath.node;
          if (node?.type === "Identifier" || node?.type === "JSXIdentifier") {
            info.nodes.add(node);
            nodeToBinding.set(node, info);
          }
        }
        for (const violationPath of binding.constantViolations) {
          for (const [name, node] of Object.entries(
            violationPath.getBindingIdentifiers?.() ?? {},
          )) {
            const nodes = Array.isArray(node) ? node : [node];
            for (const item of nodes) {
              if (name === info.name && item?.type === "Identifier") {
                info.nodes.add(item);
                nodeToBinding.set(item, info);
              }
            }
          }
          violationPath.traverse({
            Identifier(identifierPath) {
              if (
                identifierPath.node.name === info.name &&
                isReference(identifierPath) &&
                identifierPath.scope.getBinding(info.name) === binding
              ) {
                info.nodes.add(identifierPath.node);
                nodeToBinding.set(identifierPath.node, info);
              }
            },
          });
        }
      }
    },
    VariableDeclarator(variablePath) {
      for (const [name, nodes] of Object.entries(variablePath.get("id").getBindingIdentifiers())) {
        const binding = variablePath.scope.getBinding(name);
        const info = bindingToInfo.get(binding);
        for (const node of Array.isArray(nodes) ? nodes : [nodes]) {
          if (info && node?.type === "Identifier") {
            info.nodes.add(node);
            nodeToBinding.set(node, info);
          }
        }
      }
    },
    Identifier(identifierPath) {
      allIdentifiers.push(identifierPath);
      if (!isReference(identifierPath)) return;
      const binding = identifierPath.scope.getBinding(identifierPath.node.name);
      const info = bindingToInfo.get(binding);
      if (info) {
        info.nodes.add(identifierPath.node);
        nodeToBinding.set(identifierPath.node, info);
      } else if (binding) {
        throw new Error(
          `无法确定绑定 ${identifierPath.node.name}（${identifierPath.node.loc.start.line}:${identifierPath.node.loc.start.column + 1}）`,
        );
      } else {
        freeReferences.push(identifierPath);
      }
    },
    JSXIdentifier(identifierPath) {
      if (!isReference(identifierPath)) return;
      const binding = identifierPath.scope.getBinding(identifierPath.node.name);
      const info = bindingToInfo.get(binding);
      if (info) {
        info.nodes.add(identifierPath.node);
        nodeToBinding.set(identifierPath.node, info);
      } else if (binding) {
        throw new Error(
          `无法确定绑定 ${identifierPath.node.name}（${identifierPath.node.loc.start.line}:${identifierPath.node.loc.start.column + 1}）`,
        );
      } else {
        freeReferences.push(identifierPath);
      }
    },
  });

  return { ast, bindings, bindingToInfo, nodeToBinding, freeReferences, allIdentifiers };
}

export function bindingForNode(info, node) {
  return info.nodeToBinding.get(node) ?? null;
}

export function declarationPosition(bindingInfo) {
  const { line, column } = bindingInfo.identifier.loc.start;
  return { line, column: column + 1 };
}

export function bindingKey(bindingInfo, includeColumn = true) {
  const position = declarationPosition(bindingInfo);
  return `${bindingInfo.name}@${position.line}${includeColumn ? `:${position.column}` : ""}`;
}

export function isReferencePath(path) {
  return isReference(path);
}

export function scopeContains(ancestorScope, path) {
  for (let scope = path.scope; scope; scope = scope.parent) {
    if (scope === ancestorScope) return true;
  }
  return false;
}
