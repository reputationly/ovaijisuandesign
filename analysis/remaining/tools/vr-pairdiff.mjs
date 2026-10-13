// 打印 vendor 声明 与 指定 npm 文件同名声明 的掩码形状差异
// 用法：node vr-pairdiff.mjs <vendorName> <npmFile> [npmName]
import { Graph, mask } from "./xcanon.mjs";
import { diffArrays } from "diff";
const [vn, nf, nn0] = process.argv.slice(2); const nn = nn0 || vn.replace(/\$\d+$/, "");
const V = "/home/ubuntu/wt-desource/app/renderer/src/vendor.js";
const g1 = new Graph(), g2 = new Graph();
const a = g1.shape(V + "#" + vn), b = g2.shape(nf + "#" + nn);
if (a.err || b.err) { console.log("err", a.err, b.err); process.exit(); }
const tok = (s) => mask(s).match(/\$F|_L\d+|\w+|"(?:[^"\\]|\\.)*"|\S/g);
const ta = tok(a.F), tb = tok(b.F); let ch = 0; const out = [];
let ctx = [];
for (const p of diffArrays(ta, tb)) {
  if (!p.added && !p.removed) { ctx = p.value.slice(-6); continue; }
  ch += p.count; if (out.length < 14) out.push(`  …${ctx.join(" ")}  ${p.added ? "npm+" : "src+"} ${p.value.join(" ").slice(0, 220)}`);
}
console.log(`${vn} vs ${nf.split("/package/").pop() || nf}#${nn}: tokens ${ta.length}/${tb.length} changed ${ch}`); console.log(out.join("\n"));
