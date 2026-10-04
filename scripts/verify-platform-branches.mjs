#!/usr/bin/env node
/**
 * 打包脚本里**平台相关分支**的离线自检。
 *
 * ## 为什么专门有这个文件
 *
 * 这一轮出包，Windows 上连挂三次，全是同一个性质的问题：
 *
 *   1. `spawnSync pnpm ENOENT`          —— 没加 `.cmd` 后缀
 *   2. `spawnSync pnpm.cmd EINVAL`      —— 加了也没用，Node 不让 spawnSync 跑 `.cmd`
 *   3. `spawnSync pnpm ENOENT`          —— 改用 JS 入口，但路径猜错（`PNPM_HOME` 的上一级）
 *
 * 三个里有**没有一个是本地能撞出来的** —— 本机是 macOS、且没有 `PNPM_HOME`，
 * 这条分支一次都跑不到。于是每一轮都靠 CI 打脸，一轮 8~10 分钟 × 三个平台。
 *
 * ## 这份自检的原则
 *
 * 不去「在 mac 上模拟 Windows」，而是**把平台变成入参**。这些函数本来就是纯的
 * 文件系统布局判断（哪个路径下有什么文件、该调哪个命令），把它们写成
 * `(platform, env, execPath) => …` 之后，用几个 fixture 目录就能把每个分支都跑一遍。
 *
 * 新增平台相关分支时，**在这里加一条**。这是唯一能让「本地 mac」覆盖到
 * 「真 Windows 会怎么走」的地方。
 *
 * 用法：`node scripts/verify-platform-branches.mjs`
 */

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractCommand, hostTarget } from "./fetch-opencode.mjs";
import { pmCli } from "./stage-desktop-resources.mjs";

let pass = 0;
let fail = 0;
const ok = (cond, what, detail) => {
  if (cond) {
    pass++;
    console.log(`  ✅ ${what}`);
  } else {
    fail++;
    console.log(`  ❌ ${what}${detail ? ` —— ${detail}` : ""}`);
  }
};

const work = mkdtempSync(path.join(tmpdir(), "ov-plat-"));
const fixture = (...parts) => path.join(work, ...parts);

/** 按 `pnpm/action-setup` 的真实布局造一个 PNPM_HOME：`.bin` 里只有垫片，JS 入口在上一级。 */
function makeActionSetupLayout() {
  const home = fixture("action-setup", "node_modules", ".bin");
  mkdirSync(home, { recursive: true });
  writeFileSync(path.join(home, "pnpm.cmd"), "@echo off\r\n"); // 垫片，故意放一个假的
  const entry = fixture("action-setup", "node_modules", "pnpm", "bin", "pnpm.cjs");
  mkdirSync(path.dirname(entry), { recursive: true });
  writeFileSync(entry, "#!/usr/bin/env node\n");
  return home;
}

console.log("平台相关分支的离线自检\n");

// ---------------------------------------------------------------------------
console.log("hostTarget()：没给 --target 时按平台推 triple");
{
  ok(hostTarget("darwin", "arm64") === "aarch64-apple-darwin", "darwin/arm64 → aarch64-apple-darwin");
  ok(hostTarget("darwin", "x64") === "x86_64-apple-darwin", "darwin/x64 → x86_64-apple-darwin");
  ok(hostTarget("win32", "x64") === "x86_64-pc-windows-msvc", "win32/x64 → x86_64-pc-windows-msvc");
  ok(hostTarget("win32", "arm64") === "aarch64-pc-windows-msvc", "win32/arm64 → aarch64-pc-windows-msvc");
  let threw = "";
  try {
    hostTarget("linux", "x64");
  } catch (e) {
    threw = e.message;
  }
  ok(threw.includes("linux"), "linux → 明确说不发这个平台", threw.slice(0, 40));
}

// ---------------------------------------------------------------------------
console.log("\nextractCommand()：Windows 走 PowerShell，其余走 unzip");
{
  const win = extractCommand("win32", "C:\\a b\\o.zip", "C:\\out dir");
  ok(win.cmd === "powershell", "win32 → powershell");
  ok(win.args[0] === "-NoProfile", "带 -NoProfile（否则读用户 profile，慢且可能报错）");
  const ps = win.args[2];
  // Windows 路径常含空格和反斜杠。**必须是单引号** —— 双引号会让 PowerShell 去做插值。
  ok(ps.includes("'C:\\a b\\o.zip'") && ps.includes("'C:\\out dir'"), "路径用单引号包住（空格/反斜杠安全）", ps);
  ok(ps.includes("-LiteralPath") && ps.includes("-DestinationPath"), "用 -LiteralPath（-Path 会把 [] 当通配符）");

  const mac = extractCommand("darwin", "/tmp/o.zip", "/tmp/out");
  ok(mac.cmd === "unzip", "darwin → unzip");
  ok(mac.args.join(" ") === "-o -q /tmp/o.zip -d /tmp/out", "unzip 参数正确", mac.args.join(" "));
}

// ---------------------------------------------------------------------------
console.log("\npmCli()：Windows 上必须解析到真实 JS 入口，绝不能是 .cmd 垫片");
{
  const home = makeActionSetupLayout();
  const fakeExec = fixture("fake-node", "node");

  // 关键用例：action-setup 的布局。**这一条能一次抓住 #1/#2/#3 三个 bug。**
  const r = pmCli("pnpm", { env: { PNPM_HOME: home }, platform: "win32", execPath: fakeExec, exists: existsSync });
  ok(r.cmd === fakeExec, "win32 → 用当前 node 跑（不是垫片）", `cmd=${r.cmd}`);
  ok(r.prefix.length === 1 && r.prefix[0].endsWith(path.join("pnpm", "bin", "pnpm.cjs")), "命中 PNPM_HOME 上一级的 pnpm.cjs", r.prefix.join());
  ok(!r.cmd.endsWith(".cmd") && !r.prefix.some((a) => a.endsWith(".cmd")), "命令行里没有任何 .cmd");

  // PNPM_HOME 直接指包根（另一种布局）也要认。
  const rootHome = fixture("pkgroot", "node_modules", "pnpm");
  mkdirSync(path.join(rootHome, "bin"), { recursive: true });
  writeFileSync(path.join(rootHome, "bin", "pnpm.cjs"), "#!/usr/bin/env node\n");
  const r2 = pmCli("pnpm", { env: { PNPM_HOME: rootHome }, platform: "win32", execPath: fakeExec, exists: existsSync });
  ok(r2.prefix[0] === path.join(rootHome, "bin", "pnpm.cjs"), "PNPM_HOME 指包根时也认", r2.prefix.join());

  // 找不到 → **必须报错**，不能静默退回不可执行的垫片（那只会换来一个看不出来的 ENOENT）。
  let msg = "";
  try {
    pmCli("npx", { env: {}, platform: "win32", execPath: fixture("nope", "node"), exists: () => false });
  } catch (e) {
    msg = e.message;
  }
  ok(msg.includes("找不到") && msg.includes(".cmd"), "win32 找不到入口 → 报错并点明别退回 .cmd", msg.slice(0, 50));

  // macOS 上退回裸名是对的（那里 pnpm 是有 shebang 的真脚本）。
  const mac = pmCli("pnpm", { env: {}, platform: "darwin", execPath: fakeExec, exists: () => false });
  ok(mac.cmd === "pnpm" && mac.prefix.length === 0, "darwin 找不到时退回裸名 pnpm（正确）", mac.cmd);
}

rmSync(work, { recursive: true, force: true });
console.log(`\n${fail === 0 ? "✓" : "✗"} ${pass} 通过 / ${fail} 失败`);
process.exitCode = fail === 0 ? 0 : 1;
