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

const entries = new Map([...current.map((e) => [e.name, e]), ...todo.map(([name, r]) => [name, { name, version: r.version }])]);
// 依赖表要覆盖**全部**条目，不只是新加的：新加的包常常是老包的依赖（prosemirror-view 之于
// prosemirror-state），只对新包排序会把它们排到使用者后面，换的时候照样找不到。
const depsOf = new Map(
  [...entries].map(([name, e]) => {
    const pj = JSON.parse(readFileSync(path.join(fetchPackage(path.join(probe, "pkg-cache"), name, e.version), "package.json"), "utf8"));
    // 手写的 CommonJS 包在清单里显式列了 deps（react-dom → scheduler），优先用它；
    // 手动调过的版本（比如 react 的 requireJsxRuntime）也在这一层。
    const deps = new Set([...Object.keys({ ...pj.dependencies, ...pj.peerDependencies }), ...(e.deps ?? [])]);
    return [name, [...deps]];
  }),
);
const order = [];
const state = new Map();
const visit = (name) => {
  if (state.get(name) === "done" || !entries.has(name)) return;
  if (state.get(name) === "visiting") return; // 有环就按遇到的顺序
  state.set(name, "visiting");
  for (const d of depsOf.get(name)) visit(d);
  state.set(name, "done");
  order.push(name);
};
// 起点顺序：已有条目按原顺序，新条目按名字；DFS 会把依赖提前，老包因此可能被推到它原来的位置之后。
for (const name of [...current.map((e) => e.name), ...todo.map(([n]) => n).sort()]) visit(name);

const out = order.map((name) => entries.get(name));
console.log("[\n" + out.map((e) => "  " + JSON.stringify(e)).join(",\n") + "\n]");
