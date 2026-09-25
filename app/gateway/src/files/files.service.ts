import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { reconcileWorkspace, toAssetInfo } from "@ov/assets";
import { type AssetInfo, detectFileType, MEDIA_EXTENSIONS } from "@ov/protocol";

import { AssetChangeLog } from "../common/asset-change-log.js";
import { AssetsService } from "../common/assets.service.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { type UndoOp, TrashBufferService } from "../operations/trash-buffer.service.js";
import { deriveImportTarget, sanitizeFileName, uploadFileName, writeFileExclusive, writeUniqueSpaced } from "./file-names.js";
import { assertPublicUrl, SsrfError } from "./ssrf.js";

/** `.hilo/` 下只允许读写这两类：表格文档和文本节点的旧存放位置。其余是内部状态。 */
const HILO_ALLOWED = [/^\.hilo\/tables\/[A-Za-z0-9_-]+\.htable$/, /^\.hilo\/texts\/[^\\/]+\.md$/];

/** 下载超时按类型分：视频大、图片小。 */
const IMPORT_TIMEOUT_MS: Record<string, number> = { video: 120_000, audio: 60_000, image: 30_000 };

/** 单个删除任务的上限。卡住的话后面排队的删除全堵着，不如失败让用户重试。 */
const MUTATION_TIMEOUT_MS = 5500;

export interface UploadedFileLike {
  originalname: string;
  buffer: Buffer;
}

@Injectable()
export class FilesService {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly paths: WorkspacePathService,
    private readonly assets: AssetsService,
    private readonly changes: AssetChangeLog,
    private readonly trash: TrashBufferService,
  ) {}

  /** 相对路径 → 绝对路径，越界统一 400（不回显路径，免得把探测结果反馈给调用方）。 */
  resolve(rel: string): string {
    const abs = rel === "" ? this.paths.root : this.paths.resolve(rel);
    if (!abs) throw new BadRequestException("Path traversal detected");
    return abs;
  }

  private assertHiloAccess(rel: string): void {
    const p = rel.replace(/\\/g, "/").replace(/^\.\//, "");
    if (p.startsWith(".hilo/") && !HILO_ALLOWED.some((re) => re.test(p))) {
      throw new ForbiddenException(
        `Access to .hilo/ is restricted; only .hilo/tables/<id>.htable and .hilo/texts/<name>.md are allowed (got: ${rel})`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // 资产
  // -------------------------------------------------------------------------

  listAssets(opts: { includeMetadata: boolean; path?: string }): { assets: AssetInfo[] } {
    if (opts.path) {
      const row = this.assets.byPath(opts.path);
      return { assets: row ? [toAssetInfo(row, opts)] : [] };
    }
    return { assets: this.assets.list(opts) };
  }

  assetsInFolder(folder: string): AssetInfo[] {
    return this.assets.vault.listByFolder(folder.replace(/,/g, "/")).map((r) => toAssetInfo(r));
  }

  patchMetadata(id: string, patch: Record<string, unknown>) {
    if (!id) throw new BadRequestException("asset id path param is required");
    const row = this.assets.byId(id);
    if (!row) throw new NotFoundException(`Asset not found: ${id}`);
    let merged: Record<string, unknown> = {};
    try {
      merged = row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : {};
    } catch {
      merged = {};
    }
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) delete merged[k];
      else merged[k] = v;
    }
    const updated = this.assets.vault.setMetadata(id, merged)!;
    this.changes.emit(this.paths.root, { id, change: "updated", asset: toAssetInfo(updated), path: updated.path });
    return { ok: true, metadata: merged };
  }

  // -------------------------------------------------------------------------
  // 和盘上对账 / 找不到的文件
  // -------------------------------------------------------------------------

  /** 和盘上的文件对一遍账，变化合成一条 `assets:changed_batch` 发出去（渲染层一次刷新，不是几百次）。 */
  async reconcileAssets() {
    const { result, changes } = await reconcileWorkspace(this.assets.vault);
    this.changes.emitBatch(
      this.paths.root,
      changes.map((c) => {
        const row = this.assets.byId(c.id);
        return { ...c, ...(row ? { asset: toAssetInfo(row) } : {}) };
      }),
    );
    return result;
  }

  private missingRow(id: string) {
    const row = this.assets.byId(id);
    if (!row) throw new NotFoundException(`Asset not found: ${id}`);
    return row;
  }

  async mergeCandidate(id: string, candidateId: string) {
    const row = this.missingRow(id);
    if (!this.assets.byId(candidateId)) throw new NotFoundException(`Asset not found: ${candidateId}`);
    const moved = await this.assets.vault.mergeCandidate(id, candidateId);
    this.changes.emit(this.paths.root, { id: candidateId, change: "removed", path: moved.path });
    this.changes.emit(this.paths.root, { id, change: "renamed", asset: toAssetInfo(moved), path: moved.path, old_path: row.path });
    return { ok: true };
  }

  removeMissing(id: string) {
    const row = this.missingRow(id);
    if (row.status !== "missing") throw new BadRequestException(`Asset is not missing: ${id}`);
    this.assets.vault.removeMissing(id);
    this.changes.emit(this.paths.root, { id, change: "removed", path: row.path });
    return { ok: true };
  }

  /** 用户手动指出文件现在在哪。新位置上已经登记过的那条会被并掉，保留老 id。 */
  async locate(id: string, newPath: string) {
    const row = this.missingRow(id);
    const abs = this.paths.resolve(newPath);
    if (!abs) throw new BadRequestException("Path traversal detected");
    const st = await stat(abs).catch(() => undefined);
    if (!st?.isFile()) throw new NotFoundException(`File not found: ${newPath}`);
    const moved = await this.assets.vault.rebind(id, path.relative(this.paths.root, abs).split(path.sep).join("/"));
    this.changes.emit(this.paths.root, { id, change: "renamed", asset: toAssetInfo(moved), path: moved.path, old_path: row.path });
    return { ok: true };
  }

  // -------------------------------------------------------------------------
  // 上传 / 导入
  // -------------------------------------------------------------------------

  /**
   * 上传。默认放工作区根目录（不按类型分子目录），同名不覆盖。扩展名认得的才入库 ——
   * 随手拖进来的 .zip 之类没必要出现在资产面板里。
   */
  async upload(file: UploadedFileLike, opts: { folder?: string; useDefaultDir?: boolean; staging?: boolean }) {
    const name = uploadFileName(file.originalname);
    let dir: string;
    if (opts.staging && !opts.folder && !opts.useDefaultDir) {
      dir = this.paths.hilo(".tmp", "uploads", randomUUID());
    } else if (opts.folder) {
      dir = this.resolve(opts.folder);
    } else {
      dir = this.paths.root;
    }
    await mkdir(dir, { recursive: true });
    const abs = await writeFileExclusive(path.join(dir, name), file.buffer);
    const rel = this.paths.relativize(abs) ?? name;
    const result: Record<string, unknown> = { ok: true, path: rel, relative: rel };
    if (opts.staging && !opts.folder && !opts.useDefaultDir) return { ...result, staged: true };
    if (!(path.extname(abs).toLowerCase() in MEDIA_EXTENSIONS)) return result;
    try {
      const row = await this.assets.enroll(rel, { model: "user_uploaded" });
      Object.assign(result, { id: row.id }, dims(row));
    } catch (err) {
      result.enrollError = err instanceof Error ? err.message : String(err);
    }
    return result;
  }

  /**
   * 导入 URL。**逐个串行、单个失败不影响其它**，HTTP 始终 200，错误进 `errors`。
   * 同一个目标路径已经入库时直接返回已有记录，不重复下载。
   */
  async importUrls(urls: string[]) {
    const imported: Record<string, unknown>[] = [];
    const errors: { url: string; error: string }[] = [];
    for (const url of urls) {
      try {
        imported.push({ url, ...(await this.importOne(url)) });
      } catch (err) {
        errors.push({ url, error: err instanceof Error ? err.message : String(err) });
      }
    }
    return errors.length ? { ok: true, imported, errors } : { ok: true, imported };
  }

  private async importOne(url: string) {
    await assertPublicUrl(url).catch((err) => {
      throw err instanceof SsrfError ? err : new Error(String(err));
    });
    const rel = deriveImportTarget(url);
    const existing = this.assets.byPath(rel);
    if (existing) return { id: existing.id, path: existing.path, type: toAssetInfo(existing).type, ...dims(existing) };

    const kind = detectFileType(rel);
    let res: Response;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(IMPORT_TIMEOUT_MS[kind] ?? 60_000) });
    } catch (err) {
      const cause = (err as { cause?: { message?: string } }).cause?.message;
      throw new Error(`fetch failed (${(err as Error).message}${cause ? `: ${cause}` : ""})`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const abs = this.resolve(rel);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, Buffer.from(await res.arrayBuffer()));
    let row;
    try {
      row = await this.assets.enroll(rel, { model: "imported" });
    } catch (err) {
      throw new Error(`Failed to enroll downloaded file ${rel}: ${(err as Error).message}`);
    }
    return { id: row.id, path: row.path, type: toAssetInfo(row).type, ...dims(row) };
  }

  // -------------------------------------------------------------------------
  // 文本内容
  // -------------------------------------------------------------------------

  async readContent(rel: string | undefined) {
    if (!rel) throw new BadRequestException("path query parameter is required");
    this.assertHiloAccess(rel);
    try {
      return { content: await readFile(this.resolve(rel), "utf8") };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new NotFoundException(`File not found: ${rel}`);
    }
  }

  async writeContent(dto: { path: string; content: string; unique?: boolean }) {
    this.assertHiloAccess(dto.path);
    let abs = this.resolve(dto.path);
    await mkdir(path.dirname(abs), { recursive: true });
    if (dto.unique) abs = await writeUniqueSpaced(abs, dto.content);
    else await writeFile(abs, dto.content);
    const rel = this.paths.relativize(abs)!;
    const out: Record<string, unknown> = { ok: true, path: rel };
    if (rel.startsWith(".hilo/")) return out;
    const existing = this.assets.byPath(rel);
    if (existing) {
      out.assetId = existing.id;
    } else if (path.extname(rel).toLowerCase() in MEDIA_EXTENSIONS) {
      try {
        out.assetId = (await this.assets.enroll(rel)).id;
      } catch (err) {
        out.enrollError = err instanceof Error ? err.message : String(err);
      }
    }
    return out;
  }

  /** 新建一个文本资产：根目录下 `<首行>.md`，首行为空时用时间戳命名。 */
  async createTextAsset(content: string) {
    const first = content.split("\n").find((l) => l.trim()) ?? "";
    const stem = sanitizeFileName(first.replace(/^#+\s*/, ""), 12) || `text-${stamp(new Date())}`;
    let rel = `${stem}.md`;
    for (let n = 2; await exists(this.resolve(rel)); n++) {
      if (n > 100) throw new BadRequestException(`Too many existing files for ${stem}.md`);
      rel = `${stem}-${n}.md`;
    }
    await writeFile(this.resolve(rel), content);
    const row = await this.assets.enroll(rel);
    return { ok: true, assetId: row.id, path: rel };
  }

  // -------------------------------------------------------------------------
  // 删除
  // -------------------------------------------------------------------------

  /** 批量删除进一个串行队列：两个删除请求交错执行会让撤销栈里的操作顺序对不上。 */
  deletePaths(paths: string[]) {
    const task = async () => {
      const ops: UndoOp[] = [];
      for (const rel of paths) {
        const op = await this.trash.bufferDelete(rel);
        if (op) ops.push(op);
      }
      if (ops.length === 1) this.trash.push(ops[0]!);
      else if (ops.length > 1) this.trash.push({ type: "batch", ops });
      return { ok: true };
    };
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return withTimeout(run, MUTATION_TIMEOUT_MS, "删除超时");
  }
}

function dims(row: { width: number | null; height: number | null; duration_ms: number | null }) {
  return {
    ...(row.width != null ? { width: row.width } : {}),
    ...(row.height != null ? { height: row.height } : {}),
    ...(row.duration_ms != null ? { durationMs: row.duration_ms } : {}),
  };
}

async function exists(p: string): Promise<boolean> {
  return stat(p).then(
    () => true,
    () => false,
  );
}

function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(msg)), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });
}
