// 按 exports（浏览器/ESM 条件，按对象键序取第一个命中的条件）选入口，再沿相对 import 收集模块图
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
const CONDS = new Set(["browser", "module", "import", "production", "default"]);
function pick(v) {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) { for (const x of v) { const r = pick(x); if (r) return r; } return null; }
  if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (CONDS.has(k)) { const r = pick(x); if (r) return r; }
  return null;
}
export function entries(dir) {
  const pj = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"));
  const out = new Set();
  const ex = pj.exports;
  if (ex && typeof ex === "object" && !Array.isArray(ex) && Object.keys(ex).some((k) => k.startsWith("."))) {
    for (const [k, v] of Object.entries(ex)) {
      if (k === "./package.json") continue;
      const r = pick(v);
      if (!r || !/\.(m?js|cjs)$/.test(r)) continue;
      if (r.includes("*")) {
        const [pre, post] = r.split("*");
        const base = path.join(dir, pre.slice(0, pre.lastIndexOf("/") + 1));
        const re = new RegExp("^" + path.join(dir, pre).replace(/[.+?^${}()|[\]\\]/g, "\\$&") + "(.+)" + post.replace(/[.+?^${}()|[\]\\]/g, "\\$&") + "$");
        const walk = (d) => { for (const n of readdirSync(d)) { const f = path.join(d, n); if (statSync(f).isDirectory()) walk(f); else if (re.test(f) && !/\.d\.[mc]?ts$/.test(f)) out.add(f); } };
        if (existsSync(base)) walk(base);
      } else out.add(path.join(dir, r));
    }
  } else if (ex) {
    const r = pick(ex); if (r) out.add(path.join(dir, r));
  } else {
    const b = typeof pj.browser === "string" ? pj.browser : null;
    const r = pj.module || b || pj.main || "index.js";
    out.add(path.join(dir, r));
  }
  return { pj, entries: [...out].filter((f) => existsSync(f)) };
}
export function moduleFiles(dir) {
  const { pj, entries: es } = entries(dir);
  const seen = new Set();
  const stack = [...es];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/(?:from|import)\s*["'](\.{1,2}\/[^"']+)["']/g)) {
      let p = path.resolve(path.dirname(f), m[1]);
      for (const c of [p, p + ".js", p + ".mjs", path.join(p, "index.js")]) if (existsSync(c) && statSync(c).isFile()) { stack.push(c); break; }
    }
  }
  return { pj, files: [...seen].sort() };
}
