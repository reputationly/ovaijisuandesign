// instantiation-service.js
import { isWorkspaceFolderMissingError } from "../vendor.js";
import { ServiceCollection, _enableAllTracing, Graph, Trace, CyclicDependencyError } from "../vendor-inline/vscode-base/graph.jsx";
import { countUnavailableComfyUiModels, workspaceRuntimeFromOpenResult, errorListeners, dispose, isDisposable, illegalState, SyncDescriptor } from "../vendor-inline/vscode-base/linked-list.js";
var _util;
((_util2) => {
  _util2.serviceIds = new Map();
  _util2.DI_TARGET = "$di$target";
  _util2.DI_DEPENDENCIES = "$di$dependencies";
  function getServiceDependencies(ctor) {
    return ctor[_util2.DI_DEPENDENCIES] || [];
  }
  _util2.getServiceDependencies = getServiceDependencies;
})(_util || (_util = {}));
const IInstantiationService = createDecorator("instantiationService");
function storeServiceDependency(id2, target, index2) {
  if (target[_util.DI_TARGET] === target) {
    target[_util.DI_DEPENDENCIES].push({
      id: id2,
      index: index2,
    });
  } else {
    target[_util.DI_DEPENDENCIES] = [
      {
        id: id2,
        index: index2,
      },
    ];
    target[_util.DI_TARGET] = target;
  }
}
export function createDecorator(serviceId) {
  if (_util.serviceIds.has(serviceId)) {
    return _util.serviceIds.get(serviceId);
  }
  const id2 = function (target, _key, index2) {
    if (arguments.length !== 3) {
      throw new Error("@IServiceName-decorator can only be used to decorate a parameter");
    }
    storeServiceDependency(id2, target, index2);
  };
  id2.toString = () => serviceId;
  _util.serviceIds.set(serviceId, id2);
  return id2;
}
export function isComfyUiModelAlreadyDownloaded(task) {
  return (
    task.downloadedModels.length === 0 &&
    task.skippedModels.length > 0 &&
    countUnavailableComfyUiModels(task) === 0
  );
}
export const IComfyUiModelDownloadService = createDecorator("comfyUiModelDownloadService");
export const ILogService = createDecorator("logService");
const COMMAND_PATH = /^(?:\/|\.{1,2}[\\/]|[a-z]:[\\/]|\\\\|~[\\/])/iu;
export class CustomMcpCommandSyntaxError extends Error {
  constructor(issue) {
    super(issue);
    this.issue = issue;
  }
  name = "CustomMcpCommandSyntaxError";
}
export function parseCustomMcpArguments(value, commandLine = false) {
  const result = [];
  let current2 = "";
  let quote;
  let tokenStarted = false;
  let windowsPath = false;
  for (let index2 = 0; index2 < value.length; index2++) {
    const character = value.charAt(index2);
    if (!tokenStarted && !/\s/u.test(character)) {
      const start2 = character === '"' || character === "'" ? index2 + 1 : index2;
      windowsPath = character !== "'" && /^(?:[a-z]:\\|\\\\)/iu.test(value.slice(start2));
    }
    if (
      commandLine &&
      ((!quote && /[|&;<>\r\n]/u.test(character)) ||
        (quote !== "'" && (character === "`" || character === "$")))
    ) {
      throw new CustomMcpCommandSyntaxError("shell_syntax");
    }
    if (!quote && /\s/u.test(character)) {
      if (tokenStarted) {
        result.push(current2);
        current2 = "";
        tokenStarted = false;
      }
      continue;
    }
    if (!quote && (character === '"' || character === "'")) {
      quote = character;
      tokenStarted = true;
      continue;
    }
    if (quote && character === quote) {
      quote = void 0;
      continue;
    }
    if (character === "\\" && !windowsPath && quote !== "'" && index2 + 1 < value.length) {
      const nextCharacter = value.charAt(index2 + 1);
      if (
        (quote === '"' && /["\\$`]/u.test(nextCharacter)) ||
        (!quote && /[\s"'\\|&;<>$`]/u.test(nextCharacter))
      ) {
        current2 += nextCharacter;
        index2 += 1;
        tokenStarted = true;
        continue;
      }
    }
    current2 += character;
    tokenStarted = true;
  }
  if (quote) throw new CustomMcpCommandSyntaxError("unclosed_quote");
  if (tokenStarted) result.push(current2);
  return result;
}
function splitCustomMcpCommand(command2, isCommandFile) {
  if (COMMAND_PATH.test(command2)) {
    if (!isCommandFile || isCommandFile(command2) || !/\s/u.test(command2)) return [command2];
    const tokens22 = parseCustomMcpArguments(command2, true);
    if (!tokens22[0] || !isCommandFile(tokens22[0])) return [command2];
    return tokens22;
  }
  const tokens2 = parseCustomMcpArguments(command2, true);
  if (tokens2[0] && /[\s"']/u.test(tokens2[0]) && !COMMAND_PATH.test(tokens2[0])) {
    throw new CustomMcpCommandSyntaxError("ambiguous_executable");
  }
  return tokens2;
}
export const ICustomMcpService = createDecorator("customMcpService");
export const CUSTOM_MCP_NAME_MAX_LENGTH = 24;
const STORED_NAME_MAX_LENGTH = 80;
const SERVER_NAME_PATTERN = /^[\p{Script=Han}a-zA-Z0-9_.-]+$/u;
const MAX_COMMAND_LENGTH = 1024;
const MAX_URL_LENGTH = 8192;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_ARGUMENTS = 128;
const MAX_ARGUMENT_LENGTH = 4096;
const MAX_KEY_VALUES = 64;
const MAX_KEY_LENGTH = 256;
const MAX_VALUE_LENGTH = 8192;
const MAX_TIMEOUT_MS = 36e5;
export class CustomMcpValidationError extends Error {
  constructor(message2, field, commandIssue) {
    super(message2);
    this.field = field;
    this.commandIssue = commandIssue;
  }
  name = "CustomMcpValidationError";
}
export function normalizeCustomMcpServerInput(input, options = {}) {
  if (!isRecord$e(input) || hasUnknownKeys(input, ["name", "enabled", "config"])) {
    throw new CustomMcpValidationError("Invalid MCP server input");
  }
  const name2 = requireServerName(
    input.name,
    options.source === "stored" || options.source === "update"
      ? STORED_NAME_MAX_LENGTH
      : CUSTOM_MCP_NAME_MAX_LENGTH,
  );
  if (isReservedCustomMcpName(name2)) {
    throw new CustomMcpValidationError("Reserved MCP server name", "name");
  }
  if (typeof input.enabled !== "boolean") {
    throw new CustomMcpValidationError("Invalid MCP enabled state");
  }
  return {
    name: name2,
    enabled: input.enabled,
    config: normalizeConfig(input.config, options),
  };
}
export function isReservedCustomMcpName(name2) {
  const normalized = name2.trim().replace(/\./gu, "_").toLowerCase();
  return (
    normalized === "hub" ||
    normalized.startsWith("hub_") ||
    ["__proto__", "constructor", "prototype"].includes(normalized)
  );
}
export function normalizeCustomMcpLaunch(rawCommand, rawArgs, options = {}) {
  const command2 = requireBoundedString(rawCommand, MAX_COMMAND_LENGTH, "command");
  const args = normalizeStringArray(rawArgs);
  try {
    const tokens2 = splitCustomMcpCommand(command2, options.isCommandFile);
    const executable = requireBoundedString(tokens2[0], MAX_COMMAND_LENGTH, "command");
    const mergedArgs = normalizeStringArray([...tokens2.slice(1), ...(args ?? [])]);
    return {
      command: executable,
      ...(args || tokens2.length > 1
        ? {
            args: mergedArgs,
          }
        : {}),
    };
  } catch (error) {
    if (!(
      error instanceof CustomMcpCommandSyntaxError || error instanceof CustomMcpValidationError
    ))
      throw error;
    if (options.source === "stored")
      return {
        command: command2,
        ...(args
          ? {
              args,
            }
          : {}),
      };
    if (error instanceof CustomMcpCommandSyntaxError)
      throw new CustomMcpValidationError("Invalid MCP command line", "command", error.issue);
    throw error;
  }
}
function normalizeConfig(input, options) {
  if (!isRecord$e(input) || typeof input.transport !== "string") {
    throw new CustomMcpValidationError("Invalid MCP server config");
  }
  const common2 = normalizeCommonConfig(input);
  if (input.transport === "stdio") {
    if (
      hasUnknownKeys(input, ["transport", "command", "args", "env", "timeoutMs", "description"])
    ) {
      throw new CustomMcpValidationError("Unsupported stdio MCP field");
    }
    const launch = normalizeCustomMcpLaunch(input.command, input.args, options);
    const env2 = normalizeStringMap(input.env, false);
    return {
      transport: "stdio",
      ...launch,
      ...(env2
        ? {
            env: env2,
          }
        : {}),
      ...common2,
    };
  }
  if (
    input.transport !== "http" &&
    input.transport !== "streamable-http" &&
    input.transport !== "sse"
  ) {
    throw new CustomMcpValidationError("Unsupported MCP transport");
  }
  if (hasUnknownKeys(input, ["transport", "url", "headers", "timeoutMs", "description"])) {
    throw new CustomMcpValidationError("Unsupported remote MCP field");
  }
  const url2 = requireRemoteUrl(input.url);
  const headers = normalizeStringMap(input.headers, true);
  return {
    transport: input.transport,
    url: url2,
    ...(headers
      ? {
          headers,
        }
      : {}),
    ...common2,
  };
}
function normalizeCommonConfig(input) {
  let timeoutMs;
  if (input.timeoutMs !== void 0) {
    if (
      typeof input.timeoutMs !== "number" ||
      !Number.isSafeInteger(input.timeoutMs) ||
      input.timeoutMs <= 0 ||
      input.timeoutMs > MAX_TIMEOUT_MS
    ) {
      throw new CustomMcpValidationError("Invalid MCP timeout", "timeoutMs");
    }
    timeoutMs = input.timeoutMs;
  }
  let description;
  if (input.description !== void 0) {
    if (typeof input.description !== "string") {
      throw new CustomMcpValidationError("Invalid MCP description", "description");
    }
    const trimmed = input.description.trim();
    if (!trimmed || trimmed.length > MAX_DESCRIPTION_LENGTH) {
      throw new CustomMcpValidationError("Invalid MCP description", "description");
    }
    description = trimmed;
  }
  return {
    ...(timeoutMs
      ? {
          timeoutMs,
        }
      : {}),
    ...(description
      ? {
          description,
        }
      : {}),
  };
}
function requireServerName(value, maxLength) {
  if (typeof value !== "string")
    throw new CustomMcpValidationError("Invalid MCP server name", "name");
  const name2 = value.trim();
  if (!SERVER_NAME_PATTERN.test(name2) || Array.from(name2).length > maxLength) {
    throw new CustomMcpValidationError("Invalid MCP server name", "name");
  }
  return name2;
}
function requireBoundedString(value, maxLength, field) {
  if (typeof value !== "string") throw new CustomMcpValidationError("Invalid MCP string", field);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    throw new CustomMcpValidationError("Invalid MCP string", field);
  }
  return trimmed;
}
function requireRemoteUrl(value) {
  const raw2 = requireBoundedString(value, MAX_URL_LENGTH, "url");
  try {
    const url2 = new URL(raw2);
    if ((url2.protocol !== "http:" && url2.protocol !== "https:") || !url2.hostname) {
      throw new CustomMcpValidationError("Invalid MCP URL", "url");
    }
    return raw2;
  } catch (error) {
    if (error instanceof CustomMcpValidationError) throw error;
    throw new CustomMcpValidationError("Invalid MCP URL", "url");
  }
}
function normalizeStringArray(value) {
  if (value === void 0) return void 0;
  if (
    !Array.isArray(value) ||
    value.length > MAX_ARGUMENTS ||
    value.some((item) => typeof item !== "string" || item.length > MAX_ARGUMENT_LENGTH)
  ) {
    throw new CustomMcpValidationError("Invalid MCP arguments", "args");
  }
  return [...value];
}
function normalizeStringMap(value, caseInsensitive) {
  if (value === void 0) return void 0;
  if (!isRecord$e(value) || Object.keys(value).length > MAX_KEY_VALUES) {
    throw new CustomMcpValidationError(
      "Invalid MCP key-value map",
      caseInsensitive ? "headers" : "env",
    );
  }
  const result = {};
  const seen2 = new Set();
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key2 = rawKey.trim();
    const normalizedKey = caseInsensitive ? key2.toLocaleLowerCase() : key2;
    if (
      !key2 ||
      key2.length > MAX_KEY_LENGTH ||
      seen2.has(normalizedKey) ||
      typeof rawValue !== "string" ||
      rawValue.length > MAX_VALUE_LENGTH
    ) {
      throw new CustomMcpValidationError(
        "Invalid MCP key-value map",
        caseInsensitive ? "headers" : "env",
      );
    }
    seen2.add(normalizedKey);
    result[key2] = rawValue;
  }
  return result;
}
function hasUnknownKeys(value, allowed) {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).some((key2) => !allowedKeys.has(key2));
}
function isRecord$e(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
export const IGenericConnectorService = createDecorator("genericConnectorService");
export const IHcpCliService = createDecorator("hcpCliService");
export const IHiloApp = createDecorator("hiloApp");
class WorkspaceFolderMissingError extends Error {
  constructor(folderPath) {
    super(`Workspace parent folder does not exist: ${folderPath}`);
    this.name = "WorkspaceFolderMissingError";
  }
}
export const hilo$1 = Object.freeze(
  Object.defineProperty(
    {
      __proto__: null,
      IHiloApp,
      WorkspaceFolderMissingError,
      isWorkspaceFolderMissingError,
      workspaceRuntimeFromOpenResult,
    },
    Symbol.toStringTag,
    {
      value: "Module",
    },
  ),
);
const FILE_PUBLISH_FAILURE_REASONS = new Set([
  "invalid_destination",
  "parent_not_directory",
  "root_unavailable",
  "permission_denied",
  "destination_busy",
  "disk_full",
  "verification_failed",
  "publish_failed",
]);
function getFilePublishFailureReason(error) {
  if (!error || typeof error !== "object") return void 0;
  const prefix = "FilePublishError:";
  const name2 = error.name;
  if (typeof name2 !== "string" || !name2.startsWith(prefix)) return void 0;
  const reason = name2.slice(prefix.length);
  return FILE_PUBLISH_FAILURE_REASONS.has(reason) ? reason : void 0;
}
export function getProjectExportFailureReason(error) {
  const publishReason = getFilePublishFailureReason(error);
  if (publishReason) return publishReason;
  if (!error || typeof error !== "object") return void 0;
  const name2 = error.name;
  if (name2 === "ProjectExportDestinationError:destination_inside_project") {
    return "destination_inside_project";
  }
  return name2 === "ProjectExportActivityError:activity_unavailable"
    ? "activity_unavailable"
    : void 0;
}
export const IProjectArchiveService = createDecorator("projectArchiveService");
export const IQuarkDriveAuthService = createDecorator("quarkDriveAuthService");
export const ISkillExportService = createDecorator("skillExportService");
export function errorHandler(listener) {
  errorListeners.push(listener);
  return () => {
    const idx = errorListeners.indexOf(listener);
    if (idx >= 0) {
      errorListeners.splice(idx, 1);
    }
  };
}
export function getErrorMessage$1(error) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}
const PATH_ACCESS_DENIED_PREFIX = "Access denied:";
export function isPathAccessError(err) {
  return err instanceof Error && err.message.startsWith(PATH_ACCESS_DENIED_PREFIX);
}
export class InstantiationService {
  constructor(
    _services = new ServiceCollection(),
    _strict = false,
    _parent,
    _enableTracing = _enableAllTracing,
  ) {
    this._services = _services;
    this._strict = _strict;
    this._parent = _parent;
    this._enableTracing = _enableTracing;
    this._services.set(IInstantiationService, this);
    this._globalGraph = _enableTracing ? (_parent?._globalGraph ?? new Graph((e2) => e2)) : void 0;
  }
  _globalGraph;
  _globalGraphImplicitDependency;
  _isDisposed = false;
  _servicesToMaybeDispose = new Set();
  _children = new Set();
  dispose() {
    if (!this._isDisposed) {
      this._isDisposed = true;
      dispose(this._children);
      this._children.clear();
      for (const candidate of this._servicesToMaybeDispose) {
        if (isDisposable(candidate)) {
          candidate.dispose();
        }
      }
      this._servicesToMaybeDispose.clear();
    }
  }
  _throwIfDisposed() {
    if (this._isDisposed) {
      throw new Error("InstantiationService has been disposed");
    }
  }
  createChild(services2, store) {
    this._throwIfDisposed();
    const that = this;
    const result = new (class extends InstantiationService {
      dispose() {
        that._children.delete(result);
        super.dispose();
      }
    })(services2, this._strict, this, this._enableTracing);
    this._children.add(result);
    store?.add(result);
    return result;
  }
  invokeFunction(fn2, ...args) {
    this._throwIfDisposed();
    const _trace = Trace.traceInvocation(this._enableTracing, fn2);
    let _done = false;
    try {
      const accessor = {
        get: (id2) => {
          if (_done) {
            throw illegalState(
              "service accessor is only valid during the invocation of its target method",
            );
          }
          const result = this._getOrCreateServiceInstance(id2, _trace);
          if (!result) {
            this._throwIfStrict(`[invokeFunction] unknown service '${id2}'`, false);
          }
          return result;
        },
      };
      return fn2(accessor, ...args);
    } finally {
      _done = true;
      _trace.stop();
    }
  }
  createInstance(ctorOrDescriptor, ...rest) {
    this._throwIfDisposed();
    let _trace;
    let result;
    if (ctorOrDescriptor instanceof SyncDescriptor) {
      _trace = Trace.traceCreation(this._enableTracing, ctorOrDescriptor.ctor);
      result = this._createInstance(
        ctorOrDescriptor.ctor,
        ctorOrDescriptor.staticArguments.concat(rest),
        _trace,
      );
    } else {
      _trace = Trace.traceCreation(this._enableTracing, ctorOrDescriptor);
      result = this._createInstance(ctorOrDescriptor, rest, _trace);
    }
    _trace.stop();
    return result;
  }
  _createInstance(ctor, args = [], _trace) {
    const serviceDependencies = _util
      .getServiceDependencies(ctor)
      .sort((a2, b3) => a2.index - b3.index);
    const serviceArgs = [];
    for (const dependency of serviceDependencies) {
      const service2 = this._getOrCreateServiceInstance(dependency.id, _trace);
      if (!service2) {
        this._throwIfStrict(
          `[createInstance] ${ctor.name} depends on UNKNOWN service ${dependency.id}.`,
          false,
        );
      }
      serviceArgs.push(service2);
    }
    const firstServiceArgPos =
      serviceDependencies.length > 0 ? serviceDependencies[0].index : args.length;
    if (args.length !== firstServiceArgPos) {
      console.trace(
        `[createInstance] First service dependency of ${ctor.name} at position ${firstServiceArgPos + 1} conflicts with ${args.length} static arguments`,
      );
      const delta = firstServiceArgPos - args.length;
      if (delta > 0) {
        args = args.concat(new Array(delta));
      } else {
        args = args.slice(0, firstServiceArgPos);
      }
    }
    return Reflect.construct(ctor, args.concat(serviceArgs));
  }
  _setCreatedServiceInstance(id2, instance2) {
    if (this._services.get(id2) instanceof SyncDescriptor) {
      this._services.set(id2, instance2);
    } else if (this._parent) {
      this._parent._setCreatedServiceInstance(id2, instance2);
    } else {
      throw new Error("illegalState - setting UNKNOWN service instance");
    }
  }
  _getServiceInstanceOrDescriptor(id2) {
    const instanceOrDesc = this._services.get(id2);
    if (!instanceOrDesc && this._parent) {
      return this._parent._getServiceInstanceOrDescriptor(id2);
    } else {
      return instanceOrDesc;
    }
  }
  _getOrCreateServiceInstance(id2, _trace) {
    if (this._globalGraph && this._globalGraphImplicitDependency) {
      this._globalGraph.insertEdge(this._globalGraphImplicitDependency, String(id2));
    }
    const thing = this._getServiceInstanceOrDescriptor(id2);
    if (thing instanceof SyncDescriptor) {
      return this._safeCreateAndCacheServiceInstance(id2, thing, _trace.branch(id2, true));
    } else {
      _trace.branch(id2, false);
      return thing;
    }
  }
  _activeInstantiations = new Set();
  _safeCreateAndCacheServiceInstance(id2, desc2, _trace) {
    if (this._activeInstantiations.has(id2)) {
      throw new Error(`illegal state - RECURSIVELY instantiating service '${id2}'`);
    }
    this._activeInstantiations.add(id2);
    try {
      return this._createAndCacheServiceInstance(id2, desc2, _trace);
    } finally {
      this._activeInstantiations.delete(id2);
    }
  }
  _createAndCacheServiceInstance(id2, desc2, _trace) {
    const graph = new Graph((data2) => data2.id.toString());
    let cycleCount = 0;
    const stack = [
      {
        id: id2,
        desc: desc2,
      },
    ];
    while (stack.length) {
      const item = stack.pop();
      graph.lookupOrInsertNode(item);
      if (cycleCount++ > 1e3) {
        throw new CyclicDependencyError(graph);
      }
      for (const dependency of _util.getServiceDependencies(item.desc.ctor)) {
        const instanceOrDesc = this._getServiceInstanceOrDescriptor(dependency.id);
        if (!instanceOrDesc) {
          this._throwIfStrict(
            `[createInstance] ${id2} depends on ${dependency.id} which is NOT registered.`,
            true,
          );
        }
        if (instanceOrDesc instanceof SyncDescriptor) {
          const d2 = {
            id: dependency.id,
            desc: instanceOrDesc,
          };
          graph.insertEdge(item, d2);
          stack.push(d2);
        }
      }
    }
    while (true) {
      const roots = graph.roots();
      if (roots.length === 0) {
        if (!graph.isEmpty()) {
          throw new CyclicDependencyError(graph);
        }
        break;
      }
      for (const { data: data2 } of roots) {
        const instanceOrDesc = this._getServiceInstanceOrDescriptor(data2.id);
        if (instanceOrDesc instanceof SyncDescriptor) {
          const instance2 = this._createServiceInstanceWithOwner(
            data2.id,
            data2.desc.ctor,
            data2.desc.staticArguments,
            data2.desc.supportsDelayedInstantiation,
            _trace,
          );
          this._setCreatedServiceInstance(data2.id, instance2);
        }
        graph.removeNode(data2);
      }
    }
    return this._getServiceInstanceOrDescriptor(id2);
  }
  _createServiceInstanceWithOwner(id2, ctor, args = [], supportsDelayedInstantiation, _trace) {
    if (this._services.get(id2) instanceof SyncDescriptor) {
      return this._createServiceInstance(id2, ctor, args, supportsDelayedInstantiation, _trace);
    } else if (this._parent) {
      return this._parent._createServiceInstanceWithOwner(
        id2,
        ctor,
        args,
        supportsDelayedInstantiation,
        _trace,
      );
    } else {
      throw new Error(`illegalState - creating UNKNOWN service instance ${ctor.name}`);
    }
  }
  _createServiceInstance(_id, ctor, args = [], _supportsDelayedInstantiation, _trace) {
    const result = this._createInstance(ctor, args, _trace);
    this._servicesToMaybeDispose.add(result);
    return result;
  }
  _throwIfStrict(msg, printWarning) {
    if (printWarning) {
      console.warn(msg);
    }
    if (this._strict) {
      throw new Error(msg);
    }
  }
}
