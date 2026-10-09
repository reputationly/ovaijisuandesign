// remote-tool-dialog.jsx
import { remoteToolLog } from "../vendor-inline/vscode-base/graph.jsx";
import { gatewayFetch } from "./gateway-fetch.js";
import { reactExports, useTranslation, X$7 as X } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useRemoteToolSdk } from "../assets/create-remote-tool-sdk.js";
import { Button } from "./dialog-content.jsx";
import { RemoteToolDialogShell } from "../media-editing/derive-session-task-snapshot.jsx";
import { RemoteToolHost } from "../media-editing/remote-tool-host.jsx";
const LOCAL_PATH_RE = /^(\/|[A-Za-z]:[\\/])/;
const MEDIA_EXT_RE = /\.(png|jpg|jpeg|webp|gif|avif|mp4|mp3|wav|m4a|ogg)$/i;
function looksLikeLocalPath(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.startsWith("http://") || value.startsWith("https://")) return false;
  if (value.startsWith("data:") || value.startsWith("blob:")) return false;
  if (LOCAL_PATH_RE.test(value)) return true;
  return !value.includes("://") && MEDIA_EXT_RE.test(value);
}
async function normalizeInitialParams(params) {
  const entries2 = await Promise.all(
    Object.entries(params).map(async ([key2, value]) => {
      if (!looksLikeLocalPath(value)) return [key2, value];
      try {
        const res = await gatewayFetch("/api/files/upload-cdn", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file_path: value,
          }),
          timeoutMs: 12e4,
        });
        const json2 = await res.json();
        if (json2.ok && json2.url) {
          remoteToolLog.info("initial_params normalized", {
            key: key2,
            from: value,
            to: json2.url,
          });
          return [key2, json2.url];
        }
        remoteToolLog.warn("initial_params upload-cdn returned not ok", {
          key: key2,
          path: value,
          error: json2.error ?? "unknown",
        });
      } catch (err) {
        remoteToolLog.warn("initial_params upload-cdn exception", {
          key: key2,
          path: value,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      return [key2, value];
    }),
  );
  return Object.fromEntries(entries2);
}
export function RemoteToolDialog({
  open,
  onClose,
  toolUrl,
  manifestPath,
  toolId,
  locale = "en",
  onGuiEvent,
  hostEvent,
  initialParams,
  onCheckLogin,
  interactionDisabled = false,
}) {
  const { t: t2 } = useTranslation();
  const initialParamsRef = reactExports.useRef(initialParams);
  const { sdk, dispatchHostEvent } = useRemoteToolSdk({
    toolId,
    locale,
    onEmit: onGuiEvent,
    onCheckLogin,
    getInitialParams: () => initialParamsRef.current,
  });
  reactExports.useEffect(() => {
    if (!hostEvent) return;
    dispatchHostEvent(hostEvent.eventType, hostEvent.data);
  }, [hostEvent, dispatchHostEvent]);
  const [paramsReady, setParamsReady] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!open) {
      setParamsReady(false);
      initialParamsRef.current = initialParams;
      return;
    }
    let cancelled = false;
    if (!initialParams || Object.keys(initialParams).length === 0) {
      initialParamsRef.current = initialParams;
      setParamsReady(true);
      return;
    }
    setParamsReady(false);
    normalizeInitialParams(initialParams)
      .then((normalized) => {
        if (cancelled) return;
        initialParamsRef.current = normalized;
        setParamsReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        remoteToolLog.error("normalizeInitialParams unexpected error", {
          error: err instanceof Error ? err.message : String(err),
        });
        initialParamsRef.current = initialParams;
        setParamsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, initialParams]);
  const [guiWidth, setGuiWidth] = reactExports.useState(void 0);
  const [guiHeight, setGuiHeight] = reactExports.useState(void 0);
  const [manifestReady, setManifestReady] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!open) {
      setManifestReady(false);
      return;
    }
    let cancelled = false;
    gatewayFetch(manifestPath)
      .then((r2) =>
        r2.ok ? r2.json() : Promise.reject(new Error(`HTTP ${r2.status}`)),
      )
      .then((manifest) => {
        if (cancelled) return;
        setGuiWidth(
          typeof manifest?.guiWidth === "number" ? manifest.guiWidth : void 0,
        );
        setGuiHeight(
          typeof manifest?.guiHeight === "number" ? manifest.guiHeight : void 0,
        );
      })
      .catch((err) => {
        if (cancelled) return;
        remoteToolLog.warn("gui manifest fetch/parse failed", {
          tool_id: toolId,
          manifest_path: manifestPath,
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
  }, [open, manifestPath, toolId]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        display: open ? "flex" : "none",
      }}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label={t2("a11y.closeDialog", "Close dialog")}
        className="modal-mask absolute inset-0"
        onClick={onClose}
      />
      {manifestReady && paramsReady && (
        <RemoteToolDialogShell width={guiWidth} height={guiHeight}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-2 right-2 z-20"
            onClick={onClose}
            aria-label={t2("common.close")}
            data-action-ui-id="remote-tool-dialog.close"
          >
            <X size={16} strokeWidth={1.5} />
          </Button>
          <div
            className={
              interactionDisabled
                ? "h-full pointer-events-none opacity-50"
                : "h-full"
            }
          >
            {open && (
              <RemoteToolHost
                toolUrl={toolUrl}
                toolId={toolId}
                sdk={sdk}
                layout="fill"
              />
            )}
          </div>
          {interactionDisabled ? (
            <div
              role="status"
              className="absolute inset-x-4 bottom-4 z-20 rounded-md border border-border bg-background px-3 py-2 text-center text-xs text-muted-foreground shadow-sm"
              data-action-ui-id="remote-tool-dialog.account-blocked"
            >
              {t2("team.submission.blocked", {
                defaultValue: "账号正在切换或恢复，暂时无法提交。",
              })}
            </div>
          ) : null}
        </RemoteToolDialogShell>
      )}
    </div>
  );
}
