// 冻结一个安装好的参照应用：把 asar 里的代码原样解出来，把旁挂资源里要读的目录拷一份，
// 再给「整个 .app 里的每个文件」记下 SHA-256。产出一个离线可比对的参照目录。
//
//   node scripts/refdiff/freeze.mjs --app "/Applications/MiniMax Design.app" --out .probe/reference/4.0.0
//
// 为什么要有这一步：参照应用是 Velopack 装上去的，会在用户机器上被自动升级。
// 一旦字节变了，后面所有「相对参照的差异」都会失去基准。MANIFEST.json 是纯内容清单，
// 不含时间戳，因此两份冻结结果可以直接按字节比。
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { AsarArchive, readPlistVersion } from "./asar.mjs";

// 要原样拷出来的旁挂资源：会被后续还原工作直接阅读的代码和配置。
const COPY_DIRS = [
  "gateway/dist",
  "gateway/assets",
  "mcp-tools",
  "mcp-tools-v3",
  "opencode-plugin-hilo",
  "opencode-plugin-trace",
  "agent-profiles",
  "app-resources",
  "conf",
  "clip-studio-export",
  "bundled-plugins",
];
const COPY_FILES = ["gateway/package.json"];

// 只记哈希不拷贝：大二进制或用完即弃的运行时件。
const HASH_ONLY_PREFIXES = [
  "opencode/",
  "ffmpeg/",
  "project-templates/",
  "velopack-runtime/",
  "sq.version",
  "icon.icns",
  "default_app.asar",
];

const IMAGE_EXT = new Set([".png", ".ico", ".icns", ".jpg", ".jpeg", ".gif", ".svg", ".mp4", ".wav", ".zip", ".node", ".dylib", ".so"]);

function sha256File(abs) {
  const hash = createHash("sha256");
  const fd = readFileSync(abs);
  hash.update(fd);
  return hash.digest("hex");
}

function walk(abs, rel = "", out = new Map()) {
  for (const name of readdirSync(abs).sort()) {
    const childAbs = path.join(abs, name);
    const childRel = rel ? `${rel}/${name}` : name;
    const st = lstatSync(childAbs);
    if (st.isSymbolicLink()) out.set(childRel, { kind: "symlink", target: readlinkSync(childAbs) });
    else if (st.isDirectory()) walk(childAbs, childRel, out);
    else out.set(childRel, { kind: "file", size: st.size, sha256: sha256File(childAbs) });
  }
  return out;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    args[key] = value;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const appPath = path.resolve(args.app ?? "/Applications/MiniMax Design.app");
  if (!existsSync(path.join(appPath, "Contents/Info.plist"))) {
    throw new Error(`不像是一个 .app：${appPath}`);
  }

  const info = readPlistVersion(readFileSync(path.join(appPath, "Contents/Info.plist"), "utf8"));
  const outPath = path.resolve(args.out ?? path.join(".probe/reference", info.version));
  const resources = path.join(appPath, "Contents/Resources");

  rmSync(outPath, { recursive: true, force: true });
  mkdirSync(outPath, { recursive: true });

  // 1. asar 里的代码：out/main、out/preload、out/renderer（含 v3）、根 package.json
  const asarPath = path.join(resources, "app.asar");
  const archive = new AsarArchive(asarPath);
  const asarEntries = {};
  let asarBytes = 0;
  for (const [entryPath, meta] of archive.entries()) {
    const dest = path.join(outPath, "asar", entryPath);
    mkdirSync(path.dirname(dest), { recursive: true });
    const buf = archive.read(entryPath);
    writeFileSync(dest, buf);
    asarEntries[entryPath] = { size: meta.size, sha256: createHash("sha256").update(buf).digest("hex") };
    asarBytes += meta.size;
  }
  archive.close();

  // 2. 旁挂资源：要读的拷贝，大件只记哈希
  const sidecar = {};
  const copied = [];
  const hashedOnly = [];
  const copyFiles = new Set(COPY_FILES);
  for (const dir of COPY_DIRS) {
    const abs = path.join(resources, dir);
    if (!existsSync(abs)) continue;
    cpSync(abs, path.join(outPath, "sidecar", dir), { recursive: true });
    copied.push(dir);
    for (const [rel, meta] of walk(abs, dir)) sidecar[rel] = meta;
  }
  for (const rel of copyFiles) {
    const abs = path.join(resources, rel);
    if (!existsSync(abs)) continue;
    mkdirSync(path.dirname(path.join(outPath, "sidecar", rel)), { recursive: true });
    cpSync(abs, path.join(outPath, "sidecar", rel));
    copied.push(rel);
    sidecar[rel] = { kind: "file", size: lstatSync(abs).size, sha256: sha256File(abs) };
  }

  // 3. 整个 .app 的清单：拷贝的和只记哈希的，都在同一张表里，防止参照悄悄换字节
  const bundle = walk(appPath);
  for (const [rel, meta] of bundle) {
    const resourceRel = rel.startsWith("Contents/Resources/") ? rel.slice("Contents/Resources/".length) : null;
    if (resourceRel === null || resourceRel === "app.asar") continue;
    if (resourceRel in sidecar) continue;
    if (HASH_ONLY_PREFIXES.some((p) => resourceRel.startsWith(p)) || IMAGE_EXT.has(path.extname(resourceRel).toLowerCase())) {
      hashedOnly.push(resourceRel);
      sidecar[resourceRel] = meta;
    } else if (meta.kind === "file" && !copied.some((c) => resourceRel === c || resourceRel.startsWith(`${c}/`))) {
      // 兜底：既没拷贝也没特意记录的资源，仍然进哈希表
      hashedOnly.push(resourceRel);
      sidecar[resourceRel] = meta;
    }
  }

  const manifest = {
    version: info.version,
    build: info.build,
    appAsarSha256: sha256File(asarPath),
    asarEntryCount: Object.keys(asarEntries).length,
    asarByteCount: asarBytes,
    asar: asarEntries,
    sidecar,
    copied: copied.sort(),
    hashedOnly: [...new Set(hashedOnly)].sort(),
    bundle,
  };
  writeFileSync(path.join(outPath, "MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  const freeze = {
    sourceApp: appPath,
    version: info.version,
    build: info.build,
    tool: "scripts/refdiff/freeze.mjs",
    note: "MANIFEST.json 只记内容，不含时间戳；这份文件记来源，比对时忽略。",
  };
  writeFileSync(path.join(outPath, "FREEZE.json"), `${JSON.stringify(freeze, null, 2)}\n`);

  const mb = (n) => `${(n / 1048576).toFixed(2)} MB`;
  console.log(`冻结 ${info.version}（${info.build}）→ ${path.relative(process.cwd(), outPath)}`);
  console.log(`  asar 条目 ${manifest.asarEntryCount} 个，${mb(asarBytes)}（asar 本体 ${mb(manifest.appAsarSha256 ? lstatSync(asarPath).size : 0)}）`);
  console.log(`  拷贝旁挂 ${copied.length} 项；记哈希 ${manifest.hashedOnly.length} 项；整包 ${bundle.size} 个条目`);
}

main();
