import { Notification, BrowserWindow, app } from "electron";
import { R as RELEASE, g as getCategoryLogger } from "../index.js";
import { u as updaterNotificationI18n, w as globalStorage, x as resolveResource } from "./index-C0Ixo6UY.js";
import "node:fs";
import "node:os";
import "node:path";
import "./js-yaml-B0IoXaZA.js";
import "node:child_process";
import "node:crypto";
import "./windows-junction-path-Ndl9Z-pn.js";
import "node:fs/promises";
import "./eval-runtime-D7zKNjbh.js";
import "path";
import "child_process";
import "os";
import "fs";
import "util";
import "events";
import "http";
import "https";
import "node:module";
import "./python-runtime-g_0Tz6er.js";
import "node:net";
import "node:util";
import "node:tls";
import "node:url";
import "node:http";
import "node:sqlite";
import "node:stream";
import "node:stream/promises";
import "node:events";
import "node:string_decoder";
import "assert";
import "buffer";
import "zlib";
import "node:assert";
import "./extract-zip-safe-pgCsG0Mm.js";
import "constants";
import "stream";
import "node:timers/promises";
import "module";
import "node:zlib";
import "node:perf_hooks";
import "node:inspector";
import "node:v8";
import "node:worker_threads";
import "node:process";
import "node:vm";
import "net";
import "tls";
import "crypto";
import "url";
import "tty";
import "http2";
import "querystring";
import "dns";
import "punycode";
import "node:https";
import "./worker-protocol-Rm4q_d5O.js";
const log = getCategoryLogger("update");
function bringWindowToFront(win) {
  app.focus({ steal: true });
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}
function showUpdaterToast(version) {
  if (!Notification.isSupported()) {
    log.info(`Update toast for v${version} — system notification not supported`);
    return;
  }
  const t = updaterNotificationI18n[globalStorage.get("config").language ?? RELEASE.locale] ?? updaterNotificationI18n.en;
  const notification = new Notification({
    title: t.notificationTitle,
    body: t.notificationBody,
    silent: false,
    icon: resolveResource("icon.png")
  });
  notification.on("click", () => {
    const target = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    if (target && !target.isDestroyed()) {
      bringWindowToFront(target);
    }
  });
  notification.on("failed", (_, error) => {
    log.warn(`System notification failed to show: ${error}`);
  });
  notification.show();
  log.info(`Update toast shown for v${version}`);
}
export {
  showUpdaterToast
};
