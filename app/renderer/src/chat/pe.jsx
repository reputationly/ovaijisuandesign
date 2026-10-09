// pe.jsx
import { L, ne, re, reactExports, ue } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { R, W2, y3 } from "./ae.jsx";
import { D3 } from "../media-editing/wt.js";

export var Pe = ({
  children: e2,
  className: t2,
  onDownload: o2,
  onError: n2,
}) => {
  let r2 = y3(),
    [s2, a2] = reactExports.useState(false),
    l2 = reactExports.useRef(null),
    { isAnimating: i2 } = reactExports.useContext(R),
    d2 = D3(),
    c3 = L(),
    p3 = (m3) => {
      var u4;
      try {
        let f2 =
            (u4 = l2.current) == null
              ? void 0
              : u4.closest('[data-streamdown="table-wrapper"]'),
          h2 = f2 == null ? void 0 : f2.querySelector("table");
        if (!h2) {
          n2 == null || n2(new Error("Table not found"));
          return;
        }
        let b3 = ue(h2),
          g2 = m3 === "csv" ? ne(b3) : re(b3);
        (W2(
          `table.${m3 === "csv" ? "csv" : "md"}`,
          g2,
          m3 === "csv" ? "text/csv" : "text/markdown",
        ),
          a2(false),
          o2 == null || o2(m3));
      } catch (f2) {
        n2 == null || n2(f2);
      }
    };
  return (
    reactExports.useEffect(() => {
      let m3 = (u4) => {
        let f2 = u4.composedPath();
        l2.current && !f2.includes(l2.current) && a2(false);
      };
      return (
        document.addEventListener("mousedown", m3),
        () => {
          document.removeEventListener("mousedown", m3);
        }
      );
    }, []),
    (
      <div className={r2("relative")} ref={l2}>
        <button
          className={r2(
            "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
            t2,
          )}
          disabled={i2}
          onClick={() => a2(!s2)}
          title={d2.downloadTable}
          type="button"
        >
          {e2 != null ? e2 : <c3.DownloadIcon size={14} />}
        </button>
        {s2 ? (
          <div
            className={r2(
              "absolute top-full right-0 z-20 mt-1 min-w-[120px] overflow-hidden rounded-md border border-border bg-background shadow-lg",
            )}
          >
            <button
              className={r2(
                "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40",
              )}
              onClick={() => p3("csv")}
              title={d2.downloadTableAsCsv}
              type="button"
            >
              {d2.tableFormatCsv}
            </button>
            <button
              className={r2(
                "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40",
              )}
              onClick={() => p3("markdown")}
              title={d2.downloadTableAsMarkdown}
              type="button"
            >
              {d2.tableFormatMarkdown}
            </button>
          </div>
        ) : null}
      </div>
    )
  );
};
