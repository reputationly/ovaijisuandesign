#!/usr/bin/env node
/**
 * 把新栈（Electron + NestJS）打包需要的一切装配进 `app/desktop/build-resources/`，
 * 之后由 electron-builder 的 `extraResources` 整体搬进产物的 `resources/`。
 *
 * ## 为什么要有这个中间目录
 *
 * `app/desktop/src/main/paths.ts` 的 `resourceRoots()` 规定：发布包里资源在
 * `process.resourcesPath`，开发时在仓库根。中间要落的七样，逐一都有消费方：
 *
 * | resources/ 下的路径 | 消费方 |
 * |---|---|
 * | `opencode/opencode` | `locateOpencode`（opencode/index.ts:74） |
 * | `gateway/dist/main.js` | `index.ts:111` |
 * | `mcp-tools/dist/main.js` | `locateMcpEntry`（opencode/index.ts:98） |
 * | `opencode-plugin-hilo/dist/index.js` | `locatePlugin`（opencode/index.ts:109） |
 * | `agent-profiles/v2/config` | `locateProfile`（opencode/index.ts:89） |
 * | `skills/` | `locateBundledSkills`（skills/seed.ts:9） |
 * | `home-showcase/` | `homeShowcaseDir()`（home-showcase.ts:250） |
 *
 * 另外两样不走 resources/：`out/official-ui` 在 asar 里（`protocol.ts:34` 读
 * `app.getAppPath()/out/official-ui`），`resources/home-showcase` 里的 media 由首启预热
 * 写到 userData（`showcase-warm.ts`）—— 包内那份 `resources/` 是只读的，写不进去。
 *
 * ## 三件不能想当然的事
 *
 * **1. 依赖树要可移植。** pnpm 的 `node_modules` 是一堆指向根 `.pnpm/` 的软链，直接拷
 * 过去全是断链。`pnpm deploy --prod` 会重新落一份**目录内自洽**的树（workspace 依赖
 * 也解开成指向本目录 `.pnpm/` 的软链），这是唯一可靠的办法 —— 已实测：deploy 出来的
 * gateway 能起、`/api/canvas` 回 200。
 *
 * **2. 原生模块是平台专属的。** `sharp` 的 `@img/sharp-libvips-darwin-arm64`、
 * `better-sqlite3` 的 `.node` 都是按构建机平台落的。**在 mac 上 stage 出来的必然是
 * darwin 变体**，所以每个目标平台必须在自己的 runner 上 stage —— 不能交叉复用。
 * （release 矩阵因此要一个 target 一个 runner，和旧栈的做法一致。）
 *
 * **3. ABI 要按 Electron 重编。** 产物里 gateway 是用 `process.execPath` +
 * `ELECTRON_RUN_AS_NODE=1` 跑的（`paths.ts:55`），也就是**用 Electron 自带的 Node**。
 * pnpm 装出来的 `better-sqlite3` / `sharp` 是按系统 Node 的 ABI 编的，直接用会抛
 * `NODE_MODULE_VERSION` 不一致 —— 而且只在第一次碰资产库时才抛，gateway 照常启动，
 * 表现是「生成成功了却登记不进资产库」。所以本脚本跑完必须再过一遍
 * `electron-rebuild`（见 `--rebuild`）。
 *
 * ## 用法
 *
 *   node scripts/stage-desktop-resources.mjs                 # 装配
 *   node scripts/stage-desktop-resources.mjs --rebuild       # 装配 + 按 Electron ABI 重编原生模块
 *   node scripts/stage-desktop-resources.mjs --out /tmp/x
 */

import { execFileSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const OUT = path.resolve(REPO, opt("--out", "app/desktop/build-resources"));
/** Electron 版本从 devDependency 里读 —— 原生模块要按它的 ABI 编，写死了就会漂。 */
const ELECTRON_VERSION = JSON.parse(readFileSync(path.join(REPO, "app/desktop/package.json"), "utf8")).devDependencies?.electron;

/**
 * 要 `pnpm deploy` 的包。`dist` 由 turbo build 产出，本脚本不负责编。
 * 无依赖的（opencode-plugin-hilo）走纯拷贝 —— deploy 它只会平白多一份空 node_modules。
 */
const DEPLOY = [
  { filter: "@ov/gateway", dir: "gateway" },
  { filter: "@ov/mcp-tools", dir: "mcp-tools" },
];

/** 纯拷贝的资源。`to` 是相对 OUT 的目标路径。 */
const COPY = [
  { from: "app/packages/opencode-plugin-hilo/dist", to: "opencode-plugin-hilo/dist" },
  { from: "assets/agent-profiles/v2/config", to: "agent-profiles/v2/config" },
  { from: "assets/skills", to: "skills" },
  // **不带 media/**。那 468MB 靠 `showcase-assets/:key` 的 302 回落 CDN，
  // 首启由 showcase-warm 预热前 24 张封面到 userData（包内是只读的，写不了）。
  { from: "assets/home-showcase", to: "home-showcase", skip: (name) => name === "media" },
];

/**
 * pnpm / npx 的**真实 JS 入口**，用当前 node 去跑。
 *
 * Windows 上它们是 `.cmd` 垫片，而 Node 20.12+/22 起**不允许 spawnSync 直接执行
 * `.cmd` / `.bat`**（CVE-2024-27980 的加固）—— 不处理会抛 `EINVAL`。
 * 这个坑踩了两次才对上：先是 `ENOENT`（没加 `.cmd` 后缀），改完变成 `EINVAL`
 * （加了后缀但垫片依然不可直接执行）。两次是同一个根因：**垫片根本不是可执行文件**。
 *
 * 找真正的 JS 入口：pnpm 跟着 `PNPM_HOME`（`pnpm/action-setup` 会设），npx-cli.js
 * 跟着 Node 一起装。**全程不过 shell**，所以 checkout 路径带空格也不会被重新解析 ——
 * `shell: true` 那条路会，而且失败时错得莫名其妙。
 */
function pmCli(name) {
  const candidates = [];
  if (process.env.PNPM_HOME) candidates.push(path.join(process.env.PNPM_HOME, `${name}.cjs`));
  candidates.push(path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", `${name}-cli.js`));
  const found = candidates.find((c) => existsSync(c));
  return found ? { cmd: process.execPath, prefix: [found] } : { cmd: name, prefix: [] };
}

function runPm(name, args, opts = {}) {
  const { cmd, prefix } = pmCli(name);
  return run(cmd, [...prefix, ...args], opts);
}

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });
}

/** 目录体积（MB）。用 `du` 而不是递归 walk —— node_modules 里有几万个软链，walk 很慢。
 *  Windows 上没有 `du`（`tar` 也没有），只打日志所以返回 0 而不是抛错。 */
function dirSizeMb(dir) {
  if (process.platform === "win32") return 0; // Windows 没有 du；只是日志，不该因此失败
  try {
    return (Number(execFileSync("du", ["-sk", dir], { encoding: "utf8" }).split(/\s+/)[0]) * 1024) / 1048576;
  } catch {
    return 0;
  }
}

function main() {
  if (!ELECTRON_VERSION) throw new Error("app/desktop/package.json 里读不到 electron 版本");
  console.log(`装配目标：${path.relative(REPO, OUT)}`);
  console.log(`Electron：${ELECTRON_VERSION}\n`);

  rmSync(OUT, { recursive: true, force: true });

  for (const { filter, dir } of DEPLOY) {
    process.stdout.write(`  pnpm deploy ${filter} → ${dir} … `);
    runPm("pnpm", ["--filter", filter, "deploy", "--prod", path.join(OUT, dir)]);
    const dist = path.join(OUT, dir, "dist");
    if (!existsSync(dist)) throw new Error(`${filter} deploy 出来没有 dist/ —— 先跑 turbo build`);
    console.log(`${dirSizeMb(path.join(OUT, dir)).toFixed(0)} MB`);
  }

  for (const { from, to, skip } of COPY) {
    const src = path.join(REPO, from);
    if (!existsSync(src)) throw new Error(`找不到 ${from}`);
    const dest = path.join(OUT, to);
    // `cpSync` 的 filter 返回 **true 才保留**。而 COPY 里写的是「要排除什么」
    // （skip），所以这里要取反 —— 别再套多层否定，改成两个名字才不绕。
    const isSkipped = skip ? (s) => skip(path.basename(s)) : () => false;
    cpSync(src, dest, { recursive: true, filter: (s) => !isSkipped(s) });
    console.log(`  拷贝 ${from} → ${to}（${dirSizeMb(dest).toFixed(0)} MB）`);
  }

  // opencode 由 scripts/fetch-opencode.mjs 落在 app/packages/service/bin/，这里搬进
  // resources/opencode/（`locateOpencode` 的第 ① 级找的就是 `resources/opencode/opencode`）。
  //
  // **缺了必须报错**，不能装配出一个缺 agent runtime 的目录就收工 —— 那样打出来的包
  // 装完表现是「agent 起不来、历史面板空白」，而用户完全不知道该装什么。
  // `locateOpencode` 确实有第 ④ 级兜底（借本机官方 MiniMax Design 的二进制），
  // 那在开发机上是便利、在别人机器上是静默的错。
  const ocName = process.platform === "win32" ? "opencode.exe" : "opencode";
  const ocSrc = path.join(REPO, "app/packages/service/bin", ocName);
  const ocDest = path.join(OUT, "opencode", ocName);
  if (existsSync(ocSrc)) {
    cpSync(ocSrc, ocDest);
    chmodSync(ocDest, 0o755);
    // 版本戳一起带走：产物里能自证装的是哪一版，排查时不用回头问构建机。
    const stamp = path.join(REPO, "app/packages/service/bin/.version");
    if (existsSync(stamp)) cpSync(stamp, path.join(OUT, "opencode/.version"));
    console.log(`  opencode ← app/packages/service/bin（${dirSizeMb(path.join(OUT, "opencode")).toFixed(0)} MB）`);
  } else if (flag("--allow-missing-opencode")) {
    console.log("\n⚠ 缺 opencode，按 --allow-missing-opencode 放行。**这个包不能发给用户。**");
  } else {
    throw new Error(
      [
        "缺 opencode。先跑：node scripts/fetch-opencode.mjs",
        "（离线 / github 不可达时可加 --allow-missing-opencode 放行，但那样的包不能分发。）",
      ].join("\n"),
    );
  }

  writeFileSync(
    path.join(OUT, ".staged.json"),
    `${JSON.stringify(
      {
        electron: ELECTRON_VERSION,
        platform: process.platform,
        arch: process.arch,
        deploy: DEPLOY.map((d) => d.dir),
        copy: COPY.map((c) => c.to),
        opencode: existsSync(path.join(OUT, "opencode", ocName)),
      },
      null,
      2,
    )}\n`,
  );

  if (flag("--rebuild")) rebuild();

  console.log(`\n✓ 装配完成，合计 ${dirSizeMb(OUT).toFixed(0)} MB`);
}

/**
 * 按 Electron 的 ABI 重编原生模块。
 *
 * 只对**本机架构**生效（`@electron/rebuild` 会下对应平台的预编译或用 electron-rebuild
 * 重新 node-gyp）。所以每个目标平台都得在自己的 runner 上跑这一步 —— 和 stage 本身
 * 一样的约束。
 */
function rebuild() {
  if (!ELECTRON_VERSION) return;
  console.log(`\n按 Electron ${ELECTRON_VERSION} 的 ABI 重编原生模块 …`);
  // `--module-dir` 指的是**带 package.json 的包根**，不是 node_modules ——
  // electron-rebuild 会去读 `<module-dir>/package.json` 找依赖树，而 pnpm deploy
  // 出来的 node_modules 顶层并没有 package.json（传它会 ENOENT）。
  // 只挑 better-sqlite3：sharp 是 prebuilt N-API 包，ABI 跨 Node/Electron 版本稳定，
  // 重编它只会多一次 node-gyp 和一堆编译输出。
  const mods = ["gateway", "mcp-tools"].filter((d) => existsSync(path.join(OUT, d, "node_modules")));
  for (const dir of mods) {
    const abs = path.join(OUT, dir);
    process.stdout.write(`  ${dir} … `);
    runPm("npx", ["--yes", "@electron/rebuild", "--version", ELECTRON_VERSION, "--module-dir", abs, "--only", "better-sqlite3"], {
      stdio: ["ignore", "inherit", "inherit"],
    });
    console.log("done");
  }
  console.log("  （sharp 是 prebuilt N-API 包，跨 Node/Electron ABI 稳定，不需要重编。）");
}

try {
  main();
} catch (err) {
  console.error(`\nstage 失败：${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
}
