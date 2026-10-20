/**
 * 把 v3 产物装配到桌面端（第 280 轮）。
 *
 * 为什么需要：`v3BundleDirectory()` 在未打包时找
 *   `<appPath>/src/renderer/public/v3`
 * 而这个目录**从来没被装配过** → `loadBundle()` 拿到空表 →
 * 原生工作台 `mount()` 失败 → 资源视图永远停在 projectV3.loadFailed。
 *
 * 来源：`.probe/reference/4.0.0/asar/out/renderer/v3`（22 MB，冻结的参照产物）。
 * 这个目录**不进仓库**（见 .gitignore），只在构建前装配。
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const REPO = process.cwd();
const SRC = path.join(REPO, ".probe/reference/4.0.0/asar/out/renderer/v3");
const DEST = path.join(REPO, "app/desktop/src/renderer/public/v3");

if (!existsSync(SRC)) {
  console.error(`✗ 找不到参照的 v3 产物：${path.relative(REPO, SRC)}`);
  console.error("  需要 .probe/reference/4.0.0（未入库的参照快照）。");
  process.exit(1);
}

rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });
cpSync(SRC, DEST, { recursive: true });
const manifest = path.join(DEST, "bundle-manifest.json");
console.log(
  `✓ v3 产物已装配到 ${path.relative(REPO, DEST)}` +
    (existsSync(manifest) ? "（含 bundle-manifest.json）" : "（⚠ 缺 bundle-manifest.json）"),
);
