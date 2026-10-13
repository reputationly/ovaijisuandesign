// create-visible-preview-tabs-store.js
import { getElectronPlatform } from "../infra/use-canvas-node-assets-store.js";
import { resolveVisiblePreviewEntries } from "./use-deep-link-router.js";
const VISIBLE_PREVIEW_TABS_STORAGE_KEY = "hilo.topbar.visible-preview-tabs.v1";
const VISIBLE_PREVIEW_TABS_VERSION = 1;
function nonEmptyOpaqueText(value) {
  if (typeof value !== "string") return void 0;
  return value.trim().length > 0 ? value : void 0;
}
function normalizeReference(value) {
  if (typeof value === "string") {
    const workspaceId = nonEmptyOpaqueText(value);
    return workspaceId
      ? {
          workspaceId,
        }
      : null;
  }
  if (!value || typeof value !== "object") return null;
  const candidate = value;
  const workspaceId = nonEmptyOpaqueText(candidate.workspaceId);
  if (!workspaceId) return null;
  const folderPath = nonEmptyOpaqueText(candidate.folderPath);
  return folderPath
    ? {
        workspaceId,
        folderPath,
      }
    : {
        workspaceId,
      };
}
function dedupeReferences(values) {
  const seenWorkspaceIds = new Set();
  const seenFolderPaths = new Set();
  const result = [];
  for (const value of values) {
    const reference = normalizeReference(value);
    if (!reference || seenWorkspaceIds.has(reference.workspaceId)) continue;
    if (reference.folderPath && seenFolderPaths.has(reference.folderPath))
      continue;
    seenWorkspaceIds.add(reference.workspaceId);
    if (reference.folderPath) seenFolderPaths.add(reference.folderPath);
    result.push(reference);
  }
  return result;
}
function referencesEqual(left, right) {
  return (
    left.length === right.length &&
    left.every(
      (reference, index) =>
        reference.workspaceId === right[index]?.workspaceId &&
        reference.folderPath === right[index]?.folderPath,
    )
  );
}
function readSnapshot(storage) {
  if (!storage)
    return {
      initialized: false,
      tabs: [],
    };
  try {
    const raw = storage.getItem(VISIBLE_PREVIEW_TABS_STORAGE_KEY);
    if (raw === null)
      return {
        initialized: false,
        tabs: [],
      };
    const parsed = JSON.parse(raw);
    const values = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === "object" &&
          parsed.version === VISIBLE_PREVIEW_TABS_VERSION &&
          Array.isArray(parsed.tabs)
        ? parsed.tabs
        : null;
    if (!values)
      return {
        initialized: false,
        tabs: [],
      };
    return {
      initialized: true,
      tabs: dedupeReferences(values),
    };
  } catch {
    return {
      initialized: false,
      tabs: [],
    };
  }
}
function browserStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
let durablePreviewWriteQueue = Promise.resolve();
function mainReadablePreviewTabsMirror() {
  return {
    set: (value) => {
      const storage = getElectronPlatform()?.storage;
      if (!storage) return;
      durablePreviewWriteQueue = durablePreviewWriteQueue
        .catch(() => void 0)
        .then(() => storage.globalSet("visiblePreviewTabs", value))
        .catch(() => void 0);
    },
  };
}
function entryReference(entry) {
  return {
    workspaceId: entry.workspaceId,
    folderPath: entry.folderPath,
  };
}
function createVisiblePreviewTabsStore(
  storage = browserStorage(),
  durableMirror = mainReadablePreviewTabsMirror(),
) {
  let snapshot = readSnapshot(storage);
  let liveEntries = [];
  const listeners = new Set();
  const hiddenBeforeInitialization = new Set();
  const persist = (value) => {
    if (storage && value.initialized) {
      const localValue = {
        version: VISIBLE_PREVIEW_TABS_VERSION,
        tabs: [...value.tabs],
      };
      try {
        storage.setItem(
          VISIBLE_PREVIEW_TABS_STORAGE_KEY,
          JSON.stringify(localValue),
        );
      } catch {}
    }
    durableMirror.set({
      version: VISIBLE_PREVIEW_TABS_VERSION,
      initialized: value.initialized,
      tabs: [...value.tabs],
    });
  };
  const publish = (tabs, initialized = true) => {
    const normalized = dedupeReferences(tabs);
    if (
      snapshot.initialized === initialized &&
      referencesEqual(snapshot.tabs, normalized)
    ) {
      persist(snapshot);
      return;
    }
    snapshot = {
      initialized,
      tabs: normalized,
    };
    persist(snapshot);
    for (const listener of listeners) listener();
  };
  return {
    getSnapshot: () => snapshot,
    getVisibleWorkspaceIds: () =>
      snapshot.initialized
        ? resolveVisiblePreviewEntries(liveEntries, snapshot.tabs).map(
            (entry) => entry.workspaceId,
          )
        : snapshot.tabs.map((tab) => tab.workspaceId),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize: (entries) => {
      liveEntries = entries;
      if (!snapshot.initialized) {
        const seeded = entries
          .filter((entry) => !hiddenBeforeInitialization.has(entry.workspaceId))
          .map(entryReference);
        publish([...seeded, ...snapshot.tabs], true);
        hiddenBeforeInitialization.clear();
        return;
      }
      const byWorkspaceId = new Map(
        entries.map((entry) => [entry.workspaceId, entry]),
      );
      const byFolderPath = new Map(
        entries.map((entry) => [entry.folderPath, entry]),
      );
      const reconciled = snapshot.tabs.map((reference) => {
        const entry =
          byWorkspaceId.get(reference.workspaceId) ??
          (reference.folderPath
            ? byFolderPath.get(reference.folderPath)
            : void 0);
        return entry ? entryReference(entry) : reference;
      });
      publish(reconciled, true);
    },
    show: (entry) => {
      const reference = normalizeReference(entry);
      if (!reference) return;
      hiddenBeforeInitialization.delete(reference.workspaceId);
      const existingIndex = snapshot.tabs.findIndex(
        (tab) =>
          tab.workspaceId === reference.workspaceId ||
          Boolean(
            tab.folderPath &&
            reference.folderPath &&
            tab.folderPath === reference.folderPath,
          ),
      );
      if (existingIndex === -1) {
        publish([...snapshot.tabs, reference], snapshot.initialized);
        return;
      }
      const existing = snapshot.tabs[existingIndex];
      const updatedReference = {
        workspaceId: reference.workspaceId,
        folderPath: reference.folderPath ?? existing.folderPath,
      };
      if (
        existing.workspaceId === updatedReference.workspaceId &&
        existing.folderPath === updatedReference.folderPath
      ) {
        return;
      }
      const updated = [...snapshot.tabs];
      updated[existingIndex] = updatedReference;
      publish(updated, snapshot.initialized);
    },
    replace: (workspaceId, entry) => {
      const canonical = normalizeReference(entry);
      const previousId = nonEmptyOpaqueText(workspaceId);
      if (!canonical || !previousId) return;
      hiddenBeforeInitialization.delete(canonical.workspaceId);
      let replaced = false;
      const updated = snapshot.tabs.map((tab) => {
        if (tab.workspaceId !== previousId) return tab;
        replaced = true;
        return canonical;
      });
      publish(
        replaced ? updated : [...updated, canonical],
        snapshot.initialized,
      );
    },
    hide: (workspaceIds) => {
      const ids = new Set(
        (typeof workspaceIds === "string" ? [workspaceIds] : workspaceIds)
          .map(nonEmptyOpaqueText)
          .filter((id) => Boolean(id)),
      );
      if (ids.size === 0) return;
      if (!snapshot.initialized) {
        for (const id of ids) hiddenBeforeInitialization.add(id);
      }
      publish(
        snapshot.tabs.filter((tab) => !ids.has(tab.workspaceId)),
        snapshot.initialized,
      );
    },
    reorder: (activeWorkspaceId, overWorkspaceId) => {
      const fromIndex = snapshot.tabs.findIndex(
        (tab) => tab.workspaceId === activeWorkspaceId,
      );
      const toIndex = snapshot.tabs.findIndex(
        (tab) => tab.workspaceId === overWorkspaceId,
      );
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
      const reordered = [...snapshot.tabs];
      const [moved] = reordered.splice(fromIndex, 1);
      if (!moved) return;
      reordered.splice(toIndex, 0, moved);
      publish(reordered, snapshot.initialized);
    },
  };
}
export const visiblePreviewTabsStore = createVisiblePreviewTabsStore();
