/**
 * v3 画布的 frame 服务层 —— 从产物取回（第 114 轮）。
 *
 * 14 个 `serveFrame*` / `createFramePersistenceHost` 实现，覆盖：
 * canvas / canvasHost / chat / chatSession / documents / editorEvents /
 * generation / media / pageStorage / resourceActions / resourceImageReveal /
 * sidebarOrder / taskEvents / persistenceHost
 *
 * **本文件尚未接线，且自身还有 162 个块外依赖**（各服务的 `*_LIMIT` / `*_TIMEOUT_MS`
 * 常量、`CANVAS_*` 路由、`HostFailure` 等）。这些常量分散在产物各处，
 * 需要按「常量块」继续收拢。见 docs/4.0.0-restore-plan.md。
 *
 * 只搬实现，未改语义。
 */
import { API_PATHS } from "../infra/workspace-gateway.js";

const CLIP_STUDIO_CAPABILITY_ID = "plugin:clip-studio";

function serveFrameCanvas(port, request, capabilities, onFailure) {
  const allowed = Object.freeze({
    canvas: capabilities.canvas === true,
    canvasImages: capabilities.canvasImages === true,
    canvasImageImport: capabilities.canvasImageImport === true,
    canvasMediaProbe: capabilities.canvasMediaProbe === true,
    canvasReads: capabilities.canvasReads === true,
    director: capabilities.director === true
  });
  const active2 = /* @__PURE__ */ new Map();
  let imageReads = 0;
  let imageImports = 0;
  const director = createDirectorTransport(request);
  const importImage = createCanvasImageImporter(request);
  let disposed = false;
  function reply(message2) {
    if (disposed) return;
    if (message2.type === "canvas-failure") onFailure(message2.code);
    try {
      port.postMessage(message2, message2.type === "canvas-image-response" ? [message2.body] : []);
    } catch {
    }
  }
  async function execute(message2) {
    const image2 = message2.type === "canvas-image-request" || message2.type === "director-request" && message2.input.op === "asset-read";
    const importing = message2.type === "canvas-image-import" || message2.type === "director-request" && (message2.input.op === "asset-upload" || message2.input.op === "asset-upload-bundle" || message2.input.op === "editor-video");
    if (active2.has(message2.id) || active2.size >= MAX_IN_FLIGHT$9 || image2 && imageReads >= MAX_IMAGE_READS || importing && imageImports >= MAX_IMAGE_IMPORTS) {
      reply({ type: "canvas-failure", id: message2.id, code: "CANVAS_FRAME_BUSY" });
      return;
    }
    const controller = new AbortController();
    active2.set(message2.id, controller);
    if (image2) imageReads++;
    if (importing) imageImports++;
    const timer2 = setTimeout(() => controller.abort("timeout"), REQUEST_TIMEOUT_MS$2);
    const stopTimer = () => clearTimeout(timer2);
    controller.signal.addEventListener("abort", stopTimer, { once: true });
    try {
      if (message2.type === "director-request") {
        const result = await director(message2.input, { signal: controller.signal });
        controller.signal.throwIfAborted();
        reply({ type: "director-response", id: message2.id, result });
      } else if (message2.type === "canvas-image-import") {
        const { file } = message2.input;
        const local = new Blob([await file.arrayBuffer()], { type: file.type });
        controller.signal.throwIfAborted();
        const result = await importImage(
          { ...message2.input, file: local },
          { signal: controller.signal }
        );
        controller.signal.throwIfAborted();
        reply({ type: "canvas-image-import-response", id: message2.id, result });
      } else if (message2.type === "canvas-media-probe") {
        const base2 = message2.kind === "video" ? CANVAS_V3_ROUTES.videos : CANVAS_V3_ROUTES.images;
        const response = await request(
          `${base2}/${encodeURIComponent(message2.resourceId)}/${encodeURIComponent(message2.versionId)}`,
          { method: "HEAD", signal: controller.signal }
        );
        controller.signal.throwIfAborted();
        const contentType = response.headers.get("Content-Type");
        reply({
          type: "canvas-media-probe-response",
          id: message2.id,
          ok: response.ok,
          status: response.status,
          ...contentType ? { contentType } : {}
        });
      } else if (message2.type === "canvas-image-request") {
        const result = await readCanvasImageBytes(
          request,
          message2.resourceId,
          message2.versionId,
          controller.signal
        );
        controller.signal.throwIfAborted();
        reply({ type: "canvas-image-response", id: message2.id, ...result });
      } else {
        const response = await request(...canvasHttpRequest(message2, controller.signal));
        const bytes2 = await readBoundedBody(
          response,
          PROJECT_RESOURCE_FRAME_RESPONSE_LIMIT,
          controller.signal
        );
        controller.signal.throwIfAborted();
        reply({
          type: "canvas-response",
          id: message2.id,
          status: response.status,
          body: new TextDecoder().decode(bytes2)
        });
      }
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason !== "timeout") return;
      const status = error && typeof error === "object" && "status" in error ? error.status : void 0;
      const code2 = controller.signal.reason === "timeout" ? "CANVAS_FRAME_REQUEST_TIMEOUT" : isCanvasFrameDetached(error) ? CANVAS_FRAME_DETACHED : error instanceof Error && [
        "CANVAS_RESPONSE_TOO_LARGE",
        "CANVAS_IMAGE_EMPTY",
        "CANVAS_IMAGE_UNAVAILABLE"
      ].includes(error.message) ? error.message : "CANVAS_FRAME_REQUEST_FAILED";
      reply({
        type: "canvas-failure",
        id: message2.id,
        code: code2,
        ...typeof status === "number" && Number.isInteger(status) && status >= 400 && status <= 599 ? { status } : {}
      });
    } finally {
      clearTimeout(timer2);
      controller.signal.removeEventListener("abort", stopTimer);
      active2.delete(message2.id);
      if (image2) imageReads--;
      if (importing) imageImports--;
    }
  }
  function listener({ data: data2 }) {
    if (disposed || !data2 || typeof data2 !== "object" || !("type" in data2)) return;
    if (data2.type === "canvas-cancel") {
      if ("id" in data2 && typeof data2.id === "string") active2.get(data2.id)?.abort("cancelled");
      return;
    }
    if (typeof data2.type !== "string" || ![
      "canvas-request",
      "canvas-image-request",
      "canvas-image-import",
      "canvas-media-probe",
      "director-request"
    ].includes(data2.type))
      return;
    if (!isCanvasFrameRequest(data2, allowed)) {
      if ("id" in data2 && typeof data2.id === "string" && data2.id.length > 0 && data2.id.length <= 128)
        reply({ type: "canvas-failure", id: data2.id, code: "CANVAS_FRAME_REQUEST_REJECTED" });
      return;
    }
    void execute(data2);
  }
  port.addEventListener("message", listener);
  return () => {
    disposed = true;
    port.removeEventListener("message", listener);
    for (const controller of active2.values()) controller.abort("disposed");
    active2.clear();
  };
}

function serveFrameCanvasHost(port, capabilities, bindings, onFailure) {
  const allowed = freezeGrants(capabilities);
  const { request } = bindings;
  const importMedia = createCanvasMediaImporter(request);
  const active2 = /* @__PURE__ */ new Map();
  const importing = /* @__PURE__ */ new Set();
  let uploads = 0;
  let disposed = false;
  function reply(message2) {
    if (disposed) return;
    if (message2.type === "canvas-host-failure") onFailure(message2.code);
    try {
      const transfer = message2.type === "canvas-host-response" && (message2.result.kind === "poster" || message2.result.kind === "waveform") ? [message2.result.body] : [];
      port.postMessage(message2, transfer);
    } catch {
    }
  }
  async function run2(message2, signal) {
    switch (message2.operation) {
      case "poster": {
        const response = await request(
          canvasPosterPath(message2.resourceId, message2.versionId, message2.width, message2.force),
          { method: "GET", signal }
        );
        const mimeType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
        if (response.status !== 200 || !mimeType || !/^image\/(jpeg|png|webp)$/.test(mimeType)) {
          await response.body?.cancel();
          throw new HostFailure(
            "CANVAS_POSTER_UNAVAILABLE",
            response.status >= 400 ? response.status : void 0
          );
        }
        const body2 = await readBoundedBody(response, CANVAS_POSTER_MAX_BYTES, signal);
        if (!body2.byteLength) throw new HostFailure("CANVAS_POSTER_UNAVAILABLE");
        const seconds2 = Number(response.headers.get("X-Video-Duration"));
        return {
          kind: "poster",
          mimeType,
          body: body2,
          ...Number.isFinite(seconds2) && seconds2 > 0 ? { duration: seconds2 } : {}
        };
      }
      case "audio-waveform":
        return {
          kind: "waveform",
          ...await readResourceAudioWaveformBytes(request, message2.resourceId, message2.versionId, {
            width: message2.width,
            signal
          })
        };
      case "media-import": {
        const { input } = message2;
        const file = await localCopy(input.file);
        signal.throwIfAborted();
        const media2 = await importMedia(
          {
            importId: input.importId,
            file,
            name: input.name,
            ...input.target ? { target: input.target } : {}
          },
          {
            signal
          }
        );
        if (media2.mediaKind !== input.kind) throw new HostFailure("CANVAS_MEDIA_IMPORT_MISMATCH");
        return { kind: "media", media: media2 };
      }
      case "text-models":
        return httpResult(
          await request(CANVAS_TEXT_ROUTES.models, { method: "GET", signal }),
          signal
        );
      case "text-generate":
        return httpResult(
          await request(CANVAS_TEXT_ROUTES.generate, {
            method: "POST",
            headers: { "Content-Type": "application/json", [HILO_SOURCE_HEADER]: "canvas" },
            body: message2.body,
            signal
          }),
          signal
        );
      case "tool-read":
        return httpResult(
          await request(canvasHostToolReadPath(message2), { method: "GET", signal }),
          signal
        );
      case "lut-import": {
        const body2 = new FormData();
        body2.append("file", await localCopy(message2.file), message2.name);
        signal.throwIfAborted();
        return httpResult(
          await request(HOST_LUT_ROUTES.import, { method: "POST", body: body2, signal }),
          signal
        );
      }
      case "lut-delete":
        return httpResult(
          await request(hostLutDeletePath(message2.name), { method: "DELETE", signal }),
          signal
        );
      case "native-export-begin":
      case "native-export-end": {
        const native = bindings.nativeFiles;
        if (!native?.beginExport || !native.endExport)
          throw new HostFailure("EXPORT_ACTIVITY_UNAVAILABLE");
        if (message2.operation === "native-export-begin") await native.beginExport(message2.exportId);
        else await native.endExport(message2.exportId);
        return { kind: "done" };
      }
      case "native-save-files":
      case "native-save-media":
      case "native-reveal-image":
      case "native-write-image": {
        const native = bindings.nativeFiles;
        if (!native) throw new HostFailure("NATIVE_FILES_UNAVAILABLE");
        if (message2.operation === "native-save-files")
          return {
            kind: "save-files",
            result: await native.saveFiles(message2.files, message2.options)
          };
        if (message2.operation === "native-save-media")
          return {
            kind: "save-media",
            result: await native.saveMedia(message2.request)
          };
        if (message2.operation === "native-reveal-image") await native.revealImage(message2.request);
        else await native.writeImageData(message2.png);
        return { kind: "done" };
      }
      case "preference-get":
      case "preference-set": {
        const preferences = bindings.preferences;
        if (!preferences) throw new HostFailure("PREFERENCES_UNAVAILABLE");
        if (message2.operation === "preference-set") {
          await preferences.set(message2.key, message2.value);
          return { kind: "done" };
        }
        const value = await preferences.get(message2.key);
        return {
          kind: "preference",
          value: typeof value === "string" ? value : null
        };
      }
    }
  }
  async function perform(message2) {
    const { id: id2 } = message2;
    const upload = message2.operation === "media-import" || message2.operation === "lut-import";
    const importId = message2.operation === "media-import" ? message2.input.importId.toLowerCase() : "";
    if (active2.has(id2) || active2.size >= MAX_IN_FLIGHT$8 || upload && uploads >= MAX_UPLOADS || importId && importing.has(importId)) {
      reply({ type: "canvas-host-failure", id: id2, code: "CANVAS_HOST_BUSY" });
      return;
    }
    const controller = new AbortController();
    active2.set(id2, controller);
    if (upload) uploads++;
    if (importId) importing.add(importId);
    try {
      const result = await run2(message2, controller.signal);
      controller.signal.throwIfAborted();
      reply({ type: "canvas-host-response", id: id2, result });
    } catch (error) {
      if (disposed || controller.signal.aborted) return;
      const status = error instanceof HostFailure ? error.status : errorStatus$2(error);
      const code2 = error instanceof HostFailure ? error.code : isCanvasFrameDetached(error) ? CANVAS_FRAME_DETACHED : error instanceof Error && error.message === "CANVAS_RESPONSE_TOO_LARGE" ? "CANVAS_HOST_RESPONSE_TOO_LARGE" : error instanceof Error && /^CANVAS_V3_IMPORT_[A-Z_]+$/.test(error.message) ? error.message.replace(/_HTTP_\d+$/, "_HTTP") : "CANVAS_HOST_REQUEST_FAILED";
      reply({ type: "canvas-host-failure", id: id2, code: code2, ...status ? { status } : {} });
    } finally {
      active2.delete(id2);
      if (upload) uploads--;
      if (importId) importing.delete(importId);
    }
  }
  function listener({ data: data2 }) {
    if (disposed || !data2 || typeof data2 !== "object" || !("type" in data2)) return;
    if (data2.type === "canvas-host-cancel") {
      if ("id" in data2 && typeof data2.id === "string") active2.get(data2.id)?.abort();
      return;
    }
    if (data2.type !== "canvas-host-request") return;
    if (!isCanvasHostFrameRequest(data2, allowed)) {
      if ("id" in data2 && typeof data2.id === "string" && data2.id.length > 0 && data2.id.length <= 128)
        reply({ type: "canvas-host-failure", id: data2.id, code: CANVAS_HOST_REQUEST_REJECTED });
      return;
    }
    void perform(data2);
  }
  port.addEventListener("message", listener);
  return () => {
    disposed = true;
    port.removeEventListener("message", listener);
    for (const controller of active2.values()) controller.abort();
    active2.clear();
  };
}

function serveFrameChat(port, capabilities, binding, onFailure) {
  const allowed = {
    chatComposer: capabilities.chatComposer === true && typeof binding.composer?.draft === "function" && typeof binding.composer.send === "function",
    textCompletion: capabilities.textCompletion === true && false
  };
  const active2 = /* @__PURE__ */ new Map();
  let disposed = false;
  function reply(message2) {
    if (disposed) return;
    if (message2.type === "chat-failure" || message2.type === "text-completion-failure")
      onFailure(message2.code);
    try {
      port.postMessage(message2);
    } catch {
    }
  }
  function begin(id2, timeoutMs) {
    if (disposed || active2.has(id2) || active2.size >= MAX_IN_FLIGHT$7) return;
    const controller = new AbortController();
    active2.set(id2, controller);
    const timer2 = setTimeout(() => controller.abort("timeout"), timeoutMs);
    controller.signal.addEventListener("abort", () => clearTimeout(timer2), { once: true });
    return controller;
  }
  async function executeChat(request) {
    const composer = binding.composer;
    const controller = composer && begin(request.id, CHAT_TIMEOUT_MS);
    if (!controller || !composer) {
      reply({ type: "chat-failure", id: request.id, code: "CHAT_FRAME_BUSY" });
      return;
    }
    try {
      const input = { text: request.text, resources: request.resources };
      if (request.type === "chat-send") {
        const result = await composer.send(input, {
          signal: controller.signal
        });
        controller.signal.throwIfAborted();
        const messageId = result?.messageId;
        const response = { type: "chat-send-response", id: request.id, messageId };
        if (!isChatFrameResponse(response)) throw new Error("invalid send result");
        reply(response);
      } else {
        await composer.draft(
          {
            ...input,
            ...request.compositions !== void 0 ? { compositions: request.compositions } : {}
          },
          { signal: controller.signal }
        );
        controller.signal.throwIfAborted();
        reply({ type: "chat-draft-response", id: request.id });
      }
    } catch {
      if (disposed || controller.signal.reason === "disposed") return;
      reply({
        type: "chat-failure",
        id: request.id,
        code: controller.signal.reason === "timeout" ? "CHAT_FRAME_REQUEST_TIMEOUT" : request.type === "chat-send" ? "CHAT_SEND_FAILED" : "CHAT_DRAFT_FAILED"
      });
    } finally {
      controller.abort("settled");
      active2.delete(request.id);
    }
  }
  async function executeCompletion(request) {
    {
      reply({ type: "text-completion-failure", id: request.id, code: "TEXT_COMPLETION_BUSY" });
      return;
    }
  }
  function listener({ data: data2 }) {
    if (disposed || !data2 || typeof data2 !== "object" || !("type" in data2)) return;
    if (data2.type === "chat-cancel" || data2.type === "text-completion-cancel") {
      if ("id" in data2 && typeof data2.id === "string") active2.get(data2.id)?.abort("cancelled");
      return;
    }
    if (data2.type === "chat-draft" || data2.type === "chat-send") {
      if (isChatFrameRequest(data2, allowed)) void executeChat(data2);
      else if ("id" in data2 && typeof data2.id === "string" && data2.id.length <= 128)
        reply({ type: "chat-failure", id: data2.id, code: "CHAT_FRAME_REJECTED" });
      return;
    }
    if (data2.type !== "text-completion") return;
    if (isTextCompletionFrameRequest(data2, allowed)) void executeCompletion(data2);
    else if ("id" in data2 && typeof data2.id === "string" && data2.id.length <= 128)
      reply({ type: "text-completion-failure", id: data2.id, code: "TEXT_COMPLETION_REJECTED" });
  }
  port.addEventListener("message", listener);
  return () => {
    disposed = true;
    port.removeEventListener("message", listener);
    for (const controller of active2.values()) controller.abort("disposed");
    active2.clear();
  };
}

function serveFrameChatSession(port, enabled, session, onFailure, timeoutMs = REQUEST_TIMEOUT_MS$1) {
  const allowed = enabled === true && !!session && typeof session.snapshot === "function" && typeof session.subscribe === "function" && typeof session.execute === "function";
  const active2 = /* @__PURE__ */ new Map();
  let subscription;
  let disposed = false;
  let richNegotiated = false;
  function reply(message2) {
    if (disposed) return;
    if (message2.type === "chat-session-failure") onFailure(message2.code);
    try {
      port.postMessage(message2);
    } catch {
    }
  }
  function finish2(id2, expected) {
    const item = active2.get(id2);
    if (!item || expected && item !== expected) return false;
    clearTimeout(item.timer);
    active2.delete(id2);
    return true;
  }
  function unsubscribe(id2) {
    if (!subscription || id2 !== void 0 && subscription.id !== id2) return;
    const previous2 = subscription;
    subscription = void 0;
    try {
      previous2.dispose();
    } catch {
    }
  }
  async function execute(request) {
    if (!session || !allowed) {
      reply({ type: "chat-session-failure", id: request.id, code: "CHAT_SESSION_UNAVAILABLE" });
      return;
    }
    if (request.projectionVersion === 2 && request.operation !== "snapshot" && !richNegotiated) {
      reply({ type: "chat-session-failure", id: request.id, code: "CHAT_SESSION_REJECTED" });
      return;
    }
    if (active2.has(request.id)) return;
    if (active2.size >= MAX_IN_FLIGHT$6 || request.operation === "subscribe" && subscription) {
      reply({ type: "chat-session-failure", id: request.id, code: "CHAT_SESSION_BUSY" });
      return;
    }
    const operation2 = {
      timer: setTimeout(() => {
        if (!finish2(request.id, operation2)) return;
        unsubscribe(request.id);
        reply({ type: "chat-session-failure", id: request.id, code: "CHAT_SESSION_TIMEOUT" });
      }, timeoutMs)
    };
    active2.set(request.id, operation2);
    try {
      if (request.operation === "execute") {
        await session.execute(request.command);
        if (finish2(request.id, operation2)) reply({ type: "chat-session-executed", id: request.id });
        return;
      }
      if (request.operation === "subscribe") {
        const current22 = { id: request.id, dispose: () => {
        } };
        subscription = current22;
        current22.dispose = session.subscribe((snapshot22) => {
          if (disposed || subscription !== current22) return;
          let projected;
          try {
            projected = projectSnapshot(snapshot22, request.projectionVersion);
          } catch (error) {
            reply({
              type: "chat-session-failure",
              id: current22.id,
              code: error === PROJECTION_UNSUPPORTED ? PROJECTION_UNSUPPORTED.message : "CHAT_SESSION_INVALID_SNAPSHOT"
            });
            return;
          }
          if (current22.latest && projected.revision <= current22.latest.revision) return;
          current22.latest = projected;
          reply({ type: "chat-session-changed", id: current22.id, snapshot: projected });
        });
      }
      const rawSnapshot = await session.snapshot();
      if (active2.get(request.id) !== operation2) return;
      const snapshot2 = projectSnapshot(rawSnapshot, request.projectionVersion);
      const current2 = subscription?.id === request.id ? subscription : void 0;
      const newest = current2?.latest && current2.latest.revision > snapshot2.revision ? current2.latest : snapshot2;
      if (current2) current2.latest = newest;
      if (finish2(request.id, operation2)) {
        if (request.operation === "snapshot" && request.projectionVersion === 2)
          richNegotiated = true;
        reply({ type: "chat-session-snapshot", id: request.id, snapshot: newest });
      }
    } catch (error) {
      if (!finish2(request.id, operation2)) return;
      unsubscribe(request.id);
      const code2 = error === PROJECTION_UNSUPPORTED ? PROJECTION_UNSUPPORTED.message : request.operation === "execute" && request.command.kind === "send" && error instanceof Error && PRE_SEND_REJECTION_CODES.has(error.message) ? error.message : "CHAT_SESSION_REQUEST_FAILED";
      reply({ type: "chat-session-failure", id: request.id, code: code2 });
    }
  }
  function listener({ data: data2 }) {
    if (disposed || !data2 || typeof data2 !== "object" || !("type" in data2) || typeof data2.type !== "string" || !data2.type.startsWith("chat-session-"))
      return;
    if (!isChatSessionFrameRequest(data2)) {
      if ("id" in data2 && isChatSessionFrameId(data2.id))
        reply({ type: "chat-session-failure", id: data2.id, code: "CHAT_SESSION_REJECTED" });
      return;
    }
    if (data2.type === "chat-session-cancel" || data2.type === "chat-session-unsubscribe") {
      finish2(data2.id);
      unsubscribe(data2.id);
      return;
    }
    if (data2.type === "chat-session-request") void execute(data2);
  }
  port.addEventListener("message", listener);
  return () => {
    if (disposed) return;
    disposed = true;
    port.removeEventListener("message", listener);
    unsubscribe();
    for (const id2 of active2.keys()) finish2(id2);
  };
}

function serveFrameDocuments(port, capabilities, request, onFailure) {
  const allowed = Object.freeze({
    documents: capabilities.documents === true,
    resourceTags: capabilities.resourceTags === true
  });
  const active2 = /* @__PURE__ */ new Map();
  let disposed = false;
  function reply(message2) {
    if (disposed) return;
    if (message2.type === "document-failure") onFailure(message2.code);
    try {
      port.postMessage(message2);
    } catch {
    }
  }
  async function perform(message2) {
    const { id: id2 } = message2;
    if (active2.has(id2) || active2.size >= MAX_IN_FLIGHT$5) {
      reply({ type: "document-failure", id: id2, code: "DOCUMENT_FRAME_BUSY" });
      return;
    }
    const controller = new AbortController();
    active2.set(id2, controller);
    try {
      const [path2, init2] = documentFrameHttp(message2);
      const response = await request(path2, {
        method: init2.method,
        ...init2.body === void 0 ? {} : { headers: { "Content-Type": "application/json" }, body: init2.body },
        signal: controller.signal
      });
      const body2 = await response.text();
      if (body2.length > DOCUMENT_FRAME_RESPONSE_LIMIT) {
        reply({ type: "document-failure", id: id2, code: "DOCUMENT_FRAME_RESPONSE_TOO_LARGE" });
        return;
      }
      reply({ type: "document-response", id: id2, status: response.status, body: body2 });
    } catch (error) {
      if (disposed || controller.signal.aborted) return;
      const status = errorStatus$1(error);
      reply({
        type: "document-failure",
        id: id2,
        code: "DOCUMENT_FRAME_REQUEST_FAILED",
        ...status ? { status } : {}
      });
    } finally {
      active2.delete(id2);
    }
  }
  function listener({ data: data2 }) {
    if (disposed || !data2 || typeof data2 !== "object" || !("type" in data2)) return;
    if (data2.type === "document-cancel") {
      if ("id" in data2 && typeof data2.id === "string") active2.get(data2.id)?.abort();
      return;
    }
    if (data2.type !== "document-request" && data2.type !== "resource-tags-request") return;
    if (!isDocumentFrameRequest(data2, allowed)) {
      if ("id" in data2 && typeof data2.id === "string" && data2.id.length <= 128)
        reply({ type: "document-failure", id: data2.id, code: DOCUMENT_FRAME_REQUEST_REJECTED });
      return;
    }
    void perform(data2);
  }
  port.addEventListener("message", listener);
  return () => {
    disposed = true;
    port.removeEventListener("message", listener);
    for (const controller of active2.values()) controller.abort();
    active2.clear();
  };
}

function serveFrameEditorEvents(port, binding) {
  let stop;
  let disposed = false;
  const listener = ({ data: data2 }) => {
    if (disposed || !binding || !data2 || typeof data2 !== "object" || !("type" in data2) || Object.keys(data2).length !== 1)
      return;
    if (data2.type === "editor-events-subscribe" && !stop) {
      stop = binding.source.subscribe((capabilityId) => {
        if (!disposed)
          port.postMessage({ type: "editor-event", scopeKey: binding.scopeKey, capabilityId });
      });
    } else if (data2.type === "editor-events-unsubscribe") {
      stop?.();
      stop = void 0;
    }
  };
  port.addEventListener("message", listener);
  return () => {
    disposed = true;
    stop?.();
    port.removeEventListener("message", listener);
  };
}

function serveFrameGeneration(port, capabilities, bindings, onFailure) {
  const allowed = Object.freeze({
    accountGuard: capabilities.accountGuard === true,
    billingPricing: capabilities.billingPricing === true
  });
  const active2 = /* @__PURE__ */ new Map();
  let disposed = false;
  function reply(message2) {
    if (disposed) return;
    if (message2.type === "generation-host-failure") onFailure(message2.code);
    try {
      port.postMessage(message2);
    } catch {
    }
  }
  async function guard(id2) {
    let allowed2 = false;
    try {
      allowed2 = await bindings.guardSubmission?.("canvas") === true;
    } catch {
      allowed2 = false;
    }
    reply({ type: "account-guard-response", id: id2, allowed: allowed2 });
  }
  async function pricing(id2) {
    if (active2.has(id2) || active2.size >= MAX_IN_FLIGHT$4) {
      reply({ type: "generation-host-failure", id: id2, code: "GENERATION_FRAME_BUSY" });
      return;
    }
    const controller = new AbortController();
    active2.set(id2, controller);
    try {
      const response = await bindings.request(HOST_BILLING_PRICING_PATH, {
        method: "GET",
        signal: controller.signal
      });
      const body2 = await response.text();
      if (body2.length > HOST_BILLING_PRICING_RESPONSE_LIMIT) {
        reply({ type: "generation-host-failure", id: id2, code: "BILLING_PRICING_TOO_LARGE" });
        return;
      }
      reply({ type: "billing-pricing-response", id: id2, status: response.status, body: body2 });
    } catch (error) {
      if (disposed || controller.signal.aborted) return;
      const status = errorStatus(error);
      reply({
        type: "generation-host-failure",
        id: id2,
        code: "BILLING_PRICING_FAILED",
        ...status ? { status } : {}
      });
    } finally {
      active2.delete(id2);
    }
  }
  function listener({ data: data2 }) {
    if (disposed || !data2 || typeof data2 !== "object" || !("type" in data2)) return;
    if (data2.type === "billing-pricing-cancel") {
      if ("id" in data2 && typeof data2.id === "string") active2.get(data2.id)?.abort();
      return;
    }
    if (data2.type !== "account-guard" && data2.type !== "billing-pricing") return;
    if (!isGenerationFrameRequest(data2, allowed)) {
      if (!("id" in data2) || typeof data2.id !== "string" || data2.id.length > 128) return;
      if (data2.type === "account-guard")
        reply({ type: "account-guard-response", id: data2.id, allowed: false });
      else reply({ type: "generation-host-failure", id: data2.id, code: "GENERATION_REJECTED" });
      return;
    }
    if (data2.type === "account-guard") void guard(data2.id);
    else void pricing(data2.id);
  }
  port.addEventListener("message", listener);
  return () => {
    disposed = true;
    port.removeEventListener("message", listener);
    for (const controller of active2.values()) controller.abort();
    active2.clear();
  };
}

function serveFrameMedia(port, grant) {
  const active2 = /* @__PURE__ */ new Map();
  let disposed = false;
  const cancelReservation = (reservation) => {
    void reservation?.cancel().catch(() => void 0);
  };
  function finish2(id2, cancel) {
    const entry = active2.get(id2);
    if (!entry) return;
    active2.delete(id2);
    clearTimeout(entry.timer);
    if (cancel) {
      entry.controller.abort();
      cancelReservation(entry.reservation);
    }
  }
  const listener = ({ data: data2 }) => {
    if (disposed || !data2 || typeof data2 !== "object") return;
    const m2 = data2;
    if (!["media-grant", "media-cancel", "media-accept"].includes(String(m2.type))) return;
    if (typeof m2.id !== "string" || !m2.id || m2.id.length > 128) return;
    const id2 = m2.id;
    if (m2.type !== "media-grant") {
      if (Object.keys(m2).some((key2) => !["type", "id"].includes(key2))) return;
      if (m2.type === "media-cancel") finish2(id2, true);
      else if (active2.get(id2)?.reservation) finish2(id2, false);
      return;
    }
    const reply = (value) => {
      if (disposed) return false;
      try {
        port.postMessage(
          value ? { type: "media-response", id: id2, grant: value } : { type: "media-failure", id: id2, code: "MEDIA_UNAVAILABLE" }
        );
        return true;
      } catch {
        return false;
      }
    };
    if (!grant || !isMediaFrameRequest(m2) || active2.has(id2) || active2.size >= MAX_PENDING) {
      reply();
      return;
    }
    const controller = new AbortController();
    const entry = {
      controller,
      timer: setTimeout(() => {
        if (active2.get(id2) !== entry) return;
        finish2(id2, true);
        reply();
      }, 15e3)
    };
    active2.set(id2, entry);
    void Promise.resolve().then(() => {
      controller.signal.throwIfAborted();
      return grant(m2.resourceId, m2.versionId, { signal: controller.signal });
    }).then((reservation) => {
      if (active2.get(id2) !== entry || controller.signal.aborted) {
        cancelReservation(reservation);
        return;
      }
      entry.reservation = reservation;
      if (!isHostMediaGrant(reservation.grant)) {
        finish2(id2, true);
        reply();
      } else if (!reply(reservation.grant)) finish2(id2, true);
    }).catch(() => {
      if (active2.get(id2) === entry) {
        finish2(id2, true);
        reply();
      }
    });
  };
  port.addEventListener("message", listener);
  return () => {
    disposed = true;
    port.removeEventListener("message", listener);
    for (const id2 of active2.keys()) finish2(id2, true);
  };
}

function serveFramePageStorage(port, capability, storage2, onFailure) {
  const granted = capability && storage2?.version === PAGE_STORAGE_PROTOCOL_VERSION;
  const active2 = /* @__PURE__ */ new Set();
  let disposed = false;
  function reply(message2) {
    if (disposed) return;
    if (message2.type === "page-storage-failure") onFailure(message2.code);
    try {
      port.postMessage(message2);
    } catch {
    }
  }
  async function execute(request) {
    if (!storage2) return;
    active2.add(request.id);
    const { id: id2 } = request;
    const namespace2 = request.namespace;
    try {
      switch (request.operation) {
        case "acquire":
          reply({ type: "page-storage-response", id: id2, state: await storage2.acquire(namespace2) });
          return;
        case "read":
          reply({ type: "page-storage-response", id: id2, state: await storage2.read(namespace2) });
          return;
        case "recover-quarantine":
          reply({
            type: "page-storage-response",
            id: id2,
            state: await storage2.recoverQuarantine(namespace2)
          });
          return;
        case "export-quarantine":
          reply({
            type: "page-storage-response",
            id: id2,
            raw: await storage2.exportQuarantine(namespace2)
          });
          return;
        case "write":
          reply({
            type: "page-storage-response",
            id: id2,
            commit: await storage2.write(namespace2, request.write)
          });
          return;
      }
    } catch (error) {
      reply({ type: "page-storage-failure", id: id2, code: pageStorageErrorCode(error) });
    } finally {
      active2.delete(id2);
    }
  }
  function listener({ data: data2 }) {
    if (disposed || !data2 || typeof data2 !== "object" || !("type" in data2)) return;
    if (data2.type !== "page-storage-request") return;
    const id2 = "id" in data2 && typeof data2.id === "string" && data2.id.length <= 128 ? data2.id : "";
    if (!isPageStorageFrameRequest(data2, granted)) {
      if (id2) reply({ type: "page-storage-failure", id: id2, code: "PAGE_STORAGE_REJECTED" });
      return;
    }
    if (active2.has(id2) || active2.size >= MAX_IN_FLIGHT$3) {
      reply({ type: "page-storage-failure", id: id2, code: "PAGE_STORAGE_UNAVAILABLE" });
      return;
    }
    void execute(data2);
  }
  port.addEventListener("message", listener);
  return () => {
    disposed = true;
    active2.clear();
    port.removeEventListener("message", listener);
  };
}

function createFramePersistenceHost(port, onSnapshot, timeoutMs = FLUSH_TIMEOUT_MS) {
  let snapshot2 = { revision: 0, state: "failed" };
  let received = false;
  let invalid2 = false;
  let closed = false;
  let sequence = 0;
  const pending2 = /* @__PURE__ */ new Map();
  function notify2() {
    try {
      onSnapshot(snapshot2);
      return true;
    } catch {
      invalid2 = true;
      snapshot2 = { ...snapshot2, state: "failed" };
      return false;
    }
  }
  function accept(next2) {
    if (invalid2 || received && next2.revision < snapshot2.revision) return false;
    if (received && next2.revision === snapshot2.revision && next2.state !== snapshot2.state) {
      invalid2 = true;
      snapshot2 = { ...snapshot2, state: "failed" };
      notify2();
      return false;
    }
    snapshot2 = Object.freeze({ ...next2 });
    received = true;
    return notify2();
  }
  function listener(event) {
    if (closed || !isProjectPersistenceMessage(event.data)) return;
    const message2 = event.data;
    if (message2.type === "persistence-state") accept(message2.snapshot);
    if (message2.type !== "persistence-flushed") return;
    const request = pending2.get(message2.id);
    if (!request) return;
    pending2.delete(message2.id);
    clearTimeout(request.timer);
    if (!accept(message2.snapshot)) request.reject(new Error("Persistence state changed"));
    else request.resolve(snapshot2);
  }
  port.addEventListener("message", listener);
  return {
    getSnapshot: () => snapshot2,
    flush() {
      if (closed || invalid2 || pending2.size >= MAX_FLUSH_REQUESTS)
        return Promise.reject(new Error("Persistence connection unavailable"));
      const id2 = `persistence:${++sequence}`;
      return new Promise((resolve, reject2) => {
        const timer2 = setTimeout(() => {
          pending2.delete(id2);
          reject2(new Error("Persistence confirmation timed out"));
        }, timeoutMs);
        pending2.set(id2, { resolve, reject: reject2, timer: timer2 });
        try {
          port.postMessage({ type: "persistence-flush", id: id2 });
        } catch {
          clearTimeout(timer2);
          pending2.delete(id2);
          reject2(new Error("Persistence connection unavailable"));
        }
      });
    },
    dispose() {
      if (closed) return;
      closed = true;
      port.removeEventListener("message", listener);
      for (const request of pending2.values()) {
        clearTimeout(request.timer);
        request.reject(new Error("Persistence connection retired"));
      }
      pending2.clear();
    }
  };
}

function serveFrameResourceActions(port, actions) {
  const active2 = /* @__PURE__ */ new Map();
  let disposed = false;
  const reply = (message2) => {
    if (disposed) return;
    try {
      port.postMessage(message2);
    } catch {
    }
  };
  const listener = ({ data: data2 }) => {
    if (disposed || !isResourceHostActionRequest(data2)) return;
    if (active2.has(data2.id)) return;
    if (active2.size >= 8) {
      reply({ type: "resource-host-action-failed", id: data2.id });
      return;
    }
    const controller = new AbortController();
    active2.set(data2.id, controller);
    const finish2 = (ok2) => {
      if (active2.get(data2.id) !== controller) return;
      active2.delete(data2.id);
      clearTimeout(timer2);
      reply({
        type: ok2 ? "resource-host-action-done" : "resource-host-action-failed",
        id: data2.id
      });
    };
    const timer2 = setTimeout(() => {
      controller.abort();
      finish2(false);
    }, 3e4);
    controller.signal.addEventListener("abort", () => finish2(false), { once: true });
    const execute = async () => {
      controller.signal.throwIfAborted();
      if (data2.operation === "copy-composition") {
        if (!actions.copyCompositionToClipboard) throw new Error("Unavailable");
        await actions.copyCompositionToClipboard(data2.compositionId, { signal: controller.signal });
      } else if (data2.operation === "draft-composition") {
        if (!actions.draftComposition) throw new Error("Unavailable");
        await actions.draftComposition(data2.compositionId, { signal: controller.signal });
      } else {
        const action2 = data2.operation === "reveal" ? actions.revealResource : actions.copyResourceToClipboard;
        if (!action2) throw new Error("Unavailable");
        await action2(data2.resourceId, data2.versionId, { signal: controller.signal });
      }
      controller.signal.throwIfAborted();
    };
    void execute().then(
      () => finish2(true),
      () => finish2(false)
    );
  };
  port.addEventListener("message", listener);
  return () => {
    disposed = true;
    port.removeEventListener("message", listener);
    for (const controller of active2.values()) controller.abort();
    active2.clear();
  };
}

function serveFrameResourceImageReveal(port, capability, revealResourceImage, onFailure) {
  const allowed = { resourceImageReveal: capability && typeof revealResourceImage === "function" };
  const active2 = /* @__PURE__ */ new Map();
  let disposed = false;
  function reply(message2) {
    if (disposed) return;
    if (message2.type === "resource-image-reveal-failure") onFailure(message2.code);
    try {
      port.postMessage(message2);
    } catch {
    }
  }
  async function execute(request) {
    if (disposed || active2.has(request.id) || active2.size >= MAX_IN_FLIGHT$2) {
      reply({ type: "resource-image-reveal-failure", id: request.id, code: "REVEAL_FRAME_BUSY" });
      return;
    }
    const controller = new AbortController();
    active2.set(request.id, controller);
    const timer2 = setTimeout(() => controller.abort("timeout"), REQUEST_TIMEOUT_MS);
    try {
      await revealResourceImage?.(request.resourceId, request.versionId, {
        signal: controller.signal
      });
      controller.signal.throwIfAborted();
      reply({ type: "resource-image-reveal-response", id: request.id });
    } catch {
      if (disposed || controller.signal.reason === "disposed") return;
      reply({
        type: "resource-image-reveal-failure",
        id: request.id,
        code: controller.signal.reason === "timeout" ? "REVEAL_FRAME_REQUEST_TIMEOUT" : "RESOURCE_IMAGE_REVEAL_FAILED"
      });
    } finally {
      clearTimeout(timer2);
      active2.delete(request.id);
    }
  }
  function listener({ data: data2 }) {
    if (disposed || !data2 || typeof data2 !== "object" || !("type" in data2)) return;
    if (data2.type === "resource-image-reveal-cancel") {
      if ("id" in data2 && typeof data2.id === "string") active2.get(data2.id)?.abort("cancelled");
      return;
    }
    if (data2.type !== "resource-image-reveal") return;
    if (!isResourceRevealFrameRequest(data2, allowed)) {
      if ("id" in data2 && typeof data2.id === "string" && data2.id.length <= 128)
        reply({
          type: "resource-image-reveal-failure",
          id: data2.id,
          code: "RESOURCE_IMAGE_REVEAL_REJECTED"
        });
      return;
    }
    void execute(data2);
  }
  port.addEventListener("message", listener);
  return () => {
    disposed = true;
    port.removeEventListener("message", listener);
    for (const controller of active2.values()) controller.abort("disposed");
    active2.clear();
  };
}

function serveFrameSidebarOrder(port, capability, sidebarOrder, onFailure) {
  const granted = capability && !!sidebarOrder;
  const active2 = /* @__PURE__ */ new Set();
  let disposed = false;
  function reply(message2) {
    if (disposed) return;
    if (message2.type === "sidebar-order-failure") onFailure(message2.code);
    try {
      port.postMessage(message2);
    } catch {
    }
  }
  async function execute(request) {
    if (!sidebarOrder) return;
    active2.add(request.id);
    try {
      const state2 = request.operation === "reconcile" ? await sidebarOrder.reconcile(request.groups) : await sidebarOrder.move(request.input);
      if (!isSidebarOrderState(state2)) throw new SidebarOrderError("SIDEBAR_ORDER_UNAVAILABLE");
      reply({ type: "sidebar-order-response", id: request.id, state: state2 });
    } catch (error) {
      reply({ type: "sidebar-order-failure", id: request.id, code: sidebarOrderErrorCode(error) });
    } finally {
      active2.delete(request.id);
    }
  }
  function listener({ data: data2 }) {
    if (disposed || !data2 || typeof data2 !== "object" || !("type" in data2) || data2.type !== "sidebar-order-request")
      return;
    const id2 = "id" in data2 && typeof data2.id === "string" && data2.id.length <= 128 ? data2.id : "";
    if (!isSidebarOrderFrameRequest(data2, granted)) {
      if (id2) reply({ type: "sidebar-order-failure", id: id2, code: "SIDEBAR_ORDER_REJECTED" });
      return;
    }
    if (active2.has(id2) || active2.size >= MAX_IN_FLIGHT$1) {
      reply({ type: "sidebar-order-failure", id: id2, code: "SIDEBAR_ORDER_UNAVAILABLE" });
      return;
    }
    void execute(data2);
  }
  port.addEventListener("message", listener);
  return () => {
    disposed = true;
    active2.clear();
    port.removeEventListener("message", listener);
  };
}

function serveFrameTaskEvents(port, binding) {
  let stop;
  let disposed = false;
  let generation = 0;
  function listener({ data: data2 }) {
    if (disposed || !binding || !data2 || typeof data2 !== "object") return;
    if (!("type" in data2) || Object.keys(data2).length !== 1) return;
    if (data2.type === "task-events-unsubscribe") {
      generation++;
      stop?.();
      stop = void 0;
    } else if (data2.type === "task-events-subscribe" && !stop) {
      const current2 = ++generation;
      stop = binding.source.subscribe((value) => {
        if (disposed || current2 !== generation) return;
        const event = mapProjectTaskEvent(value);
        if (event?.scopeKey === binding.scopeKey) port.postMessage({ type: "task-event", event });
      });
    }
  }
  port.addEventListener("message", listener);
  return () => {
    disposed = true;
    stop?.();
    stop = void 0;
    port.removeEventListener("message", listener);
  };
}

// ==== 块外常量与守卫（第 114 轮补）====
const CANVAS_FRAME_DETACHED = "CANVAS_FRAME_DETACHED";

const CANVAS_HOST_REQUEST_REJECTED = "CANVAS_HOST_REQUEST_REJECTED";

const CANVAS_POSTER_MAX_BYTES = 8 * 1024 * 1024;

const CANVAS_TEXT_ROUTES = CANVAS_V3_TEXT_GENERATION_ROUTES;

const CANVAS_V3_ROUTES = {
  architecture: "/api/project/architecture",
  document: "/api/v3/canvas",
  commands: "/api/v3/canvas/commands",
  /** Batch read of Composition content projected for the canvas (POST { compositionIds }). */
  content: "/api/v3/canvas/content",
  images: "/api/v3/canvas/images",
  localFiles: "/api/v3/canvas/local-files",
  previews: "/api/v3/canvas/previews",
  videos: "/api/v3/canvas/videos",
  audios: "/api/v3/canvas/audios",
  media: "/api/v3/canvas/media",
  videoAudioSplits: "/api/v3/canvas/video-audio-splits",
  /** Agent-authored Compositions the canvas has not necessarily viewed yet (GET ?since=&limit=). */
  agentCompositions: "/api/v3/canvas/agent-compositions"
};

const CHAT_TIMEOUT_MS = 3e4;

const DOCUMENT_FRAME_REQUEST_REJECTED = "DOCUMENT_FRAME_REQUEST_REJECTED";

const DOCUMENT_FRAME_RESPONSE_LIMIT = 30 * 1024 * 1024;

const FLUSH_TIMEOUT_MS = 1e4;

const HILO_SOURCE_HEADER = "x-hilo-source";

const HOST_BILLING_PRICING_PATH = "/api/v1/billing/pricing";

const HOST_BILLING_PRICING_RESPONSE_LIMIT = 2 * 1024 * 1024;

const HOST_LUT_ROUTES = Object.freeze({
  list: "/api/luts",
  content: "/api/luts/content",
  import: "/api/luts/import"
});

class HostFailure extends Error {
  constructor(code2, status) {
    super(code2);
    this.code = code2;
    this.status = status;
  }
  code;
  status;
}

const MAX_FLUSH_REQUESTS = 16;

const MAX_IMAGE_IMPORTS = 1;

const MAX_IMAGE_READS = 2;

const MAX_IN_FLIGHT$1 = 8;

const MAX_IN_FLIGHT$2 = 2;

const MAX_IN_FLIGHT$3 = 8;

const MAX_IN_FLIGHT$4 = 4;

const MAX_IN_FLIGHT$5 = 8;

const MAX_IN_FLIGHT$6 = 32;

const MAX_IN_FLIGHT$7 = 4;

const MAX_IN_FLIGHT$8 = 8;

const MAX_IN_FLIGHT$9 = 4;

const MAX_PENDING = 4;

const MAX_UPLOADS = 1;

const PAGE_STORAGE_PROTOCOL_VERSION = 1;

const PRE_SEND_REJECTION_CODES = /* @__PURE__ */ new Set([
  "CHAT_SESSION_SEND_BLOCKED",
  "CHAT_SESSION_CHANGED",
  "CHAT_SESSION_PRIVATE",
  "CHAT_SESSION_SWITCHING",
  "CHAT_SESSION_RESOURCES_UNAVAILABLE"
]);

const PROJECTION_UNSUPPORTED = new Error("CHAT_SESSION_PROJECTION_UNSUPPORTED");

const PROJECT_RESOURCE_FRAME_RESPONSE_LIMIT = 30 * 1024 * 1024;

const REQUEST_TIMEOUT_MS = 3e4;

const REQUEST_TIMEOUT_MS$1 = 3e4;

const REQUEST_TIMEOUT_MS$2 = 3e4;

class SidebarOrderError extends Error {
  constructor(code2) {
    super(code2);
    this.code = code2;
    this.name = "SidebarOrderError";
  }
  code;
}

function canvasHostToolReadPath(message2) {
  if (message2.route !== "lut-content")
    return message2.route === "luts" ? HOST_LUT_ROUTES.list : HOST_SPEECH_VOICES_PATH;
  return `${HOST_LUT_ROUTES.content}?${new URLSearchParams({ name: message2.name })}`;
}

function canvasHttpRequest(message2, signal) {
  switch (message2.operation) {
    case "load":
      return [CANVAS_V3_ROUTES.document, { signal }];
    case "media-import-receipt":
      return [canvasMediaImportReceiptPath(message2.importId), { method: "GET", signal }];
    case "agent-compositions": {
      const query = new URLSearchParams({ since: String(message2.since) });
      if (message2.limit !== void 0) query.set("limit", String(message2.limit));
      return [`${CANVAS_V3_ROUTES.agentCompositions}?${query}`, { method: "GET", signal }];
    }
    default:
      return [
        message2.operation === "content" ? CANVAS_V3_ROUTES.content : CANVAS_V3_ROUTES.commands,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: message2.body,
          signal
        }
      ];
  }
}

function canvasPosterPath(resourceId2, versionId, width, force = false) {
  if (!isResourceVersion({ resourceId: resourceId2, versionId }) || !CANVAS_POSTER_WIDTHS.includes(width))
    throw new Error("Invalid Canvas poster request");
  const query = new URLSearchParams({ w: String(width) });
  if (force) query.set("force", "1");
  return `${CANVAS_V3_ROUTES.videos}/${encodeURIComponent(resourceId2)}/${encodeURIComponent(versionId)}/thumbnail?${query}`;
}

function createCanvasImageImporter(request) {
  return async (input, options2) => {
    if (!isCanvasImageImport(input)) throw new Error("CANVAS_V3_IMPORT_INVALID");
    const { importId, name: name2, file } = input;
    const target = input.target && { ...input.target };
    const signal = options2?.signal ?? new AbortController().signal;
    signal.throwIfAborted();
    const body2 = new FormData();
    body2.append("file", file, name2);
    const query = target ? `?${new URLSearchParams({
      resourceId: target.resourceId,
      baseVersionId: target.baseVersionId,
      ...target.createResource ? { createResource: "true" } : {}
    })}` : "";
    const response = await request(`${canvasImageImportPath(importId)}${query}`, {
      method: "POST",
      body: body2,
      signal
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw Object.assign(new Error(`CANVAS_V3_IMPORT_HTTP_${response.status}`), {
        status: response.status
      });
    }
    const bytes2 = await readBoundedBody(response, MAX_RECEIPT_BYTES, signal);
    let image2;
    try {
      image2 = parseCanvasV3ImageImportResult(JSON.parse(new TextDecoder().decode(bytes2)));
    } catch {
      throw new Error("CANVAS_V3_IMPORT_INVALID_RECEIPT");
    }
    if (image2.importId !== importId.toLowerCase() || !matchesCanvasImportReceiptName(
      name2,
      image2.name,
      Boolean(target && !target.createResource)
    ) || target && !target.createResource && image2.resourceId !== target.resourceId)
      throw new Error("CANVAS_V3_IMPORT_RECEIPT_MISMATCH");
    return image2;
  };
}

function createCanvasMediaImporter(request) {
  return async (input, options2) => {
    const { importId, file, name: name2 } = input;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      importId
    ) || !name2 || name2 === "." || name2 === ".." || new TextEncoder().encode(name2).length > 255 || /[/\\:]/.test(name2) || [...name2].some((c3) => c3.charCodeAt(0) < 32 || c3.charCodeAt(0) === 127) || !(file instanceof Blob) || file.size <= 0 || input.target && input.origin)
      throw new Error("CANVAS_V3_IMPORT_INVALID");
    const signal = options2?.signal ?? new AbortController().signal;
    const target = input.target ? parseCanvasV3MediaVersionTarget(input.target) : void 0;
    const origin2 = input.origin ? parseCanvasV3MediaReferenceOrigin(input.origin) : void 0;
    const query = target ? `?${new URLSearchParams({
      resourceId: target.resourceId,
      baseVersionId: target.baseVersionId,
      ...target.createResource ? { createResource: "true" } : {}
    })}` : origin2 ? `?${new URLSearchParams({
      originResourceId: origin2.resourceId,
      originVersionId: origin2.versionId,
      originStart: String(origin2.start),
      originEnd: String(origin2.end)
    })}` : "";
    signal.throwIfAborted();
    const body2 = new FormData();
    body2.append("file", file, name2);
    const response = await request(`${CANVAS_V3_ROUTES.media}/${importId.toLowerCase()}${query}`, {
      method: "POST",
      body: body2,
      signal
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw Object.assign(new Error(`CANVAS_V3_IMPORT_HTTP_${response.status}`), {
        status: response.status
      });
    }
    const bytes2 = await readBoundedBody(response, 64 * 1024, signal);
    let media2;
    try {
      media2 = parseCanvasV3MediaImportResult(JSON.parse(new TextDecoder().decode(bytes2)));
    } catch {
      throw new Error("CANVAS_V3_IMPORT_INVALID_RECEIPT");
    }
    if (media2.importId !== importId.toLowerCase() || !matchesCanvasImportReceiptName(
      name2,
      media2.name,
      Boolean(target && !target.createResource)
    ) || target && !target.createResource && media2.resourceId !== target.resourceId)
      throw new Error("CANVAS_V3_IMPORT_RECEIPT_MISMATCH");
    return media2;
  };
}

function createDirectorTransport(request) {
  return async (input, options2) => {
    if (!isDirectorOperation(input)) throw new Error("DIRECTOR_REQUEST_REJECTED");
    const signal = options2?.signal ?? new AbortController().signal;
    signal?.throwIfAborted();
    let path2;
    let init2 = { signal };
    if (input.op === "editor-request") {
      path2 = "/api/v3/editors/host";
      init2 = {
        ...init2,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.request)
      };
    } else if (input.op === "editor-video") {
      path2 = "/api/v3/editors/video";
      const form2 = new FormData();
      form2.append("request", JSON.stringify(input.request));
      form2.append(
        "file",
        new Blob([await input.file.arrayBuffer()], { type: input.file.type }),
        /^video\/mp4(?:\s*;|$)/i.test(input.file.type) ? "director.mp4" : "director.webm"
      );
      init2 = { ...init2, method: "POST", body: form2 };
    } else if (input.op === "asset-upload") {
      path2 = `/api/v3/canvas/director-assets/${input.id}`;
      const form2 = new FormData();
      form2.append(
        "file",
        new Blob([await input.file.arrayBuffer()], { type: input.file.type }),
        input.name
      );
      init2 = { ...init2, method: "POST", body: form2 };
    } else if (input.op === "asset-upload-bundle") {
      path2 = `/api/v3/canvas/director-assets/${input.id}`;
      const form2 = new FormData();
      for (let i2 = 0; i2 < input.files.length; i2++) {
        signal.throwIfAborted();
        const file = input.files[i2];
        form2.append(
          "file",
          new Blob([await file.arrayBuffer()], { type: file.type }),
          input.paths[i2].split("/").pop()
        );
      }
      form2.append("paths", JSON.stringify(input.paths));
      form2.append("entry", input.entry);
      init2 = { ...init2, method: "POST", body: form2 };
    } else if (input.op === "asset-read") {
      path2 = `/api/v3/canvas/director-assets/${input.id}/files/${input.path.split("/").map(encodeURIComponent).join("/")}`;
    } else {
      path2 = `/api/director-stage/vcam/${input.op.slice(5)}`;
      if (input.op !== "vcam-status")
        init2 = {
          ...init2,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}"
        };
    }
    signal?.throwIfAborted();
    const response = await request(path2, init2);
    const bytes2 = await readBoundedBody(
      response,
      input.op === "asset-read" ? DIRECTOR_ASSET_LIMIT : (
        // complete echoes its receipt, including any snapshot image.
        input.op === "editor-request" ? DIRECTOR_EDITOR_REQUEST_LIMIT : DIRECTOR_JSON_LIMIT
      ),
      signal
    );
    signal?.throwIfAborted();
    if (!response.ok) {
      let code2 = "DIRECTOR_REQUEST_FAILED";
      try {
        const error = JSON.parse(new TextDecoder().decode(bytes2));
        if (typeof error?.error?.code === "string") code2 = error.error.code;
      } catch {
      }
      throw Object.assign(new Error(code2), { status: response.status });
    }
    return input.op === "asset-read" ? new Blob([bytes2], {
      type: response.headers.get("content-type") ?? "application/octet-stream"
    }) : JSON.parse(new TextDecoder().decode(bytes2));
  };
}

function documentFrameHttp(message2) {
  if (message2.type === "resource-tags-request")
    return [HOST_RESOURCE_TAG_PATHS[message2.operation], { method: "POST", body: message2.body }];
  if (message2.operation === "read")
    return [
      `${HOST_DOCUMENT_READ_ROUTE}?path=${encodeURIComponent(message2.path)}`,
      { method: "GET" }
    ];
  return [
    message2.operation === "write" ? HOST_DOCUMENT_WRITE_PATH : HOST_DOCUMENT_CHECKPOINT_PATH,
    { method: "POST", body: message2.body }
  ];
}

function errorStatus(error) {
  if (!error || typeof error !== "object" || !("status" in error)) return void 0;
  const status = error.status;
  return typeof status === "number" && Number.isInteger(status) && status >= 400 && status <= 599 ? status : void 0;
}

function errorStatus$1(error) {
  if (!error || typeof error !== "object" || !("status" in error)) return void 0;
  const status = error.status;
  return typeof status === "number" && Number.isInteger(status) && status >= 400 && status <= 599 ? status : void 0;
}

function errorStatus$2(error) {
  if (!error || typeof error !== "object" || !("status" in error)) return void 0;
  const status = error.status;
  return typeof status === "number" && Number.isInteger(status) && status >= 400 && status <= 599 ? status : void 0;
}

function freezeGrants(capabilities) {
  return Object.freeze(
    Object.fromEntries(GRANTS.map((key2) => [key2, capabilities[key2] === true]))
  );
}

function hostLutDeletePath(name2) {
  if (!isHostLutName(name2)) throw new Error("Invalid LUT name");
  return `/api/luts/${encodeURIComponent(name2)}`;
}

async function httpResult(response, signal) {
  const bytes2 = await readBoundedBody(response, CANVAS_HOST_JSON_RESPONSE_LIMIT, signal);
  return {
    kind: "http",
    status: response.status,
    body: [204, 205, 304].includes(response.status) ? "" : new TextDecoder().decode(bytes2)
  };
}

function isCanvasFrameDetached(error) {
  for (let current2 = error, depth2 = 0; current2 && depth2 < 4; depth2++) {
    if (typeof current2 !== "object") return false;
    if ("code" in current2 && current2.code === CANVAS_FRAME_DETACHED) return true;
    current2 = "cause" in current2 ? current2.cause : void 0;
  }
  return false;
}

function isCanvasFrameRequest(value, capabilities) {
  if (!value || typeof value !== "object") return false;
  const message2 = value;
  if (typeof message2.id !== "string" || !message2.id || message2.id.length > 128) return false;
  if (message2.type === "director-request")
    return capabilities.director === true && isDirectorOperation(message2.input) && Object.keys(message2).every((k2) => ["type", "id", "input"].includes(k2));
  if (message2.type === "canvas-image-import")
    return capabilities.canvasImageImport === true && isCanvasImageImport(message2.input) && Object.keys(message2).every((key2) => ["type", "id", "input"].includes(key2));
  if (message2.type === "canvas-image-request")
    return capabilities.canvasImages === true && isIdentity(message2.resourceId) && isIdentity(message2.versionId) && Object.keys(message2).every((key2) => ["type", "id", "resourceId", "versionId"].includes(key2));
  if (message2.type === "canvas-media-probe")
    return capabilities.canvasMediaProbe === true && (message2.kind === "image" || message2.kind === "video") && isIdentity(message2.resourceId) && isIdentity(message2.versionId) && Object.keys(message2).every(
      (key2) => ["type", "id", "kind", "resourceId", "versionId"].includes(key2)
    );
  if (message2.type !== "canvas-request") return false;
  if (message2.operation === "media-import-receipt")
    return capabilities.canvasReads === true && typeof message2.importId === "string" && MEDIA_IMPORT_ID.test(message2.importId) && Object.keys(message2).every((key2) => ["type", "id", "operation", "importId"].includes(key2));
  if (message2.operation === "agent-compositions")
    return capabilities.canvasReads === true && Number.isSafeInteger(message2.since) && Number(message2.since) >= 0 && (message2.limit === void 0 || Number.isSafeInteger(message2.limit) && Number(message2.limit) >= 1 && Number(message2.limit) <= CANVAS_V3_AGENT_COMPOSITION_PAGE_LIMIT) && Object.keys(message2).every(
      (key2) => ["type", "id", "operation", "since", "limit"].includes(key2)
    );
  if (message2.operation === "content")
    return capabilities.canvasReads === true && isBoundedBody(message2);
  if (capabilities.canvas !== true) return false;
  if (message2.operation === "load")
    return Object.keys(message2).every((key2) => ["type", "id", "operation"].includes(key2));
  return message2.operation === "execute" && isBoundedBody(message2);
}

function isCanvasHostFrameRequest(value, capabilities) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const m2 = value;
  if (m2.type !== "canvas-host-request" || !isId$2(m2.id) || typeof m2.operation !== "string")
    return false;
  const operation2 = m2.operation;
  const known = [
    "poster",
    "audio-waveform",
    "media-import",
    "text-models",
    "text-generate",
    "tool-read",
    "lut-import",
    "lut-delete",
    "native-save-files",
    "native-export-begin",
    "native-export-end",
    "native-save-media",
    "native-reveal-image",
    "native-write-image",
    "preference-get",
    "preference-set"
  ];
  if (!known.includes(operation2)) return false;
  if (capabilities[canvasHostCapabilityOf(operation2)] !== true) return false;
  const keys2 = (...extra) => only(m2, ["type", "id", "operation", ...extra]);
  switch (operation2) {
    case "poster":
      return isResourceVersion(m2) && typeof m2.width === "number" && CANVAS_POSTER_WIDTHS.includes(m2.width) && (m2.force === void 0 || typeof m2.force === "boolean") && keys2("resourceId", "versionId", "width", "force");
    case "audio-waveform":
      return isResourceVersion(m2) && typeof m2.width === "number" && CANVAS_POSTER_WIDTHS.includes(m2.width) && keys2("resourceId", "versionId", "width");
    case "media-import":
      return isCanvasMediaImport(m2.input) && keys2("input");
    case "text-models":
      return keys2();
    case "text-generate":
      return isCanvasTextGenerateBody(m2.body, m2.requestId) && keys2("requestId", "body");
    case "tool-read":
      if (m2.route === "lut-content") return isLutName(m2.name) && keys2("route", "name");
      return (m2.route === "luts" || m2.route === "speech-voices") && keys2("route");
    case "lut-import":
      return m2.file instanceof Blob && m2.file.size > 0 && m2.file.size <= LUT_IMPORT_MAX_BYTES && isLutName(m2.name) && keys2("file", "name");
    case "lut-delete":
      return isLutName(m2.name) && keys2("name");
    case "native-export-begin":
    case "native-export-end":
      return isId$2(m2.exportId) && keys2("exportId");
    case "native-save-files":
      return isHostNativeSaveFiles(m2.files) && isSaveOptions(m2.options) && keys2("files", "options");
    case "native-save-media":
      return isHostNativeMediaSaveRequest(m2.request) && keys2("request");
    case "native-reveal-image":
      return isResourceVersion(m2.request) && only(m2.request, ["resourceId", "versionId"]) && keys2("request");
    case "native-write-image":
      return m2.png instanceof ArrayBuffer && m2.png.byteLength > 0 && m2.png.byteLength <= NATIVE_IMAGE_DATA_MAX_BYTES && keys2("png");
    case "preference-get":
      return isHostPreferenceKey(m2.key) && keys2("key");
    case "preference-set":
      return isHostPreferenceKey(m2.key) && typeof m2.value === "string" && m2.value.length <= HOST_PREFERENCE_VALUE_LIMIT && keys2("key", "value");
  }
}

function isChatFrameRequest(value, capabilities) {
  if (!value || typeof value !== "object" || capabilities.chatComposer !== true) return false;
  const message2 = value;
  if (!isFrameId(message2.id) || !hasValidResourceRefs(message2.resources)) return false;
  if (message2.type === "chat-draft") {
    if (!hasOnlyKeys(message2, ["type", "id", "text", "resources", "compositions"]) || !hasValidCompositionRefs(message2.compositions))
      return false;
    if (message2.text !== void 0 && !isChatText(message2.text, CHAT_FRAME_TEXT_LIMIT))
      return false;
    return message2.text !== void 0 || Array.isArray(message2.resources) && message2.resources.length > 0 || Array.isArray(message2.compositions) && message2.compositions.length > 0;
  }
  return message2.type === "chat-send" && hasOnlyKeys(message2, ["type", "id", "text", "resources"]) && isChatText(message2.text, CHAT_FRAME_TEXT_LIMIT);
}

function isChatFrameResponse(value) {
  if (!value || typeof value !== "object") return false;
  const message2 = value;
  if (!isFrameId(message2.id)) return false;
  if (message2.type === "chat-draft-response") return hasOnlyKeys(message2, ["type", "id"]);
  if (message2.type === "chat-send-response")
    return typeof message2.messageId === "string" && message2.messageId.length > 0 && message2.messageId.length <= CHAT_FRAME_MESSAGE_ID_LIMIT && hasOnlyKeys(message2, ["type", "id", "messageId"]);
  return message2.type === "chat-failure" && isFailureCode(message2.code) && hasOnlyKeys(message2, ["type", "id", "code"]);
}

function isChatSessionFrameId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
}

function isChatSessionFrameRequest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const message2 = value;
  if (!isChatSessionFrameId(message2.id)) return false;
  if (message2.type === "chat-session-cancel" || message2.type === "chat-session-unsubscribe")
    return Object.keys(message2).every((key2) => ["type", "id"].includes(key2));
  if (message2.type !== "chat-session-request") return false;
  if (message2.projectionVersion !== void 0 && message2.projectionVersion !== 2) return false;
  return message2.operation === "execute" ? Object.keys(message2).every(
    (key2) => ["type", "id", "operation", "command", "projectionVersion"].includes(key2)
  ) && isChatSessionCommand(message2.command) && (!("resources" in message2.command || ["text-edit", "open-link"].includes(message2.command.kind)) || message2.projectionVersion === 2) : (message2.operation === "snapshot" || message2.operation === "subscribe") && Object.keys(message2).every(
    (key2) => ["type", "id", "operation", "projectionVersion"].includes(key2)
  );
}

function isDocumentFrameRequest(value, capabilities) {
  if (!value || typeof value !== "object") return false;
  const message2 = value;
  if (!isId$1(message2.id)) return false;
  const only2 = (...keys2) => Object.keys(message2).every((key2) => ["type", "id", "operation", ...keys2].includes(key2));
  if (message2.type === "document-request") {
    if (capabilities.documents !== true) return false;
    if (message2.operation === "read")
      return isProjectRelativeDocumentPath(message2.path) && only2("path");
    return (message2.operation === "write" || message2.operation === "checkpoint") && isJsonObjectBody(message2.body) && only2("body");
  }
  return message2.type === "resource-tags-request" && capabilities.resourceTags === true && (message2.operation === "get" || message2.operation === "commands") && isJsonObjectBody(message2.body) && only2("body");
}

function isGenerationFrameRequest(value, capabilities) {
  if (!value || typeof value !== "object") return false;
  const message2 = value;
  if (!isId$3(message2.id)) return false;
  if (message2.type === "account-guard")
    return capabilities.accountGuard === true && message2.kind === "canvas" && Object.keys(message2).every((key2) => ["type", "id", "kind"].includes(key2));
  return message2.type === "billing-pricing" && capabilities.billingPricing === true && Object.keys(message2).every((key2) => ["type", "id"].includes(key2));
}

function isHostMediaGrant(value) {
  if (!value || typeof value !== "object") return false;
  const grant = value;
  return typeof grant.url === "string" && /^app:\/\/[a-z0-9-]{1,80}\/media\/[a-f0-9-]{36}$/.test(grant.url) && typeof grant.mimeType === "string" && /^(audio|video)\/[a-z0-9.+-]+$/.test(grant.mimeType) && Number.isSafeInteger(grant.expiresAt) && grant.expiresAt > 0;
}

function isMediaFrameRequest(value) {
  if (!value || typeof value !== "object") return false;
  const m2 = value;
  return m2.type === "media-grant" && typeof m2.id === "string" && m2.id.length > 0 && m2.id.length <= 128 && isRevealableResourceId(m2.resourceId) && isRevealableResourceId(m2.versionId) && [m2.resourceId, m2.versionId].every((id2) => id2 !== "." && id2 !== "..") && Object.keys(m2).every((key2) => ["type", "id", "resourceId", "versionId"].includes(key2));
}

function isPageStorageFrameRequest(value, granted) {
  if (!granted || !value || typeof value !== "object" || Array.isArray(value)) return false;
  const message2 = value;
  if (message2.type !== "page-storage-request" || !isId(message2.id) || !isPageStorageNamespace(message2.namespace))
    return false;
  const only2 = (...keys2) => Object.keys(message2).every(
    (key2) => ["type", "id", "operation", "namespace", ...keys2].includes(key2)
  );
  switch (message2.operation) {
    case "acquire":
    case "read":
    case "export-quarantine":
    case "recover-quarantine":
      return only2();
    case "write":
      return isPageStorageWrite(message2.namespace, message2.write) && only2("write");
    default:
      return false;
  }
}

function isProjectPersistenceMessage(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const message2 = value;
  if (message2.type === "persistence-state")
    return isProjectPersistenceSnapshot(message2.snapshot) && Object.keys(message2).every((key2) => key2 === "type" || key2 === "snapshot");
  if (typeof message2.id !== "string" || !message2.id || message2.id.length > 128) return false;
  if (message2.type === "persistence-flush")
    return Object.keys(message2).every((key2) => key2 === "type" || key2 === "id");
  return message2.type === "persistence-flushed" && isProjectPersistenceSnapshot(message2.snapshot) && Object.keys(message2).every((key2) => ["type", "id", "snapshot"].includes(key2));
}

function isResourceHostActionRequest(value) {
  if (!value || typeof value !== "object") return false;
  const v2 = value;
  if (v2.type !== "resource-host-action" || !identity$6(v2.id)) return false;
  if (v2.operation === "draft-composition" || v2.operation === "copy-composition")
    return identity$6(v2.compositionId) && Object.keys(v2).every((k2) => ["type", "id", "operation", "compositionId"].includes(k2));
  return (v2.operation === "reveal" || v2.operation === "copy") && identity$6(v2.resourceId) && identity$6(v2.versionId) && Object.keys(v2).every((k2) => ["type", "id", "operation", "resourceId", "versionId"].includes(k2));
}

function isResourceRevealFrameRequest(value, capability) {
  if (!value || typeof value !== "object") return false;
  const message2 = value;
  return message2.type === "resource-image-reveal" && capability.resourceImageReveal === true && typeof message2.id === "string" && message2.id.length > 0 && message2.id.length <= 128 && isRevealableResourceId(message2.resourceId) && isRevealableResourceId(message2.versionId) && Object.keys(message2).every((key2) => ["type", "id", "resourceId", "versionId"].includes(key2));
}

function isSidebarOrderFrameRequest(value, granted) {
  if (!granted || !isRecord$d(value) || value.type !== "sidebar-order-request" || !isFrameId$1(value.id))
    return false;
  if (value.operation === "reconcile")
    return only$1(value, ["type", "id", "operation", "groups"]) && isSidebarOrderGroups(value.groups);
  if (value.operation === "move")
    return only$1(value, ["type", "id", "operation", "input"]) && isSidebarOrderMove(value.input);
  return false;
}

function isSidebarOrderState(value) {
  if (!isRecord$d(value) || !only$1(value, ["parents"]) || !isRecord$d(value.parents)) return false;
  const entries2 = Object.entries(value.parents);
  if (entries2.length > MAX_IDENTITIES$1) return false;
  let nodes = 0;
  for (const [key2, ranks] of entries2) {
    if (key2.length > 1100 || !isRecord$d(ranks)) return false;
    try {
      const parent = JSON.parse(key2);
      if (!Array.isArray(parent) || parent.length !== 2 || !isParent({ kind: parent[0], parentId: parent[1] }) || JSON.stringify(parent) !== key2)
        return false;
    } catch {
      return false;
    }
    for (const [id2, rank] of Object.entries(ranks)) {
      if (!isNodeIdentity(id2) || typeof rank !== "string" || rank.length === 0 || rank.length > 1024 || !/^[a-zA-Z0-9]+$/.test(rank))
        return false;
      if (++nodes > MAX_IDENTITIES$1) return false;
    }
  }
  return isBounded(value, RESPONSE_LIMIT);
}

function isTextCompletionFrameRequest(value, capabilities) {
  if (!value || typeof value !== "object" || capabilities.textCompletion !== true) return false;
  const message2 = value;
  return message2.type === "text-completion" && isFrameId(message2.id) && isChatText(message2.prompt, TEXT_COMPLETION_PROMPT_LIMIT) && TEXT_COMPLETION_PURPOSES.includes(message2.purpose) && (message2.system === void 0 || isChatText(message2.system, TEXT_COMPLETION_SYSTEM_LIMIT)) && hasValidResourceRefs(message2.resources) && hasOnlyKeys(message2, ["type", "id", "prompt", "purpose", "system", "resources"]);
}

async function localCopy(file) {
  return new Blob([await file.arrayBuffer()], { type: file.type });
}

function mapProjectTaskEvent(value) {
  if (!value || typeof value !== "object") return;
  const event = value;
  if (!isIdentity$1(event.scopeKey)) return;
  if (event.type === "resync") return { type: "resync", scopeKey: event.scopeKey };
  if (event.type !== "task-changed") return;
  const task2 = mapProjectTaskSnapshot(event.task);
  return task2 ? { type: "task-changed", scopeKey: event.scopeKey, task: task2 } : void 0;
}

function pageStorageErrorCode(error) {
  return error instanceof PageStorageError ? error.code : error && typeof error === "object" && "code" in error && isPageStorageErrorCode(error.code) ? error.code : "PAGE_STORAGE_UNAVAILABLE";
}

function projectSnapshot(snapshot2, projectionVersion) {
  if (!isChatSessionSnapshot(snapshot2)) throw new Error("Invalid chat snapshot");
  if (projectionVersion === 2) {
    if (snapshot2.projectionVersion !== 2) throw PROJECTION_UNSUPPORTED;
    return snapshot2;
  }
  return legacyChatSessionSnapshot(snapshot2);
}

async function readBoundedBody(response, limit, signal) {
  const declared = response.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > limit)) {
    await response.body?.cancel();
    throw new Error("CANVAS_RESPONSE_TOO_LARGE");
  }
  const reader = response.body?.getReader();
  if (!reader) return new ArrayBuffer(0);
  const abort = () => {
    void reader.cancel().catch(() => void 0);
  };
  signal.addEventListener("abort", abort, { once: true });
  const chunks = [];
  let size2 = 0;
  try {
    signal.throwIfAborted();
    for (; ; ) {
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      size2 += value.byteLength;
      if (size2 > limit) throw new Error("CANVAS_RESPONSE_TOO_LARGE");
      chunks.push(value);
    }
    const bytes2 = new Uint8Array(size2);
    let offset2 = 0;
    for (const chunk2 of chunks) {
      bytes2.set(chunk2, offset2);
      offset2 += chunk2.byteLength;
    }
    return bytes2.buffer;
  } finally {
    signal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => void 0);
    reader.releaseLock();
  }
}

async function readCanvasImageBytes(request, resourceId2, versionId, signal) {
  const response = await request(canvasImagePath(resourceId2, versionId), { signal });
  const mimeType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (response.status !== 200 || !isCanvasImageMimeType(mimeType)) {
    await response.body?.cancel();
    throw Object.assign(new Error("CANVAS_IMAGE_UNAVAILABLE"), {
      ...response.status >= 400 ? { status: response.status } : {}
    });
  }
  const body2 = await readBoundedBody(response, CANVAS_V3_IMAGE_MAX_BYTES, signal);
  if (!body2.byteLength) throw new Error("CANVAS_IMAGE_EMPTY");
  return { mimeType, body: body2 };
}

async function readResourceAudioWaveformBytes(request, resourceId2, versionId, options2) {
  if (!isRevealableResourceId(resourceId2) || !isRevealableResourceId(versionId) || !CANVAS_POSTER_WIDTHS.includes(options2.width))
    throw new Error("AUDIO_WAVEFORM_REQUEST_REJECTED");
  const signal = options2.signal ?? new AbortController().signal;
  signal.throwIfAborted();
  const resource2 = await request(PROJECT_RESOURCE_HTTP_ROUTES.get, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectors: [{ resourceId: resourceId2, versionId }] }),
    signal
  });
  if (!resource2.ok) throw new Error("AUDIO_WAVEFORM_RESOURCE_UNAVAILABLE");
  const [result] = parseProjectResourceReadResults(await resource2.json(), 1);
  if (!result?.ok) throw new Error("AUDIO_WAVEFORM_RESOURCE_UNAVAILABLE");
  const { resource: audio, version: version2 } = result.detail;
  if (audio.resourceId !== resourceId2 || audio.kind !== ProjectResourceKind.AUDIO || version2?.resourceId !== resourceId2 || version2.versionId !== versionId || version2.status !== ProjectResourceVersionStatus.READY || !version2.relativePath)
    throw new Error("AUDIO_WAVEFORM_RESOURCE_UNAVAILABLE");
  signal.throwIfAborted();
  const response = await request(
    `${API_PATHS.thumbnail(version2.relativePath)}?w=${options2.width}`,
    { signal }
  );
  const mimeType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (!response.ok || mimeType !== "image/jpeg") {
    await response.body?.cancel();
    throw new Error("AUDIO_WAVEFORM_UNAVAILABLE");
  }
  const body2 = await readBoundedBody(response, CANVAS_POSTER_MAX_BYTES, signal);
  if (!body2.byteLength) throw new Error("AUDIO_WAVEFORM_UNAVAILABLE");
  return { mimeType, body: body2 };
}

function sidebarOrderErrorCode(error) {
  return isRecord$d(error) && typeof error.code === "string" && ERROR_CODES$2.has(error.code) ? error.code : "SIDEBAR_ORDER_UNAVAILABLE";
}

const CANVAS_HOST_JSON_RESPONSE_LIMIT = 30 * 1024 * 1024;

const CANVAS_POSTER_WIDTHS = Object.freeze([128, 256, 512, 1024]);

const CANVAS_V3_AGENT_COMPOSITION_PAGE_LIMIT = 200;

const CANVAS_V3_IMAGE_MAX_BYTES = 32 * 1024 * 1024;

const CANVAS_V3_TEXT_GENERATION_ROUTES = {
  models: "/api/v3/canvas/text/models",
  generate: "/api/v3/canvas/text/generate"
};

const CHAT_FRAME_MESSAGE_ID_LIMIT = 256;

const CHAT_FRAME_TEXT_LIMIT = 2e4;

const DIRECTOR_ASSET_LIMIT = 128 * 1024 * 1024;

const DIRECTOR_EDITOR_REQUEST_LIMIT = 30 * 1024 * 1024;

const DIRECTOR_JSON_LIMIT = 4 * 1024 * 1024;

const ERROR_CODES$2 = /* @__PURE__ */ new Set([
  "SIDEBAR_ORDER_INVALID",
  "SIDEBAR_ORDER_REJECTED",
  "SIDEBAR_ORDER_UNAVAILABLE",
  "SIDEBAR_ORDER_TIMEOUT"
]);

const GRANTS = [
  "canvasPosters",
  "audioWaveforms",
  "canvasMediaImport",
  "canvasTextGeneration",
  "nativeFiles",
  "preferences",
  "luts",
  "toolReads"
];

const HOST_DOCUMENT_CHECKPOINT_PATH = "/api/v3/canvas/document-checkpoints";

const HOST_DOCUMENT_READ_ROUTE = "/api/files/content";

const HOST_DOCUMENT_WRITE_PATH = "/api/v3/document";

const HOST_PREFERENCE_VALUE_LIMIT = 16 * 1024;

const HOST_RESOURCE_TAG_PATHS = Object.freeze({
  get: "/api/project/resources/tags/get",
  commands: "/api/project/resources/tags/commands"
});

const HOST_SPEECH_VOICES_PATH = "/api/speech/voices";

const LUT_IMPORT_MAX_BYTES = 32 * 1024 * 1024;

const MAX_IDENTITIES$1 = 5e4;

const MAX_RECEIPT_BYTES = 64 * 1024;

const MEDIA_IMPORT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const NATIVE_IMAGE_DATA_MAX_BYTES = 64 * 1024 * 1024;

const PROJECT_RESOURCE_HTTP_ROUTES = {
  get: "/api/project/resources/get",
  search: "/api/project/resources/search",
  listVersions: "/api/project/resources/versions/list",
  commands: "/api/project/resources/commands"
};

class PageStorageError extends Error {
  constructor(code2) {
    super(code2);
    this.code = code2;
    this.name = "PageStorageError";
  }
  code;
}

var ProjectResourceKind = /* @__PURE__ */ ((ProjectResourceKind2) => {
  ProjectResourceKind2[ProjectResourceKind2["TEXT_DOCUMENT"] = 1] = "TEXT_DOCUMENT";
  ProjectResourceKind2[ProjectResourceKind2["IMAGE"] = 2] = "IMAGE";
  ProjectResourceKind2[ProjectResourceKind2["VIDEO"] = 3] = "VIDEO";
  ProjectResourceKind2[ProjectResourceKind2["AUDIO"] = 4] = "AUDIO";
  ProjectResourceKind2[ProjectResourceKind2["FILE"] = 5] = "FILE";
  return ProjectResourceKind2;
})(ProjectResourceKind || {});

var ProjectResourceVersionStatus = /* @__PURE__ */ ((ProjectResourceVersionStatus2) => {
  ProjectResourceVersionStatus2["READY"] = "ready";
  ProjectResourceVersionStatus2["DELETED"] = "deleted";
  return ProjectResourceVersionStatus2;
})(ProjectResourceVersionStatus || {});

const RESPONSE_LIMIT = 30 * 1024 * 1024;

const TEXT_COMPLETION_PROMPT_LIMIT = 32e3;

const TEXT_COMPLETION_PURPOSES = [
  "prompt_rewrite",
  "summarize",
  "translate",
  "free"
];

const TEXT_COMPLETION_SYSTEM_LIMIT = 8e3;

function canvasHostCapabilityOf(operation2) {
  switch (operation2) {
    case "poster":
      return "canvasPosters";
    case "audio-waveform":
      return "audioWaveforms";
    case "media-import":
      return "canvasMediaImport";
    case "text-models":
    case "text-generate":
      return "canvasTextGeneration";
    case "tool-read":
      return "toolReads";
    case "lut-import":
    case "lut-delete":
      return "luts";
    case "preference-get":
    case "preference-set":
      return "preferences";
    default:
      return "nativeFiles";
  }
}

function canvasImageImportPath(importId) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(importId))
    throw new Error("Invalid Canvas image import identity");
  return `${CANVAS_V3_ROUTES.images}/${importId.toLowerCase()}`;
}

function canvasImagePath(resourceId2, versionId) {
  if (!isIdentity(resourceId2) || !isIdentity(versionId))
    throw new Error("Invalid Canvas image identity");
  return `${CANVAS_V3_ROUTES.images}/${encodeURIComponent(resourceId2)}/${encodeURIComponent(versionId)}`;
}

function canvasMediaImportReceiptPath(importId) {
  if (!MEDIA_IMPORT_ID.test(importId)) throw new Error("Invalid Canvas media import identity");
  return `${CANVAS_V3_ROUTES.media}/${importId.toLowerCase()}`;
}

const hasOnlyKeys = (message2, keys2) => Object.keys(message2).every((key2) => keys2.includes(key2));

function hasValidCompositionRefs(value) {
  if (value === void 0) return true;
  if (!Array.isArray(value) || value.length > CHAT_FRAME_COMPOSITION_LIMIT) return false;
  return value.every(
    (item) => !!item && typeof item === "object" && isRevealableResourceId(item.compositionId) && hasOnlyKeys(item, ["compositionId"])
  );
}

function hasValidResourceRefs(value) {
  if (value === void 0) return true;
  if (!Array.isArray(value) || value.length > CHAT_FRAME_RESOURCE_LIMIT) return false;
  return value.every(
    (item) => !!item && typeof item === "object" && isRevealableResourceId(item.resourceId) && isRevealableResourceId(item.versionId) && hasOnlyKeys(item, ["resourceId", "versionId"])
  );
}

const identity$6 = (value) => typeof value === "string" && value.length > 0 && value.length <= 256 && ![...value].some(
  (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 || character === "/" || character === "\\"
);

const PROJECT_NAME_MAX_CHARS = 50;
function truncateProjectName(name2, maxChars = PROJECT_NAME_MAX_CHARS) {
  const trimmed = name2?.trim() ?? "";
  if (!trimmed) return "";
  const chars = [...trimmed];
  return chars.length > maxChars ? chars.slice(0, maxChars).join("").trim() : trimmed;
}
function normalizeSkillContentLocale(value) {
  return typeof value === "string" && value.toLowerCase().startsWith("en") ? "en-US" : "zh-CN";
}
function selectSkillStructuredInfo(info2, preferredLocale) {
  const preferred = normalizeSkillContentLocale(preferredLocale);
  const locale = info2?.[preferred] ? preferred : info2?.["zh-CN"] ? "zh-CN" : info2?.["en-US"] ? "en-US" : preferred;
  return {
    locale,
    info: info2?.[locale] ?? { summary: "", best_for: [], how_to_use: "", outputs: "" }
  };
}
const SKILL_GUIDE_PROMPT_DEFAULTS = {
  zh: "为我解释一下这个技能的最佳使用方式。",
  en: "Show me the best way to use this skill with a few examples."
};
const SKILL_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
function isValidSkillName$1(name2) {
  return SKILL_NAME_RE.test(name2);
}
function skillVerticals(skill) {
  if (skill.completeTagsEn?.length)
    return skill.completeTagsEn.map((tag) => tag.split(" / ")[0].trim());
  if (skill.tagEn) return [skill.tagEn.split(" / ")[0].trim()];
  if (skill.tags?.length) return skill.tags;
  return [];
}
function skillCategoryCodes(skill) {
  return skill.categoryCodes ?? [];
}

const isBounded = (value, limit) => new TextEncoder().encode(JSON.stringify(value)).byteLength <= limit;

function isBoundedBody(message2) {
  return typeof message2.body === "string" && message2.body.length <= PROJECT_RESOURCE_FRAME_REQUEST_LIMIT && new TextEncoder().encode(message2.body).byteLength <= PROJECT_RESOURCE_FRAME_REQUEST_LIMIT && Object.keys(message2).every((key2) => ["type", "id", "operation", "body"].includes(key2));
}

function isCanvasImageImport(value) {
  if (!value || typeof value !== "object") return false;
  const input = value;
  if (typeof input.importId !== "string" || typeof input.name !== "string" || input.name.length === 0 || input.name.length > 255)
    return false;
  try {
    canvasImageImportPath(input.importId);
    encodeURIComponent(input.name);
    if (input.target !== void 0) parseCanvasV3ImageVersionTarget(input.target);
  } catch {
    return false;
  }
  return typeof input.name === "string" && input.name.length > 0 && ![".", ".."].includes(input.name) && new TextEncoder().encode(input.name).byteLength <= 255 && // biome-ignore lint/suspicious/noControlCharactersInRegex: same filename boundary as the image service.
  !/[\x00-\x1f\x7f/\\:]/.test(input.name) && input.file instanceof Blob && input.file.size > 0 && input.file.size <= CANVAS_V3_IMAGE_MAX_BYTES && Object.keys(input).every((key2) => ["importId", "name", "file", "target"].includes(key2));
}

function isCanvasImageMimeType(value) {
  return typeof value === "string" && ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(value);
}

function isCanvasMediaImport(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const input = value;
  return typeof input.importId === "string" && UUID.test(input.importId) && isHostFileName(input.name) && (input.kind === "video" || input.kind === "audio") && input.file instanceof Blob && input.file.size > 0 && input.file.size <= CANVAS_MEDIA_IMPORT_MAX_BYTES && (input.target === void 0 || typeof input.target === "object" && input.target !== null && !Array.isArray(input.target) && only(input.target, ["resourceId", "baseVersionId"]) && isResourceVersion({
    resourceId: input.target.resourceId,
    versionId: input.target.baseVersionId
  })) && only(input, ["importId", "file", "name", "kind", "target"]);
}

function isCanvasTextGenerateBody(body2, requestId) {
  if (typeof body2 !== "string" || typeof requestId !== "string" || !requestId.trim() || requestId.length > 256 || hasControl$1(requestId) || body2.length > CANVAS_TEXT_REQUEST_LIMIT || new TextEncoder().encode(body2).byteLength > CANVAS_TEXT_REQUEST_LIMIT)
    return false;
  return jsonObject(body2)?.requestId === requestId;
}

function isChatSessionCommand(value) {
  if (!isRecord$e(value)) return false;
  if (value.kind === "text-edit")
    return onlyKeys(value, ["kind", "event"]) && isChatSessionTextEditEvent(value.event);
  if (value.kind === "new") return onlyKeys(value, ["kind"]);
  if (value.kind === "open-link")
    return onlyKeys(value, ["kind", "sessionId", "url"]) && (value.sessionId === null || isChatSessionId(value.sessionId)) && isChatSessionExternalUrl(value.url);
  if (value.kind === "select" || value.kind === "stop")
    return onlyKeys(value, ["kind", "sessionId"]) && isChatSessionId(value.sessionId);
  if (value.kind !== "draft" && value.kind !== "send") return false;
  if (!(value.sessionId === null || isChatSessionId(value.sessionId)) || !isText(value.text, CHAT_SESSION_DRAFT_LIMIT) || !resourcesValid(value.resources, false))
    return false;
  if (value.editorFocus !== void 0) {
    try {
      parseEditorFocus(value.editorFocus);
    } catch {
      return false;
    }
  }
  return value.kind === "draft" ? onlyKeys(value, ["kind", "sessionId", "text", "resources"]) : onlyKeys(value, ["kind", "sessionId", "text", "requestId", "resources", "editorFocus"]) && (value.text.trim().length > 0 || Array.isArray(value.resources) && value.resources.length > 0) && isChatSessionId(value.requestId);
}

function isChatSessionSnapshot(value) {
  if (!isRecord$e(value) || !onlyKeys(value, [
    "projectionVersion",
    "draftResources",
    "editing",
    "revision",
    "sessionId",
    "sessions",
    "messages",
    "connected",
    "busy",
    "historyLoading",
    "historyUnavailable",
    "draft"
  ]) || value.projectionVersion !== void 0 && value.projectionVersion !== 2 || value.draftResources !== void 0 && value.projectionVersion !== 2 || !resourcesValid(value.draftResources, true) || value.editing !== void 0 && (value.projectionVersion !== 2 || value.editing !== null && !isChatSessionEditingSnapshot(value.editing)) || !Number.isSafeInteger(value.revision) || value.revision < 0 || !(value.sessionId === null || isChatSessionId(value.sessionId)) || !Array.isArray(value.sessions) || value.sessions.length > CHAT_SESSION_LIMIT || !Array.isArray(value.messages) || value.messages.length > CHAT_SESSION_MESSAGE_LIMIT || !["connected", "busy", "historyLoading", "historyUnavailable"].every(
    (key2) => typeof value[key2] === "boolean"
  ) || !isText(value.draft, CHAT_SESSION_DRAFT_LIMIT))
    return false;
  const sessionIds = /* @__PURE__ */ new Set();
  for (const session of value.sessions) {
    if (!isRecord$e(session) || !onlyKeys(session, ["id", "title", "busy"]) || !isChatSessionId(session.id) || sessionIds.has(session.id) || !isText(session.title, CHAT_SESSION_TITLE_LIMIT) || typeof session.busy !== "boolean")
      return false;
    sessionIds.add(session.id);
  }
  const messageIds = /* @__PURE__ */ new Set();
  let totalText = 0;
  let totalResources = Array.isArray(value.draftResources) ? value.draftResources.length : 0;
  for (const message2 of value.messages) {
    if (!isRecord$e(message2) || !onlyKeys(message2, ["id", "role", "kind", "text", "toolName", "status", "resources"]) || message2.resources !== void 0 && value.projectionVersion !== 2 || !resourcesValid(message2.resources, true) || !isChatSessionId(message2.id) || messageIds.has(message2.id) || !["user", "agent"].some((role2) => message2.role === role2) || !["text", "thinking", "tool", "error", "notice"].some((kind2) => message2.kind === kind2) || !isText(message2.text, CHAT_SESSION_TEXT_LIMIT) || message2.toolName !== void 0 && !isText(message2.toolName, CHAT_SESSION_TITLE_LIMIT) || message2.status !== void 0 && !["pending", "running", "completed", "error"].some((status) => message2.status === status))
      return false;
    totalResources += Array.isArray(message2.resources) ? message2.resources.length : 0;
    if (totalResources > CHAT_SESSION_TOTAL_RESOURCE_LIMIT) return false;
    totalText += message2.text.length;
    if (totalText > CHAT_SESSION_TOTAL_TEXT_LIMIT) return false;
    messageIds.add(message2.id);
  }
  return true;
}

const isChatText = (value, limit) => typeof value === "string" && value.trim().length > 0 && value.length <= limit;

function isDirectorOperation(value) {
  if (!value || typeof value !== "object") return false;
  const v2 = value;
  let keys2;
  switch (v2.op) {
    case "asset-upload":
      keys2 = ["op", "id", "name", "file"];
      if (!uuid(v2.id) || !isDirectorAssetPath(v2.name) || v2.name.includes("/") || !/\.(glb|gltf|ply|spz)$/i.test(v2.name) || !(v2.file instanceof Blob) || !v2.file.size || v2.file.size > DIRECTOR_ASSET_LIMIT)
        return false;
      break;
    case "asset-upload-bundle":
      keys2 = ["op", "id", "files", "paths", "entry"];
      if (!uuid(v2.id) || !Array.isArray(v2.files) || !v2.files.length || v2.files.length > 64 || !Array.isArray(v2.paths) || v2.paths.length !== v2.files.length || !v2.paths.every(
        (path2) => isDirectorAssetPath(path2) && /\.(glb|gltf|ply|spz|bin|png|jpg|jpeg|webp|ktx2)$/i.test(path2)
      ) || new Set(v2.paths).size !== v2.paths.length || !isDirectorAssetPath(v2.entry) || !/\.(glb|gltf|ply|spz)$/i.test(v2.entry) || !v2.paths.includes(v2.entry) || !v2.files.every(
        (file) => file instanceof Blob && file.size > 0 && file.size <= DIRECTOR_ASSET_LIMIT
      ) || v2.files.reduce((total, file) => total + file.size, 0) > DIRECTOR_BUNDLE_LIMIT)
        return false;
      break;
    case "asset-read":
      keys2 = ["op", "id", "path"];
      if (!uuid(v2.id) || !isDirectorAssetPath(v2.path)) return false;
      break;
    case "editor-request":
      keys2 = ["op", "request"];
      if (!v2.request || typeof v2.request !== "object" || Array.isArray(v2.request) || JSON.stringify(v2.request).length > DIRECTOR_EDITOR_REQUEST_LIMIT)
        return false;
      break;
    case "editor-video": {
      keys2 = ["op", "request", "file"];
      if (!v2.request || typeof v2.request !== "object" || Array.isArray(v2.request) || !(v2.file instanceof Blob) || !v2.file.size || v2.file.size > DIRECTOR_VIDEO_LIMIT || !/^video\/(mp4|webm)(?:\s*;\s*codecs=[^\r\n;]+)?$/i.test(v2.file.type))
        return false;
      try {
        if (new TextEncoder().encode(JSON.stringify(v2.request)).length > DIRECTOR_VIDEO_REQUEST_LIMIT)
          return false;
      } catch {
        return false;
      }
      break;
    }
    case "vcam-start":
    case "vcam-stop":
    case "vcam-status":
      keys2 = ["op"];
      break;
    default:
      return false;
  }
  return Object.keys(v2).every((k2) => keys2.includes(k2));
}

const isFailureCode = (value) => typeof value === "string" && /^[A-Z0-9_]{1,80}$/.test(value);

const isFrameId = (value) => typeof value === "string" && value.length > 0 && value.length <= 128;

const isFrameId$1 = (value) => isIdentity$2(value) && value.length <= 128;

function isHostLutName(value) {
  return isHostFileName(value) && /\.cube$/i.test(value) && !value.startsWith("..") && value.length > ".cube".length;
}

function isHostNativeMediaSaveRequest(value) {
  if (!isResourceVersion(value)) return false;
  const v2 = value;
  return (v2.mediaKind === "video" || v2.mediaKind === "audio") && (v2.filename === void 0 || isHostFileName(v2.filename)) && only(v2, ["resourceId", "versionId", "mediaKind", "filename"]);
}

function isHostNativeSaveFiles(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > NATIVE_SAVE_MAX_FILES)
    return false;
  let total = 0;
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const file = item;
    if (!(file.file instanceof Blob) || file.file.size <= 0 || file.file.size > NATIVE_SAVE_FILE_MAX_BYTES || !isHostFileName(file.fileName) || file.folderName !== void 0 && !isHostFileName(file.folderName) || !only(file, ["file", "fileName", "folderName"]))
      return false;
    total += file.file.size;
    if (total > NATIVE_SAVE_TOTAL_MAX_BYTES) return false;
  }
  return true;
}

function isHostPreferenceKey(value) {
  return typeof value === "string" && HOST_PREFERENCE_KEYS.includes(value);
}

const isId = (value) => typeof value === "string" && value.length > 0 && value.length <= 128;

const isId$1 = (value) => typeof value === "string" && value.length > 0 && value.length <= 128;

const isId$2 = (value) => typeof value === "string" && value.length > 0 && value.length <= 128;

const isId$3 = (value) => typeof value === "string" && value.length > 0 && value.length <= 128;

function isIdentity(value) {
  if (typeof value !== "string" || !value.trim() || value.length > CANVAS_V3_LIMITS.idLength || [".", "..", "__proto__", "prototype", "constructor"].includes(value))
    return false;
  try {
    encodeURIComponent(value);
    return true;
  } catch {
    return false;
  }
}

const isIdentity$1 = (value) => typeof value === "string" && value.trim().length > 0 && value.length <= 512;

function isJsonObjectBody(value) {
  if (typeof value !== "string" || value.length > DOCUMENT_FRAME_REQUEST_LIMIT || new TextEncoder().encode(value).byteLength > DOCUMENT_FRAME_REQUEST_LIMIT)
    return false;
  try {
    const parsed = JSON.parse(value);
    return !!parsed && typeof parsed === "object" && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

const isLutName = isHostLutName;

const isNodeIdentity = (value) => isIdentity$2(value, 4096);

function isPageStorageErrorCode(value) {
  return typeof value === "string" && ERROR_CODES.has(value);
}

function isPageStorageNamespace(value) {
  return typeof value === "string" && Object.hasOwn(PAGE_STORAGE_NAMESPACES, value);
}

function isPageStorageWrite(namespace2, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const write = value;
  if (!isId(write.writeId) || !isCount(write.writerEpoch) || write.writerEpoch < 1 || !isCount(write.baseRevision) || !Array.isArray(write.set) || write.set.length === 0 || write.set.length > PAGE_STORAGE_MAX_KEYS || !Object.keys(write).every(
    (key2) => ["writeId", "writerEpoch", "baseRevision", "set"].includes(key2)
  ))
    return false;
  const seen = /* @__PURE__ */ new Set();
  let total = 0;
  for (const item of write.set) {
    if (!Array.isArray(item) || item.length !== 2 || !isPageStorageKey(namespace2, item[0]) || seen.has(item[0]) || item[1] !== null && (typeof item[1] !== "string" || item[1].length > PAGE_STORAGE_VALUE_LIMIT))
      return false;
    seen.add(item[0]);
    total += item[0].length + (item[1]?.length ?? 0);
    if (total > PAGE_STORAGE_SCOPE_LIMIT) return false;
  }
  return true;
}

const isParent = (value) => typeof value.kind === "string" && ["category", "composition", "member"].includes(value.kind) && isIdentity$2(value.parentId);

function isProjectPersistenceSnapshot(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const snapshot2 = value;
  return Number.isSafeInteger(snapshot2.revision) && Number(snapshot2.revision) >= 0 && typeof snapshot2.state === "string" && ["clean", "dirty", "saving", "failed"].includes(snapshot2.state) && Object.keys(snapshot2).every((key2) => key2 === "revision" || key2 === "state");
}

const isRecord$d = (value) => !!value && typeof value === "object" && !Array.isArray(value);

function isResourceVersion(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v2 = value;
  return isRevealableResourceId(v2.resourceId) && isRevealableResourceId(v2.versionId) && [v2.resourceId, v2.versionId].every((id2) => id2 !== "." && id2 !== "..");
}

function isRevealableResourceId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 256 && // biome-ignore lint/suspicious/noControlCharactersInRegex: identifiers must not contain path separators or controls
  !/[\x00-\x1f\x7f/\\]/.test(value);
}

function isSaveOptions(value) {
  if (value === void 0) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v2 = value;
  return (v2.dialogTitle === void 0 || typeof v2.dialogTitle === "string" && v2.dialogTitle.length <= 200 && !hasControl$1(v2.dialogTitle)) && (v2.rootFolderName === void 0 || isHostFileName(v2.rootFolderName)) && only(v2, ["dialogTitle", "rootFolderName"]);
}

function isSidebarOrderGroups(value) {
  if (!Array.isArray(value) || value.length > MAX_IDENTITIES$1) return false;
  const parents = /* @__PURE__ */ new Set();
  let nodes = 0;
  for (const group of value) {
    if (!isRecord$d(group) || !hasGroupFields(group) || !only$1(group, ["kind", "parentId", "nodeIds"]))
      return false;
    const typed = group;
    const key2 = sidebarOrderParentKey(typed);
    if (parents.has(key2)) return false;
    parents.add(key2);
    nodes += typed.nodeIds.length;
    if (nodes > MAX_IDENTITIES$1) return false;
  }
  return isBounded(value, REQUEST_LIMIT);
}

function isSidebarOrderMove(value) {
  if (!isRecord$d(value) || !hasGroupFields(value) || !only$1(value, ["kind", "parentId", "nodeIds", "nodeId", "targetId", "after"]) || !isNodeIdentity(value.nodeId) || value.after !== void 0 && typeof value.after !== "boolean")
    return false;
  const siblings2 = value.nodeIds;
  return siblings2.includes(value.nodeId) && (value.targetId === void 0 || isNodeIdentity(value.targetId) && siblings2.includes(value.targetId)) && isBounded(value, REQUEST_LIMIT);
}

function legacyChatSessionSnapshot(snapshot2) {
  const {
    projectionVersion: _version,
    draftResources: _draft,
    editing: _editing,
    ...rest
  } = snapshot2;
  return {
    ...rest,
    messages: rest.messages.map(({ resources: _resources, ...message2 }) => message2)
  };
}

function mapProjectTaskSnapshot(value) {
  if (!value || typeof value !== "object") return;
  const task2 = value;
  if (!isIdentity$1(task2.id) || !Number.isSafeInteger(task2.revision) || Number(task2.revision) < 0)
    return;
  const resources = readIds(task2.outputs, "resourceId");
  const compositions = readIds(task2.placements, "compositionId");
  if (!resources || !compositions) return;
  return {
    id: task2.id,
    revision: Number(task2.revision),
    outputs: resources.map((resourceId2) => ({ resourceId: resourceId2 })),
    placements: compositions.map((compositionId) => ({ compositionId }))
  };
}

function matchesCanvasImportReceiptName(originalName, receiptName, hasVersionTarget = false) {
  if (!isSafeName(originalName) || !isSafeName(receiptName)) return false;
  if (receiptName === originalName) return true;
  if (hasVersionTarget) return false;
  const original = splitName(originalName);
  const receipt = splitName(receiptName);
  if (original.extension !== receipt.extension) return false;
  const prior = /\(([0-9]+)\)$/.exec(original.stem);
  const next2 = /\(([1-9][0-9]*)\)$/.exec(receipt.stem);
  if (!next2?.[1]) return false;
  const base2 = prior ? original.stem.slice(0, prior.index) : original.stem;
  return receipt.stem.slice(0, next2.index) === base2 && BigInt(next2[1]) > BigInt(prior?.[1] ?? "0");
}

const only = (value, keys2) => Object.keys(value).every((key2) => keys2.includes(key2));

const only$1 = (value, fields2) => Object.keys(value).every((key2) => fields2.includes(key2));

function parseCanvasV3ImageImportResult(value) {
  const v2 = exact(value, [
    "importId",
    "resourceId",
    "versionId",
    "name",
    "mimeType",
    "width",
    "height"
  ]);
  if (typeof v2.importId !== "string" || v2.importId.length !== 36 || !UUID$1.test(v2.importId))
    fail("invalid importId UUID");
  if (typeof v2.name !== "string" || !v2.name.trim() || v2.name.length > CANVAS_V3_LIMITS.titleLength)
    fail("invalid image name");
  if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(v2.mimeType))
    fail("invalid image mimeType");
  const width = integer$4(v2.width), height = integer$4(v2.height);
  if (width <= 0 || height <= 0 || width > 1e8 / height) fail("invalid image dimensions");
  return {
    importId: v2.importId,
    resourceId: id$7(v2.resourceId),
    versionId: id$7(v2.versionId),
    name: v2.name,
    mimeType: v2.mimeType,
    width,
    height
  };
}

function parseCanvasV3MediaImportResult(value) {
  const v2 = shape$1(
    value,
    ["importId", "resourceId", "versionId", "name", "mimeType", "mediaKind"],
    ["width", "height", "duration", "sizeBytes"]
  );
  if (typeof v2.importId !== "string" || v2.importId.length !== 36 || !UUID$1.test(v2.importId))
    fail("invalid importId UUID");
  if (typeof v2.name !== "string" || !v2.name.trim() || v2.name.length > CANVAS_V3_LIMITS.titleLength)
    fail("invalid media name");
  if (v2.mediaKind !== "video" && v2.mediaKind !== "audio") fail("invalid mediaKind");
  if (!CANVAS_V3_MEDIA_MIME_TYPES[v2.mediaKind].includes(v2.mimeType))
    fail("invalid media mimeType");
  const result = {
    importId: v2.importId,
    resourceId: id$7(v2.resourceId),
    versionId: id$7(v2.versionId),
    name: v2.name,
    mimeType: v2.mimeType,
    mediaKind: v2.mediaKind
  };
  for (const key2 of ["width", "height"]) {
    if (Object.hasOwn(v2, key2)) {
      const dimension = integer$4(v2[key2]);
      if (dimension <= 0) fail("invalid media dimensions");
      result[key2] = dimension;
    }
  }
  if (Object.hasOwn(v2, "duration")) {
    result.duration = finite$1(v2.duration);
    if (result.duration < 0) fail("invalid media duration");
  }
  if (Object.hasOwn(v2, "sizeBytes")) result.sizeBytes = integer$4(v2.sizeBytes, true);
  return result;
}

function parseCanvasV3MediaReferenceOrigin(value) {
  const v2 = exact(value, ["resourceId", "versionId", "start", "end"]);
  const start2 = finite$1(v2.start);
  const end2 = finite$1(v2.end);
  if (start2 < 0 || end2 <= start2 || end2 > 24 * 60 * 60) fail("invalid reference range");
  return { resourceId: id$7(v2.resourceId), versionId: id$7(v2.versionId), start: start2, end: end2 };
}

const parseCanvasV3MediaVersionTarget = parseCanvasV3ImageVersionTarget;

function parseProjectResourceReadResults(value, count2) {
  array$2(value);
  if (value.length !== count2) invalid$5();
  for (const item of value) {
    object$3(item);
    if (item.ok === true) detail(item.detail);
    else if (item.ok === false) {
      object$3(item.error);
      enumeration$1(item.error.code, Object.values(ProjectResourceReadErrorCode));
      string$1(item.error.message);
    } else invalid$5();
  }
  return value;
}

const Identifier = /^[\w$\xa1-\uffff][\w$\d\xa1-\uffff]*$/;

function has(target, key2) {
  return target instanceof Map ? target.has(key2) : Object.prototype.hasOwnProperty.call(target, key2);
}





const CANVAS_MEDIA_IMPORT_MAX_BYTES = 512 * 1024 * 1024;

const CANVAS_TEXT_REQUEST_LIMIT = 1024 * 1024;

const CANVAS_V3_LIMITS = {
  nodes: 1e4,
  edges: 2e4,
  changes: 3e4,
  idLength: 256,
  titleLength: 4096,
  promptLength: 2e4,
  draftReferences: 64,
  batchCommands: 64,
  importItems: 100,
  contentBatch: 200
};

const CANVAS_V3_MEDIA_MIME_TYPES = {
  video: ["video/mp4", "video/webm", "video/quicktime"],
  audio: [
    "audio/mpeg",
    "audio/mp4",
    "audio/aac",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/webm",
    "audio/flac",
    "audio/x-flac"
  ]
};

const CHAT_FRAME_COMPOSITION_LIMIT = 32;

const CHAT_FRAME_RESOURCE_LIMIT = 32;

const CHAT_SESSION_DRAFT_LIMIT = 2e4;

const CHAT_SESSION_LIMIT = 500;

const CHAT_SESSION_MESSAGE_LIMIT = 1e3;

const CHAT_SESSION_TEXT_LIMIT = 2e5;

const CHAT_SESSION_TITLE_LIMIT = 500;

const CHAT_SESSION_TOTAL_RESOURCE_LIMIT = 256;

const CHAT_SESSION_TOTAL_TEXT_LIMIT = 1e6;

const DIRECTOR_BUNDLE_LIMIT = 256 * 1024 * 1024;

const DIRECTOR_VIDEO_LIMIT = 32 * 1024 * 1024;

const DIRECTOR_VIDEO_REQUEST_LIMIT = 64 * 1024;

const DOCUMENT_FRAME_REQUEST_LIMIT = 8 * 1024 * 1024;

const ERROR_CODES = /* @__PURE__ */ new Set([
  "PAGE_STORAGE_STALE_WRITER",
  "PAGE_STORAGE_STALE_REVISION",
  "PAGE_STORAGE_QUARANTINED",
  "PAGE_STORAGE_NOT_QUARANTINED",
  "PAGE_STORAGE_INVALID",
  "PAGE_STORAGE_LIMIT",
  "PAGE_STORAGE_SCOPE_RETIRED",
  "PAGE_STORAGE_UNAVAILABLE",
  "PAGE_STORAGE_TIMEOUT",
  "PAGE_STORAGE_REJECTED"
]);

const HOST_PREFERENCE_KEYS = Object.freeze([
  "hilo:canvas:prompt-font-size",
  "hilo:canvas:video-muted",
  "hilo:canvas-v3:image-model-preference:v1",
  "hilo:canvas-v3:text-model-preference:v1",
  "assetPicker.view"
]);

const NATIVE_SAVE_FILE_MAX_BYTES = 512 * 1024 * 1024;

const NATIVE_SAVE_MAX_FILES = 500;

const NATIVE_SAVE_TOTAL_MAX_BYTES = 1024 * 1024 * 1024;

const PAGE_STORAGE_MAX_KEYS = 64;

const PAGE_STORAGE_NAMESPACES = Object.freeze({ "canvas-v3": "hilo:canvas-v3:" });

const PAGE_STORAGE_SCOPE_LIMIT = 4 * 1024 * 1024;

const PAGE_STORAGE_VALUE_LIMIT = 1024 * 1024;

const PROJECT_RESOURCE_FRAME_REQUEST_LIMIT = 1024 * 1024;

var ProjectResourceReadErrorCode = /* @__PURE__ */ ((ProjectResourceReadErrorCode2) => {
  ProjectResourceReadErrorCode2["RESOURCE_NOT_FOUND"] = "PROJECT_RESOURCE_NOT_FOUND";
  ProjectResourceReadErrorCode2["VERSION_NOT_FOUND"] = "PROJECT_VERSION_NOT_FOUND";
  ProjectResourceReadErrorCode2["VERSION_RESOURCE_MISMATCH"] = "PROJECT_VERSION_RESOURCE_MISMATCH";
  ProjectResourceReadErrorCode2["CURRENT_VERSION_UNAVAILABLE"] = "PROJECT_CURRENT_VERSION_UNAVAILABLE";
  return ProjectResourceReadErrorCode2;
})(ProjectResourceReadErrorCode || {});

const REQUEST_LIMIT = 1024 * 1024;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const UUID$1 = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function array$2(value) {
  if (!Array.isArray(value)) invalid$5();
}

function detail(value) {
  object$3(value);
  resource(value.resource);
  array$2(value.dependencies);
  if (value.version !== null) {
    version(value.version);
    if (value.version.resourceId !== value.resource.resourceId) invalid$5();
  } else if (value.dependencies.length) invalid$5();
  for (const dep of value.dependencies) {
    object$3(dep);
    id$5(dep.resourceId);
    id$5(dep.versionId);
    enumeration$1(dep.role, Object.values(AssetRole));
    if (dep.inputIndex !== void 0) integer$2(dep.inputIndex, 0);
  }
}

function enumeration$1(value, values2) {
  if (!values2.includes(value)) invalid$5();
}

function exact(value, keys2) {
  const result = object$5(value);
  const actual = Object.keys(result);
  if (actual.length !== keys2.length || actual.some((key2) => !keys2.includes(key2)))
    fail("unknown or missing field");
  return result;
}

function fail(message2) {
  throw new Error(`Invalid Canvas V3: ${message2}`);
}

function finite$1(value, positive2 = false) {
  if (typeof value !== "number" || !Number.isFinite(value) || positive2 && value <= 0)
    fail("invalid coordinate/size");
  return value;
}

const hasControl$1 = (value) => Array.from(value).some((c3) => c3.charCodeAt(0) < 32 || c3.charCodeAt(0) === 127);

function hasGroupFields(value) {
  return isParent(value) && Array.isArray(value.nodeIds) && value.nodeIds.length <= MAX_IDENTITIES$1 && value.nodeIds.every(isNodeIdentity) && new Set(value.nodeIds).size === value.nodeIds.length;
}

function id$7(value) {
  if (typeof value !== "string" || !value.trim() || value.length > CANVAS_V3_LIMITS.idLength || forbidden.has(value))
    fail("invalid id");
  return value;
}

function integer$4(value, nonnegative = false) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || nonnegative && value < 0)
    fail("invalid integer");
  return value;
}

function invalid$5() {
  throw new Error("Invalid Resource HTTP response");
}

function isChatSessionEditingSnapshot(value) {
  if (!record$a(value) || !keys$1(value, [
    "editor",
    "document",
    "annotations",
    "activeAnnotationId",
    "selection",
    "submission",
    "command"
  ]) || !editor(value.editor) || !document$1(value.document) || !annotations(value.annotations) || !(value.activeAnnotationId === null || id$9(value.activeAnnotationId)) || !selection(value.selection))
    return false;
  if (value.command !== void 0 && (!record$a(value.command) || !keys$1(value.command, ["revision", "command"]) || !Number.isSafeInteger(value.command.revision) || value.command.revision <= 0 || !isChatSessionAnnotationCommand(value.command.command)))
    return false;
  if (value.submission !== void 0 && (!record$a(value.submission) || !keys$1(value.submission, ["requestId", "status", "annotations"]) || !id$9(value.submission.requestId) || value.submission.status !== "accepted" || !annotations(value.submission.annotations, false)))
    return false;
  return bounded(value);
}

function isChatSessionExternalUrl(value) {
  if (typeof value !== "string" || value.length > 4096 || [...value].some((character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127))
    return false;
  try {
    const url2 = new URL(value);
    return (url2.protocol === "http:" || url2.protocol === "https:") && !url2.username && !url2.password;
  } catch {
    return false;
  }
}

function isChatSessionId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_.:-]{1,256}$/.test(value);
}

function isChatSessionTextEditEvent(value) {
  if (!record$a(value) || !id$9(value.nodeId) || !id$9(value.editSessionId)) return false;
  const common = ["type", "nodeId", "editSessionId"];
  let valid2 = false;
  switch (value.type) {
    case "open":
    case "document":
      valid2 = keys$1(value, [...common, "document"]) && document$1(value.document);
      break;
    case "annotations":
      valid2 = keys$1(value, [...common, "annotations"]) && annotations(value.annotations);
      break;
    case "activate":
      valid2 = keys$1(value, [...common, "id"]) && (value.id === null || id$9(value.id));
      break;
    case "selection":
      valid2 = keys$1(value, [...common, "selection"]) && selection(value.selection);
      break;
    case "close":
      valid2 = keys$1(value, common);
      break;
    case "command":
      valid2 = keys$1(value, [...common, "command"]) && isChatSessionAnnotationCommand(value.command);
      break;
  }
  return valid2 && bounded(value, CHAT_EDIT_EVENT_LIMIT);
}

const isCount = (value) => Number.isSafeInteger(value) && value >= 0;

function isDirectorAssetPath(v2) {
  return typeof v2 === "string" && v2.length <= 1024 && v2.split("/").every((p3) => !!p3 && p3 !== "." && p3 !== ".." && !/[\\:%?#]/.test(p3) && clean$2(p3));
}

function isHostFileName(value) {
  return typeof value === "string" && value.length > 0 && value.trim() === value && ![".", ".."].includes(value) && new TextEncoder().encode(value).byteLength <= 255 && !hasControl$1(value) && !/[/\\:]/.test(value);
}

const isIdentity$2 = (value, limit = 512) => typeof value === "string" && value.length > 0 && value.length <= limit && !!value.trim() && !Array.from(value).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);

function isPageStorageKey(namespace2, key2) {
  const prefix = PAGE_STORAGE_NAMESPACES[namespace2];
  return typeof key2 === "string" && key2.length > prefix.length && key2.length <= PAGE_STORAGE_KEY_LIMIT && key2.startsWith(prefix) && !Array.from(key2).some((c3) => c3.charCodeAt(0) < 32 || c3.charCodeAt(0) === 127);
}

function isRecord$e(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isSafeName(name2) {
  return name2.length > 0 && name2 !== "." && name2 !== ".." && !/[/\\:]/.test(name2) && ![...name2].some((c3) => c3.charCodeAt(0) < 32 || c3.charCodeAt(0) === 127);
}

function isText(value, limit) {
  return typeof value === "string" && value.length <= limit;
}

function jsonObject(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : void 0;
  } catch {
    return void 0;
  }
}

function object$3(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid$5();
}

function onlyKeys(value, keys2) {
  return Object.keys(value).every((key2) => keys2.includes(key2));
}

function parseCanvasV3ImageVersionTarget(value) {
  const v2 = shape$1(value, ["resourceId", "baseVersionId"], ["createResource"]);
  if (Object.hasOwn(v2, "createResource") && v2.createResource !== true) fail("invalid import mode");
  return {
    resourceId: id$7(v2.resourceId),
    baseVersionId: id$7(v2.baseVersionId),
    ...v2.createResource === true ? { createResource: true } : {}
  };
}

function parseEditorFocus(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || JSON.stringify(value).length > 2048)
    throw new Error("INVALID_EDITOR_FOCUS");
  const v2 = value;
  if (Object.keys(v2).some(
    (k2) => ![
      "capabilityId",
      "target",
      "baseVersionId",
      "draftRevision",
      "editSessionId",
      "selection",
      "availability"
    ].includes(k2)
  ) || !isEditorCapabilityId(v2.capabilityId) || !id$8(v2.baseVersionId) || !id$8(v2.editSessionId) || typeof v2.draftRevision !== "number" || !Number.isSafeInteger(v2.draftRevision) || v2.draftRevision < 0 || !["ready", "starting", "unavailable"].includes(String(v2.availability)))
    throw new Error("INVALID_EDITOR_FOCUS");
  if (!v2.target || typeof v2.target !== "object" || Array.isArray(v2.target))
    throw new Error("INVALID_EDITOR_FOCUS");
  const target = v2.target;
  if (!id$8(target.sourceResourceId) || Object.entries(target).some(
    ([key2, entry]) => !["sourceResourceId", "compositionId", "nodeId", "canvasId"].includes(key2) || !id$8(entry)
  ))
    throw new Error("INVALID_EDITOR_FOCUS");
  return {
    capabilityId: v2.capabilityId,
    target: {
      ...typeof target.sourceResourceId === "string" ? { sourceResourceId: target.sourceResourceId } : {},
      ...typeof target.compositionId === "string" ? { compositionId: target.compositionId } : {},
      ...typeof target.nodeId === "string" ? { nodeId: target.nodeId } : {},
      ...typeof target.canvasId === "string" ? { canvasId: target.canvasId } : {}
    },
    baseVersionId: v2.baseVersionId,
    draftRevision: v2.draftRevision,
    editSessionId: v2.editSessionId,
    selection: parseSelection(v2.capabilityId, v2.selection),
    availability: String(v2.availability)
  };
}

function readIds(value, key2) {
  if (!Array.isArray(value) || value.length > MAX_IDENTITIES) return;
  const ids2 = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || !isIdentity$1(item[key2])) return;
    ids2.push(item[key2]);
  }
  return [...new Set(ids2)];
}

function resourcesValid(value, display) {
  if (value === void 0) return true;
  if (!Array.isArray(value) || value.length > CHAT_SESSION_RESOURCE_LIMIT) return false;
  const seen = /* @__PURE__ */ new Set();
  return value.every((item) => {
    if (!(display ? isChatSessionResource(item) : isChatSessionResourceRef(item))) return false;
    const ref = item;
    const key2 = JSON.stringify([ref.resourceId, ref.versionId]);
    if (seen.has(key2)) return false;
    seen.add(key2);
    return true;
  });
}

function shape$1(value, required2, optional2) {
  const raw2 = object$5(value);
  return exact(raw2, [...required2, ...optional2.filter((key2) => Object.hasOwn(raw2, key2))]);
}

function sidebarOrderParentKey(parent) {
  return JSON.stringify([parent.kind, parent.parentId]);
}

function splitName(name2) {
  const dot2 = name2.lastIndexOf(".");
  const extension2 = dot2 > 0 ? name2.slice(dot2) : "";
  return { stem: name2.slice(0, name2.length - extension2.length), extension: extension2 };
}

function string$1(value) {
  if (typeof value !== "string") invalid$5();
}

const uuid = (v2) => typeof v2 === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v2);

var AssetRole = /* @__PURE__ */ ((AssetRole2) => {
  AssetRole2["Source"] = "source";
  AssetRole2["InitImage"] = "init_image";
  AssetRole2["Style"] = "style";
  AssetRole2["Subject"] = "subject";
  AssetRole2["Mask"] = "mask";
  AssetRole2["Pose"] = "pose";
  AssetRole2["Depth"] = "depth";
  AssetRole2["AudioTrack"] = "audio_track";
  AssetRole2["Subtitle"] = "subtitle";
  AssetRole2["Frame"] = "frame";
  AssetRole2["Reference"] = "reference";
  return AssetRole2;
})(AssetRole || {});

const CHAT_EDIT_EVENT_LIMIT = 25e4;

const CHAT_SESSION_RESOURCE_LIMIT = 32;

const MAX_IDENTITIES = 2048;

const PAGE_STORAGE_KEY_LIMIT = 256;

function annotations(value, allowUnlocated = true) {
  if (!Array.isArray(value) || value.length > CHAT_EDIT_ANNOTATION_LIMIT) return false;
  const ids2 = /* @__PURE__ */ new Set();
  return value.every((item) => {
    if (!record$a(item) || !keys$1(item, ["id", "seq", "quote", "comment", "targets"]) || !id$9(item.id) || ids2.has(item.id) || !Number.isSafeInteger(item.seq) || item.seq <= 0 || !text$a(item.quote, 1024) || !text$a(item.comment, 2e4) || !Array.isArray(item.targets) || !allowUnlocated && item.targets.length === 0 || item.targets.length > CHAT_EDIT_TARGET_LIMIT || !item.targets.every(anchor))
      return false;
    ids2.add(item.id);
    return true;
  });
}

function bounded(value, limit = CHAT_EDIT_PAYLOAD_LIMIT) {
  return JSON.stringify(value).length <= limit;
}

const clean$2 = (v2) => [...v2].every((c3) => c3.charCodeAt(0) >= 32 && c3.charCodeAt(0) !== 127);

function document$1(value) {
  return record$a(value) && keys$1(value, ["resourceId", "versionId", "name"]) && typeof value.resourceId === "string" && /^[a-zA-Z0-9_-]{1,256}$/.test(value.resourceId) && typeof value.versionId === "string" && /^[a-zA-Z0-9_-]{1,256}$/.test(value.versionId) && text$a(value.name, 1024);
}

function editor(value) {
  return record$a(value) && keys$1(value, ["nodeId", "editSessionId"]) && id$9(value.nodeId) && id$9(value.editSessionId);
}

const forbidden = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);

function id$5(value) {
  string$1(value);
  if (!value.trim() || value.includes("\0")) invalid$5();
}

const id$8 = (x2) => typeof x2 === "string" && /^[a-zA-Z0-9_.:-]{1,256}$/.test(x2);

function id$9(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_.:-]{1,256}$/.test(value);
}

function integer$2(value, min2 = 1) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min2) invalid$5();
}

function isChatSessionAnnotationCommand(value) {
  if (!record$a(value)) return false;
  if (value.type === "clear" || value.type === "clearSelection") return keys$1(value, ["type"]);
  return (value.type === "locate" || value.type === "delete") && keys$1(value, ["type", "id"]) && id$9(value.id);
}

function isChatSessionResource(value) {
  return isRecord$e(value) && onlyKeys(value, ["resourceId", "versionId", "name", "mimeType", "kind"]) && resourceId(value.resourceId) && resourceId(value.versionId) && isText(value.name, 1024) && typeof value.mimeType === "string" && /^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/.test(value.mimeType) && value.mimeType.length <= 128 && (value.kind === void 0 || typeof value.kind === "string" && RESOURCE_KINDS.has(value.kind));
}

function isChatSessionResourceRef(value) {
  return isRecord$e(value) && onlyKeys(value, ["resourceId", "versionId"]) && resourceId(value.resourceId) && resourceId(value.versionId);
}

function isEditorCapabilityId(value) {
  return typeof value === "string" && EDITOR_CAPABILITY_IDS.includes(value);
}

function keys$1(value, allowed) {
  return Object.keys(value).every((key2) => allowed.includes(key2));
}

function object$5(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("expected object");
  const proto2 = Object.getPrototypeOf(value);
  if (proto2 !== Object.prototype && proto2 !== null) fail("non-plain object");
  for (const key2 of Reflect.ownKeys(value)) {
    if (typeof key2 !== "string" || forbidden.has(key2)) fail("unsafe key");
    const d2 = Object.getOwnPropertyDescriptor(value, key2);
    if (!d2 || !("value" in d2) || !d2.enumerable) fail("accessor or hidden field");
  }
  return value;
}

function parseSelection(capabilityId, selection2) {
  if (!selection2 || typeof selection2 !== "object" || Array.isArray(selection2))
    throw new Error("INVALID_EDITOR_SELECTION");
  const value = selection2;
  const list2 = (key2, limit) => {
    const items = value[key2] ?? [];
    if (!Array.isArray(items) || items.length > limit || !items.every(id$8))
      throw new Error("INVALID_EDITOR_SELECTION");
    return [...items];
  };
  if (capabilityId === DIRECTOR_CAPABILITY_ID) {
    if (Object.keys(value).some((key2) => key2 !== "objectIds"))
      throw new Error("INVALID_EDITOR_SELECTION");
    return { objectIds: list2("objectIds", 30) };
  }
  if (Object.keys(value).some((key2) => !["clipIds", "trackIds", "playheadSec"].includes(key2)))
    throw new Error("INVALID_EDITOR_SELECTION");
  const playhead = value.playheadSec;
  if (playhead !== void 0 && (typeof playhead !== "number" || !Number.isFinite(playhead) || playhead < 0))
    throw new Error("INVALID_EDITOR_SELECTION");
  return {
    clipIds: list2("clipIds", 30),
    trackIds: list2("trackIds", 10),
    ...playhead === void 0 ? {} : { playheadSec: Math.round(playhead * 1e3) / 1e3 }
  };
}

function record$a(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resource(value) {
  object$3(value);
  id$5(value.resourceId);
  string$1(value.name);
  enumeration$1(value.kind, [
    ProjectResourceKind.TEXT_DOCUMENT,
    ProjectResourceKind.IMAGE,
    ProjectResourceKind.VIDEO,
    ProjectResourceKind.AUDIO,
    ProjectResourceKind.FILE
  ]);
  enumeration$1(value.lifecycle, Object.values(ProjectResourceLifecycle));
  integer$2(value.metadataRevision);
  string$1(value.createdAt);
  string$1(value.updatedAt);
  if (value.currentVersionId !== void 0) id$5(value.currentVersionId);
}

function selection(value) {
  return record$a(value) && keys$1(value, ["anchor", "anchors", "oversizedLength"]) && (value.anchor === null || anchor(value.anchor)) && (value.anchors === void 0 || Array.isArray(value.anchors) && value.anchors.length <= CHAT_EDIT_SELECTION_LIMIT && value.anchors.every(anchor)) && (value.oversizedLength === void 0 || Number.isSafeInteger(value.oversizedLength) && value.oversizedLength > TEXT_EDIT_SELECTION_MAX_LENGTH && value.anchor === null);
}

function version(value) {
  object$3(value);
  id$5(value.versionId);
  id$5(value.resourceId);
  nullableId(value.parentVersionId);
  id$5(value.relativePath);
  enumeration$1(value.source, Object.values(ProjectResourceSource));
  enumeration$1(value.status, Object.values(ProjectResourceVersionStatus));
  string$1(value.createdAt);
  string$1(value.updatedAt);
  if (value.rootRuntimeSessionId !== void 0) id$5(value.rootRuntimeSessionId);
  if (value.taskId !== void 0) id$5(value.taskId);
  if (value.contentRevision !== void 0) integer$2(value.contentRevision);
  if (value.authoringTurnId !== void 0) id$5(value.authoringTurnId);
}

const CHAT_EDIT_ANNOTATION_LIMIT = 128;

const CHAT_EDIT_PAYLOAD_LIMIT = 1e6;

const CHAT_EDIT_SELECTION_LIMIT = 128;

const CHAT_EDIT_TARGET_LIMIT = 32;

const DIRECTOR_CAPABILITY_ID = "plugin:director-stage";

const EDITOR_CAPABILITY_IDS = [DIRECTOR_CAPABILITY_ID, CLIP_STUDIO_CAPABILITY_ID];

var ProjectResourceLifecycle = /* @__PURE__ */ ((ProjectResourceLifecycle2) => {
  ProjectResourceLifecycle2["ACTIVE"] = "active";
  ProjectResourceLifecycle2["MISSING"] = "missing";
  ProjectResourceLifecycle2["DELETED"] = "deleted";
  return ProjectResourceLifecycle2;
})(ProjectResourceLifecycle || {});

var ProjectResourceSource = /* @__PURE__ */ ((ProjectResourceSource2) => {
  ProjectResourceSource2["IMPORT"] = "import";
  ProjectResourceSource2["GENERATE"] = "generate";
  ProjectResourceSource2["COPY"] = "copy";
  return ProjectResourceSource2;
})(ProjectResourceSource || {});

const RESOURCE_KINDS = /* @__PURE__ */ new Set(["image", "video", "audio", "text", "table", "file"]);

const TEXT_EDIT_SELECTION_MAX_LENGTH = 2e4;

function anchor(value) {
  return record$a(value) && keys$1(value, ["exact", "prefix", "suffix", "occurrence"]) && text$a(value.exact, TEXT_EDIT_SELECTION_MAX_LENGTH) && (value.prefix === void 0 || text$a(value.prefix, TEXT_EDIT_SELECTION_MAX_LENGTH)) && (value.suffix === void 0 || text$a(value.suffix, TEXT_EDIT_SELECTION_MAX_LENGTH)) && (value.occurrence === void 0 || Number.isSafeInteger(value.occurrence) && value.occurrence >= 0);
}

function nullableId(value) {
  if (value !== null) id$5(value);
}

const resourceId = (value) => typeof value === "string" && /^[a-zA-Z0-9_-]{1,256}$/.test(value);

function text$a(value, limit) {
  return typeof value === "string" && value.length <= limit;
}



const PATH_LIMIT = 4096;

const hasControl = (value) => Array.from(value).some((c3) => c3.charCodeAt(0) < 32 || c3.charCodeAt(0) === 127);

function isProjectRelativeDocumentPath(value) {
  if (typeof value !== "string" || !value || value.length > PATH_LIMIT) return false;
  if (value.trim() !== value || hasControl(value)) return false;
  if (value.startsWith("/") || value.startsWith("~") || value.includes("\\")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.includes("?") || value.includes("#"))
    return false;
  if (/%[0-9a-f]{2}/i.test(value)) return false;
  return value.split("/").every((segment) => !!segment && segment !== "." && segment !== "..");
}

export {
  serveFrameCanvas,
  serveFrameCanvasHost,
  serveFrameChat,
  serveFrameChatSession,
  serveFrameDocuments,
  serveFrameEditorEvents,
  serveFrameGeneration,
  serveFrameMedia,
  serveFramePageStorage,
  createFramePersistenceHost,
  serveFrameResourceActions,
  serveFrameResourceImageReveal,
  serveFrameSidebarOrder,
  serveFrameTaskEvents,
  CANVAS_FRAME_DETACHED,
  CANVAS_HOST_REQUEST_REJECTED,
  CANVAS_POSTER_MAX_BYTES,
  CANVAS_TEXT_ROUTES,
  CANVAS_V3_ROUTES,
  CHAT_TIMEOUT_MS,
  DOCUMENT_FRAME_REQUEST_REJECTED,
  DOCUMENT_FRAME_RESPONSE_LIMIT,
  FLUSH_TIMEOUT_MS,
  HILO_SOURCE_HEADER,
  HOST_BILLING_PRICING_PATH,
  HOST_BILLING_PRICING_RESPONSE_LIMIT,
  HOST_LUT_ROUTES,
  HostFailure,
  MAX_FLUSH_REQUESTS,
  MAX_IMAGE_IMPORTS,
  MAX_IMAGE_READS,
  MAX_IN_FLIGHT$1,
  MAX_IN_FLIGHT$2,
  MAX_IN_FLIGHT$3,
  MAX_IN_FLIGHT$4,
  MAX_IN_FLIGHT$5,
  MAX_IN_FLIGHT$6,
  MAX_IN_FLIGHT$7,
  MAX_IN_FLIGHT$8,
  MAX_IN_FLIGHT$9,
  MAX_PENDING,
  MAX_UPLOADS,
  PAGE_STORAGE_PROTOCOL_VERSION,
  PRE_SEND_REJECTION_CODES,
  PROJECTION_UNSUPPORTED,
  PROJECT_RESOURCE_FRAME_RESPONSE_LIMIT,
  REQUEST_TIMEOUT_MS,
  REQUEST_TIMEOUT_MS$1,
  REQUEST_TIMEOUT_MS$2,
  SidebarOrderError,
  canvasHostToolReadPath,
  canvasHttpRequest,
  canvasPosterPath,
  createCanvasImageImporter,
  createCanvasMediaImporter,
  createDirectorTransport,
  documentFrameHttp,
  errorStatus,
  errorStatus$1,
  errorStatus$2,
  freezeGrants,
  hostLutDeletePath,
  httpResult,
  isCanvasFrameDetached,
  isCanvasFrameRequest,
  isCanvasHostFrameRequest,
  isChatFrameRequest,
  isChatFrameResponse,
  isChatSessionFrameId,
  isChatSessionFrameRequest,
  isDocumentFrameRequest,
  isGenerationFrameRequest,
  isHostMediaGrant,
  isMediaFrameRequest,
  isPageStorageFrameRequest,
  isProjectPersistenceMessage,
  isResourceHostActionRequest,
  isResourceRevealFrameRequest,
  isSidebarOrderFrameRequest,
  isSidebarOrderState,
  isTextCompletionFrameRequest,
  localCopy,
  mapProjectTaskEvent,
  pageStorageErrorCode,
  projectSnapshot,
  readBoundedBody,
  readCanvasImageBytes,
  readResourceAudioWaveformBytes,
  sidebarOrderErrorCode,
  CANVAS_HOST_JSON_RESPONSE_LIMIT,
  CANVAS_POSTER_WIDTHS,
  CANVAS_V3_AGENT_COMPOSITION_PAGE_LIMIT,
  CANVAS_V3_IMAGE_MAX_BYTES,
  CANVAS_V3_TEXT_GENERATION_ROUTES,
  CHAT_FRAME_MESSAGE_ID_LIMIT,
  CHAT_FRAME_TEXT_LIMIT,
  DIRECTOR_ASSET_LIMIT,
  DIRECTOR_EDITOR_REQUEST_LIMIT,
  DIRECTOR_JSON_LIMIT,
  ERROR_CODES$2,
  GRANTS,
  HOST_DOCUMENT_CHECKPOINT_PATH,
  HOST_DOCUMENT_READ_ROUTE,
  HOST_DOCUMENT_WRITE_PATH,
  HOST_PREFERENCE_VALUE_LIMIT,
  HOST_RESOURCE_TAG_PATHS,
  HOST_SPEECH_VOICES_PATH,
  LUT_IMPORT_MAX_BYTES,
  MAX_IDENTITIES$1,
  MAX_RECEIPT_BYTES,
  MEDIA_IMPORT_ID,
  NATIVE_IMAGE_DATA_MAX_BYTES,
  PROJECT_RESOURCE_HTTP_ROUTES,
  PageStorageError,
  ProjectResourceKind,
  ProjectResourceVersionStatus,
  RESPONSE_LIMIT,
  TEXT_COMPLETION_PROMPT_LIMIT,
  TEXT_COMPLETION_PURPOSES,
  TEXT_COMPLETION_SYSTEM_LIMIT,
  canvasHostCapabilityOf,
  canvasImageImportPath,
  canvasImagePath,
  canvasMediaImportReceiptPath,
  hasOnlyKeys,
  hasValidCompositionRefs,
  hasValidResourceRefs,
  identity$6,
  PROJECT_NAME_MAX_CHARS,
  truncateProjectName,
  normalizeSkillContentLocale,
  selectSkillStructuredInfo,
  SKILL_GUIDE_PROMPT_DEFAULTS,
  SKILL_NAME_RE,
  isValidSkillName$1,
  skillVerticals,
  skillCategoryCodes,
  isBounded,
  isBoundedBody,
  isCanvasImageImport,
  isCanvasImageMimeType,
  isCanvasMediaImport,
  isCanvasTextGenerateBody,
  isChatSessionCommand,
  isChatSessionSnapshot,
  isChatText,
  isDirectorOperation,
  isFailureCode,
  isFrameId,
  isFrameId$1,
  isHostLutName,
  isHostNativeMediaSaveRequest,
  isHostNativeSaveFiles,
  isHostPreferenceKey,
  isId,
  isId$1,
  isId$2,
  isId$3,
  isIdentity,
  isIdentity$1,
  isJsonObjectBody,
  isLutName,
  isNodeIdentity,
  isPageStorageErrorCode,
  isPageStorageNamespace,
  isPageStorageWrite,
  isParent,
  isProjectPersistenceSnapshot,
  isRecord$d,
  isResourceVersion,
  isRevealableResourceId,
  isSaveOptions,
  isSidebarOrderGroups,
  isSidebarOrderMove,
  legacyChatSessionSnapshot,
  mapProjectTaskSnapshot,
  matchesCanvasImportReceiptName,
  only,
  only$1,
  parseCanvasV3ImageImportResult,
  parseCanvasV3MediaImportResult,
  parseCanvasV3MediaReferenceOrigin,
  parseCanvasV3MediaVersionTarget,
  parseProjectResourceReadResults,
  Identifier,
  has,
  CANVAS_MEDIA_IMPORT_MAX_BYTES,
  CANVAS_TEXT_REQUEST_LIMIT,
  CANVAS_V3_LIMITS,
  CANVAS_V3_MEDIA_MIME_TYPES,
  CHAT_FRAME_COMPOSITION_LIMIT,
  CHAT_FRAME_RESOURCE_LIMIT,
  CHAT_SESSION_DRAFT_LIMIT,
  CHAT_SESSION_LIMIT,
  CHAT_SESSION_MESSAGE_LIMIT,
  CHAT_SESSION_TEXT_LIMIT,
  CHAT_SESSION_TITLE_LIMIT,
  CHAT_SESSION_TOTAL_RESOURCE_LIMIT,
  CHAT_SESSION_TOTAL_TEXT_LIMIT,
  DIRECTOR_BUNDLE_LIMIT,
  DIRECTOR_VIDEO_LIMIT,
  DIRECTOR_VIDEO_REQUEST_LIMIT,
  DOCUMENT_FRAME_REQUEST_LIMIT,
  ERROR_CODES,
  HOST_PREFERENCE_KEYS,
  NATIVE_SAVE_FILE_MAX_BYTES,
  NATIVE_SAVE_MAX_FILES,
  NATIVE_SAVE_TOTAL_MAX_BYTES,
  PAGE_STORAGE_MAX_KEYS,
  PAGE_STORAGE_NAMESPACES,
  PAGE_STORAGE_SCOPE_LIMIT,
  PAGE_STORAGE_VALUE_LIMIT,
  PROJECT_RESOURCE_FRAME_REQUEST_LIMIT,
  ProjectResourceReadErrorCode,
  REQUEST_LIMIT,
  UUID,
  UUID$1,
  array$2,
  detail,
  enumeration$1,
  exact,
  fail,
  finite$1,
  hasControl$1,
  hasGroupFields,
  id$7,
  integer$4,
  invalid$5,
  isChatSessionEditingSnapshot,
  isChatSessionExternalUrl,
  isChatSessionId,
  isChatSessionTextEditEvent,
  isCount,
  isDirectorAssetPath,
  isHostFileName,
  isIdentity$2,
  isPageStorageKey,
  isRecord$e,
  isSafeName,
  isText,
  jsonObject,
  object$3,
  onlyKeys,
  parseCanvasV3ImageVersionTarget,
  parseEditorFocus,
  readIds,
  resourcesValid,
  shape$1,
  sidebarOrderParentKey,
  splitName,
  string$1,
  uuid,
  AssetRole,
  CHAT_EDIT_EVENT_LIMIT,
  CHAT_SESSION_RESOURCE_LIMIT,
  MAX_IDENTITIES,
  PAGE_STORAGE_KEY_LIMIT,
  annotations,
  bounded,
  clean$2,
  document$1,
  editor,
  forbidden,
  id$5,
  id$8,
  id$9,
  integer$2,
  isChatSessionAnnotationCommand,
  isChatSessionResource,
  isChatSessionResourceRef,
  isEditorCapabilityId,
  keys$1,
  object$5,
  parseSelection,
  record$a,
  resource,
  selection,
  version,
  CHAT_EDIT_ANNOTATION_LIMIT,
  CHAT_EDIT_PAYLOAD_LIMIT,
  CHAT_EDIT_SELECTION_LIMIT,
  CHAT_EDIT_TARGET_LIMIT,
  DIRECTOR_CAPABILITY_ID,
  EDITOR_CAPABILITY_IDS,
  ProjectResourceLifecycle,
  ProjectResourceSource,
  RESOURCE_KINDS,
  TEXT_EDIT_SELECTION_MAX_LENGTH,
  anchor,
  nullableId,
  resourceId,
  text$a,
};
