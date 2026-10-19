// parse-custom-mcp-arguments.js
const PATH_ACCESS_DENIED_PREFIX = "Access denied:";
import jsxRuntimeExports from "react/jsx-runtime";
import { isWorkspaceFolderMissingError } from "../workspace/workspace-folder-missing.js";
import { workspaceRuntimeFromOpenResult } from "../vendor-inline/vscode-base/linked-list.js";
export var _util;
((_util) => {
  _util.serviceIds = new Map();
  _util.DI_TARGET = "$di$target";
  _util.DI_DEPENDENCIES = "$di$dependencies";
  function getServiceDependencies(ctor) {
    return ctor[_util.DI_DEPENDENCIES] || [];
  }
  _util.getServiceDependencies = getServiceDependencies;
})(_util || (_util = {}));
function storeServiceDependency(id, target, index) {
  if (target[_util.DI_TARGET] === target) {
    target[_util.DI_DEPENDENCIES].push({
      id,
      index,
    });
  } else {
    target[_util.DI_DEPENDENCIES] = [
      {
        id,
        index,
      },
    ];
    target[_util.DI_TARGET] = target;
  }
}
export function createDecorator(serviceId) {
  if (_util.serviceIds.has(serviceId)) {
    return _util.serviceIds.get(serviceId);
  }
  const id = function (target, _key, index) {
    if (arguments.length !== 3) {
      throw new Error(
        "@IServiceName-decorator can only be used to decorate a parameter",
      );
    }
    storeServiceDependency(id, target, index);
  };
  id.toString = () => serviceId;
  _util.serviceIds.set(serviceId, id);
  return id;
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
  let current = "";
  let quote;
  let tokenStarted = false;
  let windowsPath = false;
  for (let index = 0; index < value.length; index++) {
    const character = value.charAt(index);
    if (!tokenStarted && !/\s/u.test(character)) {
      const start =
        character === '"' || character === "'" ? index + 1 : index;
      windowsPath =
        character !== "'" && /^(?:[a-z]:\\|\\\\)/iu.test(value.slice(start));
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
        result.push(current);
        current = "";
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
      index + 1 < value.length
    ) {
      const nextCharacter = value.charAt(index + 1);
      if (
        (quote === '"' && /["\\$`]/u.test(nextCharacter)) ||
        (!quote && /[\s"'\\|&;<>$`]/u.test(nextCharacter))
      ) {
        current += nextCharacter;
        index += 1;
        tokenStarted = true;
        continue;
      }
    }
    current += character;
    tokenStarted = true;
  }
  if (quote) throw new CustomMcpCommandSyntaxError("unclosed_quote");
  if (tokenStarted) result.push(current);
  return result;
}
export const ICustomMcpService = createDecorator("customMcpService");
export const CUSTOM_MCP_NAME_MAX_LENGTH = 24;
export class CustomMcpValidationError extends Error {
  constructor(message, field, commandIssue) {
    super(message);
    this.field = field;
    this.commandIssue = commandIssue;
  }
  name = "CustomMcpValidationError";
}
export function isReservedCustomMcpName(mcpName) {
  const normalized = mcpName.trim().replace(/\./gu, "_").toLowerCase();
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
export const hilo = Object.freeze(
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
  const errorName = error.name;
  if (typeof errorName !== "string" || !errorName.startsWith(prefix)) return void 0;
  const reason = errorName.slice(prefix.length);
  return FILE_PUBLISH_FAILURE_REASONS.has(reason) ? reason : void 0;
}
export function getProjectExportFailureReason(error) {
  const publishReason = getFilePublishFailureReason(error);
  if (publishReason) return publishReason;
  if (!error || typeof error !== "object") return void 0;
  const errorName = error.name;
  if (errorName === "ProjectExportDestinationError:destination_inside_project") {
    return "destination_inside_project";
  }
  return errorName === "ProjectExportActivityError:activity_unavailable"
    ? "activity_unavailable"
    : void 0;
}
export const IProjectArchiveService = createDecorator("projectArchiveService");
export const ISkillExportService = createDecorator("skillExportService");
export function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}
export function isPathAccessError(err) {
  return (
    err instanceof Error && err.message.startsWith(PATH_ACCESS_DENIED_PREFIX)
  );
}
