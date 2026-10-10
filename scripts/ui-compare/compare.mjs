// 逐屏对比：同一份测试数据起桌面应用，访问同一组页面、截图，和基线逐像素比较，并收集控制台报错。
// 界面每次改动都靠它验收。
//
//   node scripts/ui-compare/compare.mjs [基准=golden] [对比模式=recovered]
//   node scripts/ui-compare/compare.mjs --record [模式=recovered]     # 把这一份界面的截图录成基线
//
// 基准写 golden 时读录好的基线截图（默认 .probe/ui-golden/，可用 GOLDEN=目录 指定），不再起第二个应用；
// 写成别的就是 OV_UI 的取值（recovered / ours），两种界面各起一次对比。ONLY 只跑几屏时，录基线也只更新这几屏。
// 前提：app/desktop 已构建（pnpm --filter @ov/desktop build，会顺带构建 app/renderer 到 out/recovered-ui）。
// 结果写到 .probe/ui-compare/<时间>/：每页截图 + 差异图 + report.json；终端打印每页差异比例。
//
// 注意：卡片封面是 CDN 上的 mp4，属外部资源、与仓库代码无关，采集时会被挡掉（见 BLOCKED_URLS）。
// 不挡的话同一份界面连跑两次都能差出 7%——差异来自视频下到第几帧，会掩盖真正的界面差异。
import { spawn } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sharp = createRequire(path.join(repo, "app/gateway/package.json"))("sharp");
const RECORD = process.argv[2] === "--record";
const [baseMode = "golden", testMode = "recovered"] = RECORD ? ["golden", process.argv[3] ?? "recovered"] : process.argv.slice(2);
const GOLDEN = process.env.GOLDEN ? path.resolve(process.env.GOLDEN) : path.join(repo, ".probe/ui-golden");

const ROOT = "/tmp/ov-cmp";
const FIXTURE = path.join(repo, "scripts/ui-compare/fixture");
const PORT = 9360;
const WS_A = `${ROOT}/ws-a`;
const WS_B = `${ROOT}/ws-b`;
// 要看的页面：路由 + 进页面后额外做的动作（可选）
const ALL_PAGES = [
  { id: "home", url: "/" },
  // 首页标签页切换：进页面后按顺序点这些标签（文字要和界面上的一致），点完再拍
  { id: "home-skill", url: "/", tabs: ["Skill"] },
  { id: "home-skill-inspiration", url: "/", tabs: ["Skill", "创作灵感"] },
  { id: "projects", url: "/projects" },
  { id: "projects-team", url: "/projects", tabs: ["共创项目"] },
  { id: "projects-new", url: "/projects", tabs: ["新建项目"] },
  { id: "projects-new-local", url: "/projects", tabs: ["新建项目", "新建本地项目"] },
  { id: "creations", url: "/creations" },
  // ComfyUI 工作流不做：直接打开 /workflows 会回首页
  { id: "workflows", url: "/workflows" },
  { id: "skills", url: "/skills" },
  // 技能页的其它标签（地址参数会被页面忽略，只能点）
  { id: "skills-connectors", url: "/skills", tabs: ["插件"] },
  { id: "skills-mine", url: "/skills", tabs: ["我的 Skill"] },
  { id: "skill-community", url: "/skill-community" },
  { id: "changelog", url: "/changelog" },
  // 左下角连接状态点开的用户菜单，和设置里的「平台接入」分区
  { id: "user-menu", url: "/projects", tabs: [{ ui: "user-menu.trigger" }, { wait: 800 }] },
  { id: "settings-platform", url: "/projects", tabs: [{ ui: "user-menu.trigger" }, { wait: 600 }, { ui: "user-menu.settings" }, { wait: 800 }, "平台接入", { wait: 1500 }] },
  { id: "global-search", url: "/projects", tabs: [{ event: "hilo:open-global-search" }, { wait: 1500 }] },
  { id: "global-search-query", url: "/projects", tabs: [{ event: "hilo:open-global-search" }, { wait: 1500 }, { type: "ws" }, { wait: 2000 }] },
  { id: "ws-a", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}` },
  { id: "ws-b", url: `/workspace?workspaceId=${encodeURIComponent(WS_B)}` },
  // 画布 / 对话里要点开才出现的界面。会改画布内容的放在只读步骤后面。
  { id: "ws-add-node", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, tabs: [{ ui: "canvas.add-node" }, { wait: 800 }] },
  { id: "ws-zoom", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, tabs: [{ ui: "canvas.toolbar-zoom-menu" }, { wait: 600 }] },
  { id: "ws-chat-skill", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, tabs: [{ ui: "chat-skill-btn" }, { wait: 800 }] },
  { id: "ws-select-image", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, tabs: [{ ui: "canvas.image-node" }, { wait: 800 }] },
  { id: "ws-relight", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, tabs: [{ ui: "canvas.image-node" }, { wait: 600 }, { ui: "canvas.node-relight" }, { until: "canvas.relight.popover" }] },
  { id: "ws-multi-angle", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, tabs: [{ ui: "canvas.image-node" }, { wait: 600 }, { ui: "canvas.node-multi-angle" }, { until: "canvas.multi-angle.popover" }] },
  { id: "ws-text-node", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, tabs: [{ ui: "canvas.add-node" }, { ui: "canvas.menu-add-text" }, { wait: 2000 }] },
  { id: "ws-table-node", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, tabs: [{ ui: "canvas.add-node" }, { ui: "canvas.menu-add-table" }, { wait: 2000 }] },
  { id: "ws-text-editor", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, tabs: [{ ui: "canvas.add-node", mouse: true }, { wait: 400 }, { ui: "canvas.menu-add-text", mouse: true }, { ui: "canvas.text-node", last: true, mouse: true, timeout: 8000 }, { wait: 500 }, { ui: "canvas-text-edit", mouse: true, last: true, timeout: 8000 }, { untilSelector: ".canvas-text-fullscreen-editor .ProseMirror", timeout: 15000 }, { insert: "对比用的一段文字" }, { wait: 2500 }] },
  // 切到仅对话会记在工作区里，后面的画布屏就找不到节点。所以放在最后。
  { id: "ws-layout", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, tabs: [{ ui: "workspace.view-mode-menu.stage", mouse: true }, { wait: 500 }, { ui: "workspace.view-mode.chat-only", mouse: true }, { wait: 1200 }] },
  // 会真的创建一个项目（数据目录每种模式都会重建），所以放最后，免得影响别的屏
  { id: "project-created", url: "/projects", tabs: ["新建项目", "新建本地项目", { type: "对比用项目" }, "创建项目", { wait: 4000 }] },
  { id: "project-assets", url: "/projects", tabs: ["新建项目", "新建本地项目", { type: "对比用资产项目" }, "创建项目", { wait: 4000 }, "项目资产", { wait: 2000 }] },
];
// 只跑指定几屏：ONLY=home,skills-mine node scripts/ui-compare/compare.mjs
const ONLY = process.env.ONLY?.split(",").filter(Boolean);
const PAGES = ONLY ? ALL_PAGES.filter((p) => ONLY.includes(p.id)) : ALL_PAGES;
if (ONLY && PAGES.length !== ONLY.length) throw new Error(`ONLY 里有不存在的页面：${ONLY.filter((id) => !ALL_PAGES.some((p) => p.id === id)).join(",")}`);
const NO_ANIMATION = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}.cm-cursor,.cm-dropCursor{visibility:hidden!important}";
// 截图前让页面静下来：视频（封面已被挡掉，这里顺手停在第 0 帧）停住，等图片加载完。
// 新建会话的标题带随机 id（会话 b1888e / Session 20cf09），两边各生成一个，像素对不上。截图前把这段文字改成固定值。
const MASK_VOLATILE = `(() => {
  const re = /^(会话|Session)\\s+[0-9a-z]{4,}$/i;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) if (re.test(node.nodeValue.trim())) node.nodeValue = "会话";
})()`;
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
// 找不到再找文字一致的 [role=tab] 或按钮（带图标时文字不在叶子节点上），最后允许以该文字开头（标签后面带角标或数量）。
const clickByText = (text) => `(() => {
  const visible = (e) => e.getBoundingClientRect().width > 0;
  const el = [...document.querySelectorAll("button, [role=tab], div, span")].find((e) => e.childElementCount === 0 && e.textContent.trim() === ${JSON.stringify(text)} && visible(e))
    ?? [...document.querySelectorAll("[role=tab], [role=menuitem], button")].find((e) => e.textContent.trim() === ${JSON.stringify(text)} && visible(e))
    ?? [...document.querySelectorAll("[role=tab]")].find((e) => e.textContent.trim().startsWith(${JSON.stringify(text)}) && visible(e));
  if (!el) return false;
  el.click();
  return true;
})()`;

// 点 data-action-ui-id。画布节点靠 pointerdown 选中，所以三种事件都发。
const clickByUiId = (id, last) => `(() => {
  const onScreen = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
  const list = [...document.querySelectorAll(${JSON.stringify(`[data-action-ui-id="${id}"]`)})].filter(onScreen);
  const el = list[${last ? "length - 1" : "0"}];
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const opts = { bubbles: true, cancelable: true, clientX: r.x + r.width / 2, clientY: r.y + Math.min(r.height / 2, 24), pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0 };
  el.dispatchEvent(new PointerEvent("pointerdown", opts));
  el.dispatchEvent(new PointerEvent("pointerup", opts));
  el.click();
  return true;
})()`;

// 有些菜单只认真实鼠标（合成 click 点得到元素，但菜单不展开）。返回点击坐标。
const uiCenter = (id, last) => `(() => {
  const onScreen = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
  const all = [...document.querySelectorAll(${JSON.stringify(`[data-action-ui-id="${id}"]`)})].filter((e) => e.getBoundingClientRect().width > 0);
  let el = ${last ? "all.filter(onScreen).at(-1)" : "all.filter(onScreen)[0]"};
  if (!el && all.length) { el = ${last ? "all.at(-1)" : "all[0]"}; el.scrollIntoView({ block: "center", inline: "center" }); }
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
})()`;
const uiVisible = (id) => `!![...document.querySelectorAll(${JSON.stringify(`[data-action-ui-id="${id}"]`)})].some((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; })`;
const cssVisible = (sel) => `!!document.querySelector(${JSON.stringify(sel)})?.getBoundingClientRect().width`;
const editorPoint = `(() => {
  const el = document.querySelector(".canvas-text-fullscreen-editor .ProseMirror") ?? document.querySelector(".cm-content");
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x + Math.min(48, r.width / 2), y: r.y + Math.min(28, r.height / 2) };
})()`;

// 往弹窗里第一个可见输入框填字（走原生 setter 再发 input 事件，React 才认）
const typeIntoDialog = (value) => `(() => {
  const input = [...document.querySelectorAll("[role=dialog] input, [role=dialog] textarea")].find((e) => e.getBoundingClientRect().width > 0);
  if (!input) return false;
  const proto = input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(input, ${JSON.stringify(value)});
  input.dispatchEvent(new Event("input", { bubbles: true }));
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
    await c.send("Runtime.evaluate", { expression: MASK_VOLATILE });
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
          else if (m.method === "Runtime.exceptionThrown") { const desc = m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text; errors.push("EXC " + desc.split("\n")[0]); if (process.env.STACK) console.log("STACK", desc.split("\n").slice(0, 8).join(" | ")); }
          else if (process.env.STACK && m.method === "Runtime.consoleAPICalled" && ["warning", "error", "log"].includes(m.params.type) && /rror|fail|catch|boundary/i.test(m.params.args.map((a) => a.value ?? a.description ?? "").join(" "))) { console.log("CONSOLE", m.params.type, m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 700)); if (m.params.type === "error") errors.push("ERR " + m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").split("\n")[0].slice(0, 300)); }
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
        // 字符串 = 点这段文字；{ type: "xx" } = 往弹窗输入框填字；{ event: "名字" } = 在窗口上触发事件；{ wait: ms } = 多等一会儿
        if (typeof label === "object" && label.wait) { await sleep(label.wait); continue; }
        if (typeof label === "object" && (label.until || label.untilSelector)) {
          const deadline = Date.now() + (label.timeout ?? 8000);
          const expression = label.until ? uiVisible(label.until) : cssVisible(label.untilSelector);
          const what = label.until ?? label.untilSelector;
          let seen = false;
          while (Date.now() < deadline) {
            const hit = await c.send("Runtime.evaluate", { expression, returnByValue: true });
            if (hit.result?.result?.value) { seen = true; break; }
            await sleep(300);
          }
          if (!seen) {
            const snap = await c.send("Runtime.evaluate", { expression: `({ edit: !!document.querySelector('[data-action-ui-id="canvas-text-edit"]'), full: !!document.querySelector(".canvas-text-fullscreen-editor") })`, returnByValue: true });
            throw new Error(`${p.id}：等不到「${what}」 ${JSON.stringify(snap.result?.result?.value ?? {})} ${c.errors().slice(-2).join(" | ")}`);
          }
          continue;
        }
        if (typeof label === "object" && label.insert) {
          const pos = await c.send("Runtime.evaluate", { expression: editorPoint, returnByValue: true });
          const point = pos.result?.result?.value;
          if (!point) throw new Error(`${p.id}：找不到文本编辑器，打不进字`);
          await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
          await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
          await sleep(300);
          await c.send("Input.insertText", { text: label.insert });
          await sleep(400);
          continue;
        }
        const labelName = typeof label !== "object" ? label : label.ui ?? label.event ?? label.type ?? "输入框";
        if (typeof label === "object" && label.mouse && label.ui) {
          const deadline = Date.now() + (label.timeout ?? 4000);
          let point = null;
          while (Date.now() < deadline) {
            const pos = await c.send("Runtime.evaluate", { expression: uiCenter(label.ui, label.last), returnByValue: true });
            point = pos.result?.result?.value;
            if (point) break;
            await sleep(250);
          }
          if (!point) throw new Error(`${p.id}：界面上找不到「${labelName}」，页面没切过去`);
          await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
          await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
          await sleep(1500);
          continue;
        }
        const expression = typeof label !== "object" ? clickByText(label)
          : label.ui ? clickByUiId(label.ui, label.last)
          : label.event ? `(() => { window.dispatchEvent(new Event(${JSON.stringify(label.event)})); return true; })()`
          : typeIntoDialog(label.type);
        const r = await c.send("Runtime.evaluate", { expression, returnByValue: true });
        if (!r.result?.result?.value) throw new Error(`${p.id}：界面上找不到「${labelName}」，页面没切过去`);
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
// 基线：每屏一张 <屏>.png，报错记在 errors.json
function readGolden() {
  const errorsFile = path.join(GOLDEN, "errors.json");
  const errors = existsSync(errorsFile) ? JSON.parse(readFileSync(errorsFile, "utf8")) : {};
  const missing = PAGES.filter((p) => !existsSync(path.join(GOLDEN, `${p.id}.png`))).map((p) => p.id);
  if (missing.length) throw new Error(`基线里缺这些屏：${missing.join(",")}，先跑 --record 录一份`);
  return Object.fromEntries(PAGES.map((p) => [p.id, { file: path.join(GOLDEN, `${p.id}.png`), errors: errors[p.id] ?? [] }]));
}
function writeGolden(results) {
  mkdirSync(GOLDEN, { recursive: true });
  const errorsFile = path.join(GOLDEN, "errors.json");
  const errors = existsSync(errorsFile) ? JSON.parse(readFileSync(errorsFile, "utf8")) : {};
  for (const [id, r] of Object.entries(results)) {
    copyFileSync(r.file, path.join(GOLDEN, `${id}.png`));
    errors[id] = r.errors;
  }
  writeFileSync(errorsFile, JSON.stringify(errors, null, 2));
}
if (RECORD) {
  console.log(`录基线：${testMode} → ${path.relative(repo, GOLDEN)}`);
  writeGolden(await runMode(testMode));
  console.log(`已录 ${PAGES.length} 屏`);
  process.exit(0);
}
console.log(`对比 ${baseMode} ↔ ${testMode}，结果在 ${path.relative(repo, outDir)}`);
const base = baseMode === "golden" ? readGolden() : await runMode(baseMode);
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
