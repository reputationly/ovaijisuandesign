// 根据版本反推结果（.probe/decompile/npm-versions*.json）生成替换清单：按包之间的依赖做拓扑排序，
// 被依赖的排前面；已经在 npm-packages.json 里的条目（手工写的 CommonJS 包、调过的版本）原样保留在前面。
//
//   node scripts/decompile/npm-plan.mjs [--min-hits N] > 新清单.json
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchPackage } from "./npm-swap.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const probe = path.resolve(here, "../../.probe/decompile");
const minHits = process.argv.includes("--min-hits") ? Number(process.argv[process.argv.indexOf("--min-hits") + 1]) : 1;

const detected = {};
for (const f of readdirSync(probe).filter((n) => /^npm-versions.*\.json$/.test(n))) Object.assign(detected, JSON.parse(readFileSync(path.join(probe, f), "utf8")));
const current = JSON.parse(readFileSync(path.join(here, "npm-packages.json"), "utf8"));
const have = new Set(current.map((e) => e.name));
const todo = Object.entries(detected).filter(([name, r]) => !have.has(name) && r.version && r.hits >= minHits);

const depsOf = new Map(
  todo.map(([name, r]) => {
    const pj = JSON.parse(readFileSync(path.join(fetchPackage(path.join(probe, "pkg-cache"), name, r.version), "package.json"), "utf8"));
    return [name, Object.keys({ ...pj.dependencies, ...pj.peerDependencies })];
  }),
);
const order = [];
const state = new Map();
const visit = (name) => {
  if (state.get(name) === "done" || !depsOf.has(name)) return;
  if (state.get(name) === "visiting") return; // 有环就按遇到的顺序
  state.set(name, "visiting");
  for (const d of depsOf.get(name)) visit(d);
  state.set(name, "done");
  order.push(name);
};
for (const [name] of todo.sort(([a], [b]) => a.localeCompare(b))) visit(name);

const out = [...current, ...order.map((name) => ({ name, version: detected[name].version }))];
console.log("[\n" + out.map((e) => "  " + JSON.stringify(e)).join(",\n") + "\n]");
