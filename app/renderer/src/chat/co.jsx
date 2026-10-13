// co.jsx
import { L as useIcons, reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { R as markdownRenderOptionsContext, W2 as downloadFile, y3 as useClassNameMerger } from "./ae.jsx";
import { D3 as useStreamdownLabels, de as useMermaidPlugin } from "../media-editing/wt.js";

var convertSvgToPngBlob = (svgMarkup, options) => {
  var undefinedValue;
  let scale = (undefinedValue = void 0) != null ? undefinedValue : 5;
  return new Promise((resolve, reject) => {
    let svgDataUrl =
        "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgMarkup))),
      image = new Image();
    ((image.crossOrigin = "anonymous"),
      (image.onload = () => {
        let canvas = document.createElement("canvas"),
          canvasWidth = image.width * scale,
          canvasHeight = image.height * scale;
        ((canvas.width = canvasWidth), (canvas.height = canvasHeight));
        let context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Failed to create 2D canvas context for PNG export"));
          return;
        }
        (context.drawImage(image, 0, 0, canvasWidth, canvasHeight),
          canvas.toBlob((pngBlob) => {
            if (!pngBlob) {
              reject(new Error("Failed to create PNG blob"));
              return;
            }
            resolve(pngBlob);
          }, "image/png"));
      }),
      (image.onerror = () => reject(new Error("Failed to load SVG image"))),
      (image.src = svgDataUrl));
  });
};

export var co = ({
  chart,
  children,
  className,
  onDownload,
  config,
  onError,
}) => {
  let mergeClassNames = useClassNameMerger(),
    [isMenuOpen, setIsMenuOpen] = reactExports.useState(false),
    menuRef = reactExports.useRef(null),
    { isAnimating } = reactExports.useContext(markdownRenderOptionsContext),
    icons = useIcons(),
    mermaidPlugin = useMermaidPlugin(),
    translations = useStreamdownLabels(),
    downloadDiagram = async (format) => {
      try {
        if (format === "mmd") {
          (downloadFile("diagram.mmd", chart, "text/plain"),
            setIsMenuOpen(false),
            onDownload == null || onDownload(format));
          return;
        }
        if (!mermaidPlugin) {
          onError == null || onError(new Error("Mermaid plugin not available"));
          return;
        }
        let mermaid = mermaidPlugin.getMermaid(config),
          chartHash = chart
            .split("")
            .reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0),
          renderId = `mermaid-${Math.abs(chartHash)}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          { svg: svgOutput } = await mermaid.render(renderId, chart);
        if (!svgOutput) {
          onError == null ||
            onError(
              new Error(
                "SVG not found. Please wait for the diagram to render.",
              ),
            );
          return;
        }
        if (format === "svg") {
          (downloadFile("diagram.svg", svgOutput, "image/svg+xml"),
            setIsMenuOpen(false),
            onDownload == null || onDownload(format));
          return;
        }
        if (format === "png") {
          let pngBlob = await convertSvgToPngBlob(svgOutput);
          (downloadFile("diagram.png", pngBlob, "image/png"), onDownload == null || onDownload(format), setIsMenuOpen(false));
          return;
        }
      } catch (error) {
        onError == null || onError(error);
      }
    };
  return (
    reactExports.useEffect(() => {
      let handleOutsideMouseDown = (mouseEvent) => {
        let eventPath = mouseEvent.composedPath();
        menuRef.current && !eventPath.includes(menuRef.current) && setIsMenuOpen(false);
      };
      return (
        document.addEventListener("mousedown", handleOutsideMouseDown),
        () => {
          document.removeEventListener("mousedown", handleOutsideMouseDown);
        }
      );
    }, []),
    (
      <div className={mergeClassNames("relative")} ref={menuRef}>
        <button
          className={mergeClassNames(
            "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          disabled={isAnimating}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          title={translations.downloadDiagram}
          type="button"
        >
          {children != null ? children : <icons.DownloadIcon size={14} />}
        </button>
        {isMenuOpen ? (
          <div
            className={mergeClassNames(
              "absolute top-full right-0 z-10 mt-1 min-w-[120px] overflow-hidden rounded-md border border-border bg-background shadow-lg",
            )}
          >
            <button
              className={mergeClassNames(
                "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40",
              )}
              onClick={() => downloadDiagram("svg")}
              title={translations.downloadDiagramAsSvg}
              type="button"
            >
              {translations.mermaidFormatSvg}
            </button>
            <button
              className={mergeClassNames(
                "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40",
              )}
              onClick={() => downloadDiagram("png")}
              title={translations.downloadDiagramAsPng}
              type="button"
            >
              {translations.mermaidFormatPng}
            </button>
            <button
              className={mergeClassNames(
                "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40",
              )}
              onClick={() => downloadDiagram("mmd")}
              title={translations.downloadDiagramAsMmd}
              type="button"
            >
              {translations.mermaidFormatMmd}
            </button>
          </div>
        ) : null}
      </div>
    )
  );
};
