// create-visible-preview-tabs-store.js
import { getElectronPlatform } from "../infra/use-canvas-node-assets-store.js";
import { resolveVisiblePreviewEntries } from "./use-deep-link-router.js";

const VISIBLE_PREVIEW_TABS_STORAGE_KEY = "hilo.topbar.visible-preview-tabs.v1";

const VISIBLE_PREVIEW_TABS_VERSION = 1;

function nonEmptyOpaqueText(value) {
  if (typeof value !== "string") return void 0;
  return value.trim().length > 0 ? value : void 0;
}

function normalizeReference$1(value) {
  if (typeof value === "string") {
    const workspaceId22 = nonEmptyOpaqueText(value);
    return workspaceId22
      ? {
          workspaceId: workspaceId22,
        }
      : null;
  }
  if (!value || typeof value !== "object") return null;
  const candidate = value;
  const workspaceId2 = nonEmptyOpaqueText(candidate.workspaceId);
  if (!workspaceId2) return null;
  const folderPath = nonEmptyOpaqueText(candidate.folderPath);
  return folderPath
    ? {
        workspaceId: workspaceId2,
        folderPath,
      }
    : {
        workspaceId: workspaceId2,
      };
}

function dedupeReferences(values3) {
  const seenWorkspaceIds = new Set();
  const seenFolderPaths = new Set();
  const result = [];
  for (const value of values3) {
    const reference = normalizeReference$1(value);
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
      (reference, index2) =>
        reference.workspaceId === right[index2]?.workspaceId &&
        reference.folderPath === right[index2]?.folderPath,
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
    const raw2 = storage.getItem(VISIBLE_PREVIEW_TABS_STORAGE_KEY);
    if (raw2 === null)
      return {
        initialized: false,
        tabs: [],
      };
    const parsed = JSON.parse(raw2);
    const values3 = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === "object" &&
          parsed.version === VISIBLE_PREVIEW_TABS_VERSION &&
          Array.isArray(parsed.tabs)
        ? parsed.tabs
        : null;
    if (!values3)
      return {
        initialized: false,
        tabs: [],
      };
    return {
      initialized: true,
      tabs: dedupeReferences(values3),
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
  let snapshot2 = readSnapshot(storage);
  let liveEntries = [];
  const listeners2 = new Set();
  const hiddenBeforeInitialization = new Set();
  const persist2 = (value) => {
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
  const publish = (tabs, initialized2 = true) => {
    const normalized = dedupeReferences(tabs);
    if (
      snapshot2.initialized === initialized2 &&
      referencesEqual(snapshot2.tabs, normalized)
    ) {
      persist2(snapshot2);
      return;
    }
    snapshot2 = {
      initialized: initialized2,
      tabs: normalized,
    };
    persist2(snapshot2);
    for (const listener of listeners2) listener();
  };
  return {
    getSnapshot: () => snapshot2,
    getVisibleWorkspaceIds: () =>
      snapshot2.initialized
        ? resolveVisiblePreviewEntries(liveEntries, snapshot2.tabs).map(
            (entry) => entry.workspaceId,
          )
        : snapshot2.tabs.map((tab2) => tab2.workspaceId),
    subscribe: (listener) => {
      listeners2.add(listener);
      return () => listeners2.delete(listener);
    },
    initialize: (entries2) => {
      liveEntries = entries2;
      if (!snapshot2.initialized) {
        const seeded = entries2
          .filter((entry) => !hiddenBeforeInitialization.has(entry.workspaceId))
          .map(entryReference);
        publish([...seeded, ...snapshot2.tabs], true);
        hiddenBeforeInitialization.clear();
        return;
      }
      const byWorkspaceId = new Map(
        entries2.map((entry) => [entry.workspaceId, entry]),
      );
      const byFolderPath = new Map(
        entries2.map((entry) => [entry.folderPath, entry]),
      );
      const reconciled = snapshot2.tabs.map((reference) => {
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
      const reference = normalizeReference$1(entry);
      if (!reference) return;
      hiddenBeforeInitialization.delete(reference.workspaceId);
      const existingIndex = snapshot2.tabs.findIndex(
        (tab2) =>
          tab2.workspaceId === reference.workspaceId ||
          Boolean(
            tab2.folderPath &&
            reference.folderPath &&
            tab2.folderPath === reference.folderPath,
          ),
      );
      if (existingIndex === -1) {
        publish([...snapshot2.tabs, reference], snapshot2.initialized);
        return;
      }
      const existing = snapshot2.tabs[existingIndex];
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
      const updated = [...snapshot2.tabs];
      updated[existingIndex] = updatedReference;
      publish(updated, snapshot2.initialized);
    },
    replace: (workspaceId2, entry) => {
      const canonical = normalizeReference$1(entry);
      const previousId = nonEmptyOpaqueText(workspaceId2);
      if (!canonical || !previousId) return;
      hiddenBeforeInitialization.delete(canonical.workspaceId);
      let replaced = false;
      const updated = snapshot2.tabs.map((tab2) => {
        if (tab2.workspaceId !== previousId) return tab2;
        replaced = true;
        return canonical;
      });
      publish(
        replaced ? updated : [...updated, canonical],
        snapshot2.initialized,
      );
    },
    hide: (workspaceIds) => {
      const ids2 = new Set(
        (typeof workspaceIds === "string" ? [workspaceIds] : workspaceIds)
          .map(nonEmptyOpaqueText)
          .filter((id2) => Boolean(id2)),
      );
      if (ids2.size === 0) return;
      if (!snapshot2.initialized) {
        for (const id2 of ids2) hiddenBeforeInitialization.add(id2);
      }
      publish(
        snapshot2.tabs.filter((tab2) => !ids2.has(tab2.workspaceId)),
        snapshot2.initialized,
      );
    },
    reorder: (activeWorkspaceId, overWorkspaceId) => {
      const fromIndex = snapshot2.tabs.findIndex(
        (tab2) => tab2.workspaceId === activeWorkspaceId,
      );
      const toIndex = snapshot2.tabs.findIndex(
        (tab2) => tab2.workspaceId === overWorkspaceId,
      );
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
      const reordered = [...snapshot2.tabs];
      const [moved] = reordered.splice(fromIndex, 1);
      if (!moved) return;
      reordered.splice(toIndex, 0, moved);
      publish(reordered, snapshot2.initialized);
    },
  };
}

export const visiblePreviewTabsStore = createVisiblePreviewTabsStore();
