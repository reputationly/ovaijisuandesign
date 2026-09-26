import { randomUUID } from "node:crypto";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";

import { Body, Controller, HttpException, HttpStatus, Logger, Post } from "@nestjs/common";

import { AssetsService } from "../common/assets.service.js";
import { WorkspacePathService } from "../common/workspace-path.service.js";
import { exportOpenCodeData, importOpenCodeData, type ArchiveLogger } from "./opencode-archive.js";
import { ActivityWorkspaceMismatchError, ProjectArchiveActivityService } from "./project-archive-activity.service.js";
import {
  AssetHashesRequestDto,
  OpenCodeExportRequestDto,
  OpenCodeImportRequestDto,
  PrepareExportRequestDto,
  ProjectExportActivityLeaseDto,
  ProjectExportActivityStartDto,
  VaultPathRewriteRequestDto,
} from "./project-archive.dto.js";
import { rewriteVaultPaths } from "./vault-path-rewrite.js";

class WorkspaceMismatchError extends Error {}

/**
 * 项目归档（导出 / 导入）的 gateway 这一半。打包和解包在主进程，这里只管三件主进程做不了的事：
 * 资产库的一致快照、资产的去重指纹、opencode 库里的会话读写。
 *
 * prepare-export / asset-hashes / export 打到**工作区**的 gateway，`dir` 必须是它绑定的那个工作区，
 * 对不上回 400（是调用方路由错了，不是数据问题）；import / rewrite-vault-paths 打到应用级 gateway。
 */
@Controller("api/projects/archive")
export class ProjectArchiveController {
  private readonly log = new Logger("ProjectArchive");

  constructor(
    private readonly assets: AssetsService,
    private readonly paths: WorkspacePathService,
  ) {}

  private assertWorkspace(dir: string): void {
    if (path.resolve(dir) !== path.resolve(this.paths.root)) {
      throw new WorkspaceMismatchError(`workspace mismatch: requested ${dir}, gateway bound to ${this.paths.root}`);
    }
  }

  /**
   * 资产库拍一份一致快照到 `.hilo/.tmp/`，由主进程打进包里。
   *
   * 不能直接拷在用的 `index.sqlite`：最近的写入还在 WAL 里，拷主文件会丢掉它们。
   * `VACUUM INTO` 在一个读事务里完成，快照就是某一刻的完整状态，也不带 -wal / -shm。
   * 快照失败整个导出就失败 —— 退回拷主文件等于悄悄交出一个缺数据的包。
   */
  @Post("prepare-export")
  async prepareExport(@Body() body: PrepareExportRequestDto) {
    const rel = path.posix.join(".hilo", ".tmp", `vault-snapshot-${randomUUID()}.sqlite`);
    const abs = path.join(body.dir, rel);
    try {
      this.assertWorkspace(body.dir);
      await mkdir(path.dirname(abs), { recursive: true });
      await rm(abs, { force: true });
      this.assets.vault.db.prepare("VACUUM INTO ?").run(abs);
      const { size } = await stat(abs);
      this.log.log(`资产库快照 ${abs} (${size}B)`);
      return { snapshotRelPath: rel, sizeBytes: size };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.log.error(`prepare-export 失败 dir=${body.dir}: ${message}`);
      throw new HttpException(`Vault snapshot failed: ${message}`, err instanceof WorkspaceMismatchError ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** 导出这个工作区的会话。没有 opencode 库回 `{payload:null}`，调用方当"没有会话"。 */
  @Post("export")
  export(@Body() body: OpenCodeExportRequestDto) {
    try {
      return { payload: exportOpenCodeData(body.dir, this.archiveLogger(), { sessionId: body.sessionId }) };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.log.error(`export 失败 dir=${body.dir}${body.sessionId ? ` sessionId=${body.sessionId}` : ""}: ${message}`);
      throw new HttpException(`Project archive export failed: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 路径 → 去重键。包里内容相同的文件只存一份，其余记成别名。
   * 优先整文件哈希，没有就用"前 4MB 哈希 + 大小"。库出错时回空表：去不了重包照样能打，
   * 导出不该卡在这一步；只有工作区对不上才报 400。
   */
  @Post("asset-hashes")
  assetHashes(@Body() body: AssetHashesRequestDto) {
    try {
      this.assertWorkspace(body.dir);
    } catch (err) {
      throw new HttpException(`asset-hashes workspace mismatch: ${(err as Error).message}`, HttpStatus.BAD_REQUEST);
    }
    const hashes: Record<string, string> = {};
    try {
      for (const row of this.assets.vault.list()) {
        if (row.status !== "active") continue;
        const key = row.full_hash ? row.full_hash : row.quick_hash ? `q:${row.quick_hash}:${row.size}` : null;
        if (key) hashes[row.path] = key;
      }
    } catch (err) {
      this.log.warn(`asset-hashes 失败 dir=${body.dir}: ${(err as Error).message}（回空表）`);
      return { hashes: {} };
    }
    return { hashes };
  }

  /** 把导出的会话写进本机 opencode 库，旧工作区路径改写成新路径。 */
  @Post("import")
  import(@Body() body: OpenCodeImportRequestDto) {
    if (!body.payload || typeof body.payload !== "object") throw new HttpException("payload must be an object", HttpStatus.BAD_REQUEST);
    try {
      return importOpenCodeData(body.payload, { newWorkspaceDir: body.newDir, oldWorkspaceDir: body.oldDir, dbPath: body.dbPath }, this.archiveLogger());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.log.error(`import 失败 (oldDir=${body.oldDir} newDir=${body.newDir}): ${message}`);
      throw new HttpException(`Project archive import failed: ${message}`, HttpStatus.BAD_REQUEST);
    }
  }

  /** 解包时改了名的文件，资产库里的路径跟着改，保住原来的资产 id。 */
  @Post("rewrite-vault-paths")
  rewriteVaultPaths(@Body() body: VaultPathRewriteRequestDto) {
    try {
      return rewriteVaultPaths(body.vaultDbPath, body.renames ?? [], this.archiveLogger());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.log.error(`rewrite-vault-paths 失败 ${body.vaultDbPath}: ${message}`);
      throw new HttpException(`Vault path rewrite failed: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private archiveLogger(): ArchiveLogger {
    return { info: (m) => this.log.log(m), warn: (m) => this.log.warn(m) };
  }
}

@Controller("api/projects/archive/activity")
export class ProjectArchiveActivityController {
  constructor(private readonly activity: ProjectArchiveActivityService) {}

  @Post("begin")
  begin(@Body() body: ProjectExportActivityStartDto) {
    try {
      return { started: this.activity.begin(body.dir, body.leaseId, body.ownerPid) };
    } catch (err) {
      if (err instanceof ActivityWorkspaceMismatchError) throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
      throw err;
    }
  }

  @Post("heartbeat")
  heartbeat(@Body() body: ProjectExportActivityLeaseDto) {
    return { renewed: this.activity.heartbeat(body.leaseId) };
  }

  @Post("end")
  end(@Body() body: ProjectExportActivityLeaseDto) {
    return { released: this.activity.end(body.leaseId) };
  }
}
