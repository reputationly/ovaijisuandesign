/**
 * 从门禁录的 `*.net.json` 里抽出全部 (method, path) 组合（第 249 轮，用户方案 D）。
 *
 * 基线目录：$GOLDEN 或 ~/ov-golden/.probe/ui-golden
 * 输出：scripts/gateway-compare/paths.json
 *
 * 只取路径，不取请求体 —— 请求体可能含用户数据，且多数 GET 不需要。
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const GOLDEN = process.env.GOLDEN_DIR ?? path.join(homedir(), "ov-golden/.probe/ui-golden");
const OUT = "scripts/gateway-compare/paths.json";

const seen = new Map();
for (const file of readdirSync(GOLDEN)) {
  if (!file.endsWith(".net.json")) continue;
  const data = JSON.parse(readFileSync(path.join(GOLDEN, file), "utf8"));
  const all = [...(data.getRequests ?? []), ...(data.nonGetRequests ?? [])];
  for (const entry of all) {
    if (!entry || typeof entry !== "object") continue;
    const method = entry.method ?? "GET";
    const raw = entry.path ?? "";
    if (!raw.startsWith("/")) continue;
    const p = raw.split("?")[0];
    const key = `${method} ${p}`;
    if (!seen.has(key)) seen.set(key, { method, path: p, screens: new Set() });
    seen.get(key).screens.add(file.replace(/\.net\.json$/, ""));
  }
}

const items = [...seen.values()]
  .map((v) => ({ method: v.method, path: v.path, screenCount: v.screens.size, screens: [...v.screens].slice(0, 5) }))
  .sort((a, b) => b.screenCount - a.screenCount || a.path.localeCompare(b.path));

writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), golden: GOLDEN, total: items.length,
  byMethod: items.reduce((acc, it) => ((acc[it.method] = (acc[it.method] ?? 0) + 1), acc), {}), items }, null, 1));

console.log(`从 ${readdirSync(GOLDEN).filter((f) => f.endsWith(".net.json")).length} 个网络记录里抽出 ${items.length} 个 (method, path)`);
const byMethod = items.reduce((acc, it) => ((acc[it.method] = (acc[it.method] ?? 0) + 1), acc), {});
console.log("按方法:", JSON.stringify(byMethod));
console.log("前 8:", items.slice(0, 8).map((i) => `${i.method} ${i.path}`).join(" | "));
