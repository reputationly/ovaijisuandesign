// fo.jsx
import {
  jsxRuntimeExports,
  L,
  reactDomExports,
  reactExports,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ce, le, R, y3 } from "./ae.jsx";
import { po } from "./nn.jsx";
import { D3 } from "../media-editing/wt.js";

export var fo = ({
  chart: e2,
  config: t2,
  onFullscreen: o2,
  onExit: n2,
  className: r2,
  ...s2
}) => {
  let { Maximize2Icon: a2, XIcon: l2 } = L(),
    i2 = y3(),
    [d2, c3] = reactExports.useState(false),
    { isAnimating: p3, controls: m3 } = reactExports.useContext(R),
    u4 = D3(),
    f2 = (() => {
      if (typeof m3 == "boolean") return m3;
      let b3 = m3.mermaid;
      return b3 === false
        ? false
        : b3 === true || b3 === void 0
          ? true
          : b3.panZoom !== false;
    })(),
    h2 = () => {
      c3(!d2);
    };
  return (
    reactExports.useEffect(() => {
      if (d2) {
        le();
        let b3 = (g2) => {
          g2.key === "Escape" && c3(false);
        };
        return (
          document.addEventListener("keydown", b3),
          () => {
            (document.removeEventListener("keydown", b3), ce());
          }
        );
      }
    }, [d2]),
    reactExports.useEffect(() => {
      d2 ? o2 == null || o2() : n2 && n2();
    }, [d2, o2, n2]),
    (
      <>
        <button
          className={i2(
            "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
            r2,
          )}
          disabled={p3}
          onClick={h2}
          title={u4.viewFullscreen}
          type="button"
          {...s2}
        >
          {jsxRuntimeExports.jsx(a2, {
            size: 14,
          })}
        </button>
        {d2
          ? reactDomExports.createPortal(
              <div
                className={i2(
                  "fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm",
                )}
                onClick={h2}
                onKeyDown={(b3) => {
                  b3.key === "Escape" && h2();
                }}
                role="button"
                tabIndex={0}
              >
                <button
                  className={i2(
                    "absolute top-4 right-4 z-10 rounded-md p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
                  )}
                  onClick={h2}
                  title={u4.exitFullscreen}
                  type="button"
                >
                  {jsxRuntimeExports.jsx(l2, {
                    size: 20,
                  })}
                </button>
                <div
                  className={i2(
                    "flex size-full items-center justify-center p-4",
                  )}
                  onClick={(b3) => b3.stopPropagation()}
                  onKeyDown={(b3) => b3.stopPropagation()}
                  role="presentation"
                >
                  {jsxRuntimeExports.jsx(po, {
                    chart: e2,
                    className: i2("size-full [&_svg]:h-auto [&_svg]:w-auto"),
                    config: t2,
                    fullscreen: true,
                    showControls: f2,
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
