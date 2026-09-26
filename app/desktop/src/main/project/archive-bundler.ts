/**
 * 项目归档（`.zip`）的打包和解包。
 *
 * 包的格式：
 * - 工作区里的文件原样放在包的根下（排除缓存、日志、缩略图、回收站等派生数据，见 EXCLUDED_*）；
 * - `.hilo/index.sqlite` 放的是资产库的一致快照（gateway `prepare-export` 用 VACUUM INTO 拍的），
 *   不是正在用的那份 —— 最近的写入还在 WAL 里，直接拷会丢；
 * - 内容相同的文件只存一份，其余记进 `.hub/aliases.json`（`{version:1, entries:[{from,to}]}`），解包时硬链接 / 复制回来；
 * - `.hub/opencode-export.json` 是这个工作区的会话（`opencode-sessions-v1`，gateway `export` 产出）；
 * - `manifest.json`：`{magic:"minimax-hub-project", manifestVersion:2, name, appVersion, exportedAt,
 *   sourceDirectory, opencodeSessionCount, archiveFormat:2, dedupAliasCount}`。
 * 这些名字和字段都是和别的安装互通的约定（别处导出的包要能在这里导入，反之亦然），一个都不改。
 */
import * as crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import archiver from "archiver";
import yauzl from "yauzl";

import type { GatewayBinding } from "../ipc/types.js";
import { identityHeaders } from "../workspace/identity.js";
import { generateProjectDirName } from "./naming.js";

export const ARCHIVE_MAGIC = "minimax-hub-project";
export const MANIFEST_NAME = "manifest.json";
export const MANIFEST_VERSION = 2;
export const ARCHIVE_FORMAT_DEDUP = 2;
const MAX_MANIFEST_BYTES = 1024 * 1024;
export const OPENCODE_PAYLOAD_NAME = ".hub/opencode-export.json";
const MAX_OPENCODE_PAYLOAD_BYTES = 256 * 1024 * 1024;
export const ALIASES_NAME = ".hub/aliases.json";
const MAX_ALIASES_BYTES = 4 * 1024 * 1024;
/** 太小的文件去重省不了什么，不值得算哈希。 */
const DEDUP_MIN_BYTES = 256;
/** 资产库里没有指纹的文件，超过这么大就不自己算了（整文件 sha256 太慢）。 */
const SELF_HASH_MAX_BYTES = 32 * 1024 * 1024;
export const PROJECTS_STAGING_DIR_NAME = ".staging";

export const HEARTBEAT_INTERVAL_MS = 10_000;
const ACTIVITY_REQUEST_TIMEOUT_MS = 5_000;

export interface ArchiveLogger {
  info(msg: string): void;
  warn(msg: string): void;
}

// ---------------------------------------------------------------------------
// 打包时排除什么
// ---------------------------------------------------------------------------

/** 任何一段路径叫这些名字就整个跳过（依赖目录、版本库、构建产物、Python 缓存）。 */
const EXCLUDED_NAMES = new Set(["node_modules", ".git", ".DS_Store", ".cache", ".turbo", "dist", "build", "coverage", ".next", ".vite", "__pycache__", ".venv"]);

/**
 * 按前缀跳过的路径。都是派生数据或不该出门的东西：
 * 缓存 / 日志（`logs` 里的调试日志可能带模型接口的密钥）、资产库的 -wal / -shm、
 * `.hilo/.tmp`（下载中转和资产库快照）、写到一半的文本版本、缩略图和视频流缓存、删除缓冲区。
 */
const EXCLUDED_SUBPATHS = [
  ".opencode/cache",
  ".opencode/logs",
  ".hilo/cache",
  ".hilo/logs",
  ".hilo/index.sqlite-wal",
  ".hilo/index.sqlite-shm",
  ".hilo/index.sqlite-journal",
  ".hilo/.tmp",
  ".hilo/text-versions/.tmp",
  ".hilo/.thumbnails",
  ".hilo/.video-streams",
  ".hilo/trash",
  "logs",
];

/** 只在导出时跳过：资产库另外放快照；导入时解出来的就是那份快照，要留着。 */
const EXPORT_LIVE_ONLY_SUBPATHS = [".hilo/index.sqlite"];

/** 已经压缩过的格式存储不压缩：再压一遍只费时间，体积几乎不变。 */
const STORE_ONLY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".heic", ".heif",
  ".mp4", ".m4v", ".mov", ".webm", ".mkv",
  ".mp3", ".m4a", ".aac", ".ogg", ".opus", ".flac",
  ".zip", ".gz", ".zst", ".br", ".7z", ".rar", ".jar",
  ".woff", ".woff2",
]);

export function shouldStoreUncompressed(relPosix: string): boolean {
  return STORE_ONLY_EXTENSIONS.has(path.posix.extname(relPosix).toLowerCase());
}

function matchesAnySubpath(rel: string, subs: string[]): boolean {
  return subs.some((s) => rel === s || rel.startsWith(`${s}/`));
}

export function isArchiveJunk(rel: string): boolean {
  if (!rel) return false;
  if (rel.split("/").some((seg) => EXCLUDED_NAMES.has(seg))) return true;
  return matchesAnySubpath(rel, EXCLUDED_SUBPATHS);
}

export function isExcluded(rel: string): boolean {
  if (!rel) return false;
  return isArchiveJunk(rel) || matchesAnySubpath(rel, EXPORT_LIVE_ONLY_SUBPATHS);
}

// ---------------------------------------------------------------------------
// 错误
// ---------------------------------------------------------------------------

export class ExportCancelledError extends Error {
  constructor() {
    super("Export cancelled");
    this.name = "ExportCancelledError";
  }
}

/** 落盘失败的原因（`reason`）是渲染层认识的提示文案键。 */
export type FilePublishReason = "invalid_destination" | "parent_not_directory" | "root_unavailable" | "publish_failed" | "verification_failed" | "disk_full" | "destination_busy" | "permission_denied";

export class FilePublishError extends Error {
  constructor(
    readonly reason: FilePublishReason,
    message: string,
    readonly opts: { cause?: unknown; phase?: string; code?: string; path?: string } = {},
  ) {
    super(message, { cause: opts.cause });
    this.name = `FilePublishError:${reason}`;
  }
  get phase(): string {
    return this.opts.phase ?? "prepare";
  }
  get code(): string | undefined {
    return this.opts.code;
  }
}

export class ProjectExportDestinationError extends Error {
  readonly reason = "destination_inside_project";
  constructor(readonly destination: string) {
    super("Export destination must be outside the project folder");
    this.name = "ProjectExportDestinationError:destination_inside_project";
  }
}

export class ProjectExportActivityError extends Error {
  readonly reason = "activity_unavailable";
  constructor(opts: { cause?: unknown } = {}) {
    super("Project export lifecycle protection is unavailable", { cause: opts.cause });
    this.name = "ProjectExportActivityError:activity_unavailable";
  }
}

export function errorCode(err: unknown): string | undefined {
  const code = err && typeof err === "object" ? (err as { code?: unknown }).code : undefined;
  return typeof code === "string" ? code : undefined;
}

// ---------------------------------------------------------------------------
// 落盘：先写同目录下的 .part，校验过再改名。半截的包不会出现在用户选的位置上。
// ---------------------------------------------------------------------------

const RETRYABLE_RENAME = new Set(["EBUSY", "EPERM", "EACCES"]);

export interface Publication {
  destinationPath: string;
  tempPath: string;
}

export class StreamingFilePublisher {
  async prepare(destination: string): Promise<Publication> {
    try {
      if (typeof destination !== "string" || !destination) throw new FilePublishError("invalid_destination", "Invalid export destination", { path: destination });
      const target = path.resolve(destination);
      if (!path.parse(target).base) throw new FilePublishError("invalid_destination", "Invalid export destination", { path: target });
      const parent = path.dirname(target);
      await this.prepareParent(parent);
      return { destinationPath: target, tempPath: path.join(parent, `.hilo-export-${process.pid}-${crypto.randomUUID().replace(/[^a-zA-Z0-9_-]/g, "")}.part`) };
    } catch (err) {
      throw this.toPublishError(err, "prepare", destination);
    }
  }

  private async prepareParent(parent: string): Promise<void> {
    try {
      const st = await fsp.stat(parent);
      if (!st.isDirectory()) throw new FilePublishError("parent_not_directory", "Export destination parent is not a directory", { path: parent });
      return;
    } catch (err) {
      if (err instanceof FilePublishError) throw err;
      const code = errorCode(err);
      if (code === "ENOTDIR") throw new FilePublishError("parent_not_directory", "Export destination parent is not a directory", { cause: err, code, path: parent });
      if (code !== "ENOENT") throw err;
      if (path.parse(parent).root === parent) throw new FilePublishError("root_unavailable", "Export destination filesystem root is unavailable", { cause: err, code, path: parent });
    }
    await fsp.mkdir(parent, { recursive: true });
  }

  async commit(pub: Publication, validate?: (tempPath: string) => Promise<void>): Promise<void> {
    if (validate) {
      try {
        await validate(pub.tempPath);
      } catch (err) {
        await fsp.rm(pub.tempPath, { force: true }).catch(() => {});
        throw this.toPublishError(err, "verify", pub.tempPath);
      }
    }
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          await fsp.rename(pub.tempPath, pub.destinationPath);
          return;
        } catch (err) {
          const code = errorCode(err);
          // Windows 上杀毒软件 / 索引器会短暂占住刚写完的文件
          if (!code || !RETRYABLE_RENAME.has(code) || attempt >= 3) throw err;
          await new Promise((r) => setTimeout(r, 100 * 2 ** attempt));
        }
      }
    } catch (err) {
      await fsp.rm(pub.tempPath, { force: true }).catch(() => {});
      throw this.toPublishError(err, "commit", pub.destinationPath);
    }
  }

  async rollback(pub: Publication): Promise<void> {
    await fsp.rm(pub.tempPath, { force: true }).catch(() => {});
  }

  toPublishError(err: unknown, phase: string, affected: string): FilePublishError {
    if (err instanceof FilePublishError) return err;
    const code = errorCode(err);
    let reason: FilePublishReason = "publish_failed";
    if (phase === "verify") reason = "verification_failed";
    else if (code === "ENOSPC") reason = "disk_full";
    else if (phase === "commit" && code === "EBUSY") reason = "destination_busy";
    else if (code === "EACCES" || code === "EPERM") reason = "permission_denied";
    const detail = err instanceof Error ? err.message : String(err);
    return new FilePublishError(reason, `File publish failed: ${reason}: ${detail}`, { cause: err, code, path: affected, phase });
  }
}

function isSameOrWithin(dir: string, candidate: string): boolean {
  const rel = path.relative(path.resolve(dir), path.resolve(candidate));
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel));
}

/**
 * 包不能存进项目目录自己里面：打包是边遍历边写，写进去的半截包会被打进包里。
 * 按字面和按 realpath 各查一次（项目目录可能是个软链）。
 */
export async function assertProjectExportDestination(projectPath: string, destination: string): Promise<void> {
  const project = path.resolve(projectPath);
  const dest = path.resolve(destination);
  if (isSameOrWithin(project, dest)) throw new ProjectExportDestinationError(dest);
  let realProject: string;
  let realDest: string;
  try {
    realProject = await fsp.realpath(project);
    realDest = await canonicalDestination(dest);
  } catch (err) {
    if (err instanceof FilePublishError) throw err;
    const code = errorCode(err);
    throw new FilePublishError(code === "EACCES" || code === "EPERM" ? "permission_denied" : "invalid_destination", "Export destination could not be verified", { cause: err, code, path: dest });
  }
  if (isSameOrWithin(realProject, realDest)) throw new ProjectExportDestinationError(dest);
}

async function canonicalDestination(dest: string): Promise<string> {
  let ancestor = path.dirname(dest);
  const missing = [path.basename(dest)];
  for (;;) {
    try {
      return path.join(await fsp.realpath(ancestor), ...missing);
    } catch (err) {
      if (errorCode(err) !== "ENOENT") throw err;
      const parent = path.dirname(ancestor);
      if (parent === ancestor) throw new FilePublishError("root_unavailable", "Export destination filesystem root is unavailable", { cause: err, code: "ENOENT", path: ancestor });
      missing.unshift(path.basename(ancestor));
      ancestor = parent;
    }
  }
}

/** 保存对话框的默认位置：下载目录，不行就项目目录的旁边；都在项目里面就不给默认值。 */
export async function resolveDefaultProjectExportPath(projectPath: string, downloadsPath: string, fileName: string): Promise<string | undefined> {
  for (const candidate of [path.join(downloadsPath, fileName), path.join(path.dirname(path.resolve(projectPath)), fileName)]) {
    try {
      await assertProjectExportDestination(projectPath, candidate);
      return candidate;
    } catch {
      // 下一个
    }
  }
  return undefined;
}

export function getDefaultExportFileName(folderPath: string, now = new Date()): string {
  const name = path.basename(folderPath) || "project";
  return `${name}-${now.toISOString().replace(/[:.]/g, "-").slice(0, 19)}.zip`;
}

// ---------------------------------------------------------------------------
// 和 gateway 打交道
// ---------------------------------------------------------------------------

function gatewayHeaders(binding?: GatewayBinding): Record<string, string> {
  return { "content-type": "application/json", ...identityHeaders(binding) };
}

function joinUrl(base: string, p: string): string {
  return `${base.replace(/\/$/, "")}${p}`;
}

async function postJson(url: string, body: unknown, binding?: GatewayBinding, timeoutMs?: number): Promise<Response> {
  return fetch(url, { method: "POST", headers: gatewayHeaders(binding), body: JSON.stringify(body), ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}) });
}

/**
 * 导出期间在工作区 gateway 上挂一个"有活"的租约并定时续约：空闲回收不会在打包到一半时把它挂起。
 * 挂不上就不导出（后面的快照 / 会话导出都要这个 gateway 活着）；结束时释放，释放失败后台重试。
 */
export async function withProjectExportActivity<T>(gatewayUrl: string, workspaceDir: string, log: ArchiveLogger, binding: GatewayBinding | undefined, task: () => Promise<T>, resolveBinding?: () => GatewayBinding | undefined): Promise<T> {
  const endpoint = () => {
    const latest = resolveBinding?.();
    return latest ? { url: latest.baseUrl, binding: latest } : { url: gatewayUrl, binding };
  };
  if (!endpoint().url) return task();
  const leaseId = crypto.randomUUID();
  const begin = { dir: workspaceDir, leaseId, ownerPid: process.pid, operation: "project-archive-export" };
  const post = async (p: string, body: unknown) => {
    const e = endpoint();
    const r = await postJson(joinUrl(e.url, p), body, e.binding, ACTIVITY_REQUEST_TIMEOUT_MS);
    if (!r.ok) {
      await r.body?.cancel().catch(() => undefined);
      throw new Error(`gateway project-export activity ${r.status}`);
    }
    return r;
  };
  let timer: NodeJS.Timeout | undefined;
  let inFlight: Promise<void> | undefined;
  try {
    try {
      await post("/api/projects/archive/activity/begin", begin);
    } catch (err) {
      throw new ProjectExportActivityError({ cause: err });
    }
    timer = setInterval(() => {
      if (inFlight) return;
      inFlight = (async () => {
        const r = (await (await post("/api/projects/archive/activity/heartbeat", { leaseId })).json()) as { renewed?: unknown };
        if (typeof r?.renewed !== "boolean") throw new Error("gateway project-export heartbeat response is missing renewed");
        // gateway 重启过、租约丢了：重新挂上
        if (!r.renewed) await post("/api/projects/archive/activity/begin", begin);
      })()
        .catch((err) => log.warn(`project export activity heartbeat failed: ${err instanceof Error ? err.message : String(err)}`))
        .finally(() => {
          inFlight = undefined;
        });
    }, HEARTBEAT_INTERVAL_MS);
    timer.unref?.();
    return await task();
  } finally {
    if (timer) clearInterval(timer);
    await inFlight;
    await post("/api/projects/archive/activity/end", { leaseId }).catch((err) => {
      log.warn(`project export activity release failed: ${err instanceof Error ? err.message : String(err)}`);
      scheduleRelease(post, leaseId, log, 0);
    });
  }
}

function scheduleRelease(post: (p: string, b: unknown) => Promise<Response>, leaseId: string, log: ArchiveLogger, attempt: number): void {
  const t = setTimeout(
    () => {
      post("/api/projects/archive/activity/end", { leaseId }).catch((err) => {
        if (attempt === 0 || (attempt + 1) % 3 === 0) log.warn(`project export activity recovery retry failed: ${err instanceof Error ? err.message : String(err)}`);
        if (attempt < 20) scheduleRelease(post, leaseId, log, attempt + 1);
      });
    },
    Math.min(1000 * 2 ** attempt, 30_000),
  );
  t.unref?.();
}

async function prepareVaultSnapshot(gatewayUrl: string, workspaceDir: string, log: ArchiveLogger, binding?: GatewayBinding): Promise<string> {
  const r = await postJson(joinUrl(gatewayUrl, "/api/projects/archive/prepare-export"), { dir: workspaceDir }, binding);
  if (!r.ok) throw new Error(`gateway prepare-export ${r.status}: ${await r.text().catch(() => "<no body>")}`);
  const body = (await r.json()) as { snapshotRelPath: string; sizeBytes: number };
  const prefix = path.join(workspaceDir, ".hilo", ".tmp") + path.sep;
  const abs = path.resolve(workspaceDir, body.snapshotRelPath);
  // gateway 回的路径只信 .hilo/.tmp 下面的：打包会把这个文件原样装进包里
  if (!abs.startsWith(prefix)) throw new Error(`gateway returned snapshot path outside .hilo/.tmp/: ${body.snapshotRelPath}`);
  log.info(`Vault snapshot ready: ${body.snapshotRelPath} (${body.sizeBytes}B) for ${workspaceDir}`);
  return abs;
}

async function fetchAssetHashes(gatewayUrl: string, workspaceDir: string, log: ArchiveLogger, binding?: GatewayBinding): Promise<Map<string, string>> {
  try {
    const r = await postJson(joinUrl(gatewayUrl, "/api/projects/archive/asset-hashes"), { dir: workspaceDir }, binding);
    if (!r.ok) {
      log.warn(`gateway asset-hashes ${r.status}: ${await r.text().catch(() => "<no body>")} (continuing without dedup)`);
      return new Map();
    }
    const hashes = ((await r.json()) as { hashes?: Record<string, unknown> }).hashes ?? {};
    return new Map(Object.entries(hashes).filter((e): e is [string, string] => typeof e[1] === "string" && e[1].length > 0));
  } catch (err) {
    log.warn(`asset-hashes fetch failed: ${err instanceof Error ? err.message : String(err)} (continuing without dedup)`);
    return new Map();
  }
}

async function fetchOpenCodeExport(gatewayUrl: string, workspaceDir: string, binding?: GatewayBinding): Promise<OpenCodePayload | null> {
  const r = await postJson(joinUrl(gatewayUrl, "/api/projects/archive/export"), { dir: workspaceDir }, binding);
  if (!r.ok) throw new Error(`gateway project-archive export ${r.status}: ${await r.text().catch(() => "<no body>")}`);
  return ((await r.json()) as { payload: OpenCodePayload | null }).payload;
}

async function postOpenCodeImport(gatewayUrl: string, payload: OpenCodePayload, oldDir: string, newDir: string, dbPath: string): Promise<{ insertedSessions: number }> {
  if (!gatewayUrl) throw new Error("Gateway URL not provided; cannot import chat sessions");
  // 没有库路径就不带这个键：空串会被 gateway 的参数校验当成错误，而不是退回按环境变量找
  const r = await postJson(joinUrl(gatewayUrl, "/api/projects/archive/import"), { payload, oldDir, newDir, ...(dbPath ? { dbPath } : {}) });
  if (!r.ok) throw new Error(`gateway project-archive import ${r.status}: ${await r.text().catch(() => "<no body>")}`);
  return (await r.json()) as { insertedSessions: number };
}

async function postVaultPathRewrite(gatewayUrl: string, vaultDbPath: string, renames: Rename[], log: ArchiveLogger): Promise<number> {
  if (!gatewayUrl || renames.length === 0 || !fs.existsSync(vaultDbPath)) return 0;
  try {
    const r = await postJson(joinUrl(gatewayUrl, "/api/projects/archive/rewrite-vault-paths"), { vaultDbPath, renames });
    if (!r.ok) {
      log.warn(`gateway rewrite-vault-paths ${r.status}: ${await r.text().catch(() => "<no body>")}`);
      return 0;
    }
    return ((await r.json()) as { rewritten?: number }).rewritten ?? 0;
  } catch (err) {
    log.warn(`vault path rewrite failed: ${err instanceof Error ? err.message : String(err)}`);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// 导出
// ---------------------------------------------------------------------------

export interface ExportProgress {
  processedBytes: number;
  totalBytes: number;
}

export interface ExportOptions {
  signal?: AbortSignal;
  onProgress?: (p: ExportProgress) => void;
  workspaceBinding?: GatewayBinding;
  resolveWorkspaceBinding?: () => GatewayBinding | undefined;
}

export interface ExportResult {
  filePath: string;
  size: number;
  opencodeSessionCount: number;
  dedupAliasCount: number;
}

export async function exportProjectToZip(folderPath: string, destPath: string, appVersion: string, gatewayUrl: string, log: ArchiveLogger, opts: ExportOptions = {}): Promise<ExportResult> {
  if (opts.signal?.aborted) throw new ExportCancelledError();
  const st = await fsp.stat(folderPath);
  if (!st.isDirectory()) throw new Error(`Not a directory: ${folderPath}`);
  await assertProjectExportDestination(folderPath, destPath);
  return withProjectExportActivity(gatewayUrl, folderPath, log, opts.workspaceBinding, () => performExport(folderPath, destPath, appVersion, gatewayUrl, log, opts), opts.resolveWorkspaceBinding);
}

async function performExport(folderPath: string, destPath: string, appVersion: string, gatewayUrl: string, log: ArchiveLogger, opts: ExportOptions): Promise<ExportResult> {
  const signal = opts.signal;
  const throwIfAborted = () => {
    if (signal?.aborted) throw new ExportCancelledError();
  };
  const binding = opts.workspaceBinding;
  const publisher = new StreamingFilePublisher();
  const snapshot = gatewayUrl ? await prepareVaultSnapshot(gatewayUrl, folderPath, log, binding) : undefined;
  const dropSnapshot = () => (snapshot ? fsp.rm(snapshot, { force: true }).catch(() => {}) : Promise.resolve());
  const hashes = gatewayUrl ? await fetchAssetHashes(gatewayUrl, folderPath, log, binding) : new Map<string, string>();

  let pub: Publication;
  try {
    await assertProjectExportDestination(folderPath, destPath);
    pub = await publisher.prepare(destPath);
  } catch (err) {
    await dropSnapshot();
    throw err;
  }

  const output = fs.createWriteStream(pub.tempPath);
  const archive = archiver("zip");
  let settled = false;
  const outputClosed = new Promise<void>((r) => output.once("close", () => r()));
  const streamDone = new Promise<void>((resolve, reject) => {
    output.on("close", () => resolve());
    output.on("error", (err) => reject(publisher.toPublishError(err, "write", pub.tempPath)));
    archive.on("error", (err) => {
      reject(err);
      output.destroy();
    });
    archive.on("warning", (err) => {
      // 文件在遍历之后被删了：少一个文件不值得整包失败
      if ((err as NodeJS.ErrnoException).code === "ENOENT") log.warn(`archive warning: ${err.message}`);
      else {
        reject(err);
        output.destroy();
      }
    });
  });
  void streamDone.catch(() => undefined);
  const onAbort = () => archive.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  let totalQueued = 0;
  if (opts.onProgress) {
    const report = opts.onProgress;
    archive.on("progress", (d) => report({ processedBytes: d.fs.processedBytes, totalBytes: totalQueued }));
  }
  archive.pipe(output);

  try {
    const files: CollectedFile[] = [];
    await collectFiles(folderPath, "", log, files);
    const seen = new Map<string, string>();
    const aliases: Rename[] = [];
    for (const f of files) {
      throwIfAborted();
      let key: string | null = null;
      if (f.size > DEDUP_MIN_BYTES) {
        const vaultKey = hashes.get(f.relPosix);
        if (vaultKey) key = vaultKey;
        else if (f.size <= SELF_HASH_MAX_BYTES) {
          try {
            key = `sha:${await streamingHashFile(f.absPath)}`;
          } catch (err) {
            log.warn(`hash failed for ${f.relPosix}: ${err instanceof Error ? err.message : String(err)}; writing without dedup`);
          }
        }
      }
      if (key !== null) {
        const existing = seen.get(key);
        if (existing) {
          aliases.push({ from: f.relPosix, to: existing });
          continue;
        }
        seen.set(key, f.relPosix);
      }
      archive.file(f.absPath, { name: f.relPosix, store: shouldStoreUncompressed(f.relPosix) } as archiver.ZipEntryData);
      totalQueued += f.size;
    }
    if (snapshot) archive.file(snapshot, { name: ".hilo/index.sqlite" });

    let sessionCount = 0;
    try {
      const payload = gatewayUrl ? await fetchOpenCodeExport(gatewayUrl, folderPath, binding) : null;
      if (payload) {
        sessionCount = payload.sessionCount;
        archive.append(JSON.stringify(payload), { name: OPENCODE_PAYLOAD_NAME });
      }
    } catch (err) {
      // 会话导不出来不影响文件：包照样能用，只是不带对话
      log.warn(`OpenCode session export failed for ${folderPath}; continuing with files only: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (aliases.length > 0) archive.append(JSON.stringify({ version: 1, entries: aliases }), { name: ALIASES_NAME });
    archive.append(JSON.stringify(buildManifest(folderPath, sessionCount, appVersion, aliases.length), null, 2), { name: MANIFEST_NAME });
    await Promise.all([archive.finalize(), streamDone]);
    settled = true;
    throwIfAborted();
    await publisher.commit(pub, async (tmp) => {
      if (!(await zipHasEocd(tmp))) {
        throw new Error("Export produced an incomplete archive (missing end-of-central-directory record). No file was written; please retry.");
      }
    });
    await dropSnapshot();
    const final = await fsp.stat(pub.destinationPath);
    return { filePath: pub.destinationPath, size: final.size, opencodeSessionCount: sessionCount, dedupAliasCount: aliases.length };
  } catch (err) {
    if (!settled) {
      archive.abort();
      output.destroy();
      await Promise.race([outputClosed, new Promise((r) => setTimeout(r, 2000))]);
    }
    await publisher.rollback(pub);
    await dropSnapshot();
    throw err;
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}

export function buildManifest(folderPath: string, sessionCount: number, appVersion: string, dedupAliasCount: number) {
  return {
    magic: ARCHIVE_MAGIC,
    manifestVersion: MANIFEST_VERSION,
    name: path.basename(folderPath) || "project",
    appVersion,
    exportedAt: new Date().toISOString(),
    sourceDirectory: folderPath,
    opencodeSessionCount: sessionCount,
    archiveFormat: ARCHIVE_FORMAT_DEDUP,
    dedupAliasCount,
  };
}

interface CollectedFile {
  relPosix: string;
  absPath: string;
  size: number;
}

/** 递归收集要打包的文件。软链一律跳过：跟着走可能把工作区外的东西打进包里。 */
async function collectFiles(root: string, relDir: string, log: ArchiveLogger, out: CollectedFile[]): Promise<void> {
  const absDir = path.join(root, relDir);
  for (const entry of await fsp.readdir(absDir, { withFileTypes: true })) {
    const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
    if (isExcluded(rel)) continue;
    const abs = path.join(absDir, entry.name);
    if (entry.isSymbolicLink()) {
      log.warn(`skip symlink: ${rel}`);
      continue;
    }
    if (entry.isDirectory()) await collectFiles(root, rel, log, out);
    else if (entry.isFile()) out.push({ relPosix: rel, absPath: abs, size: (await fsp.stat(abs)).size });
  }
}

async function streamingHashFile(abs: string): Promise<string> {
  const hash = crypto.createHash("sha256");
  await pipeline(fs.createReadStream(abs), async function* (src) {
    for await (const chunk of src) hash.update(chunk as Buffer);
  });
  return hash.digest("hex").slice(0, 16);
}

const EOCD = Buffer.from([0x50, 0x4b, 0x05, 0x06]);

/** zip 的尾记录（EOCD）在不在：打包途中被打断（退出、磁盘满）留下的半截包没有它。 */
export async function zipHasEocd(zipPath: string): Promise<boolean> {
  let h: fsp.FileHandle | undefined;
  try {
    h = await fsp.open(zipPath, "r");
    const { size } = await h.stat();
    if (size < EOCD.length) return false;
    const len = Math.min(70 * 1024, size);
    const buf = Buffer.allocUnsafe(len);
    await h.read(buf, 0, len, size - len);
    return buf.lastIndexOf(EOCD) !== -1;
  } finally {
    await h?.close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// 导入
// ---------------------------------------------------------------------------

export interface Rename {
  from: string;
  to: string;
}

export interface Manifest {
  magic: string;
  manifestVersion: number;
  name: string;
  appVersion: string;
  exportedAt: string;
  sourceDirectory?: string;
  opencodeSessionCount?: number;
  archiveFormat?: number;
  dedupAliasCount?: number;
}

export interface OpenCodePayload {
  format: string;
  sourceDirectory: string;
  sessionCount: number;
  sessions: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  parts: Record<string, unknown>[];
  todos: Record<string, unknown>[];
}

export interface ImportProgress {
  entriesProcessed: number;
  entriesTotal: number;
}

export interface ImportDeps {
  projectsRoot: string;
  gatewayUrl: string;
  opencodeDbPath: string;
  log: ArchiveLogger;
}

export interface ImportResult {
  targetDir: string;
  name: string;
  originalName: string;
  opencodeSessionCount: number;
  expectedOpencodeSessionCount: number;
  opencodeImportError?: string;
  rematerializedAliasCount: number;
}

function openZip(zipPath: string): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => yauzl.open(zipPath, { lazyEntries: true, autoClose: false }, (err, zf) => (err || !zf ? reject(err ?? new Error("Failed to open archive")) : resolve(zf))));
}

function openEntry(zf: yauzl.ZipFile, entry: yauzl.Entry): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) => zf.openReadStream(entry, (err, s) => (err || !s ? reject(err ?? new Error(`Failed to open zip entry: ${entry.fileName}`)) : resolve(s))));
}

/** 先扫一遍中央目录：读出 manifest、算解压后的总大小（查磁盘空间用），不解任何文件。 */
export async function preflightScanArchive(zipPath: string): Promise<{ manifest: Manifest; totalUncompressedBytes: number; entryCount: number }> {
  let zf: yauzl.ZipFile;
  try {
    zf = await openZip(zipPath);
  } catch (err) {
    if (err instanceof Error && /end of central directory/i.test(err.message)) {
      throw new Error("This archive is incomplete or corrupted (missing end-of-central-directory record). It was likely truncated during export or transfer. Please re-export the project and try again.");
    }
    throw err;
  }
  try {
    let total = 0;
    let count = 0;
    let manifestRaw: string | null = null;
    await new Promise<void>((resolve, reject) => {
      zf.on("error", reject);
      zf.on("end", () => resolve());
      zf.on("entry", (entry: yauzl.Entry) => {
        count++;
        total += entry.uncompressedSize;
        const isManifest = entry.fileName === MANIFEST_NAME || /^[^/]+\/manifest\.json$/.test(entry.fileName);
        if (!isManifest || manifestRaw !== null) return zf.readEntry();
        if (entry.uncompressedSize > MAX_MANIFEST_BYTES) return reject(new Error("Manifest too large — refusing to parse"));
        openEntry(zf, entry)
          .then(async (s) => {
            const chunks: Buffer[] = [];
            for await (const c of s) chunks.push(c as Buffer);
            manifestRaw = Buffer.concat(chunks).toString("utf8");
            zf.readEntry();
          })
          .catch(reject);
      });
      zf.readEntry();
    });
    if (manifestRaw === null) throw new Error("Not a Hub project archive: manifest.json missing");
    return { manifest: parseManifestRaw(manifestRaw), totalUncompressedBytes: total, entryCount: count };
  } finally {
    zf.close();
  }
}

export function parseManifestRaw(raw: string): Manifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Manifest is not valid JSON");
  }
  const v = parsed as Record<string, unknown> | null;
  if (!v || typeof v !== "object" || typeof v.magic !== "string" || typeof v.manifestVersion !== "number" || typeof v.name !== "string" || typeof v.appVersion !== "string" || typeof v.exportedAt !== "string") {
    throw new Error("Manifest schema mismatch — not a Hub project archive");
  }
  if (v.magic !== ARCHIVE_MAGIC) throw new Error("Archive magic mismatch — not a Hub project archive");
  if (v.manifestVersion > MANIFEST_VERSION) throw new Error(`Archive was produced by a newer Hub (manifest v${v.manifestVersion}); please update`);
  return v as unknown as Manifest;
}

/** 解压后大小 + 64MB 余量，空间不够就不开始（解到一半磁盘满比一开始就说清楚糟得多）。 */
async function assertDiskSpace(dir: string, required: number, log: ArchiveLogger): Promise<void> {
  let free: number;
  try {
    const s = await fsp.statfs(dir);
    free = s.bavail * s.bsize;
  } catch (err) {
    log.warn(`disk-space probe failed for ${dir}: ${err instanceof Error ? err.message : String(err)}; skipping disk-space check`);
    return;
  }
  const needed = required + 64 * 1024 * 1024;
  if (free < needed) {
    const gib = (n: number) => `${(n / 1024 ** 3).toFixed(2)} GiB`;
    throw new Error(`Not enough disk space to import: the archive unpacks to ~${gib(required)} but only ${gib(free)} is free at ${dir}. Free up space and retry.`);
  }
}

/** 上次导入崩溃留下的中转目录，放了一天以上的清掉。 */
async function sweepStaleStaging(parent: string, log: ArchiveLogger): Promise<void> {
  let names: string[];
  try {
    names = await fsp.readdir(parent);
  } catch {
    return;
  }
  for (const n of names) {
    const abs = path.join(parent, n);
    try {
      if (Date.now() - (await fsp.stat(abs)).mtimeMs > 24 * 60 * 60 * 1000) {
        await fsp.rm(abs, { recursive: true, force: true });
        log.info(`Swept stale import staging dir: ${abs}`);
      }
    } catch (err) {
      log.warn(`Staging sweep failed for ${abs}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

function isInside(root: string, candidate: string): boolean {
  const rel = path.relative(root, candidate);
  return rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
}

function isEilseq(err: unknown): boolean {
  return errorCode(err) === "EILSEQ" || /illegal byte sequence/i.test((err as Error)?.message ?? "");
}

/** 这个码点超出基本平面（emoji 等）：有的文件系统（exFAT / 部分网络盘）不收。 */
export function hasFsHostileCodepoint(s: string): boolean {
  for (const ch of s) if ((ch.codePointAt(0) ?? 0) > 0xffff) return true;
  return false;
}

export function sanitizeRelPosixForFs(rel: string): string {
  return rel
    .split("/")
    .map((seg) => {
      if (!hasFsHostileCodepoint(seg)) return seg;
      const cleaned = Array.from(seg)
        .map((ch) => ((ch.codePointAt(0) ?? 0) > 0xffff ? "_" : ch))
        .join("");
      const short = crypto.createHash("sha1").update(seg).digest("hex").slice(0, 8);
      const dot = cleaned.lastIndexOf(".");
      return dot > 0 ? `${cleaned.slice(0, dot)}-${short}${cleaned.slice(dot)}` : `${cleaned}-${short}`;
    })
    .join("/");
}

function hardAsciiFallback(rel: string): string {
  const segs = rel.split("/");
  const base = segs[segs.length - 1]!;
  const dot = base.lastIndexOf(".");
  segs[segs.length - 1] = `asset-${crypto.createHash("sha1").update(rel).digest("hex").slice(0, 12)}${dot > 0 ? base.slice(dot) : ""}`;
  return segs.join("/");
}

/**
 * 安全解包：拒绝跳出目标目录的条目（zip-slip）和软链条目；目标目录必须是空的；
 * 独占创建每个文件。`__MACOSX/` 是访达打包时附带的元数据，跳过。
 * 某个文件名文件系统不收（EILSEQ）时，整包重来，逐个文件改名落盘，返回改了哪些名。
 */
async function extractArchive(zipPath: string, stagingDir: string, log: ArchiveLogger, onProgress?: (p: ImportProgress) => void): Promise<Rename[]> {
  try {
    await extractZip(zipPath, stagingDir, log, onProgress, false);
    return [];
  } catch (err) {
    if (!isEilseq(err)) throw err;
    log.warn("Import extraction hit EILSEQ (target filesystem rejects some filenames); retrying with per-file filename sanitization");
    await fsp.rm(stagingDir, { recursive: true, force: true });
    await fsp.mkdir(stagingDir, { recursive: true });
    return extractZip(zipPath, stagingDir, log, onProgress, true);
  }
}

async function extractZip(zipPath: string, targetDir: string, log: ArchiveLogger, onProgress: ((p: ImportProgress) => void) | undefined, sanitize: boolean): Promise<Rename[]> {
  const root = await fsp.realpath(path.resolve(targetDir));
  if ((await fsp.readdir(root)).length !== 0) throw new Error("ZIP extraction requires an empty, caller-owned destination");
  const renames: Rename[] = [];
  const zf = await openZip(zipPath);
  let processed = 0;
  try {
    await new Promise<void>((resolve, reject) => {
      zf.on("error", reject);
      zf.on("end", () => resolve());
      zf.on("entry", (entry: yauzl.Entry) => {
        void (async () => {
          const rel = entry.fileName.replace(/\\/g, "/").replace(/^\/+/, "");
          const advance = () => {
            processed++;
            onProgress?.({ entriesProcessed: processed, entriesTotal: zf.entryCount });
            zf.readEntry();
          };
          if (entry.fileName.startsWith("__MACOSX/")) return zf.readEntry();
          const abs = path.resolve(root, rel);
          if (path.isAbsolute(entry.fileName) || !isInside(root, abs) || abs === root) {
            if (abs !== root) log.warn(`import archive entry rejected (zip-slip): ${entry.fileName}`);
            return advance();
          }
          const mode = (entry.externalFileAttributes >>> 16) & 0xffff;
          if ((mode & 0o170000) === 0o120000) {
            log.warn(`import archive entry rejected (symlink): ${entry.fileName}`);
            return advance();
          }
          if (entry.fileName.endsWith("/") || (mode & 0o170000) === 0o040000) {
            await fsp.mkdir(abs, { recursive: true }).catch((e) => {
              if (!(sanitize && isEilseq(e))) throw e;
            });
            return advance();
          }
          let target = abs;
          let handle: fsp.FileHandle;
          const openTarget = async (p: string) => {
            await fsp.mkdir(path.dirname(p), { recursive: true });
            return fsp.open(p, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL, 0o644);
          };
          try {
            handle = await openTarget(target);
          } catch (e) {
            if (!sanitize || !isEilseq(e)) throw e;
            let fixed = sanitizeRelPosixForFs(rel);
            if (fixed === rel) fixed = hardAsciiFallback(rel);
            target = path.resolve(root, fixed);
            if (!isInside(root, target)) throw e;
            handle = await openTarget(target);
            renames.push({ from: rel, to: fixed });
            log.info(`sanitized incompatible filename: "${rel}" -> "${fixed}"`);
          }
          try {
            await pipeline(await openEntry(zf, entry), handle.createWriteStream());
          } finally {
            await handle.close().catch(() => {});
          }
          advance();
        })().catch(reject);
      });
      zf.readEntry();
    });
  } finally {
    zf.close();
  }
  return renames;
}

/** 包里的内容可能套了一层目录（`name/manifest.json`）：只有一个子目录且里面有 manifest 时以它为根。 */
async function detectContentRoot(staging: string): Promise<string> {
  const entries = await fsp.readdir(staging, { withFileTypes: true });
  if (entries.length !== 1 || !entries[0]!.isDirectory()) return staging;
  const candidate = path.join(staging, entries[0]!.name);
  return (await fsp.stat(path.join(candidate, MANIFEST_NAME)).catch(() => null))?.isFile() ? candidate : staging;
}

function rebaseRewrites(renames: Rename[], staging: string, source: string): Rename[] {
  const s = path.resolve(staging);
  const src = path.resolve(source);
  if (renames.length === 0 || s === src) return renames;
  const prefix = `${src.slice(s.length + 1).split(path.sep).join("/")}/`;
  return renames.filter((r) => r.from.startsWith(prefix) && r.to.startsWith(prefix)).map((r) => ({ from: r.from.slice(prefix.length), to: r.to.slice(prefix.length) }));
}

async function readJsonFile<T>(file: string, max: number, what: string, check: (v: unknown) => v is T): Promise<T | null> {
  let st: fs.Stats;
  try {
    st = await fsp.stat(file);
  } catch (err) {
    if (errorCode(err) === "ENOENT") return null;
    throw err;
  }
  if (!st.isFile()) return null;
  if (st.size > max) throw new Error(`${what} too large (${st.size}B > ${max}B) — refusing to parse`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(await fsp.readFile(file, "utf8"));
  } catch {
    throw new Error(`${what} is not valid JSON`);
  }
  if (!check(parsed)) throw new Error(`${what} schema mismatch`);
  return parsed;
}

function isAliasManifest(v: unknown): v is { version: 1; entries: Rename[] } {
  if (!v || typeof v !== "object") return false;
  const o = v as { version?: unknown; entries?: unknown };
  return o.version === 1 && Array.isArray(o.entries) && o.entries.every((e) => e && typeof e === "object" && typeof e.from === "string" && typeof e.to === "string" && e.from.length > 0 && e.to.length > 0);
}

function isOpenCodePayload(v: unknown): v is OpenCodePayload {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (typeof o.format !== "string" || typeof o.sourceDirectory !== "string" || typeof o.sessionCount !== "number") return false;
  if (![o.sessions, o.messages, o.parts, o.todos].every(Array.isArray)) return false;
  const first = (a: unknown) => (a as Record<string, unknown>[])[0];
  const s = first(o.sessions);
  if (s && !(typeof s.id === "string" && typeof s.directory === "string" && typeof s.title === "string" && typeof s.time_created === "number")) return false;
  const m = first(o.messages);
  if (m && !(typeof m.id === "string" && typeof m.session_id === "string" && typeof m.data === "string" && typeof m.time_created === "number")) return false;
  const p = first(o.parts);
  if (p && !(typeof p.id === "string" && typeof p.message_id === "string" && typeof p.session_id === "string" && typeof p.data === "string")) return false;
  const t = first(o.todos);
  if (t && !(typeof t.session_id === "string" && typeof t.content === "string" && typeof t.position === "number")) return false;
  return true;
}

/** 按别名表把去重掉的文件补回来：优先硬链接（不占空间），跨盘或不支持时复制。 */
async function rematerializeAliases(source: string, entries: Rename[], log: ArchiveLogger, renameMap: Map<string, string>, record: (from: string, to: string) => void): Promise<number> {
  const root = path.resolve(source);
  const prefix = root + path.sep;
  let n = 0;
  for (const e of entries) {
    let from = renameMap.get(e.from) ?? e.from;
    let to = renameMap.get(e.to) ?? e.to;
    if (renameMap.size > 0) {
      if (hasFsHostileCodepoint(from)) {
        const fixed = sanitizeRelPosixForFs(from);
        if (fixed !== from) {
          record(e.from, fixed);
          from = fixed;
        }
      }
      if (hasFsHostileCodepoint(to)) to = sanitizeRelPosixForFs(to);
    }
    const fromAbs = path.resolve(source, from);
    const toAbs = path.resolve(source, to);
    if (!fromAbs.startsWith(prefix) || !toAbs.startsWith(prefix)) {
      log.warn(`alias skipped (path escape): from=${from} to=${to}`);
      continue;
    }
    if (!(await fsp.stat(toAbs).catch(() => null))?.isFile()) {
      log.warn(`alias skipped (target missing): from=${from} to=${to}`);
      continue;
    }
    if (await fsp.stat(fromAbs).catch(() => null)) {
      log.warn(`alias skipped (already present): from=${from}`);
      continue;
    }
    await fsp.mkdir(path.dirname(fromAbs), { recursive: true });
    try {
      await fsp.link(toAbs, fromAbs);
      n++;
    } catch {
      try {
        await fsp.copyFile(toAbs, fromAbs);
        n++;
      } catch (err) {
        log.warn(`alias copy failed: from=${from} to=${to}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  return n;
}

/** 改了名的文件，`.hilo/*.json`（画布、存储……）里按原路径引用它的字符串一起改（`name` 字段是显示名，不动）。 */
async function rewriteReferences(source: string, renames: Rename[], log: ArchiveLogger): Promise<number> {
  if (renames.length === 0) return 0;
  const map = new Map(renames.map((r) => [r.from, r.to]));
  const walk = (v: unknown): number => {
    let n = 0;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === "string" && map.has(item)) {
          v[i] = map.get(item);
          n++;
        } else if (item && typeof item === "object") n += walk(item);
      });
    } else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      for (const k of Object.keys(o)) {
        const x = o[k];
        if (typeof x === "string") {
          if (k !== "name" && map.has(x)) {
            o[k] = map.get(x);
            n++;
          }
        } else if (x && typeof x === "object") n += walk(x);
      }
    }
    return n;
  };
  const hilo = path.join(source, ".hilo");
  let total = 0;
  for (const e of await fsp.readdir(hilo, { withFileTypes: true }).catch(() => [])) {
    if (!e.isFile() || !e.name.endsWith(".json")) continue;
    const file = path.join(hilo, e.name);
    let parsed: unknown;
    try {
      parsed = JSON.parse(await fsp.readFile(file, "utf8"));
    } catch {
      continue;
    }
    const changed = walk(parsed);
    if (changed > 0) {
      await fsp.writeFile(file, JSON.stringify(parsed));
      total += changed;
      log.info(`rewrote ${changed} reference(s) in .hilo/${e.name}`);
    }
  }
  return total;
}

/** 解出来的东西里如果混进了排除项（别处的包、手工打的包），落地前删掉。 */
async function pruneExcludedPaths(root: string, log: ArchiveLogger): Promise<number> {
  let pruned = 0;
  const walk = async (rel: string): Promise<void> => {
    for (const e of await fsp.readdir(path.join(root, rel), { withFileTypes: true }).catch(() => [])) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (isArchiveJunk(r)) {
        await fsp
          .rm(path.join(root, rel, e.name), { recursive: true, force: true })
          .then(() => pruned++)
          .catch((err) => log.warn(`prune failed for ${r}: ${err instanceof Error ? err.message : String(err)}`));
        continue;
      }
      if (e.isDirectory()) await walk(r);
    }
  };
  await walk("");
  return pruned;
}

/**
 * 导入一个项目包：先整包解到项目根下的 `.staging/import-*` 里，补回去重掉的文件、处理改名、
 * 清掉排除项，然后整个目录改名成 `<项目根>/<名字>[-n]`（同盘改名是原子的，半截的项目不会出现在列表里），
 * 最后把会话写进 opencode 库。会话导入失败不回滚文件：项目本身是好的，只是没带对话，由调用方提示。
 */
export async function importProjectFromZip(zipPath: string, deps: ImportDeps, opts: { onProgress?: (p: ImportProgress) => void; projectNameOverride?: string } = {}): Promise<ImportResult> {
  const { log } = deps;
  const resolvedZip = path.resolve(zipPath);
  const preflight = await preflightScanArchive(resolvedZip);
  await fsp.mkdir(deps.projectsRoot, { recursive: true });
  await assertDiskSpace(deps.projectsRoot, preflight.totalUncompressedBytes, log);
  const stagingParent = path.join(deps.projectsRoot, PROJECTS_STAGING_DIR_NAME);
  await fsp.mkdir(stagingParent, { recursive: true });
  await sweepStaleStaging(stagingParent, log);
  const stagingRoot = await fsp.mkdtemp(path.join(stagingParent, "import-"));
  const stagingDir = path.join(stagingRoot, "extracted");
  await fsp.mkdir(stagingDir, { recursive: true });
  try {
    const raw = await extractArchive(resolvedZip, stagingDir, log, opts.onProgress);
    const source = await detectContentRoot(stagingDir);
    const manifestFile = path.join(source, MANIFEST_NAME);
    const manifestStat = await fsp.stat(manifestFile).catch((err) => {
      if (errorCode(err) === "ENOENT") throw new Error("Not a Hub project archive: manifest.json missing");
      throw err;
    });
    if (!manifestStat.isFile()) throw new Error("manifest.json is not a regular file");
    if (manifestStat.size > MAX_MANIFEST_BYTES) throw new Error("Manifest too large — refusing to parse");
    const manifest = parseManifestRaw(await fsp.readFile(manifestFile, "utf8"));
    const payload = await readJsonFile(path.join(source, OPENCODE_PAYLOAD_NAME), MAX_OPENCODE_PAYLOAD_BYTES, "Session payload", isOpenCodePayload);
    const aliases = await readJsonFile(path.join(source, ALIASES_NAME), MAX_ALIASES_BYTES, "Aliases manifest", isAliasManifest);

    const renames = rebaseRewrites(raw, stagingDir, source);
    const renameMap = new Map(renames.map((r) => [r.from, r.to]));
    const rematerialized = aliases
      ? await rematerializeAliases(source, aliases.entries, log, renameMap, (from, to) => {
          if (!renameMap.has(from)) {
            renameMap.set(from, to);
            renames.push({ from, to });
          }
        })
      : 0;
    if (renames.length > 0) {
      const refs = await rewriteReferences(source, renames, log);
      const vault = await postVaultPathRewrite(deps.gatewayUrl, path.join(source, ".hilo", "index.sqlite"), renames, log);
      log.info(`Sanitized ${renames.length} incompatible filename(s); rewrote ${refs} metadata reference(s) and ${vault} vault path(s)`);
    }
    const pruned = await pruneExcludedPaths(source, log);
    if (pruned > 0) log.info(`Pruned ${pruned} excluded path(s) from imported archive`);

    const seed = opts.projectNameOverride?.trim() || (manifest.name ? manifest.name : "imported");
    const targetDir = generateProjectDirName(seed, deps.projectsRoot);
    for (const f of [MANIFEST_NAME, OPENCODE_PAYLOAD_NAME, ALIASES_NAME]) await fsp.rm(path.join(source, f), { force: true });
    await fsp.rmdir(path.join(source, ".hub")).catch(() => {});
    try {
      await fsp.rename(source, targetDir);
    } catch (err) {
      if (errorCode(err) !== "EXDEV") throw err;
      await fsp.cp(source, targetDir, { recursive: true });
      await fsp.rm(source, { recursive: true, force: true });
    }

    let inserted = 0;
    let importError: string | undefined;
    const expected = manifest.opencodeSessionCount ?? payload?.sessions.length ?? 0;
    if (payload && payload.sessions.length > 0) {
      const oldDir = payload.sourceDirectory || manifest.sourceDirectory;
      if (!oldDir) {
        importError = "Original workspace path unknown; skipped session import to avoid path-rewrite breakage";
        log.warn(`OpenCode session import skipped: ${importError}`);
      } else {
        try {
          inserted = (await postOpenCodeImport(deps.gatewayUrl, payload, oldDir, targetDir, deps.opencodeDbPath)).insertedSessions;
        } catch (err) {
          importError = err instanceof Error ? err.message : String(err);
          log.warn(`OpenCode session import failed: ${importError}`);
        }
      }
    }
    log.info(`Imported project: zip=${zipPath} target=${targetDir} sessions=${inserted}/${expected} aliases=${rematerialized} (manifest name="${manifest.name}")`);
    return {
      targetDir,
      name: path.basename(targetDir),
      originalName: manifest.name,
      opencodeSessionCount: inserted,
      expectedOpencodeSessionCount: expected,
      ...(importError ? { opencodeImportError: importError } : {}),
      rematerializedAliasCount: rematerialized,
    };
  } finally {
    await fsp.rm(stagingRoot, { recursive: true, force: true }).catch(() => {});
  }
}
