// te.jsx
import {
  dt,
  jsxRuntimeExports,
  L,
  ne,
  re,
  reactExports,
  ue,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { R, y3 } from "./ae.jsx";
import { D3 } from "../media-editing/wt.js";

export var Te = ({
  children: e2,
  className: t2,
  onCopy: o2,
  onError: n2,
  timeout: r2 = 2e3,
}) => {
  let s2 = y3(),
    [a2, l2] = reactExports.useState(false),
    [i2, d2] = reactExports.useState(false),
    c3 = reactExports.useRef(null),
    p3 = reactExports.useRef(0),
    { isAnimating: m3 } = reactExports.useContext(R),
    u4 = D3(),
    f2 = async (g2) => {
      var T2, v2;
      if (
        typeof window == "undefined" ||
        !(
          (T2 = navigator == null ? void 0 : navigator.clipboard) != null &&
          T2.write
        )
      ) {
        n2 == null || n2(new Error("Clipboard API not available"));
        return;
      }
      try {
        let w3 =
            (v2 = c3.current) == null
              ? void 0
              : v2.closest('[data-streamdown="table-wrapper"]'),
          P3 = w3 == null ? void 0 : w3.querySelector("table");
        if (!P3) {
          n2 == null || n2(new Error("Table not found"));
          return;
        }
        let M2 = ue(P3),
          F2 = (
            {
              csv: ne,
              tsv: dt,
              md: re,
            }[g2] || re
          )(M2),
          j2 = new ClipboardItem({
            "text/plain": new Blob([F2], {
              type: "text/plain",
            }),
            "text/html": new Blob([P3.outerHTML], {
              type: "text/html",
            }),
          });
        (await navigator.clipboard.write([j2]),
          d2(true),
          l2(false),
          o2 == null || o2(g2),
          (p3.current = window.setTimeout(() => d2(false), r2)));
      } catch (w3) {
        n2 == null || n2(w3);
      }
    };
  reactExports.useEffect(() => {
    let g2 = (T2) => {
      let v2 = T2.composedPath();
      c3.current && !v2.includes(c3.current) && l2(false);
    };
    return (
      document.addEventListener("mousedown", g2),
      () => {
        (document.removeEventListener("mousedown", g2),
          window.clearTimeout(p3.current));
      }
    );
  }, []);
  let h2 = L(),
    b3 = i2 ? h2.CheckIcon : h2.CopyIcon;
  return (
    <div className={s2("relative")} ref={c3}>
      <button
        className={s2(
          "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
          t2,
        )}
        disabled={m3}
        onClick={() => l2(!a2)}
        title={u4.copyTable}
        type="button"
      >
        {e2 != null
          ? e2
          : jsxRuntimeExports.jsx(b3, {
              height: 14,
              width: 14,
            })}
      </button>
      {a2 ? (
        <div
          className={s2(
            "absolute top-full right-0 z-20 mt-1 min-w-[120px] overflow-hidden rounded-md border border-border bg-background shadow-lg",
          )}
        >
          <button
            className={s2(
              "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40",
            )}
            onClick={() => f2("md")}
            title={u4.copyTableAsMarkdown}
            type="button"
          >
            {u4.tableFormatMarkdown}
          </button>
          <button
            className={s2(
              "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40",
            )}
            onClick={() => f2("csv")}
            title={u4.copyTableAsCsv}
            type="button"
          >
            {u4.tableFormatCsv}
          </button>
          <button
            className={s2(
              "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40",
            )}
            onClick={() => f2("tsv")}
            title={u4.copyTableAsTsv}
            type="button"
          >
            {u4.tableFormatTsv}
          </button>
        </div>
      ) : null}
    </div>
  );
};
