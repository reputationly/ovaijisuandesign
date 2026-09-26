import { r as reactExports, j as jsxRuntimeExports, h as useTranslation, ax as useSearch, ay as useRemoteToolSdk, az as remoteDebugLog, l as gatewayFetch, aA as RemoteToolDialogShell, aB as RemoteToolHost } from "./main.jsx";
let nextId = 1;
function useCallLog() {
  const [logs, setLogs] = reactExports.useState([]);
  const log = reactExports.useCallback((method, detail) => {
    const now = /* @__PURE__ */ new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    setLogs((prev) => [{ id: nextId++, time, method, detail }, ...prev].slice(0, 200));
  }, []);
  const clear = reactExports.useCallback(() => setLogs([]), []);
  return { logs, log, clear };
}
function CallLog({ logs, onClear }) {
  const listRef = reactExports.useRef(null);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between border-b border-border px-3 py-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-foreground", children: "SDK Call Log" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: onClear,
          "data-action-ui-id": "remote-debug.clear-log",
          className: "text-xs text-muted-foreground hover:text-foreground",
          children: "Clear"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref: listRef, className: "flex-1 overflow-y-auto p-2", children: [
      logs.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "py-4 text-center text-xs text-muted-foreground", children: "No calls yet" }),
      logs.map((entry) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-border py-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 font-mono text-[10px] text-muted-foreground", children: entry.time }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-xs text-primary break-all", children: entry.method })
        ] }),
        entry.detail && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 pl-14 font-mono text-[10px] whitespace-pre-wrap break-all text-muted-foreground", children: entry.detail })
      ] }, entry.id))
    ] })
  ] });
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
      remoteDebugLog.info("sdk.track", { tool_id: sdk.toolId, event, props: props ?? null });
      sdk.track(event, props);
    },
    emit: (eventType, data) => {
      const detail = data ? JSON.stringify(data).slice(0, 200) : "";
      log(`emit:${eventType}`, detail);
      remoteDebugLog.info("sdk.emit", {
        tool_id: sdk.toolId,
        event_type: eventType,
        data_fields: data ? Object.keys(data) : []
      });
      sdk.emit(eventType, data);
    },
    on: (eventType, handler) => {
      log(`on:${eventType}`, "subscribed");
      remoteDebugLog.info("sdk.on subscribe", { tool_id: sdk.toolId, event_type: eventType });
      const off = sdk.on(eventType, handler);
      return () => {
        log(`off:${eventType}`, "unsubscribed");
        remoteDebugLog.info("sdk.on unsubscribe", { tool_id: sdk.toolId, event_type: eventType });
        off();
      };
    },
    uploadFile: async (file, options) => {
      log("uploadFile", `${file.name} (${options?.fileType ?? "image"})`);
      remoteDebugLog.info("sdk.uploadFile start", {
        tool_id: sdk.toolId,
        name: file.name,
        size: file.size,
        file_type: options?.fileType ?? "image"
      });
      try {
        const result = await sdk.uploadFile(file, options);
        log("uploadFile.ok", result.url);
        remoteDebugLog.info("sdk.uploadFile ok", { tool_id: sdk.toolId, url: result.url });
        return result;
      } catch (err) {
        remoteDebugLog.error("sdk.uploadFile failed", {
          tool_id: sdk.toolId,
          name: file.name,
          error: err instanceof Error ? err.message : String(err)
        });
        throw err;
      }
    },
    checkLogin: async () => {
      try {
        const ok = await sdk.checkLogin();
        log("checkLogin", String(ok));
        remoteDebugLog.info("sdk.checkLogin", { tool_id: sdk.toolId, ok });
        return ok;
      } catch (err) {
        remoteDebugLog.error("sdk.checkLogin failed", {
          tool_id: sdk.toolId,
          error: err instanceof Error ? err.message : String(err)
        });
        throw err;
      }
    }
  };
}
function RemoteToolDebugPage() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/_app/debug/remote-tool" });
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
    logger: remoteDebugLog
  });
  const loggedSdk = reactExports.useMemo(() => decorateWithLog(sdk, log), [sdk, log]);
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
      remoteDebugLog.warn("manifest url missing; falling back to default geometry", {
        bundle_url: bundleUrl
      });
      setGuiWidth(void 0);
      setGuiHeight(void 0);
      setManifestReady(true);
      return;
    }
    gatewayFetch(manifestUrl).then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))).then((manifest) => {
      if (cancelled) return;
      const w = typeof manifest?.guiWidth === "number" ? manifest.guiWidth : void 0;
      const h = typeof manifest?.guiHeight === "number" ? manifest.guiHeight : void 0;
      setGuiWidth(w);
      setGuiHeight(h);
      remoteDebugLog.info("gui manifest loaded", {
        tool_id: toolId,
        gui_width: w ?? null,
        gui_height: h ?? null
      });
    }).catch((err) => {
      if (cancelled) return;
      remoteDebugLog.warn("gui manifest fetch/parse failed", {
        manifest_url: manifestUrl,
        error: err instanceof Error ? err.message : String(err)
      });
      setGuiWidth(void 0);
      setGuiHeight(void 0);
    }).finally(() => {
      if (!cancelled) setManifestReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [bundleUrl, manifestUrl, toolId]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full min-w-0 flex-1 flex-col bg-background text-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-3 border-b border-border px-4 py-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-1.5 text-xs text-muted-foreground", children: [
        "Locale",
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "select",
          {
            value: locale,
            onChange: (e) => setLocale(e.target.value),
            "data-action-ui-id": "remote-tool-debug.locale",
            className: "border border-input bg-background px-2 py-1 text-xs text-foreground",
            children: DEBUG_LOCALES.map((l) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: l, children: l }, l))
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => setShowLog((v) => !v),
          "data-action-ui-id": "remote-tool-debug.toggle-log",
          className: "ml-auto border border-input bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground",
          children: showLog ? "Hide Log" : "Show Log"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-0 flex-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-1 flex-col items-center justify-center overflow-hidden p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex shrink-0 items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-4 w-4 shrink-0 rounded-full bg-primary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
            t("remoteToolDebug.toolReady"),
            ":",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-primary", children: toolId }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-2 font-mono", children: [
              guiWidth ?? "80vw",
              " × ",
              guiHeight ?? "80vh"
            ] })
          ] })
        ] }),
        manifestReady && bundleUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(RemoteToolDialogShell, { width: guiWidth, height: guiHeight, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          RemoteToolHost,
          {
            toolUrl: bundleUrl,
            toolId,
            sdk: loggedSdk,
            layout: "fill",
            logger: remoteDebugLog
          }
        ) }) : manifestReady && !bundleUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: t("remoteToolDebug.noBundleUrl", { params: "?url=...&manifest=..." }) }) : null
      ] }),
      showLog && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-80 shrink-0 border-l border-border bg-sidebar", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CallLog, { logs, onClear: clear }) })
    ] })
  ] });
}
const SplitComponent = RemoteToolDebugPage;
export {
  SplitComponent as component
};
