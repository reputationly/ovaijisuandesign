/**
 * `NativeWorkbenchService` / `NativeWorkbenchMedia` 的宿主依赖适配器（第 188 轮）。
 *
 * 这两个类在产物里是完整的，但一直只在测试里被构造。这里把它们需要的宿主能力
 * 集中成一处，主进程只需要提供三样东西：gateway 注册表、主窗口、日志函数。
 *
 * 尚未真实实现的项都写了明确注释，避免被当成真实现（见 docs/4.0.0-status.md 第 50 节）。
 */
import type { GatewayRegistry } from "../gateway/gateway-registry.js";
import type { GatewayBinding } from "../ipc/types.js";
import type { BrowserWindow } from "electron";
import type { MediaBinding, MediaDeps } from "./native-workbench-media.js";
import type { V3AccountSnapshot } from "./session.js";
import type { V3WorkbenchOptions } from "./host.js";

/** 本机固定用户的个人空间快照（与 stub-channels 的 TEAM_SNAPSHOT 同形）。 */
export const LOCAL_ACCOUNT_SNAPSHOT: V3AccountSnapshot & { status: string } = {
  status: "ready",
  identityKey: "team-identity-v1:local",
  activeContext: { accountType: "PERSONAL", groupId: "local", epoch: 1 },
};

/** 永不触发的订阅：当前账号是本机常量，没有变化源。 */
export function neverChanges(): { dispose(): void } {
  return { dispose: () => undefined };
}

/** 从我们的一条路径模板拼出预览地址（与 CANVAS_V3_ROUTES.previews 一致）。 */
export function previewPath(resourceId: string, versionId: string): string {
  return `/api/v3/canvas/previews/${encodeURIComponent(resourceId)}/${encodeURIComponent(versionId)}`;
}

/**
 * 校验「资源图片预览」请求的形状。
 *
 * 只做形状检查：够挡住伪造的 input，不承诺语义（语义由 media 内部的
 * workspaceId / 路径穿越检查负责）。
 */
export function isRevealRequest(input: unknown): boolean {
  if (!input || typeof input !== "object") return false;
  const v = input as Record<string, unknown>;
  return (
    typeof v.workspaceId === "string" &&
    v.workspaceId.length > 0 &&
    typeof v.resourceId === "string" &&
    v.resourceId.length > 0 &&
    typeof v.versionId === "string" &&
    v.versionId.length > 0 &&
    !!v.identity &&
    typeof v.identity === "object"
  );
}

export interface WorkbenchHostDeps {
  gateways: GatewayRegistry;
  homeWindow(): BrowserWindow | undefined;
  options: V3WorkbenchOptions;
  log(line: string): void;
}

/** 把 gateway 注册表里的绑定补成 media 需要的形状（多一个 pid）。 */
function mediaBinding(deps: WorkbenchHostDeps, key: string): MediaBinding | undefined {
  const gw = deps.gateways.get(key);
  const binding: GatewayBinding | undefined = gw?.binding?.();
  const pid = gw?.pid?.();
  if (!binding || typeof pid !== "number") return undefined;
  return {
    baseUrl: binding.baseUrl,
    claim: binding.claim,
    instanceId: binding.instanceId,
    generation: binding.generation,
    pid,
  };
}

/** `NativeWorkbenchMedia` 需要的 9 项。 */
export function workbenchMediaDeps(deps: WorkbenchHostDeps): MediaDeps {
  return {
    binding: (key) => mediaBinding(deps, key),
    snapshot: async () => ({ status: LOCAL_ACCOUNT_SNAPSHOT.status }),
    onAccountChange: () => neverChanges(),
    isRevealRequest,
    previewPath,
    identityHeaders: (binding) => ({
      "x-hilo-workspace": binding.claim,
      "x-hilo-workspace-instance": binding.instanceId,
      "x-hilo-workspace-generation": String(binding.generation),
    }),
    // 第 188 轮：项目导出活动窗口还没实现。先直接执行，不记账。
    // 这会让「导出中」的并发保护失效，但不影响读取本身。
    withExportActivity: (_binding, _workspaceId, _log, run) => run(),
    log: deps.log,
  };
}

/** `NativeWorkbenchService` 需要的 5 项（media 必须由调用方传入真实例）。 */
// 第 298 轮：这里原本是 ，配合调用处的  把类型不匹配藏了起来。
// 现在按真实形状标注，让 tsc 能查到问题。
export function workbenchServiceDeps(
  deps: WorkbenchHostDeps,
  media: import("./native-workbench-media.js").NativeWorkbenchMedia,
) {
  return {
    homeWindow: () => deps.homeWindow(),
    options: deps.options,
    media,
    accountSnapshot: async () => LOCAL_ACCOUNT_SNAPSHOT,
    onAccountChange: () => neverChanges(),
  };
}
