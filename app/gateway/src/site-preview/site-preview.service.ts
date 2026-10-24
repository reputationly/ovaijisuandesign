/**
 * 站点预览：把 Resources 里的 .zip 网站包按独立 origin 提供出来。
 *
 * 安全边界：只读 active 的 file 资源、只接受工作区内真实文件路径；zip 条目拒绝绝对路径、
 * `..`、反斜杠、符号链接和压缩炸弹。内容不写回磁盘，也不访问外网。
 */
import { lstatSync, realpathSync } from "node:fs";
import { join, posix, extname } from "node:path";

import { Injectable, NotFoundException } from "@nestjs/common";
import { lookup as lookupMime } from "mime-types";
import * as yauzl from "yauzl";

import { SITE_PREVIEW_ENTRY, type SitePreviewManifest } from "@ov/protocol";
import { ProjectResourceService } from "../project-kernel/resource.service.js";

const MAX_ENTRIES = 20_000;
const MAX_ENTRY_BYTES = 200 * 1024 * 1024;
const BOMB_RATIO = 100;
const BOMB_MIN_BYTES = 10 * 1024 * 1024;
const CACHE_SIZE = 16;
const MANIFEST_CACHE_SIZE = 2_000;

const SOURCE_PROJECT_FILES = [
  /^package\.json$/,
  /^(vite|webpack|rollup|svelte|astro|next|nuxt)\.config\.[cm]?[jt]s$/,
  /^tsconfig\.json$/,
];

const EXTRA_TYPES: Record<string, string> = {
  ".mjs": "text/javascript",
  ".js": "text/javascript",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json",
};

interface SiteIndex {
  zip: yauzl.ZipFile;
  entries: Map<string, yauzl.Entry>;
  manifest: SitePreviewManifest | { site: false };
}

@Injectable()
export class SitePreviewService {
  private readonly cache = new Map<string, Promise<SiteIndex>>();
  private readonly manifests = new Map<string, SitePreviewManifest | { site: false }>();

  constructor(private readonly resources: ProjectResourceService) {}

  async manifest(versionId: string): Promise<SitePreviewManifest | { site: false }> {
    const cached = this.manifests.get(versionId);
    if (cached) return cached;
    const index = await this.index(versionId).catch((error) => {
      if (error instanceof NotFoundException) return undefined;
      throw error;
    });
    if (!index) return { site: false };
    this.manifests.set(versionId, index.manifest);
    if (this.manifests.size > MANIFEST_CACHE_SIZE) {
      const oldest = this.manifests.keys().next().value;
      if (oldest !== undefined) this.manifests.delete(oldest);
    }
    return index.manifest;
  }

  async file(versionId: string, requestPath: string, acceptsHtml: boolean) {
    const index = await this.index(versionId);
    if (!index.manifest.site) throw new NotFoundException();
    const path = resolveSitePath(index.entries, requestPath, acceptsHtml);
    const entry = path ? index.entries.get(path) : undefined;
    if (!path || !entry) throw new NotFoundException();
    const stream = await new Promise<import("node:stream").Readable>((done, fail) =>
      index.zip.openReadStream(entry, (error, readable) =>
        error || !readable ? fail(error ?? new Error("Entry unreadable")) : done(readable),
      ),
    );
    return { stream, size: entry.uncompressedSize, contentType: siteContentType(path) };
  }

  onModuleDestroy(): void {
    for (const pending of this.cache.values()) void pending.then((index) => index.zip.close()).catch(() => undefined);
    this.cache.clear();
  }

  private index(versionId: string): Promise<SiteIndex> {
    const cached = this.cache.get(versionId);
    if (cached) {
      this.cache.delete(versionId);
      this.cache.set(versionId, cached);
      return cached;
    }
    const created = this.load(versionId);
    this.cache.set(versionId, created);
    created.catch(() => {
      if (this.cache.get(versionId) === created) this.cache.delete(versionId);
    });
    while (this.cache.size > CACHE_SIZE) {
      const [oldest, pending] = this.cache.entries().next().value as [string, Promise<SiteIndex>];
      this.cache.delete(oldest);
      void pending.then((index) => index.zip.close()).catch(() => undefined);
    }
    return created;
  }

  private async load(versionId: string): Promise<SiteIndex> {
    const workspace = process.env.WORKSPACE_DIR;
    if (!workspace) throw new NotFoundException();
    let snapshot: ReturnType<ProjectResourceService["queryResource"]>;
    try {
      snapshot = this.resources.queryResource({ versionId });
    } catch {
      throw new NotFoundException();
    }
    const relativePath = snapshot.version?.relativePath;
    if (
      snapshot.resource.lifecycle !== "active" ||
      snapshot.resource.kind !== "file" ||
      snapshot.version?.status !== "ready" ||
      !relativePath ||
      !relativePath.toLowerCase().endsWith(".zip")
    ) {
      throw new NotFoundException();
    }
    const root = realpathSync(workspace);
    const full = safeResourcePath(root, relativePath);
    if (!full) throw new NotFoundException();
    const zip = await new Promise<yauzl.ZipFile>((done, fail) =>
      yauzl.open(full, { lazyEntries: true, autoClose: false, validateEntrySizes: true, strictFileNames: false }, (error, file) =>
        error || !file ? fail(error ?? new Error("Zip unreadable")) : done(file),
      ),
    );
    const entries = new Map<string, yauzl.Entry>();
    let total = 0;
    try {
      await new Promise<void>((done, fail) => {
        zip.on("error", fail);
        zip.on("end", () => done());
        zip.on("entry", (entry) => {
          if (entries.size >= MAX_ENTRIES) {
            done();
            return;
          }
          const path = siteEntryPath(entry);
          if (path) {
            entries.set(path, entry);
            total += entry.uncompressedSize;
          }
          zip.readEntry();
        });
        zip.readEntry();
      });
    } catch {
      zip.close();
      return { zip, entries: new Map(), manifest: { site: false } };
    }
    return {
      zip,
      entries,
      manifest: isSitePackage(entries)
        ? { site: true, entry: SITE_PREVIEW_ENTRY, fileCount: entries.size, totalBytes: total }
        : { site: false },
    };
  }
}

/** 工作区内的真实文件：拒绝 NUL、反斜杠、绝对路径、`..`、`.hilo` 和符号链接。 */
function safeResourcePath(root: string, relativePath: string): string | undefined {
  if (
    !relativePath ||
    relativePath.includes("\0") ||
    relativePath.includes("\\") ||
    relativePath.includes(":") ||
    posix.isAbsolute(relativePath) ||
    relativePath.split("/").some((part) => !part || part === "." || part === "..") ||
    relativePath.split("/")[0] === ".hilo"
  ) {
    return undefined;
  }
  let current = root;
  try {
    const parts = relativePath.split("/");
    for (let index = 0; index < parts.length; index += 1) {
      current = join(current, parts[index] ?? "");
      const stat = lstatSync(current);
      if (stat.isSymbolicLink()) return undefined;
      if (index === parts.length - 1 ? !stat.isFile() : !stat.isDirectory()) return undefined;
    }
    return current;
  } catch {
    return undefined;
  }
}

function isSitePackage(entries: Map<string, yauzl.Entry>): boolean {
  if (!entries.has(SITE_PREVIEW_ENTRY)) return false;
  for (const path of entries.keys()) {
    if (!path.includes("/") && SOURCE_PROJECT_FILES.some((pattern) => pattern.test(path))) return false;
  }
  return true;
}

function siteEntryPath(entry: yauzl.Entry): string | undefined {
  const name = entry.fileName;
  if (
    !name ||
    name.endsWith("/") ||
    name.includes("\\") ||
    name.includes("\0") ||
    name.startsWith("/") ||
    /^[A-Za-z]:/.test(name) ||
    name.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    return undefined;
  }
  if (((entry.externalFileAttributes >>> 16) & 0o170000) === 0o120000) return undefined;
  if (entry.uncompressedSize > MAX_ENTRY_BYTES) return undefined;
  if (entry.uncompressedSize > BOMB_MIN_BYTES && entry.compressedSize > 0 && entry.uncompressedSize / entry.compressedSize > BOMB_RATIO) {
    return undefined;
  }
  return name;
}

function resolveSitePath(entries: Map<string, yauzl.Entry>, requestPath: string, acceptsHtml: boolean): string | undefined {
  if (requestPath.split("/").includes("..") || requestPath.includes("\\")) return undefined;
  const normalized = posix.normalize(`/${requestPath}`).slice(1);
  const candidates = !normalized
    ? [SITE_PREVIEW_ENTRY]
    : normalized.endsWith("/")
      ? [`${normalized}${SITE_PREVIEW_ENTRY}`]
      : [normalized, `${normalized}/${SITE_PREVIEW_ENTRY}`];
  for (const candidate of candidates) if (entries.has(candidate)) return candidate;
  const last = normalized.split("/").at(-1) ?? "";
  if (acceptsHtml && !last.includes(".")) return SITE_PREVIEW_ENTRY;
  return undefined;
}

function siteContentType(path: string): string {
  const extension = extname(path).toLowerCase();
  const type = EXTRA_TYPES[extension] ?? (lookupMime(path) || "application/octet-stream");
  return /^(text\/|application\/(json|manifest\+json))/.test(type) || type === "image/svg+xml"
    ? `${type}; charset=utf-8`
    : type;
}
