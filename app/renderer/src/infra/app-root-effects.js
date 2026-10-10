// app-root-effects.js
import { rendererRuntimeConfig } from "./split-pinned-inventory.js";
import { TRACK_EVENTS } from "./track-events.js";
import { trackEvent } from "./sanitize-track-props.js";
import { initTrack } from "./init-track.js";
import { initRum } from "../i18n/init-rum.js";
import {
  scheduleRumInitStatusTrackReports,
  waitForUserReady,
} from "../i18n/canvas-node-tools.jsx";
import {
  applyRenderingModeAttributes,
  startRendererDiagnosticsReporter,
} from "../settings/settings-select.jsx";
import { isElectron } from "./use-canvas-node-assets-store.js";
import { homeService } from "../workspace/home-service.jsx";
import { startPerfObserver } from "./start-perf-observer.js";

startPerfObserver();

if (isElectron()) {
  (() => import("./workbench-service.js"))();
  startRendererDiagnosticsReporter(homeService.hiloApp);
}

{
  const cfg = rendererRuntimeConfig;
  applyRenderingModeAttributes(cfg);
  initRum(cfg);
  void initTrack({
    region: cfg.region,
    channel: cfg.channel,
    env: cfg.env,
    appVersion: cfg.appVersion,
    deviceId: cfg.deviceId ?? "",
    ipCountry: cfg.ipCountry,
    downloadSource: cfg.downloadSource,
    updateBackend: cfg.updateBackend,
    processType: "renderer",
    // Renderer cannot read process.versions.* / node:os under contextIsolation,
    // preload pre-computes these in __HILO_CONFIG__ and we forward them.
    electronVersion: cfg.electronVersion,
    chromeVersion: cfg.chromeVersion,
    cpuCount: cfg.cpuCount,
    totalMemoryMb: cfg.totalMemoryMb,
    locale: cfg.locale,
    timezone: cfg.timezone,
    debug: false,
  }).then(async () => {
    await waitForUserReady();
    trackEvent(TRACK_EVENTS.APP_LAUNCH, {
      entry: "renderer",
    });
    scheduleRumInitStatusTrackReports((props) => {
      trackEvent(TRACK_EVENTS.RUM_INIT_STATUS, {
        ...props,
      });
    });
  });
}

if (window.__TEST_DRIVER_IPC__) {
  const ipc = window.__TEST_DRIVER_IPC__;
  void (() => import("./test-driver-bridge.js"))().then((mod) => {
    mod.initTestDriverBridge(ipc);
  });
}
