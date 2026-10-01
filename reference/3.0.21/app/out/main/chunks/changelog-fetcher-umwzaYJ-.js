import { net } from "electron";
import { l as buildReleaseCdnUrl, d as getCategoryLogger, R as RELEASE } from "./index-E7UhlmOX.js";
import "node:fs";
import "node:path";
import "./python-runtime-ZdSS6sqy.js";
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
import "./extract-zip-safe-Bhxshmqd.js";
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
const log = getCategoryLogger("update", "changelog");
const FETCH_TIMEOUT_MS = 3e3;
function getLocale() {
  return RELEASE.locale;
}
async function fetchManifest() {
  const url = buildReleaseCdnUrl("changelog.json");
  log.info(`Fetching changelog: ${url}`);
  try {
    const response = await net.fetch(url, {
      cache: "no-cache",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    if (!response.ok) {
      log.warn(`Changelog fetch HTTP ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (data?.schemaVersion !== 1 || !data.en?.items || !data.zh?.items) {
      log.warn("Invalid changelog manifest shape");
      return null;
    }
    return data;
  } catch (err) {
    log.warn(`Changelog fetch failed: ${err.message}`);
    return null;
  }
}
async function fetchChangelogForUpdate(targetVersion) {
  const manifest = await fetchManifest();
  if (!manifest) {
    return {
      subtitle: null,
      entry: null
    };
  }
  const locale = getLocale();
  const items = manifest[locale]?.items ?? manifest.en?.items ?? [];
  const normalizedTarget = targetVersion.replace(/^v/, "");
  const matchedItem = items.find((item) => item.version.replace(/^v/, "") === normalizedTarget);
  const entry = matchedItem ? {
    version: matchedItem.version,
    date: matchedItem.date,
    subtitle: matchedItem.subtitle,
    changelog: matchedItem.changelog
  } : null;
  return {
    subtitle: matchedItem?.subtitle ?? null,
    entry
  };
}
export {
  fetchChangelogForUpdate
};
