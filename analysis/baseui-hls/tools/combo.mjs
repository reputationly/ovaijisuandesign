// 组合打分：每条闭包声明在 {react@R, utils@U, 其余} 组合中取最好分类
import { readFileSync, writeFileSync } from "node:fs";
const R = "/home/ubuntu/baseui-hls-analysis/";
const closure = JSON.parse(readFileSync(R + "closure-baseui.json"));
const per = JSON.parse(readFileSync(R + "perstmt-baseui.json"));
const rank = { exact: 3, norm: 2, diff: 1, missing: 0 };
const reacts = Object.keys(per).filter((k) => /^@base-ui(-components)?\/react@/.test(k));
const utils = Object.keys(per).filter((k) => /^@base-ui(-components)?\/utils@/.test(k));
const rows = [];
for (const r of reacts) for (const u of utils) {
  if (r.startsWith("@base-ui/") !== u.startsWith("@base-ui/")) continue;
  const mr = new Map(per[r]), mu = new Map(per[u]);
  const cnt = { exact: 0, norm: 0, diff: 0, missing: 0 }; let tot = 0; const bad = [];
  closure.forEach((s, i) => {
    const a = mr.get(i), b = mu.get(i); if (a === undefined && b === undefined) return;
    tot++; const c = [a, b].filter(Boolean).sort((x, y) => rank[y] - rank[x])[0]; cnt[c]++;
    if (c === "diff" || c === "missing") bad.push(`${c} ${s.file}:${s.line} ${s.names.join(",")}`);
  });
  rows.push({ react: r, utils: u, total: tot, ...cnt, bad });
}
rows.sort((a, b) => b.exact + b.norm - (a.exact + a.norm) || b.exact - a.exact);
writeFileSync(R + "scores-baseui-combo.json", JSON.stringify(rows.map(({ bad, ...x }) => x), null, 1));
for (const x of rows.slice(0, 8)) console.log(x.react, x.utils, "total", x.total, "exact", x.exact, "norm", x.norm, "diff", x.diff, "missing", x.missing);
console.log("== top1 剩余:"); for (const b of rows[0].bad) console.log(" ", b);
console.log("== top2 剩余数:", rows[1].bad.length);
