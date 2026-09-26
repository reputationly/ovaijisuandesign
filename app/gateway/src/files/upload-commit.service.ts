import { createHash, randomUUID } from "node:crypto";
import { constants as fsConstants, createReadStream, statSync } from "node:fs";
import { copyFile, link, lstat, mkdir, readdir, readFile, realpath, rm, rmdir, stat, unlink } from "node:fs/promises";
import path from "node:path";

import { BadRequestException, ConflictException, Injectable, Logger } from "@nestjs/common";

import { AssetsService } from "../common/assets.service.js";
import { atomicWriteFile } from "../common/atomic-write.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { GatewayConfig } from "../config/gateway-config.js";

export const UPLOAD_STAGING_PREFIX = ".hilo/.tmp/uploads/";
const CHAT_CONTEXT_DIR = ".hilo/chat-context";
const LEDGER_DIR = ".hilo/upload-commit-operations";
const ADOPT_LEDGER_DIR = ".hilo/adopt-operations";
const ADOPT_STAGING_DIR = ".hilo/.tmp/adopt";
const LEDGER_VERSION = 1;
/** 一次提交最多几个附件，路径最长多少。 */
const MAX_COMMIT_PATHS = 20;
const MAX_COMMIT_PATH_LENGTH = 1024;
/** 台账留 30 天（对话重发时按 operationId 回放要用），最多 1024 份。 */
const LEDGER_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_LEDGERS = 1024;
const LEDGER_PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MAX_NAME_SUFFIX = 999;
/** 渲染层用路径算出来的确定性 UUID；只认标准格式，防止拿它拼出奇怪的文件名。 */
export const OPERATION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface Identity {
  dev: number;
  ino: number;
  size: number;
  mtimeMs: number;
}

interface CommitLedger {
  version: number;
  paths: string[];
  committed: { from: string; to: string }[];
  /** 每个暂存源文件发布时的身份；finalize 时只删身份还对得上的那个（期间被换掉的不删）。 */
  sources: (Identity | null)[];
  createdAt: number;
}

export interface AttachmentRef {
  path: string;
  attachment_source: "asset_vault";
  attachment_id: string;
}

function identityOf(st: { dev: number; ino: number; size: number; mtimeMs: number }): Identity {
  return { dev: Number(st.dev), ino: Number(st.ino), size: st.size, mtimeMs: st.mtimeMs };
}

function sameIdentity(a: Identity, b: Identity): boolean {
  return a.dev === b.dev && a.ino === b.ino && a.size === b.size && a.mtimeMs === b.mtimeMs;
}

function isWithin(root: string, candidate: string): boolean {
  const rel = path.relative(root, candidate);
  return rel === "" || (!path.isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${path.sep}`));
}

/**
 * 对话附件的"暂存 → 发布"，以及首页附件搬进新工作区（adopt）。
 *
 * 对话里拖进来的文件先上传到 `.hilo/.tmp/uploads/<uuid>/`（暂存，还没进工作区），真正发送时才提交：
 * 硬链接（跨盘就复制）到工作区根目录（或只给对话用的 `.hilo/chat-context/`），登记进资产库。
 * 发送可能重试，所以同一个 operationId 的提交要**幂等**：第一次成功后记一份台账，重发时按台账
 * 原样回放，不会在工作区里多出 `a(1).png`。发送成功后渲染层 finalize，这时才删暂存源。
 */
@Injectable()
export class UploadCommitService {
  private readonly log = new Logger("UploadCommit");
  private readonly inflight = new Map<string, Promise<unknown>>();
  private readonly opTails = new Map<string, Promise<unknown>>();
  private lastPruneAt = 0;

  constructor(
    private readonly paths: WorkspacePathService,
    private readonly assets: AssetsService,
    private readonly cfg: GatewayConfig,
  ) {}

  private abs(rel: string): string {
    return path.join(this.paths.root, ...rel.split("/"));
  }

  /** 同一个 operationId 的操作排队执行（提交、中止、确认互相不能交错）。 */
  private async withOp<T>(op: string, task: () => Promise<T>): Promise<T> {
    const prev = this.opTails.get(op) ?? Promise.resolve();
    const run = prev.catch(() => undefined).then(task);
    const tail = run.catch(() => undefined);
    this.opTails.set(op, tail);
    try {
      return await run;
    } finally {
      if (this.opTails.get(op) === tail) this.opTails.delete(op);
    }
  }

  private validateBatch(paths: unknown[]): asserts paths is string[] {
    if (paths.length > MAX_COMMIT_PATHS) throw new BadRequestException(`Too many upload commit paths (max ${MAX_COMMIT_PATHS})`);
    if (paths.some((p) => typeof p !== "string" || p.length === 0 || p.length > MAX_COMMIT_PATH_LENGTH)) {
      throw new BadRequestException("Upload commit paths must be non-empty strings");
    }
  }

  /**
   * 暂存路径只认 `.hilo/.tmp/uploads/<uuid>/<文件名>`（老格式没有 uuid 这一层），逐段校验，
   * 并确认 uuid 那层目录是真目录、没被符号链接指到别处 —— 否则一个构造的路径就能让"删除暂存"删到工作区外。
   */
  private async resolveStaging(rel: string): Promise<string> {
    const segs = rel.split("/");
    const legacy = segs.length === 4;
    const gen = legacy ? undefined : segs[3];
    const name = legacy ? segs[3] : segs[4];
    const bad =
      rel.includes("\\") ||
      rel.includes("\0") ||
      path.posix.isAbsolute(rel) ||
      path.posix.normalize(rel) !== rel ||
      (segs.length !== 4 && segs.length !== 5) ||
      `${segs.slice(0, 3).join("/")}/` !== UPLOAD_STAGING_PREFIX ||
      (!legacy && (!gen || !OPERATION_ID_PATTERN.test(gen))) ||
      !name ||
      name === "." ||
      name === "..";
    if (bad) throw new BadRequestException(`Invalid upload staging path: ${rel}`);
    const stagingRoot = this.abs(UPLOAD_STAGING_PREFIX.slice(0, -1));
    const resolved = this.abs(rel);
    if (legacy) return resolved;
    const genDir = path.join(stagingRoot, gen!);
    const gst = await lstat(genDir).catch(() => undefined);
    if (!gst?.isDirectory() || gst.isSymbolicLink()) throw new BadRequestException(`Invalid upload staging path: ${rel}`);
    const [rootReal, genReal] = await Promise.all([realpath(stagingRoot), realpath(genDir)]);
    if (!isWithin(rootReal, genReal)) throw new BadRequestException(`Invalid upload staging path: ${rel}`);
    return resolved;
  }

  // -------------------------------------------------------------------------
  // 提交
  // -------------------------------------------------------------------------

  commit(paths: unknown, operationId: unknown, contextPaths: unknown = []) {
    if (!Array.isArray(paths)) throw new BadRequestException("paths must be an array");
    if (typeof operationId !== "string" || !OPERATION_ID_PATTERN.test(operationId)) throw new BadRequestException("operationId must be a UUID");
    this.validateBatch(paths);
    if (new Set(paths).size !== paths.length) throw new BadRequestException("Upload commit paths must be unique");
    const ctx = new Set((Array.isArray(contextPaths) ? contextPaths : []).filter((v): v is string => typeof v === "string").map((v) => v.replace(/\\/g, "/")));
    if ([...ctx].some((v) => !paths.includes(v))) throw new BadRequestException("Upload commit context paths must be included in paths");
    // 同一个操作正在提交（渲染层超时重发）：等同一个结果，不再跑第二遍。
    const active = this.inflight.get(operationId);
    if (active) return active as ReturnType<UploadCommitService["runCommit"]>;
    const run = this.withOp(operationId, () => this.runCommit(paths, operationId, ctx)).finally(() => this.inflight.delete(operationId));
    this.inflight.set(operationId, run);
    return run;
  }

  private async runCommit(paths: string[], op: string, ctx: Set<string>) {
    await this.pruneLedgers(op);
    const replay = await this.readLedger(op);
    if (replay) {
      if (replay.paths.length !== paths.length || replay.paths.some((p, i) => p !== paths[i])) {
        throw new BadRequestException("Upload commit operation id was used for different paths");
      }
      const missing = replay.committed.some((m) => m.from !== m.to && !isFileSync(this.abs(m.to)));
      if (!missing) return this.result(replay.committed, await this.enrollCommitted(replay.committed));
      // 发布出去的文件又被删了：台账作废，按新的一次提交来。
      await unlink(this.ledgerPath(op)).catch(() => undefined);
    }

    const staged = new Map<string, { abs: string; identity: Identity }>();
    for (const p of paths) {
      if (!p.startsWith(UPLOAD_STAGING_PREFIX)) continue;
      const abs = await this.resolveStaging(p);
      const st = await lstat(abs).catch(() => undefined);
      if (!st?.isFile()) throw new BadRequestException(`Not a regular staged file: ${p}`);
      staged.set(p, { abs, identity: identityOf(st) });
    }

    const committed: { from: string; to: string }[] = [];
    const reserved = new Set<string>();
    const published: string[] = [];
    try {
      for (const p of paths) {
        const src = staged.get(p);
        if (!src) {
          // 已经在工作区里的附件（比如从资产面板拖进来的）原样通过。
          committed.push({ from: p, to: p });
          continue;
        }
        const destDir = ctx.has(p) ? this.abs(CHAT_CONTEXT_DIR) : this.paths.root;
        await mkdir(destDir, { recursive: true });
        const dest = await this.publish(src.abs, destDir, path.basename(p), reserved);
        reserved.add(dest);
        published.push(dest);
        committed.push({ from: p, to: this.paths.relativize(dest)! });
      }
    } catch (err) {
      // 发布到一半失败：已经发布的撤掉（它们还没登记、也没人引用），暂存源都还在，渲染层可以整批重试。
      for (const d of published) await unlink(d).catch(() => undefined);
      throw err;
    }
    const ledger: CommitLedger = { version: LEDGER_VERSION, paths, committed, sources: paths.map((p) => staged.get(p)?.identity ?? null), createdAt: Date.now() };
    await mkdir(this.abs(LEDGER_DIR), { recursive: true });
    await atomicWriteFile(this.ledgerPath(op), JSON.stringify(ledger));
    return this.result(committed, await this.enrollCommitted(committed));
  }

  private result(committed: { from: string; to: string }[], refs: AttachmentRef[]) {
    return { committed, ...(refs.length ? { attachment_refs: refs } : {}) };
  }

  /**
   * 挑一个空的名字 `名字(n).ext` 发布过去。优先硬链接（同盘、瞬间完成、不占空间）；跨盘或文件系统不支持时
   * 独占复制。两种都是"不存在才建"，并发抢到同一个名字时换下一个，不会覆盖任何已有文件。
   */
  private async publish(src: string, dir: string, filename: string, reserved: Set<string>): Promise<string> {
    const ext = path.extname(filename);
    const base = filename.slice(0, filename.length - ext.length);
    for (let i = 0; i <= MAX_NAME_SUFFIX; i++) {
      const cand = path.join(dir, i === 0 ? filename : `${base}(${i})${ext}`);
      if (reserved.has(cand)) continue;
      if (await lstat(cand).then(() => true, () => false)) continue;
      try {
        await link(src, cand);
        return cand;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "EEXIST") continue;
        if (code !== "EXDEV" && code !== "EPERM" && code !== "ENOTSUP" && code !== "EOPNOTSUPP" && code !== "EMLINK") throw err;
      }
      try {
        await copyFile(src, cand, fsConstants.COPYFILE_EXCL);
        return cand;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "EEXIST") continue;
        throw err;
      }
    }
    throw new ConflictException(`Could not reserve an upload target for ${filename}`);
  }

  /** 发布到工作区根目录的登记进库（带回 id 给对话当附件引用）；只给对话用的 chat-context 不登记。 */
  private async enrollCommitted(committed: { from: string; to: string }[]): Promise<AttachmentRef[]> {
    const refs: AttachmentRef[] = [];
    for (const { from, to } of committed) {
      if (from === to || to.startsWith(`${CHAT_CONTEXT_DIR}/`)) continue;
      try {
        const existing = this.assets.byPath(to);
        const row = existing ?? (await this.assets.enroll(to, { model: "user_uploaded" }));
        refs.push({ path: to, attachment_source: "asset_vault", attachment_id: row.id });
      } catch (err) {
        this.log.warn(`提交后的附件登记失败 ${to}: ${(err as Error).message}`);
      }
    }
    return refs;
  }

  // -------------------------------------------------------------------------
  // 中止 / 确认 / 删除暂存
  // -------------------------------------------------------------------------

  /**
   * 渲染层在提交之后改了附件、想撤回这次发布。发布出去的文件可能已经被 agent 读过、被引用了，
   * 没法安全地回滚：有台账就 409（让用户重发原来那条），没有台账说明根本没发布成功，直接 ok。
   */
  async abort(operationId: unknown, paths: unknown) {
    if (typeof operationId !== "string" || !OPERATION_ID_PATTERN.test(operationId)) throw new BadRequestException("operationId must be a UUID");
    if (!Array.isArray(paths)) throw new BadRequestException("paths must be an array");
    this.validateBatch(paths);
    await this.withOp(operationId, async () => {
      const ledger = await this.readLedger(operationId);
      if (!ledger) return;
      const created = ledger.committed.filter((m) => m.from !== m.to).map((m) => m.to);
      if (new Set(paths).size !== paths.length || paths.some((p) => !created.includes(p))) {
        throw new BadRequestException("Abort paths do not match the upload commit operation");
      }
      this.log.warn(`upload_commit_abort_deferred operation_id=${operationId} count=${paths.length}`);
      throw new ConflictException("Published upload cannot be safely rolled back; retry the original send");
    });
    return { ok: true };
  }

  /** 发送成功：删掉这次提交的暂存源（只删身份还对得上的，期间被换掉的留着）和台账。 */
  async finalize(operationId: unknown) {
    if (typeof operationId !== "string" || !OPERATION_ID_PATTERN.test(operationId)) throw new BadRequestException("operationId must be a UUID");
    await this.withOp(operationId, async () => {
      const ledger = await this.readLedger(operationId);
      if (!ledger) return;
      for (const [i, m] of ledger.committed.entries()) {
        const identity = ledger.sources[i];
        if (!identity || !m.from.startsWith(UPLOAD_STAGING_PREFIX)) continue;
        try {
          const abs = await this.resolveStaging(m.from);
          const st = await lstat(abs).catch(() => undefined);
          if (!st) continue;
          if (!sameIdentity(identityOf(st), identity)) {
            this.log.warn(`暂存文件在提交后被换过，保留 operation_id=${operationId}`);
            continue;
          }
          await this.unlinkStaged(abs);
        } catch (err) {
          this.log.warn(`清理暂存失败 ${m.from}: ${(err as Error).message}`);
        }
      }
      await unlink(this.ledgerPath(operationId)).catch(() => undefined);
    });
    return { ok: true };
  }

  /**
   * 渲染层不再需要的暂存文件（用户把附件删了）。属于一次还没确认的提交的不许删：
   * 那次发送可能还要按台账回放。非暂存路径忽略。
   */
  async deleteStaged(paths: unknown) {
    if (!Array.isArray(paths)) throw new BadRequestException("paths must be an array");
    this.validateBatch(paths);
    const stagedPaths = paths.filter((p) => p.startsWith(UPLOAD_STAGING_PREFIX));
    if (stagedPaths.length === 0) return { ok: true };
    const protectedPaths = await this.protectedSources();
    if (stagedPaths.some((p) => protectedPaths.has(p))) throw new ConflictException("Staged upload belongs to an active commit operation");
    for (const p of stagedPaths) {
      const abs = await this.resolveStaging(p);
      const st = await lstat(abs).catch(() => undefined);
      if (st?.isSymbolicLink()) throw new BadRequestException(`Symbolic staged paths are not allowed: ${p}`);
      await this.unlinkStaged(abs);
    }
    return { ok: true };
  }

  /** 删文件，uuid 那层目录空了顺手删掉。 */
  private async unlinkStaged(abs: string): Promise<void> {
    await unlink(abs).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== "ENOENT") throw err;
    });
    const dir = path.dirname(abs);
    if (!OPERATION_ID_PATTERN.test(path.basename(dir))) return;
    await rmdir(dir).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== "ENOENT" && err.code !== "ENOTEMPTY") throw err;
    });
  }

  private async protectedSources(): Promise<Set<string>> {
    const out = new Set<string>();
    const dir = this.abs(LEDGER_DIR);
    for (const f of await readdir(dir).catch(() => [] as string[])) {
      const op = f.replace(/\.json$/, "");
      if (!OPERATION_ID_PATTERN.test(op)) continue;
      const ledger = await this.readLedger(op).catch(() => undefined);
      for (const m of ledger?.committed ?? []) if (m.from !== m.to) out.add(m.from);
    }
    return out;
  }

  private ledgerPath(op: string): string {
    return path.join(this.abs(LEDGER_DIR), `${op}.json`);
  }

  /** 读台账；格式不对当作坏的（400），免得按一份坏台账去删文件。 */
  private async readLedger(op: string): Promise<CommitLedger | undefined> {
    const file = this.ledgerPath(op);
    const st = await lstat(file).catch(() => undefined);
    if (!st) return undefined;
    if (!st.isFile() || st.size > 256 * 1024) throw new BadRequestException("Invalid upload commit ledger");
    let parsed: CommitLedger;
    try {
      parsed = JSON.parse(await readFile(file, "utf8")) as CommitLedger;
    } catch {
      throw new BadRequestException("Invalid upload commit ledger");
    }
    const ok =
      parsed?.version === LEDGER_VERSION &&
      Array.isArray(parsed.paths) &&
      Array.isArray(parsed.committed) &&
      Array.isArray(parsed.sources) &&
      parsed.committed.length === parsed.paths.length &&
      parsed.committed.every((m, i) => m && m.from === parsed.paths[i] && typeof m.to === "string" && (m.from === m.to || this.isPublishTarget(m.to)));
    if (!ok) throw new BadRequestException("Invalid upload commit ledger");
    return parsed;
  }

  /** 台账里的发布目标只能是根目录或 chat-context 下的一段文件名。 */
  private isPublishTarget(rel: string): boolean {
    const name = rel.startsWith(`${CHAT_CONTEXT_DIR}/`) ? rel.slice(CHAT_CONTEXT_DIR.length + 1) : rel;
    return !!name && !/[/\\\0]/.test(name) && name !== "." && name !== ".." && path.posix.normalize(rel) === rel;
  }

  private async pruneLedgers(preserve: string): Promise<void> {
    const now = Date.now();
    if (now - this.lastPruneAt < LEDGER_PRUNE_INTERVAL_MS) return;
    this.lastPruneAt = now;
    await pruneDir(this.abs(LEDGER_DIR), now, MAX_LEDGERS, `${preserve}.json`);
    await pruneDir(this.abs(ADOPT_LEDGER_DIR), now, MAX_LEDGERS);
    await pruneDir(this.abs(ADOPT_STAGING_DIR), now);
  }

  // -------------------------------------------------------------------------
  // 首页附件搬进工作区
  // -------------------------------------------------------------------------

  /**
   * 首页（还没有工作区时）拖进来的附件在应用级输出目录里；建好工作区后把它们复制进来。
   *
   * 调用方只能选源文件、不能选目的地：`targetDir` 必须就是本工作区根目录，源必须在输出目录里
   * （按 realpath 判断，符号链接绕不出去）。目的地保持源的相对目录结构，同名时加 `_1`、`_2`。
   * 带 `idempotency-key` 的同一次操作重试时按台账回放，不会复制出第二份。
   */
  async adopt(relativePaths: string[], targetDir: string, operationId?: string) {
    if (operationId !== undefined && !OPERATION_ID_PATTERN.test(operationId)) throw new BadRequestException("idempotency-key must be a UUID");
    if (!path.isAbsolute(targetDir)) throw new BadRequestException(`targetDir must be absolute: ${targetDir}`);
    const run = async () => {
      if (this.cfg.role === "app-level") throw new BadRequestException("File adoption requires a workspace-locked gateway");
      const root = path.resolve(this.paths.root);
      if (path.resolve(targetDir) !== root) throw new BadRequestException("targetDir must equal the workspace-locked base directory");
      const sourceDir = path.resolve(this.cfg.outputDir);
      const sources = relativePaths.map(normalizeAdoptSource);
      const sourceReal = await realpath(sourceDir).catch(() => sourceDir);
      const targetReal = await realpath(root);
      const ledger = operationId ? await this.readAdoptLedger(operationId) : new Map<string, string>();
      const errors: { source: string; destination?: string; code: string; message: string }[] = [];
      const adopted: { source: string; destination: string; attachment_id?: string }[] = [];
      const candidates: { source: string; real: string; destDir: string; name: string; rel: string }[] = [];

      for (const [i, src] of sources.entries()) {
        const requested = relativePaths[i]!;
        let real: string;
        try {
          real = await realpath(path.resolve(sourceDir, ...src.split("/")));
        } catch (err) {
          errors.push({ source: requested, code: "source_not_found", message: (err as Error).message || "Source file does not exist" });
          continue;
        }
        if (!isWithin(sourceReal, real)) throw new BadRequestException(`Invalid adopt source path: ${requested}`);
        if (!(await stat(real)).isFile()) {
          errors.push({ source: requested, code: "source_not_file", message: "Adopt source must be a regular file" });
          continue;
        }
        const relDir = path.posix.dirname(src);
        const destDir = relDir === "." ? root : path.resolve(root, ...relDir.split("/"));
        await ensureDestDir(root, targetReal, destDir, requested);
        candidates.push({ source: requested, real, destDir, name: path.posix.basename(src), rel: src });
      }

      if (sourceReal === targetReal) {
        // 输出目录就是工作区本身（开发时常见）：文件已经在了，不用复制。
        for (const c of candidates) adopted.push({ source: c.source, destination: c.rel });
      } else {
        for (const c of candidates) {
          const previous = ledger.get(c.source);
          if (previous) {
            const prevAbs = path.resolve(root, ...previous.split("/"));
            if (isWithin(root, prevAbs) && (await sameContent(c.real, prevAbs))) {
              adopted.push({ source: c.source, destination: previous });
              continue;
            }
            ledger.delete(c.source);
          }
          try {
            const dest = await publishAdopt(c.real, c.destDir, c.name, this.abs(ADOPT_STAGING_DIR));
            const destination = this.paths.relativize(dest)!;
            ledger.set(c.source, destination);
            adopted.push({ source: c.source, destination });
          } catch (err) {
            this.log.warn(`搬运首页附件失败 ${c.source}: ${(err as Error).message}`);
            errors.push({ source: c.source, code: "copy_failed", message: (err as Error).message || "Failed to copy source file" });
          }
        }
        if (operationId) await this.writeAdoptLedger(operationId, ledger);
      }

      for (const m of adopted) {
        try {
          const row = this.assets.byPath(m.destination) ?? (await this.assets.enroll(m.destination, { model: "user_uploaded" }));
          m.attachment_id = row.id;
        } catch (err) {
          errors.push({ source: m.source, destination: m.destination, code: "enroll_failed", message: (err as Error).message });
        }
      }
      return { paths: adopted.map((m) => m.destination), adopted, errors };
    };
    return operationId ? this.withOp(`adopt:${operationId}`, run) : run();
  }

  private async readAdoptLedger(op: string): Promise<Map<string, string>> {
    try {
      const parsed = JSON.parse(await readFile(path.join(this.abs(ADOPT_LEDGER_DIR), `${op}.json`), "utf8")) as { version: number; mappings: Record<string, string> };
      if (parsed.version === LEDGER_VERSION && parsed.mappings && typeof parsed.mappings === "object") {
        return new Map(Object.entries(parsed.mappings).filter(([, v]) => typeof v === "string"));
      }
    } catch {
      // 没有或坏了都当成第一次
    }
    return new Map();
  }

  private async writeAdoptLedger(op: string, m: Map<string, string>): Promise<void> {
    await mkdir(this.abs(ADOPT_LEDGER_DIR), { recursive: true });
    await atomicWriteFile(path.join(this.abs(ADOPT_LEDGER_DIR), `${op}.json`), JSON.stringify({ version: LEDGER_VERSION, mappings: Object.fromEntries(m) }));
  }
}

/** 回放时只需要知道发布出去的文件还在不在。 */
function isFileSync(abs: string): boolean {
  return statSync(abs, { throwIfNoEntry: false })?.isFile() ?? false;
}

/** 源路径只收相对于输出目录的、往下走的路径。 */
function normalizeAdoptSource(source: string): string {
  const posix = source.replace(/\\/g, "/");
  const norm = path.posix.normalize(posix);
  if (!source || source.includes("\0") || path.isAbsolute(source) || path.posix.isAbsolute(posix) || /^[A-Za-z]:/.test(posix) || norm === "." || norm === ".." || norm.startsWith("../")) {
    throw new BadRequestException(`Invalid adopt source path: ${source}`);
  }
  return norm;
}

/** 目的目录（和它已存在的最近上级）按 realpath 必须还在工作区里：工作区里的符号链接不能把文件带出去。 */
async function ensureDestDir(root: string, rootReal: string, dir: string, source: string): Promise<void> {
  let probe = dir;
  for (;;) {
    try {
      if (!isWithin(rootReal, await realpath(probe))) throw new BadRequestException(`Invalid adopt destination path: ${source}`);
      break;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      const parent = path.dirname(probe);
      if (parent === probe || !isWithin(root, parent)) throw new BadRequestException(`Invalid adopt destination path: ${source}`);
      probe = parent;
    }
  }
  await mkdir(dir, { recursive: true });
  if (!isWithin(rootReal, await realpath(dir))) throw new BadRequestException(`Invalid adopt destination path: ${source}`);
}

/** 先完整复制到暂存区，再硬链接（或独占复制）到一个空名字上：目的地上永远不会出现半个文件。 */
async function publishAdopt(src: string, destDir: string, name: string, stagingDir: string): Promise<string> {
  await mkdir(stagingDir, { recursive: true });
  const staged = path.join(stagingDir, `${randomUUID()}.adopting`);
  const ext = path.extname(name);
  const base = name.slice(0, name.length - ext.length);
  try {
    await copyFile(src, staged, fsConstants.COPYFILE_EXCL);
    for (let i = 0; ; i++) {
      const cand = path.join(destDir, i === 0 ? name : i <= MAX_NAME_SUFFIX ? `${base}_${i}${ext}` : `${base}_${randomUUID().slice(0, 12)}${ext}`);
      try {
        await link(staged, cand);
        return cand;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "EEXIST") continue;
        try {
          await copyFile(staged, cand, fsConstants.COPYFILE_EXCL);
          return cand;
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code === "EEXIST") continue;
          throw e;
        }
      }
    }
  } finally {
    await rm(staged, { force: true }).catch(() => undefined);
  }
}

async function sameContent(a: string, b: string): Promise<boolean> {
  const [sa, sb] = await Promise.all([stat(a).catch(() => undefined), stat(b).catch(() => undefined)]);
  if (!sa?.isFile() || !sb?.isFile() || sa.size !== sb.size) return false;
  if (sa.size === 0) return true;
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)]);
  return ha === hb;
}

async function sha256(file: string): Promise<string> {
  const h = createHash("sha256");
  for await (const chunk of createReadStream(file)) h.update(chunk as Buffer);
  return h.digest("hex");
}

/** 按修改时间清掉过期的状态文件；超过 `max` 份时从最老的开始删。 */
async function pruneDir(dir: string, now: number, max?: number, preserve?: string): Promise<void> {
  const names = await readdir(dir).catch(() => [] as string[]);
  const files = (
    await Promise.all(
      names
        .filter((n) => n !== preserve)
        .map(async (n) => {
          const st = await stat(path.join(dir, n)).catch(() => undefined);
          return st?.isFile() ? { file: path.join(dir, n), mtimeMs: st.mtimeMs } : undefined;
        }),
    )
  ).filter((x) => x !== undefined);
  files.sort((a, b) => a.mtimeMs - b.mtimeMs);
  const excess = max === undefined ? 0 : Math.max(0, files.length - max);
  for (const [i, f] of files.entries()) {
    if (now - f.mtimeMs > LEDGER_RETENTION_MS || i < excess) await rm(f.file, { force: true }).catch(() => undefined);
  }
}

