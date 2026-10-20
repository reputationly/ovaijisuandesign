/**
 * 把 v3 原生工作台服务注册进渲染层的 DI（第 278 轮）。
 *
 * 在此之前 `INativeWorkbenchService` **从未被 register 过**：
 *   native-workbench-closure.js 里 `api.mount(...)` 走的是
 *   `instantiationService.invokeFunction(a => a.get(INativeWorkbenchService))`，
 *   没注册 → 取不到 → mount 永远不执行 → 资源视图永远不可用。
 *
 * 参照的做法是：
 *   services.set(INativeWorkbenchService, ProxyChannel.toService(client.getChannel("nativeWorkbench")))
 * 主进程侧对应 registerChannel("nativeWorkbench", nativeWorkbench)。
 *
 * 第 289 轮补上 `IRendererPersistenceMainService`（ensurePersistenceOwner 需要）。
 * 注意：早期版本漏了它的 import，导致 ReferenceError（TDZ），
 * 表现为 acquire 的排队任务根本不启动、资源视图永远停在 loadFailed。
 *
 * **惰性**：只在真正 acquire 原生工作台时注册。
 * 放模块顶层会让 home-skill-inspiration 屏多出 2654 像素差异（确定性复现）。
 */
import { ProxyChannel } from "../vendor-inline/vscode-base/channel-client.js";
import { client, services } from "../vendor-inline/vscode-base/graph.jsx";
import { IRendererPersistenceMainService } from "./main-services.js";

let registered;

export function ensureNativeWorkbenchServiceRegistered(INativeWorkbenchService) {
  if (registered) return registered;
  registered = ProxyChannel.toService(client.getChannel("nativeWorkbench"));
  services.set(INativeWorkbenchService, registered);
  services.set(
    IRendererPersistenceMainService,
    ProxyChannel.toService(client.getChannel("rendererPersistence")),
  );
  return registered;
}
