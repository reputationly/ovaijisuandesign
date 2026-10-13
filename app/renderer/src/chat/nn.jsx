// nn.jsx
import { jsxRuntimeExports, L as useIconComponents, reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { R as markdownRenderOptionsContext, y3 as useClassNameMerger } from "./ae.jsx";
import { de as useMermaidPluginOptions } from "../media-editing/wt.js";

var DEFAULT_DEBOUNCE_DELAY_MS = 300;

var DEFAULT_INTERSECTION_ROOT_MARGIN = "300px";

var DEFAULT_IDLE_TIMEOUT_MS = 500;

function useLazyIntersectionRendering(renderOptions = {}) {
  let {
      immediate = false,
      debounceDelay = DEFAULT_DEBOUNCE_DELAY_MS,
      rootMargin = DEFAULT_INTERSECTION_ROOT_MARGIN,
      idleTimeout = DEFAULT_IDLE_TIMEOUT_MS,
    } = renderOptions,
    [shouldRender, setShouldRender] = reactExports.useState(false),
    containerRef = reactExports.useRef(null),
    debounceTimeoutRef = reactExports.useRef(null),
    idleCallbackRef = reactExports.useRef(null),
    fallbackRequestIdleCallback = reactExports.useMemo(
      () => (idleCallback) => {
        let fallbackStartTime = Date.now();
        return window.setTimeout(() => {
          idleCallback({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - fallbackStartTime)),
          });
        }, 1);
      },
      [],
    ),
    scheduleIdleCallback = reactExports.useMemo(
      () =>
        typeof window != "undefined" && window.requestIdleCallback
          ? (idleCallback, idleOptions) => window.requestIdleCallback(idleCallback, idleOptions)
          : fallbackRequestIdleCallback,
      [fallbackRequestIdleCallback],
    ),
    cancelIdleWork = reactExports.useMemo(
      () =>
        typeof window != "undefined" && window.cancelIdleCallback
          ? (idleCallbackId) => window.cancelIdleCallback(idleCallbackId)
          : (timeoutId) => {
              clearTimeout(timeoutId);
            },
      [],
    );
  return (
    reactExports.useEffect(() => {
      if (immediate) {
        setShouldRender(true);
        return;
      }
      let observedContainer = containerRef.current;
      if (!observedContainer) return;
      (debounceTimeoutRef.current && (clearTimeout(debounceTimeoutRef.current), (debounceTimeoutRef.current = null)),
        idleCallbackRef.current && (cancelIdleWork(idleCallbackRef.current), (idleCallbackRef.current = null)));
      let cancelPendingTimers = () => {
          (debounceTimeoutRef.current && (clearTimeout(debounceTimeoutRef.current), (debounceTimeoutRef.current = null)),
            idleCallbackRef.current && (cancelIdleWork(idleCallbackRef.current), (idleCallbackRef.current = null)));
        },
        scheduleRenderWhenIdle = (intersectionObserver) => {
          idleCallbackRef.current = scheduleIdleCallback(
            (idleDeadline) => {
              idleDeadline.timeRemaining() > 0 || idleDeadline.didTimeout
                ? (setShouldRender(true), intersectionObserver.disconnect())
                : (idleCallbackRef.current = scheduleIdleCallback(
                    () => {
                      (setShouldRender(true), intersectionObserver.disconnect());
                    },
                    {
                      timeout: idleTimeout / 2,
                    },
                  ));
            },
            {
              timeout: idleTimeout,
            },
          );
        },
        handleIntersection = (intersectionObserver) => {
          (cancelPendingTimers(),
            (debounceTimeoutRef.current = window.setTimeout(() => {
              var latestEntry, isLatestEntryIntersecting;
              let intersectionRecords = intersectionObserver.takeRecords();
              (intersectionRecords.length === 0 ||
                ((isLatestEntryIntersecting = (latestEntry = intersectionRecords.at(-1)) == null ? void 0 : latestEntry.isIntersecting) !=
                  null &&
                  isLatestEntryIntersecting)) &&
                scheduleRenderWhenIdle(intersectionObserver);
            }, debounceDelay)));
        },
        processIntersectionEntry = (intersectionEntry, intersectionObserver) => {
          intersectionEntry.isIntersecting ? handleIntersection(intersectionObserver) : cancelPendingTimers();
        },
        intersectionObserver = new IntersectionObserver(
          (intersectionEntries) => {
            for (let intersectionEntry of intersectionEntries) processIntersectionEntry(intersectionEntry, intersectionObserver);
          },
          {
            rootMargin,
            threshold: 0,
          },
        );
      return (
        intersectionObserver.observe(observedContainer),
        () => {
          (debounceTimeoutRef.current && clearTimeout(debounceTimeoutRef.current),
            idleCallbackRef.current && cancelIdleWork(idleCallbackRef.current),
            intersectionObserver.disconnect());
        }
      );
    }, [immediate, debounceDelay, rootMargin, idleTimeout, cancelIdleWork, scheduleIdleCallback]),
    {
      shouldRender,
      containerRef,
    }
  );
}

var ZoomableDiagram = ({
  children,
  className,
  minZoom = 0.5,
  maxZoom = 3,
  zoomStep = 0.1,
  showControls = true,
  initialZoom = 1,
  fullscreen = false,
}) => {
  let { RotateCcwIcon: resetZoomIcon, ZoomInIcon: zoomInIcon, ZoomOutIcon: zoomOutIcon } = useIconComponents(),
    mergeClassNames = useClassNameMerger(),
    wheelContainerRef = reactExports.useRef(null),
    pointerContainerRef = reactExports.useRef(null),
    [zoomLevel, setZoomLevel] = reactExports.useState(initialZoom),
    [panOffset, setPanOffset] = reactExports.useState({
      x: 0,
      y: 0,
    }),
    [isDragging, setIsDragging] = reactExports.useState(false),
    [pointerStartPosition, setPointerStartPosition] = reactExports.useState({
      x: 0,
      y: 0,
    }),
    [dragStartPanOffset, setDragStartPanOffset] = reactExports.useState({
      x: 0,
      y: 0,
    }),
    adjustZoom = reactExports.useCallback(
      (zoomDelta) => {
        setZoomLevel((nextZoomLevel) => Math.max(minZoom, Math.min(maxZoom, nextZoomLevel + zoomDelta)));
      },
      [minZoom, maxZoom],
    ),
    zoomIn = reactExports.useCallback(() => {
      adjustZoom(zoomStep);
    }, [adjustZoom, zoomStep]),
    zoomOut = reactExports.useCallback(() => {
      adjustZoom(-zoomStep);
    }, [adjustZoom, zoomStep]),
    resetZoomAndPan = reactExports.useCallback(() => {
      (setZoomLevel(initialZoom),
        setPanOffset({
          x: 0,
          y: 0,
        }));
    }, [initialZoom]),
    handleWheelZoom = reactExports.useCallback(
      (wheelEvent) => {
        wheelEvent.preventDefault();
        let wheelZoomDelta = wheelEvent.deltaY > 0 ? -zoomStep : zoomStep;
        adjustZoom(wheelZoomDelta);
      },
      [adjustZoom, zoomStep],
    ),
    handlePointerDown = reactExports.useCallback(
      (pointerEvent) => {
        if (pointerEvent.button !== 0 || pointerEvent.isPrimary === false) return;
        (setIsDragging(true),
          setPointerStartPosition({
            x: pointerEvent.clientX,
            y: pointerEvent.clientY,
          }),
          setDragStartPanOffset(panOffset));
        let eventTarget = pointerEvent.currentTarget;
        eventTarget instanceof HTMLElement && eventTarget.setPointerCapture(pointerEvent.pointerId);
      },
      [panOffset],
    ),
    handlePointerMove = reactExports.useCallback(
      (pointerEvent) => {
        if (!isDragging) return;
        pointerEvent.preventDefault();
        let pointerDeltaX = pointerEvent.clientX - pointerStartPosition.x,
          pointerDeltaY = pointerEvent.clientY - pointerStartPosition.y;
        setPanOffset({
          x: dragStartPanOffset.x + pointerDeltaX,
          y: dragStartPanOffset.y + pointerDeltaY,
        });
      },
      [isDragging, pointerStartPosition, dragStartPanOffset],
    ),
    handlePointerEnd = reactExports.useCallback((pointerEvent) => {
      setIsDragging(false);
      let eventTarget = pointerEvent.currentTarget;
      eventTarget instanceof HTMLElement && eventTarget.releasePointerCapture(pointerEvent.pointerId);
    }, []);
  return (
    reactExports.useEffect(() => {
      let wheelContainer = wheelContainerRef.current;
      if (wheelContainer)
        return (
          wheelContainer.addEventListener("wheel", handleWheelZoom, {
            passive: false,
          }),
          () => {
            wheelContainer.removeEventListener("wheel", handleWheelZoom);
          }
        );
    }, [handleWheelZoom]),
    reactExports.useEffect(() => {
      let pointerContainer = pointerContainerRef.current;
      if (pointerContainer && isDragging)
        return (
          (document.body.style.userSelect = "none"),
          pointerContainer.addEventListener("pointermove", handlePointerMove, {
            passive: false,
          }),
          pointerContainer.addEventListener("pointerup", handlePointerEnd),
          pointerContainer.addEventListener("pointercancel", handlePointerEnd),
          () => {
            ((document.body.style.userSelect = ""),
              pointerContainer.removeEventListener("pointermove", handlePointerMove),
              pointerContainer.removeEventListener("pointerup", handlePointerEnd),
              pointerContainer.removeEventListener("pointercancel", handlePointerEnd));
          }
        );
    }, [isDragging, handlePointerMove, handlePointerEnd]),
    (
      <div
        className={mergeClassNames(
          "relative flex flex-col",
          fullscreen ? "h-full w-full" : "min-h-28 w-full",
          className,
        )}
        ref={wheelContainerRef}
        style={{
          cursor: isDragging ? "grabbing" : "grab",
        }}
      >
        {showControls ? (
          <div
            className={mergeClassNames(
              "absolute z-10 flex flex-col gap-1 rounded-md border border-border bg-background/80 p-1 supports-[backdrop-filter]:bg-background/70 supports-[backdrop-filter]:backdrop-blur-sm",
              fullscreen ? "bottom-4 left-4" : "bottom-2 left-2",
            )}
          >
            <button
              className={mergeClassNames(
                "flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
              )}
              disabled={zoomLevel >= maxZoom}
              onClick={zoomIn}
              title="Zoom in"
              type="button"
            >
              {jsxRuntimeExports.jsx(zoomInIcon, {
                size: 16,
              })}
            </button>
            <button
              className={mergeClassNames(
                "flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
              )}
              disabled={zoomLevel <= minZoom}
              onClick={zoomOut}
              title="Zoom out"
              type="button"
            >
              {jsxRuntimeExports.jsx(zoomOutIcon, {
                size: 16,
              })}
            </button>
            <button
              className={mergeClassNames(
                "flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              )}
              onClick={resetZoomAndPan}
              title="Reset zoom and pan"
              type="button"
            >
              {jsxRuntimeExports.jsx(resetZoomIcon, {
                size: 16,
              })}
            </button>
          </div>
        ) : null}
        <div
          className={mergeClassNames(
            "flex-1 origin-center transition-transform duration-150 ease-out",
            fullscreen
              ? "flex h-full w-full items-center justify-center"
              : "flex w-full items-center justify-center",
          )}
          onPointerDown={handlePointerDown}
          ref={pointerContainerRef}
          role="application"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: "center center",
            touchAction: "none",
            willChange: "transform",
          }}
        >
          {children}
        </div>
      </div>
    )
  );
};

export var po = ({
  chart,
  className,
  config,
  fullscreen = false,
  showControls = true,
}) => {
  let mergeClassNames = useClassNameMerger(),
    [renderError, setRenderError] = reactExports.useState(null),
    [isLoading, setIsLoading] = reactExports.useState(false),
    [renderedSvg, setRenderedSvg] = reactExports.useState(""),
    [displaySvg, setDisplaySvg] = reactExports.useState(""),
    [retryCount, setRetryCount] = reactExports.useState(0),
    { mermaid: mermaidOptions } = reactExports.useContext(markdownRenderOptionsContext),
    mermaidPluginOptions = useMermaidPluginOptions(),
    MermaidErrorComponent = mermaidOptions == null ? void 0 : mermaidOptions.errorComponent,
    { shouldRender, containerRef } = useLazyIntersectionRendering({
      immediate: fullscreen,
    });
  if (
    (reactExports.useEffect(() => {
      if (!shouldRender) return;
      if (!mermaidPluginOptions) {
        setRenderError(
          "Mermaid plugin not available. Please add the mermaid plugin to enable diagram rendering.",
        );
        return;
      }
      (async () => {
        try {
          (setRenderError(null), setIsLoading(true));
          let mermaidRenderer = mermaidPluginOptions.getMermaid(config),
            chartHash = chart
              .split("")
              .reduce((hashAccumulator, character) => ((hashAccumulator << 5) - hashAccumulator + character.charCodeAt(0)) | 0, 0),
            chartRenderId = `mermaid-${Math.abs(chartHash)}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            { svg: svgMarkup } = await mermaidRenderer.render(chartRenderId, chart);
          (setRenderedSvg(svgMarkup), setDisplaySvg(svgMarkup));
        } catch (error) {
          if (!(displaySvg || renderedSvg)) {
            let renderErrorMessage =
              error instanceof Error
                ? error.message
                : "Failed to render Mermaid chart";
            setRenderError(renderErrorMessage);
          }
        } finally {
          setIsLoading(false);
        }
      })();
    }, [chart, config, retryCount, shouldRender, mermaidPluginOptions]),
    !(shouldRender || renderedSvg || displaySvg))
  )
    return <div className={mergeClassNames("my-4 min-h-[200px]", className)} ref={containerRef} />;
  if (isLoading && !renderedSvg && !displaySvg)
    return (
      <div className={mergeClassNames("my-4 flex justify-center p-4", className)} ref={containerRef}>
        <div
          className={mergeClassNames("flex items-center space-x-2 text-muted-foreground")}
        >
          <div
            className={mergeClassNames(
              "h-4 w-4 animate-spin rounded-full border-current border-b-2",
            )}
          />
          <span className={mergeClassNames("text-sm")}>Loading diagram...</span>
        </div>
      </div>
    );
  if (renderError && !renderedSvg && !displaySvg) {
    let handleRetry = () => setRetryCount((retryCount) => retryCount + 1);
    return MermaidErrorComponent ? (
      <div ref={containerRef}>
        <MermaidErrorComponent chart={chart} error={renderError} retry={handleRetry} />
      </div>
    ) : (
      <div className={mergeClassNames("rounded-md bg-red-50 p-4", className)} ref={containerRef}>
        <p className={mergeClassNames("font-mono text-red-700 text-sm")}>
          {"Mermaid Error: "}
          {renderError}
        </p>
        <details className={mergeClassNames("mt-2")}>
          <summary className={mergeClassNames("cursor-pointer text-red-600 text-xs")}>
            Show Code
          </summary>
          <pre
            className={mergeClassNames(
              "mt-2 overflow-x-auto rounded bg-red-100 p-2 text-red-800 text-xs",
            )}
          >
            {chart}
          </pre>
        </details>
      </div>
    );
  }
  let diagramMarkup = renderedSvg || displaySvg;
  return (
    <div className={mergeClassNames("size-full", className)} data-streamdown="mermaid" ref={containerRef}>
      <ZoomableDiagram
        className={mergeClassNames(fullscreen ? "size-full overflow-hidden" : "overflow-hidden", className)}
        fullscreen={fullscreen}
        maxZoom={3}
        minZoom={0.5}
        showControls={showControls}
        zoomStep={0.1}
      >
        <div
          aria-label="Mermaid chart"
          className={mergeClassNames(
            "flex justify-center",
            fullscreen ? "size-full items-center" : null,
          )}
          dangerouslySetInnerHTML={{
            __html: diagramMarkup,
          }}
          role="img"
        />
      </ZoomableDiagram>
    </div>
  );
};
