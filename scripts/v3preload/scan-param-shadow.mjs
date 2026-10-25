#!/usr/bin/env node
/**
 * T-5：参数改名后函数体仍引用原名、而原名在模块里另有绑定的扫描。
 *
 * 已知实例（`docs/cloud-platform-plan.md` 第 8.7 节 1 条）：`MediaGenCardLayout` 的参数被改名成
 * `media: media2`，JSX 里仍写 `{media}`，命中的是模块顶部从 `canvas-v3-model.js` 导入的 `media`
 * 函数 —— 类型是函数，React 静默不渲染，media 区永远是空的，既不报错也不缺 DOM 断言。
 * `check-undef` 抓不到：那个名字**是有绑定的**，只是绑到了外面。
 *
 * 判据（作用域感知，不做正则猜测）：
 *   1. 函数（声明/表达式/箭头/方法）的参数里存在「带数字后缀的绑定」，如 `media2`、`item2`、
 *      `{ media: media2 }`、`({ foo: bar2 }) => ...`；
 *   2. 函数体内有**被引用的标识符**叫去掉后缀的原名（`media`）；
 *   3. 该引用的绑定解析到函数体**之外**（模块级 import / 顶层 const / 外层函数参数）。
 *
 * 三者同时成立才报。函数内部自己再声明同名变量属于正常遮蔽，不报；完全无绑定的名字由
 * `scripts/desource/check-undef.mjs` 负责。
 *
 * 用法：
 *   node scripts/v3preload/scan-param-shadow.mjs [源码根] [--json]
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";

const traverse = traverseModule.default ?? traverseModule;

const args = process.argv.slice(2);
const JSON_ONLY = args.includes("--json");
const ROOT = args.find((a) => !a.startsWith("--")) ?? "app/renderer/src";

const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue;
    const p = path.join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(js|jsx)$/.test(entry) && !/\.test\./.test(entry)) files.push(p);
  }
})(ROOT);

const FUNCTION_TYPES =
  "FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod|ClassMethod|ClassPrivateMethod";

/** 参数里所有「带数字后缀」的绑定名 → 去掉后缀的原名。 */
function renamedParams(fnPath) {
  const bases = new Map();
  for (const param of fnPath.get("params")) {
    const names = new Set();
    if (param.isIdentifier()) names.add(param.node.name);
    else {
      param.traverse({
        Identifier(idPath) {
          const parent = idPath.parentPath;
          if (parent.isObjectProperty() && parent.node.value === idPath.node) names.add(idPath.node.name);
          else if (parent.isArrayPattern() || parent.isRestElement()) names.add(idPath.node.name);
          else if (parent.isAssignmentPattern() && parent.node.left === idPath.node) names.add(idPath.node.name);
        },
      });
    }
    for (const name of names) {
      const match = /^(.*?)(\d+)$/.exec(name);
      if (match && match[1]) bases.set(match[1], name);
    }
  }
  return bases;
}

function contains(inner, ancestor) {
  for (let cur = inner; cur; cur = cur.parentPath) if (cur === ancestor) return true;
  return false;
}

const findings = [];
const parseFailures = [];
for (const file of files) {
  let ast;
  try {
    ast = parse(readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  } catch (error) {
    parseFailures.push({ file, error: error instanceof Error ? error.message.split("\n")[0] : String(error) });
    continue;
  }
  traverse(ast, {
    [FUNCTION_TYPES](fnPath) {
      const bases = renamedParams(fnPath);
      if (bases.size === 0) return;
      const seen = new Set();
      fnPath.get("body").traverse({
        Identifier(idPath) {
          const name = idPath.node.name;
          if (!bases.has(name) || seen.has(name)) return;
          if (!idPath.isReferencedIdentifier()) return;
          const binding = idPath.scope.getBinding(name);
          if (!binding) return;
          if (binding.scope === fnPath.scope || contains(binding.path, fnPath)) return;
          seen.add(name);
          findings.push({
            file,
            line: idPath.node.loc?.start.line ?? 0,
            parameter: bases.get(name),
            referenced: name,
            bindingKind: binding.kind,
            bindingLine: binding.path.node.loc?.start.line ?? 0,
          });
        },
      });
    },
  });
}

if (JSON_ONLY) {
  console.log(JSON.stringify({ scanned: files.length, parseFailures, findings }, null, 2));
} else {
  console.log(`参数改名遮蔽扫描：${files.length} 个文件，解析失败 ${parseFailures.length}，命中 ${findings.length}`);
  for (const f of findings) {
    console.log(`  ${f.file}:${f.line}  参数 ${f.parameter} / 函数体引用 ${f.referenced}（绑定到函数外的 ${f.bindingKind}，第 ${f.bindingLine} 行）`);
  }
  for (const p of parseFailures) console.log(`  ✗ 解析失败 ${p.file}: ${p.error}`);
}
process.exit(parseFailures.length ? 2 : 0);
