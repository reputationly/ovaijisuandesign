import { randomUUID } from "node:crypto";

import { Inject, Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";

import { CanvasService } from "../canvas/canvas.service.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";
import { PluginFilesService } from "./plugins.service.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 300_000;
const DEFAULT_PLUGIN_ID = "clip-studio";

/**
 * 代理调用停在这里，等画布里打开的插件编辑器把结果推回来。
 * 编辑器没开时不能替它执行，只能把调用交给渲染层。
 */
@Injectable()
export class PluginAgentService implements OnModuleDestroy {
  private readonly log = new Logger("PluginAgent");
  private readonly pending = new Map<string, { resolve: (value: unknown) => void; timer: NodeJS.Timeout; nodeId: string; method: string }>();

  constructor(
    @Inject(CanvasService) private readonly canvas: CanvasService,
    @Inject(GatewayEventBus) private readonly bus: GatewayEventBus,
    @Inject(PluginFilesService) private readonly plugins: PluginFilesService,
  ) {}

  async surface(nodeId: string) {
    const resolved = await this.resolveNode(nodeId);
    if ("error" in resolved) return { ok: false, error: resolved.error };
    const agent = await this.plugins.agentFor(resolved.pluginId);
    const root = await this.plugins.packageRoot(resolved.pluginId);
    if (!root) return { ok: false, error: { code: "node_not_found", message: `Plugin "${resolved.pluginId}" is not installed on this machine` } };
    const listed = (await this.plugins.list()).find((plugin) => plugin.id === resolved.pluginId) as { name?: unknown } | undefined;
    return { ok: true, nodeId: resolved.nodeId, pluginId: resolved.pluginId, pluginName: listed?.name ?? {}, agent };
  }

  async invoke(args: { nodeId?: string; method?: string; args?: unknown; timeoutMs?: number }) {
    const method = args.method?.trim();
    if (!method) return failure(undefined, "node_not_found", "method is required");
    const resolved = await this.resolveNode(args.nodeId ?? "");
    if ("error" in resolved) return { ok: false, error: resolved.error };
    const agent = await this.plugins.agentFor(resolved.pluginId);
    if (!agent) return failure(undefined, "editor_not_open", `Plugin "${resolved.pluginId}" declares no agent surface (manifest.agent missing).`);
    const declared = agent.methods.find((entry) => entry.name === method);
    if (!declared) return failure(undefined, "handler_error", `Unknown method "${method}" for plugin "${resolved.pluginId}". Declared methods: ${agent.methods.map((entry) => entry.name).join(", ")}`);
    const timeoutMs = Math.min(Math.max(1000, args.timeoutMs ?? declared.timeoutMs ?? DEFAULT_TIMEOUT_MS), MAX_TIMEOUT_MS);
    const invokeId = randomUUID();
    const result = new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(invokeId);
        this.log.warn(`plugin-agent invoke timed out after ${timeoutMs}ms (node=${resolved.nodeId} method=${method})`);
        resolve(failure(invokeId, "timeout", `Plugin did not respond within ${Math.round(timeoutMs / 1000)}s. The editor may be busy or the operation too heavy — retry with a smaller batch.`));
      }, timeoutMs);
      this.pending.set(invokeId, { resolve, timer, nodeId: resolved.nodeId, method });
    });
    this.bus.emit("plugin-agent:invoke", { type: "plugin_agent_invoke", nodeId: resolved.nodeId, invokeId, method, args: args.args ?? {} });
    return result;
  }

  acceptResult(push: { invokeId?: string; ok?: boolean; result?: unknown; error?: { code?: string; message?: string } }): boolean {
    if (!push?.invokeId) return false;
    const slot = this.pending.get(push.invokeId);
    if (!slot) return false;
    this.pending.delete(push.invokeId);
    clearTimeout(slot.timer);
    if (push.ok) {
      slot.resolve({ ok: true, invokeId: push.invokeId, result: push.result ?? null });
      return true;
    }
    slot.resolve({
      ok: false,
      invokeId: push.invokeId,
      error: { code: normalizeErrorCode(push.error?.code), message: push.error?.message || "plugin returned an unspecified error" },
    });
    return true;
  }

  async openEditor(nodeId: string, sourceNodeIds?: string[], initialMessage?: string) {
    let target = nodeId?.trim() ?? "";
    const candidate = target || DEFAULT_PLUGIN_ID;
    const pluginRoot = await this.plugins.packageRoot(candidate);
    if (!target || pluginRoot) {
      const current = await this.canvas.getCanvas();
      const existing = current.nodes.find((node) => (node.data as { pluginId?: string } | undefined)?.pluginId === candidate);
      if (existing) target = existing.id;
      else {
        try {
          target = await this.plugins.instantiate(candidate, sourceNodeIds?.length ? { sourceNodeIds } : {});
        } catch (error) {
          return { ok: false, error: { code: "node_not_found", message: `Failed to create ${candidate} node: ${error instanceof Error ? error.message : String(error)}` } };
        }
      }
    }
    const resolved = await this.resolveNode(target);
    if ("error" in resolved) return { ok: false, error: resolved.error };
    const message = initialMessage?.trim();
    this.bus.emit("plugin-editor:open", { type: "plugin_editor_open", nodeId: resolved.nodeId, ...(message ? { initialMessage: message } : {}) });
    return { ok: true, nodeId: resolved.nodeId };
  }

  onModuleDestroy(): void {
    for (const [invokeId, slot] of this.pending) {
      clearTimeout(slot.timer);
      slot.resolve(failure(invokeId, "handler_error", "plugin agent bridge shut down"));
    }
    this.pending.clear();
  }

  private async resolveNode(rawNodeId: string): Promise<{ nodeId: string; pluginId: string } | { error: { code: string; message: string } }> {
    const nodeId = rawNodeId.trim();
    if (!nodeId) return { error: { code: "node_not_found", message: "nodeId is required" } };
    const current = await this.canvas.getCanvas();
    const target = current.nodes.find((node) => node.id === nodeId);
    if (!target) return { error: { code: "node_not_found", message: `Canvas node not found: ${nodeId}` } };
    const pluginId = (target.data as { pluginId?: unknown } | undefined)?.pluginId;
    if (typeof pluginId !== "string" || !pluginId) return { error: { code: "node_not_found", message: `Node ${nodeId} is not a plugin node` } };
    return { nodeId, pluginId };
  }
}

function failure(invokeId: string | undefined, code: string, message: string) {
  return { ok: false, ...(invokeId ? { invokeId } : {}), error: { code, message } };
}

function normalizeErrorCode(code: string | undefined): string {
  switch (code) {
    case "editor_not_open":
    case "timeout":
    case "handler_error":
    case "node_not_found":
    case "busy":
      return code;
    default:
      return "handler_error";
  }
}
