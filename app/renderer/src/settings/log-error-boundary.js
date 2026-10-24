// log-error-boundary.js
import { reportRumError } from "../i18n/init-rum.js";
import { loggedErrorBoundaryDiagnostics } from "./logged-error-boundary-diagnostics.js";

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
  const bytes = new Uint8Array(4);
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    crypto.getRandomValues(bytes);
  } else {
    const fallback =
      (Date.now() ^ Math.floor(Math.random() * 4294967295)) >>> 0;
    bytes[0] = (fallback >>> 24) & 255;
    bytes[1] = (fallback >>> 16) & 255;
    bytes[2] = (fallback >>> 8) & 255;
    bytes[3] = fallback & 255;
  }
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `EB-${hex.toUpperCase()}`;
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
  loggedErrorBoundaryDiagnostics.set(error, loggedDiagnostic);
  return loggedDiagnostic;
}
