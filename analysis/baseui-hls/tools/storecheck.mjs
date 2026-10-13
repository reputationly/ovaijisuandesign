// R13：rollup 撞名改写 `let Store$1 = class Store {…}` ≡ `class Store {…}`；把 vendor 声明按此规则还原后与 dist 比 A
import { readFileSync } from "node:fs";
import { declarations } from "./canon.mjs";
const v = readFileSync(process.env.HOME + "/ov-desource/app/renderer/src/vendor.js", "utf8").split("\n");
let start = 14705 - 1, end = start; while (!/^};$/.test(v[end])) end++;
let src = v.slice(start, end + 1).join("\n").replace(/^let Store\$1 = class Store \{/, "class Store {").replace(/\n\};$/, "\n}");
const d = readFileSync(process.env.HOME + "/baseui-hls-analysis/pkgs/@base-ui__utils@0.2.6/package/esm/store/Store.js", "utf8");
const a = declarations(src, {})[0], b = declarations(d, {}).find((x) => x.names.includes("Store"));
console.log("vendor lines", start + 1, "-", end + 1, "A equal:", a.A === b.A, "N equal:", a.N === b.N);
if (a.A !== b.A) { for (let i = 0; i < a.A.length; i++) if (a.A[i] !== b.A[i]) { console.log(a.A.slice(i - 80, i + 80), "\n---\n", b.A.slice(i - 80, i + 80)); break; } }
