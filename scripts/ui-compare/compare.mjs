// 逐屏对比：同一份测试数据起桌面应用，访问同一组页面、截图，和基线逐像素比较，并收集控制台报错。
// 界面每次改动都靠它验收。
//
//   node scripts/ui-compare/compare.mjs [基准=golden] [对比模式=recovered]
//   node scripts/ui-compare/compare.mjs --record [模式=recovered]     # 把这一份界面的截图录成基线
//
// 基准写 golden 时读录好的基线截图（默认 .probe/ui-golden/，可用 GOLDEN=目录 指定），不再起第二个应用；
// 写成别的就是 OV_UI 的取值（recovered / ours），两种界面各起一次对比。ONLY 只跑几屏时，录基线也只更新这几屏。
// 基线是整轮按顺序录的，前面的屏会改应用状态（比如进过技能页，侧栏的新功能小圆点就消了）；
// ONLY 跳过前面的屏再和基线比，可能差出这类零星像素，以整轮结果为准。
// 前提：app/desktop 已构建（pnpm --filter @ov/desktop build，会顺带构建 app/renderer 到 out/recovered-ui）。
// 结果写到 .probe/ui-compare/<时间>/：每页截图 + 差异图 + report.json；终端打印每页差异比例。
//
// 注意：卡片封面视频和打光预设缩略图都是外部 CDN 资源，采集时会被挡掉（见 BLOCKED_URLS）。
// 不挡卡片封面会因采集到的视频帧不同而差出 7%，不挡缩略图则可能因远端图像变化遮蔽真实界面差异。
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pixelmatch from "pixelmatch";
import { generateFixtures } from "./generate-fixtures.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sharp = createRequire(path.join(repo, "app/gateway/package.json"))("sharp");
const RECORD = process.argv[2] === "--record";
const [baseMode = "golden", testMode = "recovered"] = RECORD ? ["golden", process.argv[3] ?? "recovered"] : process.argv.slice(2);
const GOLDEN = process.env.GOLDEN ? path.resolve(process.env.GOLDEN) : path.join(repo, ".probe/ui-golden");
const GLOBAL_SEARCH_CAPTURE_AGE_MS = 4 * 60_000 + 30_000;

const ROOT = "/tmp/ov-cmp";
const FIXTURE = path.join(repo, "scripts/ui-compare/fixture");
const PORT = 9360;
const WS_A = `${ROOT}/ws-a`;
const WS_B = `${ROOT}/ws-b`;
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const ISO_TIMESTAMP_PATTERN = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})\b/gi;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);
const pageRandomIds = {
  table: new Map(),
  col: new Map(),
  row: new Map(),
  cond: new Map(),
};
function resetPageRandomIds() {
  for (const ids of Object.values(pageRandomIds)) ids.clear();
}
function canonicalRandomId(ids, id, prefix) {
  if (!ids.has(id)) ids.set(id, `${prefix}-${ids.size + 1}`);
  return ids.get(id);
}
// 云端轮换展示素材会改变路径，与本地交互逻辑无关。
const NET_VOLATILE = ["/api/v1/home/showcase-assets/"];
const DOM_STATE_SCRIPT = `(() => {
  const elements = [];
  for (const element of document.querySelectorAll("*")) {
    const tag = element.tagName.toLowerCase();
    const attributes = {};
    for (const attribute of element.attributes) {
      const name = attribute.name.toLowerCase();
      if (name === "data-action-ui-id" || name === "role" || name.startsWith("aria-") || name === "disabled" || name === "checked" || name === "contenteditable") {
        let value = attribute.value;
        if (name.startsWith("aria-")) value = value.replace(/_r_[a-z0-9]+_/gi, "<react-id>");
        if (name === "aria-label" && element.closest('[data-action-ui-id="chat-empty-recommendations"]')) {
          if (/^(使用提示词:|Use prompt:)/i.test(value)) value = value.replace(/^(使用提示词:|Use prompt:).*/i, "$1 <推荐示例>");
          else if (/^(全屏预览:|Fullscreen preview:)/i.test(value)) value = value.replace(/^(全屏预览:|Fullscreen preview:).*/i, "$1 <推荐示例>");
          else if (tag === "video") value = "<推荐示例>";
        }
        attributes[name] = value;
      }
    }
    if (!Object.keys(attributes).length && !["input", "textarea", "select"].includes(tag)) continue;
    const ownText = [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.nodeValue).join("").trim().slice(0, 200);
    elements.push({
      tag,
      attributes,
      value: "value" in element ? element.value : null,
      checked: "checked" in element ? element.checked : null,
      ownText,
    });
  }
  return elements;
})()`;
const LOCAL_STORAGE_SCRIPT = `(() => {
  const entries = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    entries.push([key, localStorage.getItem(key)]);
  }
  return entries;
})()`;

function normalizeText(value) {
  return value
    .replace(UUID_PATTERN, "<uuid>")
    .replace(ISO_TIMESTAMP_PATTERN, "<t>")
    .replace(/\b\d{13}\b/g, "<t>")
    .replace(/\bses_[a-z0-9]{12,}\b/gi, "<session>")
    .replace(/\b(request\s*id\s*[:：]\s*)[a-z0-9_-]{16,}/gi, "$1<request>")
    .replace(/((?:https?|wss?):\/\/(?:localhost|127\.0\.0\.1)):\d{1,5}\b/gi, "$1:<port>")
    .replace(/((?:https?|wss?)%3A%2F%2F(?:localhost|127\.0\.0\.1))%3A\d{1,5}\b/gi, "$1%3A<port>")
    .replace(/\b(?:会话|Session)\s+[0-9a-z]{4,}\b/gi, "会话")
    .replace(/([a-f0-9]{12})(?=(?:\.|%2e)htable\b)/gi, (_match, id) =>
      canonicalRandomId(pageRandomIds.table, id.toLowerCase(), "table"),
    )
    .replace(/\b(col|row|cond)_([a-f0-9]{8})\b/gi, (_match, kind, id) => {
      const prefix = kind.toLowerCase();
      return canonicalRandomId(pageRandomIds[prefix], id.toLowerCase(), prefix);
    });
}
function normalizeValue(value, key = "") {
  if (typeof value === "string") return /session(?:_id|Id)$/i.test(key) ? "<session>" : normalizeText(value);
  if (typeof value === "number" && Number.isInteger(value) && Math.abs(value) >= 1e12 && Math.abs(value) < 1e14) return "<t>";
  if (Array.isArray(value)) return value.map((item) => normalizeValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((childKey) => [normalizeText(childKey), normalizeValue(value[childKey], childKey)]),
    );
  }
  return value;
}
function normalizePayload(value) {
  if (typeof value !== "string") return value ?? null;
  const text = normalizeText(value);
  try {
    return JSON.stringify(normalizeValue(JSON.parse(text)));
  } catch {
    return text;
  }
}
function localEndpoint(value) {
  try {
    const url = new URL(value);
    if (!LOCAL_HOSTS.has(url.hostname)) return null;
    const port = url.port ? ":<port>" : "";
    return {
      host: `${url.protocol}//${url.hostname}${port}`,
      path: normalizeText(`${url.pathname}${url.search}`)
        .replace(/((?:%26|[?&])_canvas_v(?:%3D|=))\d+/gi, "$1<version>"),
    };
  } catch {
    return null;
  }
}
function snapshotNetwork(requests, frames) {
  const normalizedRequests = requests.map((request) => normalizeValue(request));
  const getRequests = [...new Set(
    normalizedRequests
      .filter((request) => request.method === "GET")
      .map((request) => JSON.stringify(request)),
  )].sort().map((request) => JSON.parse(request));
  return {
    getRequests,
    nonGetRequests: normalizedRequests.filter((request) => request.method !== "GET"),
    wsSent: frames
      .filter((frame) => frame.direction === "sent")
      .map(({ direction, ...frame }) => normalizeValue(frame)),
    wsReceived: frames
      .filter((frame) => frame.direction === "received")
      .map(({ direction, ...frame }) => normalizeValue(frame)),
  };
}
function comparableNetwork(network) {
  const nonGetGroups = new Map();
  for (const request of network.nonGetRequests) {
    if (request.method === "OPTIONS") continue;
    const key = `${request.method} ${request.path}`;
    const group = nonGetGroups.get(key) ?? [];
    group.push(request);
    nonGetGroups.set(key, group);
  }
  return {
    getRequests: network.getRequests.filter((request) =>
      !NET_VOLATILE.some((prefix) => request.path.startsWith(prefix)),
    ),
    nonGetRequests: [...nonGetGroups.keys()].sort().flatMap((key) => nonGetGroups.get(key)),
    wsSent: network.wsSent,
  };
}
function readHiloFiles(workspace) {
  const root = path.join(workspace, ".hilo");
  const files = {};
  const thumbnailCache = [];
  if (!existsSync(root)) return files;
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(file);
        continue;
      }
      if (!entry.isFile() || /\.(?:sqlite|db)(?:-(?:wal|shm|journal))?$/i.test(entry.name)) continue;
      const relative = path.relative(root, file).split(path.sep).join("/");
      const normalizedRelative = normalizeText(relative);
      const bytes = readFileSync(file);
      // 缩略图缓存文件名随远端资源 ID 变动；按内容摘要比较，仍保留重复文件数量和内容变化。
      if (/^\.thumbnails\/[^/]+$/.test(relative)) {
        thumbnailCache.push({
          extension: path.extname(relative),
          hash: createHash("sha256").update(bytes).digest("hex"),
          size: bytes.length,
        });
        continue;
      }
      const text = bytes.toString("utf8");
      if (text.includes("\0")) {
        files[relative] = bytes.toString("base64");
        continue;
      }
      try {
        files[normalizedRelative] = normalizeValue(JSON.parse(text));
      } catch {
        files[normalizedRelative] = normalizeText(text);
      }
    }
  };
  visit(root);
  if (thumbnailCache.length) {
    files[".thumbnails"] = thumbnailCache.sort((a, b) => a.extension.localeCompare(b.extension) || a.hash.localeCompare(b.hash));
  }
  return files;
}
function shortValue(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}
function jsonDiff(expected, actual) {
  const differences = [];
  let omitted = 0;
  const add = (difference) => {
    if (differences.length < 40) differences.push(difference);
    else omitted++;
  };
  const visit = (left, right, at = "$") => {
    if (Object.is(left, right)) return;
    if (Array.isArray(left) && Array.isArray(right)) {
      if (left.length !== right.length) add({ path: `${at}.length`, expected: left.length, actual: right.length });
      for (let i = 0; i < Math.min(left.length, right.length); i++) visit(left[i], right[i], `${at}[${i}]`);
      return;
    }
    if (left && right && typeof left === "object" && typeof right === "object" && !Array.isArray(left) && !Array.isArray(right)) {
      const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
      for (const key of keys) {
        if (!(key in left) || !(key in right)) add({ path: `${at}.${key}`, expected: key in left ? shortValue(left[key]) : "<missing>", actual: key in right ? shortValue(right[key]) : "<missing>" });
        else visit(left[key], right[key], `${at}.${key}`);
      }
      return;
    }
    add({ path: at, expected: shortValue(left), actual: shortValue(right) });
  };
  visit(expected, actual);
  if (omitted) differences.push({ omitted });
  return differences;
}
function stabilizeFixtureTimes(dir) {
  const files = [];
  const visit = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory() && entry.name !== ".hilo") visit(file);
      else if (entry.isFile()) files.push(file);
    }
  };
  visit(dir);
  files.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  files.forEach((file, index) => {
    const time = new Date(Date.UTC(2020, 0, 1, 0, 0, index));
    utimesSync(file, time, time);
  });
}
const DISABLED_PAGES = [];
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
  { id: "skills", url: "/skills", waitForRequests: ["/api/skills*", "/api/plugins*", "/api/skills/market*"] },
  // 技能页的其它标签（地址参数会被页面忽略，只能点）
  { id: "skills-connectors", url: "/skills", tabs: ["插件"] },
  { id: "skills-mine", url: "/skills", tabs: ["我的 Skill"] },
  { id: "skill-community", url: "/skill-community", tabs: [{ wait: 6000 }], waitForRequests: ["/api/skills", "/api/plugins", "/api/skills/market*"] },
  { id: "changelog", url: "/changelog" },
  // 左下角连接状态点开的用户菜单，和设置里的「平台接入」分区
  { id: "user-menu", url: "/projects", tabs: [{ ui: "user-menu.trigger" }, { wait: 800 }] },
  { id: "settings-platform", url: "/projects", tabs: [{ ui: "user-menu.trigger" }, { wait: 600 }, { ui: "user-menu.settings" }, { wait: 800 }, "平台接入", { wait: 1500 }] },
  { id: "global-search", url: "/projects", tabs: [{ event: "hilo:open-global-search" }, { wait: 1500 }] },
  { id: "global-search-query", url: "/projects", tabs: [{ event: "hilo:open-global-search" }, { wait: 1500 }, { type: "ws" }, { wait: 2000 }] },
  { id: "ws-a", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}` },
  { id: "ws-b", url: `/workspace?workspaceId=${encodeURIComponent(WS_B)}`, waitForRequests: ["/api/v1/home/quick_start_config*"] },
  { id: "ws-markdown", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, scenario: "markdown" },
  // 画布 / 对话里要点开才出现的界面。会改画布内容的放在只读步骤后面。
  { id: "ws-add-node", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, tabs: [{ ui: "canvas.add-node" }, { wait: 800 }] },
  { id: "ws-zoom", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, tabs: [{ ui: "canvas.toolbar-zoom-menu" }, { wait: 600 }] },
  { id: "ws-chat-skill", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, tabs: [{ ui: "chat-skill-btn" }, { wait: 800 }] },
  { id: "ws-select-image", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, tabs: [{ ui: "canvas.image-node" }, { wait: 800 }] },
  { id: "ws-relight", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, tabs: [{ ui: "canvas.image-node" }, { wait: 600 }, { ui: "canvas.node-relight" }, { until: "canvas.relight.popover" }, { wait: 1500 }] },
  { id: "ws-multi-angle", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, tabs: [{ ui: "canvas.image-node" }, { wait: 600 }, { ui: "canvas.node-multi-angle" }, { until: "canvas.multi-angle.popover" }] },
  { id: "ws-pdf", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, scenario: "pdf" },
  { id: "ws-video", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, scenario: "video" },
  { id: "ws-audio", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, scenario: "audio" },
  { id: "ws-text-node", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, tabs: [{ ui: "canvas.add-node" }, { ui: "canvas.menu-add-text" }, { wait: 2000 }] },
  { id: "ws-table-node", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, tabs: [{ ui: "canvas.add-node" }, { ui: "canvas.menu-add-table" }, { wait: 2000 }] },
  { id: "ws-text-editor", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, tabs: [{ ui: "canvas.add-node", mouse: true }, { wait: 400 }, { ui: "canvas.menu-add-text", mouse: true }, { ui: "canvas.text-node", last: true, mouse: true, timeout: 8000 }, { wait: 500 }, { ui: "canvas-text-edit", mouse: true, last: true, timeout: 8000 }, { untilSelector: ".canvas-text-fullscreen-editor .ProseMirror", timeout: 15000 }, { insert: "对比用的一段文字" }, { wait: 2500 }] },
  { id: "ws-chat-input", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, scenario: "chat", persistWaitMs: 1200 },
  { id: "ws-code-editor", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, scenario: "code-editor", persistWaitMs: 1200 },
  { id: "ws-table-edit", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, scenario: "table-edit", persistWaitMs: 1200 },
  { id: "ws-canvas-ops", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, scenario: "canvas-ops", persistWaitMs: 1200 },
  // 切到仅对话会记在工作区里，后面的画布屏就找不到节点。所以放在最后。
  { id: "ws-layout", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, tabs: [{ ui: "workspace.view-mode-menu.stage", mouse: true }, { wait: 500 }, { ui: "workspace.view-mode.chat-only", mouse: true }, { wait: 1200 }] },
  // 会真的创建一个项目（数据目录每种模式都会重建），所以放最后，免得影响别的屏
  { id: "project-created", url: "/projects", tabs: ["新建项目", "新建本地项目", { type: "对比用项目" }, "创建项目", { wait: 4000 }] },
  { id: "project-assets", url: "/projects", tabs: ["新建项目", "新建本地项目", { type: "对比用资产项目" }, "创建项目", { wait: 4000 }, "项目资产", { untilSelector: '[data-action-ui-id="local-assets.panel"]' }, { wait: 2000 }], persistWaitMs: 3000 },
];
// 只跑指定几屏：ONLY=home,skills-mine node scripts/ui-compare/compare.mjs
const ONLY = process.env.ONLY?.split(",").filter(Boolean);
const PAGES = (ONLY ? ALL_PAGES.filter((p) => ONLY.includes(p.id)) : ALL_PAGES)
  .filter((p) => !DISABLED_PAGES.some((disabled) => disabled.id === p.id));
const DISABLED_ONLY = ONLY?.filter((id) => DISABLED_PAGES.some((page) => page.id === id)) ?? [];
if (DISABLED_ONLY.length) {
  throw new Error(`ONLY 请求了暂不参与门禁的页面：${DISABLED_ONLY.map((id) => `${id}（${DISABLED_PAGES.find((page) => page.id === id).reason}）`).join("；")}`);
}
if (ONLY && PAGES.length !== ONLY.length) throw new Error(`ONLY 里有不存在的页面：${ONLY.filter((id) => !ALL_PAGES.some((p) => p.id === id)).join(",")}`);
const NO_ANIMATION = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}.cm-cursor,.cm-dropCursor{visibility:hidden!important}";
// 截图前让页面静下来：视频（封面已被挡掉，这里顺手停在第 0 帧）停住，等图片加载完。
// 新建会话的标题带随机 id（会话 b1888e / Session 20cf09），两边各生成一个，像素对不上。截图前把这段文字改成固定值。
const MASK_VOLATILE = `(() => {
  const re = /^(会话|Session)\\s+[0-9a-z]{4,}$/i;
  const requestId = /(request\\s*id\\s*[:：]\\s*)[a-z0-9_-]{16,}/gi;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (re.test(node.nodeValue.trim())) node.nodeValue = "会话";
    else node.nodeValue = node.nodeValue.replace(requestId, "$1<request>");
  }
})()`;
const SETTLE = `(async()=>{
  for (const v of document.querySelectorAll("video,audio")) { try { v.pause(); const target=v.dataset.ovCompareSeek?Number(v.dataset.ovCompareSeek):0; if(Math.abs(v.currentTime-target)>0.01)v.currentTime=target; } catch {} }
  const images = [...document.images];
    const imagesReady = async () => {
      const deadline = performance.now() + 5000;
      while (images.some((image) => !image.complete || image.naturalWidth <= 0) && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      await Promise.all(images
        .filter((image) => image.complete && image.naturalWidth > 0)
        .map((image) => image.decode().catch(() => {})));
    };
  await Promise.race([imagesReady(), new Promise((resolve) => setTimeout(resolve, 5000))]);
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
// 打光预设缩略图来自远端展示 CDN、并非本地逻辑；屏蔽后两构建都会渲染相同回退。
const BLOCKED_URLS = ["*cdn.hailuoai.com*", "*cdn.hailuoai.video*"];
// 聊天面板的“精选”推荐用 Math.random 洗牌；首个推荐区挂载时重置种子，避免页面启动阶段的随机调用次数影响卡片。
const SEEDED_RANDOM = `(() => {
  const seed = 0x2545f491;
  let s = seed;
  let seededRecommendations = false;
  const resetForRecommendations = (node) => {
    if (seededRecommendations || !(node instanceof Element)) return;
    const sections = [];
    if (node.matches('[data-action-ui-id="chat-empty-recommendations"]')) sections.push(node);
    sections.push(...node.querySelectorAll('[data-action-ui-id="chat-empty-recommendations"]'));
    if (!sections.length) return;
    seededRecommendations = true;
    window.__ovRandomTrace?.resets?.push({ afterN: window.__ovRandomTrace.count });
    s = seed;
  };
  Math.random = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Object.defineProperty(window, "__ovCompareResetRandom", {
    configurable: true,
    value: () => { s = seed; },
  });
  new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) resetForRecommendations(node);
    }
  }).observe(document, { childList: true, subtree: true });
})();`;
const RANDOM_TRACE = (expectedUrl) => `(() => {
  if (location.pathname + location.search !== ${JSON.stringify(expectedUrl)}) return;
  if (window.__ovRandomTrace) return;
  const trace = window.__ovRandomTrace = { count: 0, calls: [], resets: [], poolCandidates: [], stackEntries: 0 };
  const stackTop = () => (new Error().stack ?? "").split("\\n").slice(1, 7);
  const random = Math.random;
  Math.random = function() {
    const n = ++trace.count;
    if (trace.stackEntries < 3000) {
      trace.calls.push({ n, stack: stackTop() });
      trace.stackEntries++;
    }
    return Reflect.apply(random, this, arguments);
  };
  const filter = Array.prototype.filter;
  Object.defineProperty(Array.prototype, "filter", {
    configurable: true,
    writable: true,
    value: function(callback, thisArg) {
      try {
        if (Array.isArray(this) && this.length > 0 && this.length <= 1000) {
          const ids = [];
          let hasOnlyStringIds = true;
          for (let i = 0; i < this.length; i++) {
            const id = this[i]?.id;
            if (typeof id !== "string") {
              hasOnlyStringIds = false;
              break;
            }
            ids.push(id);
          }
          if (hasOnlyStringIds && trace.stackEntries < 3000 && trace.poolCandidates.length < 100) {
            const stack = stackTop();
            if (stack.some((frame) => frame.includes("pickRecommendationBatch"))) {
              trace.poolCandidates.push({ n: trace.count, ids, stack });
              trace.stackEntries++;
            }
          }
        }
      } catch {}
      return Reflect.apply(filter, this, arguments);
    },
  });
  window.__ovRandomTraceRestore = () => {
    Math.random = random;
    Object.defineProperty(Array.prototype, "filter", {
      configurable: true,
      writable: true,
      value: filter,
    });
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
async function ratio(a, b, tolerance = TOL) {
  const [ia, ib] = await Promise.all([rawOf(a), rawOf(b)]);
  if (ia.info.width !== ib.info.width || ia.info.height !== ib.info.height) return 1;
  const px = ia.info.width * ia.info.height;
  let changed = 0;
  for (let i = 0; i < px; i++) {
    const o = i * 4;
    if (Math.abs(ia.data[o] - ib.data[o]) + Math.abs(ia.data[o + 1] - ib.data[o + 1]) + Math.abs(ia.data[o + 2] - ib.data[o + 2]) > tolerance) changed++;
  }
  return changed / px;
}
// 卡片网格的位置、每行每列都靠封面视频撑开：等一两秒抓一次，抓到的时机随采集轮次漂移，
// 于是同一份界面两次采集能差出一整条卡片带。改成反复重拍，直到连续两张像素一致为止。
// 封面 CDN 已在 cdp() 里挡掉，这里的重拍只需兜住字体、光标这类残留抖动。
const STABLE_TOL = 0;
async function stableShot(c) {
  let prev = null;
  let last = null;
  for (let i = 0; i < 8; i++) {
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: -1, y: -1 });
    await c.send("Runtime.evaluate", { expression: SETTLE, awaitPromise: true });
    await sleep(700);
    await c.send("Runtime.evaluate", { expression: MASK_VOLATILE });
    await waitForNoToasts(c);
    const shot = await c.send("Page.captureScreenshot", { format: "png" });
    const buf = Buffer.from(shot.result.data, "base64");
    if (prev && (await ratio(prev, buf, 0)) <= STABLE_TOL) return buf;
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
        const requests = [];
        const frames = [];
        const requestTrace = [];
        const websocketTraceMetadata = new Map();
        const websocketUrls = new Map();
        const pendingLocalRequests = new Map();
        const completedLocalPaths = new Set();
        let capturingNetwork = false;
        let mainFrameId = null;
        let navigationLoaderId = null;
        let captureDocumentURL = null;
        ws.onmessage = (ev) => {
          const m = JSON.parse(ev.data);
          if (m.id) pending.get(m.id)?.(m);
          else if (m.method === "Page.frameNavigated" && !m.params.frame.parentId) {
            mainFrameId = m.params.frame.id;
            if (capturingNetwork) navigationLoaderId = m.params.frame.loaderId;
          } else if (m.method === "Network.requestWillBeSent" && capturingNetwork) {
            const params = m.params;
            const request = params.request;
            if (params.type === "Document" && params.frameId === mainFrameId) {
              navigationLoaderId = params.loaderId;
            }
            const inNavigationScope = Boolean(navigationLoaderId && params.loaderId === navigationLoaderId);
            if (process.env.CAPTURE_TRACE === "1") {
              try {
                const url = new URL(request.url);
                if (LOCAL_HOSTS.has(url.hostname)) {
                  requestTrace.push({
                    requestId: params.requestId,
                    loaderId: params.loaderId,
                    documentURL: params.documentURL,
                    type: params.type,
                    method: String(request.method ?? "GET").toUpperCase(),
                    path: `${url.pathname}${url.search}`,
                    timestamp: Date.now(),
                    captured: inNavigationScope,
                  });
                  websocketTraceMetadata.set(params.requestId, requestTrace[requestTrace.length - 1]);
                }
              } catch {}
            }
            if (inNavigationScope) {
              const endpoint = localEndpoint(request.url);
              if (endpoint) {
                requests.push({
                  method: String(request.method ?? "GET").toUpperCase(),
                  ...endpoint,
                  postData: normalizePayload(request.postData),
                });
                if (params.type !== "WebSocket") pendingLocalRequests.set(params.requestId, new URL(request.url).pathname);
                if (/^wss?:/i.test(request.url)) websocketUrls.set(params.requestId, endpoint);
              }
            }
          } else if (
            capturingNetwork &&
            (m.method === "Network.loadingFinished" || m.method === "Network.loadingFailed")
          ) {
            const requestPath = pendingLocalRequests.get(m.params.requestId);
            if (requestPath) {
              pendingLocalRequests.delete(m.params.requestId);
              completedLocalPaths.add(requestPath);
            }
          } else if (
            m.method === "Network.webSocketCreated" &&
            capturingNetwork &&
            navigationLoaderId
          ) {
            const endpoint = localEndpoint(m.params.url);
            if (endpoint) websocketUrls.set(m.params.requestId, endpoint);
          } else if (
            capturingNetwork &&
            (m.method === "Network.webSocketFrameSent" || m.method === "Network.webSocketFrameReceived")
          ) {
            const endpoint = websocketUrls.get(m.params.requestId);
            if (endpoint) {
              frames.push({
                direction: m.method === "Network.webSocketFrameSent" ? "sent" : "received",
                ...endpoint,
                opcode: m.params.response.opcode,
                payload: normalizePayload(m.params.response.payloadData),
              });
              if (process.env.CAPTURE_TRACE === "1") {
                const metadata = websocketTraceMetadata.get(m.params.requestId);
                requestTrace.push({
                  requestId: m.params.requestId,
                  loaderId: metadata?.loaderId,
                  documentURL: metadata?.documentURL,
                  type: "WebSocketFrame",
                  direction: m.method === "Network.webSocketFrameSent" ? "sent" : "received",
                  path: endpoint.path,
                  payload: normalizePayload(m.params.response.payloadData),
                  timestamp: Date.now(),
                  captured: metadata?.captured ?? false,
                });
              }
            }
          }
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
        const frameTree = await send("Page.getFrameTree");
        mainFrameId = frameTree.result.frameTree.frame.id;
        // 挡掉封面 CDN 后会抛网络错误，这是预期内的，不算界面报错
        await send("Network.enable");
        await send("Network.setBlockedURLs", { urls: BLOCKED_URLS });
        await send("Page.addScriptToEvaluateOnNewDocument", { source: SEEDED_RANDOM });
        // 日志里的随机 ID（UUID）和耗时每次不同，规整掉再比，否则同一条报错两边永远对不上
        const visible = () => errors.filter((e) => !/cdn\.hailuoai\.(?:com|video)/.test(e)).map((e) => e.replace(UUID_PATTERN, "<uuid>").replace(/durationMs=\d+/g, "durationMs=<n>"));
        return {
          send,
          errors: visible,
          clearErrors: () => (errors.length = 0),
          beginNetworkCapture: (documentURL) => {
            requests.length = 0;
            frames.length = 0;
            requestTrace.length = 0;
            websocketTraceMetadata.clear();
            resetPageRandomIds();
            websocketUrls.clear();
            pendingLocalRequests.clear();
            completedLocalPaths.clear();
            navigationLoaderId = null;
            captureDocumentURL = documentURL;
            capturingNetwork = true;
          },
          waitForRequests: async (patterns, timeoutMs = 10000) => {
            const matches = (requestPath, pattern) =>
              pattern.endsWith("*")
                ? requestPath.startsWith(pattern.slice(0, -1))
                : requestPath === pattern;
            const deadline = Date.now() + timeoutMs;
            let idleSince = null;
            while (Date.now() < deadline) {
              const missing = patterns.filter((pattern) =>
                ![...completedLocalPaths].some((requestPath) => matches(requestPath, pattern)),
              );
              const pendingMatches = [...pendingLocalRequests.values()].some((requestPath) =>
                patterns.some((pattern) => matches(requestPath, pattern)),
              );
              if (!missing.length && !pendingMatches) {
                idleSince ??= Date.now();
                if (Date.now() - idleSince >= 500) return;
              } else {
                idleSince = null;
              }
              await sleep(100);
            }
            throw new Error(`等不到本机请求完成：${patterns.join(", ")}`);
          },
          waitForWebSocketFrame: async (predicate, afterIndex = -1, timeoutMs = 90000) => {
            const deadline = Date.now() + timeoutMs;
            while (Date.now() < deadline) {
              const index = frames.findIndex((frame, frameIndex) =>
                frameIndex > afterIndex && predicate(frame),
              );
              if (index >= 0) return { frame: frames[index], index };
              await sleep(100);
            }
            throw new Error(`等不到匹配的 WebSocket frame，索引起点 ${afterIndex}`);
          },
          waitForNetworkIdle: async (timeoutMs = 10000, idleMs = 3000) => {
            const deadline = Date.now() + timeoutMs;
            let idleSince = null;
            while (Date.now() < deadline) {
              if (!pendingLocalRequests.size) {
                idleSince ??= Date.now();
                if (Date.now() - idleSince >= idleMs) return;
              } else {
                idleSince = null;
              }
              await sleep(100);
            }
            throw new Error(`本机网络 ${idleMs}ms 未空闲，超时后仍在进行：${[...pendingLocalRequests.values()].join(", ")}`);
          },
          endNetworkCapture: () => {
            if (!navigationLoaderId) throw new Error(`未捕获到页面导航 loaderId：${captureDocumentURL}`);
            capturingNetwork = false;
            return snapshotNetwork(requests, frames);
          },
          networkTrace: () => [...requestTrace],
          close: () => ws.close(),
        };
      }
    } catch {}
    await sleep(500);
  }
  throw new Error("等不到界面页面");
}

async function capturePageDom(c) {
  await waitForNoToasts(c);
  const result = await c.send("Runtime.evaluate", {
    expression: DOM_STATE_SCRIPT,
    returnByValue: true,
  });
  return normalizeValue(result.result?.result?.value ?? []);
}
async function capturePageState(c) {
  await waitForNoToasts(c);
  const result = await c.send("Runtime.evaluate", {
    expression: LOCAL_STORAGE_SCRIPT,
    returnByValue: true,
  });
  const localStorage = Object.fromEntries((result.result?.result?.value ?? []).map(([key, value]) => {
    if (typeof value !== "string") return [key, normalizeValue(value)];
    try {
      return [key, JSON.stringify(normalizeValue(JSON.parse(value)))];
    } catch {
      return [key, normalizeText(value)];
    }
  }));
  return normalizeValue({
    localStorage,
    hilo: {
      wsA: readHiloFiles(WS_A),
      wsB: readHiloFiles(WS_B),
    },
  });
}
async function captureStablePageState(c) {
  const deadline = Date.now() + 10000;
  let previous = {
    dom: await capturePageDom(c),
    state: await capturePageState(c),
  };
  let lastDiff = { dom: [], state: [] };
  while (Date.now() < deadline) {
    await sleep(500);
    const current = {
      dom: await capturePageDom(c),
      state: await capturePageState(c),
    };
    lastDiff = {
      dom: jsonDiff(previous.dom, current.dom),
      state: jsonDiff(previous.state, current.state),
    };
    if (!lastDiff.dom.length && !lastDiff.state.length) return current;
    previous = current;
  }
  throw new Error(`DOM/state 10 秒内未稳定，最后一次差异：${JSON.stringify(lastDiff)}`);
}

async function evalValue(c, expression) {
  const result = await c.send("Runtime.evaluate", { expression, returnByValue: true });
  return result.result?.result?.value;
}
async function waitForNoToasts(c, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evalValue(c, `!document.querySelector('[data-sonner-toast]:not([data-removed="true"])')`)) return;
    await sleep(100);
  }
  throw new Error(`等待 toast 自动消失超时（${timeoutMs}ms）`);
}
async function waitForValue(c, expression, label, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await evalValue(c, expression);
    if (value) return value;
    await sleep(250);
  }
  throw new Error(`等待 ${label} 超时`);
}
async function refreshWorkspaceRecommendations(c) {
  await waitForValue(c, `(() => {
    const sections = new Set([...document.querySelectorAll('[data-action-ui-id="chat-showcase-card"]')]
      .map((card) => card.closest('[data-action-ui-id="chat-empty-recommendations"]'))
      .filter((section) => {
        if (!section) return false;
        const rect = section.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 &&
          rect.top < innerHeight && rect.left < innerWidth;
      }));
    return sections.size > 0 && [...sections].every((section) =>
      section.querySelectorAll('[data-action-ui-id="chat-showcase-card"]').length === 4,
    );
  })()`, "ws-b 快速开始推荐列表", 10000);
  const refreshed = await evalValue(c, `(() => {
    const sections = new Set([...document.querySelectorAll('[data-action-ui-id="chat-showcase-card"]')]
      .map((card) => card.closest('[data-action-ui-id="chat-empty-recommendations"]'))
      .filter((section) => {
        if (!section) return false;
        const rect = section.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 &&
          rect.top < innerHeight && rect.left < innerWidth;
      }));
    let count = 0;
    for (const section of sections) {
      const button = section.querySelector('[data-action-ui-id="chat-empty-recommendations-refresh"]');
      if (!button || button.disabled) continue;
      window.__ovCompareResetRandom?.();
      button.click();
      count++;
    }
    return count;
  })()`);
  if (!refreshed) throw new Error("ws-b 找不到可刷新的快速开始推荐列表");
  await sleep(500);
}
async function waitForStableCanvasGeometry(c, pageId, timeout = 10000) {
  const deadline = Date.now() + timeout;
  let previous = null;
  let stable = 0;
  let last = null;
  while (Date.now() < deadline) {
    last = await evalValue(c, `(() => {
      const viewport = document.querySelector(".react-flow__viewport");
      if (!viewport) return null;
      const point = (rect) => [rect.x, rect.y, rect.width, rect.height].map((value) => Number(value.toFixed(3)));
      const nodes = [...document.querySelectorAll(".react-flow__node")].map((node) => ({
        rect: point(node.getBoundingClientRect()),
        controls: [...node.querySelectorAll(".react-flow__resize-control, .react-flow__handle")].map((control) =>
          point(control.getBoundingClientRect()),
        ),
      }));
      return JSON.stringify({ transform: getComputedStyle(viewport).transform, nodes });
    })()`);
    if (last && last === previous) {
      stable++;
      if (stable >= 2) return;
    } else {
      stable = 0;
    }
    previous = last;
    await sleep(500);
  }
  throw new Error(`${pageId} 画布几何 10 秒内未稳定：${last ?? "viewport 不存在"}`);
}
async function waitForRetainedWorkspaceStage(c, pageId, timeout = 10000) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    last = await evalValue(c, `(() => ({
      stageCount: document.querySelectorAll('[data-action-ui-id="workspace-stage"]').length,
      runtimeIds: [...document.querySelectorAll('[data-workspace-runtime-id]')].map((node) =>
        node.getAttribute('data-workspace-runtime-id'),
      ),
      pendingIds: [...document.querySelectorAll('[data-workspace-runtime-pending]')].map((node) =>
        node.getAttribute('data-workspace-runtime-pending'),
      ),
    }))()`);
    if (last?.stageCount >= 2 && last.pendingIds.length === 0) return;
    await sleep(500);
  }
  throw new Error(`${pageId} 保留工作区 runtime 未就绪：${JSON.stringify(last)}`);
}
async function waitForSkillProfile(timeout = 10000) {
  const file = path.join(ROOT, "data/.config-v2/base.json");
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const config = JSON.parse(readFileSync(file, "utf8"));
      const permissions = config?.agent?.["media-agent"]?.permission?.skill;
      if (permissions?.["*"] === "allow") return;
    } catch {}
    await sleep(100);
  }
  throw new Error("等待 data/.config-v2/base.json 中 agent.media-agent.permission.skill[*] 就绪超时");
}
async function waitForInstalledSkillsReady(c) {
  const mineTab = await c.send("Runtime.evaluate", {
    expression: clickByUiId("skills-tab-mine"),
    returnByValue: true,
  });
  if (!mineTab.result?.result?.value) throw new Error("技能页找不到「我的 Skill」标签");
  await waitForValue(c, `(() => {
    const root = document.querySelector('[data-action-ui-id="skills-scroll-container"]');
    const tab = root?.querySelector('[data-action-ui-id="skills-tab-mine"]');
    return tab?.getAttribute("aria-selected") === "true" &&
      !!root?.querySelector('[data-layout-slot="skills-mine-content"]');
  })()`, "已安装 Skill 列表加载完成");
  const communityTab = await c.send("Runtime.evaluate", {
    expression: clickByUiId("skills-tab-community"),
    returnByValue: true,
  });
  if (!communityTab.result?.result?.value) throw new Error("技能页找不到「社区」标签");
  await waitForValue(c, `(() => {
    const root = document.querySelector('[data-action-ui-id="skills-scroll-container"]') ?? document;
    const tab = root.querySelector('[data-action-ui-id="skills-tab-community"]');
    const loading = [...root.querySelectorAll("p")].some((element) => /^(?:Loading market skills|加载市场 Skill 中)/i.test(element.textContent.trim()));
    return tab?.getAttribute("aria-selected") === "true" &&
      !loading &&
      !!root.querySelector('[data-action-ui-id="market-community-featured"]') &&
      !!root.querySelector('[data-action-ui-id="other-skill-item"]');
  })()`, "技能社区列表加载完成");
}
async function clickUi(c, id, last = false) {
  const point = await waitForValue(c, uiCenter(id, last), id, 8000);
  await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
  await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
  await sleep(400);
}
async function clickNode(c, id) {
  const point = await waitForValue(c, `(() => { const e=document.querySelector('.react-flow__node[data-id="${id}"]'); if(!e)return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`, id);
  await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
  await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
  await sleep(350);
}
async function clickNodeAction(c, nodeId, actionId) {
  const selector = `.react-flow__node[data-id="${nodeId}"] [data-action-ui-id="${actionId}"]`;
  const point = await waitForValue(c, `(() => { const e=document.querySelector(${JSON.stringify(selector)}); if(!e)return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`, actionId);
  await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
  await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
  await sleep(400);
}
async function key(c, key, code, modifiers = 0) {
  await c.send("Input.dispatchKeyEvent", { type: "keyDown", key, code, modifiers });
  await c.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, modifiers });
}
async function uploadWorkspaceFile(c, filename) {
  const point = await waitForValue(c, `(() => {
    const pane = document.querySelector(".react-flow__pane");
    if (!pane) return null;
    const bounds = pane.getBoundingClientRect();
    const nodes = [...document.querySelectorAll(".react-flow__node")].map((node) => node.getBoundingClientRect());
    const candidates = [];
    for (let y = bounds.top + 48; y <= bounds.bottom - 48; y += 48) {
      for (let x = bounds.left + 48; x <= bounds.right - 48; x += 48) {
        candidates.push({ x, y });
      }
    }
    const center = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    candidates.sort((a, b) => Math.hypot(a.x - center.x, a.y - center.y) - Math.hypot(b.x - center.x, b.y - center.y));
    return candidates.find(({ x, y }) => !nodes.some((r) => x >= r.left - 120 && x <= r.right + 120 && y >= r.top - 120 && y <= r.bottom + 120)) ?? null;
  })()`, "canvas upload position");
  const beforeCount = await evalValue(c, `document.querySelectorAll(".react-flow__node").length`);
  await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "right", clickCount: 1 });
  await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "right" });
  await clickUi(c, "canvas.pane-menu-upload");
  const inputReady = await waitForValue(c, `(() => [...document.querySelectorAll('input[type="file"]')].some((input) => input.accept === "*/*" || input.accept.includes("video")))()`, "canvas file picker", 5000);
  if (!inputReady) throw new Error("找不到画布上传文件控件");
  await c.send("DOM.enable");
  const documentNode = await c.send("DOM.getDocument", { depth: -1 });
  const fileInputs = await c.send("DOM.querySelectorAll", {
    nodeId: documentNode.result.root.nodeId,
    selector: 'input[type="file"]',
  });
  const inputAttributes = await Promise.all(fileInputs.result.nodeIds.map(async (nodeId) => {
    const result = await c.send("DOM.getAttributes", { nodeId });
    const attributes = result.result.attributes;
    return {
      nodeId,
      accept: attributes[attributes.indexOf("accept") + 1] ?? "",
    };
  }));
  const selectedInput = inputAttributes.find((input) => input.accept === "*/*") ??
    inputAttributes.find((input) => input.accept.includes("video"));
  if (!selectedInput) throw new Error(`无法定位画布上传文件控件：${JSON.stringify(inputAttributes)}`);
  const { nodeId } = selectedInput;
  const fixturePath = path.join(WS_A, "ui-compare-fixtures", filename);
  const setFiles = await c.send("DOM.setFileInputFiles", { nodeId, files: [fixturePath] });
  if (setFiles.error) throw new Error(`无法设置上传文件：${setFiles.error.message}`);
  return waitForValue(c, `(() => {
    const nodes = [...document.querySelectorAll(".react-flow__node")];
    return nodes.length > ${beforeCount} ? nodes.at(-1)?.getAttribute("data-id") : null;
  })()`, `上传 ${filename} 并创建画布节点`, 30000);
}
async function writeMarkdownDiagnostic(c) {
  const details = await evalValue(c, `(() => {
    const node = document.querySelector('.react-flow__node[data-id="c0a00000-0000-4000-8000-000000000002"]');
    const preview = node?.querySelector(".canvas-text-preview, .canvas-text-node-content") ?? node;
    return {
      nodeFound: !!node,
      nodeText: node?.innerText?.slice(0, 2000) ?? null,
      nodeHtml: preview?.outerHTML?.slice(0, 40000) ?? null,
      descendants: [...(preview?.querySelectorAll("h1,h2,p,pre,code,span,table,thead,tbody,tr,td,th") ?? [])]
        .slice(0, 120)
        .map((element) => ({ tag: element.tagName.toLowerCase(), className: element.className, style: element.getAttribute("style"), text: element.textContent?.slice(0, 160) })),
      resources: performance.getEntriesByType("resource")
        .filter((entry) => /preview\\.md|file/i.test(entry.name))
        .map((entry) => ({ name: entry.name, responseStatus: entry.responseStatus, transferSize: entry.transferSize })),
    };
  })()`);
  const dir = path.join(repo, ".probe/ui-compare/diag");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}-ws-markdown.json`);
  writeFileSync(file, JSON.stringify(details, null, 2));
  return file;
}
async function writeTableDiagnostic(c) {
  const details = await evalValue(c, `(() => {
    const node = [...document.querySelectorAll('[data-action-ui-id="canvas.table-node"]')].at(-1)?.closest(".react-flow__node");
    return {
      nodeHtml: node?.outerHTML?.slice(0, 40000) ?? null,
      controls: [...(node?.querySelectorAll('button,[role="button"],[data-action-ui-id],input,[contenteditable="true"]') ?? [])]
        .slice(0, 300)
        .map((element) => ({
          tag: element.tagName.toLowerCase(),
          action: element.getAttribute("data-action-ui-id"),
          role: element.getAttribute("role"),
          ariaLabel: element.getAttribute("aria-label"),
          title: element.getAttribute("title"),
          text: element.textContent?.trim().slice(0, 200),
        })),
    };
  })()`);
  const dir = path.join(repo, ".probe/ui-compare/diag");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}-ws-table-edit.json`);
  writeFileSync(file, JSON.stringify(details, null, 2));
  return file;
}
async function runInteractionScenario(c, scenario) {
  const ids = {
    markdown: "c0a00000-0000-4000-8000-000000000002",
    javascript: "c0a00000-0000-4000-8000-000000000003",
    sourceMarkdown: "c0a00000-0000-4000-8000-000000000004",
    imageA: "4db95676-40ee-49d0-8b2e-d010e25fd0e3",
    imageB: "af64baa9-6c18-4b9e-b7f5-eae6d889bc71",
  };
  if (scenario === "pdf") {
    const id = await uploadWorkspaceFile(c, "viewer.pdf");
    await c.waitForNetworkIdle(15000, 1600);
    await clickNodeAction(c, id, "canvas.file-node.preview-eye");
    const previewButton = `.react-flow__node[data-id="${id}"] [data-action-ui-id="canvas.file-node.view-card-from-preview"]`;
    if (!await waitForValue(c, `!!document.querySelector(${JSON.stringify(previewButton)})`, "PDF preview view", 2000).catch(() => false)) {
      await evalValue(c, `(() => { const e=document.querySelector(${JSON.stringify(`.react-flow__node[data-id="${id}"] [data-action-ui-id="canvas.file-node.preview-eye"]`)}); if(!e)return false; e.click(); return true; })()`);
    }
    try {
      await waitForValue(c, `(() => { const e=document.querySelector('.react-flow__node[data-id="${id}"] canvas'); if(!e||!e.width||!e.height)return false; try { const d=e.getContext("2d").getImageData(0,0,e.width,e.height).data; return d.some((x,i)=>i%4===3&&x>0); } catch { return false; } })()`, "PDF.js canvas render", 15000);
    } catch {
      const details = await evalValue(c, `(() => { const n=document.querySelector('.react-flow__node[data-id="${id}"]'); const resources=performance.getEntriesByType("resource").filter(x=>/viewer\\.pdf|fileUrl|asset-file/i.test(x.name)).map(x=>({name:x.name,duration:x.duration,responseStatus:x.responseStatus,transferSize:x.transferSize})); return {exists:!!n,text:n?.innerText?.slice(0,500),preview:!!n?.querySelector('[data-action-ui-id="canvas.file-node.view-card-from-preview"]'),canvases:[...(n?.querySelectorAll("canvas")||[])].map(x=>({width:x.width,height:x.height})),resources,body:document.body.innerText.slice(0,500)}; })()`);
      throw new Error(`PDF.js canvas render failed: ${JSON.stringify({ ...details, errors: c.errors().slice(-10) })}`);
    }
    return;
  }
  if (scenario === "markdown") {
    try {
      await waitForValue(c, `(() => { const n=document.querySelector('.react-flow__node[data-id="${ids.markdown}"]'); const code=n?.querySelector("pre > code.language-js"); return !!n&&!!n.querySelector(".ProseMirror h1")&&!!n.querySelector(".ProseMirror table tbody td")&&!!code; })()`, "Markdown fenced code and GFM table", 15000);
    } catch {
      const diagnostic = await writeMarkdownDiagnostic(c);
      throw new Error(`Markdown preview did not match the expected structure; DOM diagnostic saved to ${diagnostic}`);
    }
    console.log(`Markdown preview DOM diagnostic saved to ${await writeMarkdownDiagnostic(c)}`);
    return;
  }
  if (scenario === "video" || scenario === "audio") {
    const id = await uploadWorkspaceFile(c, scenario === "video" ? "viewer.mp4" : "viewer.wav");
    const tag = scenario;
    await clickNode(c, id);
    try {
      await waitForValue(c, `(() => { const n=document.querySelector('.react-flow__node[data-id="${id}"]'); const m=n?.querySelector("${tag}"); return m&&m.readyState>=1?true:false; })()`, `${scenario} metadata`);
    } catch {
      const details = await evalValue(c, `(() => { const n=document.querySelector('.react-flow__node[data-id="${id}"]'); const m=n?.querySelector("${tag}"); return {nodeClass:n?.className,text:n?.innerText?.slice(0,500),html:n?.outerHTML?.slice(0,3000),media:m&&{src:m.getAttribute("src"),currentSrc:m.currentSrc,readyState:m.readyState,networkState:m.networkState,error:m.error&&{code:m.error.code,message:m.error.message}},resources:performance.getEntriesByType("resource").filter(x=>/viewer\\.(mp4|wav)|asset/i.test(x.name)).map(x=>({name:x.name,status:x.responseStatus}))}; })()`);
      throw new Error(`${scenario} metadata failed: ${JSON.stringify(details)}`);
    }
    const playing = await evalValue(c, `(() => { const m=document.querySelector('.react-flow__node[data-id="${id}"] ${tag}'); return !!m&&!m.paused; })()`);
    const playAction = tag === "video" ? "canvas.video-player.toggle-play" : "canvas.audio.toggle-play";
    if (!playing) {
      if (tag === "video") {
        const muted = await evalValue(c, `document.querySelector('.react-flow__node[data-id="${id}"] video')?.muted`);
        if (!muted) await clickNodeAction(c, id, "canvas.video-player.toggle-mute");
        const storePlaying = await evalValue(c, `(() => { const label=document.querySelector('.react-flow__node[data-id="${id}"] [data-action-ui-id="canvas.video-player.toggle-play"]')?.getAttribute("aria-label") ?? ""; return /pause|暂停/i.test(label); })()`);
        if (storePlaying) await clickNodeAction(c, id, playAction);
      }
      await clickNodeAction(c, id, playAction);
    }
    try {
      await waitForValue(c, `(() => { const m=document.querySelector('.react-flow__node[data-id="${id}"] ${tag}'); return m&&!m.paused; })()`, `${scenario} playback`, 5000);
    } catch {
      const details = await evalValue(c, `(() => { const n=document.querySelector('.react-flow__node[data-id="${id}"]'); const m=n?.querySelector("${tag}"); const b=n?.querySelector('[data-action-ui-id="${playAction}"]'); return {html:n?.outerHTML?.slice(0,5000),paused:m?.paused,muted:m?.muted,readyState:m?.readyState,networkState:m?.networkState,error:m?.error&&{code:m.error.code,message:m.error.message},canPlayMp4:m?.canPlayType("video/mp4; codecs=avc1.42E01E"),playLabel:b?.getAttribute("aria-label")}; })()`);
      throw new Error(`${scenario} playback failed: ${JSON.stringify(details)}`);
    }
    await evalValue(c, `(() => { const m=document.querySelector('.react-flow__node[data-id="${id}"] ${tag}'); if(!m)return false; m.dataset.ovCompareSeek="0.4"; return true; })()`);
    const seekSelector = tag === "audio" ? 'svg[role="img"]' : 'div[class*="group/progress"]';
    const seekUi = async (progress = 0.4) => {
      const point = await evalValue(c, `(() => {
        const n=document.querySelector('.react-flow__node[data-id="${id}"]');
        const control=n?.querySelector(${JSON.stringify(seekSelector)});
        if(!control)return null;
        const r=control.getBoundingClientRect();
        return r.width>0&&r.height>0?{x:r.left+r.width*${progress},y:r.top+r.height/2}:null;
      })()`);
      if (!point) throw new Error(`${scenario} seek control is not visible`);
      await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
      await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
      await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
    };
    await seekUi();
    await waitForValue(c, `(() => { const m=document.querySelector('.react-flow__node[data-id="${id}"] ${tag}'); return m&&Math.abs(m.currentTime-0.4)<0.12; })()`, `${scenario} seek`);
    if (await evalValue(c, `(() => { const m=document.querySelector('.react-flow__node[data-id="${id}"] ${tag}'); return m&&!m.paused; })()`)) {
      await clickNodeAction(c, id, playAction);
    }
    await waitForValue(c, `(() => { const m=document.querySelector('.react-flow__node[data-id="${id}"] ${tag}'); return m&&m.paused; })()`, `${scenario} pause`);
    if (scenario === "audio") {
      await seekUi(0.6);
      await evalValue(c, `(() => { const m=document.querySelector('.react-flow__node[data-id="${id}"] ${tag}'); if(!m?.paused)return false; m.dataset.ovCompareSeek=String(m.currentTime); return true; })()`);
      const pausedSeekState = `(() => {
        const n=document.querySelector('.react-flow__node[data-id="${id}"]');
        const m=n?.querySelector("${tag}");
        const waveform=n?.querySelector('svg[role="img"]');
        const playhead=waveform?.querySelector('rect[width="2"]');
        const expected=Number(waveform?.getAttribute("width"))*(Number(m?.currentTime)/Number(m?.duration))-1;
        return {
          paused: m?.paused,
          currentTime: m?.currentTime,
          duration: m?.duration,
          waveformWidth: waveform?.getAttribute("width"),
          playheadX: playhead?.getAttribute("x"),
          expectedPlayheadX: expected,
        };
      })()`;
      const pausedSeekReady = `(() => {
        const state=${pausedSeekState};
        return state.paused&&Math.abs(state.currentTime-0.6)<0.03&&state.playheadX&&Math.abs(Number(state.playheadX)-state.expectedPlayheadX)<0.1;
      })()`;
      try {
        await waitForValue(c, pausedSeekReady, `${scenario} paused seek`);
      } catch {
        const details = await evalValue(c, pausedSeekState);
        throw new Error(`等待 ${scenario} paused seek 超时：${JSON.stringify(details)}`);
      }
      await sleep(300);
    }
    return;
  }
  if (scenario === "chat") {
    await clickUi(c, "message-input");
    await c.send("Input.insertText", { text: "UI compare interaction" });
    await key(c, "Enter", "Enter", 8);
    await c.send("Input.insertText", { text: "second line" });
    await key(c, "Enter", "Enter");
    await waitForValue(c, `(() => { const input=document.querySelector('[data-action-ui-id="message-input"]'); return document.body.innerText.includes("UI compare interaction") && !input?.innerText.includes("UI compare interaction"); })()`, "chat message submission", 10000);
    const sent = await c.waitForWebSocketFrame((frame) =>
      frame.direction === "sent" &&
      frame.payload.includes('"type":"message"') &&
      frame.payload.includes("UI compare interaction"),
    );
    const accepted = await c.waitForWebSocketFrame(
      (frame) => frame.direction === "received" && frame.payload.includes('"type":"message_accepted"'),
      sent.index,
    );
    const failed = await c.waitForWebSocketFrame(
      (frame) => frame.direction === "received" && frame.payload.includes('"type":"session_error"'),
      accepted.index,
    );
    await c.waitForWebSocketFrame(
      (frame) => frame.direction === "received" && frame.payload.includes('"type":"session_idle"'),
      failed.index,
    );
    await waitForValue(c, `!document.querySelector('[data-action-ui-id="message-stop-btn"], [role="status"][aria-label="生成中"]')`, "chat response completion", 90000);
    return;
  }
  if (scenario === "code-editor") {
    for (const id of [ids.javascript, ids.sourceMarkdown]) {
      await clickNode(c, id);
      await clickUi(c, "canvas-text-edit", true);
      await waitForValue(c, `!!document.querySelector(".cm-content")`, "CodeMirror source editor");
      await clickUi(c, "canvas-text-large-markdown-editor");
      const editorPoint = await waitForValue(c, `(() => { const e=document.querySelector(".cm-content"); if(!e)return null; const r=e.getBoundingClientRect(); return {x:r.x+Math.min(20,r.width/2),y:r.y+Math.min(12,r.height/2)}; })()`, "CodeMirror editor surface");
      await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: editorPoint.x, y: editorPoint.y, button: "left", clickCount: 1 });
      await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: editorPoint.x, y: editorPoint.y, button: "left", clickCount: 1 });
      await c.send("Input.insertText", { text: "\n// interaction edit" });
      await key(c, "f", "KeyF", 2);
      await waitForValue(c, `!!document.querySelector('[data-action-ui-id="canvas-text-find-input"]')`, "CodeMirror search");
      await c.send("Input.insertText", { text: "fixture" });
      await key(c, "Escape", "Escape");
      await key(c, "Escape", "Escape");
      await key(c, "z", "KeyZ", 2);
      const closed = await evalValue(c, `(() => { const b=[...document.querySelectorAll("button")].find(x=>/close|关闭|退出/i.test((x.getAttribute("aria-label")||"")+" "+(x.title||""))&&x.getBoundingClientRect().width); if(b){b.click();return true;} return false; })()`);
      if (!closed) await key(c, "Escape", "Escape");
      await waitForValue(c, `(() => { const e=document.querySelector(".canvas-text-source-editor-surface"); return !e||!e.getBoundingClientRect().width; })()`, "CodeMirror close", 8000);
    }
    return;
  }
  if (scenario === "table-edit") {
    await clickUi(c, "canvas.add-node");
    await clickUi(c, "canvas.menu-add-table");
    await waitForValue(c, `!!document.querySelector('[data-action-ui-id="canvas.table-node"]')`, "table node");
    console.log(`Table node DOM diagnostic saved to ${await writeTableDiagnostic(c)}`);
    await clickUi(c, "canvas.table-node", true);
    const fullscreen = await waitForValue(c, `(() => { const e=[...document.querySelectorAll('[data-canvas-chrome] button')].find(x=>/fullscreen|全屏|编辑/i.test((x.getAttribute("aria-label")||"")+" "+(x.title||"")+" "+x.textContent)); if(!e)return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`, "table fullscreen editor");
    await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: fullscreen.x, y: fullscreen.y, button: "left", clickCount: 1 });
    await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: fullscreen.x, y: fullscreen.y, button: "left", clickCount: 1 });
    await waitForValue(c, `!!document.querySelector('[role="dialog"] table')`, "table editor");
    const addRow = await waitForValue(c, `(() => { const e=[...document.querySelectorAll('[role="dialog"] button')].find(x=>/add row|添加行/i.test(x.textContent||"")); if(!e)return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`, "table add-row control");
    await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: addRow.x, y: addRow.y, button: "left", clickCount: 1 });
    await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: addRow.x, y: addRow.y, button: "left", clickCount: 1 });
    const cell = await waitForValue(c, `(() => { const e=document.querySelector('[role="dialog"] tbody tr td .cursor-text'); if(!e)return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`, "table text cell");
    await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: cell.x, y: cell.y, button: "left", clickCount: 1 });
    await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: cell.x, y: cell.y, button: "left", clickCount: 1 });
    await waitForValue(c, `!!document.activeElement?.matches('input,textarea,[contenteditable="true"]')`, "table cell editor", 5000);
    await c.send("Input.insertText", { text: "table interaction" });
    await key(c, "Tab", "Tab");
    await waitForValue(c, `!![...document.querySelectorAll('[role="dialog"] tbody td')].find(e=>(e.textContent||"").includes("table interaction"))`, "table cell edit");
    const filter = await evalValue(c, `(() => { const e=[...document.querySelectorAll('[role="dialog"] button')].find(x=>/filter|筛选/i.test((x.getAttribute("aria-label")||"")+" "+(x.title||"")+" "+x.textContent)); if(!e)return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
    if (filter) {
      await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: filter.x, y: filter.y, button: "left", clickCount: 1 });
      await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: filter.x, y: filter.y, button: "left", clickCount: 1 });
      await waitForValue(c, `!![...document.querySelectorAll("*")].find(e=>/Set filter conditions|设置筛选条件|筛选条件/.test(e.textContent||""))`, "table filter panel", 5000);
    }
    const close = await waitForValue(c, `(() => { const e=[...document.querySelectorAll('[role="dialog"] button')].find(x=>/close|关闭/i.test((x.getAttribute("aria-label")||"")+" "+(x.title||"")+" "+x.textContent)); if(!e)return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`, "table editor close button");
    await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: close.x, y: close.y, button: "left", clickCount: 1 });
    await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: close.x, y: close.y, button: "left", clickCount: 1 });
    await waitForValue(c, `!document.querySelector('[role="dialog"]')`, "table editor close");
    await sleep(1000);
    return;
  }
  if (scenario === "canvas-ops") {
    const first = await evalValue(c, `(() => { const e=document.querySelector('.react-flow__node[data-id="${ids.imageA}"]'); const r=e?.getBoundingClientRect(); return r?{x:r.x+r.width/2,y:r.y+r.height/2}:null; })()`);
    if (!first) throw new Error("画布节点不可见");
    await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: first.x, y: first.y, button: "left", clickCount: 1 });
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: first.x + 60, y: first.y + 40, button: "left", buttons: 1 });
    await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: first.x + 60, y: first.y + 40, button: "left" });
    await c.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: first.x, y: first.y, deltaY: -120, deltaX: 0 });
    const handles = await evalValue(c, `(() => { const a=document.querySelector('.react-flow__node[data-id="${ids.imageA}"] .react-flow__handle-right'); const b=document.querySelector('.react-flow__node[data-id="${ids.imageB}"] .react-flow__handle-left'); if(!a||!b)return null; const x=a.getBoundingClientRect(),y=b.getBoundingClientRect(); return {a:{x:x.x+x.width/2,y:x.y+y.height/2},b:{x:y.x+y.width/2,y:y.y+y.height/2}}; })()`);
    if (handles) {
      await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: handles.a.x, y: handles.a.y, button: "left" });
      await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: handles.b.x, y: handles.b.y, button: "left", buttons: 1 });
      await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: handles.b.x, y: handles.b.y, button: "left" });
    }
    await key(c, "z", "KeyZ", 2);
    await key(c, "z", "KeyZ", 10);
  }
}

function comparisonProcessPids(userDataDir) {
  try {
    return readdirSync("/proc")
      .filter((entry) => /^\d+$/.test(entry))
      .map(Number)
      .filter((pid) => {
        if (pid === process.pid) return false;
        try {
          return readFileSync(`/proc/${pid}/environ`).includes(Buffer.from(`OV_USER_DATA_DIR=${userDataDir}\0`));
        } catch {
          return false;
        }
      });
  } catch {
    return [];
  }
}

async function stopComparisonProcesses(child, userDataDir) {
  const signal = (name) => {
    try {
      process.kill(-child.pid, name);
    } catch {}
    for (const pid of comparisonProcessPids(userDataDir)) {
      try {
        process.kill(pid, name);
      } catch {}
    }
  };
  signal("SIGTERM");
  await sleep(3000);
  signal("SIGKILL");
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
  // 仓库里只带 ws-a；本机有单独的 ws-b 就用它，没有就复制一份 ws-a
  const wsBFixture = existsSync(path.join(FIXTURE, "ws-b")) ? path.join(FIXTURE, "ws-b") : path.join(FIXTURE, "ws-a");
  cpSync(path.join(FIXTURE, "ws-a"), WS_A, { recursive: true });
  cpSync(wsBFixture, WS_B, { recursive: true });
  generateFixtures(WS_A);
  generateFixtures(WS_B);
  stabilizeFixtureTimes(WS_A);
  stabilizeFixtureTimes(WS_B);
  const env = {
    ...process.env,
    OV_UI: mode,
    OV_DEV_HIDDEN_WINDOW: "1",
    OV_USER_DATA_DIR: `${ROOT}/ud`,
    HILO_DATA_DIR: `${ROOT}/data`,
    OV_SKIP_LEGACY_MIGRATION: "1",
    OV_CONFIG_PATH: path.join(FIXTURE, "ui-compare-config.json"),
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
    await waitForSkillProfile();
    for (let i = 0; i < 3; i++) {
      await c.send("Runtime.evaluate", { expression: DISMISS_STARTUP });
      await sleep(800);
    }
    for (const p of PAGES) {
      console.log(`  ${mode} ${p.id}`);
      c.clearErrors();
      let randomTraceScriptIdentifier;
      if (process.env.OV_RANDOM_TRACE === "1" && p.id === "ws-pdf") {
        const script = await c.send("Page.addScriptToEvaluateOnNewDocument", { source: RANDOM_TRACE(p.url) });
        randomTraceScriptIdentifier = script.result?.identifier;
      }
      const documentURL = `app://.${p.url}`;
      c.beginNetworkCapture(documentURL);
      await c.send("Runtime.evaluate", { expression: `location.assign(${JSON.stringify(documentURL)})` });
      await sleep(6000);
      await c.send("Runtime.evaluate", { expression: `(()=>{const s=document.createElement('style');s.textContent=${JSON.stringify(NO_ANIMATION)};document.head.appendChild(s)})()` });
      // 引导提示（快速切换布局模式等）是延时弹出的，多点几轮，直到连续一轮什么都没点到
      for (let i = 0; i < 5; i++) {
        const r = await c.send("Runtime.evaluate", { expression: DISMISS_STARTUP, returnByValue: true });
        await c.send("Runtime.evaluate", { expression: SETTLE, awaitPromise: true });
        await sleep(1500);
        if (!r.result?.result?.value && i >= 1) break;
      }
      await sleep(1500);
      // 鼠标挪到左上角：否则系统鼠标指针停在哪张卡片上，哪张就是悬停样式
      let restoreDateNow = false;
      for (const label of p.tabs ?? []) {
        if (p.id === "global-search" && typeof label === "object" && label.event === "hilo:open-global-search") {
          const openedAt = await c.send("Runtime.evaluate", {
            expression: `(() => {
              const times = [];
              const visit = (value) => {
                if (!value || typeof value !== "object") return;
                const openedAt = Number(value.openedAt);
                if (Number.isFinite(openedAt)) times.push(openedAt);
                for (const child of Object.values(value)) visit(child);
              };
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key?.includes("recentWorkspaces")) continue;
                try { visit(JSON.parse(localStorage.getItem(key))); } catch {}
              }
              return times.length ? Math.max(...times) : null;
            })()`,
            returnByValue: true,
          });
          const latestOpenedAt = openedAt.result?.result?.value;
          if (Number.isFinite(latestOpenedAt)) {
            await c.send("Runtime.evaluate", {
              expression: `window.__ovCompareOriginalDateNow ??= Date.now; Date.now = () => ${latestOpenedAt + GLOBAL_SEARCH_CAPTURE_AGE_MS};`,
            });
            restoreDateNow = true;
          }
        }
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
        if (!r.result?.result?.value) throw new Error(`${p.id}：界面上找不到「${labelName}」，页面没切过去 ${c.errors().slice(-3).join(" | ")}`);
        await sleep(1500);
      }
      if (p.scenario) await runInteractionScenario(c, p.scenario);
      if (p.scenario === "pdf") await c.waitForNetworkIdle(15000, 3000);
      if (p.waitForRequests) await c.waitForRequests(p.waitForRequests);
      if (p.id === "ws-b") await refreshWorkspaceRecommendations(c);
      if (p.id === "skills" || p.id === "skill-community") {
        await waitForValue(c, `(() => {
          const root = document.querySelector('[data-action-ui-id="skills-scroll-container"]') ?? document;
          const loading = [...root.querySelectorAll("p")].some((element) => /^(?:Loading market skills|加载市场 Skill 中)/i.test(element.textContent.trim()));
          return !loading &&
            !!root.querySelector('[data-action-ui-id="market-community-featured"]') &&
            !!root.querySelector('[data-action-ui-id="other-skill-item"]');
        })()`, "skills 社区列表加载完成");
      }
      if (p.id === "skills") await waitForInstalledSkillsReady(c);
      if (p.id === "skills-mine") {
        await waitForValue(c, `(() => {
          const root = document.querySelector('[data-layout-slot="skills-mine-content"]');
          return !!root?.querySelector('[data-action-ui-id="skills-mine-item"]');
        })()`, "我的 Skill 列表加载完成");
      }
      if (p.id === "ws-chat-input") await waitForRetainedWorkspaceStage(c, p.id);
      if (p.id === "project-created" || p.id === "project-assets") {
        await waitForValue(c, `(() => {
          try {
            const tabs = JSON.parse(localStorage.getItem("hilo:storage:global.workspaceSessionTabs") ?? "{}")[${JSON.stringify(WS_A)}];
            return !!tabs?.focusedSessionId && tabs.openedTabIds?.includes(tabs.focusedSessionId);
          } catch {
            return false;
          }
        })()`, "ws-a 会话焦点持久化");
      }
      await sleep(p.persistWaitMs ?? 1200);
      await c.waitForNetworkIdle();
      if (p.id === "ws-text-node") {
        const point = await waitForValue(c, `(() => {
          const pane = document.querySelector(".react-flow__pane");
          if (!pane) return null;
          const bounds = pane.getBoundingClientRect();
          for (const [xRatio, yRatio] of [[0.96, 0.12], [0.95, 0.55], [0.06, 0.12], [0.06, 0.55], [0.85, 0.85], [0.15, 0.85]]) {
            const x = bounds.left + bounds.width * xRatio;
            const y = bounds.top + bounds.height * yRatio;
            const target = document.elementFromPoint(x, y);
            if (target?.closest(".react-flow__pane") &&
              !target.closest(".react-flow__node") &&
              !target.closest(".react-flow__controls") &&
              !target.closest("[data-canvas-chrome]")) return { x, y };
          }
          return null;
        })()`, "画布空白区域");
        await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
        await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left" });
        await waitForValue(c, `document.querySelectorAll(".react-flow__node.selected").length === 0`, "画布节点取消选择");
        await waitForStableCanvasGeometry(c, p.id);
      }
      const { dom, state } = await captureStablePageState(c);
      const buf = await stableShot(c);
      await c.waitForNetworkIdle();
      if (randomTraceScriptIdentifier) {
        const captured = await c.send("Runtime.evaluate", {
          expression: "(() => { const trace = window.__ovRandomTrace ?? null; window.__ovRandomTraceRestore?.(); return trace; })()",
          returnByValue: true,
        });
        const trace = captured.result?.result?.value;
        if (!trace) throw new Error("OV_RANDOM_TRACE 已启用，但 ws-pdf 页面没有 RNG trace");
        writeFileSync(path.join(outDir, `${p.id}.${mode}.random-trace.json`), JSON.stringify(trace, null, 2));
        await c.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: randomTraceScriptIdentifier });
      }
      const net = c.endNetworkCapture();
      if (process.env.CAPTURE_TRACE === "1" && ["project-created", "ws-canvas-ops", "ws-pdf"].includes(p.id)) {
        writeFileSync(path.join(outDir, `${p.id}.${mode}.trace.json`), JSON.stringify(c.networkTrace(), null, 2));
      }
      if (p.scenario === "chat" && !JSON.stringify({ requests: net.nonGetRequests, frames: net.wsSent }).includes("UI compare interaction")) {
        throw new Error("chat input scenario did not emit the expected gateway request/frame");
      }
      if (restoreDateNow) {
        await c.send("Runtime.evaluate", { expression: "if (window.__ovCompareOriginalDateNow) Date.now = window.__ovCompareOriginalDateNow; delete window.__ovCompareOriginalDateNow;" });
      }
      const file = path.join(outDir, `${p.id}.${mode}.png`);
      writeFileSync(file, buf);
      results[p.id] = { file, errors: [...new Set(c.errors())], net, dom, state };
    }
    c.close();
  } finally {
    await stopComparisonProcesses(child, env.OV_USER_DATA_DIR);
  }
  return results;
}

async function diff(a, b, out, nonAAOut) {
  const [ia, ib] = await Promise.all([rawOf(a), rawOf(b)]);
  if (ia.info.width !== ib.info.width || ia.info.height !== ib.info.height) {
    return { ratio: 1, changed: null, nonAARatio: 1, nonAAChanged: null, pixelmatchNonAA: null, note: "尺寸不同" };
  }
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
  const pixelmatchMask = Buffer.alloc(px * 4);
  const pixelmatchNonAA = pixelmatch(ia.data, ib.data, pixelmatchMask, ia.info.width, ia.info.height, {
    includeAA: false,
    threshold: 0,
    diffColor: [255, 0, 0],
    diffColorAlt: [255, 0, 0],
    aaColor: [255, 255, 0],
  });
  const nonAAMask = Buffer.alloc(px * 4);
  let nonAAChanged = 0;
  for (let i = 0; i < px; i++) {
    const o = i * 4;
    const delta = Math.abs(ia.data[o] - ib.data[o]) + Math.abs(ia.data[o + 1] - ib.data[o + 1]) + Math.abs(ia.data[o + 2] - ib.data[o + 2]);
    const isPixelmatchNonAA = pixelmatchMask[o] === 255 && pixelmatchMask[o + 1] === 0 && pixelmatchMask[o + 2] === 0;
    if (delta > TOL && isPixelmatchNonAA) {
      nonAAChanged++;
      nonAAMask[o] = 255;
      nonAAMask[o + 3] = 255;
    }
  }
  await sharp(nonAAMask, { raw: { width: ia.info.width, height: ia.info.height, channels: 4 } }).png().toFile(nonAAOut);
  return { ratio: changed / px, changed, nonAARatio: nonAAChanged / px, nonAAChanged, pixelmatchNonAA };
}

if (!existsSync(FIXTURE)) throw new Error(`缺少测试数据 ${FIXTURE}`);
// 基线：每屏一张 <屏>.png，报错记在 errors.json
function readGolden() {
  const errorsFile = path.join(GOLDEN, "errors.json");
  const errors = existsSync(errorsFile) ? JSON.parse(readFileSync(errorsFile, "utf8")) : {};
  const channels = ["net", "dom", "state"];
  const missing = PAGES.filter((p) =>
    !existsSync(path.join(GOLDEN, `${p.id}.png`)) ||
    channels.some((channel) => !existsSync(path.join(GOLDEN, `${p.id}.${channel}.json`))),
  ).map((p) => p.id);
  if (missing.length) throw new Error(`基线里缺这些屏：${missing.join(",")}，先跑 --record 录一份`);
  return Object.fromEntries(PAGES.map((p) => [p.id, {
    file: path.join(GOLDEN, `${p.id}.png`),
    errors: errors[p.id] ?? [],
    net: JSON.parse(readFileSync(path.join(GOLDEN, `${p.id}.net.json`), "utf8")),
    dom: JSON.parse(readFileSync(path.join(GOLDEN, `${p.id}.dom.json`), "utf8")),
    state: JSON.parse(readFileSync(path.join(GOLDEN, `${p.id}.state.json`), "utf8")),
  }]));
}
function writeGolden(results) {
  mkdirSync(GOLDEN, { recursive: true });
  const errorsFile = path.join(GOLDEN, "errors.json");
  const errors = existsSync(errorsFile) ? JSON.parse(readFileSync(errorsFile, "utf8")) : {};
  for (const { id } of DISABLED_PAGES) {
    delete errors[id];
    for (const extension of [".png", ".net.json", ".dom.json", ".state.json"]) {
      rmSync(path.join(GOLDEN, `${id}${extension}`), { force: true });
    }
  }
  for (const [id, r] of Object.entries(results)) {
    copyFileSync(r.file, path.join(GOLDEN, `${id}.png`));
    errors[id] = r.errors;
    for (const channel of ["net", "dom", "state"]) {
      writeFileSync(path.join(GOLDEN, `${id}.${channel}.json`), JSON.stringify(r[channel], null, 2));
    }
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
const pages = [];
let failed = false;
for (const p of PAGES) {
  const d = await diff(
    base[p.id].file,
    test[p.id].file,
    path.join(outDir, `${p.id}.diff.png`),
    path.join(outDir, `${p.id}.non-aa.diff.png`),
  );
  const newErrors = test[p.id].errors.filter((e) => !base[p.id].errors.includes(e));
  const channelDiffs = {
    netDiff: jsonDiff(comparableNetwork(base[p.id].net), comparableNetwork(test[p.id].net)),
    domDiff: jsonDiff(base[p.id].dom, test[p.id].dom),
    stateDiff: jsonDiff(base[p.id].state, test[p.id].state),
  };
  const pixelDiff = d.ratio !== 0;
  const pixelDiffNonAA = d.nonAARatio !== 0;
  const pageFailed = pixelDiffNonAA || newErrors.length > 0 || Object.values(channelDiffs).some((items) => items.length > 0);
  failed ||= pageFailed;
  pages.push({
    page: p.id,
    diffPct: +(d.ratio * 100).toFixed(3),
    diffPixels: d.changed,
    diffPctNonAA: +(d.nonAARatio * 100).toFixed(8),
    diffPixelsNonAA: d.nonAAChanged,
    pixelmatchNonAA: d.pixelmatchNonAA,
    pixelDiff,
    pixelDiffNonAA,
    note: d.note,
    newErrors,
    baseErrors: base[p.id].errors.length,
    ...channelDiffs,
  });
  for (const channel of ["net", "dom", "state"]) {
    writeFileSync(path.join(outDir, `${p.id}.${testMode}.${channel}.json`), JSON.stringify(test[p.id][channel], null, 2));
  }
  console.log(`${p.id.padEnd(18)} 像素原始/非AA ${(d.ratio * 100).toFixed(3).padStart(7)}%/${(d.nonAARatio * 100).toFixed(6)}% (${d.changed ?? "?"}/${d.nonAAChanged ?? "?"})  新增报错 ${newErrors.length}  网络/DOM/状态 ${channelDiffs.netDiff.length}/${channelDiffs.domDiff.length}/${channelDiffs.stateDiff.length}${d.note ? "  " + d.note : ""}`);
  for (const e of newErrors.slice(0, 3)) console.log("    " + e);
}
const report = { netVolatile: NET_VOLATILE, pages };
writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
process.exit(failed ? 1 : 0);
