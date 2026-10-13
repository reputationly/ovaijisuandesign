// 闭包外引用检查：读取配对结果，找出闭包内 src 声明被闭包外的哪些声明/语句引用（换包后这些引用需改为从 npm 导入）
// 用法：node users.mjs <pairs.json>... --out <out.json>
import fs from "node:fs"; import path from "node:path"; import { execSync } from "node:child_process";
import { Graph } from "./xcanon.mjs";
const SRC = "/home/ubuntu/wt-desource/app/renderer/src/";
const args = process.argv.slice(2); const oi = args.indexOf("--out"); const out = args[oi + 1]; const inputs = args.filter((_, i) => i !== oi && i !== oi + 1);
const closure = new Set();
for (const f of inputs) for (const p of JSON.parse(fs.readFileSync(f, "utf8")).pairs) if (p.src.includes("#") && !/^(global|ext):/.test(p.src) && !p.verdict.startsWith("src-inline")) closure.add(p.src);
const cfiles = new Set([...closure].map((k) => k.split("#")[0]));
// 候选引用文件：闭包所在文件 + 任何 import 这些文件的文件
const all = execSync(`cd ${SRC} && find . -name '*.js' -o -name '*.jsx'`).toString().trim().split("\n").map((x) => x.slice(2));
const cand = new Set(cfiles);
for (const f of all) { const s = fs.readFileSync(SRC + f, "utf8"); for (const c of cfiles) { const base = path.basename(c); if (s.includes("/" + base + '"') || s.includes("./" + base + '"')) cand.add(f); } }
const g = new Graph(); const users = {}; const tick = Date.now();
for (const f of cand) {
  const m = g.mod(SRC + f);
  for (const d of m.decls.values()) {
    const key = f + "#" + d.name; if (closure.has(key)) continue;
    let s; try { s = g.shape(SRC + key); } catch { continue; }
    for (const r of s.refs || []) { const k = r.startsWith(SRC) ? r.slice(SRC.length) : r; if (closure.has(k)) (users[k] ??= new Set()).add(key); }
  }
  // 非声明语句（如 X.displayName = ...、副作用调用）：按标识符文本粗查
  const code = fs.readFileSync(SRC + f, "utf8");
  for (const o of m.other) if (o.start != null && o.kind === "ExpressionStatement") {
    const txt = code.slice(o.start, o.end);
    for (const k of closure) { const [kf, kn] = k.split("#"); if (kf !== f) continue; if (new RegExp("(^|[^\\w$])" + kn.replace(/\$/g, "\\$") + "([^\\w$]|$)").test(txt)) (users[k] ??= new Set()).add(f + "@stmt:" + o.line); }
  }
}
const res = Object.fromEntries(Object.entries(users).map(([k, v]) => [k, [...v].sort()]));
fs.writeFileSync(out, JSON.stringify({ closureSize: closure.size, closureFiles: [...cfiles], candidateFiles: [...cand], usedOutside: res }, null, 1));
console.log("closure", closure.size, "files", [...cfiles].join(","), "cand", cand.size, "usedOutside", Object.keys(res).length, ((Date.now() - tick) / 1000) + "s");
for (const [k, v] of Object.entries(res)) console.log(k, "<-", v.filter((x) => !x.includes("@stmt")).slice(0, 6).join(" "), v.some((x) => x.includes("@stmt")) ? "(+stmt)" : "");
