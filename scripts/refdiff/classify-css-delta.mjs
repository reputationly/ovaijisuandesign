#!/usr/bin/env node
/**
 * 4.0.3 的 CSS 增量分类（第 49 轮）。
 *
 * 背景：前面几十轮全在改 JS/TS，样式一条没搬。实测 4.0.0 -> 4.0.3
 * 新增 247 条规则（约 64KB），其中一部分属于范围外的界面（云端/计费）。
 *
 * 判据：一条新规则是否需要搬 —— **看它选择器里的类名有没有出现在我们源码里**。
 * 出现在源码里 = 我们的组件会用上它，必须搬；
 * 没出现 = 要么是范围外界面，要么是纯工具类（tailwind 会按需生成）。
 *
 *   node scripts/refdiff/classify-css-delta.mjs           报告
 *   node scripts/refdiff/classify-css-delta.mjs --emit    把「需要搬」的输出成一段 CSS
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REF = path.join(ROOT, ".probe/reference");
const SRC = path.join(ROOT, "app/renderer/src");

function rules(ver) {
  const dir = path.join(REF, ver, "asar/out/renderer/assets");
  const out = new Set();
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".css")) continue;
    const s = readFileSync(path.join(dir, f), "utf8");
    for (const b of s.matchAll(/[^{}]*\{[^{}]*\}/g)) out.add(b[0].replace(/\s+/g, " ").trim());
  }
  return out;
}

/** 我们源码里出现过的所有字符串与标识符（够用来判断类名是否被引用）。 */
function sourceText() {
  let all = "";
  (function walk(d) {
    for (const name of readdirSync(d)) {
      const abs = path.join(d, name);
      const st = statSync(abs);
      if (st.isDirectory()) {
        if (name !== "node_modules") walk(abs);
        continue;
      }
      if (/\.(js|jsx|ts|tsx|css)$/.test(name)) all += readFileSync(abs, "utf8");
      if (all.length > 12 * 1024 * 1024) return;
    }
  })(SRC);
  return all;
}

const OLD = process.env.OV_OLD_CSS ?? "4.0.0";
const NEW = process.env.OV_NEW_CSS ?? "4.0.3";
const a = rules(OLD);
const b = rules(NEW);
const added = [...b].filter((r) => !a.has(r)).sort();
const src = sourceText();

/** 从选择器里抠出类名。 */
function classNames(rule) {
  const sel = rule.slice(0, rule.indexOf("{"));
  const out = new Set();
  for (const m of sel.matchAll(/\.([a-zA-Z_][\w-]*)/g)) out.add(m[1]);
  return out;
}

const need = [];
const skipUnused = [];
const skipUtility = [];
for (const rule of added) {
  const cls = classNames(rule);
  if (cls.size === 0) {
    // 纯元素/属性选择器（如 [data-...]）或 @property：按属性名判断
    const attrs = [...rule.slice(0, rule.indexOf("{")).matchAll(/\[([\w-]+)/g)].map((m) => m[1]);
    if (attrs.length && attrs.some((a2) => src.includes(a2))) need.push(rule);
    else skipUnused.push(rule);
    continue;
  }
  const hit = [...cls].filter((c) => src.includes(c));
  if (hit.length) need.push(rule);
  else if ([...cls].every((c) => /^(max-w|min-w|w|h|p|px|py|m|mx|my|gap|text|bg|rounded|duration|transition|opacity|scale|translate|hover|group|dark|sm|md|lg|xl|flex|grid|absolute|relative|inset|size|leading|tracking|border|shadow|z|order|col|row)-/.test(c))) skipUtility.push(rule);
  else skipUnused.push(rule);
}

if (process.argv.includes("--emit")) {
  const out = path.join(ROOT, ".probe/refdiff/css-need.css");
  writeFileSync(out, need.join("\n") + "\n", "utf8");
  console.log(`已写出 ${need.length} 条到 .probe/refdiff/css-need.css`);
} else {
  console.log(`${NEW} 新增规则 ${added.length} 条`);
  console.log(`  **需要搬（类名在我们源码里出现）${need.length} 条**，${sum(need)} 字节`);
  console.log(`  工具类（tailwind 按需生成，不用搬）${skipUtility.length} 条`);
  console.log(`  未被引用（大概率范围外）${skipUnused.length} 条`);
  const byPrefix = new Map();
  for (const r of need) {
    const m = r.match(/\.([a-zA-Z][\w-]*)/);
    const k = m ? m[1].split("-").slice(0, 2).join("-") : "(元素/属性)";
    byPrefix.set(k, (byPrefix.get(k) ?? 0) + 1);
  }
  console.log("\n需要搬的规则按类名前两段分组（前 15）：");
  for (const [k, v] of [...byPrefix].sort((x, y) => y[1] - x[1]).slice(0, 15)) console.log(`  ${String(v).padStart(3)}  ${k}`);
}

function sum(list) {
  return list.reduce((n, r) => n + r.length, 0);
}
