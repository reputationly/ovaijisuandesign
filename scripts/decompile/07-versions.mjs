// 反推官方用的第三方库版本：对每个包，取截止日期前最近的若干版本，下载发布包，
// 统计主 bundle 里有多少条语句（按"形状"）能在该版本里原样找到；命中最多的就是官方版本。
//   node 07-versions.mjs <bundle.js> <cutoff YYYY-MM-DD> [pkg ...]
import { parse } from "@babel/parser";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const HERE = new URL(".", import.meta.url).pathname;
const [bundle, cutoff, ...only] = process.argv.slice(2);
const CACHE = path.join(HERE, "pkg-cache");
mkdirSync(CACHE, { recursive: true });
const cls = JSON.parse(readFileSync(path.join(HERE, "classified.json"), "utf8"));
const src = readFileSync(bundle, "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
const body = ast.program.body;

const KEYWORDS = new Set("break case catch class const continue debugger default delete do else export extends false finally for function if import in instanceof let new null return super switch this throw true try typeof var void while with yield async await of static get set undefined".split(" "));
const norm = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1")
    // 展开 `...x` / `...x` 里的 x 也要抹掉：正则的 `(\.?)` 前缀在 `...x` 上匹配不到分隔符，
    // 于是 `...state2` 原样留着，而同一模板的 `...state` 会被抹成 `..._`——两个版本的同一段
    // 代码因此对不上（下一条规则 `_(\._)+` 也救不了，因为压根没变成 `_`）。
    .replace(/\.\.\.\s*([A-Za-z_$][\w$]*)/g, (m, id) => (KEYWORDS.has(id) ? m : "..." + "_"))
    .replace(/(\.?)([A-Za-z_$][\w$]*)/g, (m, dot, id) => (dot || KEYWORDS.has(id) ? m : "_"))
    .replace(/_\.jsxs?\(/g, "_(")
    .replace(/_(\._)+/g, "_")
    .replace(/\s+/g, "")
    .replace(/,([}\])])/g, "$1");

// 每条语句的探针（形状前 400 字符），只要够长的
const probes = body.map((n) => {
  const p = norm(src.slice(n.start, n.end));
  return p.length >= 60 ? p.slice(0, 400) : null;
});

const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], ...opts });
function versionsBefore(pkg) {
  const times = JSON.parse(sh("npm", ["view", pkg, "time", "--json"]));
  return Object.entries(times)
    .filter(([v, d]) => /^\d+\.\d+\.\d+$/.test(v) && d.slice(0, 10) <= cutoff)
    .sort((a, b) => (a[1] < b[1] ? -1 : 1))
    .map(([v]) => v);
}
function fetchText(pkg, v) {
  const dir = path.join(CACHE, `${pkg.replace("/", "__")}@${v}`);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    const tgz = sh("npm", ["pack", `${pkg}@${v}`, "--silent"], { cwd: dir }).trim().split("\n").pop();
    sh("tar", ["xzf", tgz], { cwd: dir });
  }
  let text = "";
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      const p = path.join(d, n);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(m?js|cjs)$/.test(n) && !/\.d\./.test(n) && st.size < 8_000_000) text += norm(readFileSync(p, "utf8")) + "\n";
    }
  };
  walk(path.join(dir, "package"));
  return text;
}

const pkgs = only.length ? only : [...new Set(cls.flatMap((s) => (s.kind === "lib" ? s.pkgs ?? [] : [])).filter((p) => p && !p.startsWith("(")))];
const result = {};
for (const pkg of pkgs) {
  try {
    const vs = versionsBefore(pkg).slice(-12);
    let best = { v: null, hits: -1 };
    const scores = [];
    for (const v of vs) {
      const text = fetchText(pkg, v);
      let hits = 0;
      for (const p of probes) if (p && text.includes(p)) hits++;
      scores.push(`${v}:${hits}`);
      if (hits > best.hits || (hits === best.hits && hits > 0)) best = { v, hits };
    }
    result[pkg] = { version: best.v, hits: best.hits, scores };
    console.log(pkg.padEnd(34), String(best.v).padEnd(10), best.hits, "|", scores.slice(-6).join(" "));
  } catch (e) {
    console.log(pkg.padEnd(34), "ERROR", String(e.message).slice(0, 80));
  }
}
const out = path.join(HERE, "versions.json");
const prev = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : {};
writeFileSync(out, JSON.stringify({ ...prev, ...result }, null, 1));
