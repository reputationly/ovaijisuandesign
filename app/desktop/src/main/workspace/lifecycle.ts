/**
 * 工作区生命周期（给顶栏和"挂起后恢复"用）与 bundle 状态的对应。
 */
import type { BundleState, BundleStatus, GatewayBinding, WorkspaceLifecycleState } from "../ipc/types.js";
import type { Event } from "../ipc/events.js";

const NEXT: Record<WorkspaceLifecycleState, readonly WorkspaceLifecycleState[]> = {
  cold: ["starting", "stopped"],
  starting: ["gateway-ready", "failed", "stopping"],
  "gateway-ready": ["bound", "failed", "stopping"],
  bound: ["background", "failed", "stopping"],
  background: ["bound", "suspending", "failed", "stopping"],
  suspending: ["suspended", "failed", "stopped"],
  suspended: ["resuming", "stopped"],
  resuming: ["starting", "failed", "stopping"],
  failed: ["stopped"],
  stopping: ["stopped"],
  stopped: [],
};

export function canTransitionLifecycle(from: WorkspaceLifecycleState, to: WorkspaceLifecycleState): boolean {
  return from === to || NEXT[from].includes(to);
}

export function bundleToLifecycle(state: BundleState): WorkspaceLifecycleState {
  switch (state) {
    case "creating":
    case "gateway-starting":
      return "starting";
    case "gateway-ready":
    case "opencode-starting":
      return "gateway-ready";
    case "bound":
      return "bound";
    case "failed":
      return "failed";
    case "stopping":
      return "stopping";
    case "stopped":
      return "stopped";
  }
}

const BUNDLE_ORDER: readonly BundleState[] = ["creating", "gateway-starting", "gateway-ready", "opencode-starting", "bound"];

/** bundle 状态只往前走；任何状态都能进 failed / stopping；stopped 只能从 stopping 或 failed 来。 */
export function canTransitionBundle(from: BundleState, to: BundleState): boolean {
  if (from === to) return from !== "stopped";
  if (from === "stopped") return false;
  if (to === "failed") return from !== "stopping";
  if (to === "stopping") return true;
  if (to === "stopped") return from === "stopping" || from === "failed";
  const a = BUNDLE_ORDER.indexOf(from);
  const b = BUNDLE_ORDER.indexOf(to);
  return a >= 0 && b > a;
}

/** gateway `/api/health/activity` 的返回里我们用到的字段。 */
export interface ActivitySnapshot {
  idle: boolean;
  safe_to_suspend: boolean;
  safe_to_close: boolean;
  blocking_reasons: string[];
  last_activity_at?: number | null;
}

/**
 * 一个工作区的一套进程在宿主眼里的样子。真实实现是 BundleHandle；测试用假的。
 */
export interface WorkspaceRuntime {
  readonly workspaceId: string;
  readonly folderPath: string;
  /** 挂到 `workspace-bundle-${id}` 频道上的只读视图。 */
  readonly view: { getStatus(): BundleStatus; onStatusChange: Event<BundleStatus> };
  readonly onStatusChange: Event<BundleStatus>;
  status(): BundleStatus;
  binding(): GatewayBinding | undefined;
  /** 占好端口、定下身份就返回（此时已有地址）；进程在后台继续起。幂等。 */
  start(): Promise<BundleStatus>;
  /** 读活动状态；`drain` 时顺带拿挂起租约。gateway 不在时返回 undefined。 */
  probeActivity(drain?: boolean): Promise<ActivitySnapshot | undefined>;
  releaseSuspendLease(): Promise<void>;
  /** 按最新配置重启 opencode（技能开关变更后）。 */
  restartOpencode(): Promise<void>;
  /** 先停 opencode 再停 gateway。 */
  dispose(): Promise<void>;
  disposeSync(): void;
}

export interface RuntimeCreateOptions {
  generation: number;
  retryCount: number;
}

export type RuntimeFactory = (workspaceId: string, folderPath: string, opts: RuntimeCreateOptions) => WorkspaceRuntime;
