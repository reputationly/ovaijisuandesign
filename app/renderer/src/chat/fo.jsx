// fo.jsx
import {
  jsxRuntimeExports,
  L as useIcons,
  reactDomExports,
  reactExports,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ce as unlockBodyScroll, le as lockBodyScroll, R as markdownRenderOptionsContext, y3 as useClassNameMerger } from "./ae.jsx";
import { po as MermaidRenderer } from "./nn.jsx";
import { D3 as useStreamdownLabels } from "../media-editing/wt.js";

export var fo = ({
  chart,
  config,
  onFullscreen,
  onExit,
  className,
  ...restProps
}) => {
  let { Maximize2Icon: maximizeIcon, XIcon: closeIcon } = useIcons(),
    mergeClassNames = useClassNameMerger(),
    [isFullscreen, setIsFullscreen] = reactExports.useState(false),
    { isAnimating, controls } = reactExports.useContext(markdownRenderOptionsContext),
    translations = useStreamdownLabels(),
    shouldShowControls = (() => {
      if (typeof controls == "boolean") return controls;
      let mermaidControls = controls.mermaid;
      return mermaidControls === false
        ? false
        : mermaidControls === true || mermaidControls === void 0
          ? true
          : mermaidControls.panZoom !== false;
    })(),
    toggleFullscreen = () => {
      setIsFullscreen(!isFullscreen);
    };
  return (
    reactExports.useEffect(() => {
      if (isFullscreen) {
        lockBodyScroll();
        let handleEscapeKey = (keyboardEvent) => {
          keyboardEvent.key === "Escape" && setIsFullscreen(false);
        };
        return (
          document.addEventListener("keydown", handleEscapeKey),
          () => {
            (document.removeEventListener("keydown", handleEscapeKey), unlockBodyScroll());
          }
        );
      }
    }, [isFullscreen]),
    reactExports.useEffect(() => {
      isFullscreen ? onFullscreen == null || onFullscreen() : onExit && onExit();
    }, [isFullscreen, onFullscreen, onExit]),
    (
      <>
        <button
          className={mergeClassNames(
            "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          disabled={isAnimating}
          onClick={toggleFullscreen}
          title={translations.viewFullscreen}
          type="button"
          {...restProps}
        >
          {jsxRuntimeExports.jsx(maximizeIcon, {
            size: 14,
          })}
        </button>
        {isFullscreen
          ? reactDomExports.createPortal(
              <div
                className={mergeClassNames(
                  "fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm",
                )}
                onClick={toggleFullscreen}
                onKeyDown={(keyboardEvent) => {
                  keyboardEvent.key === "Escape" && toggleFullscreen();
                }}
                role="button"
                tabIndex={0}
              >
                <button
                  className={mergeClassNames(
                    "absolute top-4 right-4 z-10 rounded-md p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
                  )}
                  onClick={toggleFullscreen}
                  title={translations.exitFullscreen}
                  type="button"
                >
                  {jsxRuntimeExports.jsx(closeIcon, {
                    size: 20,
                  })}
                </button>
                <div
                  className={mergeClassNames(
                    "flex size-full items-center justify-center p-4",
                  )}
                  onClick={(clickEvent) => clickEvent.stopPropagation()}
                  onKeyDown={(keyboardEvent) => keyboardEvent.stopPropagation()}
                  role="presentation"
                >
                  {jsxRuntimeExports.jsx(MermaidRenderer, {
                    chart,
                    className: mergeClassNames("size-full [&_svg]:h-auto [&_svg]:w-auto"),
                    config,
                    fullscreen: true,
                    showControls: shouldShowControls,
                  })}
                </div>
              </div>,
              document.body,
            )
          : null}
      </>
    )
  );
};
