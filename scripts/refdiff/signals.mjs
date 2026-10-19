// 从渲染层产物里抽「可数的功能面信号」，用来把「两份 bundle 的差异」变成一张能干活的清单。
//
// 这些形状是从 3.0.21 / 4.0.0 两个包实测出来的（bundle 不是压缩产物，名字、字符串都还在）：
//   data-action-ui-id      界面上每个可点元素的稳定 id，界面门禁也按它定位
//   /api/… /__… /files/…   渲染层真正会打的接口路径
//   hilo:…                 自定义事件名 / 通道名
//   t2("a.b.c")            翻译键调用（函数名会因重命名变化，只认「小写点号键」的形状）
//   path:"/…"              路由表里的路径
//
// 只做字面量抽取，不做语义推断：抽不到不等于不存在。
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export const SIGNAL_PATTERNS = {
  // 两种写法都要认：编译产物里是 `"data-action-ui-id": "x"`，我们还原后的源码里是 JSX 属性
  // `data-action-ui-id="x"`。只认前者会把覆盖度算成接近 0。
  uiId: /(?:["']data-action-ui-id["']\s*:\s*"([^"]+)"|data-action-ui-id\s*=\s*"([^"]+)")/g,
  apiPath: /["'`](\/(?:api|__|files)\/[A-Za-z0-9_\-/:{}.*$]*)["'`]/g,
  event: /["'`](hilo:[A-Za-z0-9_\-:.]+)["'`]/g,
  i18nKey: /[A-Za-z_$][\w$]*\("([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)+)"\)/g,
  route: /\bpath\s*:\s*"(\/[^"]*)"/g,
};

const IPC_NAME_HINT = /(CHANNEL|IPC|PORT)/i;
// `group("window", [...])` 展开出来的名字不带 CHANNEL/IPC/PORT 字样，但它们本来就是通道，单独放行。
const isChannelSource = (name) => IPC_NAME_HINT.test(name) || name.startsWith("group(");
// 通道只从两处认：
//   1) 真正的 IPC 对象上的调用第一个实参（`ipcMain.on(...)` / `ipcRenderer.invoke(...)`）；
//   2) 名字里带 CHANNEL/IPC/PORT 的常量表 / 数组里的全部值。
// 早先按「带冒号的字符串字面量」抽，抽出一堆 Tailwind 的 before:mr-4；
// 后来放宽成任意 `x.on(...)`，又抽出一堆 DOM 和 three.js 的事件名（click.drag、fov）。
// 接收者限定成下面这几个是必要的，不是保守。
const IPC_RECEIVER = "(?:ipcMain|ipcRenderer|ipcRendererInternal|_ipcRenderer|webContents|utilityProcess|MessageChannelMain)";
const IPC_CALL = new RegExp(
  `\\b${IPC_RECEIVER}\\s*\\.\\s*(?:handle|handleOnce|on|once|invoke|invokeSync|send|sendSync|sendTo|postMessage|removeHandler|removeAllListeners|removeListener)\\s*\\(\\s*([^,){\\n]{1,80})`,
  "g",
);
const CHANNEL_SHAPE = /^[A-Za-z][A-Za-z0-9_.:-]{2,79}$/;

/**
 * 从 `start`（一个左括号的位置）取到配对的右括号，跳过字符串、模板串和注释。
 * 参照 preload 里的 `IPC_CHANNELS` 有一百多项、夹着 JSDoc，用 `[^{}]{1,6000}` 那种
 * 正则根本框不住，必须真配对。
 */
function sliceBalanced(text, start, open, close) {
  let depth = 0;
  let i = start;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      i += 1;
      while (i < text.length) {
        if (text[i] === "\\") i += 2;
        else if (text[i] === ch) {
          i += 1;
          break;
        } else i += 1;
      }
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end < 0 ? text.length : end + 2;
      continue;
    }
    if (ch === "/" && text[i + 1] === "/") {
      const end = text.indexOf("\n", i + 2);
      i = end < 0 ? text.length : end + 1;
      continue;
    }
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return text.slice(start + 1, i);
    }
    i += 1;
  }
  return text.slice(start + 1);
}

/** 只在最外层出现的字符串字面量。数组里的 `group("hilo", ["hello"])` 这种内嵌调用要跳过，
 *  否则会把 `hello` 这类后缀当成独立通道名收进来。 */
function topLevelStrings(inner) {
  const out = [];
  let depth = 0;
  let i = 0;
  while (i < inner.length) {
    const ch = inner[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const start = i + 1;
      i += 1;
      while (i < inner.length) {
        if (inner[i] === "\\") i += 2;
        else if (inner[i] === ch) break;
        else i += 1;
      }
      if (depth === 0) out.push(inner.slice(start, i));
      i += 1;
      continue;
    }
    if (ch === "/" && inner[i + 1] === "*") {
      const end = inner.indexOf("*/", i + 2);
      i = end < 0 ? inner.length : end + 2;
      continue;
    }
    if (ch === "/" && inner[i + 1] === "/") {
      const end = inner.indexOf("\n", i + 2);
      i = end < 0 ? inner.length : end + 1;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") depth += 1;
    else if (ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
    i += 1;
  }
  return out;
}

/** 一个文本里声明的常量/常量表/数组 → 字面量映射，用来把 `IPC_CHANNELS.FOO` 解回字符串。 */
export function collectConstants(text) {
  const scalars = new Map();
  const members = new Map();
  const named = [];
  // 标量便宜，全收
  for (const m of text.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*"([^"]{1,120})"/g)) {
    scalars.set(m[1], m[2]);
    if (IPC_NAME_HINT.test(m[1])) named.push({ name: m[1], value: m[2] });
  }
  // 表 / 数组要括号配对，只对名字带 CHANNEL/IPC/PORT 的做 —— 全收在 22MB 的主 bundle 上太慢
  for (const m of text.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\{/g)) {
    if (!IPC_NAME_HINT.test(m[1])) continue;
    const inner = sliceBalanced(text, m.index + m[0].length - 1, "{", "}");
    for (const e of inner.matchAll(/([A-Za-z_$][\w$]*)\s*:\s*"([^"]{1,120})"/g)) {
      members.set(`${m[1]}.${e[1]}`, e[2]);
      named.push({ name: `${m[1]}.${e[1]}`, value: e[2] });
    }
  }
  for (const m of text.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]{0,60})?=\s*\[/g)) {
    if (!IPC_NAME_HINT.test(m[1])) continue;
    const inner = sliceBalanced(text, m.index + m[0].length - 1, "[", "]");
    for (const value of topLevelStrings(inner)) {
      members.set(`${m[1]}[${value}]`, value);
      named.push({ name: `${m[1]}[]`, value });
    }
  }
  // 本仓库自己的写法：group("window", ["minimize", …]) 展开成 window:minimize。
  // 名字不是常量，所以上面两条规则都框不到，只能单独认这个 helper。
  for (const m of text.matchAll(/\bgroup\(\s*"([a-z][a-z0-9-]*)"\s*,\s*\[/g)) {
    const inner = sliceBalanced(text, m.index + m[0].length - 1, "[", "]");
    for (const suffix of topLevelStrings(inner)) named.push({ name: `group(${m[1]})[]`, value: `${m[1]}:${suffix}` });
  }
  return { scalars, members, named };
}

/** 解析调用点第一个实参：字面量 / 标识符 / `表.键`。返回 null 表示解不出来（如实报出来）。 */
function resolveChannelArg(raw, consts) {
  const arg = String(raw).trim().replace(/\s+as\s+const$/, "");
  const literal = /^"([^"]*)"$/.exec(arg) ?? /^'([^']*)'$/.exec(arg);
  if (literal) return literal[1];
  if (consts.members.has(arg)) return consts.members.get(arg);
  if (consts.scalars.has(arg)) return consts.scalars.get(arg);
  return null;
}

/**
 * IPC 通道面：调用点能解出来的通道 + 名字带 CHANNEL/IPC/PORT 的常量表里的全部值。
 * 解不出来的实参单独返回，不猜。
 */
export function extractIpcSurface(text, out = null) {
  return extractIpcSurfaceWithConstants(text, collectConstants(text), out);
}

function extractIpcSurfaceWithConstants(text, consts, out = null) {
  const acc = out ?? { channels: new Set(), unresolved: new Set(), exposed: new Set() };
  for (const { name, value } of consts.named) {
    if (isChannelSource(name) && CHANNEL_SHAPE.test(value)) acc.channels.add(value);
  }
  for (const m of text.matchAll(IPC_CALL)) {
    const resolved = resolveChannelArg(m[1], consts);
    if (resolved !== null) {
      if (CHANNEL_SHAPE.test(resolved)) acc.channels.add(resolved);
    } else {
      const raw = m[1].trim();
      if (raw && !/^[([]/.test(raw)) acc.unresolved.add(raw.slice(0, 80));
    }
  }
  for (const m of text.matchAll(/exposeInMainWorld\(\s*"([^"]+)"/g)) acc.exposed.add(m[1]);
  return acc;
}

/** 一个文本里的全部信号，按种类分组。 */
export function extractSignals(text, out = null) {
  const acc = out ?? Object.fromEntries(Object.keys(SIGNAL_PATTERNS).map((k) => [k, new Set()]));
  for (const [kind, pattern] of Object.entries(SIGNAL_PATTERNS)) {
    pattern.lastIndex = 0;
    for (const m of text.matchAll(pattern)) acc[kind].add(m[1] ?? m[2]);
  }
  return acc;
}

/** 目录下所有可读文本文件的信号并集（跳过二进制与大文件）。 */
export function extractSignalsFromTree(root, { maxBytes = 40 * 1024 * 1024, exts = [".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".html", ".json"] } = {}) {
  const acc = Object.fromEntries(Object.keys(SIGNAL_PATTERNS).map((k) => [k, new Set()]));
  let files = 0;
  for (const text of walkTextFiles(root, { maxBytes, exts })) {
    extractSignals(text, acc);
    files += 1;
  }
  return { signals: acc, files };
}

/**
 * 目录下所有可读文本文件的 IPC 面并集。
 * 两遍：先把整棵树的常量表收齐（`IPC_CHANNELS` 声明在一个 chunk、调用在另一个 chunk，
 * 只按单文件解析会有上百个实参解不出来），再逐个文件解析调用点。
 */
export function extractIpcSurfaceFromTree(root, opts = {}) {
  const texts = [...walkTextFiles(root, opts)];
  const consts = { scalars: new Map(), members: new Map(), named: [] };
  for (const text of texts) {
    const c = collectConstants(text);
    for (const [k, v] of c.scalars) if (!consts.scalars.has(k)) consts.scalars.set(k, v);
    for (const [k, v] of c.members) if (!consts.members.has(k)) consts.members.set(k, v);
    consts.named.push(...c.named);
  }
  const acc = { channels: new Set(), unresolved: new Set(), exposed: new Set() };
  for (const text of texts) extractIpcSurfaceWithConstants(text, consts, acc);
  return { ...acc, files: texts.length };
}

function* walkTextFiles(root, { maxBytes = 40 * 1024 * 1024, exts = [".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".html", ".json"] } = {}) {
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let names;
    try {
      names = readdirSync(dir).sort();
    } catch {
      continue;
    }
    for (const name of names) {
      const abs = path.join(dir, name);
      let st;
      try {
        st = statSync(abs);
      } catch {
        continue;
      }
      if (st.isDirectory()) stack.push(abs);
      else if (exts.some((e) => name.endsWith(e)) && st.size <= maxBytes) {
        const buf = readFileSync(abs);
        if (buf.includes(0)) continue; // 二进制
        yield buf.toString("utf8");
      }
    }
  }
}

export function toSortedObject(acc) {
  return Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, [...v].sort()]));
}

export function diffSets(before, after) {
  const out = {};
  for (const kind of Object.keys(SIGNAL_PATTERNS)) {
    const a = before[kind] ?? new Set();
    const b = after[kind] ?? new Set();
    out[kind] = {
      added: [...b].filter((x) => !a.has(x)).sort(),
      removed: [...a].filter((x) => !b.has(x)).sort(),
      before: a.size,
      after: b.size,
    };
  }
  return out;
}

export function intersect(a, b) {
  return [...a].filter((x) => b.has(x)).sort();
}
