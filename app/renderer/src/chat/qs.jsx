// qs.jsx
import {
  at,
  BlockPolicy,
  clsx,
  cn,
  createVisitor,
  defaultSchema,
  E2,
  Jo,
  jsxRuntimeExports,
  kt,
  L,
  ln,
  mn,
  qe,
  reactDomExports,
  reactExports,
  remarkGfm,
  stripNullChildren,
  toJsxRuntime,
  un,
  visit,
} from "../vendor.js";
import {
  Be,
  D3,
  de,
  De,
  et,
  He,
  ks,
  on,
  Ts,
  tt,
  Ve,
  vs,
  wt,
  xs,
} from "../media-editing/wt.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { rehypeSanitize } from "../settings/request-prompt-prefill.jsx";
import { rehypeRaw } from "../workspace/build-inspiration-media-showcase-collections.js";
import { Ae, ao, ce, Ee, Fe, he, le, Oe, R, To, W2, y3 } from "./ae.jsx";
import { mermaidGHXKKRXX } from "./mermaid-ghxkkrxx.js";
import { Yt } from "./yt.js";
import { st } from "./st.jsx";
import { co } from "./co.jsx";
import { fo } from "./fo.jsx";
import { Te } from "./te.jsx";
import { Pe } from "./pe.jsx";
import { twMerge } from "../infra/dialog-content.jsx";
import { $e$1, be } from "../vendor-inline/minified/s2.js";
import { vn, xn } from "./xn.js";

var as = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

var is = new RegExp("\\p{L}", "u");

function $e(e2) {
  let t2 = e2
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*{1,3}|_{1,3})/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^[\s>*\-+\d.]+/gm, "");
  for (let o2 of t2) {
    if (as.test(o2)) return "rtl";
    if (is.test(o2)) return "ltr";
  }
  return "ltr";
}

var ls = /^[ \t]{0,3}(`{3,}|~{3,})/;

var cs = /^\|?[ \t]*:?-{1,}:?[ \t]*(\|[ \t]*:?-{1,}:?[ \t]*)*\|?$/;

var ht = (e2) => {
  let t2 = e2.split(`
`),
    o2 = null,
    n2 = 0;
  for (let r2 of t2) {
    let s2 = ls.exec(r2);
    if (o2 === null) {
      if (s2) {
        let a2 = s2[1];
        ((o2 = a2[0]), (n2 = a2.length));
      }
    } else if (s2) {
      let a2 = s2[1],
        l2 = a2[0],
        i2 = a2.length;
      l2 === o2 && i2 >= n2 && ((o2 = null), (n2 = 0));
    }
  }
  return o2 !== null;
};

var Uo = (e2) => {
  let t2 = e2.split(`
`);
  for (let o2 of t2) {
    let n2 = o2.trim();
    if (n2.length > 0 && n2.includes("|") && cs.test(n2)) return true;
  }
  return false;
};

var tn = new wt();

var ws = (e2) => {
  let t2 = tn.get(e2);
  if (t2) return t2;
  let o2 = ks(e2);
  return (tn.set(e2, o2), o2);
};

var Ps = (e2, t2) => {
  let {
    allowElement: o2,
    allowedElements: n2,
    disallowedElements: r2,
    skipHtml: s2,
    unwrapDisallowed: a2,
    urlTransform: l2,
  } = t2;
  if (o2 || n2 || r2 || s2 || l2) {
    let d2 = l2 || on;
    visit(e2, (c3, p3, m3) => {
      if (c3.type === "raw" && m3 && typeof p3 == "number")
        return (vs(m3, p3, s2, c3.value), p3);
      if (
        c3.type === "element" &&
        (xs(c3, d2), Ts(c3, p3, m3, n2, r2, o2) && m3 && typeof p3 == "number")
      )
        return (
          a2 && c3.children
            ? m3.children.splice(p3, 1, ...c3.children)
            : m3.children.splice(p3, 1),
          p3
        );
    });
  }
  return toJsxRuntime(e2, {
    Fragment: jsxRuntimeExports.Fragment,
    components: t2.components,
    ignoreInvalidStyle: true,
    jsx: jsxRuntimeExports.jsx,
    jsxs: jsxRuntimeExports.jsxs,
    passKeys: true,
    passNode: true,
  });
};

var Ct2 = (e2) => {
  let t2 = ws(e2),
    o2 = e2.children || "",
    n2 = t2.runSync(t2.parse(o2), o2);
  return Ps(n2, e2);
};

function harden({
  defaultOrigin = "",
  allowedLinkPrefixes = [],
  allowedImagePrefixes = [],
  allowDataImages = false,
  allowedProtocols = [],
  blockedImageClass = "inline-block bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1 rounded text-sm",
  blockedLinkClass = "text-gray-500",
  linkBlockPolicy = BlockPolicy.indicator,
  imageBlockPolicy = BlockPolicy.indicator,
}) {
  const hasSpecificLinkPrefixes =
    allowedLinkPrefixes.length &&
    !allowedLinkPrefixes.every((p3) => p3 === "*");
  const hasSpecificImagePrefixes =
    allowedImagePrefixes.length &&
    !allowedImagePrefixes.every((p3) => p3 === "*");
  if (!defaultOrigin && (hasSpecificLinkPrefixes || hasSpecificImagePrefixes)) {
    throw new Error(
      "defaultOrigin is required when allowedLinkPrefixes or allowedImagePrefixes are provided",
    );
  }
  return (tree) => {
    const visitor = createVisitor(
      defaultOrigin,
      allowedLinkPrefixes,
      allowedImagePrefixes,
      allowDataImages,
      allowedProtocols,
      blockedImageClass,
      blockedLinkClass,
      linkBlockPolicy,
      imageBlockPolicy,
    );
    stripNullChildren(tree);
    visit(tree, visitor);
  };
}

var Gn = (e2, t2) => {
  if (!e2 || !t2) return t2;
  let o2 = `${e2}:`;
  return t2
    .split(/\s+/)
    .filter(Boolean)
    .map((n2) => (n2.startsWith(o2) ? n2 : `${e2}:${n2}`))
    .join(" ");
};

var Dt = (e2) => (e2 ? (...t2) => Gn(e2, twMerge(clsx(t2))) : he);

var it = ({
  onDownload: e2,
  onError: t2,
  language: o2,
  children: n2,
  className: r2,
  code: s2,
  ...a2
}) => {
  let l2 = y3(),
    { code: i2 } = He(),
    { isAnimating: d2 } = reactExports.useContext(R),
    c3 = D3(),
    p3 = L(),
    m3 = s2 != null ? s2 : i2,
    f2 = `file.${o2 && o2 in Yt ? Yt[o2] : "txt"}`,
    h2 = "text/plain",
    b3 = () => {
      try {
        (W2(f2, m3, h2), e2 == null || e2());
      } catch (g2) {
        t2 == null || t2(g2);
      }
    };
  return (
    <button
      className={l2(
        "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
        r2,
      )}
      data-streamdown="code-block-download-button"
      disabled={d2}
      onClick={b3}
      title={c3.downloadFile}
      type="button"
      {...a2}
    >
      {n2 != null ? n2 : <p3.DownloadIcon size={14} />}
    </button>
  );
};

var Mr = /\.[^/.]+$/;

var oo = ({
  node: e2,
  className: t2,
  src: o2,
  alt: n2,
  onLoad: r2,
  onError: s2,
  ...a2
}) => {
  let { DownloadIcon: l2 } = L(),
    i2 = y3(),
    d2 = reactExports.useRef(null),
    [c3, p3] = reactExports.useState(false),
    [m3, u4] = reactExports.useState(false),
    f2 = D3(),
    h2 = a2.width != null || a2.height != null,
    b3 = (c3 || h2) && !m3,
    g2 = m3 && !h2;
  reactExports.useEffect(() => {
    let P3 = d2.current;
    if (P3 != null && P3.complete) {
      let M2 = P3.naturalWidth > 0;
      (p3(M2), u4(!M2));
    }
  }, []);
  let T2 = reactExports.useCallback(
      (P3) => {
        (p3(true), u4(false), r2 == null || r2(P3));
      },
      [r2],
    ),
    v2 = reactExports.useCallback(
      (P3) => {
        (p3(false), u4(true), s2 == null || s2(P3));
      },
      [s2],
    ),
    w3 = async () => {
      if (o2)
        try {
          let M2 = await (await fetch(o2)).blob(),
            S3 =
              new URL(o2, window.location.origin).pathname.split("/").pop() ||
              "",
            F2 = S3.split(".").pop(),
            j2 = S3.includes(".") && F2 !== void 0 && F2.length <= 4,
            z3 = "";
          if (j2) z3 = S3;
          else {
            let B2 = M2.type,
              _2 = "png";
            (B2.includes("jpeg") || B2.includes("jpg")
              ? (_2 = "jpg")
              : B2.includes("png")
                ? (_2 = "png")
                : B2.includes("svg")
                  ? (_2 = "svg")
                  : B2.includes("gif")
                    ? (_2 = "gif")
                    : B2.includes("webp") && (_2 = "webp"),
              (z3 = `${(n2 || S3 || "image").replace(Mr, "")}.${_2}`));
          }
          W2(z3, M2, M2.type);
        } catch (P3) {
          window.open(o2, "_blank");
        }
    };
  return o2 ? (
    <div
      className={i2("group relative my-4 inline-block")}
      data-streamdown="image-wrapper"
    >
      <img
        alt={n2}
        className={i2("max-w-full rounded-lg", g2 && "hidden", t2)}
        data-streamdown="image"
        onError={v2}
        onLoad={T2}
        ref={d2}
        src={o2}
        {...a2}
      />
      {g2 && (
        <span
          className={i2("text-muted-foreground text-xs italic")}
          data-streamdown="image-fallback"
        >
          {f2.imageNotAvailable}
        </span>
      )}
      <div
        className={i2(
          "pointer-events-none absolute inset-0 hidden rounded-lg bg-black/10 group-hover:block",
        )}
      />
      {b3 && (
        <button
          className={i2(
            "absolute right-2 bottom-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border bg-background/90 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-background",
            "opacity-0 group-hover:opacity-100",
          )}
          onClick={w3}
          title={f2.downloadImage}
          type="button"
        >
          {jsxRuntimeExports.jsx(l2, {
            size: 14,
          })}
        </button>
      )}
    </div>
  ) : null;
};

var so = ({ url: e2, isOpen: t2, onClose: o2, onConfirm: n2 }) => {
  let { CheckIcon: r2, CopyIcon: s2, ExternalLinkIcon: a2, XIcon: l2 } = L(),
    i2 = y3(),
    [d2, c3] = reactExports.useState(false),
    p3 = D3(),
    m3 = reactExports.useCallback(async () => {
      try {
        (await navigator.clipboard.writeText(e2),
          c3(true),
          setTimeout(() => c3(false), 2e3));
      } catch (f2) {}
    }, [e2]),
    u4 = reactExports.useCallback(() => {
      (n2(), o2());
    }, [n2, o2]);
  return (
    reactExports.useEffect(() => {
      if (t2) {
        le();
        let f2 = (h2) => {
          h2.key === "Escape" && o2();
        };
        return (
          document.addEventListener("keydown", f2),
          () => {
            (document.removeEventListener("keydown", f2), ce());
          }
        );
      }
    }, [t2, o2]),
    t2 ? (
      <div
        className={i2(
          "fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm",
        )}
        data-streamdown="link-safety-modal"
        onClick={o2}
        onKeyDown={(f2) => {
          f2.key === "Escape" && o2();
        }}
        role="button"
        tabIndex={0}
      >
        <div
          className={i2(
            "relative mx-4 flex w-full max-w-md flex-col gap-4 rounded-xl border bg-background p-6 shadow-lg",
          )}
          onClick={(f2) => f2.stopPropagation()}
          onKeyDown={(f2) => f2.stopPropagation()}
          role="presentation"
        >
          <button
            className={i2(
              "absolute top-4 right-4 rounded-md p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
            )}
            onClick={o2}
            title={p3.close}
            type="button"
          >
            {jsxRuntimeExports.jsx(l2, {
              size: 16,
            })}
          </button>
          <div className={i2("flex flex-col gap-2")}>
            <div
              className={i2("flex items-center gap-2 font-semibold text-lg")}
            >
              {jsxRuntimeExports.jsx(a2, {
                size: 20,
              })}
              <span>{p3.openExternalLink}</span>
            </div>
            <p className={i2("text-muted-foreground text-sm")}>
              {p3.externalLinkWarning}
            </p>
          </div>
          <div
            className={i2(
              "break-all rounded-md bg-muted p-3 font-mono text-sm",
              e2.length > 100 && "max-h-32 overflow-y-auto",
            )}
          >
            {e2}
          </div>
          <div className={i2("flex gap-2")}>
            <button
              className={i2(
                "flex flex-1 items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 font-medium text-sm transition-all hover:bg-muted",
              )}
              onClick={m3}
              type="button"
            >
              {d2 ? (
                <>
                  {jsxRuntimeExports.jsx(r2, {
                    size: 14,
                  })}
                  <span>{p3.copied}</span>
                </>
              ) : (
                <>
                  {jsxRuntimeExports.jsx(s2, {
                    size: 14,
                  })}
                  <span>{p3.copyLink}</span>
                </>
              )}
            </button>
            <button
              className={i2(
                "flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-all hover:bg-primary/90",
              )}
              onClick={u4}
              type="button"
            >
              {jsxRuntimeExports.jsx(a2, {
                size: 14,
              })}
              <span>{p3.openLink}</span>
            </button>
          </div>
        </div>
      </div>
    ) : null
  );
};

var Co = ({
  children: e2,
  className: t2,
  showCopy: o2 = true,
  showDownload: n2 = true,
}) => {
  let { Maximize2Icon: r2, XIcon: s2 } = L(),
    a2 = y3(),
    [l2, i2] = reactExports.useState(false),
    { isAnimating: d2 } = reactExports.useContext(R),
    c3 = D3(),
    p3 = () => {
      i2(true);
    },
    m3 = () => {
      i2(false);
    };
  return (
    reactExports.useEffect(() => {
      if (l2) {
        le();
        let u4 = (f2) => {
          f2.key === "Escape" && i2(false);
        };
        return (
          document.addEventListener("keydown", u4),
          () => {
            (document.removeEventListener("keydown", u4), ce());
          }
        );
      }
    }, [l2]),
    (
      <>
        <button
          className={a2(
            "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
            t2,
          )}
          disabled={d2}
          onClick={p3}
          title={c3.viewFullscreen}
          type="button"
        >
          {jsxRuntimeExports.jsx(r2, {
            size: 14,
          })}
        </button>
        {l2
          ? reactDomExports.createPortal(
              <div
                aria-label={c3.viewFullscreen}
                aria-modal="true"
                className={a2("fixed inset-0 z-50 flex flex-col bg-background")}
                data-streamdown="table-fullscreen"
                onClick={m3}
                onKeyDown={(u4) => {
                  u4.key === "Escape" && m3();
                }}
                role="dialog"
              >
                <div
                  className={a2("flex h-full flex-col")}
                  onClick={(u4) => u4.stopPropagation()}
                  onKeyDown={(u4) => u4.stopPropagation()}
                  role="presentation"
                >
                  <div
                    className={a2("flex items-center justify-end gap-1 p-4")}
                  >
                    {o2 ? <Te /> : null}
                    {n2 ? <Pe /> : null}
                    <button
                      className={a2(
                        "rounded-md p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
                      )}
                      onClick={m3}
                      title={c3.exitFullscreen}
                      type="button"
                    >
                      {jsxRuntimeExports.jsx(s2, {
                        size: 20,
                      })}
                    </button>
                  </div>
                  <div
                    className={a2(
                      "flex-1 overflow-auto p-4 pt-0 [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10",
                    )}
                  >
                    <table
                      className={a2(
                        "w-full border-collapse border border-border",
                      )}
                      data-streamdown="table"
                    >
                      {e2}
                    </table>
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null}
      </>
    )
  );
};

var vo = ({
  children: e2,
  className: t2,
  showControls: o2,
  showCopy: n2 = true,
  showDownload: r2 = true,
  showFullscreen: s2 = true,
  ...a2
}) => {
  let l2 = y3(),
    i2 = o2 && n2,
    d2 = o2 && r2,
    c3 = o2 && s2,
    p3 = i2 || d2 || c3;
  return (
    <div
      className={l2(
        "my-4 flex flex-col gap-2 rounded-lg border border-border bg-sidebar p-2",
      )}
      data-streamdown="table-wrapper"
    >
      {p3 ? (
        <div className={l2("flex items-center justify-end gap-1")}>
          {i2 ? <Te /> : null}
          {d2 ? <Pe /> : null}
          {c3 ? (
            <Co showCopy={i2} showDownload={d2}>
              {e2}
            </Co>
          ) : null}
        </div>
      ) : null}
      <div
        className={l2(
          "border-collapse overflow-x-auto overflow-y-auto rounded-md border border-border bg-background",
        )}
      >
        <table
          className={l2("w-full divide-y divide-border", t2)}
          data-streamdown="table"
          {...a2}
        >
          {e2}
        </table>
      </div>
    </div>
  );
};

var es = /startLine=(\d+)/;

var ts = /\bnoLineNumbers\b/;

var os$1 = reactExports.lazy(() =>
  (() => Promise.resolve().then(() => mermaidGHXKKRXX))().then((e2) => ({
    default: e2.Mermaid,
  })),
);

var ns = /language-([^\s]+)/;

var ft = (e2, t2) => (typeof e2 == "boolean" ? e2 : e2[t2] !== false);

var pt = (e2, t2) => {
  if (typeof e2 == "boolean") return e2;
  let o2 = e2.table;
  return o2 === false
    ? false
    : o2 === true || o2 === void 0
      ? true
      : o2[t2] !== false;
};

var bt = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    let r2 = y3();
    return (
      <ol
        className={r2(
          "list-inside list-decimal whitespace-normal [li_&]:pl-6",
          t2,
        )}
        data-streamdown="ordered-list"
        {...n2}
      >
        {e2}
      </ol>
    );
  },
  (e2, t2) => E2(e2, t2),
);

bt.displayName = "MarkdownOl";

var Po = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    let r2 = y3();
    return (
      <li
        className={r2("py-1 [&>p]:inline", t2)}
        data-streamdown="list-item"
        {...n2}
      >
        {e2}
      </li>
    );
  },
  (e2, t2) => e2.className === t2.className && qe(e2.node, t2.node),
);

Po.displayName = "MarkdownLi";

var Mo = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    let r2 = y3();
    return (
      <ul
        className={r2(
          "list-inside list-disc whitespace-normal [li_&]:pl-6",
          t2,
        )}
        data-streamdown="unordered-list"
        {...n2}
      >
        {e2}
      </ul>
    );
  },
  (e2, t2) => E2(e2, t2),
);

Mo.displayName = "MarkdownUl";

var Io = reactExports.memo(
  ({ className: e2, node: t2, ...o2 }) => {
    let n2 = y3();
    return (
      <hr
        className={n2("my-6 border-border", e2)}
        data-streamdown="horizontal-rule"
        {...o2}
      />
    );
  },
  (e2, t2) => E2(e2, t2),
);

Io.displayName = "MarkdownHr";

var No = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    let r2 = y3();
    return (
      <span
        className={r2("font-semibold", t2)}
        data-streamdown="strong"
        {...n2}
      >
        {e2}
      </span>
    );
  },
  (e2, t2) => E2(e2, t2),
);

No.displayName = "MarkdownStrong";

var rs = ({ children: e2, className: t2, href: o2, node: n2, ...r2 }) => {
  let s2 = y3(),
    { linkSafety: a2 } = reactExports.useContext(R),
    [l2, i2] = reactExports.useState(false),
    d2 = o2 === "streamdown:incomplete-link",
    c3 = reactExports.useCallback(
      async (f2) => {
        if (!(!(a2 != null && a2.enabled && o2) || d2)) {
          if (
            (f2.preventDefault(), a2.onLinkCheck && (await a2.onLinkCheck(o2)))
          ) {
            window.open(o2, "_blank", "noreferrer");
            return;
          }
          i2(true);
        }
      },
      [a2, o2, d2],
    ),
    p3 = reactExports.useCallback(() => {
      o2 && window.open(o2, "_blank", "noreferrer");
    }, [o2]),
    m3 = reactExports.useCallback(() => {
      i2(false);
    }, []),
    u4 = {
      url: o2 != null ? o2 : "",
      isOpen: l2,
      onClose: m3,
      onConfirm: p3,
    };
  return a2 != null && a2.enabled && o2 ? (
    <>
      <button
        className={s2(
          "wrap-anywhere appearance-none text-left font-medium text-primary underline",
          t2,
        )}
        data-incomplete={d2}
        data-streamdown="link"
        onClick={c3}
        type="button"
      >
        {e2}
      </button>
      {a2.renderModal
        ? a2.renderModal(u4)
        : jsxRuntimeExports.jsx(so, {
            ...u4,
          })}
    </>
  ) : (
    <a
      className={s2("wrap-anywhere font-medium text-primary underline", t2)}
      data-incomplete={d2}
      data-streamdown="link"
      href={o2}
      rel="noreferrer"
      target="_blank"
      {...r2}
    >
      {e2}
    </a>
  );
};

var Lo = reactExports.memo(rs, (e2, t2) => E2(e2, t2) && e2.href === t2.href);

Lo.displayName = "MarkdownA";

var Ro = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    let r2 = y3();
    return (
      <h1
        className={r2("mt-6 mb-2 font-semibold text-3xl", t2)}
        data-streamdown="heading-1"
        {...n2}
      >
        {e2}
      </h1>
    );
  },
  (e2, t2) => E2(e2, t2),
);

Ro.displayName = "MarkdownH1";

var So = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    let r2 = y3();
    return (
      <h2
        className={r2("mt-6 mb-2 font-semibold text-2xl", t2)}
        data-streamdown="heading-2"
        {...n2}
      >
        {e2}
      </h2>
    );
  },
  (e2, t2) => E2(e2, t2),
);

So.displayName = "MarkdownH2";

var Eo = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    let r2 = y3();
    return (
      <h3
        className={r2("mt-6 mb-2 font-semibold text-xl", t2)}
        data-streamdown="heading-3"
        {...n2}
      >
        {e2}
      </h3>
    );
  },
  (e2, t2) => E2(e2, t2),
);

Eo.displayName = "MarkdownH3";

var Ho = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    let r2 = y3();
    return (
      <h4
        className={r2("mt-6 mb-2 font-semibold text-lg", t2)}
        data-streamdown="heading-4"
        {...n2}
      >
        {e2}
      </h4>
    );
  },
  (e2, t2) => E2(e2, t2),
);

Ho.displayName = "MarkdownH4";

var Do = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    let r2 = y3();
    return (
      <h5
        className={r2("mt-6 mb-2 font-semibold text-base", t2)}
        data-streamdown="heading-5"
        {...n2}
      >
        {e2}
      </h5>
    );
  },
  (e2, t2) => E2(e2, t2),
);

Do.displayName = "MarkdownH5";

var Bo = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    let r2 = y3();
    return (
      <h6
        className={r2("mt-6 mb-2 font-semibold text-sm", t2)}
        data-streamdown="heading-6"
        {...n2}
      >
        {e2}
      </h6>
    );
  },
  (e2, t2) => E2(e2, t2),
);

Bo.displayName = "MarkdownH6";

var Ao = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    let { controls: r2 } = reactExports.useContext(R),
      s2 = ft(r2, "table"),
      a2 = pt(r2, "copy"),
      l2 = pt(r2, "download"),
      i2 = pt(r2, "fullscreen");
    return jsxRuntimeExports.jsx(vo, {
      className: t2,
      showControls: s2,
      showCopy: a2,
      showDownload: l2,
      showFullscreen: i2,
      ...n2,
      children: e2,
    });
  },
  (e2, t2) => E2(e2, t2),
);

Ao.displayName = "MarkdownTable";

var Oo = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    let r2 = y3();
    return (
      <thead
        className={r2("bg-muted/80", t2)}
        data-streamdown="table-header"
        {...n2}
      >
        {e2}
      </thead>
    );
  },
  (e2, t2) => E2(e2, t2),
);

Oo.displayName = "MarkdownThead";

var Vo = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    let r2 = y3();
    return (
      <tbody
        className={r2("divide-y divide-border", t2)}
        data-streamdown="table-body"
        {...n2}
      >
        {e2}
      </tbody>
    );
  },
  (e2, t2) => E2(e2, t2),
);

Vo.displayName = "MarkdownTbody";

var jo = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    let r2 = y3();
    return (
      <tr
        className={r2("border-border", t2)}
        data-streamdown="table-row"
        {...n2}
      >
        {e2}
      </tr>
    );
  },
  (e2, t2) => E2(e2, t2),
);

jo.displayName = "MarkdownTr";

var Fo = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    let r2 = y3();
    return (
      <th
        className={r2(
          "whitespace-nowrap px-4 py-2 text-left font-semibold text-sm",
          t2,
        )}
        data-streamdown="table-header-cell"
        {...n2}
      >
        {e2}
      </th>
    );
  },
  (e2, t2) => E2(e2, t2),
);

Fo.displayName = "MarkdownTh";

var zo = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    let r2 = y3();
    return (
      <td
        className={r2("px-4 py-2 text-sm", t2)}
        data-streamdown="table-cell"
        {...n2}
      >
        {e2}
      </td>
    );
  },
  (e2, t2) => E2(e2, t2),
);

zo.displayName = "MarkdownTd";

var _o = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    let r2 = y3();
    return (
      <blockquote
        className={r2(
          "my-4 border-muted-foreground/30 border-l-4 pl-4 text-muted-foreground italic",
          t2,
        )}
        data-streamdown="blockquote"
        {...n2}
      >
        {e2}
      </blockquote>
    );
  },
  (e2, t2) => E2(e2, t2),
);

_o.displayName = "MarkdownBlockquote";

var qo = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    let r2 = y3();
    return (
      <sup className={r2("text-sm", t2)} data-streamdown="superscript" {...n2}>
        {e2}
      </sup>
    );
  },
  (e2, t2) => E2(e2, t2),
);

qo.displayName = "MarkdownSup";

var $o = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    let r2 = y3();
    return (
      <sub className={r2("text-sm", t2)} data-streamdown="subscript" {...n2}>
        {e2}
      </sub>
    );
  },
  (e2, t2) => E2(e2, t2),
);

$o.displayName = "MarkdownSub";

var Wo = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    if ("data-footnotes" in n2) {
      let s2 = (i2) => {
          var m3, u4;
          if (!reactExports.isValidElement(i2)) return false;
          let d2 = Array.isArray(i2.props.children)
              ? i2.props.children
              : [i2.props.children],
            c3 = false,
            p3 = false;
          for (let f2 of d2)
            if (f2) {
              if (typeof f2 == "string") f2.trim() !== "" && (c3 = true);
              else if (reactExports.isValidElement(f2))
                if (
                  ((m3 = f2.props) == null
                    ? void 0
                    : m3["data-footnote-backref"]) !== void 0
                )
                  p3 = true;
                else {
                  let h2 = Array.isArray(f2.props.children)
                    ? f2.props.children
                    : [f2.props.children];
                  for (let b3 of h2) {
                    if (typeof b3 == "string" && b3.trim() !== "") {
                      c3 = true;
                      break;
                    }
                    if (
                      reactExports.isValidElement(b3) &&
                      ((u4 = b3.props) == null
                        ? void 0
                        : u4["data-footnote-backref"]) === void 0
                    ) {
                      c3 = true;
                      break;
                    }
                  }
                }
            }
          return p3 && !c3;
        },
        a2 = Array.isArray(e2)
          ? e2.map((i2) => {
              if (!reactExports.isValidElement(i2)) return i2;
              if (i2.type === bt) {
                let c3 = (
                  Array.isArray(i2.props.children)
                    ? i2.props.children
                    : [i2.props.children]
                ).filter((p3) => !s2(p3));
                return c3.length === 0
                  ? null
                  : {
                      ...i2,
                      props: {
                        ...i2.props,
                        children: c3,
                      },
                    };
              }
              return i2;
            })
          : e2;
      return (
        Array.isArray(a2) ? a2.some((i2) => i2 !== null) : a2 !== null
      ) ? (
        <section className={t2} {...n2}>
          {a2}
        </section>
      ) : null;
    }
    return (
      <section className={t2} {...n2}>
        {e2}
      </section>
    );
  },
  (e2, t2) => E2(e2, t2),
);

Wo.displayName = "MarkdownSection";

var ss = ({ node: e2, className: t2, children: o2, ...n2 }) => {
  var S3, F2;
  let r2 = y3(),
    s2 = !("data-block" in n2),
    { mermaid: a2, controls: l2, lineNumbers: i2 } = reactExports.useContext(R),
    d2 = de(),
    c3 = tt(),
    p3 = t2 == null ? void 0 : t2.match(ns),
    m3 = (S3 = p3 == null ? void 0 : p3.at(1)) != null ? S3 : "",
    u4 = ao(m3);
  if (s2)
    return (
      <code
        className={r2("rounded bg-muted px-1.5 py-0.5 font-mono text-sm", t2)}
        data-streamdown="inline-code"
        {...n2}
      >
        {o2}
      </code>
    );
  let f2 =
      (F2 = e2 == null ? void 0 : e2.properties) == null
        ? void 0
        : F2.metastring,
    h2 = f2 == null ? void 0 : f2.match(es),
    b3 = h2 ? Number.parseInt(h2[1], 10) : void 0,
    g2 = b3 !== void 0 && b3 >= 1 ? b3 : void 0,
    v2 = !(f2 ? ts.test(f2) : false) && i2 !== false,
    w3 = "";
  if (
    (reactExports.isValidElement(o2) &&
    o2.props &&
    typeof o2.props == "object" &&
    "children" in o2.props &&
    typeof o2.props.children == "string"
      ? (w3 = o2.props.children)
      : typeof o2 == "string" && (w3 = o2),
    u4)
  ) {
    let j2 = u4.component;
    return (
      <reactExports.Suspense fallback={<Oe />}>
        {jsxRuntimeExports.jsx(j2, {
          code: w3,
          isIncomplete: c3,
          language: m3,
          meta: f2,
        })}
      </reactExports.Suspense>
    );
  }
  if (m3 === "mermaid" && d2) {
    let j2 = ft(l2, "mermaid"),
      z3 = Fe(l2, "download"),
      B2 = Fe(l2, "copy"),
      _2 = Fe(l2, "fullscreen"),
      Q2 = Fe(l2, "panZoom"),
      U2 = j2 && (z3 || B2 || _2);
    return (
      <reactExports.Suspense fallback={<Oe />}>
        <div
          className={r2(
            "group relative my-4 flex w-full flex-col gap-2 rounded-xl border border-border bg-sidebar p-2",
            t2,
          )}
          data-streamdown="mermaid-block"
        >
          <div
            className={r2(
              "flex h-8 items-center text-muted-foreground text-xs",
            )}
          >
            <span className={r2("ml-1 font-mono lowercase")}>mermaid</span>
          </div>
          {U2 ? (
            <div
              className={r2(
                "pointer-events-none sticky top-2 z-10 -mt-10 flex h-8 items-center justify-end",
              )}
            >
              <div
                className={r2(
                  "pointer-events-auto flex shrink-0 items-center gap-2 rounded-md border border-sidebar bg-sidebar/80 px-1.5 py-1 supports-[backdrop-filter]:bg-sidebar/70 supports-[backdrop-filter]:backdrop-blur",
                )}
                data-streamdown="mermaid-block-actions"
              >
                {z3
                  ? jsxRuntimeExports.jsx(co, {
                      chart: w3,
                      config: a2 == null ? void 0 : a2.config,
                    })
                  : null}
                {B2 ? <Ae code={w3} /> : null}
                {_2
                  ? jsxRuntimeExports.jsx(fo, {
                      chart: w3,
                      config: a2 == null ? void 0 : a2.config,
                    })
                  : null}
              </div>
            </div>
          ) : null}
          <div className={r2("rounded-md border border-border bg-background")}>
            {jsxRuntimeExports.jsx(os$1, {
              chart: w3,
              config: a2 == null ? void 0 : a2.config,
              showControls: Q2,
            })}
          </div>
        </div>
      </reactExports.Suspense>
    );
  }
  let P3 = ft(l2, "code"),
    M2 = To(l2, "download"),
    H2 = To(l2, "copy");
  return jsxRuntimeExports.jsx(st, {
    className: t2,
    code: w3,
    isIncomplete: c3,
    language: m3,
    lineNumbers: v2,
    startLine: g2,
    children: P3 ? (
      <>
        {M2
          ? jsxRuntimeExports.jsx(it, {
              code: w3,
              language: m3,
            })
          : null}
        {H2 ? <Ae /> : null}
      </>
    ) : null,
  });
};

var Zo = reactExports.memo(
  ss,
  (e2, t2) => e2.className === t2.className && qe(e2.node, t2.node),
);

Zo.displayName = "MarkdownCode";

var Xo = reactExports.memo(
  oo,
  (e2, t2) => e2.className === t2.className && qe(e2.node, t2.node),
);

Xo.displayName = "MarkdownImg";

var Ko = {
  ol: bt,
  li: Po,
  ul: Mo,
  hr: Io,
  strong: No,
  a: Lo,
  h1: Ro,
  h2: So,
  h3: Eo,
  h4: Ho,
  h5: Do,
  h6: Bo,
  table: Ao,
  thead: Oo,
  tbody: Vo,
  tr: jo,
  th: Fo,
  td: zo,
  blockquote: _o,
  code: Zo,
  img: Xo,
  pre: ({ children: e2 }) =>
    reactExports.isValidElement(e2)
      ? reactExports.cloneElement(e2, {
          "data-block": "true",
        })
      : e2,
  sup: qo,
  sub: $o,
  p: Jo,
  section: Wo,
};

var Zs = /^[ \t]*<[\w!/?-]/;

var Xs = /(^|\n)[ \t]{4,}(?=<[\w!/?-])/g;

var Js = (e2) =>
  typeof e2 != "string" || e2.length === 0 || !Zs.test(e2)
    ? e2
    : e2.replace(Xs, "$1");

var bn;

var hn;

var yn;

var wn;

var Ze = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    href: [
      ...((hn = (bn = defaultSchema.protocols) == null ? void 0 : bn.href) !=
      null
        ? hn
        : []),
      "tel",
    ],
  },
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...((wn = (yn = defaultSchema.attributes) == null ? void 0 : yn.code) !=
      null
        ? wn
        : []),
      "metastring",
    ],
  },
};

var xt = {
  raw: rehypeRaw,
  sanitize: [rehypeSanitize, Ze],
  harden: [
    harden,
    {
      allowedImagePrefixes: ["*"],
      allowedLinkPrefixes: ["*"],
      allowedProtocols: ["*"],
      defaultOrigin: void 0,
      allowDataImages: true,
    },
  ],
};

var Ks = {
  gfm: [remarkGfm, {}],
  codeMeta: un,
};

var gn = Object.values(xt);

var Us = Object.values(Ks);

var Gs = {
  block: " ▋",
  circle: " ●",
};

var Tn = reactExports.memo(
  ({
    content: e2,
    shouldParseIncompleteMarkdown: t2,
    shouldNormalizeHtmlIndentation: o2,
    index: n2,
    isIncomplete: r2,
    dir: s2,
    animatePlugin: a2,
    ...l2
  }) => {
    if (a2) {
      let c3 = a2.getLastRenderCharCount();
      a2.setPrevContentLength(c3);
    }
    let i2 = typeof e2 == "string" && o2 ? Js(e2) : e2,
      d2 = <Ct2 {...l2}>{i2}</Ct2>;
    return (
      <et.Provider value={r2}>
        {s2 ? (
          <div
            dir={s2}
            style={{
              display: "contents",
            }}
          >
            {d2}
          </div>
        ) : (
          d2
        )}
      </et.Provider>
    );
  },
  (e2, t2) => {
    if (
      e2.content !== t2.content ||
      e2.shouldNormalizeHtmlIndentation !== t2.shouldNormalizeHtmlIndentation ||
      e2.index !== t2.index ||
      e2.isIncomplete !== t2.isIncomplete ||
      e2.dir !== t2.dir
    )
      return false;
    if (e2.components !== t2.components) {
      let o2 = Object.keys(e2.components || {}),
        n2 = Object.keys(t2.components || {});
      if (
        o2.length !== n2.length ||
        o2.some((r2) => {
          var s2, a2;
          return (
            ((s2 = e2.components) == null ? void 0 : s2[r2]) !==
            ((a2 = t2.components) == null ? void 0 : a2[r2])
          );
        })
      )
        return false;
    }
    return !(
      e2.rehypePlugins !== t2.rehypePlugins ||
      e2.remarkPlugins !== t2.remarkPlugins
    );
  },
);

Tn.displayName = "Block";

export var Qs = reactExports.memo(
  ({
    children: e2,
    mode: t2 = "streaming",
    dir: o2,
    parseIncompleteMarkdown: n2 = true,
    normalizeHtmlIndentation: r2 = false,
    components: s2,
    rehypePlugins: a2 = gn,
    remarkPlugins: l2 = Us,
    className: i2,
    shikiTheme: d2 = vn,
    mermaid: c3,
    controls: p3 = true,
    isAnimating: m3 = false,
    animated: u4,
    BlockComponent: f2 = Tn,
    parseMarkdownIntoBlocksFn: h2 = kt,
    caret: b3,
    plugins: g2,
    remend: T2,
    linkSafety: v2 = xn,
    lineNumbers: w3 = true,
    allowedTags: P3,
    literalTagContent: M2,
    translations: H2,
    icons: S3,
    prefix: F2,
    onAnimationStart: j2,
    onAnimationEnd: z3,
    ...B2
  }) => {
    let _2 = reactExports.useId(),
      [Q2, U2] = reactExports.useTransition(),
      x2 = reactExports.useMemo(() => Dt(F2), [F2]),
      q2 = reactExports.useRef(null),
      X2 = reactExports.useRef(j2),
      Re2 = reactExports.useRef(z3);
    ((X2.current = j2),
      (Re2.current = z3),
      reactExports.useEffect(() => {
        var A2, K3, ee2;
        if (t2 === "static") return;
        let k2 = q2.current;
        if (((q2.current = m3), k2 === null)) {
          m3 && ((A2 = X2.current) == null || A2.call(X2));
          return;
        }
        m3 && !k2
          ? (K3 = X2.current) == null || K3.call(X2)
          : !m3 && k2 && ((ee2 = Re2.current) == null || ee2.call(Re2));
      }, [m3, t2]));
    let Je2 = reactExports.useMemo(() => (P3 ? Object.keys(P3) : []), [P3]),
      Se2 = reactExports.useMemo(() => {
        if (typeof e2 != "string") return "";
        let k2 = t2 === "streaming" && n2 ? $e$1(e2, T2) : e2;
        return (
          M2 && M2.length > 0 && (k2 = cn(k2, M2)),
          Je2.length > 0 && (k2 = ln(k2, Je2)),
          k2
        );
      }, [e2, t2, n2, T2, Je2, M2]),
      fe2 = reactExports.useMemo(() => h2(Se2), [Se2, h2]),
      [Ln2, Tt2] = reactExports.useState(fe2);
    reactExports.useEffect(() => {
      t2 === "streaming" && !ge2
        ? U2(() => {
            Tt2(fe2);
          })
        : Tt2(fe2);
    }, [fe2, t2]);
    let J3 = t2 === "streaming" ? Ln2 : fe2,
      Ke2 = reactExports.useMemo(
        () => (o2 === "auto" ? J3.map($e) : void 0),
        [J3, o2],
      ),
      Rn2 = reactExports.useMemo(
        () => J3.map((k2, A2) => `${_2}-${A2}`),
        [J3.length, _2],
      ),
      Ue2 = reactExports.useMemo(
        () => (u4 === true ? "true" : u4 ? JSON.stringify(u4) : ""),
        [u4],
      ),
      ge2 = reactExports.useMemo(
        () => (Ue2 ? (Ue2 === "true" ? be() : be(u4)) : null),
        [Ue2],
      ),
      Pt2 = reactExports.useMemo(() => {
        var k2, A2;
        return {
          shikiTheme:
            (A2 =
              (k2 = g2 == null ? void 0 : g2.code) == null
                ? void 0
                : k2.getThemes()) != null
              ? A2
              : d2,
          controls: p3,
          isAnimating: m3,
          lineNumbers: w3,
          mode: t2,
          mermaid: c3,
          linkSafety: v2,
        };
      }, [d2, p3, m3, w3, t2, c3, v2, g2 == null ? void 0 : g2.code]),
      Sn2 = reactExports.useMemo(() => (H2 ? JSON.stringify(H2) : ""), [H2]),
      Mt2 = reactExports.useMemo(
        () => ({
          ...De,
          ...H2,
        }),
        [Sn2],
      ),
      It2 = reactExports.useMemo(() => {
        let { inlineCode: k2, ...A2 } = s2 != null ? s2 : {},
          K3 = {
            ...Ko,
            ...A2,
          };
        if (k2) {
          let ee2 = K3.code;
          K3.code = (ie2) =>
            "data-block" in ie2
              ? ee2
                ? reactExports.createElement(ee2, ie2)
                : null
              : reactExports.createElement(k2, ie2);
        }
        return K3;
      }, [s2]),
      Nt2 = reactExports.useMemo(() => {
        let k2 = [];
        return (
          g2 != null && g2.cjk && (k2 = [...k2, ...g2.cjk.remarkPluginsBefore]),
          (k2 = [...k2, ...l2]),
          g2 != null && g2.cjk && (k2 = [...k2, ...g2.cjk.remarkPluginsAfter]),
          g2 != null && g2.math && (k2 = [...k2, g2.math.remarkPlugin]),
          k2
        );
      }, [l2, g2 == null ? void 0 : g2.math, g2 == null ? void 0 : g2.cjk]),
      Lt2 = reactExports.useMemo(() => {
        var A2;
        let k2 = a2;
        if (P3 && Object.keys(P3).length > 0 && a2 === gn) {
          let K3 = {
            ...Ze,
            tagNames: [
              ...((A2 = Ze.tagNames) != null ? A2 : []),
              ...Object.keys(P3),
            ],
            attributes: {
              ...Ze.attributes,
              ...P3,
            },
          };
          k2 = [xt.raw, [rehypeSanitize, K3], xt.harden];
        }
        return (
          M2 && M2.length > 0 && (k2 = [...k2, [mn, M2]]),
          g2 != null && g2.math && (k2 = [...k2, g2.math.rehypePlugin]),
          ge2 && m3 && (k2 = [...k2, ge2.rehypePlugin]),
          k2
        );
      }, [a2, g2 == null ? void 0 : g2.math, ge2, m3, P3, M2]),
      Ge2 = reactExports.useMemo(() => {
        if (!m3 || J3.length === 0) return false;
        let k2 = J3.at(-1);
        return ht(k2) || Uo(k2);
      }, [m3, J3]),
      En2 = reactExports.useMemo(
        () =>
          b3 && m3 && !Ge2
            ? {
                "--streamdown-caret": `"${Gs[b3]}"`,
              }
            : void 0,
        [b3, m3, Ge2],
      );
    return t2 === "static" ? (
      <Be.Provider value={Mt2}>
        <Ve.Provider value={g2 != null ? g2 : null}>
          <R.Provider value={Pt2}>
            {jsxRuntimeExports.jsx(at, {
              icons: S3,
              children: (
                <Ee.Provider value={x2}>
                  <div
                    className={x2(
                      "space-y-4 whitespace-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                      i2,
                    )}
                    dir={o2 === "auto" ? $e(Se2) : o2}
                  >
                    <Ct2
                      components={It2}
                      rehypePlugins={Lt2}
                      remarkPlugins={Nt2}
                      {...B2}
                    >
                      {Se2}
                    </Ct2>
                  </div>
                </Ee.Provider>
              ),
            })}
          </R.Provider>
        </Ve.Provider>
      </Be.Provider>
    ) : (
      <Be.Provider value={Mt2}>
        <Ve.Provider value={g2 != null ? g2 : null}>
          <R.Provider value={Pt2}>
            {jsxRuntimeExports.jsx(at, {
              icons: S3,
              children: (
                <Ee.Provider value={x2}>
                  <div
                    className={x2(
                      "space-y-4 whitespace-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                      b3 && !Ge2
                        ? "[&>*:last-child]:after:inline [&>*:last-child]:after:align-baseline [&>*:last-child]:after:content-[var(--streamdown-caret)]"
                        : null,
                      i2,
                    )}
                    style={En2}
                  >
                    {J3.length === 0 && b3 && m3 && <span />}
                    {J3.map((k2, A2) => {
                      var ie2;
                      let K3 = A2 === J3.length - 1,
                        ee2 = m3 && K3 && ht(k2);
                      return jsxRuntimeExports.jsx(
                        f2,
                        {
                          animatePlugin: ge2,
                          components: It2,
                          content: k2,
                          dir:
                            (ie2 = Ke2 == null ? void 0 : Ke2[A2]) != null
                              ? ie2
                              : o2 !== "auto"
                                ? o2
                                : void 0,
                          index: A2,
                          isIncomplete: ee2,
                          rehypePlugins: Lt2,
                          remarkPlugins: Nt2,
                          shouldNormalizeHtmlIndentation: r2,
                          shouldParseIncompleteMarkdown: n2,
                          ...B2,
                        },
                        Rn2[A2],
                      );
                    })}
                  </div>
                </Ee.Provider>
              ),
            })}
          </R.Provider>
        </Ve.Provider>
      </Be.Provider>
    );
  },
  (e2, t2) =>
    e2.children === t2.children &&
    e2.shikiTheme === t2.shikiTheme &&
    e2.isAnimating === t2.isAnimating &&
    e2.animated === t2.animated &&
    e2.mode === t2.mode &&
    e2.plugins === t2.plugins &&
    e2.className === t2.className &&
    e2.linkSafety === t2.linkSafety &&
    e2.lineNumbers === t2.lineNumbers &&
    e2.normalizeHtmlIndentation === t2.normalizeHtmlIndentation &&
    e2.literalTagContent === t2.literalTagContent &&
    JSON.stringify(e2.translations) === JSON.stringify(t2.translations) &&
    e2.prefix === t2.prefix &&
    e2.dir === t2.dir,
);

Qs.displayName = "Streamdown";
