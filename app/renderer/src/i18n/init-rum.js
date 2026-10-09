// init-rum.js
import {
  MAX_PENDING_RUM_EVENTS,
  pendingRumEvents,
  sanitizeRumContext,
  sanitizeRumMessage,
  toSafeRumError,
} from "../vendor-inline/vscode-base/linked-list.js";
import { isElectron } from "../infra/use-canvas-node-assets-store.js";

const RUM_SITE = "https://rum-openway.guance.com";

const RUM_APPS = {
  desktop: {
    applicationId: "hilo_hub_desktop",
    clientToken: "9804b44fb56c4acabbe22f70e7f14ff8",
    service: "hilo-hub-desktop",
  },
  web: {
    applicationId: "hilo_hub_web",
    clientToken: "0e7f11cd79314ac896bfd7cd9f367286",
    service: "hilo-hub-web",
  },
};

const RUM_CANARY_EVENT = "hub_rum_canary";

function mapEnv(env2, channel) {
  if (channel === "dev" || env2 === "development") return "development";
  if (channel === "test" || env2 === "test") return "test";
  if (channel === "staging" || env2 === "staging") return "staging";
  return "production";
}

function formatRumError(err) {
  return sanitizeRumMessage(err instanceof Error ? err.message : String(err));
}

function logRumCanaryProbeId(probeId) {
  const line = `[rum] canary probe_id=${probeId}`;
  console.info(line);
  const bridge = typeof window !== "undefined" ? window.hilo : void 0;
  const infoPromise = bridge?.logger?.info?.(line, "performance");
  void infoPromise?.catch(() => {});
}

function mintRumCanaryProbeId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `probe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function toRumInitStatusRecord(props) {
  return {
    ...props,
  };
}

let initialized = false;

let rumApi = null;

let rumStatus = {
  state: "idle",
  initialized: false,
  deliveryState: "idle",
  pendingEventCount: 0,
  droppedEventCount: 0,
};

let droppedRumEventCount = 0;

let canarySent = false;

export function initRum(config2) {
  if (initialized) return;
  initialized = true;
  const platform2 = isElectron() ? "desktop" : "web";
  const app = RUM_APPS[platform2];
  const env2 = mapEnv(config2.env, config2.channel);
  const version2 = config2.appVersion || "0.0.0";
  rumStatus = {
    state: "initializing",
    initialized: true,
    deliveryState: pendingRumEvents.length > 0 ? "queueing" : "idle",
    pendingEventCount: pendingRumEvents.length,
    droppedEventCount: droppedRumEventCount,
    platform: platform2,
    applicationId: app.applicationId,
    service: app.service,
    site: RUM_SITE,
    env: env2,
    version: version2,
  };
  emitRumStatusDiagnostic("init_start");
  void (async () => {
    const { datafluxRum } = await import("../index-yVZExmQK.js");
    return {
      datafluxRum,
    };
  })()
    .then(({ datafluxRum }) => {
      rumApi = datafluxRum;
      datafluxRum.init({
        applicationId: app.applicationId,
        site: RUM_SITE,
        clientToken: app.clientToken,
        env: env2,
        version: version2,
        service: app.service,
        sessionSampleRate: 100,
        sessionReplaySampleRate: 0,
        compressIntakeRequests: true,
        trackUserInteractions: true,
      });
      datafluxRum.setGlobalContextProperty("platform", platform2);
      datafluxRum.setGlobalContextProperty("device_id", config2.deviceId ?? "");
      datafluxRum.setGlobalContextProperty("region", config2.region);
      datafluxRum.setGlobalContextProperty("channel", config2.channel);
      if (platform2 === "desktop") {
        datafluxRum.setGlobalContextProperty(
          "electron_version",
          config2.electronVersion ?? "",
        );
        datafluxRum.setGlobalContextProperty(
          "chrome_version",
          config2.chromeVersion ?? "",
        );
      }
      rumStatus = {
        ...rumStatus,
        state: "ready",
      };
      emitRumStatusDiagnostic("init_ready");
      flushPendingRumEvents();
      reportRumInitStatusAction("init_ready");
      sendRumCanaryProbe(config2, platform2, version2);
    })
    .catch((err) => {
      console.error("[RUM] SDK init failed:", err);
      rumStatus = {
        ...rumStatus,
        state: "failed",
        deliveryState: "failed",
        importError: formatRumError(err),
      };
      emitRumStatusDiagnostic("init_failed");
    });
}

export function reportRumError(error, context) {
  const safeContext = context ? sanitizeRumContext(context) : void 0;
  rumStatus = {
    ...rumStatus,
    lastError: {
      name: error.name,
      message: sanitizeRumMessage(error.message),
      at: new Date().toISOString(),
    },
  };
  if (rumApi) {
    rumApi.addError(toSafeRumError(error), safeContext);
    return;
  }
  enqueueRumEvent({
    kind: "error",
    error: toSafeRumError(error),
    context: safeContext,
  });
}

export function reportRumAction(name2, context) {
  const safeContext = context ? sanitizeRumContext(context) : void 0;
  rumStatus = {
    ...rumStatus,
    lastAction: {
      name: name2,
      at: new Date().toISOString(),
    },
  };
  if (rumApi) {
    rumApi.addAction(name2, safeContext);
    return;
  }
  enqueueRumEvent({
    kind: "action",
    name: name2,
    context: safeContext,
  });
}

function getRumStatus() {
  return rumStatus;
}

export function buildRumInitStatusTrackProps(reportReason) {
  const status = getRumStatus();
  const props = {
    rum_state: status.state,
    report_reason: reportReason,
  };
  if (status.deliveryState) props.delivery_state = status.deliveryState;
  if (typeof status.pendingEventCount === "number") {
    props.pending_event_count = status.pendingEventCount;
  }
  if (typeof status.droppedEventCount === "number") {
    props.dropped_event_count = status.droppedEventCount;
  }
  if (status.platform) props.rum_platform = status.platform;
  if (status.applicationId) props.application_id = status.applicationId;
  if (status.service) props.service = status.service;
  if (status.site) props.site = status.site;
  if (status.env) props.rum_env = status.env;
  if (status.version) props.version = status.version;
  if (status.importError)
    props.import_error = sanitizeRumMessage(status.importError);
  if (status.canary) props.probe_id = status.canary.probeId;
  return props;
}

function sendRumCanaryProbe(config2, platform2, version2) {
  if (config2.rumCanaryDisabled) return;
  if (canarySent || !rumApi) return;
  canarySent = true;
  try {
    const probeId = mintRumCanaryProbeId();
    const sentAt = new Date().toISOString();
    rumApi.addAction(RUM_CANARY_EVENT, {
      probe_id: probeId,
      version: version2,
      channel: config2.channel,
      region: config2.region,
      platform: platform2,
      sent_at: sentAt,
    });
    rumStatus = {
      ...rumStatus,
      canary: {
        probeId,
        sentAt,
      },
    };
    logRumCanaryProbeId(probeId);
    emitRumStatusDiagnostic("canary_sent");
  } catch {}
}

function emitRumStatusDiagnostic(reportReason) {
  const bridge = typeof window !== "undefined" ? window.hilo : void 0;
  if (!bridge) return;
  const props = buildRumInitStatusTrackProps(reportReason);
  const message2 = `rum:init_status ${props.rum_state}`;
  const breadcrumbPromise = bridge.diagnostics?.addBreadcrumb?.(
    "network",
    "rum:init_status",
    toRumInitStatusRecord(props),
  );
  void breadcrumbPromise?.catch(() => {});
  if (props.rum_state === "failed") {
    const warnPromise = bridge.logger?.warn?.(
      `[RUM] ${message2}`,
      "performance",
    );
    void warnPromise?.catch(() => {});
    return;
  }
  const infoPromise = bridge.logger?.info?.(`[RUM] ${message2}`, "performance");
  void infoPromise?.catch(() => {});
}

function reportRumInitStatusAction(reportReason) {
  if (!rumApi) return;
  reportRumAction(
    "rum:init_status",
    toRumInitStatusRecord(buildRumInitStatusTrackProps(reportReason)),
  );
}

function enqueueRumEvent(event) {
  if (pendingRumEvents.length >= MAX_PENDING_RUM_EVENTS) {
    pendingRumEvents.shift();
    droppedRumEventCount++;
  }
  pendingRumEvents.push(event);
  rumStatus = {
    ...rumStatus,
    deliveryState: "queueing",
    pendingEventCount: pendingRumEvents.length,
    droppedEventCount: droppedRumEventCount,
  };
}

function flushPendingRumEvents() {
  if (!rumApi) return;
  while (pendingRumEvents.length > 0) {
    const event = pendingRumEvents.shift();
    if (!event) continue;
    if (event.kind === "error") {
      rumApi.addError(event.error, event.context);
    } else {
      rumApi.addAction(event.name, event.context);
    }
  }
  rumStatus = {
    ...rumStatus,
    deliveryState: "flushed",
    pendingEventCount: 0,
    droppedEventCount: droppedRumEventCount,
  };
}
