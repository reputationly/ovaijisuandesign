// 反推参照用的第三方库版本：对每个包，取截止日期前的候选版本（参照 package.json 里有版本约束就只看
// 满足约束的），下载发布包，数主 bundle 里有多少条库语句的"形状"（npm-swap.mjs 的 norm）能在该版本里
// 原样找到。命中最多的就是参照用的版本；并列时取最新的（并列说明打进去的代码完全一样）。
//
//   node --max-old-space-size=16384 scripts/decompile/npm-versions.mjs <截止日期 YYYY-MM-DD> 包名...
//
// 结果追加到 .probe/decompile/npm-versions.json，并打印成可以直接贴进 npm-packages.json 的行。
import { parse } from "@babel/parser";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchPackage, norm } from "./npm-swap.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const probe = path.join(repo, ".probe/decompile");
const [cutoff, ...pkgs] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(cutoff ?? "") || !pkgs.length) throw new Error("用法：npm-versions.mjs <YYYY-MM-DD> 包名...");

const bundle = path.join(repo, "reference/3.0.16/app/out/renderer/assets/index-C4qF1HE0.js");
const src = readFileSync(bundle, "utf8");
const body = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true }).program.body;
const cls = JSON.parse(readFileSync(path.join(probe, "classified.json"), "utf8"));
const shapes = [...new Set(body.flatMap((n, i) => (cls[i].kind === "lib" ? [norm(src.slice(n.start, n.end))] : [])).filter((s) => s.length >= 40))];
const ranges = JSON.parse(readFileSync(path.join(repo, "reference/3.0.16/app/package.json"), "utf8")).dependencies;

const sh = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
function candidates(pkg) {
  const times = JSON.parse(sh("npm", ["view", pkg, "time", "--json"]));
  let vs = Object.entries(times)
    .filter(([v, d]) => /^\d+\.\d+\.\d+$/.test(v) && d.slice(0, 10) <= cutoff)
    .sort((a, b) => (a[1] < b[1] ? -1 : 1))
    .map(([v]) => v);
  if (ranges[pkg]) {
    const ok = new Set(JSON.parse(sh("npm", ["view", `${pkg}@${ranges[pkg]}`, "version", "--json"]) || "[]"));
    const inRange = vs.filter((v) => ok.has(v));
    if (inRange.length) vs = inRange;
  }
  return vs.slice(-20);
}
function textOf(dir) {
  let text = "";
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      if (n === "node_modules") continue;
      const p = path.join(d, n);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(m?js|cjs)$/.test(n) && !/\.d\.[mc]?ts$/.test(n) && st.size < 12_000_000) text += norm(readFileSync(p, "utf8")) + "\n";
    }
  };
  walk(dir);
  return text;
}

const outFile = path.join(probe, process.env.OUT ?? "npm-versions.json");
const result = existsSync(outFile) ? JSON.parse(readFileSync(outFile, "utf8")) : {};
for (const pkg of pkgs) {
  try {
    const scores = [];
    for (const v of candidates(pkg)) {
      let text;
      // npm view time 里有版本、tarball 却已撤包（@tanstack/history@1.161.9 就是），
      // 取不到就跳过这个版本，别让一个坏版本把整包的检测带崩。
      try {
        text = textOf(fetchPackage(path.join(probe, "pkg-cache"), pkg, v));
      } catch (e) {
        console.log(`  ${pkg}@${v} 取不到，跳过（${String(e.message).split("\n")[0].slice(0, 60)}）`);
        continue;
      }
      scores.push([v, shapes.filter((s) => text.includes(s)).length]);
    }
    if (!scores.length) throw new Error("所有候选版本都取不到");
    const max = Math.max(...scores.map(([, n]) => n));
    const tied = scores.filter(([, n]) => n === max).map(([v]) => v);
    result[pkg] = { version: tied.at(-1), hits: max, tied, range: ranges[pkg] };
    console.log(`${pkg.padEnd(36)} ${String(tied.at(-1)).padEnd(10)} 命中 ${max}${tied.length > 1 ? `（并列 ${tied.join(" ")}）` : ""}`);
  } catch (e) {
    console.log(`${pkg.padEnd(36)} 出错 ${String(e.message).split("\n")[0].slice(0, 100)}`);
  }
  writeFileSync(outFile, JSON.stringify(result, null, 1));
}
