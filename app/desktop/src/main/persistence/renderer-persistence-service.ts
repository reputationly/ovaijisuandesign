/**
 * 渲染层持久化报告服务（第 288 轮，整份取回自参照 out/main/chunks/index-WiZKxTAT.js）。
 *
 * 为什么需要：NativeWorkbenchOwner 的第一步是 ensurePersistenceOwner，
 * 它要 accessor.get(IRendererPersistenceMainService)。该服务此前两头都没有，
 * 于是 prepare() 抛错 → ownerPhase=failed → 资源视图停在 projectV3.loadFailed，
 * 而且 mount() 一次都不会被调用（已用主进程日志实测）。
 */
// @ts-nocheck —— 整份取回的参照代码，保留原形态（含隐式 any），不做类型改写
import { Disposable, Emitter } from "../ipc/events.js";

const ACK_TIMEOUT_MS = 1e4;
const MAX_OWNERS = 32;
function validId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9:-]{1,128}$/.test(value);
}


export class RendererPersistenceService extends Disposable {
  constructor(windows2) {
    super();
    this.windows = windows2;
  }
  windows;
  requests = this._register(new Emitter());
  onSynchronize = this.requests.event;
  owners = /* @__PURE__ */ new Map();
  revision = 0;
  pending = /* @__PURE__ */ new Map();
  inFlight;
  async register(ownerId, sessionId) {
    if (!validId(ownerId) || !validId(sessionId) || !this.owners.has(ownerId) && this.owners.size >= MAX_OWNERS)
      throw new Error("Invalid persistence owner");
    if (this.owners.get(ownerId)?.sessionId === sessionId) return;
    const contents = this.windows.getHomeWindow()?.webContents;
    if (!contents || contents.isDestroyed()) throw new Error("Persistence renderer unavailable");
    const previous = this.owners.get(ownerId);
    if (previous) void this.unregister(ownerId, previous.sessionId);
    const retire = () => {
      void this.unregister(ownerId, sessionId);
    };
    const navigate = (event) => {
      if (event.isMainFrame && !event.isSameDocument) retire();
    };
    contents.on("destroyed", retire);
    contents.on("render-process-gone", retire);
    contents.on("did-start-navigation", navigate);
    this.owners.set(ownerId, {
      sessionId,
      stop: () => {
        contents.removeListener("destroyed", retire);
        contents.removeListener("render-process-gone", retire);
        contents.removeListener("did-start-navigation", navigate);
      }
    });
    this.revision++;
  }
  async unregister(ownerId, sessionId) {
    const owner = this.owners.get(ownerId);
    if (owner?.sessionId !== sessionId) return;
    this.owners.delete(ownerId);
    owner.stop();
    this.revision++;
    for (const request2 of this.pending.values())
      if (request2.ownerId === ownerId) request2.finish(new Error("Persistence owner retired"));
  }
  async acknowledge(ownerId, sessionId, requestId, confirmed) {
    const request2 = this.pending.get(requestId);
    if (!request2 || request2.ownerId !== ownerId || this.owners.get(ownerId)?.sessionId !== sessionId)
      return;
    request2.finish(confirmed === true ? void 0 : new Error("Persistence reporting failed"));
  }
  synchronize() {
    if (this.inFlight) return this.inFlight;
    const revision = this.revision;
    const requestIds = /* @__PURE__ */ new Set();
    const run = Promise.all(
      [...this.owners].map(
        ([ownerId, owner]) => new Promise((resolve2, reject) => {
          const requestId = randomUUID();
          requestIds.add(requestId);
          const finish = (error2) => {
            if (!this.pending.delete(requestId)) return;
            clearTimeout(timer);
            if (error2) reject(error2);
            else resolve2();
          };
          const timer = setTimeout(
            () => finish(new Error("Persistence confirmation timed out")),
            ACK_TIMEOUT_MS
          );
          this.pending.set(requestId, { ownerId, finish });
          this.requests.fire({ ownerId, sessionId: owner.sessionId, requestId });
        })
      )
    ).then(() => {
      if (revision !== this.revision)
        throw new Error("Persistence owners changed during shutdown preparation");
    });
    this.inFlight = run.catch((cause) => {
      throw new RendererPersistenceUnavailableError({ cause });
    }).finally(() => {
      for (const id2 of requestIds)
        this.pending.get(id2)?.finish(new Error("Persistence barrier cancelled"));
      this.inFlight = void 0;
    });
    return this.inFlight;
  }
  dispose() {
    for (const request2 of this.pending.values())
      request2.finish(new Error("Persistence service retired"));
    for (const owner of this.owners.values()) owner.stop();
    this.owners.clear();
    super.dispose();
  }
}

// 参照尾部原本是 __decorateClass([__decorateParam(0, IWindowService)], ...)，
// 那两个助手没随类取回。这里由 index.ts 手动注入 windows（传 { getHomeWindow }），
// 所以不需要装饰器。
