// bundle-error-screen.jsx
import { jsxRuntimeExports, useTranslation, reactExports, dedupedToast, ChevronDown, X$7, Info$1, AlertTriangle, getRuntimeConfig } from "../vendor.js";
import { gatewayFetch } from "./agent-ws-client.jsx";
import { useAuth } from "../assets/apply-asset-change.jsx";
import { remoteToolLog } from "../vendor-inline/vscode-base/graph.jsx";
import { Upload } from "../media-editing/parse-item.jsx";
import { resolveWorkspaceFailureDiagnosis } from "../canvas/use-canvas-tag-filter.js";
import { useRemoteToolSdk, WORKSPACE_FAILURE_DIAGNOSIS_REGISTRY } from "../workspace/workspace-failure-diagnosis-registry.js";
import { Button$1 } from "./use-browser-overlay-dialog-props.jsx";
import { RetryIcon } from "../workspace/browser-inspiration-urls.jsx";
import { getNetworkDiagnosticsMainService } from "../team/delete-account-confirm-dialog.jsx";
import { reportRumAction, reportRumError } from "../i18n/init-rum.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { RemoteToolDialogShell, RemoteToolHost$1, isTerminalState } from "../media-editing/remote-tool-host.jsx";
const LOCAL_PATH_RE = /^(\/|[A-Za-z]:[\\/])/;
const MEDIA_EXT_RE = /\.(png|jpg|jpeg|webp|gif|avif|mp4|mp3|wav|m4a|ogg)$/i;
function looksLikeLocalPath(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.startsWith("http://") || value.startsWith("https://")) return false;
  if (value.startsWith("data:") || value.startsWith("blob:")) return false;
  if (LOCAL_PATH_RE.test(value)) return true;
  return !value.includes("://") && MEDIA_EXT_RE.test(value);
}
async function normalizeInitialParams(params) {
  const entries2 = await Promise.all(
    Object.entries(params).map(async ([key2, value]) => {
      if (!looksLikeLocalPath(value)) return [key2, value];
      try {
        const res = await gatewayFetch("/api/files/upload-cdn", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file_path: value,
          }),
          timeoutMs: 12e4,
        });
        const json2 = await res.json();
        if (json2.ok && json2.url) {
          remoteToolLog.info("initial_params normalized", {
            key: key2,
            from: value,
            to: json2.url,
          });
          return [key2, json2.url];
        }
        remoteToolLog.warn("initial_params upload-cdn returned not ok", {
          key: key2,
          path: value,
          error: json2.error ?? "unknown",
        });
      } catch (err) {
        remoteToolLog.warn("initial_params upload-cdn exception", {
          key: key2,
          path: value,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      return [key2, value];
    }),
  );
  return Object.fromEntries(entries2);
}
export function RemoteToolDialog({
  open,
  onClose,
  toolUrl,
  manifestPath,
  toolId,
  locale = "en",
  onGuiEvent,
  hostEvent,
  initialParams,
  onCheckLogin,
  interactionDisabled = false,
}) {
  const { t: t2 } = useTranslation();
  const initialParamsRef = reactExports.useRef(initialParams);
  const { sdk, dispatchHostEvent } = useRemoteToolSdk({
    toolId,
    locale,
    onEmit: onGuiEvent,
    onCheckLogin,
    getInitialParams: () => initialParamsRef.current,
  });
  reactExports.useEffect(() => {
    if (!hostEvent) return;
    dispatchHostEvent(hostEvent.eventType, hostEvent.data);
  }, [hostEvent, dispatchHostEvent]);
  const [paramsReady, setParamsReady] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!open) {
      setParamsReady(false);
      initialParamsRef.current = initialParams;
      return;
    }
    let cancelled = false;
    if (!initialParams || Object.keys(initialParams).length === 0) {
      initialParamsRef.current = initialParams;
      setParamsReady(true);
      return;
    }
    setParamsReady(false);
    normalizeInitialParams(initialParams)
      .then((normalized) => {
        if (cancelled) return;
        initialParamsRef.current = normalized;
        setParamsReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        remoteToolLog.error("normalizeInitialParams unexpected error", {
          error: err instanceof Error ? err.message : String(err),
        });
        initialParamsRef.current = initialParams;
        setParamsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, initialParams]);
  const [guiWidth, setGuiWidth] = reactExports.useState(void 0);
  const [guiHeight, setGuiHeight] = reactExports.useState(void 0);
  const [manifestReady, setManifestReady] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!open) {
      setManifestReady(false);
      return;
    }
    let cancelled = false;
    gatewayFetch(manifestPath)
      .then((r2) => (r2.ok ? r2.json() : Promise.reject(new Error(`HTTP ${r2.status}`))))
      .then((manifest) => {
        if (cancelled) return;
        setGuiWidth(typeof manifest?.guiWidth === "number" ? manifest.guiWidth : void 0);
        setGuiHeight(typeof manifest?.guiHeight === "number" ? manifest.guiHeight : void 0);
      })
      .catch((err) => {
        if (cancelled) return;
        remoteToolLog.warn("gui manifest fetch/parse failed", {
          tool_id: toolId,
          manifest_path: manifestPath,
          error: err instanceof Error ? err.message : String(err),
        });
        setGuiWidth(void 0);
        setGuiHeight(void 0);
      })
      .finally(() => {
        if (!cancelled) setManifestReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, manifestPath, toolId]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        display: open ? "flex" : "none",
      }}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label={t2("a11y.closeDialog", "Close dialog")}
        className="modal-mask absolute inset-0"
        onClick={onClose}
      />
      {manifestReady && paramsReady && (
        <RemoteToolDialogShell width={guiWidth} height={guiHeight}>
          <Button$1
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-2 right-2 z-20"
            onClick={onClose}
            aria-label={t2("common.close")}
            data-action-ui-id="remote-tool-dialog.close"
          >
            <X$7 size={16} strokeWidth={1.5} />
          </Button$1>
          <div className={interactionDisabled ? "h-full pointer-events-none opacity-50" : "h-full"}>
            {open && <RemoteToolHost$1 toolUrl={toolUrl} toolId={toolId} sdk={sdk} layout="fill" />}
          </div>
          {interactionDisabled ? (
            <div
              role="status"
              className="absolute inset-x-4 bottom-4 z-20 rounded-md border border-border bg-background px-3 py-2 text-center text-xs text-muted-foreground shadow-sm"
              data-action-ui-id="remote-tool-dialog.account-blocked"
            >
              {t2("team.submission.blocked", {
                defaultValue: "账号正在切换或恢复，暂时无法提交。",
              })}
            </div>
          ) : null}
        </RemoteToolDialogShell>
      )}
    </div>
  );
}
export function shouldRefreshStatusOnResume(isActive2, lastState) {
  if (!isActive2 || lastState === void 0) return false;
  return isTerminalState(lastState) || lastState === "stopping";
}
export function runFullNetworkDiagnostics(options) {
  return getNetworkDiagnosticsMainService().runDiagnostics({
    localGatewayUrl: options?.gatewayUrl ?? getRuntimeConfig().gatewayUrl,
    localGatewayClaim: options?.gatewayUrl ? options?.workspaceClaim : void 0,
    localGatewayBinding: options?.gatewayUrl ? options?.workspaceBinding : void 0,
  });
}
export function useRetryHintActive(blockedUntilMs) {
  const [expiredUntilMs, setExpiredUntilMs] = reactExports.useState(void 0);
  reactExports.useEffect(() => {
    setExpiredUntilMs(void 0);
    if (blockedUntilMs === void 0) return;
    const remainingMs = blockedUntilMs - Date.now();
    if (remainingMs <= 0) {
      setExpiredUntilMs(blockedUntilMs);
      return;
    }
    const timer2 = setTimeout(() => setExpiredUntilMs(blockedUntilMs), remainingMs + 50);
    return () => clearTimeout(timer2);
  }, [blockedUntilMs]);
  return (
    blockedUntilMs !== void 0 && blockedUntilMs > Date.now() && expiredUntilMs !== blockedUntilMs
  );
}
Object.fromEntries(
  Object.entries(WORKSPACE_FAILURE_DIAGNOSIS_REGISTRY).map(([code2, meta2]) => [
    code2,
    {
      messageKey: meta2.message.key,
      messageDefault: meta2.message.zh,
      suggestions: meta2.suggestions.map((suggestion) => ({
        key: suggestion.key,
        defaultValue: suggestion.zh,
      })),
    },
  ]),
);
function buildWorkspaceStartupRumContext(status) {
  const evidence = status.diagnosis?.evidence;
  const meta2 = status.diagnosis?.code
    ? WORKSPACE_FAILURE_DIAGNOSIS_REGISTRY[status.diagnosis.code]
    : void 0;
  return {
    event_type: "workspace_startup_failure",
    event_name: "Workspace 启动失败",
    runtime_component: "renderer",
    failure_id: status.diagnosis?.failureId,
    diagnosis_code: status.diagnosis?.code,
    diagnosis_category: meta2?.category,
    diagnosis_severity: meta2?.severity,
    support_runbook: meta2?.runbook,
    bundle_state: status.state,
    revision: status.revision,
    error: status.error,
    has_evidence: Boolean(evidence),
    evidence_phase: evidence?.phase,
    evidence_retry_count: evidence?.retryCount,
    evidence_proxy_env_present: evidence?.proxyEnvPresent,
    evidence_runtime_dir_writable: evidence?.runtimeDirWritable,
    evidence_health_timeout_ms: evidence?.healthTimeoutMs,
    evidence_last_health_error_kind: evidence?.lastHealthErrorKind,
    evidence_stderr_signatures: evidence?.stderrSignatures.join(","),
  };
}
function buildEvidenceItems(evidence) {
  if (!evidence) return [];
  const items = [
    {
      key: "phase",
      labelKey: "bundleError.evidence.phase",
      labelDefault: "阶段",
      valueKey: `bundleError.evidence.phase.${evidence.phase}`,
      valueDefault: formatPhase(evidence.phase),
    },
  ];
  if (evidence.lastHealthErrorKind && evidence.lastHealthErrorKind !== "unknown") {
    items.push({
      key: "health",
      labelKey: "bundleError.evidence.health",
      labelDefault: "健康检查",
      valueKey: `bundleError.evidence.health.${evidence.lastHealthErrorKind}`,
      valueDefault: formatHealthError(evidence.lastHealthErrorKind),
    });
  }
  if (typeof evidence.healthTimeoutMs === "number") {
    items.push({
      key: "timeout",
      labelKey: "bundleError.evidence.timeout",
      labelDefault: "超时",
      valueDefault: formatDuration$2(evidence.healthTimeoutMs),
    });
  }
  if (evidence.proxyEnvPresent) {
    items.push({
      key: "proxy",
      labelKey: "bundleError.evidence.proxy",
      labelDefault: "代理",
      valueKey: "bundleError.evidence.proxy.present",
      valueDefault: "检测到代理环境变量",
    });
  }
  if (evidence.runtimeDirWritable === "failed") {
    items.push({
      key: "runtimeDir",
      labelKey: "bundleError.evidence.runtimeDir",
      labelDefault: "运行目录",
      valueKey: "bundleError.evidence.runtimeDir.failed",
      valueDefault: "不可写",
    });
  }
  if (evidence.stderrSignatures.length > 0) {
    items.push({
      key: "signatures",
      labelKey: "bundleError.evidence.signatures",
      labelDefault: "错误签名",
      valueDefault: evidence.stderrSignatures.map(formatSignature).join(", "),
      valueSegments: evidence.stderrSignatures.map((sig) => ({
        key: `bundleError.evidence.signature.${sig}`,
        defaultValue: formatSignature(sig),
      })),
    });
  }
  return items;
}
function formatPhase(phase) {
  switch (phase) {
    case "allocate_port":
      return "分配本地端口";
    case "gateway_start":
      return "启动 workspace 服务";
    case "opencode_start":
      return "启动本地 AI runtime";
    case "notify_gateway":
      return "绑定本地 AI runtime";
    case "runtime_crash":
      return "本地 AI runtime 崩溃";
    default:
      return phase;
  }
}
function formatHealthError(kind) {
  switch (kind) {
    case "timeout":
      return "启动超时";
    case "dns":
      return "DNS 解析异常";
    case "tls":
      return "TLS/证书异常";
    case "reset":
      return "连接被重置";
    case "refused":
      return "连接被拒绝";
    case "proxy":
      return "代理/VPN 异常";
    case "permission":
      return "权限异常";
    case "port_in_use":
      return "端口被占用";
    default:
      return kind;
  }
}
function formatSignature(signature) {
  switch (signature) {
    case "config_json_error":
      return "配置文件异常";
    case "permission_mkdir":
      return "目录权限异常";
    case "proxy":
      return "代理异常";
    case "tls_certificate":
      return "证书异常";
    case "dns":
      return "DNS 异常";
    case "timeout":
      return "超时";
    case "connection_reset":
      return "连接被重置";
    case "connection_refused":
      return "连接被拒绝";
    case "port_in_use":
      return "端口被占用";
    case "opencode_binary_missing":
      return "runtime 文件缺失";
    case "opencode_binary_blocked":
      return "runtime 被拦截";
    case "opencode_binary_corrupted":
      return "runtime 文件损坏";
    case "opencode_config_broken":
      return "runtime 配置异常";
    case "macos_version_unsupported":
      return "macOS 版本过低";
    case "windows_version_unsupported":
      return "Windows 版本不受支持";
    case "windows_version_unverified":
      return "Windows 版本未能核验";
    case "windows_cpu_unsupported":
      return "处理器不受支持";
    case "windows_runtime_dependency_failed":
      return "Windows 组件加载失败";
    case "windows_binary_incompatible":
      return "本地服务文件不兼容";
    case "windows_runtime_resource_exhausted":
      return "系统资源不足";
    case "windows_runtime_terminated":
      return "本地服务被终止";
    case "gateway_start":
      return "workspace 服务启动异常";
    case "runtime_start":
      return "runtime 启动异常";
    default:
      return signature;
  }
}
function formatDuration$2(ms) {
  if (ms >= 1e3 && ms % 1e3 === 0) return `${ms / 1e3}s`;
  return `${ms}ms`;
}
const SYSTEM_UPGRADE_REQUIRED_CODES = new Set([
  "macos_version_unsupported",
  "windows_version_unsupported",
  "windows_cpu_unsupported",
]);
const WORKSPACE_STARTUP_FAILED_RUM_ACTION = "Workspace 启动失败";
const INTERNAL_ERROR_MARKERS = [
  "gateway",
  "runtime",
  "opencode",
  "stderr",
  "stdout",
  "stack",
  "eaddr",
  "enoent",
  "econn",
  "127.0.0.1",
  "localhost",
  "http://",
  "https://",
  "error:",
];
const MAX_UPLOAD_CACHE = 50;
const AUTO_UPLOAD_PROMISES = new Map();
function setUploadPromise(failureId, promise) {
  AUTO_UPLOAD_PROMISES.set(failureId, promise);
  if (AUTO_UPLOAD_PROMISES.size > MAX_UPLOAD_CACHE) {
    const oldest = AUTO_UPLOAD_PROMISES.keys().next().value;
    if (oldest) {
      AUTO_UPLOAD_PROMISES.delete(oldest);
    }
  }
}
function isUserFacingStatusError(error) {
  const message2 = error?.trim();
  if (!message2) return false;
  const normalized = message2.toLowerCase();
  return !INTERNAL_ERROR_MARKERS.some((marker) => normalized.includes(marker.toLowerCase()));
}
function normalizeDisplayMessage(message2) {
  return message2.replace(/[。.!！\s]/g, "").toLowerCase();
}
export function BundleErrorScreen({
  status,
  retrying = false,
  autoUploadDiagnostics = true,
  diagnosticsActionsEnabled = true,
  retryCount = 0,
  maxRetries: maxRetriesProp = Number.POSITIVE_INFINITY,
  onRetry,
}) {
  const { i18n, t: t2 } = useTranslation();
  const { user } = useAuth();
  const [feedbackState, setFeedbackState] = reactExports.useState("idle");
  const [networkRecoveryState, setNetworkRecoveryState] = reactExports.useState("idle");
  const [autoUploadState, setAutoUploadState] = reactExports.useState("idle");
  const [feedbackUpload, setFeedbackUpload] = reactExports.useState();
  const [showTechnicalDetails, setShowTechnicalDetails] = reactExports.useState(false);
  const diagnosis = resolveWorkspaceFailureDiagnosis(status.diagnosis?.code, t2, i18n.language);
  const failureId = status.diagnosis?.failureId;
  const uploadDedupKey = (
    failureId ??
    `${status.workspaceId}:${status.revision}:${status.diagnosis?.code ?? status.error ?? "unknown"}`
  ).slice(0, 500);
  const evidence = status.diagnosis?.evidence;
  const retryHintActive = useRetryHintActive(status.retryAfter?.blockedUntilMs);
  const errorTitle = diagnosis?.title ?? t2("bundleError.title");
  const rawStatusError = status.error?.trim() || void 0;
  const errorMessage2 =
    diagnosis?.message ??
    (isUserFacingStatusError(rawStatusError) ? rawStatusError : t2("bundleError.fallbackMessage"));
  const retryCannotFix =
    diagnosis?.severity === "needs_reinstall" ||
    (diagnosis ? SYSTEM_UPGRADE_REQUIRED_CODES.has(diagnosis.code) : false) ||
    diagnosis?.code === "workspace_data_migration_conflict" ||
    diagnosis?.code === "workspace_index_recovery_required";
  const maxRetries = retryCannotFix ? 0 : maxRetriesProp;
  const evidenceItems = reactExports.useMemo(() => buildEvidenceItems(evidence), [evidence]);
  const userIdLabel = t2("bundleError.userId", {
    defaultValue: "用户 ID",
  });
  const userIdUnavailableLabel = t2("bundleError.userIdUnavailable", {
    defaultValue: "未获取",
  });
  const userId = user?.userID?.trim() || void 0;
  const userIdDisplayValue = userId ?? userIdUnavailableLabel;
  const feedbackCodeLabel = t2("bundleError.feedbackCode", {
    defaultValue: "反馈码",
  });
  const diagnosisCodeLabel = t2("bundleError.copy.diagnosisCode", {
    defaultValue: "诊断类型",
  });
  const feedbackUploadLabel = t2("bundleError.feedbackUpload.label", {
    defaultValue: "上传日志并复制反馈信息",
  });
  const feedbackButtonLabel = feedbackUpload?.success
    ? t2("bundleError.feedbackCopy.label", {
        defaultValue: "复制反馈信息",
      })
    : feedbackUploadLabel;
  const sceneTitle = t2("bundleError.title", {
    defaultValue: "Workspace 启动失败",
  });
  const mainTitle = diagnosis?.title ?? errorTitle;
  const shouldShowErrorMessage =
    normalizeDisplayMessage(errorMessage2) !== normalizeDisplayMessage(mainTitle);
  const supportStatusText =
    autoUploadState === "uploading"
      ? t2("bundleError.supportHint.uploading", {
          defaultValue: "正在自动上传诊断日志；截图里请保留用户 ID 和反馈码。",
        })
      : feedbackUpload?.success
        ? t2("bundleError.supportHint.uploaded", {
            defaultValue: "日志已自动上传，支持可通过用户 ID + 反馈码或日志定位路径定位本次失败。",
          })
        : autoUploadState === "error"
          ? t2("bundleError.supportHint.uploadFailed", {
              defaultValue:
                "自动上传失败，可点击上传日志并复制反馈信息重试；截图请保留用户 ID + 反馈码。",
            })
          : t2("bundleError.supportHint.beforeUpload", {
              defaultValue: "正在准备诊断信息；截图里请保留用户 ID 和反馈码，便于支持定位。",
            });
  const retryButtonLabel =
    retryCount >= maxRetries
      ? diagnosis && SYSTEM_UPGRADE_REQUIRED_CODES.has(diagnosis.code)
        ? diagnosis.primaryAction
        : diagnosis?.severity === "needs_reinstall"
          ? t2("bundleError.retryExhausted.reinstall", {
              defaultValue: "请重新安装后再试",
            })
          : t2("bundleError.retryExhausted.restart", {
              defaultValue: "请完全退出应用后重新打开",
            })
      : diagnosis?.code === "opencode_port_conflict"
        ? diagnosis.primaryAction
        : t2("bundleError.retryWorkspace", {
            defaultValue: "重新启动 workspace",
          });
  const solutionSummary =
    diagnosis?.code === "opencode_port_conflict" && onRetry
      ? t2("bundleError.solution.opencodePortConflict", {
          defaultValue: "点击下方按钮，系统会自动尝试换端口重新启动。",
        })
      : (diagnosis?.primaryAction ??
        t2("bundleError.solutionFallback", {
          defaultValue: "请先重试一次。",
        }));
  const diagnosticContext = reactExports.useMemo(
    () => buildWorkspaceStartupRumContext(status),
    [status],
  );
  const reportedStartupFailureRef = reactExports.useRef(null);
  const showsNetworkRecovery = diagnosis?.category === "network";
  const recordUploadComplete = reactExports.useCallback(
    (uploadContext, source) => {
      setFeedbackUpload(uploadContext);
      reportRumAction(
        source === "auto"
          ? "Workspace 启动失败-自动上传日志完成"
          : "Workspace 启动失败-反馈上传完成",
        {
          ...diagnosticContext,
          log_upload_source: source,
          log_upload_success: uploadContext.success,
          log_upload_path: uploadContext.uploadPath,
          log_upload_locator: uploadContext.locator,
          log_upload_retriable: uploadContext.retriable,
          log_upload_error: uploadContext.error,
        },
      );
    },
    [diagnosticContext],
  );
  reactExports.useEffect(() => {
    if (status.state !== "failed") return;
    const reportKey = `${status.diagnosis?.failureId ?? "unknown"}:${status.diagnosis?.code ?? "unknown"}`;
    if (reportedStartupFailureRef.current === reportKey) return;
    reportedStartupFailureRef.current = reportKey;
    reportRumError(
      new Error(`Workspace 启动失败：${status.diagnosis?.code ?? "unknown"}`),
      diagnosticContext,
    );
    reportRumAction(WORKSPACE_STARTUP_FAILED_RUM_ACTION, diagnosticContext);
  }, [diagnosticContext, status.diagnosis?.code, status.diagnosis?.failureId, status.state]);
  reactExports.useEffect(() => {
    if (!autoUploadDiagnostics || status.state !== "failed") return;
    const existing = AUTO_UPLOAD_PROMISES.get(uploadDedupKey);
    if (existing) {
      let cancelled2 = false;
      setAutoUploadState("uploading");
      void existing.then((ctx) => {
        if (cancelled2) return;
        setAutoUploadState(ctx.success ? "done" : "error");
        setFeedbackUpload(ctx);
      });
      return () => {
        cancelled2 = true;
      };
    }
    let cancelled = false;
    setAutoUploadState("uploading");
    reportRumAction("Workspace 启动失败-自动上传日志开始", diagnosticContext);
    const uploadPromise = (async () => {
      try {
        await window.hilo?.diagnostics?.addBreadcrumb?.(
          "lifecycle",
          "workspace-startup: auto upload diagnostics package",
          diagnosticContext,
        );
        const result = await window.hilo?.diagnostics?.uploadLogs?.(
          "workspace_startup_failure",
          diagnosticContext,
        );
        const uploadContext = result
          ? {
              success: result.success,
              retriable: result.retriable,
              uploadPath: result.uploadPath,
              locator: result.locator,
              error: result.error,
            }
          : {
              success: false,
              error: "diagnostics upload bridge unavailable",
            };
        if (!uploadContext.success) {
          AUTO_UPLOAD_PROMISES.delete(uploadDedupKey);
        }
        if (!cancelled) {
          setAutoUploadState(uploadContext.success ? "done" : "error");
          recordUploadComplete(uploadContext, "auto");
        }
        return uploadContext;
      } catch (err) {
        const uploadContext = {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
        AUTO_UPLOAD_PROMISES.delete(uploadDedupKey);
        if (!cancelled) {
          setAutoUploadState("error");
          recordUploadComplete(uploadContext, "auto");
        }
        return uploadContext;
      }
    })();
    setUploadPromise(uploadDedupKey, uploadPromise);
    return () => {
      cancelled = true;
    };
  }, [
    autoUploadDiagnostics,
    diagnosticContext,
    recordUploadComplete,
    status.state,
    uploadDedupKey,
  ]);
  const handleFeedbackCopy = async () => {
    if (!diagnosticsActionsEnabled) return;
    if (feedbackState === "loading") return;
    setFeedbackState("loading");
    try {
      let upload = feedbackUpload;
      if (!upload?.success) {
        const inflight = AUTO_UPLOAD_PROMISES.get(uploadDedupKey);
        if (inflight) {
          upload = await inflight;
        } else {
          reportRumAction("Workspace 启动失败-反馈上传开始", diagnosticContext);
          const result = await window.hilo?.diagnostics?.uploadLogs?.(
            "workspace_startup_failure",
            diagnosticContext,
          );
          upload = result
            ? {
                success: result.success,
                retriable: result.retriable,
                uploadPath: result.uploadPath,
                locator: result.locator,
                error: result.error,
              }
            : {
                success: false,
                error: "diagnostics upload bridge unavailable",
              };
          recordUploadComplete(upload, "feedback");
          setAutoUploadState(upload.success ? "done" : "error");
          if (upload.success) {
            setUploadPromise(uploadDedupKey, Promise.resolve(upload));
          }
        }
      }
      const locatorLine = upload.locator
        ? `${t2("bundleError.supportHint.locator", {
            defaultValue: "日志定位",
          })}: ${upload.locator}`
        : void 0;
      const guideLine = upload.success
        ? `${t2("bundleError.feedbackCopy.guide", {
            defaultValue: "定位说明",
          })}: ${t2("bundleError.feedbackCopy.guideText", {
            defaultValue: "日志已上传，可按用户 ID + 反馈码或日志定位路径查找。",
          })}`
        : void 0;
      const text2 = [
        `${userIdLabel}: ${userIdDisplayValue}`,
        `${feedbackCodeLabel}: ${failureId ?? "N/A"}`,
        `${diagnosisCodeLabel}: ${status.diagnosis?.code ?? "unknown"}`,
        locatorLine,
        guideLine,
      ]
        .filter(Boolean)
        .join("\n");
      await navigator.clipboard.writeText(text2);
      dedupedToast.success(t2("common.copied"));
    } catch {
      dedupedToast.error(t2("common.copyFailed"));
    } finally {
      setFeedbackState("idle");
    }
  };
  const handleNetworkDiagnosticsCheck = async () => {
    if (!diagnosticsActionsEnabled || networkRecoveryState !== "idle") return;
    setNetworkRecoveryState("checking");
    try {
      await runFullNetworkDiagnostics();
      reportRumAction("Workspace 启动失败-网络重新检测完成", diagnosticContext);
      dedupedToast.success(
        t2("bundleError.networkRecovery.checkSuccess", {
          defaultValue: "网络检测已刷新",
        }),
      );
    } catch {
      dedupedToast.error(
        t2("bundleError.networkRecovery.checkFailed", {
          defaultValue: "网络检测失败，请导出日志联系支持。",
        }),
      );
    } finally {
      setNetworkRecoveryState("idle");
    }
  };
  const handleProxyModeRetry = async (mode2) => {
    if (!diagnosticsActionsEnabled || networkRecoveryState !== "idle") return;
    setNetworkRecoveryState(mode2);
    try {
      const result = await getNetworkDiagnosticsMainService().setProxyMode(mode2);
      if (!result.success) {
        throw new Error(`set proxy mode failed: ${result.mode}`);
      }
      reportRumAction("Workspace 启动失败-切换网络模式并重试", {
        ...diagnosticContext,
        network_proxy_mode: mode2,
      });
      try {
        await runFullNetworkDiagnostics();
      } catch {}
      await onRetry?.();
    } catch {
      dedupedToast.error(
        t2("bundleError.networkRecovery.proxySwitchFailed", {
          defaultValue: "网络模式切换失败，请重新检测或导出日志联系支持。",
        }),
      );
    } finally {
      setNetworkRecoveryState("idle");
    }
  };
  return (
    <div className="flex h-full w-full items-center justify-center bg-background px-6 py-8">
      <section className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="px-6 pb-5 pt-6">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive ring-1 ring-destructive/20">
              <AlertTriangle className="size-5" strokeWidth={1.25} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {sceneTitle}
              </p>
              <h2 className="mt-1 text-xl font-semibold leading-7 text-foreground">{mainTitle}</h2>
              {shouldShowErrorMessage ? (
                <p className="mt-1 text-sm leading-5 text-muted-foreground break-words">
                  {errorMessage2}
                </p>
              ) : null}
              <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-xs leading-5 text-muted-foreground">
                {t2("bundleError.impactMessage", {
                  defaultValue: "当前 workspace 内容已保留，只是本地 AI 服务暂时不可用。",
                })}
              </p>
            </div>
          </div>
        </div>
        <div className="mx-6 rounded-lg bg-muted/30 px-4 py-4">
          <p className="text-sm font-medium text-foreground">
            {t2("bundleError.solutionTitle", {
              defaultValue: "怎么解决",
            })}
          </p>
          <p className="mt-1 text-sm leading-5 text-foreground">{solutionSummary}</p>
          {diagnosis?.suggestions.length ? (
            <ol className="mt-3 space-y-2">
              {diagnosis.suggestions.map((suggestion, index2) => (
                <li key={suggestion} className="flex gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[11px] font-medium text-foreground">
                    {index2 + 1}
                  </span>
                  <span className="min-w-0 leading-5">{suggestion}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm leading-5 text-muted-foreground">
              {t2("bundleError.solutionGenericSuggestion", {
                defaultValue: "如果重试后仍失败，请上传日志并把反馈信息发给支持团队。",
              })}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {onRetry &&
            diagnosis?.code !== "workspace_data_migration_conflict" &&
            diagnosis?.code !== "workspace_index_recovery_required" ? (
              <Button$1
                loading={retrying}
                disabled={retryCount >= maxRetries}
                onClick={onRetry}
                data-action-ui-id="bundle-error.retry"
              >
                <RetryIcon />
                {retryButtonLabel}
              </Button$1>
            ) : null}
            <Button$1
              variant="outline"
              loading={feedbackState === "loading"}
              disabled={!diagnosticsActionsEnabled}
              onClick={() => void handleFeedbackCopy()}
              data-action-ui-id="feedback-button"
            >
              <Upload />
              {feedbackButtonLabel}
            </Button$1>
          </div>
        </div>
        <div className="mx-6 mt-3 rounded-lg px-4 py-3 ring-1 ring-border/60">
          <div className="flex items-start gap-2.5">
            <Info$1 className="mt-0.5 size-4 shrink-0 text-foreground opacity-50" strokeWidth={1} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground">
                {t2("bundleError.supportCardTitle", {
                  defaultValue: "反馈与日志",
                })}
              </p>
              <dl
                className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 rounded-md bg-muted/40 px-3 py-2 text-xs leading-5"
                data-action-ui-id="bundle-error.support-identifiers"
              >
                <dt className="text-muted-foreground">{userIdLabel}</dt>
                <dd
                  className="min-w-0 break-all font-mono text-foreground/70"
                  title={userIdDisplayValue}
                >
                  {userIdDisplayValue}
                </dd>
                {failureId ? (
                  <>
                    <dt className="text-muted-foreground">{feedbackCodeLabel}</dt>
                    <dd
                      className="min-w-0 break-all font-mono text-foreground/70"
                      title={failureId}
                    >
                      {failureId}
                    </dd>
                  </>
                ) : null}
              </dl>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{supportStatusText}</p>
            </div>
          </div>
        </div>
        {showsNetworkRecovery ? (
          <div className="mx-6 mt-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-left">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground ring-1 ring-border">
                <RetryIcon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {t2("bundleError.networkRecovery.title", {
                    defaultValue: "网络恢复操作",
                  })}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {t2("bundleError.networkRecovery.description", {
                    defaultValue:
                      "如果你正在使用 VPN、企业代理或本机代理，可以切换连接模式后重试；当前 Workspace 状态会保留。",
                  })}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button$1
                    variant="secondary"
                    size="sm"
                    loading={networkRecoveryState === "system"}
                    disabled={!diagnosticsActionsEnabled || networkRecoveryState !== "idle"}
                    onClick={() => void handleProxyModeRetry("system")}
                    data-action-ui-id="bundle-error.network.system-proxy-retry"
                  >
                    {t2("bundleError.networkRecovery.systemRetry", {
                      defaultValue: "切到系统代理并重试",
                    })}
                  </Button$1>
                  <Button$1
                    variant="outline"
                    size="sm"
                    loading={networkRecoveryState === "direct"}
                    disabled={!diagnosticsActionsEnabled || networkRecoveryState !== "idle"}
                    onClick={() => void handleProxyModeRetry("direct")}
                    data-action-ui-id="bundle-error.network.direct-retry"
                  >
                    {t2("bundleError.networkRecovery.directRetry", {
                      defaultValue: "切到直连并重试",
                    })}
                  </Button$1>
                  <Button$1
                    variant="ghost"
                    size="sm"
                    loading={networkRecoveryState === "checking"}
                    disabled={!diagnosticsActionsEnabled || networkRecoveryState !== "idle"}
                    onClick={() => void handleNetworkDiagnosticsCheck()}
                    data-action-ui-id="bundle-error.network.recheck"
                  >
                    {t2("bundleError.networkRecovery.recheck", {
                      defaultValue: "重新检测网络",
                    })}
                  </Button$1>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {retryHintActive ? (
          <p className="mx-6 mt-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {t2("bundleError.retryHint", {
              defaultValue:
                "本地 runtime 正在恢复保护期内，重试若仍失败会保持当前 workspace 状态。",
            })}
          </p>
        ) : null}
        <div className="mt-4 border-t border-border px-4 py-3">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            onClick={() => setShowTechnicalDetails((visible) => !visible)}
            data-action-ui-id="bundle-error.toggle-technical-details"
          >
            {showTechnicalDetails
              ? t2("bundleError.technicalDetails.hide", {
                  defaultValue: "收起诊断信息",
                })
              : t2("bundleError.technicalDetails.show", {
                  defaultValue: "给支持团队的诊断信息",
                })}
            <ChevronDown
              className={`size-4 transition-transform ${showTechnicalDetails ? "rotate-180" : ""}`}
              strokeWidth={1.25}
            />
          </button>
          {showTechnicalDetails ? (
            <section
              className="mx-2 mt-2 max-h-48 overflow-y-auto rounded-lg border border-border bg-muted/30 px-4 py-3 text-left"
              aria-label={t2("bundleError.technicalDetails.region", {
                defaultValue: "支持团队诊断信息",
              })}
            >
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs">
                <dt className="text-muted-foreground">{diagnosisCodeLabel}</dt>
                <dd className="min-w-0 break-all font-mono text-foreground">
                  {status.diagnosis?.code ?? "unknown"}
                </dd>
                {rawStatusError ? (
                  <>
                    <dt className="text-muted-foreground">
                      {t2("bundleError.copy.error", {
                        defaultValue: "错误信息",
                      })}
                    </dt>
                    <dd className="min-w-0 break-words font-mono text-foreground">
                      {rawStatusError}
                    </dd>
                  </>
                ) : null}
                <dt className="text-muted-foreground">{t2("bundleError.copy.state")}</dt>
                <dd className="min-w-0 break-all font-mono text-foreground">{status.state}</dd>
                <dt className="text-muted-foreground">{userIdLabel}</dt>
                <dd className="min-w-0 break-all font-mono text-foreground">
                  {userIdDisplayValue}
                </dd>
                <dt className="text-muted-foreground">{feedbackCodeLabel}</dt>
                <dd className="min-w-0 break-all font-mono text-foreground">
                  {failureId ?? "N/A"}
                </dd>
                {feedbackUpload?.locator ? (
                  <>
                    <dt className="text-muted-foreground">
                      {t2("bundleError.supportHint.locator", {
                        defaultValue: "日志定位",
                      })}
                    </dt>
                    <dd className="min-w-0 break-all font-mono text-foreground">
                      {feedbackUpload.locator}
                    </dd>
                  </>
                ) : null}
                {evidenceItems.map((item) => (
                  <div key={item.key} className="contents">
                    <dt className="text-muted-foreground">
                      {t2(item.labelKey, {
                        defaultValue: item.labelDefault,
                      })}
                    </dt>
                    <dd className="min-w-0 break-words text-foreground">
                      {item.valueSegments
                        ? item.valueSegments
                            .map((seg) =>
                              t2(seg.key, {
                                defaultValue: seg.defaultValue,
                              }),
                            )
                            .join(", ")
                        : item.valueKey
                          ? t2(item.valueKey, {
                              defaultValue: item.valueDefault,
                            })
                          : item.valueDefault}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}
