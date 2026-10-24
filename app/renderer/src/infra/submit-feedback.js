// submit-feedback.js
import instance from "i18next";
import { API_PATHS } from "./workspace-gateway.js";
import { getRuntimeConfig } from "./runtime-config.js";
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
  const withIdentity = (baseFetch) => async (path, init) => {
    await assertIdentity();
    return baseFetch(path, init);
  };
  const fetchFeedback = withIdentity(options.fetch ?? gatewayFetch);
  await assertIdentity();
  recordAction("feedback:submit", {
    source: input.source,
  });
  const platform = getPlatform();
  const config = getRuntimeConfig();
  const isFeatureRequest = input.category === "feature_request";
  await readUserId();
  const workspaceId = input.workspaceId ?? readWorkspaceId();
  const attachmentUrls = input.files?.length
    ? await Promise.all(
        input.files
          .slice(0, FEEDBACK_CONSTRAINTS.ATTACHMENT_MAX_COUNT)
          .map((file) => uploadFileToGateway(file, fetchFeedback)),
      )
    : [];
  // 没有日志上传服务（ov-changes #11）：固定按"未附带日志"上报，gateway 契约不变。
  const auto_log_uploaded = false;
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
      app_version: config?.appVersion ?? "unknown",
      build_channel: config?.channel ?? "unknown",
      os: platform?.app?.os ?? "unknown",
      workspace_id: isFeatureRequest ? "" : workspaceId,
      region: config?.region ?? "domestic",
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
    detail_url: "",
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
