// use-model-defaults.js
import {
  listTextEditSessionEntries,
  LOCAL_CACHE_KEY,
  normalizeEntryList,
  normalizeTextEditSessionRecord,
} from "./handle-session-created-response.js";
import { dedupedToast, reactExports, useTranslation } from "../vendor.js";
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
    const current2 = inMemory[nodeId];
    if (!saved) {
      if (current2) merged[nodeId] = current2;
      continue;
    }
    if (!current2) {
      merged[nodeId] = saved;
      continue;
    }
    const newer = current2.updatedAt >= saved.updatedAt ? current2 : saved;
    const older = newer === current2 ? saved : current2;
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
  const ids2 = new Set();
  if (!binding) return ids2;
  if (binding.uiSessionId) ids2.add(binding.uiSessionId);
  if (binding.runtimeSessionId) ids2.add(binding.runtimeSessionId);
  for (const entry of listTextEditSessionEntries(binding)) {
    if (entry.uiSessionId) ids2.add(entry.uiSessionId);
    if (entry.runtimeSessionId) ids2.add(entry.runtimeSessionId);
  }
  return ids2;
}
export function collectTextEditSessionIds(bindings) {
  const ids2 = new Set();
  for (const binding of Object.values(bindings)) {
    for (const id2 of collectBindingSessionIds(binding)) ids2.add(id2);
  }
  return ids2;
}
export function resolveTextEditSessionId(binding, state2) {
  if (!binding) return null;
  const candidates2 = [binding.runtimeSessionId, binding.uiSessionId].filter(
    (value) => Boolean(value),
  );
  for (const candidate of candidates2) {
    if (state2.sessions.has(candidate)) return candidate;
  }
  for (const [sessionId, session] of state2.sessions) {
    if (
      session.runtimeSessionId &&
      candidates2.includes(session.runtimeSessionId)
    )
      return sessionId;
  }
  return null;
}
export function useAgentModeAwareSend(sendRaw, agentMode = "auto") {
  const agentModeRef = reactExports.useRef(agentMode);
  agentModeRef.current = agentMode;
  return reactExports.useCallback(
    (message2) => {
      if (
        message2.type === "create_session" ||
        message2.type === "switch_session"
      ) {
        return sendRaw({
          ...message2,
          mode: message2.mode ?? agentModeRef.current,
        });
      }
      return sendRaw(message2);
    },
    [sendRaw],
  );
}
export function useModelDefaults({
  defaultModelId,
  defaultSelectedMediaModels,
  onRememberDefaults,
}) {
  const { t: t2 } = useTranslation();
  const pendingRef = reactExports.useRef(null);
  const persistedRef = reactExports.useRef({});
  persistedRef.current = {
    modelId: defaultModelId,
    media: defaultSelectedMediaModels,
  };
  const [, setRevision] = reactExports.useState(0);
  const getDefaults2 = reactExports.useCallback(
    () => pendingRef.current ?? persistedRef.current,
    [],
  );
  const rememberDefaults = reactExports.useCallback(
    async (selection2) => {
      const request = {
        ...getDefaults2(),
        ...selection2,
      };
      pendingRef.current = request;
      setRevision((revision) => revision + 1);
      if (!onRememberDefaults) return;
      let saved = false;
      try {
        saved = await onRememberDefaults(selection2);
      } catch {
      } finally {
        if (pendingRef.current === request) {
          pendingRef.current = null;
          setRevision((revision) => revision + 1);
        }
        if (!saved)
          dedupedToast.error(t2("chat.mediaModels.defaultSaveFailed"));
      }
    },
    [getDefaults2, onRememberDefaults, t2],
  );
  const getDefaultModelId = reactExports.useCallback(
    () => getDefaults2().modelId,
    [getDefaults2],
  );
  const getDefaultSelectedMediaModels = reactExports.useCallback(
    () => getDefaults2().media,
    [getDefaults2],
  );
  return {
    defaultModelId: getDefaults2().modelId,
    defaultSelectedMediaModels: getDefaults2().media,
    rememberDefaults,
    getDefaultModelId,
    getDefaultSelectedMediaModels,
  };
}
