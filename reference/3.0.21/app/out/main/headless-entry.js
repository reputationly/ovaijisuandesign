import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { s as setupOpenCodeRuntimeDirs, e as ensurePython } from "./chunks/python-runtime-ZdSS6sqy.js";
import { i as installHeadlessClientVersion, r as resolveHeadlessAgentProfile, s as startHeadlessBoot } from "./chunks/headless-client-version-2jDjQeaz.js";
import "node:child_process";
import "./chunks/safe-spawn-path-DD3xknOt.js";
import "node:crypto";
import "node:net";
import "node:util";
import "node:tls";
import "node:url";
import "node:http";
import "node:sqlite";
import "node:stream";
import "node:stream/promises";
import "events";
import "fs";
import "node:events";
import "node:string_decoder";
import "path";
import "assert";
import "buffer";
import "zlib";
import "node:assert";
import "node:fs/promises";
function resolveDataDir() {
  const explicit = process.env.HILO_DATA_DIR?.trim();
  if (explicit) return explicit;
  return path.join(os.homedir(), ".hub");
}
function resolveOpenCodeBinary() {
  const explicit = process.env.HILO_OPENCODE_BINARY?.trim();
  if (explicit) return explicit;
  const binaryName = process.platform === "win32" ? "opencode.exe" : "opencode";
  const baked = path.join("/opt/opencode/bin", binaryName);
  if (fs.existsSync(baked)) return baked;
  return path.join(resolveDataDir(), "opencode", "bin", binaryName);
}
function resolveRegion() {
  const v = (process.env.HILO_RELEASE_REGION ?? "domestic").toLowerCase();
  return v === "overseas" ? "overseas" : "domestic";
}
function resolveChannel() {
  const v = (process.env.HILO_RELEASE_CHANNEL ?? "dev").toLowerCase();
  if (v === "test" || v === "staging" || v === "prod") return v;
  return "dev";
}
const consoleLogger = {
  info: (m, ...a) => console.log(`[headless-entry] ${m}`, ...a),
  warn: (m, ...a) => console.warn(`[headless-entry] ${m}`, ...a),
  error: (m, ...a) => console.error(`[headless-entry] ${m instanceof Error ? m.stack ?? m.message : m}`, ...a)
};
async function main() {
  const dataRoot = resolveDataDir();
  fs.mkdirSync(dataRoot, { recursive: true });
  const clientVersion = installHeadlessClientVersion();
  consoleLogger.info(
    `client version resolved: ${clientVersion.version} (source=${clientVersion.source})`
  );
  const opencodeBinaryPath = resolveOpenCodeBinary();
  if (!fs.existsSync(opencodeBinaryPath)) {
    consoleLogger.error(
      `opencode binary not found at ${opencodeBinaryPath}. Set HILO_OPENCODE_BINARY or pre-stage the binary under <HILO_DATA_DIR>/opencode/bin/`
    );
    process.exit(1);
  }
  const opencodeRuntimeDirs = setupOpenCodeRuntimeDirs(dataRoot, {
    info: consoleLogger.info,
    warn: consoleLogger.warn,
    error: (m) => consoleLogger.error(m)
  });
  ensurePython(consoleLogger).then((bin) => {
    if (bin) consoleLogger.info(`[python-runtime] ready at ${bin}`);
    else consoleLogger.warn("[python-runtime] not staged — Python-based MCP tools will fail");
  }).catch((err) => {
    consoleLogger.error(
      `[python-runtime] stage failed: ${err instanceof Error ? err.message : String(err)}`
    );
  });
  const agentProfile = resolveHeadlessAgentProfile({ dataRoot });
  consoleLogger.info(
    `agent profile resolved: version=${agentProfile.agentVersion} configDir=${agentProfile.configDir} sourceConfigDir=${agentProfile.sourceConfigDir ?? "(configDir fallback)"}`
  );
  const { shutdown } = await startHeadlessBoot(
    {
      opencodeBinaryPath,
      dataDir: dataRoot,
      region: resolveRegion(),
      channel: resolveChannel(),
      appVersion: clientVersion.version,
      agentVersion: agentProfile.agentVersion,
      configDir: agentProfile.configDir,
      sourceConfigDir: agentProfile.sourceConfigDir,
      opencodeRuntimeEnv: opencodeRuntimeDirs.runtimeEnv
      // Cloud auth — required for any provider model that hits cloud.
      // Most images/video/music tools call cloud, so without this they
      // 401 on the first MCP invocation. Local-only models don't need it.
      // Resolution priority is HILO_USER_TOKEN_FILE > HILO_USER_TOKEN >
      // this field; resolved inside HeadlessBoot. Pass nothing here so
      // env is the source of truth.
    },
    consoleLogger
  );
  let shuttingDown = false;
  const shutdownOnSignal = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    consoleLogger.info(`received ${signal}, draining...`);
    void shutdown().then(() => process.exit(0));
    setTimeout(() => {
      consoleLogger.warn("shutdown timed out after 8s, exiting forcibly");
      process.exit(1);
    }, 8e3).unref();
  };
  process.on("SIGTERM", shutdownOnSignal);
  process.on("SIGINT", shutdownOnSignal);
}
main().catch((err) => {
  consoleLogger.error(err instanceof Error ? err : String(err));
  process.exit(1);
});
