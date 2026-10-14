// create-remote-tool-sdk.js
import { API_PATHS } from "../infra/workspace-gateway.js";
import reactExports from "react";
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
  const json = await res.json();
  const localPath = json.path ?? json.relative;
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
            fileId: json.id ?? "",
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
    fileId: json.id ?? json.data?.fileId ?? "",
    url: json.url ?? json.data?.url ?? "",
  };
}

function createRemoteToolSdk(opts) {
  const logger = opts.logger ?? remoteToolLog;
  const handlers = new Map();
  const pending = new Map();
  const sdk = {
    toolId: opts.toolId,
    locale: opts.locale,
    track: (event, props) => {
      if (opts.onTrack) opts.onTrack(event, props);
      else console.debug("[RemoteTool] track:", event, props);
    },
    emit: (eventType, data) => {
      opts.onEmit?.(eventType, data);
      if (eventType === "gui:ready") {
        const params = opts.getInitialParams?.();
        if (params) deliver("params:inject", params);
      }
    },
    on: (eventType, handler) => {
      let set = handlers.get(eventType);
      if (!set) {
        set = new Set();
        handlers.set(eventType, set);
      }
      const erased = handler;
      set.add(erased);
      if (pending.has(eventType)) {
        try {
          erased(pending.get(eventType));
        } catch (err) {
          logger.error("handler error (late delivery)", {
            tool_id: sdk.toolId,
            event_type: eventType,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      return () => {
        handlers.get(eventType)?.delete(erased);
      };
    },
    uploadFile: (file, options) =>
      (opts.onUploadFile ?? ((file, options) => defaultUploadFile(file, options, logger)))(
        file,
        options,
      ),
    checkLogin: async () => (opts.onCheckLogin ? opts.onCheckLogin() : true),
  };
  function deliver(eventType, data) {
    pending.set(eventType, data);
    const set = handlers.get(eventType);
    if (!set || set.size === 0) return;
    for (const handler of set) {
      try {
        handler(data);
      } catch (err) {
        logger.error("handler error", {
          tool_id: sdk.toolId,
          event_type: eventType,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    pending.delete(eventType);
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
      handlers.clear();
      pending.clear();
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
      onEmit: (eventType, eventData) => optsRef.current.onEmit?.(eventType, eventData),
      onCheckLogin: () =>
        optsRef.current.onCheckLogin
          ? optsRef.current.onCheckLogin()
          : Promise.resolve(true),
      getInitialParams: () => optsRef.current.getInitialParams?.(),
      onTrack: (eventName, trackProperties) => optsRef.current.onTrack?.(eventName, trackProperties),
      onUploadFile: (file, options) =>
        (optsRef.current.onUploadFile ?? defaultUploadFile)(file, options),
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
