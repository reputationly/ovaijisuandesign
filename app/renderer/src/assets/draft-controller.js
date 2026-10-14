// draft-controller.js
import { API_PATHS } from "../infra/workspace-gateway.js";
import { editorDocSnapshot } from "../text-editor/editor-doc-snapshot.js";
import {
  clearDraft,
  cloneSelectedMediaModels,
  DRAFT_TTL_MS,
  readEnvelope,
  removeKey,
  SCHEMA_VERSION,
  storageKey,
  stripForPersist,
} from "./read-envelope.js";
import { gatewayUrl } from "../infra/gateway-http-error.jsx";

function isRecoverableAttachment(attachment) {
  return (
    attachment.status === "done" &&
    typeof attachment.relativePath === "string" &&
    attachment.relativePath.length > 0
  );
}

function hydrateAttachment(attachment, resolveUrl) {
  if (!attachment.relativePath) {
    return attachment;
  }
  const url = resolveUrl(API_PATHS.serveFile(attachment.relativePath));
  return {
    ...attachment,
    previewUrl: url ?? "",
  };
}

function saveDraft(workspace, sessionKey, draft, now = Date.now()) {
  const key = storageKey(workspace, sessionKey);
  const text = draft.text;
  const recoverable = draft.attachments.filter(isRecoverableAttachment);
  const dropped = draft.attachments.length - recoverable.length;
  if (!text && recoverable.length === 0) {
    return removeKey(key);
  }
  const envelope = {
    v: SCHEMA_VERSION,
    text,
    ...editorDocSnapshot(draft.editorDoc),
    attachments: recoverable.map(stripForPersist),
    savedAt: now,
    dropped,
    ...(draft.selectedMediaModels
      ? {
          selectedMediaModels: cloneSelectedMediaModels(
            draft.selectedMediaModels,
          ),
        }
      : {}),
    ...(draft.homeFillSource
      ? {
          homeFillSource: draft.homeFillSource,
        }
      : {}),
  };
  try {
    localStorage.setItem(key, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

function loadDraft(
  workspace,
  sessionKey,
  now = Date.now(),
  resolveUrl = gatewayUrl,
) {
  const key = storageKey(workspace, sessionKey);
  const envelope = readEnvelope(key);
  if (!envelope) {
    return null;
  }
  if (now - envelope.savedAt > DRAFT_TTL_MS) {
    removeKey(key);
    return null;
  }
  return {
    draft: {
      text: envelope.text,
      ...editorDocSnapshot(envelope.editorDoc),
      attachments: envelope.attachments.map((attachment) =>
        hydrateAttachment(attachment, resolveUrl),
      ),
      ...(envelope.selectedMediaModels
        ? {
            selectedMediaModels: cloneSelectedMediaModels(
              envelope.selectedMediaModels,
            ),
          }
        : {}),
      ...(envelope.homeFillSource
        ? {
            homeFillSource: envelope.homeFillSource,
          }
        : {}),
    },
    droppedCount: envelope.dropped,
  };
}

const DRAFT_PERSIST_DEBOUNCE_MS = 400;

function cloneDraft(draft) {
  return {
    text: draft.text,
    ...editorDocSnapshot(draft.editorDoc),
    attachments: draft.attachments.map((attachment) => ({
      ...attachment,
    })),
    ...(draft.selectedMediaModels
      ? {
          selectedMediaModels: cloneSelectedMediaModels(
            draft.selectedMediaModels,
          ),
        }
      : {}),
    ...(draft.homeFillSource
      ? {
          homeFillSource: draft.homeFillSource,
        }
      : {}),
  };
}

function isEmptyDraft(draft) {
  return !draft.text && draft.attachments.length === 0;
}

function isDurableEmpty(draft) {
  return !draft.text && !draft.attachments.some(isRecoverableAttachment);
}

export class DraftController {
  constructor(
    workspace,
    resolveUrl = gatewayUrl,
    debounceMs = DRAFT_PERSIST_DEBOUNCE_MS,
  ) {
    this.workspace = workspace;
    this.resolveUrl = resolveUrl;
    this.debounceMs = debounceMs;
  }
  memory = new Map();
  timer = null;
  /** Key awaiting a debounced delete (only deletes are deferred; saves are immediate). */
  pendingDelete = null;
  /**
   * Set by `dispose()`. Once disposed the controller is inert: `set`/`setNow`
   * become no-ops. This is the teardown guard — a spurious `onUpdate('')` that
   * fires AFTER unmount (effect-cleanup ordering can deliver it after dispose)
   * must not arm a delete timer that later wipes the stored draft. Reset by
   * `revive()` on the next effect setup (also covers React StrictMode's
   * mount→unmount→mount double-invoke).
   */
  disposed = false;
  /** Re-arm a disposed controller (effect setup / StrictMode remount). */
  revive() {
    this.disposed = false;
  }
  /** Update the workspace scope, committing any pending delete first. */
  setWorkspace(workspace) {
    if (workspace === this.workspace) return;
    this.flush();
    this.workspace = workspace;
  }
  /** Hot-path read: memory only (never touches durable). */
  get(key) {
    const draft = this.memory.get(key);
    return draft
      ? cloneDraft(draft)
      : {
          text: "",
          attachments: [],
        };
  }
  /**
   * Write-through to memory + durable. Non-empty content persists immediately
   * (reload-safe); an empty draft schedules a debounced delete that `dispose()`
   * can drop if it turns out to be a spurious teardown emit. No-op once disposed.
   */
  set(key, draft) {
    if (this.disposed) return;
    this.writeMemory(key, draft);
    if (isDurableEmpty(draft)) {
      this.scheduleDelete(key);
    } else {
      this.cancelPendingDelete(key);
      saveDraft(this.workspace, key, draft);
    }
  }
  /**
   * Like `set`, but resolves immediately (explicit orchestration: send / switch
   * / optimistic rollback). Non-empty saves; empty deletes — no debounce.
   * No-op once disposed.
   */
  setNow(key, draft, options) {
    if (this.disposed) return false;
    this.cancelPendingDelete(key);
    const persisted = saveDraft(this.workspace, key, draft);
    if (!persisted && options?.requireDurable) return false;
    this.writeMemory(key, draft);
    return persisted;
  }
  /**
   * Resolve the draft to surface for `key`: memory if present, else hydrated
   * from durable (which is then cached back into memory). Returns `null` when
   * neither layer has content. `droppedCount` is the number of attachments that
   * existed at save time but were not recoverable (0 when served from memory).
   */
  restore(key) {
    const mem = this.memory.get(key);
    if (mem && !isEmptyDraft(mem)) {
      return {
        draft: cloneDraft(mem),
        droppedCount: 0,
      };
    }
    const loaded = loadDraft(this.workspace, key, Date.now(), this.resolveUrl);
    if (!loaded) return null;
    const draft = {
      text: loaded.draft.text,
      ...editorDocSnapshot(loaded.draft.editorDoc),
      attachments: loaded.draft.attachments,
      ...(loaded.draft.selectedMediaModels
        ? {
            selectedMediaModels: loaded.draft.selectedMediaModels,
          }
        : {}),
      ...(loaded.draft.homeFillSource
        ? {
            homeFillSource: loaded.draft.homeFillSource,
          }
        : {}),
    };
    this.memory.set(key, cloneDraft(draft));
    return {
      draft,
      droppedCount: loaded.droppedCount,
    };
  }
  /** Explicit delete (successful send / explicit clear). */
  clear(key) {
    this.cancelPendingDelete(key);
    this.memory.delete(key);
    clearDraft(this.workspace, key);
  }
  /** Commit a pending delete now (genuine clear that didn't get to fire). */
  flush() {
    this.runPendingDelete(true);
  }
  /**
   * Drop any pending delete on unmount rather than committing it — an empty
   * still pending at teardown is the spurious `onUpdate('')` case, not a genuine
   * clear (which would have fired via the debounce while still mounted).
   */
  dispose() {
    this.disposed = true;
    this.runPendingDelete(false);
  }
  writeMemory(key, draft) {
    if (isEmptyDraft(draft)) {
      this.memory.delete(key);
    } else {
      this.memory.set(key, cloneDraft(draft));
    }
  }
  scheduleDelete(key) {
    this.pendingDelete = key;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.runPendingDelete(true), this.debounceMs);
  }
  runPendingDelete(commit) {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const key = this.pendingDelete;
    this.pendingDelete = null;
    if (key !== null && commit) {
      clearDraft(this.workspace, key);
    }
  }
  cancelPendingDelete(key) {
    if (this.pendingDelete === key) {
      this.pendingDelete = null;
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    }
  }
}
