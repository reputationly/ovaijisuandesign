/**
 * Playwright 用的 Electron 启动器：环境与 compare.mjs 2094–2128 行保持一致，
 * 但只用于 scripts/pw，不改门禁本身。fixture 放在 /tmp/ov-pw，避免污染 /tmp/ov-cmp。
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const repo = path.resolve(import.meta.dirname, "../..");
const fixture = path.join(repo, "scripts/ui-compare/fixture");


/**
 * 开发态真正被加载的插件包，以及"它是不是比源码旧"。
 *
 * 为什么必须查：插件是**打包**产物（`@ov/opencode-plugin-hilo` 的 `build` 跑 esbuild 出
 * `dist/index.js`），`pnpm --filter @ov/desktop build` **不会**重建它。改了 `src/*.ts`
 * 却只构建桌面端，跑起来的还是旧插件 —— 一次真实会话就这么白跑过（上一轮第二次）。
 * `build-resources/` 那份由 `scripts/stage-desktop-resources.mjs` 生成，只在打包产物里
 * 生效；开发态走的是包内 `dist/index.js`（`locatePlugin` 的第二条路径）。
 */
export function pluginDistInfo() {
  const entry = path.join(repo, "app/packages/opencode-plugin-hilo/dist/index.js");
  if (!existsSync(entry)) return { entry, sha256: null, mtimeMs: null, newestSourceMs: null, stale: true, reason: "missing" };
  const digest = createHash("sha256").update(readFileSync(entry)).digest("hex");
  const mtimeMs = statSync(entry).mtimeMs;
  const srcDir = path.join(repo, "app/packages/opencode-plugin-hilo/src");
  let newestSourceMs = 0;
  const walk = (dir) => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) walk(full);
      else if (item.name.endsWith(".ts")) newestSourceMs = Math.max(newestSourceMs, statSync(full).mtimeMs);
    }
  };
  walk(srcDir);
  return { entry, sha256: digest, mtimeMs, newestSourceMs, stale: mtimeMs < newestSourceMs, reason: mtimeMs < newestSourceMs ? "older-than-source" : "fresh" };
}

/**
 * `showWindow`：把窗口真的显示出来。
 *
 * **默认隐藏**（`OV_DEV_HIDDEN_WINDOW=1`）是为了逐屏截图不抢焦点；但隐藏窗口在 Chromium
 * 里等于"页面被遮挡"，React Query 的 `refetchInterval` 在没有
 * `refetchIntervalInBackground` 时**不会触发** —— 实测 120 秒的任务一次轮询都没发生，
 * 看起来像"轮询坏了"，其实是窗口没显示。要量轮询/要真实会话时必须打开。
 */
export async function launchApp({ mode = "recovered", port = 9361, root = "/tmp/ov-pw", xdg = path.join(root, "xdg"), reset = true, dbSource, config, callerKey = "pw-caller", showWindow = false } = {}) {
  if (reset) rmSync(root, { recursive: true, force: true });
  mkdirSync(path.join(root, "ud"), { recursive: true });
  mkdirSync(xdg, { recursive: true });
  mkdirSync(path.join(root, "home"), { recursive: true });
  cpSync(path.join(fixture, "ud"), path.join(root, "ud"), { recursive: true });
  const wsA = path.join(root, "ws-a");
  const wsB = path.join(root, "ws-b");
  cpSync(path.join(fixture, "ws-a"), wsA, { recursive: true });
  cpSync(path.join(fixture, "ws-a"), wsB, { recursive: true });
  // 每屏前的 .hilo 复位由门禁负责；这里只固定一份干净快照，便于复现。
  cpSync(path.join(wsA, ".hilo"), path.join(root, "_pristine", "ws-a"), { recursive: true });
  cpSync(path.join(wsB, ".hilo"), path.join(root, "_pristine", "ws-b"), { recursive: true });
  if (dbSource && existsSync(dbSource)) copyFileSync(dbSource, path.join(root, "opencode.db"));
  const configPath = path.join(root, "config.json");
  if (config) writeFileSync(configPath, JSON.stringify(config));

  const env = {
    ...process.env,
    OV_UI: mode,
    ...(mode === "reference" ? { OV_REFERENCE: "1" } : {}),
    ...(process.env.HILO_PROJECT_ARCHITECTURE ? { HILO_PROJECT_ARCHITECTURE: process.env.HILO_PROJECT_ARCHITECTURE } : {}),
    ...(showWindow ? {} : { OV_DEV_HIDDEN_WINDOW: "1" }),
    OV_USER_DATA_DIR: path.join(root, "ud"),
    HILO_DATA_DIR: path.join(root, "data"),
    OV_SKIP_LEGACY_MIGRATION: "1",
    OV_CONFIG_PATH: config ? configPath : path.join(fixture, "ui-compare-config.json"),
    HILO_AGENT_CALLER_KEY: callerKey,
    OV_DEV_OPEN_WORKSPACES: `${wsA}${path.delimiter}${wsB}`,
    XDG_DATA_HOME: xdg,
    HOME: path.join(root, "home"),
    OPENCODE_DB: path.join(root, "opencode.db"),
    HILO_OPENCODE_DB: path.join(root, "opencode.db"),
    ...(process.env.OPENCODE_BIN ? {} : { OPENCODE_BIN: findOpenCode() }),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  const electron = path.join(repo, "app/desktop/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
  const child = spawn(electron, [
    path.join(repo, "app/desktop"),
    `--remote-debugging-port=${port}`,
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--disable-background-timer-throttling",
  ], { env, stdio: "ignore", detached: true });

  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const page = browser.contexts()[0].pages().find((item) => item.url().startsWith("app://"));
  await page.waitForTimeout(15_000); // 与门禁一致：等 gateway/opencode/首启示例项目
  const plugin = pluginDistInfo();
  if (plugin.stale) {
    console.warn(`⚠ 插件包比源码旧（${plugin.reason}）：${plugin.entry}`);
    console.warn("  改了 app/packages/opencode-plugin-hilo/src 之后要先 pnpm --filter @ov/opencode-plugin-hilo build");
  }
  return {
    plugin,
    child,
    page,
    browser,
    workspace: wsA,
    xdg,
    async close() {
      // **窗口可见时不能只发 SIGTERM。** 应用在画布未保存时会弹一个原生确认框
      //（"画布可能还没保存 / 取消 · 仍然退出"），进程会一直等用户点 —— 脚本就永远退不出去
      //（上一轮"可见窗口跑 400～700 秒不结束"就是这么来的，result.json 其实早就写完了）。
      // 这是**产品该有的行为**，不该为了测试改掉；夹具这边改成"先礼后兵"：SIGTERM，
      // 宽限 3 秒，再对进程组 SIGKILL。
      try { process.kill(-child.pid, "SIGTERM"); } catch { child.kill("SIGTERM"); }
      browser.close().catch(() => {});
      for (let i = 0; i < 12; i++) {
        try { await fetch(`http://127.0.0.1:${port}/json/version`); } catch { break; }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      try { process.kill(-child.pid, "SIGKILL"); } catch { try { child.kill("SIGKILL"); } catch {} }
      for (let i = 0; i < 20; i++) {
        try { await fetch(`http://127.0.0.1:${port}/json/version`); } catch { break; }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      for (const name of ["SingletonLock", "SingletonCookie", "SingletonSocket"]) {
        try { rmSync(path.join(root, "ud", name), { force: true }); } catch {}
      }
    },
  };
}

function findOpenCode() {
  const backup = path.join(repo, "../minimax-design-4.0.0-backup/MiniMax Design.app/Contents/Resources/opencode/opencode");
  if (existsSync(backup)) return backup;
  return "/Applications/MiniMax Design.app/Contents/Resources/opencode/opencode";
}
