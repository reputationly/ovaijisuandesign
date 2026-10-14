// 市场策略、@ 提及、特殊连接器、状态文案、清单库存。
import { localizedI18nText } from "../../i18n/localized-text.js";
import { CONNECTOR_TOKEN_SOURCE, originsMatch, namesMatch, LIBTV_CONNECTOR, libtvIconUrl } from "./connector-match.js";
import { findHcpConnector, resolveConnectorIcon, getMergedHcpCatalog, hcpToDefinition, isSkillsOnly } from "./hcp-catalog.js";

export function emptyConnectorMarketPolicy() {
  return {
    permission: {
      isOperator: false
    },
    visibility: {
      visibleConnectorIds: []
    }
  };
}
export function findConnectorMentions(text2) {
  return [...text2.matchAll(new RegExp(String.raw`(?<=^|\s)${CONNECTOR_TOKEN_SOURCE}`, "gu"))].map(match2 => ({
    serverName: match2[1],
    ...(match2[2] ? {
      displayName: match2[2]
    } : {}),
    start: match2.index,
    end: match2.index + match2[0].length
  }));
}
const FIGMA_DESKTOP_MCP = {
  name: "figma-desktop",
  endpoint: "http://127.0.0.1:3845/mcp"
};
export function matchesRemoteConnectorServer(server, remote) {
  return server.transport !== "stdio" && (originsMatch(server.endpoint, remote.endpoint) || server.transport === void 0 && server.endpoint === void 0 && namesMatch(server.name, remote.serverName));
}
export const SPECIAL_CONNECTORS = {
  figma: () => ({
    id: "figma",
    serverName: FIGMA_DESKTOP_MCP.name,
    displayName: "Figma",
    iconUrl: (() => {
      const manifest = findHcpConnector("figma");
      return manifest ? resolveConnectorIcon(manifest.icon) : "";
    })(),
    matches: server => server.transport !== "stdio" && originsMatch(server.endpoint, FIGMA_DESKTOP_MCP.endpoint) && namesMatch(server.name, FIGMA_DESKTOP_MCP.name)
  }),
  libtv: () => ({
    id: "libtv",
    serverName: LIBTV_CONNECTOR.id,
    displayName: "LibTV",
    iconUrl: libtvIconUrl,
    matches: server => server.name === LIBTV_CONNECTOR.id && server.transport !== "stdio" && originsMatch(server.endpoint, LIBTV_CONNECTOR.url)
  })
};
export function buildOfficialConnectorList() {
  const result = [];
  for (const factory of Object.values(SPECIAL_CONNECTORS)) {
    result.push(factory());
  }
  for (const manifest of getMergedHcpCatalog()) {
    const id2 = manifest.connectorId;
    if (SPECIAL_CONNECTORS[id2]) continue;
    const def = hcpToDefinition(id2);
    if (def) result.push(def);
  }
  return result;
}
export function createConnectorInventory(load2) {
  let snapshot2 = {
    servers: [],
    loading: false,
    failed: false,
    loaded: false
  };
  const listeners2 = /* @__PURE__ */new Set();
  let pending2;
  let timer2;
  let revision = 0;
  const publish = next2 => {
    snapshot2 = next2;
    for (const listener of listeners2) listener();
  };
  const refresh = () => {
    if (pending2) return pending2;
    const requestedRevision = revision;
    publish({
      ...snapshot2,
      loading: true
    });
    pending2 = Promise.resolve().then(load2).then(servers => {
      if (requestedRevision === revision) publish({
        servers,
        loading: false,
        failed: false,
        loaded: true
      });
      return snapshot2.servers;
    }, error => {
      if (requestedRevision === revision) publish({
        ...snapshot2,
        loading: false,
        failed: true
      });
      throw error;
    }).finally(() => {
      pending2 = void 0;
    });
    return pending2;
  };
  return {
    getSnapshot: () => snapshot2,
    refresh,
    update(updater) {
      revision += 1;
      publish({
        ...snapshot2,
        servers: updater(snapshot2.servers),
        loading: false
      });
    },
    subscribe(listener) {
      listeners2.add(listener);
      timer2 ??= setInterval(() => {
        void refresh().catch(() => void 0);
      }, 3e3);
      return () => {
        listeners2.delete(listener);
        if (!listeners2.size) {
          clearInterval(timer2);
          timer2 = void 0;
        }
      };
    }
  };
}
export function connectorDescription(t2, language2, connectorId, description) {
  return t2(`connectors.catalog.${connectorId}.description`, localizedI18nText(description, language2));
}
export function supportsConnectorDialog(manifest) {
  if (manifest.ui.dialog === "local-app") return false;
  if (manifest.auth.kind === "cliAuth" || manifest.auth.kind === "hubOAuthProfile") return true;
  if (isSkillsOnly(manifest)) return true;
  const mcp = manifest.capabilities.mcp;
  if (mcp?.kind !== "remote") return false;
  if (manifest.auth.kind === "apiKey") return true;
  const templates = [...Object.values(mcp.headers ?? {}), ...Object.values(mcp.queryParams ?? {})];
  return !templates.some(value => value.includes("${user_config."));
}
export const connectorPromptActionLabelKey = {
  requiresInstall: "connectors.detail.downloadToConnect",
  installing: "connectors.detail.useAfterInstallation",
  requiresConnection: "connectors.detail.connectToUse",
  ready: "connectors.detail.tryInChat",
  requiresEnable: "connectors.detail.enableToUse",
  requiresRecovery: "connectors.detail.reconnectToUse"
};
export const CONNECTOR_STATUS_VISUAL = {
  connected: {
    tone: "neutral",
    markerTone: "success"
  },
  saved: {
    tone: "muted",
    markerTone: "muted"
  },
  needs_auth: {
    tone: "warning",
    markerTone: "warning"
  },
  disabled: {
    tone: "warning",
    markerTone: "warning"
  },
  notConnected: {
    tone: "muted",
    markerTone: "muted"
  },
  removing: {
    tone: "muted",
    markerTone: "warning"
  },
  checking: {
    tone: "muted",
    markerTone: "muted"
  },
  installing: {
    tone: "muted",
    markerTone: "warning"
  }
};
export const connectorSummaryActionLabelKey = {
  authorize: "connectors.detail.authorize",
  connect: "connectors.detail.connect",
  install: "connectors.connector.install",
  reinstall: "connectors.connector.reinstall",
  try: "connectors.detail.try",
  update: "connectors.connector.update"
};
