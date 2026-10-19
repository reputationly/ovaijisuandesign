#!/usr/bin/env node
/**
 * 修「顶层别名引用后声明」的 TDZ（第 151 轮）。
 *
 * 模式：`const Y = X...` 出现在 `const/let X = ...` 之前。
 * 做法：把 X 的声明整段移到 Y 之前。反复直到无新增。
 */
import { readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
let lines = readFileSync(file, "utf8").split("\n");

const declRe = /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)(?:\s*=|;)/;
function spanEnd(start) {
  let depth = 0, seen = false;
  for (let i = start; i < lines.length; i++) {
    const l = lines[i];
    for (const c of l) {
      if ("([{".includes(c)) { depth++; seen = true; }
      else if (")]}".includes(c)) depth--;
    }
    if (i === start) { if (/;\s*$/.test(l)) return i; if (!seen && !/[[{(]\s*$/.test(l)) return i; }
    else if (depth <= 0) return i;
  }
  return lines.length - 1;
}
const declLine = new Map();
lines.forEach((l, i) => { const m = declRe.exec(l); if (m && /^(const|let|var)\s/.test(l) && !l.startsWith("  ")) declLine.set(m[1], i); });

let moved = 0;
for (let pass = 0; pass < 200; pass++) {
  let did = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith("  ") || !/^(const|let|var)\s+/.test(l)) continue;
    const m = /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)/.exec(l);
    if (!m) continue;
    const target = m[2];
    if (target === m[1]) continue;
    const d = declLine.get(target);
    if (d === undefined || d < i) continue;   // 已在前，或不是顶层声明
    // 把 target 的声明整段移到 i 之前
    const end = spanEnd(d);
    const block = lines.slice(d, end + 1);
    lines.splice(d, end - d + 1);
    // 重新定位 i（若 d 在 i 之后，i 不受影响）
    lines.splice(i, 0, `// [tdz] ${target} 提前（被第 ${i + 1} 行引用）`, ...block);
    // 重建索引
    declLine.clear();
    lines.forEach((x, k) => { const mm = declRe.exec(x); if (mm && /^(const|let|var)\s/.test(x) && !x.startsWith("  ")) declLine.set(mm[1], k); });
    moved++; did = true; break;
  }
  if (!did) break;
}
writeFileSync(file, lines.join("\n"), "utf8");
console.log(`移动 ${moved} 处声明`);
