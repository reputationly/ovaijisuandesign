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
 * 用法：
 *   node scripts/verify-desktop-package.mjs                 # 自动找 dist-electron 下的产物
 *   node scripts/verify-desktop-package.mjs <产物目录>
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** `resources/` 下必须存在的路径 → 谁在找它。 */
const REQUIRED = [
  ["opencode/opencode", "locateOpencode（agent runtime，缺了 agent 起不来）"],
  ["opencode/.version", "agent runtime 版本戳（自证装的是哪一版）"],
  ["gateway/dist/main.js", "index.ts:111（应用级 + 每个工作区的 gateway）"],
  ["mcp-tools/dist/main.js", "locateMcpEntry（agent 的 MCP server）"],
  ["opencode-plugin-hilo/dist/index.js", "locatePlugin（画布工具）"],
  ["agent-profiles/v2/config/base.json", "locateProfile（agent 配置）"],
  ["skills", "locateBundledSkills（自带技能）"],
  ["home-showcase/quick-start-config-v2.json", "homeShowcaseDir()（首页创作灵感，缺了首页是空的）"],
];

/** 明确**不该**在包里的。带了就等于白打包。 */
const FORBIDDEN = [
  ["home-showcase/media", "468MB 示例图。走 302 回落 CDN + 首启预热前 24 张到 userData（包内只读）"],
  [".staged.json", "装配过程的记账文件"],
];

/** 产物根 → resources 目录。mac 是 `<x>.app/Contents/Resources`，win 是 `win-unpacked/resources`。 */
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
  const resources = findResources(process.argv[2]);
  if (!resources) {
    console.error("❌ 找不到打包产物。先跑 electron-builder，或把产物目录作为参数传进来。");
    process.exit(1);
  }
  console.log(`产物 resources：${path.relative(REPO, resources)}`);

  let bad = 0;
  for (const [rel, why] of REQUIRED) {
    const p = path.join(resources, rel);
    if (existsSync(p)) {
      const size = statSync(p).isDirectory() ? "" : ` (${(statSync(p).size / 1024).toFixed(0)} KB)`;
      console.log(`  ✅ ${rel}${size}`);
    } else {
      bad++;
      console.log(`  ❌ ${rel} —— ${why}`);
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

  console.log(bad === 0 ? "\n✓ 产物布局符合契约" : `\n✗ ${bad} 项不符`);
  process.exitCode = bad === 0 ? 0 : 1;
}

main();
