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
 *
 * `--from <本地 zip>` 是**给「这台机器下不到」准备的**：github 被墙、或网络受限时手动下
 * 一份 zip 丢进来即可，走的是和线上一模一样的解压 → 校验 → 落盘路径。它也是这条路径
 * 唯一的本地测试入口 —— 脚本里那些魔数、体积、跨卷 rename 的坑，没有它就只能靠押
 * CI 一轮 8~10 分钟去撞（见 scripts/verify-fetch-opencode.mjs）。
 */

import { execFileSync } from "node:child_process";
import { chmodSync, closeSync, cpSync, createWriteStream, openSync, readSync } from "node:fs";
import { chmod, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
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

/**
 * 没给 `--target` 时按当前机器推一个 Rust triple。
 *
 * platform / arch 是入参（默认取进程自己的）—— 这是个纯函数，**不该只能在真 Windows
 * 上验**。本项目出的平台 bug 几乎都是「本地跑不到、CI 上去打脸」，
 * 见 scripts/verify-platform-branches.mjs。
 */
export function hostTarget(platform = process.platform, arch = process.arch) {
  const a = arch === "arm64" ? "aarch64" : "x86_64";
  if (platform === "darwin") return `${a}-apple-darwin`;
  if (platform === "win32") return `${a}-pc-windows-msvc`;
  throw new Error(`没有 ${platform} 的预编译产物；本项目只发 macOS 和 Windows。`);
}

/**
 * 资产 URL。
 *
 * 正常是 `github.com/.../releases/download/v<ver>/<asset>`，**但那条路在部分网络下
 * 不可达**（国内直连 github.com 会超时，而 `api.github.com` 通）。所以顺序是：
 * 先试直链，失败/超时再退到 API —— `api.github.com` 上 asset 本身能拿到二进制流
 * （`Accept: application/octet-stream`），不需要经过 github.com。
 *
 * 这两个源在 `download()` 里以**函数**形式按需取，见那里的注释。
 */

/** 查 API 拿 asset 的可下载地址。慢，但能绕开被墙的 github.com。 */
function resolveAssetUrl(asset) {
  const api = `https://api.github.com/repos/anomalyco/opencode/releases/tags/v${VERSION}`;
  const raw = execFileSync("curl", ["-sfL", "--max-time", "60", api], { encoding: "utf8", maxBuffer: 8 << 20 });
  const rel = JSON.parse(raw);
  const hit = (rel.assets ?? []).find((a) => a.name === asset);
  if (!hit) throw new Error(`v${VERSION} 的资产里没有 ${asset}；已发布的是：\n  ${(rel.assets ?? []).map((a) => a.name).join("\n  ")}`);
  return `https://api.github.com/repos/anomalyco/opencode/releases/assets/${hit.id}`;
}

/**
 * 下载，两个源按顺序试。
 *
 * **第二个源是懒的。** 之前写成 `assetUrls()` 返回一个 URL 数组，两个元素在数组
 * 字面量里就一起求值了 —— 于是每次运行都会先打一次 API，**不管直连能不能用**。
 * 那个 API 一慢（GitHub 偶尔会抖），整个脚本就在"还没开始下载"的时候挂掉。
 * CI 上撞到过一次：日志里连 `下载 …` 那行都没有，说明直连压根没被试过。
 *
 * 所以传的是**函数**，用到了才算。
 *
 * ## 每个源内部还要重试
 *
 * 单源 3 次。46MB 从 GitHub 拉抖得厉害（darwin-x64 在 CI 上因为这个挂过一次，
 * 而上一轮同样的代码是绿的）。重试是安全的：下完有魔数 + 体积 + 版本三重校验，
 * 而且每次都重写同一个临时文件，不会攒出半截产物。
 */
const ATTEMPTS = 3;

async function download(asset, dest) {
  const sources = [
    { what: "直链", url: () => `https://github.com/anomalyco/opencode/releases/download/v${VERSION}/${asset}` },
    { what: "API 兜底", url: () => resolveAssetUrl(asset) },
  ];
  const failures = [];
  for (const s of sources) {
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      try {
        const url = s.url(); // 懒求值：直链全失败才打 API
        if (attempt > 1) process.stderr.write(`  重试 ${attempt}/${ATTEMPTS}（${s.what}）\n`);
        else process.stderr.write(`  下载（${s.what}）${url}\n`);
        await fetchToFile(url, dest);
        return;
      } catch (err) {
        const why = err instanceof Error ? err.message : String(err);
        failures.push(`${s.what} 第 ${attempt} 次：${why}`);
        process.stderr.write(`  失败：${why}\n`);
      }
    }
    process.stderr.write(`  ${s.what} 试了 ${ATTEMPTS} 次都不行，退到下一个源…\n`);
  }
  throw new Error(`两个源都下不动：\n  ${failures.join("\n  ")}`);
}

async function fetchToFile(url, dest) {
  const res = await fetch(url, {
    headers: url.includes("api.github.com") ? { Accept: "application/octet-stream" } : {},
    redirect: "follow",
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

/**
 * 删掉临时目录。**删不掉不算失败。**
 *
 * ## 为什么这里必须吞掉异常
 *
 * 它只写在 `finally` 里，而 **`finally` 抛出的异常会替换掉真正的错误** ——
 * 于是取件本来成功，日志上却只看到一条和成功毫无关系的报错。
 *
 * 真实踩过（2026-10-07，Windows CI）：
 *
 *     解压…
 *     fetch-opencode 失败：EBUSY: resource busy or locked,
 *       unlink 'D:\a\…\bin\.fetch-4zLV2F\opencode.exe'
 *
 * 那一步之前下载、体积、魔数校验全都过了，二进制也已经落到 `bin/opencode.exe`，
 * 整轮 8~10 分钟的出包验证就因为「临时文件删不掉」判红。Windows 上刚写过的文件
 * 常被杀毒/索引器短暂持有，锁是**瞬时**的，所以先重试几次。
 *
 * 删不掉最坏也就是 `bin/` 下留一个 `.fetch-XXXX` 目录（那里本来就 gitignore），
 * 下一轮 `mkdtemp` 换个名字，不影响任何东西 —— 远比整个构建失败划算。
 */
async function cleanupDir(dir) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await rm(dir, { recursive: true, force: true });
      return true;
    } catch (err) {
      if (attempt === 5) {
        console.warn(
          `  ⚠ 临时目录 ${path.basename(dir)} 删不掉（${err.code ?? err.message}），` +
            `留着也不影响出包 —— 那里本来就 gitignore。`,
        );
        return false;
      }
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }
  return false;
}

/**
 * 改名，带 Windows 上必需的耐心。
 *
 * 刚解压出来的文件可能还被杀毒扫描器按着句柄不放，这时候 `rename` 抛
 * EPERM/EBUSY。重试几次通常就过去了；实在不行让它照常抛出去（那是真失败）。
 */
async function renameWithRetry(from, to) {
  for (let attempt = 1; ; attempt++) {
    try {
      await rename(from, to);
      return;
    } catch (err) {
      const transient = process.platform === "win32" && ["EPERM", "EBUSY", "EACCES"].includes(err.code);
      if (!transient || attempt >= 8) throw err;
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf("--target");
  const target = i >= 0 ? argv[i + 1] : hostTarget();
  if (!target) throw new Error("--target 后面要跟 triple");
  const spec = TARGETS[target];
  if (!spec) throw new Error(`不认识的 target：${target}\n  支持：${Object.keys(TARGETS).join(" / ")}`);

  // `--from`：跳过下载，直接用一份已经下好的 zip。**目标架构照常校验** ——
  // `--target win --from mac.zip` 必须是失败，而不是把 Mach-O 塞进 Windows 包。
  const fromIdx = argv.indexOf("--from");
  const from = fromIdx >= 0 ? argv[fromIdx + 1] : undefined;
  if (fromIdx >= 0 && !from) throw new Error("--from 后面要跟 zip 路径");

  // 临时目录**必须和目标同卷**。Windows 上 CI 的工作区在 D:\ 而 %TEMP% 在 C:\，
  // 跨卷 rename 直接 EXDEV（cross-device link not permitted）——踩过一次。
  await mkdir(DEST_DIR, { recursive: true });
  const dest = path.join(DEST_DIR, spec.exe);
  const stamp = path.join(DEST_DIR, ".version");
  const tmp = await mkdtemp(path.join(DEST_DIR, ".fetch-"));
  try {
    // 已经是这一版就什么都不做。CI 里每个 runner 都会跑一次，重复下载 44MB 纯属浪费。
    if ((await exists(stamp)) && (await readFile(stamp, "utf8")).trim() === VERSION && (await exists(dest))) {
      console.log(`opencode ${VERSION} 已经在 ${path.relative(REPO_ROOT, dest)}，跳过。`);
      return;
    }
    const zip = path.join(tmp, spec.asset);
    if (from) {
      if (!(await exists(from))) throw new Error(`--from 指的路径不存在：${from}`);
      console.log(`取 opencode ${VERSION}（${target}，来自 ${from}）…`);
      cpSync(from, zip);
    } else {
      console.log(`取 opencode ${VERSION}（${target}）…`);
      await download(spec.asset, zip);
    }

    // zip 自身的体积只用来排掉「下到的其实是错误页」——它压缩过，比解压后的
    // 小好几倍（darwin-arm64：zip 43.9MB → 二进制 139MB），拿它去过二进制的
    // 门槛会误杀。踩过一次。
    const zipSize = (await stat(zip)).size;
    if (zipSize < 1_000_000) throw new Error(`下到的只有 ${zipSize} 字节，多半是错误页而不是 zip`);

    process.stderr.write("  解压…\n");
    await extract(zip, tmp, spec.exe);

    const got = path.join(tmp, spec.exe);
    if (spec.exe.endsWith(".exe") === false) await chmod(got, 0o755);
    const check = verifyBinary(got, (await stat(got)).size, spec.exe.endsWith(".exe") ? "pe" : "macho");

    await renameWithRetry(got, dest);
    await writeFile(stamp, `${VERSION}\n`);
    const how = check.probed ? `自检 ${check.version}` : "已过魔数校验（本机架构跑不了，未自检）";
    console.log(`✓ opencode ${VERSION} → ${path.relative(REPO_ROOT, dest)}（${how}；zip ${(zipSize / 1048576).toFixed(1)} MB）`);
  } finally {
    // **绝不让这里的异常冒出去** —— finally 抛异常会顶掉真正的错误信息。
    await cleanupDir(tmp);
  }
}

/**
 * 解压命令。**选命令是纯函数**，跟实际执行分开 —— 这样「Windows 走 PowerShell、
 * 其他走 unzip」这条分支在 macOS 上也能断言，不用等真 Windows runner 才发现写错。
 *
 * PowerShell 的参数用**单引号**包 `-LiteralPath` / `-DestinationPath`：Windows 路径里
 * 常有 `C:\Users\runneradmin\...` 这种反斜杠和可能的括号，双引号会让 PowerShell 去做
 * 插值，单引号才是字面量。
 */
export function extractCommand(platform, zip, dir) {
  if (platform === "win32") {
    return { cmd: "powershell", args: ["-NoProfile", "-Command", `Expand-Archive -Force -LiteralPath '${zip}' -DestinationPath '${dir}'`] };
  }
  return { cmd: "unzip", args: ["-o", "-q", zip, "-d", dir] };
}

async function extract(zip, dir, exeName) {
  const { cmd, args } = extractCommand(process.platform, zip, dir);
  execFileSync(cmd, args, { stdio: "inherit" });
  // zip 里通常就是 exeName 一个文件，也有带一层目录的；两种都吃。
  const direct = path.join(dir, exeName);
  if (await exists(direct)) return;
  const { readdir } = await import("node:fs/promises");
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const nested = path.join(dir, entry.name, exeName);
    if (await exists(nested)) {
      await renameWithRetry(nested, direct);
      return;
    }
  }
  throw new Error(`解压后没找到 ${exeName}`);
}

/**
 * 校验取到的二进制。
 *
 * **硬标准是「文件对不对」，不是「本机能不能跑」。** 后者从来不是硬要求 ——
 * x64 产物在 arm64 构建机、Windows 产物在 mac 上都跑不起来，那是正常的。
 *
 * 所以：
 * - 大小和魔数是硬标准。魔数认 Mach-O（feedfacf / cffaedfe / cafebabe）和 PE（MZ）——
 *   截断的 zip、错误页、只剩半个文件都过不了这一关。
 * - `--version` 只是**尽力而为**的附加检查，失败只记日志不失败。曾经把它做成硬失败，
 *   结果 macos-14 上那个 x64 二进制跑不起来，报错只有一句
 *   `Command failed: …/opencode --version`，完全看不出是架构不对还是文件坏了 ——
 *   而这两种情况的处理方式完全相反。
 */
function verifyBinary(bin, size, expect) {
  if (size < 50_000_000) throw new Error(`只有 ${(size / 1048576).toFixed(1)}MB，opencode 单体二进制不该这么小`);

  const fd = openSync(bin, "r");
  const head = Buffer.alloc(4);
  try {
    readSync(fd, head, 0, 4, 0);
  } finally {
    closeSync(fd);
  }
  const magic = head.toString("hex");
  // Mach-O 的魔数是 4 字节，整个比对。
  const isMachO = ["feedfacf", "cffaedfe", "cafebabe", "befcafe"].includes(magic);
  // **PE 只有 2 字节** "MZ"。拿 4 字节的完整 hex 去比 "4d5a" 永远不相等 ——
  // 读 4 字节是上面 Mach-O 需要的，PE 这边得截前两位比。踩过一次。
  const isPE = magic.slice(0, 4) === "4d5a";
  if (!isMachO && !isPE) {
    throw new Error(`不是可执行文件（魔数 ${magic}）。多半下到了错误页而不是 zip。`);
  }
  // **格式要和 --target 对得上。** `--from` 是给人手动喂 zip 的入口，喂错了
  // （比如 `--target win --from 某个 mac 的 zip`）如果只查「是个可执行文件」就放行，
  // 产出的 Windows 包里会躺着一个 Mach-O —— 装上之后 spawn 直接失败，而构建是绿的。
  if (expect && ((expect === "pe" && !isPE) || (expect === "macho" && !isMachO))) {
    throw new Error(
      `格式和 target 对不上：--target 要的是 ${expect === "pe" ? "Windows PE" : "Mach-O"}，` +
        `拿到的是 ${isPE ? "Windows PE" : "Mach-O"}（魔数 ${magic}）。--from 喂错文件了。`,
    );
  }

  try {
    const out = execFileSync(bin, ["--version"], { encoding: "utf8", timeout: 30_000, stdio: ["ignore", "pipe", "pipe"] });
    const m = out.match(/(\d+\.\d+\.\d+)/);
    if (!m) throw new Error(`输出里没有版本号：${out.trim().slice(0, 80)}`);
    if (m[1] !== VERSION) throw new Error(`版本对不上：拿到的 ${m[1]}，要的是 ${VERSION}`);
    return { probed: true, version: m[1] };
  } catch (err) {
    // 跑不起来不等于文件坏 —— 交叉架构构建就是这样。把原因打出来，别让人只能猜。
    const code = err?.code ?? err?.status ?? "?";
    const sig = err?.signal ? ` signal=${err.signal}` : "";
    process.stderr.write(
      `  （本机 ${process.platform}/${process.arch} 跑不了这个 ${isPE ? "Windows" : "Mach-O"} 产物` +
        `（code=${code}${sig}），跳过版本自检 —— 文件本身已按魔数校验通过）\n`,
    );
    return { probed: false };
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

// cleanupDir 导出是为了让「删不掉不算失败」这条能离线断言 ——
// 它救的是整轮 8~10 分钟的出包验证，不能只靠押 CI 撞。
export { verifyBinary, TARGETS, VERSION as PINNED_VERSION, cleanupDir };

// 直接 `node scripts/fetch-opencode.mjs` 跑时执行 main()；被 import 时（测试）不跑。
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`fetch-opencode 失败：${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  });
}
