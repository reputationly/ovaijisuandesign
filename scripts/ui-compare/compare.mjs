// 逐屏对比：同一份测试数据起桌面应用，访问同一组页面、截图，和基线逐像素比较，并收集控制台报错。
// 基线守的是当前认可的界面。有意改了某几页之后，门禁会在这几页上报差异；确认没有波及别的页，再重录这几页。
//
//   node scripts/ui-compare/compare.mjs [基准=golden] [对比模式=recovered]
//   ONLY=home,skills GOLDEN="$HOME/ov-golden/.probe/ui-golden" node scripts/ui-compare/compare.mjs --record
//
// 基准写 golden 时读录好的基线截图（默认 .probe/ui-golden/，可用 GOLDEN=目录 指定），不再起第二个应用；
// 写成别的就是 OV_UI 的取值（recovered / ours），两种界面各起一次对比。ONLY 只跑几屏时，录基线也只更新这几屏，其它屏的基线保留。
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
// 第 307 轮（用户要求）：录基线时必须**显式**指定模式。
// 之前的默认值是 recovered —— 也就是拿我们自己的界面当基线，
// 录出来的 png 与 recovered 产物 md5 完全相同，对比得到虚假的 0.000%。
// 现在不写模式直接报错退出，避免再产生自比基线。
const RECORD_MODE = RECORD ? process.argv[3] : undefined;
if (RECORD && RECORD_MODE !== "reference" && RECORD_MODE !== "recovered") {
  console.error("✗ --record 必须显式指定模式：--record reference（原版界面基线）或 --record recovered");
  console.error("  不指定会静默使用 recovered，录出的基线是与自己比较，毫无意义。");
  process.exit(2);
}
const [baseMode = "golden", testMode = "recovered"] = RECORD ? ["golden", RECORD_MODE] : process.argv.slice(2);
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
/**
 * 传输层字段（状态码/失败原因）只用于诊断，**不参与比较**。
 * 已有基线（4.0.3）是在没有这些字段时录的，若纳入比较会整片失配。
 */
const TRANSPORT_FIELDS = ["status", "failure"];
function withoutTransport(request) {
  const copy = { ...request };
  for (const field of TRANSPORT_FIELDS) delete copy[field];
  return copy;
}

function snapshotNetwork(requests, frames) {
  const normalizedRequests = requests.map((request) => normalizeValue(request));
  const getRequests = [...new Set(
    normalizedRequests
      .filter((request) => request.method === "GET")
      .map((request) => JSON.stringify(withoutTransport(request))),
  )].sort().map((request) => JSON.parse(request));
  return {
    getRequests,
    nonGetRequests: normalizedRequests.filter((request) => request.method !== "GET"),
    // 诊断用：所有拿到状态码/失败的请求（不参与比较）
    transport: normalizedRequests
      .filter((request) => request.status !== undefined || request.failure !== undefined)
      .map((request) => ({
        method: request.method,
        path: request.path,
        ...(request.status !== undefined ? { status: request.status } : {}),
        ...(request.failure !== undefined ? { failure: request.failure } : {}),
        ...(request.bodyHead !== undefined ? { bodyHead: request.bodyHead } : {}),
      })),
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
    getRequests: network.getRequests
      .map(withoutTransport)
      .filter((request) => !NET_VOLATILE.some((prefix) => request.path.startsWith(prefix))),
    nonGetRequests: [...nonGetGroups.keys()]
      .sort()
      .flatMap((key) => nonGetGroups.get(key))
      .map(withoutTransport),
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
  // 第 337 轮：参照 4.0.0 的这个菜单里**没有 workspace.view-mode.chat-only**
    // （该 id 在 bundle 里存在，但菜单里点不到；延长等待、换点击方式都试过）。
    // 所以这一屏改成「打开菜单就截图」—— 直接对比菜单内容，正是「布局菜单变了」要查的东西。
  { id: "ws-layout", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`, tabs: [{ ui: "workspace.view-mode-menu.stage", press: "Enter" }, { wait: 1400 }] },
  // 会真的创建一个项目（数据目录每种模式都会重建），所以放最后，免得影响别的屏
  { id: "project-created", url: "/projects", tabs: ["新建项目", "新建本地项目", { type: "对比用项目" }, "创建项目", { wait: 4000 }] },
  { id: "project-assets", url: "/projects", tabs: ["新建项目", "新建本地项目", { type: "对比用资产项目" }, "创建项目", { wait: 4000 }, "项目资产", { untilSelector: '[data-action-ui-id="local-assets.panel"]' }, { wait: 2000 }], persistWaitMs: 3000 },
];
// 只跑指定几屏：ONLY=home,skills-mine node scripts/ui-compare/compare.mjs
const ONLY = process.env.ONLY?.split(",").filter(Boolean);
const V3_PAGES = [
  { id: "ws-a-v3", url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}` },
  { id: "ws-b-v3", url: `/workspace?workspaceId=${encodeURIComponent(WS_B)}` },
  // 第 226 轮：v3 的**资源视图**（NativeWorkbenchHost 分支）。
  // 它由 localStorage 的 `hilo:workspace-resource-view:<ws>` 决定，
  // 而这条路径正是之前占位值最密集的地方（StructureDirectory / facilities）。
  {
    id: "ws-a-v3-resource",
    url: `/workspace?workspaceId=${encodeURIComponent(WS_A)}`,
    seedStorage: { [`hilo:workspace-resource-view:${WS_A}`]: "true" },
    waitForUi: "v3-resource-view",
  },
];
const ARCH_PAGES = process.env.HILO_PROJECT_ARCHITECTURE === "resource_v3"
  ? [...ALL_PAGES, ...V3_PAGES]
  : ALL_PAGES;
const PAGES = (ONLY ? ARCH_PAGES.filter((p) => ONLY.includes(p.id)) : ARCH_PAGES)
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
/** 已登记的有意差异（scripts/ui-compare/intentional.json）。 */
const INTENTIONAL = (() => {
  try { return JSON.parse(readFileSync(path.join("scripts/ui-compare/intentional.json"), "utf8")); }
  catch { return { textReplacements: [], excludedSelectors: [] }; }
})();
/** 把登记过的文本在**参照截图**里替换成我们的措辞，剩下的差异才算回归。 */
const MASK_INTENTIONAL = `(() => {
  const pairs = ${JSON.stringify((INTENTIONAL.textReplacements ?? []).map((r) => [r.from, r.to]))};
  if (!pairs.length) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    for (const [from, to] of pairs) if (node.nodeValue.includes(from)) node.nodeValue = node.nodeValue.split(from).join(to);
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
  // 第 2037 轮：字体就绪 + 把仍在运行的 CSS 动画/过渡推到终态。
  // 为什么必须做：渲染进程被隐藏时节流会让动画**冻在中途**，
  // 此时 stableShot 的"连续两张一致"会成立 —— 但一致的是被冻住的中间帧。
  // changelog / workflows 那次整片主内容区的差异（DOM 相同、像素整块不同）正是这个形态。
  // 第 2039 轮：等首页卡片里的 <video> 达到 HAVE_CURRENT_DATA。
  // 为什么：卡片先挂海报 <img>（showcase-assets），视频 readyState 够了就把海报换掉；
  // 采集时还剩几张海报完全取决于视频就绪时序 → 实测 0.035~0.054pp 的像素抖动。
  // 等全部视频 readyState>=2 再暂停在 0 秒，采集状态才确定。
  try {
    const vids = Array.from(document.querySelectorAll("article.home-media-showcase-card video"));
    if (vids.length) {
      const deadline = performance.now() + 8000;
      while (vids.some((v) => v.readyState < 2) && performance.now() < deadline) {
        await new Promise((r) => setTimeout(r, 50));
      }
      for (const v of vids) { try { v.pause(); if (v.readyState >= 2) v.currentTime = 0; } catch {} }
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
  } catch {}
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch {}
  for (let round = 0; round < 3; round += 1) {
    const running = (document.getAnimations ? document.getAnimations() : [])
      .filter((a) => a.playState === "running");
    if (running.length === 0) break;
    for (const a of running) { try { a.finish(); } catch { try { a.cancel(); } catch {} } }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }
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
// 第 323 轮（验收区域拆分）：首页卡片的封面两边条件不对等 ——
// 参照从 CDN 取（被上面两条挡掉，四张卡片都显示占位图，实测 0 次请求），
// 我们自带走本地演示封面（实测 18 次 /api/v1/home/showcase-assets/*）。
// 这一项已登记为有意差异，但它在 home 屏占了 8.39 个百分点、约该屏全部差异的 90%。
//
// **试过用 Network.setBlockedURLs 挡掉，不生效**：三种模式都试了
//   "*/api/v1/home/showcase-assets/*" / "*showcase-assets*" / "*127.0.0.1*/api/v1/home/showcase-assets/*"
// 请求数和像素都没变。**原因未查明** —— 不能断言「同源不受影响」：
// 页面跑在 app:// 下，对它来说 http://127.0.0.1 本来就是跨源。下一步应改用 CDP Fetch 拦截
//（Fetch.enable + Fetch.failRequest），或在拦截不住时先列出所有调试目标，查清请求是从哪个目标发出的。
// 要对齐只能从「让两边都取不到封面」入手（例如不给门禁夹具提供这些资源），
// 或者接受这个差异并登记。当前保持原状，不做无效改动。
/**
 * 有意差异遮罩（第 324 轮，验收要求 B）。
 *
 * 每个条目都对应 docs/intentional-differences.md 里登记过的一条差异。
 * **只遮登记过的元素**，位置从 DOM 的 data-action-ui-id 取，不写死坐标。
 * 两边各自取位置、取**并集**一起遮 —— 只按一边遮，另一边会露出残留。
 *
 * 报告里每屏都会输出「被遮掉的面积占比」，面积变大能一眼看出来，
 * 防止有人悄悄扩大遮罩来压低数字。
 */
/**
 * 每屏残差预算（第 327 轮）。
 *
 * 像素对比只对已登记的有意差异做遮罩，剩下的残差不追求压到 0 —— 它主要是
 * 遮罩消不掉的布局位移，以及尚未还原的功能差异。这里把它们固定成预算：
 *   · 超出预算 + tolerance 个百分点 → **失败**（说明出了新问题）
 *   · 低于预算 → 提示更新预算（**只降不升**）
 */
const RESIDUAL_BUDGET = (() => {
  try {
    return JSON.parse(readFileSync(path.join(repo, "scripts/ui-compare/residual-budget.json"), "utf8"));
  } catch {
    return { screens: {}, _tolerance: 0.02 };
  }
})();
const BUDGET_TOLERANCE = RESIDUAL_BUDGET._tolerance ?? 0.02;

/**
 * 「允许的差异」登记表（第 344 轮，验收方案 B 加强版）。
 *
 * 拿参照基线比时，按位置逐项的 JSON diff 必然有差异（请求顺序、query、品牌文案），
 * 用它判失败等于永远红；但整体降级成「只出报告」又会丢掉真信号。
 * 所以判失败改成**按集合比**，本表登记过的差异放行，没登记的一律失败。
 */
const EXPECTED_DIFFS = (() => {
  try {
    return JSON.parse(readFileSync(path.join(repo, "scripts/ui-compare/expected-diffs.json"), "utf8"));
  } catch {
    return {};
  }
})();

/** 某屏允许的差异 = 全局 "*" + 该屏自己的条目（数组取并集）。 */
function allowedFor(pageId, kind, side) {
  const out = new Set();
  for (const key of ["*", pageId]) {
    const e = EXPECTED_DIFFS[key];
    if (e?.wildcard) return { wildcard: true, set: out };
    for (const v of e?.[kind]?.[side] ?? []) out.add(v);
  }
  return { wildcard: false, set: out };
}

/** 归一化路径里的 uuid / 任务 id / 端口，避免每次不同。 */
const normPath = (p) =>
  String(p)
    .split("?")[0]
    .replace(/\/[0-9a-f]{32}(?=\/|$)/gi, "/<id>")
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi, "/<id>")
    .replace(/\/gen_task_\d+/g, "/<task>");

/** data-action-ui-id 集合。 */
function domIdSet(dom) {
  const s = new Set();
  const walk = (n) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) { for (const x of n) walk(x); return; }
    const attrs = n.attributes;
    if (attrs && typeof attrs === "object" && typeof attrs["data-action-ui-id"] === "string") {
      s.add(attrs["data-action-ui-id"]);
    }
    for (const v of Object.values(n)) if (v && typeof v === "object") walk(v);
  };
  walk(dom);
  return s;
}

/** `METHOD /path`（query 去掉、id 归一化）集合。 */
function netPathSet(net) {
  const s = new Set();
  for (const key of ["getRequests", "nonGetRequests"]) {
    for (const r of net?.[key] ?? []) {
      if (r.method === "OPTIONS") continue;
      s.add(`${r.method} ${normPath(r.path)}`);
    }
  }
  return s;
}

/** wsSent 里 payload.type 的集合。 */
function wsTypeSet(net) {
  const s = new Set();
  for (const f of net?.wsSent ?? []) {
    try {
      const o = JSON.parse(f.payload ?? "{}");
      if (typeof o?.type === "string") s.add(o.type);
    } catch { /* 非 JSON 帧忽略 */ }
  }
  return s;
}

/** 集合差里**没被登记**的那部分。 */
function unallowed(diffSet, pageId, kind, side) {
  const { wildcard, set } = allowedFor(pageId, kind, side);
  if (wildcard) return [];
  // 支持右端通配：条目以 * 结尾时按前缀匹配（路径里带内容哈希的情况）
  const hit = (x) => {
    if (set.has(x)) return true;
    for (const pat of set) if (pat.endsWith("*") && x.startsWith(pat.slice(0, -1))) return true;
    return false;
  };
  return [...diffSet].filter((x) => !hit(x)).sort();
}

const MASK_TARGETS = [
  // 一.1 品牌：侧栏品牌名（参照 aria-label="MiniMax Design"）与首页大标题 logo。
  // **两边都有同一个 data-action-ui-id**，所以直接按 id 遮，不给产品加新 id
  //（参照里没有的 id 加到我方，本身就会制造一处新的 DOM 差异）。
  // 用**行容器**而不是里面的 span：品牌差异体现在整行（图标+文字+间距），只遮 span 盖不住。
  { selector: '[data-action-ui-id="home-sidebar.brand-row"]', why: "intentional-differences 一.1 品牌" },
  { selector: '[data-action-ui-id="home.wink-logo"]', why: "intentional-differences 一.1 品牌标题" },
  // 一.3 移除 ComfyUI：整行导航
  { selector: '[data-action-ui-id="home-sidebar-nav-workflows"]', why: "intentional-differences 一.3 移除 ComfyUI" },
  { selector: '[data-action-ui-id="home-sidebar.workflows-release-badge"]', why: "intentional-differences 一.3 移除 ComfyUI" },
  // 六、范围排除：内置浏览器。参照有「画布 / 浏览器」切换（19 屏），我们不做浏览器，
  // 这两个 id 只存在于参照侧 —— 遮罩取并集，所以能遮掉。
  { selector: '[data-action-ui-id="workspace.switch-to-browser"]', why: "intentional-differences 六 内置浏览器（范围排除）" },
  { selector: '[data-action-ui-id="workspace.switch-to-canvas"]', why: "intentional-differences 六 内置浏览器（范围排除）" },
  // 一.2 无账号体系：参照左下角是用户头像，我们用连接状态替代。
  // 只登记参照侧的 id —— 两边取并集，位置相同会把我们的 pill 一起盖掉。
  { selector: '[data-action-ui-id="sidebar.user-avatar"]', why: "intentional-differences 一.2 无账号体系" },
];
// 注：`home-composer-guide-design`（Design 使用指南）是否作为品牌类差异遮掉，等定。
// 那一条我方没有对应元素，遮它是「承认我们不做这个链接」，属于决策而非修 bug。
// 说明：品牌 logo／标题在参照 DOM 里**没有稳定的 data-action-ui-id**（只有内联文本），
// 按验收约束「不许手写坐标」，这里不遮，作为已登记残差在 docs 里说明。

/**
 * Fetch 域拦截的路径（第 325 轮）。
 *
 * 为什么不用 Network.setBlockedURLs：实测三种模式都拦不住首页封面
 * （路径模式试过 3 种：带 /api/v1 前缀的、只含 showcase-assets 的、带 127.0.0.1 的），
 * 请求数始终 18。原因未查明 —— 页面跑在 app:// 下，http://127.0.0.1 对它属于跨源，
 * 但这不足以解释 setBlockedURLs 失效。先用 Fetch 域在请求阶段拦，它比 setBlockedURLs 更底层。
 *
 * 注意：注释里不要写带星号的 URL 模式，`*斜杠` 会提前闭合块注释（这个坑踩过一次）。
 */
const BLOCKED_URL_PATTERNS = [/\/api\/v1\/home\/showcase-assets\//];

const BLOCKED_URLS = ["*cdn.hailuoai.com*", "*cdn.hailuoai.video*"];
const SEEDED_DATE = `(() => {
  const NativeDate = Date;
  const epoch = NativeDate.UTC(2026, 9, 12, 4, 0, 0);
  const elapsed = performance.now.bind(performance);
  const now = () => Math.floor(epoch + elapsed());
  const DateShim = new Proxy(NativeDate, {
    apply() {
      return new NativeDate(now()).toString();
    },
    construct(target, args, newTarget) {
      return Reflect.construct(target, args.length ? args : [now()], newTarget);
    },
  });
  Object.defineProperty(DateShim, "now", { configurable: true, value: now });
  globalThis.Date = DateShim;
})();`;
// 推荐卡片用独立随机子流，避免 effect 顺序影响卡片，同时保留应用随机流的消耗顺序。
const SEEDED_RANDOM = `(() => {
  const seed = 0x2545f491;
  let s = seed;
  let recommendationS = seed;
  let seededRecommendations = false;
  let recommendationBatchPendingSeed = false;
  const resetForRecommendations = (node) => {
    if (seededRecommendations || !(node instanceof Element)) return;
    const sections = [];
    if (node.matches('[data-action-ui-id="chat-empty-recommendations"]')) sections.push(node);
    sections.push(...node.querySelectorAll('[data-action-ui-id="chat-empty-recommendations"]'));
    if (!sections.length) return;
    seededRecommendations = true;
    window.__ovRandomTrace?.resets?.push({ afterN: window.__ovRandomTrace.count });
    s = seed;
    recommendationS = seed;
  };
  const filter = Array.prototype.filter;
  Object.defineProperty(Array.prototype, "filter", {
    configurable: true,
    writable: true,
    value: function(callback, thisArg) {
      if (
        this.length > 0 &&
        this.length <= 1000 &&
        typeof this[0]?.id === "string" &&
        typeof this[this.length - 1]?.id === "string" &&
        (new Error().stack ?? "").includes("pickRecommendationBatch")
      ) {
        recommendationBatchPendingSeed = true;
      }
      return Reflect.apply(filter, this, arguments);
    },
  });
  const nextRandom = (state) => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return { state, value: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
  };
  Math.random = () => {
    if ((new Error().stack ?? "").includes("pickRecommendationBatch")) {
      if (recommendationBatchPendingSeed) {
        recommendationS = seed;
        recommendationBatchPendingSeed = false;
        window.__ovRandomTrace?.resets?.push({
          afterN: window.__ovRandomTrace.count,
          reason: "pickRecommendationBatch",
        });
      }
      const global = nextRandom(s);
      s = global.state;
      const recommendation = nextRandom(recommendationS);
      recommendationS = recommendation.state;
      return recommendation.value;
    }
    const next = nextRandom(s);
    s = next.state;
    return next.value;
  };
  Object.defineProperty(window, "__ovCompareResetRandom", {
    configurable: true,
    value: () => {
      s = seed;
      recommendationS = seed;
    },
  });
  new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) resetForRecommendations(node);
    }
  }).observe(document, { childList: true, subtree: true });
})();`;
/**
 * 发送探针（第 346 轮，验收建议）。
 *
 * 「缺一帧 / 缺一个请求」类问题，与其猜是哪条代码路径，不如在**录参照基线时**直接记下调用栈。
 * 参照的 bundle 没有压缩，栈里的 `index-BBp4hclA.js:<行号>` 能定位到具体调用点。
 * 开 OV_PROBE=1 时注入；录完从页面里读 `__OV_PROBE__`。
 */
const SEND_PROBE = `(() => {
  if (globalThis.__OV_PROBE_INSTALLED__) return;
  globalThis.__OV_PROBE_INSTALLED__ = true;
  globalThis.__OV_PROBE__ = [];
  const orig = WebSocket.prototype.send;
  WebSocket.prototype.send = function (data) {
    try {
      const t = JSON.parse(data)?.type;
      if (t === "set_mode" || t === "focus_session" || t === "switch_session") {
        globalThis.__OV_PROBE__.push([t, String(new Error().stack).split("\\n").slice(1, 9).join(" | ")]);
      }
    } catch {}
    return orig.call(this, data);
  };
  if (typeof globalThis.fetch === "function") {
    const of = globalThis.fetch;
    globalThis.fetch = function (...args) {
      try {
        const u = String(args[0]?.url ?? args[0] ?? "");
        if (/promote|asset-center|showcase/.test(u)) {
          globalThis.__OV_PROBE__.push(["fetch:" + u.split("?")[0], String(new Error().stack).split("\\n").slice(1, 7).join(" | ")]);
        }
      } catch {}
      return of.apply(this, args);
    };
  }
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
// 第 2039 轮：首页卡片「挂载后又被卸载」诊断探针（PROBE_HOME=1 时注入）。
// 纯 DOM 观测，不碰产品代码、不改变任何渲染行为。
// 能区分三种成因：
//   A. loading 状态来回切换 → section 的 aria-busy 会先翻 true
//   B. selectedPrimaryId 变化导致整块重挂 → 卡片容器的祖先元素身份会变
//   C. 卡片 key 变化 → 容器身份不变，但卡片集合整体替换
const HOME_PROBE = `(() => {
  if (window.__OV_HOME_PROBE__) return;
  const log = [];
  const t0 = performance.now();
  const at = () => Math.round(performance.now() - t0);
  let seq = 0;
  const cards = () => Array.from(document.querySelectorAll("article.home-media-showcase-card"));
  const section = () => document.querySelector("section.home-media-showcase-block");
  const srcsOf = (el) => Array.from(el.querySelectorAll("img")).map((i) => (i.getAttribute("src") || "").slice(-28));
  const snapshot = (why) => {
    const s = section();
    const cs = cards();
    log.push({
      seq: seq++, ms: at(), why,
      busy: s ? s.getAttribute("aria-busy") : null,
      cards: cs.length,
      // 卡片容器的身份：给每个 grid 打一个稳定标记，用来判断整块是否被换掉
      grid: (() => {
        const g = cs[0] && cs[0].parentElement;
        if (!g) return null;
        if (!g.dataset.ovProbeGrid) g.dataset.ovProbeGrid = "g" + (++window.__OV_GRID_N__ || (window.__OV_GRID_N__ = 1));
        return g.dataset.ovProbeGrid;
      })(),
      sample: cs.slice(0, 2).map(srcsOf),
      // 懒加载诊断：卡片内全部 img 的加载状态
      img: (() => {
        const all = Array.from(document.querySelectorAll("article.home-media-showcase-card img"));
        return {
          n: all.length,
          ok: all.filter((i) => i.complete && i.naturalWidth > 0).length,
          lazy: all.filter((i) => i.getAttribute("loading") === "lazy").length,
          pending: all.filter((i) => !i.complete || i.naturalWidth <= 0).length,
          vids: document.querySelectorAll("article.home-media-showcase-card video").length,
        };
      })()
    });
    if (log.length > 400) log.splice(0, 200);
  };
  window.__OV_GRID_N__ = 0;
  window.__OV_HOME_PROBE__ = { log, snapshot };
  let lastBusy = null;
  new MutationObserver((recs) => {
    let touched = false, busyChanged = false;
    for (const r of recs) {
      if (r.type === "attributes" && r.attributeName === "aria-busy") busyChanged = true;
      if (r.type === "childList") touched = true;
    }
    if (!touched && !busyChanged) return;
    const s = section();
    const busy = s ? s.getAttribute("aria-busy") : null;
    if (busyChanged || busy !== lastBusy) { lastBusy = busy; snapshot("aria-busy"); return; }
    snapshot(touched ? "dom" : "busy");
  }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-busy"] });
  setInterval(() => snapshot("tick"), 100);
})();`;
const STABLE_TOL = 0;
async function stableShot(c) {
  let prev = null;
  let last = null;
  for (let i = 0; i < 8; i++) {
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: -1, y: -1 });
    await c.send("Runtime.evaluate", { expression: SETTLE, awaitPromise: true });
    await sleep(700);
    await c.send("Runtime.evaluate", { expression: MASK_VOLATILE });
    if (process.env.OV_REFERENCE === "1") await c.send("Runtime.evaluate", { expression: MASK_INTENTIONAL });
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
        // 第 2030 轮：requestId -> 请求对象，用于回填状态码/失败原因
        const requestRecords = new Map();
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
          // 第 325 轮：用 Fetch 域在**请求发出阶段**拦掉首页封面。
          // Network.setBlockedURLs 试了三种模式都拦不住（原因未查明），Fetch 更底层。
          // 只在 recovered/ours 侧启用 —— 参照本来就不请求这个路径，两边条件因此对齐。
          if (m.method === "Fetch.requestPaused") {
            const u = m.params?.request?.url ?? "";
            const hit = BLOCKED_URL_PATTERNS.some((re) => re.test(u));
            void send(
              hit ? "Fetch.failRequest" : "Fetch.continueRequest",
              hit
                ? { requestId: m.params.requestId, errorReason: "BlockedByClient" }
                : { requestId: m.params.requestId },
            ).catch(() => {});
            return;
          }
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
                const record = {
                  method: String(request.method ?? "GET").toUpperCase(),
                  ...endpoint,
                  postData: normalizePayload(request.postData),
                };
                requests.push(record);
                // 第 2030 轮：留着引用，等 responseReceived / loadingFailed 回填
                requestRecords.set(params.requestId, record);
                if (params.type !== "WebSocket") pendingLocalRequests.set(params.requestId, new URL(request.url).pathname);
                if (/^wss?:/i.test(request.url)) websocketUrls.set(params.requestId, endpoint);
              }
            }
          } else if (m.method === "Network.responseReceived" && capturingNetwork) {
            // 第 2030 轮：记录 HTTP 状态码（诊断用，不参与比较）
            const record = requestRecords.get(m.params.requestId);
            if (record && typeof m.params.response?.status === "number") {
              record.status = m.params.response.status;
            }
          } else if (
            capturingNetwork &&
            (m.method === "Network.loadingFinished" || m.method === "Network.loadingFailed")
          ) {
            if (m.method === "Network.loadingFailed") {
              const record = requestRecords.get(m.params.requestId);
              if (record) record.failure = String(m.params.errorText ?? "unknown");
            } else {
              // 第 2038 轮：4xx/5xx 时把响应体头部记下来（截断）。
              // 为什么：之前只记状态码，遇到"200 但内容为空"或"4xx 但不知道原因"就没法判断。
              // 只在 loadingFinished 时抓 —— 太早拿不到 body。
              const record = requestRecords.get(m.params.requestId);
              if (record && typeof record.status === "number" && record.status >= 400) {
                // 非阻塞：抓不到就跳过，不影响判据
                send("Network.getResponseBody", { requestId: m.params.requestId })
                  .then((body) => {
                    const text = body?.result?.body ?? "";
                    if (text) record.bodyHead = String(text).slice(0, 300);
                  })
                  .catch(() => {});
              }
            }
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
          else if (m.method === "Debugger.paused") { for (const h of pausedListeners) { try { h(m.params); } catch {} } }
          else if (m.method === "Runtime.exceptionThrown") { const desc = m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text; errors.push("EXC " + desc.split("\n")[0]); if (process.env.STACK) console.log("STACK", desc.split("\n").slice(0, 8).join(" | ")); }
          else if (process.env.STACK && m.method === "Runtime.consoleAPICalled" && ["warning", "error", "log"].includes(m.params.type) && ((process.env.PROBE === "1" && m.params.args.some((a) => String(a.value ?? a.description ?? "").startsWith("[probe]"))) || /rror|fail|catch|boundary/i.test(m.params.args.map((a) => a.value ?? a.description ?? "").join(" ")))) { console.log("CONSOLE", m.params.type, m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 700)); if (m.params.type === "error") errors.push("ERR " + m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").split("\n")[0].slice(0, 300)); }
          else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push("ERR " + m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").split("\n")[0].slice(0, 300));
        };
        // 页面卡死时不要无限等：每个调用 60 秒超时
        const pausedListeners = [];
        const send = (method, params = {}) =>
          new Promise((resolve, reject) => {
            const id = ++seq;
            const timer = setTimeout(() => reject(new Error(`${method} 60 秒没响应，界面可能卡死或报错了`)), 60000);
            pending.set(id, (m) => (clearTimeout(timer), resolve(m)));
            ws.send(JSON.stringify({ id, method, params }));
          });
        await send("Runtime.enable");
        await send("Page.enable");
        // 画布上传会点到 file input，macOS 会弹出系统选择框。拦截后框不出现，文件仍由 DOM.setFileInputFiles 填入。
        await send("Page.setInterceptFileChooserDialog", { enabled: true });
        const frameTree = await send("Page.getFrameTree");
        mainFrameId = frameTree.result.frameTree.frame.id;
        // 挡掉封面 CDN 后会抛网络错误，这是预期内的，不算界面报错
        await send("Network.enable");
        await send("Network.setBlockedURLs", { urls: BLOCKED_URLS });
        // 首页封面拦截（第 325 轮）：**实测两种机制都拦不住**，见 BLOCKED_URL_PATTERNS 注释。
        // 代码保留但默认关闭，只有显式设 OV_BLOCK_SHOWCASE=1 才启用 —— 免得悄悄改变门禁行为。
        // 下一步应按验收要求：列出所有调试目标，查清这 18 个请求到底从哪个目标发出。
        if (process.env.OV_BLOCK_SHOWCASE === "1" && (process.env.OV_UI ?? "recovered") !== "reference") {
          await send("Network.setCacheDisabled", { cacheDisabled: true });
          await send("Fetch.enable", {
            patterns: [{ urlPattern: "*", requestStage: "Request" }],
          });
        }
        await send("Page.addScriptToEvaluateOnNewDocument", { source: `${SEEDED_DATE}\n${SEEDED_RANDOM}` });
        if (process.env.OV_PROBE === "1") {
          await send("Page.addScriptToEvaluateOnNewDocument", { source: SEND_PROBE });
        }
        // 日志里的随机 ID（UUID）和耗时每次不同，规整掉再比，否则同一条报错两边永远对不上
        const visible = () => errors.filter((e) => !/cdn\.hailuoai\.(?:com|video)/.test(e)).map((e) => e.replace(UUID_PATTERN, "<uuid>").replace(/durationMs=\d+/g, "durationMs=<n>"));
        return {
          send,
          onPaused: (cb) => { pausedListeners.push(cb); return () => { const i = pausedListeners.indexOf(cb); if (i >= 0) pausedListeners.splice(i, 1); }; },
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

/** 第 198 轮：诊断用——列出所有带非 none background-image 的节点。
 *  DOM 快照只记录白名单属性，看不到样式，所以这里单独探一次。 */
const BG_PROBE = `(() => {
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== "none") {
      out.push({
        tag: el.tagName.toLowerCase(),
        id: el.getAttribute("data-composition-id") || el.getAttribute("data-action-ui-id") || null,
        cls: (el.getAttribute("class") || "").slice(0, 60),
        bg: bg.slice(0, 140),
      });
    }
  }
  const media = [];
  for (const el of document.querySelectorAll("canvas,svg,video,picture,iframe")) {
    const r = el.getBoundingClientRect();
    media.push({
      tag: el.tagName.toLowerCase(),
      w: Math.round(r.width), h: Math.round(r.height),
      x: Math.round(r.x), y: Math.round(r.y),
      id: el.getAttribute("data-composition-id") || el.getAttribute("data-action-ui-id") || null,
      children: el.childElementCount,
    });
  }
  return { backgrounds: out.slice(0, 20), media: media.filter((m) => m.w > 8 && m.h > 8).slice(0, 30) };
})()`;

async function capturePageDom(c) {
  await waitForNoToasts(c);
  if (process.env.BG_PROBE === "1") {
    try {
      const r = await c.send("Runtime.evaluate", { expression: BG_PROBE, returnByValue: true });
      const v = r.result?.result?.value ?? {};
      console.log(`[bg] 背景图 ${v.backgrounds?.length ?? 0} 个 / 媒体节点 ${v.media?.length ?? 0} 个`);
      for (const x of (v.backgrounds ?? []).slice(0, 5)) console.log(`   <${x.tag}> id=${x.id} bg=${x.bg}`);
      for (const m of (v.media ?? []).slice(0, 8)) console.log(`   MEDIA <${m.tag}> ${m.w}x${m.h} @${m.x},${m.y} id=${m.id} children=${m.children}`);
    } catch (e) { console.log(`[bg] 探针失败 ${String(e).slice(0, 120)}`); }
  }
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
  // 第 177 轮：超时时先分清「主线程卡死」还是「页面活着但元素没出现」。
  // 这是 176 轮「打点一个都没触发」的根治手段：不再依赖 console 采集。
  await diagnoseStall(c, label);
  throw new Error(`等待 ${label} 超时`);
}
/** 心跳 + Debugger.pause 定位；同时读页面内 __OV_PROBE__ 缓冲。 */
async function diagnoseStall(c, label) {
  if (process.env.DIAG === "0") return;
  const alive = await Promise.race([
    evalValue(c, "1").then(() => true).catch(() => false),
    new Promise((r) => setTimeout(() => r(false), 3000)),
  ]);
  if (!alive) {
    try {
      await c.send("Debugger.enable");
      const paused = new Promise((resolve) => {
        const off = c.onPaused((params) => { off(); resolve(params); });
        setTimeout(() => { off(); resolve(null); }, 5000);
      });
      await c.send("Debugger.pause");
      const params = await paused;
      const frames = (params?.callFrames ?? []).slice(0, 12)
        .map((f) => `${f.functionName || "(anon)"}@${(f.url || "").split("/").pop()}:${(f.location?.lineNumber ?? 0) + 1}`);
      console.log(`[diag] HUNG AT ${label}: ${frames.join(" <- ") || "(未取到暂停栈)"}`);
    } catch (e) {
      console.log(`[diag] HUNG AT ${label}: Debugger 不可用 ${String(e).slice(0, 120)}`);
    }
    return;
  }
  try {
    const r = await evalValue(c, `JSON.stringify({
      probe: (globalThis.__OV_PROBE__ ?? []).slice(-40),
      bodyText: (document.body?.innerText ?? "").slice(0, 400),
      hasFallback: !!document.querySelector("[data-page-state-fallback]"),
    })`);
    // 第 284 轮：错误边界把诊断写进 localStorage，单独读一次（塞进上面那个对象字面量会炸）
    let boundary = "";
    try {
      const raw = await evalValue(c, `localStorage.getItem("hilo:last-error-boundary")`);
      if (raw) {
        const d = JSON.parse(raw);
        boundary =
          `\n[diag] 错误边界 message=${String(d.message ?? "").slice(0, 300)}` +
          `\n[diag] componentStack=${String(d.componentStack ?? "").split("\n").slice(0, 6).join(" | ").slice(0, 700)}` +
          `\n[diag] stack=${String(d.stack ?? "").split("\n").slice(0, 5).join(" | ").slice(0, 700)}`;
      }
    } catch (e) { boundary = `\n[diag] 读错误边界失败 ${String(e).slice(0, 100)}`; }
    console.log(`[diag] ALIVE ${label}: ${String(r).slice(0, 1200)}${boundary}`);
  } catch (e) {
    console.log(`[diag] ALIVE ${label}: 读取失败 ${String(e).slice(0, 120)}`);
  }
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
/** 第 177 轮：构建新鲜度检查 —— 防「旧构建冒充新构建」（第 111 轮的坑）。 */
function assertBuildFresh(marker) {
  if (!marker) return;
  const dir = path.join("app/desktop/out/recovered-ui", "assets");
  let hit = false;
  try {
    for (const f of readdirSync(dir)) {
      if (!/^index-.*\.js$/.test(f)) continue;
      if (readFileSync(path.join(dir, f), "utf8").includes(marker)) { hit = true; break; }
    }
  } catch { /* 目录不存在时跳过 */ }
  if (!hit) {
    console.error(`[fresh] 构建产物里找不到标记 "${marker}"，可能跑的是旧构建`);
    if (process.env.REQUIRE_FRESH === "1") process.exit(1);
  } else {
    console.error(`[fresh] 构建包含标记 "${marker}" ✓`);
  }
}
if (process.env.FRESH_MARKER) assertBuildFresh(process.env.FRESH_MARKER);

async function waitForWorkspaceChatReady(c, pageId, timeout = 15000) {
  await waitForValue(c, `(() => {
    const input = document.querySelector('[data-action-ui-id="message-input"]');
    const reconnecting = [...document.querySelectorAll("body *")].some((element) =>
      element.childElementCount === 0 && element.textContent.trim() === "正在重连运行时",
    );
    return !!input && !reconnecting;
  })()`, `${pageId} 工作区聊天运行时恢复完成`, timeout);
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
      href: location.href,
      nodeFound: !!node,
      nodeCount: document.querySelectorAll(".react-flow__node").length,
      nodeIds: [...document.querySelectorAll(".react-flow__node")].slice(0, 30).map((element) => ({
        id: element.getAttribute("data-id"),
        type: [...element.classList].find((name) => name.startsWith("react-flow__node-")),
        text: element.innerText?.slice(0, 80),
      })),
      body: document.body?.innerText?.slice(0, 800) ?? null,
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
    // 第 333 轮：音频节点 id 已在产品侧改成 canvas.audio-node.toggle-play（与参照一致），
    // 所以脚本也用 v3 的 id。
    const playAction = tag === "video" ? "canvas.video-player.toggle-play" : "canvas.audio-node.toggle-play";
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

/**
 * 夹具状态指纹（第 2030 轮）。
 *
 * 为什么需要：走查在同一个应用实例里连跑 37 屏，工作区的 `.hilo/index.sqlite`
 * 会随每屏的操作变化（会话、消息、标签页都写在这里）。同一份代码
 * 「单屏跑」与「全量跑」结果不同，根因就在这个文件的漂移上。
 *
 * 每屏开始前算一次，写进 report.json(fixtureHashes)，就能看出状态是从哪一屏开始偏的。
 * 注意：只读，不修改夹具。
 */
function fixtureHash() {
  const targets = [];
  for (const workspace of [WS_A, WS_B]) {
    for (const relative of [".hilo/index.sqlite", ".hilo/index.sqlite-wal", ".hilo/canvas.json", ".hilo/storage.json"]) {
      const file = path.join(workspace, relative);
      if (existsSync(file)) targets.push(file);
    }
  }
  const hash = createHash("sha256");
  for (const file of targets.sort()) {
    hash.update(path.basename(path.dirname(file)));
    hash.update(path.basename(file));
    try {
      hash.update(readFileSync(file));
    } catch {
      hash.update("<unreadable>");
    }
  }
  return { digest: hash.digest("hex").slice(0, 16), files: targets.length };
}

const fixtureHashes = new Map();

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
  // 第 2030 轮：把两份工作区的 .hilo 各存一份"干净快照"。
  // 为什么需要：全量跑时第 28 屏（ws-video）之后 index.sqlite 会被写入，
  // 后续屏读到的是被别人改动过的状态（实测指纹从 1dd2b334 变成 9 种）。
  // 每屏导航前从快照还原，两侧才都从同一状态出发。
  const pristineRoot = path.join(ROOT, "_pristine");
  for (const [name, dir] of [["ws-a", WS_A], ["ws-b", WS_B]]) {
    cpSync(path.join(dir, ".hilo"), path.join(pristineRoot, name), { recursive: true });
  }
  const env = {
    ...process.env,
    OV_UI: mode,
    // 第 195 轮：参考界面渲染时自动套用「已登记的有意差异」遮罩，
    // 这样基线与我们的品牌文案一致，剩下的像素差才算回归。
    ...(mode === "reference" ? { OV_REFERENCE: "1" } : {}),
    // 录基线用 OV_UI=reference（4.0.0 原版界面）；v3 屏需要 resource_v3 架构
    ...(process.env.HILO_PROJECT_ARCHITECTURE ? { HILO_PROJECT_ARCHITECTURE: process.env.HILO_PROJECT_ARCHITECTURE } : {}),
    OV_DEV_HIDDEN_WINDOW: "1",
    OV_USER_DATA_DIR: `${ROOT}/ud`,
    HILO_DATA_DIR: `${ROOT}/data`,
    OV_SKIP_LEGACY_MIGRATION: "1",
    OV_CONFIG_PATH: path.join(FIXTURE, "ui-compare-config.json"),
    OV_DEV_OPEN_WORKSPACES: `${WS_A}${path.delimiter}${WS_B}`,
        // 第 347 轮：不要默认读 /Applications（会自动升级）。优先整包备份，再退回已安装应用。
    ...(process.env.OPENCODE_BIN
      ? {}
      : {
          OPENCODE_BIN: (() => {
            const backup = path.join(repo, "../minimax-design-4.0.0-backup/MiniMax Design.app/Contents/Resources/opencode/opencode");
            if (existsSync(backup)) return backup;
            console.warn("⚠ OPENCODE_BIN 回退到 /Applications 里已安装的应用（可能已升级）");
            return "/Applications/MiniMax Design.app/Contents/Resources/opencode/opencode";
          })(),
        }),
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
  RECORDED_SCRIPTS.length = 0;
  const pagesToRun = PAGES.filter((p) => {
    if (mode !== "reference" || !REFERENCE_EXCLUDED.has(p.id)) return true;
    console.log(`  （跳过 ${p.id}：${REFERENCE_EXCLUDED.get(p.id)}）`);
    return false;
  });
  try {
    const c = await cdp(PORT);
    await sleep(15000); // 工作区 gateway / opencode 起来、首启示例项目导入
    await waitForSkillProfile();
    try {
      const srcs = await evalValue(
        c,
        `JSON.stringify([...document.scripts].map((s) => s.src).filter(Boolean))`,
      );
      RECORDED_SCRIPTS.push(...JSON.parse(srcs ?? "[]"));
    } catch { /* 取不到就不记，来源字段会是 null */ }
    for (let i = 0; i < 3; i++) {
      await c.send("Runtime.evaluate", { expression: DISMISS_STARTUP });
      await sleep(800);
    }
    for (const p of pagesToRun) {
      console.log(`  ${mode} ${p.id}`);
      c.clearErrors();
      let randomTraceScriptIdentifier;
      if (process.env.OV_RANDOM_TRACE === "1" && p.id.startsWith("ws-")) {
        const script = await c.send("Page.addScriptToEvaluateOnNewDocument", { source: RANDOM_TRACE(p.url) });
        randomTraceScriptIdentifier = script.result?.identifier;
      }
      const documentURL = `app://.${p.url}`;
      // 第 196 轮：每屏开始前清 `global.dismissedCoachMarks`。
      // 为什么：侧栏的「new」徽标由 useReleaseBadges 决定 ——
      //   读 useStorage("global.dismissedCoachMarks")，访问过就写进去、徽标消失。
      // 走查连跑 37 屏时，前几屏把徽标"读掉"了，后面 19 屏就都没有
      // home-sidebar.connectors-release-badge（实测它是 19 屏共有的 refOnly）。
      // 参照基线是首次访问录的，徽标在；我们这边必须也回到同一状态才可比。
      await c.send("Runtime.evaluate", {
        expression: `(() => { try { for (const k of Object.keys(localStorage)) if (k.includes("dismissedCoachMarks")) localStorage.removeItem(k); } catch {} })()`,
      });
      // 第 178 轮：诊断用 —— 打印进入本屏前的 localStorage 键与大小，
      // 用来找出「随屏序增长」的键（第 177 轮证明残留不在会话键里）。
      if (process.env.DIAG_STORAGE === "1") {
        const r = await c.send("Runtime.evaluate", {
          expression: `JSON.stringify(Object.keys(localStorage).map(k => [k, (localStorage.getItem(k)||"").length]).sort((a,b)=>b[1]-a[1]).slice(0,8))`,
          returnByValue: true,
        });
        console.log(`  [ls] ${p.id}: ${r.result?.result?.value}`);
      }
      // 第 198 轮：用**document 级种子脚本**把 dismissedCoachMarks 清空。
      // 为什么不用导航前清理：那样清完，应用加载过程中又会把它写回去
      // （侧栏渲染 connectors 入口时会标记已读），全量跑下 19 屏仍缺
      // home-sidebar.connectors-release-badge。种子脚本在应用任何代码之前执行，
      // 每次新文档都生效，应用读到的必然是空值。
      // 第 2030 轮：还原 .hilo 到干净快照（在算指纹之前，让指纹能验证还原是否成功）。
      // 第 2043 轮：project-assets / project-created 需要 workspace 里**已有会话**
      // （它们的等待条件读 localStorage 的 workspaceSessionTabs 并要求会话存在），
      // 而复位会把前序屏创建的会话抹掉 —— 于是这两屏永久「无创作页」。
      // 因此按屏豁免复位；代价是这两屏不与其他屏同基线条件，已在文档里注明。
      const keepSessionPages = new Set(["project-assets", "project-created"]);
      if (process.env.NO_FIXTURE_RESET !== "1" && !keepSessionPages.has(p.id)) {
        for (const [name, dir] of [["ws-a", WS_A], ["ws-b", WS_B]]) {
          const pristine = path.join(ROOT, "_pristine", name);
          if (!existsSync(pristine)) continue;
          rmSync(path.join(dir, ".hilo"), { recursive: true, force: true });
          cpSync(pristine, path.join(dir, ".hilo"), { recursive: true });
        }
      }
      // 第 2030 轮：记录进入本屏之前的夹具状态指纹
      const fixtureState = fixtureHash();
      fixtureHashes.set(`${mode}:${p.id}`, fixtureState);
      if (process.env.DIAG_FIXTURE === "1") {
        console.log(`  [fx] ${p.id}: ${fixtureState.digest}`);
      }
      if (process.env.PROBE_HOME === "1" && p.id === "home") {
        await c.send("Page.addScriptToEvaluateOnNewDocument", { source: HOME_PROBE });
      }
      const coachMarkSeed = await c.send("Page.addScriptToEvaluateOnNewDocument", {
        source: `(() => { try { for (const k of Object.keys(localStorage)) if (k.includes("dismissedCoachMarks")) localStorage.removeItem(k); } catch {} })()`,
      });
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
        // 第 342 轮（验收建议）：有些菜单在合成鼠标事件下打不开，改用「聚焦 + 键盘」。
        if (typeof label === "object" && label.press && label.ui) {
          const deadline = Date.now() + (label.timeout ?? 4000);
          let ok = false;
          while (Date.now() < deadline) {
            ok = await evalValue(c, `(() => {
              const el = document.querySelector('[data-action-ui-id="${label.ui}"]');
              if (!el) return false;
              el.focus();
              return document.activeElement === el;
            })()`) === true;
            if (ok) break;
            await sleep(250);
          }
          if (!ok) throw new Error(`${p.id}：找不到或聚焦不了「${labelName}」`);
          for (const type of ["keyDown", "keyUp"]) {
            await c.send("Input.dispatchKeyEvent", {
              type, key: label.press, code: label.press, windowsVirtualKeyCode: label.press === "Enter" ? 13 : 40,
            });
          }
          await sleep(1500);
          continue;
        }
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
      if (p.seedStorage) {
        // 第 226 轮：key 里的 workspaceId 实际是 gateway scope key（不是文件夹路径），
        // 运行期才知道。所以这里先用占位值写一次，再从页面读回真正的 scope key 覆盖。
        const entries = Object.entries(p.seedStorage);
        await c.send("Runtime.evaluate", {
          expression: `(() => { ${entries.map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join(" ")} return true; })()`,
          returnByValue: true,
        });
        if (process.env.DIAG_SEED === "1") {
          const all = await c.send("Runtime.evaluate", { expression: "JSON.stringify(Object.keys(localStorage))", returnByValue: true });
          console.log("[seed] 重载前所有 localStorage 键:", all.result?.result?.value);
        }
        // localStorage 变更不会触发路由重渲染，重载一次让它生效。
        // 注意：资源视图会持续轮询 /api/v3/tasks，等网络空闲会超时，所以这里用固定 settle。
        await c.send("Page.reload", { ignoreCache: false });
        await sleep(3000);
      }
      if (process.env.DIAG_SEED === "1" && p.seedStorage) {
        const r = await c.send("Runtime.evaluate", {
          expression: `JSON.stringify({ ls: Object.keys(localStorage).filter(k => k.includes("resource-view")), val: localStorage.getItem(${JSON.stringify(Object.keys(p.seedStorage)[0])}) })`,
          returnByValue: true,
        });
        console.log("[seed] 重载后 localStorage:", r.result?.result?.value);
        const probe = await c.send("Runtime.evaluate", {
          expression: `JSON.stringify({
            keys: Object.keys(localStorage).filter(k => k.includes("resource-view")).map(k => [k, localStorage.getItem(k)]),
            hasRes: !!document.querySelector('[data-action-ui-id="v3-resource-view"]'),
            hasCanvas: !!document.querySelector('[data-action-ui-id="v3-canvas-view"]'),
            hasWorkbench: !!document.querySelector('[data-v3-workbench]'),
            text: document.body.innerText.slice(0, 120),
          })`,
          returnByValue: true,
        });
        console.log("[seed] DOM 探测:", probe.result?.result?.value);
        console.log("[seed] 控制台错误:", JSON.stringify(c.errors().slice(-6), null, 1).slice(0, 1200));
      }
      if (p.waitForUi) {
        await waitForValue(
          c,
          `!!document.querySelector('[data-action-ui-id="${p.waitForUi}"]')`,
          `${p.id}：${p.waitForUi} 没有出现`,
        );
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
        })()`, "ws-a 会话焦点持久化", 30000);
      }
      if (p.url.startsWith("/workspace?") || p.id === "project-assets") {
        await waitForWorkspaceChatReady(c, p.id);
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
          expression: `(() => {
            const trace = window.__ovRandomTrace ?? null;
            if (trace) {
              trace.visibleCards = [...document.querySelectorAll('[data-action-ui-id="chat-showcase-card"]')].map((card) => ({
                text: card.textContent?.trim() ?? "",
                attributes: [...card.attributes].filter((attribute) => attribute.name.startsWith("data-") || attribute.name === "aria-label").map((attribute) => [attribute.name, attribute.value]),
              }));
              trace.runtime = {
                reconnecting: [...document.querySelectorAll("body *")].filter((element) => element.childElementCount === 0 && /正在重连运行时/.test(element.textContent ?? "")).map((element) => element.textContent.trim()),
                hasMessageInput: !!document.querySelector('[data-action-ui-id="message-input"]'),
              };
            }
            window.__ovRandomTraceRestore?.();
            return trace;
          })()`,
          returnByValue: true,
        });
        const trace = captured.result?.result?.value;
        if (!trace) throw new Error(`OV_RANDOM_TRACE 已启用，但 ${p.id} 页面没有 RNG trace`);
        writeFileSync(path.join(outDir, `${p.id}.${mode}.random-trace.json`), JSON.stringify(trace, null, 2));
        if (coachMarkSeed?.result?.identifier)
          await c.send("Page.removeScriptToEvaluateOnNewDocument", {
            identifier: coachMarkSeed.result.identifier,
          });
        await c.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: randomTraceScriptIdentifier });
      }
      if (process.env.PROBE_HOME === "1" && p.id === "home") {
        const probed = await c.send("Runtime.evaluate", {
          expression: "JSON.stringify(window.__OV_HOME_PROBE__ || null)",
          returnByValue: true,
        });
        writeFileSync(
          path.join(outDir, `home.${mode}.home-probe.json`),
          probed.result?.result?.value ?? "null",
        );
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
      // 探针结果：录完从页面读出来，直接打印（只记录，不参与判定）
      if (process.env.OV_PROBE === "1") {
        try {
          const raw2 = await evalValue(c, "JSON.stringify(globalThis.__OV_PROBE__ ?? [])");
          const items = JSON.parse(raw2 ?? "[]");
          if (items.length) {
            console.log(`  [probe] ${p.id} 共 ${items.length} 条：`);
            for (const [kind, stack] of items.slice(0, 8)) {
              console.log(`    ${kind}\n      ${String(stack).slice(0, 400)}`);
            }
          } else {
            console.log(`  [probe] ${p.id} 无命中`);
          }
        } catch (e) {
          console.log(`  [probe] 读取失败 ${String(e).slice(0, 80)}`);
        }
      }
      const file = path.join(outDir, `${p.id}.${mode}.png`);
      writeFileSync(file, buf);
      // 取遮罩目标的矩形（两边各取一次，比较时取并集）
      let masks = [];
      try {
        const raw2 = await evalValue(
          c,
          `(() => { const dpr = window.devicePixelRatio || 1; return JSON.stringify(${JSON.stringify(MASK_TARGETS.map((m) => m.selector))}.flatMap((sel) => {
             return [...document.querySelectorAll(sel)].map((el) => {
               const r = el.getBoundingClientRect();
               return r.width > 0 && r.height > 0
                 // **必须乘 devicePixelRatio**：getBoundingClientRect 是 CSS 像素，
                 // 截图是物理像素（视口 1280x800 -> 图 2560x1600）。不乘的话遮罩会落在
                 // 左上角一半大小的区域里，看起来「遮了但差异没降」。
                 // 左上向下取整、右下向上取整，避免边缘残留一圈抗锯齿像素
                 ? (() => {
                     const x0 = Math.floor(r.x * dpr);
                     const y0 = Math.floor(r.y * dpr);
                     const x1 = Math.ceil((r.x + r.width) * dpr);
                     const y1 = Math.ceil((r.y + r.height) * dpr);
                     return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
                   })()
                 : null;
             });
           }).filter(Boolean)); })()`,
        );
        masks = JSON.parse(raw2 ?? "[]");
      } catch { /* 取不到就不遮这一屏 */ }
      results[p.id] = { file, errors: [...new Set(c.errors())], net, dom, state, masks };
    }
    c.close();
  } finally {
    await stopComparisonProcesses(child, env.OV_USER_DATA_DIR);
  }
  return results;
}

async function diff(a, b, out, nonAAOut, masks = []) {
  const [ia, ib] = await Promise.all([rawOf(a), rawOf(b)]);
  if (ia.info.width !== ib.info.width || ia.info.height !== ib.info.height) {
    return { ratio: 1, changed: null, nonAARatio: 1, nonAAChanged: null, pixelmatchNonAA: null, note: "尺寸不同" };
  }
  const W = ia.info.width;
  const H = ia.info.height;
  // 遮罩像素：这些位置是**已登记的有意差异**，既不进分子也不进分母，
  // 否则「把遮罩开大点」就能刷低数字。遮掉的面积单独回报。
  const maskedBits = new Uint8Array(W * H);
  for (const r of masks) {
    const x0 = Math.max(0, Math.floor(r.x));
    const y0 = Math.max(0, Math.floor(r.y));
    const x1 = Math.min(W, Math.ceil(r.x + r.w));
    const y1 = Math.min(H, Math.ceil(r.y + r.h));
    for (let y = y0; y < y1; y++) maskedBits.fill(1, y * W + x0, y * W + x1);
  }
  const maskedCount = maskedBits.reduce((n, v) => n + v, 0);
  const px = W * H;
  const mask = Buffer.alloc(px * 4);
  let changed = 0;
  for (let i = 0; i < px; i++) {
    if (maskedBits[i]) {
      // 遮罩区画成中性灰，与差异红区分开
      const o0 = i * 4;
      mask[o0] = mask[o0 + 1] = mask[o0 + 2] = 200;
      mask[o0 + 3] = 255;
      continue;
    }
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
    // 遮罩区不参与非 AA 计数（与上面 changed 的处理保持一致）
    if (maskedBits[i]) continue;
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
  // 分母扣掉遮罩面积：遮罩区是已登记的有意差异，不该算进「差异率」。
  const effective = Math.max(1, px - maskedCount);
  return {
    ratio: changed / effective,
    changed,
    nonAARatio: nonAAChanged / effective,
    nonAAChanged,
    pixelmatchNonAA,
    maskedRatio: maskedCount / px,
  };
}

if (!existsSync(FIXTURE)) throw new Error(`缺少测试数据 ${FIXTURE}`);
// 基线：每屏一张 <屏>.png，报错记在 errors.json
function readGolden() {
  const errorsFile = path.join(GOLDEN, "errors.json");
  const errors = existsSync(errorsFile) ? JSON.parse(readFileSync(errorsFile, "utf8")) : {};
  const channels = ["net", "dom", "state"];
  // REFERENCE_MISSING 里的屏没有基线，不算「基线不全」（理由在表里）。
  // 第 326 轮防护：遮罩清单非空，但基线目录里一个 mask.json 都没有 ——
  // 说明这份基线是遮罩功能之前录的。此时「两边取并集」会退化成只用我方位置，
  // 而只存在于参照里的元素（ComfyUI 行、用户头像）永远遮不到。**直接报错，不静默当空数组。**
  if (MASK_TARGETS.length > 0) {
    // 逐屏检查，不是「至少有一个」：某屏缺 mask.json 就意味着那一屏的参照侧遮罩位置是空的，
    // 「两边取并集」会退化成只用我方位置 —— 只在参照里有的元素（ComfyUI 行、浏览器切换）遮不到。
    const noMask = PAGES.filter(
      (p) => !REFERENCE_MISSING.has(p.id) && !existsSync(path.join(GOLDEN, `${p.id}.mask.json`)),
    ).map((p) => p.id);
    if (noMask.length) {
      throw new Error(
        `这些屏的基线缺 *.mask.json：${noMask.join(", ")}（${GOLDEN}）。` +
          `参照侧遮罩位置缺失会让「两边取并集」失效，请先 --record reference 重录。`,
      );
    }
  }
  // 批次一致性检查（第 348 轮）：正式基线必须是一次会话里整批录的。
  {
    const batches = new Map();
    for (const p of PAGES) {
      if (REFERENCE_MISSING.has(p.id)) continue;
      const f = path.join(GOLDEN, `${p.id}.batch.json`);
      if (!existsSync(f)) continue;
      try {
        const b = JSON.parse(readFileSync(f, "utf8")).batchId;
        batches.set(b, (batches.get(b) ?? 0) + 1);
      } catch { /* 读不了就当没记 */ }
    }
    if (batches.size > 1) {
      const list = [...batches.entries()].map(([b, n]) => `${b}(${n} 屏)`).join(", ");
      console.warn(`⚠ 基线混了多个录制批次：${list}`);
      console.warn("  正式基线应在一次会话里整批录制；单屏录制只用于排查，结果不能进正式目录。");
    } else if (batches.size === 1) {
      const [[b, n]] = [...batches.entries()];
      console.log(`基线批次：${b}（${n} 屏）`);
    }
  }
  const missing = PAGES.filter(
    (p) =>
      !REFERENCE_MISSING.has(p.id) &&
      (!existsSync(path.join(GOLDEN, `${p.id}.png`)) ||
        channels.some((channel) => !existsSync(path.join(GOLDEN, `${p.id}.${channel}.json`)))),
  ).map((p) => p.id);
  if (missing.length) throw new Error(`基线里缺这些屏：${missing.join(",")}，先跑 --record 录一份`);
  const readIf = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null);
  return Object.fromEntries(PAGES.map((p) => [
    p.id,
    // 参照基线里没有的屏：给 null，不要让 readFileSync 把整轮跑挂掉
    REFERENCE_MISSING.has(p.id)
      ? { file: null, errors: [], net: null, dom: null, state: null, masks: [] }
      : {
          file: path.join(GOLDEN, `${p.id}.png`),
          errors: errors[p.id] ?? [],
          net: readIf(path.join(GOLDEN, `${p.id}.net.json`)),
          dom: readIf(path.join(GOLDEN, `${p.id}.dom.json`)),
          state: readIf(path.join(GOLDEN, `${p.id}.state.json`)),
          masks: readIf(path.join(GOLDEN, `${p.id}.mask.json`)) ?? [],
        },
  ]));
}
/**
 * 只存在于本项目、参照界面里没有对应物的屏（第 308 轮）。
 *
 * 录 `reference` 基线时必须跳过，否则会因「找不到界面元素」直接中断录制。
 * 每一条都要写明理由 —— 这是「有意差异登记表」的一部分。
 */
const REFERENCE_EXCLUDED = new Map([
  [
    "settings-platform",
    "「平台接入」是本项目新增（i18n 键 ov.platform.title / ov.settings.platform，前缀 ov. 为本项目命名空间）；" +
      "参照的设置页全是 settings.account.*（账号体系），没有自托管地址/令牌这一区。" +
      "参照 bundle 里「平台接入」出现 0 次。",
  ],
]);

/**
 * 参照基线里**没有**、但不算缺陷的屏（第 321 轮，验收后补）。
 *
 * 现行基线是 `~/ov-golden-4.0.3-clean`（4.0.3 参照界面，37 屏，用修好的门禁重录）。
 * 下面这些屏在该基线里没有对应项 —— **旧基线 `~/ov-golden-ref`（4.0.0，35 屏）
 * 是漂移态录的，已废弃，不要再引用它做对比**。
 * 每条都写清楚为什么 —— 不给理由的排除等于掩盖差距。
 */
const REFERENCE_MISSING = new Map([
  ["settings-platform", "本项目新增（「平台接入」），参照没有这一屏"],
  ["ws-a-v3", "v3 屏：基线在 ~/ov-golden-v3，用 --record reference 单独录"],
  ["ws-b-v3", "同上"],
  ["ws-a-v3-resource", "同上"],
  ["project-created",
    "录制失败：等待条件要求 localStorage 的 workspaceSessionTabs 里有已聚焦的「创作页」。" +
    "已实测：.hilo/index.sqlite 只有资产类表（assets / workspace_meta / project_asset_anchors 等），" +
    "**没有会话表**，所以会话不在工作区夹具里、由网关侧维护；" +
    "而每屏的 .hilo 复位也不会影响它。要录这两屏得先弄清「创作页」的创建/持久化路径，" +
    "或预置一份已带会话的夹具 + 对应 localStorage（成对写入）。详见 docs/4.0.3-baseline-gaps.md"],
  ["project-assets", "同上"],
]);

/**
 * 基线批次 id（第 348 轮，验收建议）。
 *
 * **正式基线只能在一次会话里整批录制** —— 单独重录个别屏，会和全量运行时
 * 的状态不一致（本轮踩过：单独重录 4 屏后那 4 屏反而变差）。
 * 这里给每次录制进程一个批次 id，逐屏写盘；比较时若发现各屏批次不一致就告警。
 */
const RECORD_BATCH_ID = `${new Date().toISOString()}-${Math.random().toString(36).slice(2, 8)}`;
const RECORDED_SCRIPTS = [];

function writeGolden(results) {
  mkdirSync(GOLDEN, { recursive: true });
  // 第 307 轮（用户要求）：记录基线来源，比较时据此拒绝非参照来源的基线。
  // 只写模式还不够 —— 还得记下当时页面真正加载的主脚本，
  // 才能证明这份基线是原版界面（index-BBp4hclA.js）而不是我们的产物。
  const scripts = RECORDED_SCRIPTS.slice();
  writeFileSync(
    path.join(GOLDEN, "baseline-source.json"),
    JSON.stringify(
      {
        mode: testMode,
        recordedAt: new Date().toISOString(),
        referenceVersion: (() => {
          try {
            // 第 318 轮（验收发现）：.reference 实际在 app/desktop/out/ 下面，不是仓库根的 out/。
            // 之前这里路径写错，导致 baseline-source.json 里 referenceVersion 一直是 null。
            return readFileSync(path.join(repo, "app/desktop/out/reference-ui/.reference"), "utf8").trim();
          } catch {
            return null;
          }
        })(),
        batchId: RECORD_BATCH_ID,
        mainScript: scripts.find((s) => /assets\/index-[\w-]+\.js$/.test(s)) ?? null,
        allScripts: scripts.slice(0, 12),
      },
      null,
      2,
    ),
  );
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
    // 第 326 轮（验收发现）：**这里之前没写 mask.json**，于是比较时参照侧的遮罩位置永远是空的，
    // 「两边取并集」实际只用了我方一侧 —— 只在参照里有的元素（ComfyUI 行、用户头像）一直没被遮住。
    writeFileSync(path.join(GOLDEN, `${id}.mask.json`), JSON.stringify(r.masks ?? [], null, 1));
    writeFileSync(path.join(GOLDEN, `${id}.batch.json`), JSON.stringify({ batchId: RECORD_BATCH_ID }, null, 1));
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
// 第 307 轮（用户要求）：基线来源不是「原版 4.0.0 界面」就拒绝比较。
// 没有 baseline-source.json 的老基线只警告一次（历史基线），
// 但显式标成 recovered 的一律拒绝 —— 那是自比。
{
  const srcFile = path.join(GOLDEN, "baseline-source.json");
  let src = null;
  try {
    src = JSON.parse(readFileSync(srcFile, "utf8"));
  } catch { /* 老基线没有 */ }
  if (src) {
    const ok =
      src.mode === "reference" &&
      (src.mainScript === null || /assets\/index-[\w-]+\.js$/.test(src.mainScript));
    if (!ok) {
      console.error(`✗ 基线来源不是原版界面：mode=${src.mode} mainScript=${src.mainScript}`);
      console.error(`  文件：${path.relative(repo, srcFile)}`);
      console.error("  用 --record reference 重新录制，或换一个 GOLDEN 目录。");
      process.exit(3);
    }
    console.log(`基线来源：mode=${src.mode} reference=${src.referenceVersion} script=${path.basename(src.mainScript ?? "")}`);
  } else {
    console.log("⚠ 基线没有 baseline-source.json（历史基线），无法核验来源");
  }
}
if (REFERENCE_MISSING.size && baseMode === "golden") {
  console.log(`跳过 ${REFERENCE_MISSING.size} 屏（参照基线里没有，理由见 REFERENCE_MISSING）：`);
  for (const [id, why] of REFERENCE_MISSING) console.log(`  · ${id} —— ${why}`);
}
console.log(`对比 ${baseMode} ↔ ${testMode}，结果在 ${path.relative(repo, outDir)}`);
const base = baseMode === "golden" ? readGolden() : await runMode(baseMode);
const test = await runMode(testMode);
const pages = [];
let failed = false;
for (const p of PAGES) {
  // 参照基线里没有的屏跳过（理由在 REFERENCE_MISSING，已在上面打印）
  if (baseMode === "golden" && REFERENCE_MISSING.has(p.id)) continue;
  // 两边各取一次遮罩，取并集：只按一边遮，另一边会露出残留
  const unionMasks = [...(base[p.id].masks ?? []), ...(test[p.id].masks ?? [])];
  const d = await diff(
    base[p.id].file,
    test[p.id].file,
    path.join(outDir, `${p.id}.diff.png`),
    path.join(outDir, `${p.id}.non-aa.diff.png`),
    unionMasks,
  );
  const newErrors = test[p.id].errors.filter((e) => !base[p.id].errors.includes(e));
  const channelDiffs = {
    netDiff: jsonDiff(comparableNetwork(base[p.id].net), comparableNetwork(test[p.id].net)),
    domDiff: jsonDiff(base[p.id].dom, test[p.id].dom),
    stateDiff: jsonDiff(base[p.id].state, test[p.id].state),
  };

  // 第 344 轮（验收方案 B 加强版）：判失败改按**集合**比，逐项 JSON diff 只留作报告。
  //   DOM   data-action-ui-id 集合差
  //   网络   方法 + 去 query 的路径集合差（不比次数）
  //   WS     wsSent.payload.type 集合差
  // 没在 expected-diffs.json 里登记的差异才算失败。
  const domA = domIdSet(base[p.id].dom);
  const domB = domIdSet(test[p.id].dom);
  const netA = netPathSet(base[p.id].net);
  const netB = netPathSet(test[p.id].net);
  const wsA = wsTypeSet(base[p.id].net);
  const wsB = wsTypeSet(test[p.id].net);
  const setDiffs = {
    dom: {
      refOnly: unallowed(new Set([...domA].filter((x) => !domB.has(x))), p.id, "dom", "refOnly"),
      oursOnly: unallowed(new Set([...domB].filter((x) => !domA.has(x))), p.id, "dom", "oursOnly"),
    },
    net: {
      refOnly: unallowed(new Set([...netA].filter((x) => !netB.has(x))), p.id, "net", "refOnly"),
      oursOnly: unallowed(new Set([...netB].filter((x) => !netA.has(x))), p.id, "net", "oursOnly"),
    },
    ws: {
      refOnly: unallowed(new Set([...wsA].filter((x) => !wsB.has(x))), p.id, "ws", "refOnly"),
      oursOnly: unallowed(new Set([...wsB].filter((x) => !wsA.has(x))), p.id, "ws", "oursOnly"),
    },
  };
  const unregisteredDiffCount =
    setDiffs.dom.refOnly.length + setDiffs.dom.oursOnly.length +
    setDiffs.net.refOnly.length + setDiffs.net.oursOnly.length +
    setDiffs.ws.refOnly.length + setDiffs.ws.oursOnly.length;
  const pixelDiff = d.ratio !== 0;
  // 预算判定：像素差异率（非 AA）用预算而不是「是否为 0」来判。
  // 第 341 轮（验收）：三种状态分开处理
  //   ok      -> budget 是预算，超了就算失败
  //   pending -> guard 只是回归护栏（不许再涨），未解释的差距不算「通过」
  //   invalid -> 该屏标准对照无效，不判通过/失败
  const budgetEntry = RESIDUAL_BUDGET.screens?.[p.id];
  const budgetStatus = budgetEntry?.status ?? (typeof budgetEntry?.budget === "number" ? "ok" : null);
  const budgeted = budgetStatus === "ok" ? budgetEntry.budget : budgetStatus === "pending" ? budgetEntry.guard : null;
  const nonAAPct = d.nonAARatio * 100;
  let budgetVerdict = null;
  if (typeof budgeted === "number") {
    if (nonAAPct > budgeted + BUDGET_TOLERANCE) budgetVerdict = "over";
    else if (nonAAPct < budgeted - BUDGET_TOLERANCE) budgetVerdict = "under";
    else budgetVerdict = "ok";
  }
  const pixelDiffNonAA =
    budgetStatus === "invalid"
      ? false // 标准对照无效的屏不参与判定
      : typeof budgeted === "number"
        ? budgetVerdict === "over"
        : d.nonAARatio !== 0;
  const pageFailed = pixelDiffNonAA || newErrors.length > 0 || unregisteredDiffCount > 0;
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
    budget: budgeted ?? null,
    budgetStatus: budgetStatus ?? null,
    budgetVerdict,
    note: d.note,
    newErrors,
    baseErrors: base[p.id].errors.length,
    ...channelDiffs,
    setDiffs,
    unregisteredDiffCount,
  });
  for (const channel of ["net", "dom", "state"]) {
    writeFileSync(path.join(outDir, `${p.id}.${testMode}.${channel}.json`), JSON.stringify(test[p.id][channel], null, 2));
  }
  console.log(`${p.id.padEnd(18)} 像素原始/非AA ${(d.ratio * 100).toFixed(3).padStart(7)}%/${(d.nonAARatio * 100).toFixed(6)}% (${d.changed ?? "?"}/${d.nonAAChanged ?? "?"})  遮罩 ${((d.maskedRatio ?? 0) * 100).toFixed(2)}%(参照${(base[p.id].masks ?? []).length}/我方${(test[p.id].masks ?? []).length}块)  新增报错 ${newErrors.length}  未登记差异 ${unregisteredDiffCount}${d.note ? "  " + d.note : ""}`);  if (unregisteredDiffCount) {    for (const [kind, v] of Object.entries(setDiffs)) {      for (const side of ["refOnly", "oursOnly"]) {        if (v[side].length) console.log(`    · ${kind}.${side}: ${v[side].slice(0, 8).join(", ")}`);      }    }  }
  if (budgetStatus === "invalid") console.log("    · 标准对照无效，不判通过/失败（见 residual-budget.json）");
  else if (budgetStatus === "pending") console.log(`    · 回归护栏 ${budgeted}%（**不是预算**：差异组成尚未逐项解释）`);
  if (budgetVerdict === "under" && budgetStatus === "ok") {
    console.log(`    ↓ 低于预算 ${budgeted}%，可以把 residual-budget.json 里这一屏调到 ${nonAAPct.toFixed(4)}（只降不升）`);
  }
  if (budgetVerdict === "over") {
    console.log(`    ↑ **超出预算** ${budgeted}% + ${BUDGET_TOLERANCE}，实测 ${nonAAPct.toFixed(4)}% —— 说明出了新问题`);
  }
  for (const e of newErrors.slice(0, 3)) console.log("    " + e);
}
const report = {
  netVolatile: NET_VOLATILE,
  // 第 2030 轮：每屏进入前的夹具状态指纹（诊断用；用于定位状态从哪屏开始漂移）
  fixtureHashes: Object.fromEntries(fixtureHashes),
  pages,
};
writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
process.exit(failed ? 1 : 0);
