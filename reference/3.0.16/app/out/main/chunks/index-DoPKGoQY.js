import { randomUUID, createHash } from "node:crypto";
import { createServer } from "node:http";
import { writeFile, readFile, unlink, mkdir, copyFile, appendFile } from "node:fs/promises";
import { join, resolve, basename } from "node:path";
import { app, shell, ipcMain } from "electron";
import { z as load } from "./js-yaml-B0IoXaZA.js";
import "node:child_process";
import "node:fs";
const DEFAULT_TTL_MS = 30 * 60 * 1e3;
const DEFAULT_CLEANUP_INTERVAL_MS = 5 * 60 * 1e3;
const TERMINAL_STATUSES = /* @__PURE__ */ new Set([
  "success",
  "fail",
  "cancelled",
  "error"
]);
class TaskStore {
  records = /* @__PURE__ */ new Map();
  ttlMs;
  cleanupIntervalMs;
  cleanupTimer = null;
  constructor(options = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.cleanupIntervalMs = options.cleanupIntervalMs ?? DEFAULT_CLEANUP_INTERVAL_MS;
    this.startCleanupTimer();
  }
  /**
   * Allocate a new task record in `running` state. Returned record is the
   * authoritative reference held by the executor — mutating its fields is the
   * intended way to record progress (e.g. `record.currentStep++`).
   */
  create(name, totalSteps, requestedId) {
    if (requestedId && this.records.has(requestedId)) {
      throw new Error(`Task ${requestedId} already exists`);
    }
    const record = {
      id: requestedId ?? randomUUID(),
      name,
      status: "running",
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      totalSteps,
      currentStep: 0,
      completedSteps: [],
      cancelled: false
    };
    this.records.set(record.id, record);
    return record;
  }
  get(id) {
    return this.records.get(id);
  }
  list() {
    return Array.from(this.records.values()).map(toSummary);
  }
  /**
   * Mark a record cancelled. Returns the post-cancel status — the executor
   * loop checks the flag between steps, so the status may still be `running`
   * for a brief window until the current step finishes.
   *
   * Idempotent: cancelling an already-cancelled or terminal task is a no-op.
   */
  cancel(id) {
    const record = this.records.get(id);
    if (!record) return void 0;
    if (TERMINAL_STATUSES.has(record.status)) return record.status;
    record.cancelled = true;
    return record.status;
  }
  /**
   * Record a step's result and advance currentStep. Called by the executor
   * after each step returns. The store enforces nothing about ordering — the
   * executor is the single writer.
   */
  recordStep(id, result) {
    const record = this.records.get(id);
    if (!record) return;
    record.completedSteps.push(result);
    record.currentStep = record.completedSteps.length;
  }
  /**
   * Transition the record to a terminal state and attach the final story
   * result. After this call, `record.status` is one of success/fail/cancelled
   * and `completedAt` is populated.
   */
  finish(id, storyResult, status) {
    const record = this.records.get(id);
    if (!record) return;
    record.storyResult = storyResult;
    record.status = status;
    record.completedAt = storyResult.completedAt;
  }
  /**
   * Mark the record as a runtime error (IPC timeout, window destroyed, etc.).
   * Sets status='error' and stores the message; storyResult may be absent.
   */
  fail(id, error) {
    const record = this.records.get(id);
    if (!record) return;
    record.status = "error";
    record.error = error;
    record.completedAt = (/* @__PURE__ */ new Date()).toISOString();
  }
  /**
   * Stop the cleanup timer and drop all records. Called by TestDriverService
   * on dispose so the process can exit cleanly.
   */
  dispose() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.records.clear();
  }
  /** Public for hot-path tests / debug; production code should not call. */
  cleanupNow(now = Date.now()) {
    let removed = 0;
    for (const [id, record] of this.records) {
      if (!TERMINAL_STATUSES.has(record.status)) continue;
      if (!record.completedAt) continue;
      const completedMs = Date.parse(record.completedAt);
      if (Number.isNaN(completedMs)) continue;
      if (now - completedMs > this.ttlMs) {
        this.records.delete(id);
        removed++;
      }
    }
    return removed;
  }
  startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.cleanupNow();
    }, this.cleanupIntervalMs);
    this.cleanupTimer.unref?.();
  }
}
function toSummary(record) {
  return {
    id: record.id,
    name: record.name,
    status: record.status,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    totalSteps: record.totalSteps,
    currentStep: record.currentStep
  };
}
const MAX_BODY_SIZE = 20 * 1024 * 1024;
const MAX_SCREENSHOT_IDS_PER_REQUEST = 30;
const DEFAULT_ALLOWED_RENDERER_ORIGINS = ["app://."];
function parseBody(req) {
  return new Promise((resolve2, reject) => {
    const declaredSize = Number(req.headers["content-length"]);
    if (Number.isFinite(declaredSize) && declaredSize > MAX_BODY_SIZE) {
      req.resume();
      reject(new BodyTooLargeError());
      return;
    }
    const chunks = [];
    let totalSize = 0;
    req.on("data", (chunk) => {
      totalSize += chunk.length;
      if (totalSize > MAX_BODY_SIZE) {
        req.destroy();
        reject(new BodyTooLargeError());
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf-8");
        resolve2(raw.length > 0 ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
    req.on("error", reject);
  });
}
class BodyTooLargeError extends Error {
  statusCode = 413;
  constructor() {
    super(`Request body too large (limit: ${MAX_BODY_SIZE} bytes)`);
    this.name = "BodyTooLargeError";
  }
}
function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}
function applyCors(req, res, allowedOrigins) {
  const origin = req.headers.origin;
  if (origin !== void 0) {
    if (typeof origin !== "string" || !allowedOrigins.has(origin)) return false;
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return true;
}
function readOptionalStringField(body, key) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return void 0;
  const value = body[key];
  if (value === void 0 || value === null) return void 0;
  if (typeof value !== "string") {
    throw new Error(`Invalid ${key}: expected string`);
  }
  return value;
}
function readRequiredStringField(body, key) {
  const value = readOptionalStringField(body, key);
  if (!value) {
    throw new Error(`Missing ${key}: expected non-empty string`);
  }
  return value;
}
function readOptionalBooleanField(body, key) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return void 0;
  const value = body[key];
  if (value === void 0 || value === null) return void 0;
  if (typeof value !== "boolean") {
    throw new Error(`Invalid ${key}: expected boolean`);
  }
  return value;
}
class TestDriverServer {
  constructor(service, port = 18765, allowedOrigins = DEFAULT_ALLOWED_RENDERER_ORIGINS) {
    this.service = service;
    this.port = port;
    this.allowedOrigins = new Set(allowedOrigins);
  }
  server = null;
  allowedOrigins;
  start() {
    return new Promise((resolve2, reject) => {
      this.server = createServer((req, res) => {
        if (!applyCors(req, res, this.allowedOrigins)) {
          req.resume();
          sendJson(res, 403, { error: "Origin not allowed" });
          return;
        }
        void this.handleRequest(req, res);
      });
      this.server.on("error", reject);
      this.server.listen(this.port, "127.0.0.1", () => {
        resolve2();
      });
    });
  }
  stop() {
    return new Promise((resolve2) => {
      const finish = () => {
        void this.service.releaseAllTrackingScreenshots().finally(resolve2);
      };
      if (this.server) {
        this.server.close(finish);
      } else {
        finish();
      }
    });
  }
  async handleRequest(req, res) {
    const url = new URL(req.url ?? "/", `http://localhost:${this.port}`);
    const pathname = url.pathname;
    const method = req.method?.toUpperCase() ?? "GET";
    try {
      if (method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      if (method === "GET" && pathname === "/health") {
        sendJson(res, 200, {
          status: "ok",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          capabilities: {
            protectedCleanupLease: true,
            protectedCleanupRecovery: true,
            retrySafeStorySubmission: true
          }
        });
        return;
      }
      if (method === "GET" && pathname === "/state") {
        const state = await this.service.getAppState();
        sendJson(res, 200, state);
        return;
      }
      if (method === "POST" && pathname === "/step") {
        const body = await parseBody(req);
        const { step } = body;
        if (!step || typeof step !== "object") {
          sendJson(res, 400, {
            error: 'Missing or invalid "step" in request body'
          });
          return;
        }
        const result = await this.service.executeStep(step);
        sendJson(res, 200, { result });
        return;
      }
      if (method === "POST" && pathname === "/protected-cleanup-leases") {
        const body = await parseBody(req);
        const lease = await this.service.registerProtectedCleanupLease(body);
        sendJson(res, 201, lease);
        return;
      }
      if (method === "POST" && pathname === "/protected-cleanup-leases/recover") {
        const body = await parseBody(req);
        const recovery = await this.service.recoverProtectedCleanupLease(body);
        sendJson(res, 200, recovery);
        return;
      }
      if (method === "POST" && pathname === "/run-story") {
        const body = await parseBody(req);
        const { storyDir, steps, name, cleanupLeaseId, clientTaskId } = body;
        if (steps !== void 0 && !Array.isArray(steps)) {
          sendJson(res, 400, {
            error: '"steps" must be an array'
          });
          return;
        }
        if (!storyDir && (!steps || !Array.isArray(steps) || steps.length === 0)) {
          sendJson(res, 400, {
            error: 'Provide "steps" array or "storyDir" path'
          });
          return;
        }
        if (storyDir && steps && steps.length > 0) {
          sendJson(res, 400, {
            error: 'Provide either "steps" or "storyDir", not both'
          });
          return;
        }
        if (storyDir && typeof storyDir === "string" && storyDir.includes("..")) {
          sendJson(res, 400, {
            error: 'Path traversal not allowed in "storyDir"'
          });
          return;
        }
        if (parseWaitQuery(url)) {
          const result = await this.service.runStory(
            storyDir,
            steps,
            name,
            cleanupLeaseId,
            clientTaskId
          );
          sendJson(res, 200, { result });
          return;
        }
        const handle = await this.service.runStoryAsync(
          storyDir,
          steps,
          name,
          cleanupLeaseId,
          clientTaskId
        );
        sendJson(res, 202, handle);
        return;
      }
      if (method === "GET" && pathname === "/tasks") {
        sendJson(res, 200, { tasks: this.service.taskStore.list() });
        return;
      }
      const taskMatch = pathname.match(/^\/tasks\/([^/]+)$/);
      if (method === "GET" && taskMatch) {
        const record = this.service.taskStore.get(decodeURIComponent(taskMatch[1]));
        if (!record) {
          sendJson(res, 404, { error: "Task not found" });
          return;
        }
        sendJson(res, 200, record);
        return;
      }
      const cancelMatch = pathname.match(/^\/tasks\/([^/]+)\/cancel$/);
      if (method === "POST" && cancelMatch) {
        const status = this.service.taskStore.cancel(decodeURIComponent(cancelMatch[1]));
        if (status === void 0) {
          sendJson(res, 404, { error: "Task not found" });
          return;
        }
        sendJson(res, 200, { ok: true, status });
        return;
      }
      if (method === "POST" && pathname === "/screenshot") {
        const screenshot = await this.service.createTrackingScreenshot();
        sendJson(res, 200, screenshot);
        return;
      }
      if (method === "POST" && pathname === "/screenshot/replace") {
        const body = await parseBody(req);
        const screenshotId = readRequiredStringField(body, "screenshotId");
        const dataUrl = readRequiredStringField(body, "dataUrl");
        await this.service.replaceTrackingScreenshot(screenshotId, dataUrl);
        sendJson(res, 200, { ok: true, screenshotId });
        return;
      }
      if (method === "POST" && pathname === "/screenshot/read") {
        const body = await parseBody(req);
        const screenshotId = readRequiredStringField(body, "screenshotId");
        const dataUrl = await this.service.readTrackingScreenshot(screenshotId);
        sendJson(res, 200, { screenshotId, dataUrl });
        return;
      }
      if (method === "POST" && pathname === "/screenshot/available") {
        const body = await parseBody(req);
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          sendJson(res, 400, { error: "Invalid screenshot availability request" });
          return;
        }
        const screenshotIds = body.screenshotIds;
        if (!Array.isArray(screenshotIds) || screenshotIds.length > MAX_SCREENSHOT_IDS_PER_REQUEST || !screenshotIds.every((id) => typeof id === "string" && id.length > 0)) {
          sendJson(res, 400, { error: "Invalid screenshotIds" });
          return;
        }
        sendJson(res, 200, {
          screenshotIds: this.service.getAvailableTrackingScreenshotIds(screenshotIds)
        });
        return;
      }
      if (method === "POST" && pathname === "/screenshot/release") {
        const body = await parseBody(req);
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          sendJson(res, 400, { error: "Invalid screenshot release request" });
          return;
        }
        const screenshotIds = body.screenshotIds;
        if (!Array.isArray(screenshotIds) || screenshotIds.length > MAX_SCREENSHOT_IDS_PER_REQUEST || !screenshotIds.every((id) => typeof id === "string" && id.length > 0)) {
          sendJson(res, 400, { error: "Invalid screenshotIds" });
          return;
        }
        await this.service.releaseTrackingScreenshots(screenshotIds);
        sendJson(res, 200, { ok: true });
        return;
      }
      if (method === "POST" && pathname === "/dev/reload-renderer") {
        sendJson(res, 200, { ok: true });
        setImmediate(() => this.service.reloadRenderer());
        return;
      }
      if (method === "POST" && pathname === "/tracking-records/export") {
        const body = await parseBody(req);
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          sendJson(res, 400, { error: "Invalid export request" });
          return;
        }
        const request = body;
        if (typeof request.folderName !== "string" || typeof request.json !== "string" || typeof request.markdown !== "string" || !Array.isArray(request.screenshots)) {
          sendJson(res, 400, {
            error: "Missing or invalid tracking export fields"
          });
          return;
        }
        const screenshots = [];
        for (const item of request.screenshots) {
          if (!item || typeof item !== "object" || Array.isArray(item) || "sourcePath" in item || "path" in item || typeof item.screenshotId !== "string" || typeof item.fileName !== "string") {
            sendJson(res, 400, { error: "Invalid screenshot export entry" });
            return;
          }
          screenshots.push(item);
        }
        const result = await this.service.exportTrackingRecords({
          folderName: request.folderName,
          json: request.json,
          markdown: request.markdown,
          screenshots
        });
        sendJson(res, 200, result);
        return;
      }
      if (method === "POST" && pathname === "/tracking-records/open-directory") {
        const result = await this.service.openTrackingRecordExportRoot();
        sendJson(res, 200, result);
        return;
      }
      if (method === "GET" && pathname === "/diagnostics/snapshot") {
        const diagnostics = await this.service.getDiagnosticsSnapshot();
        sendJson(res, 200, diagnostics);
        return;
      }
      if (method === "POST" && pathname === "/diagnostics/export-logs") {
        const body = await parseBody(req);
        const outputPath = readOptionalStringField(body, "outputPath");
        const result = await this.service.exportLogs(outputPath);
        sendJson(res, result.success ? 200 : 500, result);
        return;
      }
      if (method === "POST" && pathname === "/workspace/open") {
        const body = await parseBody(req);
        const folderPath = readRequiredStringField(body, "folderPath");
        const ephemeral = readOptionalBooleanField(body, "ephemeral");
        const result = await this.service.openWorkspace(
          folderPath,
          ephemeral === void 0 ? void 0 : { ephemeral }
        );
        sendJson(res, 200, result);
        return;
      }
      if (method === "POST" && pathname === "/workspace/close") {
        const body = await parseBody(req);
        const workspaceId = readRequiredStringField(body, "workspaceId");
        const removeFromRecent = readOptionalBooleanField(body, "removeFromRecent");
        const result = await this.service.closeWorkspace(
          workspaceId,
          removeFromRecent === void 0 ? void 0 : { removeFromRecent }
        );
        sendJson(res, 200, result);
        return;
      }
      if (method === "POST" && pathname === "/shutdown") {
        sendJson(res, 200, { ok: true });
        setImmediate(() => {
          void this.stop().then(() => this.service.shutdown()).catch((err) => {
            const message = err instanceof Error ? err.message : String(err);
            this.service.logError("shutdown", message);
          });
        });
        return;
      }
      sendJson(res, 404, { error: "Not found" });
    } catch (err) {
      if (err instanceof BodyTooLargeError) {
        sendJson(res, 413, { error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      this.service.logError("handleRequest", message);
      const statusCode = err && typeof err === "object" && "statusCode" in err && typeof err.statusCode === "number" && Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode <= 599 ? err.statusCode : 500;
      sendJson(res, statusCode, { error: message });
    }
  }
}
function parseWaitQuery(url) {
  const raw = url.searchParams.get("wait");
  if (raw === null) return false;
  const lower = raw.toLowerCase();
  return lower === "true" || lower === "1";
}
function parseTestPort(argv = process.argv) {
  const idx = argv.indexOf("--test-port");
  if (idx !== -1 && idx + 1 < argv.length) {
    const port = Number.parseInt(argv[idx + 1], 10);
    if (!Number.isNaN(port) && port > 0 && port < 65536) {
      return port;
    }
  }
  return 18765;
}
const TEST_DRIVER_IPC_CHANNEL = "testDriver";
const MAX_TRACKING_SCREENSHOTS = 30;
const MAX_TRACKING_SCREENSHOT_BYTES = 14 * 1024 * 1024;
const MAX_EXPORT_FOLDER_ATTEMPTS = 1e3;
const PNG_DATA_URL_PREFIX = "data:image/png;base64,";
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
function isFileSystemError(error, code) {
  return error instanceof Error && "code" in error && error.code === code;
}
const SYNC_POLL_INTERVAL_MS = 100;
const CLIENT_TASK_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_PROTECTED_CLEANUP_POLICY = Object.freeze({
  requestTimeoutMs: 15e3,
  leaseTtlMs: 6e4,
  // Team upstream mutations have a 10s total request deadline. Keep
  // compensating beyond it, then require a separate stable-read window.
  mutationQuiescenceMs: 15e3,
  totalTimeoutMs: 6e4,
  verifyIntervalMs: 500,
  stableReads: 5
});
function canonicalJson(value) {
  return JSON.stringify(value, (_key, nestedValue) => {
    if (!nestedValue || typeof nestedValue !== "object" || Array.isArray(nestedValue)) {
      return nestedValue;
    }
    return Object.fromEntries(
      Object.entries(nestedValue).sort(
        ([left], [right]) => left.localeCompare(right)
      )
    );
  }) ?? "";
}
const TRUSTED_PROTECTED_CLEANUP_SPECS = Object.freeze({
  "team-member-role-mutation-real": Object.freeze({
    groupId: "2078319384966729740",
    expectedCount: 2,
    resourceKeys: Object.freeze(["group:2078319384966729740:member:536665352677511171:role"]),
    targets: Object.freeze([
      Object.freeze({ id: "536665352677511171", expectedFields: { role: "MEMBER" } })
    ]),
    rollback: Object.freeze({
      kind: "role",
      memberId: "536665352677511171",
      role: "MEMBER"
    })
  }),
  "team-member-quota-real": Object.freeze({
    groupId: "2079932174085132308",
    expectedCount: 3,
    resourceKeys: Object.freeze(["group:2079932174085132308:member:536896881563422726:quota"]),
    targets: Object.freeze([
      Object.freeze({
        id: "536896881563422726",
        expectedFields: { "quota.mode": "LIMITED", "quota.limit": "200" }
      })
    ]),
    rollback: Object.freeze({
      kind: "quotas",
      quotas: Object.freeze([{ memberUid: "536896881563422726", limit: "200" }])
    })
  }),
  "team-default-quota-real": Object.freeze({
    groupId: "2079932174085132308",
    expectedCount: 3,
    resourceKeys: Object.freeze([
      "group:2079932174085132308:member:536665352677511171:quota",
      "group:2079932174085132308:member:489841249297960965:quota",
      "group:2079932174085132308:member:536896881563422726:quota"
    ]),
    targets: Object.freeze([
      Object.freeze({
        id: "536665352677511171",
        expectedFields: { "quota.mode": "LIMITED", "quota.limit": "0" }
      }),
      Object.freeze({
        id: "489841249297960965",
        expectedFields: { "quota.mode": "LIMITED", "quota.limit": "123" }
      }),
      Object.freeze({
        id: "536896881563422726",
        expectedFields: { "quota.mode": "LIMITED", "quota.limit": "200" }
      })
    ]),
    rollback: Object.freeze({
      kind: "quotas",
      quotas: Object.freeze([
        { memberUid: "536665352677511171", limit: "0" },
        { memberUid: "489841249297960965", limit: "123" },
        { memberUid: "536896881563422726", limit: "200" }
      ])
    })
  })
});
class ProtectedCleanupResourceLockedError extends Error {
  statusCode = 409;
  constructor(resourceKey) {
    super(`Protected cleanup resource is already locked: ${resourceKey}`);
    this.name = "ProtectedCleanupResourceLockedError";
  }
}
class TestDriverService {
  pendingRequests = /* @__PURE__ */ new Map();
  logDir;
  commandTimeout;
  diagnosticsSnapshotProvider;
  logExportProvider;
  workspaceLifecycleProvider;
  shutdownProvider;
  protectedCleanupGatewayProvider;
  protectedStoryRoot;
  protectedCleanupPolicy;
  /**
   * Async task store. Exposed publicly so the HTTP server can serve
   * GET /tasks / GET /tasks/{id} / POST /tasks/{id}/cancel without going
   * through this service's method surface.
   */
  taskStore;
  /** All tracked windows, in creation order. */
  windows = [];
  /** Index into `windows` for the current target. */
  activeIndex = -1;
  /** Recorder-owned opaque IDs. Renderer code never receives a local path. */
  trackingScreenshots = /* @__PURE__ */ new Map();
  /** One-shot server-owned rollback plans for protected real-backend stories. */
  protectedCleanupLeases = /* @__PURE__ */ new Map();
  /** Resource ownership is held from pre-story CAS through cleanup completion. */
  protectedCleanupResourceOwners = /* @__PURE__ */ new Map();
  /** Retry identity is bound to an exact canonical story request for the process lifetime. */
  storySubmissionFingerprints = /* @__PURE__ */ new Map();
  /** Serializes ambiguous concurrent retries before task creation becomes observable. */
  inFlightStorySubmissions = /* @__PURE__ */ new Map();
  /** Makes lease registration response-loss safe before a lease ID reaches the caller. */
  inFlightProtectedCleanupRegistrations = /* @__PURE__ */ new Map();
  /** Prevents recovery retries from re-entering cleanup after an HTTP response timeout. */
  inFlightProtectedCleanupRecoveries = /* @__PURE__ */ new Map();
  constructor(options) {
    this.logDir = join(app.getPath("logs"), "auto-test");
    this.commandTimeout = options?.commandTimeout ?? 3e4;
    this.taskStore = options?.taskStore ?? new TaskStore();
    this.diagnosticsSnapshotProvider = options?.diagnosticsSnapshotProvider;
    this.logExportProvider = options?.logExportProvider;
    this.workspaceLifecycleProvider = options?.workspaceLifecycleProvider;
    this.shutdownProvider = options?.shutdownProvider;
    this.protectedCleanupGatewayProvider = options?.protectedCleanupGatewayProvider;
    this.protectedStoryRoot = options?.protectedStoryRoot ? resolve(options.protectedStoryRoot) : void 0;
    this.protectedCleanupPolicy = {
      ...DEFAULT_PROTECTED_CLEANUP_POLICY,
      ...options?.protectedCleanupPolicy
    };
    this.setupIpcListener();
  }
  /**
   * Register a BrowserWindow and make it the active target.
   * Automatically removes destroyed windows from the list.
   */
  addWindow(win) {
    this.cleanDestroyedWindows();
    if (!this.windows.includes(win)) {
      this.windows.push(win);
      win.once("closed", () => {
        const idx = this.windows.indexOf(win);
        if (idx !== -1) {
          this.windows.splice(idx, 1);
          if (this.activeIndex >= this.windows.length) {
            this.activeIndex = Math.max(0, this.windows.length - 1);
          }
          if (this.windows.length === 0) void this.releaseAllTrackingScreenshots();
        }
      });
    }
    this.activeIndex = this.windows.indexOf(win);
  }
  /** @deprecated Use `addWindow` instead. Kept for backward compatibility. */
  setWindow(win) {
    this.addWindow(win);
  }
  async executeStep(step) {
    await this.writeLog({ event: "executeStep", step });
    let result;
    if ("switch-window" in step) {
      result = this.handleSwitchWindow(step["switch-window"]);
    } else if ("reset" in step) {
      result = this.handleReset();
    } else if ("sleep" in step) {
      result = await this.handleSleep(step.sleep);
    } else if ("screenshot" in step) {
      result = await this.handleScreenshot(step.screenshot.path);
    } else {
      const timeout = this.resolveStepTimeout(step);
      result = await this.sendToRenderer("executeStep", step, timeout);
    }
    await this.writeLog({ event: "stepResult", result });
    return result;
  }
  async getAppState() {
    return await this.sendToRenderer("getAppState", void 0);
  }
  async getDiagnosticsSnapshot() {
    if (!this.diagnosticsSnapshotProvider) {
      throw new Error("Diagnostics snapshot provider is not configured");
    }
    const snapshot = await this.diagnosticsSnapshotProvider();
    await this.writeLog({ event: "diagnosticsSnapshot" });
    return snapshot;
  }
  async exportLogs(outputPath) {
    if (!this.logExportProvider) {
      throw new Error("Log export provider is not configured");
    }
    const result = await this.logExportProvider(outputPath);
    await this.writeLog({
      event: "diagnosticsExportLogs",
      outputPath,
      success: result.success
    });
    return result;
  }
  async openWorkspace(folderPath, options) {
    if (!this.workspaceLifecycleProvider) {
      throw new Error("Workspace lifecycle provider is not configured");
    }
    const result = await this.workspaceLifecycleProvider.openWorkspace(folderPath, options);
    await this.writeLog({
      event: "workspaceOpen",
      folderPath,
      ephemeral: options?.ephemeral,
      result
    });
    return result;
  }
  async closeWorkspace(workspaceId, options) {
    if (!this.workspaceLifecycleProvider) {
      throw new Error("Workspace lifecycle provider is not configured");
    }
    await this.workspaceLifecycleProvider.closeWorkspace(workspaceId, options);
    await this.writeLog({
      event: "workspaceClose",
      workspaceId,
      removeFromRecent: options?.removeFromRecent
    });
    return { ok: true, workspaceId };
  }
  async shutdown() {
    if (!this.shutdownProvider) {
      throw new Error("Shutdown provider is not configured");
    }
    await this.writeLog({ event: "shutdown" });
    await this.shutdownProvider();
  }
  async takeScreenshot(savePath) {
    const win = this.getActiveWindow();
    if (!win) {
      throw new Error("No window attached to TestDriverService");
    }
    const image = await win.webContents.capturePage();
    const outputPath = savePath ?? join(app.getPath("temp"), `screenshot-${Date.now()}.png`);
    await writeFile(outputPath, image.toPNG());
    await this.writeLog({ event: "screenshot", path: outputPath });
    return outputPath;
  }
  async createTrackingScreenshot() {
    const win = this.getActiveWindow();
    if (!win) throw new Error("No window attached to TestDriverService");
    while (this.trackingScreenshots.size >= MAX_TRACKING_SCREENSHOTS) {
      const oldestId = this.trackingScreenshots.keys().next().value;
      if (typeof oldestId !== "string") break;
      await this.releaseTrackingScreenshot(oldestId);
    }
    const screenshotId = randomUUID();
    const filePath = join(app.getPath("temp"), `hilo-tracking-${screenshotId}.png`);
    const png = (await win.webContents.capturePage()).toPNG();
    if (png.length === 0 || png.length > MAX_TRACKING_SCREENSHOT_BYTES) {
      throw new Error("Captured screenshot exceeds recorder size limit");
    }
    await writeFile(filePath, png);
    this.trackingScreenshots.set(screenshotId, filePath);
    return { screenshotId, dataUrl: `${PNG_DATA_URL_PREFIX}${png.toString("base64")}` };
  }
  async replaceTrackingScreenshot(screenshotId, dataUrl) {
    const filePath = this.getTrackingScreenshotPath(screenshotId);
    if (!dataUrl.startsWith(PNG_DATA_URL_PREFIX)) {
      throw new Error("Invalid marked screenshot payload");
    }
    const png = Buffer.from(dataUrl.slice(PNG_DATA_URL_PREFIX.length), "base64");
    if (png.length === 0 || png.length > MAX_TRACKING_SCREENSHOT_BYTES || !png.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
      throw new Error("Invalid PNG screenshot payload");
    }
    await writeFile(filePath, png);
  }
  async readTrackingScreenshot(screenshotId) {
    const filePath = this.getTrackingScreenshotPath(screenshotId);
    const screenshot = await readFile(filePath);
    return `${PNG_DATA_URL_PREFIX}${screenshot.toString("base64")}`;
  }
  getAvailableTrackingScreenshotIds(screenshotIds) {
    return screenshotIds.filter((screenshotId) => this.trackingScreenshots.has(screenshotId));
  }
  async releaseTrackingScreenshot(screenshotId) {
    const filePath = this.trackingScreenshots.get(screenshotId);
    if (!filePath) return;
    this.trackingScreenshots.delete(screenshotId);
    await unlink(filePath).catch(() => void 0);
  }
  async releaseTrackingScreenshots(screenshotIds) {
    await Promise.all(screenshotIds.map((id) => this.releaseTrackingScreenshot(id)));
  }
  async releaseAllTrackingScreenshots() {
    await this.releaseTrackingScreenshots([...this.trackingScreenshots.keys()]);
  }
  reloadRenderer() {
    const win = this.getActiveWindow();
    if (!win) throw new Error("No window attached to TestDriverService");
    win.webContents.reloadIgnoringCache();
  }
  getTrackingRecordExportRoot() {
    return join(app.getPath("documents"), "Hilo Tracking Records");
  }
  async exportTrackingRecords(request) {
    const safeFolderName = request.folderName.replace(/[\\/:*?"<>|]/g, "-").trim();
    if (!safeFolderName || safeFolderName === "." || safeFolderName === "..") {
      throw new Error("Invalid tracking export folder name");
    }
    if (request.screenshots.length > MAX_TRACKING_SCREENSHOTS) {
      throw new Error(`Too many tracking screenshots (max ${MAX_TRACKING_SCREENSHOTS})`);
    }
    const screenshotEntries = request.screenshots.map(({ screenshotId, fileName }) => {
      if (!/^[\w.-]+\.png$/i.test(fileName) || basename(fileName) !== fileName) {
        throw new Error("Invalid tracking screenshot file name");
      }
      return {
        screenshotId,
        sourcePath: this.getTrackingScreenshotPath(screenshotId),
        fileName
      };
    });
    const root = this.getTrackingRecordExportRoot();
    const folderPath = await this.createUniqueTrackingExportFolder(root, safeFolderName);
    const screenshotsPath = join(folderPath, "screenshots");
    await mkdir(screenshotsPath);
    for (let index = 0; index < screenshotEntries.length; index += 4) {
      await Promise.all(
        screenshotEntries.slice(index, index + 4).map(({ sourcePath, fileName }) => copyFile(sourcePath, join(screenshotsPath, fileName)))
      );
    }
    const jsonPath = join(folderPath, "records.json");
    const markdownPath = join(folderPath, "records.md");
    await writeFile(jsonPath, request.json, "utf-8");
    await writeFile(markdownPath, request.markdown, "utf-8");
    await this.releaseTrackingScreenshots(screenshotEntries.map((item) => item.screenshotId));
    await this.writeLog({ event: "trackingRecordsExport", folderPath });
    return { folderPath, jsonPath, markdownPath };
  }
  async createUniqueTrackingExportFolder(root, baseName) {
    await mkdir(root, { recursive: true });
    for (let attempt = 0; attempt < MAX_EXPORT_FOLDER_ATTEMPTS; attempt += 1) {
      const folderName = attempt === 0 ? baseName : `${baseName}-${attempt + 1}`;
      const folderPath = join(root, folderName);
      try {
        await mkdir(folderPath);
        return folderPath;
      } catch (error) {
        if (!isFileSystemError(error, "EEXIST")) throw error;
      }
    }
    throw new Error(`Could not allocate a unique tracking export folder for ${baseName}`);
  }
  getTrackingScreenshotPath(screenshotId) {
    const filePath = this.trackingScreenshots.get(screenshotId);
    if (!filePath) throw new Error("Unknown or expired screenshotId");
    return filePath;
  }
  async openTrackingRecordExportRoot() {
    const folderPath = this.getTrackingRecordExportRoot();
    await mkdir(folderPath, { recursive: true });
    const error = await shell.openPath(folderPath);
    if (error) throw new Error(error);
    return { folderPath };
  }
  async registerProtectedCleanupLease(request) {
    if (!request || typeof request !== "object" || Object.keys(request).some((key) => key !== "storyDir" && key !== "clientTaskId") || typeof request.storyDir !== "string" || typeof request.clientTaskId !== "string" || !request.storyDir || !CLIENT_TASK_ID_PATTERN.test(request.clientTaskId)) {
      throw new Error("Protected cleanup lease requires a storyDir and UUID clientTaskId");
    }
    const { storyDir, spec } = this.resolveTrustedProtectedStory(request.storyDir);
    const gatewayBaseUrl = this.getProtectedCleanupGatewayBaseUrl();
    const registrationFingerprint = canonicalJson({
      clientTaskId: request.clientTaskId,
      gatewayBaseUrl,
      storyDir
    });
    const inFlightRegistration = this.inFlightProtectedCleanupRegistrations.get(
      request.clientTaskId
    );
    if (inFlightRegistration) {
      if (inFlightRegistration.fingerprint !== registrationFingerprint) {
        throw new Error("clientTaskId is already bound to a different cleanup lease registration");
      }
      return inFlightRegistration.promise;
    }
    const existing = Array.from(this.protectedCleanupLeases.values()).find(
      (lease) => lease.clientTaskId === request.clientTaskId
    );
    if (existing) {
      if (existing.storyDir !== storyDir) {
        throw new Error("clientTaskId is already bound to a different protected cleanup story");
      }
      if (existing.status !== "registered") {
        throw new Error(`Protected cleanup lease is already ${existing.status}`);
      }
      if (existing.gatewayBaseUrl !== gatewayBaseUrl) {
        existing.status = "failed";
        existing.error = "local Gateway origin changed before story submission";
        throw new Error("Protected cleanup local Gateway changed before story submission");
      }
      existing.createdAt = Date.now();
      return { leaseId: existing.id, clientTaskId: existing.clientTaskId, status: "registered" };
    }
    const registrationPromise = this.createProtectedCleanupLease(
      storyDir,
      request.clientTaskId,
      gatewayBaseUrl,
      spec
    );
    const claim = { fingerprint: registrationFingerprint, promise: registrationPromise };
    this.inFlightProtectedCleanupRegistrations.set(request.clientTaskId, claim);
    try {
      return await registrationPromise;
    } finally {
      if (this.inFlightProtectedCleanupRegistrations.get(request.clientTaskId) === claim) {
        this.inFlightProtectedCleanupRegistrations.delete(request.clientTaskId);
      }
    }
  }
  async recoverProtectedCleanupLease(request) {
    if (!request || typeof request !== "object" || Object.keys(request).some(
      (key) => key !== "storyDir" && key !== "clientTaskId" && key !== "leaseId"
    ) || typeof request.storyDir !== "string" || typeof request.clientTaskId !== "string" || typeof request.leaseId !== "string" || !CLIENT_TASK_ID_PATTERN.test(request.clientTaskId)) {
      throw new Error(
        "Protected cleanup recovery requires storyDir, leaseId, and UUID clientTaskId"
      );
    }
    const { storyDir } = this.resolveTrustedProtectedStory(request.storyDir);
    const task = this.taskStore.get(request.clientTaskId);
    if (!task || task.status === "running") {
      throw new Error("Protected cleanup recovery requires an observable terminal task");
    }
    this.assertProtectedCleanupLeaseBound(request.leaseId, storyDir, request.clientTaskId);
    const lease = this.protectedCleanupLeases.get(request.leaseId);
    if (!lease) throw new Error("Unknown protected cleanup lease");
    if (lease.gatewayBaseUrl !== this.getProtectedCleanupGatewayBaseUrl()) {
      throw new Error("Protected cleanup local Gateway changed before recovery");
    }
    const recoveryFingerprint = canonicalJson({
      clientTaskId: request.clientTaskId,
      leaseId: request.leaseId,
      storyDir,
      submissionFingerprint: this.storySubmissionFingerprints.get(request.clientTaskId) ?? null
    });
    const inFlightRecovery = this.inFlightProtectedCleanupRecoveries.get(lease.id);
    if (inFlightRecovery) {
      if (inFlightRecovery.fingerprint !== recoveryFingerprint) {
        throw new Error("cleanup lease is already bound to a different in-flight recovery");
      }
      return inFlightRecovery.promise;
    }
    const recoveryPromise = this.executeProtectedCleanupRecovery(lease);
    const claim = { fingerprint: recoveryFingerprint, promise: recoveryPromise };
    this.inFlightProtectedCleanupRecoveries.set(lease.id, claim);
    try {
      return await recoveryPromise;
    } finally {
      if (this.inFlightProtectedCleanupRecoveries.get(lease.id) === claim) {
        this.inFlightProtectedCleanupRecoveries.delete(lease.id);
      }
    }
  }
  /**
   * Execute a story synchronously — convenience wrapper around runStoryAsync
   * that polls the task store until the task reaches a terminal state.
   *
   * Used by:
   *   - `POST /run-story?wait=true` (legacy synchronous endpoint, kept for
   *     short e2e-tester runs)
   *   - any in-process caller that wants the old behavior
   *
   * Trade-off: 100ms polling granularity vs the previous direct await chain.
   * Negligible for short stories; long stories should use runStoryAsync.
   */
  async runStory(storyDir, inlineSteps, storyName, cleanupLeaseId, clientTaskId) {
    const handle = await this.runStoryAsync(
      storyDir,
      inlineSteps,
      storyName,
      cleanupLeaseId,
      clientTaskId
    );
    return this.waitForTask(handle.taskId);
  }
  /**
   * Submit a story for asynchronous execution. Returns immediately with a
   * task handle; the actual step loop runs in the background and writes
   * progress into the task store.
   *
   * Callers poll `taskStore.get(taskId)` (or HTTP `GET /tasks/{id}`) to see
   * progress / final storyResult. The loop checks the task's `cancelled`
   * flag between steps, so `POST /tasks/{id}/cancel` can stop a long run
   * without forcibly aborting the in-flight step.
   */
  async runStoryAsync(storyDir, inlineSteps, storyName, cleanupLeaseId, clientTaskId) {
    await this.writeLog({ event: "runStoryAsync", storyDir, storyName });
    if (storyDir && inlineSteps && inlineSteps.length > 0) {
      throw new Error('Provide either "steps" or "storyDir", not both');
    }
    if (clientTaskId && !CLIENT_TASK_ID_PATTERN.test(clientTaskId)) {
      throw new Error("clientTaskId must be a UUID");
    }
    let steps;
    let name;
    let requiresProtectedCleanup = false;
    let normalizedStoryDir = null;
    if (inlineSteps && inlineSteps.length > 0) {
      steps = inlineSteps;
      name = storyName ?? (storyDir ? basename(storyDir) : "unnamed");
    } else if (storyDir) {
      normalizedStoryDir = resolve(storyDir);
      const yamlPath = join(storyDir, "steps.yaml");
      const jsonPath = join(storyDir, "steps.json");
      let content;
      try {
        content = await readFile(yamlPath, "utf-8");
      } catch {
        content = await readFile(jsonPath, "utf-8");
      }
      const parsed = load(content);
      requiresProtectedCleanup = !Array.isArray(parsed) && parsed.requiresExternalCleanup === true;
      steps = Array.isArray(parsed) ? parsed : parsed.steps ?? [];
      name = storyName ?? basename(storyDir);
      if (requiresProtectedCleanup) {
        if (!cleanupLeaseId || !clientTaskId) {
          throw new Error("Story requires a server-owned protected cleanup lease");
        }
      } else if (cleanupLeaseId) {
        throw new Error("cleanupLeaseId is only valid for a protected story");
      }
    } else {
      throw new Error('Either "steps" array or "storyDir" must be provided');
    }
    const submissionFingerprint = createHash("sha256").update(
      canonicalJson({
        cleanupLeaseId: cleanupLeaseId ?? null,
        name,
        requiresProtectedCleanup,
        source: normalizedStoryDir ? "storyDir" : "inlineSteps",
        steps,
        storyDir: normalizedStoryDir
      })
    ).digest("hex");
    const existingTask = clientTaskId ? this.taskStore.get(clientTaskId) : void 0;
    if (existingTask && clientTaskId) {
      const existingFingerprint = this.storySubmissionFingerprints.get(clientTaskId);
      if (!existingFingerprint || existingFingerprint !== submissionFingerprint) {
        throw new Error("clientTaskId is already bound to a different story submission");
      }
      if (requiresProtectedCleanup && cleanupLeaseId && normalizedStoryDir) {
        this.assertProtectedCleanupLeaseBound(cleanupLeaseId, normalizedStoryDir, clientTaskId);
      }
      return {
        taskId: existingTask.id,
        status: existingTask.status,
        startedAt: existingTask.startedAt
      };
    }
    const inFlightSubmission = clientTaskId ? this.inFlightStorySubmissions.get(clientTaskId) : void 0;
    if (inFlightSubmission) {
      if (inFlightSubmission.fingerprint !== submissionFingerprint) {
        throw new Error("clientTaskId is already bound to a different in-flight submission");
      }
      return inFlightSubmission.promise;
    }
    if (clientTaskId && this.storySubmissionFingerprints.has(clientTaskId)) {
      throw new Error("clientTaskId belongs to an expired story submission and cannot be reused");
    }
    const startSubmission = async () => {
      let cleanupLease;
      if (requiresProtectedCleanup && cleanupLeaseId && clientTaskId && normalizedStoryDir) {
        cleanupLease = await this.consumeProtectedCleanupLease(
          cleanupLeaseId,
          normalizedStoryDir,
          clientTaskId
        );
      }
      let record;
      try {
        record = this.taskStore.create(name, steps.length, clientTaskId);
      } catch (error) {
        if (cleanupLease) this.abandonProtectedCleanupLease(cleanupLease, "task creation failed");
        throw error;
      }
      if (clientTaskId) this.storySubmissionFingerprints.set(clientTaskId, submissionFingerprint);
      void this.executeStoryLoop(record, steps, cleanupLease).catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        this.taskStore.fail(record.id, message);
        void this.writeLog({
          event: "runStoryAsync:error",
          taskId: record.id,
          error: message
        });
      });
      return {
        taskId: record.id,
        status: record.status,
        startedAt: record.startedAt
      };
    };
    if (!clientTaskId) return startSubmission();
    const submissionPromise = startSubmission();
    const claim = { fingerprint: submissionFingerprint, promise: submissionPromise };
    this.inFlightStorySubmissions.set(clientTaskId, claim);
    try {
      return await submissionPromise;
    } finally {
      if (this.inFlightStorySubmissions.get(clientTaskId) === claim) {
        this.inFlightStorySubmissions.delete(clientTaskId);
      }
    }
  }
  /**
   * The actual step loop. Runs in the background via `void` from
   * runStoryAsync. Mutates the task record as it progresses; ends by
   * calling taskStore.finish() with the appropriate terminal status.
   */
  async executeStoryLoop(record, steps, cleanupLease) {
    const startedAt = record.startedAt;
    let failedStep;
    let executionError;
    try {
      for (let i = 0; i < steps.length; i++) {
        if (record.cancelled) break;
        record.currentStep = i;
        const result = await this.executeStep(steps[i]);
        result.index = i;
        this.taskStore.recordStep(record.id, result);
        if (result.status === "fail") {
          failedStep = i;
          break;
        }
      }
    } catch (error) {
      executionError = error;
    }
    if (cleanupLease) {
      await this.executeProtectedCleanup(cleanupLease);
    }
    if (executionError) throw executionError;
    const wasCancelled = record.cancelled;
    const status = wasCancelled ? "cancelled" : failedStep !== void 0 ? "fail" : "success";
    const effectiveFailedStep = status === "cancelled" ? record.completedSteps.length : failedStep;
    const storyResult = {
      name: record.name,
      startedAt,
      completedAt: (/* @__PURE__ */ new Date()).toISOString(),
      steps: record.completedSteps,
      status: status === "success" ? "pass" : "fail",
      failedStep: effectiveFailedStep
    };
    this.taskStore.finish(record.id, storyResult, status);
    await this.writeLog({
      event: "storyResult",
      taskId: record.id,
      result: storyResult
    });
  }
  async createProtectedCleanupLease(storyDir, clientTaskId, gatewayBaseUrl, spec) {
    const plan = this.buildTrustedProtectedCleanupPlan(gatewayBaseUrl, spec);
    const initialVerification = await this.verifyProtectedCleanupState(plan.verification);
    if (!initialVerification.ok) {
      throw new Error(`Protected cleanup snapshot mismatch: ${initialVerification.error}`);
    }
    const lease = {
      id: randomUUID(),
      storyDir,
      clientTaskId,
      gatewayBaseUrl,
      createdAt: Date.now(),
      consumeRequestedAt: null,
      resourceKeys: structuredClone(spec.resourceKeys),
      rollbackRequests: structuredClone(plan.rollbackRequests),
      verification: structuredClone(plan.verification),
      status: "registered"
    };
    this.protectedCleanupLeases.set(lease.id, lease);
    return { leaseId: lease.id, clientTaskId: lease.clientTaskId, status: "registered" };
  }
  async executeProtectedCleanupRecovery(lease) {
    this.acquireProtectedCleanupResources(lease);
    try {
      const verification = await this.verifyProtectedCleanupState(lease.verification);
      if (!verification.ok) {
        await this.executeProtectedCleanupWithBarrier(lease);
      } else {
        lease.status = "complete";
        lease.error = void 0;
      }
      await this.writeLog({
        event: "protectedCleanupRecoveryComplete",
        leaseId: lease.id,
        clientTaskId: lease.clientTaskId
      });
      return {
        leaseId: lease.id,
        clientTaskId: lease.clientTaskId,
        status: "complete",
        restored: true
      };
    } finally {
      this.releaseProtectedCleanupResources(lease);
    }
  }
  async consumeProtectedCleanupLease(leaseId, storyDir, clientTaskId) {
    const lease = this.protectedCleanupLeases.get(leaseId);
    if (!lease) throw new Error("Unknown protected cleanup lease");
    if (lease.status !== "registered") {
      throw new Error(`Protected cleanup lease is already ${lease.status}`);
    }
    if (lease.storyDir !== resolve(storyDir) || lease.clientTaskId !== clientTaskId) {
      throw new Error("Protected cleanup lease does not match storyDir/clientTaskId");
    }
    if (lease.consumeRequestedAt === null) {
      if (Date.now() - lease.createdAt > this.protectedCleanupPolicy.leaseTtlMs) {
        lease.status = "failed";
        lease.error = "lease expired before story submission";
        throw new Error("Protected cleanup lease expired before story submission");
      }
      lease.consumeRequestedAt = Date.now();
    }
    if (lease.gatewayBaseUrl !== this.getProtectedCleanupGatewayBaseUrl()) {
      lease.status = "failed";
      lease.error = "local Gateway origin changed before story submission";
      throw new Error("Protected cleanup local Gateway changed before story submission");
    }
    this.acquireProtectedCleanupResources(lease);
    try {
      const currentVerification = await this.verifyProtectedCleanupState(lease.verification);
      if (!currentVerification.ok) {
        throw new Error(`Protected cleanup snapshot changed: ${currentVerification.error}`);
      }
      lease.status = "consumed";
      return lease;
    } catch (error) {
      lease.status = "failed";
      lease.error = error instanceof Error ? error.message : String(error);
      this.releaseProtectedCleanupResources(lease);
      throw error;
    }
  }
  assertProtectedCleanupLeaseBound(leaseId, storyDir, clientTaskId) {
    const lease = this.protectedCleanupLeases.get(leaseId);
    if (!lease || lease.storyDir !== storyDir || lease.clientTaskId !== clientTaskId || lease.status === "registered") {
      throw new Error("Existing protected task is not bound to a consumed cleanup lease");
    }
  }
  acquireProtectedCleanupResources(lease) {
    const conflictingResource = lease.resourceKeys.find((resourceKey) => {
      const owner = this.protectedCleanupResourceOwners.get(resourceKey);
      return owner !== void 0 && owner !== lease.id;
    });
    if (conflictingResource) {
      throw new ProtectedCleanupResourceLockedError(conflictingResource);
    }
    for (const resourceKey of lease.resourceKeys) {
      this.protectedCleanupResourceOwners.set(resourceKey, lease.id);
    }
  }
  releaseProtectedCleanupResources(lease) {
    for (const resourceKey of lease.resourceKeys) {
      if (this.protectedCleanupResourceOwners.get(resourceKey) === lease.id) {
        this.protectedCleanupResourceOwners.delete(resourceKey);
      }
    }
  }
  abandonProtectedCleanupLease(lease, reason) {
    lease.status = "failed";
    lease.error = reason;
    this.releaseProtectedCleanupResources(lease);
  }
  resolveTrustedProtectedStory(storyDir) {
    if (!this.protectedStoryRoot) {
      throw new Error("Protected cleanup story root is not configured");
    }
    const normalizedStoryDir = resolve(storyDir);
    const storyName = basename(normalizedStoryDir);
    const spec = TRUSTED_PROTECTED_CLEANUP_SPECS[storyName];
    if (!spec || normalizedStoryDir !== join(this.protectedStoryRoot, storyName)) {
      throw new Error("Story is not registered for protected cleanup");
    }
    return { storyDir: normalizedStoryDir, spec };
  }
  getProtectedCleanupGatewayBaseUrl() {
    const configured = this.protectedCleanupGatewayProvider?.();
    if (!configured) {
      throw new Error("Protected cleanup local Gateway is not ready");
    }
    const url = new URL(configured);
    if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || !url.port || url.username || url.password || url.pathname !== "/" && url.pathname !== "" || url.search || url.hash) {
      throw new Error("Protected cleanup Gateway must be the current loopback HTTP origin");
    }
    return url.origin;
  }
  buildTrustedProtectedCleanupPlan(gatewayBaseUrl, spec) {
    const groupBase = `${gatewayBaseUrl}/api/v1/team/groups/${encodeURIComponent(spec.groupId)}`;
    const rollback = spec.rollback;
    const rollbackRequests = [];
    if (rollback.kind === "role") {
      rollbackRequests.push({
        method: "POST",
        url: `${groupBase}/members/${encodeURIComponent(rollback.memberId)}/role`,
        body: { role: rollback.role }
      });
    } else {
      rollbackRequests.push({
        method: "POST",
        url: `${groupBase}/member-quotas`,
        body: {
          quotas: rollback.quotas.map(({ memberUid, limit }) => ({
            member_uid: memberUid,
            quota_limit: limit
          }))
        }
      });
    }
    return {
      rollbackRequests,
      verification: {
        url: `${groupBase}/members?page_size=200`,
        itemsPaths: ["items", "data.items"],
        idPath: "user_id",
        expectedCount: spec.expectedCount,
        targets: spec.targets
      }
    };
  }
  readProtectedCleanupPath(value, path) {
    let current = value;
    for (const segment of path.split(".")) {
      if (!current || typeof current !== "object" || !(segment in current)) return void 0;
      current = current[segment];
    }
    return current;
  }
  async fetchProtectedCleanupJson(url, request) {
    const response = await fetch(url, {
      method: request?.method ?? "GET",
      headers: request?.body === void 0 ? void 0 : { "content-type": "application/json" },
      body: request?.body === void 0 ? void 0 : JSON.stringify(request.body),
      signal: AbortSignal.timeout(this.protectedCleanupPolicy.requestTimeoutMs)
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(
        `${request?.method ?? "GET"} ${url} -> HTTP ${response.status} ${text.slice(0, 200)}`
      );
    }
    return text ? JSON.parse(text) : null;
  }
  async verifyProtectedCleanupState(verification) {
    try {
      const body = await this.fetchProtectedCleanupJson(verification.url);
      const items = verification.itemsPaths.map((path) => this.readProtectedCleanupPath(body, path)).find((value) => Array.isArray(value));
      if (!items) return { ok: false, error: "members response has no configured items path" };
      if (items.length !== verification.expectedCount) {
        return {
          ok: false,
          error: `expected ${verification.expectedCount} members, got ${items.length}`
        };
      }
      for (const target of verification.targets) {
        const item = items.find(
          (candidate) => String(this.readProtectedCleanupPath(candidate, verification.idPath) ?? "") === target.id
        );
        if (!item) return { ok: false, error: `member ${target.id} is missing` };
        for (const [path, expected] of Object.entries(target.expectedFields)) {
          const actual = this.readProtectedCleanupPath(item, path);
          const normalizedActual = actual === null || actual === void 0 ? null : String(actual);
          if (normalizedActual !== expected) {
            return {
              ok: false,
              error: `member ${target.id} ${path}: expected ${String(expected)}, got ${String(normalizedActual)}`
            };
          }
        }
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  async executeProtectedCleanup(lease) {
    try {
      await this.executeProtectedCleanupWithBarrier(lease);
    } finally {
      this.releaseProtectedCleanupResources(lease);
    }
  }
  async executeProtectedCleanupWithBarrier(lease) {
    lease.status = "restoring";
    const requestErrors = [];
    const applyCompensation = async () => {
      for (const rollbackRequest of lease.rollbackRequests) {
        try {
          await this.fetchProtectedCleanupJson(rollbackRequest.url, rollbackRequest);
        } catch (error) {
          requestErrors.push(error instanceof Error ? error.message : String(error));
        }
      }
    };
    const startedAt = Date.now();
    const deadline = startedAt + this.protectedCleanupPolicy.totalTimeoutMs;
    let quiescenceDeadline = startedAt + this.protectedCleanupPolicy.mutationQuiescenceMs;
    let stableReads = 0;
    let barrierCompensationApplied = false;
    let lastError = "verification did not run";
    await applyCompensation();
    while (Date.now() <= deadline) {
      const verification = await this.verifyProtectedCleanupState(lease.verification);
      if (!verification.ok) {
        stableReads = 0;
        barrierCompensationApplied = false;
        lastError = verification.error;
        await applyCompensation();
        quiescenceDeadline = Date.now() + this.protectedCleanupPolicy.mutationQuiescenceMs;
      } else if (Date.now() < quiescenceDeadline) {
        stableReads = 0;
      } else if (!barrierCompensationApplied) {
        await applyCompensation();
        barrierCompensationApplied = true;
        stableReads = 0;
      } else {
        stableReads += 1;
        if (stableReads >= this.protectedCleanupPolicy.stableReads) {
          lease.status = "complete";
          await this.writeLog({
            event: "protectedCleanupComplete",
            leaseId: lease.id,
            clientTaskId: lease.clientTaskId,
            requestErrors
          });
          return;
        }
      }
      await new Promise(
        (resolve2) => setTimeout(resolve2, this.protectedCleanupPolicy.verifyIntervalMs)
      );
    }
    lease.status = "failed";
    lease.error = [...requestErrors, lastError].join("; ");
    throw new Error(`Protected story cleanup failed: ${lease.error}`);
  }
  /**
   * Poll the task store until the given task reaches a terminal state, then
   * return its storyResult. Throws if the task ends with status='error' or
   * the record is evicted before reaching a terminal state.
   */
  waitForTask(taskId) {
    return new Promise((resolve2, reject) => {
      const check = () => {
        const record = this.taskStore.get(taskId);
        if (!record) {
          reject(new Error(`Task ${taskId} not found (evicted before completion?)`));
          return;
        }
        if (record.status === "running") {
          setTimeout(check, SYNC_POLL_INTERVAL_MS);
          return;
        }
        if (record.status === "error") {
          reject(new Error(record.error ?? "Unknown task error"));
          return;
        }
        if (!record.storyResult) {
          reject(new Error(`Task ${taskId} terminal but storyResult missing`));
          return;
        }
        resolve2(record.storyResult);
      };
      check();
    });
  }
  logError(context, message) {
    void this.writeLog({ event: "error", context, message });
  }
  dispose() {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Service disposed"));
      this.pendingRequests.delete(id);
    }
    ipcMain.removeAllListeners(`${TEST_DRIVER_IPC_CHANNEL}:response`);
    this.protectedCleanupLeases.clear();
    this.protectedCleanupResourceOwners.clear();
    this.storySubmissionFingerprints.clear();
    this.inFlightStorySubmissions.clear();
    this.inFlightProtectedCleanupRegistrations.clear();
    this.inFlightProtectedCleanupRecoveries.clear();
    this.taskStore.dispose();
  }
  // ---------------------------------------------------------------------------
  // Private — main-process step handlers
  // ---------------------------------------------------------------------------
  /**
   * Close all windows except the first one, then switch to it.
   * Gives each story a clean slate starting from the home window.
   */
  handleReset() {
    const start = Date.now();
    this.cleanDestroyedWindows();
    if (this.windows.length === 0) {
      return {
        index: 0,
        action: "reset",
        status: "fail",
        duration: 0,
        error: "No windows available"
      };
    }
    const closed = this.windows.length - 1;
    for (let i = this.windows.length - 1; i > 0; i--) {
      const win = this.windows[i];
      if (!win.isDestroyed()) {
        win.close();
      }
    }
    this.windows = [this.windows[0]];
    this.activeIndex = 0;
    return {
      index: 0,
      action: "reset",
      status: "ok",
      duration: Date.now() - start,
      detail: { closedWindows: closed }
    };
  }
  handleSwitchWindow(target) {
    const start = Date.now();
    this.cleanDestroyedWindows();
    let newIndex;
    if (target === "latest") {
      newIndex = this.windows.length - 1;
    } else if (target === "first") {
      newIndex = 0;
    } else if (typeof target === "number") {
      newIndex = target;
    } else {
      return {
        index: 0,
        action: `switch-window ${target}`,
        status: "fail",
        duration: 0,
        error: `Invalid switch-window target: ${String(target)}`
      };
    }
    if (newIndex < 0 || newIndex >= this.windows.length) {
      return {
        index: 0,
        action: `switch-window ${target}`,
        status: "fail",
        duration: 0,
        error: `Window index ${newIndex} out of range (have ${this.windows.length} window${this.windows.length === 1 ? "" : "s"})`
      };
    }
    this.activeIndex = newIndex;
    return {
      index: 0,
      action: `switch-window ${target}`,
      status: "ok",
      duration: Date.now() - start
    };
  }
  async handleSleep(ms) {
    const start = Date.now();
    await new Promise((resolve2) => {
      setTimeout(resolve2, ms);
    });
    return {
      index: 0,
      action: `sleep ${ms}ms`,
      status: "ok",
      duration: Date.now() - start
    };
  }
  async handleScreenshot(savePath) {
    const start = Date.now();
    try {
      const outputPath = await this.takeScreenshot(savePath);
      return {
        index: 0,
        action: `screenshot ${savePath}`,
        status: "ok",
        duration: Date.now() - start,
        detail: { path: outputPath }
      };
    } catch (err) {
      return {
        index: 0,
        action: `screenshot ${savePath}`,
        status: "fail",
        duration: Date.now() - start,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }
  // ---------------------------------------------------------------------------
  // Private — IPC helpers
  // ---------------------------------------------------------------------------
  getActiveWindow() {
    this.cleanDestroyedWindows();
    if (this.activeIndex < 0 || this.activeIndex >= this.windows.length) return null;
    return this.windows[this.activeIndex];
  }
  cleanDestroyedWindows() {
    const before = this.windows.length;
    this.windows = this.windows.filter((w) => !w.isDestroyed());
    if (this.windows.length !== before && this.activeIndex >= this.windows.length) {
      this.activeIndex = Math.max(0, this.windows.length - 1);
    }
  }
  setupIpcListener() {
    ipcMain.on(`${TEST_DRIVER_IPC_CHANNEL}:response`, (_event, responseData) => {
      const response = responseData;
      const pending = this.pendingRequests.get(response.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pendingRequests.delete(response.id);
      if (response.success) {
        pending.resolve(response.data);
      } else {
        pending.reject(new Error(response.error ?? "Unknown renderer error"));
      }
    });
  }
  resolveStepTimeout(step) {
    if ("wait" in step) return (step.wait.timeout ?? this.commandTimeout) + 5e3;
    if ("sleep" in step) return step.sleep + 5e3;
    if ("assert" in step && step.assert.timeout) return step.assert.timeout + 5e3;
    if ("wait-count" in step) return step["wait-count"].timeout + 5e3;
    if ("wait-any" in step) return step["wait-any"].timeout + 5e3;
    if ("wait-stage" in step) return step["wait-stage"].timeout + 5e3;
    return this.commandTimeout;
  }
  sendToRenderer(command, payload, timeoutMs) {
    const win = this.getActiveWindow();
    if (!win) {
      return Promise.reject(new Error("No window attached to TestDriverService"));
    }
    const id = randomUUID();
    const request = {
      id,
      command,
      payload
    };
    return new Promise((resolve2, reject) => {
      const effectiveTimeout = timeoutMs ?? this.commandTimeout;
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Test driver command "${command}" timed out after ${effectiveTimeout}ms`));
      }, effectiveTimeout);
      this.pendingRequests.set(id, { resolve: resolve2, reject, timer });
      win.webContents.send(`${TEST_DRIVER_IPC_CHANNEL}:request`, request);
    });
  }
  async writeLog(entry) {
    try {
      await mkdir(this.logDir, { recursive: true });
      const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const logPath = join(this.logDir, `auto-test-${date}.log`);
      const line = `${JSON.stringify({ ...entry, timestamp: (/* @__PURE__ */ new Date()).toISOString() })}
`;
      await appendFile(logPath, line, "utf-8");
    } catch {
    }
  }
}
export {
  TaskStore,
  TestDriverServer,
  TestDriverService,
  parseTestPort
};
