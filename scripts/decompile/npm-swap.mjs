// 阶段 1：把 vendor 里的第三方库逐个换成 npm 包。
//
// 清单在 npm-packages.json（按顺序替换，被依赖的包排在前面）：
//   { "name": "@lezer/common", "version": "1.2.3" }
//   { "name": "react", "version": "19.2.4", "cjs": { "requireReact": "react" } }
//
// ESM 包：拿这个版本的发布文件逐条比对 vendor 语句（去掉空白、注释、局部变量名后比"形状"），
// 认出属于它的语句；它们对外（main 或剩下的 vendor）暴露的名字必须都是包的导出，才整体换成
//   import { NodeType as NodeType3 } from "@lezer/common";
// 有名字对不上导出就不换，报出来人工看。
//
// CommonJS 包：bundle 里是 requireXxx() 包装函数。把清单里的入口 require 函数换成返回 npm 包的
// 导出对象，里面的实现没人引用了就一并删掉。
//
// 换掉的包在 vendor 里不能再有它依赖的包的副本，否则 npm 版会带进来第二份实例（instanceof、
// 模块级状态都会错）。按依赖顺序排清单，工具也会检查。
import _generate from "@babel/generator";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import * as t from "@babel/types";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const traverse = _traverse.default;
const generate = _generate.default;

const KEYWORDS = new Set(
  "break case catch class const continue debugger default delete do else export extends false finally for function if import in instanceof let new null return super switch this throw true try typeof var void while with yield async await of static undefined".split(" "),
);
// 比"形状"：去掉注释和空白，变量名（不跟在 . 后面的标识符）一律换成 _，关键字、字符串、属性名保留。
// 另外抹掉打包器重新打印带来的差异：单参数箭头函数的括号、单双引号、分号、void 0、改名时的 let X = class Y、
// 多行解构重新排成一行（{ a, b } 打印成多行时 rename 级联把属性也抹掉的问题也一并处理）。
export const norm = (text) =>
  dropRedundantParens(
    text
      .replace(/\/\*[\s\S]*?\*\//g, "")
      // 数字字面量归一：进制（0xffff → 65535）和科学计数法（1e3 → 1000）按值输出十进制。
      // 必须在抹名之前——0xffff 的 xffff 会被抹名规则当标识符吃掉。字符串内容不受影响
      // （引号内的不会走到这里——引号归一在更早一步已处理，且此正则要求词首是数字/0x）。
      .replace(/("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(\b(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b)/g, (m, str, num) => {
        if (str) return str;
        const v = Number(num);
        return Number.isFinite(v) && num !== String(v) ? String(v) : m;
      })
      // minifier 把同键值的对象成员收缩成 shorthand（{xhtml: xhtml} → {xhtml}），重打印不会；
      // 在抹名之前按原文名字收缩（值是键名或键名加打包器 rename 后缀时等价于 shorthand），两边一致。
      // 要在块注释去掉之后做（注释可能挡在成员中间）。
      .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:\s*\2(?:[$\d]+)?\s*(?=[,}])/g, "$1$2")
      .replace(/'([^'\\\n]*)'/g, (m, s) => '"' + s.replace(/"/g, '\\"') + '"')
      .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1")
      // 展开里的标识符也要抹：`(\\.?)` 前缀在 `...state2` 上匹配不到分隔符（`2` 既不是 `.`
      // 也不是标识符首字符），`...state2` 会原样留着，而同一模板的 `...state` 被抹成 `..._`——
      // 两个版本的同一段代码因此对不上。`_(\\._)+` 也救不了，因为压根没变成 `_`。
      .replace(/\.\.\.\s*([A-Za-z_$][\w$]*)/g, (m, id) => (KEYWORDS.has(id) ? m : "..." + "_"))
      .replace(/(\.?)([A-Za-z_$][\w$]*)/g, (m, dot, id) => (dot || KEYWORDS.has(id) ? m : "_"))
      .replace(/_\.jsxs?\(/g, "_(")
      .replace(/_(\._)+/g, "_")
      .replace(/\s+/g, "")
      // 空语句块：minifier 把 `if (x) ;`（空语句）打成 `if (x) {}`（空块），重打印会还原成 `;`。
      // 两种写法语义相同，统一把空的 {} 也去掉——配合最后的删分号，`;` 和 `{}` 都变成"没有"。
      // 必须放在去空白**之后**：dist 里是 `{\n      }`，带换行和缩进，去空白前匹配不到 `{}`。
      // 也只吃"当语句体的空块"：前面是 `)`（if/for/while 条件）或 `else`，后面是 `}` 或 `else`。
      // 注意此时 `else if` 已经粘成 `elseif`，所以 lookahead 不能写 `else\b`。
      .replace(/\)\{\}(?=\}|else)/g, ")")
      .replace(/else\{\}(?=\}|else)/g, "else")
      // 解构里的属性名是"属性位置"不该被抹：const { length: l } = x 里的 length。
      // 上面那条把 rename 后的属性名换成 _，重排成多行后 {_:_} 和 {_} 对不上，这里统一抹掉冒号后的局部名。
      .replace(/\{(_):_\}/g, "{$1}")
      // rename 级联可能把整组解构的属性名都抹掉（let { start: start2, buffer } 打印重排后变成 {_:_,_}），
      // 键序在语义上不重要（没有重复键时），把组内每个 ":_"（改名的局部名）抹掉再排序；
      // 纯改名的 {_,_} 排序不变，无损。嵌套解构的值不是标识符，不会命中。
      .replace(/\{((?:_:_|_)(?:,(?:_:_|_))*)\}/g, (m) => "{" + m.slice(1, -1).split(",").map((x) => x.replace(/:_/, "")).sort().join(",") + "}")
      // 解构键带默认值（_:_=0 / _=0）或剩余元素（..._）时上面的正则吃不到，同样抹局部名再排序。
      .replace(/\{((?:_:_=[^,{}]+|_=[^,{}]+|\.\.\._|_:_|_)(?:,(?:_:_=[^,{}]+|_=[^,{}]+|\.\.\._|_:_|_))*)\}/g, (m) =>
        "{" + m.slice(1, -1).split(",").map((x) => x.replace(/:_/, "")).sort().join(",") + "}",
      )
      // 对象字面量的键序不影响语义（无重复键时）；两边由不同工具打印（rollup vs bundle 的
      // 归一化打印），键序可能不同。叶子对象（不含嵌套 {}、不含字符串）按顶层逗号分成员排序。
      // 必须限定在**表达式位置**的 {：函数体/块语句（function f(){...}、if(x){...}、=>{...}）
      // 也是无嵌套无字符串的 {…}，误排会把语句顺序打乱。前词是 = ( , : [ 或 return 等才是对象。
      .replace(/\{([^{}"]+)\}/g, (m, inner, offset, full) =>
        isExprBrace(full.slice(0, offset)) ? sortLeafObject(m, inner) : m,
      )
      .replace(/,([}\])])/g, "$1")
      .replace(/\(_\)=>/g, "_=>")
      // new X() 和 new X 等价（无参构造的括号可省）；无参调用 f() 与 f 不等价，只处理 new。
      .replace(/new(_+|[A-Za-z_$][\w$]*)\(\)/g, "new$1")
      // get/set 只在属性位置是关键字（x.get() / class 里的 get p()）——让抹名规则放过它们，
      // 再在这里把属性位之外的 get/set 抹成 _：参数位（f(get, set)）、赋值右侧（x = set）、
      // 解构值位（{ get }）等标识符位置，minifier 改名（get2/set$1）后都是 _，dist 里保留原名的要对齐。
      .replace(/(\.)\s*(get|set)\b/g, "$1$2")
      .replace(/([^.\w$])(get|set)\b/g, (m, pre, word) =>
        pre === "." || new RegExp(`(?:^|[^.\w$])${word}\\s*[(=;,:)}\\]]`).test(pre + word) ? m : pre + "_",
      )
      .replace(/void0/g, "undefined")
      // minifier 把 _ !== undefined 收缩成真值测试（if (x !== undefined) → if (x)），重打印不会；
      // 两个方向都归一到收缩形式。
      .replace(/_!==undefined/g, "_")
      .replace(/_===undefined/g, "_")
      // dist 的 "export default function(){}" / "export default class{}" 是匿名声明，
      // bundle 打平后变成具名 "function name(){}"——归一到具名形式（名字位置占 _）。
      .replace(/exportdefault(function|class)(?=[({])/g, "$1_")
      .replace(/exportdefault(?=[A-Za-z_$])/g, "")
      .replace(/(?:let|const|var)_=(class|function)_/g, "$1_")
      // 匿名类表达式 `var X = class extends Y {}`（dist 里的写法）与具名 `class X extends Y {}` 归一
      .replace(/(?:let|const|var)_=class(?=extends|\{)/g, "class_")
      // 打包器会把相邻的 let/var 声明合并成 const、把 x += 1 缩成 x++、把 === 缩成 ==，两边写法不同
      .replace(/(?<![.\w$])(?:let|var)(?=[_{[])/g, "const")
      .replace(/_\+=1(?![\d.])/g, "_++")
      .replace(/_-=1(?![\d.])/g, "_--")
      .replace(/!==/g, "!=")
      .replace(/===/g, "==")
      .replace(/;/g, ""),
  );

// 尾部标识符：从末尾往前扫，比 result.match(/([A-Za-z_$][\w$]*)$/) 快得多——后者在每次遇到
// "(" 时都对整个已累积的 result 做一次 $ 锚定回溯，字符串越长越慢（实测占 82% 的 CPU）。
const trailingWord = (s) => {
  let i = s.length;
  while (i > 0) {
    const c = s.charCodeAt(i - 1);
    const isWord = (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 36 || c === 95;
    if (!isWord) break;
    i--;
  }
  return s.slice(i);
};

// 叶子花括号的**前文**判断它是不是表达式位置的对象字面量：
// 函数体 / if 块 / 箭头函数体前面的 `)` 不是；`=` `(` `,` `:` `[` `return` 之后的是。
// 只看末尾：末尾是 `)`/`]` 说明前面是函数签名或条件；是 `}` 说明前面是块；是标识符字符时取
// 尾部完整词判断是不是块关键字（旧实现在这里对 before 做了一次 $ 锚定正则，占了一半的 CPU）。
const isExprBrace = (before) => {
  if (!before.length) return true; // 文件/语句开头，多半是表达式
  const last = before[before.length - 1];
  if (last === ")" || last === "]") return false; // function f(){ / if(x){ / (a)=>{ 的体
  if (last === "}") return true; // 块结束后面的 { 一般是对象（保守）
  const word = trailingWord(before);
  if (!word) return true; // 末尾不是标识符字符（= ( , : [ 等），是表达式位置
  return !/^(function|if|else|for|while|do|try|catch|finally|switch|case|default|class|with|synchronized)$/.test(word);
};

// 对象字面量叶子成员按顶层逗号分割（跳过括号内的逗号），键序无关语义时排序用。
const sortLeafObject = (m, inner) => {
  const members = [];
  let depth = 0;
  let cur = "";
  for (const ch of inner) {
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      members.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur) members.push(cur);
  return "{" + members.slice().sort().join(",") + "}";
};

// minifier 会去掉位运算/逻辑条件、三元分支、算术分组、if 条件内层的外层括号，重打印不会；
// 括号内无逗号/花括号时删掉不改变结构。后缀含 "{" 是 if/while 条件、")" 是嵌套括号的直接子项，
// "?"/":" 前缀那条是三元分支整体带括号（cond ? (a) : d）。嵌套的要一层层删，循环到不动点。
const dropRedundantParens = (text) => {
  // 手写扫描器替代单层正则：terser 会删掉冗余括号（(a && b()) || c → a && b() || c），
  // 而未压缩的 dist 保留它们；正则 [^(),{}] 不允许组内再出现括号（函数调用），嵌套场景永远匹配不上。
  // 剥除条件（全部满足才剥）：深度平衡找到配对右括号；组内顶层无逗号/花括号（剥了会改变
  // 调用参数或对象结构）；前面不是调用括号（前字符是标识符字符时取完整词判断——抹名后
  // let_= 的尾部粘连词不算，= , ( { ? : 等分隔符后一定不是调用；return/typeof 等关键字后是）；
  // 前字符是 ? 的是三元真值分支，保守不剥（?: 假值分支和对象值 {k:(v)} 可剥）；
  // 后面紧跟运算符或语句边界。多轮到不动点。
  const KW = /^(return|typeof|case|new|in|of|do|else|void|delete|throw|await|yield)$/;
  // 跟在 ")" 后面、决定能不能剥的关键词最长 8 字（function），取 12 足够
  const AFTER = /^(\?|&&|\|\||\?\.|:|[-+*/%<>=]|\{|\}|\)|$|let|const|var|return|if|for|while|function|class|new|typeof|throw|case|switch|do|try)/;
  for (let round = 0; round < 8; round++) {
    let changed = false;
    let result = "";
    let i = 0;
    while (i < text.length) {
      if (text[i] === "(") {
        const prevCh = result.length ? result[result.length - 1] : "";
        let isCall = false;
        if (/[\w$]/.test(prevCh)) {
          isCall = !KW.test(trailingWord(result));
        } else if (prevCh === ")" || prevCh === "]") {
          isCall = true;
        }
        // 三元分支的括号（a?(g):h / a?b:(c)）也剥：三元右结合，去掉括号不改变结合，
        // terser 两侧都会做这个收缩。
        let depth = 1;
        let j = i + 1;
        while (j < text.length && depth > 0) {
          if (text[j] === "(") depth++;
          else if (text[j] === ")") depth--;
          if (depth === 0) break;
          j++;
        }
        if (depth === 0 && !isCall) {
          const inner = text.slice(i + 1, j);
          let d2 = 0;
          let topLevel = true;
          for (const ch of inner) {
            if (ch === "(") d2++;
            else if (ch === ")") d2--;
            else if ((ch === "," || ch === "{" || ch === "}") && d2 === 0) {
              topLevel = false;
              break;
            }
          }
          // 展开 `...(a ? b : {})`：Babel 重打印会给展开的条件表达式加括号，dist 里没有。
          // 组内带花括号也安全，只要顶层（括号、花括号之外）没有逗号。
          let spreadOk = false;
          if (!topLevel && result.endsWith("...")) {
            let p2 = 0, b2 = 0, hasComma = false;
            for (const ch of inner) {
              if (ch === "(") p2++; else if (ch === ")") p2--; else if (ch === "{") b2++; else if (ch === "}") b2--;
              else if (ch === "," && p2 === 0 && b2 === 0) { hasComma = true; break; }
            }
            spreadOk = !hasComma;
          }
          if ((topLevel || spreadOk) && inner.length > 0 && AFTER.test(text.slice(j + 1, j + 13))) {
            result += inner;
            i = j + 1;
            changed = true;
            continue;
          }
        }
      }
      result += text[i];
      i++;
    }
    text = result;
    if (!changed) return text;
  }
  return text;
};

const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], ...opts });

/** 下载并解开 name@version，返回包目录。 */
export function fetchPackage(cacheDir, name, version) {
  const dir = path.join(cacheDir, `${name.replace("/", "__")}@${version}`);
  if (!existsSync(path.join(dir, "package"))) {
    mkdirSync(dir, { recursive: true });
    const tgz = sh("npm", ["pack", `${name}@${version}`, "--silent"], { cwd: dir }).trim().split("\n").pop();
    sh("tar", ["xzf", tgz], { cwd: dir });
  }
  return path.join(dir, "package");
}

// ---- 包的导出表：按 package.json 的 exports / module / main 找 ESM 入口，顺着 export * 展开 ----

const CONDITIONS = ["browser", "import", "module", "default"];
function pickTarget(entry) {
  if (typeof entry === "string") return entry;
  if (Array.isArray(entry)) return entry.map(pickTarget).find(Boolean);
  if (entry && typeof entry === "object") {
    for (const c of CONDITIONS) if (c in entry) {
      const r = pickTarget(entry[c]);
      if (r) return r;
    }
  }
  return null;
}
/** { 子路径: 入口文件 }，子路径 "." 是包本身。带 * 的子路径不展开。 */
function entriesOf(pkgDir) {
  const pj = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf8"));
  const out = {};
  if (pj.exports && typeof pj.exports === "object" && Object.keys(pj.exports).some((k) => k.startsWith("."))) {
    for (const [k, v] of Object.entries(pj.exports)) {
      if (k.includes("*") || k.endsWith(".json") || k === "./package.json") continue;
      const target = pickTarget(v);
      if (target && /\.m?js$/.test(target)) out[k] = path.join(pkgDir, target);
    }
  } else {
    const target = pickTarget(pj.exports) ?? pj.module ?? pj.main ?? "index.js";
    out["."] = path.join(pkgDir, target.endsWith(".js") || target.endsWith(".mjs") ? target : `${target}.js`);
  }
  return out;
}
// 导出别名（export { local as exported }）：bundle 打平后 app 代码直接用包的内部名
// （d3-zoom 的 identity），而 npm 版只能按导出名 import（zoomIdentity）。names 收导出名，
// aliases 收 内部名 → 导出名，匹配时两边都试。
function exportNamesOf(file, seen = new Set(), aliases = null) {
  if (seen.has(file) || !existsSync(file)) return new Set();
  seen.add(file);
  const names = new Set();
  let ast;
  try {
    ast = parse(readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  } catch {
    return names;
  }
  for (const n of ast.program.body) {
    if (t.isExportNamedDeclaration(n)) {
      if (n.declaration) Object.keys(t.getBindingIdentifiers(n.declaration, false, true)).forEach((x) => names.add(x));
      for (const s of n.specifiers) {
        const exported = t.isIdentifier(s.exported) ? s.exported.name : s.exported.value;
        names.add(exported);
        if (aliases && t.isIdentifier(s.local) && s.local.name !== exported) aliases.set(s.local.name, exported);
      }
    } else if (t.isExportDefaultDeclaration(n)) {
      names.add("default");
      // default 导出的声明名（export default function foo）也记进导出表：bundle 里包的
      // 引用者用的是声明名（OrderedMap），npm 要按 default 导入——baseCandidates 匹配不到
      // 'default'，这里把声明名 → default 的映射补上（spec 用文件名，调用方有 spec 信息）。
      const decl = n.declaration;
      const declName = t.isIdentifier(decl) ? decl.name : t.isFunctionDeclaration(decl) || t.isClassDeclaration(decl) ? decl.id?.name : undefined;
      if (declName && aliases) aliases.set(declName, "default");
    }
    else if (t.isExportAllDeclaration(n)) {
      if (n.exported) names.add(n.exported.name);
      else if (n.source.value.startsWith(".")) {
        let f = path.resolve(path.dirname(file), n.source.value);
        if (!existsSync(f) || statSync(f).isDirectory()) f = [".js", ".mjs", "/index.js", "/index.mjs"].map((x) => f + x).find(existsSync) ?? f;
        for (const x of exportNamesOf(f, seen, aliases)) if (x !== "default") names.add(x);
      }
    }
  }
  return names;
}
/** 名字 → 从哪个子路径导入（优先包本身）。别名（内部名 → 导出名）记进第二张表。 */
function exportMap(pkgDir, name) {
  const map = new Map();
  const aliases = new Map(); // 内部名 → 导出名（import 时用导出名）
  const entries = Object.entries(entriesOf(pkgDir)).sort(([a], [b]) => (a === "." ? -1 : b === "." ? 1 : a.length - b.length));
  for (const [sub, file] of entries) {
    const spec = sub === "." ? name : `${name}/${sub.slice(2)}`;
    for (const x of exportNamesOf(file, new Set(), aliases)) if (!map.has(x)) map.set(x, spec);
  }
  return { map, aliases };
}

// bundle 打平后 app 代码可能直接用包的**模块内部名**（d3-zoom 的 noevent / ZoomEvent），npm 根
// 入口不导出它们。包的 package.json 没有 "." 开头的 exports 键时子路径不受封锁，可以从模块
// 文件本身 import（d3-zoom/src/noevent.js）；有 "." 键的包（@base-ui/react）封锁，只能留在 vendor。
function deepExportMap(pkgDir, name) {
  const pj = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf8"));
  if (pj.exports && Object.keys(pj.exports).some((k) => k.startsWith("."))) return null;
  const map = new Map();
  for (const f of moduleGraph(pkgDir)) {
    const rel = path.relative(pkgDir, f).replaceAll("\\", "/");
    const spec = `${name}/${rel}`;
    for (const x of exportNamesOf(f)) {
      const key = x === "default" ? path.basename(f, ".js") : x; // default 用文件名当键（d3-zoom/src/event.js 的 ZoomEvent）
      if (!map.has(key) && key !== "index") map.set(key, { spec, imported: x });
    }
  }
  return map;
}

// ---- vendor 语句之间的关系 ----

function analyze(ast) {
  const body = ast.program.body;
  const index = new Map(body.map((n, i) => [n, i]));
  const topOf = (p) => {
    let cur = p;
    while (cur.parentPath && !cur.parentPath.isProgram()) cur = cur.parentPath;
    return index.get(cur.node);
  };
  const declOf = new Map();
  const namesOf = body.map(() => []);
  const refs = body.map(() => new Set()); // i 引用了哪些名字（顶层）
  const mutates = body.map(() => new Set()); // i 在初始化时给哪些顶层名字挂属性 / 赋值
  traverse.cache.clear();
  traverse(ast, {
    Program(p) {
      for (const [name, b] of Object.entries(p.scope.bindings)) {
        const d = topOf(b.path);
        declOf.set(name, d);
        namesOf[d].push(name);
      }
    },
    ReferencedIdentifier(p) {
      const b = p.scope.getBinding(p.node.name);
      if (b && b.scope.path.isProgram()) refs[topOf(p)].add(p.node.name);
    },
    "AssignmentExpression|UpdateExpression"(p) {
      let target = p.isAssignmentExpression() ? p.node.left : p.node.argument;
      while (t.isMemberExpression(target)) target = target.object;
      if (!t.isIdentifier(target)) return;
      const b = p.scope.getBinding(target.name);
      if (b && b.scope.path.isProgram()) mutates[topOf(p)].add(target.name);
    },
  });
  return { body, declOf, namesOf, refs, mutates };
}

// 打包器生成的辅助函数（CommonJS 互操作、esbuild 的类字段 / 装饰器转换），不属于任何包
const isBundlerHelper = (n) => /^(__|_mergeNamespaces|getDefaultExportFromCjs|getAugmentedNamespace|commonjsGlobal)/.test(n);

// CommonJS 互操作的派生语句：const React = getDefaultExportFromCjs(reactExports) 之类
const isInterop = (n) =>
  t.isVariableDeclaration(n) &&
  n.declarations.every((d) => t.isCallExpression(d.init) && t.isIdentifier(d.init.callee) && isBundlerHelper(d.init.callee.name));

const baseCandidates = (n) => [...new Set([n, n.replace(/\$\d+$/, ""), n.replace(/\$\d+$/, "").replace(/\d+$/, ""), n.replace(/\$/g, "")])];

/**
 * 在 vendor AST 上做替换。src 是 vendor 语句的原文来源（bundle 源码），语句节点带 start/end。
 * externalRefs：main 引用的 vendor 名字。返回每个包的报告。
 */
export function swapPackages(vendorAst, src, externalRefs, list, { cacheDir, log = console.log }) {
  const reports = [];
  const imports = []; // [spec, imported, local]
  // 只分析一次：换掉的语句记进 a.swapped，当作"已由 npm 提供"（相当于 import），后面的包照常看它们
  const a = analyze(vendorAst);
  a.swapped = new Set();
  a.shapes = a.body.map((n) => (n.start == null ? "" : norm(src.slice(n.start, n.end))));
  // 剥掉声明头后的"表体"也跟包无关，一次算好（原来每个包都要 7000 条重算一遍）。
  a.bodies = a.shapes.map(stripHead);
  for (const item of list) {
    const pkgDir = fetchPackage(cacheDir, item.name, item.version);
    const report = { name: item.name, version: item.version };
    reports.push(report);
    const mine = [];
    const removed = item.cjs ? swapCjs(a, item, mine, report) : swapEsm(a, src, externalRefs, item, pkgDir, mine, report);
    if (removed) imports.push(...mine);
    if (!removed) {
      log(`  ✗ ${item.name}@${item.version}：${report.error}`);
      continue;
    }
    for (const i of removed) a.swapped.add(i);
    log(`  ✓ ${item.name}@${item.version}：删 ${removed.size} 条语句（${report.lines} 行），导入 ${report.imports} 个名字`);
  }
  vendorAst.program.body = a.body.filter((_, i) => !a.swapped.has(i));
  // 按包分组写 import
  const bySpec = new Map();
  for (const [spec, imported, local] of imports) {
    if (!bySpec.has(spec)) bySpec.set(spec, []);
    bySpec.get(spec).push([imported, local]);
  }
  // 一条 import 只能有一个默认导入：默认导入各自一条，具名导入合成一条
  const decls = [...bySpec].flatMap(([spec, list]) => {
    const named = list.filter(([imported]) => imported !== "default");
    return [
      ...list.filter(([imported]) => imported === "default").map(([, local]) => t.importDeclaration([t.importDefaultSpecifier(t.identifier(local))], t.stringLiteral(spec))),
      ...(named.length ? [t.importDeclaration(named.map(([imported, local]) => t.importSpecifier(t.identifier(local), t.identifier(imported))), t.stringLiteral(spec))] : []),
    ];
  });
  vendorAst.program.body.unshift(...decls);
  const dropped = dropDead(vendorAst, externalRefs);
  if (dropped) log(`  清理没人引用的定义 ${dropped} 条`);
  return reports;
}

/** ESM 入口顺着相对路径的 import / export … from 能走到的文件（不含 UMD 整合版之类会把依赖打进去的文件）。 */
export function moduleGraph(pkgDir) {
  const seen = new Set();
  const resolve = (from, spec) => {
    const f = path.resolve(path.dirname(from), spec);
    return [f, `${f}.js`, `${f}.mjs`, path.join(f, "index.js"), path.join(f, "index.mjs")].find((x) => existsSync(x) && statSync(x).isFile());
  };
  const walk = (file) => {
    if (!file || seen.has(file)) return;
    seen.add(file);
    let ast;
    try {
      ast = parse(readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
    } catch {
      return;
    }
    for (const n of ast.program.body) if ((t.isImportDeclaration(n) || t.isExportNamedDeclaration(n) || t.isExportAllDeclaration(n)) && n.source?.value.startsWith(".")) walk(resolve(file, n.source.value));
  };
  for (const f of Object.values(entriesOf(pkgDir))) walk(f);
  return [...seen];
}

// 声明头（const/var/let/export default）两侧形态不同（vendor 是打平后的顶层声明，dist 是模块
// 导出语句），比"语句体是否是 dist 文本的子串"时把头剥掉；命中的判别靠 40+ 字的表体本身。
const stripHead = (s) => s.replace(/^(?:export)?(?:const|var|let)_=/, "").replace(/^exportdefault/, "");

function swapEsm(a, src, externalRefs, item, pkgDir, imports, report) {
  const { body, declOf, namesOf, refs, mutates, swapped } = a;
  const files = moduleGraph(pkgDir);
  if (!files.length) return fail(report, "找不到 ESM 入口");
  const text = files.map((f) => norm(readFileSync(f, "utf8"))).join("\n");
  const shapes = a.shapes;
  const bodies = a.bodies;
  const isImport = (i) => swapped.has(i) || t.isImportDeclaration(body[i]);
  const hit = shapes.map((s, i) => {
    if (isImport(i) || s.length === 0) return false;
    const stmtBody = bodies[i];
    return stmtBody.length > 0 && (text.includes(stmtBody) || (stmtBody.length >= 400 && text.includes(stmtBody.slice(0, 400))));
  });
  // 阈值必须量"命中时实际拿去比的那段文本"（剥头后的表体），不能量带声明头的整体：
  // `const win = typeof window !== "undefined" ? window : void 0;` 整体 40 字刚好过线，
  // 剥掉 `const_=` 只剩 33 字的通用片段，能匹配上任何声明了同名风格的包，于是被当成
  // 这个包的长语句锚点，把不相干的语句拉成簇、再被 main 用到就成了"不是包的导出"。
  const strong = (i) => hit[i] && bodies[i].length >= 40;
  const head = (i) => src.slice(body[i].start, body[i].start + 60).replace(/\s+/g, " ");
  // 属于这个包：长语句命中；短语句命中且前后最近的长语句也是它的；夹在它的长语句中间（≤3 条）没命中的
  // （打包时被改写过，比如 process.env.NODE_ENV 被替换）也算。
  // 但"形状恰好是包文本子串"会误收别处的语句（一行箭头函数结构到处都是，如 query-core 的
  // functionalUpdate 命中 floating-ui/utils）。包的真代码在 vendor 里基本是一段连续区间（rollup
  // 按模块顺序输出），所以按命中位置分簇；只把"主簇 + 递归与已保留区间相邻（间隔 ≤ GAP）"当作
  // 本体的 strong，其余命中降级为"短语句"待遇——冲突时可以被 evict 掉而不是直接报错。
  const GAP = 50;
  const clusters = [];
  for (let i = 0; i < body.length; i++) if (strong(i)) {
    if (clusters.length && i - clusters[clusters.length - 1][clusters[clusters.length - 1].length - 1] <= GAP) clusters[clusters.length - 1].push(i);
    else clusters.push([i]);
  }
  const kept = (() => {
    if (clusters.length <= 1) return new Set(clusters.flat());
    const main = clusters.reduce((a, b) => (b.length > a.length ? b : a));
    const keep = [main];
    // 一个大包会被 rollup 打成几段（如 base-ui 632 文件分两段，间隔 ~100）：从主簇出发
    // 反复并上间隔 ≤ GAP 的邻簇。孤立的远处小簇（误收）永远够不着。
    for (let grew = true; grew; ) {
      grew = false;
      const span = [Math.min(...keep.map((c) => c[0])), Math.max(...keep.map((c) => c[c.length - 1]))];
      for (const c of clusters) {
        if (keep.includes(c)) continue;
        if (c[0] <= span[1] + GAP && c[c.length - 1] >= span[0] - GAP) {
          keep.push(c);
          grew = true;
        }
      }
    }
    return new Set(keep.flat());
  })();
  const inBody = (i) => kept.has(i);
  const strongIdx = [];
  for (let i = 0; i < body.length; i++) if (strong(i)) strongIdx.push(i);
  const mine = new Set(strongIdx.filter(inBody));
  for (let k = 0; k + 1 < strongIdx.length; k++) {
    const [lo, hi] = [strongIdx[k], strongIdx[k + 1]];
    if (!inBody(lo)) continue;
    // 夹缝语句（≤3 条没命中的，打包时被改写过）只在它自足时收：引用了夹缝外的顶层名字的
    // 多半是紧贴的邻包（w3c-keyname 旁边贴着 codemirror 的 windows）。
    if (hi - lo - 1 > 0 && hi - lo - 1 <= 3)
      for (let i = lo + 1; i < hi; i++) {
        if (isImport(i)) continue;
        let selfContained = true;
        for (const n of refs[i]) {
          const d = declOf.get(n);
          if (d === undefined || d === i || (lo <= d && d <= hi) || isBundlerHelper(n)) continue;
          selfContained = false;
          break;
        }
        if (selfContained) mine.add(i);
      }
  }
  const near = (i, dir) => {
    for (let j = i + dir; j >= 0 && j < body.length && Math.abs(j - i) <= 5; j += dir) if (strong(j)) return j;
    return -1;
  };
  for (let i = 0; i < body.length; i++) if (hit[i] && !strong(i) && (mine.has(near(i, -1)) || mine.has(near(i, 1)))) mine.add(i);
  // 连续短语句链（lower16 → makeRecover → recoverIndex 这种全 <40 字的依赖链）近邻没有
  // strong 锚点时 near 收不进整链。对已收的短语句做引用闭包：它们引用的 hit 短语句一并收。
  for (let grew = true; grew; ) {
    grew = false;
    for (const i of mine) {
      if (strong(i)) continue;
      for (const n of refs[i]) {
        const d = declOf.get(n);
        if (d !== undefined && !mine.has(d) && hit[d] && !strong(d)) {
          mine.add(d);
          grew = true;
        }
      }
    }
  }
  if (!mine.size) return fail(report, "vendor 里没找到这个包的代码（版本不对？）");

  // 反复检查三种冲突。冲突落在短语句 / 夹缝语句 / 簇外的误命中上（多半是邻居包的，let x = 0
  // 这种形状到处都有）就把它踢出去重来；落在主簇的长语句上说明真有问题，记下来报错。
  // 循环每轮要全量扫 body（上万条语句 × 几百轮 evict 是主要耗时），把规则 1、2 的 O(body)
  // 扫描改成一次预计算的倒排：
  //   declInMine   名字 → 声明它的 mine 语句（evict 时移除）
  //   outsideUsers 名字 → mine 外引用/挂属性它的语句集合（needed 就是它非空的那些）
  const solid = (i) => strong(i) && inBody(i);
  const { map: exportsMap, aliases } = exportMap(pkgDir, item.name);
  const deep = deepExportMap(pkgDir, item.name);
  // 匹配顺序：名字本身 → re-export 别名（identity → zoomIdentity）→ 模块内部名深路径
  // （noevent → d3-zoom/src/noevent.js，仅无 exports 封锁的包）。返回 [spec, imported]。
  const mapName = (n) => {
    for (const c of baseCandidates(n)) if (exportsMap.has(c)) return [exportsMap.get(c), c];
    for (const c of baseCandidates(n)) if (aliases.has(c)) return [item.name, aliases.get(c)];
    if (deep) for (const c of baseCandidates(n)) if (deep.has(c)) return [deep.get(c).spec, deep.get(c).imported];
    return undefined;
  };
  const declInMine = new Map();
  for (const i of mine) for (const n of namesOf[i]) declInMine.set(n, i);
  const outsideUsers = new Map();
  const outSet = new Set(); // mine 外、和 mine 有引用/挂属性关系的语句（规则 1 只需要扫这些）
  {
    const mineDecls = new Set(declInMine.keys());
    for (let i = 0; i < body.length; i++) {
      if (mine.has(i) || isImport(i)) continue;
      let touches = false;
      for (const n of refs[i]) if (mineDecls.has(n)) {
        touches = true;
        if (!outsideUsers.has(n)) outsideUsers.set(n, new Set());
        outsideUsers.get(n).add(i);
      }
      if (!touches) for (const n of mutates[i]) if (mineDecls.has(n)) {
        touches = true;
        if (!outsideUsers.has(n)) outsideUsers.set(n, new Set());
        outsideUsers.get(n).add(i);
      }
      if (touches) outSet.add(i);
    }
    for (const n of externalRefs) if (declInMine.has(n)) outsideUsers.set(n, new Set([null])); // null 占位 = main 在用（不因空集被跳过）
  }
  let problems;
  let mapped;
  for (;;) {
    problems = [];
    const evict = new Set();
    // 1. 外面没认出的语句在初始化时给它的对象挂属性（X.none = …）：命中原文就收进来，否则冲突
    for (const i of outSet) {
      if (mine.has(i)) continue;
      const targets = [...mutates[i]].map((n) => declInMine.get(n)).filter((d) => d !== undefined && mine.has(d));
      if (!targets.length) continue;
      if (hit[i]) mine.add(i);
      else for (const d of targets) solid(d) ? problems.push(`外面有语句给它的对象挂属性：${head(i)}`) : evict.add(d);
    }
    // 2. 对外暴露的名字都要是包的导出
    mapped = [];
    for (const [n, users] of outsideUsers) {
      const d = declInMine.get(n);
      if (d === undefined || !mine.has(d)) continue; // 已被 evict 掉
      let usedOutside = false;
      for (const u of users) if (!mine.has(u)) {
        usedOutside = true;
        break;
      }
      if (!usedOutside) continue;
      const e = mapName(n);
      if (e) mapped.push([e[0], e[1], n]);
      else if (solid(d)) {
        const u = [...users].find((x) => !mine.has(x));
        problems.push(`${n} 不是包的导出（${u == null ? "main 在用" : `被 ${head(u)} 引用`}）`);
      } else evict.add(d);
    }
    // 3. 它的代码引用的 vendor 语句只能是已换成 npm 的包、打包器辅助函数或 CommonJS 互操作语句。
    //    否则要么这个包还有没认出来的代码（删一半留一半），要么它依赖的包还没换（npm 版会带进第二份）。
    for (const i of mine) for (const n of refs[i]) {
      const d = declOf.get(n);
      if (d === undefined || mine.has(d) || isImport(d) || isBundlerHelper(n) || isInterop(body[d])) continue;
      if (solid(i)) problems.push(`引用了不属于它的 ${n}（${head(d)}）`);
      else evict.add(i);
    }
    if (!evict.size) break;
    for (const d of evict) {
      mine.delete(d);
      for (const n of namesOf[d]) declInMine.delete(n);
    }
  }
  if (problems.length) return fail(report, `${problems.length} 处冲突：\n      ${[...new Set(problems)].slice(0, 6).join("\n      ")}`);

  const pj = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf8"));
  report.deps = Object.keys({ ...pj.dependencies, ...pj.peerDependencies });
  imports.push(...mapped);
  report.imports = mapped.length;
  report.lines = [...mine].reduce((s, i) => s + (body[i].loc ? body[i].loc.end.line - body[i].loc.start.line + 1 : 0), 0);
  return mine;
}

function swapCjs(a, item, imports, report) {
  const { body, declOf } = a;
  const replaced = new Set();
  const absent = Object.keys(item.cjs).filter((fn) => declOf.get(fn) === undefined);
  if (absent.length) return fail(report, `vendor 里没有 ${absent.join(", ")}`);
  for (const [fn, spec] of Object.entries(item.cjs)) {
    const d = declOf.get(fn);
    const local = `__ov_${spec.replace(/[^\w]/g, "_")}`;
    imports.push([spec, "default", local]);
    // function requireReact() {…} → function requireReact() { return __ov_react; }（别的包装函数里可能还在调它）
    body[d] = t.functionDeclaration(t.identifier(fn), [], t.blockStatement([t.returnStatement(t.identifier(local))]));
    a.refs[d] = new Set();
    a.mutates[d] = new Set();
    // var reactExports = requireReact(); → import reactExports from "react";
    body.forEach((n, i) => {
      if (!t.isVariableDeclaration(n) || n.declarations.length !== 1) return;
      const [v] = n.declarations;
      if (t.isIdentifier(v.id) && t.isCallExpression(v.init) && t.isIdentifier(v.init.callee, { name: fn }) && !v.init.arguments.length) {
        imports.push([spec, "default", v.id.name]);
        replaced.add(i);
      }
    });
  }
  report.imports = Object.keys(item.cjs).length;
  report.lines = 0;
  report.deps = item.deps ?? [];
  // 实现部分（requireReact_production、hasRequired…、react = { exports: {} }）在最后统一清理没人引用的定义时删掉
  return replaced;
}

/** 删掉没人引用、没有副作用的顶层定义（反复做，直到不再变化）。keep：外部（main）引用的名字。 */
export function dropDead(ast, keep) {
  const pure = (n) =>
    t.isFunctionDeclaration(n) ||
    (t.isVariableDeclaration(n) &&
      n.declarations.every((d) => t.isIdentifier(d.id) && (!d.init || t.isLiteral(d.init) || t.isFunction(d.init) || (t.isObjectExpression(d.init) && d.init.properties.every((p) => t.isObjectProperty(p) && !p.computed && (t.isLiteral(p.value) || t.isObjectExpression(p.value) && !p.value.properties.length))))));
  let dropped = 0;
  for (;;) {
    const a = analyze(ast);
    const used = new Set(keep);
    a.body.forEach((_, i) => {
      for (const n of a.refs[i]) if (a.declOf.get(n) !== i) used.add(n);
      for (const n of a.mutates[i]) if (a.declOf.get(n) !== i) used.add(n);
    });
    const dead = new Set(a.body.flatMap((n, i) => (pure(n) && a.namesOf[i].length && !a.namesOf[i].some((x) => used.has(x)) ? [i] : [])));
    if (!dead.size) break;
    dropped += dead.size;
    ast.program.body = a.body.filter((_, i) => !dead.has(i));
  }
  ast.program.body = ast.program.body.filter((n) => !t.isEmptyStatement(n));
  return dropped;
}

function fail(report, error, extra = {}) {
  Object.assign(report, { error }, extra);
  return null;
}

export { generate };
