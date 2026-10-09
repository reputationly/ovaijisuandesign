// st.jsx
import { jsxRuntimeExports, reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ot, rt, y3 } from "./ae.jsx";
import { At } from "./at.jsx";
import { nt } from "../media-editing/wt.js";

var lr = (e2) => {
  let t2 = e2.length;
  for (
    ;
    t2 > 0 &&
    e2[t2 - 1] ===
      `
`;
  )
    t2--;
  return e2.slice(0, t2);
};

var cr = reactExports.lazy(() =>
  (() => import("../highlighted-body-OFNGDK62-D2hkhc6K.js"))().then((e2) => ({
    default: e2.HighlightedCodeBlockBody,
  })),
);

export var st = ({
  code: e2,
  language: t2,
  className: o2,
  children: n2,
  isIncomplete: r2 = false,
  startLine: s2,
  lineNumbers: a2,
  ...l2
}) => {
  let i2 = y3(),
    d2 = reactExports.useMemo(() => lr(e2), [e2]),
    c3 = reactExports.useMemo(
      () => ({
        bg: "transparent",
        fg: "inherit",
        tokens: d2
          .split(
            `
`,
          )
          .map((p3) => [
            {
              content: p3,
              color: "inherit",
              bgColor: "transparent",
              htmlStyle: {},
              offset: 0,
            },
          ]),
      }),
      [d2],
    );
  return (
    <nt.Provider
      value={{
        code: e2,
      }}
    >
      {jsxRuntimeExports.jsxs(ot, {
        isIncomplete: r2,
        language: t2,
        children: [
          jsxRuntimeExports.jsx(rt, {
            language: t2,
          }),
          n2 ? (
            <div
              className={i2(
                "pointer-events-none sticky top-2 z-10 -mt-10 flex h-8 items-center justify-end",
              )}
            >
              <div
                className={i2(
                  "pointer-events-auto flex shrink-0 items-center gap-2 rounded-md border border-sidebar bg-sidebar/80 px-1.5 py-1 supports-[backdrop-filter]:bg-sidebar/70 supports-[backdrop-filter]:backdrop-blur",
                )}
                data-streamdown="code-block-actions"
              >
                {n2}
              </div>
            </div>
          ) : null,
          <reactExports.Suspense
            fallback={
              <At
                className={o2}
                language={t2}
                lineNumbers={a2}
                result={c3}
                startLine={s2}
                {...l2}
              />
            }
          >
            {jsxRuntimeExports.jsx(cr, {
              className: o2,
              code: d2,
              language: t2,
              lineNumbers: a2,
              raw: c3,
              startLine: s2,
              ...l2,
            })}
          </reactExports.Suspense>,
        ],
      })}
    </nt.Provider>
  );
};
