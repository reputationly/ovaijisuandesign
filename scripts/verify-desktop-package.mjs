#!/usr/bin/env node
/**
 * 核对打包产物的 `resources/` 布局是否满足 `resourceRoots()` 的契约。
 *
 * ## 为什么要有这个
 *
 * 契约的权威在 `app/desktop/src/main/paths.ts` 和各处 `locate*` 函数，而打包配置在
 * `app/desktop/electron-builder.yml` —— 两处相隔很远，没有编译器帮你对齐。而对不齐的
 * 症状极其难认：装完能启动、能看图，只是 agent 起不来、历史面板空白，或者生成成功
 * 却登记不进资产库。**打包本身不会报错，坏了要等用户才发现。**
 *
 * 所以在流水线里逐条断言，缺一条就红。清单和 stage 脚本的 COPY/DEPLOY 表保持一致。
 *
 * **除了「文件在不在」，还要查「架构对不对」** —— 只查存在的话，一个在 arm64 机器上
 * 打出来的 x64 包能全绿通过（它文件是齐的），但里面的原生模块全是 arm64 的，
 * Intel Mac 用户装上后一碰资产库才炸。见 `binaryArch` 上面那段注释。
 *
 * 用法：
 *   node scripts/verify-desktop-package.mjs                 # 自动找 dist-electron 下的产物
 *   node scripts/verify-desktop-package.mjs <产物目录>
 */

import { closeSync, existsSync, openSync, readFileSync, readSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * 产物里 opencode 可执行文件的名字。**按平台不同** —— Windows 上是 `opencode.exe`。
 *
 * 从产物路径反推是哪个平台（`win-unpacked` → Windows），而不是读 `process.platform`：
 * **本机是 mac，而校验的是别人机器上打出来的包** —— 读本机平台会验错对象
 * （win-x64 上就是这么误报「缺 opencode/opencode」的，实际上人家有 `opencode.exe`）。
 */
function opencodeExe(resources) {
  const isWin = /[\\/]win-unpacked[\\/]/.test(resources);
  return isWin ? "opencode.exe" : "opencode";
}

/**
 * 产物**自己的主二进制**是什么架构 —— 这才是这个包的真实架构。
 *
 * ## 为什么不按目录名猜
 *
 * electron-builder 只出一种架构时，目录就叫 `mac`，**不是** `mac-x64`。
 * 我原来按 `mac/` = x64 猜，结果栽了：GitHub 的 `macos-14` label 现在解析到
 * **arm64** 镜像，于是 `--mac --x64` 是在 arm64 机器上交叉编出来的，
 * 目录叫 `mac/`、看着像 x64，里面却全是 arm64 原生模块。
 *
 * **主二进制（`Contents/MacOS/<产品名>` 或 `win-unpacked/<产品名>.exe`）不会说谎** ——
 * electron-builder 交叉编时它也是目标架构，而原生模块是构建机的。拿它们互相比，
 * 就把「这个包到底是什么架构」和「里面的模块是什么架构」绑在同一个事实上。
 */
function productArch(resources) {
  const mac = path.resolve(resources, "..", "MacOS");
  if (existsSync(mac)) {
    for (const f of readdirSync(mac)) {
      const p = path.join(mac, f);
      if (statSync(p).isFile()) return { arch: binaryArch(p), from: path.relative(REPO, p) };
    }
  }
  // win-unpacked：resources 的同级就是 exe
  const dir = path.resolve(resources, "..");
  for (const f of readdirSync(dir)) {
    if (f.toLowerCase().endsWith(".exe")) {
      const p = path.join(dir, f);
      return { arch: binaryArch(p), from: path.relative(REPO, p) };
    }
  }
  return null;
}

/**
 * 读 Mach-O / PE 的架构。**不依赖 `lipo` 等外部命令** —— 所以在 mac 上也能验 Windows
 * 产物，而 CI 三个平台跑的是同一段代码。
 */
function binaryArch(file) {
  const fd = openSync(file, "r");
  try {
    const head = Buffer.alloc(512);
    readSync(fd, head, 0, 512, 0);
    const magicBE = head.readUInt32BE(0);
    const magicLE = head.readUInt32LE(0);
    // Mach-O 64
    if (magicLE === 0xfeedfacf || magicBE === 0xfeedfacf || magicBE === 0xcffaedfe) {
      if (magicBE === 0xcafebabe || magicBE === 0xbebafeca) return "fat";
      const cputype = magicLE === 0xfeedfacf ? head.readUInt32LE(4) : head.readUInt32BE(4);
      return cputype === 0x0100000c ? "arm64" : cputype === 0x01000007 ? "x64" : `cputype:${cputype.toString(16)}`;
    }
    // PE：MZ → e_lfanew(0x3C) → "PE\0\0" → machine(2 字节)
    if (head.readUInt16LE(0) === 0x5a4d) {
      const pe = head.readUInt32LE(0x3c);
      if (pe + 6 <= head.length && head.readUInt32LE(pe) === 0x00004550) {
        const machine = head.readUInt16LE(pe + 4);
        return machine === 0x8664 ? "x64" : machine === 0xaa64 ? "arm64" : `machine:${machine.toString(16)}`;
      }
    }
    return "未知格式";
  } finally {
    closeSync(fd);
  }
}

/** `resources/` 下必须存在的路径 → 谁在找它。 */
function required(resources) {
  const oc = opencodeExe(resources);
  return [
    [`opencode/${oc}`, "locateOpencode（agent runtime，缺了 agent 起不来）"],
    ["opencode/.version", "agent runtime 版本戳（自证装的是哪一版）"],
    ["gateway/dist/main.js", "index.ts:111（应用级 + 每个工作区的 gateway）"],
    ["mcp-tools/dist/main.js", "locateMcpEntry（agent 的 MCP server）"],
    ["opencode-plugin-hilo/dist/index.js", "locatePlugin（画布工具）"],
    ["agent-profiles/v2/config/base.json", "locateProfile（agent 配置）"],
    ["skills", "locateBundledSkills（自带技能）"],
    ["home-showcase/quick-start-config-v2.json", "homeShowcaseDir()（首页创作灵感，缺了首页是空的）"],
  ];
}

/** 明确**不该**在包里的。带了就等于白打包。 */
const FORBIDDEN = [
  ["home-showcase/media", "468MB 示例图。走 302 回落 CDN + 首启预热前 24 张到 userData（包内只读）"],
  [".staged.json", "装配过程的记账文件"],
];

/**
 * 产物根 → resources 目录。mac 是 `<x>.app/Contents/Resources`，win 是 `win-unpacked/resources`。
 */
function resourcesOf(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return null;
  if (existsSync(path.join(dir, "resources"))) return path.join(dir, "resources");
  let apps = [];
  try {
    apps = readdirSync(dir).filter((x) => x.endsWith(".app"));
  } catch {
    return null;
  }
  for (const app of apps) {
    const p = path.join(dir, app, "Contents", "Resources");
    if (existsSync(p)) return p;
  }
  return null;
}

/** 产物根 → electron-builder 的输出目录（清单和安装包都在这一层）。 */
function outDirOf(resources) {
  // mac: <x>.app/Contents/Resources → <x>.app/Contents → <x>.app
  // win: win-unpacked/resources      → win-unpacked
  const win = path.basename(resources) === "resources" && /[\\/]win-unpacked$/.test(path.dirname(resources));
  if (win) return path.dirname(resources);
  if (path.basename(path.dirname(resources)) === "Contents") return path.resolve(resources, "..", "..");
  return path.resolve(resources, "..");
}

/**
 * 核对「装出来的应用会自报哪个版本」。
 *
 * ## 为什么验的是清单 + 文件名，不是 `package.json`
 *
 * `app.getVersion()` 读的是 asar 里那份 package.json。直接去挖 asar 要实现一层
 * asar 解析，而这里要拦的其实不是「asar 里写没写对」（那必然和源文件一致），
 * 是**整条链有没有拿错版本**：`set-desktop-version.py` 漏跑、或者跑在
 * `electron-builder` 之后，包和清单就会带着**上一次发布**的版本号发出去。
 *
 * 那时症状极其难认：发布全绿、包能装能跑，只是客户端装完仍然认为有新版，
 * 而且每次点「检查更新」都被弹一次。所以这里从**产物**这一侧反查 ——
 * 清单的 `version:` 和安装包文件名里都必须带着预期的编码值。
 *
 * 只在传了 `--expect-version` / `EXPECT_VERSION` 时才查（发版流水线传，
 * CI 的出包验证不传 —— 那条流水线没有 tag，没有「预期的版本」这回事）。
 */
function checkVersion(resources, expect) {
  const out = outDirOf(resources);
  const isMac = !/win-unpacked/.test(resources);
  const manifest = path.join(out, isMac ? "latest-mac.yml" : "latest.yml");
  if (!existsSync(manifest)) {
    console.log(`  ❌ 找不到 ${path.basename(manifest)} —— 无从判断这个包会告诉客户端自己是哪一版`);
    return 1;
  }
  const text = readFileSync(manifest, "utf8");
  const m = text.match(/^version:\s*(.+?)\s*$/m);
  const got = m ? m[1].replace(/^['"]|['"]$/g, "") : null;
  let bad = 0;
  if (!got) {
    bad++;
    console.log(`  ❌ ${path.basename(manifest)} 里没有 version: 字段`);
  } else if (got !== expect) {
    bad++;
    console.log(`  ❌ 清单的 version 是 ${got}，期望 ${expect}`);
    console.log(`     —— 出包流程里 electron-builder **之前**应该有一句：`);
    console.log(`        python3 scripts/set-desktop-version.py <人读四段版本号>`);
    console.log(`     后果不是「版本号不好看」：客户端装完仍认为有新版，每次检查更新都被弹一次。`);
  } else {
    console.log(`  ✅ 清单 version = ${got}（客户端拿它和 app.getVersion() 比大小）`);
  }
  // 文件名里也带一遍 —— electron-builder 用同一个版本命名产物。两处对不上
  // 说明出包中途版本被改过（改在了 electron-builder 之后）。
  const pkgs = readdirSync(out).filter((f) => /\.(dmg|exe)$/.test(f));
  if (pkgs.length === 0) {
    bad++;
    console.log(`  ❌ ${path.relative(REPO, out)} 下没有 dmg/exe 产物`);
  }
  for (const f of pkgs) {
    if (f.includes(expect)) console.log(`  ✅ 产物文件名带上了 ${expect}：${f}`);
    else {
      bad++;
      console.log(`  ❌ 产物文件名 ${f} 里没有 ${expect}`);
    }
  }
  return bad;
}

/**
 * 找产物。electron-builder 的输出目录名随 target 变（`mac`、`mac-arm64`、
 * `mac-x64`…），所以按「哪个子目录里有 resources」来认，不认名字。
 * 同名文件（.dmg / .blockmap / latest-mac.yml）不是目录，直接跳过。
 */
function findResources(explicit) {
  if (explicit) return resourcesOf(path.resolve(explicit)) ?? path.resolve(explicit);
  const out = path.join(REPO, "app/desktop/dist-electron");
  if (!existsSync(out)) return null;
  for (const e of readdirSync(out)) {
    const found = resourcesOf(path.join(out, e));
    if (found) return found;
  }
  return null;
}

function main() {
  const argv = process.argv.slice(2);
  // `--expect-version <编码后的三段>`：发版流水线传，用来断言包和清单带的是
  // **这一次发布**的版本号。CI 的出包验证不传 —— 它没有 tag，也没有「预期版本」。
  let expect = process.env.EXPECT_VERSION || "";
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--expect-version") expect = argv[++i] ?? "";
    else rest.push(argv[i]);
  }
  const resources = findResources(rest[0]);
  if (!resources) {
    console.error("❌ 找不到打包产物。先跑 electron-builder，或把产物目录作为参数传进来。");
    process.exit(1);
  }
  console.log(`产物 resources：${path.relative(REPO, resources)}`);

  let bad = 0;
  for (const [rel, why] of required(resources)) {
    const p = path.join(resources, rel);
    if (existsSync(p)) {
      const size = statSync(p).isDirectory() ? "" : ` (${(statSync(p).size / 1024).toFixed(0)} KB)`;
      console.log(`  ✅ ${rel}${size}`);
    } else {
      bad++;
      // **把实际找到的东西打出来。** 只说「缺 X」的话，X 写错了（平台后缀、分隔符）
      // 和「真的没打进去」看起来一模一样 —— win-x64 上就误报过一次。
      const dir = path.dirname(p);
      const near = existsSync(dir) ? readdirSync(dir).slice(0, 8).join(" ") : "(目录都没有)";
      console.log(`  ❌ ${rel} —— ${why}`);
      console.log(`     实际在 ${path.relative(REPO, dir)} 的是：${near}`);
    }
  }
  for (const [rel, why] of FORBIDDEN) {
    if (existsSync(path.join(resources, rel))) {
      bad++;
      console.log(`  ❌ ${rel} 不该在包里 —— ${why}`);
    } else {
      console.log(`  ✅ ${rel} 已排除`);
    }
  }

  // gateway 必须能在「只有这份 resources」的前提下找到依赖 —— pnpm 的软链如果
  // 拷丢了会表现成启动时才炸，这里提前看一眼。
  const gwModules = path.join(resources, "gateway/node_modules");
  if (existsSync(gwModules)) {
    for (const dep of ["@nestjs/core", "better-sqlite3", "sharp", "@ov/assets"]) {
      const p = path.join(gwModules, dep);
      if (!existsSync(p)) {
        bad++;
        console.log(`  ❌ gateway/node_modules/${dep} 缺失`);
      }
    }
    console.log("  ✅ gateway 依赖树完整");
  } else {
    bad++;
    console.log("  ❌ gateway/node_modules 整个不见了 —— pnpm deploy 的软链没解开？");
  }

  // **架构必须和 app 自己的主二进制一致。** 文件齐 ≠ 能跑，而且「文件齐」连架构对都
  // 不保证：一个在 arm64 机器上交叉编出来的 x64 包文件是全的、目录名也像 x64，
  // 里面的 better_sqlite3.node 和 sharp libvips 却全是 arm64 的，Intel Mac 用户
  // 装上后一碰资产库才炸。踩过一次。
  const product = productArch(resources);
  if (!product) {
    bad++;
    console.log("  ❌ 找不到产物的主二进制 —— 无从判断这个包到底是什么架构");
  } else if (product.arch === "未知格式" || product.arch.startsWith("cputype") || product.arch.startsWith("machine")) {
    bad++;
    console.log(`  ❌ 主二进制架构读不出来（${product.arch}）：${product.from}`);
  } else {
    console.log(`  ℹ️  产物主二进制是 ${product.arch}（${product.from}）`);
  }
  const want = product?.arch;
  // **定向查这几个包，不扫目录** —— 扫的话 pnpm 的 `.pnpm/<pkg>@ver/node_modules/<pkg>/…`
  // 有六七层深，扫全树又慢又容易漏（better-sqlite3 就在第 7 层，扫浅了会漏掉它）。
  const NATIVE = ["better-sqlite3", "sharp", "@napi-rs/canvas", "@node-rs/xxhash"];
  const nativeFiles = [];
  for (const dep of NATIVE) {
    const pkgDir = path.join(gwModules, dep);
    if (!existsSync(pkgDir)) continue;
    // 包内可能有多个平台的变体（sharp 带 @img/sharp-*），**全都查** ——
    // 只要有一个是别的架构，这个包就是混的。
    const stack = [[pkgDir, 0]];
    while (stack.length) {
      const [dir, depth] = stack.pop();
      if (depth > 6) continue;
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) stack.push([p, depth + 1]);
        else if (e.name.endsWith(".node")) nativeFiles.push(p);
      }
    }
  }
  if (nativeFiles.length === 0) {
    bad++;
    console.log("  ❌ 产物里一个原生模块都没找到 —— 架构无从核对，这本身就说明装配有问题");
  } else {
    for (const f of nativeFiles) {
      const got = binaryArch(f);
      // fat（universal）两个架构都有，x64 目标也接受。
      const okArch = got === want || got === "fat";
      if (okArch) console.log(`  ✅ 原生模块 ${got}（与主二进制一致）  ${path.relative(gwModules, f)}`);
      else {
        bad++;
        console.log(`  ❌ 原生模块架构不符：${path.relative(gwModules, f)} 是 ${got}，这个包的主二进制是 ${want}，但它不一样`);
        console.log(`     —— 交叉编出来的包在目标机器上第一次碰资产库就会炸`);
      }
    }
  }

  if (expect) {
    console.log(`\n版本（期望 ${expect}，人读四段在 tag 和存储路径上，客户端比的是这个三段）`);
    bad += checkVersion(resources, expect);
  }

  console.log(bad === 0 ? "\n✓ 产物布局符合契约" : `\n✗ ${bad} 项不符`);
  process.exitCode = bad === 0 ? 0 : 1;
}

main();
