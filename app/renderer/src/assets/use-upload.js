// use-upload.js
import {
  classifyUploadError,
  createHeicPreviewObjectUrl,
  createHeicPreviewObjectUrlFromUrl,
  fileMatchesAccept,
  isFileAttachment,
  isHeicFilename,
  uploadCommitTimeoutMs,
  UploadCommitUnsupportedFilesystemError,
  uploadErrorMessage,
} from "./classify-upload-error.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { UPLOAD_COMMIT_SAFE_PUBLISH_UNSUPPORTED } from "../generation/to-workspace-browser-url.js";
import { API_PATHS, reactExports, useCurrentWorkspace, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import {
  enqueueUploadFinalizeOperations,
  readUploadFinalizeOutbox,
  removeUploadFinalizeOperation,
} from "./read-upload-finalize-outbox.js";
import { GatewayHttpError } from "../infra/gateway-http-error.jsx";
import { detectFileType } from "../canvas/diagnostic-history-tools.js";
import { MAX_ATTACHMENTS } from "../generation/use-mention-models.jsx";
import {
  useGatewayFetch,
  useGatewayUrl,
} from "../generation/use-model-catalog-scope-key.js";

function createHeicPreviewObjectUrlFromFile(file) {
  return file
    .arrayBuffer()
    .then((data2) => createHeicPreviewObjectUrl(file.name, data2));
}

function arePendingAttachmentsEqual(left, right) {
  if (left === right) return true;
  const keys2 = Object.keys(left);
  return (
    keys2.length === Object.keys(right).length &&
    keys2.every((key2) => left[key2] === right[key2])
  );
}

let nextId = 0;

function genId() {
  return `att-${++nextId}-${Date.now()}`;
}

function attachmentDedupKey(file) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function isPreviewableFileType(fileType) {
  return fileType === "image" || fileType === "video" || fileType === "audio";
}

class UploadRequestError extends Error {
  constructor(message2, status, code2) {
    super(message2);
    this.status = status;
    this.code = code2;
    this.name = "UploadRequestError";
  }
}

function uploadCommitErrorCode(value) {
  if (!value || typeof value !== "object") return void 0;
  const code2 = value.error_code;
  return typeof code2 === "string" ? code2 : void 0;
}

function reportUnsupportedUploadCommitFilesystem(fileCount) {
  try {
    trackEvent(TRACK_EVENTS.UPLOAD_FILE_FAILED, {
      error_type: "commit",
      error_code: UPLOAD_COMMIT_SAFE_PUBLISH_UNSUPPORTED,
      file_count: fileCount,
    });
  } catch {}
}

function stagedUploadResponse(value) {
  if (!value || typeof value !== "object") return null;
  const record2 = value;
  if (typeof record2.relative !== "string" || record2.relative.length === 0)
    return null;
  if (record2.staged !== true) return null;
  return {
    relative: record2.relative,
    staged: true,
  };
}

function uploadCommitResponse(value, expectedPaths) {
  if (!value || typeof value !== "object") return null;
  const committed = value.committed;
  if (!Array.isArray(committed) || committed.length !== expectedPaths.length)
    return null;
  const mappings = committed.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record2 = entry;
    return typeof record2.from === "string" &&
      record2.from.length > 0 &&
      typeof record2.to === "string" &&
      record2.to.length > 0
      ? [
          {
            from: record2.from,
            to: record2.to,
          },
        ]
      : [];
  });
  if (mappings.length !== expectedPaths.length) return null;
  const expected = new Set(expectedPaths);
  const actual = new Set(mappings.map(({ from: from2 }) => from2));
  if (
    actual.size !== expected.size ||
    [...expected].some((path2) => !actual.has(path2))
  )
    return null;
  const committedPaths = new Set(mappings.map(({ to }) => to));
  const rawRefs = value.attachment_refs;
  const attachmentRefs = [];
  if (Array.isArray(rawRefs)) {
    const seen2 = new Set();
    for (const entry of rawRefs) {
      if (!entry || typeof entry !== "object") continue;
      const record2 = entry;
      if (
        typeof record2.path !== "string" ||
        !committedPaths.has(record2.path) ||
        record2.attachment_source !== "asset_vault" ||
        typeof record2.attachment_id !== "string" ||
        record2.attachment_id.length === 0
      ) {
        continue;
      }
      const key2 = `${record2.path}:${record2.attachment_id}`;
      if (seen2.has(key2)) continue;
      seen2.add(key2);
      attachmentRefs.push({
        path: record2.path,
        attachment_source: "asset_vault",
        attachment_id: record2.attachment_id,
      });
    }
  }
  return {
    committed: mappings,
    ...(attachmentRefs.length > 0
      ? {
          attachment_refs: attachmentRefs,
        }
      : {}),
  };
}

async function stableUploadCommitOperationId(paths) {
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify(paths)),
    ),
  ).slice(0, 16);
  digest[6] = ((digest[6] ?? 0) & 15) | 80;
  digest[8] = ((digest[8] ?? 0) & 63) | 128;
  const hex2 = [...digest]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${hex2.slice(0, 8)}-${hex2.slice(8, 12)}-${hex2.slice(12, 16)}-${hex2.slice(16, 20)}-${hex2.slice(20)}`;
}

const UPLOAD_OWNERSHIP_REQUEST_TIMEOUT_MS = 5e3;

export function useUpload(options) {
  const { t: t2 } = useTranslation();
  const maxAttachments = options?.maxAttachments ?? MAX_ATTACHMENTS;
  const attachmentAccept = options?.attachmentAccept;
  const replacementAccept = options?.replacementAccept;
  const gatewayFetch2 = useGatewayFetch();
  const gatewayScopeKey = useCurrentWorkspace() || "app";
  const gatewayUrl2 = useGatewayUrl();
  const [attachments, setAttachments] = reactExports.useState([]);
  const [replacingIds, setReplacingIds] = reactExports.useState(new Set());
  const replacementLocksRef = reactExports.useRef(new Set());
  const replacementScopeRef = reactExports.useRef({
    gatewayScopeKey,
    replacementAccept,
  });
  replacementScopeRef.current = {
    gatewayScopeKey,
    replacementAccept,
  };
  const mountedRef = reactExports.useRef(true);
  reactExports.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const attachmentsRef = reactExports.useRef(attachments);
  const attachmentRevisionRef = reactExports.useRef(0);
  const attachmentVersionsRef = reactExports.useRef(new Map());
  const preparedSourceAttachmentsRef = reactExports.useRef(new Map());
  const objectUrlsRef = reactExports.useRef(new Set());
  const pendingToastsRef = reactExports.useRef({
    duplicate: false,
    limit: false,
    unsupported: false,
    scheduled: false,
  });
  const handleBlockedOwnershipReplacementRef = reactExports.useRef(
    () => void 0,
  );
  const onAttachmentsChangeRef = reactExports.useRef(
    options?.onAttachmentsChange,
  );
  onAttachmentsChangeRef.current = options?.onAttachmentsChange;
  const guardCommittedOwnership = reactExports.useCallback(
    (next2, options2) => {
      const nextById = new Map(
        next2.map((attachment) => [attachment.id, attachment]),
      );
      const blocked = attachmentsRef.current.filter((attachment) => {
        const operationId = attachment.commitOperationId;
        if (!operationId || options2?.releaseOperationIds?.has(operationId))
          return false;
        const replacement = nextById.get(attachment.id);
        return (
          replacement?.commitOperationId !== operationId ||
          replacement.commitSourcePath !== attachment.commitSourcePath ||
          replacement.relativePath !== attachment.relativePath
        );
      });
      if (blocked.length === 0) return true;
      handleBlockedOwnershipReplacementRef.current(blocked);
      return false;
    },
    [],
  );
  const syncAttachments = reactExports.useCallback(
    (next2, options2) => {
      if (!guardCommittedOwnership(next2, options2)) return false;
      attachmentRevisionRef.current += 1;
      const previousById = new Map(
        attachmentsRef.current.map((item) => [item.id, item]),
      );
      attachmentVersionsRef.current = new Map(
        next2.map((item) => {
          const previous2 = previousById.get(item.id);
          const version2 =
            previous2 && arePendingAttachmentsEqual(previous2, item)
              ? (attachmentVersionsRef.current.get(item.id) ??
                attachmentRevisionRef.current)
              : attachmentRevisionRef.current;
          return [item.id, version2];
        }),
      );
      attachmentsRef.current = next2;
      setAttachments(next2);
      if (options2?.notifyParent !== false)
        onAttachmentsChangeRef.current?.(next2);
      return true;
    },
    [guardCommittedOwnership],
  );
  const updateAttachments = reactExports.useCallback(
    (updater, options2) => {
      const next2 = updater(attachmentsRef.current);
      return syncAttachments(next2, options2);
    },
    [syncAttachments],
  );
  const replaceAttachments = reactExports.useCallback(
    (next2) =>
      syncAttachments([...next2], {
        notifyParent: false,
      }),
    [syncAttachments],
  );
  reactExports.useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      for (const url2 of urls) {
        URL.revokeObjectURL(url2);
      }
      urls.clear();
    };
  }, []);
  const requestStagedFileDeletion = reactExports.useCallback(
    async (paths) => {
      if (paths.length === 0) return;
      try {
        await gatewayFetch2(API_PATHS.uploadStagingDelete, {
          method: "POST",
          timeoutMs: UPLOAD_OWNERSHIP_REQUEST_TIMEOUT_MS,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paths,
          }),
        });
      } catch {}
    },
    [gatewayFetch2],
  );
  const deleteStagedFiles = reactExports.useCallback(
    (paths) => {
      void requestStagedFileDeletion(paths);
    },
    [requestStagedFileDeletion],
  );
  const requestUploadCommitAbort = reactExports.useCallback(
    async (operationId, paths) => {
      if (paths.length === 0) return "aborted";
      try {
        const response = await gatewayFetch2(API_PATHS.uploadCommitAbort, {
          method: "POST",
          timeoutMs: UPLOAD_OWNERSHIP_REQUEST_TIMEOUT_MS,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            operationId,
            paths: [...paths],
          }),
        });
        if (response.ok === false) {
          if (response.status === 409) return "pending";
          throw new Error(`upload commit abort HTTP ${response.status}`);
        }
        return "aborted";
      } catch (error) {
        const status = error.status;
        if (status !== 409) {
          console.warn("[chat] Upload commit abort remains pending:", error);
        }
        return "pending";
      }
    },
    [gatewayFetch2],
  );
  const requestCommittedFileAbort = reactExports.useCallback(
    async (attachmentsToAbort) => {
      const byOperation = new Map();
      for (const attachment of attachmentsToAbort) {
        if (!attachment.commitOperationId || !attachment.relativePath) continue;
        const paths = byOperation.get(attachment.commitOperationId) ?? [];
        paths.push(attachment.relativePath);
        byOperation.set(attachment.commitOperationId, paths);
      }
      await Promise.all(
        [...byOperation].map(([operationId, paths]) =>
          requestUploadCommitAbort(operationId, paths),
        ),
      );
    },
    [requestUploadCommitAbort],
  );
  handleBlockedOwnershipReplacementRef.current = (blocked) => {
    void requestCommittedFileAbort(blocked);
    dedupedToast.warning(
      t2("chat.uploadCommitPending", {
        defaultValue:
          "Some attachments are pending delivery. Retry sending to release them.",
      }),
    );
  };
  const acknowledgeUploadCommit = reactExports.useCallback(
    async (operationId) => {
      try {
        const response = await gatewayFetch2(API_PATHS.uploadCommitFinalize, {
          method: "POST",
          timeoutMs: UPLOAD_OWNERSHIP_REQUEST_TIMEOUT_MS,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            operationId,
          }),
        });
        if (response.ok !== false) return "acknowledged";
        return response.status === 404 || response.status === 410
          ? "terminal"
          : "retry";
      } catch (error) {
        const status =
          error instanceof GatewayHttpError ? error.status : error.status;
        return status === 404 || status === 410 ? "terminal" : "retry";
      }
    },
    [gatewayFetch2],
  );
  const releaseUploadCommitOwnership = reactExports.useCallback(
    (operationIds) => {
      if (
        !attachmentsRef.current.some(
          (attachment) =>
            attachment.commitOperationId &&
            operationIds.has(attachment.commitOperationId),
        )
      ) {
        return;
      }
      updateAttachments(
        (prev) =>
          prev.map((attachment) => {
            if (
              !attachment.commitOperationId ||
              !operationIds.has(attachment.commitOperationId)
            ) {
              return attachment;
            }
            const {
              commitOperationId: _operation,
              commitSourcePath: _source,
              ...released
            } = attachment;
            return released;
          }),
        {
          releaseOperationIds: operationIds,
        },
      );
    },
    [updateAttachments],
  );
  const flushUploadFinalizeOutbox = reactExports.useCallback(async () => {
    const pending2 = readUploadFinalizeOutbox().filter(
      (record2) => record2.scopeKey === gatewayScopeKey,
    );
    const acknowledged = await Promise.all(
      pending2.map(async ({ operationId }) => {
        const outcome = await acknowledgeUploadCommit(operationId);
        if (outcome !== "retry") {
          removeUploadFinalizeOperation(gatewayScopeKey, operationId);
          return operationId;
        }
        return void 0;
      }),
    );
    releaseUploadCommitOwnership(
      new Set(acknowledged.filter((operationId) => Boolean(operationId))),
    );
  }, [acknowledgeUploadCommit, gatewayScopeKey, releaseUploadCommitOwnership]);
  reactExports.useEffect(() => {
    void flushUploadFinalizeOutbox();
  }, [flushUploadFinalizeOutbox]);
  const finalizeCommit = reactExports.useCallback(
    async (operationIds) => {
      if (!operationIds?.length) return;
      const operationIdSet = new Set(operationIds);
      const persisted = enqueueUploadFinalizeOperations(gatewayScopeKey, [
        ...operationIdSet,
      ]);
      releaseUploadCommitOwnership(operationIdSet);
      if (!persisted) {
        const outcomes = await Promise.all(
          [...operationIdSet].map(acknowledgeUploadCommit),
        );
        if (outcomes.some((outcome) => outcome === "retry")) {
          console.warn(
            "[chat] Upload commit cleanup remains pending in the gateway ledger",
          );
        }
      }
      if (persisted) void flushUploadFinalizeOutbox();
    },
    [
      acknowledgeUploadCommit,
      flushUploadFinalizeOutbox,
      gatewayScopeKey,
      releaseUploadCommitOwnership,
    ],
  );
  reactExports.useEffect(() => {
    const prepared = preparedSourceAttachmentsRef.current;
    return () => {
      const paths = Array.from(prepared.values()).flatMap((batch2) =>
        batch2.staged.flatMap((attachment) => attachment.relativePath ?? []),
      );
      prepared.clear();
      void requestStagedFileDeletion(paths);
    };
  }, [requestStagedFileDeletion]);
  const replaceSourceAttachmentPlaceholders = reactExports.useCallback(
    (source, placeholders) => {
      const prev = attachmentsRef.current;
      const dropping = prev.filter(
        (attachment) => attachment.source === source,
      );
      const remaining = Math.max(
        0,
        maxAttachments - (prev.length - dropping.length),
      );
      const nextPlaceholders = placeholders
        .slice(0, remaining)
        .map((placeholder) => ({
          id: genId(),
          filename: placeholder.filename,
          relativePath: null,
          previewUrl: placeholder.previewUrl ?? "",
          fileType: placeholder.fileType,
          status: "uploading",
          source,
        }));
      if (
        !syncAttachments([
          ...prev.filter((attachment) => attachment.source !== source),
          ...nextPlaceholders,
        ])
      ) {
        return;
      }
      const stagedPaths = dropping
        .filter((attachment) => attachment.staged && attachment.relativePath)
        .map((attachment) => attachment.relativePath);
      for (const attachment of dropping) {
        if (attachment.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(attachment.previewUrl);
          objectUrlsRef.current.delete(attachment.previewUrl);
        }
      }
      if (stagedPaths.length > 0) deleteStagedFiles(stagedPaths);
    },
    [deleteStagedFiles, maxAttachments, syncAttachments],
  );
  const applyConvertedPreviewUrl = reactExports.useCallback(
    (attachmentId, previewUrl) => {
      objectUrlsRef.current.add(previewUrl);
      if (!attachmentsRef.current.some((a2) => a2.id === attachmentId)) {
        URL.revokeObjectURL(previewUrl);
        objectUrlsRef.current.delete(previewUrl);
        return;
      }
      updateAttachments((prev) =>
        prev.map((a2) =>
          a2.id === attachmentId
            ? {
                ...a2,
                previewUrl,
              }
            : a2,
        ),
      );
    },
    [updateAttachments],
  );
  const prepareHeicPreviewFromFile = reactExports.useCallback(
    async (file, attachmentId) => {
      const previewUrl = await createHeicPreviewObjectUrlFromFile(file);
      if (previewUrl) applyConvertedPreviewUrl(attachmentId, previewUrl);
    },
    [applyConvertedPreviewUrl],
  );
  const prepareHeicPreviewFromUrl = reactExports.useCallback(
    async (filename, url2, attachmentId) => {
      const previewUrl = await createHeicPreviewObjectUrlFromUrl(
        filename,
        url2,
        gatewayFetch2,
      );
      if (previewUrl) applyConvertedPreviewUrl(attachmentId, previewUrl);
    },
    [applyConvertedPreviewUrl, gatewayFetch2],
  );
  const uploadFile = reactExports.useCallback(
    async (file, attachmentId) => {
      const form = new FormData();
      form.append("file", file, file.name);
      if (options?.useDefaultDir) {
        form.append("useDefaultDir", "true");
      } else {
        form.append("staging", "true");
      }
      const startedAt = Date.now();
      trackEvent(TRACK_EVENTS.UPLOAD_FILE_START, {
        filename: file.name,
        file_size: file.size,
        file_type: detectFileType(file.name),
      });
      try {
        const resp = await gatewayFetch2(API_PATHS.upload, {
          method: "POST",
          body: form,
        });
        if (resp.ok === false) {
          let message2 = resp.statusText || "Upload failed";
          let errorCode;
          try {
            const body2 = await resp.json();
            const detail =
              typeof body2.message === "string" ? body2.message : body2.error;
            if (typeof detail === "string" && detail.trim()) message2 = detail;
            const code2 =
              typeof body2.error_code === "string"
                ? body2.error_code
                : body2.code;
            errorCode = typeof code2 === "string" ? code2 : void 0;
          } catch {}
          throw new UploadRequestError(message2, resp.status, errorCode);
        }
        const data2 = await resp.json();
        const stillAttached = attachmentsRef.current.some(
          (a2) => a2.id === attachmentId,
        );
        if (!stillAttached) {
          if (data2.staged && data2.relative)
            deleteStagedFiles([data2.relative]);
          return;
        }
        updateAttachments((prev) =>
          prev.map((a2) =>
            a2.id === attachmentId
              ? {
                  ...a2,
                  relativePath: data2.relative,
                  ...(data2.id
                    ? {
                        attachmentId: data2.id,
                      }
                    : {}),
                  status: "done",
                  staged: data2.staged ?? false,
                }
              : a2,
          ),
        );
        if (data2.enrollError) {
          dedupedToast.warning(
            t2("assets.uploadEnrollFailed", {
              error: data2.enrollError,
            }),
          );
        }
        trackEvent(TRACK_EVENTS.UPLOAD_FILE_SUCCESS, {
          filename: file.name,
          file_size: file.size,
          file_type: detectFileType(file.name),
          duration_ms: Date.now() - startedAt,
        });
      } catch (err) {
        const errorMessage2 =
          err instanceof Error ? err.message : "Upload failed";
        const errorKind = classifyUploadError(
          errorMessage2,
          err instanceof UploadRequestError ? err.status : void 0,
          err instanceof UploadRequestError ? err.code : void 0,
        );
        const displayError = uploadErrorMessage(t2, errorKind);
        if (!attachmentsRef.current.some((a2) => a2.id === attachmentId))
          return;
        updateAttachments((prev) =>
          prev.map((a2) =>
            a2.id === attachmentId
              ? {
                  ...a2,
                  status: "error",
                  error: displayError,
                }
              : a2,
          ),
        );
        dedupedToast.error(
          t2("chat.uploadFailed", {
            name: file.name,
            reason: displayError,
          }),
        );
        trackEvent(TRACK_EVENTS.UPLOAD_FILE_FAILED, {
          filename: file.name,
          file_size: file.size,
          file_type: detectFileType(file.name),
          duration_ms: Date.now() - startedAt,
          error_type: err instanceof TypeError ? "network" : "business",
          error_code: errorKind,
          stage: "upload",
        });
      }
    },
    [
      deleteStagedFiles,
      gatewayFetch2,
      options?.useDefaultDir,
      t2,
      updateAttachments,
    ],
  );
  const stageSourceFile = reactExports.useCallback(
    async (file) => {
      const form = new FormData();
      form.append("file", file, file.name);
      form.append("staging", "true");
      const startedAt = Date.now();
      const fileType = detectFileType(file.name);
      trackEvent(TRACK_EVENTS.UPLOAD_FILE_START, {
        filename: file.name,
        file_size: file.size,
        file_type: fileType,
      });
      try {
        const response = await gatewayFetch2(API_PATHS.upload, {
          method: "POST",
          body: form,
        });
        if (response.ok === false) {
          throw new UploadRequestError(
            response.statusText || "Upload failed",
            response.status,
          );
        }
        const parsed = stagedUploadResponse(await response.json());
        if (!parsed)
          throw new UploadRequestError("Invalid staged upload response");
        trackEvent(TRACK_EVENTS.UPLOAD_FILE_SUCCESS, {
          filename: file.name,
          file_size: file.size,
          file_type: fileType,
          duration_ms: Date.now() - startedAt,
        });
        return {
          id: genId(),
          filename: file.name,
          relativePath: parsed.relative,
          previewUrl: "",
          fileType,
          fileSize: file.size,
          lastModified: file.lastModified,
          status: "done",
          staged: true,
        };
      } catch (error) {
        const errorMessage2 =
          error instanceof Error ? error.message : "Upload failed";
        const errorKind = classifyUploadError(
          errorMessage2,
          error instanceof UploadRequestError ? error.status : void 0,
          error instanceof UploadRequestError ? error.code : void 0,
        );
        trackEvent(TRACK_EVENTS.UPLOAD_FILE_FAILED, {
          filename: file.name,
          file_size: file.size,
          file_type: fileType,
          duration_ms: Date.now() - startedAt,
          error_type: error instanceof TypeError ? "network" : "business",
          error_code: errorKind,
          stage: "staging",
        });
        throw error;
      }
    },
    [gatewayFetch2],
  );
  const applyEditedFile = reactExports.useCallback(
    async (attachmentId, file, options2) => {
      const version2 = attachmentVersionsRef.current.get(attachmentId);
      const isValid2 = () =>
        !options2.signal.aborted &&
        version2 !== void 0 &&
        version2 === attachmentVersionsRef.current.get(attachmentId) &&
        options2.canApply() &&
        attachmentsRef.current.some(
          (attachment) =>
            attachment.id === attachmentId && isFileAttachment(attachment),
        ) &&
        (options2.mode === "replace" ||
          attachmentsRef.current.length < maxAttachments);
      if (!isValid2()) return false;
      const accept =
        options2.mode === "replace" ? replacementAccept : attachmentAccept;
      if (!fileMatchesAccept(file, accept))
        throw new UploadRequestError("Unsupported edited file type");
      const staged = await stageSourceFile(file);
      let published = false;
      let previewUrl = "";
      try {
        if (!isValid2()) return false;
        const previous2 = attachmentsRef.current;
        const index2 = previous2.findIndex(
          (attachment) => attachment.id === attachmentId,
        );
        const original = previous2[index2];
        previewUrl = URL.createObjectURL(file);
        const edited = {
          ...staged,
          previewUrl,
          ...(options2.mode === "replace" && original.source
            ? {
                source: original.source,
              }
            : {}),
        };
        const next2 = [...previous2];
        if (options2.mode === "replace") next2[index2] = edited;
        else next2.push(edited);
        if (!syncAttachments(next2)) return false;
        published = true;
        objectUrlsRef.current.add(previewUrl);
        if (options2.mode === "replace") {
          if (original.previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(original.previewUrl);
            objectUrlsRef.current.delete(original.previewUrl);
          }
          if (original.staged && original.relativePath)
            deleteStagedFiles([original.relativePath]);
        }
        return true;
      } finally {
        if (!published) {
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          await requestStagedFileDeletion(
            staged.relativePath ? [staged.relativePath] : [],
          );
        }
      }
    },
    [
      attachmentAccept,
      replacementAccept,
      maxAttachments,
      stageSourceFile,
      syncAttachments,
      deleteStagedFiles,
      requestStagedFileDeletion,
    ],
  );
  const prepareSourceAttachmentReplacement = reactExports.useCallback(
    async (files, source) => {
      const baseRevision = attachmentRevisionRef.current;
      const retained = attachmentsRef.current.filter(
        (attachment) => attachment.source !== source,
      );
      if (retained.length + files.length > maxAttachments) {
        return {
          status: "capacity-exceeded",
        };
      }
      const incomingKeys = files.map(attachmentDedupKey);
      const existingKeys = new Set(
        retained.flatMap((attachment) =>
          attachment.fileSize === void 0 || attachment.lastModified === void 0
            ? []
            : [
                `${attachment.filename}:${attachment.fileSize}:${attachment.lastModified}`,
              ],
        ),
      );
      if (
        new Set(incomingKeys).size !== incomingKeys.length ||
        incomingKeys.some((key2) => existingKeys.has(key2))
      ) {
        return {
          status: "duplicate",
        };
      }
      const settled = await Promise.allSettled(files.map(stageSourceFile));
      const staged = settled.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      if (staged.length !== files.length) {
        await requestStagedFileDeletion(
          staged.flatMap((attachment) => attachment.relativePath ?? []),
        );
        return {
          status: "upload-failed",
        };
      }
      const batch2 = {
        id: `prepared-${genId()}`,
      };
      preparedSourceAttachmentsRef.current.set(batch2.id, {
        baseRevision,
        files: [...files],
        source,
        staged,
      });
      return {
        status: "ready",
        batch: batch2,
      };
    },
    [maxAttachments, requestStagedFileDeletion, stageSourceFile],
  );
  const commitPreparedSourceAttachments = reactExports.useCallback(
    (batch2, commitOptions) => {
      const prepared = preparedSourceAttachmentsRef.current.get(batch2.id);
      if (!prepared) return false;
      const rejectPrepared = () => {
        preparedSourceAttachmentsRef.current.delete(batch2.id);
        deleteStagedFiles(
          prepared.staged.flatMap(
            (attachment) => attachment.relativePath ?? [],
          ),
        );
        return false;
      };
      if (prepared.baseRevision !== attachmentRevisionRef.current)
        return rejectPrepared();
      const retained = attachmentsRef.current.filter(
        (attachment) => attachment.source !== prepared.source,
      );
      if (retained.length + prepared.staged.length > maxAttachments)
        return rejectPrepared();
      const dropping = attachmentsRef.current.filter(
        (attachment) => attachment.source === prepared.source,
      );
      const oldStagedPaths = dropping.flatMap((attachment) =>
        attachment.staged && attachment.relativePath
          ? [attachment.relativePath]
          : [],
      );
      const ownershipCandidate = [
        ...retained,
        ...prepared.staged.map((attachment) => ({
          ...attachment,
          source: prepared.source,
        })),
      ];
      if (!guardCommittedOwnership(ownershipCandidate)) return false;
      const nextSourceAttachments = prepared.staged.map(
        (attachment, index2) => {
          const file = prepared.files[index2];
          const shouldConvertHeic =
            attachment.fileType === "image" && isHeicFilename(file.name);
          let previewUrl = "";
          if (
            isPreviewableFileType(attachment.fileType) &&
            !shouldConvertHeic
          ) {
            try {
              previewUrl = URL.createObjectURL(file);
              objectUrlsRef.current.add(previewUrl);
            } catch {
              previewUrl = "";
            }
          }
          return {
            ...attachment,
            previewUrl,
            source: prepared.source,
          };
        },
      );
      const nextAttachments = [...retained, ...nextSourceAttachments];
      let parentCommitted = true;
      try {
        parentCommitted =
          commitOptions?.beforePublish?.(nextAttachments) ?? true;
      } catch {
        parentCommitted = false;
      }
      if (!parentCommitted) {
        for (const attachment of nextSourceAttachments) {
          if (!attachment.previewUrl.startsWith("blob:")) continue;
          URL.revokeObjectURL(attachment.previewUrl);
          objectUrlsRef.current.delete(attachment.previewUrl);
        }
        return false;
      }
      if (!syncAttachments(nextAttachments)) {
        for (const attachment of nextSourceAttachments) {
          if (!attachment.previewUrl.startsWith("blob:")) continue;
          URL.revokeObjectURL(attachment.previewUrl);
          objectUrlsRef.current.delete(attachment.previewUrl);
        }
        return false;
      }
      preparedSourceAttachmentsRef.current.delete(batch2.id);
      for (const attachment of dropping) {
        if (attachment.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(attachment.previewUrl);
          objectUrlsRef.current.delete(attachment.previewUrl);
        }
      }
      for (const [index2, attachment] of nextSourceAttachments.entries()) {
        const file = prepared.files[index2];
        if (attachment.fileType === "image" && isHeicFilename(file.name)) {
          void prepareHeicPreviewFromFile(file, attachment.id);
        }
      }
      deleteStagedFiles(oldStagedPaths);
      return true;
    },
    [
      deleteStagedFiles,
      guardCommittedOwnership,
      maxAttachments,
      prepareHeicPreviewFromFile,
      syncAttachments,
    ],
  );
  const rollbackPreparedSourceAttachments = reactExports.useCallback(
    async (batch2) => {
      const prepared = preparedSourceAttachmentsRef.current.get(batch2.id);
      if (!prepared) return;
      preparedSourceAttachmentsRef.current.delete(batch2.id);
      await requestStagedFileDeletion(
        prepared.staged.flatMap((attachment) => attachment.relativePath ?? []),
      );
    },
    [requestStagedFileDeletion],
  );
  const addFromLocal = reactExports.useCallback(
    (files, opts) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;
      const source = opts?.source;
      const chatContextOnly = opts?.chatContextOnly === true;
      const acceptedFiles = fileArray.filter((file) =>
        fileMatchesAccept(file, attachmentAccept),
      );
      const hasUnsupportedFiles = acceptedFiles.length < fileArray.length;
      const prev = attachmentsRef.current;
      const existingKeys = new Set(
        prev.map(
          (a2) =>
            `${a2.filename}:${a2.fileSize ?? ""}:${a2.lastModified ?? ""}`,
        ),
      );
      const uniqueFiles = acceptedFiles.filter(
        (f2) => !existingKeys.has(`${f2.name}:${f2.size}:${f2.lastModified}`),
      );
      const hasDuplicates = uniqueFiles.length < acceptedFiles.length;
      const remaining = maxAttachments - prev.length;
      const hitLimit = uniqueFiles.length > Math.max(0, remaining);
      if (remaining > 0) {
        const accepted = uniqueFiles.slice(0, remaining);
        const filesToUpload = [];
        const newAttachments = accepted.map((file) => {
          const ft2 = detectFileType(file.name);
          const shouldConvertHeic =
            ft2 === "image" && isHeicFilename(file.name);
          const previewUrl =
            isPreviewableFileType(ft2) && !shouldConvertHeic
              ? URL.createObjectURL(file)
              : "";
          if (previewUrl) objectUrlsRef.current.add(previewUrl);
          const id2 = genId();
          filesToUpload.push({
            file,
            id: id2,
          });
          return {
            id: id2,
            filename: file.name,
            relativePath: null,
            previewUrl,
            fileType: ft2,
            fileSize: file.size,
            lastModified: file.lastModified,
            status: "uploading",
            ...(source
              ? {
                  source,
                }
              : {}),
            ...(chatContextOnly
              ? {
                  chatContextOnly: true,
                }
              : {}),
          };
        });
        syncAttachments([...prev, ...newAttachments]);
        for (const { file, id: id2 } of filesToUpload) {
          if (isHeicFilename(file.name)) {
            prepareHeicPreviewFromFile(file, id2);
          }
          uploadFile(file, id2);
        }
      }
      if (hasDuplicates) {
        dedupedToast.warning(t2("chat.duplicateSkipped"));
      }
      if (hasUnsupportedFiles) {
        dedupedToast.warning(uploadErrorMessage(t2, "unsupportedType"));
      }
      if (hitLimit) {
        dedupedToast.warning(
          t2("chat.maxAttachments", {
            max: maxAttachments,
          }),
        );
      }
    },
    [
      attachmentAccept,
      maxAttachments,
      uploadFile,
      prepareHeicPreviewFromFile,
      t2,
      syncAttachments,
    ],
  );
  const replaceAttachment = reactExports.useCallback(
    async (attachmentId, input, options2) => {
      const target = attachmentsRef.current.find(
        (item) => item.id === attachmentId,
      );
      if (
        !target ||
        !isFileAttachment(target) ||
        target.status !== "done" ||
        replacementLocksRef.current.has(attachmentId)
      )
        return false;
      const version2 = attachmentVersionsRef.current.get(attachmentId);
      const isLocal = input instanceof File;
      const filename = isLocal ? input.name : input.filename;
      const valid2 = () =>
        mountedRef.current &&
        replacementScopeRef.current.gatewayScopeKey === gatewayScopeKey &&
        replacementScopeRef.current.replacementAccept === replacementAccept &&
        version2 === attachmentVersionsRef.current.get(attachmentId) &&
        (options2?.canApply?.() ?? true);
      if (!valid2()) return false;
      if (
        !fileMatchesAccept(
          isLocal
            ? input
            : {
                name: filename,
                type: "",
              },
          replacementAccept,
        )
      ) {
        dedupedToast.warning(uploadErrorMessage(t2, "unsupportedType"));
        return false;
      }
      const duplicate = () =>
        attachmentsRef.current.some(
          (item) =>
            item.id !== attachmentId &&
            (isLocal
              ? item.filename === input.name &&
                item.fileSize === input.size &&
                item.lastModified === input.lastModified
              : item.relativePath === input.relativePath),
        );
      if (duplicate()) {
        dedupedToast.warning(t2("chat.duplicateSkipped"));
        return false;
      }
      if (
        !isLocal &&
        (!input.relativePath || input.relativePath === target.relativePath)
      )
        return false;
      replacementLocksRef.current.add(attachmentId);
      setReplacingIds(new Set(replacementLocksRef.current));
      let prepared;
      let published = false;
      try {
        const fileType = detectFileType(filename);
        prepared = isLocal
          ? await stageSourceFile(input)
          : {
              ...input,
              id: genId(),
              status: "done",
              staged: false,
              fileType,
              previewUrl:
                isPreviewableFileType(fileType) && input.relativePath
                  ? (gatewayUrl2(API_PATHS.serveFile(input.relativePath)) ?? "")
                  : "",
            };
        if (!valid2() || duplicate()) return false;
        const shouldConvertHeic =
          fileType === "image" && isHeicFilename(filename);
        if (isLocal && isPreviewableFileType(fileType) && !shouldConvertHeic)
          prepared.previewUrl = URL.createObjectURL(input);
        const replacement = {
          ...prepared,
          source: target.source,
          chatContextOnly: target.chatContextOnly,
        };
        const next2 = attachmentsRef.current.map((item) =>
          item.id === attachmentId ? replacement : item,
        );
        if (!syncAttachments(next2)) return false;
        published = true;
        if (replacement.previewUrl.startsWith("blob:"))
          objectUrlsRef.current.add(replacement.previewUrl);
        options2?.onReplaced?.(target, replacement);
        if (target.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(target.previewUrl);
          objectUrlsRef.current.delete(target.previewUrl);
        }
        if (
          target.staged &&
          target.relativePath &&
          !next2.some((item) => item.relativePath === target.relativePath)
        )
          deleteStagedFiles([target.relativePath]);
        if (shouldConvertHeic) {
          if (isLocal) void prepareHeicPreviewFromFile(input, replacement.id);
          else if (replacement.previewUrl)
            void prepareHeicPreviewFromUrl(
              filename,
              replacement.previewUrl,
              replacement.id,
            );
        }
        return true;
      } catch {
        dedupedToast.error(t2("chat.attachmentReplaceFailed"));
        return false;
      } finally {
        if (!published && prepared) {
          if (prepared.previewUrl.startsWith("blob:"))
            URL.revokeObjectURL(prepared.previewUrl);
          if (prepared.staged && prepared.relativePath)
            await requestStagedFileDeletion([prepared.relativePath]);
        }
        replacementLocksRef.current.delete(attachmentId);
        if (mountedRef.current)
          setReplacingIds(new Set(replacementLocksRef.current));
      }
    },
    [
      gatewayScopeKey,
      replacementAccept,
      stageSourceFile,
      gatewayUrl2,
      syncAttachments,
      deleteStagedFiles,
      requestStagedFileDeletion,
      prepareHeicPreviewFromFile,
      prepareHeicPreviewFromUrl,
      t2,
    ],
  );
  const replaceFromLocal = reactExports.useCallback(
    (id2, file, options2) => replaceAttachment(id2, file, options2),
    [replaceAttachment],
  );
  const replaceFromAsset = reactExports.useCallback(
    (id2, asset, options2) => replaceAttachment(id2, asset, options2),
    [replaceAttachment],
  );
  const addFromAssetPath = reactExports.useCallback(
    (relativePath, filename, nodeId, attachmentId) => {
      const prev = attachmentsRef.current;
      const markToast = (key2) => {
        pendingToastsRef.current[key2] = true;
        if (!pendingToastsRef.current.scheduled) {
          pendingToastsRef.current.scheduled = true;
          queueMicrotask(() => {
            const { duplicate, limit, unsupported } = pendingToastsRef.current;
            pendingToastsRef.current = {
              duplicate: false,
              limit: false,
              unsupported: false,
              scheduled: false,
            };
            if (duplicate) dedupedToast.warning(t2("chat.duplicateSkipped"));
            if (unsupported)
              dedupedToast.warning(uploadErrorMessage(t2, "unsupportedType"));
            if (limit)
              dedupedToast.warning(
                t2("chat.maxAttachments", {
                  max: maxAttachments,
                }),
              );
          });
        }
      };
      if (
        !fileMatchesAccept(
          {
            name: filename,
            type: "",
          },
          attachmentAccept,
        )
      ) {
        markToast("unsupported");
        return false;
      }
      const existingIdx = prev.findIndex(
        (a2) => a2.relativePath === relativePath,
      );
      if (existingIdx !== -1) {
        const existing = prev[existingIdx];
        if (
          (nodeId && !existing.nodeId) ||
          (attachmentId && !existing.attachmentId)
        ) {
          const updated2 = [...prev];
          updated2[existingIdx] = {
            ...existing,
            ...(nodeId
              ? {
                  nodeId,
                }
              : {}),
            ...(attachmentId
              ? {
                  attachmentId,
                }
              : {}),
          };
          attachmentsRef.current = updated2;
          setAttachments(updated2);
          return true;
        }
        markToast("duplicate");
        return true;
      }
      if (prev.length >= maxAttachments) {
        markToast("limit");
        return false;
      }
      const ft2 = detectFileType(filename);
      const previewUrl = isPreviewableFileType(ft2)
        ? (gatewayUrl2(API_PATHS.serveFile(relativePath)) ?? "")
        : "";
      const id2 = genId();
      const updated = [
        ...prev,
        {
          id: id2,
          filename,
          relativePath,
          previewUrl:
            ft2 === "image" && isHeicFilename(filename) ? "" : previewUrl,
          fileType: ft2,
          status: "done",
          nodeId,
          attachmentId,
          staged: false,
        },
      ];
      syncAttachments(updated);
      if (ft2 === "image" && isHeicFilename(filename) && previewUrl) {
        prepareHeicPreviewFromUrl(filename, previewUrl, id2);
      }
      return true;
    },
    [
      attachmentAccept,
      gatewayUrl2,
      maxAttachments,
      prepareHeicPreviewFromUrl,
      t2,
      syncAttachments,
    ],
  );
  const renameAttachment = reactExports.useCallback(
    (oldPath, newPath, newFilename) => {
      const prev = attachmentsRef.current;
      const hasMatch = prev.some(
        (a2) =>
          isFileAttachment(a2) && !a2.staged && a2.relativePath === oldPath,
      );
      if (!hasMatch) return;
      const ft2 = detectFileType(newFilename);
      const nextPreview = isPreviewableFileType(ft2)
        ? (gatewayUrl2(API_PATHS.serveFile(newPath)) ?? "")
        : "";
      updateAttachments((list2) =>
        list2.map((a2) => {
          if (!isFileAttachment(a2) || a2.staged || a2.relativePath !== oldPath)
            return a2;
          return {
            ...a2,
            relativePath: newPath,
            filename: newFilename,
            fileType: ft2,
            previewUrl:
              ft2 === "image" && isHeicFilename(newFilename) ? "" : nextPreview,
          };
        }),
      );
    },
    [gatewayUrl2, updateAttachments],
  );
  const addFromPluginNode = reactExports.useCallback(
    (nodeId, pluginId, name2) => {
      const prev = attachmentsRef.current;
      if (attachmentAccept) {
        dedupedToast.warning(uploadErrorMessage(t2, "unsupportedType"));
        return;
      }
      const alreadyAttached = prev.some(
        (a2) => a2.kind === "plugin-node" && a2.pluginNodeId === nodeId,
      );
      if (alreadyAttached) return;
      if (prev.length >= maxAttachments) {
        dedupedToast.warning(
          t2("chat.maxAttachments", {
            max: maxAttachments,
          }),
        );
        return;
      }
      const displayName2 = name2?.trim() || pluginId;
      syncAttachments([
        ...prev,
        {
          id: genId(),
          filename: displayName2,
          relativePath: null,
          previewUrl: "",
          fileType: void 0,
          status: "done",
          staged: false,
          kind: "plugin-node",
          pluginNodeId: nodeId,
          pluginId,
        },
      ]);
    },
    [attachmentAccept, maxAttachments, syncAttachments, t2],
  );
  const remove2 = reactExports.useCallback(
    (id2, options2) => {
      const target = attachmentsRef.current.find((a2) => a2.id === id2);
      if (target?.commitOperationId) {
        void finalizeCommit([target.commitOperationId]);
      }
      if (target?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
        objectUrlsRef.current.delete(target.previewUrl);
      }
      if (target?.staged && target.relativePath && !options2?.preserveFile) {
        deleteStagedFiles([target.relativePath]);
      }
      updateAttachments((prev) => prev.filter((a2) => a2.id !== id2));
    },
    [updateAttachments, deleteStagedFiles, finalizeCommit],
  );
  const clear = reactExports.useCallback(
    (opts) => {
      const filter2 = opts?.source;
      const prev = attachmentsRef.current;
      const matches2 = (a2) => filter2 === void 0 || a2.source === filter2;
      const dropping = prev.filter(matches2);
      const operationIds = dropping.flatMap(
        (attachment) => attachment.commitOperationId ?? [],
      );
      if (operationIds.length > 0) void finalizeCommit(operationIds);
      const stagedPaths = dropping
        .filter((a2) => !a2.commitOperationId && a2.staged && a2.relativePath)
        .map((a2) => a2.relativePath);
      for (const a2 of dropping) {
        if (a2.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(a2.previewUrl);
          objectUrlsRef.current.delete(a2.previewUrl);
        }
      }
      if (stagedPaths.length > 0) {
        deleteStagedFiles(stagedPaths);
      }
      updateAttachments((current2) =>
        current2.filter((attachment) => !matches2(attachment)),
      );
    },
    [updateAttachments, deleteStagedFiles, finalizeCommit],
  );
  const commitFiles = reactExports.useCallback(async () => {
    const attachmentRevision = attachmentRevisionRef.current;
    const attachmentSnapshot = attachmentsRef.current;
    const pluginNodeItems = attachmentSnapshot.filter(
      (a2) => a2.kind === "plugin-node" && a2.pluginNodeId && a2.pluginId,
    );
    const pluginNodeAttachments =
      pluginNodeItems.length > 0
        ? pluginNodeItems.map((a2) => ({
            nodeId: a2.pluginNodeId,
            pluginId: a2.pluginId,
            ...(a2.filename
              ? {
                  name: a2.filename,
                }
              : {}),
          }))
        : void 0;
    const refOnlyPayload = {
      ...(pluginNodeAttachments
        ? {
            pluginNodeAttachments,
          }
        : {}),
    };
    const ready = attachmentSnapshot.filter(
      (a2) => isFileAttachment(a2) && a2.status === "done" && a2.relativePath,
    );
    if (ready.length === 0) {
      return {
        filePaths: [],
        ...refOnlyPayload,
      };
    }
    const payloadFrom = (items) => {
      const filePaths = items.map((a2) => a2.relativePath);
      const attachmentRefs = items.flatMap((attachment) =>
        attachment.relativePath && attachment.attachmentId
          ? [
              {
                path: attachment.relativePath,
                attachment_source: "asset_vault",
                attachment_id: attachment.attachmentId,
              },
            ]
          : [],
      );
      const canvasNodeAttachments = items
        .filter((a2) => a2.relativePath && a2.nodeId)
        .map((a2) => ({
          path: a2.relativePath,
          nodeId: a2.nodeId,
        }));
      return {
        filePaths,
        ...(attachmentRefs.length > 0
          ? {
              attachmentRefs,
            }
          : {}),
        canvasNodeAttachments:
          canvasNodeAttachments.length > 0 ? canvasNodeAttachments : void 0,
        ...refOnlyPayload,
      };
    };
    const needsCommit = ready.some((a2) => a2.staged);
    if (!needsCommit) {
      const commitOperationIds = [
        ...new Set(
          ready.flatMap((attachment) => attachment.commitOperationId ?? []),
        ),
      ];
      return {
        ...payloadFrom(ready),
        ...(commitOperationIds.length > 0
          ? {
              commitOperationIds,
            }
          : {}),
      };
    }
    const allPaths = ready.map((a2) => a2.relativePath);
    const contextPaths = ready
      .filter(
        (attachment) =>
          attachment.source === "workflow" || attachment.chatContextOnly,
      )
      .map((attachment) => attachment.relativePath);
    const operationId = await stableUploadCommitOperationId(allPaths);
    if (attachmentRevisionRef.current !== attachmentRevision) {
      throw new Error("attachments changed while preparing commit");
    }
    const stagedFileCount = ready.filter(
      (attachment) => attachment.staged,
    ).length;
    let resp;
    try {
      resp = await gatewayFetch2(API_PATHS.uploadCommit, {
        method: "POST",
        // Commit hashes staged bytes before durable publication. Scale the
        // client deadline for legal large batches instead of timing out every
        // request at 30 seconds while the server transaction continues safely.
        timeoutMs: uploadCommitTimeoutMs(ready),
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paths: allPaths,
          operationId,
          ...(contextPaths.length > 0
            ? {
                contextPaths,
              }
            : {}),
        }),
      });
    } catch (error) {
      if (
        error instanceof GatewayHttpError &&
        error.code === UPLOAD_COMMIT_SAFE_PUBLISH_UNSUPPORTED
      ) {
        reportUnsupportedUploadCommitFilesystem(stagedFileCount);
        throw new UploadCommitUnsupportedFilesystemError();
      }
      throw error;
    }
    if (resp.ok === false) {
      let errorCode;
      try {
        errorCode = uploadCommitErrorCode(await resp.json());
      } catch {}
      if (errorCode === UPLOAD_COMMIT_SAFE_PUBLISH_UNSUPPORTED) {
        reportUnsupportedUploadCommitFilesystem(stagedFileCount);
        throw new UploadCommitUnsupportedFilesystemError();
      }
      throw new Error(`upload commit HTTP ${resp.status}`);
    }
    const data2 = uploadCommitResponse(await resp.json(), allPaths);
    if (!data2) throw new Error("invalid upload commit response");
    const pathMap = new Map(data2.committed.map((c3) => [c3.from, c3.to]));
    const attachmentIdByPath = new Map(
      (data2.attachment_refs ?? []).map((ref) => [ref.path, ref.attachment_id]),
    );
    const committedReady = ready.map((attachment) => {
      const committedPath = attachment.relativePath
        ? pathMap.get(attachment.relativePath)
        : void 0;
      return committedPath && attachment.staged
        ? {
            ...attachment,
            relativePath: committedPath,
            ...(attachmentIdByPath.get(committedPath)
              ? {
                  attachmentId: attachmentIdByPath.get(committedPath),
                }
              : {}),
            staged: false,
            commitOperationId: operationId,
            commitSourcePath: attachment.relativePath,
          }
        : attachment;
    });
    if (attachmentRevisionRef.current !== attachmentRevision) {
      const abortOutcome = await requestUploadCommitAbort(
        operationId,
        data2.committed.flatMap(({ from: from2, to }) =>
          from2 !== to ? [to] : [],
        ),
      );
      if (abortOutcome === "pending") {
        updateAttachments((current2) => {
          const currentIds = new Set(
            current2.map((attachment) => attachment.id),
          );
          return [
            ...current2,
            ...committedReady.filter(
              (attachment) => !currentIds.has(attachment.id),
            ),
          ];
        });
      }
      throw new Error("attachments changed while committing");
    }
    updateAttachments((prev) =>
      prev.map((a2) => {
        const committedPath = a2.relativePath
          ? pathMap.get(a2.relativePath)
          : void 0;
        return committedPath && a2.staged
          ? {
              ...a2,
              relativePath: committedPath,
              ...(attachmentIdByPath.get(committedPath)
                ? {
                    attachmentId: attachmentIdByPath.get(committedPath),
                  }
                : {}),
              staged: false,
              commitOperationId: operationId,
              commitSourcePath: a2.relativePath,
            }
          : a2;
      }),
    );
    return {
      ...payloadFrom(committedReady),
      committed: data2.committed,
      commitOperationIds: [
        ...new Set(
          committedReady.flatMap(
            (attachment) => attachment.commitOperationId ?? [],
          ),
        ),
      ],
    };
  }, [gatewayFetch2, requestUploadCommitAbort, updateAttachments]);
  const uploading =
    replacingIds.size > 0 ||
    attachments.some((a2) => a2.status === "uploading");
  return {
    attachments,
    uploading,
    addFromLocal,
    replaceFromLocal,
    replaceFromAsset,
    replacingIds,
    applyEditedFile,
    addFromAssetPath,
    renameAttachment,
    addFromPluginNode,
    remove: remove2,
    clear,
    replaceAttachments,
    replaceSourceAttachmentPlaceholders,
    prepareSourceAttachmentReplacement,
    commitPreparedSourceAttachments,
    rollbackPreparedSourceAttachments,
    commitFiles,
    finalizeCommit,
  };
}
