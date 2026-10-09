// create-remote-tool-sdk.js
import { API_PATHS, reactExports } from "../vendor.js";
import { remoteToolLog } from "../vendor-inline/vscode-base/graph.jsx";
import { gatewayFetch } from "../infra/gateway-fetch.js";

async function defaultUploadFile(file, options, logger = remoteToolLog) {
  const form = new FormData();
  form.append("file", file);
  if (options?.fileType) form.append("fileType", options.fileType);
  const res = await gatewayFetch(API_PATHS.upload, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const json2 = await res.json();
  const localPath = json2.path ?? json2.relative;
  if (localPath) {
    try {
      const cdnRes = await gatewayFetch("/api/files/upload-cdn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_path: localPath,
        }),
      });
      if (cdnRes.ok) {
        const cdnJson = await cdnRes.json();
        if (cdnJson.ok && cdnJson.url) {
          return {
            fileId: json2.id ?? "",
            url: cdnJson.url,
          };
        }
        logger.warn("uploadFile cdn failed", {
          name: file.name,
          local_path: localPath,
          error: cdnJson.error ?? "unknown",
        });
      } else {
        logger.warn("uploadFile cdn http error", {
          name: file.name,
          status: cdnRes.status,
        });
      }
    } catch (cdnErr) {
      logger.warn("uploadFile cdn exception", {
        name: file.name,
        error: cdnErr instanceof Error ? cdnErr.message : String(cdnErr),
      });
    }
  }
  return {
    fileId: json2.id ?? json2.data?.fileId ?? "",
    url: json2.url ?? json2.data?.url ?? "",
  };
}

function createRemoteToolSdk(opts) {
  const logger = opts.logger ?? remoteToolLog;
  const handlers2 = new Map();
  const pending2 = new Map();
  const sdk = {
    toolId: opts.toolId,
    locale: opts.locale,
    track: (event, props) => {
      if (opts.onTrack) opts.onTrack(event, props);
      else console.debug("[RemoteTool] track:", event, props);
    },
    emit: (eventType, data2) => {
      opts.onEmit?.(eventType, data2);
      if (eventType === "gui:ready") {
        const params = opts.getInitialParams?.();
        if (params) deliver("params:inject", params);
      }
    },
    on: (eventType, handler) => {
      let set2 = handlers2.get(eventType);
      if (!set2) {
        set2 = new Set();
        handlers2.set(eventType, set2);
      }
      const erased = handler;
      set2.add(erased);
      if (pending2.has(eventType)) {
        try {
          erased(pending2.get(eventType));
        } catch (err) {
          logger.error("handler error (late delivery)", {
            tool_id: sdk.toolId,
            event_type: eventType,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      return () => {
        handlers2.get(eventType)?.delete(erased);
      };
    },
    uploadFile: (file, options) =>
      (opts.onUploadFile ?? ((f2, o2) => defaultUploadFile(f2, o2, logger)))(
        file,
        options,
      ),
    checkLogin: async () => (opts.onCheckLogin ? opts.onCheckLogin() : true),
  };
  function deliver(eventType, data2) {
    pending2.set(eventType, data2);
    const set2 = handlers2.get(eventType);
    if (!set2 || set2.size === 0) return;
    for (const handler of set2) {
      try {
        handler(data2);
      } catch (err) {
        logger.error("handler error", {
          tool_id: sdk.toolId,
          event_type: eventType,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    pending2.delete(eventType);
  }
  return {
    sdk,
    dispatchHostEvent: deliver,
    setToolId: (toolId) => {
      sdk.toolId = toolId;
    },
    setLocale: (locale) => {
      sdk.locale = locale;
    },
    dispose: () => {
      handlers2.clear();
      pending2.clear();
    },
  };
}

export function useRemoteToolSdk(opts) {
  const optsRef = reactExports.useRef(opts);
  optsRef.current = opts;
  const [controller] = reactExports.useState(() =>
    createRemoteToolSdk({
      toolId: opts.toolId,
      locale: opts.locale,
      onEmit: (e2, d2) => optsRef.current.onEmit?.(e2, d2),
      onCheckLogin: () =>
        optsRef.current.onCheckLogin
          ? optsRef.current.onCheckLogin()
          : Promise.resolve(true),
      getInitialParams: () => optsRef.current.getInitialParams?.(),
      onTrack: (e2, p3) => optsRef.current.onTrack?.(e2, p3),
      onUploadFile: (f2, o2) =>
        (optsRef.current.onUploadFile ?? defaultUploadFile)(f2, o2),
      logger: opts.logger,
    }),
  );
  const sdk = reactExports.useMemo(() => {
    controller.setToolId(opts.toolId);
    controller.setLocale(opts.locale);
    return {
      ...controller.sdk,
    };
  }, [opts.toolId, opts.locale, controller]);
  reactExports.useEffect(() => () => controller.dispose(), [controller]);
  return reactExports.useMemo(
    () => ({
      sdk,
      dispatchHostEvent: controller.dispatchHostEvent,
      setToolId: controller.setToolId,
      setLocale: controller.setLocale,
      dispose: controller.dispose,
    }),
    [sdk, controller],
  );
}
