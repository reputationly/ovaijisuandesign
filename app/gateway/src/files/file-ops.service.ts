import { constants as fsConstants } from "node:fs";
import { copyFile, cp, lstat, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException } from "@nestjs/common";
import { type AssetRow, toAssetInfo } from "@ov/assets";
import { detectFileType, MEDIA_EXTENSIONS, type MediaType } from "@ov/protocol";

import { AssetsService } from "../common/assets.service.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { CanvasService } from "../canvas/canvas.service.js";
import { MutationQueue } from "../operations/mutation-queue.js";
import { PathRelocator } from "../operations/path-relocator.service.js";
import { type UndoOp, TrashBufferService } from "../operations/trash-buffer.service.js";
import { ProjectAssetAnchors } from "./project-asset-anchors.service.js";

/** 同名时依次试 `name(1)`…`name(1000)`，和上传、写文件的去重规则一致。 */
const MAX_NAME_SUFFIX = 1000;
/** 复制一份时抢名字的重试次数：两个并发的复制抢到同一个名字时换下一个。 */
const DUPLICATE_ATTEMPTS = 5;

/**
 * 相对路径（也收工作区里的绝对路径）→ 绝对路径，越界 400。
 *
 * 文件面板对根目录算出来的"相对路径"其实就是根目录的绝对路径（它只会去掉 `根/` 前缀），
 * 所以这里得认工作区内的绝对路径，不能像读写内容那样一律拒掉。`""` 就是根目录。
 */
export function resolveInWorkspace(root: string, p: string): string {
  const resolved = path.resolve(root, p);
  const rel = path.relative(root, resolved);
  if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    throw new BadRequestException("Path traversal detected");
  }
  return resolved;
}

/** `name` → `name(1)`… 挑第一个盘上没有的，`taken` 额外判断（比如库里已登记）。 */
export async function freeName(dir: string, name: string, taken: (candidate: string) => boolean = () => false): Promise<string> {
  const ext = path.extname(name);
  const base = name.slice(0, name.length - ext.length);
  for (let i = 0; i <= MAX_NAME_SUFFIX; i++) {
    const cand = i === 0 ? name : `${base}(${i})${ext}`;
    if (!(await exists(path.join(dir, cand))) && !taken(cand)) return cand;
  }
  return `${base}_${Date.now()}${ext}`;
}

/**
 * 资产面板 / 文件面板上的文件操作：列目录、新建文件夹、改名、移动、复制、复制一份、冲突预检、
 * 导入外部文件、登记已有文件。
 *
 * 改名 / 移动 / 复制一份 / 删除都进同一个串行队列并压撤销栈；改名、移动之后库里的路径跟着换，
 * id 不变（见 PathRelocator）。
 */
@Injectable()
export class FileOpsService {
  private readonly log = new Logger("FileOps");

  constructor(
    private readonly paths: WorkspacePathService,
    private readonly assets: AssetsService,
    private readonly canvas: CanvasService,
    private readonly queue: MutationQueue,
    private readonly relocator: PathRelocator,
    private readonly trash: TrashBufferService,
    private readonly anchors: ProjectAssetAnchors,
  ) {}

  private resolve(p: string): string {
    return resolveInWorkspace(this.paths.root, p);
  }

  /** 改动类操作不许碰工作区根本身和 `.hilo/`（画布、资产库、回收站都在里面）。 */
  private resolveMutable(p: string): string {
    const abs = this.resolve(p);
    const rel = this.paths.relativize(abs);
    if (!rel) throw new BadRequestException("Cannot modify the workspace root");
    if (rel === ".hilo" || rel.startsWith(".hilo/")) throw new BadRequestException("Cannot modify internal .hilo files");
    return abs;
  }

  private rel(abs: string): string {
    return this.paths.relativize(abs) ?? "";
  }

  // -------------------------------------------------------------------------
  // 列表
  // -------------------------------------------------------------------------

  /** 根目录下的媒体文件（一级子目录递归进去），按时间或名字排。跳过点开头的条目。 */
  async listFiles(type?: string, sort?: string) {
    const root = this.paths.root;
    await mkdir(root, { recursive: true });
    const files: { name: string; path: string; type: MediaType; folder: string; size: number; url: string; mtime: number }[] = [];
    const folders: string[] = [];
    let entries;
    try {
      entries = await readdir(root, { withFileTypes: true });
    } catch {
      return { files: [], folders: [] };
    }
    const push = async (abs: string, folder: string) => {
      const kind = MEDIA_EXTENSIONS[path.extname(abs).toLowerCase()];
      if (!kind || (type && kind !== type)) return;
      const st = await stat(abs).catch(() => undefined);
      if (!st) return;
      const rel = this.rel(abs);
      files.push({ name: path.basename(abs), path: rel, type: kind, folder, size: st.size, url: `/files/${rel.split("/").map(encodeURIComponent).join("/")}`, mtime: st.mtimeMs / 1000 });
    };
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      const abs = path.join(root, e.name);
      if (e.isDirectory()) {
        folders.push(e.name);
        for (const f of await walkFiles(abs)) await push(f, e.name);
      } else if (e.isFile()) {
        await push(abs, "");
      }
    }
    if (sort === "time" || !sort) files.sort((a, b) => b.mtime - a.mtime);
    else if (sort === "name") files.sort((a, b) => a.name.localeCompare(b.name));
    return { files, folders };
  }

  /**
   * 目录树的冷启动快照：工作区下所有目录（不含点开头的、不跟符号链接），`/` 分隔的相对路径。
   * 之后靠 `dirs_changed` 增量。某个目录读不了（没权限）只记下来跳过，不能让整棵树变空。
   */
  async listDirs() {
    const dirs: string[] = [];
    const errors: { path: string; code: string }[] = [];
    await mkdir(this.paths.root, { recursive: true });
    const walk = async (relPrefix: string): Promise<void> => {
      let entries;
      try {
        entries = await readdir(relPrefix ? path.join(this.paths.root, ...relPrefix.split("/")) : this.paths.root, { withFileTypes: true });
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code ?? "UNKNOWN";
        if (code === "EACCES") errors.push({ path: relPrefix || "/", code });
        return;
      }
      for (const e of entries) {
        if (e.name.startsWith(".") || e.isSymbolicLink() || !e.isDirectory()) continue;
        const child = relPrefix ? `${relPrefix}/${e.name}` : e.name;
        dirs.push(child);
        await walk(child);
      }
    };
    await walk("");
    return { ok: true, dirs, ...(errors.length ? { errors } : {}) };
  }

  /**
   * 右键"导入 / 粘贴 / 新建文件夹"之前的纯 stat 预检：目标目录下哪些名字已经被占了，占的是文件还是
   * 文件夹（文件夹冲突时界面不给"覆盖"选项 —— 往非空文件夹上 rename 做不到）。不改任何东西。
   */
  async checkConflicts(items: { name: string; sourcePath?: string }[], targetDir?: string) {
    const dir = targetDir ? this.resolve(targetDir) : this.paths.root;
    const conflicts = await Promise.all(
      items.map(async (item) => {
        if (!item.name || item.name === "." || item.name === ".." || /[/\\\0]/.test(item.name)) return null;
        const st = await stat(path.join(dir, item.name)).catch(() => undefined);
        if (!st) return null;
        return { name: item.name, ...(item.sourcePath ? { sourcePath: item.sourcePath } : {}), existingKind: st.isDirectory() ? "folder" : "file" };
      }),
    );
    return { ok: true, conflicts: conflicts.filter((c) => c !== null) };
  }

  // -------------------------------------------------------------------------
  // 新建 / 改名 / 移动 / 复制
  // -------------------------------------------------------------------------

  async mkdir(p: string) {
    const abs = this.resolveMutable(p);
    const existed = await exists(abs);
    await mkdir(abs, { recursive: true });
    if (!existed) this.relocator.dirsChanged(this.rel(abs), "added");
    return { ok: true };
  }

  /** 新名字只能是一段：带分隔符或 NUL 的一律 400，免得借改名把文件挪到别处。 */
  private validateNewName(newName: string): string {
    const trimmed = newName.trim();
    if (!trimmed) throw new BadRequestException("new_name is required");
    if (/[/\\\0]/.test(trimmed)) throw new BadRequestException("new_name must not contain path separators");
    if (trimmed === "." || trimmed === "..") throw new BadRequestException("new_name is invalid");
    return trimmed;
  }

  /**
   * 原地改名。新名字被占了就自动加 `(1)`、`(2)`…，不覆盖；返回实际用上的名字。
   * 只改大小写（`a.png` → `A.png`）时在不区分大小写的盘上"新名字"就是它自己，直接改。
   */
  rename(p: string, newName: string) {
    return this.queue.enqueue(async () => {
      const src = this.resolveMutable(p);
      if (!(await exists(src))) throw new NotFoundException("File not found");
      const name = this.validateNewName(newName);
      const dir = path.dirname(src);
      const sameEntry = name.toLowerCase() === path.basename(src).toLowerCase() && (await sameFile(src, path.join(dir, name)));
      const dst = sameEntry ? path.join(dir, name) : path.join(dir, await freeName(dir, name));
      if (dst === src) return { ok: true, new_path: this.rel(src), new_name: path.basename(src) };
      await this.relocator.relocate(src, dst);
      this.trash.push({ type: "rename", from: dst, to: src });
      const newRel = this.rel(dst);
      const row = this.assets.byPath(newRel);
      if (row) void this.canvas.renameAssetNodes(row.id, path.basename(dst), newRel);
      return { ok: true, new_path: newRel, new_name: path.basename(dst) };
    }, "改名超时");
  }

  /**
   * 画布上"复制节点再改名"：同一份内容另存为一个独立资产（新 id、新文件，放在根目录），
   * 之后两边各改各的。元数据带过去并记下 `forkedFrom`。
   */
  async forkRename(p: string, newName: string) {
    this.resolve(p);
    const name = this.validateNewName(newName);
    const source = this.assets.byPath(p.replace(/\\/g, "/").replace(/^\.\//, ""));
    if (!source) throw new NotFoundException(`Asset not found for path: ${p}`);
    const srcAbs = this.resolve(source.path);
    const finalName = await freeName(this.paths.root, name, (cand) => this.assets.byPath(cand) !== undefined);
    const dstAbs = path.join(this.paths.root, finalName);
    await copyFile(srcAbs, dstAbs, fsConstants.COPYFILE_EXCL);
    const { contentFingerprint: _fp, ...meta } = parseMeta(source);
    let forked: AssetRow;
    try {
      forked = await this.assets.enroll(finalName, { ...meta, forkedFrom: source.id });
    } catch (err) {
      await rmQuiet(dstAbs);
      throw err;
    }
    return { ok: true, new_path: forked.path, new_id: forked.id, new_name: forked.name, type: toAssetInfo(forked).type };
  }

  /**
   * 批量移动到一个已有目录。中途失败就把已经挪过去的按相反顺序挪回来（全成或全不成），
   * 整批压成一个撤销。目标位置已有同名的不覆盖，直接 409 —— 界面会先调 check-conflicts 让用户选。
   */
  move(paths: string[], target: string) {
    return this.queue.enqueue(async () => {
      const targetDir = this.resolve(target);
      const st = await stat(targetDir).catch(() => undefined);
      if (!st?.isDirectory()) throw new NotFoundException("Target directory not found");
      const done: { src: string; dst: string }[] = [];
      try {
        for (const p of paths) {
          const src = this.resolveMutable(p);
          const dst = path.join(targetDir, path.basename(src));
          if (dst === src) continue;
          if (isInside(src, targetDir)) throw new BadRequestException(`Cannot move a folder into itself: ${p}`);
          if (await exists(dst)) throw new ConflictException(`Target already exists: ${this.rel(dst)}`);
          await this.relocator.relocate(src, dst);
          done.push({ src, dst });
        }
      } catch (err) {
        for (const { src, dst } of done.reverse()) {
          await this.relocator.relocate(dst, src).catch((e) => this.log.warn(`移动回滚失败 ${dst}: ${(e as Error).message}`));
        }
        if ((err as NodeJS.ErrnoException).code === "ENOENT") throw new NotFoundException("File not found");
        throw err;
      }
      const ops: UndoOp[] = done.map(({ src, dst }) => ({ type: "move", from: dst, to: src }));
      if (ops.length === 1) this.trash.push(ops[0]!);
      else if (ops.length > 1) this.trash.push({ type: "batch", ops });
      return { ok: true };
    }, "移动超时");
  }

  /** 复制到一个已有目录（文件夹整个递归复制）。目标已有同名的不覆盖，409。 */
  async copy(paths: string[], target: string) {
    const targetDir = this.resolve(target);
    const st = await stat(targetDir).catch(() => undefined);
    if (!st?.isDirectory()) throw new NotFoundException("Target directory not found");
    for (const p of paths) {
      const src = this.resolve(p);
      if (!(await exists(src))) throw new NotFoundException(`File not found: ${p}`);
      const dst = path.join(targetDir, path.basename(src));
      if (isInside(src, dst)) throw new BadRequestException(`Cannot copy a folder into itself: ${p}`);
      await cp(src, dst, { recursive: true, preserveTimestamps: true, errorOnExist: true, force: false }).catch((err: NodeJS.ErrnoException) => {
        if (err.code === "ERR_FS_CP_EEXIST" || err.code === "EEXIST") throw new ConflictException(`Target already exists: ${this.rel(dst)}`);
        throw err;
      });
      if ((await lstat(dst)).isDirectory()) {
        this.relocator.dirsChanged(this.rel(dst), "added");
        for (const f of await walkFiles(dst)) await this.enrollQuiet(this.rel(f));
      } else {
        await this.enrollQuiet(this.rel(dst));
      }
    }
    return { ok: true };
  }

  /**
   * Cmd+D：原地复制一份，名字是 `名字_copy.ext`、`名字_copy_2.ext`…，登记进库（资产面板里立刻能看到），
   * 每一份压一个撤销。
   */
  duplicate(paths: string[]) {
    return this.queue.enqueue(async () => {
      const duplicated: { src: string; dst: string; id?: string; enrollError?: string }[] = [];
      for (const p of paths) {
        const src = this.resolveMutable(p);
        const st = await stat(src).catch(() => undefined);
        if (!st) throw new NotFoundException(`File not found: ${p}`);
        if (!st.isFile()) throw new BadRequestException(`Cannot duplicate non-file: ${p}`);
        const dir = path.dirname(src);
        const { name: stem, ext } = path.parse(src);
        const taken = new Set(await readdir(dir).catch(() => [] as string[]));
        let i = 2;
        const next = () => {
          let cand = `${stem}_copy${ext}`;
          while (taken.has(cand)) cand = `${stem}_copy_${i++}${ext}`;
          return cand;
        };
        let dst = "";
        for (let attempt = 0; attempt < DUPLICATE_ATTEMPTS && !dst; attempt++) {
          const cand = path.join(dir, next());
          try {
            await copyFile(src, cand, fsConstants.COPYFILE_EXCL);
            dst = cand;
          } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
            taken.add(path.basename(cand));
          }
        }
        if (!dst) throw new InternalServerErrorException(`Failed to find a free name for duplicate of ${p}`);
        const item: (typeof duplicated)[number] = { src: this.rel(src), dst: this.rel(dst) };
        try {
          item.id = (await this.assets.enroll(item.dst, { model: "duplicated_from", source_path: item.src })).id;
        } catch (err) {
          item.enrollError = (err as Error).message;
          this.log.warn(`复制出来的文件登记失败 ${item.dst}: ${item.enrollError}`);
        }
        duplicated.push(item);
        this.trash.push({ type: "duplicate", created: dst });
      }
      return { duplicated };
    }, "复制超时");
  }

  // -------------------------------------------------------------------------
  // 导入 / 登记
  // -------------------------------------------------------------------------

  /**
   * 把工作区外的文件（绝对路径）拷进工作区根目录并登记。同名不覆盖（`name(1)`）。
   * 逐个处理、单个失败进 `errors`，一批里成功的照样返回。
   */
  async importExternal(absPaths: string[]) {
    const imported: Record<string, unknown>[] = [];
    const errors: { path: string; error: string }[] = [];
    for (const src of absPaths) {
      try {
        if (!path.isAbsolute(src)) {
          errors.push({ path: src, error: "Path must be absolute" });
          continue;
        }
        const st = await stat(src);
        if (st.isDirectory()) {
          errors.push({ path: src, error: "Directories are not supported" });
          continue;
        }
        const name = await freeName(this.paths.root, path.basename(src), (cand) => this.assets.byPath(cand) !== undefined);
        await copyFile(src, path.join(this.paths.root, name), fsConstants.COPYFILE_EXCL);
        const row = await this.assets.enroll(name, { model: "" });
        imported.push({ id: row.id, path: row.path, type: toAssetInfo(row).type, ...dims(row) });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.log.warn(`导入外部文件失败 ${src}: ${message}`);
        errors.push({ path: src, error: message });
      }
    }
    return { ok: true, imported, ...(errors.length ? { errors } : {}) };
  }

  /**
   * 登记一个已经在工作区里的文件（调用方自己写好了文件）。已登记且没有来源信息的补上 `imported`；
   * 项目资产锚点（`.hilo/project-assets/…`）先落成一份普通的工作区文件再登记，锚点本身不进库。
   */
  async track(p: string, description?: string) {
    let rel = p.replace(/\\/g, "/").replace(/^\.\//, "");
    if (this.anchors.isAnchorPath(rel)) {
      const snapshot = await this.anchors.materialize(rel);
      if (!snapshot) throw new NotFoundException(`File not found: ${p}`);
      rel = snapshot.path;
    }
    const abs = this.resolve(rel);
    if (!(await exists(abs))) throw new NotFoundException(`File not found: ${p}`);
    rel = this.rel(abs);
    const existing = this.assets.byPath(rel);
    if (existing) {
      const meta = parseMeta(existing);
      if (!hasProvenance(meta)) {
        const next = { ...meta, model: "imported", ...(description ? { description } : {}) };
        const updated = this.assets.vault.setMetadata(existing.id, next)!;
        this.assets.announce(updated, "updated");
        return { ok: true, id: updated.id, path: updated.path, type: toAssetInfo(updated).type, metadata: next };
      }
      return { ok: true, id: existing.id, path: existing.path, type: toAssetInfo(existing).type, metadata: meta };
    }
    const meta: Record<string, unknown> = { model: "imported", ...(description ? { description } : {}) };
    let row: AssetRow;
    try {
      row = await this.assets.enroll(rel, meta);
    } catch (err) {
      throw new InternalServerErrorException(`Failed to enroll asset ${rel}: ${(err as Error).message}`);
    }
    if (row.width != null) meta.width = row.width;
    if (row.height != null) meta.height = row.height;
    if (row.duration_ms != null) meta.duration = row.duration_ms / 1000;
    return { ok: true, id: row.id, path: row.path, type: detectFileType(rel), metadata: meta };
  }

  /** 没有文件监听，复制出来的文件得自己登记，否则文件面板（按资产建树）里看不到。 */
  private async enrollQuiet(rel: string): Promise<void> {
    if (!rel || rel.split("/").some((seg) => seg.startsWith("."))) return;
    await this.assets.enroll(rel).catch((err) => this.log.warn(`登记 ${rel} 失败: ${(err as Error).message}`));
  }
}

/** 来源信息（生成模型、工具）都没有的记录，才算"外来的"，可以补上 `imported`。 */
function hasProvenance(m: Record<string, unknown>): boolean {
  const s = (v: unknown) => typeof v === "string" && v.trim().length > 0;
  return s(m.model) || s(m.source_tool) || s(m.backend) || s(m.model_id);
}

function parseMeta(row: AssetRow): Record<string, unknown> {
  if (!row.metadata) return {};
  try {
    return JSON.parse(row.metadata) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function dims(row: AssetRow) {
  return {
    ...(row.width != null ? { width: row.width } : {}),
    ...(row.height != null ? { height: row.height } : {}),
    ...(row.duration_ms != null ? { durationMs: row.duration_ms } : {}),
  };
}

/** `child` 是不是 `parent` 本身或在它下面。 */
function isInside(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/** 不区分大小写的盘上 `a.png` 和 `A.png` 是同一个文件：比 inode。 */
async function sameFile(a: string, b: string): Promise<boolean> {
  const [sa, sb] = await Promise.all([lstat(a).catch(() => undefined), lstat(b).catch(() => undefined)]);
  return !!sa && !!sb && sa.ino === sb.ino && sa.dev === sb.dev;
}

async function exists(p: string): Promise<boolean> {
  return lstat(p).then(
    () => true,
    () => false,
  );
}

async function rmQuiet(p: string): Promise<void> {
  await rm(p, { force: true }).catch(() => undefined);
}

/** 递归列出目录下所有文件（跳过点开头的条目）。 */
async function walkFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walkFiles(full)));
    else if (e.isFile()) out.push(full);
  }
  return out;
}
