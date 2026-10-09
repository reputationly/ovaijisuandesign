// normalize-custom-mcp-launch.js
import {
  CustomMcpCommandSyntaxError,
  CustomMcpValidationError,
  parseCustomMcpArguments,
  requireBoundedString,
} from "./parse-custom-mcp-arguments.js";

const COMMAND_PATH = /^(?:\/|\.{1,2}[\\/]|[a-z]:[\\/]|\\\\|~[\\/])/iu;

function splitCustomMcpCommand(command2, isCommandFile) {
  if (COMMAND_PATH.test(command2)) {
    if (!isCommandFile || isCommandFile(command2) || !/\s/u.test(command2))
      return [command2];
    const tokens22 = parseCustomMcpArguments(command2, true);
    if (!tokens22[0] || !isCommandFile(tokens22[0])) return [command2];
    return tokens22;
  }
  const tokens2 = parseCustomMcpArguments(command2, true);
  if (
    tokens2[0] &&
    /[\s"']/u.test(tokens2[0]) &&
    !COMMAND_PATH.test(tokens2[0])
  ) {
    throw new CustomMcpCommandSyntaxError("ambiguous_executable");
  }
  return tokens2;
}

const MAX_COMMAND_LENGTH = 1024;

const MAX_ARGUMENTS = 128;

const MAX_ARGUMENT_LENGTH = 4096;

function normalizeStringArray(value) {
  if (value === void 0) return void 0;
  if (
    !Array.isArray(value) ||
    value.length > MAX_ARGUMENTS ||
    value.some(
      (item) => typeof item !== "string" || item.length > MAX_ARGUMENT_LENGTH,
    )
  ) {
    throw new CustomMcpValidationError("Invalid MCP arguments", "args");
  }
  return [...value];
}

export function normalizeCustomMcpLaunch(rawCommand, rawArgs, options = {}) {
  const command2 = requireBoundedString(
    rawCommand,
    MAX_COMMAND_LENGTH,
    "command",
  );
  const args = normalizeStringArray(rawArgs);
  try {
    const tokens2 = splitCustomMcpCommand(command2, options.isCommandFile);
    const executable = requireBoundedString(
      tokens2[0],
      MAX_COMMAND_LENGTH,
      "command",
    );
    const mergedArgs = normalizeStringArray([
      ...tokens2.slice(1),
      ...(args ?? []),
    ]);
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
      error instanceof CustomMcpCommandSyntaxError ||
      error instanceof CustomMcpValidationError
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
      throw new CustomMcpValidationError(
        "Invalid MCP command line",
        "command",
        error.issue,
      );
    throw error;
  }
}
