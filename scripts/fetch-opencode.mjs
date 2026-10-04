#!/usr/bin/env node
/**
 * 取 agent runtime（opencode）到 `app/packages/service/bin/`。
 *
 * **为什么要有这个脚本。** `locateOpencode`（app/desktop/src/main/opencode/index.ts:72）
 * 找 4 个位置：发布包 `resources/opencode/` → `$OPENCODE_BIN` → 仓库内
 * `app/packages/service/bin/` → `$PATH`。前两个在开发时都不成立，第三个以前压根不存在 ——
 * 于是 dev 和打包都只能落到「用户自己装 opencode」这个前提上，而 `pnpm dev` 连历史面板
 * 都会空白（没有 agent 运行时就没有会话）。这个脚本把第 ③ 级真正填上。
 *
 * **版本钉死。** README 第 16 行写的是「opencode 1.18.18，MIT，原封不动嵌进去当 agent
 * runtime」—— 插件和 agent 配置都是按这一版写的，所以这里不接受 `--version` 覆盖，
 * 只接受 `--target`（换架构）。要升级就改这一处常量，让 diff 里看得见。
 *
 * 用法：
 *   node scripts/fetch-opencode.mjs                     # 当前平台的架构
 *   node scripts/fetch-opencode.mjs --target x86_64-apple-darwin
 *   node scripts/fetch-opencode.mjs --target x86_64-pc-windows-msvc
 *
 * CI 里每个 target 单独跑一次再打包 —— electron-builder 一次只出一个架构，
 * 共用同一个 checkout 时后一个会覆盖前一个，所以 release 的矩阵是「一个 target 一个 runner」。
 */

import { execFileSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { chmod, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { execPath } from "node:process";

/** 钉死的版本。见文件头。 */
const VERSION = "1.18.18";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEST_DIR = path.join(REPO_ROOT, "app/packages/service/bin");

/**
 * Rust triple → release 资产名。
 *
 * 资产名用的是 `darwin-arm64` / `windows-x64` 这套命名，**不是** Rust triple 里
 * `aarch64` / `pc-windows-msvc` 那一套 —— 两者对不上是这里最容易写错的地方。
 *
 * `baseline` 变体是给没有 AVX2 的老 x86 CPU 用的。对外分发的 x86 产物默认用
 * baseline：多一点点性能损失，换老机器不崩。想跟官方对齐就把 BASELINE 置成 false
 * （官方 `Resources/opencode/opencode` 用的是哪一版，二进制里看不出来，得实测）。
 */
const BASELINE = true;

const TARGETS = {
  "aarch64-apple-darwin": { asset: "opencode-darwin-arm64.zip", exe: "opencode" },
  "x86_64-apple-darwin": { asset: `opencode-darwin-x64${BASELINE ? "-baseline" : ""}.zip`, exe: "opencode" },
  "x86_64-pc-windows-msvc": { asset: `opencode-windows-x64${BASELINE ? "-baseline" : ""}.zip`, exe: "opencode.exe" },
  "aarch64-pc-windows-msvc": { asset: "opencode-windows-arm64.zip", exe: "opencode.exe" },
};

/** 没给 --target 时按当前机器推一个 Rust triple。 */
function hostTarget() {
  const arch = process.arch === "arm64" ? "aarch64" : "x86_64";
  if (process.platform === "darwin") return `${arch}-apple-darwin`;
  if (process.platform === "win32") return `${arch}-pc-windows-msvc`;
  throw new Error(`没有 ${process.platform} 的预编译产物；本项目只发 macOS 和 Windows。`);
}

/**
 * 资产 URL。
 *
 * 正常是 `github.com/.../releases/download/v<ver>/<asset>`，**但那条路在部分网络下
 * 不可达**（国内直连 github.com 会超时，而 `api.github.com` 通）。所以顺序是：
 * 先试直链，失败/超时再退到 API —— `api.github.com` 上 asset 本身能拿到二进制流
 * （`Accept: application/octet-stream`），不需要经过 github.com。
 */
function assetUrls(asset) {
  return [
    `https://github.com/anomalyco/opencode/releases/download/v${VERSION}/${asset}`,
    assetIdUrl(asset),
  ];
}

let cachedAssetId;
function assetIdUrl(asset) {
  if (!cachedAssetId) cachedAssetId = resolveAssetId(asset);
  return cachedAssetId;
}

/** 查 API 拿 asset 的 id，0/None 表示没查到。 */
function resolveAssetId(asset) {
  const api = `https://api.github.com/repos/anomalyco/opencode/releases/tags/v${VERSION}`;
  const raw = execFileSync("curl", ["-sfL", "--max-time", "60", api], { encoding: "utf8", maxBuffer: 8 << 20 });
  const rel = JSON.parse(raw);
  const hit = (rel.assets ?? []).find((a) => a.name === asset);
  if (!hit) throw new Error(`v${VERSION} 的资产里没有 ${asset}；已发布的是：\n  ${(rel.assets ?? []).map((a) => a.name).join("\n  ")}`);
  return `https://api.github.com/repos/anomalyco/opencode/releases/assets/${hit.id}`;
}

async function download(urls, dest) {
  let lastError;
  for (const [i, url] of urls.entries()) {
    try {
      process.stderr.write(`  下载 ${url}\n`);
      await fetchToFile(url, dest);
      return;
    } catch (err) {
      lastError = err;
      process.stderr.write(`  失败：${err instanceof Error ? err.message : String(err)}\n`);
      if (i < urls.length - 1) process.stderr.write("  退到下一个源…\n");
    }
  }
  throw lastError;
}

async function fetchToFile(url, dest) {
  const res = await fetch(url, {
    headers: url.includes("api.github.com") ? { Accept: "application/octet-stream" } : {},
    redirect: "follow",
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf("--target");
  const target = i >= 0 ? argv[i + 1] : hostTarget();
  if (!target) throw new Error("--target 后面要跟 triple");
  const spec = TARGETS[target];
  if (!spec) throw new Error(`不认识的 target：${target}\n  支持：${Object.keys(TARGETS).join(" / ")}`);

  await mkdir(DEST_DIR, { recursive: true });
  const dest = path.join(DEST_DIR, spec.exe);
  const stamp = path.join(DEST_DIR, ".version");

  // 已经是这一版就什么都不做。CI 里每个 runner 都会跑一次，重复下载 44MB 纯属浪费。
  if (await exists(stamp) && (await readFile(stamp, "utf8")).trim() === VERSION) {
    if (await exists(dest)) {
      console.log(`opencode ${VERSION} 已经在 ${path.relative(REPO_ROOT, dest)}，跳过。`);
      return;
    }
  }

  const tmp = await mkdtemp(path.join(tmpdir(), "ov-opencode-"));
  try {
    const zip = path.join(tmp, spec.asset);
    console.log(`取 opencode ${VERSION}（${target}）…`);
    await download(assetUrls(spec.asset), zip);

    const size = (await stat(zip)).size;
    if (size < 1_000_000) throw new Error(`下到的只有 ${size} 字节，多半是错误页而不是 zip`);

    process.stderr.write("  解压…\n");
    await extract(zip, tmp, spec.exe);

    const got = path.join(tmp, spec.exe);
    if (spec.exe.endsWith(".exe") === false) await chmod(got, 0o755);
    const version = probeVersion(got, spec.exe.endsWith(".exe"));
    if (version !== VERSION) {
      throw new Error(`版本对不上：拿到的 ${version}，要的是 ${VERSION}。资产名或 tag 写错了？`);
    }

    await rename(got, dest);
    await writeFile(stamp, `${VERSION}\n`);
    console.log(`✓ opencode ${version} → ${path.relative(REPO_ROOT, dest)}（${(size / 1048576).toFixed(1)} MB zip）`);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

async function extract(zip, dir, exeName) {
  // zip 里通常就是 exeName 一个文件，也有带一层目录的；两种都吃。
  if (process.platform === "win32") {
    execFileSync("powershell", ["-NoProfile", "-Command", `Expand-Archive -Force -LiteralPath '${zip}' -DestinationPath '${dir}'`], { stdio: "inherit" });
  } else {
    execFileSync("unzip", ["-o", "-q", zip, "-d", dir], { stdio: "inherit" });
  }
  const direct = path.join(dir, exeName);
  if (await exists(direct)) return;
  const { readdir } = await import("node:fs/promises");
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const nested = path.join(dir, entry.name, exeName);
    if (await exists(nested)) {
      await rename(nested, direct);
      return;
    }
  }
  throw new Error(`解压后没找到 ${exeName}`);
}

/** 跑一下 `--version` 确认拿到的是能用的二进制。 */
function probeVersion(bin, isWindows) {
  try {
    const out = execFileSync(bin, ["--version"], { encoding: "utf8", timeout: 30_000, stdio: ["ignore", "pipe", "pipe"] });
    const m = out.match(/(\d+\.\d+\.\d+)/);
    if (!m) throw new Error(`输出里没有版本号：${out.trim().slice(0, 80)}`);
    return m[1];
  } catch (err) {
    // 交叉架构的二进制在本机跑不起来（arm64 上跑 x64 需要 Rosetta，Windows 的更跑不了）。
    // 这不是错误 —— 文件在就已经够了，真正能不能跑由目标机器验证。
    if (isWindows || err.code === "ENOEXEC" || err.code === "EBADARCH") {
      process.stderr.write(`  （本机跑不了这个架构的二进制，跳过版本自检）\n`);
      return VERSION;
    }
    throw err;
  }
}

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

main().catch((err) => {
  console.error(`fetch-opencode 失败：${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
