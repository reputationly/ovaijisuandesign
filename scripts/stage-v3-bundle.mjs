/**
 * 把 v3 产物装配到桌面端，并打上补丁（第 280 轮起；第 2040 轮改为「仓库压缩包优先」）。
 *
 * 取包顺序：
 *   1. **仓库里的压缩包** `scripts/v3-runtime/v3-<版本>.tgz`，按 `scripts/v3-runtime.lock.json` 校验 sha256
 *      → 干净的仓库副本、CI 都能直接打出完整的包
 *   2. 找不到才回退 `.probe/reference/<版本>/asar/out/renderer/v3`，**并打印警告**
 *      （这是未入库的参照快照，只有本机开发才有）
 *
 * 为什么用压缩包而不是零散文件入库：
 *   · `.gitattributes` 是 `* text=auto eol=lf`，零散文本文件会被改换行，字节一变
 *     `bundle.ts` 的 sha256 校验就会拒绝加载；
 *   · 压缩过的代码做三方合并没有意义。
 *
 * 装配完成后调 `app/official-ui/build-v3.mjs` 打补丁并重生成 `bundle-manifest.json`
 * —— **补丁改了 index.html，清单不重算，应用会拒绝加载 v3**。
 *
 * 环境变量：
 *   SKIP_V3_STAGE=1     跳过装配（只做界面开发时用；发行包不要这样打）
 *   OV_SKIP_V3_PATCH=1  只装配不打补丁（排查「是补丁还是产物的问题」时用）
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCK_PATH = path.join(REPO, "scripts/v3-runtime.lock.json");
const DEST = path.join(REPO, "app/desktop/src/renderer/public/v3");

if (process.env.SKIP_V3_STAGE === "1") {
  console.log("⚠ SKIP_V3_STAGE=1：跳过 v3 产物装配（发行包不要这样打）");
  process.exit(0);
}

if (!existsSync(LOCK_PATH)) {
  console.error(`✗ 缺锁文件：${path.relative(REPO, LOCK_PATH)}`);
  process.exit(1);
}
const lock = JSON.parse(readFileSync(LOCK_PATH, "utf8"));

// ── 版本一致性（第 2041 轮加）─────────────────────────────────────────────
// 为什么必须挡：v3 运行时通过 v3-workbench preload 与宿主通信。
// preload / protocol / gateway / MCP 在 4.0.4 里都改过，如果只把 v3 运行时切到 4.0.4
// 而其余仍是 4.0.3，就成了一个**没有任何一方测过**的组合：打包能过、清单也一致，
// 但只能说明文件没坏，不能说明它们能配合工作。
const PRODUCT_VERSION_PATH = path.join(REPO, "scripts/reference-version.json");
if (!existsSync(PRODUCT_VERSION_PATH)) {
  console.error(`✗ 缺产品参照版本文件：${path.relative(REPO, PRODUCT_VERSION_PATH)}`);
  process.exit(1);
}
const productVersion =
  process.env.OV_REFERENCE_VERSION ??
  JSON.parse(readFileSync(PRODUCT_VERSION_PATH, "utf8")).version;

if (lock.version !== productVersion) {
  console.error("✗ v3 运行时与产品其余部分版本不一致（半升级状态）");
  console.error(`  v3 运行时锁文件：${lock.version}（${lock.archive.path}）`);
  console.error(`  产品参照版本：  ${productVersion}（scripts/reference-version.json` +
    (process.env.OV_REFERENCE_VERSION ? " 被 OV_REFERENCE_VERSION 覆盖）" : "）"));
  console.error("  切版本时必须同时改：reference-version.json、v3-runtime.lock.json、对应的 v3 压缩包，");
  console.error("  以及 preload / protocol / gateway / MCP / 门禁基线。");
  process.exit(1);
}
const version = lock.version;

const sha256 = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
let source = null;

const archive = path.join(REPO, lock.archive.path);
if (existsSync(archive)) {
  const got = sha256(archive);
  if (got !== lock.archive.sha256) {
    console.error(`✗ 压缩包校验失败：${path.relative(REPO, archive)}`);
    console.error(`  期望 ${lock.archive.sha256}`);
    console.error(`  实际 ${got}`);
    process.exit(1);
  }
  rmSync(DEST, { recursive: true, force: true });
  mkdirSync(DEST, { recursive: true });
  execFileSync("tar", ["-xzf", archive, "-C", DEST], { stdio: "inherit" });
  source = `仓库压缩包 ${path.relative(REPO, archive)}`;
} else {
  const fallback = path.join(REPO, `.probe/reference/${version}/asar/out/renderer/v3`);
  if (!existsSync(fallback)) {
    console.error(`✗ 找不到 v3 产物：既没有 ${path.relative(REPO, archive)}，也没有 ${path.relative(REPO, fallback)}`);
    console.error("  只做界面开发可设 SKIP_V3_STAGE=1；打包发行版必须装配。");
    process.exit(1);
  }
  console.warn(`⚠ 仓库里没有 ${path.relative(REPO, archive)}，回退到未入库的参照快照 .probe/reference/${version}`);
  rmSync(DEST, { recursive: true, force: true });
  mkdirSync(DEST, { recursive: true });
  cpSync(fallback, DEST, { recursive: true });
  source = `参照快照 .probe/reference/${version}`;
}

if (!existsSync(path.join(DEST, "bundle-manifest.json"))) {
  console.error("✗ 装配后缺 bundle-manifest.json");
  process.exit(1);
}

if (process.env.OV_SKIP_V3_PATCH === "1") {
  console.log(`⚠ OV_SKIP_V3_PATCH=1：只装配不打补丁（${source}）`);
} else {
  execFileSync(process.execPath, [path.join(REPO, "app/official-ui/build-v3.mjs"), DEST], { stdio: "inherit" });
}
console.log(`✓ v3 ${version} 已装配（来源：${source}）`);
