/**
 * 比较内联 requireJszip_min 与 jszip@3.10.1 写出来的 zip 条目。
 *
 * 不 import 整份 vendor.js。从 app/renderer/src/vendor.js 的文本里抽出
 * requireJszip_min，以及它闭包用到的 commonjsGlobal、commonjsRequire、
 * jszip_min、hasRequiredJszip_min，再执行这一段。
 *
 * 3.10.1 要等第二批把 jszip 钉成这个版本之后才有。本脚本不改 lockfile，
 * 也不去别的工作副本里找包。node_modules 里没有 3.10.1 时说明原因并退出。
 * 写这份脚本时，本工作副本还没有 node_modules；lockfile 里的 jszip 是 3.10.2。
 * 若运行时本仓库 node_modules 里已经有 3.10.2，只附加一组记录，不把它当成通过条件。
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const vendorPath = path.join(repoRoot, "app/renderer/src/vendor.js");

const EXPR_KEYWORDS = new Set([
  "return",
  "throw",
  "case",
  "typeof",
  "void",
  "delete",
  "in",
  "of",
  "instanceof",
  "new",
  "await",
  "yield",
  "else",
  "do",
]);

function isIdentStart(char) {
  return /[A-Za-z_$]/.test(char);
}

function isIdentPart(char) {
  return /[A-Za-z0-9_$]/.test(char);
}

function isWhitespace(char) {
  return char === " " || char === "\t" || char === "\n" || char === "\r";
}

/**
 * 从 start 起扫描。kind 为 function 时，函数体的花括号配平后结束；
 * kind 为 var 时，深度回到 0 的分号处结束。
 * 字符串、注释、模板和正则里的括号不计入深度。
 */
function scanEnd(source, start, kind) {
  let index = start;
  let depth = 0;
  let sawBrace = false;
  let expectExpr = true;
  while (index < source.length) {
    const char = source[index];
    if (isWhitespace(char)) {
      index += 1;
      continue;
    }
    if (char === "/" && source[index + 1] === "/") {
      index += 2;
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }
    if (char === "/" && source[index + 1] === "*") {
      index += 2;
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) index += 1;
      index += 2;
      continue;
    }
    if (char === "'" || char === '"') {
      const quote = char;
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") {
          index += 2;
          continue;
        }
        if (source[index] === quote) {
          index += 1;
          break;
        }
        index += 1;
      }
      expectExpr = false;
      continue;
    }
    if (char === "`") {
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") {
          index += 2;
          continue;
        }
        if (source[index] === "`") {
          index += 1;
          break;
        }
        if (source[index] === "$" && source[index + 1] === "{") {
          index = scanEnd(source, index + 1, "function");
          continue;
        }
        index += 1;
      }
      expectExpr = false;
      continue;
    }
    if (char === "/" && expectExpr) {
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") {
          index += 2;
          continue;
        }
        if (source[index] === "[") {
          index += 1;
          while (index < source.length && source[index] !== "]") {
            if (source[index] === "\\") index += 2;
            else index += 1;
          }
          if (source[index] === "]") index += 1;
          continue;
        }
        if (source[index] === "/") {
          index += 1;
          break;
        }
        index += 1;
      }
      while (index < source.length && /[a-z]/i.test(source[index])) index += 1;
      expectExpr = false;
      continue;
    }
    if (isIdentStart(char)) {
      const wordStart = index;
      index += 1;
      while (index < source.length && isIdentPart(source[index])) index += 1;
      expectExpr = EXPR_KEYWORDS.has(source.slice(wordStart, index));
      continue;
    }
    if (char >= "0" && char <= "9") {
      index += 1;
      while (index < source.length && /[0-9a-fxobA-FXOB._]/.test(source[index])) index += 1;
      expectExpr = false;
      continue;
    }
    const three = source.slice(index, index + 3);
    if (three === "===" || three === "!==" || three === ">>>") {
      index += 3;
      expectExpr = true;
      continue;
    }
    const two = source.slice(index, index + 2);
    if (two === "?.") {
      index += 2;
      expectExpr = false;
      continue;
    }
    if (
      two === "=>" ||
      two === "&&" ||
      two === "||" ||
      two === "??" ||
      two === "==" ||
      two === "!=" ||
      two === "<=" ||
      two === ">=" ||
      two === "+=" ||
      two === "-=" ||
      two === "*=" ||
      two === "/=" ||
      two === "%=" ||
      two === "&=" ||
      two === "|=" ||
      two === "^=" ||
      two === "**" ||
      two === "<<" ||
      two === ">>"
    ) {
      index += 2;
      expectExpr = true;
      continue;
    }
    if (two === "++" || two === "--") {
      index += 2;
      expectExpr = false;
      continue;
    }
    if (char === "{") {
      depth += 1;
      sawBrace = true;
      index += 1;
      expectExpr = true;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      index += 1;
      expectExpr = false;
      if (kind === "function" && sawBrace && depth === 0) return index;
      continue;
    }
    if (char === ";" && depth === 0 && kind === "var") return index + 1;
    if ("[(,:=?!&|^~%+-*".includes(char)) {
      index += 1;
      expectExpr = true;
      continue;
    }
    if (char === ")" || char === "]") {
      index += 1;
      expectExpr = false;
      continue;
    }
    index += 1;
    expectExpr = false;
  }
  throw new Error(`扫描 ${kind} 时没有找到结束位置（从偏移 ${start} 起）`);
}

function findDeclaration(source, prefix, name) {
  const needle = `${prefix} ${name}`;
  const hits = [];
  let from = 0;
  while (from < source.length) {
    const at = source.indexOf(needle, from);
    if (at < 0) break;
    const before = at === 0 ? "" : source[at - 1];
    const after = source[at + needle.length] ?? "";
    if (!isIdentPart(before) && !isIdentPart(after)) hits.push(at);
    from = at + needle.length;
  }
  if (hits.length !== 1) {
    throw new Error(`vendor.js 里「${needle}」出现 ${hits.length} 次，不能只抽这一段`);
  }
  return hits[0];
}

function extractNamed(source, prefix, name, kind) {
  const start = findDeclaration(source, prefix, name);
  const end = scanEnd(source, start, kind);
  return source.slice(start, end);
}

function installNodeFileReader() {
  if (typeof globalThis.FileReader === "function") return "环境里已有 FileReader";
  // Node 没有 FileReader。内联副本只有 FileReader 存在时才把 Blob 读成字节，
  // 否则会把 Blob 对象原样写进 zip。这里补一个只调用 blob.arrayBuffer() 的读法，
  // 让同一组 Blob 输入在 Node 里走完读字节这条路径。不改 jszip 源码。
  globalThis.FileReader = class FileReader {
    constructor() {
      this.onload = null;
      this.onerror = null;
      this.result = null;
      this.error = null;
    }

    readAsArrayBuffer(blob) {
      Promise.resolve()
        .then(() => blob.arrayBuffer())
        .then((buffer) => {
          this.result = buffer;
          if (typeof this.onload === "function") this.onload({ target: this });
        })
        .catch((error) => {
          this.error = error;
          if (typeof this.onerror === "function") this.onerror({ target: this });
        });
    }
  };
  return "已补 Node 用的 FileReader（内部是 blob.arrayBuffer）";
}

function loadInline(source) {
  const pieces = [
    extractNamed(source, "var", "commonjsGlobal", "var"),
    extractNamed(source, "function", "commonjsRequire", "function"),
    extractNamed(source, "var", "jszip_min", "var"),
    extractNamed(source, "var", "hasRequiredJszip_min", "var"),
    extractNamed(source, "function", "requireJszip_min", "function"),
  ];
  const factory = new Function(`${pieces.join("\n")}\nreturn requireJszip_min();`);
  const loaded = factory();
  if (typeof loaded !== "function" || typeof loaded.prototype?.file !== "function") {
    throw new Error("抽出的 requireJszip_min() 没有返回可用的 JSZip 构造函数");
  }
  return { JSZip: loaded, pieces };
}

function describeDirData(data) {
  if (data == null) return "null";
  const name = data.constructor?.name ?? typeof data;
  const keys = Object.keys(data);
  return `${name} keys=${keys.length === 0 ? "无" : keys.join(",")}`;
}

function compressionName(file) {
  const magic = file._data?.compression?.magic;
  if (typeof magic !== "string") return null;
  const bytes = [...magic].map((char) => char.charCodeAt(0));
  if (bytes.length === 2 && bytes[0] === 0 && bytes[1] === 0) return "STORE";
  if (bytes.length === 2 && bytes[0] === 8 && bytes[1] === 0) return "DEFLATE";
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function buildSnapshot(JSZip) {
  const zip = new JSZip();
  zip.file("hello.txt", "字符串条目");
  zip.file("bytes.bin", Uint8Array.from([0, 1, 2, 255, 10, 13]));
  zip.file("blob.bin", new Blob([Uint8Array.from([9, 8, 7, 6])]));
  zip.folder("empty-dir");
  zip.file("nested/path/file.txt", "带斜杠的路径");
  const generated = await zip.generateAsync({ type: "uint8array" });
  const loaded = await JSZip.loadAsync(generated);
  const names = Object.keys(loaded.files).sort();
  const entries = [];
  for (const name of names) {
    const file = loaded.files[name];
    const content = file.dir ? new Uint8Array() : await file.async("uint8array");
    const uncompressedSize = file._data ? file._data.uncompressedSize : null;
    entries.push({
      name,
      dir: Boolean(file.dir),
      method: compressionName(file),
      uncompressedSize,
      contentLength: content.length,
      sizeMatches: uncompressedSize === content.length,
      contentHex: Buffer.from(content).toString("hex"),
      dirData: file.dir ? describeDirData(file._data) : "",
    });
  }
  return { generatedBytes: generated.length, entries };
}

function compareSnapshots(left, right) {
  const diffs = [];
  const leftNames = left.entries.map((entry) => entry.name);
  const rightNames = right.entries.map((entry) => entry.name);
  if (leftNames.join("\n") !== rightNames.join("\n")) {
    diffs.push(`条目名不同\n  甲: ${leftNames.join(", ")}\n  乙: ${rightNames.join(", ")}`);
  }
  const rightByName = new Map(right.entries.map((entry) => [entry.name, entry]));
  for (const entry of left.entries) {
    const other = rightByName.get(entry.name);
    if (!other) continue;
    if (entry.dir !== other.dir) diffs.push(`${entry.name} 目录标记不同`);
    if (entry.contentHex !== other.contentHex) diffs.push(`${entry.name} 未压缩内容不同`);
    if (entry.method !== other.method) diffs.push(`${entry.name} 压缩方法不同：${entry.method} / ${other.method}`);
    if (entry.uncompressedSize !== other.uncompressedSize) {
      diffs.push(`${entry.name} uncompressedSize 不同：${entry.uncompressedSize} / ${other.uncompressedSize}`);
    }
    if (entry.sizeMatches !== other.sizeMatches) {
      diffs.push(`${entry.name} uncompressedSize 是否等于未压缩长度：${entry.sizeMatches} / ${other.sizeMatches}`);
    }
  }
  return diffs;
}

function formatSnapshot(label, snapshot) {
  const files = snapshot.entries.filter((entry) => !entry.dir);
  const dirs = snapshot.entries.filter((entry) => entry.dir);
  const filesMatch = files.every((entry) => entry.sizeMatches);
  const lines = [
    `${label}：生成 ${snapshot.generatedBytes} 字节，${snapshot.entries.length} 个条目`,
    `  文件条目的 uncompressedSize 都等于未压缩长度：${filesMatch}`,
    `  目录条目的 uncompressedSize：${dirs.map((entry) => `${entry.name}=${entry.uncompressedSize}`).join(", ") || "无"}`,
  ];
  for (const entry of snapshot.entries) {
    const dirKeys = entry.dir ? ` _data=${entry.dirData}` : "";
    lines.push(
      `  ${entry.name} dir=${entry.dir} method=${entry.method ?? "无"} uncompressedSize=${entry.uncompressedSize} contentLength=${entry.contentLength} sizeMatches=${entry.sizeMatches}${dirKeys}`,
    );
  }
  return lines.join("\n");
}

function findInstalledJszip(root) {
  const found = [];
  const modulesDir = path.join(root, "node_modules");
  if (!fs.existsSync(modulesDir)) return found;
  const candidates = [];
  const direct = path.join(modulesDir, "jszip", "package.json");
  if (fs.existsSync(direct)) candidates.push(direct);
  const pnpmDir = path.join(modulesDir, ".pnpm");
  if (fs.existsSync(pnpmDir)) {
    for (const entry of fs.readdirSync(pnpmDir)) {
      if (!entry.startsWith("jszip@")) continue;
      const packageJson = path.join(pnpmDir, entry, "node_modules", "jszip", "package.json");
      if (fs.existsSync(packageJson)) candidates.push(packageJson);
    }
  }
  const seen = new Set();
  for (const packageJson of candidates) {
    const meta = JSON.parse(fs.readFileSync(packageJson, "utf8"));
    const dir = path.dirname(packageJson);
    const key = `${meta.version}\0${dir}`;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ version: String(meta.version), dir, packageJson });
  }
  return found;
}

function loadPackage(dir) {
  const require = createRequire(path.join(dir, "package.json"));
  const loaded = require(dir);
  return loaded?.default ?? loaded;
}

function pickVersion(installed, version) {
  return installed.filter((item) => item.version === version);
}

async function main() {
  const fileReaderNote = installNodeFileReader();
  const source = fs.readFileSync(vendorPath, "utf8");
  const inline = loadInline(source);
  const inlineSnapshot = await buildSnapshot(inline.JSZip);
  console.log(formatSnapshot("内联 requireJszip_min", inlineSnapshot));
  console.log(fileReaderNote);

  const installed = findInstalledJszip(repoRoot);
  const wanted = pickVersion(installed, "3.10.1");
  const recorded = pickVersion(installed, "3.10.2");

  if (recorded.length > 0) {
    console.log("\n附带记录 jszip@3.10.2（不是通过条件）：");
    for (const item of recorded) {
      console.log(`  路径 ${item.dir}`);
      try {
        const snapshot = await buildSnapshot(loadPackage(item.dir));
        console.log(formatSnapshot("  3.10.2", snapshot).replaceAll("\n", "\n  "));
        const diffs = compareSnapshots(inlineSnapshot, snapshot);
        if (diffs.length === 0) console.log("  与内联副本的条目比较：这一组输入相同");
        else console.log(`  与内联副本有 ${diffs.length} 处不同（只记录，不算失败）\n  ${diffs.join("\n  ")}`);
      } catch (error) {
        console.log(`  读取 3.10.2 失败：${error.message}`);
      }
    }
  } else {
    console.log("\n本仓库 node_modules 里没有 jszip@3.10.2，不附带记录。");
  }

  if (wanted.length === 0) {
    const versions = installed.map((item) => item.version);
    const seen = versions.length > 0 ? `目前能看到的版本：${[...new Set(versions)].join(", ")}。` : "node_modules 里没有任何 jszip。";
    console.error(`\n缺少 jszip@3.10.1。${seen}`);
    console.error("3.10.1 要等第二批钉版本后再和内联副本比。脚本没有改 lockfile。");
    process.exitCode = 1;
    return;
  }

  let failed = false;
  for (const item of wanted) {
    console.log(`\n比较 jszip@3.10.1：${item.dir}`);
    const snapshot = await buildSnapshot(loadPackage(item.dir));
    console.log(formatSnapshot("jszip@3.10.1", snapshot));
    const diffs = compareSnapshots(inlineSnapshot, snapshot);
    if (diffs.length === 0) {
      console.log("3.10.1 与内联副本一致：条目名、未压缩内容、压缩方法、uncompressedSize 都相同，且 uncompressedSize 等于未压缩长度。");
    } else {
      failed = true;
      console.error(`3.10.1 与内联副本有 ${diffs.length} 处不同：`);
      for (const diff of diffs) console.error(`  ${diff}`);
    }
  }
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
