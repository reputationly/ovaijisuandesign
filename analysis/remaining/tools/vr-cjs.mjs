// vendor.js 里 rollup commonjs 包装的模块（function requireX(){ if(hasRequiredX) return X; hasRequiredX=1; ...; return X }）
// 与候选 npm CJS 文件做词元级相似度比较。词元：标识符按首次出现顺序编号，属性名/字符串/数字/标点保留。
// 用法：node vr-cjs.mjs <requireName> <npmFile>...
import fs from "node:fs"; import { parse } from "@babel/parser"; import _gen from "@babel/generator"; import { diffArrays } from "diff";
const gen = _gen.default || _gen;
const V = "/home/ubuntu/wt-desource/app/renderer/src/vendor.js";
const code = fs.readFileSync(V, "utf8");
const ast = parse(code, { sourceType: "module", plugins: ["jsx"] });
function bodyOf(name) {
  const fn = ast.program.body.find((s) => s.type === "FunctionDeclaration" && s.id?.name === name);
  if (!fn) throw new Error("no " + name);
  let st = fn.body.body.slice();
  // 去掉守卫与返回
  if (st[0]?.type === "IfStatement") st.shift();
  if (st[0]?.type === "ExpressionStatement" && st[0].expression.type === "AssignmentExpression") st.shift();
  if (st.at(-1)?.type === "ReturnStatement") st.pop();
  return gen({ type: "Program", body: st, directives: [], sourceType: "script" }, { comments: false, compact: true }).code;
}
function normFile(f) {
  const s = fs.readFileSync(f, "utf8");
  const a = parse(s, { sourceType: "unambiguous", allowReturnOutsideFunction: true, plugins: ["jsx"], errorRecovery: true });
  return gen(a, { comments: false, compact: true }).code;
}
function toks(s) {
  const t = s.match(/[A-Za-z_$][\w$]*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\d[\w.]*|\S/g) || [];
  const ids = new Map(); const out = [];
  for (let i = 0; i < t.length; i++) {
    const x = t[i];
    if (/^[A-Za-z_$]/.test(x) && !/^(var|let|const|function|return|if|else|for|while|do|new|this|typeof|instanceof|in|of|null|true|false|void|delete|throw|try|catch|finally|switch|case|default|break|continue|class|extends|super)$/.test(x) && t[i - 1] !== ".") {
      out.push("I");
    } else out.push(x.startsWith("'") ? JSON.stringify(x.slice(1, -1)) : x);
  }
  return out;
}
const [name, ...files] = process.argv.slice(2);
const a = toks(bodyOf(name));
for (const f of files) {
  let b; try { b = toks(normFile(f)); } catch (e) { console.log(f, "parse error", e.message); continue; }
  let same = 0, add = 0, rem = 0; const samples = [];
  for (const p of diffArrays(a, b)) { if (p.added) { add += p.count; if (samples.length < 6) samples.push("npm+ " + p.value.slice(0, 12).join(" ")); } else if (p.removed) { rem += p.count; if (samples.length < 6) samples.push("src+ " + p.value.slice(0, 12).join(" ")); } else same += p.count; }
  console.log(`${name} vs ${f.replace(/^.*node_modules\//, "").replace(/^.*\/pkgs\//, "")}: src ${a.length} npm ${b.length} 相同 ${same} 相似度 ${(2 * same / (a.length + b.length) * 100).toFixed(2)}% src多 ${rem} npm多 ${add}`);
  for (const s of samples) console.log("   ", s);
}
