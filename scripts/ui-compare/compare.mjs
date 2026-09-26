// 逐屏对比：同一份测试数据，分别用两种界面（默认 official-raw 对 recovered）起桌面应用，
// 访问同一组页面、截图、逐像素比较，并收集控制台报错。界面还原每一步都靠它验收。
//
//   node scripts/ui-compare/compare.mjs [基准模式=official-raw] [对比模式=recovered]
//
// 前提：app/desktop 已构建（pnpm --filter @ov/desktop build，会生成 out/official-ui 等）、
//       official-raw 用 node app/official-ui/build.mjs --raw 生成、recovered 用 pnpm --filter @ov/renderer build。
// 结果写到 .probe/ui-compare/<时间>/：每页两张截图 + 差异图 + report.json；终端打印每页差异比例。
import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sharp = createRequire(path.join(repo, "app/gateway/package.json"))("sharp");
const [baseMode = "official-raw", testMode = "recovered"] = process.argv.slice(2);

const ROOT = "/tmp/ov-cmp";
const FIXTURE = path.join(repo, "scripts/ui-compare/fixture");
const PORT = 9360;
const WS_A = `${ROOT}/ws-a`;
const WS_B = `${ROOT}/ws-b`;
// 要看的页面：路由 + 进页面后额外做的动作（可选）
const PAGES = [
  { id: "home", url: "/" },
  { id: "projects", url: "/projects" },
  { id: "creations", url: "/creations" },
  { id: "skills", url: "/skills" },
  { id: "skill-community", url: "/skill-community" },
  { id: "changelog", url: "/changelog" },
  { id: "ws-a", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}` },
  { id: "ws-b", url: `/workspace?workspaceId=${encodeURIComponent(WS_B)}` },
];
const NO_ANIMATION = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}";
// 截图前让页面静下来：视频（技能卡片封面是自动播放的 mp4）停在第 0 帧，等图片加载完。
const SETTLE = `(async()=>{
  for (const v of document.querySelectorAll("video")) { try { v.pause(); v.currentTime = 0; } catch {} }
  await Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 3000); })));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
})()`;
// 首次启动的弹窗（AI 水印设置等）会挡住页面：两边都点掉。
const DISMISS_STARTUP = `(()=>{
  const btn = [...document.querySelectorAll("button")].find((b) => ["保存设置", "我知道了", "知道了", "关闭"].includes(b.innerText.trim()));
  if (btn) { btn.click(); return btn.innerText.trim(); }
  return "";
})()`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const outDir = path.join(repo, ".probe/ui-compare", new Date().toISOString().replace(/[:.]/g, "-"));
mkdirSync(outDir, { recursive: true });

async function cdp(port) {
  for (let i = 0; i < 120; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find((p) => p.type === "page" && p.url.startsWith("app://"));
      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((r, j) => ((ws.onopen = r), (ws.onerror = j)));
        let seq = 0;
        const pending = new Map();
        const errors = [];
        ws.onmessage = (ev) => {
          const m = JSON.parse(ev.data);
          if (m.id) pending.get(m.id)?.(m);
          else if (m.method === "Runtime.exceptionThrown") errors.push("EXC " + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).split("\n")[0]);
          else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push("ERR " + m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").split("\n")[0].slice(0, 300));
        };
        const send = (method, params = {}) => new Promise((resolve) => { const id = ++seq; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
        await send("Runtime.enable");
        await send("Page.enable");
        return { send, errors, close: () => ws.close() };
      }
    } catch {}
    await sleep(500);
  }
  throw new Error("等不到界面页面");
}

async function runMode(mode) {
  // 每次都从模板重置数据：两种界面看到的是完全一样的状态
  rmSync(ROOT, { recursive: true, force: true });
  mkdirSync(ROOT, { recursive: true });
  for (const d of ["ud", "data"]) mkdirSync(path.join(ROOT, d));
  cpSync(path.join(FIXTURE, "ws-a"), WS_A, { recursive: true });
  cpSync(path.join(FIXTURE, "ws-b"), WS_B, { recursive: true });
  const env = {
    ...process.env,
    OV_UI: mode,
    OV_USER_DATA_DIR: `${ROOT}/ud`,
    HILO_DATA_DIR: `${ROOT}/data`,
    OV_SKIP_LEGACY_MIGRATION: "1",
    OV_CONFIG_PATH: path.join(FIXTURE, "config.json"),
    OV_DEV_OPEN_WORKSPACES: `${WS_A}${path.delimiter}${WS_B}`,
    ...(process.env.OPENCODE_BIN ? {} : { OPENCODE_BIN: "/Applications/MiniMax Design.app/Contents/Resources/opencode/opencode" }),
  };
  const electron = createRequire(path.join(repo, "app/desktop/package.json"))("electron");
  const child = spawn(electron, [path.join(repo, "app/desktop"), `--remote-debugging-port=${PORT}`], { env, stdio: "ignore", detached: true });
  const results = {};
  try {
    const c = await cdp(PORT);
    await sleep(15000); // 工作区 gateway / opencode 起来、首启示例项目导入
    for (let i = 0; i < 3; i++) {
      await c.send("Runtime.evaluate", { expression: DISMISS_STARTUP });
      await sleep(800);
    }
    for (const p of PAGES) {
      c.errors.length = 0;
      await c.send("Runtime.evaluate", { expression: `location.assign(${JSON.stringify(`app://.${p.url}`)})` });
      await sleep(6000);
      await c.send("Runtime.evaluate", { expression: `(()=>{const s=document.createElement('style');s.textContent=${JSON.stringify(NO_ANIMATION)};document.head.appendChild(s)})()` });
      await c.send("Runtime.evaluate", { expression: DISMISS_STARTUP });
      await c.send("Runtime.evaluate", { expression: SETTLE, awaitPromise: true });
      await sleep(1000);
      const shot = await c.send("Page.captureScreenshot", { format: "png" });
      const file = path.join(outDir, `${p.id}.${mode}.png`);
      writeFileSync(file, Buffer.from(shot.result.data, "base64"));
      results[p.id] = { file, errors: [...new Set(c.errors)] };
    }
    c.close();
  } finally {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
    await sleep(3000);
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {}
  }
  return results;
}

async function diff(a, b, out) {
  const [ia, ib] = await Promise.all([sharp(a).raw().ensureAlpha().toBuffer({ resolveWithObject: true }), sharp(b).raw().ensureAlpha().toBuffer({ resolveWithObject: true })]);
  if (ia.info.width !== ib.info.width || ia.info.height !== ib.info.height) return { ratio: 1, note: "尺寸不同" };
  const px = ia.info.width * ia.info.height;
  const mask = Buffer.alloc(px * 4);
  let changed = 0;
  for (let i = 0; i < px; i++) {
    const o = i * 4;
    const d = Math.abs(ia.data[o] - ib.data[o]) + Math.abs(ia.data[o + 1] - ib.data[o + 1]) + Math.abs(ia.data[o + 2] - ib.data[o + 2]);
    // 小于 24 的差当作抗锯齿抖动
    if (d > 24) {
      changed++;
      mask[o] = 255;
      mask[o + 3] = 255;
    } else {
      mask[o] = mask[o + 1] = mask[o + 2] = ib.data[o] >> 2;
      mask[o + 3] = 255;
    }
  }
  await sharp(mask, { raw: { width: ia.info.width, height: ia.info.height, channels: 4 } }).png().toFile(out);
  return { ratio: changed / px };
}

if (!existsSync(FIXTURE)) throw new Error(`缺少测试数据 ${FIXTURE}`);
console.log(`对比 ${baseMode} ↔ ${testMode}，结果在 ${path.relative(repo, outDir)}`);
const base = await runMode(baseMode);
const test = await runMode(testMode);
const report = [];
for (const p of PAGES) {
  const d = await diff(base[p.id].file, test[p.id].file, path.join(outDir, `${p.id}.diff.png`));
  const newErrors = test[p.id].errors.filter((e) => !base[p.id].errors.includes(e));
  report.push({ page: p.id, diffPct: +(d.ratio * 100).toFixed(3), note: d.note, newErrors, baseErrors: base[p.id].errors.length });
  console.log(`${p.id.padEnd(16)} 差异 ${(d.ratio * 100).toFixed(3).padStart(7)}%  新增报错 ${newErrors.length}${d.note ? "  " + d.note : ""}`);
  for (const e of newErrors.slice(0, 3)) console.log("    " + e);
}
writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
