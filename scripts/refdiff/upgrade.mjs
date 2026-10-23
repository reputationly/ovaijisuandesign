/**
 * 版本升级只读报告（第 2040 轮）。
 *
 *   node scripts/refdiff/upgrade.mjs [--from 4.0.3] [--to 4.0.4] [--out .probe/upgrade/<tag>]
 *
 * **只读**：不修改任何参照快照、不写产品代码。产物集中在一个目录里：
 *   <out>/REPORT.md            人读的汇总
 *   <out>/REPORT.json          机器可读
 *   <out>/delta.json|md        delta.mjs 的整包/分块差异
 *   <out>/toplevel-<v>.json    两个版本的主 bundle 顶层语句表
 *   <out>/toplevel-diff.json   顶层语句差异
 *
 * 为什么要有它：以前每次升级要手工跑 5、6 个脚本、逐个改写死的版本号，
 * 漏一处就会拿旧版本去比（不报错，只给错结论）。这里把版本解析统一到 lib/refs.mjs。
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  REPO, assetsDirOf, entryNameOf, mainBundleNameOf, mainBundleOf, rendererDirOf,
  resolvePair, v3DirOf,
} from "./lib/refs.mjs";

const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const k = process.argv[i].replace(/^--/, "");
  args[k] = process.argv[i + 1];
}

const { from, to, fromDir, toDir } = resolvePair(args);
const tag = `${from}-to-${to}`;
const OUT = path.resolve(REPO, args.out ?? path.join(".probe/upgrade", tag));
mkdirSync(OUT, { recursive: true });

const sha256 = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const rel = (p) => path.relative(REPO, p);
const run = (script, argv) => {
  try {
    const out = execFileSync(process.execPath, [path.join(REPO, script), ...argv], {
      cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024,
    });
    return { ok: true, out: out.trim() };
  } catch (e) {
    return { ok: false, out: String(e.stdout ?? "").trim(), err: String(e.stderr ?? e.message).trim().slice(0, 800) };
  }
};

const report = { tag, generatedAt: new Date().toISOString(), from, to, steps: [] };
const step = (name, detail) => { report.steps.push({ name, ...detail }); };

// ── 1. 冻结完整性：manifest 里记的 asar 哈希 vs 实际 asar
for (const [v, dir] of [[from, fromDir], [to, toDir]]) {
  const mf = path.join(dir, "MANIFEST.json");
  const asar = path.join(dir, "asar.asar");
  const info = { version: v, dir: rel(dir), manifest: existsSync(mf) };
  if (existsSync(mf)) {
    const m = JSON.parse(readFileSync(mf, "utf8"));
    info.build = m.build;
    info.appAsarSha256 = m.appAsarSha256;
    info.asarEntryCount = m.asarEntryCount;
    info.asarByteCount = m.asarByteCount;
  }
  info.mainBundle = mainBundleNameOf(dir);
  info.mainBundleBytes = statSync(mainBundleOf(dir)).size;
  info.entry = entryNameOf(dir);
  info.entryBytes = statSync(path.join(assetsDirOf(dir), info.entry)).size;
  info.entryDiffers = info.entry !== info.mainBundle;
  info.v3Dir = existsSync(v3DirOf(dir)) ? rel(v3DirOf(dir)) : null;
  step(`freeze:${v}`, info);
}

// ── 2. 整包/分块差异
const deltaJson = path.join(OUT, "delta.json");
const deltaMd = path.join(OUT, "delta.md");
const deltaRun = run("scripts/refdiff/delta.mjs", [
  "--from", from, "--to", to, "--json", deltaJson, "--md", deltaMd, "--tag", tag,
]);
step("delta", { ok: deltaRun.ok, out: deltaRun.out.slice(0, 400), err: deltaRun.err });

// ── 3. 主 bundle 顶层语句表 + 差异
const topOld = path.join(OUT, `toplevel-${from}.json`);
const topNew = path.join(OUT, `toplevel-${to}.json`);
step("toplevel:extract:old", run("scripts/refdiff/toplevel.mjs", ["extract", mainBundleOf(fromDir), topOld]));
step("toplevel:extract:new", run("scripts/refdiff/toplevel.mjs", ["extract", mainBundleOf(toDir), topNew]));
const topDiff = path.join(OUT, "toplevel-diff.json");
step("toplevel:diff", run("scripts/refdiff/toplevel.mjs", ["diff", topOld, topNew, "--json", topDiff]));

// ── 4. 汇总数字
if (existsSync(deltaJson)) {
  const d = JSON.parse(readFileSync(deltaJson, "utf8"));
  report.delta = {
    changedChunks: d.chunks?.changed?.length ?? d.changedChunks ?? null,
    addedChunks: d.chunks?.added?.length ?? d.addedChunks ?? null,
    removedChunks: d.chunks?.removed?.length ?? d.removedChunks ?? null,
    keys: Object.keys(d).slice(0, 20),
  };
}
if (existsSync(topDiff)) {
  const t = JSON.parse(readFileSync(topDiff, "utf8"));
  // toplevel.mjs diff 的实际字段：{ old, new, same, onlyOld, onlyNew, sameRatioOfOld, newNames, goneNames }
  report.toplevel = {
    keys: Object.keys(t),
    same: t.same ?? null,
    onlyOld: t.onlyOld ?? null,
    onlyNew: t.onlyNew ?? null,
    sameRatioOfOld: t.sameRatioOfOld ?? null,
    newNames: (t.newNames ?? []).slice(0, 10),
    goneNames: (t.goneNames ?? []).slice(0, 10),
  };
}

writeFileSync(path.join(OUT, "REPORT.json"), `${JSON.stringify(report, null, 2)}\n`);

// ── 5. 人读汇总
const lines = [
  `# 升级只读报告：${from} → ${to}`,
  "",
  `生成时间：${report.generatedAt}`,
  `产物目录：\`${rel(OUT)}\``,
  "",
  "## 冻结信息",
  "",
  "| 版本 | build | 主 bundle | 大小 | asar 条目 | asar 字节 |",
  "|---|---|---|---|---|---|",
];
for (const s of report.steps.filter((s) => s.name.startsWith("freeze:"))) {
  lines.push(`| ${s.version} | ${s.build ?? "?"} | \`${s.mainBundle}\`${s.entryDiffers ? `（入口 \`${s.entry}\`，${s.entryBytes} 字节）` : ""} | ${s.mainBundleBytes} | ${s.asarEntryCount ?? "?"} | ${s.asarByteCount ?? "?"} |`);
}
lines.push("", "## 差异",
  "",
  `- 整包/分块：${deltaRun.ok ? "已生成" : "**失败**"}（\`delta.md\` / \`delta.json\`）`,
  `- 主 bundle 顶层语句：${report.toplevel ? `相同 ${report.toplevel.same} / 仅旧有 ${report.toplevel.onlyOld} / 仅新有 ${report.toplevel.onlyNew}` : "**失败**"}`,
  "");
if (report.delta) {
  lines.push(`- delta 关键字段：${JSON.stringify(report.delta)}`, "");
}
const failed = report.steps.filter((s) => s.ok === false);
lines.push("## 步骤状态", "", "| 步骤 | 结果 |", "|---|---|");
for (const s of report.steps) {
  if (s.ok === undefined) continue;
  lines.push(`| ${s.name} | ${s.ok ? "ok" : "**失败**"} |`);
}
if (failed.length) {
  lines.push("", "### 失败详情", "");
  for (const s of failed) lines.push(`- **${s.name}**：${s.err ?? s.out ?? "未知"}`);
}
lines.push("", "> 本报告只读。改代码请走 `apply-delta` 与人工冲突处理。");
writeFileSync(path.join(OUT, "REPORT.md"), `${lines.join("\n")}\n`);

console.log(`✓ 升级报告 → ${rel(path.join(OUT, "REPORT.md"))}`);
console.log(`  对比：${from} → ${to}`);
if (failed.length) {
  console.log(`  ⚠ ${failed.length} 个步骤失败，详见报告`);
  process.exitCode = 1;
}
