import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { i as installedSkillsDir, m as mapCloudSkillToMarketSkillInfo, a as isValidSkillName, p as parseFrontmatter, r as resolvedSkillPaths, s as setupOpenCodeRuntimeDirs, e as ensurePython } from "./chunks/python-runtime-ZdSS6sqy.js";
import { a as archiver, c as commonjsGlobal, b as buildLaneHeaders, e as extractZipSafe, d as evalWorkerMode } from "./chunks/extract-zip-safe-Bhxshmqd.js";
import { w as workspaceGatewayIdentityHeaders, H as HILO_WORKSPACE_IDENTITY_HEADER, A as API_PATHS, g as getCloudGatewayUrl, i as isBenchmarkCompletionProven } from "./chunks/safe-spawn-path-DD3xknOt.js";
import * as fsp from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { exportProjectToZip } from "./chunks/archive-bundler-DFuK02l8.js";
import { PassThrough } from "node:stream";
import * as crypto from "node:crypto";
import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import require$$0 from "util";
import Url from "url";
import http from "http";
import https from "https";
import zlib__default from "zlib";
import fs__default from "fs";
import require$$2 from "process";
import require$$1 from "v8";
import require$$3 from "cluster";
import { i as installHeadlessClientVersion, a as resolveHeadlessAgentProfileRegistry, b as bootDriverOnly } from "./chunks/headless-client-version-2jDjQeaz.js";
import "node:net";
import "node:tls";
import "node:url";
import "node:sqlite";
import "node:stream/promises";
import "events";
import "node:events";
import "node:string_decoder";
import "path";
import "assert";
import "buffer";
import "node:assert";
import "constants";
import "stream";
import "node:timers/promises";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
function posterSeekSeconds(durationSeconds) {
  const FALLBACK = 0.1;
  if (durationSeconds === void 0 || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return FALLBACK;
  }
  const target = Math.min(Math.max(durationSeconds * 0.1, FALLBACK), 10);
  return Math.min(target, durationSeconds / 2);
}
const EVAL_HEARTBEAT_INTERVAL_MS = 15e3;
const EVAL_CLAIM_EMPTY_BACKOFF_MS = 5e3;
const EVAL_CLAIM_ERROR_BACKOFF_MS = 15e3;
const DEFAULT_STABLE_FOR_MS = 1e3;
const DEFAULT_POLL_INTERVAL_MS = 100;
const DEFAULT_TIMEOUT_MS = 3e4;
async function waitForArtifactsReady(candidates, options = {}) {
  const stableForMs = nonNegative$1(options.stableForMs, DEFAULT_STABLE_FOR_MS);
  const pollIntervalMs = positive(options.pollIntervalMs, DEFAULT_POLL_INTERVAL_MS);
  const timeoutMs = positive(options.timeoutMs, DEFAULT_TIMEOUT_MS);
  const startedAtMs = Date.now();
  const deadlineMs = startedAtMs + timeoutMs;
  const states = dedupeCandidates(candidates).map((candidate) => ({
    candidate,
    issue: { filePath: candidate.filePath, code: "missing" }
  }));
  if (states.length === 0)
    return { ready: [], issues: [], timedOut: false };
  while (true) {
    throwIfAborted(options.signal);
    const observedAtMs = Date.now();
    for (const state of states) {
      if (Date.now() >= deadlineMs)
        break;
      await sampleCandidate(state, observedAtMs, stableForMs, deadlineMs, options.signal);
    }
    throwIfAborted(options.signal);
    const ready = states.flatMap((state) => state.ready ? [state.ready] : []);
    if (ready.length === states.length) {
      return { ready, issues: [], timedOut: false };
    }
    const remainingMs = deadlineMs - Date.now();
    if (remainingMs <= 0) {
      return {
        ready,
        issues: states.flatMap((state) => state.ready ? [] : [state.issue]),
        timedOut: true
      };
    }
    await abortableDelay(Math.min(pollIntervalMs, remainingMs), options.signal);
  }
}
async function sampleCandidate(state, observedAtMs, stableForMs, deadlineMs, signal) {
  let stat;
  try {
    stat = await fsp.lstat(state.candidate.filePath);
  } catch (error) {
    resetVersionProof(state);
    state.issue = {
      filePath: state.candidate.filePath,
      code: isMissingError(error) ? "missing" : "unreadable",
      reason: error instanceof Error ? error.message : String(error)
    };
    return;
  }
  if (!stat.isFile()) {
    resetVersionProof(state);
    state.issue = { filePath: state.candidate.filePath, code: "not_file" };
    return;
  }
  if (stat.size <= 0) {
    resetVersionProof(state);
    state.issue = { filePath: state.candidate.filePath, code: "empty" };
    return;
  }
  const sample = toSample(stat);
  if (!state.sample || !sameSample(state.sample, sample)) {
    state.sample = sample;
    state.stableSinceMs = observedAtMs;
    state.validatedSample = void 0;
    state.validation = void 0;
    state.ready = void 0;
    state.issue = { filePath: state.candidate.filePath, code: "changing" };
  }
  if (state.ready)
    return;
  if (observedAtMs - (state.stableSinceMs ?? observedAtMs) < stableForMs)
    return;
  if (state.candidate.validate) {
    let validation2 = state.validation;
    if (!state.validatedSample || !sameSample(state.validatedSample, sample) || !validation2) {
      try {
        validation2 = await validateWithinDeadline(state.candidate.validate, state.candidate.filePath, deadlineMs, signal);
      } catch (error) {
        if (signal?.aborted && isAbortError(error))
          throw error;
        validation2 = {
          ok: false,
          reason: error instanceof Error ? error.message : String(error)
        };
      }
      state.validatedSample = sample;
      state.validation = validation2;
    }
    if (!validation2.ok) {
      state.ready = void 0;
      state.issue = {
        filePath: state.candidate.filePath,
        code: "validation_failed",
        ...validation2.reason ? { reason: validation2.reason } : {}
      };
      return;
    }
  }
  try {
    const afterValidation = await fsp.lstat(state.candidate.filePath);
    const afterSample = toSample(afterValidation);
    if (!afterValidation.isFile() || afterValidation.size <= 0 || !sameSample(sample, afterSample)) {
      state.sample = afterValidation.isFile() && afterValidation.size > 0 ? afterSample : void 0;
      state.stableSinceMs = observedAtMs;
      state.validatedSample = void 0;
      state.validation = void 0;
      state.ready = void 0;
      state.issue = {
        filePath: state.candidate.filePath,
        code: afterValidation.size <= 0 ? "empty" : "changing"
      };
      return;
    }
    state.ready = {
      filePath: state.candidate.filePath,
      size: afterValidation.size,
      mtimeMs: afterValidation.mtimeMs
    };
  } catch (error) {
    resetVersionProof(state);
    state.issue = {
      filePath: state.candidate.filePath,
      code: isMissingError(error) ? "missing" : "unreadable",
      reason: error instanceof Error ? error.message : String(error)
    };
  }
}
function resetVersionProof(state) {
  state.sample = void 0;
  state.stableSinceMs = void 0;
  state.validatedSample = void 0;
  state.validation = void 0;
  state.ready = void 0;
}
async function validateWithinDeadline(validate, filePath, deadlineMs, parentSignal) {
  throwIfAborted(parentSignal);
  const controller = new AbortController();
  const remainingMs = Math.max(0, deadlineMs - Date.now());
  let timeout;
  let onParentAbort;
  const deadline = new Promise((resolve) => {
    timeout = setTimeout(() => {
      resolve({
        ok: false,
        reason: "artifact validation exceeded the readiness deadline"
      });
      controller.abort(makeAbortError("artifact validation deadline exceeded"));
    }, remainingMs);
  });
  const parentAbort = parentSignal ? new Promise((_resolve, reject) => {
    onParentAbort = () => {
      controller.abort(parentSignal.reason);
      reject(makeAbortError("artifact readiness wait aborted"));
    };
    parentSignal.addEventListener("abort", onParentAbort, { once: true });
    if (parentSignal.aborted)
      onParentAbort();
  }) : new Promise(() => {
  });
  const validation2 = Promise.resolve().then(() => validate(filePath, controller.signal));
  try {
    return await Promise.race([validation2, deadline, parentAbort]);
  } finally {
    if (timeout)
      clearTimeout(timeout);
    if (parentSignal && onParentAbort) {
      parentSignal.removeEventListener("abort", onParentAbort);
    }
  }
}
function dedupeCandidates(candidates) {
  const byPath = /* @__PURE__ */ new Map();
  for (const candidate of candidates) {
    if (!byPath.has(candidate.filePath))
      byPath.set(candidate.filePath, candidate);
  }
  return [...byPath.values()];
}
function toSample(stat) {
  return {
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    ctimeMs: stat.ctimeMs,
    ino: stat.ino
  };
}
function sameSample(left, right) {
  return left.size === right.size && left.mtimeMs === right.mtimeMs && left.ctimeMs === right.ctimeMs && left.ino === right.ino;
}
function isMissingError(error) {
  return error != null && typeof error === "object" && "code" in error && error.code === "ENOENT";
}
function positive(value, fallback) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}
function nonNegative$1(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}
function throwIfAborted(signal) {
  if (!signal?.aborted)
    return;
  throw makeAbortError("artifact readiness wait aborted");
}
function isAbortError(error) {
  return error instanceof Error && error.name === "AbortError";
}
function makeAbortError(message) {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}
function abortableDelay(ms, signal) {
  if (!signal)
    return new Promise((resolve) => setTimeout(resolve, ms));
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      reject(makeAbortError("artifact readiness wait aborted"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
const execFileAsync = promisify(execFile);
const DEFAULT_EXTRACT_TIMEOUT_MS = 3e4;
const DEFAULT_REMUX_TIMEOUT_MS = 6e4;
const DEFAULT_PROBE_TIMEOUT_MS = 1e4;
async function probeDurationSeconds(inputPath, options) {
  try {
    const { stdout } = await execFileAsync(
      options.ffprobePath,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        inputPath
      ],
      {
        timeout: options.timeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS,
        signal: options.signal
      }
    );
    const duration = Number.parseFloat(stdout.trim());
    return Number.isFinite(duration) && duration > 0 ? duration : void 0;
  } catch {
    return void 0;
  }
}
async function extractFrame(inputPath, outputPath, options) {
  const atSeconds = options.atSeconds ?? 0.1;
  const width = options.width ?? 480;
  const quality = options.quality ?? 4;
  const timeoutMs = options.timeoutMs ?? DEFAULT_EXTRACT_TIMEOUT_MS;
  await execFileAsync(
    options.ffmpegPath,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      String(atSeconds),
      "-i",
      inputPath,
      "-vframes",
      "1",
      "-vf",
      `scale=${width}:-2`,
      "-q:v",
      String(quality),
      "-y",
      outputPath
    ],
    { timeout: timeoutMs }
  );
}
async function tryRemuxFaststart(inputPath, outputPath, options) {
  if (await isFaststart(inputPath)) {
    return { remuxed: false, reason: "already-faststart" };
  }
  const timeoutMs = options.timeoutMs ?? DEFAULT_REMUX_TIMEOUT_MS;
  try {
    await execFileAsync(
      options.ffmpegPath,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        inputPath,
        "-c",
        "copy",
        "-movflags",
        "+faststart",
        "-y",
        outputPath
      ],
      { timeout: timeoutMs }
    );
    return { remuxed: true };
  } catch (error) {
    return { remuxed: false, reason: "remux-failed", error };
  }
}
async function isFaststart(inputPath) {
  let fh;
  try {
    fh = await fsp.open(inputPath, "r");
    const buf = Buffer.alloc(256 * 1024);
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    let pos = 0;
    while (pos + 8 <= bytesRead) {
      let size = buf.readUInt32BE(pos);
      const type = buf.toString("latin1", pos + 4, pos + 8);
      if (size === 1) {
        if (pos + 16 > bytesRead) break;
        const hi = buf.readUInt32BE(pos + 8);
        const lo = buf.readUInt32BE(pos + 12);
        size = hi * 4294967296 + lo;
      } else if (size === 0) {
        return false;
      }
      if (type === "moov") return true;
      if (type === "mdat") return false;
      if (size <= 0 || size > 10 * 1024 ** 4) return false;
      pos += size;
    }
    return false;
  } catch {
    return false;
  } finally {
    await fh?.close().catch(() => {
    });
  }
}
const TERMINAL_STATUSES$1 = /* @__PURE__ */ new Set(["completed", "error", "aborted"]);
async function waitForRunJsonFinalize(runDir, opts) {
  const startMs = Date.now();
  const pollMs = opts.pollMs ?? 200;
  const filePath = path.join(runDir, "run.json");
  while (Date.now() - startMs < opts.timeoutMs) {
    try {
      const raw = await fsp.readFile(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null && typeof parsed.status === "string" && TERMINAL_STATUSES$1.has(parsed.status) && typeof parsed.completedAt === "string" && parsed.completedAt.length > 0 && typeof parsed.sources === "object" && parsed.sources !== null) {
        return true;
      }
    } catch {
    }
    await sleep$2(pollMs);
  }
  return false;
}
async function readSummaryFromRunJson(runDir) {
  const raw = await fsp.readFile(path.join(runDir, "run.json"), "utf-8");
  return normalizeBenchmarkRunSummary(JSON.parse(raw));
}
function normalizeBenchmarkRunSummary(value) {
  const run = requireRecord(value, "run.json");
  const environment = normalizeEnvironment(run.environment);
  const finalizeReason = optionalString(run.finalizeReason, "finalizeReason");
  const counters = normalizeCounters(run.counters);
  const artifactTiers = normalizeArtifactTiers(run.artifactTiers);
  return {
    schemaVersion: requireFiniteNumber(run.schemaVersion, "schemaVersion"),
    runId: requireString(run.runId, "runId"),
    uiSessionId: requireString(run.uiSessionId, "uiSessionId"),
    rootRuntimeSessionId: requireStringOrNull(run.rootRuntimeSessionId, "rootRuntimeSessionId"),
    workspaceDir: requireString(run.workspaceDir, "workspaceDir"),
    ...finalizeReason !== void 0 ? { finalizeReason } : {},
    startedAt: requireString(run.startedAt, "startedAt"),
    completedAt: requireString(run.completedAt, "completedAt"),
    status: requireString(run.status, "status"),
    ...environment ? { environment } : {},
    sessions: normalizeSessions(run.sessions),
    metrics: normalizeMetrics(run.metrics),
    ...counters ? { counters } : {},
    ...artifactTiers !== void 0 ? { artifactTiers } : {},
    sources: normalizeSources(run.sources)
  };
}
function normalizeArtifactTiers(value) {
  if (value === void 0 || value === null) return void 0;
  if (!Array.isArray(value)) {
    throw new Error("run.json artifactTiers must be an array");
  }
  return value.map((raw, index) => {
    const row = requireRecord(raw, `artifactTiers[${index}]`);
    const tier = requireString(row.tier, `artifactTiers[${index}].tier`);
    if (!["input", "intermediate", "final", "unknown"].includes(tier)) {
      throw new Error(`run.json artifactTiers[${index}].tier is invalid`);
    }
    return {
      path: requireString(row.path, `artifactTiers[${index}].path`),
      tier
    };
  });
}
function requireRecord(value, field) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`run.json ${field} must be an object`);
  }
  return value;
}
function requireString(value, field) {
  if (typeof value !== "string") {
    throw new Error(`run.json ${field} must be a string`);
  }
  return value;
}
function requireStringOrNull(value, field) {
  if (value === null || typeof value === "string") {
    return value;
  }
  throw new Error(`run.json ${field} must be a string or null`);
}
function requireFiniteNumber(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`run.json ${field} must be a finite number`);
  }
  return value;
}
function optionalString(value, field) {
  if (value === void 0 || value === null) return void 0;
  return requireString(value, field);
}
function optionalFiniteNumber(value, field) {
  if (value === void 0 || value === null) return void 0;
  return requireFiniteNumber(value, field);
}
function optionalStringOrNull(value, field) {
  if (value === void 0) return void 0;
  return requireStringOrNull(value, field);
}
function optionalFiniteNumberOrNull(value, field) {
  if (value === void 0) return void 0;
  if (value === null) return null;
  return requireFiniteNumber(value, field);
}
function normalizeEnvironment(value) {
  if (value === void 0 || value === null) return void 0;
  const environment = requireRecord(value, "environment");
  const version2 = environment.agentArchitectureVersion;
  if (version2 === void 0) return {};
  if (version2 === "2") {
    return { agentArchitectureVersion: version2 };
  }
  throw new Error('run.json environment.agentArchitectureVersion must be "2"');
}
function normalizeSessions(value) {
  if (!Array.isArray(value)) {
    throw new Error("run.json sessions must be an array");
  }
  return value.map((entry, index) => {
    const session = requireRecord(entry, `sessions[${index}]`);
    const runtimeSessionId = optionalString(
      session.runtimeSessionId,
      `sessions[${index}].runtimeSessionId`
    );
    const agentName = optionalStringOrNull(session.agentName, `sessions[${index}].agentName`);
    const parentRuntimeSessionId = optionalStringOrNull(
      session.parentRuntimeSessionId,
      `sessions[${index}].parentRuntimeSessionId`
    );
    const title = optionalString(session.title, `sessions[${index}].title`);
    const startedAt = optionalString(session.startedAt, `sessions[${index}].startedAt`);
    const endedAt = optionalStringOrNull(session.endedAt, `sessions[${index}].endedAt`);
    const messageCount = optionalFiniteNumber(
      session.messageCount,
      `sessions[${index}].messageCount`
    );
    const partCount = optionalFiniteNumber(session.partCount, `sessions[${index}].partCount`);
    const tokens = normalizeTokens(session.tokens, `sessions[${index}].tokens`);
    const modelUsage = normalizeModelUsage(session.modelUsage, `sessions[${index}].modelUsage`);
    const totalCost = optionalFiniteNumber(session.totalCost, `sessions[${index}].totalCost`);
    return {
      ...runtimeSessionId !== void 0 ? { runtimeSessionId } : {},
      ...agentName !== void 0 ? { agentName } : {},
      ...parentRuntimeSessionId !== void 0 ? { parentRuntimeSessionId } : {},
      ...title !== void 0 ? { title } : {},
      ...startedAt !== void 0 ? { startedAt } : {},
      ...endedAt !== void 0 ? { endedAt } : {},
      ...messageCount !== void 0 ? { messageCount } : {},
      ...partCount !== void 0 ? { partCount } : {},
      ...tokens ? { tokens } : {},
      ...modelUsage !== void 0 ? { modelUsage } : {},
      ...totalCost !== void 0 ? { totalCost } : {}
    };
  });
}
function normalizeModelUsage(value, field = "modelUsage") {
  if (value === void 0 || value === null) return void 0;
  if (!Array.isArray(value)) {
    throw new Error(`run.json ${field} must be an array`);
  }
  return value.map((entry, index) => {
    const rowField = `${field}[${index}]`;
    const usage = requireRecord(entry, rowField);
    const model = requireString(usage.model, `${rowField}.model`).trim();
    if (!model) {
      throw new Error(`run.json ${rowField}.model must be a non-empty string`);
    }
    return {
      model,
      input: requireFiniteNumber(usage.input, `${rowField}.input`),
      output: requireFiniteNumber(usage.output, `${rowField}.output`),
      total: requireFiniteNumber(usage.total, `${rowField}.total`)
    };
  });
}
function normalizeTokens(value, field) {
  if (value === void 0 || value === null) return void 0;
  const tokens = requireRecord(value, field);
  const total = optionalFiniteNumber(tokens.total, `${field}.total`);
  const input = optionalFiniteNumber(tokens.input, `${field}.input`);
  const output = optionalFiniteNumber(tokens.output, `${field}.output`);
  const reasoning = optionalFiniteNumber(tokens.reasoning, `${field}.reasoning`);
  const cacheRead = optionalFiniteNumber(tokens.cacheRead, `${field}.cacheRead`);
  const cacheWrite = optionalFiniteNumber(tokens.cacheWrite, `${field}.cacheWrite`);
  return {
    ...total !== void 0 ? { total } : {},
    ...input !== void 0 ? { input } : {},
    ...output !== void 0 ? { output } : {},
    ...reasoning !== void 0 ? { reasoning } : {},
    ...cacheRead !== void 0 ? { cacheRead } : {},
    ...cacheWrite !== void 0 ? { cacheWrite } : {}
  };
}
function normalizeMetrics(value) {
  const metrics2 = requireRecord(value, "metrics");
  const cacheHitRate = optionalFiniteNumber(metrics2.cacheHitRate, "metrics.cacheHitRate");
  const toolCount = optionalFiniteNumber(metrics2.toolCount, "metrics.toolCount");
  const subagentCount = optionalFiniteNumber(metrics2.subagentCount, "metrics.subagentCount");
  const artifactCount = optionalFiniteNumber(metrics2.artifactCount, "metrics.artifactCount");
  const turnCount = optionalFiniteNumber(metrics2.turnCount, "metrics.turnCount");
  const firstTextChunkLatencyMs = normalizeLatencyStat(
    metrics2.firstTextChunkLatencyMs,
    "metrics.firstTextChunkLatencyMs"
  );
  const firstThinkingLatencyMs = normalizeLatencyStat(
    metrics2.firstThinkingLatencyMs,
    "metrics.firstThinkingLatencyMs"
  );
  const firstToolCallLatencyMs = normalizeLatencyStat(
    metrics2.firstToolCallLatencyMs,
    "metrics.firstToolCallLatencyMs"
  );
  return {
    ...cacheHitRate !== void 0 ? { cacheHitRate } : {},
    ...toolCount !== void 0 ? { toolCount } : {},
    ...subagentCount !== void 0 ? { subagentCount } : {},
    ...artifactCount !== void 0 ? { artifactCount } : {},
    ...turnCount !== void 0 ? { turnCount } : {},
    ...firstTextChunkLatencyMs ? { firstTextChunkLatencyMs } : {},
    ...firstThinkingLatencyMs ? { firstThinkingLatencyMs } : {},
    ...firstToolCallLatencyMs ? { firstToolCallLatencyMs } : {}
  };
}
function normalizeLatencyStat(value, field) {
  if (value === void 0 || value === null) return void 0;
  if (typeof value === "number") {
    const latency = requireFiniteNumber(value, field);
    return {
      count: 1,
      min: latency,
      max: latency,
      avg: latency,
      p50: latency,
      p95: latency,
      values: [latency]
    };
  }
  const stat = requireRecord(value, field);
  const count = optionalFiniteNumber(stat.count, `${field}.count`);
  const min = optionalFiniteNumberOrNull(stat.min, `${field}.min`);
  const max = optionalFiniteNumberOrNull(stat.max, `${field}.max`);
  const avg = optionalFiniteNumberOrNull(stat.avg, `${field}.avg`);
  const p50 = optionalFiniteNumberOrNull(stat.p50, `${field}.p50`);
  const p95 = optionalFiniteNumberOrNull(stat.p95, `${field}.p95`);
  const values = normalizeLatencyValues(stat.values, `${field}.values`);
  return {
    ...count !== void 0 ? { count } : {},
    ...min !== void 0 ? { min } : {},
    ...max !== void 0 ? { max } : {},
    ...avg !== void 0 ? { avg } : {},
    ...p50 !== void 0 ? { p50 } : {},
    ...p95 !== void 0 ? { p95 } : {},
    ...values !== void 0 ? { values } : {}
  };
}
function normalizeLatencyValues(value, field) {
  if (value === void 0) return void 0;
  if (!Array.isArray(value)) {
    throw new Error(`run.json ${field} must be an array`);
  }
  return value.map((entry, index) => {
    if (entry === null) return null;
    return requireFiniteNumber(entry, `${field}[${index}]`);
  });
}
function normalizeSources(value) {
  const sources = requireRecord(value, "sources");
  return Object.fromEntries(
    Object.entries(sources).map(([key, source]) => [key, requireString(source, `sources.${key}`)])
  );
}
function normalizeCounters(value) {
  if (value === void 0 || value === null) return void 0;
  const counters = requireRecord(value, "counters");
  const dropped = optionalFiniteNumber(counters.dropped, "counters.dropped");
  const attributionDropped = optionalFiniteNumber(
    counters.attributionDropped,
    "counters.attributionDropped"
  );
  return {
    ...dropped !== void 0 ? { dropped } : {},
    ...attributionDropped !== void 0 ? { attributionDropped } : {}
  };
}
async function zipDirectoryToBuffer(dir) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const out = new PassThrough();
    out.on("data", (chunk) => chunks.push(chunk));
    out.on("end", () => resolve(Buffer.concat(chunks)));
    out.on("error", reject);
    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.on("error", reject);
    archive.pipe(out);
    archive.directory(dir, false);
    archive.finalize();
  });
}
async function getDirSizeBytes(root) {
  let total = 0;
  async function walk(dir) {
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!e.isFile()) continue;
      try {
        const st = await fsp.stat(full);
        total += st.size;
      } catch {
      }
    }
  }
  await walk(root);
  return total;
}
function isBenchmarkEnabled(value) {
  return value === "1" || value === "true";
}
const POSITIVE_INT_REGEX = /^[1-9]\d*$/;
function parsePositiveIntEnv(rawValue, defaultValue) {
  if (!rawValue) return defaultValue;
  if (!POSITIVE_INT_REGEX.test(rawValue)) return defaultValue;
  const n = Number(rawValue);
  return Number.isSafeInteger(n) && n > 0 ? n : defaultValue;
}
async function cleanupBenchmarkRunDir(benchmarkRunDir, logger2) {
  if (!benchmarkRunDir) return;
  try {
    await fsp.rm(benchmarkRunDir, { recursive: true, force: true });
    logger2.info(`cleaned benchmark runDir: ${benchmarkRunDir}`);
  } catch (err) {
    logger2.warn(
      `cleanup benchmark runDir ${benchmarkRunDir} failed: ${err instanceof Error ? err.message : err}`
    );
  }
}
async function sweepOldBenchmarkDirs(root, retentionDays, logger2) {
  if (!root || !fs.existsSync(root)) return;
  const thresholdMs = Date.now() - retentionDays * 24 * 3600 * 1e3;
  let entries;
  try {
    entries = await fsp.readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.name)) continue;
    const parsedDate = /* @__PURE__ */ new Date(`${e.name}T00:00:00Z`);
    const dayMs = parsedDate.getTime();
    if (Number.isNaN(dayMs)) continue;
    if (parsedDate.toISOString().slice(0, 10) !== e.name) continue;
    if (dayMs >= thresholdMs) continue;
    const dayDir = path.join(root, e.name);
    try {
      await fsp.rm(dayDir, { recursive: true, force: true });
      logger2.info(`benchmark sweep: removed ${dayDir} (>${retentionDays}d)`);
    } catch (err) {
      logger2.warn(
        `benchmark sweep failed for ${dayDir}: ${err instanceof Error ? err.message : err}`
      );
    }
  }
}
async function resolveBenchmarkRunDirFromFsWalk(args) {
  const { benchmarkRoot, sessionId, runtimeSessionId, workspace, startedAtMs, logger: logger2 } = args;
  if (!sessionId || sessionId.length === 0) return void 0;
  if (!benchmarkRoot || !fs.existsSync(benchmarkRoot)) return void 0;
  const startDate = new Date(startedAtMs);
  const dayNames = [
    isoUtcDay(new Date(startDate.getTime() - 24 * 3600 * 1e3)),
    isoUtcDay(startDate),
    isoUtcDay(new Date(startDate.getTime() + 24 * 3600 * 1e3))
  ];
  let workspaceRealpath;
  try {
    workspaceRealpath = await fsp.realpath(workspace);
  } catch {
    workspaceRealpath = workspace;
  }
  const tWindowStartMs = startedAtMs - 3e4;
  const tWindowEndMs = Date.now() + 5e3;
  const candidates = [];
  for (const day of dayNames) {
    const dayDir = path.join(benchmarkRoot, day);
    if (!fs.existsSync(dayDir)) continue;
    let entries;
    try {
      entries = await fsp.readdir(dayDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const candidateDir = path.join(dayDir, e.name);
      const runJsonPath = path.join(candidateDir, "run.json");
      if (!fs.existsSync(runJsonPath)) continue;
      let parsed;
      try {
        const raw = await fsp.readFile(runJsonPath, "utf-8");
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }
      if (parsed.uiSessionId !== sessionId) continue;
      if (runtimeSessionId && parsed.rootRuntimeSessionId !== runtimeSessionId) continue;
      const parsedWorkspaceDir = parsed.workspaceDir ?? "";
      let candidateWorkspaceRealpath;
      try {
        candidateWorkspaceRealpath = await fsp.realpath(parsedWorkspaceDir);
      } catch {
        candidateWorkspaceRealpath = parsedWorkspaceDir;
      }
      if (candidateWorkspaceRealpath !== workspaceRealpath) continue;
      const startedAtCandidate = parsed.startedAt ? new Date(parsed.startedAt).getTime() : Number.NaN;
      if (Number.isNaN(startedAtCandidate)) continue;
      if (startedAtCandidate < tWindowStartMs || startedAtCandidate > tWindowEndMs) continue;
      candidates.push(candidateDir);
    }
  }
  if (candidates.length === 0) {
    logger2.warn(
      `fs walk fallback: 0 candidates match (sessionId=${sessionId}, workspace=${workspace}, dayScan=${dayNames.join(",")})`
    );
    return void 0;
  }
  if (candidates.length > 1) {
    logger2.warn(
      `fs walk fallback: ${candidates.length} candidates match (ambiguous, returning null per 不变量 8): ${candidates.join(", ")}`
    );
    return void 0;
  }
  return candidates[0];
}
function isoUtcDay(d) {
  return d.toISOString().slice(0, 10);
}
function sleep$2(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
const DEFAULT_SWING_UPLOAD_URL = process.env.SWING_UPLOAD_URL?.trim() || "https://swing.xaminim.com/save/cos";
const DEFAULT_COS_BUCKET = process.env.COS_BUCKET?.trim() || "qa-tool-1315599187";
const DEFAULT_COS_REGION = process.env.COS_REGION?.trim() || "ap-shanghai";
function publicUrl(cosKey, bucket = DEFAULT_COS_BUCKET, region = DEFAULT_COS_REGION) {
  const k = cosKey.replace(/^\/+/, "");
  return `https://${bucket}.cos.${region}.myqcloud.com/${k}`;
}
async function uploadBytes(cosKey, data, opts = {}) {
  return uploadInternal(cosKey, data, data.byteLength, opts);
}
async function uploadFile(cosKey, localPath, opts = {}) {
  const blob = await fs.openAsBlob(localPath, { type: "application/octet-stream" });
  return uploadInternal(cosKey, blob, blob.size, opts);
}
async function uploadInternal(cosKey, payload, byteLength, opts) {
  const swingUrl = opts.swingUrl ?? DEFAULT_SWING_UPLOAD_URL;
  const retries = Math.max(1, opts.retries ?? 3);
  const timeoutMs = opts.timeoutMs ?? 12e4;
  const key = cosKey.replace(/^\/+/, "");
  const { cosPath, fileName } = splitKey(key);
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const form = new FormData();
      form.append("cos_path", cosPath);
      const blob = payload instanceof Blob ? payload : new Blob([new Uint8Array(payload).buffer], {
        type: "application/octet-stream"
      });
      form.append("file", blob, fileName);
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      let resp;
      try {
        resp = await fetch(swingUrl, {
          method: "POST",
          body: form,
          signal: ctrl.signal
        });
      } finally {
        clearTimeout(t);
      }
      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        if (resp.status >= 500 || resp.status === 429) {
          lastErr = new Error(`swing HTTP ${resp.status}: ${body.slice(0, 200)}`);
          await sleep$1(2 ** attempt * 1e3);
          continue;
        }
        throw new Error(`swing HTTP ${resp.status}: ${body.slice(0, 200)}`);
      }
      const respBody = await resp.text();
      let parsed;
      try {
        parsed = JSON.parse(respBody);
      } catch {
        throw new Error(`swing returned non-JSON: ${respBody.slice(0, 200)}`);
      }
      if (parsed.status !== "success") {
        throw new Error(`swing returned non-success: ${respBody.slice(0, 200)}`);
      }
      return publicUrl(key, opts.bucket, opts.region);
    } catch (err) {
      lastErr = err;
      if (attempt < retries - 1) {
        await sleep$1(2 ** attempt * 1e3);
      }
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(
    `swing upload failed after ${retries} attempt(s) for key=${key} (size=${byteLength}B): ${msg}`
  );
}
function splitKey(key) {
  const idx = key.lastIndexOf("/");
  if (idx < 0) return { cosPath: "/", fileName: key };
  return { cosPath: `${key.slice(0, idx)}/`, fileName: key.slice(idx + 1) };
}
function sleep$1(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function buildEvalArtifactKey(runId, itemId, filename) {
  const ext = path.extname(filename).toLowerCase();
  const id = crypto.randomUUID();
  const safeExt = /^\.[A-Za-z0-9]{1,16}$/.test(ext) ? ext : "";
  return `minimaxhub_benchmark_data/eval/run-${runId}/item-${itemId}/${id}${safeExt}`;
}
const LEGACY_SWING_UPLOADER = {
  uploadBytes,
  uploadFile
};
function artifactUploader(ctx) {
  return ctx.artifactUploader ?? LEGACY_SWING_UPLOADER;
}
async function collectAndUploadArtifacts(ctx) {
  const userArtifacts = [];
  const sideArtifacts = [];
  const requiredArtifactFailures = [];
  try {
    const trajectory = await collectTrajectory(ctx);
    if (trajectory) sideArtifacts.push(trajectory);
  } catch (err) {
    ctx.logger.warn(`collectTrajectory failed: ${err instanceof Error ? err.message : err}`);
  }
  try {
    const generated = await collectGeneratedFiles(ctx, requiredArtifactFailures);
    userArtifacts.push(...generated);
  } catch (err) {
    const message = `collectGeneratedFiles failed: ${err instanceof Error ? err.message : err}`;
    ctx.logger.warn(message);
    recordRequiredArtifactFailure(ctx, requiredArtifactFailures, message);
  }
  try {
    const log = await collectLog(ctx);
    if (log) sideArtifacts.push(log);
  } catch (err) {
    ctx.logger.warn(`collectLog failed: ${err instanceof Error ? err.message : err}`);
  }
  if (ctx.benchmarkRunDir) {
    try {
      const benchmarkRun = await collectBenchmarkRun(ctx);
      if (benchmarkRun) sideArtifacts.push(benchmarkRun);
    } catch (err) {
      ctx.logger.warn(`collectBenchmarkRun failed: ${err instanceof Error ? err.message : err}`);
    }
  } else {
    ctx.logger.info("no benchmarkRunDir on ctx; skipping benchmark_run lane");
  }
  try {
    const workspaceExport = await collectWorkspaceExport(ctx);
    if (workspaceExport) sideArtifacts.push(workspaceExport);
  } catch (err) {
    ctx.logger.warn(`collectWorkspaceExport failed: ${err instanceof Error ? err.message : err}`);
  }
  const artifactTiers = sideArtifacts.find((artifact) => artifact.kind === "benchmark_run")?.meta?.artifact_tiers;
  const classifiedUserArtifacts = applyArtifactTierClassifications(userArtifacts, artifactTiers);
  classifiedUserArtifacts.forEach((a, i) => {
    a.sequence = i;
  });
  sideArtifacts.forEach((a, i) => {
    a.sequence = i;
  });
  return {
    userArtifacts: classifiedUserArtifacts,
    sideArtifacts,
    requiredArtifactFailures
  };
}
function normalizedArtifactPath(value) {
  if (typeof value !== "string") return null;
  return value.replace(/\\/g, "/").replace(/^(\.\/)+/, "");
}
function applyArtifactTierClassifications(artifacts, rawTiers) {
  if (!Array.isArray(rawTiers)) return artifacts;
  const tiers = /* @__PURE__ */ new Map();
  for (const raw of rawTiers) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const row = raw;
    const artifactPath = normalizedArtifactPath(row.path);
    const tier = row.tier;
    if (artifactPath && (tier === "input" || tier === "intermediate" || tier === "final" || tier === "unknown")) {
      tiers.set(artifactPath, tier);
    }
  }
  return artifacts.map((artifact) => {
    const sourcePath = normalizedArtifactPath(artifact.meta?.source_path);
    const tier = sourcePath ? tiers.get(sourcePath) : void 0;
    if (!tier) return artifact;
    return {
      ...artifact,
      meta: { ...artifact.meta ?? {}, artifact_tier: tier }
    };
  });
}
async function collectTrajectory(ctx) {
  const url = `${ctx.gatewayUrl.replace(/\/$/, "")}/api/sessions/${encodeURIComponent(
    ctx.sessionId
  )}/export`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6e4);
  let resp;
  let buf;
  try {
    resp = await fetch(url, {
      headers: ctx.workspaceBinding ? workspaceGatewayIdentityHeaders(ctx.workspaceBinding) : ctx.workspaceClaim ? { [HILO_WORKSPACE_IDENTITY_HEADER]: ctx.workspaceClaim } : void 0,
      signal: ctrl.signal
    });
    if (!resp.ok) {
      ctx.logger.warn(`trajectory export ${url} → HTTP ${resp.status}`);
      return null;
    }
    buf = new Uint8Array(await resp.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
  const filename = `trajectory-${ctx.sessionId}.zip`;
  const cosKey = buildEvalArtifactKey(ctx.runId, ctx.itemId, filename);
  const cosUrl = await artifactUploader(ctx).uploadBytes(cosKey, buf);
  ctx.logger.info(`trajectory uploaded: ${cosUrl} (${buf.byteLength}B)`);
  return {
    kind: "trajectory",
    filename,
    mime_type: "application/zip",
    size_bytes: buf.byteLength,
    cos_url: cosUrl,
    cos_key: cosKey,
    meta: {
      session_id: ctx.sessionId,
      format: "gateway-export-v1"
    }
  };
}
async function collectGeneratedFiles(ctx, requiredFailures) {
  if (!fs.existsSync(ctx.outputFilesRoot)) {
    const message = `output_files dir not present (${ctx.outputFilesRoot}); no generated files`;
    ctx.logger.info(message);
    recordRequiredArtifactFailure(ctx, requiredFailures, message);
    return [];
  }
  const fresh = await listFilesNewerThan(ctx.outputFilesRoot, ctx.startedAtMs);
  if (fresh.length === 0) {
    const message = `no generated files newer than dispatch start in ${ctx.outputFilesRoot}`;
    ctx.logger.info(message);
    recordRequiredArtifactFailure(ctx, requiredFailures, message);
    return [];
  }
  const candidates = fresh.map((filePath) => {
    const filename = path.basename(filePath);
    const kind = inferKind(inferMimeType(filename), filename);
    if (kind !== "video") return { filePath };
    return {
      filePath,
      validate: async (candidatePath, signal) => {
        const duration = await probeDurationSeconds(candidatePath, {
          ffprobePath: process.env.FFPROBE_PATH || "ffprobe",
          signal
        });
        return Number.isFinite(duration) && duration > 0 ? { ok: true } : { ok: false, reason: "ffprobe did not report a positive media duration" };
      }
    };
  });
  const readiness = await waitForArtifactsReady(candidates, {
    stableForMs: parsePositiveIntEnv(process.env.HILO_BENCHMARK_ARTIFACT_STABLE_MS, 1e3),
    pollIntervalMs: parsePositiveIntEnv(process.env.HILO_BENCHMARK_ARTIFACT_POLL_MS, 100),
    timeoutMs: parsePositiveIntEnv(process.env.HILO_BENCHMARK_ARTIFACT_READY_TIMEOUT_MS, 3e4)
  });
  for (const issue of readiness.issues) {
    const relativePath = path.relative(ctx.outputFilesRoot, issue.filePath);
    ctx.logger.warn(
      `artifact_not_ready:${issue.code} ${relativePath}${issue.reason ? ` (${issue.reason})` : ""}; skipping upload`
    );
    recordRequiredArtifactFailure(
      ctx,
      requiredFailures,
      `${relativePath}: artifact_not_ready:${issue.code}${issue.reason ? ` (${issue.reason})` : ""}`
    );
  }
  ctx.logger.info(
    `uploading ${readiness.ready.length}/${fresh.length} ready generated file(s) to artifact store`
  );
  const results = [];
  for (const ready of readiness.ready) {
    const filePath = ready.filePath;
    try {
      const filename = path.basename(filePath);
      const mime = inferMimeType(filename);
      const kind = inferKind(mime, filename);
      const cosKey = buildEvalArtifactKey(ctx.runId, ctx.itemId, filename);
      const extras = await preprocessVideoIfApplicable(ctx, filePath, filename, kind);
      const uploadPath = extras.uploadPath ?? filePath;
      let cosUrl;
      try {
        cosUrl = await artifactUploader(ctx).uploadFile(cosKey, uploadPath);
      } finally {
        if (extras.remuxedTempPath) {
          await fsp.unlink(extras.remuxedTempPath).catch(() => {
          });
        }
      }
      const uploadedSize = extras.uploadedSize ?? ready.size;
      results.push({
        kind,
        filename,
        mime_type: mime,
        size_bytes: uploadedSize,
        cos_url: cosUrl,
        cos_key: cosKey,
        meta: {
          source_path: path.relative(ctx.outputFilesRoot, filePath),
          mtime_ms: ready.mtimeMs,
          ...extras.posterUrl ? { poster_url: extras.posterUrl } : {}
        }
      });
    } catch (err) {
      const message = `upload failed for ${filePath}: ${err instanceof Error ? err.message : err}`;
      ctx.logger.warn(message);
      recordRequiredArtifactFailure(ctx, requiredFailures, message);
    }
  }
  return results;
}
function recordRequiredArtifactFailure(ctx, failures, message) {
  if (ctx.requireGeneratedArtifacts) failures.push(message);
}
async function preprocessVideoIfApplicable(ctx, filePath, filename, kind) {
  if (kind !== "video" || !/\.mp4$/i.test(filename)) {
    return {};
  }
  const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
  const ffprobePath = process.env.FFPROBE_PATH || "ffprobe";
  const baseName = path.parse(filename).name;
  let uploadPath;
  let remuxedTempPath;
  let uploadedSize;
  try {
    const candidate = path.join(os.tmpdir(), `${baseName}-${process.pid}-faststart.mp4`);
    const remux = await tryRemuxFaststart(filePath, candidate, { ffmpegPath });
    if (remux.remuxed) {
      uploadPath = candidate;
      remuxedTempPath = candidate;
      try {
        uploadedSize = (await fsp.stat(candidate)).size;
      } catch {
      }
    } else if (remux.reason === "remux-failed") {
      ctx.logger.warn(`faststart remux failed for ${filename}; uploading original`);
    }
  } catch (err) {
    ctx.logger.warn(
      `faststart pre-check threw for ${filename}: ${err instanceof Error ? err.message : err}`
    );
  }
  let posterUrl;
  let posterPath;
  try {
    const duration = await probeDurationSeconds(filePath, { ffprobePath });
    posterPath = path.join(os.tmpdir(), `${baseName}-${process.pid}-poster.jpg`);
    await extractFrame(filePath, posterPath, {
      ffmpegPath,
      atSeconds: posterSeekSeconds(duration)
    });
    const posterKey = buildEvalArtifactKey(ctx.runId, ctx.itemId, `${baseName}-poster.jpg`);
    posterUrl = await artifactUploader(ctx).uploadFile(posterKey, posterPath);
  } catch (err) {
    ctx.logger.warn(
      `poster extract failed for ${filename}: ${err instanceof Error ? err.message : err}`
    );
  } finally {
    if (posterPath) {
      await fsp.unlink(posterPath).catch(() => {
      });
    }
  }
  return { uploadPath, remuxedTempPath, uploadedSize, posterUrl };
}
async function listFilesNewerThan(root, thresholdMs) {
  const out = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      const full = path.join(dir, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!e.isFile()) continue;
      try {
        const st = await fsp.stat(full);
        if (st.mtimeMs > thresholdMs) out.push(full);
      } catch {
      }
    }
  }
  await walk(root);
  out.sort();
  return out;
}
async function collectLog(ctx) {
  const logPath = path.join(ctx.workspace, ".eval", "run.log");
  if (!fs.existsSync(logPath)) {
    ctx.logger.info(`no per-item log at ${logPath}; skipping log artifact`);
    return null;
  }
  const stat = await fsp.stat(logPath);
  if (stat.size === 0) {
    ctx.logger.info(`per-item log at ${logPath} is empty; skipping log artifact`);
    return null;
  }
  const filename = `run-${ctx.runId}-item-${ctx.itemId}.log`;
  const cosKey = buildEvalArtifactKey(ctx.runId, ctx.itemId, filename);
  const cosUrl = await artifactUploader(ctx).uploadFile(cosKey, logPath);
  ctx.logger.info(`log uploaded: ${cosUrl} (${stat.size}B)`);
  return {
    kind: "log",
    filename,
    mime_type: "text/plain",
    size_bytes: stat.size,
    cos_url: cosUrl,
    cos_key: cosKey,
    meta: {
      source: "gateway+opencode stdout",
      source_path: path.relative(ctx.workspace, logPath)
    }
  };
}
async function collectBenchmarkRun(ctx) {
  const runDir = ctx.benchmarkRunDir;
  if (!runDir) return null;
  if (!fs.existsSync(runDir)) {
    ctx.logger.warn(`benchmark runDir ${runDir} not on disk; skipping`);
    return null;
  }
  const finalizeTimeoutMs = parsePositiveIntEnv(
    process.env.HILO_BENCHMARK_FINALIZE_TIMEOUT_MS,
    25e4
  );
  const finalized = await waitForRunJsonFinalize(runDir, { timeoutMs: finalizeTimeoutMs });
  if (!finalized) {
    ctx.logger.warn(
      `benchmark runDir ${runDir} hit ${finalizeTimeoutMs}ms finalize timeout; skipping benchmark_run upload (partial 不进 COS/DB per 不变量 7)`
    );
    return null;
  }
  let summary2;
  try {
    summary2 = await readSummaryFromRunJson(runDir);
  } catch (err) {
    ctx.logger.warn(
      `readSummaryFromRunJson(${runDir}) failed: ${err instanceof Error ? err.message : err}`
    );
    return null;
  }
  const sessions = summary2.sessions ?? [];
  const tokensTotal = sessions.reduce((s, x) => s + (x.tokens?.total ?? 0), 0);
  const tokensInput = sessions.reduce((s, x) => s + (x.tokens?.input ?? 0), 0);
  const tokensOutput = sessions.reduce((s, x) => s + (x.tokens?.output ?? 0), 0);
  const tokensReasoning = sessions.reduce((s, x) => s + (x.tokens?.reasoning ?? 0), 0);
  const tokensCacheRead = sessions.reduce((s, x) => s + (x.tokens?.cacheRead ?? 0), 0);
  const tokensCacheWrite = sessions.reduce((s, x) => s + (x.tokens?.cacheWrite ?? 0), 0);
  const totalCostUsd = sessions.reduce((s, x) => s + (x.totalCost ?? 0), 0);
  const modelUsage = aggregateModelUsage(sessions);
  const dirSizeBytes = await getDirSizeBytes(runDir);
  const maxBytes = parsePositiveIntEnv(process.env.HILO_BENCHMARK_MAX_BYTES, 209715200);
  if (dirSizeBytes > maxBytes) {
    ctx.logger.warn(
      `benchmark runDir ${runDir} size ${dirSizeBytes}B exceeds HILO_BENCHMARK_MAX_BYTES=${maxBytes}; skipping benchmark_run upload (防 RAM peak ~3x = ${dirSizeBytes * 3}B 撞 worker OOM, plan §6 踩坑 1)`
    );
    return null;
  }
  const zipBuf = await zipDirectoryToBuffer(runDir);
  const filename = `benchmark-${path.basename(runDir)}.zip`;
  const cosKey = buildEvalArtifactKey(ctx.runId, ctx.itemId, filename);
  const cosUrl = await artifactUploader(ctx).uploadBytes(cosKey, zipBuf);
  const actualAgentVersion = summary2.environment?.agentArchitectureVersion;
  ctx.logger.info(
    `benchmark_run uploaded: ${cosUrl} (${zipBuf.byteLength}B from ${dirSizeBytes}B raw)`
  );
  const meta = Object.fromEntries(
    Object.entries({
      schema_version: summary2.schemaVersion,
      run_id_hilo: summary2.runId,
      ui_session_id: summary2.uiSessionId,
      run_status: summary2.status,
      finalize_reason: summary2.finalizeReason,
      ...actualAgentVersion === "2" ? { actual_agent_version: 2 } : {},
      // sessions[] 派生 (sister plan §3.4 F2 fix)
      tokens_total: tokensTotal,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      tokens_reasoning: tokensReasoning,
      tokens_cache_read: tokensCacheRead,
      tokens_cache_write: tokensCacheWrite,
      total_cost_usd: totalCostUsd,
      ...modelUsage ? { model_usage: modelUsage } : {},
      ...summary2.artifactTiers !== void 0 ? { artifact_tiers: summary2.artifactTiers } : {},
      // metrics 顶层
      cache_hit_rate: summary2.metrics?.cacheHitRate,
      tool_count: summary2.metrics?.toolCount,
      subagent_count: summary2.metrics?.subagentCount,
      first_thinking_p50: summary2.metrics?.firstThinkingLatencyMs?.p50,
      first_tool_p50: summary2.metrics?.firstToolCallLatencyMs?.p50,
      dropped_count: summary2.counters?.dropped,
      attribution_dropped: summary2.counters?.attributionDropped,
      sources: summary2.sources,
      // F9 cohort 分桶 — auto-responder / supervisor 标记。R1 deep-review F1 fix:
      // 用 isBenchmarkEnabled (truthy '1' | 'true' parity) 与 §3.1 PII guard / hilo
      // gateway-side `app/packages/config/src/env.ts:303-305 isTruthyEnv` 保持一致,
      // 防 lane env 写 'true' 时 collector 误判 false → 落库 cohort 分桶错。
      auto_respond_enabled: isBenchmarkEnabled(process.env.HILO_BENCHMARK_AUTO_RESPOND),
      supervisor_enabled: isBenchmarkEnabled(process.env.HILO_BENCHMARK_SUPERVISOR_ENABLED)
    }).filter(([, value]) => value !== void 0)
  );
  return {
    kind: "benchmark_run",
    filename,
    mime_type: "application/zip",
    size_bytes: zipBuf.byteLength,
    cos_url: cosUrl,
    cos_key: cosKey,
    meta
  };
}
async function collectWorkspaceExport(ctx) {
  if (!ctx.gatewayUrl) {
    ctx.logger.info("no gatewayUrl on ctx; skipping workspace_export lane");
    return null;
  }
  if (!fs.existsSync(ctx.workspace)) {
    ctx.logger.info(`workspace ${ctx.workspace} not on disk; skipping workspace_export lane`);
    return null;
  }
  const maxBytes = parsePositiveIntEnv(
    process.env.HILO_BENCHMARK_WORKSPACE_EXPORT_MAX_BYTES,
    209715200
  );
  const workspaceSizeBytes = await getDirSizeBytes(ctx.workspace);
  if (workspaceSizeBytes > maxBytes) {
    ctx.logger.warn(
      `workspace ${ctx.workspace} size ${workspaceSizeBytes}B exceeds HILO_BENCHMARK_WORKSPACE_EXPORT_MAX_BYTES=${maxBytes}; skipping workspace_export`
    );
    return null;
  }
  const destPath = path.join(
    os.tmpdir(),
    `hub-eval-export-${ctx.runId}-${ctx.itemId}-${process.pid}.zip`
  );
  const archiveLogger = {
    info: (m) => ctx.logger.info(`[workspace_export] ${m}`),
    warn: (m) => ctx.logger.warn(`[workspace_export] ${m}`)
  };
  try {
    const result = await exportProjectToZip(
      ctx.workspace,
      destPath,
      "hub-eval-worker",
      ctx.gatewayUrl,
      archiveLogger,
      {
        workspaceBinding: ctx.workspaceBinding,
        workspaceClaim: ctx.workspaceClaim
      }
    );
    if (!result || result.size <= 0) {
      ctx.logger.warn(
        `exportProjectToZip returned size=${result?.size ?? 0}B; skipping workspace_export upload`
      );
      return null;
    }
    const zipSizeBytes = (await fsp.stat(destPath)).size;
    if (zipSizeBytes <= 0) {
      ctx.logger.warn("workspace_export zip is empty; skipping upload");
      return null;
    }
    if (zipSizeBytes > maxBytes) {
      ctx.logger.warn(
        `workspace_export zip size ${zipSizeBytes}B exceeds HILO_BENCHMARK_WORKSPACE_EXPORT_MAX_BYTES=${maxBytes}; skipping upload`
      );
      return null;
    }
    const filename = `workspace-${ctx.runId}-item-${ctx.itemId}.zip`;
    const cosKey = buildEvalArtifactKey(ctx.runId, ctx.itemId, filename);
    const cosUrl = await artifactUploader(ctx).uploadFile(cosKey, destPath);
    ctx.logger.info(
      `workspace_export uploaded: ${cosUrl} (${zipSizeBytes}B from ${result.opencodeSessionCount} sessions)`
    );
    return {
      kind: "workspace_export",
      filename,
      mime_type: "application/zip",
      size_bytes: zipSizeBytes,
      cos_url: cosUrl,
      cos_key: cosKey,
      meta: {
        format: "desktop-export-archive",
        manifest_magic: "minimax-hub-project",
        // Pass through the bundler's own counters so the UI can render a
        // "9 sessions / 27 messages" summary without re-downloading.
        opencode_session_count: result.opencodeSessionCount,
        opencode_dedup_alias_count: result.dedupAliasCount,
        workspace: ctx.workspace
      }
    };
  } finally {
    await fsp.unlink(destPath).catch(() => void 0);
  }
}
const EXT_MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
  ".csv": "text/csv",
  ".html": "text/html",
  ".zip": "application/zip"
};
function aggregateModelUsage(sessions) {
  const merged = /* @__PURE__ */ new Map();
  for (const session of sessions) {
    for (const usage of session.modelUsage ?? []) {
      const model = usage.model?.trim();
      if (!model) continue;
      const bucket = merged.get(model) ?? { model, input_tokens: 0, output_tokens: 0 };
      bucket.input_tokens += usage.input ?? 0;
      bucket.output_tokens += usage.output ?? 0;
      merged.set(model, bucket);
    }
  }
  return merged.size > 0 ? [...merged.values()] : void 0;
}
function inferMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  return EXT_MIME[ext] ?? "application/octet-stream";
}
function inferKind(mime, filename) {
  if (mime.startsWith("image/")) {
    if (/^screenshot|^screen[_-]/i.test(filename)) return "screenshot";
    return "image";
  }
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf" || mime === "application/json" || mime.startsWith("text/") || mime === "application/zip") {
    return "document";
  }
  return "other";
}
const ACTIVE_ITEM_AGENT_VERSIONS = Object.freeze([2]);
function normalizeClaimAgentVersions(_workerMode, values) {
  if (!Array.isArray(values) || values.length === 0) {
    return ACTIVE_ITEM_AGENT_VERSIONS;
  }
  const normalized = [];
  for (const value of values) {
    if (value !== 2) {
      throw new Error(
        `invalid worker itemAgentVersions entry=${JSON.stringify(value)}; expected 2`
      );
    }
    if (!normalized.includes(value)) normalized.push(value);
  }
  return normalized;
}
function resolveItemAgentVersion(raw) {
  if (raw === void 0 || raw === 2) return 2;
  throw new Error(`invalid item agent_version=${JSON.stringify(raw)}; expected numeric 2`);
}
const DEFAULT_ITEM_API_PREFIX = "/api/eval/external/items";
function claimSearchParams(config) {
  const params = new URLSearchParams();
  params.set("worker_id", config.workerId);
  params.set("max", "1");
  const queue = (config.workerQueue ?? "").trim();
  if (queue) params.set("queue", queue);
  if (config.workerRegion && config.workerChannel) {
    params.set("worker_region", config.workerRegion);
    params.set("worker_channel", config.workerChannel);
  }
  if (config.buildRef) params.set("build_ref", config.buildRef);
  if (config.workerMode) params.set("worker_mode", config.workerMode);
  for (const version2 of config.itemAgentVersions ?? []) {
    params.append("item_agent_versions", String(version2));
  }
  return params;
}
function itemApiPath(idOrSuffix, suffix) {
  const base = DEFAULT_ITEM_API_PREFIX;
  if (suffix === void 0) return `${base}/${idOrSuffix}`;
  return `${base}/${encodeURIComponent(String(idOrSuffix))}/${suffix}`;
}
function reportPath(item, suffix) {
  return itemApiPath(item.item_id, suffix);
}
function reportUrl(item, suffix, backendUrl) {
  return new URL(reportPath(item, suffix), item.callback?.url ?? backendUrl).toString();
}
function claimUrl(backendUrl) {
  return new URL(itemApiPath("claim"), backendUrl);
}
const HAILUO_CDN_HOSTS = /* @__PURE__ */ new Set(["cdn.hailuoai.com", "cdn.hailuoai.video"]);
const SIGNED_HEADER_ALLOWLIST = /* @__PURE__ */ new Set(["content-type", "content-md5", "x-oss-object-acl"]);
const DEFAULT_UPLOAD_TIMEOUT_MS = 30 * 60 * 1e3;
function createPresignedArtifactUploader(options) {
  const fetchFn = options.fetchFn ?? fetch;
  const upload = async (key, sizeBytes, body) => {
    const fileName = path.basename(key);
    const signed = await options.requestUpload({
      file_name: fileName,
      content_type: contentTypeFor(fileName),
      size_bytes: sizeBytes
    });
    if (signed.method !== "PUT") {
      throw new Error(`unsupported artifact upload method ${String(signed.method)}`);
    }
    assertHailuoCdnUrl(signed.object_url, options.expectedCdnHost);
    assertAliyunOssUploadUrl(signed.upload_url);
    assertSignedHeaders(signed.headers);
    const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS);
    const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
    const response = await fetchFn(signed.upload_url, {
      method: "PUT",
      headers: signed.headers,
      body,
      redirect: "error",
      signal
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 200);
      throw new Error(`Hailuo OSS PUT failed: HTTP ${response.status} ${detail}`.trim());
    }
    return signed.object_url;
  };
  return {
    async uploadBytes(key, data) {
      const bytes = new Uint8Array(data);
      return upload(
        key,
        bytes.byteLength,
        new Blob([bytes.buffer], {
          type: contentTypeFor(key)
        })
      );
    },
    async uploadFile(key, localPath) {
      const blob = await fs.openAsBlob(localPath, {
        type: contentTypeFor(key)
      });
      return upload(key, blob.size, blob);
    }
  };
}
function assertHailuoCdnUrl(rawUrl, expectedHost) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
  }
  if (!parsed || parsed.protocol !== "https:" || !HAILUO_CDN_HOSTS.has(parsed.hostname) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("artifact reservation did not return a Hailuo CDN URL");
  }
  if (expectedHost && parsed.hostname !== expectedHost) {
    throw new Error("artifact CDN host does not match worker fleet");
  }
}
function assertAliyunOssUploadUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
  }
  const host = parsed?.hostname ?? "";
  const isOssHost = host.endsWith(".aliyuncs.com") && (host.startsWith("oss-") || host.includes(".oss-"));
  if (!parsed || parsed.protocol !== "https:" || !isOssHost || parsed.username || parsed.password) {
    throw new Error("artifact reservation did not return an Aliyun OSS HTTPS URL");
  }
}
function assertSignedHeaders(headers) {
  for (const [name, value] of Object.entries(headers)) {
    if (!SIGNED_HEADER_ALLOWLIST.has(name.toLowerCase()) || /[\r\n]/.test(name) || /[\r\n]/.test(value)) {
      throw new Error(`artifact reservation returned unsafe signed header ${name}`);
    }
  }
}
function contentTypeFor(fileName) {
  switch (path.extname(fileName).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mov":
      return "video/quicktime";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".m4a":
      return "audio/mp4";
    case ".pdf":
      return "application/pdf";
    case ".zip":
      return "application/zip";
    case ".json":
      return "application/json";
    case ".log":
    case ".txt":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
}
function createItemArtifactUploader(options) {
  const { item, workerQueue, workerRegion, signal, postReservation } = options;
  const isTaskWorker = workerQueue?.trim() === "task";
  if (item.artifact_upload?.mode !== "hailuo_oss_presigned") {
    if (isTaskWorker) {
      throw new Error("task envelope is missing direct Hailuo OSS artifact upload");
    }
    return void 0;
  }
  if (isTaskWorker && !workerRegion) {
    throw new Error("task worker deployment identity is missing");
  }
  return createPresignedArtifactUploader({
    expectedCdnHost: workerRegion === "overseas" ? "cdn.hailuoai.video" : workerRegion === "domestic" ? "cdn.hailuoai.com" : void 0,
    signal,
    requestUpload: async (request) => {
      const response = await postReservation(
        reportPath(item, "artifact-upload"),
        {
          claim_token: item.claim_token,
          ...item.epoch_id ? { epoch_id: item.epoch_id } : {},
          ...request
        },
        item.callback
      );
      if (!response.ok) {
        const detail = (await response.text().catch(() => "")).slice(0, 200);
        throw new Error(
          `artifact upload reservation failed: HTTP ${response.status} ${detail}`.trim()
        );
      }
      return await response.json();
    }
  });
}
const ITEM_EVENT_ARTIFACT_SUMMARY_LIMIT = 20;
function normalizeCollectedArtifacts(collected) {
  if (Array.isArray(collected)) {
    return { userArtifacts: collected, sideArtifacts: [], requiredArtifactFailures: [] };
  }
  return {
    ...collected,
    requiredArtifactFailures: collected.requiredArtifactFailures ?? []
  };
}
function resequenceArtifacts(artifacts) {
  return artifacts.map((artifact, sequence) => ({ ...artifact, sequence }));
}
function summarizeArtifactsForEvent(artifacts) {
  return artifacts.slice(0, ITEM_EVENT_ARTIFACT_SUMMARY_LIMIT).map((artifact) => ({
    kind: artifact.kind,
    filename: artifact.filename,
    mime_type: artifact.mime_type,
    size_bytes: artifact.size_bytes,
    cos_url: artifact.cos_url,
    ...artifact.sequence !== void 0 ? { sequence: artifact.sequence } : {}
  }));
}
function resolveSelectedAgentVersion(metadata) {
  const raw = metadata?.selected_agent_version;
  return raw === 2 ? raw : void 0;
}
function resolveActualAgentVersion(artifacts) {
  const benchmarkArtifact = artifacts.find((artifact) => artifact.kind === "benchmark_run");
  const raw = benchmarkArtifact?.meta?.actual_agent_version;
  return raw === 2 ? raw : void 0;
}
function addAgentVersionMetadata(artifacts, versions) {
  return artifacts.map((artifact) => ({
    ...artifact,
    meta: {
      ...artifact.meta ?? {},
      requested_agent_version: versions.requestedAgentVersion,
      selected_agent_version: versions.selectedAgentVersion,
      ...versions.actualAgentVersion !== void 0 ? { actual_agent_version: versions.actualAgentVersion } : {}
    }
  }));
}
const ATTACHMENT_DOWNLOAD_TIMEOUT_MS = 6e4;
class AttachmentHttpError extends Error {
  constructor(index, filename, status2) {
    super(`attachment ${index} (${filename}) download failed: HTTP ${status2}`);
    this.name = "AttachmentHttpError";
  }
}
function resolveAttachmentName(url, filename, index) {
  if (filename) return filename;
  try {
    return path.basename(new URL(url).pathname) || `attachment-${index}`;
  } catch {
    return `attachment-${index}`;
  }
}
function buildLocalFilename(rawName, index) {
  const ext = path.extname(rawName);
  const base = path.basename(rawName, ext).replace(/[^\x20-\x7e]/g, "_").replace(/[\\/:*?"<>|]/g, "_").replace(/_+/g, "_") || "file";
  return `${index}-${base}${ext}`;
}
function errorName(error) {
  return error && typeof error === "object" && "name" in error ? String(error.name) : "";
}
async function stageEvalAttachments(item, workspace, logger2) {
  const refs = item.case.attachments ?? [];
  if (refs.length === 0) return [];
  const subdir = path.join("attachments", `run-${item.run_id}-item-${item.item_id}`);
  const dir = path.join(workspace, subdir);
  fs.mkdirSync(dir, { recursive: true });
  const stagedPaths = [];
  for (let index = 0; index < refs.length; index++) {
    const ref = refs[index];
    const rawName = resolveAttachmentName(ref.url, ref.filename, index);
    const localPath = path.join(dir, buildLocalFilename(rawName, index));
    try {
      const response = await fetch(ref.url, {
        signal: AbortSignal.timeout(ATTACHMENT_DOWNLOAD_TIMEOUT_MS)
      });
      if (!response.ok) {
        throw new AttachmentHttpError(index, rawName, response.status);
      }
      const body = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(localPath, body);
      const relativePath = path.relative(workspace, localPath);
      stagedPaths.push(relativePath);
      logger2.info(`attachment ${index} staged: ${rawName} (${body.byteLength}B) → ${relativePath}`);
    } catch (error) {
      const name = errorName(error);
      if (name === "TimeoutError" || name === "AbortError") {
        throw new Error(
          `attachment ${index} (${rawName}) timed out after 60s; agent input would be incomplete`
        );
      }
      if (error instanceof AttachmentHttpError) throw error;
      logger2.warn(
        `attachment ${index} stage failed: ${error instanceof Error ? error.message : error}`
      );
    }
  }
  return stagedPaths;
}
const MANIFEST_LIMIT = 16 * 1024 * 1024;
const MATERIAL_LIMIT = 512 * 1024 * 1024;
const TOTAL_LIMIT = 2 * 1024 * 1024 * 1024;
function object(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid prefix object");
  return value;
}
function string(value, limit = 1e3) {
  if (typeof value !== "string" || !value.trim() || value.length > limit)
    throw new Error("Invalid prefix string");
  return value;
}
function sha256(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value))
    throw new Error("Invalid prefix digest");
  return value;
}
function downloadUrl(value) {
  const raw = string(value, 8192);
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid prefix download URL");
  }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password)
    throw new Error("Invalid prefix download URL");
  return raw;
}
function normalizeTrajectoryPrefixRef(raw) {
  const value = object(raw);
  if (value.format !== "trajectory-prefix-ref-v1") throw new Error("Unsupported prefix format");
  return {
    format: value.format,
    url: downloadUrl(value.url),
    sha256: sha256(value.sha256),
    session_id: string(value.session_id, 200),
    cut_message_id: string(value.cut_message_id, 200)
  };
}
function materialPath(value) {
  const raw = string(value);
  const parts = raw.split("/");
  if (raw.includes("\\") || raw.includes("\0") || raw.includes(":") || parts.some(
    (p) => !p || p === "." || p === ".." || /[. ]$/.test(p) || /^\.(?:git|hilo|hub|opencode|opencode-v2)$/i.test(p) || /^(?:AGENTS\.md|CLAUDE\.md|opencode\.jsonc?|\.env(?:\..*)?)$/i.test(p) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)
  ))
    throw new Error("Unsafe prefix material path");
  return raw;
}
function normalizeMaterial(raw) {
  const value = object(raw);
  const relativePath = materialPath(value.path);
  if (value.filename !== path.posix.basename(relativePath))
    throw new Error("Prefix filename/path mismatch");
  if (!Number.isSafeInteger(value.size_bytes) || Number(value.size_bytes) < 0 || Number(value.size_bytes) > MATERIAL_LIMIT)
    throw new Error("Prefix material size exceeds limit");
  return {
    path: relativePath,
    filename: value.filename,
    asset_id: value.asset_id == null ? null : string(value.asset_id, 200),
    url: downloadUrl(value.url),
    sha256: sha256(value.sha256),
    size_bytes: Number(value.size_bytes),
    mime_type: string(value.mime_type, 200)
  };
}
function preparePrefixHistory(staged) {
  const messages = staged.payload.messages.map(object);
  const parts = staged.payload.parts.map(object);
  const last = messages.filter((message) => message.session_id === staged.sessionId).at(-1);
  if (!last || last.id !== staged.lastUserMessageId || object(typeof last.data === "string" ? JSON.parse(last.data) : last.data).role !== "user") {
    throw new Error("Runnable prefix must end with the selected user turn");
  }
  const prompt = parts.filter((part) => part.message_id === last.id && part.session_id === staged.sessionId).map((part) => object(typeof part.data === "string" ? JSON.parse(part.data) : part.data)).filter(
    (data) => data.type === "text" && !data.ignored && !data.synthetic && typeof data.text === "string"
  ).map((data) => data.text).join("\n");
  if (!prompt.trim() && staged.materials.length === 0)
    throw new Error("Prefix user input is empty");
  return {
    prompt,
    payload: {
      ...staged.payload,
      messages: messages.filter((message) => message.id !== last.id),
      parts: parts.filter((part) => part.message_id !== last.id),
      sessions: staged.payload.sessions.map(object),
      todos: staged.payload.todos.map(object)
    }
  };
}
async function restoreStagedTrajectoryPrefix(staged, workspace, runtime, signal) {
  signal.throwIfAborted();
  const binding = runtime.gatewayBinding;
  if (path.resolve(runtime.folderPath) !== path.resolve(workspace) || !binding?.claim || !binding.instanceId || !Number.isSafeInteger(binding.generation) || binding.generation < 1 || binding.baseUrl !== runtime.gatewayUrl) {
    throw new Error("Prefix restore requires the complete target workspace binding");
  }
  const prepared = preparePrefixHistory(staged);
  const post = async (route, body) => {
    signal.throwIfAborted();
    let response;
    try {
      response = await fetch(new URL(route, binding.baseUrl).href, {
        method: "POST",
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          ...workspaceGatewayIdentityHeaders(binding)
        },
        body: JSON.stringify(body),
        // Cancellation stops subsequent setup steps. A sent write must settle
        // before Headless releases this workspace; cancelling fetch alone does
        // not cancel the server's import/enrollment operation.
        signal: AbortSignal.timeout(6e4)
      });
    } catch {
      signal.throwIfAborted();
      throw new Error("Prefix restore request failed; delivery may be unknown");
    }
    signal.throwIfAborted();
    if (!response.ok) throw new Error(`Prefix restore HTTP ${response.status}`);
    return object(await response.json());
  };
  const assetIdMap = /* @__PURE__ */ Object.create(null);
  const contentById = /* @__PURE__ */ new Map();
  for (const material of staged.materials) {
    if (!material.asset_id) continue;
    const content = `${material.sha256}:${material.size_bytes}`;
    const previous = contentById.get(material.asset_id);
    if (previous && previous !== content) throw new Error("Conflicting source asset ID");
    contentById.set(material.asset_id, content);
  }
  for (const material of staged.materials) {
    const enrolled = await post(API_PATHS.trackFile, { path: material.path });
    if (enrolled.ok !== true || enrolled.path !== material.path)
      throw new Error("Prefix material registration mismatch");
    const newId = string(enrolled.id, 200);
    if (material.asset_id && !assetIdMap[material.asset_id]) assetIdMap[material.asset_id] = newId;
  }
  const imported = await post("/api/projects/archive/import", {
    payload: {
      ...prepared.payload,
      messages: rewriteAssetReferences(prepared.payload.messages, assetIdMap),
      parts: rewriteAssetReferences(prepared.payload.parts, assetIdMap)
    },
    oldDir: staged.sourceDirectory,
    newDir: workspace
    // The bound gateway inherits canonical HILO_OPENCODE_DB from the runtime owner.
  });
  signal.throwIfAborted();
  for (const [field, count] of [
    ["sessions", "insertedSessions"],
    ["messages", "insertedMessages"],
    ["parts", "insertedParts"],
    ["todos", "insertedTodos"]
  ]) {
    const rows = prepared.payload[field];
    if (!Array.isArray(rows) || imported[count] !== rows.length)
      throw new Error("Prefix restoration incomplete");
  }
  const inventory = object(
    (await post("/api/projects/archive/export", { dir: workspace })).payload
  );
  const sessions = Array.isArray(inventory.sessions) ? inventory.sessions.map(object) : [];
  const roots = sessions.filter((session) => session.parent_id == null);
  if (roots.length !== 1) throw new Error("Prefix project must contain exactly one root session");
  return {
    sessionId: string(roots[0].id, 200),
    prompt: replaceReferences(prepared.prompt, [
      ...Object.entries(assetIdMap),
      [staged.sourceDirectory, workspace]
    ]),
    attachments: staged.materials.map((material) => material.path)
  };
}
function rewriteAssetReferences(rows, assetIdMap) {
  const replacements = Object.entries(assetIdMap).map(([oldId, newId]) => [
    JSON.stringify(oldId).slice(1, -1),
    JSON.stringify(newId).slice(1, -1)
  ]);
  return rows.map((row) => ({
    ...row,
    data: replaceReferences(
      typeof row.data === "string" ? row.data : JSON.stringify(row.data),
      replacements
    )
  }));
}
function replaceReferences(text, entries) {
  const replacements = new Map(entries);
  if (replacements.size === 0) return text;
  const pattern = [...replacements.keys()].sort((a, b) => b.length - a.length).map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return text.replace(new RegExp(pattern, "g"), (match) => replacements.get(match) ?? match);
}
function normalizeDocument(raw, ref, maxTotalBytes) {
  const value = object(raw);
  if (value.format !== "trajectory-prefix-v1") throw new Error("Unsupported prefix document");
  if (value.session_id !== ref.session_id || value.cut_message_id !== ref.cut_message_id)
    throw new Error("Prefix cutoff mismatch");
  const payload = object(value.payload);
  if (payload.format !== "opencode-sessions-v1" || !Array.isArray(payload.sessions) || !Array.isArray(payload.messages) || !Array.isArray(payload.parts) || !Array.isArray(payload.todos))
    throw new Error("Invalid native prefix payload");
  if (!payload.sessions.some((s) => object(s).id === ref.session_id))
    throw new Error("Prefix root session missing");
  const rootMessages = payload.messages.map(object).filter((m) => m.session_id === ref.session_id);
  if (rootMessages.at(-1)?.id !== ref.cut_message_id)
    throw new Error("Prefix does not end at cutoff");
  let lastUserMessageId;
  for (const message of payload.messages.map(object)) {
    const data = object(typeof message.data === "string" ? JSON.parse(message.data) : message.data);
    if (!["user", "assistant"].includes(String(data.role)) || ["system", "tools", "format"].some((k) => k in data))
      throw new Error("Policy must not enter a prefix");
    if (message.session_id === ref.session_id && data.role === "user")
      lastUserMessageId = string(message.id, 200);
  }
  if (!lastUserMessageId) throw new Error("Prefix has no user cursor");
  if (lastUserMessageId !== ref.cut_message_id)
    throw new Error("Runnable prefix must end with a user turn");
  if (!Array.isArray(value.materials) || value.materials.length > 1e4)
    throw new Error("Invalid prefix materials");
  const materials = value.materials.map(normalizeMaterial);
  const paths = /* @__PURE__ */ new Set();
  let total = 0;
  for (const material of materials) {
    const key = material.path.normalize("NFC").toLowerCase();
    if (paths.has(key)) throw new Error("Conflicting prefix material path");
    paths.add(key);
    total += material.size_bytes;
    if (total > maxTotalBytes) throw new Error("Prefix restored size exceeds limit");
  }
  const warnings = object(value.material_warnings);
  if (!Array.isArray(warnings.missing_references) || !Array.isArray(warnings.ambiguous_references))
    throw new Error("Invalid prefix material warnings");
  return {
    sessionId: ref.session_id,
    lastUserMessageId,
    sourceDirectory: string(payload.sourceDirectory, 8192),
    payload,
    materials
  };
}
async function download(url, limit, signal, consume) {
  const combined = AbortSignal.any([AbortSignal.timeout(6e4), ...signal ? [signal] : []]);
  combined.throwIfAborted();
  let response;
  try {
    response = await fetch(url, { signal: combined, redirect: "error" });
  } catch {
    combined.throwIfAborted();
    throw new Error("Prefix download failed");
  }
  if (!response.ok || !response.body) throw new Error(`Prefix download HTTP ${response.status}`);
  const reader = response.body.getReader();
  const hash = createHash("sha256");
  let size = 0;
  try {
    while (true) {
      combined.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error("Prefix download size exceeds limit");
      hash.update(value);
      await consume(value);
    }
  } finally {
    await reader.cancel().catch(() => void 0);
    reader.releaseLock();
  }
  return { digest: hash.digest("hex"), size };
}
async function prepareTarget(workspace, relativePath) {
  let directory = workspace;
  const parts = relativePath.split("/");
  for (const component of parts.slice(0, -1)) {
    directory = path.join(directory, component);
    await fsp.mkdir(directory).catch((error) => {
      if (error.code !== "EEXIST") throw error;
    });
    const stat = await fsp.lstat(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory())
      throw new Error("Unsafe prefix material path");
  }
  const target = path.join(directory, parts[parts.length - 1]);
  try {
    await fsp.lstat(target);
  } catch (error) {
    if (error.code === "ENOENT") return target;
    throw error;
  }
  throw new Error("Prefix material target already exists");
}
async function stageTrajectoryPrefix(rawRef, workspace, options = {}) {
  options.signal?.throwIfAborted();
  const ref = normalizeTrajectoryPrefixRef(rawRef);
  const chunks = [];
  const manifest = await download(ref.url, MANIFEST_LIMIT, options.signal, async (chunk) => {
    chunks.push(Buffer.from(chunk));
  });
  if (manifest.digest !== ref.sha256) throw new Error("Prefix manifest digest mismatch");
  const doc = normalizeDocument(
    JSON.parse(Buffer.concat(chunks).toString("utf8")),
    ref,
    options.maxTotalBytes ?? TOTAL_LIMIT
  );
  const root = await fsp.realpath(workspace);
  const targets = /* @__PURE__ */ new Map();
  for (const material of doc.materials)
    targets.set(material.path, await prepareTarget(root, material.path));
  const temp = await fsp.mkdtemp(path.join(root, ".trajectory-stage-"));
  const downloaded = /* @__PURE__ */ new Map();
  try {
    for (const material of doc.materials) {
      options.signal?.throwIfAborted();
      const key = `${material.sha256}:${material.size_bytes}`;
      let source = downloaded.get(key);
      if (!source) {
        source = path.join(temp, String(downloaded.size));
        const file = await fsp.open(source, "wx");
        try {
          const result = await download(
            material.url,
            material.size_bytes,
            options.signal,
            (chunk) => file.writeFile(chunk)
          );
          if (result.size !== material.size_bytes || result.digest !== material.sha256)
            throw new Error("Prefix material size/digest mismatch");
        } finally {
          await file.close();
        }
        downloaded.set(key, source);
      }
      const target = targets.get(material.path);
      if (!target) throw new Error("Missing prefix material target");
      await fsp.copyFile(source, target, fsp.constants.COPYFILE_EXCL);
    }
    return doc;
  } finally {
    await fsp.rm(temp, { recursive: true, force: true });
  }
}
const OPENAPI_PRIMARY_AGENT = "media-agent";
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isOpenApiTaskEnvelope(value) {
  if (!isRecord(value) || !isRecord(value.request)) return false;
  return typeof value.item_id === "string" && typeof value.claim_token === "string" && typeof value.task_type === "string" && typeof value.attempt === "number";
}
function isBenchmarkItemEnvelope(value) {
  return isRecord(value) && isRecord(value.case) && isRecord(value.target_model) && (typeof value.item_id === "number" || typeof value.item_id === "string") && typeof value.claim_token === "string" && (value.agent_version === void 0 || value.agent_version === 2);
}
function normalizeAgentVersion(value) {
  return value === 2 ? value : void 0;
}
function normalizeCloud(value) {
  if (!isRecord(value)) return void 0;
  const region = value.region === "domestic" || value.region === "overseas" ? value.region : void 0;
  const channel = value.channel === "dev" || value.channel === "test" || value.channel === "staging" || value.channel === "prod" ? value.channel : void 0;
  return region || channel ? { ...region ? { region } : {}, ...channel ? { channel } : {} } : void 0;
}
function normalizeOpenApiAttachments(value) {
  if (!isRecord(value) || !Array.isArray(value.attachments)) return [];
  return value.attachments.flatMap((attachment) => {
    if (!isRecord(attachment) || typeof attachment.url !== "string" || typeof attachment.filename !== "string") {
      return [];
    }
    return [
      {
        url: attachment.url,
        filename: attachment.filename,
        ...typeof attachment.mime_type === "string" ? { mime_type: attachment.mime_type } : {}
      }
    ];
  });
}
function normalizeOpenApiSkills(request) {
  if (!Array.isArray(request.skills)) return void 0;
  const names = Array.from(
    new Set(
      request.skills.filter((name) => typeof name === "string" && name.length > 0)
    )
  );
  if (names.length === 0) return void 0;
  return {
    version: 1,
    mounts: names.map((name) => ({
      agent: OPENAPI_PRIMARY_AGENT,
      source: "hilo-market",
      name
    }))
  };
}
function prependSkillCommands(prompt, skills) {
  const mounts = skills?.mounts;
  if (!prompt || !mounts?.length) return prompt;
  const commands = mounts.map((mount) => `/${mount.name}`).join(" ");
  return `${commands} ${prompt}`;
}
function normalizeCallback(value) {
  if (!isRecord(value) || typeof value.url !== "string" || !value.url) return void 0;
  const headers = isRecord(value.headers) ? Object.fromEntries(
    Object.entries(value.headers).filter(
      (entry) => typeof entry[1] === "string"
    )
  ) : void 0;
  return {
    url: value.url,
    ...headers ? { headers } : {}
  };
}
function normalizeClaimedItem(value) {
  if (!isOpenApiTaskEnvelope(value)) {
    if (isBenchmarkItemEnvelope(value)) {
      if (value.model_id != null && (typeof value.model_id !== "string" || !/^[^/\s]+\/[^\s]+$/.test(value.model_id))) {
        throw new Error("claim model_id must be a non-empty provider/model ID");
      }
      if (value.case.trajectory_prefix != null) {
        return {
          ...value,
          case: {
            ...value.case,
            trajectory_prefix: normalizeTrajectoryPrefixRef(value.case.trajectory_prefix)
          }
        };
      }
      if (isRecord(value.case.fields) && "__trajectory_prefix__" in value.case.fields) {
        throw new Error("Prefix case is missing its execution contract");
      }
      return value;
    }
    throw new Error("claim response contains an unsupported item envelope");
  }
  const prompt = typeof value.request.prompt === "string" ? value.request.prompt : "";
  const callback = normalizeCallback(value.callback);
  const cloud = normalizeCloud(value.cloud);
  const agentVersion = normalizeAgentVersion(value.agent_version) ?? 2;
  const skills = value.skills ?? normalizeOpenApiSkills(value.request);
  const executionPrompt = prependSkillCommands(prompt, skills);
  const enableWatermark = value.request.enable_watermark;
  return {
    item_id: value.item_id,
    run_id: "openapi",
    ...value.epoch_id ? { epoch_id: value.epoch_id } : {},
    ...cloud ? { cloud } : {},
    ...typeof value.hilo_lane === "string" && value.hilo_lane ? { hilo_lane: value.hilo_lane } : {},
    ...callback ? { callback } : {},
    ...agentVersion ? { agent_version: agentVersion } : {},
    ...skills ? { skills } : {},
    ...typeof enableWatermark === "boolean" ? { enable_watermark: enableWatermark } : {},
    execution_attempt: value.attempt,
    ...value.artifact_upload?.mode === "hailuo_oss_presigned" ? { artifact_upload: value.artifact_upload } : {},
    claim_token: value.claim_token,
    case: {
      id: value.item_id,
      query_text: executionPrompt,
      fields: {
        task_type: value.task_type,
        request: value.request
      },
      attachments: normalizeOpenApiAttachments(value.case)
    },
    target_model: {
      id: "openapi-default",
      name: "OpenAPI task default",
      provider: "hilo",
      model_id: "openapi-default",
      headers: {}
    },
    deadline_at: value.deadline_at
  };
}
const MAX_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 1e3;
async function deliverFinalize({
  itemId,
  payload,
  send,
  logger: logger2
}) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response;
    try {
      response = await send();
    } catch (error) {
      const detail2 = error instanceof Error ? error.message : String(error);
      if (attempt === MAX_ATTEMPTS) {
        logger2.warn(
          `finalize item=${itemId} outcome=${payload.outcome} exhausted ${attempt} attempts after request error: ${detail2}`
        );
        return false;
      }
      logger2.warn(
        `finalize item=${itemId} outcome=${payload.outcome} attempt ${attempt}/${MAX_ATTEMPTS} request error: ${detail2}; retrying`
      );
      await retryDelay(attempt);
      continue;
    }
    if (response.ok) {
      const ack = await response.json();
      logger2.info(
        `item=${itemId} → ${ack.status} (outcome=${payload.outcome}, attempts=${attempt})`
      );
      return true;
    }
    const detail = (await response.text()).slice(0, 200);
    if (!isRetryableStatus(response.status) || attempt === MAX_ATTEMPTS) {
      logger2.warn(
        `finalize item=${itemId} outcome=${payload.outcome} HTTP ${response.status} after ${attempt} attempt(s): ${detail}`
      );
      return false;
    }
    logger2.warn(
      `finalize item=${itemId} outcome=${payload.outcome} attempt ${attempt}/${MAX_ATTEMPTS} HTTP ${response.status}: ${detail}; retrying`
    );
    await retryDelay(attempt);
  }
  return false;
}
function isRetryableStatus(status2) {
  return status2 === 408 || status2 === 425 || status2 === 429 || status2 >= 500;
}
function retryDelay(failedAttempt) {
  return new Promise((resolve) => {
    setTimeout(resolve, RETRY_BASE_DELAY_MS * 2 ** (failedAttempt - 1));
  });
}
var promClient = {};
var registry = { exports: {} };
var util = {};
var hasRequiredUtil;
function requireUtil() {
  if (hasRequiredUtil) return util;
  hasRequiredUtil = 1;
  util.getValueAsString = function getValueString(value) {
    if (Number.isNaN(value)) {
      return "Nan";
    } else if (!Number.isFinite(value)) {
      if (value < 0) {
        return "-Inf";
      } else {
        return "+Inf";
      }
    } else {
      return `${value}`;
    }
  };
  util.removeLabels = function removeLabels(hashMap, labels, sortedLabelNames) {
    const hash = hashObject(labels, sortedLabelNames);
    delete hashMap[hash];
  };
  util.setValue = function setValue(hashMap, value, labels) {
    const hash = hashObject(labels);
    hashMap[hash] = {
      value: typeof value === "number" ? value : 0,
      labels: labels || {}
    };
    return hashMap;
  };
  util.setValueDelta = function setValueDelta(hashMap, deltaValue, labels, hash = "") {
    const value = typeof deltaValue === "number" ? deltaValue : 0;
    if (hashMap[hash]) {
      hashMap[hash].value += value;
    } else {
      hashMap[hash] = { value, labels };
    }
    return hashMap;
  };
  util.getLabels = function(labelNames, args) {
    if (typeof args[0] === "object") {
      return args[0];
    }
    if (labelNames.length !== args.length) {
      throw new Error(
        `Invalid number of arguments (${args.length}): "${args.join(
          ", "
        )}" for label names (${labelNames.length}): "${labelNames.join(", ")}".`
      );
    }
    const acc = {};
    for (let i = 0; i < labelNames.length; i++) {
      acc[labelNames[i]] = args[i];
    }
    return acc;
  };
  function fastHashObject(keys, labels) {
    if (keys.length === 0) {
      return "";
    }
    let hash = "";
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = labels[key];
      if (value === void 0) continue;
      hash += `${key}:${value},`;
    }
    return hash;
  }
  function hashObject(labels, labelNames) {
    if (labelNames) {
      return fastHashObject(labelNames, labels);
    }
    const keys = Object.keys(labels);
    if (keys.length > 1) {
      keys.sort();
    }
    return fastHashObject(keys, labels);
  }
  util.hashObject = hashObject;
  util.isObject = function isObject(obj) {
    return obj !== null && typeof obj === "object";
  };
  util.nowTimestamp = function nowTimestamp() {
    return Date.now() / 1e3;
  };
  class Grouper extends Map {
    /**
     * Adds the `value` to the `key`'s array of values.
     * @param {*} key Key to set.
     * @param {*} value Value to add to `key`'s array.
     * @returns {undefined} undefined.
     */
    add(key, value) {
      if (this.has(key)) {
        this.get(key).push(value);
      } else {
        this.set(key, [value]);
      }
    }
  }
  util.Grouper = Grouper;
  return util;
}
var hasRequiredRegistry;
function requireRegistry() {
  if (hasRequiredRegistry) return registry.exports;
  hasRequiredRegistry = 1;
  const { getValueAsString } = requireUtil();
  class Registry {
    static get PROMETHEUS_CONTENT_TYPE() {
      return "text/plain; version=0.0.4; charset=utf-8";
    }
    static get OPENMETRICS_CONTENT_TYPE() {
      return "application/openmetrics-text; version=1.0.0; charset=utf-8";
    }
    constructor(regContentType = Registry.PROMETHEUS_CONTENT_TYPE) {
      this._metrics = {};
      this._collectors = [];
      this._defaultLabels = {};
      if (regContentType !== Registry.PROMETHEUS_CONTENT_TYPE && regContentType !== Registry.OPENMETRICS_CONTENT_TYPE) {
        throw new TypeError(`Content type ${regContentType} is unsupported`);
      }
      this._contentType = regContentType;
    }
    getMetricsAsArray() {
      return Object.values(this._metrics);
    }
    async getMetricsAsString(metrics2) {
      const metric2 = typeof metrics2.getForPromString === "function" ? await metrics2.getForPromString() : await metrics2.get();
      const name = escapeString(metric2.name);
      const help = `# HELP ${name} ${escapeString(metric2.help)}`;
      const type = `# TYPE ${name} ${metric2.type}`;
      const values = [help, type];
      const defaultLabels = Object.keys(this._defaultLabels).length > 0 ? this._defaultLabels : null;
      const isOpenMetrics = this.contentType === Registry.OPENMETRICS_CONTENT_TYPE;
      for (const val of metric2.values || []) {
        let { metricName = name, labels = {} } = val;
        const { sharedLabels = {} } = val;
        if (isOpenMetrics && metric2.type === "counter") {
          metricName = `${metricName}_total`;
        }
        if (defaultLabels) {
          labels = { ...labels, ...defaultLabels, ...labels };
        }
        const formattedLabels = formatLabels(labels, sharedLabels);
        const flattenedShared = flattenSharedLabels(sharedLabels);
        const labelParts = [...formattedLabels, flattenedShared].filter(Boolean);
        const labelsString = labelParts.length ? `{${labelParts.join(",")}}` : "";
        let fullMetricLine = `${metricName}${labelsString} ${getValueAsString(
          val.value
        )}`;
        const { exemplar: exemplar2 } = val;
        if (exemplar2 && isOpenMetrics) {
          const formattedExemplars = formatLabels(exemplar2.labelSet);
          fullMetricLine += ` # {${formattedExemplars.join(
            ","
          )}} ${getValueAsString(exemplar2.value)} ${exemplar2.timestamp}`;
        }
        values.push(fullMetricLine);
      }
      return values.join("\n");
    }
    async metrics() {
      const isOpenMetrics = this.contentType === Registry.OPENMETRICS_CONTENT_TYPE;
      const promises = this.getMetricsAsArray().map((metric2) => {
        if (isOpenMetrics && metric2.type === "counter") {
          metric2.name = standardizeCounterName(metric2.name);
        }
        return this.getMetricsAsString(metric2);
      });
      const resolves = await Promise.all(promises);
      return isOpenMetrics ? `${resolves.join("\n")}
# EOF
` : `${resolves.join("\n\n")}
`;
    }
    registerMetric(metric2) {
      if (this._metrics[metric2.name] && this._metrics[metric2.name] !== metric2) {
        throw new Error(
          `A metric with the name ${metric2.name} has already been registered.`
        );
      }
      this._metrics[metric2.name] = metric2;
    }
    clear() {
      this._metrics = {};
      this._defaultLabels = {};
    }
    async getMetricsAsJSON() {
      const metrics2 = [];
      const defaultLabelNames = Object.keys(this._defaultLabels);
      const promises = [];
      for (const metric2 of this.getMetricsAsArray()) {
        promises.push(metric2.get());
      }
      const resolves = await Promise.all(promises);
      for (const item of resolves) {
        if (item.values && defaultLabelNames.length > 0) {
          for (const val of item.values) {
            val.labels = Object.assign({}, val.labels);
            for (const labelName of defaultLabelNames) {
              val.labels[labelName] = val.labels[labelName] || this._defaultLabels[labelName];
            }
          }
        }
        metrics2.push(item);
      }
      return metrics2;
    }
    removeSingleMetric(name) {
      delete this._metrics[name];
    }
    getSingleMetricAsString(name) {
      return this.getMetricsAsString(this._metrics[name]);
    }
    getSingleMetric(name) {
      return this._metrics[name];
    }
    setDefaultLabels(labels) {
      this._defaultLabels = labels;
    }
    resetMetrics() {
      for (const metric2 in this._metrics) {
        this._metrics[metric2].reset();
      }
    }
    get contentType() {
      return this._contentType;
    }
    setContentType(metricsContentType) {
      if (metricsContentType === Registry.OPENMETRICS_CONTENT_TYPE || metricsContentType === Registry.PROMETHEUS_CONTENT_TYPE) {
        this._contentType = metricsContentType;
      } else {
        throw new Error(`Content type ${metricsContentType} is unsupported`);
      }
    }
    static merge(registers) {
      const regType = registers[0].contentType;
      for (const reg of registers) {
        if (reg.contentType !== regType) {
          throw new Error(
            "Registers can only be merged if they have the same content type"
          );
        }
      }
      const mergedRegistry = new Registry(regType);
      const metricsToMerge = registers.reduce(
        (acc, reg) => acc.concat(reg.getMetricsAsArray()),
        []
      );
      metricsToMerge.forEach(mergedRegistry.registerMetric, mergedRegistry);
      return mergedRegistry;
    }
  }
  function formatLabels(labels, exclude) {
    const { hasOwnProperty } = Object.prototype;
    const formatted = [];
    for (const [name, value] of Object.entries(labels)) {
      if (!exclude || !hasOwnProperty.call(exclude, name)) {
        formatted.push(`${name}="${escapeLabelValue(value)}"`);
      }
    }
    return formatted;
  }
  const sharedLabelCache = /* @__PURE__ */ new WeakMap();
  function flattenSharedLabels(labels) {
    const cached = sharedLabelCache.get(labels);
    if (cached) {
      return cached;
    }
    const formattedLabels = formatLabels(labels);
    const flattened = formattedLabels.join(",");
    sharedLabelCache.set(labels, flattened);
    return flattened;
  }
  function escapeLabelValue(str) {
    if (typeof str !== "string") {
      return str;
    }
    return escapeString(str).replace(/"/g, '\\"');
  }
  function escapeString(str) {
    return str.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
  }
  function standardizeCounterName(name) {
    return name.replace(/_total$/, "");
  }
  registry.exports = Registry;
  registry.exports.globalRegistry = new Registry();
  return registry.exports;
}
var validation = {};
var hasRequiredValidation;
function requireValidation() {
  if (hasRequiredValidation) return validation;
  hasRequiredValidation = 1;
  const util2 = require$$0;
  const metricRegexp = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;
  const labelRegexp = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  validation.validateMetricName = function(name) {
    return metricRegexp.test(name);
  };
  validation.validateLabelName = function(names = []) {
    return names.every((name) => labelRegexp.test(name));
  };
  validation.validateLabel = function validateLabel(savedLabels, labels) {
    for (const label in labels) {
      if (!savedLabels.includes(label)) {
        throw new Error(
          `Added label "${label}" is not included in initial labelset: ${util2.inspect(
            savedLabels
          )}`
        );
      }
    }
  };
  return validation;
}
var metric;
var hasRequiredMetric$1;
function requireMetric$1() {
  if (hasRequiredMetric$1) return metric;
  hasRequiredMetric$1 = 1;
  const Registry = requireRegistry();
  const { isObject } = requireUtil();
  const { validateMetricName, validateLabelName } = requireValidation();
  class Metric2 {
    constructor(config, defaults = {}) {
      if (!isObject(config)) {
        throw new TypeError("constructor expected a config object");
      }
      Object.assign(
        this,
        {
          labelNames: [],
          registers: [Registry.globalRegistry],
          aggregator: "sum",
          enableExemplars: false
        },
        defaults,
        config
      );
      if (!this.registers) {
        this.registers = [Registry.globalRegistry];
      }
      if (!this.help) {
        throw new Error("Missing mandatory help parameter");
      }
      if (!this.name) {
        throw new Error("Missing mandatory name parameter");
      }
      if (!validateMetricName(this.name)) {
        throw new Error("Invalid metric name");
      }
      if (!validateLabelName(this.labelNames)) {
        throw new Error("Invalid label name");
      }
      if (this.collect && typeof this.collect !== "function") {
        throw new Error('Optional "collect" parameter must be a function');
      }
      if (this.labelNames) {
        this.sortedLabelNames = [...this.labelNames].sort();
      } else {
        this.sortedLabelNames = [];
      }
      this.reset();
      for (const register of this.registers) {
        if (this.enableExemplars && register.contentType === Registry.PROMETHEUS_CONTENT_TYPE) {
          throw new TypeError(
            "Exemplars are supported only on OpenMetrics registries"
          );
        }
        register.registerMetric(this);
      }
    }
    reset() {
    }
  }
  metric = { Metric: Metric2 };
  return metric;
}
var exemplar;
var hasRequiredExemplar;
function requireExemplar() {
  if (hasRequiredExemplar) return exemplar;
  hasRequiredExemplar = 1;
  class Exemplar {
    constructor(labelSet = {}, value = null) {
      this.labelSet = labelSet;
      this.value = value;
    }
    /**
     * Validation for the label set format.
     * https://github.com/OpenObservability/OpenMetrics/blob/d99b705f611b75fec8f450b05e344e02eea6921d/specification/OpenMetrics.md#exemplars
     *
     * @param {object} labelSet - Exemplar labels.
     * @throws {RangeError}
     * @return {void}
     */
    validateExemplarLabelSet(labelSet) {
      let res = "";
      for (const [labelName, labelValue] of Object.entries(labelSet)) {
        res += `${labelName}${labelValue}`;
      }
      if (res.length > 128) {
        throw new RangeError(
          "Label set size must be smaller than 128 UTF-8 chars"
        );
      }
    }
  }
  exemplar = Exemplar;
  return exemplar;
}
var counter;
var hasRequiredCounter;
function requireCounter() {
  if (hasRequiredCounter) return counter;
  hasRequiredCounter = 1;
  const util2 = require$$0;
  const {
    hashObject,
    isObject,
    getLabels,
    removeLabels,
    nowTimestamp
  } = requireUtil();
  const { validateLabel } = requireValidation();
  const { Metric: Metric2 } = requireMetric$1();
  const Exemplar = requireExemplar();
  class Counter extends Metric2 {
    constructor(config) {
      super(config);
      this.type = "counter";
      this.defaultLabels = {};
      this.defaultValue = 1;
      this.defaultExemplarLabelSet = {};
      if (config.enableExemplars) {
        this.enableExemplars = true;
        this.inc = this.incWithExemplar;
      } else {
        this.inc = this.incWithoutExemplar;
      }
    }
    /**
     * Increment counter
     * @param {object} labels - What label you want to be incremented
     * @param {Number} value - Value to increment, if omitted increment with 1
     * @returns {object} results - object with information about the inc operation
     * @returns {string} results.labelHash - hash representation of the labels
     */
    incWithoutExemplar(labels, value) {
      let hash = "";
      if (isObject(labels)) {
        hash = hashObject(labels, this.sortedLabelNames);
        validateLabel(this.labelNames, labels);
      } else {
        value = labels;
        labels = {};
      }
      if (value && !Number.isFinite(value)) {
        throw new TypeError(`Value is not a valid number: ${util2.format(value)}`);
      }
      if (value < 0) {
        throw new Error("It is not possible to decrease a counter");
      }
      if (value === null || value === void 0) value = 1;
      setValue(this.hashMap, value, labels, hash);
      return { labelHash: hash };
    }
    /**
     * Increment counter with exemplar, same as inc but accepts labels for an
     * exemplar.
     * If no label is provided the current exemplar labels are kept unchanged
     * (defaults to empty set).
     *
     * @param {object} incOpts - Object with options about what metric to increase
     * @param {object} incOpts.labels - What label you want to be incremented,
     *                                  defaults to null (metric with no labels)
     * @param {Number} incOpts.value - Value to increment, defaults to 1
     * @param {object} incOpts.exemplarLabels - Key-value  labels for the
     *                                          exemplar, defaults to empty set {}
     * @returns {void}
     */
    incWithExemplar({
      labels = this.defaultLabels,
      value = this.defaultValue,
      exemplarLabels = this.defaultExemplarLabelSet
    } = {}) {
      const res = this.incWithoutExemplar(labels, value);
      this.updateExemplar(exemplarLabels, value, res.labelHash);
    }
    updateExemplar(exemplarLabels, value, hash) {
      if (exemplarLabels === this.defaultExemplarLabelSet) return;
      if (!isObject(this.hashMap[hash].exemplar)) {
        this.hashMap[hash].exemplar = new Exemplar();
      }
      this.hashMap[hash].exemplar.validateExemplarLabelSet(exemplarLabels);
      this.hashMap[hash].exemplar.labelSet = exemplarLabels;
      this.hashMap[hash].exemplar.value = value ? value : 1;
      this.hashMap[hash].exemplar.timestamp = nowTimestamp();
    }
    /**
     * Reset counter
     * @returns {void}
     */
    reset() {
      this.hashMap = {};
      if (this.labelNames.length === 0) {
        setValue(this.hashMap, 0);
      }
    }
    async get() {
      if (this.collect) {
        const v = this.collect();
        if (v instanceof Promise) await v;
      }
      return {
        help: this.help,
        name: this.name,
        type: this.type,
        values: Object.values(this.hashMap),
        aggregator: this.aggregator
      };
    }
    labels(...args) {
      const labels = getLabels(this.labelNames, args) || {};
      return {
        inc: this.inc.bind(this, labels)
      };
    }
    remove(...args) {
      const labels = getLabels(this.labelNames, args) || {};
      validateLabel(this.labelNames, labels);
      return removeLabels.call(this, this.hashMap, labels, this.sortedLabelNames);
    }
  }
  function setValue(hashMap, value, labels = {}, hash = "") {
    if (hashMap[hash]) {
      hashMap[hash].value += value;
    } else {
      hashMap[hash] = { value, labels };
    }
    return hashMap;
  }
  counter = Counter;
  return counter;
}
var gauge;
var hasRequiredGauge;
function requireGauge() {
  if (hasRequiredGauge) return gauge;
  hasRequiredGauge = 1;
  const util2 = require$$0;
  const {
    setValue,
    setValueDelta,
    getLabels,
    hashObject,
    isObject,
    removeLabels
  } = requireUtil();
  const { validateLabel } = requireValidation();
  const { Metric: Metric2 } = requireMetric$1();
  class Gauge extends Metric2 {
    constructor(config) {
      super(config);
      this.type = "gauge";
    }
    /**
     * Set a gauge to a value
     * @param {object} labels - Object with labels and their values
     * @param {Number} value - Value to set the gauge to, must be positive
     * @returns {void}
     */
    set(labels, value) {
      value = getValueArg(labels, value);
      labels = getLabelArg(labels);
      set(this, labels, value);
    }
    /**
     * Reset gauge
     * @returns {void}
     */
    reset() {
      this.hashMap = {};
      if (this.labelNames.length === 0) {
        setValue(this.hashMap, 0, {});
      }
    }
    /**
     * Increment a gauge value
     * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
     * @param {Number} value - Value to increment - if omitted, increment with 1
     * @returns {void}
     */
    inc(labels, value) {
      value = getValueArg(labels, value);
      labels = getLabelArg(labels);
      if (value === void 0) value = 1;
      setDelta(this, labels, value);
    }
    /**
     * Decrement a gauge value
     * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
     * @param {Number} value - Value to decrement - if omitted, decrement with 1
     * @returns {void}
     */
    dec(labels, value) {
      value = getValueArg(labels, value);
      labels = getLabelArg(labels);
      if (value === void 0) value = 1;
      setDelta(this, labels, -value);
    }
    /**
     * Set the gauge to current unix epoch
     * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
     * @returns {void}
     */
    setToCurrentTime(labels) {
      const now = Date.now() / 1e3;
      if (labels === void 0) {
        this.set(now);
      } else {
        this.set(labels, now);
      }
    }
    /**
     * Start a timer
     * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
     * @returns {function} - Invoke this function to set the duration in seconds since you started the timer.
     * @example
     * var done = gauge.startTimer();
     * makeXHRRequest(function(err, response) {
     *	done(); //Duration of the request will be saved
     * });
     */
    startTimer(labels) {
      const start = process.hrtime();
      return (endLabels) => {
        const delta = process.hrtime(start);
        const value = delta[0] + delta[1] / 1e9;
        this.set(Object.assign({}, labels, endLabels), value);
        return value;
      };
    }
    async get() {
      if (this.collect) {
        const v = this.collect();
        if (v instanceof Promise) await v;
      }
      return {
        help: this.help,
        name: this.name,
        type: this.type,
        values: Object.values(this.hashMap),
        aggregator: this.aggregator
      };
    }
    _getValue(labels) {
      const hash = hashObject(labels || {}, this.sortedLabelNames);
      return this.hashMap[hash] ? this.hashMap[hash].value : 0;
    }
    labels(...args) {
      const labels = getLabels(this.labelNames, args);
      validateLabel(this.labelNames, labels);
      return {
        inc: this.inc.bind(this, labels),
        dec: this.dec.bind(this, labels),
        set: this.set.bind(this, labels),
        setToCurrentTime: this.setToCurrentTime.bind(this, labels),
        startTimer: this.startTimer.bind(this, labels)
      };
    }
    remove(...args) {
      const labels = getLabels(this.labelNames, args);
      validateLabel(this.labelNames, labels);
      removeLabels.call(this, this.hashMap, labels, this.sortedLabelNames);
    }
  }
  function set(gauge2, labels, value) {
    if (typeof value !== "number") {
      throw new TypeError(`Value is not a valid number: ${util2.format(value)}`);
    }
    validateLabel(gauge2.labelNames, labels);
    setValue(gauge2.hashMap, value, labels);
  }
  function setDelta(gauge2, labels, delta) {
    if (typeof delta !== "number") {
      throw new TypeError(`Delta is not a valid number: ${util2.format(delta)}`);
    }
    validateLabel(gauge2.labelNames, labels);
    const hash = hashObject(labels, gauge2.sortedLabelNames);
    setValueDelta(gauge2.hashMap, delta, labels, hash);
  }
  function getLabelArg(labels) {
    return isObject(labels) ? labels : {};
  }
  function getValueArg(labels, value) {
    return isObject(labels) ? value : labels;
  }
  gauge = Gauge;
  return gauge;
}
var histogram;
var hasRequiredHistogram;
function requireHistogram() {
  if (hasRequiredHistogram) return histogram;
  hasRequiredHistogram = 1;
  const util2 = require$$0;
  const {
    getLabels,
    hashObject,
    isObject,
    removeLabels,
    nowTimestamp
  } = requireUtil();
  const { validateLabel } = requireValidation();
  const { Metric: Metric2 } = requireMetric$1();
  const Exemplar = requireExemplar();
  class Histogram extends Metric2 {
    constructor(config) {
      super(config, {
        buckets: [5e-3, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
      });
      this.type = "histogram";
      this.defaultLabels = {};
      this.defaultExemplarLabelSet = {};
      this.enableExemplars = false;
      for (const label of this.labelNames) {
        if (label === "le") {
          throw new Error("le is a reserved label keyword");
        }
      }
      this.upperBounds = this.buckets;
      this.bucketValues = this.upperBounds.reduce((acc, upperBound) => {
        acc[upperBound] = 0;
        return acc;
      }, {});
      if (config.enableExemplars) {
        this.enableExemplars = true;
        this.bucketExemplars = this.upperBounds.reduce((acc, upperBound) => {
          acc[upperBound] = null;
          return acc;
        }, {});
        Object.freeze(this.bucketExemplars);
        this.observe = this.observeWithExemplar;
      } else {
        this.observe = this.observeWithoutExemplar;
      }
      Object.freeze(this.bucketValues);
      Object.freeze(this.upperBounds);
      if (this.labelNames.length === 0) {
        this.hashMap = {
          [hashObject({})]: createBaseValues(
            {},
            this.bucketValues,
            this.bucketExemplars
          )
        };
      }
    }
    /**
     * Observe a value in histogram
     * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
     * @param {Number} value - Value to observe in the histogram
     * @returns {void}
     */
    observeWithoutExemplar(labels, value) {
      observe.call(this, labels === 0 ? 0 : labels || {})(value);
    }
    observeWithExemplar({
      labels = this.defaultLabels,
      value,
      exemplarLabels = this.defaultExemplarLabelSet
    } = {}) {
      observe.call(this, labels === 0 ? 0 : labels || {})(value);
      this.updateExemplar(labels, value, exemplarLabels);
    }
    updateExemplar(labels, value, exemplarLabels) {
      if (Object.keys(exemplarLabels).length === 0) return;
      const hash = hashObject(labels, this.sortedLabelNames);
      const bound = findBound(this.upperBounds, value);
      const { bucketExemplars } = this.hashMap[hash];
      let exemplar2 = bucketExemplars[bound];
      if (!isObject(exemplar2)) {
        exemplar2 = new Exemplar();
        bucketExemplars[bound] = exemplar2;
      }
      exemplar2.validateExemplarLabelSet(exemplarLabels);
      exemplar2.labelSet = exemplarLabels;
      exemplar2.value = value;
      exemplar2.timestamp = nowTimestamp();
    }
    async get() {
      const data = await this.getForPromString();
      data.values = data.values.map(splayLabels);
      return data;
    }
    async getForPromString() {
      if (this.collect) {
        const v = this.collect();
        if (v instanceof Promise) await v;
      }
      const data = Object.values(this.hashMap);
      const values = data.map(extractBucketValuesForExport(this)).reduce(addSumAndCountForExport(this), []);
      return {
        name: this.name,
        help: this.help,
        type: this.type,
        values,
        aggregator: this.aggregator
      };
    }
    reset() {
      this.hashMap = {};
    }
    /**
     * Initialize the metrics for the given combination of labels to zero
     * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
     * @returns {void}
     */
    zero(labels) {
      const hash = hashObject(labels, this.sortedLabelNames);
      this.hashMap[hash] = createBaseValues(
        labels,
        this.bucketValues,
        this.bucketExemplars
      );
    }
    /**
     * Start a timer that could be used to logging durations
     * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
     * @param {object} exemplarLabels - Object with labels for exemplar where key is the label key and value is label value. Can only be one level deep
     * @returns {function} - Function to invoke when you want to stop the timer and observe the duration in seconds
     * @example
     * var end = histogram.startTimer();
     * makeExpensiveXHRRequest(function(err, res) {
     * 	const duration = end(); //Observe the duration of expensiveXHRRequest and returns duration in seconds
     * 	console.log('Duration', duration);
     * });
     */
    startTimer(labels, exemplarLabels) {
      return this.enableExemplars ? startTimerWithExemplar.call(this, labels, exemplarLabels)() : startTimer.call(this, labels)();
    }
    labels(...args) {
      const labels = getLabels(this.labelNames, args);
      validateLabel(this.labelNames, labels);
      return {
        observe: observe.call(this, labels),
        startTimer: startTimer.call(this, labels)
      };
    }
    remove(...args) {
      const labels = getLabels(this.labelNames, args);
      validateLabel(this.labelNames, labels);
      removeLabels.call(this, this.hashMap, labels, this.sortedLabelNames);
    }
  }
  function startTimer(startLabels) {
    return () => {
      const start = process.hrtime();
      return (endLabels) => {
        const delta = process.hrtime(start);
        const value = delta[0] + delta[1] / 1e9;
        this.observe(Object.assign({}, startLabels, endLabels), value);
        return value;
      };
    };
  }
  function startTimerWithExemplar(startLabels, startExemplarLabels) {
    return () => {
      const start = process.hrtime();
      return (endLabels, endExemplarLabels) => {
        const delta = process.hrtime(start);
        const value = delta[0] + delta[1] / 1e9;
        this.observe({
          labels: Object.assign({}, startLabels, endLabels),
          value,
          exemplarLabels: Object.assign(
            {},
            startExemplarLabels,
            endExemplarLabels
          )
        });
        return value;
      };
    };
  }
  function setValuePair(labels, value, metricName, exemplar2, sharedLabels = {}) {
    return {
      labels,
      sharedLabels,
      value,
      metricName,
      exemplar: exemplar2
    };
  }
  function findBound(upperBounds, value) {
    for (let i = 0; i < upperBounds.length; i++) {
      const bound = upperBounds[i];
      if (value <= bound) {
        return bound;
      }
    }
    return -1;
  }
  function observe(labels) {
    return (value) => {
      const labelValuePair = convertLabelsAndValues(labels, value);
      validateLabel(this.labelNames, labelValuePair.labels);
      if (!Number.isFinite(labelValuePair.value)) {
        throw new TypeError(
          `Value is not a valid number: ${util2.format(labelValuePair.value)}`
        );
      }
      const hash = hashObject(labelValuePair.labels, this.sortedLabelNames);
      let valueFromMap = this.hashMap[hash];
      if (!valueFromMap) {
        valueFromMap = createBaseValues(
          labelValuePair.labels,
          this.bucketValues,
          this.bucketExemplars
        );
      }
      const b = findBound(this.upperBounds, labelValuePair.value);
      valueFromMap.sum += labelValuePair.value;
      valueFromMap.count += 1;
      if (Object.prototype.hasOwnProperty.call(valueFromMap.bucketValues, b)) {
        valueFromMap.bucketValues[b] += 1;
      }
      this.hashMap[hash] = valueFromMap;
    };
  }
  function createBaseValues(labels, bucketValues, bucketExemplars) {
    const result = {
      labels,
      bucketValues: { ...bucketValues },
      sum: 0,
      count: 0
    };
    if (bucketExemplars) {
      result.bucketExemplars = { ...bucketExemplars };
    }
    return result;
  }
  function convertLabelsAndValues(labels, value) {
    return isObject(labels) ? {
      labels,
      value
    } : {
      value: labels,
      labels: {}
    };
  }
  function extractBucketValuesForExport(histogram2) {
    const name = `${histogram2.name}_bucket`;
    return (bucketData) => {
      let acc = 0;
      const buckets = histogram2.upperBounds.map((upperBound) => {
        acc += bucketData.bucketValues[upperBound];
        return setValuePair(
          { le: upperBound },
          acc,
          name,
          bucketData.bucketExemplars ? bucketData.bucketExemplars[upperBound] : null,
          bucketData.labels
        );
      });
      return { buckets, data: bucketData };
    };
  }
  function addSumAndCountForExport(histogram2) {
    return (acc, d) => {
      acc.push(...d.buckets);
      const infLabel = { le: "+Inf" };
      acc.push(
        setValuePair(
          infLabel,
          d.data.count,
          `${histogram2.name}_bucket`,
          d.data.bucketExemplars ? d.data.bucketExemplars["-1"] : null,
          d.data.labels
        ),
        setValuePair(
          {},
          d.data.sum,
          `${histogram2.name}_sum`,
          void 0,
          d.data.labels
        ),
        setValuePair(
          {},
          d.data.count,
          `${histogram2.name}_count`,
          void 0,
          d.data.labels
        )
      );
      return acc;
    };
  }
  function splayLabels(bucket) {
    const { sharedLabels, labels, ...newBucket } = bucket;
    for (const label of Object.keys(sharedLabels)) {
      labels[label] = sharedLabels[label];
    }
    newBucket.labels = labels;
    return newBucket;
  }
  histogram = Histogram;
  return histogram;
}
var treebase;
var hasRequiredTreebase;
function requireTreebase() {
  if (hasRequiredTreebase) return treebase;
  hasRequiredTreebase = 1;
  function TreeBase() {
  }
  TreeBase.prototype.clear = function() {
    this._root = null;
    this.size = 0;
  };
  TreeBase.prototype.find = function(data) {
    var res = this._root;
    while (res !== null) {
      var c = this._comparator(data, res.data);
      if (c === 0) {
        return res.data;
      } else {
        res = res.get_child(c > 0);
      }
    }
    return null;
  };
  TreeBase.prototype.findIter = function(data) {
    var res = this._root;
    var iter = this.iterator();
    while (res !== null) {
      var c = this._comparator(data, res.data);
      if (c === 0) {
        iter._cursor = res;
        return iter;
      } else {
        iter._ancestors.push(res);
        res = res.get_child(c > 0);
      }
    }
    return null;
  };
  TreeBase.prototype.lowerBound = function(item) {
    var cur = this._root;
    var iter = this.iterator();
    var cmp = this._comparator;
    while (cur !== null) {
      var c = cmp(item, cur.data);
      if (c === 0) {
        iter._cursor = cur;
        return iter;
      }
      iter._ancestors.push(cur);
      cur = cur.get_child(c > 0);
    }
    for (var i = iter._ancestors.length - 1; i >= 0; --i) {
      cur = iter._ancestors[i];
      if (cmp(item, cur.data) < 0) {
        iter._cursor = cur;
        iter._ancestors.length = i;
        return iter;
      }
    }
    iter._ancestors.length = 0;
    return iter;
  };
  TreeBase.prototype.upperBound = function(item) {
    var iter = this.lowerBound(item);
    var cmp = this._comparator;
    while (iter.data() !== null && cmp(iter.data(), item) === 0) {
      iter.next();
    }
    return iter;
  };
  TreeBase.prototype.min = function() {
    var res = this._root;
    if (res === null) {
      return null;
    }
    while (res.left !== null) {
      res = res.left;
    }
    return res.data;
  };
  TreeBase.prototype.max = function() {
    var res = this._root;
    if (res === null) {
      return null;
    }
    while (res.right !== null) {
      res = res.right;
    }
    return res.data;
  };
  TreeBase.prototype.iterator = function() {
    return new Iterator(this);
  };
  TreeBase.prototype.each = function(cb) {
    var it = this.iterator(), data;
    while ((data = it.next()) !== null) {
      if (cb(data) === false) {
        return;
      }
    }
  };
  TreeBase.prototype.reach = function(cb) {
    var it = this.iterator(), data;
    while ((data = it.prev()) !== null) {
      if (cb(data) === false) {
        return;
      }
    }
  };
  function Iterator(tree) {
    this._tree = tree;
    this._ancestors = [];
    this._cursor = null;
  }
  Iterator.prototype.data = function() {
    return this._cursor !== null ? this._cursor.data : null;
  };
  Iterator.prototype.next = function() {
    if (this._cursor === null) {
      var root = this._tree._root;
      if (root !== null) {
        this._minNode(root);
      }
    } else {
      if (this._cursor.right === null) {
        var save;
        do {
          save = this._cursor;
          if (this._ancestors.length) {
            this._cursor = this._ancestors.pop();
          } else {
            this._cursor = null;
            break;
          }
        } while (this._cursor.right === save);
      } else {
        this._ancestors.push(this._cursor);
        this._minNode(this._cursor.right);
      }
    }
    return this._cursor !== null ? this._cursor.data : null;
  };
  Iterator.prototype.prev = function() {
    if (this._cursor === null) {
      var root = this._tree._root;
      if (root !== null) {
        this._maxNode(root);
      }
    } else {
      if (this._cursor.left === null) {
        var save;
        do {
          save = this._cursor;
          if (this._ancestors.length) {
            this._cursor = this._ancestors.pop();
          } else {
            this._cursor = null;
            break;
          }
        } while (this._cursor.left === save);
      } else {
        this._ancestors.push(this._cursor);
        this._maxNode(this._cursor.left);
      }
    }
    return this._cursor !== null ? this._cursor.data : null;
  };
  Iterator.prototype._minNode = function(start) {
    while (start.left !== null) {
      this._ancestors.push(start);
      start = start.left;
    }
    this._cursor = start;
  };
  Iterator.prototype._maxNode = function(start) {
    while (start.right !== null) {
      this._ancestors.push(start);
      start = start.right;
    }
    this._cursor = start;
  };
  treebase = TreeBase;
  return treebase;
}
var rbtree;
var hasRequiredRbtree;
function requireRbtree() {
  if (hasRequiredRbtree) return rbtree;
  hasRequiredRbtree = 1;
  var TreeBase = requireTreebase();
  function Node(data) {
    this.data = data;
    this.left = null;
    this.right = null;
    this.red = true;
  }
  Node.prototype.get_child = function(dir) {
    return dir ? this.right : this.left;
  };
  Node.prototype.set_child = function(dir, val) {
    if (dir) {
      this.right = val;
    } else {
      this.left = val;
    }
  };
  function RBTree(comparator) {
    this._root = null;
    this._comparator = comparator;
    this.size = 0;
  }
  RBTree.prototype = new TreeBase();
  RBTree.prototype.insert = function(data) {
    var ret2 = false;
    if (this._root === null) {
      this._root = new Node(data);
      ret2 = true;
      this.size++;
    } else {
      var head = new Node(void 0);
      var dir = 0;
      var last = 0;
      var gp = null;
      var ggp = head;
      var p = null;
      var node = this._root;
      ggp.right = this._root;
      while (true) {
        if (node === null) {
          node = new Node(data);
          p.set_child(dir, node);
          ret2 = true;
          this.size++;
        } else if (is_red(node.left) && is_red(node.right)) {
          node.red = true;
          node.left.red = false;
          node.right.red = false;
        }
        if (is_red(node) && is_red(p)) {
          var dir2 = ggp.right === gp;
          if (node === p.get_child(last)) {
            ggp.set_child(dir2, single_rotate(gp, !last));
          } else {
            ggp.set_child(dir2, double_rotate(gp, !last));
          }
        }
        var cmp = this._comparator(node.data, data);
        if (cmp === 0) {
          break;
        }
        last = dir;
        dir = cmp < 0;
        if (gp !== null) {
          ggp = gp;
        }
        gp = p;
        p = node;
        node = node.get_child(dir);
      }
      this._root = head.right;
    }
    this._root.red = false;
    return ret2;
  };
  RBTree.prototype.remove = function(data) {
    if (this._root === null) {
      return false;
    }
    var head = new Node(void 0);
    var node = head;
    node.right = this._root;
    var p = null;
    var gp = null;
    var found = null;
    var dir = 1;
    while (node.get_child(dir) !== null) {
      var last = dir;
      gp = p;
      p = node;
      node = node.get_child(dir);
      var cmp = this._comparator(data, node.data);
      dir = cmp > 0;
      if (cmp === 0) {
        found = node;
      }
      if (!is_red(node) && !is_red(node.get_child(dir))) {
        if (is_red(node.get_child(!dir))) {
          var sr = single_rotate(node, dir);
          p.set_child(last, sr);
          p = sr;
        } else if (!is_red(node.get_child(!dir))) {
          var sibling = p.get_child(!last);
          if (sibling !== null) {
            if (!is_red(sibling.get_child(!last)) && !is_red(sibling.get_child(last))) {
              p.red = false;
              sibling.red = true;
              node.red = true;
            } else {
              var dir2 = gp.right === p;
              if (is_red(sibling.get_child(last))) {
                gp.set_child(dir2, double_rotate(p, last));
              } else if (is_red(sibling.get_child(!last))) {
                gp.set_child(dir2, single_rotate(p, last));
              }
              var gpc = gp.get_child(dir2);
              gpc.red = true;
              node.red = true;
              gpc.left.red = false;
              gpc.right.red = false;
            }
          }
        }
      }
    }
    if (found !== null) {
      found.data = node.data;
      p.set_child(p.right === node, node.get_child(node.left === null));
      this.size--;
    }
    this._root = head.right;
    if (this._root !== null) {
      this._root.red = false;
    }
    return found !== null;
  };
  function is_red(node) {
    return node !== null && node.red;
  }
  function single_rotate(root, dir) {
    var save = root.get_child(!dir);
    root.set_child(!dir, save.get_child(dir));
    save.set_child(dir, root);
    root.red = true;
    save.red = false;
    return save;
  }
  function double_rotate(root, dir) {
    root.set_child(!dir, single_rotate(root.get_child(!dir), !dir));
    return single_rotate(root, dir);
  }
  rbtree = RBTree;
  return rbtree;
}
var bintree;
var hasRequiredBintree;
function requireBintree() {
  if (hasRequiredBintree) return bintree;
  hasRequiredBintree = 1;
  var TreeBase = requireTreebase();
  function Node(data) {
    this.data = data;
    this.left = null;
    this.right = null;
  }
  Node.prototype.get_child = function(dir) {
    return dir ? this.right : this.left;
  };
  Node.prototype.set_child = function(dir, val) {
    if (dir) {
      this.right = val;
    } else {
      this.left = val;
    }
  };
  function BinTree(comparator) {
    this._root = null;
    this._comparator = comparator;
    this.size = 0;
  }
  BinTree.prototype = new TreeBase();
  BinTree.prototype.insert = function(data) {
    if (this._root === null) {
      this._root = new Node(data);
      this.size++;
      return true;
    }
    var dir = 0;
    var p = null;
    var node = this._root;
    while (true) {
      if (node === null) {
        node = new Node(data);
        p.set_child(dir, node);
        ret = true;
        this.size++;
        return true;
      }
      if (this._comparator(node.data, data) === 0) {
        return false;
      }
      dir = this._comparator(node.data, data) < 0;
      p = node;
      node = node.get_child(dir);
    }
  };
  BinTree.prototype.remove = function(data) {
    if (this._root === null) {
      return false;
    }
    var head = new Node(void 0);
    var node = head;
    node.right = this._root;
    var p = null;
    var found = null;
    var dir = 1;
    while (node.get_child(dir) !== null) {
      p = node;
      node = node.get_child(dir);
      var cmp = this._comparator(data, node.data);
      dir = cmp > 0;
      if (cmp === 0) {
        found = node;
      }
    }
    if (found !== null) {
      found.data = node.data;
      p.set_child(p.right === node, node.get_child(node.left === null));
      this._root = head.right;
      this.size--;
      return true;
    } else {
      return false;
    }
  };
  bintree = BinTree;
  return bintree;
}
var bintrees;
var hasRequiredBintrees;
function requireBintrees() {
  if (hasRequiredBintrees) return bintrees;
  hasRequiredBintrees = 1;
  bintrees = {
    RBTree: requireRbtree(),
    BinTree: requireBintree()
  };
  return bintrees;
}
var tdigest;
var hasRequiredTdigest;
function requireTdigest() {
  if (hasRequiredTdigest) return tdigest;
  hasRequiredTdigest = 1;
  var RBTree = requireBintrees().RBTree;
  function TDigest(delta, K, CX) {
    this.discrete = delta === false;
    this.delta = delta || 0.01;
    this.K = K === void 0 ? 25 : K;
    this.CX = CX === void 0 ? 1.1 : CX;
    this.centroids = new RBTree(compare_centroid_means);
    this.nreset = 0;
    this.reset();
  }
  TDigest.prototype.reset = function() {
    this.centroids.clear();
    this.n = 0;
    this.nreset += 1;
    this.last_cumulate = 0;
  };
  TDigest.prototype.size = function() {
    return this.centroids.size;
  };
  TDigest.prototype.toArray = function(everything) {
    var result = [];
    if (everything) {
      this._cumulate(true);
      this.centroids.each(function(c) {
        result.push(c);
      });
    } else {
      this.centroids.each(function(c) {
        result.push({ mean: c.mean, n: c.n });
      });
    }
    return result;
  };
  TDigest.prototype.summary = function() {
    var approx = this.discrete ? "exact " : "approximating ";
    var s = [
      approx + this.n + " samples using " + this.size() + " centroids",
      "min = " + this.percentile(0),
      "Q1  = " + this.percentile(0.25),
      "Q2  = " + this.percentile(0.5),
      "Q3  = " + this.percentile(0.75),
      "max = " + this.percentile(1)
    ];
    return s.join("\n");
  };
  function compare_centroid_means(a, b) {
    return a.mean > b.mean ? 1 : a.mean < b.mean ? -1 : 0;
  }
  function compare_centroid_mean_cumns(a, b) {
    return a.mean_cumn - b.mean_cumn;
  }
  TDigest.prototype.push = function(x, n) {
    n = n || 1;
    x = Array.isArray(x) ? x : [x];
    for (var i = 0; i < x.length; i++) {
      this._digest(x[i], n);
    }
  };
  TDigest.prototype.push_centroid = function(c) {
    c = Array.isArray(c) ? c : [c];
    for (var i = 0; i < c.length; i++) {
      this._digest(c[i].mean, c[i].n);
    }
  };
  TDigest.prototype._cumulate = function(exact) {
    if (this.n === this.last_cumulate || !exact && this.CX && this.CX > this.n / this.last_cumulate) {
      return;
    }
    var cumn = 0;
    this.centroids.each(function(c) {
      c.mean_cumn = cumn + c.n / 2;
      cumn = c.cumn = cumn + c.n;
    });
    this.n = this.last_cumulate = cumn;
  };
  TDigest.prototype.find_nearest = function(x) {
    if (this.size() === 0) {
      return null;
    }
    var iter = this.centroids.lowerBound({ mean: x });
    var c = iter.data() === null ? iter.prev() : iter.data();
    if (c.mean === x || this.discrete) {
      return c;
    }
    var prev = iter.prev();
    if (prev && Math.abs(prev.mean - x) < Math.abs(c.mean - x)) {
      return prev;
    } else {
      return c;
    }
  };
  TDigest.prototype._new_centroid = function(x, n, cumn) {
    var c = { mean: x, n, cumn };
    this.centroids.insert(c);
    this.n += n;
    return c;
  };
  TDigest.prototype._addweight = function(nearest, x, n) {
    if (x !== nearest.mean) {
      nearest.mean += n * (x - nearest.mean) / (nearest.n + n);
    }
    nearest.cumn += n;
    nearest.mean_cumn += n / 2;
    nearest.n += n;
    this.n += n;
  };
  TDigest.prototype._digest = function(x, n) {
    var min = this.centroids.min();
    var max = this.centroids.max();
    var nearest = this.find_nearest(x);
    if (nearest && nearest.mean === x) {
      this._addweight(nearest, x, n);
    } else if (nearest === min) {
      this._new_centroid(x, n, 0);
    } else if (nearest === max) {
      this._new_centroid(x, n, this.n);
    } else if (this.discrete) {
      this._new_centroid(x, n, nearest.cumn);
    } else {
      var p = nearest.mean_cumn / this.n;
      var max_n = Math.floor(4 * this.n * this.delta * p * (1 - p));
      if (max_n - nearest.n >= n) {
        this._addweight(nearest, x, n);
      } else {
        this._new_centroid(x, n, nearest.cumn);
      }
    }
    this._cumulate(false);
    if (!this.discrete && this.K && this.size() > this.K / this.delta) {
      this.compress();
    }
  };
  TDigest.prototype.bound_mean = function(x) {
    var iter = this.centroids.upperBound({ mean: x });
    var lower = iter.prev();
    var upper = lower.mean === x ? lower : iter.next();
    return [lower, upper];
  };
  TDigest.prototype.p_rank = function(x_or_xlist) {
    var xs = Array.isArray(x_or_xlist) ? x_or_xlist : [x_or_xlist];
    var ps = xs.map(this._p_rank, this);
    return Array.isArray(x_or_xlist) ? ps : ps[0];
  };
  TDigest.prototype._p_rank = function(x) {
    if (this.size() === 0) {
      return void 0;
    } else if (x < this.centroids.min().mean) {
      return 0;
    } else if (x > this.centroids.max().mean) {
      return 1;
    }
    this._cumulate(true);
    var bound = this.bound_mean(x);
    var lower = bound[0], upper = bound[1];
    if (this.discrete) {
      return lower.cumn / this.n;
    } else {
      var cumn = lower.mean_cumn;
      if (lower !== upper) {
        cumn += (x - lower.mean) * (upper.mean_cumn - lower.mean_cumn) / (upper.mean - lower.mean);
      }
      return cumn / this.n;
    }
  };
  TDigest.prototype.bound_mean_cumn = function(cumn) {
    this.centroids._comparator = compare_centroid_mean_cumns;
    var iter = this.centroids.upperBound({ mean_cumn: cumn });
    this.centroids._comparator = compare_centroid_means;
    var lower = iter.prev();
    var upper = lower && lower.mean_cumn === cumn ? lower : iter.next();
    return [lower, upper];
  };
  TDigest.prototype.percentile = function(p_or_plist) {
    var ps = Array.isArray(p_or_plist) ? p_or_plist : [p_or_plist];
    var qs = ps.map(this._percentile, this);
    return Array.isArray(p_or_plist) ? qs : qs[0];
  };
  TDigest.prototype._percentile = function(p) {
    if (this.size() === 0) {
      return void 0;
    }
    this._cumulate(true);
    var h = this.n * p;
    var bound = this.bound_mean_cumn(h);
    var lower = bound[0], upper = bound[1];
    if (upper === lower || lower === null || upper === null) {
      return (lower || upper).mean;
    } else if (!this.discrete) {
      return lower.mean + (h - lower.mean_cumn) * (upper.mean - lower.mean) / (upper.mean_cumn - lower.mean_cumn);
    } else if (h <= lower.cumn) {
      return lower.mean;
    } else {
      return upper.mean;
    }
  };
  function pop_random(choices) {
    var idx = Math.floor(Math.random() * choices.length);
    return choices.splice(idx, 1)[0];
  }
  TDigest.prototype.compress = function() {
    if (this.compressing) {
      return;
    }
    var points = this.toArray();
    this.reset();
    this.compressing = true;
    while (points.length > 0) {
      this.push_centroid(pop_random(points));
    }
    this._cumulate(true);
    this.compressing = false;
  };
  function Digest(config) {
    this.config = config || {};
    this.mode = this.config.mode || "auto";
    TDigest.call(this, this.mode === "cont" ? config.delta : false);
    this.digest_ratio = this.config.ratio || 0.9;
    this.digest_thresh = this.config.thresh || 1e3;
    this.n_unique = 0;
  }
  Digest.prototype = Object.create(TDigest.prototype);
  Digest.prototype.constructor = Digest;
  Digest.prototype.push = function(x_or_xlist) {
    TDigest.prototype.push.call(this, x_or_xlist);
    this.check_continuous();
  };
  Digest.prototype._new_centroid = function(x, n, cumn) {
    this.n_unique += 1;
    TDigest.prototype._new_centroid.call(this, x, n, cumn);
  };
  Digest.prototype._addweight = function(nearest, x, n) {
    if (nearest.n === 1) {
      this.n_unique -= 1;
    }
    TDigest.prototype._addweight.call(this, nearest, x, n);
  };
  Digest.prototype.check_continuous = function() {
    if (this.mode !== "auto" || this.size() < this.digest_thresh) {
      return false;
    }
    if (this.n_unique / this.size() > this.digest_ratio) {
      this.mode = "cont";
      this.discrete = false;
      this.delta = this.config.delta || 0.01;
      this.compress();
      return true;
    }
    return false;
  };
  tdigest = {
    "TDigest": TDigest,
    "Digest": Digest
  };
  return tdigest;
}
var timeWindowQuantiles;
var hasRequiredTimeWindowQuantiles;
function requireTimeWindowQuantiles() {
  if (hasRequiredTimeWindowQuantiles) return timeWindowQuantiles;
  hasRequiredTimeWindowQuantiles = 1;
  const { TDigest } = requireTdigest();
  class TimeWindowQuantiles {
    constructor(maxAgeSeconds, ageBuckets) {
      this.maxAgeSeconds = maxAgeSeconds || 0;
      this.ageBuckets = ageBuckets || 0;
      this.shouldRotate = maxAgeSeconds && ageBuckets;
      this.ringBuffer = Array(ageBuckets).fill(new TDigest());
      this.currentBuffer = 0;
      this.lastRotateTimestampMillis = Date.now();
      this.durationBetweenRotatesMillis = maxAgeSeconds * 1e3 / ageBuckets || Infinity;
    }
    size() {
      const bucket = rotate.call(this);
      return bucket.size();
    }
    percentile(quantile) {
      const bucket = rotate.call(this);
      return bucket.percentile(quantile);
    }
    push(value) {
      rotate.call(this);
      this.ringBuffer.forEach((bucket) => {
        bucket.push(value);
      });
    }
    reset() {
      this.ringBuffer.forEach((bucket) => {
        bucket.reset();
      });
    }
    compress() {
      this.ringBuffer.forEach((bucket) => {
        bucket.compress();
      });
    }
  }
  function rotate() {
    let timeSinceLastRotateMillis = Date.now() - this.lastRotateTimestampMillis;
    while (timeSinceLastRotateMillis > this.durationBetweenRotatesMillis && this.shouldRotate) {
      this.ringBuffer[this.currentBuffer] = new TDigest();
      if (++this.currentBuffer >= this.ringBuffer.length) {
        this.currentBuffer = 0;
      }
      timeSinceLastRotateMillis -= this.durationBetweenRotatesMillis;
      this.lastRotateTimestampMillis += this.durationBetweenRotatesMillis;
    }
    return this.ringBuffer[this.currentBuffer];
  }
  timeWindowQuantiles = TimeWindowQuantiles;
  return timeWindowQuantiles;
}
var summary;
var hasRequiredSummary;
function requireSummary() {
  if (hasRequiredSummary) return summary;
  hasRequiredSummary = 1;
  const util2 = require$$0;
  const { getLabels, hashObject, removeLabels } = requireUtil();
  const { validateLabel } = requireValidation();
  const { Metric: Metric2 } = requireMetric$1();
  const timeWindowQuantiles2 = requireTimeWindowQuantiles();
  const DEFAULT_COMPRESS_COUNT = 1e3;
  class Summary extends Metric2 {
    constructor(config) {
      super(config, {
        percentiles: [0.01, 0.05, 0.5, 0.9, 0.95, 0.99, 0.999],
        compressCount: DEFAULT_COMPRESS_COUNT,
        hashMap: {}
      });
      this.type = "summary";
      for (const label of this.labelNames) {
        if (label === "quantile")
          throw new Error("quantile is a reserved label keyword");
      }
      if (this.labelNames.length === 0) {
        this.hashMap = {
          [hashObject({})]: {
            labels: {},
            td: new timeWindowQuantiles2(this.maxAgeSeconds, this.ageBuckets),
            count: 0,
            sum: 0
          }
        };
      }
    }
    /**
     * Observe a value
     * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
     * @param {Number} value - Value to observe
     * @returns {void}
     */
    observe(labels, value) {
      observe.call(this, labels === 0 ? 0 : labels || {})(value);
    }
    async get() {
      if (this.collect) {
        const v = this.collect();
        if (v instanceof Promise) await v;
      }
      const hashKeys = Object.keys(this.hashMap);
      const values = [];
      hashKeys.forEach((hashKey) => {
        const s = this.hashMap[hashKey];
        if (s) {
          if (this.pruneAgedBuckets && s.td.size() === 0) {
            delete this.hashMap[hashKey];
          } else {
            extractSummariesForExport(s, this.percentiles).forEach((v) => {
              values.push(v);
            });
            values.push(getSumForExport(s, this));
            values.push(getCountForExport(s, this));
          }
        }
      });
      return {
        name: this.name,
        help: this.help,
        type: this.type,
        values,
        aggregator: this.aggregator
      };
    }
    reset() {
      const data = Object.values(this.hashMap);
      data.forEach((s) => {
        s.td.reset();
        s.count = 0;
        s.sum = 0;
      });
    }
    /**
     * Start a timer that could be used to logging durations
     * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
     * @returns {function} - Function to invoke when you want to stop the timer and observe the duration in seconds
     * @example
     * var end = summary.startTimer();
     * makeExpensiveXHRRequest(function(err, res) {
     *	end(); //Observe the duration of expensiveXHRRequest
     * });
     */
    startTimer(labels) {
      return startTimer.call(this, labels)();
    }
    labels(...args) {
      const labels = getLabels(this.labelNames, args);
      validateLabel(this.labelNames, labels);
      return {
        observe: observe.call(this, labels),
        startTimer: startTimer.call(this, labels)
      };
    }
    remove(...args) {
      const labels = getLabels(this.labelNames, args);
      validateLabel(this.labelNames, labels);
      removeLabels.call(this, this.hashMap, labels, this.sortedLabelNames);
    }
  }
  function extractSummariesForExport(summaryOfLabels, percentiles) {
    summaryOfLabels.td.compress();
    return percentiles.map((percentile) => {
      const percentileValue = summaryOfLabels.td.percentile(percentile);
      return {
        labels: Object.assign({ quantile: percentile }, summaryOfLabels.labels),
        value: percentileValue ? percentileValue : 0
      };
    });
  }
  function getCountForExport(value, summary2) {
    return {
      metricName: `${summary2.name}_count`,
      labels: value.labels,
      value: value.count
    };
  }
  function getSumForExport(value, summary2) {
    return {
      metricName: `${summary2.name}_sum`,
      labels: value.labels,
      value: value.sum
    };
  }
  function startTimer(startLabels) {
    return () => {
      const start = process.hrtime();
      return (endLabels) => {
        const delta = process.hrtime(start);
        const value = delta[0] + delta[1] / 1e9;
        this.observe(Object.assign({}, startLabels, endLabels), value);
        return value;
      };
    };
  }
  function observe(labels) {
    return (value) => {
      const labelValuePair = convertLabelsAndValues(labels, value);
      validateLabel(this.labelNames, labels);
      if (!Number.isFinite(labelValuePair.value)) {
        throw new TypeError(
          `Value is not a valid number: ${util2.format(labelValuePair.value)}`
        );
      }
      const hash = hashObject(labelValuePair.labels, this.sortedLabelNames);
      let summaryOfLabel = this.hashMap[hash];
      if (!summaryOfLabel) {
        summaryOfLabel = {
          labels: labelValuePair.labels,
          td: new timeWindowQuantiles2(this.maxAgeSeconds, this.ageBuckets),
          count: 0,
          sum: 0
        };
      }
      summaryOfLabel.td.push(labelValuePair.value);
      summaryOfLabel.count++;
      if (summaryOfLabel.count % this.compressCount === 0) {
        summaryOfLabel.td.compress();
      }
      summaryOfLabel.sum += labelValuePair.value;
      this.hashMap[hash] = summaryOfLabel;
    };
  }
  function convertLabelsAndValues(labels, value) {
    if (value === void 0) {
      return {
        value: labels,
        labels: {}
      };
    }
    return {
      labels,
      value
    };
  }
  summary = Summary;
  return summary;
}
var pushgateway;
var hasRequiredPushgateway;
function requirePushgateway() {
  if (hasRequiredPushgateway) return pushgateway;
  hasRequiredPushgateway = 1;
  const url = Url;
  const http$1 = http;
  const https$1 = https;
  const { gzipSync } = zlib__default;
  const { globalRegistry } = requireRegistry();
  class Pushgateway {
    constructor(gatewayUrl, options, registry2) {
      if (!registry2) {
        registry2 = globalRegistry;
      }
      this.registry = registry2;
      this.gatewayUrl = gatewayUrl;
      const { requireJobName, ...requestOptions } = {
        requireJobName: true,
        ...options
      };
      this.requireJobName = requireJobName;
      this.requestOptions = requestOptions;
    }
    pushAdd(params = {}) {
      if (this.requireJobName && !params.jobName) {
        throw new Error("Missing jobName parameter");
      }
      return useGateway.call(this, "POST", params.jobName, params.groupings);
    }
    push(params = {}) {
      if (this.requireJobName && !params.jobName) {
        throw new Error("Missing jobName parameter");
      }
      return useGateway.call(this, "PUT", params.jobName, params.groupings);
    }
    delete(params = {}) {
      if (this.requireJobName && !params.jobName) {
        throw new Error("Missing jobName parameter");
      }
      return useGateway.call(this, "DELETE", params.jobName, params.groupings);
    }
  }
  async function useGateway(method, job, groupings) {
    const gatewayUrlParsed = url.parse(this.gatewayUrl);
    const gatewayUrlPath = gatewayUrlParsed.pathname && gatewayUrlParsed.pathname !== "/" ? gatewayUrlParsed.pathname : "";
    const jobPath = job ? `/job/${encodeURIComponent(job)}${generateGroupings(groupings)}` : "";
    const path2 = `${gatewayUrlPath}/metrics${jobPath}`;
    const target = url.resolve(this.gatewayUrl, path2);
    const requestParams = url.parse(target);
    const httpModule = isHttps(requestParams.href) ? https$1 : http$1;
    const options = Object.assign(requestParams, this.requestOptions, {
      method
    });
    return new Promise((resolve, reject) => {
      if (method === "DELETE" && options.headers) {
        delete options.headers["Content-Encoding"];
      }
      const req = httpModule.request(options, (resp) => {
        let body = "";
        resp.setEncoding("utf8");
        resp.on("data", (chunk) => {
          body += chunk;
        });
        resp.on("end", () => {
          if (resp.statusCode >= 400) {
            reject(
              new Error(`push failed with status ${resp.statusCode}, ${body}`)
            );
          } else {
            resolve({ resp, body });
          }
        });
      });
      req.on("error", (err) => {
        reject(err);
      });
      req.on("timeout", () => {
        req.destroy(new Error("Pushgateway request timed out"));
      });
      if (method !== "DELETE") {
        this.registry.metrics().then((metrics2) => {
          if (options.headers && options.headers["Content-Encoding"] === "gzip") {
            metrics2 = gzipSync(metrics2);
          }
          req.write(metrics2);
          req.end();
        }).catch((err) => {
          reject(err);
        });
      } else {
        req.end();
      }
    });
  }
  function generateGroupings(groupings) {
    if (!groupings) {
      return "";
    }
    return Object.keys(groupings).map(
      (key) => `/${encodeURIComponent(key)}/${encodeURIComponent(groupings[key])}`
    ).join("");
  }
  function isHttps(href) {
    return href.search(/^https/) !== -1;
  }
  pushgateway = Pushgateway;
  return pushgateway;
}
var bucketGenerators = {};
var hasRequiredBucketGenerators;
function requireBucketGenerators() {
  if (hasRequiredBucketGenerators) return bucketGenerators;
  hasRequiredBucketGenerators = 1;
  bucketGenerators.linearBuckets = (start, width, count) => {
    if (count < 1) {
      throw new Error("Linear buckets needs a positive count");
    }
    const buckets = new Array(count);
    for (let i = 0; i < count; i++) {
      buckets[i] = start + i * width;
    }
    return buckets;
  };
  bucketGenerators.exponentialBuckets = (start, factor, count) => {
    if (start <= 0) {
      throw new Error("Exponential buckets needs a positive start");
    }
    if (count < 1) {
      throw new Error("Exponential buckets needs a positive count");
    }
    if (factor <= 1) {
      throw new Error("Exponential buckets needs a factor greater than 1");
    }
    const buckets = new Array(count);
    for (let i = 0; i < count; i++) {
      buckets[i] = start;
      start *= factor;
    }
    return buckets;
  };
  return bucketGenerators;
}
var defaultMetrics = { exports: {} };
var processCpuTotal = { exports: {} };
var src = {};
var utils$1 = {};
var diag = {};
var ComponentLogger = {};
var globalUtils = {};
var version$1 = {};
var hasRequiredVersion$1;
function requireVersion$1() {
  if (hasRequiredVersion$1) return version$1;
  hasRequiredVersion$1 = 1;
  Object.defineProperty(version$1, "__esModule", { value: true });
  version$1.VERSION = void 0;
  version$1.VERSION = "1.9.1";
  return version$1;
}
var semver = {};
var hasRequiredSemver;
function requireSemver() {
  if (hasRequiredSemver) return semver;
  hasRequiredSemver = 1;
  Object.defineProperty(semver, "__esModule", { value: true });
  semver.isCompatible = semver._makeCompatibilityCheck = void 0;
  const version_1 = /* @__PURE__ */ requireVersion$1();
  const re = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
  function _makeCompatibilityCheck(ownVersion) {
    const acceptedVersions = /* @__PURE__ */ new Set([ownVersion]);
    const rejectedVersions = /* @__PURE__ */ new Set();
    const myVersionMatch = ownVersion.match(re);
    if (!myVersionMatch) {
      return () => false;
    }
    const ownVersionParsed = {
      major: +myVersionMatch[1],
      minor: +myVersionMatch[2],
      patch: +myVersionMatch[3],
      prerelease: myVersionMatch[4]
    };
    if (ownVersionParsed.prerelease != null) {
      return function isExactmatch(globalVersion) {
        return globalVersion === ownVersion;
      };
    }
    function _reject(v) {
      rejectedVersions.add(v);
      return false;
    }
    function _accept(v) {
      acceptedVersions.add(v);
      return true;
    }
    return function isCompatible(globalVersion) {
      if (acceptedVersions.has(globalVersion)) {
        return true;
      }
      if (rejectedVersions.has(globalVersion)) {
        return false;
      }
      const globalVersionMatch = globalVersion.match(re);
      if (!globalVersionMatch) {
        return _reject(globalVersion);
      }
      const globalVersionParsed = {
        major: +globalVersionMatch[1],
        minor: +globalVersionMatch[2],
        patch: +globalVersionMatch[3],
        prerelease: globalVersionMatch[4]
      };
      if (globalVersionParsed.prerelease != null) {
        return _reject(globalVersion);
      }
      if (ownVersionParsed.major !== globalVersionParsed.major) {
        return _reject(globalVersion);
      }
      if (ownVersionParsed.major === 0) {
        if (ownVersionParsed.minor === globalVersionParsed.minor && ownVersionParsed.patch <= globalVersionParsed.patch) {
          return _accept(globalVersion);
        }
        return _reject(globalVersion);
      }
      if (ownVersionParsed.minor <= globalVersionParsed.minor) {
        return _accept(globalVersion);
      }
      return _reject(globalVersion);
    };
  }
  semver._makeCompatibilityCheck = _makeCompatibilityCheck;
  semver.isCompatible = _makeCompatibilityCheck(version_1.VERSION);
  return semver;
}
var hasRequiredGlobalUtils;
function requireGlobalUtils() {
  if (hasRequiredGlobalUtils) return globalUtils;
  hasRequiredGlobalUtils = 1;
  Object.defineProperty(globalUtils, "__esModule", { value: true });
  globalUtils.unregisterGlobal = globalUtils.getGlobal = globalUtils.registerGlobal = void 0;
  const version_1 = /* @__PURE__ */ requireVersion$1();
  const semver_1 = /* @__PURE__ */ requireSemver();
  const major = version_1.VERSION.split(".")[0];
  const GLOBAL_OPENTELEMETRY_API_KEY = Symbol.for(`opentelemetry.js.api.${major}`);
  const _global = typeof globalThis === "object" ? globalThis : typeof self === "object" ? self : typeof window === "object" ? window : typeof commonjsGlobal === "object" ? commonjsGlobal : {};
  function registerGlobal(type, instance, diag2, allowOverride = false) {
    var _a;
    const api = _global[GLOBAL_OPENTELEMETRY_API_KEY] = (_a = _global[GLOBAL_OPENTELEMETRY_API_KEY]) !== null && _a !== void 0 ? _a : {
      version: version_1.VERSION
    };
    if (!allowOverride && api[type]) {
      const err = new Error(`@opentelemetry/api: Attempted duplicate registration of API: ${type}`);
      diag2.error(err.stack || err.message);
      return false;
    }
    if (api.version !== version_1.VERSION) {
      const err = new Error(`@opentelemetry/api: Registration of version v${api.version} for ${type} does not match previously registered API v${version_1.VERSION}`);
      diag2.error(err.stack || err.message);
      return false;
    }
    api[type] = instance;
    diag2.debug(`@opentelemetry/api: Registered a global for ${type} v${version_1.VERSION}.`);
    return true;
  }
  globalUtils.registerGlobal = registerGlobal;
  function getGlobal(type) {
    var _a, _b;
    const globalVersion = (_a = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _a === void 0 ? void 0 : _a.version;
    if (!globalVersion || !(0, semver_1.isCompatible)(globalVersion)) {
      return;
    }
    return (_b = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _b === void 0 ? void 0 : _b[type];
  }
  globalUtils.getGlobal = getGlobal;
  function unregisterGlobal(type, diag2) {
    diag2.debug(`@opentelemetry/api: Unregistering a global for ${type} v${version_1.VERSION}.`);
    const api = _global[GLOBAL_OPENTELEMETRY_API_KEY];
    if (api) {
      delete api[type];
    }
  }
  globalUtils.unregisterGlobal = unregisterGlobal;
  return globalUtils;
}
var hasRequiredComponentLogger;
function requireComponentLogger() {
  if (hasRequiredComponentLogger) return ComponentLogger;
  hasRequiredComponentLogger = 1;
  Object.defineProperty(ComponentLogger, "__esModule", { value: true });
  ComponentLogger.DiagComponentLogger = void 0;
  const global_utils_1 = /* @__PURE__ */ requireGlobalUtils();
  class DiagComponentLogger {
    constructor(props) {
      this._namespace = props.namespace || "DiagComponentLogger";
    }
    debug(...args) {
      return logProxy("debug", this._namespace, args);
    }
    error(...args) {
      return logProxy("error", this._namespace, args);
    }
    info(...args) {
      return logProxy("info", this._namespace, args);
    }
    warn(...args) {
      return logProxy("warn", this._namespace, args);
    }
    verbose(...args) {
      return logProxy("verbose", this._namespace, args);
    }
  }
  ComponentLogger.DiagComponentLogger = DiagComponentLogger;
  function logProxy(funcName, namespace, args) {
    const logger2 = (0, global_utils_1.getGlobal)("diag");
    if (!logger2) {
      return;
    }
    return logger2[funcName](namespace, ...args);
  }
  return ComponentLogger;
}
var logLevelLogger = {};
var types = {};
var hasRequiredTypes;
function requireTypes() {
  if (hasRequiredTypes) return types;
  hasRequiredTypes = 1;
  (function(exports$1) {
    Object.defineProperty(exports$1, "__esModule", { value: true });
    exports$1.DiagLogLevel = void 0;
    (function(DiagLogLevel) {
      DiagLogLevel[DiagLogLevel["NONE"] = 0] = "NONE";
      DiagLogLevel[DiagLogLevel["ERROR"] = 30] = "ERROR";
      DiagLogLevel[DiagLogLevel["WARN"] = 50] = "WARN";
      DiagLogLevel[DiagLogLevel["INFO"] = 60] = "INFO";
      DiagLogLevel[DiagLogLevel["DEBUG"] = 70] = "DEBUG";
      DiagLogLevel[DiagLogLevel["VERBOSE"] = 80] = "VERBOSE";
      DiagLogLevel[DiagLogLevel["ALL"] = 9999] = "ALL";
    })(exports$1.DiagLogLevel || (exports$1.DiagLogLevel = {}));
  })(types);
  return types;
}
var hasRequiredLogLevelLogger;
function requireLogLevelLogger() {
  if (hasRequiredLogLevelLogger) return logLevelLogger;
  hasRequiredLogLevelLogger = 1;
  Object.defineProperty(logLevelLogger, "__esModule", { value: true });
  logLevelLogger.createLogLevelDiagLogger = void 0;
  const types_1 = /* @__PURE__ */ requireTypes();
  function createLogLevelDiagLogger(maxLevel, logger2) {
    if (maxLevel < types_1.DiagLogLevel.NONE) {
      maxLevel = types_1.DiagLogLevel.NONE;
    } else if (maxLevel > types_1.DiagLogLevel.ALL) {
      maxLevel = types_1.DiagLogLevel.ALL;
    }
    logger2 = logger2 || {};
    function _filterFunc(funcName, theLevel) {
      const theFunc = logger2[funcName];
      if (typeof theFunc === "function" && maxLevel >= theLevel) {
        return theFunc.bind(logger2);
      }
      return function() {
      };
    }
    return {
      error: _filterFunc("error", types_1.DiagLogLevel.ERROR),
      warn: _filterFunc("warn", types_1.DiagLogLevel.WARN),
      info: _filterFunc("info", types_1.DiagLogLevel.INFO),
      debug: _filterFunc("debug", types_1.DiagLogLevel.DEBUG),
      verbose: _filterFunc("verbose", types_1.DiagLogLevel.VERBOSE)
    };
  }
  logLevelLogger.createLogLevelDiagLogger = createLogLevelDiagLogger;
  return logLevelLogger;
}
var hasRequiredDiag;
function requireDiag() {
  if (hasRequiredDiag) return diag;
  hasRequiredDiag = 1;
  Object.defineProperty(diag, "__esModule", { value: true });
  diag.DiagAPI = void 0;
  const ComponentLogger_1 = /* @__PURE__ */ requireComponentLogger();
  const logLevelLogger_1 = /* @__PURE__ */ requireLogLevelLogger();
  const types_1 = /* @__PURE__ */ requireTypes();
  const global_utils_1 = /* @__PURE__ */ requireGlobalUtils();
  const API_NAME = "diag";
  class DiagAPI {
    /** Get the singleton instance of the DiagAPI API */
    static instance() {
      if (!this._instance) {
        this._instance = new DiagAPI();
      }
      return this._instance;
    }
    /**
     * Private internal constructor
     * @private
     */
    constructor() {
      function _logProxy(funcName) {
        return function(...args) {
          const logger2 = (0, global_utils_1.getGlobal)("diag");
          if (!logger2)
            return;
          return logger2[funcName](...args);
        };
      }
      const self2 = this;
      const setLogger = (logger2, optionsOrLogLevel = { logLevel: types_1.DiagLogLevel.INFO }) => {
        var _a, _b, _c;
        if (logger2 === self2) {
          const err = new Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
          self2.error((_a = err.stack) !== null && _a !== void 0 ? _a : err.message);
          return false;
        }
        if (typeof optionsOrLogLevel === "number") {
          optionsOrLogLevel = {
            logLevel: optionsOrLogLevel
          };
        }
        const oldLogger = (0, global_utils_1.getGlobal)("diag");
        const newLogger = (0, logLevelLogger_1.createLogLevelDiagLogger)((_b = optionsOrLogLevel.logLevel) !== null && _b !== void 0 ? _b : types_1.DiagLogLevel.INFO, logger2);
        if (oldLogger && !optionsOrLogLevel.suppressOverrideMessage) {
          const stack = (_c = new Error().stack) !== null && _c !== void 0 ? _c : "<failed to generate stacktrace>";
          oldLogger.warn(`Current logger will be overwritten from ${stack}`);
          newLogger.warn(`Current logger will overwrite one already registered from ${stack}`);
        }
        return (0, global_utils_1.registerGlobal)("diag", newLogger, self2, true);
      };
      self2.setLogger = setLogger;
      self2.disable = () => {
        (0, global_utils_1.unregisterGlobal)(API_NAME, self2);
      };
      self2.createComponentLogger = (options) => {
        return new ComponentLogger_1.DiagComponentLogger(options);
      };
      self2.verbose = _logProxy("verbose");
      self2.debug = _logProxy("debug");
      self2.info = _logProxy("info");
      self2.warn = _logProxy("warn");
      self2.error = _logProxy("error");
    }
  }
  diag.DiagAPI = DiagAPI;
  return diag;
}
var baggageImpl = {};
var hasRequiredBaggageImpl;
function requireBaggageImpl() {
  if (hasRequiredBaggageImpl) return baggageImpl;
  hasRequiredBaggageImpl = 1;
  Object.defineProperty(baggageImpl, "__esModule", { value: true });
  baggageImpl.BaggageImpl = void 0;
  class BaggageImpl {
    constructor(entries) {
      this._entries = entries ? new Map(entries) : /* @__PURE__ */ new Map();
    }
    getEntry(key) {
      const entry = this._entries.get(key);
      if (!entry) {
        return void 0;
      }
      return Object.assign({}, entry);
    }
    getAllEntries() {
      return Array.from(this._entries.entries());
    }
    setEntry(key, entry) {
      const newBaggage = new BaggageImpl(this._entries);
      newBaggage._entries.set(key, entry);
      return newBaggage;
    }
    removeEntry(key) {
      const newBaggage = new BaggageImpl(this._entries);
      newBaggage._entries.delete(key);
      return newBaggage;
    }
    removeEntries(...keys) {
      const newBaggage = new BaggageImpl(this._entries);
      for (const key of keys) {
        newBaggage._entries.delete(key);
      }
      return newBaggage;
    }
    clear() {
      return new BaggageImpl();
    }
  }
  baggageImpl.BaggageImpl = BaggageImpl;
  return baggageImpl;
}
var symbol = {};
var hasRequiredSymbol;
function requireSymbol() {
  if (hasRequiredSymbol) return symbol;
  hasRequiredSymbol = 1;
  Object.defineProperty(symbol, "__esModule", { value: true });
  symbol.baggageEntryMetadataSymbol = void 0;
  symbol.baggageEntryMetadataSymbol = Symbol("BaggageEntryMetadata");
  return symbol;
}
var hasRequiredUtils$1;
function requireUtils$1() {
  if (hasRequiredUtils$1) return utils$1;
  hasRequiredUtils$1 = 1;
  Object.defineProperty(utils$1, "__esModule", { value: true });
  utils$1.baggageEntryMetadataFromString = utils$1.createBaggage = void 0;
  const diag_1 = /* @__PURE__ */ requireDiag();
  const baggage_impl_1 = /* @__PURE__ */ requireBaggageImpl();
  const symbol_1 = /* @__PURE__ */ requireSymbol();
  const diag2 = diag_1.DiagAPI.instance();
  function createBaggage(entries = {}) {
    return new baggage_impl_1.BaggageImpl(new Map(Object.entries(entries)));
  }
  utils$1.createBaggage = createBaggage;
  function baggageEntryMetadataFromString(str) {
    if (typeof str !== "string") {
      diag2.error(`Cannot create baggage metadata from unknown type: ${typeof str}`);
      str = "";
    }
    return {
      __TYPE__: symbol_1.baggageEntryMetadataSymbol,
      toString() {
        return str;
      }
    };
  }
  utils$1.baggageEntryMetadataFromString = baggageEntryMetadataFromString;
  return utils$1;
}
var context$1 = {};
var hasRequiredContext$1;
function requireContext$1() {
  if (hasRequiredContext$1) return context$1;
  hasRequiredContext$1 = 1;
  Object.defineProperty(context$1, "__esModule", { value: true });
  context$1.ROOT_CONTEXT = context$1.createContextKey = void 0;
  function createContextKey(description) {
    return Symbol.for(description);
  }
  context$1.createContextKey = createContextKey;
  class BaseContext {
    /**
     * Construct a new context which inherits values from an optional parent context.
     *
     * @param parentContext a context from which to inherit values
     */
    constructor(parentContext) {
      const self2 = this;
      self2._currentContext = parentContext ? new Map(parentContext) : /* @__PURE__ */ new Map();
      self2.getValue = (key) => self2._currentContext.get(key);
      self2.setValue = (key, value) => {
        const context2 = new BaseContext(self2._currentContext);
        context2._currentContext.set(key, value);
        return context2;
      };
      self2.deleteValue = (key) => {
        const context2 = new BaseContext(self2._currentContext);
        context2._currentContext.delete(key);
        return context2;
      };
    }
  }
  context$1.ROOT_CONTEXT = new BaseContext();
  return context$1;
}
var consoleLogger = {};
var hasRequiredConsoleLogger;
function requireConsoleLogger() {
  if (hasRequiredConsoleLogger) return consoleLogger;
  hasRequiredConsoleLogger = 1;
  (function(exports$1) {
    Object.defineProperty(exports$1, "__esModule", { value: true });
    exports$1.DiagConsoleLogger = exports$1._originalConsoleMethods = void 0;
    const consoleMap = [
      { n: "error", c: "error" },
      { n: "warn", c: "warn" },
      { n: "info", c: "info" },
      { n: "debug", c: "debug" },
      { n: "verbose", c: "trace" }
    ];
    exports$1._originalConsoleMethods = {};
    if (typeof console !== "undefined") {
      const keys = [
        "error",
        "warn",
        "info",
        "debug",
        "trace",
        "log"
      ];
      for (const key of keys) {
        if (typeof console[key] === "function") {
          exports$1._originalConsoleMethods[key] = console[key];
        }
      }
    }
    class DiagConsoleLogger {
      constructor() {
        function _consoleFunc(funcName) {
          return function(...args) {
            let theFunc = exports$1._originalConsoleMethods[funcName];
            if (typeof theFunc !== "function") {
              theFunc = exports$1._originalConsoleMethods["log"];
            }
            if (typeof theFunc !== "function" && console) {
              theFunc = console[funcName];
              if (typeof theFunc !== "function") {
                theFunc = console.log;
              }
            }
            if (typeof theFunc === "function") {
              return theFunc.apply(console, args);
            }
          };
        }
        for (let i = 0; i < consoleMap.length; i++) {
          this[consoleMap[i].n] = _consoleFunc(consoleMap[i].c);
        }
      }
    }
    exports$1.DiagConsoleLogger = DiagConsoleLogger;
  })(consoleLogger);
  return consoleLogger;
}
var NoopMeter = {};
var hasRequiredNoopMeter;
function requireNoopMeter() {
  if (hasRequiredNoopMeter) return NoopMeter;
  hasRequiredNoopMeter = 1;
  (function(exports$1) {
    Object.defineProperty(exports$1, "__esModule", { value: true });
    exports$1.createNoopMeter = exports$1.NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = exports$1.NOOP_OBSERVABLE_GAUGE_METRIC = exports$1.NOOP_OBSERVABLE_COUNTER_METRIC = exports$1.NOOP_UP_DOWN_COUNTER_METRIC = exports$1.NOOP_HISTOGRAM_METRIC = exports$1.NOOP_GAUGE_METRIC = exports$1.NOOP_COUNTER_METRIC = exports$1.NOOP_METER = exports$1.NoopObservableUpDownCounterMetric = exports$1.NoopObservableGaugeMetric = exports$1.NoopObservableCounterMetric = exports$1.NoopObservableMetric = exports$1.NoopHistogramMetric = exports$1.NoopGaugeMetric = exports$1.NoopUpDownCounterMetric = exports$1.NoopCounterMetric = exports$1.NoopMetric = exports$1.NoopMeter = void 0;
    class NoopMeter2 {
      constructor() {
      }
      /**
       * @see {@link Meter.createGauge}
       */
      createGauge(_name, _options) {
        return exports$1.NOOP_GAUGE_METRIC;
      }
      /**
       * @see {@link Meter.createHistogram}
       */
      createHistogram(_name, _options) {
        return exports$1.NOOP_HISTOGRAM_METRIC;
      }
      /**
       * @see {@link Meter.createCounter}
       */
      createCounter(_name, _options) {
        return exports$1.NOOP_COUNTER_METRIC;
      }
      /**
       * @see {@link Meter.createUpDownCounter}
       */
      createUpDownCounter(_name, _options) {
        return exports$1.NOOP_UP_DOWN_COUNTER_METRIC;
      }
      /**
       * @see {@link Meter.createObservableGauge}
       */
      createObservableGauge(_name, _options) {
        return exports$1.NOOP_OBSERVABLE_GAUGE_METRIC;
      }
      /**
       * @see {@link Meter.createObservableCounter}
       */
      createObservableCounter(_name, _options) {
        return exports$1.NOOP_OBSERVABLE_COUNTER_METRIC;
      }
      /**
       * @see {@link Meter.createObservableUpDownCounter}
       */
      createObservableUpDownCounter(_name, _options) {
        return exports$1.NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
      }
      /**
       * @see {@link Meter.addBatchObservableCallback}
       */
      addBatchObservableCallback(_callback, _observables) {
      }
      /**
       * @see {@link Meter.removeBatchObservableCallback}
       */
      removeBatchObservableCallback(_callback) {
      }
    }
    exports$1.NoopMeter = NoopMeter2;
    class NoopMetric {
    }
    exports$1.NoopMetric = NoopMetric;
    class NoopCounterMetric extends NoopMetric {
      add(_value, _attributes) {
      }
    }
    exports$1.NoopCounterMetric = NoopCounterMetric;
    class NoopUpDownCounterMetric extends NoopMetric {
      add(_value, _attributes) {
      }
    }
    exports$1.NoopUpDownCounterMetric = NoopUpDownCounterMetric;
    class NoopGaugeMetric extends NoopMetric {
      record(_value, _attributes) {
      }
    }
    exports$1.NoopGaugeMetric = NoopGaugeMetric;
    class NoopHistogramMetric extends NoopMetric {
      record(_value, _attributes) {
      }
    }
    exports$1.NoopHistogramMetric = NoopHistogramMetric;
    class NoopObservableMetric {
      addCallback(_callback) {
      }
      removeCallback(_callback) {
      }
    }
    exports$1.NoopObservableMetric = NoopObservableMetric;
    class NoopObservableCounterMetric extends NoopObservableMetric {
    }
    exports$1.NoopObservableCounterMetric = NoopObservableCounterMetric;
    class NoopObservableGaugeMetric extends NoopObservableMetric {
    }
    exports$1.NoopObservableGaugeMetric = NoopObservableGaugeMetric;
    class NoopObservableUpDownCounterMetric extends NoopObservableMetric {
    }
    exports$1.NoopObservableUpDownCounterMetric = NoopObservableUpDownCounterMetric;
    exports$1.NOOP_METER = new NoopMeter2();
    exports$1.NOOP_COUNTER_METRIC = new NoopCounterMetric();
    exports$1.NOOP_GAUGE_METRIC = new NoopGaugeMetric();
    exports$1.NOOP_HISTOGRAM_METRIC = new NoopHistogramMetric();
    exports$1.NOOP_UP_DOWN_COUNTER_METRIC = new NoopUpDownCounterMetric();
    exports$1.NOOP_OBSERVABLE_COUNTER_METRIC = new NoopObservableCounterMetric();
    exports$1.NOOP_OBSERVABLE_GAUGE_METRIC = new NoopObservableGaugeMetric();
    exports$1.NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = new NoopObservableUpDownCounterMetric();
    function createNoopMeter() {
      return exports$1.NOOP_METER;
    }
    exports$1.createNoopMeter = createNoopMeter;
  })(NoopMeter);
  return NoopMeter;
}
var Metric = {};
var hasRequiredMetric;
function requireMetric() {
  if (hasRequiredMetric) return Metric;
  hasRequiredMetric = 1;
  (function(exports$1) {
    Object.defineProperty(exports$1, "__esModule", { value: true });
    exports$1.ValueType = void 0;
    (function(ValueType) {
      ValueType[ValueType["INT"] = 0] = "INT";
      ValueType[ValueType["DOUBLE"] = 1] = "DOUBLE";
    })(exports$1.ValueType || (exports$1.ValueType = {}));
  })(Metric);
  return Metric;
}
var TextMapPropagator = {};
var hasRequiredTextMapPropagator;
function requireTextMapPropagator() {
  if (hasRequiredTextMapPropagator) return TextMapPropagator;
  hasRequiredTextMapPropagator = 1;
  Object.defineProperty(TextMapPropagator, "__esModule", { value: true });
  TextMapPropagator.defaultTextMapSetter = TextMapPropagator.defaultTextMapGetter = void 0;
  TextMapPropagator.defaultTextMapGetter = {
    get(carrier, key) {
      if (carrier == null) {
        return void 0;
      }
      return carrier[key];
    },
    keys(carrier) {
      if (carrier == null) {
        return [];
      }
      return Object.keys(carrier);
    }
  };
  TextMapPropagator.defaultTextMapSetter = {
    set(carrier, key, value) {
      if (carrier == null) {
        return;
      }
      carrier[key] = value;
    }
  };
  return TextMapPropagator;
}
var ProxyTracer = {};
var NoopTracer = {};
var context = {};
var NoopContextManager = {};
var hasRequiredNoopContextManager;
function requireNoopContextManager() {
  if (hasRequiredNoopContextManager) return NoopContextManager;
  hasRequiredNoopContextManager = 1;
  Object.defineProperty(NoopContextManager, "__esModule", { value: true });
  NoopContextManager.NoopContextManager = void 0;
  const context_1 = /* @__PURE__ */ requireContext$1();
  let NoopContextManager$1 = class NoopContextManager {
    active() {
      return context_1.ROOT_CONTEXT;
    }
    with(_context, fn, thisArg, ...args) {
      return fn.call(thisArg, ...args);
    }
    bind(_context, target) {
      return target;
    }
    enable() {
      return this;
    }
    disable() {
      return this;
    }
  };
  NoopContextManager.NoopContextManager = NoopContextManager$1;
  return NoopContextManager;
}
var hasRequiredContext;
function requireContext() {
  if (hasRequiredContext) return context;
  hasRequiredContext = 1;
  Object.defineProperty(context, "__esModule", { value: true });
  context.ContextAPI = void 0;
  const NoopContextManager_1 = /* @__PURE__ */ requireNoopContextManager();
  const global_utils_1 = /* @__PURE__ */ requireGlobalUtils();
  const diag_1 = /* @__PURE__ */ requireDiag();
  const API_NAME = "context";
  const NOOP_CONTEXT_MANAGER = new NoopContextManager_1.NoopContextManager();
  class ContextAPI {
    /** Empty private constructor prevents end users from constructing a new instance of the API */
    constructor() {
    }
    /** Get the singleton instance of the Context API */
    static getInstance() {
      if (!this._instance) {
        this._instance = new ContextAPI();
      }
      return this._instance;
    }
    /**
     * Set the current context manager.
     *
     * @returns true if the context manager was successfully registered, else false
     */
    setGlobalContextManager(contextManager) {
      return (0, global_utils_1.registerGlobal)(API_NAME, contextManager, diag_1.DiagAPI.instance());
    }
    /**
     * Get the currently active context
     */
    active() {
      return this._getContextManager().active();
    }
    /**
     * Execute a function with an active context
     *
     * @param context context to be active during function execution
     * @param fn function to execute in a context
     * @param thisArg optional receiver to be used for calling fn
     * @param args optional arguments forwarded to fn
     */
    with(context2, fn, thisArg, ...args) {
      return this._getContextManager().with(context2, fn, thisArg, ...args);
    }
    /**
     * Bind a context to a target function or event emitter
     *
     * @param context context to bind to the event emitter or function. Defaults to the currently active context
     * @param target function or event emitter to bind
     */
    bind(context2, target) {
      return this._getContextManager().bind(context2, target);
    }
    _getContextManager() {
      return (0, global_utils_1.getGlobal)(API_NAME) || NOOP_CONTEXT_MANAGER;
    }
    /** Disable and remove the global context manager */
    disable() {
      this._getContextManager().disable();
      (0, global_utils_1.unregisterGlobal)(API_NAME, diag_1.DiagAPI.instance());
    }
  }
  context.ContextAPI = ContextAPI;
  return context;
}
var contextUtils = {};
var NonRecordingSpan = {};
var invalidSpanConstants = {};
var trace_flags = {};
var hasRequiredTrace_flags;
function requireTrace_flags() {
  if (hasRequiredTrace_flags) return trace_flags;
  hasRequiredTrace_flags = 1;
  (function(exports$1) {
    Object.defineProperty(exports$1, "__esModule", { value: true });
    exports$1.TraceFlags = void 0;
    (function(TraceFlags) {
      TraceFlags[TraceFlags["NONE"] = 0] = "NONE";
      TraceFlags[TraceFlags["SAMPLED"] = 1] = "SAMPLED";
    })(exports$1.TraceFlags || (exports$1.TraceFlags = {}));
  })(trace_flags);
  return trace_flags;
}
var hasRequiredInvalidSpanConstants;
function requireInvalidSpanConstants() {
  if (hasRequiredInvalidSpanConstants) return invalidSpanConstants;
  hasRequiredInvalidSpanConstants = 1;
  (function(exports$1) {
    Object.defineProperty(exports$1, "__esModule", { value: true });
    exports$1.INVALID_SPAN_CONTEXT = exports$1.INVALID_TRACEID = exports$1.INVALID_SPANID = void 0;
    const trace_flags_1 = /* @__PURE__ */ requireTrace_flags();
    exports$1.INVALID_SPANID = "0000000000000000";
    exports$1.INVALID_TRACEID = "00000000000000000000000000000000";
    exports$1.INVALID_SPAN_CONTEXT = {
      traceId: exports$1.INVALID_TRACEID,
      spanId: exports$1.INVALID_SPANID,
      traceFlags: trace_flags_1.TraceFlags.NONE
    };
  })(invalidSpanConstants);
  return invalidSpanConstants;
}
var hasRequiredNonRecordingSpan;
function requireNonRecordingSpan() {
  if (hasRequiredNonRecordingSpan) return NonRecordingSpan;
  hasRequiredNonRecordingSpan = 1;
  Object.defineProperty(NonRecordingSpan, "__esModule", { value: true });
  NonRecordingSpan.NonRecordingSpan = void 0;
  const invalid_span_constants_1 = /* @__PURE__ */ requireInvalidSpanConstants();
  let NonRecordingSpan$1 = class NonRecordingSpan {
    constructor(spanContext = invalid_span_constants_1.INVALID_SPAN_CONTEXT) {
      this._spanContext = spanContext;
    }
    // Returns a SpanContext.
    spanContext() {
      return this._spanContext;
    }
    // By default does nothing
    setAttribute(_key, _value) {
      return this;
    }
    // By default does nothing
    setAttributes(_attributes) {
      return this;
    }
    // By default does nothing
    addEvent(_name, _attributes) {
      return this;
    }
    addLink(_link) {
      return this;
    }
    addLinks(_links) {
      return this;
    }
    // By default does nothing
    setStatus(_status) {
      return this;
    }
    // By default does nothing
    updateName(_name) {
      return this;
    }
    // By default does nothing
    end(_endTime) {
    }
    // isRecording always returns false for NonRecordingSpan.
    isRecording() {
      return false;
    }
    // By default does nothing
    recordException(_exception, _time) {
    }
  };
  NonRecordingSpan.NonRecordingSpan = NonRecordingSpan$1;
  return NonRecordingSpan;
}
var hasRequiredContextUtils;
function requireContextUtils() {
  if (hasRequiredContextUtils) return contextUtils;
  hasRequiredContextUtils = 1;
  Object.defineProperty(contextUtils, "__esModule", { value: true });
  contextUtils.getSpanContext = contextUtils.setSpanContext = contextUtils.deleteSpan = contextUtils.setSpan = contextUtils.getActiveSpan = contextUtils.getSpan = void 0;
  const context_1 = /* @__PURE__ */ requireContext$1();
  const NonRecordingSpan_1 = /* @__PURE__ */ requireNonRecordingSpan();
  const context_2 = /* @__PURE__ */ requireContext();
  const SPAN_KEY = (0, context_1.createContextKey)("OpenTelemetry Context Key SPAN");
  function getSpan(context2) {
    return context2.getValue(SPAN_KEY) || void 0;
  }
  contextUtils.getSpan = getSpan;
  function getActiveSpan() {
    return getSpan(context_2.ContextAPI.getInstance().active());
  }
  contextUtils.getActiveSpan = getActiveSpan;
  function setSpan(context2, span) {
    return context2.setValue(SPAN_KEY, span);
  }
  contextUtils.setSpan = setSpan;
  function deleteSpan(context2) {
    return context2.deleteValue(SPAN_KEY);
  }
  contextUtils.deleteSpan = deleteSpan;
  function setSpanContext(context2, spanContext) {
    return setSpan(context2, new NonRecordingSpan_1.NonRecordingSpan(spanContext));
  }
  contextUtils.setSpanContext = setSpanContext;
  function getSpanContext(context2) {
    var _a;
    return (_a = getSpan(context2)) === null || _a === void 0 ? void 0 : _a.spanContext();
  }
  contextUtils.getSpanContext = getSpanContext;
  return contextUtils;
}
var spancontextUtils = {};
var hasRequiredSpancontextUtils;
function requireSpancontextUtils() {
  if (hasRequiredSpancontextUtils) return spancontextUtils;
  hasRequiredSpancontextUtils = 1;
  Object.defineProperty(spancontextUtils, "__esModule", { value: true });
  spancontextUtils.wrapSpanContext = spancontextUtils.isSpanContextValid = spancontextUtils.isValidSpanId = spancontextUtils.isValidTraceId = void 0;
  const invalid_span_constants_1 = /* @__PURE__ */ requireInvalidSpanConstants();
  const NonRecordingSpan_1 = /* @__PURE__ */ requireNonRecordingSpan();
  const isHex = new Uint8Array([
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1
  ]);
  function isValidHex(id, length) {
    if (typeof id !== "string" || id.length !== length)
      return false;
    let r = 0;
    for (let i = 0; i < id.length; i += 4) {
      r += (isHex[id.charCodeAt(i)] | 0) + (isHex[id.charCodeAt(i + 1)] | 0) + (isHex[id.charCodeAt(i + 2)] | 0) + (isHex[id.charCodeAt(i + 3)] | 0);
    }
    return r === length;
  }
  function isValidTraceId(traceId) {
    return isValidHex(traceId, 32) && traceId !== invalid_span_constants_1.INVALID_TRACEID;
  }
  spancontextUtils.isValidTraceId = isValidTraceId;
  function isValidSpanId(spanId) {
    return isValidHex(spanId, 16) && spanId !== invalid_span_constants_1.INVALID_SPANID;
  }
  spancontextUtils.isValidSpanId = isValidSpanId;
  function isSpanContextValid(spanContext) {
    return isValidTraceId(spanContext.traceId) && isValidSpanId(spanContext.spanId);
  }
  spancontextUtils.isSpanContextValid = isSpanContextValid;
  function wrapSpanContext(spanContext) {
    return new NonRecordingSpan_1.NonRecordingSpan(spanContext);
  }
  spancontextUtils.wrapSpanContext = wrapSpanContext;
  return spancontextUtils;
}
var hasRequiredNoopTracer;
function requireNoopTracer() {
  if (hasRequiredNoopTracer) return NoopTracer;
  hasRequiredNoopTracer = 1;
  Object.defineProperty(NoopTracer, "__esModule", { value: true });
  NoopTracer.NoopTracer = void 0;
  const context_1 = /* @__PURE__ */ requireContext();
  const context_utils_1 = /* @__PURE__ */ requireContextUtils();
  const NonRecordingSpan_1 = /* @__PURE__ */ requireNonRecordingSpan();
  const spancontext_utils_1 = /* @__PURE__ */ requireSpancontextUtils();
  const contextApi2 = context_1.ContextAPI.getInstance();
  let NoopTracer$1 = class NoopTracer {
    // startSpan starts a noop span.
    startSpan(name, options, context2 = contextApi2.active()) {
      const root = Boolean(options === null || options === void 0 ? void 0 : options.root);
      if (root) {
        return new NonRecordingSpan_1.NonRecordingSpan();
      }
      const parentFromContext = context2 && (0, context_utils_1.getSpanContext)(context2);
      if (isSpanContext(parentFromContext) && (0, spancontext_utils_1.isSpanContextValid)(parentFromContext)) {
        return new NonRecordingSpan_1.NonRecordingSpan(parentFromContext);
      } else {
        return new NonRecordingSpan_1.NonRecordingSpan();
      }
    }
    startActiveSpan(name, arg2, arg3, arg4) {
      let opts;
      let ctx;
      let fn;
      if (arguments.length < 2) {
        return;
      } else if (arguments.length === 2) {
        fn = arg2;
      } else if (arguments.length === 3) {
        opts = arg2;
        fn = arg3;
      } else {
        opts = arg2;
        ctx = arg3;
        fn = arg4;
      }
      const parentContext = ctx !== null && ctx !== void 0 ? ctx : contextApi2.active();
      const span = this.startSpan(name, opts, parentContext);
      const contextWithSpanSet = (0, context_utils_1.setSpan)(parentContext, span);
      return contextApi2.with(contextWithSpanSet, fn, void 0, span);
    }
  };
  NoopTracer.NoopTracer = NoopTracer$1;
  function isSpanContext(spanContext) {
    return spanContext !== null && typeof spanContext === "object" && "spanId" in spanContext && typeof spanContext["spanId"] === "string" && "traceId" in spanContext && typeof spanContext["traceId"] === "string" && "traceFlags" in spanContext && typeof spanContext["traceFlags"] === "number";
  }
  return NoopTracer;
}
var hasRequiredProxyTracer;
function requireProxyTracer() {
  if (hasRequiredProxyTracer) return ProxyTracer;
  hasRequiredProxyTracer = 1;
  Object.defineProperty(ProxyTracer, "__esModule", { value: true });
  ProxyTracer.ProxyTracer = void 0;
  const NoopTracer_1 = /* @__PURE__ */ requireNoopTracer();
  const NOOP_TRACER = new NoopTracer_1.NoopTracer();
  let ProxyTracer$1 = class ProxyTracer {
    constructor(provider, name, version2, options) {
      this._provider = provider;
      this.name = name;
      this.version = version2;
      this.options = options;
    }
    startSpan(name, options, context2) {
      return this._getTracer().startSpan(name, options, context2);
    }
    startActiveSpan(_name, _options, _context, _fn) {
      const tracer = this._getTracer();
      return Reflect.apply(tracer.startActiveSpan, tracer, arguments);
    }
    /**
     * Try to get a tracer from the proxy tracer provider.
     * If the proxy tracer provider has no delegate, return a noop tracer.
     */
    _getTracer() {
      if (this._delegate) {
        return this._delegate;
      }
      const tracer = this._provider.getDelegateTracer(this.name, this.version, this.options);
      if (!tracer) {
        return NOOP_TRACER;
      }
      this._delegate = tracer;
      return this._delegate;
    }
  };
  ProxyTracer.ProxyTracer = ProxyTracer$1;
  return ProxyTracer;
}
var ProxyTracerProvider = {};
var NoopTracerProvider = {};
var hasRequiredNoopTracerProvider;
function requireNoopTracerProvider() {
  if (hasRequiredNoopTracerProvider) return NoopTracerProvider;
  hasRequiredNoopTracerProvider = 1;
  Object.defineProperty(NoopTracerProvider, "__esModule", { value: true });
  NoopTracerProvider.NoopTracerProvider = void 0;
  const NoopTracer_1 = /* @__PURE__ */ requireNoopTracer();
  let NoopTracerProvider$1 = class NoopTracerProvider {
    getTracer(_name, _version, _options) {
      return new NoopTracer_1.NoopTracer();
    }
  };
  NoopTracerProvider.NoopTracerProvider = NoopTracerProvider$1;
  return NoopTracerProvider;
}
var hasRequiredProxyTracerProvider;
function requireProxyTracerProvider() {
  if (hasRequiredProxyTracerProvider) return ProxyTracerProvider;
  hasRequiredProxyTracerProvider = 1;
  Object.defineProperty(ProxyTracerProvider, "__esModule", { value: true });
  ProxyTracerProvider.ProxyTracerProvider = void 0;
  const ProxyTracer_1 = /* @__PURE__ */ requireProxyTracer();
  const NoopTracerProvider_1 = /* @__PURE__ */ requireNoopTracerProvider();
  const NOOP_TRACER_PROVIDER = new NoopTracerProvider_1.NoopTracerProvider();
  let ProxyTracerProvider$1 = class ProxyTracerProvider {
    /**
     * Get a {@link ProxyTracer}
     */
    getTracer(name, version2, options) {
      var _a;
      return (_a = this.getDelegateTracer(name, version2, options)) !== null && _a !== void 0 ? _a : new ProxyTracer_1.ProxyTracer(this, name, version2, options);
    }
    getDelegate() {
      var _a;
      return (_a = this._delegate) !== null && _a !== void 0 ? _a : NOOP_TRACER_PROVIDER;
    }
    /**
     * Set the delegate tracer provider
     */
    setDelegate(delegate) {
      this._delegate = delegate;
    }
    getDelegateTracer(name, version2, options) {
      var _a;
      return (_a = this._delegate) === null || _a === void 0 ? void 0 : _a.getTracer(name, version2, options);
    }
  };
  ProxyTracerProvider.ProxyTracerProvider = ProxyTracerProvider$1;
  return ProxyTracerProvider;
}
var SamplingResult = {};
var hasRequiredSamplingResult;
function requireSamplingResult() {
  if (hasRequiredSamplingResult) return SamplingResult;
  hasRequiredSamplingResult = 1;
  (function(exports$1) {
    Object.defineProperty(exports$1, "__esModule", { value: true });
    exports$1.SamplingDecision = void 0;
    (function(SamplingDecision) {
      SamplingDecision[SamplingDecision["NOT_RECORD"] = 0] = "NOT_RECORD";
      SamplingDecision[SamplingDecision["RECORD"] = 1] = "RECORD";
      SamplingDecision[SamplingDecision["RECORD_AND_SAMPLED"] = 2] = "RECORD_AND_SAMPLED";
    })(exports$1.SamplingDecision || (exports$1.SamplingDecision = {}));
  })(SamplingResult);
  return SamplingResult;
}
var span_kind = {};
var hasRequiredSpan_kind;
function requireSpan_kind() {
  if (hasRequiredSpan_kind) return span_kind;
  hasRequiredSpan_kind = 1;
  (function(exports$1) {
    Object.defineProperty(exports$1, "__esModule", { value: true });
    exports$1.SpanKind = void 0;
    (function(SpanKind) {
      SpanKind[SpanKind["INTERNAL"] = 0] = "INTERNAL";
      SpanKind[SpanKind["SERVER"] = 1] = "SERVER";
      SpanKind[SpanKind["CLIENT"] = 2] = "CLIENT";
      SpanKind[SpanKind["PRODUCER"] = 3] = "PRODUCER";
      SpanKind[SpanKind["CONSUMER"] = 4] = "CONSUMER";
    })(exports$1.SpanKind || (exports$1.SpanKind = {}));
  })(span_kind);
  return span_kind;
}
var status = {};
var hasRequiredStatus;
function requireStatus() {
  if (hasRequiredStatus) return status;
  hasRequiredStatus = 1;
  (function(exports$1) {
    Object.defineProperty(exports$1, "__esModule", { value: true });
    exports$1.SpanStatusCode = void 0;
    (function(SpanStatusCode) {
      SpanStatusCode[SpanStatusCode["UNSET"] = 0] = "UNSET";
      SpanStatusCode[SpanStatusCode["OK"] = 1] = "OK";
      SpanStatusCode[SpanStatusCode["ERROR"] = 2] = "ERROR";
    })(exports$1.SpanStatusCode || (exports$1.SpanStatusCode = {}));
  })(status);
  return status;
}
var utils = {};
var tracestateImpl = {};
var tracestateValidators = {};
var hasRequiredTracestateValidators;
function requireTracestateValidators() {
  if (hasRequiredTracestateValidators) return tracestateValidators;
  hasRequiredTracestateValidators = 1;
  Object.defineProperty(tracestateValidators, "__esModule", { value: true });
  tracestateValidators.validateValue = tracestateValidators.validateKey = void 0;
  const VALID_KEY_CHAR_RANGE = "[_0-9a-z-*/]";
  const VALID_KEY = `[a-z]${VALID_KEY_CHAR_RANGE}{0,255}`;
  const VALID_VENDOR_KEY = `[a-z0-9]${VALID_KEY_CHAR_RANGE}{0,240}@[a-z]${VALID_KEY_CHAR_RANGE}{0,13}`;
  const VALID_KEY_REGEX = new RegExp(`^(?:${VALID_KEY}|${VALID_VENDOR_KEY})$`);
  const VALID_VALUE_BASE_REGEX = /^[ -~]{0,255}[!-~]$/;
  const INVALID_VALUE_COMMA_EQUAL_REGEX = /,|=/;
  function validateKey(key) {
    return VALID_KEY_REGEX.test(key);
  }
  tracestateValidators.validateKey = validateKey;
  function validateValue(value) {
    return VALID_VALUE_BASE_REGEX.test(value) && !INVALID_VALUE_COMMA_EQUAL_REGEX.test(value);
  }
  tracestateValidators.validateValue = validateValue;
  return tracestateValidators;
}
var hasRequiredTracestateImpl;
function requireTracestateImpl() {
  if (hasRequiredTracestateImpl) return tracestateImpl;
  hasRequiredTracestateImpl = 1;
  Object.defineProperty(tracestateImpl, "__esModule", { value: true });
  tracestateImpl.TraceStateImpl = void 0;
  const tracestate_validators_1 = /* @__PURE__ */ requireTracestateValidators();
  const MAX_TRACE_STATE_ITEMS = 32;
  const MAX_TRACE_STATE_LEN = 512;
  const LIST_MEMBERS_SEPARATOR = ",";
  const LIST_MEMBER_KEY_VALUE_SPLITTER = "=";
  class TraceStateImpl {
    constructor(rawTraceState) {
      this._internalState = /* @__PURE__ */ new Map();
      if (rawTraceState)
        this._parse(rawTraceState);
    }
    set(key, value) {
      const traceState = this._clone();
      if (traceState._internalState.has(key)) {
        traceState._internalState.delete(key);
      }
      traceState._internalState.set(key, value);
      return traceState;
    }
    unset(key) {
      const traceState = this._clone();
      traceState._internalState.delete(key);
      return traceState;
    }
    get(key) {
      return this._internalState.get(key);
    }
    serialize() {
      return Array.from(this._internalState.keys()).reduceRight((agg, key) => {
        agg.push(key + LIST_MEMBER_KEY_VALUE_SPLITTER + this.get(key));
        return agg;
      }, []).join(LIST_MEMBERS_SEPARATOR);
    }
    _parse(rawTraceState) {
      if (rawTraceState.length > MAX_TRACE_STATE_LEN)
        return;
      this._internalState = rawTraceState.split(LIST_MEMBERS_SEPARATOR).reduceRight((agg, part) => {
        const listMember = part.trim();
        const i = listMember.indexOf(LIST_MEMBER_KEY_VALUE_SPLITTER);
        if (i !== -1) {
          const key = listMember.slice(0, i);
          const value = listMember.slice(i + 1, part.length);
          if ((0, tracestate_validators_1.validateKey)(key) && (0, tracestate_validators_1.validateValue)(value)) {
            agg.set(key, value);
          }
        }
        return agg;
      }, /* @__PURE__ */ new Map());
      if (this._internalState.size > MAX_TRACE_STATE_ITEMS) {
        this._internalState = new Map(Array.from(this._internalState.entries()).reverse().slice(0, MAX_TRACE_STATE_ITEMS));
      }
    }
    // @ts-expect-error TS6133 Accessed in tests only.
    _keys() {
      return Array.from(this._internalState.keys()).reverse();
    }
    _clone() {
      const traceState = new TraceStateImpl();
      traceState._internalState = new Map(this._internalState);
      return traceState;
    }
  }
  tracestateImpl.TraceStateImpl = TraceStateImpl;
  return tracestateImpl;
}
var hasRequiredUtils;
function requireUtils() {
  if (hasRequiredUtils) return utils;
  hasRequiredUtils = 1;
  Object.defineProperty(utils, "__esModule", { value: true });
  utils.createTraceState = void 0;
  const tracestate_impl_1 = /* @__PURE__ */ requireTracestateImpl();
  function createTraceState(rawTraceState) {
    return new tracestate_impl_1.TraceStateImpl(rawTraceState);
  }
  utils.createTraceState = createTraceState;
  return utils;
}
var contextApi = {};
var hasRequiredContextApi;
function requireContextApi() {
  if (hasRequiredContextApi) return contextApi;
  hasRequiredContextApi = 1;
  Object.defineProperty(contextApi, "__esModule", { value: true });
  contextApi.context = void 0;
  const context_1 = /* @__PURE__ */ requireContext();
  contextApi.context = context_1.ContextAPI.getInstance();
  return contextApi;
}
var diagApi = {};
var hasRequiredDiagApi;
function requireDiagApi() {
  if (hasRequiredDiagApi) return diagApi;
  hasRequiredDiagApi = 1;
  Object.defineProperty(diagApi, "__esModule", { value: true });
  diagApi.diag = void 0;
  const diag_1 = /* @__PURE__ */ requireDiag();
  diagApi.diag = diag_1.DiagAPI.instance();
  return diagApi;
}
var metricsApi = {};
var metrics = {};
var NoopMeterProvider = {};
var hasRequiredNoopMeterProvider;
function requireNoopMeterProvider() {
  if (hasRequiredNoopMeterProvider) return NoopMeterProvider;
  hasRequiredNoopMeterProvider = 1;
  Object.defineProperty(NoopMeterProvider, "__esModule", { value: true });
  NoopMeterProvider.NOOP_METER_PROVIDER = NoopMeterProvider.NoopMeterProvider = void 0;
  const NoopMeter_1 = /* @__PURE__ */ requireNoopMeter();
  let NoopMeterProvider$1 = class NoopMeterProvider {
    getMeter(_name, _version, _options) {
      return NoopMeter_1.NOOP_METER;
    }
  };
  NoopMeterProvider.NoopMeterProvider = NoopMeterProvider$1;
  NoopMeterProvider.NOOP_METER_PROVIDER = new NoopMeterProvider$1();
  return NoopMeterProvider;
}
var hasRequiredMetrics;
function requireMetrics() {
  if (hasRequiredMetrics) return metrics;
  hasRequiredMetrics = 1;
  Object.defineProperty(metrics, "__esModule", { value: true });
  metrics.MetricsAPI = void 0;
  const NoopMeterProvider_1 = /* @__PURE__ */ requireNoopMeterProvider();
  const global_utils_1 = /* @__PURE__ */ requireGlobalUtils();
  const diag_1 = /* @__PURE__ */ requireDiag();
  const API_NAME = "metrics";
  class MetricsAPI {
    /** Empty private constructor prevents end users from constructing a new instance of the API */
    constructor() {
    }
    /** Get the singleton instance of the Metrics API */
    static getInstance() {
      if (!this._instance) {
        this._instance = new MetricsAPI();
      }
      return this._instance;
    }
    /**
     * Set the current global meter provider.
     * Returns true if the meter provider was successfully registered, else false.
     */
    setGlobalMeterProvider(provider) {
      return (0, global_utils_1.registerGlobal)(API_NAME, provider, diag_1.DiagAPI.instance());
    }
    /**
     * Returns the global meter provider.
     */
    getMeterProvider() {
      return (0, global_utils_1.getGlobal)(API_NAME) || NoopMeterProvider_1.NOOP_METER_PROVIDER;
    }
    /**
     * Returns a meter from the global meter provider.
     */
    getMeter(name, version2, options) {
      return this.getMeterProvider().getMeter(name, version2, options);
    }
    /** Remove the global meter provider */
    disable() {
      (0, global_utils_1.unregisterGlobal)(API_NAME, diag_1.DiagAPI.instance());
    }
  }
  metrics.MetricsAPI = MetricsAPI;
  return metrics;
}
var hasRequiredMetricsApi;
function requireMetricsApi() {
  if (hasRequiredMetricsApi) return metricsApi;
  hasRequiredMetricsApi = 1;
  Object.defineProperty(metricsApi, "__esModule", { value: true });
  metricsApi.metrics = void 0;
  const metrics_1 = /* @__PURE__ */ requireMetrics();
  metricsApi.metrics = metrics_1.MetricsAPI.getInstance();
  return metricsApi;
}
var propagationApi = {};
var propagation = {};
var NoopTextMapPropagator = {};
var hasRequiredNoopTextMapPropagator;
function requireNoopTextMapPropagator() {
  if (hasRequiredNoopTextMapPropagator) return NoopTextMapPropagator;
  hasRequiredNoopTextMapPropagator = 1;
  Object.defineProperty(NoopTextMapPropagator, "__esModule", { value: true });
  NoopTextMapPropagator.NoopTextMapPropagator = void 0;
  let NoopTextMapPropagator$1 = class NoopTextMapPropagator {
    /** Noop inject function does nothing */
    inject(_context, _carrier) {
    }
    /** Noop extract function does nothing and returns the input context */
    extract(context2, _carrier) {
      return context2;
    }
    fields() {
      return [];
    }
  };
  NoopTextMapPropagator.NoopTextMapPropagator = NoopTextMapPropagator$1;
  return NoopTextMapPropagator;
}
var contextHelpers = {};
var hasRequiredContextHelpers;
function requireContextHelpers() {
  if (hasRequiredContextHelpers) return contextHelpers;
  hasRequiredContextHelpers = 1;
  Object.defineProperty(contextHelpers, "__esModule", { value: true });
  contextHelpers.deleteBaggage = contextHelpers.setBaggage = contextHelpers.getActiveBaggage = contextHelpers.getBaggage = void 0;
  const context_1 = /* @__PURE__ */ requireContext();
  const context_2 = /* @__PURE__ */ requireContext$1();
  const BAGGAGE_KEY = (0, context_2.createContextKey)("OpenTelemetry Baggage Key");
  function getBaggage(context2) {
    return context2.getValue(BAGGAGE_KEY) || void 0;
  }
  contextHelpers.getBaggage = getBaggage;
  function getActiveBaggage() {
    return getBaggage(context_1.ContextAPI.getInstance().active());
  }
  contextHelpers.getActiveBaggage = getActiveBaggage;
  function setBaggage(context2, baggage) {
    return context2.setValue(BAGGAGE_KEY, baggage);
  }
  contextHelpers.setBaggage = setBaggage;
  function deleteBaggage(context2) {
    return context2.deleteValue(BAGGAGE_KEY);
  }
  contextHelpers.deleteBaggage = deleteBaggage;
  return contextHelpers;
}
var hasRequiredPropagation;
function requirePropagation() {
  if (hasRequiredPropagation) return propagation;
  hasRequiredPropagation = 1;
  Object.defineProperty(propagation, "__esModule", { value: true });
  propagation.PropagationAPI = void 0;
  const global_utils_1 = /* @__PURE__ */ requireGlobalUtils();
  const NoopTextMapPropagator_1 = /* @__PURE__ */ requireNoopTextMapPropagator();
  const TextMapPropagator_1 = /* @__PURE__ */ requireTextMapPropagator();
  const context_helpers_1 = /* @__PURE__ */ requireContextHelpers();
  const utils_1 = /* @__PURE__ */ requireUtils$1();
  const diag_1 = /* @__PURE__ */ requireDiag();
  const API_NAME = "propagation";
  const NOOP_TEXT_MAP_PROPAGATOR = new NoopTextMapPropagator_1.NoopTextMapPropagator();
  class PropagationAPI {
    /** Empty private constructor prevents end users from constructing a new instance of the API */
    constructor() {
      this.createBaggage = utils_1.createBaggage;
      this.getBaggage = context_helpers_1.getBaggage;
      this.getActiveBaggage = context_helpers_1.getActiveBaggage;
      this.setBaggage = context_helpers_1.setBaggage;
      this.deleteBaggage = context_helpers_1.deleteBaggage;
    }
    /** Get the singleton instance of the Propagator API */
    static getInstance() {
      if (!this._instance) {
        this._instance = new PropagationAPI();
      }
      return this._instance;
    }
    /**
     * Set the current propagator.
     *
     * @returns true if the propagator was successfully registered, else false
     */
    setGlobalPropagator(propagator) {
      return (0, global_utils_1.registerGlobal)(API_NAME, propagator, diag_1.DiagAPI.instance());
    }
    /**
     * Inject context into a carrier to be propagated inter-process
     *
     * @param context Context carrying tracing data to inject
     * @param carrier carrier to inject context into
     * @param setter Function used to set values on the carrier
     */
    inject(context2, carrier, setter = TextMapPropagator_1.defaultTextMapSetter) {
      return this._getGlobalPropagator().inject(context2, carrier, setter);
    }
    /**
     * Extract context from a carrier
     *
     * @param context Context which the newly created context will inherit from
     * @param carrier Carrier to extract context from
     * @param getter Function used to extract keys from a carrier
     */
    extract(context2, carrier, getter = TextMapPropagator_1.defaultTextMapGetter) {
      return this._getGlobalPropagator().extract(context2, carrier, getter);
    }
    /**
     * Return a list of all fields which may be used by the propagator.
     */
    fields() {
      return this._getGlobalPropagator().fields();
    }
    /** Remove the global propagator */
    disable() {
      (0, global_utils_1.unregisterGlobal)(API_NAME, diag_1.DiagAPI.instance());
    }
    _getGlobalPropagator() {
      return (0, global_utils_1.getGlobal)(API_NAME) || NOOP_TEXT_MAP_PROPAGATOR;
    }
  }
  propagation.PropagationAPI = PropagationAPI;
  return propagation;
}
var hasRequiredPropagationApi;
function requirePropagationApi() {
  if (hasRequiredPropagationApi) return propagationApi;
  hasRequiredPropagationApi = 1;
  Object.defineProperty(propagationApi, "__esModule", { value: true });
  propagationApi.propagation = void 0;
  const propagation_1 = /* @__PURE__ */ requirePropagation();
  propagationApi.propagation = propagation_1.PropagationAPI.getInstance();
  return propagationApi;
}
var traceApi = {};
var trace = {};
var hasRequiredTrace;
function requireTrace() {
  if (hasRequiredTrace) return trace;
  hasRequiredTrace = 1;
  Object.defineProperty(trace, "__esModule", { value: true });
  trace.TraceAPI = void 0;
  const global_utils_1 = /* @__PURE__ */ requireGlobalUtils();
  const ProxyTracerProvider_1 = /* @__PURE__ */ requireProxyTracerProvider();
  const spancontext_utils_1 = /* @__PURE__ */ requireSpancontextUtils();
  const context_utils_1 = /* @__PURE__ */ requireContextUtils();
  const diag_1 = /* @__PURE__ */ requireDiag();
  const API_NAME = "trace";
  class TraceAPI {
    /** Empty private constructor prevents end users from constructing a new instance of the API */
    constructor() {
      this._proxyTracerProvider = new ProxyTracerProvider_1.ProxyTracerProvider();
      this.wrapSpanContext = spancontext_utils_1.wrapSpanContext;
      this.isSpanContextValid = spancontext_utils_1.isSpanContextValid;
      this.deleteSpan = context_utils_1.deleteSpan;
      this.getSpan = context_utils_1.getSpan;
      this.getActiveSpan = context_utils_1.getActiveSpan;
      this.getSpanContext = context_utils_1.getSpanContext;
      this.setSpan = context_utils_1.setSpan;
      this.setSpanContext = context_utils_1.setSpanContext;
    }
    /** Get the singleton instance of the Trace API */
    static getInstance() {
      if (!this._instance) {
        this._instance = new TraceAPI();
      }
      return this._instance;
    }
    /**
     * Set the current global tracer.
     *
     * @returns true if the tracer provider was successfully registered, else false
     */
    setGlobalTracerProvider(provider) {
      const success = (0, global_utils_1.registerGlobal)(API_NAME, this._proxyTracerProvider, diag_1.DiagAPI.instance());
      if (success) {
        this._proxyTracerProvider.setDelegate(provider);
      }
      return success;
    }
    /**
     * Returns the global tracer provider.
     */
    getTracerProvider() {
      return (0, global_utils_1.getGlobal)(API_NAME) || this._proxyTracerProvider;
    }
    /**
     * Returns a tracer from the global tracer provider.
     */
    getTracer(name, version2) {
      return this.getTracerProvider().getTracer(name, version2);
    }
    /** Remove the global tracer provider */
    disable() {
      (0, global_utils_1.unregisterGlobal)(API_NAME, diag_1.DiagAPI.instance());
      this._proxyTracerProvider = new ProxyTracerProvider_1.ProxyTracerProvider();
    }
  }
  trace.TraceAPI = TraceAPI;
  return trace;
}
var hasRequiredTraceApi;
function requireTraceApi() {
  if (hasRequiredTraceApi) return traceApi;
  hasRequiredTraceApi = 1;
  Object.defineProperty(traceApi, "__esModule", { value: true });
  traceApi.trace = void 0;
  const trace_1 = /* @__PURE__ */ requireTrace();
  traceApi.trace = trace_1.TraceAPI.getInstance();
  return traceApi;
}
var hasRequiredSrc;
function requireSrc() {
  if (hasRequiredSrc) return src;
  hasRequiredSrc = 1;
  (function(exports$1) {
    Object.defineProperty(exports$1, "__esModule", { value: true });
    exports$1.trace = exports$1.propagation = exports$1.metrics = exports$1.diag = exports$1.context = exports$1.INVALID_SPAN_CONTEXT = exports$1.INVALID_TRACEID = exports$1.INVALID_SPANID = exports$1.isValidSpanId = exports$1.isValidTraceId = exports$1.isSpanContextValid = exports$1.createTraceState = exports$1.TraceFlags = exports$1.SpanStatusCode = exports$1.SpanKind = exports$1.SamplingDecision = exports$1.ProxyTracerProvider = exports$1.ProxyTracer = exports$1.defaultTextMapSetter = exports$1.defaultTextMapGetter = exports$1.ValueType = exports$1.createNoopMeter = exports$1.DiagLogLevel = exports$1.DiagConsoleLogger = exports$1.ROOT_CONTEXT = exports$1.createContextKey = exports$1.baggageEntryMetadataFromString = void 0;
    var utils_1 = /* @__PURE__ */ requireUtils$1();
    Object.defineProperty(exports$1, "baggageEntryMetadataFromString", { enumerable: true, get: function() {
      return utils_1.baggageEntryMetadataFromString;
    } });
    var context_1 = /* @__PURE__ */ requireContext$1();
    Object.defineProperty(exports$1, "createContextKey", { enumerable: true, get: function() {
      return context_1.createContextKey;
    } });
    Object.defineProperty(exports$1, "ROOT_CONTEXT", { enumerable: true, get: function() {
      return context_1.ROOT_CONTEXT;
    } });
    var consoleLogger_1 = /* @__PURE__ */ requireConsoleLogger();
    Object.defineProperty(exports$1, "DiagConsoleLogger", { enumerable: true, get: function() {
      return consoleLogger_1.DiagConsoleLogger;
    } });
    var types_1 = /* @__PURE__ */ requireTypes();
    Object.defineProperty(exports$1, "DiagLogLevel", { enumerable: true, get: function() {
      return types_1.DiagLogLevel;
    } });
    var NoopMeter_1 = /* @__PURE__ */ requireNoopMeter();
    Object.defineProperty(exports$1, "createNoopMeter", { enumerable: true, get: function() {
      return NoopMeter_1.createNoopMeter;
    } });
    var Metric_1 = /* @__PURE__ */ requireMetric();
    Object.defineProperty(exports$1, "ValueType", { enumerable: true, get: function() {
      return Metric_1.ValueType;
    } });
    var TextMapPropagator_1 = /* @__PURE__ */ requireTextMapPropagator();
    Object.defineProperty(exports$1, "defaultTextMapGetter", { enumerable: true, get: function() {
      return TextMapPropagator_1.defaultTextMapGetter;
    } });
    Object.defineProperty(exports$1, "defaultTextMapSetter", { enumerable: true, get: function() {
      return TextMapPropagator_1.defaultTextMapSetter;
    } });
    var ProxyTracer_1 = /* @__PURE__ */ requireProxyTracer();
    Object.defineProperty(exports$1, "ProxyTracer", { enumerable: true, get: function() {
      return ProxyTracer_1.ProxyTracer;
    } });
    var ProxyTracerProvider_1 = /* @__PURE__ */ requireProxyTracerProvider();
    Object.defineProperty(exports$1, "ProxyTracerProvider", { enumerable: true, get: function() {
      return ProxyTracerProvider_1.ProxyTracerProvider;
    } });
    var SamplingResult_1 = /* @__PURE__ */ requireSamplingResult();
    Object.defineProperty(exports$1, "SamplingDecision", { enumerable: true, get: function() {
      return SamplingResult_1.SamplingDecision;
    } });
    var span_kind_1 = /* @__PURE__ */ requireSpan_kind();
    Object.defineProperty(exports$1, "SpanKind", { enumerable: true, get: function() {
      return span_kind_1.SpanKind;
    } });
    var status_1 = /* @__PURE__ */ requireStatus();
    Object.defineProperty(exports$1, "SpanStatusCode", { enumerable: true, get: function() {
      return status_1.SpanStatusCode;
    } });
    var trace_flags_1 = /* @__PURE__ */ requireTrace_flags();
    Object.defineProperty(exports$1, "TraceFlags", { enumerable: true, get: function() {
      return trace_flags_1.TraceFlags;
    } });
    var utils_2 = /* @__PURE__ */ requireUtils();
    Object.defineProperty(exports$1, "createTraceState", { enumerable: true, get: function() {
      return utils_2.createTraceState;
    } });
    var spancontext_utils_1 = /* @__PURE__ */ requireSpancontextUtils();
    Object.defineProperty(exports$1, "isSpanContextValid", { enumerable: true, get: function() {
      return spancontext_utils_1.isSpanContextValid;
    } });
    Object.defineProperty(exports$1, "isValidTraceId", { enumerable: true, get: function() {
      return spancontext_utils_1.isValidTraceId;
    } });
    Object.defineProperty(exports$1, "isValidSpanId", { enumerable: true, get: function() {
      return spancontext_utils_1.isValidSpanId;
    } });
    var invalid_span_constants_1 = /* @__PURE__ */ requireInvalidSpanConstants();
    Object.defineProperty(exports$1, "INVALID_SPANID", { enumerable: true, get: function() {
      return invalid_span_constants_1.INVALID_SPANID;
    } });
    Object.defineProperty(exports$1, "INVALID_TRACEID", { enumerable: true, get: function() {
      return invalid_span_constants_1.INVALID_TRACEID;
    } });
    Object.defineProperty(exports$1, "INVALID_SPAN_CONTEXT", { enumerable: true, get: function() {
      return invalid_span_constants_1.INVALID_SPAN_CONTEXT;
    } });
    const context_api_1 = /* @__PURE__ */ requireContextApi();
    Object.defineProperty(exports$1, "context", { enumerable: true, get: function() {
      return context_api_1.context;
    } });
    const diag_api_1 = /* @__PURE__ */ requireDiagApi();
    Object.defineProperty(exports$1, "diag", { enumerable: true, get: function() {
      return diag_api_1.diag;
    } });
    const metrics_api_1 = /* @__PURE__ */ requireMetricsApi();
    Object.defineProperty(exports$1, "metrics", { enumerable: true, get: function() {
      return metrics_api_1.metrics;
    } });
    const propagation_api_1 = /* @__PURE__ */ requirePropagationApi();
    Object.defineProperty(exports$1, "propagation", { enumerable: true, get: function() {
      return propagation_api_1.propagation;
    } });
    const trace_api_1 = /* @__PURE__ */ requireTraceApi();
    Object.defineProperty(exports$1, "trace", { enumerable: true, get: function() {
      return trace_api_1.trace;
    } });
    exports$1.default = {
      context: context_api_1.context,
      diag: diag_api_1.diag,
      metrics: metrics_api_1.metrics,
      propagation: propagation_api_1.propagation,
      trace: trace_api_1.trace
    };
  })(src);
  return src;
}
var hasRequiredProcessCpuTotal;
function requireProcessCpuTotal() {
  if (hasRequiredProcessCpuTotal) return processCpuTotal.exports;
  hasRequiredProcessCpuTotal = 1;
  const OtelApi = /* @__PURE__ */ requireSrc();
  const Counter = requireCounter();
  const PROCESS_CPU_USER_SECONDS = "process_cpu_user_seconds_total";
  const PROCESS_CPU_SYSTEM_SECONDS = "process_cpu_system_seconds_total";
  const PROCESS_CPU_SECONDS = "process_cpu_seconds_total";
  processCpuTotal.exports = (registry2, config = {}) => {
    const registers = registry2 ? [registry2] : void 0;
    const namePrefix = config.prefix ? config.prefix : "";
    const labels = config.labels ? config.labels : {};
    const exemplars = config.enableExemplars ? config.enableExemplars : false;
    const labelNames = Object.keys(labels);
    let lastCpuUsage = process.cpuUsage();
    const cpuUserUsageCounter = new Counter({
      name: namePrefix + PROCESS_CPU_USER_SECONDS,
      help: "Total user CPU time spent in seconds.",
      enableExemplars: exemplars,
      registers,
      labelNames,
      // Use this one metric's `collect` to set all metrics' values.
      collect() {
        const cpuUsage = process.cpuUsage();
        const userUsageMicros = cpuUsage.user - lastCpuUsage.user;
        const systemUsageMicros = cpuUsage.system - lastCpuUsage.system;
        lastCpuUsage = cpuUsage;
        if (this.enableExemplars) {
          let exemplarLabels = {};
          const currentSpan = OtelApi.trace.getSpan(OtelApi.context.active());
          if (currentSpan) {
            exemplarLabels = {
              traceId: currentSpan.spanContext().traceId,
              spanId: currentSpan.spanContext().spanId
            };
          }
          cpuUserUsageCounter.inc({
            labels,
            value: userUsageMicros / 1e6,
            exemplarLabels
          });
          cpuSystemUsageCounter.inc({
            labels,
            value: systemUsageMicros / 1e6,
            exemplarLabels
          });
          cpuUsageCounter.inc({
            labels,
            value: (userUsageMicros + systemUsageMicros) / 1e6,
            exemplarLabels
          });
        } else {
          cpuUserUsageCounter.inc(labels, userUsageMicros / 1e6);
          cpuSystemUsageCounter.inc(labels, systemUsageMicros / 1e6);
          cpuUsageCounter.inc(
            labels,
            (userUsageMicros + systemUsageMicros) / 1e6
          );
        }
      }
    });
    const cpuSystemUsageCounter = new Counter({
      name: namePrefix + PROCESS_CPU_SYSTEM_SECONDS,
      help: "Total system CPU time spent in seconds.",
      enableExemplars: exemplars,
      registers,
      labelNames
    });
    const cpuUsageCounter = new Counter({
      name: namePrefix + PROCESS_CPU_SECONDS,
      help: "Total user and system CPU time spent in seconds.",
      enableExemplars: exemplars,
      registers,
      labelNames
    });
  };
  processCpuTotal.exports.metricNames = [
    PROCESS_CPU_USER_SECONDS,
    PROCESS_CPU_SYSTEM_SECONDS,
    PROCESS_CPU_SECONDS
  ];
  return processCpuTotal.exports;
}
var processStartTime = { exports: {} };
var hasRequiredProcessStartTime;
function requireProcessStartTime() {
  if (hasRequiredProcessStartTime) return processStartTime.exports;
  hasRequiredProcessStartTime = 1;
  const Gauge = requireGauge();
  const startInSeconds = Math.round(Date.now() / 1e3 - process.uptime());
  const PROCESS_START_TIME = "process_start_time_seconds";
  processStartTime.exports = (registry2, config = {}) => {
    const namePrefix = config.prefix ? config.prefix : "";
    const labels = config.labels ? config.labels : {};
    const labelNames = Object.keys(labels);
    new Gauge({
      name: namePrefix + PROCESS_START_TIME,
      help: "Start time of the process since unix epoch in seconds.",
      registers: registry2 ? [registry2] : void 0,
      labelNames,
      aggregator: "omit",
      collect() {
        this.set(labels, startInSeconds);
      }
    });
  };
  processStartTime.exports.metricNames = [PROCESS_START_TIME];
  return processStartTime.exports;
}
var osMemoryHeap = { exports: {} };
var osMemoryHeapLinux = { exports: {} };
var hasRequiredOsMemoryHeapLinux;
function requireOsMemoryHeapLinux() {
  if (hasRequiredOsMemoryHeapLinux) return osMemoryHeapLinux.exports;
  hasRequiredOsMemoryHeapLinux = 1;
  const Gauge = requireGauge();
  const fs2 = fs__default;
  const values = ["VmSize", "VmRSS", "VmData"];
  const PROCESS_RESIDENT_MEMORY = "process_resident_memory_bytes";
  const PROCESS_VIRTUAL_MEMORY = "process_virtual_memory_bytes";
  const PROCESS_HEAP = "process_heap_bytes";
  function structureOutput(input) {
    return input.split("\n").reduce((acc, string2) => {
      if (!values.some((value2) => string2.startsWith(value2))) {
        return acc;
      }
      const split = string2.split(":");
      let value = split[1].trim();
      value = value.substr(0, value.length - 3);
      value = Number(value) * 1024;
      acc[split[0]] = value;
      return acc;
    }, {});
  }
  osMemoryHeapLinux.exports = (registry2, config = {}) => {
    const registers = registry2 ? [registry2] : void 0;
    const namePrefix = config.prefix ? config.prefix : "";
    const labels = config.labels ? config.labels : {};
    const labelNames = Object.keys(labels);
    const residentMemGauge = new Gauge({
      name: namePrefix + PROCESS_RESIDENT_MEMORY,
      help: "Resident memory size in bytes.",
      registers,
      labelNames,
      // Use this one metric's `collect` to set all metrics' values.
      collect() {
        try {
          const stat = fs2.readFileSync("/proc/self/status", "utf8");
          const structuredOutput = structureOutput(stat);
          residentMemGauge.set(labels, structuredOutput.VmRSS);
          virtualMemGauge.set(labels, structuredOutput.VmSize);
          heapSizeMemGauge.set(labels, structuredOutput.VmData);
        } catch {
        }
      }
    });
    const virtualMemGauge = new Gauge({
      name: namePrefix + PROCESS_VIRTUAL_MEMORY,
      help: "Virtual memory size in bytes.",
      registers,
      labelNames
    });
    const heapSizeMemGauge = new Gauge({
      name: namePrefix + PROCESS_HEAP,
      help: "Process heap size in bytes.",
      registers,
      labelNames
    });
  };
  osMemoryHeapLinux.exports.metricNames = [
    PROCESS_RESIDENT_MEMORY,
    PROCESS_VIRTUAL_MEMORY,
    PROCESS_HEAP
  ];
  return osMemoryHeapLinux.exports;
}
var safeMemoryUsage_1;
var hasRequiredSafeMemoryUsage;
function requireSafeMemoryUsage() {
  if (hasRequiredSafeMemoryUsage) return safeMemoryUsage_1;
  hasRequiredSafeMemoryUsage = 1;
  function safeMemoryUsage() {
    try {
      return process.memoryUsage();
    } catch {
      return;
    }
  }
  safeMemoryUsage_1 = safeMemoryUsage;
  return safeMemoryUsage_1;
}
var hasRequiredOsMemoryHeap;
function requireOsMemoryHeap() {
  if (hasRequiredOsMemoryHeap) return osMemoryHeap.exports;
  hasRequiredOsMemoryHeap = 1;
  const Gauge = requireGauge();
  const linuxVariant = requireOsMemoryHeapLinux();
  const safeMemoryUsage = requireSafeMemoryUsage();
  const PROCESS_RESIDENT_MEMORY = "process_resident_memory_bytes";
  function notLinuxVariant(registry2, config = {}) {
    const namePrefix = config.prefix ? config.prefix : "";
    const labels = config.labels ? config.labels : {};
    const labelNames = Object.keys(labels);
    new Gauge({
      name: namePrefix + PROCESS_RESIDENT_MEMORY,
      help: "Resident memory size in bytes.",
      registers: registry2 ? [registry2] : void 0,
      labelNames,
      collect() {
        const memUsage = safeMemoryUsage();
        if (memUsage) {
          this.set(labels, memUsage.rss);
        }
      }
    });
  }
  osMemoryHeap.exports = (registry2, config) => process.platform === "linux" ? linuxVariant(registry2, config) : notLinuxVariant(registry2, config);
  osMemoryHeap.exports.metricNames = process.platform === "linux" ? linuxVariant.metricNames : [PROCESS_RESIDENT_MEMORY];
  return osMemoryHeap.exports;
}
var processOpenFileDescriptors = { exports: {} };
var hasRequiredProcessOpenFileDescriptors;
function requireProcessOpenFileDescriptors() {
  if (hasRequiredProcessOpenFileDescriptors) return processOpenFileDescriptors.exports;
  hasRequiredProcessOpenFileDescriptors = 1;
  const Gauge = requireGauge();
  const fs2 = fs__default;
  const process2 = require$$2;
  const PROCESS_OPEN_FDS = "process_open_fds";
  processOpenFileDescriptors.exports = (registry2, config = {}) => {
    if (process2.platform !== "linux") {
      return;
    }
    const namePrefix = config.prefix ? config.prefix : "";
    const labels = config.labels ? config.labels : {};
    const labelNames = Object.keys(labels);
    new Gauge({
      name: namePrefix + PROCESS_OPEN_FDS,
      help: "Number of open file descriptors.",
      registers: registry2 ? [registry2] : void 0,
      labelNames,
      collect() {
        try {
          const fds = fs2.readdirSync("/proc/self/fd");
          this.set(labels, fds.length - 1);
        } catch {
        }
      }
    });
  };
  processOpenFileDescriptors.exports.metricNames = [PROCESS_OPEN_FDS];
  return processOpenFileDescriptors.exports;
}
var processMaxFileDescriptors = { exports: {} };
var hasRequiredProcessMaxFileDescriptors;
function requireProcessMaxFileDescriptors() {
  if (hasRequiredProcessMaxFileDescriptors) return processMaxFileDescriptors.exports;
  hasRequiredProcessMaxFileDescriptors = 1;
  const Gauge = requireGauge();
  const fs2 = fs__default;
  const PROCESS_MAX_FDS = "process_max_fds";
  let maxFds;
  processMaxFileDescriptors.exports = (registry2, config = {}) => {
    if (maxFds === void 0) {
      try {
        const limits = fs2.readFileSync("/proc/self/limits", "utf8");
        const lines = limits.split("\n");
        for (const line of lines) {
          if (line.startsWith("Max open files")) {
            const parts = line.split(/  +/);
            maxFds = Number(parts[1]);
            break;
          }
        }
      } catch {
        return;
      }
    }
    if (maxFds === void 0) return;
    const namePrefix = config.prefix ? config.prefix : "";
    const labels = config.labels ? config.labels : {};
    const labelNames = Object.keys(labels);
    new Gauge({
      name: namePrefix + PROCESS_MAX_FDS,
      help: "Maximum number of open file descriptors.",
      registers: registry2 ? [registry2] : void 0,
      labelNames,
      collect() {
        if (maxFds !== void 0) this.set(labels, maxFds);
      }
    });
  };
  processMaxFileDescriptors.exports.metricNames = [PROCESS_MAX_FDS];
  return processMaxFileDescriptors.exports;
}
var eventLoopLag = { exports: {} };
var hasRequiredEventLoopLag;
function requireEventLoopLag() {
  if (hasRequiredEventLoopLag) return eventLoopLag.exports;
  hasRequiredEventLoopLag = 1;
  const Gauge = requireGauge();
  let perf_hooks;
  try {
    perf_hooks = require2("perf_hooks");
  } catch {
  }
  const NODEJS_EVENTLOOP_LAG = "nodejs_eventloop_lag_seconds";
  const NODEJS_EVENTLOOP_LAG_MIN = "nodejs_eventloop_lag_min_seconds";
  const NODEJS_EVENTLOOP_LAG_MAX = "nodejs_eventloop_lag_max_seconds";
  const NODEJS_EVENTLOOP_LAG_MEAN = "nodejs_eventloop_lag_mean_seconds";
  const NODEJS_EVENTLOOP_LAG_STDDEV = "nodejs_eventloop_lag_stddev_seconds";
  const NODEJS_EVENTLOOP_LAG_P50 = "nodejs_eventloop_lag_p50_seconds";
  const NODEJS_EVENTLOOP_LAG_P90 = "nodejs_eventloop_lag_p90_seconds";
  const NODEJS_EVENTLOOP_LAG_P99 = "nodejs_eventloop_lag_p99_seconds";
  function reportEventloopLag(start, gauge2, labels) {
    const delta = process.hrtime(start);
    const nanosec = delta[0] * 1e9 + delta[1];
    const seconds = nanosec / 1e9;
    gauge2.set(labels, seconds);
  }
  eventLoopLag.exports = (registry2, config = {}) => {
    const namePrefix = config.prefix ? config.prefix : "";
    const labels = config.labels ? config.labels : {};
    const labelNames = Object.keys(labels);
    const registers = registry2 ? [registry2] : void 0;
    let collect = () => {
      const start = process.hrtime();
      setImmediate(reportEventloopLag, start, lag, labels);
    };
    if (perf_hooks && perf_hooks.monitorEventLoopDelay) {
      try {
        const histogram2 = perf_hooks.monitorEventLoopDelay({
          resolution: config.eventLoopMonitoringPrecision
        });
        histogram2.enable();
        collect = () => {
          const start = process.hrtime();
          setImmediate(reportEventloopLag, start, lag, labels);
          lagMin.set(labels, histogram2.min / 1e9);
          lagMax.set(labels, histogram2.max / 1e9);
          lagMean.set(labels, histogram2.mean / 1e9);
          lagStddev.set(labels, histogram2.stddev / 1e9);
          lagP50.set(labels, histogram2.percentile(50) / 1e9);
          lagP90.set(labels, histogram2.percentile(90) / 1e9);
          lagP99.set(labels, histogram2.percentile(99) / 1e9);
          histogram2.reset();
        };
      } catch (e) {
        if (e.code === "ERR_NOT_IMPLEMENTED") {
          return;
        }
        throw e;
      }
    }
    const lag = new Gauge({
      name: namePrefix + NODEJS_EVENTLOOP_LAG,
      help: "Lag of event loop in seconds.",
      registers,
      labelNames,
      aggregator: "average",
      // Use this one metric's `collect` to set all metrics' values.
      collect
    });
    const lagMin = new Gauge({
      name: namePrefix + NODEJS_EVENTLOOP_LAG_MIN,
      help: "The minimum recorded event loop delay.",
      registers,
      labelNames,
      aggregator: "min"
    });
    const lagMax = new Gauge({
      name: namePrefix + NODEJS_EVENTLOOP_LAG_MAX,
      help: "The maximum recorded event loop delay.",
      registers,
      labelNames,
      aggregator: "max"
    });
    const lagMean = new Gauge({
      name: namePrefix + NODEJS_EVENTLOOP_LAG_MEAN,
      help: "The mean of the recorded event loop delays.",
      registers,
      labelNames,
      aggregator: "average"
    });
    const lagStddev = new Gauge({
      name: namePrefix + NODEJS_EVENTLOOP_LAG_STDDEV,
      help: "The standard deviation of the recorded event loop delays.",
      registers,
      labelNames,
      aggregator: "average"
    });
    const lagP50 = new Gauge({
      name: namePrefix + NODEJS_EVENTLOOP_LAG_P50,
      help: "The 50th percentile of the recorded event loop delays.",
      registers,
      labelNames,
      aggregator: "average"
    });
    const lagP90 = new Gauge({
      name: namePrefix + NODEJS_EVENTLOOP_LAG_P90,
      help: "The 90th percentile of the recorded event loop delays.",
      registers,
      labelNames,
      aggregator: "average"
    });
    const lagP99 = new Gauge({
      name: namePrefix + NODEJS_EVENTLOOP_LAG_P99,
      help: "The 99th percentile of the recorded event loop delays.",
      registers,
      labelNames,
      aggregator: "average"
    });
  };
  eventLoopLag.exports.metricNames = [
    NODEJS_EVENTLOOP_LAG,
    NODEJS_EVENTLOOP_LAG_MIN,
    NODEJS_EVENTLOOP_LAG_MAX,
    NODEJS_EVENTLOOP_LAG_MEAN,
    NODEJS_EVENTLOOP_LAG_STDDEV,
    NODEJS_EVENTLOOP_LAG_P50,
    NODEJS_EVENTLOOP_LAG_P90,
    NODEJS_EVENTLOOP_LAG_P99
  ];
  return eventLoopLag.exports;
}
var processHandles = { exports: {} };
var processMetricsHelpers;
var hasRequiredProcessMetricsHelpers;
function requireProcessMetricsHelpers() {
  if (hasRequiredProcessMetricsHelpers) return processMetricsHelpers;
  hasRequiredProcessMetricsHelpers = 1;
  function aggregateByObjectName(list) {
    const data = {};
    for (let i = 0; i < list.length; i++) {
      const listElement = list[i];
      if (!listElement || typeof listElement.constructor === "undefined") {
        continue;
      }
      if (Object.hasOwnProperty.call(data, listElement.constructor.name)) {
        data[listElement.constructor.name] += 1;
      } else {
        data[listElement.constructor.name] = 1;
      }
    }
    return data;
  }
  function updateMetrics(gauge2, data, labels) {
    gauge2.reset();
    for (const key in data) {
      gauge2.set(Object.assign({ type: key }, labels || {}), data[key]);
    }
  }
  processMetricsHelpers = {
    aggregateByObjectName,
    updateMetrics
  };
  return processMetricsHelpers;
}
var hasRequiredProcessHandles;
function requireProcessHandles() {
  if (hasRequiredProcessHandles) return processHandles.exports;
  hasRequiredProcessHandles = 1;
  const { aggregateByObjectName } = requireProcessMetricsHelpers();
  const { updateMetrics } = requireProcessMetricsHelpers();
  const Gauge = requireGauge();
  const NODEJS_ACTIVE_HANDLES = "nodejs_active_handles";
  const NODEJS_ACTIVE_HANDLES_TOTAL = "nodejs_active_handles_total";
  processHandles.exports = (registry2, config = {}) => {
    if (typeof process._getActiveHandles !== "function") {
      return;
    }
    const registers = registry2 ? [registry2] : void 0;
    const namePrefix = config.prefix ? config.prefix : "";
    const labels = config.labels ? config.labels : {};
    const labelNames = Object.keys(labels);
    new Gauge({
      name: namePrefix + NODEJS_ACTIVE_HANDLES,
      help: "Number of active libuv handles grouped by handle type. Every handle type is C++ class name.",
      labelNames: ["type", ...labelNames],
      registers,
      collect() {
        const handles = process._getActiveHandles();
        updateMetrics(this, aggregateByObjectName(handles), labels);
      }
    });
    new Gauge({
      name: namePrefix + NODEJS_ACTIVE_HANDLES_TOTAL,
      help: "Total number of active handles.",
      registers,
      labelNames,
      collect() {
        const handles = process._getActiveHandles();
        this.set(labels, handles.length);
      }
    });
  };
  processHandles.exports.metricNames = [
    NODEJS_ACTIVE_HANDLES,
    NODEJS_ACTIVE_HANDLES_TOTAL
  ];
  return processHandles.exports;
}
var processRequests = { exports: {} };
var hasRequiredProcessRequests;
function requireProcessRequests() {
  if (hasRequiredProcessRequests) return processRequests.exports;
  hasRequiredProcessRequests = 1;
  const Gauge = requireGauge();
  const { aggregateByObjectName } = requireProcessMetricsHelpers();
  const { updateMetrics } = requireProcessMetricsHelpers();
  const NODEJS_ACTIVE_REQUESTS = "nodejs_active_requests";
  const NODEJS_ACTIVE_REQUESTS_TOTAL = "nodejs_active_requests_total";
  processRequests.exports = (registry2, config = {}) => {
    if (typeof process._getActiveRequests !== "function") {
      return;
    }
    const namePrefix = config.prefix ? config.prefix : "";
    const labels = config.labels ? config.labels : {};
    const labelNames = Object.keys(labels);
    new Gauge({
      name: namePrefix + NODEJS_ACTIVE_REQUESTS,
      help: "Number of active libuv requests grouped by request type. Every request type is C++ class name.",
      labelNames: ["type", ...labelNames],
      registers: registry2 ? [registry2] : void 0,
      collect() {
        const requests = process._getActiveRequests();
        updateMetrics(this, aggregateByObjectName(requests), labels);
      }
    });
    new Gauge({
      name: namePrefix + NODEJS_ACTIVE_REQUESTS_TOTAL,
      help: "Total number of active requests.",
      registers: registry2 ? [registry2] : void 0,
      labelNames,
      collect() {
        const requests = process._getActiveRequests();
        this.set(labels, requests.length);
      }
    });
  };
  processRequests.exports.metricNames = [
    NODEJS_ACTIVE_REQUESTS,
    NODEJS_ACTIVE_REQUESTS_TOTAL
  ];
  return processRequests.exports;
}
var processResources = { exports: {} };
var hasRequiredProcessResources;
function requireProcessResources() {
  if (hasRequiredProcessResources) return processResources.exports;
  hasRequiredProcessResources = 1;
  const Gauge = requireGauge();
  const { updateMetrics } = requireProcessMetricsHelpers();
  const NODEJS_ACTIVE_RESOURCES = "nodejs_active_resources";
  const NODEJS_ACTIVE_RESOURCES_TOTAL = "nodejs_active_resources_total";
  processResources.exports = (registry2, config = {}) => {
    if (typeof process.getActiveResourcesInfo !== "function") {
      return;
    }
    const namePrefix = config.prefix ? config.prefix : "";
    const labels = config.labels ? config.labels : {};
    const labelNames = Object.keys(labels);
    new Gauge({
      name: namePrefix + NODEJS_ACTIVE_RESOURCES,
      help: "Number of active resources that are currently keeping the event loop alive, grouped by async resource type.",
      labelNames: ["type", ...labelNames],
      registers: registry2 ? [registry2] : void 0,
      collect() {
        const resources = process.getActiveResourcesInfo();
        const data = {};
        for (let i = 0; i < resources.length; i++) {
          const resource = resources[i];
          if (Object.hasOwn(data, resource)) {
            data[resource] += 1;
          } else {
            data[resource] = 1;
          }
        }
        updateMetrics(this, data, labels);
      }
    });
    new Gauge({
      name: namePrefix + NODEJS_ACTIVE_RESOURCES_TOTAL,
      help: "Total number of active resources.",
      registers: registry2 ? [registry2] : void 0,
      labelNames,
      collect() {
        const resources = process.getActiveResourcesInfo();
        this.set(labels, resources.length);
      }
    });
  };
  processResources.exports.metricNames = [
    NODEJS_ACTIVE_RESOURCES,
    NODEJS_ACTIVE_RESOURCES_TOTAL
  ];
  return processResources.exports;
}
var heapSizeAndUsed = { exports: {} };
var hasRequiredHeapSizeAndUsed;
function requireHeapSizeAndUsed() {
  if (hasRequiredHeapSizeAndUsed) return heapSizeAndUsed.exports;
  hasRequiredHeapSizeAndUsed = 1;
  const Gauge = requireGauge();
  const safeMemoryUsage = requireSafeMemoryUsage();
  const NODEJS_HEAP_SIZE_TOTAL = "nodejs_heap_size_total_bytes";
  const NODEJS_HEAP_SIZE_USED = "nodejs_heap_size_used_bytes";
  const NODEJS_EXTERNAL_MEMORY = "nodejs_external_memory_bytes";
  heapSizeAndUsed.exports = (registry2, config = {}) => {
    if (typeof process.memoryUsage !== "function") {
      return;
    }
    const labels = config.labels ? config.labels : {};
    const labelNames = Object.keys(labels);
    const registers = registry2 ? [registry2] : void 0;
    const namePrefix = config.prefix ? config.prefix : "";
    const collect = () => {
      const memUsage = safeMemoryUsage();
      if (memUsage) {
        heapSizeTotal.set(labels, memUsage.heapTotal);
        heapSizeUsed.set(labels, memUsage.heapUsed);
        if (memUsage.external !== void 0) {
          externalMemUsed.set(labels, memUsage.external);
        }
      }
    };
    const heapSizeTotal = new Gauge({
      name: namePrefix + NODEJS_HEAP_SIZE_TOTAL,
      help: "Process heap size from Node.js in bytes.",
      registers,
      labelNames,
      // Use this one metric's `collect` to set all metrics' values.
      collect
    });
    const heapSizeUsed = new Gauge({
      name: namePrefix + NODEJS_HEAP_SIZE_USED,
      help: "Process heap size used from Node.js in bytes.",
      registers,
      labelNames
    });
    const externalMemUsed = new Gauge({
      name: namePrefix + NODEJS_EXTERNAL_MEMORY,
      help: "Node.js external memory size in bytes.",
      registers,
      labelNames
    });
  };
  heapSizeAndUsed.exports.metricNames = [
    NODEJS_HEAP_SIZE_TOTAL,
    NODEJS_HEAP_SIZE_USED,
    NODEJS_EXTERNAL_MEMORY
  ];
  return heapSizeAndUsed.exports;
}
var heapSpacesSizeAndUsed = { exports: {} };
var hasRequiredHeapSpacesSizeAndUsed;
function requireHeapSpacesSizeAndUsed() {
  if (hasRequiredHeapSpacesSizeAndUsed) return heapSpacesSizeAndUsed.exports;
  hasRequiredHeapSpacesSizeAndUsed = 1;
  const Gauge = requireGauge();
  const v8 = require$$1;
  const METRICS = ["total", "used", "available"];
  const NODEJS_HEAP_SIZE = {};
  METRICS.forEach((metricType) => {
    NODEJS_HEAP_SIZE[metricType] = `nodejs_heap_space_size_${metricType}_bytes`;
  });
  heapSpacesSizeAndUsed.exports = (registry2, config = {}) => {
    try {
      v8.getHeapSpaceStatistics();
    } catch (e) {
      if (e.code === "ERR_NOT_IMPLEMENTED") {
        return;
      }
      throw e;
    }
    const registers = registry2 ? [registry2] : void 0;
    const namePrefix = config.prefix ? config.prefix : "";
    const labels = config.labels ? config.labels : {};
    const labelNames = ["space", ...Object.keys(labels)];
    const gauges = {};
    METRICS.forEach((metricType) => {
      gauges[metricType] = new Gauge({
        name: namePrefix + NODEJS_HEAP_SIZE[metricType],
        help: `Process heap space size ${metricType} from Node.js in bytes.`,
        labelNames,
        registers
      });
    });
    gauges.total.collect = () => {
      for (const space of v8.getHeapSpaceStatistics()) {
        const spaceName = space.space_name.substr(
          0,
          space.space_name.indexOf("_space")
        );
        gauges.total.set({ space: spaceName, ...labels }, space.space_size);
        gauges.used.set({ space: spaceName, ...labels }, space.space_used_size);
        gauges.available.set(
          { space: spaceName, ...labels },
          space.space_available_size
        );
      }
    };
  };
  heapSpacesSizeAndUsed.exports.metricNames = Object.values(NODEJS_HEAP_SIZE);
  return heapSpacesSizeAndUsed.exports;
}
var version = { exports: {} };
var hasRequiredVersion;
function requireVersion() {
  if (hasRequiredVersion) return version.exports;
  hasRequiredVersion = 1;
  const Gauge = requireGauge();
  const version$12 = process.version;
  const versionSegments = version$12.slice(1).split(".").map(Number);
  const NODE_VERSION_INFO = "nodejs_version_info";
  version.exports = (registry2, config = {}) => {
    const namePrefix = config.prefix ? config.prefix : "";
    const labels = config.labels ? config.labels : {};
    const labelNames = Object.keys(labels);
    new Gauge({
      name: namePrefix + NODE_VERSION_INFO,
      help: "Node.js version info.",
      labelNames: ["version", "major", "minor", "patch", ...labelNames],
      registers: registry2 ? [registry2] : void 0,
      aggregator: "first",
      collect() {
        this.labels(
          version$12,
          versionSegments[0],
          versionSegments[1],
          versionSegments[2],
          ...Object.values(labels)
        ).set(1);
      }
    });
  };
  version.exports.metricNames = [NODE_VERSION_INFO];
  return version.exports;
}
var gc = { exports: {} };
var hasRequiredGc;
function requireGc() {
  if (hasRequiredGc) return gc.exports;
  hasRequiredGc = 1;
  const Histogram = requireHistogram();
  let perf_hooks;
  try {
    perf_hooks = require2("perf_hooks");
  } catch {
  }
  const NODEJS_GC_DURATION_SECONDS = "nodejs_gc_duration_seconds";
  const DEFAULT_GC_DURATION_BUCKETS = [1e-3, 0.01, 0.1, 1, 2, 5];
  const kinds = [];
  if (perf_hooks && perf_hooks.constants) {
    kinds[perf_hooks.constants.NODE_PERFORMANCE_GC_MAJOR] = "major";
    kinds[perf_hooks.constants.NODE_PERFORMANCE_GC_MINOR] = "minor";
    kinds[perf_hooks.constants.NODE_PERFORMANCE_GC_INCREMENTAL] = "incremental";
    kinds[perf_hooks.constants.NODE_PERFORMANCE_GC_WEAKCB] = "weakcb";
  }
  gc.exports = (registry2, config = {}) => {
    if (!perf_hooks) {
      return;
    }
    const namePrefix = config.prefix ? config.prefix : "";
    const labels = config.labels ? config.labels : {};
    const labelNames = Object.keys(labels);
    const buckets = config.gcDurationBuckets ? config.gcDurationBuckets : DEFAULT_GC_DURATION_BUCKETS;
    const gcHistogram = new Histogram({
      name: namePrefix + NODEJS_GC_DURATION_SECONDS,
      help: "Garbage collection duration by kind, one of major, minor, incremental or weakcb.",
      labelNames: ["kind", ...labelNames],
      enableExemplars: false,
      buckets,
      registers: registry2 ? [registry2] : void 0
    });
    const obs = new perf_hooks.PerformanceObserver((list) => {
      const entry = list.getEntries()[0];
      const kind = entry.detail ? kinds[entry.detail.kind] : kinds[entry.kind];
      gcHistogram.observe(Object.assign({ kind }, labels), entry.duration / 1e3);
    });
    obs.observe({ entryTypes: ["gc"] });
  };
  gc.exports.metricNames = [NODEJS_GC_DURATION_SECONDS];
  return gc.exports;
}
var hasRequiredDefaultMetrics;
function requireDefaultMetrics() {
  if (hasRequiredDefaultMetrics) return defaultMetrics.exports;
  hasRequiredDefaultMetrics = 1;
  const { isObject } = requireUtil();
  const processCpuTotal2 = requireProcessCpuTotal();
  const processStartTime2 = requireProcessStartTime();
  const osMemoryHeap2 = requireOsMemoryHeap();
  const processOpenFileDescriptors2 = requireProcessOpenFileDescriptors();
  const processMaxFileDescriptors2 = requireProcessMaxFileDescriptors();
  const eventLoopLag2 = requireEventLoopLag();
  const processHandles2 = requireProcessHandles();
  const processRequests2 = requireProcessRequests();
  const processResources2 = requireProcessResources();
  const heapSizeAndUsed2 = requireHeapSizeAndUsed();
  const heapSpacesSizeAndUsed2 = requireHeapSpacesSizeAndUsed();
  const version2 = requireVersion();
  const gc2 = requireGc();
  const metrics2 = {
    processCpuTotal: processCpuTotal2,
    processStartTime: processStartTime2,
    osMemoryHeap: osMemoryHeap2,
    processOpenFileDescriptors: processOpenFileDescriptors2,
    processMaxFileDescriptors: processMaxFileDescriptors2,
    eventLoopLag: eventLoopLag2,
    ...typeof process.getActiveResourcesInfo === "function" ? { processResources: processResources2 } : {},
    processHandles: processHandles2,
    processRequests: processRequests2,
    heapSizeAndUsed: heapSizeAndUsed2,
    heapSpacesSizeAndUsed: heapSpacesSizeAndUsed2,
    version: version2,
    gc: gc2
  };
  const metricsList = Object.keys(metrics2);
  defaultMetrics.exports = function collectDefaultMetrics(config) {
    if (config !== null && config !== void 0 && !isObject(config)) {
      throw new TypeError("config must be null, undefined, or an object");
    }
    config = { eventLoopMonitoringPrecision: 10, ...config };
    for (const metric2 of Object.values(metrics2)) {
      metric2(config.register, config);
    }
  };
  defaultMetrics.exports.metricsList = metricsList;
  return defaultMetrics.exports;
}
var metricAggregators = {};
var hasRequiredMetricAggregators;
function requireMetricAggregators() {
  if (hasRequiredMetricAggregators) return metricAggregators;
  hasRequiredMetricAggregators = 1;
  const { Grouper, hashObject } = requireUtil();
  function AggregatorFactory(aggregatorFn) {
    return (metrics2) => {
      if (metrics2.length === 0) return;
      const result = {
        help: metrics2[0].help,
        name: metrics2[0].name,
        type: metrics2[0].type,
        values: [],
        aggregator: metrics2[0].aggregator
      };
      const byLabels = new Grouper();
      metrics2.forEach((metric2) => {
        metric2.values.forEach((value) => {
          const key = hashObject(value.labels);
          byLabels.add(`${value.metricName}_${key}`, value);
        });
      });
      byLabels.forEach((values) => {
        if (values.length === 0) return;
        const valObj = {
          value: aggregatorFn(values),
          labels: values[0].labels
        };
        if (values[0].metricName) {
          valObj.metricName = values[0].metricName;
        }
        result.values.push(valObj);
      });
      return result;
    };
  }
  metricAggregators.AggregatorFactory = AggregatorFactory;
  metricAggregators.aggregators = {
    /**
     * @return The sum of values.
     */
    sum: AggregatorFactory((v) => v.reduce((p, c) => p + c.value, 0)),
    /**
     * @return The first value.
     */
    first: AggregatorFactory((v) => v[0].value),
    /**
     * @return {undefined} Undefined; omits the metric.
     */
    omit: () => {
    },
    /**
     * @return The arithmetic mean of the values.
     */
    average: AggregatorFactory(
      (v) => v.reduce((p, c) => p + c.value, 0) / v.length
    ),
    /**
     * @return The minimum of the values.
     */
    min: AggregatorFactory(
      (v) => v.reduce((p, c) => Math.min(p, c.value), Infinity)
    ),
    /**
     * @return The maximum of the values.
     */
    max: AggregatorFactory(
      (v) => v.reduce((p, c) => Math.max(p, c.value), -Infinity)
    )
  };
  return metricAggregators;
}
var cluster_1;
var hasRequiredCluster;
function requireCluster() {
  if (hasRequiredCluster) return cluster_1;
  hasRequiredCluster = 1;
  const Registry = requireRegistry();
  const { Grouper } = requireUtil();
  const { aggregators } = requireMetricAggregators();
  let cluster = () => {
    const data = require$$3;
    cluster = () => data;
    return data;
  };
  const GET_METRICS_REQ = "prom-client:getMetricsReq";
  const GET_METRICS_RES = "prom-client:getMetricsRes";
  let registries = [Registry.globalRegistry];
  let requestCtr = 0;
  let listenersAdded = false;
  const requests = /* @__PURE__ */ new Map();
  class AggregatorRegistry extends Registry {
    constructor(regContentType = Registry.PROMETHEUS_CONTENT_TYPE) {
      super(regContentType);
      addListeners();
    }
    /**
     * Gets aggregated metrics for all workers. The optional callback and
     * returned Promise resolve with the same value; either may be used.
     * @return {Promise<string>} Promise that resolves with the aggregated
     *   metrics.
     */
    clusterMetrics() {
      const requestId = requestCtr++;
      return new Promise((resolve, reject) => {
        let settled = false;
        function done(err, result) {
          if (settled) return;
          settled = true;
          if (err) reject(err);
          else resolve(result);
        }
        const request = {
          responses: [],
          pending: 0,
          done,
          errorTimeout: setTimeout(() => {
            const err = new Error("Operation timed out.");
            request.done(err);
          }, 5e3)
        };
        requests.set(requestId, request);
        const message = {
          type: GET_METRICS_REQ,
          requestId
        };
        for (const id in cluster().workers) {
          if (cluster().workers[id].isConnected()) {
            cluster().workers[id].send(message);
            request.pending++;
          }
        }
        if (request.pending === 0) {
          clearTimeout(request.errorTimeout);
          process.nextTick(() => done(null, ""));
        }
      });
    }
    get contentType() {
      return super.contentType;
    }
    /**
     * Creates a new Registry instance from an array of metrics that were
     * created by `registry.getMetricsAsJSON()`. Metrics are aggregated using
     * the method specified by their `aggregator` property, or by summation if
     * `aggregator` is undefined.
     * @param {Array} metricsArr Array of metrics, each of which created by
     *   `registry.getMetricsAsJSON()`.
     * @param {string} registryType content type of the new registry. Defaults
     * to PROMETHEUS_CONTENT_TYPE.
     * @return {Registry} aggregated registry.
     */
    static aggregate(metricsArr, registryType = Registry.PROMETHEUS_CONTENT_TYPE) {
      const aggregatedRegistry = new Registry();
      const metricsByName = new Grouper();
      aggregatedRegistry.setContentType(registryType);
      metricsArr.forEach((metrics2) => {
        metrics2.forEach((metric2) => {
          metricsByName.add(metric2.name, metric2);
        });
      });
      metricsByName.forEach((metrics2) => {
        const aggregatorName = metrics2[0].aggregator;
        const aggregatorFn = aggregators[aggregatorName];
        if (typeof aggregatorFn !== "function") {
          throw new Error(`'${aggregatorName}' is not a defined aggregator.`);
        }
        const aggregatedMetric = aggregatorFn(metrics2);
        if (aggregatedMetric) {
          const aggregatedMetricWrapper = Object.assign(
            {
              get: () => aggregatedMetric
            },
            aggregatedMetric
          );
          aggregatedRegistry.registerMetric(aggregatedMetricWrapper);
        }
      });
      return aggregatedRegistry;
    }
    /**
     * Sets the registry or registries to be aggregated. Call from workers to
     * use a registry/registries other than the default global registry.
     * @param {Array<Registry>|Registry} regs Registry or registries to be
     *   aggregated.
     * @return {void}
     */
    static setRegistries(regs) {
      if (!Array.isArray(regs)) regs = [regs];
      regs.forEach((reg) => {
        if (!(reg instanceof Registry)) {
          throw new TypeError(`Expected Registry, got ${typeof reg}`);
        }
      });
      registries = regs;
    }
  }
  function addListeners() {
    if (listenersAdded) return;
    listenersAdded = true;
    if (cluster().isMaster) {
      cluster().on("message", (worker, message) => {
        if (message.type === GET_METRICS_RES) {
          const request = requests.get(message.requestId);
          if (message.error) {
            request.done(new Error(message.error));
            return;
          }
          message.metrics.forEach((registry2) => request.responses.push(registry2));
          request.pending--;
          if (request.pending === 0) {
            requests.delete(message.requestId);
            clearTimeout(request.errorTimeout);
            const registry2 = AggregatorRegistry.aggregate(request.responses);
            const promString = registry2.metrics();
            request.done(null, promString);
          }
        }
      });
    }
    if (cluster().isWorker) {
      process.on("message", (message) => {
        if (message.type === GET_METRICS_REQ) {
          Promise.all(registries.map((r) => r.getMetricsAsJSON())).then((metrics2) => {
            process.send({
              type: GET_METRICS_RES,
              requestId: message.requestId,
              metrics: metrics2
            });
          }).catch((error) => {
            process.send({
              type: GET_METRICS_RES,
              requestId: message.requestId,
              error: error.message
            });
          });
        }
      });
    }
  }
  cluster_1 = AggregatorRegistry;
  return cluster_1;
}
var hasRequiredPromClient;
function requirePromClient() {
  if (hasRequiredPromClient) return promClient;
  hasRequiredPromClient = 1;
  (function(exports$1) {
    exports$1.register = requireRegistry().globalRegistry;
    exports$1.Registry = requireRegistry();
    Object.defineProperty(exports$1, "contentType", {
      configurable: false,
      enumerable: true,
      get() {
        return exports$1.register.contentType;
      },
      set(value) {
        exports$1.register.setContentType(value);
      }
    });
    exports$1.prometheusContentType = exports$1.Registry.PROMETHEUS_CONTENT_TYPE;
    exports$1.openMetricsContentType = exports$1.Registry.OPENMETRICS_CONTENT_TYPE;
    exports$1.validateMetricName = requireValidation().validateMetricName;
    exports$1.Counter = requireCounter();
    exports$1.Gauge = requireGauge();
    exports$1.Histogram = requireHistogram();
    exports$1.Summary = requireSummary();
    exports$1.Pushgateway = requirePushgateway();
    exports$1.linearBuckets = requireBucketGenerators().linearBuckets;
    exports$1.exponentialBuckets = requireBucketGenerators().exponentialBuckets;
    exports$1.collectDefaultMetrics = requireDefaultMetrics();
    exports$1.aggregators = requireMetricAggregators().aggregators;
    exports$1.AggregatorRegistry = requireCluster();
  })(promClient);
  return promClient;
}
var promClientExports = requirePromClient();
const REQUEST_BUCKETS = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30];
const EXECUTION_BUCKETS = [1, 5, 10, 30, 60, 300, 900, 1800, 3600, 5400, 7200];
function createEvalWorkerMetrics() {
  const registry2 = new promClientExports.Registry();
  const claimRequests = new promClientExports.Counter({
    name: "hilo_eval_worker_claim_requests_total",
    help: "Eval worker claim requests by queue and outcome",
    labelNames: ["outcome", "queue"],
    registers: [registry2]
  });
  const claimedItems = new promClientExports.Counter({
    name: "hilo_eval_worker_claim_total",
    help: "Items claimed by an eval worker",
    labelNames: ["outcome", "queue"],
    registers: [registry2]
  });
  const claimDuration = new promClientExports.Histogram({
    name: "hilo_eval_worker_claim_duration_seconds",
    help: "Eval worker claim request duration in seconds",
    labelNames: ["outcome", "queue"],
    buckets: REQUEST_BUCKETS,
    registers: [registry2]
  });
  const executionDuration = new promClientExports.Histogram({
    name: "hilo_eval_worker_execution_duration_seconds",
    help: "End-to-end item execution duration in seconds",
    labelNames: ["outcome", "queue"],
    buckets: EXECUTION_BUCKETS,
    registers: [registry2]
  });
  const finalizeTotal = new promClientExports.Counter({
    name: "hilo_eval_worker_finalize_total",
    help: "Eval worker terminal finalize results",
    labelNames: ["outcome", "queue", "result"],
    registers: [registry2]
  });
  const finalizeDuration = new promClientExports.Histogram({
    name: "hilo_eval_worker_finalize_duration_seconds",
    help: "Eval worker terminal finalize duration in seconds",
    labelNames: ["outcome", "queue", "result"],
    buckets: REQUEST_BUCKETS,
    registers: [registry2]
  });
  const heartbeatTotal = new promClientExports.Counter({
    name: "hilo_eval_worker_heartbeat_total",
    help: "Fleet and item heartbeat outcomes",
    labelNames: ["kind", "outcome"],
    registers: [registry2]
  });
  const releaseTotal = new promClientExports.Counter({
    name: "hilo_eval_worker_release_total",
    help: "Eval worker release outcomes",
    labelNames: ["outcome", "queue"],
    registers: [registry2]
  });
  return {
    observeClaim(queue, outcome, durationSeconds, itemCount) {
      claimRequests.inc({ outcome, queue });
      if (itemCount > 0) claimedItems.inc({ outcome, queue }, itemCount);
      claimDuration.observe({ outcome, queue }, Math.max(0, durationSeconds));
    },
    observeExecution(queue, outcome, durationSeconds) {
      executionDuration.observe({ outcome, queue }, Math.max(0, durationSeconds));
    },
    observeFinalize(queue, outcome, result, durationSeconds) {
      finalizeTotal.inc({ outcome, queue, result });
      finalizeDuration.observe({ outcome, queue, result }, Math.max(0, durationSeconds));
    },
    observeHeartbeat(kind, outcome) {
      heartbeatTotal.inc({ kind, outcome });
    },
    observeRelease(queue, outcome) {
      releaseTotal.inc({ outcome, queue });
    },
    render: () => registry2.metrics(),
    contentType: registry2.contentType
  };
}
const evalWorkerMetrics = createEvalWorkerMetrics();
function resolveEvalWorkerMetricsPort(raw) {
  const value = raw?.trim() || "19191";
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error(`METRICS_PORT must be an integer from 1 to 65535, got ${JSON.stringify(raw)}`);
  }
  return port;
}
async function startEvalWorkerMetricsServer({
  port,
  metrics: metrics2 = evalWorkerMetrics,
  host = "0.0.0.0",
  logger: logger2
}) {
  const server = createServer(async (request, response) => {
    if (request.method !== "GET" || request.url !== "/metrics") {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("not found\n");
      return;
    }
    try {
      response.writeHead(200, { "content-type": metrics2.contentType });
      response.end(await metrics2.render());
    } catch {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("metrics unavailable\n");
    }
  });
  await listen(server, port, host);
  const address = server.address();
  if (!address || typeof address === "string") {
    await close(server);
    throw new Error("metrics exporter did not expose a TCP address");
  }
  logger2?.info(`Prometheus metrics listening on ${host}:${address.port}/metrics`);
  return {
    port: address.port,
    close: () => close(server)
  };
}
function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}
function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}
function deriveBenchmarkSummary(artifacts) {
  const meta = artifacts.find((a) => a.kind === "benchmark_run")?.meta;
  if (!meta) return void 0;
  const fields = [
    meta.tokens_total,
    meta.total_cost_usd,
    meta.cache_hit_rate,
    meta.tool_count,
    meta.finalize_reason
  ];
  if (fields.every((v) => v === void 0 || v === null)) return void 0;
  return {
    tokens_total: meta.tokens_total,
    total_cost_usd: meta.total_cost_usd,
    cache_hit_rate: meta.cache_hit_rate,
    tool_count: meta.tool_count,
    finalize_reason: meta.finalize_reason
  };
}
function deriveTokenUsage(artifacts) {
  const raw = artifacts.find((a) => a.kind === "benchmark_run")?.meta?.model_usage;
  if (!Array.isArray(raw)) return void 0;
  const merged = /* @__PURE__ */ new Map();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const entry = row;
    const model = typeof entry.model === "string" ? entry.model.trim() : "";
    if (!model) continue;
    const bucket = merged.get(model) ?? { model, input_tokens: 0, output_tokens: 0 };
    bucket.input_tokens += nonNegative(entry.input_tokens ?? entry.input);
    bucket.output_tokens += nonNegative(entry.output_tokens ?? entry.output);
    merged.set(model, bucket);
  }
  return merged.size > 0 ? [...merged.values()] : void 0;
}
function nonNegative(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}
const MARKET_LIST_PATH = "/api/v1/skills/market";
const MARKET_DOWNLOAD_PATH = "/api/v1/skills/market/download";
const MARKET_PAGE_SIZE = 200;
const MARKET_LIST_TIMEOUT_MS = 3e4;
const MARKET_DOWNLOAD_TIMEOUT_MS = 6e4;
const INLINE_SKILL_MAX_BYTES = 256 * 1024;
const INLINE_SKILL_NAME_PREFIX = "eval-skill";
const INSTALL_LOCK_STALE_MS = 15 * 6e4;
const DEFAULT_LOGGER$1 = {
  info: (m) => console.log(`[eval-worker-skills] ${m}`),
  warn: (m) => console.warn(`[eval-worker-skills] ${m}`),
  error: (m) => console.error(`[eval-worker-skills] ${m instanceof Error ? m.stack ?? m.message : m}`)
};
function resolveEvalWorkerCloudGatewayUrl(region, channel) {
  return process.env.CLOUD_GATEWAY_BASE_URL || getCloudGatewayUrl(region, channel);
}
function evalWorkerMarketSkillCacheDir(dataRoot, region, channel) {
  return path.join(dataRoot, "eval", "skill-cache", `${region}-${channel}`, "market");
}
class EvalWorkerSkillMarketClient {
  constructor(options) {
    this.options = options;
    if (!options.baseUrl) throw new Error("EvalWorkerSkillMarketClient: baseUrl required");
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.installDir = options.installDir ?? installedSkillsDir();
    this.logger = options.logger ?? DEFAULT_LOGGER$1;
  }
  fetchImpl;
  installDir;
  logger;
  installing = /* @__PURE__ */ new Set();
  async listMarketSkills() {
    const out = [];
    let page = 1;
    let total = 0;
    let seen = 0;
    do {
      const url = new URL(MARKET_LIST_PATH, this.normalizedBaseUrl());
      url.searchParams.set("page", String(page));
      url.searchParams.set("page_size", String(MARKET_PAGE_SIZE));
      const resp = await this.fetchImpl(url.toString(), {
        method: "GET",
        headers: this.headers(),
        signal: AbortSignal.timeout(MARKET_LIST_TIMEOUT_MS)
      });
      if (!resp.ok) {
        throw new Error(`market list HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
      }
      const data = await resp.json();
      const skills = Array.isArray(data.skills) ? data.skills : [];
      total = typeof data.total === "number" ? data.total : skills.length;
      seen += skills.length;
      for (const raw of skills) {
        if (!raw || typeof raw !== "object") continue;
        const mapped = mapCloudSkillToMarketSkillInfo(raw);
        if (!mapped.name || mapped.skillType === "plugin") continue;
        if (!isValidSkillName(mapped.name)) {
          this.logger.warn(`skipping invalid hilo-market skill name "${mapped.name}"`);
          continue;
        }
        out.push({
          name: mapped.name,
          version: mapped.version,
          source: "hilo-market",
          agents: mapped.agents,
          summary: mapped.summary,
          summaryZh: mapped.summaryZh
        });
      }
      if (skills.length === 0) break;
      page += 1;
    } while (seen < total);
    return out;
  }
  async ensureMarketSkill(name, version2) {
    assertValidSkillName(name, "hilo-market skill name");
    const cached = this.localSkill(name);
    if (cached.exists && (!version2 || cached.version === version2)) {
      return { name, version: cached.version, path: cached.path };
    }
    if (this.installing.has(name)) {
      throw new Error(`hilo-market skill "${name}" install already in progress`);
    }
    this.installing.add(name);
    try {
      const installed = await this.downloadAndInstall(name, version2);
      if (version2 && installed.version !== version2) {
        this.logger.warn(
          `hilo-market skill "${name}" version mismatch: requested=${version2} installed=${installed.version ?? "unknown"}; continuing with downloaded skill`
        );
      }
      return installed;
    } finally {
      this.installing.delete(name);
    }
  }
  localSkill(name) {
    const skillPath = path.join(this.installDir, name);
    const skillMd = path.join(skillPath, "SKILL.md");
    if (!fs.existsSync(skillMd)) return { exists: false, path: skillPath };
    try {
      const content = fs.readFileSync(skillMd, "utf-8");
      return { exists: true, path: skillPath, version: parseFrontmatter(content).version };
    } catch {
      return { exists: true, path: skillPath };
    }
  }
  async downloadAndInstall(name, version2) {
    const lock = tryAcquireLock(path.join(this.installDir, `${name}.eval-worker.lock`));
    if (!lock) {
      throw new Error(`hilo-market skill "${name}" is locked by another installer`);
    }
    try {
      const url = new URL(MARKET_DOWNLOAD_PATH, this.normalizedBaseUrl());
      url.searchParams.set("name", name);
      url.searchParams.set("source", "eval-worker");
      if (version2) url.searchParams.set("version", version2);
      const resp = await this.fetchImpl(url.toString(), {
        method: "GET",
        headers: this.headers(),
        signal: AbortSignal.timeout(MARKET_DOWNLOAD_TIMEOUT_MS)
      });
      if (!resp.ok) {
        throw new Error(
          `market download HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`
        );
      }
      const zipBuffer = Buffer.from(await resp.arrayBuffer());
      const remoteVersion = resp.headers.get("X-Skill-Version") ?? void 0;
      const finalDir = path.join(this.installDir, name);
      assertPathInside(this.installDir, finalDir, `market skill ${name}`);
      await fs.promises.mkdir(this.installDir, { recursive: true });
      const tmpBase = path.join(
        this.installDir,
        `${name}.__eval_worker_${Date.now()}_${Math.random().toString(16).slice(2)}__`
      );
      const tmpZip = `${tmpBase}.zip`;
      const extractDir = `${tmpBase}.extract`;
      const unwrapDir = `${tmpBase}.unwrap`;
      try {
        await fs.promises.writeFile(tmpZip, zipBuffer);
        await extractZip(tmpZip, extractDir);
        const skillRoot = locateSkillRoot(extractDir);
        if (!skillRoot) throw new Error("downloaded archive does not contain SKILL.md");
        let swapSource = extractDir;
        if (skillRoot !== extractDir) {
          await fs.promises.rename(skillRoot, unwrapDir);
          await fs.promises.rm(extractDir, { recursive: true, force: true });
          swapSource = unwrapDir;
        }
        await atomicSwapDir(swapSource, finalDir);
      } finally {
        await fs.promises.rm(extractDir, { recursive: true, force: true }).catch(() => {
        });
        await fs.promises.rm(unwrapDir, { recursive: true, force: true }).catch(() => {
        });
        await fs.promises.unlink(tmpZip).catch(() => {
        });
      }
      const local = this.localSkill(name);
      this.logger.info(
        `hilo-market skill "${name}" installed to ${finalDir} (version=${local.version ?? remoteVersion ?? "unknown"})`
      );
      return { name, version: local.version ?? remoteVersion, path: finalDir };
    } finally {
      lock.release();
    }
  }
  normalizedBaseUrl() {
    return this.options.baseUrl.endsWith("/") ? this.options.baseUrl : `${this.options.baseUrl}/`;
  }
  headers() {
    const token = this.options.token?.trim() ?? "";
    const headers = {
      "Content-Type": "application/json"
    };
    if (token) {
      headers.token = token;
      headers.Authorization = `Bearer ${token}`;
    }
    const lane = process.env.LANE || process.env.SWIM_LANE;
    Object.assign(headers, buildLaneHeaders(lane));
    const lang = process.env.HILO_USER_LANG;
    if (lang) headers["X-Hilo-Lang"] = lang;
    return headers;
  }
}
function createEvalWorkerCapabilityProvider(options) {
  const logger2 = options.logger ?? DEFAULT_LOGGER$1;
  const cacheTtlMs = options.cacheTtlMs ?? 10 * 6e4;
  const clock = options.clock ?? Date.now;
  let cached;
  return async () => {
    const now = clock();
    if (cached && now - cached.at < cacheTtlMs) return cached.snapshot;
    const { agents, agentVersions, itemAgentVersions } = collectCapabilityAgents(options);
    let marketSkills = [];
    if (options.marketClient) {
      try {
        marketSkills = await options.marketClient.listMarketSkills();
      } catch (err) {
        logger2.warn(
          `market capability collection failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
    const snapshot = {
      version: 1,
      worker_mode: options.workerMode,
      agentVersions,
      itemAgentVersions,
      agents,
      marketSkills,
      cachedSkills: collectCachedSkills(),
      collected_at: new Date(now).toISOString()
    };
    cached = { at: now, snapshot };
    return snapshot;
  };
}
function collectCapabilityAgents(options) {
  if (options.agentProfiles !== void 0) {
    if (options.itemAgentVersions === void 0) {
      throw new Error(
        "Eval worker capability: itemAgentVersions is required with agentProfiles; per-item support must not be inferred from profile resources"
      );
    }
    const agents2 = [];
    const agentVersions = [];
    for (const version2 of [2]) {
      const profile = options.agentProfiles[version2];
      if (!profile) continue;
      if (profile.agentVersion !== version2) {
        throw new Error(
          `Eval worker capability: profile key ${version2} contains agentVersion=${profile.agentVersion}`
        );
      }
      if (!fs.existsSync(profile.configDir)) continue;
      const agentsDir2 = resolveAgentsDir(profile);
      if (!agentsDir2) continue;
      const profileAgents = collectEvalWorkerAgents(agentsDir2, version2);
      if (profileAgents.length === 0) continue;
      agentVersions.push(version2);
      agents2.push(...profileAgents);
    }
    const itemAgentVersions = normalizeAgentVersions(options.itemAgentVersions);
    const unavailable = itemAgentVersions.filter((version2) => !agentVersions.includes(version2));
    if (unavailable.length > 0) {
      throw new Error(
        `Eval worker capability: itemAgentVersions must be a subset of agentVersions; missing resources for ${unavailable.join(",")}`
      );
    }
    agents2.sort(
      (a, b) => (a.version ?? 2) - (b.version ?? 2) || compareCapabilityNames(a.name, b.name)
    );
    return { agents: agents2, agentVersions, itemAgentVersions };
  }
  const agentsDir = resolveAgentsDir(options);
  const agents = collectEvalWorkerAgents(agentsDir);
  const hasProfile = agents.length > 0;
  return {
    agents,
    agentVersions: hasProfile ? [2] : [],
    itemAgentVersions: hasProfile ? [2] : []
  };
}
function normalizeAgentVersions(values) {
  const normalized = /* @__PURE__ */ new Set();
  for (const value of values) {
    if (value !== 2) {
      throw new Error(`Eval worker capability: unsupported agent version ${String(value)}`);
    }
    normalized.add(value);
  }
  return [2].filter((version2) => normalized.has(version2));
}
function collectEvalWorkerAgents(agentsDir, agentVersion = 2) {
  if (!agentsDir || !fs.existsSync(agentsDir)) return [];
  const entries = fs.readdirSync(agentsDir, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md");
  if (entries.some(
    (entry) => !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(path.basename(entry.name, ".md"))
  )) {
    return [];
  }
  return entries.filter((entry) => {
    try {
      return fs.readFileSync(path.join(agentsDir, entry.name), "utf8").trim().length > 0;
    } catch {
      return false;
    }
  }).map((entry) => {
    const name = entry.name.replace(/\.md$/, "");
    const agent = {
      name,
      label: name,
      role: name === "media-agent" ? "orchestrator" : "sub-agent",
      version: agentVersion
    };
    return agent;
  }).sort((a, b) => compareCapabilityNames(a.name, b.name));
}
function compareCapabilityNames(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}
function collectCachedSkills() {
  try {
    const resolved = resolvedSkillPaths();
    return resolved.paths.map((skillPath) => {
      const name = readSkillName(skillPath) ?? path.basename(skillPath);
      return {
        name,
        version: resolved.versions.get(name),
        path: skillPath
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}
async function materializeEvalSkillMounts(options) {
  const { skills, workspace, agentVersion, capability, marketClient } = options;
  if (!skills || !Array.isArray(skills.mounts) || skills.mounts.length === 0) return void 0;
  if (skills.version !== void 0 && skills.version !== 1) {
    throw new Error(`unsupported skills.version=${String(skills.version)}`);
  }
  const knownAgents = new Set(
    capability.agents.filter((agent) => (agent.version ?? 2) === agentVersion).map((agent) => agent.name)
  );
  const mounted = [];
  const pathBySkillName = /* @__PURE__ */ new Map();
  const grants = {};
  const tempRoot = path.join(workspace, ".eval", "skills");
  const baselineSkillNames = /* @__PURE__ */ new Set([
    ...(capability.cachedSkills ?? []).map((skill) => skill.name).filter(Boolean)
  ]);
  const inlineByName = /* @__PURE__ */ new Map();
  for (let index = 0; index < skills.mounts.length; index++) {
    const mount = skills.mounts[index];
    if (!mount || typeof mount !== "object") {
      throw new Error(`skills.mounts[${index}] is invalid`);
    }
    if (!mount.agent || !knownAgents.has(mount.agent)) {
      throw new Error(
        `skills.mounts[${index}].agent "${mount.agent ?? ""}" is not available on this worker for agent version ${agentVersion}`
      );
    }
    let skillName;
    let skillPath;
    let version2;
    if (mount.source === "hilo-market") {
      if (!mount.name) throw new Error(`skills.mounts[${index}].name required for hilo-market`);
      const marketSkill = capability.marketSkills.find((skill) => skill.name === mount.name);
      if (!marketSkill) {
        throw new Error(
          `skills.mounts[${index}].name "${mount.name}" is not in this worker marketSkills capability`
        );
      }
      if (mount.version && marketSkill.version && mount.version !== marketSkill.version) {
        throw new Error(
          `skills.mounts[${index}].version "${mount.version}" does not match capability version "${marketSkill.version}"`
        );
      }
      const ensured = await marketClient.ensureMarketSkill(
        mount.name,
        mount.version ?? marketSkill.version
      );
      skillName = ensured.name;
      skillPath = ensured.path;
      version2 = ensured.version;
    } else if (mount.source === "eval-managed" || mount.source === "inline") {
      const prepared = prepareInlineSkill({
        mount,
        index
      });
      if (baselineSkillNames.has(prepared.name)) {
        throw new Error(
          `skills.mounts[${index}].name "${prepared.name}" conflicts with an existing worker skill`
        );
      }
      const existingInline = inlineByName.get(prepared.name);
      if (existingInline) {
        if (existingInline.content !== prepared.content || existingInline.version !== prepared.version) {
          throw new Error(
            `duplicate mounted skill name "${prepared.name}" has different content or version`
          );
        }
        existingInline.agents.add(mount.agent);
        skillName = prepared.name;
        skillPath = existingInline.path;
        version2 = existingInline.version;
      } else {
        skillName = prepared.name;
        skillPath = inlineSkillDir(tempRoot, index, skillName);
        inlineByName.set(skillName, {
          firstIndex: index,
          source: mount.source,
          version: prepared.version,
          content: prepared.content,
          path: skillPath,
          agents: /* @__PURE__ */ new Set([mount.agent])
        });
        version2 = prepared.version;
      }
    } else {
      throw new Error(`skills.mounts[${index}].source "${String(mount.source)}" is unsupported`);
    }
    assertValidSkillName(skillName, `skills.mounts[${index}] skill name`);
    const existingPath = pathBySkillName.get(skillName);
    if (existingPath && existingPath !== skillPath) {
      throw new Error(`duplicate mounted skill name "${skillName}" resolves to multiple paths`);
    }
    pathBySkillName.set(skillName, skillPath);
    grants[mount.agent] = [...grants[mount.agent] ?? [], skillName];
    mounted.push({
      agent: mount.agent,
      source: mount.source,
      name: skillName,
      version: version2,
      path: skillPath
    });
  }
  for (const [name, entry] of inlineByName) {
    await writeInlineSkill({
      name,
      version: entry.version,
      content: entry.content,
      agents: Array.from(entry.agents).sort(),
      index: entry.firstIndex,
      tempRoot,
      source: entry.source
    });
  }
  const skillsPaths = Array.from(new Set(mounted.map((entry) => entry.path)));
  for (const [agent, names] of Object.entries(grants)) {
    grants[agent] = Array.from(new Set(names));
  }
  return {
    skillsPaths,
    evalSkillAgentGrants: grants,
    mounted
  };
}
function resolveAgentsDir(options) {
  const candidates = [
    options.sourceConfigDir ? path.join(options.sourceConfigDir, "agents") : void 0,
    options.configDir ? path.join(options.configDir, "agents") : void 0
  ];
  return candidates.find(
    (candidate) => !!candidate && fs.existsSync(candidate)
  );
}
function readSkillName(skillPath) {
  try {
    const meta = parseFrontmatter(fs.readFileSync(path.join(skillPath, "SKILL.md"), "utf-8"));
    return meta.name;
  } catch {
    return void 0;
  }
}
function prepareInlineSkill(options) {
  const { mount, index } = options;
  if (!mount.content || mount.content.trim().length === 0) {
    throw new Error(`skills.mounts[${index}].content required for ${mount.source}`);
  }
  const size = Buffer.byteLength(mount.content, "utf-8");
  if (size > INLINE_SKILL_MAX_BYTES) {
    throw new Error(`skills.mounts[${index}].content exceeds ${INLINE_SKILL_MAX_BYTES} bytes`);
  }
  const parsed = parseFrontmatter(mount.content);
  const requestedName = mount.name || parsed.name || mount.id || `${INLINE_SKILL_NAME_PREFIX}-${index}`;
  const name = normalizeGeneratedSkillName(requestedName, index);
  const version2 = mount.version || parsed.version || "0.0.0";
  return { mount, index, name, version: version2, content: mount.content };
}
async function writeInlineSkill(options) {
  const { name, version: version2, content: rawContent, agents, index, tempRoot, source } = options;
  const content = ensureSkillMdContent(rawContent, name, version2, agents);
  const skillDir = inlineSkillDir(tempRoot, index, name);
  assertPathInside(tempRoot, skillDir, `${source} skill ${name}`);
  await fs.promises.mkdir(skillDir, { recursive: true });
  await fs.promises.writeFile(path.join(skillDir, "SKILL.md"), content, "utf-8");
  return { name, version: version2, path: skillDir };
}
function inlineSkillDir(tempRoot, index, name) {
  return path.join(tempRoot, `${index}-${name}`);
}
function ensureSkillMdContent(content, name, version2, agents) {
  const trimmed = content.trimStart();
  const agentList = agents.length === 1 ? `"${agents[0]}"` : agents.map((agent) => `"${agent}"`).join(", ");
  const agentsYaml = agents.map((agent) => `  - ${agent}`).join("\n");
  const guard = `

<!-- eval-worker: this skill is mounted for agent ${agentList} only. Other agents must not invoke it. Runtime enforcement is provided by config.agent[].permission.skill for this eval item. -->
`;
  if (trimmed.startsWith("---")) {
    const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (match) {
      const body = stripGeneratedSkillFrontmatterKeys(match[1]).trim();
      const rest = content.slice(match[0].length).trimStart();
      const frontmatter = [
        "---",
        `name: ${name}`,
        `version: ${version2}`,
        "agents:",
        agentsYaml,
        ...body ? [body] : [],
        "---"
      ].join("\n");
      return `${frontmatter}

${rest.trimEnd()}${guard}`;
    }
  }
  return `---
name: ${name}
version: ${version2}
agents:
${agentsYaml}
---

${content.trim() || "Use this skill only for the mounted eval item."}${guard}`;
}
function stripGeneratedSkillFrontmatterKeys(frontmatter) {
  const kept = [];
  let skippingAgentsBlock = false;
  for (const line of frontmatter.split("\n")) {
    const topLevelKey = line.match(/^([A-Za-z0-9_-]+)\s*:/)?.[1];
    if (topLevelKey) {
      skippingAgentsBlock = false;
      if (topLevelKey === "name" || topLevelKey === "version") continue;
      if (topLevelKey === "agents") {
        skippingAgentsBlock = true;
        continue;
      }
    } else if (skippingAgentsBlock && (line.trim() === "" || /^\s+/.test(line))) {
      continue;
    }
    kept.push(line);
  }
  return kept.join("\n");
}
function normalizeGeneratedSkillName(raw, index) {
  const normalized = raw.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+/, "").slice(0, 64);
  const name = normalized || `${INLINE_SKILL_NAME_PREFIX}-${index}`;
  if (isValidSkillName(name)) return name;
  return `${INLINE_SKILL_NAME_PREFIX}-${index}`;
}
function assertValidSkillName(name, label) {
  if (!isValidSkillName(name)) {
    throw new Error(`${label} "${name}" is invalid`);
  }
}
function assertPathInside(baseDir, target, label) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(target);
  if (resolvedTarget !== resolvedBase && !resolvedTarget.startsWith(`${resolvedBase}${path.sep}`)) {
    throw new Error(`${label} resolves outside ${resolvedBase}`);
  }
}
async function extractZip(zipPath, targetDir) {
  await fs.promises.mkdir(targetDir, { recursive: true });
  await extractZipSafe(zipPath, targetDir);
  validateExtractedFiles(targetDir);
}
function validateExtractedFiles(dir) {
  const resolved = path.resolve(dir);
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.resolve(current, entry.name);
      assertPathInside(resolved, full, "extracted skill file");
      if (entry.isSymbolicLink()) {
        fs.unlinkSync(full);
      } else if (entry.isDirectory()) {
        walk(full);
      }
    }
  };
  walk(resolved);
}
function locateSkillRoot(extractedDir) {
  if (fs.existsSync(path.join(extractedDir, "SKILL.md"))) return extractedDir;
  const ignored = /* @__PURE__ */ new Set(["__MACOSX", ".DS_Store"]);
  const subdirs = fs.readdirSync(extractedDir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && !ignored.has(entry.name));
  if (subdirs.length !== 1) return null;
  const candidate = path.join(extractedDir, subdirs[0].name);
  return fs.existsSync(path.join(candidate, "SKILL.md")) ? candidate : null;
}
async function atomicSwapDir(stagingDir, finalDir) {
  const oldDir = `${finalDir}.__old__`;
  await fs.promises.rm(oldDir, { recursive: true, force: true }).catch(() => {
  });
  if (fs.existsSync(finalDir)) {
    await fs.promises.rename(finalDir, oldDir);
  }
  try {
    await fs.promises.rename(stagingDir, finalDir);
  } catch (err) {
    if (fs.existsSync(oldDir)) {
      await fs.promises.rename(oldDir, finalDir).catch(() => {
      });
    }
    throw err;
  }
  await fs.promises.rm(oldDir, { recursive: true, force: true }).catch(() => {
  });
}
function tryAcquireLock(lockPath) {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  const reclaimPath = `${lockPath}.reclaim`;
  if (isFreshLockFile(reclaimPath, INSTALL_LOCK_STALE_MS)) return null;
  const acquired = createLockFile(lockPath);
  if (acquired) return acquired;
  const reclaim = acquireReclaimLock(reclaimPath);
  if (!reclaim) return null;
  try {
    if (!isStaleLockFile(lockPath, INSTALL_LOCK_STALE_MS)) return null;
    try {
      fs.unlinkSync(lockPath);
    } catch (err) {
      if (err.code !== "ENOENT") return null;
    }
    return createLockFile(lockPath);
  } finally {
    reclaim.release();
  }
}
function createLockFile(lockPath) {
  let fd;
  try {
    fd = fs.openSync(lockPath, "wx");
  } catch {
    return null;
  }
  const token = randomUUID();
  fs.writeFileSync(fd, `${token}
${process.pid}
${Date.now()}
${os.hostname()}
`);
  return {
    release: () => {
      try {
        fs.closeSync(fd);
      } catch {
      }
      releaseLockFile(lockPath, token);
    }
  };
}
function acquireReclaimLock(reclaimPath) {
  try {
    const stat = fs.statSync(reclaimPath);
    if (Date.now() - stat.mtimeMs < INSTALL_LOCK_STALE_MS) return null;
    const stalePath = `${reclaimPath}.stale-${process.pid}-${Date.now()}-${randomUUID()}`;
    try {
      fs.renameSync(reclaimPath, stalePath);
      fs.rmSync(stalePath, { force: true });
    } catch {
      return null;
    }
  } catch (err) {
    if (err.code !== "ENOENT") return null;
  }
  return createLockFile(reclaimPath);
}
function isFreshLockFile(lockPath, staleMs) {
  try {
    const stat = fs.statSync(lockPath);
    return Date.now() - stat.mtimeMs < staleMs;
  } catch {
    return false;
  }
}
function isStaleLockFile(lockPath, staleMs) {
  try {
    const stat = fs.statSync(lockPath);
    return Date.now() - stat.mtimeMs >= staleMs;
  } catch (err) {
    return err.code === "ENOENT";
  }
}
function releaseLockFile(lockPath, token) {
  try {
    const current = fs.readFileSync(lockPath, "utf-8").split("\n")[0];
    if (current !== token) return;
    fs.unlinkSync(lockPath);
  } catch {
  }
}
const TASK_TIMEOUT_DEFAULT_FALLBACK_MS = 4 * 60 * 60 * 1e3;
function resolveTaskTimeoutMs() {
  const raw = process.env.HILO_WORKER_HARD_DEADLINE_MS;
  if (!raw) return TASK_TIMEOUT_DEFAULT_FALLBACK_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return TASK_TIMEOUT_DEFAULT_FALLBACK_MS;
  return parsed;
}
function workspaceBindingForTask(record) {
  if (!record.gateway_url || !record.workspace_claim || !record.workspace_instance_id || !Number.isSafeInteger(record.workspace_generation) || (record.workspace_generation ?? 0) < 1) {
    return void 0;
  }
  return {
    baseUrl: record.gateway_url,
    claim: record.workspace_claim,
    instanceId: record.workspace_instance_id,
    generation: record.workspace_generation
  };
}
function workspaceHeadersForTask(record) {
  const binding = workspaceBindingForTask(record);
  if (binding) return workspaceGatewayIdentityHeaders(binding);
  return record.workspace_claim ? { [HILO_WORKSPACE_IDENTITY_HEADER]: record.workspace_claim } : {};
}
const TASK_POLL_INTERVAL_MS = 2e3;
const ITEM_EVENT_POST_TIMEOUT_MS = 5e3;
const BENCHMARK_LIVE_EVENT_NEXT_SEQUENCE = 1e6;
const BENCHMARK_LIVE_EVENT_BIND_TIMEOUT_MS = 1e4;
const BENCHMARK_LIVE_EVENT_BIND_POLL_MS = 250;
const BENCHMARK_LIVE_EVENT_REGISTER_RETRIES = 4;
const BENCHMARK_LIVE_EVENT_REGISTER_RETRY_DELAY_MS = 2e3;
const TASK_TIMEOUT_DEFAULT_MS = resolveTaskTimeoutMs();
const TERMINAL_STATUSES = /* @__PURE__ */ new Set(["completed", "error", "timeout"]);
const DEFAULT_LOGGER = {
  info: (m) => console.log(`[eval-worker] ${m}`),
  warn: (m) => console.warn(`[eval-worker] ${m}`),
  error: (m) => console.error(`[eval-worker] ${m instanceof Error ? m.stack ?? m.message : m}`)
};
class EvalWorker {
  constructor(driver, config, logger2 = DEFAULT_LOGGER) {
    this.driver = driver;
    this.config = config;
    this.logger = logger2;
    if (!config.backendUrl) throw new Error("EvalWorker: backendUrl required");
    if (!config.dataDir) throw new Error("EvalWorker: dataDir required");
    this.workerIdentity = config.workerIdentity?.trim() || config.laneName?.trim() || "main";
    this.metrics = config.metrics ?? evalWorkerMetrics;
    this.metricsQueue = config.workerQueue?.trim() === "task" ? "task" : "eval";
  }
  /**
   * Threshold of consecutive transport-level failures (claim loop)
   * before the worker logs FATAL and `process.exit(1)`. At 15s backoff
   * this covers ~5 minutes of silent unreachable backend before we
   * surface CrashLoopBackOff to k8s.
   *
   * Only TRANSPORT errors count (fetch failed / ECONNREFUSED / DNS /
   * timeout). HTTP 4xx/5xx come back as a Response and indicate the
   * backend is reachable but rejecting — that's a different bug class
   * (auth / contract / state) and gets warn-logged but does NOT
   * increment this counter.
   */
  static MAX_CONSECUTIVE_TRANSPORT_ERRORS = 20;
  /**
   * Same idea for the fleet heartbeat loop (every 30s). 10 consecutive
   * transport failures ≈ 5 minutes of silent fleet-discovery breakage.
   */
  static MAX_HEARTBEAT_ERRORS = 10;
  running = false;
  /**
   * Plan §D4 / §D6 — separate "block new claims" from "running". stop()
   * default flips this to false so the claim loop exits BUT does NOT
   * touch `running` until the claim loop has fully drained — which
   * keeps in-flight runTask / waitForTerminal alive (graceful drain).
   * Re-init on start().
   */
  acceptingClaims = true;
  /**
   * Fatal runtime-close failure recorded by runTask. The current item is
   * allowed to finish its artifact/callback/retention cleanup; runClaimLoop
   * then exits the process with a non-zero code so the pod supervisor can
   * replace this poisoned worker instead of leaving an alive-but-idle lane.
   */
  fatalExitReason = null;
  /**
   * Plan §D5 / §D7 — abort flag for waitForTerminal. Default false so
   * a graceful stop() lets the in-flight task complete naturally.
   * Set to TRUE unconditionally inside releaseCurrentItem — a release
   * POST is the single source of truth for "this item is now back in
   * Pending; we cannot await its terminal state". After flipping,
   * waitForTerminal exits the polling loop on its next iteration and
   * returns an explicit 'error' record so runTask's outer finally
   * handler can short-circuit (no more wasted DB writes / artifact
   * uploads for an item we have already disowned).
   */
  abortInFlight = false;
  heartbeatTimer;
  claimLoopPromise;
  currentItemId = null;
  /**
   * Full envelope of the in-flight item — used by
   * {@link releaseCurrentItem} on SIGTERM grace-timeout so the worker
   * can POST `/items/{id}/release` (hand the item back to Pending)
   * before exit, instead of leaking it as Running until backend's
   * orphan reaper sweeps it minutes later.
   */
  currentItem = null;
  /** Abort only when this worker relinquishes ownership; user cancel still collects evidence. */
  currentArtifactUploadAbort = null;
  /** Driver task bound to currentItem; used to prove no active turn before close. */
  currentDriverTaskId = null;
  /** Current /release request + local driver cancellation settlement. */
  releaseAttemptSettled = null;
  /**
   * Phase 2: periodic 24h sweep that purges <HILO_BENCHMARK_DIR>/<UTC日期>/
   * older than 7 days. Started in {@link start}, cleared in {@link stop}.
   * Plan §3.6 / Round 1 S5 fix wraps the tick in try/catch + reschedules
   * in finally so retention can never permanently halt.
   */
  benchmarkSweepTimer;
  /** Non-empty control-plane identity; never used as a Hilo task lane. */
  workerIdentity;
  metrics;
  metricsQueue;
  start() {
    if (this.running) return;
    this.running = true;
    this.acceptingClaims = true;
    this.fatalExitReason = null;
    this.abortInFlight = false;
    this.logger.info(
      `starting: backend=${this.config.backendUrl} bedrockLane=${this.config.laneName ?? "(none)"} worker=${this.workerIdentity} pod=${this.config.podIp} ref=${this.config.buildRef}`
    );
    this.startHeartbeatLoop();
    this.claimLoopPromise = this.runClaimLoop();
    if (isBenchmarkEnabled(process.env.HILO_BENCHMARK)) {
      this.startBenchmarkSweepLoop();
    }
  }
  /**
   * Plan §D6 — graceful drain by default; explicit release on demand.
   *
   * 5-phase stop:
   *   1. Set `acceptingClaims = false` — claim loop exits on next
   *      iteration; no new items pulled.
   *   2. If `opts.release === true` and an item is in-flight: call
   *      `releaseCurrentItem(reason)` which POSTs /release AND flips
   *      `abortInFlight = true` so waitForTerminal exits immediately
   *      (the item is now back in Pending; awaiting its terminal would
   *      racily double-handle).
   *   3. (Else) leave `abortInFlight = false`. The in-flight task
   *      keeps running through waitForTerminal until natural terminal
   *      / wall-clock deadline / driver loss — the typical SIGTERM
   *      → 20-min drain window scenario.
   *   4. Heartbeat + benchmark sweep cleanup (timers).
   *   5. await claimLoopPromise (claim loop finishes after current
   *      runTask returns), then `running = false`.
   */
  async stop(opts = {}) {
    if (!this.running) return;
    this.logger.info(
      `stopping (release=${opts.release === true ? "yes" : "no"}, reason=${opts.releaseReason ?? "none"})`
    );
    this.acceptingClaims = false;
    if (opts.release === true && this.currentItemId !== null) {
      await this.releaseCurrentItem(opts.releaseReason ?? "worker_stop_explicit");
    }
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = void 0;
    }
    if (this.benchmarkSweepTimer) {
      clearTimeout(this.benchmarkSweepTimer);
      this.benchmarkSweepTimer = void 0;
    }
    if (this.claimLoopPromise) {
      try {
        await this.claimLoopPromise;
      } catch (err) {
        this.logger.warn(
          `claim loop exit error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
    this.running = false;
  }
  /**
   * Hand the currently in-flight item back to Pending so a sibling pod
   * can re-claim it. Called by the SIGTERM grace-timeout path in
   * headless-worker-entry — if the worker can't drain in 20 min and
   * k8s is about to SIGKILL, this is the last chance to avoid the
   * orphan-reaper having to clean up 60s later.
   *
   * No-op if no in-flight item. Best-effort: errors logged but don't
   * raise (caller is about to exit anyway).
   */
  async releaseCurrentItem(reason = "shutdown") {
    this.abortInFlight = true;
    this.currentArtifactUploadAbort?.abort();
    const item = this.currentItem;
    if (!item) {
      this.metrics.observeRelease(this.metricsQueue, "noop");
      this.logger.info("releaseCurrentItem: no in-flight item, noop");
      return;
    }
    const attempt = (async () => {
      try {
        const resp = await this.post(
          reportPath(item, "release"),
          void 0,
          {
            claim_token: item.claim_token,
            ...item.epoch_id ? { epoch_id: item.epoch_id } : {},
            reason
          },
          // Plan §D8 — 5 s hard cap. Caller is typically about to exit
          // the process; a 30 s default would block the SIGTERM-grace
          // window we are trying to honour. Backend's release endpoint
          // is a single UPDATE row — completes in <100 ms typical.
          { timeoutMs: 5e3, callback: item.callback }
        );
        if (resp.ok) {
          this.metrics.observeRelease(this.metricsQueue, "success");
          this.logger.info(`released item=${item.item_id} reason=${reason}`);
        } else {
          this.metrics.observeRelease(this.metricsQueue, "http_error");
          this.logger.warn(
            `release item=${item.item_id} HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`
          );
        }
      } catch (err) {
        this.metrics.observeRelease(this.metricsQueue, "transport_error");
        this.logger.warn(
          `release item=${item.item_id} error: ${err instanceof Error ? err.message : String(err)}`
        );
      } finally {
        if (this.currentDriverTaskId) {
          this.driver.cancelTask(this.currentDriverTaskId);
        }
      }
    })();
    this.releaseAttemptSettled = attempt;
    try {
      await attempt;
    } finally {
      if (this.releaseAttemptSettled === attempt) {
        this.releaseAttemptSettled = null;
      }
    }
  }
  // ─────────────────────────── Heartbeat ───────────────────────────
  /**
   * Consecutive transport-error count for the fleet heartbeat loop.
   * Reset on any successful HTTP round-trip (any status code). Same
   * fail-fast contract as {@link claimErrors}.
   */
  heartbeatErrors = 0;
  startHeartbeatLoop() {
    void this.sendHeartbeat();
    const tick = () => {
      if (!this.running) return;
      this.heartbeatTimer = setTimeout(async () => {
        if (!this.running) return;
        await this.sendHeartbeat();
        tick();
      }, EVAL_HEARTBEAT_INTERVAL_MS);
    };
    tick();
  }
  async sendHeartbeat() {
    const body = {
      // The backend field is historically named lane_name, but for a
      // lane-less main deployment it carries the logical fleet identity.
      // It must never be copied into task-level Hilo routing.
      lane_name: this.workerIdentity,
      pod_ip: this.config.podIp,
      build_ref: this.config.buildRef
    };
    if (this.config.capabilityProvider) {
      try {
        body.capabilities = await this.config.capabilityProvider();
      } catch (err) {
        this.logger.warn(
          `capability collection failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
    let resp;
    try {
      resp = await this.post("/api/worker/heartbeat", this.config.workerToken, body);
    } catch (err) {
      this.metrics.observeHeartbeat("fleet", "transport_error");
      this.heartbeatErrors += 1;
      if (this.heartbeatErrors >= EvalWorker.MAX_HEARTBEAT_ERRORS) {
        this.logger.error(
          `fleet heartbeat loop dead — ${this.heartbeatErrors} consecutive transport errors against ${this.config.backendUrl}, exiting (set EVAL_BACKEND_URL or fix network)`
        );
        process.exit(1);
      }
      this.logger.warn(
        `heartbeat error (${this.heartbeatErrors}/${EvalWorker.MAX_HEARTBEAT_ERRORS}): ${err instanceof Error ? err.message : String(err)}`
      );
      return;
    }
    this.heartbeatErrors = 0;
    if (!resp.ok) {
      this.metrics.observeHeartbeat("fleet", "http_error");
      this.logger.warn(`heartbeat HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
      return;
    }
    this.metrics.observeHeartbeat("fleet", "success");
    const ack = await resp.json();
    this.logger.info(`heartbeat ok: status=${ack.status} last_at=${ack.last_heartbeat_at}`);
  }
  // ─────────────────────────── Claim loop ───────────────────────────
  /**
   * Consecutive transport-error count for the claim loop. Reset on any
   * successful round-trip (regardless of items returned). When this hits
   * {@link MAX_CONSECUTIVE_TRANSPORT_ERRORS}, the worker logs FATAL and
   * `process.exit(1)` so k8s sees the pod fail and either restarts it
   * (transient bedrock blip) or surfaces CrashLoopBackOff (persistent
   * config error — wrong EVAL_BACKEND_URL, bad token, etc.).
   *
   * Without this, a misconfigured lane sat retrying forever (15s backoff
   * × infinity), wasting 2 CPU + 4GB RAM per pod and silently doing zero
   * work — observability nightmare.
   */
  claimErrors = 0;
  async runClaimLoop() {
    const podName = process.env.HOSTNAME ?? "unknown";
    const buildRef = this.config.buildRef ?? "unknown";
    const fullWorkerId = `${this.workerIdentity}@${this.config.podIp}|pod=${podName}|build=${buildRef}`;
    const workerId = fullWorkerId.slice(0, 128);
    while (this.acceptingClaims) {
      try {
        const items = await this.claimItems(workerId);
        if (items.length === 0) {
          await sleep(EVAL_CLAIM_EMPTY_BACKOFF_MS, () => this.acceptingClaims);
          continue;
        }
        for (const item of items) {
          if (!this.acceptingClaims) break;
          this.currentItemId = item.item_id;
          this.currentItem = item;
          this.logger.info(
            `claimed item=${item.item_id} epoch=${item.epoch_id ?? "legacy"} token=${item.claim_token.slice(0, 8)}…`
          );
          try {
            await this.runTask(item);
          } catch (err) {
            this.logger.error(
              `runTask threw for item ${item.item_id}: ${err instanceof Error ? err.message : String(err)}`
            );
            await this.failItem(
              item,
              `worker internal error: ${err instanceof Error ? err.message : String(err)}`
            ).catch(
              (e) => this.logger.warn(
                `fail report itself failed: ${e instanceof Error ? e.message : String(e)}`
              )
            );
          } finally {
            this.currentItemId = null;
            this.currentItem = null;
            this.currentDriverTaskId = null;
          }
        }
      } catch (err) {
        this.logger.warn(
          `claim loop error (backoff ${EVAL_CLAIM_ERROR_BACKOFF_MS}ms): ${err instanceof Error ? err.message : String(err)}`
        );
        await sleep(EVAL_CLAIM_ERROR_BACKOFF_MS, () => this.acceptingClaims);
      }
    }
    this.logger.info("claim loop exited");
    if (this.fatalExitReason) {
      const reason = this.fatalExitReason;
      if (this.heartbeatTimer) {
        clearTimeout(this.heartbeatTimer);
        this.heartbeatTimer = void 0;
      }
      if (this.benchmarkSweepTimer) {
        clearTimeout(this.benchmarkSweepTimer);
        this.benchmarkSweepTimer = void 0;
      }
      this.driver.stop();
      this.running = false;
      this.logger.error(
        `fatal worker state after runtime close failure; exiting with code 1 for supervisor restart: ${reason}`
      );
      process.exit(1);
    }
  }
  async claimItems(workerId) {
    const startedAt = Date.now();
    const url = claimUrl(this.config.backendUrl);
    url.search = claimSearchParams({
      workerId,
      // 入口分流：主版本 pod 的 HUB_WORKER_QUEUE=task 会去线上任务队列领活。
      workerQueue: this.config.workerQueue,
      workerRegion: this.config.workerRegion,
      workerChannel: this.config.workerChannel,
      buildRef: this.config.buildRef,
      workerMode: this.config.workerMode,
      itemAgentVersions: normalizeClaimAgentVersions(
        this.config.workerMode,
        this.config.itemAgentVersions
      )
    }).toString();
    let resp;
    try {
      resp = await fetch(url.toString(), {
        method: "GET",
        signal: AbortSignal.timeout(3e4)
      });
    } catch (err) {
      this.metrics.observeClaim(
        this.metricsQueue,
        "transport_error",
        (Date.now() - startedAt) / 1e3,
        0
      );
      this.claimErrors += 1;
      if (this.claimErrors >= EvalWorker.MAX_CONSECUTIVE_TRANSPORT_ERRORS) {
        this.logger.error(
          `claim loop dead — ${this.claimErrors} consecutive transport errors against ${this.config.backendUrl}, exiting (set EVAL_BACKEND_URL or fix network)`
        );
        process.exit(1);
      }
      throw err;
    }
    this.claimErrors = 0;
    if (!resp.ok) {
      this.metrics.observeClaim(
        this.metricsQueue,
        "http_error",
        (Date.now() - startedAt) / 1e3,
        0
      );
      throw new Error(`claim HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    }
    const body = await resp.json();
    const items = (body.items ?? []).map(normalizeClaimedItem);
    this.metrics.observeClaim(
      this.metricsQueue,
      items.length > 0 ? "claimed" : "empty",
      (Date.now() - startedAt) / 1e3,
      items.length
    );
    return items;
  }
  // ─────────────────────────── Per-task ───────────────────────────
  /** Execute one pushed item without starting fleet heartbeat or claim loops. */
  async runPushedItem(item) {
    if (this.running || this.currentItem !== null) {
      throw new Error("EvalWorker: pushed item requires an idle one-shot worker");
    }
    this.currentItemId = item.item_id;
    this.currentItem = item;
    this.logger.info(
      `pushed item=${item.item_id} epoch=${item.epoch_id ?? "legacy"} token=${item.claim_token.slice(0, 8)}…`
    );
    try {
      let terminalCallbackAcknowledged = false;
      await this.runTask(item, (acknowledged) => {
        terminalCallbackAcknowledged = acknowledged;
      });
      if (!terminalCallbackAcknowledged) {
        throw new Error(`item=${item.item_id}: terminal callback was not acknowledged`);
      }
      if (this.fatalExitReason) {
        throw new Error(this.fatalExitReason);
      }
    } finally {
      this.currentItemId = null;
      this.currentItem = null;
      this.currentDriverTaskId = null;
    }
  }
  /**
   * Run one claimed item:
   *   1. Stage workspace dir under dataDir.
   *   2. driver.dispatch — same call HeadlessServer uses for HTTP dispatch.
   *      (Re-uses HiloApp.openWorkspace + per-workspace gateway+opencode.)
   *   3. Start item-level heartbeat loop (30s) — backend can flip
   *      should_cancel to abort the run early. On cancel, driver.cancelTask
   *      flips the in-flight task to error so waitForTerminal returns
   *      promptly; cancel path still uploads partial artifacts and reports
   *      'cancelled by user' to backend through finalize(cancel).
   *   4. Poll until terminal status.
   *   5. POST the canonical finalize payload back to backend.
   *
   * Explicit model_id selects the Agent model; absent selection uses Hilo defaults.
   *
   * Cleanup (workspace dir + staged attachments) runs only after the
   * eval-item-terminal proof is complete and runtime close succeeds. A stop
   * failure deliberately retains the directory because a live child may still
   * hold its cwd or the files needed for recovery/debugging.
   */
  async runTask(item, onTerminalCallbackSettled) {
    const startedAt = Date.now();
    const executionAttempt = item.execution_attempt ?? 1;
    const isTaskWorker = this.config.workerQueue?.trim() === "task";
    const workspace = this.prepareWorkspace(item);
    const stagingAbort = new AbortController();
    let itemEventSequence = 0;
    const emitItemEvent = (event) => {
      itemEventSequence += 1;
      this.fireItemEvent(item, event, itemEventSequence);
    };
    let userArtifacts = [];
    let sideArtifacts = [];
    let requiredArtifactFailures = [];
    let benchmarkRunDir;
    let completeAck = false;
    let hbTimer;
    let requestedAgentVersion = 2;
    let selectedAgentVersion;
    let durableWorkSettled = true;
    let terminalCallbackSettled = false;
    let terminalCallbackStarted = false;
    let retentionDecisionSettled = false;
    let terminalCancellationObserved = false;
    let terminalBenchmarkSummary;
    let executionOutcome = "fail";
    let itemOutcome = "dispatch-not-started";
    let driverTaskTerminal = false;
    let record;
    const finalize = async (result) => {
      const runtimeFailure = result.outcome === "fail" && (record?.status === "error" || record?.status === "timeout") ? record.error_message?.trim() : void 0;
      const hasEarlierFailure = Boolean(runtimeFailure) && result.outcome === "fail" && runtimeFailure !== result.errorText;
      const failureText = result.outcome === "complete" ? void 0 : hasEarlierFailure ? `${runtimeFailure} (Additional diagnostic: ${result.errorText})` : result.errorText;
      const artifacts = result.outcome === "complete" ? result.payload.artifacts ?? [] : result.artifacts ?? [];
      const tokenUsage = deriveTokenUsage(artifacts);
      const billingSessionId = record?.runtime_session_id ?? record?.session_id;
      const billing = {
        ...tokenUsage ? { token_usage: tokenUsage } : {},
        ...billingSessionId ? { session_id: billingSessionId } : {},
        ...result.outcome !== "complete" && result.benchmarkSummary ? { benchmark_summary: result.benchmarkSummary } : {},
        ...result.outcome !== "complete" && !hasEarlierFailure && result.errorCode ? { error_code: result.errorCode } : {},
        ...result.outcome !== "complete" && !hasEarlierFailure && result.retryable !== void 0 ? { retryable: result.retryable } : {}
      };
      terminalCallbackStarted = true;
      executionOutcome = result.outcome;
      const callbackStartedAt = Date.now();
      const artifactBytes = artifacts.reduce((sum, artifact) => sum + artifact.size_bytes, 0);
      try {
        if (result.outcome === "complete") {
          completeAck = await this.completeItem(item, {
            ...result.payload,
            ...billing
          });
        } else if (result.outcome === "cancel") {
          completeAck = await this.failItem(item, result.errorText, artifacts, billing, "cancel");
        } else {
          completeAck = await this.failItem(
            item,
            failureText ?? result.errorText,
            artifacts,
            billing
          );
        }
        return completeAck;
      } finally {
        terminalCallbackSettled = true;
        onTerminalCallbackSettled?.(completeAck);
        this.logger.info(
          `item=${item.item_id} phase=terminal_callback outcome=${result.outcome} duration_ms=${Date.now() - callbackStartedAt} bytes=${artifactBytes} attempt=${executionAttempt} ack=${completeAck}`
        );
      }
    };
    try {
      try {
        requestedAgentVersion = resolveItemAgentVersion(item.agent_version);
      } catch (err) {
        emitItemEvent({
          kind: "item.started",
          level: "error",
          message: "invalid agent version",
          payload: { error_text: err instanceof Error ? err.message : String(err) }
        });
        await finalize({
          outcome: "fail",
          errorText: err instanceof Error ? err.message : String(err)
        });
        return;
      }
      const prompt = item.case.query_text?.trim() ?? "";
      if (!prompt && !item.case.trajectory_prefix) {
        emitItemEvent({
          kind: "item.started",
          level: "error",
          message: "case.query_text empty"
        });
        await finalize({ outcome: "fail", errorText: "case.query_text empty" });
        return;
      }
      this.logger.info(
        `running item=${item.item_id} run=${item.run_id} agent=v${requestedAgentVersion} workspace=${workspace}`
      );
      emitItemEvent({
        kind: "item.started",
        message: "case started",
        payload: {
          workspace,
          execution_attempt: executionAttempt,
          prompt_chars: prompt.length,
          attachment_count: item.case.attachments?.length ?? 0,
          requested_agent_version: requestedAgentVersion,
          requested_model_id: item.model_id ?? null,
          target_model: {
            id: item.target_model.id,
            name: item.target_model.name,
            provider: item.target_model.provider,
            model_id: item.target_model.model_id
          }
        }
      });
      const cancelled = { value: false, abort: () => stagingAbort.abort() };
      const taskIdRef = { current: null };
      hbTimer = setInterval(() => {
        void this.itemHeartbeatTick(
          item,
          () => taskIdRef.current,
          cancelled,
          () => !terminalCallbackStarted
        ).catch(() => void 0);
      }, EVAL_HEARTBEAT_INTERVAL_MS);
      hbTimer.unref?.();
      let stagedPaths;
      let stagedPrefix;
      try {
        if (item.case.trajectory_prefix) {
          stagedPrefix = await stageTrajectoryPrefix(item.case.trajectory_prefix, workspace, {
            signal: stagingAbort.signal
          });
          stagedPaths = stagedPrefix.materials.map((material) => material.path);
        } else {
          stagedPaths = await this.stageAttachments(item, workspace);
        }
      } catch (err) {
        emitItemEvent({
          kind: "item.staged",
          level: "error",
          message: "attachment staging failed",
          payload: {
            error_text: err instanceof Error ? err.message : String(err)
          }
        });
        await finalize({
          outcome: cancelled.value ? "cancel" : "fail",
          errorText: `attachment staging failed: ${err instanceof Error ? err.message : String(err)}`
        });
        return;
      }
      if (stagedPaths.length > 0) {
        emitItemEvent({
          kind: "item.staged",
          message: `staged ${stagedPaths.length} attachment(s)`,
          payload: {
            attachment_count: stagedPaths.length,
            staged_paths: stagedPaths.map((p) => path.basename(p))
          }
        });
      }
      let materializedSkills;
      if (item.skills?.mounts && item.skills.mounts.length > 0) {
        if (!this.config.capabilityProvider) {
          await finalize({
            outcome: "fail",
            errorText: "skill mounts requested but worker capability provider is not configured"
          });
          return;
        }
        if (!this.config.skillMarketClient) {
          await finalize({
            outcome: "fail",
            errorText: "skill mounts requested but worker skill market client is not configured"
          });
          return;
        }
        try {
          const capability = await this.config.capabilityProvider();
          materializedSkills = await materializeEvalSkillMounts({
            skills: item.skills,
            agentVersion: requestedAgentVersion,
            workspace,
            capability,
            marketClient: this.config.skillMarketClient,
            logger: this.logger
          });
        } catch (err) {
          emitItemEvent({
            kind: "item.skills",
            level: "error",
            message: "skill mount materialization failed",
            payload: {
              error_text: err instanceof Error ? err.message : String(err)
            }
          });
          await finalize({
            outcome: "fail",
            errorText: `skill mount materialization failed: ${err instanceof Error ? err.message : String(err)}`
          });
          return;
        }
        if (materializedSkills && materializedSkills.mounted.length > 0) {
          emitItemEvent({
            kind: "item.skills",
            message: `mounted ${materializedSkills.mounted.length} skill(s)`,
            payload: {
              mounted: materializedSkills.mounted.map((entry) => ({
                agent: entry.agent,
                source: entry.source,
                name: entry.name,
                version: entry.version
              })),
              residual_risk: "OpenCode loads skills from config.skills.paths globally; this worker also injects per-agent permission.skill constraints for mounted skills."
            }
          });
        }
      }
      if (cancelled.value) {
        await finalize({
          outcome: "cancel",
          errorText: "cancelled by backend during staging (no dispatch)"
        });
        return;
      }
      let dispatchedRecord;
      let artifactStartedAt = startedAt;
      try {
        const cloudEnvOverride = this.cloudEnvOverrideForItem(item);
        const preparedPrefix = stagedPrefix;
        dispatchedRecord = await this.driver.dispatch({
          workspace,
          prompt,
          autoConfirmCredit: true,
          ...preparedPrefix ? {
            prepareWorkspace: async (runtime, signal) => {
              const input = await restoreStagedTrajectoryPrefix(
                preparedPrefix,
                workspace,
                runtime,
                signal
              );
              artifactStartedAt = Date.now();
              return input;
            }
          } : {},
          ...item.epoch_id ? { agentRunId: item.epoch_id } : {},
          agentVersion: requestedAgentVersion,
          watermarkEnabled: item.enable_watermark ?? false,
          ...item.model_id ? { modelId: item.model_id } : {},
          // Attachments staged above from case.attachments[] to workspace/attachments/.
          ...!preparedPrefix && stagedPaths.length > 0 ? { attachments: stagedPaths } : {},
          ...cloudEnvOverride ? { cloudEnvOverride } : {},
          ...materializedSkills ? {
            skillsPaths: materializedSkills.skillsPaths,
            evalSkillAgentGrants: materializedSkills.evalSkillAgentGrants
          } : {}
        });
      } catch (err) {
        emitItemEvent({
          kind: "item.dispatch",
          level: "error",
          message: "dispatch failed",
          payload: {
            error_text: err instanceof Error ? err.message : String(err)
          }
        });
        await finalize({
          outcome: "fail",
          errorText: `dispatch failed: ${err instanceof Error ? err.message : String(err)}`
        });
        return;
      }
      record = dispatchedRecord;
      this.currentDriverTaskId = record.task_id;
      taskIdRef.current = record.task_id;
      emitItemEvent({
        kind: "item.dispatch",
        message: "driver dispatch accepted",
        payload: {
          task_id: record.task_id,
          session_id: record.session_id,
          runtime_session_id: record.runtime_session_id,
          gateway_url: record.gateway_url,
          requested_agent_version: requestedAgentVersion
        }
      });
      if (!isTaskWorker && isBenchmarkEnabled(process.env.HILO_BENCHMARK)) {
        const boundRecord = await this.waitForBenchmarkLiveEventBinding(record.task_id);
        await this.registerBenchmarkLiveEventSink(item, boundRecord ?? record);
      }
      if (cancelled.value) {
        this.driver.cancelTask(record.task_id);
        driverTaskTerminal = true;
        itemOutcome = "terminal";
        await finalize({
          outcome: "cancel",
          errorText: "cancelled by backend during dispatch"
        });
        return;
      }
      if (record.gateway_url) {
        await this.pushCloudEnvOverrideToWorkspaceGateway(
          item,
          record.gateway_url,
          workspaceBindingForTask(record),
          record.workspace_claim
        );
      }
      if (item.cloud?.user_token && record.gateway_url) {
        await this.pushCloudUserTokenToWorkspaceGateway(
          item,
          record.gateway_url,
          workspaceBindingForTask(record),
          record.workspace_claim
        );
      }
      emitItemEvent({
        kind: "item.waiting",
        message: "waiting for agent terminal state",
        payload: {
          task_id: record.task_id,
          deadline_at: item.deadline_at ?? null
        }
      });
      const terminal = await this.waitForTerminal(record.task_id, item.deadline_at ?? void 0);
      if (terminal._releasedAndAborted) {
        await this.releaseAttemptSettled;
        driverTaskTerminal = true;
        itemOutcome = "released";
        executionOutcome = "released";
        terminalCallbackSettled = true;
        this.logger.info(`runTask item=${item.item_id} short-circuited: ${terminal.error_message}`);
        return;
      }
      record = terminal;
      driverTaskTerminal = true;
      itemOutcome = "terminal";
      selectedAgentVersion = resolveSelectedAgentVersion(terminal.metadata);
      const duration = Date.now() - startedAt;
      emitItemEvent({
        kind: "item.waiting",
        message: `agent terminal status=${terminal.status}`,
        payload: {
          task_id: terminal.task_id,
          status: terminal.status,
          duration_ms: duration,
          error_text: terminal.error_message,
          session_id: terminal.session_id,
          runtime_session_id: terminal.runtime_session_id,
          requested_agent_version: requestedAgentVersion,
          selected_agent_version: selectedAgentVersion ?? null
        }
      });
      terminalCancellationObserved = cancelled.value || terminal.error_message === "cancelled";
      durableWorkSettled = false;
      if (terminal.metadata && typeof terminal.metadata.benchmark_run_dir === "string") {
        benchmarkRunDir = terminal.metadata.benchmark_run_dir;
        this.logger.info(
          `item=${item.item_id} benchmark_run_dir from driver enrich: ${benchmarkRunDir}`
        );
      } else if (isBenchmarkEnabled(process.env.HILO_BENCHMARK)) {
        benchmarkRunDir = await resolveBenchmarkRunDirFromFsWalk({
          benchmarkRoot: process.env.HILO_BENCHMARK_DIR,
          sessionId: terminal.session_id ?? "",
          runtimeSessionId: terminal.runtime_session_id ?? null,
          workspace,
          startedAtMs: startedAt,
          logger: this.logger
        });
        if (benchmarkRunDir) {
          this.logger.info(
            `item=${item.item_id} benchmark_run_dir from fs walk fallback: ${benchmarkRunDir}`
          );
        }
      }
      const exportSessionId = terminal.runtime_session_id ?? terminal.session_id;
      const artifactCollectionStartedAt = Date.now();
      if (exportSessionId && terminal.gateway_url) {
        const collected = normalizeCollectedArtifacts(
          await collectAndUploadArtifacts({
            runId: item.run_id,
            itemId: item.item_id,
            sessionId: exportSessionId,
            gatewayUrl: terminal.gateway_url,
            workspaceBinding: workspaceBindingForTask(terminal),
            workspaceClaim: terminal.workspace_claim,
            // Per-task workspace mode (pre-0.0.263+): gateway boots with
            // WORKSPACE_DIR=<task workspace>, so WorkspacePathService.baseDir
            // is the task workspace path, and agents write generated assets
            // (jpg / mp4 / mp3 / ...) under it — NOT under OUTPUT_DIR like
            // the old shared-home-gateway layout. Point the collector at
            // the workspace so collectGeneratedFiles' fs walk finds them.
            // Attachments also live under workspace (see stageAttachments)
            // and get wiped with the workspace by the outer cleanup.
            outputFilesRoot: workspace,
            workspace,
            startedAtMs: artifactStartedAt,
            logger: this.logger,
            benchmarkRunDir,
            artifactUploader: this.artifactUploaderFor(item),
            requireGeneratedArtifacts: isTaskWorker
          })
        );
        userArtifacts = collected.userArtifacts;
        sideArtifacts = collected.sideArtifacts;
        requiredArtifactFailures = collected.requiredArtifactFailures ?? [];
      } else {
        this.logger.warn(
          `skipping artifact collection: runtime_session_id=${terminal.runtime_session_id} session_id=${terminal.session_id} gateway_url=${terminal.gateway_url}`
        );
        if (isTaskWorker) {
          requiredArtifactFailures = ["runtime session or gateway URL missing"];
        }
      }
      durableWorkSettled = true;
      const artifactCollectionDurationMs = Date.now() - artifactCollectionStartedAt;
      const collectedArtifactBytes = [...userArtifacts, ...sideArtifacts].reduce(
        (sum, artifact) => sum + artifact.size_bytes,
        0
      );
      this.logger.info(
        `item=${item.item_id} phase=artifact_collection duration_ms=${artifactCollectionDurationMs} bytes=${collectedArtifactBytes} attempt=${executionAttempt} artifact_count=${userArtifacts.length + sideArtifacts.length}`
      );
      if (selectedAgentVersion === void 0) {
        const partialArtifacts = resequenceArtifacts([...userArtifacts, ...sideArtifacts]);
        await finalize({
          outcome: "fail",
          errorText: "selected agent version missing from runtime metadata",
          artifacts: partialArtifacts
        });
        return;
      }
      const actualAgentVersion = resolveActualAgentVersion(sideArtifacts);
      userArtifacts = addAgentVersionMetadata(userArtifacts, {
        requestedAgentVersion,
        selectedAgentVersion,
        actualAgentVersion
      });
      sideArtifacts = addAgentVersionMetadata(sideArtifacts, {
        requestedAgentVersion,
        selectedAgentVersion,
        actualAgentVersion
      });
      const benchmarkSummary = this.buildBenchmarkSummary(sideArtifacts);
      terminalBenchmarkSummary = benchmarkSummary;
      const durableArtifacts = resequenceArtifacts([...userArtifacts, ...sideArtifacts]);
      const durableArtifactBytes = durableArtifacts.reduce(
        (sum, artifact) => sum + artifact.size_bytes,
        0
      );
      emitItemEvent({
        kind: "item.artifact",
        message: `collected ${userArtifacts.length} artifact(s)`,
        payload: {
          artifact_count: userArtifacts.length,
          artifacts: summarizeArtifactsForEvent(userArtifacts),
          artifacts_truncated: userArtifacts.length > ITEM_EVENT_ARTIFACT_SUMMARY_LIMIT,
          side_artifact_count: sideArtifacts.length,
          side_artifacts: summarizeArtifactsForEvent(sideArtifacts),
          side_artifacts_truncated: sideArtifacts.length > ITEM_EVENT_ARTIFACT_SUMMARY_LIMIT,
          benchmark_run_dir: benchmarkRunDir ?? null,
          requested_agent_version: requestedAgentVersion,
          selected_agent_version: selectedAgentVersion,
          actual_agent_version: actualAgentVersion ?? null,
          phase: "artifact_collection",
          duration_ms: artifactCollectionDurationMs,
          artifact_bytes: durableArtifactBytes,
          attempt: executionAttempt
        }
      });
      if (terminalCancellationObserved || cancelled.value) {
        await finalize({
          outcome: "cancel",
          errorText: "cancelled by user",
          artifacts: durableArtifacts,
          benchmarkSummary
        });
        return;
      }
      if (isTaskWorker && (requiredArtifactFailures.length > 0 || userArtifacts.length === 0)) {
        const failure = requiredArtifactFailures[0] ?? "no generated customer artifact was collected";
        await finalize({
          outcome: "fail",
          errorText: `required artifact upload failed: ${failure}`,
          errorCode: "artifact_upload_failed",
          retryable: true,
          artifacts: durableArtifacts,
          benchmarkSummary
        });
        return;
      }
      const benchmarkEventIntegrityIssue = deriveBenchmarkEventIntegrityIssue(
        sideArtifacts,
        requestedAgentVersion
      );
      if (benchmarkEventIntegrityIssue) {
        const benchmarkMeta = sideArtifacts.find(
          (artifact) => artifact.kind === "benchmark_run"
        )?.meta;
        const rawSources = benchmarkMeta?.sources;
        const eventSource = rawSources && typeof rawSources === "object" && !Array.isArray(rawSources) ? rawSources.eventsJsonl : void 0;
        this.logger.warn(
          `item=${item.item_id} benchmark auxiliary evidence incomplete: ${benchmarkEventIntegrityIssue}`
        );
        emitItemEvent({
          kind: "item.benchmark_integrity",
          level: "warn",
          message: benchmarkEventIntegrityIssue,
          payload: {
            integrity_issue: benchmarkEventIntegrityIssue,
            schema_version: benchmarkMeta?.schema_version ?? "missing",
            events_jsonl: typeof eventSource === "string" ? eventSource : "missing",
            dropped_count: benchmarkMeta?.dropped_count ?? "missing",
            attribution_dropped: benchmarkMeta?.attribution_dropped ?? "missing"
          }
        });
      }
      const benchmarkTerminalFailure = deriveBenchmarkTerminalFailure(
        sideArtifacts,
        requestedAgentVersion
      );
      if (benchmarkTerminalFailure) {
        await finalize({
          outcome: "fail",
          errorText: benchmarkTerminalFailure,
          artifacts: durableArtifacts,
          benchmarkSummary
        });
        return;
      }
      if (actualAgentVersion === void 0) {
        await finalize({
          outcome: "fail",
          errorText: "actual agent version missing from gateway run metadata",
          artifacts: durableArtifacts,
          benchmarkSummary
        });
        return;
      }
      if (selectedAgentVersion !== requestedAgentVersion || actualAgentVersion !== selectedAgentVersion) {
        await finalize({
          outcome: "fail",
          errorText: `agent version mismatch: requested=v${requestedAgentVersion} selected=v${selectedAgentVersion} actual=v${actualAgentVersion}`,
          artifacts: durableArtifacts,
          benchmarkSummary
        });
        return;
      }
      if (terminal.status === "completed") {
        await finalize({
          outcome: "complete",
          payload: {
            claim_token: item.claim_token,
            result_summary: (
              // Stage 1: pull a summary string from task metadata if available;
              // otherwise note "completed" — stage 2 wires raw_output_json
              // proper from the opencode session db.
              terminal.metadata?.summary?.slice(0, 500) ?? "completed"
            ),
            artifacts: durableArtifacts,
            duration_ms: duration,
            ...benchmarkSummary ? { benchmark_summary: benchmarkSummary } : {}
          }
        });
      } else {
        await finalize({
          outcome: "fail",
          errorText: terminal.error_message ?? `terminated with status=${terminal.status}`,
          artifacts: durableArtifacts,
          benchmarkSummary
        });
      }
    } catch (err) {
      durableWorkSettled = true;
      if (record && !driverTaskTerminal) {
        this.driver.cancelTask(record.task_id);
        driverTaskTerminal = true;
        itemOutcome = "terminal";
      }
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`runTask item=${item.item_id} unexpected error: ${message}`);
      if (!terminalCallbackSettled) {
        try {
          await finalize({
            outcome: terminalCancellationObserved ? "cancel" : "fail",
            errorText: `worker internal error: ${message}`,
            artifacts: [...userArtifacts, ...sideArtifacts],
            benchmarkSummary: terminalBenchmarkSummary
          });
        } catch (reportErr) {
          this.logger.warn(
            `terminal fail callback threw item=${item.item_id}: ${reportErr instanceof Error ? reportErr.message : String(reportErr)}`
          );
        }
      }
    } finally {
      stagingAbort.abort();
      this.metrics.observeExecution(
        this.metricsQueue,
        executionOutcome,
        (Date.now() - startedAt) / 1e3
      );
      if (hbTimer) clearInterval(hbTimer);
      this.currentArtifactUploadAbort = null;
      if (record && !driverTaskTerminal) {
        this.driver.cancelTask(record.task_id);
        driverTaskTerminal = true;
        itemOutcome = "terminal";
      }
      const uploaded = sideArtifacts.find((artifact) => artifact.kind === "benchmark_run");
      const shouldCleanupBenchmarkRun = Boolean(uploaded && completeAck);
      if (uploaded && !completeAck) {
        this.logger.warn(
          `benchmark runDir ${benchmarkRunDir} retained for debug (complete/fail ack failed; COS uploaded but backend write failed)`
        );
      } else if (benchmarkRunDir && !uploaded) {
        this.logger.warn(
          `benchmark runDir ${benchmarkRunDir} retained for debug (finalize/upload did not produce a durable benchmark artifact)`
        );
      }
      retentionDecisionSettled = true;
      if (record?.gateway_url) {
        await this.clearCloudEnvOverrideOnWorkspaceGateway(
          record.gateway_url,
          workspaceBindingForTask(record),
          record.workspace_claim
        );
      }
      let runtimeClosed = false;
      if (durableWorkSettled && terminalCallbackSettled && retentionDecisionSettled) {
        try {
          await this.driver.closeWorkspace(workspace, {
            phase: "eval-item-terminal",
            itemOutcome,
            durableWorkSettled: true,
            terminalCallbackSettled: true,
            retentionDecisionSettled: true
          });
          runtimeClosed = true;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.fatalExitReason ??= `item=${item.item_id}: ${message}`;
          this.acceptingClaims = false;
          this.logger.error(
            `runtime close failed item=${item.item_id}; worker stopped accepting claims and will exit for supervisor restart: ${message}`
          );
          this.logger.warn(
            `runtime close failed item=${item.item_id}; workspace retained at ${workspace}: ${message}`
          );
        }
      } else {
        this.logger.warn(
          `runtime close skipped item=${item.item_id}: eval-item-terminal proof incomplete (durable=${durableWorkSettled} callback=${terminalCallbackSettled} retention=${retentionDecisionSettled})`
        );
      }
      if (runtimeClosed) {
        this.cleanupWorkspace(item, workspace);
      }
      if (shouldCleanupBenchmarkRun) {
        await cleanupBenchmarkRunDir(benchmarkRunDir, this.logger);
      }
      this.currentDriverTaskId = null;
    }
  }
  /**
   * Phase 2 R3-4 sync helper — derives the 5-field BenchmarkSummary
   * subset for `ItemCompletePayload.benchmark_summary` from the
   * `benchmark_run` ArtifactInput's `meta`. Returns undefined when the
   * collector didn't produce a benchmark_run artifact (mode off, fs
   * walk miss, finalize timeout, oversized dir guard) so the caller
   * can spread `...(summary ? { benchmark_summary: summary } : {})`
   * and skip the field cleanly.
   *
   * MUST stay 1:1 with the meta keys collectBenchmarkRun writes — if
   * anyone refactors collectBenchmarkRun later they MUST update this
   * helper in lockstep, otherwise the run-list UI silently shows blank
   * values while eval_artifacts.meta_json still has them.
   */
  buildBenchmarkSummary(artifacts) {
    return deriveBenchmarkSummary(artifacts);
  }
  /**
   * Phase 2 retention sweep loop — every 24h, removes
   * <HILO_BENCHMARK_DIR>/<UTC日期>/ entries older than 7 days. First
   * tick fires 10 min after start to skip the pod boot IO peak.
   *
   * Round 1 S5 fix: tick body wraps in try/catch and reschedules in
   * `finally`, so an unhandled exception (EACCES, dead symlink,
   * fsp.readdir thrown outside the inner loop) doesn't permanently
   * halt retention — the next tick still fires.
   */
  startBenchmarkSweepLoop() {
    const initialDelayMs = 10 * 60 * 1e3;
    const periodMs = 24 * 3600 * 1e3;
    const retentionDays = 7;
    const tick = async () => {
      if (!this.running) return;
      try {
        const root = process.env.HILO_BENCHMARK_DIR;
        if (root) {
          await sweepOldBenchmarkDirs(root, retentionDays, this.logger);
        }
      } catch (err) {
        this.logger.warn(
          `benchmark sweep tick threw: ${err instanceof Error ? err.message : String(err)}`
        );
      } finally {
        if (this.running) {
          this.benchmarkSweepTimer = setTimeout(() => {
            void tick();
          }, periodMs);
          this.benchmarkSweepTimer.unref?.();
        }
      }
    };
    this.benchmarkSweepTimer = setTimeout(() => {
      void tick();
    }, initialDelayMs);
    this.benchmarkSweepTimer.unref?.();
  }
  /**
   * Single heartbeat round-trip against
   * `POST /api/eval/external/items/{id}/heartbeat`. Returns silently
   * on transport errors (the outer setInterval keeps trying) so a
   * transient backend hiccup never turns into a worker crash. It always
   * renews the lease, including while a terminal callback is in flight;
   * `canApplyCancellation` only gates whether a should_cancel ack may
   * still mutate local terminal semantics.
   */
  async itemHeartbeatTick(item, getTaskId, cancelled, canApplyCancellation) {
    try {
      const resp = await this.post(
        reportPath(item, "heartbeat"),
        void 0,
        {
          claim_token: item.claim_token,
          ...item.epoch_id ? { epoch_id: item.epoch_id } : {}
        },
        { callback: item.callback }
      );
      if (!resp.ok) {
        this.metrics.observeHeartbeat("item", "http_error");
        await resp.text().catch(() => "");
        return;
      }
      const ack = await resp.json();
      const ownershipLost = ack.owner === false;
      this.metrics.observeHeartbeat("item", ownershipLost ? "ownership_lost" : "success");
      const shouldAbort = ack.should_cancel || ownershipLost;
      if (shouldAbort && !cancelled.value && canApplyCancellation()) {
        cancelled.value = true;
        cancelled.abort?.();
        const taskId = getTaskId();
        const cause = ownershipLost ? "ownership lost (claim reaped or re-assigned)" : "cancelled by backend";
        if (taskId) {
          this.logger.info(`item=${item.item_id} ${cause}; aborting task=${taskId}`);
          this.driver.cancelTask(taskId);
        } else {
          this.logger.info(`item=${item.item_id} ${cause} during staging; will skip dispatch`);
        }
      }
    } catch (err) {
      this.metrics.observeHeartbeat("item", "transport_error");
      this.logger.warn(
        `item heartbeat error item=${item.item_id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  /**
   * Best-effort rm of the per-task workspace + staged attachments
   * directory. Runs in `runTask`'s finally only after runtime close succeeds;
   * close failure retains the workspace. We deliberately do NOT touch the main
   * OUTPUT_DIR — generated_files (already uploaded to swing) live
   * there and may be shared with the user-facing desktop instance.
   */
  cleanupWorkspace(item, workspace) {
    try {
      fs.rmSync(workspace, { recursive: true, force: true });
      this.logger.info(`cleaned workspace for item=${item.item_id}`);
    } catch (err) {
      this.logger.warn(
        `cleanup failed item=${item.item_id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  prepareWorkspace(item) {
    const executionIdentity = item.epoch_id ? `epoch-${item.epoch_id}` : `attempt-${item.execution_attempt ?? 1}`;
    const dir = path.join(
      this.config.dataDir,
      "eval",
      `run-${item.run_id}-item-${item.item_id}-${executionIdentity}`
    );
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
  /**
   * Stage case attachments in the workspace before dispatch. Kept as a thin
   * method so the worker lifecycle has one seam for tests and instrumentation.
   */
  async stageAttachments(item, workspace) {
    return stageEvalAttachments(item, workspace, this.logger);
  }
  async waitForTerminal(taskId, deadlineIso) {
    const wallDeadline = (deadlineIso ? new Date(deadlineIso).getTime() : 0) || Date.now() + TASK_TIMEOUT_DEFAULT_MS;
    let workerDeadlineError;
    while (!this.abortInFlight) {
      const rec = this.driver.getTask(taskId);
      if (!rec) {
        return {
          task_id: taskId,
          status: "error",
          workspace: "",
          prompt: "",
          started_at: "",
          last_event_at: "",
          error_message: `driver lost task ${taskId}`
        };
      }
      if (TERMINAL_STATUSES.has(rec.status)) {
        return workerDeadlineError ? { ...rec, status: "timeout", error_message: workerDeadlineError } : rec;
      }
      if (!workerDeadlineError && Date.now() > wallDeadline) {
        workerDeadlineError = `worker-side deadline ${new Date(wallDeadline).toISOString()} reached`;
        this.logger.warn(
          `${workerDeadlineError}; cancelling driver task=${taskId} before terminal reporting`
        );
        this.driver.cancelTask(taskId);
        continue;
      }
      await sleep(TASK_POLL_INTERVAL_MS, () => !this.abortInFlight);
    }
    return {
      task_id: taskId,
      status: "error",
      workspace: "",
      prompt: "",
      started_at: "",
      last_event_at: "",
      error_message: "waitForTerminal aborted: item released back to Pending (releaseCurrentItem set abortInFlight=true)",
      // Non-standard sentinel field; runTask reads it via `terminal._releasedAndAborted`
      // (typed as `any` access) so we don't have to widen TaskRecord schema
      // for a single internal short-circuit signal.
      _releasedAndAborted: true
    };
  }
  // ─────────────────────────── Item lifecycle posts ───────────────────────────
  async completeItem(item, payload) {
    return this.finalizeItem(item, { outcome: "complete", ...payload });
  }
  async failItem(item, errorText, artifacts = [], billing = {}, outcome = "fail") {
    const payload = {
      claim_token: item.claim_token,
      error_text: errorText,
      artifacts,
      ...billing.token_usage ? { token_usage: billing.token_usage } : {},
      ...billing.session_id ? { session_id: billing.session_id } : {},
      ...billing.benchmark_summary ? { benchmark_summary: billing.benchmark_summary } : {},
      ...billing.error_code ? { error_code: billing.error_code } : {},
      ...billing.retryable !== void 0 ? { retryable: billing.retryable } : {}
    };
    return this.finalizeItem(item, { outcome, ...payload });
  }
  async finalizeItem(item, payload) {
    const body = {
      ...payload,
      ...item.epoch_id ? { epoch_id: item.epoch_id } : {}
    };
    const startedAt = Date.now();
    try {
      const acknowledged = await deliverFinalize({
        itemId: item.item_id,
        payload,
        logger: this.logger,
        // One terminal endpoint for all outcomes. The backend is idempotent by
        // (owner, epoch, claim), so transport retries cannot double-settle.
        send: () => this.post(reportPath(item, "finalize"), void 0, body, {
          timeoutMs: 6e4,
          callback: item.callback
        })
      });
      this.metrics.observeFinalize(
        this.metricsQueue,
        payload.outcome,
        acknowledged ? "ack" : "not_ack",
        (Date.now() - startedAt) / 1e3
      );
      return acknowledged;
    } catch (error) {
      this.metrics.observeFinalize(
        this.metricsQueue,
        payload.outcome,
        "error",
        (Date.now() - startedAt) / 1e3
      );
      throw error;
    }
  }
  artifactUploaderFor(item) {
    const uploadAbort = new AbortController();
    this.currentArtifactUploadAbort = uploadAbort;
    return createItemArtifactUploader({
      item,
      workerQueue: this.config.workerQueue,
      workerRegion: this.config.workerRegion,
      signal: uploadAbort.signal,
      postReservation: (pathname, payload, callback) => this.post(pathname, void 0, payload, { timeoutMs: 3e4, callback })
    });
  }
  async registerBenchmarkLiveEventSink(item, record) {
    if (!record.session_id || !record.gateway_url) {
      this.logger.warn(
        `benchmark live event sink register item=${item.item_id} skipped: session_id/gateway_url missing task=${record.task_id}`
      );
      return;
    }
    const url = new URL("/api/benchmark/live-events/register", record.gateway_url).toString();
    const headers = {
      "Content-Type": "application/json",
      ...workspaceHeadersForTask(record)
    };
    const token = process.env.HILO_BENCHMARK_INTERVENE_TOKEN?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;
    const body = {
      sessionID: record.session_id,
      itemID: item.item_id,
      claimToken: item.claim_token,
      eventsUrl: reportUrl(item, "events", this.config.backendUrl),
      headers: item.callback?.headers ?? {},
      nextSequence: BENCHMARK_LIVE_EVENT_NEXT_SEQUENCE
    };
    let lastFailure = "";
    for (let attempt = 0; attempt <= BENCHMARK_LIVE_EVENT_REGISTER_RETRIES; attempt++) {
      if (this.abortInFlight) return;
      if (attempt > 0) {
        await sleep(BENCHMARK_LIVE_EVENT_REGISTER_RETRY_DELAY_MS, () => !this.abortInFlight);
      }
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(ITEM_EVENT_POST_TIMEOUT_MS)
        });
        if (resp.ok) {
          await resp.text().catch(() => "");
          if (attempt > 0) {
            this.logger.info(
              `benchmark live event sink register item=${item.item_id} succeeded on retry ${attempt}`
            );
          }
          return;
        }
        lastFailure = `HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`;
      } catch (err) {
        lastFailure = `request error: ${err instanceof Error ? err.message : String(err)}`;
      }
      this.logger.warn(
        `benchmark live event sink register item=${item.item_id} attempt ${attempt + 1}/${BENCHMARK_LIVE_EVENT_REGISTER_RETRIES + 1} failed: ${lastFailure}`
      );
    }
    this.logger.warn(
      `benchmark live event sink register item=${item.item_id} gave up; live events for this item will not reach the platform (${lastFailure})`
    );
  }
  async waitForBenchmarkLiveEventBinding(taskId) {
    const deadline = Date.now() + BENCHMARK_LIVE_EVENT_BIND_TIMEOUT_MS;
    while (Date.now() < deadline && !this.abortInFlight) {
      const rec = this.driver.getTask(taskId);
      if (rec?.session_id && rec.gateway_url) return rec;
      await sleep(BENCHMARK_LIVE_EVENT_BIND_POLL_MS, () => !this.abortInFlight);
    }
    return this.driver.getTask(taskId);
  }
  async emitItemEvent(item, event) {
    const sequence = event.sequence ?? 1;
    const occurredAt = event.occurred_at ?? (/* @__PURE__ */ new Date()).toISOString();
    const payload = {
      claim_token: item.claim_token,
      level: "info",
      ...event,
      ...item.epoch_id ? { epoch_id: item.epoch_id } : {},
      sequence,
      occurred_at: occurredAt,
      payload: {
        sequence,
        occurred_at: occurredAt,
        ...event.payload ?? {}
      }
    };
    let resp;
    try {
      resp = await this.post(reportPath(item, "events"), void 0, payload, {
        timeoutMs: ITEM_EVENT_POST_TIMEOUT_MS,
        callback: item.callback
      });
    } catch (err) {
      this.logger.warn(
        `item event ${payload.kind} item=${item.item_id} request error: ${err instanceof Error ? err.message : String(err)}`
      );
      return false;
    }
    if (!resp.ok) {
      const text = await resp.text().catch(() => "<unreadable response body>");
      this.logger.warn(
        `item event ${payload.kind} item=${item.item_id} HTTP ${resp.status}: ${text.slice(
          0,
          200
        )}`
      );
      return false;
    }
    await resp.text().catch(() => "");
    return true;
  }
  fireItemEvent(item, event, sequence) {
    void this.emitItemEvent(item, {
      ...event,
      sequence,
      occurred_at: (/* @__PURE__ */ new Date()).toISOString()
    }).catch((err) => {
      this.logger.warn(
        `item event ${event.kind} item=${item.item_id} unexpected error: ${err instanceof Error ? err.message : String(err)}`
      );
    });
  }
  /**
   * Push the run-creator's cloud user token to the workspace gateway's
   * TokenService so cloud-bound MCP tools (image / video / audio gen)
   * bill the right account for THIS run. Mirrors what `hilo-app` does
   * via `broadcastPost('/api/auth/token', ...)` in GUI mode — gateway's
   * `auth.controller.ts` exposes ``POST /api/auth/token`` accepting
   * ``{ token: string | null }``.
   *
   * Best-effort: errors logged but don't fail the dispatch. The fleet
   * default token (lane env ``HILO_USER_TOKEN``) was already injected
   * at gateway boot, so a failed override means the gen happens on the
   * fleet's bot account instead of the per-run account — degraded but
   * not broken.
   */
  async pushCloudUserTokenToWorkspaceGateway(item, gatewayUrl, workspaceBinding, workspaceClaim) {
    const token = item.cloud?.user_token;
    if (!token) return;
    try {
      const url = new URL("/api/auth/token", gatewayUrl).toString();
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...workspaceBinding ? workspaceGatewayIdentityHeaders(workspaceBinding) : workspaceClaim ? { [HILO_WORKSPACE_IDENTITY_HEADER]: workspaceClaim } : {}
        },
        body: JSON.stringify({ token }),
        signal: AbortSignal.timeout(5e3)
      });
      if (!resp.ok) {
        this.logger.warn(
          `cloud token rotate item=${item.item_id} HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`
        );
        return;
      }
    } catch (err) {
      this.logger.warn(
        `cloud token rotate item=${item.item_id} error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  cloudEnvOverrideForItem(item) {
    const override = {};
    if (item.cloud?.region) override.region = item.cloud.region;
    if (item.cloud?.channel) override.channel = item.cloud.channel;
    if (item.cloud?.user_token) override.user_token = item.cloud.user_token;
    if (item.hilo_lane) override.hiloLane = item.hilo_lane;
    return Object.keys(override).length > 0 ? override : void 0;
  }
  /**
   * Push per-task cloud-env override (region / channel / lane) to the
   * workspace gateway. POSTs `/api/cloud-env/config` — bundles all
   * three axes in one call so the swap is atomic from the worker's
   * point of view.
   *
   * No-op when envelope carries no override (= the main path), so this
   * call is safe to make unconditionally per item. Best-effort with a
   * 5s timeout: errors are logged but never fail the dispatch — the
   * worker pod's lane-spawn env (HILO_RELEASE_REGION /
   * HILO_RELEASE_CHANNEL / LANE) already sets the fleet default at
   * boot, so a failed override means the task hits the fleet default
   * endpoint instead of the per-run target — degraded but not broken.
   *
   * Pairs with `clearCloudEnvOverrideOnWorkspaceGateway` in the
   * runTask finally block — the override is per-task and must not
   * leak into the next item this pod claims.
   */
  async pushCloudEnvOverrideToWorkspaceGateway(item, gatewayUrl, workspaceBinding, workspaceClaim) {
    const region = item.cloud?.region;
    const channel = item.cloud?.channel;
    const lane = item.hilo_lane;
    if (!region && !channel && !lane) return;
    try {
      const url = new URL("/api/cloud-env/config", gatewayUrl).toString();
      const body = {};
      if (region) body.region = region;
      if (channel) body.channel = channel;
      if (lane) body.lane = lane;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...workspaceBinding ? workspaceGatewayIdentityHeaders(workspaceBinding) : workspaceClaim ? { [HILO_WORKSPACE_IDENTITY_HEADER]: workspaceClaim } : {}
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5e3)
      });
      if (!resp.ok) {
        this.logger.warn(
          `cloud-env override item=${item.item_id} HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`
        );
        return;
      }
    } catch (err) {
      this.logger.warn(
        `cloud-env override item=${item.item_id} error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  /**
   * Best-effort POST `/api/cloud-env/config` with `null` to clear any
   * per-task override left by the previous item, so the NEXT item
   * starts on lane-default routing. Idempotent — also safe to call
   * when no override was ever set (gateway treats it as no-op).
   */
  async clearCloudEnvOverrideOnWorkspaceGateway(gatewayUrl, workspaceBinding, workspaceClaim) {
    try {
      const url = new URL("/api/cloud-env/config", gatewayUrl).toString();
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...workspaceBinding ? workspaceGatewayIdentityHeaders(workspaceBinding) : workspaceClaim ? { [HILO_WORKSPACE_IDENTITY_HEADER]: workspaceClaim } : {}
        },
        body: "null",
        signal: AbortSignal.timeout(5e3)
      });
      if (!resp.ok) {
        this.logger.warn(
          `cloud-env override clear HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`
        );
      }
    } catch (err) {
      this.logger.warn(
        `cloud-env override clear error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  // ─────────────────────────── HTTP helper ───────────────────────────
  /**
   * Lane-level POST helper. Backend dropped fleet-Bearer 2026-05
   * (internal cluster network is the trust boundary), so the `bearer`
   * argument is kept for back-compat with old callers but ignored.
   *
   * R2 deep-review G2 fix: every call gets a per-request AbortSignal
   * timeout. The original signature returned a bare fetch() without a
   * signal — backend connection accepted then hung would deadlock the
   * caller indefinitely. For finalize this means runTask never
   * enters its outer finally → hbTimer / cleanupWorkspace / benchmark
   * retention gate all skipped, directly breaking the R2-M3 hbTimer-
   * extended-to-finally invariant. Default 30s covers heartbeat /
   * release / claim; finalize uses 60s for slower DB writes.
   *
   * R5 deep-review H3 fix: per-item callers may pass ``opts.callback`` to
   * route the request to a run-creator-supplied URL instead of the lane
   * backend (laptop dev tunnel / CI orchestrator / third-party scheduler).
   * Headers from callback are merged on top of the default headers.
   */
  post(pathname, _bearer, body, opts = {}) {
    const base = opts.callback?.url ?? this.config.backendUrl;
    const url = new URL(pathname, base).toString();
    const timeoutMs = opts.timeoutMs ?? 3e4;
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...opts.callback?.headers ?? {}
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs)
    });
  }
}
const BENCHMARK_INTERRUPTED_FINALIZE_REASONS = /* @__PURE__ */ new Set([
  "inactivity_timeout",
  "ws_toggle",
  "shutdown",
  "budget_exceeded",
  "fake_completion_loop_detected",
  "llm_call_budget_exceeded",
  "auto_responder_llm_invalid",
  "auto_responder_reply_failed",
  "auto_responder_max_calls_exceeded",
  "auto_responder_preset_failed"
]);
function deriveBenchmarkEventIntegrityIssue(artifacts, _requestedAgentVersion) {
  const benchmarkArtifact = artifacts.find((artifact) => artifact.kind === "benchmark_run");
  const meta = benchmarkArtifact?.meta;
  const rawSources = meta?.sources;
  const sources = rawSources && typeof rawSources === "object" && !Array.isArray(rawSources) ? rawSources : null;
  const eventsJsonl = sources?.eventsJsonl;
  if (typeof eventsJsonl !== "string" || eventsJsonl !== "ok") {
    return `benchmark event stream incomplete: eventsJsonl=${typeof eventsJsonl === "string" ? eventsJsonl : "missing"}`;
  }
  const droppedCount = meta?.dropped_count;
  const attributionDropped = meta?.attribution_dropped;
  const hasValidDropCounter = (value) => typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0;
  if (!hasValidDropCounter(droppedCount) || !hasValidDropCounter(attributionDropped)) {
    return `benchmark event counters invalid: dropped=${formatBenchmarkCounter(droppedCount)}, attributionDropped=${formatBenchmarkCounter(attributionDropped)}`;
  }
  if (droppedCount !== 0 || attributionDropped !== 0) {
    return `benchmark event stream incomplete: dropped=${droppedCount}, attributionDropped=${attributionDropped}`;
  }
  return void 0;
}
function deriveBenchmarkTerminalFailure(artifacts, _requestedAgentVersion) {
  const benchmarkArtifact = artifacts.find((artifact) => artifact.kind === "benchmark_run");
  const meta = benchmarkArtifact?.meta;
  const runStatus = meta?.run_status;
  const finalizeReason = meta?.finalize_reason;
  const rawSources = meta?.sources;
  const sources = rawSources && typeof rawSources === "object" && !Array.isArray(rawSources) ? rawSources : null;
  const opencodeDbSnapshot = sources?.opencodeDbSnapshot;
  if (typeof opencodeDbSnapshot !== "string") {
    return "Execution records could not be collected; task completion cannot be verified (opencodeDbSnapshot=missing)";
  }
  if (typeof opencodeDbSnapshot !== "string" || opencodeDbSnapshot !== "ok") {
    return `benchmark core snapshot incomplete: opencodeDbSnapshot=${typeof opencodeDbSnapshot === "string" ? opencodeDbSnapshot : "missing"}`;
  }
  if (runStatus === "aborted" || runStatus === "error") {
    return `benchmark run ${runStatus}${typeof finalizeReason === "string" && finalizeReason.length > 0 ? `: ${finalizeReason}` : ""}`;
  }
  if (finalizeReason === "nudge_cap_exceeded") {
    return "benchmark supervisor exceeded nudge cap";
  }
  if (finalizeReason === "supervisor_stuck") {
    return "benchmark supervisor marked the agent stuck";
  }
  if (typeof finalizeReason === "string" && BENCHMARK_INTERRUPTED_FINALIZE_REASONS.has(finalizeReason)) {
    return `benchmark run ${typeof runStatus === "string" ? runStatus : "completed"}: ${finalizeReason}`;
  }
  if (!isBenchmarkCompletionProven(runStatus, finalizeReason)) {
    return `benchmark completion not proven: status=${typeof runStatus === "string" && runStatus.length > 0 ? runStatus : "missing"}, finalizeReason=${typeof finalizeReason === "string" && finalizeReason.length > 0 ? finalizeReason : "missing"}`;
  }
  return void 0;
}
function formatBenchmarkCounter(value) {
  if (value === void 0) return "missing";
  if (typeof value === "number" && Number.isNaN(value)) return "NaN";
  if (typeof value === "string") return JSON.stringify(value);
  return String(value);
}
function sleep(ms, stillRunning) {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (!stillRunning()) {
        resolve();
        return;
      }
      const left = ms - (Date.now() - start);
      if (left <= 0) {
        resolve();
        return;
      }
      setTimeout(tick, Math.min(left, 250));
    };
    tick();
  });
}
function resolveEvalWorkerBuildRef(buildRef, pushedItemPath) {
  const normalizedBuildRef = buildRef?.trim();
  if (normalizedBuildRef) return normalizedBuildRef;
  if (pushedItemPath?.trim()) return "e2b-push";
  throw new Error("HUB_BUILD_REF is required outside one-shot push mode");
}
async function runPushedItemFromFile(itemPath, execute) {
  const normalizedPath = itemPath.trim();
  if (!normalizedPath) throw new Error("EVAL_PUSH_ITEM_PATH must not be empty");
  const raw = await readFile(normalizedPath, "utf8");
  const item = normalizeClaimedItem(JSON.parse(raw));
  await execute(item);
}
async function runEvalWorkerProcessMode(options) {
  const pushedItemPath = options.pushedItemPath?.trim();
  if (!pushedItemPath) {
    options.worker.start();
    return "pull";
  }
  try {
    await runPushedItemFromFile(pushedItemPath, (item) => options.worker.runPushedItem(item));
  } finally {
    await Promise.all([options.shutdownDriver(), options.closeMetrics()]);
  }
  return "push";
}
function envRequired(name) {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`[headless-worker] FATAL: env ${name} is required`);
    process.exit(1);
  }
  return v;
}
function envOpt(name, fallback) {
  const v = process.env[name]?.trim();
  return v && v.length > 0 ? v : fallback;
}
function resolveDataDir() {
  return envOpt("HILO_DATA_DIR", path.join(os.homedir(), ".hub"));
}
function resolveOpencodeBinary(dataRoot) {
  const explicit = process.env.HILO_OPENCODE_BINARY?.trim();
  if (explicit) return explicit;
  const baked = "/opt/opencode/bin/opencode";
  if (fs.existsSync(baked)) return baked;
  return path.join(dataRoot, "opencode", "bin", "opencode");
}
function resolveGatewayEntry() {
  const explicit = process.env.HILO_GATEWAY_ENTRY?.trim();
  if (explicit) return explicit;
  const containerPath = "/app/app/gateway/dist/main.js";
  if (fs.existsSync(containerPath)) return containerPath;
  const devPath = path.resolve(process.cwd(), "app/gateway/dist/main.js");
  if (fs.existsSync(devPath)) return devPath;
  return void 0;
}
function resolveRegion() {
  return envOpt("HILO_RELEASE_REGION", "domestic") === "overseas" ? "overseas" : "domestic";
}
function resolveChannel() {
  const v = envOpt("HILO_RELEASE_CHANNEL", "dev");
  return v === "test" || v === "staging" || v === "prod" ? v : "dev";
}
function resolveUserToken() {
  const file = process.env.HILO_USER_TOKEN_FILE?.trim();
  if (file) {
    try {
      const raw = fs.readFileSync(file, "utf-8").trim();
      if (raw && raw !== "null") return raw;
    } catch {
    }
  }
  const envToken = process.env.HILO_USER_TOKEN?.trim();
  return envToken && envToken !== "null" ? envToken : void 0;
}
const logger = {
  info: (m) => console.log(`[headless-worker] ${m}`),
  warn: (m) => console.warn(`[headless-worker] ${m}`),
  error: (m) => console.error(`[headless-worker] ${m instanceof Error ? m.stack ?? m.message : m}`)
};
async function main() {
  const dataRoot = resolveDataDir();
  const pushedItemPath = process.env.EVAL_PUSH_ITEM_PATH?.trim();
  fs.mkdirSync(dataRoot, { recursive: true });
  const metricsServer = await startEvalWorkerMetricsServer({
    port: resolveEvalWorkerMetricsPort(process.env.METRICS_PORT),
    logger
  });
  const clientVersion = installHeadlessClientVersion();
  logger.info(`client version resolved: ${clientVersion.version} (source=${clientVersion.source})`);
  process.env.HILO_BENCHMARK ??= "0";
  process.env.HILO_BENCHMARK_PROFILE ??= "headless-ci";
  process.env.HILO_BENCHMARK_SUPERVISOR_ENABLED ??= "1";
  if (isBenchmarkEnabled(process.env.HILO_BENCHMARK)) {
    process.env.HILO_BENCHMARK_DIR ??= path.join(dataRoot, "benchmarks");
  }
  process.env.HILO_BENCHMARK_REDACTION ??= "truncate";
  process.env.HILO_BENCHMARK_TASK_TIMEOUT_MS ??= "5400000";
  process.env.HILO_BENCHMARK_MAX_BYTES ??= "209715200";
  process.env.HILO_BENCHMARK_FINALIZE_TIMEOUT_MS ??= "250000";
  const allowedRedaction = /* @__PURE__ */ new Set(["truncate", "hash", "metadata_only"]);
  const currentRedaction = process.env.HILO_BENCHMARK_REDACTION;
  if (isBenchmarkEnabled(process.env.HILO_BENCHMARK) && !allowedRedaction.has(currentRedaction || "")) {
    if (currentRedaction === "none") {
      console.error(
        `[headless-worker] FATAL: HILO_BENCHMARK_REDACTION='none' violates 不变量 6 PII protection while HILO_BENCHMARK is truthy`
      );
      process.exit(1);
    }
    console.warn(
      `[headless-worker] HILO_BENCHMARK_REDACTION=${JSON.stringify(currentRedaction)} invalid, fallback to 'truncate'`
    );
    process.env.HILO_BENCHMARK_REDACTION = "truncate";
  }
  const opencodeBinaryPath = resolveOpencodeBinary(dataRoot);
  if (!fs.existsSync(opencodeBinaryPath)) {
    console.error(`[headless-worker] FATAL: opencode binary not found at ${opencodeBinaryPath}`);
    process.exit(1);
  }
  const opencodeRuntimeDirs = setupOpenCodeRuntimeDirs(dataRoot, {
    info: logger.info,
    warn: logger.warn,
    error: (m) => logger.error(m)
  });
  const region = resolveRegion();
  const channel = resolveChannel();
  const agentProfileRegistry = resolveHeadlessAgentProfileRegistry({
    dataRoot,
    includeCwdDevPaths: true
  });
  const startupProfile = agentProfileRegistry.profiles[2];
  if (!startupProfile) {
    throw new Error("headless worker profile registry unexpectedly contains no profiles");
  }
  const { agentVersion, configDir, sourceConfigDir } = startupProfile;
  logger.info(
    `agent profiles resolved: itemAgentVersions=${agentProfileRegistry.itemAgentVersions.join(",")} startup version=${agentVersion} configDir=${configDir} sourceConfigDir=${sourceConfigDir ?? "(configDir fallback)"}`
  );
  const userToken = resolveUserToken();
  const workerMode = evalWorkerMode();
  const skillMarketClient = new EvalWorkerSkillMarketClient({
    baseUrl: resolveEvalWorkerCloudGatewayUrl(region, channel),
    token: userToken,
    installDir: evalWorkerMarketSkillCacheDir(dataRoot, region, channel),
    logger
  });
  const capabilityProvider = createEvalWorkerCapabilityProvider({
    agentProfiles: agentProfileRegistry.profiles,
    itemAgentVersions: agentProfileRegistry.itemAgentVersions,
    workerMode,
    marketClient: skillMarketClient,
    logger
  });
  ensurePython(logger).then((bin) => {
    if (bin) logger.info(`[python-runtime] ready at ${bin}`);
    else logger.warn("[python-runtime] not staged — Python-based MCP tools will fail");
  }).catch((err) => {
    logger.error(
      `[python-runtime] stage failed: ${err instanceof Error ? err.message : String(err)}`
    );
  });
  const { driver, shutdown: shutdownDriver } = await bootDriverOnly(
    {
      opencodeBinaryPath,
      dataDir: dataRoot,
      region,
      channel,
      appVersion: clientVersion.version,
      agentVersion,
      configDir,
      sourceConfigDir,
      agentProfileRegistry,
      opencodeRuntimeEnv: opencodeRuntimeDirs.runtimeEnv,
      userToken,
      gatewayEntryPath: resolveGatewayEntry()
    },
    logger
  );
  const worker = new EvalWorker(
    driver,
    {
      backendUrl: envRequired("EVAL_BACKEND_URL").replace(/\/$/, ""),
      // 领哪条队列：主版本 pod 设 HUB_WORKER_QUEUE=task 去线上任务队列，泳道不设＝评测。
      // 路径两条链路共用一套，所以这里没有前缀开关。
      workerQueue: process.env.HUB_WORKER_QUEUE,
      // Task claims freeze the fleet that owns their OSS/CDN topology.
      workerRegion: region,
      workerChannel: channel,
      // workerToken / hiloApiKey deprecated 2026-05 — backend dropped
      // fleet-Bearer (internal cluster network is the trust boundary).
      // Pass through if env still set (back-compat with old lane envs);
      // empty is fine, EvalWorker no longer asserts them.
      workerToken: process.env.HUB_WORKER_TOKEN,
      hiloApiKey: process.env.EVAL_HILO_API_KEY,
      // Bedrock's main release has no swim lane by design. Keep a separate
      // logical identity so the benchmark heartbeat/audit path and claim
      // loop remain fully operational without turning that identity into a
      // task-level Hilo routing header.
      laneName: process.env.SWIM_LANE?.trim() || void 0,
      workerIdentity: envOpt("WORKER_FLEET_ID", "main"),
      buildRef: resolveEvalWorkerBuildRef(process.env.HUB_BUILD_REF, pushedItemPath),
      podIp: envOpt("INSTANCE_IP", os.hostname()),
      dataDir: dataRoot,
      // Self-reported to the backend's claim filter so a gui pod
      // (HILO_EVAL_MODE=gui) only picks up runs whose config_json
      // pins worker_mode=gui (or no pin, which falls through to
      // the lane default). When the env is unset (legacy / not
      // running in benchmark pull-mode), workerMode stays undefined
      // and the claim filter accepts both kinds — back-compat.
      workerMode,
      itemAgentVersions: agentProfileRegistry.itemAgentVersions,
      capabilityProvider,
      skillMarketClient
    },
    logger
  );
  if (pushedItemPath) {
    logger.info(`one-shot push mode: item=${pushedItemPath}`);
    await runEvalWorkerProcessMode({
      pushedItemPath,
      worker,
      shutdownDriver,
      closeMetrics: () => metricsServer.close()
    });
    logger.info("one-shot push mode complete");
    return;
  }
  let shuttingDown = false;
  const handleSignal = (sig) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`received ${sig}, draining...`);
    void (async () => {
      try {
        if (isBenchmarkEnabled(process.env.HILO_BENCHMARK)) {
          await worker.stop();
        } else {
          await worker.stop({ release: true, releaseReason: "sigterm_non_benchmark" });
        }
        await shutdownDriver();
        await metricsServer.close();
      } catch (err) {
        logger.warn(`drain error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        process.exit(0);
      }
    })();
    setTimeout(() => {
      logger.warn("drain timeout (20 min hard cap), releasing in-flight + forcing exit");
      void (async () => {
        try {
          await worker.releaseCurrentItem("drain_timeout");
        } catch (err) {
          logger.warn(
            `release on timeout failed: ${err instanceof Error ? err.message : String(err)}`
          );
        } finally {
          process.exit(1);
        }
      })();
    }, 20 * 6e4).unref();
  };
  process.on("SIGTERM", handleSignal);
  process.on("SIGINT", handleSignal);
  await runEvalWorkerProcessMode({
    pushedItemPath,
    worker,
    shutdownDriver,
    closeMetrics: () => metricsServer.close()
  });
}
main().catch((err) => {
  logger.error(err instanceof Error ? err : String(err));
  process.exit(1);
});
