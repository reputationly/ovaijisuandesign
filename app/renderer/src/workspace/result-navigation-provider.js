/** 结果导航 Provider 闭包（第 275 轮）。种子：WorkspaceResultNavigationProvider。 */

import reactExports from "react";
import jsxRuntimeExports from "react/jsx-runtime";
import { useOptionalWorkspaceStructure } from "../canvas-v3/canvas-v3-hooks.js";
import { animateDirectorScene, createDirectorObjects, editDirectorScene, normalizeClipProject, parseClipProject, parseClipSnapshot, parseDirectorSnapshot } from "../canvas-v3/canvas-v3-model.js";
import { WorkspaceResultNavigationContext } from "../canvas-v3/contexts.js";
import { createDirectorTransport } from "../canvas-v3/frame-services.js";
import { TaskResultNavigationError, readResultLocationNames, taskResultNavigation } from "../canvas-v3/main-exports.js";
import { record as record$1 } from "../infra/parse-connector-selection.js";
import { usesWorkspaceResourceView } from "./native-workbench-host.jsx";
import { useWorkbenchEditorEvents } from "./workbench-events.js";
import { structureView } from "./workspace-resource-closure.js";

// CLIP_STUDIO_CAPABILITY_ID 在 canvas-v3 的常量文件里导出
import { CLIP_STUDIO_CAPABILITY_ID } from "../canvas-v3/canvas-v3-constants.js";

export function parseLocation(id2) {
  let value;
  try {
    value = JSON.parse(id2);
  } catch {
    throw new TaskResultNavigationError("missing");
  }
  if (!Array.isArray(value) || value.length !== 2 || value.some((v2) => typeof v2 !== "string" || !v2.trim()))
    throw new TaskResultNavigationError("missing");
  return [value[0], value[1]];
}

export function createStructureResultNavigation(workbench, showStructure) {
  return {
    async locations(target, cursor, { signal }) {
      const page2 = await workbench.queries.query(
        "resource_relations",
        {
          relation: "compositions",
          resourceId: target.resourceId,
          limit: 20,
          ...cursor ? { cursor } : {}
        },
        { signal }
      );
      const titles = await readResultLocationNames(
        workbench.queries,
        page2.items.map((item) => item.compositionId),
        signal
      );
      return {
        items: page2.items.flatMap(
          (item) => titles.names.has(item.compositionId) ? [
            {
              id: JSON.stringify([item.compositionId, item.memberId]),
              label: [titles.names.get(item.compositionId), item.role].filter(Boolean).join(" / ")
            }
          ] : []
        ),
        nextCursor: page2.nextCursor ?? void 0,
        complete: page2.coverage.status === "complete" && titles.complete
      };
    },
    async reveal(target, locationId, context) {
      const [compositionId, memberId] = parseLocation(locationId);
      const snapshot2 = await workbench.queries.query(
        "composition_get",
        {
          compositionId,
          memberId,
          view: "members",
          limit: 1,
          resolveResources: false
        },
        { signal: context.signal }
      );
      if (!snapshot2.items.some(
        (member2) => member2.id === memberId && member2.resource?.resourceId === target.resourceId
      ))
        throw new TaskResultNavigationError(
          snapshot2.coverage.status === "complete" && !snapshot2.nextCursor ? "missing" : "incomplete"
        );
      context.commit(() => {
        showStructure();
        const views = structureView(workbench);
        views.patch({ searchKind: "resources" });
        views.locate(
          { scopeKey: target.scopeKey, compositionId, memberId, resourceId: target.resourceId },
          snapshot2.revision
        );
      });
    }
  };
}

export function createEditorCommandDispatcher(options2) {
  let started = false;
  let disposed = false;
  let dirty = false;
  let running2 = false;
  let retry = 0;
  let timer2;
  let stop;
  const schedule2 = (ms) => {
    clearTimeout(timer2);
    timer2 = setTimeout(() => {
      timer2 = void 0;
      wake2();
    }, ms);
  };
  async function drain() {
    if (!started || disposed || running2 || !dirty || !options2.ready()) return;
    running2 = true;
    let failed = false;
    try {
      while (dirty && !disposed && options2.ready()) {
        dirty = false;
        await options2.receive();
        retry = 0;
      }
    } catch {
      dirty = true;
      failed = true;
      if (!disposed) schedule2(Math.min(1e4, 500 * 2 ** Math.min(retry++, 5)));
    } finally {
      running2 = false;
      if (!disposed && !failed && !options2.events) schedule2(750);
    }
  }
  function wake2() {
    dirty = true;
    if (timer2) {
      clearTimeout(timer2);
      timer2 = void 0;
    }
    void drain();
  }
  return {
    wake: wake2,
    start() {
      if (started || disposed) return;
      started = true;
      if (options2.events) {
        stop = options2.events.subscribe((capabilityId) => {
          if (!capabilityId || capabilityId === options2.capabilityId) wake2();
        });
      } else wake2();
    },
    dispose() {
      disposed = true;
      stop?.();
      clearTimeout(timer2);
    }
  };
}

export const fingerprint = (project2) => JSON.stringify(normalizeClipProject(project2) ?? null);

export const WRITES = /* @__PURE__ */ new Set(["project.edit", "project.history"]);

export const PREPARE_MS = 55e3;

export const record$2 = (v2) => !!v2 && typeof v2 === "object" && !Array.isArray(v2);

export function createClipAgent(transport, reveal, events2) {
  const generation = crypto.randomUUID();
  const controller = new AbortController();
  const listeners2 = /* @__PURE__ */ new Set();
  const ports = /* @__PURE__ */ new Map();
  const portWaiters = /* @__PURE__ */ new Set();
  let canvas;
  let open;
  let surfaceReady;
  let busy = false;
  let canvasRevision = 0;
  let stopCanvas;
  let pendingCompletion;
  let active2;
  let writeAttempted = false;
  const request = (body2) => transport(
    { op: "editor-request", request: { ...body2, connectionGeneration: generation } },
    { signal: controller.signal }
  );
  const dispatcher = createEditorCommandDispatcher({
    events: events2,
    capabilityId: CLIP_STUDIO_CAPABILITY_ID,
    ready: () => !busy || Boolean(pendingCompletion),
    receive
  });
  const setBusy = (value) => {
    busy = value;
    for (const listener of listeners2) listener();
    if (!value) dispatcher.wake();
  };
  const completePending = async () => {
    if (!pendingCompletion) return;
    await request(pendingCompletion);
    pendingCompletion = void 0;
    active2 = void 0;
    setBusy(false);
  };
  const complete = async (command2, data2) => {
    if (active2 !== command2) return;
    pendingCompletion ??= {
      action: "complete",
      commandId: command2.commandId,
      target: command2.target,
      data: data2
    };
    await completePending();
  };
  const until = (ready2, waiters, deadline) => new Promise((resolve, reject2) => {
    const finish2 = (error) => {
      clearTimeout(wait2);
      waiters.delete(check);
      controller.signal.removeEventListener("abort", aborted2);
      if (error) reject2(error);
      else resolve();
    };
    const check = () => {
      if (ready2()) finish2();
    };
    const aborted2 = () => finish2(new Error("EDITOR_CLOSED"));
    const wait2 = setTimeout(
      () => finish2(new Error("EDITOR_NOT_READY")),
      Math.max(0, deadline - Date.now())
    );
    controller.signal.addEventListener("abort", aborted2, { once: true });
    waiters.add(check);
    check();
  });
  const within = async (work, deadline) => {
    let settled = false;
    let value;
    let failure2;
    const waiters = /* @__PURE__ */ new Set();
    void work.then(
      (result) => {
        value = result;
        settled = true;
        for (const waiter of [...waiters]) waiter();
      },
      (error) => {
        failure2 = { error };
        settled = true;
        for (const waiter of [...waiters]) waiter();
      }
    );
    await until(() => settled, waiters, deadline);
    if (failure2) throw failure2.error;
    return value;
  };
  const surfaceWaiters = /* @__PURE__ */ new Set();
  surfaceReady = () => {
    for (const waiter of [...surfaceWaiters]) waiter();
  };
  const notifyPorts = () => {
    for (const waiter of [...portWaiters]) waiter();
  };
  const reloadCanvas = async (editor2, deadline) => {
    for (; ; ) {
      controller.signal.throwIfAborted();
      if (canvas !== editor2) throw new Error("EDITOR_CLOSED");
      const state2 = editor2.getSnapshot();
      if (state2.busy) {
        await within(editor2.flush(), deadline);
        continue;
      }
      if (state2.error) throw state2.error;
      await within(editor2.reload({ preserveHistory: true }), deadline);
      return;
    }
  };
  async function prepare(command2, deadline) {
    await within(reveal(), deadline);
    controller.signal.throwIfAborted();
    await until(() => Boolean(canvas && open), surfaceWaiters, deadline);
    const { sourceResourceId } = command2.target;
    const find2 = () => {
      const nodes = canvas?.getSnapshot().document.nodes ?? {};
      const named2 = command2.target.nodeId ? nodes[command2.target.nodeId] : void 0;
      return [named2, ...Object.values(nodes)].find(
        (node2) => node2?.kind === "clip-studio" && node2.sourceResourceId === sourceResourceId
      )?.id;
    };
    if (!find2() && canvas) await reloadCanvas(canvas, deadline);
    const nodeId = find2();
    if (!nodeId) throw new Error("TARGET_NOT_FOUND");
    if (!open?.(nodeId)) throw new Error("BUSY");
    await until(() => ports.has(nodeId), portWaiters, deadline);
    const port = ports.get(nodeId);
    if (!port) throw new Error("EDITOR_NOT_READY");
    return { nodeId, port };
  }
  async function run2(command2) {
    writeAttempted = false;
    try {
      const { nodeId, port } = await prepare(command2, Date.now() + PREPARE_MS);
      if (!(command2.method === "project.export" && command2.recoveryOnly)) await port.flush();
      controller.signal.throwIfAborted();
      const before = port.version().versionId;
      const write = WRITES.has(command2.method);
      if (write && command2.baseVersionId !== before) throw new Error("REVISION_CONFLICT");
      if (command2.method === "editor.prepare" || command2.method === "editor.reveal") {
        await complete(command2, { versionId: before, result: { status: "ready" } });
        return;
      }
      if (write) writeAttempted = true;
      const outcome = await port.invoke(command2.method, command2.args, controller.signal, {
        commandId: command2.commandId,
        ...command2.recoveryOnly ? { recoveryOnly: true } : {}
      });
      if (ports.get(nodeId) !== port) throw new Error("EDITOR_CLOSED");
      if (write) await port.flush();
      const after = write ? port.version().versionId : before;
      await complete(command2, {
        versionId: after,
        ...outcome.result ? { result: outcome.result } : {},
        ...outcome.images?.length ? { images: outcome.images } : {},
        ...outcome.asset ? { asset: outcome.asset } : {}
      });
    } catch (error) {
      await complete(command2, {
        error: error instanceof Error ? error.message : "EDITOR_FAILED",
        writeAttempted
      });
    }
  }
  async function receive() {
    if (controller.signal.aborted) return;
    if (pendingCompletion) {
      await completePending();
    }
    if (busy) return;
    const response = await request({
      action: events2 ? "claim" : "poll",
      capabilityIds: [CLIP_STUDIO_CAPABILITY_ID]
    });
    if (!record$2(response)) return;
    if (!record$2(response.pending)) {
      if (typeof response.canvasRevision === "number")
        canvasRevision = Math.max(canvasRevision, response.canvasRevision);
      const state2 = canvas?.getSnapshot();
      if (state2 && !state2.busy && !state2.error && canvasRevision > state2.document.revision)
        await canvas?.reload({ preserveHistory: true });
      return;
    }
    const raw2 = response.pending;
    if (raw2.capabilityId !== CLIP_STUDIO_CAPABILITY_ID) return;
    if (typeof raw2.commandId !== "string" || typeof raw2.method !== "string" || !record$2(raw2.target) || typeof raw2.target.sourceResourceId !== "string" || !record$2(raw2.args)) {
      if (typeof raw2.commandId === "string" && record$2(raw2.target))
        await request({
          action: "complete",
          commandId: raw2.commandId,
          target: raw2.target,
          data: { error: "INVALID_EDITOR_COMMAND" }
        });
      return;
    }
    active2 = {
      commandId: raw2.commandId,
      ...raw2.recoveryOnly === true ? { recoveryOnly: true } : {},
      method: raw2.method,
      target: {
        sourceResourceId: raw2.target.sourceResourceId,
        ...typeof raw2.target.nodeId === "string" ? { nodeId: raw2.target.nodeId } : {},
        ...typeof raw2.target.canvasId === "string" ? { canvasId: raw2.target.canvasId } : {}
      },
      args: raw2.args,
      ...typeof raw2.baseVersionId === "string" ? { baseVersionId: raw2.baseVersionId } : {}
    };
    setBusy(true);
    await run2(active2);
  }
  return {
    subscribe(listener) {
      listeners2.add(listener);
      return () => {
        listeners2.delete(listener);
      };
    },
    getBusy: () => busy,
    start() {
      dispatcher.start();
    },
    registerCanvas(editor2) {
      canvas = editor2;
      stopCanvas?.();
      stopCanvas = editor2.subscribe?.(() => {
        const state2 = editor2.getSnapshot();
        if (!state2.busy && !state2.error && canvasRevision > state2.document.revision)
          dispatcher.wake();
      });
      if (canvasRevision && canvasRevision > editor2.getSnapshot().document.revision)
        dispatcher.wake();
      surfaceReady?.();
      return () => {
        if (canvas === editor2) {
          stopCanvas?.();
          stopCanvas = void 0;
          canvas = void 0;
        }
      };
    },
    registerOpener(handler) {
      open = handler;
      surfaceReady?.();
      return () => {
        if (open === handler) open = void 0;
      };
    },
    /**
     * Bind an editor to its `.clip` source. A node created on the Canvas has no source yet:
     * the Gateway provisions it (Composition, source, binding) seeded by the node id.
     */
    async attach(sourceResourceId, nodeId) {
      if (!sourceResourceId) {
        sourceResourceId = parseClipSnapshot(
          await request({ action: "provision", target: { nodeId } })
        ).sourceResourceId;
        if (canvas) await reloadCanvas(canvas, Date.now() + PREPARE_MS);
      }
      const target = { sourceResourceId, nodeId };
      let snapshot2 = parseClipSnapshot(await request({ action: "open", target }));
      let saved = fingerprint(snapshot2.project);
      let tail = Promise.resolve();
      let unresolved;
      let abandoned = false;
      let saving = 0;
      let dirty = false;
      const status = () => session.onStatus?.(saving ? "saving" : dirty || unresolved ? "dirty" : "clean");
      const deliver = async () => {
        if (!unresolved) return;
        snapshot2 = parseClipSnapshot(await request(unresolved));
        saved = fingerprint(snapshot2.project);
        unresolved = void 0;
      };
      const session = {
        get snapshot() {
          return snapshot2;
        },
        noteDraft() {
          dirty = true;
          status();
        },
        abandon() {
          abandoned = true;
        },
        save(project2) {
          if (abandoned) return Promise.reject(new Error("DRAFT_DISCARDED"));
          const next2 = parseClipProject(project2);
          saving++;
          dirty = false;
          status();
          const write = tail.then(async () => {
            if (abandoned) throw new Error("DRAFT_DISCARDED");
            await deliver();
            if (abandoned) throw new Error("DRAFT_DISCARDED");
            if (fingerprint(next2) === saved) return;
            unresolved = {
              action: "save",
              commandId: crypto.randomUUID(),
              target,
              expectedDraftRevision: snapshot2.draftRevision,
              baseVersionId: snapshot2.versionId,
              data: { project: next2 }
            };
            await deliver();
          });
          tail = write.catch(() => {
          });
          return write.then(
            () => {
              saving--;
              status();
            },
            (error) => {
              saving--;
              session.onStatus?.("failed");
              throw error;
            }
          );
        }
      };
      return session;
    },
    /** Bind the loaded engine of one node; a later binding for the same node replaces it. */
    register(nodeId, port) {
      ports.set(nodeId, port);
      notifyPorts();
      return () => {
        if (ports.get(nodeId) === port) ports.delete(nodeId);
      };
    },
    dispose() {
      const command2 = active2;
      if (command2)
        void transport({
          op: "editor-request",
          request: {
            action: "complete",
            connectionGeneration: generation,
            commandId: command2.commandId,
            target: command2.target,
            data: pendingCompletion?.data ?? { error: "EDITOR_CLOSED", writeAttempted }
          }
        }).catch(() => {
        });
      active2 = void 0;
      canvas = void 0;
      open = void 0;
      surfaceReady = void 0;
      controller.abort();
      dispatcher.dispose();
      stopCanvas?.();
      ports.clear();
      portWaiters.clear();
      surfaceWaiters.clear();
      listeners2.clear();
    }
  };
}

export function createDirectorAgent(transport, reveal, events2) {
  const generation = crypto.randomUUID();
  const controller = new AbortController();
  const listeners2 = /* @__PURE__ */ new Set();
  let busy = false;
  let executing = false;
  let canvasRevision = 0;
  let stopCanvas;
  let pendingCompletion;
  let canvas;
  let ready2;
  let open;
  const ports = /* @__PURE__ */ new Map();
  let writeAttempted = false;
  let activeCommand;
  const request = (body2) => transport(
    { op: "editor-request", request: { ...body2, connectionGeneration: generation } },
    { signal: controller.signal }
  );
  const dispatcher = createEditorCommandDispatcher({
    events: events2,
    capabilityId: "plugin:director-stage",
    ready: () => !executing && (!busy || Boolean(pendingCompletion)),
    receive
  });
  const setBusy = (value) => {
    busy = value;
    for (const listener of listeners2) listener();
    if (!value) dispatcher.wake();
  };
  let prepareTimer;
  async function receive() {
    try {
      if (controller.signal.aborted) return;
      if (pendingCompletion) {
        await completePending();
      }
      if (busy) return;
      const response = await request({
        action: events2 ? "claim" : "poll",
        capabilityIds: ["plugin:director-stage"]
      });
      if (!record$1(response)) return;
      if (!record$1(response.pending)) {
        if (typeof response.canvasRevision === "number")
          canvasRevision = Math.max(canvasRevision, response.canvasRevision);
        const state2 = canvas?.getSnapshot();
        if (state2 && !state2.busy && !state2.error && canvasRevision > state2.document.revision)
          await canvas?.reload({ preserveHistory: true });
        return;
      }
      const raw2 = response.pending;
      if (typeof raw2.commandId !== "string" || typeof raw2.method !== "string" || typeof raw2.contractVersion !== "string" || !record$1(raw2.target) || typeof raw2.target.sourceResourceId !== "string" || !record$1(raw2.args))
        throw new Error("INVALID_EDITOR_COMMAND");
      const target = {
        sourceResourceId: raw2.target.sourceResourceId,
        ...typeof raw2.target.nodeId === "string" ? { nodeId: raw2.target.nodeId } : {}
      };
      activeCommand = {
        commandId: raw2.commandId,
        method: raw2.method,
        contractVersion: raw2.contractVersion,
        target,
        args: raw2.args,
        ...typeof raw2.expectedDraftRevision === "number" ? { expectedDraftRevision: raw2.expectedDraftRevision } : {},
        ...typeof raw2.baseVersionId === "string" ? { baseVersionId: raw2.baseVersionId } : {}
      };
      writeAttempted = false;
      setBusy(true);
      const command2 = activeCommand;
      let rejectPreparation = () => {
      };
      const deadline = new Promise((_2, reject2) => {
        rejectPreparation = reject2;
      });
      prepareTimer = setTimeout(() => {
        rejectPreparation(new Error("EDITOR_NOT_READY"));
        void complete(command2, { error: "EDITOR_NOT_READY" }).catch(() => {
        });
        ready2?.();
      }, 55e3);
      await Promise.race([reveal(), deadline]);
      controller.signal.throwIfAborted();
      if (!canvas || !open)
        await Promise.race([
          new Promise((resolve) => {
            ready2 = resolve;
          }),
          deadline
        ]);
      if (activeCommand !== command2 || !canvas || !open) return;
      const existing2 = Object.values(canvas.getSnapshot().document.nodes).some(
        (n2) => n2.kind === "director-stage" && n2.sourceResourceId === target.sourceResourceId
      );
      if (!existing2) await Promise.race([canvas.reload({ preserveHistory: true }), deadline]);
      if (activeCommand !== command2) return;
      const node2 = target.nodeId ? canvas.getSnapshot().document.nodes[target.nodeId] : Object.values(canvas.getSnapshot().document.nodes).find(
        (n2) => n2.kind === "director-stage" && n2.sourceResourceId === target.sourceResourceId
      );
      if (node2?.kind !== "director-stage" || node2.sourceResourceId !== target.sourceResourceId || !open?.(node2.id))
        throw new Error("EDITOR_NOT_READY");
      const run2 = ports.get(target.sourceResourceId);
      if (run2) await run2();
    } catch (error) {
      if (activeCommand)
        await complete(activeCommand, {
          error: error instanceof Error ? error.message : "EDITOR_NOT_READY"
        });
      else throw error;
    }
  }
  let completing;
  function completePending() {
    if (completing) return completing;
    if (!pendingCompletion) return Promise.resolve();
    completing = request(pendingCompletion).then(() => {
      pendingCompletion = void 0;
      activeCommand = void 0;
      setBusy(false);
    }).finally(() => {
      completing = void 0;
    });
    return completing;
  }
  async function complete(command2, data2) {
    if (activeCommand !== command2) return;
    if (prepareTimer) clearTimeout(prepareTimer);
    pendingCompletion ??= {
      action: "complete",
      target: command2.target,
      commandId: command2.commandId,
      data: data2
    };
    try {
      await completePending();
    } catch (error) {
      dispatcher.wake();
      throw error;
    }
  }
  return {
    request,
    subscribe: (listener) => {
      listeners2.add(listener);
      return () => {
        listeners2.delete(listener);
      };
    },
    getBusy: () => busy,
    start: () => {
      dispatcher.start();
    },
    registerCanvas: (editor2) => {
      canvas = editor2;
      stopCanvas?.();
      stopCanvas = editor2.subscribe?.(() => {
        const state2 = editor2.getSnapshot();
        if (!state2.busy && !state2.error && canvasRevision > state2.document.revision)
          dispatcher.wake();
      });
      if (canvasRevision && canvasRevision > editor2.getSnapshot().document.revision)
        dispatcher.wake();
      if (open) ready2?.();
      return () => {
        if (canvas === editor2) {
          stopCanvas?.();
          stopCanvas = void 0;
          canvas = void 0;
        }
      };
    },
    registerOpener: (handler) => {
      open = handler;
      if (canvas) ready2?.();
      return () => {
        if (open === handler) open = void 0;
      };
    },
    async attach(sourceResourceId, nodeId, persist2) {
      if (!sourceResourceId) {
        sourceResourceId = parseDirectorSnapshot(
          await request({ action: "provision", target: { nodeId } })
        ).sourceResourceId;
        await canvas?.reload({ preserveHistory: true });
      }
      const target = { sourceResourceId, nodeId };
      let snapshot2 = parseDirectorSnapshot(await request({ action: "open", target }));
      let commandId;
      let tail = Promise.resolve();
      let unresolved;
      const deliver = async () => {
        if (!unresolved) return;
        snapshot2 = parseDirectorSnapshot(await request(unresolved));
        unresolved = void 0;
      };
      let abandoned = false;
      let dirtyScene;
      let saveCount = 0;
      let onStatus;
      const save = (scene) => {
        if (abandoned) return Promise.reject(new Error("DRAFT_DISCARDED"));
        const next2 = persist2(scene);
        saveCount++;
        onStatus?.("saving");
        const id2 = commandId ?? crypto.randomUUID();
        const write = tail.then(async () => {
          if (abandoned) throw new Error("DRAFT_DISCARDED");
          await deliver();
          if (abandoned) throw new Error("DRAFT_DISCARDED");
          if (JSON.stringify(next2) === JSON.stringify(snapshot2.scene)) return;
          unresolved = {
            action: "save",
            commandId: id2,
            target,
            expectedDraftRevision: snapshot2.draftRevision,
            baseVersionId: snapshot2.versionId,
            data: { scene: next2 }
          };
          await deliver();
        });
        tail = write.catch(() => {
        });
        return write.then(
          () => {
            saveCount--;
            onStatus?.(
              saveCount ? "saving" : dirtyScene && dirtyScene !== JSON.stringify(snapshot2.scene) ? "dirty" : "clean"
            );
          },
          (error) => {
            saveCount--;
            onStatus?.("failed");
            throw error;
          }
        );
      };
      return {
        noteDraft(scene) {
          dirtyScene = JSON.stringify(persist2(scene));
          onStatus?.(
            !saveCount && !unresolved && dirtyScene === JSON.stringify(snapshot2.scene) ? "clean" : "dirty"
          );
        },
        abandon() {
          abandoned = true;
        },
        get onStatus() {
          return onStatus;
        },
        set onStatus(callback) {
          onStatus = callback;
        },
        get snapshot() {
          return snapshot2;
        },
        save,
        register(port) {
          let running2 = false;
          const run2 = async () => {
            if (running2 || activeCommand?.target?.sourceResourceId !== sourceResourceId) return;
            running2 = true;
            executing = true;
            const command2 = activeCommand;
            if (prepareTimer) clearTimeout(prepareTimer);
            try {
              await port.run(async (api) => {
                await api.flush();
                controller.signal.throwIfAborted();
                if ((command2.method === "video.export" || command2.method === "scene.animate" || command2.method === "scene.create" || command2.method === "scene.edit" || command2.method === "scene.undo") && (command2.baseVersionId !== snapshot2.versionId || command2.expectedDraftRevision !== snapshot2.draftRevision))
                  throw new Error("REVISION_CONFLICT");
                commandId = command2.commandId;
                if (command2.method === "scene.animate" || command2.method === "scene.create" || command2.method === "scene.edit") {
                  const edited = (command2.method === "scene.animate" ? animateDirectorScene : command2.method === "scene.create" ? createDirectorObjects : editDirectorScene)(JSON.parse(JSON.stringify(api.read())), command2.args);
                  if (command2.method === "scene.animate") {
                    if (!api.validateAnimation) throw new Error("METHOD_UNAVAILABLE");
                    await api.validateAnimation(edited);
                  }
                  writeAttempted = true;
                  await api.replace(edited);
                } else if (command2.method === "video.export") {
                  if (!api.exportVideo) throw new Error("METHOD_UNAVAILABLE");
                  const ratio = command2.args?.aspectRatio ?? "16:9";
                  const video = await api.exportVideo({
                    fps: command2.args?.fps === 24 ? 24 : 30,
                    aspectRatio: ratio === "9:16" ? 9 / 16 : ratio === "1:1" ? 1 : 16 / 9,
                    signal: controller.signal
                  });
                  controller.signal.throwIfAborted();
                  const receipt = await transport(
                    {
                      op: "editor-video",
                      file: video.blob,
                      request: {
                        action: "complete",
                        commandId: command2.commandId,
                        target: command2.target,
                        connectionGeneration: generation,
                        baseVersionId: snapshot2.versionId,
                        expectedDraftRevision: snapshot2.draftRevision,
                        data: { name: command2.args?.name }
                      }
                    },
                    { signal: controller.signal }
                  );
                  if (!record$1(receipt) || receipt.commandId !== command2.commandId || receipt.status !== "completed" || !record$1(receipt.asset) || typeof receipt.asset.resourceId !== "string" || typeof receipt.asset.versionId !== "string")
                    throw new Error("INVALID_VIDEO_RECEIPT");
                  if (activeCommand === command2) {
                    activeCommand = void 0;
                    setBusy(false);
                  }
                  return;
                } else if (command2.method === "scene.undo") {
                  writeAttempted = true;
                  await api.undo();
                } else if (command2.method === "scene.snapshot") {
                  if (typeof command2.args?.cameraId !== "string") throw new Error("INVALID_CAMERA");
                  const image2 = await api.snapshot(command2.args.cameraId);
                  await complete(command2, {
                    image: image2,
                    versionId: snapshot2.versionId,
                    draftRevision: snapshot2.draftRevision
                  });
                  return;
                } else if (!["editor.prepare", "editor.reveal"].includes(command2.method))
                  throw new Error("METHOD_UNAVAILABLE");
                await complete(command2, {
                  status: "ready",
                  versionId: snapshot2.versionId,
                  draftRevision: snapshot2.draftRevision
                });
              });
            } catch (error) {
              await complete(command2, {
                error: error instanceof Error ? error.message : "EDITOR_FAILED",
                writeAttempted
              });
            } finally {
              commandId = void 0;
              running2 = false;
              executing = false;
              dispatcher.wake();
            }
          };
          ports.set(sourceResourceId, run2);
          queueMicrotask(() => {
            void run2().catch(() => dispatcher.wake());
          });
          return () => {
            if (ports.get(sourceResourceId) === run2) ports.delete(sourceResourceId);
          };
        }
      };
    },
    dispose() {
      if (activeCommand) {
        void transport({
          op: "editor-request",
          request: {
            action: "complete",
            connectionGeneration: generation,
            commandId: activeCommand.commandId,
            target: activeCommand.target,
            data: pendingCompletion?.data ?? { error: "EDITOR_CLOSED", writeAttempted }
          }
        }).catch(() => {
        });
      }
      activeCommand = void 0;
      canvas = void 0;
      open = void 0;
      controller.abort();
      ready2?.();
      if (prepareTimer) clearTimeout(prepareTimer);
      dispatcher.dispose();
      stopCanvas?.();
      ports.clear();
      listeners2.clear();
    }
  };
}

export const WorkspaceResourceSurfaceContext = reactExports.createContext("canvas");

export function WorkspaceResultNavigationProvider({
  children: children2,
  enabled,
  surface = "canvas",
  onReveal
}) {
  const runtime = useOptionalWorkspaceStructure();
  const workbench = runtime?.workbench;
  const editorEvents = useWorkbenchEditorEvents(workbench?.host.scopeKey);
  const latest2 = reactExports.useRef(onReveal);
  const canvasEditor = reactExports.useRef(void 0);
  reactExports.useLayoutEffect(() => {
    latest2.current = onReveal;
  });
  const resourcesOpen = usesWorkspaceResourceView(runtime?.workspaceId);
  const [directorAgent, setDirectorAgent] = reactExports.useState();
  const [clipAgent, setClipAgent] = reactExports.useState();
  reactExports.useLayoutEffect(() => {
    if (!workbench?.host.resource || resourcesOpen) {
      setDirectorAgent(void 0);
      setClipAgent(void 0);
      return;
    }
    const transport = createDirectorTransport(workbench.host.resource.request);
    const reveal = async () => {
      latest2.current("canvas");
    };
    const agent2 = createDirectorAgent(transport, reveal, editorEvents);
    const clip2 = createClipAgent(transport, reveal, editorEvents);
    setDirectorAgent(agent2);
    setClipAgent(clip2);
    agent2.start();
    clip2.start();
    return () => {
      agent2.dispose();
      clip2.dispose();
    };
  }, [workbench, resourcesOpen, editorEvents]);
  const value = reactExports.useMemo(
    () => workbench ? {
      workbench,
      directorAgent,
      clipAgent,
      getCanvasEditor: () => canvasEditor.current,
      bindCanvasEditor(editor2) {
        canvasEditor.current = editor2;
        const unregister = directorAgent?.registerCanvas(editor2);
        const unregisterClip = clipAgent?.registerCanvas(editor2);
        return () => {
          unregister?.();
          unregisterClip?.();
          if (canvasEditor.current === editor2) canvasEditor.current = void 0;
        };
      },
      revealSurface: (surface2) => latest2.current(surface2)
    } : null,
    [workbench, directorAgent, clipAgent]
  );
  reactExports.useLayoutEffect(() => {
    if (!enabled || !value?.workbench.queries.available) return;
    return taskResultNavigation(value.workbench).register(
      "structure",
      createStructureResultNavigation(value.workbench, () => value.revealSurface("structure"))
    );
  }, [enabled, value]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceResultNavigationContext.Provider, { value, children: /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceResourceSurfaceContext.Provider, { value: surface, children: children2 }) });
}

/**
 * 结果导航的布局层（第 314 轮，整份取回自参照 index-BBp4hclA.js:21335701，21 行）。
 *
 * 参照把它包在画布视口外面，`enabled` 在画布屏为真，于是画布路径也会订阅
 * editor 事件 —— 这就是 ws-a-v3 那 2 帧 editor_subscribe 的来源。
 * 我们之前缺这层，所以只有资源视图会发。
 */
export function WorkspaceResultNavigationLayout({
  enabled,
  listActive,
  setBrowserOpen,
  dispatchStage,
  onModeChange,
  children: children2,
}) {
  return jsxRuntimeExports.jsx(WorkspaceResultNavigationProvider, {
    enabled,
    surface: listActive ? "structure" : "canvas",
    onReveal: (surface) => {
      setBrowserOpen(false);
      dispatchStage({ type: "canvas/open" });
      onModeChange(surface === "canvas" ? "canvas" : "list");
    },
    children: children2,
  });
}
