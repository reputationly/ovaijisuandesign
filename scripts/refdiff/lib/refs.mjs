// 参照版本的统一解析（第 2040 轮）。
//
// 为什么需要：24 个脚本写死 `reference/4.0.0` 一类路径、23 个写死带哈希的 bundle 文件名。
// 每升一次版都要逐个改，漏改就会拿旧版本去比 —— 而且这种错误不会报错，只会给出错的结论。
//
// 约定：
//   · 版本目录 = <repo>/.probe/reference/<version>
//   · 主 bundle 名从该目录的 asar/out/renderer/index.html 里读，不写死
//   · 参数优先级：命令行 --from/--to > 环境变量 OV_REF_FROM/OV_REF_TO > 默认（最新落地版本）
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const REF_ROOT = path.join(REPO, ".probe/reference");

/** 已冻结的版本，按语义版本升序。 */
export function listVersions() {
  if (!existsSync(REF_ROOT)) return [];
  return readdirSync(REF_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(REF_ROOT, d.name, "asar")))
    .map((d) => d.name)
    .sort((a, b) => {
      const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
      for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
      return 0;
    });
}

export function latestVersion() {
  const v = listVersions();
  return v.length ? v[v.length - 1] : null;
}

/** 把版本号或路径解析成绝对目录。传目录则原样返回。 */
export function resolveRefDir(value) {
  if (!value) throw new Error("缺少参照版本（--from/--to 或 OV_REF_*）");
  if (value.includes("/") || value.includes("\\")) return path.resolve(REPO, value);
  const dir = path.join(REF_ROOT, value);
  if (!existsSync(dir)) {
    throw new Error(`参照版本 ${value} 未冻结：${path.relative(REPO, dir)} 不存在。已冻结：${listVersions().join(", ")}`);
  }
  return dir;
}

export const rendererDirOf = (refDir) => path.join(refDir, "asar/out/renderer");
export const assetsDirOf = (refDir) => path.join(rendererDirOf(refDir), "assets");
export const v3DirOf = (refDir) => path.join(rendererDirOf(refDir), "v3");

/**
 * 从 index.html 读入口名（不写死哈希）。
 * 注意：**入口不一定是主体**。4.0.4 的入口是 489 字节的引导脚本，
 * 真正的 22MB 主体被 vite 改名成了 `mermaid-*.js`。所以「主 bundle」要沿 import 链找最大那块。
 */
export function entryNameOf(refDir) {
  const html = path.join(rendererDirOf(refDir), "index.html");
  if (!existsSync(html)) throw new Error(`缺 index.html：${path.relative(REPO, html)}`);
  const m = readFileSync(html, "utf8").match(/assets\/(index-[A-Za-z0-9_-]+\.js)/);
  if (!m) throw new Error(`index.html 里找不到入口 bundle：${path.relative(REPO, html)}`);
  return m[1];
}

/** 沿 `from "./x.js"` 与 `import("./x.js")` 收集可达的同目录 js，按文件大小取最大的一块。 */
export function mainBundleNameOf(refDir) {
  const assets = assetsDirOf(refDir);
  const entry = entryNameOf(refDir);
  const seen = new Set();
  const queue = [entry];
  let best = { name: entry, size: 0 };
  while (queue.length && seen.size < 400) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    const full = path.join(assets, name);
    if (!existsSync(full)) continue;
    let size = 0;
    try { size = statSync(full).size; } catch { continue; }
    if (size > best.size) best = { name, size };
    let text = "";
    try { text = readFileSync(full, "utf8"); } catch { continue; }
    // 只跟同目录的相对引用，且限制在 assets 内
    for (const m of text.matchAll(/(?:from\s*|import\s*\(\s*)"\.\/([A-Za-z0-9_.-]+\.js)"/g)) {
      if (!seen.has(m[1])) queue.push(m[1]);
    }
  }
  if (!best.size) throw new Error(`在 ${path.relative(REPO, assets)} 里找不到可达的 js`);
  return best.name;
}

export function mainBundleOf(refDir) {
  const p = path.join(assetsDirOf(refDir), mainBundleNameOf(refDir));
  if (!existsSync(p)) throw new Error(`主 bundle 不存在：${path.relative(REPO, p)}`);
  return p;
}

/** 解析 --from/--to；缺省时 from = 倒数第二个版本，to = 最新版本。 */
export function resolvePair(args = {}) {
  const versions = listVersions();
  const to = args.to ?? process.env.OV_REF_TO ?? (versions.length ? versions[versions.length - 1] : null);
  const from = args.from ?? process.env.OV_REF_FROM ??
    (versions.length > 1 ? versions[versions.length - 2] : null);
  if (!from || !to) throw new Error(`无法确定对比版本（已冻结：${versions.join(", ") || "无"}）`);
  return { from, to, fromDir: resolveRefDir(from), toDir: resolveRefDir(to) };
}
