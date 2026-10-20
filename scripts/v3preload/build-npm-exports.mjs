/**
 * 自动生成 npm 停止集（第 247 轮，用户方案 A.2）。
 *
 * 为什么需要：闭包工具原来只有 `fractional-indexing` 一个停止包，
 * 于是它会钻进 react / floating-ui / lucide 的源码，把库代码当成"要还原的应用代码"。
 *
 * 做法：把 renderer 的全部依赖逐个 `import()`，取导出名，写入
 * `scripts/v3preload/npm-exports.json`。闭包工具把这份清单当作停止集。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

const PKG = path.join(process.cwd(), "app/renderer/package.json");
const OUT = "scripts/v3preload/npm-exports.json";
const pkg = JSON.parse(readFileSync(PKG, "utf8"));
const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter((d) => !d.startsWith("@types/"));

const byPackage = {};
const failed = [];
// 从 app/renderer 解析（依赖装在 renderer 的 node_modules 里）
const RENDERER = path.join(process.cwd(), "app/renderer");
for (const name of deps) {
  try {
    const resolved = createRequire(path.join(RENDERER, "package.json")).resolve(name);
    const mod = await import(pathToFileURL(resolved).href);
    const names = Object.keys(mod).filter((k) => k !== "default");
    if (mod.default && typeof mod.default === "object") names.push(...Object.keys(mod.default));
    byPackage[name] = [...new Set(names)];
  } catch (error) {
    // 有些包只能在特定环境加载（native / electron-only），跳过但记录下来
    failed.push({ name, reason: String(error).slice(0, 120) });
  }
}
const all = new Set();
for (const names of Object.values(byPackage)) for (const n of names) all.add(n);
writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), packageCount: deps.length,
  resolved: Object.keys(byPackage).length, failedCount: failed.length, all: [...all].sort(), byPackage, failed }, null, 1));
console.log(`依赖 ${deps.length} 个：成功 ${Object.keys(byPackage).length}，失败 ${failed.length}`);
console.log(`导出名合计 ${all.size} 个 → ${OUT}`);
if (failed.length) console.log("失败样例:", failed.slice(0, 5).map((f) => f.name).join(", "));
