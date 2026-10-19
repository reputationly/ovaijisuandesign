#!/usr/bin/env node
/**
 * 找「抽取损坏」（第 169 轮）。
 *
 * 已知形态：
 *   A. `return<ident> = …`（return 与标识符粘连，原本是 const/let）
 *   B. `return <ident> = …;` 出现在函数体开头（原本是 const）
 *   C. 相邻两段完全相同且超过 N 行（重复拼接）
 *   D. `= <ident> =` 连续赋值（拼接残留）
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = "app/renderer/src";
const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = path.join(d, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(js|jsx)$/.test(e)) files.push(p);
  }
})(ROOT);

const hits = [];
for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // A/B
    if (/^\s*return[A-Za-z_$][\w$]*\s*=\s*/.test(l) || /^\s{2,}return [A-Za-z_$][\w$]*\s*=\s*[a-zA-Z]/.test(l)) {
      // 排除 `return x = y` 这种故意的（极少）；标记出来人工看
      hits.push({ f, line: i + 1, kind: "A/B return-assign", text: l.trim().slice(0, 90) });
    }
    // D
    if (/=\s*[A-Za-z_$][\w$]*\s*=\s*[^=]/.test(l) && !/===|!==|=>|<=|>=/.test(l)) {
      hits.push({ f, line: i + 1, kind: "D 连续赋值", text: l.trim().slice(0, 90) });
    }
  }
  // C：相邻行完全相同 8 行以上（真正的重复拼接才会这样）
  for (let i = 0; i + 8 < lines.length; i++) {
    if (lines[i].trim() === "") continue;
    let len = 0;
    while (i + len + 1 < lines.length && lines[i + len] === lines[i + len + 1]) len++;
    if (len >= 8) hits.push({ f, line: i + 1, kind: `C 连续重复 ${len + 1} 行`, text: lines[i].trim().slice(0, 90) });
  }
}
const byKind = {};
for (const h of hits) {
  const k = h.kind.split(" ")[0];
  (byKind[k] ??= []).push(h);
}
for (const [k, list] of Object.entries(byKind)) {
  console.log(`\n${k}: ${list.length} 处 / ${new Set(list.map((x) => x.f)).size} 个文件`);
  for (const h of list.slice(0, 6)) console.log(`  ${h.f.replace(ROOT + "/", "")}:${h.line}  ${h.text}`);
}
console.log(`\n合计 ${hits.length} 处`);
