// remote-tool-host.jsx
import { m$4 as ErrorBoundary } from "../vendor.js";
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { remoteToolLog } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
async function loadRemoteToolModule(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch remote tool: ${response.status}`);
  const content = await response.text();
  const blob = new Blob([content], {
    type: "text/javascript",
  });
  const blobUrl = URL.createObjectURL(blob);
  try {
    const remoteModule = await import(/* @vite-ignore */ blobUrl);
    return remoteModule;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}
export function RemoteToolHost({
  toolUrl,
  toolId,
  sdk: toolSdk,
  layout = "fill",
  availableWidth,
  className,
  logger = remoteToolLog,
}) {
  const { t } = useTranslation();
  const containerRef = reactExports.useRef(null);
  const shadowRef = reactExports.useRef(null);
  const mountPointRef = reactExports.useRef(null);
  const mountHandleRef = reactExports.useRef(null);
  const sdkRef = reactExports.useRef(toolSdk);
  sdkRef.current = toolSdk;
  const [loading, setLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [productSize, setProductSize] = reactExports.useState({
    w: 0,
    h: 0,
  });
  reactExports.useEffect(() => {
    if (!toolUrl || !containerRef.current) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    if (!shadowRef.current) {
      shadowRef.current = containerRef.current.attachShadow({
        mode: "open",
      });
    }
    const shadow = shadowRef.current;
    while (shadow.firstChild) shadow.removeChild(shadow.firstChild);
    const mountPoint = document.createElement("div");
    mountPoint.style.cssText =
      layout === "fit"
        ? "display: inline-block;"
        : "width: 100%; min-height: 100%;";
    shadow.appendChild(mountPoint);
    mountPointRef.current = mountPoint;
    let resizeObserver = null;
    if (layout === "fit") {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          setProductSize((prev) =>
            prev.w === width && prev.h === height
              ? prev
              : {
                  w: width,
                  h: height,
                },
          );
        }
      });
      resizeObserver.observe(mountPoint);
    }
    let cancelled = false;
    const loadStart = Date.now();
    logger.info("host load start", {
      tool_id: toolId,
      tool_url: toolUrl,
    });
    loadRemoteToolModule(toolUrl)
      .then((remoteModule) => {
        if (cancelled) return;
        for (const node of Array.from(
          document.head.querySelectorAll('style, link[rel="stylesheet"]'),
        )) {
          shadow.insertBefore(node.cloneNode(true), mountPoint);
        }
        shadow.adoptedStyleSheets = [...document.adoptedStyleSheets];
        try {
          mountHandleRef.current = remoteModule.mount(mountPoint, sdkRef.current);
          logger.info("host mounted", {
            tool_id: toolId,
            elapsed_ms: Date.now() - loadStart,
          });
        } catch (err) {
          logger.error("host mount failed", {
            tool_id: toolId,
            tool_url: toolUrl,
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : void 0,
          });
          setError(err instanceof Error ? err.message : String(err));
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        logger.error("host load failed", {
          tool_id: toolId,
          tool_url: toolUrl,
          elapsed_ms: Date.now() - loadStart,
          error: err instanceof Error ? err.message : String(err),
        });
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      try {
        mountHandleRef.current?.unmount();
      } catch (err) {
        logger.warn("host unmount error", {
          tool_id: toolId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      mountHandleRef.current = null;
      mountPointRef.current = null;
    };
  }, [toolUrl, toolId, layout, logger]);
  reactExports.useEffect(() => {
    mountHandleRef.current?.update(toolSdk);
  }, [toolSdk]);
  const scale =
    layout === "fit" && availableWidth && productSize.w > availableWidth
      ? availableWidth / productSize.w
      : 1;
  const scaled = scale < 1;
  const shadowHostStyle = {
    // fill mode: explicit height so the tool's h-full chain resolves to the
    // dialog container's height, enabling flex row layouts to work correctly.
    ...(layout === "fill" && {
      height: "100%",
    }),
    ...(layout === "fit" && {
      display: "inline-block",
      width: "max-content",
      height: "max-content",
    }),
    ...(scaled && {
      transform: `scale(${scale})`,
      transformOrigin: "center center",
    }),
  };
  const wrapperClassName =
    className ??
    (layout === "fit"
      ? "relative flex h-full w-full items-center justify-center overflow-hidden"
      : "relative h-full w-full");
  return (
    <div className={wrapperClassName}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
          <span className="animate-pulse text-sm text-muted-foreground">
            {t("remoteTool.loading", "Loading tool...")}
          </span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
          <div className="max-w-md bg-destructive/15 p-4 text-sm text-destructive">
            <p className="font-medium">
              {t("remoteTool.loadFailed", "Failed to load tool")}
            </p>
            <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-xs opacity-80">
              {error}
            </pre>
          </div>
        </div>
      )}
      {jsxRuntimeExports.jsx(ErrorBoundary, {
        onError: (boundaryError, info) => {
          logger.error("host render error", {
            tool_id: toolId,
            error:
              boundaryError instanceof Error
                ? boundaryError.message
                : String(boundaryError),
            stack:
              boundaryError instanceof Error
                ? boundaryError.stack?.slice(0, 1024)
                : void 0,
            component_stack: info.componentStack?.slice(0, 1024),
          });
        },
        fallbackRender: ({ error: boundaryError }) => (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <p className="text-center text-sm text-destructive break-all">
              {boundaryError instanceof Error
                ? boundaryError.message
                : String(boundaryError)}
            </p>
          </div>
        ),
        children: (
          <div
            ref={containerRef}
            data-remote-tool={toolId}
            style={shadowHostStyle}
          />
        ),
      })}
    </div>
  );
}
