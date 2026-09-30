import * as fs from "node:fs";
import * as path from "node:path";
import { randomBytes, createHash } from "node:crypto";
import * as os from "node:os";
import { g as getCloudGatewayUrl, a as workspaceGatewayIdentityEnv, E as ENV_OPENCODE_CONFIG_DIR, o as openCodeRuntimeContractEnv, w as workspaceGatewayIdentityHeaders } from "./safe-spawn-path-DD3xknOt.js";
import { H as HILO_AGENT_RUN_ID_ENV, L as LogLevel, E as Emitter, b as HeadlessDriver, c as HeadlessServer, d as parseHeadlessPort, f as publishComfyUiHostPid, G as GatewayManager, g as fetchRemoteProviderConfig, h as ensureSystemCaCerts, j as setupAgentStaging, k as buildConfigContent, l as filterAgentProfileOwnedEnv, n as resolveAgentTimeoutEnv, o as HILO_MANAGED_RUNTIME_ENV, q as HILO_MANAGED_RUNTIME_VALUE, t as applyNodeExtraCaCerts, O as OpenCodeManager, u as reapComfyUiBackend, w as workspaceGatewayUrl, v as normalizeVersionCodeForCloud } from "./python-runtime-jWZe4Vty.js";
function resolveHeadlessAgentProfile(options) {
  const env = options.env ?? process.env;
  const exists = options.exists ?? fs.existsSync;
  const cwd = options.cwd ?? process.cwd();
  const includeCwdDevPaths = options.includeCwdDevPaths === true;
  const explicitConfigDir = env.HILO_OPENCODE_CONFIG_DIR?.trim();
  const configCandidates = [
    explicitConfigDir,
    "/app/config/opencode-v2",
    ...includeCwdDevPaths ? [path.resolve(cwd, "config/opencode-v2")] : [],
    path.join(options.dataRoot, ".config", "opencode-v2")
  ].filter((candidate) => Boolean(candidate));
  const configDir = configCandidates.find((candidate) => exists(candidate)) ?? configCandidates.at(-1);
  if (!configDir) throw new Error("No active headless agent config path resolved");
  const explicitSourceDir = env.HILO_OPENCODE_SOURCE_DIR?.trim();
  const sourceCandidates = [
    explicitSourceDir,
    "/app/.opencode-v2",
    ...includeCwdDevPaths ? [path.resolve(cwd, ".opencode-v2")] : []
  ].filter((candidate) => Boolean(candidate));
  const sourceConfigDir = sourceCandidates.find(
    (candidate) => exists(path.join(candidate, "agents"))
  );
  return { agentVersion: 2, configDir, sourceConfigDir };
}
function resolveHeadlessAgentProfileRegistry(options) {
  const exists = options.exists ?? fs.existsSync;
  const readTextFile = options.readTextFile ?? ((filePath) => fs.readFileSync(filePath, "utf8"));
  const listFiles = options.listFiles ?? ((dirPath) => fs.readdirSync(dirPath, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name));
  const profile = resolveHeadlessAgentProfile(options);
  if (!isCompleteProfile(profile, exists, readTextFile, listFiles)) {
    throw new Error(
      "No complete headless agent profile resolved. The active profile requires a parseable object base.json and at least one valid agent file."
    );
  }
  const frozenProfile = Object.freeze({ ...profile });
  return Object.freeze({
    profiles: Object.freeze({ 2: frozenProfile }),
    itemAgentVersions: Object.freeze([2])
  });
}
function isCompleteProfile(profile, exists, readTextFile, listFiles) {
  if (!exists(profile.configDir)) return false;
  const sourceRoot = profile.sourceConfigDir ?? profile.configDir;
  const agentsDir = path.join(sourceRoot, "agents");
  if (!exists(agentsDir)) return false;
  try {
    const baseConfig = JSON.parse(readTextFile(path.join(profile.configDir, "base.json")));
    if (baseConfig === null || typeof baseConfig !== "object" || Array.isArray(baseConfig)) {
      return false;
    }
    const agentFiles = listFiles(agentsDir).filter(
      (name) => name !== "README.md" && name.endsWith(".md")
    );
    if (agentFiles.some(
      (name) => !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(path.basename(name, ".md"))
    )) {
      return false;
    }
    return agentFiles.some((name) => {
      try {
        return readTextFile(path.join(agentsDir, name)).trim().length > 0;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}
function normalizeAgentRunId(value) {
  const normalized = value?.trim();
  return normalized ? normalized : void 0;
}
function agentRunEnv(value) {
  const agentRunId = normalizeAgentRunId(value);
  return agentRunId ? { [HILO_AGENT_RUN_ID_ENV]: agentRunId } : {};
}
class ConsoleLogService {
  constructor(prefix = "", initialLevel = LogLevel.Info) {
    this.prefix = prefix;
    this.level = initialLevel;
  }
  _serviceBrand;
  level;
  levelEmitter = new Emitter();
  onDidChangeLogLevel = this.levelEmitter.event;
  getLevel() {
    return this.level;
  }
  setLevel(level) {
    if (level === this.level) return;
    this.level = level;
    this.levelEmitter.fire(level);
  }
  trace(message, ...args) {
    if (this.level > LogLevel.Trace) return;
    console.debug(this.fmt(message), ...args);
  }
  debug(message, ...args) {
    if (this.level > LogLevel.Debug) return;
    console.debug(this.fmt(message), ...args);
  }
  info(message, ...args) {
    if (this.level > LogLevel.Info) return;
    console.log(this.fmt(message), ...args);
  }
  warn(message, ...args) {
    if (this.level > LogLevel.Warning) return;
    console.warn(this.fmt(message), ...args);
  }
  error(message, ...args) {
    if (this.level > LogLevel.Error) return;
    if (message instanceof Error) {
      console.error(this.fmt(message.message), message.stack, ...args);
    } else {
      console.error(this.fmt(message), ...args);
    }
  }
  fmt(message) {
    return this.prefix ? `${this.prefix} ${message}` : message;
  }
}
class TeeLogService {
  constructor(inner, logFilePath) {
    this.inner = inner;
    this.logFilePath = logFilePath;
  }
  _serviceBrand;
  /** Set true once the parent dir has been ensured; avoids repeating mkdir. */
  dirEnsured = false;
  // ── Level passthrough ────────────────────────────────────────────────
  //
  // Filtering is the inner logger's job. We pass-through level state so
  // any caller reading `getLevel()` / subscribing to onDidChangeLogLevel
  // sees the inner's state. We DO NOT filter our own file-append by
  // level — the captured run.log is meant to be a complete record of
  // what gateway / opencode emitted, not a filtered view.
  get onDidChangeLogLevel() {
    return this.inner.onDidChangeLogLevel;
  }
  getLevel() {
    return this.inner.getLevel();
  }
  setLevel(level) {
    this.inner.setLevel(level);
  }
  trace(message, ...args) {
    this.inner.trace(message, ...args);
    this.appendToFile("TRACE", message, args);
  }
  debug(message, ...args) {
    this.inner.debug(message, ...args);
    this.appendToFile("DEBUG", message, args);
  }
  info(message, ...args) {
    this.inner.info(message, ...args);
    this.appendToFile("INFO", message, args);
  }
  warn(message, ...args) {
    this.inner.warn(message, ...args);
    this.appendToFile("WARN", message, args);
  }
  error(message, ...args) {
    this.inner.error(message, ...args);
    if (message instanceof Error) {
      const stack = message.stack ?? message.message;
      this.appendToFile("ERROR", message.message, [stack, ...args]);
    } else {
      this.appendToFile("ERROR", message, args);
    }
  }
  // ── File append ──────────────────────────────────────────────────────
  appendToFile(level, message, args) {
    try {
      this.ensureDir();
      const ts = (/* @__PURE__ */ new Date()).toISOString();
      const rendered = args.length === 0 ? message : `${message} ${args.map(stringify).join(" ")}`;
      fs.appendFileSync(this.logFilePath, `[${ts}] [${level}] ${rendered}
`);
    } catch {
    }
  }
  ensureDir() {
    if (this.dirEnsured) return;
    try {
      fs.mkdirSync(path.dirname(this.logFilePath), { recursive: true });
    } catch {
    }
    this.dirEnsured = true;
  }
}
function stringify(value) {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.stack ?? value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}
const HEADLESS_PROVIDER_CONFIG_TIMEOUT_MS = 3e4;
const HEADLESS_RUNTIME_CONTROL_WRITE_TIMEOUT_MS = 3e4;
function defaultLogger() {
  return {
    info: (m, ...a) => console.log(`[headless] ${m}`, ...a),
    warn: (m, ...a) => console.warn(`[headless] ${m}`, ...a),
    error: (m, ...a) => console.error(`[headless] ${m}`, ...a)
  };
}
class HeadlessHiloApp {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    publishComfyUiHostPid();
  }
  workspaces = /* @__PURE__ */ new Map();
  closingWorkspaces = /* @__PURE__ */ new Map();
  shuttingDown = false;
  async openWorkspace(folderPath, options) {
    if (this.shuttingDown) {
      throw new Error(
        `workspace ${folderPath} cannot open while headless runtime is shutting down`
      );
    }
    if (this.closingWorkspaces.has(folderPath)) {
      throw new Error(`workspace ${folderPath} is still closing; refusing runtime reuse`);
    }
    const cached = this.workspaces.get(folderPath);
    if (cached?.poisonedByCloseFailure) {
      throw this.poisonedWorkspaceError(folderPath, cached.poisonedByCloseFailure);
    }
    const profile = this.resolveAgentProfile(options?.agentVersion);
    if (cached) {
      if (cached.agentVersion !== profile.agentVersion) {
        throw new Error(
          `workspace ${folderPath} is already open with agent v${cached.agentVersion}; refusing to reuse it for requested v${profile.agentVersion}`
        );
      }
      if (!cached.runtime || !cached.opencode) {
        throw new Error(
          `workspace ${folderPath} has an incomplete runtime from a failed open; refusing reuse until eval-item-terminal close finishes`
        );
      }
      return cached.runtime;
    }
    const cloudEnvOverride = options?.cloudEnvOverride;
    const agentRunId = normalizeAgentRunId(options?.agentRunId);
    const effectiveRegion = cloudEnvOverride?.region ?? this.config.region;
    const effectiveChannel = cloudEnvOverride?.channel ?? this.config.channel;
    const effectiveLane = normaliseOptionalString(cloudEnvOverride?.hiloLane);
    const hasCloudRoutingOverride = !!(cloudEnvOverride?.region || cloudEnvOverride?.channel);
    const consoleLogger = new ConsoleLogService(`[${folderPath}]`);
    const logFilePath = path.join(folderPath, ".eval", "run.log");
    try {
      fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
    } catch (err) {
      this.logger.warn(
        `failed to pre-create ${path.dirname(logFilePath)}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    const wsLogger = new TeeLogService(consoleLogger, logFilePath);
    const mountedSkillPaths = options?.skillsPaths?.filter((entry) => entry.trim().length > 0);
    const bundledPluginsDir = this.config.opencodeExtraEnv?.HILO_BUNDLED_PLUGINS_DIR ?? process.env.HILO_BUNDLED_PLUGINS_DIR;
    const sourceConfigDir = profile.sourceConfigDir ?? profile.configDir;
    const knowledgeDir = path.join(sourceConfigDir, "knowledge");
    const workflowsDir = path.join(sourceConfigDir, "workflows");
    const gateway = new GatewayManager(
      {
        // Server mode: derive platform paths from env / cwd. Mirrors
        // the GUI-mode derivation from electron `app.*` but stays in
        // pure Node so this entire process tree never loads chromium.
        platform: {
          userDataPath: this.config.dataDir,
          tempPath: os.tmpdir(),
          // Server mode always runs the dev-style layout: `entryPath`
          // is set explicitly via env, `OPENCODE_CONFIG_DIR` is provided
          // via `configDir`, and `resourcesPath` is irrelevant. Forcing
          // false keeps gateway-manager on its dev branches and avoids
          // chasing a `<resources>/opencode/config` path that doesn't
          // exist in the container.
          isPackaged: false,
          appPath: process.cwd()
        },
        region: effectiveRegion,
        channel: effectiveChannel,
        lane: effectiveLane,
        configDir: profile.configDir,
        entryPath: this.config.gatewayEntryPath,
        // Export project root-cause fix: the gateway subprocess needs
        // HILO_OPENCODE_DB to know where the opencode child wrote its
        // SQLite. Without this it falls back to the user-global
        // ~/.local/share/opencode/opencode.db, which is empty under
        // headless / dev mode (opencode is launched with
        // XDG_DATA_HOME=<dataDir>/ai-runtime/data-home, so its db
        // lives under the workspace, not the user's home). The
        // `exportProject` flow then calls gateway
        // /api/projects/archive/export, gateway opens an empty db,
        // and the exported zip's .hub/opencode-export.json ends up
        // as `{ payload: null }` — the user sees "project exported"
        // success but the session history is silently dropped.
        // GUI mode passes the same path at app/desktop/src/main/index.ts:709.
        opencodeDbPath: path.join(
          this.config.dataDir,
          "ai-runtime",
          "data-home",
          "opencode",
          "opencode.db"
        ),
        runtimeEnv: this.config.opencodeRuntimeEnv,
        // Pure headless entries do not run Electron main, so explicitly give
        // every Gateway the same supported client version selected at boot.
        // Otherwise CloudCommonParams falls back to stale 0.1.0.
        extraEnv: {
          HILO_APP_VERSION: this.config.appVersion,
          HILO_RUNTIME_CONTROL_WRITE_TIMEOUT_MS: String(HEADLESS_RUNTIME_CONTROL_WRITE_TIMEOUT_MS),
          ...agentRunEnv(agentRunId),
          ...mountedSkillPaths && mountedSkillPaths.length > 0 ? { HILO_EVAL_SKILLS_PATHS: mountedSkillPaths.join(path.delimiter) } : {}
        },
        agentProfile: {
          knowledgeDir,
          contractsDir: path.join(sourceConfigDir, "contracts"),
          workflowsDir
        }
      },
      wsLogger
    );
    const workspaceEntry = {
      gateway,
      agentVersion: profile.agentVersion
    };
    this.workspaces.set(folderPath, workspaceEntry);
    try {
      await gateway.allocatePort(folderPath);
      await gateway.start(void 0, void 0, folderPath);
      this.assertWorkspaceOpening(folderPath, workspaceEntry);
      const workspaceBinding = gateway.workspaceBinding;
      if (!workspaceBinding) {
        throw new Error("headless workspace gateway did not mint a complete binding");
      }
      const gatewayUrl = workspaceBinding.baseUrl;
      const workspaceClaim = workspaceBinding.claim;
      const userToken = normaliseOptionalString(cloudEnvOverride?.user_token) ?? resolveUserToken(this.config);
      if (userToken) {
        await this.pushCloudToken(workspaceBinding, userToken);
      } else {
        this.logger.warn(
          "no HILO_USER_TOKEN / HILO_USER_TOKEN_FILE set; cloud-bound MCP tool calls will 401"
        );
      }
      await this.pushWatermarkConfig(workspaceBinding, options?.watermarkEnabled ?? false);
      const cloudGatewayUrl = (hasCloudRoutingOverride ? void 0 : process.env.CLOUD_GATEWAY_BASE_URL) || getCloudGatewayUrl(effectiveRegion, effectiveChannel);
      let remoteConfig = null;
      if (userToken) {
        remoteConfig = await fetchRemoteProviderConfig(
          cloudGatewayUrl,
          userToken,
          {
            info: (m) => this.logger.info(m),
            warn: (m) => this.logger.warn(m)
          },
          {
            timeoutMs: HEADLESS_PROVIDER_CONFIG_TIMEOUT_MS
          }
        );
        if (!remoteConfig) {
          this.logger.warn(
            "fetchRemoteProviderConfig returned null; opencode will have no LLM providers"
          );
        }
      }
      const systemCaCertsPath = await ensureSystemCaCerts(this.config.dataDir, {
        log: {
          info: (message) => this.logger.info(message),
          warn: (message) => this.logger.warn(message)
        }
      });
      const stagingDir = setupAgentStaging(sourceConfigDir, void 0);
      const openCodeConfigDir = stagingDir ?? profile.configDir;
      const configJson = buildConfigContent(
        profile.configDir,
        effectiveChannel,
        effectiveRegion,
        userToken ?? "",
        {
          remoteConfig,
          skillsPaths: options?.skillsPaths,
          skillIsolation: {
            region: effectiveRegion,
            channel: effectiveChannel,
            bundledPluginsDir
          },
          evalSkillAgentGrants: options?.evalSkillAgentGrants,
          systemCaCertsPath,
          // OpenCode calls cloud providers directly, bypassing Gateway query
          // params. Use the same version in provider headers.
          versionCode: this.config.appVersion,
          // Per-task swim lane picked by the run creator (cloud.hiloLane). The
          // OpenCode process gets `LANE` env below, but buildConfigContent runs
          // in THIS process — pass it explicitly or the `bedrock-lane` header
          // would fall back to the worker's own env and miss the task lane.
          lane: effectiveLane,
          mcpEnvOverrides: {
            ...filterAgentProfileOwnedEnv(this.config.mcpEnvOverrides),
            GATEWAY_URL: gatewayUrl,
            ...agentRunEnv(agentRunId),
            ...workspaceGatewayIdentityEnv(workspaceBinding),
            HILO_KNOWLEDGE_DIR: knowledgeDir,
            HILO_WORKFLOWS_DIR: workflowsDir,
            HILO_APP_VERSION: this.config.appVersion
          },
          profileSourceConfigDir: sourceConfigDir
        }
      );
      fs.writeFileSync(path.join(openCodeConfigDir, "opencode.json"), configJson);
      const opencodeEnv = {
        ...filterAgentProfileOwnedEnv(this.config.opencodeExtraEnv),
        // App-private XDG/config-discovery paths are runtime invariants. Keep
        // them after caller extras so HOME isolation cannot be overwritten by
        // a stale worker environment.
        ...filterAgentProfileOwnedEnv(this.config.opencodeRuntimeEnv),
        // Same OpenCode runtime contract the desktop path applies. Offline
        // Hub-owned dirs use dependency markers, while OPENCODE_TEST_HOME keeps
        // user ~/.opencode outside this process's config scan without changing
        // the real HOME inherited by agent commands. Headless runs in CI and on
        // build agents where a blocked registry would otherwise hang every eval.
        ...openCodeRuntimeContractEnv(),
        GATEWAY_URL: gatewayUrl,
        ...agentRunEnv(agentRunId),
        [HILO_MANAGED_RUNTIME_ENV]: HILO_MANAGED_RUNTIME_VALUE,
        ...workspaceGatewayIdentityEnv(workspaceBinding),
        ...systemCaCertsPath ? { HILO_SYSTEM_CA_CERTS: systemCaCertsPath } : {},
        ...mountedSkillPaths && mountedSkillPaths.length > 0 ? { HILO_EVAL_SKILLS_PATHS: mountedSkillPaths.join(path.delimiter) } : {},
        [ENV_OPENCODE_CONFIG_DIR]: openCodeConfigDir,
        HILO_APP_VERSION: this.config.appVersion,
        HILO_RELEASE_REGION: effectiveRegion,
        HILO_RELEASE_CHANNEL: effectiveChannel,
        ...resolveAgentTimeoutEnv(remoteConfig),
        ...bundledPluginsDir ? { HILO_BUNDLED_PLUGINS_DIR: bundledPluginsDir } : {},
        ...effectiveLane ? { LANE: effectiveLane } : {}
      };
      applyNodeExtraCaCerts(opencodeEnv, systemCaCertsPath);
      this.assertWorkspaceOpening(folderPath, workspaceEntry);
      const opencode = new OpenCodeManager(
        {
          binaryPath: this.config.opencodeBinaryPath,
          workingDirectory: folderPath,
          workspaceKey: folderPath,
          env: opencodeEnv,
          verbose: !!process.env.HILO_HEADLESS_VERBOSE,
          // Same leaf the gateway options above derive — enables the
          // schema-mismatch quarantine remediation in headless runs too.
          opencodeDbPath: path.join(
            this.config.dataDir,
            "ai-runtime",
            "data-home",
            "opencode",
            "opencode.db"
          )
        },
        wsLogger
      );
      workspaceEntry.opencode = opencode;
      const opencodeUrl = await opencode.start();
      this.assertWorkspaceOpening(folderPath, workspaceEntry);
      await this.notifyGateway(workspaceBinding, opencodeUrl, opencode.openCodeCredentials);
      this.assertWorkspaceOpening(folderPath, workspaceEntry);
      const runtime = {
        workspaceId: folderPath,
        projectName: path.basename(folderPath),
        folderPath,
        gatewayUrl,
        workspaceClaim,
        gatewayBinding: workspaceBinding,
        wsUrl: this.toWorkspaceWsUrl(workspaceBinding)
      };
      workspaceEntry.runtime = runtime;
      return runtime;
    } catch (err) {
      let cleanupError;
      try {
        await this.closeWorkspaceRuntime(folderPath);
      } catch (closeErr) {
        cleanupError = closeErr;
      }
      const message = err instanceof Error ? err.message : String(err);
      if (cleanupError) {
        throw new Error(
          `openWorkspace(${folderPath}) failed: ${message}; partial runtime close also failed and cache was retained: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
          { cause: err }
        );
      }
      throw err;
    }
  }
  /**
   * Block until the per-workspace bundle is "bound" (gateway up + OpenCode
   * up + gateway's openCodeUrl swapped to the actual port). In headless
   * mode this is a no-op: openWorkspace already awaits gateway.start +
   * opencode.start + notifyGateway (which performs the URL swap) before
   * resolving, so by the time the driver calls waitForWorkspaceBound the
   * bundle is fully bound. Method exists only to satisfy the HiloAppLike
   * contract — the GUI path uses BundleRegistry's state machine, which
   * doesn't exist here.
   */
  async waitForWorkspaceBound(workspaceId, _timeoutMs) {
    const entry = this.workspaces.get(workspaceId);
    if (!entry?.runtime || !entry.opencode) {
      throw new Error(`waitForWorkspaceBound: unknown workspace ${workspaceId}`);
    }
  }
  /**
   * Eval-worker-only destructive close. Direct callers must provide the same
   * phase proof the driver checks; stop order is OpenCode → Gateway → cache.
   * Missing entries are an idempotent success (dispatch may have failed before
   * a runtime was registered).
   */
  async closeEvalWorkspace(folderPath, proof) {
    assertEvalItemTerminalCloseProof(proof);
    await this.closeWorkspaceRuntime(folderPath);
  }
  /** Stop every workspace's gateway + opencode. Called on /api/headless/shutdown. */
  async shutdown() {
    this.shuttingDown = true;
    const errors = [];
    for (const folder of Array.from(this.workspaces.keys())) {
      try {
        await this.closeWorkspaceRuntime(folder);
      } catch (err) {
        errors.push(`${folder}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    this.workspaces.clear();
    await reapComfyUiBackend(process.pid, "shutdown", this.logger, { graceMs: 1200 });
    if (errors.length > 0) {
      this.logger.warn(`shutdown completed with ${errors.length} error(s): ${errors.join("; ")}`);
    }
  }
  resolveAgentProfile(_requested) {
    const registered = this.config.agentProfileRegistry?.profiles[2];
    if (registered) return registered;
    if (!this.config.agentProfileRegistry) {
      return {
        agentVersion: this.config.agentVersion,
        configDir: this.config.configDir,
        sourceConfigDir: this.config.sourceConfigDir
      };
    }
    throw new Error(
      `active agent profile is not available in this worker; supported=${this.config.agentProfileRegistry?.itemAgentVersions.join(",") ?? this.config.agentVersion}`
    );
  }
  assertWorkspaceOpening(folderPath, entry) {
    if (this.shuttingDown || this.workspaces.get(folderPath) !== entry) {
      throw new Error(`workspace ${folderPath} startup was cancelled by runtime close/shutdown`);
    }
    if (entry.poisonedByCloseFailure) {
      throw this.poisonedWorkspaceError(folderPath, entry.poisonedByCloseFailure);
    }
  }
  poisonedWorkspaceError(folderPath, closeFailure) {
    return new Error(
      `workspace ${folderPath} runtime is poisoned after close failure and cannot be reused until this process shuts down: ${closeFailure}; restart the headless worker process before accepting more work`
    );
  }
  async closeWorkspaceRuntime(folderPath) {
    const inProgress = this.closingWorkspaces.get(folderPath);
    if (inProgress) return await inProgress;
    const entry = this.workspaces.get(folderPath);
    if (!entry) return;
    const closing = (async () => {
      const errors = [];
      try {
        await entry.opencode?.stop();
      } catch (err) {
        errors.push(`opencode: ${err instanceof Error ? err.message : String(err)}`);
      }
      try {
        await entry.gateway.stop();
      } catch (err) {
        errors.push(`gateway: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (errors.length > 0) {
        entry.poisonedByCloseFailure = errors.join("; ");
        throw new Error(
          `closeWorkspace(${folderPath}) failed; runtime cache retained and poisoned: ${entry.poisonedByCloseFailure}`
        );
      }
      if (entry.poisonedByCloseFailure) {
        throw this.poisonedWorkspaceError(folderPath, entry.poisonedByCloseFailure);
      }
      this.workspaces.delete(folderPath);
    })();
    this.closingWorkspaces.set(folderPath, closing);
    try {
      await closing;
    } finally {
      if (this.closingWorkspaces.get(folderPath) === closing) {
        this.closingWorkspaces.delete(folderPath);
      }
    }
  }
  /**
   * Mirror of BundleHandle.notifyGateway — POSTs the live opencode URL +
   * basic-auth credentials to the per-workspace gateway's runtime endpoint.
   * Without this the gateway's RuntimeClient still points at the placeholder
   * 4096 default and every routeMessage fails with 401 / connection refused.
   */
  async notifyGateway(workspaceBinding, opencodeUrl, credentials) {
    const endpoint = `${workspaceBinding.baseUrl.replace(/\/$/, "")}/api/runtime/opencode-url`;
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...workspaceGatewayIdentityHeaders(workspaceBinding)
      },
      body: JSON.stringify({
        url: opencodeUrl,
        username: credentials.username,
        password: credentials.password
      }),
      signal: AbortSignal.timeout(5e3)
    });
    if (!resp.ok) {
      throw new Error(`POST ${endpoint} returned HTTP ${resp.status}`);
    }
  }
  /**
   * Mirror of hilo-app's `broadcastPost('/api/auth/token', ...)`. POSTs
   * the cloud user token to gateway's TokenService so subsequent
   * cloudHeaders() calls embed it as the Authorization bearer for every
   * cloud RPC (image / video / music / etc).
   *
   * Failure is logged but non-fatal — local-only providers still work
   * without a cloud token, and the agent will surface the eventual 401
   * if it does try to call cloud.
   */
  async pushCloudToken(workspaceBinding, token) {
    const endpoint = `${workspaceBinding.baseUrl.replace(/\/$/, "")}/api/auth/token`;
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...workspaceGatewayIdentityHeaders(workspaceBinding)
        },
        body: JSON.stringify({ token }),
        signal: AbortSignal.timeout(5e3)
      });
      if (!resp.ok) {
        this.logger.warn(`POST ${endpoint} returned HTTP ${resp.status}`);
        return;
      }
      this.logger.info(
        `cloud user token pushed to gateway (sha256 prefix: ${tokenFingerprint(token)})`
      );
    } catch (err) {
      this.logger.warn(
        `cloud token POST failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  /**
   * Push the visible-watermark toggle to a workspace gateway. Mirrors
   * `pushCloudToken` (same per-workspace binding + identity headers). Headless
   * callers choose the per-workspace value; legacy batch-eval defaults false;
   * the endpoint is idempotent and gateway defaults to enabled when never
   * called. Failure is logged but non-fatal — a stray watermark is preferable
   * to aborting the whole run.
   */
  async pushWatermarkConfig(workspaceBinding, enabled) {
    const endpoint = `${workspaceBinding.baseUrl.replace(/\/$/, "")}/api/watermark/config`;
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...workspaceGatewayIdentityHeaders(workspaceBinding)
        },
        body: JSON.stringify({ enabled }),
        signal: AbortSignal.timeout(5e3)
      });
      if (!resp.ok) {
        this.logger.warn(`POST ${endpoint} returned HTTP ${resp.status}`);
        return;
      }
      this.logger.info(`watermark config pushed to gateway (enabled=${enabled})`);
    } catch (err) {
      this.logger.warn(
        `watermark config POST failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  toWorkspaceWsUrl(workspaceBinding) {
    const url = new URL(
      `${workspaceBinding.baseUrl.replace(/^http/i, "ws").replace(/\/$/, "")}/ws`
    );
    const identityUrl = new URL(
      workspaceGatewayUrl(workspaceBinding, `${url.pathname}${url.search}`)
    );
    identityUrl.protocol = url.protocol;
    return identityUrl.toString();
  }
}
function assertEvalItemTerminalCloseProof(proof) {
  if (proof?.phase !== "eval-item-terminal" || !["terminal", "dispatch-not-started", "released"].includes(proof.itemOutcome) || proof.durableWorkSettled !== true || proof.terminalCallbackSettled !== true || proof.retentionDecisionSettled !== true) {
    throw new Error("invalid eval-item-terminal close proof");
  }
}
function resolveUserToken(config) {
  const filePath = process.env.HILO_USER_TOKEN_FILE?.trim();
  if (filePath) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8").trim();
      if (raw && raw !== "null" && raw !== "undefined") return raw;
    } catch {
    }
  }
  const envToken = process.env.HILO_USER_TOKEN?.trim();
  if (envToken && envToken !== "null" && envToken !== "undefined") return envToken;
  if (config.userToken?.trim()) return config.userToken.trim();
  return void 0;
}
function normaliseOptionalString(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : void 0;
}
function tokenFingerprint(token) {
  return createHash("sha256").update(token).digest("hex").slice(0, 4);
}
async function startHeadlessBoot(config, logger = defaultLogger()) {
  let authToken = process.env.HILO_HEADLESS_TOKEN?.trim();
  let tokenSource = "env";
  if (!authToken) {
    authToken = randomBytes(24).toString("hex");
    tokenSource = "auto";
    const tokenFile = config.tokenFilePath ?? path.join(os.homedir(), ".hub", "headless-token");
    try {
      fs.mkdirSync(path.dirname(tokenFile), { recursive: true });
      fs.writeFileSync(tokenFile, authToken, { mode: 384 });
      logger.info(`auto-generated bearer token written to ${tokenFile} (mode 0600)`);
    } catch (err) {
      logger.error(
        `failed to persist auto-generated token: ${err instanceof Error ? err.message : String(err)}; orchestrator must read it from server logs`
      );
    }
  }
  const hiloApp = new HeadlessHiloApp(config, logger);
  let serverShutdown = async () => {
  };
  const driver = new HeadlessDriver({
    hiloApp,
    logger: {
      info: (m) => logger.info(m),
      warn: (m) => logger.warn(m),
      error: (m) => logger.error(m)
    },
    onShutdownComplete: () => {
      process.exit(0);
    }
  });
  driver.start();
  const server = new HeadlessServer({
    port: parseHeadlessPort(),
    authToken,
    logger: {
      info: (m) => logger.info(m),
      warn: (m) => logger.warn(m),
      error: (m) => logger.error(m)
    },
    driver
  });
  await server.start();
  serverShutdown = () => server.stop();
  logger.info(`headless boot ready: port=${parseHeadlessPort()} token-source=${tokenSource}`);
  return {
    shutdown: async () => {
      try {
        await serverShutdown();
      } catch (err) {
        logger.warn(`server shutdown error: ${err instanceof Error ? err.message : String(err)}`);
      }
      try {
        await hiloApp.shutdown();
      } catch (err) {
        logger.warn(`hiloApp shutdown error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };
}
async function bootDriverOnly(config, logger = defaultLogger(), onShutdownComplete) {
  const hiloApp = new HeadlessHiloApp(config, logger);
  const driver = new HeadlessDriver({
    hiloApp,
    logger: {
      info: (m) => logger.info(m),
      warn: (m) => logger.warn(m),
      error: (m) => logger.error(m)
    },
    onShutdownComplete: (() => {
      process.exit(0);
    })
  });
  driver.start();
  logger.info(`headless driver booted (worker mode, no HTTP server)`);
  return {
    hiloApp,
    driver,
    shutdown: async () => {
      try {
        await driver.shutdownAll();
      } catch (err) {
        logger.warn(`driver shutdown error: ${err instanceof Error ? err.message : String(err)}`);
      }
      try {
        await hiloApp.shutdown();
      } catch (err) {
        logger.warn(`hiloApp shutdown error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };
}
const VERSION_CODE_PATTERN = /^\d+\.\d+\.\d+$/;
function readDesktopPackageVersion(cwd = process.cwd()) {
  const candidates = [
    path.resolve(import.meta.dirname, "../../../package.json"),
    path.join(cwd, "app", "desktop", "package.json"),
    path.join(cwd, "package.json")
  ];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, "utf-8"));
      if (typeof parsed.version === "string" && parsed.version.trim()) return parsed.version.trim();
    } catch {
    }
  }
  throw new Error(
    `Unable to resolve headless client version: HILO_APP_VERSION is unset and no desktop package.json was readable from the bundled module or under ${cwd}`
  );
}
function resolveHeadlessClientVersion(env = process.env, bundledDesktopVersion) {
  const explicit = env.HILO_APP_VERSION?.trim();
  const source = explicit ? "env" : "desktop-package";
  const raw = explicit ?? bundledDesktopVersion ?? readDesktopPackageVersion();
  const version = normalizeVersionCodeForCloud(raw);
  if (!VERSION_CODE_PATTERN.test(version)) {
    throw new Error(
      `Invalid headless client version from ${source}: ${JSON.stringify(raw)}. Expected a semantic version such as 1.1.1; image tags are not client versions.`
    );
  }
  return { version, source };
}
function installHeadlessClientVersion(env = process.env) {
  const resolved = resolveHeadlessClientVersion(env);
  env.HILO_APP_VERSION = resolved.version;
  return resolved;
}
export {
  resolveHeadlessAgentProfileRegistry as a,
  bootDriverOnly as b,
  installHeadlessClientVersion as i,
  resolveHeadlessAgentProfile as r,
  startHeadlessBoot as s
};
