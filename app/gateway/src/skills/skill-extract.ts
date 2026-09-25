import { execFile } from "node:child_process";
import { existsSync, readdirSync, rmSync, unlinkSync } from "node:fs";
import { chmod, cp, mkdir, rename, rm, unlink, writeFile } from "node:fs/promises";
import { platform } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { inflateRaw } from "node:zlib";

/**
 * 技能包（zip）解压和落盘。
 *
 * 先用纯 JS 解（不依赖系统有没有 unzip），遇到它不支持的格式（zip64、别的压缩方法）
 * 再退回系统的 unzip / Expand-Archive。不管哪条路，解完都要查一遍有没有逃出目标目录的路径。
 */

const execFileAsync = promisify(execFile);
const inflateRawAsync = promisify(inflateRaw);

const MAX_ENTRY_SIZE = 100 * 1024 * 1024;
const MAX_TOTAL_SIZE = 500 * 1024 * 1024;
const LOCAL_FILE_HEADER_SIG = 0x04034b50;
const CENTRAL_DIR_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;

/** 解完再走一遍：条目名逃出目录的整个删掉报错；符号链接一律删 —— 链到外面的话后续读写都会穿出去。 */
function validateExtractedFiles(dir: string): void {
  const resolved = path.resolve(dir);
  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = path.resolve(d, entry.name);
      if (!full.startsWith(resolved + path.sep) && full !== resolved) {
        rmSync(resolved, { recursive: true, force: true });
        throw new Error(`Zip slip detected: ${full} escapes target directory ${resolved}`);
      }
      if (entry.isSymbolicLink()) {
        unlinkSync(full);
        continue;
      }
      if (entry.isDirectory()) walk(full);
    }
  };
  walk(resolved);
}

async function extractZipPureJs(zip: Buffer, targetDir: string): Promise<void> {
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65558); i--) {
    if (zip.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP archive invalid: End of Central Directory record not found");
  const count = zip.readUInt16LE(eocd + 10);
  const cdOffset = zip.readUInt32LE(eocd + 16);
  if (count === 0) throw new Error("ZIP archive contains no extractable files (empty or invalid format)");

  const entries: { method: number; compressedSize: number; uncompressedSize: number; fileName: string; localHeaderOffset: number; creatorOS: number; externalAttrs: number }[] = [];
  let pos = cdOffset;
  for (let i = 0; i < count; i++) {
    if (pos + 46 > zip.length) throw new Error(`ZIP corrupt: central directory truncated at entry ${i}/${count} (offset ${pos} > buffer ${zip.length})`);
    if (zip.readUInt32LE(pos) !== CENTRAL_DIR_SIG) throw new Error(`ZIP corrupt: bad central directory signature at entry ${i}/${count} (offset ${pos})`);
    const nameLen = zip.readUInt16LE(pos + 28);
    const extraLen = zip.readUInt16LE(pos + 30);
    const commentLen = zip.readUInt16LE(pos + 32);
    entries.push({
      creatorOS: zip.readUInt8(pos + 5),
      method: zip.readUInt16LE(pos + 10),
      compressedSize: zip.readUInt32LE(pos + 20),
      uncompressedSize: zip.readUInt32LE(pos + 24),
      externalAttrs: zip.readUInt32LE(pos + 38),
      localHeaderOffset: zip.readUInt32LE(pos + 42),
      fileName: zip.subarray(pos + 46, pos + 46 + nameLen).toString("utf-8"),
    });
    pos += 46 + nameLen + extraLen + commentLen;
  }

  let fileCount = 0;
  let total = 0;
  for (const entry of entries) {
    if (entry.fileName.endsWith("/") || entry.fileName.endsWith("\\")) continue;
    const normalized = path.normalize(entry.fileName);
    if (normalized.startsWith("..") || path.isAbsolute(normalized)) continue;
    // 声明大小先挡一道（防 zip 炸弹），解出来再按实际大小挡一道（声明可以造假）。
    if (entry.uncompressedSize > MAX_ENTRY_SIZE) throw new Error(`ZIP entry "${entry.fileName}" uncompressed size ${entry.uncompressedSize} exceeds limit ${MAX_ENTRY_SIZE}`);
    total += entry.uncompressedSize;
    if (total > MAX_TOTAL_SIZE) throw new Error(`ZIP total uncompressed size exceeds limit ${MAX_TOTAL_SIZE} (zip bomb protection)`);
    const lh = entry.localHeaderOffset;
    if (lh + 30 > zip.length) throw new Error(`ZIP corrupt: local header offset ${lh} for "${entry.fileName}" exceeds buffer`);
    if (zip.readUInt32LE(lh) !== LOCAL_FILE_HEADER_SIG) throw new Error(`ZIP corrupt: bad local header signature for "${entry.fileName}" at offset ${lh}`);
    const dataStart = lh + 30 + zip.readUInt16LE(lh + 26) + zip.readUInt16LE(lh + 28);
    const dataEnd = dataStart + entry.compressedSize;
    if (dataEnd > zip.length) throw new Error(`ZIP corrupt: compressed data for "${entry.fileName}" extends past buffer (${dataEnd} > ${zip.length})`);
    const data = zip.subarray(dataStart, dataEnd);
    const fullPath = path.join(targetDir, normalized);
    await mkdir(path.dirname(fullPath), { recursive: true });
    let content: Buffer;
    if (entry.method === 0) {
      content = data;
    } else if (entry.method === 8) {
      content = await inflateRawAsync(data);
      if (content.length > MAX_ENTRY_SIZE) throw new Error(`ZIP entry "${entry.fileName}" inflated to ${content.length} bytes, exceeds limit ${MAX_ENTRY_SIZE}`);
    } else {
      throw new Error(`Unsupported ZIP compression method ${entry.method} for entry "${entry.fileName}"`);
    }
    await writeFile(fullPath, content);
    // 技能里的脚本要保留可执行位，否则 agent 调 scripts/*.sh 会 permission denied。
    if (platform() !== "win32" && entry.creatorOS === 3) {
      const mode = (entry.externalAttrs >>> 16) & 0xffff;
      if (mode !== 0 && (mode & 0o111) !== 0) await chmod(fullPath, mode & 0o7777).catch(() => {});
    }
    fileCount++;
  }
  if (fileCount === 0) throw new Error("ZIP archive contains no extractable files (empty or invalid format)");
}

export async function extractZipToDir(zip: Buffer, targetDir: string, label: string): Promise<void> {
  if (existsSync(targetDir)) await rm(targetDir, { recursive: true });
  await mkdir(targetDir, { recursive: true });
  try {
    await extractZipPureJs(zip, targetDir);
    validateExtractedFiles(targetDir);
    return;
  } catch {
    await rm(targetDir, { recursive: true }).catch(() => {});
    await mkdir(targetDir, { recursive: true });
  }
  const tmpZip = path.join(path.dirname(targetDir), `${label}.zip`);
  await writeFile(tmpZip, zip);
  try {
    if (platform() === "win32") {
      // 不加载用户配置、不等交互：坏包时尽快失败，而不是挂到超时
      await execFileAsync("powershell", ["-NoProfile", "-NonInteractive", "-Command", `Expand-Archive -Path '${tmpZip}' -DestinationPath '${targetDir}' -Force`], { timeout: 30_000 });
    } else {
      await execFileAsync("unzip", ["-o", tmpZip, "-d", targetDir], { timeout: 30_000 });
    }
  } catch (err) {
    await rm(targetDir, { recursive: true }).catch(() => {});
    throw new Error(`Failed to extract zip: ${String(err)}`);
  } finally {
    await unlink(tmpZip).catch(() => {});
  }
  validateExtractedFiles(targetDir);
}

const IGNORED_ENTRIES = new Set(["__MACOSX", ".DS_Store"]);

/** SKILL.md 在包根，或者包里只有一层目录（压缩整个文件夹时的常见样子）。 */
export function locateSkillRoot(extractedDir: string): string | null {
  if (existsSync(path.join(extractedDir, "SKILL.md"))) return extractedDir;
  const subdirs = readdirSync(extractedDir, { withFileTypes: true }).filter((e) => e.isDirectory() && !IGNORED_ENTRIES.has(e.name));
  if (subdirs.length === 1) {
    const candidate = path.join(extractedDir, subdirs[0]!.name);
    if (existsSync(path.join(candidate, "SKILL.md"))) return candidate;
  }
  return null;
}

const RENAME_RETRY_DELAYS_MS = [50, 100, 200, 400, 800];
const TRANSIENT_CODES = new Set(["EBUSY", "EPERM", "EACCES", "ENOTEMPTY"]);

async function copyDirThenRemove(src: string, dest: string): Promise<void> {
  await rm(dest, { recursive: true, force: true }).catch(() => {});
  await cp(src, dest, { recursive: true });
  await rm(src, { recursive: true, force: true }).catch(() => {});
}

/**
 * Windows 上杀毒 / 索引会短暂占着目录，rename 报 EBUSY/EPERM，重试几次再退成复制。
 * 暂存目录在系统 tmp、目标在用户目录时可能跨卷（EXDEV），也直接复制。
 */
async function renameWithRetry(src: string, dest: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(src, dest);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code ?? "";
      if (code === "EXDEV") return copyDirThenRemove(src, dest);
      if (!TRANSIENT_CODES.has(code)) throw err;
      if (attempt >= RENAME_RETRY_DELAYS_MS.length) return copyDirThenRemove(src, dest);
      await new Promise((r) => setTimeout(r, RENAME_RETRY_DELAYS_MS[attempt]));
    }
  }
}

/** 整目录替换：旧目录先挪开，新目录换名到位，失败时把旧的挪回来 —— 不会留下半新半旧的技能。 */
export async function atomicSwapDir(stagingDir: string, finalDir: string, onRollbackError?: (err: unknown) => void): Promise<void> {
  if (!existsSync(finalDir)) {
    await renameWithRetry(stagingDir, finalDir);
    return;
  }
  const oldDir = `${finalDir}.__removing__`;
  await rm(oldDir, { recursive: true }).catch(() => {});
  await renameWithRetry(finalDir, oldDir);
  try {
    await renameWithRetry(stagingDir, finalDir);
  } catch (swapErr) {
    await renameWithRetry(oldDir, finalDir).catch((rollbackErr) => onRollbackError?.(rollbackErr));
    throw swapErr;
  }
  await rm(oldDir, { recursive: true }).catch(() => {});
}
