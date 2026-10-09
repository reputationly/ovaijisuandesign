// submit-feedback.js
import { API_PATHS, getRuntimeConfig, instance } from "../vendor.js";
import { FEEDBACK_CONSTRAINTS } from "../generation/normalize-skill-detail-metadata.js";
import { getLastGatewayTraceId, recordAction } from "./gateway-http-error.jsx";
import { gatewayFetch } from "./gateway-fetch.js";
import { getPlatform } from "./web-storage.js";

async function readUserId() {
  try {
    const bridge = window.__HILO_AUTH__;
    if (!bridge?.getStoredAuth) return "unknown";
    const stored = await bridge.getStoredAuth();
    return stored?.user?.userID || "unknown";
  } catch {
    return "unknown";
  }
}

function readWorkspaceId() {
  try {
    return new URLSearchParams(window.location.search).get("workspaceId") ?? "";
  } catch {
    return "";
  }
}

async function tryUploadLogs(reason, feedbackContext) {
  try {
    const result = await window.hilo?.diagnostics?.uploadLogs?.(
      reason,
      feedbackContext,
    );
    return {
      uploaded: Boolean(result?.success),
      url: result?.url,
    };
  } catch {
    return {
      uploaded: false,
    };
  }
}

async function tryFetchOpenCodeSessionExport(
  workspaceDir,
  runtimeSessionId,
  fetchFeedback,
) {
  try {
    const res = await fetchFeedback("/api/projects/archive/export", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        dir: workspaceDir,
        sessionId: runtimeSessionId,
      }),
      // The export reads SQLite directly and serialises in-process; even a
      // session with deep tool-call history finishes in well under a second.
      // Cap generously so a momentarily-slow gateway doesn't stall ticket
      // submission, but keep tighter than the 30 s feedback budget.
      timeoutMs: 1e4,
    });
    if (!res.ok) {
      if (false);
      return void 0;
    }
    const body2 = await res.json();
    if (
      typeof body2 !== "object" ||
      body2 === null ||
      !("payload" in body2) ||
      body2.payload == null
    )
      return void 0;
    return JSON.stringify(body2.payload);
  } catch (err) {
    return void 0;
  }
}

async function uploadFileToGateway(file, fetchFeedback) {
  if (file.size > FEEDBACK_CONSTRAINTS.ATTACHMENT_MAX_BYTES) {
    throw new Error(
      `File "${file.name}" exceeds ${FEEDBACK_CONSTRAINTS.ATTACHMENT_MAX_BYTES} bytes`,
    );
  }
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetchFeedback(API_PATHS.feedbackUploadAttachment, {
    method: "POST",
    body: formData,
    timeoutMs: 3e4,
  });
  return await res.json();
}

export async function submitFeedback(input, options = {}) {
  const assertIdentity = async () => {
    if (options.isCurrentIdentity && !(await options.isCurrentIdentity())) {
      throw new Error("Feedback account changed");
    }
  };
  const withIdentity = (fetch2) => async (path2, init2) => {
    await assertIdentity();
    return fetch2(path2, init2);
  };
  const fetchFeedback = withIdentity(options.fetch ?? gatewayFetch);
  const fetchSession = options.exportFetch
    ? withIdentity(options.exportFetch)
    : fetchFeedback;
  await assertIdentity();
  recordAction("feedback:submit", {
    source: input.source,
  });
  const platform2 = getPlatform();
  const config2 = getRuntimeConfig();
  const reason = input.logUploadReason ?? `user_feedback:${input.source}`;
  const isFeatureRequest = input.category === "feature_request";
  await readUserId();
  const workspaceId2 = input.workspaceId ?? readWorkspaceId();
  const attachmentUrls = input.files?.length
    ? await Promise.all(
        input.files
          .slice(0, FEEDBACK_CONSTRAINTS.ATTACHMENT_MAX_COUNT)
          .map((file) => uploadFileToGateway(file, fetchFeedback)),
      )
    : [];
  let logResult = {
    uploaded: false,
  };
  if (!isFeatureRequest) {
    const feedbackContext = {};
    if (attachmentUrls.length > 0) {
      feedbackContext.attachments_json = JSON.stringify(attachmentUrls);
    }
    if (input.runtimeSessionId && input.workspaceDir) {
      const sessionJson = await tryFetchOpenCodeSessionExport(
        input.workspaceDir,
        input.runtimeSessionId,
        fetchSession,
      );
      if (sessionJson) {
        feedbackContext.opencode_session_json = sessionJson;
      }
    }
    if (input.context) {
      feedbackContext.context_json = JSON.stringify(
        input.contextType === "chat_feedback"
          ? {
              ...input.context,
              session_archive_entry: feedbackContext.opencode_session_json
                ? "opencode-session.json"
                : null,
            }
          : input.context,
      );
    }
    await assertIdentity();
    logResult = await tryUploadLogs(reason, feedbackContext);
  }
  const auto_log_uploaded = logResult.uploaded;
  const clientRequestId = getLastGatewayTraceId() ?? void 0;
  const isCanvasNodeError =
    input.source === "context" && input.contextType === "canvas_node_error";
  const requiresModelTrace =
    isCanvasNodeError || input.contextType === "chat_feedback";
  const resolvedTraceId = isFeatureRequest
    ? void 0
    : (input.traceId ?? (requiresModelTrace ? void 0 : clientRequestId));
  const payload = {
    source: input.source,
    // Only feature requests carry type/module — bug-mode payload stays
    // byte-identical to the pre-feature-request contract (spec decision).
    type: isFeatureRequest ? input.category : void 0,
    module: isFeatureRequest ? input.module : void 0,
    context_type: input.contextType,
    context: input.context,
    description: input.description.trim(),
    attachmentUrls: attachmentUrls.length > 0 ? attachmentUrls : void 0,
    idempotencyKey: input.idempotencyKey ?? crypto.randomUUID(),
    metadata: {
      app_version: config2?.appVersion ?? "unknown",
      build_channel: config2?.channel ?? "unknown",
      os: platform2?.app?.os ?? "unknown",
      workspace_id: isFeatureRequest ? "" : workspaceId2,
      region: config2?.region ?? "domestic",
      locale: input.locale ?? (instance.language || "en"),
      current_route: isFeatureRequest ? void 0 : input.currentRoute,
      trace_id: resolvedTraceId,
      ...(clientRequestId
        ? {
            client_request_id: clientRequestId,
          }
        : {}),
      auto_log_uploaded,
    },
  };
  const requestBody = {
    idempotency_key: payload.idempotencyKey,
    source: payload.source,
    description: payload.description,
    workspace_id: payload.metadata.workspace_id,
    region: payload.metadata.region,
    app_version: payload.metadata.app_version,
    build_channel: payload.metadata.build_channel,
    os: payload.metadata.os,
    current_route: payload.metadata.current_route,
    trace_id: payload.metadata.trace_id,
    ...(payload.metadata.client_request_id
      ? {
          client_request_id: payload.metadata.client_request_id,
        }
      : {}),
    context_type: payload.context_type ?? "",
    locale: payload.metadata.locale,
    auto_log_uploaded: payload.metadata.auto_log_uploaded ?? false,
    detail_url: logResult.url ?? "",
  };
  if (payload.type) {
    requestBody.type = payload.type;
  }
  if (payload.module) {
    requestBody.module = payload.module;
  }
  if (isFeatureRequest && attachmentUrls.length > 0) {
    requestBody.attachments = attachmentUrls;
  }
  const res = await fetchFeedback(API_PATHS.feedback, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(requestBody),
    // Generous budget: the gateway forwards to the central API, which can
    // be slow on a flaky network. Submitting feedback should not abort
    // halfway and leave the user wondering whether it landed.
    timeoutMs: 3e4,
  });
  if (!res.ok) throw new Error(`Feedback submission failed (${res.status})`);
  const saved = await res.json();
  if (
    typeof saved !== "object" ||
    saved === null ||
    !("ticket_id" in saved) ||
    typeof saved.ticket_id !== "string" ||
    !saved.ticket_id
  )
    throw new Error("Invalid feedback acknowledgement");
  return {
    ticket_id: saved.ticket_id,
  };
}
