// log-error-boundary.js
import { reportRumError } from "../i18n/init-rum.js";
import { loggedErrorBoundaryDiagnostics } from "./logged-error-boundary-diagnostics.js";

const ERROR_BOUNDARY_AUTO_UPLOAD_REASON = "error_boundary";

const ERROR_BOUNDARY_AUTO_UPLOAD_COOLDOWN_MS = 15 * 60 * 1e3;

const ERROR_BOUNDARY_UPLOAD_STORAGE_KEY = "hilo:last-error-boundary-upload";

const MAX_ERROR_BOUNDARY_DIAGNOSTIC_LENGTH = 4e3;

const MAX_ERROR_BOUNDARY_BREADCRUMB_MESSAGE_LENGTH = 300;

function sanitizeDiagnosticText(
  value,
  maxLength = MAX_ERROR_BOUNDARY_DIAGNOSTIC_LENGTH,
) {
  return value
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
    .replace(
      /(token|password|secret|authorization|cookie|credential|api.?key)(\s*[:=]\s*)[^\s,;]+/gi,
      "$1$2[REDACTED]",
    )
    .slice(0, maxLength);
}

function createErrorBoundaryFailureId() {
  const bytes2 = new Uint8Array(4);
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    crypto.getRandomValues(bytes2);
  } else {
    const fallback =
      (Date.now() ^ Math.floor(Math.random() * 4294967295)) >>> 0;
    bytes2[0] = (fallback >>> 24) & 255;
    bytes2[1] = (fallback >>> 16) & 255;
    bytes2[2] = (fallback >>> 8) & 255;
    bytes2[3] = fallback & 255;
  }
  const hex2 = Array.from(bytes2, (b3) =>
    b3.toString(16).padStart(2, "0"),
  ).join("");
  return `EB-${hex2.toUpperCase()}`;
}

function buildErrorBoundaryDiagnostic(error, componentStack) {
  const diagnostic = {
    message: sanitizeDiagnosticText(error.message),
    visibilityState: document.visibilityState,
    online: navigator.onLine,
    timestamp: new Date().toISOString(),
    failureId: createErrorBoundaryFailureId(),
  };
  if (error.stack) {
    diagnostic.stack = sanitizeDiagnosticText(error.stack);
  }
  if (componentStack) {
    diagnostic.componentStack = sanitizeDiagnosticText(componentStack);
  }
  return diagnostic;
}

function getErrorBoundaryUploadKey(diagnostic) {
  return `${diagnostic.message}:${diagnostic.componentStack ?? ""}`.slice(
    0,
    1e3,
  );
}

function readErrorBoundaryUploadMarker() {
  try {
    const raw2 = localStorage.getItem(ERROR_BOUNDARY_UPLOAD_STORAGE_KEY);
    if (!raw2) return null;
    const parsed = JSON.parse(raw2);
    if (typeof parsed.at !== "number" || typeof parsed.key !== "string")
      return null;
    return {
      at: parsed.at,
      key: parsed.key,
    };
  } catch {
    return null;
  }
}

function writeErrorBoundaryUploadMarker(marker) {
  try {
    localStorage.setItem(
      ERROR_BOUNDARY_UPLOAD_STORAGE_KEY,
      JSON.stringify(marker),
    );
  } catch {}
}

let lastErrorBoundaryAutoUploadAt = 0;

function shouldAutoUploadErrorBoundaryLogs(diagnostic) {
  const now2 = Date.now();
  if (
    now2 - lastErrorBoundaryAutoUploadAt <
    ERROR_BOUNDARY_AUTO_UPLOAD_COOLDOWN_MS
  ) {
    return false;
  }
  const marker = readErrorBoundaryUploadMarker();
  if (marker && now2 - marker.at < ERROR_BOUNDARY_AUTO_UPLOAD_COOLDOWN_MS) {
    return false;
  }
  lastErrorBoundaryAutoUploadAt = now2;
  writeErrorBoundaryUploadMarker({
    at: now2,
    key: getErrorBoundaryUploadKey(diagnostic),
  });
  return true;
}

function recordErrorBoundaryBreadcrumb(diagnostic) {
  try {
    void window.hilo?.diagnostics
      ?.addBreadcrumb?.("error", "error_boundary:caught", {
        message: diagnostic.message.slice(
          0,
          MAX_ERROR_BOUNDARY_BREADCRUMB_MESSAGE_LENGTH,
        ),
        failure_id: diagnostic.failureId,
        has_stack: Boolean(diagnostic.stack),
        has_component_stack: Boolean(diagnostic.componentStack),
        visibility_state: diagnostic.visibilityState,
        online: diagnostic.online,
      })
      ?.catch(() => {});
  } catch {}
}

function autoUploadErrorBoundaryLogs(diagnostic) {
  const uploadLogs = window.hilo?.diagnostics?.uploadLogs;
  if (!uploadLogs || !shouldAutoUploadErrorBoundaryLogs(diagnostic)) return;
  try {
    void uploadLogs(ERROR_BOUNDARY_AUTO_UPLOAD_REASON, {
      context_json: JSON.stringify({
        type: "error_boundary",
        failure_id: diagnostic.failureId,
        message: diagnostic.message,
        stack: diagnostic.stack,
        component_stack: diagnostic.componentStack,
        visibility_state: diagnostic.visibilityState,
        online: diagnostic.online,
        timestamp: diagnostic.timestamp,
      }),
    }).catch(() => {});
  } catch {}
}

function reportErrorBoundaryRum(error, diagnostic) {
  try {
    reportRumError(error, {
      source: "error_boundary",
      failure_id: diagnostic.failureId,
      visibility_state: diagnostic.visibilityState,
      online: diagnostic.online,
      has_component_stack: Boolean(diagnostic.componentStack),
    });
  } catch {}
}

export function logErrorBoundary(error, componentStack) {
  const diagnostic = buildErrorBoundaryDiagnostic(error, componentStack);
  const loggedDiagnostic = {
    failureId: diagnostic.failureId,
    timestamp: diagnostic.timestamp,
  };
  const logMessage = `[ErrorBoundary] ${diagnostic.message}
  failure=${diagnostic.failureId} visibility=${diagnostic.visibilityState} online=${diagnostic.online}
${diagnostic.componentStack ?? "(unavailable)"}`;
  console.error(logMessage);
  try {
    window.hilo?.logger?.error(logMessage);
  } catch {}
  try {
    localStorage.setItem(
      "hilo:last-error-boundary",
      JSON.stringify(diagnostic),
    );
  } catch {}
  recordErrorBoundaryBreadcrumb(diagnostic);
  reportErrorBoundaryRum(error, diagnostic);
  autoUploadErrorBoundaryLogs(diagnostic);
  loggedErrorBoundaryDiagnostics.set(error, loggedDiagnostic);
  return loggedDiagnostic;
}
