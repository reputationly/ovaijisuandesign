#!/usr/bin/env node
/** 用 /tmp/v3-npm-map.json 的**确定映射**重写 ui-components.js 的 npm 导入。 */
import { readFileSync, writeFileSync } from "node:fs";

const TARGET = "app/renderer/src/canvas-v3/ui-components.js";
const { map, missing } = JSON.parse(readFileSync("/tmp/v3-npm-map.json", "utf8"));

// 同名在多包里时，按固定优先级挑一个（prosemirror-* 优先于 @tiptap/core）
const PRIORITY = ["prosemirror-state", "prosemirror-view", "prosemirror-model", "prosemirror-gapcursor",
  "prosemirror-commands", "prosemirror-keymap", "prosemirror-history", "prosemirror-inputrules",
  "prosemirror-transform", "prosemirror-schema-list", "prosemirror-tables",
  "@tiptap/react", "@tiptap/core", "@tiptap/extensions"];
const pick = (pkgs) => PRIORITY.find((p) => pkgs.includes(p)) ?? pkgs[0];

const byPkg = new Map();
for (const [name, pkgs] of Object.entries(map)) {
  const p = pick(pkgs);
  if (!byPkg.has(p)) byPkg.set(p, []);
  byPkg.get(p).push(name);
}
// 未确认的两个
const LOCAL = missing;

let t = readFileSync(TARGET, "utf8");
const before = t;
// 清掉所有 prosemirror-*/@tiptap 的 import
t = t.replace(/^import \{ (.*) \} from "(?:prosemirror-[^"]+|@tiptap\/[^"]+)";\n/gm, "");
const lines = [...byPkg.entries()].sort().map(([p, ns]) => `import { ${ns.sort().join(", ")} } from "${p}";`);
const local = LOCAL.map((n) => `const ${n} = () => void 0;`);
const block = "// ==== npm 导入：按真实导出映射生成（scripts/v3preload/map-npm-exports.mjs）====\n" +
  lines.join("\n") + "\n" + (local.length ? "\n// 三个包里都确认不到，本地占位\n" + local.join("\n") + "\n" : "");
const at = t.indexOf(" */\n") + 4;
writeFileSync(TARGET, t.slice(0, at) + block + t.slice(at), "utf8");
console.log(`重写为 ${lines.length} 条 import，覆盖 ${Object.keys(map).length} 个名字；本地占位 ${LOCAL.length}`);
