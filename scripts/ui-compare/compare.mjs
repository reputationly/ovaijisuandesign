// 逐屏对比：同一份测试数据，分别用两种界面（默认 official-raw 对 recovered）起桌面应用，
// 访问同一组页面、截图、逐像素比较，并收集控制台报错。界面还原每一步都靠它验收。
//
//   node scripts/ui-compare/compare.mjs [基准模式=official-raw] [对比模式=recovered]
//
// 前提：app/desktop 已构建（pnpm --filter @ov/desktop build，会生成 out/official-ui 等）、
//       official-raw 用 node app/official-ui/build.mjs --raw 生成、recovered 用 pnpm --filter @ov/renderer build。
// 结果写到 .probe/ui-compare/<时间>/：每页两张截图 + 差异图 + report.json；终端打印每页差异比例。
//
// 注意：卡片封面是 CDN 上的 mp4，属外部资源、与仓库代码无关，采集时会被挡掉（见 BLOCKED_URLS）。
// 不挡的话同一份界面连跑两次都能差出 7%——差异来自视频下到第几帧，会掩盖真正的界面差异。
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
  // 首页标签页切换：进页面后按顺序点这些标签（文字要和界面上的一致），点完再拍
  { id: "home-skill", url: "/", tabs: ["Skill"] },
  { id: "home-skill-inspiration", url: "/", tabs: ["Skill", "创作灵感"] },
  { id: "projects", url: "/projects" },
  { id: "projects-team", url: "/projects", tabs: ["共创项目"] },
  { id: "creations", url: "/creations" },
  { id: "skills", url: "/skills" },
  { id: "skill-community", url: "/skill-community" },
  { id: "changelog", url: "/changelog" },
  { id: "ws-a", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}` },
  { id: "ws-b", url: `/workspace?workspaceId=${encodeURIComponent(WS_B)}` },
];
const NO_ANIMATION = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}";
// 截图前让页面静下来：视频（封面已被挡掉，这里顺手停在第 0 帧）停住，等图片加载完。
const SETTLE = `(async()=>{
  for (const v of document.querySelectorAll("video")) { try { v.pause(); v.currentTime = 0; } catch {} }
  await Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 3000); })));
  await new Promise((r) => { requestAnimationFrame(() => requestAnimationFrame(r)); setTimeout(r, 500); });
})()`;
// 首次启动的弹窗（AI 水印设置等）会挡住页面：两边都点掉。
const DISMISS_STARTUP = `(()=>{
  // 只点真正露在最上层的按钮：后台保活的工作区页面里也有同名按钮
  const onTop = (b) => { const r = b.getBoundingClientRect(); return r.width > 0 && b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); };
  const btn = [...document.querySelectorAll("button")].find((b) => ["保存设置", "我知道了", "知道了", "关闭"].includes(b.innerText.trim()) && onTop(b));
  if (btn) { btn.click(); return btn.innerText.trim(); }
  return "";
})()`;

// 卡片封面是 CDN 上的 mp4，边下边播：截到第几帧取决于当时下到哪，同一份界面连跑两次都能差出整条
// 卡片带（实测同模式两次差 7.3%，比两种构建之间的差还大）。这些封面不属于本仓库的代码，把 CDN 挡掉
// 让两边都渲染成空白，剩下的差异才反映我们自己的改动。本地图片不受影响（走 127.0.0.1 的 local-file）。
const BLOCKED_URLS = ["*cdn.hailuoai.com*"];
// 聊天面板的“精选”推荐是 Math.random 洗牌抽出来的（每次挂载抽的不一样），两边各抽一次必然差出几张卡片的文字。
// 每个新文档开头把 Math.random 换成固定种子的伪随机数：两边调用次序相同，抽到的就是同一批。渲染代码本身不动。
const SEEDED_RANDOM = `(() => {
  let s = 0x2545f491;
  Math.random = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();`;
// 点一个标签：先找叶子节点上文字完全一致的可见元素，点击会冒泡到标签自己的处理函数；
// 找不到再找文字一致的 [role=tab]（标签里带图标时文字不在叶子节点上）。
const clickByText = (text) => `(() => {
  const visible = (e) => e.getBoundingClientRect().width > 0;
  const el = [...document.querySelectorAll("button, [role=tab], div, span")].find((e) => e.childElementCount === 0 && e.textContent.trim() === ${JSON.stringify(text)} && visible(e))
    ?? [...document.querySelectorAll("[role=tab]")].find((e) => e.textContent.trim() === ${JSON.stringify(text)} && visible(e));
  if (!el) return false;
  el.click();
  return true;
})()`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TOL = 24; // 小于这个差值的像素当作抗锯齿抖动

async function rawOf(src) {
  return sharp(src).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
}
// 两张图的差异比例。传文件路径或 PNG buffer 都行。
async function ratio(a, b) {
  const [ia, ib] = await Promise.all([rawOf(a), rawOf(b)]);
  if (ia.info.width !== ib.info.width || ia.info.height !== ib.info.height) return 1;
  const px = ia.info.width * ia.info.height;
  let changed = 0;
  for (let i = 0; i < px; i++) {
    const o = i * 4;
    if (Math.abs(ia.data[o] - ib.data[o]) + Math.abs(ia.data[o + 1] - ib.data[o + 1]) + Math.abs(ia.data[o + 2] - ib.data[o + 2]) > TOL) changed++;
  }
  return changed / px;
}
// 卡片网格的位置、每行每列都靠封面视频撑开：等一两秒抓一次，抓到的时机随采集轮次漂移，
// 于是同一份界面两次采集能差出一整条卡片带。改成反复重拍，直到连续两张像素一致为止。
// 封面 CDN 已在 cdp() 里挡掉，这里的重拍只需兜住字体、光标这类残留抖动。
const STABLE_TOL = 0.0002; // 0.02% 以内当作已经稳定（残留通常只有光标/滚动条这类单像素抖动）
async function stableShot(c) {
  let prev = null;
  let last = null;
  for (let i = 0; i < 8; i++) {
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
    await c.send("Runtime.evaluate", { expression: SETTLE, awaitPromise: true });
    await sleep(700);
    const shot = await c.send("Page.captureScreenshot", { format: "png" });
    const buf = Buffer.from(shot.result.data, "base64");
    if (prev && (await ratio(prev, buf)) <= STABLE_TOL) return buf;
    prev = buf;
    last = buf;
  }
  console.log(`    （重拍 8 次仍未完全稳定，用最后一张）`);
  return last;
}
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
        // 页面卡死时不要无限等：每个调用 60 秒超时
        const send = (method, params = {}) =>
          new Promise((resolve, reject) => {
            const id = ++seq;
            const timer = setTimeout(() => reject(new Error(`${method} 60 秒没响应，界面可能卡死或报错了`)), 60000);
            pending.set(id, (m) => (clearTimeout(timer), resolve(m)));
            ws.send(JSON.stringify({ id, method, params }));
          });
        await send("Runtime.enable");
        await send("Page.enable");
        // 挡掉封面 CDN 后会抛网络错误，这是预期内的，不算界面报错
        await send("Network.enable");
        await send("Network.setBlockedURLs", { urls: BLOCKED_URLS });
        await send("Page.addScriptToEvaluateOnNewDocument", { source: SEEDED_RANDOM });
        // 日志里的随机 ID（UUID）和耗时每次不同，规整掉再比，否则同一条报错两边永远对不上
        const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
        const visible = () => errors.filter((e) => !/hailuoai\.com/.test(e)).map((e) => e.replace(UUID, "<uuid>").replace(/durationMs=\d+/g, "durationMs=<n>"));
        return { send, errors: visible, clearErrors: () => (errors.length = 0), close: () => ws.close() };
      }
    } catch {}
    await sleep(500);
  }
  throw new Error("等不到界面页面");
}

async function runMode(mode) {
  // 上一次异常退出留下的实例会占着调试端口，连上去就是旧页面
  if (await fetch(`http://127.0.0.1:${PORT}/json`).then(() => true, () => false)) throw new Error(`调试端口 ${PORT} 已被占用，先关掉残留的 Electron`);
  // 每次都从模板重置数据：两种界面看到的是完全一样的状态
  rmSync(ROOT, { recursive: true, force: true });
  mkdirSync(ROOT, { recursive: true });
  for (const d of ["ud", "data"]) mkdirSync(path.join(ROOT, d));
  // 引导提示（coach mark）预先标成已看过：它们是延时弹出的，会让截图时有时无
  cpSync(path.join(FIXTURE, "ud"), path.join(ROOT, "ud"), { recursive: true });
  cpSync(path.join(FIXTURE, "ws-a"), WS_A, { recursive: true });
  cpSync(path.join(FIXTURE, "ws-b"), WS_B, { recursive: true });
  const env = {
    ...process.env,
    OV_UI: mode,
    OV_DEV_HIDDEN_WINDOW: "1",
    OV_USER_DATA_DIR: `${ROOT}/ud`,
    HILO_DATA_DIR: `${ROOT}/data`,
    OV_SKIP_LEGACY_MIGRATION: "1",
    OV_CONFIG_PATH: path.join(FIXTURE, "config.json"),
    OV_DEV_OPEN_WORKSPACES: `${WS_A}${path.delimiter}${WS_B}`,
    ...(process.env.OPENCODE_BIN ? {} : { OPENCODE_BIN: "/Applications/MiniMax Design.app/Contents/Resources/opencode/opencode" }),
  };
  const electron = createRequire(path.join(repo, "app/desktop/package.json"))("electron");
  const child = spawn(electron, [
    path.join(repo, "app/desktop"),
    `--remote-debugging-port=${PORT}`,
    // 窗口被挡住或在后台时 Chromium 会停掉渲染（requestAnimationFrame 不回调），对比会卡住
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--disable-background-timer-throttling",
  ], { env, stdio: "ignore", detached: true });
  const results = {};
  try {
    const c = await cdp(PORT);
    await sleep(15000); // 工作区 gateway / opencode 起来、首启示例项目导入
    for (let i = 0; i < 3; i++) {
      await c.send("Runtime.evaluate", { expression: DISMISS_STARTUP });
      await sleep(800);
    }
    for (const p of PAGES) {
      console.log(`  ${mode} ${p.id}`);
      c.clearErrors();
      await c.send("Runtime.evaluate", { expression: `location.assign(${JSON.stringify(`app://.${p.url}`)})` });
      await sleep(6000);
      await c.send("Runtime.evaluate", { expression: `(()=>{const s=document.createElement('style');s.textContent=${JSON.stringify(NO_ANIMATION)};document.head.appendChild(s)})()` });
      // 引导提示（快速切换布局模式等）是延时弹出的，多点几轮，直到连续一轮什么都没点到
      for (let i = 0; i < 5; i++) {
        const r = await c.send("Runtime.evaluate", { expression: DISMISS_STARTUP, returnByValue: true });
        await c.send("Runtime.evaluate", { expression: SETTLE, awaitPromise: true });
        await sleep(1500);
        if (!r.result?.result?.value && i >= 1) break;
      }
      // 鼠标挪到左上角：否则系统鼠标指针停在哪张卡片上，哪张就是悬停样式
      for (const label of p.tabs ?? []) {
        const r = await c.send("Runtime.evaluate", { expression: clickByText(label), returnByValue: true });
        if (!r.result?.result?.value) throw new Error(`${p.id}：界面上找不到「${label}」标签，页面没切过去`);
        await sleep(1500);
      }
      const buf = await stableShot(c);
      const file = path.join(outDir, `${p.id}.${mode}.png`);
      writeFileSync(file, buf);
      results[p.id] = { file, errors: [...new Set(c.errors())] };
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
  const [ia, ib] = await Promise.all([rawOf(a), rawOf(b)]);
  if (ia.info.width !== ib.info.width || ia.info.height !== ib.info.height) return { ratio: 1, note: "尺寸不同" };
  const px = ia.info.width * ia.info.height;
  const mask = Buffer.alloc(px * 4);
  let changed = 0;
  for (let i = 0; i < px; i++) {
    const o = i * 4;
    const d = Math.abs(ia.data[o] - ib.data[o]) + Math.abs(ia.data[o + 1] - ib.data[o + 1]) + Math.abs(ia.data[o + 2] - ib.data[o + 2]);
    // 小于 24 的差当作抗锯齿抖动
    if (d > TOL) {
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
