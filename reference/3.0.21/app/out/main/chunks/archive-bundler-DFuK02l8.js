import * as crypto from "node:crypto";
import fs__default from "node:fs";
import fsp__default from "node:fs/promises";
import os__default from "node:os";
import path__default from "node:path";
import { l as importErrorCode, m as ProjectImportError, A as joinProjectArchiveGatewayUrl, B as assertProjectExportDestination, C as withProjectExportActivity, S as StreamingFilePublisher, D as projectArchiveGatewayHeaders, E as getProjectsRoot, G as PROJECTS_STAGING_DIR_NAME, o as generateProjectDirName, k as importErrorDiagnostic, g as getDiskSpaceForPath, j as assertTrustedArchiveUrl } from "./extract-zip-safe-Bhxshmqd.js";
import { setTimeout } from "node:timers/promises";
import "node:child_process";
import "./safe-spawn-path-DD3xknOt.js";
import "./python-runtime-ZdSS6sqy.js";
import "node:net";
import "node:util";
import "node:tls";
import "node:url";
import "node:http";
import "node:sqlite";
import "node:stream";
import "node:stream/promises";
import "events";
import "fs";
import "node:events";
import "node:string_decoder";
import "path";
import "assert";
import "buffer";
import "zlib";
import "node:assert";
import "constants";
import "stream";
import "util";
const RENAME_RETRY_DELAYS_MS = [100, 200, 400, 800, 1e3];
const MAX_DESTINATION_CANDIDATES = 10;
const RETRYABLE_RENAME_CODES = /* @__PURE__ */ new Set(["EPERM", "EACCES", "EBUSY"]);
async function exists(target) {
  try {
    await fsp__default.lstat(target);
    return true;
  } catch (error) {
    if (importErrorCode(error) === "ENOENT") return false;
    throw error;
  }
}
async function publishImportDirectory(source, allocateTarget, options = {}) {
  let retry = 0;
  for (let candidate = 0; candidate < MAX_DESTINATION_CANDIDATES; candidate++) {
    const target = allocateTarget();
    while (!await exists(target)) {
      try {
        await fsp__default.rename(source, target);
        return target;
      } catch (error) {
        if (await exists(target)) break;
        const code = importErrorCode(error);
        const delayMs = RENAME_RETRY_DELAYS_MS[retry];
        if (!code || !RETRYABLE_RENAME_CODES.has(code) || delayMs === void 0) throw error;
        retry++;
        options.onRetry?.({ attempt: retry, delayMs, errorCode: code });
        await (options.sleep ?? setTimeout)(delayMs);
      }
    }
  }
  throw new ProjectImportError("destination_conflict");
}
const PROJECT_SESSION_IMPORT_TIMEOUT_MS = 3e4;
async function postOpenCodeImport(gatewayUrl, payload, oldDir, newDir, dbPath) {
  if (!gatewayUrl) throw new Error("Gateway URL not provided; cannot import chat sessions");
  const signal = AbortSignal.timeout(PROJECT_SESSION_IMPORT_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(
      joinProjectArchiveGatewayUrl(gatewayUrl, "/api/projects/archive/import"),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal,
        body: JSON.stringify({ payload, oldDir, newDir, ...dbPath ? { dbPath } : {} })
      }
    );
    if (!response.ok) {
      let detail = "<no body>";
      let bodyError;
      try {
        detail = await response.text();
      } catch (error) {
        bodyError = error;
      }
      throw Object.assign(
        new Error(`gateway project-archive import ${response.status}: ${detail}`, {
          cause: bodyError
        }),
        {
          code: `HTTP_${response.status}`
        }
      );
    }
    const value = await response.json();
    return {
      insertedSessions: readCount(value, "insertedSessions"),
      insertedMessages: readCount(value, "insertedMessages"),
      insertedParts: readCount(value, "insertedParts"),
      insertedTodos: readCount(value, "insertedTodos")
    };
  } catch (error) {
    if (signal.aborted && (response?.ok ?? true)) {
      throw Object.assign(
        new Error("Conversation restoration could not be confirmed before the deadline", {
          cause: error
        }),
        {
          code: "ETIMEDOUT"
        }
      );
    }
    throw error;
  }
}
function readCount(value, key) {
  const count = value && typeof value === "object" ? Reflect.get(value, key) : void 0;
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
    throw Object.assign(new Error("Invalid conversation import response"), {
      code: "ERR_INVALID_RESPONSE"
    });
  }
  return count;
}
const ARCHIVE_MAGIC = "minimax-hub-project";
const MANIFEST_NAME = "manifest.json";
const MANIFEST_VERSION = 2;
const ARCHIVE_FORMAT_DEDUP = 2;
const MAX_MANIFEST_BYTES = 1 * 1024 * 1024;
const OPENCODE_PAYLOAD_NAME = ".hub/opencode-export.json";
const MAX_OPENCODE_PAYLOAD_BYTES = 256 * 1024 * 1024;
const ALIASES_NAME = ".hub/aliases.json";
const MAX_ALIASES_BYTES = 4 * 1024 * 1024;
const DEDUP_MIN_BYTES = 256;
const SELF_HASH_MAX_BYTES = 32 * 1024 * 1024;
const EXCLUDED_NAMES = /* @__PURE__ */ new Set([
  "node_modules",
  ".git",
  ".DS_Store",
  ".cache",
  ".turbo",
  "dist",
  "build",
  "coverage",
  ".next",
  ".vite",
  // Python bytecode / virtualenv left behind by skill scripts — both
  // fully reproducible and can be huge (.venv routinely runs 100MB+).
  "__pycache__",
  ".venv"
]);
const EXCLUDED_SUBPATHS = [
  ".opencode/cache",
  ".opencode/logs",
  ".hilo/cache",
  ".hilo/logs",
  // Auxiliary SQLite files next to the vault db. VACUUM INTO never
  // produces them, but if the live ones happen to exist on disk we
  // don't want them landing next to the snapshot's slot.
  ".hilo/index.sqlite-wal",
  ".hilo/index.sqlite-shm",
  ".hilo/index.sqlite-journal",
  // Staging area for in-flight downloads AND for the vault snapshot
  // produced by prepareVaultSnapshot. Per-call temp dirs that should
  // never persist into a portable archive (and CleanupCoordinator clears
  // them on boot anyway, but excluding here keeps zips deterministic).
  ".hilo/.tmp",
  // Half-written text-version objects (TextVersionService stages a
  // compressed snapshot here before renaming it into `objects/`). The
  // finished objects under `.hilo/text-versions/objects/` DO ship — a
  // project export carries the document history's content with it — but a
  // `.part` file is by definition an unreferenced fragment.
  ".hilo/text-versions/.tmp",
  // Thumbnail cache — regenerated on demand by the gateway
  // (FilesService writes under `.hilo/.thumbnails/`). Purely derived
  // data that can easily run to tens/hundreds of MB per workspace.
  ".hilo/.thumbnails",
  // HLS/transcoded video stream cache — regenerated on demand by the
  // gateway when a video node is played on the canvas. Like thumbnails,
  // this is purely derived data (routinely tens of MB per workspace, and
  // can rival or exceed the source media size), so it must never bloat a
  // portable archive.
  ".hilo/.video-streams",
  // Delete-operation buffer (TrashBufferService): files the user just
  // deleted sit here for ~10s before promotion to the OS trash, and
  // crash residuals are swept by CleanupCoordinator on boot. Exporting
  // it would pack deleted content into the archive.
  ".hilo/trash",
  // Workspace-root log directory. OpenCode trace logs
  // (`logs/opencode-trace-*.jsonl`, written when LOG_OPENCODE_TRACE=1)
  // land here and contain LLM API tokens — shipping them inside a
  // shareable archive is a credential leak. The whole directory is
  // excluded (not just the trace pattern) per product decision:
  // logs are diagnostic, never project content.
  "logs"
];
const EXPORT_LIVE_ONLY_SUBPATHS = [".hilo/index.sqlite"];
const STORE_ONLY_EXTENSIONS = /* @__PURE__ */ new Set([
  // images
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".heic",
  ".heif",
  // video
  ".mp4",
  ".m4v",
  ".mov",
  ".webm",
  ".mkv",
  // audio
  ".mp3",
  ".m4a",
  ".aac",
  ".ogg",
  ".opus",
  ".flac",
  // archives / compressed
  ".zip",
  ".gz",
  ".zst",
  ".br",
  ".7z",
  ".rar",
  ".jar",
  // fonts
  ".woff",
  ".woff2"
]);
function shouldStoreUncompressed(relPosixPath) {
  return STORE_ONLY_EXTENSIONS.has(path__default.posix.extname(relPosixPath).toLowerCase());
}
class ExportCancelledError extends Error {
  constructor() {
    super("Export cancelled");
    this.name = "ExportCancelledError";
  }
}
function matchesAnySubpath(relPosixPath, subpaths) {
  for (const sub of subpaths) {
    if (relPosixPath === sub || relPosixPath.startsWith(`${sub}/`)) return true;
  }
  return false;
}
function isArchiveJunk(relPosixPath) {
  if (!relPosixPath) return false;
  const segments = relPosixPath.split("/");
  for (const seg of segments) {
    if (EXCLUDED_NAMES.has(seg)) return true;
  }
  return matchesAnySubpath(relPosixPath, EXCLUDED_SUBPATHS);
}
function isExcluded(relPosixPath) {
  if (!relPosixPath) return false;
  return isArchiveJunk(relPosixPath) || matchesAnySubpath(relPosixPath, EXPORT_LIVE_ONLY_SUBPATHS);
}
function buildManifest(folderPath, opencodeSessionCount, appVersion, archiveFormat, dedupAliasCount) {
  return {
    magic: ARCHIVE_MAGIC,
    manifestVersion: MANIFEST_VERSION,
    name: path__default.basename(folderPath) || "project",
    appVersion,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    sourceDirectory: folderPath,
    opencodeSessionCount,
    archiveFormat,
    dedupAliasCount
  };
}
function getDefaultExportFileName(folderPath) {
  const name = path__default.basename(folderPath) || "project";
  const ts = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${name}-${ts}.zip`;
}
async function exportProjectToZip(folderPath, destPath, appVersion, gatewayUrl, log, opts) {
  if (opts?.signal?.aborted) throw new ExportCancelledError();
  const stat = await fsp__default.stat(folderPath);
  if (!stat.isDirectory()) {
    throw new Error(`Not a directory: ${folderPath}`);
  }
  await assertProjectExportDestination(folderPath, destPath);
  const workspaceIdentity = opts?.workspaceBinding ?? opts?.workspaceClaim;
  return withProjectExportActivity(
    gatewayUrl,
    folderPath,
    log,
    workspaceIdentity,
    () => performProjectExport(folderPath, destPath, appVersion, gatewayUrl, log, opts),
    opts?.resolveWorkspaceBinding
  );
}
async function performProjectExport(folderPath, destPath, appVersion, gatewayUrl, log, opts) {
  const signal = opts?.signal;
  const throwIfAborted = () => {
    if (signal?.aborted) throw new ExportCancelledError();
  };
  throwIfAborted();
  const publisher = new StreamingFilePublisher();
  let vaultSnapshotAbsPath;
  const workspaceIdentity = opts?.workspaceBinding ?? opts?.workspaceClaim;
  if (gatewayUrl) {
    const snapshot = await prepareVaultSnapshot(gatewayUrl, folderPath, log, workspaceIdentity);
    vaultSnapshotAbsPath = snapshot.snapshotAbsPath;
  }
  const assetHashes = await fetchAssetHashes(gatewayUrl, folderPath, log, workspaceIdentity);
  const archiveFormat = ARCHIVE_FORMAT_DEDUP;
  try {
    await assertProjectExportDestination(folderPath, destPath);
  } catch (error) {
    if (vaultSnapshotAbsPath) await fsp__default.rm(vaultSnapshotAbsPath, { force: true }).catch(() => {
    });
    throw error;
  }
  let publication;
  try {
    publication = await publisher.prepare(destPath);
  } catch (error) {
    if (vaultSnapshotAbsPath) await fsp__default.rm(vaultSnapshotAbsPath, { force: true }).catch(() => {
    });
    throw error;
  }
  const tmpDestPath = publication.tempPath;
  let outputForCleanup;
  let output;
  let archive;
  try {
    const createArchive = (await import("./extract-zip-safe-Bhxshmqd.js").then((n) => n.i)).default;
    output = (opts?.createWriteStream ?? fs__default.createWriteStream)(tmpDestPath);
    archive = createArchive("zip");
  } catch (error) {
    await publisher.rollback(publication);
    if (vaultSnapshotAbsPath) await fsp__default.rm(vaultSnapshotAbsPath, { force: true }).catch(() => {
    });
    throw error;
  }
  outputForCleanup = output;
  opts?.onArchiveCreated?.(archive);
  let finalizePromise;
  let pipelineSettled = false;
  const seenByKey = /* @__PURE__ */ new Map();
  const aliases = [];
  const outputClosed = new Promise((resolve) => {
    output.once("close", resolve);
  });
  const archiveClosed = new Promise((resolve) => {
    archive.once("close", resolve);
  });
  const streamDone = new Promise((resolve, reject) => {
    output.on("close", () => resolve());
    output.on("error", (error) => {
      reject(publisher.normalizeWriteError(error, tmpDestPath));
    });
    archive.on("error", (error) => {
      reject(error);
      output.destroy();
    });
    archive.on("warning", (error) => {
      if (error.code === "ENOENT") {
        log.warn(`archive warning: ${error.message}`);
      } else {
        reject(error);
        output.destroy();
      }
    });
  });
  void streamDone.catch(() => void 0);
  const onAbort = () => archive.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  let totalQueuedBytes = 0;
  if (opts?.onProgress) {
    const report = opts.onProgress;
    archive.on("progress", (data) => {
      report({ processedBytes: data.fs.processedBytes, totalBytes: totalQueuedBytes });
    });
  }
  archive.pipe(output);
  try {
    const collected = [];
    await collectFiles(folderPath, "", log, collected);
    for (const file of collected) {
      throwIfAborted();
      let key = null;
      if (file.size > DEDUP_MIN_BYTES) {
        const vaultHash = assetHashes.get(file.relPosix);
        if (vaultHash) {
          key = vaultHash;
        } else if (file.size <= SELF_HASH_MAX_BYTES) {
          try {
            key = `sha:${await streamingHashFile(file.absPath)}`;
          } catch (err) {
            log.warn(
              `hash failed for ${file.relPosix}: ${err instanceof Error ? err.message : String(err)}; writing without dedup`
            );
          }
        }
      }
      if (key !== null) {
        const existing = seenByKey.get(key);
        if (existing) {
          aliases.push({ from: file.relPosix, to: existing });
          continue;
        }
        seenByKey.set(key, file.relPosix);
      }
      const entryOpts = { name: file.relPosix, store: shouldStoreUncompressed(file.relPosix) };
      archive.file(file.absPath, entryOpts);
      totalQueuedBytes += file.size;
    }
    if (vaultSnapshotAbsPath) {
      archive.file(vaultSnapshotAbsPath, { name: ".hilo/index.sqlite" });
    }
    let opencodeSessionCount = 0;
    try {
      const opencodePayload = await fetchOpenCodeExport(
        gatewayUrl,
        folderPath,
        log,
        workspaceIdentity
      );
      if (opencodePayload) {
        opencodeSessionCount = opencodePayload.sessionCount;
        archive.append(JSON.stringify(opencodePayload), { name: OPENCODE_PAYLOAD_NAME });
      }
    } catch (err) {
      log.warn(
        `OpenCode session export failed for ${folderPath}; continuing with files only: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    if (aliases.length > 0) {
      const aliasManifest = { version: 1, entries: aliases };
      archive.append(JSON.stringify(aliasManifest), { name: ALIASES_NAME });
    }
    const manifest = buildManifest(
      folderPath,
      opencodeSessionCount,
      appVersion,
      archiveFormat,
      aliases.length
    );
    archive.append(JSON.stringify(manifest, null, 2), { name: MANIFEST_NAME });
    finalizePromise = archive.finalize();
    await Promise.all([finalizePromise, streamDone]);
    pipelineSettled = true;
    throwIfAborted();
    await publisher.commit(publication, async (tempPath) => {
      if (!await zipHasEocd(tempPath)) {
        throw new Error(
          "Export produced an incomplete archive (missing end-of-central-directory record). The export was likely interrupted (app quit, disk full, or workspace closed mid-export). No file was written; please retry."
        );
      }
    });
    if (vaultSnapshotAbsPath) {
      await fsp__default.rm(vaultSnapshotAbsPath, { force: true }).catch((err) => {
        log.warn(
          `Vault snapshot cleanup failed for ${vaultSnapshotAbsPath}: ${err instanceof Error ? err.message : String(err)}`
        );
      });
    }
    const finalStat = await fsp__default.stat(publication.destinationPath);
    return {
      filePath: publication.destinationPath,
      size: finalStat.size,
      opencodeSessionCount,
      dedupAliasCount: aliases.length
    };
  } catch (err) {
    if (!pipelineSettled) {
      const abortPromise = Promise.resolve().then(() => {
        archive.abort();
        archive.destroy();
      });
      outputForCleanup?.destroy();
      await Promise.allSettled([abortPromise, archiveClosed, outputClosed]);
    } else {
      outputForCleanup?.destroy();
    }
    await publisher.rollback(publication);
    if (vaultSnapshotAbsPath) {
      await fsp__default.rm(vaultSnapshotAbsPath, { force: true }).catch(() => {
      });
    }
    throw err;
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}
async function collectFiles(rootDir, relDir, log, collected) {
  const absDir = path__default.join(rootDir, relDir);
  const entries = await fsp__default.readdir(absDir, { withFileTypes: true });
  for (const entry of entries) {
    const relPosix = relDir ? `${relDir}/${entry.name}` : entry.name;
    if (isExcluded(relPosix)) continue;
    const absChild = path__default.join(absDir, entry.name);
    if (entry.isSymbolicLink()) {
      log.warn(`skip symlink: ${relPosix}`);
      continue;
    }
    if (entry.isDirectory()) {
      await collectFiles(rootDir, relPosix, log, collected);
    } else if (entry.isFile()) {
      const stat = await fsp__default.stat(absChild);
      collected.push({ relPosix, absPath: absChild, size: stat.size });
    }
  }
}
async function streamingHashFile(absPath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs__default.createReadStream(absPath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex").slice(0, 16)));
  });
}
const EOCD_SIGNATURE = Buffer.from([80, 75, 5, 6]);
const EOCD_SCAN_BYTES = 70 * 1024;
async function zipHasEocd(zipPath) {
  let handle;
  try {
    handle = await fsp__default.open(zipPath, "r");
    const { size } = await handle.stat();
    if (size < EOCD_SIGNATURE.length) return false;
    const readLen = Math.min(EOCD_SCAN_BYTES, size);
    const buf = Buffer.allocUnsafe(readLen);
    await handle.read(buf, 0, readLen, size - readLen);
    return buf.lastIndexOf(EOCD_SIGNATURE) !== -1;
  } finally {
    await handle?.close().catch(() => {
    });
  }
}
async function preflightScanArchive(zipPath) {
  const yauzl = await import("./index-C6OUj563.js").then((n) => n.i);
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (openErr, zipfile) => {
      if (openErr || !zipfile) {
        if (openErr && /end of central directory/i.test(openErr.message)) {
          reject(
            new Error(
              "This archive is incomplete or corrupted (missing end-of-central-directory record). It was likely truncated during export or transfer. Please re-export the project and try again."
            )
          );
          return;
        }
        reject(openErr ?? new Error("Failed to open archive"));
        return;
      }
      let totalUncompressedBytes = 0;
      let entryCount = 0;
      let manifestRaw = null;
      let settled = false;
      const fail = (err) => {
        if (settled) return;
        settled = true;
        zipfile.close();
        reject(err);
      };
      zipfile.on("error", fail);
      zipfile.on("entry", (entry) => {
        entryCount += 1;
        totalUncompressedBytes += entry.uncompressedSize;
        const isManifestEntry = entry.fileName === MANIFEST_NAME || /^[^/]+\/manifest\.json$/.test(entry.fileName);
        if (isManifestEntry && manifestRaw === null) {
          if (entry.uncompressedSize > MAX_MANIFEST_BYTES) {
            fail(new Error("Manifest too large — refusing to parse"));
            return;
          }
          zipfile.openReadStream(entry, (streamErr, stream) => {
            if (streamErr || !stream) {
              fail(streamErr ?? new Error("Failed to read manifest from archive"));
              return;
            }
            const chunks = [];
            stream.on("data", (chunk) => chunks.push(chunk));
            stream.on("error", fail);
            stream.on("end", () => {
              manifestRaw = Buffer.concat(chunks).toString("utf-8");
              zipfile.readEntry();
            });
          });
        } else {
          zipfile.readEntry();
        }
      });
      zipfile.on("end", () => {
        if (settled) return;
        settled = true;
        if (manifestRaw === null) {
          reject(new Error("Not a Hub project archive: manifest.json missing"));
          return;
        }
        try {
          resolve({
            manifest: parseManifestRaw(manifestRaw),
            totalUncompressedBytes,
            entryCount
          });
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
      zipfile.readEntry();
    });
  });
}
const DISK_SPACE_MARGIN_BYTES = 64 * 1024 * 1024;
async function assertDiskSpace(targetDir, requiredBytes, log) {
  let freeBytes;
  try {
    freeBytes = (await getDiskSpaceForPath(targetDir)).free;
  } catch (err) {
    log.warn(
      `disk-space probe failed for ${targetDir}: ${err instanceof Error ? err.message : String(err)}; skipping disk-space check`
    );
    return;
  }
  const needed = requiredBytes + DISK_SPACE_MARGIN_BYTES;
  if (freeBytes < needed) {
    const gib = (n) => `${(n / 1024 ** 3).toFixed(2)} GiB`;
    throw Object.assign(
      new Error(
        `Not enough disk space to import: the archive unpacks to ~${gib(requiredBytes)} but only ${gib(freeBytes)} is free at ${targetDir}. Free up space and retry.`
      ),
      { code: "ENOSPC", path: targetDir }
    );
  }
}
const STAGING_STALE_MS = 24 * 60 * 60 * 1e3;
async function sweepStaleStaging(stagingParent, log) {
  let entries;
  try {
    entries = await fsp__default.readdir(stagingParent);
  } catch {
    return;
  }
  const now = Date.now();
  for (const name of entries) {
    const abs = path__default.join(stagingParent, name);
    try {
      const stat = await fsp__default.stat(abs);
      if (now - stat.mtimeMs > STAGING_STALE_MS) {
        await fsp__default.rm(abs, { recursive: true, force: true });
        log.info(`Swept stale import staging dir: ${abs}`);
      }
    } catch (err) {
      log.warn(
        `Staging sweep failed for ${abs}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
async function pruneExcludedPaths(rootDir, log) {
  let pruned = 0;
  const walk = async (relDir) => {
    const absDir = path__default.join(rootDir, relDir);
    let entries;
    try {
      entries = await fsp__default.readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const relPosix = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (isArchiveJunk(relPosix)) {
        await fsp__default.rm(path__default.join(absDir, entry.name), { recursive: true, force: true }).then(() => {
          pruned += 1;
        }).catch((err) => {
          log.warn(
            `prune failed for ${relPosix}: ${err instanceof Error ? err.message : String(err)}`
          );
        });
        continue;
      }
      if (entry.isDirectory()) await walk(relPosix);
    }
  };
  await walk("");
  return pruned;
}
const DOWNLOAD_TIMEOUT_MS = 6e4;
const MAX_DOWNLOAD_BYTES = 500 * 1024 * 1024;
const MAX_DOWNLOAD_REDIRECTS = 5;
const DOWNLOAD_REDIRECT_STATUSES = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
async function fetchTrustedArchive(url, signal) {
  let currentUrl = url;
  for (let redirectCount = 0; ; redirectCount += 1) {
    assertTrustedArchiveUrl(currentUrl);
    const response = await fetch(currentUrl, { redirect: "manual", signal });
    if (!DOWNLOAD_REDIRECT_STATUSES.has(response.status)) {
      if (response.url) assertTrustedArchiveUrl(response.url);
      return response;
    }
    try {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error(`Template download redirect missing Location: HTTP ${response.status}`);
      }
      if (redirectCount >= MAX_DOWNLOAD_REDIRECTS) {
        throw new Error(`Template download exceeded ${MAX_DOWNLOAD_REDIRECTS} redirects`);
      }
      const nextUrl = new URL(location, currentUrl).toString();
      assertTrustedArchiveUrl(nextUrl);
      currentUrl = nextUrl;
    } finally {
      await response.body?.cancel().catch(() => void 0);
    }
  }
}
async function downloadArchiveToTemp(url, log) {
  const { Readable } = await import("node:stream");
  const { pipeline } = await import("node:stream/promises");
  const tmpDir = await fsp__default.mkdtemp(path__default.join(os__default.tmpdir(), "minimax-hub-template-"));
  const zipPath = path__default.join(tmpDir, "template.zip");
  try {
    log.info(`downloading template archive: ${url}`);
    const response = await fetchTrustedArchive(url, AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS));
    if (!response.ok || !response.body) {
      throw Object.assign(
        new Error(`Template download failed: HTTP ${response.status} ${response.statusText}`),
        { code: `HTTP_${response.status}` }
      );
    }
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > MAX_DOWNLOAD_BYTES) {
      throw Object.assign(new Error(`Template archive too large: ${declared} bytes`), {
        code: "ERR_ARCHIVE_TOO_LARGE"
      });
    }
    let received = 0;
    const guard = async function* (source) {
      for await (const chunk of source) {
        received += chunk.length;
        if (received > MAX_DOWNLOAD_BYTES) {
          throw Object.assign(
            new Error(`Template archive too large: exceeded ${MAX_DOWNLOAD_BYTES} bytes`),
            { code: "ERR_ARCHIVE_TOO_LARGE" }
          );
        }
        yield chunk;
      }
    };
    await pipeline(
      Readable.fromWeb(response.body),
      guard,
      fs__default.createWriteStream(zipPath)
    );
    log.info(`template archive downloaded: ${received} bytes -> ${zipPath}`);
    return zipPath;
  } catch (error) {
    await fsp__default.rm(tmpDir, { recursive: true, force: true }).catch(() => {
    });
    throw error;
  }
}
function hasFsHostileCodepoint(value) {
  for (const ch of value) {
    if ((ch.codePointAt(0) ?? 0) > 65535) return true;
  }
  return false;
}
function sanitizeRelPosixForFs(relPosix) {
  return relPosix.split("/").map((seg) => {
    if (!hasFsHostileCodepoint(seg)) return seg;
    const cleaned = Array.from(seg).map((ch) => (ch.codePointAt(0) ?? 0) > 65535 ? "_" : ch).join("");
    const short = crypto.createHash("sha1").update(seg).digest("hex").slice(0, 8);
    const dot = cleaned.lastIndexOf(".");
    return dot > 0 ? `${cleaned.slice(0, dot)}-${short}${cleaned.slice(dot)}` : `${cleaned}-${short}`;
  }).join("/");
}
function hardAsciiFallback(relPosix) {
  const segs = relPosix.split("/");
  const base = segs[segs.length - 1];
  const dot = base.lastIndexOf(".");
  const ext = dot > 0 ? base.slice(dot) : "";
  const short = crypto.createHash("sha1").update(relPosix).digest("hex").slice(0, 12);
  segs[segs.length - 1] = `asset-${short}${ext}`;
  return segs.join("/");
}
function isEilseqError(err) {
  const e = err;
  return e?.code === "EILSEQ" || /illegal byte sequence/i.test(e?.message ?? "");
}
function normalizeZipEntryName(name) {
  return name.replace(/\\/g, "/").replace(/^\/+/, "");
}
function safeJoinUnder(rootResolved, relPosix) {
  const abs = path__default.resolve(rootResolved, relPosix);
  if (abs !== rootResolved && !abs.startsWith(rootResolved + path__default.sep)) return null;
  return abs;
}
async function extractArchive(zipPath, stagingDir, log, onProgress) {
  const { extractZipSafe } = await import("./extract-zip-safe-Bhxshmqd.js").then((n) => n.I);
  let entriesProcessed = 0;
  try {
    await extractZipSafe(zipPath, stagingDir, {
      onEntry: (_entry, zipfile) => {
        entriesProcessed += 1;
        onProgress?.({ entriesProcessed, entriesTotal: zipfile.entryCount });
      },
      onSkipped: (reason, entryName) => log.warn(`import archive entry rejected (${reason}): ${entryName}`)
    });
    return [];
  } catch (err) {
    if (!isEilseqError(err)) throw err;
    log.warn(
      "Import extraction hit EILSEQ (target filesystem rejects some filenames); retrying with per-file filename sanitization"
    );
    await fsp__default.rm(stagingDir, { recursive: true, force: true });
    await fsp__default.mkdir(stagingDir, { recursive: true });
    return extractArchiveSanitizing(zipPath, stagingDir, log, onProgress);
  }
}
async function extractArchiveSanitizing(zipPath, stagingDir, log, onProgress, createWriteStreamImpl = fs__default.createWriteStream) {
  const { pipeline } = await import("node:stream/promises");
  const yauzl = await import("./index-C6OUj563.js").then((n) => n.i);
  const rewrites = [];
  const rootResolved = path__default.resolve(stagingDir);
  const openEntryStream = (zipfile, entry) => new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (err, stream) => {
      if (err || !stream) reject(err ?? new Error("Failed to open entry stream"));
      else resolve(stream);
    });
  });
  const openWriteTarget = async (absTarget) => {
    await fsp__default.mkdir(path__default.dirname(absTarget), { recursive: true });
    return new Promise((resolve, reject) => {
      const ws = createWriteStreamImpl(absTarget);
      const onOpen = () => {
        ws.removeListener("error", onError);
        resolve(ws);
      };
      const onError = (err) => {
        ws.removeListener("open", onOpen);
        ws.destroy();
        reject(err);
      };
      ws.once("open", onOpen);
      ws.once("error", onError);
    });
  };
  const writeEntry = async (zipfile, entry, writeStream) => {
    const readStream = await openEntryStream(zipfile, entry);
    await pipeline(readStream, writeStream);
  };
  await new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (openErr, zipfile) => {
      if (openErr || !zipfile) {
        reject(openErr ?? new Error("Failed to open archive"));
        return;
      }
      let processed = 0;
      let settled = false;
      const fail = (e) => {
        if (settled) return;
        settled = true;
        zipfile.close();
        reject(e);
      };
      const advance = () => {
        processed += 1;
        onProgress?.({ entriesProcessed: processed, entriesTotal: zipfile.entryCount });
        zipfile.readEntry();
      };
      zipfile.on("error", fail);
      zipfile.on("end", () => {
        if (settled) return;
        settled = true;
        resolve();
      });
      zipfile.on("entry", (entry) => {
        void (async () => {
          const relPosix = normalizeZipEntryName(entry.fileName);
          if (/\/$/.test(entry.fileName)) {
            const abs2 = safeJoinUnder(rootResolved, relPosix);
            if (abs2) {
              await fsp__default.mkdir(abs2, { recursive: true }).catch((e) => {
                if (!isEilseqError(e)) throw e;
              });
            }
            advance();
            return;
          }
          const abs = safeJoinUnder(rootResolved, relPosix);
          if (!abs) {
            log.warn(`skip entry outside staging dir (zip-slip): ${entry.fileName}`);
            advance();
            return;
          }
          let writeStream;
          try {
            writeStream = await openWriteTarget(abs);
          } catch (openErr2) {
            if (!isEilseqError(openErr2)) throw openErr2;
            let sanitizedRel = sanitizeRelPosixForFs(relPosix);
            if (sanitizedRel === relPosix) sanitizedRel = hardAsciiFallback(relPosix);
            const sanitizedAbs = safeJoinUnder(rootResolved, sanitizedRel);
            if (!sanitizedAbs) throw openErr2;
            writeStream = await openWriteTarget(sanitizedAbs);
            rewrites.push({ from: relPosix, to: sanitizedRel });
            log.info(`sanitized incompatible filename: "${relPosix}" -> "${sanitizedRel}"`);
          }
          await writeEntry(zipfile, entry, writeStream);
          advance();
        })().catch(fail);
      });
      zipfile.readEntry();
    });
  });
  return rewrites;
}
function rebaseRewrites(rewrites, stagingDir, sourceDir) {
  const stagingResolved = path__default.resolve(stagingDir);
  const sourceResolved = path__default.resolve(sourceDir);
  if (rewrites.length === 0 || stagingResolved === sourceResolved) return rewrites;
  const prefix = `${sourceResolved.slice(stagingResolved.length + 1).split(path__default.sep).join("/")}/`;
  const out = [];
  for (const r of rewrites) {
    if (r.from.startsWith(prefix) && r.to.startsWith(prefix)) {
      out.push({ from: r.from.slice(prefix.length), to: r.to.slice(prefix.length) });
    }
  }
  return out;
}
function rewriteJsonTree(value, fullMap) {
  let n = 0;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const item = value[i];
      if (typeof item === "string") {
        const r = fullMap.get(item);
        if (r !== void 0) {
          value[i] = r;
          n += 1;
        }
      } else if (item && typeof item === "object") {
        n += rewriteJsonTree(item, fullMap);
      }
    }
    return n;
  }
  if (value && typeof value === "object") {
    const obj = value;
    for (const key of Object.keys(obj)) {
      const v = obj[key];
      if (typeof v === "string") {
        if (key === "name") continue;
        const full = fullMap.get(v);
        if (full !== void 0) {
          obj[key] = full;
          n += 1;
        }
      } else if (v && typeof v === "object") {
        n += rewriteJsonTree(v, fullMap);
      }
    }
    return n;
  }
  return 0;
}
async function rewriteReferences(sourceDir, rewrites, log) {
  if (rewrites.length === 0) return 0;
  const fullMap = /* @__PURE__ */ new Map();
  for (const r of rewrites) {
    fullMap.set(r.from, r.to);
  }
  const hiloDir = path__default.join(sourceDir, ".hilo");
  let entries;
  try {
    entries = await fsp__default.readdir(hiloDir, { withFileTypes: true });
  } catch {
    return 0;
  }
  let total = 0;
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const filePath = path__default.join(hiloDir, entry.name);
    let parsed;
    try {
      parsed = JSON.parse(await fsp__default.readFile(filePath, "utf-8"));
    } catch {
      continue;
    }
    const changed = rewriteJsonTree(parsed, fullMap);
    if (changed > 0) {
      await fsp__default.writeFile(filePath, JSON.stringify(parsed));
      total += changed;
      log.info(`rewrote ${changed} reference(s) in .hilo/${entry.name}`);
    }
  }
  return total;
}
async function postVaultPathRewrite(gatewayUrl, vaultDbPath, rewrites, log) {
  if (!gatewayUrl || rewrites.length === 0) return 0;
  if (!fs__default.existsSync(vaultDbPath)) return 0;
  try {
    const url = joinProjectArchiveGatewayUrl(gatewayUrl, "/api/projects/archive/rewrite-vault-paths");
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ vaultDbPath, renames: rewrites })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "<no body>");
      log.warn(`gateway rewrite-vault-paths ${response.status}: ${detail}`);
      return 0;
    }
    const body = await response.json();
    return body.rewritten ?? 0;
  } catch (err) {
    log.warn(`vault path rewrite failed: ${err instanceof Error ? err.message : String(err)}`);
    return 0;
  }
}
async function importProjectFromZip(zipPath, gatewayUrl, log, opencodeDbPath = "", opts) {
  const resolvedZipPath = path__default.resolve(zipPath);
  opts?.onPhase?.("validate");
  const preflight = await preflightScanArchive(resolvedZipPath);
  opts?.onPhase?.("prepare");
  const projectsRoot = getProjectsRoot();
  await fsp__default.mkdir(projectsRoot, { recursive: true });
  await assertDiskSpace(projectsRoot, preflight.totalUncompressedBytes, log);
  const stagingParent = path__default.join(projectsRoot, PROJECTS_STAGING_DIR_NAME);
  await fsp__default.mkdir(stagingParent, { recursive: true });
  await sweepStaleStaging(stagingParent, log);
  const stagingRoot = await fsp__default.mkdtemp(path__default.join(stagingParent, "import-"));
  const stagingDir = path__default.join(stagingRoot, "extracted");
  await fsp__default.mkdir(stagingDir, { recursive: true });
  try {
    opts?.onPhase?.("extract");
    const rawRenames = await extractArchive(resolvedZipPath, stagingDir, log, opts?.onProgress);
    opts?.onPhase?.("restore");
    const sourceDir = await detectContentRoot(stagingDir);
    const manifest = await readManifest(sourceDir);
    const opencodePayload = await readOpenCodePayload(sourceDir);
    const aliasManifest = await readAliasManifest(sourceDir);
    const renames = rebaseRewrites(rawRenames, stagingDir, sourceDir);
    const renameMap = new Map(renames.map((r) => [r.from, r.to]));
    const rematerializedAliasCount = aliasManifest ? await rematerializeAliases(
      sourceDir,
      aliasManifest,
      log,
      renameMap.size > 0 ? renameMap : void 0,
      (from, to) => {
        if (!renameMap.has(from)) {
          renameMap.set(from, to);
          renames.push({ from, to });
        }
      }
    ) : 0;
    if (renames.length > 0) {
      const rewritten = await rewriteReferences(sourceDir, renames, log);
      const vaultRewritten = await postVaultPathRewrite(
        gatewayUrl,
        path__default.join(sourceDir, ".hilo", "index.sqlite"),
        renames,
        log
      );
      log.info(
        `Sanitized ${renames.length} incompatible filename(s); rewrote ${rewritten} metadata reference(s) and ${vaultRewritten} vault path(s)`
      );
    }
    const prunedCount = await pruneExcludedPaths(sourceDir, log);
    if (prunedCount > 0) {
      log.info(`Pruned ${prunedCount} excluded path(s) from imported archive`);
    }
    const seedName = opts?.projectNameOverride?.trim() || (manifest.name && manifest.name.length > 0 ? manifest.name : "imported");
    await fsp__default.rm(path__default.join(sourceDir, MANIFEST_NAME), { force: true });
    await fsp__default.rm(path__default.join(sourceDir, OPENCODE_PAYLOAD_NAME), { force: true });
    await fsp__default.rm(path__default.join(sourceDir, ALIASES_NAME), { force: true });
    await fsp__default.rmdir(path__default.join(sourceDir, ".hub")).catch(() => {
    });
    opts?.onPhase?.("publish");
    const targetDir = await publishImportDirectory(
      sourceDir,
      () => generateProjectDirName(seedName),
      {
        onRetry: (event) => {
          log.warn(`import directory retry ${JSON.stringify(event)}`);
          opts?.onPublishRetry?.(event.attempt);
        }
      }
    );
    opts?.onPhase?.("sessions");
    let opencodeSessionCount = 0;
    let opencodeImportError;
    let opencodeImportErrorCode;
    const expectedOpencodeSessionCount = manifest.opencodeSessionCount ?? opencodePayload?.sessions.length ?? 0;
    if (opencodePayload && opencodePayload.sessions.length > 0) {
      const oldDir = opencodePayload.sourceDirectory || manifest.sourceDirectory;
      if (!oldDir) {
        opencodeImportError = "Original workspace path unknown; skipped session import to avoid path-rewrite breakage";
        log.warn(`OpenCode session import skipped: ${opencodeImportError}`);
      } else {
        try {
          const result = await postOpenCodeImport(
            gatewayUrl,
            opencodePayload,
            oldDir,
            targetDir,
            opencodeDbPath
          );
          opencodeSessionCount = result.insertedSessions;
        } catch (err) {
          opencodeImportError = err instanceof Error ? err.message : String(err);
          opencodeImportErrorCode = importErrorCode(err);
          log.warn(`OpenCode session import failed: ${JSON.stringify(importErrorDiagnostic(err))}`);
        }
      }
    }
    log.info(
      `Imported project: zip=${zipPath} target=${targetDir} sessions=${opencodeSessionCount}/${expectedOpencodeSessionCount} aliases=${rematerializedAliasCount} (manifest name="${manifest.name}")`
    );
    return {
      targetDir,
      name: path__default.basename(targetDir),
      originalName: manifest.name,
      opencodeSessionCount,
      expectedOpencodeSessionCount,
      opencodeImportError,
      opencodeImportErrorCode,
      rematerializedAliasCount
    };
  } finally {
    await fsp__default.rm(stagingRoot, { recursive: true, force: true }).catch((error) => {
      log.warn(`import staging cleanup deferred ${JSON.stringify(importErrorDiagnostic(error))}`);
    });
  }
}
async function detectContentRoot(stagingDir) {
  const entries = await fsp__default.readdir(stagingDir, { withFileTypes: true });
  if (entries.length !== 1 || !entries[0].isDirectory()) return stagingDir;
  const candidate = path__default.join(stagingDir, entries[0].name);
  const wrappedManifest = path__default.join(candidate, MANIFEST_NAME);
  const wrappedStat = await fsp__default.stat(wrappedManifest).catch(() => null);
  return wrappedStat?.isFile() ? candidate : stagingDir;
}
async function readManifest(sourceDir) {
  const manifestPath = path__default.join(sourceDir, MANIFEST_NAME);
  let stat;
  try {
    stat = await fsp__default.stat(manifestPath);
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error("Not a Hub project archive: manifest.json missing");
    }
    throw err;
  }
  if (!stat.isFile()) {
    throw new Error("manifest.json is not a regular file");
  }
  if (stat.size > MAX_MANIFEST_BYTES) {
    throw new Error("Manifest too large — refusing to parse");
  }
  const raw = await fsp__default.readFile(manifestPath, "utf-8");
  return parseManifestRaw(raw);
}
function parseManifestRaw(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Manifest is not valid JSON");
  }
  if (!isManifest(parsed)) {
    throw new Error("Manifest schema mismatch — not a Hub project archive");
  }
  if (parsed.magic !== ARCHIVE_MAGIC) {
    throw new Error("Archive magic mismatch — not a Hub project archive");
  }
  if (parsed.manifestVersion > MANIFEST_VERSION) {
    throw new Error(
      `Archive was produced by a newer Hub (manifest v${parsed.manifestVersion}); please update`
    );
  }
  return parsed;
}
function isManifest(value) {
  if (!value || typeof value !== "object") return false;
  const v = value;
  return typeof v.magic === "string" && typeof v.manifestVersion === "number" && typeof v.name === "string" && typeof v.appVersion === "string" && typeof v.exportedAt === "string";
}
async function readOpenCodePayload(sourceDir) {
  const payloadPath = path__default.join(sourceDir, OPENCODE_PAYLOAD_NAME);
  let stat;
  try {
    stat = await fsp__default.stat(payloadPath);
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
  if (!stat.isFile()) return null;
  if (stat.size > MAX_OPENCODE_PAYLOAD_BYTES) {
    throw new Error(
      `Session payload too large (${stat.size}B > ${MAX_OPENCODE_PAYLOAD_BYTES}B) — refusing to parse`
    );
  }
  const raw = await fsp__default.readFile(payloadPath, "utf-8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Session payload is not valid JSON");
  }
  if (!isOpenCodePayload(parsed)) {
    throw new Error("Session payload schema mismatch");
  }
  return parsed;
}
async function readAliasManifest(sourceDir) {
  const aliasesPath = path__default.join(sourceDir, ALIASES_NAME);
  let stat;
  try {
    stat = await fsp__default.stat(aliasesPath);
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
  if (!stat.isFile()) return null;
  if (stat.size > MAX_ALIASES_BYTES) {
    throw new Error(
      `Aliases manifest too large (${stat.size}B > ${MAX_ALIASES_BYTES}B) — refusing to parse`
    );
  }
  const raw = await fsp__default.readFile(aliasesPath, "utf-8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Aliases manifest is not valid JSON");
  }
  if (!isAliasManifest(parsed)) {
    throw new Error("Aliases manifest schema mismatch");
  }
  return parsed;
}
function isAliasManifest(value) {
  if (!value || typeof value !== "object") return false;
  const v = value;
  if (v.version !== 1) return false;
  if (!Array.isArray(v.entries)) return false;
  for (const entry of v.entries) {
    if (!entry || typeof entry !== "object") return false;
    const e = entry;
    if (typeof e.from !== "string" || typeof e.to !== "string") return false;
    if (e.from.length === 0 || e.to.length === 0) return false;
  }
  return true;
}
async function rematerializeAliases(sourceDir, manifest, log, renameMap, recordRewrite) {
  const sourceRoot = path__default.resolve(sourceDir);
  const expectedPrefix = sourceRoot + path__default.sep;
  let materialized = 0;
  for (const entry of manifest.entries) {
    let fromRel = entry.from;
    let toRel = entry.to;
    if (renameMap) {
      fromRel = renameMap.get(fromRel) ?? fromRel;
      toRel = renameMap.get(toRel) ?? toRel;
      if (hasFsHostileCodepoint(fromRel)) {
        const sanitized = sanitizeRelPosixForFs(fromRel);
        if (sanitized !== fromRel) {
          recordRewrite?.(entry.from, sanitized);
          fromRel = sanitized;
        }
      }
      if (hasFsHostileCodepoint(toRel)) toRel = sanitizeRelPosixForFs(toRel);
    }
    const fromAbs = path__default.resolve(sourceDir, fromRel);
    const toAbs = path__default.resolve(sourceDir, toRel);
    if (!fromAbs.startsWith(expectedPrefix) || !toAbs.startsWith(expectedPrefix)) {
      log.warn(`alias skipped (path escape): from=${fromRel} to=${toRel}`);
      continue;
    }
    const toStat = await fsp__default.stat(toAbs).catch(() => null);
    if (!toStat?.isFile()) {
      log.warn(`alias skipped (target missing): from=${fromRel} to=${toRel}`);
      continue;
    }
    const fromStat = await fsp__default.stat(fromAbs).catch(() => null);
    if (fromStat) {
      log.warn(`alias skipped (already present): from=${fromRel}`);
      continue;
    }
    await fsp__default.mkdir(path__default.dirname(fromAbs), { recursive: true });
    try {
      await fsp__default.link(toAbs, fromAbs);
      materialized += 1;
    } catch (linkErr) {
      const code = linkErr.code;
      if (code !== "EXDEV" && code !== "EPERM") {
        log.warn(
          `alias hardlink failed (${code ?? "unknown"}): from=${fromRel} to=${toRel}; falling back to copy`
        );
      }
      try {
        await fsp__default.copyFile(toAbs, fromAbs);
        materialized += 1;
      } catch (copyErr) {
        log.warn(
          `alias copy failed: from=${fromRel} to=${toRel}: ${copyErr instanceof Error ? copyErr.message : String(copyErr)}`
        );
      }
    }
  }
  return materialized;
}
function isOpenCodePayload(value) {
  if (!value || typeof value !== "object") return false;
  const v = value;
  if (typeof v.format !== "string" || typeof v.sourceDirectory !== "string" || typeof v.sessionCount !== "number" || !Array.isArray(v.sessions) || !Array.isArray(v.messages) || !Array.isArray(v.parts) || !Array.isArray(v.todos)) {
    return false;
  }
  if (v.sessions.length > 0 && !isSessionRow(v.sessions[0])) return false;
  if (v.messages.length > 0 && !isMessageRow(v.messages[0])) return false;
  if (v.parts.length > 0 && !isPartRow(v.parts[0])) return false;
  if (v.todos.length > 0 && !isTodoRow(v.todos[0])) return false;
  return true;
}
function isSessionRow(value) {
  if (!value || typeof value !== "object") return false;
  const r = value;
  return typeof r.id === "string" && typeof r.directory === "string" && typeof r.title === "string" && typeof r.time_created === "number";
}
function isMessageRow(value) {
  if (!value || typeof value !== "object") return false;
  const r = value;
  return typeof r.id === "string" && typeof r.session_id === "string" && typeof r.data === "string" && typeof r.time_created === "number";
}
function isPartRow(value) {
  if (!value || typeof value !== "object") return false;
  const r = value;
  return typeof r.id === "string" && typeof r.message_id === "string" && typeof r.session_id === "string" && typeof r.data === "string";
}
function isTodoRow(value) {
  if (!value || typeof value !== "object") return false;
  const r = value;
  return typeof r.session_id === "string" && typeof r.content === "string" && typeof r.position === "number";
}
async function prepareVaultSnapshot(gatewayUrl, workspaceDir, log, workspaceIdentity) {
  const url = joinProjectArchiveGatewayUrl(gatewayUrl, "/api/projects/archive/prepare-export");
  const response = await fetch(url, {
    method: "POST",
    headers: projectArchiveGatewayHeaders(workspaceIdentity),
    body: JSON.stringify({ dir: workspaceDir })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "<no body>");
    throw new Error(`gateway prepare-export ${response.status}: ${detail}`);
  }
  const body = await response.json();
  const expectedPrefix = path__default.join(workspaceDir, ".hilo", ".tmp") + path__default.sep;
  const snapshotAbsPath = path__default.resolve(workspaceDir, body.snapshotRelPath);
  if (!snapshotAbsPath.startsWith(expectedPrefix)) {
    throw new Error(`gateway returned snapshot path outside .hilo/.tmp/: ${body.snapshotRelPath}`);
  }
  log.info(
    `Vault snapshot ready: ${body.snapshotRelPath} (${body.sizeBytes}B) for ${workspaceDir}`
  );
  return { snapshotAbsPath, sizeBytes: body.sizeBytes };
}
async function fetchOpenCodeExport(gatewayUrl, workspaceDir, log, workspaceIdentity) {
  if (!gatewayUrl) {
    log.warn("Gateway URL not provided; skipping OpenCode session export");
    return null;
  }
  const url = joinProjectArchiveGatewayUrl(gatewayUrl, "/api/projects/archive/export");
  const response = await fetch(url, {
    method: "POST",
    headers: projectArchiveGatewayHeaders(workspaceIdentity),
    body: JSON.stringify({ dir: workspaceDir })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "<no body>");
    throw new Error(`gateway project-archive export ${response.status}: ${detail}`);
  }
  const body = await response.json();
  return body.payload;
}
async function fetchAssetHashes(gatewayUrl, workspaceDir, log, workspaceIdentity) {
  if (!gatewayUrl) return /* @__PURE__ */ new Map();
  try {
    const url = joinProjectArchiveGatewayUrl(gatewayUrl, "/api/projects/archive/asset-hashes");
    const response = await fetch(url, {
      method: "POST",
      headers: projectArchiveGatewayHeaders(workspaceIdentity),
      body: JSON.stringify({ dir: workspaceDir })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "<no body>");
      log.warn(`gateway asset-hashes ${response.status}: ${detail} (continuing without dedup)`);
      return /* @__PURE__ */ new Map();
    }
    const body = await response.json();
    const hashes = body.hashes ?? {};
    const map = /* @__PURE__ */ new Map();
    for (const [k, v] of Object.entries(hashes)) {
      if (typeof k === "string" && typeof v === "string" && v.length > 0) {
        map.set(k, v);
      }
    }
    return map;
  } catch (err) {
    log.warn(
      `asset-hashes fetch failed: ${err instanceof Error ? err.message : String(err)} (continuing without dedup)`
    );
    return /* @__PURE__ */ new Map();
  }
}
export {
  ExportCancelledError,
  assertDiskSpace,
  downloadArchiveToTemp,
  exportProjectToZip,
  extractArchiveSanitizing,
  fetchAssetHashes,
  getDefaultExportFileName,
  hasFsHostileCodepoint,
  importProjectFromZip,
  isAliasManifest,
  isManifest,
  isOpenCodePayload,
  preflightScanArchive,
  prepareVaultSnapshot,
  pruneExcludedPaths,
  rematerializeAliases,
  rewriteReferences,
  sanitizeRelPosixForFs,
  shouldStoreUncompressed,
  streamingHashFile,
  withProjectExportActivity,
  zipHasEocd
};
