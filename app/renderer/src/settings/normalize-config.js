// normalize-config.js
import {
  CUSTOM_MCP_NAME_MAX_LENGTH,
  CustomMcpValidationError,
  isReservedCustomMcpName,
  requireBoundedString,
} from "./parse-custom-mcp-arguments.js";
import { normalizeCustomMcpLaunch } from "./normalize-custom-mcp-launch.js";

const STORED_NAME_MAX_LENGTH = 80;

const SERVER_NAME_PATTERN = /^[\p{Script=Han}a-zA-Z0-9_.-]+$/u;

const MAX_URL_LENGTH = 8192;

const MAX_DESCRIPTION_LENGTH = 500;

const MAX_KEY_VALUES = 64;

const MAX_KEY_LENGTH = 256;

const MAX_VALUE_LENGTH = 8192;

const MAX_TIMEOUT_MS = 36e5;

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
      throw new CustomMcpValidationError(
        "Invalid MCP description",
        "description",
      );
    }
    const trimmed = input.description.trim();
    if (!trimmed || trimmed.length > MAX_DESCRIPTION_LENGTH) {
      throw new CustomMcpValidationError(
        "Invalid MCP description",
        "description",
      );
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
  const trimmedName = value.trim();
  if (
    !SERVER_NAME_PATTERN.test(trimmedName) ||
    Array.from(trimmedName).length > maxLength
  ) {
    throw new CustomMcpValidationError("Invalid MCP server name", "name");
  }
  return trimmedName;
}

function requireRemoteUrl(value) {
  const raw = requireBoundedString(value, MAX_URL_LENGTH, "url");
  try {
    const url = new URL(raw);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      !url.hostname
    ) {
      throw new CustomMcpValidationError("Invalid MCP URL", "url");
    }
    return raw;
  } catch (error) {
    if (error instanceof CustomMcpValidationError) throw error;
    throw new CustomMcpValidationError("Invalid MCP URL", "url");
  }
}

function hasUnknownKeys(value, allowed) {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).some((key) => !allowedKeys.has(key));
}

function isRecord$e(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
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
  const seen = new Set();
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = rawKey.trim();
    const normalizedKey = caseInsensitive ? key.toLocaleLowerCase() : key;
    if (
      !key ||
      key.length > MAX_KEY_LENGTH ||
      seen.has(normalizedKey) ||
      typeof rawValue !== "string" ||
      rawValue.length > MAX_VALUE_LENGTH
    ) {
      throw new CustomMcpValidationError(
        "Invalid MCP key-value map",
        caseInsensitive ? "headers" : "env",
      );
    }
    seen.add(normalizedKey);
    result[key] = rawValue;
  }
  return result;
}

function normalizeConfig(input, options) {
  if (!isRecord$e(input) || typeof input.transport !== "string") {
    throw new CustomMcpValidationError("Invalid MCP server config");
  }
  const common = normalizeCommonConfig(input);
  if (input.transport === "stdio") {
    if (
      hasUnknownKeys(input, [
        "transport",
        "command",
        "args",
        "env",
        "timeoutMs",
        "description",
      ])
    ) {
      throw new CustomMcpValidationError("Unsupported stdio MCP field");
    }
    const launch = normalizeCustomMcpLaunch(input.command, input.args, options);
    const env = normalizeStringMap(input.env, false);
    return {
      transport: "stdio",
      ...launch,
      ...(env
        ? {
            env,
          }
        : {}),
      ...common,
    };
  }
  if (
    input.transport !== "http" &&
    input.transport !== "streamable-http" &&
    input.transport !== "sse"
  ) {
    throw new CustomMcpValidationError("Unsupported MCP transport");
  }
  if (
    hasUnknownKeys(input, [
      "transport",
      "url",
      "headers",
      "timeoutMs",
      "description",
    ])
  ) {
    throw new CustomMcpValidationError("Unsupported remote MCP field");
  }
  const url = requireRemoteUrl(input.url);
  const headers = normalizeStringMap(input.headers, true);
  return {
    transport: input.transport,
    url,
    ...(headers
      ? {
          headers,
        }
      : {}),
    ...common,
  };
}

export function normalizeCustomMcpServerInput(input, options = {}) {
  if (
    !isRecord$e(input) ||
    hasUnknownKeys(input, ["name", "enabled", "config"])
  ) {
    throw new CustomMcpValidationError("Invalid MCP server input");
  }
  const serverName = requireServerName(
    input.name,
    options.source === "stored" || options.source === "update"
      ? STORED_NAME_MAX_LENGTH
      : CUSTOM_MCP_NAME_MAX_LENGTH,
  );
  if (isReservedCustomMcpName(serverName)) {
    throw new CustomMcpValidationError("Reserved MCP server name", "name");
  }
  if (typeof input.enabled !== "boolean") {
    throw new CustomMcpValidationError("Invalid MCP enabled state");
  }
  return {
    name: serverName,
    enabled: input.enabled,
    config: normalizeConfig(input.config, options),
  };
}
