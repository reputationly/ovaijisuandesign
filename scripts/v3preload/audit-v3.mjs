#!/usr/bin/env node
/**
 * canvas-v3 审计（第 118 轮，按用户建议的口径重写）。
 *
 * 每轮必须报四个数，前三项任何非 0 都不算通过：
 *   1. 不同名字缺口数（不是出现次数）
 *   2. 解析失败文件数（每个文件单独过 esbuild）
 *   3. 跨文件重复声明的名字数
 *   4. unbound 出现次数（仅作参考）
 *
 * 第 7～11 项是后来按实撞过的 bug 加的防回流检查：日志上传、JSX `__jsx` import、
 * 参数改名遮蔽、重复键覆盖、fragment 的 `jsx-runtime` 绑定。任何一项非 0 都不算通过。
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = "app/renderer/src/canvas-v3";
const ESBUILD = "node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/bin/esbuild";
const files = readdirSync(ROOT).filter((f) => /\.(js|jsx)$/.test(f)).map((f) => path.join(ROOT, f)).sort();

// ---- 2. 解析失败（逐文件 esbuild）----
const parseFailures = [];
for (const f of files) {
  try {
    execFileSync(ESBUILD, [f, "--format=esm", "--outfile=/dev/null", "--loader:.js=jsx", "--log-level=error"], { stdio: "pipe" });
  } catch (e) {
    const msg = String(e.stderr ?? "").split("\n").find((l) => l.includes("ERROR")) ?? "unknown";
    parseFailures.push({ file: f, error: msg.trim().slice(0, 90) });
  }
}

// ---- 1 & 4. 缺口（用 check-undef 的输出，按名字去重）----
let undefOut = "";
try {
  undefOut = execFileSync(process.execPath, ["scripts/desource/check-undef.mjs"], { stdio: "pipe", maxBuffer: 256 * 1024 * 1024 }).toString();
} catch (e) {
  // check-undef 把结果写到 stderr（它是一条自检命令，非零退出）
  undefOut = String(e.stderr ?? "") || String(e.stdout ?? "");
}
const perFile = new Map();
let occurrences = 0;
for (const line of undefOut.split("\n")) {
  const m = /^(app\/renderer\/src\/canvas-v3\/[^:]+):\d+:\d+ \[(unbound|parse|missing export|local-export|missing object property|missing-prototype-mutation)\]\s*(.*)$/.exec(line);
  if (!m) continue;
  const [, file, kind, rest] = m;
  if (kind !== "unbound") continue;
  occurrences++;
  const name = rest.trim().split(/\s/)[0];
  if (!perFile.has(file)) perFile.set(file, new Set());
  perFile.get(file).add(name);
}

// ---- 3. 跨文件重复声明（第 214 轮：范围扩到全树，不再只扫 canvas-v3/）----
// 之前只扫 canvas-v3/，所以 workspace/ 下 3 份 ProjectQueryError 之类看不到。
const TREE_ROOT = "app/renderer/src";
const SKIP_TREE = /-closure\.js$|\.test\.|node_modules|\/vendor-fork\//;
const treeFiles = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = path.join(d, e);
    const st = statSync(p);
    if (st.isDirectory()) { if (e !== "node_modules") walk(p); }
    else if (/\.(js|jsx)$/.test(e) && !SKIP_TREE.test(p)) treeFiles.push(p);
  }
})(TREE_ROOT);
const decls = new Map();
for (const f of treeFiles) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/^(?:export\s+)?(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    const n = m[1];
    if (!decls.has(n)) decls.set(n, new Set());
    decls.get(n).add(f);
  }
}
const crossDup = [...decls.entries()].filter(([, s]) => s.size > 1);

// 区分「同一实体被抄了两份」和「同名但实现不同」——后者不能合并，只做记录。
import { createHash } from "node:crypto";
const bodyHash = (file, name) => {
  const src = readFileSync(file, "utf8");
  const m = new RegExp(`^(?:export\\s+)?(?:async\\s+)?(?:function|const|let|var|class)\\s+${name.replace(/[$]/g, "\\$")}(?![\\w$])`, "m").exec(src);
  if (!m) return null;
  const next = new RegExp("^(?:export\\s+)?(?:async\\s+)?(?:function|const|let|var|class)\\s+[A-Za-z_$][\\w$]*", "gm");
  next.lastIndex = m.index + 1;
  const n2 = next.exec(src);
  const body = src.slice(m.index, n2 ? n2.index : src.length);
  const stripped = body.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
  return createHash("sha256").update(stripped.replace(/\s+/g, "")).digest("hex").slice(0, 12);
};
const sameEntity = [], sameNameDiffBody = [];
// 第 273 轮：整份镜像的第三方 chunk 之间会有真正的同体重复。
// 参照发行包本身就是**每个懒加载 chunk 各自内联一份 three.js**
// （editor-interface / panorama-viewer 各带一份），这是打包产物的形态，不是我们抄两份。
// 只在这两个镜像文件之间出现的重复，按「镜像保真」处理，不算违规。
const MIRROR_FILES = /export-engine\/(editor-interface|panorama-viewer)\.js$/;
const bothMirrored = (files) => files.length === 2 && files.every((f) => MIRROR_FILES.test(f));
// 第 214 轮：一行小常量（`const MIN_SCALE = 0.5;`）在两个文件里相同是巧合，不是重复。
// 「同一实体」要求函数体有实质内容：去空白后 ≥ 120 字符，或跨 ≥ 3 行。
const MIN_ENTITY_CHARS = 120;
const isSubstantial = (hash) => hash !== null; // bodyHash 返回 null 表示找不到体
const bodySize = (file, name) => {
  const src = readFileSync(file, "utf8");
  const re = new RegExp(`^(?:export\\s+)?(?:async\\s+)?(?:function|const|let|var|class)\\s+${name.replace(/[$]/g, "\\$")}[^\\n]*`, "m");
  const m = re.exec(src);
  return m ? m[0].replace(/\s+/g, "").length : 0;
};
for (const [n, s] of crossDup) {
  const files2 = [...s];
  const hashes = new Set(files2.map((f) => bodyHash(f, n)));
  if (hashes.size !== 1) { sameNameDiffBody.push(n); continue; }
  // 同一实体：再看体量，太小的是巧合
  const trivial = files2.every((f) => bodySize(f, n) < MIN_ENTITY_CHARS);
  if (!trivial && bothMirrored(files2)) { sameNameDiffBody.push(n); continue; }
  (trivial ? sameNameDiffBody : sameEntity).push(n);
}

// ---- 汇总 ----
const distinctNames = new Set();
for (const s of perFile.values()) for (const n of s) distinctNames.add(n);

console.log(`canvas-v3 审计（${files.length} 个文件）`);
console.log(`  1. 不同名字缺口      : ${distinctNames.size}`);
console.log(`  2. 解析失败文件      : ${parseFailures.length}`);
console.log(`  3. 跨文件重复声明    : ${sameEntity.length} 违规（同一实体被抄两份）`
  + ` / ${sameNameDiffBody.length} 非违规（同名但实现不同，属巧合碰撞）`);
if (sameEntity.length) {
  console.log("     违规明细：");
  for (const n of sameEntity) {
    const s = new Map(crossDup).get(n);
    console.log(`       ${n}: ${[...s].map((x) => path.basename(x)).join(", ")}`);
  }
}
console.log(`  4. unbound 出现次数  : ${occurrences}`);
// 第 160 轮：canvas-v3 之外的树也必须过同一把尺子
{
  let out = "";
  try { out = execFileSync(process.execPath, ["scripts/desource/check-undef.mjs"], { stdio: "pipe", maxBuffer: 512 * 1024 * 1024 }).toString(); }
  catch (e) { out = String(e.stderr ?? ""); }
  const files = new Map();
  for (const l of out.split("\n")) {
    if (!l.includes("[unbound]")) continue;
    const f = l.split(":")[0];
    if (f.includes("canvas-v3/")) continue;
    // 第 167 轮：这几个是「已取回但未接线」的设施层草案，未接入任何应用代码，
    // 故不计入「应用缺口」；单独统计并显式打印，避免变成第二个假绿。
    if (f.endsWith("workspace-facilities.js") || f.endsWith("workspace-structure-runtime.js") || f.endsWith("workspace-facilities-closure.js") || f.endsWith("workspace-resource-closure.js")) {
      (globalThis.__draft ??= new Map()).set(f, (globalThis.__draft.get(f) ?? 0) + 1);
      continue;
    }
    files.set(f, (files.get(f) ?? 0) + 1);
  }
  const totalAll = [...files.values()].reduce((a, b) => a + b, 0);
  const draft = globalThis.__draft ?? new Map();
  if (draft.size) {
    const dt = [...draft.values()].reduce((a, b) => a + b, 0);
    console.log(`  5b. 未接线草案（不计入应用缺口）: ${dt} 处 / ${draft.size} 个文件`);
  }
  console.log(`  5. 全树缺口（canvas-v3 之外）: ${totalAll} 处 / ${files.size} 个文件`);
  for (const [f, c] of [...files].sort((a, b) => b[1] - a[1]).slice(0, 6))
    console.log(`       ${String(c).padStart(3)}  ${f.replace("app/renderer/src/", "")}`);
}

if (parseFailures.length) {
  console.log("\n解析失败：");
  for (const p of parseFailures) console.log(`  ✗ ${p.file}\n      ${p.error}`);
}
if (distinctNames.size) {
  console.log("\n缺口按文件（不同名字数）：");
  for (const [f, s] of [...perFile.entries()].sort((a, b) => b[1].size - a[1].size)) {
    console.log(`  ${String(s.size).padStart(5)}  ${f}`);
  }
}
if (crossDup.length) {
  console.log("\n跨文件重复（前 10）：");
  for (const [n, s] of crossDup.slice(0, 10)) console.log(`  ${n}: ${[...s].map((x) => path.basename(x)).join(", ")}`);
}

// ---- 6. Context 声明数对账 ----
// 为什么查这个：还原时曾出现同一 Context 在两个文件里各声明一份 —— Provider 挂在
// 一份上、消费者读另一份，运行时永远拿到默认值（WorkspaceStructureContext、
// ActionsContext、ResourceDetailContext 等 11 处）。上面的「跨文件重复声明」
// 看语句体，一行 `createContext(null)` 太短被当成巧合漏掉；这里改看计数。
//
// 口径：名字剥掉 rollup 的 $N 后缀；参照侧把 assets/ 全部 chunk 一起数
// （懒加载 chunk 会各自内联同一份声明，两边镜像结构相同所以按总数对齐）。
// 我们的声明数不得超过参照数；确需多声明的写进 context-dup-allowlist.json（必须带原因）。
// 调试用 OV_AUDIT_SRC 可以换源码根（比如对 git archive 出的旧树跑这项）。
import { resolveRefDir, assetsDirOf } from "../refdiff/lib/refs.mjs";
const CTX_ALLOWLIST_FILE = "scripts/v3preload/context-dup-allowlist.json";
const contextDupes = [];
{
  const stripSuffix = (n) => n.replace(/\$\d+$/, "");
  const countContexts = (dir, pattern) => {
    const counts = new Map();
    const stack = [dir];
    while (stack.length) {
      const d = stack.pop();
      for (const e of readdirSync(d)) {
        const p = path.join(d, e);
        const st = statSync(p);
        if (st.isDirectory()) { if (e !== "node_modules") stack.push(p); continue; }
        if (!pattern.test(e)) continue;
        const src = readFileSync(p, "utf8");
        for (const m of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:reactExports\.)?createContext\s*\(/g)) {
          const n = stripSuffix(m[1]);
          counts.set(n, (counts.get(n) ?? 0) + 1);
        }
      }
    }
    return counts;
  };
  const srcRoot = process.env.OV_AUDIT_SRC ?? TREE_ROOT;
  const ourCounts = countContexts(srcRoot, /\.(js|jsx)$/);
  const refVersion = JSON.parse(readFileSync("scripts/reference-version.json", "utf8")).version;
  const refCounts = countContexts(assetsDirOf(resolveRefDir(refVersion)), /\.js$/);
  const allowlist = new Map();
  for (const entry of JSON.parse(readFileSync(CTX_ALLOWLIST_FILE, "utf8"))) {
    allowlist.set(entry.name, entry.reason ?? null);
  }
  const allowlisted = [];
  const stale = [];
  for (const [name, ours] of [...ourCounts].sort()) {
    const ref = refCounts.get(name) ?? 0;
    if (ours <= ref) continue;
    if (allowlist.has(name)) {
      if (!allowlist.get(name)) contextDupes.push({ name, ours, ref, note: "allowlist 条目缺原因" });
      else allowlisted.push(name);
      continue;
    }
    contextDupes.push({ name, ours, ref });
  }
  for (const name of allowlist.keys()) {
    const ours = ourCounts.get(name) ?? 0;
    const ref = refCounts.get(name) ?? 0;
    if (ours <= ref) stale.push(name);
  }
  console.log(`  6. Context 声明对账     : ${contextDupes.length} 处超过参照（allowlist ${allowlisted.length} 项）`);
  for (const d of contextDupes) console.log(`       ${d.name}: 我们 ${d.ours} / 参照 ${d.ref}${d.note ? ` — ${d.note}` : ""}`);
  if (stale.length) console.log(`     （allowlist 里已不超额的条目，可清理：${stale.join(", ")}）`);
}

// 7. 日志上传防回流：产品没有日志上传服务、不向对方云端发送（docs/ov-changes.md #11）。
//    「上传日志」的界面入口和桥接已整体移除，这些标识符一旦出现就是回流。
const UPLOAD_BAN_PATTERNS = ["uploadLogs", "log:upload", '"upload-logs"'];
const uploadHits = [];
const uploadScanFiles = [];
function scanUpload(dir) {
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) { if (e !== "node_modules") scanUpload(p); }
    else if (/\.(js|jsx|ts|tsx|json)$/.test(e) && !e.endsWith(".d.ts")) uploadScanFiles.push(p);
  }
}
for (const root of ["app/renderer/src", "app/desktop/src"]) {
  uploadScanFiles.length = 0;
  scanUpload(root);
  for (const file of uploadScanFiles) {
    const text = readFileSync(file, "utf8");
    for (const pat of UPLOAD_BAN_PATTERNS) {
      if (text.includes(pat)) uploadHits.push(`${file}: ${pat}`);
    }
  }
}
console.log(`  7. 日志上传防回流       : ${uploadHits.length} 处违规（日志上传已有意移除，见 ov-changes #11）`);
for (const h of uploadHits) console.log(`       ${h}`);


// 8. JSX 文件的 __jsx import：vite 把 JSX 编译成 __jsx(...)，文件必须自己引入，禁止全局兜底。
const missingJsx = [];
function scanJsxImports(dir) {
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) { if (e !== "node_modules") scanJsxImports(p); }
    else if (e.endsWith(".jsx") && p !== path.join("app/renderer/src", "main.jsx")) {
      const text = readFileSync(p, "utf8");
      if (/<[A-Za-z][\w.:-]*(\s|>|\/)/.test(text) && !/import\s*\{[^}]*__jsx[^}]*\}\s*from\s*["'][^"']*jsx-runtime\.js["']/.test(text)) missingJsx.push(p);
    }
  }
}
scanJsxImports("app/renderer/src");
console.log(`  8. JSX __jsx import     : ${missingJsx.length} 个文件缺 import`);
for (const h of missingJsx) console.log(`       ${h}`);

// 9 & 10. T-5 的同类扫描（`docs/cloud-platform-plan.md` 第 1 节 T-5、第 8.7 节 1 条）：
//   - 参数改名成 `xxx2`，函数体仍引用 `xxx`，而 `xxx` 在模块里另有绑定
//     （`MediaGenCardLayout` 的 `{media}` 就是这一类：React 对函数子节点静默不渲染）；
//   - 对象字面量 / 解构里的重复键（`validateSearch` 被写成第二个 `component` 那一类）。
// 两者都查不出未绑定名，所以 `check-undef` 抓不到；这里各自独立成项。
const shadowScan = (script) => {
  try {
    const out = execFileSync(process.execPath, [script, process.env.OV_AUDIT_SRC ?? TREE_ROOT, "--json"], { stdio: "pipe", maxBuffer: 64 * 1024 * 1024 }).toString();
    return JSON.parse(out);
  } catch (e) {
    // 解析失败时脚本返回 2，但 JSON 仍然有效。
    try { return JSON.parse(String(e.stdout ?? "")); } catch { return { findings: [{ file: script, line: 0, error: String(e.stderr ?? e) }], parseFailures: [{ file: script, error: String(e.stderr ?? e).slice(0, 120) }] }; }
  }
};
const paramShadow = shadowScan("scripts/v3preload/scan-param-shadow.mjs");
const shadowHits = (paramShadow.findings ?? []).filter((f) => !f.error);
console.log(`  9. 参数改名遮蔽         : ${shadowHits.length} 处（参数名带数字后缀，函数体仍用原名并绑到函数外）`);
for (const f of shadowHits) console.log(`       ${f.file}:${f.line}  参数 ${f.parameter} / 引用 ${f.referenced}`);
const dupKeys = shadowScan("scripts/v3preload/scan-dup-keys.mjs");
const dupHits = (dupKeys.findings ?? []).filter((f) => !f.error);
console.log(` 10. 重复键覆盖           : ${dupHits.length} 处（对象字面量/解构同名键后者覆盖前者）`);
for (const f of dupHits) console.log(`       ${f.file}:${f.line}  ${f.name} ×${f.count}`);

// 11. JSX fragment 的绑定：`<>…</>` 编译成 `jsxRuntimeExports.Fragment`，而 `{…}` 走
//     `__jsx(...)`。一个文件如果只 import 了 `__jsx`、却用了 fragment，运行期就是
//     `ReferenceError: jsxRuntimeExports is not defined` —— 而且**只在用到 fragment 的
//     那条分支上**炸。实测栽过：`chat/design-execute/execute-card.jsx` 的产出分支，
//     空产出时完全看不出来（T-1 修好 `outputs=0` 之后它才第一次被走到，卡片直接白屏）。
const fragmentFiles = [];
function scanFragments(dir) {
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) { if (e !== "node_modules") scanFragments(p); }
    else if (/\.(js|jsx)$/.test(e)) {
      const text = readFileSync(p, "utf8");
      if (!/<>(\s|$)|<\/\s*>/.test(text)) continue;
      if (/import\s+\w+\s+from\s+["']react\/jsx-runtime["']/.test(text)) continue;
      if (/jsxRuntimeExports\s*=/.test(text)) continue;
      fragmentFiles.push(p);
    }
  }
}
scanFragments("app/renderer/src");
console.log(` 11. JSX fragment 绑定    : ${fragmentFiles.length} 个文件用了 fragment 但没引 jsx-runtime`);
for (const f of fragmentFiles) console.log(`       ${f}`);

// 验收口径：只把「同一实体被抄两份」算违规；同名不同实现是不同实体，不算。
const ok = distinctNames.size === 0 && parseFailures.length === 0 && sameEntity.length === 0 && contextDupes.length === 0 && uploadHits.length === 0 && missingJsx.length === 0
  && shadowHits.length === 0 && dupHits.length === 0 && fragmentFiles.length === 0
  && (paramShadow.parseFailures ?? []).length === 0 && (dupKeys.parseFailures ?? []).length === 0;
console.log(`\n${ok ? "✓ 全部通过" : "✗ 未达标（缺口/解析失败/重复声明/Context 超额/改名遮蔽/重复键/fragment 绑定必须全为 0）"}`);
process.exit(ok ? 0 : 1);
