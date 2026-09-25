// 生成桌面端用的界面：把参照版本的渲染层原样拷到 app/desktop/out/official-ui/，再打上 patches.mjs 里的补丁。
//
//   node app/official-ui/build.mjs
//
// 每个补丁必须恰好命中声明的次数，否则构建失败：换了新版本的渲染层、补丁对不上时要第一时间知道，
// 而不是悄悄带着没打上的补丁发出去。
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PATCHES, VERSION } from "./patches.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const src = path.join(repo, "reference", VERSION, "app/out/renderer");
const out = path.join(repo, "app/desktop/out/official-ui");

if (!existsSync(path.join(src, "index.html"))) throw new Error(`找不到渲染层 ${src}`);
rmSync(out, { recursive: true, force: true });
cpSync(src, out, { recursive: true });

// 文件名里带构建哈希，补丁按前缀找文件（"assets/index-" 匹配主 bundle）。
const resolve = (prefix) => {
  const dir = path.join(out, path.dirname(prefix));
  const base = path.basename(prefix);
  const hits = readdirSync(dir).filter((n) => n.startsWith(base) && (prefix.endsWith(".html") || /\.(m?js|css)$/.test(n)));
  return hits.map((n) => path.join(dir, n));
};

let failed = 0;
for (const p of PATCHES) {
  let total = 0;
  for (const file of resolve(p.file)) {
    const text = readFileSync(file, "utf8");
    const n = text.split(p.find).length - 1;
    if (n === 0) continue;
    total += n;
    writeFileSync(file, text.replaceAll(p.find, p.replace));
  }
  const want = p.count ?? 1;
  if (total !== want) {
    console.error(`补丁对不上：${p.id}（${p.file}）命中 ${total} 次，应为 ${want}`);
    failed++;
  }
}
if (failed) process.exit(1);
console.log(`official-ui ${VERSION}：${PATCHES.length} 个补丁 → ${path.relative(repo, out)}`);
