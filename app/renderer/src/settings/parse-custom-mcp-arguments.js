// parse-custom-mcp-arguments.js
import { isWorkspaceFolderMissingError } from "../vendor.js";
import { workspaceRuntimeFromOpenResult } from "../vendor-inline/vscode-base/linked-list.js";

export var _util;

((_util2) => {
  _util2.serviceIds = new Map();
  _util2.DI_TARGET = "$di$target";
  _util2.DI_DEPENDENCIES = "$di$dependencies";
  function getServiceDependencies(ctor) {
    return ctor[_util2.DI_DEPENDENCIES] || [];
  }
  _util2.getServiceDependencies = getServiceDependencies;
})(_util || (_util = {}));

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
      throw new Error(
        "@IServiceName-decorator can only be used to decorate a parameter",
      );
    }
    storeServiceDependency(id2, target, index2);
  };
  id2.toString = () => serviceId;
  _util.serviceIds.set(serviceId, id2);
  return id2;
}

export const IComfyUiModelDownloadService = createDecorator(
  "comfyUiModelDownloadService",
);

export const ILogService = createDecorator("logService");

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
      const start2 =
        character === '"' || character === "'" ? index2 + 1 : index2;
      windowsPath =
        character !== "'" && /^(?:[a-z]:\\|\\\\)/iu.test(value.slice(start2));
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
    if (
      character === "\\" &&
      !windowsPath &&
      quote !== "'" &&
      index2 + 1 < value.length
    ) {
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

export const ICustomMcpService = createDecorator("customMcpService");

export const CUSTOM_MCP_NAME_MAX_LENGTH = 24;

export class CustomMcpValidationError extends Error {
  constructor(message2, field, commandIssue) {
    super(message2);
    this.field = field;
    this.commandIssue = commandIssue;
  }
  name = "CustomMcpValidationError";
}

export function isReservedCustomMcpName(name2) {
  const normalized = name2.trim().replace(/\./gu, "_").toLowerCase();
  return (
    normalized === "hub" ||
    normalized.startsWith("hub_") ||
    ["__proto__", "constructor", "prototype"].includes(normalized)
  );
}

export function requireBoundedString(value, maxLength, field) {
  if (typeof value !== "string")
    throw new CustomMcpValidationError("Invalid MCP string", field);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    throw new CustomMcpValidationError("Invalid MCP string", field);
  }
  return trimmed;
}

export const IGenericConnectorService = createDecorator(
  "genericConnectorService",
);

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

export const ISkillExportService = createDecorator("skillExportService");

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
  return (
    err instanceof Error && err.message.startsWith(PATH_ACCESS_DENIED_PREFIX)
  );
}
