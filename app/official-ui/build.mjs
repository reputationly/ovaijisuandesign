// 生成桌面端用的界面：把参照版本的渲染层原样拷到 app/desktop/out/official-ui/，再打上 patches.mjs 里的补丁。
//
//   node app/official-ui/build.mjs
//
// 每个补丁必须恰好命中声明的次数，否则构建失败：换了新版本的渲染层、补丁对不上时要第一时间知道，
// 而不是悄悄带着没打上的补丁发出去。
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ASSETS, PATCHES, VERSION } from "./patches.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const src = path.join(repo, "reference", VERSION, "app/out/renderer");
// --raw：原样拷一份、不打补丁、不加资源，输出到 official-ui-raw，给还原版做逐屏对比的基准。
const RAW = process.argv.includes("--raw");
const out = path.join(repo, RAW ? "app/desktop/out/official-ui-raw" : "app/desktop/out/official-ui");

if (!existsSync(path.join(src, "index.html"))) throw new Error(`找不到渲染层 ${src}`);
rmSync(out, { recursive: true, force: true });
cpSync(src, out, { recursive: true });

if (RAW) {
  console.log(`official-ui ${VERSION}（原样，不打补丁）→ ${path.relative(repo, out)}`);
  process.exit(0);
}

let failed = 0;
const fail = (msg) => {
  console.error(msg);
  failed++;
};

// 我们自己的资源（logo、字体）拷进产物。目标已存在就报错：新版本渲染层里恰好有同名文件时，
// 悄悄覆盖掉会让那边的界面换了图还查不出原因。
for (const a of ASSETS) {
  const from = path.join(here, a.src);
  const to = path.join(out, a.dest);
  if (!existsSync(from)) fail(`资源不存在：${a.src}`);
  else if (existsSync(to)) fail(`资源目标已被占用：${a.dest}`);
  else cpSync(from, to);
}

// 文件名里带构建哈希，补丁按前缀找文件（"assets/index-" 匹配主 bundle）。
const resolve = (prefix) => {
  const dir = path.join(out, path.dirname(prefix));
  const base = path.basename(prefix);
  const hits = readdirSync(dir).filter((n) => n.startsWith(base) && (prefix.endsWith(".html") || /\.(m?js|css)$/.test(n)));
  return hits.map((n) => path.join(dir, n));
};

// find 可以是字符串，也可以是带 g 的正则（replace 可以是函数，同 String.prototype.replace）。
const countIn = (text, find) =>
  typeof find === "string" ? text.split(find).length - 1 : [...text.matchAll(find)].length;
const replaceIn = (text, find, replace) =>
  typeof find === "string" && typeof replace === "string" ? text.replaceAll(find, () => replace) : text.replace(find, replace);

// within: [开始锚点, 结束锚点] 把替换限定在一段区间里（比如只动 i18n 资源对象，不碰同名的模型 id）。
// 开始锚点在所有匹配文件里合计必须恰好出现一次，结束锚点取开始之后第一次出现的位置。
const applyPatch = (p) => {
  if (typeof p.find !== "string" && !(p.find instanceof RegExp && p.find.global)) {
    fail(`补丁写法不对：${p.id} 的 find 必须是字符串或带 g 的正则`);
    return;
  }
  let total = 0;
  let anchors = 0;
  for (const file of resolve(p.file)) {
    const text = readFileSync(file, "utf8");
    let head = "";
    let body = text;
    let tail = "";
    if (p.within) {
      const [startMark, endMark] = p.within;
      const start = text.indexOf(startMark);
      if (start < 0) continue;
      anchors += text.split(startMark).length - 1;
      const end = text.indexOf(endMark, start + startMark.length);
      if (end < 0) {
        fail(`补丁对不上：${p.id} 的结束锚点没找到`);
        return;
      }
      head = text.slice(0, start);
      body = text.slice(start, end);
      tail = text.slice(end);
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
console.log(`official-ui ${VERSION}：${PATCHES.length} 个补丁、${ASSETS.length} 个资源 → ${path.relative(repo, out)}`);
