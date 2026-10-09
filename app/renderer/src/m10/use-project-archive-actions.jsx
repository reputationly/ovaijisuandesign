// use-project-archive-actions.jsx
import { useTranslation, reactExports, dedupedToast, useQueryClient, storageKeys, usePlatform } from "../vendor.js";
import { useNavigateToWorkspace } from "../m15/create-visible-preview-tabs-store.js";
import { projectLog } from "../m15/graph.jsx";
import { useInterestSelection, getFileManagerLabelKey } from "../m15/interest-selection-provider.jsx";
import { workspaceRuntimeFromOpenResult } from "../m15/linked-list.js";
import { createProjectOperationId, logProjectOperationAttempt, logProjectOperationFailure, logProjectOperationBlocked, logProjectOperationSuccess } from "../m15/record-recent-workspace-opened.jsx";
import { TRACK_EVENTS } from "../m15/track-events.js";
import {
  Checkbox,
  Button$1,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  cn$2,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { homeService } from "../m08/browser-inspiration-urls.jsx";
import { trackEvent } from "../asset-center/shared/init-track.js";
import { getProjectExportFailureReason } from "../m08/instantiation-service.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { logProjectOperationCanceled } from "./custom-provider-form.jsx";
import { toastWorkspaceOpenResult } from "./new-workspace-dialog.jsx";
import { HubBrandLine, INTEREST_OPTIONS } from "./proxy-detected-toast.jsx";
const MAX_INTERESTS = 3;
function InterestOptionGrid({ value, onToggle }) {
  const { t: t2 } = useTranslation();
  const reachedLimit = value.length >= MAX_INTERESTS;
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {INTEREST_OPTIONS.map(({ key: key2, icon: Icon2 }) => {
        const selected2 = value.includes(key2);
        const disabled2 = !selected2 && reachedLimit;
        return (
          // biome-ignore lint/a11y/noLabelWithoutControl: shared Checkbox renders the associated native input inside this label.
          <label
            key={key2}
            data-action-ui-id={`interestSelection.option.${key2}`}
            className={cn$2(
              // 基础:左对齐 icon + 文字,gap-2,brutalist 圆角,过渡只走 colors
              "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border-[1.5px] px-3 text-left text-sm font-medium transition-colors",
              // 默认(未选中):弱黑细边 + 卡片底,hover 加深边色
              !selected2 && [
                "border-foreground/15 bg-card text-foreground",
                "hover:border-foreground/30",
              ],
              // 选中态:反色激活(global.md 红线 5,激活优先反色)
              selected2 && "border-brutalist-border bg-foreground text-background",
              // 已达上限且未选中:disabled 视觉
              disabled2 && "cursor-not-allowed text-muted-foreground hover:border-foreground/15",
            )}
          >
            <Icon2 size={16} strokeWidth={1} className="shrink-0" aria-hidden={true} />
            <span className="flex-1 truncate">{t2(`interestSelection.option.${key2}`)}</span>
            <Checkbox
              size="sm"
              shape="circle"
              checked={selected2}
              disabled={disabled2}
              onCheckedChange={() => onToggle(key2)}
              aria-label={t2(`interestSelection.option.${key2}`)}
            />
          </label>
        );
      })}
    </div>
  );
}
export function InterestSelectionDialog() {
  const { isOpen, selected: selected2, toggle, complete } = useInterestSelection();
  const { t: t2 } = useTranslation();
  reactExports.useEffect(() => {
    if (isOpen) {
      trackEvent(TRACK_EVENTS.INTEREST_SELECTION_VIEW, {});
    }
  }, [isOpen]);
  const handleStart = async () => {
    if (selected2.length === 0) return;
    trackEvent(TRACK_EVENTS.INTEREST_SELECTION_COMPLETE, {
      interests: [...selected2],
    });
    await complete();
  };
  return (
    <Dialog open={isOpen} onOpenChange={() => {}} disablePointerDismissal={true}>
      <DialogContent
        className="!grid !grid-cols-1 !grid-rows-[auto] !w-[640px] !max-w-[640px] !gap-0 !p-0 elevated-surface-border rounded-xl bg-popover shadow-lg ring-0 sm:!max-w-[640px]"
        showCloseButton={false}
        data-action-ui-id="interestSelection"
      >
        <DialogTitle className="sr-only">{t2("interestSelection.heading")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t2("interestSelection.description")}
        </DialogDescription>
        <div className="flex flex-col">
          <div className="px-8 pt-8 pb-6">
            <HubBrandLine logoSize={28} showSubtitle={false} />
          </div>
          <div className="flex flex-col gap-5 px-8 pb-7">
            <div className="flex flex-col gap-1">
              <h2 className="font-heading text-base font-medium text-foreground">
                {t2("interestSelection.heading")}
              </h2>
              <p className="text-sm text-muted-foreground">{t2("interestSelection.description")}</p>
            </div>
            <InterestOptionGrid value={selected2} onToggle={toggle} />
          </div>
          <div className="flex items-center justify-between gap-4 px-8 pt-2 pb-7">
            <div className="text-sm text-muted-foreground">
              {t2("interestSelection.counter", {
                count: selected2.length,
                max: MAX_INTERESTS,
              })}
            </div>
            <Button$1
              variant="default"
              size="lg"
              className="h-10 px-5 text-sm font-medium"
              onClick={handleStart}
              disabled={selected2.length === 0}
              data-action-ui-id="interestSelection.cta"
            >
              {t2("interestSelection.cta")}
            </Button$1>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
const EXPORT_FAILURE_MESSAGE_KEYS = {
  invalid_destination: "projectArchive.export.failure.invalidDestination",
  parent_not_directory: "projectArchive.export.failure.parentNotDirectory",
  root_unavailable: "projectArchive.export.failure.rootUnavailable",
  permission_denied: "projectArchive.export.failure.permissionDenied",
  destination_busy: "projectArchive.export.failure.destinationBusy",
  disk_full: "projectArchive.export.failure.diskFull",
  verification_failed: "projectArchive.export.failure.verificationFailed",
  publish_failed: "projectArchive.export.failure.publishFailed",
  destination_inside_project: "projectArchive.export.failure.destinationInsideProject",
  activity_unavailable: "projectArchive.export.failure.activityUnavailable",
  workspace_not_ready: "projectArchive.export.failure.workspaceNotReady",
  export_in_progress: "projectArchive.export.failure.exportInProgress",
  unexpected: "projectArchive.export.failure.unexpected",
};
const UNEXPECTED_EXPORT_FAILURE_MESSAGE_KEY = "projectArchive.export.failure.unexpected";
function getProjectExportFailureMessageKey(reason) {
  return reason ? EXPORT_FAILURE_MESSAGE_KEYS[reason] : UNEXPECTED_EXPORT_FAILURE_MESSAGE_KEY;
}
const PERMISSION_FAILURE_REASONS = new Set(["permission_denied", "destination_busy"]);
function buildProjectExportFailureProps(reason, phase, durationMs, platform2) {
  let errorType = "business";
  if (reason === "unexpected") errorType = "unknown";
  else if (PERMISSION_FAILURE_REASONS.has(reason)) errorType = "permission";
  return {
    error_type: errorType,
    error_code: reason,
    error_message: `project_export_${reason}`,
    duration_ms: Math.max(0, Math.round(durationMs)),
    phase,
    platform:
      platform2 === "win32" || platform2 === "darwin" || platform2 === "linux"
        ? platform2
        : "other",
    reason,
  };
}
function trackProjectExportFailure(reason, phase, durationMs, platform2) {
  trackEvent(
    TRACK_EVENTS.PROJECT_EXPORT_FAILED,
    buildProjectExportFailureProps(reason, phase, durationMs, platform2),
  );
}
const IMPORT_FAILURE_MESSAGE_KEYS = {
  file_access_blocked: "projectArchive.import.failure.fileAccessBlocked",
  destination_conflict: "projectArchive.import.failure.destinationConflict",
  disk_full: "projectArchive.import.failure.diskFull",
  archive_invalid: "projectArchive.import.failure.archiveInvalid",
  archive_too_large: "projectArchive.import.failure.archiveTooLarge",
  download_failed: "projectArchive.import.failure.downloadFailed",
  path_unavailable: "projectArchive.import.failure.pathUnavailable",
  import_in_progress: "projectArchive.import.failure.importInProgress",
  unexpected: "projectArchive.import.failure.unexpected",
};
function getProjectImportFailureMessageKey(failure) {
  const reason = failure?.reason;
  if (failure?.phase === "download") {
    if (reason === "disk_full") return "projectArchive.import.failure.downloadDiskFull";
    if (reason === "download_failed" && /^HTTP_4\d\d$/.test(failure.errorCode ?? "")) {
      return "projectArchive.import.failure.templateUnavailable";
    }
  }
  return reason
    ? (IMPORT_FAILURE_MESSAGE_KEYS[reason] ?? IMPORT_FAILURE_MESSAGE_KEYS.unexpected)
    : IMPORT_FAILURE_MESSAGE_KEYS.unexpected;
}
const ERROR_CODES = new Set([
  "EPERM",
  "EACCES",
  "EBUSY",
  "ENOSPC",
  "ENOENT",
  "ENOTDIR",
  "EEXIST",
  "ENOTEMPTY",
  "EXDEV",
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ENOTFOUND",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_SOCKET",
  "ERR_ARCHIVE_TOO_LARGE",
  "ERR_INVALID_RESPONSE",
]);
const REASONS = {
  file_access_blocked: true,
  destination_conflict: true,
  disk_full: true,
  archive_invalid: true,
  archive_too_large: true,
  download_failed: true,
  path_unavailable: true,
  import_in_progress: true,
  unexpected: true,
};
const PHASES = {
  prepare: true,
  download: true,
  validate: true,
  extract: true,
  restore: true,
  publish: true,
  sessions: true,
};
function safeCount(value) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}
function buildProjectImportResultProps(result, source, platform2) {
  const failure = result.failure;
  const partial =
    !failure &&
    !result.cancelled &&
    (Boolean(result.opencodeImportError) ||
      (result.expectedOpencodeSessionCount ?? 0) > (result.opencodeSessionCount ?? 0));
  const outcome = result.cancelled
    ? "cancelled"
    : failure
      ? failure.reason === "import_in_progress"
        ? "blocked"
        : "failed"
      : partial
        ? "partial"
        : "success";
  const code2 = failure?.errorCode ?? result.opencodeImportErrorCode;
  return {
    source:
      source === "file-picker" || source === "remote-template" || source === "bundled-template"
        ? source
        : "other",
    outcome,
    phase: failure
      ? Object.hasOwn(PHASES, failure.phase)
        ? failure.phase
        : "unknown"
      : partial
        ? "sessions"
        : result.cancelled
          ? "prepare"
          : "complete",
    reason: failure
      ? Object.hasOwn(REASONS, failure.reason)
        ? failure.reason
        : "unexpected"
      : partial
        ? code2 === "ETIMEDOUT"
          ? "session_restore_unconfirmed"
          : "partial_session_restore"
        : "none",
    error_code:
      code2 && (ERROR_CODES.has(code2) || /^HTTP_[1-5]\d\d$/.test(code2))
        ? code2
        : failure || partial
          ? "unknown"
          : "none",
    duration_ms: safeCount(result.durationMs),
    publish_retry_count: safeCount(result.publishRetryCount),
    platform:
      platform2 === "win32" || platform2 === "darwin" || platform2 === "linux"
        ? platform2
        : "other",
  };
}
function trackProjectImportResult(result, source, platform2) {
  try {
    trackEvent(
      TRACK_EVENTS.PROJECT_IMPORT_RESULT,
      buildProjectImportResultProps(result, source, platform2),
    );
  } catch {
    projectLog.warn("project-import telemetry enqueue failed");
  }
}
const EXPORT_TOAST_ID = "project-archive-export";
const IMPORT_TOAST_ID = "project-archive-import";
const getImportToastId = (operationId) => `${IMPORT_TOAST_ID}:${operationId}`;
export function useProjectArchiveActions() {
  const { t: t2 } = useTranslation();
  const queryClient2 = useQueryClient();
  const navigateToWorkspace = useNavigateToWorkspace();
  const platform2 = usePlatform();
  const runExport = reactExports.useCallback(
    async (folderPath) => {
      const operationId = createProjectOperationId("export-project");
      const startedAt = logProjectOperationAttempt("export-project", operationId, {
        hasWorkspace: Boolean(folderPath),
      });
      if (!folderPath) {
        logProjectOperationBlocked(
          "export-project",
          operationId,
          startedAt,
          "preflight",
          "workspace-missing",
        );
        dedupedToast.error(t2("projectArchive.export.noWorkspace"));
        return;
      }
      const progressSub = homeService.projectArchive.onProgress((p3) => {
        if (p3.kind !== "export") return;
        dedupedToast.loading(`${t2("projectArchive.export.inProgress")} ${p3.percent}%`, {
          id: EXPORT_TOAST_ID,
          action: {
            label: t2("common.cancel"),
            onClick: () => {
              void homeService.projectArchive.cancelExport();
            },
          },
        });
      });
      const exportStartedAt = Date.now();
      try {
        const result = await homeService.projectArchive.exportProject(folderPath);
        if (result.cancelled) {
          logProjectOperationCanceled(
            "export-project",
            operationId,
            startedAt,
            result.cancelReason ?? "unknown",
          );
          if (result.cancelReason === "aborted") {
            dedupedToast(t2("projectArchive.export.cancelled"), {
              id: EXPORT_TOAST_ID,
            });
          } else {
            dedupedToast.dismiss(EXPORT_TOAST_ID);
          }
          return;
        }
        if (result.failureReason) {
          logProjectOperationFailure("export-project", operationId, startedAt, "archive-result", {
            code: result.failureReason,
          });
          trackProjectExportFailure(
            result.failureReason,
            "result",
            Date.now() - exportStartedAt,
            platform2.app.os,
          );
          dedupedToast.error(t2("projectArchive.export.failed"), {
            id: EXPORT_TOAST_ID,
            description: t2(getProjectExportFailureMessageKey(result.failureReason)),
          });
          return;
        }
        const filePath = result.filePath;
        logProjectOperationSuccess("export-project", operationId, startedAt, {
          sizeBytes: result.size,
          opencodeSessionCount: result.opencodeSessionCount,
        });
        dedupedToast.success(t2("projectArchive.export.success"), {
          id: EXPORT_TOAST_ID,
          description: filePath,
          action: filePath
            ? {
                label: t2(getFileManagerLabelKey(platform2.app.os)),
                onClick: () => {
                  void platform2.shell.showItemInFolder?.(filePath);
                },
              }
            : void 0,
        });
      } catch (err) {
        const reason = getProjectExportFailureReason(err);
        logProjectOperationFailure(
          "export-project",
          operationId,
          startedAt,
          "archive-exception",
          err,
          {
            failureReason: reason ?? "unexpected",
          },
        );
        trackProjectExportFailure(
          reason ?? "unexpected",
          "exception",
          Date.now() - exportStartedAt,
          platform2.app.os,
        );
        dedupedToast.error(t2("projectArchive.export.failed"), {
          id: EXPORT_TOAST_ID,
          description: t2(getProjectExportFailureMessageKey(reason)),
        });
      } finally {
        progressSub.dispose();
      }
    },
    [platform2, t2],
  );
  const handleImportResult = reactExports.useCallback(
    async (result, operation) => {
      const toastId = getImportToastId(operation.operationId);
      if (result.cancelled) {
        dedupedToast.dismiss(toastId);
        return false;
      }
      if (result.failure) {
        const failure = result.failure;
        logProjectOperationFailure(
          "import-project",
          failure.operationId,
          operation.startedAt,
          failure.phase,
          {
            code: failure.errorCode,
          },
          {
            source: operation.source,
            failureReason: failure.reason,
          },
        );
        dedupedToast.error(t2("projectArchive.import.failed"), {
          id: toastId,
          description: t2(getProjectImportFailureMessageKey(failure)),
        });
        return false;
      }
      const inserted = result.opencodeSessionCount ?? 0;
      const expected = result.expectedOpencodeSessionCount ?? 0;
      const missing = Math.max(0, expected - inserted);
      const partial = missing > 0 || Boolean(result.opencodeImportError);
      logProjectOperationSuccess(
        "import-project-files",
        operation.operationId,
        operation.startedAt,
        {
          source: operation.source,
          importedSessionCount: inserted,
          expectedSessionCount: expected,
          missingSessionCount: missing,
        },
      );
      if (partial) {
        logProjectOperationBlocked(
          "import-project-sessions",
          operation.operationId,
          operation.startedAt,
          "session-import",
          "partial-session-import",
          {
            source: operation.source,
            importedSessionCount: inserted,
            expectedSessionCount: expected,
            missingSessionCount: missing,
          },
        );
      }
      if (partial) {
        dedupedToast.warning(t2("projectArchive.import.partial"), {
          id: toastId,
          description: t2("projectArchive.import.partialDetail"),
        });
      } else {
        dedupedToast.success(t2("projectArchive.import.success"), {
          id: toastId,
          description: result.targetDir,
        });
      }
      try {
        const targetDir = result.targetDir;
        if (targetDir) {
          const openResult = await homeService.hiloApp.openWorkspaceWithResult(targetDir);
          const runtime = workspaceRuntimeFromOpenResult(openResult);
          if (!runtime) {
            logProjectOperationFailure(
              "import-project",
              operation.operationId,
              operation.startedAt,
              "workspace-open-result",
              {
                code: `open-result-${openResult.kind}`,
              },
              {
                source: operation.source,
              },
            );
            toastWorkspaceOpenResult(openResult, t2);
            return false;
          }
          await queryClient2.invalidateQueries({
            queryKey: storageKeys.global("recentWorkspaces"),
          });
          navigateToWorkspace(runtime);
          logProjectOperationSuccess("import-project", operation.operationId, operation.startedAt, {
            source: operation.source,
            missingSessionCount: missing,
          });
          return true;
        }
      } catch (openErr) {
        logProjectOperationFailure(
          "import-project",
          operation.operationId,
          operation.startedAt,
          "workspace-open",
          openErr,
          {
            source: operation.source,
          },
        );
        const msg = openErr instanceof Error ? openErr.message : String(openErr);
        dedupedToast.error(t2("projectArchive.import.openFailed"), {
          description: msg,
        });
        return false;
      }
      logProjectOperationFailure(
        "import-project",
        operation.operationId,
        operation.startedAt,
        "workspace-open",
        {
          code: "target-directory-missing",
        },
        {
          source: operation.source,
        },
      );
      return false;
    },
    [navigateToWorkspace, queryClient2, t2],
  );
  const runImport = reactExports.useCallback(async () => {
    const operationId = createProjectOperationId("import-project");
    const toastId = getImportToastId(operationId);
    let reported = false;
    const startedAt = logProjectOperationAttempt("import-project", operationId, {
      source: "file-picker",
    });
    const progressSub = homeService.projectArchive.onProgress((p3) => {
      if (p3.kind !== "import" || p3.operationId !== operationId) return;
      dedupedToast.loading(t2("projectArchive.import.inProgress"), {
        id: toastId,
      });
    });
    try {
      const result = await homeService.projectArchive.importProject({
        operationId,
      });
      reported = true;
      trackProjectImportResult(result, "file-picker", platform2.app.os);
      if (result.cancelled) {
        logProjectOperationCanceled("import-project", operationId, startedAt, "dialog", {
          source: "file-picker",
        });
        dedupedToast.dismiss(toastId);
        return;
      }
      await handleImportResult(result, {
        operationId,
        startedAt,
        source: "file-picker",
      });
    } catch (err) {
      if (!reported)
        trackProjectImportResult(
          {
            cancelled: false,
            failure: {
              operationId,
              phase: "prepare",
              reason: "unexpected",
            },
          },
          "file-picker",
          platform2.app.os,
        );
      logProjectOperationFailure("import-project", operationId, startedAt, "archive-import", err, {
        source: "file-picker",
      });
      dedupedToast.error(t2("projectArchive.import.failed"), {
        id: toastId,
        description: t2(getProjectImportFailureMessageKey()),
      });
    } finally {
      progressSub.dispose();
    }
  }, [handleImportResult, platform2.app.os, t2]);
  const finishTemplateImport = reactExports.useCallback(
    async (source, importProject) => {
      const operationId = createProjectOperationId("import-project");
      const toastId = getImportToastId(operationId);
      let reported = false;
      const startedAt = logProjectOperationAttempt("import-project", operationId, {
        source,
      });
      dedupedToast.loading(t2("projectArchive.import.inProgress"), {
        id: toastId,
      });
      try {
        const result = await importProject(operationId);
        reported = true;
        trackProjectImportResult(result, source, platform2.app.os);
        const opened = await handleImportResult(result, {
          operationId,
          startedAt,
          source,
        });
        return opened
          ? {
              success: true,
              targetDir: result.targetDir,
            }
          : {
              success: false,
              failureStage: result.failure ? "template_import" : "workspace_open",
              targetDir: result.targetDir,
            };
      } catch (err) {
        if (!reported)
          trackProjectImportResult(
            {
              cancelled: false,
              failure: {
                operationId,
                phase: "prepare",
                reason: "unexpected",
              },
            },
            source,
            platform2.app.os,
          );
        logProjectOperationFailure(
          "import-project",
          operationId,
          startedAt,
          "archive-import",
          err,
          {
            source,
          },
        );
        dedupedToast.error(t2("projectArchive.import.failed"), {
          id: toastId,
          description: t2(getProjectImportFailureMessageKey()),
        });
        return {
          success: false,
          failureStage: "template_import",
        };
      }
    },
    [handleImportResult, platform2.app.os, t2],
  );
  const runImportFromUrl = reactExports.useCallback(
    (url2, projectName) =>
      finishTemplateImport("remote-template", (operationId) =>
        homeService.projectArchive.importProjectFromUrl(url2, projectName, {
          operationId,
        }),
      ),
    [finishTemplateImport],
  );
  const runImportBundledProject = reactExports.useCallback(
    (templateId) =>
      finishTemplateImport("bundled-template", (operationId) =>
        homeService.projectArchive.importBundledProject(templateId, {
          operationId,
        }),
      ),
    [finishTemplateImport],
  );
  return {
    runExport,
    runImport,
    runImportFromUrl,
    runImportBundledProject,
  };
}
