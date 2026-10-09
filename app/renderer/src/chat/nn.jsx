// nn.jsx
import { jsxRuntimeExports, L, reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { R, y3 } from "./ae.jsx";
import { de } from "../media-editing/wt.js";

var Bn = 300;

var An = "300px";

var On = 500;

function Rt(e2 = {}) {
  let {
      immediate: t2 = false,
      debounceDelay: o2 = Bn,
      rootMargin: n2 = An,
      idleTimeout: r2 = On,
    } = e2,
    [s2, a2] = reactExports.useState(false),
    l2 = reactExports.useRef(null),
    i2 = reactExports.useRef(null),
    d2 = reactExports.useRef(null),
    c3 = reactExports.useMemo(
      () => (u4) => {
        let f2 = Date.now();
        return window.setTimeout(() => {
          u4({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - f2)),
          });
        }, 1);
      },
      [],
    ),
    p3 = reactExports.useMemo(
      () =>
        typeof window != "undefined" && window.requestIdleCallback
          ? (u4, f2) => window.requestIdleCallback(u4, f2)
          : c3,
      [c3],
    ),
    m3 = reactExports.useMemo(
      () =>
        typeof window != "undefined" && window.cancelIdleCallback
          ? (u4) => window.cancelIdleCallback(u4)
          : (u4) => {
              clearTimeout(u4);
            },
      [],
    );
  return (
    reactExports.useEffect(() => {
      if (t2) {
        a2(true);
        return;
      }
      let u4 = l2.current;
      if (!u4) return;
      (i2.current && (clearTimeout(i2.current), (i2.current = null)),
        d2.current && (m3(d2.current), (d2.current = null)));
      let f2 = () => {
          (i2.current && (clearTimeout(i2.current), (i2.current = null)),
            d2.current && (m3(d2.current), (d2.current = null)));
        },
        h2 = (v2) => {
          d2.current = p3(
            (w3) => {
              w3.timeRemaining() > 0 || w3.didTimeout
                ? (a2(true), v2.disconnect())
                : (d2.current = p3(
                    () => {
                      (a2(true), v2.disconnect());
                    },
                    {
                      timeout: r2 / 2,
                    },
                  ));
            },
            {
              timeout: r2,
            },
          );
        },
        b3 = (v2) => {
          (f2(),
            (i2.current = window.setTimeout(() => {
              var M2, H2;
              let w3 = v2.takeRecords();
              (w3.length === 0 ||
                ((H2 = (M2 = w3.at(-1)) == null ? void 0 : M2.isIntersecting) !=
                  null &&
                  H2)) &&
                h2(v2);
            }, o2)));
        },
        g2 = (v2, w3) => {
          v2.isIntersecting ? b3(w3) : f2();
        },
        T2 = new IntersectionObserver(
          (v2) => {
            for (let w3 of v2) g2(w3, T2);
          },
          {
            rootMargin: n2,
            threshold: 0,
          },
        );
      return (
        T2.observe(u4),
        () => {
          (i2.current && clearTimeout(i2.current),
            d2.current && m3(d2.current),
            T2.disconnect());
        }
      );
    }, [t2, o2, n2, r2, m3, p3]),
    {
      shouldRender: s2,
      containerRef: l2,
    }
  );
}

var Nn = ({
  children: e2,
  className: t2,
  minZoom: o2 = 0.5,
  maxZoom: n2 = 3,
  zoomStep: r2 = 0.1,
  showControls: s2 = true,
  initialZoom: a2 = 1,
  fullscreen: l2 = false,
}) => {
  let { RotateCcwIcon: i2, ZoomInIcon: d2, ZoomOutIcon: c3 } = L(),
    p3 = y3(),
    m3 = reactExports.useRef(null),
    u4 = reactExports.useRef(null),
    [f2, h2] = reactExports.useState(a2),
    [b3, g2] = reactExports.useState({
      x: 0,
      y: 0,
    }),
    [T2, v2] = reactExports.useState(false),
    [w3, P3] = reactExports.useState({
      x: 0,
      y: 0,
    }),
    [M2, H2] = reactExports.useState({
      x: 0,
      y: 0,
    }),
    S3 = reactExports.useCallback(
      (x2) => {
        h2((q2) => Math.max(o2, Math.min(n2, q2 + x2)));
      },
      [o2, n2],
    ),
    F2 = reactExports.useCallback(() => {
      S3(r2);
    }, [S3, r2]),
    j2 = reactExports.useCallback(() => {
      S3(-r2);
    }, [S3, r2]),
    z3 = reactExports.useCallback(() => {
      (h2(a2),
        g2({
          x: 0,
          y: 0,
        }));
    }, [a2]),
    B2 = reactExports.useCallback(
      (x2) => {
        x2.preventDefault();
        let q2 = x2.deltaY > 0 ? -r2 : r2;
        S3(q2);
      },
      [S3, r2],
    ),
    _2 = reactExports.useCallback(
      (x2) => {
        if (x2.button !== 0 || x2.isPrimary === false) return;
        (v2(true),
          P3({
            x: x2.clientX,
            y: x2.clientY,
          }),
          H2(b3));
        let q2 = x2.currentTarget;
        q2 instanceof HTMLElement && q2.setPointerCapture(x2.pointerId);
      },
      [b3],
    ),
    Q2 = reactExports.useCallback(
      (x2) => {
        if (!T2) return;
        x2.preventDefault();
        let q2 = x2.clientX - w3.x,
          X2 = x2.clientY - w3.y;
        g2({
          x: M2.x + q2,
          y: M2.y + X2,
        });
      },
      [T2, w3, M2],
    ),
    U2 = reactExports.useCallback((x2) => {
      v2(false);
      let q2 = x2.currentTarget;
      q2 instanceof HTMLElement && q2.releasePointerCapture(x2.pointerId);
    }, []);
  return (
    reactExports.useEffect(() => {
      let x2 = m3.current;
      if (x2)
        return (
          x2.addEventListener("wheel", B2, {
            passive: false,
          }),
          () => {
            x2.removeEventListener("wheel", B2);
          }
        );
    }, [B2]),
    reactExports.useEffect(() => {
      let x2 = u4.current;
      if (x2 && T2)
        return (
          (document.body.style.userSelect = "none"),
          x2.addEventListener("pointermove", Q2, {
            passive: false,
          }),
          x2.addEventListener("pointerup", U2),
          x2.addEventListener("pointercancel", U2),
          () => {
            ((document.body.style.userSelect = ""),
              x2.removeEventListener("pointermove", Q2),
              x2.removeEventListener("pointerup", U2),
              x2.removeEventListener("pointercancel", U2));
          }
        );
    }, [T2, Q2, U2]),
    (
      <div
        className={p3(
          "relative flex flex-col",
          l2 ? "h-full w-full" : "min-h-28 w-full",
          t2,
        )}
        ref={m3}
        style={{
          cursor: T2 ? "grabbing" : "grab",
        }}
      >
        {s2 ? (
          <div
            className={p3(
              "absolute z-10 flex flex-col gap-1 rounded-md border border-border bg-background/80 p-1 supports-[backdrop-filter]:bg-background/70 supports-[backdrop-filter]:backdrop-blur-sm",
              l2 ? "bottom-4 left-4" : "bottom-2 left-2",
            )}
          >
            <button
              className={p3(
                "flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
              )}
              disabled={f2 >= n2}
              onClick={F2}
              title="Zoom in"
              type="button"
            >
              {jsxRuntimeExports.jsx(d2, {
                size: 16,
              })}
            </button>
            <button
              className={p3(
                "flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
              )}
              disabled={f2 <= o2}
              onClick={j2}
              title="Zoom out"
              type="button"
            >
              {jsxRuntimeExports.jsx(c3, {
                size: 16,
              })}
            </button>
            <button
              className={p3(
                "flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              )}
              onClick={z3}
              title="Reset zoom and pan"
              type="button"
            >
              {jsxRuntimeExports.jsx(i2, {
                size: 16,
              })}
            </button>
          </div>
        ) : null}
        <div
          className={p3(
            "flex-1 origin-center transition-transform duration-150 ease-out",
            l2
              ? "flex h-full w-full items-center justify-center"
              : "flex w-full items-center justify-center",
          )}
          onPointerDown={_2}
          ref={u4}
          role="application"
          style={{
            transform: `translate(${b3.x}px, ${b3.y}px) scale(${f2})`,
            transformOrigin: "center center",
            touchAction: "none",
            willChange: "transform",
          }}
        >
          {e2}
        </div>
      </div>
    )
  );
};

export var po = ({
  chart: e2,
  className: t2,
  config: o2,
  fullscreen: n2 = false,
  showControls: r2 = true,
}) => {
  let s2 = y3(),
    [a2, l2] = reactExports.useState(null),
    [i2, d2] = reactExports.useState(false),
    [c3, p3] = reactExports.useState(""),
    [m3, u4] = reactExports.useState(""),
    [f2, h2] = reactExports.useState(0),
    { mermaid: b3 } = reactExports.useContext(R),
    g2 = de(),
    T2 = b3 == null ? void 0 : b3.errorComponent,
    { shouldRender: v2, containerRef: w3 } = Rt({
      immediate: n2,
    });
  if (
    (reactExports.useEffect(() => {
      if (!v2) return;
      if (!g2) {
        l2(
          "Mermaid plugin not available. Please add the mermaid plugin to enable diagram rendering.",
        );
        return;
      }
      (async () => {
        try {
          (l2(null), d2(true));
          let H2 = g2.getMermaid(o2),
            S3 = e2
              .split("")
              .reduce((z3, B2) => ((z3 << 5) - z3 + B2.charCodeAt(0)) | 0, 0),
            F2 = `mermaid-${Math.abs(S3)}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            { svg: j2 } = await H2.render(F2, e2);
          (p3(j2), u4(j2));
        } catch (H2) {
          if (!(m3 || c3)) {
            let S3 =
              H2 instanceof Error
                ? H2.message
                : "Failed to render Mermaid chart";
            l2(S3);
          }
        } finally {
          d2(false);
        }
      })();
    }, [e2, o2, f2, v2, g2]),
    !(v2 || c3 || m3))
  )
    return <div className={s2("my-4 min-h-[200px]", t2)} ref={w3} />;
  if (i2 && !c3 && !m3)
    return (
      <div className={s2("my-4 flex justify-center p-4", t2)} ref={w3}>
        <div
          className={s2("flex items-center space-x-2 text-muted-foreground")}
        >
          <div
            className={s2(
              "h-4 w-4 animate-spin rounded-full border-current border-b-2",
            )}
          />
          <span className={s2("text-sm")}>Loading diagram...</span>
        </div>
      </div>
    );
  if (a2 && !c3 && !m3) {
    let M2 = () => h2((H2) => H2 + 1);
    return T2 ? (
      <div ref={w3}>
        <T2 chart={e2} error={a2} retry={M2} />
      </div>
    ) : (
      <div className={s2("rounded-md bg-red-50 p-4", t2)} ref={w3}>
        <p className={s2("font-mono text-red-700 text-sm")}>
          {"Mermaid Error: "}
          {a2}
        </p>
        <details className={s2("mt-2")}>
          <summary className={s2("cursor-pointer text-red-600 text-xs")}>
            Show Code
          </summary>
          <pre
            className={s2(
              "mt-2 overflow-x-auto rounded bg-red-100 p-2 text-red-800 text-xs",
            )}
          >
            {e2}
          </pre>
        </details>
      </div>
    );
  }
  let P3 = c3 || m3;
  return (
    <div className={s2("size-full", t2)} data-streamdown="mermaid" ref={w3}>
      <Nn
        className={s2(n2 ? "size-full overflow-hidden" : "overflow-hidden", t2)}
        fullscreen={n2}
        maxZoom={3}
        minZoom={0.5}
        showControls={r2}
        zoomStep={0.1}
      >
        <div
          aria-label="Mermaid chart"
          className={s2(
            "flex justify-center",
            n2 ? "size-full items-center" : null,
          )}
          dangerouslySetInnerHTML={{
            __html: P3,
          }}
          role="img"
        />
      </Nn>
    </div>
  );
};
