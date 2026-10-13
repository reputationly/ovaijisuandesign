import { declarations } from "./canon.mjs";
import { readFileSync } from "node:fs";
const v = readFileSync(process.env.HOME + "/ov-desource/app/renderer/src/vendor.js", "utf8");
const lines = v.split("\n");
const seg = lines.slice(11571, 11679).join("\n");
const vd = declarations(seg);
const d1 = declarations(readFileSync(process.env.HOME + "/baseui-hls-analysis/pkgs/@base-ui__utils@0.2.6/package/esm/useTimeout.js", "utf8"));
const d2 = declarations(readFileSync(process.env.HOME + "/baseui-hls-analysis/pkgs/@base-ui__react@1.3.0/package/esm/tooltip/root/TooltipRootContext.js", "utf8"));
for (const d of [...d1, ...d2]) {
  const m = vd.find((x) => x.names[0] === d.names[0]);
  console.log(d.names[0], m ? (m.A === d.A ? "A" : m.B === d.B ? "B" : "DIFF") : "none");
  if (m && m.A !== d.A) console.log("  V:", m.A.slice(0, 300), "\n  D:", d.A.slice(0, 300));
}
