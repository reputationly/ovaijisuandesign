// at.jsx
import { he, y3 } from "./ae.jsx";
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";

var tr = he(
  "block",
  "before:content-[counter(line)]",
  "before:inline-block",
  "before:[counter-increment:line]",
  "before:w-6",
  "before:mr-4",
  "before:text-[13px]",
  "before:text-right",
  "before:text-muted-foreground/50",
  "before:font-mono",
  "before:select-none",
);

var or = (e2) => {
  let t2 = {};
  for (let o2 of e2.split(";")) {
    let n2 = o2.indexOf(":");
    if (n2 > 0) {
      let r2 = o2.slice(0, n2).trim(),
        s2 = o2.slice(n2 + 1).trim();
      r2 && s2 && (t2[r2] = s2);
    }
  }
  return t2;
};

export var At = reactExports.memo(
  ({
    children: e2,
    result: t2,
    language: o2,
    className: n2,
    startLine: r2,
    lineNumbers: s2 = true,
    ...a2
  }) => {
    let l2 = y3(),
      i2 = reactExports.useMemo(() => l2(tr), [l2]),
      d2 = reactExports.useMemo(() => {
        let c3 = {};
        return (
          t2.bg && (c3["--sdm-bg"] = t2.bg),
          t2.fg && (c3["--sdm-fg"] = t2.fg),
          t2.rootStyle && Object.assign(c3, or(t2.rootStyle)),
          c3
        );
      }, [t2.bg, t2.fg, t2.rootStyle]);
    return (
      <div
        className={l2(
          n2,
          "overflow-x-auto rounded-md border border-border bg-background p-4 text-sm",
        )}
        data-language={o2}
        data-streamdown="code-block-body"
        {...a2}
      >
        <pre
          className={l2(
            n2,
            "bg-[var(--sdm-bg,inherit]",
            "dark:bg-[var(--shiki-dark-bg,var(--sdm-bg,inherit)]",
          )}
          style={d2}
        >
          <code
            className={
              s2
                ? l2("[counter-increment:line_0] [counter-reset:line]")
                : void 0
            }
            style={
              s2 && r2 && r2 > 1
                ? {
                    counterReset: `line ${r2 - 1}`,
                  }
                : void 0
            }
          >
            {t2.tokens.map((c3, p3) => (
              <span key={p3} className={s2 ? i2 : void 0}>
                {c3.length === 0 || (c3.length === 1 && c3[0].content === "")
                  ? `
`
                  : c3.map((m3, u4) => {
                      let f2 = {},
                        h2 = !!m3.bgColor;
                      if (
                        (m3.color && (f2["--sdm-c"] = m3.color),
                        m3.bgColor && (f2["--sdm-tbg"] = m3.bgColor),
                        m3.htmlStyle)
                      )
                        for (let [b3, g2] of Object.entries(m3.htmlStyle))
                          b3 === "color"
                            ? (f2["--sdm-c"] = g2)
                            : b3 === "background-color"
                              ? ((f2["--sdm-tbg"] = g2), (h2 = true))
                              : (f2[b3] = g2);
                      return (
                        <span
                          key={u4}
                          className={l2(
                            "text-[var(--sdm-c,inherit)]",
                            "dark:text-[var(--shiki-dark,var(--sdm-c,inherit))]",
                            h2 && "bg-[var(--sdm-tbg)]",
                            h2 &&
                              "dark:bg-[var(--shiki-dark-bg,var(--sdm-tbg))]",
                          )}
                          style={f2}
                          {...m3.htmlAttrs}
                        >
                          {m3.content}
                        </span>
                      );
                    })}
              </span>
            ))}
          </code>
        </pre>
      </div>
    );
  },
  (e2, t2) =>
    e2.result === t2.result &&
    e2.language === t2.language &&
    e2.className === t2.className &&
    e2.startLine === t2.startLine &&
    e2.lineNumbers === t2.lineNumbers,
);
