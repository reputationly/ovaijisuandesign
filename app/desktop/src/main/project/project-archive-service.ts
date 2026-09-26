/**
 * `projectArchive` 频道：项目导出 / 导入、自带模板（示例项目）的导入。
 *
 * 打包解包在这里做（`archive-bundler.ts`），gateway 负责资产库快照和会话读写：
 * 导出打到这个工作区自己的 gateway（它绑定着工作区，带身份头），导入打到应用级 gateway
 * （目标目录还不是一个打开的工作区）。
 */
import { access } from "node:fs/promises";
import path from "node:path";

import type { GatewayBinding } from "../ipc/types.js";
import { Emitter } from "../ipc/events.js";
import {
  type ArchiveLogger,
  ExportCancelledError,
  errorCode,
  exportProjectToZip,
  FilePublishError,
  getDefaultExportFileName,
  type ImportProgress,
  type ImportResult,
  importProjectFromZip,
  ProjectExportActivityError,
  ProjectExportDestinationError,
  resolveDefaultProjectExportPath,
} from "./archive-bundler.js";

/** 模板 id → 包文件名。 */
export const BUNDLED_PROJECT_ARCHIVES: Record<string, string> = {
  "h3-playground": "h3-playground.zip",
  "sample-project": "sample-project.zip",
};

export interface ArchiveProgressEvent {
  kind: "export" | "import";
  percent: number;
  processedBytes?: number;
  totalBytes?: number;
  entriesProcessed?: number;
  entriesTotal?: number;
}

export type ExportProjectResult =
  | { cancelled: true; cancelReason: "dialog" | "aborted" }
  | { cancelled: false; failureReason: string }
  | { cancelled: false; filePath: string; size: number; opencodeSessionCount: number };

export type ImportProjectResult =
  | { cancelled: true }
  | {
      cancelled: false;
      targetDir: string;
      name: string;
      originalName: string;
      opencodeSessionCount: number;
      expectedOpencodeSessionCount: number;
      opencodeImportError?: string;
    };

export interface ProjectArchiveDeps {
  appVersion: string;
  projectsRoot(): string;
  /** opencode 进程实际读写的会话库；导入时转给 gateway，保证写进同一份。 */
  opencodeDbPath: string;
  /** 这个工作区正在跑的 gateway 身份；没打开 / 没起来时 undefined。 */
  workspaceBinding(folderPath: string): GatewayBinding | undefined;
  /** 应用级 gateway 的地址（导入用）。 */
  appGatewayUrl(): string | undefined;
  /** 自带模板所在目录（按顺序找，第一个有这个文件的为准）。 */
  templateDirs(): string[];
  downloadsDir(): string;
  showSaveDialog(opts: { title: string; defaultPath?: string; filters: { name: string; extensions: string[] }[] }): Promise<{ canceled: boolean; filePath?: string }>;
  showOpenDialog(opts: { title: string; filters: { name: string; extensions: string[] }[]; properties: string[] }): Promise<{ canceled: boolean; filePaths: string[] }>;
  log(line: string): void;
}

export class ProjectArchiveService {
  private readonly progress = new Emitter<ArchiveProgressEvent>();
  readonly onProgress = this.progress.event;
  private activeExportAbort: AbortController | null = null;
  /** 覆盖整个导出请求（包括保存对话框）：一次只允许一个。 */
  private exportInProgress = false;

  constructor(private readonly deps: ProjectArchiveDeps) {}

  /** 退出流程用：有导出在跑时要先问用户。 */
  hasActiveExport(): boolean {
    return this.activeExportAbort !== null;
  }

  async exportProject(folderPath: string): Promise<ExportProjectResult> {
    if (typeof folderPath !== "string" || !folderPath) throw new Error("folderPath is required");
    if (this.exportInProgress) {
      this.deps.log("[project-archive] export blocked reason=export_in_progress");
      return { cancelled: false, failureReason: "export_in_progress" };
    }
    this.exportInProgress = true;
    try {
      return await this.exportOnce(folderPath);
    } catch (err) {
      this.deps.log(`[project-archive] export failed reason=unexpected code=${errorCode(err) ?? "unknown"}: ${err instanceof Error ? err.message : String(err)}`);
      return { cancelled: false, failureReason: "unexpected" };
    } finally {
      this.exportInProgress = false;
    }
  }

  private async exportOnce(folderPath: string): Promise<ExportProjectResult> {
    const binding = this.deps.workspaceBinding(folderPath);
    if (!binding) {
      this.deps.log("[project-archive] export blocked reason=workspace_not_ready");
      return { cancelled: false, failureReason: "workspace_not_ready" };
    }
    const defaultPath = await resolveDefaultProjectExportPath(folderPath, this.deps.downloadsDir(), getDefaultExportFileName(folderPath));
    const saved = await this.deps.showSaveDialog({ title: "Export Project", ...(defaultPath ? { defaultPath } : {}), filters: [{ name: "Hub Project Archive", extensions: ["zip"] }] });
    if (saved.canceled || !saved.filePath) return { cancelled: true, cancelReason: "dialog" };

    const abort = new AbortController();
    this.activeExportAbort = abort;
    try {
      const r = await exportProjectToZip(folderPath, saved.filePath, this.deps.appVersion, binding.baseUrl, this.logger(), {
        signal: abort.signal,
        onProgress: this.forwarder("export"),
        workspaceBinding: binding,
        // 导出途中 gateway 被重启过的话，后续请求要打到新的那个
        resolveWorkspaceBinding: () => this.deps.workspaceBinding(folderPath) ?? binding,
      });
      return { cancelled: false, filePath: r.filePath, size: r.size, opencodeSessionCount: r.opencodeSessionCount };
    } catch (err) {
      if (err instanceof ExportCancelledError || abort.signal.aborted) {
        this.deps.log("[project-archive] export cancelled");
        return { cancelled: true, cancelReason: "aborted" };
      }
      if (err instanceof FilePublishError || err instanceof ProjectExportDestinationError || err instanceof ProjectExportActivityError) {
        this.deps.log(`[project-archive] export failed reason=${err.reason}: ${err.message}`);
        return { cancelled: false, failureReason: err.reason };
      }
      this.deps.log(`[project-archive] export failed reason=unexpected code=${errorCode(err) ?? "unknown"}: ${err instanceof Error ? err.message : String(err)}`);
      return { cancelled: false, failureReason: "unexpected" };
    } finally {
      this.activeExportAbort = null;
    }
  }

  async cancelExport(): Promise<boolean> {
    if (!this.activeExportAbort) return false;
    this.activeExportAbort.abort();
    return true;
  }

  async importProject(): Promise<ImportProjectResult> {
    const gatewayUrl = this.requireAppGatewayUrl();
    const picked = await this.deps.showOpenDialog({
      title: "Import Project",
      filters: [
        { name: "Hub Project Archive", extensions: ["zip"] },
        { name: "All Files", extensions: ["*"] },
      ],
      properties: ["openFile"],
    });
    if (picked.canceled || picked.filePaths.length === 0) return { cancelled: true };
    return this.importZip(picked.filePaths[0]!, gatewayUrl);
  }

  /**
   * 远程模板（服务端弹窗里的"一键导入"链接）。我们没有模板下载服务，也不从别家的 CDN 拉包，
   * 所以任何地址都不在信任列表里，直接拒绝。
   */
  async importProjectFromUrl(url: string, _projectName?: string): Promise<ImportProjectResult> {
    throw new Error(`Archive URL not allowed: ${url}`);
  }

  /** 自带模板：开发时读仓库的 `assets/project-templates/`，发布包读 `resources/project-templates/`。 */
  async importBundledProject(templateId: string): Promise<ImportProjectResult> {
    const zipPath = await this.resolveTemplate(templateId);
    return this.importZip(zipPath, this.requireAppGatewayUrl());
  }

  async resolveTemplate(templateId: string): Promise<string> {
    const file = BUNDLED_PROJECT_ARCHIVES[templateId];
    if (!file) throw new Error(`Unknown bundled project template: ${templateId}`);
    for (const dir of this.deps.templateDirs()) {
      const p = path.join(dir, file);
      if (await access(p).then(() => true, () => false)) return p;
    }
    throw new Error(`Bundled project template is missing: ${templateId}`);
  }

  private async importZip(zipPath: string, gatewayUrl: string): Promise<ImportProjectResult> {
    const r: ImportResult = await importProjectFromZip(
      zipPath,
      { projectsRoot: this.deps.projectsRoot(), gatewayUrl, opencodeDbPath: this.deps.opencodeDbPath, log: this.logger() },
      { onProgress: this.forwarder("import") },
    );
    return {
      cancelled: false,
      targetDir: r.targetDir,
      name: r.name,
      originalName: r.originalName,
      opencodeSessionCount: r.opencodeSessionCount,
      expectedOpencodeSessionCount: r.expectedOpencodeSessionCount,
      ...(r.opencodeImportError ? { opencodeImportError: r.opencodeImportError } : {}),
    };
  }

  /** 应用级 gateway 还没起来（启动那一瞬间）时给一句清楚的错误，而不是一个莫名其妙的网络失败。 */
  private requireAppGatewayUrl(): string {
    const url = this.deps.appGatewayUrl();
    if (!url) throw new Error("Local gateway is not ready yet; cannot run project archive");
    return url;
  }

  /** 进度按整数百分比去重：一次操作最多约 100 个事件，不会把渲染层淹掉。 */
  private forwarder(kind: "export" | "import") {
    let last = -1;
    return (p: Partial<ImportProgress> & { processedBytes?: number; totalBytes?: number }) => {
      const done = kind === "export" ? (p.processedBytes ?? 0) : (p.entriesProcessed ?? 0);
      const total = kind === "export" ? (p.totalBytes ?? 0) : (p.entriesTotal ?? 0);
      const percent = total > 0 ? Math.min(99, Math.floor((done / total) * 100)) : 0;
      if (percent === last) return;
      last = percent;
      this.progress.fire({ kind, percent, processedBytes: p.processedBytes, totalBytes: p.totalBytes, entriesProcessed: p.entriesProcessed, entriesTotal: p.entriesTotal });
    };
  }

  private logger(): ArchiveLogger {
    return { info: (m) => this.deps.log(`[project-archive] ${m}`), warn: (m) => this.deps.log(`[project-archive] ${m}`) };
  }

  dispose(): void {
    this.activeExportAbort?.abort();
    this.progress.dispose();
  }
}
