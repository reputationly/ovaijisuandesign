/**
 * 对**已装配好**的 v3 产物打补丁，并重生成 bundle-manifest.json。
 *
 *   node app/official-ui/build-v3.mjs <产物目录>
 *
 * 为什么要单独一步：`stage-v3-bundle.mjs` 只负责「把产物放到位」，
 * 补丁与清单重生成放在这里，两者可单独测。
 *
 * **必须重生成清单**：`app/desktop/src/main/v3/bundle.ts` 启动时按 bundle-manifest.json
 * 逐文件核对 sha256，`index.html` 也在清单里 —— 打了补丁不更新清单，应用会拒绝加载 v3。
 */
import { createHash } from "node:crypto";
import { cpSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ASSETS, PATCHES, VERSION } from "./patches-v3.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("用法：node app/official-ui/build-v3.mjs <产物目录>");
if (!existsSync(path.join(out, "index.html"))) throw new Error(`不是 v3 产物目录（缺 index.html）：${out}`);

let failed = 0;
const fail = (msg) => { console.error(msg); failed++; };

// 自有资源：目标已存在就报错（新版本里恰好有同名文件时，悄悄覆盖会让排查无从下手）
for (const a of ASSETS) {
  const from = path.join(here, a.src);
  const to = path.join(out, a.dest);
  if (!existsSync(from)) fail(`资源不存在：${a.src}`);
  else if (existsSync(to)) fail(`资源目标已被占用：${a.dest}`);
  else cpSync(from, to);
}

/** 按前缀找文件（带哈希的文件名写到哈希之前）。 */
const resolve = (prefix) => {
  const dir = path.join(out, path.dirname(prefix));
  const base = path.basename(prefix);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.startsWith(base) && /\.(html|m?js|css)$/.test(n))
    .map((n) => path.join(dir, n));
};

const countIn = (text, find) =>
  typeof find === "string" ? text.split(find).length - 1 : [...text.matchAll(find)].length;
const replaceIn = (text, find, replace) =>
  typeof find === "string" && typeof replace === "string"
    ? text.replaceAll(find, () => replace)
    : text.replace(find, replace);

const applyPatch = (p) => {
  if (typeof p.find !== "string" && !(p.find instanceof RegExp && p.find.global)) {
    fail(`补丁写法不对：${p.id} 的 find 必须是字符串或带 g 的正则`);
    return;
  }
  const files = resolve(p.file);
  if (!files.length) { fail(`补丁找不到文件：${p.id}（${p.file}）`); return; }
  let total = 0;
  let anchors = 0;
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    let head = "", body = text, tail = "";
    if (p.within) {
      const [startMark, endMark] = p.within;
      const start = text.indexOf(startMark);
      if (start < 0) continue;
      anchors += text.split(startMark).length - 1;
      const end = text.indexOf(endMark, start + startMark.length);
      if (end < 0) { fail(`补丁对不上：${p.id} 的结束锚点没找到`); return; }
      head = text.slice(0, start); body = text.slice(start, end); tail = text.slice(end);
    }
    const n = countIn(body, p.find);
    if (n === 0) continue;
    total += n;
    writeFileSync(file, head + replaceIn(body, p.find, p.replace) + tail);
  }
  if (p.within && anchors !== 1) fail(`补丁对不上：${p.id} 的开始锚点出现 ${anchors} 次，应为 1`);
  const want = p.count ?? 1;
  if (total !== want) fail(`补丁对不上：${p.id}（${p.file}）命中 ${total} 次，应为 ${want}`);
};

const ids = new Set();
for (const p of PATCHES) {
  if (ids.has(p.id)) fail(`补丁 id 重复：${p.id}`);
  ids.add(p.id);
  applyPatch(p);
}
if (failed) process.exit(1);

// —— 重生成 bundle-manifest.json：保持原有文件列表与元信息，只重算 sha256 ——
const manifestPath = path.join(out, "bundle-manifest.json");
if (!existsSync(manifestPath)) throw new Error(`缺 bundle-manifest.json：${manifestPath}`);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
let missing = 0;
const regenerated = manifest.files.map((f) => {
  const p = path.join(out, f.path);
  if (!existsSync(p)) { fail(`清单里的文件不见了：${f.path}`); missing++; return f; }
  const sha256 = createHash("sha256").update(readFileSync(p)).digest("hex");
  return { ...f, sha256 };
});
if (missing) process.exit(1);
writeFileSync(manifestPath, `${JSON.stringify({ ...manifest, files: regenerated }, null, 2)}\n`);

console.log(
  `✓ v3 ${VERSION}：${PATCHES.length} 个补丁、${ASSETS.length} 个资源；` +
  `清单已重算 ${regenerated.length} 个文件 → ${path.relative(path.resolve(here, "../.."), out)}`,
);
