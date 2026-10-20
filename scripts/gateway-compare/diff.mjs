/**
 * 对比两份 replay 结果（第 251 轮）。
 *
 * 规则：
 *   - 参照状态 0/502/503/504 = 沙箱无网络，**不算差异**
 *   - 命中有意差异登记表的，不算差异
 *   - 其余状态码不同 = 真差异
 */
import { readFileSync } from "node:fs";

const oursPath = process.argv[2] ?? "scripts/gateway-compare/replay-ours.json";
const refPath = process.argv[3] ?? "scripts/gateway-compare/replay-ref.json";
const ours = JSON.parse(readFileSync(oursPath, "utf8")).results;
const ref = JSON.parse(readFileSync(refPath, "utf8")).results;
let intentional = [];
try { intentional = JSON.parse(readFileSync("scripts/gateway-compare/intentional.json", "utf8")).entries; } catch { /* 没有也行 */ }

const refMap = new Map(ref.map((r) => [`${r.method} ${r.path}`, r]));
const SANDBOX_NETWORK = new Set([0, 502, 503, 504]);
const isIntentional = (key) => intentional.some((e) => (e.kind === "exact" ? key === e.match : key.startsWith(e.match)));

const same = [], skippedNetwork = [], skippedIntentional = [], real = [];
for (const o of ours) {
  const key = `${o.method} ${o.path}`;
  const r = refMap.get(key);
  if (!r) continue;
  if (o.status === r.status) same.push(key);
  else if (SANDBOX_NETWORK.has(r.status)) skippedNetwork.push(key);
  else if (isIntentional(key)) skippedIntentional.push(key);
  else real.push({ key, ours: o.status, ref: r.status });
}

console.log(`相同 ${same.length} / 沙箱网络跳过 ${skippedNetwork.length} / 有意差异 ${skippedIntentional.length} / 真差异 ${real.length}`);
for (const r of real) console.log(`  ✗ ${r.key}  我们 ${r.ours}  参照 ${r.ref}`);
process.exit(real.length ? 1 : 0);
