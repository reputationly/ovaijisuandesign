// yt.jsx
import {
  jsxRuntimeExports,
  reactExports,
  BlockPolicy,
  createVisitor,
  stripNullChildren,
  visit,
  clsx,
  nt,
  He,
  D3,
  L,
  ct2,
  de,
  reactDomExports,
  ue,
  ne,
  dt,
  re,
  E2,
  qe,
  tt,
  Jo,
  defaultSchema,
  rehypeRaw,
  rehypeSanitize,
  remarkGfm,
  un,
  Ct2,
  et,
  kt,
  $e$1,
  cn,
  ln,
  $e,
  be,
  De,
  mn,
  ht,
  Uo,
  Be,
  Ve,
  at,
} from "../vendor.js";
import { twMerge } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
export function shuffle(items, random) {
  const next2 = [...items];
  for (let index2 = next2.length - 1; index2 > 0; index2 -= 1) {
    const swapIndex = Math.floor(random() * (index2 + 1));
    [next2[index2], next2[swapIndex]] = [next2[swapIndex], next2[index2]];
  }
  return next2;
}
const MIN_TURNS_FOR_RAIL = 5;
export const CHAT_CONTENT_MAX_WIDTH_PX = 880;
const RAIL_RESERVED_GUTTER_PX = 48;
const MIN_CONTAINER_WIDTH_PX = CHAT_CONTENT_MAX_WIDTH_PX + RAIL_RESERVED_GUTTER_PX * 2;
const COMPACT_RAIL_MIN_CONTAINER_WIDTH_PX = 320;
function resolveHistoryRailMode(containerWidth) {
  if (containerWidth < COMPACT_RAIL_MIN_CONTAINER_WIDTH_PX) return "hidden";
  if (containerWidth < MIN_CONTAINER_WIDTH_PX) return "compact";
  return "full";
}
function shouldShowHistoryRail(containerWidth, turnCount) {
  return resolveHistoryRailMode(containerWidth) !== "hidden" && turnCount >= MIN_TURNS_FOR_RAIL;
}
function findActiveTurns(scrollTop, clientHeight, items) {
  if (items.length === 0) return [];
  const viewportBottom = scrollTop + clientHeight;
  const visible = [];
  for (const item of items) {
    if (item.start >= viewportBottom) break;
    if (item.start + item.size > scrollTop) visible.push(item.index);
  }
  if (visible.length > 0) return visible;
  if (viewportBottom <= (items[0]?.start ?? 0)) return [items[0]?.index ?? 0];
  return [items.at(-1)?.index ?? 0];
}
export function useHistoryRailState(options) {
  const { scrollRef, turnCount, virtualItems, resetKey, enabled = true } = options;
  const [showRail, setShowRail] = reactExports.useState(false);
  const [mode2, setMode] = reactExports.useState("hidden");
  const [activeIndex, setActiveIndex] = reactExports.useState(-1);
  const [activeIndexes, setActiveIndexes] = reactExports.useState([]);
  const rafIdRef = reactExports.useRef(null);
  const virtualItemsRef = reactExports.useRef(virtualItems);
  virtualItemsRef.current = virtualItems;
  const cancelRaf = reactExports.useCallback(() => {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);
  const recompute = reactExports.useCallback(() => {
    if (!enabled) return;
    if (rafIdRef.current != null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const el = scrollRef.current;
      if (!el) return;
      const nextMode = resolveHistoryRailMode(el.clientWidth);
      const shouldShow = shouldShowHistoryRail(el.clientWidth, turnCount);
      setShowRail((prev) => (prev === shouldShow ? prev : shouldShow));
      setMode((prev) => {
        const resolved = shouldShow ? nextMode : "hidden";
        return prev === resolved ? prev : resolved;
      });
      if (!shouldShow) return;
      const nextIndexes = findActiveTurns(el.scrollTop, el.clientHeight, virtualItemsRef.current);
      const next2 = nextIndexes.at(-1) ?? -1;
      setActiveIndexes((prev) =>
        prev.length === nextIndexes.length &&
        prev.every((value, index2) => value === nextIndexes[index2])
          ? prev
          : nextIndexes,
      );
      setActiveIndex((prev) => (prev === next2 ? prev : next2));
    });
  }, [scrollRef, turnCount, enabled]);
  reactExports.useEffect(() => {
    if (!enabled) return;
    const el = scrollRef.current;
    if (!el) return;
    recompute();
    const handler = () => recompute();
    el.addEventListener("scroll", handler, {
      passive: true,
    });
    return () => {
      el.removeEventListener("scroll", handler);
      cancelRaf();
    };
  }, [scrollRef, recompute, cancelRaf, enabled]);
  reactExports.useEffect(() => {
    if (!enabled) return;
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer2 = new ResizeObserver(() => recompute());
    observer2.observe(el);
    return () => observer2.disconnect();
  }, [scrollRef, recompute, enabled]);
  reactExports.useEffect(() => {
    if (!enabled) return;
    recompute();
  }, [turnCount, virtualItems, recompute, enabled]);
  reactExports.useEffect(() => {
    const lastIndex = turnCount > 0 ? turnCount - 1 : -1;
    setActiveIndex(lastIndex);
    setActiveIndexes(lastIndex >= 0 ? [lastIndex] : []);
  }, [resetKey]);
  return {
    showRail: enabled && showRail,
    mode: enabled ? mode2 : "hidden",
    activeIndex,
    activeIndexes,
  };
}
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
    allowedLinkPrefixes.length && !allowedLinkPrefixes.every((p3) => p3 === "*");
  const hasSpecificImagePrefixes =
    allowedImagePrefixes.length && !allowedImagePrefixes.every((p3) => p3 === "*");
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
                ((H2 = (M2 = w3.at(-1)) == null ? void 0 : M2.isIntersecting) != null && H2)) &&
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
          (i2.current && clearTimeout(i2.current), d2.current && m3(d2.current), T2.disconnect());
        }
      );
    }, [t2, o2, n2, r2, m3, p3]),
    {
      shouldRender: s2,
      containerRef: l2,
    }
  );
}
var he = (...e2) => twMerge(clsx(e2));
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
var W2 = (e2, t2, o2) => {
  let n2 = typeof t2 == "string" && o2.startsWith("text/csv") ? "\uFEFF" : "",
    r2 =
      typeof t2 == "string"
        ? new Blob([n2 + t2], {
            type: o2,
          })
        : t2,
    s2 = URL.createObjectURL(r2),
    a2 = document.createElement("a");
  ((a2.href = s2),
    (a2.download = e2),
    document.body.appendChild(a2),
    a2.click(),
    document.body.removeChild(a2),
    URL.revokeObjectURL(s2));
};
var Ee = reactExports.createContext(he);
var y3 = () => reactExports.useContext(Ee);
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
            className={s2 ? l2("[counter-increment:line_0] [counter-reset:line]") : void 0}
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
                            h2 && "dark:bg-[var(--shiki-dark-bg,var(--sdm-tbg))]",
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
export var ot = ({ className: e2, language: t2, style: o2, isIncomplete: n2, ...r2 }) => {
  let s2 = y3();
  return (
    <div
      className={s2(
        "my-4 flex w-full flex-col gap-2 rounded-xl border border-border bg-sidebar p-2",
        e2,
      )}
      data-incomplete={n2 || void 0}
      data-language={t2}
      data-streamdown="code-block"
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "auto 200px",
        ...o2,
      }}
      {...r2}
    />
  );
};
export var rt = ({ language: e2 }) => {
  let t2 = y3();
  return (
    <div
      className={t2("flex h-8 items-center text-muted-foreground text-xs")}
      data-language={e2}
      data-streamdown="code-block-header"
    >
      <span className={t2("ml-1 font-mono lowercase")}>{e2}</span>
    </div>
  );
};
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
export var Ae = ({
  onCopy: e2,
  onError: t2,
  timeout: o2 = 2e3,
  children: n2,
  className: r2,
  code: s2,
  ...a2
}) => {
  let l2 = y3(),
    [i2, d2] = reactExports.useState(false),
    c3 = reactExports.useRef(0),
    { code: p3 } = He(),
    { isAnimating: m3 } = reactExports.useContext(R),
    u4 = D3(),
    f2 = s2 != null ? s2 : p3,
    h2 = async () => {
      var T2;
      if (
        typeof window == "undefined" ||
        !((T2 = navigator == null ? void 0 : navigator.clipboard) != null && T2.writeText)
      ) {
        t2 == null || t2(new Error("Clipboard API not available"));
        return;
      }
      try {
        i2 ||
          (await navigator.clipboard.writeText(f2),
          d2(true),
          e2 == null || e2(),
          (c3.current = window.setTimeout(() => d2(false), o2)));
      } catch (v2) {
        t2 == null || t2(v2);
      }
    };
  reactExports.useEffect(
    () => () => {
      window.clearTimeout(c3.current);
    },
    [],
  );
  let b3 = L(),
    g2 = i2 ? b3.CheckIcon : b3.CopyIcon;
  return (
    <button
      className={l2(
        "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
        r2,
      )}
      data-streamdown="code-block-copy-button"
      disabled={m3}
      onClick={h2}
      title={u4.copyCode}
      type="button"
      {...a2}
    >
      {n2 != null
        ? n2
        : jsxRuntimeExports.jsx(g2, {
            size: 14,
          })}
    </button>
  );
};
var Yt = {
  "1c": "1c",
  "1c-query": "1cq",
  abap: "abap",
  "actionscript-3": "as",
  ada: "ada",
  adoc: "adoc",
  "angular-html": "html",
  "angular-ts": "ts",
  apache: "conf",
  apex: "cls",
  apl: "apl",
  applescript: "applescript",
  ara: "ara",
  asciidoc: "adoc",
  asm: "asm",
  astro: "astro",
  awk: "awk",
  ballerina: "bal",
  bash: "sh",
  bat: "bat",
  batch: "bat",
  be: "be",
  beancount: "beancount",
  berry: "berry",
  bibtex: "bib",
  bicep: "bicep",
  blade: "blade.php",
  bsl: "bsl",
  c: "c",
  "c#": "cs",
  "c++": "cpp",
  cadence: "cdc",
  cairo: "cairo",
  cdc: "cdc",
  clarity: "clar",
  clj: "clj",
  clojure: "clj",
  "closure-templates": "soy",
  cmake: "cmake",
  cmd: "cmd",
  cobol: "cob",
  codeowners: "CODEOWNERS",
  codeql: "ql",
  coffee: "coffee",
  coffeescript: "coffee",
  "common-lisp": "lisp",
  console: "sh",
  coq: "v",
  cpp: "cpp",
  cql: "cql",
  crystal: "cr",
  cs: "cs",
  csharp: "cs",
  css: "css",
  csv: "csv",
  cue: "cue",
  cypher: "cql",
  d: "d",
  dart: "dart",
  dax: "dax",
  desktop: "desktop",
  diff: "diff",
  docker: "dockerfile",
  dockerfile: "dockerfile",
  dotenv: "env",
  "dream-maker": "dm",
  edge: "edge",
  elisp: "el",
  elixir: "ex",
  elm: "elm",
  "emacs-lisp": "el",
  erb: "erb",
  erl: "erl",
  erlang: "erl",
  f: "f",
  "f#": "fs",
  f03: "f03",
  f08: "f08",
  f18: "f18",
  f77: "f77",
  f90: "f90",
  f95: "f95",
  fennel: "fnl",
  fish: "fish",
  fluent: "ftl",
  for: "for",
  "fortran-fixed-form": "f",
  "fortran-free-form": "f90",
  fs: "fs",
  fsharp: "fs",
  fsl: "fsl",
  ftl: "ftl",
  gdresource: "tres",
  gdscript: "gd",
  gdshader: "gdshader",
  genie: "gs",
  gherkin: "feature",
  "git-commit": "gitcommit",
  "git-rebase": "gitrebase",
  gjs: "js",
  gleam: "gleam",
  "glimmer-js": "js",
  "glimmer-ts": "ts",
  glsl: "glsl",
  gnuplot: "plt",
  go: "go",
  gql: "gql",
  graphql: "graphql",
  groovy: "groovy",
  gts: "gts",
  hack: "hack",
  haml: "haml",
  handlebars: "hbs",
  haskell: "hs",
  haxe: "hx",
  hbs: "hbs",
  hcl: "hcl",
  hjson: "hjson",
  hlsl: "hlsl",
  hs: "hs",
  html: "html",
  "html-derivative": "html",
  http: "http",
  hxml: "hxml",
  hy: "hy",
  imba: "imba",
  ini: "ini",
  jade: "jade",
  java: "java",
  javascript: "js",
  jinja: "jinja",
  jison: "jison",
  jl: "jl",
  js: "js",
  json: "json",
  json5: "json5",
  jsonc: "jsonc",
  jsonl: "jsonl",
  jsonnet: "jsonnet",
  jssm: "jssm",
  jsx: "jsx",
  julia: "jl",
  kotlin: "kt",
  kql: "kql",
  kt: "kt",
  kts: "kts",
  kusto: "kql",
  latex: "tex",
  lean: "lean",
  lean4: "lean",
  less: "less",
  liquid: "liquid",
  lisp: "lisp",
  lit: "lit",
  llvm: "ll",
  log: "log",
  logo: "logo",
  lua: "lua",
  luau: "luau",
  make: "mak",
  makefile: "mak",
  markdown: "md",
  marko: "marko",
  matlab: "m",
  md: "md",
  mdc: "mdc",
  mdx: "mdx",
  mediawiki: "wiki",
  mermaid: "mmd",
  mips: "s",
  mipsasm: "s",
  mmd: "mmd",
  mojo: "mojo",
  move: "move",
  nar: "nar",
  narrat: "narrat",
  nextflow: "nf",
  nf: "nf",
  nginx: "conf",
  nim: "nim",
  nix: "nix",
  nu: "nu",
  nushell: "nu",
  objc: "m",
  "objective-c": "m",
  "objective-cpp": "mm",
  ocaml: "ml",
  pascal: "pas",
  perl: "pl",
  perl6: "p6",
  php: "php",
  plsql: "pls",
  po: "po",
  polar: "polar",
  postcss: "pcss",
  pot: "pot",
  potx: "potx",
  powerquery: "pq",
  powershell: "ps1",
  prisma: "prisma",
  prolog: "pl",
  properties: "properties",
  proto: "proto",
  protobuf: "proto",
  ps: "ps",
  ps1: "ps1",
  pug: "pug",
  puppet: "pp",
  purescript: "purs",
  py: "py",
  python: "py",
  ql: "ql",
  qml: "qml",
  qmldir: "qmldir",
  qss: "qss",
  r: "r",
  racket: "rkt",
  raku: "raku",
  razor: "cshtml",
  rb: "rb",
  reg: "reg",
  regex: "regex",
  regexp: "regexp",
  rel: "rel",
  riscv: "s",
  rs: "rs",
  rst: "rst",
  ruby: "rb",
  rust: "rs",
  sas: "sas",
  sass: "sass",
  scala: "scala",
  scheme: "scm",
  scss: "scss",
  sdbl: "sdbl",
  sh: "sh",
  shader: "shader",
  shaderlab: "shader",
  shell: "sh",
  shellscript: "sh",
  shellsession: "sh",
  smalltalk: "st",
  solidity: "sol",
  soy: "soy",
  sparql: "rq",
  spl: "spl",
  splunk: "spl",
  sql: "sql",
  "ssh-config": "config",
  stata: "do",
  styl: "styl",
  stylus: "styl",
  svelte: "svelte",
  swift: "swift",
  "system-verilog": "sv",
  systemd: "service",
  talon: "talon",
  talonscript: "talon",
  tasl: "tasl",
  tcl: "tcl",
  templ: "templ",
  terraform: "tf",
  tex: "tex",
  tf: "tf",
  tfvars: "tfvars",
  toml: "toml",
  ts: "ts",
  "ts-tags": "ts",
  tsp: "tsp",
  tsv: "tsv",
  tsx: "tsx",
  turtle: "ttl",
  twig: "twig",
  typ: "typ",
  typescript: "ts",
  typespec: "tsp",
  typst: "typ",
  v: "v",
  vala: "vala",
  vb: "vb",
  verilog: "v",
  vhdl: "vhdl",
  vim: "vim",
  viml: "vim",
  vimscript: "vim",
  vue: "vue",
  "vue-html": "html",
  "vue-vine": "vine",
  vy: "vy",
  vyper: "vy",
  wasm: "wasm",
  wenyan: "wy",
  wgsl: "wgsl",
  wiki: "wiki",
  wikitext: "wiki",
  wit: "wit",
  wl: "wl",
  wolfram: "wl",
  xml: "xml",
  xsl: "xsl",
  yaml: "yaml",
  yml: "yml",
  zenscript: "zs",
  zig: "zig",
  zsh: "zsh",
  文言: "wy",
};
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
var Oe = () => {
  let { Loader2Icon: e2 } = L(),
    t2 = y3();
  return (
    <div
      className={t2(
        "w-full divide-y divide-border overflow-hidden rounded-xl border border-border",
      )}
    >
      <div className={t2("h-[46px] w-full bg-muted/80")} />
      <div className={t2("flex w-full items-center justify-center p-4")}>
        {jsxRuntimeExports.jsx(e2, {
          className: t2("size-4 animate-spin"),
        })}
      </div>
    </div>
  );
};
var Mr = /\.[^/.]+$/;
var oo = ({ node: e2, className: t2, src: o2, alt: n2, onLoad: r2, onError: s2, ...a2 }) => {
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
            S3 = new URL(o2, window.location.origin).pathname.split("/").pop() || "",
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
    <div className={i2("group relative my-4 inline-block")} data-streamdown="image-wrapper">
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
var ke = 0;
var le = () => {
  ((ke += 1), ke === 1 && (document.body.style.overflow = "hidden"));
};
var ce = () => {
  ((ke = Math.max(0, ke - 1)), ke === 0 && (document.body.style.overflow = ""));
};
var so = ({ url: e2, isOpen: t2, onClose: o2, onConfirm: n2 }) => {
  let { CheckIcon: r2, CopyIcon: s2, ExternalLinkIcon: a2, XIcon: l2 } = L(),
    i2 = y3(),
    [d2, c3] = reactExports.useState(false),
    p3 = D3(),
    m3 = reactExports.useCallback(async () => {
      try {
        (await navigator.clipboard.writeText(e2), c3(true), setTimeout(() => c3(false), 2e3));
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
            <div className={i2("flex items-center gap-2 font-semibold text-lg")}>
              {jsxRuntimeExports.jsx(a2, {
                size: 20,
              })}
              <span>{p3.openExternalLink}</span>
            </div>
            <p className={i2("text-muted-foreground text-sm")}>{p3.externalLinkWarning}</p>
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
var ao = (e2) => {
  var o2;
  let t2 = ct2();
  return t2 != null &&
    t2.renderers &&
    e2 &&
    (o2 = t2.renderers.find((n2) =>
      Array.isArray(n2.language) ? n2.language.includes(e2) : n2.language === e2,
    )) != null
    ? o2
    : null;
};
var io = (e2, t2) => {
  var n2;
  let o2 = (n2 = void 0) != null ? n2 : 5;
  return new Promise((r2, s2) => {
    let a2 = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(e2))),
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
var co = ({ chart: e2, children: t2, className: o2, onDownload: n2, config: r2, onError: s2 }) => {
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
          (W2("diagram.mmd", e2, "text/plain"), i2(false), n2 == null || n2(h2));
          return;
        }
        if (!m3) {
          s2 == null || s2(new Error("Mermaid plugin not available"));
          return;
        }
        let b3 = m3.getMermaid(r2),
          g2 = e2.split("").reduce((w3, P3) => ((w3 << 5) - w3 + P3.charCodeAt(0)) | 0, 0),
          T2 = `mermaid-${Math.abs(g2)}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          { svg: v2 } = await b3.render(T2, e2);
        if (!v2) {
          s2 == null || s2(new Error("SVG not found. Please wait for the diagram to render."));
          return;
        }
        if (h2 === "svg") {
          (W2("diagram.svg", v2, "image/svg+xml"), i2(false), n2 == null || n2(h2));
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
var fo = ({ chart: e2, config: t2, onFullscreen: o2, onExit: n2, className: r2, ...s2 }) => {
  let { Maximize2Icon: a2, XIcon: l2 } = L(),
    i2 = y3(),
    [d2, c3] = reactExports.useState(false),
    { isAnimating: p3, controls: m3 } = reactExports.useContext(R),
    u4 = D3(),
    f2 = (() => {
      if (typeof m3 == "boolean") return m3;
      let b3 = m3.mermaid;
      return b3 === false ? false : b3 === true || b3 === void 0 ? true : b3.panZoom !== false;
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
                  className={i2("flex size-full items-center justify-center p-4")}
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
var Te = ({ children: e2, className: t2, onCopy: o2, onError: n2, timeout: r2 = 2e3 }) => {
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
        !((T2 = navigator == null ? void 0 : navigator.clipboard) != null && T2.write)
      ) {
        n2 == null || n2(new Error("Clipboard API not available"));
        return;
      }
      try {
        let w3 =
            (v2 = c3.current) == null ? void 0 : v2.closest('[data-streamdown="table-wrapper"]'),
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
        (document.removeEventListener("mousedown", g2), window.clearTimeout(p3.current));
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
            className={s2("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40")}
            onClick={() => f2("md")}
            title={u4.copyTableAsMarkdown}
            type="button"
          >
            {u4.tableFormatMarkdown}
          </button>
          <button
            className={s2("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40")}
            onClick={() => f2("csv")}
            title={u4.copyTableAsCsv}
            type="button"
          >
            {u4.tableFormatCsv}
          </button>
          <button
            className={s2("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40")}
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
var Pe = ({ children: e2, className: t2, onDownload: o2, onError: n2 }) => {
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
            (u4 = l2.current) == null ? void 0 : u4.closest('[data-streamdown="table-wrapper"]'),
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
var Co = ({ children: e2, className: t2, showCopy: o2 = true, showDownload: n2 = true }) => {
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
                  <div className={a2("flex items-center justify-end gap-1 p-4")}>
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
                      className={a2("w-full border-collapse border border-border")}
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
      className={l2("my-4 flex flex-col gap-2 rounded-lg border border-border bg-sidebar p-2")}
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
        <table className={l2("w-full divide-y divide-border", t2)} data-streamdown="table" {...a2}>
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
  return o2 === false ? false : o2 === true || o2 === void 0 ? true : o2[t2] !== false;
};
var To = (e2, t2) => {
  if (typeof e2 == "boolean") return e2;
  let o2 = e2.code;
  return o2 === false ? false : o2 === true || o2 === void 0 ? true : o2[t2] !== false;
};
var Fe = (e2, t2) => {
  if (typeof e2 == "boolean") return e2;
  let o2 = e2.mermaid;
  return o2 === false ? false : o2 === true || o2 === void 0 ? true : o2[t2] !== false;
};
var bt = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    let r2 = y3();
    return (
      <ol
        className={r2("list-inside list-decimal whitespace-normal [li_&]:pl-6", t2)}
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
      <li className={r2("py-1 [&>p]:inline", t2)} data-streamdown="list-item" {...n2}>
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
        className={r2("list-inside list-disc whitespace-normal [li_&]:pl-6", t2)}
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
      <hr className={n2("my-6 border-border", e2)} data-streamdown="horizontal-rule" {...o2} />
    );
  },
  (e2, t2) => E2(e2, t2),
);
Io.displayName = "MarkdownHr";
var No = reactExports.memo(
  ({ children: e2, className: t2, node: o2, ...n2 }) => {
    let r2 = y3();
    return (
      <span className={r2("font-semibold", t2)} data-streamdown="strong" {...n2}>
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
          if ((f2.preventDefault(), a2.onLinkCheck && (await a2.onLinkCheck(o2)))) {
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
      <h3 className={r2("mt-6 mb-2 font-semibold text-xl", t2)} data-streamdown="heading-3" {...n2}>
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
      <h4 className={r2("mt-6 mb-2 font-semibold text-lg", t2)} data-streamdown="heading-4" {...n2}>
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
      <h6 className={r2("mt-6 mb-2 font-semibold text-sm", t2)} data-streamdown="heading-6" {...n2}>
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
      <thead className={r2("bg-muted/80", t2)} data-streamdown="table-header" {...n2}>
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
      <tbody className={r2("divide-y divide-border", t2)} data-streamdown="table-body" {...n2}>
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
      <tr className={r2("border-border", t2)} data-streamdown="table-row" {...n2}>
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
        className={r2("whitespace-nowrap px-4 py-2 text-left font-semibold text-sm", t2)}
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
      <td className={r2("px-4 py-2 text-sm", t2)} data-streamdown="table-cell" {...n2}>
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
          let d2 = Array.isArray(i2.props.children) ? i2.props.children : [i2.props.children],
            c3 = false,
            p3 = false;
          for (let f2 of d2)
            if (f2) {
              if (typeof f2 == "string") f2.trim() !== "" && (c3 = true);
              else if (reactExports.isValidElement(f2))
                if (((m3 = f2.props) == null ? void 0 : m3["data-footnote-backref"]) !== void 0)
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
                      ((u4 = b3.props) == null ? void 0 : u4["data-footnote-backref"]) === void 0
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
                  Array.isArray(i2.props.children) ? i2.props.children : [i2.props.children]
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
      return (Array.isArray(a2) ? a2.some((i2) => i2 !== null) : a2 !== null) ? (
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
  let f2 = (F2 = e2 == null ? void 0 : e2.properties) == null ? void 0 : F2.metastring,
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
          <div className={r2("flex h-8 items-center text-muted-foreground text-xs")}>
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
var Zo = reactExports.memo(ss, (e2, t2) => e2.className === t2.className && qe(e2.node, t2.node));
Zo.displayName = "MarkdownCode";
var Xo = reactExports.memo(oo, (e2, t2) => e2.className === t2.className && qe(e2.node, t2.node));
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
  typeof e2 != "string" || e2.length === 0 || !Zs.test(e2) ? e2 : e2.replace(Xs, "$1");
var bn;
var hn;
var yn;
var wn;
var Ze = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    href: [
      ...((hn = (bn = defaultSchema.protocols) == null ? void 0 : bn.href) != null ? hn : []),
      "tel",
    ],
  },
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...((wn = (yn = defaultSchema.attributes) == null ? void 0 : yn.code) != null ? wn : []),
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
var vn = ["github-light", "github-dark"];
var xn = {
  enabled: true,
};
var Ys = {
  shikiTheme: vn,
  controls: true,
  isAnimating: false,
  lineNumbers: true,
  mode: "streaming",
  mermaid: void 0,
  linkSafety: xn,
};
export var R = reactExports.createContext(Ys);
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
    return !(e2.rehypePlugins !== t2.rehypePlugins || e2.remarkPlugins !== t2.remarkPlugins);
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
        return (M2 && M2.length > 0 && (k2 = cn(k2, M2)), Je2.length > 0 && (k2 = ln(k2, Je2)), k2);
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
      Ke2 = reactExports.useMemo(() => (o2 === "auto" ? J3.map($e) : void 0), [J3, o2]),
      Rn2 = reactExports.useMemo(() => J3.map((k2, A2) => `${_2}-${A2}`), [J3.length, _2]),
      Ue2 = reactExports.useMemo(() => (u4 === true ? "true" : u4 ? JSON.stringify(u4) : ""), [u4]),
      ge2 = reactExports.useMemo(() => (Ue2 ? (Ue2 === "true" ? be() : be(u4)) : null), [Ue2]),
      Pt2 = reactExports.useMemo(() => {
        var k2, A2;
        return {
          shikiTheme:
            (A2 = (k2 = g2 == null ? void 0 : g2.code) == null ? void 0 : k2.getThemes()) != null
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
            tagNames: [...((A2 = Ze.tagNames) != null ? A2 : []), ...Object.keys(P3)],
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
                    <Ct2 components={It2} rehypePlugins={Lt2} remarkPlugins={Nt2} {...B2}>
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
        className={p3("relative flex flex-col", l2 ? "h-full w-full" : "min-h-28 w-full", t2)}
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
var po = ({
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
            S3 = e2.split("").reduce((z3, B2) => ((z3 << 5) - z3 + B2.charCodeAt(0)) | 0, 0),
            F2 = `mermaid-${Math.abs(S3)}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            { svg: j2 } = await H2.render(F2, e2);
          (p3(j2), u4(j2));
        } catch (H2) {
          if (!(m3 || c3)) {
            let S3 = H2 instanceof Error ? H2.message : "Failed to render Mermaid chart";
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
        <div className={s2("flex items-center space-x-2 text-muted-foreground")}>
          <div className={s2("h-4 w-4 animate-spin rounded-full border-current border-b-2")} />
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
          <summary className={s2("cursor-pointer text-red-600 text-xs")}>Show Code</summary>
          <pre className={s2("mt-2 overflow-x-auto rounded bg-red-100 p-2 text-red-800 text-xs")}>
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
          className={s2("flex justify-center", n2 ? "size-full items-center" : null)}
          dangerouslySetInnerHTML={{
            __html: P3,
          }}
          role="img"
        />
      </Nn>
    </div>
  );
};
const mermaidGHXKKRXX = Object.freeze(
  Object.defineProperty(
    {
      __proto__: null,
      Mermaid: po,
    },
    Symbol.toStringTag,
    {
      value: "Module",
    },
  ),
);
