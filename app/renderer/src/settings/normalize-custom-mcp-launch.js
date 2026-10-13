// normalize-custom-mcp-launch.js
import {
  CustomMcpCommandSyntaxError,
  CustomMcpValidationError,
  parseCustomMcpArguments,
  requireBoundedString,
} from "./parse-custom-mcp-arguments.js";

const COMMAND_PATH = /^(?:\/|\.{1,2}[\\/]|[a-z]:[\\/]|\\\\|~[\\/])/iu;

function splitCustomMcpCommand(command, isCommandFile) {
  if (COMMAND_PATH.test(command)) {
    if (!isCommandFile || isCommandFile(command) || !/\s/u.test(command))
      return [command];
    const tokens = parseCustomMcpArguments(command, true);
    if (!tokens[0] || !isCommandFile(tokens[0])) return [command];
    return tokens;
  }
  const tokens = parseCustomMcpArguments(command, true);
  if (
    tokens[0] &&
    /[\s"']/u.test(tokens[0]) &&
    !COMMAND_PATH.test(tokens[0])
  ) {
    throw new CustomMcpCommandSyntaxError("ambiguous_executable");
  }
  return tokens;
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
  const command = requireBoundedString(
    rawCommand,
    MAX_COMMAND_LENGTH,
    "command",
  );
  const args = normalizeStringArray(rawArgs);
  try {
    const tokens = splitCustomMcpCommand(command, options.isCommandFile);
    const executable = requireBoundedString(
      tokens[0],
      MAX_COMMAND_LENGTH,
      "command",
    );
    const mergedArgs = normalizeStringArray([
      ...tokens.slice(1),
      ...(args ?? []),
    ]);
    return {
      command: executable,
      ...(args || tokens.length > 1
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
        command,
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
