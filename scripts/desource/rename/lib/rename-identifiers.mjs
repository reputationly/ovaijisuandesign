import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import traverseModule from "@babel/traverse";
import * as t from "@babel/types";
import globals from "globals";
import { bindingKey, collectBindings, declarationPosition, scopeContains } from "./bindings.mjs";
import { checkEquivalence, setExternalRename } from "./equivalence.mjs";
import { parse, readSourceFiles, resolveLocalFile, toRepoPath, walkSourceFiles } from "./parse.mjs";

const traverse = [traverseModule, traverseModule?.default, traverseModule?.default?.default]
  .find((candidate) => typeof candidate === "function");
const reserved = new Set([
  "await", "yield", "let", "static", "implements", "interface", "package",
  "private", "protected", "public", "enum", "eval", "arguments",
  "undefined", "NaN", "Infinity",
]);
const globalNames = new Set(
  ["browser", "worker", "es2024"].flatMap((environment) =>
    Object.keys(globals[environment] ?? {}),
  ),
);

function getTextForNode(source, node) {
  return source.slice(node.start, node.end);
}

function parseKey(key) {
  const match = /^(.*)@(\d+)(?::(\d+))?$/.exec(key);
  if (!match) throw new Error(`映射 key 格式错误：${key}`);
  return { name: match[1], line: Number(match[2]), column: match[3] ? Number(match[3]) : null };
}

function resolveMappedBinding(initialInfo, key) {
  const parsed = parseKey(key);
  const candidates = initialInfo.bindings.filter((item) => {
    const position = declarationPosition(item);
    return item.name === parsed.name && position.line === parsed.line &&
      (parsed.column == null || position.column === parsed.column);
  });
  if (!candidates.length) throw new Error(`找不到绑定：${key}`);
  if (candidates.length > 1) {
    throw new Error(`绑定位置不唯一：${key}；候选：${candidates.map((item) => bindingKey(item)).join(", ")}`);
  }
  return candidates[0];
}

function currentOffsetForOriginal(offset, edits) {
  let current = offset;
  for (const edit of edits) {
    if (edit.originalStart < offset) current += edit.newLength - edit.oldLength;
  }
  return current;
}

function originalOffsetForCurrent(offset, edits) {
  let delta = 0;
  for (const edit of [...edits].sort((a, b) => a.originalStart - b.originalStart)) {
    const start = edit.originalStart + delta;
    const end = start + edit.newLength;
    if (offset >= end) delta += edit.newLength - edit.oldLength;
    else if (offset > start) return edit.originalStart;
  }
  return offset - delta;
}

function isExportDeclaration(bindingInfo) {
  let current = bindingInfo.path;
  while (current && !current.isProgram()) {
    if (current.parentPath?.isExportNamedDeclaration() && current.parentPath.node.declaration === current.node) {
      return true;
    }
    current = current.parentPath;
  }
  return false;
}

function isParameterReferenceInSameFunction(scope, referencePath) {
  let functionPath = null;
  for (let current = scope; current; current = current.parent) {
    if (current.path.isFunction()) {
      functionPath = current.path;
      break;
    }
  }
  if (!functionPath) return false;
  let current = referencePath;
  while (current && current.node !== functionPath.node) {
    if (current.parentPath === functionPath) return current.listKey === "params";
    current = current.parentPath;
  }
  return false;
}

function checkRenameConflict(source, info, targetBinding, newName) {
  if (typeof newName !== "string" || !t.isValidIdentifier(newName) || reserved.has(newName)) {
    return `新名不是可用的模块标识符：${newName}`;
  }
  if (globalNames.has(newName)) return `新名是全局名：${newName}`;
  if (info.freeReferences.some((reference) => reference.node.name === newName)) {
    return `文件中已有自由引用：${newName}`;
  }
  const scope = targetBinding.scope;
  const others = info.bindings.filter((binding) => binding.binding !== targetBinding.binding);
  const collision = others.find((binding) => binding.name === newName && (
    binding.scope === scope || scopeContains(scope, binding.path)
  ));
  if (collision) return `本作用域或后代作用域已有绑定 ${newName}（${bindingKey(collision)}）`;
  const shadowed = others.find((binding) => {
    if (binding.name !== newName) return false;
    let isAncestor = false;
    for (let ancestor = scope.parent; ancestor; ancestor = ancestor.parent) {
      if (ancestor === binding.scope) {
        isAncestor = true;
        break;
      }
    }
    return isAncestor && binding.binding.referencePaths.some(
      (reference) => scopeContains(scope, reference) || isParameterReferenceInSameFunction(scope, reference),
    );
  });
  if (shadowed) return `会遮蔽子树内被引用的外层绑定 ${newName}（${bindingKey(shadowed)}）`;
  let forbidden = null;
  traverse(info.ast, {
    WithStatement() {
      forbidden ??= "文件包含 with 语句";
    },
    CallExpression(callPath) {
      if (
        callPath.node.callee.type === "Identifier" &&
        callPath.node.callee.name === "eval" &&
        !callPath.scope.getBinding("eval")
      ) forbidden ??= "文件调用自由标识符 eval";
    },
  });
  return forbidden;
}

function makeBindingEdits(source, ast, info, bindingInfo, newName, { renameExport = false } = {}) {
  const edits = [];
  const seen = new Set();
  traverse(ast, {
    Identifier(identifierPath) {
      add(identifierPath);
    },
    JSXIdentifier(identifierPath) {
      add(identifierPath);
    },
  });
  function add(identifierPath) {
    if (info.nodeToBinding.get(identifierPath.node) !== bindingInfo) return;
    const { node, parentPath } = identifierPath;
    if (seen.has(node.start)) return;
    seen.add(node.start);
    const original = getTextForNode(source, node);
    let text = newName;
    const shorthandProperty = parentPath.isObjectProperty()
      ? parentPath
      : parentPath.parentPath?.isObjectProperty() ? parentPath.parentPath : null;
    if (shorthandProperty?.node.shorthand) {
      text = `${original}: ${newName}`;
    } else if (parentPath.isImportSpecifier() && parentPath.node.local === node &&
      parentPath.node.imported.name === node.name) {
      text = `${original} as ${newName}`;
    } else if (parentPath.isExportSpecifier() && parentPath.node.local === node &&
      parentPath.node.exported.name === node.name) {
      text = renameExport ? newName : `${newName} as ${original}`;
    }
    edits.push({ start: node.start, end: node.end, text });
  }
  return edits.sort((a, b) => b.start - a.start);
}

function applyTextEdits(source, edits) {
  let result = source;
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
    result = `${result.slice(0, edit.start)}${edit.text}${result.slice(edit.end)}`;
  }
  return result;
}

function localRenameText(source, map, { filename = "source.jsx", allowExportDeclaration = false } = {}) {
  const originalInfo = collectBindings(source, filename);
  const operations = [];
  const rejected = [];
  for (const [key, newName] of Object.entries(map)) {
    try {
      operations.push({ key, newName, target: resolveMappedBinding(originalInfo, key) });
    } catch (error) {
      rejected.push({ key, reason: error.message });
    }
  }
  let text = source;
  const history = [];
  const renames = [];
  const skipped = [];

  for (const operation of operations) {
    const { key, newName, target } = operation;
    if (newName === "" || newName === target.name) {
      skipped.push({ key, old: target.name, new: newName, reason: "空名或名称未变化" });
      continue;
    }
    const parsed = parse(text, filename);
    const currentInfo = collectBindings(parsed, filename);
    const currentDeclarationStart = currentOffsetForOriginal(target.identifier.start, history);
    const currentBinding = currentInfo.bindings.find(
      (binding) => binding.identifier.start === currentDeclarationStart,
    );
    if (!currentBinding) {
      rejected.push({ key, reason: "无法在当前文本中重新定位绑定" });
      continue;
    }
    const conflict = checkRenameConflict(text, currentInfo, currentBinding, newName);
    if (conflict) {
      rejected.push({ key, reason: conflict });
      continue;
    }
    if (!allowExportDeclaration && isExportDeclaration(currentBinding)) {
      rejected.push({ key, reason: "改名会改变导出名，请使用 export 模式" });
      continue;
    }
    const edits = makeBindingEdits(text, parsed, currentInfo, currentBinding, newName);
    if (!edits.length) {
      rejected.push({ key, reason: "绑定没有可编辑的位置" });
      continue;
    }
    const reportedPositions = [];
    const mappedEdits = [];
    for (const edit of edits) {
      const nodePosition = originalOffsetForCurrent(edit.start, history);
      const prefix = text.slice(0, edit.start);
      const line = prefix.split("\n").length;
      const column = prefix.length - prefix.lastIndexOf("\n");
      reportedPositions.push({ line, column });
      mappedEdits.push({
        ...edit,
        originalStart: nodePosition,
        oldLength: edit.end - edit.start,
        newLength: edit.text.length,
      });
    }
    text = applyTextEdits(text, edits);
    history.push(...mappedEdits);
    const position = declarationPosition(target);
    renames.push({
      key,
      old: target.name,
      new: newName,
      kind: target.path.node.type,
      declaration: position,
      positions: reportedPositions,
    });
  }
  return { text, renames, rejected, skipped, history };
}

function resultPath(root, toolName, requested) {
  const name = new Date().toISOString().replaceAll(":", "-");
  return requested
    ? path.resolve(root, requested)
    : path.resolve(root, `.probe/desource/rename/${toolName}-${name}.json`);
}

function exportsFor(ast) {
  const names = new Set();
  for (const statement of ast.program.body) {
    if (statement.type === "ExportDefaultDeclaration") names.add("default");
    if (statement.type === "ExportNamedDeclaration") {
      for (const specifier of statement.specifiers) names.add(specifier.exported.name ?? specifier.exported.value);
      if (statement.declaration?.id) names.add(statement.declaration.id.name);
      if (statement.declaration?.type === "VariableDeclaration") {
        for (const declaration of statement.declaration.declarations) {
          if (declaration.id.type === "Identifier") names.add(declaration.id.name);
        }
      }
    }
  }
  return names;
}

function externalIdentifierEdit(source, node, newName, quoteValue = false) {
  if (quoteValue) return { start: node.start + 1, end: node.end - 1, text: newName };
  return { start: node.start, end: node.end, text: newName };
}

function sourceNodeReference(ast) {
  const references = [];
  traverse(ast, {
    ImportDeclaration(path) {
      references.push({ node: path.node.source, kind: "import", path });
    },
    ExportNamedDeclaration(path) {
      if (path.node.source) references.push({ node: path.node.source, kind: "reexport", path });
    },
    ExportAllDeclaration(path) {
      references.push({ node: path.node.source, kind: "export-all", path });
    },
    CallExpression(path) {
      if (path.node.callee.type === "Import") references.push({ node: path.node.arguments[0], kind: "dynamic", path });
    },
    ImportExpression(path) {
      references.push({ node: path.node.source, kind: "dynamic", path });
    },
  });
  return references;
}

function resolveExportTarget(root, srcDir, node, importer, files) {
  if (node?.type !== "StringLiteral" && node?.type !== "TemplateLiteral") return null;
  const value = node.type === "StringLiteral" ? node.value :
    node.expressions.length === 0 ? node.quasis[0].value.cooked : null;
  return value ? resolveLocalFile(root, srcDir, value, importer, files) : null;
}

function namespaceReferenceEdits(info, binding, oldName, newName, externalRenames, description) {
  const edits = [];
  const problems = [];
  for (const reference of binding.binding.referencePaths) {
    const node = reference.node;
    const parent = reference.parentPath;
    if (!parent?.isMemberExpression() || parent.node.object !== node) {
      problems.push(`${description}:${node.loc.start.line}:${node.loc.start.column + 1}`);
      continue;
    }
    const property = parent.node.property;
    if (parent.node.computed) {
      if (property.type !== "StringLiteral") {
        problems.push(`${description}:${node.loc.start.line}:${node.loc.start.column + 1}`);
        continue;
      }
      if (property.value === oldName) {
        edits.push(externalIdentifierEdit("", property, newName, true));
        externalRenames.set(property.start, newName);
      }
    } else if (property.type === "Identifier" && property.name === oldName) {
      edits.push(externalIdentifierEdit("", property, newName));
      externalRenames.set(property.start, newName);
    }
  }
  return { edits, problems };
}

function runExportMode({ root, srcDir, map, dryRun, report }) {
  const contents = readSourceFiles(root, srcDir);
  const output = new Map(contents);
  const fileReports = [];
  const warnings = [];
  const externalByFile = new Map();
  const relatedRenames = new Map();
  for (const [relativeFile, renameMap] of Object.entries(map)) {
    const file = path.resolve(root, relativeFile);
    const before = contents.get(file);
    if (before == null) throw new Error(`导出文件不存在或不在源码范围内：${relativeFile}`);
    let text = before;
    const rejected = [];
    const renames = [];
    const externalRenames = new Map();
    externalByFile.set(file, externalRenames);
    const beforeAst = parse(before, file);
    const requestedNames = new Set();
    const currentExports = exportsFor(beforeAst);
    for (const [oldName, newName] of Object.entries(renameMap)) {
      if (oldName === "default") {
        rejected.push({ key: oldName, reason: "不能改名 default 导出" });
        continue;
      }
      if (newName === "" || newName === oldName) {
        continue;
      }
      if (requestedNames.has(newName)) {
        rejected.push({ key: oldName, reason: `映射中有重复的新导出名：${newName}` });
        continue;
      }
      requestedNames.add(newName);
      if (currentExports.has(newName)) {
        rejected.push({ key: oldName, reason: `新导出名已存在：${newName}` });
        continue;
      }
      const edits = [];
      let hasLocalBinding = false;
      traverse(beforeAst, {
        ExportNamedDeclaration(exportPath) {
          const declaration = exportPath.node;
          if (declaration.source) {
            for (const specifier of declaration.specifiers) {
              if ((specifier.exported.name ?? specifier.exported.value) === oldName) {
                const local = specifier.local.name ?? specifier.local.value;
                if (local === oldName) {
                  edits.push({ start: specifier.start, end: specifier.end, text: `${oldName} as ${newName}` });
                } else {
                  edits.push(externalIdentifierEdit(before, specifier.exported, newName));
                }
                setExternalRename(externalRenames, specifier.exported.start, newName, "exported");
              }
            }
            return;
          }
          for (const specifier of declaration.specifiers) {
            const exported = specifier.exported.name ?? specifier.exported.value;
            const local = specifier.local.name ?? specifier.local.value;
            if (exported !== oldName) continue;
              if (local === oldName) {
                hasLocalBinding = true;
              } else {
                edits.push(externalIdentifierEdit(before, specifier.exported, newName));
                setExternalRename(externalRenames, specifier.exported.start, newName, "exported");
            }
          }
          const node = declaration.declaration;
          if (node?.id?.name === oldName) hasLocalBinding = true;
          if (node?.type === "VariableDeclaration" && node.declarations.some(
            (item) => item.id.type === "Identifier" && item.id.name === oldName,
          )) hasLocalBinding = true;
        },
      });
      if (!currentExports.has(oldName)) {
        rejected.push({ key: oldName, reason: `找不到导出名：${oldName}` });
        continue;
      }
      if (hasLocalBinding) {
        const local = localRenameText(text, { [findBindingKey(text, file, oldName)]: newName }, {
          filename: file,
          allowExportDeclaration: true,
        });
        if (local.rejected.length) {
          rejected.push(...local.rejected);
          continue;
        }
        text = local.text;
        renames.push(...local.renames.map((item) => ({ ...item, kind: "local-export" })));
        const astAfterLocal = parse(text, file);
        traverse(astAfterLocal, {
          ExportNamedDeclaration(exportPath) {
            for (const specifier of exportPath.node.specifiers) {
              if (specifier.local.name === newName && specifier.exported.name === oldName) {
                const at = specifier.start;
                text = `${text.slice(0, at)}${newName}${text.slice(specifier.end)}`;
                const originalSpecifier = beforeAst.program.body
                  .flatMap((item) => item.type === "ExportNamedDeclaration" ? item.specifiers : [])
                  .find((item) => item.local.name === oldName && item.exported.name === oldName);
                if (originalSpecifier) {
                  setExternalRename(externalRenames, originalSpecifier.exported.start, newName, "exported");
                }
                break;
              }
            }
          },
        });
      } else {
        text = applyTextEdits(text, edits);
      }
      if (!renames.some((item) => item.old === oldName)) {
        renames.push({ key: oldName, old: oldName, new: newName, kind: "exported-name", positions: [] });
      }

      for (const [importer, source] of contents) {
        const ast = parse(source, importer);
        let importerExternalRenames = externalByFile.get(importer);
        if (!importerExternalRenames) {
          importerExternalRenames = new Map();
          externalByFile.set(importer, importerExternalRenames);
        }
        for (const reference of sourceNodeReference(ast)) {
          const target = resolveExportTarget(root, srcDir, reference.node, importer, contents);
          if (target !== file) continue;
          if (reference.kind === "export-all") {
            rejected.push({ key: oldName, reason: `export * 重新导出需显式处理：${toRepoPath(root, importer)}` });
            continue;
          }
          if (reference.kind === "reexport") {
            const edits = [];
            traverse(ast, {
              ExportNamedDeclaration(exportPath) {
                if (exportPath.node.source !== reference.node) return;
                for (const specifier of exportPath.node.specifiers) {
                  const local = specifier.local.name ?? specifier.local.value;
                  const exported = specifier.exported.name ?? specifier.exported.value;
                  if (local !== oldName) continue;
                  setExternalRename(importerExternalRenames, specifier.local.start, newName, "local");
                  if (exported === oldName) {
                    edits.push({
                      start: specifier.start,
                      end: specifier.end,
                      text: `${newName} as ${oldName}`,
                    });
                  } else {
                    edits.push(externalIdentifierEdit(source, specifier.local, newName));
                  }
                  warnings.push(`再导出对外名保持不变：${toRepoPath(root, importer)}`);
                }
              },
            });
            if (edits.length) {
              output.set(importer, applyTextEdits(output.get(importer) ?? source, edits));
            }
            continue;
          }
          if (reference.kind === "dynamic") {
            const call = reference.path;
            const thenCall = call.parentPath;
            const callback = thenCall?.isMemberExpression()
              ? thenCall.parentPath
              : call.parentPath;
            if (
              !callback?.isCallExpression() ||
              callback.node.callee.type !== "MemberExpression" ||
              callback.node.callee.property.name !== "then" ||
              callback.node.arguments[0]?.type !== "ArrowFunctionExpression" ||
              callback.node.arguments[0].params[0]?.type !== "Identifier"
            ) {
              rejected.push({ key: oldName, reason: `不支持此动态 import 用法：${toRepoPath(root, importer)}:${reference.node.loc.start.line}` });
              continue;
            }
            const callbackPath = callback.get("arguments.0");
            const param = callback.node.arguments[0].params[0];
            const binding = callbackPath.scope.getBinding(param.name);
            if (!binding) continue;
            const proxy = { binding };
            const dynamicInfo = collectBindings(ast, importer);
            const result = namespaceReferenceEdits(dynamicInfo, proxy, oldName, newName, importerExternalRenames, toRepoPath(root, importer));
            if (result.problems.length) rejected.push({ key: oldName, reason: `动态 import 命名空间存在非成员用法：${result.problems.join(", ")}` });
            else if (result.edits.length) {
              const newSource = applyTextEdits(output.get(importer) ?? source, result.edits);
              output.set(importer, newSource);
            }
            continue;
          }
          const specifierPaths = [];
          traverse(ast, {
            ImportDeclaration(importPath) {
              if (importPath.node.source === reference.node) {
                for (const specifier of importPath.node.specifiers) {
                  if (specifier.type === "ImportSpecifier" && (specifier.imported.name ?? specifier.imported.value) === oldName) {
                    specifierPaths.push({ importPath, specifier });
                  }
                  if (specifier.type === "ImportNamespaceSpecifier") {
                    const info = collectBindings(ast, importer);
                    const bindingInfo = info.bindings.find((item) => item.binding.identifier === specifier.local);
                    if (bindingInfo) {
                      const result = namespaceReferenceEdits(info, bindingInfo, oldName, newName, importerExternalRenames, toRepoPath(root, importer));
                      if (result.problems.length) rejected.push({ key: oldName, reason: `命名空间存在非成员用法：${result.problems.join(", ")}` });
                      else {
                        const current = output.get(importer) ?? source;
                        const updates = result.edits.map((edit) => ({ ...edit }));
                        output.set(importer, applyTextEdits(current, updates));
                      }
                    }
                  }
                }
              }
            },
          });
          for (const { specifier } of specifierPaths) {
            const imported = specifier.imported;
            const localName = specifier.local.name;
            importerExternalRenames.set(imported.start, newName);
            if (localName !== oldName) {
              const current = output.get(importer) ?? source;
              const parsed = parse(current, importer);
              const targetImport = locateImportedName(
                parsed,
                oldName,
                root,
                srcDir,
                importer,
                file,
                contents,
              );
              if (targetImport) {
                output.set(importer, applyTextEdits(current, [
                  externalIdentifierEdit(current, targetImport, newName),
                ]));
              }
              continue;
            }
            const localMapping = { [`${localName}@${specifier.local.loc.start.line}:${specifier.local.loc.start.column + 1}`]: newName };
            const local = localRenameText(output.get(importer) ?? source, localMapping, { filename: importer });
            if (!local.rejected.length) {
              let next = local.text;
              const parsedNext = parse(next, importer);
              const targetImport = locateImportedName(
                parsedNext,
                oldName,
                root,
                srcDir,
                importer,
                file,
                contents,
              );
              if (targetImport) {
                const replaceImported = externalIdentifierEdit(next, targetImport, newName);
                next = applyTextEdits(next, [replaceImported]);
                const after = parse(next, importer);
                const shorthand = findImportShorthand(after, newName, newName);
                if (shorthand) next = `${next.slice(0, shorthand.start)}${newName}${next.slice(shorthand.end)}`;
              }
              output.set(importer, next);
              relatedRenames.set(importer, [...(relatedRenames.get(importer) ?? []), ...local.renames]);
            } else {
              const current = output.get(importer) ?? source;
              const parsed = parse(current, importer);
              const targetImport = locateImportedName(
                parsed,
                oldName,
                root,
                srcDir,
                importer,
                file,
                contents,
              );
              if (targetImport) {
                const edit = externalIdentifierEdit(current, targetImport, newName);
                if (imported.start === specifier.local.start) {
                  edit.start = targetImport.start;
                  edit.end = targetImport.end;
                  edit.text = `${newName} as ${localName}`;
                }
                output.set(importer, applyTextEdits(current, [edit]));
                warnings.push(`导入方冲突，保留本地名 ${localName}：${toRepoPath(root, importer)}`);
              }
            }
          }
        }
      }
    }
    output.set(file, text);
    for (const [importer, source] of contents) {
      if (importer !== file && !output.has(importer)) output.set(importer, source);
    }
    const equivalence = checkEquivalence(before, text, { externalRenames, filename: file });
    if (equivalence.status !== "pass") rejected.push({ key: "*", reason: "alpha 归一化等价校验失败" });
    fileReports.push({
      file: relativeFile,
      renames,
      rejected,
      skipped: [],
      equivalence: equivalenceSummary(equivalence),
    });
    for (const [changedFile, changedText] of output) {
      const original = contents.get(changedFile);
      if (original == null || original === changedText || changedFile === file) continue;
      const changedEquivalence = checkEquivalence(original, changedText, {
        externalRenames: externalByFile.get(changedFile) ?? new Map(),
        filename: changedFile,
      });
      fileReports.push({
        file: toRepoPath(root, changedFile),
        renames: relatedRenames.get(changedFile) ?? [],
        rejected: changedEquivalence.status === "pass" ? [] : [{ key: "*", reason: "alpha 归一化等价校验失败" }],
        skipped: [],
        equivalence: equivalenceSummary(changedEquivalence),
      });
    }
  }

  const reportsByFile = new Map(fileReports.map((item) => [path.resolve(root, item.file), item]));
  const renameCount = fileReports.reduce((sum, item) => sum + item.renames.length, 0);
  const finalReport = { tool: "rename-identifiers", mode: "export", files: fileReports, warnings, stats: { renamedBindings: renameCount } };
  const errors = fileReports.flatMap((item) => item.rejected.map((failure) => `${item.file}: ${failure.key}: ${failure.reason}`));
  const out = resultPath(root, "rename-identifiers", report);
  if ([...output.keys()].some((file) => path.resolve(file) === out)) {
    throw new Error("报告路径不能覆盖源码文件");
  }
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(finalReport, null, 2)}\n`);
  if (errors.length) throw Object.assign(new Error(errors.join("\n")), { report: finalReport, reportPath: out });
  if (!dryRun) {
    for (const [file, content] of output) {
      if (contents.get(file) !== content) writeFileSync(file, content);
    }
  }
  return { ...finalReport, reportPath: out };
}

function findBindingKey(source, filename, name) {
  const info = collectBindings(source, filename);
  const found = info.bindings.find((item) => item.name === name);
  return found ? bindingKey(found) : `${name}@1`;
}

function locateImportedName(ast, name, root, srcDir, importer, targetFile, files) {
  let found = null;
  traverse(ast, {
    ImportDeclaration(path) {
      if (resolveLocalFile(root, srcDir, path.node.source.value, importer, files) !== targetFile) return;
      for (const specifier of path.node.specifiers) {
        if (
          specifier.type === "ImportSpecifier" &&
          (specifier.imported.name ?? specifier.imported.value) === name
        ) found = specifier.imported;
      }
    },
  });
  return found;
}

function findImportShorthand(ast, imported, local) {
  let found = null;
  traverse(ast, {
    ImportSpecifier(path) {
      if (
        path.node.imported.type === "Identifier" &&
        path.node.local.name === local &&
        path.node.imported.name === imported
      ) found = path.node;
    },
  });
  return found;
}

function equivalenceSummary(result) {
  return {
    status: result.status,
    bindings: result.bindings,
    normalizedSha256Before: result.normalizedSha256Before,
    normalizedSha256After: result.normalizedSha256After,
    externalNamesDiff: result.externalNamesDiff,
  };
}

export function renameIdentifiers({ root, srcDir = "app/renderer/src", map, dryRun = false, mode = "local", report } = {}) {
  if (!root || !map || typeof map !== "object" || Array.isArray(map)) {
    throw new Error("renameIdentifiers 需要 root 与映射对象 map");
  }
  root = path.resolve(root);
  if (mode === "export") return runExportMode({ root, srcDir, map, dryRun, report });
  if (mode !== "local") throw new Error(`未知改名模式：${mode}`);
  const modified = new Map();
  const fileReports = [];
  for (const [relativeFile, fileMap] of Object.entries(map)) {
    const file = path.resolve(root, relativeFile);
    const srcRoot = path.resolve(root, srcDir);
    if (file !== srcRoot && !file.startsWith(`${srcRoot}${path.sep}`)) {
      throw new Error(`源码路径必须位于 ${srcDir} 内：${relativeFile}`);
    }
    let before;
    try {
      before = readFileSync(file, "utf8");
    } catch {
      throw new Error(`源码文件不存在：${relativeFile}`);
    }
    const changed = localRenameText(before, fileMap, { filename: file });
    const equivalence = checkEquivalence(before, changed.text, { filename: file });
    const failures = [...changed.rejected];
    if (equivalence.status !== "pass") failures.push({ key: "*", reason: "alpha 归一化等价校验失败" });
    fileReports.push({
      file: relativeFile,
      renames: changed.renames,
      rejected: failures,
      skipped: changed.skipped,
      equivalence: equivalenceSummary(equivalence),
    });
    modified.set(file, changed.text);
  }
  const finalReport = {
    tool: "rename-identifiers",
    mode: "local",
    files: fileReports,
    stats: {
      renamedBindings: fileReports.reduce((sum, item) => sum + item.renames.length, 0),
      changedPositions: fileReports.reduce(
        (sum, item) => sum + item.renames.reduce((count, rename) => count + rename.positions.length, 0),
        0,
      ),
    },
  };
  const errors = fileReports.flatMap((item) => item.rejected.map((failure) => `${item.file}: ${failure.key}: ${failure.reason}`));
  const out = resultPath(root, "rename-identifiers", report);
  if ([...modified.keys()].some((file) => path.resolve(file) === out)) {
    throw new Error("报告路径不能覆盖源码文件");
  }
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(finalReport, null, 2)}\n`);
  if (errors.length) throw Object.assign(new Error(errors.join("\n")), { report: finalReport, reportPath: out });
  if (!dryRun) {
    for (const [file, content] of modified) writeFileSync(file, content);
  }
  return { ...finalReport, reportPath: out };
}

export function renameExports(options) {
  return renameIdentifiers({ ...options, mode: "export" });
}
