// 补丁体检：拿一份新的渲染层原文（reference/<新版本>/app/out/renderer），
// 逐条跑 patches.mjs 里的补丁，报告哪些还能原样命中、哪些要重锚。
//
//   node scripts/official-ui/check-patches.mjs <新版本，如 3.0.18>
//
// 为什么不直接跑 build.mjs：这里的 file 是带构建哈希的具体文件名，新版本的哈希必然不同，
// 直接跑只会得到"命中 0 次"这一种结果，看不出是"只差文件名"还是"代码本身变了"。
// 体检时按去掉哈希的前缀找候选文件（assets/index-*），逐条比对，分三档：
//   ✓ 命中次数与声明一致（只需把 file 指向新哈希）
//   ⚠ 命中了但次数不符（代码变了，要看是不是同一处）
//   ✗ 完全没命中（要重锚；附上首段的模糊搜索结果，区分小改和重写）
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ASSETS, PATCHES, VERSION } from "../../app/official-ui/patches.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const target = process.argv[2];
if (!target) throw new Error("用法：node scripts/official-ui/check-patches.mjs <新版本>");
// index.html 里写的是那个版本自己的文件名，和 app/out/ 无关。
const srcRoot = path.join(repo, "reference", target, "app/out/renderer");
if (!existsSync(srcRoot)) throw new Error(`找不到渲染层 ${srcRoot}`);

const countIn = (text, find) => (typeof find === "string" ? text.split(find).length - 1 : [...text.matchAll(find)].length);
/** 只统计 within 区间内的命中，和 build.mjs 的语义一致（否则区间外的同名片段会被算进来）。 */
function scoped(text, within) {
  if (!within) return text;
  const start = text.indexOf(within[0]);
  if (start < 0) return "";
  const end = text.indexOf(within[1], start + within[0].length);
  return end < 0 ? "" : text.slice(start, end);
}
// 带构建哈希的文件名 → 前缀。哈希字符数和形态都不固定，按"最后一个 - 之前"切。
const stemOf = (file) => file.replace(/-[\w-]{6,}\.(js|css)$/, "");

/** 按去掉哈希的前缀列出候选文件。返回 [相对路径]，按文件名排序。 */
function candidates(file) {
  const stem = stemOf(file);
  if (stem === file) return [file]; // index.html 之类没有哈希
  const dir = path.join(srcRoot, path.dirname(stem));
  if (!existsSync(dir)) return [];
  const base = path.basename(stem);
  return readdirSync(dir)
    .filter((n) => n.startsWith(base + "-") && /\.(m?js|css)$/.test(n))
    .sort()
    .map((n) => path.join(path.dirname(stem), n));
}

/** 模糊定位：把 find 的首段缩短到 24 字再找，用来判断"这段代码还在不在"。 */
function probe(text, find) {
  const first = typeof find === "string" ? find : find.source;
  const sniff = first.split("\n")[0].slice(0, 24);
  if (sniff.length < 8) return null;
  const i = text.indexOf(sniff);
  return i < 0 ? null : text.slice(i, i + 90).replace(/\s+/g, " ");
}

const rows = [];
let okCount = 0;
let driftCount = 0;
let goneCount = 0;

for (const p of PATCHES) {
  const want = p.count ?? 1;
  const cands = candidates(p.file);
  if (!cands.length) {
    rows.push({ p, status: "✗", detail: `找不到候选文件（${stemOf(p.file)}-*）` });
    goneCount++;
    continue;
  }
  let best = null;
  for (const rel of cands) {
    const text = scoped(readFileSync(path.join(srcRoot, rel), "utf8"), p.within);
    const n = countIn(text, p.find);
    if (n && (!best || n > best.n)) best = { rel, n, text };
  }
  if (!best) {
    // 都命中 0：拿第一个候选做模糊探测，看这段代码是不是整段没了
    const text = readFileSync(path.join(srcRoot, cands[0]), "utf8");
    const hit = probe(text, p.find);
    rows.push({ p, status: "✗", detail: hit ? `找不到锚点；首段在 ${cands[0]} 里出现在：${hit}` : `找不到锚点，首段也不在 ${cands[0]} 里` });
    goneCount++;
  } else if (best.n === want) {
    rows.push({ p, status: "✓", detail: `${best.rel}（命中 ${best.n}）` });
    okCount++;
  } else {
    rows.push({ p, status: "⚠", detail: `${best.rel} 命中 ${best.n} 次，声明 ${want} 次` });
    driftCount++;
  }
}

// 资源也要查：新版本里如果有同名文件，build.mjs 会直接报错（它不许覆盖）。
const assetConflicts = ASSETS.filter((a) => existsSync(path.join(srcRoot, a.dest)));

const W = 36;
console.log(`${VERSION} → ${target}：${PATCHES.length} 条补丁\n`);
for (const r of rows) {
  console.log(`  ${r.status} ${r.p.id.padEnd(W)} ${r.p.file.padEnd(26)} ${r.detail}`);
}
if (assetConflicts.length) {
  console.log(`\n资源会撞车（新版本里已有同名文件，build.mjs 会拒绝）：`);
  for (const a of assetConflicts) console.log(`  ✗ ${a.dest}`);
}
console.log(`\n可原样沿用 ${okCount} 条（改 file 指向新哈希即可） / 代码有漂移 ${driftCount} 条 / 锚点找不到 ${goneCount} 条`);
if (driftCount || goneCount) {
  console.log(`需要重锚：${rows.filter((r) => r.status !== "✓").map((r) => r.p.id).join(", ")}`);
}
process.exit(goneCount ? 1 : 0);
