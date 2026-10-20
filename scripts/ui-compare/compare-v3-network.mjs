/**
 * v3 屏网络路径集合对比（第 264 轮，按用户要求改成「路径集合 + 白名单」，不比次数）。
 *
 * 为什么不比次数：`useAgentModelCatalog` 有 `refetchInterval: 3e4`，
 * 每 30 秒刷新一次，GET 次数会随页面停留时长变化 —— 比次数会让验收时好时坏。
 *
 * 用法：node scripts/ui-compare/compare-v3-network.mjs <ours.net.json> <ref.net.json>
 */
import { readFileSync } from "node:fs";

const [oursPath, refPath] = process.argv.slice(2);
if (!oursPath || !refPath) {
  console.error("用法: compare-v3-network.mjs <ours.net.json> <ref.net.json>");
  process.exit(2);
}

let allow = [];
try {
  allow = JSON.parse(readFileSync("scripts/ui-compare/network-intentional.json", "utf8")).entries;
} catch { /* 没有白名单也行 */ }
const isAllowed = (p) => allow.some((e) => (e.kind === "prefix" ? p.startsWith(e.path) : p === e.path));

const paths = (file) => {
  const data = JSON.parse(readFileSync(file, "utf8"));
  const set = new Set();
  for (const r of [...(data.getRequests ?? []), ...(data.nonGetRequests ?? [])]) {
    const p = String(r?.path ?? "").split("?")[0];
    if (!p.startsWith("/")) continue;
    if (isAllowed(p)) continue;
    set.add(`${r.method ?? "GET"} ${p}`);
  }
  return set;
};

const ours = paths(oursPath);
const ref = paths(refPath);
const onlyOurs = [...ours].filter((p) => !ref.has(p)).sort();
const onlyRef = [...ref].filter((p) => !ours.has(p)).sort();

console.log(`路径集合：我方 ${ours.size} / 参照 ${ref.size}`);
if (onlyOurs.length) { console.log("只我方有："); for (const p of onlyOurs) console.log("  " + p); }
if (onlyRef.length) { console.log("只参照有："); for (const p of onlyRef) console.log("  " + p); }
if (!onlyOurs.length && !onlyRef.length) { console.log("✓ 路径集合完全一致（已排除白名单）"); process.exit(0); }
process.exit(1);
