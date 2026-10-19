#!/usr/bin/env node
/** 把 canvas-area-v3.js 的导入收敛到 main-exports.js（能解析的都走边界）。 */
import { readFileSync, writeFileSync } from "node:fs";

const ME = "app/renderer/src/canvas-v3/main-exports.js";
const AREA = "app/renderer/src/canvas-v3/canvas-area-v3.js";
const available = new Set();
for (const m of readFileSync(ME, "utf8").matchAll(/^export \{ ([^}]+) \} from/gm))
  for (const n of m[1].split(",")) available.add(n.trim());

let t = readFileSync(AREA, "utf8");
const keep = [], take = [];
for (const m of t.matchAll(/^import \{([\s\S]*?)\} from "([^"]+)";/gm)) {
  const names = m[1].split(",").map((x) => x.trim()).filter(Boolean);
  const inME = names.filter((s) => available.has(s.split(" as ").pop().trim()));
  const rest = names.filter((s) => !available.has(s.split(" as ").pop().trim()));
  take.push(...inME);
  if (rest.length) keep.push(`import { ${rest.join(", ")} } from "${m[2]}";`);
}
const body = t.replace(/^import \{[\s\S]*?\} from "[^"]+";\n/gm, "");
const at = body.indexOf(" */\n");
const i = at >= 0 ? at + 4 : 0;
writeFileSync(AREA, body.slice(0, i) +
  "// ==== P4：主包依赖统一从 main-exports 取 ====\n" +
  `import { ${[...new Set(take)].sort().join(", ")} } from "./main-exports.js";\n` +
  keep.join("\n") + "\n" + body.slice(i), "utf8");
console.log(`走边界 ${new Set(take).size} 个；保留 ${keep.length} 条`);
