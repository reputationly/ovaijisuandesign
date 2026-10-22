// use-model-defaults.js
import {
  listTextEditSessionEntries,
  LOCAL_CACHE_KEY,
  normalizeEntryList,
  normalizeTextEditSessionRecord,
} from "./handle-session-created-response.js";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { dedupedToast } from "../infra/agent-http-client.js";
export function readLocalCache() {
  if (typeof localStorage === "undefined") return {};
  try {
    return normalizeTextEditSessionRecord(
      JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) ?? "{}"),
    );
  } catch {
    return {};
  }
}
export function cachedTextEditSessionBindings(workspaceKey) {
  if (!workspaceKey) return {};
  return readLocalCache()[workspaceKey] ?? {};
}
export function mergeTextEditSessionBindings(persisted, inMemory) {
  const merged = {};
  for (const nodeId of new Set([
    ...Object.keys(persisted),
    ...Object.keys(inMemory),
  ])) {
    const saved = persisted[nodeId];
    const current = inMemory[nodeId];
    if (!saved) {
      if (current) merged[nodeId] = current;
      continue;
    }
    if (!current) {
      merged[nodeId] = saved;
      continue;
    }
    const newer = current.updatedAt >= saved.updatedAt ? current : saved;
    const older = newer === current ? saved : current;
    const sessions = normalizeEntryList([
      ...listTextEditSessionEntries(newer),
      ...listTextEditSessionEntries(older),
    ]);
    merged[nodeId] = {
      ...older,
      ...newer,
      updatedAt: newer.updatedAt,
      ...(sessions.length > 0
        ? {
            sessions,
          }
        : {}),
    };
  }
  return merged;
}
export function collectBindingSessionIds(binding) {
  const ids = new Set();
  if (!binding) return ids;
  if (binding.uiSessionId) ids.add(binding.uiSessionId);
  if (binding.runtimeSessionId) ids.add(binding.runtimeSessionId);
  for (const entry of listTextEditSessionEntries(binding)) {
    if (entry.uiSessionId) ids.add(entry.uiSessionId);
    if (entry.runtimeSessionId) ids.add(entry.runtimeSessionId);
  }
  return ids;
}
export function collectTextEditSessionIds(bindings) {
  const ids = new Set();
  for (const binding of Object.values(bindings)) {
    for (const sessionId of collectBindingSessionIds(binding)) ids.add(sessionId);
  }
  return ids;
}
export function resolveTextEditSessionId(binding, state) {
  if (!binding) return null;
  const candidates = [binding.runtimeSessionId, binding.uiSessionId].filter(
    (value) => Boolean(value),
  );
  for (const candidate of candidates) {
    if (state.sessions.has(candidate)) return candidate;
  }
  for (const [sessionId, session] of state.sessions) {
    if (
      session.runtimeSessionId &&
      candidates.includes(session.runtimeSessionId)
    )
      return sessionId;
  }
  return null;
}
export function useAgentModeAwareSend(sendRaw, agentMode = "auto") {
  const agentModeRef = reactExports.useRef(agentMode);
  agentModeRef.current = agentMode;
  // 第 345 轮（验收）：参照的 send2 在发 message 前会先给该 session 同步一次 agent mode
  //   （index-BBp4hclA.js 的 syncSessionMode）：
  //   如果这个 session 记录的模式与当前 agentMode 不同，先发一帧 set_mode 再发 message。
  // 之前只有编辑器插件桥（media-editing/use-plugin-chat-bridge.js）补过，
  // 通过这个统一发送口的屏（ws-text-editor / ws-table-edit / ws-canvas-ops 等）仍缺这一帧。
  const sessionModes = reactExports.useRef(new Map());
  return reactExports.useCallback(
    (message) => {
      const mode = agentModeRef.current;
      if (
        message.type === "create_session" ||
        message.type === "switch_session"
      ) {
        return sendRaw({
          ...message,
          mode: message.mode ?? mode,
        });
      }
      // 只对携带 session_id 的 message 同步；其它帧原样透传
      if (message.type === "message" && typeof message.session_id === "string") {
        const sessionId = message.session_id;
        if (sessionModes.current.get(sessionId) !== mode) {
          const ok = sendRaw({ type: "set_mode", session_id: sessionId, mode });
          if (ok === false) return ok;
          sessionModes.current.set(sessionId, mode);
        }
      }
      return sendRaw(message);
    },
    [sendRaw],
  );
}
export function useModelDefaults({
  defaultModelId,
  defaultSelectedMediaModels,
  onRememberDefaults,
}) {
  const { t: translate } = useTranslation();
  const pendingRef = reactExports.useRef(null);
  const persistedRef = reactExports.useRef({});
  persistedRef.current = {
    modelId: defaultModelId,
    media: defaultSelectedMediaModels,
  };
  const [, setRevision] = reactExports.useState(0);
  const getDefaults = reactExports.useCallback(
    () => pendingRef.current ?? persistedRef.current,
    [],
  );
  const rememberDefaults = reactExports.useCallback(
    async (selection) => {
      const request = {
        ...getDefaults(),
        ...selection,
      };
      pendingRef.current = request;
      setRevision((revision) => revision + 1);
      if (!onRememberDefaults) return;
      let saved = false;
      try {
        saved = await onRememberDefaults(selection);
      } catch {
      } finally {
        if (pendingRef.current === request) {
          pendingRef.current = null;
          setRevision((revision) => revision + 1);
        }
        if (!saved)
          dedupedToast.error(translate("chat.mediaModels.defaultSaveFailed"));
      }
    },
    [getDefaults, onRememberDefaults, translate],
  );
  const getDefaultModelId = reactExports.useCallback(
    () => getDefaults().modelId,
    [getDefaults],
  );
  const getDefaultSelectedMediaModels = reactExports.useCallback(
    () => getDefaults().media,
    [getDefaults],
  );
  return {
    defaultModelId: getDefaults().modelId,
    defaultSelectedMediaModels: getDefaults().media,
    rememberDefaults,
    getDefaultModelId,
    getDefaultSelectedMediaModels,
  };
}
