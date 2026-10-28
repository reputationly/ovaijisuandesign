#!/usr/bin/env node
/**
 * 界面 CSS 类门禁：**JSX 里用到的类，构建产物里必须有定义**。
 *
 * 背景：我们是从参照产物里「还原」界面的，很容易把组件搬过来、把配套 CSS 忘了
 * （真机已经踩过两次：`.overflow-marquee-text` 缺规则 → 侧栏长标题糊出 3 行；
 * `.home-project-greeting` 等 5 条缺规则 → 字号/层级不对）。靠人眼盯截图不现实。
 *
 * 做法：
 * 1. 从 `app/desktop/out/recovered-ui/assets/*.css`（**构建产物**，含 Tailwind 生成的
 *    工具类）提取已定义的类名；
 * 2. 从 `app/renderer/src/**\/*.{js,jsx}` 的 `className` 提取用到的类名；
 * 3. 差集里，凡是不在允许列表里的，就是新出现的「用了但没定义」—— 直接失败。
 *
 * 用构建产物而不是源 CSS 做基准是关键：Tailwind 的工具类只在产物里，
 * 拿源文件比会把 `flex` / `inset-0` 全判成缺失。
 *
 * 允许列表：`scripts/ui-css-allowlist.json`。里面只放**确认无害**的：
 * react-flow 的交互标记（`nodrag` 等，本来就不需要样式）、参照里也不存在的死类。
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const repo = path.resolve(import.meta.dirname, "..");
const cssDir = path.join(repo, "app/desktop/out/recovered-ui/assets");
const srcDir = path.join(repo, "app/renderer/src");
const allowPath = path.join(repo, "scripts/ui-css-allowlist.json");

/** 模板字符串拼出来的前缀（`shj-lang-${x}`）无法静态判定，跳过。 */
const SKIP = /-$/;
/** 太短的不判（`a`、`on` 这类可能是误抓）。 */
const MIN_LEN = 3;

function definedClasses() {
  if (!existsSync(cssDir)) {
    console.error(`[css-check] 找不到构建产物：${path.relative(repo, cssDir)} —— 先跑 pnpm --filter @ov/renderer build`);
    process.exit(2);
  }
  const cssFiles = readdirSync(cssDir).filter((n) => n.endsWith(".css")).map((n) => path.join(cssDir, n));
  const out = new Set();
  for (const file of cssFiles) {
    // Tailwind 会把 `md:flex`、`w-[120px]` 转义成 `md\:flex`，先还原再抓类名。
    const css = readFileSync(file, "utf8").replace(/\\(.)/g, "$1");
    for (const m of css.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]{2,})(?=[\s,{:\[>+~.)]|$)/g)) out.add(m[1]);
  }
  return out;
}

function sourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(jsx?|tsx?)$/.test(entry.name) && statSync(full).isFile()) out.push(full);
  }
  return out;
}

function usedClasses() {
  const counts = new Map();
  for (const file of sourceFiles(srcDir)) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/g)) {
      const blob = (m[1] ?? m[2] ?? m[3] ?? "").replace(/\$\{[^}]*\}/g, " ");
      for (const token of blob.split(/\s+/)) {
        if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(token)) continue;
        if (token.length < MIN_LEN || SKIP.test(token)) continue;
        counts.set(token, (counts.get(token) ?? 0) + 1);
      }
    }
  }
  return counts;
}

const defined = definedClasses();
const used = usedClasses();
const allow = new Set(existsSync(allowPath) ? JSON.parse(readFileSync(allowPath, "utf8")).allow ?? [] : []);

const missing = [...used.entries()].filter(([cls]) => !defined.has(cls) && !allow.has(cls)).sort((a, b) => b[1] - a[1]);

if (missing.length > 0) {
  console.error(`[css-check] ${missing.length} 个类在 JSX 里用到、但构建产物 CSS 里没有定义：`);
  for (const [cls, n] of missing) console.error(`  ×${n}  ${cls}`);
  console.error("[css-check] 补 CSS 后重跑；确认无害再登记到 scripts/ui-css-allowlist.json");
  process.exit(1);
}

const allowedHit = [...used.keys()].filter((cls) => !defined.has(cls) && allow.has(cls)).length;
console.log(`[css-check] 通过：使用 ${used.size} 个类，全部有定义（允许列表命中 ${allowedHit} 个）`);
