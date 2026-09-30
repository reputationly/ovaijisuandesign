import { Notification, BrowserWindow, app } from "electron";
import { u as updaterNotificationI18n, m as globalStorage, R as RELEASE, n as resolveResource, d as getCategoryLogger } from "./index-CQFBTq_k.js";
import "node:fs";
import "node:path";
import "./python-runtime-jWZe4Vty.js";
import "node:child_process";
import "./safe-spawn-path-DD3xknOt.js";
import "node:crypto";
import "node:net";
import "node:os";
import "node:util";
import "node:tls";
import "node:url";
import "node:http";
import "node:sqlite";
import "node:stream";
import "node:stream/promises";
import "events";
import "fs";
import "node:events";
import "node:string_decoder";
import "path";
import "assert";
import "buffer";
import "zlib";
import "node:assert";
import "node:fs/promises";
import "./extract-zip-safe-DlEVmnyK.js";
import "constants";
import "stream";
import "util";
import "node:timers/promises";
import "module";
import "./windows-junction-path-BTcT19J3.js";
import "child_process";
import "os";
import "http";
import "https";
import "node:zlib";
import "node:perf_hooks";
import "node:inspector";
import "node:v8";
import "../index.js";
import "node:module";
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
