// co.jsx
import { L, reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { R, W2, y3 } from "./ae.jsx";
import { D3, de } from "../media-editing/wt.js";

var io = (e2, t2) => {
  var n2;
  let o2 = (n2 = void 0) != null ? n2 : 5;
  return new Promise((r2, s2) => {
    let a2 =
        "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(e2))),
      l2 = new Image();
    ((l2.crossOrigin = "anonymous"),
      (l2.onload = () => {
        let i2 = document.createElement("canvas"),
          d2 = l2.width * o2,
          c3 = l2.height * o2;
        ((i2.width = d2), (i2.height = c3));
        let p3 = i2.getContext("2d");
        if (!p3) {
          s2(new Error("Failed to create 2D canvas context for PNG export"));
          return;
        }
        (p3.drawImage(l2, 0, 0, d2, c3),
          i2.toBlob((m3) => {
            if (!m3) {
              s2(new Error("Failed to create PNG blob"));
              return;
            }
            r2(m3);
          }, "image/png"));
      }),
      (l2.onerror = () => s2(new Error("Failed to load SVG image"))),
      (l2.src = a2));
  });
};

export var co = ({
  chart: e2,
  children: t2,
  className: o2,
  onDownload: n2,
  config: r2,
  onError: s2,
}) => {
  let a2 = y3(),
    [l2, i2] = reactExports.useState(false),
    d2 = reactExports.useRef(null),
    { isAnimating: c3 } = reactExports.useContext(R),
    p3 = L(),
    m3 = de(),
    u4 = D3(),
    f2 = async (h2) => {
      try {
        if (h2 === "mmd") {
          (W2("diagram.mmd", e2, "text/plain"),
            i2(false),
            n2 == null || n2(h2));
          return;
        }
        if (!m3) {
          s2 == null || s2(new Error("Mermaid plugin not available"));
          return;
        }
        let b3 = m3.getMermaid(r2),
          g2 = e2
            .split("")
            .reduce((w3, P3) => ((w3 << 5) - w3 + P3.charCodeAt(0)) | 0, 0),
          T2 = `mermaid-${Math.abs(g2)}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          { svg: v2 } = await b3.render(T2, e2);
        if (!v2) {
          s2 == null ||
            s2(
              new Error(
                "SVG not found. Please wait for the diagram to render.",
              ),
            );
          return;
        }
        if (h2 === "svg") {
          (W2("diagram.svg", v2, "image/svg+xml"),
            i2(false),
            n2 == null || n2(h2));
          return;
        }
        if (h2 === "png") {
          let w3 = await io(v2);
          (W2("diagram.png", w3, "image/png"), n2 == null || n2(h2), i2(false));
          return;
        }
      } catch (b3) {
        s2 == null || s2(b3);
      }
    };
  return (
    reactExports.useEffect(() => {
      let h2 = (b3) => {
        let g2 = b3.composedPath();
        d2.current && !g2.includes(d2.current) && i2(false);
      };
      return (
        document.addEventListener("mousedown", h2),
        () => {
          document.removeEventListener("mousedown", h2);
        }
      );
    }, []),
    (
      <div className={a2("relative")} ref={d2}>
        <button
          className={a2(
            "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
            o2,
          )}
          disabled={c3}
          onClick={() => i2(!l2)}
          title={u4.downloadDiagram}
          type="button"
        >
          {t2 != null ? t2 : <p3.DownloadIcon size={14} />}
        </button>
        {l2 ? (
          <div
            className={a2(
              "absolute top-full right-0 z-10 mt-1 min-w-[120px] overflow-hidden rounded-md border border-border bg-background shadow-lg",
            )}
          >
            <button
              className={a2(
                "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40",
              )}
              onClick={() => f2("svg")}
              title={u4.downloadDiagramAsSvg}
              type="button"
            >
              {u4.mermaidFormatSvg}
            </button>
            <button
              className={a2(
                "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40",
              )}
              onClick={() => f2("png")}
              title={u4.downloadDiagramAsPng}
              type="button"
            >
              {u4.mermaidFormatPng}
            </button>
            <button
              className={a2(
                "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40",
              )}
              onClick={() => f2("mmd")}
              title={u4.downloadDiagramAsMmd}
              type="button"
            >
              {u4.mermaidFormatMmd}
            </button>
          </div>
        ) : null}
      </div>
    )
  );
};
