import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import traverseModule from "@babel/traverse";
import {
  parse,
  readSourceFiles,
  resolveLocalFile,
  toPosix,
  toRepoPath,
  walkSourceFiles,
} from "./parse.mjs";

const traverse = [traverseModule, traverseModule?.default, traverseModule?.default?.default]
  .find((candidate) => typeof candidate === "function");

function sourceSpecifier(node) {
  if (node?.type === "StringLiteral") {
    return { value: node.value, start: node.start + 1, end: node.end - 1 };
  }
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    const quasi = node.quasis[0];
    return { value: quasi.value.cooked ?? quasi.value.raw, start: quasi.start + 1, end: quasi.end - 1 };
  }
  return null;
}

function collectSpecifierNodes(ast) {
  const found = [];
  const add = (node, kind) => {
    const value = sourceSpecifier(node);
    if (value?.value.startsWith(".")) found.push({ ...value, kind, node });
  };
  traverse(ast, {
    ImportDeclaration(path) {
      add(path.node.source, "import");
    },
    ExportNamedDeclaration(path) {
      if (path.node.source) add(path.node.source, "export");
    },
    ExportAllDeclaration(path) {
      add(path.node.source, "export");
    },
    CallExpression(path) {
      if (path.node.callee.type === "Import") add(path.node.arguments[0], "dynamic-import");
    },
    ImportExpression(path) {
      add(path.node.source, "dynamic-import");
    },
    NewExpression(path) {
      const { node } = path;
      if (
        node.callee.type === "Identifier" &&
        node.callee.name === "URL" &&
        node.arguments[1]?.type === "MemberExpression" &&
        node.arguments[1].object.type === "MetaProperty" &&
        node.arguments[1].object.meta.name === "import" &&
        node.arguments[1].object.property.name === "meta" &&
        node.arguments[1].property.type === "Identifier" &&
        node.arguments[1].property.name === "url"
      ) add(node.arguments[0], "url");
    },
  });
  return found;
}

function resolveReferencedTarget(root, srcDir, specifier, importer, files) {
  const exact = path.resolve(path.dirname(importer), specifier);
  const srcRoot = path.resolve(root, srcDir);
  if (
    (exact === srcRoot || exact.startsWith(`${srcRoot}${path.sep}`)) &&
    (files.has(exact) || (existsSync(exact) && statSync(exact).isFile()))
  ) return exact;
  return resolveLocalFile(root, srcDir, specifier, importer, files);
}

function renderedSpecifier(specifier, fromFile, toFile, wasIndex) {
  let relative = toPosix(path.relative(path.dirname(fromFile), toFile));
  if (!relative.startsWith(".")) relative = `./${relative}`;
  const originalPath = specifier.split(/[?#]/, 1)[0];
  const hadExtension = Boolean(path.extname(originalPath));
  if (!hadExtension && !wasIndex) relative = relative.slice(0, -path.extname(relative).length || undefined);
  return relative;
}

function walkTextFiles(dir, extensions) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) return walkTextFiles(file, extensions);
      return entry.isFile() && extensions.includes(path.extname(file)) ? [file] : [];
    });
}

function reportPath(root, toolName, requested) {
  if (requested) return path.resolve(root, requested);
  const stamp = new Date().toISOString().replaceAll(":", "-");
  return path.resolve(root, `.probe/desource/rename/${toolName}-${stamp}.json`);
}

export function renameFiles({ root, srcDir = "app/renderer/src", map, dryRun = false, report } = {}) {
  if (!root || !map || typeof map !== "object" || Array.isArray(map)) {
    throw new Error("renameFiles 需要 root 与路径映射对象 map");
  }
  root = path.resolve(root);
  const srcRoot = path.resolve(root, srcDir);
  const srcPrefix = `${srcRoot}${path.sep}`;
  const entries = Object.entries(map);
  const oldToNew = new Map();
  const normalizedOld = new Set();
  const newTargets = new Set();
  for (const [oldRelative, newRelative] of entries) {
    const oldPath = path.resolve(root, oldRelative);
    const newPath = path.resolve(root, newRelative);
    if (!oldPath.startsWith(srcPrefix) || !newPath.startsWith(srcPrefix)) {
      throw new Error(`改名路径必须位于 ${srcDir} 内：${oldRelative} → ${newRelative}`);
    }
    if (normalizedOld.has(oldPath)) throw new Error(`映射旧路径重复：${oldRelative}`);
    normalizedOld.add(oldPath);
    if (!existsSync(oldPath)) throw new Error(`旧文件不存在：${oldRelative}`);
    try {
      execFileSync("git", ["-C", root, "ls-files", "--error-unmatch", "--", oldRelative], {
        stdio: "ignore",
      });
    } catch {
      throw new Error(`旧文件未被 git 跟踪：${oldRelative}`);
    }
    if (newTargets.has(newPath)) throw new Error(`映射的新路径重复：${newRelative}`);
    newTargets.add(newPath);
    oldToNew.set(oldPath, newPath);
  }
  for (const [oldPath, newPath] of oldToNew) {
    if (oldToNew.has(newPath)) {
      throw new Error(`不允许形成改名链：${toRepoPath(root, oldPath)} → ${toRepoPath(root, newPath)}`);
    }
    if (existsSync(newPath)) throw new Error(`新路径已存在：${toRepoPath(root, newPath)}`);
  }

  const originalFiles = readSourceFiles(root, srcDir);
  const virtualFiles = new Map();
  for (const [file, content] of originalFiles) {
    virtualFiles.set(oldToNew.get(file) ?? file, content);
  }
  const edits = new Map();
  const rewritten = [];
  for (const [file, content] of originalFiles) {
    const ast = parse(content, file);
    const newImporter = oldToNew.get(file) ?? file;
    for (const reference of collectSpecifierNodes(ast)) {
      const target = resolveReferencedTarget(root, srcDir, reference.value, file, originalFiles);
      if (!target) continue;
      const newTarget = oldToNew.get(target) ?? target;
      if (newTarget === target && newImporter === file) continue;
      const targetIsIndex = path.basename(target).startsWith("index.") &&
        !path.extname(reference.value.split(/[?#]/, 1)[0]);
      const nextSpecifier = renderedSpecifier(reference.value, newImporter, newTarget, targetIsIndex);
      if (nextSpecifier === reference.value) continue;
      if (!edits.has(file)) edits.set(file, []);
      edits.get(file).push({ start: reference.start, end: reference.end, text: nextSpecifier });
      const loc = reference.node.loc.start;
      rewritten.push({
        file: toRepoPath(root, oldToNew.get(file) ?? file),
        line: loc.line,
        column: loc.column + 1,
        old: reference.value,
        new: nextSpecifier,
        kind: reference.kind,
        _target: newTarget,
      });
    }
  }

  const modifiedFiles = new Map();
  for (const [file, content] of originalFiles) {
    const replacements = edits.get(file) ?? [];
    let next = content;
    for (const edit of [...replacements].sort((a, b) => b.start - a.start)) {
      next = `${next.slice(0, edit.start)}${edit.text}${next.slice(edit.end)}`;
    }
    modifiedFiles.set(oldToNew.get(file) ?? file, next);
  }
  for (const [file, content] of modifiedFiles) parse(content, file);

  const leakFindings = [];
  const oldBasenames = entries.map(([oldPath]) => path.posix.basename(oldPath));
  for (const [file, content] of modifiedFiles) {
    const ast = parse(content, file);
    traverse(ast, {
      StringLiteral(path) {
        inspect(path.node.value, path.node.loc.start, file);
      },
      TemplateElement(path) {
        inspect(path.node.value.raw, path.node.loc.start, file);
        if (path.node.value.cooked != null) inspect(path.node.value.cooked, path.node.loc.start, file);
      },
    });
  }
  function inspect(value, loc, file) {
    for (const basename of oldBasenames) {
      const stem = basename.slice(0, -path.posix.extname(basename).length || undefined);
      if (
        value === basename ||
        value.endsWith(`/${basename}`) ||
        (value.startsWith(".") && value.endsWith(`/${stem}`))
      ) {
        leakFindings.push(`${toRepoPath(root, file)}:${loc.line}:${loc.column + 1} ${JSON.stringify(value)}`);
        break;
      }
    }
  }
  for (const file of [
    path.join(root, "app/renderer/index.html"),
    ...walkTextFiles(srcRoot, [".css", ".html"]),
  ]) {
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const basename of oldBasenames) {
      const index = text.indexOf(`/${basename}`);
      if (index !== -1) {
        const line = text.slice(0, index).split("\n").length;
        leakFindings.push(`${toRepoPath(root, file)}:${line} contains /${basename}`);
      }
    }
  }
  if (leakFindings.length) {
    throw new Error(`发现可能遗漏的旧文件名引用：\n${[...new Set(leakFindings)].join("\n")}`);
  }

  for (const reference of rewritten) {
    const importer = path.resolve(root, reference.file);
    const virtualPaths = new Set([...modifiedFiles.keys(), ...oldToNew.values()]);
    const destination = resolveReferencedTarget(
      root,
      srcDir,
      reference.new,
      importer,
      virtualPaths,
    );
    if (destination !== reference._target) {
      throw new Error(`改写后的说明符未解析到目标文件：${reference.file}:${reference.line} ${reference.new}`);
    }
  }
  const warnings = [];
  for (const oldRelative of Object.keys(map)) {
    try {
      const matches = execFileSync(
        "git",
        ["-C", root, "grep", "-n", "-F", "-e", oldRelative, "--", "docs", "scripts"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      ).trim();
      if (matches) warnings.push(...matches.split("\n"));
    } catch {
      // No matches is expected.
    }
  }

  const finalReport = {
    tool: "rename-files",
    renames: entries.map(([old, next]) => ({ old, new: next })),
    rewritten: rewritten.map(({ _target, ...reference }) => reference),
    warnings,
    stats: {
      renamedFiles: entries.length,
      rewrittenReferences: rewritten.length,
      affectedFiles: new Set(rewritten.map((item) => item.file)).size,
    },
  };
  const output = reportPath(root, "rename-files", report);
  if (
    [...oldToNew.keys(), ...oldToNew.values()].includes(output) ||
    [...originalFiles.keys()].includes(output)
  ) throw new Error("报告路径不能覆盖源码文件");
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(finalReport, null, 2)}\n`);
  if (!dryRun) {
    for (const [oldPath, newPath] of oldToNew) {
      mkdirSync(path.dirname(newPath), { recursive: true });
      execFileSync("git", ["-C", root, "mv", "--", oldPath, newPath]);
    }
    for (const [file, content] of modifiedFiles) {
      if (content !== originalFiles.get([...oldToNew].find(([, next]) => next === file)?.[0] ?? file)) {
        writeFileSync(file, content);
      }
    }
  }
  return { ...finalReport, reportPath: output };
}
