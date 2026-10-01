// 把 app/official-ui/icons.mjs 那张表编译进产物：**只换图标数据的来源**，
// 官方那两个图标工厂的实现一行不动。之后改图标只改 icons.mjs，不用往 patches.mjs 里加补丁。
//
// 为什么只能改工厂：官方的图标数据是每个图标各自被闭包捕获的
// （`const Tree = createLucideIcon("Tree", [...])`，数据作为参数传进工厂），268 个不可变常量，
// 没有统一的"表"可以替换。而工厂全产物只有一处，改它一次就全覆盖。
//
// 做法：原工厂改名留着（加 __ovOriginal_ 前缀），在它前面插一个新的同名函数 ——
// 查表，表里有就用我们的数据或组件，没有就把官方传进来的 iconNode 原样转交给原工厂。
// 官方内部实现一个字都没改。
//
// 注入是**同步**的：表编译成一段字面量直接塞进产物，不走 import、不用等、不闪帧。
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ICONS } from "./icons.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

// 值两种形态：图标数据（数组）和组件（函数）。函数没法 JSON 序列化，用 toString() 贴源码，
// 所以 icons.mjs 里写的函数不能引用外部名字 —— 需要什么从第二个参数 h 里拿。
const serialize = (table) =>
  Object.entries(table)
    .map(([name, value]) =>
      typeof value === "function"
        ? `  ${JSON.stringify(name)}: { c: (h) => (${value.toString()}) }`
        : `  ${JSON.stringify(name)}: { d: ${JSON.stringify(value)} }`,
    )
    .join(",\n");

// 递给表里组件函数的运行时。这几个名字都在工厂所在的模块作用域里（工厂本身就在用它们），
// **必须惰性取**：图标工厂在第 3000 行附近执行，而 Icon$1 定义在更早、jsxRuntimeExports
// 可能还没初始化 —— 直接写 { jsx: jsxRuntimeExports.jsx } 会在工厂执行的那一刻就求值，
// 于是整个产物在模块初始化阶段炸掉（"Cannot access before initialization"）。
const HANDLE =
  '(() => ({ jsx: jsxRuntimeExports.jsx, jsxs: jsxRuntimeExports.jsxs, Fragment: jsxRuntimeExports.Fragment, createElement: reactExports.createElement, react: reactExports, Icon: Icon$1 }))()';

// 表用 var 而不是 const：图标工厂在模块初始化时就执行（`const Tree = createLucideIcon(...)`），
// 那时 __OV_ICONS 还没轮到赋值，const 会报 TDZ；而**每个图标调用都会查一次表**，
// 所以用函数声明 + 延迟建表，第一次真正查的时候表就在了。
const TABLE = `const __ovIconTable = {
${serialize(ICONS)}
};
`;

const shim = (fn, orig, withTable) => `${withTable ? TABLE : ""}const ${fn} = (iconName, iconNode, ...rest) => {
  const e = __ovIconTable[iconName];
  if (e && e.c) return e.c(${HANDLE});
  return ${orig}(iconName, e && e.d ? e.d : iconNode, ...rest);
};
`;

// 只替换第一处，且是**真替换**（不会把匹配到的原文留下）。用 indexOf + slice 而不是
// String.replace：图标里有 `createLucideIcon$1` 这种带 $ 的标识符，replace 会把 $1 当捕获组引用。
function replaceFirst(text, search, replacement) {
  const i = text.indexOf(search);
  if (i < 0) return null;
  return text.slice(0, i) + replacement + text.slice(i + search.length);
}

/** 在一份产物文本里换掉两个图标工厂的数据来源。找不到工厂就原样返回。 */
export function injectIcons(text, label = "产物") {
  const names = Object.keys(ICONS);
  if (!names.length) return text;
  const FACTORIES = ["createLucideIcon", "createLucideIcon$1"];
  const declOf = (fn) => `const ${fn} = `;
  const at = (fn) => text.indexOf(declOf(fn));
  const present = FACTORIES.filter((fn) => at(fn) >= 0);
  if (!present.length) return text;

  // 表要贴在**最早**那个工厂前面：两个工厂都在模块初始化阶段就被图标定义调用
  // （`const Tree = createLucideIcon("Tree", ...)`），表晚于任何一个都会踩 TDZ。
  const first = present.reduce((a, b) => (at(a) <= at(b) ? a : b));
  let out = replaceFirst(text, declOf(first), TABLE + declOf(first));

  for (const fn of present) {
    const orig = `__ovOriginal_${fn}`;
    const origDecl = `const ${orig} = `;
    // 先把工厂改名（`const <fn> = ` 整体换成 `const <orig> = `），再把新函数插到它前面。
    // 改名之后文本里只剩 `const <orig> = `，所以下面那次插入匹配的是原工厂那一行，不会命中新函数。
    const renamed = replaceFirst(out, declOf(fn), origDecl);
    if (renamed === null) continue;
    out = replaceFirst(renamed, origDecl, shim(fn, orig) + origDecl);
  }
  console.log(`  定制图标：${names.length} 个（${label}）`);
  return out;
}

/** 对文件做注入并写回。返回是否改过。 */
export function injectIconsInto(file) {
  const text = readFileSync(file, "utf8");
  const out = injectIcons(text, path.relative(path.resolve(here, "../.."), file));
  if (out === text) return false;
  writeFileSync(file, out);
  return true;
}
