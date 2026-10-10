// remote-tool.jsx
import { reactExports, jsxRuntimeExports, useTranslation, useSearch } from "../vendor.js";
import { useRemoteToolSdk } from "../assets/create-remote-tool-sdk.js";
import { remoteDebugLog } from "../vendor-inline/vscode-base/graph.jsx";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { RemoteToolDialogShell } from "../media-editing/derive-session-task-snapshot.jsx";
import { RemoteToolHost } from "../media-editing/remote-tool-host.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
let nextId = 1;
function useCallLog() {
  const [logs, setLogs] = reactExports.useState([]);
  const log = reactExports.useCallback((method, detail) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    setLogs((prev) =>
      [
        {
          id: nextId++,
          time,
          method,
          detail,
        },
        ...prev,
      ].slice(0, 200),
    );
  }, []);
  const clear = reactExports.useCallback(() => setLogs([]), []);
  return {
    logs,
    log,
    clear,
  };
}
function CallLog({ logs, onClear }) {
  const listRef = reactExports.useRef(null);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium text-foreground">
          SDK Call Log
        </span>
        <button
          type="button"
          onClick={onClear}
          data-action-ui-id="remote-debug.clear-log"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-2">
        {logs.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No calls yet
          </p>
        )}
        {logs.map((entry) => (
          <div key={entry.id} className="border-b border-border py-1.5">
            <div className="flex items-baseline gap-2">
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {entry.time}
              </span>
              <span className="font-mono text-xs text-primary break-all">
                {entry.method}
              </span>
            </div>
            {entry.detail && (
              <p className="mt-0.5 pl-14 font-mono text-[10px] whitespace-pre-wrap break-all text-muted-foreground">
                {entry.detail}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
const DEBUG_LOCALES = ["zh", "en"];
const DEFAULT_DEBUG_LOCALE = "zh";
function decorateWithLog(sdk, log) {
  return {
    toolId: sdk.toolId,
    locale: sdk.locale,
    track: (event, props) => {
      const detail = props ? JSON.stringify(props) : "";
      log("track", `${event} ${detail}`);
      remoteDebugLog.info("sdk.track", {
        tool_id: sdk.toolId,
        event,
        props: props ?? null,
      });
      sdk.track(event, props);
    },
    emit: (eventType, data) => {
      const detail = data ? JSON.stringify(data).slice(0, 200) : "";
      log(`emit:${eventType}`, detail);
      remoteDebugLog.info("sdk.emit", {
        tool_id: sdk.toolId,
        event_type: eventType,
        data_fields: data ? Object.keys(data) : [],
      });
      sdk.emit(eventType, data);
    },
    on: (eventType, handler) => {
      log(`on:${eventType}`, "subscribed");
      remoteDebugLog.info("sdk.on subscribe", {
        tool_id: sdk.toolId,
        event_type: eventType,
      });
      const off = sdk.on(eventType, handler);
      return () => {
        log(`off:${eventType}`, "unsubscribed");
        remoteDebugLog.info("sdk.on unsubscribe", {
          tool_id: sdk.toolId,
          event_type: eventType,
        });
        off();
      };
    },
    uploadFile: async (file, options) => {
      log("uploadFile", `${file.name} (${options?.fileType ?? "image"})`);
      remoteDebugLog.info("sdk.uploadFile start", {
        tool_id: sdk.toolId,
        name: file.name,
        size: file.size,
        file_type: options?.fileType ?? "image",
      });
      try {
        const result = await sdk.uploadFile(file, options);
        log("uploadFile.ok", result.url);
        remoteDebugLog.info("sdk.uploadFile ok", {
          tool_id: sdk.toolId,
          url: result.url,
        });
        return result;
      } catch (err) {
        remoteDebugLog.error("sdk.uploadFile failed", {
          tool_id: sdk.toolId,
          name: file.name,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    },
    checkLogin: async () => {
      try {
        const ok = await sdk.checkLogin();
        log("checkLogin", String(ok));
        remoteDebugLog.info("sdk.checkLogin", {
          tool_id: sdk.toolId,
          ok,
        });
        return ok;
      } catch (err) {
        remoteDebugLog.error("sdk.checkLogin failed", {
          tool_id: sdk.toolId,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    },
  };
}
function RemoteToolDebugPage() {
  const { t } = useTranslation();
  const search = useSearch({
    from: "/_app/debug/remote-tool",
  });
  const bundleUrl = search.url ?? null;
  const manifestUrl = search.manifest ?? null;
  const [locale, setLocale] = reactExports.useState(DEFAULT_DEBUG_LOCALE);
  const [showLog, setShowLog] = reactExports.useState(true);
  const [guiWidth, setGuiWidth] = reactExports.useState(void 0);
  const [guiHeight, setGuiHeight] = reactExports.useState(void 0);
  const [manifestReady, setManifestReady] = reactExports.useState(false);
  const { logs, log, clear } = useCallLog();
  const toolId = search.tool || "debug-tool";
  const { sdk } = useRemoteToolSdk({
    toolId,
    locale,
    logger: remoteDebugLog,
  });
  const loggedSdk = reactExports.useMemo(
    () => decorateWithLog(sdk, log),
    [sdk, log],
  );
  reactExports.useEffect(() => {
    let cancelled = false;
    setManifestReady(false);
    if (!bundleUrl) {
      setGuiWidth(void 0);
      setGuiHeight(void 0);
      setManifestReady(true);
      return;
    }
    if (!manifestUrl) {
      remoteDebugLog.warn(
        "manifest url missing; falling back to default geometry",
        {
          bundle_url: bundleUrl,
        },
      );
      setGuiWidth(void 0);
      setGuiHeight(void 0);
      setManifestReady(true);
      return;
    }
    gatewayFetch(manifestUrl)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)),
      )
      .then((manifest) => {
        if (cancelled) return;
        const w =
          typeof manifest?.guiWidth === "number" ? manifest.guiWidth : void 0;
        const h =
          typeof manifest?.guiHeight === "number" ? manifest.guiHeight : void 0;
        setGuiWidth(w);
        setGuiHeight(h);
        remoteDebugLog.info("gui manifest loaded", {
          tool_id: toolId,
          gui_width: w ?? null,
          gui_height: h ?? null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        remoteDebugLog.warn("gui manifest fetch/parse failed", {
          manifest_url: manifestUrl,
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
  }, [bundleUrl, manifestUrl, toolId]);
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-background text-foreground">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Locale
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            data-action-ui-id="remote-tool-debug.locale"
            className="border border-input bg-background px-2 py-1 text-xs text-foreground"
          >
            {DEBUG_LOCALES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setShowLog((v) => !v)}
          data-action-ui-id="remote-tool-debug.toggle-log"
          className="ml-auto border border-input bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {showLog ? "Hide Log" : "Show Log"}
        </button>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center overflow-hidden p-3">
          <div className="mb-2 flex shrink-0 items-center gap-2">
            <div className="h-4 w-4 shrink-0 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground">
              {t("remoteToolDebug.toolReady")}:{" "}
              <span className="font-mono text-primary">{toolId}</span>
              <span className="ml-2 font-mono">
                {guiWidth ?? "80vw"}
                {" × "}
                {guiHeight ?? "80vh"}
              </span>
            </span>
          </div>
          {manifestReady && bundleUrl ? (
            <RemoteToolDialogShell width={guiWidth} height={guiHeight}>
              <RemoteToolHost
                toolUrl={bundleUrl}
                toolId={toolId}
                sdk={loggedSdk}
                layout="fill"
                logger={remoteDebugLog}
              />
            </RemoteToolDialogShell>
          ) : manifestReady && !bundleUrl ? (
            <p className="text-xs text-muted-foreground">
              {t("remoteToolDebug.noBundleUrl", {
                params: "?url=...&manifest=...",
              })}
            </p>
          ) : null}
        </div>
        {showLog && (
          <div className="w-80 shrink-0 border-l border-border bg-sidebar">
            <CallLog logs={logs} onClear={clear} />
          </div>
        )}
      </div>
    </div>
  );
}
const SplitComponent = RemoteToolDebugPage;
export { SplitComponent as component };
