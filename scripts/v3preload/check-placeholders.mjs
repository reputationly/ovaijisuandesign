/**
 * L0 占位扫描（第 213 轮）。
 *
 * 为什么需要：四项指标只证明「名字能解析」，占位值和占位函数一路通过所有检查，
 * 还能进入默认开启的路径。这个检查把它们直接判为失败。
 *
 * 判定对象是**声明**，不是任意一行 —— 只有整个函数的实体就是占位才算：
 *   - `function X(...) { return {}; }` / `{ return false; }` / `{ return v; }`
 *   - `const X = () => ({})` / `const X = () => false`
 *   - `const X = new Proxy(...)`
 *   - `const X_BYTES = 0;` / `const X_ROUTES = {};`
 *   - 声明同一行（或紧邻上一行）的注释自述「占位 / 最小实现 / stub」
 *
 * 反例（不算）：`resp.json().catch(() => ({}))`（内联兜底）、
 *   `onCanDrop: () => false`（合法回调）、UI 文案里的「占位节点」。
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = "app/renderer/src";
const SKIP = /-closure\.js$|\.test\.|node_modules/;
const files = [];
(function w(d) {
  for (const e of readdirSync(d)) {
    const p = path.join(d, e);
    const st = statSync(p);
    if (st.isDirectory()) { if (e !== "node_modules") w(p); }
    else if (/\.(js|jsx)$/.test(e) && !SKIP.test(p)) files.push(p);
  }
})(ROOT);

const DECL = /^(?:export\s+)?(?:async\s+)?(?:function\s+([A-Za-z_$][\w$]*)\s*\(|const\s+([A-Za-z_$][\w$]*)\s*=)/;
const STUB_WORDS = /(占位|最小实现|\bstub\b)/i;

function bodyOf(lines, start) {
  // 从声明行开始，按顶层声明边界截断
  let end = start;
  const d0 = (lines[start].match(/[([{]/g) || []).length - (lines[start].match(/[)\]}]/g) || []).length;
  let d = d0;
  if (d <= 0) return [lines[start]];
  for (let j = start + 1; j < Math.min(start + 80, lines.length); j++) {
    d += (lines[j].match(/[({[]/g) || []).length - (lines[j].match(/[)}\]]/g) || []).length;
    end = j;
    if (d <= 0) break;
  }
  return lines.slice(start, end + 1);
}

/**
 * 白名单：确认是**合法**的同类写法，不是占位。每条都要写理由。
 * 键是 `<相对路径>:<名字>`。
 */
const ALLOW = new Map([
  ["canvas-v3/canvas-area-v3.js:getServerDark", "SSR 快照，服务端恒 false 是语义正确"],
  ["canvas-v3/ui-components.js:getHasError", "非 React 路径下的保守实现，调用点有 error 属性兜底"],
  ["canvas-v3/ui-components.js:shouldSuspend", "同上"],
  ["canvas-v3/ui-components.js:dropCursor", "tiptap 插件名，不是函数体"],
  ["canvas-v3/ui-components.js:useButton", "@base-ui 内部 hook 名与本体同名，不是占位"],
  ["canvas-v3/ui-components.js:ok", "校验器返回常量，语义正确"],
  ["vendor-fork/xyflow/react/index.js:GroupNode", "vendor 代码，不在还原范围"],
  ["text-editor/table-document-to-llm-content.js:DerivationEdge", "类型占位组件，语义正确"],
  ["text-editor/build-asr-gateway-request.js:isAsrAudioInput", "MIME 判定返回常量，语义正确"],
  ["generation/user-menu-account-summary.jsx:UserMenuAccountSummary", "账号功能不在范围（返回能力不可用）"],
  ["media-editing/unwrap-mcp-json-record.js:WorkspacePage", "占位页，账号/团队不在范围"],
  ["canvas/pick-canvas-node-tool-apply-details.js:GATEWAY_NOT_READY_HTTP_CLIENT", "gateway 未就绪时的显式拒绝代理，不是掩盖"],
  ["settings/request-prompt-prefill.jsx:OFFICIAL_CONNECTORS", "官方连接器表为空表示未配置，语义正确"],
  ["canvas-v3/canvas-area-v3.js:matchesReferenceSelectionDuration", "参考无时长时的恒 false，语义正确"],
  ["canvas-v3/canvas-area-v3.js:getIdle", "初始空闲态，语义正确"],
  ["canvas-v3/ui-components.js:createChangeEventDetails", "@base-ui 内部占位，本体在外层"],
  ["canvas-v3/ui-components.js:insertCanvasRedrawRegion", "tiptap 插件名，不是函数体"],
  ["workspace/retained-workspace-runtime-host.jsx:useRetainInactiveWorkspaceContent", "保留内容策略为真的实现，非占位"],
  // 登记为「未还原」而不是隐藏：真实现需要 IRendererPersistenceMainService（参照 424276，约 40 行，
  // 依赖一个我们树里完全没有的 DI 服务）。这里保留桩并显式登记，等第 2 批一起做。
  ["workspace/workspace-structure-events.js:ensurePersistenceOwner", "未还原：需要 IRendererPersistenceMainService"],
]);

const hits = [];
for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = DECL.exec(lines[i]);
    if (!m) continue;
    const name = m[1] || m[2];
    const body = bodyOf(lines, i).join("\n");
    // 剥离注释再匹配：否则解释「这里以前是 stub」的注释会被自己判成 stub
    const compact = body
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/^\s*\/\/.*$/gm, " ")
      .replace(/\s+/g, " ");
    const near = (lines[i - 1] ?? "") + " " + lines[i];
    let why = null;
    if (/^\s*(?:export\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*\{\s*return\s*(\{\s*\}|false|true|v|undefined|null)\s*;?\s*\}/.test(compact)) why = "整个函数体就是 return 一个常量";
    else if (/^\s*(?:export\s+)?const\s+\w+\s*=\s*\(\s*\)\s*=>\s*\(\s*\{\s*\}\s*\)\s*;?$/.test(compact.trim())) why = "const X = () => ({})";
    else if (/^\s*(?:export\s+)?const\s+\w+\s*=\s*\(\s*\)\s*=>\s*false\s*;?$/.test(compact.trim())) why = "const X = () => false";
    else if (/^\s*(?:export\s+)?const\s+\w+\s*=\s*new Proxy\(/.test(compact)) why = "Proxy 兜底掩盖错误";
    else if (/^\s*(?:export\s+)?const\s+\w+_BYTES\s*=\s*0\s*;?\s*$/.test(compact.trim())) why = "上限常量为 0";
    // 第 274 轮：**静默 stub** —— 动态 import 的目标被换成「返回 undefined 的对象」。
    // 这类写法让懒加载 chunk 永远拿不到实现，而所有静态检查都通过。
    // 实例：`Promise.resolve().then(() => ({ ep: undefined })).then((n) => n.ep)`
    //      `Promise.resolve().then(() => ({ i: undefined })).then((n) => n.i)`
    else if (/Promise\.resolve\(\)\.then\(\(?\)?\s*=>\s*\(\{\s*[A-Za-z_$][\w$]*:\s*undefined\s*\}\)\)/.test(compact)) why = "动态 import 被换成返回 undefined 的静默 stub";
    else if (/^\s*(?:export\s+)?const\s+\w+_ROUTES\s*=\s*\{\s*\}\s*;?\s*$/.test(compact.trim())) why = "路由常量为空对象";
    else if (STUB_WORDS.test(near) && !/["'`]/.test(lines[i])) why = "声明旁的注释自述占位";
    const rel = f.replace(ROOT + "/", "");
    if (why && !ALLOW.has(`${rel}:${name}`)) hits.push({ f, line: i + 1, name, why });
  }
}
console.log(`占位扫描：${files.length} 个文件，命中 ${hits.length} 处`);
for (const h of hits) console.log(`  ${h.f.replace(ROOT + "/", "")}:${h.line}  ${h.name}  — ${h.why}`);
process.exit(hits.length ? 1 : 0);
