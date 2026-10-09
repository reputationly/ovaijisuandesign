// parse-connector-catalog.js
import { record } from "./parse-connector-selection.js";

function isMarketConnectorId(value) {
  return (
    /^[a-z0-9][a-z0-9._-]{0,127}$/.test(value) && !value.startsWith("custom.")
  );
}

function configuredConnectorId(runtimeName) {
  return `custom.${runtimeName}`;
}

function isConfiguredConnectorId(id2) {
  return (
    /^custom\.[a-zA-Z0-9_.-]{1,80}$/.test(id2) &&
    !/^custom\.hub(?:[._]|$)/i.test(id2)
  );
}

export function parseConnectorCatalog(value) {
  if (
    !record(value) ||
    typeof value.version !== "string" ||
    !Array.isArray(value.connectors)
  )
    throw new Error("Invalid connector catalog");
  return {
    version: value.version,
    ...(typeof value.marketAvailable === "boolean"
      ? {
          marketAvailable: value.marketAvailable,
        }
      : {}),
    ...(typeof value.fromCache === "boolean"
      ? {
          fromCache: value.fromCache,
        }
      : {}),
    connectors: value.connectors.map((item) => {
      if (
        !record(item) ||
        typeof item.connectorId !== "string" ||
        (item.source === "configured"
          ? typeof item.runtimeName !== "string" ||
            !isConfiguredConnectorId(item.connectorId) ||
            item.connectorId !== configuredConnectorId(item.runtimeName)
          : !isMarketConnectorId(item.connectorId)) ||
        (item.source !== void 0 && item.source !== "configured") ||
        typeof item.displayName !== "string" ||
        typeof item.summary !== "string" ||
        !["local", "remote"].includes(String(item.connection)) ||
        ![
          "not_installed",
          "not_configured",
          "disabled",
          "connecting",
          "connected",
          "failed",
        ].includes(String(item.state)) ||
        (item.runtimeName !== void 0 && typeof item.runtimeName !== "string") ||
        (item.autoActivated !== void 0 &&
          typeof item.autoActivated !== "boolean") ||
        (item.aliases !== void 0 &&
          (!Array.isArray(item.aliases) ||
            !item.aliases.every((v2) => typeof v2 === "string"))) ||
        (item.inputTypes !== void 0 &&
          (!Array.isArray(item.inputTypes) ||
            !item.inputTypes.every((v2) => typeof v2 === "string")))
      )
        throw new Error("Invalid connector entry");
      return {
        connectorId: item.connectorId,
        displayName: item.displayName,
        summary: item.summary,
        ...(Array.isArray(item.aliases)
          ? {
              aliases: item.aliases,
            }
          : {}),
        ...(Array.isArray(item.inputTypes)
          ? {
              inputTypes: item.inputTypes,
            }
          : {}),
        connection: item.connection,
        state: item.state,
        ...(typeof item.runtimeName === "string"
          ? {
              runtimeName: item.runtimeName,
            }
          : {}),
        ...(item.source === "configured"
          ? {
              source: "configured",
            }
          : {}),
        ...(typeof item.autoActivated === "boolean"
          ? {
              autoActivated: item.autoActivated,
            }
          : {}),
      };
    }),
  };
}
