// read-envelope.js
import { editorDocSnapshot } from "../text-editor/editor-doc-snapshot.js";

export const KEY_PREFIX = "hilo.chat.draft";

export const SCHEMA_VERSION = 1;

export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1e3;

export const HOME_DRAFT_WORKSPACE = "__home__";

export const HOME_DRAFT_SESSION_KEY = "__compose__";

// 附件的提交所有权（commitOperationId / commitSourcePath）是进程内的运行时状态，台账清理由
// upload-commit-finalize outbox 负责；存进草稿会在重启后变成没人释放的所有权，挡住后续替换附件。
export function stripForPersist(attachment) {
  const { commitOperationId: _operationId, commitSourcePath: _sourcePath, ...rest } = attachment;
  return {
    ...rest,
    previewUrl: "",
  };
}

export function cloneSelectedMediaModels(models) {
  if (!models) return void 0;
  return {
    ...(models.image
      ? {
          image: [...models.image],
        }
      : {}),
    ...(models.video
      ? {
          video: [...models.video],
        }
      : {}),
    ...(models.audio
      ? {
          audio: [...models.audio],
        }
      : {}),
  };
}

export function storageKey(workspace, sessionKey) {
  return `${KEY_PREFIX}:${workspace}:${sessionKey}`;
}

export function readEnvelope(key2) {
  let raw2;
  try {
    raw2 = localStorage.getItem(key2);
  } catch {
    return null;
  }
  if (!raw2) return null;
  try {
    const parsed = JSON.parse(raw2);
    if (
      !parsed ||
      parsed.v !== SCHEMA_VERSION ||
      typeof parsed.text !== "string" ||
      typeof parsed.savedAt !== "number"
    ) {
      return null;
    }
    return {
      v: SCHEMA_VERSION,
      text: parsed.text,
      ...editorDocSnapshot(parsed.editorDoc),
      attachments: (Array.isArray(parsed.attachments) ? parsed.attachments : []).map(stripForPersist),
      savedAt: parsed.savedAt,
      dropped: typeof parsed.dropped === "number" ? parsed.dropped : 0,
      ...(parsed.selectedMediaModels &&
      typeof parsed.selectedMediaModels === "object"
        ? {
            selectedMediaModels: cloneSelectedMediaModels(
              parsed.selectedMediaModels,
            ),
          }
        : {}),
      ...(parsed.homeFillSource === "home_scene_query"
        ? {
            homeFillSource: parsed.homeFillSource,
          }
        : {}),
    };
  } catch {
    return null;
  }
}

export function removeKey(key2) {
  try {
    localStorage.removeItem(key2);
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(workspace, sessionKey) {
  removeKey(storageKey(workspace, sessionKey));
}

export const PENDING_HOME_HANDOFF_KEY = "hilo.home.pending-handoff";

/**
 * 4.0.3：待处理交接可以**按会话**分开存。
 * 首页草稿会话沿用原 key（兼容已经存下的旧值），其它会话加后缀。
 * 这样「从 A 会话发起、切到 B 会话」时不会互相覆盖。
 */
export function pendingHandoffKey(sessionKey) {
  return sessionKey === HOME_DRAFT_SESSION_KEY
    ? PENDING_HOME_HANDOFF_KEY
    : `${PENDING_HOME_HANDOFF_KEY}:${sessionKey}`;
}

export function canApplyHomeComposerMutation(
  mounted,
  pendingHandoffOperationId,
) {
  return mounted && pendingHandoffOperationId === null;
}

export function markHomeDraftPendingHandoff(operationId, sessionKey = HOME_DRAFT_SESSION_KEY) {
  try {
    localStorage.setItem(
      pendingHandoffKey(sessionKey),
      JSON.stringify({
        operationId,
        sessionKey,
      }),
    );
  } catch {}
}

export function invalidatePendingHomeHandoff(sessionKey = HOME_DRAFT_SESSION_KEY) {
  try {
    localStorage.removeItem(pendingHandoffKey(sessionKey));
  } catch {}
}
