/**
 * 总线上各服务的形状（纯类型）。主进程实现它们，渲染层用 `toService` 拿到的代理
 * 满足同样的接口（方法都返回 Promise）。
 */
import type { Event } from "./events.js";

// ---------------------------------------------------------------------------
// 工作区

/** 工作区 id 就是它解析后的绝对路径。 */
export type WorkspaceId = string;

export interface GatewayBinding {
  baseUrl: string;
  claim: string;
  instanceId: string;
  generation: number;
}

/** 顶栏标签。冷标签（没起进程的）没有 gateway 字段。 */
export interface WorkspaceEntry {
  workspaceId: WorkspaceId;
  projectName: string;
  folderPath: string;
  gatewayUrl?: string;
  workspaceClaim?: string;
  gatewayBinding?: GatewayBinding;
}

export interface WorkspaceRuntimeInfo {
  workspaceId: WorkspaceId;
  projectName: string;
  folderPath: string;
  gatewayUrl: string;
  workspaceClaim: string;
  gatewayBinding: GatewayBinding;
  wsUrl: string;
}

export type WorkspaceOpenResult =
  | { kind: "opened" | "reused"; runtime: WorkspaceRuntimeInfo }
  | { kind: "cancelled"; folderPath: string }
  | { kind: "retry_in_flight"; folderPath: string; workspaceId: WorkspaceId }
  | {
      kind: "limit_reached";
      folderPath: string;
      limitScope: "live-runtime-budget";
      reason: "no-safe-suspend-candidate";
      maxOpenWorkspaces: number;
      openWorkspaceCount: number;
      busyProjectNames: string[];
    }
  | { kind: "storage_restart_required" | "storage_migration_in_progress"; folderPath: string }
  | { kind: "storage_unavailable"; reasonCode: string; statusSource: "verified" | "unavailable"; allowTemporaryDefault: boolean };

export type WorkspaceStageResult =
  | { kind: "staged"; entry: WorkspaceEntry }
  | { kind: "cancelled"; folderPath: string }
  | { kind: "retry_in_flight"; folderPath: string; workspaceId: WorkspaceId };

export interface WorkspaceCloseResult {
  closed: boolean;
  reason?: "unsaved" | "active" | "runtime-changed" | "storage" | "not-found";
  blockingReasons?: string[];
}

export type WorkspaceLifecycleState =
  | "cold"
  | "starting"
  | "gateway-ready"
  | "bound"
  | "background"
  | "suspending"
  | "suspended"
  | "resuming"
  | "failed"
  | "stopping"
  | "stopped";

export interface WorkspaceCreateRequest {
  name?: string;
  folderPath?: string;
  loadUserMemory?: boolean;
  allowDataDirectoryFallback?: boolean;
}

export interface WorkspaceCloseOptions {
  source?: string;
  force?: boolean;
  discardUnsavedChanges?: boolean;
}

export interface WorkspacePersistenceReport {
  workspaceId: WorkspaceId;
  instanceId: string;
  state: "clean" | "dirty" | "saving" | "failed";
}

/** `hilo` 频道里渲染层用到的部分。 */
export interface IHiloApp {
  createWorkspaceWithResult(input?: string | WorkspaceCreateRequest): Promise<WorkspaceOpenResult>;
  openWorkspaceWithResult(folderPath: string): Promise<WorkspaceOpenResult>;
  stageWorkspaceTab(folderPath: string): Promise<WorkspaceStageResult>;
  activateWorkspaceWithResult(workspaceId: WorkspaceId): Promise<WorkspaceOpenResult | undefined>;
  activateWorkspace(workspaceId: WorkspaceId): Promise<WorkspaceRuntimeInfo | undefined>;
  activateHome(): Promise<void>;
  closeWorkspace(workspaceId: WorkspaceId, options?: WorkspaceCloseOptions): Promise<WorkspaceCloseResult>;
  closeAllWorkspaces(options?: { discardUnsavedChanges?: boolean }): Promise<{ closed: boolean; reason?: string }>;
  retryWorkspaceWithResult(workspaceId: WorkspaceId): Promise<WorkspaceOpenResult>;
  listWorkspaceEntries(): Promise<WorkspaceEntry[]>;
  listWorkspaceLifecycleStates(): Promise<Record<WorkspaceId, WorkspaceLifecycleState>>;
  getWorkspaceRuntime(workspaceId: WorkspaceId): Promise<WorkspaceRuntimeInfo | undefined>;
  updateFocusedSession(workspaceId: WorkspaceId, sessionId: string | null): Promise<void>;
  reportWorkspacePersistence(report: WorkspacePersistenceReport): Promise<void>;
  updateRendererDiagnosticsSnapshot(snapshot: Record<string, unknown>): Promise<void>;
  toggleSkill(name: string, enabled: boolean): Promise<unknown>;
  retryAppGateway(): Promise<void>;
  readonly onWorkspaceEntriesChanged: Event<WorkspaceEntry[]>;
}

// ---------------------------------------------------------------------------
// 每个工作区一套进程

export type BundleState =
  | "creating"
  | "gateway-starting"
  | "gateway-ready"
  | "opencode-starting"
  | "bound"
  | "failed"
  | "stopping"
  | "stopped";

export interface BundleStatus {
  workspaceId: WorkspaceId;
  folderPath: string;
  state: BundleState;
  /** 单调递增；渲染层据此丢弃过期的状态。 */
  revision: number;
  gatewayUrl?: string;
  openCodeUrl?: string;
  /** 给用户看的错误。 */
  error?: string;
  readiness?: { chat: "ready" | "starting" | "failed" };
}

/** `workspace-bundle-${id}` 频道。 */
export interface IBundleView {
  getStatus(): Promise<BundleStatus>;
  readonly onStatusChange: Event<BundleStatus>;
}

// ---------------------------------------------------------------------------
// 应用级 gateway

export interface GatewayReadinessSnapshot {
  state: "allocated" | "starting" | "ready" | "failed";
  url: string;
  startedAt?: number;
  readyAt?: number;
  errorKind?: string;
  message?: string;
}

/** `gateway-readiness` 频道。 */
export interface IGatewayReadiness {
  getSnapshot(): Promise<GatewayReadinessSnapshot>;
  readonly onDidChange: Event<GatewayReadinessSnapshot>;
}

// ---------------------------------------------------------------------------
// 项目（一组工作区 + 一个项目空间目录）

export interface ProjectRecord {
  id: string;
  name: string;
  kind: "local" | "team";
  createdAt: number;
  updatedAt: number;
  workspacePaths: string[];
  revision: number;
  transactionId: string;
  folderName: string;
  remoteId?: string;
  coverImage?: string;
}

export type DeleteProjectResult =
  | { success: true }
  | { success: false; errorCode: "project-not-found" | "project-transfer-active" | "project-folder-trash-failed" };

/** `project` 频道。列表本身从 `storage:global-get("projects")` 读。 */
export interface IProjectService {
  createProject(input: { name: string; kind: "local" | "team"; remoteId?: string; id?: string; createdAt?: number; updatedAt?: number }): Promise<ProjectRecord>;
  renameProject(projectId: string, name: string): Promise<ProjectRecord | undefined>;
  deleteProject(projectId: string): Promise<DeleteProjectResult>;
  hasActiveProjectTransfers(projectId: string): Promise<boolean>;
  assignWorkspace(workspacePath: string, projectId: string, caseInsensitive?: boolean): Promise<void>;
  detachWorkspace(workspacePath: string, caseInsensitive?: boolean): Promise<void>;
  mergeCloudProjects(cloud: Array<{ id: string; name: string; createdAt?: number; updatedAt?: number }>): Promise<void>;
  upsertCloudProject(cloud: { id: string; name: string; createdAt?: number; updatedAt?: number }): Promise<string>;
  provisionSampleProject(input: { id?: string; name: string; kind?: "local"; workspacePath: string; caseInsensitive?: boolean }): Promise<ProjectRecord>;
  getProjectFolderName(projectId: string): Promise<string | undefined>;
  readonly onDidChangeProjects: Event<ProjectRecord[]>;
}

/** 启动恢复时经 `menu:new-workspace` 发给渲染层的负载。 */
export interface SessionRestorePayload {
  source: "session-restore";
  restoredWorkspaceIds: string[];
  preferredWorkspaceId?: string;
}
